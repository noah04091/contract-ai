// 📁 backend/services/verificationEmailService.js
// Versand der E-Mail-Bestätigungs-Mail (Double-Opt-In), extrahiert aus
// routes/emailVerification.js (Befund 6 der Registrierungs-Strecke, 19.08.2026).
// Grund der Extraktion: Der Versand war NUR Frontend-getriggert (Register.tsx
// rief send-verification nach dem Registrieren auf) — wer den Tab sofort
// schloss, bekam nie eine Mail. Jetzt ruft auch POST /auth/register diesen
// Service direkt auf; der Frontend-Aufruf bleibt als Fallback und läuft dank
// des 60s-Cooldowns idempotent in "already_sent_recently".

const crypto = require("crypto");
const sendEmailHtml = require("../utils/sendEmailHtml");
const { generateEmailTemplate } = require("../utils/emailTemplate");
const { normalizeEmail } = require("../utils/normalizeEmail");

const COOLDOWN_MS = 60_000; // 60 Sekunden Cooldown
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24h gültig

/**
 * Sendet die Bestätigungs-Mail an einen registrierten, unbestätigten User.
 * Rückgabe (statt HTTP): { status, message, ... } — die Route mappt auf die
 * bisherigen, byte-identischen JSON-Antworten.
 *
 * status: 'missing_email' | 'not_found' | 'already_verified'
 *       | 'already_sent_recently' (+ retryAfter)
 *       | 'queued' (+ email, tokenExpiry)
 *       | 'error'
 */
async function sendVerificationMail(db, rawEmail) {
  if (!rawEmail) {
    return { status: "missing_email", message: "E-Mail ist erforderlich" };
  }

  const usersCollection = db.collection("users");
  const email = normalizeEmail(rawEmail);

  const user = await usersCollection.findOne({ email });
  if (!user) {
    console.error(`❌ send-verification: User nicht gefunden - rawEmail: ${rawEmail}, normalizedEmail: ${email}`);
    return { status: "not_found", message: "User nicht gefunden" };
  }

  if (user.verified === true) {
    return { status: "already_verified", message: "User ist bereits verifiziert" };
  }

  // Cooldown prüfen - Idempotenz für wiederholte Calls (z. B. Server-Versand bei
  // der Registrierung + Frontend-Fallback ~1,5s später → genau EINE Mail)
  const now = Date.now();
  if (user.lastVerificationSentAt) {
    const timeSinceLastSent = now - new Date(user.lastVerificationSentAt).getTime();
    if (timeSinceLastSent < COOLDOWN_MS) {
      const retryAfter = Math.ceil((COOLDOWN_MS - timeSinceLastSent) / 1000);
      console.log(`✅ send-verification: Cooldown aktiv für ${email} - ${retryAfter}s verbleibend`);
      return { status: "already_sent_recently", message: "E-Mail wurde kürzlich gesendet", retryAfter };
    }
  }

  // Neuen Verification-Token generieren
  const verificationToken = crypto.randomBytes(32).toString("hex");
  const tokenExpiry = new Date(now + TOKEN_TTL_MS);

  // Token + Cooldown-Timestamp VOR dem Versand speichern (verhindert Doppel-Mail
  // bei parallelen Aufrufen); scheitert der Versand, wird der Cooldown unten
  // wieder gelöscht, damit ein sofortiger Retry nicht 60s blockiert ist.
  await usersCollection.updateOne(
    { email },
    {
      $set: {
        verificationToken,
        verificationTokenExpiry: tokenExpiry,
        tokenUpdatedAt: new Date(),
        lastVerificationSentAt: new Date(now)
      }
    }
  );

  // Verification-Link erstellen
  // email steht mit im Link, damit der Fehlerpfad in /verify den User kennt:
  // bei bereits verbrauchtem Token (Doppelklick, Mail-Scanner-Prefetch) leiten
  // wir dann auf /verify-success statt auf eine Fehlerseite.
  const frontendUrl = process.env.FRONTEND_URL || "https://contract-ai.de";
  const verificationLink = `${frontendUrl}/api/email-verification/verify?token=${verificationToken}&email=${encodeURIComponent(email)}`;

  const emailHtml = generateEmailTemplate({
    title: "E-Mail bestätigen",
    preheader: "Bestätige deine E-Mail-Adresse",
    body: `
      <p style="text-align: center; margin-bottom: 30px;">
        Vielen Dank für deine Registrierung bei <strong>Contract AI</strong>.<br>
        Bitte bestätige deine E-Mail-Adresse, um dein Konto zu aktivieren.
      </p>
    `,
    cta: {
      text: "E-Mail bestätigen",
      url: verificationLink
    },
    centerContent: true
  });

  try {
    await sendEmailHtml(email, "Contract AI - E-Mail-Adresse bestätigen", emailHtml);
  } catch (sendErr) {
    // Cooldown zurücknehmen: sonst liefe der Frontend-Fallback der Registrierung
    // in "already_sent_recently", obwohl nie eine Mail rausging.
    try {
      await usersCollection.updateOne({ email }, { $unset: { lastVerificationSentAt: "" } });
    } catch (unsetErr) {
      console.error("⚠️ send-verification: Cooldown-Rücknahme fehlgeschlagen:", unsetErr.message);
    }
    console.error("❌ Fehler beim Senden der Verification-E-Mail:", sendErr);
    return { status: "error", message: "Fehler beim Senden der E-Mail" };
  }

  console.log(`✅ Verification-E-Mail gesendet an: ${email}`);
  return {
    status: "queued",
    message: "Bestätigungs-E-Mail wurde gesendet",
    email,
    tokenExpiry
  };
}

module.exports = { sendVerificationMail, COOLDOWN_MS };
