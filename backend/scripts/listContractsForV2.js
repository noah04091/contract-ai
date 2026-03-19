require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const database = require('../config/database');

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const db = await database.connect();

  // 1. Find S3 uploaded contracts
  const s3Contracts = await db.collection('contracts').find(
    { uploadType: 'S3_UPLOAD' },
    { projection: { name: 1, userId: 1, s3Key: 1, fileName: 1, createdAt: 1 } }
  ).sort({ createdAt: -1 }).toArray();

  console.log(`\n=== S3-Verträge: ${s3Contracts.length} ===`);
  for (const c of s3Contracts) {
    console.log(`  ${c._id} | ${c.name || c.fileName || 'unnamed'} | user: ${c.userId}`);
    console.log(`    s3Key: ${c.s3Key}`);
  }

  // 2. Find contracts with extracted text
  const withText = await db.collection('contracts').find(
    { extractedText: { $exists: true, $ne: '' } },
    { projection: { name: 1, fileName: 1, userId: 1, uploadType: 1 } }
  ).limit(15).toArray();

  console.log(`\n=== Verträge mit extractedText: ${withText.length} ===`);
  for (const c of withText) {
    console.log(`  ${c._id} | ${c.name || c.fileName || 'unnamed'} | ${c.uploadType || 'no-upload'}`);
  }

  // 3. Find contracts with analysis (V1)
  const withAnalysis = await db.collection('contracts').find(
    { 'analysis.overallScore': { $exists: true } },
    { projection: { name: 1, fileName: 1, userId: 1, 'analysis.overallScore': 1 } }
  ).limit(15).toArray();

  console.log(`\n=== Verträge mit V1-Analyse: ${withAnalysis.length} ===`);
  for (const c of withAnalysis) {
    console.log(`  ${c._id} | ${c.name || c.fileName || 'unnamed'} | Score: ${c.analysis?.overallScore}`);
  }

  // 4. Total count
  const total = await db.collection('contracts').countDocuments();
  console.log(`\nGesamt: ${total} Verträge`);

  await mongoose.disconnect();
  process.exit(0);
})();
