// 📁 backend/run-daily-digest.js
// CLI script to process daily digests
// Run via cron: 0 8 * * * node run-daily-digest.js

require('dotenv').config();
const DigestProcessor = require('./jobs/digestProcessor');

async function main() {
  const processor = new DigestProcessor();

  try {
    const result = await processor.processDailyDigests();

    console.log('\n✅ Daily digest processing completed');
    console.log(`   Sent: ${result.sent}`);
    console.log(`   Errors: ${result.errors}`);

    // Cleanup old entries
    await processor.cleanup();

    process.exit(0);

  } catch (error) {
    console.error('❌ Fatal error processing daily digests:', error);
    process.exit(1);
  } finally {
    await processor.close();
  }
}

main();
