require('dotenv').config();
const LegalPulseMonitor = require('./jobs/legalPulseMonitor');

(async () => {
  console.log('🧪 FINAL SMOKE TEST - Legal Pulse Auto-Monitoring\n');
  console.log('=' .repeat(70));

  const monitor = new LegalPulseMonitor();
  await monitor.init();

  console.log('\n📊 Current Configuration:');
  console.log('  Threshold:', process.env.SIMILARITY_THRESHOLD || '0.85 (DEFAULT)');
  console.log('  Top K:', process.env.TOP_K || '30 (DEFAULT)');
  console.log('  Cron Enabled:', process.env.LEGAL_PULSE_CRON_ENABLED || 'false');
  console.log('  Predictive ML:', process.env.PREDICTIVE_USE_ML || 'not set');

  console.log('\n🚀 Running monitoring workflow...\n');
  console.log('=' .repeat(70));

  await monitor.runMonitoring();

  console.log('\n' + '='.repeat(70));
  console.log('✅ SMOKE TEST COMPLETE!');
  console.log('=' .repeat(70));

  console.log('\n📝 Next Steps:');
  console.log('  1. Update backend/.env:');
  console.log('     SIMILARITY_THRESHOLD=0.60  # Recommended for better matches');
  console.log('     PREDICTIVE_USE_ML=false    # Disable tfjs-node errors');
  console.log('     LEGAL_PULSE_CRON_ENABLED=true  # Enable daily monitoring');
  console.log('\n  2. Restart backend: node backend/server.js');
  console.log('\n  3. Monitor logs for daily 03:15 UTC runs');
  console.log('\n  4. Check emails for alerts!');

  process.exit(0);
})();
