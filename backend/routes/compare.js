// 📁 backend/routes/compare.js
const express = require("express");
const { OpenAI } = require("openai");
const verifyToken = require("../middleware/verifyToken");
const pdfParse = require("pdf-parse");
const multer = require("multer");
const { extractTextFromBuffer, isSupportedMimetype } = require("../services/textExtractor");
const pdfExtractor = require("../services/pdfExtractor");
const fs = require("fs");
const fsPromises = require("fs").promises;
const path = require("path");
const PDFDocument = require("pdfkit");
const { ObjectId } = require("mongodb");
const database = require("../config/database");

const { isBusinessOrHigher, isEnterpriseOrHigher, getFeatureLimit } = require("../constants/subscriptionPlans"); // 📊 Zentrale Plan-Definitionen
const { fixUtf8Filename } = require("../utils/fixUtf8"); // ✅ Fix UTF-8 Encoding
const { runCompareV2Pipeline, generateCompareFollowUps, answerCompareFollowUp } = require("../services/compareAnalyzer"); // 🆕 Compare V2 + Follow-Ups
const { getInstance: getCostTrackingService } = require("../services/costTracking"); // 💰 Cost Tracking
const { PutObjectCommand } = require("@aws-sdk/client-s3");
const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const router = express.Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Configure multer storage
const storage = multer.diskStorage({
  destination: "./uploads",
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `contract-${uniqueSuffix}-${req.user.userId}${path.extname(file.originalname)}`);
  },
});

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (isSupportedMimetype(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Nur PDF- und DOCX-Dateien sind erlaubt"));
    }
  }
});

// 🛡️ In-flight rate limiter: max 2 concurrent comparisons per user
const activeComparisons = new Map(); // userId → count

let usersCollection, contractsCollection;
async function ensureDb() {
  if (usersCollection) return;
  const db = await database.connect();
  usersCollection = db.collection("users");
  contractsCollection = db.collection("contracts");
}
ensureDb().catch(err => console.error("❌ MongoDB-Fehler (compare):", err));

// Compare-Uploads werden NICHT als Verträge gespeichert (nur als compare_history)

// Enhanced system prompts for different user profiles
const SYSTEM_PROMPTS = {
  individual: `
NUTZERPROFIL: PRIVATPERSON (Verbraucher)
Du berätst eine Privatperson OHNE juristische Vorkenntnisse. Sprich einfach und verständlich.

GEWICHTUNG (beeinflusst Severity und Scores):
- Kosten & versteckte Gebühren → CRITICAL
- Kündigungsfristen & automatische Verlängerung → HIGH
- Verständlichkeit der Sprache → HIGH
- Widerrufsrecht & Rücktritt → HIGH (§355 BGB beachten)
- Datenschutz & Datennutzung → MEDIUM
- Haftungsbegrenzung → MEDIUM
- Gerichtsstand → LOW
- Compliance & SLAs → LOW

TONALITÄT: Erkläre wie einem Freund. Nutze Alltagsbeispiele statt Fachsprache.
`,
  freelancer: `
NUTZERPROFIL: FREELANCER / SELBSTSTÄNDIGER
Du berätst einen erfahrenen Freelancer. Fokus auf wirtschaftliche Absicherung.

GEWICHTUNG (beeinflusst Severity und Scores):
- Zahlungsbedingungen & Zahlungsfristen → CRITICAL (Cashflow ist Existenzgrundlage)
- Haftungsbegrenzung & Haftungsobergrenze → CRITICAL
- IP/Urheberrecht & Nutzungsrechte → HIGH
- Projektumfang & Scope Creep → HIGH
- Stornierung & Ausfallhonorar → HIGH
- Gewährleistung & Nachbesserung → MEDIUM
- Wettbewerbsverbot → MEDIUM
- Datenschutz → LOW

TONALITÄT: Businessorientiert, pragmatisch. Rechne in EUR pro Stunde/Projekt.
`,
  business: `
NUTZERPROFIL: UNTERNEHMEN
Du berätst die Rechtsabteilung eines Unternehmens. Professionelle Analyse.

GEWICHTUNG (beeinflusst Severity und Scores):
- Haftung & Haftungsbegrenzung → CRITICAL
- Vertragsstrafen & Pönalen → CRITICAL
- Compliance & regulatorische Anforderungen → HIGH
- Force Majeure & höhere Gewalt → HIGH
- Vertraulichkeit & NDA-Klauseln → HIGH
- SLAs & Leistungskennzahlen → HIGH
- Gerichtsstand & anwendbares Recht → MEDIUM
- Subunternehmer-Klauseln → MEDIUM
- Kosten → LOW (Risiko ist primär)

TONALITÄT: Professionell, Risk-Management-orientiert. Quantifiziere Risiken in EUR.
`
};

// 🎯 Comparison Modes - Different analysis approaches
const COMPARISON_MODES = {
  standard: {
    name: 'Standard-Vergleich',
    description: 'Allgemeiner Vergleich zweier Verträge',
    promptAddition: `
VERGLEICHSMODUS: STANDARD-VERGLEICH
Analysiere beide Verträge gleichwertig und identifiziere alle relevanten Unterschiede.
Kein Vertrag ist "Referenz" — beide werden neutral bewertet.
Gewichte alle Klausel-Bereiche nach ihrer rechtlichen und wirtschaftlichen Bedeutung.
`
  },
  version: {
    name: 'Versions-Vergleich',
    description: 'Alt vs. Neu - Änderungen zwischen Vertragsversionen',
    promptAddition: `
VERGLEICHSMODUS: VERSIONS-VERGLEICH (Alt → Neu)

⚠️ DIESER MODUS VERÄNDERT DEINE GESAMTE ANALYSE-LOGIK:

Vertrag 1 = ALTE Version (bisheriger Vertrag)
Vertrag 2 = NEUE Version (vorgeschlagene Änderung)

DEINE PFLICHT:
1. Kategorisiere JEDEN Unterschied als: NEU HINZUGEFÜGT | ENTFERNT | GEÄNDERT | VERSCHÄRFT | GELOCKERT
2. Bewerte JEDE Änderung: VERBESSERUNG ✅ | VERSCHLECHTERUNG ❌ | NEUTRAL ↔️
3. Bei strengths/weaknesses: Beginne mit "GEÄNDERT:", "NEU:" oder "ENTFERNT:"
4. Sage klar ob die neue Version angenommen werden soll
5. Entfernungen von Schutzklauseln = IMMER mindestens "high" severity

SCORING: Wenn neue Version Schutzklauseln ENTFERNT, darf ihr Score NICHT höher sein.
`
  },
  bestPractice: {
    name: 'Best-Practice Check',
    description: 'Prüfung gegen branchenübliche Standards',
    promptAddition: `
VERGLEICHSMODUS: BEST-PRACTICE CHECK

⚠️ DIESER MODUS VERÄNDERT DEINE GESAMTE ANALYSE-LOGIK:

Vertrag 1 = DER ZU PRÜFENDE VERTRAG (Hauptobjekt)
Vertrag 2 = REFERENZ / BENCHMARK

DEINE PFLICHT:
1. Bewerte Vertrag 1 GEGEN branchenübliche Standards — nicht nur gegen Vertrag 2
2. Nenne IMMER den Marktstandard: "Marktüblich sind 30 Tage, Ihr Vertrag hat 90 Tage"
3. Bewerte JEDE Klausel: ÜBER STANDARD 🟢 | MARKTÜBLICH 🟡 | UNTER STANDARD 🔴 | FEHLEND ⚫
4. Bei Empfehlungen: Nenne den konkreten Branchenstandard als Zielwert
5. Abweichungen >50% vom Marktstandard = mindestens "high" severity

SCORING: Score von Vertrag 1 = wie nahe am Best-Practice-Standard (100 = perfekt).
`
  },
  competition: {
    name: 'Anbieter-Vergleich',
    description: 'Vergleich von Angeboten verschiedener Anbieter',
    promptAddition: `
VERGLEICHSMODUS: ANBIETER-/WETTBEWERBS-VERGLEICH

⚠️ DIESER MODUS VERÄNDERT DEINE GESAMTE ANALYSE-LOGIK:

Beide Verträge = ANGEBOTE von verschiedenen Anbietern. Der Mandant muss sich entscheiden.

DEINE PFLICHT:
1. Vergleiche DIREKT: "Anbieter A bietet X, Anbieter B bietet Y — Vorteil: A/B"
2. PREIS-LEISTUNG ist KING: Berechne effektive Kosten (monatlich/jährlich/pro Einheit)
3. Bewerte explizit: Gesamtkosten, Leistungsumfang, Vertragsbindung, Risikoschutz, Flexibilität
4. Preisunterschiede >20% = "high", >50% = "critical"
5. EINDEUTIGE Empfehlung — kein "kommt drauf an"
6. Sage KLAR: "Anbieter 1/2 bietet das bessere Gesamtpaket weil..."

SCORING: Score = ATTRAKTIVITÄT des Angebots. Mindestens 10 Punkte Differenz wenn ein Anbieter klar besser ist.
`
  }
};

// 🧠 Smart Chunking: Intelligent text preparation for large contracts
// GPT-4o hat 128K Context → zwei Verträge à 30K Zeichen = ~15K Tokens → passt direkt
const CHUNK_CONFIG = {
  MAX_DIRECT_LENGTH: 120000,      // Under 120K chars: use directly (~95% aller Verträge)
  MAX_SINGLE_SUMMARY: 300000,     // 120K-300K chars: smart truncation (kein AI-Call)
  CHUNK_SIZE: 80000,              // For extreme texts (>300K): chunk size
  MAX_CHUNKS: 4                   // Maximum chunks to process
};

// 🧠 Smart Truncation für Extremfälle (>120K Zeichen) — kein AI-Call nötig
// 50% Anfang, 30% Mitte (Keyword-verankert), 20% Ende
function optimizeTextForComparison(text, maxLength = 120000) {
  if (text.length <= maxLength) return text;

  console.log(`🔧 Smart Truncation: ${text.length} → ${maxLength} Zeichen`);

  const beginLength = Math.floor(maxLength * 0.5);
  const middleLength = Math.floor(maxLength * 0.3);
  const endLength = Math.floor(maxLength * 0.2);

  // Anfang: Erste 50% — enthält Vertragsparteien, Definitionen, Präambel
  const beginning = text.substring(0, beginLength);

  // Ende: Letzte 20% — enthält Schlussbestimmungen, Gerichtsstand, Unterschriften
  const ending = text.substring(text.length - endLength);

  // Mitte: 30% — Keyword-verankert um die wichtigsten Abschnitte zu treffen
  const keywords = [
    'Haftung', 'Kündigung', 'Zahlung', 'Gewährleistung', 'Vertragslaufzeit',
    'Vertragsstrafe', 'Geheimhaltung', 'Datenschutz', 'Schadensersatz',
    'Kündigungsfrist', 'Zahlungsbedingungen', 'Force Majeure', 'Höhere Gewalt',
    'Wettbewerbsverbot', 'Intellectual Property', 'Urheberrecht'
  ];

  // Finde den besten Anker-Punkt in der Mitte des Texts
  const middleStart = beginLength;
  const middleEnd = text.length - endLength;
  const middleSection = text.substring(middleStart, middleEnd);

  let bestAnchor = Math.floor(middleSection.length / 2); // Fallback: exakte Mitte
  for (const keyword of keywords) {
    const idx = middleSection.indexOf(keyword);
    if (idx !== -1) {
      bestAnchor = idx;
      console.log(`  📌 Keyword-Anker gefunden: "${keyword}" bei Position ${idx}`);
      break;
    }
  }

  // Extrahiere middleLength Zeichen um den Anker herum
  const anchorStart = Math.max(0, bestAnchor - Math.floor(middleLength / 2));
  const anchorEnd = Math.min(middleSection.length, anchorStart + middleLength);
  const middle = middleSection.substring(anchorStart, anchorEnd);

  const result = beginning + '\n\n[...]\n\n' + middle + '\n\n[...]\n\n' + ending;
  console.log(`✅ Smart Truncation: ${text.length} → ${result.length} Zeichen`);
  return result;
}

