/**
 * Diagnose: was steht WIRKLICH zwischen "gekün-" und "digt" im Factoring-PDF?
 * Nur für die saubere Auswahl der hyphen-Fix-Regex.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const fs = require('fs');
const pdfParse = require('pdf-parse');

async function run() {
  const pdfPath = process.argv[2] || 'C:\\Users\\liebo\\Downloads\\170803_Kaja_Food_GmbH_FRV_OF_SP_FR.pdf';
  if (!fs.existsSync(pdfPath)) {
    console.error('Datei nicht gefunden:', pdfPath);
    process.exit(2);
  }
  const buffer = fs.readFileSync(pdfPath);
  const pdfData = await pdfParse(buffer);
  const text = pdfData.text;

  // Suche nach "gekün-" und drumherum die exakte Zeichenkette
  const targets = [
    'gekün',
    'Monatsende',
    'aus wichtigem Grunde',
    'Bindung',
    'sieben Tagen',
  ];

  for (const target of targets) {
    const idx = text.indexOf(target);
    if (idx < 0) {
      console.log(`\n[${target}] nicht gefunden`);
      continue;
    }
    const slice = text.slice(idx, idx + 60);
    const charCodes = [...slice].map(c => {
      if (c === '\n') return '\\n';
      if (c === '\r') return '\\r';
      if (c === '\t') return '\\t';
      if (c === ' ') return '·';                       // sichtbar gemachter Space
      if (c === ' ') return '·NBSP';
      if (c === '­') return '·SHY';
      if (c === '​') return '·ZWSP';
      if (c.charCodeAt(0) < 32) return `·U+${c.charCodeAt(0).toString(16).padStart(4, '0')}`;
      return c;
    }).join('');
    console.log(`\n[${target}] @ Pos ${idx}`);
    console.log(`  Slice (60 chars):`);
    console.log(`  ${slice.replace(/\n/g, '\\n').replace(/\r/g, '\\r')}`);
    console.log(`  Mit char-codes:`);
    console.log(`  ${charCodes}`);
  }
}

run().catch(e => { console.error(e); process.exit(1); });
