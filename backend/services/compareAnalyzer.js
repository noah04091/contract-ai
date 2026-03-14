// backend/services/compareAnalyzer.js — Compare V2: Two-Phase AI Analysis
const { OpenAI } = require("openai");
const crypto = require("crypto");
const { matchClauses, formatMatchesForPrompt } = require("./clauseMatcher");

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ============================================
// Constants & Limits
// ============================================
const MAX_CLAUSES = 40;
const MAX_CONTRACT_CHARS = 100000; // ~25K tokens
const MAX_DIFFERENCES = 30;
const MAX_PHASE_A_TIME = 30000; // 30s
const MAX_PHASE_B_TIME = 45000; // 45s

const VALID_CLAUSE_AREAS = [
  'parties', 'subject', 'duration', 'termination', 'payment',
  'liability', 'warranty', 'confidentiality', 'ip_rights',
  'data_protection', 'non_compete', 'force_majeure', 'jurisdiction', 'other'
];

const VALID_SEMANTIC_TYPES = ['missing', 'conflicting', 'weaker', 'stronger', 'different_scope'];
const VALID_RISK_TYPES = ['unfair_clause', 'legal_risk', 'unusual_clause', 'hidden_obligation', 'missing_protection'];
const VALID_SEVERITIES = ['low', 'medium', 'high', 'critical'];
const VALID_PRIORITIES = ['critical', 'high', 'medium', 'low'];

// ============================================
// User Profile System Prompts (shared with V1)
// ============================================
const SYSTEM_PROMPTS = {
  individual: `Fokus auf Verbraucherschutz: Widerrufsfristen, versteckte Kosten, automatische Verlängerungen, faire Kündigungsfristen, verständliche Sprache, Datenschutz.`,
  freelancer: `Fokus auf Freelancer-Geschäfte: Haftungsbegrenzung, Zahlungsbedingungen, IP/Urheberrecht, Stornierungsklauseln, Projektumfang, Gewährleistung.`,
  business: `Fokus auf Unternehmensvertragsrecht: Risikoanalyse, Compliance, Vertragsstrafen, Force Majeure, Confidentiality, Gerichtsstand, SLAs, Subunternehmer.`
};

// ============================================
// Comparison Modes
// ============================================
const COMPARISON_MODES = {
  standard: {
    name: 'Standard-Vergleich',
    promptAddition: `VERGLEICHSMODUS: Standard-Vergleich\nVergleiche beide Verträge neutral und identifiziere alle relevanten Unterschiede.`
  },
  version: {
    name: 'Versions-Vergleich',
    promptAddition: `VERGLEICHSMODUS: Versions-Vergleich (Alt vs. Neu)\nVertrag 1 = ALTE Version, Vertrag 2 = NEUE Version.\nFokus: Was wurde hinzugefügt/entfernt/geändert? Zum Vorteil oder Nachteil?`
  },
  bestPractice: {
    name: 'Best-Practice Check',
    promptAddition: `VERGLEICHSMODUS: Best-Practice Check\nVertrag 1 wird gegen branchenübliche Standards geprüft. Vertrag 2 dient als Referenz.\nFokus: Fehlende Standardklauseln, marktübliche Fristen, einseitige Regelungen.`
  },
  competition: {
    name: 'Anbieter-Vergleich',
    promptAddition: `VERGLEICHSMODUS: Anbieter-/Wettbewerbs-Vergleich\nBeide Verträge = Angebote verschiedener Anbieter.\nFokus: Preis-Leistung, Vertragslaufzeit, Leistungsumfang, Service-Level, Zusatzkosten.`
  }
};

// ============================================
// Phase A: Contract Structuring
// ============================================

function buildPhaseAPrompt(contractText) {
  // Smart truncation for very long texts
  const text = contractText.length > MAX_CONTRACT_CHARS
    ? smartTruncate(contractText, MAX_CONTRACT_CHARS)
    : contractText;

  return {
    system: `Du bist ein Vertragsstruktur-Analyst mit 20 Jahren Erfahrung im deutschen Vertragsrecht.
Deine EINZIGE Aufgabe: Einen Vertrag in seine Bestandteile zerlegen und eine maschinenlesbare Vertragskarte erstellen. Du extrahierst — du bewertest NICHT.`,
    user: `VERTRAG:
"""
${text}
"""

Erstelle für JEDEN Paragraphen/Abschnitt einen Eintrag (maximal ${MAX_CLAUSES} Klauseln — bei >40 Abschnitten thematisch zusammenfassen):
- id: "{area}_{nummer}" (z.B. "termination_1")
- area: parties|subject|duration|termination|payment|liability|warranty|confidentiality|ip_rights|data_protection|non_compete|force_majeure|jurisdiction|other
- section: Exakte Fundstelle ("§5 Abs. 2")
- title: Kurzer Titel
- originalText: Wörtliches Zitat (max 3 Sätze Kernaussage)
- summary: 1 Satz in einfacher Sprache
- keyValues: Alle konkreten Werte als Key-Value-Paare (Fristen, Beträge, %, Daten, Limits)

Plus: parties[], subject, contractType, metadata {duration, startDate, governingLaw, jurisdiction, language}

Antworte NUR mit validem JSON:
{
  "parties": [{"role": "string", "name": "string"}],
  "subject": "string",
  "contractType": "string",
  "clauses": [{"id": "string", "area": "string", "section": "string", "title": "string", "originalText": "string", "summary": "string", "keyValues": {}}],
  "metadata": {"duration": "string|null", "startDate": "string|null", "governingLaw": "string|null", "jurisdiction": "string|null", "language": "string|null"}
}

Null für fehlende Infos. NICHTS erfinden.`
  };
}

