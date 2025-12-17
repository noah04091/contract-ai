# Legal Lens - Technische Architektur

## 1. Feature-Übersicht

**Legal Lens** ist ein interaktives Vertragsanalyse-Tool, das Nutzern ermöglicht, Verträge Klausel für Klausel zu verstehen, zu bewerten und zu verhandeln.

### Kernfunktionen (v1)

| Feature | Beschreibung | Priorität |
|---------|-------------|-----------|
| Split-View Layout | PDF links, Analyse rechts | P0 |
| Klickbare Klauseln | Jeder Paragraph/Satz ist anklickbar | P0 |
| KI-Erklärung | Vereinfachte Erklärung pro Klausel | P0 |
| Impact-Level | 🟢🟡🔴 Risiko-Bewertung | P0 |
| Perspektivwechsel | 4 verschiedene Blickwinkel | P0 |
| Konsequenzen-Analyse | "Was bedeutet das für mich?" | P0 |
| Alternative Formulierungen | Bessere Klausel-Vorschläge | P1 |
| Verhandlungstipps | Argumentationshilfen | P1 |
| Chat-Nachfragen | Fragen zur aktuellen Klausel | P1 |
| Fortschritts-Tracking | "X% analysiert" | P1 |
| Export | Annotiertes PDF | P2 |
| E-Mail-Generator | Verhandlungs-Mail erstellen | P2 |

---

## 2. System-Architektur

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND                                    │
│                         (React + TypeScript)                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────┐  │
│  │   LegalLens      │  │   PDFViewer      │  │   AnalysisPanel      │  │
│  │   (Container)    │──│   (Left Side)    │──│   (Right Side)       │  │
│  └──────────────────┘  └──────────────────┘  └──────────────────────┘  │
│           │                     │                       │               │
│           │                     │                       │               │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────┐  │
│  │   ClauseParser   │  │   ClauseOverlay  │  │   ExplanationCard    │  │
│  │   (Text->Sätze)  │  │   (Highlights)   │  │   ImpactCard         │  │
│  └──────────────────┘  └──────────────────┘  │   AlternativeCard    │  │
│                                              │   NegotiationCard    │  │
│                                              │   ChatInput          │  │
│                                              └──────────────────────┘  │
│                                                                          │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │
                                    │ REST API / SSE (Streaming)
                                    │
