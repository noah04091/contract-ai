# Chat v2 Deployment Guide

This guide provides step-by-step instructions for deploying the Chat v2 system to production.

## Overview

Chat v2 introduces a world-class conversational AI system with:
- 🧠 **RAG (Retrieval-Augmented Generation)** with MongoDB Atlas Vector Search
- 🔧 **6 Specialized Tools** (Explain, Extract, Calculate, Risk, Draft, Redline)
- 📡 **Streaming Responses** via Server-Sent Events
- 🎯 **Enhanced UX** with InsightsPanel and QuickPrompts
- 🛡️ **GDPR Compliance** with PII detection/masking
- ⚡ **Feature Flag Controlled** rollout

## Prerequisites

### System Requirements
- Node.js 16+ 
- MongoDB 5.0+ or MongoDB Atlas
- AWS S3 bucket for file storage
- OpenAI API key
- Memory: 4GB+ RAM
- Storage: 10GB+ free space

### Required API Keys
- **OpenAI**: For GPT models and embeddings
- **MongoDB Atlas** (optional): For vector search
- **HuggingFace** (optional): Alternative embeddings
- **Anthropic** (optional): Alternative AI provider

## Pre-Deployment Checklist

### 1. Environment Configuration ✅
```bash
# Copy environment template
cp .env.example .env

# Configure required variables
CHAT_V2_ENABLED=true
RAG_SEARCH_MODE=lite  # Start with 'lite', upgrade to 'mongodb' later
OPENAI_API_KEY=your-openai-key
EMBEDDINGS_PROVIDER=openai
```

### 2. Database Preparation ✅
```bash
# Ensure MongoDB connection
MONGO_URI=mongodb://localhost:27017/contractai
# Or Atlas: mongodb+srv://user:pass@cluster.mongodb.net/contractai
```

### 3. Dependency Installation ✅
```bash
# Backend dependencies
cd backend && npm install

# New dependencies for Chat v2:
# - @huggingface/inference (embeddings)
# - uuid (unique identifiers)

# Frontend dependencies  
cd ../frontend && npm install

# New dependencies:
# - pdfjs-dist (PDF preview)
```

## Deployment Steps

### Phase 1: Soft Launch (Feature Flag OFF)

#### Step 1: Deploy Code
```bash
# 1. Deploy backend with Chat v2 code
git add .
git commit -m "feat: implement Chat v2 system with RAG and streaming

🧠 RAG system with chunking, embeddings, vector search
🔧 6 specialized tools for legal analysis  
📡 Streaming chat via Server-Sent Events
🎯 Enhanced UX with insights and quick prompts
🛡️ GDPR-compliant PII detection
⚡ Feature flag controlled deployment

🤖 Generated with Claude Code"

# 2. Deploy to staging first
git push origin staging

# 3. Deploy to production
git push origin main
```

#### Step 2: Database Migration
```bash
# Run migration script to prepare for Chat v2
cd backend
node migrations/prepare-chatv2.js

# This creates:
# - contract_chunks collection (for RAG)
# - chat_sessions collection (for conversation history) 
# - indexes for efficient querying
```

#### Step 3: Verify Deployment
```bash
# Check backend health
curl https://api.contract-ai.de/health

# Check Chat v2 endpoints (should be available but inactive)
curl -H "Authorization: Bearer $JWT_TOKEN" \
     https://api.contract-ai.de/api/chat/index
```

### Phase 2: Beta Testing (Feature Flag ON for Selected Users)

#### Step 1: Enable for Beta Users
```javascript
// In backend middleware or frontend, add beta user check:
const BETA_USERS = [
  'beta@contract-ai.de',
  'test@example.com'
];

const isBetaUser = (userEmail) => {
  return BETA_USERS.includes(userEmail) || 
         process.env.CHAT_V2_ENABLED === 'true';
};
```

#### Step 2: Monitor Beta Performance
```bash
# Check telemetry logs
tail -f backend/logs/telemetry-*.log

# Monitor errors
tail -f backend/logs/errors-*.log

# Check system resources
htop
```

#### Step 3: Process First Contract
```bash
# Test with sample contract
curl -X POST https://api.contract-ai.de/api/chat/ask \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "question": "Welche Risiken bestehen in diesem Vertrag?",
    "contractId": "your-test-contract-id",
    "userMode": "business"
  }'
```

### Phase 3: MongoDB Atlas Vector Search (Production Scale)

#### Step 1: Create Atlas Search Index
```javascript
// In MongoDB Atlas UI, create search index:
{
  "fields": [
    {
      "type": "vector",
      "path": "embedding", 
      "numDimensions": 1536,
      "similarity": "cosine"
    },
    {
      "type": "filter",
      "path": "metadata.contractId"
    },
    {
      "type": "filter", 
      "path": "metadata.page"
    }
  ]
}
```

