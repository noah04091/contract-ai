// backend/routes/quickLint.js
// API für Klausel-Schnellbewertung im Generate-Step-3 (nach Vertragserstellung).
// Reuses: services/quickLintAnalyzer.js (welcher wiederum clauseParser + GPT-4o nutzt).

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { ObjectId } = require('mongodb');

const verifyToken = require('../middleware/verifyToken');
const requirePremium = require('../middleware/requirePremium');
const database = require('../config/database');
const { analyzeClauses } = require('../services/quickLintAnalyzer');

// Stabiler Hash für Cache-Invalidierung: 16-char md5 von normalisiertem Text.
// Gleiches Pattern wie clauseParser.generateHash + batchAnalyzer (DRY).
function hashContractText(text) {
  return crypto
    .createHash('md5')
    .update((text || '').toLowerCase().trim())
    .digest('hex')
    .substring(0, 16);
}

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

    // Cache-Check: nur HIT wenn force=false UND alte Bewertung existiert UND
    // der Text seit der letzten Bewertung unverändert ist (Hash-Match).
    // So bekommt der User automatisch eine frische Bewertung, sobald er den
    // Vertragstext editiert hat — ohne manuell "Neu prüfen" klicken zu müssen.
    const currentHash = hashContractText(contractText);
    const cachedHash = contract.clauseAssessmentTextHash;
    const cacheValid = !force
      && contract.clauseAssessment
      && contract.clauseAssessment.clauses
      && cachedHash === currentHash;

    if (cacheValid) {
      console.log(`[QuickLint] Cache-Hit für ${contractId} (hash=${currentHash})`);
      return res.json({
        ...contract.clauseAssessment,
        fromCache: true
      });
    }

    // Neuer Run
    if (cachedHash && cachedHash !== currentHash) {
      console.log(`[QuickLint] Text geändert (cache=${cachedHash} → current=${currentHash}) — frische Bewertung`);
    } else {
      console.log(`[QuickLint] Analysiere ${contractId} (${contractType || 'unknown'})`);
    }
    const result = await analyzeClauses(contractText, contractType || contract.contractType || 'individuell');

    // Persistieren — bei Fehlern hier nicht blockieren, das Resultat geht trotzdem raus
    try {
      await contracts.updateOne(
        { _id: new ObjectId(contractId) },
        { $set: {
            clauseAssessment: result,
            clauseAssessmentTextHash: currentHash,
            clauseAssessmentUpdatedAt: new Date()
          }
        }
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
