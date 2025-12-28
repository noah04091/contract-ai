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
