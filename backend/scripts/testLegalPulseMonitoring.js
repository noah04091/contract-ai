// 📁 backend/scripts/testLegalPulseMonitoring.js
// Manual test run for Legal Pulse monitoring system

require('dotenv').config();

async function testMonitoring() {
  console.log('\n' + '='.repeat(70));
  console.log('🧪 Legal Pulse Monitoring - Manual Test Run');
  console.log('='.repeat(70) + '\n');

  try {
    // Create monitoring instance
    const LegalPulseMonitor = require('../jobs/legalPulseMonitor');
    const monitor = new LegalPulseMonitor();

    // Initialize the monitor
    console.log('🔧 Initializing monitor...');
    await monitor.init();
    console.log('✅ Monitor initialized\n');

    // Run the monitoring workflow
    console.log('🚀 Starting monitoring run...\n');
    await monitor.runMonitoring();

    console.log('\n' + '='.repeat(70));
    console.log('✅ Test run complete!');
    console.log('='.repeat(70) + '\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error during test run:', error);
    process.exit(1);
  }
}

// Run the test
testMonitoring();
