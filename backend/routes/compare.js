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
const { MongoClient, ObjectId } = require("mongodb");

const { isBusinessOrHigher, isEnterpriseOrHigher, getFeatureLimit } = require("../constants/subscriptionPlans"); // 📊 Zentrale Plan-Definitionen
const { fixUtf8Filename } = require("../utils/fixUtf8"); // ✅ Fix UTF-8 Encoding

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

// MongoDB connection
const mongoUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017";
const client = new MongoClient(mongoUri);

let usersCollection, contractsCollection;
(async () => {
  try {
    await client.connect();
    const db = client.db("contract_ai");
    usersCollection = db.collection("users");
    contractsCollection = db.collection("contracts");
    console.log("🧠 MongoDB verbunden (compare)");
  } catch (err) {
    console.error("❌ MongoDB-Fehler:", err);
  }
})();

// ✅ FIXED: Inline saveContract function (replaces external dependency)
const saveContract = async (contractData) => {
  try {
    const contractDoc = {
      userId: new ObjectId(contractData.userId),
      fileName: contractData.fileName,
      originalName: contractData.fileName,
      toolUsed: contractData.toolUsed || "contract_compare",
      filePath: contractData.filePath,
      fileSize: contractData.fileSize || 0,
      status: "processed",
      createdAt: new Date(),
      updatedAt: new Date(),
      ...contractData.extraRefs
    };

    const result = await contractsCollection.insertOne(contractDoc);
    console.log(`✅ Contract saved: ${contractData.fileName} (ID: ${result.insertedId})`);
    
    return {
      success: true,
      contractId: result.insertedId,
      message: "Contract successfully saved"
    };
  } catch (error) {
    console.error("❌ Error saving contract:", error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Enhanced system prompts for different user profiles
const SYSTEM_PROMPTS = {
  individual: `
Du bist ein Experte für Vertragsrecht mit Fokus auf Verbraucherschutz.
Analysiere Verträge aus Sicht einer Privatperson und achte besonders auf:
- Verbraucherrechte und Widerrufsfristen
- Versteckte Kosten und automatische Verlängerungen
- Faire Kündigungsfristen
- Verständliche Sprache vs. komplizierte Klauseln
- Datenschutz und persönliche Rechte

Bewerte Risiken konservativ und erkläre komplexe Begriffe einfach.
`,
  freelancer: `
Du bist ein Experte für Vertragsrecht mit Fokus auf Freelancer-Geschäfte.
Analysiere Verträge aus Sicht eines Selbständigen und achte besonders auf:
- Haftungsbegrenzung und -ausschlüsse
- Zahlungsbedingungen und Verzugszinsen
- Intellectual Property und Urheberrechte
- Stornierungsklauseln und Schadenersatz
- Projektumfang und Änderungsklauseln
- Gewährleistung und Nachbesserungsrechte

Fokussiere auf finanzielle Risiken und Rechtssicherheit.
`,
  business: `
Du bist ein Experte für Unternehmensvertragsrecht.
Analysiere Verträge aus Sicht eines Unternehmens und achte besonders auf:
- Vollständige Risikoanalyse und Compliance
- Vertragsstrafen und Schadenersatzklauseln
- Force Majeure und höhere Gewalt
- Confidentiality und Non-Disclosure
- Gerichtsstand und anwendbares Recht
- Subunternehmer und Haftungsketten
- Performance-Garantien und SLAs

Berücksichtige sowohl operative als auch rechtliche Risiken.
`
};

// 🎯 Comparison Modes - Different analysis approaches
const COMPARISON_MODES = {
  standard: {
    name: 'Standard-Vergleich',
    description: 'Allgemeiner Vergleich zweier Verträge',
    promptAddition: `
VERGLEICHSMODUS: Standard-Vergleich
Vergleiche beide Verträge neutral und identifiziere alle relevanten Unterschiede.
Bewerte objektiv, welcher Vertrag insgesamt vorteilhafter ist.
`
  },
  version: {
    name: 'Versions-Vergleich',
    description: 'Alt vs. Neu - Änderungen zwischen Vertragsversionen',
    promptAddition: `
VERGLEICHSMODUS: Versions-Vergleich (Alt vs. Neu)
Vertrag 1 ist die ALTE Version, Vertrag 2 ist die NEUE Version.
Fokussiere besonders auf:
- Was wurde hinzugefügt? (neue Klauseln, erweiterte Rechte/Pflichten)
- Was wurde entfernt? (gestrichene Klauseln, reduzierte Garantien)
- Was wurde geändert? (modifizierte Bedingungen, neue Fristen)
- Sind die Änderungen zum Vorteil oder Nachteil des Vertragspartners?
- Gibt es versteckte Verschlechterungen?

Bewerte: Ist die neue Version besser oder schlechter für den Unterzeichner?
`
  },
  bestPractice: {
    name: 'Best-Practice Check',
    description: 'Prüfung gegen branchenübliche Standards',
    promptAddition: `
VERGLEICHSMODUS: Best-Practice Check
Vertrag 1 ist der zu prüfende Vertrag.
Vertrag 2 dient als Referenz/Template oder wird ignoriert falls leer.

Prüfe den Vertrag gegen branchenübliche Best Practices:
- Enthält er alle wichtigen Standardklauseln?
- Sind Formulierungen klar und eindeutig?
- Sind Fristen und Bedingungen marktüblich?
- Fehlen wichtige Schutzklauseln?
- Gibt es ungewöhnlich einseitige Regelungen?

Gib konkrete Verbesserungsvorschläge basierend auf Best Practices.
`
  },
  competition: {
    name: 'Anbieter-Vergleich',
    description: 'Vergleich von Angeboten verschiedener Anbieter',
    promptAddition: `
VERGLEICHSMODUS: Anbieter-/Wettbewerbs-Vergleich
Beide Verträge sind Angebote von verschiedenen Anbietern für ähnliche Leistungen.

Vergleiche besonders:
- Preis-Leistungs-Verhältnis
- Vertragslaufzeit und Kündigungsfristen
- Leistungsumfang und Garantien
- Haftung und Gewährleistung
- Zusatzkosten und versteckte Gebühren
- Flexibilität und Anpassungsmöglichkeiten
- Service-Level und Support

Erstelle eine klare Empfehlung: Welcher Anbieter bietet das bessere Gesamtpaket?
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

ARBEITSWEISE — Du bist ein Anwalt, der beide Verträge nebeneinander auf dem Schreibtisch liegen hat. Gehe JEDEN Paragraphen durch:

SCHRITT 1 — UNTERSCHIEDE (differences):
Gehe das folgende Prüfschema Punkt für Punkt durch. Prüfe JEDEN Bereich: Gibt es einen ECHTEN, INHALTLICHEN Unterschied zwischen den Verträgen? Wenn ja → dokumentiere ihn. Wenn nein → überspringe ihn KOMPLETT.

WICHTIG — KEINE identischen oder ähnlichen Klauseln aufnehmen:
- Wenn beide Verträge eine Klausel IDENTISCH, SINNGEMÄSS GLEICH oder NUR GERINGFÜGIG ANDERS formulieren, ist das KEIN Unterschied. Überspringe es KOMPLETT.
- Beginne NIEMALS eine Erklärung mit "Beide Verträge sehen...", "Beide Verträge regeln...", "Beide Verträge enthalten..." — das ist ein Zeichen, dass es kein echter Unterschied ist.
- Schreibe NIEMALS "Keine Änderung erforderlich", "Stellen Sie sicher", oder generische Empfehlungen ohne konkreten Bezug zum Unterschied.
- Nur ECHTE, MATERIELLE Abweichungen gehören in die Liste: unterschiedliche Fristen, Beträge, Konditionen, fehlende Klauseln, oder komplett andere Regelungsansätze.

PRÜFSCHEMA:
□ Leistungsumfang / Vertragsgegenstand — Was genau wird geschuldet?
□ Leistungsart — Dienstvertrag (Bemühen) vs. Werkvertrag (Erfolg)?
□ Vertragslaufzeit — Befristet vs. unbefristet? Mindestlaufzeit?
□ Kündigungsfristen — Wie lang? Zum Quartalsende/Jahresende? Automatische Verlängerung?
□ Vergütungsstruktur — Pauschale vs. Stundensatz? Höhe?
□ Zahlungsfristen — 14 Tage, 30 Tage, sofort?
□ Verzugszinsen — Welcher Prozentsatz über Basiszins?
□ Preisanpassungsklauseln — Jährliche Erhöhung erlaubt?
□ Mindestabnahme / Mindestvolumen — Gibt es garantierte Auftragsmengen?
□ SLA / Verfügbarkeit — Garantierte Uptime? Reaktionszeiten?
□ SLA-Sanktionen / Gutschriften — Was passiert bei Nichteinhaltung?
□ Haftungshöhe — Maximale Haftung pro Schadensfall/Jahr?
□ Haftungsausschlüsse — Leichte Fahrlässigkeit? Mittelbare Schäden? Kardinalpflichten?
□ Geheimhaltung — Dauer der Verpflichtung? Befristet vs. unbefristet?
□ Wettbewerbsverbot — Existiert eines? Dauer nach Vertragsende?
□ Datenschutz / AVV — Welche Regelungen? Unterauftragnehmer-Genehmigung?
□ IP-Rechte / Urheberrecht — Wem gehören die Arbeitsergebnisse?
□ Gerichtsstand — Welcher Ort? Ausschließlich?
□ Rechtswahl — UN-Kaufrecht ausgeschlossen?
□ Schlussbestimmungen — Schriftformklausel? Salvatorische Klausel? Nebenabreden?

Finde ALLE tatsächlich vorhandenen Unterschiede — keine künstlichen Auffüllungen, aber auch KEINE Auslassungen.
Identische oder sinngemäß gleiche Regelungen gehören NICHT in die Liste — nur echte Abweichungen.

Für JEDEN Unterschied:
- "category": Rechtskategorie (Kündigung, Haftung, Zahlung, Gewährleistung, Datenschutz, Laufzeit, IP-Rechte, Wettbewerb, etc.)
- "section": Exakte Fundstelle (z.B. "§3 Abs. 2", "Klausel 4.1"). Bei fehlenden Klauseln: die Fundstelle des Vertrags, der die Klausel HAT
- "contract1": Wörtliches Zitat aus Vertrag 1 (kurz, max 1-2 Sätze der relevanten Passage). Bei fehlender Klausel: "Keine Regelung vorhanden"
- "contract2": Wörtliches Zitat aus Vertrag 2 (kurz, max 1-2 Sätze der relevanten Passage). Bei fehlender Klausel: "Keine Regelung vorhanden"
- "explanation": Erkläre diesen Unterschied so, wie ein Anwalt es seinem Mandanten in einem persönlichen Gespräch erklären würde. 3-5 Sätze. Beginne mit dem Kern des Unterschieds ("In Vertrag 1 ist X geregelt, während Vertrag 2 Y vorsieht..."). Erkläre dann die PRAKTISCHE Bedeutung — was passiert im Alltag/Streitfall? Nenne konkrete Szenarien. Vermeide Juristendeutsch, schreibe verständlich aber fachlich korrekt. Wenn eine Klausel fehlt, erkläre was das in der Praxis bedeutet (z.B. gesetzliche Regelung greift, Lücke im Vertrag).
- "severity": "low"|"medium"|"high"|"critical" — critical bei echten Rechtsrisiken oder komplett fehlenden Schutzklauseln
- "impact": Kurze juristische Einordnung (1 Satz) mit Verweis auf relevante Gesetze (§§ BGB, HGB, DSGVO)
- "recommendation": Konkrete Handlungsempfehlung — sage genau WAS zu tun ist (z.B. "Ergänzen Sie in Vertrag 1 einen Selbstbehalt von max. EUR X analog zu §4 Vertrag 2")

SCHRITT 2 — STÄRKEN & SCHWÄCHEN:
Für jeden Vertrag die wesentlichen Stärken und Schwächen mit Fundstelle benennen.
Schreibe nicht "Gute Haftungsklausel" sondern "Klare Haftungsbegrenzung auf den jährlichen Auftragswert von max. 102.000 EUR (§5 Abs. 2)"

SCHRITT 3 — SCORE:
Bewerte jeden Vertrag auf einer Skala von 0-100:
- 0-30: Stark mangelhaft, viele fehlende oder problematische Klauseln
- 31-50: Unterdurchschnittlich, wesentliche Schwächen
- 51-70: Durchschnittlich, solide Grundstruktur mit Verbesserungsbedarf
- 71-85: Gut, professionell formuliert mit kleineren Lücken
- 86-100: Exzellent, umfassend und ausgewogen

SCHRITT 4 — GESAMTURTEIL (overallRecommendation.reasoning):
Schreibe ein fundiertes Urteil: Welcher Vertrag ist besser und WARUM? Welche konkreten Risiken bestehen? Was MUSS vor Unterzeichnung geändert werden? Schreibe ausführlich (4-6 Sätze).

SCHRITT 5 — ZUSAMMENFASSUNG (summary):
Fasse die wichtigsten Erkenntnisse verständlich für einen Nicht-Juristen zusammen (4-6 Sätze).

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
          content: `Du bist ein hochspezialisierter Vertragsanwalt mit 20+ Jahren Erfahrung im deutschen Vertragsrecht. Ein Mandant bezahlt dich für eine vollständige, gründliche Erstberatung. ${systemPrompt}

DEINE ARBEITSWEISE:
- Du gehst JEDEN einzelnen Paragraphen beider Verträge durch — ohne Ausnahme
- Du übersprings NICHTS. Auch unterschiedliche Zahlungsfristen, Verzugszinssätze oder Formulierungsunterschiede sind relevant
- Fehlende Klauseln (nur in einem Vertrag vorhanden) sind oft die wichtigsten Unterschiede — erkenne und melde sie ALLE
- Zitiere wörtlich aus den Verträgen, paraphrasiere nicht
- Begründe rechtlich mit §§ BGB, HGB, DSGVO wo relevant
- Jede Empfehlung muss konkret und umsetzbar sein
- Sei GRÜNDLICH und AUSFÜHRLICH — dein Mandant bezahlt für Tiefe, nicht für Kürze
- Das Feld "explanation" ist das Herzstück deiner Analyse. Schreibe es so, dass ein Geschäftsführer ohne Jura-Studium sofort versteht, warum dieser Unterschied wichtig ist und was er für sein Unternehmen bedeutet.
- Vermeide generische Aussagen wie "Dies sollte geprüft werden". Sage stattdessen WAS geprüft werden muss und WARUM.
- Bei fehlenden Klauseln: Erkläre welche gesetzliche Regelung dann greift und ob das gut oder schlecht für den Mandanten ist.
- Antworte ausschließlich mit validem JSON`
        },
        { role: "user", content: analysisPrompt }
      ],
      temperature: 0.1,
      max_tokens: 16000,
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
  if (isSSE) {
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

  try {
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
    sendProgress(res, 'chunking', 35, 'Verträge werden vorbereitet...', wantsSSE);

    // Perform AI analysis with progress updates
    sendProgress(res, 'analyzing', 50, `KI-Analyse läuft (${COMPARISON_MODES[comparisonMode].name})...`, wantsSSE);
    console.log("🤖 Starting AI analysis...");
    const analysisResult = await analyzeContracts(contract1Text, contract2Text, userProfile, comparisonMode);

    // Add mode info to result
    analysisResult.comparisonMode = {
      id: comparisonMode,
      name: COMPARISON_MODES[comparisonMode].name,
      description: COMPARISON_MODES[comparisonMode].description
    };

    sendProgress(res, 'saving', 85, 'Ergebnis wird gespeichert...', wantsSSE);
    // ✅ FIXED: Save contracts and analysis to database with proper error handling
    console.log("💾 Saving contracts to database...");
    try {
      const comparisonId = new ObjectId();
      
      await Promise.all([
        saveContract({
          userId: req.user.userId,
          fileName: fixUtf8Filename(file1.originalname),
          toolUsed: "contract_compare",
          filePath: file1.path,
          fileSize: file1.size,
          extraRefs: {
            comparisonId: comparisonId,
            role: "contract1",
            userProfile
          }
        }),
        saveContract({
          userId: req.user.userId,
          fileName: fixUtf8Filename(file2.originalname),
          toolUsed: "contract_compare",
          filePath: file2.path,
          fileSize: file2.size,
          extraRefs: {
            comparisonId: comparisonId,
            role: "contract2",
            userProfile
          }
        })
      ]);

      console.log("✅ Contracts saved successfully");
    } catch (saveError) {
      console.error("⚠️ Warning: Could not save contracts to database:", saveError.message);
      // Continue with the comparison even if saving fails
    }

    // Log the comparison activity with full result for history feature
    try {
      await contractsCollection.insertOne({
        userId: new ObjectId(req.user.userId),
        action: "compare_contracts",
        tool: "contract_compare",
        userProfile,
        comparisonMode,
        file1Name: fixUtf8Filename(file1.originalname),
        file2Name: fixUtf8Filename(file2.originalname),
        recommendedContract: analysisResult.overallRecommendation.recommended,
        confidence: analysisResult.overallRecommendation.confidence,
        differencesCount: analysisResult.differences.length,
        // Store full result for history reload feature
        fullResult: analysisResult,
        timestamp: new Date()
      });
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

    console.log("✅ Comparison completed successfully");

    // Send final result
    if (wantsSSE) {
      sendProgress(res, 'complete', 100, 'Analyse abgeschlossen!', true);
      res.write(`data: ${JSON.stringify({ type: 'result', data: analysisResult })}\n\n`);
      res.end();
    } else {
      res.json(analysisResult);
    }

  } catch (error) {
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

    if (wantsSSE) {
      res.write(`data: ${JSON.stringify({ type: 'error', ...errorResponse })}\n\n`);
      res.end();
    } else {
      res.status(500).json(errorResponse);
    }
  }
});

// Get user's comparison history
router.get("/history", verifyToken, async (req, res) => {
  try {
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

// Delete single history item
router.delete("/history/:id", verifyToken, async (req, res) => {
  try {
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

    if (!result || !result.differences || !result.contract1Analysis || !result.contract2Analysis) {
      return res.status(400).json({ message: "Ungültige Vergleichsdaten" });
    }

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

    // === RECOMMENDATION BOX ===
    // Calculate text height first
    const reasoningText = result.overallRecommendation.reasoning;
    const confidenceText = `Konfidenz: ${result.overallRecommendation.confidence}%`;

    // Estimate box height based on text length (roughly 80 chars per line at fontSize 11)
    const estimatedLines = Math.ceil(reasoningText.length / 70);
    const boxHeight = Math.max(90, 50 + (estimatedLines * 14) + 20);

    const recY = doc.y;
    doc.rect(50, recY, 495, boxHeight)
       .fill('#f0f7ff');

    doc.fontSize(16)
       .fillColor(primaryColor)
       .text(`Empfehlung: Vertrag ${result.overallRecommendation.recommended}`, 70, recY + 15);

    doc.fontSize(11)
       .fillColor(textColor)
       .text(reasoningText, 70, recY + 40, { width: 455 });

    // Get actual Y position after reasoning text
    const afterReasoningY = doc.y;

    doc.fontSize(9)
       .fillColor(mutedColor)
       .text(confidenceText, 70, afterReasoningY + 5);

    doc.y = recY + boxHeight + 10;
    doc.moveDown(0.5);

    // === SCORES COMPARISON ===
    doc.fontSize(16)
       .fillColor(textColor)
       .text('Bewertung im Vergleich', { underline: true });
    doc.moveDown(0.5);

    // Contract 1 Score
    const score1Color = result.contract1Analysis.riskLevel === 'low' ? successColor :
                        result.contract1Analysis.riskLevel === 'medium' ? warningColor : dangerColor;
    const risk1Text = result.contract1Analysis.riskLevel === 'low' ? 'Niedrig' :
                      result.contract1Analysis.riskLevel === 'medium' ? 'Mittel' : 'Hoch';

    doc.fontSize(14)
       .fillColor(score1Color)
       .text(`Vertrag 1: ${result.contract1Analysis.score}/100`, { continued: true })
       .fillColor(mutedColor)
       .text(` (Risiko: ${risk1Text})`, { continued: result.overallRecommendation.recommended === 1 });

    if (result.overallRecommendation.recommended === 1) {
      doc.fontSize(10).fillColor(successColor).text('  [EMPFOHLEN]');
    }
    doc.moveDown(0.3);

    // Contract 2 Score
    const score2Color = result.contract2Analysis.riskLevel === 'low' ? successColor :
                        result.contract2Analysis.riskLevel === 'medium' ? warningColor : dangerColor;
    const risk2Text = result.contract2Analysis.riskLevel === 'low' ? 'Niedrig' :
                      result.contract2Analysis.riskLevel === 'medium' ? 'Mittel' : 'Hoch';

    doc.fontSize(14)
       .fillColor(score2Color)
       .text(`Vertrag 2: ${result.contract2Analysis.score}/100`, { continued: true })
       .fillColor(mutedColor)
       .text(` (Risiko: ${risk2Text})`, { continued: result.overallRecommendation.recommended === 2 });

    if (result.overallRecommendation.recommended === 2) {
      doc.fontSize(10).fillColor(successColor).text('  [EMPFOHLEN]');
    }
    doc.moveDown(1.5);

    // === STRENGTHS & WEAKNESSES ===
    doc.fontSize(16)
       .fillColor(textColor)
       .text('Stärken & Schwächen', { underline: true });
    doc.moveDown(0.5);

    // Vertrag 1
    doc.fontSize(13).fillColor(primaryColor).text('Vertrag 1');
    doc.fontSize(11).fillColor(successColor).text('Staerken:');
    result.contract1Analysis.strengths.slice(0, 3).forEach(s => {
      doc.fontSize(10).fillColor(textColor).text(`  - ${s}`);
    });
    doc.fontSize(11).fillColor(dangerColor).text('Schwaechen:');
    result.contract1Analysis.weaknesses.slice(0, 3).forEach(w => {
      doc.fontSize(10).fillColor(textColor).text(`  - ${w}`);
    });
    doc.moveDown(0.5);

    // Vertrag 2
    doc.fontSize(13).fillColor(primaryColor).text('Vertrag 2');
    doc.fontSize(11).fillColor(successColor).text('Staerken:');
    result.contract2Analysis.strengths.slice(0, 3).forEach(s => {
      doc.fontSize(10).fillColor(textColor).text(`  - ${s}`);
    });
    doc.fontSize(11).fillColor(dangerColor).text('Schwaechen:');
    result.contract2Analysis.weaknesses.slice(0, 3).forEach(w => {
      doc.fontSize(10).fillColor(textColor).text(`  - ${w}`);
    });
    doc.moveDown(1.5);

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

    // === FOOTER ON LAST PAGE ===
    doc.moveDown(2);

    // Summary
    if (result.summary) {
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
    res.status(500).json({ message: "Fehler beim PDF-Export: " + error.message });
  }
});

module.exports = router;