// backend/routes/email.js
// API-Endpoints fuer E-Mail-Management (Unsubscribe, Bounce-Stats, etc.)

const express = require("express");
const router = express.Router();
const {
  EMAIL_CATEGORIES,
  validateUnsubscribeToken,
  recordUnsubscribe,
  isUnsubscribed,
  resubscribe,
  getUnsubscribeStats
} = require("../services/emailUnsubscribeService");
const { getBounceStats, reactivateEmail } = require("../services/emailBounceService");

// Middleware fuer optionale Authentifizierung
const optionalAuth = (req, res, next) => {
  const token = req.cookies?.token || req.headers.authorization?.replace("Bearer ", "");
  if (token) {
    try {
      const jwt = require("jsonwebtoken");
      req.user = jwt.verify(token, process.env.JWT_SECRET);
    } catch (e) {
      // Token ungueltig - kein Problem, User bleibt anonym
    }
  }
  next();
};

// ===================================================================
// UNSUBSCRIBE ENDPOINTS
// ===================================================================

/**
 * GET /api/email/unsubscribe
 * Verarbeitet Unsubscribe-Link aus E-Mail
 * Query: ?token=xxx
 */
router.get("/unsubscribe", optionalAuth, async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: "Kein Abmelde-Token angegeben"
      });
    }

    // Token validieren
    const decoded = validateUnsubscribeToken(token);
    if (!decoded) {
      return res.status(400).json({
        success: false,
        error: "Ungueltiger oder abgelaufener Abmelde-Link. Bitte nutze den Link aus einer aktuellen E-Mail."
      });
    }

    // Bereits abgemeldet?
    const alreadyUnsubscribed = await isUnsubscribed(req.db, decoded.email, decoded.category);
    if (alreadyUnsubscribed) {
      return res.json({
        success: true,
        message: "Du bist bereits von diesen E-Mails abgemeldet.",
        email: decoded.email,
        category: decoded.category
      });
    }

    // Abmeldung durchfuehren
    await recordUnsubscribe(req.db, decoded.email, decoded.category, {
      ipAddress: req.ip,
      userAgent: req.get("User-Agent"),
      method: "link",
      source: "email"
    });

    res.json({
      success: true,
      message: "Du wurdest erfolgreich von E-Mail-Benachrichtigungen abgemeldet.",
      email: decoded.email,
      category: decoded.category
    });

  } catch (error) {
    console.error("Unsubscribe Error:", error);
    res.status(500).json({
      success: false,
      error: "Fehler bei der Abmeldung"
    });
  }
});

/**
 * POST /api/email/unsubscribe-oneclick
 * RFC 8058 One-Click Unsubscribe fuer E-Mail-Clients
 */
router.post("/unsubscribe-oneclick", async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).send("Bad Request");
    }

    const decoded = validateUnsubscribeToken(token);
    if (!decoded) {
      return res.status(400).send("Invalid Token");
    }

    await recordUnsubscribe(req.db, decoded.email, decoded.category, {
      method: "oneclick",
      source: "email_client"
    });

    // RFC 8058: Einfache Bestaetigung
    res.status(200).send("Unsubscribed");

  } catch (error) {
    console.error("One-Click Unsubscribe Error:", error);
    res.status(500).send("Error");
  }
});

/**
 * GET /api/email/unsubscribe-oneclick
 * Fallback fuer E-Mail-Clients die GET verwenden
 */
router.get("/unsubscribe-oneclick", async (req, res) => {
  // Redirect zu normaler Unsubscribe-Seite
  const { token } = req.query;
  const frontendUrl = process.env.FRONTEND_URL || "https://www.contract-ai.de";
  res.redirect(`${frontendUrl}/abmelden?token=${encodeURIComponent(token)}`);
});

/**
 * POST /api/email/resubscribe
 * Erneute Anmeldung fuer E-Mails
 */
router.post("/resubscribe", optionalAuth, async (req, res) => {
  try {
    const { email, category } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: "E-Mail-Adresse erforderlich"
      });
    }

    await resubscribe(req.db, email, category || EMAIL_CATEGORIES.ALL);

    res.json({
      success: true,
      message: "Du wurdest erfolgreich fuer E-Mail-Benachrichtigungen angemeldet."
    });

  } catch (error) {
    console.error("Resubscribe Error:", error);
    res.status(500).json({
      success: false,
      error: "Fehler bei der Anmeldung"
    });
  }
});

