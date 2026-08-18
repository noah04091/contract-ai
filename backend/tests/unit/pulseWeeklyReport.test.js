/**
 * Tests für den Wochen-Wach-Bericht (buildWeeklyReportEmail, reine Funktion).
 *
 * Abgedeckt (Politur 18.08.):
 *  1. Regression: Normalfall (nichts Neues, nichts offen) bleibt die bekannte grüne Variante.
 *  2. Ehrlichkeit: offene Alt-Punkte ⇒ kein "alle Verträge aktuell / nichts zu tun" mehr.
 *  3. Singular/Plural der neuen Texte.
 *  4. Sichtbarer Abmelde-Link: übergebene Token-URL landet im Footer (statt der
 *     früheren token-losen URL, die auf der Abmelde-Seite in "fehlgeschlagen" lief).
 *  5. Kein "in den Einstellungen"-Versprechen mehr (es gab keine erreichbare Einstellungs-Seite).
 */

const { buildWeeklyReportEmail } = require("../../jobs/pulseV2WeeklyReport");

const emptyStats = (openOlderCount = 0) => ({ alerts: [], negative: [], positive: [], critical: [], openOlderCount });

const findingStats = (openOlderCount = 0) => {
  const crit = { contractName: "Arbeitsvertrag Muster GmbH", lawTitle: "BGH-Urteil zur Datenschutz-Einwilligung", severity: "critical", impactDirection: "negative" };
  return { alerts: [crit], negative: [crit], positive: [], critical: [crit], openOlderCount };
};

const base = { userName: "Noah", monitoredCount: 6, changesEvaluated: 174 };

describe("Wach-Bericht: Normalfall (Regression)", () => {
  const { subject, html } = buildWeeklyReportEmail({ ...base, stats: emptyStats(0) });

  test("Betreff bleibt die grüne Alles-aktuell-Variante", () => {
    expect(subject).toBe("🛡️ Deine Woche: alle Verträge aktuell");
  });

  test("grüne Box und Beruhigung unverändert", () => {
    expect(html).toContain("Alles im gr&uuml;nen Bereich");
    expect(html).toContain("Du musst nichts unternehmen");
    expect(html).toContain("nichts zu tun"); // Preheader
  });

  test("keine Alt-Punkte-Texte im Normalfall", () => {
    expect(html).not.toContain("&auml;ltere Punkte");
    expect(html).not.toContain("&auml;lterer Punkt");
    expect(html).not.toContain("Offene Punkte ansehen");
  });

  test("dritte Kachel sagt jetzt präzise 'neue Hinweise'", () => {
    expect(html).toContain("neue Hinweise für dich");
  });
});

describe("Wach-Bericht: nichts Neues, aber offene Alt-Punkte (Ehrlichkeits-Variante)", () => {
  const { subject, html } = buildWeeklyReportEmail({ ...base, stats: emptyStats(2) });

  test("Betreff behauptet NICHT mehr 'alle Verträge aktuell'", () => {
    expect(subject).toBe("🛡️ Deine Woche: nichts Neues, 2 Punkte noch offen");
    expect(subject).not.toContain("alle Verträge aktuell");
  });

  test("Überschrift und Box nennen die offenen Alt-Punkte", () => {
    expect(html).toContain("2 ältere Punkte warten noch");
    expect(html).toContain("sind aber noch 2 &auml;ltere Punkte offen");
    expect(html).toContain("Offene Punkte ansehen");
  });

  test("keine falsche Entwarnung mehr", () => {
    expect(html).not.toContain("Du musst nichts unternehmen");
    expect(html).not.toContain("Alles im gr&uuml;nen Bereich");
    expect(html).not.toContain("nichts zu tun"); // Preheader nennt stattdessen die offenen Punkte
    expect(html).toContain("2 ältere Punkte offen"); // Preheader
  });
});

describe("Wach-Bericht: Singular bei genau 1 offenem Alt-Punkt", () => {
  const { subject, html } = buildWeeklyReportEmail({ ...base, stats: emptyStats(1) });

  test("Betreff, Überschrift, Box und Preheader im Singular", () => {
    expect(subject).toBe("🛡️ Deine Woche: nichts Neues, 1 Punkt noch offen");
    expect(html).toContain("1 älterer Punkt wartet noch");
    expect(html).toContain("ist aber noch 1 &auml;lterer Punkt offen");
    expect(html).toContain("1 älterer Punkt offen"); // Preheader
    expect(html).not.toContain("1 ältere Punkte");
  });
});

describe("Wach-Bericht: Funde diese Woche + offene Alt-Punkte", () => {
  const { subject, html } = buildWeeklyReportEmail({ ...base, stats: findingStats(3) });

  test("Betreff bleibt die Funde-Variante", () => {
    expect(subject).toBe("⚖️ Deine Woche: 1 Punkt für dich");
  });

  test("ruhige Zusatzzeile nennt die offenen Alt-Punkte", () => {
    expect(html).toContain("Au&szlig;erdem sind aus fr&uuml;heren Wochen noch 3 &auml;ltere Punkte offen.");
  });
});

describe("Wach-Bericht: sichtbarer Abmelde-Link", () => {
  test("übergebene Token-URL landet im Footer", () => {
    const url = "https://www.contract-ai.de/abmelden?token=abc.def";
    const { html } = buildWeeklyReportEmail({ ...base, stats: emptyStats(0), unsubscribeUrl: url });
    expect(html).toContain(`href="${url}"`);
    expect(html).not.toContain("/unsubscribe?type=legal_pulse");
  });

  test("ohne Übergabe wird KEIN kaputter token-loser Fallback-Link mehr gerendert", () => {
    const { html } = buildWeeklyReportEmail({ ...base, stats: emptyStats(0) });
    expect(html).not.toContain("/unsubscribe?type=legal_pulse");
    // Der Footer-Link fehlt dann ganz (real nie erreichbar: alle Versandpfade haben E-Mail-Guards)
    expect(html).not.toContain('>Benachrichtigungen abmelden</a>');
  });

  test("kein 'in den Einstellungen'-Versprechen mehr, stattdessen ehrlicher Verweis auf den Abmelde-Link", () => {
    const { html } = buildWeeklyReportEmail({ ...base, stats: emptyStats(0) });
    expect(html).not.toContain("in den Einstellungen");
    // "unsere Benachrichtigungs-Mails" (nicht "diesen Überblick"): der Link meldet
    // von ALLEN Benachrichtigungs-Mails ab — der Text darf nichts Engeres suggerieren.
    expect(html).toContain("Benachrichtigungen abmelden&ldquo; unten in dieser E-Mail kannst du unsere Benachrichtigungs-Mails jederzeit abbestellen");
  });
});

describe("Wach-Bericht: fehlendes openOlderCount-Feld (alte Aufrufer/Test-Szenarien)", () => {
  test("verhält sich wie 0 offene Alt-Punkte", () => {
    const stats = { alerts: [], negative: [], positive: [], critical: [] }; // ohne Feld
    const { subject } = buildWeeklyReportEmail({ ...base, stats });
    expect(subject).toBe("🛡️ Deine Woche: alle Verträge aktuell");
  });
});