async function structureContract(contractText) {
  const prompt = buildPhaseAPrompt(contractText);
  const hash = crypto.createHash('sha256').update(contractText).digest('hex');
  console.log(`📋 Phase A: Strukturiere Vertrag (Hash: ${hash.substring(0, 12)}..., ${contractText.length} Zeichen)`);

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: prompt.system },
      { role: "user", content: prompt.user }
    ],
    temperature: 0.1,
    max_tokens: 8000,
    response_format: { type: "json_object" },
  });

  const raw = JSON.parse(completion.choices[0].message.content);
  const validated = validatePhaseAResponse(raw);

  console.log(`✅ Phase A: ${validated.clauses.length} Klauseln extrahiert, Typ: ${validated.contractType}`);
  logAIResponse('A', hash.substring(0, 12), JSON.stringify(validated).length, true);

  return validated;
}

// ============================================
// Phase B: Deep Comparison
// ============================================

function buildPerspectiveBlock(perspective) {
  switch (perspective) {
    case 'auftraggeber':
      return `PERSPEKTIVE: AUFTRAGGEBER\nDu berätst den AUFTRAGGEBER (Besteller, Käufer, Dienstleistungsnehmer). Bewerte ALLES aus seiner Sicht. Risiken für ihn wiegen schwerer. Empfehlungen zielen auf seinen Schutz ab.`;
    case 'auftragnehmer':
      return `PERSPEKTIVE: AUFTRAGNEHMER\nDu berätst den AUFTRAGNEHMER (Lieferant, Verkäufer, Dienstleister). Bewerte ALLES aus seiner Sicht. Risiken für ihn wiegen schwerer. Empfehlungen zielen auf seinen Schutz ab.`;
    default:
      return `PERSPEKTIVE: NEUTRAL\nDu berätst neutral. Bewerte Fairness und Ausgewogenheit beider Seiten.`;
  }
}

function buildModeAddition(comparisonMode) {
  const mode = COMPARISON_MODES[comparisonMode] || COMPARISON_MODES.standard;
  return mode.promptAddition;
}

