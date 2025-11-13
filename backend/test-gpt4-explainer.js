// 📁 backend/test-gpt4-explainer.js
// Test GPT-4 Alert Explanations

require('dotenv').config();
const { getInstance: getAlertExplainer } = require('./services/alertExplainer');

(async () => {
  console.log('🧪 Testing GPT-4 Alert Explainer\n');
  console.log('=' .repeat(70));

  const explainer = getAlertExplainer();

  // Test law change
  const lawChange = {
    title: 'Neue Gewährleistungsfristen für Kaufverträge ab 2025',
    description: 'Die gesetzliche Gewährleistungsfrist für Kaufverträge wird von 2 auf 3 Jahre verlängert. Dies betrifft alle ab Januar 2025 geschlossenen Verträge.',
    source: 'Bundesgesetzblatt',
    area: 'kaufrecht'
  };

  // Test contract
  const contract = {
    contractId: 'test-123',
    contractName: 'Kaufvertrag Laptop Dell XPS 15',
    userId: 'user-456'
  };

  // Test matched text
  const matchedText = `
Gewährleistung: Der Verkäufer gewährt eine gesetzliche Gewährleistungsfrist von 24 Monaten ab Kaufdatum.
Innerhalb dieser Frist werden Material- und Verarbeitungsfehler kostenlos beseitigt.
  `.trim();

  const relevanceScore = 0.85;

  console.log('\n📋 Test Case:');
  console.log(`  Law: ${lawChange.title}`);
  console.log(`  Contract: ${contract.contractName}`);
  console.log(`  Relevance: ${(relevanceScore * 100).toFixed(1)}%`);

  console.log('\n🧠 Generating GPT-4 explanation...\n');

  try {
    const explanation = await explainer.explainRelevance(
      lawChange,
      contract,
      matchedText,
      relevanceScore
    );

    console.log('✅ GPT-4 Explanation Generated:\n');
    console.log('─'.repeat(70));
    console.log(explanation);
    console.log('─'.repeat(70));

    console.log(`\n📊 Character count: ${explanation.length}`);
    console.log(`   Word count: ~${explanation.split(' ').length} words`);

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
  }

  console.log('\n' + '='.repeat(70));
  console.log('✅ Test Complete!');

  process.exit(0);
})();
