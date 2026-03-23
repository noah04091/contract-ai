/**
 * Legal Lens V2 API Routes
 *
 * Neue Endpoints für die Batch-Analyse und den interaktiven Vertrags-Explorer.
 * Ergänzt die bestehenden v1-Routes — bricht nichts.
 *
 * Endpoints:
 * - POST /v2/:contractId/analyze-all  → Batch-Analyse aller Klauseln (SSE)
 * - GET  /v2/:contractId/analyses     → Alle vorberechneten V2-Analysen
 * - GET  /v2/:contractId/status       → Batch-Analyse Status
 *
 * @version 1.0.0
 */

const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');
const rateLimit = require('express-rate-limit');

// Models
const ClauseAnalysis = require('../models/ClauseAnalysis');
const Contract = require('../models/Contract');

// Services
const { batchAnalyzer } = require('../services/legalLens');
const clauseAnalyzer = require('../services/legalLens/clauseAnalyzer');
const { findContractWithOrgAccessMongoose } = require('../utils/orgContractAccess');

// Rate Limiting für Batch-Analyse (weniger Requests, da teurer)
const batchAnalysisLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 Minuten
  max: 10, // 10 Batch-Analysen pro 15 Minuten
  message: {
    success: false,
    error: 'Zu viele Analyse-Anfragen. Bitte warten Sie einen Moment.',
    retryAfter: '15 minutes'
  },
  keyGenerator: (req) => req.user?.userId || req.ip
});

/**
 * POST /v2/:contractId/analyze-all
 *
 * Startet die Batch-Analyse ALLER Klauseln eines Vertrags.
 * Streamt Fortschritt via Server-Sent Events.
 *
 * Query-Params:
 * - industry: Branche (optional, default: 'general')
 *
 * SSE Events:
 * - event: start    → { contractId, totalClauses }
 * - event: progress → { completed, total, clauseId, analysis }
 * - event: error    → { clauseId, error }
 * - event: complete → { success, stats }
 */
router.post('/:contractId/analyze-all', batchAnalysisLimiter, async (req, res) => {
  const { contractId } = req.params;
  const userId = req.user.userId;
  const { industry = 'general' } = req.body;

  console.log(`🚀 [Legal Lens V2] Batch-Analyse gestartet für Vertrag: ${contractId}`);

  try {
    // Vertrag laden mit Org-Zugriff
    const access = await findContractWithOrgAccessMongoose(Contract, userId, contractId);
    if (!access) {
      return res.status(404).json({ success: false, error: 'Vertrag nicht gefunden' });
    }

    const contract = access.contract;

    // Prüfe ob vorbereitete Klauseln vorhanden sind
    const preParsedClauses = contract.legalLens?.preParsedClauses;
    if (!preParsedClauses || preParsedClauses.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Vertrag wurde noch nicht geparst. Bitte zuerst /api/legal-lens/parse aufrufen.'
      });
    }

    // SSE-Headers setzen
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no'
    });

    // Start-Event senden
    const analyzable = preParsedClauses.filter(c => !c.nonAnalyzable);
    res.write(`event: start\ndata: ${JSON.stringify({
      contractId,
      totalClauses: analyzable.length,
      totalParsed: preParsedClauses.length
    })}\n\n`);

    // Strukturierten Vertragskontext aufbauen für bessere Analyse
    const meta = [];
    if (contract.analysis?.contractType) meta.push(`Type: ${contract.analysis.contractType}`);
    if (contract.analysis?.parties?.provider) meta.push(`Provider: ${contract.analysis.parties.provider}`);
    if (contract.analysis?.parties?.customer) meta.push(`Customer: ${contract.analysis.parties.customer}`);
    if (contract.analysis?.keyTerms?.duration || contract.laufzeit) meta.push(`Duration: ${contract.analysis?.keyTerms?.duration || contract.laufzeit}`);
    if (contract.analysis?.keyTerms?.payment) meta.push(`Payment: ${contract.analysis.keyTerms.payment}`);
    if (contract.analysis?.keyTerms?.cancellation || contract.kuendigung) meta.push(`Cancellation: ${contract.analysis?.keyTerms?.cancellation || contract.kuendigung}`);
    if (contract.analysis?.keyTerms?.deliverables) meta.push(`Scope: ${contract.analysis.keyTerms.deliverables}`);

    const rawText = (contract.content || contract.extractedText || contract.fullText || '').substring(0, 800);
    const contractContext = meta.length > 0
      ? `[CONTRACT]\n${meta.join('\n')}\n\n[TEXT]\n${rawText}`
      : rawText;

    // Batch-Analyse starten
    const { results, stats } = await batchAnalyzer.analyzeAll({
      contractId: new ObjectId(contractId),
      userId: new ObjectId(userId),
      clauses: preParsedClauses,
      contractContext,
      industry,
      onProgress: (progress) => {
        try {
          res.write(`event: progress\ndata: ${JSON.stringify({
            completed: progress.completed,
            total: progress.total,
            clauseId: progress.clauseId,
            analysis: progress.analysis
          })}\n\n`);
        } catch (writeError) {
          // Client hat die Verbindung geschlossen
        }
      },
      onError: (error) => {
        try {
          res.write(`event: error\ndata: ${JSON.stringify({
            clauseId: error.clauseId,
            error: error.error
          })}\n\n`);
        } catch (writeError) {
          // Client hat die Verbindung geschlossen
        }
      }
    });

    // Complete-Event senden
    try {
      res.write(`event: complete\ndata: ${JSON.stringify({
        success: true,
        stats
      })}\n\n`);
    } catch (writeError) {
      // Client hat die Verbindung geschlossen
    }

    res.end();

  } catch (error) {
    console.error('❌ [Legal Lens V2] Batch-Analyse Fehler:', error.message);

    // Prüfe ob SSE-Headers bereits gesendet
    if (res.headersSent) {
      try {
        res.write(`event: error\ndata: ${JSON.stringify({
          error: 'Batch-Analyse fehlgeschlagen: ' + error.message
        })}\n\n`);
      } catch (writeError) {
        // Ignorieren
      }
      res.end();
    } else {
      res.status(500).json({
        success: false,
        error: 'Batch-Analyse fehlgeschlagen',
        details: error.message
      });
    }
  }
});


