// 📁 backend/run-daily-digest.js
// CLI script to process daily digests
// Run via cron: 0 8 * * * node run-daily-digest.js

require('dotenv').config();
const DigestProcessor = require('./jobs/digestProcessor');

async function main() {
  const processor = new DigestProcessor();

  try {
    // 🆕 First, process any pending retries from previous failures
    console.log('\n📧 STEP 1: Processing pending retries...');
    const retryResult = await processor.processRetries();

    // Then process today's digests
    console.log('\n📧 STEP 2: Processing daily digests...');
    const result = await processor.processDailyDigests();

    console.log('\n✅ Daily digest processing completed');
    console.log(`   New Digests Sent: ${result.sent}`);
    console.log(`   New Digest Errors: ${result.errors}`);
    console.log(`   Retries Processed: ${retryResult.retried}`);
    console.log(`   Retries Succeeded: ${retryResult.succeeded}`);

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
