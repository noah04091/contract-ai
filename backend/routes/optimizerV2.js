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
 * POST   /results/:id/generate-clause - Generate a missing clause
 * GET    /history          - User's analysis history
 * GET    /results/:id/pdf  - Export analysis as PDF report
 * POST   /results/:id/docx - Export optimized contract as DOCX
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

  // Keepalive: send SSE comment every 15s to prevent proxy/Render idle timeout
  const keepalive = setInterval(() => {
    if (clientDisconnected) return;
    try {
      res.write(': keepalive\n\n');
    } catch (e) {
      clientDisconnected = true;
    }
  }, 15000);

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
    clearInterval(keepalive);
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

    // Map MongoDB document to expected frontend shape
    const resultObj = result.toObject ? result.toObject() : result;
    resultObj.resultId = result._id.toString();
    // Compute performance if not stored
    if (!resultObj.performance && resultObj.clauses) {
      resultObj.performance = {
        totalDurationMs: resultObj.completedAt && resultObj.startedAt
          ? new Date(resultObj.completedAt) - new Date(resultObj.startedAt)
          : 0,
        clauseCount: resultObj.clauses?.length || 0,
        optimizedCount: resultObj.optimizations?.filter(o => o.needsOptimization)?.length || 0,
        textLength: resultObj.textLength || 0
      };
    }

    res.json({ success: true, result: resultObj });
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
      .select('requestId fileName status scores.overall structure.contractType structure.contractTypeLabel structure.recognizedAs structure.industry performance.clauseCount performance.optimizedCount createdAt completedAt')
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

