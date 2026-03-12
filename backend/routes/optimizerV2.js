/**
 * Optimizer V2 Routes
 *
 * POST   /analyze          - Start analysis (SSE streaming)
 * GET    /results/:id      - Get full analysis result
 * PATCH  /results/:id/mode - Switch optimization mode
 * PATCH  /results/:id/selections - Save user selections
 * POST   /results/:id/clause-chat - Iterative clause chat
 * GET    /results/:id/redline - Get redline data for a mode
 * POST   /results/:id/resume - Resume failed analysis
 * GET    /history          - User's analysis history
 * DELETE /results/:id      - Delete analysis
 */
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
const pdfParse = require('pdf-parse');
const { OpenAI } = require('openai');
const { ObjectId } = require('mongodb');

const { runPipeline, resumePipeline } = require('../services/optimizerV2/index');
const OptimizerV2Result = require('../models/OptimizerV2Result');
const { CLAUSE_CHAT_PROMPT } = require('../services/optimizerV2/prompts/systemPrompts');
const { generateWordDiff } = require('../services/optimizerV2/utils/diffGenerator');
const { getFeatureLimit } = require('../constants/subscriptionPlans');

// File upload config
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fsSync.existsSync(uploadsDir)) fsSync.mkdirSync(uploadsDir, { recursive: true });

const upload = multer({
  dest: uploadsDir,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_MIMES = [
  'application/pdf',
  'application/x-pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];

// OpenAI singleton for clause chat
let openaiInstance = null;
function getOpenAI() {
  if (!openaiInstance) {
    openaiInstance = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 120000 });
  }
  return openaiInstance;
}

// ════════════════════════════════════════════════════════
// POST /analyze - Start analysis with SSE streaming
// ════════════════════════════════════════════════════════
router.post('/analyze', upload.single('file'), async (req, res) => {
  const userId = req.user?.userId;
  const plan = req.user?.plan || 'free';

  // Check subscription limits
  const limit = getFeatureLimit(plan, 'optimize');
  if (limit === 0) {
    return res.status(403).json({
      success: false,
      error: 'PLAN_LIMIT',
      message: 'Der Optimizer V2 ist nicht in deinem aktuellen Plan verfügbar.'
    });
  }

  // Check usage count
  const currentMonth = new Date();
  currentMonth.setDate(1);
  currentMonth.setHours(0, 0, 0, 0);
  const usageCount = await OptimizerV2Result.countDocuments({
    userId,
    status: 'completed',
    createdAt: { $gte: currentMonth }
  });

  if (limit !== Infinity && usageCount >= limit) {
    return res.status(429).json({
      success: false,
      error: 'USAGE_LIMIT',
      message: `Du hast dein monatliches Limit von ${limit} Optimierungen erreicht.`,
      usage: { count: usageCount, limit }
    });
  }

  if (!req.file) {
    return res.status(400).json({ success: false, error: 'NO_FILE', message: 'Keine Datei hochgeladen.' });
  }

  // Validate file
  if (req.file.size > MAX_FILE_SIZE) {
    await cleanupFile(req.file.path);
    return res.status(413).json({ success: false, error: 'FILE_TOO_LARGE', message: 'Datei ist zu groß (max. 10MB).' });
  }

  if (!ALLOWED_MIMES.includes(req.file.mimetype)) {
    await cleanupFile(req.file.path);
    return res.status(415).json({ success: false, error: 'INVALID_TYPE', message: 'Nur PDF und DOCX Dateien werden unterstützt.' });
  }

  // Extract text
  let contractText;
  try {
    const buffer = await fs.readFile(req.file.path);
    if (req.file.mimetype.includes('pdf')) {
      const parsed = await pdfParse(buffer, { max: 0, version: 'v2.0.550' });
      contractText = parsed.text;
    } else {
      const { extractTextFromBuffer } = require('../services/textExtractor');
      const result = await extractTextFromBuffer(buffer, req.file.mimetype);
      contractText = result.text;
    }
  } catch (err) {
    await cleanupFile(req.file.path);
    return res.status(422).json({
      success: false,
      error: 'EXTRACTION_FAILED',
      message: 'Text konnte nicht aus der Datei extrahiert werden.'
    });
  }

  if (!contractText || contractText.trim().length < 100) {
    await cleanupFile(req.file.path);
    return res.status(422).json({
      success: false,
      error: 'INSUFFICIENT_TEXT',
      message: 'Der Vertrag enthält zu wenig Text für eine Analyse.'
    });
  }

  // Setup SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const requestId = `optv2_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const perspective = req.body?.perspective || 'neutral';

  const sendSSE = (data) => {
    try {
      res.write(`data: ${JSON.stringify({ ...data, requestId, timestamp: new Date().toISOString() })}\n\n`);
    } catch (e) {
      // Client disconnected
    }
  };

  let clientDisconnected = false;
  req.on('close', () => { clientDisconnected = true; });

  try {
    const result = await runPipeline(
      {
        contractText,
        fileName: req.file.originalname,
        userId,
        requestId,
        perspective,
        fileSize: req.file.size
      },
      (progress, message, stageData) => {
        if (clientDisconnected) return;
        sendSSE({ progress, message, ...stageData });
      }
    );

    if (!clientDisconnected) {
      sendSSE({
        progress: 100,
        message: 'Analyse abgeschlossen!',
        complete: true,
        resultId: result.resultId,
        usage: { count: usageCount + 1, limit: limit === Infinity ? 'unlimited' : limit }
      });
    }
  } catch (err) {
    console.error('[OptimizerV2] Pipeline error:', err);
    if (!clientDisconnected) {
      sendSSE({ error: true, message: err.message || 'Analyse fehlgeschlagen.' });
    }
  } finally {
    await cleanupFile(req.file.path);
    if (!clientDisconnected) res.end();
  }
});

// ════════════════════════════════════════════════════════
// GET /results/:id - Get full analysis result
// ════════════════════════════════════════════════════════
router.get('/results/:id', async (req, res) => {
  try {
    const result = await OptimizerV2Result.findOne({
      _id: req.params.id,
      userId: req.user.userId
    }).select('-originalText'); // Exclude large text field from regular reads

    if (!result) {
      return res.status(404).json({ success: false, message: 'Analyse nicht gefunden.' });
    }

    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Fehler beim Laden der Analyse.' });
  }
});

// ════════════════════════════════════════════════════════
// PATCH /results/:id/mode - Switch optimization mode
// ════════════════════════════════════════════════════════
router.patch('/results/:id/mode', async (req, res) => {
  const { mode } = req.body;
  if (!['neutral', 'proCreator', 'proRecipient'].includes(mode)) {
    return res.status(400).json({ success: false, message: 'Ungültiger Modus.' });
  }

  try {
    const result = await OptimizerV2Result.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.userId },
      { $set: { activeMode: mode } },
      { new: true, select: 'activeMode optimizations' }
    );

    if (!result) {
      return res.status(404).json({ success: false, message: 'Analyse nicht gefunden.' });
    }

    res.json({ success: true, mode: result.activeMode, optimizations: result.optimizations });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Fehler beim Wechseln des Modus.' });
  }
});

