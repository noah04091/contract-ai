require('dotenv').config();
const { MongoClient } = require('mongodb');
const EmbeddingService = require('./services/embeddingService');

(async () => {
  console.log('🔍 Searching for DEMO contract embedding...\n');

  const client = new MongoClient(process.env.MONGO_URI);
  await client.connect();
  const db = client.db('contract_ai');

  // Get DEMO contract chunk from MongoDB
  const demoChunk = await db.collection('vector_contracts').findOne({
    'metadata.contractName': /DEMO_Kaufvertrag/
  });

  if (!demoChunk) {
    console.log('❌ DEMO contract chunk not found in vector_contracts!');
    await client.close();
    return;
  }

  console.log('✅ Found DEMO contract chunk:');
  console.log('  ID:', demoChunk.id);
  console.log('  Name:', demoChunk.metadata.contractName);
  console.log('  Text preview:', demoChunk.text.substring(0, 200) + '...\n');

  // Get law text
  const law = await db.collection('laws').findOne({
    lawId: 'BGB-2025-Gewährleistung'
  });

  if (!law) {
    console.log('❌ Law not found!');
    await client.close();
    return;
  }

  const lawText = `${law.title} ${law.description}`;
  console.log('📜 Law text:', lawText.substring(0, 150) + '...\n');

  // Calculate similarity
  const embeddingService = new EmbeddingService();

  console.log('⏳ Generating embeddings...');
  const lawEmbedding = await embeddingService.embedText(lawText);
  const contractEmbedding = demoChunk.embedding;

  // Calculate cosine similarity
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < lawEmbedding.length; i++) {
    dotProduct += lawEmbedding[i] * contractEmbedding[i];
    normA += lawEmbedding[i] * lawEmbedding[i];
    normB += contractEmbedding[i] * contractEmbedding[i];
  }

  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);

  const similarity = dotProduct / (normA * normB);
  const percentage = (similarity * 100).toFixed(2);

  console.log('\n🎯 SIMILARITY RESULT:');
  console.log('  Score:', percentage + '%');
  console.log('  Threshold (85%):', percentage >= 85 ? '✅ MATCH!' : '❌ TOO LOW');
  console.log('\n💡 Explanation:');
  if (percentage >= 85) {
    console.log('  The contract would trigger an alert!');
  } else if (percentage >= 70) {
    console.log('  Good match, but below threshold. Consider lowering threshold to 70% for testing.');
  } else {
    console.log('  Low similarity. The contract text may not be related enough to the law change.');
  }

  await client.close();
})();
