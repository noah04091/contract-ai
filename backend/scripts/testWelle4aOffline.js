// 🖼️ Welle 4a (09.07.2026) — Offline-Round-Trip-Test Foto-Upload.
// Beweist die universelle Kette: Bild → PDF (convertImageToPdf) → Textract-OCR
// liefert den echten Vertragstext zurück. Testet mehrere Eingangsformate
// (PNG/JPEG/WebP), da ein Handy je nach Gerät unterschiedlich liefert.
// Braucht AWS-Creds (Textract) aus der .env.
// Aufruf:
//   DOTENV_CONFIG_PATH=<main-repo>/backend/.env node -r dotenv/config scripts/testWelle4aOffline.js
/* eslint-disable no-console */
const sharp = require('sharp');
const { convertImageToPdf, isImageMimetype } = require('../services/imageToPdf');
const { extractTextWithOCR } = require('../services/textractService');

let pass = 0, fail = 0;
const check = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.error(`  ❌ ${name}${detail ? ` — ${detail}` : ''}`); }
};

// Realistischer Mini-Vertrag als „Foto" (schwarzer Text auf weiß, wie abfotografiert).
const CONTRACT_LINES = [
  'DIENSTLEISTUNGSVERTRAG',
  '',
  'zwischen der Muster GmbH, Beispielstrasse 12, 10115 Berlin',
  '(nachfolgend Auftraggeber)',
  'und Anna Schmidt, Lindenweg 4, 80331 Muenchen',
  '(nachfolgend Auftragnehmerin)',
  '',
  'Paragraph 1 Vertragsgegenstand',
  'Die Auftragnehmerin erbringt Beratungsleistungen im Bereich Marketing.',
  '',
  'Paragraph 2 Verguetung',
  'Die Verguetung betraegt 4.500 EUR pro Monat zzgl. Umsatzsteuer.',
  '',
  'Paragraph 3 Laufzeit',
  'Der Vertrag beginnt am 01.09.2026 und laeuft zwoelf Monate.',
  'Die Kuendigungsfrist betraegt drei Monate zum Vertragsende.',
  '',
  'Paragraph 4 Recht',
  'Es gilt deutsches Recht. Gerichtsstand ist Berlin.'
];

function buildContractSvg() {
  const lineHeight = 46;
  const paddingTop = 80;
  const width = 1240;
  const height = paddingTop * 2 + CONTRACT_LINES.length * lineHeight;
  const texts = CONTRACT_LINES.map((line, i) => {
    if (!line) return '';
    const y = paddingTop + (i + 1) * lineHeight;
    const weight = /^(DIENSTLEISTUNGSVERTRAG|Paragraph)/.test(line) ? 'bold' : 'normal';
    const esc = line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return `<text x="80" y="${y}" font-family="DejaVu Sans, Arial, sans-serif" font-size="30" font-weight="${weight}" fill="#111111">${esc}</text>`;
  }).join('\n');
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <rect width="100%" height="100%" fill="#ffffff"/>
      ${texts}
    </svg>`
  );
}

async function run() {
  console.log('A) MIME-Erkennung');
  check('image/jpeg als Bild erkannt', isImageMimetype('image/jpeg'));
  check('image/heic als Bild erkannt', isImageMimetype('image/heic'));
  check('image/png (Grossschreibung) erkannt', isImageMimetype('IMAGE/PNG'));
  check('application/pdf NICHT als Bild', !isImageMimetype('application/pdf'));
  check('application/vnd...docx NICHT als Bild', !isImageMimetype('application/vnd.openxmlformats-officedocument.wordprocessingml.document'));

  const svg = buildContractSvg();
  const png = await sharp(svg).png().toBuffer();
  const jpg = await sharp(svg).jpeg({ quality: 92 }).toBuffer();
  const webp = await sharp(svg).webp({ quality: 92 }).toBuffer();

  console.log('\nB) Konvertierung Bild → PDF (mehrere Eingangsformate)');
  const formats = [['PNG', png, 'image/png'], ['JPEG', jpg, 'image/jpeg'], ['WebP', webp, 'image/webp']];
  const pdfs = {};
  for (const [label, buf, mime] of formats) {
    try {
      const { pdfBuffer, width, height } = await convertImageToPdf(buf, mime);
      const isPdf = pdfBuffer[0] === 0x25 && pdfBuffer[1] === 0x50; // %P
      check(`${label}: liefert gueltiges PDF (${width}x${height}px)`, isPdf && pdfBuffer.length > 1000);
      pdfs[label] = pdfBuffer;
    } catch (e) {
      check(`${label}: Konvertierung ohne Fehler`, false, e.message);
    }
  }

  console.log('\nC) OCR-Round-Trip: PDF aus Foto → Textract liest echten Vertragstext');
  // Ein Format reicht als teurer Live-OCR-Beweis (JPEG = haeufigster Handy-Fall).
  const ocr = await extractTextWithOCR(pdfs['JPEG']);
  check('OCR erfolgreich', ocr.success, ocr.error || '');
  const t = (ocr.text || '').toLowerCase();
  check('erkennt "dienstleistungsvertrag"', t.includes('dienstleistungsvertrag'));
  check('erkennt Auftraggeber-Firma "muster gmbh"', t.includes('muster gmbh'));
  check('erkennt Auftragnehmerin "anna schmidt"', t.includes('anna schmidt'));
  check('erkennt Verguetung "4.500"', t.includes('4.500') || t.includes('4 500') || t.includes('4,500'));
  check('erkennt Beginn-Datum "01.09.2026"', t.replace(/\s/g, '').includes('01.09.2026'));
  check('erkennt "deutsches recht"', t.includes('deutsches recht'));

  console.log(`\n${fail === 0 ? '🎉' : '💥'} ${pass} bestanden, ${fail} fehlgeschlagen`);
  if (fail === 0) {
    console.log('→ Ein abfotografierter Vertrag wird universell als PDF gelesen und geht in die normale Analyse.');
  }
  process.exit(fail === 0 ? 0 : 1);
}

run().catch(e => { console.error('💥', e); process.exit(1); });