async function summarizeContractChunk(text, chunkNumber = null, totalChunks = null) {
  const chunkInfo = chunkNumber ? `(Teil ${chunkNumber}/${totalChunks})` : '';

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: "Du bist ein spezialisierter Vertragsanwalt. Extrahiere alle wesentlichen Klauseln und Bedingungen. Behalte exakte Paragraphen-Referenzen (§-Nummern), Zahlen, Fristen und Beträge bei. Kürze NIEMALS konkrete Angaben."
      },
      {
        role: "user",
        content: `Erstelle eine detaillierte, strukturierte Zusammenfassung dieses Vertragstexts ${chunkInfo}.

PFLICHT — Für jeden Punkt angeben:
- Exakte Paragraphen-Referenz (z.B. §3 Abs. 2, Klausel 4.1)
- Konkrete Zahlen, Fristen, Beträge wörtlich übernehmen
- Hauptpflichten der Parteien mit Fundstelle
- Zahlungsbedingungen und Fristen mit exakten Beträgen
- Kündigungsfristen und -bedingungen mit Fristen
- Haftungsklauseln und Gewährleistung mit Obergrenzen
- Besondere Klauseln (Wettbewerbsverbot, Geheimhaltung, etc.)
- Laufzeit und Verlängerung mit exakten Daten

VERTRAGSTEXT:
"""
${text}
"""`
      }
    ],
    temperature: 0.1,
    max_tokens: 3000,
  });

  return completion.choices[0].message.content;
}

async function prepareContractText(fullText) {
  const textLength = fullText.length;

  // Stufe 1: ≤120K Zeichen → Direkt verwenden (deckt ~95% aller Verträge ab)
  if (textLength <= CHUNK_CONFIG.MAX_DIRECT_LENGTH) {
    console.log(`📄 Stufe 1: Text direkt verwendbar (${textLength} Zeichen)`);
    return fullText;
  }

  // Stufe 2: ≤300K Zeichen → Smart Truncation ohne AI-Call
  if (textLength <= CHUNK_CONFIG.MAX_SINGLE_SUMMARY) {
    console.log(`📄 Stufe 2: Smart Truncation (${textLength} Zeichen)`);
    return optimizeTextForComparison(fullText, CHUNK_CONFIG.MAX_DIRECT_LENGTH);
  }

  // Stufe 3: >300K Zeichen → Multi-Chunk AI-Summarization (Fallback, praktisch nie)
  console.log(`📄 Stufe 3: Multi-Chunk AI-Summarization (${textLength} Zeichen) — Extremfall`);

  const chunks = [];
  const chunkSize = CHUNK_CONFIG.CHUNK_SIZE;
  const maxChunks = Math.min(
    Math.ceil(textLength / chunkSize),
    CHUNK_CONFIG.MAX_CHUNKS
  );

  const step = Math.floor(textLength / maxChunks);

  for (let i = 0; i < maxChunks; i++) {
    const start = i * step;
    const end = Math.min(start + chunkSize, textLength);
    chunks.push(fullText.substring(start, end));
  }

  console.log(`🔄 Verarbeite ${chunks.length} Chunks parallel...`);

  const summaries = await Promise.all(
    chunks.map((chunk, idx) =>
      summarizeContractChunk(chunk, idx + 1, chunks.length)
    )
  );

  const combined = summaries.join('\n\n--- Abschnitt ---\n\n');
  console.log(`✅ Alle Chunks zusammengefasst (${combined.length} Zeichen)`);

  return combined;
}

