/**
 * Retroactive cleanup: mark existing V2 results with non-contract filenames
 * as status="rejected_not_contract" so the Radar pool ignores them.
 *
 * DOES NOT DELETE. Only sets:
 *   status              = "rejected_not_contract"
 *   rejectionReason     = "Retroactive cleanup — filename matches non-contract pattern"
 *   document.contractType = "nicht_vertrag"
 *
 * Default: DRY-RUN (prints intended changes).
 * To actually write: node backend/scripts/markV2PoolJunk.js --commit
 *
 * Uses the same junk filename patterns as diagnoseV2Pool.js so the behaviour
 * is fully predictable and review-able from the diagnostic output.
 */

require('dotenv').config();
const database = require('../config/database');
const mongoose = require('mongoose');
const LegalPulseV2Result = require('../models/LegalPulseV2Result');
const { ObjectId } = require('mongodb');

const COMMIT = process.argv.includes('--commit');

// Filename patterns that suggest NOT a contract (must match diagnoseV2Pool.js)
const JUNK_FILENAME_PATTERNS = [
  /rechnung/i,
  /quittung/i,
  /angebot/i,
  /offerte/i,
  /bewerbung/i,
  /lebenslauf/i,
  /ausweis/i,
  /formular/i,
  /antrag(?!sbestätig)/i,
  /bestellung/i,
  /lieferschein/i,
  /mahnung/i,
  /gutschrift/i,
  /kostenvoranschlag/i,
  /honorar.?rechnung/i,
  /hon[_\s-]rechnung/i,
];

function matchesJunkPattern(filename) {
  if (!filename) return null;
  for (const pattern of JUNK_FILENAME_PATTERNS) {
    if (pattern.test(filename)) return pattern.source;
  }
  return null;
}

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, { dbName: 'contract_ai' });
    const db = await database.connect();

    console.log('\n═══════════════════════════════════════════');
    console.log(`   V2 POOL RETROACTIVE CLEANUP (${COMMIT ? 'COMMIT' : 'DRY-RUN'})`);
    console.log('═══════════════════════════════════════════\n');

    const completed = await LegalPulseV2Result.find({ status: 'completed' })
      .select('_id userId contractId document context createdAt')
      .lean();

    const contractsCollection = db.collection('contracts');
    const toMark = [];

    for (const v2 of completed) {
      let contract = null;
      try {
        const cid = v2.contractId;
        contract = await contractsCollection.findOne(
          {
            $or: [
              { _id: cid },
              ...(typeof cid === 'string' && cid.length === 24 ? [{ _id: new ObjectId(cid) }] : []),
            ],
          },
          { projection: { fileName: 1, name: 1, originalFileName: 1 } }
        );
      } catch (e) { /* skip */ }

      const filenameFromContract = contract?.fileName || contract?.originalFileName || contract?.name || '';
      const filenameFromV2Context = v2.context?.contractName || '';
      const filename = filenameFromContract || filenameFromV2Context;

      const junkReason = matchesJunkPattern(filename);
      if (!junkReason) continue;

      toMark.push({
        v2Id: v2._id,
        contractId: v2.contractId,
        userId: v2.userId,
        filename: filename.substring(0, 90),
        contractType: v2.document?.contractType || '(none)',
        junkPattern: junkReason,
      });
    }

    console.log(`Found ${toMark.length} V2 results to mark as rejected_not_contract\n`);

    if (toMark.length === 0) {
      console.log('Nothing to do. Pool is clean.');
      await mongoose.disconnect();
      process.exit(0);
    }

    console.log('─── ENTRIES TO BE MARKED ───');
    for (const e of toMark) {
      console.log(`  ${e.v2Id}`);
      console.log(`    filename: ${e.filename}`);
      console.log(`    contractType: ${e.contractType}`);
      console.log(`    pattern matched: ${e.junkPattern}`);
      console.log('');
    }

    if (!COMMIT) {
      console.log('─────────────────────────────────────────────');
      console.log('DRY-RUN — no changes written.');
      console.log('To apply, run: node backend/scripts/markV2PoolJunk.js --commit');
      console.log('─────────────────────────────────────────────');
      await mongoose.disconnect();
      process.exit(0);
    }

    // Commit
    const ids = toMark.map((e) => e.v2Id);
    const updateResult = await LegalPulseV2Result.updateMany(
      { _id: { $in: ids } },
      {
        $set: {
          status: 'rejected_not_contract',
          rejectionReason: 'Retroactive cleanup — filename matches non-contract pattern',
          'document.contractType': 'nicht_vertrag',
          'document.contractTypeSource': 'retroactive_cleanup',
        },
      }
    );

    console.log(`✓ Updated ${updateResult.modifiedCount} V2 results`);
    console.log('');

    // Verify distribution after
    const newDistribution = await LegalPulseV2Result.aggregate([
      { $match: { status: { $in: ['completed', 'rejected_not_contract'] } } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    console.log('─── NEW STATUS DISTRIBUTION ───');
    for (const d of newDistribution) {
      console.log(`  ${d._id.padEnd(28)} ${d.count}`);
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('CLEANUP FAILED:', err);
    process.exit(1);
  }
})();
