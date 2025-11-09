# Legal Pulse 2.0 – Implementation Guide

## 🎯 Overview

Legal Pulse 2.0 ist eine umfassende Erweiterung des bestehenden Legal Pulse Features mit folgenden Hauptkomponenten:

- **RAG-System** für semantische Suche in Gesetzestexten
- **Change Detection** für automatische Erkennung von Gesetzesänderungen
- **Dynamic Trigger Engine** für Impact-Bewertung auf Verträge
- **Live Feed** via Server-Sent Events (SSE) für Echtzeit-Benachrichtigungen
- **Health Score** zusätzlich zum Risk Score
- **Analyse-Historie** mit Tracking der Änderungen

---

## 📁 Implementierte Dateien

### Backend

#### Models
- `backend/models/Law.js` - Paragraph-granulare Gesetzes-Speicherung mit Embeddings
- `backend/models/Contract.js` - Erweitert um Legal Pulse 2.0 Felder

#### Services
- `backend/services/lawEmbeddings.js` - RAG-System mit OpenAI Embeddings
- `backend/services/lawChangeDetector.js` - Erkennung von Gesetzesänderungen
- `backend/services/legalPulseTrigger.js` - Impact-Bewertung & Alert-Generierung
- `backend/services/aiLegalPulse.js` - Erweitert mit RAG-Integration

#### Routes
- `backend/routes/legalPulseFeed.js` - SSE-basierter Live-Feed
- `backend/server.js` - Feed-Route registriert

#### Scripts
- `backend/scripts/seed_laws.js` - Seed-Script für Dummy-Gesetze

### Frontend

#### Hooks
- `frontend/src/hooks/useLegalPulseFeed.ts` - React Hook für SSE-Verbindung

#### Components
- `frontend/src/pages/LegalPulse.tsx` - Erweitert mit Health Score, Live Feed Tab

---

## 🚀 Setup & Installation

### 1. Environment Variables

Füge zu deiner `.env` Datei hinzu:

```bash
# RAG System
RAG_PROVIDER=mongodb  # oder 'chroma', 'pinecone'
RAG_DIR=./data/law_index

# Optional: Externe Legal APIs (für spätere Phasen)
EULEX_API_KEY=
BUNDESANZEIGER_API_KEY=
```

### 2. Datenbank Seeding

Lade Dummy-Gesetze in die Datenbank:

```bash
cd backend
node scripts/seed_laws.js
```

**Erwartete Ausgabe:**
```
🌱 [SEED-LAWS] Starting law database seeding...
✓ Connected to MongoDB
📚 Upserting 7 law sections...
[LEGAL-PULSE:RAG] ✓ DSGVO_Art13 Art. 13 Abs. 1
[LEGAL-PULSE:RAG] ✓ BGB_312 § 312 Abs. 1
...
✅ [SEED-LAWS] Seeding complete!
   - Inserted: 7
   - Updated: 0
   - Errors: 0
   - Total: 7
```

### 3. Backend starten

```bash
cd backend
node server.js
```

**Prüfe ob folgende Routen geladen wurden:**
```
✅ Legal Pulse Routen geladen unter /api/legal-pulse
✅ Legal Pulse Feed (SSE) geladen unter /api/legalpulse/stream
```

### 4. Frontend starten

```bash
cd frontend
npm run dev
```

---

## 🧪 Testing

### Manual Test Flow

#### Test 1: RAG-System

```bash
# Im Backend-Verzeichnis
node
```

```javascript
const { getInstance } = require('./services/lawEmbeddings');
const lawEmbeddings = getInstance();

// Query test
lawEmbeddings.queryRelevantSections({
  text: 'Datenschutzerklärung personenbezogene Daten',
  topK: 3
}).then(results => {
  console.log('Top Results:');
  results.forEach(r => {
    console.log(`- ${r.lawId} ${r.sectionId}: ${r.relevance.toFixed(3)}`);
  });
});
```

**Erwartung:** Sollte DSGVO-Artikel zurückgeben mit hoher Relevanz (>0.7).

#### Test 2: Live Feed

1. Frontend öffnen: `http://localhost:5173/legalpulse`
2. Zu einem Vertrag navigieren
3. Tab "Live Feed" öffnen
4. Status sollte "🟢 Verbunden" anzeigen

**Test-Alert senden:**
```bash
curl -X POST http://localhost:5000/api/legalpulse/test-alert \
  -H "Content-Type: application/json" \
  -H "Cookie: <your-auth-cookie>" \
  --cookie-jar cookies.txt
```

**Erwartung:** Alert erscheint sofort im Live Feed Tab.