┌───────────────────────────────────┴─────────────────────────────────────┐
│                              BACKEND                                     │
│                         (Node.js + Express)                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────┐  │
│  │   /api/legal-    │  │   ClauseParser   │  │   AnalysisCache      │  │
│  │   lens/*         │  │   Service        │  │   (Redis/Memory)     │  │
│  └──────────────────┘  └──────────────────┘  └──────────────────────┘  │
│           │                     │                       │               │
│           │                     │                       │               │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────┐  │
│  │   GPT-4 Service  │  │   Perspective    │  │   PDF Export         │  │
│  │   (OpenAI API)   │  │   Templates      │  │   Service            │  │
│  └──────────────────┘  └──────────────────┘  └──────────────────────┘  │
│                                                                          │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │
┌───────────────────────────────────┴─────────────────────────────────────┐
│                              DATABASE                                    │
│                            (MongoDB)                                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────┐  │
│  │   Contracts      │  │   ClauseAnalysis │  │   UserNotes          │  │
│  │   (existing)     │  │   (new)          │  │   (new)              │  │
│  └──────────────────┘  └──────────────────┘  └──────────────────────┘  │
│                                                                          │
│  ┌──────────────────┐  ┌──────────────────┐                             │
│  │   UserProgress   │  │   AnalysisCache  │                             │
│  │   (new)          │  │   (new)          │                             │
│  └──────────────────┘  └──────────────────┘                             │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Datenmodelle

### 3.1 ClauseAnalysis (Neu)

```javascript
// MongoDB Schema: clauseAnalyses
{
  _id: ObjectId,
  contractId: ObjectId,           // Referenz zum Contract
  clauseId: String,               // z.B. "3.2" oder "§3-2"
  clauseText: String,             // Original-Text der Klausel
  position: {
    start: Number,                // Start-Position im Dokument
    end: Number,                  // End-Position
    page: Number                  // PDF-Seite
  },

  // Risiko-Bewertung
  riskLevel: {
    type: String,
    enum: ['low', 'medium', 'high']
  },
  riskScore: Number,              // 0-100

  // Analysen pro Perspektive
  perspectives: {
    contractor: {                 // Aus Sicht Auftraggeber
      explanation: String,
      simplifiedText: String,
      impact: {
        financial: String,
        legal: String,
        operational: String
      },
      consequences: [String],
      recommendation: String
    },
    client: {                     // Aus Sicht Auftragnehmer
      // ... gleiche Struktur
    },
    neutral: {                    // Marktüblich/Neutral
      // ... gleiche Struktur
    },
    worstCase: {                  // Worst-Case Auslegung
      // ... gleiche Struktur
    }
  },

  // Verbesserungsvorschläge
  alternatives: [{
    text: String,                 // Alternative Formulierung
    benefits: [String],           // Vorteile
    difficulty: String            // 'easy', 'medium', 'hard'
  }],

  // Verhandlungstipps
  negotiation: {
    argument: String,             // Argumentationstext
    emailTemplate: String,        // E-Mail Vorlage
    tips: [String]
  },

  // Marktvergleich
  marketComparison: {
    isStandard: Boolean,
    marketRange: String,          // z.B. "3-5% üblich"
    deviation: String             // "deutlich über Markt"
  },

  // Meta
  createdAt: Date,
  updatedAt: Date,
  version: Number                 // Für Cache-Invalidierung
}
```

### 3.2 UserProgress (Neu)

```javascript
// MongoDB Schema: userProgress
{
  _id: ObjectId,
  userId: ObjectId,
  contractId: ObjectId,

  // Review-Fortschritt
  reviewedClauses: [String],      // IDs der durchgesehenen Klauseln
  totalClauses: Number,
  percentComplete: Number,

  // Bookmarks & Notizen
  bookmarks: [{
    clauseId: String,
    createdAt: Date
  }],

  notes: [{
    clauseId: String,
    content: String,
    createdAt: Date,
    updatedAt: Date
  }],

  // Session-Tracking
  sessions: [{
    startedAt: Date,
    endedAt: Date,
    clausesReviewed: Number
  }],

  lastViewedClause: String,
  currentPerspective: String,

  createdAt: Date,
  updatedAt: Date
}
```

### 3.3 AnalysisCache (Für Performance)

```javascript
// MongoDB Schema: analysisCache
{
  _id: ObjectId,
  contractId: ObjectId,
  clauseHash: String,             // MD5 Hash des Klausel-Texts
  perspective: String,

  analysis: {
    // Gecachte GPT-Antwort
  },

  createdAt: Date,
  expiresAt: Date,                // TTL Index für Auto-Löschung
  hitCount: Number                // Wie oft wurde gecacht?
}
```

---

## 4. API Endpoints

### 4.1 Neue Routes für Legal Lens

```
POST   /api/legal-lens/parse
       → Parst PDF in Klauseln, gibt strukturiertes JSON zurück

GET    /api/legal-lens/:contractId/clauses
       → Gibt alle Klauseln mit Basis-Info zurück

GET    /api/legal-lens/:contractId/clause/:clauseId
       → Gibt vollständige Analyse einer Klausel zurück

POST   /api/legal-lens/:contractId/clause/:clauseId/analyze
       → Triggert KI-Analyse (falls nicht gecacht)
       → Unterstützt SSE für Streaming

GET    /api/legal-lens/:contractId/clause/:clauseId/perspective/:type
       → Gibt Analyse für spezifische Perspektive zurück

POST   /api/legal-lens/:contractId/progress
       → Speichert User-Fortschritt

POST   /api/legal-lens/:contractId/note
       → Speichert Notiz zu einer Klausel

POST   /api/legal-lens/:contractId/bookmark
       → Speichert Bookmark

POST   /api/legal-lens/:contractId/chat
       → Fragt GPT zur aktuellen Klausel

POST   /api/legal-lens/:contractId/export
       → Generiert annotiertes PDF

POST   /api/legal-lens/:contractId/email-template
       → Generiert Verhandlungs-E-Mail
```

### 4.2 Request/Response Beispiele

#### Parse Contract
```javascript
// POST /api/legal-lens/parse
// Request:
{
  "contractId": "507f1f77bcf86cd799439011",
  // oder
  "pdfContent": "base64..."
}

// Response:
{
  "success": true,
  "clauses": [
    {
      "id": "1.1",
      "section": "§ 1 Vertragsparteien",
      "text": "Dieser Vertrag wird geschlossen zwischen...",
      "position": { "start": 0, "end": 250, "page": 1 },
      "riskLevel": "low",
      "riskScore": 15
    },
    // ...
  ],
  "totalClauses": 11,
  "riskSummary": {
    "low": 4,
    "medium": 4,
    "high": 3
  }
}
```

#### Get Clause Analysis (Streaming)
```javascript
// POST /api/legal-lens/:contractId/clause/:clauseId/analyze
// Request:
{
  "perspective": "contractor",
  "stream": true
}

// Response (SSE):
event: start
data: {"clauseId": "3.2", "perspective": "contractor"}

event: explanation
data: {"content": "Diese Klausel erlaubt dem..."}

event: impact
data: {"financial": "Bis zu 101% Kostensteigerung...", ...}

event: alternative
data: {"text": "Bessere Formulierung...", "benefits": [...]}

event: negotiation
data: {"argument": "So können Sie argumentieren...", ...}

event: done
data: {"complete": true, "cached": false}
```

---

## 5. Frontend-Komponenten

### 5.1 Komponenten-Hierarchie

```
src/
├── pages/
│   └── LegalLens.tsx                 # Haupt-Seite (Container)
│
├── components/
│   └── legal-lens/
│       ├── LegalLensContainer.tsx    # Layout-Container
│       │
│       ├── pdf-viewer/
│       │   ├── PDFViewer.tsx         # PDF-Anzeige
│       │   ├── ClauseOverlay.tsx     # Klickbare Klausel-Overlay
│       │   ├── ClauseHighlight.tsx   # Highlight-Styling
│       │   └── RiskIndicator.tsx     # Farbige Risiko-Anzeige
│       │
│       ├── analysis-panel/
│       │   ├── AnalysisPanel.tsx     # Rechte Seite Container
│       │   ├── PerspectiveSwitcher.tsx
│       │   ├── ExplanationCard.tsx
│       │   ├── ImpactCard.tsx
│       │   ├── AlternativeCard.tsx
│       │   ├── NegotiationCard.tsx
│       │   └── MarketComparisonCard.tsx
│       │
│       ├── chat/
│       │   ├── ClauseChat.tsx        # Chat für Nachfragen
│       │   ├── QuickQuestions.tsx    # Vorgeschlagene Fragen
│       │   └── ChatMessage.tsx
│       │
│       ├── progress/
│       │   ├── ProgressBar.tsx
│       │   └── ClauseCounter.tsx
│       │
│       ├── actions/
│       │   ├── NoteModal.tsx
│       │   ├── BookmarkButton.tsx
│       │   ├── CopyButton.tsx
│       │   └── EmailGenerator.tsx
│       │
│       └── export/
│           ├── ExportModal.tsx
│           └── AnnotatedPDFPreview.tsx
│
├── hooks/
│   ├── useLegalLens.ts               # Haupt-Hook für State
│   ├── useClauseParser.ts            # PDF zu Klauseln
│   ├── useClauseAnalysis.ts          # Analyse abrufen
│   ├── useProgress.ts                # Fortschritt tracken
│   └── useStreamingAnalysis.ts       # SSE für Streaming
│
├── services/
│   └── legalLensApi.ts               # API-Calls
│
├── types/
│   └── legalLens.ts                  # TypeScript Interfaces
│
└── styles/
    └── LegalLens.module.css          # Styling
```

### 5.2 Haupt-Komponente (Konzept)

```tsx
// src/pages/LegalLens.tsx
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useLegalLens } from '../hooks/useLegalLens';
import LegalLensContainer from '../components/legal-lens/LegalLensContainer';
import PDFViewer from '../components/legal-lens/pdf-viewer/PDFViewer';
import AnalysisPanel from '../components/legal-lens/analysis-panel/AnalysisPanel';

export default function LegalLens() {
  const { contractId } = useParams<{ contractId: string }>();

  const {
    contract,
    clauses,
    selectedClause,
    setSelectedClause,
    analysis,
    isAnalyzing,
    perspective,
    setPerspective,
    progress,
    error
  } = useLegalLens(contractId);

  if (!contract) return <LoadingState />;
  if (error) return <ErrorState error={error} />;

  return (
    <LegalLensContainer>
      {/* Left: PDF with clickable clauses */}
      <PDFViewer
        contract={contract}
        clauses={clauses}
        selectedClause={selectedClause}
        onClauseSelect={setSelectedClause}
      />

      {/* Right: Analysis Panel */}
      <AnalysisPanel
        clause={selectedClause}
        analysis={analysis}
        isLoading={isAnalyzing}
        perspective={perspective}
        onPerspectiveChange={setPerspective}
      />

      {/* Progress Bar (Header) */}
      <ProgressBar progress={progress} />
    </LegalLensContainer>
  );
}
```

### 5.3 Custom Hook (Konzept)

```tsx
// src/hooks/useLegalLens.ts
import { useState, useEffect, useCallback } from 'react';
import * as api from '../services/legalLensApi';
import { Clause, Analysis, Perspective } from '../types/legalLens';