function buildPhaseBPrompt(map1, map2, text1, text2, perspective, comparisonMode, userProfile, clauseMatchResult = null) {
  const profileHint = SYSTEM_PROMPTS[userProfile] || SYSTEM_PROMPTS.individual;
  const perspectiveBlock = buildPerspectiveBlock(perspective);
  const modeBlock = buildModeAddition(comparisonMode);
  const clauseMatchContext = clauseMatchResult ? formatMatchesForPrompt(clauseMatchResult) : '';

  // Truncate raw texts for context (keep them shorter since we have maps)
  const maxRawLen = 60000;
  const rawText1 = text1.length > maxRawLen ? smartTruncate(text1, maxRawLen) : text1;
  const rawText2 = text2.length > maxRawLen ? smartTruncate(text2, maxRawLen) : text2;

  return {
    system: `Du bist ein erfahrener Vertragsanwalt mit 20+ Jahren Praxis im deutschen Vertragsrecht. Dein Mandant bezahlt dich 400 EUR/Stunde für eine gründliche Erstberatung.

${profileHint}

DEIN KOMMUNIKATIONSSTIL:
- Du sprichst direkt mit deinem Mandanten: "Für Sie bedeutet das...", "Sie müssen hier aufpassen..."
- Du nennst konkrete Zahlen, Szenarien und Beispiele aus der Praxis
- Du bist ehrlich und klar — wenn ein Vertrag schlecht ist, sagst du das deutlich
- Du vermeidest JEDE Form von generischem Fülltext
- Wenn eine Klausel fehlt, erklärst du welche gesetzliche Regelung dann greift

BEWERTUNGSLOGIK FÜR KLAUSELN (KRITISCH — befolge diese Regeln exakt):

1. Fehlt eine rechtlich notwendige Klausel (z.B. Datenschutz, Haftung, Gerichtsstand),
   ist dies IMMER ein Risiko — NIEMALS ein Vorteil. Fehlende Klauseln bedeuten
   Rechtsunsicherheit, nicht Schutz.

2. Ist eine Klausel vorhanden, prüfe ZWEI Ebenen:
   - Ebene 1: Existenz (vorhanden = grundsätzlich gut)
   - Ebene 2: Qualität (Klarheit, Zweckbindung, Umfang, Marktüblichkeit)
   Eine vorhandene aber schwache Klausel ist BESSER als eine fehlende Klausel.

3. Bewerte Klauseln kontextabhängig zum VERTRAGSTYP:
   - Bei Finanzverträgen (Factoring, Leasing, Darlehen): Kosten, Gebühren, Zinsen,
     Limits und Haftung für Ausfälle sind WICHTIGER als Standardklauseln
   - Bei Dienstleistungsverträgen: SLAs, Haftung, Gewährleistung sind entscheidend
   - Bei Kaufverträgen: Gewährleistung, Sachmängelhaftung, Lieferbedingungen
   - Datenschutz, Gerichtsstand, Sprache sind selten entscheidend für die
     WIRTSCHAFTLICHE Bewertung — überbewerte sie nicht

4. FINANZIELLE AUSWIRKUNGEN (bei jedem relevanten Unterschied prüfen):
   - Direkte Kosten (Gebühren, Zinsen, Provisionen)
   - Wirtschaftliche Risiken (Haftung, Selbstbehalt, Forderungsausfälle)
   - Liquiditätsauswirkungen (Zahlungsfristen, Ankauflimits, Kündigungsfristen)
   - Opportunitätskosten (Wettbewerbsverbote, Exklusivität)
   Nenne KONKRETE EUR-Beträge oder Prozentsätze wenn möglich.

5. PRIORISIERUNG der Unterschiede (in dieser Reihenfolge):
   1. Kosten & Gebühren
   2. Haftung & Risiko
   3. Kündigung & Flexibilität
   4. Zahlungsbedingungen
   5. Gewährleistung
   6. Sonstige Klauseln (Datenschutz, Gerichtsstand etc.)

Antworte ausschließlich mit validem JSON.`,

    user: `${modeBlock}

${perspectiveBlock}

BRANCHENKONTEXT — WICHTIG:
Erkenne zuerst den VERTRAGSTYP beider Verträge (z.B. Factoringvertrag, NDA, Mietvertrag, SaaS-Vertrag).
Passe deine Analyse an den Vertragstyp an:
- Factoringvertrag: Gebührenstruktur, Ankaufquote, Selbstbehalt, Bonitätsprüfung, Forderungsabtretung, Haftung für Forderungsausfälle, Ankauflimits sind wirtschaftlich ENTSCHEIDEND
- Dienstleistungsvertrag: SLAs, Leistungsumfang, Haftungsbegrenzung, Abnahme
- Kaufvertrag: Gewährleistung, Sachmängel, Lieferbedingungen, Rügepflicht
- Mietvertrag: Mietanpassung, Nebenkosten, Instandhaltung, Kündigungsschutz
- Software/SaaS: Lizenzumfang, Verfügbarkeit, Datenmigration, Vendor-Lock-in
Die WIRTSCHAFTLICH relevanten Klauseln des jeweiligen Vertragstyps MÜSSEN bei Severity und Reihenfolge priorisiert werden.

KONTEXT — Strukturierte Vertragskarten:
VERTRAGSKARTE 1:
${JSON.stringify(map1, null, 1)}

VERTRAGSKARTE 2:
${JSON.stringify(map2, null, 1)}

VOLLTEXT VERTRAG 1 (Referenz):
"""
${rawText1}
"""

VOLLTEXT VERTRAG 2 (Referenz):
"""
${rawText2}
"""

${clauseMatchContext}
DEINE AUFGABE — 8 SCHRITTE:

SCHRITT 1 — UNTERSCHIEDE (maximal ${MAX_DIFFERENCES}, nach Severity priorisiert):
Gehe BEIDE Verträge Klausel für Klausel durch. Für JEDEN echten Unterschied:

{
  "category": "Rechtskategorie",
  "section": "§-Fundstelle",
  "contract1": "Wörtliches Zitat (max 2 Sätze). Bei fehlender Klausel: 'Keine Regelung vorhanden'",
  "contract2": "Wörtliches Zitat (max 2 Sätze). Bei fehlender Klausel: 'Keine Regelung vorhanden'",
  "severity": "low|medium|high|critical",
  "explanation": "4-6 Sätze. Sprich Mandanten DIREKT an. KONKRETE Zahlen, EUR-Beträge, Szenarien.",
  "impact": "1 Satz juristische Einordnung MIT §§-Verweisen",
  "recommendation": "KONKRETE Aktion — nicht 'Erwägen Sie'",
  "clauseArea": "parties|subject|duration|termination|payment|liability|warranty|confidentiality|ip_rights|data_protection|non_compete|force_majeure|jurisdiction|other",
  "semanticType": "missing|conflicting|weaker|stronger|different_scope",
  "financialImpact": "Geschätzter EUR-Betrag oder null",
  "marketContext": "Über/Unter/Entspricht Marktstandard oder null"
}

REGEL: Identische/sinngemäß gleiche Klauseln NICHT aufnehmen. Nur ECHTE Abweichungen.

SCHRITT 2 — STÄRKEN & SCHWÄCHEN (je 3-5 pro Vertrag):
MIT konkreten Zahlen und Fundstellen.

SCHRITT 3 — RISIKO-LEVEL pro Vertrag: "low"|"medium"|"high"

SCHRITT 4 — OVERALL SCORE pro Vertrag (0-100)

SCHRITT 5 — GESAMTURTEIL: 6-8 Sätze Fazit wie am Ende einer Erstberatung.

SCHRITT 6 — KATEGORIE-SCORES (0-100 pro Vertrag):
- fairness: Ausgewogenheit der Regelungen
- riskProtection: Schutz vor Risiken
- flexibility: Flexibilität und Anpassungsmöglichkeiten
- completeness: Vollständigkeit der Regelungen
- clarity: Klarheit und Verständlichkeit

SCHRITT 7 — RISIKO-ANALYSE (Legal Reasoning Chain):
Für jedes Risiko wende diese Denkschritte an:
  a) FAKT: Was steht im Vertrag (oder fehlt)?
  b) RECHTLICHE EINORDNUNG: Welche Norm/§§ ist relevant?
  c) KONSEQUENZ: Was passiert im Streitfall konkret?
  d) WIRTSCHAFTLICHE AUSWIRKUNG: Welcher EUR-Betrag / welches % ist betroffen?
  e) BEWERTUNG: Wie schwer wiegt das im Kontext dieses VERTRAGSTYPS?

WICHTIG: Standardmäßige Klauseln (z.B. Datenverarbeitung bei Factoring für Bonitätsprüfung)
sind KEIN hohes Risiko — nur wenn Zweckbindung oder Umfang ungewöhnlich sind.
Fehlende Klauseln sind IMMER ein Risiko (missing_protection).

{
  "clauseArea": "area",
  "riskType": "unfair_clause|legal_risk|unusual_clause|hidden_obligation|missing_protection",
  "severity": "low|medium|high|critical",
  "contract": 1|2|"both",
  "title": "Kurztitel",
  "description": "2-3 Sätze: FAKT → KONSEQUENZ → AUSWIRKUNG",
  "legalBasis": "§-Verweis oder null",
  "financialExposure": "Konkreter EUR-Betrag/% oder Beschreibung der finanziellen Auswirkung"
}

SCHRITT 8 — VERBESSERUNGSVORSCHLÄGE MIT ALTERNATIVTEXT (3-5 wichtigste, priorisiert nach wirtschaftlicher Relevanz):
{
  "clauseArea": "area",
  "targetContract": 1|2,
  "priority": "critical|high|medium|low",
  "title": "Kurztitel",
  "reason": "Warum diese Änderung wichtig ist",
  "currentText": "Aktueller Klauseltext",
  "suggestedText": "KONKRETER Alternativ-Klauseltext (als Optimierungsvorschlag / Verhandlungsoption)"
}

Antworte NUR mit diesem JSON:
{
  "differences": [...],
  "contract1Analysis": {"strengths": [...], "weaknesses": [...], "riskLevel": "low|medium|high", "score": number},
  "contract2Analysis": {"strengths": [...], "weaknesses": [...], "riskLevel": "low|medium|high", "score": number},
  "overallRecommendation": {"recommended": 1|2, "reasoning": "string", "confidence": number, "conditions": ["string"]},
  "summary": {"tldr": "2-3 Sätze ganz kurz", "detailedSummary": "4-6 Sätze", "verdict": "Vertrag X ist besser, ABER..."},
  "scores": {
    "contract1": {"overall": number, "fairness": number, "riskProtection": number, "flexibility": number, "completeness": number, "clarity": number},
    "contract2": {"overall": number, "fairness": number, "riskProtection": number, "flexibility": number, "completeness": number, "clarity": number}
  },
  "risks": [...],
  "recommendations": [...]
}`
  };
}

