require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const LegalPulseV2Result = require('../models/LegalPulseV2Result');

(async () => {
  await mongoose.connect(process.env.MONGO_URI);

  // Get the latest results for each contract
  const results = await LegalPulseV2Result.find({ status: 'completed' })
    .sort({ createdAt: -1 })
    .lean();

  // Group by contractId, take latest
  const byContract = {};
  for (const r of results) {
    if (!byContract[r.contractId]) byContract[r.contractId] = r;
  }

  for (const [cid, r] of Object.entries(byContract)) {
    const stats = { valid: 0, questionable: 0, likely_invalid: 0, unknown: 0 };
    for (const f of r.clauseFindings) {
      stats[f.enforceability || 'unknown']++;
    }
    console.log(`\n${r.context?.contractName || cid} (${r.context?.contractType || '?'}) — Score: ${r.scores?.overall}`);
    console.log(`  ✅ valid: ${stats.valid} | ⚠️ questionable: ${stats.questionable} | ❌ likely_invalid: ${stats.likely_invalid} | ❓ unknown: ${stats.unknown}`);

    // Show likely_invalid findings
    for (const f of r.clauseFindings.filter(f => f.enforceability === 'likely_invalid')) {
      console.log(`  ❌ ${f.title} — ${f.legalBasis}`);
    }
  }

  await mongoose.disconnect();
  process.exit(0);
})();
