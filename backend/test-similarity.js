require('dotenv').config();
const EmbeddingService = require('./services/embeddingService');
const VectorStore = require('./services/vectorStore');

(async () => {
  console.log('🔍 Testing actual similarity scores...\n');

  const embeddingService = new EmbeddingService();
  const vectorStore = new VectorStore();
  await vectorStore.init();

  // The law text
  const lawText = 'Neue Gewährleistungsfristen für Kaufverträge ab 2025 Die gesetzliche Gewährleistungsfrist bei Kaufverträgen wird von 2 Jahren auf 3 Jahre verlängert. Dies betrifft alle Kaufverträge über bewegliche Sachen.';

  console.log('📜 Law:', lawText.substring(0, 100) + '...\n');

  // Generate embedding for law
  const lawEmbedding = await embeddingService.embedText(lawText);

  // Query vector store
  const results = await vectorStore.queryContracts(lawEmbedding, 10); // Top 10

  console.log('🎯 Top 10 Similar Contracts:\n');

  if (results.ids[0].length === 0) {
    console.log('❌ No results found!');
  } else {
    for (let i = 0; i < results.ids[0].length; i++) {
      const id = results.ids[0][i];
      const distance = results.distances[0][i];
      const similarity = (1 - distance) * 100; // Convert to percentage
      const metadata = results.metadatas[0][i];
      const document = results.documents[0][i];

      console.log(`${i + 1}. Score: ${similarity.toFixed(2)}% | ${metadata.contractName}`);
      console.log(`   Text: ${document.substring(0, 100)}...`);
      console.log(`   Threshold (85%): ${similarity >= 85 ? '✅ MATCH' : '❌ TOO LOW'}\n`);
    }
  }

  const stats = vectorStore.getStats();
  console.log('📊 Vector Store:');
  console.log('  Total chunks:', stats.totalContractChunks);

  await vectorStore.close();
})();