async function compareContractsV2(map1, map2, text1, text2, perspective = 'neutral', comparisonMode = 'standard', userProfile = 'individual', clauseMatchResult = null) {
  console.log(`🔍 Phase B: Tiefenvergleich (Perspektive: ${perspective}, Modus: ${comparisonMode}, Profil: ${userProfile})`);

  const prompt = buildPhaseBPrompt(map1, map2, text1, text2, perspective, comparisonMode, userProfile, clauseMatchResult);

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: prompt.system },
      { role: "user", content: prompt.user }
    ],
    temperature: 0.15,
    max_tokens: 16384,
    response_format: { type: "json_object" },
  });

  const raw = JSON.parse(completion.choices[0].message.content);
  console.log(`🔍 Phase B RAW keys: ${Object.keys(raw).join(', ')}`);
  console.log(`🔍 Phase B RAW risks: ${Array.isArray(raw.risks) ? raw.risks.length : typeof raw.risks}`);
  console.log(`🔍 Phase B RAW recommendations: ${Array.isArray(raw.recommendations) ? raw.recommendations.length : typeof raw.recommendations}`);
  const validated = validatePhaseBResponse(raw);
  const stabilized = stabilizeScores(validated);
  const filtered = filterIdenticalClauses(stabilized);

  console.log(`✅ Phase B: ${filtered.differences.length} Unterschiede, ${filtered.risks.length} Risiken, ${filtered.recommendations.length} Empfehlungen`);
  logAIResponse('B', 'compare', JSON.stringify(filtered).length, true);

  return filtered;
}

// ============================================
// Full V2 Pipeline
// ============================================

