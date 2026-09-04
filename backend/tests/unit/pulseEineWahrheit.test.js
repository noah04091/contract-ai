// Eine Wahrheit auch für Legal Pulse (04.09.2026, Masterplan Phase 4).
//
// Die Profil-Zeile „Legal Pulse Alerts" schrieb bisher nur
// notificationSettings.email.legalPulse — ein Feld, das KEIN Pulse-Versender liest.
// Wer sich per Pulse-Mail abmeldete, sah im Profil weiter „AN"; wer im Profil
// abschaltete, bekam weiter Mails. Exakt der Zwei-Wahrheiten-Zustand, der für die
// Fristen am 24.08. behoben wurde (siehe fristenEineWahrheit.test.js).
//
// Ab jetzt ist legalPulseSettings die einzige Wahrheit: pulseEmailsDisabled (alle
// 4 Versand-Jobs), isUnsubscribed (Queue-Netz), Abmelde-Link, /pulse-Schalter und
// die Profil-Zeile lesen und schreiben dasselbe Fach.

process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret-eine-wahrheit";

const { isUnsubscribed, EMAIL_CATEGORIES } = require("../../services/emailUnsubscribeService");
const { pulseEmailsDisabled } = require("../../utils/pulseAccess");

// Bildet nach, was routes/dashboardNotifications.js GET für die Profil-Zeile berechnet.
const profilZeigtAn = (user) =>
  user?.legalPulseSettings?.emailNotifications !== false &&
  user?.legalPulseSettings?.enabled !== false &&
  user?.notificationSettings?.email?.legalPulse !== false;

// Bildet nach, was der PUT schreibt, wenn der Kunde die Zeile umlegt.
// Inklusive Guard: NUR spiegeln, wenn der Client das Feld überhaupt mitsendet —
// Boolean(undefined) wäre false und ein alter Client würde die Pulse-Mails beim
// Speichern still abschalten (exakt die dokumentierte weeklyReport-Falle).
const profilSchreibt = (emailSettings) => {
  const felder = {};
  if (emailSettings && typeof emailSettings.legalPulse !== "undefined") {
    felder["legalPulseSettings.emailNotifications"] = Boolean(emailSettings.legalPulse);
    if (emailSettings.legalPulse) felder["legalPulseSettings.enabled"] = true;
  }
  return felder;
};

const dbMit = (user) => ({ collection: () => ({ findOne: async () => user }) });

describe("Legal Pulse: eine Wahrheit an allen Orten", () => {
  test("frischer Kunde: Profil zeigt AN, Versender lassen durch", async () => {
    const user = { email: "neu@example.invalid" };
    expect(profilZeigtAn(user)).toBe(true);
    expect(pulseEmailsDisabled(user)).toBe(false);
    await expect(isUnsubscribed(dbMit(user), user.email, EMAIL_CATEGORIES.LEGAL_PULSE)).resolves.toBe(false);
  });

  test("Abmeldung per Pulse-Mail-Link: Versand sperrt UND das Profil zeigt AUS", async () => {
    // Genau der Fall, der vorher auseinanderlief (Profil zeigte weiter „AN").
    const user = { email: "link@example.invalid", legalPulseSettings: { emailNotifications: false } };
    expect(pulseEmailsDisabled(user)).toBe(true);
    await expect(isUnsubscribed(dbMit(user), user.email, EMAIL_CATEGORIES.LEGAL_PULSE)).resolves.toBe(true);
    expect(profilZeigtAn(user)).toBe(false);
  });

  test("Abschalten im Profil landet im selben Fach, das alle 4 Jobs lesen", () => {
    const geschrieben = profilSchreibt({ legalPulse: false });
    expect(geschrieben).toEqual({ "legalPulseSettings.emailNotifications": false });
    const user = { email: "profil@example.invalid", legalPulseSettings: { emailNotifications: false } };
    expect(pulseEmailsDisabled(user)).toBe(true);
  });

  test("Einschalten setzt enabled:true mit (V1-Altbestand darf nicht stumm bleiben)", () => {
    expect(profilSchreibt({ legalPulse: true })).toEqual({
      "legalPulseSettings.emailNotifications": true,
      "legalPulseSettings.enabled": true,
    });
    const user = { email: "an@example.invalid", legalPulseSettings: { emailNotifications: true, enabled: true } };
    expect(pulseEmailsDisabled(user)).toBe(false);
    expect(profilZeigtAn(user)).toBe(true);
  });

  test("V1-Altbestand enabled:false: Profil zeigt ehrlich AUS (kein leeres AN)", () => {
    const user = { email: "alt@example.invalid", legalPulseSettings: { enabled: false } };
    expect(pulseEmailsDisabled(user)).toBe(true);
    expect(profilZeigtAn(user)).toBe(false);
  });
});

describe("Boolean(undefined)-Falle (TÜV-Auflage 04.09.)", () => {
  test("Client sendet das Feld NICHT mit: es wird nichts in legalPulseSettings geschrieben", () => {
    expect(profilSchreibt(undefined)).toEqual({});
    expect(profilSchreibt({})).toEqual({});
    expect(profilSchreibt({ enabled: true })).toEqual({});
  });
});
