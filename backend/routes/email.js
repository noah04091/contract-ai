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
// TEST ENDPOINT (nur fuer Entwicklung)
// ===================================================================

/**
 * POST /api/email/test
 * Sendet Test-E-Mails verschiedener Typen
 * Body: { email: "test@example.com", type: "calendar|digest|reminder|all" }
 */
router.post("/test", async (req, res) => {
  try {
    const { email, type = "all" } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: "E-Mail-Adresse erforderlich"
      });
    }

    const nodemailer = require("nodemailer");
    const { generateEmailTemplate, generateInfoBox, generateAlertBox, generateActionBox } = require("../utils/emailTemplate");
    const { generateUnsubscribeUrl, getUnsubscribeHeaders } = require("../services/emailUnsubscribeService");

    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    const unsubscribeUrl = generateUnsubscribeUrl(email, "calendar");
    const unsubHeaders = {};
    const results = [];

    // ========== TYP 0: MINIMAL TEST (Plain Text) ==========
    if (type === "minimal") {
      await transporter.sendMail({
        from: process.env.EMAIL_FROM || "Contract AI <no-reply@contract-ai.de>",
        to: email,
        subject: "Erinnerung: Vertragsfrist",
        text: "Hallo,\n\ndies ist eine Erinnerung an eine bevorstehende Vertragsfrist.\n\nMit freundlichen Gruessen\nContract AI"
      });
      return res.json({
        success: true,
        message: "Minimal-Test gesendet (Plain Text)",
        types: ["minimal"]
      });
    }

    // ========== TYP: SIMPLE HTML (sauberes HTML ohne viel Styling) ==========
    if (type === "simple") {
      const simpleHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
</head>
<body style="font-family: Arial, sans-serif; padding: 20px;">
  <h2>Erinnerung: Telekom Mobilfunk</h2>
  <p>Hallo,</p>
  <p>in 14 Tagen beginnt das Kuendigungsfenster fuer deinen Vertrag.</p>
  <p><strong>Kuendigungsfrist:</strong> 3 Monate zum Vertragsende</p>
  <p><strong>Vertragsende:</strong> 31.03.2025</p>
  <p>Wenn du nicht kuendigst, verlaengert sich der Vertrag automatisch.</p>
  <p>Mit freundlichen Gruessen<br>Contract AI</p>
</body>
</html>`;

      await transporter.sendMail({
        from: process.env.EMAIL_FROM || "Contract AI <no-reply@contract-ai.de>",
        to: email,
        subject: "Erinnerung: Telekom Mobilfunk - Kuendigungsfrist in 14 Tagen",
        html: simpleHtml
      });
      return res.json({
        success: true,
        message: "Simple HTML Test gesendet",
        types: ["simple"]
      });
    }

    // ========== TYP: CLEAN3 - Aufgewertetes Clean ohne Spam-Risiko ==========
    if (type === "clean3") {
      const clean3Html = `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f0f4f8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f0f4f8; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden;">

          <!-- Blauer Akzent-Streifen oben -->
          <tr>
            <td style="height: 4px; background-color: #3b82f6;"></td>
          </tr>

          <!-- Header -->
          <tr>
            <td style="padding: 28px 40px 24px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <span style="font-size: 22px; font-weight: 700; color: #1e293b; letter-spacing: -0.5px;">Contract AI</span>
                  </td>
                  <td align="right">
                    <span style="display: inline-block; padding: 6px 12px; background-color: #dbeafe; color: #1d4ed8; font-size: 11px; font-weight: 600; border-radius: 4px; text-transform: uppercase; letter-spacing: 0.5px;">Erinnerung</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Trennlinie -->
          <tr>
            <td style="padding: 0 40px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr><td style="border-bottom: 1px solid #e2e8f0;"></td></tr>
              </table>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 32px 40px 40px 40px;">
              <h1 style="margin: 0 0 8px 0; font-size: 24px; color: #0f172a; font-weight: 700; line-height: 1.3;">
                Kündigungsfrist in 14 Tagen
              </h1>
              <p style="margin: 0 0 28px 0; font-size: 15px; color: #64748b;">
                Telekom Mobilfunk
              </p>

              <p style="margin: 0 0 28px 0; font-size: 15px; line-height: 1.7; color: #334155;">
                Hallo,<br><br>
                dein Vertrag kann bald gekündigt werden. Hier sind die wichtigen Details auf einen Blick:
              </p>

              <!-- Info Box mit linkem Akzent -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 28px;">
                <tr>
                  <td style="background-color: #f8fafc; border-radius: 8px; border-left: 3px solid #3b82f6;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding: 20px 24px;">
                          <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="padding-bottom: 16px;">
                                <p style="margin: 0 0 2px 0; font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Kündigungsfrist</p>
                                <p style="margin: 0; font-size: 17px; color: #0f172a; font-weight: 600;">3 Monate zum Vertragsende</p>
                              </td>
                            </tr>
                            <tr>
                              <td style="border-top: 1px solid #e2e8f0; padding-top: 16px;">
                                <p style="margin: 0 0 2px 0; font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Vertragsende</p>
                                <p style="margin: 0; font-size: 17px; color: #0f172a; font-weight: 600;">31. März 2025</p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 32px 0; font-size: 14px; line-height: 1.6; color: #64748b;">
                Ohne Kündigung verlängert sich der Vertrag automatisch um weitere 12 Monate.
              </p>

              <!-- Button -->
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background-color: #3b82f6; border-radius: 8px;">
                    <a href="https://www.contract-ai.de/contracts" style="display: inline-block; padding: 14px 32px; color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 600;">
                      Vertrag anzeigen
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 0 40px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr><td style="border-top: 1px solid #e2e8f0;"></td></tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 40px 28px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #1e293b;">Contract AI</p>
                    <p style="margin: 0 0 12px 0; font-size: 13px; color: #64748b; line-height: 1.5;">
                      Intelligentes Vertragsmanagement
                    </p>
                    <p style="margin: 0; font-size: 12px;">
                      <a href="https://www.contract-ai.de" style="color: #3b82f6; text-decoration: none; font-weight: 500;">Website</a>
                      <span style="color: #cbd5e1; margin: 0 10px;">|</span>
                      <a href="https://www.contract-ai.de/datenschutz" style="color: #64748b; text-decoration: none;">Datenschutz</a>
                      <span style="color: #cbd5e1; margin: 0 10px;">|</span>
                      <a href="https://www.contract-ai.de/impressum" style="color: #64748b; text-decoration: none;">Impressum</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

      await transporter.sendMail({
        from: process.env.EMAIL_FROM || "Contract AI <no-reply@contract-ai.de>",
        to: email,
        subject: "Erinnerung: Telekom Mobilfunk - Kündigungsfrist in 14 Tagen",
        html: clean3Html
      });
      return res.json({
        success: true,
        message: "Clean3 Template Test gesendet",
        types: ["clean3"]
      });
    }

    // ========== TYP: CLEAN2 - Clean + kleine Verbesserungen ==========
    if (type === "clean2") {
      const clean2Html = `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px;">

          <!-- Header -->
          <tr>
            <td style="padding: 30px 40px; border-bottom: 1px solid #eee;">
              <span style="font-size: 20px; font-weight: 600; color: #1e293b;">Contract AI</span>
              <span style="font-size: 13px; color: #64748b; margin-left: 12px;">Vertragsmanagement</span>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 8px 0; font-size: 13px; color: #3b82f6; font-weight: 500;">ERINNERUNG</p>
              <h1 style="margin: 0 0 20px 0; font-size: 22px; color: #1e293b; font-weight: 600;">
                Kuendigungsfrist in 14 Tagen
              </h1>

              <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.6; color: #475569;">
                Hallo,<br><br>
                dein Vertrag <strong>Telekom Mobilfunk</strong> kann bald gekuendigt werden.
              </p>

              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border-radius: 8px; margin: 0 0 24px 0;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0 0 4px 0; font-size: 13px; color: #64748b;">Kuendigungsfrist</p>
                    <p style="margin: 0 0 16px 0; font-size: 16px; color: #1e293b; font-weight: 600;">3 Monate zum Vertragsende</p>
                    <p style="margin: 0 0 4px 0; font-size: 13px; color: #64748b;">Vertragsende</p>
                    <p style="margin: 0; font-size: 16px; color: #1e293b; font-weight: 600;">31. Maerz 2025</p>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 28px 0; font-size: 14px; line-height: 1.6; color: #64748b;">
                Ohne Kuendigung verlaengert sich der Vertrag automatisch um weitere 12 Monate.
              </p>

              <a href="https://www.contract-ai.de/contracts" style="display: inline-block; padding: 12px 24px; background-color: #3b82f6; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 15px; font-weight: 500;">
                Vertrag anzeigen
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background-color: #f8fafc; border-top: 1px solid #eee; border-radius: 0 0 8px 8px;">
              <p style="margin: 0; font-size: 13px; color: #64748b; text-align: center;">
                Contract AI - <a href="https://www.contract-ai.de" style="color: #3b82f6; text-decoration: none;">www.contract-ai.de</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

      await transporter.sendMail({
        from: process.env.EMAIL_FROM || "Contract AI <no-reply@contract-ai.de>",
        to: email,
        subject: "Erinnerung: Telekom Mobilfunk - Kuendigungsfrist in 14 Tagen",
        html: clean2Html
      });
      return res.json({
        success: true,
        message: "Clean2 Template Test gesendet",
        types: ["clean2"]
      });
    }

    // ========== TYP: MEDIUM - Zwischen clean und premium ==========
    if (type === "medium") {
      const mediumHtml = `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px;">

          <!-- Header -->
          <tr>
            <td style="padding: 28px 40px; background-color: #1e3a5f; border-radius: 12px 12px 0 0;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <span style="font-size: 22px; font-weight: 700; color: #ffffff;">Contract AI</span>
                  </td>
                  <td align="right">
                    <span style="font-size: 12px; color: #94a3b8;">Vertragsmanagement</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 36px 40px;">
              <p style="margin: 0 0 6px 0; font-size: 13px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Erinnerung</p>
              <h1 style="margin: 0 0 24px 0; font-size: 24px; color: #1e293b; font-weight: 700;">
                Kuendigungsfrist in 14 Tagen
              </h1>

              <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.7; color: #475569;">
                Hallo,<br><br>
                dein Vertrag <strong style="color: #1e293b;">Telekom Mobilfunk</strong> kann bald gekuendigt werden.
              </p>

              <!-- Info Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border-radius: 8px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 20px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td width="50%">
                          <p style="margin: 0 0 4px 0; font-size: 12px; color: #64748b;">Kuendigungsfrist</p>
                          <p style="margin: 0; font-size: 16px; color: #1e293b; font-weight: 600;">3 Monate zum Vertragsende</p>
                        </td>
                        <td width="50%">
                          <p style="margin: 0 0 4px 0; font-size: 12px; color: #64748b;">Vertragsende</p>
                          <p style="margin: 0; font-size: 16px; color: #1e293b; font-weight: 600;">31. Maerz 2025</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 28px 0; font-size: 14px; line-height: 1.6; color: #64748b;">
                Ohne Kuendigung verlaengert sich der Vertrag automatisch um weitere 12 Monate.
              </p>

              <a href="https://www.contract-ai.de/contracts" style="display: inline-block; padding: 14px 28px; background-color: #3b82f6; color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 15px; font-weight: 600;">
                Vertrag anzeigen
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; border-radius: 0 0 12px 12px;">
              <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #1e293b;">Contract AI</p>
              <p style="margin: 0; font-size: 13px; color: #64748b;">
                <a href="https://www.contract-ai.de" style="color: #3b82f6; text-decoration: none;">Website</a>
                <span style="color: #cbd5e1; margin: 0 8px;">|</span>
                <a href="https://www.contract-ai.de/datenschutz" style="color: #64748b; text-decoration: none;">Datenschutz</a>
                <span style="color: #cbd5e1; margin: 0 8px;">|</span>
                <a href="https://www.contract-ai.de/impressum" style="color: #64748b; text-decoration: none;">Impressum</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

      await transporter.sendMail({
        from: process.env.EMAIL_FROM || "Contract AI <no-reply@contract-ai.de>",
        to: email,
        subject: "Erinnerung: Telekom Mobilfunk - Kuendigungsfrist in 14 Tagen",
        html: mediumHtml
      });
      return res.json({
        success: true,
        message: "Medium Template Test gesendet",
        types: ["medium"]
      });
    }

    // ========== TYP: PREMIUM - Hochwertig und Spam-sicher ==========
    if (type === "premium") {
      const premiumHtml = `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f0f4f8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f0f4f8;">
    <tr>
      <td style="padding: 40px 20px;">
        <table width="600" cellpadding="0" cellspacing="0" align="center" style="background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">

          <!-- Header mit Logo -->
          <tr>
            <td style="padding: 32px 40px; background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); border-radius: 16px 16px 0 0;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <span style="font-size: 24px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">Contract AI</span>
                  </td>
                  <td align="right">
                    <span style="font-size: 13px; color: rgba(255,255,255,0.7);">Vertragsmanagement</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Notification Badge -->
          <tr>
            <td style="padding: 0 40px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: -20px;">
                <tr>
                  <td>
                    <span style="display: inline-block; padding: 8px 16px; background-color: #fbbf24; color: #78350f; font-size: 12px; font-weight: 600; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.5px;">
                      Erinnerung
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 30px 40px 40px 40px;">
              <h1 style="margin: 0 0 8px 0; font-size: 26px; color: #1e293b; font-weight: 700; line-height: 1.3;">
                Kuendigungsfrist in 14 Tagen
              </h1>
              <p style="margin: 0 0 28px 0; font-size: 15px; color: #64748b;">
                Telekom Mobilfunk
              </p>

              <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.7; color: #475569;">
                Hallo,<br><br>
                dein Vertrag kann bald gekuendigt werden. Hier sind die wichtigsten Details:
              </p>

              <!-- Info Cards -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 28px;">
                <tr>
                  <td width="48%" style="background-color: #f8fafc; border-radius: 12px; padding: 20px; border: 1px solid #e2e8f0;">
                    <p style="margin: 0 0 4px 0; font-size: 12px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px;">Kuendigungsfrist</p>
                    <p style="margin: 0; font-size: 18px; color: #1e293b; font-weight: 600;">3 Monate</p>
                    <p style="margin: 4px 0 0 0; font-size: 13px; color: #64748b;">zum Vertragsende</p>
                  </td>
                  <td width="4%"></td>
                  <td width="48%" style="background-color: #f8fafc; border-radius: 12px; padding: 20px; border: 1px solid #e2e8f0;">
                    <p style="margin: 0 0 4px 0; font-size: 12px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px;">Vertragsende</p>
                    <p style="margin: 0; font-size: 18px; color: #1e293b; font-weight: 600;">31. Maerz 2025</p>
                    <p style="margin: 4px 0 0 0; font-size: 13px; color: #64748b;">in 98 Tagen</p>
                  </td>
                </tr>
              </table>

              <!-- Warning Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 28px;">
                <tr>
                  <td style="background-color: #fef3c7; border-radius: 12px; padding: 16px 20px; border-left: 4px solid #f59e0b;">
                    <p style="margin: 0; font-size: 14px; color: #92400e; line-height: 1.6;">
                      Ohne Kuendigung verlaengert sich der Vertrag automatisch um weitere 12 Monate.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <a href="https://www.contract-ai.de/contracts" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 15px; font-weight: 600; box-shadow: 0 4px 14px rgba(59, 130, 246, 0.4);">
                      Vertrag anzeigen
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding: 0 40px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border-top: 1px solid #e2e8f0;"></td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 28px 40px 32px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <p style="margin: 0 0 12px 0; font-size: 14px; font-weight: 600; color: #1e293b;">Contract AI</p>
                    <p style="margin: 0 0 16px 0; font-size: 13px; color: #64748b; line-height: 1.6;">
                      Intelligentes Vertragsmanagement fuer Unternehmen und Privatpersonen.
                    </p>
                    <p style="margin: 0; font-size: 13px;">
                      <a href="https://www.contract-ai.de" style="color: #3b82f6; text-decoration: none; font-weight: 500;">Website</a>
                      <span style="color: #cbd5e1; margin: 0 12px;">|</span>
                      <a href="https://www.contract-ai.de/datenschutz" style="color: #64748b; text-decoration: none;">Datenschutz</a>
                      <span style="color: #cbd5e1; margin: 0 12px;">|</span>
                      <a href="https://www.contract-ai.de/impressum" style="color: #64748b; text-decoration: none;">Impressum</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>

        <!-- Sub-Footer -->
        <table width="600" cellpadding="0" cellspacing="0" align="center" style="margin-top: 24px;">
          <tr>
            <td align="center">
              <p style="margin: 0; font-size: 12px; color: #94a3b8;">
                Diese E-Mail wurde automatisch generiert.
              </p>
            </td>
          </tr>
        </table>

      </td>
    </tr>
  </table>
</body>
</html>`;

      await transporter.sendMail({
        from: process.env.EMAIL_FROM || "Contract AI <no-reply@contract-ai.de>",
        to: email,
        subject: "Erinnerung: Telekom Mobilfunk - Kuendigungsfrist in 14 Tagen",
        html: premiumHtml
      });
      return res.json({
        success: true,
        message: "Premium Template Test gesendet",
        types: ["premium"]
      });
    }

    // ========== TYP: CLEAN - Professionell aber Spam-sicher ==========
    if (type === "clean") {
      const cleanHtml = `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px;">

          <!-- Header -->
          <tr>
            <td style="padding: 30px 40px; border-bottom: 1px solid #eee;">
              <span style="font-size: 20px; font-weight: 600; color: #333;">Contract AI</span>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h1 style="margin: 0 0 20px 0; font-size: 22px; color: #333; font-weight: 600;">
                Kuendigungsfrist in 14 Tagen
              </h1>

              <p style="margin: 0 0 20px 0; font-size: 15px; line-height: 1.6; color: #555;">
                Hallo,
              </p>

              <p style="margin: 0 0 20px 0; font-size: 15px; line-height: 1.6; color: #555;">
                dein Vertrag <strong style="color: #333;">Telekom Mobilfunk</strong> kann bald gekuendigt werden.
              </p>

              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fa; border-radius: 6px; margin: 25px 0;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0 0 8px 0; font-size: 14px; color: #666;">Kuendigungsfrist</p>
                    <p style="margin: 0 0 15px 0; font-size: 16px; color: #333; font-weight: 500;">3 Monate zum Vertragsende</p>
                    <p style="margin: 0 0 8px 0; font-size: 14px; color: #666;">Vertragsende</p>
                    <p style="margin: 0; font-size: 16px; color: #333; font-weight: 500;">31. Maerz 2025</p>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 25px 0; font-size: 15px; line-height: 1.6; color: #555;">
                Wenn du nicht kuendigst, verlaengert sich der Vertrag automatisch um weitere 12 Monate.
              </p>

              <a href="https://www.contract-ai.de/contracts" style="display: inline-block; padding: 12px 28px; background-color: #3B82F6; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 15px; font-weight: 500;">
                Vertrag anzeigen
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 25px 40px; background-color: #f8f9fa; border-top: 1px solid #eee; border-radius: 0 0 8px 8px;">
              <p style="margin: 0; font-size: 13px; color: #888; text-align: center;">
                Contract AI - Vertragsmanagement<br>
                <a href="https://www.contract-ai.de" style="color: #3B82F6; text-decoration: none;">www.contract-ai.de</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

      await transporter.sendMail({
        from: process.env.EMAIL_FROM || "Contract AI <no-reply@contract-ai.de>",
        to: email,
        subject: "Erinnerung: Telekom Mobilfunk - Kuendigungsfrist in 14 Tagen",
        html: cleanHtml
      });
      return res.json({
        success: true,
        message: "Clean Template Test gesendet",
        types: ["clean"]
      });
    }

    // ========== TYP: V11 - Test generateEmailTemplate() mit Template Literals ==========
    if (type === "v11") {
      const v11Html = generateEmailTemplate({
        title: 'Kündigungsfrist in 14 Tagen',
        body: `<p style="margin: 0 0 28px 0; font-size: 15px; color: #64748b;">Telekom Mobilfunk</p>
              <p style="margin: 0 0 28px 0; font-size: 15px; line-height: 1.7; color: #334155;">
                Hallo,<br><br>
                dein Vertrag kann bald gekündigt werden. Dies ist ein Test der V11 generateEmailTemplate() Funktion.
              </p>`,
        badge: 'Erinnerung',
        cta: {
          text: 'Vertrag anzeigen',
          url: 'https://www.contract-ai.de/contracts'
        }
      });

      await transporter.sendMail({
        from: process.env.EMAIL_FROM || "Contract AI <no-reply@contract-ai.de>",
        to: email,
        subject: "Erinnerung: Telekom Mobilfunk - Kuendigungsfrist in 14 Tagen",
        html: v11Html
      });
      return res.json({
        success: true,
        message: "V11 generateEmailTemplate() Test gesendet",
        types: ["v11"]
      });
    }

    // ========== TYP 1: Kalender-Benachrichtigung ==========
    if (type === "calendar" || type === "all") {
      const calendarHtml = generateEmailTemplate({
        title: "Kündigungsfrist in 14 Tagen",
        subtitle: "Telekom Mobilfunk",
        badge: "Erinnerung",
        body: `
          <p style="margin: 0 0 20px 0;">
            Dein Vertrag nähert sich dem Kündigungsfenster. Hier sind die wichtigsten Details:
          </p>
          ${generateInfoBox([
            { label: "Kündigungsfrist", value: "3 Monate zum Vertragsende" },
            { label: "Vertragsende", value: "31. März 2025" }
          ])}
          <p style="margin: 0; font-size: 14px; color: #6B7280;">
            Ohne Kündigung verlängert sich der Vertrag automatisch um weitere 12 Monate.
          </p>
        `,
        cta: { text: "Vertrag anzeigen", url: "https://www.contract-ai.de/contracts" }
      });

      await transporter.sendMail({
        from: process.env.EMAIL_FROM || "Contract AI <no-reply@contract-ai.de>",
        to: email,
        subject: "Kündigungsfrist in 14 Tagen: Telekom Mobilfunk",
        html: calendarHtml
      });
      results.push("calendar");
    }

    // ========== TYP 2: Digest-E-Mail ==========
    if (type === "digest" || type === "all") {
      const { generateStatsRow } = require("../utils/emailTemplate");
      const digestHtml = generateEmailTemplate({
        title: "Deine Vertrags-Übersicht",
        subtitle: "Tägliche Zusammenfassung",
        badge: "Übersicht",
        body: `
          ${generateStatsRow([
            { value: "3", label: "Verträge", color: "#111827" },
            { value: "1", label: "Kritisch", color: "#DC2626" },
            { value: "2", label: "Bald fällig", color: "#F59E0B" }
          ])}
          ${generateAlertBox("Vodafone DSL — Kündigung läuft heute ab", "critical")}
          ${generateAlertBox("Netflix, Fitnessstudio — Frist in 7-30 Tagen", "warning")}
          <p style="margin: 24px 0 0 0; font-size: 13px; color: #9CA3AF;">
            Diese Zusammenfassung wird täglich um 8:00 Uhr versendet.
          </p>
        `,
        cta: { text: "Alle Verträge anzeigen", url: "https://www.contract-ai.de/calendar" }
      });

      await transporter.sendMail({
        from: process.env.EMAIL_FROM || "Contract AI <no-reply@contract-ai.de>",
        to: email,
        subject: "Deine Vertrags-Übersicht — 1 kritisch, 2 bald fällig",
        html: digestHtml
      });
      results.push("digest");
    }

    // ========== TYP 3: Reminder-E-Mail ==========
    if (type === "reminder" || type === "all") {
      const reminderHtml = generateEmailTemplate({
        title: "Kündigungsfrist endet heute",
        subtitle: "Vodafone DSL",
        badge: "Dringend",
        body: `
          ${generateAlertBox("Ohne Kündigung verlängert sich dein Vertrag automatisch um 24 Monate.", "critical")}
          ${generateInfoBox([
            { label: "Monatliche Kosten", value: "44,99 €" },
            { label: "Kosten bei Verlängerung", value: "1.079,76 € (24 Monate)" }
          ])}
          <p style="margin: 0; font-size: 14px; color: #6B7280;">
            Du kannst den Vertrag direkt über Contract AI kündigen.
          </p>
        `,
        cta: { text: "Jetzt kündigen", url: "https://www.contract-ai.de/contracts" }
      });

      await transporter.sendMail({
        from: process.env.EMAIL_FROM || "Contract AI <no-reply@contract-ai.de>",
        to: email,
        subject: "Heute handeln: Vodafone DSL Kündigungsfrist",
        html: reminderHtml
      });
      results.push("reminder");
    }

    // ========== TYP 4: Bald ablaufend (Status-Änderung) ==========
    if (type === "expiring" || type === "all") {
      const expiringHtml = generateEmailTemplate({
        title: "Vertrag läuft bald ab",
        badge: "Warnung",
        body: `
          <p>Dein Vertrag <strong>"Telekom Mobilfunk"</strong> läuft bald ab.</p>
          ${generateInfoBox([
            { label: "Vertrag", value: "Telekom Mobilfunk" },
            { label: "Ablaufdatum", value: "31. März 2025" },
            { label: "Verbleibende Tage", value: "30 Tage" }
          ], { title: "Ablauf-Details" })}
          ${generateActionBox([
            "Vertrag prüfen und entscheiden: Verlängern oder kündigen?",
            "Konditionen vergleichen und bessere Angebote finden",
            "Bei Kündigung: Fristgerecht über Contract AI kündigen"
          ])}
          <p style="margin-top: 20px; font-size: 14px; color: #64748b;">
            <strong>Wichtig:</strong> Verpasste Kündigungsfristen können zu automatischen Vertragsverlängerungen führen.
          </p>
        `,
        cta: { text: "Vertrag verwalten", url: "https://www.contract-ai.de/contracts" }
      });

      await transporter.sendMail({
        from: process.env.EMAIL_FROM || "Contract AI <no-reply@contract-ai.de>",
        to: email,
        subject: "Telekom Mobilfunk läuft in 30 Tagen ab",
        html: expiringHtml
      });
      results.push("expiring");
    }

    // ========== TYP 5: Abgelaufen (Status-Änderung) ==========
    if (type === "expired" || type === "all") {
      const expiredHtml = generateEmailTemplate({
        title: "Vertrag ist abgelaufen",
        badge: "Abgelaufen",
        body: `
          <p>Dein Vertrag <strong>"Netflix Premium"</strong> ist am <strong>15. Dezember 2024</strong> abgelaufen.</p>
          ${generateAlertBox("Der Vertrag wurde nicht verlängert und ist jetzt inaktiv.", "warning")}
          ${generateInfoBox([
            { label: "Vertrag", value: "Netflix Premium" },
            { label: "Abgelaufen am", value: "15. Dezember 2024" },
            { label: "Neuer Status", value: "Abgelaufen" }
          ])}
          ${generateActionBox([
            "Prüfen, ob eine automatische Verlängerung stattgefunden hat",
            "Anbieter kontaktieren für Klärung des Status",
            "Vertrag in Contract AI archivieren"
          ], { title: "Was du jetzt tun solltest" })}
        `,
        cta: { text: "Verträge verwalten", url: "https://www.contract-ai.de/contracts" }
      });

      await transporter.sendMail({
        from: process.env.EMAIL_FROM || "Contract AI <no-reply@contract-ai.de>",
        to: email,
        subject: "Vertrag abgelaufen: Netflix Premium",
        html: expiredHtml
      });
      results.push("expired");
    }

    // ========== TYP 6: Willkommen ==========
    if (type === "welcome" || type === "all") {
      const welcomeHtml = generateEmailTemplate({
        title: "Willkommen bei Contract AI!",
        badge: "Neu",
        body: `
          <p>Schön, dass du dabei bist! Mit Contract AI behältst du den Überblick über alle deine Verträge.</p>
          ${generateInfoBox([
            { label: "Account", value: email },
            { label: "Plan", value: "Premium" },
            { label: "Status", value: "Aktiv" }
          ], { title: "Dein Account" })}
          ${generateActionBox([
            "Lade deinen ersten Vertrag hoch",
            "Aktiviere Kalender-Erinnerungen",
            "Entdecke die KI-Analyse"
          ], { icon: "🚀", title: "Erste Schritte" })}
        `,
        cta: { text: "Jetzt starten", url: "https://www.contract-ai.de/dashboard" }
      });

      await transporter.sendMail({
        from: process.env.EMAIL_FROM || "Contract AI <no-reply@contract-ai.de>",
        to: email,
        subject: "Willkommen bei Contract AI!",
        html: welcomeHtml
      });
      results.push("welcome");
    }

    // ========== TYP 7: Email-Verifizierung ==========
    if (type === "verification" || type === "all") {
      const verificationHtml = generateEmailTemplate({
        title: "Bestätige deine E-Mail-Adresse",
        body: `
          <p>Bitte bestätige deine E-Mail-Adresse, um deinen Contract AI Account zu aktivieren.</p>
          ${generateAlertBox("Dieser Link ist 24 Stunden gültig.", "info")}
          <p style="margin-top: 20px; font-size: 14px; color: #64748b;">
            Falls du diesen Account nicht erstellt hast, kannst du diese E-Mail ignorieren.
          </p>
        `,
        cta: { text: "E-Mail bestätigen", url: "https://www.contract-ai.de/verify?token=test123" }
      });

      await transporter.sendMail({
        from: process.env.EMAIL_FROM || "Contract AI <no-reply@contract-ai.de>",
        to: email,
        subject: "Bestätige deine E-Mail-Adresse",
        html: verificationHtml
      });
      results.push("verification");
    }

    res.json({
      success: true,
      message: `${results.length} Test-E-Mail(s) an ${email} gesendet`,
      types: results,
      unsubscribeUrl: unsubscribeUrl
    });

  } catch (error) {
    console.error("Test Email Error:", error);
    res.status(500).json({
      success: false,
      error: "Fehler beim Senden der Test-E-Mail: " + error.message
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
