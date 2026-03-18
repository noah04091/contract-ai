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

    // Blue gradient header band
    const bandH = 120;
    doc.save();
    doc.rect(0, 0, 595.28, bandH).fill(C.primary);
    // Subtle accent overlay
    doc.opacity(0.15).rect(0, 0, 595.28, bandH).fill(C.accent);
    doc.opacity(1).restore();

    // Header text on band
    doc.fontSize(26).fillColor('#FFFFFF').text('Vertragsanalyse', L, 32, { width: W });
    doc.fontSize(11).fillColor('rgba(255,255,255,0.8)').text('Contract AI  —  Smart Optimizer V2', L, 66);
    const dateStr = new Date().toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' });
    doc.fontSize(10).fillColor('rgba(255,255,255,0.6)').text(dateStr, L, 86);

    doc.y = bandH + 24;

    // ── Overall Score Card ──
    const structure = result.structure || {};
    const scores = result.scores || {};
    const clauses = result.clauses || [];
    const analyses = result.clauseAnalyses || [];
    const optimizations = result.optimizations || [];
    const overallScore = scores.overall || 0;
    const optimizedCount = optimizations.filter(o => o.needsOptimization).length;
    const criticalCount = analyses.filter(a => a.importanceLevel === 'critical').length;
    const weakCount = analyses.filter(a => a.strength === 'weak').length;

    const cardY = doc.y;
    roundedRect(L, cardY, W, 90, 10, C.cardBg, C.border);

    // Score circle area
    const circleX = L + 50, circleY = cardY + 45, circleR = 30;
    doc.save();
    doc.circle(circleX, circleY, circleR).lineWidth(4).strokeColor(getScoreColor(overallScore)).stroke();
    doc.circle(circleX, circleY, circleR - 3).fill(getScoreBg(overallScore));
    doc.restore();
    doc.fontSize(22).fillColor(getScoreColor(overallScore)).text(`${overallScore}`, circleX - 18, circleY - 13, { width: 36, align: 'center' });

    // Sub-scores right of circle
    const ssX = L + 110;
    const scoreItems = [
      ['Risiko', scores.risk || 0], ['Klarheit', scores.clarity || 0],
      ['Vollständigkeit', scores.completeness || 0], ['Marktstandard', scores.marketStandard || 0]
    ];
    scoreItems.forEach(([label, val], i) => {
      const sy = cardY + 14 + i * 18;
      doc.fontSize(8).fillColor(C.muted).text(label, ssX, sy, { width: 85 });
      drawScoreBar(ssX + 88, sy + 2, 120, 7, val, getScoreColor(val));
      doc.fontSize(8).fillColor(C.dark).text(`${val}`, ssX + 215, sy, { width: 30 });
    });

    // Stats right side
    const stX = L + 310;
    const stats = [
      [clauses.length, 'Klauseln'], [optimizedCount, 'Optimierbar'],
      [criticalCount, 'Kritisch'], [weakCount, 'Schwach']
    ];
    stats.forEach(([num, lbl], i) => {
      const sx = stX + i * 55;
      doc.fontSize(16).fillColor(i === 2 && num > 0 ? C.red : i === 3 && num > 0 ? C.orange : C.dark)
        .text(`${num}`, sx, cardY + 22, { width: 50, align: 'center' });
      doc.fontSize(7).fillColor(C.muted).text(lbl, sx, cardY + 44, { width: 50, align: 'center' });
    });

    doc.y = cardY + 104;

    // ── Contract Details Card ──
    const infoY = doc.y;
    const infoRows = [];
    if (structure.recognizedAs || structure.contractTypeLabel) infoRows.push(['Vertragstyp', structure.recognizedAs || structure.contractTypeLabel]);
    if (result.fileName) infoRows.push(['Datei', result.fileName]);
    if (structure.jurisdiction) infoRows.push(['Jurisdiktion', structure.jurisdiction]);
    if (structure.industry && structure.industry !== 'other') infoRows.push(['Branche', INDUSTRY_LABELS[structure.industry] || structure.industry]);
    if (structure.parties?.length > 0) infoRows.push(['Parteien', structure.parties.map(p => `${p.role}: ${p.name || '-'}`).join(', ')]);
    if (structure.duration) infoRows.push(['Laufzeit', structure.duration]);
    infoRows.push(['Qualität', structure.maturity === 'high' ? 'Professionell' : structure.maturity === 'medium' ? 'Solide' : 'Basis']);

    const infoH = 20 + infoRows.length * 18;
    roundedRect(L, infoY, W, infoH, 8, '#F8FAFC', C.border);

    doc.fontSize(10).fillColor(C.dark).text('Vertragsdetails', L + 14, infoY + 8);
    infoRows.forEach(([label, value], i) => {
      const iy = infoY + 24 + i * 18;
      doc.fontSize(8.5).fillColor(C.muted).text(label, L + 14, iy, { width: 90 });
      doc.fontSize(8.5).fillColor(C.dark).text(value, L + 110, iy, { width: W - 124 });
    });

    doc.y = infoY + infoH + 20;

    // ════════════════════════════════════════════
    // CLAUSE ANALYSIS SECTION
    // ════════════════════════════════════════════

    doc.fontSize(14).fillColor(C.dark).text('Klausel-Analyse', L);
    doc.moveDown(0.3);
    doc.fontSize(8.5).fillColor(C.muted).text('Sortiert nach Priorität — kritische Klauseln zuerst');
    doc.moveDown(0.8);

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

      // Estimate card height
      let estH = 70;
      if (analysis?.plainLanguage) estH += Math.ceil(analysis.plainLanguage.length / 80) * 12 + 10;
      if (analysis?.legalAssessment) estH += Math.ceil(analysis.legalAssessment.length / 85) * 11 + 18;
      if (analysis?.concerns?.length) estH += analysis.concerns.length * 13 + 14;
      if (analysis?.legalReferences?.length) estH += 16;
      if (optimization?.needsOptimization) estH += optimization.negotiationAdvice ? 32 : 16;

      checkPage(Math.min(estH, 200));

      const cY = doc.y;

      // Risk color left border
      const riskLevel = analysis?.riskLevel || 0;
      const riskColor = riskLevel >= 7 ? C.red : riskLevel >= 4 ? C.orange : C.green;
      const impLevel = analysis?.importanceLevel || 'medium';
      const impColor = impLevel === 'critical' ? C.red : impLevel === 'high' ? C.orange : impLevel === 'medium' ? C.primary : C.light;

      // Clause number + title
      const sectionLabel = clause.sectionNumber && clause.sectionNumber !== 'null' ? `${clause.sectionNumber}  ` : '';
      doc.fontSize(11).fillColor(C.dark).text(`${sectionLabel}${clause.title}`, L, cY, { width: W - 60 });

      // Risk badge (top right)
      if (riskLevel > 0) {
        const badgeW = 44, badgeH = 16, badgeX = R - badgeW, badgeY = cY;
        roundedRect(badgeX, badgeY, badgeW, badgeH, 4, riskColor + '18', riskColor + '40');
        doc.fontSize(7.5).fillColor(riskColor).text(`${riskLevel}/10`, badgeX, badgeY + 3.5, { width: badgeW, align: 'center' });
      }

      doc.moveDown(0.15);

      // Badges row
      const badges = [];
      if (impLevel) badges.push({ label: IMPORTANCE_LABELS[impLevel] || impLevel, color: impColor });
      if (analysis?.strength) badges.push({ label: STRENGTH_LABELS[analysis.strength] || analysis.strength, color: analysis.strength === 'weak' || analysis.strength === 'critical' ? C.red : analysis.strength === 'adequate' ? C.orange : C.green });
      let bx = L;
      for (const badge of badges) {
        const bw = doc.fontSize(7).widthOfString(badge.label) + 12;
        roundedRect(bx, doc.y, bw, 14, 3, badge.color + '15', badge.color + '40');
        doc.fontSize(7).fillColor(badge.color).text(badge.label, bx + 6, doc.y + 3);
        bx += bw + 6;
      }
      doc.y += 20;

      // Plain language summary
      if (analysis?.plainLanguage) {
        doc.fontSize(9).fillColor(C.text).text(analysis.plainLanguage, L, doc.y, { width: W });
        doc.moveDown(0.4);
      }

      // Legal assessment in gray box
      if (analysis?.legalAssessment) {
        checkPage(50);
        const laY = doc.y;
        // Measure text height first
        const laH = doc.fontSize(8).heightOfString(analysis.legalAssessment, { width: W - 24 });
        roundedRect(L, laY, W, laH + 22, 5, '#F9FAFB', null);
        doc.fontSize(7.5).fillColor(C.muted).text('Juristische Bewertung', L + 10, laY + 6);
        doc.fontSize(8).fillColor(C.text).text(analysis.legalAssessment, L + 10, laY + 17, { width: W - 24 });
        doc.y = laY + laH + 28;
      }

      // Concerns
      if (analysis?.concerns?.length > 0) {
        checkPage(30);
        const conY = doc.y;
        const conH = 16 + analysis.concerns.length * 13;
        roundedRect(L, conY, W, conH, 5, C.orangeBg, C.orangeBorder);
        doc.fontSize(7.5).fillColor(C.orange).text('Bedenken', L + 10, conY + 5);
        analysis.concerns.forEach((concern, i) => {
          doc.fontSize(8).fillColor(C.text).text(`•  ${concern}`, L + 10, conY + 17 + i * 13, { width: W - 24 });
        });
        doc.y = conY + conH + 6;
      }

      // Legal references
      if (analysis?.legalReferences?.length > 0) {
        doc.fontSize(7.5).fillColor(C.purple).text(`Rechtsgrundlagen: ${analysis.legalReferences.join(', ')}`, L);
        doc.moveDown(0.2);
      }

      // Optimization available
      if (optimization?.needsOptimization) {
        checkPage(28);
        const optY = doc.y;
        const optH = optimization.negotiationAdvice ? 30 : 16;
        roundedRect(L, optY, W, optH, 5, '#EFF6FF', '#BFDBFE');
        doc.fontSize(8).fillColor(C.primary).text('Optimierung verfügbar', L + 10, optY + 4);
        if (optimization.negotiationAdvice) {
          doc.fontSize(7.5).fillColor(C.text).text(optimization.negotiationAdvice, L + 10, optY + 16, { width: W - 24 });
        }
        doc.y = optY + optH + 4;
      }

      doc.moveDown(0.6);

      // Separator between clauses
      if (ci < sortedClauses.length - 1) {
        doc.strokeColor(C.borderLight).lineWidth(0.5).moveTo(L, doc.y).lineTo(R, doc.y).stroke();
        doc.moveDown(0.6);
      }
    }

    // ════════════════════════════════════════════
    // FOOTER
    // ════════════════════════════════════════════
    checkPage(50);
    doc.moveDown(1);
    doc.strokeColor(C.border).lineWidth(1).moveTo(L, doc.y).lineTo(R, doc.y).stroke();
    doc.moveDown(0.6);
    doc.fontSize(7.5).fillColor(C.muted).text(
      `Contract AI  ·  Smart Optimizer V2  ·  Erstellt am ${new Date().toLocaleDateString('de-DE')} um ${new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr  ·  ID: ${result.requestId || result._id}`,
      { align: 'center' }
    );
    doc.moveDown(0.3);
    doc.fontSize(7).fillColor(C.light).text(
      'Dieser Bericht wurde KI-gestützt erstellt und ersetzt keine rechtliche Beratung.',
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
