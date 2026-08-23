// 📁 backend/tests/unit/altesWordFormat.test.js
// 21.08.2026 — der letzte Rest der Dateityp-Kette.
//
// Das ALTE Word-Format (.doc, OLE2) fiel durch jede Byte-Erkennung. Alle drei Nutzer
// der Erkennung behandelten es daraufhin als PDF, die Analyse las es mit pdf-parse
// und der Kunde bekam „PDF-Datei beschaedigt" — obwohl er nie eine PDF hochgeladen
// hatte. Betroffen: 5 Vertraege bei 4 echten Kunden, alle noch nicht analysiert.
//
// ⚠️ ANALYSIERBAR wird das Format dadurch NICHT (mammoth beherrscht nur .docx).
// Es geht allein darum, dem Kunden die WAHRHEIT zu sagen statt einer Falschmeldung.

const fs = require('fs');
const path = require('path');
const { detectMimeType, validateAttachment } = require('../../utils/emailImportSecurity');
const { resolveUploadMimeType } = require('../../utils/resolveUploadMimeType');

const OLE = Buffer.from([0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1, 0x00, 0x00, 0x00, 0x00]);
const PDF = Buffer.from('%PDF-1.7\n%stuff');
const PNG = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
const DOCX = Buffer.concat([Buffer.from([0x50, 0x4B, 0x03, 0x04]), Buffer.from('word/document.xml')]);
const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

describe('Erkennung: altes Word-Format wird nicht mehr fuer eine PDF gehalten', () => {
  test('die OLE2-Signatur ergibt application/msword', () => {
    expect(detectMimeType(OLE)).toBe('application/msword');
  });

  test('⚠️ keine Fehlzuendung: PDF, PNG und DOCX bleiben unveraendert', () => {
    expect(detectMimeType(PDF)).toBe('application/pdf');
    expect(detectMimeType(PNG)).toBe('image/png');
    expect(detectMimeType(DOCX)).toBe(DOCX_MIME);
  });

  test('ein zu kurzer Puffer loest nichts aus', () => {
    expect(detectMimeType(Buffer.from([0xD0, 0xCF]))).toBeNull();
    expect(detectMimeType(Buffer.from([0xD0, 0xCF, 0x11, 0xE0]))).toBeNull();
  });

  test('nur die halbe Signatur reicht nicht', () => {
    const halb = Buffer.from([0xD0, 0xCF, 0x11, 0xE0, 0x00, 0x00, 0x00, 0x00]);
    expect(detectMimeType(halb)).not.toBe('application/msword');
  });
});

describe('Upload: der Typ wird jetzt wahrheitsgemaess gespeichert', () => {
  test('ein altes .doc bekommt seinen echten Typ, nicht mehr application/pdf', () => {
    expect(resolveUploadMimeType(OLE, 'Vertrag.doc')).toBe('application/msword');
  });

  test('⚠️ Regression: PDF und DOCX unveraendert', () => {
    expect(resolveUploadMimeType(PDF, 'Vertrag.pdf')).toBe('application/pdf');
    expect(resolveUploadMimeType(DOCX, 'Vertrag.docx')).toBe(DOCX_MIME);
  });

  test('unlesbarer Inhalt faellt weiterhin auf die Endung zurueck (Fail-safe)', () => {
    expect(resolveUploadMimeType(Buffer.from([1, 2, 3, 4]), 'Vertrag.docx')).toBe(DOCX_MIME);
    expect(resolveUploadMimeType(Buffer.from([1, 2, 3, 4]), 'Vertrag.irgendwas')).toBe('application/pdf');
  });
});

describe('E-Mail-Import: die Ablehnung wird verstaendlich statt raetselhaft', () => {
  const anhang = (buf) => ({ filename: 'Vertrag.doc', contentType: 'application/msword', data: buf.toString('base64') });

  test('ein altes .doc wird abgelehnt und der Grund genannt', () => {
    const r = validateAttachment(anhang(OLE));
    expect(r.valid).toBe(false);
    // Vorher: „Dateityp konnte nicht erkannt werden" — jetzt steht der erkannte Typ drin.
    expect(r.error).toMatch(/application\/msword/);
  });

  test('⚠️ Regression: PDF und DOCX werden weiterhin angenommen', () => {
    expect(validateAttachment({ filename: 'a.pdf', contentType: 'application/pdf', data: PDF.toString('base64') }).valid).toBe(true);
    expect(validateAttachment({ filename: 'a.docx', contentType: DOCX_MIME, data: DOCX.toString('base64') }).valid).toBe(true);
  });
});

describe('Beide Analyse-Wege weisen ehrlich ab', () => {
  const lies = (rel) => fs.readFileSync(path.join(__dirname, '..', '..', rel), 'utf8');

  test('der Direkt-Upload meldet LEGACY_DOC_FORMAT', () => {
    expect(lies('routes/analyze.js')).toMatch(/LEGACY_DOC_FORMAT/);
  });

  test('der Weg aus der Vertragsliste ebenfalls', () => {
    expect(lies('routes/contracts.js')).toMatch(/LEGACY_DOC_FORMAT/);
  });

  test('⚠️ die Meldung nennt dem Kunden den Ausweg, statt nur zu meckern', () => {
    for (const datei of ['routes/analyze.js', 'routes/contracts.js']) {
      expect(lies(datei)).toMatch(/als \.docx oder PDF/);
    }
  });

  test('⚠️ die Absage steht VOR dem Foto-Einwickeln, sonst greift sie zu spaet', () => {
    const src = lies('routes/analyze.js');
    expect(src.indexOf('LEGACY_DOC_FORMAT')).toBeLessThan(src.indexOf('convertImageToPdf(imgBuffer'));
  });
});
