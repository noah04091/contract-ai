require('dotenv').config();
const { MongoClient } = require('mongodb');

(async () => {
  const client = new MongoClient(process.env.MONGO_URI);
  await client.connect();
  const db = client.db('contract_ai');

  const withFullText = await db.collection('contracts').countDocuments({
    'analysis.fullText': { $exists: true, $ne: '' }
  });

  const withParsedText = await db.collection('contracts').countDocuments({
    'parsedText': { $exists: true, $ne: '' }
  });

  const withExtractedText = await db.collection('contracts').countDocuments({
    'extractedText': { $exists: true, $ne: '' }
  });

  const total = await db.collection('contracts').countDocuments();

  console.log('📊 Contract Text Availability:');
  console.log('  Total contracts:', total);
  console.log('  With analysis.fullText:', withFullText);
  console.log('  With parsedText:', withParsedText);
  console.log('  With extractedText:', withExtractedText);
  console.log('\n⚠️  Contracts without text content:', total - Math.max(withFullText, withParsedText, withExtractedText));

  // Get a sample with full text
  const sample = await db.collection('contracts')
    .findOne({ 'analysis.fullText': { $exists: true, $ne: '' } });

  if (sample) {
    console.log('\n📄 Sample contract with full text:');
    console.log('  Name:', sample.name);
    console.log('  Text length:', sample.analysis.fullText.length, 'characters');
    console.log('  Preview:', sample.analysis.fullText.substring(0, 200) + '...');
  }

  await client.close();
})();