async function runCompareV2Pipeline(text1, text2, perspective, comparisonMode, userProfile, onProgress) {
  const progress = onProgress || (() => {});

  try {
    // Phase A: Structure both contracts in parallel
    progress('structuring', 10, 'Vertrag 1 wird strukturiert...');

    const phaseAResult = await withTimeout(
      Promise.all([
        structureContract(text1).then(r => { progress('structuring', 20, 'Vertrag 1 strukturiert, Vertrag 2 läuft...'); return r; }),
        structureContract(text2)
      ]),
      MAX_PHASE_A_TIME * 2, // Both in parallel, give double time
      'Phase A Timeout'
    );

    const [map1, map2] = phaseAResult;
    progress('mapping', 35, 'Beide Verträge strukturiert. Klauseln werden gematcht...');

    // Clause Matching: Find corresponding clauses between contracts
    let clauseMatchResult = null;
    try {
      clauseMatchResult = await matchClauses(
        map1.clauses || [],
        map2.clauses || [],
        { useEmbeddings: false } // Fast mode: token overlap only (no API cost)
      );
      progress('mapping', 42, `${clauseMatchResult.stats.matched} Klausel-Paare erkannt. Starte Tiefenvergleich...`);
    } catch (matchError) {
      console.warn(`⚠️ Clause Matching fehlgeschlagen (nicht-kritisch): ${matchError.message}`);
      progress('mapping', 42, 'Starte Tiefenvergleich...');
    }

    // Phase B: Deep comparison (with clause matching context)
    progress('comparing', 45, 'KI-Tiefenanalyse läuft...');

    const phaseBResult = await withTimeout(
      compareContractsV2(map1, map2, text1, text2, perspective, comparisonMode, userProfile, clauseMatchResult),
      MAX_PHASE_B_TIME,
      'Phase B Timeout'
    );

    progress('finalizing', 90, 'Ergebnis wird zusammengestellt...');

    // Build V2 response (include texts for re-analysis)
    const v2Result = buildV2Response(map1, map2, phaseBResult, perspective, text1, text2);

    // Attach clause matching stats (for frontend display / debugging)
    if (clauseMatchResult) {
      v2Result._clauseMatching = clauseMatchResult.stats;
    }

    progress('complete', 100, 'Analyse abgeschlossen!');
    return v2Result;

  } catch (error) {
    if (error.message?.includes('Timeout')) {
      console.warn(`⚠️ V2 Pipeline Timeout: ${error.message} — Fallback wird nicht automatisch ausgelöst`);
    }
    throw error;
  }
}

function buildV2Response(map1, map2, phaseBResult, perspective, text1, text2) {
  return {
    version: 2,

    // Phase A
    contractMap: {
      contract1: map1,
      contract2: map2,
    },

    // Phase B
    differences: phaseBResult.differences || [],
    scores: phaseBResult.scores || {
      contract1: buildDefaultScores(phaseBResult.contract1Analysis?.score),
      contract2: buildDefaultScores(phaseBResult.contract2Analysis?.score),
    },
    risks: phaseBResult.risks || [],
    recommendations: phaseBResult.recommendations || [],

    summary: phaseBResult.summary || {
      tldr: phaseBResult.contract1Analysis?.score > phaseBResult.contract2Analysis?.score
        ? 'Vertrag 1 schneidet insgesamt besser ab.'
        : 'Vertrag 2 schneidet insgesamt besser ab.',
      detailedSummary: typeof phaseBResult.summary === 'string' ? phaseBResult.summary : '',
      verdict: phaseBResult.overallRecommendation?.reasoning || '',
    },

    overallRecommendation: {
      recommended: phaseBResult.overallRecommendation?.recommended || 1,
      reasoning: phaseBResult.overallRecommendation?.reasoning || '',
      confidence: phaseBResult.overallRecommendation?.confidence || 50,
      conditions: phaseBResult.overallRecommendation?.conditions || [],
    },

    perspective,

    // V1 backward compat
    contract1Analysis: phaseBResult.contract1Analysis || { strengths: [], weaknesses: [], riskLevel: 'medium', score: 50 },
    contract2Analysis: phaseBResult.contract2Analysis || { strengths: [], weaknesses: [], riskLevel: 'medium', score: 50 },

    // Metadata
    categories: [...new Set((phaseBResult.differences || []).map(d => d.category))],

    // Raw texts for re-analysis (truncated to keep response manageable)
    _contractTexts: {
      text1: typeof text1 === 'string' ? text1.slice(0, MAX_CONTRACT_CHARS) : '',
      text2: typeof text2 === 'string' ? text2.slice(0, MAX_CONTRACT_CHARS) : '',
    },
  };
}

function buildDefaultScores(overallScore) {
  const score = overallScore || 50;
  return {
    overall: score,
    fairness: score,
    riskProtection: score,
    flexibility: score,
    completeness: score,
    clarity: score,
  };
}

// ============================================
// Validation & Repair
// ============================================

function validatePhaseAResponse(raw) {
  const result = { ...raw };

  // parties
  if (!Array.isArray(result.parties)) result.parties = [];

  // subject
  if (typeof result.subject !== 'string') result.subject = 'Nicht erkannt';

  // contractType
  if (typeof result.contractType !== 'string') result.contractType = 'Vertrag';

  // clauses
  if (!Array.isArray(result.clauses)) result.clauses = [];
  result.clauses = result.clauses.slice(0, MAX_CLAUSES).map((c, i) => ({
    id: typeof c.id === 'string' ? c.id : `clause_${i}`,
    area: VALID_CLAUSE_AREAS.includes(c.area) ? c.area : 'other',
    section: typeof c.section === 'string' ? c.section : `Abschnitt ${i + 1}`,
    title: typeof c.title === 'string' ? c.title : 'Unbenannt',
    originalText: typeof c.originalText === 'string' ? c.originalText : '',
    summary: typeof c.summary === 'string' ? c.summary : '',
    keyValues: (typeof c.keyValues === 'object' && c.keyValues !== null && !Array.isArray(c.keyValues))
      ? c.keyValues : {},
  }));

  // metadata
  if (typeof result.metadata !== 'object' || result.metadata === null) {
    result.metadata = {};
  }
  result.metadata = {
    duration: result.metadata.duration || null,
    startDate: result.metadata.startDate || null,
    governingLaw: result.metadata.governingLaw || null,
    jurisdiction: result.metadata.jurisdiction || null,
    language: result.metadata.language || null,
  };

  return result;
}

