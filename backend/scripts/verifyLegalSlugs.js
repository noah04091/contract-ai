// Verifiziert dass geplante Gesetzes-Slugs auf gesetze-im-internet.de
// tatsächlich existieren, BEVOR sie in die Supplemental-Map kommen.
//
// READ-ONLY: macht NUR HTTP GET auf die öffentliche Seite.
// Touched keine DB, keinen Singleton, keinen Production-Code.
//
// Run: node backend/scripts/verifyLegalSlugs.js

const axios = require('axios');

const CANDIDATES = [
  { slug: 'agg',           label: 'AGG (Allgemeines Gleichbehandlungsgesetz)' },
  { slug: 'kredwg',        label: 'KWG (Kreditwesengesetz)' },
  { slug: 'wphg',          label: 'WpHG (Wertpapierhandelsgesetz)' },
  { slug: 'kagb',          label: 'KAGB (Kapitalanlagegesetzbuch)' },
  { slug: 'hwo',           label: 'HwO (Handwerksordnung)' },
  { slug: 'geg',           label: 'GEG (Gebäudeenergiegesetz)' },
  { slug: 'fernusg',       label: 'FernUSG (Fernunterrichtsschutzgesetz)' },
  { slug: 'verpackg_2017', label: 'VerpackG (Verpackungsgesetz)' },
  { slug: 'elektrog_2015', label: 'ElektroG (Elektro- und Elektronikgerätegesetz)' },
];

const BASE = 'https://www.gesetze-im-internet.de';

async function checkSlug(slug, label) {
  // Wir prüfen die Inhaltsverzeichnis-Seite des Werks (existiert immer wenn das Werk auf der Site ist).
  // Das ist konservativer als __1.html (manche Gesetze haben kein § 1).
  const url = `${BASE}/${slug}/`;
  const t0 = Date.now();
  try {
    const res = await axios.get(url, {
      timeout: 10000,
      maxRedirects: 5,
      validateStatus: () => true, // wir wollen alle Status-Codes sehen
      headers: {
        'User-Agent': 'Mozilla/5.0 (ContractAI LegalSlug-Verifier)',
        'Accept': 'text/html',
      },
    });
    const ms = Date.now() - t0;
    return {
      slug,
      label,
      url,
      status: res.status,
      ok: res.status >= 200 && res.status < 300,
      ms,
    };
  } catch (err) {
    return {
      slug,
      label,
      url,
      status: 0,
      ok: false,
      error: err.message,
      ms: Date.now() - t0,
    };
  }
}

(async () => {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(' Legal-Slug-Verification — gesetze-im-internet.de');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const results = [];
  for (const c of CANDIDATES) {
    const r = await checkSlug(c.slug, c.label);
    results.push(r);
    const flag = r.ok ? '✅' : '❌';
    const status = r.status || (r.error ? 'ERR' : '???');
    console.log(`${flag} HTTP ${String(status).padStart(3)} · ${String(r.ms).padStart(4)}ms · ${c.label.padEnd(60)} · ${r.url}`);
    if (r.error) console.log(`   error: ${r.error}`);
  }

  const ok = results.filter(r => r.ok);
  const fail = results.filter(r => !r.ok);

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log(` Zusammenfassung: ${ok.length} OK · ${fail.length} FAIL`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  if (fail.length > 0) {
    console.log('FEHLGESCHLAGENE (gehen NICHT in die Supplemental-Map):');
    fail.forEach(r => console.log(`  - ${r.label} → slug "${r.slug}" → HTTP ${r.status}`));
    console.log('');
  }

  if (ok.length > 0) {
    console.log('VERIFIZIERTE Slugs (sicher für Supplemental-Map):');
    ok.forEach(r => console.log(`  ✓ ${r.slug.padEnd(20)} → ${r.label}`));
  }

  process.exit(0);
})();
