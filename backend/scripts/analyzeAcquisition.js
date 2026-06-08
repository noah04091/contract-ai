/**
 * READ-ONLY — Auswertung des Herkunfts-Trackings.
 * Nur lesend (.find/.toArray). Kein Schreibzugriff, keine E-Mails, kein Kundenkontakt.
 *
 * Zeigt pro Herkunft: Anmeldungen, Aktivierung, Analysen, Zahler.
 * WICHTIG: greift nur für User, die sich NACH dem Tracking-Einbau registriert haben.
 *
 * Aufruf: node backend/scripts/analyzeAcquisition.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { MongoClient } = require('mongodb');

const TEST_DOMAINS = new Set(['flirt.ms']);
const isTest = (email) => TEST_DOMAINS.has((email?.split('@')[1] || '').toLowerCase());
const pct = (n, total) => total > 0 ? `${Math.round((n / total) * 100)}%` : '–';

function sourceLabel(acq) {
  if (!acq) return '(kein Tracking — vor Einbau)';
  if (acq.utm_source) return `utm:${acq.utm_source}${acq.utm_campaign ? '/' + acq.utm_campaign : ''}`;
  if (acq.referrer) {
    try { return 'ref:' + new URL(acq.referrer).hostname.replace(/^www\./, ''); } catch { return 'ref:?'; }
  }
  return 'direct (kein Referrer)';
}

async function main() {
  const client = new MongoClient(process.env.MONGO_URI);
  await client.connect();
  const db = client.db('contract_ai');

  const users = await db.collection('users').find(
    {}, { projection: { _id: 1, email: 1, subscriptionPlan: 1, stripeCustomerId: 1, role: 1, analysisCount: 1, verified: 1, acquisition: 1 } }
  ).toArray();
  const contracts = await db.collection('contracts').find({}, { projection: { userId: 1 } }).toArray();

  const contractCount = {};
  for (const c of contracts) {
    const k = c.userId ? c.userId.toString() : '∅';
    contractCount[k] = (contractCount[k] || 0) + 1;
  }

  const groups = {};
  const landing = {};
  let tracked = 0;
  for (const u of users) {
    if (isTest(u.email) || u.role === 'admin') continue;
    const label = sourceLabel(u.acquisition);
    if (u.acquisition) {
      tracked++;
      const lp = u.acquisition.landingPage || '(?)';
      landing[lp] = (landing[lp] || 0) + 1;
    }
    const g = groups[label] || (groups[label] = { signups: 0, activated: 0, analyzed: 0, paid: 0 });
    g.signups++;
    if ((contractCount[u._id.toString()] || 0) >= 1) g.activated++;
    if ((u.analysisCount || 0) >= 1) g.analyzed++;
    if (u.stripeCustomerId && ['business', 'enterprise', 'premium'].includes(u.subscriptionPlan)) g.paid++;
  }

  console.log('\n========== HERKUNFT → TRICHTER (read-only) ==========\n');
  console.log('Quelle'.padEnd(34) + 'Anmeld.  Aktiviert   Analysiert  Zahler');
  console.log('-'.repeat(70));
  Object.entries(groups).sort((a, b) => b[1].signups - a[1].signups).forEach(([label, g]) => {
    console.log(
      label.slice(0, 33).padEnd(34) +
      String(g.signups).padEnd(9) +
      `${g.activated} (${pct(g.activated, g.signups)})`.padEnd(12) +
      `${g.analyzed} (${pct(g.analyzed, g.signups)})`.padEnd(12) +
      `${g.paid}`
    );
  });

  console.log('\n--- Top-Landingpages (nur getrackte User) ---');
  Object.entries(landing).sort((a, b) => b[1] - a[1]).slice(0, 10)
    .forEach(([lp, n]) => console.log(`  ${String(n).padStart(3)}  ${lp}`));

  console.log(`\nGetrackte User (seit Einbau): ${tracked} von ${users.length} gesamt`);
  await client.close();
  console.log('\n✅ Fertig — read-only.\n');
}
main().catch(e => { console.error('Fehler:', e.message); process.exit(1); });