// ════════════════════════════════════════════════════════
// PATCH /results/:id/selections - Save user selections
// ════════════════════════════════════════════════════════
router.patch('/results/:id/selections', async (req, res) => {
  const { selections } = req.body;
  if (!Array.isArray(selections)) {
    return res.status(400).json({ success: false, message: 'Auswahl muss ein Array sein.' });
  }

  try {
    const result = await OptimizerV2Result.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.userId },
      { $set: { userSelections: selections.map(s => ({ ...s, selectedAt: new Date() })) } },
      { new: true, select: 'userSelections' }
    );

    if (!result) {
      return res.status(404).json({ success: false, message: 'Analyse nicht gefunden.' });
    }

    res.json({ success: true, selections: result.userSelections });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Fehler beim Speichern der Auswahl.' });
  }
});

// ════════════════════════════════════════════════════════
// POST /results/:id/clause-chat - Iterative clause chat
// ════════════════════════════════════════════════════════
router.post('/results/:id/clause-chat', async (req, res) => {
  const { clauseId, message } = req.body;
  if (!clauseId || !message) {
    return res.status(400).json({ success: false, message: 'clauseId und message sind erforderlich.' });
  }

  try {
    const result = await OptimizerV2Result.findOne({
      _id: req.params.id,
      userId: req.user.userId
    });

    if (!result) {
      return res.status(404).json({ success: false, message: 'Analyse nicht gefunden.' });
    }

    // Find the clause
    const clause = result.clauses?.find(c => c.id === clauseId);
    if (!clause) {
      return res.status(404).json({ success: false, message: 'Klausel nicht gefunden.' });
    }

    // Find existing analysis
    const analysis = result.clauseAnalyses?.find(a => a.clauseId === clauseId);
    const analysisText = analysis
      ? `Stärke: ${analysis.strength}, Risiko: ${analysis.riskLevel}/10, Bedenken: ${analysis.concerns?.join('; ') || 'keine'}`
      : 'Keine Analyse verfügbar';

    // Build chat history
    let existingChat = result.clauseChats?.find(c => c.clauseId === clauseId);
    const chatHistory = existingChat?.messages?.map(m => `${m.role}: ${m.content}`).join('\n') || '';

    // Build prompt (lean context - only clause + analysis + history, not full contract)
    const systemPrompt = CLAUSE_CHAT_PROMPT(
      result.structure?.contractTypeLabel || result.structure?.contractType || 'Vertrag',
      result.structure?.jurisdiction,
      clause.originalText,
      analysisText,
      chatHistory
    );

    const openai = getOpenAI();
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0.3,
      max_tokens: 2000,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ]
    });

    const assistantMessage = response.choices[0].message.content;

    // Extract new version if present
    let generatedVersion = null;
    const versionMatch = assistantMessage.match(/\[NEUE_VERSION\]([\s\S]*?)(?:\[\/NEUE_VERSION\]|$)/);
    if (versionMatch) {
      generatedVersion = versionMatch[1].trim();
    }

    // Save to DB
    const newMessage = [
      { role: 'user', content: message, timestamp: new Date() },
      { role: 'assistant', content: assistantMessage, timestamp: new Date(), generatedVersion }
    ];

    if (existingChat) {
      await OptimizerV2Result.updateOne(
        { _id: result._id, 'clauseChats.clauseId': clauseId },
        { $push: { 'clauseChats.$.messages': { $each: newMessage } } }
      );
    } else {
      await OptimizerV2Result.updateOne(
        { _id: result._id },
        { $push: { clauseChats: { clauseId, messages: newMessage } } }
      );
    }

    // Generate diff if new version was created
    let diffs = null;
    if (generatedVersion) {
      diffs = generateWordDiff(clause.originalText, generatedVersion);
    }

    res.json({
      success: true,
      response: assistantMessage,
      generatedVersion,
      diffs,
      usage: {
        inputTokens: response.usage?.prompt_tokens || 0,
        outputTokens: response.usage?.completion_tokens || 0
      }
    });

  } catch (err) {
    console.error('[OptimizerV2] Clause chat error:', err);
    res.status(500).json({ success: false, message: 'Fehler beim Klausel-Chat.' });
  }
});

