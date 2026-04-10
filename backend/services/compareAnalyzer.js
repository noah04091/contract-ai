// backend/services/compareAnalyzer.js — Compare V2: Two-Phase AI Analysis
const { OpenAI } = require("openai");
const crypto = require("crypto");
const { matchClauses, formatMatchesForPrompt, tokenOverlapSimilarity } = require("./clauseMatcher");
const { runBenchmarkComparison } = require("./marketBenchmarks");

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ============================================
// Constants & Limits
// ============================================
const MAX_CLAUSES = 40;
const MAX_CONTRACT_CHARS = 100000; // ~25K tokens
const MAX_DIFFERENCES = 30;
const MAX_PHASE_A_TIME = 90000; // 90s (complex contracts need more time)
const MAX_PHASE_B_TIME = 120000; // 120s (deep comparison of long contracts)

// Schicht 3: Klausel-für-Klausel Constants
const MAX_CONCURRENT_CLAUSE_CALLS = 15;
const MAX_CLAUSE_PAIRS = 20;
const MAX_MISSING_ASSESSMENTS = 8;
const MAX_CLAUSE_CALL_TIME = 15000; // 15s per call
const MAX_CLAUSE_TEXT_LENGTH = 3000; // truncate long clauses

// Layer 0: Deterministische Volltext-Extraktion — Feature Flag
const USE_RAW_VALUES = true;

// ============================================
// V2.2: Caching Infrastructure (Säule 2 + 3b)
// ============================================
const phaseACache = new Map();   // Map<hash, { result, timestamp }>
const clausePairCache = new Map(); // Map<pairHash, { result, timestamp }>
const CACHE_TTL = 10 * 60 * 1000; // 10 Minuten
const MAX_CACHE_SIZE = 20;

function cacheCleanup(cache) {
  if (cache.size <= MAX_CACHE_SIZE) return;
  // Remove oldest entries
  const entries = [...cache.entries()].sort((a, b) => a[1].timestamp - b[1].timestamp);
  const toRemove = entries.slice(0, cache.size - MAX_CACHE_SIZE);
  for (const [key] of toRemove) cache.delete(key);
}

function getCached(cache, key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    cache.delete(key);
    return null;
  }
  return entry.result;
}

function setCache(cache, key, result) {
  cache.set(key, { result, timestamp: Date.now() });
  cacheCleanup(cache);
}

// ============================================
// V3.4: Key Classification Cache (lernt über alle Compare-Calls hinweg)
// ============================================
// Map<normalizedKey, area> — wird durch preClassifyUnknownKeys() befüllt
// und durch loadKeyClassificationCache() lazy aus MongoDB vorgewärmt.
const keyClassificationCache = new Map();
let keyClassificationCacheLoaded = false;

async function loadKeyClassificationCache() {
  if (keyClassificationCacheLoaded) return;
  keyClassificationCacheLoaded = true; // markiere VOR DB-Call → kein Retry-Storm bei Fehler
  try {
    const database = require('../config/database');
    const db = await database.connect();
    const docs = await db.collection('compare_key_classifications').find({}).toArray();
    for (const doc of docs) {
      if (doc?.normKey && doc?.area && VALID_CLAUSE_AREAS.includes(doc.area)) {
        keyClassificationCache.set(doc.normKey, doc.area);
      }
    }
    console.log(`📚 KeyClassification Cache: ${keyClassificationCache.size} Einträge aus MongoDB geladen`);
  } catch (err) {
    console.warn(`⚠️ KeyClassification Cache Load fehlgeschlagen (nicht-kritisch): ${err.message}`);
  }
}

function saveKeyClassification(normKey, area, exampleValue) {
  // Fire-and-forget: blockt nie die Pipeline
  (async () => {
    try {
      const database = require('../config/database');
      const db = await database.connect();
      await db.collection('compare_key_classifications').updateOne(
        { normKey },
        {
          $set: {
            area,
            exampleValue: String(exampleValue || '').slice(0, 200),
            updatedAt: new Date(),
          },
          $inc: { useCount: 1 },
          $setOnInsert: { createdAt: new Date() },
        },
        { upsert: true }
      );
    } catch (err) {
      // Silent fail — In-Memory-Cache funktioniert weiter, Persistenz ist Bonus
    }
  })();
}

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
// V3: Document Type Intelligence — Config-driven per-type pipeline
// ============================================

const DOCUMENT_TYPE_CONFIGS = {
  // Vertrag = heutige Defaults = KEINE ÄNDERUNG am bisherigen Verhalten
  vertrag: {
    category: 'vertrag',
    label: 'Vertrag',
    relevantAreas: null,       // null = alle (heutiges Verhalten)
    irrelevantAreas: [],
    compareSkipAreas: [],  // Universell: alle Areas vergleichen, GPT filtert Relevanz
    missingSeverityOverrides: null, // null = nutze Default MISSING_SEVERITY
    promptAddition: null,      // null = kein Zusatz
    scoreLabels: null,         // null = Default Labels
    labels: {
      documentName: 'Vertrag',
      mapTab: 'Vertragskarte',
      partiesLabel: 'Vertragsparteien',
    },
    perspectiveLabels: {
      auftraggeber: 'Auftraggeber',
      auftragnehmer: 'Auftragnehmer',
      neutral: 'Neutral',
    },
    benchmarkEnabled: true,
    noiseFilter: 'standard',
  },

  datenschutz: {
    category: 'datenschutz',
    label: 'Datenschutzerklärung',
    relevantAreas: ['data_protection', 'parties', 'subject', 'jurisdiction', 'other'],
    irrelevantAreas: ['payment', 'warranty', 'non_compete', 'force_majeure', 'ip_rights', 'liability', 'termination', 'duration'],
    compareSkipAreas: [],  // Universell: alle Areas vergleichen, GPT filtert Relevanz
    missingSeverityOverrides: {
      payment: 'low', liability: 'low', warranty: 'low',
      termination: 'low', duration: 'low', non_compete: 'low',
      force_majeure: 'low', ip_rights: 'low',
      data_protection: 'critical',
    },
    promptAddition: `DOKUMENTTYP: DATENSCHUTZERKLÄRUNG / DATENSCHUTZHINWEISE
Du vergleichst zwei Datenschutz-Dokumente (NICHT Verträge!).
FOKUS auf: Art. 13/14 DSGVO Informationspflichten, Rechtsgrundlagen (Art. 6 DSGVO),
Speicherfristen, Betroffenenrechte (Art. 15-22 DSGVO), Drittland-Transfers (Art. 44-49 DSGVO),
Datenschutzbeauftragter, Cookies/Tracking, Auftragsverarbeitung (Art. 28 DSGVO).
IGNORIERE: Haftung, Kündigung, Gewährleistung, Wettbewerbsverbot — das gehört nicht in Datenschutzhinweise.
Bewerte nach: Vollständigkeit der DSGVO-Pflichtangaben, Transparenz, Aktualität.`,
    scoreLabels: {
      overall: 'Gesamt',
      fairness: 'DSGVO-Konformität',
      riskProtection: 'Transparenz',
      flexibility: 'Betroffenenrechte',
      completeness: 'Vollständigkeit',
      clarity: 'Verständlichkeit',
    },
    labels: {
      documentName: 'Datenschutzerklärung',
      mapTab: 'Dokumentstruktur',
      partiesLabel: 'Verantwortliche',
    },
    perspectiveLabels: {
      auftraggeber: 'Betroffener',
      auftragnehmer: 'Verantwortlicher',
      neutral: 'Neutral',
    },
    benchmarkEnabled: false,
    noiseFilter: 'aggressive',
  },

  agb: {
    category: 'agb',
    label: 'AGB',
    relevantAreas: ['payment', 'liability', 'warranty', 'termination', 'duration', 'jurisdiction', 'data_protection', 'subject', 'other'],
    irrelevantAreas: ['ip_rights', 'non_compete', 'force_majeure', 'confidentiality'],
    compareSkipAreas: [],  // Universell: alle Areas vergleichen, GPT filtert Relevanz
    missingSeverityOverrides: {
      ip_rights: 'low', non_compete: 'low', force_majeure: 'low', confidentiality: 'low',
      other: 'low',
      warranty: 'high',
      liability: 'high',
      termination: 'high',
    },
    promptAddition: `DOKUMENTTYP: ALLGEMEINE GESCHÄFTSBEDINGUNGEN (AGB)
Du vergleichst zwei AGB-Dokumente (NICHT individuelle Verträge!).
FOKUS auf: AGB-Kontrolle nach §§305-310 BGB, Klauselverbote (§308, §309 BGB),
überraschende Klauseln (§305c BGB), Transparenzgebot (§307 BGB),
Widerrufsrecht (§355ff BGB), Gewährleistungsausschlüsse, Haftungsbeschränkungen.
Bewerte nach: Rechtmäßigkeit, Verbraucherfreundlichkeit, Transparenz.`,
    scoreLabels: {
      overall: 'Gesamt',
      fairness: 'Verbraucherfreundlichkeit',
      riskProtection: 'Rechtmäßigkeit',
      flexibility: 'Flexibilität',
      completeness: 'Vollständigkeit',
      clarity: 'Verständlichkeit',
    },
    labels: {
      documentName: 'AGB',
      mapTab: 'AGB-Struktur',
      partiesLabel: 'Anbieter / Nutzer',
    },
    perspectiveLabels: {
      auftraggeber: 'Verbraucher',
      auftragnehmer: 'Anbieter',
      neutral: 'Neutral',
    },
    benchmarkEnabled: false,
    noiseFilter: 'standard',
  },

  rechnung: {
    category: 'rechnung',
    label: 'Rechnung',
    relevantAreas: ['payment', 'parties', 'subject', 'other'],
    irrelevantAreas: ['liability', 'warranty', 'confidentiality', 'ip_rights', 'non_compete', 'force_majeure', 'termination', 'duration', 'data_protection', 'jurisdiction'],
    compareSkipAreas: [],  // Universell: alle Areas vergleichen, GPT filtert Relevanz
    missingSeverityOverrides: {
      liability: 'low', warranty: 'low', termination: 'low', duration: 'low',
      confidentiality: 'low', ip_rights: 'low', non_compete: 'low',
      force_majeure: 'low', data_protection: 'low', jurisdiction: 'low',
      payment: 'critical',
    },
    promptAddition: `DOKUMENTTYP: RECHNUNG
Du vergleichst zwei Rechnungen (NICHT Verträge!).
FOKUS auf: Leistungspositionen, Beträge, Steuersätze (USt), Zahlungsbedingungen,
Skonto, Fälligkeitsdaten, Rechnungsnummern, Pflichtangaben nach §14 UStG.
IGNORIERE komplett: Haftung, Kündigung, Gewährleistung, Datenschutz — das gehört nicht auf Rechnungen.
Bewerte nach: Korrektheit der Berechnung, Vollständigkeit der Pflichtangaben, Preis-Leistung.`,
    scoreLabels: {
      overall: 'Gesamt',
      fairness: 'Preis-Leistung',
      riskProtection: 'Korrektheit',
      flexibility: 'Zahlungsbedingungen',
      completeness: 'Pflichtangaben',
      clarity: 'Übersichtlichkeit',
    },
    labels: {
      documentName: 'Rechnung',
      mapTab: 'Rechnungspositionen',
      partiesLabel: 'Rechnungssteller / -empfänger',
    },
    perspectiveLabels: {
      auftraggeber: 'Empfänger',
      auftragnehmer: 'Aussteller',
      neutral: 'Neutral',
    },
    benchmarkEnabled: false,
    noiseFilter: 'standard',
  },

  angebot: {
    category: 'angebot',
    label: 'Angebot',
    relevantAreas: ['payment', 'parties', 'subject', 'duration', 'warranty', 'liability', 'other'],
    irrelevantAreas: ['non_compete', 'force_majeure', 'confidentiality', 'data_protection', 'ip_rights'],
    compareSkipAreas: [],  // Universell: alle Areas vergleichen, GPT filtert Relevanz
    missingSeverityOverrides: {
      payment: 'critical',
      subject: 'critical',        // Fehlender Leistungsumfang bei Angeboten = sehr kritisch
      parties: 'high',            // Fehlende Anbieter-/Empfängerinfo = wichtig
      warranty: 'medium',
      liability: 'medium',
      duration: 'medium',
      non_compete: 'low', force_majeure: 'low', confidentiality: 'low',
      data_protection: 'low', ip_rights: 'low',
      termination: 'low',
      jurisdiction: 'low',
      other: 'low',
    },
    promptAddition: `DOKUMENTTYP: ANGEBOT / KOSTENVORANSCHLAG
Du vergleichst zwei Angebote (NICHT Verträge!).

WICHTIGSTE UNTERSCHIEDE bei Angeboten (in dieser Reihenfolge bewerten):
1. LEISTUNGSUMFANG: Was wird angeboten? Welche konkreten Leistungen/Produkte/Positionen enthält jedes Angebot?
   - Unterschiedliche Leistungen IMMER als Hauptunterschied hervorheben
   - Jede Leistungsposition einzeln benennen (z.B. "Angebot 1: Visitenkarten + Flyer, Angebot 2: Website-Erstellung")
2. PARTEIEN: Wer bietet an, wer ist Empfänger? Sind es verschiedene Anbieter oder verschiedene Kunden?
3. PREISE: Gesamtkosten, Einzelpreise pro Position, Preis-Leistungs-Verhältnis
   - Preise NUR im Kontext der Leistung bewerten — ein teureres Angebot kann besser sein wenn es mehr bietet
4. KONDITIONEN: Zahlungsbedingungen, Lieferfristen, Gültigkeitsdauer, Gewährleistung
5. TRANSPARENZ: Wie detailliert sind die Positionen aufgeschlüsselt?

IGNORIERE: Wettbewerbsverbot, Höhere Gewalt, Geheimhaltung, Datenschutz — das gehört nicht in Angebote.
BERECHNE wo möglich: Gesamtkosten, Kosten pro Einheit/Monat, versteckte Mehrkosten.

WICHTIG: Wenn die Angebote VERSCHIEDENE Leistungen enthalten, ist DAS der wichtigste Unterschied — nicht der Preis allein.`,
    scoreLabels: {
      overall: 'Gesamt',
      fairness: 'Preis-Leistung',
      riskProtection: 'Kostentransparenz',
      flexibility: 'Konditionen',
      completeness: 'Vollständigkeit',
      clarity: 'Übersichtlichkeit',
    },
    labels: {
      documentName: 'Angebot',
      mapTab: 'Angebotsstruktur',
      partiesLabel: 'Anbieter / Empfänger',
    },
    perspectiveLabels: {
      auftraggeber: 'Empfänger',
      auftragnehmer: 'Anbieter',
      neutral: 'Neutral',
    },
    perspectivePrompts: {
      auftraggeber: `PERSPEKTIVE: ANGEBOTSEMPFÄNGER (Käufer / Besteller)

Du vertrittst AUSSCHLIESSLICH die Interessen des ANGEBOTSEMPFÄNGERS. Du bist SEIN Berater.

BEWERTUNGS-BIAS (MUSS die Analyse durchziehen):
- Niedrige Preise / gutes Preis-Leistungs-Verhältnis → positiv bewerten
- Umfangreiche Leistungen im Grundpreis → positiv bewerten
- Lange Zahlungsfristen → GUT (mehr Liquidität)
- Umfangreiche Garantien/Gewährleistung → GUT (mehr Sicherheit)
- Transparente Kostenaufschlüsselung → GUT
- Kurze Bindungsfrist des Angebots → SCHLECHT (weniger Zeit zum Vergleichen)
- Versteckte Zusatzkosten / Nebenkosten → SCHLECHT, severity hoch
- Einschränkungen bei Gewährleistung → SCHLECHT

Bei "recommendation": Aus Empfänger-Sicht formulieren — "Verhandeln Sie den Preis...", "Fordern Sie detailliertere Aufschlüsselung..."
Bei Scores: Das Angebot mit BESSEREM Preis-Leistungs-Verhältnis bekommt den HÖHEREN Score.`,

      auftragnehmer: `PERSPEKTIVE: ANBIETER (Lieferant / Verkäufer / Dienstleister)

Du vertrittst AUSSCHLIESSLICH die Interessen des ANBIETERS. Du bist SEIN Berater.

BEWERTUNGS-BIAS (MUSS die Analyse durchziehen):
- Hohe Preise / gute Margen → positiv bewerten
- Kurze Zahlungsfristen → GUT (schnellerer Cashflow)
- Eingeschränkte Gewährleistung → GUT (weniger Risiko)
- Haftungsbegrenzung → GUT (Schadensdeckel)
- Nachtragsregelungen / Mehrvergütung → GUT
- Lange Bindungsfrist → GUT (Kunde kann nicht so leicht wechseln)
- Pauschale statt Aufwandsabrechnung → SCHLECHT bei komplexen Projekten

Bei "recommendation": Aus Anbieter-Sicht formulieren — "Die Haftungsbegrenzung schützt Sie...", "Fordern Sie Abschlagszahlungen..."
Bei Scores: Das Angebot mit BESSEREN Konditionen für den Anbieter bekommt den HÖHEREN Score.`,

      neutral: `PERSPEKTIVE: NEUTRAL (Berater)

Du berätst NEUTRAL — keiner Seite verpflichtet. Du bewertest Fairness und Transparenz.

BEWERTUNGS-LOGIK:
- Angemessenes Preis-Leistungs-Verhältnis → positiv
- Transparente Kostenaufschlüsselung → positiv
- Einseitig vorteilhafte Konditionen → negativ
- Vollständigkeit des Angebots → positiv
- Das FAIRERE und TRANSPARENTERE Angebot bekommt den höheren Score
Bei "recommendation": Schlage ausgewogene Verbesserungen vor`,
    },
    benchmarkEnabled: false,
    noiseFilter: 'standard',
  },

  allgemein: {
    category: 'allgemein',
    label: 'Dokument',
    relevantAreas: null,
    irrelevantAreas: [],
    compareSkipAreas: [],  // Universell: alle Areas vergleichen, GPT filtert Relevanz
    missingSeverityOverrides: {
      parties: 'low', subject: 'low', duration: 'low',
      termination: 'low', payment: 'low', liability: 'low',
      warranty: 'low', confidentiality: 'low', ip_rights: 'low',
      data_protection: 'low', non_compete: 'low',
      force_majeure: 'low', jurisdiction: 'low', other: 'low',
    },
    promptAddition: `DOKUMENTTYP: ALLGEMEINES DOKUMENT
Du vergleichst zwei Dokumente unbekannten Typs. Das sind KEINE Verträge im klassischen Sinn.
FOKUS auf: Inhaltliche Unterschiede, Zahlen und Werte, Konditionen, Formulierungsunterschiede, Vollständigkeit.
NICHT bewerten: Ob bestimmte Klauseln "fehlen" — bei unbekannten Dokumenttypen ist das nicht sinnvoll.
STATTDESSEN: Konzentriere dich darauf, WAS in beiden Dokumenten steht und WO sie sich unterscheiden.
Bewerte nach: Inhaltliche Qualität, Vollständigkeit, Klarheit der Formulierungen.`,
    scoreLabels: {
      overall: 'Gesamt',
      fairness: 'Ausgewogenheit',
      riskProtection: 'Genauigkeit',
      flexibility: 'Flexibilität',
      completeness: 'Vollständigkeit',
      clarity: 'Verständlichkeit',
    },
    labels: {
      documentName: 'Dokument',
      mapTab: 'Dokumentstruktur',
      partiesLabel: 'Beteiligte',
    },
    perspectiveLabels: {
      auftraggeber: 'Seite A',
      auftragnehmer: 'Seite B',
      neutral: 'Neutral',
    },
    perspectivePrompts: {
      auftraggeber: `PERSPEKTIVE: SEITE A (Dokument 1)

Du bewertest die Dokumente aus der Perspektive von Dokument 1.

BEWERTUNGS-BIAS:
- Inhalte die in Dokument 1 besser/vollständiger sind → positiv bewerten
- Stärken von Dokument 2 die Dokument 1 fehlen → als Schwäche bewerten
- Fehlende Informationen in Dokument 1 → als Verbesserungspotenzial bewerten

Bei "recommendation": Vorschläge zur Verbesserung aus Sicht von Dokument 1 formulieren.
Bei Scores: Dokument 1 wird bevorzugt bewertet wenn seine Inhalte vollständiger/besser sind.`,

      auftragnehmer: `PERSPEKTIVE: SEITE B (Dokument 2)

Du bewertest die Dokumente aus der Perspektive von Dokument 2.

BEWERTUNGS-BIAS:
- Inhalte die in Dokument 2 besser/vollständiger sind → positiv bewerten
- Stärken von Dokument 1 die Dokument 2 fehlen → als Schwäche bewerten
- Fehlende Informationen in Dokument 2 → als Verbesserungspotenzial bewerten

Bei "recommendation": Vorschläge zur Verbesserung aus Sicht von Dokument 2 formulieren.
Bei Scores: Dokument 2 wird bevorzugt bewertet wenn seine Inhalte vollständiger/besser sind.`,

      neutral: `PERSPEKTIVE: NEUTRAL (Objektiver Vergleich)

Du vergleichst beide Dokumente NEUTRAL — objektiv und unparteiisch.

BEWERTUNGS-LOGIK:
- Vollständigkeit und Qualität beider Dokumente gleichwertig bewerten
- Das QUALITATIV BESSERE Dokument bekommt den höheren Score
- Fehlende Inhalte in beiden Dokumenten gleichwertig als Schwäche bewerten
- Bei "recommendation": Objektive Verbesserungsvorschläge für beide Dokumente`,
    },
    benchmarkEnabled: false,
    noiseFilter: 'standard',
  },
};

function detectDocumentCategory(map1, map2) {
  const type1 = (map1.contractType || '').toLowerCase();
  const type2 = (map2.contractType || '').toLowerCase();

  const categorize = (type) => {
    if (/datenschutz|privacy|dsgvo|gdpr/.test(type)) return 'datenschutz';
    if (/agb|allgemeine geschäftsbedingung|terms|nutzungsbedingung/.test(type)) return 'agb';
    if (/rechnung|invoice|faktura/.test(type)) return 'rechnung';
    if (/angebot|offerte|kostenvoranschlag|proposal|quote|anbieter/.test(type)) return 'angebot';
    if (/vertrag|vereinbarung|contract|agreement|überlassung|leasing|darlehen|miet|kauf|pacht|werk|dienst|service|lizenz|franchise|rahmen/.test(type)) return 'vertrag';
    return 'allgemein';
  };

  const cat1 = categorize(type1);
  const cat2 = categorize(type2);

  if (cat1 === cat2) return cat1;

  // Einer spezifisch + einer allgemein → den spezifischen nehmen
  if (cat1 === 'allgemein' && cat2 !== 'allgemein') return cat2;
  if (cat2 === 'allgemein' && cat1 !== 'allgemein') return cat1;

  // Zwei verschiedene spezifische Typen → allgemein (sicherster Default)
  console.log(`📋 Dokumenttyp: Gemischt (${cat1} vs ${cat2}) → Fallback auf "allgemein"`);
  return 'allgemein';
}

function getDocTypeConfig(category) {
  return DOCUMENT_TYPE_CONFIGS[category] || DOCUMENT_TYPE_CONFIGS.vertrag;
}

// ============================================
// User Profile System Prompts (shared with V1)
// ============================================
const SYSTEM_PROMPTS = {
  individual: `NUTZERPROFIL: PRIVATPERSON (Verbraucher)

Du berätst eine Privatperson OHNE juristische Vorkenntnisse. Sprich einfach und verständlich.

GEWICHTUNG DER BEWERTUNG (beeinflusst Severity und Scores):
- Kosten & versteckte Gebühren → CRITICAL (Privatpersonen haben begrenztes Budget)
- Kündigungsfristen & automatische Verlängerung → HIGH (häufigste Verbraucherfalle)
- Verständlichkeit der Sprache → HIGH (unverständliche Klauseln = Risiko)
- Widerrufsrecht & Rücktritt → HIGH (gesetzlicher Verbraucherschutz)
- Datenschutz & Datennutzung → MEDIUM
- Haftungsbegrenzung → MEDIUM
- Gerichtsstand & anwendbares Recht → LOW (selten relevant für Privatpersonen)
- Compliance & SLAs → LOW (nicht relevant)

TONALITÄT: Erkläre wie einem Freund. Nutze Alltagsbeispiele.
Sage z.B. "Das bedeutet, Sie zahlen jeden Monat 49€ — auch wenn Sie nicht kündigen" statt juristischer Fachsprache.
Bei fehlenden Widerrufsrechten: IMMER auf §355 BGB hinweisen.`,

  freelancer: `NUTZERPROFIL: FREELANCER / SELBSTSTÄNDIGER

Du berätst einen erfahrenen Freelancer. Fokus auf wirtschaftliche Absicherung und Projektrisiken.

GEWICHTUNG DER BEWERTUNG (beeinflusst Severity und Scores):
- Zahlungsbedingungen & Zahlungsfristen → CRITICAL (Cashflow ist Existenzgrundlage)
- Haftungsbegrenzung & Haftungsobergrenze → CRITICAL (ein Haftungsfall kann ruinieren)
- IP/Urheberrecht & Nutzungsrechte → HIGH (Freelancer-Kernthema: wer besitzt das Ergebnis?)
- Projektumfang & Scope Creep → HIGH (unbegrenzter Scope = unbezahlte Arbeit)
- Stornierung & Ausfallhonorar → HIGH (kurzfristige Absagen sind teuer)
- Gewährleistung & Nachbesserungspflicht → MEDIUM (typisch: 2 Runden, dann Aufpreis)
- Kündigungsfristen → MEDIUM
- Wettbewerbsverbot → MEDIUM (kann Folgeaufträge blockieren)
- Datenschutz → LOW
- Gerichtsstand → LOW

TONALITÄT: Businessorientiert, pragmatisch. Rechne in EUR pro Stunde/Projekt.
Sage z.B. "Bei 80€/h Stundensatz und unbegrenzter Nachbesserung riskieren Sie 3.200€ pro Projekt" statt abstrakter Risiken.
IMMER fragen: Ist die Vergütungsregelung klar genug? Gibt es ein Cap?`,

  business: `NUTZERPROFIL: UNTERNEHMEN

Du berätst die Rechtsabteilung eines Unternehmens. Professionelle, präzise Analyse mit Fokus auf Unternehmensrisiken.

GEWICHTUNG DER BEWERTUNG (beeinflusst Severity und Scores):
- Haftung & Haftungsbegrenzung → CRITICAL (existenziell für Unternehmen)
- Vertragsstrafen & Pönalen → CRITICAL (können Millionenbeträge erreichen)
- Compliance & regulatorische Anforderungen → HIGH (Verstöße = Bußgelder + Reputationsschaden)
- Force Majeure & höhere Gewalt → HIGH (Supply-Chain-Risiken)
- Vertraulichkeit & NDA-Klauseln → HIGH (Geschäftsgeheimnisse schützen)
- SLAs & Leistungskennzahlen → HIGH (messbare Performance)
- Gerichtsstand & anwendbares Recht → MEDIUM (relevant bei internationalen Verträgen)
- Subunternehmer-Klauseln → MEDIUM (Kontrolle über Lieferkette)
- Kündigungsfristen → MEDIUM
- IP-Rechte → MEDIUM
- Datenschutz → MEDIUM (DSGVO-Konformität)
- Kosten → LOW (Budget ist sekundär, Risiko ist primär)

TONALITÄT: Professionell, Risk-Management-orientiert. Nutze Begriffe wie "Exposure", "Haftungsdeckel", "Compliance-Gap".
Quantifiziere Risiken in EUR wo möglich. Verweise auf relevante Normen (BGB, HGB, DSGVO, UWG).
Bei fehlenden Klauseln: Nenne das Ausfallrisiko konkret.`
};

// ============================================
// Comparison Modes
// ============================================
const COMPARISON_MODES = {
  standard: {
    name: 'Standard-Vergleich',
    promptAddition: `VERGLEICHSMODUS: STANDARD-VERGLEICH

Analysiere beide Verträge gleichwertig und identifiziere alle relevanten Unterschiede.
Kein Vertrag ist "Referenz" — beide werden neutral bewertet.
Gewichte alle Klausel-Bereiche nach ihrer rechtlichen und wirtschaftlichen Bedeutung.`
  },
  version: {
    name: 'Versions-Vergleich',
    promptAddition: `VERGLEICHSMODUS: VERSIONS-VERGLEICH (Alt → Neu)

⚠️ DIESER MODUS VERÄNDERT DEINE GESAMTE ANALYSE-LOGIK:

Vertrag 1 = ALTE Version (bisheriger Vertrag)
Vertrag 2 = NEUE Version (vorgeschlagene Änderung / Aktualisierung)

DEINE PFLICHT in diesem Modus:
1. Kategorisiere JEDEN Unterschied als: NEU HINZUGEFÜGT | ENTFERNT | GEÄNDERT | VERSCHÄRFT | GELOCKERT
2. Bewerte JEDE Änderung: VERBESSERUNG ✅ | VERSCHLECHTERUNG ❌ | NEUTRAL ↔️
3. Bei "explanation": Beginne IMMER mit "GEÄNDERT:", "NEU:" oder "ENTFERNT:" und erkläre dann WAS sich geändert hat und WARUM das gut/schlecht ist
4. Bei "recommendation": Sage konkret ob die neue Version angenommen werden soll oder nicht
5. Bei "severity": Entfernungen von Schutzklauseln = IMMER mindestens "high"
6. Im "verdict" (summary): Fasse zusammen: "Die neue Version ist insgesamt besser/schlechter/gemischt weil..."
7. Im "overallRecommendation": Sage klar: "Neue Version annehmen" ODER "Nachverhandeln" ODER "Bei alter Version bleiben"

SCORING-REGEL: Wenn die neue Version Schutzklauseln ENTFERNT, darf ihr Score NICHT höher sein als der der alten Version.`
  },
  bestPractice: {
    name: 'Best-Practice Check',
    promptAddition: `VERGLEICHSMODUS: BEST-PRACTICE CHECK

⚠️ DIESER MODUS VERÄNDERT DEINE GESAMTE ANALYSE-LOGIK:

Vertrag 1 = DER ZU PRÜFENDE VERTRAG (Hauptobjekt der Analyse)
Vertrag 2 = REFERENZ / BENCHMARK (dient nur als Vergleichsmaßstab)

DEINE PFLICHT in diesem Modus:
1. Bewerte Vertrag 1 GEGEN branchenübliche Standards — nicht nur gegen Vertrag 2
2. Bei "explanation": Nenne IMMER den Marktstandard explizit, z.B. "Marktüblich sind 30 Tage Kündigungsfrist, Ihr Vertrag hat 90 Tage"
3. Bewerte JEDE Klausel als: ÜBER MARKTSTANDARD 🟢 | MARKTÜBLICH 🟡 | UNTER MARKTSTANDARD 🔴 | FEHLEND ⚫
4. Bei "recommendation": Nenne den konkreten Branchenstandard als Zielwert
5. Bei "severity": Abweichungen >50% vom Marktstandard = mindestens "high"
6. Im "verdict": Sage "Vertrag 1 liegt insgesamt über/unter/im Marktdurchschnitt"
7. Die Scores von Vertrag 1 spiegeln wider, wie nahe er am Best-Practice-Standard ist (100 = perfekter Branchenstandard)
8. "risks" fokussieren sich auf: Was fehlt im Vergleich zu Best Practice? Wo ist der Vertrag ungewöhnlich schwach?
9. "recommendations" = konkrete Verbesserungen um Vertrag 1 auf Marktniveau zu bringen

SCORING-REGEL: Vertrag 2 Scores sind weniger wichtig — der Fokus liegt auf der Bewertung von Vertrag 1.`
  },
  competition: {
    name: 'Anbieter-Vergleich',
    promptAddition: `VERGLEICHSMODUS: ANBIETER-/WETTBEWERBS-VERGLEICH

⚠️ DIESER MODUS VERÄNDERT DEINE GESAMTE ANALYSE-LOGIK:

Beide Verträge = ANGEBOTE von verschiedenen Anbietern für ähnliche Leistungen.
Der Mandant muss sich für EINEN Anbieter entscheiden.

DEINE PFLICHT in diesem Modus:
1. Erstelle eine KLARE ENTSCHEIDUNGSMATRIX: Welcher Anbieter gewinnt in welchem Bereich?
2. Bei "explanation": Vergleiche DIREKT — "Anbieter A bietet X, Anbieter B bietet Y — Vorteil: Anbieter A/B"
3. PREIS-LEISTUNG ist KING: Berechne wo möglich den effektiven Preis (monatlich/jährlich/pro Einheit)
4. Bewerte diese Kategorien EXPLIZIT (in der Reihenfolge ihrer Wichtigkeit):
   a) Gesamtkosten (inkl. versteckter Gebühren, Nebenkosten, Staffelpreise)
   b) Leistungsumfang (was ist inklusive vs. Aufpreis?)
   c) Vertragsbindung (Laufzeit, Kündigungsfrist, Lock-in-Effekt)
   d) Risikoschutz (Haftung, Gewährleistung, SLA)
   e) Flexibilität (Skalierung, Änderungen, Upgrade/Downgrade)
5. Bei "severity": Preisunterschiede >20% = "high", >50% = "critical"
6. Im "verdict": Sage KLAR: "Anbieter 1/2 bietet das bessere Gesamtpaket weil..."
7. Im "overallRecommendation": EINDEUTIGE Empfehlung mit Begründung. Kein "kommt drauf an" — der Mandant will eine Antwort
8. "recommendations" = Was beim gewählten Anbieter nachverhandelt werden sollte

SCORING-REGEL: Der Score reflektiert die ATTRAKTIVITÄT des Angebots (Preis-Leistungs-Verhältnis), nicht nur die rechtliche Qualität.
Die Differenz zwischen den Scores MUSS mindestens 10 Punkte betragen, wenn ein Anbieter klar besser ist.`
  }
};

// ============================================
// V2.2 Säule 1: Deterministische Text-Segmentierung
// ============================================
const { preSplitClauses } = require('./optimizerV2/utils/clauseSplitter');

/**
 * V2.2 Säule 1: Deterministisch segmentiert den Vertragstext per Regex.
 * Gleicher Input = Gleiche Sections, immer.
 * Fallback auf alten GPT-Modus wenn <3 Sections erkannt werden.
 */
function deterministicSegmentation(text) {
  if (!text || text.length < 100) return [];

  const normalizedText = normalizeOcrText(text);
  const sections = preSplitClauses(normalizedText);

  // Filter out trivial sections (< 30 chars body)
  const meaningful = sections.filter(s => s.text && s.text.trim().length >= 30);

  if (meaningful.length < 3) return []; // Fallback: not enough structure

  // Build deterministic clause objects
  return meaningful.map((section, idx) => {
    // Extract title from first line
    const firstLine = section.text.split('\n')[0].trim();
    const title = firstLine.length <= 100 ? firstLine : firstLine.substring(0, 100);

    // Extract raw values for this section
    const sectionRawValues = extractAllValuesFromRawText(section.text);

    // Build deterministic keyValues from regex extraction
    // V3.3: Blank-value-Einträge ("Wert nicht extrahierbar") nicht in keyValues aufnehmen —
    // sie verschmutzen sonst die Vertragskarte mit halb-leerer Info.
    const keyValues = {};
    for (const rv of sectionRawValues) {
      if (isBlankRawValue(rv)) continue;
      keyValues[rv.rawKey] = rv.value;
    }

    // Deterministic ID based on section number + position
    const sectionId = `det_${(section.sectionNumber || 'sec').replace(/[^a-zA-Z0-9äöüÄÖÜß]/g, '_')}_${idx}`;

    return {
      id: sectionId,
      sectionNumber: section.sectionNumber,
      title,
      originalText: section.text,
      keyValues,
      _position: idx,
    };
  });
}

/**
 * V2.2 Säule 1: Modified Phase A prompt — GPT classifies pre-segmented sections.
 * GPT provides area + summary for each section, but does NOT determine clause boundaries.
 */