// ════════════════════════════════════════════════════════
// GET /results/:id/pdf - Export analysis as PDF report
// ════════════════════════════════════════════════════════
router.get('/results/:id/pdf', async (req, res) => {
  try {
    const result = await OptimizerV2Result.findOne({
      _id: req.params.id,
      userId: req.user.userId,
      status: 'completed'
    });

    if (!result) {
      return res.status(404).json({ success: false, message: 'Analyse nicht gefunden.' });
    }

    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 50, bottom: 50, left: 50, right: 50 },
      info: {
        Title: `Vertragsanalyse - ${result.fileName || 'Vertrag'}`,
        Author: 'Contract AI - Smart Optimizer',
        Creator: 'Contract AI'
      }
    });

    const fileName = (result.fileName || 'Analyse').replace(/\.[^/.]+$/, '');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}_Analyse.pdf"`);
    doc.pipe(res);

    // ── Design tokens ──
    const C = {
      primary: '#007AFF', primaryDark: '#0056CC', accent: '#5856D6',
      green: '#34C759', greenBg: '#F0FDF4', greenBorder: '#BBF7D0',
      red: '#FF3B30', redBg: '#FEF2F2', redBorder: '#FECACA',
      orange: '#FF9500', orangeBg: '#FFFBEB', orangeBorder: '#FDE68A',
      purple: '#AF52DE',
      dark: '#111827', text: '#374151', muted: '#6B7280', light: '#9CA3AF',
      bg: '#F8FAFC', cardBg: '#FFFFFF', border: '#E5E7EB', borderLight: '#F3F4F6'
    };
    const L = 50, R = 545, W = R - L; // left, right, content width
    const STRENGTH_LABELS = { strong: 'Stark', adequate: 'Ausreichend', weak: 'Schwach', critical: 'Kritisch' };
    const IMPORTANCE_LABELS = { critical: 'Kritisch', high: 'Wichtig', medium: 'Standard', low: 'Formal' };
    const INDUSTRY_LABELS = {
      technology: 'Technologie', saas: 'SaaS / Software', consulting: 'Beratung',
      finance: 'Finanzen', healthcare: 'Gesundheitswesen', real_estate: 'Immobilien',
      construction: 'Bauwesen', manufacturing: 'Fertigung', ecommerce: 'E-Commerce',
      marketing: 'Marketing', media: 'Medien', education: 'Bildung', legal: 'Recht',
      logistics: 'Logistik', energy: 'Energie', insurance: 'Versicherung',
      hr_staffing: 'Personal / HR', food_hospitality: 'Gastronomie',
      public_sector: 'Öffentlicher Sektor', other: 'Sonstige'
    };

    function getScoreColor(s) { return s >= 80 ? C.green : s >= 60 ? C.orange : s >= 40 ? C.red : C.purple; }
    function getScoreBg(s) { return s >= 80 ? C.greenBg : s >= 60 ? C.orangeBg : s >= 40 ? C.redBg : '#F5F3FF'; }
    function checkPage(needed = 80) { if (doc.y + needed > doc.page.height - 60) doc.addPage(); }
    function roundedRect(x, y, w, h, r, fill, stroke) {
      doc.save();
      if (fill) doc.fillColor(fill);
      if (stroke) doc.strokeColor(stroke).lineWidth(1);
      doc.roundedRect(x, y, w, h, r);
      if (fill && stroke) doc.fillAndStroke();
      else if (fill) doc.fill();
      else if (stroke) doc.stroke();
      doc.restore();
    }
    function drawScoreBar(x, y, w, h, value, color) {
      roundedRect(x, y, w, h, h / 2, '#E5E7EB', null);
      if (value > 0) roundedRect(x, y, w * (value / 100), h, h / 2, color, null);
    }

    // ════════════════════════════════════════════
    // PAGE 1: COVER — Header band + Score + Info
    // ════════════════════════════════════════════

    const structure = result.structure || {};
    const scores = result.scores || {};
    const clauses = result.clauses || [];
    const analyses = result.clauseAnalyses || [];
    const optimizations = result.optimizations || [];
    const overallScore = scores.overall || 0;
    const optimizedCount = optimizations.filter(o => o.needsOptimization).length;
    const criticalCount = analyses.filter(a => a.importanceLevel === 'critical').length;
    const weakCount = analyses.filter(a => a.strength === 'weak').length;

    // ── Compact header band ──
    const bandH = 80;
    doc.save();
    doc.rect(0, 0, 595.28, bandH).fill(C.primary);
    doc.opacity(0.12).rect(0, 0, 595.28, bandH).fill(C.accent);
    doc.opacity(1).restore();

    doc.fontSize(20).fillColor('#FFFFFF').text('Vertragsanalyse', L, 20, { width: W });
    const contractLabel = structure.recognizedAs || structure.contractTypeLabel || result.fileName || 'Vertrag';
    doc.fontSize(9).fillColor('rgba(255,255,255,0.7)').text(`${contractLabel}  ·  Contract AI Smart Optimizer V2`, L, 46);
    const dateStr = new Date().toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' });
    doc.fontSize(8).fillColor('rgba(255,255,255,0.5)').text(dateStr, L, 62);

    doc.y = bandH + 16;

    // ── Score + Stats Row ──
    const cardY = doc.y;
    const cardH = 72;
    roundedRect(L, cardY, W, cardH, 8, C.cardBg, C.border);

    // Score circle (left)
    const circleX = L + 40, circleY = cardY + 36, circleR = 24;
    doc.save();
    doc.circle(circleX, circleY, circleR).lineWidth(3).strokeColor(getScoreColor(overallScore)).stroke();
    doc.circle(circleX, circleY, circleR - 2).fill(getScoreBg(overallScore));
    doc.restore();
    doc.fontSize(18).fillColor(getScoreColor(overallScore)).text(`${overallScore}`, circleX - 14, circleY - 10, { width: 28, align: 'center' });
    doc.fontSize(6).fillColor(C.muted).text('/100', circleX - 10, circleY + 10, { width: 20, align: 'center' });

    // Sub-score bars (center)
    const ssX = L + 85;
    const scoreItems = [
      ['Risiko', scores.risk || 0], ['Klarheit', scores.clarity || 0],
      ['Vollständigkeit', scores.completeness || 0], ['Marktstandard', scores.marketStandard || 0]
    ];
    scoreItems.forEach(([label, val], i) => {
      const sy = cardY + 10 + i * 15;
      doc.fontSize(7).fillColor(C.muted).text(label, ssX, sy, { width: 72 });
      drawScoreBar(ssX + 72, sy + 1, 100, 6, val, getScoreColor(val));
      doc.fontSize(7).fillColor(C.dark).text(`${val}`, ssX + 176, sy, { width: 20 });
    });

    // Stat numbers (right) — starts well after score bars end
    const stX = L + 310;
    const stats = [
      [clauses.length, 'Klauseln', C.dark], [optimizedCount, 'Optimierbar', C.primary],
      [criticalCount, 'Kritisch', criticalCount > 0 ? C.red : C.muted], [weakCount, 'Schwach', weakCount > 0 ? C.orange : C.muted]
    ];
    stats.forEach(([num, lbl, col], i) => {
      const sx = stX + i * 54;
      doc.fontSize(15).fillColor(col).text(`${num}`, sx, cardY + 18, { width: 48, align: 'center' });
      doc.fontSize(6.5).fillColor(C.muted).text(lbl, sx, cardY + 38, { width: 48, align: 'center' });
    });

    doc.y = cardY + cardH + 10;

    // ── Contract Details (compact inline) ──
    const infoParts = [];
    if (result.fileName) infoParts.push(`Datei: ${result.fileName}`);
    if (structure.jurisdiction) infoParts.push(`Recht: ${structure.jurisdiction}`);
    if (structure.industry && structure.industry !== 'other') infoParts.push(`Branche: ${INDUSTRY_LABELS[structure.industry] || structure.industry}`);
    if (structure.parties?.length > 0) infoParts.push(`Parteien: ${structure.parties.map(p => p.name || p.role).join(' / ')}`);
    if (structure.duration) infoParts.push(`Laufzeit: ${structure.duration}`);
    infoParts.push(`Qualität: ${structure.maturity === 'high' ? 'Professionell' : structure.maturity === 'medium' ? 'Solide' : 'Basis'}`);

    if (infoParts.length > 0) {
      const infoY = doc.y;
      const infoText = infoParts.join('  ·  ');
      const infoH = doc.fontSize(7.5).heightOfString(infoText, { width: W - 20 }) + 14;
      roundedRect(L, infoY, W, infoH, 6, '#F8FAFC', C.border);
      doc.fontSize(7.5).fillColor(C.text).text(infoText, L + 10, infoY + 7, { width: W - 20 });
      doc.y = infoY + infoH + 14;
    }

    // ════════════════════════════════════════════
    // CLAUSE ANALYSIS SECTION
    // ════════════════════════════════════════════

    doc.fontSize(12).fillColor(C.dark).text('Klausel-Analyse', L);
    doc.moveDown(0.15);
    doc.fontSize(7.5).fillColor(C.muted).text(`${clauses.length} Klauseln analysiert  ·  Sortiert nach Priorität`);
    doc.moveDown(0.5);

    const importanceOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    const analysisMap = new Map();
    for (const a of analyses) analysisMap.set(a.clauseId, a);
    const sortedClauses = [...clauses].sort((a, b) => {
      const impA = importanceOrder[analysisMap.get(a.id)?.importanceLevel] ?? 2;
      const impB = importanceOrder[analysisMap.get(b.id)?.importanceLevel] ?? 2;
      return impA - impB;
    });

    for (let ci = 0; ci < sortedClauses.length; ci++) {
      const clause = sortedClauses[ci];
      const analysis = analysisMap.get(clause.id);
      const optimization = optimizations.find(o => o.clauseId === clause.id);
      const riskLevel = analysis?.riskLevel || 0;
      const riskColor = riskLevel >= 7 ? C.red : riskLevel >= 4 ? C.orange : C.green;
      const impLevel = analysis?.importanceLevel || 'medium';
      const impColor = impLevel === 'critical' ? C.red : impLevel === 'high' ? C.orange : impLevel === 'medium' ? C.primary : C.light;
      const isHighPriority = impLevel === 'critical' || impLevel === 'high';
      const sectionLabel = clause.sectionNumber && clause.sectionNumber !== 'null' ? `${clause.sectionNumber}  ` : '';

      // ── Compact mode for standard/low priority clauses ──
      if (!isHighPriority && riskLevel < 5) {
        // One-liner: section + title | badges | risk | one-line summary
        let compactH = 28;
        if (analysis?.plainLanguage) compactH += 11;
        checkPage(compactH);

        const rowY = doc.y;

        // Left color accent bar
        doc.save();
        doc.rect(L, rowY, 3, compactH - 4).fill(riskColor + '60');
        doc.restore();

        // Title
        doc.fontSize(8.5).fillColor(C.dark).text(`${sectionLabel}${clause.title}`, L + 8, rowY + 2, { width: W - 120 });

        // Inline badges (right of title, same line)
        const badgeY = rowY + 2;
        let rbx = R - 90;
        const impLabel = IMPORTANCE_LABELS[impLevel] || impLevel;
        const impW = doc.fontSize(6).widthOfString(impLabel) + 8;
        roundedRect(rbx, badgeY, impW, 11, 2, impColor + '15', impColor + '40');
        doc.fontSize(6).fillColor(impColor).text(impLabel, rbx + 4, badgeY + 2.5, { lineBreak: false });
        rbx += impW + 3;

        if (analysis?.strength) {
          const strLabel = STRENGTH_LABELS[analysis.strength] || analysis.strength;
          const strColor = analysis.strength === 'weak' || analysis.strength === 'critical' ? C.red : analysis.strength === 'adequate' ? C.orange : C.green;
          const strW = doc.fontSize(6).widthOfString(strLabel) + 8;
          roundedRect(rbx, badgeY, strW, 11, 2, strColor + '15', strColor + '40');
          doc.fontSize(6).fillColor(strColor).text(strLabel, rbx + 4, badgeY + 2.5, { lineBreak: false });
        }

        // Risk score far right
        if (riskLevel > 0) {
          doc.fontSize(7).fillColor(riskColor).text(`${riskLevel}/10`, R - 28, rowY + 2, { width: 28, align: 'right' });
        }

        // One-line summary below title
        if (analysis?.plainLanguage) {
          const summary = analysis.plainLanguage.length > 130 ? analysis.plainLanguage.substring(0, 127) + '...' : analysis.plainLanguage;
          doc.fontSize(7).fillColor(C.muted).text(summary, L + 8, rowY + 15, { width: W - 16 });
        }

        doc.y = rowY + compactH;

        // Thin separator
        if (ci < sortedClauses.length - 1) {
          doc.strokeColor(C.borderLight).lineWidth(0.3).moveTo(L + 8, doc.y).lineTo(R, doc.y).stroke();
          doc.y += 3;
        }
        continue;
      }

      // ── Full detail mode for critical/high priority clauses ──
      let estH = 50;
      if (analysis?.plainLanguage) estH += Math.ceil(analysis.plainLanguage.length / 90) * 11 + 6;
      if (analysis?.legalAssessment) estH += Math.ceil(analysis.legalAssessment.length / 95) * 10 + 16;
      if (analysis?.concerns?.length) estH += analysis.concerns.length * 11 + 14;
      if (analysis?.legalReferences?.length) estH += 12;
      if (optimization?.needsOptimization) estH += optimization.negotiationAdvice ? 28 : 14;
      checkPage(Math.min(estH, 180));

      const cY = doc.y;

      // Left color accent bar (3px wide)
      doc.save();
      doc.rect(L, cY, 3, 14).fill(riskColor);
      doc.restore();

      // Clause title
      doc.fontSize(9.5).fillColor(C.dark).text(`${sectionLabel}${clause.title}`, L + 8, cY, { width: W - 80 });

      // Risk badge (top right)
      if (riskLevel > 0) {
        const badgeW = 38, badgeH = 14, badgeX = R - badgeW;
        roundedRect(badgeX, cY, badgeW, badgeH, 3, riskColor + '18', riskColor + '40');
        doc.fontSize(7).fillColor(riskColor).text(`${riskLevel}/10`, badgeX, cY + 3, { width: badgeW, align: 'center' });
      }

      // Badges row — explicit Y to prevent stacking
      const badgeRowY = cY + 16;
      const badges = [];
      if (impLevel) badges.push({ label: IMPORTANCE_LABELS[impLevel] || impLevel, color: impColor });
      if (analysis?.strength) badges.push({ label: STRENGTH_LABELS[analysis.strength] || analysis.strength, color: analysis.strength === 'weak' || analysis.strength === 'critical' ? C.red : analysis.strength === 'adequate' ? C.orange : C.green });
      let bx = L + 8;
      for (const badge of badges) {
        const bw = doc.fontSize(6.5).widthOfString(badge.label) + 10;
        roundedRect(bx, badgeRowY, bw, 12, 3, badge.color + '15', badge.color + '40');
        doc.fontSize(6.5).fillColor(badge.color).text(badge.label, bx + 5, badgeRowY + 2.5, { lineBreak: false });
        bx += bw + 4;
      }

      // Legal references inline with badges
      if (analysis?.legalReferences?.length > 0) {
        doc.fontSize(6.5).fillColor(C.purple).text(`${analysis.legalReferences.join(', ')}`, bx + 4, badgeRowY + 2.5, { lineBreak: false });
      }

      doc.y = badgeRowY + 16;

      // Plain language summary
      if (analysis?.plainLanguage) {
        doc.fontSize(8).fillColor(C.text).text(analysis.plainLanguage, L + 8, doc.y, { width: W - 16 });
        doc.moveDown(0.25);
      }

      // Legal assessment in gray box
      if (analysis?.legalAssessment) {
        checkPage(40);
        const laY = doc.y;
        const laH = doc.fontSize(7.5).heightOfString(analysis.legalAssessment, { width: W - 28 });
        roundedRect(L + 8, laY, W - 16, laH + 16, 4, '#F9FAFB', null);
        doc.fontSize(6.5).fillColor(C.muted).text('Juristische Bewertung', L + 14, laY + 4);
        doc.fontSize(7.5).fillColor(C.text).text(analysis.legalAssessment, L + 14, laY + 13, { width: W - 28 });
        doc.y = laY + laH + 20;
      }

      // Concerns
      if (analysis?.concerns?.length > 0) {
        checkPage(24);
        const conY = doc.y;
        const conText = analysis.concerns.map(c => `•  ${c}`).join('\n');
        const conTextH = doc.fontSize(7.5).heightOfString(conText, { width: W - 28 });
        const conH = conTextH + 16;
        roundedRect(L + 8, conY, W - 16, conH, 4, C.orangeBg, C.orangeBorder);
        doc.fontSize(6.5).fillColor(C.orange).text('Bedenken', L + 14, conY + 4);
        doc.fontSize(7.5).fillColor(C.text).text(conText, L + 14, conY + 13, { width: W - 28 });
        doc.y = conY + conH + 4;
      }

      // Optimization hint
      if (optimization?.needsOptimization) {
        checkPage(22);
        const optY = doc.y;
        const adviceText = optimization.negotiationAdvice || '';
        const adviceH = adviceText ? doc.fontSize(7).heightOfString(adviceText, { width: W - 28 }) : 0;
        const optH = adviceH + 14;
        roundedRect(L + 8, optY, W - 16, optH, 4, '#EFF6FF', '#BFDBFE');
        doc.fontSize(7).fillColor(C.primary).text('Optimierung verfügbar' + (adviceText ? `:  ${adviceText}` : ''), L + 14, optY + 4, { width: W - 28 });
        doc.y = optY + optH + 4;
      }

      doc.moveDown(0.3);

      // Separator
      if (ci < sortedClauses.length - 1) {
        doc.strokeColor(C.borderLight).lineWidth(0.4).moveTo(L, doc.y).lineTo(R, doc.y).stroke();
        doc.moveDown(0.4);
      }
    }

    // ════════════════════════════════════════════
    // FOOTER
    // ════════════════════════════════════════════
    checkPage(40);
    doc.moveDown(0.8);
    doc.strokeColor(C.border).lineWidth(0.5).moveTo(L, doc.y).lineTo(R, doc.y).stroke();
    doc.moveDown(0.4);
    doc.fontSize(7).fillColor(C.muted).text(
      `Contract AI  ·  Smart Optimizer V2  ·  ${new Date().toLocaleDateString('de-DE')}  ·  ID: ${result.requestId || result._id}`,
      { align: 'center' }
    );
    doc.moveDown(0.2);
    doc.fontSize(6.5).fillColor(C.light).text(
      'KI-gestützt erstellt — ersetzt keine rechtliche Beratung.',
      { align: 'center' }
    );

    doc.end();

  } catch (err) {
    console.error('[OptimizerV2] PDF export failed:', err);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: 'PDF-Export fehlgeschlagen.' });
    }
  }
});

