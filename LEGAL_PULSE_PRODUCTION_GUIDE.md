# 📋 Legal Pulse - Production Deployment Guide

## 🎯 Overview

Legal Pulse ist ein automatisches Monitoring-System, das täglich neue Gesetze und Gesetzesänderungen mit allen Verträgen vergleicht und relevante Änderungen per E-Mail meldet.

**Technologie-Stack:**
- **Vector Search**: ChromaDB (in-memory) für Semantic Similarity
- **Embeddings**: OpenAI text-embedding-3-small
- **AI Explanations**: GPT-4o-mini
- **RSS Feeds**: Bundesgesetzblatt, LTO, Bundestag, etc.

---

## 🚀 Initial Setup

### 1. Install Dependencies

```bash
cd backend
npm install chromadb openai rss-parser
```

### 2. Environment Variables

Add to `.env`:

```bash
# OpenAI (Required)
OPENAI_API_KEY=your_openai_api_key

# Embeddings Model (Optional - defaults to text-embedding-3-small)
EMBEDDINGS_MODEL=text-embedding-3-small

# Legal Pulse Settings (Optional - defaults shown)
SIMILARITY_THRESHOLD=0.70
TOP_K=30
```

### 3. Create MongoDB Indexes

**WICHTIG**: Indexes sind kritisch für Performance!

```bash
node backend/scripts/createProductionIndexes.js
```

Dies erstellt **18 Indexes** für optimale Performance:
- Laws: 5 indexes (contentHash, lawId, updatedAt, compound indexes)
- Contracts: 3 indexes (userId, lastIndexedAt, compound)
- Notifications: 3 indexes (duplicate protection, user queries)
- Feedback: 3 indexes (unique constraint, analytics)
- Digest Queue: 3 indexes (queue processing, cleanup)
- Users: 1 index (settings queries)

### 4. Initial Contract Indexing

Index all existing contracts:

```bash
node backend/scripts/backfillContracts.js
```

**Output Example:**
```
📊 Total Contracts: 494
📊 Contracts Needing Indexing: 211
✅ Successfully indexed: 192/211 contracts
⏱️ Total time: 45.2s
```

**Performance:**
- ~4 contracts/second
- Incremental: Only processes changed contracts
- Memory: ~30 MB for 5000 contracts

---

## ⚙️ Cron Jobs Setup

### Daily Digest (8:00 AM every day)

```bash
0 8 * * * cd /path/to/contract-ai/backend && node run-daily-digest.js >> /var/log/legal-pulse-daily.log 2>&1
```

### Weekly Digest (8:00 AM every Monday)

```bash
0 8 * * 1 cd /path/to/contract-ai/backend && node run-weekly-digest.js >> /var/log/legal-pulse-weekly.log 2>&1
```

### Legal Pulse Monitor (Every 6 hours)

```bash
0 */6 * * * cd /path/to/contract-ai/backend && node jobs/runLegalPulseMonitor.js >> /var/log/legal-pulse-monitor.log 2>&1
```

**Empfohlene Frequenz:**
- **Production**: Alle 6 Stunden (4x täglich)
- **Development**: Manuell oder täglich
- **Test**: On-demand

---

## 🏥 Health Monitoring

### Health Check Endpoint

```bash
GET /api/legal-pulse/health
```

**Response Example:**
```json
{
  "success": true,
  "health": {
    "status": "healthy",
    "timestamp": "2025-01-12T10:30:00Z",
    "checks": {
      "database": { "status": "ok", "message": "Connected" },
      "laws": { "status": "ok", "total": 1250, "recentlyUpdated": 45 },
      "contracts": { "status": "ok", "total": 494, "indexed": 486, "needsIndexing": 8 },
      "notifications": { "status": "ok", "last24h": 12 },
      "digestQueue": { "status": "ok", "pendingDaily": 5, "pendingWeekly": 3 },
      "feedback": { "status": "ok", "total": 87, "helpfulRate": "72.4%" },
      "costs": { "status": "ok", "totalCost": "$0.0234", "projectedMonthly": "$1.45", "cacheHitRate": "68.3%" }
    }
  }
}
```

**Status Levels:**
- `healthy` - All systems operational
- `degraded` - Some issues detected (e.g., >100 contracts need indexing)
- `unhealthy` - Critical failure (e.g., database down)

### Statistics Dashboard

```bash
GET /api/legal-pulse/stats
```

**Returns:**
- Laws by legal area
- Recent law updates timeline (30 days)
- Alerts by severity distribution
- User digest mode preferences
- Feedback quality metrics by area

---

## 📊 User Settings

### Available Settings

