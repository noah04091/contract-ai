/**
 * Migration: textHash für bestehende OptimizerV2-Ergebnisse nachträglich berechnen
 *
 * Berechnet SHA256-Hashes für alle completed Analysen ohne textHash,
 * damit die Duplikaterkennung auch retroaktiv funktioniert.
 *
 * DRY-RUN (Standard):  node backend/scripts/migrateTextHash.js
 * SCHREIBEN:           node backend/scripts/migrateTextHash.js --write
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { MongoClient } = require('mongodb');
const crypto = require('crypto');

const WRITE_MODE = process.argv.includes('--write');

async function migrate() {
  console.log(`\n=== textHash Migration ===`);
  console.log(`Modus: ${WRITE_MODE ? '✏️  SCHREIBEN' : '👀 DRY-RUN (--write zum Schreiben)'}\n`);

  const client = new MongoClient(process.env.MONGO_URI);
  await client.connect();
  const db = client.db('contract_ai');
  const collection = db.collection('optimizer_v2_results');

  // Finde alle completed Ergebnisse ohne textHash
  const results = await collection.find({
    status: 'completed',
    $or: [
      { textHash: { $exists: false } },
      { textHash: null },
      { textHash: '' }
    ]
  }).project({ _id: 1, fileName: 1, originalText: 1, createdAt: 1, userId: 1 }).toArray();

  console.log(`Gefunden: ${results.length} Ergebnisse ohne textHash\n`);

  if (results.length === 0) {
    console.log('Nichts zu tun — alle Ergebnisse haben bereits einen textHash.');
    await client.close();
    return;
  }

  let updated = 0;
  let skipped = 0;
  let duplicates = 0;
  const hashMap = new Map(); // Track hashes to detect duplicates

  for (const result of results) {
    const text = result.originalText;
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      console.log(`  SKIP  ${result._id} — ${result.fileName || 'unbekannt'} (kein originalText)`);
      skipped++;
      continue;
    }

    const hash = crypto.createHash('sha256').update(text.trim()).digest('hex');
    const shortHash = hash.substring(0, 12);

    // Track duplicates
    if (hashMap.has(hash)) {
      const existing = hashMap.get(hash);
      console.log(`  DUP   ${result._id} — ${result.fileName || 'unbekannt'} → Hash ${shortHash}... (Duplikat von ${existing.fileName})`);
      duplicates++;
    } else {
      hashMap.set(hash, { id: result._id, fileName: result.fileName });
      console.log(`  HASH  ${result._id} — ${result.fileName || 'unbekannt'} → ${shortHash}...`);
    }

    if (WRITE_MODE) {
      await collection.updateOne(
        { _id: result._id },
        { $set: { textHash: hash } }
      );
    }
    updated++;
  }

  console.log(`\n--- Ergebnis ---`);
  console.log(`Aktualisiert: ${updated}`);
  console.log(`Übersprungen:  ${skipped} (kein Text)`);
  console.log(`Duplikate:     ${duplicates} (gleicher Vertrag mehrfach analysiert)`);

  if (!WRITE_MODE && updated > 0) {
    console.log(`\n→ Nochmal mit --write ausführen um die Hashes zu schreiben.`);
  }

  await client.close();
  console.log('\nFertig.\n');
}

migrate().catch(err => {
  console.error('Migration fehlgeschlagen:', err);
  process.exit(1);
});
