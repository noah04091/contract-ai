const { MongoClient } = require('mongodb');
const crypto = require('crypto');
require('dotenv').config();

// Decrypt function (from generateV2.js)
function decrypt(encryptedData) {
  const ENCRYPTION_KEY = Buffer.from(process.env.ENCRYPTION_KEY || 'defaultkey123456789012345678901234', 'utf-8');
  const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, Buffer.from(encryptedData.iv, 'hex'));
  let decrypted = decipher.update(encryptedData.data, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

async function analyze() {
  const client = new MongoClient(process.env.MONGO_URI);
  await client.connect();

  const db = client.db();
  const generations = db.collection('contract_generations');
  const artifacts = db.collection('contract_artifacts');

  const darlehen = await generations.find({
    'meta.runLabel': 'staging-repair-pass-direct-2025-11-07',
    contractType: 'darlehen',
    'phase2.selfCheck.validatorScore': { $lt: 1.0 }
  }).toArray();

  console.log(`\n=== DARLEHEN MIT VALIDATOR-SCORE < 1.0 ===\n`);

  for (const doc of darlehen) {
    const artifact = await artifacts.findOne({ generationId: doc._id });

    console.log('═'.repeat(80));
    console.log('Variant:', doc.meta?.variant || 'unknown');
    console.log('Final Score:', doc.phase2?.selfCheck?.finalScore);
    console.log('Validator Score:', doc.phase2?.selfCheck?.validatorScore);

    if (artifact && artifact.contractText) {
      try {
        const decrypted = decrypt(artifact.contractText);
        console.log('\n📄 VERTRAG (gekürzt):');
        console.log(decrypted.substring(0, 2000));
        console.log('\n[...]');

        // Finde alle Paragraphen
        const paragraphs = decrypted.match(/§\s*\d+[^\n]*/g);
        console.log('\n📋 GEFUNDENE PARAGRAPHEN:');
        if (paragraphs) {
          paragraphs.forEach(p => console.log(`  ${p}`));
        }
      } catch (e) {
        console.log('⚠️ Konnte Vertrag nicht entschlüsseln:', e.message);
      }
    }

    console.log('\n🔍 EXPECTED MUST-CLAUSES (darlehen):');
    console.log(`  § 1 Darlehenssumme und Auszahlung|Darlehensbetrag`);
    console.log(`  § 2 Laufzeit und Fälligkeit|Rückzahlungsmodalitäten|Tilgung`);
    console.log(`  § 3 Zinsen|Zinsregelung|Verzinsung|Zinsfreiheit`);
    console.log(`  § 4 Sicherheiten|Sicherungsrechte`);
    console.log(`  § 5 Vorzeitige Rückzahlung|Sondertilgung|Vorfälligkeitsentschädigung`);
    console.log(`  § 6 Verzugszinsen und Kosten|Verzug und Folgen|Verzugsregelung`);
    console.log(`  § 7 Kündigung|Kündigungsrechte`);
    console.log(`  § 8 Informations- und Mitwirkungspflichten|Nebenpflichten`);
    console.log(`  § 9 Abtretung und Aufrechnung|Übertragung`);
    console.log(`  § 10 Schlussbestimmungen|Schlussklauseln`);

    console.log('\n');
  }

  await client.close();
}

analyze().catch(console.error);