// Enhanced comparison analysis function with mode support
async function analyzeContracts(contract1Text, contract2Text, userProfile = 'individual', comparisonMode = 'standard') {
  const systemPrompt = SYSTEM_PROMPTS[userProfile] || SYSTEM_PROMPTS.individual;
  const modeConfig = COMPARISON_MODES[comparisonMode] || COMPARISON_MODES.standard;

  console.log(`🎯 Vergleichs-Modus: ${modeConfig.name}`);

  // 🧠 Smart Chunking: Prepare large contracts
  console.log("🧠 Smart Chunking: Bereite Verträge vor...");
  const [preparedText1, preparedText2] = await Promise.all([
    prepareContractText(contract1Text),
    prepareContractText(contract2Text)
  ]);
  console.log(`📊 Verarbeitet: V1=${preparedText1.length} chars, V2=${preparedText2.length} chars`);

  const analysisPrompt = `
${modeConfig.promptAddition}

AUFGABE: Erstelle einen professionellen Vertragsvergleich auf dem Niveau einer bezahlten anwaltlichen Erstberatung.

VERTRAG 1:
"""
${preparedText1}
"""

VERTRAG 2:
"""
${preparedText2}
"""

DEINE AUFGABE:
Du sitzt deinem Mandanten gegenüber. Er hat dir zwei Verträge auf den Tisch gelegt und bezahlt dich für eine vollständige, gründliche Erstberatung. Er erwartet, dass du JEDEN Paragraphen, JEDEN Satz, JEDE Zahl in beiden Verträgen vergleichst und ihm klar sagst, was Sache ist.

SCHRITT 1 — PARAGRAF-FÜR-PARAGRAF-VERGLEICH (differences):
Gehe BEIDE Verträge Paragraf für Paragraf durch. Vergleiche JEDEN einzelnen Punkt:

□ Vertragsparteien und Definitionen
□ Vertragsgegenstand / Leistungsumfang — Was genau wird geschuldet? Welche Teilleistungen?
□ Leistungsart — Dienstvertrag vs. Werkvertrag?
□ Vertragslaufzeit — Befristet/unbefristet? Mindestlaufzeit? Automatische Verlängerung?
□ Kündigungsfristen — Frist, Form, Zeitpunkt? Außerordentliche Kündigung?
□ Vergütung / Preise — Höhe, Berechnungsmethode, alle Gebühren einzeln vergleichen
□ Zahlungsbedingungen — Fristen, Verzugszinsen, Skonto?
□ Preisanpassung — Erlaubt? Wie oft? An welchen Index gekoppelt?
□ Mindestabnahme / Volumina / Limits
□ SLA / Verfügbarkeit / Reaktionszeiten
□ Haftung — Höhe, Ausschlüsse, Kardinalpflichten, Vorsatz/Fahrlässigkeit
□ Gewährleistung — Fristen, Umfang, Nachbesserung
□ Geheimhaltung / NDA — Dauer, Umfang, Vertragsstrafen
□ Wettbewerbsverbot — Existenz, Dauer, Reichweite
□ Datenschutz / DSGVO — Regelungstiefe, AVV, Unterauftragnehmer
□ IP-Rechte / Urheberrecht — Wem gehört was?
□ Versicherungen / Sicherheiten
□ Force Majeure / Höhere Gewalt
□ Gerichtsstand und Rechtswahl
□ Schriftformklausel, Salvatorische Klausel, Nebenabreden
□ JEDER weitere Paragraf, der in einem der beiden Verträge vorkommt

REGEL: Wenn beide Verträge eine Klausel IDENTISCH oder SINNGEMÄSS GLEICH regeln → NICHT aufnehmen. Nur ECHTE Abweichungen, fehlende Klauseln oder unterschiedliche Konditionen sind Unterschiede.

Sei dabei GRÜNDLICH: Wenn Vertrag 1 in §5 eine Gebühr von 2,90% nennt und Vertrag 2 keine Gebühr spezifiziert — das ist ein Unterschied. Wenn Vertrag 1 Mahnwesen einschließt und Vertrag 2 nicht — das ist ein Unterschied. Wenn ein Vertrag eine Klausel hat, die im anderen komplett fehlt — das ist ein Unterschied. Unterschiedliche Formulierungen mit gleichem Inhalt sind KEIN Unterschied.

Finde JEDEN echten Unterschied — nicht mehr, nicht weniger. Bei kurzen Konditionenblättern können das 3 sein, bei umfangreichen Verträgen 15+. Erfinde KEINE künstlichen Unterschiede, um die Liste aufzublähen. Aber überspringe auch NICHTS, nur weil es klein erscheint — auch ein unterschiedlicher Verzugszinssatz oder eine andere Schriftformklausel ist relevant.

Für JEDEN Unterschied dokumentiere die folgenden Felder. Hier ist ein PERFEKTES BEISPIEL, das exakt den Ton und die Tiefe zeigt, die du für JEDEN Unterschied liefern musst:

BEISPIEL-UNTERSCHIED (so muss JEDER deiner Einträge klingen):
{
  "category": "Leistungsumfang",
  "section": "§11 Abs. 1",
  "contract1": "GRENKEFACTORING übernimmt den Zahlungseinzug, das Mahnwesen und das außergerichtliche Inkasso bis einschließlich Mahnbescheid.",
  "contract2": "Keine Regelung vorhanden",
  "explanation": "Hier liegt ein ganz wesentlicher Unterschied: Bei Vertrag 1 kümmert sich GRENKEFACTORING komplett um das Mahnwesen — wenn ein Debitor nicht zahlt, schreiben die die Mahnungen, überwachen die Fristen und treiben die Forderung bis zum Mahnbescheid ein. Bei Vertrag 2 müssen Sie das alles selbst machen. Konkret heißt das für Sie: Pro säumigem Debitor rechnen Sie mit 2-4 Stunden Aufwand für Mahnschreiben, Fristenüberwachung und Telefonate, plus 500 bis 1.500 EUR Anwaltskosten falls es zum Mahnbescheid kommt. Wenn Sie monatlich 20+ Forderungen abtreten und nur 10% davon Zahlungsverzug haben, sprechen wir von 2-3 Fällen pro Monat — das sind schnell 15.000 bis 20.000 EUR Mehrkosten im Jahr. Dieser Unterschied allein kann den auf den ersten Blick günstigeren Gebührensatz von Vertrag 2 komplett auffressen.",
  "severity": "high",
  "impact": "Ohne vertragliches Mahnwesen trägt der Factoringkunde das volle Beitreibungsrisiko und die Kosten der Rechtsverfolgung selbst (§§ 286, 288 BGB).",
  "recommendation": "Verhandeln Sie in Vertrag 2 die Aufnahme einer Mahnwesen-Klausel analog zu §11 Abs. 1 Vertrag 1, mindestens bis zum außergerichtlichen Mahnverfahren."
}

REGELN FÜR JEDEN UNTERSCHIED:
- "category": Rechtskategorie
- "section": Exakte Fundstelle. Bei fehlenden Klauseln: die Fundstelle des Vertrags, der die Klausel HAT
- "contract1"/"contract2": Wörtliches Zitat (max 2 Sätze). Bei fehlender Klausel: "Keine Regelung vorhanden"
- "explanation": 4-6 Sätze wie im Beispiel oben. Sprich den Mandanten DIREKT an ("Für Sie heißt das...", "Sie müssen dann..."). Nenne KONKRETE Zahlen, Szenarien, EUR-Beträge. VERBOTEN: "Dies kann Auswirkungen haben", "Überlegen Sie ob", "Erwägen Sie", "Dies sollte geprüft werden", "Dies bedeutet einen umfassenderen Service". Wenn du so einen Satz schreiben willst, frage dich: WAS GENAU passiert? WIE VIEL kostet es? WANN tritt es ein? Und schreibe DAS stattdessen.
- "severity": "low"|"medium"|"high"|"critical"
- "impact": 1 Satz juristische Einordnung MIT Gesetzesverweisen (§§ BGB, HGB, DSGVO). Nicht ohne §§!
- "recommendation": Eine KONKRETE Aktion. Nicht "Erwägen Sie" oder "Prüfen Sie", sondern "Streichen Sie §5 Abs. 3" oder "Verhandeln Sie in Vertrag 2 eine Gebühr von max. 3,0% analog zu §4 Vertrag 1".

SCHRITT 2 — STÄRKEN & SCHWÄCHEN (je 3-5 pro Vertrag):
Benenne die wesentlichen Stärken und Schwächen MIT konkreten Zahlen und Fundstellen.
GUT: "Klare Haftungsbegrenzung auf max. EUR 102.000 p.a. (§5 Abs. 2) — schützt Sie vor existenzbedrohenden Forderungen"
GUT: "Mahnwesen inklusive bis Mahnbescheid (§11) — spart Ihnen 15.000-20.000 EUR/Jahr an Beitreibungskosten"
SCHLECHT: "Gute Haftungsklausel" (zu vage, keine Zahlen)
SCHLECHT: "Keine spezifizierte Flatrate-Gebühr, was Flexibilität bieten kann" (fehlende Gebühren sind eine SCHWÄCHE, kein Vorteil!)

SCHRITT 3 — SCORE (0-100):
- 0-30: Stark mangelhaft, viele fehlende oder gefährliche Klauseln
- 31-50: Unterdurchschnittlich, wesentliche Schwächen
- 51-70: Durchschnittlich, solide Grundstruktur mit Verbesserungsbedarf
- 71-85: Gut, professionell formuliert mit kleineren Lücken
- 86-100: Exzellent, umfassend und ausgewogen

SCHRITT 4 — GESAMTURTEIL (overallRecommendation.reasoning):
Schreibe 6-8 Sätze als klares Fazit, wie du es deinem Mandanten am Ende der Beratung ins Gesicht sagen würdest. Beispiel für den richtigen Ton:
"Meine klare Empfehlung ist Vertrag 2. Er bietet Ihnen mit der festgelegten Flatrate von 2,90% eine kalkulierbare Kostenstruktur und der Sicherungseinbehalt von 10% schützt Sie bei Forderungsausfällen. Vertrag 1 hat hier gefährliche Lücken — ohne definierte Gebühren können die Kosten je nach Auslegung deutlich höher ausfallen. ABER: Vertrag 2 hat einen gravierenden Nachteil beim Mahnwesen. Sie müssen vor Unterzeichnung zwei Dinge verhandeln: Erstens, GRENKEFACTORING muss das Mahnwesen übernehmen — sonst zahlen Sie dafür 15.000-20.000 EUR pro Jahr extra. Zweitens, der Selbstbehalt von 1.000 EUR sollte auf 500 EUR reduziert werden. Unterschreiben Sie Vertrag 2, aber erst wenn diese beiden Punkte geklärt sind."
Schreibe DEIN Fazit in diesem Stil — direkt, mit Zahlen, mit klarer Handlungsanweisung.

SCHRITT 5 — ZUSAMMENFASSUNG (summary):
4-6 Sätze für einen Nicht-Juristen. Beginne mit dem Ergebnis: "Vertrag X ist der bessere Vertrag, weil...". Dann die 2-3 wichtigsten Unterschiede in Alltagssprache. Ende mit einer klaren Handlungsanweisung.

Antworte NUR mit validem JSON:

{
  "differences": [
    {
      "category": "string",
      "section": "string",
      "contract1": "string",
      "contract2": "string",
      "severity": "low|medium|high|critical",
      "explanation": "string",
      "impact": "string",
      "recommendation": "string"
    }
  ],
  "contract1Analysis": {
    "strengths": ["string"],
    "weaknesses": ["string"],
    "riskLevel": "low|medium|high",
    "score": number
  },
  "contract2Analysis": {
    "strengths": ["string"],
    "weaknesses": ["string"],
    "riskLevel": "low|medium|high",
    "score": number
  },
  "overallRecommendation": {
    "recommended": 1 oder 2,
    "reasoning": "string",
    "confidence": number
  },
  "summary": "string"
}

Fokus-Profil: ${userProfile}
`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `Du bist ein erfahrener Vertragsanwalt mit 20+ Jahren Praxis im deutschen Vertragsrecht. Dein Mandant bezahlt dich 400 EUR/Stunde für eine gründliche Erstberatung. Er erwartet, dass du JEDEN Paragraphen beider Verträge Satz für Satz durchgehst und ihm klar sagst, was Sache ist. ${systemPrompt}

DEIN KOMMUNIKATIONSSTIL:
- Du sprichst direkt mit deinem Mandanten: "Für Sie bedeutet das...", "Sie müssen hier aufpassen...", "Das kostet Sie im Streitfall..."
- Du nennst konkrete Zahlen, Szenarien und Beispiele aus der Praxis
- Du bist ehrlich und klar — wenn ein Vertrag schlecht ist, sagst du das deutlich
- Du sagst nicht "Dies könnte problematisch sein" — du sagst "Das IST ein Problem, weil X passieren wird"
- Du vermeidest JEDE Form von generischem Fülltext oder akademischem Geschwurbel
- Wenn eine Klausel fehlt, erklärst du welche gesetzliche Regelung dann greift (z.B. "Ohne Haftungsbegrenzung haften Sie nach §276 BGB unbeschränkt — das kann existenzbedrohend sein")

DEINE GRÜNDLICHKEIT:
- Gehe JEDEN Paragraphen und JEDE Klausel beider Verträge durch — ohne Ausnahme
- Vergleiche auch Nebenabreden, Anhänge, Konditionenblätter, Fußnoten
- Fehlende Klauseln sind oft die WICHTIGSTEN Unterschiede — wenn nur ein Vertrag etwas regelt, ist das immer relevant
- Unterschiedliche Zahlen (Fristen, Beträge, Prozentsätze, Limits) sind IMMER ein Unterschied
- Die Anzahl der Unterschiede hängt vom Vertrag ab — kurze Konditionenblätter haben vielleicht 3, umfangreiche Verträge 15+. Finde ALLE echten Unterschiede, aber erfinde keine künstlichen
- Identische oder sinngemäß gleiche Klauseln gehören NICHT in die differences-Liste
- Antworte ausschließlich mit validem JSON`
        },
        { role: "user", content: analysisPrompt }
      ],
      temperature: 0.15,
      max_tokens: 16384,
      response_format: { type: "json_object" },
    });

    const response = completion.choices[0].message.content;
    const analysis = JSON.parse(response);
    
    // Validate and enhance the analysis
    return enhanceAnalysis(analysis);
    
  } catch (error) {
    console.error("❌ OpenAI API Fehler:", error);
    throw new Error("Fehler bei der KI-Analyse: " + error.message);
  }
}

// Function to enhance and validate the analysis
function enhanceAnalysis(analysis) {
  // Log für Transparenz — kein fester Schwellenwert, Qualität zählt
  console.log(`📊 Analyse-Ergebnis: ${analysis.differences?.length || 0} Unterschiede gefunden`);

  // Ensure required fields exist
  if (!analysis.differences) analysis.differences = [];

  // Filter out "differences" that are actually identical clauses (GPT sometimes includes them)
  const beforeCount = analysis.differences.length;

  // Pattern-based detection: phrases that signal "no real difference"
  const identicalPatterns = [
    /beide verträge.*identisch/i,
    /keine änderung erforderlich/i,
    /in beiden verträgen gleich/i,
    /identische regelung/i,
    /sinngemäß gleich/i,
    /keine abweichung/i,
    /übereinstimmend geregelt/i,
    /stimmen überein/i,
    /beide verträge (sehen|regeln|enthalten|haben|verfügen|beinhalten|legen|setzen|bestimmen|schreiben).{0,60}(gleich|identisch|ähnlich|übereinstimmend|dasselbe|dieselbe)/i,
    /beide verträge regeln.{0,80}ähnlich/i,
    /beide verträge sehen.{0,80}vor\b/i,
  ];

  // Content-based detection: if contract1 and contract2 quotes are nearly identical
  const normalizeText = (text) => (text || '').toLowerCase().replace(/[^a-zäöüß0-9]/g, '');
  const textSimilarity = (a, b) => {
    const na = normalizeText(a);
    const nb = normalizeText(b);
    if (!na || !nb || na.length < 10 || nb.length < 10) return 0;
    if (na === nb) return 1;
    // Simple check: if one contains the other or they share >90% characters
    const shorter = na.length <= nb.length ? na : nb;
    const longer = na.length > nb.length ? na : nb;
    if (longer.includes(shorter)) return shorter.length / longer.length;
    // Character overlap ratio
    let matches = 0;
    for (let i = 0; i < shorter.length; i++) {
      if (longer.includes(shorter.substring(i, i + 8)) && i + 8 <= shorter.length) {
        matches += 8;
        i += 7;
      }
    }
    return matches / longer.length;
  };

  analysis.differences = analysis.differences.filter(diff => {
    // Check 1: Pattern-based detection in explanation/impact/recommendation
    const textsToCheck = [diff.explanation || '', diff.impact || '', diff.recommendation || ''];
    const matchesPattern = textsToCheck.some(text =>
      identicalPatterns.some(pattern => pattern.test(text))
    );

    // Check 2: Contract quotes are nearly identical (>85% similar)
    const quoteSimilarity = textSimilarity(diff.contract1, diff.contract2);
    const quotesIdentical = quoteSimilarity > 0.85;

    if (matchesPattern || quotesIdentical) {
      const reason = matchesPattern ? 'Pattern-Match' : `Zitate ${Math.round(quoteSimilarity * 100)}% identisch`;
      console.log(`🔍 Identische Klausel gefiltert: "${diff.category}" (${diff.section}) — ${reason}`);
      return false;
    }
    return true;
  });
  if (beforeCount !== analysis.differences.length) {
    console.log(`🧹 ${beforeCount - analysis.differences.length} identische Klauseln gefiltert (${beforeCount} → ${analysis.differences.length})`);
  }

  if (!analysis.contract1Analysis) analysis.contract1Analysis = { strengths: [], weaknesses: [], riskLevel: 'medium', score: 50 };
  if (!analysis.contract2Analysis) analysis.contract2Analysis = { strengths: [], weaknesses: [], riskLevel: 'medium', score: 50 };
  if (!analysis.overallRecommendation) analysis.overallRecommendation = { recommended: 1, reasoning: '', confidence: 50 };

  // Ensure scores are in valid range
  analysis.contract1Analysis.score = Math.max(0, Math.min(100, Number(analysis.contract1Analysis.score) || 50));
  analysis.contract2Analysis.score = Math.max(0, Math.min(100, Number(analysis.contract2Analysis.score) || 50));

  // Ensure confidence is in valid range
  analysis.overallRecommendation.confidence = Math.max(0, Math.min(100, Number(analysis.overallRecommendation.confidence) || 75));

  // Add categories array
  analysis.categories = [...new Set(analysis.differences.map(d => d.category))];

  return analysis;
}

