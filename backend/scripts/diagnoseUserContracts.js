/**
 * Diagnose-Script: Zeigt alle Verträge eines Users mit Legal Pulse Status
 *
 * Verwendung:
 *   node scripts/diagnoseUserContracts.js "kunde@email.de"
 *   node scripts/diagnoseUserContracts.js "Nachname"
 *
 * Sucht per E-Mail (exakt oder partial) ODER Name (partial, case-insensitive)
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const database = require('../config/database');
const { ObjectId } = require('mongodb');

async function main() {
  const query = process.argv[2];
  if (!query) {
    console.error('❌ Bitte E-Mail oder Name angeben: node scripts/diagnoseUserContracts.js "kunde@email.de"');
    process.exit(1);
  }

  const db = await database.connect();

  // 1. User finden (E-Mail oder Name, partial match)
  const users = await db.collection('users').find({
    $or: [
      { email: { $regex: query, $options: 'i' } },
      { firstName: { $regex: query, $options: 'i' } },
      { lastName: { $regex: query, $options: 'i' } },
      { name: { $regex: query, $options: 'i' } }
    ]
  }, {
    projection: {
      _id: 1, email: 1, firstName: 1, lastName: 1, name: 1,
      subscriptionPlan: 1, verified: 1, createdAt: 1, lastLoginAt: 1
    }
  }).toArray();

  if (users.length === 0) {
    console.error(`❌ Kein User gefunden für: "${query}"`);
    process.exit(1);
  }

  if (users.length > 5) {
    console.log(`⚠️  ${users.length} User gefunden — bitte genauer suchen:`);
    for (const u of users.slice(0, 10)) {
      console.log(`   ${u.email} (${u.firstName || ''} ${u.lastName || ''})`);
    }
    process.exit(1);
  }

  for (const user of users) {
    const userId = user._id;
    const displayName = user.firstName && user.lastName
      ? `${user.firstName} ${user.lastName}`
      : user.name || user.email;

    console.log('\n' + '='.repeat(70));
    console.log(`  USER: ${displayName}`);
    console.log('='.repeat(70));
    console.log(`  E-Mail:       ${user.email}`);
    console.log(`  User-ID:      ${userId}`);
    console.log(`  Plan:         ${user.subscriptionPlan || 'free'}`);
    console.log(`  Verifiziert:  ${user.verified ? 'Ja' : 'Nein'}`);
    console.log(`  Registriert:  ${user.createdAt ? new Date(user.createdAt).toLocaleDateString('de-DE') : '?'}`);
    console.log(`  Letzter Login: ${user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString('de-DE') : '?'}`);

    // 2. Alle Verträge des Users laden (beide userId-Formate: String + ObjectId)
    const contracts = await db.collection('contracts').find({
      $or: [
        { userId: userId },
        { userId: userId.toString() },
        { userId: new ObjectId(userId) }
      ]
    }, {
      projection: {
        _id: 1, name: 1, s3Key: 1, filePath: 1, uploadType: 1,
        createdAt: 1, uploadedAt: 1, analyzed: 1, status: 1,
        fileHash: 1, legalPulse: 1, legalLens: 1,
        contractScore: 1, isGenerated: 1, isOptimized: 1
      }
    }).sort({ createdAt: -1 }).toArray();

    console.log(`\n  📄 Verträge: ${contracts.length}`);

    if (contracts.length === 0) {
      console.log('  (keine Verträge gefunden)');
      continue;
    }

    console.log('\n' + '-'.repeat(70));

    for (let i = 0; i < contracts.length; i++) {
      const c = contracts[i];
      const ext = getFileExtension(c);
      const uploadDate = c.uploadedAt || c.createdAt;

      console.log(`\n  [${i + 1}] ${c.name || '(kein Name)'}`);
      console.log(`      ID:          ${c._id}`);
      console.log(`      Dateityp:    ${ext.toUpperCase() || '?'}`);
      console.log(`      S3-Key:      ${c.s3Key || '(kein S3-Key)'}`);
      console.log(`      Upload:      ${uploadDate ? new Date(uploadDate).toLocaleString('de-DE') : '?'}`);
      console.log(`      UploadType:  ${c.uploadType || '?'}`);
      console.log(`      Status:      ${c.status || '?'}`);
      console.log(`      Analysiert:  ${c.analyzed ? 'Ja' : 'Nein'}`);
      console.log(`      Score:       ${c.contractScore != null ? c.contractScore : '—'}`);
      console.log(`      FileHash:    ${c.fileHash ? c.fileHash.substring(0, 16) + '...' : '(kein Hash)'}`);
      console.log(`      Generated:   ${c.isGenerated ? 'Ja' : 'Nein'}`);

      // Legal Pulse Status
      const lp = c.legalPulse;
      if (lp) {
        console.log(`      --- Legal Pulse ---`);
        console.log(`      Risk Score:    ${lp.riskScore != null ? lp.riskScore : '—'}`);
        console.log(`      Health Score:  ${lp.healthScore != null ? lp.healthScore : '—'}`);
        console.log(`      AI-generiert:  ${lp.aiGenerated ? 'Ja' : 'Nein (Fallback/Basis)'}`);
        console.log(`      Letzte Prüfung: ${lp.lastChecked ? new Date(lp.lastChecked).toLocaleString('de-DE') : 'nie'}`);
        console.log(`      Summary:       ${lp.summary ? lp.summary.substring(0, 80) + '...' : '—'}`);
        console.log(`      Risiken:       ${(lp.topRisks || []).length} gefunden`);

        if (!lp.aiGenerated && lp.riskScore != null) {
          console.log(`      ⚠️  HINWEIS: Nur Basis-Analyse (kein AI-generiertes Ergebnis)`);
          console.log(`         → Wahrscheinlich DOCX-Bug: Text konnte nicht extrahiert werden`);
        }
      } else {
        console.log(`      --- Legal Pulse: NICHT VORHANDEN ---`);
        console.log(`      ⚠️  Vertrag wurde noch nie von Legal Pulse gescannt`);
      }

      // Legal Lens Status
      const ll = c.legalLens;
      if (ll && ll.preprocessStatus) {
        console.log(`      --- Legal Lens: ${ll.preprocessStatus} ---`);
      }
    }

    // 3. Duplikat-Check: Gleiche Dateinamen (ohne Extension)
    console.log('\n' + '-'.repeat(70));
    console.log('  🔍 DUPLIKAT-CHECK:');
    const nameGroups = {};
    for (const c of contracts) {
      const baseName = (c.name || '').replace(/\.(pdf|docx|doc)$/i, '').toLowerCase().trim();
      if (!baseName) continue;
      if (!nameGroups[baseName]) nameGroups[baseName] = [];
      nameGroups[baseName].push(c);
    }

    let hasDuplicates = false;
    for (const [baseName, group] of Object.entries(nameGroups)) {
      if (group.length > 1) {
        hasDuplicates = true;
        const exts = group.map(c => getFileExtension(c).toUpperCase() || '?').join(' + ');
        console.log(`  ⚠️  "${baseName}" existiert ${group.length}x (${exts})`);
        for (const c of group) {
          const lp = c.legalPulse;
          const lpStatus = lp
            ? `LP: Score ${lp.riskScore ?? '—'}, AI: ${lp.aiGenerated ? 'Ja' : 'Nein'}`
            : 'LP: nicht vorhanden';
          console.log(`      → ${c.name} (${c._id}) — ${lpStatus}`);
        }
      }
    }
    if (!hasDuplicates) {
      console.log('  ✅ Keine Duplikate gefunden');
    }

    // 4. Zusammenfassung / Diagnose
    console.log('\n' + '-'.repeat(70));
    console.log('  📋 DIAGNOSE:');

    const docxContracts = contracts.filter(c => getFileExtension(c) === 'docx');
    const pdfContracts = contracts.filter(c => getFileExtension(c) === 'pdf');
    const withLegalPulse = contracts.filter(c => c.legalPulse && c.legalPulse.riskScore != null);
    const withAiPulse = contracts.filter(c => c.legalPulse && c.legalPulse.aiGenerated === true);
    const fallbackOnly = contracts.filter(c => c.legalPulse && c.legalPulse.aiGenerated === false && c.legalPulse.riskScore != null);

    console.log(`  PDF-Verträge:      ${pdfContracts.length}`);
    console.log(`  DOCX-Verträge:     ${docxContracts.length}`);
    console.log(`  Mit Legal Pulse:   ${withLegalPulse.length} / ${contracts.length}`);
    console.log(`  Davon AI-Analyse:  ${withAiPulse.length}`);
    console.log(`  Davon Fallback:    ${fallbackOnly.length}`);

    if (docxContracts.length > 0) {
      const docxFallback = docxContracts.filter(c => c.legalPulse && c.legalPulse.aiGenerated === false);
      if (docxFallback.length > 0) {
        console.log(`\n  🔴 PROBLEM GEFUNDEN: ${docxFallback.length} DOCX-Vertrag/Verträge mit nur Basis-Analyse`);
        console.log('     → Das ist der bekannte Bug: Legal Pulse konnte DOCX nicht lesen');
        console.log('     → Fix ist deployed — nach Re-Scan wird AI-Analyse durchgeführt');
      }
    }

    const noLegalPulse = contracts.filter(c => !c.legalPulse);
    if (noLegalPulse.length > 0) {
      console.log(`\n  🟡 ${noLegalPulse.length} Vertrag/Verträge ohne Legal Pulse Ergebnis:`);
      for (const c of noLegalPulse) {
        console.log(`     → ${c.name} (${getFileExtension(c).toUpperCase()}, Upload: ${(c.uploadedAt || c.createdAt) ? new Date(c.uploadedAt || c.createdAt).toLocaleDateString('de-DE') : '?'})`);
      }
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('  Diagnose abgeschlossen.');
  console.log('='.repeat(70) + '\n');

  process.exit(0);
}

function getFileExtension(contract) {
  // Versuche Extension aus s3Key, dann aus name, dann aus filePath
  const sources = [contract.s3Key, contract.name, contract.filePath].filter(Boolean);
  for (const src of sources) {
    const match = src.match(/\.(pdf|docx|doc)$/i);
    if (match) return match[1].toLowerCase();
  }
  return '';
}

main().catch(err => {
  console.error('❌ Script-Fehler:', err.message);
  process.exit(1);
});
