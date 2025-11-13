// 📁 backend/scripts/createLawIndexes.js
// Create MongoDB indexes for laws collection

const { MongoClient } = require("mongodb");
require("dotenv").config();

async function createLawIndexes() {
  console.log("🔧 Creating MongoDB indexes for laws collection...\n");
  console.log("=".repeat(60));

  const mongoClient = new MongoClient(process.env.MONGO_URI);

  try {
    await mongoClient.connect();
    const db = mongoClient.db("contract_ai");
    const lawsCollection = db.collection("laws");

    // 1. Index on contentHash for fast duplicate detection
    console.log("\n📌 Creating index on contentHash...");
    await lawsCollection.createIndex(
      { contentHash: 1 },
      {
        name: "contentHash_1",
        background: true
      }
    );
    console.log("   ✅ Created: contentHash_1");

    // 2. Index on lawId for legacy lookups
    console.log("\n📌 Creating index on lawId...");
    await lawsCollection.createIndex(
      { lawId: 1 },
      {
        name: "lawId_1",
        background: true
      }
    );
    console.log("   ✅ Created: lawId_1");

    // 3. Index on updatedAt for time-range queries
    console.log("\n📌 Creating index on updatedAt...");
    await lawsCollection.createIndex(
      { updatedAt: -1 },
      {
        name: "updatedAt_-1",
        background: true
      }
    );
    console.log("   ✅ Created: updatedAt_-1");

    // 4. Compound index for efficient deduplication queries
    console.log("\n📌 Creating compound index on contentHash + updatedAt...");
    await lawsCollection.createIndex(
      { contentHash: 1, updatedAt: -1 },
      {
        name: "contentHash_1_updatedAt_-1",
        background: true
      }
    );
    console.log("   ✅ Created: contentHash_1_updatedAt_-1");

    // List all indexes
    console.log("\n📊 All indexes in laws collection:");
    const indexes = await lawsCollection.indexes();
    indexes.forEach(index => {
      console.log(`   - ${index.name}: ${JSON.stringify(index.key)}`);
    });

    await mongoClient.close();

    console.log("\n" + "=".repeat(60));
    console.log("✅ Law indexes created successfully!");
    console.log("=".repeat(60));

  } catch (error) {
    console.error("\n❌ Error creating indexes:", error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  createLawIndexes()
    .then(() => {
      console.log("\n✅ Script finished successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n❌ Script failed:", error);
      process.exit(1);
    });
}

module.exports = createLawIndexes;
