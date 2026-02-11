#!/usr/bin/env node
// 📁 backend/jobs/run-retries.js
// Process failed digest emails that are due for retry
// Run via cron: */30 * * * * node run-retries.js (every 30 minutes)

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const DigestProcessor = require('./digestProcessor');

async function main() {
  console.log('\n========================================');
  console.log('📧 DIGEST RETRY PROCESSOR');
  console.log(`Started at: ${new Date().toISOString()}`);
  console.log('========================================\n');

  const processor = new DigestProcessor();

  try {
    const result = await processor.processRetries();

    console.log('\n========================================');
    console.log('📊 RETRY RESULTS:');
    console.log(`   Processed: ${result.retried}`);
    console.log(`   Succeeded: ${result.succeeded}`);
    console.log(`   Failed: ${result.failed}`);
    console.log('========================================\n');

    await processor.close();
    process.exit(0);

  } catch (error) {
    console.error('\n❌ RETRY PROCESSING FAILED:', error);
    await processor.close();
    process.exit(1);
  }
}

main();
