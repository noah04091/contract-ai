import type {
  Contract,
  RiskObject,
  RecommendationObject,
  ForecastData,
  WeeklyCheckContract,
  WeeklyCheckFinding,
  ExternalSearchResult,
} from '../../../types/legalPulse';

export const mockRiskObject: RiskObject = {
  title: 'Fehlende Datenschutzklausel',
  description: 'Der Vertrag enthält keine DSGVO-konforme Datenschutzklausel.',
  severity: 'high',
  impact: 'Hohes Bußgeldrisiko bei Datenschutzverstößen',
  solution: 'Datenschutzklausel gemäß Art. 28 DSGVO einfügen',
  recommendation: 'Sofortige Ergänzung empfohlen',
  affectedClauses: ['§3 Datenschutz'],
  legalBasis: 'DSGVO Art. 28',
};

export const mockRiskObjectLow: RiskObject = {
  title: 'Unklare Zahlungsbedingungen',
  description: 'Zahlungsfrist ist nicht eindeutig definiert.',
  severity: 'low',
  impact: 'Mögliche Verzögerungen bei Zahlungen',
  solution: 'Konkrete Zahlungsfrist angeben',
};

export const mockRecommendationObject: RecommendationObject = {
  title: 'Kündigungsfrist anpassen',
  description: 'Die Kündigungsfrist sollte auf 3 Monate erhöht werden.',
  priority: 'high',
  effort: 'niedrig',
  impact: 'Besserer Schutz bei Vertragsbeendigung',
  steps: ['Klausel §5 überarbeiten', 'Gegenseite informieren'],
  legalBasis: 'BGB §622',
};

export const mockRecommendationObjectLow: RecommendationObject = {
  title: 'Gerichtsstand festlegen',
  description: 'Gerichtsstandsvereinbarung einfügen.',
  priority: 'low',
  effort: 'niedrig',
  impact: 'Rechtssicherheit bei Streitigkeiten',
};

export const mockContract: Contract = {
  _id: 'contract-123',
  name: 'Arbeitsvertrag Max Mustermann',
  laufzeit: '24 Monate',
  kuendigung: '3 Monate zum Quartalsende',
  expiryDate: '2025-12-31',
  status: 'active',
  uploadedAt: '2024-06-15T10:30:00Z',
  legalPulse: {
    riskScore: 65,
    healthScore: 72,
    lastAnalysis: '2024-12-01T08:00:00Z',
    lastChecked: '2024-12-10T08:00:00Z',
    summary: 'Vertrag weist mittlere Risiken auf, insbesondere im Datenschutzbereich.',
    topRisks: [mockRiskObject, mockRiskObjectLow],
    recommendations: [mockRecommendationObject, mockRecommendationObjectLow],
    scoreHistory: [
      { date: '2024-10-01', score: 70 },
      { date: '2024-11-01', score: 68 },
      { date: '2024-12-01', score: 65 },
    ],
    analysisHistory: [
      {
        date: '2024-12-01',
        riskScore: 65,
        healthScore: 72,
        changes: ['Neue DSGVO-Anforderungen'],
        triggeredBy: 'weekly_check',
      },
    ],
  },
};

export const mockContractNoAnalysis: Contract = {
  _id: 'contract-456',
  name: 'Mietvertrag ohne Analyse',
  laufzeit: 'unbefristet',
  kuendigung: '3 Monate',
};

export const mockScoreHistory = [
  { date: '2024-10-01', score: 70 },
  { date: '2024-11-01', score: 68 },
  { date: '2024-12-01', score: 65 },
];

export const mockRiskLevel = {
  level: 'Mittel',
  color: '#f59e0b',
  icon: '⚠️',
};

