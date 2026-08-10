// tests/unit/freeReminderMails.test.js
// Beweis-Tests für Retention Stufe 1 (10.08.2026): Erinnerungs-Mails für Free-Nutzer
// hinter Env-Schalter FREE_REMINDER_MAILS_ENABLED + dezenter Business-Hinweis in Free-Mails.

const {
  freeReminderMailsEnabled,
  __render,
} = require("../../services/calendarNotifier");

describe("FREE_REMINDER_MAILS_ENABLED-Schalter", () => {
  const orig = process.env.FREE_REMINDER_MAILS_ENABLED;
  afterEach(() => {
    if (orig === undefined) delete process.env.FREE_REMINDER_MAILS_ENABLED;
    else process.env.FREE_REMINDER_MAILS_ENABLED = orig;
  });

  test("Default (Env nicht gesetzt): AUS — Verhalten wie vor dem 10.08.2026", () => {
    delete process.env.FREE_REMINDER_MAILS_ENABLED;
    expect(freeReminderMailsEnabled()).toBe(false);
  });

  test("'false' und beliebige andere Werte: AUS", () => {
    process.env.FREE_REMINDER_MAILS_ENABLED = "false";
    expect(freeReminderMailsEnabled()).toBe(false);
    process.env.FREE_REMINDER_MAILS_ENABLED = "1"; // bewusst strikt: nur "true" schaltet scharf
    expect(freeReminderMailsEnabled()).toBe(false);
  });

  test("'true': AN", () => {
    process.env.FREE_REMINDER_MAILS_ENABLED = "true";
    expect(freeReminderMailsEnabled()).toBe(true);
  });
});

describe("Business-Hinweis im Mail-Template", () => {
  const baseParams = {
    title: "Test",
    preheader: "Test",
    content: "<p>Inhalt</p>",
    ctaButtons: [{ text: "Vertrag ansehen", url: "https://www.contract-ai.de/contracts", style: "primary" }],
    quickActions: [],
    recipientEmail: "test@example.com",
    recipientName: "Max Mustermann",
  };

  test("Free-Mail (upgradeHint: true) enthält den dezenten Business-Hinweis", () => {
    const html = __render.generateCalendarEmailTemplate({ ...baseParams, upgradeHint: true });
    expect(html).toContain("kostenlosen Fristen-Wächters");
    expect(html).toContain("/pricing");
  });

  test("Bezahl-Mail (upgradeHint: false/fehlend) enthält KEINEN Hinweis", () => {
    const withFalse = __render.generateCalendarEmailTemplate({ ...baseParams, upgradeHint: false });
    const withoutParam = __render.generateCalendarEmailTemplate({ ...baseParams });
    expect(withFalse).not.toContain("kostenlosen Fristen-Wächters");
    expect(withoutParam).not.toContain("kostenlosen Fristen-Wächters");
  });

  test("Service-Charakter bleibt: Abmelden-Link und Anrede vorhanden", () => {
    const html = __render.generateCalendarEmailTemplate({ ...baseParams, upgradeHint: true });
    expect(html).toContain("Abmelden");
    expect(html).toContain("Hallo Max,");
  });
});

describe("Skip-Logik im Quelltext (statische Zusicherung)", () => {
  const fs = require("fs");
  const path = require("path");
  const src = fs.readFileSync(path.join(__dirname, "..", "..", "services", "calendarNotifier.js"), "utf8");

  test("Free-Skip ist an den Env-Schalter gebunden (kein bedingungsloser Skip mehr)", () => {
    expect(src).toMatch(/userPlan === "free" && !freeReminderMailsEnabled\(\)/);
    // der alte bedingungslose Skip darf nicht mehr existieren:
    expect(src).not.toMatch(/if \(userPlan === "free"\) \{/);
  });

  test("upgradeHint wird nur für Free-Nutzer gesetzt", () => {
    expect(src).toMatch(/upgradeHint: \(event\.user\?\.subscriptionPlan \|\| "free"\) === "free"/);
  });
});
