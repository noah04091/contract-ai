// 📁 backend/routes/campaignTracking.js
// ÖFFENTLICHE Tracking-Endpoints (keine Auth nötig — Token ist die Auth).
// Rate-Limits implizit durch Token-Validation (ungültige Token → 404).

const express = require('express');
const router = express.Router();
const {
  verifyTrackingToken,
  recordOpen,
  recordClick,
  ensureIndexes,
  TRANSPARENT_GIF
} = require('../services/campaignTrackingService');

// GET /api/track/open/:token — Tracking-Pixel
router.get('/open/:token', async (req, res) => {
  // Indizes lazy anlegen (erster Request)
  ensureIndexes().catch(() => {});

  const decoded = verifyTrackingToken(req.params.token);
  // Immer Pixel zurückgeben (auch bei ungültigem Token), damit Mail-Client nicht hängt.
  // Logging nur bei gültigem Token.
  if (decoded && decoded.t === 'o' && decoded.c && decoded.r) {
    recordOpen(decoded.c, decoded.r).catch(() => {});
  }

  res.setHeader('Content-Type', 'image/gif');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.send(TRANSPARENT_GIF);
});

// GET /api/track/click/:token?u=<encoded-url> — Redirect mit Tracking
router.get('/click/:token', async (req, res) => {
  ensureIndexes().catch(() => {});

  const decoded = verifyTrackingToken(req.params.token);
  const targetUrl = req.query.u ? String(req.query.u) : '';

  // URL-Whitelist: nur https:// erlauben
  if (!targetUrl || !/^https:\/\//i.test(targetUrl)) {
    return res.status(400).send('Invalid URL');
  }

  if (decoded && decoded.t === 'c' && decoded.c && decoded.r) {
    recordClick(decoded.c, decoded.r, targetUrl).catch(() => {});
  }

  res.redirect(302, targetUrl);
});

module.exports = router;