export const mockForecastData: ForecastData = {
  contractId: 'contract-123',
  currentState: {
    impactScore: 65,
    factors: {
      baseRisk: 50,
      ageFactor: 10,
      changeDensity: 5,
      lawChangeFactor: 8,
      trendFactor: -3,
    },
    recommendation: 'Vertrag sollte in den nächsten 3 Monaten überprüft werden.',
  },
  forecast: [
    {
      month: 1,
      date: '2025-01-01',
      predictedRisk: 67,
      predictedHealth: 70,
      confidence: 85,
      events: [
        {
          type: 'law_change',
          severity: 'medium',
          description: 'Neue DSGVO-Richtlinie erwartet',
          probability: 70,
        },
      ],
      method: 'ml',
    },
    {
      month: 2,
      date: '2025-02-01',
      predictedRisk: 70,
      predictedHealth: 68,
      confidence: 75,
      events: [],
      method: 'ml',
    },
    {
      month: 3,
      date: '2025-03-01',
      predictedRisk: 72,
      predictedHealth: 65,
      confidence: 65,
      events: [
        {
          type: 'deadline',
          severity: 'high',
          description: 'Kündigungsfrist endet',
          probability: 95,
        },
      ],
      method: 'heuristic',
    },
  ],
  forecastMethod: 'ml',
  generatedAt: '2024-12-15T10:00:00Z',
  summary: {
    avgRisk: 69.7,
    maxRisk: 72,
    criticalMonths: 1,
    trend: 'increasing',
    highProbabilityEvents: 1,
    recommendation: 'Kündigungsfrist im März beachten.',
  },
};

export const mockWeeklyCheckFinding: WeeklyCheckFinding = {
  type: 'law_change',
  severity: 'warning',
  title: 'Änderung der Arbeitszeitverordnung',
  description: 'Die Arbeitszeitverordnung wurde angepasst, Auswirkungen auf §4 des Vertrags möglich.',
  affectedClause: '§4 Arbeitszeit',
  legalBasis: 'ArbZG §3',
  recommendation: 'Klausel prüfen und ggf. anpassen',
};

export const mockWeeklyCheck: WeeklyCheckContract = {
  contractId: 'contract-123',
  contractName: 'Arbeitsvertrag Max Mustermann',
  latestCheck: {
    checkDate: '2024-12-10T08:00:00Z',
    stage1Results: {
      lawChangesFound: 3,
      relevantChanges: [
        { lawId: 'arbzg-3', title: 'Arbeitszeitgesetz §3', score: 85 },
        { lawId: 'dsgvo-28', title: 'DSGVO Art. 28', score: 72 },
      ],
    },
    stage2Results: {
      hasChanges: true,
      overallStatus: 'handlungsbedarf',
      findings: [mockWeeklyCheckFinding],
      summary: 'Es wurden relevante Gesetzesänderungen gefunden.',
    },
    metadata: {
      analyzedPercentage: 95,
      chunksAnalyzed: 12,
      totalCharacters: 15000,
      confidenceScore: 88,
      dataSourcesUsed: ['bundesanzeiger', 'eulex'],
      lastDataSync: '2024-12-09T23:00:00Z',
      disclaimer: 'Automatisierte Analyse, keine Rechtsberatung.',
    },
  },
  history: [
    {
      checkDate: '2024-12-03T08:00:00Z',
      overallStatus: 'aktuell',
      findingsCount: 0,
      summary: 'Keine relevanten Änderungen gefunden.',
    },
  ],
};

export const mockSearchResults: ExternalSearchResult[] = [
  {
    source: 'eulex',
    title: 'Verordnung (EU) 2024/1234 zum Datenschutz',
    description: 'Neue EU-Verordnung zur Ergänzung der DSGVO.',
    date: '2024-11-15',
    documentId: 'CELEX:32024R1234',
    relevance: 92,
    url: 'https://eur-lex.europa.eu/legal-content/DE/TXT/?uri=CELEX:32024R1234',
  },
  {
    source: 'bundesanzeiger',
    title: 'Bekanntmachung zum Arbeitszeitgesetz',
    description: 'Aktualisierung der Arbeitszeitverordnung.',
    date: '2024-10-20',
    documentId: 'BAnz AT 20.10.2024 B1',
    relevance: 78,
  },
];

export const mockGetRiskScoreColor = (score: number | null): string => {
  if (score === null) return '#6b7280';
  if (score >= 75) return '#ef4444';
  if (score >= 50) return '#f59e0b';
  return '#22c55e';
};

export const mockGetRiskLevel = (score: number | null) => {
  if (score === null) return { level: 'Unbekannt', color: '#6b7280', icon: '❓' };
  if (score >= 75) return { level: 'Hoch', color: '#ef4444', icon: '🔴' };
  if (score >= 50) return { level: 'Mittel', color: '#f59e0b', icon: '⚠️' };
  return { level: 'Niedrig', color: '#22c55e', icon: '✅' };
};