function validatePhaseBResponse(raw) {
  const result = { ...raw };

  // differences
  if (!Array.isArray(result.differences)) result.differences = [];
  result.differences = result.differences.slice(0, MAX_DIFFERENCES).map(d => ({
    category: typeof d.category === 'string' ? d.category : 'Sonstiges',
    section: typeof d.section === 'string' ? d.section : '',
    contract1: typeof d.contract1 === 'string' ? d.contract1 : 'Keine Regelung vorhanden',
    contract2: typeof d.contract2 === 'string' ? d.contract2 : 'Keine Regelung vorhanden',
    severity: VALID_SEVERITIES.includes(d.severity) ? d.severity : 'medium',
    explanation: typeof d.explanation === 'string' ? d.explanation : (typeof d.impact === 'string' ? d.impact : ''),
    impact: typeof d.impact === 'string' ? d.impact : '',
    recommendation: typeof d.recommendation === 'string' ? d.recommendation : '',
    clauseArea: VALID_CLAUSE_AREAS.includes(d.clauseArea) ? d.clauseArea : inferClauseAreaFromCategory(d.category),
    semanticType: VALID_SEMANTIC_TYPES.includes(d.semanticType) ? d.semanticType : inferSemanticType(d),
    financialImpact: typeof d.financialImpact === 'string' ? d.financialImpact : null,
    marketContext: typeof d.marketContext === 'string' ? d.marketContext : null,
  }));

  // contract1Analysis / contract2Analysis
  result.contract1Analysis = validateContractAnalysis(result.contract1Analysis);
  result.contract2Analysis = validateContractAnalysis(result.contract2Analysis);

  // overallRecommendation
  if (typeof result.overallRecommendation !== 'object' || result.overallRecommendation === null) {
    result.overallRecommendation = {};
  }
  result.overallRecommendation = {
    recommended: [1, 2].includes(result.overallRecommendation.recommended)
      ? result.overallRecommendation.recommended : 1,
    reasoning: typeof result.overallRecommendation.reasoning === 'string'
      ? result.overallRecommendation.reasoning : '',
    confidence: clamp(Number(result.overallRecommendation.confidence) || 50, 0, 100),
    conditions: Array.isArray(result.overallRecommendation.conditions)
      ? result.overallRecommendation.conditions.filter(c => typeof c === 'string') : [],
  };

  // summary
  if (typeof result.summary === 'string') {
    // GPT returned V1-style string summary — convert to V2 object
    result.summary = {
      tldr: result.summary.substring(0, 200),
      detailedSummary: result.summary,
      verdict: result.overallRecommendation.reasoning || result.summary.substring(0, 200),
    };
  } else if (typeof result.summary !== 'object' || result.summary === null) {
    result.summary = {
      tldr: `Vertrag ${result.overallRecommendation.recommended} wird empfohlen.`,
      detailedSummary: result.overallRecommendation.reasoning || '',
      verdict: result.overallRecommendation.reasoning || '',
    };
  } else {
    result.summary = {
      tldr: typeof result.summary.tldr === 'string' ? result.summary.tldr : '',
      detailedSummary: typeof result.summary.detailedSummary === 'string' ? result.summary.detailedSummary : '',
      verdict: typeof result.summary.verdict === 'string' ? result.summary.verdict : '',
    };
  }

  // scores
  if (typeof result.scores !== 'object' || result.scores === null) {
    result.scores = {};
  }
  result.scores = {
    contract1: validateCategoryScores(result.scores.contract1, result.contract1Analysis.score),
    contract2: validateCategoryScores(result.scores.contract2, result.contract2Analysis.score),
  };

  // risks
  if (!Array.isArray(result.risks)) result.risks = [];
  result.risks = result.risks.map(r => ({
    clauseArea: VALID_CLAUSE_AREAS.includes(r.clauseArea) ? r.clauseArea : 'other',
    riskType: VALID_RISK_TYPES.includes(r.riskType) ? r.riskType : 'legal_risk',
    severity: VALID_SEVERITIES.includes(r.severity) ? r.severity : 'medium',
    contract: [1, 2, 'both'].includes(r.contract) ? r.contract : 'both',
    title: typeof r.title === 'string' ? r.title : 'Risiko',
    description: typeof r.description === 'string' ? r.description : '',
    legalBasis: typeof r.legalBasis === 'string' ? r.legalBasis : null,
    financialExposure: typeof r.financialExposure === 'string' ? r.financialExposure : null,
  }));

  // recommendations
  if (!Array.isArray(result.recommendations)) result.recommendations = [];
  result.recommendations = result.recommendations.map(r => ({
    clauseArea: VALID_CLAUSE_AREAS.includes(r.clauseArea) ? r.clauseArea : 'other',
    targetContract: [1, 2].includes(r.targetContract) ? r.targetContract : 1,
    priority: VALID_PRIORITIES.includes(r.priority) ? r.priority : 'medium',
    title: typeof r.title === 'string' ? r.title : 'Empfehlung',
    reason: typeof r.reason === 'string' ? r.reason : '',
    currentText: typeof r.currentText === 'string' ? r.currentText : '',
    suggestedText: typeof r.suggestedText === 'string' ? r.suggestedText : '',
  }));

  return result;
}

