// 📁 backend/tests/unit/resolveUploadMimeType.test.js
// Stufe 1 der Dateityp-Kette (19.08.2026): Der Typ kommt aus dem INHALT, nicht aus
// dem Namen.
//
// Vorher stand in VIER getrennten Kopien von uploadToS3 dieselbe Rateregel:
//   ContentType: originalFilename?.endsWith('.docx') ? DOCX : 'application/pdf'
// Alles ohne .docx-Endung galt als PDF. Gemessen an 830 echten Vertraegen und ihren
// S3-Objekten: 32 Bild-Dateien tragen faelschlich 'application/pdf', 29 davon NEU
// (juengste 12.08.) — also kein Altbestand, sondern laufender Fehler. Und eine Datei
// ohne Endung im Namen wurde IMMER zu PDF, was am 18.08. die korrekte Etikettierung
// eines echten Word-Vertrags ueberschrieben hat.
//
// Zentrale Zusicherung dieser Tests: Die neue Regel ist FAIL-SAFE. Sie kann nie ein
// schlechteres Ergebnis liefern als die alte, weil sie bei Unerkennbarem exakt auf
// die alte Regel zurueckfaellt.

const { resolveUploadMimeType, DOCX_MIME, PDF_MIME } = require('../../utils/resolveUploadMimeType');

const PDF = () => Buffer.from('%PDF-1.7 irgendein Inhalt');
const DOCX = () => Buffer.concat([
  Buffer.from([0x50, 0x4b, 0x03, 0x04]),
  Buffer.from('  [Content_Types].xml und weiterer ZIP-Inhalt')
]);
const PNG = () => Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47]), Buffer.from('rest')]);
const JPEG = () => Buffer.concat([Buffer.from([0xff, 0xd8, 0xff]), Buffer.from('rest')]);

describe('resolveUploadMimeType(): Inhalt schlaegt Name', () => {
  test('PDF wird als PDF erkannt', () => {
    expect(resolveUploadMimeType(PDF(), 'egal.docx')).toBe(PDF_MIME);
  });

  test('Word wird als Word erkannt, auch OHNE Endung im Namen', () => {
    // Genau der Fall vom 18.08.: E-Mail-Import, Name ohne Endung.
    expect(resolveUploadMimeType(DOCX(), 'Mustervergleich_RMAZ-5986359')).toBe(DOCX_MIME);
  });

  test('Bilder werden erkannt statt als PDF etikettiert', () => {
    // Der Fehler, der 32 Dateien in S3 falsch etikettiert hat.
    expect(resolveUploadMimeType(PNG(), 'Screenshot.png')).toBe('image/png');
    expect(resolveUploadMimeType(JPEG(), 'foto.jpg')).toBe('image/jpeg');
  });

  test('ein irrefuehrender Name aendert nichts am Ergebnis', () => {
    expect(resolveUploadMimeType(PNG(), 'sieht_aus_wie.pdf')).toBe('image/png');
    expect(resolveUploadMimeType(DOCX(), 'vertrag.pdf')).toBe(DOCX_MIME);
  });
});

describe('resolveUploadMimeType(): Fail-safe auf das bisherige Verhalten', () => {
  test('unerkennbarer Inhalt + .docx im Namen ergibt Word (alte Regel)', () => {
    expect(resolveUploadMimeType(Buffer.from('kein bekanntes Format'), 'x.docx')).toBe(DOCX_MIME);
  });

  test('unerkennbarer Inhalt ohne .docx ergibt PDF (alte Regel)', () => {
    expect(resolveUploadMimeType(Buffer.from('kein bekanntes Format'), 'x.pdf')).toBe(PDF_MIME);
    expect(resolveUploadMimeType(Buffer.from('kein bekanntes Format'), 'ohne-endung')).toBe(PDF_MIME);
  });

  test('Endung wird unabhaengig von Gross-/Kleinschreibung erkannt', () => {
    expect(resolveUploadMimeType(Buffer.from('unbekannt'), 'VERTRAG.DOCX')).toBe(DOCX_MIME);
  });

  test('liefert IMMER einen Wert und wirft nie', () => {
    expect(() => resolveUploadMimeType(null, null)).not.toThrow();
    expect(resolveUploadMimeType(null, null)).toBe(PDF_MIME);
    expect(resolveUploadMimeType(undefined, undefined)).toBe(PDF_MIME);
    expect(resolveUploadMimeType(Buffer.alloc(0), '')).toBe(PDF_MIME);
  });
});

// ---------------------------------------------------------------------------
// Verdrahtung: alle vier Upload-Kopien muessen umgestellt sein. Faellt eine
// zurueck, etikettiert genau dieser Weg weiter falsch — und der Hauptweg fuer
// "hochladen ohne Analyse" ist upload.js, nicht analyze.js.
// ---------------------------------------------------------------------------
const fs = require('fs');
const path = require('path');
const DATEIEN = ['analyze.js', 'upload.js', 'optimize.js', 'apiV1.js'];

describe('alle vier uploadToS3-Kopien nutzen die Inhalts-Erkennung', () => {
  test.each(DATEIEN)('%s raet den Typ nicht mehr aus der Endung', (datei) => {
    const src = fs.readFileSync(path.join(__dirname, '..', '..', 'routes', datei), 'utf8');
    const block = src.slice(src.indexOf('const uploadToS3 = async'));
    const ende = block.indexOf('\n};');
    const fn = block.slice(0, ende > 0 ? ende : 4000);

    expect(fn).toMatch(/resolveUploadMimeType\(fileBuffer, originalFilename\)/);
    expect(fn).toMatch(/ContentType: erkannterMimeType/);
    // Weder die alte Rateregel noch ein fest verdrahtetes PDF duerfen zurueckkommen.
    expect(fn).not.toMatch(/ContentType: originalFilename/);
    expect(fn).not.toMatch(/ContentType: 'application\/pdf'/);
    expect(src).toMatch(/require\("\.\.\/utils\/resolveUploadMimeType"\)/);
  });
});

describe('der erkannte Typ landet im Vertrag', () => {
  test('analyze.js reicht ihn ueber storageInfo an das Vertragsdokument durch', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', '..', 'routes', 'analyze.js'), 'utf8');
    expect(src).toMatch(/mimeType: s3Result\.mimeType/);
    expect(src).toMatch(/mimetype: storageInfo\.mimeType \|\| fileInfo\.mimetype \|\| 'application\/pdf'/);
  });

  test('upload.js legt ihn in storageInfo, das in contractData gespreadet wird', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', '..', 'routes', 'upload.js'), 'utf8');
    expect(src).toMatch(/mimetype: s3Result\.mimeType/);
    expect(src).toMatch(/\.\.\.storageInfo/);
  });
});
