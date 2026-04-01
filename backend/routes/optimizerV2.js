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
const { hasColumnArtifacts } = require('../services/optimizerV2/utils/clauseSplitter');
const { getFeatureLimit } = require('../constants/subscriptionPlans');
const { generateSignedUrl } = require('../services/fileStorage');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

const s3Main = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

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
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
  'image/heic',
  'image/heif',
  'image/webp',
  'image/tiff'
];

const IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/heic', 'image/heif', 'image/webp', 'image/tiff'];

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

  // Setup SSE early (before text extraction) so OCR doesn't cause HTTP timeout
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

  // Extract text (with OCR fallback for scanned PDFs, direct OCR for images)
  let contractText;
  let ocrApplied = false;
  let ocrAttempted = false;

  // Helper: run OCR via AWS Textract
  const runOCR = async (buffer, progressMsg) => {
    const { checkOcrUsage, incrementOcrUsage } = require('../services/ocrUsageService');
    const usage = await checkOcrUsage(req.user.userId);
    if (!usage.allowed) {
      sendSSE({ error: true, message: `OCR-Limit erreicht (${usage.pagesUsed}/${usage.pagesLimit} Seiten diesen Monat). Bitte upgraden Sie Ihren Plan für mehr OCR-Seiten.` });
      return null;
    }
    ocrAttempted = true;
    sendSSE({ progress: 2, message: progressMsg });
    const { extractTextWithOCR } = require('../services/textractService');
    const ocrResult = await extractTextWithOCR(buffer);
    if (ocrResult.success && ocrResult.text && ocrResult.text.trim().length >= 200) {
      ocrApplied = true;
      await incrementOcrUsage(req.user.userId, ocrResult.pages || 1);
      console.log(`[OptimizerV2] OCR erfolgreich: ${ocrResult.text.trim().length} Zeichen, ${ocrResult.pages} Seiten, Konfidenz: ${ocrResult.confidence?.toFixed(1)}%`);
      // Confidence-Gate: warn user if OCR quality is low
      if (ocrResult.lowConfidence) {
        sendSSE({
          progress: 3,
          message: `Hinweis: Die Texterkennungsqualität liegt bei ${ocrResult.confidence?.toFixed(0)}%. Bei schlechten Scans können Analyseergebnisse ungenau sein. Für beste Ergebnisse ein hochauflösendes PDF verwenden.`,
          warning: true
        });
      }
      return ocrResult.text;
    }
    const ocrErrDetail = ocrResult.error || `nur ${(ocrResult.text || '').trim().length} Zeichen erkannt`;
    console.log(`[OptimizerV2] OCR fehlgeschlagen: ${ocrErrDetail}`);
    // Store error for final message
    runOCR._lastError = ocrErrDetail;
    return null;
  };

  try {
    sendSSE({ progress: 0, message: 'Text wird extrahiert...' });
    const buffer = await fs.readFile(req.file.path);

    // ── Images: pre-check OCR budget, then go directly to OCR ──
    if (IMAGE_MIMES.includes(req.file.mimetype)) {
      const { checkOcrUsage } = require('../services/ocrUsageService');
      const ocrBudget = await checkOcrUsage(req.user.userId);
      if (!ocrBudget.allowed) {
        await cleanupFile(req.file.path);
        sendSSE({ error: true, message: `OCR-Limit erreicht (${ocrBudget.pagesUsed}/${ocrBudget.pagesLimit} Seiten diesen Monat). Bilder benötigen OCR-Texterkennung. Bitte upgraden Sie Ihren Plan.` });
        clearInterval(keepalive);
        return res.end();
      }
      console.log(`[OptimizerV2] Bild-Upload erkannt (${req.file.mimetype}), starte OCR...`);
      contractText = await runOCR(buffer, 'Bild erkannt – Text wird per OCR extrahiert...');
      if (!contractText) {
        await cleanupFile(req.file.path);
        if (!ocrAttempted) { /* limit message already sent */ }
        else sendSSE({ error: true, message: 'Das Bild enthält zu wenig lesbaren Text. Bitte lade ein gut lesbares Foto oder ein PDF hoch.' });
        clearInterval(keepalive);
        return res.end();
      }

    // ── PDFs: 3-stage fallback: pdf-parse → pdfjs-dist → Textract OCR ──
    } else if (req.file.mimetype.includes('pdf')) {
      // Stage A: pdf-parse (schnell, funktioniert für die meisten PDFs)
      try {
        const parsed = await pdfParse(buffer, { max: 500, version: 'v2.0.550' });
        contractText = parsed.text;
        if (contractText && contractText.trim().length >= 100) {
          console.log(`[OptimizerV2] pdf-parse erfolgreich: ${contractText.trim().length} Zeichen`);

          // Quality gate: detect multi-column PDF artifacts (isolated single-letter lines)
          // If detected, Textract OCR handles multi-column layout correctly
          if (hasColumnArtifacts(contractText)) {
            console.log(`[OptimizerV2] Spaltenartefakte erkannt (mehrspaltige PDF vermutet), versuche OCR...`);
            const ocrText = await runOCR(buffer, 'Mehrspaltige PDF erkannt — Text wird per OCR optimiert...');
            if (ocrText) {
              console.log(`[OptimizerV2] OCR-Text übernommen: ${ocrText.trim().length} Zeichen (vorher pdf-parse: ${contractText.trim().length})`);
              contractText = ocrText;
            } else {
              console.log(`[OptimizerV2] OCR nicht verfügbar, verwende pdf-parse Ergebnis`);
            }
          }
        }
      } catch (parseErr) {
        // Detect password-protected PDFs
        const errMsg = (parseErr.message || '').toLowerCase();
        if (errMsg.includes('encrypt') || errMsg.includes('password') || errMsg.includes('protected')) {
          await cleanupFile(req.file.path);
          sendSSE({ error: true, message: 'Die PDF-Datei ist passwortgeschützt. Bitte entferne den Passwortschutz und lade die Datei erneut hoch.' });
          clearInterval(keepalive);
          return res.end();
        }
        console.warn(`[OptimizerV2] pdf-parse Fehler: ${parseErr.message}`);
        contractText = '';
      }

      // Stage B: pdfjs-dist (Mozilla PDF.js — handles edge cases pdf-parse can't)
      if (!contractText || contractText.trim().length < 100) {
        console.log(`[OptimizerV2] pdf-parse lieferte nur ${(contractText || '').trim().length} Zeichen, versuche pdfjs-dist...`);
        sendSSE({ progress: 1, message: 'Alternativer PDF-Parser wird versucht...' });
        try {
          const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.mjs');
          const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) });
          const pdfDoc = await loadingTask.promise;
          const pageTexts = [];
          for (let i = 1; i <= pdfDoc.numPages; i++) {
            const page = await pdfDoc.getPage(i);
            const content = await page.getTextContent();
            const pageText = content.items.map(item => item.str).join(' ');
            if (pageText.trim()) pageTexts.push(pageText);
          }
          const pdfjsText = pageTexts.join('\n\n');
          if (pdfjsText.trim().length >= 100) {
            contractText = pdfjsText;
            console.log(`[OptimizerV2] pdfjs-dist erfolgreich: ${contractText.trim().length} Zeichen, ${pdfDoc.numPages} Seiten`);
          } else {
            console.log(`[OptimizerV2] pdfjs-dist lieferte nur ${pdfjsText.trim().length} Zeichen`);
          }
        } catch (pdfjsErr) {
          console.warn(`[OptimizerV2] pdfjs-dist Fehler: ${pdfjsErr.message}`);
        }
      }

      // Stage C: Textract OCR (für echte Scans / Bild-PDFs)
      if (!contractText || contractText.trim().length < 100) {
        console.log(`[OptimizerV2] Beide PDF-Parser fehlgeschlagen, versuche Textract OCR...`);
        const ocrText = await runOCR(buffer, 'PDF-Text nicht lesbar – OCR wird durchgeführt...');
        if (ocrText) {
          contractText = ocrText;
        }
      }

    // ── DOCX ──
    } else {
      const { extractTextFromBuffer } = require('../services/textExtractor');
      const result = await extractTextFromBuffer(buffer, req.file.mimetype);
      contractText = result.text;
    }
  } catch (err) {
    console.error(`[OptimizerV2] Text-Extraktion Fehler:`, err.message);
    await cleanupFile(req.file.path);
    sendSSE({ error: true, message: 'Text konnte nicht aus der Datei extrahiert werden.' });
    clearInterval(keepalive);
    return res.end();
  }

  if (!contractText || contractText.trim().length === 0) {
    await cleanupFile(req.file.path);
    sendSSE({
      error: true,
      message: ocrAttempted
        ? `Das Dokument konnte nicht gelesen werden. Mögliche Ursachen:\n• Die Datei ist passwortgeschützt\n• Die PDF ist beschädigt oder enthält keine lesbaren Inhalte\n• Bei gescannten Dokumenten: Die Bildqualität ist zu niedrig für die Texterkennung\n\nBitte versuche es mit einer anderen Datei oder einer besseren Scan-Qualität.`
        : 'Das Dokument enthält keinen erkennbaren Text. Bei gescannten PDFs oder Fotos wird automatisch OCR (Texterkennung) versucht — bitte stelle sicher, dass die Datei nicht beschädigt oder leer ist.'
    });
    clearInterval(keepalive);
    return res.end();
  }

  // Warn user if contract text will be truncated (>50K chars)
  const textLength = contractText.trim().length;
  if (textLength > 50000) {
    sendSSE({
      progress: 3,
      message: `Hinweis: Das Dokument ist sehr umfangreich (${Math.round(textLength / 1000)}K Zeichen). Die Analyse erfasst die wichtigsten ~50.000 Zeichen. Bei sehr langen Verträgen können Details am Ende fehlen.`,
      warning: true
    });
  }

  // NFC-Normalisierung: Combining Characters zu precomposed Form (ä statt a+̈)
  contractText = contractText.normalize('NFC');

  if (contractText.trim().length < 500) {
    await cleanupFile(req.file.path);
    sendSSE({
      error: true,
      message: `Das Dokument enthält nur ${contractText.trim().length} Zeichen — das ist zu wenig für eine sinnvolle Vertragsanalyse. Ein typischer Vertrag hat mindestens 1.000 Zeichen. Bitte lade ein vollständiges Vertragsdokument hoch.`
    });
    clearInterval(keepalive);
    return res.end();
  }

  // Text-Quality-Gate: Prüfe ob der Text tatsächlich sinnvoller Vertragstext ist
  // (verhindert dass OCR-Müll an GPT geht und Kosten verursacht)
  {
    const words = contractText.trim().split(/\s+/);
    const totalWords = words.length;
    // Ein "Wort" muss mind. 2 Buchstaben haben und mind. 1 Vokal/Umlaut enthalten
    const realWords = words.filter(w => w.length >= 2 && /[aeiouyäöü]/i.test(w)).length;
    const wordRatio = totalWords > 0 ? realWords / totalWords : 0;

    if (wordRatio < 0.4 && totalWords > 20) {
      console.log(`[OptimizerV2] Text-Quality-Gate: nur ${(wordRatio * 100).toFixed(0)}% echte Wörter (${realWords}/${totalWords})`);
      await cleanupFile(req.file.path);
      sendSSE({
        error: true,
        message: 'Der extrahierte Text enthält zu viele unleserliche Zeichen — die Dokumentqualität reicht nicht für eine zuverlässige Analyse. Bitte lade ein besseres Scan oder ein natives PDF hoch.'
      });
      clearInterval(keepalive);
      return res.end();
    }

    // Soft warning bei grenzwertiger Qualität (40-60% echte Wörter)
    if (wordRatio < 0.6 && totalWords > 20) {
      sendSSE({
        progress: 4,
        message: `Hinweis: Die Textqualität ist eingeschränkt (${(wordRatio * 100).toFixed(0)}% lesbare Wörter). Die Analyseergebnisse könnten bei diesem Dokument weniger präzise sein.`,
        warning: true
      });
    }
  }

  // Upload original file to S3 for later viewing
  let s3Key = null;
  try {
    const fileBuffer = await fs.readFile(req.file.path);
    s3Key = `optimizer-v2/${userId}/${requestId}_${req.file.originalname}`;
    await s3Main.send(new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: s3Key,
      Body: fileBuffer,
      ContentType: req.file.mimetype || 'application/octet-stream'
    }));
  } catch (s3Err) {
    console.warn('[OptimizerV2] S3 upload for viewing failed (non-critical):', s3Err.message);
    s3Key = null; // Non-critical — analysis continues without stored file
  }

  try {
    const result = await runPipeline(
      {
        contractText,
        fileName: req.file.originalname,
        userId,
        requestId,
        perspective,
        s3Key,
        fileSize: req.file.size,
        ocrApplied
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
      // Translate technical errors to user-friendly German messages
      let userMessage = 'Analyse fehlgeschlagen. Bitte versuche es erneut.';
      const errMsg = (err.message || '').toLowerCase();
      if (errMsg.includes('timeout') || errMsg.includes('timed out')) {
        userMessage = 'Die Analyse hat zu lange gedauert. Der Vertrag ist möglicherweise zu komplex. Bitte versuche es erneut.';
      } else if (errMsg.includes('rate limit') || errMsg.includes('429')) {
        userMessage = 'Unsere KI-Server sind aktuell überlastet. Bitte warte einen Moment und versuche es erneut.';
      } else if (errMsg.includes('api') || errMsg.includes('openai') || errMsg.includes('503') || errMsg.includes('500')) {
        userMessage = 'Verbindung zum Analyse-Server fehlgeschlagen. Bitte versuche es in wenigen Minuten erneut.';
      } else if (errMsg.includes('abort') || errMsg.includes('cancel')) {
        userMessage = 'Analyse wurde abgebrochen.';
      }
      sendSSE({ error: true, message: userMessage });
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
  if (!Array.isArray(selections) || selections.length > 500) {
    return res.status(400).json({ success: false, message: 'Auswahl muss ein Array sein (max. 500 Einträge).' });
  }
  // Validate each selection element
  for (const s of selections) {
    if (!s || typeof s.clauseId !== 'string' || !s.clauseId) {
      return res.status(400).json({ success: false, message: 'Jede Auswahl muss eine gültige clauseId enthalten.' });
    }
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
  if (typeof message !== 'string' || message.length > 5000) {
    return res.status(400).json({ success: false, message: 'Nachricht darf maximal 5.000 Zeichen lang sein.' });
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

    const assistantMessage = response.choices?.[0]?.message?.content;
    if (!assistantMessage) {
      console.error('[OptimizerV2] clause-chat: Empty OpenAI response');
      return res.status(502).json({ success: false, message: 'KI-Antwort konnte nicht generiert werden. Bitte erneut versuchen.' });
    }

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

    const redlineData = (result.clauses || []).map(clause => {
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
    // Authorization: verify user owns this result
    const existing = await OptimizerV2Result.findOne({ _id: req.params.id, userId: req.user.userId }).select('_id');
    if (!existing) {
      sendSSE({ error: true, message: 'Analyse nicht gefunden oder keine Berechtigung.' });
      return res.end();
    }

    const result = await resumePipeline(req.params.id, (progress, message, stageData) => {
      sendSSE({ progress, message, ...stageData });
    });

    sendSSE({ progress: 100, complete: true, resultId: result.resultId });
  } catch (err) {
    console.error('[OptimizerV2] Resume error:', err.message);
    sendSSE({ error: true, message: err.message });
  } finally {
    if (!clientDisconnected) res.end();
  }
});

// ════════════════════════════════════════════════════════
// GET /results/:id/view-file - Presigned URL for original file
// ════════════════════════════════════════════════════════
router.get('/results/:id/view-file', async (req, res) => {
  try {
    const result = await OptimizerV2Result.findOne({
      _id: req.params.id,
      userId: req.user.userId
    }).select('s3Key fileName');

    if (!result || !result.s3Key) {
      return res.status(404).json({ success: false, message: 'Originaldatei nicht verfügbar.' });
    }

    const url = await generateSignedUrl(result.s3Key);
    res.json({ success: true, url, fileName: result.fileName });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Fehler beim Laden der Datei.' });
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
      bufferPages: true,
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

    // ── Design tokens — Firmenblau + Pastel accents ──
    const C = {
      brand: '#007AFF', brandDark: '#005EC4', brandLight: '#3395FF',
      danger: '#DC2626', dangerBg: '#fef2f2', dangerBorder: '#fecaca',
      dangerPastel: '#fee2e2', dangerText: '#b91c1c',
      warn: '#d97706', warnBg: '#fffbeb', warnBorder: '#fde68a',
      warnPastel: '#fef3c7', warnText: '#92400e',
      ok: '#16a34a', okBg: '#f0fdf4', okPastel: '#dcfce7', okText: '#166534',
      ref: '#7c3aed', refPastel: '#ede9fe', refText: '#5b21b6',
      bluePastel: '#dbeafe', blueText: '#1e40af',
      dark: '#1e293b', text: '#334155', muted: '#64748b', light: '#94a3b8',
      bg: '#f8fafc', cardBg: '#ffffff', border: '#cbd5e1', borderLight: '#e2e8f0'
    };
    const L = 50, R = 545, W = R - L;
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

    // Score bar colors: green >= 75, blue >= 55, orange >= 35, red < 35
    function getScoreColor(v) {
      if (v >= 75) return C.ok;
      if (v >= 55) return C.brand;
      if (v >= 35) return C.warn;
      return C.danger;
    }
    function getRiskColor(r) { return r >= 7 ? C.danger : r >= 4 ? C.warn : C.muted; }
    function checkPage(needed = 80) { if (doc.y + needed > doc.page.height - 70) doc.addPage(); }

    // Track pages for numbering
    const pages = [doc.bufferedPageRange];
    let totalPages = 1;
    doc.on('pageAdded', () => { totalPages++; });

    function roundedRect(x, y, w, h, r, fill, stroke) {
      doc.save();
      if (fill) doc.fillColor(fill);
      if (stroke) doc.strokeColor(stroke).lineWidth(0.75);
      doc.roundedRect(x, y, w, h, r);
      if (fill && stroke) doc.fillAndStroke();
      else if (fill) doc.fill();
      else if (stroke) doc.stroke();
      doc.restore();
    }
    // Strip AI artifacts like !' from any displayed text
    function clean(text) { return text ? text.replace(/^[!']+\s*/g, '').replace(/\n[!']+\s*/g, '\n') : ''; }

    function drawScoreBar(x, y, w, h, value) {
      roundedRect(x, y, w, h, h / 2, '#e2e8f0', null);
      if (value > 0) roundedRect(x, y, w * (value / 100), h, h / 2, getScoreColor(value), null);
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

    // ── Header band (Firmenblau) ──
    const bandH = 76;
    doc.save();
    doc.rect(0, 0, 595.28, bandH).fill(C.brand);
    doc.restore();

    doc.fontSize(20).fillColor('#FFFFFF').text('Vertragsanalyse', L, 18, { width: W });
    const contractLabel = structure.recognizedAs || structure.contractTypeLabel || result.fileName || 'Vertrag';
    doc.fontSize(9).fillColor('#b3d4ff').text(`${contractLabel}  ·  Contract AI Smart Optimizer V2`, L, 44);
    const dateStr = new Date().toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' });
    doc.fontSize(8).fillColor('#8cbcf5').text(dateStr, L, 58);

    doc.y = bandH + 14;

    // ── Score + Stats Row ──
    const cardY = doc.y;
    const cardH = 70;
    roundedRect(L, cardY, W, cardH, 6, C.cardBg, C.border);

    // Score circle (left) — colored by score value
    const circleX = L + 38, circleY = cardY + 35, circleR = 23;
    const scoreClr = getScoreColor(overallScore);
    doc.save();
    doc.circle(circleX, circleY, circleR).lineWidth(2.5).strokeColor(scoreClr).stroke();
    doc.circle(circleX, circleY, circleR - 2).fill('#f0f4fa');
    doc.restore();
    doc.fontSize(18).fillColor(scoreClr).text(`${overallScore}`, circleX - 14, circleY - 10, { width: 28, align: 'center' });
    doc.fontSize(6).fillColor(C.muted).text('/100', circleX - 10, circleY + 10, { width: 20, align: 'center' });

    // Sub-score bars (center) — colored by value
    const ssX = L + 80;
    const scoreItems = [
      ['Risiko', scores.risk || 0], ['Klarheit', scores.clarity || 0],
      ['Vollständigkeit', scores.completeness || 0], ['Marktstandard', scores.marketStandard || 0]
    ];
    scoreItems.forEach(([label, val], i) => {
      const sy = cardY + 10 + i * 14;
      doc.fontSize(7).fillColor(C.muted).text(label, ssX, sy, { width: 70 });
      drawScoreBar(ssX + 70, sy + 1, 100, 5, val);
      doc.fontSize(7).fillColor(C.dark).text(`${val}`, ssX + 174, sy, { width: 20 });
    });

    // Stat numbers (right) — within card bounds, all dark text
    const stX = L + 300;
    const statGap = 46;
    const stats = [
      [clauses.length, 'Klauseln'], [optimizedCount, 'Optimierbar'],
      [criticalCount, 'Kritisch'], [weakCount, 'Schwach']
    ];
    stats.forEach(([num, lbl], i) => {
      const sx = stX + i * statGap;
      const numColor = (i === 2 && num > 0) ? C.danger : (i === 3 && num > 0) ? C.warn : C.dark;
      doc.fontSize(14).fillColor(numColor).text(`${num}`, sx, cardY + 18, { width: 42, align: 'center' });
      doc.fontSize(6).fillColor(C.muted).text(lbl, sx, cardY + 36, { width: 42, align: 'center' });
    });

    doc.y = cardY + cardH + 8;

    // ── Contract Details (compact inline) ──
    const infoParts = [];
    // Clean up file name: strip leading timestamp prefix like "1769518956232-"
    const displayFileName = result.fileName ? result.fileName.replace(/^\d{10,}-/, '') : null;
    if (displayFileName) infoParts.push(`Datei: ${displayFileName}`);
    if (structure.jurisdiction) infoParts.push(`Recht: ${structure.jurisdiction}`);
    if (structure.industry && structure.industry !== 'other') infoParts.push(`Branche: ${INDUSTRY_LABELS[structure.industry] || structure.industry}`);
    if (structure.parties?.length > 0) infoParts.push(`Parteien: ${structure.parties.map(p => p.name || p.role).join(' / ')}`);
    if (structure.duration) infoParts.push(`Laufzeit: ${structure.duration}`);
    infoParts.push(`Qualität: ${structure.maturity === 'high' ? 'Professionell' : structure.maturity === 'medium' ? 'Solide' : 'Basis'}`);

    if (infoParts.length > 0) {
      const infoY = doc.y;
      const infoText = infoParts.join('  ·  ');
      const infoH = doc.fontSize(7.5).heightOfString(infoText, { width: W - 20 }) + 14;
      roundedRect(L, infoY, W, infoH, 4, '#f8fafc', C.border);
      doc.fontSize(7.5).fillColor(C.muted).text(infoText, L + 10, infoY + 7, { width: W - 20 });
      doc.y = infoY + infoH + 12;
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

    // Helper: draw a pastel-colored tag
    function drawTag(x, y, label, textColor, bgColor) {
      const tw = doc.fontSize(6).widthOfString(label) + 10;
      const bg = bgColor || '#f1f5f9';
      roundedRect(x, y, tw, 12, 3, bg, null);
      doc.fontSize(6).fillColor(textColor).text(label, x + 5, y + 3, { lineBreak: false });
      return tw + 3;
    }

    // Color maps: pastel backgrounds + readable text
    const IMP_COLORS = {
      critical: { text: C.dangerText, bg: C.dangerPastel },
      high:     { text: C.blueText, bg: C.bluePastel },
      medium:   { text: C.muted, bg: '#f1f5f9' },
      low:      { text: C.light, bg: '#f8fafc' }
    };
    const STR_COLORS = {
      strong:   { text: C.okText, bg: C.okPastel },
      adequate: { text: C.warnText, bg: C.warnPastel },
      weak:     { text: C.dangerText, bg: C.dangerPastel },
      critical: { text: C.dangerText, bg: C.dangerPastel }
    };

    for (let ci = 0; ci < sortedClauses.length; ci++) {
      const clause = sortedClauses[ci];
      const analysis = analysisMap.get(clause.id);
      const optimization = optimizations.find(o => o.clauseId === clause.id);
      const riskLevel = analysis?.riskLevel || 0;
      const riskColor = getRiskColor(riskLevel);
      const impLevel = analysis?.importanceLevel || 'medium';
      const imp = IMP_COLORS[impLevel] || { text: C.muted, bg: '#f1f5f9' };
      const str = STR_COLORS[analysis?.strength] || { text: C.muted, bg: '#f1f5f9' };
      const hasConcerns = analysis?.concerns?.length > 0;
      const hasOptimization = optimization?.needsOptimization;
      const sectionLabel = clause.sectionNumber && clause.sectionNumber !== 'null' ? `${clause.sectionNumber}  ` : '';

      // ── TIER 3: Compact row — Standard/Formal with low risk, no concerns, no optimization ──
      if ((impLevel === 'medium' || impLevel === 'low') && riskLevel < 5 && !hasConcerns && !hasOptimization) {
        let compactH = 16;
        if (analysis?.plainLanguage) compactH += 10;
        checkPage(compactH);

        const rowY = doc.y;
        // Left accent dot
        doc.save().circle(L + 4, rowY + 5, 1.5).fill(impLevel === 'low' ? '#d1d5db' : '#94a3b8').restore();

        // Title
        doc.fontSize(8).fillColor(C.dark).text(`${sectionLabel}${clause.title}`, L + 12, rowY + 1, { width: W - 130 });

        // Badges (right-aligned) — calculate positions from right
        let rx = R;
        // Strength tag
        if (analysis?.strength) {
          const sl = STRENGTH_LABELS[analysis.strength] || analysis.strength;
          const sw = doc.fontSize(6).widthOfString(sl) + 10;
          rx -= sw;
          drawTag(rx, rowY, sl, str.text, str.bg);
          rx -= 2;
        }
        // Importance tag
        const il = IMPORTANCE_LABELS[impLevel] || impLevel;
        const iw = doc.fontSize(6).widthOfString(il) + 10;
        rx -= iw;
        drawTag(rx, rowY, il, imp.text, imp.bg);

        // One-line summary
        if (analysis?.plainLanguage) {
          const pl = clean(analysis.plainLanguage);
          const summary = pl.length > 140 ? pl.substring(0, 137) + '...' : pl;
          doc.fontSize(6.5).fillColor(C.light).text(summary, L + 12, rowY + 12, { width: W - 20 });
        }

        doc.y = rowY + compactH + 6;
        if (ci < sortedClauses.length - 1) {
          doc.strokeColor('#f1f5f9').lineWidth(0.3).moveTo(L + 12, doc.y).lineTo(R, doc.y).stroke();
          doc.y += 6;
        }
        continue;
      }

      // ── TIER 2: Medium detail — "Wichtig" with no concerns/opt, OR medium with concerns ──
      const isTier2 = (impLevel === 'high' && !hasConcerns && !hasOptimization && riskLevel < 5) ||
                       ((impLevel === 'medium' || impLevel === 'low') && (hasConcerns || hasOptimization || riskLevel >= 5));

      if (isTier2) {
        let midH = 36;
        if (analysis?.plainLanguage) midH += Math.ceil(Math.min(analysis.plainLanguage.length, 200) / 90) * 10 + 4;
        if (hasConcerns) midH += analysis.concerns.length * 10 + 14;
        if (hasOptimization) midH += 14;
        checkPage(Math.min(midH, 120));

        const rowY = doc.y;

        // Left accent bar (subtle)
        doc.save().rect(L, rowY, 2, 12).fill(riskColor).restore();

        // Title
        doc.fontSize(9).fillColor(C.dark).text(`${sectionLabel}${clause.title}`, L + 8, rowY, { width: W - 16 });

        // Badges row
        const bRowY = rowY + 16;
        let bx2 = L + 8;
        bx2 += drawTag(bx2, bRowY, IMPORTANCE_LABELS[impLevel] || impLevel, imp.text, imp.bg);
        if (analysis?.strength) bx2 += drawTag(bx2, bRowY, STRENGTH_LABELS[analysis.strength] || analysis.strength, str.text, str.bg);
        if (analysis?.legalReferences?.length > 0) {
          doc.fontSize(6).fillColor(C.ref).text(analysis.legalReferences.join(', '), bx2 + 2, bRowY + 3, { lineBreak: false });
        }

        doc.y = bRowY + 16;

        // Summary (truncated)
        if (analysis?.plainLanguage) {
          const pl = clean(analysis.plainLanguage);
          const text = pl.length > 200 ? pl.substring(0, 197) + '...' : pl;
          doc.fontSize(7.5).fillColor(C.text).text(text, L + 8, doc.y, { width: W - 16 });
          doc.moveDown(0.2);
        }

        // Concerns (compact)
        if (hasConcerns) {
          const conY = doc.y;
          const conText = analysis.concerns.map(c => `•  ${clean(c)}`).join('\n');
          const conTextH = doc.fontSize(7).heightOfString(conText, { width: W - 28 });
          roundedRect(L + 8, conY, W - 16, conTextH + 14, 3, C.warnBg, C.warnBorder);
          doc.fontSize(6).fillColor(C.warn).text('Bedenken', L + 14, conY + 3);
          doc.fontSize(7).fillColor(C.text).text(conText, L + 14, conY + 11, { width: W - 28 });
          doc.y = conY + conTextH + 16;
        }

        // Optimization hint (inline)
        if (hasOptimization) {
          const adviceText = clean(optimization.negotiationAdvice || 'Optimierung verfügbar');
          doc.fontSize(6.5).fillColor(C.brand).text(`→ ${adviceText}`, L + 8, doc.y, { width: W - 16 });
          doc.moveDown(0.2);
        }

        doc.moveDown(0.6);
        if (ci < sortedClauses.length - 1) {
          doc.strokeColor(C.borderLight).lineWidth(0.3).moveTo(L, doc.y).lineTo(R, doc.y).stroke();
          doc.moveDown(0.7);
        }
        continue;
      }

      // ── TIER 1: Full detail — Critical, or high-risk with concerns/optimization ──
      let estH = 44;
      if (analysis?.plainLanguage) estH += Math.ceil(analysis.plainLanguage.length / 90) * 10 + 4;
      if (analysis?.legalAssessment) estH += Math.ceil(analysis.legalAssessment.length / 95) * 9 + 14;
      if (hasConcerns) estH += analysis.concerns.length * 10 + 14;
      if (hasOptimization) estH += optimization.negotiationAdvice ? 24 : 14;
      checkPage(Math.min(estH, 160));

      const cY = doc.y;

      // Left accent bar
      doc.save().rect(L, cY, 3, 13).fill(riskColor).restore();

      // Title
      doc.fontSize(9.5).fillColor(C.dark).text(`${sectionLabel}${clause.title}`, L + 8, cY, { width: W - 16 });

      // Badges + legal refs
      const badgeRowY = cY + 17;
      let bx = L + 8;
      bx += drawTag(bx, badgeRowY, IMPORTANCE_LABELS[impLevel] || impLevel, imp.text, imp.bg);
      if (analysis?.strength) bx += drawTag(bx, badgeRowY, STRENGTH_LABELS[analysis.strength] || analysis.strength, str.text, str.bg);
      if (analysis?.legalReferences?.length > 0) {
        doc.fontSize(6).fillColor(C.ref).text(analysis.legalReferences.join(', '), bx + 2, badgeRowY + 3, { lineBreak: false });
      }

      doc.y = badgeRowY + 18;

      // Summary
      if (analysis?.plainLanguage) {
        doc.fontSize(7.5).fillColor(C.text).text(clean(analysis.plainLanguage), L + 8, doc.y, { width: W - 16 });
        doc.moveDown(0.35);
      }

      // Legal assessment box
      if (analysis?.legalAssessment) {
        checkPage(30);
        const laY = doc.y;
        const laText = clean(analysis.legalAssessment);
        const laH = doc.fontSize(7).heightOfString(laText, { width: W - 30 });
        roundedRect(L + 8, laY, W - 16, laH + 16, 3, '#f8fafc', '#e2e8f0');
        doc.fontSize(6).fillColor(C.muted).text('Juristische Bewertung', L + 14, laY + 4);
        doc.fontSize(7).fillColor(C.text).text(laText, L + 14, laY + 13, { width: W - 30 });
        doc.y = laY + laH + 20;
      }

      // Concerns box
      if (hasConcerns) {
        checkPage(20);
        const conY = doc.y;
        const conText = analysis.concerns.map(c => `•  ${clean(c)}`).join('\n');
        const conTextH = doc.fontSize(7).heightOfString(conText, { width: W - 30 });
        roundedRect(L + 8, conY, W - 16, conTextH + 16, 3, C.dangerBg, C.dangerBorder);
        doc.fontSize(6).fillColor(C.danger).text('Bedenken', L + 14, conY + 4);
        doc.fontSize(7).fillColor(C.text).text(conText, L + 14, conY + 13, { width: W - 30 });
        doc.y = conY + conTextH + 20;
      }

      // Optimization box
      if (hasOptimization) {
        checkPage(18);
        const optY = doc.y;
        const adviceText = clean(optimization.negotiationAdvice || '');
        const fullText = adviceText ? `Optimierung verfügbar: ${adviceText}` : 'Optimierung verfügbar';
        const adviceH = doc.fontSize(6.5).heightOfString(fullText, { width: W - 30 });
        roundedRect(L + 8, optY, W - 16, adviceH + 12, 3, C.bluePastel, null);
        doc.fontSize(6.5).fillColor(C.blueText).text(fullText, L + 14, optY + 5, { width: W - 30 });
        doc.y = optY + adviceH + 16;
      }

      doc.moveDown(0.7);
      if (ci < sortedClauses.length - 1) {
        doc.strokeColor(C.borderLight).lineWidth(0.4).moveTo(L, doc.y).lineTo(R, doc.y).stroke();
        doc.moveDown(0.8);
      }
    }

    // ════════════════════════════════════════════
    // FOOTER (content)
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

    // ═══ Page numbers on every page ═══
    const range = doc.bufferedPageRange();
    const totalP = range.count;
    for (let i = range.start; i < range.start + totalP; i++) {
      doc.switchToPage(i);
      const pageLabel = `Seite ${i + 1} von ${totalP}`;
      const labelW = doc.fontSize(7).widthOfString(pageLabel);
      doc.save();
      doc.fontSize(7).fillColor(C.light).text(
        pageLabel,
        (595.28 - labelW) / 2,
        doc.page.height - 30,
        { lineBreak: false }
      );
      doc.restore();
    }

    doc.end();

  } catch (err) {
    console.error('[OptimizerV2] PDF export failed:', err);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: 'PDF-Export fehlgeschlagen.' });
    }
  }
});

// ════════════════════════════════════════════════════════
// GET /results/:id/redline-pdf - Export redline comparison as PDF
// ════════════════════════════════════════════════════════
router.get('/results/:id/redline-pdf', async (req, res) => {
  try {
    const result = await OptimizerV2Result.findOne({
      _id: req.params.id,
      userId: req.user.userId,
      status: 'completed'
    });
    if (!result) {
      return res.status(404).json({ success: false, message: 'Analyse nicht gefunden.' });
    }

    const mode = req.query.mode || 'neutral';
    const MODE_NAMES = { neutral: 'Neutral', proCreator: 'Pro Ersteller', proRecipient: 'Pro Empfänger' };
    const modeName = MODE_NAMES[mode] || 'Neutral';

    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({
      size: 'A4',
      bufferPages: true,
      margins: { top: 50, bottom: 60, left: 50, right: 50 },
      info: {
        Title: `Redline – ${result.fileName || 'Vertrag'}`,
        Author: 'Contract AI',
        Creator: 'Contract AI'
      }
    });

    const fileName = (result.fileName || 'Redline').replace(/\.[^/.]+$/, '').replace(/^\d{10,}-/, '');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}_Redline.pdf"`);
    doc.pipe(res);

    function clean(text) { return text ? text.replace(/^[!']+\s*/g, '').replace(/\n[!']+\s*/g, '\n').trim() : ''; }

    const M = 50;
    const PW = doc.page.width - 2 * M;
    const PL = M;
    const PR = M + PW;
    const BOTTOM = doc.page.height - 60;

    function checkPage(needed = 60) {
      if (doc.y + needed > BOTTOM) { doc.addPage(); return true; }
      return false;
    }

    // Data prep
    const clauses = result.clauses || [];
    const optMap = new Map();
    for (const o of (result.optimizations || [])) optMap.set(o.clauseId, o);
    const changedClauses = clauses.filter(c => optMap.get(c.id)?.needsOptimization);
    const unchangedCount = clauses.length - changedClauses.length;

    const CATEGORY_LABELS = {
      parties: 'Parteien', subject: 'Gegenstand', duration: 'Laufzeit',
      compensation: 'Vergütung', termination: 'Kündigung', liability: 'Haftung',
      ip: 'Geistiges Eigentum', confidentiality: 'Vertraulichkeit', warranty: 'Gewährleistung',
      dataprivacy: 'Datenschutz', compliance: 'Compliance', indemnification: 'Freistellung',
      forcemajeure: 'Höhere Gewalt', dispute: 'Streitbeilegung', general: 'Allgemeines',
      insurance: 'Versicherung', noncompete: 'Wettbewerbsverbot', governing_law: 'Anwendbares Recht',
      preamble: 'Präambel', definitions: 'Definitionen', other: 'Sonstige'
    };

    // ══════════════════════════════════════════════
    // ── COVER PAGE ──
    // ══════════════════════════════════════════════
    doc.rect(0, 0, doc.page.width, 80).fill('#0066FF');
    doc.font('Helvetica-Bold').fontSize(20).fillColor('#FFFFFF')
       .text('Redline-Vergleich', M, 24, { width: PW });
    doc.font('Helvetica').fontSize(10).fillColor('rgba(255,255,255,0.8)')
       .text(`${modeName}-Perspektive  ·  ${new Date().toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })}`, M, 50, { width: PW });

    doc.y = 100;

    // Stats line
    doc.font('Helvetica').fontSize(10).fillColor('#374151')
       .text(`${clauses.length} Klauseln  ·  ${changedClauses.length} Optimierungen  ·  ${unchangedCount} unverändert`, PL, doc.y, { width: PW });
    doc.y += 24;

    // Contract info
    const structure = result.structure || {};
    const infoLines = [];
    const cleanFileName = clean(result.fileName || '').replace(/^\d{10,}-/, '');
    if (cleanFileName) infoLines.push(`Datei: ${cleanFileName}`);
    if (structure.contractTypeLabel || structure.recognizedAs)
      infoLines.push(`Typ: ${structure.contractTypeLabel || structure.recognizedAs}`);
    if (structure.jurisdiction) infoLines.push(`Jurisdiktion: ${structure.jurisdiction}`);
    if (structure.parties?.length) {
      structure.parties.filter(p => p.name).forEach(p => {
        const role = (p.role || 'Partei').charAt(0).toUpperCase() + (p.role || 'Partei').slice(1);
        infoLines.push(`${role}: ${p.name}`);
      });
    }
    if (result.scores?.overall) infoLines.push(`Gesamt-Score: ${result.scores.overall}/100`);

    if (infoLines.length > 0) {
      for (const line of infoLines) {
        doc.font('Helvetica').fontSize(9).fillColor('#6B7280').text(line, PL, doc.y, { width: PW });
        doc.y += 14;
      }
      doc.y += 8;
    }

    // Separator
    doc.moveTo(PL, doc.y).lineTo(PR, doc.y).strokeColor('#E5E7EB').lineWidth(0.5).stroke();
    doc.y += 16;

    // Disclaimer
    doc.font('Helvetica').fontSize(7.5).fillColor('#9CA3AF')
       .text('Dieses Dokument wurde automatisch erstellt und dient als Verhandlungsgrundlage. Es ersetzt keine Rechtsberatung.', PL, doc.y, { width: PW });

    // ══════════════════════════════════════════════
    // ── CLAUSE PAGES (Two-Column Layout) ──
    // ══════════════════════════════════════════════
    doc.addPage();

    const GAP = 16;                           // gap between columns
    const COL_W = (PW - GAP) / 2;            // each column width (~240pt)
    const COL_LEFT_X = PL;                    // left column start
    const COL_RIGHT_X = PL + COL_W + GAP;    // right column start
    const TEXT_PAD = 8;                       // padding inside columns
    const TEXT_W = COL_W - TEXT_PAD * 2;      // text width inside column

    // Column headers (repeated on each new page)
    function drawColumnHeaders() {
      const chy = doc.y;
      // Left header: "ORIGINAL"
      doc.rect(COL_LEFT_X, chy, COL_W, 20).fill('#FEF2F2');
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#DC2626')
         .text('ORIGINAL', COL_LEFT_X + TEXT_PAD, chy + 6, { width: TEXT_W, lineBreak: false });
      // Right header: "OPTIMIERT"
      doc.rect(COL_RIGHT_X, chy, COL_W, 20).fill('#F0FDF4');
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#059669')
         .text('OPTIMIERT', COL_RIGHT_X + TEXT_PAD, chy + 6, { width: TEXT_W, lineBreak: false });
      doc.y = chy + 24;
    }

    drawColumnHeaders();

    for (let ci = 0; ci < changedClauses.length; ci++) {
      const clause = changedClauses[ci];
      const opt = optMap.get(clause.id);
      const version = opt.versions?.[mode];
      const sectionNum = clause.sectionNumber && clause.sectionNumber !== 'null' ? clause.sectionNumber : '';
      const catLabel = CATEGORY_LABELS[clause.category] || clause.category || '';
      const origText = clean(clause.originalText || '');
      const optText = version?.text ? clean(version.text) : origText;
      const reasonText = clean(version?.reasoning || '');

      // Check if we need a new page for header
      if (doc.y + 60 > BOTTOM) {
        doc.addPage();
        drawColumnHeaders();
      }

      // ── Header bar (full width) ──
      const headerY = doc.y;
      doc.rect(PL, headerY, PW, 24).fill('#F9FAFB');
      doc.rect(PL, headerY, 3, 24).fill('#0066FF');

      let hx = PL + 12;
      if (sectionNum) {
        doc.font('Helvetica-Bold').fontSize(8).fillColor('#0066FF')
           .text(sectionNum, hx, headerY + 7, { lineBreak: false });
        hx += doc.widthOfString(sectionNum) + 8;
      }
      doc.font('Helvetica-Bold').fontSize(9).fillColor('#111827')
         .text(clean(clause.title || 'Klausel'), hx, headerY + 7, { lineBreak: false, width: PW * 0.5 });

      const cntText = `${ci + 1} / ${changedClauses.length}`;
      doc.font('Helvetica').fontSize(7).fillColor('#9CA3AF')
         .text(`${catLabel}  ·  ${cntText}`, PL, headerY + 8, { width: PW - 10, align: 'right', lineBreak: false });

      doc.y = headerY + 28;

      // ── Two-column content (chunked page-by-page for long texts) ──
      const origParas = origText.split('\n').filter(l => l.trim());
      const optParas = optText.split('\n').filter(l => l.trim());
      let oi = 0, ri = 0;

      while (oi < origParas.length || ri < optParas.length) {
        const avail = BOTTOM - doc.y;
        if (avail < 30) { doc.addPage(); drawColumnHeaders(); continue; }

        // Accumulate left-column paragraphs that fit in available space
        let lText = '', lH = 0;
        while (oi < origParas.length) {
          const t = lText ? lText + '\n' + origParas[oi] : origParas[oi];
          doc.font('Helvetica').fontSize(8.5);
          const h = doc.heightOfString(t, { width: TEXT_W, lineGap: 2 });
          if (h > avail && lText) break;
          lText = t; lH = h; oi++;
          if (h >= avail) break;
        }

        // Accumulate right-column paragraphs that fit in available space
        let rText = '', rH = 0;
        while (ri < optParas.length) {
          const t = rText ? rText + '\n' + optParas[ri] : optParas[ri];
          doc.font('Helvetica').fontSize(8.5);
          const h = doc.heightOfString(t, { width: TEXT_W, lineGap: 2 });
          if (h > avail && rText) break;
          rText = t; rH = h; ri++;
          if (h >= avail) break;
        }

        if (!lText.trim() && !rText.trim()) break;

        const chunkY = doc.y;
        const chunkH = Math.max(lH, rH, 10);

        if (lText.trim()) {
          doc.font('Helvetica').fontSize(8.5).fillColor('#6B7280')
             .text(lText, COL_LEFT_X + TEXT_PAD, chunkY, { width: TEXT_W, lineGap: 2 });
        }
        if (rText.trim()) {
          doc.font('Helvetica').fontSize(8.5).fillColor('#111827')
             .text(rText, COL_RIGHT_X + TEXT_PAD, chunkY, { width: TEXT_W, lineGap: 2 });
        }

        // Show placeholder when right column is done but left continues
        if (lText.trim() && !rText.trim() && ri >= optParas.length) {
          const placeholderY = chunkY + 4;
          doc.save();
          doc.roundedRect(COL_RIGHT_X + TEXT_PAD, placeholderY, TEXT_W, 22, 3).fill('#F9FAFB');
          doc.font('Helvetica').fontSize(7).fillColor('#9CA3AF')
             .text('Optimierung siehe oben', COL_RIGHT_X + TEXT_PAD + 8, placeholderY + 7, { width: TEXT_W - 16, lineBreak: false });
          doc.restore();
        }
        // Show placeholder when left column is done but right continues
        if (rText.trim() && !lText.trim() && oi >= origParas.length) {
          const placeholderY = chunkY + 4;
          doc.save();
          doc.roundedRect(COL_LEFT_X + TEXT_PAD, placeholderY, TEXT_W, 22, 3).fill('#F9FAFB');
          doc.font('Helvetica').fontSize(7).fillColor('#9CA3AF')
             .text('Original siehe oben', COL_LEFT_X + TEXT_PAD + 8, placeholderY + 7, { width: TEXT_W - 16, lineBreak: false });
          doc.restore();
        }

        // Vertical divider between columns
        const divX = PL + COL_W + GAP / 2;
        doc.save();
        doc.moveTo(divX, chunkY).lineTo(divX, chunkY + chunkH)
           .strokeColor('#E5E7EB').lineWidth(0.5).stroke();
        doc.restore();

        doc.y = chunkY + chunkH;

        // More content remaining? Continue on next page
        if (oi < origParas.length || ri < optParas.length) {
          doc.addPage();
          drawColumnHeaders();
        }
      }

      doc.y += 8;

      // ── Reasoning (full width below columns) ──
      if (reasonText) {
        checkPage(40);
        const boxX = PL + 4;
        const boxW = PW - 8;
        const rH = doc.font('Helvetica').fontSize(7.5).heightOfString(reasonText, { width: boxW - 20, lineGap: 2 }) + 20;
        const boxY = doc.y;
        doc.rect(boxX, boxY, boxW, rH).fill('#F9FAFB');
        doc.rect(boxX, boxY, 2.5, rH).fill('#0066FF');
        doc.font('Helvetica-Bold').fontSize(6.5).fillColor('#0066FF')
           .text('BEGRÜNDUNG', boxX + 10, boxY + 5, { lineBreak: false });
        doc.font('Helvetica').fontSize(7.5).fillColor('#374151')
           .text(reasonText, boxX + 10, boxY + 14, { width: boxW - 20, lineGap: 2 });
        doc.y = boxY + rH + 4;
      }

      // ── Negotiation advice ──
      const advice = clean(opt.negotiationAdvice || '');
      if (advice) {
        checkPage(24);
        doc.font('Helvetica-Oblique').fontSize(7).fillColor('#9CA3AF')
           .text(`Verhandlungshinweis: ${advice}`, PL + 8, doc.y, { width: PW - 16 });
        doc.y += 4;
      }

      // Clause separator
      doc.y += 4;
      doc.moveTo(PL, doc.y).lineTo(PR, doc.y).strokeColor('#E5E7EB').lineWidth(0.5).stroke();
      doc.y += 12;
    }

    // ══════════════════════════════════════════════
    // ── FOOTER & PAGE NUMBERS ──
    // ══════════════════════════════════════════════
    const range = doc.bufferedPageRange();
    const pageCount = range.count;
    for (let i = range.start; i < range.start + pageCount; i++) {
      doc.switchToPage(i);
      // Temporarily remove bottom margin to prevent PDFKit from creating new pages
      const savedBottom = doc.page.margins.bottom;
      doc.page.margins.bottom = 0;
      doc.save();
      const fy = doc.page.height - 36;
      doc.moveTo(M, fy).lineTo(doc.page.width - M, fy).strokeColor('#F3F4F6').lineWidth(0.5).stroke();
      doc.font('Helvetica').fontSize(7).fillColor('#9CA3AF')
         .text('Contract AI', M, fy + 6, { lineBreak: false });
      doc.font('Helvetica').fontSize(7).fillColor('#9CA3AF')
         .text(`Seite ${i + 1} von ${pageCount}`, 0, fy + 6, {
            width: doc.page.width - M, align: 'right', lineBreak: false
         });
      doc.restore();
      doc.page.margins.bottom = savedBottom;
    }

    doc.end();
  } catch (err) {
    console.error('[OptimizerV2] Redline PDF error:', err);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: 'Redline-PDF-Export fehlgeschlagen.' });
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
    const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
            BorderStyle, Header, Footer, PageNumber, PageBreak, Tab, TabStopType, TabStopPosition } = require('docx');

    const structure = result.structure || {};
    const clauses = result.clauses || [];
    const optimizations = result.optimizations || [];
    const clauseAnalyses = result.clauseAnalyses || [];
    const fallbackMode = mode || 'neutral';

    const selectionMap = new Map();
    if (Array.isArray(selections)) {
      for (const s of selections) {
        selectionMap.set(s.clauseId, { mode: s.mode || fallbackMode, customText: s.customText || null });
      }
    }

    // ── Helpers ──
    const cleanText = (text) => {
      if (!text) return '';
      let t = text.normalize('NFC'); // NFC-Normalisierung: combining chars → precomposed

      // 1. Decode HTML entities
      t = t.replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'");

      // 2. Replace problematic Unicode characters
      t = t.replace(/∙/g, '-');      // bullet operator → dash
      t = t.replace(/·/g, '-');      // middle dot → dash
      t = t.replace(/\u00AD/g, '');  // soft hyphen
      t = t.replace(/[\u2000-\u200F]/g, ' '); // various unicode spaces
      t = t.replace(/\uFFFD/g, ''); // replacement character (box)
      t = t.replace(/\uFEFF/g, ''); // BOM
      t = t.replace(/[\u25A0-\u25FF]/g, ''); // geometric shapes (□ ■)
      t = t.replace(/[\u2500-\u257F]/g, ''); // box drawing (─ │ ┌)
      t = t.replace(/[\u2580-\u259F]/g, ''); // block elements (▀ ▄ █)
      t = t.replace(/[\u2600-\u26FF]/g, ''); // misc symbols (☀ ★)
      t = t.replace(/[\u2700-\u27BF]/g, ''); // dingbats (✂ ✓)
      t = t.replace(/[\uE000-\uF8FF]/g, ''); // private use area
      t = t.replace(/[\u2028\u2029]/g, '\n'); // unicode line separators
      t = t.replace(/[\uFB00-\uFB06]/g, (m) => ({ '\uFB00': 'ff', '\uFB01': 'fi', '\uFB02': 'fl', '\uFB03': 'ffi', '\uFB04': 'ffl', '\uFB05': 'st', '\uFB06': 'st' }[m] || m)); // ligatures
      t = t.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, ''); // control chars

      // 3. Remove OCR page markers and headers
      t = t.replace(/Seite\s+\d+\s+von\s+\d+/gi, '');
      t = t.replace(/Ausdruck vom\s*/gi, '');

      // 4. Remove repeated company address/register blocks (OCR page headers)
      t = t.replace(/(?:\n|^)\s*[A-ZÄÖÜ][\wäöüÄÖÜß\s\-&.]+(?:GmbH|AG|KG|SE|e\.K\.)[\s\S]{0,300}?(?:Handelsregister|USt-Id|Steuer-Nr|IBAN|BLZ|BIC)[^\n]*/g, (match, offset) => {
        return offset < 300 ? match : '';
      });

      // 4b. General OCR header dedup: find any substring (30+ chars) appearing 3+ times
      // This catches repeated page headers/footers that OCR inserts on every page
      const lines = t.split('\n');
      const lineCounts = new Map();
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.length >= 30) {
          lineCounts.set(trimmed, (lineCounts.get(trimmed) || 0) + 1);
        }
      }
      for (const [line, count] of lineCounts) {
        if (count >= 3) {
          let found = 0;
          t = t.replace(new RegExp(line.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), () => {
            found++;
            return found <= 1 ? line : '';
          });
        }
      }

      // 4c. Remove inline OCR headers: "...Straße Nr PLZ Stadt IBAN:" merged with body text
      // Uses tight non-newline match from Straße through IBAN
      const addrIbanRe = /[^\n]{3,50}(?:Straße|Str\.)\s+\d+\s+\d{5}\s+[^\n]{3,30}?IBAN:[^\S\n]*/g;
      const addrBlocks = t.match(addrIbanRe);
      if (addrBlocks && addrBlocks.length > 2) {
        const counts = new Map();
        for (const m of addrBlocks) counts.set(m, (counts.get(m) || 0) + 1);
        for (const [block, count] of counts) {
          if (count > 2) {
            let found = 0;
            t = t.replace(new RegExp(block.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), () => {
              found++;
              return found <= 1 ? block : '';
            });
          }
        }
      }

      // 5. Remove standalone document type references
      t = t.replace(/\n\s*[\w\-]+(?:vertrag|rahmenvertrag|vereinbarung)\s*\([A-Z]+\)\s*\n/gi, '\n');

      // 6. Fix OCR hyphenated words across lines: "länge-\nren" → "längeren"
      // Only fix when lowercase letter before hyphen and lowercase after (real word splits)
      t = t.replace(/([a-zäöüß])-\s*\n\s*([a-zäöüß])/g, '$1$2');

      // 7. Collapse multiple spaces to single space (per line)
      t = t.split('\n').map(line => line.replace(/\s{2,}/g, ' ').trim()).join('\n');

      // 8. Remove empty/near-empty lines
      t = t.replace(/\n{3,}/g, '\n\n');

      return t.trim();
    };

    // Deduplicate heading: if title already starts with sectionNumber, skip prefix
    const buildHeadingText = (sectionNumber, title) => {
      const sec = (sectionNumber && sectionNumber !== 'null') ? sectionNumber.trim() : '';
      const t = (title || '').trim();
      if (!sec) return t;
      // If title already starts with the section number, don't repeat it
      if (t.startsWith(sec)) return t;
      return `${sec} ${t}`;
    };

    const appliedCount = selectionMap.size;
    const totalOptimizable = optimizations.filter(o => o.needsOptimization).length;
    const contractTitle = structure.contractTypeLabel || structure.recognizedAs || 'Vertrag';
    const dateStr = new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });

    // ── Header & Footer ──
    const docHeader = new Header({
      children: [
        new Paragraph({
          children: [
            new TextRun({ text: contractTitle, font: 'Arial', size: 16, color: '9CA3AF' }),
            new TextRun({ text: '\t', font: 'Arial' }),
            new TextRun({ text: 'Contract AI', font: 'Arial', size: 16, color: '9CA3AF', bold: true })
          ],
          tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
          border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: 'E5E7EB', space: 4 } }
        })
      ]
    });

    const docFooter = new Footer({
      children: [
        new Paragraph({
          children: [
            new TextRun({ text: 'Erstellt mit Contract AI', font: 'Arial', size: 14, color: 'ABABAB', italics: true }),
            new TextRun({ text: '\t', font: 'Arial' }),
            new TextRun({ text: 'Seite ', font: 'Arial', size: 14, color: 'ABABAB' }),
            new TextRun({ children: [PageNumber.CURRENT], font: 'Arial', size: 14, color: 'ABABAB' }),
            new TextRun({ text: ' von ', font: 'Arial', size: 14, color: 'ABABAB' }),
            new TextRun({ children: [PageNumber.TOTAL_PAGES], font: 'Arial', size: 14, color: 'ABABAB' })
          ],
          tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
          border: { top: { style: BorderStyle.SINGLE, size: 1, color: 'E5E7EB', space: 4 } }
        })
      ]
    });

    // ── Title Page ──
    const titleChildren = [];

    // Spacer
    titleChildren.push(new Paragraph({ spacing: { after: 600 }, children: [] }));

    // Contract type as main title
    titleChildren.push(
      new Paragraph({
        children: [new TextRun({ text: contractTitle, bold: true, size: 48, font: 'Arial', color: '111827' })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 }
      })
    );

    // Parties
    if (structure.parties?.length) {
      const partyLines = structure.parties.filter(p => p.name);
      if (partyLines.length >= 2) {
        titleChildren.push(
          new Paragraph({
            children: [new TextRun({ text: 'zwischen', size: 22, font: 'Arial', color: '6B7280', italics: true })],
            alignment: AlignmentType.CENTER,
            spacing: { before: 200, after: 100 }
          }),
          new Paragraph({
            children: [new TextRun({ text: partyLines[0].name, size: 24, font: 'Arial', color: '374151', bold: true })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 40 }
          }),
          ...(partyLines[0].role ? [new Paragraph({
            children: [new TextRun({ text: `(${partyLines[0].role})`, size: 20, font: 'Arial', color: '9CA3AF', italics: true })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 }
          })] : []),
          new Paragraph({
            children: [new TextRun({ text: 'und', size: 22, font: 'Arial', color: '6B7280', italics: true })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 }
          }),
          new Paragraph({
            children: [new TextRun({ text: partyLines[1].name, size: 24, font: 'Arial', color: '374151', bold: true })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 40 }
          }),
          ...(partyLines[1].role ? [new Paragraph({
            children: [new TextRun({ text: `(${partyLines[1].role})`, size: 20, font: 'Arial', color: '9CA3AF', italics: true })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 }
          })] : [])
        );
      } else if (partyLines.length === 1) {
        titleChildren.push(
          new Paragraph({
            children: [new TextRun({ text: partyLines[0].name, size: 24, font: 'Arial', color: '374151', bold: true })],
            alignment: AlignmentType.CENTER,
            spacing: { before: 200, after: 100 }
          })
        );
      }
    }

    // Separator line
    titleChildren.push(
      new Paragraph({ spacing: { before: 300 }, children: [] }),
      new Paragraph({
        border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: 'D1D5DB', space: 1 } },
        spacing: { after: 200 },
        children: []
      })
    );

    // Meta info
    titleChildren.push(
      new Paragraph({
        children: [
          new TextRun({ text: 'Datum: ', size: 20, font: 'Arial', color: '6B7280' }),
          new TextRun({ text: dateStr, size: 20, font: 'Arial', color: '374151', bold: true })
        ],
        spacing: { after: 60 }
      }),
      new Paragraph({
        children: [
          new TextRun({ text: 'Klauseln: ', size: 20, font: 'Arial', color: '6B7280' }),
          new TextRun({ text: `${clauses.length}`, size: 20, font: 'Arial', color: '374151', bold: true })
        ],
        spacing: { after: 60 }
      }),
      new Paragraph({
        children: [
          new TextRun({ text: 'Optimierungen: ', size: 20, font: 'Arial', color: '6B7280' }),
          new TextRun({ text: `${appliedCount} von ${totalOptimizable} übernommen`, size: 20, font: 'Arial', color: '374151', bold: true })
        ],
        spacing: { after: 60 }
      })
    );

    if (structure.jurisdiction) {
      titleChildren.push(
        new Paragraph({
          children: [
            new TextRun({ text: 'Rechtsordnung: ', size: 20, font: 'Arial', color: '6B7280' }),
            new TextRun({ text: structure.jurisdiction, size: 20, font: 'Arial', color: '374151', bold: true })
          ],
          spacing: { after: 60 }
        })
      );
    }

    // Disclaimer
    titleChildren.push(
      new Paragraph({ spacing: { before: 400 }, children: [] }),
      new Paragraph({
        children: [new TextRun({
          text: 'Dieses Dokument wurde KI-gestützt optimiert. Änderungen gegenüber dem Original sind als solche gekennzeichnet. Eine juristische Prüfung wird empfohlen.',
          size: 18, font: 'Arial', color: '9CA3AF', italics: true
        })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 },
        border: {
          top: { style: BorderStyle.SINGLE, size: 1, color: 'E5E7EB', space: 8 },
          bottom: { style: BorderStyle.SINGLE, size: 1, color: 'E5E7EB', space: 8 },
          left: { style: BorderStyle.SINGLE, size: 1, color: 'E5E7EB', space: 8 },
          right: { style: BorderStyle.SINGLE, size: 1, color: 'E5E7EB', space: 8 }
        }
      })
    );

    // Page break after title page
    titleChildren.push(
      new Paragraph({ children: [new PageBreak()] })
    );

    // ── Contract Body ──
    const bodyChildren = [];

    for (const clause of clauses) {
      const optimization = optimizations.find(o => o.clauseId === clause.id);
      const selection = selectionMap.get(clause.id);
      const selectedMode = selection?.mode;
      const isOptimized = selectedMode && (selectedMode === 'custom' || optimization?.needsOptimization);

      // Section heading (deduplicated)
      const headingText = buildHeadingText(clause.sectionNumber, clause.title);
      const headingRuns = [
        new TextRun({ text: headingText, bold: true, size: 24, font: 'Arial', color: '111827' })
      ];
      if (isOptimized) {
        headingRuns.push(new TextRun({ text: '  [optimiert]', size: 18, font: 'Arial', color: '2563EB', italics: true }));
      }

      bodyChildren.push(
        new Paragraph({
          children: headingRuns,
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 360, after: 120 },
          border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: 'E5E7EB', space: 4 } }
        })
      );

      // Clause text
      let clauseText = clause.originalText;
      if (isOptimized && selectedMode === 'custom' && selection.customText) {
        clauseText = selection.customText;
      } else if (isOptimized && optimization?.versions?.[selectedMode]?.text) {
        clauseText = optimization.versions[selectedMode].text;
      }

      const cleanedText = cleanText(clauseText);
      const lines = cleanedText.split('\n');

      // Smart line classification and grouping
      let currentBlock = [];
      const flushBlock = () => {
        if (currentBlock.length === 0) return;
        const joined = currentBlock.join(' ');
        if (joined.trim().length >= 3) {
          bodyChildren.push(
            new Paragraph({
              children: [new TextRun({ text: joined.trim(), size: 22, font: 'Arial', color: '374151' })],
              spacing: { after: 140, line: 276 }
            })
          );
        }
        currentBlock = [];
      };

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) { flushBlock(); continue; }
        if (line.length < 3 && !/^\d+[.)]?$/.test(line)) continue;

        // Detect numbered subpoints: (1), (2), 1., 2., a), b) etc.
        const isNumberedItem = /^\(\d+\)/.test(line) || /^\d+[.)]\s/.test(line) || /^[a-z]\)\s/i.test(line);
        // Detect roman numerals: I., II., III., IV.
        const isRomanItem = /^[IVX]+[.)]\s/.test(line);
        // Detect label lines ending with ":"
        const isLabel = line.endsWith(':') && line.length < 80;
        // Detect section reference in text
        const isSectionRef = /^§\s*\d/.test(line);
        // Empty line means new paragraph
        const isNewBlock = !line;

        if (isNumberedItem || isRomanItem) {
          flushBlock();
          bodyChildren.push(
            new Paragraph({
              children: [new TextRun({ text: line, size: 22, font: 'Arial', color: '374151' })],
              spacing: { after: 80, line: 276 },
              indent: { left: 420, hanging: 280 }
            })
          );
        } else if (isLabel) {
          flushBlock();
          bodyChildren.push(
            new Paragraph({
              children: [new TextRun({ text: line, size: 22, font: 'Arial', color: '374151', bold: true })],
              spacing: { before: 100, after: 60, line: 276 }
            })
          );
        } else if (isSectionRef) {
          flushBlock();
          bodyChildren.push(
            new Paragraph({
              children: [new TextRun({ text: line, size: 22, font: 'Arial', color: '374151' })],
              spacing: { before: 80, after: 100, line: 276 }
            })
          );
        } else {
          // Check if this is a continuation of previous text or a new item
          const prevLine = i > 0 ? lines[i - 1].trim() : '';
          const startsWithUpper = /^[A-ZÄÖÜ]/.test(line);
          const prevEndsWithPeriod = /[.;!?]$/.test(prevLine);
          const prevEndsWithColon = prevLine.endsWith(':');

          if ((startsWithUpper && (prevEndsWithPeriod || prevEndsWithColon || !prevLine)) ||
              currentBlock.length === 0) {
            // Start new paragraph block
            if (prevEndsWithPeriod || prevEndsWithColon) flushBlock();
            currentBlock.push(line);
          } else {
            // Continuation — append to current block
            currentBlock.push(line);
          }
        }
      }
      flushBlock();

      // Optimization reasoning in a styled box
      if (isOptimized) {
        const reasoningText = selectedMode === 'custom'
          ? 'Vom Benutzer individuell angepasste Formulierung.'
          : optimization?.versions?.[selectedMode]?.reasoning;

        if (reasoningText) {
          bodyChildren.push(
            new Paragraph({
              children: [
                new TextRun({ text: 'Änderungshinweis: ', bold: true, size: 18, font: 'Arial', color: '2563EB' }),
                new TextRun({ text: cleanText(reasoningText), size: 18, font: 'Arial', color: '4B5563', italics: true })
              ],
              spacing: { before: 120, after: 160 },
              indent: { left: 400, right: 400 },
              border: {
                left: { style: BorderStyle.SINGLE, size: 6, color: '93C5FD', space: 8 }
              },
              shading: { type: 'clear', fill: 'EFF6FF' }
            })
          );
        }
      }
    }

    // Build document with header/footer
    const doc = new Document({
      creator: 'Contract AI',
      title: contractTitle,
      description: `Optimierter Vertrag — ${contractTitle}`,
      styles: {
        default: {
          document: { run: { font: 'Arial', size: 22 } }
        }
      },
      sections: [{
        properties: {
          page: {
            margin: { top: 1440, right: 1200, bottom: 1440, left: 1200 }
          }
        },
        headers: { default: docHeader },
        footers: { default: docFooter },
        children: [...titleChildren, ...bodyChildren]
      }]
    });

    const buffer = await Packer.toBuffer(doc);

    const fileName = `${contractTitle.replace(/[^a-zA-Z0-9äöüÄÖÜß\-_ ]/g, '').replace(/\s+/g, '_')}_optimiert.docx`;
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

    // ── Cache check: return cached clause if recent (max 7 days) ──
    const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
    const cached = (result.generatedClauses || []).find(gc => gc.category === category);
    if (cached && cached.createdAt && (Date.now() - new Date(cached.createdAt).getTime()) < CACHE_TTL_MS) {
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

    const fullResponse = response.choices?.[0]?.message?.content?.trim();
    if (!fullResponse) {
      console.error('[OptimizerV2] generate-clause: Empty OpenAI response');
      return res.status(502).json({ success: false, message: 'Klausel konnte nicht generiert werden. Bitte erneut versuchen.' });
    }

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