Users can configure via `/api/legal-pulse/settings`:

```json
{
  "enabled": true,
  "similarityThreshold": 0.70,
  "categories": ["Arbeitsrecht", "Mietrecht", "Kaufrecht"],
  "digestMode": "instant",
  "emailNotifications": true
}
```

**Digest Modes:**
- `instant` - Sofortige E-Mail bei jeder Änderung
- `daily` - Täglich um 8 Uhr eine Zusammenfassung
- `weekly` - Jeden Montag um 8 Uhr eine Zusammenfassung

**Similarity Threshold:**
- `0.60-0.70` - Niedrig (mehr Alerts, evtl. false positives)
- `0.70-0.80` - Mittel (empfohlen)
- `0.80-0.95` - Hoch (nur sehr relevante Änderungen)

**Legal Categories:**
- Arbeitsrecht
- Mietrecht
- Kaufrecht
- Vertragsrecht
- Datenschutz
- Verbraucherrecht
- Steuerrecht
- Gesellschaftsrecht
- Insolvenzrecht
- Handelsrecht

---

## 💡 Alert Feedback System

### Email Feedback Buttons

Every alert email includes feedback buttons:
- 👍 **Hilfreich** → Improves future matching
- 👎 **Nicht hilfreich** → Suggests adjusting threshold

**Public Feedback URLs (no auth required):**
```
https://contract-ai.de/feedback/helpful/{alertId}
https://contract-ai.de/feedback/not-helpful/{alertId}
```

### Feedback Analytics

```bash
GET /api/alert-feedback/stats
```

**Key Metrics:**
- Overall helpful rate
- Average scores: helpful vs not-helpful alerts
- Feedback by legal area
- Recent comments

**Insights:**
- Helpful alerts typically have 85-95% similarity scores
- Not-helpful alerts often have 70-80% scores
- Use this to fine-tune default thresholds

---

## 💰 Cost Optimization

### Built-in Optimizations

1. **Embedding Cache** (LRU, 10K capacity)
   - Reduces API calls by 60-70%
   - Automatic MD5 hashing

2. **Rate Limiting**
   - Embeddings: 500 requests/min, 1M tokens/min
   - Completions: 100 requests/min, 200K tokens/min
   - Automatic retry with backoff

3. **Token Safety**
   - Ultra-conservative estimation (1 token per 2.5 chars)
   - 4000-token chunks (max 8192)
   - Automatic splitting for oversized texts

### Cost Estimates

**Based on typical usage:**

| Metric | Value | Cost |
|--------|-------|------|
| 500 contracts indexed | 779 chunks | $0.015 |
| Daily RSS sync (50 laws) | 50 embeddings | $0.001 |
| 20 alerts with GPT-4 explanations | 20 completions | $0.008 |
| **Monthly Total** | ~1M tokens | **$1.50-$3.00** |

**Scaling:**
- 1,000 contracts: ~$3-6/month
- 5,000 contracts: ~$15-30/month
- 10,000 contracts: ~$60-120/month

---

## 🔒 Security Best Practices

### 1. Rate Limiting

Built-in rate limiting prevents API abuse:
- User settings prevent spam (threshold limits)
- 24h duplicate protection
- Digest mode reduces email volume

### 2. Feedback Verification

Public feedback URLs use alertId as verification:
- No sensitive data exposed
- Rate-limited by MongoDB indexes
- Unique constraint prevents duplicate feedback

### 3. Database Indexes

Unique indexes prevent:
- Duplicate laws (contentHash)
- Duplicate feedback (alertId + userId)
- Duplicate alerts (contractId + lawId + 24h window)

---

## 📈 Scaling Considerations

### Current Capacity (In-Memory ChromaDB)

✅ **Optimal:** 500-5,000 contracts
⚠️ **Acceptable:** Up to 10,000 contracts

**Memory Usage:**
- 500 contracts: ~3 MB vectors
- 5,000 contracts: ~30 MB vectors
- 10,000 contracts: ~60 MB vectors

### Migration Path (>10,000 contracts)

**Option 1: Persistent ChromaDB**
```javascript
// Use disk-based storage
const client = new ChromaClient({
  path: "./chroma_data"
});
```
- Supports 10K-100K contracts
- Slower than in-memory (~2-3x)
- No code changes needed

**Option 2: Pinecone (Cloud)**
```bash
npm install @pinecone-database/pinecone
```
- Supports 100K-1M+ contracts
- Auto-scaling, managed service
- ~$70/month for 100K vectors
- Requires code refactoring

**Option 3: Sharding by User**
- Split vector stores by user/tenant
- Parallel processing
- Best for multi-tenant SaaS