function validateContractAnalysis(analysis) {
  if (typeof analysis !== 'object' || analysis === null) {
    return { strengths: [], weaknesses: [], riskLevel: 'medium', score: 50 };
  }
  return {
    strengths: Array.isArray(analysis.strengths) ? analysis.strengths.filter(s => typeof s === 'string') : [],
    weaknesses: Array.isArray(analysis.weaknesses) ? analysis.weaknesses.filter(s => typeof s === 'string') : [],
    riskLevel: ['low', 'medium', 'high'].includes(analysis.riskLevel) ? analysis.riskLevel : 'medium',
    score: clamp(Number(analysis.score) || 50, 0, 100),
  };
}

function validateCategoryScores(scores, fallbackOverall) {
  const base = fallbackOverall || 50;
  if (typeof scores !== 'object' || scores === null) {
    return buildDefaultScores(base);
  }
  return {
    overall: clamp(Number(scores.overall) || base, 0, 100),
    fairness: clamp(Number(scores.fairness) || base, 0, 100),
    riskProtection: clamp(Number(scores.riskProtection) || base, 0, 100),
    flexibility: clamp(Number(scores.flexibility) || base, 0, 100),
    completeness: clamp(Number(scores.completeness) || base, 0, 100),
    clarity: clamp(Number(scores.clarity) || base, 0, 100),
  };
}

// ============================================
// Score Stabilization
// ============================================

function stabilizeScores(result) {
  if (!result.risks || !result.scores) return result;

  const adjustScores = (scores, contractNum) => {
    const adjusted = { ...scores };
    const relevantRisks = result.risks.filter(r => r.contract === contractNum || r.contract === 'both');

    const criticalCount = relevantRisks.filter(r => r.severity === 'critical').length;
    const highCount = relevantRisks.filter(r => r.severity === 'high').length;

    // Deductions
    adjusted.riskProtection = Math.max(0, adjusted.riskProtection - (criticalCount * 10) - (highCount * 5));
    adjusted.overall = Math.max(0, adjusted.overall - (criticalCount * 8) - (highCount * 4));

    // Floor: If critical risks exist, cap scores
    if (criticalCount > 0 && adjusted.overall > 65) adjusted.overall = 65;
    if (criticalCount > 0 && adjusted.riskProtection > 50) adjusted.riskProtection = 50;

    // If no risks but score is very low, lift slightly
    if (relevantRisks.length === 0 && adjusted.riskProtection < 50) adjusted.riskProtection = 50;

    return adjusted;
  };

  result.scores.contract1 = adjustScores(result.scores.contract1, 1);
  result.scores.contract2 = adjustScores(result.scores.contract2, 2);

  // Sync overall with contract analysis score
  result.contract1Analysis.score = result.scores.contract1.overall;
  result.contract2Analysis.score = result.scores.contract2.overall;

  return result;
}

// ============================================
// Filter Identical Clauses (from V1)
// ============================================

function filterIdenticalClauses(result) {
  if (!result.differences || result.differences.length === 0) return result;

  const beforeCount = result.differences.length;

  const identicalPatterns = [
    /beide verträge.*identisch/i,
    /keine änderung erforderlich/i,
    /in beiden verträgen gleich/i,
    /identische regelung/i,
    /sinngemäß gleich/i,
    /keine abweichung/i,
    /übereinstimmend geregelt/i,
    /stimmen überein/i,
    /beide verträge (sehen|regeln|enthalten|haben).{0,60}(gleich|identisch|ähnlich|übereinstimmend)/i,
  ];

  const normalizeText = (text) => (text || '').toLowerCase().replace(/[^a-zäöüß0-9]/g, '');

  const textSimilarity = (a, b) => {
    const na = normalizeText(a);
    const nb = normalizeText(b);
    if (!na || !nb || na.length < 10 || nb.length < 10) return 0;
    if (na === nb) return 1;
    const shorter = na.length <= nb.length ? na : nb;
    const longer = na.length > nb.length ? na : nb;
    if (longer.includes(shorter)) return shorter.length / longer.length;
    let matches = 0;
    for (let i = 0; i < shorter.length; i++) {
      if (i + 8 <= shorter.length && longer.includes(shorter.substring(i, i + 8))) {
        matches += 8;
        i += 7;
      }
    }
    return matches / longer.length;
  };

  result.differences = result.differences.filter(diff => {
    const textsToCheck = [diff.explanation || '', diff.impact || '', diff.recommendation || ''];
    const matchesPattern = textsToCheck.some(text =>
      identicalPatterns.some(pattern => pattern.test(text))
    );
    const quoteSimilarity = textSimilarity(diff.contract1, diff.contract2);
    const quotesIdentical = quoteSimilarity > 0.85;

    if (matchesPattern || quotesIdentical) {
      const reason = matchesPattern ? 'Pattern-Match' : `Zitate ${Math.round(quoteSimilarity * 100)}% identisch`;
      console.log(`🔍 Identische Klausel gefiltert: "${diff.category}" (${diff.section}) — ${reason}`);
      return false;
    }
    return true;
  });

  if (beforeCount !== result.differences.length) {
    console.log(`🧹 ${beforeCount - result.differences.length} identische Klauseln gefiltert`);
  }

  return result;
}

