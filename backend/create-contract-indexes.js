// 📝 MongoDB Index Migration Script für Contracts Collection
// Erstellt Performance-Indexes für Filter-Queries
// Run: node create-contract-indexes.js

require('dotenv').config();
const { MongoClient } = require('mongodb');

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('❌ MONGO_URI nicht in .env gefunden');
  process.exit(1);
}

async function createContractIndexes() {
  const client = new MongoClient(MONGO_URI);

  try {
    console.log('🔗 Verbinde mit MongoDB...');
    await client.connect();
    console.log('✅ Verbunden mit MongoDB');

    const db = client.db('contract_ai');
    const contractsCollection = db.collection('contracts');

    console.log('\n📊 Bestehende Indexes:');
    const existingIndexes = await contractsCollection.indexes();
    existingIndexes.forEach(index => {
      console.log(`  - ${index.name}: ${JSON.stringify(index.key)}`);
    });

    console.log('\n🔨 Erstelle Performance-Indexes...\n');

    // ✅ Index 1: Compound Index für Standard-Query (userId + createdAt)
    // Verwendet von: Default-Sortierung (neueste zuerst) + User-Filter
    console.log('📝 Creating compound index: { userId: 1, createdAt: -1 }');
    try {
      await contractsCollection.createIndex(
        { userId: 1, createdAt: -1 },
        { name: 'idx_userId_createdAt' }
      );
      console.log('✅ Compound index created (userId + createdAt)');
    } catch (err) {
      if (err.code === 85 || err.code === 86) {
        console.log('ℹ️  Index already exists (userId + createdAt)');
      } else {
        console.error('❌ Error creating index:', err.message);
      }
    }

    // ✅ Index 2: Status-Filter (userId + status)
    // Verwendet von: Status-Filter (aktiv, abgelaufen, gekündigt, etc.)
    console.log('\n📝 Creating index: { userId: 1, status: 1 }');
    try {
      await contractsCollection.createIndex(
        { userId: 1, status: 1 },
        { name: 'idx_userId_status' }
      );
      console.log('✅ Index created (userId + status)');
    } catch (err) {
      if (err.code === 85 || err.code === 86) {
        console.log('ℹ️  Index already exists (userId + status)');
      } else {
        console.error('❌ Error creating index:', err.message);
      }
    }

    // ✅ Index 3: Name-Sortierung & Text-Suche (userId + name)
    // Verwendet von: Name A-Z / Z-A Sortierung + Suche
    console.log('\n📝 Creating index: { userId: 1, name: 1 }');
    try {
      await contractsCollection.createIndex(
        { userId: 1, name: 1 },
        { name: 'idx_userId_name' }
      );
      console.log('✅ Index created (userId + name)');
    } catch (err) {
      if (err.code === 85 || err.code === 86) {
        console.log('ℹ️  Index already exists (userId + name)');
      } else {
        console.error('❌ Error creating index:', err.message);
      }
    }

    // ✅ Index 4: Source-Filter (userId + isGenerated)
    // Verwendet von: Quelle-Filter (Generierte Verträge)
    console.log('\n📝 Creating index: { userId: 1, isGenerated: 1 }');
    try {
      await contractsCollection.createIndex(
        { userId: 1, isGenerated: 1 },
        { name: 'idx_userId_isGenerated' }
      );
      console.log('✅ Index created (userId + isGenerated)');
    } catch (err) {
      if (err.code === 85 || err.code === 86) {
        console.log('ℹ️  Index already exists (userId + isGenerated)');
      } else {
        console.error('❌ Error creating index:', err.message);
      }
    }

    // ✅ Index 5: Source-Filter (userId + isOptimized)
    // Verwendet von: Quelle-Filter (Optimierte Verträge)
    console.log('\n📝 Creating index: { userId: 1, isOptimized: 1 }');
    try {
      await contractsCollection.createIndex(
        { userId: 1, isOptimized: 1 },
        { name: 'idx_userId_isOptimized' }
      );
      console.log('✅ Index created (userId + isOptimized)');
    } catch (err) {
      if (err.code === 85 || err.code === 86) {
        console.log('ℹ️  Index already exists (userId + isOptimized)');
      } else {
        console.error('❌ Error creating index:', err.message);
      }
    }

    // ✅ Index 6: Folder-Filter (userId + folderId)
    // Verwendet von: Folder-Filter (Contracts nach Ordnern)
    console.log('\n📝 Creating index: { userId: 1, folderId: 1 }');
    try {
      await contractsCollection.createIndex(
        { userId: 1, folderId: 1 },
        { name: 'idx_userId_folderId' }
      );
      console.log('✅ Index created (userId + folderId)');
    } catch (err) {
      if (err.code === 85 || err.code === 86) {
        console.log('ℹ️  Index already exists (userId + folderId)');
      } else {
        console.error('❌ Error creating index:', err.message);
      }
    }

    // ✅ Finale Index-Übersicht
    console.log('\n📊 Alle Indexes nach Migration:');
    const updatedIndexes = await contractsCollection.indexes();
    updatedIndexes.forEach(index => {
      console.log(`  - ${index.name}: ${JSON.stringify(index.key)}`);
    });

    console.log('\n✅ Index-Migration erfolgreich abgeschlossen!');
    console.log('🚀 Performance-Verbesserung für Filter & Sortierung aktiv');

  } catch (err) {
    console.error('❌ Fehler während der Index-Migration:', err);
    process.exit(1);
  } finally {
    await client.close();
    console.log('\n🔌 MongoDB-Verbindung geschlossen');
  }
}

// Script ausführen
createContractIndexes().catch(console.error);