/**
 * GET /v2/:contractId/analyses
 *
 * Gibt alle vorberechneten V2-Analysen für einen Vertrag zurück.
 * Das Frontend ruft dies beim Laden auf — wenn alle da sind, ist jeder Klick sofort.
 *
 * Response:
 * {
 *   success: true,
 *   analyses: { clauseId: V2Analysis, ... },
 *   stats: { completed, total, high, medium, low },
 *   isComplete: boolean
 * }
 */
router.get('/:contractId/analyses', async (req, res) => {
  const { contractId } = req.params;
  const userId = req.user.userId;

  try {
    // Vertrag-Zugriff prüfen
    const access = await findContractWithOrgAccessMongoose(Contract, userId, contractId);
    if (!access) {
      return res.status(404).json({ success: false, error: 'Vertrag nicht gefunden' });
    }

    const contract = access.contract;
    const preParsedClauses = contract.legalLens?.preParsedClauses || [];
    const analyzableCount = preParsedClauses.filter(c => !c.nonAnalyzable).length;

    // Alle V2-Analysen laden
    const clauseAnalyses = await ClauseAnalysis.find(
      { contractId: new ObjectId(contractId), 'v2Analysis.analyzedAt': { $exists: true } },
      { clauseId: 1, v2Analysis: 1 }
    ).sort({ 'position.start': 1 });

    // Als Map aufbauen
    const analyses = {};
    let high = 0, medium = 0, low = 0;

    for (const ca of clauseAnalyses) {
      analyses[ca.clauseId] = ca.v2Analysis;

      switch (ca.v2Analysis.riskLevel) {
        case 'high': high++; break;
        case 'medium': medium++; break;
        case 'low': low++; break;
      }
    }

    const completed = clauseAnalyses.length;
    const isComplete = completed >= analyzableCount;

    res.json({
      success: true,
      analyses,
      stats: {
        completed,
        total: analyzableCount,
        high,
        medium,
        low,
        percentage: analyzableCount > 0 ? Math.round((completed / analyzableCount) * 100) : 0
      },
      isComplete
    });

  } catch (error) {
    console.error('❌ [Legal Lens V2] Analyses-Abruf Fehler:', error.message);
    res.status(500).json({
      success: false,
      error: 'Analysen konnten nicht geladen werden',
      details: error.message
    });
  }
});