export function useLegalLens(contractId: string) {
  // State
  const [contract, setContract] = useState(null);
  const [clauses, setClauses] = useState<Clause[]>([]);
  const [selectedClause, setSelectedClause] = useState<Clause | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [perspective, setPerspective] = useState<Perspective>('contractor');
  const [progress, setProgress] = useState({ reviewed: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);

  // Load contract & parse clauses
  useEffect(() => {
    async function loadContract() {
      try {
        const data = await api.getContract(contractId);
        setContract(data);

        const parsed = await api.parseClauses(contractId);
        setClauses(parsed.clauses);
        setProgress({ reviewed: 0, total: parsed.totalClauses });
      } catch (err) {
        setError('Vertrag konnte nicht geladen werden');
      }
    }
    loadContract();
  }, [contractId]);

  // Analyze selected clause
  useEffect(() => {
    if (!selectedClause) return;

    async function analyze() {
      setIsAnalyzing(true);
      try {
        // Try cache first
        const cached = await api.getCachedAnalysis(
          contractId,
          selectedClause.id,
          perspective
        );

        if (cached) {
          setAnalysis(cached);
        } else {
          // Stream new analysis
          await api.streamAnalysis(
            contractId,
            selectedClause.id,
            perspective,
            (partial) => setAnalysis(prev => ({ ...prev, ...partial }))
          );
        }

        // Update progress
        setProgress(prev => ({
          ...prev,
          reviewed: prev.reviewed + 1
        }));

        // Save progress to backend
        await api.saveProgress(contractId, selectedClause.id);

      } catch (err) {
        setError('Analyse fehlgeschlagen');
      } finally {
        setIsAnalyzing(false);
      }
    }

    analyze();
  }, [selectedClause, perspective, contractId]);

  return {
    contract,
    clauses,
    selectedClause,
    setSelectedClause,
    analysis,
    isAnalyzing,
    perspective,
    setPerspective,
    progress,
    error
  };
}
```

---

## 6. Backend-Services

### 6.1 Clause Parser Service

```javascript
// backend/services/clauseParser.js

const natural = require('natural');
const tokenizer = new natural.SentenceTokenizer();

/**
 * Parst PDF-Text in strukturierte Klauseln
 */
async function parseContract(pdfText) {
  const clauses = [];

  // 1. Paragraphen erkennen (§ X oder X.)
  const paragraphRegex = /(?:§\s*(\d+(?:\.\d+)?)|^(\d+)\.)\s*([^\n]+)/gm;

  // 2. Text in Sektionen aufteilen
  const sections = splitIntoSections(pdfText, paragraphRegex);

  // 3. Jede Sektion in Klauseln unterteilen
  for (const section of sections) {
    const sectionClauses = splitIntoClauses(section);

    for (const clause of sectionClauses) {
      // 4. Basis-Risikobewertung (Keyword-basiert, vor GPT)
      const riskLevel = assessInitialRisk(clause.text);

      clauses.push({
        id: clause.id,
        section: section.title,
        text: clause.text,
        position: clause.position,
        riskLevel: riskLevel.level,
        riskScore: riskLevel.score,
        keywords: riskLevel.keywords
      });
    }
  }

  return clauses;
}

/**
 * Schnelle Risiko-Einschätzung basierend auf Keywords
 */
function assessInitialRisk(text) {
  const highRiskKeywords = [
    'unbeschränkt', 'unbegrenzt', 'ausschließlich',
    'unwiderruflich', 'Verzicht', 'Freistellung',
    'jederzeit', 'einseitig', 'ohne Ankündigung',
    'kein Anspruch', 'keine Haftung'
  ];

  const mediumRiskKeywords = [
    'berechtigt', 'vorbehalten', 'Ermessen',
    'anpassen', 'ändern', 'Kündigungsfrist',
    'Zahlungsverzug', 'Vertragsstrafe'
  ];

  const textLower = text.toLowerCase();
  let score = 0;
  const foundKeywords = [];

  for (const keyword of highRiskKeywords) {
    if (textLower.includes(keyword.toLowerCase())) {
      score += 25;
      foundKeywords.push(keyword);
    }
  }

  for (const keyword of mediumRiskKeywords) {
    if (textLower.includes(keyword.toLowerCase())) {
      score += 10;
      foundKeywords.push(keyword);
    }
  }

  return {
    level: score >= 50 ? 'high' : score >= 20 ? 'medium' : 'low',
    score: Math.min(score, 100),
    keywords: foundKeywords
  };
}

module.exports = { parseContract, assessInitialRisk };
```

### 6.2 GPT Analysis Service

```javascript
// backend/services/legalLensAnalyzer.js

const OpenAI = require('openai');
const openai = new OpenAI();

const PERSPECTIVE_PROMPTS = {
  contractor: `Du analysierst diese Vertragsklausel AUS SICHT DES AUFTRAGGEBERS (der Kunde, der den Vertrag unterschreibt).
Fokussiere auf: Risiken, versteckte Kosten, eingeschränkte Rechte, unfaire Bedingungen.`,

  client: `Du analysierst diese Vertragsklausel AUS SICHT DES AUFTRAGNEHMERS (der Dienstleister).
Fokussiere auf: Warum ist das für den Anbieter vorteilhaft? Was schützt er damit?`,

  neutral: `Du analysierst diese Vertragsklausel NEUTRAL und MARKTÜBLICH.
Vergleiche mit Branchenstandards. Ist das fair für beide Seiten?`,

  worstCase: `Du analysierst diese Vertragsklausel im WORST-CASE SZENARIO.
Was ist das Schlimmste, das passieren kann? Wie könnte die Klausel gegen den Unterzeichner ausgelegt werden?`
};

/**
 * Analysiert eine einzelne Klausel
 */
async function analyzeClause(clauseText, perspective, contractContext) {
  const systemPrompt = `Du bist ein erfahrener Vertragsanwalt, der Verträge für Laien verständlich erklärt.
${PERSPECTIVE_PROMPTS[perspective]}

Antworte IMMER in diesem JSON-Format:
{
  "explanation": {
    "simple": "Erklärung in einfacher Sprache (2-3 Sätze)",
    "detailed": "Detaillierte rechtliche Bedeutung"
  },
  "riskAssessment": {
    "level": "low|medium|high",
    "score": 0-100,
    "reasons": ["Grund 1", "Grund 2"]
  },
  "impact": {
    "financial": "Finanzielle Auswirkungen",
    "legal": "Rechtliche Konsequenzen",
    "operational": "Praktische Auswirkungen"
  },
  "consequences": [
    "Konkrete Konsequenz 1",
    "Konkrete Konsequenz 2"
  ],
  "alternative": {
    "text": "Bessere Formulierung der Klausel",
    "benefits": ["Vorteil 1", "Vorteil 2"],
    "difficulty": "easy|medium|hard"
  },
  "negotiation": {
    "argument": "Wie man verhandeln kann (2-3 Sätze)",
    "emailSnippet": "Formulierung für eine E-Mail an den Vertragspartner"
  },
  "marketComparison": {
    "isStandard": true/false,
    "marketRange": "Was ist marktüblich (z.B. '3-5%')",
    "deviation": "Wie weicht diese Klausel ab"
  }
}`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages: [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: `Kontext zum Vertrag:\n${contractContext}\n\nAnalysiere diese Klausel:\n"${clauseText}"`
      }
    ],
    response_format: { type: 'json_object' },
    temperature: 0.3,
    max_tokens: 1500
  });

  return JSON.parse(response.choices[0].message.content);
}

