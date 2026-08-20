// 📁 backend/tests/unit/inlineSignedUrl.test.js
// Stufe 4 der Dateityp-Kette (20.08.2026): Die Auslieferung zwingt den Typ nicht mehr auf PDF.
//
// Vorher stand in services/fileStorage.js fest `ResponseContentType: 'application/pdf'`.
// Diese eine Zeile hat JEDE Datei als PDF ausgeliefert — auch Bilder und Word-Dokumente —
// und haette sogar einen korrekten Wert aus S3 wieder ueberschrieben. Gemessen: 136 von
// 843 Vertraegen sind gar keine PDF.
//
// Jetzt ohne Ueberschreibung: S3 liefert den Typ aus, der am Objekt steht. Der ist seit
// Stufe 3 (20.08., 775 Felder + 35 S3-Etiketten korrigiert) aus dem Datei-INHALT bestimmt.
//
// Wichtig und hier festgenagelt: Die INLINE-Anzeige haengt an ContentDisposition, NICHT
// am ContentType. Das Weglassen darf sie also nicht kaputtmachen.

// Zugangsdaten-Attrappe: getSignedUrl signiert nur lokal, es geht keine Anfrage raus.
// Muss VOR dem require stehen, weil fileStorage den S3-Client beim Laden erzeugt.
process.env.AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID || 'TESTKEY';
process.env.AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY || 'TESTSECRET';
process.env.AWS_REGION = process.env.AWS_REGION || 'eu-north-1';
process.env.S3_BUCKET_NAME = process.env.S3_BUCKET_NAME || 'test-bucket';

const { generateInlineSignedUrl } = require('../../services/fileStorage');

const PARAM = (url, name) => {
  const t = decodeURIComponent(url).split('?')[1] || '';
  return t.split('&').find(p => p.startsWith(name + '='));
};

describe('generateInlineSignedUrl: kein erzwungener PDF-Typ mehr', () => {
  test('die signierte Adresse setzt KEINEN response-content-type', async () => {
    const url = await generateInlineSignedUrl('contracts/1234-Screenshot.png', 'Screenshot.png');
    expect(url).not.toMatch(/response-content-type/i);
  });

  test('das gilt auch fuer eine Word-Datei', async () => {
    const url = await generateInlineSignedUrl('contracts/1234-AIBoost UG.docx', 'AIBoost UG.docx');
    expect(url).not.toMatch(/response-content-type/i);
  });

  test('das gilt auch fuer eine PDF (keine Sonderbehandlung mehr)', async () => {
    const url = await generateInlineSignedUrl('contracts/1234-Vertrag.pdf', 'Vertrag.pdf');
    expect(url).not.toMatch(/response-content-type/i);
  });

  test('die Inline-Anzeige bleibt erhalten (haengt an ContentDisposition)', async () => {
    const url = await generateInlineSignedUrl('contracts/1234-Vertrag.pdf', 'Vertrag.pdf');
    const cd = PARAM(url, 'response-content-disposition');
    expect(cd).toBeDefined();
    expect(cd).toMatch(/inline/);
    expect(cd).toMatch(/Vertrag\.pdf/);
  });

  test('Sonderzeichen im Dateinamen brechen die Adresse nicht', async () => {
    // RFC 5987: ASCII-Ersatz + filename*=UTF-8''… (bestehendes Verhalten, hier abgesichert)
    const url = await generateInlineSignedUrl('contracts/1234-Gebuehr.docx', 'Gebühr – Vertrag.docx');
    const cd = PARAM(url, 'response-content-disposition');
    expect(cd).toMatch(/filename\*=UTF-8''/);
    expect(url).not.toMatch(/response-content-type/i);
  });

  test('Schluessel mit Schraegstrich und Leerzeichen funktionieren', async () => {
    const url = await generateInlineSignedUrl('contracts/699c/1787-AIBoost UG (2).docx', 'AIBoost UG (2).docx');
    expect(typeof url).toBe('string');
    expect(url).toMatch(/^https:\/\//);
  });
});

describe('Quelltext-Zusicherung', () => {
  test('services/fileStorage.js verdrahtet nirgends mehr einen ContentType fest', () => {
    const src = require('fs').readFileSync(
      require('path').join(__dirname, '..', '..', 'services', 'fileStorage.js'), 'utf8'
    );
    // Kommentare duerfen den alten Wert erwaehnen, Code nicht.
    const codeZeilen = src.split(/\r?\n/).filter(z => !z.trim().startsWith('//'));
    expect(codeZeilen.join('\n')).not.toMatch(/ResponseContentType/);
  });
});
