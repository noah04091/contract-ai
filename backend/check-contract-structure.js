require('dotenv').config();
const { MongoClient } = require('mongodb');

(async () => {
  const client = new MongoClient(process.env.MONGO_URI);
  await client.connect();
  const db = client.db('contract_ai');

  // Check if any contract has fullText or content
  const withFullText = await db.collection('contracts').countDocuments({
    fullText: { $exists: true, $ne: '', $ne: null }
  });

  const withContent = await db.collection('contracts').countDocuments({
    content: { $exists: true, $ne: '', $ne: null }
  });

  console.log('📊 Contract Text Storage Status:');
  console.log('  Contracts with fullText:', withFullText);
  console.log('  Contracts with content:', withContent);

  // Get sample contract structure
  const sample = await db.collection('contracts').findOne({});
  console.log('\n📋 Sample Contract Fields:');
  console.log('  Fields:', Object.keys(sample).join(', '));

  // Check if fullText/content fields exist but are empty
  const hasFullTextField = await db.collection('contracts').findOne({
    fullText: { $exists: true }
  });
  const hasContentField = await db.collection('contracts').findOne({
    content: { $exists: true }
  });

  console.log('\n🔍 Field Existence:');
  console.log('  fullText field exists:', !!hasFullTextField);
  console.log('  content field exists:', !!hasContentField);

  if (hasFullTextField) {
    console.log('    fullText value:', hasFullTextField.fullText ? hasFullTextField.fullText.substring(0, 100) + '...' : 'EMPTY');
  }

  if (hasContentField) {
    console.log('    content value:', hasContentField.content ? hasContentField.content.substring(0, 100) + '...' : 'EMPTY');
  }

  await client.close();
})();
