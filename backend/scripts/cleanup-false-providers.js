#!/usr/bin/env node
// Bereinigt falsch erkannte Provider in der Datenbank.
//
// Problem: Die alte detectProvider()-Funktion nutzte includes() statt Word-Boundaries,
// wodurch z.B. "ING" in jedem deutschen Text mit "Kündigung" etc. erkannt wurde.
//
// Dieses Script re-evaluiert alle Verträge mit dem gefixten Matching (Word-Boundaries)
// und setzt falsch erkannte Provider auf null.
//
// Nutzung:
//   node cleanup-false-providers.js          # Dry-Run (zeigt nur, was sich ändern würde)
//   node cleanup-false-providers.js --apply  # Führt die Änderungen tatsächlich durch

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { MongoClient } = require('mongodb');

// ── Provider-Datenbank (identisch mit contracts.js) ──
const providerPatterns = {
  'allianz': { displayName: 'Allianz', keywords: ['allianz', 'allianz versicherung', 'allianz ag'] },
  'axa': { displayName: 'AXA', keywords: ['axa', 'axa versicherung'] },
  'huk': { displayName: 'HUK-COBURG', keywords: ['huk', 'huk-coburg', 'huk coburg', 'huk24'] },
  'ergo': { displayName: 'ERGO', keywords: ['ergo', 'ergo versicherung', 'ergo direkt'] },
  'telekom': { displayName: 'Telekom', keywords: ['telekom', 'deutsche telekom', 't-mobile', 'magenta'] },
  'vodafone': { displayName: 'Vodafone', keywords: ['vodafone', 'vodafone deutschland'] },
  'o2': { displayName: 'O2', keywords: ['o2', 'o zwei', 'telefonica', 'telefónica'] },
  '1und1': { displayName: '1&1', keywords: ['1&1', '1und1', 'eins und eins', '1 und 1'] },
  'eon': { displayName: 'E.ON', keywords: ['eon', 'e.on', 'e-on', 'e on'] },
  'vattenfall': { displayName: 'Vattenfall', keywords: ['vattenfall', 'vattenfall europe'] },
  'netflix': { displayName: 'Netflix', keywords: ['netflix'] },
  'spotify': { displayName: 'Spotify', keywords: ['spotify', 'spotify premium'] },
  'amazon': { displayName: 'Amazon Prime', keywords: ['amazon prime', 'prime video', 'amazon', 'prime'] },
  'sky': { displayName: 'Sky', keywords: ['sky', 'sky deutschland', 'sky ticket'] },
  'mcfit': { displayName: 'McFIT', keywords: ['mcfit', 'mc fit'] },
  'clever_fit': { displayName: 'clever fit', keywords: ['clever fit', 'cleverfit', 'clever-fit'] },
  'sparkasse': { displayName: 'Sparkasse', keywords: ['sparkasse', 'stadtsparkasse', 'kreissparkasse'] },
  'ing': { displayName: 'ING', keywords: ['ing-diba', 'ing diba', 'ing bank', 'diba'] }
};

// ── Gefixte detectProvider()-Funktion (Word-Boundaries) ──
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function detectProviderFixed(text, filename = '') {
  if (!text && !filename) return null;
  const searchText = (text + ' ' + filename).toLowerCase();
  let bestMatch = null;
  let highestScore = 0;

  for (const [key, provider] of Object.entries(providerPatterns)) {
    let score = 0;
    for (const keyword of provider.keywords) {
      const keywordRegex = new RegExp(`\\b${escapeRegex(keyword)}\\b`, 'i');
      if (keywordRegex.test(searchText)) {
        score += keyword.length * 2 + 10;
      }
    }
    const displayRegex = new RegExp(`\\b${escapeRegex(provider.displayName)}\\b`, 'i');
    if (displayRegex.test(searchText)) {
      score += 20;
    }
    if (score > highestScore) {
      highestScore = score;
      bestMatch = { key, displayName: provider.displayName };
    }
  }

  return (bestMatch && highestScore >= 20) ? bestMatch : null;
}

// ── Hauptfunktion ──
async function cleanupFalseProviders() {
  const applyChanges = process.argv.includes('--apply');
  const client = new MongoClient(process.env.MONGO_URI);

  try {
    await client.connect();
    const db = client.db('contract_ai');
    const contracts = db.collection('contracts');

    console.log('=== PROVIDER CLEANUP ===');
    console.log(`Modus: ${applyChanges ? '🔴 APPLY (Änderungen werden geschrieben!)' : '🟡 DRY-RUN (nur Anzeige)'}\n`);

    // Finde alle Verträge mit gesetztem Provider
    const withProvider = await contracts.find(
      { provider: { $ne: null, $exists: true } },
      { projection: { _id: 1, name: 1, provider: 1, content: 1, fullText: 1 } }
    ).toArray();

    console.log(`Gefunden: ${withProvider.length} Verträge mit Provider-Feld\n`);

    let unchanged = 0;
    let wouldChange = 0;
    let noContent = 0;
    const changes = [];

    for (const contract of withProvider) {
      const oldProvider = typeof contract.provider === 'string'
        ? contract.provider
        : contract.provider?.displayName || contract.provider?.name || '?';

      const text = contract.content || contract.fullText || '';
      if (!text) {
        noContent++;
        continue;
      }

      // Re-Evaluation mit gefixtem Matching
      const newResult = detectProviderFixed(text, contract.name || '');
      const newProvider = newResult ? newResult.displayName : null;

      if (newProvider && newProvider.toLowerCase() === oldProvider.toLowerCase()) {
        // Provider stimmt weiterhin → behalten
        unchanged++;
      } else {
        // Provider wurde falsch erkannt → muss bereinigt werden
        wouldChange++;
        const entry = {
          id: contract._id,
          name: contract.name || '(kein Name)',
          oldProvider,
          newProvider: newProvider || '(keiner)'
        };
        changes.push(entry);
        console.log(`  ❌ "${entry.name}" — ${oldProvider} → ${entry.newProvider}`);

        if (applyChanges) {
          if (newResult) {
            // Anderer Provider erkannt → nicht überschreiben, lieber null setzen
            // (der korrekte Provider kommt bei der nächsten Analyse)
            await contracts.updateOne(
              { _id: contract._id },
              { $set: { provider: null, updatedAt: new Date() } }
            );
          } else {
            await contracts.updateOne(
              { _id: contract._id },
              { $set: { provider: null, updatedAt: new Date() } }
            );
          }
        }
      }
    }

    console.log('\n=== ERGEBNIS ===');
    console.log(`  ✅ Korrekt erkannt (bleiben):  ${unchanged}`);
    console.log(`  ❌ Falsch erkannt (bereinigen): ${wouldChange}`);
    console.log(`  ⚠️  Kein Content (übersprungen): ${noContent}`);

    if (!applyChanges && wouldChange > 0) {
      console.log(`\n→ Um die ${wouldChange} Änderungen durchzuführen:\n  node cleanup-false-providers.js --apply`);
    }
    if (applyChanges && wouldChange > 0) {
      console.log(`\n✅ ${wouldChange} Provider-Felder auf null gesetzt.`);
      console.log('   Bei der nächsten Vertragsanalyse wird der Provider korrekt neu erkannt.');
    }

  } catch (err) {
    console.error('Fehler:', err);
  } finally {
    await client.close();
  }
}

cleanupFalseProviders();
