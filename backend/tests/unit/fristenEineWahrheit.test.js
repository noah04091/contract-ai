// Eine Wahrheit für die Fristen-Kategorie (24.08.2026).
//
// Vorher gab es VIER unabhängige Aus-Schalter für dieselbe Sache. Zwei davon meinten
// wörtlich „keine Fristen-Mails": der Abmelde-Link (emailPreferences.calendar) und der
// Profil-Schalter (notificationSettings.email.contractDeadlines). Sie kannten einander
// nicht. Folgen: Das Profil zeigte „AN", während die Mails längst aus waren — und
// „Wieder anmelden" meldete Erfolg, ohne dass wieder etwas kam.
//
// Ab jetzt ist emailPreferences.calendar die einzige Wahrheit, genau wie
// emailPreferences.marketing es für den Newsletter schon war. Diese Tests nageln fest,
// dass alle Beteiligten dieselbe Frage gleich beantworten.

process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret-eine-wahrheit";

const { isUnsubscribed, EMAIL_CATEGORIES } = require("../../services/emailUnsubscribeService");

// Bildet nach, was routes/dashboardNotifications.js GET für den Profil-Schalter berechnet.
const profilZeigtAn = (user) =>
  user?.emailPreferences?.calendar !== false &&
  user?.notificationSettings?.email?.contractDeadlines !== false;

// Bildet nach, was der PUT schreibt, wenn der Kunde den Schalter umlegt.
const profilSchreibt = (an) => ({ "emailPreferences.calendar": Boolean(an) });

const dbMit = (user) => ({ collection: () => ({ findOne: async () => user }) });

describe("Fristen-Kategorie: eine Wahrheit an allen Orten", () => {
  test("frischer Kunde: Profil zeigt AN, Versand lässt durch", async () => {
    const user = { email: "neu@example.invalid" };
    expect(profilZeigtAn(user)).toBe(true);
    await expect(isUnsubscribed(dbMit(user), user.email, EMAIL_CATEGORIES.CALENDAR)).resolves.toBe(false);
  });

  test("Abmeldung per Mail-Link: Versand sperrt UND das Profil zeigt AUS", async () => {
    // Genau der Fall, der vorher auseinanderlief.
    const user = { email: "link@example.invalid", emailPreferences: { calendar: false } };
    await expect(isUnsubscribed(dbMit(user), user.email, EMAIL_CATEGORIES.CALENDAR)).resolves.toBe(true);
    expect(profilZeigtAn(user)).toBe(false);
  });

  test("Abschalten im Profil landet im selben Fach wie der Mail-Link", async () => {
    const geschrieben = profilSchreibt(false);
    expect(geschrieben).toEqual({ "emailPreferences.calendar": false });
    const user = { email: "profil@example.invalid", emailPreferences: { calendar: false } };
    await expect(isUnsubscribed(dbMit(user), user.email, EMAIL_CATEGORIES.CALENDAR)).resolves.toBe(true);
  });

  test("Wieder einschalten im Profil hebt die Sperre auch wirklich auf", async () => {
    expect(profilSchreibt(true)).toEqual({ "emailPreferences.calendar": true });
    const user = { email: "zurueck@example.invalid", emailPreferences: { calendar: true } };
    await expect(isUnsubscribed(dbMit(user), user.email, EMAIL_CATEGORIES.CALENDAR)).resolves.toBe(false);
    expect(profilZeigtAn(user)).toBe(true);
  });

  test("Der migrierte Altwert kann das Profil nur auf AUS ziehen, nie fälschlich auf AN", () => {
    // Sicherheitsleine für den Übergang: Wer den Altwert noch trägt, sieht weiterhin AUS.
    const alt = { email: "alt@example.invalid", notificationSettings: { email: { contractDeadlines: false } } };
    expect(profilZeigtAn(alt)).toBe(false);
    // Umgekehrt darf ein Altwert "true" eine echte Abmeldung NICHT überstimmen.
    const abgemeldet = {
      email: "beides@example.invalid",
      emailPreferences: { calendar: false },
      notificationSettings: { email: { contractDeadlines: true } }
    };
    expect(profilZeigtAn(abgemeldet)).toBe(false);
  });

  test("Legal Pulse bleibt von alldem unberührt (beide Richtungen)", async () => {
    const fristenAus = {
      email: "iso@example.invalid",
      emailPreferences: { calendar: false },
      legalPulseSettings: { enabled: true, emailNotifications: true }
    };
    await expect(isUnsubscribed(dbMit(fristenAus), fristenAus.email, EMAIL_CATEGORIES.LEGAL_PULSE)).resolves.toBe(false);

    const pulseAus = {
      email: "iso2@example.invalid",
      emailPreferences: {},
      legalPulseSettings: { enabled: true, emailNotifications: false }
    };
    await expect(isUnsubscribed(dbMit(pulseAus), pulseAus.email, EMAIL_CATEGORIES.CALENDAR)).resolves.toBe(false);
  });

  test("Der globale Schalter bleibt vorrangig und ein eigenes Konzept", async () => {
    // „alle E-Mails aus" sperrt die Fristen mit, auch wenn das Fristen-Fach auf AN steht.
    const user = { email: "global@example.invalid", emailOptOut: true, emailPreferences: { calendar: true } };
    await expect(isUnsubscribed(dbMit(user), user.email, EMAIL_CATEGORIES.CALENDAR)).resolves.toBe(true);
    // Genau darum muss die Abmelde-Seite beim Wieder-Anmelden ehrlich bleiben, statt
    // Erinnerungen zu versprechen (Vorgabe des Präferenz-Center-Terminals).
  });
});