// 📡 SSE Progress Helper
const sendProgress = (res, step, progress, message, isSSE = false) => {
  if (isSSE && !res.destroyed) {
    res.write(`data: ${JSON.stringify({ type: 'progress', step, progress, message })}\n\n`);
  }
  console.log(`📊 [${progress}%] ${step}: ${message}`);
};

// Main comparison endpoint with SSE support
router.post("/", verifyToken, upload.fields([
  { name: 'file1', maxCount: 1 },
  { name: 'file2', maxCount: 1 }
]), async (req, res) => {
  // Check if client wants SSE (streaming progress)
  const wantsSSE = req.headers.accept?.includes('text/event-stream') || req.query.stream === 'true';

  if (wantsSSE) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
    res.flushHeaders();
  }

  // 🔌 Client-Disconnect-Handling: Flag setzen + Counter aufräumen
  let clientDisconnected = false;
  res.on('close', () => {
    if (!res.writableFinished) {
      clientDisconnected = true;
      console.log('🔌 Client hat Verbindung getrennt (Compare)');
      const dcUserId = req.user?.userId;
      if (dcUserId) {
        const active = activeComparisons.get(dcUserId) || 1;
        if (active <= 1) activeComparisons.delete(dcUserId);
        else activeComparisons.set(dcUserId, active - 1);
      }
    }
  });

  try {
    req._startTime = Date.now();
    await ensureDb();
    console.log("🚀 Contract comparison started" + (wantsSSE ? " (SSE Mode)" : ""));
    sendProgress(res, 'init', 5, 'Vergleich wird gestartet...', wantsSSE);

    // Check if files were uploaded
    if (!req.files || !req.files.file1 || !req.files.file2) {
      const error = { message: "Beide Vertragsdateien müssen hochgeladen werden" };
      if (wantsSSE) {
        res.write(`data: ${JSON.stringify({ type: 'error', ...error })}\n\n`);
        return res.end();
      }
      return res.status(400).json(error);
    }

    sendProgress(res, 'auth', 10, 'Authentifizierung wird geprüft...', wantsSSE);

    // Get user info and check premium status
    const user = await usersCollection.findOne({ _id: new ObjectId(req.user.userId) });
    if (!user) {
      const error = { message: "Nutzer nicht gefunden" };
      if (wantsSSE) {
        res.write(`data: ${JSON.stringify({ type: 'error', ...error })}\n\n`);
        return res.end();
      }
      return res.status(404).json(error);
    }

    const isPremium = user.subscriptionActive === true || user.isPremium === true;
    if (!isPremium) {
      const error = { message: "Premium-Funktion erforderlich" };
      if (wantsSSE) {
        res.write(`data: ${JSON.stringify({ type: 'error', ...error })}\n\n`);
        return res.end();
      }
      return res.status(403).json(error);
    }

    // 🛡️ Concurrent rate limit: max 2 parallel comparisons per user
    const userId = req.user.userId;
    const currentActive = activeComparisons.get(userId) || 0;
    if (currentActive >= 2) {
      console.warn(`⚠️ Rate limit: User ${userId} has ${currentActive} active comparisons`);
      const error = { message: 'Maximal 2 gleichzeitige Vergleiche möglich. Bitte warten Sie, bis der laufende Vergleich abgeschlossen ist.' };
      if (wantsSSE) {
        res.write(`data: ${JSON.stringify({ type: 'error', ...error })}\n\n`);
        return res.end();
      }
      return res.status(429).json(error);
    }
    activeComparisons.set(userId, currentActive + 1);

    // Check usage limits
    const plan = user.subscriptionPlan || "free";
    const compareCount = user.compareCount || 0;

    // Limit aus zentraler Konfiguration (subscriptionPlans.js)
    const limit = getFeatureLimit(plan, 'compare');

    if (compareCount >= limit && !isEnterpriseOrHigher(plan)) {
      const error = { message: "❌ Vergleichs-Limit erreicht. Bitte Paket upgraden." };
      if (wantsSSE) {
        res.write(`data: ${JSON.stringify({ type: 'error', ...error })}\n\n`);
        return res.end();
      }
      return res.status(403).json(error);
    }

    // Get user profile from request
    const userProfile = req.body.userProfile || 'individual';
    if (!['individual', 'freelancer', 'business'].includes(userProfile)) {
      const error = { message: "Ungültiges Nutzerprofil" };
      if (wantsSSE) {
        res.write(`data: ${JSON.stringify({ type: 'error', ...error })}\n\n`);
        return res.end();
      }
      return res.status(400).json(error);
    }

    // 🎯 Get comparison mode from request
    const comparisonMode = req.body.comparisonMode || 'standard';
    const validModes = ['standard', 'version', 'bestPractice', 'competition'];
    if (!validModes.includes(comparisonMode)) {
      const error = { message: "Ungültiger Vergleichs-Modus" };
      if (wantsSSE) {
        res.write(`data: ${JSON.stringify({ type: 'error', ...error })}\n\n`);
        return res.end();
      }
      return res.status(400).json(error);
    }

    const file1 = req.files.file1[0];
    const file2 = req.files.file2[0];

    console.log(`📄 Processing files: ${file1.originalname} & ${file2.originalname} (Mode: ${comparisonMode})`);
    sendProgress(res, 'mode', 12, `Modus: ${COMPARISON_MODES[comparisonMode].name}`, wantsSSE);
    sendProgress(res, 'parsing', 15, 'PDFs werden gelesen...', wantsSSE);

    // Parse PDF contents (async for better performance)
    const [buffer1, buffer2] = await Promise.all([
      fsPromises.readFile(file1.path),
      fsPromises.readFile(file2.path)
    ]);

    sendProgress(res, 'extracting', 25, 'Text wird extrahiert...', wantsSSE);

    const [extracted1, extracted2] = await Promise.all([
      extractTextFromBuffer(buffer1, file1.mimetype),
      extractTextFromBuffer(buffer2, file2.mimetype)
    ]);

    let contract1Text = extracted1.text.trim();
    let contract2Text = extracted2.text.trim();

    // OCR-Fallback für gescannte PDFs mit wenig/keinem Text
    const ocrFallback = async (buffer, mimetype, currentText, fileName) => {
      const isPdf = mimetype === 'application/pdf';
      const textTooShort = !currentText || currentText.length < 200;
      if (isPdf && textTooShort) {
        console.log(`🔍 [Compare] Wenig Text in ${fileName} (${currentText.length} Zeichen) — versuche OCR-Fallback...`);
        try {
          const ocrResult = await pdfExtractor.extractTextWithOCRFallback(buffer, {
            mimetype,
            enableOCR: true,
            ocrThreshold: 50,
            userId: req.user?.userId
          });
          if (ocrResult.success && ocrResult.text.trim().length > currentText.length) {
            console.log(`✅ [Compare] OCR-Fallback erfolgreich für ${fileName}: ${ocrResult.text.length} Zeichen`);
            return ocrResult.text.trim();
          }
        } catch (ocrErr) {
          console.warn(`⚠️ [Compare] OCR-Fallback fehlgeschlagen für ${fileName}: ${ocrErr.message}`);
        }
      }
      return currentText;
    };

    [contract1Text, contract2Text] = await Promise.all([
      ocrFallback(buffer1, file1.mimetype, contract1Text, file1.originalname),
      ocrFallback(buffer2, file2.mimetype, contract2Text, file2.originalname)
    ]);

    if (!contract1Text || !contract2Text) {
      const emptyFiles = [];
      if (!contract1Text) emptyFiles.push(file1.originalname);
      if (!contract2Text) emptyFiles.push(file2.originalname);
      const error = {
        message: "Mindestens eine Datei konnte nicht gelesen werden oder ist leer",
        details: `Betroffene Datei(en): ${emptyFiles.join(', ')}. Falls es sich um gescannte PDFs handelt, bitte in besserer Qualität erneut scannen.`
      };
      if (wantsSSE) {
        res.write(`data: ${JSON.stringify({ type: 'error', ...error })}\n\n`);
        return res.end();
      }
      return res.status(400).json(error);
    }

    console.log(`📝 Text extracted: Contract 1 (${contract1Text.length} chars), Contract 2 (${contract2Text.length} chars)`);

    // 🛡️ Same-file detection — warn if both files have identical content
    if (contract1Text === contract2Text) {
      console.warn('⚠️ Same file detected: Both contracts have identical text');
      const error = { message: 'Beide Dateien haben identischen Inhalt. Bitte laden Sie zwei verschiedene Verträge hoch.' };
      if (wantsSSE) {
        res.write(`data: ${JSON.stringify({ type: 'error', ...error })}\n\n`);
        return res.end();
      }
      return res.status(400).json(error);
    }

    sendProgress(res, 'chunking', 35, 'Verträge werden vorbereitet...', wantsSSE);

    // 🆕 V2 Pipeline: Check query param OR body field
    const useV2 = req.query.version === '2' || req.body?.version === '2';
    const perspective = req.body.perspective || 'neutral';
    console.log(`📊 Compare: V2=${useV2}, Perspektive=${perspective}`);

    let analysisResult;

    if (useV2) {
      // === V2 PIPELINE ===
      console.log(`🆕 Using Compare V2 Pipeline (Perspektive: ${perspective})`);

      try {
        analysisResult = await runCompareV2Pipeline(
          contract1Text,
          contract2Text,
          perspective,
          comparisonMode,
          userProfile,
          (step, pct, msg) => sendProgress(res, step, pct, msg, wantsSSE)
        );

        // Add mode info
        analysisResult.comparisonMode = {
          id: comparisonMode,
          name: COMPARISON_MODES[comparisonMode].name,
          description: COMPARISON_MODES[comparisonMode].description
        };
      } catch (v2Error) {
        const isTimeout = v2Error.message?.includes('Timeout');
        console.error(`❌ V2 Pipeline fehlgeschlagen (${isTimeout ? 'TIMEOUT' : 'ERROR'}):`, v2Error.message);
        console.error(`   Textlängen: V1=${contract1Text.length} Zeichen, V2=${contract2Text.length} Zeichen`);
        if (!isTimeout) {
          console.error(v2Error.stack?.split('\n').slice(0, 3).join('\n'));
        }
        sendProgress(res, 'fallback', 50, `Erweiterte Analyse nicht verfügbar (${isTimeout ? 'Timeout' : 'Fehler'}), Standardvergleich wird durchgeführt...`, wantsSSE);

        // Fallback to V1
        analysisResult = await analyzeContracts(contract1Text, contract2Text, userProfile, comparisonMode);
        analysisResult.comparisonMode = {
          id: comparisonMode,
          name: COMPARISON_MODES[comparisonMode].name,
          description: COMPARISON_MODES[comparisonMode].description
        };
        analysisResult._v2Fallback = true;
        analysisResult._v2FallbackReason = isTimeout ? 'timeout' : v2Error.message;
      }
    } else {
      // === V1 PIPELINE (unchanged) ===
      sendProgress(res, 'analyzing', 50, `KI-Analyse läuft (${COMPARISON_MODES[comparisonMode].name})...`, wantsSSE);
      console.log("🤖 Starting AI analysis (V1)...");
      analysisResult = await analyzeContracts(contract1Text, contract2Text, userProfile, comparisonMode);

      // Add mode info to result
      analysisResult.comparisonMode = {
        id: comparisonMode,
        name: COMPARISON_MODES[comparisonMode].name,
        description: COMPARISON_MODES[comparisonMode].description
      };
    }

    sendProgress(res, 'saving', 85, 'Ergebnis wird gespeichert...', wantsSSE);
    // Compare-Uploads werden NICHT in die contracts-Collection gespeichert
    // (sonst tauchen sie als leere Einträge auf der Vertragsverwaltung auf)
    // Die Vergleichs-Ergebnisse werden unten als compare_history gespeichert.

    // Upload PDFs to S3 for history access
    let file1S3Key = null;
    let file2S3Key = null;
    try {
      const userId = req.user.userId;
      const ts = Date.now();
      file1S3Key = `compare/${userId}/${ts}_1_${fixUtf8Filename(file1.originalname)}`;
      file2S3Key = `compare/${userId}/${ts}_2_${fixUtf8Filename(file2.originalname)}`;

      const [buf1, buf2] = await Promise.all([
        fsPromises.readFile(file1.path),
        fsPromises.readFile(file2.path)
      ]);

      await Promise.all([
        s3.send(new PutObjectCommand({
          Bucket: process.env.S3_BUCKET_NAME,
          Key: file1S3Key,
          Body: buf1,
          ContentType: file1.mimetype || 'application/pdf',
        })),
        s3.send(new PutObjectCommand({
          Bucket: process.env.S3_BUCKET_NAME,
          Key: file2S3Key,
          Body: buf2,
          ContentType: file2.mimetype || 'application/pdf',
        }))
      ]);
      console.log(`📦 Compare PDFs saved to S3: ${file1S3Key}, ${file2S3Key}`);
    } catch (s3Err) {
      console.error("⚠️ Warning: Could not save compare PDFs to S3:", s3Err.message);
      file1S3Key = null;
      file2S3Key = null;
    }

    // Generate follow-up questions BEFORE history save so they're persisted
    try {
      const followUps = await Promise.race([
        generateCompareFollowUps(analysisResult),
        new Promise(resolve => setTimeout(() => resolve(null), 3000)),
      ]);
      if (followUps) analysisResult.followUpQuestions = followUps;
    } catch (fuErr) {
      console.warn('⚠️ Follow-up generation skipped:', fuErr.message);
    }

    // Log the comparison activity with full result for history feature
    try {
      const historyDoc = {
        userId: new ObjectId(req.user.userId),
        action: "compare_contracts",
        tool: "contract_compare",
        userProfile,
        comparisonMode,
        file1Name: fixUtf8Filename(file1.originalname),
        file2Name: fixUtf8Filename(file2.originalname),
        file1S3Key,
        file2S3Key,
        recommendedContract: analysisResult.overallRecommendation.recommended,
        confidence: analysisResult.overallRecommendation.confidence,
        differencesCount: analysisResult.differences?.length || 0,
        // Store full result for history reload feature
        fullResult: analysisResult,
        version: useV2 ? 2 : 1,
        perspective: useV2 ? perspective : undefined,
        timestamp: new Date()
      };
      await contractsCollection.insertOne(historyDoc);
    } catch (logError) {
      console.error("⚠️ Warning: Could not log comparison activity:", logError.message);
    }

    // Update usage count
    try {
      await usersCollection.updateOne(
        { _id: user._id },
        { $inc: { compareCount: 1 } }
      );
    } catch (updateError) {
      console.error("⚠️ Warning: Could not update usage count:", updateError.message);
    }

    // 💰 Cost Tracking — estimate based on pipeline version and diff count
    try {
      const diffCount = analysisResult.differences?.length || 0;
      // V2 pipeline: ~2 Phase A calls + up to 28 Schicht 3 calls + 1 Schicht 4 call
      // Estimated ~4000 tokens per call average, GPT-4o pricing
      const estimatedCalls = useV2 ? (2 + Math.min(diffCount + 8, 28) + 1) : 2;
      const estimatedTokens = estimatedCalls * 4000;
      const estimatedCost = estimatedTokens * 0.0000025 + (estimatedTokens * 0.4) * 0.00001; // gpt-4o input + output estimate
      const costTracking = getCostTrackingService();
      costTracking.trackAPICall({
        userId: req.user.userId,
        contractId: null,
        model: 'gpt-4o',
        feature: 'compare',
        promptTokens: Math.round(estimatedTokens * 0.6),
        completionTokens: Math.round(estimatedTokens * 0.4),
        totalTokens: estimatedTokens,
        estimatedCost: parseFloat(estimatedCost.toFixed(4)),
        duration: Date.now() - (req._startTime || Date.now()),
      }).catch(err => console.warn('⚠️ Compare cost tracking failed:', err.message));
    } catch (costErr) {
      console.warn('⚠️ Compare cost tracking error:', costErr.message);
    }

    // 🛡️ DSGVO-Compliance: Sofortige Dateilöschung nach Verarbeitung
    sendProgress(res, 'cleanup', 95, 'Aufräumen...', wantsSSE);
    console.log("🗑️ Lösche temporäre Dateien (DSGVO-konform)...");
    try {
      await Promise.all([
        fsPromises.unlink(file1.path),
        fsPromises.unlink(file2.path)
      ]);
      console.log("✅ Temporäre Dateien gelöscht");
    } catch (cleanupErr) {
      console.error("⚠️ File cleanup warning:", cleanupErr.message);
    }

    console.log(`✅ Comparison completed: version=${analysisResult.version || 1}, v2Fallback=${analysisResult._v2Fallback || false}, risks=${analysisResult.risks?.length || 0}, recs=${analysisResult.recommendations?.length || 0}, diffs=${analysisResult.differences?.length || 0}`);

    // Decrement active comparison counter
    const activeNow = activeComparisons.get(userId) || 1;
    if (activeNow <= 1) activeComparisons.delete(userId);
    else activeComparisons.set(userId, activeNow - 1);

    // Send final result
    if (wantsSSE) {
      sendProgress(res, 'complete', 100, 'Analyse abgeschlossen!', true);
      res.write(`data: ${JSON.stringify({ type: 'result', data: analysisResult })}\n\n`);
      res.end();
    } else {
      res.json(analysisResult);
    }

  } catch (error) {
    // Decrement active comparison counter on error (nur wenn nicht schon durch Disconnect bereinigt)
    if (!clientDisconnected) {
      const errUserId = req.user?.userId;
      if (errUserId) {
        const activeNow = activeComparisons.get(errUserId) || 1;
        if (activeNow <= 1) activeComparisons.delete(errUserId);
        else activeComparisons.set(errUserId, activeNow - 1);
      }
    }

    console.error("❌ Comparison error:", error);

    // Clean up files on error (async)
    if (req.files) {
      const cleanupPromises = Object.values(req.files).flat().map(file =>
        fsPromises.unlink(file.path).catch(err =>
          console.log("🗑️ Error cleanup warning:", err.message)
        )
      );
      await Promise.all(cleanupPromises);
    }

    const errorResponse = {
      message: "Fehler beim Vertragsvergleich: " + (error.message || "Unbekannter Fehler")
    };

    if (wantsSSE && !res.destroyed) {
      res.write(`data: ${JSON.stringify({ type: 'error', ...errorResponse })}\n\n`);
      res.end();
    } else if (!res.headersSent) {
      res.status(500).json(errorResponse);
    }
  }
});

