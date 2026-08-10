// tests/unit/analyzeCreditRefund.test.js
// Beweis-Tests für Kontingent-Fairness + Org-Plan-Vererbung in routes/analyze.js (10.08.2026).
//
// Hintergrund: analysisCount wird VOR Duplikat-/Lock-/Parse-/Validierungs-Prüfung
// atomar erhöht (Race-Schutz). Der Helfer refundAnalysisCountOnce (28.07.2026)
// erstattet den Credit bei jedem Abbruch ohne echte Analyse. Diese Tests schreiben
// (a) die Semantik des Musters fest und (b) garantieren per statischer Analyse,
// dass JEDER Early-Return im Vorprüfungs-Fenster eine Erstattung davor hat —
// wer künftig einen neuen Return einbaut und die Erstattung vergisst, wird rot.
// (c) sichert die Org-Plan-Vererbung der Analyse-Route ab.

const fs = require("fs");
const path = require("path");

// ---------------------------------------------------------------------------
// (a) Verhaltens-Semantik des Erstattungs-Musters (Spiegel von analyze.js)
// ---------------------------------------------------------------------------
function buildRefundHarness({ failUpdate = false } = {}) {
  const calls = [];
  const usersCollectionRef = {
    updateOne: async (filter, update) => {
      if (failUpdate) throw new Error("Mongo down");
      calls.push({ filter, update });
      return { modifiedCount: 1 };
    },
  };
  const state = {
    analysisCountIncremented: true,
    incrementedUserId: "user-1",
    usersCollectionRef,
  };
  // exakt die Struktur aus routes/analyze.js (refundAnalysisCountOnce)
  const refundAnalysisCountOnce = async (reason) => {
    if (state.analysisCountIncremented && state.incrementedUserId && state.usersCollectionRef) {
      try {
        await state.usersCollectionRef.updateOne(
          { _id: state.incrementedUserId },
          { $inc: { analysisCount: -1 } }
        );
        state.analysisCountIncremented = false;
      } catch (refundErr) {
        // bewusst geschluckt — Erstattungs-Fehler darf die Antwort nicht verhindern
      }
    }
  };
  return { state, calls, refundAnalysisCountOnce };
}

describe("refundAnalysisCountOnce-Semantik", () => {
  test("erstattet genau -1 und setzt das Flag auf false", async () => {
    const { state, calls, refundAnalysisCountOnce } = buildRefundHarness();
    await refundAnalysisCountOnce("Duplikat");
    expect(calls).toHaveLength(1);
    expect(calls[0].update).toEqual({ $inc: { analysisCount: -1 } });
    expect(state.analysisCountIncremented).toBe(false);
  });

  test("Doppel-Aufruf (409-Pfad + catch/disconnect) erstattet NICHT doppelt", async () => {
    const { calls, refundAnalysisCountOnce } = buildRefundHarness();
    await refundAnalysisCountOnce("Duplikat");
    await refundAnalysisCountOnce("catch-Block");
    expect(calls).toHaveLength(1);
  });

  test("ohne vorheriges Increment passiert nichts", async () => {
    const { state, calls, refundAnalysisCountOnce } = buildRefundHarness();
    state.analysisCountIncremented = false;
    await refundAnalysisCountOnce("egal");
    expect(calls).toHaveLength(0);
  });

  test("DB-Fehler bei der Erstattung wirft nicht (Antwort darf nicht scheitern)", async () => {
    const { refundAnalysisCountOnce } = buildRefundHarness({ failUpdate: true });
    await expect(refundAnalysisCountOnce("Lock")).resolves.toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// (b) Statische Vollständigkeits-Garantie gegen den echten Quelltext
// ---------------------------------------------------------------------------
describe("routes/analyze.js: jeder Early-Return im Vorprüfungs-Fenster erstattet den Credit", () => {
  const src = fs.readFileSync(path.join(__dirname, "..", "..", "routes", "analyze.js"), "utf8");
  const lines = src.split(/\r?\n/);

  // Fenster: vom Helfer (direkt nach dem Increment) bis zum letzten bekannten
  // Vorprüfungs-Return (Dokument-Validierung). Danach übernimmt der catch-Block.
  const startIdx = lines.findIndex((l) => l.includes("const refundAnalysisCountOnce"));
  const lastGuardIdx = lines.findIndex((l) => l.includes("Dokument-Validierung fehlgeschlag"));

  test("Analyse-Fenster im Quelltext gefunden", () => {
    expect(startIdx).toBeGreaterThan(0);
    expect(lastGuardIdx).toBeGreaterThan(startIdx);
  });

  test("kein ungesicherter 'return res.status(4xx)' im Vorprüfungs-Fenster", () => {
    const unguarded = [];
    let lastRefund = -Infinity;
    for (let i = startIdx + 1; i <= lastGuardIdx + 30 && i < lines.length; i++) {
      const l = lines[i];
      if (/await refundAnalysisCountOnce\(/.test(l)) lastRefund = i;
      if (/return res\.status\(4\d\d\)/.test(l)) {
        // Erstattung muss in den 20 Zeilen davor stehen (deckt Zweige ab, in denen
        // EINE Erstattung mehrere unmittelbar folgende Returns absichert)
        if (i - lastRefund > 20) unguarded.push(`Zeile ${i + 1}: ${l.trim().slice(0, 60)}`);
      }
    }
    expect(unguarded).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// (c) Org-Plan-Vererbung der Analyse-Route
// ---------------------------------------------------------------------------
describe("routes/analyze.js: Org-Plan-Vererbung", () => {
  const src = fs.readFileSync(path.join(__dirname, "..", "..", "routes", "analyze.js"), "utf8");

  test("Limit-Plan kommt aus req.user.plan (checkSubscription, inkl. Org-Vererbung)", () => {
    // Vorher: const plan = user.subscriptionPlan || "free"  → zahlende
    // Org-Mitglieder (User-Plan free, Org-Plan business/enterprise) liefen ins Free-Limit.
    expect(src).toMatch(/const plan = req\.user\.plan \|\| user\.subscriptionPlan \|\| "free"/);
  });

  test("checkSubscription setzt req.user.plan mit Org-Vererbung (Vertrags-Grundlage)", () => {
    const mw = fs.readFileSync(path.join(__dirname, "..", "..", "middleware", "checkSubscription.js"), "utf8");
    expect(mw).toMatch(/req\.user\.plan = plan/);
    expect(mw).toMatch(/Org-Plan-Vererbung/);
  });
});