---

## 🧪 Testing

### Unit Tests

```bash
# Test individual components
node backend/test-user-settings-api.js
node backend/test-alert-feedback.js
node backend/test-digest-mode.js
node backend/test-law-fingerprinting.js
```

### Integration Tests

```bash
# Test full monitoring cycle
node backend/jobs/runLegalPulseMonitor.js
```

**Expected Output:**
```
🚀 Legal Pulse Monitor Started
📰 RSS Sync: 12 new, 3 updated, 2 deduplicated
📊 Found 5 relevant contracts (threshold: 0.70)
✅ Alert sent to user@example.com (score: 87.3%)
💰 Cost Report: $0.0045 total
✅ Legal Pulse Monitor Completed (45.2s)
```

---

## 🐛 Troubleshooting

### Issue: No alerts being sent

**Checklist:**
1. Check user settings: `GET /api/legal-pulse/settings`
2. Verify contracts are indexed: `GET /api/legal-pulse/health`
3. Check similarity threshold (too high?)
4. Verify RSS feeds are syncing
5. Check logs for errors

### Issue: Too many false positives

**Solution:**
1. Increase user's `similarityThreshold` (0.70 → 0.80)
2. Narrow down `categories` selection
3. Switch to `digestMode: daily` to reduce spam
4. Analyze feedback: `GET /api/alert-feedback/stats`

### Issue: High OpenAI costs

**Solution:**
1. Check cache hit rate: `GET /api/legal-pulse/health`
2. Verify incremental indexing is working
3. Reduce monitoring frequency (6h → 12h)
4. Consider persistent ChromaDB for less re-indexing

### Issue: Slow performance

**Solution:**
1. Verify indexes exist: `node backend/scripts/createProductionIndexes.js`
2. Check contracts needing indexing: `GET /api/legal-pulse/health`
3. Run incremental indexing: `node backend/scripts/backfillContracts.js`
4. Monitor memory usage (htop/pm2)

---

## 📚 API Reference

### Core Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/legal-pulse/settings` | GET | ✅ | Get user settings |
| `/api/legal-pulse/settings` | PUT | ✅ | Update user settings |
| `/api/legal-pulse/categories` | GET | ✅ | Get available categories |
| `/api/legal-pulse/health` | GET | ✅ | System health check |
| `/api/legal-pulse/stats` | GET | ✅ | Statistics dashboard |
| `/api/alert-feedback` | POST | ✅ | Submit feedback |
| `/api/alert-feedback/stats` | GET | ✅ | Feedback analytics |
| `/feedback/helpful/:alertId` | GET | ❌ | Public helpful feedback |
| `/feedback/not-helpful/:alertId` | GET | ❌ | Public not-helpful feedback |

---

## ✅ Production Checklist

### Pre-Deployment

- [ ] Environment variables configured (.env)
- [ ] MongoDB indexes created
- [ ] Initial contracts indexed
- [ ] Cron jobs configured
- [ ] Health monitoring setup
- [ ] Log rotation configured

### Post-Deployment

- [ ] Health check returns "healthy"
- [ ] Test alert generation works
- [ ] Email notifications arrive
- [ ] Feedback buttons work
- [ ] Digest emails send correctly
- [ ] Cost tracking initialized

### Ongoing Maintenance

- [ ] Monitor health endpoint daily
- [ ] Check feedback quality weekly
- [ ] Review costs monthly
- [ ] Update RSS feeds as needed
- [ ] Clean up old digest queue (automatic)

---

## 🎉 Success Metrics

**User Value Indicators:**
- ✅ 70%+ helpful rate on feedback
- ✅ <5% unsubscribe rate
- ✅ Users actively adjust settings
- ✅ Positive feedback comments

**System Health Indicators:**
- ✅ <100 contracts needing indexing
- ✅ >60% cache hit rate
- ✅ <2s average alert generation
- ✅ Zero duplicate alerts

**Cost Efficiency:**
- ✅ <$5/month for <1000 contracts
- ✅ <$50/month for <10K contracts
- ✅ Cache hit rate >60%

---

## 📞 Support

**Documentation:**
- This guide (LEGAL_PULSE_PRODUCTION_GUIDE.md)
- Code comments in all files
- Test scripts with examples

**Monitoring:**
- Health endpoint: `/api/legal-pulse/health`
- Stats dashboard: `/api/legal-pulse/stats`
- Log files (if configured)

**Common Issues:**
- See Troubleshooting section above
- Check test scripts for examples
- Review health check output

---

**Version:** 1.0.0
**Last Updated:** 2025-01-12
**Status:** Production Ready ✅
