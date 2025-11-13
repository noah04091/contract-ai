// Quick EUR-Lex Service Test
require('dotenv').config();
const eurlexService = require('./services/eurlexService');

(async () => {
  console.log('🧪 Testing EUR-Lex Service Integration\n');
  console.log('=' .repeat(70));

  try {
    // Test 1: Fetch recent acts (last 14 days)
    console.log('\n📋 Test 1: Recent EU Legal Acts (last 14 days)');
    const recentActs = await eurlexService.fetchRecentActs({ days: 14 });
    console.log(`  Results: ${recentActs.length} acts found`);
    if (recentActs.length > 0) {
      console.log(`  Sample: ${recentActs[0].title.substring(0, 80)}...`);
      console.log(`  Date: ${recentActs[0].date.toISOString().slice(0, 10)}`);
      console.log(`  URL: ${recentActs[0].url}`);
    }

    // Test 2: Search for specific term
    console.log('\n📋 Test 2: Search for "Datenschutz"');
    const searchResults = await eurlexService.searchEurLex({ query: 'Datenschutz', limit: 10 });
    console.log(`  Results: ${searchResults.length} documents found`);
    if (searchResults.length > 0) {
      console.log(`  Sample: ${searchResults[0].title.substring(0, 80)}...`);
    }

    // Test 3: Fetch by category
    console.log('\n📋 Test 3: Fetch by category "arbeitsrecht"');
    const categoryResults = await eurlexService.fetchByCategory('arbeitsrecht');
    console.log(`  Results: ${categoryResults.length} acts found`);

    console.log('\n' + '='.repeat(70));
    console.log('✅ EUR-Lex Integration Test Complete!');
    console.log('='.repeat(70));

  } catch (error) {
    console.error('\n❌ Test failed:', error);
  }

  process.exit(0);
})();