// 🆕 V2: Re-analyze with different perspective (reuses Phase A maps)
router.post("/re-analyze", verifyToken, async (req, res) => {
  const wantsSSE = req.headers.accept?.includes('text/event-stream') || req.query.stream === 'true';

  if (wantsSSE) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();
  }

  try {
    await ensureDb();

    const user = await usersCollection.findOne({ _id: new ObjectId(req.user.userId) });
    if (!user) {
      const error = { message: "Nutzer nicht gefunden" };
      if (wantsSSE) { res.write(`data: ${JSON.stringify({ type: 'error', ...error })}\n\n`); return res.end(); }
      return res.status(404).json(error);
    }

    const isPremium = user.subscriptionActive === true || user.isPremium === true;
    if (!isPremium) {
      const error = { message: "Premium-Funktion erforderlich" };
      if (wantsSSE) { res.write(`data: ${JSON.stringify({ type: 'error', ...error })}\n\n`); return res.end(); }
      return res.status(403).json(error);
    }

    const { contractMap, perspective, comparisonMode, userProfile, contractTexts } = req.body;

    if (!contractMap?.contract1 || !contractMap?.contract2) {
      const error = { message: "Vertragskarten fehlen für die Re-Analyse" };
      if (wantsSSE) { res.write(`data: ${JSON.stringify({ type: 'error', ...error })}\n\n`); return res.end(); }
      return res.status(400).json(error);
    }

    const validPerspectives = ['auftraggeber', 'auftragnehmer', 'neutral'];
    const selectedPerspective = validPerspectives.includes(perspective) ? perspective : 'neutral';

    console.log(`🔄 Re-Analyse: Perspektive → ${selectedPerspective}`);
    sendProgress(res, 'comparing', 30, `Re-Analyse mit Perspektive: ${selectedPerspective}...`, wantsSSE);

    const {
      buildV2Response, buildDeterministicDifferences, groupDeterministicDiffs,
      mergeAllDifferences, enforceScoreDifferentiation, runClauseByClauseComparison,
      synthesizeComparison, extractAllValuesFromRawText,
      detectDocumentCategory, getDocTypeConfig, detectCompareIntent,
      runHolisticComparePass, validateHolisticOutput, adaptSectionsToLegacySchema,
      calculateScoresFromDiffs,
    } = require("../services/compareAnalyzer");
    const { runBenchmarkComparison } = require("../services/marketBenchmarks");

    const text1 = contractTexts?.text1 || '';
    const text2 = contractTexts?.text2 || '';
    let result;

    // V4 Holistic Re-Analyze: Nutze denselben Pipeline-Pfad wie der initiale Vergleich
    if (process.env.COMPARE_HOLISTIC === 'true') {
      console.log(`🌊 Re-Analyze: Holistic Pipeline (Perspektive: ${selectedPerspective})`);

      // Document type detection from cached maps
      const docCategory = detectDocumentCategory(contractMap.contract1, contractMap.contract2);
      const docConfig = getDocTypeConfig(docCategory);
      console.log(`📋 Re-Analyze Dokumenttyp: ${docConfig.label} (${docCategory})`);

      // Compare Intent
      sendProgress(res, 'intent', 40, 'Vergleichbarkeit wird bewertet...', wantsSSE);
      const intent = await detectCompareIntent(contractMap.contract1, contractMap.contract2);

      // Holistic Pass with NEW perspective
      sendProgress(res, 'holistic', 55, 'KI-Vergleich läuft (ganzheitliche Analyse)...', wantsSSE);
      let holisticRaw = await runHolisticComparePass(
        contractMap.contract1, contractMap.contract2, intent, text1, text2, docConfig, selectedPerspective,
        userProfile || 'individual', comparisonMode || 'standard'
      );

      // Trust-Guard
      sendProgress(res, 'validating', 82, 'Ergebnisse werden validiert...', wantsSSE);
      let validated = validateHolisticOutput(holisticRaw, text1, text2, intent);

      // Safety Net: Retry bei 0 Sections
      if (validated.sections.length === 0) {
        console.warn(`⚠️ Re-Analyze Holistic: 0 Sections nach Trust-Guard. Retry...`);
        sendProgress(res, 'holistic', 70, 'Erneuter KI-Vergleich (Retry)...', wantsSSE);
        try {
          holisticRaw = await runHolisticComparePass(
            contractMap.contract1, contractMap.contract2, intent, text1, text2, docConfig, selectedPerspective,
            userProfile || 'individual', comparisonMode || 'standard'
          );
          validated = validateHolisticOutput(holisticRaw, text1, text2, intent);
        } catch (retryErr) {
          console.warn(`⚠️ Retry fehlgeschlagen: ${retryErr.message}`);
        }
      }

      // Legacy adapter + scores
      const { differences, risks, recommendations } = adaptSectionsToLegacySchema(validated.sections);
      const scores = calculateScoresFromDiffs(differences, contractMap.contract1, contractMap.contract2, docConfig);

      // Benchmark
      let benchmarkResult = { contractType: null, contractTypeLabel: null, benchmarks: [], enrichedDifferences: differences };
      if (docConfig.benchmarkEnabled) {
        try {
          benchmarkResult = runBenchmarkComparison(contractMap.contract1, contractMap.contract2, differences);
        } catch (benchErr) {
          console.warn(`⚠️ Re-Analyze Benchmark fehlgeschlagen: ${benchErr.message}`);
        }
      }

      // Score-Differenzierung
      const scoreResult = { scores, differences, overallRecommendation: validated.overallRecommendation };
      enforceScoreDifferentiation(scoreResult);

      sendProgress(res, 'finalizing', 90, 'Ergebnis wird zusammengestellt...', wantsSSE);

      result = {
        version: 2,
        _pipelineVersion: 'holistic-v4',
        documentType: {
          category: docConfig.category,
          label: docConfig.label,
          scoreLabels: docConfig.scoreLabels || null,
          labels: docConfig.labels,
          perspectiveLabels: docConfig.perspectiveLabels || null,
        },
        contractMap: { contract1: contractMap.contract1, contract2: contractMap.contract2 },
        sections: validated.sections,
        compatibility: validated.compatibility,
        differences,
        risks,
        recommendations,
        scores: scoreResult.scores,
        summary: validated.summary,
        overallRecommendation: validated.overallRecommendation,
        contract1Analysis: {
          strengths: validated.contract1Strengths,
          weaknesses: validated.contract1Weaknesses,
          riskLevel: scoreResult.scores.contract1.overall >= 70 ? 'low' : scoreResult.scores.contract1.overall >= 50 ? 'medium' : 'high',
          score: scoreResult.scores.contract1.overall,
        },
        contract2Analysis: {
          strengths: validated.contract2Strengths,
          weaknesses: validated.contract2Weaknesses,
          riskLevel: scoreResult.scores.contract2.overall >= 70 ? 'low' : scoreResult.scores.contract2.overall >= 50 ? 'medium' : 'high',
          score: scoreResult.scores.contract2.overall,
        },
        perspective: selectedPerspective,
        benchmark: benchmarkResult ? {
          contractType: benchmarkResult.contractType,
          contractTypeLabel: benchmarkResult.contractTypeLabel || null,
          metrics: benchmarkResult.benchmarks || [],
        } : null,
        categories: [...new Set(validated.sections.map(s => s.clauseArea))],
        _contractTexts: { text1: text1.slice(0, 50000), text2: text2.slice(0, 50000) },
      };

      console.log(`✅ Re-Analyze Holistic: ${validated.sections.length} Sections, Perspektive=${selectedPerspective}`);

    } else {
      // Legacy Clause-by-Clause Re-Analyze
      const { matchClauses } = require("../services/clauseMatcher");

      // Layer 0: Nachholen der deterministischen Regex-Extraktion
      if (text1 && !contractMap.contract1._rawValues) {
        contractMap.contract1._rawValues = extractAllValuesFromRawText(text1);
      }
      if (text2 && !contractMap.contract2._rawValues) {
        contractMap.contract2._rawValues = extractAllValuesFromRawText(text2);
      }

      const deterministicDiffs = buildDeterministicDifferences(contractMap.contract1, contractMap.contract2, null);
      const groups = groupDeterministicDiffs(deterministicDiffs);

      let clauseMatchResult = null;
      try {
        clauseMatchResult = await matchClauses(
          contractMap.contract1.clauses || [],
          contractMap.contract2.clauses || [],
          { useEmbeddings: false }
        );
      } catch (matchError) {
        console.warn(`⚠️ Re-Analyze Clause Matching fehlgeschlagen: ${matchError.message}`);
      }

      sendProgress(res, 'clause_comparison', 40, 'Klausel-für-Klausel-Vergleich...', wantsSSE);

      const clauseBundle = await runClauseByClauseComparison(
        clauseMatchResult, contractMap.contract1, contractMap.contract2,
        selectedPerspective, comparisonMode || 'standard', userProfile || 'individual'
      );

      const mergedDiffs = mergeAllDifferences(groups, {}, clauseBundle);

      sendProgress(res, 'synthesis', 60, 'KI-Synthese läuft...', wantsSSE);

      const synthesisResult = await synthesizeComparison(
        mergedDiffs, contractMap.contract1, contractMap.contract2,
        selectedPerspective, comparisonMode || 'standard', userProfile || 'individual', groups
      );

      const groupEvaluations = synthesisResult.groupEvaluations || {};
      for (const group of groups) {
        const ev = groupEvaluations[group.id];
        if (!ev) continue;
        const matchingDiff = mergedDiffs.find(d => d._fromDeterministic && d.clauseArea === group.area && d.category === group.areaLabel);
        if (matchingDiff) {
          if (ev.severity) matchingDiff.severity = ev.severity;
          if (ev.explanation) matchingDiff.explanation = ev.explanation;
          if (ev.impact) matchingDiff.impact = ev.impact;
          if (ev.recommendation) matchingDiff.recommendation = ev.recommendation;
          if (ev.semanticType) matchingDiff.semanticType = ev.semanticType;
          if (ev.financialImpact) matchingDiff.financialImpact = ev.financialImpact;
          if (ev.marketContext) matchingDiff.marketContext = ev.marketContext;
        }
      }
      synthesisResult.differences = mergedDiffs;
      enforceScoreDifferentiation(synthesisResult);

      sendProgress(res, 'finalizing', 90, 'Ergebnis wird zusammengestellt...', wantsSSE);

      result = buildV2Response(contractMap.contract1, contractMap.contract2, synthesisResult, selectedPerspective, text1, text2);
    }

    result.comparisonMode = {
      id: comparisonMode || 'standard',
      name: COMPARISON_MODES[comparisonMode]?.name || 'Standard-Vergleich',
      description: COMPARISON_MODES[comparisonMode]?.description || ''
    };

    // Generate follow-up questions for new perspective (non-blocking, 3s timeout)
    try {
      const followUps = await Promise.race([
        generateCompareFollowUps(result),
        new Promise(resolve => setTimeout(() => resolve(null), 3000)),
      ]);
      if (followUps) result.followUpQuestions = followUps;
    } catch (fuErr) {
      console.warn('⚠️ Follow-up generation skipped:', fuErr.message);
    }

    if (wantsSSE) {
      sendProgress(res, 'complete', 100, 'Re-Analyse abgeschlossen!', true);
      res.write(`data: ${JSON.stringify({ type: 'result', data: result })}\n\n`);
      res.end();
    } else {
      res.json(result);
    }

  } catch (error) {
    console.error("❌ Re-analyze error:", error);
    const errorResponse = { message: "Fehler bei der Re-Analyse: " + (error.message || "Unbekannter Fehler") };
    if (wantsSSE) {
      res.write(`data: ${JSON.stringify({ type: 'error', ...errorResponse })}\n\n`);
      res.end();
    } else {
      res.status(500).json(errorResponse);
    }
  }
});