#### Step 2: Migrate to MongoDB Search
```bash
# Update environment
RAG_SEARCH_MODE=mongodb
MONGODB_ATLAS_SEARCH_INDEX_NAME=contract_embeddings

# Restart application
pm2 restart contract-ai-backend
```

#### Step 3: Migrate Existing Data
```bash
# Run embedding generation for existing contracts
node scripts/generate-embeddings.js --all

# This processes all contracts and creates vector embeddings
```

### Phase 4: Full Rollout (Feature Flag ON for All)

#### Step 1: Global Activation
```bash
# Update environment for all users
CHAT_V2_ENABLED=true

# Deploy configuration
# No code changes needed - just environment variable
```

#### Step 2: Performance Optimization
```bash
# Scale up resources if needed
# Monitor key metrics:
# - Response times
# - Memory usage  
# - Database performance
# - API rate limits
```

## Migration Scripts

### Contract Preparation Script
```javascript
// backend/migrations/prepare-chatv2.js
const { MongoClient } = require('mongodb');
const Chunker = require('../services/rag/chunker');
const VectorStore = require('../services/rag/vectorStore');

async function migrateContracts() {
  const client = new MongoClient(process.env.MONGO_URI);
  await client.connect();
  
  const db = client.db();
  const contracts = await db.collection('contracts').find({}).toArray();
  
  console.log(`Processing ${contracts.length} contracts...`);
  
  const chunker = new Chunker();
  const vectorStore = new VectorStore();
  
  for (const contract of contracts) {
    if (contract.extractedText) {
      console.log(`Processing contract: ${contract.filename}`);
      
      // Generate chunks
      const chunks = chunker.chunkText(contract.extractedText, {
        contractId: contract._id,
        filename: contract.filename
      });
      
      // Store chunks (embeddings generated on-demand)
      await vectorStore.storeChunks(chunks);
      
      console.log(`✅ Generated ${chunks.length} chunks for ${contract.filename}`);
    }
  }
  
  await client.close();
  console.log('Migration completed!');
}

migrateContracts().catch(console.error);
```

### Index Creation Script
```javascript
// backend/migrations/create-indexes.js
async function createIndexes() {
  const client = new MongoClient(process.env.MONGO_URI);
  await client.connect();
  const db = client.db();
  
  // Contract chunks indexes
  await db.collection('contract_chunks').createIndex({ 
    'metadata.contractId': 1 
  });
  
  await db.collection('contract_chunks').createIndex({ 
    'metadata.contractId': 1, 
    'metadata.page': 1 
  });
  
  // Chat sessions indexes
  await db.collection('chat_sessions').createIndex({ 
    userId: 1, 
    contractId: 1, 
    createdAt: -1 
  });
  
  console.log('✅ Indexes created successfully');
  await client.close();
}
```

## Monitoring & Maintenance

### Key Metrics to Monitor

#### Performance Metrics 📊
```bash
# Response times
curl -w "@curl-format.txt" -s -o /dev/null \
     https://api.contract-ai.de/api/chat/ask

# Memory usage
free -m

# Database performance
mongotop 10

# API rate limits (OpenAI)
# Monitor through telemetry dashboard
```

#### Business Metrics 📈
- Chat usage frequency
- User satisfaction (completion rates)
- Tool usage distribution
- Error rates by component
- Conversion from v1 to v2

### Log Monitoring
```bash
# Application logs
tail -f backend/logs/app.log

# Chat v2 specific logs  
grep "CHAT_V2" backend/logs/app.log

# Error monitoring
tail -f backend/logs/errors-*.log | grep -E "(ChatError|RAGError|ToolError)"

# Performance monitoring
grep "response_time" backend/logs/telemetry-*.log
```

### Health Checks
```bash
# Create health check endpoint
# GET /api/health/chatv2
{
  "status": "healthy",
  "chat_v2": {
    "enabled": true,
    "rag_mode": "mongodb", 
    "embeddings_provider": "openai",
    "tools_available": 6,
    "vector_store_status": "connected"
  },
  "dependencies": {
    "mongodb": "connected",
    "openai": "connected", 
    "s3": "connected"
  }
}
```

## Rollback Procedures

### Emergency Rollback (Critical Issues)
```bash
# 1. Immediate: Disable Chat v2
CHAT_V2_ENABLED=false

# 2. Restart services
pm2 restart contract-ai-backend

# 3. Users automatically fall back to Chat v1
# No data loss - all contracts remain functional
```

### Partial Rollback (Performance Issues)
```bash
# Option 1: Switch to lite RAG mode
RAG_SEARCH_MODE=lite

# Option 2: Disable specific tools
TOOL_REDLINER_ENABLED=false
TOOL_LETTER_GENERATOR_ENABLED=false

# Option 3: Reduce concurrent chat limits
MAX_CONCURRENT_CHATS=5
```