// ════════════════════════════════════════════════════════
// POST /results/:id/docx - Export optimized contract as DOCX
// ════════════════════════════════════════════════════════
router.post('/results/:id/docx', async (req, res) => {
  try {
    const result = await OptimizerV2Result.findOne({
      _id: req.params.id,
      userId: req.user.userId,
      status: 'completed'
    });

    if (!result) {
      return res.status(404).json({ success: false, message: 'Analyse nicht gefunden.' });
    }

    const { selections, mode } = req.body;
    // selections: [{ clauseId, mode }] — which clauses to optimize and with which version
    // mode: fallback mode if not specified per-clause

    const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle, TableRow, TableCell, Table, WidthType, ShadingType } = require('docx');

    const structure = result.structure || {};
    const clauses = result.clauses || [];
    const optimizations = result.optimizations || [];
    const clauseAnalyses = result.clauseAnalyses || [];
    const scores = result.scores || {};
    const fallbackMode = mode || 'neutral';

    // Build a map of selected clause optimizations
    const selectionMap = new Map();
    if (Array.isArray(selections)) {
      for (const s of selections) {
        selectionMap.set(s.clauseId, s.mode || fallbackMode);
      }
    }

    // ── Build document sections ──
    const docChildren = [];

    // Title page header
    docChildren.push(
      new Paragraph({
        children: [new TextRun({ text: 'OPTIMIERTER VERTRAG', bold: true, size: 36, font: 'Arial', color: '1F2937' })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 }
      }),
      new Paragraph({
        children: [new TextRun({ text: structure.contractTypeLabel || structure.recognizedAs || 'Vertrag', size: 28, font: 'Arial', color: '6B7280' })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 }
      })
    );

    // Metadata line
    const metaParts = [];
    if (structure.jurisdiction) metaParts.push(`Jurisdiktion: ${structure.jurisdiction}`);
    if (structure.parties?.length) {
      const partyNames = structure.parties.filter(p => p.name).map(p => `${p.role}: ${p.name}`).join(' | ');
      if (partyNames) metaParts.push(partyNames);
    }
    if (scores.overall) metaParts.push(`Score: ${scores.overall}/100`);

    if (metaParts.length) {
      docChildren.push(
        new Paragraph({
          children: [new TextRun({ text: metaParts.join('  •  '), size: 18, font: 'Arial', color: '9CA3AF', italics: true })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 100 }
        })
      );
    }

    // Separator
    docChildren.push(
      new Paragraph({
        children: [new TextRun({ text: '─'.repeat(80), size: 16, color: 'D1D5DB' })],
        alignment: AlignmentType.CENTER,
        spacing: { before: 200, after: 200 }
      })
    );

    // Optimization summary
    const appliedCount = selectionMap.size;
    const totalOptimizable = optimizations.filter(o => o.needsOptimization).length;
    docChildren.push(
      new Paragraph({
        children: [new TextRun({ text: `${appliedCount} von ${totalOptimizable} Optimierungen übernommen`, size: 20, font: 'Arial', color: '007AFF', bold: true })],
        spacing: { after: 300 }
      })
    );

    // ── Clause by clause ──
    for (const clause of clauses) {
      const optimization = optimizations.find(o => o.clauseId === clause.id);
      const analysis = clauseAnalyses.find(a => a.clauseId === clause.id);
      const selectedMode = selectionMap.get(clause.id);
      const isOptimized = selectedMode && optimization?.needsOptimization;

      // Section heading
      const sectionPrefix = clause.sectionNumber && clause.sectionNumber !== 'null' ? `${clause.sectionNumber} ` : '';
      docChildren.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `${sectionPrefix}${clause.title}`,
              bold: true,
              size: 24,
              font: 'Arial',
              color: '1F2937'
            }),
            ...(isOptimized ? [new TextRun({ text: '  ✓ optimiert', size: 18, font: 'Arial', color: '34C759', italics: true })] : [])
          ],
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 300, after: 100 }
        })
      );

      // Clause text (optimized or original)
      let clauseText = clause.originalText;
      if (isOptimized && optimization.versions?.[selectedMode]?.text) {
        clauseText = optimization.versions[selectedMode].text;
      }

      // Split into paragraphs and add
      const textParagraphs = clauseText.split('\n').filter(line => line.trim());
      for (const line of textParagraphs) {
        docChildren.push(
          new Paragraph({
            children: [new TextRun({ text: line.trim(), size: 22, font: 'Arial', color: '374151' })],
            spacing: { after: 80 }
          })
        );
      }

      // If optimized, show reasoning as a note
      if (isOptimized && optimization.versions?.[selectedMode]?.reasoning) {
        docChildren.push(
          new Paragraph({
            children: [
              new TextRun({ text: 'Änderungsgrund: ', bold: true, size: 18, font: 'Arial', color: '6B7280', italics: true }),
              new TextRun({ text: optimization.versions[selectedMode].reasoning, size: 18, font: 'Arial', color: '6B7280', italics: true })
            ],
            spacing: { before: 80, after: 80 },
            indent: { left: 400 }
          })
        );
      }

      // Separator between clauses
      docChildren.push(
        new Paragraph({
          children: [new TextRun({ text: '', size: 10 })],
          spacing: { after: 100 }
        })
      );
    }

    // ── Footer ──
    docChildren.push(
      new Paragraph({
        children: [new TextRun({ text: '─'.repeat(80), size: 16, color: 'D1D5DB' })],
        alignment: AlignmentType.CENTER,
        spacing: { before: 400, after: 200 }
      }),
      new Paragraph({
        children: [new TextRun({ text: `Erstellt mit Contract AI — ${new Date().toLocaleDateString('de-DE')}`, size: 16, font: 'Arial', color: '9CA3AF', italics: true })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 50 }
      }),
      new Paragraph({
        children: [new TextRun({ text: 'Dieses Dokument wurde KI-gestützt optimiert. Eine juristische Prüfung wird empfohlen.', size: 16, font: 'Arial', color: '9CA3AF', italics: true })],
        alignment: AlignmentType.CENTER
      })
    );

    // Build document
    const doc = new Document({
      styles: {
        default: {
          document: {
            run: { font: 'Arial', size: 22 }
          }
        }
      },
      sections: [{
        properties: {
          page: {
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
          }
        },
        children: docChildren
      }]
    });

    const buffer = await Packer.toBuffer(doc);

    const fileName = `${(structure.contractTypeLabel || 'Vertrag').replace(/[^a-zA-Z0-9äöüÄÖÜß\-_ ]/g, '').replace(/\s+/g, '_')}_optimiert.docx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);

  } catch (err) {
    console.error('[OptimizerV2] DOCX export error:', err);
    res.status(500).json({ success: false, message: 'DOCX-Export fehlgeschlagen.' });
  }
});

// ════════════════════════════════════════════════════════
// POST /results/:id/generate-clause - Generate a missing clause
// ════════════════════════════════════════════════════════
router.post('/results/:id/generate-clause', async (req, res) => {
  const { category } = req.body;
  if (!category) {
    return res.status(400).json({ success: false, message: 'category ist erforderlich.' });
  }

  try {
    const result = await OptimizerV2Result.findOne({
      _id: req.params.id,
      userId: req.user.userId
    }).select('structure clauses clauseAnalyses perspective generatedClauses');

    if (!result) {
      return res.status(404).json({ success: false, message: 'Analyse nicht gefunden.' });
    }

    // ── Cache check: return cached clause if already generated ──
    const cached = (result.generatedClauses || []).find(gc => gc.category === category);
    if (cached) {
      return res.json({
        success: true,
        category,
        categoryLabel: cached.categoryLabel,
        generatedClause: cached.text,
        whyImportant: cached.whyImportant,
        cached: true
      });
    }

    const structure = result.structure || {};
    const perspective = result.perspective || 'neutral';

    const CATEGORY_LABELS = {
      termination: 'Kündigung / Vertragsbeendigung',
      liability: 'Haftung / Haftungsbeschränkung',
      payment: 'Vergütung / Zahlungsbedingungen',
      data_protection: 'Datenschutz / DSGVO',
      confidentiality: 'Vertraulichkeit / Geheimhaltung',
      warranty: 'Gewährleistung / Garantie',
      ip_rights: 'Geistiges Eigentum / Urheberrecht',
      non_compete: 'Wettbewerbsverbot',
      force_majeure: 'Höhere Gewalt / Force Majeure',
      dispute_resolution: 'Streitbeilegung / Gerichtsstand',
      sla: 'Service Level Agreement',
      deliverables: 'Leistungen / Lieferumfang',
      duration: 'Laufzeit / Vertragsdauer'
    };

    const categoryLabel = CATEGORY_LABELS[category] || category;
    const partiesText = (structure.parties || []).map(p => `${p.role}: ${p.name || 'unbekannt'}`).join(', ');
    const perspectiveHint = perspective === 'creator'
      ? 'Die Klausel soll den Ersteller/Anbieter schützen.'
      : perspective === 'recipient'
      ? 'Die Klausel soll den Empfänger/Kunden schützen.'
      : 'Die Klausel soll für beide Seiten fair und ausgewogen sein.';

    const systemPrompt = `Du bist ein erfahrener deutscher Vertragsanwalt.