function buildPhaseAPromptWithSections(contractText, sections) {
  const text = contractText.length > MAX_CONTRACT_CHARS
    ? smartTruncate(contractText, MAX_CONTRACT_CHARS)
    : contractText;

  // Build sections overview for GPT
  const sectionsOverview = sections.map((s, i) => {
    const preview = s.originalText.substring(0, 300).replace(/\n/g, ' ');
    return `SECTION_${i} | ${s.sectionNumber || 'k.A.'} | "${s.title.substring(0, 60)}" | ${preview}...`;
  }).join('\n');

  return {
    system: `Du bist ein Dokumenten-Analyst mit 20 Jahren Erfahrung. Du bekommst ein Dokument das bereits in Abschnitte aufgeteilt wurde.
Deine EINZIGE Aufgabe: Für jeden vorgegebenen Abschnitt die Area klassifizieren und eine kurze Zusammenfassung schreiben.
Du darfst KEINE neuen Abschnitte hinzufügen, KEINE Abschnitte weglassen, KEINE Abschnittsgrenzen ändern.
Extrahiere zusätzlich Parteien, Dokumenttyp und Metadaten.`,

    user: `DOKUMENT-VOLLTEXT (Referenz):
"""
${text}
"""

VORGEGEBENE ABSCHNITTE (${sections.length} Stück):
${sectionsOverview}

DEINE AUFGABE — Für JEDEN der ${sections.length} Abschnitte oben:

1. "area": Klassifiziere als: parties|subject|duration|termination|payment|liability|warranty|confidentiality|ip_rights|data_protection|non_compete|force_majeure|jurisdiction|other
2. "summary": 1-2 Sätze in einfacher Sprache
3. "keyValues": Konkrete Werte als Key-Value-Paare (ergänzend zu den bereits extrahierten).
   Keys auf Deutsch mit Bindestrichen. Values mit Zahl + Einheit.

Zusätzlich extrahiere:
- parties[]: ALLE genannten Personen/Firmen mit Rolle. Bei Rechnungen: "Rechnungssteller"/"Rechnungsempfänger". Bei Angeboten: "Anbieter"/"Empfänger". Bei Verträgen: "Auftraggeber"/"Auftragnehmer". NIEMALS leer lassen wenn Namen im Dokument stehen!
- subject: Worum geht es
- contractType: Der erkannte Dokumenttyp (z.B. "Rechnung", "Dienstleistungsvertrag", "Angebot", "AGB")
- metadata: duration, startDate, governingLaw, jurisdiction, language

Antworte NUR mit validem JSON:
{
  "parties": [{"role": "string", "name": "string"}],
  "subject": "string",
  "contractType": "string",
  "sections": [{"index": 0, "area": "string", "summary": "string", "keyValues": {}}],
  "metadata": {"duration": "string|null", "startDate": "string|null", "governingLaw": "string|null", "jurisdiction": "string|null", "language": "string|null"}
}

WICHTIG: "sections" Array MUSS exakt ${sections.length} Einträge haben — einen für jeden vorgegebenen Abschnitt.
WICHTIG für keyValues: Keys IMMER auf Deutsch als lesbare Begriffe. Values IMMER mit Zahl UND Einheit.
FORMULARFELDER: Falls ein Abschnitt "Ausgefüllte Vertragskonditionen" am Textende steht, ordne dessen Werte (z.B. Selbstbehalt, Flatrate-Gebühr, Ankauflimit) als keyValues den PASSENDEN Fachklauseln zu (liability, payment, termination etc.) — NICHT als eigene "other"-Klausel.
ANTI-MIX (V3.4): Die Area eines Abschnitts richtet sich nach dem DOMINANTEN thematischen Inhalt, nicht danach welche Personen/Firmen erwähnt werden. Beispiele:
- Abschnitt nennt "Anbieter X" + Außenstandsdauer/Zahlungsziel/Skonto → "payment", NICHT "parties"
- Abschnitt beschreibt Selbstbehalt/Haftungsgrenze + nennt Versicherungsnehmer → "liability", NICHT "parties"
- Abschnitt nennt Kündigungsfrist + Vertragspartei → "termination", NICHT "parties"
- "parties" NUR für reine Identifikations-Abschnitte (Name, Adresse, Sitz, USt-IdNr ohne Konditionen).
Null für fehlende Infos. NICHTS erfinden.`
  };
}

/**
 * V2.2 Säule 1: Merge GPT classification with deterministic sections.
 * Sections boundaries come from Regex, areas/summaries from GPT.
 */
function mergeGptWithDeterministicSections(gptResult, sections, contractText) {
  const gptSections = gptResult.sections || [];

  const clauses = sections.map((section, idx) => {
    // Find matching GPT classification
    const gptSection = gptSections.find(gs => gs.index === idx) || gptSections[idx] || {};

    const area = VALID_CLAUSE_AREAS.includes(gptSection.area) ? gptSection.area : 'other';
    const summary = typeof gptSection.summary === 'string' ? gptSection.summary : '';

    // Merge keyValues: Regex (deterministic) + GPT (supplementary)
    const mergedKV = { ...section.keyValues };
    if (gptSection.keyValues && typeof gptSection.keyValues === 'object' && !Array.isArray(gptSection.keyValues)) {
      for (const [key, value] of Object.entries(gptSection.keyValues)) {
        const normKey = normalizeKeyForMatch(key);
        const existingNorms = Object.keys(mergedKV).map(normalizeKeyForMatch);
        const alreadyExists = existingNorms.some(ek => fuzzyKeyMatch(ek, normKey));
        if (!alreadyExists) {
          mergedKV[key] = value;
        }
      }
    }

    return {
      id: `${area}_${idx}`,
      area,
      section: section.sectionNumber || `Abschnitt ${idx + 1}`,
      title: section.title,
      originalText: section.originalText,
      summary,
      keyValues: mergedKV,
    };
  });

  // Build result in same format as validatePhaseAResponse output
  return {
    parties: Array.isArray(gptResult.parties) ? gptResult.parties : [],
    subject: typeof gptResult.subject === 'string' ? gptResult.subject : 'Nicht erkannt',
    contractType: typeof gptResult.contractType === 'string' ? gptResult.contractType : 'Vertrag',
    clauses: clauses.slice(0, MAX_CLAUSES),
    metadata: {
      duration: gptResult.metadata?.duration || null,
      startDate: gptResult.metadata?.startDate || null,
      governingLaw: gptResult.metadata?.governingLaw || null,
      jurisdiction: gptResult.metadata?.jurisdiction || null,
      language: gptResult.metadata?.language || null,
    },
  };
}

// ============================================
// Phase A: Contract Structuring
// ============================================

function buildPhaseAPrompt(contractText) {
  // Smart truncation for very long texts
  const text = contractText.length > MAX_CONTRACT_CHARS
    ? smartTruncate(contractText, MAX_CONTRACT_CHARS)
    : contractText;

  return {
    system: `Du bist ein Dokumenten-Analyst mit 20 Jahren Erfahrung in der Analyse geschäftlicher Dokumente (Verträge, Rechnungen, Angebote, AGBs, Vereinbarungen etc.).
Deine EINZIGE Aufgabe: Ein Dokument in seine Bestandteile zerlegen und eine maschinenlesbare Dokumentenkarte erstellen. Du extrahierst — du bewertest NICHT.

KRITISCHE REGEL: Erkenne zuerst den DOKUMENTTYP (Vertrag, Rechnung, Angebot, AGB, etc.) und passe deine Extraktion an:
- Bei RECHNUNGEN: Absender/Empfänger = "parties", jede Leistungsposition = eigene Klausel, Zahlungsinformationen = "payment"
- Bei VERTRÄGEN: Parteien = "parties", Paragraphen = Klauseln
- Bei ANGEBOTEN: Anbieter/Empfänger = "parties", Leistungen/Preise = Klauseln
- Bei ALLEN Dokumenttypen: Extrahiere JEDE Information die im Dokument steht. Schreibe NIEMALS "Keine Regelung vorhanden" wenn die Information im Dokument steht — egal in welchem Format sie vorliegt.

WICHTIG: Auch wenn ein Dokument keine §§-Paragraphen hat, hat es IMMER Abschnitte/Bereiche die du extrahieren kannst (Header, Positionen, Summen, Zahlungsdaten, Kontaktdaten etc.).`,
    user: `DOKUMENT:
"""
${text}
"""

SCHRITT 1 — Erkenne den Dokumenttyp (Vertrag, Rechnung, Angebot, AGB, Vereinbarung, etc.)

SCHRITT 2 — Erstelle für JEDEN Abschnitt/Bereich/Position einen Eintrag (maximal ${MAX_CLAUSES} Einträge — bei >40 thematisch zusammenfassen):
- id: "{area}_{nummer}" (z.B. "payment_1", "parties_1")
- area: parties|subject|duration|termination|payment|liability|warranty|confidentiality|ip_rights|data_protection|non_compete|force_majeure|jurisdiction|other
  Bei Rechnungen/Angeboten: Nutze "parties" für Absender/Empfänger, "payment" für Beträge/Positionen/Zahlungsdaten, "subject" für Leistungsbeschreibungen, "other" für alles Weitere
- section: Exakte Fundstelle (§-Verweis, Positionsnummer, Abschnittsname, oder "Header"/"Summenblock"/"Leistungsposition X")
- title: Kurzer Titel
- originalText: VOLLSTÄNDIGER wörtlicher Text — den KOMPLETTEN Abschnitt aus dem Dokument zitieren. NIEMALS mit "..." abkürzen oder Teile weglassen. Jeder Satz muss vollständig sein
- summary: 1 Satz in einfacher Sprache
- keyValues: Alle konkreten Werte als Key-Value-Paare. REGELN:
  1. Keys IMMER auf Deutsch, als lesbare Begriffe mit Bindestrichen: "Flatrate-Gebühr", "Ankauflimit", "Kündigungsfrist", "Selbstbehalt", "Sicherungseinbehalt", "Inkasso-Gebühr", "Mindestgebühr", "Einrichtungsgebühr", "Vertragslaufzeit" — NIEMALS englisch (NICHT "flatrateFee", NICHT "purchaseLimit", NICHT "collectionFee")
  2. Values IMMER mit Zahl UND Einheit: "1,95%", "EUR 150.000", "3 Monate", "EUR 5.000 p.a." — NIEMALS nur "EUR" ohne Betrag, NIEMALS nur eine Zahl ohne Einheit
  3. Wenn ein Wert im Dokument steht, MUSS er vollständig extrahiert werden. "EUR" allein ist WERTLOS — der konkrete Betrag muss dabei stehen

SCHRITT 3 — Extrahiere Parteien und Metadaten:
- parties[]: ALLE genannten Personen/Firmen mit Rolle. Bei Rechnungen: "Rechnungssteller" und "Rechnungsempfänger". Bei Verträgen: "Auftraggeber"/"Auftragnehmer". NIEMALS leer lassen wenn Namen im Dokument stehen!
- subject: Worum geht es (Steuerberatungsleistungen, Softwareentwicklung, Miete, etc.)
- contractType: Der erkannte Dokumenttyp (z.B. "Rechnung", "Dienstleistungsvertrag", "Angebot", "AGB")
- metadata: Ergänzende Infos

Antworte NUR mit validem JSON:
{
  "parties": [{"role": "string", "name": "string"}],
  "subject": "string",
  "contractType": "string",
  "clauses": [{"id": "string", "area": "string", "section": "string", "title": "string", "originalText": "string", "summary": "string", "keyValues": {}}],
  "metadata": {"duration": "string|null", "startDate": "string|null", "governingLaw": "string|null", "jurisdiction": "string|null", "language": "string|null"}
}

WICHTIG für originalText: Zitiere den VOLLSTÄNDIGEN Wortlaut aus dem Dokument. KEINE Abkürzung mit "...". Jeder Satz muss komplett sein.
WICHTIG für parties: Extrahiere IMMER alle Parteien/Personen/Firmen die im Dokument genannt werden — mit korrekten Rollen.

SPEZIELLE EXTRAKTION für Konditionenblätter, Preistabellen, Gebührentabellen, Leistungsverzeichnisse:
- Erstelle für JEDE Tabelle/Konditionsübersicht eine EIGENE Klausel (area: "payment" oder "subject")
- JEDER einzelne Wert (Gebühr, Limit, Frist, Prozentsatz, EUR-Betrag) MUSS als eigener keyValue-Eintrag erfasst werden
- Fasse tabellarische Werte NICHT zusammen — jeder Zahlenwert bekommt seinen eigenen Key
- Beispiel: Wenn ein Konditionenblatt "Flatrate-Gebühr: 1,95%, Ankauflimit: EUR 150.000, Selbstbehalt: EUR 5.000" enthält, dann müssen ALLE drei als separate keyValues erscheinen
- Dies ist die WICHTIGSTE Extraktion — fehlende Zahlenwerte machen die gesamte Analyse wertlos

FORMULARFELDER: Falls am Textende ein Abschnitt "Ausgefüllte Vertragskonditionen" steht:
- Diese Werte stammen aus ausgefüllten PDF-Formularfeldern und enthalten die KONKRETEN Vertragswerte
- Ordne JEDEN Formularfeld-Wert der PASSENDEN Klausel zu (z.B. Selbstbehalt → liability/Delkredere, Flatrate-Gebühr → payment/Kaufpreis, Ankauflimit → payment/Kauflimits, Kündigungsfrist → termination)
- Erstelle KEINE separate Klausel nur für Formularfelder — die Werte MÜSSEN in die keyValues der jeweiligen Fachklausel integriert werden
- Wenn eine Klausel im Vertragstext existiert (z.B. § 9 Delkrederehaftung) aber der konkrete Betrag nur im Formularfeld steht → trage den Formularfeld-Wert als keyValue in diese Klausel ein

Null für fehlende Infos. NICHTS erfinden.`
  };
}

async function structureContract(contractText) {
  const hash = crypto.createHash('sha256').update(contractText).digest('hex');

  // V2.2 Säule 2: Phase A Cache — identischer Text → identisches Ergebnis
  const cached = getCached(phaseACache, hash);
  if (cached) {
    console.log(`📋 Phase A: Cache hit (Hash: ${hash.substring(0, 12)}...) — 0 GPT-Calls`);
    return cached;
  }

  // V2.2 Säule 1: Deterministische Segmentierung (VOR GPT)
  const sections = deterministicSegmentation(contractText);
  const useDeterministicSegments = sections.length >= 3;

  const prompt = useDeterministicSegments
    ? buildPhaseAPromptWithSections(contractText, sections)
    : buildPhaseAPrompt(contractText);

  console.log(`📋 Phase A: Strukturiere Vertrag (Hash: ${hash.substring(0, 12)}..., ${contractText.length} Zeichen, ${useDeterministicSegments ? sections.length + ' det. Sections' : 'GPT-Modus'})`);

  // Layer 0: Deterministische Volltext-Extraktion (VOR GPT, instant)
  let rawValues = [];
  if (USE_RAW_VALUES) {
    rawValues = extractAllValuesFromRawText(contractText);
  }

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: prompt.system },
      { role: "user", content: prompt.user }
    ],
    temperature: 0.1,
    max_tokens: 16384,
    response_format: { type: "json_object" },
  });

  const raw = JSON.parse(completion.choices[0].message.content);

  let validated;
  if (useDeterministicSegments) {
    // V2.2 Säule 1: Merge — Regex-Sections bestimmen Grenzen, GPT bestimmt Area/Summary
    validated = mergeGptWithDeterministicSections(raw, sections, contractText);
  } else {
    validated = validatePhaseAResponse(raw);
  }

  // Expand any truncated originalText snippets from the source contract
  expandOriginalTexts(validated.clauses, contractText);

  // Maßnahme A.1: Regex-Nachextraktion für von GPT übersehene Werte
  enrichKeyValuesFromText(validated.clauses, contractText);

  // Layer 0: Regex-Werte den GPT-Klauseln zuordnen
  // V3.3: Blank-value-Einträge zentral aussortieren bevor sie irgendwo gespeichert werden
  if (USE_RAW_VALUES && rawValues.length > 0) {
    const cleanRawValues = rawValues.filter(rv => !isBlankRawValue(rv));
    assignValuesToClauses(cleanRawValues, validated.clauses, contractText);
    validated._rawValues = cleanRawValues;
  }

  // V3.1: Sicherheitsnetz — wenn parties[] top-level vorhanden aber keine Klausel mit area='parties'
  ensurePartiesClause(validated);

  // Maßnahme A.2: Qualitätsprüfung — warnt bei suspekt dünner Extraktion
  const qualityIssues = checkExtractionQuality(validated);
  if (qualityIssues.length > 0) {
    console.warn(`⚠️ Phase A Qualität: ${qualityIssues.join(' | ')}`);
  }

  console.log(`✅ Phase A: ${validated.clauses.length} Klauseln extrahiert, Typ: ${validated.contractType}`);
  logAIResponse('A', hash.substring(0, 12), JSON.stringify(validated).length, true);

  // V2.2 Säule 2: Cache result
  setCache(phaseACache, hash, validated);

  return validated;
}

// ============================================
// Phase B: Deep Comparison
// ============================================

function buildPerspectiveBlock(perspective, docConfig = null) {
  // V3.1: Custom perspective prompts for non-contract document types
  if (docConfig?.perspectivePrompts?.[perspective]) {
    return docConfig.perspectivePrompts[perspective];
  }

  switch (perspective) {
    case 'auftraggeber':
      return `PERSPEKTIVE: AUFTRAGGEBER (Besteller / Käufer / Dienstleistungsnehmer)

Du vertrittst AUSSCHLIESSLICH die Interessen des AUFTRAGGEBERS. Du bist SEIN Anwalt.

BEWERTUNGS-BIAS (MUSS die Analyse durchziehen):
- Klauseln die den Auftraggeber SCHÜTZEN → positiv bewerten, severity runter
- Klauseln die den Auftraggeber BELASTEN → negativ bewerten, severity hoch
- Fehlender Schutz FÜR den Auftraggeber → IMMER "high" oder "critical"
- Einseitige Pflichten des Auftraggebers → IMMER als Risiko flaggen
- Rechte des Auftragnehmers die zu Lasten des Auftraggebers gehen → kritisch bewerten

KONKRET:
- Lange Zahlungsfristen → GUT für den Auftraggeber (mehr Liquidität)
- Kurze Gewährleistung → SCHLECHT (weniger Schutz bei Mängeln)
- Hohe Vertragsstrafe für den Auftragnehmer → GUT (Druckmittel)
- Hohe Vertragsstrafe für den Auftraggeber → SCHLECHT (Risiko)
- Einfache Kündigung → GUT (Flexibilität)
- Haftungsbegrenzung des Auftragnehmers → SCHLECHT (weniger Ansprüche bei Schäden)

Bei "recommendation": Immer aus Auftraggeber-Sicht formulieren — "Verhandeln Sie...", "Bestehen Sie auf..."
Bei Scores: Der Vertrag mit MEHR Auftraggeber-Schutz bekommt den HÖHEREN Score.`;

    case 'auftragnehmer':
      return `PERSPEKTIVE: AUFTRAGNEHMER (Lieferant / Verkäufer / Dienstleister)

Du vertrittst AUSSCHLIESSLICH die Interessen des AUFTRAGNEHMERS. Du bist SEIN Anwalt.

BEWERTUNGS-BIAS (MUSS die Analyse durchziehen):
- Klauseln die den Auftragnehmer SCHÜTZEN → positiv bewerten, severity runter
- Klauseln die den Auftragnehmer BELASTEN → negativ bewerten, severity hoch
- Fehlender Schutz FÜR den Auftragnehmer → IMMER "high" oder "critical"
- Einseitige Pflichten des Auftragnehmers → IMMER als Risiko flaggen
- Rechte des Auftraggebers die zu Lasten des Auftragnehmers gehen → kritisch bewerten

KONKRET:
- Lange Zahlungsfristen → SCHLECHT für den Auftragnehmer (Liquiditätsrisiko)
- Kurze Gewährleistung → GUT (weniger Nachbesserungspflicht)
- Hohe Vertragsstrafe für den Auftragnehmer → SCHLECHT (finanzielles Risiko)
- Haftungsbegrenzung des Auftragnehmers → GUT (Schutz vor Großschäden)
- Unbegrenzter Projektumfang → SCHLECHT (Scope Creep ohne Mehrvergütung)
- Schnelle Zahlungsfristen → GUT (besserer Cashflow)

Bei "recommendation": Immer aus Auftragnehmer-Sicht formulieren — "Bestehen Sie auf Haftungsdeckel...", "Fordern Sie Abschlagszahlungen..."
Bei Scores: Der Vertrag mit MEHR Auftragnehmer-Schutz bekommt den HÖHEREN Score.`;

    default:
      return `PERSPEKTIVE: NEUTRAL (Mediator / Berater)

Du berätst NEUTRAL — keiner Seite verpflichtet. Du bewertest Fairness und Ausgewogenheit.

BEWERTUNGS-LOGIK:
- Einseitige Klauseln (egal zu wessen Gunsten) → negativ bewerten
- Ausgewogene Regelungen → positiv bewerten
- Fehlende Klauseln → Risiko für BEIDE Seiten bewerten
- Der FAIRERE Vertrag bekommt den höheren Score — nicht der "bessere" für eine Seite
- Bei "recommendation": Schlage Kompromisse vor, nicht einseitige Verbesserungen
- Bei "verdict": Sage welcher Vertrag FAIRER ist, nicht welcher für wen besser ist`;
  }
}

function buildModeAddition(comparisonMode) {
  const mode = COMPARISON_MODES[comparisonMode] || COMPARISON_MODES.standard;
  return mode.promptAddition;
}

