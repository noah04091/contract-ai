// 🗄️ MongoDB Indexes für contract_generation_secure Collection
// Optimiert Zugriff auf verschlüsselte Artefakte für Audit/Regeneration

const { MongoClient } = require('mongodb');
require('dotenv').config();

async function createSecureIndexes() {
  const client = new MongoClient(process.env.MONGO_URI);

  try {
    await client.connect();
    console.log('✅ MongoDB verbunden');

    const db = client.db();
    const collection = db.collection('contract_generation_secure');

    // Index 1: generationId (Lookup von öffentlicher Collection)
    await collection.createIndex(
      { generationId: 1 },
      {
        name: 'generationId_1',
        unique: false,
        background: true
      }
    );
    console.log('✅ Index erstellt: generationId_1');

    // Index 2: userId + createdAt (User-spezifische Abfragen)
    await collection.createIndex(
      { userId: 1, createdAt: -1 },
      {
        name: 'userId_1_createdAt_-1',
        background: true
      }
    );
    console.log('✅ Index erstellt: userId_1_createdAt_-1');

    // Index 3: contractType + createdAt (Typ-spezifische Analysen)
    await collection.createIndex(
      { contractType: 1, createdAt: -1 },
      {
        name: 'contractType_1_createdAt_-1',
        background: true
      }
    );
    console.log('✅ Index erstellt: contractType_1_createdAt_-1');

    // Index 4: createdAt (Retention/Cleanup)
    await collection.createIndex(
      { createdAt: -1 },
      {
        name: 'createdAt_-1',
        background: true
      }
    );
    console.log('✅ Index erstellt: createdAt_-1');

    // Alle Indexes anzeigen
    const indexes = await collection.listIndexes().toArray();
    console.log('\n📋 Aktuelle Indexes auf contract_generation_secure:');
    indexes.forEach(idx => {
      console.log(`  - ${idx.name}: ${JSON.stringify(idx.key)}`);
    });

    console.log('\n🎉 Alle Indexes erfolgreich erstellt!');

  } catch (error) {
    console.error('❌ Fehler beim Erstellen der Indexes:', error.message);
    throw error;

  } finally {
    await client.close();
    console.log('✅ MongoDB Verbindung geschlossen');
  }
}

// Run
createSecureIndexes()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