/**
 * GET /api/email/preferences
 * Holt E-Mail-Praeferenzen eines Users
 */
router.get("/preferences", optionalAuth, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: "Authentifizierung erforderlich"
      });
    }

    const { ObjectId } = require("mongodb");
    const user = await req.db.collection("users").findOne(
      { _id: new ObjectId(req.user.userId) },
      { projection: { email: 1, emailOptOut: 1, emailPreferences: 1, emailDigestMode: 1 } }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User nicht gefunden"
      });
    }

    res.json({
      success: true,
      email: user.email,
      optedOut: user.emailOptOut || false,
      digestMode: user.emailDigestMode || "instant",
      preferences: user.emailPreferences || {
        calendar: true,
        marketing: true,
        product_updates: true
      },
      categories: Object.entries(EMAIL_CATEGORIES)
        .filter(([key]) => key !== "SECURITY" && key !== "ALL")
        .map(([key, value]) => ({
          id: value,
          name: key,
          description: getCategoryDescription(value)
        }))
    });

  } catch (error) {
    console.error("Get Preferences Error:", error);
    res.status(500).json({
      success: false,
      error: "Fehler beim Abrufen der Einstellungen"
    });
  }
});

/**
 * PUT /api/email/preferences
 * Aktualisiert E-Mail-Praeferenzen
 */
router.put("/preferences", optionalAuth, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: "Authentifizierung erforderlich"
      });
    }

    const { preferences, optedOut } = req.body;
    const { ObjectId } = require("mongodb");

    const updateData = {
      emailPreferencesUpdatedAt: new Date()
    };

    if (typeof optedOut === "boolean") {
      updateData.emailOptOut = optedOut;
    }

    if (preferences && typeof preferences === "object") {
      // Nur erlaubte Kategorien aktualisieren
      const allowedCategories = [EMAIL_CATEGORIES.CALENDAR, EMAIL_CATEGORIES.MARKETING, EMAIL_CATEGORIES.PRODUCT_UPDATES];
      for (const [key, value] of Object.entries(preferences)) {
        if (allowedCategories.includes(key) && typeof value === "boolean") {
          updateData[`emailPreferences.${key}`] = value;
        }
      }
    }

    await req.db.collection("users").updateOne(
      { _id: new ObjectId(req.user.userId) },
      { $set: updateData }
    );

    res.json({
      success: true,
      message: "E-Mail-Einstellungen gespeichert"
    });

  } catch (error) {
    console.error("Update Preferences Error:", error);
    res.status(500).json({
      success: false,
      error: "Fehler beim Speichern der Einstellungen"
    });
  }
});

// ===================================================================
// ADMIN ENDPOINTS (nur fuer Statistiken)
// ===================================================================

/**
 * GET /api/email/stats
 * E-Mail-Statistiken (Bounces, Unsubscribes)
 */
router.get("/stats", optionalAuth, async (req, res) => {
  try {
    // Einfache Admin-Pruefung (kann spaeter erweitert werden)
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: "Authentifizierung erforderlich"
      });
    }

    const days = parseInt(req.query.days) || 30;

    const [bounceStats, unsubStats] = await Promise.all([
      getBounceStats(req.db, days),
      getUnsubscribeStats(req.db, days)
    ]);

    res.json({
      success: true,
      period: `${days} Tage`,
      bounces: bounceStats,
      unsubscribes: unsubStats
    });

  } catch (error) {
    console.error("Get Stats Error:", error);
    res.status(500).json({
      success: false,
      error: "Fehler beim Abrufen der Statistiken"
    });
  }
});

// ===================================================================
// HELPER FUNCTIONS
// ===================================================================

function getCategoryDescription(category) {
  const descriptions = {
    calendar: "Erinnerungen zu Vertragsfristen und Kuendigungsterminen",
    marketing: "Neuigkeiten, Angebote und Tipps",
    product_updates: "Updates zu neuen Features und Verbesserungen",
    security: "Wichtige Sicherheitsbenachrichtigungen (nicht abbestellbar)"
  };
  return descriptions[category] || "";
}

module.exports = router;
