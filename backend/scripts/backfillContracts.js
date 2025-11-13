// 📁 backend/scripts/backfillContracts.js
// Backfill all contracts into vector store

const { MongoClient, ObjectId } = require("mongodb");
const EmbeddingService = require("../services/embeddingService");
const VectorStore = require("../services/vectorStore");
require("dotenv").config();

async function backfillContracts() {
  console.log("🚀 Starting contract backfill...");
  console.log("=" .repeat(60));

  const mongoClient = new MongoClient(process.env.MONGO_URI);
  let embeddingService;
  let vectorStore;

  try {
    // Connect to MongoDB
    await mongoClient.connect();
    const db = mongoClient.db("contract_ai");
    const contractsCollection = db.collection("contracts");

    // Initialize services
    embeddingService = new EmbeddingService();
    vectorStore = new VectorStore();
    await vectorStore.init();

    // Fetch only contracts that need indexing (incremental mode)
    // Skip contracts where lastIndexedAt >= updatedAt (already up-to-date)
    const contracts = await contractsCollection.find({
      $or: [
        { lastIndexedAt: { $exists: false } }, // Never indexed
        { lastIndexedAt: null }, // Never indexed
        { $expr: { $gt: ["$updatedAt", "$lastIndexedAt"] } } // Updated since last index
      ]
    }).toArray();

    const totalContracts = await contractsCollection.countDocuments({});
    console.log(`📄 Total contracts in database: ${totalContracts}`);
    console.log(`📄 Contracts needing indexing: ${contracts.length}\n`);

    if (contracts.length === 0) {
      console.log("✅ All contracts are up-to-date. Nothing to index.");
      return;
    }

    let totalChunks = 0;
    let processedCount = 0;
    let errorCount = 0;

    // Process contracts in batches to manage API rate limits
    const batchSize = parseInt(process.env.LEGAL_PULSE_BATCH) || 50;

    for (let i = 0; i < contracts.length; i += batchSize) {
      const batch = contracts.slice(i, i + batchSize);
      console.log(`\n📦 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(contracts.length / batchSize)}`);
      console.log(`   Contracts ${i + 1}-${Math.min(i + batchSize, contracts.length)} of ${contracts.length}`);

      for (const contract of batch) {
        try {
          // Extract text from contract
          let text = "";

          // Try different text sources in order of preference
          if (contract.fullText) {
            text = contract.fullText;
          } else if (contract.content) {
            text = contract.content;
          } else if (contract.analysis?.fullText) {
            text = contract.analysis.fullText;
          } else if (contract.parsedText) {
            text = contract.parsedText;
          } else if (contract.extractedText) {
            text = contract.extractedText;
          } else if (contract.name) {
            text = contract.name; // Fallback to just name
          }

          if (!text || text.trim().length === 0) {
            console.log(`   ⚠️  Skipping ${contract.name}: No text content`);
            continue;
          }

          // Pseudonymize sensitive data
          text = embeddingService.pseudonymize(text);

          // Chunk the text (now using token-safe chunking - default 7000 tokens/chunk)
          const chunks = embeddingService.chunkText(text); // Uses safe defaults

          if (chunks.length === 0) {
            console.log(`   ⚠️  Skipping ${contract.name}: No chunks generated`);
            continue;
          }

          // Generate embeddings for all chunks
          const embeddings = await embeddingService.embedBatch(chunks);

          // Prepare documents for vector store
          const contractDocs = chunks.map((chunk, idx) => ({
            id: `${contract._id.toString()}_chunk_${idx}`,
            embedding: embeddings[idx],
            text: chunk,
            metadata: {
              contractId: contract._id.toString(),
              userId: contract.userId,
              contractName: contract.name,
              contractType: contract.type || 'unknown',
              chunkIndex: idx,
              totalChunks: chunks.length,
              createdAt: contract.createdAt || new Date()
            }
          }));

          // Upsert to vector store
          await vectorStore.upsertContracts(contractDocs);

          // 🆕 Mark contract as indexed in MongoDB
          await contractsCollection.updateOne(
            { _id: contract._id },
            { $set: { lastIndexedAt: new Date() } }
          );

          totalChunks += chunks.length;
          processedCount++;

          console.log(`   ✅ ${contract.name}: ${chunks.length} chunks indexed`);

        } catch (error) {
          errorCount++;
          console.error(`   ❌ Error processing ${contract.name}:`, error.message);
        }
      }

      // Rate limiting between batches
      if (i + batchSize < contracts.length) {
        console.log("   ⏸️  Pausing 2s before next batch...");
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    console.log("\n" + "=".repeat(60));
    console.log("🎉 Backfill Complete!");
    console.log("=".repeat(60));
    console.log(`✅ Processed: ${processedCount}/${contracts.length} contracts`);
    console.log(`📊 Total chunks: ${totalChunks}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log(`💾 Storage: MongoDB + In-Memory`);

    const stats = vectorStore.getStats();
    console.log(`\n📈 Vector Store Stats:`);
    console.log(`   Contract chunks: ${stats.totalContractChunks}`);
    console.log(`   Law sections: ${stats.totalLawSections}`);

  } catch (error) {
    console.error("❌ Fatal error during backfill:", error);
    process.exit(1);
  } finally {
    // Cleanup
    if (vectorStore) {
      await vectorStore.close();
    }
    if (mongoClient) {
      await mongoClient.close();
    }
  }
}

// Run if executed directly
if (require.main === module) {
  backfillContracts()
    .then(() => {
      console.log("\n✅ Backfill script finished successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n❌ Backfill script failed:", error);
      process.exit(1);
    });
}

module.exports = backfillContracts;
