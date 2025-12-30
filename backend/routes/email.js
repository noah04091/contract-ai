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
    const generateEmailTemplate = require("../utils/emailTemplate");
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

    // ========== TYP 1: Kalender-Benachrichtigung (Kuendigungsfrist) ==========
    if (type === "calendar" || type === "all") {
      const calendarHtml = generateEmailTemplate({
        title: "Kuendigungsfrist in 14 Tagen",
        preheader: "Dein Vertrag 'Telekom Mobilfunk' kann bald gekuendigt werden",
        body: `
          <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 0 0 20px 0; border-radius: 0 8px 8px 0;">
            <p style="color: #92400e; margin: 0; font-weight: 600;">
              Kuendigungsfenster oeffnet bald
            </p>
          </div>
          <h2 style="color: #1f2937; margin: 0 0 16px 0;">Telekom Mobilfunk</h2>
          <p style="color: #4b5563; font-size: 15px; line-height: 1.6;">
            In <strong>14 Tagen</strong> beginnt das Kuendigungsfenster fuer deinen Vertrag.
          </p>
          <table style="width: 100%; margin: 20px 0; border-collapse: collapse;">
            <tr>
              <td style="padding: 12px; background: #f9fafb; border-radius: 8px 0 0 8px;">
                <strong style="color: #6b7280;">Kuendigungsfrist</strong><br>
                <span style="color: #1f2937;">3 Monate zum Vertragsende</span>
              </td>
              <td style="padding: 12px; background: #f9fafb; border-radius: 0 8px 8px 0;">
                <strong style="color: #6b7280;">Vertragsende</strong><br>
                <span style="color: #1f2937;">31.03.2025</span>
              </td>
            </tr>
          </table>
          <p style="color: #4b5563; font-size: 14px;">
            Wenn du nicht kuendigst, verlaengert sich der Vertrag automatisch um 12 Monate.
          </p>
        `,
        cta: {
          text: "Vertrag anzeigen",
          url: "https://www.contract-ai.de/contracts"
        },
        recipientEmail: email,
        emailCategory: "calendar"
      });

      await transporter.sendMail({
        from: process.env.EMAIL_FROM || "Contract AI <no-reply@contract-ai.de>",
        to: email,
        subject: "Kuendigungsfrist in 14 Tagen: Telekom Mobilfunk",
        html: calendarHtml,
        headers: unsubHeaders
      });
      results.push("calendar");
    }

    // ========== TYP 2: Digest-E-Mail (Tages-Zusammenfassung) ==========
    if (type === "digest" || type === "all") {
      const digestHtml = generateEmailTemplate({
        title: "Deine Vertrags-Zusammenfassung",
        preheader: "3 anstehende Fristen diese Woche",
        body: `
          <h2 style="color: #1f2937; margin: 0 0 8px 0;">Guten Morgen!</h2>
          <p style="color: #6b7280; margin: 0 0 24px 0;">Hier ist deine taegliche Zusammenfassung:</p>

          <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; margin: 0 0 16px 0; border-radius: 0 8px 8px 0;">
            <p style="color: #991b1b; margin: 0 0 8px 0; font-weight: 600;">1 kritische Frist</p>
            <p style="color: #991b1b; margin: 0; font-size: 14px;">
              <strong>Vodafone DSL</strong> - Kuendigung muss HEUTE raus!
            </p>
          </div>

          <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 0 0 16px 0; border-radius: 0 8px 8px 0;">
            <p style="color: #92400e; margin: 0 0 8px 0; font-weight: 600;">2 Erinnerungen</p>
            <p style="color: #92400e; margin: 0; font-size: 14px;">
              <strong>Netflix</strong> - Preiserhoehung in 7 Tagen<br>
              <strong>Fitnessstudio</strong> - Vertrag endet in 30 Tagen
            </p>
          </div>

          <p style="color: #4b5563; font-size: 14px; margin-top: 24px;">
            Du erhaeltst diese E-Mail als taegliche Zusammenfassung.
            <a href="https://www.contract-ai.de/profile" style="color: #3b82f6;">Einstellungen aendern</a>
          </p>
        `,
        cta: {
          text: "Zum Kalender",
          url: "https://www.contract-ai.de/calendar"
        },
        recipientEmail: email,
        emailCategory: "calendar"
      });

      await transporter.sendMail({
        from: process.env.EMAIL_FROM || "Contract AI <no-reply@contract-ai.de>",
        to: email,
        subject: "Deine Vertrags-Zusammenfassung: 1 kritische Frist + 2 Erinnerungen",
        html: digestHtml,
        headers: unsubHeaders
      });
      results.push("digest");
    }

    // ========== TYP 3: Dringende Erinnerung (LETZTE CHANCE) ==========
    if (type === "reminder" || type === "all") {
      const reminderHtml = generateEmailTemplate({
        title: "LETZTE CHANCE: Heute kuendigen!",
        preheader: "Vodafone DSL muss HEUTE gekuendigt werden",
        body: `
          <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; margin: 0 0 20px 0; border-radius: 0 8px 8px 0;">
            <p style="color: #991b1b; margin: 0; font-weight: 600; font-size: 16px;">
              HEUTE ist der letzte Tag!
            </p>
          </div>
          <h2 style="color: #1f2937; margin: 0 0 16px 0;">Vodafone DSL</h2>
          <p style="color: #4b5563; font-size: 15px; line-height: 1.6;">
            Die Kuendigungsfrist fuer deinen Vertrag endet <strong>heute</strong>.
          </p>
          <p style="color: #4b5563; font-size: 15px; line-height: 1.6;">
            Wenn du jetzt nicht kuendigst, verlaengert sich der Vertrag automatisch um weitere <strong>24 Monate</strong>.
          </p>
          <div style="background: #f9fafb; padding: 16px; border-radius: 8px; margin: 20px 0;">
            <p style="color: #1f2937; margin: 0; font-size: 14px;">
              <strong>Monatliche Kosten:</strong> 44,99 EUR<br>
              <strong>Bei Verlaengerung:</strong> 1.079,76 EUR fuer 24 Monate
            </p>
          </div>
        `,
        cta: {
          text: "Jetzt kuendigen",
          url: "https://www.contract-ai.de/contracts"
        },
        recipientEmail: email,
        emailCategory: "calendar"
      });

      await transporter.sendMail({
        from: process.env.EMAIL_FROM || "Contract AI <no-reply@contract-ai.de>",
        to: email,
        subject: "LETZTE CHANCE: Vodafone DSL heute kuendigen!",
        html: reminderHtml,
        headers: unsubHeaders
      });
      results.push("reminder");
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
