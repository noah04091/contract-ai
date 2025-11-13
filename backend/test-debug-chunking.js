// 📁 backend/test-debug-chunking.js
// Debug warum Chunking zu große Chunks erzeugt

require('dotenv').config();
const { MongoClient } = require("mongodb");
const EmbeddingService = require('./services/embeddingService');

(async () => {
  console.log('🔍 Debugging Problematic Contracts\n');
  console.log('='.repeat(70));

  const mongoClient = new MongoClient(process.env.MONGO_URI);
  const embeddingService = new EmbeddingService();

  try {
    await mongoClient.connect();
    const db = mongoClient.db("contract_ai");
    const contractsCollection = db.collection("contracts");

    // Find ALL "Kaufvertrag - 31.8.2025" contracts
    const contracts = await contractsCollection.find({
      name: "Kaufvertrag - 31.8.2025"
    }).toArray();

    if (contracts.length === 0) {
      console.log('❌ No contracts found');
      process.exit(1);
    }

    console.log(`\n📄 Found ${contracts.length} contracts with name "Kaufvertrag - 31.8.2025"\n`);

    // Check each contract
    for (const contract of contracts) {
      console.log(`\n${'='.repeat(70)}`);
      console.log(`Contract _id: ${contract._id}`);

      // Extract text (same logic as backfillContracts.js)
      let text = "";
      if (contract.fullText) {
        text = contract.fullText;
      } else if (contract.content) {
        text = contract.content;
      }

      if (!text || text.trim().length === 0) {
        console.log(`   ⚠️  No text content - SKIP`);
        continue;
      }

      console.log(`\n📊 Text Stats:`);
      console.log(`   Characters: ${text.length.toLocaleString()}`);
      console.log(`   Estimated tokens: ${embeddingService.estimateTokens(text).toLocaleString()}`);

      // Pseudonymize
      text = embeddingService.pseudonymize(text);

      // Chunk using DEFAULT (should be 7000 tokens)
      console.log(`\n✂️  Chunking with DEFAULT settings...`);
      const chunks = embeddingService.chunkText(text);

      console.log(`   Generated ${chunks.length} chunks`);

      // Check each chunk
      let maxTokens = 0;
      let problemChunks = 0;

      chunks.forEach((chunk, i) => {
        const tokens = embeddingService.estimateTokens(chunk);
        if (tokens > maxTokens) maxTokens = tokens;

        if (tokens > 8192) {
          problemChunks++;
          console.log(`   ❌ Chunk ${i + 1}: ${tokens.toLocaleString()} tokens - EXCEEDS LIMIT!`);
          console.log(`      Chunk length: ${chunk.length.toLocaleString()} chars`);
        }
      });

      if (problemChunks === 0) {
        console.log(`   ✅ All chunks are safe!`);
        console.log(`   📊 Largest chunk: ${maxTokens.toLocaleString()} tokens`);
      } else {
        console.log(`\n   ❌ ${problemChunks} chunks exceed 8192 token limit!`);
        console.log(`   🚨 THIS CONTRACT IS THE PROBLEM!`);
      }
    }

    await mongoClient.close();

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }

  console.log('\n' + '='.repeat(70));
  console.log('✅ Debug Complete!');
  process.exit(0);
})();