// ============================================
// Follow-Up Question Answer Endpoint
// ============================================
router.post("/followup-answer", verifyToken, async (req, res) => {
  try {
    const { question, context } = req.body;

    if (!question || !context) {
      return res.status(400).json({ message: "Frage und Kontext erforderlich" });
    }

    const answer = await answerCompareFollowUp(question, context);
    res.json({ answer });
  } catch (error) {
    console.error("❌ Follow-up answer error:", error.message);
    res.status(500).json({ message: "Fehler bei der Beantwortung: " + (error.message || "Unbekannter Fehler") });
  }
});

// Get user's comparison history
router.get("/history", verifyToken, async (req, res) => {
  try {
    await ensureDb();
    const user = await usersCollection.findOne({ _id: new ObjectId(req.user.userId) });
    if (!user) {
      return res.status(404).json({ message: "Nutzer nicht gefunden" });
    }

    const isPremium = user.subscriptionActive === true || user.isPremium === true;
    if (!isPremium) {
      return res.status(403).json({ message: "Premium-Funktion erforderlich" });
    }

    // Get comparison history
    const history = await contractsCollection
      .find({ 
        userId: new ObjectId(req.user.userId), 
        action: "compare_contracts" 
      })
      .sort({ timestamp: -1 })
      .limit(20)
      .toArray();

    res.json({
      history: history.map(h => ({
        id: h._id,
        file1Name: h.file1Name,
        file2Name: h.file2Name,
        file1S3Key: h.file1S3Key || null,
        file2S3Key: h.file2S3Key || null,
        userProfile: h.userProfile,
        comparisonMode: h.comparisonMode || 'standard',
        recommendedContract: h.recommendedContract,
        confidence: h.confidence,
        differencesCount: h.differencesCount,
        timestamp: h.timestamp,
        // Include full result for history reload feature
        result: h.fullResult || null
      })),
      totalComparisons: user.compareCount || 0,
      remainingComparisons: (() => {
        const plan = user.subscriptionPlan || "free";
        const used = user.compareCount || 0;
        const limit = getFeatureLimit(plan, 'compare');
        if (limit === Infinity) return "unlimited";
        return Math.max(0, limit - used);
      })()
    });

  } catch (error) {
    console.error("❌ History fetch error:", error);
    res.status(500).json({ message: "Fehler beim Laden der Historie" });
  }
});