/**
 * Streaming-Version für bessere UX
 */
async function* analyzeClauseStreaming(clauseText, perspective, contractContext) {
  // Implementierung mit OpenAI Streaming...
  // Yields Partial-Updates für die UI
}

module.exports = { analyzeClause, analyzeClauseStreaming };
```

### 6.3 API Routes

```javascript
// backend/routes/legalLens.js

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const requirePremium = require('../middleware/requirePremium');
const { parseContract } = require('../services/clauseParser');
const { analyzeClause } = require('../services/legalLensAnalyzer');
const Contract = require('../models/Contract');
const ClauseAnalysis = require('../models/ClauseAnalysis');
const UserProgress = require('../models/UserProgress');

// Parse contract into clauses
router.post('/parse', auth, requirePremium, async (req, res) => {
  try {
    const { contractId } = req.body;

    const contract = await Contract.findOne({
      _id: contractId,
      userId: req.user.id
    });

    if (!contract) {
      return res.status(404).json({ error: 'Vertrag nicht gefunden' });
    }

    const clauses = await parseContract(contract.content);

    // Risiko-Summary
    const riskSummary = {
      low: clauses.filter(c => c.riskLevel === 'low').length,
      medium: clauses.filter(c => c.riskLevel === 'medium').length,
      high: clauses.filter(c => c.riskLevel === 'high').length
    };

    res.json({
      success: true,
      clauses,
      totalClauses: clauses.length,
      riskSummary
    });

  } catch (error) {
    console.error('Parse error:', error);
    res.status(500).json({ error: 'Parsing fehlgeschlagen' });
  }
});

