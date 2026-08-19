// 📧 Beweis-Tests für die DOCX-Freischaltung im E-Mail-Import (13.08.2026).
// Hintergrund: Vorfall 12.08. — Word-Mails wurden still verworfen, obwohl die
// Analyse-Pipeline DOCX längst beherrscht (mammoth). Diese Tests nageln fest,
// dass validateAttachment PDF UND DOCX akzeptiert und alles andere sauber ablehnt.

const { validateAttachment } = require("../../utils/emailImportSecurity");

// Minimaler PDF-Buffer: beginnt mit %PDF
const pdfBuffer = Buffer.from("%PDF-1.4\nTestinhalt fuer Magic-Byte-Erkennung");

// Minimaler DOCX-Buffer: ZIP-Signatur (PK) + [Content_Types].xml in den ersten 1000 Bytes
// (exakt die Heuristik von detectMimeType — DOCX ist ein ZIP-Archiv)
const docxBuffer = Buffer.concat([
  Buffer.from([0x50, 0x4b, 0x03, 0x04]),
  Buffer.from("....[Content_Types].xml...."),
]);

// JPEG-Signatur FF D8 FF
const jpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);

// Reines ZIP ohne Content_Types (z. B. .zip-Anhang)
const zipBuffer = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x00, 0x00]);

const asAttachment = (buffer, filename) => ({
  filename,
  contentType: "application/octet-stream", // bewusst irreführend — Magic Bytes müssen entscheiden
  data: buffer.toString("base64"),
});

describe("validateAttachment — PDF und DOCX erlaubt (13.08.2026)", () => {
  test("PDF wird akzeptiert (Magic Bytes, nicht Dateiname)", () => {
    const r = validateAttachment(asAttachment(pdfBuffer, "vertrag.pdf"));
    expect(r.valid).toBe(true);
    expect(r.detectedMimeType).toBe("application/pdf");
  });

  test("DOCX wird akzeptiert — der Vorfall vom 12.08. wäre damit behoben", () => {
    const r = validateAttachment(asAttachment(docxBuffer, "Mustervergleich.docx"));
    expect(r.valid).toBe(true);
    expect(r.detectedMimeType).toBe(
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );
  });

  test("JPEG wird abgelehnt — mit sprechender Fehlermeldung für die Hinweis-Mail", () => {
    const r = validateAttachment(asAttachment(jpegBuffer, "foto.jpg"));
    expect(r.valid).toBe(false);
    expect(r.error).toContain("Nur PDF- oder Word-Dateien");
  });

  test("Reines ZIP (kein DOCX) wird abgelehnt", () => {
    const r = validateAttachment(asAttachment(zipBuffer, "archiv.zip"));
    expect(r.valid).toBe(false);
  });

  test("Umbenennung schützt nicht: JPEG als .docx getarnt wird abgelehnt", () => {
    const r = validateAttachment(asAttachment(jpegBuffer, "vertrag.docx"));
    expect(r.valid).toBe(false);
  });

  test("Größenlimit greift weiter (16 MB PDF abgelehnt)", () => {
    const big = Buffer.concat([pdfBuffer, Buffer.alloc(16 * 1024 * 1024)]);
    const r = validateAttachment(asAttachment(big, "riesig.pdf"), 15);
    expect(r.valid).toBe(false);
    expect(r.error).toContain("zu groß");
  });
});

// ---------------------------------------------------------------------------
// 🐛 Regression 19.08.2026: DOCX, bei denen [Content_Types].xml NICHT vorne steht
//
// Ein DOCX ist ein ZIP, und die Reihenfolge der Archiv-Eintraege ist nicht
// festgelegt. Legt das schreibende Programm z.B. `word/numbering.xml` zuerst ab,
// stand `[Content_Types].xml` ausserhalb des alten 1000-Byte-Fensters von
// detectMimeType — die Datei galt dann als `application/zip`.
//
// An 97 echten Word-Vertraegen gemessen: 13 (grob jede achte) fielen durch. Folge
// im E-Mail-Import: ABGELEHNT mit "Nur PDF- oder Word-Dateien (.docx) erlaubt".
// Dazu scheiterte ihre nachtraegliche Erstanalyse mit "PDF-Datei beschaedigt",
// weil routes/contracts.js bei `application/zip` auf PDF zurueckfaellt.
//
// Diese Tests nageln fest, dass genau diese Bauform akzeptiert wird — und dass
// echte Archive weiterhin abgelehnt werden.
// ---------------------------------------------------------------------------

const ZIP_SIG = Buffer.from([0x50, 0x4b, 0x03, 0x04]);
const fuellung = (n) => Buffer.alloc(n, 0x41); // 'A'

// Nachbau des ECHTEN Falls: erster Eintrag word/numbering.xml,
// [Content_Types].xml erst weit hinter Byte 1000.
const docxSpaeteContentTypes = Buffer.concat([
  ZIP_SIG,
  Buffer.from("word/numbering.xml"),
  fuellung(3000),
  Buffer.from("[Content_Types].xml"),
  fuellung(500),
]);

// Variante ohne [Content_Types].xml im gelesenen Bereich — nur word/document.xml.
// Genau dieser Fall braucht das ZWEITE Merkmal.
const docxNurDocumentXml = Buffer.concat([
  ZIP_SIG,
  Buffer.from("word/numbering.xml"),
  fuellung(5000),
  Buffer.from("word/document.xml"),
  fuellung(500),
]);

// Echtes Archiv, gross, aber ohne jedes Word-Merkmal — muss abgelehnt bleiben.
const echtesZipGross = Buffer.concat([
  ZIP_SIG,
  Buffer.from("bilder/urlaub.jpg"),
  fuellung(9000),
  Buffer.from("dokumente/liste.txt"),
]);

describe("DOCX-Erkennung unabhaengig von der Archiv-Reihenfolge (19.08.2026)", () => {
  test("DOCX mit spaetem [Content_Types].xml wird akzeptiert (war der reale Fehler)", () => {
    const r = validateAttachment(asAttachment(docxSpaeteContentTypes, "AGB.docx"));
    expect(r.valid).toBe(true);
    expect(r.detectedMimeType).toBe("application/vnd.openxmlformats-officedocument.wordprocessingml.document");
  });

  test("DOCX, das nur ueber word/document.xml erkennbar ist, wird akzeptiert", () => {
    const r = validateAttachment(asAttachment(docxNurDocumentXml, "Vertrag.docx"));
    expect(r.valid).toBe(true);
    expect(r.detectedMimeType).toBe("application/vnd.openxmlformats-officedocument.wordprocessingml.document");
  });

  test("echtes Archiv ohne Word-Merkmale bleibt abgelehnt (keine Aufweichung)", () => {
    const r = validateAttachment(asAttachment(echtesZipGross, "urlaub.zip"));
    expect(r.valid).toBe(false);
    expect(r.error).toMatch(/Nur PDF- oder Word-Dateien/);
  });

  test("die Erkennung liest den GANZEN Puffer, nicht nur ein Fenster", () => {
    // Merkmal absichtlich sehr weit hinten — ein festes Fenster wuerde es verfehlen.
    const sehrSpaet = Buffer.concat([ZIP_SIG, fuellung(200000), Buffer.from("word/document.xml")]);
    const r = validateAttachment(asAttachment(sehrSpaet, "spaet.docx"));
    expect(r.valid).toBe(true);
  });
});