// Get signed URL for compare PDF from history
router.get("/history/pdf/:s3Key(*)", verifyToken, async (req, res) => {
  try {
    const s3Key = req.params.s3Key;
    if (!s3Key || !s3Key.startsWith('compare/')) {
      return res.status(400).json({ message: "Ungültiger S3-Key" });
    }

    // Verify that this file belongs to the requesting user
    const userId = req.user.userId;
    if (!s3Key.startsWith(`compare/${userId}/`)) {
      return res.status(403).json({ message: "Kein Zugriff" });
    }

    const command = new GetObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: s3Key,
    });
    const url = await getSignedUrl(s3, command, { expiresIn: 3600 });
    res.json({ url });
  } catch (error) {
    console.error("❌ PDF signed URL error:", error);
    res.status(500).json({ message: "Fehler beim Generieren der URL" });
  }
});

// Delete single history item
router.delete("/history/:id", verifyToken, async (req, res) => {
  try {
    await ensureDb();
    const { id } = req.params;

    // Verify ownership - only delete if it belongs to this user
    const result = await contractsCollection.deleteOne({
      _id: new ObjectId(id),
      userId: new ObjectId(req.user.userId),
      action: "compare_contracts"
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "Eintrag nicht gefunden oder keine Berechtigung" });
    }

    res.json({ message: "Eintrag gelöscht", deleted: true });
  } catch (error) {
    console.error("❌ Delete history item error:", error);
    res.status(500).json({ message: "Fehler beim Löschen des Eintrags" });
  }
});