// Get clause analysis
router.post('/:contractId/clause/:clauseId/analyze', auth, requirePremium, async (req, res) => {
  try {
    const { contractId, clauseId } = req.params;
    const { perspective = 'contractor', stream = false } = req.body;

    // Check cache first
    const cached = await ClauseAnalysis.findOne({
      contractId,
      clauseId,
      'perspectives': { $exists: true }
    });

    if (cached?.perspectives?.[perspective]) {
      return res.json({
        success: true,
        analysis: cached.perspectives[perspective],
        cached: true
      });
    }

    // Get contract for context
    const contract = await Contract.findById(contractId);
    const clauseText = getClauseText(contract.content, clauseId);

    if (stream) {
      // SSE Streaming
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      // Stream analysis...

    } else {
      // Regular response
      const analysis = await analyzeClause(
        clauseText,
        perspective,
        contract.content.substring(0, 2000) // Context
      );

      // Cache the result
      await ClauseAnalysis.findOneAndUpdate(
        { contractId, clauseId },
        {
          $set: {
            [`perspectives.${perspective}`]: analysis,
            clauseText,
            updatedAt: new Date()
          }
        },
        { upsert: true }
      );

      res.json({
        success: true,
        analysis,
        cached: false
      });
    }

  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({ error: 'Analyse fehlgeschlagen' });
  }
});

