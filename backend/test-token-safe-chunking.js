// 📁 backend/test-token-safe-chunking.js
// Test Token-Safe Chunking

require('dotenv').config();
const EmbeddingService = require('./services/embeddingService');

const embeddingService = new EmbeddingService();

console.log('🧪 Testing Token-Safe Chunking\n');
console.log('='.repeat(70));

// Test 1: Small text (should be single chunk)
const smallText = 'Dies ist ein kleiner Testvertrag.';
const smallChunks = embeddingService.chunkText(smallText);
console.log(`\n✅ Test 1: Small Text (${smallText.length} chars)`);
console.log(`   Estimated tokens: ${embeddingService.estimateTokens(smallText)}`);
console.log(`   Chunks generated: ${smallChunks.length}`);

// Test 2: Medium text (~5000 tokens)
const mediumText = 'Vertragstext '.repeat(1500); // ~18,000 chars = ~4500 tokens
const mediumChunks = embeddingService.chunkText(mediumText);
console.log(`\n✅ Test 2: Medium Text (${mediumText.length.toLocaleString()} chars)`);
console.log(`   Estimated tokens: ${embeddingService.estimateTokens(mediumText).toLocaleString()}`);
console.log(`   Chunks generated: ${mediumChunks.length}`);
mediumChunks.forEach((chunk, i) => {
  const tokens = embeddingService.estimateTokens(chunk);
  console.log(`   Chunk ${i + 1}: ${tokens.toLocaleString()} tokens (${tokens > 8192 ? '❌ TOO LARGE' : '✅ OK'})`);
});

// Test 3: HUGE text (simulates the 136k token contract)
const hugeText = 'Vertragsklausel '.repeat(40000); // ~640,000 chars = ~160,000 tokens
const hugeChunks = embeddingService.chunkText(hugeText);
console.log(`\n✅ Test 3: HUGE Text (${hugeText.length.toLocaleString()} chars)`);
console.log(`   Estimated tokens: ${embeddingService.estimateTokens(hugeText).toLocaleString()}`);
console.log(`   Chunks generated: ${hugeChunks.length}`);

// Check all chunks are safe
let allSafe = true;
let maxTokens = 0;
hugeChunks.forEach((chunk, i) => {
  const tokens = embeddingService.estimateTokens(chunk);
  if (tokens > maxTokens) maxTokens = tokens;
  if (tokens > 8192) {
    allSafe = false;
    console.log(`   ❌ Chunk ${i + 1}: ${tokens.toLocaleString()} tokens - EXCEEDS LIMIT!`);
  }
});

if (allSafe) {
  console.log(`   ✅ All ${hugeChunks.length} chunks are safe!`);
  console.log(`   📊 Largest chunk: ${maxTokens.toLocaleString()} tokens`);
} else {
  console.log(`   ❌ Some chunks exceed token limit!`);
}

console.log('\n' + '='.repeat(70));
console.log('✅ Token-Safe Chunking Test Complete!');
