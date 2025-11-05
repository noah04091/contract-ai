// 🗄️ MongoDB Indexes für contract_generations Collection (V2 System)
// Erstellt Performance-Indizes und TTL-Index für Auto-Cleanup

require('dotenv').config();
const { MongoClient } = require('mongodb');

async function createIndexes() {
  const client = new MongoClient(process.env.MONGO_URI);

  try {
    console.log('🔌 Verbinde mit MongoDB...');
    await client.connect();
    console.log('✅ Verbunden!');

    const db = client.db();
    const collection = db.collection('contract_generations');

    console.log('\n📊 Erstelle Indizes für Collection contract_generations...\n');

    // 1. User-History (neueste zuerst)
    console.log('1️⃣  Erstelle Index: { userId: 1, meta.createdAt: -1 }');
    await collection.createIndex(
      { userId: 1, 'meta.createdAt': -1 },
      { name: 'idx_user_history' }
    );
    console.log('   ✅ User-History Index erstellt\n');

    // 2. Contract Type
    console.log('2️⃣  Erstelle Index: { contractType: 1 }');
    await collection.createIndex(
      { contractType: 1 },
      { name: 'idx_contract_type' }
    );
    console.log('   ✅ Contract Type Index erstellt\n');

    // 3. Self-Check Score
    console.log('3️⃣  Erstelle Index: { phase2.selfCheck.score: 1 }');
    await collection.createIndex(
      { 'phase2.selfCheck.score': 1 },
      { name: 'idx_selfcheck_score' }
    );
    console.log('   ✅ Self-Check Score Index erstellt\n');

    // 4. Feature Flag
    console.log('4️⃣  Erstelle Index: { meta.featureFlag: 1 }');
    await collection.createIndex(
      { 'meta.featureFlag': 1 },
      { name: 'idx_feature_flag' }
    );
    console.log('   ✅ Feature Flag Index erstellt\n');

    // 5. TTL-Index (Auto-Cleanup nach 90 Tagen)
    console.log('5️⃣  Erstelle TTL-Index: { meta.createdAt: 1 } (90 Tage)');
    await collection.createIndex(
      { 'meta.createdAt': 1 },
      { name: 'idx_ttl_cleanup', expireAfterSeconds: 7776000 }
    );
    console.log('   ✅ TTL-Index erstellt (Auto-Cleanup nach 90 Tagen)\n');

    // Liste alle Indizes
    console.log('📋 Alle Indizes in contract_generations:');
    const indexes = await collection.indexes();
    indexes.forEach((idx, i) => {
      console.log(`   ${i + 1}. ${idx.name}: ${JSON.stringify(idx.key)}`);
      if (idx.expireAfterSeconds) {
        console.log(`      → TTL: ${idx.expireAfterSeconds / 86400} Tage`);
      }
    });

    console.log('\n✅ =====================================================');
    console.log('✅ ALLE INDIZES ERFOLGREICH ERSTELLT');
    console.log('✅ =====================================================\n');

  } catch (error) {
    console.error('\n❌ Fehler:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await client.close();
    console.log('🔌 MongoDB-Verbindung geschlossen');
  }
}

createIndexes().catch(console.error);
