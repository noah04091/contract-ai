// backend/routes/quickLint.js
// API für Klausel-Schnellbewertung im Generate-Step-3 (nach Vertragserstellung).
// Reuses: services/quickLintAnalyzer.js (welcher wiederum clauseParser + GPT-4o nutzt).

const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');

const verifyToken = require('../middleware/verifyToken');
const requirePremium = require('../middleware/requirePremium');
const database = require('../config/database');
const { analyzeClauses } = require('../services/quickLintAnalyzer');

/**
 * POST /api/quickLint/analyze/:contractId
 *
 * Bewertet alle Klauseln eines bereits erstellten Vertrags juristisch.
 * Persistiert das Ergebnis im contracts-Dokument unter `clauseAssessment`
 * für späteres Wieder-Aufrufen ohne erneuten GPT-Call.
 *
 * Auth: requireBusiness (über requirePremium — Business + Enterprise).
 *
 * Body: { contractText: string, contractType: string, force?: boolean }
 *   - force=true erzwingt Neu-Bewertung auch wenn schon eine im DB liegt.
 */
router.post('/analyze/:contractId', verifyToken, requirePremium, async (req, res) => {
  const { contractId } = req.params;
  const { contractText, contractType, force = false } = req.body || {};

  if (!contractId || !ObjectId.isValid(contractId)) {
    return res.status(400).json({ success: false, error: 'Ungültige contractId' });
  }
  if (!contractText || typeof contractText !== 'string' || contractText.trim().length < 50) {
    return res.status(400).json({ success: false, error: 'Vertragstext ist zu kurz oder fehlt.' });
  }

  try {
    const db = await database.connect();
    const contracts = db.collection('contracts');

    // userId kann String ODER ObjectId sein — $or für Robustheit
    const userIdFilter = {
      $or: [
        { userId: req.user.userId },
        { userId: new ObjectId(req.user.userId) }
      ]
    };

    // Vertrag laden + Berechtigungs-Check
    const contract = await contracts.findOne({
      _id: new ObjectId(contractId),
      ...userIdFilter
    });

    if (!contract) {
      return res.status(404).json({ success: false, error: 'Vertrag nicht gefunden oder kein Zugriff.' });
    }

    // Cache-Check: Wenn schon eine Bewertung existiert UND force=false → direkt zurückgeben
    if (!force && contract.clauseAssessment && contract.clauseAssessment.clauses) {
      console.log(`[QuickLint] Cache-Hit für ${contractId}`);
      return res.json({
        ...contract.clauseAssessment,
        fromCache: true
      });
    }

    // Neuer Run
    console.log(`[QuickLint] Analysiere ${contractId} (${contractType || 'unknown'})`);
    const result = await analyzeClauses(contractText, contractType || contract.contractType || 'individuell');

    // Persistieren — bei Fehlern hier nicht blockieren, das Resultat geht trotzdem raus
    try {
      await contracts.updateOne(
        { _id: new ObjectId(contractId) },
        { $set: { clauseAssessment: result, clauseAssessmentUpdatedAt: new Date() } }
      );
    } catch (persistErr) {
      console.warn('[QuickLint] Persistenz fehlgeschlagen (non-blocking):', persistErr.message);
    }

    res.json({ ...result, fromCache: false });
  } catch (err) {
    console.error('[QuickLint] Fehler bei Klausel-Bewertung:', err);
    res.status(500).json({
      success: false,
      error: 'Klausel-Bewertung gerade nicht verfügbar. Bitte erneut versuchen.',
      detail: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

module.exports = router;
