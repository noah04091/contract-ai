// Test RSS Service
require('dotenv').config();
const rssService = require('./services/rssService');

(async () => {
  console.log('🧪 Testing RSS Legal Feeds Integration\n');
  console.log('=' .repeat(70));

  try {
    // Test 1: Fetch all feeds
    console.log('\n📋 Test 1: Fetching all enabled RSS feeds (last 30 days)');
    const allItems = await rssService.fetchAllFeeds({ maxAge: 30 });
    console.log(`\n📊 Results: ${allItems.length} legal updates found`);

    if (allItems.length > 0) {
      console.log('\n📰 Sample Items:');
      allItems.slice(0, 5).forEach((item, i) => {
        console.log(`\n${i + 1}. ${item.title.substring(0, 80)}`);
        console.log(`   Source: ${item.feedName}`);
        console.log(`   Date: ${item.date.toISOString().slice(0, 10)}`);
        console.log(`   Link: ${item.link}`);
      });
    }

    // Test 2: Feed statistics
    console.log('\n\n📋 Test 2: Feed Statistics');
    const stats = rssService.getFeedStats();
    console.log(`  Total feeds: ${stats.total}`);
    console.log(`  Enabled: ${stats.enabled}`);
    console.log(`  Disabled: ${stats.disabled}`);
    console.log('\n  Available feeds:');
    stats.feeds.forEach(f => {
      console.log(`    ${f.enabled ? '✅' : '❌'} ${f.id}: ${f.name} (${f.category})`);
    });

    // Test 3: Normalize for Legal Pulse
    console.log('\n\n📋 Test 3: Normalize for Legal Pulse Integration');
    const normalized = rssService.normalizeForLegalPulse(allItems.slice(0, 3));
    console.log(`  Normalized ${normalized.length} items for Legal Pulse`);
    if (normalized.length > 0) {
      console.log(`  Sample: ${normalized[0].title}`);
      console.log(`  Law ID: ${normalized[0].lawId}`);
    }

    console.log('\n' + '='.repeat(70));
    console.log('✅ RSS Integration Test Complete!');
    console.log('='.repeat(70));

    console.log(`\n💡 You now have ${allItems.length} real legal updates ready for Legal Pulse!`);

  } catch (error) {
    console.error('\n❌ Test failed:', error);
  }

  process.exit(0);
})();
