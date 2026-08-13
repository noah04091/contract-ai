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
