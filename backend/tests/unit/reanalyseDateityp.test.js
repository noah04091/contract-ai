// 📁 backend/tests/unit/reanalyseDateityp.test.js
// 18.08.2026: Die erneute Analyse erkennt den Dateityp aus den BYTES.
//
// Vorher stand in routes/contracts.js an beiden Stellen fest `mimetype: 'application/pdf'`
// (Async-Runner und blockierender Pfad), dazu `.pdf` als Endung der Temp-Datei.
// analyze.js entscheidet aber genau an diesem Wert, welcher Leseweg genommen wird
// (`const isPdf = fileMimetype === 'application/pdf'`, analyze.js:5364/5460).
// Folge: JEDE erneute Analyse einer DOCX lief durch den PDF-Weg, scheiterte dort
// zwangslaeufig und meldete dem Kunden „PDF-Datei beschaedigt" — obwohl er nie eine
// PDF hochgeladen hat. Real belegt 18.08. 07:03. Betroffen: 97 von 831 Vertraegen.
//
// Der Anzeigename taugt als Quelle NICHT: `contract.name` kann eine KI-Beschreibung
// sein (sanitizeContractName). Deshalb Magic Bytes.

const fs = require('fs');
const path = require('path');
const { detectMimeType } = require('../../utils/emailImportSecurity');

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

// Minimaler DOCX-Kopf: ZIP-Signatur PK + der Eintrag [Content_Types].xml
function docxAttrappe() {
  const kopf = Buffer.from([0x50, 0x4b, 0x03, 0x04]);
  const rest = Buffer.from('  [Content_Types].xml und weiterer ZIP-Inhalt');
  return Buffer.concat([kopf, rest]);
}

describe('Dateityp-Erkennung aus den Bytes', () => {
  test('erkennt DOCX', () => {
    expect(detectMimeType(docxAttrappe())).toBe(DOCX_MIME);
  });

  test('erkennt PDF', () => {
    expect(detectMimeType(Buffer.from('%PDF-1.7 irgendwas'))).toBe('application/pdf');
  });

  test('liefert null bei Unbrauchbarem (Aufrufer faellt dann auf PDF zurueck)', () => {
    expect(detectMimeType(Buffer.from('kein bekanntes Format'))).toBeNull();
    expect(detectMimeType(Buffer.alloc(0))).toBeNull();
    expect(detectMimeType(null)).toBeNull();
  });

  test('ein ZIP ohne DOCX-Kennung gilt NICHT als DOCX', () => {
    const zip = Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.from('nur ein normales Archiv')]);
    expect(detectMimeType(zip)).not.toBe(DOCX_MIME);
  });
});

describe('routes/contracts.js: Re-Analyse raet den Dateityp nicht mehr', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', '..', 'routes', 'contracts.js'), 'utf8');

  test('kein fest verdrahtetes application/pdf mehr im Re-Analyse-Pfad', () => {
    expect(src).not.toMatch(/mimetype: 'application\/pdf'/);
  });

  test('die Erkennung wird eingebunden und benutzt', () => {
    expect(src).toMatch(/require\("\.\.\/utils\/emailImportSecurity"\)/);
    expect(src).toMatch(/detectMimeType\(buffer\)/);
  });

  test('alle drei Stellen bekommen den erkannten Typ', () => {
    // 1. der Kontext, den der Async-Runner uebergeben bekommt (bgCtx)
    // 2. das fakeReq im Async-Runner selbst
    // 3. das fakeReq des blockierenden Pfads
    // Faellt eine davon zurueck auf PDF, scheitert die DOCX-Re-Analyse wieder still.
    const treffer = src.match(/mimetype: dateiTyp/g) || [];
    expect(treffer.length).toBe(3);
  });

  test('die Temp-Datei traegt die passende Endung statt immer .pdf', () => {
    expect(src).toMatch(/dateiEndung/);
    expect(src).not.toMatch(/reanalyze-\$\{id\}-\$\{Date\.now\(\)\}\.pdf/);
  });

  test('unbekannter Typ faellt auf PDF zurueck (bisheriges Verhalten bleibt)', () => {
    expect(src).toMatch(/: 'application\/pdf';/);
  });
});
