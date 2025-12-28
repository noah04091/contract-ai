// backend/services/emailUnsubscribeService.js
// DSGVO-konformes Unsubscribe-Management mit Tracking

const { ObjectId } = require("mongodb");
const crypto = require("crypto");

/**
 * E-Mail-Kategorien fuer granulare Abmeldung
 */
const EMAIL_CATEGORIES = {
  ALL: "all",                          // Alle E-Mails
  CALENDAR: "calendar",                // Kalender-Erinnerungen
  MARKETING: "marketing",              // Marketing/Newsletter
  PRODUCT_UPDATES: "product_updates",  // Produkt-Updates
  SECURITY: "security"                 // Sicherheits-E-Mails (nicht abbestellbar)
};

/**
 * Generiert einen sicheren Unsubscribe-Token
 * @param {string} email - E-Mail-Adresse
 * @param {string} category - E-Mail-Kategorie
 * @returns {string} - Token
 */
function generateUnsubscribeToken(email, category = EMAIL_CATEGORIES.ALL) {
  const secret = process.env.UNSUBSCRIBE_SECRET || process.env.JWT_SECRET || "fallback-secret";
  const data = `${email.toLowerCase()}:${category}:${Date.now()}`;
  const hash = crypto.createHmac("sha256", secret).update(data).digest("hex");

  // Base64-encode fuer URL-Sicherheit
  const payload = Buffer.from(JSON.stringify({
    e: email.toLowerCase(),
    c: category,
    t: Date.now()
  })).toString("base64url");

  return `${payload}.${hash.substring(0, 16)}`;
}

/**
 * Validiert einen Unsubscribe-Token
 * @param {string} token - Token zu validieren
 * @returns {Object|null} - Dekodierte Daten oder null
 */
function validateUnsubscribeToken(token) {
  try {
    const [payload] = token.split(".");
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));

    // Token ist 30 Tage gueltig
    const tokenAge = Date.now() - decoded.t;
    const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 Tage

    if (tokenAge > maxAge) {
      console.log("Unsubscribe-Token abgelaufen");
      return null;
    }

    return {
      email: decoded.e,
      category: decoded.c,
      timestamp: decoded.t
    };
  } catch (error) {
    console.error("Ungueltiger Unsubscribe-Token:", error.message);
    return null;
  }
}

/**
 * Generiert die Unsubscribe-URL
 * @param {string} email - E-Mail-Adresse
 * @param {string} category - E-Mail-Kategorie
 * @returns {string} - Vollstaendige Unsubscribe-URL
 */
function generateUnsubscribeUrl(email, category = EMAIL_CATEGORIES.ALL) {
  const token = generateUnsubscribeToken(email, category);
  const baseUrl = process.env.FRONTEND_URL || "https://www.contract-ai.de";
  return `${baseUrl}/abmelden?token=${encodeURIComponent(token)}`;
}

/**
 * Generiert One-Click Unsubscribe URL (RFC 8058)
 */
function generateOneClickUnsubscribeUrl(email, category = EMAIL_CATEGORIES.ALL) {
  const token = generateUnsubscribeToken(email, category);
  const apiUrl = process.env.API_URL || "https://api.contract-ai.de";
  return `${apiUrl}/api/email/unsubscribe-oneclick?token=${encodeURIComponent(token)}`;
}

/**
 * Speichert Unsubscribe-Event (DSGVO-Protokollierung)
 * @param {Object} db - MongoDB-Instanz
 * @param {string} email - E-Mail-Adresse
 * @param {string} category - Abgemeldete Kategorie
 * @param {Object} metadata - Zusaetzliche Metadaten
 */
async function recordUnsubscribe(db, email, category, metadata = {}) {
  const emailLower = email.toLowerCase();
  const now = new Date();

  // DSGVO-Protokoll: Wer, Wann, Was, Wie
  const unsubscribeRecord = {
    email: emailLower,
    category: category,
    timestamp: now,
    ipAddress: metadata.ipAddress || null,
    userAgent: metadata.userAgent || null,
    method: metadata.method || "link", // link, oneclick, preference_center
    source: metadata.source || "email",
    // DSGVO: Nachweis der Einwilligung/Widerruf
    legalBasis: "Widerruf gem. Art. 7 Abs. 3 DSGVO"
  };

  await db.collection("email_unsubscribes").insertOne(unsubscribeRecord);

  // Aktualisiere User-Praeferenzen
  const user = await db.collection("users").findOne({ email: emailLower });

  if (user) {
    const updateField = category === EMAIL_CATEGORIES.ALL
      ? { emailOptOut: true, emailOptOutAt: now }
      : { [`emailPreferences.${category}`]: false };

    await db.collection("users").updateOne(
      { _id: user._id },
      {
        $set: {
          ...updateField,
          emailPreferencesUpdatedAt: now
        }
      }
    );
  } else {
    // Fuer nicht-registrierte E-Mails: Speichere in separater Collection
    await db.collection("email_optouts").updateOne(
      { email: emailLower },
      {
        $set: {
          email: emailLower,
          optedOut: true,
          category: category,
          updatedAt: now
        },
        $setOnInsert: { createdAt: now }
      },
      { upsert: true }
    );
  }

  console.log(`📧 Unsubscribe recorded: ${emailLower} (${category})`);

  return unsubscribeRecord;
}

