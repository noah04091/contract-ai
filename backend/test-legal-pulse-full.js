// 📁 backend/test-legal-pulse-full.js
// Test Full Legal Pulse Monitoring Workflow

require('dotenv').config();
const LegalPulseMonitor = require('./jobs/legalPulseMonitor');

(async () => {
  console.log('🧪 Testing Full Legal Pulse Monitoring Workflow\n');
  console.log('=' .repeat(70));
  console.log('This will:');
  console.log('  1. Fetch RSS feeds from 8 legal news sources');
  console.log('  2. Sync them to MongoDB');
  console.log('  3. Check all contracts for similarity');
  console.log('  4. Generate alerts (if matches found)');
  console.log('=' .repeat(70) + '\n');

  const monitor = new LegalPulseMonitor();

  try {
    // Initialize monitor
    console.log('📋 Initializing Legal Pulse Monitor...');
    await monitor.init();
    console.log('✅ Monitor initialized\n');

    // Run monitoring workflow
    console.log('🚀 Starting monitoring run...\n');
    await monitor.runMonitoring();

    console.log('\n✅ Test Complete!');
    console.log('=' .repeat(70));
    console.log('Next Steps:');
    console.log('  1. Check MongoDB "laws" collection for synced RSS items');
    console.log('  2. Check MongoDB "pulse_notifications" for generated alerts');
    console.log('  3. Check email inbox for alert notifications (if matches found)');
    console.log('=' .repeat(70));

  } catch (error) {
    console.error('\n❌ Test failed:', error);
  } finally {
    // Cleanup
    await monitor.close();
    process.exit(0);
  }
})();
