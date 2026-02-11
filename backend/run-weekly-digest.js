// 📁 backend/run-weekly-digest.js
// CLI script to process weekly digests
// Run via cron: 0 8 * * 1 node run-weekly-digest.js (Every Monday at 8 AM)

require('dotenv').config();
const DigestProcessor = require('./jobs/digestProcessor');

async function main() {
  const processor = new DigestProcessor();

  try {
    // 🆕 First, process any pending retries from previous failures
    console.log('\n📧 STEP 1: Processing pending retries...');
    const retryResult = await processor.processRetries();

    // Then process this week's digests
    console.log('\n📧 STEP 2: Processing weekly digests...');
    const result = await processor.processWeeklyDigests();

    console.log('\n✅ Weekly digest processing completed');
    console.log(`   New Digests Sent: ${result.sent}`);
    console.log(`   New Digest Errors: ${result.errors}`);
    console.log(`   Retries Processed: ${retryResult.retried}`);
    console.log(`   Retries Succeeded: ${retryResult.succeeded}`);

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
