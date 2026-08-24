// Der „Abmelden"-Link unter jeder Fristen-Mail (24.08.2026).
//
// Anlass: Noah hat ihn in einer echten Mail geklickt und landete auf rohem JSON
// {"success":false,"error":"Kein Abmelde-Token angegeben"}. Ursache: Der Link zeigte
// auf die Daten-Schnittstelle /api/email/unsubscribe statt auf die Seite /abmelden und
// trug keinen Token; die Kategorie stand zudem in Großbuchstaben ("CALENDAR").
//
// Diese Tests nageln die ganze Kette fest: die Vorlage baut einen Token-Link auf die
// echte Seite, der Token trägt genau die Fristen-Kategorie, und eine Abmeldung darüber
// stoppt die Fristen-Mails, OHNE Legal Pulse mitzunehmen.

process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret-unsub-link";
process.env.FRONTEND_URL = "https://www.contract-ai.de";

const { __render } = require("../../services/calendarNotifier");
const {
  validateUnsubscribeToken,
  isUnsubscribed,
  EMAIL_CATEGORIES
} = require("../../services/emailUnsubscribeService");

const EMPFAENGER = "kunde@example.invalid";

function renderFristenMail(overrides = {}) {
  return __render.generateCalendarEmailTemplate({
    title: "Kündigungseingang bis 23.08.2026",
    preheader: "Deine Frist läuft",
    content: "<p>Test</p>",
    recipientEmail: EMPFAENGER,
    recipientName: "Noah",
    ...overrides
  });
}

// Zieht den href des „Abmelden"-Links aus dem gerenderten HTML.
function abmeldeLink(html) {
  const m = html.match(/<a href="([^"]+)"[^>]*>Abmelden<\/a>/);
  return m ? m[1] : null;
}

describe("Abmelden-Link in der Fristen-Mail", () => {
  test("zeigt auf die SEITE /abmelden, nicht auf die Daten-Schnittstelle", () => {
    const url = abmeldeLink(renderFristenMail());
    expect(url).toBeTruthy();
    expect(url).toContain("/abmelden?token=");
    // Genau der Fehler, den Noah gesehen hat:
    expect(url).not.toContain("/api/email/unsubscribe");
    expect(url).not.toContain("category=CALENDAR");
  });

  test("trägt einen gültigen Token mit der Fristen-Kategorie", () => {
    const url = abmeldeLink(renderFristenMail());
    const token = decodeURIComponent(new URL(url).searchParams.get("token"));
    const decoded = validateUnsubscribeToken(token);
    expect(decoded).toBeTruthy();
    expect(decoded.email).toBe(EMPFAENGER);
    // Kleingeschrieben und exakt die Kategorie, die das Versand-Tor prüft:
    expect(decoded.category).toBe(EMAIL_CATEGORIES.CALENDAR);
    expect(decoded.category).toBe("calendar");
  });

  test("ohne Empfänger-Adresse: nackte Seite statt Ausnahme (die Mail darf nie sterben)", () => {
    let html;
    expect(() => { html = renderFristenMail({ recipientEmail: undefined }); }).not.toThrow();
    expect(abmeldeLink(html)).toBe("https://www.contract-ai.de/abmelden");
  });

  test("die Abmeldung darüber stoppt Fristen-Mails und lässt Legal Pulse an", async () => {
    // Nutzer-Zustand NACH einem Klick auf den Link (Fristen-Kategorie abgemeldet).
    const user = {
      email: EMPFAENGER,
      emailPreferences: { calendar: false },
      legalPulseSettings: { enabled: true, emailNotifications: true }
    };
    const db = {
      collection: (name) => ({
        findOne: async () => (name === "users" ? user : null)
      })
    };

    await expect(isUnsubscribed(db, EMPFAENGER, EMAIL_CATEGORIES.CALENDAR)).resolves.toBe(true);
    await expect(isUnsubscribed(db, EMPFAENGER, EMAIL_CATEGORIES.LEGAL_PULSE)).resolves.toBe(false);
  });

  test("umgekehrt: Legal Pulse abgemeldet lässt die Fristen-Mails laufen", async () => {
    const user = {
      email: EMPFAENGER,
      emailPreferences: {},
      legalPulseSettings: { enabled: true, emailNotifications: false }
    };
    const db = { collection: () => ({ findOne: async () => user }) };

    await expect(isUnsubscribed(db, EMPFAENGER, EMAIL_CATEGORIES.LEGAL_PULSE)).resolves.toBe(true);
    await expect(isUnsubscribed(db, EMPFAENGER, EMAIL_CATEGORIES.CALENDAR)).resolves.toBe(false);
  });
});