#### Test 3: Change Detection & Trigger

```bash
node
```

```javascript
const { getInstance: getChangeDetector } = require('./services/lawChangeDetector');
const { getInstance: getTrigger } = require('./services/legalPulseTrigger');
const { MongoClient } = require('mongodb');

async function testTrigger() {
  const client = new MongoClient(process.env.MONGO_URI);
  await client.connect();

  // 1. Detect recent changes
  const detector = getChangeDetector();
  const changes = await detector.detectLawChanges(30);
  console.log(`Found ${changes.length} law changes`);

  // 2. Get a contract
  const contract = await client.db('contract_ai')
    .collection('contracts')
    .findOne({});

  // 3. Evaluate impact
  const trigger = getTrigger();
  const result = await trigger.evaluateImpactForContract(contract, changes);

  console.log('Impact Result:', result.hasImpact);
  if (result.hasImpact) {
    console.log('Alerts:', result.alerts.length);
    console.log('New Risk Score:', result.metrics.newRiskScore);
  }

  await client.close();
}

testTrigger();
```

#### Test 4: Health Score Calculation

Nach einer Analyse sollten Verträge folgende Felder haben:

```javascript
{
  legalPulse: {
    riskScore: 45,          // 0-100
    healthScore: 72,        // 0-100 (höher = besser)
    analysisHistory: [{
      date: "2025-11-09T...",
      riskScore: 45,
      healthScore: 72,
      changes: ["Initial analysis completed"],
      triggeredBy: "periodic_scan"
    }],
    lawInsights: [{
      law: "DSGVO Art. 13",
      sectionId: "Art.13(1)",
      sourceUrl: "https://eur-lex.europa.eu/...",
      relevance: 0.87,
      area: "DSGVO"
    }]
  }
}
```

---

## 📊 API Endpoints

### Legal Pulse Feed

#### GET `/api/legalpulse/stream`
Server-Sent Events Stream für Live-Updates.

**Response (SSE):**
```
data: {"type":"connected","message":"Legal Pulse Feed connected","timestamp":"..."}

data: {"type":"alert","data":{...},"timestamp":"..."}
```

#### GET `/api/legalpulse/feed-status`
Status der Feed-Verbindung.

**Response:**
```json
{
  "success": true,
  "status": {
    "connected": true,
    "connectionCount": 1,
    "totalConnections": 3,
    "activeUsers": 2
  }
}
```

#### POST `/api/legalpulse/test-alert`
Sendet einen Test-Alert (für Development).

**Response:**
```json
{
  "success": true,
  "message": "Test alert sent",
  "alert": {
    "type": "test",
    "severity": "low",
    "title": "Test Alert",
    ...
  }
}
```

---

## 🎨 Frontend Components

### useLegalPulseFeed Hook

```typescript
import { useLegalPulseFeed } from '../hooks/useLegalPulseFeed';

function MyComponent() {
  const { events, isConnected, clearEvents } = useLegalPulseFeed();

  return (
    <div>
      <p>Status: {isConnected ? 'Connected' : 'Disconnected'}</p>
      <p>Events: {events.length}</p>
      <button onClick={clearEvents}>Clear</button>
    </div>
  );
}
```

### LegalPulse.tsx Neue Features

1. **Health Score Badge**
   - Anzeige neben Risk Score
   - Farbcodierung: Grün (>80), Gelb (50-80), Rot (<50)

2. **Live Feed Tab**
   - Echtzeit-Events von Backend
   - Connection Status Indicator
   - Event-Liste mit Timestamps

3. **Law Insights mit Source-Links**
   - Klickbare Links zu Gesetzesquellen
   - Relevanz-Anzeige

---

## 🔧 Configuration

### RAG Provider

**MongoDB (Default):**
```bash
RAG_PROVIDER=mongodb
```

Embeddings werden direkt in Law-Collection gespeichert. Cosine-Similarity in JavaScript berechnet.

**Chroma (Lokal):**
```bash
RAG_PROVIDER=chroma
RAG_DIR=./data/law_index
```

Erfordert Chroma-Installation (nicht im Scope dieses Tickets).

**Pinecone (Cloud):**
```bash
RAG_PROVIDER=pinecone
PINECONE_API_KEY=...
PINECONE_INDEX_NAME=legal-pulse
```

Erfordert Pinecone-Account (nicht im Scope dieses Tickets).

---

## 🐛 Troubleshooting

### Issue: "No law sections found in database"

**Lösung:**
```bash
node backend/scripts/seed_laws.js
```

### Issue: "SSE Connection failed"