/**
 * Prueft ob eine E-Mail abgemeldet ist
 * @param {Object} db - MongoDB-Instanz
 * @param {string} email - E-Mail-Adresse
 * @param {string} category - Zu pruefende Kategorie
 * @returns {boolean} - true wenn abgemeldet
 */
async function isUnsubscribed(db, email, category = EMAIL_CATEGORIES.ALL) {
  const emailLower = email.toLowerCase();

  // Pruefe User-Collection
  const user = await db.collection("users").findOne({ email: emailLower });

  if (user) {
    // Komplett abgemeldet?
    if (user.emailOptOut === true) return true;

    // Kategorie-spezifisch abgemeldet?
    if (category !== EMAIL_CATEGORIES.ALL) {
      const prefs = user.emailPreferences || {};
      if (prefs[category] === false) return true;
    }
  }

  // Pruefe Optout-Collection (fuer nicht-registrierte E-Mails)
  const optout = await db.collection("email_optouts").findOne({ email: emailLower });

  if (optout && optout.optedOut) {
    if (optout.category === EMAIL_CATEGORIES.ALL) return true;
    if (optout.category === category) return true;
  }

  return false;
}

/**
 * Ermoeglicht erneute Anmeldung (Resubscribe)
 */
async function resubscribe(db, email, category = EMAIL_CATEGORIES.ALL) {
  const emailLower = email.toLowerCase();
  const now = new Date();

  // User-Collection
  const user = await db.collection("users").findOne({ email: emailLower });

  if (user) {
    const updateData = category === EMAIL_CATEGORIES.ALL
      ? { emailOptOut: false }
      : { [`emailPreferences.${category}`]: true };

    await db.collection("users").updateOne(
      { _id: user._id },
      {
        $set: {
          ...updateData,
          emailPreferencesUpdatedAt: now
        }
      }
    );
  }

  // Optout-Collection
  await db.collection("email_optouts").deleteOne({ email: emailLower });

  // Protokolliere Resubscribe
  await db.collection("email_unsubscribes").insertOne({
    email: emailLower,
    category: category,
    timestamp: now,
    action: "resubscribe",
    legalBasis: "Erneute Einwilligung gem. Art. 7 DSGVO"
  });

  console.log(`✅ Resubscribe: ${emailLower} (${category})`);

  return true;
}

/**
 * Generiert List-Unsubscribe Header fuer E-Mails (RFC 2369 / RFC 8058)
 * Diese Header ermoeglichen One-Click Unsubscribe in E-Mail-Clients
 */
function getUnsubscribeHeaders(email, category = EMAIL_CATEGORIES.CALENDAR) {
  const oneClickUrl = generateOneClickUnsubscribeUrl(email, category);
  const webUrl = generateUnsubscribeUrl(email, category);

  return {
    "List-Unsubscribe": `<${webUrl}>, <mailto:unsubscribe@contract-ai.de?subject=unsubscribe>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click"
  };
}

/**
 * Generiert den HTML-Footer mit Unsubscribe-Link fuer E-Mails
 */
function getUnsubscribeFooterHtml(email, category = EMAIL_CATEGORIES.CALENDAR) {
  const url = generateUnsubscribeUrl(email, category);

  return `
    <tr>
      <td style="padding: 20px 50px; text-align: center; background-color: #f8f9fa; border-top: 1px solid #e5e5e5;">
        <p style="margin: 0 0 10px 0; font-size: 12px; color: #888888;">
          Diese E-Mail wurde an <strong>${email}</strong> gesendet.
        </p>
        <p style="margin: 0; font-size: 12px; color: #888888;">
          <a href="${url}" style="color: #666666; text-decoration: underline;">
            Von diesen E-Mails abmelden
          </a>
        </p>
      </td>
    </tr>
  `;
}

/**
 * Holt Unsubscribe-Statistiken
 */
async function getUnsubscribeStats(db, days = 30) {
  const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const stats = await db.collection("email_unsubscribes").aggregate([
    {
      $match: {
        timestamp: { $gte: cutoffDate },
        action: { $ne: "resubscribe" }
      }
    },
    {
      $group: {
        _id: "$category",
        count: { $sum: 1 }
      }
    }
  ]).toArray();

  const totalOptedOut = await db.collection("users").countDocuments({
    emailOptOut: true
  });

  return {
    period: `${days} Tage`,
    byCategory: Object.fromEntries(stats.map(s => [s._id, s.count])),
    totalUnsubscribes: stats.reduce((sum, s) => sum + s.count, 0),
    totalOptedOutUsers: totalOptedOut
  };
}

module.exports = {
  EMAIL_CATEGORIES,
  generateUnsubscribeToken,
  validateUnsubscribeToken,
  generateUnsubscribeUrl,
  generateOneClickUnsubscribeUrl,
  recordUnsubscribe,
  isUnsubscribed,
  resubscribe,
  getUnsubscribeHeaders,
  getUnsubscribeFooterHtml,
  getUnsubscribeStats
};
