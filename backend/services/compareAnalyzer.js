// backend/services/compareAnalyzer.js — Compare V2: Two-Phase AI Analysis
const { OpenAI } = require("openai");
const crypto = require("crypto");
const { matchClauses, formatMatchesForPrompt } = require("./clauseMatcher");
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
    max_tokens: 16384,
    response_format: { type: "json_object" },
  });

  const raw = JSON.parse(completion.choices[0].message.content);
  const validated = validatePhaseAResponse(raw);

  // Expand any truncated originalText snippets from the source contract
  expandOriginalTexts(validated.clauses, contractText);

  // Maßnahme A.1: Regex-Nachextraktion für von GPT übersehene Werte
  enrichKeyValuesFromText(validated.clauses, contractText);

  // Maßnahme A.2: Qualitätsprüfung — warnt bei suspekt dünner Extraktion
  const qualityIssues = checkExtractionQuality(validated);
  if (qualityIssues.length > 0) {
    console.warn(`⚠️ Phase A Qualität: ${qualityIssues.join(' | ')}`);
  }

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

function buildV2Response(map1, map2, phaseBResult, perspective, text1, text2, benchmarkResult) {
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

  // Jaccard-Similarity der Wörter > 0.6 (für umgestellte Wörter)
  const words1 = new Set(normKey1.split(' ').filter(w => w.length > 2));
  const words2 = new Set(normKey2.split(' ').filter(w => w.length > 2));
  if (words1.size >= 2 && words2.size >= 2) {
    const intersection = [...words1].filter(w => words2.has(w)).length;
    const union = new Set([...words1, ...words2]).size;
    if (union > 0 && intersection / union > 0.6) return true;
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
function buildDeterministicDifferences(map1, map2, clauseMatchResult) {
  const diffs = [];
  const skipAreas = new Set(['parties', 'subject', 'jurisdiction', 'other']);

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
    const entries1 = Object.entries(kv1).map(([k, v]) => ({ key: k, norm: normalizeKeyForMatch(k), value: String(v) }));
    const entries2 = Object.entries(kv2).map(([k, v]) => ({ key: k, norm: normalizeKeyForMatch(k), value: String(v) }));
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

  // Schritt 5: Sortieren — payment zuerst, dann numerisch vor text, dann nach Diff-Größe
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
function formatGroupsForPrompt(groups) {
  if (!groups || groups.length === 0) return '';

  let text = `VERIFIZIERTE UNTERSCHIEDE (${groups.length} Gruppen):

Die folgenden Unterschiedsgruppen wurden durch exakten Wertevergleich ermittelt.
Diese Fakten sind verifiziert. Du MUSST jede Gruppe in "groupEvaluations" bewerten.

`;

  for (const group of groups) {
    text += `${group.id} | ${group.areaLabel} | `;

    if (group.type === 'matched') {
      const d = group.items[0];
      text += `Direktvergleich\n`;
      text += `  ${d.key}: Vertrag 1 = "${d.value1}" | Vertrag 2 = "${d.value2}"`;
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
        text += `Bereich fehlt komplett in Vertrag ${otherContract}\n`;
        text += `  Vertrag ${contract}: ${gaps[0].value1 || gaps[0].value2}\n`;
      } else {
        text += `Nur in Vertrag ${contract} (${items.length} Werte)\n`;
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

function detectGaps(map1, map2, existingDifferences) {
  const coveredAreas = new Set(existingDifferences.map(d => d.clauseArea));
  // Also consider areas covered by related areas
  const effectivelyCovered = new Set(coveredAreas);
  for (const area of coveredAreas) {
    const related = RELATED_AREAS[area] || [];
    related.forEach(r => effectivelyCovered.add(r));
  }

  const gaps = [];
  const skipAreas = new Set(['parties', 'subject', 'jurisdiction', 'other']);

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
      gaps.push(buildMissingDiff(area, c1[0], 1));
    } else if (c2.length > 0 && c1.length === 0) {
      gaps.push(buildMissingDiff(area, c2[0], 2));
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

function buildMissingDiff(area, existingClause, existsInContract) {
  const label = AREA_LABELS[area] || area;
  const section = existingClause.section || '';
  const summary = existingClause.summary || existingClause.originalText || '';
  const otherContract = existsInContract === 1 ? 2 : 1;

  return {
    category: label,
    section,
    contract1: existsInContract === 1 ? summary : 'Keine Regelung vorhanden',
    contract2: existsInContract === 2 ? summary : 'Keine Regelung vorhanden',
    severity: MISSING_SEVERITY[area] || 'medium',
    explanation: `Vertrag ${existsInContract} enthält eine Regelung zu ${label} (${section}), die in Vertrag ${otherContract} vollständig fehlt. Für Sie bedeutet das, dass im Vertrag ${otherContract} keine vertragliche Absicherung in diesem Bereich besteht.`,
    impact: `Fehlende ${label}-Klausel — es gelten nur gesetzliche Regelungen, die möglicherweise nicht ausreichend schützen.`,
    recommendation: `Eine ${label}-Regelung sollte in Vertrag ${otherContract} ergänzt werden.`,
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
function prioritizeClausePairs(matches) {
  if (!matches || !Array.isArray(matches)) return [];
  const priority = { similar: 0, related: 1, potential: 2 };
  return matches
    .filter(m => m.type !== 'equivalent') // Skip equivalent (≥92%) — no meaningful diff
    .sort((a, b) => (priority[a.type] ?? 3) - (priority[b.type] ?? 3))
    .slice(0, MAX_CLAUSE_PAIRS);
}

/**
 * Build prompt for a single clause pair comparison.
 */
function buildClausePairPrompt(clause1, clause2, match, perspective, comparisonMode, userProfile) {
  const profileHint = SYSTEM_PROMPTS[userProfile] || SYSTEM_PROMPTS.individual;
  const perspectiveBlock = buildPerspectiveBlock(perspective);
  const modeBlock = buildModeAddition(comparisonMode);

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

METHODE — wie ein Anwalt liest:
1. WÖRTLICHE ABWEICHUNGEN: "kann" vs "muss", "ausgeschlossen" vs "begrenzt"
2. UMFANG-UNTERSCHIEDE: Was deckt eine Klausel ab, die andere nicht?
3. FEHLENDE QUALIFIKATIONEN: Bedingungen, Ausnahmen, Einschränkungen
4. UNTERSCHIEDLICHE BEDINGUNGEN: Fristen, Schwellenwerte, Auslöser
5. PFLICHTEN vs RECHTE: Wer muss was tun? Wer darf was?

Antworte NUR mit validem JSON.`,

    user: `KLAUSEL-VERGLEICH: "${clause1.title}" (${clause1.area})
Match-Typ: ${match.type} (Ähnlichkeit: ${Math.round((match.similarity || 0) * 100)}%)

VERTRAG 1 — ${clause1.section || clause1.id}:
"""
${text1}
"""${kv1}

VERTRAG 2 — ${clause2.section || clause2.id}:
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
      "detail1": "Exaktes Zitat aus Vertrag 1 (min. 10 Zeichen)",
      "detail2": "Exaktes Zitat aus Vertrag 2 (min. 10 Zeichen)",
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
async function compareClausePair(clause1, clause2, match, perspective, comparisonMode, userProfile) {
  const prompt = buildClausePairPrompt(clause1, clause2, match, perspective, comparisonMode, userProfile);

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: prompt.system },
        { role: 'user', content: prompt.user }
      ],
      temperature: 0.1,
      max_tokens: 2048,
      response_format: { type: 'json_object' },
    });

    const raw = JSON.parse(completion.choices[0].message.content);
    return validateClausePairResponse(raw, clause1, clause2, match);
  } catch (err) {
    console.warn(`⚠️ Schicht 3: Klauselpaar "${clause1.title}" fehlgeschlagen: ${err.message}`);
    return null;
  }
}

function validateClausePairResponse(raw, clause1, clause2, match) {
  const result = { differences: [], overallAssessment: '' };

  if (Array.isArray(raw.differences)) {
    result.differences = raw.differences.slice(0, 8).map(d => ({
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
function buildMissingClausePrompt(clause, inContract, perspective, comparisonMode, userProfile) {
  const profileHint = SYSTEM_PROMPTS[userProfile] || SYSTEM_PROMPTS.individual;
  const perspectiveBlock = buildPerspectiveBlock(perspective);
  const text = smartTruncateClause(clause.originalText, 2000);
  const otherContract = inContract === 1 ? 2 : 1;

  return {
    system: `Du bist ein erfahrener Vertragsanwalt. Bewerte eine Klausel die NUR in einem der beiden Verträge existiert.
${profileHint}
${perspectiveBlock}
Antworte NUR mit validem JSON.`,

    user: `FEHLENDE KLAUSEL: "${clause.title}" (${clause.area})
Diese Klausel existiert NUR in Vertrag ${inContract}. Vertrag ${otherContract} hat KEINE entsprechende Regelung.

KLAUSELTEXT:
"""
${text}
"""

Bewerte: Wie wichtig ist diese Klausel? Was passiert ohne sie?

{
  "severity": "low|medium|high|critical",
  "explanation": "3-4 Sätze: Was regelt die Klausel, warum fehlt sie",
  "legalDefault": "§-Verweis wenn Klausel fehlt",
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
async function assessMissingClause(clause, inContract, perspective, comparisonMode, userProfile) {
  const prompt = buildMissingClausePrompt(clause, inContract, perspective, comparisonMode, userProfile);

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: prompt.system },
        { role: 'user', content: prompt.user }
      ],
      temperature: 0.1,
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
async function runClauseByClauseComparison(clauseMatchResult, map1, map2, perspective, comparisonMode, userProfile, onProgress) {
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
  const pairs = prioritizeClausePairs(clauseMatchResult.matches || []);
  console.log(`🔬 Schicht 3: ${pairs.length} Klauselpaare (von ${(clauseMatchResult.matches || []).length} gesamt, ${(clauseMatchResult.matches || []).filter(m => m.type === 'equivalent').length} equivalent übersprungen)`);

  // Build tasks for clause pairs
  const pairTasks = pairs.map(match => () => {
    const c1 = clauseMap1[match.clause1Id];
    const c2 = clauseMap2[match.clause2Id];
    if (!c1 || !c2) return Promise.resolve(null);
    return withTimeout(
      compareClausePair(c1, c2, match, perspective, comparisonMode, userProfile),
      MAX_CLAUSE_CALL_TIME,
      `Klauselpaar ${c1.title}`
    ).catch(() => null);
  });

  // Build tasks for missing clauses (unmatched)
  const unmatched1 = (clauseMatchResult.unmatched1 || []).slice(0, MAX_MISSING_ASSESSMENTS);
  const unmatched2 = (clauseMatchResult.unmatched2 || []).slice(0, MAX_MISSING_ASSESSMENTS - unmatched1.length);

  const missingTasks = [
    ...unmatched1.map(clauseId => () => {
      const c = clauseMap1[clauseId];
      if (!c) return Promise.resolve(null);
      return withTimeout(
        assessMissingClause(c, 1, perspective, comparisonMode, userProfile),
        MAX_CLAUSE_CALL_TIME,
        `Fehlende Klausel ${c.title}`
      ).catch(() => null);
    }),
    ...unmatched2.map(clauseId => () => {
      const c = clauseMap2[clauseId];
      if (!c) return Promise.resolve(null);
      return withTimeout(
        assessMissingClause(c, 2, perspective, comparisonMode, userProfile),
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
      // Check if same key/value is covered
      const detKey = normalizeKeyForMatch(item.key || '');
      const clauseText = `${clauseDiff.detail1 || ''} ${clauseDiff.detail2 || ''} ${clauseDiff.explanation || ''}`.toLowerCase();
      if (detKey && detKey !== '_area_missing' && clauseText.includes(detKey)) return true;

      // Check if same numeric values are referenced
      if (item.numValue1 !== null && item.numValue2 !== null) {
        const v1Str = String(item.numValue1);
        const v2Str = String(item.numValue2);
        if (clauseText.includes(v1Str) && clauseText.includes(v2Str)) return true;
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
  return {
    category: label,
    section: diff._clauseTitle || '',
    contract1: diff.detail1 || '',
    contract2: diff.detail2 || '',
    severity: diff.severity,
    explanation: diff.explanation,
    impact: diff.impact || (diff.legalBasis ? `Rechtsgrundlage: ${diff.legalBasis}` : ''),
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
function convertMissingToEnhanced(assessment) {
  const label = AREA_LABELS[assessment._clauseArea] || assessment._clauseArea || 'Sonstiges';
  const inContract = assessment._inContract;
  const otherContract = inContract === 1 ? 2 : 1;

  return {
    category: label,
    section: assessment._clauseTitle || '',
    contract1: inContract === 1 ? assessment._clauseTitle : 'Keine Regelung vorhanden',
    contract2: inContract === 2 ? assessment._clauseTitle : 'Keine Regelung vorhanden',
    severity: assessment.severity,
    explanation: assessment.explanation,
    impact: assessment.impact || (assessment.legalDefault ? `Ohne Klausel gilt: ${assessment.legalDefault}` : ''),
    recommendation: assessment.recommendation || `Klausel in Vertrag ${otherContract} ergänzen.`,
    clauseArea: assessment._clauseArea || 'other',
    semanticType: 'missing',
    financialImpact: assessment.financialImpact || null,
    marketContext: null,
    _fromClauseComparison: true,
    _isMissingClause: true,
  };
}

/**
 * Merge deterministic groups + clause-by-clause results + missing clause assessments.
 * Dedup strategy: deterministic wins, clause-level enriches.
 */
function mergeAllDifferences(groups, groupEvaluations, clauseBundle) {
  const merged = [];

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

  // 2. Clause-pair diffs (only if NOT already covered by deterministic)
  // Quality filters: remove hallucinations, limit per area, cap total
  const HALLUCINATION_PATTERNS = /^(nicht vorhanden|keine regelung|nicht geregelt|n\/a|keine angabe|entfällt|-+)$/i;
  const MAX_CLAUSE_DIFFS_PER_AREA = 3;
  const MAX_TOTAL_DIFFS = 25;

  if (clauseBundle) {
    const clauseDiffsByArea = {}; // Track count per area

    for (const pairResult of (clauseBundle.pairResults || [])) {
      for (const diff of (pairResult.differences || [])) {
        // Filter 1: Hallucinations — both clauses exist (matched), so "Nicht vorhanden" is wrong
        const d1 = (diff.detail1 || '').trim();
        const d2 = (diff.detail2 || '').trim();
        if (HALLUCINATION_PATTERNS.test(d1) || HALLUCINATION_PATTERNS.test(d2)) {
          console.log(`🧹 Halluzination gefiltert: "${diff._clauseTitle}" — detail: "${d1}" / "${d2}"`);
          continue;
        }
        // Filter 1b: Empty or too-short quotes (< 5 chars) are not useful
        if (d1.length < 5 || d2.length < 5) continue;

        // Filter 2: Dedup against deterministic
        if (isDuplicateOfDeterministic(diff, groups)) continue;

        // Filter 3: Max per area — keep highest severity first
        const area = diff._clauseArea || 'other';
        if (!clauseDiffsByArea[area]) clauseDiffsByArea[area] = 0;
        if (clauseDiffsByArea[area] >= MAX_CLAUSE_DIFFS_PER_AREA) {
          // Only allow if this diff is high/critical and we'd replace a lower one
          if (diff.severity !== 'critical' && diff.severity !== 'high') continue;
        }
        clauseDiffsByArea[area]++;

        merged.push(convertClauseDiffToEnhanced(diff));
      }
    }

    // 3. Missing clause assessments (only if no area-gap in Schicht 2)
    const deterministicAreas = new Set(groups.map(g => g.area));
    for (const assessment of (clauseBundle.missingResults || [])) {
      if (!deterministicAreas.has(assessment._clauseArea)) {
        merged.push(convertMissingToEnhanced(assessment));
      }
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

  // 5. Cap total — too many diffs overwhelm the user
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

function buildSynthesisPrompt(allDiffs, map1, map2, perspective, comparisonMode, userProfile, groups) {
  const profileHint = SYSTEM_PROMPTS[userProfile] || SYSTEM_PROMPTS.individual;
  const perspectiveBlock = buildPerspectiveBlock(perspective);
  const modeBlock = buildModeAddition(comparisonMode);

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

  // Format diffs compactly
  const diffsText = allDiffs.map((d, i) => {
    let entry = `${i + 1}. [${d.severity.toUpperCase()}] ${d.category}`;
    if (d.section) entry += ` (${d.section})`;
    entry += `\n   V1: ${(d.contract1 || '').substring(0, 200)}`;
    entry += `\n   V2: ${(d.contract2 || '').substring(0, 200)}`;
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
    system: `Du bist ein erfahrener Vertragsanalyst. Du bekommst eine FERTIGE Liste von Unterschieden zwischen zwei Verträgen.
Deine Aufgabe: Bewerte, gewichte, fasse zusammen, gib Scores.

${profileHint}
${perspectiveBlock}
${modeBlock}

Du bekommst KEINE Volltexte. Arbeite NUR mit den gegebenen Unterschieden und Metadaten.
Antworte ausschließlich mit validem JSON.`,

    user: `VERTRAG 1: ${meta1.contractType || 'Vertrag'} — ${(meta1.parties || []).map(p => p.name).join(', ')} — ${meta1.subject || 'k.A.'} (${meta1.clauseCount} Klauseln)
VERTRAG 2: ${meta2.contractType || 'Vertrag'} — ${(meta2.parties || []).map(p => p.name).join(', ')} — ${meta2.subject || 'k.A.'} (${meta2.clauseCount} Klauseln)

DETERMINISTISCHE GRUPPEN (bewerte jede in groupEvaluations):
${groupsText || 'Keine'}

ALLE UNTERSCHIEDE (${allDiffs.length} Stück):
${diffsText}

DEINE AUFGABE — 4 SCHRITTE:

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

SCHRITT 2 — STÄRKEN & SCHWÄCHEN (je 3-5 pro Vertrag):

SCHRITT 3 — RISIKEN + EMPFEHLUNGEN:
Risiken mit Reasoning Chain. Empfehlungen mit Alternativtext.

SCHRITT 4 — SCORES + GESAMTURTEIL:
Overall Score (0-100) + 5 Kategorie-Scores + Risiko-Level pro Vertrag.
MINIMUM 12 Punkte Differenz wenn ein Vertrag klar besser ist.
6-8 Sätze Fazit.

{
  "groupEvaluations": { ... },
  "contract1Analysis": {"strengths": [...], "weaknesses": [...], "riskLevel": "low|medium|high", "score": number},
  "contract2Analysis": {"strengths": [...], "weaknesses": [...], "riskLevel": "low|medium|high", "score": number},
  "overallRecommendation": {"recommended": 1|2, "reasoning": "string", "confidence": number, "conditions": ["string"]},
  "summary": {"tldr": "2-3 Sätze", "detailedSummary": "4-6 Sätze", "verdict": "Vertrag X ist besser, ABER..."},
  "scores": {
    "contract1": {"overall": number, "fairness": number, "riskProtection": number, "flexibility": number, "completeness": number, "clarity": number},
    "contract2": {"overall": number, "fairness": number, "riskProtection": number, "flexibility": number, "completeness": number, "clarity": number}
  },
  "risks": [{"clauseArea": "area", "riskType": "unfair_clause|legal_risk|unusual_clause|hidden_obligation|missing_protection", "severity": "low|medium|high|critical", "contract": 1|2|"both", "title": "string", "description": "string", "legalBasis": null, "financialExposure": null}],
  "recommendations": [{"clauseArea": "area", "targetContract": 1|2, "priority": "critical|high|medium|low", "title": "string", "reason": "string", "currentText": "string", "suggestedText": "string"}]
}`
  };
}

/**
 * Schicht 4: Synthesize comparison from pre-analyzed diffs.
 */
async function synthesizeComparison(allDiffs, map1, map2, perspective, comparisonMode, userProfile, groups) {
  console.log(`🔄 Schicht 4: Synthese (${allDiffs.length} Diffs, keine Volltexte)`);

  const prompt = buildSynthesisPrompt(allDiffs, map1, map2, perspective, comparisonMode, userProfile, groups);

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: prompt.system },
      { role: 'user', content: prompt.user }
    ],
    temperature: 0.15,
    max_tokens: 8192,
    response_format: { type: 'json_object' },
  });

  const raw = JSON.parse(completion.choices[0].message.content);
  const validated = validateSynthesisResponse(raw);

  console.log(`✅ Schicht 4: Synthese abgeschlossen — Score V1=${validated.scores?.contract1?.overall}, V2=${validated.scores?.contract2?.overall}`);
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
      if (ev.explanation) matchingDiff.explanation = ev.explanation;
      if (ev.impact) matchingDiff.impact = ev.impact;
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

async function runCompareV2PipelineNew(text1, text2, perspective, comparisonMode, userProfile, onProgress) {
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
    progress('mapping', 35, 'Beide Verträge strukturiert. Klauseln werden gematcht...');

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

    // SCHICHT 2: Deterministischer Wertevergleich
    progress('comparing', 45, 'Deterministischer Wertevergleich...');
    const deterministicDiffs = buildDeterministicDifferences(map1, map2, clauseMatchResult);

    // SCHICHT 2.5: Gruppierung
    const groups = groupDeterministicDiffs(deterministicDiffs);

    // SCHICHT 3: Klausel-für-Klausel-Vergleich (PARALLEL)
    progress('clause_comparison', 50, 'Klausel-für-Klausel-Vergleich startet...');
    const clauseBundle = await runClauseByClauseComparison(
      clauseMatchResult, map1, map2, perspective, comparisonMode, userProfile, progress
    );

    // SCHICHT 3.5: Comprehensive Merge + Dedup (ohne Synthese-Evaluations vorerst)
    progress('merging', 70, 'Unterschiede werden zusammengeführt...');
    const mergedDiffs = mergeAllDifferences(groups, {}, clauseBundle);
    console.log(`📊 Schicht 3.5: ${mergedDiffs.length} Unterschiede nach Merge+Dedup`);

    // SCHICHT 4: Synthese (kleiner Kontext, keine Volltexte)
    progress('synthesis', 75, 'KI-Synthese läuft...');
    const synthesisResult = await withTimeout(
      synthesizeComparison(mergedDiffs, map1, map2, perspective, comparisonMode, userProfile, groups),
      MAX_PHASE_B_TIME,
      'Synthese Timeout'
    );

    // Apply severity calibration from synthesis back to merged diffs
    const groupEvaluations = synthesisResult.groupEvaluations || {};
    applySeverityCalibration(mergedDiffs, groupEvaluations, groups);

    // Set final differences
    synthesisResult.differences = mergedDiffs;

    // SCHICHT 5: Post-Processing
    progress('finalizing', 88, 'Ergebnisse werden finalisiert...');
    enforceScoreDifferentiation(synthesisResult);

    // Market Benchmark
    progress('finalizing', 90, 'Marktvergleich wird erstellt...');
    const benchmarkResult = runBenchmarkComparison(map1, map2, synthesisResult.differences || []);
    if (benchmarkResult.benchmarks.length > 0) {
      synthesisResult.differences = benchmarkResult.enrichedDifferences;
    }

    progress('finalizing', 95, 'Ergebnis wird zusammengestellt...');

    // Build V2 response
    const v2Result = buildV2Response(map1, map2, synthesisResult, perspective, text1, text2, benchmarkResult);

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
  COMPARISON_MODES,
  SYSTEM_PROMPTS,
};