Erstelle eine professionelle Vertragsklausel zum Thema "${categoryLabel}".

VERTRAGSKONTEXT:
- Vertragstyp: ${structure.contractTypeLabel || structure.contractType || 'Vertrag'}
- Jurisdiktion: ${structure.jurisdiction || 'Deutschland'}
- Branche: ${structure.industry || 'unbekannt'}
- Parteien: ${partiesText || 'nicht spezifiziert'}
- Perspektive: ${perspectiveHint}

ANFORDERUNGEN:
1. Die Klausel muss rechtlich korrekt nach deutschem Recht sein
2. Verwende professionelle juristische Sprache
3. Berücksichtige aktuelle Rechtsprechung und gesetzliche Anforderungen
4. Die Klausel soll direkt in den Vertrag einfügbar sein
5. Nummeriere Absätze mit (1), (2), (3) etc.
6. Verweise auf einschlägige Gesetze (BGB, DSGVO, HGB etc.) wo sinnvoll
7. Maximal 4 Absätze — klar, branchenüblich, keine Redundanzen
8. Keine übermäßig langen Formulierungen

AUSGABEFORMAT (strikt einhalten):
Zuerst die Klausel, beginnend mit "§ [Thema]" als Überschrift.
Dann eine Leerzeile, dann exakt:
[WARUM_WICHTIG]
2-3 Sätze, warum diese Klausel für diesen Vertragstyp wichtig ist und welche Risiken ohne sie bestehen.
[/WARUM_WICHTIG]`;

    const openai = getOpenAI();
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0.2,
      max_tokens: 1500,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Erstelle eine ${categoryLabel}-Klausel für diesen ${structure.contractTypeLabel || 'Vertrag'}.` }
      ]
    });

    const fullResponse = response.choices[0].message.content.trim();

    // Extract "warum wichtig" section
    let generatedText = fullResponse;
    let whyImportant = '';
    const whyMatch = fullResponse.match(/\[WARUM_WICHTIG\]([\s\S]*?)(?:\[\/WARUM_WICHTIG\]|$)/);
    if (whyMatch) {
      whyImportant = whyMatch[1].trim();
      generatedText = fullResponse.substring(0, whyMatch.index).trim();
    }

    // ── Cache: persist generated clause ──
    await OptimizerV2Result.updateOne(
      { _id: result._id, userId: req.user.userId },
      { $push: { generatedClauses: { category, categoryLabel, text: generatedText, whyImportant, createdAt: new Date() } } }
    );

    res.json({
      success: true,
      category,
      categoryLabel,
      generatedClause: generatedText,
      whyImportant,
      cached: false,
      usage: {
        inputTokens: response.usage?.prompt_tokens || 0,
        outputTokens: response.usage?.completion_tokens || 0
      }
    });

  } catch (err) {
    console.error('[OptimizerV2] Generate clause error:', err);
    res.status(500).json({ success: false, message: 'Fehler bei der Klausel-Generierung.' });
  }
});

// Cleanup helper
async function cleanupFile(filePath) {
  if (filePath) {
    try { await fs.unlink(filePath); } catch (e) {}
  }
}

module.exports = router;