// Save user progress
router.post('/:contractId/progress', auth, async (req, res) => {
  try {
    const { contractId } = req.params;
    const { clauseId, totalClauses } = req.body;

    await UserProgress.findOneAndUpdate(
      { userId: req.user.id, contractId },
      {
        $addToSet: { reviewedClauses: clauseId },
        $set: {
          totalClauses,
          lastViewedClause: clauseId,
          updatedAt: new Date()
        }
      },
      { upsert: true }
    );

    res.json({ success: true });

  } catch (error) {
    res.status(500).json({ error: 'Fortschritt konnte nicht gespeichert werden' });
  }
});

// Add note to clause
router.post('/:contractId/note', auth, async (req, res) => {
  try {
    const { contractId } = req.params;
    const { clauseId, content } = req.body;

    await UserProgress.findOneAndUpdate(
      { userId: req.user.id, contractId },
      {
        $push: {
          notes: {
            clauseId,
            content,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        }
      },
      { upsert: true }
    );

    res.json({ success: true });

  } catch (error) {
    res.status(500).json({ error: 'Notiz konnte nicht gespeichert werden' });
  }
});

// Chat about clause
router.post('/:contractId/chat', auth, requirePremium, async (req, res) => {
  try {
    const { clauseId, question, clauseText } = req.body;

    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: `Du bist ein Vertragsexperte. Beantworte Fragen zu dieser Klausel kurz und verständlich.\n\nKlausel: "${clauseText}"`
        },
        { role: 'user', content: question }
      ],
      temperature: 0.5,
      max_tokens: 500
    });

    res.json({
      success: true,
      answer: response.choices[0].message.content
    });

  } catch (error) {
    res.status(500).json({ error: 'Chat fehlgeschlagen' });
  }
});

