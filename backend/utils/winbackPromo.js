// 🎟️ Persönliche Win-back-Codes (20.08.2026)
//
// Ausgangslage: Es gab genau EINEN pauschalen Promotion-Code "COMEBACK20" (unbefristet,
// unbegrenzt einlösbar, an niemanden gebunden), der in der Kündigungs-Mail und in der
// 3-Tage-Follow-up-Mail im Klartext steht. Die Mails behaupten "einmalig, nur für dich,
// 14 Tage gültig" — technisch gedeckt war davon NICHTS.
//
// Stripe trennt die Rabatt-REGEL (Coupon) vom einlösbaren TEXT (Promotion Code). Der
// Coupon bleibt unverändert; auf ihn lassen sich beliebig viele Promotion-Codes legen,
// und jeder einzelne kann befristet (expires_at), einmalig (max_redemptions) und an
// einen bestimmten Kunden gebunden (customer) sein. Genau das macht dieses Modul.
//
// Diese Funktion wirft NIE. Sie hängt an Kündigungs-Mails und am Konto-Löschpfad —
// beide dürfen niemals an einem Rabattcode scheitern. Im Fehlerfall: null zurück,
// Alarm ins Monitoring, Aufrufer läuft ohne Angebot weiter.

const crypto = require("crypto");

// Der bestehende Coupon: 20 % auf 3 Monate (percent_off 20, duration repeating,
// duration_in_months 3). Über ENV überschreibbar, damit ein Wechsel der Rabatthöhe
// keinen Deploy braucht.
const COUPON_ID = process.env.WINBACK_COUPON_ID || "EfbiM3pR";

const CODE_PRAEFIX = "COMEBACK20";
const STANDARD_GUELTIGKEIT_TAGE = 14;

// Ohne 0/O/1/I/L: Der Code wird aus E-Mails abgetippt, Verwechslungen kosten uns
// genau die Rückkehrer, die wir gewinnen wollen.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const SUFFIX_LAENGE = 6;
const MAX_VERSUCHE = 3; // gegen den (sehr unwahrscheinlichen) Namenskonflikt

function zufallsSuffix() {
  const bytes = crypto.randomBytes(SUFFIX_LAENGE);
  let out = "";
  for (let i = 0; i < SUFFIX_LAENGE; i++) {
    out += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return out;
}

/**
 * Stellt einen persönlichen Win-back-Code aus.
 *
 * @param {object}  opts
 * @param {string}  opts.email             nur für Logs und Alarme
 * @param {string} [opts.stripeCustomerId] wenn vorhanden, wird der Code an diesen Kunden gebunden
 * @param {string} [opts.userId]           landet in den Stripe-Metadaten
 * @param {string} [opts.anlass]           "kuendigung" | "loeschung" | "followup"
 * @param {number} [opts.tage]             Gültigkeit in Tagen (Standard 14)
 * @param {object} [opts.deps]             { stripe } für Tests
 * @returns {Promise<{code, promotionCodeId, couponId, expiresAt, wiederverwendet}|null>}
 */
async function createPersonalWinbackCode(opts = {}) {
  const { email, stripeCustomerId, userId, anlass = "kuendigung", tage, deps = {} } = opts;
  const gueltigkeit = Number.isFinite(tage) && tage > 0 ? tage : STANDARD_GUELTIGKEIT_TAGE;

  try {
    const stripe = deps.stripe || (process.env.STRIPE_SECRET_KEY
      ? require("stripe")(process.env.STRIPE_SECRET_KEY)
      : null);

    if (!stripe) {
      meldeAlarm(new Error("Win-back-Code ohne STRIPE_SECRET_KEY: Angebot übersprungen"), email, anlass);
      return null;
    }

    // 1) Doppelausstellung vermeiden: Hat dieser Kunde schon ein laufendes Angebot,
    //    geben wir dasselbe zurück statt eines zweiten. Greift nur mit Kundennummer;
    //    für Konten ohne Stripe-Kundschaft merkt sich der Aufrufer den Code selbst.
    if (stripeCustomerId) {
      const vorhanden = await findeLaufendesAngebot(stripe, stripeCustomerId);
      if (vorhanden) {
        return {
          code: vorhanden.code,
          promotionCodeId: vorhanden.id,
          couponId: COUPON_ID,
          expiresAt: vorhanden.expires_at ? new Date(vorhanden.expires_at * 1000) : null,
          wiederverwendet: true,
        };
      }
    }

    // 2) Neuen Code anlegen. expires_at ist eine Unix-Sekunde, nicht Millisekunden.
    const expiresAtSek = Math.floor(Date.now() / 1000) + gueltigkeit * 24 * 60 * 60;

    for (let versuch = 1; versuch <= MAX_VERSUCHE; versuch++) {
      const code = `${CODE_PRAEFIX}-${zufallsSuffix()}`;
      try {
        const params = {
          coupon: COUPON_ID,
          code,
          max_redemptions: 1,
          expires_at: expiresAtSek,
          metadata: {
            anlass,
            ausgestelltAm: new Date().toISOString(),
            ...(userId ? { userId: String(userId) } : {}),
          },
        };
        // Ohne Kundennummer (Free-Konto, das nie gezahlt hat) bleibt der Code
        // ungebunden — max_redemptions: 1 schützt trotzdem vor Weitergabe.
        if (stripeCustomerId) params.customer = stripeCustomerId;

        const promo = await stripe.promotionCodes.create(params);

        console.log(`🎟️ Win-back-Code ausgestellt (${anlass}): ${promo.code} für ${email || "unbekannt"}, gültig ${gueltigkeit} Tage`);

        return {
          code: promo.code,
          promotionCodeId: promo.id,
          couponId: COUPON_ID,
          expiresAt: new Date(expiresAtSek * 1000),
          wiederverwendet: false,
        };
      } catch (createErr) {
        const istNamenskonflikt = /already exists|already been used/i.test(createErr.message || "");
        if (istNamenskonflikt && versuch < MAX_VERSUCHE) {
          continue; // neuer Zufallssuffix
        }
        throw createErr;
      }
    }

    return null;
  } catch (err) {
    meldeAlarm(err, email, anlass);
    return null;
  }
}

// Sucht einen noch mindestens einen Tag gültigen, unbenutzten Code dieses Kunden.
async function findeLaufendesAngebot(stripe, stripeCustomerId) {
  try {
    const liste = await stripe.promotionCodes.list({
      customer: stripeCustomerId,
      active: true,
      limit: 20,
    });
    const morgenSek = Math.floor(Date.now() / 1000) + 24 * 60 * 60;
    return liste.data.find(p =>
      p.coupon?.id === COUPON_ID &&
      p.times_redeemed === 0 &&
      typeof p.expires_at === "number" &&
      p.expires_at > morgenSek
    ) || null;
  } catch (_) {
    return null; // Im Zweifel lieber einen neuen Code als gar keinen
  }
}

// Alarm darf den aufrufenden Pfad (Kündigung, Löschung) nie stören
function meldeAlarm(err, email, anlass) {
  try {
    require("../services/errorMonitoring").captureError(err, {
      severity: "low", // ein fehlendes Rabattangebot ist ärgerlich, nicht kritisch
      route: `winback-promo/${anlass}`,
      userEmail: email || null,
    });
  } catch (_) { /* Alarmierung ist nie wichtiger als der Hauptpfad */ }
  console.error(`❌ Win-back-Code konnte nicht ausgestellt werden (${anlass}):`, err.message);
}

module.exports = {
  createPersonalWinbackCode,
  COUPON_ID,
  CODE_PRAEFIX,
  STANDARD_GUELTIGKEIT_TAGE,
};