// ════════════════════════════════════════════════════════
// GET /results/:id/redline - Get redline data
// ════════════════════════════════════════════════════════
router.get('/results/:id/redline', async (req, res) => {
  const mode = req.query.mode || 'neutral';
  if (!['neutral', 'proCreator', 'proRecipient'].includes(mode)) {
    return res.status(400).json({ success: false, message: 'Ungültiger Modus.' });
  }

  try {
    const result = await OptimizerV2Result.findOne({
      _id: req.params.id,
      userId: req.user.userId
    }).select('clauses optimizations');

    if (!result) {
      return res.status(404).json({ success: false, message: 'Analyse nicht gefunden.' });
    }

    const redlineData = result.clauses.map(clause => {
      const opt = result.optimizations?.find(o => o.clauseId === clause.id);
      const version = opt?.versions?.[mode];

      return {
        clauseId: clause.id,
        sectionNumber: clause.sectionNumber,
        title: clause.title,
        category: clause.category,
        original: clause.originalText,
        optimized: version?.text || clause.originalText,
        diffs: version?.diffs || [{ type: 'equal', text: clause.originalText }],
        needsOptimization: opt?.needsOptimization || false,
        reasoning: version?.reasoning || ''
      };
    });

    res.json({ success: true, mode, clauses: redlineData });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Fehler beim Laden der Redline-Daten.' });
  }
});

// ════════════════════════════════════════════════════════
// POST /results/:id/resume - Resume failed analysis
// ════════════════════════════════════════════════════════
router.post('/results/:id/resume', async (req, res) => {
  // Setup SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  let clientDisconnected = false;
  req.on('close', () => { clientDisconnected = true; });

  const sendSSE = (data) => {
    if (clientDisconnected) return;
    try {
      res.write(`data: ${JSON.stringify({ ...data, timestamp: new Date().toISOString() })}\n\n`);
    } catch (e) {}
  };

  try {
    const result = await resumePipeline(req.params.id, (progress, message, stageData) => {
      sendSSE({ progress, message, ...stageData });
    });

    sendSSE({ progress: 100, complete: true, resultId: result.resultId });
  } catch (err) {
    sendSSE({ error: true, message: err.message });
  } finally {
    if (!clientDisconnected) res.end();
  }
});

// ════════════════════════════════════════════════════════
// GET /history - User's analysis history
// ════════════════════════════════════════════════════════
router.get('/history', async (req, res) => {
  try {
    const results = await OptimizerV2Result.find({ userId: req.user.userId })
      .select('requestId fileName status scores.overall structure.contractType structure.contractTypeLabel createdAt completedAt')
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({ success: true, results });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Fehler beim Laden der Historie.' });
  }
});

// ════════════════════════════════════════════════════════
// DELETE /results/:id - Delete analysis
// ════════════════════════════════════════════════════════
router.delete('/results/:id', async (req, res) => {
  try {
    const result = await OptimizerV2Result.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.userId
    });

    if (!result) {
      return res.status(404).json({ success: false, message: 'Analyse nicht gefunden.' });
    }

    res.json({ success: true, message: 'Analyse gelöscht.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Fehler beim Löschen.' });
  }
});

// Cleanup helper
async function cleanupFile(filePath) {
  if (filePath) {
    try { await fs.unlink(filePath); } catch (e) {}
  }
}

module.exports = router;
