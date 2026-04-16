// 📁 backend/services/campaignTrackingService.js
// Tracking-Logik für Campaign-Events (Opens + Clicks).
// Tokens sind JWT-signiert mit JWT_SECRET, 1 Jahr gültig.

const jwt = require('jsonwebtoken');
const { ObjectId } = require('mongodb');
const database = require('../config/database');

const TOKEN_TTL_SECONDS = 365 * 24 * 60 * 60; // 1 Jahr

// 1x1 transparentes GIF (43 bytes) — kompatibel mit allen Mail-Clients
const TRANSPARENT_GIF = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
);

function generateOpenToken(campaignId, recipientId) {
  return jwt.sign(
    { c: String(campaignId), r: String(recipientId), t: 'o' },
    process.env.JWT_SECRET,
    { expiresIn: TOKEN_TTL_SECONDS }
  );
}

function generateClickToken(campaignId, recipientId) {
  return jwt.sign(
    { c: String(campaignId), r: String(recipientId), t: 'c' },
    process.env.JWT_SECRET,
    { expiresIn: TOKEN_TTL_SECONDS }
  );
}

function verifyTrackingToken(token) {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded || !decoded.c || !decoded.r) return null;
    return decoded;
  } catch {
    return null;
  }
}

/**
 * Markiert eine Open-Event.
 * - Erste Öffnung: setzt openedAt und zählt unique.
 * - Weitere Öffnungen: inkrementiert openCount.
 * - Idempotent: Fehler werden geschluckt, nie Crash.
 */
async function recordOpen(campaignId, recipientId) {
  try {
    const db = await database.connect();
    const _campaignId = new ObjectId(campaignId);
    const _recipientId = new ObjectId(recipientId);

    const now = new Date();
    const recipient = await db.collection('campaign_recipients').findOne(
      { _id: _recipientId, campaignId: _campaignId },
      { projection: { openedAt: 1 } }
    );

    if (!recipient) return { ok: false };

    const isFirstOpen = !recipient.openedAt;

    await db.collection('campaign_recipients').updateOne(
      { _id: _recipientId },
      {
        $set: isFirstOpen ? { openedAt: now } : {},
        $inc: { openCount: 1 }
      }
    );

    // Event-Log für Audit
    await db.collection('campaign_events').insertOne({
      campaignId: _campaignId,
      recipientId: _recipientId,
      type: 'open',
      isFirstOpen,
      timestamp: now
    });

    // Stats der Campaign aktualisieren
    if (isFirstOpen) {
      await db.collection('email_campaigns').updateOne(
        { _id: _campaignId },
        { $inc: { 'stats.uniqueOpens': 1, 'stats.opens': 1 } }
      );
    } else {
      await db.collection('email_campaigns').updateOne(
        { _id: _campaignId },
        { $inc: { 'stats.opens': 1 } }
      );
    }

    return { ok: true, firstOpen: isFirstOpen };
  } catch (err) {
    console.error('[campaignTracking] recordOpen failed:', err && err.message);
    return { ok: false };
  }
}

/**
 * Markiert eine Click-Event (für Commit 3D vorbereitet).
 */
async function recordClick(campaignId, recipientId, url) {
  try {
    const db = await database.connect();
    const _campaignId = new ObjectId(campaignId);
    const _recipientId = new ObjectId(recipientId);

    const now = new Date();
    const recipient = await db.collection('campaign_recipients').findOne(
      { _id: _recipientId, campaignId: _campaignId },
      { projection: { firstClickAt: 1 } }
    );

    if (!recipient) return { ok: false };

    const isFirstClick = !recipient.firstClickAt;

    await db.collection('campaign_recipients').updateOne(
      { _id: _recipientId },
      {
        $set: isFirstClick ? { firstClickAt: now, firstClickUrl: url } : {},
        $inc: { clickCount: 1 }
      }
    );

    await db.collection('campaign_events').insertOne({
      campaignId: _campaignId,
      recipientId: _recipientId,
      type: 'click',
      url,
      isFirstClick,
      timestamp: now
    });

    if (isFirstClick) {
      await db.collection('email_campaigns').updateOne(
        { _id: _campaignId },
        { $inc: { 'stats.uniqueClicks': 1, 'stats.clicks': 1 } }
      );
    } else {
      await db.collection('email_campaigns').updateOne(
        { _id: _campaignId },
        { $inc: { 'stats.clicks': 1 } }
      );
    }

    return { ok: true, firstClick: isFirstClick };
  } catch (err) {
    console.error('[campaignTracking] recordClick failed:', err && err.message);
    return { ok: false };
  }
}

/**
 * Indizes anlegen (idempotent, lazy).
 */
let indexesEnsured = false;
async function ensureIndexes() {
  if (indexesEnsured) return;
  try {
    const db = await database.connect();
    await Promise.all([
      db.collection('campaign_events').createIndex({ campaignId: 1, type: 1, timestamp: -1 }),
      db.collection('campaign_events').createIndex({ recipientId: 1 })
    ]);
    indexesEnsured = true;
  } catch (err) {
    console.warn('[campaignTracking] Index creation skipped:', err.message);
  }
}

module.exports = {
  generateOpenToken,
  generateClickToken,
  verifyTrackingToken,
  recordOpen,
  recordClick,
  ensureIndexes,
  TRANSPARENT_GIF
};
