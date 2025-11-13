// 📁 backend/jobs/runLegalPulseMonitor.js
// CLI script to run Legal Pulse Monitor
// Run via cron: 0 */6 * * * node jobs/runLegalPulseMonitor.js

require('dotenv').config();
const LegalPulseMonitor = require('./legalPulseMonitor');

async function main() {
  console.log('\n🚀 Legal Pulse Monitor Started');
  console.log('='.repeat(70));
  console.log(`Started at: ${new Date().toISOString()}\n`);

  const monitor = new LegalPulseMonitor();

  try {
    const startTime = Date.now();

    // Run full monitoring cycle
    await monitor.runFullMonitoringCycle();

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log('\n' + '='.repeat(70));
    console.log(`✅ Legal Pulse Monitor Completed (${duration}s)`);
    console.log('='.repeat(70));

    process.exit(0);

  } catch (error) {
    console.error('\n❌ Fatal error in Legal Pulse Monitor:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  } finally {
    await monitor.close();
  }
}

main();
