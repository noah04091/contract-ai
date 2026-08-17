// tests/unit/analyzeSaveErrorMonitoring.test.js
// Beweis-Tests für die Sichtbarkeit von Contract-Save-Fehlern in routes/analyze.js
// (17.08.2026, Stufe 1 des Analyse-Kern-Plans).
//
// Hintergrund: Der catch(saveError) (~7123) verschluckte seit 27.06.2025 jeden
// Fehler beim Speichern des Vertrags spurlos — die Analyse wurde trotzdem mit
// success:true ausgeliefert, aber die Vertragsakte trug den alten Stand
// (Update-Zweig) bzw. der Vertrag fehlte in der Liste (Neuanlage). Stufe 1 macht
// den Fall messbar (captureError → error_logs + Mail) und jeden Schaden auffindbar
// (contractId-Rückverweis im analyses-Dokument), OHNE das Kundenverhalten zu
// ändern. Diese Tests schreiben per statischer Quelltext-Analyse fest:
// (a) der catch meldet an das Alarmsystem und bleibt dabei beobachtend
//     (kein throw/return — Stufe 3 ändert das bewusst und passt DANN diesen Test an),
// (b) das analyses-Dokument trägt den contractId-Rückverweis,
// (c) der Neuanlage-Zweig trägt die ID nach, sobald sie existiert.

const fs = require("fs");
const path = require("path");

const src = fs.readFileSync(path.join(__dirname, "..", "..", "routes", "analyze.js"), "utf8");
const lines = src.split(/\r?\n/);

// Fenster-Helfer: Startzeile per Marker finden, N Folgezeilen zurückgeben
function windowAfter(marker, span) {
  const idx = lines.findIndex((l) => l.includes(marker));
  expect(idx).toBeGreaterThan(-1);
  return { idx, text: lines.slice(idx, idx + span).join("\n") };
}

describe("routes/analyze.js: Contract-Save-Fehler ist nicht mehr unsichtbar", () => {
  test("es gibt genau einen catch(saveError)-Block", () => {
    const matches = src.match(/catch \(saveError\)/g) || [];
    expect(matches).toHaveLength(1);
  });

  test("der catch meldet an captureError mit severity high", () => {
    const { text } = windowAfter("} catch (saveError) {", 40);
    expect(text).toMatch(/captureError\(saveError/);
    expect(text).toMatch(/severity: 'high'/);
    expect(text).toMatch(/errorMonitoring/);
  });

  test("der catch loggt den Stack (Fehlerzeile in 7500 Zeilen auffindbar)", () => {
    const { text } = windowAfter("} catch (saveError) {", 5);
    expect(text).toMatch(/saveError\.stack/);
  });

  test("Stufe-1-Semantik: der catch beobachtet nur — kein throw, kein return", () => {
    // Wer hier ein throw/return einbaut, ändert das Kundenverhalten (Stufe 3).
    // Das ist erlaubt, aber nur als bewusste Entscheidung: dann diesen Test anpassen.
    const { text } = windowAfter("} catch (saveError) {", 40);
    expect(text).not.toMatch(/throw /);
    expect(text).not.toMatch(/return res\./);
  });

  test("die Alarmierung ist gekapselt (eigenes try/catch, gefährdet die Antwort nie)", () => {
    const { text } = windowAfter("} catch (saveError) {", 40);
    expect(text).toMatch(/catch \(monitorErr\)/);
  });
});

describe("routes/analyze.js: analyses-Dokument kennt seinen Vertrag", () => {
  test("analysisData enthält den contractId-Rückverweis", () => {
    const { text } = windowAfter("const analysisData = {", 20);
    expect(text).toMatch(/contractId: existingContract\?\._id \|\| null/);
  });

  test("Neuanlage trägt die contractId nach, sobald savedContract existiert", () => {
    const idx = lines.findIndex((l) => l.includes("savedContract = await saveContractWithUpload("));
    expect(idx).toBeGreaterThan(-1);
    const text = lines.slice(idx, idx + 30).join("\n");
    expect(text).toMatch(/analysisCollection\.updateOne\(/);
    expect(text).toMatch(/contractId: savedContract\._id/);
    // Fire-and-forget: darf den Save-Fluss nicht beeinflussen
    expect(text).toMatch(/\.catch\(\(\) => \{\}\)/);
  });
});