**Mögliche Ursachen:**
1. Backend nicht gestartet
2. CORS-Problem (prüfe `Access-Control-Allow-Origin` Header)
3. Auth-Token fehlt

**Debug:**
```javascript
// Browser Console
const es = new EventSource('http://localhost:5000/api/legalpulse/stream');
es.onopen = () => console.log('Connected');
es.onerror = (e) => console.error('Error:', e);
es.onmessage = (e) => console.log('Message:', e.data);
```

### Issue: "Embedding generation slow"

**Optimierung:**
- Reduce `topK` in `queryRelevantSections` (default: 10 → 5)
- Batch-Processing nutzen (bereits implementiert)
- Rate Limiting beachten (OpenAI API)

---

## 📈 Performance Metrics

### Expected Performance

- **RAG Query Time:** ~500-1000ms (bei 100 Law Sections)
- **Trigger Evaluation:** ~200-500ms pro Vertrag
- **SSE Latency:** <100ms (Echtzeit)
- **Seed Script:** ~5-10 Sekunden (7 Laws)

### Optimization Tipps

1. **Embeddings cachen:** Nicht bei jedem Request neu generieren
2. **Batch-Processing:** Max 3 gleichzeitige Verträge
3. **Index optimization:** MongoDB Composite Indexes nutzen
4. **Rate Limiting:** OpenAI API Limits respektieren

---

## 🚧 Known Limitations (Phase 1)

- **Keine externen Legal APIs:** Dummy-Daten nur
- **Kein Markt-Benchmarking:** Placeholder im Schema
- **Keine ML-Forecast:** Nur regelbasierte Scores
- **SSE nur bei aktiver Connection:** Keine Offline-Queue

Diese Features sind für **Phase 2 & 3** geplant.

---

## 🎯 Next Steps (Phase 2)

1. **Live Legal APIs integrieren:**
   - EU-Lex API
   - Bundesanzeiger API
   - GOVData API

2. **Automated Actions:**
   - One-Click-Flow: Alert → Optimizer → Generator
   - Auto-Benachrichtigungen via Email/Push

3. **Predictive Analytics:**
   - ML-Modell für Risiko-Forecast
   - "Legal Pulse Forecast" Feature

4. **Markt-Benchmarking:**
   - Anonymisierte Vertragsvergleiche
   - Branchen-Durchschnitte

---

## 📚 Architecture Diagram

```
┌─────────────────┐
│   Frontend      │
│   (React)       │
│                 │
│ useLegalPulse   │
│   Feed Hook     │
└────────┬────────┘
         │ SSE
         │
┌────────▼────────┐
│   Backend       │
│   (Express)     │
│                 │
│ /legalpulse/    │
│   stream        │
└────────┬────────┘
         │
    ┌────▼────┐
    │ Trigger │
    │ Engine  │
    └────┬────┘
         │
    ┌────▼────┐      ┌──────────┐
    │   RAG   │◄────►│ OpenAI   │
    │  System │      │ Embeddings│
    └────┬────┘      └──────────┘
         │
    ┌────▼────┐
    │ MongoDB │
    │         │
    │ - Laws  │
    │ - Contracts │
    └─────────┘
```

---

## ✅ Acceptance Criteria (DoD)

- [x] Seed: Mindestens 3 Gesetzes-Abschnitte im Law-Index
- [x] Analyse: aiLegalPulse nutzt lawEmbeddings.queryRelevantSections
- [x] Schema: Contract.legalPulse enthält healthScore, analysisHistory, lawInsights
- [x] Trigger: lawChangeDetector + legalPulseTrigger erzeugen Alerts
- [x] Feed: GET /legalpulse/stream streamt Alerts
- [x] Frontend: Health-Badge, Trend, Source-Links, Live-Feed
- [x] Keine Regressions in bestehenden Tabs

---

## 👥 Team Handoff

**Für Noah:**

1. **ENV Variables** in `.env` hinzufügen
2. **Seed Script** ausführen: `node backend/scripts/seed_laws.js`
3. **Backend & Frontend** starten und Tests durchführen
4. **Optional:** CSS-Styles für neue Klassen hinzufügen:
   - `.healthScoreBadge`
   - `.feedTab`, `.feedEvent`, `.feedStatus`
   - `.statusConnected`, `.statusDisconnected`
   - `.liveDot` (animierter grüner Punkt)

5. **Zukünftig:** API-Keys für EU-Lex/Bundesanzeiger besorgen (Phase 2)

---

**Generated with Legal Pulse 2.0** 🚀
*Built by Claude Code @ Anthropic*
