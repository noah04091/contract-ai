// 📁 backend/run-weekly-digest.js
// CLI script to process weekly digests
// Run via cron: 0 8 * * 1 node run-weekly-digest.js (Every Monday at 8 AM)

require('dotenv').config();
const DigestProcessor = require('./jobs/digestProcessor');

async function main() {
  const processor = new DigestProcessor();

  try {
    const result = await processor.processWeeklyDigests();

    console.log('\n✅ Weekly digest processing completed');
    console.log(`   Sent: ${result.sent}`);
    console.log(`   Errors: ${result.errors}`);

    // Cleanup old entries
    await processor.cleanup();

    process.exit(0);

  } catch (error) {
    console.error('❌ Fatal error processing weekly digests:', error);
    process.exit(1);
  } finally {
    await processor.close();
  }
}

main();
