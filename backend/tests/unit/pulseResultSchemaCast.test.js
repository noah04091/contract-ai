/**
 * pulseResultSchemaCast.test.js — 02.09.2026 (Pulse-Masterplan Phase 3)
 *
 * Nagelt die Mongoose-„type"-Falle zu, die seit 22.03.2026 jeden Sonntag ganze
 * Analysen kippte: In context.relatedContracts hieß ein Feld "type", wodurch
 * Mongoose das Objekt-Literal als Typ-Deklaration las und den Pfad zu [String]
 * kompilierte. Sobald contextGathering echte Objekte {name, type, endDate}
 * lieferte (Vertrag mit Anbieter + weitere Verträge desselben Anbieters), warf
 * das Speichern CastError und die GANZE Analyse stand auf failed — unsichtbar,
 * weil cron_logs errors:0 meldete.
 */

jest.mock("@tensorflow/tfjs-node", () => ({}), { virtual: true });

const mongoose = require("mongoose");
const LegalPulseV2Result = require("../../models/LegalPulseV2Result");

const RELATED = [
  { name: "170803_Kaja_Food_GmbH_FRV_OF_SP_FR.pdf", type: "unbekannt", endDate: null },
  { name: "EisQueen_GmbH_FRV.pdf", type: "Dienstleistungsvertrag", endDate: new Date("2021-11-04") },
];

describe("LegalPulseV2Result-Schema — context.relatedContracts", () => {
  test("kompiliert als Dokument-Array, NICHT als [String] (die type-Falle)", () => {
    const pfad = LegalPulseV2Result.schema.path("context.relatedContracts");
    expect(pfad).toBeDefined();
    // Vor dem Fix: SchemaArray mit caster SchemaString → CastError bei Objekten.
    expect(pfad.constructor.name).toBe("SchemaDocumentArray");
  });

  test("echte Kontext-Objekte überstehen die Validierung und behalten alle Felder", () => {
    const doc = new LegalPulseV2Result({
      requestId: "test-cast-repro",
      userId: "aaaaaaaaaaaaaaaaaaaaaaaa",
      contractId: "bbbbbbbbbbbbbbbbbbbbbbbb",
      status: "running",
      context: { contractName: "Testvertrag", relatedContracts: RELATED },
    });
    const fehler = doc.validateSync();
    expect(fehler).toBeUndefined();

    const gespeichert = doc.toObject().context.relatedContracts;
    expect(gespeichert).toHaveLength(2);
    expect(gespeichert[0].name).toBe(RELATED[0].name);
    expect(gespeichert[0].type).toBe("unbekannt");
    expect(gespeichert[1].endDate).toEqual(new Date("2021-11-04"));
  });

  test("updateOne-Cast (der Produktivpfad aus index.js Stage 1) wirft nicht", () => {
    const q = LegalPulseV2Result.updateOne(
      { _id: new mongoose.Types.ObjectId() },
      { $set: { context: { contractName: "x", relatedContracts: RELATED } } }
    );
    expect(() => q.cast(LegalPulseV2Result)).not.toThrow();
  });

  test("Wächter gegen Wiederholung: kein context-Unterpfad kompiliert Objekt-Literale zu String-Arrays", () => {
    // Wer im context-Block ein Array von Objekt-Literalen mit einem Feld namens
    // "type" anlegt, erzeugt still ein [String]. Dieser Test schlägt dann an.
    const schema = LegalPulseV2Result.schema;
    const verdaechtig = [];
    schema.eachPath((name, typ) => {
      if (!name.startsWith("context.")) return;
      if (typ.constructor.name === "SchemaArray" && typ.caster?.instance === "String") {
        // parties ist als [String] GEWOLLT (Namen der Vertragsparteien)
        if (name !== "context.parties") verdaechtig.push(name);
      }
    });
    expect(verdaechtig).toEqual([]);
  });
});
