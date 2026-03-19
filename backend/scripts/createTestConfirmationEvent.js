/**
 * Erstellt ein Test-Event für die Bestätigungsprüfung (CANCELLATION_CONFIRMATION_CHECK)
 * Das Event wird auf HEUTE datiert, damit es sofort testbar ist.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { MongoClient, ObjectId } = require('mongodb');

async function main() {
  const client = new MongoClient(process.env.MONGO_URI);
  await client.connect();
  const db = client.db('contract_ai');

  // Letzte Kündigung finden
  const cancellation = await db.collection('cancellations')
    .find({})
    .sort({ createdAt: -1 })
    .limit(1)
    .toArray();

  if (!cancellation.length) {
    console.log('❌ Keine Kündigungen gefunden');
    await client.close();
    return;
  }

  const c = cancellation[0];
  console.log(`✅ Letzte Kündigung gefunden:`);
  console.log(`   ID: ${c._id}`);
  console.log(`   Contract: ${c.contractName}`);
  console.log(`   Provider: ${c.provider ? (typeof c.provider === 'object' ? (c.provider.displayName || c.provider.name || 'Objekt') : c.provider) : '(kein Provider)'}`);
  console.log(`   User: ${c.userId}`);
  console.log(`   Status: ${c.status}`);
  console.log(`   Erstellt: ${c.createdAt}`);

  // Prüfen ob schon ein CANCELLATION_CONFIRMATION_CHECK Event existiert
  const existing = await db.collection('contract_events').findOne({
    type: 'CANCELLATION_CONFIRMATION_CHECK',
    'metadata.cancellationId': c._id.toString()
  });

  if (existing) {
    console.log(`\n⚠️ Es gibt bereits ein Confirmation-Check Event:`);
    console.log(`   ID: ${existing._id}`);
    console.log(`   Datum: ${existing.date}`);
    console.log(`   Status: ${existing.status}`);
  }

  // Test-Event für HEUTE erstellen
  const today = new Date();
  const providerName = c.provider
    ? (typeof c.provider === 'object' ? (c.provider.displayName || c.provider.name || '') : String(c.provider))
    : '';

  const testEvent = {
    userId: c.userId,
    contractId: c.contractId,
    contractName: c.contractName,
    title: `Kündigungsbestätigung prüfen: ${c.contractName}`,
    description: `Bitte prüfen Sie, ob Sie eine Bestätigung für die Kündigung von "${c.contractName}" erhalten haben. Falls nicht, kontaktieren Sie den Anbieter.`,
    date: today,
    type: 'CANCELLATION_CONFIRMATION_CHECK',
    severity: 'warning',
    status: 'scheduled',
    metadata: {
      provider: providerName,
      cancellationId: c._id.toString(),
      suggestedAction: 'check_confirmation'
    },
    isManual: false,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const result = await db.collection('contract_events').insertOne(testEvent);
  console.log(`\n✅ Test-Event erstellt!`);
  console.log(`   Event ID: ${result.insertedId}`);
  console.log(`   Datum: ${today.toLocaleDateString('de-DE')}`);
  console.log(`   Titel: ${testEvent.title}`);
  console.log(`\n📋 Das Event sollte jetzt im Kalender auf dem heutigen Tag sichtbar sein.`);

  await client.close();
}

main().catch(err => {
  console.error('❌ Fehler:', err);
  process.exit(1);
});