// ============================================
// Helper Functions
// ============================================

function inferClauseAreaFromCategory(category) {
  if (!category) return 'other';
  const cat = category.toLowerCase();

  const mapping = {
    'partei': 'parties', 'vertragspartei': 'parties',
    'gegenstand': 'subject', 'leistung': 'subject', 'umfang': 'subject',
    'laufzeit': 'duration', 'dauer': 'duration', 'verlängerung': 'duration',
    'kündigung': 'termination', 'beendigung': 'termination',
    'vergütung': 'payment', 'zahlung': 'payment', 'preis': 'payment', 'gebühr': 'payment', 'kosten': 'payment',
    'haftung': 'liability', 'schadensersatz': 'liability',
    'gewährleistung': 'warranty', 'mängelansprüche': 'warranty', 'garantie': 'warranty',
    'geheimhaltung': 'confidentiality', 'vertraulichkeit': 'confidentiality', 'nda': 'confidentiality',
    'urheberrecht': 'ip_rights', 'ip': 'ip_rights', 'intellectual': 'ip_rights', 'eigentum': 'ip_rights',
    'datenschutz': 'data_protection', 'dsgvo': 'data_protection',
    'wettbewerb': 'non_compete',
    'höhere gewalt': 'force_majeure', 'force majeure': 'force_majeure',
    'gerichtsstand': 'jurisdiction', 'recht': 'jurisdiction', 'schlussbestimmung': 'jurisdiction',
  };

  for (const [keyword, area] of Object.entries(mapping)) {
    if (cat.includes(keyword)) return area;
  }
  return 'other';
}

function inferSemanticType(diff) {
  const c1 = (diff.contract1 || '').toLowerCase();
  const c2 = (diff.contract2 || '').toLowerCase();

  if (c1.includes('keine regelung') || c2.includes('keine regelung') ||
      c1.includes('nicht geregelt') || c2.includes('nicht geregelt')) {
    return 'missing';
  }

  const explanation = (diff.explanation || '').toLowerCase();
  if (explanation.includes('widerspruch') || explanation.includes('gegensätzlich') || explanation.includes('konträr')) {
    return 'conflicting';
  }
  if (explanation.includes('schwächer') || explanation.includes('weniger schutz') || explanation.includes('nachteil')) {
    return 'weaker';
  }
  if (explanation.includes('stärker') || explanation.includes('mehr schutz') || explanation.includes('vorteil')) {
    return 'stronger';
  }
  return 'different_scope';
}

function smartTruncate(text, maxLength) {
  if (text.length <= maxLength) return text;

  console.log(`🔧 Smart Truncation: ${text.length} → ${maxLength} Zeichen`);

  const beginLength = Math.floor(maxLength * 0.5);
  const middleLength = Math.floor(maxLength * 0.3);
  const endLength = Math.floor(maxLength * 0.2);

  const beginning = text.substring(0, beginLength);
  const ending = text.substring(text.length - endLength);

  const keywords = [
    'Haftung', 'Kündigung', 'Zahlung', 'Gewährleistung', 'Vertragslaufzeit',
    'Vertragsstrafe', 'Geheimhaltung', 'Datenschutz', 'Schadensersatz',
    'Force Majeure', 'Höhere Gewalt', 'Wettbewerbsverbot', 'Urheberrecht'
  ];

  const middleStart = beginLength;
  const middleEnd = text.length - endLength;
  const middleSection = text.substring(middleStart, middleEnd);

  let bestAnchor = Math.floor(middleSection.length / 2);
  for (const keyword of keywords) {
    const idx = middleSection.indexOf(keyword);
    if (idx !== -1) {
      bestAnchor = idx;
      break;
    }
  }

  const anchorStart = Math.max(0, bestAnchor - Math.floor(middleLength / 2));
  const anchorEnd = Math.min(middleSection.length, anchorStart + middleLength);
  const middle = middleSection.substring(anchorStart, anchorEnd);

  return beginning + '\n\n[...]\n\n' + middle + '\n\n[...]\n\n' + ending;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`${label}: Timeout nach ${ms}ms`)), ms)
    )
  ]);
}

function logAIResponse(phase, id, responseSize, parseSuccess) {
  console.log(`📊 [AI Log] Phase ${phase} | ID: ${id} | Size: ${responseSize} bytes | Parsed: ${parseSuccess}`);
}

// ============================================
// Exports
// ============================================

module.exports = {
  structureContract,
  compareContractsV2,
  runCompareV2Pipeline,
  buildV2Response,
  filterIdenticalClauses,
  validatePhaseAResponse,
  validatePhaseBResponse,
  COMPARISON_MODES,
  SYSTEM_PROMPTS,
};
