// 📁 backend/production-readiness-check.js
// Production Readiness Check - Final Validation

require('dotenv').config();
const { MongoClient } = require('mongodb');
const { ChromaClient } = require('chromadb');

console.log('🏥 Legal Pulse - Production Readiness Check\n');
console.log('='.repeat(70));

async function checkProductionReadiness() {
  const results = {
    passed: [],
    warnings: [],
    failed: []
  };

  let mongoClient;
  let chromaClient;

  try {
    // 1. Environment Variables
    console.log('\n📋 1. Environment Variables Check\n');

    const requiredVars = ['MONGO_URI', 'OPENAI_API_KEY', 'JWT_SECRET'];
    const optionalVars = ['EMBEDDINGS_MODEL', 'SIMILARITY_THRESHOLD', 'TOP_K'];

    requiredVars.forEach(varName => {
      if (process.env[varName]) {
        console.log(`  ✅ ${varName}: Set`);
        results.passed.push(`Environment: ${varName}`);
      } else {
        console.log(`  ❌ ${varName}: Missing`);
        results.failed.push(`Environment: ${varName} missing`);
      }
    });

    optionalVars.forEach(varName => {
      if (process.env[varName]) {
        console.log(`  ✅ ${varName}: ${process.env[varName]}`);
      } else {
        console.log(`  ⚠️  ${varName}: Using default`);
        results.warnings.push(`Environment: ${varName} not set (using default)`);
      }
    });

    // 2. MongoDB Connection
    console.log('\n📋 2. MongoDB Connection Check\n');

    try {
      mongoClient = new MongoClient(process.env.MONGO_URI);
      await mongoClient.connect();
      await mongoClient.db('admin').command({ ping: 1 });
      console.log('  ✅ MongoDB: Connected');
      results.passed.push('MongoDB connection');
    } catch (error) {
      console.log(`  ❌ MongoDB: ${error.message}`);
      results.failed.push(`MongoDB: ${error.message}`);
      throw error;
    }

    const db = mongoClient.db('contract_ai');

    // 3. MongoDB Indexes
    console.log('\n📋 3. MongoDB Indexes Check\n');

    const requiredIndexes = {
      'laws': ['contentHash_1', 'lawId_1', 'updatedAt_-1'],
      'contracts': ['userId_1_updatedAt_-1', 'lastIndexedAt_1'],
      'pulse_notifications': ['userId_1_createdAt_-1', 'contractId_1_lawId_1'],
      'alert_feedback': ['alertId_1_userId_1', 'rating_1_lawArea_1'],
      'digest_queue': ['digestMode_1_queued_1_sent_1_queuedAt_-1']
    };

    for (const [collectionName, expectedIndexes] of Object.entries(requiredIndexes)) {
      const collection = db.collection(collectionName);
      const indexes = await collection.indexes();
      const indexNames = indexes.map(idx => idx.name);

      expectedIndexes.forEach(indexName => {
        if (indexNames.includes(indexName)) {
          console.log(`  ✅ ${collectionName}.${indexName}`);
          results.passed.push(`Index: ${collectionName}.${indexName}`);
        } else {
          console.log(`  ❌ ${collectionName}.${indexName} - Missing`);
          results.failed.push(`Index: ${collectionName}.${indexName} missing`);
        }
      });
    }

    // 4. ChromaDB Connection
    console.log('\n📋 4. ChromaDB Connection Check\n');

    try {
      chromaClient = new ChromaClient();
      await chromaClient.heartbeat();
      console.log('  ✅ ChromaDB: Connected');
      results.passed.push('ChromaDB connection');

      // Check if collection exists
      const collections = await chromaClient.listCollections();
      const hasContractCollection = collections.some(c => c.name === 'contract_embeddings');

      if (hasContractCollection) {
        const collection = await chromaClient.getCollection({ name: 'contract_embeddings' });
        const count = await collection.count();
        console.log(`  ✅ Vector collection exists (${count} embeddings)`);
        results.passed.push(`Vector collection with ${count} embeddings`);

        if (count === 0) {
          console.log('  ⚠️  No embeddings yet - run backfillContracts.js');
          results.warnings.push('No contract embeddings yet');
        }
      } else {
        console.log('  ⚠️  Vector collection not created yet - will be created on first use');
        results.warnings.push('Vector collection not initialized');
      }
    } catch (error) {
      // ChromaDB runs in-memory during monitor execution, so it's OK if not running now
      console.log(`  ⚠️  ChromaDB: Not running (OK - in-memory, starts with monitor)`);
      console.log(`     ChromaDB will start automatically when runLegalPulseMonitor.js runs`);
      results.warnings.push('ChromaDB not running (will start with monitor)');
    }

    // 5. Data Validation
    console.log('\n📋 5. Data Validation Check\n');

    // Check contracts
    const contractsCollection = db.collection('contracts');
    const totalContracts = await contractsCollection.countDocuments();
    const indexedContracts = await contractsCollection.countDocuments({
      lastIndexedAt: { $exists: true, $ne: null }
    });

    console.log(`  📊 Total contracts: ${totalContracts}`);
    console.log(`  📊 Indexed contracts: ${indexedContracts}`);

    if (totalContracts > 0) {
      const indexedPercentage = (indexedContracts / totalContracts * 100).toFixed(1);
      console.log(`  📊 Indexed percentage: ${indexedPercentage}%`);

      if (indexedContracts === 0) {
        console.log('  ⚠️  No contracts indexed - run backfillContracts.js');
        results.warnings.push('No contracts indexed yet');
      } else if (indexedContracts < totalContracts) {
        const needsIndexing = totalContracts - indexedContracts;
        if (needsIndexing > 100) {
          console.log(`  ⚠️  ${needsIndexing} contracts need indexing - run backfillContracts.js`);
          results.warnings.push(`${needsIndexing} contracts need indexing`);
        } else {
          console.log(`  ✅ ${needsIndexing} contracts pending (acceptable)`);
        }
      } else {
        console.log('  ✅ All contracts indexed');
        results.passed.push('All contracts indexed');
      }
    } else {
      console.log('  ⚠️  No contracts in database yet');
      results.warnings.push('No contracts in database');
    }

    // Check laws
    const lawsCollection = db.collection('laws');
    const totalLaws = await lawsCollection.countDocuments();
    console.log(`  📊 Total laws: ${totalLaws}`);

    if (totalLaws === 0) {
      console.log('  ⚠️  No laws in database - RSS sync not run yet');
      results.warnings.push('No laws in database');
    } else {
      console.log('  ✅ Laws collection populated');
      results.passed.push(`${totalLaws} laws in database`);
    }

    // 6. Services Availability
    console.log('\n📋 6. Services Availability Check\n');

    // Check if key services exist
    const services = [
      'services/embeddingService.js',
      'services/alertExplainer.js',
      'services/costOptimization.js',
      'services/lawFingerprinting.js',
      'jobs/legalPulseMonitor.js',
      'jobs/digestProcessor.js'
    ];

    const fs = require('fs');
    const path = require('path');

    services.forEach(servicePath => {
      const fullPath = path.join(__dirname, servicePath);
      if (fs.existsSync(fullPath)) {
        console.log(`  ✅ ${servicePath}`);
        results.passed.push(`Service: ${servicePath}`);
      } else {
        console.log(`  ❌ ${servicePath} - Not found`);
        results.failed.push(`Service: ${servicePath} missing`);
      }
    });

    // 7. Cron Scripts
    console.log('\n📋 7. Cron Scripts Check\n');

    const cronScripts = [
      'run-daily-digest.js',
      'run-weekly-digest.js',
      'jobs/runLegalPulseMonitor.js'
    ];

    cronScripts.forEach(scriptPath => {
      const fullPath = path.join(__dirname, scriptPath);
      if (fs.existsSync(fullPath)) {
        console.log(`  ✅ ${scriptPath}`);
        results.passed.push(`Cron script: ${scriptPath}`);
      } else {
        console.log(`  ❌ ${scriptPath} - Not found`);
        results.failed.push(`Cron script: ${scriptPath} missing`);
      }
    });

    console.log('\n  ⚠️  Remember to configure cron jobs on the server:');
    console.log('     Daily:  0 8 * * *   node run-daily-digest.js');
    console.log('     Weekly: 0 8 * * 1   node run-weekly-digest.js');
    console.log('     Monitor: 0 */6 * * * node jobs/runLegalPulseMonitor.js');

    // 8. API Endpoints
    console.log('\n📋 8. API Routes Check\n');

    const routes = [
      'routes/legalPulse.js',
      'routes/legalPulseHealth.js',
      'routes/alertFeedback.js',
      'routes/publicFeedback.js'
    ];

    routes.forEach(routePath => {
      const fullPath = path.join(__dirname, routePath);
      if (fs.existsSync(fullPath)) {
        console.log(`  ✅ ${routePath}`);
        results.passed.push(`Route: ${routePath}`);
      } else {
        console.log(`  ❌ ${routePath} - Not found`);
        results.failed.push(`Route: ${routePath} missing`);
      }
    });

  } catch (error) {
    console.error('\n❌ Critical error during check:', error);
    results.failed.push(`Critical error: ${error.message}`);
  } finally {
    if (mongoClient) await mongoClient.close();
  }

  // Final Report
  console.log('\n' + '='.repeat(70));
  console.log('📊 Production Readiness Report\n');
  console.log('='.repeat(70));

  console.log(`\n✅ PASSED: ${results.passed.length} checks`);
  results.passed.forEach(item => console.log(`   ✅ ${item}`));

  if (results.warnings.length > 0) {
    console.log(`\n⚠️  WARNINGS: ${results.warnings.length} items`);
    results.warnings.forEach(item => console.log(`   ⚠️  ${item}`));
  }

  if (results.failed.length > 0) {
    console.log(`\n❌ FAILED: ${results.failed.length} checks`);
    results.failed.forEach(item => console.log(`   ❌ ${item}`));
  }

  console.log('\n' + '='.repeat(70));

  if (results.failed.length === 0) {
    if (results.warnings.length === 0) {
      console.log('🎉 PRODUCTION READY! All checks passed.');
    } else {
      console.log('⚠️  PRODUCTION READY with warnings. Review items above.');
    }
    console.log('\n📚 Next Steps:');
    console.log('   1. Configure cron jobs (see section 7 above)');
    console.log('   2. Run: node backend/scripts/backfillContracts.js');
    console.log('   3. Test: node backend/jobs/runLegalPulseMonitor.js');
    console.log('   4. Monitor: GET /api/legal-pulse/health');
  } else {
    console.log('❌ NOT READY FOR PRODUCTION. Fix failed checks above.');
    process.exit(1);
  }

  console.log('='.repeat(70));
}

checkProductionReadiness()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Fatal error:', err);
    process.exit(1);
  });