// Clear all history for user
router.delete("/history", verifyToken, async (req, res) => {
  try {
    await ensureDb();
    const result = await contractsCollection.deleteMany({
      userId: new ObjectId(req.user.userId),
      action: "compare_contracts"
    });

    res.json({
      message: "Historie gelöscht",
      deleted: true,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error("❌ Clear history error:", error);
    res.status(500).json({ message: "Fehler beim Löschen der Historie" });
  }
});

// Get usage statistics
router.get("/stats", verifyToken, async (req, res) => {
  try {
    await ensureDb();
    const user = await usersCollection.findOne({ _id: new ObjectId(req.user.userId) });
    if (!user) {
      return res.status(404).json({ message: "Nutzer nicht gefunden" });
    }

    const isPremium = user.subscriptionActive === true || user.isPremium === true;
    if (!isPremium) {
      return res.status(403).json({ message: "Premium-Funktion erforderlich" });
    }

    // Get usage statistics
    const stats = await contractsCollection.aggregate([
      { $match: { userId: new ObjectId(req.user.userId), action: "compare_contracts" } },
      {
        $group: {
          _id: null,
          totalComparisons: { $sum: 1 },
          avgConfidence: { $avg: "$confidence" },
          mostUsedProfile: { $push: "$userProfile" },
          contract1Wins: {
            $sum: { $cond: [{ $eq: ["$recommendedContract", 1] }, 1, 0] }
          },
          contract2Wins: {
            $sum: { $cond: [{ $eq: ["$recommendedContract", 2] }, 1, 0] }
          }
        }
      }
    ]).toArray();

    const result = stats[0] || {
      totalComparisons: 0,
      avgConfidence: 0,
      mostUsedProfile: [],
      contract1Wins: 0,
      contract2Wins: 0
    };

    // Find most used profile
    const profileCounts = {};
    result.mostUsedProfile.forEach(profile => {
      profileCounts[profile] = (profileCounts[profile] || 0) + 1;
    });
    const mostUsedProfile = Object.entries(profileCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'individual';

    res.json({
      totalComparisons: result.totalComparisons,
      avgConfidence: Math.round(result.avgConfidence || 0),
      mostUsedProfile,
      preferenceStats: {
        contract1Preferred: result.contract1Wins,
        contract2Preferred: result.contract2Wins,
        contract1Percentage: result.totalComparisons > 0 
          ? Math.round((result.contract1Wins / result.totalComparisons) * 100) 
          : 0
      }
    });

  } catch (error) {
    console.error("❌ Stats fetch error:", error);
    res.status(500).json({ message: "Fehler beim Laden der Statistiken" });
  }
});

// 📄 PDF Export Endpoint
router.post("/export-pdf", verifyToken, async (req, res) => {
  try {
    await ensureDb();
    // Verify premium status
    const user = await usersCollection.findOne({ _id: new ObjectId(req.user.userId) });
    if (!user) {
      return res.status(404).json({ message: "Nutzer nicht gefunden" });
    }

    const isPremium = user.subscriptionActive === true || user.isPremium === true;
    if (!isPremium) {
      return res.status(403).json({ message: "PDF-Export ist ein Premium-Feature" });
    }

    const { result, file1Name, file2Name } = req.body;

    if (!result || !result.differences) {
      return res.status(400).json({ message: "Ungültige Vergleichsdaten" });
    }

    const isV2 = result.version === 2;

    console.log("📄 Generating PDF export...");

    // Create PDF document
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 50, bottom: 50, left: 50, right: 50 },
      info: {
        Title: 'Vertragsvergleich - Contract AI',
        Author: 'Contract AI',
        Subject: 'Vertragsvergleich',
        CreationDate: new Date()
      }
    });

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Vertragsvergleich_${new Date().toISOString().split('T')[0]}.pdf"`);

    // Pipe PDF to response
    doc.on('error', (err) => {
      console.error('❌ PDF generation stream error:', err.message);
      if (!res.headersSent) res.status(500).json({ message: 'PDF-Generierung fehlgeschlagen' });
      else res.end();
    });
    doc.pipe(res);

    // Colors
    const primaryColor = '#0071e3';
    const successColor = '#34c759';
    const warningColor = '#ff9500';
    const dangerColor = '#ff453a';
    const textColor = '#1d1d1f';
    const mutedColor = '#6e6e73';

    // Helper function for severity colors
    const getSeverityColor = (severity) => {
      switch (severity) {
        case 'low': return successColor;
        case 'medium': return warningColor;
        case 'high': return dangerColor;
        case 'critical': return '#d70015';
        default: return mutedColor;
      }
    };

    // === HEADER ===
    doc.fontSize(28)
       .fillColor(primaryColor)
       .text('Vertragsvergleich', { align: 'center' });

    doc.moveDown(0.5);
    doc.fontSize(12)
       .fillColor(mutedColor)
       .text(`Erstellt am ${new Date().toLocaleDateString('de-DE')} mit Contract AI`, { align: 'center' });

    doc.moveDown(1);

    // === FILE NAMES ===
    if (file1Name || file2Name) {
      doc.fontSize(10)
         .fillColor(mutedColor)
         .text(`Vertrag 1: ${file1Name || 'Unbekannt'}`, { align: 'left' })
         .text(`Vertrag 2: ${file2Name || 'Unbekannt'}`, { align: 'left' });
      doc.moveDown(1);
    }

    // === V2: TL;DR BOX ===
    if (isV2 && result.summary?.tldr) {
      const tldrText = result.summary.tldr;
      const tldrLines = Math.ceil(tldrText.length / 70);
      const tldrBoxHeight = Math.max(60, 30 + (tldrLines * 14) + 15);
      const tldrY = doc.y;

      doc.rect(50, tldrY, 495, tldrBoxHeight).fill('#f0fdf4');
      doc.fontSize(12).fillColor('#166534').text('Kurzfassung', 70, tldrY + 10);
      doc.fontSize(11).fillColor(textColor).text(tldrText, 70, tldrY + 28, { width: 455 });
      doc.y = tldrY + tldrBoxHeight + 10;
      doc.moveDown(0.3);
    }

    // === RECOMMENDATION BOX ===
    const reasoningText = result.overallRecommendation?.reasoning || '';
    const confidenceText = `Konfidenz: ${result.overallRecommendation?.confidence || 50}%`;

    const estimatedLines = Math.ceil(reasoningText.length / 70);
    const boxHeight = Math.max(90, 50 + (estimatedLines * 14) + 20);

    // V2: Show conditions if available
    const conditions = (isV2 && result.overallRecommendation?.conditions?.length)
      ? result.overallRecommendation.conditions : [];
    const conditionsHeight = conditions.length > 0 ? (conditions.length * 14 + 20) : 0;

    const recY = doc.y;
    doc.rect(50, recY, 495, boxHeight + conditionsHeight)
       .fill('#f0f7ff');

    doc.fontSize(16)
       .fillColor(primaryColor)
       .text(`Empfehlung: Vertrag ${result.overallRecommendation?.recommended || '?'}`, 70, recY + 15);

    doc.fontSize(11)
       .fillColor(textColor)
       .text(reasoningText, 70, recY + 40, { width: 455 });

    const afterReasoningY = doc.y;

    if (conditions.length > 0) {
      doc.fontSize(10).fillColor('#92400e').text('Bedingungen:', 70, afterReasoningY + 5);
      conditions.forEach(c => {
        doc.fontSize(9).fillColor(textColor).text(`  • ${c}`, 70);
      });
    }

    doc.fontSize(9)
       .fillColor(mutedColor)
       .text(confidenceText, 70, doc.y + 5);

    doc.y = recY + boxHeight + conditionsHeight + 10;
    doc.moveDown(0.5);

    // === SCORES COMPARISON ===
    doc.fontSize(16)
       .fillColor(textColor)
       .text('Bewertung im Vergleich', { underline: true });
    doc.moveDown(0.5);

    if (isV2 && result.scores) {
      // V2: Category scores
      const scoreLabels = {
        overall: 'Gesamt', fairness: 'Fairness', riskProtection: 'Risikoschutz',
        flexibility: 'Flexibilität', completeness: 'Vollständigkeit', clarity: 'Klarheit'
      };
      const scoreKeys = ['overall', 'fairness', 'riskProtection', 'flexibility', 'completeness', 'clarity'];

      ['contract1', 'contract2'].forEach((key, ci) => {
        const scores = result.scores[key];
        if (!scores) return;

        const label = ci === 0 ? (file1Name || 'Vertrag 1') : (file2Name || 'Vertrag 2');
        const isRecommended = result.overallRecommendation?.recommended === (ci + 1);

        doc.fontSize(13).fillColor(primaryColor).text(label, { continued: isRecommended });
        if (isRecommended) {
          doc.fontSize(10).fillColor(successColor).text('  [EMPFOHLEN]');
        }
        doc.moveDown(0.2);

        scoreKeys.forEach(sk => {
          const val = Math.min(100, Math.max(0, scores[sk] || 0));
          const barColor = val >= 70 ? successColor : val >= 40 ? warningColor : dangerColor;

          doc.fontSize(9).fillColor(mutedColor).text(`${scoreLabels[sk]}: `, { continued: true });
          doc.fillColor(barColor).text(`${val}/100`);
        });
        doc.moveDown(0.5);
      });
    } else {
      // V1: Simple scores
      const score1Color = result.contract1Analysis?.riskLevel === 'low' ? successColor :
                          result.contract1Analysis?.riskLevel === 'medium' ? warningColor : dangerColor;
      const risk1Text = result.contract1Analysis?.riskLevel === 'low' ? 'Niedrig' :
                        result.contract1Analysis?.riskLevel === 'medium' ? 'Mittel' : 'Hoch';

      doc.fontSize(14)
         .fillColor(score1Color)
         .text(`Vertrag 1: ${result.contract1Analysis?.score || 0}/100`, { continued: true })
         .fillColor(mutedColor)
         .text(` (Risiko: ${risk1Text})`, { continued: result.overallRecommendation?.recommended === 1 });
      if (result.overallRecommendation?.recommended === 1) {
        doc.fontSize(10).fillColor(successColor).text('  [EMPFOHLEN]');
      }
      doc.moveDown(0.3);

      const score2Color = result.contract2Analysis?.riskLevel === 'low' ? successColor :
                          result.contract2Analysis?.riskLevel === 'medium' ? warningColor : dangerColor;
      const risk2Text = result.contract2Analysis?.riskLevel === 'low' ? 'Niedrig' :
                        result.contract2Analysis?.riskLevel === 'medium' ? 'Mittel' : 'Hoch';

      doc.fontSize(14)
         .fillColor(score2Color)
         .text(`Vertrag 2: ${result.contract2Analysis?.score || 0}/100`, { continued: true })
         .fillColor(mutedColor)
         .text(` (Risiko: ${risk2Text})`, { continued: result.overallRecommendation?.recommended === 2 });
      if (result.overallRecommendation?.recommended === 2) {
        doc.fontSize(10).fillColor(successColor).text('  [EMPFOHLEN]');
      }
    }
    doc.moveDown(1.5);

    // === STRENGTHS & WEAKNESSES (V1 or V1-compat fields) ===
    if (result.contract1Analysis?.strengths?.length || result.contract2Analysis?.strengths?.length) {
      doc.fontSize(16)
         .fillColor(textColor)
         .text('Stärken & Schwächen', { underline: true });
      doc.moveDown(0.5);

      doc.fontSize(13).fillColor(primaryColor).text('Vertrag 1');
      doc.fontSize(11).fillColor(successColor).text('Staerken:');
      (result.contract1Analysis?.strengths || []).slice(0, 3).forEach(s => {
        doc.fontSize(10).fillColor(textColor).text(`  - ${s}`);
      });
      doc.fontSize(11).fillColor(dangerColor).text('Schwaechen:');
      (result.contract1Analysis?.weaknesses || []).slice(0, 3).forEach(w => {
        doc.fontSize(10).fillColor(textColor).text(`  - ${w}`);
      });
      doc.moveDown(0.5);

      doc.fontSize(13).fillColor(primaryColor).text('Vertrag 2');
      doc.fontSize(11).fillColor(successColor).text('Staerken:');
      (result.contract2Analysis?.strengths || []).slice(0, 3).forEach(s => {
        doc.fontSize(10).fillColor(textColor).text(`  - ${s}`);
      });
      doc.fontSize(11).fillColor(dangerColor).text('Schwaechen:');
      (result.contract2Analysis?.weaknesses || []).slice(0, 3).forEach(w => {
        doc.fontSize(10).fillColor(textColor).text(`  - ${w}`);
      });
      doc.moveDown(1.5);
    }

    // === NEW PAGE FOR DIFFERENCES ===
    doc.addPage();

    doc.fontSize(16)
       .fillColor(textColor)
       .text('Wichtigste Unterschiede', { underline: true });
    doc.moveDown(0.5);

    // List differences
    result.differences.forEach((diff, index) => {
      // Check if we need a new page
      if (doc.y > 700) {
        doc.addPage();
      }

      const diffY = doc.y;
      const severityColor = getSeverityColor(diff.severity);

      // Category & Section
      doc.fontSize(12)
         .fillColor(primaryColor)
         .text(`${index + 1}. ${diff.section}`, { continued: true })
         .fontSize(9)
         .fillColor(mutedColor)
         .text(`  [${diff.category}]`);

      // Severity badge
      doc.fontSize(9)
         .fillColor(severityColor)
         .text(`Schweregrad: ${diff.severity.toUpperCase()}`);

      // Impact
      doc.fontSize(10)
         .fillColor(textColor)
         .text(diff.impact, { width: 495 });

      // Recommendation
      doc.fontSize(10)
         .fillColor(primaryColor)
         .text(`Tipp: ${diff.recommendation}`, { width: 495 });

      doc.moveDown(0.8);
    });

    // === V2: RISKS SECTION ===
    if (isV2 && result.risks?.length > 0) {
      if (doc.y > 650) doc.addPage();
      doc.moveDown(1);
      doc.fontSize(16).fillColor(textColor).text('Risiko-Analyse', { underline: true });
      doc.moveDown(0.5);

      const severityLabels = { critical: 'KRITISCH', high: 'HOCH', medium: 'MITTEL', low: 'NIEDRIG' };
      result.risks.forEach((risk, i) => {
        if (doc.y > 700) doc.addPage();
        const riskColor = getSeverityColor(risk.severity);
        const contractLabel = risk.contract === 'both' ? 'Beide' : `Vertrag ${risk.contract}`;

        doc.fontSize(11).fillColor(riskColor)
           .text(`${i + 1}. [${severityLabels[risk.severity] || risk.severity}] ${risk.title}`, { continued: true })
           .fontSize(9).fillColor(mutedColor).text(`  (${contractLabel})`);

        doc.fontSize(10).fillColor(textColor).text(risk.description, { width: 495 });

        if (risk.legalBasis) {
          doc.fontSize(9).fillColor(mutedColor).text(`Rechtsgrundlage: ${risk.legalBasis}`);
        }
        if (risk.financialExposure) {
          doc.fontSize(9).fillColor(warningColor).text(`Finanzielle Exposition: ${risk.financialExposure}`);
        }
        doc.moveDown(0.6);
      });
    }

    // === V2: RECOMMENDATIONS SECTION ===
    if (isV2 && result.recommendations?.length > 0) {
      if (doc.y > 650) doc.addPage();
      doc.moveDown(1);
      doc.fontSize(16).fillColor(textColor).text('Verbesserungsvorschläge', { underline: true });
      doc.moveDown(0.5);

      const priorityLabels = { critical: 'KRITISCH', high: 'HOCH', medium: 'MITTEL', low: 'NIEDRIG' };
      result.recommendations.forEach((rec, i) => {
        if (doc.y > 680) doc.addPage();
        const pColor = getSeverityColor(rec.priority);

        doc.fontSize(11).fillColor(pColor)
           .text(`${i + 1}. [${priorityLabels[rec.priority] || rec.priority}] ${rec.title}`, { continued: true })
           .fontSize(9).fillColor(mutedColor).text(`  (Vertrag ${rec.targetContract})`);

        doc.fontSize(10).fillColor(textColor).text(rec.reason, { width: 495 });

        if (rec.currentText) {
          doc.fontSize(9).fillColor(mutedColor).text('Aktuell:', { continued: false });
          doc.fontSize(9).fillColor(textColor).text(`  "${rec.currentText}"`, { width: 475 });
        }
        if (rec.suggestedText) {
          doc.fontSize(9).fillColor(primaryColor).text('Vorschlag:', { continued: false });
          doc.fontSize(9).fillColor(textColor).text(`  "${rec.suggestedText}"`, { width: 475 });
        }
        doc.moveDown(0.6);
      });
    }

    // === FOOTER ON LAST PAGE ===
    doc.moveDown(2);

    // Summary
    if (isV2 && result.summary?.detailedSummary) {
      doc.fontSize(14).fillColor(textColor).text('Zusammenfassung', { underline: true });
      doc.moveDown(0.3);
      if (result.summary.verdict) {
        doc.fontSize(11).fillColor(primaryColor).text(result.summary.verdict, { width: 495 });
        doc.moveDown(0.3);
      }
      doc.fontSize(10).fillColor(mutedColor).text(result.summary.detailedSummary, { width: 495 });
      doc.moveDown(1);
    } else if (result.summary && typeof result.summary === 'string') {
      doc.fontSize(14)
         .fillColor(textColor)
         .text('Zusammenfassung', { underline: true });
      doc.moveDown(0.3);
      doc.fontSize(10)
         .fillColor(mutedColor)
         .text(result.summary, { width: 495 });
      doc.moveDown(1);
    }

    // Footer - draw a line instead of using characters
    doc.moveDown(0.5);
    const footerY = doc.y;
    doc.moveTo(50, footerY)
       .lineTo(545, footerY)
       .strokeColor(mutedColor)
       .lineWidth(0.5)
       .stroke();

    doc.moveDown(1);
    doc.fontSize(9)
       .fillColor(mutedColor)
       .text('Erstellt mit Contract AI - www.contract-ai.de', { align: 'center' });
    doc.text('Dieser Bericht dient nur zur Information und ersetzt keine Rechtsberatung.', { align: 'center' });

    // Finalize PDF
    doc.end();

    console.log("✅ PDF export completed");

  } catch (error) {
    console.error("❌ PDF export error:", error);
    if (!res.headersSent) {
      res.status(500).json({ message: "Fehler beim PDF-Export: " + error.message });
    } else {
      res.end();
    }
  }
});

module.exports = router;