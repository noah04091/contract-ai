/**
 * READ-ONLY diagnostic script for Legal Pulse V2 pool quality.
 *
 * Scans legal_pulse_v2_results and contracts collections to identify:
 * - Total V2 result count
 * - Distribution by contractType
 * - Suspected non-contract entries (invoices, offers, forms)
 * - Entries with low confidence
 *
 * NO WRITES. Pure read.
 *
 * Usage: node backend/scripts/diagnoseV2Pool.js
 */

require('dotenv').config();
const database = require('../config/database');
const mongoose = require('mongoose');
const LegalPulseV2Result = require('../models/LegalPulseV2Result');
const { ObjectId } = require('mongodb');

// Filename patterns that suggest NOT a contract
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
    console.log('   V2 POOL DIAGNOSTIC (READ-ONLY)');
    console.log('═══════════════════════════════════════════\n');

    // 1. Total counts
    const totalResults = await LegalPulseV2Result.countDocuments({});
    const completedResults = await LegalPulseV2Result.countDocuments({ status: 'completed' });
    const failedResults = await LegalPulseV2Result.countDocuments({ status: 'failed' });
    const runningResults = await LegalPulseV2Result.countDocuments({ status: 'running' });

    console.log(`TOTAL V2 RESULTS:     ${totalResults}`);
    console.log(`  status=completed:   ${completedResults}`);
    console.log(`  status=failed:      ${failedResults}`);
    console.log(`  status=running:     ${runningResults}`);
    console.log('');

    // 2. Distribution by contractType
    console.log('─── CONTRACT TYPE DISTRIBUTION (completed only) ───');
    const typeDistribution = await LegalPulseV2Result.aggregate([
      { $match: { status: 'completed' } },
      {
        $group: {
          _id: '$document.contractType',
          count: { $sum: 1 },
          avgConfidence: { $avg: '$document.contractTypeConfidence' },
        },
      },
      { $sort: { count: -1 } },
    ]);

    for (const t of typeDistribution) {
      const type = String(t._id || '(null)').padEnd(28);
      const count = String(t.count).padStart(4);
      const conf = t.avgConfidence !== null ? `avg confidence: ${Math.round(t.avgConfidence)}` : '';
      console.log(`  ${type} ${count}   ${conf}`);
    }
    console.log('');

    // 3. Confidence distribution
    console.log('─── CONFIDENCE DISTRIBUTION (completed only) ───');
    const confBuckets = await LegalPulseV2Result.aggregate([
      { $match: { status: 'completed' } },
      {
        $bucket: {
          groupBy: '$document.contractTypeConfidence',
          boundaries: [0, 20, 40, 60, 80, 101],
          default: 'null',
          output: { count: { $sum: 1 } },
        },
      },
    ]);
    for (const b of confBuckets) {
      const label =
        b._id === 'null' ? '(no confidence)'
        : b._id === 0 ? '0-19   (very low)'
        : b._id === 20 ? '20-39  (low)'
        : b._id === 40 ? '40-59  (medium)'
        : b._id === 60 ? '60-79  (good)'
        : '80-100 (high)';
      console.log(`  ${label.padEnd(22)} ${String(b.count).padStart(4)}`);
    }
    console.log('');

    // 4. Candidates: Suspicious V2 results based on contract filename
    // We need to join with contracts collection to get the filename
    console.log('─── SUSPECTED NON-CONTRACT ENTRIES ───');
    console.log('Joining V2 results with contracts to check filenames...\n');

    const completed = await LegalPulseV2Result.find({ status: 'completed' })
      .select('_id userId contractId document.contractType document.contractTypeConfidence context.contractName createdAt')
      .lean();

    let suspectCount = 0;
    let lowConfidenceCount = 0;
    let orphanedCount = 0;
    const suspects = [];
    const contractsCollection = db.collection('contracts');

    for (const v2 of completed) {
      // Try to load contract for filename
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

      const isOrphaned = !contract;
      if (isOrphaned) orphanedCount++;

      // Check BOTH the contracts collection filename AND the V2 result's own context.contractName
      const filenameFromContract = contract?.fileName || contract?.originalFileName || contract?.name || '';
      const filenameFromV2Context = v2.context?.contractName || '';
      const filename = filenameFromContract || filenameFromV2Context;

      const junkReason = matchesJunkPattern(filename);
      const lowConf = (v2.document?.contractTypeConfidence ?? 100) < 30;

      if (junkReason || lowConf) {
        if (junkReason) suspectCount++;
        if (lowConf) lowConfidenceCount++;
        suspects.push({
          v2Id: v2._id.toString(),
          contractId: v2.contractId,
          userId: v2.userId,
          filename: filename.substring(0, 80),
          filenameSource: filenameFromContract ? 'contracts-collection' : filenameFromV2Context ? 'v2-context' : 'none',
          contractType: v2.document?.contractType || '(none)',
          confidence: v2.document?.contractTypeConfidence ?? null,
          junkPattern: junkReason || null,
          lowConfidence: lowConf,
          orphaned: isOrphaned,
          createdAt: v2.createdAt,
        });
      }
    }

    console.log(`SUSPECTS FOUND:           ${suspects.length}`);
    console.log(`  filename matches:       ${suspectCount}`);
    console.log(`  low confidence (<30):   ${lowConfidenceCount}`);
    console.log(`  both criteria met:      ${suspects.filter(s => s.junkPattern && s.lowConfidence).length}`);
    console.log('');
    console.log(`ORPHANED V2 RESULTS:      ${orphanedCount}`);
    console.log(`  (V2 result exists but contract was deleted)`);
    console.log('');

    // 5. Show top 20 most suspicious entries
    if (suspects.length > 0) {
      console.log('─── TOP SUSPECT DETAILS (up to 20) ───');
      const sorted = suspects.sort((a, b) => {
        if (a.junkPattern && !b.junkPattern) return -1;
        if (!a.junkPattern && b.junkPattern) return 1;
        return (a.confidence ?? 100) - (b.confidence ?? 100);
      });
      for (const s of sorted.slice(0, 20)) {
        console.log(`  contractId:  ${s.contractId}`);
        console.log(`    filename:    ${s.filename}  [${s.filenameSource}]`);
        console.log(`    contractType: ${s.contractType}  (confidence: ${s.confidence ?? '?'})`);
        console.log(`    reasons:     ${[s.junkPattern && `filename:${s.junkPattern}`, s.lowConfidence && 'low_confidence', s.orphaned && 'orphaned'].filter(Boolean).join(', ')}`);
        console.log(`    userId:      ${s.userId}`);
        console.log(`    createdAt:   ${s.createdAt}`);
        console.log('');
      }
    }

    // 5b. FULL LIST — all completed V2 results with both filename sources
    console.log('─── ALL V2 RESULTS (full list, both filename sources) ───');
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
      const fromContracts = contract?.fileName || contract?.originalFileName || contract?.name || '(none)';
      const fromV2 = v2.context?.contractName || '(none)';
      const ctype = v2.document?.contractType || '?';
      console.log(`  ${v2.contractId}`);
      console.log(`    type: ${ctype}   user: ${String(v2.userId).substring(0, 10)}...`);
      console.log(`    contracts.fileName: ${fromContracts.substring(0, 70)}`);
      console.log(`    v2.context.contractName: ${fromV2.substring(0, 70)}`);
    }
    console.log('');

    // 6. Summary for user decision
    console.log('═══════════════════════════════════════════');
    console.log('   SUMMARY');
    console.log('═══════════════════════════════════════════');
    console.log(`Total V2 results (completed):     ${completedResults}`);
    console.log(`Suspected non-contracts:          ${suspects.length}`);
    console.log(`  → by filename pattern:          ${suspectCount}`);
    console.log(`  → by low confidence:            ${lowConfidenceCount}`);
    const pct = completedResults > 0 ? ((suspects.length / completedResults) * 100).toFixed(1) : '0';
    console.log(`Pool pollution rate:              ${pct}%`);
    console.log('');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('DIAGNOSTIC FAILED:', err);
    process.exit(1);
  }
})();
