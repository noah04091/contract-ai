#!/usr/bin/env node
// Fix UTF-8 encoding issues in contract names
// Characters like "Ã¼" should be "ü", "Ã¤" should be "ä", etc.

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { MongoClient } = require('mongodb');

// Common UTF-8 mojibake patterns (UTF-8 bytes interpreted as Latin-1)
const encodingFixes = {
  'Ã¼': 'ü',
  'Ã¤': 'ä',
  'Ã¶': 'ö',
  'Ãœ': 'Ü',
  'Ã„': 'Ä',
  'Ã–': 'Ö',
  'ÃŸ': 'ß',
  'Ã©': 'é',
  'Ã¨': 'è',
  'Ã ': 'à',
  'Ã¢': 'â',
  'Ã®': 'î',
  'Ã´': 'ô',
  'Ã»': 'û',
  'Ã§': 'ç',
  'Ã±': 'ñ',
};

function fixEncoding(str) {
  if (!str) return str;
  let fixed = str;
  for (const [broken, correct] of Object.entries(encodingFixes)) {
    fixed = fixed.split(broken).join(correct);
  }
  return fixed;
}

async function main() {
  const client = new MongoClient(process.env.MONGO_URI);

  try {
    await client.connect();
    const db = client.db('contract_ai');

    // Find all contracts with potential encoding issues
    const contracts = await db.collection('contracts').find({
      $or: [
        { name: { $regex: 'Ã' } },
        { fileName: { $regex: 'Ã' } }
      ]
    }).toArray();

    console.log(`Found ${contracts.length} contracts with encoding issues\n`);

    let fixed = 0;
    for (const contract of contracts) {
      const updates = {};

      if (contract.name && contract.name.includes('Ã')) {
        updates.name = fixEncoding(contract.name);
        console.log(`  Name: "${contract.name}" → "${updates.name}"`);
      }

      if (contract.fileName && contract.fileName.includes('Ã')) {
        updates.fileName = fixEncoding(contract.fileName);
        console.log(`  FileName: "${contract.fileName}" → "${updates.fileName}"`);
      }

      if (Object.keys(updates).length > 0) {
        await db.collection('contracts').updateOne(
          { _id: contract._id },
          { $set: updates }
        );
        fixed++;
        console.log(`  ✅ Fixed contract ${contract._id}\n`);
      }
    }

    console.log(`\n✅ Fixed ${fixed} contracts`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

main();