module.exports = router;
```

---

## 7. Performance-Optimierungen

### 7.1 Caching-Strategie

```javascript
// 1. Client-Side: React Query
const { data: analysis } = useQuery(
  ['clause-analysis', contractId, clauseId, perspective],
  () => api.getAnalysis(contractId, clauseId, perspective),
  {
    staleTime: 1000 * 60 * 60, // 1 Stunde
    cacheTime: 1000 * 60 * 60 * 24 // 24 Stunden
  }
);

// 2. Server-Side: MongoDB mit TTL Index
db.analysisCache.createIndex(
  { "expiresAt": 1 },
  { expireAfterSeconds: 0 }
);

// 3. Memory Cache für Hot Data
const NodeCache = require('node-cache');
const analysisCache = new NodeCache({
  stdTTL: 3600,      // 1 Stunde
  checkperiod: 120   // Alle 2 Min prüfen
});
```

### 7.2 Lazy Loading

```javascript
// Nur analysieren wenn Klausel angeklickt wird
// Pre-fetch der nächsten 2 Klauseln im Hintergrund

useEffect(() => {
  if (selectedClause) {
    const nextClauses = getNextClauses(clauses, selectedClause.id, 2);
    nextClauses.forEach(clause => {
      queryClient.prefetchQuery(
        ['clause-analysis', contractId, clause.id, perspective],
        () => api.getAnalysis(contractId, clause.id, perspective)
      );
    });
  }
}, [selectedClause]);
```

### 7.3 Streaming für bessere UX

```javascript
// Nutze Server-Sent Events für Live-Updates
function useStreamingAnalysis(contractId, clauseId, perspective) {
  const [analysis, setAnalysis] = useState({});
  const [isStreaming, setIsStreaming] = useState(false);

  useEffect(() => {
    if (!clauseId) return;

    setIsStreaming(true);
    const eventSource = new EventSource(
      `/api/legal-lens/${contractId}/clause/${clauseId}/analyze?perspective=${perspective}&stream=true`
    );

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setAnalysis(prev => ({ ...prev, ...data }));
    };

    eventSource.addEventListener('done', () => {
      setIsStreaming(false);
      eventSource.close();
    });

    return () => eventSource.close();
  }, [contractId, clauseId, perspective]);

  return { analysis, isStreaming };
}
```

---

## 8. Kosten-Schätzung (OpenAI API)

| Aktion | Tokens (ca.) | Kosten/Aufruf |
|--------|-------------|---------------|
| Klausel-Analyse (GPT-4) | ~2.000 | ~$0.06 |
| Perspektiv-Wechsel | ~1.500 | ~$0.045 |
| Chat-Frage | ~800 | ~$0.024 |
| Vollständige Vertragsanalyse (20 Klauseln) | ~40.000 | ~$1.20 |

### Kosten-Optimierung:
1. **Caching** - Gleiche Klauseln nicht erneut analysieren
2. **Batching** - Mehrere Perspektiven in einem Call
3. **GPT-3.5** - Für einfache Chat-Fragen
4. **Fingerprinting** - Ähnliche Klauseln erkennen und Cache nutzen

---

## 9. Rollout-Plan

### Phase 1: MVP (2-3 Wochen Entwicklung)
- [ ] Clause Parser Backend
- [ ] Basic Split-View UI
- [ ] Klickbare Klauseln
- [ ] Einfache Erklärung + Risiko-Level
- [ ] Eine Perspektive (Auftraggeber)

### Phase 2: Core Features (2 Wochen)
- [ ] Alle 4 Perspektiven
- [ ] Impact-Analyse
- [ ] Alternative Formulierungen
- [ ] Progress Tracking

### Phase 3: Enhancement (2 Wochen)
- [ ] Chat-Funktion
- [ ] Notizen & Bookmarks
- [ ] Verhandlungstipps
- [ ] E-Mail Generator

### Phase 4: Polish (1 Woche)
- [ ] PDF Export
- [ ] Performance-Optimierung
- [ ] Mobile Responsive
- [ ] Testing & Bug Fixes

---

## 10. Offene Fragen

1. **PDF-Rendering**: pdf.js vs. react-pdf vs. eigenes Rendering?
2. **Klausel-Erkennung**: NLP-basiert oder Regex-basiert?
3. **Pricing**: Extra Kosten für Legal Lens oder im Premium inkludiert?
4. **Offline-Mode**: Soll gecachte Analyse offline verfügbar sein?
5. **Collaboration**: Später Team-Sharing von Analysen ermöglichen?

---

*Erstellt: Dezember 2024*
*Version: 1.0*
