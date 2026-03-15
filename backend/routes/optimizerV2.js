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

    const BLUE = '#007AFF';
    const GREEN = '#34C759';
    const RED = '#FF3B30';
    const ORANGE = '#FF9500';
    const GRAY = '#6B7280';
    const DARK = '#111827';

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

    function getScoreColor(score) {
      if (score >= 80) return GREEN;
      if (score >= 60) return ORANGE;
      if (score >= 40) return RED;
      return '#AF52DE';
    }

    function checkPage(needed = 80) {
      if (doc.y + needed > doc.page.height - doc.page.margins.bottom) {
        doc.addPage();
      }
    }

    // ── Page 1: Header & Overview ──
    doc.fontSize(24).fillColor(DARK).text('Vertragsanalyse', { align: 'center' });
    doc.moveDown(0.3);
    doc.fontSize(12).fillColor(GRAY).text('Contract AI - Smart Optimizer', { align: 'center' });
    doc.moveDown(0.3);
    doc.fontSize(10).fillColor(GRAY).text(new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }), { align: 'center' });
    doc.moveDown(1.5);

    // Divider
    doc.strokeColor('#E5E7EB').lineWidth(1).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(1);

    // Contract info
    doc.fontSize(16).fillColor(DARK).text('Vertragsübersicht');
    doc.moveDown(0.5);

    const structure = result.structure || {};
    const infoRows = [
      ['Datei', result.fileName || '-'],
      ['Vertragstyp', structure.recognizedAs || structure.contractTypeLabel || '-'],
      ['Jurisdiktion', structure.jurisdiction || '-'],
    ];
    if (structure.industry && structure.industry !== 'other') {
      infoRows.push(['Branche', INDUSTRY_LABELS[structure.industry] || structure.industry]);
    }
    if (structure.parties?.length > 0) {
      infoRows.push(['Parteien', structure.parties.map(p => `${p.role}: ${p.name || '-'}`).join(', ')]);
    }
    if (structure.duration) infoRows.push(['Laufzeit', structure.duration]);
    infoRows.push(['Qualität', structure.maturity === 'high' ? 'Professionell' : structure.maturity === 'medium' ? 'Solide' : 'Basis']);

    for (const [label, value] of infoRows) {
      doc.fontSize(10).fillColor(GRAY).text(`${label}:`, 50, doc.y, { continued: true, width: 100 });
      doc.fillColor(DARK).text(`  ${value}`, { width: 380 });
      doc.moveDown(0.2);
    }
    doc.moveDown(1);

    // ── Scores ──
    doc.fontSize(16).fillColor(DARK).text('Bewertung');
    doc.moveDown(0.5);

    const scores = result.scores || {};
    const overallScore = scores.overall || 0;

    doc.fontSize(32).fillColor(getScoreColor(overallScore)).text(`${overallScore}`, 50, doc.y, { continued: true });
    doc.fontSize(14).fillColor(GRAY).text('/100  Gesamtscore');
    doc.moveDown(0.8);

    const scoreItems = [
      ['Risiko', scores.risk],
      ['Klarheit', scores.clarity],
      ['Vollständigkeit', scores.completeness],
      ['Marktstandard', scores.marketStandard]
    ];
    for (const [label, value] of scoreItems) {
      const v = value || 0;
      doc.fontSize(10).fillColor(GRAY).text(`${label}:`, 50, doc.y, { continued: true, width: 120 });
      doc.fillColor(getScoreColor(v)).text(`  ${v}/100`);
      doc.moveDown(0.1);
    }
    doc.moveDown(0.5);

    // Stats
    const clauses = result.clauses || [];
    const analyses = result.clauseAnalyses || [];
    const optimizations = result.optimizations || [];
    const optimizedCount = optimizations.filter(o => o.needsOptimization).length;
    const criticalCount = analyses.filter(a => a.strength === 'critical').length;
    const weakCount = analyses.filter(a => a.strength === 'weak').length;

    doc.fontSize(10).fillColor(DARK);
    doc.text(`${clauses.length} Klauseln analysiert  |  ${optimizedCount} optimierbar  |  ${criticalCount} kritisch  |  ${weakCount} schwach`);
    doc.moveDown(1.5);

    // Divider
    doc.strokeColor('#E5E7EB').lineWidth(1).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(1);

    // ── Clause Details ──
    doc.fontSize(16).fillColor(DARK).text('Klausel-Analyse');
    doc.moveDown(0.8);

    // Sort by importance: critical first
    const importanceOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    const analysisMap = new Map();
    for (const a of analyses) analysisMap.set(a.clauseId, a);

    const sortedClauses = [...clauses].sort((a, b) => {
      const impA = importanceOrder[analysisMap.get(a.id)?.importanceLevel] ?? 2;
      const impB = importanceOrder[analysisMap.get(b.id)?.importanceLevel] ?? 2;
      return impA - impB;
    });

    for (const clause of sortedClauses) {
      const analysis = analysisMap.get(clause.id);
      const optimization = optimizations.find(o => o.clauseId === clause.id);

      checkPage(120);

      // Clause header
      const sectionLabel = clause.sectionNumber ? `${clause.sectionNumber} ` : '';
      doc.fontSize(12).fillColor(DARK).text(`${sectionLabel}${clause.title}`, { underline: true });

      // Badges line
      const badges = [];
      if (analysis?.importanceLevel) badges.push(IMPORTANCE_LABELS[analysis.importanceLevel] || analysis.importanceLevel);
      if (analysis?.strength) badges.push(STRENGTH_LABELS[analysis.strength] || analysis.strength);
      if (analysis?.riskLevel > 0) badges.push(`Risiko: ${analysis.riskLevel}/10`);
      doc.fontSize(9).fillColor(GRAY).text(badges.join('  |  '));
      doc.moveDown(0.3);

      // Plain language
      if (analysis?.plainLanguage) {
        doc.fontSize(10).fillColor(DARK).text(analysis.plainLanguage, { width: 495 });
        doc.moveDown(0.3);
      }

      // Legal assessment
      if (analysis?.legalAssessment) {
        checkPage(60);
        doc.fontSize(9).fillColor(GRAY).text('Juristische Bewertung:', { underline: false });
        doc.fontSize(9).fillColor('#374151').text(analysis.legalAssessment, { width: 495 });
        doc.moveDown(0.3);
      }

      // Concerns
      if (analysis?.concerns?.length > 0) {
        checkPage(40);
        doc.fontSize(9).fillColor(ORANGE).text('Bedenken:');
        for (const concern of analysis.concerns) {
          doc.fontSize(9).fillColor('#374151').text(`  • ${concern}`, { width: 485 });
        }
        doc.moveDown(0.2);
      }

      // Legal references
      if (analysis?.legalReferences?.length > 0) {
        doc.fontSize(8).fillColor('#AF52DE').text(`Rechtsgrundlagen: ${analysis.legalReferences.join(', ')}`);
        doc.moveDown(0.2);
      }

      // Optimization hint
      if (optimization?.needsOptimization) {
        checkPage(30);
        doc.fontSize(9).fillColor(BLUE).text('→ Optimierung verfügbar (siehe Optimizer für Details)');
        if (optimization.negotiationAdvice) {
          doc.fontSize(8).fillColor(GREEN).text(`Verhandlungstipp: ${optimization.negotiationAdvice}`, { width: 495 });
        }
      }

      doc.moveDown(0.8);

      // Light separator between clauses
      doc.strokeColor('#F3F4F6').lineWidth(0.5).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown(0.5);
    }

    // ── Footer ──
    checkPage(60);
    doc.moveDown(1);
    doc.strokeColor('#E5E7EB').lineWidth(1).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(0.5);
    doc.fontSize(8).fillColor(GRAY).text(
      `Erstellt am ${new Date().toLocaleDateString('de-DE')} um ${new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr  |  Contract AI - Smart Optimizer  |  Analyse-ID: ${result.requestId || result._id}`,
      { align: 'center' }
    );
    doc.moveDown(0.3);
    doc.fontSize(7).fillColor('#9CA3AF').text(
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
    }).select('structure clauses clauseAnalyses perspective');

    if (!result) {
      return res.status(404).json({ success: false, message: 'Analyse nicht gefunden.' });
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

AUSGABEFORMAT:
Antworte ausschließlich mit der Klausel selbst.
Beginne mit "§ [Thema]" als Überschrift.
Kein Erklärungstext davor oder danach.`;

    const openai = getOpenAI();
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0.3,
      max_tokens: 2000,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Erstelle eine ${categoryLabel}-Klausel für diesen ${structure.contractTypeLabel || 'Vertrag'}.` }
      ]
    });

    const generatedText = response.choices[0].message.content.trim();

    res.json({
      success: true,
      category,
      categoryLabel,
      generatedClause: generatedText,
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