/**
 * GET /v2/:contractId/status
 *
 * Gibt den aktuellen Batch-Analyse-Status zurück.
 * Leichtgewichtig — nur Counts, keine vollen Analysen.
 *
 * Response:
 * {
 *   success: true,
 *   status: 'complete' | 'partial' | 'pending',
 *   progress: { completed, total, percentage },
 *   riskSummary: { high, medium, low }
 * }
 */
router.get('/:contractId/status', async (req, res) => {
  const { contractId } = req.params;
  const userId = req.user.userId;

  try {
    // Vertrag-Zugriff prüfen
    const access = await findContractWithOrgAccessMongoose(Contract, userId, contractId);
    if (!access) {
      return res.status(404).json({ success: false, error: 'Vertrag nicht gefunden' });
    }

    const contract = access.contract;
    const preParsedClauses = contract.legalLens?.preParsedClauses || [];
    const analyzableCount = preParsedClauses.filter(c => !c.nonAnalyzable).length;

    const statusData = await batchAnalyzer.getStatus(
      new ObjectId(contractId),
      analyzableCount
    );

    res.json({
      success: true,
      ...statusData
    });

  } catch (error) {
    console.error('❌ [Legal Lens V2] Status-Abruf Fehler:', error.message);
    res.status(500).json({
      success: false,
      error: 'Status konnte nicht abgerufen werden',
      details: error.message
    });
  }
});


/**
 * POST /v2/:contractId/simulate-clause
 *
 * Simuliert die Auswirkungen einer Klausel-Änderung.
 * Vergleicht Original mit modifizierter Version.
 *
 * Body: { originalClause, modifiedClause, industry? }
 */
router.post('/:contractId/simulate-clause', async (req, res) => {
  const { contractId } = req.params;
  const userId = req.user.userId;
  const { originalClause, modifiedClause, industry = 'general' } = req.body;

  if (!originalClause || !modifiedClause) {
    return res.status(400).json({
      success: false,
      error: 'originalClause und modifiedClause sind erforderlich'
    });
  }

  if (modifiedClause.length > 15000 || originalClause.length > 15000) {
    return res.status(400).json({
      success: false,
      error: 'Klauseln dürfen maximal 15.000 Zeichen lang sein'
    });
  }

  try {
    // Vertrag-Zugriff prüfen
    const access = await findContractWithOrgAccessMongoose(Contract, userId, contractId);
    if (!access) {
      return res.status(404).json({ success: false, error: 'Vertrag nicht gefunden' });
    }

    const contract = access.contract;
    const contractContext = (contract.content || contract.extractedText || contract.fullText || '')
      .substring(0, 800);

    const simulation = await clauseAnalyzer.simulateClause(
      originalClause,
      modifiedClause,
      contractContext,
      { industry }
    );

    res.json({
      success: true,
      simulation
    });

  } catch (error) {
    console.error('❌ [Legal Lens V2] Simulation Fehler:', error.message);
    res.status(500).json({
      success: false,
      error: 'Simulation fehlgeschlagen',
      details: error.message
    });
  }
});


/**
 * POST /v2/:contractId/rewrite-clause
 *
 * Formuliert eine Klausel anhand einer Anweisung um (Quick-Actions im Simulator).
 *
 * Body: { clause, instruction, industry? }
 */
router.post('/:contractId/rewrite-clause', async (req, res) => {
  const { contractId } = req.params;
  const userId = req.user.userId;
  const { clause, instruction, industry = 'general' } = req.body;

  if (!clause || !instruction) {
    return res.status(400).json({
      success: false,
      error: 'clause und instruction sind erforderlich'
    });
  }

  if (clause.length > 15000) {
    return res.status(400).json({
      success: false,
      error: 'Klausel darf maximal 15.000 Zeichen lang sein'
    });
  }

  try {
    const access = await findContractWithOrgAccessMongoose(Contract, userId, contractId);
    if (!access) {
      return res.status(404).json({ success: false, error: 'Vertrag nicht gefunden' });
    }

    const contract = access.contract;
    const contractContext = (contract.content || contract.extractedText || contract.fullText || '')
      .substring(0, 500);

    const result = await clauseAnalyzer.rewriteClause(
      clause,
      instruction,
      contractContext,
      { industry }
    );

    res.json({
      success: true,
      rewrittenClause: result.rewrittenClause
    });

  } catch (error) {
    console.error('❌ [Legal Lens V2] Rewrite Fehler:', error.message);
    res.status(500).json({
      success: false,
      error: 'Umformulierung fehlgeschlagen',
      details: error.message
    });
  }
});


module.exports = router;