function buildPhaseBPrompt(map1, map2, text1, text2, perspective, comparisonMode, userProfile, clauseMatchResult = null, deterministicPromptBlock = '') {
  const profileHint = SYSTEM_PROMPTS[userProfile] || SYSTEM_PROMPTS.individual;
  const perspectiveBlock = buildPerspectiveBlock(perspective);
  const modeBlock = buildModeAddition(comparisonMode);
  const clauseMatchContext = clauseMatchResult ? formatMatchesForPrompt(clauseMatchResult) : '';

  // Truncate raw texts for context (keep them shorter since we have maps)
  const maxRawLen = 60000;
  const rawText1 = text1.length > maxRawLen ? smartTruncate(text1, maxRawLen) : text1;
  const rawText2 = text2.length > maxRawLen ? smartTruncate(text2, maxRawLen) : text2;

  return {
    system: `Du bist ein erfahrener Dokumenten- und Vertragsanalyst mit 20+ Jahren Praxis. Dein Mandant bezahlt dich 400 EUR/Stunde für eine gründliche Erstberatung.

${profileHint}

DOKUMENTTYP-ERKENNUNG (KRITISCH — als ERSTES durchführen):
Erkenne den Dokumenttyp aus den Vertragskarten (contractType-Feld). Passe deine GESAMTE Analyse an:

- VERTRÄGE: Analysiere Klauseln, Rechte, Pflichten, Risiken wie ein Anwalt.
- RECHNUNGEN: Vergleiche Leistungspositionen, Beträge, Gebühren, Steuersätze, Zahlungsbedingungen. KEINE "fehlenden Klauseln" bemängeln die in Rechnungen nicht üblich sind (z.B. Haftung, Kündigung, Datenschutz). Fokus auf: Sind die Leistungen korrekt berechnet? Stimmen die Beträge? Welche Rechnung ist günstiger?
- ANGEBOTE: Vergleiche Preise, Leistungsumfang, Konditionen, Gültigkeitsdauer.
- AGBs: Analysiere wie Verträge, aber mit Fokus auf Verbraucherrechte (§§305-310 BGB).

WICHTIG: Wenn BEIDE Dokumente Rechnungen/Angebote sind, bewerte NICHT nach Vertragslogik.
Sage NICHT "Keine Regelung vorhanden" für Bereiche die in diesem Dokumenttyp nicht relevant sind.
Vergleiche stattdessen das was tatsächlich in den Dokumenten steht.

KRITISCHE REGEL FÜR DATENGENAUIGKEIT:
- Wenn eine Information in BEIDEN Dokumenten vorhanden ist, sage NIEMALS dass sie in einem fehlt.
- Lies die Vertragskarten UND den Volltext sorgfältig. Wenn die Vertragskarte "Keine Regelung" sagt, aber der Volltext die Info enthält, nutze den VOLLTEXT als Quelle der Wahrheit.
- Vertragsparteien/Absender/Empfänger stehen IMMER im Header — prüfe beide Dokumente sorgfältig.

DEIN KOMMUNIKATIONSSTIL:
- Du sprichst direkt mit deinem Mandanten: "Für Sie bedeutet das...", "Sie müssen hier aufpassen..."
- Du nennst konkrete Zahlen, Szenarien und Beispiele aus der Praxis
- Du bist ehrlich und klar — wenn ein Dokument schlechter ist, sagst du das deutlich
- Du vermeidest JEDE Form von generischem Fülltext
- Bei Verträgen: Wenn eine Klausel fehlt, erklärst du welche gesetzliche Regelung dann greift
- Bei Rechnungen: Fokussiere auf Preisunterschiede, Leistungsumfang, und korrekte Berechnung

BEWERTUNGSLOGIK (KRITISCH — befolge diese Regeln exakt):

1. Bei VERTRÄGEN: Fehlt eine rechtlich notwendige Klausel, ist dies ein Risiko.
   Bei RECHNUNGEN/ANGEBOTEN: "Fehlende Klauseln" (Haftung, Kündigung etc.) sind KEIN Risiko — das gehört nicht in eine Rechnung.

2. Ist eine Information vorhanden, prüfe ZWEI Ebenen:
   - Ebene 1: Existenz (vorhanden = grundsätzlich gut)
   - Ebene 2: Qualität (Klarheit, Vollständigkeit, Marktüblichkeit)

3. Bewerte kontextabhängig zum DOKUMENTTYP:
   - Bei Rechnungen: Leistungspositionen, Berechnungsgrundlagen (StBVV, HOAI etc.), Steuersätze, Zahlungsfristen
   - Bei Finanzverträgen: Kosten, Gebühren, Zinsen, Limits, Haftung
   - Bei Dienstleistungsverträgen: SLAs, Haftung, Gewährleistung
   - Bei Kaufverträgen: Gewährleistung, Sachmängelhaftung, Lieferbedingungen

4. FINANZIELLE AUSWIRKUNGEN (bei jedem relevanten Unterschied prüfen):
   - Direkte Kosten (Gebühren, Zinsen, Provisionen, Rechnungsbeträge)
   - Wirtschaftliche Risiken (Haftung, Selbstbehalt, Forderungsausfälle)
   - Liquiditätsauswirkungen (Zahlungsfristen, Fälligkeiten)
   Nenne KONKRETE EUR-Beträge oder Prozentsätze wenn möglich.

5. PRIORISIERUNG der Unterschiede (in dieser Reihenfolge):
   1. Kosten & Gebühren & Beträge
   2. Leistungsumfang & Positionen
   3. Haftung & Risiko (nur bei Verträgen)
   4. Zahlungsbedingungen & Fristen
   5. Sonstige Unterschiede

Antworte ausschließlich mit validem JSON.`,

    user: `${modeBlock}

${perspectiveBlock}

DOKUMENTTYP-ERKENNUNG — WICHTIG:
Erkenne zuerst den DOKUMENTTYP beider Dokumente aus den Dokumentenkarten (contractType-Feld).

Bei VERTRÄGEN — passe Analyse an den Vertragstyp an:
- Factoringvertrag: Gebührenstruktur, Ankaufquote, Selbstbehalt, Bonitätsprüfung, Forderungsabtretung
- Dienstleistungsvertrag: SLAs, Leistungsumfang, Haftungsbegrenzung, Abnahme
- Kaufvertrag: Gewährleistung, Sachmängelhaftung, Lieferbedingungen, Rügepflicht
- Mietvertrag: Mietanpassung, Nebenkosten, Instandhaltung, Kündigungsschutz
- Software/SaaS: Lizenzumfang, Verfügbarkeit, Datenmigration, Vendor-Lock-in

Bei RECHNUNGEN — völlig andere Analyse-Logik:
- Vergleiche Leistungspositionen: Welche Leistungen tauchen in beiden auf? Welche nur in einer?
- Vergleiche Beträge: Preise pro Position, Nettobetrag, Umsatzsteuer, Bruttobetrag
- Berechnungsgrundlagen: StBVV-Sätze, Gegenstandswerte, Multiplikatoren
- Zahlungsbedingungen: Fälligkeitsdaten, Zahlungsart, Bankverbindung
- KEINE Bewertung nach Vertragslogik (Haftung, Kündigung, Datenschutz sind irrelevant)
- Beide Rechnungen haben Parteien (Absender + Empfänger) — sage NIEMALS "Keine Regelung" wenn die Info im Dokument steht

Bei ANGEBOTEN — Fokus auf Preis-Leistungs-Vergleich:
- Leistungsumfang, Konditionen, Preise, Gültigkeit

Die WIRTSCHAFTLICH relevanten Aspekte des jeweiligen Dokumenttyps MÜSSEN bei Severity und Reihenfolge priorisiert werden.

KONTEXT — Strukturierte Dokumentenkarten:
DOKUMENTENKARTE 1:
${JSON.stringify(map1, null, 1)}

DOKUMENTENKARTE 2:
${JSON.stringify(map2, null, 1)}

VOLLTEXT DOKUMENT 1 (Referenz — bei Widersprüchen zur Dokumentenkarte hat der VOLLTEXT Vorrang):
"""
${rawText1}
"""

VOLLTEXT DOKUMENT 2 (Referenz — bei Widersprüchen zur Dokumentenkarte hat der VOLLTEXT Vorrang):
"""
${rawText2}
"""

${clauseMatchContext}
${deterministicPromptBlock ? `\n${deterministicPromptBlock}\n` : ''}
DEINE AUFGABE — 6 SCHRITTE:

SCHRITT 1 — VERIFIZIERTE UNTERSCHIEDE BEWERTEN + QUALITATIV ERGÄNZEN:

a) BEWERTUNG DER GRUPPEN: Für JEDE Gruppe aus der obigen Liste (GRUPPE_1, GRUPPE_2, etc.) schreibe eine Bewertung in "groupEvaluations".
Verwende die exakte Gruppen-ID als Key. Für jede Gruppe:
{
  "severity": "low|medium|high|critical",
  "explanation": "4-6 Sätze. Sprich Mandanten DIREKT an. KONKRETE Zahlen, EUR-Beträge, Szenarien. Erkläre WAS der Unterschied bedeutet und WARUM er relevant ist.",
  "impact": "1 Satz Einordnung (bei Verträgen: juristische §§-Verweise; bei Rechnungen: wirtschaftliche Auswirkung)",
  "recommendation": "KONKRETE Aktion — nicht 'Erwägen Sie'",
  "semanticType": "missing|conflicting|weaker|stronger|different_scope",
  "financialImpact": "Geschätzter EUR-Betrag oder null",
  "marketContext": "Über/Unter/Entspricht Marktstandard oder null"
}

WICHTIG: Du MUSST JEDE Gruppe bewerten. Lasse KEINE aus. Die Gruppen enthalten verifizierte Fakten.

b) QUALITATIVE ERGÄNZUNGEN in "additionalDifferences" (maximal 5):
Suche nach Unterschieden die NICHT in den Gruppen stehen: unterschiedliche Formulierungen, fehlende Klauseln, verschiedene Regelungstiefe. Belege mit Fundstelle.
{
  "category": "Kategorie",
  "section": "Fundstelle",
  "contract1": "Wörtliches Zitat (max 2 Sätze)",
  "contract2": "Wörtliches Zitat (max 2 Sätze)",
  "severity": "low|medium|high|critical",
  "explanation": "4-6 Sätze, direkt an den Mandanten",
  "impact": "1 Satz Einordnung",
  "recommendation": "KONKRETE Aktion",
  "clauseArea": "parties|subject|duration|termination|payment|liability|warranty|confidentiality|ip_rights|data_protection|non_compete|force_majeure|jurisdiction|other",
  "semanticType": "missing|conflicting|weaker|stronger|different_scope",
  "financialImpact": "EUR-Betrag oder null",
  "marketContext": "Marktstandard oder null"
}

REGEL: Nur ECHTE Abweichungen. Nichts das bereits in den Gruppen steht.

SCHRITT 2 — STÄRKEN & SCHWÄCHEN (je 3-5 pro Dokument):
MIT konkreten Zahlen und Fundstellen.
Bei Rechnungen: z.B. "Detaillierte Auflistung aller Positionen", "Günstigerer Gesamtpreis", "Klare Berechnungsgrundlage nach StBVV"

SCHRITT 3 — RISIKO-/PROBLEM-ANALYSE (Reasoning Chain):
Für jedes Risiko/Problem wende diese Denkschritte an:
  a) FAKT: Was steht im Dokument (oder fehlt)?
  b) EINORDNUNG: Bei Verträgen: relevante Norm/§§. Bei Rechnungen: Berechnungsgrundlage (StBVV, HOAI etc.)
  c) KONSEQUENZ: Was bedeutet das konkret?
  d) WIRTSCHAFTLICHE AUSWIRKUNG: Welcher EUR-Betrag / welches % ist betroffen?
  e) BEWERTUNG: Wie schwer wiegt das im Kontext dieses DOKUMENTTYPS?

Bei VERTRÄGEN: Fehlende Klauseln sind ein Risiko (missing_protection).
Bei RECHNUNGEN: Fehlende Pflichtangaben (§14 UStG) sind ein Problem. Fehlende Vertragsklauseln (Haftung, Kündigung) sind KEIN Problem.
Standardmäßige Angaben sind KEIN Risiko — nur wenn etwas ungewöhnlich oder falsch ist.

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

SCHRITT 4 — VERBESSERUNGSVORSCHLÄGE MIT ALTERNATIVTEXT (3-5 wichtigste, priorisiert nach wirtschaftlicher Relevanz):
{
  "clauseArea": "area",
  "targetContract": 1|2,
  "priority": "critical|high|medium|low",
  "title": "Kurztitel",
  "reason": "Warum diese Änderung wichtig ist",
  "currentText": "Aktueller Klauseltext",
  "suggestedText": "KONKRETER Alternativ-Klauseltext (als Optimierungsvorschlag / Verhandlungsoption)"
}

SCHRITT 5 — SCORES:
Overall Score (0-100) pro Dokument + 5 Kategorie-Scores + Risiko-Level.

SCORE-REGELN (STRENG BEFOLGEN):
- Zähle die Unterschiede: Welches Dokument hat MEHR high/critical Severity-Punkte GEGEN sich?
- Das Dokument mit mehr schweren Schwächen MUSS einen deutlich niedrigeren Score haben.
- MINIMUM 15 Punkte Differenz wenn ein Dokument klar besser ist (z.B. 80 vs 60, NICHT 75 vs 70).
- Nutze die volle Skala: 40-90. Ein Dokument mit critical Problemen darf NICHT über 65 liegen.
- Bei Rechnungen: Score = Kombination aus Preis-Leistung, Transparenz, Vollständigkeit.

Kategorie-Scores (0-100 pro Dokument):
- fairness: Bei Verträgen: Ausgewogenheit. Bei Rechnungen: Preis-Leistungs-Verhältnis
- riskProtection: Bei Verträgen: Risikoschutz. Bei Rechnungen: Korrekte Berechnung, keine versteckten Kosten
- flexibility: Bei Verträgen: Anpassungsmöglichkeiten. Bei Rechnungen: Zahlungskonditionen
- completeness: Vollständigkeit der Angaben (Positionen, Berechnungen, Pflichtangaben)
- clarity: Klarheit und Verständlichkeit der Darstellung

Risiko-Level pro Dokument: "low"|"medium"|"high"
Bei Rechnungen: "low" wenn korrekt berechnet, "medium" bei unklaren Positionen, "high" bei Berechnungsfehlern.

SCHRITT 6 — GESAMTURTEIL: 6-8 Sätze Fazit wie am Ende einer Erstberatung.
Empfehlung + Begründung + Bedingungen. Konkret und direkt.

Antworte NUR mit diesem JSON:
{
  "groupEvaluations": {
    "GRUPPE_1": {"severity": "...", "explanation": "...", "impact": "...", "recommendation": "...", "semanticType": "...", "financialImpact": null, "marketContext": null},
    "GRUPPE_2": {"severity": "...", "explanation": "...", "impact": "...", "recommendation": "...", "semanticType": "...", "financialImpact": null, "marketContext": null}
  },
  "additionalDifferences": [...],
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

async function compareContractsV2(map1, map2, text1, text2, perspective = 'neutral', comparisonMode = 'standard', userProfile = 'individual', clauseMatchResult = null, deterministicPromptBlock = '') {
  console.log(`🔍 Phase B: Tiefenvergleich (Perspektive: ${perspective}, Modus: ${comparisonMode}, Profil: ${userProfile}, Schicht2: ${deterministicPromptBlock ? deterministicPromptBlock.split('\n').length + ' Zeilen' : 'keine'})`);

  const prompt = buildPhaseBPrompt(map1, map2, text1, text2, perspective, comparisonMode, userProfile, clauseMatchResult, deterministicPromptBlock);

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
  // Route to new clause-by-clause pipeline
  return runCompareV2PipelineNew(text1, text2, perspective, comparisonMode, userProfile, onProgress);
}

// Legacy pipeline kept as fallback
async function runCompareV2PipelineLegacy(text1, text2, perspective, comparisonMode, userProfile, onProgress) {
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

    // SCHICHT 2: Deterministischer Wertevergleich (Maßnahme B + D)
    progress('comparing', 45, 'Deterministischer Wertevergleich...');
    const deterministicDiffs = buildDeterministicDifferences(map1, map2, clauseMatchResult);

    // SCHICHT 2.5: Gruppierung — reduziert granulare Einzel-Diffs zu semantischen Gruppen
    const groups = groupDeterministicDiffs(deterministicDiffs);
    const groupsPromptBlock = formatGroupsForPrompt(groups);

    // Phase B: Bewertet GRUPPEN + ergänzt qualitative Unterschiede
    progress('comparing', 50, 'KI-Tiefenanalyse läuft...');

    const phaseBResult = await withTimeout(
      compareContractsV2(map1, map2, text1, text2, perspective, comparisonMode, userProfile, clauseMatchResult, groupsPromptBlock),
      MAX_PHASE_B_TIME,
      'Phase B Timeout'
    );

    // MERGE: Gruppen + Phase-B-Bewertungen + qualitative Ergänzungen → finale Differences
    progress('finalizing', 88, 'Ergebnisse werden zusammengeführt...');
    const groupEvaluations = phaseBResult.groupEvaluations || {};
    const additionalDiffs = phaseBResult.additionalDifferences || phaseBResult.differences || [];
    const evaluatedCount = Object.keys(groupEvaluations).length;
    console.log(`📊 Phase B: ${evaluatedCount}/${groups.length} Gruppen bewertet, ${additionalDiffs.length} zusätzliche Diffs`);
    phaseBResult.differences = mergeDifferences(groups, groupEvaluations, additionalDiffs);
    console.log(`📊 Merge: ${phaseBResult.differences.length} finale Unterschiede (${groups.length} Gruppen + ${additionalDiffs.length} qualitative)`)

    // SCHICHT 4: Post-merge score enforcement based on actual differences
    enforceScoreDifferentiation(phaseBResult);

    // Market Benchmark: Deterministic comparison against market data
    progress('finalizing', 90, 'Marktvergleich wird erstellt...');
    const benchmarkResult = runBenchmarkComparison(map1, map2, phaseBResult.differences || []);
    if (benchmarkResult.benchmarks.length > 0) {
      phaseBResult.differences = benchmarkResult.enrichedDifferences;
    }

    progress('finalizing', 95, 'Ergebnis wird zusammengestellt...');

    // Build V2 response (include texts for re-analysis)
    const v2Result = buildV2Response(map1, map2, phaseBResult, perspective, text1, text2, benchmarkResult);

    // Attach clause matching stats (for frontend display / debugging)
    if (clauseMatchResult) {
      v2Result._clauseMatching = clauseMatchResult.stats;
    }

    console.log(`✅ V2 Pipeline komplett: ${v2Result.differences?.length || 0} Diffs, ${v2Result.risks?.length || 0} Risks, ${v2Result.recommendations?.length || 0} Recs, version=${v2Result.version}`);
    progress('complete', 100, 'Analyse abgeschlossen!');
    return v2Result;

  } catch (error) {
    if (error.message?.includes('Timeout')) {
      console.warn(`⚠️ V2 Pipeline Timeout: ${error.message} — Fallback wird nicht automatisch ausgelöst`);
    }
    throw error;
  }
}

function buildV2Response(map1, map2, phaseBResult, perspective, text1, text2, benchmarkResult, docConfig) {
  return {
    version: 2,

    // V3: Document type intelligence
    documentType: docConfig ? {
      category: docConfig.category,
      label: docConfig.label,
      scoreLabels: docConfig.scoreLabels || null,
      labels: docConfig.labels,
      perspectiveLabels: docConfig.perspectiveLabels || null,
    } : null,

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

    // Market Benchmark
    benchmark: benchmarkResult ? {
      contractType: benchmarkResult.contractType,
      contractTypeLabel: benchmarkResult.contractTypeLabel || null,
      metrics: benchmarkResult.benchmarks || [],
    } : null,

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

/**
 * V3.1: Sicherheitsnetz für Parties-Extraktion.
 * Wenn GPT parties[] top-level füllt aber KEINE Klausel mit area='parties' erstellt,
 * synthetisieren wir eine Klausel aus den top-level Daten.
 * Betrifft vor allem den Section-Prompt-Pfad (buildPhaseAPromptWithSections),
 * wo GPT parties als Metadaten sieht statt als eigene Klausel.
 */
function ensurePartiesClause(phaseAResult) {
  const clauses = phaseAResult.clauses || [];
  const hasPartiesClause = clauses.some(c => c.area === 'parties');
  if (hasPartiesClause) return; // Klausel existiert bereits — nichts zu tun

  const parties = phaseAResult.parties || [];
  if (parties.length === 0) return; // Keine Daten vorhanden — nichts zu reparieren

  // Synthetisiere eine Parties-Klausel aus den top-level parties
  const keyValues = {};
  for (const p of parties) {
    if (p.role && p.name) keyValues[p.role] = p.name;
  }

  const synthesized = {
    id: 'parties_0',
    area: 'parties',
    section: 'Parteien',
    title: 'Beteiligte Parteien',
    originalText: parties.map(p => `${p.role || 'Partei'}: ${p.name || 'Unbekannt'}`).join('\n'),
    summary: parties.map(p => `${p.role || 'Partei'}: ${p.name || 'Unbekannt'}`).join(', '),
    keyValues,
  };

  phaseAResult.clauses.unshift(synthesized);
  console.log(`🔧 Parties-Repair: Klausel aus ${parties.length} top-level Parteien synthetisiert`);
}

/**
 * Maßnahme A.2: Qualitätsprüfung der Phase-A-Extraktion.
 * Gibt Warnungen zurück (Array von Strings), loggt aber bricht NICHT ab.
 * Dient als Frühwarnsystem für schlechte Extraktion.
 */
function checkExtractionQuality(phaseAResult) {
  const issues = [];
  const clauses = phaseAResult.clauses || [];

  // Q1: Mindestens 3 Klauseln — bei weniger hat GPT wahrscheinlich den Vertrag nicht verstanden
  if (clauses.length < 3) {
    issues.push(`Nur ${clauses.length} Klauseln extrahiert (Minimum: 3)`);
  }

  // Q2: Mindestens 1 Klausel sollte keyValues haben
  const clausesWithKV = clauses.filter(c => Object.keys(c.keyValues || {}).length > 0);
  if (clausesWithKV.length === 0 && clauses.length >= 3) {
    issues.push('Keine einzige Klausel hat keyValues — Werte-Extraktion möglicherweise fehlgeschlagen');
  }

  // Q3: Payment-Klauseln sollten keyValues haben (häufigstes Fehlerfeld)
  const paymentClauses = clauses.filter(c => c.area === 'payment');
  if (paymentClauses.length > 0) {
    const paymentWithoutKV = paymentClauses.filter(c => Object.keys(c.keyValues || {}).length === 0);
    if (paymentWithoutKV.length === paymentClauses.length) {
      issues.push('Payment-Klauseln ohne keyValues — Beträge/Gebühren evtl. nicht extrahiert');
    }
  }

  // Q4: Parties sollten nicht leer sein
  if (!phaseAResult.parties || phaseAResult.parties.length === 0) {
    issues.push('Keine Vertragsparteien erkannt');
  }

  // Q5: originalText sollte nicht leer sein bei den meisten Klauseln
  const emptyOriginal = clauses.filter(c => !c.originalText || c.originalText.length < 20);
  if (emptyOriginal.length > clauses.length * 0.5 && clauses.length >= 3) {
    issues.push(`${emptyOriginal.length}/${clauses.length} Klauseln ohne brauchbaren originalText`);
  }

  return issues;
}

/**
 * Expand truncated originalText snippets by finding them in the source contract.
 * GPT often abbreviates with "..." — this finds the full sentence/paragraph.
 */
function expandOriginalTexts(clauses, sourceText) {
  if (!sourceText || !clauses?.length) return;

  // Normalize whitespace for matching
  const normalized = sourceText.replace(/\s+/g, ' ').trim();

  for (const clause of clauses) {
    if (!clause.originalText || clause.originalText.length < 20) continue;
    // Check if GPT truncated with "..."
    if (!clause.originalText.includes('...') && !clause.originalText.includes('…')) continue;

    // Try to find the text in the source by using a clean prefix (before the first "...")
    const parts = clause.originalText.split(/\.{3}|…/);
    const prefix = parts[0].replace(/\s+/g, ' ').trim();
    if (prefix.length < 15) continue;

    // Find prefix position in source
    const normalizedPrefix = prefix.replace(/\s+/g, ' ');
    const idx = normalized.indexOf(normalizedPrefix);
    if (idx === -1) continue;

    // If there are multiple parts, find the last part too to determine the range
    const lastPart = parts[parts.length - 1].replace(/\s+/g, ' ').trim();
    let endIdx = -1;

    if (lastPart.length >= 10) {
      const searchFrom = idx + normalizedPrefix.length;
      const lastPartIdx = normalized.indexOf(lastPart, searchFrom);
      if (lastPartIdx !== -1) {
        endIdx = lastPartIdx + lastPart.length;
      }
    }

    if (endIdx === -1) {
      // Couldn't find end — expand from prefix to the next paragraph break or 2000 chars
      const searchEnd = Math.min(idx + 2000, normalized.length);
      const remaining = normalized.substring(idx, searchEnd);
      // Find paragraph boundary (double newline or section marker like §)
      const paraBreak = remaining.search(/\n\s*\n|(?<=\.\s)§/);
      endIdx = paraBreak > normalizedPrefix.length
        ? idx + paraBreak
        : Math.min(idx + remaining.lastIndexOf('. ') + 1, idx + 2000);
      if (endIdx <= idx + normalizedPrefix.length) {
        endIdx = Math.min(idx + 2000, normalized.length);
      }
    }

    const expanded = normalized.substring(idx, endIdx).trim();
    if (expanded.length > clause.originalText.length) {
      clause.originalText = expanded;
    }
  }
}

// ============================================
// Maßnahme A.1: Regex-based keyValue enrichment
// Extracts concrete values from originalText that GPT missed in keyValues
// ============================================

function enrichKeyValuesFromText(clauses, sourceText) {
  if (!clauses?.length) return;

  let totalEnriched = 0;

  for (const clause of clauses) {
    const text = clause.originalText || '';
    if (text.length < 10) continue;

    const existingKeys = Object.keys(clause.keyValues || {});
    const existingNormalized = existingKeys.map(k => normalizeKeyForMatch(k));

    const found = extractValuesWithContext(text);

    for (const { key, value } of found) {
      const normKey = normalizeKeyForMatch(key);

      // Skip if a similar key already exists
      const alreadyExists = existingNormalized.some(ek =>
        ek === normKey ||
        ek.includes(normKey) || normKey.includes(ek) ||
        (normKey.length > 4 && ek.length > 4 && levenshteinClose(ek, normKey))
      );

      if (!alreadyExists) {
        clause.keyValues[key] = value;
        existingNormalized.push(normKey);
        totalEnriched++;
      }
    }
  }

  // Also scan the full source text for values not captured in any clause
  if (sourceText && sourceText.length > 50) {
    const allClauseText = clauses.map(c => c.originalText || '').join(' ');
    const uncoveredValues = findUncoveredValues(sourceText, allClauseText, clauses);
    totalEnriched += uncoveredValues;
  }

  if (totalEnriched > 0) {
    console.log(`📋 Enrichment: +${totalEnriched} keyValues durch Regex-Nachextraktion`);
  }

  return totalEnriched;
}

/**
 * Extract values with surrounding context from text.
 * Returns array of { key, value } pairs.
 */
function extractValuesWithContext(text) {
  const results = [];

  // Pattern 1: "Label: Wert" or "Label Wert" patterns (most common in Konditionenblätter)
  // e.g., "Flatrate-Gebühr in % des Forderungsnennbetrages p.a.: 1,95%"
  const labelValuePattern = /([A-ZÄÖÜ][a-zäöüß\-]+(?:[\s\-][A-Za-zäöüß\-]+){0,4})\s*(?::|beträgt|von|in Höhe von|i\.?\s*H\.?\s*v\.?)?\s*[:.]?\s*(\d[\d.,]*\s*(?:%|EUR|€|Monate?|Wochen?|Tage?|Jahre?|p\.?\s*a\.?))/gi;
  let match;
  while ((match = labelValuePattern.exec(text)) !== null) {
    const key = match[1].trim().replace(/\s+/g, ' ');
    const value = match[2].trim();
    if (key.length >= 3 && key.length <= 60) {
      results.push({ key, value });
    }
  }

  // Pattern 2: EUR amounts with preceding context
  // e.g., "EUR 150.000" or "€ 5.000,00"
  const eurPattern = /(\b[A-ZÄÖÜ][a-zäöüß\-]+(?:[\s\-][A-Za-zäöüß\-]+){0,3})\s*(?::|von|beträgt)?\s*((?:EUR|€)\s*[\d.,]+(?:\s*(?:p\.?\s*a\.?|pro\s+Jahr|\/\s*Jahr|jährl))?)/gi;
  while ((match = eurPattern.exec(text)) !== null) {
    const key = match[1].trim().replace(/\s+/g, ' ');
    const value = match[2].trim();
    if (key.length >= 3 && key.length <= 60) {
      results.push({ key, value });
    }
  }

  // Pattern 3: Percentage values with preceding context
  // e.g., "2,3205 %" or "10%"
  const pctPattern = /(\b[A-ZÄÖÜ][a-zäöüß\-]+(?:[\s\-][A-Za-zäöüß\-]+){0,3})\s*(?::|von|beträgt)?\s*(\d[\d.,]*\s*(?:%|v\.?\s*H\.?|Prozent))/gi;
  while ((match = pctPattern.exec(text)) !== null) {
    const key = match[1].trim().replace(/\s+/g, ' ');
    const value = match[2].trim();
    if (key.length >= 3 && key.length <= 60) {
      results.push({ key, value });
    }
  }

  // Pattern 4: Time periods
  // e.g., "Kündigungsfrist: 3 Monate"
  const timePattern = /(\b[A-ZÄÖÜ][a-zäöüß\-]+(?:[\s\-][A-Za-zäöüß\-]+){0,3})\s*(?::|von|beträgt)?\s*(\d+\s*(?:Monate?|Wochen?|Tage?|Jahre?|Werktage?))/gi;
  while ((match = timePattern.exec(text)) !== null) {
    const key = match[1].trim().replace(/\s+/g, ' ');
    const value = match[2].trim();
    if (key.length >= 3 && key.length <= 60) {
      results.push({ key, value });
    }
  }

  // Deduplicate: keep first occurrence per normalized key
  const seen = new Set();
  return results.filter(r => {
    const norm = normalizeKeyForMatch(r.key);
    if (seen.has(norm)) return false;
    seen.add(norm);
    return true;
  });
}

/**
 * Scan full source text for values not captured by any clause.
 * Creates a synthetic "payment" clause if values found in header/tables.
 */
function findUncoveredValues(sourceText, allClauseText, clauses) {
  // Look at first 3000 chars (header/Konditionenblatt area)
  const header = sourceText.substring(0, 3000);
  const headerValues = extractValuesWithContext(header);

  if (headerValues.length === 0) return 0;

  // Check which header values are NOT in any clause keyValues
  const allExistingKeys = [];
  for (const c of clauses) {
    allExistingKeys.push(...Object.keys(c.keyValues || {}).map(normalizeKeyForMatch));
  }

  const missing = headerValues.filter(hv => {
    const norm = normalizeKeyForMatch(hv.key);
    return !allExistingKeys.some(ek =>
      ek === norm || ek.includes(norm) || norm.includes(ek)
    );
  });

  if (missing.length === 0) return 0;

  // Find the best payment clause to add these to, or create one
  let targetClause = clauses.find(c => c.area === 'payment' && Object.keys(c.keyValues).length > 0)
    || clauses.find(c => c.area === 'payment')
    || null;

  if (!targetClause) {
    // Create a synthetic clause for header/Konditionenblatt values
    targetClause = {
      id: 'payment_header',
      area: 'payment',
      section: 'Konditionenblatt / Kopfdaten',
      title: 'Vertragskonditionen',
      originalText: header.substring(0, 500),
      summary: 'Aus dem Kopfbereich / Konditionenblatt extrahierte Werte',
      keyValues: {},
    };
    clauses.push(targetClause);
    console.log(`📋 Enrichment: Synthetische Konditionenblatt-Klausel erstellt`);
  }

  let added = 0;
  for (const { key, value } of missing) {
    targetClause.keyValues[key] = value;
    added++;
  }

  if (added > 0) {
    console.log(`📋 Enrichment: +${added} Werte aus Header/Konditionenblatt in "${targetClause.id}" ergänzt`);
  }

  return added;
}

function normalizeKeyForMatch(key) {
  return (key || '')
    .toLowerCase()
    // V3.3: Klammer-Inhalt entfernen — Paragraphen-Verweise sind Boilerplate, kein Identitätsmerkmal
    // "Gebühr je Inkasso-Forderung (jeweils vom Rechnungsbrutto, § 4 Abs. 1 FRV)"
    // → "gebühr je inkasso-forderung"
    .replace(/\([^)]*\)/g, ' ')
    // V3.3: Inline-Paragraphen-Referenzen entfernen ("§ 4 Abs. 1", "§ 6 Abs. 1 FRV")
    .replace(/§\s*\d+(\s*abs\.?\s*\d+)?(\s*satz\s*\d+)?(\s*frv|\s*bgb|\s*hgb)?/gi, ' ')
    .replace(/[-_]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/[^a-zäöüß0-9 ]/g, '')
    .trim();
}

function levenshteinClose(a, b) {
  // Quick check: if length difference > 3, not close
  if (Math.abs(a.length - b.length) > 3) return false;
  // Simple Levenshtein for short strings
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return true;
  if (maxLen > 30) return false; // Skip expensive computation for long strings

  const matrix = [];
  for (let i = 0; i <= a.length; i++) {
    matrix[i] = [i];
    for (let j = 1; j <= b.length; j++) {
      if (i === 0) {
        matrix[i][j] = j;
      } else {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost
        );
      }
    }
  }
  return matrix[a.length][b.length] <= 3;
}

// ============================================
// SCHICHT 2: Deterministischer Wertevergleich (Maßnahme B + D)
// Läuft VOR Phase B. Erzeugt verifizierte Fakten-Unterschiede.
// Phase B bekommt diese als feste Grundlage und darf sie NICHT ändern.
// ============================================

/**
 * Maßnahme B.2 — Wert+Einheit aus einem String extrahieren.
 * Versteht deutsche Zahlenformate (1.234,56 = eintausendzweihundertvierunddreißig Komma 56).
 */
function extractValueAndUnit(str) {
  if (!str || typeof str !== 'string') return { num: null, unit: null, raw: str || '' };
  const s = str.trim();

  // "entfällt", "keine", "nicht vereinbart" etc.
  if (/^(entfällt|keine?r?s?|nicht\s+vereinbart|nicht\s+vorhanden|n\/?a|\-+)$/i.test(s)) {
    return { num: null, unit: null, raw: s, isNone: true };
  }

  // Prozent: "1,95%", "10 %", "2,3205 Prozent"
  let m = s.match(/(\d[\d.,]*)\s*(%|Prozent|v\.?\s*H\.?|p\.?\s*a\.?)/i);
  if (m) return { num: parseGermanNumber(m[1]), unit: '%', raw: s };

  // EUR vorgestellt: "EUR 150.000", "€ 5.000,00"
  m = s.match(/(EUR|€)\s*([\d.,]+)/i);
  if (m) return { num: parseGermanNumber(m[2]), unit: 'EUR', raw: s };

  // EUR nachgestellt: "150.000 EUR", "5.000,00 €"
  m = s.match(/([\d.,]+)\s*(EUR|Euro|€)/i);
  if (m) return { num: parseGermanNumber(m[1]), unit: 'EUR', raw: s };

  // Zeitraum: "3 Monate", "12 Wochen", "30 Tage", "2 Jahre"
  m = s.match(/(\d+)\s*(Monate?|Wochen?|Tage?|Jahre?|Werktage?)/i);
  if (m) return { num: parseInt(m[1], 10), unit: m[2], raw: s };

  // Zahl ohne Einheit (Fallback)
  m = s.match(/(\d[\d.,]*)/);
  if (m) return { num: parseGermanNumber(m[1]), unit: null, raw: s };

  // Reiner Text
  return { num: null, unit: null, raw: s };
}

/**
 * V3.3: Zentrale Prüfung auf "Wert nicht extrahierbar"-Einträge aus OCR-Recovery-Fehlversuchen.
 * Phase A hat das Feld erkannt, konnte aber den Wert nicht parsen → solche Einträge dürfen
 * weder in Vertragskarte noch Diffs landen, sonst verwirren sie den User.
 */
function isBlankValueString(v) {
  return typeof v === 'string' && /Wert nicht extrahierbar/i.test(v);
}
function isBlankRawValue(rv) {
  return isBlankValueString(rv?.value);
}

/**
 * Parse deutsche Zahl: "150.000" → 150000, "1,95" → 1.95, "150.000,50" → 150000.50
 */
function parseGermanNumber(str) {
  if (!str) return null;
  const s = str.trim();

  // Hat sowohl Punkt als auch Komma? → Punkt ist Tausender, Komma ist Dezimal
  if (s.includes('.') && s.includes(',')) {
    return parseFloat(s.replace(/\./g, '').replace(',', '.'));
  }

  // Nur Punkt: Prüfe ob Tausenderpunkt (3 Ziffern nach Punkt, kein weiterer Punkt)
  if (s.includes('.') && !s.includes(',')) {
    const parts = s.split('.');
    // "150.000" = 150000 (Tausender), "1.95" = 1.95 (Dezimal)
    if (parts.length === 2 && parts[1].length === 3) {
      return parseFloat(s.replace('.', '')); // Tausenderpunkt
    }
    return parseFloat(s); // Dezimalpunkt
  }

  // Nur Komma → Dezimalkomma
  if (s.includes(',')) {
    return parseFloat(s.replace(',', '.'));
  }

  return parseFloat(s);
}

/**
 * Maßnahme B.2 — Fuzzy Key Match
 * Prüft ob zwei normalisierte Keys zusammengehören.
 */
function fuzzyKeyMatch(normKey1, normKey2) {
  if (normKey1 === normKey2) return true;
  if (normKey1.includes(normKey2) || normKey2.includes(normKey1)) return true;
  if (normKey1.length > 4 && normKey2.length > 4 && levenshteinClose(normKey1, normKey2)) return true;

  // V3.3: Jaccard-Similarity der Wörter > 0.7 mit Stopword-Filter
  // Bürokratische Boilerplate-Wörter rausfiltern, sonst dominieren sie über die echten Diskriminatoren
  const STOPWORDS = new Set([
    'der', 'die', 'das', 'den', 'des', 'ein', 'eine', 'einer', 'eines',
    'jeweils', 'vom', 'von', 'für', 'bei', 'mit', 'nach', 'gemäß', 'laut',
    'inkl', 'exkl', 'ohne', 'beträgt', 'höhe', 'sowie', 'oder', 'und',
    'rechnungsbrutto', 'forderung', 'forderungen', 'vertrag', 'vertrages',
    'abs', 'frv', 'bgb', 'hgb', 'satz',
  ]);
  const filterWords = (key) => new Set(
    key.split(' ').filter(w => w.length > 2 && !STOPWORDS.has(w) && !/^\d+$/.test(w))
  );
  const words1 = filterWords(normKey1);
  const words2 = filterWords(normKey2);
  if (words1.size >= 2 && words2.size >= 2) {
    const intersection = [...words1].filter(w => words2.has(w)).length;
    const union = new Set([...words1, ...words2]).size;
    if (union > 0 && intersection / union > 0.7) return true;
  }

  // Synonym group check: do both keys belong to the same synonym group?
  for (const group of KEY_SYNONYM_GROUPS) {
    const k1InGroup = group.some(syn => normKey1.includes(syn) || syn.includes(normKey1));
    const k2InGroup = group.some(syn => normKey2.includes(syn) || syn.includes(normKey2));
    if (k1InGroup && k2InGroup) return true;
  }

  return false;
}

/**
 * Entfernt Duplikat-keyValues innerhalb einer Area.
 * Duplikat = gleicher extrahierter numerischer Wert + gleiche Einheit, oder gleicher Rohtext.
 * Behält den Key mit dem kürzeren, spezifischeren Namen.
 */
function deduplicateKeyValues(kv) {
  if (!kv || typeof kv !== 'object') return kv;
  const entries = Object.entries(kv);
  if (entries.length <= 1) return kv;

  const keep = {};
  const seen = []; // { key, value, parsed }

  for (const [key, value] of entries) {
    const valStr = String(value).trim();
    const parsed = extractValueAndUnit(valStr);

    // Prüfe ob dieser Wert schon unter einem anderen Key existiert
    let isDuplicate = false;
    for (const existing of seen) {
      // Gleicher Rohtext (normalisiert)
      if (valStr.toLowerCase() === existing.value.toLowerCase()) {
        isDuplicate = true;
        break;
      }
      // Gleiche Zahl + gleiche Einheit
      if (parsed.num !== null && existing.parsed.num !== null
          && parsed.num === existing.parsed.num
          && (parsed.unit || '') === (existing.parsed.unit || '')) {
        isDuplicate = true;
        break;
      }
    }

    if (!isDuplicate) {
      keep[key] = value;
      seen.push({ key, value: valStr, parsed });
    }
  }

  const removed = entries.length - Object.keys(keep).length;
  if (removed > 0) {
    // Log only at debug level — not spam
  }

  return keep;
}

// ============================================
// LAYER 0: Deterministische Volltext-Extraktion
// Extrahiert ALLE numerischen Werte aus dem kompletten Rohtext.
// Gleicher Input = Gleiches Ergebnis, immer.
// ============================================

/**
 * OCR-Vorverarbeitung: Normalisiert Text aus pdf-parse für bessere Wert-Extraktion.
 * - Kollabiert Mehrfach-Leerzeichen → ein Leerzeichen (pro Zeile)
 * - Repariert Zeilenumbrüche mitten in Wörtern ("Factoring-\nkunden" → "Factoringkunden")
 * - Verbindet EUR/€ mit Zahl auf nächster Zeile ("EUR\n5.000" → "EUR 5.000")
 *
 * @param {string} text - Rohtext aus pdf-parse
 * @returns {string} - Normalisierter Text
 */
function normalizeOcrText(text) {
  if (!text) return text;
  let normalized = text;

  // Fix hyphenated line breaks: "wort-\nfortsetzung" → "wortfortsetzung" (German word splits)
  // Only lowercase-to-lowercase to avoid breaking compound words like "EUR-Betrag"
  normalized = normalized.replace(/([a-zäöüß])-\n\s*([a-zäöüß])/g, '$1$2');

  // Fix EUR/€ separated from number by line break: "EUR\n5.000" → "EUR 5.000"
  normalized = normalized.replace(/(EUR|€)\s*\n\s*(\d)/g, '$1 $2');

  // Collapse 2+ spaces → single space (per line, preserve line breaks for structure)
  normalized = normalized.split('\n').map(line => line.replace(/ {2,}/g, ' ').trimEnd()).join('\n');

  return normalized;
}

/**
 * Extrahiert ALLE numerischen Werte, Prozentsätze, EUR-Beträge, Zeiträume und Daten
 * aus dem KOMPLETTEN Rohtext eines Vertrags. Läuft VOR jeder GPT-Call.
 * Gleicher Input = Gleiches Ergebnis, immer.
 *
 * @param {string} text - Kompletter Rohtext des Vertrags (wird intern OCR-normalisiert)
 * @returns {Array<{key, rawKey, value, numValue, unit, context, position, source}>}
 */
function extractAllValuesFromRawText(text) {
  if (!text || text.length < 50) return [];

  // Maßnahme 1: OCR-Vorverarbeitung
  const normalizedText = normalizeOcrText(text);

  const results = [];
  const seen = new Map(); // normalizedKey → true (for dedup)
  const startTime = Date.now();

  // Exclusion: phone numbers, postal codes, page numbers, bank details, IDs, print metadata
  const isExcludedLabel = (label) => {
    return /(\+\d{2}|PLZ|Seite\s*\d|Tel[\.\s:]|Fax[\.\s:]|Postfach|BLZ\b|IBAN|BIC\b|HRB?\s*\d|USt[\-\s]?Id|Amtsgericht|Handelsregister|Registergericht|Steuernummer|Bankverbindung|Bankleitzahl|Kontonummer|Geschäftsführer|Vertretungsberechtigt|E-?Mail|www\.|http|Ausdruck|Druckdatum|Stand\s*:|Erstellt\s*am|Gedruckt\s*am|Dokument[\-\s]?Nr|Seite\s*\d+\s*von)/i.test(label);
  };

  // Common non-label words to skip
  const NOISE_LABELS = new Set(['eur', 'euro', 'der', 'die', 'das', 'und', 'oder', 'von', 'für', 'mit', 'bis', 'auf', 'aus', 'bei', 'den', 'dem', 'des', 'ein', 'eine', 'sich', 'ist', 'hat', 'wird', 'sind', 'nach', 'vor']);

  // Quality check: reject labels that look like OCR sentence fragments
  const isNoisyLabel = (rawKey) => {
    const k = rawKey.trim();
    // Allow labels ending with legal references like (§ 3 Abs. 1 FRV) or (jeweils ..., § 4 Abs. 1 FRV)
    if (/\([^)]*§[^)]*\)\s*$/.test(k)) return false;
    // Allow labels ending with common contract abbreviations in parens
    if (/\([^)]+\)\s*$/.test(k) && /(?:FRV|AGB|BGB|HGB|GmbH|Abs|Satz|Nr)\b/i.test(k)) return false;
    // Ends with period or closing paren → sentence fragment (but allow "p.a.", "i.H.v.", "Abs.", "Nr.")
    if (/[.)\]]$/.test(k) && !/(?:p\.a\.|i\.h\.v\.|abs\.|nr\.|eur\.)$/i.test(k)) return true;
    // Contains double+ spaces → OCR artifact
    if (/\s{2,}/.test(k)) return true;
    // Too many words (>8) → likely a sentence, not a label
    // Strip parenthetical references like (§ 6 Abs. 1 FRV) before counting
    const coreLabel = k.replace(/\([^)]*\)/g, '').trim();
    if (coreLabel.split(/\s+/).length > 8) return true;
    // Starts with lowercase after first char → likely a continuation
    if (/^[a-zäöüß]/.test(k)) return true;
    // Contains typical sentence verbs → not a label
    // Stricter: verbs like "erfüllen", "einhalten" are enough to disqualify with 2+ words
    if (/\b(erfüllen|einhalten|anbietet|enthalten|berechnet|bezeichnet|bestimmen|informieren|vereinbar)\b/i.test(k)) return true;
    // Common verbs need 3+ words (to allow "Vertragsbeginn ist" type labels)
    if (/\b(ist|wird|hat|sind|werden|kann|muss|soll|darf|gilt|erfolgt|besteht|stellt)\b/i.test(k) && coreLabel.split(/\s+/).length > 2) return true;
    return false;
  };

  // Helper: Add result with dedup by normalized key
  const addResult = (rawKey, value, numValue, unit, context, position) => {
    const key = normalizeKeyForMatch(rawKey);
    if (!key || key.length < 3) return;
    if (NOISE_LABELS.has(key)) return;
    if (isExcludedLabel(rawKey)) return;
    if (isNoisyLabel(rawKey)) return;
    if (seen.has(key)) return;

    results.push({
      key,
      rawKey: rawKey.trim(),
      value: value.trim(),
      numValue: numValue,
      unit: unit,
      context: (context || '').substring(0, 120),
      position: position,
      source: 'regex',
    });
    seen.set(key, true);
  };

  // ── Pass 1: Konditionenblatt / Tabellen-Patterns ──
  // "Label: Wert" lines — highest priority for structured contracts
  const lines = normalizedText.split('\n');
  const blankValueLabels = []; // Maßnahme 2: Labels mit leeren Werten für Recovery
  let linePos = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed.length >= 5) {
      // Pattern 1a: "Label: Value" (colon-separated)
      // Value must start with a number, EUR/€, "entfällt", or similar — not arbitrary text
      // Limit increased to 90 for long German labels with legal references like "(§ 6 Abs. 1 FRV)"
      if (/\d/.test(trimmed)) {
        const m = trimmed.match(/^([A-ZÄÖÜa-zäöüß][^:\n]{2,90}?)\s*:\s*(.+)$/);
        if (m) {
          const label = m[1].trim();
          const valueStr = m[2].trim();
          // Only process if value starts with a number, EUR, %, "entfällt", etc.
          if (/^(\d|EUR|€|entfällt|keine|mind|max|bis)/i.test(valueStr)) {
            // Detect dates (dd.MM.yyyy) before numeric parsing
            if (/^\d{1,2}\.\d{1,2}\.\d{4}$/.test(valueStr.trim())) {
              addResult(label, valueStr, null, 'Datum', trimmed, linePos);
            } else {
              const parsed = extractValueAndUnit(valueStr);
              if (parsed.num !== null || parsed.isNone) {
                addResult(label, valueStr, parsed.num, parsed.unit, trimmed, linePos);
              }
            }
          }
        }

        // Pattern 1b: "Label  Value" (tab or multi-space separated)
        const tabMatch = trimmed.match(/^([A-ZÄÖÜa-zäöüß][^\t\n]{2,55}?)\s{2,}(\S.{0,40})$/);
        if (tabMatch) {
          const label = tabMatch[1].trim();
          const valueStr = tabMatch[2].trim();
          if (/\d/.test(valueStr)) {
            const parsed = extractValueAndUnit(valueStr);
            if (parsed.num !== null) {
              addResult(label, valueStr, parsed.num, parsed.unit, trimmed, linePos);
            }
          }
        }
      }

      // Pattern 1d: Blank-value detection — "Label: EUR  " or "Label:  " (OCR lost the number)
      // Catches labels where pdf-parse extracted the label but not the value (two-column layout)
      // Must have ≥ 2 words or contain financial terms to avoid section headers like "Gebühren:"
      const blankMatch = trimmed.match(/^([A-ZÄÖÜa-zäöüß][^:\n]{2,90}?)\s*:\s*((?:EUR|€)\s*(?:p\.\s*a\.?)?)?\s*$/);
      if (blankMatch) {
        const label = blankMatch[1].trim();
        const partial = (blankMatch[2] || '').trim(); // "EUR" or "EUR p.a." or ""
        const words = label.split(/\s+/).length;
        const isFinancialLabel = /(?:gebühr|limit|behalt|betrag|zins|satz|preis|kosten|vergütung|entgelt|pauschale|provision|frist|laufzeit|dauer)/i.test(label);
        // Section headers like "Gebühren:" are single words — require ≥ 2 words for generic, or financial compound word
        const isCompoundFinancial = isFinancialLabel && label.length >= 10;
        if (!isExcludedLabel(label) && !isNoisyLabel(label) && label.length >= 5 && (words >= 2 || isCompoundFinancial)) {
          blankValueLabels.push({ label, partial, lineIndex: i, linePos });
        }
      }

      // Pattern 1c: Multi-line label — current line is label-only, next line has value
      // Exclude: lines with colon, company names, Roman numeral section headers
      if (i + 1 < lines.length && /^[A-ZÄÖÜa-zäöüß]/.test(trimmed) && !/\d/.test(trimmed)
          && trimmed.length <= 60 && !trimmed.includes(':') && !/(?:GmbH|AG|KG|e\.K\.|OHG)\b/.test(trimmed)
          && !/^(?:I{1,4}V?|V|VI{0,3}|IX|X)\.?\s/.test(trimmed)) {
        const nextLine = lines[i + 1].trim();
        // Next line must start with a value indicator (number, EUR, ≤, >, etc.) — not another label
        if (/^(\d|EUR|€|≤|>|mind|max|bis)/.test(nextLine) && nextLine.length > 3) {
          // Sub-entries like "≤ EUR 1.000: EUR 1,75"
          const subEntries = nextLine.match(/([^,;]+?(?:EUR|€|%)\s*[\d.,]+[^,;]*)/g);
          if (subEntries && subEntries.length > 1) {
            for (const sub of subEntries) {
              const subParsed = extractValueAndUnit(sub.trim());
              if (subParsed.num !== null) {
                const subLabel = sub.replace(/[\d.,]+\s*(%|EUR|€).*/, '').trim();
                const combinedLabel = `${trimmed} ${subLabel}`.trim();
                addResult(combinedLabel || trimmed, sub.trim(), subParsed.num, subParsed.unit, `${trimmed}: ${nextLine}`, linePos);
              }
            }
          } else {
            const parsed = extractValueAndUnit(nextLine);
            if (parsed.num !== null) {
              addResult(trimmed, nextLine, parsed.num, parsed.unit, `${trimmed}: ${nextLine}`, linePos);
            }
          }
        }
      }
    }

    linePos += line.length + 1;
  }

  // ── Pass 1.5: Blank-value recovery + registration ──
  // For labels detected with blank values, try to find orphaned values nearby.
  // Conservative: only recover from immediately following lines (i+1, i+2).
  // Labels with no recoverable value → marked as "blank" for honest comparison.
  if (blankValueLabels.length > 0) {
    let recoveredCount = 0;

    for (const bv of blankValueLabels) {
      // Skip if we already extracted a value for this label in Pass 1
      const normKey = normalizeKeyForMatch(bv.label);
      if (seen.has(normKey)) continue;

      // Try orphaned value recovery: ONLY look at the next 1-2 lines for a value
      // (handles cases where pdf-parse puts the value on the following line)
      let recovered = false;
      for (let offset = 1; offset <= 2; offset++) {
        const nextIdx = bv.lineIndex + offset;
        if (nextIdx >= lines.length) break;
        const nextLine = lines[nextIdx].trim();
        // Must look like a standalone value (EUR amount, percentage, etc.) without a colon (not a new label)
        if (nextLine.length > 2 && !nextLine.includes(':') && /^(\d|EUR|€|mind|max)/.test(nextLine)) {
          const parsed = extractValueAndUnit(nextLine.replace(/^jeweils\s+/i, ''));
          if (parsed.num !== null) {
            addResult(bv.label, nextLine, parsed.num, parsed.unit,
              `${bv.label}: ${nextLine} (recovered)`, bv.linePos);
            recovered = true;
            recoveredCount++;
            break;
          }
        }
      }

      // If no adjacent value found → register as blank-value entry
      if (!recovered) {
        const blankValue = bv.partial
          ? `${bv.partial} (Wert nicht extrahierbar)`
          : 'vorhanden (Wert nicht extrahierbar)';
        results.push({
          key: normKey,
          rawKey: bv.label,
          value: blankValue,
          numValue: null,
          unit: bv.partial?.includes('EUR') ? 'EUR' : null,
          context: lines[bv.lineIndex]?.trim() || '',
          position: bv.linePos,
          source: 'regex-blank',
        });
        seen.set(normKey, true);
      }
    }

    const blanks = results.filter(r => r.source === 'regex-blank').length;
    if (blankValueLabels.length > 0) {
      console.log(`🔍 OCR Blank-Value: ${blankValueLabels.length} Labels erkannt, ${recoveredCount} recovered, ${blanks} unextrahierbar`);
    }
  }

  // ── Pass 2: EUR amounts with preceding context ──
  const eurRegex = /(\b[A-ZÄÖÜa-zäöüß][A-Za-zäöüßÄÖÜ\-\s]{2,40}?)\s*(?::\s*|von\s+|beträgt\s+|in Höhe von\s+|i\.\s*H\.\s*v\.\s*)?((?:EUR|€)\s*[\d.,]+(?:\s*(?:p\.\s*a\.?|pro\s+Jahr|\/\s*Jahr|jährl\.?|netto|brutto))?)/gi;
  let match;
  while ((match = eurRegex.exec(normalizedText)) !== null) {
    const label = match[1].trim().replace(/\s+/g, ' ');
    const valueStr = match[2].trim();
    if (label.length >= 3 && label.length <= 60 && !isExcludedLabel(label)) {
      const parsed = extractValueAndUnit(valueStr);
      if (parsed.num !== null) {
        const ctxStart = Math.max(0, match.index - 20);
        const ctxEnd = Math.min(normalizedText.length, match.index + match[0].length + 20);
        addResult(label, valueStr, parsed.num, parsed.unit, normalizedText.substring(ctxStart, ctxEnd), match.index);
      }
    }
  }

  // ── Pass 3: Percentage values with preceding context ──
  const pctRegex = /(\b[A-ZÄÖÜa-zäöüß][A-Za-zäöüßÄÖÜ\-\s]{2,40}?)\s*(?::\s*|von\s+|beträgt\s+)?(\d[\d.,]*\s*(?:%|v\.\s*H\.?|Prozent|p\.\s*a\.?))/gi;
  while ((match = pctRegex.exec(normalizedText)) !== null) {
    const label = match[1].trim().replace(/\s+/g, ' ');
    const valueStr = match[2].trim();
    if (label.length >= 3 && label.length <= 60 && !isExcludedLabel(label)) {
      const parsed = extractValueAndUnit(valueStr);
      if (parsed.num !== null) {
        const ctxStart = Math.max(0, match.index - 20);
        const ctxEnd = Math.min(normalizedText.length, match.index + match[0].length + 20);
        addResult(label, valueStr, parsed.num, parsed.unit, normalizedText.substring(ctxStart, ctxEnd), match.index);
      }
    }
  }

  // ── Pass 4: Time periods with preceding context ──
  const timeRegex = /(\b[A-ZÄÖÜa-zäöüß][A-Za-zäöüßÄÖÜ\-\s]{2,40}?)\s*(?::\s*|von\s+|beträgt\s+)?(\d+\s*(?:Monate?|Wochen?|Tage?|Jahre?|Werktage?))/gi;
  while ((match = timeRegex.exec(normalizedText)) !== null) {
    const label = match[1].trim().replace(/\s+/g, ' ');
    const valueStr = match[2].trim();
    if (label.length >= 3 && label.length <= 60 && !isExcludedLabel(label)) {
      const parsed = extractValueAndUnit(valueStr);
      if (parsed.num !== null) {
        const ctxStart = Math.max(0, match.index - 20);
        const ctxEnd = Math.min(normalizedText.length, match.index + match[0].length + 20);
        addResult(label, valueStr, parsed.num, parsed.unit, normalizedText.substring(ctxStart, ctxEnd), match.index);
      }
    }
  }

  // ── Pass 5: Date patterns ──
  const dateRegex = /(\b[A-ZÄÖÜa-zäöüß][A-Za-zäöüßÄÖÜ\-\s]{2,30}?)\s*(?::\s*|am\s+|vom\s+|zum\s+|bis\s+|ab\s+)?(\d{1,2}\.\d{1,2}\.\d{4})/gi;
  while ((match = dateRegex.exec(normalizedText)) !== null) {
    const label = match[1].trim().replace(/\s+/g, ' ');
    const valueStr = match[2].trim();
    if (label.length >= 3 && label.length <= 60 && !isExcludedLabel(label)) {
      const ctxStart = Math.max(0, match.index - 20);
      const ctxEnd = Math.min(normalizedText.length, match.index + match[0].length + 20);
      addResult(label, valueStr, null, 'Datum', normalizedText.substring(ctxStart, ctxEnd), match.index);
    }
  }

  // ── Pass 6: Standalone structured numbers with qualifiers ──
  // "max. 25.000", "mind. EUR 500", "bis zu 10%"
  const qualRegex = /\b((?:max(?:imal)?|min(?:dest(?:ens)?)?|mind(?:estens)?|bis zu|ab|höchstens|wenigstens)\.?\s*)((?:EUR|€)\s*[\d.,]+|\d[\d.,]*\s*(?:%|EUR|€|Monate?|Tage?|Jahre?))/gi;
  while ((match = qualRegex.exec(normalizedText)) !== null) {
    const qualifier = match[1].trim();
    const valueStr = match[2].trim();
    const before = normalizedText.substring(Math.max(0, match.index - 60), match.index);
    const labelMatch = before.match(/([A-ZÄÖÜa-zäöüß][A-Za-zäöüßÄÖÜ\-\s]{2,40}?)[\s:]*$/);
    if (labelMatch) {
      const label = `${labelMatch[1].trim()} ${qualifier}`.trim();
      const parsed = extractValueAndUnit(valueStr);
      if (parsed.num !== null && !isExcludedLabel(label)) {
        addResult(label, `${qualifier} ${valueStr}`, parsed.num, parsed.unit,
          normalizedText.substring(Math.max(0, match.index - 30), Math.min(normalizedText.length, match.index + match[0].length + 10)), match.index);
      }
    }
  }

  const elapsed = Date.now() - startTime;
  const blankCount = results.filter(r => r.source === 'regex-blank').length;
  const regexCount = results.filter(r => r.source === 'regex').length;
  console.log(`🔢 Layer 0: ${results.length} Werte extrahiert (${regexCount} regex + ${blankCount} blank-value) aus ${text.length} Zeichen (${elapsed}ms)`);

  return results;
}

/**
 * Ordnet Regex-Werte aus Layer 0 den GPT-Klauseln zu (per Textposition).
 * So haben die Klauseln sowohl GPT-keyValues als auch Regex-keyValues.
 *
 * @param {Array} extractedValues - Output von extractAllValuesFromRawText()
 * @param {Array} clauses - Phase A clauses (mit originalText, area, keyValues)
 * @param {string} rawText - Der Rohtext des Vertrags
 */
function assignValuesToClauses(extractedValues, clauses, rawText) {
  if (!extractedValues?.length || !clauses?.length || !rawText) return;

  // Build clause position map
  const clausePositions = [];
  const normalized = rawText.replace(/\s+/g, ' ');

  for (const clause of clauses) {
    if (!clause.originalText || clause.originalText.length < 20) continue;
    const snippet = clause.originalText.substring(0, 80).replace(/\s+/g, ' ').trim();
    if (snippet.length < 15) continue;
    const idx = normalized.indexOf(snippet);
    if (idx >= 0) {
      clausePositions.push({
        clause,
        start: idx,
        end: idx + Math.floor(clause.originalText.length * 1.2),
      });
    }
  }

  clausePositions.sort((a, b) => a.start - b.start);

  let assigned = 0;
  for (const val of extractedValues) {
    // V3.2: Blank-value-Einträge nicht an Klauseln anhängen — verwirren Frontend-Anzeige
    if (isBlankRawValue(val)) continue;
    const approxPos = val.position;
    let targetClause = null;

    // Find clause whose range covers this value's position
    for (const cp of clausePositions) {
      if (approxPos >= cp.start && approxPos <= cp.end) {
        targetClause = cp.clause;
        break;
      }
    }

    // Fallback: closest clause within 2000 chars
    if (!targetClause && clausePositions.length > 0) {
      let minDist = Infinity;
      let closest = null;
      for (const cp of clausePositions) {
        const dist = Math.min(Math.abs(approxPos - cp.start), Math.abs(approxPos - cp.end));
        if (dist < minDist) { minDist = dist; closest = cp.clause; }
      }
      if (minDist <= 2000) targetClause = closest;
    }

    // Fallback: first payment clause
    if (!targetClause) {
      targetClause = clauses.find(c => c.area === 'payment' && Object.keys(c.keyValues || {}).length > 0)
        || clauses.find(c => c.area === 'payment');
    }

    // Fallback: create synthetic clause
    if (!targetClause) {
      targetClause = {
        id: 'layer0_values',
        area: 'payment',
        section: 'Vertragskonditionen',
        title: 'Extrahierte Werte',
        originalText: '',
        summary: 'Automatisch extrahierte Werte aus dem Rohtext',
        keyValues: {},
      };
      clauses.push(targetClause);
    }

    // Add to clause keyValues if not already present
    if (!targetClause.keyValues) targetClause.keyValues = {};
    const existingNorms = Object.keys(targetClause.keyValues).map(normalizeKeyForMatch);
    const alreadyExists = existingNorms.some(ek => fuzzyKeyMatch(ek, val.key));

    if (!alreadyExists) {
      targetClause.keyValues[val.rawKey] = val.value;
      assigned++;
    }

    // Store area mapping for cross-area matching
    val._assignedArea = targetClause.area;
  }

  if (assigned > 0) {
    console.log(`📋 Layer 0→Klauseln: ${assigned} Werte zugeordnet`);
  }
}

/**
 * Mergt Layer-0-Regex-Werte in die Area-keyValues für Schicht 2.
 * Regex-Werte haben Vorrang bei Konflikten (höheres Vertrauen).
 */
function mergeRawValuesIntoAreas(areaKV, rawValues, clauses) {
  if (!rawValues?.length) return;

  let merged = 0;
  for (const rv of rawValues) {
    // V3.2: Blank-value-Einträge nicht in Areas mergen — sie verwirren den Vergleich
    if (isBlankRawValue(rv)) continue;
    const area = rv._assignedArea || 'payment';
    if (!areaKV[area]) areaKV[area] = {};

    const existingKeys = Object.keys(areaKV[area]);
    const existingNorms = existingKeys.map(normalizeKeyForMatch);

    let existingMatch = null;
    for (let i = 0; i < existingNorms.length; i++) {
      if (fuzzyKeyMatch(existingNorms[i], rv.key)) {
        existingMatch = existingKeys[i];
        break;
      }
    }

    if (!existingMatch) {
      // Not present → add
      areaKV[area][rv.rawKey] = rv.value;
      merged++;
    } else {
      // Present → regex wins if values differ numerically
      const existingVal = areaKV[area][existingMatch];
      const existingParsed = extractValueAndUnit(String(existingVal));
      if (rv.numValue !== null && existingParsed.num !== null && rv.numValue !== existingParsed.num) {
        areaKV[area][existingMatch] = rv.value;
        merged++;
      }
    }
  }

  if (merged > 0) {
    console.log(`🔢 Layer 0→Schicht 2: ${merged} Regex-Werte in Areas gemergt`);
  }
}

/**
 * V3.2: Prüft ob GPT-Erklärungstext mit den tatsächlich angezeigten Werten konsistent ist.
 * Extrahiert Zahlen (EUR, %, Tage, Monate, Jahre, große Zahlen) aus der Erklärung und
 * prüft ob sie in value1 oder value2 vorkommen. Wenn eine Zahl in der Erklärung steht,
 * die in KEINEM der beiden Werte vorkommt → Erklärung halluziniert, nicht vertrauen.
 *
 * Rückgabe: true = konsistent (Erklärung darf verwendet werden), false = widersprüchlich.
 */
function isExplanationConsistent(explanation, value1, value2) {
  if (!explanation || typeof explanation !== 'string') return true; // Nichts zu prüfen
  if (explanation.length < 10) return true;

  const valuePool = `${value1 || ''} ${value2 || ''}`;

  // Extrahiere Zahlen aus der Erklärung: EUR-Beträge, Prozente, Zeiteinheiten, Roh-Zahlen >= 2 Ziffern
  const numberRegex = /(\d[\d.,]*)\s*(EUR|€|Euro|%|Prozent|Tage?|Monate?|Wochen?|Jahre?)?/gi;
  const explanationNumbers = [];
  let match;
  while ((match = numberRegex.exec(explanation)) !== null) {
    const numStr = match[1];
    const parsed = parseGermanNumber(numStr);
    // Ignoriere sehr kleine Zahlen (Paragraphen-Nummern, Aufzählungen, etc.)
    if (parsed === null || isNaN(parsed)) continue;
    if (parsed < 2 && !match[2]) continue; // "1", "0.5" ohne Einheit → Aufzählung
    if (parsed < 10 && !match[2] && numStr.length < 2) continue;
    explanationNumbers.push(parsed);
  }

  if (explanationNumbers.length === 0) return true; // Erklärung hat keine Zahlen → nicht prüfbar

  // Extrahiere Zahlen aus dem Werte-Pool
  const poolNumbers = [];
  const poolMatches = valuePool.match(/\d[\d.,]*/g) || [];
  for (const pm of poolMatches) {
    const parsed = parseGermanNumber(pm);
    if (parsed !== null && !isNaN(parsed)) poolNumbers.push(parsed);
  }

  // Jede Zahl aus der Erklärung muss im Werte-Pool vorkommen (Toleranz 1%)
  for (const expNum of explanationNumbers) {
    const found = poolNumbers.some(pn => {
      if (pn === expNum) return true;
      if (pn === 0 || expNum === 0) return false;
      const rel = Math.abs(pn - expNum) / Math.max(Math.abs(pn), Math.abs(expNum));
      return rel < 0.01;
    });
    if (!found) return false; // Halluzinierte Zahl gefunden
  }

  return true;
}

/**
 * Nach Schicht 3: Prüft ob zitierte detail1/detail2 Texte tatsächlich im jeweiligen
 * Vertrag vorkommen. Eliminiert halluzinierte Zitate (beide fehlen → entfernen).
 */
function verifyClauseQuotes(clauseBundle, text1, text2) {
  if (!clauseBundle?.pairResults?.length || !text1 || !text2) return;

  const norm = (t) => (t || '').toLowerCase().replace(/\s+/g, ' ').trim();
  const normText1 = norm(text1);
  const normText2 = norm(text2);

  let removed = 0;
  let warned = 0;

  const verifyQuote = (detail, sourceNorm) => {
    if (!detail || detail.length < 20) return true; // too short to verify
    const d = norm(detail);
    if (sourceNorm.includes(d)) return true;
    // Try 30-char substring from middle
    const mid = Math.floor(d.length / 2);
    const subLen = Math.min(30, d.length);
    const sub = d.substring(mid - Math.floor(subLen / 2), mid + Math.ceil(subLen / 2));
    if (sub.length >= 20 && sourceNorm.includes(sub)) return true;
    // Try first 30 chars
    const start = d.substring(0, Math.min(30, d.length));
    if (start.length >= 20 && sourceNorm.includes(start)) return true;
    return false;
  };

  for (const pairResult of clauseBundle.pairResults) {
    if (!pairResult.differences) continue;

    pairResult.differences = pairResult.differences.filter(diff => {
      const d1 = (diff.detail1 || '').trim();
      const d2 = (diff.detail2 || '').trim();

      // Skip very short quotes
      if (d1.length < 20 && d2.length < 20) return true;

      const v1 = verifyQuote(d1, normText1);
      const v2 = verifyQuote(d2, normText2);

      if (!v1 && !v2) {
        console.log(`🧹 Quote-Check: ENTFERNT "${(diff._clauseTitle || '').substring(0, 40)}" — beide Zitate nicht im Originaltext`);
        removed++;
        return false;
      }

      if (!v1 || !v2) warned++;
      return true;
    });
  }

  if (removed > 0 || warned > 0) {
    console.log(`🧹 Quote-Check: ${removed} entfernt, ${warned} Warnungen`);
  }
}

/**
 * Maßnahme B.1 — KERNSTÜCK: Deterministischer Wertevergleich.
 *
 * Vergleicht keyValues beider Verträge Area für Area.
 * Erkennt: gleiche Werte (skip), unterschiedliche Werte (diff), fehlende Bereiche (gap).
 * Ergebnis geht als verifizierte Fakten an Phase B.
 *
 * @param {object} map1 - Phase-A-Ergebnis Vertrag 1 (mit angereicherten keyValues)
 * @param {object} map2 - Phase-A-Ergebnis Vertrag 2 (mit angereicherten keyValues)
 * @param {object|null} clauseMatchResult - Ergebnis von matchClauses()
 * @returns {Array<DeterministicDifference>}
 */
/**
 * V3.1: Inferiert die korrekte Area aus dem KeyValue-Namen.
 * Löst das Konditionenblatt-Problem: Wenn Phase A z.B. Finanzdaten
 * unter "parties" einordnet, werden sie hier zur richtigen Area umgeleitet.
 * Gibt null zurück wenn keine sichere Zuordnung möglich ist.
 */
function inferAreaFromKeyName(key) {
  const k = (key || '').toLowerCase();

  // Payment-Begriffe
  if (/gebühr|gebuehr|preis|betrag|kosten|honorar|vergütung|verguetung|entgelt|provision|rabatt|skonto|netto|brutto|mwst|umsatzsteuer|zahlung|flatrate|inkasso|einrichtung|mindest.*gebühr|ankauf.*limit|factoringvolumen|zwischensumme|gesamtbetrag|rechnungs|außenstandsdauer|aussenstandsdauer|zahlungsziel|zahlungsfrist|fälligkeit|faelligkeit|valuta|valutierung/.test(k)) {
    return 'payment';
  }
  // Sicherungseinbehalt ist auch Payment (Einbehalt vom Kaufpreis)
  if (/sicherungseinbehalt|einbehalt/.test(k)) {
    return 'payment';
  }

  // Liability-Begriffe
  if (/selbstbehalt|haftung|delkredere|schadensersatz|haftungsbegrenzung|haftungsausschluss/.test(k)) {
    return 'liability';
  }

  // Termination-Begriffe
  if (/kündigungsfrist|kuendigungsfrist|kündigung|kuendigung/.test(k)) {
    return 'termination';
  }

  // Duration-Begriffe
  if (/laufzeit|vertragsdauer|vertragslaufzeit|mindestlaufzeit|gültig.*bis|gueltig.*bis/.test(k)) {
    return 'duration';
  }

  // Warranty-Begriffe
  if (/gewährleistung|gewaehrleistung|garantie|mängelrüge|maengelruege/.test(k)) {
    return 'warranty';
  }

  // V3.4: Cache-Lookup als Fallback (befüllt durch preClassifyUnknownKeys via GPT).
  // Bleibt synchron — wenn Cache leer (z.B. in Tests), exakt heutiges Verhalten.
  const normKey = normalizeKeyForMatch(key);
  if (normKey) {
    const cached = keyClassificationCache.get(normKey);
    if (cached && VALID_CLAUSE_AREAS.includes(cached)) return cached;
  }

  return null; // Keine sichere Zuordnung → Clause-Area beibehalten
}

/**
 * V3.4: Pre-Classification — sammelt unbekannte keyValue-Keys aus den
 * Phase-A-Klauseln (parties/other/subject) und klassifiziert sie via GPT-Batch-Call.
 * Schreibt das Ergebnis in keyClassificationCache + MongoDB-Persistenz.
 *
 * Wird VOR buildDeterministicDifferences aufgerufen — danach hat
 * inferAreaFromKeyName die neuen Klassifikationen automatisch im Cache.
 *
 * Graceful: Bei jedem Fehler (GPT down, Timeout, JSON-Parse) → silent return,
 * Pipeline läuft normal mit Regex-only weiter.
 */
async function preClassifyUnknownKeys(map1, map2) {
  // Stelle sicher dass MongoDB-Cache geladen ist (lazy, nur 1x pro Process)
  await loadKeyClassificationCache();

  // Sammle Kandidaten: nur Klauseln die typischerweise fehlklassifiziert werden
  const targetAreas = new Set(['parties', 'other', 'subject']);
  const unknownKeys = new Map(); // normKey → { rawKey, exampleValue }

  for (const map of [map1, map2]) {
    if (!map?.clauses || !Array.isArray(map.clauses)) continue;
    for (const clause of map.clauses) {
      if (!targetAreas.has(clause.area)) continue;
      const kv = clause.keyValues || {};
      for (const [rawKey, value] of Object.entries(kv)) {
        if (!rawKey || typeof rawKey !== 'string') continue;
        const normKey = normalizeKeyForMatch(rawKey);
        if (!normKey || normKey.length < 3) continue;
        // Schon durch Regex ODER Cache erkannt? → kein Bedarf für GPT
        // inferAreaFromKeyName prüft beides — wenn !=null, ist der Key bereits abgedeckt
        if (inferAreaFromKeyName(rawKey)) continue;
        // Blank-Values überspringen
        if (typeof value === 'string' && /Wert nicht extrahierbar/i.test(value)) continue;
        if (!unknownKeys.has(normKey)) {
          unknownKeys.set(normKey, { rawKey, exampleValue: String(value || '').slice(0, 100) });
        }
      }
    }
  }

  if (unknownKeys.size === 0) return;

  console.log(`🤖 KeyClassification: ${unknownKeys.size} unbekannte Keys → GPT-Batch-Call`);

  const itemArray = Array.from(unknownKeys.entries());
  const itemList = itemArray.map(([_norm, info], i) =>
    `${i + 1}. "${info.rawKey}"${info.exampleValue ? ` (Beispielwert: ${info.exampleValue})` : ''}`
  ).join('\n');

  const systemPrompt = `Du klassifizierst Schlüsselbegriffe aus Verträgen und Geschäftsdokumenten in genau eine von 14 thematischen Kategorien. Antworte ausschließlich mit validem JSON.`;

  const userPrompt = `Ordne jeden der folgenden Begriffe genau einer Kategorie zu. Wähle die thematisch passendste Kategorie auf Basis von Begriff UND Beispielwert.

BEGRIFFE:
${itemList}

VERFÜGBARE KATEGORIEN:
- parties — Vertragsparteien, Beteiligte (NUR reine Identifikationsdaten: Name, Adresse, Sitz, USt-IdNr)
- subject — Vertragsgegenstand, Leistungsbeschreibung, Produkte
- duration — Laufzeit, Vertragsdauer, Gültigkeit, Lieferfristen, Verlängerung
- termination — Kündigung, Kündigungsfristen, Beendigungsmodalitäten
- payment — Preise, Gebühren, Zahlungen, Skonto, Mahnkosten, Außenstandsdauer, Verzugszinsen, Zahlungsziel/Zahlungsfrist, Fälligkeit, Provisionen, Rabatte, Anzahlung, Stundungszinsen
- liability — Haftung, Schadensersatz, Selbstbehalt, Delkredere, Haftungsbegrenzung
- warranty — Gewährleistung, Garantie, Mängelrüge, Mängelhaftung
- confidentiality — Geheimhaltung, Verschwiegenheit, Vertraulichkeit
- ip_rights — Urheberrecht, Lizenzen, Nutzungsrechte, Schutzrechte
- data_protection — Datenschutz, DSGVO, Auftragsverarbeitung
- non_compete — Wettbewerbsverbot, Konkurrenzklausel
- force_majeure — Höhere Gewalt, unvorhersehbare Ereignisse
- jurisdiction — Gerichtsstand, anwendbares Recht, Schiedsgerichtsbarkeit
- other — Sonstiges (NUR wenn keine andere Kategorie passt)

Antwortformat (NUR valides JSON, keine Kommentare):
{"classifications": [{"index": 1, "category": "payment"}, {"index": 2, "category": "duration"}]}

WICHTIG: Jeder Index muss exakt zu einem Begriff oben passen. Kategorie MUSS exakt eines der Wörter oben sein.`;

  try {
    const completion = await Promise.race([
      openai.chat.completions.create({
        model: 'gpt-4o-mini', // Klassifikation ist einfach, billig, schnell
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0,
        max_tokens: 2048,
        response_format: { type: 'json_object' },
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Classification Timeout 10s')), 10000)),
    ]);

    const raw = JSON.parse(completion.choices[0]?.message?.content || '{}');
    const classifications = Array.isArray(raw?.classifications) ? raw.classifications : [];

    let saved = 0;
    for (const cls of classifications) {
      const idx = (typeof cls?.index === 'number' ? cls.index : 0) - 1;
      if (idx < 0 || idx >= itemArray.length) continue;
      const category = String(cls?.category || '').toLowerCase();
      if (!VALID_CLAUSE_AREAS.includes(category)) continue;
      const [normKey, info] = itemArray[idx];
      keyClassificationCache.set(normKey, category);
      saveKeyClassification(normKey, category, info.exampleValue); // fire-and-forget
      saved++;
    }
    console.log(`📚 KeyClassification: ${saved}/${unknownKeys.size} Keys klassifiziert und gecacht`);
  } catch (err) {
    console.warn(`⚠️ KeyClassification fehlgeschlagen (nicht-kritisch): ${err.message}`);
  }
}


/**
 * V3.1: Reklassifiziert keyValues die in der falschen Area gelandet sind.
 * Verschiebt z.B. "Flatrate-Gebühr" von "parties" nach "payment".
 * Nur aktiv für Areas wo eine Fehlklassifikation wahrscheinlich ist (parties, other).
 */
function reclassifyKeyValues(areaKV) {
  const sourcesForReclass = ['parties', 'other']; // Nur aus diesen Areas reklassifizieren
  const moved = [];

  for (const sourceArea of sourcesForReclass) {
    if (!areaKV[sourceArea]) continue;
    const toRemove = [];

    for (const [key, value] of Object.entries(areaKV[sourceArea])) {
      const correctArea = inferAreaFromKeyName(key);
      if (correctArea && correctArea !== sourceArea) {
        // In richtige Area verschieben
        if (!areaKV[correctArea]) areaKV[correctArea] = {};
        if (!areaKV[correctArea][key]) { // Nicht überschreiben wenn schon vorhanden
          areaKV[correctArea][key] = value;
        }
        toRemove.push(key);
        moved.push(`"${key}": ${sourceArea} → ${correctArea}`);
      }
    }

    for (const key of toRemove) {
      delete areaKV[sourceArea][key];
    }
  }

  if (moved.length > 0) {
    console.log(`🔄 KeyValue-Reclassification: ${moved.length} Werte umgeordnet: ${moved.join(', ')}`);
  }
}

function buildDeterministicDifferences(map1, map2, clauseMatchResult, docConfig) {
  const diffs = [];
  const skipAreas = new Set(docConfig?.compareSkipAreas || ['parties', 'subject', 'jurisdiction', 'other']);
  // V3: Add irrelevant areas from document type config
  if (docConfig?.irrelevantAreas) {
    for (const area of docConfig.irrelevantAreas) skipAreas.add(area);
  }

  // Schritt 0: DIREKTE rawValues-Vergleich (100% deterministisch, area-unabhängig)
  // Vergleicht Layer 0 rawValues V1 vs V2 direkt — immer gleiches Ergebnis.
  const directMatchedKeys = new Set(); // Track matched keys to avoid duplicates in per-area pass
  if (USE_RAW_VALUES && map1._rawValues?.length && map2._rawValues?.length) {
    // V3: Filter rawValues from skipAreas + blank-value entries + deduplicate (same key+value = skip)
    // V3.2: Blank-value-Einträge ("Wert nicht extrahierbar") dürfen Schritt 0 nicht verschmutzen
    const dedupRaw = (rawValues) => {
      const seen = new Set();
      return rawValues.filter(rv => {
        if (skipAreas.has(rv._assignedArea)) return false;
        if (isBlankRawValue(rv)) return false;
        const sig = `${(rv.key || '').toLowerCase()}|${(rv.value || '').toLowerCase()}`;
        if (seen.has(sig)) return false;
        seen.add(sig);
        return true;
      });
    };
    const rv1 = dedupRaw(map1._rawValues);
    const rv2 = dedupRaw(map2._rawValues);
    const matched2 = new Set();

    for (const r1 of rv1) {
      let bestMatch = null;
      for (const r2 of rv2) {
        if (matched2.has(r2.key)) continue;
        if (fuzzyKeyMatch(r1.key, r2.key)) {
          bestMatch = r2;
          break;
        }
      }

      if (bestMatch) {
        matched2.add(bestMatch.key);
        directMatchedKeys.add(r1.key);
        directMatchedKeys.add(bestMatch.key);

        // Compare values
        if (r1.numValue !== null && bestMatch.numValue !== null) {
          if (r1.numValue !== bestMatch.numValue) {
            diffs.push({
              area: r1._assignedArea || bestMatch._assignedArea || 'payment',
              key: r1.rawKey,
              value1: r1.value,
              value2: bestMatch.value,
              numValue1: r1.numValue,
              numValue2: bestMatch.numValue,
              unit: r1.unit || bestMatch.unit || null,
              diffType: 'numeric',
              section1: null,
              section2: null,
              _fromDirectRaw: true,
            });
          }
          // Equal → skip (good!)
        } else {
          const n1 = (r1.value || '').toLowerCase().trim();
          const n2 = (bestMatch.value || '').toLowerCase().trim();
          if (n1 !== n2) {
            diffs.push({
              area: r1._assignedArea || bestMatch._assignedArea || 'payment',
              key: r1.rawKey,
              value1: r1.value,
              value2: bestMatch.value,
              numValue1: r1.numValue,
              numValue2: bestMatch.numValue,
              unit: r1.unit || bestMatch.unit || null,
              diffType: 'text',
              section1: null,
              section2: null,
              _fromDirectRaw: true,
            });
          }
        }
      } else {
        // Only in V1
        if (r1.numValue !== null || r1.unit) {
          diffs.push({
            area: r1._assignedArea || 'payment',
            key: r1.rawKey,
            value1: r1.value,
            value2: null,
            numValue1: r1.numValue,
            numValue2: null,
            unit: r1.unit,
            diffType: 'only_in_1',
            section1: null,
            section2: null,
            _fromDirectRaw: true,
          });
        }
      }
    }

    // Only in V2
    for (const r2 of rv2) {
      if (matched2.has(r2.key)) continue;
      if (r2.numValue !== null || r2.unit) {
        diffs.push({
          area: r2._assignedArea || 'payment',
          key: r2.rawKey,
          value1: null,
          value2: r2.value,
          numValue1: null,
          numValue2: r2.numValue,
          unit: r2.unit,
          diffType: 'only_in_2',
          section1: null,
          section2: null,
          _fromDirectRaw: true,
        });
      }
    }

    const directCount = diffs.length;
    if (directCount > 0) {
      console.log(`🔢 Layer 0 Direkt: ${directCount} Diffs aus rawValues-Vergleich (deterministisch)`);
    }
  }

  // Schritt 1: keyValues pro Area sammeln
  const areaKV1 = {};  // { area: { key: value, ... } }
  const areaKV2 = {};
  const areaSections1 = {}; // { area: "§5 Abs. 2" }
  const areaSections2 = {};

  for (const c of (map1.clauses || [])) {
    if (skipAreas.has(c.area)) continue;
    if (!areaKV1[c.area]) areaKV1[c.area] = {};
    if (c.keyValues && typeof c.keyValues === 'object') {
      Object.assign(areaKV1[c.area], c.keyValues);
    }
    if (!areaSections1[c.area]) areaSections1[c.area] = c.section;
  }

  for (const c of (map2.clauses || [])) {
    if (skipAreas.has(c.area)) continue;
    if (!areaKV2[c.area]) areaKV2[c.area] = {};
    if (c.keyValues && typeof c.keyValues === 'object') {
      Object.assign(areaKV2[c.area], c.keyValues);
    }
    if (!areaSections2[c.area]) areaSections2[c.area] = c.section;
  }

  // Dedup: Entferne Duplikat-keyValues pro Area (gleicher Wert unter verschiedenen Keys)
  for (const areaKV of [areaKV1, areaKV2]) {
    for (const area of Object.keys(areaKV)) {
      areaKV[area] = deduplicateKeyValues(areaKV[area]);
    }
  }

  // Schritt 1b: Layer 0 Regex-Werte in Area-keyValues mergen (Regex hat Vorrang)
  if (USE_RAW_VALUES) {
    if (map1._rawValues) mergeRawValuesIntoAreas(areaKV1, map1._rawValues, map1.clauses);
    if (map2._rawValues) mergeRawValuesIntoAreas(areaKV2, map2._rawValues, map2.clauses);

    // Re-dedup after merge
    for (const areaKV of [areaKV1, areaKV2]) {
      for (const area of Object.keys(areaKV)) {
        areaKV[area] = deduplicateKeyValues(areaKV[area]);
      }
    }
  }

  // V3.1: Reklassifiziere fehlzugeordnete keyValues (z.B. Finanzdaten unter "parties")
  reclassifyKeyValues(areaKV1);
  reclassifyKeyValues(areaKV2);

  const allAreas = new Set([...Object.keys(areaKV1), ...Object.keys(areaKV2)]);

  console.log(`🔢 Schicht 2: Prüfe ${allAreas.size} Areas: [${[...allAreas].join(', ')}]`);

  for (const area of allAreas) {
    const kv1 = areaKV1[area] || {};
    const kv2 = areaKV2[area] || {};
    const section1 = areaSections1[area] || null;
    const section2 = areaSections2[area] || null;

    // Schritt 4 (integrierte Gap Detection — Maßnahme D):
    // Area nur in einem Vertrag vorhanden
    if (Object.keys(kv1).length === 0 && Object.keys(kv2).length === 0) continue;

    // Schritt 2: Keys normalisieren und matchen
    // Skip keys already covered by direct rawValues comparison (Schritt 0)
    const entries1 = Object.entries(kv1)
      .map(([k, v]) => ({ key: k, norm: normalizeKeyForMatch(k), value: String(v) }))
      .filter(e => !directMatchedKeys.has(e.norm));
    const entries2 = Object.entries(kv2)
      .map(([k, v]) => ({ key: k, norm: normalizeKeyForMatch(k), value: String(v) }))
      .filter(e => !directMatchedKeys.has(e.norm));
    const matched2 = new Set();

    // Match keys from contract 1 against contract 2
    for (const e1 of entries1) {
      let bestMatch = null;
      for (const e2 of entries2) {
        if (matched2.has(e2.key)) continue;
        if (fuzzyKeyMatch(e1.norm, e2.norm)) {
          bestMatch = e2;
          break;
        }
      }

      if (bestMatch) {
        matched2.add(bestMatch.key);

        // Schritt 3: Werte vergleichen
        const parsed1 = extractValueAndUnit(e1.value);
        const parsed2 = extractValueAndUnit(bestMatch.value);

        // Beide numerisch → numerischer Vergleich
        if (parsed1.num !== null && parsed2.num !== null) {
          if (parsed1.num !== parsed2.num) {
            diffs.push({
              area,
              key: e1.key,
              value1: e1.value,
              value2: bestMatch.value,
              numValue1: parsed1.num,
              numValue2: parsed2.num,
              unit: parsed1.unit || parsed2.unit || null,
              diffType: 'numeric',
              section1,
              section2,
            });
          }
          // gleich → skip
        } else {
          // Mindestens einer nicht numerisch → Textvergleich
          const norm1 = (e1.value || '').toLowerCase().trim();
          const norm2 = (bestMatch.value || '').toLowerCase().trim();
          if (norm1 !== norm2) {
            diffs.push({
              area,
              key: e1.key,
              value1: e1.value,
              value2: bestMatch.value,
              numValue1: parsed1.num,
              numValue2: parsed2.num,
              unit: parsed1.unit || parsed2.unit || null,
              diffType: 'text',
              section1,
              section2,
            });
          }
        }
      } else {
        // Key nur in Vertrag 1
        diffs.push({
          area,
          key: e1.key,
          value1: e1.value,
          value2: null,
          numValue1: extractValueAndUnit(e1.value).num,
          numValue2: null,
          unit: extractValueAndUnit(e1.value).unit,
          diffType: 'only_in_1',
          section1,
          section2: null,
        });
      }
    }

    // Keys nur in Vertrag 2 (nicht gematcht)
    for (const e2 of entries2) {
      if (matched2.has(e2.key)) continue;
      diffs.push({
        area,
        key: e2.key,
        value1: null,
        value2: e2.value,
        numValue1: null,
        numValue2: extractValueAndUnit(e2.value).num,
        unit: extractValueAndUnit(e2.value).unit,
        diffType: 'only_in_2',
        section1: null,
        section2,
      });
    }
  }

  // Schritt 4b: Area-Level Gaps (ganzer Bereich fehlt in einem Vertrag)
  // Prüfe Areas die in Phase A Klauseln haben aber keine keyValues
  const areasMap1 = {};
  const areasMap2 = {};
  for (const c of (map1.clauses || [])) {
    if (skipAreas.has(c.area)) continue;
    if (!areasMap1[c.area]) areasMap1[c.area] = [];
    areasMap1[c.area].push(c);
  }
  for (const c of (map2.clauses || [])) {
    if (skipAreas.has(c.area)) continue;
    if (!areasMap2[c.area]) areasMap2[c.area] = [];
    areasMap2[c.area].push(c);
  }

  const allClauseAreas = new Set([...Object.keys(areasMap1), ...Object.keys(areasMap2)]);
  const coveredAreas = new Set(diffs.map(d => d.area));

  for (const area of allClauseAreas) {
    if (coveredAreas.has(area)) continue; // Already has value-level diffs
    const c1 = areasMap1[area] || [];
    const c2 = areasMap2[area] || [];

    if (c1.length > 0 && c2.length === 0) {
      diffs.push({
        area,
        key: '_area_missing',
        value1: c1[0].summary || c1[0].title || 'Vorhanden',
        value2: null,
        numValue1: null,
        numValue2: null,
        unit: null,
        diffType: 'only_in_1',
        section1: c1[0].section || null,
        section2: null,
        _isAreaGap: true,
      });
    } else if (c2.length > 0 && c1.length === 0) {
      diffs.push({
        area,
        key: '_area_missing',
        value1: null,
        value2: c2[0].summary || c2[0].title || 'Vorhanden',
        numValue1: null,
        numValue2: null,
        unit: null,
        diffType: 'only_in_2',
        section1: null,
        section2: c2[0].section || null,
        _isAreaGap: true,
      });
    }
  }

  // Schritt 6: Cross-Area-Matching (Layer 0)
  // Match rawValues that weren't covered in per-area comparison
  if (USE_RAW_VALUES && map1._rawValues && map2._rawValues) {
    const matchedRawKeys1 = new Set();
    const matchedRawKeys2 = new Set();

    // Mark rawValues already covered by existing diffs
    for (const d of diffs) {
      const normKey = normalizeKeyForMatch(d.key);
      for (const rv of map1._rawValues) {
        if (fuzzyKeyMatch(rv.key, normKey)) matchedRawKeys1.add(rv.key);
      }
      for (const rv of map2._rawValues) {
        if (fuzzyKeyMatch(rv.key, normKey)) matchedRawKeys2.add(rv.key);
      }
    }

    // Cross-area: match unmatched V1 rawValues against unmatched V2 rawValues
    // V3: Also filter out rawValues from skipAreas (includes docConfig.irrelevantAreas)
    // V3.2: Blank-value-Einträge ausschließen
    const unmatched1 = map1._rawValues.filter(rv => !matchedRawKeys1.has(rv.key) && !skipAreas.has(rv._assignedArea) && !isBlankRawValue(rv));
    const unmatched2 = map2._rawValues.filter(rv => !matchedRawKeys2.has(rv.key) && !skipAreas.has(rv._assignedArea) && !isBlankRawValue(rv));
    const crossMatched2 = new Set();

    for (const rv1 of unmatched1) {
      for (const rv2 of unmatched2) {
        if (crossMatched2.has(rv2.key)) continue;
        if (fuzzyKeyMatch(rv1.key, rv2.key)) {
          crossMatched2.add(rv2.key);
          if (rv1.numValue !== null && rv2.numValue !== null) {
            if (rv1.numValue !== rv2.numValue) {
              diffs.push({
                area: rv1._assignedArea || rv2._assignedArea || 'payment',
                key: rv1.rawKey,
                value1: rv1.value,
                value2: rv2.value,
                numValue1: rv1.numValue,
                numValue2: rv2.numValue,
                unit: rv1.unit || rv2.unit || null,
                diffType: 'numeric',
                section1: null,
                section2: null,
                _fromCrossArea: true,
              });
            }
          } else {
            const n1 = (rv1.value || '').toLowerCase().trim();
            const n2 = (rv2.value || '').toLowerCase().trim();
            if (n1 !== n2) {
              diffs.push({
                area: rv1._assignedArea || rv2._assignedArea || 'payment',
                key: rv1.rawKey,
                value1: rv1.value,
                value2: rv2.value,
                numValue1: rv1.numValue,
                numValue2: rv2.numValue,
                unit: rv1.unit || rv2.unit || null,
                diffType: 'text',
                section1: null,
                section2: null,
                _fromCrossArea: true,
              });
            }
          }
          break;
        }
      }
    }

    const crossCount = diffs.filter(d => d._fromCrossArea).length;
    if (crossCount > 0) {
      console.log(`🔢 Layer 0 Cross-Area: ${crossCount} zusätzliche Diffs`);
    }
  }

  // V3.1: Finale Reclassification ALLER Diffs (fängt auch Schritt 0 + Cross-Area ab)
  let reclassCount = 0;
  for (const d of diffs) {
    if (d._isAreaGap) continue; // Area-Level Gaps nicht reklassifizieren
    const correctArea = inferAreaFromKeyName(d.key);
    if (correctArea && correctArea !== d.area) {
      d.area = correctArea;
      reclassCount++;
    }
  }
  if (reclassCount > 0) {
    console.log(`🔄 Finale Diff-Reclassification: ${reclassCount} Diffs korrigiert`);
  }

  // V3.2: Blank-Value Filter — entferne Diffs wo "Wert nicht extrahierbar" auftaucht.
  // Diese stammen aus OCR-Recovery-Fehlversuchen und verwirren den User.
  // Phase A hat das Feld erkannt, konnte aber den Wert nicht parsen → besser schweigen.
  const beforeBlankFilter = diffs.length;
  const cleanedDiffs = diffs.filter(d => !isBlankValueString(d.value1) && !isBlankValueString(d.value2));
  if (cleanedDiffs.length < beforeBlankFilter) {
    console.log(`🧹 Blank-Value Filter: ${beforeBlankFilter - cleanedDiffs.length} unbrauchbare Diffs entfernt`);
  }
  diffs.length = 0;
  diffs.push(...cleanedDiffs);

  // Schritt 7: Sortieren — payment zuerst, dann numerisch vor text, dann nach Diff-Größe
  diffs.sort((a, b) => {
    // payment-Area zuerst
    if (a.area === 'payment' && b.area !== 'payment') return -1;
    if (b.area === 'payment' && a.area !== 'payment') return 1;
    // numerisch vor text
    if (a.diffType === 'numeric' && b.diffType !== 'numeric') return -1;
    if (b.diffType === 'numeric' && a.diffType !== 'numeric') return 1;
    // Größerer prozentualer Unterschied zuerst
    if (a.diffType === 'numeric' && b.diffType === 'numeric' && a.numValue1 && b.numValue1) {
      const pctA = Math.abs((a.numValue1 - a.numValue2) / a.numValue1);
      const pctB = Math.abs((b.numValue1 - b.numValue2) / b.numValue1);
      return pctB - pctA;
    }
    return 0;
  });

  console.log(`🔢 Schicht 2: ${diffs.length} deterministische Unterschiede gefunden`);
  diffs.forEach(d => {
    const label = AREA_LABELS[d.area] || d.area;
    if (d._isAreaGap) {
      const inContract = d.value1 ? 1 : 2;
      console.log(`   → [GAP] ${label}: Bereich nur in Vertrag ${inContract}`);
    } else if (d.diffType === 'numeric') {
      console.log(`   → [NUM] ${label}.${d.key}: ${d.value1} vs ${d.value2}`);
    } else if (d.diffType === 'text') {
      console.log(`   → [TXT] ${label}.${d.key}: "${d.value1}" vs "${d.value2}"`);
    } else {
      const inContract = d.diffType === 'only_in_1' ? 1 : 2;
      console.log(`   → [ONLY${inContract}] ${label}.${d.key}: ${d.value1 || d.value2}`);
    }
  });

  return diffs;
}

// ============================================
// SCHICHT 2.5: Gruppierung + Prompt-Formatierung + Merge
// Gruppiert granulare Einzel-Diffs in semantische Gruppen.
// Phase B bewertet GRUPPEN (nicht Einzelwerte).
// ============================================

/**
 * Gruppiert rohe deterministische Diffs in semantische Gruppen:
 * - Matched-Diffs (NUM/TXT) → je eine eigene Gruppe (klarer Vergleich)
 * - ONLY_IN_1 pro Area → eine Gruppe ("Werte nur in Vertrag 1")
 * - ONLY_IN_2 pro Area → eine Gruppe ("Werte nur in Vertrag 2")
 */
function groupDeterministicDiffs(rawDiffs) {
  if (!rawDiffs || rawDiffs.length === 0) return [];

  const groups = [];
  let groupId = 0;

  const matched = rawDiffs.filter(d => d.diffType === 'numeric' || d.diffType === 'text');
  const onlyIn1 = rawDiffs.filter(d => d.diffType === 'only_in_1');
  const onlyIn2 = rawDiffs.filter(d => d.diffType === 'only_in_2');

  // Each matched diff = own group (clear 1:1 comparison)
  for (const d of matched) {
    groupId++;
    const label = AREA_LABELS[d.area] || d.area;
    groups.push({
      id: `GRUPPE_${groupId}`,
      area: d.area,
      areaLabel: label,
      type: 'matched',
      severity: inferDiffSeverity(d),
      items: [d],
    });
  }

  // Group only_in_1 by area
  const byArea1 = {};
  for (const d of onlyIn1) {
    if (!byArea1[d.area]) byArea1[d.area] = [];
    byArea1[d.area].push(d);
  }
  for (const [area, diffs] of Object.entries(byArea1)) {
    groupId++;
    const label = AREA_LABELS[area] || area;
    groups.push({
      id: `GRUPPE_${groupId}`,
      area,
      areaLabel: label,
      type: 'only_in_1',
      severity: inferGroupSeverity(area, diffs),
      items: diffs,
    });
  }

  // Group only_in_2 by area
  const byArea2 = {};
  for (const d of onlyIn2) {
    if (!byArea2[d.area]) byArea2[d.area] = [];
    byArea2[d.area].push(d);
  }
  for (const [area, diffs] of Object.entries(byArea2)) {
    groupId++;
    const label = AREA_LABELS[area] || area;
    groups.push({
      id: `GRUPPE_${groupId}`,
      area,
      areaLabel: label,
      type: 'only_in_2',
      severity: inferGroupSeverity(area, diffs),
      items: diffs,
    });
  }

  // Sort: matched first, then by area importance
  const areaPriority = { payment: 0, liability: 1, termination: 2, duration: 3, warranty: 4, confidentiality: 5 };
  groups.sort((a, b) => {
    if (a.type === 'matched' && b.type !== 'matched') return -1;
    if (b.type === 'matched' && a.type !== 'matched') return 1;
    const pA = areaPriority[a.area] ?? 10;
    const pB = areaPriority[b.area] ?? 10;
    return pA - pB;
  });

  console.log(`📦 Gruppierung: ${rawDiffs.length} Einzel-Diffs → ${groups.length} Gruppen`);
  groups.forEach(g => {
    const itemCount = g.items.filter(i => !i._isAreaGap).length;
    const gapCount = g.items.filter(i => i._isAreaGap).length;
    console.log(`   ${g.id} [${g.type}] ${g.areaLabel}: ${itemCount} Werte${gapCount > 0 ? ' + Area-Gap' : ''}, Severity: ${g.severity}`);
  });

  return groups;
}

function inferDiffSeverity(diff) {
  if (diff.diffType === 'numeric' && diff.numValue1 !== null && diff.numValue2 !== null && diff.numValue1 !== 0) {
    const pctDiff = Math.abs((diff.numValue2 - diff.numValue1) / diff.numValue1);
    if (pctDiff > 0.5) return 'critical';
    if (pctDiff > 0.2) return 'high';
    if (pctDiff > 0.1) return 'medium';
  }
  return MISSING_SEVERITY[diff.area] || 'medium';
}

function inferGroupSeverity(area, diffs) {
  if (diffs.some(d => d._isAreaGap)) return MISSING_SEVERITY[area] || 'medium';
  if (area === 'payment' && diffs.length >= 3) return 'high';
  if (area === 'liability' || area === 'payment') return 'medium';
  return MISSING_SEVERITY[area] || 'low';
}

function inferGroupSemanticType(group) {
  if (group.type === 'matched') {
    return group.items[0]?.diffType === 'numeric' ? 'conflicting' : 'different_scope';
  }
  if (group.items.some(d => d._isAreaGap)) return 'missing';
  return 'missing'; // only_in_1/only_in_2 = one side has it, other doesn't
}

/**
 * Formatiert Gruppen als strukturierter Prompt-Block für Phase B.
 * Jede Gruppe bekommt eine ID die Phase B referenzieren MUSS.
 */
function formatGroupsForPrompt(groups, docConfig) {
  if (!groups || groups.length === 0) return '';
  const dl = docConfig?.labels?.documentName || 'Vertrag';

  let text = `VERIFIZIERTE UNTERSCHIEDE (${groups.length} Gruppen):

Die folgenden Unterschiedsgruppen wurden durch exakten Wertevergleich ermittelt.
Diese Fakten sind verifiziert. Du MUSST jede Gruppe in "groupEvaluations" bewerten.

`;

  for (const group of groups) {
    text += `${group.id} | ${group.areaLabel} | `;

    if (group.type === 'matched') {
      const d = group.items[0];
      text += `Direktvergleich\n`;
      text += `  ${d.key}: ${dl} 1 = "${d.value1}" | ${dl} 2 = "${d.value2}"`;
      if (d.diffType === 'numeric' && d.numValue1 !== null && d.numValue2 !== null && d.numValue1 !== 0) {
        const pct = ((d.numValue2 - d.numValue1) / Math.abs(d.numValue1) * 100).toFixed(1);
        text += ` (Δ ${pct > 0 ? '+' : ''}${pct}%)`;
      }
      text += '\n';
    } else {
      const contract = group.type === 'only_in_1' ? 1 : 2;
      const otherContract = contract === 1 ? 2 : 1;
      const gaps = group.items.filter(d => d._isAreaGap);
      const items = group.items.filter(d => !d._isAreaGap);

      if (gaps.length > 0 && items.length === 0) {
        text += `Bereich fehlt komplett in ${dl} ${otherContract}\n`;
        text += `  ${dl} ${contract}: ${gaps[0].value1 || gaps[0].value2}\n`;
      } else {
        text += `Nur in ${dl} ${contract} (${items.length} Werte)\n`;
        for (const d of items) {
          const val = d.value1 || d.value2;
          text += `  • ${d.key}: ${val}\n`;
        }
      }
    }
    text += '\n';
  }

  return text;
}

/**
 * Kombiniert deterministische Gruppen + Phase-B-Bewertungen + zusätzliche Diffs
 * zu finalen EnhancedDifference[].
 */
function mergeDifferences(groups, groupEvaluations, additionalDiffs) {
  const merged = [];

  for (const group of groups) {
    const ev = (groupEvaluations || {})[group.id] || {};

    // Build contract1/contract2 text from group items
    let contract1, contract2, section;

    if (group.type === 'matched') {
      const d = group.items[0];
      contract1 = `${d.key}: ${d.value1}`;
      contract2 = `${d.key}: ${d.value2}`;
      section = d.section1 || d.section2 || '';
    } else if (group.type === 'only_in_1') {
      const items = group.items.filter(d => !d._isAreaGap);
      const gaps = group.items.filter(d => d._isAreaGap);
      contract1 = items.length > 0
        ? items.map(d => `${d.key}: ${d.value1}`).join('; ')
        : (gaps[0]?.value1 || 'Vorhanden');
      contract2 = 'Keine Regelung vorhanden';
      section = group.items[0]?.section1 || '';
    } else {
      const items = group.items.filter(d => !d._isAreaGap);
      const gaps = group.items.filter(d => d._isAreaGap);
      contract1 = 'Keine Regelung vorhanden';
      contract2 = items.length > 0
        ? items.map(d => `${d.key}: ${d.value2}`).join('; ')
        : (gaps[0]?.value2 || 'Vorhanden');
      section = group.items[0]?.section2 || '';
    }

    // Fallback explanation if Phase B didn't evaluate this group
    const fallbackExplanation = group.type === 'matched'
      ? `${group.items[0]?.key}: Vertrag 1 = "${group.items[0]?.value1}", Vertrag 2 = "${group.items[0]?.value2}".`
      : `${group.areaLabel}: ${group.items.filter(d => !d._isAreaGap).length} Werte nur in Vertrag ${group.type === 'only_in_1' ? 1 : 2}.`;

    merged.push({
      category: group.areaLabel,
      section,
      contract1,
      contract2,
      severity: ev.severity || group.severity,
      explanation: ev.explanation || fallbackExplanation,
      impact: ev.impact || '',
      recommendation: ev.recommendation || '',
      clauseArea: group.area,
      semanticType: ev.semanticType || inferGroupSemanticType(group),
      financialImpact: ev.financialImpact || null,
      marketContext: ev.marketContext || null,
      _fromDeterministic: true,
    });
  }

  // Add GPT's additional qualitative differences
  for (const diff of (additionalDiffs || [])) {
    merged.push({
      ...diff,
      _fromDeterministic: false,
    });
  }

  return merged;
}

/**
 * LEGACY — kept for backward compatibility.
 * Formatiert deterministische Unterschiede als Text für Phase B (altes Format).
 */
function formatDeterministicDiffsForPrompt(diffs) {
  if (!diffs || diffs.length === 0) return '';
  const groups = groupDeterministicDiffs(diffs);
  return formatGroupsForPrompt(groups);
}

/**
 * Safety net: Prüft ob Phase B alle deterministischen Unterschiede übernommen hat.
 * Falls nicht, werden fehlende als formatierte Differences zurückgegeben.
 * Das ist der Fallback — im Idealfall hat Phase B alle Fakten übernommen.
 */
function checkDeterministicCoverage(deterministicDiffs, phaseBDifferences) {
  if (!deterministicDiffs || deterministicDiffs.length === 0) return [];

  const missing = [];

  for (const dd of deterministicDiffs) {
    if (dd.key === '_area_missing') {
      // Area-level gap: check if Phase B has ANY difference for this area
      const covered = phaseBDifferences.some(d => d.clauseArea === dd.area);
      if (!covered) {
        const label = AREA_LABELS[dd.area] || dd.area;
        const inContract = dd.value1 ? 1 : 2;
        const otherContract = inContract === 1 ? 2 : 1;
        missing.push({
          category: label,
          section: dd.section1 || dd.section2 || '',
          contract1: dd.value1 || 'Keine Regelung vorhanden',
          contract2: dd.value2 || 'Keine Regelung vorhanden',
          severity: MISSING_SEVERITY[dd.area] || 'medium',
          explanation: `Vertrag ${inContract} enthält eine Regelung zu ${label}, die in Vertrag ${otherContract} vollständig fehlt.`,
          impact: `Fehlende ${label}-Klausel — es gelten nur gesetzliche Regelungen.`,
          recommendation: `Eine ${label}-Regelung sollte in Vertrag ${otherContract} ergänzt werden.`,
          clauseArea: dd.area,
          semanticType: 'missing',
          financialImpact: null,
          marketContext: null,
          _autoDetected: true,
          _fromDeterministic: true,
        });
      }
    } else {
      // Value-level diff: check if Phase B mentions this key
      const keyNorm = normalizeKeyForMatch(dd.key);
      const covered = phaseBDifferences.some(d => {
        const text = `${d.contract1 || ''} ${d.contract2 || ''} ${d.explanation || ''} ${d.category || ''}`.toLowerCase();
        return text.includes(keyNorm) || text.includes(dd.key.toLowerCase());
      });

      if (!covered) {
        const label = AREA_LABELS[dd.area] || dd.area;
        const v1 = dd.value1 || 'Keine Regelung vorhanden';
        const v2 = dd.value2 || 'Keine Regelung vorhanden';

        let explanation = `${dd.key}: Dokument 1 = "${v1}", Dokument 2 = "${v2}".`;
        if (dd.diffType === 'numeric' && dd.numValue1 !== null && dd.numValue2 !== null && dd.numValue1 !== 0) {
          const pct = ((dd.numValue2 - dd.numValue1) / Math.abs(dd.numValue1) * 100).toFixed(1);
          explanation += ` Das ist ein Unterschied von ${pct > 0 ? '+' : ''}${pct}%.`;
        }

        missing.push({
          category: label,
          section: dd.section1 || dd.section2 || '',
          contract1: v1,
          contract2: v2,
          severity: dd.diffType === 'numeric' ? 'medium' : 'low',
          explanation,
          impact: `Unterschiedliche Werte bei ${dd.key} beeinflussen Rechte und Pflichten.`,
          recommendation: `Prüfen Sie den Unterschied bei ${dd.key} und verhandeln Sie ggf. bessere Konditionen.`,
          clauseArea: dd.area,
          semanticType: dd.diffType === 'only_in_1' || dd.diffType === 'only_in_2' ? 'missing' : 'different_scope',
          financialImpact: dd.unit === 'EUR' && dd.numValue1 && dd.numValue2 ? `Differenz: ${Math.abs(dd.numValue1 - dd.numValue2).toLocaleString('de-DE')} EUR` : null,
          marketContext: null,
          _autoDetected: true,
          _fromDeterministic: true,
        });
      }
    }
  }

  return missing;
}

// ============================================
// Phase B: Validation
// ============================================

function validatePhaseBResponse(raw) {
  const result = { ...raw };

  // groupEvaluations (new format) — pass through, validate keys
  if (typeof result.groupEvaluations === 'object' && result.groupEvaluations !== null && !Array.isArray(result.groupEvaluations)) {
    for (const [key, ev] of Object.entries(result.groupEvaluations)) {
      if (typeof ev !== 'object' || ev === null) {
        result.groupEvaluations[key] = {};
        continue;
      }
      result.groupEvaluations[key] = {
        severity: VALID_SEVERITIES.includes(ev.severity) ? ev.severity : null,
        explanation: typeof ev.explanation === 'string' ? ev.explanation : null,
        impact: typeof ev.impact === 'string' ? ev.impact : null,
        recommendation: typeof ev.recommendation === 'string' ? ev.recommendation : null,
        semanticType: VALID_SEMANTIC_TYPES.includes(ev.semanticType) ? ev.semanticType : null,
        financialImpact: typeof ev.financialImpact === 'string' ? ev.financialImpact : null,
        marketContext: typeof ev.marketContext === 'string' ? ev.marketContext : null,
      };
    }
  } else {
    result.groupEvaluations = {};
  }

  // additionalDifferences (new format) — validate like old differences
  const additionalRaw = Array.isArray(result.additionalDifferences) ? result.additionalDifferences : [];
  result.additionalDifferences = additionalRaw.slice(0, 10).map(d => ({
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

  // differences (legacy/fallback — GPT may still produce this)
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

  // Fallback: Generate risks from differences if GPT returned none
  if (result.risks.length === 0 && Array.isArray(result.differences) && result.differences.length > 0) {
    // First try high/critical, then fall back to medium
    let riskDiffs = result.differences.filter(d => d.severity === 'high' || d.severity === 'critical');
    if (riskDiffs.length === 0) {
      riskDiffs = result.differences.filter(d => d.severity === 'medium');
    }
    // Last resort: use ALL differences
    if (riskDiffs.length === 0) {
      riskDiffs = result.differences.slice(0, 3);
    }
    result.risks = riskDiffs.map(d => ({
      clauseArea: VALID_CLAUSE_AREAS.includes(d.clauseArea) ? d.clauseArea : inferClauseAreaFromCategory(d.category),
      riskType: d.semanticType === 'missing' ? 'missing_protection' : d.severity === 'critical' ? 'unfair_clause' : 'legal_risk',
      severity: d.severity || 'medium',
      contract: 'both',
      title: d.category || d.section || 'Risiko',
      description: d.explanation || d.impact || 'Unterschied zwischen den Verträgen erfordert Aufmerksamkeit.',
      legalBasis: extractLegalBasis(d.impact) || null,
      financialExposure: d.financialImpact || null,
    }));
    console.log(`⚠️ Risks Fallback: ${result.risks.length} Risiken aus Unterschieden generiert (aus ${result.differences.length} Diffs)`);
  }

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

  // Fallback: Generate recommendations from differences if GPT returned none
  if (result.recommendations.length === 0 && Array.isArray(result.differences) && result.differences.length > 0) {
    const notRecommended = result.overallRecommendation?.recommended === 1 ? 2 : 1;
    // Try differences with recommendation text first
    let recDiffs = result.differences.filter(d => d.recommendation && d.recommendation.length > 5);
    // Fall back to high/critical differences
    if (recDiffs.length === 0) {
      recDiffs = result.differences.filter(d => d.severity === 'high' || d.severity === 'critical');
    }
    // Last resort: use top differences
    if (recDiffs.length === 0) {
      recDiffs = result.differences.slice(0, 3);
    }
    result.recommendations = recDiffs.slice(0, 5).map(d => ({
      clauseArea: VALID_CLAUSE_AREAS.includes(d.clauseArea) ? d.clauseArea : inferClauseAreaFromCategory(d.category),
      targetContract: notRecommended,
      priority: d.severity === 'critical' ? 'critical' : d.severity === 'high' ? 'high' : 'medium',
      title: d.category || d.section || 'Verbesserungsvorschlag',
      reason: d.explanation || d.impact || 'Dieser Unterschied sollte bei Verhandlungen berücksichtigt werden.',
      currentText: d.contract1 || d.contract2 || '',
      suggestedText: d.recommendation || d.impact || 'Klausel sollte nachverhandelt werden.',
    }));
    console.log(`⚠️ Recommendations Fallback: ${result.recommendations.length} Empfehlungen aus Unterschieden generiert (aus ${result.differences.length} Diffs)`);
  }

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

/**
 * Post-merge score enforcement: ensures minimum score gap based on actual differences.
 * Called AFTER mergeDifferences in the pipeline, so it sees the final diff set.
 */
function enforceScoreDifferentiation(result) {
  if (!result.scores?.contract1 || !result.scores?.contract2) return result;
  if (!result.differences || result.differences.length === 0) return result;

  const s1 = result.scores.contract1;
  const s2 = result.scores.contract2;
  const gap = Math.abs(s1.overall - s2.overall);
  const recommended = result.overallRecommendation?.recommended;

  // Count severity impact per contract
  // A diff "against" a contract = that contract has a worse value
  let sevImpact1 = 0, sevImpact2 = 0;
  const SEVERITY_WEIGHT = { critical: 4, high: 2, medium: 1, low: 0 };
  for (const diff of result.differences) {
    const w = SEVERITY_WEIGHT[diff.severity] || 0;
    if (w === 0) continue;
    // "missing" + contract2 = "Keine Regelung" → disadvantage for contract 2
    const c1Text = (diff.contract1 || '').toLowerCase();
    const c2Text = (diff.contract2 || '').toLowerCase();
    const c1Missing = c1Text.includes('keine regelung');
    const c2Missing = c2Text.includes('keine regelung');
    if (c1Missing && !c2Missing) sevImpact1 += w;
    else if (c2Missing && !c1Missing) sevImpact2 += w;
    else {
      // Both have values — the "weaker" or "worse" one gets the impact
      // Use semanticType if available
      if (diff.semanticType === 'weaker') sevImpact1 += w; // contract 1 is weaker
      else if (diff.semanticType === 'stronger') sevImpact2 += w; // contract 2 is stronger (disadvantage to c2 if from c1 perspective... actually this is ambiguous)
      else {
        // For matched diffs, both contracts are just different — assign to the one recommended AGAINST
        if (recommended === 1) sevImpact2 += w * 0.5;
        else if (recommended === 2) sevImpact1 += w * 0.5;
      }
    }
  }

  const totalImpact = sevImpact1 + sevImpact2;
  const MIN_GAP = 12;

  console.log(`📊 Score-Enforcement: Gap=${gap}, sevImpact1=${sevImpact1.toFixed(1)}, sevImpact2=${sevImpact2.toFixed(1)}, recommended=${recommended}`);

  if (recommended && gap < MIN_GAP && totalImpact > 0) {
    const winner = recommended;
    const loser = winner === 1 ? 2 : 1;
    const winnerScores = winner === 1 ? s1 : s2;
    const loserScores = loser === 1 ? s1 : s2;

    // Enforce minimum gap: lower the loser's score
    if (winnerScores.overall - loserScores.overall < MIN_GAP) {
      const targetLoser = Math.max(40, winnerScores.overall - MIN_GAP);
      const oldLoser = loserScores.overall;
      loserScores.overall = Math.min(loserScores.overall, targetLoser);

      // Also adjust category scores proportionally
      if (oldLoser > 0 && loserScores.overall < oldLoser) {
        const ratio = loserScores.overall / oldLoser;
        for (const cat of ['fairness', 'riskProtection', 'flexibility', 'completeness', 'clarity']) {
          loserScores[cat] = Math.round(Math.max(30, loserScores[cat] * ratio));
        }
      }

      console.log(`📊 Score-Enforcement: Vertrag ${loser} Score ${oldLoser} → ${loserScores.overall} (Gap: ${gap} → ${winnerScores.overall - loserScores.overall})`);
    }
  }

  // Sync overall with contract analysis score
  if (result.contract1Analysis) result.contract1Analysis.score = s1.overall;
  if (result.contract2Analysis) result.contract2Analysis.score = s2.overall;

  return result;
}

/**
 * V3.1: Deterministic post-dedup — catches duplicates that GPT's relevance filter missed.
 * Removes diffs that share the same key numbers or have very similar contract text.
 */
function deduplicateByContent(diffs) {
  if (diffs.length <= 1) return diffs;

  const kept = [];
  const seenNumbers = new Set();
  const seenTextKeys = new Set();

  for (const diff of diffs) {
    // Extract all numbers from contract1 + contract2 text
    const allText = `${diff.contract1 || ''} ${diff.contract2 || ''}`;
    const numbers = allText.match(/[\d]+[.,]?\d*\s*[%€]/g) || [];
    const numKey = numbers.sort().join('|');

    // Check for numeric duplicate: same set of key numbers in same clauseArea
    if (numKey && numKey.length > 2) {
      const areaNumKey = `${diff.clauseArea}:${numKey}`;
      if (seenNumbers.has(areaNumKey)) {
        console.log(`🔍 Post-Dedup: Entferne numerisches Duplikat in ${diff.clauseArea}: "${diff.section || diff.category}"`);
        continue;
      }
      seenNumbers.add(areaNumKey);
    }

    // Check for text duplicate: very similar contract1+contract2 across different categories
    const textKey = allText.replace(/\s+/g, ' ').trim().substring(0, 100).toLowerCase();
    if (textKey.length > 20) {
      // Check similarity against already-seen texts
      let isDuplicate = false;
      for (const seen of seenTextKeys) {
        if (textSimilarity(textKey, seen) > 0.8) {
          console.log(`🔍 Post-Dedup: Entferne Text-Duplikat: "${diff.section || diff.category}"`);
          isDuplicate = true;
          break;
        }
      }
      if (isDuplicate) continue;
      seenTextKeys.add(textKey);
    }

    kept.push(diff);
  }

  if (kept.length < diffs.length) {
    console.log(`🔍 Post-Dedup: ${diffs.length - kept.length} Duplikate entfernt, ${kept.length} verbleiben`);
  }
  return kept;
}

/** Simple character-level similarity for dedup (Jaccard on character trigrams) */
function textSimilarity(a, b) {
  const trigrams = (s) => {
    const t = new Set();
    for (let i = 0; i <= s.length - 3; i++) t.add(s.substring(i, i + 3));
    return t;
  };
  const ta = trigrams(a);
  const tb = trigrams(b);
  let intersection = 0;
  for (const t of ta) { if (tb.has(t)) intersection++; }
  const union = ta.size + tb.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/**
 * V3.1: Integrate benchmark results into scores.
 * If benchmarks clearly show one contract is financially better,
 * adjust overall scores + recommendation to avoid contradicting the benchmark.
 */
function applyBenchmarkScoreAdjustment(result, benchmarks) {
  if (!benchmarks || benchmarks.length === 0) return;
  if (!result.scores?.contract1 || !result.scores?.contract2) return;

  // Count wins per contract
  let wins1 = 0, wins2 = 0, ties = 0;
  for (const b of benchmarks) {
    const r1 = b.contract1?.assessment?.rating;
    const r2 = b.contract2?.assessment?.rating;
    if (!r1 && !r2) continue;

    // "above" = better than market, "below" = worse than market
    if (r1 === 'above' && r2 !== 'above') wins1++;
    else if (r2 === 'above' && r1 !== 'above') wins2++;
    else if (r1 === 'above' && r2 === 'above') ties++;
    else if (r1 === 'standard' && r2 === 'below') wins1++;
    else if (r2 === 'standard' && r1 === 'below') wins2++;
    else ties++;
  }

  const totalRated = wins1 + wins2 + ties;
  if (totalRated === 0) return;

  console.log(`📊 Benchmark-Score: V1 gewinnt ${wins1}, V2 gewinnt ${wins2}, ${ties} gleich (von ${totalRated} Metriken)`);

  // Only adjust if there's a clear benchmark winner (at least 2 more wins)
  const benchmarkAdvantage = Math.abs(wins1 - wins2);
  if (benchmarkAdvantage < 2) {
    console.log(`📊 Benchmark-Score: Kein klarer Gewinner — keine Score-Anpassung`);
    return;
  }

  const benchmarkWinner = wins1 > wins2 ? 1 : 2;
  const s1 = result.scores.contract1;
  const s2 = result.scores.contract2;
  const currentWinner = s1.overall >= s2.overall ? 1 : 2;

  if (benchmarkWinner !== currentWinner) {
    // Score contradicts benchmark — MUST flip so user gets consistent signals
    const winnerScores = benchmarkWinner === 1 ? s1 : s2;
    const loserScores = benchmarkWinner === 1 ? s2 : s1;

    // Calculate how much we need to swing to put benchmark winner ahead by 6+ points
    const currentGap = loserScores.overall - winnerScores.overall; // positive = wrong direction
    const neededSwing = currentGap + 6; // ensure winner is 6pts ahead after adjustment
    const winnerBonus = Math.min(Math.ceil(neededSwing / 2), 20); // cap individual adjustment at 20
    const loserPenalty = Math.min(Math.floor(neededSwing / 2), 20);

    console.log(`📊 Benchmark-Score: WIDERSPRUCH — Score sagt V${currentWinner}, Benchmark sagt V${benchmarkWinner}. Gap=${currentGap}, Swing=${neededSwing} (±${winnerBonus}/${loserPenalty}).`);

    winnerScores.overall = Math.min(92, winnerScores.overall + winnerBonus);
    loserScores.overall = Math.max(40, loserScores.overall - loserPenalty);

    // Adjust fairness/riskProtection (most financial-relevant sub-scores)
    const subBonus = Math.min(benchmarkAdvantage * 4, 16);
    winnerScores.fairness = Math.min(92, winnerScores.fairness + subBonus);
    winnerScores.riskProtection = Math.min(92, winnerScores.riskProtection + Math.ceil(subBonus / 2));
    loserScores.fairness = Math.max(35, loserScores.fairness - subBonus);
    loserScores.riskProtection = Math.max(35, loserScores.riskProtection - Math.ceil(subBonus / 2));

    // Flip recommendation if needed + update reasoning text
    if (result.overallRecommendation?.recommended !== benchmarkWinner) {
      const oldRec = result.overallRecommendation.recommended;
      console.log(`📊 Benchmark-Score: Empfehlung V${oldRec} → V${benchmarkWinner}`);
      result.overallRecommendation.recommended = benchmarkWinner;

      // Build concrete reasoning from benchmark wins
      const winReasons = benchmarks
        .filter(b => {
          const r1 = b.contract1?.assessment?.rating;
          const r2 = b.contract2?.assessment?.rating;
          return benchmarkWinner === 1
            ? (r1 === 'above' && r2 !== 'above') || (r1 === 'standard' && r2 === 'below')
            : (r2 === 'above' && r1 !== 'above') || (r2 === 'standard' && r1 === 'below');
        })
        .map(b => {
          const wVal = benchmarkWinner === 1 ? b.contract1?.value : b.contract2?.value;
          const lVal = benchmarkWinner === 1 ? b.contract2?.value : b.contract1?.value;
          return `${b.label}: ${wVal}${b.unit} vs ${lVal}${b.unit}`;
        });

      result.overallRecommendation.reasoning = `Vertrag ${benchmarkWinner} hat deutlich bessere Marktkonditionen (${winReasons.join(', ')}). ${result.overallRecommendation.reasoning || ''}`.trim();

      // Also fix summary/verdict to not contradict the recommendation
      const loserNum = benchmarkWinner === 1 ? 2 : 1;
      if (result.summary?.verdict) {
        // Replace "Vertrag X ist besser" if it names the wrong contract
        result.summary.verdict = result.summary.verdict
          .replace(new RegExp(`Vertrag ${loserNum} ist (klar )?besser`, 'gi'), `Vertrag ${benchmarkWinner} ist besser`)
          .replace(new RegExp(`Vertrag ${loserNum} ist insgesamt`, 'gi'), `Vertrag ${benchmarkWinner} ist insgesamt`);
      }
    }
  } else {
    // Score already aligns with benchmark — reinforce with fairness boost
    const reinforceBonus = Math.min(benchmarkAdvantage * 3, 10);
    console.log(`📊 Benchmark-Score: Score und Benchmark stimmen überein (V${benchmarkWinner}). Verstärke Fairness um ${reinforceBonus}.`);

    const winnerScores = benchmarkWinner === 1 ? s1 : s2;
    winnerScores.fairness = Math.min(92, winnerScores.fairness + reinforceBonus);
  }

  // Sync with contract analysis
  if (result.contract1Analysis) result.contract1Analysis.score = s1.overall;
  if (result.contract2Analysis) result.contract2Analysis.score = s2.overall;
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

function extractLegalBasis(text) {
  if (!text || typeof text !== 'string') return null;
  const match = text.match(/§§?\s*\d+[a-z]?\s*(?:(?:Abs\.?\s*\d+)?(?:\s*(?:S\.|Satz)\s*\d+)?)\s*(?:BGB|HGB|GewO|DSGVO|UWG|AGB|StGB|ZPO|InsO|UStG|EStG)/);
  return match ? match[0].trim() : null;
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

// ============================================
// Gap Detection: Programmatic Post-Processing
// ============================================
// Detects differences that Phase B missed by comparing Phase A maps.
// Two cases: (1) Clause area exists in one contract only → "missing"
//            (2) Clause area in both but not in differences → compare keyValues

const AREA_LABELS = {
  payment: 'Vergütung/Zahlung', liability: 'Haftung', warranty: 'Gewährleistung',
  termination: 'Kündigung', confidentiality: 'Geheimhaltung',
  ip_rights: 'Nutzungsrechte/IP', non_compete: 'Wettbewerbsverbot',
  duration: 'Vertragslaufzeit', data_protection: 'Datenschutz',
  force_majeure: 'Höhere Gewalt',
};

const MISSING_SEVERITY = {
  non_compete: 'medium', warranty: 'medium', liability: 'high',
  data_protection: 'medium', force_majeure: 'low', payment: 'high',
  confidentiality: 'medium', termination: 'medium', duration: 'medium',
  ip_rights: 'medium',
};

// Synonym groups for cross-contract key matching.
// Keys within the same group refer to the same concept but may use different terminology.
const KEY_SYNONYM_GROUPS = [
  // Factoring
  ['flatrate', 'servicegebühr', 'factoringgebühr', 'limitprüfung', 'limitprüfungsgebühr', 'pauschale', 'factoringentgelt'],
  ['ankauflimit', 'forderungslimit', 'ankaufgrenze', 'höchstbetrag', 'kreditlimit', 'factoringlimit'],
  ['sicherungseinbehalt', 'einbehalt', 'sicherheitseinbehalt', 'reservierung', 'sicherheit'],
  ['selbstbehalt', 'eigenrisiko', 'delkredere', 'ausfallrisiko'],
  ['zinssatz', 'zins', 'vorfinanzierungszins', 'finanzierungszins', 'basiszins'],
  // Mietvertrag
  ['kaution', 'mietkaution', 'sicherheitsleistung', 'mietsicherheit'],
  ['miete', 'grundmiete', 'kaltmiete', 'nettomiete', 'nettokaltmiete', 'monatsmiete'],
  ['nebenkosten', 'betriebskosten', 'nebenkostenvorauszahlung', 'vorauszahlung'],
  ['gesamtmiete', 'warmmiete', 'bruttomiete', 'bruttowarmmiete'],
  // Allgemein
  ['kündigungsfrist', 'kündigungszeitraum', 'frist zur kündigung', 'frist'],
  ['laufzeit', 'vertragsdauer', 'mindestlaufzeit', 'erstlaufzeit', 'grundlaufzeit', 'vertragslaufzeit'],
  ['haftung', 'haftungsbegrenzung', 'haftungsobergrenze', 'haftungslimit', 'haftungsbeschränkung', 'haftungsgrenze'],
  ['vertragsstrafe', 'konventionalstrafe', 'pönale', 'vertragsbuße'],
  ['zahlungsfrist', 'zahlungsziel', 'fälligkeit', 'zahlungsbedingung'],
  ['verlängerung', 'automatische verlängerung', 'verlängerungszeitraum', 'verlängerungsdauer'],
  ['probezeit', 'testphase', 'testperiode', 'trial'],
];

// Areas that overlap conceptually — if one is covered, skip the other
const RELATED_AREAS = {
  duration: ['termination'],
  termination: ['duration'],
};

function detectGaps(map1, map2, existingDifferences, docConfig) {
  const coveredAreas = new Set(existingDifferences.map(d => d.clauseArea));
  // Also consider areas covered by related areas
  const effectivelyCovered = new Set(coveredAreas);
  for (const area of coveredAreas) {
    const related = RELATED_AREAS[area] || [];
    related.forEach(r => effectivelyCovered.add(r));
  }

  const gaps = [];
  const skipAreas = new Set(docConfig?.compareSkipAreas || ['parties', 'subject', 'jurisdiction', 'other']);

  // Build area → clauses maps
  const areasMap1 = {};
  const areasMap2 = {};
  for (const c of (map1.clauses || [])) {
    if (!areasMap1[c.area]) areasMap1[c.area] = [];
    areasMap1[c.area].push(c);
  }
  for (const c of (map2.clauses || [])) {
    if (!areasMap2[c.area]) areasMap2[c.area] = [];
    areasMap2[c.area].push(c);
  }

  const allAreas = new Set([...Object.keys(areasMap1), ...Object.keys(areasMap2)]);

  console.log(`🔍 Gap Detection: Areas V1=[${Object.keys(areasMap1).join(', ')}], V2=[${Object.keys(areasMap2).join(', ')}]`);
  console.log(`🔍 Gap Detection: Covered by Phase B=[${[...coveredAreas].join(', ')}]`);

  for (const area of allAreas) {
    if (effectivelyCovered.has(area) || skipAreas.has(area)) continue;
    console.log(`🔍 Gap Detection: Prüfe "${area}" (V1: ${(areasMap1[area] || []).length} Klauseln, V2: ${(areasMap2[area] || []).length} Klauseln)`);

    const c1 = areasMap1[area] || [];
    const c2 = areasMap2[area] || [];

    // Case 1: Area only in one contract → missing clause
    if (c1.length > 0 && c2.length === 0) {
      gaps.push(buildMissingDiff(area, c1[0], 1, docConfig));
    } else if (c2.length > 0 && c1.length === 0) {
      gaps.push(buildMissingDiff(area, c2[0], 2, docConfig));
    } else if (c1.length > 0 && c2.length > 0) {
      // Case 2: Both have the area → compare keyValues
      const kvGap = compareClauseKeyValues(c1, c2, area);
      if (kvGap) gaps.push(kvGap);
    }
  }

  if (gaps.length > 0) {
    console.log(`🔍 Gap Detection: ${gaps.length} zusätzliche Unterschiede aus Phase-A-Maps erkannt`);
    gaps.forEach(g => console.log(`   → ${g.clauseArea}: ${g.semanticType} (${g.severity})`));
  }

  return gaps;
}

function buildMissingDiff(area, existingClause, existsInContract, docConfig) {
  const label = AREA_LABELS[area] || area;
  const section = existingClause.section || '';
  const summary = existingClause.summary || existingClause.originalText || '';
  const otherContract = existsInContract === 1 ? 2 : 1;
  const docLabel = docConfig?.labels?.documentName || 'Vertrag';
  const missingText = docConfig?.category === 'angebot' ? 'Nicht im Angebot enthalten' :
                      docConfig?.category === 'allgemein' ? 'Nicht enthalten' : 'Keine Regelung vorhanden';

  return {
    category: label,
    section,
    contract1: existsInContract === 1 ? summary : missingText,
    contract2: existsInContract === 2 ? summary : missingText,
    severity: MISSING_SEVERITY[area] || 'medium',
    explanation: `${docLabel} ${existsInContract} enthält eine Regelung zu ${label} (${section}), die in ${docLabel} ${otherContract} fehlt.`,
    impact: docConfig?.category === 'vertrag' || !docConfig?.category
      ? `Fehlende ${label}-Klausel — es gelten nur gesetzliche Regelungen, die möglicherweise nicht ausreichend schützen.`
      : `${label} ist nur in ${docLabel} ${existsInContract} vorhanden.`,
    recommendation: `${label} sollte in ${docLabel} ${otherContract} ergänzt werden.`,
    clauseArea: area,
    semanticType: 'missing',
    financialImpact: null,
    marketContext: null,
    _autoDetected: true,
  };
}

function compareClauseKeyValues(clauses1, clauses2, area) {
  // Collect all keyValues from both sides
  const kv1 = {};
  const kv2 = {};
  for (const c of clauses1) {
    if (c.keyValues && typeof c.keyValues === 'object') Object.assign(kv1, c.keyValues);
  }
  for (const c of clauses2) {
    if (c.keyValues && typeof c.keyValues === 'object') Object.assign(kv2, c.keyValues);
  }

  // Normalize and match keys
  const normalize = (k) => k.toLowerCase().replace(/[^a-zäöüß0-9]/g, '');
  const keys1 = Object.entries(kv1).map(([k, v]) => ({ key: k, norm: normalize(k), value: v }));
  const keys2 = Object.entries(kv2).map(([k, v]) => ({ key: k, norm: normalize(k), value: v }));

  const diffs = [];
  const matched2 = new Set();

  for (const entry1 of keys1) {
    // Find best matching key in contract 2
    let bestMatch = null;
    for (const entry2 of keys2) {
      if (matched2.has(entry2.key)) continue;
      if (entry1.norm === entry2.norm || entry1.norm.includes(entry2.norm) || entry2.norm.includes(entry1.norm)) {
        bestMatch = entry2;
        break;
      }
    }
    if (!bestMatch) continue;
    matched2.add(bestMatch.key);

    // Compare values
    const v1 = String(entry1.value).trim();
    const v2 = String(bestMatch.value).trim();
    if (v1 === v2) continue;

    // Extract numbers for meaningful comparison
    const num1 = extractNumber(v1);
    const num2 = extractNumber(v2);
    if (num1 !== null && num2 !== null && num1 !== num2) {
      diffs.push({ key: entry1.key, v1, v2, numDiff: true });
    } else if (v1.toLowerCase() !== v2.toLowerCase()) {
      diffs.push({ key: entry1.key, v1, v2, numDiff: false });
    }
  }

  if (diffs.length > 0) {
    const label = AREA_LABELS[area] || area;
    const diffTexts = diffs.map(d => `${d.key}: "${d.v1}" vs "${d.v2}"`);
    const severity = diffs.some(d => d.numDiff) ? 'medium' : 'low';

    return {
      category: label,
      section: clauses1[0]?.section || clauses2[0]?.section || '',
      contract1: diffs.map(d => `${d.key}: ${d.v1}`).join('; '),
      contract2: diffs.map(d => `${d.key}: ${d.v2}`).join('; '),
      severity,
      explanation: `Die ${label}-Regelungen unterscheiden sich in konkreten Werten: ${diffTexts.join(', ')}. Diese Unterschiede können wirtschaftliche Auswirkungen haben.`,
      impact: `Unterschiedliche Werte bei ${label} beeinflussen Rechte und Pflichten beider Parteien.`,
      recommendation: `Vergleichen Sie die ${label}-Werte und verhandeln Sie ggf. bessere Konditionen.`,
      clauseArea: area,
      semanticType: 'different_scope',
      financialImpact: null,
      marketContext: null,
      _autoDetected: true,
    };
  }

  // Fallback: Compare clause summaries/originalText for meaningful differences
  return compareSummariesFallback(clauses1, clauses2, area);
}

// Summary-based fallback: detects negation differences and number differences in clause text
function compareSummariesFallback(clauses1, clauses2, area) {
  const text1 = clauses1.map(c => `${c.summary || ''} ${c.originalText || ''}`).join(' ').trim();
  const text2 = clauses2.map(c => `${c.summary || ''} ${c.originalText || ''}`).join(' ').trim();

  if (!text1 || !text2 || text1.length < 10 || text2.length < 10) return null;

  // Check 1: Negation pattern — one clause says "nicht/kein" the other is affirmative
  const negationPattern = /\b(nicht vereinbart|kein(?:e[rnsm]?)?\s+\w+|wird nicht|ohne\s+\w+|ausgeschlossen|untersagt|entfällt)\b/i;
  const hasNegation1 = negationPattern.test(text1);
  const hasNegation2 = negationPattern.test(text2);
  const negationDiffers = hasNegation1 !== hasNegation2;

  // Check 2: Different numbers in text (e.g., "12 Monate" vs "6 Monate")
  const nums1 = extractAllNumbers(text1);
  const nums2 = extractAllNumbers(text2);
  const numsDiffer = !arraysEqual(nums1, nums2) && (nums1.length > 0 || nums2.length > 0);

  if (!negationDiffers && !numsDiffer) return null;

  const label = AREA_LABELS[area] || area;
  const summary1 = clauses1[0]?.summary || text1.substring(0, 200);
  const summary2 = clauses2[0]?.summary || text2.substring(0, 200);

  let explanation, semanticType, severity;
  if (negationDiffers) {
    const hasIt = hasNegation1 ? 2 : 1;
    explanation = `Vertrag ${hasIt} enthält eine aktive ${label}-Regelung, während der andere Vertrag dies ausdrücklich ausschließt oder nicht regelt. Das ist ein grundlegender Unterschied mit erheblichen Auswirkungen.`;
    semanticType = 'conflicting';
    severity = 'medium';
  } else {
    const numText = nums1.length > 0 && nums2.length > 0
      ? ` (${nums1.join(', ')} vs ${nums2.join(', ')})`
      : '';
    explanation = `Die ${label}-Regelungen unterscheiden sich in konkreten Werten${numText}. Prüfen Sie, welche Variante für Sie günstiger ist.`;
    semanticType = 'different_scope';
    severity = 'medium';
  }

  return {
    category: label,
    section: clauses1[0]?.section || clauses2[0]?.section || '',
    contract1: summary1,
    contract2: summary2,
    severity,
    explanation,
    impact: `Unterschiedliche ${label}-Regelungen können wirtschaftliche und rechtliche Auswirkungen haben.`,
    recommendation: `Vergleichen Sie die ${label}-Bestimmungen beider Verträge sorgfältig.`,
    clauseArea: area,
    semanticType,
    financialImpact: null,
    marketContext: null,
    _autoDetected: true,
  };
}

function extractNumber(str) {
  if (typeof str !== 'string') return null;
  const match = str.match(/(\d+[\.,]?\d*)/);
  return match ? parseFloat(match[1].replace(',', '.')) : null;
}

function extractAllNumbers(text) {
  const matches = text.match(/\d+[\.,]?\d*/g) || [];
  return matches.map(m => parseFloat(m.replace(',', '.'))).sort((a, b) => a - b);
}

function arraysEqual(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
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
// SCHICHT 3: Klausel-für-Klausel-Vergleich (NEU)
// Jedes Klauselpaar bekommt eigenen fokussierten GPT-Call
// ============================================

/**
 * Truncate long clauses keeping beginning + end for context.
 */
function smartTruncateClause(text, maxLen = MAX_CLAUSE_TEXT_LENGTH) {
  if (!text || text.length <= maxLen) return text;
  const beginLen = Math.floor(maxLen * 0.7);
  const endLen = Math.floor(maxLen * 0.2);
  return text.substring(0, beginLen) + '\n[...]\n' + text.substring(text.length - endLen);
}

/**
 * Prioritize clause pairs: similar > related > potential. Skip equivalent.
 */
function prioritizeClausePairs(matches, docConfig) {
  if (!matches || !Array.isArray(matches)) return [];
  // Areas that produce noise, not real contractual differences (template placeholders, boilerplate)
  const skipAreas = new Set(docConfig?.compareSkipAreas || ['parties', 'subject', 'jurisdiction', 'other']);
  const priority = { similar: 0, related: 1, potential: 2 };
  return matches
    .filter(m => m.type !== 'equivalent') // Skip equivalent (≥92%) — no meaningful diff
    .filter(m => !skipAreas.has(m.area))   // Skip noise areas (parties, subject, etc.)
    .sort((a, b) => (priority[a.type] ?? 3) - (priority[b.type] ?? 3))
    .slice(0, MAX_CLAUSE_PAIRS);
}

/**
 * Build prompt for a single clause pair comparison.
 */
function buildClausePairPrompt(clause1, clause2, match, perspective, comparisonMode, userProfile, docConfig) {
  const profileHint = SYSTEM_PROMPTS[userProfile] || SYSTEM_PROMPTS.individual;
  const perspectiveBlock = buildPerspectiveBlock(perspective, docConfig);
  const modeBlock = buildModeAddition(comparisonMode);
  const docTypeBlock = docConfig?.promptAddition ? `\n${docConfig.promptAddition}\n` : '';

  const text1 = smartTruncateClause(clause1.originalText);
  const text2 = smartTruncateClause(clause2.originalText);

  const kv1 = clause1.keyValues && Object.keys(clause1.keyValues).length > 0
    ? `\nKeyValues V1: ${JSON.stringify(clause1.keyValues)}` : '';
  const kv2 = clause2.keyValues && Object.keys(clause2.keyValues).length > 0
    ? `\nKeyValues V2: ${JSON.stringify(clause2.keyValues)}` : '';

  return {
    system: `Du bist ein erfahrener Vertragsanwalt. Du vergleichst EINE Klausel aus zwei Verträgen WORT FÜR WORT.
${profileHint}
${perspectiveBlock}
${modeBlock}
${docTypeBlock}

METHODE — wie ein Anwalt liest:
1. WÖRTLICHE ABWEICHUNGEN: "kann" vs "muss", "ausgeschlossen" vs "begrenzt"
2. UMFANG-UNTERSCHIEDE: Was deckt eine Klausel ab, die andere nicht?
3. FEHLENDE QUALIFIKATIONEN: Bedingungen, Ausnahmen, Einschränkungen
4. UNTERSCHIEDLICHE BEDINGUNGEN: Fristen, Schwellenwerte, Auslöser
5. PFLICHTEN vs RECHTE: Wer muss was tun? Wer darf was?

Antworte NUR mit validem JSON.`,

    user: `KLAUSEL-VERGLEICH: "${clause1.title}" (${clause1.area})
Match-Typ: ${match.type} (Ähnlichkeit: ${Math.round((match.similarity || 0) * 100)}%)

${docConfig?.labels?.documentName || 'VERTRAG'} 1 — ${clause1.section || clause1.id}:
"""
${text1}
"""${kv1}

${docConfig?.labels?.documentName || 'VERTRAG'} 2 — ${clause2.section || clause2.id}:
"""
${text2}
"""${kv2}

Finde ALLE Unterschiede. Antworte mit JSON:
{
  "differences": [
    {
      "type": "wording|scope|qualifier|condition|obligation|right|limit",
      "severity": "low|medium|high|critical",
      "semanticType": "conflicting|weaker|stronger|different_scope",
      "detail1": "Exaktes Zitat aus ${docConfig?.labels?.documentName || 'Vertrag'} 1 (min. 10 Zeichen)",
      "detail2": "Exaktes Zitat aus ${docConfig?.labels?.documentName || 'Vertrag'} 2 (min. 10 Zeichen)",
      "explanation": "2-3 Sätze für den Mandanten",
      "impact": "Juristische Einordnung",
      "recommendation": "Konkrete Aktion",
      "financialImpact": null,
      "legalBasis": null
    }
  ],
  "overallAssessment": "1 Satz Zusammenfassung"
}

KRITISCHE REGELN:
- detail1 und detail2 MÜSSEN echte Zitate aus dem jeweiligen Klauseltext sein. NIEMALS "Nicht vorhanden", "Keine Regelung", "N/A" oder Platzhalter verwenden.
- Wenn ein Aspekt nur in EINER Klausel vorkommt, zitiere den relevanten Text als detail1/detail2 und beschreibe den Unterschied in "explanation".
- Maximal 4 Unterschiede pro Klauselpaar — nur die WICHTIGSTEN.
- Wenn die Klauseln IDENTISCH sind, gib "differences": [] zurück.`
  };
}

/**
 * GPT-Call for a single clause pair.
 */
async function compareClausePair(clause1, clause2, match, perspective, comparisonMode, userProfile, docConfig) {
  // V2.2 Säule 3b: Clause-pair cache
  const pairHash = crypto.createHash('sha256')
    .update((clause1.originalText || '') + '||' + (clause2.originalText || ''))
    .digest('hex').substring(0, 16);
  const cached = getCached(clausePairCache, pairHash);
  if (cached) {
    console.log(`🔬 Schicht 3: Cache hit für "${clause1.title}" (${pairHash})`);
    return cached;
  }

  const prompt = buildClausePairPrompt(clause1, clause2, match, perspective, comparisonMode, userProfile, docConfig);

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: prompt.system },
        { role: 'user', content: prompt.user }
      ],
      temperature: 0.0, // V2.2 Säule 3a: T=0.0 für maximale Determinismus
      max_tokens: 3000,
      response_format: { type: 'json_object' },
    });

    const raw = JSON.parse(completion.choices[0].message.content);
    const result = validateClausePairResponse(raw, clause1, clause2, match);

    // V2.2 Säule 3b: Cache result
    setCache(clausePairCache, pairHash, result);
    return result;
  } catch (err) {
    console.warn(`⚠️ Schicht 3: Klauselpaar "${clause1.title}" fehlgeschlagen: ${err.message}`);
    return null;
  }
}

function validateClausePairResponse(raw, clause1, clause2, match) {
  const result = { differences: [], overallAssessment: '' };

  // Pattern for false "no regulation" claims — both clauses exist (matched pair), so "Keine Regelung" is wrong
  const FALSE_MISSING_PATTERN = /^(keine regelung|nicht geregelt|nicht vorhanden|fehlt|nicht enthalten|n\/a)\b/i;

  if (Array.isArray(raw.differences)) {
    result.differences = raw.differences.slice(0, 8)
      .filter(d => {
        // Filter false "Keine Regelung" — both clauses exist, so neither can be "missing"
        const d1 = (d.detail1 || '').trim();
        const d2 = (d.detail2 || '').trim();
        if (FALSE_MISSING_PATTERN.test(d1) || FALSE_MISSING_PATTERN.test(d2)) {
          console.log(`🧹 False-Missing gefiltert in Klauselpaar: "${clause1.title}" — "${d1}" / "${d2}"`);
          return false;
        }
        return true;
      })
      .map(d => ({
      type: ['wording', 'scope', 'qualifier', 'condition', 'obligation', 'right', 'limit'].includes(d.type) ? d.type : 'scope',
      severity: VALID_SEVERITIES.includes(d.severity) ? d.severity : 'medium',
      semanticType: VALID_SEMANTIC_TYPES.includes(d.semanticType) ? d.semanticType : 'different_scope',
      detail1: typeof d.detail1 === 'string' ? d.detail1 : '',
      detail2: typeof d.detail2 === 'string' ? d.detail2 : '',
      explanation: typeof d.explanation === 'string' ? d.explanation : '',
      impact: typeof d.impact === 'string' ? d.impact : '',
      recommendation: typeof d.recommendation === 'string' ? d.recommendation : '',
      financialImpact: typeof d.financialImpact === 'string' ? d.financialImpact : null,
      legalBasis: typeof d.legalBasis === 'string' ? d.legalBasis : null,
      _clauseArea: clause1.area,
      _clauseTitle: clause1.title,
      _matchType: match.type,
    }));
  }

  result.overallAssessment = typeof raw.overallAssessment === 'string' ? raw.overallAssessment : '';
  return result;
}

/**
 * Build prompt for missing clause assessment.
 */
function buildMissingClausePrompt(clause, inContract, perspective, comparisonMode, userProfile, docConfig = null) {
  const profileHint = SYSTEM_PROMPTS[userProfile] || SYSTEM_PROMPTS.individual;
  const perspectiveBlock = buildPerspectiveBlock(perspective, docConfig);
  const text = smartTruncateClause(clause.originalText, 2000);
  const otherContract = inContract === 1 ? 2 : 1;
  const docLabel = docConfig?.labels?.documentName || 'Vertrag';
  const docTypeHint = docConfig?.promptAddition ? `\n${docConfig.promptAddition}\n` : '';

  return {
    system: `Du bist ein erfahrener Vertragsanwalt. Bewerte einen Abschnitt der NUR in einem der beiden ${docLabel === 'Vertrag' ? 'Verträge' : docLabel + '-Dokumente'} existiert.
${profileHint}
${perspectiveBlock}${docTypeHint}
Antworte NUR mit validem JSON.`,

    user: `FEHLENDER ABSCHNITT: "${clause.title}" (${clause.area})
Dieser Abschnitt existiert NUR in ${docLabel} ${inContract}. ${docLabel} ${otherContract} hat KEINEN entsprechenden Abschnitt.

TEXT:
"""
${text}
"""

Bewerte: Wie wichtig ist dieser Abschnitt? Was bedeutet es, dass ${docLabel} ${otherContract} ihn nicht enthält?

{
  "severity": "low|medium|high|critical",
  "explanation": "3-4 Sätze: Was regelt der Abschnitt, warum fehlt er",
  "legalDefault": "§-Verweis wenn relevant, sonst null",
  "impact": "Konkreter Nachteil",
  "recommendation": "Was ergänzen",
  "financialImpact": null,
  "isStandardClause": true
}`
  };
}

/**
 * GPT-Call for a missing clause.
 */
async function assessMissingClause(clause, inContract, perspective, comparisonMode, userProfile, docConfig = null) {
  const prompt = buildMissingClausePrompt(clause, inContract, perspective, comparisonMode, userProfile, docConfig);

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: prompt.system },
        { role: 'user', content: prompt.user }
      ],
      temperature: 0.0, // V2.2 Säule 3a: T=0.0 für maximale Determinismus
      max_tokens: 1024,
      response_format: { type: 'json_object' },
    });

    const raw = JSON.parse(completion.choices[0].message.content);
    return validateMissingClauseResponse(raw, clause, inContract);
  } catch (err) {
    console.warn(`⚠️ Schicht 3: Fehlende Klausel "${clause.title}" fehlgeschlagen: ${err.message}`);
    return null;
  }
}

function validateMissingClauseResponse(raw, clause, inContract) {
  return {
    severity: VALID_SEVERITIES.includes(raw.severity) ? raw.severity : MISSING_SEVERITY[clause.area] || 'medium',
    explanation: typeof raw.explanation === 'string' ? raw.explanation : `Klausel "${clause.title}" fehlt.`,
    legalDefault: typeof raw.legalDefault === 'string' ? raw.legalDefault : null,
    impact: typeof raw.impact === 'string' ? raw.impact : '',
    recommendation: typeof raw.recommendation === 'string' ? raw.recommendation : '',
    financialImpact: typeof raw.financialImpact === 'string' ? raw.financialImpact : null,
    isStandardClause: raw.isStandardClause === true || raw.isStandardClause === false ? raw.isStandardClause : true,
    _clauseArea: clause.area,
    _clauseTitle: clause.title,
    _inContract: inContract,
  };
}

/**
 * Concurrency limiter for parallel GPT calls.
 */
async function withConcurrencyLimit(tasks, limit) {
  const results = [];
  const executing = new Set();

  for (const task of tasks) {
    const p = task().then(result => {
      executing.delete(p);
      return result;
    }).catch(err => {
      executing.delete(p);
      console.warn(`⚠️ Concurrent task failed: ${err.message}`);
      return null;
    });
    executing.add(p);
    results.push(p);

    if (executing.size >= limit) {
      await Promise.race(executing);
    }
  }

  return Promise.allSettled(results);
}

/**
 * Schicht 3 Orchestrator: Run clause-by-clause comparison in parallel.
 */
async function runClauseByClauseComparison(clauseMatchResult, map1, map2, perspective, comparisonMode, userProfile, onProgress, docConfig) {
  const progress = onProgress || (() => {});
  const startTime = Date.now();

  if (!clauseMatchResult) {
    console.log('⚠️ Schicht 3: Kein Clause-Match-Ergebnis — übersprungen');
    return { pairResults: [], missingResults: [] };
  }

  // Build clause lookup maps
  const clauseMap1 = {};
  const clauseMap2 = {};
  for (const c of (map1.clauses || [])) clauseMap1[c.id] = c;
  for (const c of (map2.clauses || [])) clauseMap2[c.id] = c;

  // Prioritize and limit clause pairs
  const pairs = prioritizeClausePairs(clauseMatchResult.matches || [], docConfig);
  console.log(`🔬 Schicht 3: ${pairs.length} Klauselpaare (von ${(clauseMatchResult.matches || []).length} gesamt, ${(clauseMatchResult.matches || []).filter(m => m.type === 'equivalent').length} equivalent übersprungen)`);

  // Build tasks for clause pairs
  const pairTasks = pairs.map(match => () => {
    const c1 = clauseMap1[match.clause1Id];
    const c2 = clauseMap2[match.clause2Id];
    if (!c1 || !c2) return Promise.resolve(null);
    return withTimeout(
      compareClausePair(c1, c2, match, perspective, comparisonMode, userProfile, docConfig),
      MAX_CLAUSE_CALL_TIME,
      `Klauselpaar ${c1.title}`
    ).catch(() => null);
  });

  // Build tasks for missing clauses (unmatched) — skip noise areas
  // V3: Also skip irrelevant areas from document type config
  const clauseSkipAreas = new Set(docConfig?.compareSkipAreas || ['parties', 'subject', 'jurisdiction', 'other']);
  if (docConfig?.irrelevantAreas) {
    for (const area of docConfig.irrelevantAreas) clauseSkipAreas.add(area);
  }
  const unmatched1 = (clauseMatchResult.unmatched1 || [])
    .filter(id => { const c = clauseMap1[id]; return c && !clauseSkipAreas.has(c.area); })
    .slice(0, MAX_MISSING_ASSESSMENTS);
  const unmatched2 = (clauseMatchResult.unmatched2 || [])
    .filter(id => { const c = clauseMap2[id]; return c && !clauseSkipAreas.has(c.area); })
    .slice(0, MAX_MISSING_ASSESSMENTS - unmatched1.length);

  const missingTasks = [
    ...unmatched1.map(clauseId => () => {
      const c = clauseMap1[clauseId];
      if (!c) return Promise.resolve(null);
      return withTimeout(
        assessMissingClause(c, 1, perspective, comparisonMode, userProfile, docConfig),
        MAX_CLAUSE_CALL_TIME,
        `Fehlende Klausel ${c.title}`
      ).catch(() => null);
    }),
    ...unmatched2.map(clauseId => () => {
      const c = clauseMap2[clauseId];
      if (!c) return Promise.resolve(null);
      return withTimeout(
        assessMissingClause(c, 2, perspective, comparisonMode, userProfile, docConfig),
        MAX_CLAUSE_CALL_TIME,
        `Fehlende Klausel ${c.title}`
      ).catch(() => null);
    }),
  ];

  console.log(`🔬 Schicht 3: Starte ${pairTasks.length} Paar-Calls + ${missingTasks.length} Fehlende-Calls (max ${MAX_CONCURRENT_CLAUSE_CALLS} parallel)`);
  progress('clause_comparison', 55, `Klausel-für-Klausel-Vergleich (${pairTasks.length} Paare)...`);

  // Run all tasks with concurrency limit
  const allTasks = [...pairTasks, ...missingTasks];
  const allResults = await withConcurrencyLimit(allTasks, MAX_CONCURRENT_CLAUSE_CALLS);

  const pairResults = allResults.slice(0, pairTasks.length)
    .map(r => r.status === 'fulfilled' ? r.value : null)
    .filter(r => r !== null && r.differences && r.differences.length > 0);

  const missingResults = allResults.slice(pairTasks.length)
    .map(r => r.status === 'fulfilled' ? r.value : null)
    .filter(r => r !== null);

  const totalDiffs = pairResults.reduce((sum, r) => sum + r.differences.length, 0);
  const elapsed = Date.now() - startTime;
  console.log(`✅ Schicht 3: ${pairResults.length} Paare mit ${totalDiffs} Diffs + ${missingResults.length} fehlende Klauseln in ${elapsed}ms`);

  return { pairResults, missingResults };
}

// ============================================
// SCHICHT 3.5: Comprehensive Merge + Dedup
// ============================================

/**
 * Check if a clause-level diff duplicates a deterministic group.
 */
function isDuplicateOfDeterministic(clauseDiff, groups) {
  for (const group of groups) {
    if (group.area !== clauseDiff._clauseArea) continue;

    for (const item of group.items) {
      // Check if same key/value is covered — word boundary match (not substring)
      const detKey = normalizeKeyForMatch(item.key || '');
      const clauseText = `${clauseDiff.detail1 || ''} ${clauseDiff.detail2 || ''} ${clauseDiff.explanation || ''}`.toLowerCase();
      if (detKey && detKey !== '_area_missing') {
        // Word boundary check: detKey must appear as a whole word/phrase
        try {
          const escaped = detKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const re = new RegExp(`\\b${escaped}\\b`, 'i');
          if (re.test(clauseText)) return true;
        } catch {
          // Fallback: exact word match via split
          if (clauseText.includes(detKey)) return true;
        }
      }

      // Check if same numeric values are referenced — parsed comparison (not string inclusion)
      if (item.numValue1 !== null && item.numValue2 !== null) {
        // Extract all numbers from clause text and compare
        const clauseNums = [];
        const numMatches = clauseText.match(/\d[\d.,]*/g) || [];
        for (const nm of numMatches) {
          const parsed = parseGermanNumber(nm);
          if (parsed !== null && !isNaN(parsed)) clauseNums.push(parsed);
        }
        if (clauseNums.includes(item.numValue1) && clauseNums.includes(item.numValue2)) return true;
      }
    }
  }
  return false;
}

/**
 * Convert a clause-pair diff to EnhancedDifference format.
 */
function convertClauseDiffToEnhanced(diff) {
  const label = AREA_LABELS[diff._clauseArea] || diff._clauseArea || 'Sonstiges';
  const v1 = diff.detail1 || '';
  const v2 = diff.detail2 || '';

  // V3.2 Trust-Guard: GPT-Erklärung/Impact nur übernehmen wenn Zahlen zu den Werten passen
  let safeExplanation = diff.explanation;
  if (safeExplanation && !isExplanationConsistent(safeExplanation, v1, v2)) {
    console.log(`🛡️ Trust-Guard: Clause-Diff-Erklärung verworfen (Wertekonflikt) für "${diff._clauseTitle || label}"`);
    safeExplanation = `${label}: unterschiedliche Regelungen. Siehe Originaltexte.`;
  }
  let safeImpact = diff.impact || (diff.legalBasis ? `Rechtsgrundlage: ${diff.legalBasis}` : '');
  if (safeImpact && !isExplanationConsistent(safeImpact, v1, v2)) {
    console.log(`🛡️ Trust-Guard: Clause-Diff-Impact verworfen (Wertekonflikt) für "${diff._clauseTitle || label}"`);
    safeImpact = '';
  }

  return {
    category: label,
    section: diff._clauseTitle || '',
    contract1: v1,
    contract2: v2,
    severity: diff.severity,
    explanation: safeExplanation,
    impact: safeImpact,
    recommendation: diff.recommendation || '',
    clauseArea: diff._clauseArea || 'other',
    semanticType: diff.semanticType || 'different_scope',
    financialImpact: diff.financialImpact || null,
    marketContext: null,
    _fromClauseComparison: true,
    _diffType: diff.type,
  };
}

/**
 * Convert a missing-clause assessment to EnhancedDifference format.
 */
function convertMissingToEnhanced(assessment, docConfig) {
  const label = AREA_LABELS[assessment._clauseArea] || assessment._clauseArea || 'Sonstiges';
  const inContract = assessment._inContract;
  const otherContract = inContract === 1 ? 2 : 1;
  const docLabel = docConfig?.labels?.documentName || 'Vertrag';
  const missingText = docConfig?.category === 'angebot' ? 'Nicht im Angebot enthalten' :
                      docConfig?.category === 'allgemein' ? 'Nicht enthalten' : 'Keine Regelung vorhanden';

  return {
    category: label,
    section: assessment._clauseTitle || '',
    contract1: inContract === 1 ? assessment._clauseTitle : missingText,
    contract2: inContract === 2 ? assessment._clauseTitle : missingText,
    severity: assessment.severity,
    explanation: assessment.explanation,
    impact: assessment.impact || (assessment.legalDefault ? `Ohne Klausel gilt: ${assessment.legalDefault}` : ''),
    recommendation: assessment.recommendation || `${label} in ${docLabel} ${otherContract} ergänzen.`,
    clauseArea: assessment._clauseArea || 'other',
    semanticType: 'missing',
    financialImpact: assessment.financialImpact || null,
    marketContext: null,
    _fromClauseComparison: true,
    _isMissingClause: true,
  };
}

// ============================================
// V2.2 Säule 3c: Deterministische Severity-Berechnung
// ============================================

/**
 * V2.2 Säule 3c: Deterministische Severity-Berechnung.
 * Ersetzt die subjektive GPT-Severity durch eine formelbasierte Bewertung.
 * GPT-Severity wird als Fallback behalten wenn keine Formel-Regel greift.
 */
function calculateSeverity(diff) {
  // Financial impact check
  const financialStr = diff.financialImpact || diff.financialExposure || '';
  const financialMatch = financialStr.match(/(\d[\d.,]*)\s*(?:EUR|€|Euro)/i)
    || financialStr.match(/(EUR|€)\s*(\d[\d.,]*)/i);
  if (financialMatch) {
    const numStr = financialMatch[2] || financialMatch[1];
    const amount = parseGermanNumber(numStr);
    if (amount !== null) {
      if (amount >= 10000) return 'critical';
      if (amount >= 1000) return 'high';
    }
  }

  // Missing clause/value → high
  const semanticType = diff.semanticType || '';
  if (semanticType === 'missing') return 'high';

  // Conflicting → high
  if (semanticType === 'conflicting') return 'high';

  // Numeric diff check for "weaker" with >50% difference
  if (semanticType === 'weaker') {
    const num1 = diff._numValue1 || diff.numValue1;
    const num2 = diff._numValue2 || diff.numValue2;
    if (num1 !== null && num1 !== undefined && num2 !== null && num2 !== undefined) {
      const maxVal = Math.max(Math.abs(num1), Math.abs(num2));
      if (maxVal > 0) {
        const diffPercent = Math.abs(num1 - num2) / maxVal;
        if (diffPercent > 0.5) return 'high';
      }
    }
    return 'medium';
  }

  // different_scope → medium
  if (semanticType === 'different_scope') return 'medium';

  // Area-based defaults for deterministic diffs
  const area = diff.clauseArea || diff.area || '';
  if (['payment', 'liability'].includes(area)) {
    // Payment/liability diffs are at least medium
    return diff.severity === 'critical' || diff.severity === 'high' ? diff.severity : 'medium';
  }

  // Fallback: keep GPT severity if set, otherwise 'low'
  return VALID_SEVERITIES.includes(diff.severity) ? diff.severity : 'low';
}

/**
 * V2.2: Apply deterministic severity to all merged diffs.
 */
function applyDeterministicSeverity(diffs) {
  for (const diff of diffs) {
    const detSeverity = calculateSeverity(diff);
    if (diff._fromDeterministic || diff._fromClauseComparison) {
      diff._gptSeverity = diff.severity; // Preserve original
      diff.severity = detSeverity;
    }
  }
  return diffs;
}

/**
 * Merge deterministic groups + clause-by-clause results + missing clause assessments.
 * Dedup strategy: deterministic wins, clause-level enriches.
 */
function mergeAllDifferences(groups, groupEvaluations, clauseBundle, docConfig) {
  const merged = [];
  const missingText = docConfig?.category === 'angebot' ? 'Nicht im Angebot enthalten' :
                      docConfig?.category === 'allgemein' ? 'Nicht enthalten' : 'Keine Regelung vorhanden';

  // 1. Deterministic groups first (highest trust)
  for (const group of groups) {
    const ev = (groupEvaluations || {})[group.id] || {};

    let contract1, contract2, section;
    if (group.type === 'matched') {
      const d = group.items[0];
      contract1 = `${d.key}: ${d.value1}`;
      contract2 = `${d.key}: ${d.value2}`;
      section = d.section1 || d.section2 || '';
    } else if (group.type === 'only_in_1') {
      const items = group.items.filter(d => !d._isAreaGap);
      const gaps = group.items.filter(d => d._isAreaGap);
      contract1 = items.length > 0
        ? items.map(d => `${d.key}: ${d.value1}`).join('; ')
        : (gaps[0]?.value1 || 'Vorhanden');
      contract2 = missingText;
      section = group.items[0]?.section1 || '';
    } else {
      const items = group.items.filter(d => !d._isAreaGap);
      const gaps = group.items.filter(d => d._isAreaGap);
      contract1 = missingText;
      contract2 = items.length > 0
        ? items.map(d => `${d.key}: ${d.value2}`).join('; ')
        : (gaps[0]?.value2 || 'Vorhanden');
      section = group.items[0]?.section2 || '';
    }

    const dl = docConfig?.labels?.documentName || 'Vertrag';
    const fallbackExplanation = group.type === 'matched'
      ? `${group.items[0]?.key}: ${dl} 1 = "${group.items[0]?.value1}", ${dl} 2 = "${group.items[0]?.value2}".`
      : `${group.areaLabel}: ${group.items.filter(d => !d._isAreaGap).length} Werte nur in ${dl} ${group.type === 'only_in_1' ? 1 : 2}.`;

    // V3: Override severity for missing diffs in irrelevant areas
    let groupSeverity = ev.severity || group.severity;
    if (docConfig?.missingSeverityOverrides && (group.type === 'only_in_1' || group.type === 'only_in_2')) {
      const override = docConfig.missingSeverityOverrides[group.area];
      if (override) groupSeverity = override;
    }

    merged.push({
      category: group.areaLabel,
      section,
      contract1,
      contract2,
      severity: groupSeverity,
      explanation: ev.explanation || fallbackExplanation,
      impact: ev.impact || '',
      recommendation: ev.recommendation || '',
      clauseArea: group.area,
      semanticType: ev.semanticType || inferGroupSemanticType(group),
      financialImpact: ev.financialImpact || null,
      marketContext: ev.marketContext || null,
      _fromDeterministic: true,
    });
  }

  // 2. Clause-pair diffs (only if NOT already covered by deterministic)
  // Quality filters: remove hallucinations, metadata noise, limit per area, cap total
  const HALLUCINATION_PATTERNS = /^(nicht vorhanden|keine regelung|nicht geregelt|n\/a|keine angabe|entfällt|-+)$/i;
  // Metadata noise: print dates, page numbers, document IDs — not real contract differences
  const METADATA_NOISE_PATTERNS = /\b(Ausdruck|Druckdatum|Gedruckt am|Erstellt am|Stand:|Seite \d+ von|Dokument-?Nr|Seite\s*\d+)\b/i;
  const isMetadataDate = (text) => /^\d{1,2}\.\d{1,2}\.\d{4}$/.test((text || '').trim());
  // V3.1: Tighter caps — quality over quantity
  const MAX_CLAUSE_DIFFS_FOR_AREA = (area) => (area === 'payment') ? 3 : 2;
  const MAX_TOTAL_DIFFS = 12;

  if (clauseBundle) {
    const clauseDiffsByArea = {}; // Track count per area
    const allClauseDiffs = []; // Collect for inter-clause dedup
    const seenNumericKeys = new Set(); // Track numeric value combos per area

    for (const pairResult of (clauseBundle.pairResults || [])) {
      for (const diff of (pairResult.differences || [])) {
        // V3 Filter 0: Skip diffs from irrelevant areas
        const diffArea = diff._clauseArea || 'other';
        if (docConfig?.irrelevantAreas?.length > 0 && docConfig.irrelevantAreas.includes(diffArea)) {
          continue;
        }

        // Filter 1: Hallucinations — both clauses exist (matched), so "Nicht vorhanden" is wrong
        const d1 = (diff.detail1 || '').trim();
        const d2 = (diff.detail2 || '').trim();
        if (HALLUCINATION_PATTERNS.test(d1) || HALLUCINATION_PATTERNS.test(d2)) {
          console.log(`🧹 Halluzination gefiltert: "${diff._clauseTitle}" — detail: "${d1}" / "${d2}"`);
          continue;
        }
        // Filter 1b: Empty or too-short quotes (< 5 chars) are not useful
        if (d1.length < 5 || d2.length < 5) continue;

        // Filter 1c: Metadata noise — print dates, page numbers, document metadata
        if (METADATA_NOISE_PATTERNS.test(d1) || METADATA_NOISE_PATTERNS.test(d2)) {
          console.log(`🧹 Metadata-Noise gefiltert: "${diff._clauseTitle}" — "${d1}" / "${d2}"`);
          continue;
        }
        // Filter 1d: Standalone dates as diffs (e.g. "04.11.2021" vs "15.03.2022") — likely print/creation dates
        if (isMetadataDate(d1) && isMetadataDate(d2)) {
          console.log(`🧹 Datums-Noise gefiltert: "${diff._clauseTitle}" — "${d1}" vs "${d2}"`);
          continue;
        }

        // Filter 2: Dedup against deterministic
        if (isDuplicateOfDeterministic(diff, groups)) continue;

        // Filter 3: Max per area — strict cap, no bypass
        const area = diff._clauseArea || 'other';
        if (!clauseDiffsByArea[area]) clauseDiffsByArea[area] = 0;
        const maxForArea = MAX_CLAUSE_DIFFS_FOR_AREA(area);
        if (clauseDiffsByArea[area] >= maxForArea) continue;

        // Filter 4: Clause-diff to clause-diff dedup via tokenOverlapSimilarity
        const diffText = `${d1} ${d2}`.trim();
        let isClauseDupe = false;
        for (const existing of allClauseDiffs) {
          const overlap = tokenOverlapSimilarity(diffText, existing);
          if (overlap > 0.7) {
            isClauseDupe = true;
            break;
          }
        }
        if (isClauseDupe) continue;

        // Filter 5: Numeric dedup — same numbers extracted under different phrasings in same area
        const nums = diffText.match(/\d+[\.,]?\d*/g) || [];
        if (nums.length > 0 && area) {
          const numKey = `${area}:${nums.sort().join(',')}`;
          if (seenNumericKeys.has(numKey)) {
            console.log(`🧹 Numerische Dedup: "${diff._clauseTitle}" — gleiche Werte in ${area}`);
            continue;
          }
          seenNumericKeys.add(numKey);
        }

        allClauseDiffs.push(diffText);
        clauseDiffsByArea[area]++;

        merged.push(convertClauseDiffToEnhanced(diff));
      }
    }

    // 3. Missing clause assessments (only if no area-gap in Schicht 2)
    const deterministicAreas = new Set(groups.map(g => g.area));
    for (const assessment of (clauseBundle.missingResults || [])) {
      // V3: Skip missing assessments from irrelevant areas
      if (docConfig?.irrelevantAreas?.length > 0 && docConfig.irrelevantAreas.includes(assessment._clauseArea)) {
        continue;
      }
      if (!deterministicAreas.has(assessment._clauseArea)) {
        const enhanced = convertMissingToEnhanced(assessment, docConfig);
        // V3: Override severity for missing clauses in non-critical areas
        if (docConfig?.missingSeverityOverrides) {
          const override = docConfig.missingSeverityOverrides[assessment._clauseArea];
          if (override) enhanced.severity = override;
        }
        merged.push(enhanced);
      }
    }
  }

  // 4a. Area-Korrektur: Diffs mit Zahlungs-Keywords dürfen nicht in falscher Area landen
  const PAYMENT_KEYWORDS = /\b(Gebühr|Entgelt|Vergütung|Provision|Pauschale|Zins|Preis|EUR|€|%\s*p\.\s*a|Kosten|Aufschlag|Abschlag|Rabatt|Skonto|Netto|Brutto)\b/i;
  for (const diff of merged) {
    const fullText = `${diff.contract1 || ''} ${diff.contract2 || ''} ${diff.category || ''}`;
    if (PAYMENT_KEYWORDS.test(fullText) && diff.clauseArea !== 'payment' && diff.clauseArea !== 'liability') {
      console.log(`🔧 Area-Korrektur: "${diff.category}" ${diff.clauseArea} → payment (Payment-Keywords erkannt)`);
      diff.clauseArea = 'payment';
    }
  }

  // 4. Sort: critical → high → medium → low, then by area priority
  const sevOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  const areaPriority = { payment: 0, liability: 1, termination: 2, duration: 3, warranty: 4, confidentiality: 5 };
  merged.sort((a, b) => {
    const sevA = sevOrder[a.severity] ?? 2;
    const sevB = sevOrder[b.severity] ?? 2;
    if (sevA !== sevB) return sevA - sevB;
    const pA = areaPriority[a.clauseArea] ?? 10;
    const pB = areaPriority[b.clauseArea] ?? 10;
    return pA - pB;
  });

  // 5. V2.2 Säule 3c: Deterministische Severity-Berechnung
  applyDeterministicSeverity(merged);

  // 6. Re-sort after severity recalculation
  merged.sort((a, b) => {
    const sevA = sevOrder[a.severity] ?? 2;
    const sevB = sevOrder[b.severity] ?? 2;
    if (sevA !== sevB) return sevA - sevB;
    const pA = areaPriority[a.clauseArea] ?? 10;
    const pB = areaPriority[b.clauseArea] ?? 10;
    return pA - pB;
  });

  // 7. Cap total — too many diffs overwhelm the user
  if (merged.length > MAX_TOTAL_DIFFS) {
    console.log(`🧹 Diff-Cap: ${merged.length} → ${MAX_TOTAL_DIFFS} (${merged.length - MAX_TOTAL_DIFFS} niedrig-priorisierte entfernt)`);
    merged.length = MAX_TOTAL_DIFFS;
  }

  return merged;
}

// ============================================
// SCHICHT 4: Synthese (Redesigned Phase B)
// No full texts — only diffs, metadata, scores
// ============================================

function buildSynthesisPrompt(allDiffs, map1, map2, perspective, comparisonMode, userProfile, groups, docConfig) {
  const profileHint = SYSTEM_PROMPTS[userProfile] || SYSTEM_PROMPTS.individual;
  const perspectiveBlock = buildPerspectiveBlock(perspective, docConfig);
  const modeBlock = buildModeAddition(comparisonMode);
  const docTypeBlock = docConfig?.promptAddition ? `\n${docConfig.promptAddition}\n` : '';

  // Compact contract metadata (no full texts!)
  const meta1 = {
    contractType: map1.contractType,
    parties: map1.parties,
    subject: map1.subject,
    metadata: map1.metadata,
    clauseCount: (map1.clauses || []).length,
  };
  const meta2 = {
    contractType: map2.contractType,
    parties: map2.parties,
    subject: map2.subject,
    metadata: map2.metadata,
    clauseCount: (map2.clauses || []).length,
  };

  const docLabel = docConfig?.labels?.documentName || 'Vertrag';

  // Universell: Build subject/content overview from clauses
  // This gives GPT context about WHAT each document offers/contains
  let subjectContext = '';
  {
    const getClauseSummaries = (map, areas) => {
      const summaries = [];
      for (const area of areas) {
        const clauses = (map.clauses || []).filter(c => c.area === area);
        for (const c of clauses) {
          const text = c.summary || c.originalText || '';
          if (text.length > 10) summaries.push(`[${area}] ${text.substring(0, 300)}`);
        }
      }
      return summaries;
    };
    const contextAreas = ['subject', 'parties', 'other'];
    const sum1 = getClauseSummaries(map1, contextAreas);
    const sum2 = getClauseSummaries(map2, contextAreas);
    if (sum1.length > 0 || sum2.length > 0) {
      subjectContext = `\nINHALTSÜBERSICHT (Leistungen, Parteien, Sonstiges):
${docLabel} 1:\n${sum1.length > 0 ? sum1.join('\n') : 'Keine Klauseln in diesen Bereichen'}
${docLabel} 2:\n${sum2.length > 0 ? sum2.join('\n') : 'Keine Klauseln in diesen Bereichen'}\n`;
    }
  }

  // Format diffs compactly
  const diffsText = allDiffs.map((d, i) => {
    let entry = `${i + 1}. [${d.severity.toUpperCase()}] ${d.category}`;
    if (d.section) entry += ` (${d.section})`;
    entry += `\n   ${docLabel} 1: ${(d.contract1 || '').substring(0, 200)}`;
    entry += `\n   ${docLabel} 2: ${(d.contract2 || '').substring(0, 200)}`;
    if (d.explanation) entry += `\n   → ${d.explanation.substring(0, 300)}`;
    return entry;
  }).join('\n\n');

  // Format groups compactly for groupEvaluations
  const groupsText = (groups || []).map(g => {
    let entry = `${g.id} | ${g.areaLabel} | ${g.type}`;
    if (g.type === 'matched' && g.items[0]) {
      entry += ` | ${g.items[0].key}: "${g.items[0].value1}" vs "${g.items[0].value2}"`;
    }
    return entry;
  }).join('\n');

  return {
    system: `Du bist ein erfahrener Vertragsanalyst. Du bekommst eine FERTIGE Liste von Unterschieden zwischen zwei ${docLabel === 'Vertrag' ? 'Verträgen' : docLabel + '-Dokumenten'}.
Deine Aufgabe: Bewerte, gewichte, fasse zusammen, gib Scores.
WICHTIG: Verwende in deiner Antwort IMMER "${docLabel} 1" und "${docLabel} 2" (NICHT "Vertrag 1/2"${docLabel !== 'Vertrag' ? ', denn es handelt sich um ' + docLabel + '-Dokumente' : ''}).

${profileHint}
${perspectiveBlock}
${modeBlock}
${docTypeBlock}
Du bekommst KEINE Volltexte. Arbeite NUR mit den gegebenen Unterschieden und Metadaten.
Antworte ausschließlich mit validem JSON.`,

    user: `${(docConfig?.labels?.documentName || 'VERTRAG').toUpperCase()} 1: ${meta1.contractType || docConfig?.labels?.documentName || 'Vertrag'} — ${(meta1.parties || []).map(p => p.name).join(', ')} — ${meta1.subject || 'k.A.'} (${meta1.clauseCount} Klauseln)
${(docConfig?.labels?.documentName || 'VERTRAG').toUpperCase()} 2: ${meta2.contractType || docConfig?.labels?.documentName || 'Vertrag'} — ${(meta2.parties || []).map(p => p.name).join(', ')} — ${meta2.subject || 'k.A.'} (${meta2.clauseCount} Klauseln)
${subjectContext}
DETERMINISTISCHE GRUPPEN (bewerte jede in groupEvaluations):
${groupsText || 'Keine'}

ALLE UNTERSCHIEDE (${allDiffs.length} Stück):
${diffsText}

DEINE AUFGABE — 5 SCHRITTE:

SCHRITT 0 — RELEVANZ-PRÜFUNG (KRITISCH):
Prüfe JEDEN der ${allDiffs.length} Unterschiede oben auf echten Mehrwert für den User.
Gib in "irrelevantDiffIndices" die NUMMERN (1-basiert) der Unterschiede an, die KEINEN echten Informationswert haben.

Irrelevant sind Unterschiede, die:
- Rein administrative/formale Details betreffen, die für die Entscheidung des Users irrelevant sind
- Den gleichen Sachverhalt nur anders formulieren, ohne inhaltliche Abweichung
- DUPLIKATE: Zwei Unterschiede zeigen die gleichen Zahlen/Werte/Fakten, nur in verschiedenen Kategorien — entferne den schwächeren/kürzeren
- FALSCH ZUGEORDNET: Inhalt passt nicht zur Kategorie (z.B. Zahlungsdaten unter "Datenschutz", Gebühren unter "Sonstiges") — entferne diese
- Für diesen konkreten Dokumenttyp und die Entscheidung des Users keine Rolle spielen
- Unverständlichen, verstümmelten oder zusammenhanglosen Text enthalten (z.B. OCR-Artefakte, "Wert nicht extrahierbar")
- Vage "Kategorie: X Werte nur in..." Sammel-Unterschiede, wenn die Einzelwerte bereits in anderen Unterschieden abgedeckt sind

SEI AGGRESSIV: Lieber 4-6 herausragende Unterschiede als 12+ mittelmäßige.
Jeder behaltene Unterschied MUSS dem User helfen, eine bessere Entscheidung zu treffen.

SCHRITT 1 — GRUPPEN-BEWERTUNGEN:
Für jede GRUPPE oben, schreibe eine Bewertung in "groupEvaluations" mit dem Gruppen-ID als Key:
{
  "severity": "low|medium|high|critical",
  "explanation": "4-6 Sätze, konkret, mit EUR-Beträgen wo möglich",
  "impact": "Juristische Einordnung",
  "recommendation": "Konkrete Aktion",
  "semanticType": "missing|conflicting|weaker|stronger|different_scope",
  "financialImpact": "EUR oder null",
  "marketContext": "Marktstandard oder null"
}

SCHRITT 2 — STÄRKEN & SCHWÄCHEN (je 3-5 pro ${docLabel}):

SCHRITT 3 — RISIKEN + EMPFEHLUNGEN:
Risiken mit Reasoning Chain. Empfehlungen mit Alternativtext.

SCHRITT 4 — SCORES + GESAMTURTEIL:
Overall Score (0-100) + 5 Kategorie-Scores + Risiko-Level pro ${docLabel}.
MINIMUM 12 Punkte Differenz wenn ein ${docLabel} klar besser ist.
6-8 Sätze Fazit.

{
  "irrelevantDiffIndices": [numbers],
  "groupEvaluations": { ... },
  "contract1Analysis": {"strengths": [...], "weaknesses": [...], "riskLevel": "low|medium|high", "score": number},
  "contract2Analysis": {"strengths": [...], "weaknesses": [...], "riskLevel": "low|medium|high", "score": number},
  "overallRecommendation": {"recommended": 1|2, "reasoning": "string", "confidence": number, "conditions": ["string"]},
  "summary": {"tldr": "2-3 Sätze", "detailedSummary": "4-6 Sätze", "verdict": "${docLabel} X ist besser, ABER..."},
  "scores": {
    "contract1": {"overall": number, "fairness": number, "riskProtection": number, "flexibility": number, "completeness": number, "clarity": number},
    "contract2": {"overall": number, "fairness": number, "riskProtection": number, "flexibility": number, "completeness": number, "clarity": number}
  },
  "risks": [{"clauseArea": "area", "riskType": "unfair_clause|legal_risk|unusual_clause|hidden_obligation|missing_protection", "severity": "low|medium|high|critical", "contract": 1|2|"both", "title": "string", "description": "string", "legalBasis": null, "financialExposure": null}],
  "recommendations": [{"clauseArea": "area", "targetContract": 1|2, "priority": "critical|high|medium|low", "title": "string", "reason": "string", "currentText": "string", "suggestedText": "string"}]
}`
  };
}

// ============================================
// V2.2 Säule 4: Deterministische Score-Berechnung
// ============================================

/**
 * V2.2 Säule 4: Formelbasierte Score-Berechnung.
 * Scores kommen aus Diffs, NICHT aus GPT. 100% deterministisch.
 */
function calculateScoresFromDiffs(mergedDiffs, map1, map2, docConfig) {
  // Reduced weights — old weights (8/4/2/1) caused both scores to hit the floor (35)
  // with 20+ diffs. New weights keep scores in 50-85 range so enforceScoreDifferentiation
  // has room to create the 12pt minimum gap.
  const SEVERITY_WEIGHT = { critical: 5, high: 3, medium: 1.5, low: 0.5 };
  const AREA_WEIGHT = { payment: 1.4, liability: 1.3, termination: 1.2, warranty: 1.1, duration: 1.1 };
  const BASE_SCORE = 78;
  const MAX_PENALTY = 35; // Floor at BASE_SCORE - MAX_PENALTY = 43

  let penalty1 = 0, penalty2 = 0;
  let fairness1 = 0, fairness2 = 0;
  let risk1 = 0, risk2 = 0;
  let flexibility1 = 0, flexibility2 = 0;
  let completeness1 = 0, completeness2 = 0;
  let clarity1 = 0, clarity2 = 0;

  for (const diff of mergedDiffs) {
    // V3: Skip diffs in irrelevant areas — no penalty for missing "Haftung" in Datenschutz
    if (docConfig?.irrelevantAreas?.includes(diff.clauseArea)) continue;

    const sevWeight = SEVERITY_WEIGHT[diff.severity] || 0.5;
    const areaWeight = AREA_WEIGHT[diff.clauseArea] || 1.0;
    const impact = sevWeight * areaWeight;

    // Determine which contract is disadvantaged
    const c1Text = (diff.contract1 || '').toLowerCase();
    const c2Text = (diff.contract2 || '').toLowerCase();
    const c1Missing = c1Text.includes('keine regelung');
    const c2Missing = c2Text.includes('keine regelung');
    const semanticType = diff.semanticType || '';

    let disadvantaged = 0; // 0 = both/unknown, 1 = c1 worse, 2 = c2 worse
    if (c1Missing && !c2Missing) disadvantaged = 1;
    else if (c2Missing && !c1Missing) disadvantaged = 2;
    else if (semanticType === 'weaker') disadvantaged = 1;
    else if (semanticType === 'stronger') disadvantaged = 2;
    else if (semanticType === 'conflicting' || semanticType === 'different_scope') {
      // Neutral diffs — minimal penalty (these are differences, not defects)
      penalty1 += impact * 0.15;
      penalty2 += impact * 0.15;
      continue;
    }

    if (disadvantaged === 1) {
      penalty1 += impact;
      if (['payment'].includes(diff.clauseArea)) fairness1 += impact;
      if (['liability', 'warranty'].includes(diff.clauseArea)) risk1 += impact;
      if (['termination', 'duration'].includes(diff.clauseArea)) flexibility1 += impact;
      if (semanticType === 'missing') completeness1 += impact;
    } else if (disadvantaged === 2) {
      penalty2 += impact;
      if (['payment'].includes(diff.clauseArea)) fairness2 += impact;
      if (['liability', 'warranty'].includes(diff.clauseArea)) risk2 += impact;
      if (['termination', 'duration'].includes(diff.clauseArea)) flexibility2 += impact;
      if (semanticType === 'missing') completeness2 += impact;
    } else {
      // Unknown direction — very small penalty
      penalty1 += impact * 0.1;
      penalty2 += impact * 0.1;
    }
  }

  // Cap penalties to prevent floor-hitting
  penalty1 = Math.min(penalty1, MAX_PENALTY);
  penalty2 = Math.min(penalty2, MAX_PENALTY);

  const clamp = (val, min, max) => Math.round(Math.max(min, Math.min(max, val)));

  return {
    contract1: {
      overall: clamp(BASE_SCORE - penalty1, 40, 92),
      fairness: clamp(BASE_SCORE - fairness1 * 1.8, 35, 92),
      riskProtection: clamp(BASE_SCORE - risk1 * 1.8, 35, 92),
      flexibility: clamp(BASE_SCORE - flexibility1 * 1.8, 35, 92),
      completeness: clamp(BASE_SCORE - completeness1 * 1.8, 35, 92),
      clarity: clamp(BASE_SCORE - clarity1 * 1.8, 45, 92),
    },
    contract2: {
      overall: clamp(BASE_SCORE - penalty2, 40, 92),
      fairness: clamp(BASE_SCORE - fairness2 * 1.8, 35, 92),
      riskProtection: clamp(BASE_SCORE - risk2 * 1.8, 35, 92),
      flexibility: clamp(BASE_SCORE - flexibility2 * 1.8, 35, 92),
      completeness: clamp(BASE_SCORE - completeness2 * 1.8, 35, 92),
      clarity: clamp(BASE_SCORE - clarity2 * 1.8, 45, 92),
    },
  };
}

/**
 * Schicht 4: Synthesize comparison from pre-analyzed diffs.
 */
async function synthesizeComparison(allDiffs, map1, map2, perspective, comparisonMode, userProfile, groups, docConfig) {
  console.log(`🔄 Schicht 4: Synthese (${allDiffs.length} Diffs, keine Volltexte)`);

  const prompt = buildSynthesisPrompt(allDiffs, map1, map2, perspective, comparisonMode, userProfile, groups, docConfig);

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: prompt.system },
      { role: 'user', content: prompt.user }
    ],
    temperature: 0.05, // V2.2 Säule 5: T=0.05 (Scores formelbasiert, nur Texte von GPT)
    max_tokens: 8192,
    response_format: { type: 'json_object' },
  });

  const raw = JSON.parse(completion.choices[0].message.content);
  const validated = validateSynthesisResponse(raw);

  console.log(`✅ Schicht 4: Synthese abgeschlossen — GPT-Score V1=${validated.scores?.contract1?.overall}, V2=${validated.scores?.contract2?.overall} (wird durch Formel überschrieben)`);
  return validated;
}

function validateSynthesisResponse(raw) {
  // Reuse existing Phase B validation — same output format
  return validatePhaseBResponse(raw);
}

/**
 * Apply severity calibration from synthesis groupEvaluations back to merged diffs.
 */
function applySeverityCalibration(mergedDiffs, groupEvaluations, groups) {
  if (!groupEvaluations || !groups) return mergedDiffs;

  for (const group of groups) {
    const ev = groupEvaluations[group.id];
    if (!ev || !ev.severity) continue;

    // Find the corresponding merged diff (deterministic ones have _fromDeterministic)
    const matchingDiff = mergedDiffs.find(d =>
      d._fromDeterministic &&
      d.clauseArea === group.area &&
      d.category === group.areaLabel
    );

    if (matchingDiff) {
      matchingDiff.severity = ev.severity;
      // V3.2 Trust-Guard: Nur GPT-Erklärung übernehmen wenn die genannten Werte
      // mit den tatsächlich angezeigten contract1/contract2 übereinstimmen.
      // Verhindert dass GPT-Halluzinationen die deterministischen Werte überschreiben.
      const v1 = matchingDiff.contract1;
      const v2 = matchingDiff.contract2;
      if (ev.explanation) {
        if (isExplanationConsistent(ev.explanation, v1, v2)) {
          matchingDiff.explanation = ev.explanation;
        } else {
          console.log(`🛡️ Trust-Guard: GPT-Erklärung verworfen (Wertekonflikt) für "${matchingDiff.category}"`);
        }
      }
      if (ev.impact) {
        if (isExplanationConsistent(ev.impact, v1, v2)) {
          matchingDiff.impact = ev.impact;
        } else {
          console.log(`🛡️ Trust-Guard: GPT-Impact verworfen (Wertekonflikt) für "${matchingDiff.category}"`);
        }
      }
      // Recommendation darf abweichen — sie beschreibt einen Soll-Zustand, nicht Ist-Werte
      if (ev.recommendation) matchingDiff.recommendation = ev.recommendation;
      if (ev.semanticType) matchingDiff.semanticType = ev.semanticType;
      if (ev.financialImpact) matchingDiff.financialImpact = ev.financialImpact;
      if (ev.marketContext) matchingDiff.marketContext = ev.marketContext;
    }
  }

  return mergedDiffs;
}

// ============================================
// NEW V2 Pipeline: Klausel-für-Klausel
// ============================================

// ================================================================
// V4 HOLISTIC COMPARE PIPELINE
// ================================================================
// Paradigm Shift: Statt rigider Schichten 2+3+3.5 ein ganzheitlicher
// GPT-Pass der beide Dokumente intelligent vergleicht wie ein Mensch.
// 3 Stufen: Compare Intent → Holistic Pass → Trust-Guard.
// Output: dynamische Sections (kein fester Kategorien-Zwang).
// ================================================================

// Keine starren Min/Max-Grenzen — GPT entscheidet frei wie viele Sections nötig sind.
// Hard-Cap nur als Sicherheitsnetz gegen Token-Explosion (30 ist großzügig).
const HOLISTIC_HARD_CAP = 30;
const HOLISTIC_INTENT_TIMEOUT = 20000;    // 20s für gpt-4o-mini Intent-Call
const HOLISTIC_PASS_TIMEOUT = 120000;     // 120s für gpt-4o Haupt-Call

// Section Quality Control: generische Titel IMMER verwerfen
const GENERIC_SECTION_TITLE_REGEX = /^(sonstiges?|allgemeines?|weitere\s+unterschiede?|sonstige\s+punkte?|verschiedenes|diverses|andere\s+punkte?|übrige|weitere|restliche|misc|other)$/i;

/**
 * Baut eine kompakte Zusammenfassung eines Phase-A-Results für den Intent-Call.
 * Kleines Payload um Token-Kosten niedrig zu halten.
 */
function buildDocSummaryForIntent(map) {
  const clauses = Array.isArray(map?.clauses) ? map.clauses.slice(0, 30) : [];
  const keyValueSamples = {};
  for (const c of clauses) {
    if (c?.keyValues && typeof c.keyValues === 'object') {
      const entries = Object.entries(c.keyValues)
        .filter(([_, v]) => !isBlankValueString(v))
        .slice(0, 3);
      for (const [k, v] of entries) {
        if (Object.keys(keyValueSamples).length < 20) {
          keyValueSamples[k] = String(v).slice(0, 80);
        }
      }
    }
  }
  return {
    contractType: map?.contractType || 'Unbekannt',
    parties: Array.isArray(map?.parties)
      ? map.parties.slice(0, 3).map(p => p?.name || p?.role || '').filter(Boolean)
      : [],
    subject: String(map?.subject || '').slice(0, 200),
    clauseAreas: [...new Set(clauses.map(c => c?.area).filter(Boolean))],
    clauseTitles: clauses.map(c => String(c?.title || '').slice(0, 60)).filter(Boolean).slice(0, 15),
    keyValueSamples,
  };
}

/**
 * STUFE 1: Compare Intent Detection (gpt-4o-mini, billig)
 * Entscheidet ob zwei Dokumente sinnvoll vergleichbar sind.
 * Graceful Fallback bei Fehler: level='full'.
 */
async function detectCompareIntent(map1, map2) {
  const doc1 = buildDocSummaryForIntent(map1);
  const doc2 = buildDocSummaryForIntent(map2);

  const systemPrompt = `Du bist Experte für Dokumentenvergleiche. Entscheide ob zwei Dokumente sinnvoll miteinander verglichen werden können.

Antworte NUR in diesem JSON:
{
  "level": "full" | "partial" | "meta",
  "reason": "1-2 Sätze Begründung auf Deutsch",
  "comparableDimensions": ["payment", "duration", ...],
  "nonComparableDimensions": ["liability", ...],
  "userWarning": "optional: Hinweis für den User wenn level != full",
  "suggestedFocus": "optional: worauf soll der Vergleich fokussiert werden"
}

REGELN:
- "full": Gleicher Dokument-Typ (z.B. zwei Haftpflichtversicherungen, zwei Mietverträge, zwei identische AGBs). Alle Dimensionen vergleichbar.
- "partial": Gleicher Überbereich aber unterschiedliche Variante (z.B. Dienstleistungsvertrag vs Werkvertrag, Vertrag vs Angebot, zwei verschiedene Versicherungen der gleichen Sparte). Manche Dimensionen sinnvoll vergleichbar, andere nicht.
- "meta": Fundamental unterschiedliche Dokumenttypen (z.B. Privathaftpflicht vs Rechtsschutzversicherung, Vertrag vs Rechnung, Angebot vs AGB). Nur auf Meta-Ebene (Preis/Laufzeit/Parteien) vergleichbar.

Gültige Dimensionen (nur diese Strings verwenden): parties, subject, duration, termination, payment, liability, warranty, confidentiality, ip_rights, data_protection, non_compete, force_majeure, jurisdiction.`;

  const userPrompt = `DOKUMENT 1:
${JSON.stringify(doc1, null, 2)}

DOKUMENT 2:
${JSON.stringify(doc2, null, 2)}

Bewerte die Vergleichbarkeit.`;

  try {
    const completion = await withTimeout(
      openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0,
        max_tokens: 600,
        response_format: { type: 'json_object' },
      }),
      HOLISTIC_INTENT_TIMEOUT,
      'Compare Intent Timeout'
    );

    const raw = JSON.parse(completion.choices[0].message.content);
    return validateCompareIntent(raw);
  } catch (err) {
    console.warn(`⚠️ Compare Intent fehlgeschlagen, Fallback auf level='full': ${err.message}`);
    return {
      level: 'full',
      reason: 'Automatische Vergleichbarkeits-Bewertung nicht verfügbar, Standard-Vergleich wird verwendet.',
      comparableDimensions: VALID_CLAUSE_AREAS.filter(a => a !== 'other'),
      nonComparableDimensions: [],
    };
  }
}

function validateCompareIntent(raw) {
  const validLevels = ['full', 'partial', 'meta'];
  const level = validLevels.includes(raw?.level) ? raw.level : 'full';
  const comparable = Array.isArray(raw?.comparableDimensions)
    ? raw.comparableDimensions.filter(d => VALID_CLAUSE_AREAS.includes(d))
    : VALID_CLAUSE_AREAS.filter(a => a !== 'other');
  const nonComparable = Array.isArray(raw?.nonComparableDimensions)
    ? raw.nonComparableDimensions.filter(d => VALID_CLAUSE_AREAS.includes(d))
    : [];
  const userWarning = String(raw?.userWarning || '').slice(0, 500);
  const suggestedFocus = String(raw?.suggestedFocus || '').slice(0, 300);
  return {
    level,
    reason: String(raw?.reason || '').slice(0, 500),
    comparableDimensions: comparable.length > 0 ? comparable : VALID_CLAUSE_AREAS.filter(a => a !== 'other'),
    nonComparableDimensions: nonComparable,
    userWarning: level === 'full' ? undefined : (userWarning || undefined),
    suggestedFocus: suggestedFocus || undefined,
  };
}

/**
 * Komprimiert Layer-0 Zahlen zu einer kompakten Fakten-Liste für den Holistic-Prompt.
 * Diese Liste ist der "Faktenanker" gegen den Trust-Guard später Halluzinationen prüft.
 */
function summarizeLayer0Facts(rawValues) {
  if (!Array.isArray(rawValues)) return [];
  return rawValues
    .filter(rv => !isBlankRawValue(rv))
    .slice(0, 80)
    .map(rv => ({
      key: (rv.rawKey || rv.key || '').toString().slice(0, 80),
      value: (rv.value || '').toString().slice(0, 120),
      unit: rv.unit || null,
    }));
}

/**
 * Kompakte Zusammenfassung der keyValues pro Area und Dokument.
 * Zeigt GPT auf einen Blick welche Dimensionen in welchem Dokument welche Werte haben.
 */
function computeClauseDiffHints(map1, map2) {
  const clauses1 = map1?.clauses || [];
  const clauses2 = map2?.clauses || [];
  if (!clauses1.length && !clauses2.length) return '';

  // Sammle alle keyValues pro Area pro Dokument
  const byArea1 = {};
  for (const c of clauses1) {
    if (!c.area || !c.keyValues) continue;
    if (!byArea1[c.area]) byArea1[c.area] = {};
    Object.assign(byArea1[c.area], c.keyValues);
  }
  const byArea2 = {};
  for (const c of clauses2) {
    if (!c.area || !c.keyValues) continue;
    if (!byArea2[c.area]) byArea2[c.area] = {};
    Object.assign(byArea2[c.area], c.keyValues);
  }

  const allAreas = new Set([...Object.keys(byArea1), ...Object.keys(byArea2)]);
  if (allAreas.size === 0) return '';

  const lines = [];
  for (const area of allAreas) {
    const kv1 = byArea1[area];
    const kv2 = byArea2[area];
    if (!kv1 && !kv2) continue;
    const fmt = (kv) => kv ? Object.entries(kv).map(([k,v]) => `${k}=${v}`).join(', ') : '(leer)';
    lines.push(`[${area}] Doc1: ${fmt(kv1)} | Doc2: ${fmt(kv2)}`);
  }

  return `\n═══════════════════════════════════════
KEYVALUES GEGENÜBERSTELLUNG (vergleiche diese Werte Punkt für Punkt!)
═══════════════════════════════════════
${lines.join('\n')}
Erstelle für JEDEN Wert der sich zwischen Doc1 und Doc2 unterscheidet eine eigene Section!`;
}

function buildHolisticSystemPrompt(intent, docConfig) {
  const metaHint = intent.level === 'meta'
    ? `\n\n⚠️ META-LEVEL: Die Dokumente sind nur auf META-EBENE vergleichbar (unterschiedliche Produkttypen). Fokussiere dich AUSSCHLIEßLICH auf: ${intent.comparableDimensions.join(', ')}. Die erste Section muss erklären, dass es sich um fundamental unterschiedliche Dokumenttypen handelt. Vergleiche KEINE Detailklauseln aus unvereinbaren Bereichen.`
    : '';

  const partialHint = intent.level === 'partial'
    ? `\n\n⚠️ PARTIAL-LEVEL: Die Dokumente sind nur TEILWEISE vergleichbar. Konzentriere dich auf: ${intent.comparableDimensions.join(', ')}. Vermeide Vergleiche in: ${intent.nonComparableDimensions.join(', ') || '(keine explizit ausgeschlossen)'}.`
    : '';

  const docTypeHint = docConfig?.label
    ? `\n\nDOKUMENTTYP: ${docConfig.label}. Berücksichtige typische Bewertungskriterien dieses Dokumenttyps.`
    : '';

  return `Du bist ein erfahrener Vertragsberater und vergleichst zwei Dokumente wie ein Mensch — intelligent, ganzheitlich, priorisiert.${docTypeHint}

DEINE AUFGABE:
Vergleiche die beiden Dokumente und finde ALLE echten Unterschiede. Arbeite wie ein erfahrener Anwalt: gründlich, faktenbasiert, nichts übersehen, nichts erfinden.${metaHint}${partialHint}

KERNPRINZIP — Kein Formzwang:
- Es gibt KEINE Mindest- oder Höchstzahl an Sections. Finde so viele Unterschiede wie tatsächlich existieren.
- Zwei fast identische Dokumente mit einer Preisänderung? → 1 Section. Das ist perfekt.
- Zwei komplett verschiedene Verträge? → 10, 15, 20 Sections. Alles was echt ist.
- ERFINDE NIEMALS Unterschiede um eine bestimmte Anzahl zu erreichen.
- Lasse NIEMALS echte Unterschiede weg um eine bestimmte Anzahl zu unterschreiten.

BESONDERS WICHTIG — Zahlenunterschiede:
- Prüfe JEDEN Zahlenwert in den "VERIFIZIERTE ZAHLEN"-Listen UND in den keyValues der Klauseln beider Dokumente.
- Wenn eine Zahl in Dokument 1 anders ist als in Dokument 2 (z.B. Sicherungseinbehalt 10% vs 2,3%), MUSS das eine eigene Section werden.
- Wenn beide Dokumente den gleichen Wert haben (z.B. beide 6 Monate Kündigungsfrist), ist das KEIN Unterschied und darf KEINE Section werden.
- JEDER dieser Punkte muss eine EIGENE Section werden, nicht zusammengefasst: Preis pro Monat, Einrichtungsgebühr, Datenvolumen, Geschwindigkeit, Leistungsumfang (Flatrate vs. pro Nutzung), etc.
- NICHT mehrere Zahlenunterschiede in eine Section zusammenfassen — jeder verdient Einzelbetrachtung.

BESONDERS WICHTIG — recommendationTarget:
- Wenn bei einem Unterschied KLAR ist welches Dokument besser abschneidet (z.B. niedrigerer Preis, mehr Leistung, längere Garantie), MUSS recommendationTarget gesetzt werden (1 oder 2).
- recommendationTarget nur weglassen wenn der Unterschied NEUTRAL ist und keines der Dokumente objektiv besser ist.

QUALITÄTSKRITERIEN:
- JEDE Section MUSS einen echten, konkreten Unterschied zwischen den Dokumenten beschreiben
- Generische Füll-Titel wie "Sonstiges", "Allgemeines", "Weitere Unterschiede" sind VERBOTEN
- Section-Titel sollen branding-freundlich und konkret sein (z.B. "Kosten & Beitrag" statt "payment", "Absicherung & Haftung" statt "liability")
- Priorisiere nach Relevanz (priority 1 = wichtigste, finanziell bedeutsamste)

SECTION-STRUKTUR (jede Section als Objekt in "sections"):
{
  "title": "Kosten & Beitrag",
  "icon": "💰",
  "clauseArea": "payment",
  "priority": 1,
  "severity": "high",
  "doc1Value": "47,88 EUR/Jahr",
  "doc2Value": "156,00 EUR/Jahr",
  "doc1Quote": "Jahresbeitrag in Höhe von 47,88 EUR",
  "doc2Quote": "Gesamtbeitrag pro Jahr: 156,00 EUR",
  "difference": "+226% bei Dokument 2",
  "explanation": "Dokument 2 kostet 226% mehr, deckt aber auch zusätzliche Risiken ab...",
  "recommendation": "Prüfe ob die zusätzlichen Leistungen den Mehrpreis rechtfertigen",
  "recommendationTarget": 1
}

FELD-REGELN:
- clauseArea: MUSS exakt einer sein von: parties, subject, duration, termination, payment, liability, warranty, confidentiality, ip_rights, data_protection, non_compete, force_majeure, jurisdiction, other
- priority: 1-10 (1=wichtigste)
- severity: "low" | "medium" | "high" | "critical"
- icon: passendes Emoji (💰 Kosten, ⏱️ Zeit, ⚖️ Haftung, 🔒 Datenschutz, 📦 Leistung, 🚪 Kündigung, 🛡️ Gewährleistung, 👥 Parteien, 📍 Recht, ⚡ Sonstiges)
- doc1Value / doc2Value: konkreter Wert oder "Nicht angegeben" (NIEMALS leerer String)
- doc1Quote / doc2Quote: EXAKTES Zitat aus dem jeweiligen Rohtext (max 200 Zeichen, optional wenn keine passende Stelle)
- recommendationTarget: OPTIONAL — 1 oder 2 wenn klar ist welches Dokument besser ist; sonst weglassen

HARTE REGELN (Verstöße werden vom Trust-Guard erkannt und die Section wird verworfen):
1. Zahlen AUSSCHLIEßLICH aus den "VERIFIZIERTE ZAHLEN"-Listen oder direkt aus den Rohtexten kopieren — NIEMALS erfinden oder schätzen
2. Jedes Zitat in doc1Quote/doc2Quote MUSS wörtlich im jeweiligen Rohtext vorkommen
3. Erklärungen dürfen NUR Zahlen nennen die auch in doc1Value/doc2Value/doc1Quote/doc2Quote stehen
4. Wenn ein Thema strukturell nicht in einem Dokument vorkommt (z.B. Kündigungsfrist in einer Rechnung): diese Section NICHT erstellen
5. Wenn doc1Value und doc2Value IDENTISCH sind: diese Section NICHT erstellen — das ist kein Unterschied
6. Deutsche Sprache

OUTPUT-SCHEMA (strict JSON):
{
  "sections": [ ... ],
  "overallRecommendation": {
    "recommended": 1 | 2,
    "reasoning": "1-3 Sätze",
    "confidence": 0-100,
    "conditions": ["optional: Bedingungen für die Empfehlung"]
  },
  "summary": {
    "tldr": "Ein kurzer Satz",
    "detailedSummary": "2-4 Sätze",
    "verdict": "1-2 Sätze Endurteil"
  },
  "contract1Strengths": ["...", "..."],
  "contract1Weaknesses": ["...", "..."],
  "contract2Strengths": ["...", "..."],
  "contract2Weaknesses": ["...", "..."]
}`;
}

function buildHolisticUserPrompt(map1, map2, intent, text1, text2, docConfig) {
  const MAX_RAW_TEXT = 6000; // pro Dokument
  const truncText = (t) => {
    if (!t) return '(kein Rohtext verfügbar)';
    const s = String(t);
    return s.length > MAX_RAW_TEXT ? s.slice(0, MAX_RAW_TEXT) + '\n[...gekürzt...]' : s;
  };

  const compactMap = (m) => ({
    contractType: m?.contractType,
    parties: m?.parties,
    subject: String(m?.subject || '').slice(0, 300),
    metadata: m?.metadata,
    clauses: (m?.clauses || []).map(c => ({
      area: c.area,
      title: String(c.title || '').slice(0, 100),
      summary: String(c.summary || '').slice(0, 200),
      keyValues: c.keyValues,
      originalText: String(c.originalText || '').slice(0, 400),
    })),
  });

  const facts1 = summarizeLayer0Facts(map1?._rawValues);
  const facts2 = summarizeLayer0Facts(map2?._rawValues);

  return `COMPATIBILITY-ANALYSE:
Level: ${intent.level}
Grund: ${intent.reason}
Vergleichbare Dimensionen: ${intent.comparableDimensions.join(', ')}
NICHT vergleichbar: ${intent.nonComparableDimensions.join(', ') || '(keine)'}
${intent.suggestedFocus ? `Fokus-Empfehlung: ${intent.suggestedFocus}` : ''}

DOKUMENT-TYP: ${docConfig?.label || 'Dokument'} (Kategorie: ${docConfig?.category || 'unbekannt'})

═══════════════════════════════════════
DOKUMENT 1 — STRUKTURIERTE DATEN
═══════════════════════════════════════
${JSON.stringify(compactMap(map1))}

═══════════════════════════════════════
DOKUMENT 1 — VERIFIZIERTE ZAHLEN (Layer-0 Regex, vertrauenswürdige Faktenbasis)
═══════════════════════════════════════
${JSON.stringify(facts1)}

═══════════════════════════════════════
DOKUMENT 1 — ROHTEXT (gekürzt)
═══════════════════════════════════════
${truncText(text1)}

═══════════════════════════════════════
DOKUMENT 2 — STRUKTURIERTE DATEN
═══════════════════════════════════════
${JSON.stringify(compactMap(map2))}

═══════════════════════════════════════
DOKUMENT 2 — VERIFIZIERTE ZAHLEN (Layer-0 Regex)
═══════════════════════════════════════
${JSON.stringify(facts2)}

═══════════════════════════════════════
DOKUMENT 2 — ROHTEXT (gekürzt)
═══════════════════════════════════════
${truncText(text2)}
${computeClauseDiffHints(map1, map2)}

Erstelle jetzt die Sections für den Vergleich. JEDER echte Unterschied = eine eigene Section. Prüfe die Klausel-Unterschiede-Checkliste oben!`;
}

/**
 * STUFE 2: Holistic Compare Pass (gpt-4o, ein einziger großer Call)
 */
async function runHolisticComparePass(map1, map2, intent, text1, text2, docConfig) {
  const systemPrompt = buildHolisticSystemPrompt(intent, docConfig);
  const userPrompt = buildHolisticUserPrompt(map1, map2, intent, text1, text2, docConfig);

  console.log(`🌊 Holistic Pass: ~${Math.round((systemPrompt.length + userPrompt.length) / 4)} Tokens Input`);

  const completion = await withTimeout(
    openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0,
      max_tokens: 6000,
      response_format: { type: 'json_object' },
    }),
    HOLISTIC_PASS_TIMEOUT,
    'Holistic Pass Timeout'
  );

  let raw;
  try {
    raw = JSON.parse(completion.choices[0].message.content);
  } catch (parseErr) {
    console.warn(`⚠️ Holistic Pass: GPT-Antwort war kein gültiges JSON: ${parseErr.message}`);
    console.warn(`⚠️ Raw content (first 500 chars): ${String(completion.choices[0].message.content).slice(0, 500)}`);
    throw new Error('Holistic Pass: GPT-Antwort konnte nicht als JSON verarbeitet werden');
  }
  const sectionCount = Array.isArray(raw?.sections) ? raw.sections.length : 0;
  console.log(`✅ Holistic Pass: ${sectionCount} Sections vom GPT erhalten`);
  return raw;
}

/**
 * STUFE 3: Trust-Guard — validiert Sections gegen Rohtext und Fakten.
 * Drops ungültige Sections statt den ganzen Output zu verwerfen.
 */
function normalizeTextForQuoteMatch(text) {
  return String(text || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function quoteExistsInNormText(quote, normText) {
  if (!quote || quote.length < 15) return true; // zu kurz zum Verifizieren
  const q = normalizeTextForQuoteMatch(quote);
  if (normText.includes(q)) return true;
  // Fallback: erste 25 Zeichen
  if (q.length >= 25 && normText.includes(q.substring(0, 25))) return true;
  // Fallback: Mittel-Substring
  if (q.length >= 30) {
    const midStart = Math.floor(q.length / 2) - 12;
    const mid = q.substring(Math.max(0, midStart), Math.max(0, midStart) + 25);
    if (mid.length >= 20 && normText.includes(mid)) return true;
  }
  return false;
}

function validateHolisticOutput(raw, text1, text2, intent) {
  const normText1 = normalizeTextForQuoteMatch(text1);
  const normText2 = normalizeTextForQuoteMatch(text2);

  const rawSections = Array.isArray(raw?.sections) ? raw.sections : [];
  const validSections = [];
  const stats = { total: rawSections.length, droppedGeneric: 0, droppedArea: 0, droppedQuote: 0, droppedNumbers: 0, droppedDuplicate: 0, droppedIdentical: 0 };

  for (const s of rawSections) {
    if (!s || typeof s !== 'object') continue;

    const title = String(s.title || '').trim();
    if (!title || GENERIC_SECTION_TITLE_REGEX.test(title)) {
      stats.droppedGeneric++;
      continue;
    }
    // Filter: Titel die nur Nummern/Paragraphen sind (z.B. "1.", "11.", "§ 3")
    if (/^[§\d\s.\-:]+$/.test(title)) {
      stats.droppedGeneric++;
      continue;
    }
    // Filter: Titel die nach Maschinen-Output aussehen (aus KeyValue-Diff-Hints)
    if (/^\w+:\s*\d+\s*Werte?\s/i.test(title)) {
      stats.droppedGeneric++;
      continue;
    }

    const clauseArea = VALID_CLAUSE_AREAS.includes(s.clauseArea) ? s.clauseArea : null;
    if (!clauseArea) {
      stats.droppedArea++;
      continue;
    }

    const doc1Quote = String(s.doc1Quote || '').trim();
    const doc2Quote = String(s.doc2Quote || '').trim();

    // Quote-Verifikation: mindestens EIN Zitat muss im Rohtext vorkommen wenn beide lang genug sind
    if (doc1Quote.length >= 15 && doc2Quote.length >= 15) {
      const q1Valid = quoteExistsInNormText(doc1Quote, normText1);
      const q2Valid = quoteExistsInNormText(doc2Quote, normText2);
      if (!q1Valid && !q2Valid) {
        stats.droppedQuote++;
        continue;
      }
    } else if (doc1Quote.length >= 15) {
      if (!quoteExistsInNormText(doc1Quote, normText1)) {
        stats.droppedQuote++;
        continue;
      }
    } else if (doc2Quote.length >= 15) {
      if (!quoteExistsInNormText(doc2Quote, normText2)) {
        stats.droppedQuote++;
        continue;
      }
    }

    const doc1Value = String(s.doc1Value || '').trim();
    const doc2Value = String(s.doc2Value || '').trim();

    // Identische Werte = kein Unterschied → Section droppen
    // Normalisiert vergleichen: Leerzeichen, Groß/Klein, Satzzeichen ignorieren
    const norm = (v) => v.toLowerCase().replace(/[\s.,;:\-–—/]+/g, '').replace(/eur|euro|€/gi, '');
    if (doc1Value && doc2Value && norm(doc1Value) === norm(doc2Value)) {
      stats.droppedIdentical++;
      continue;
    }

    const valuePool = `${doc1Value} ${doc2Value} ${doc1Quote} ${doc2Quote}`;
    const explanation = String(s.explanation || '').trim();
    const recommendation = String(s.recommendation || '').trim();

    // Zahl-Konsistenz: Erklärung darf nur Zahlen enthalten die im Value-Pool vorkommen
    if (explanation && !isExplanationConsistent(explanation, valuePool, '')) {
      stats.droppedNumbers++;
      continue;
    }
    // Recommendation: weicher — bei Verletzung nur Recommendation droppen, Section behalten
    let finalRecommendation = recommendation;
    let finalRecTarget = (s.recommendationTarget === 1 || s.recommendationTarget === 2) ? s.recommendationTarget : undefined;
    if (recommendation && !isExplanationConsistent(recommendation, valuePool, '')) {
      finalRecommendation = '';
      finalRecTarget = undefined;
    }

    const severity = VALID_SEVERITIES.includes(s.severity) ? s.severity : 'medium';

    validSections.push({
      id: `sec_${validSections.length + 1}`,
      title: title.slice(0, 120),
      icon: String(s.icon || '📋').slice(0, 4),
      clauseArea,
      priority: Number.isFinite(s.priority) ? Math.max(1, Math.min(10, Math.floor(s.priority))) : 5,
      severity,
      doc1Value: doc1Value.slice(0, 300) || 'Nicht angegeben',
      doc2Value: doc2Value.slice(0, 300) || 'Nicht angegeben',
      doc1Quote: doc1Quote ? doc1Quote.slice(0, 500) : undefined,
      doc2Quote: doc2Quote ? doc2Quote.slice(0, 500) : undefined,
      difference: String(s.difference || '').slice(0, 200) || undefined,
      explanation: explanation.slice(0, 1000),
      recommendation: finalRecommendation ? finalRecommendation.slice(0, 800) : undefined,
      recommendationTarget: finalRecTarget,
    });
  }

  // Dedup by normalized title
  const seen = new Set();
  const deduped = [];
  for (const s of validSections) {
    const key = normalizeKeyForMatch(s.title);
    if (seen.has(key)) {
      stats.droppedDuplicate++;
      continue;
    }
    seen.add(key);
    deduped.push(s);
  }

  // Sort by priority ASC, then severity
  const sevRank = { critical: 0, high: 1, medium: 2, low: 3 };
  deduped.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return (sevRank[a.severity] ?? 4) - (sevRank[b.severity] ?? 4);
  });

  // Re-assign IDs after sort
  deduped.forEach((s, i) => { s.id = `sec_${i + 1}`; });

  // Hard cap
  const capped = deduped.slice(0, HOLISTIC_HARD_CAP);

  const droppedTotal = stats.total - capped.length;
  if (droppedTotal > 0) {
    console.log(`🛡️ Trust-Guard: ${stats.total} → ${capped.length} Sections (dropped: ${stats.droppedGeneric} generic, ${stats.droppedArea} invalid-area, ${stats.droppedQuote} bad-quotes, ${stats.droppedNumbers} hallucinated-numbers, ${stats.droppedDuplicate} duplicates, ${stats.droppedIdentical} identical-values)`);
  } else {
    console.log(`🛡️ Trust-Guard: ${stats.total} Sections validiert`);
  }

  const rec = raw?.overallRecommendation || {};
  const overallRecommendation = {
    recommended: (rec.recommended === 1 || rec.recommended === 2) ? rec.recommended : 1,
    reasoning: String(rec.reasoning || '').slice(0, 800),
    confidence: Number.isFinite(rec.confidence) ? Math.max(0, Math.min(100, Math.round(rec.confidence))) : 50,
    conditions: Array.isArray(rec.conditions) ? rec.conditions.slice(0, 5).map(c => String(c).slice(0, 200)).filter(Boolean) : [],
  };

  const summary = {
    tldr: String(raw?.summary?.tldr || '').slice(0, 300),
    detailedSummary: String(raw?.summary?.detailedSummary || '').slice(0, 1500),
    verdict: String(raw?.summary?.verdict || '').slice(0, 500),
  };

  const cleanList = (arr, max) => Array.isArray(arr)
    ? arr.slice(0, max).map(x => String(x).slice(0, 200)).filter(Boolean)
    : [];

  return {
    sections: capped,
    overallRecommendation,
    summary,
    contract1Strengths: cleanList(raw?.contract1Strengths, 5),
    contract1Weaknesses: cleanList(raw?.contract1Weaknesses, 5),
    contract2Strengths: cleanList(raw?.contract2Strengths, 5),
    contract2Weaknesses: cleanList(raw?.contract2Weaknesses, 5),
    compatibility: {
      level: intent.level,
      reason: intent.reason,
      comparableDimensions: intent.comparableDimensions,
      nonComparableDimensions: intent.nonComparableDimensions,
      userWarning: intent.userWarning,
      suggestedFocus: intent.suggestedFocus,
    },
  };
}

/**
 * Adapter: Holistic Sections → Legacy-Schema (differences, risks, recommendations).
 * Nötig für (a) Score-Berechnung die auf mergedDiffs arbeitet, (b) alte Frontend-Tabs.
 */
function adaptSectionsToLegacySchema(sections) {
  const differences = sections.map(s => ({
    category: s.clauseArea,
    clauseArea: s.clauseArea,
    section: s.title,
    contract1: s.doc1Quote || s.doc1Value,
    contract2: s.doc2Quote || s.doc2Value,
    severity: s.severity,
    explanation: s.explanation,
    impact: s.difference || s.explanation,
    recommendation: s.recommendation || '',
    semanticType: inferSemanticTypeFromSection(s),
    financialImpact: s.clauseArea === 'payment' && s.difference ? s.difference : undefined,
    _icon: s.icon,
  }));

  const risks = sections
    .filter(s => s.severity === 'high' || s.severity === 'critical')
    .map(s => ({
      clauseArea: s.clauseArea,
      riskType: inferRiskTypeFromSection(s),
      severity: s.severity,
      // Wer ist das Risiko? Das Dokument das NICHT empfohlen wird
      contract: s.recommendationTarget === 1 ? 2 : (s.recommendationTarget === 2 ? 1 : 'both'),
      title: s.title,
      description: s.explanation,
      legalBasis: undefined,
      financialExposure: s.clauseArea === 'payment' ? s.difference : undefined,
    }));

  const recommendations = sections
    .filter(s => s.recommendation && s.recommendationTarget)
    .map(s => ({
      clauseArea: s.clauseArea,
      targetContract: s.recommendationTarget,
      priority: (s.severity === 'critical' || s.severity === 'high') ? 'high' : (s.severity === 'medium' ? 'medium' : 'low'),
      title: s.title,
      reason: s.explanation,
      currentText: s.recommendationTarget === 1 ? s.doc1Value : s.doc2Value,
      suggestedText: s.recommendation,
    }));

  return { differences, risks, recommendations };
}

function inferSemanticTypeFromSection(s) {
  const d1 = String(s.doc1Value || '').toLowerCase();
  const d2 = String(s.doc2Value || '').toLowerCase();
  const nonePattern = /nicht\s*(angegeben|vorhanden|enthalten|geregelt)|keine\s*(regelung|angabe)|^fehlt$|^—$|^-$/i;
  const d1Missing = nonePattern.test(d1);
  const d2Missing = nonePattern.test(d2);
  if (d1Missing && !d2Missing) return 'missing';
  if (d2Missing && !d1Missing) return 'missing';
  // Konvention in calculateScoresFromDiffs:
  //   'stronger' → c1 ist stärker → c2 verliert Punkte (disadvantaged=2)
  //   'weaker'   → c1 ist schwächer → c1 verliert Punkte (disadvantaged=1)
  if (s.recommendationTarget === 1) return 'stronger';  // doc1 empfohlen → doc1 stärker → c2 loses
  if (s.recommendationTarget === 2) return 'weaker';    // doc2 empfohlen → doc1 schwächer → c1 loses
  return 'different_scope';
}

// clauseArea → riskType (Werte müssen in VALID_RISK_TYPES sein)
const RISK_TYPE_BY_AREA = {
  payment: 'hidden_obligation',
  liability: 'legal_risk',
  termination: 'unfair_clause',
  warranty: 'missing_protection',
  data_protection: 'legal_risk',
};
function inferRiskTypeFromSection(s) {
  const t = RISK_TYPE_BY_AREA[s.clauseArea] || 'unusual_clause';
  return VALID_RISK_TYPES.includes(t) ? t : 'legal_risk';
}

/**
 * V4 HAUPT-PIPELINE: Holistic Compare
 */
async function runCompareHolisticPipeline(text1, text2, perspective, comparisonMode, userProfile, onProgress) {
  const progress = onProgress || (() => {});

  try {
    console.log(`🌊 V4 Holistic Pipeline gestartet`);

    // SCHICHT 1 (bleibt): Phase A — Strukturierung beider Dokumente parallel
    progress('structuring', 10, 'Dokument 1 wird strukturiert...');
    const [map1, map2] = await withTimeout(
      Promise.all([
        structureContract(text1).then(r => { progress('structuring', 25, 'Dokument 1 strukturiert, Dokument 2 läuft...'); return r; }),
        structureContract(text2),
      ]),
      MAX_PHASE_A_TIME * 2,
      'Phase A Timeout'
    );

    // Document type detection (bleibt)
    const docCategory = detectDocumentCategory(map1, map2);
    const docConfig = getDocTypeConfig(docCategory);
    console.log(`📋 Dokumenttyp: ${docConfig.label} (${docCategory})`);

    // STUFE 1: Compare Intent
    progress('intent', 40, 'Vergleichbarkeit wird bewertet...');
    const intent = await detectCompareIntent(map1, map2);
    console.log(`🎯 Compare Intent: level=${intent.level}, comparable=[${intent.comparableDimensions.join(',')}]`);

    // STUFE 2: Holistic Pass
    progress('holistic', 55, 'KI-Vergleich läuft (ganzheitliche Analyse)...');
    let holisticRaw = await runHolisticComparePass(map1, map2, intent, text1, text2, docConfig);

    // STUFE 3: Trust-Guard
    progress('validating', 82, 'Ergebnisse werden validiert...');
    let validated = validateHolisticOutput(holisticRaw, text1, text2, intent);

    // Safety Net: Bei 0 Sections nach Trust-Guard → einmal retry
    if (validated.sections.length === 0) {
      console.warn(`⚠️ Holistic: 0 Sections nach Trust-Guard. Einmaliger Retry...`);
      progress('holistic', 70, 'Erneuter KI-Vergleich (Retry)...');
      try {
        holisticRaw = await runHolisticComparePass(map1, map2, intent, text1, text2, docConfig);
        validated = validateHolisticOutput(holisticRaw, text1, text2, intent);
        if (validated.sections.length > 0) {
          console.log(`✅ Retry erfolgreich: ${validated.sections.length} Sections`);
        } else {
          console.warn(`⚠️ Retry ebenfalls 0 Sections — Dokumente sind möglicherweise identisch.`);
        }
      } catch (retryErr) {
        console.warn(`⚠️ Retry fehlgeschlagen: ${retryErr.message}. Fahre mit 0 Sections fort.`);
      }
    }

    // Legacy-Adapter für Score-Berechnung + backward compat
    const { differences, risks, recommendations } = adaptSectionsToLegacySchema(validated.sections);

    // Scores: datenbasiert (formelbasiert wie bisher)
    const scores = calculateScoresFromDiffs(differences, map1, map2, docConfig);
    console.log(`📊 Holistic Scores: V1=${scores.contract1.overall}, V2=${scores.contract2.overall}`);

    // Benchmark (bleibt, nur wenn docConfig es erlaubt)
    progress('benchmark', 90, 'Marktvergleich wird erstellt...');
    let benchmarkResult = { contractType: null, contractTypeLabel: null, benchmarks: [], enrichedDifferences: differences };
    if (docConfig.benchmarkEnabled) {
      try {
        benchmarkResult = runBenchmarkComparison(map1, map2, differences);
      } catch (benchErr) {
        console.warn(`⚠️ Benchmark fehlgeschlagen: ${benchErr.message}`);
      }
    }

    // Score-Differenzierung: Wenn ein Dokument empfohlen wird, muss sich das in den Scores widerspiegeln
    const scoreResult = {
      scores,
      differences,
      overallRecommendation: validated.overallRecommendation,
    };
    enforceScoreDifferentiation(scoreResult);
    const finalScores = scoreResult.scores;
    console.log(`📊 Holistic Scores (nach Enforcement): V1=${finalScores.contract1.overall}, V2=${finalScores.contract2.overall}`);

    progress('finalizing', 95, 'Ergebnis wird zusammengestellt...');

    // Final response — kompatibles Schema + neue Holistic-Felder
    const finalResult = {
      version: 2,
      _pipelineVersion: 'holistic-v4',

      documentType: docConfig ? {
        category: docConfig.category,
        label: docConfig.label,
        scoreLabels: docConfig.scoreLabels || null,
        labels: docConfig.labels,
        perspectiveLabels: docConfig.perspectiveLabels || null,
      } : null,

      contractMap: { contract1: map1, contract2: map2 },

      // V4 Holistic-Felder (neu)
      sections: validated.sections,
      compatibility: validated.compatibility,

      // Legacy-kompatibel (aus Sections abgeleitet)
      differences,
      risks,
      recommendations,
      scores: finalScores,

      summary: validated.summary,
      overallRecommendation: validated.overallRecommendation,

      contract1Analysis: {
        strengths: validated.contract1Strengths,
        weaknesses: validated.contract1Weaknesses,
        riskLevel: finalScores.contract1.overall >= 70 ? 'low' : finalScores.contract1.overall >= 50 ? 'medium' : 'high',
        score: finalScores.contract1.overall,
      },
      contract2Analysis: {
        strengths: validated.contract2Strengths,
        weaknesses: validated.contract2Weaknesses,
        riskLevel: finalScores.contract2.overall >= 70 ? 'low' : finalScores.contract2.overall >= 50 ? 'medium' : 'high',
        score: finalScores.contract2.overall,
      },

      perspective,

      benchmark: benchmarkResult ? {
        contractType: benchmarkResult.contractType,
        contractTypeLabel: benchmarkResult.contractTypeLabel || null,
        metrics: benchmarkResult.benchmarks || [],
      } : null,

      categories: [...new Set(validated.sections.map(s => s.clauseArea))],

      _contractTexts: {
        text1: typeof text1 === 'string' ? text1.slice(0, MAX_CONTRACT_CHARS) : '',
        text2: typeof text2 === 'string' ? text2.slice(0, MAX_CONTRACT_CHARS) : '',
      },
    };

    console.log(`✅ V4 Holistic Pipeline komplett: ${validated.sections.length} Sections, ${risks.length} Risks, ${recommendations.length} Recs, level=${intent.level}`);
    progress('complete', 100, 'Analyse abgeschlossen!');
    return finalResult;
  } catch (error) {
    if (error.message?.includes('Timeout')) {
      console.warn(`⚠️ V4 Holistic Pipeline Timeout: ${error.message}`);
    }
    throw error;
  }
}

async function runCompareV2PipelineNew(text1, text2, perspective, comparisonMode, userProfile, onProgress) {
  // V4: Holistic Pipeline (Feature Flag) — intelligenter, ChatGPT-artiger Vergleich mit dynamischen Sections
  if (process.env.COMPARE_HOLISTIC === 'true') {
    console.log(`🌊 COMPARE_HOLISTIC=true → V4 Holistic Pipeline aktiv`);
    return runCompareHolisticPipeline(text1, text2, perspective, comparisonMode, userProfile, onProgress);
  }

  const progress = onProgress || (() => {});

  try {
    // SCHICHT 1: Structure both contracts in parallel
    progress('structuring', 10, 'Vertrag 1 wird strukturiert...');

    const phaseAResult = await withTimeout(
      Promise.all([
        structureContract(text1).then(r => { progress('structuring', 20, 'Vertrag 1 strukturiert, Vertrag 2 läuft...'); return r; }),
        structureContract(text2)
      ]),
      MAX_PHASE_A_TIME * 2,
      'Phase A Timeout'
    );

    const [map1, map2] = phaseAResult;

    // V3: Dokumenttyp-Erkennung (nach Phase A, vor Pipeline)
    const docCategory = detectDocumentCategory(map1, map2);
    const docConfig = getDocTypeConfig(docCategory);
    console.log(`📋 Dokumenttyp: ${docConfig.label} (${docCategory})`);

    progress('mapping', 35, 'Beide Dokumente strukturiert. Klauseln werden gematcht...');

    // SCHICHT 1.5: Clause Matching
    let clauseMatchResult = null;
    try {
      clauseMatchResult = await matchClauses(
        map1.clauses || [],
        map2.clauses || [],
        { useEmbeddings: false }
      );
      progress('mapping', 42, `${clauseMatchResult.stats.matched} Klausel-Paare erkannt.`);
    } catch (matchError) {
      console.warn(`⚠️ Clause Matching fehlgeschlagen: ${matchError.message}`);
      progress('mapping', 42, 'Clause Matching fehlgeschlagen, fahre fort...');
    }

    // V3.4: Pre-Classification — unbekannte keyValue-Keys via GPT klassifizieren
    // Lernt mit der Zeit über alle Compare-Calls (MongoDB-persistent).
    // Graceful: Bei Fehler läuft die Pipeline normal mit Regex-only weiter.
    try {
      await preClassifyUnknownKeys(map1, map2);
    } catch (preClassErr) {
      console.warn(`⚠️ Pre-Classification übersprungen: ${preClassErr.message}`);
    }

    // SCHICHT 2: Deterministischer Wertevergleich (docConfig → irrelevante Areas skippen)
    progress('comparing', 45, 'Deterministischer Wertevergleich...');
    const deterministicDiffs = buildDeterministicDifferences(map1, map2, clauseMatchResult, docConfig);

    // SCHICHT 2.5: Gruppierung
    const groups = groupDeterministicDiffs(deterministicDiffs);

    // SCHICHT 3: Klausel-für-Klausel-Vergleich (docConfig → Prompt-Ergänzung)
    progress('clause_comparison', 50, 'Klausel-für-Klausel-Vergleich startet...');
    const clauseBundle = await runClauseByClauseComparison(
      clauseMatchResult, map1, map2, perspective, comparisonMode, userProfile, progress, docConfig
    );

    // SCHICHT 3.25: Quote Verification — eliminiert halluzinierte Zitate
    verifyClauseQuotes(clauseBundle, text1, text2);

    // SCHICHT 3.5: Comprehensive Merge + Dedup (docConfig → Severity-Override)
    progress('merging', 70, 'Unterschiede werden zusammengeführt...');
    const mergedDiffs = mergeAllDifferences(groups, {}, clauseBundle, docConfig);
    console.log(`📊 Schicht 3.5: ${mergedDiffs.length} Unterschiede nach Merge+Dedup`);

    // SCHICHT 4: Synthese (docConfig → Prompt-Ergänzung)
    progress('synthesis', 75, 'KI-Synthese läuft...');
    const synthesisResult = await withTimeout(
      synthesizeComparison(mergedDiffs, map1, map2, perspective, comparisonMode, userProfile, groups, docConfig),
      MAX_PHASE_B_TIME,
      'Synthese Timeout'
    );

    // Apply severity calibration from synthesis back to merged diffs (text enrichment only)
    const groupEvaluations = synthesisResult.groupEvaluations || {};
    applySeverityCalibration(mergedDiffs, groupEvaluations, groups);

    // V3.1: AI-based relevance filter — remove diffs GPT marked as irrelevant
    const irrelevantIndices = Array.isArray(synthesisResult.irrelevantDiffIndices) ? synthesisResult.irrelevantDiffIndices : [];
    let finalDiffs = mergedDiffs;
    if (irrelevantIndices.length > 0) {
      const toRemove = new Set(irrelevantIndices.map(i => i - 1)); // prompt uses 1-based indices
      finalDiffs = mergedDiffs.filter((_, i) => !toRemove.has(i));
      console.log(`🔍 Relevanz-Filter: ${irrelevantIndices.length} irrelevante Diffs entfernt, ${finalDiffs.length} von ${mergedDiffs.length} verbleiben`);
    }

    // V3.1: Deterministic post-dedup — catch duplicates GPT missed
    finalDiffs = deduplicateByContent(finalDiffs);

    // V3.1: Hard cap — absolute maximum diffs the user sees
    // More than 10 overwhelms the user, quality matters more than quantity
    if (finalDiffs.length > 10) {
      console.log(`🔍 Hard-Cap: ${finalDiffs.length} → 10 (überzählige niedrig-priorisierte entfernt)`);
      finalDiffs = finalDiffs.slice(0, 10);
    }

    // Set final differences
    synthesisResult.differences = finalDiffs;

    // V2.2 Säule 4: Formelbasierte Scores ÜBERSCHREIBEN GPT-Scores (docConfig → irrelevante Diffs ignorieren)
    const calculatedScores = calculateScoresFromDiffs(finalDiffs, map1, map2, docConfig);
    console.log(`📊 V2.2 Formel-Scores: V1=${calculatedScores.contract1.overall}, V2=${calculatedScores.contract2.overall} (GPT war V1=${synthesisResult.scores?.contract1?.overall}, V2=${synthesisResult.scores?.contract2?.overall})`);
    synthesisResult.scores = calculatedScores;
    // Sync with contract analysis
    if (synthesisResult.contract1Analysis) synthesisResult.contract1Analysis.score = calculatedScores.contract1.overall;
    if (synthesisResult.contract2Analysis) synthesisResult.contract2Analysis.score = calculatedScores.contract2.overall;

    // Market Benchmark FIRST (docConfig → benchmarkEnabled Gate)
    // Must run BEFORE enforceScoreDifferentiation so benchmark can correct the direction
    progress('finalizing', 88, 'Marktvergleich wird erstellt...');
    let benchmarkResult = { contractType: null, benchmarks: [], enrichedDifferences: synthesisResult.differences || [] };
    if (docConfig.benchmarkEnabled) {
      benchmarkResult = runBenchmarkComparison(map1, map2, synthesisResult.differences || []);
      if (benchmarkResult.benchmarks.length > 0) {
        synthesisResult.differences = benchmarkResult.enrichedDifferences;

        // V3.1: Benchmark → Score Integration
        // If benchmark clearly shows one contract is financially better, adjust scores + recommendation
        applyBenchmarkScoreAdjustment(synthesisResult, benchmarkResult.benchmarks);
      }
    } else {
      console.log(`📊 Benchmark: Übersprungen für Dokumenttyp "${docConfig.label}"`);
    }

    // SCHICHT 5: Post-Processing — AFTER benchmark so enforcement works in correct direction
    progress('finalizing', 92, 'Ergebnisse werden finalisiert...');
    enforceScoreDifferentiation(synthesisResult);

    progress('finalizing', 95, 'Ergebnis wird zusammengestellt...');

    // Build V2 response (docConfig → documentType in output)
    const v2Result = buildV2Response(map1, map2, synthesisResult, perspective, text1, text2, benchmarkResult, docConfig);

    if (clauseMatchResult) {
      v2Result._clauseMatching = clauseMatchResult.stats;
    }
    v2Result._pipelineVersion = 'clause-by-clause';

    console.log(`✅ V2 Pipeline (NEU) komplett: ${v2Result.differences?.length || 0} Diffs, ${v2Result.risks?.length || 0} Risks, ${v2Result.recommendations?.length || 0} Recs`);
    progress('complete', 100, 'Analyse abgeschlossen!');
    return v2Result;

  } catch (error) {
    if (error.message?.includes('Timeout')) {
      console.warn(`⚠️ V2 Pipeline (NEU) Timeout: ${error.message}`);
    }
    throw error;
  }
}

// ============================================
// Exports
// ============================================

module.exports = {
  structureContract,
  compareContractsV2,
  runCompareV2Pipeline,
  runCompareV2PipelineNew,
  buildV2Response,
  filterIdenticalClauses,
  detectGaps,
  buildDeterministicDifferences,
  groupDeterministicDiffs,
  formatGroupsForPrompt,
  mergeDifferences,
  mergeAllDifferences,
  enforceScoreDifferentiation,
  formatDeterministicDiffsForPrompt,
  checkDeterministicCoverage,
  validatePhaseAResponse,
  validatePhaseBResponse,
  synthesizeComparison,
  runClauseByClauseComparison,
  extractAllValuesFromRawText,
  normalizeOcrText,
  // V2.2 exports
  deterministicSegmentation,
  calculateScoresFromDiffs,
  calculateSeverity,
  COMPARISON_MODES,
  SYSTEM_PROMPTS,
  // V3 exports
  DOCUMENT_TYPE_CONFIGS,
  detectDocumentCategory,
  getDocTypeConfig,
  // V4 Holistic exports
  runCompareHolisticPipeline,
  detectCompareIntent,
  runHolisticComparePass,
  validateHolisticOutput,
  adaptSectionsToLegacySchema,
};