## Performance Tuning

### Database Optimization
```javascript
// Optimize MongoDB for Chat v2
db.contract_chunks.createIndex({ 
  "embedding": "2dsphere" 
});

// Compound index for faster queries
db.contract_chunks.createIndex({
  "metadata.contractId": 1,
  "metadata.page": 1,
  "createdAt": -1
});
```

### Memory Management
```bash
# Adjust Node.js memory limits
NODE_OPTIONS="--max-old-space-size=4096"

# Monitor memory usage
node --inspect backend/server.js
```

### Rate Limiting
```javascript
// Implement rate limiting for Chat v2
const chatRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // limit each IP to 50 requests per windowMs
  message: 'Too many chat requests'
});

app.use('/api/chat', chatRateLimit);
```

## Security Considerations

### API Security
```bash
# Enable CORS for production
CORS_ORIGIN=https://contract-ai.de,https://www.contract-ai.de

# Rate limiting per user
RATE_LIMIT_PER_USER=30  # requests per minute

# Secure headers
HELMET_ENABLED=true
```

### Data Privacy (GDPR)
```bash
# Enable PII detection in production
PII_DETECTION_ENABLED=true
PII_MASKING_ENABLED=true

# Data retention
CHAT_SESSION_RETENTION_DAYS=30
LOG_RETENTION_DAYS=90
```

### Input Validation
```javascript
// Validate chat inputs
const chatInputSchema = {
  question: { type: 'string', minLength: 10, maxLength: 1000 },
  contractId: { type: 'string', format: 'uuid' },
  userMode: { enum: ['laie', 'business', 'jurist'] }
};
```

## Troubleshooting

### Common Issues

#### 1. Embeddings Generation Fails
```bash
# Check OpenAI API key
curl -H "Authorization: Bearer $OPENAI_API_KEY" \
     https://api.openai.com/v1/models

# Check rate limits
grep "rate_limit" backend/logs/app.log

# Switch to fallback provider
EMBEDDINGS_PROVIDER=huggingface
```

#### 2. Vector Search Timeout
```bash
# Check MongoDB Atlas connection
mongosh "mongodb+srv://cluster.mongodb.net" --username $USERNAME

# Reduce search complexity
RAG_MAX_RESULTS=5
RAG_SIMILARITY_THRESHOLD=0.8
```

#### 3. Streaming Connection Issues
```bash
# Check SSE configuration
grep "SSE" backend/logs/app.log

# Verify proxy settings (nginx/cloudflare)
# Ensure streaming is not buffered
```

#### 4. Tool Execution Errors
```bash
# Check tool-specific logs
grep "TOOL_ERROR" backend/logs/errors-*.log

# Disable problematic tools temporarily
TOOL_REDLINER_ENABLED=false

# Monitor tool performance
node backend/scripts/test-tools.js
```

## Success Criteria

### Technical KPIs
- ✅ **Uptime**: >99.9%
- ✅ **Response Time**: <3 seconds average
- ✅ **Error Rate**: <1% for chat requests
- ✅ **Memory Usage**: <2GB per instance

### Business KPIs
- 📈 **Adoption**: >50% of premium users try Chat v2 within 30 days
- 📈 **Engagement**: >3 questions per chat session average
- 📈 **Satisfaction**: >4.5/5 user rating
- 📈 **Retention**: <5% switch back to Chat v1

## Post-Deployment

### Week 1: Monitoring Phase
- [ ] Monitor all metrics hourly
- [ ] Review user feedback daily
- [ ] Performance optimization as needed
- [ ] Documentation updates

### Week 2-4: Optimization Phase  
- [ ] Scale infrastructure based on usage
- [ ] Fine-tune RAG parameters
- [ ] A/B test UI improvements
- [ ] Gather advanced analytics

### Month 2+: Enhancement Phase
- [ ] Add new specialized tools
- [ ] Implement user feedback
- [ ] Advanced AI model testing
- [ ] International expansion prep

## Support & Documentation

### User Documentation
- Update help center with Chat v2 features
- Create video tutorials for new UI
- FAQ for common Chat v2 questions

### Developer Documentation
- API documentation for Chat v2 endpoints
- Tool development guide
- RAG system architecture docs

### Support Team Training
- Chat v2 feature overview
- Troubleshooting common issues
- Escalation procedures for technical problems

---

## Conclusion

Chat v2 represents a significant upgrade to Contract AI's conversational capabilities. This deployment guide ensures a smooth, monitored rollout with fallback options and comprehensive monitoring.

The feature flag approach allows for controlled rollout, while the robust error handling and telemetry systems provide visibility into system performance.

For questions or issues during deployment, refer to the troubleshooting section or contact the development team.

**Good luck with the deployment! 🚀**