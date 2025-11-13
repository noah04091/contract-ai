// 📁 backend/test-monster-contract.js
// Test the monster contract (95k tokens)

require('dotenv').config();
const { MongoClient, ObjectId } = require("mongodb");
const EmbeddingService = require('./services/embeddingService');

(async () => {
  console.log('🐉 Testing MONSTER Contract (95k tokens)\n');
  console.log('='.repeat(70));

  const mongoClient = new MongoClient(process.env.MONGO_URI);
  const embeddingService = new EmbeddingService();

  try {
    await mongoClient.connect();
    const db = mongoClient.db("contract_ai");
    const contractsCollection = db.collection("contracts");

    // Find the monster
    const contract = await contractsCollection.findOne({
      _id: new ObjectId('68b5d0f707cee62a070be31a')
    });

    if (!contract) {
      console.log('❌ Monster contract not found');
      process.exit(1);
    }

    console.log(`\n📄 Found: ${contract.name}`);
    console.log(`   _id: ${contract._id}`);

    // Extract text
    let text = "";
    if (contract.fullText) {
      text = contract.fullText;
    } else if (contract.content) {
      text = contract.content;
    }

    console.log(`\n📊 Text Stats:`);
    console.log(`   Characters: ${text.length.toLocaleString()}`);
    console.log(`   Estimated tokens: ${embeddingService.estimateTokens(text).toLocaleString()}`);

    // Pseudonymize
    text = embeddingService.pseudonymize(text);

    // Chunk using DEFAULT (should be 7000 tokens)
    console.log(`\n✂️  Chunking with DEFAULT settings (max 7000 tokens/chunk)...`);
    const startTime = Date.now();
    const chunks = embeddingService.chunkText(text);
    const endTime = Date.now();

    console.log(`   ✅ Generated ${chunks.length} chunks in ${endTime - startTime}ms\n`);

    // Check each chunk
    let maxTokens = 0;
    let problemChunks = 0;
    let totalTokens = 0;

    console.log('📊 Chunk Analysis:');
    console.log('   Chunk | Tokens | Status');
    console.log('   ' + '-'.repeat(40));

    chunks.forEach((chunk, i) => {
      const tokens = embeddingService.estimateTokens(chunk);
      totalTokens += tokens;
      if (tokens > maxTokens) maxTokens = tokens;

      const status = tokens > 8192 ? '❌ EXCEEDS' : '✅ OK';

      if (tokens > 8192) {
        problemChunks++;
      }

      // Show first 10 and last 10 chunks
      if (i < 10 || i >= chunks.length - 10) {
        console.log(`   ${(i + 1).toString().padStart(5)} | ${tokens.toLocaleString().padStart(6)} | ${status}`);
      } else if (i === 10) {
        console.log(`   ...`);
      }
    });

    console.log('\n📈 Summary:');
    console.log(`   Total chunks: ${chunks.length}`);
    console.log(`   Total tokens: ${totalTokens.toLocaleString()}`);
    console.log(`   Largest chunk: ${maxTokens.toLocaleString()} tokens`);
    console.log(`   Problem chunks: ${problemChunks}`);

    if (problemChunks === 0) {
      console.log(`\n   ✅ SUCCESS! All chunks are safe for embedding!`);
    } else {
      console.log(`\n   ❌ FAILURE! ${problemChunks} chunks exceed 8192 token limit!`);
    }

    await mongoClient.close();

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }

  console.log('\n' + '='.repeat(70));
  console.log('✅ Test Complete!');
  process.exit(0);
})();
