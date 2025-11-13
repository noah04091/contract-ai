// 📁 backend/find-largest-contracts.js
// Find the largest contracts in the database

require('dotenv').config();
const { MongoClient } = require("mongodb");

(async () => {
  console.log('🔍 Finding Largest Contracts\n');
  console.log('='.repeat(70));

  const mongoClient = new MongoClient(process.env.MONGO_URI);

  try {
    await mongoClient.connect();
    const db = mongoClient.db("contract_ai");
    const contractsCollection = db.collection("contracts");

    // Find all contracts
    const contracts = await contractsCollection.find({}).toArray();

    console.log(`\n📄 Total contracts: ${contracts.length}\n`);

    // Calculate sizes
    const contractSizes = contracts.map(contract => {
      let text = "";
      if (contract.fullText) {
        text = contract.fullText;
      } else if (contract.content) {
        text = contract.content;
      }

      const chars = text.length;
      const estimatedTokens = Math.ceil(chars / 4);

      return {
        _id: contract._id,
        name: contract.name || 'Unnamed',
        chars,
        estimatedTokens,
        hasLastIndexedAt: !!contract.lastIndexedAt
      };
    });

    // Sort by estimated tokens (descending)
    contractSizes.sort((a, b) => b.estimatedTokens - a.estimatedTokens);

    // Show top 20
    console.log('📊 Top 20 Largest Contracts:\n');
    console.log('Rank | Tokens    | Chars      | Indexed? | Name');
    console.log('-'.repeat(90));

    contractSizes.slice(0, 20).forEach((contract, i) => {
      const rank = (i + 1).toString().padStart(4);
      const tokens = contract.estimatedTokens.toLocaleString().padStart(9);
      const chars = contract.chars.toLocaleString().padStart(10);
      const indexed = contract.hasLastIndexedAt ? '✅ YES' : '❌ NO ';
      const name = contract.name.substring(0, 40);

      console.log(`${rank} | ${tokens} | ${chars} | ${indexed} | ${name}`);
    });

    // Find problematic ones (>20k tokens, not indexed)
    const problematic = contractSizes.filter(c => c.estimatedTokens > 20000 && !c.hasLastIndexedAt);

    if (problematic.length > 0) {
      console.log(`\n\n🚨 Found ${problematic.length} large contracts NOT YET INDEXED:\n`);
      problematic.forEach(contract => {
        console.log(`   _id: ${contract._id}`);
        console.log(`   Name: ${contract.name}`);
        console.log(`   Est. Tokens: ${contract.estimatedTokens.toLocaleString()}`);
        console.log();
      });
    }

    await mongoClient.close();

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }

  console.log('='.repeat(70));
  console.log('✅ Complete!');
  process.exit(0);
})();
