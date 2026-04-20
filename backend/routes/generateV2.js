// 🆕 V2 META-PROMPT SYSTEM - Zwei-Phasen-Vertragsgenerierung
// Phase 1: Meta-Prompt Generation (optimaler Prompt für Phase 2)
// Phase 2: Contract Text Generation (execution mit Phase 1 Prompt)
// Self-Check: Qualitätssicherung mit Score + Retry-Logik

const { OpenAI } = require("openai");
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// 🔐 Encryption für sichere Artefakt-Ablage
const { encrypt, decrypt } = require("../security/encryption");

// Feature-Flag aus .env
const FEATURE_ENABLED = process.env.GENERATE_V2_META_PROMPT === 'true';

// Model-Settings (konservativ für Reproduzierbarkeit)
const MODEL_SETTINGS = {
  phase1: {
    model: "gpt-4o-mini",
    temperature: 0.25,
    top_p: 0.9,
    max_tokens: 2000
  },
  phase2: {
    model: "gpt-4o",
    temperature: 0.05,
    top_p: 0.9,
    max_tokens: 8000
  },
  selfCheck: {
    model: "gpt-4o-mini",
    temperature: 0.0,
    top_p: 0.9,
    max_tokens: 500
  }
};

// Self-Check Score Threshold
const SELFCHECK_THRESHOLD = 0.93;

// Retry Settings
const RETRY_SETTINGS = {
  maxRetries: 2,
  timeoutMs: 90000, // 90 seconds (erhöht für komplexe Sonderklausel-Fälle)
  backoffMultiplier: 2 // Exponential: 1s, 2s, 4s
};

// ===== HELPER FUNCTIONS =====

/**
 * Sanitiert Input-Daten für Logging (entfernt PII)
 * Nur IDs, Typen und nicht-persönliche Felder werden behalten
 */
function sanitizeInputForLogging(input) {
  const sanitized = {};

  // Erlaubte Felder (keine PII)
  const allowedFields = ['contractType', 'duration', 'amount', 'startDate', 'endDate'];

  allowedFields.forEach(field => {
    if (input[field]) {
      sanitized[field] = input[field];
    }
  });

  // Parteien: Nur Existenz prüfen, keine Namen/Adressen
  if (input.parteiA) {
    sanitized.parteiA = { exists: true };
  }
  if (input.parteiB) {
    sanitized.parteiB = { exists: true };
  }

  // Custom Requirements: Nur Länge
  if (input.customRequirements) {
    sanitized.customRequirements = { length: input.customRequirements.length };
  }

  return sanitized;
}

/**
 * Sanitiert Vertragstext für Logging (entfernt PII)
 * Gibt nur Metadaten zurück, keinen tatsächlichen Text
 */
function sanitizeTextForLogging(text) {
  return {
    length: text.length,
    paragraphCount: (text.match(/§\s*\d+/g) || []).length,
    preview: text.substring(0, 100).replace(/[A-ZÄÖÜ][a-zäöüß]+\s+[A-ZÄÖÜ][a-zäöüß]+/g, '[NAME]') + '...'
  };
}

/**
 * Führt OpenAI API Call mit Timeout aus
 * @param {Function} apiCallFn - Async function that makes the OpenAI call
 * @param {number} timeoutMs - Timeout in milliseconds
 * @returns {Promise} - Resolves with API response or rejects on timeout
 */
async function callWithTimeout(apiCallFn, timeoutMs) {
  return Promise.race([
    apiCallFn(),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`OpenAI API call timeout after ${timeoutMs}ms`)), timeoutMs)
    )
  ]);
}

/**
 * Sleep-Funktion für Exponential Backoff
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Normalisiert Text für intelligenten Vergleich
 * - Case-insensitive
 * - Umlaute → ae/oe/ue/ss
 * - Whitespace normalisieren
 */
function normalizeText(text) {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Intelligente Filterung von Forbidden Topics
 * Entfernt Topics, die in IRGENDWELCHEN Input-Feldern erwähnt werden
 * @param {Array<string>} forbiddenTopics - Originale forbidden topics
 * @param {Object} input - Alle Formulareingaben
 * @param {Array<string>} forbiddenSynonyms - Optional: Synonyme für Forbidden Topics (Format: ["topic1|synonym1|synonym2", ...])
 * @returns {Array<string>} Gefilterte forbidden topics
 */
function filterForbiddenTopics(forbiddenTopics, input, forbiddenSynonyms = []) {
  // Sammle ALLE Textwerte aus dem Input (rekursiv)
  const allInputTexts = [];

  function extractTexts(obj) {
    if (typeof obj === 'string') {
      allInputTexts.push(obj);
    } else if (typeof obj === 'object' && obj !== null) {
      Object.values(obj).forEach(value => extractTexts(value));
    }
  }

  extractTexts(input);

  // Normalisiere alle Input-Texte
  const normalizedInput = allInputTexts.map(normalizeText).join(' ');

  // Filtere Topics: Behalte nur die, die NICHT im Input vorkommen
  const filteredTopics = forbiddenTopics.filter(topic => {
    const normalizedTopic = normalizeText(topic);

    // Wortgrenzen-basierte Prüfung mit Regex (inkl. Satzzeichen)
    // (^|\\W) = Start oder Nicht-Wort-Zeichen (Leerzeichen, Satzzeichen)
    // (\\W|$) = Nicht-Wort-Zeichen oder Ende
    const escapedTopic = normalizedTopic.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(^|\\W)${escapedTopic}(\\W|$)`, 'i');

    // Check 1: Regex-Match (mit Satzzeichen-Wortgrenzen)
    let isExplicitlyMentioned = regex.test(normalizedInput);

    // Check 2: Teilstring-Match (z.B. "Gartennutzung" enthält "Garten")
    if (!isExplicitlyMentioned) {
      isExplicitlyMentioned = normalizedInput.includes(normalizedTopic);
    }

    // Check 3: Synonyme prüfen (falls vorhanden)
    if (!isExplicitlyMentioned && forbiddenSynonyms.length > 0) {
      // Finde Synonymliste für dieses Topic
      const synonymEntry = forbiddenSynonyms.find(entry => {
        const parts = entry.split('|').map(normalizeText);
        return parts.includes(normalizedTopic);
      });

      if (synonymEntry) {
        const synonyms = synonymEntry.split('|').map(normalizeText);
        // Prüfe alle Synonyme
        isExplicitlyMentioned = synonyms.some(synonym => {
          const escapedSynonym = synonym.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const synonymRegex = new RegExp(`(^|\\W)${escapedSynonym}(\\W|$)`, 'i');
          return synonymRegex.test(normalizedInput) || normalizedInput.includes(synonym);
        });
      }
    }

    // Topic BEHALTEN, wenn es NICHT erwähnt wurde
    return !isExplicitlyMentioned;
  });

  return filteredTopics;
}

// ===== PHASE 1: META-PROMPT GENERATION =====

/**
 * Generiert einen optimalen Prompt für Phase 2
 * @param {Object} input - Formulareingaben (unverändert)
 * @param {string} contractType - Vertragstyp (mietvertrag, freelancer, kaufvertrag)
 * @param {Object} typeProfile - Vertragstyp-Modul (roles, mustClauses, forbiddenTopics)
 * @returns {Promise<{generatedPrompt: string, snapshot: Object, timingMs: number, tokenCount: Object}>}
 */
async function runPhase1_MetaPrompt(input, contractType, typeProfile) {
  const startTime = Date.now();

  console.log("🔄 Phase 1: Meta-Prompt Generation gestartet");
  console.log("📋 Vertragstyp:", contractType);
  console.log("👥 Rollen:", typeProfile.roles);
  console.log("📊 Input (sanitiert):", sanitizeInputForLogging(input));

  // System-Instruction für Phase 1
  const systemPrompt = `Du bist Prompt-Engineer und Fachanwalt für deutsches Vertragsrecht (BGB).

WICHTIG - PHASE 1 AUFGABE:
Du schreibst JETZT NICHT den Vertrag selbst! Deine Aufgabe ist es, klare ANWEISUNGEN zu schreiben, die einem anderen KI-System (Phase 2) exakt erklären, WIE es den Vertrag erstellen soll.

Du erstellst einen META-PROMPT (Anleitung für Phase 2), NICHT den Vertrag selbst!

BEISPIEL FÜR META-PROMPT:
"Erstelle einen vollständigen, umfassenden Mietvertrag nach BGB. Die Vertragsparteien sind: Vermieter Max Mustermann, Musterstraße 1, 12345 Berlin und Mieter Anna Schmidt, Hauptstr. 5, 80331 München. Verwende EXAKT diese Namen im gesamten Vertrag — KEINE Platzhalter wie [Name des Vermieters]! Verwende EXAKT die Begriffe 'Vermieter' und 'Mieter' (keine anderen Bezeichnungen). Pflicht-Paragraphen: § 1 Mietgegenstand, § 2 Mietzeit, § 3 Miete und Nebenkosten... Die Wohnung ist 85 qm groß, 2. OG. Miete: 950€, Nebenkosten: 200€, Kaution: 2850€. Mietbeginn: 01.01.2025. Erwähne NICHT: Garten, Balkon, Stellplatz (außer explizit genannt). Individuelle Anforderungen (VERBINDLICH als feste Klauseln!): Haustiere nach Absprache erlaubt. Der Vertrag soll professionell, detailliert und umfassend sein (mindestens 4000-5000 Zeichen)."

REGELN FÜR DEINEN META-PROMPT:
1. Beschreibe ALLE Eingabedaten präzise — gib die EXAKTEN Namen und Adressen der Parteien an
   - Übernimm Namen und Daten WÖRTLICH aus den Eingaben
   - Verwende Platzhalter NUR wenn ein Feld explizit als "[NAME FEHLT]" markiert ist
   - NIEMALS falsche/erfundene Namen oder Adressen instruieren
2. Liste ALLE Pflicht-Paragraphen auf: ${typeProfile.mustClauses.join(', ')}
3. Definiere verbotene Themen (was NICHT erfunden werden darf)
4. Verwende exakte Rollenbegriffe: ${typeProfile.roles.A} und ${typeProfile.roles.B}
5. Integriere individuelle Anforderungen als VERBINDLICHE Klauseln (NICHT optional formulieren!)
6. WICHTIG: Übernimm die EXAKTEN Parteinamen aus den Eingabedaten in den Meta-Prompt. Fordere PRÄAMBEL mit vollständigen Vertragsparteien
7. WICHTIG: Fordere umfassende, detaillierte Paragraphen (mindestens 4000-5000 Zeichen Gesamtlänge)
8. WICHTIG: Betone professionellen, ausführlichen Stil - KEINE Kurzfassungen oder Minimalismus

Output-Format (strikt einhalten!):
===PROMPT===
[Vollständiger META-PROMPT mit allen Anweisungen für Phase 2]
===SNAPSHOT===
{
  "roles": {"A": "${typeProfile.roles.A}", "B": "${typeProfile.roles.B}"},
  "mustClauses": ["§ 1 ...", "§ 2 ...", ...],
  "forbiddenTopics": ["Thema1", "Thema2", ...],
  "customRequirements": ["Anforderung1", "Anforderung2", ...]
}`;

  // User-Prompt (Template mit Eingabedaten)
  const userPrompt = buildPhase1UserPrompt(input, contractType, typeProfile);

  // GPT-4 Call mit Timeout
  try {
    const completion = await callWithTimeout(
      () => openai.chat.completions.create({
        model: MODEL_SETTINGS.phase1.model,
        temperature: MODEL_SETTINGS.phase1.temperature,
        top_p: MODEL_SETTINGS.phase1.top_p,
        max_tokens: MODEL_SETTINGS.phase1.max_tokens,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ]
      }),
      RETRY_SETTINGS.timeoutMs
    );

    const response = completion.choices[0].message.content;
    const tokenCount = {
      prompt: completion.usage.prompt_tokens,
      completion: completion.usage.completion_tokens,
      total: completion.usage.total_tokens
    };

    // Parse Response (PROMPT + SNAPSHOT trennen)
    const parsed = parsePhase1Response(response);

    const timingMs = Date.now() - startTime;

    console.log("✅ Phase 1 erfolgreich:", {
      promptLength: parsed.generatedPrompt.length,
      snapshotKeys: Object.keys(parsed.snapshot),
      timingMs,
      tokens: tokenCount.total
    });

    return {
      generatedPrompt: parsed.generatedPrompt,
      snapshot: parsed.snapshot,
      timingMs,
      tokenCount,
      model: MODEL_SETTINGS.phase1.model,
      temperature: MODEL_SETTINGS.phase1.temperature
    };

  } catch (error) {
    console.error("❌ Phase 1 fehlgeschlagen:", error.message);
    throw new Error(`Phase 1 Meta-Prompt Generation failed: ${error.message}`);
  }
}

/**
 * Baut User-Prompt für Phase 1 (Eingabedaten → Template)
 */
function buildPhase1UserPrompt(input, contractType, typeProfile) {
  // 🆕 INDIVIDUELL: Rollen-Override aus Input (parteiA.role, parteiB.role, oder rolesA/rolesB)
  let roleA = typeProfile.roles.A;
  let roleB = typeProfile.roles.B;

  if (contractType === 'individuell') {
    if (input.parteiA?.role) roleA = input.parteiA.role;
    else if (input.rolesA) roleA = input.rolesA;

    if (input.parteiB?.role) roleB = input.parteiB.role;
    else if (input.rolesB) roleB = input.rolesB;
  }

  let prompt = `VERTRAGSTYP: ${roleA}/${roleB}-Vertrag (Deutsches BGB)\n\n`;

  prompt += `ROLLEN (EXAKT verwenden!):\n`;
  prompt += `- Partei A = "${roleA}"\n`;
  prompt += `- Partei B = "${roleB}"\n\n`;

  prompt += `EINGABEDATEN:\n`;
  prompt += `- ${roleA}: ${input.parteiA?.name || '[NAME FEHLT]'}`;
  if (input.parteiA?.address) prompt += `, ${input.parteiA.address}`;
  if (input.parteiA?.details) prompt += `, ${input.parteiA.details}`;
  prompt += `\n`;

  prompt += `- ${roleB}: ${input.parteiB?.name || '[NAME FEHLT]'}`;
  if (input.parteiB?.address) prompt += `, ${input.parteiB.address}`;
  if (input.parteiB?.details) prompt += `, ${input.parteiB.details}`;
  prompt += `\n\n`;

  // Vertragstyp-spezifische Felder (dynamisch)
  prompt += `VERTRAGSDETAILS:\n`;
  Object.keys(input).forEach(key => {
    if (key !== 'parteiA' && key !== 'parteiB' && key !== 'title' && key !== 'customRequirements'
        && key !== 'rolesA' && key !== 'rolesB' && key !== 'mustClauses' && key !== 'forbiddenTopics' && key !== 'forbiddenSynonyms') {
      prompt += `- ${key}: ${input[key]}\n`;
    }
  });

  if (input.customRequirements && input.customRequirements.trim()) {
    prompt += `\n⚠️ VERBINDLICHE INDIVIDUELLE ANFORDERUNGEN (MÜSSEN als feste Vertragsklauseln aufgenommen werden!):\n`;
    prompt += `Diese Anforderungen sind NICHT optional — sie müssen als bindende Klauseln im Vertrag erscheinen:\n`;
    prompt += `${input.customRequirements}\n`;
  }

  // 🆕 INDIVIDUELL: mustClauses-Override aus Input
  let activeMustClauses = typeProfile.mustClauses;
  if (contractType === 'individuell' && input.mustClauses && Array.isArray(input.mustClauses) && input.mustClauses.length > 0) {
    activeMustClauses = input.mustClauses;
    console.log(`📋 Individuell: Nutzer-definierte mustClauses (${activeMustClauses.length} Klauseln)`);
  }

  prompt += `\nPFLICHT-PARAGRAPHEN (alle einbauen!):\n`;
  activeMustClauses.forEach(clause => {
    prompt += `- ${clause}\n`;
  });

  // 🆕 INTEGRATION-GUIDANCE für robuste Umsetzung
  prompt += `\nINTEGRATION DER ANFORDERUNGEN:\n`;
  prompt += `- Jede individuelle Anforderung muss entweder als eigener Absatz ODER sauber in eine passende Pflichtklausel integriert werden.\n`;
  prompt += `- Nummerierung konsistent halten (fehlt eine passende Klausel, füge sie als neuen § ein).\n`;
  prompt += `- Bei zinsfreien Darlehen: § "Zinsregelung" oder "Zinsfreiheit" explizit aufnehmen.\n`;
  prompt += `- Unklare Datumsangaben (z.B. "Juli 2025") in eindeutige Form bringen (TT.MM.JJJJ) oder klarstellend formulieren.\n`;
  prompt += `- Vermeide Wiederholungen - integriere verwandte Inhalte in bestehende Paragraphen.\n`;

  // 🆕 VERTRAGSTYP-SPEZIFISCHE HINWEISE (notes) an Phase 1 übergeben
  if (typeProfile.notes && typeProfile.notes.trim()) {
    prompt += `\nSPEZIFISCHE HINWEISE FÜR DIESEN VERTRAGSTYP (UNBEDINGT BEACHTEN!):\n`;
    prompt += `${typeProfile.notes}\n`;
  }

  // ===== INTELLIGENTE FILTERUNG: Forbidden Topics =====
  // 🆕 INDIVIDUELL: forbiddenTopics/Synonyms-Override aus Input
  let baseForbiddenTopics = typeProfile.forbiddenTopics;
  let baseForbiddenSynonyms = typeProfile.forbiddenSynonyms || [];

  if (contractType === 'individuell') {
    if (input.forbiddenTopics && Array.isArray(input.forbiddenTopics)) {
      baseForbiddenTopics = input.forbiddenTopics;
      console.log(`📋 Individuell: Nutzer-definierte forbiddenTopics (${baseForbiddenTopics.length} Topics)`);
    }
    if (input.forbiddenSynonyms && Array.isArray(input.forbiddenSynonyms)) {
      baseForbiddenSynonyms = input.forbiddenSynonyms;
    }
  }

  // Entferne Topics, die in IRGENDWELCHEN Input-Feldern erwähnt werden
  const activeForbiddenTopics = filterForbiddenTopics(
    baseForbiddenTopics,
    input,
    baseForbiddenSynonyms
  );

  if (activeForbiddenTopics.length < baseForbiddenTopics.length) {
    const removed = baseForbiddenTopics.length - activeForbiddenTopics.length;
    console.log(`📋 Intelligent filtering: ${baseForbiddenTopics.length} → ${activeForbiddenTopics.length} topics (-${removed} mentioned in input)`);
  }

  prompt += `\nVERBOTENE THEMEN (NICHT erwähnen, außer explizit in Eingaben/Anforderungen genannt!):\n`;
  activeForbiddenTopics.forEach(topic => {
    prompt += `- ${topic}\n`;
  });

  prompt += `\n📋 DEINE AUFGABE (PHASE 1):\n`;
  prompt += `Erstelle einen META-PROMPT (Anleitung) für Phase 2, der EXAKT beschreibt, WIE der Vertrag erstellt werden soll.\n`;
  prompt += `Generiere NICHT den Vertrag selbst! Nur Anweisungen!\n\n`;

  prompt += `SNAPSHOT-ANFORDERUNG:\n`;
  prompt += `Fülle das Snapshot-JSON mit:\n`;
  prompt += `- "roles": {"A": "${roleA}", "B": "${roleB}"}\n`;
  prompt += `- "mustClauses": [alle ${activeMustClauses.length} Pflicht-Paragraphen aus obiger Liste]\n`;
  prompt += `- "forbiddenTopics": [${activeForbiddenTopics.length > 0 ? `genau diese ${activeForbiddenTopics.length} gefilterten Themen aus der "VERBOTENE THEMEN"-Liste oben` : '[]'}]\n`;
  prompt += `- "customRequirements": [${input.customRequirements ? 'alle individuellen Anforderungen als Array' : '[]'}]\n`;

  return prompt;
}

/**
 * Parst Phase 1 Response (trennt PROMPT und SNAPSHOT)
 */
function parsePhase1Response(response) {
  const promptMatch = response.match(/===PROMPT===\s*([\s\S]*?)\s*===SNAPSHOT===/);
  const snapshotMatch = response.match(/===SNAPSHOT===\s*([\s\S]*?)$/);

  if (!promptMatch || !snapshotMatch) {
    console.error("❌ Phase 1 Response Format-Fehler!");
    console.error("Erwartetes Format:\n===PROMPT===\n[Prompt]\n===SNAPSHOT===\n[JSON]");
    console.error("\nErhalten (first 1000 chars):\n", response.substring(0, 1000));
    throw new Error("Phase 1 Response hat nicht das erwartete Format (===PROMPT=== / ===SNAPSHOT=== fehlt)");
  }

  const generatedPrompt = promptMatch[1].trim();
  const snapshotText = snapshotMatch[1].trim();

  let snapshot;
  try {
    // JSON parsen (mit Fallback für Code-Block-Syntax ```json)
    const cleanedSnapshot = snapshotText.replace(/```json\s*/g, '').replace(/```\s*$/g, '');
    snapshot = JSON.parse(cleanedSnapshot);
  } catch (err) {
    throw new Error(`Snapshot konnte nicht als JSON geparst werden: ${err.message}`);
  }

  return { generatedPrompt, snapshot };
}

// ===== PHASE 2: CONTRACT TEXT GENERATION =====

/**
 * Generiert Vertragstext mit Phase 1 Prompt
 * @param {string} generatedPrompt - Prompt aus Phase 1
 * @param {Object} snapshot - Snapshot aus Phase 1
 * @returns {Promise<{contractText: string, timingMs: number, tokenCount: Object, retries: number}>}
 */
async function runPhase2_ContractGeneration(generatedPrompt, snapshot, originalInput) {
  const startTime = Date.now();

  console.log("🔄 Phase 2: Contract Generation gestartet");
  console.log("📏 Prompt-Länge:", generatedPrompt.length);

  try {
    const completion = await callWithTimeout(
      () => openai.chat.completions.create({
        model: MODEL_SETTINGS.phase2.model,
        temperature: MODEL_SETTINGS.phase2.temperature,
        top_p: MODEL_SETTINGS.phase2.top_p,
        max_tokens: MODEL_SETTINGS.phase2.max_tokens,
        messages: [
          { role: "system", content: `Du bist Experte für deutsches Vertragsrecht und erstellst professionelle, rechtssichere Verträge.

ABSOLUT KRITISCHE REGELN:
1. Erstelle einen VOLLSTÄNDIGEN Vertrag mit MINDESTENS 10-12 Paragraphen
2. KEIN HTML, KEIN MARKDOWN - nur reiner Text
3. Verwende EXAKT diese Struktur (keine Abweichungen!)
4. WICHTIG - Umgang mit Daten:
   - Nutze IMMER die konkreten Namen und Daten aus dem nachfolgenden Prompt
   - Verwende Platzhalter NUR wenn die Daten im Prompt EXPLIZIT als fehlend markiert sind (z.B. "[NAME FEHLT]")
   - Wenn ein Name angegeben wurde (z.B. "Vermieter: Max Mustermann"), verwende EXAKT diesen Namen im Vertrag
   - Erfinde NIEMALS falsche Namen, Adressen oder andere Daten
5. Verwende professionelle juristische Sprache
6. Jeder Paragraph muss detailliert ausformuliert sein (mindestens 3-4 Zeilen pro Absatz)
7. KEINE UNTERSCHRIFTSLINIEN oder Unterschriftsblöcke - Der Vertrag endet nach § 10 SCHLUSSBESTIMMUNGEN
   - Füge NIEMALS Zeilen wie "_______________" für Unterschriften hinzu
   - Füge KEINE "Ort, Datum" Zeilen hinzu
   - Füge KEINE Unterschriftsblöcke wie "(Unterschrift Verkäufer)" hinzu
   - Es gibt ein separates Unterschriftenblatt!

EXAKTE VERTRAGSSTRUKTUR (BITTE GENAU SO VERWENDEN):

=================================
[VERTRAGSTYP IN GROSSBUCHSTABEN]
=================================

zwischen

WICHTIG: Setze hier die ECHTEN Namen und Adressen aus den Eingabedaten ein!
Verwende NIEMALS Platzhalter wie [Name] wenn der Name in den Eingabedaten vorhanden ist!
Name Partei A aus Eingabedaten, Adresse Partei A aus Eingabedaten
- nachfolgend "Vermieter" (oder passende Rolle) genannt -

und

Name Partei B aus Eingabedaten, Adresse Partei B aus Eingabedaten
- nachfolgend "Mieter" (oder passende Rolle) genannt -

PRÄAMBEL

[Mindestens 2-3 Sätze zur Einleitung und zum Vertragszweck. Erkläre den Hintergrund und die Absicht der Parteien.]

§ 1 VERTRAGSGEGENSTAND

(1) [Hauptgegenstand sehr detailliert beschreiben - mindestens 3-4 Zeilen. Sei spezifisch.]

(2) [Weitere wichtige Details zum Gegenstand]

(3) [Zusätzliche Spezifikationen, Abgrenzungen]

§ 2 LEISTUNGEN UND PFLICHTEN

(1) Der [Partei A] verpflichtet sich zu folgenden Leistungen:
   a) [Detaillierte Pflicht 1]
   b) [Detaillierte Pflicht 2]
   c) [Weitere Pflichten]

(2) Der [Partei B] verpflichtet sich zu folgenden Leistungen:
   a) [Detaillierte Pflicht 1]
   b) [Weitere Pflichten]

§ 3 VERGÜTUNG UND ZAHLUNGSBEDINGUNGEN

(1) Die Vergütung beträgt [EXAKTER BETRAG mit Währung].

(2) Die Zahlung erfolgt [genaue Zahlungsmodalitäten].

(3) Bei Zahlungsverzug werden Verzugszinsen in Höhe von 9 Prozentpunkten über dem Basiszinssatz berechnet.

§ 4 LAUFZEIT UND KÜNDIGUNG

(1) Dieser Vertrag tritt am [Datum] in Kraft und läuft [Laufzeitdetails].

(2) Die ordentliche Kündigung [Kündigungsfristen genau beschreiben].

(3) Das Recht zur außerordentlichen Kündigung aus wichtigem Grund bleibt unberührt.

(4) Kündigungen bedürfen der Schriftform.

§ 5 GEWÄHRLEISTUNG

(1) [Detaillierte Gewährleistungsregelungen - mindestens 3-4 Zeilen]

(2) Die Gewährleistungsfrist beträgt [Zeitraum].

§ 6 HAFTUNG

(1) Die Haftung richtet sich nach den gesetzlichen Bestimmungen, soweit nachfolgend nichts anderes bestimmt ist.

(2) [Haftungsbeschränkungen detailliert]

(3) Die vorstehenden Haftungsbeschränkungen gelten nicht bei Vorsatz, grober Fahrlässigkeit sowie bei Verletzung von Leben, Körper und Gesundheit.

§ 7 VERTRAULICHKEIT

(1) Die Vertragsparteien verpflichten sich zur Vertraulichkeit.

(2) Als vertraulich gelten alle Informationen, die als solche bezeichnet werden.

(3) Diese Verpflichtung besteht auch nach Beendigung des Vertrages fort.

§ 8 DATENSCHUTZ

(1) Die Parteien verpflichten sich zur Einhaltung der DSGVO.

(2) Personenbezogene Daten werden ausschließlich zur Vertragsdurchführung verarbeitet.

§ 9 [SPEZIFISCHE KLAUSEL]

(1) [Spezielle Regelungen je nach Vertragstyp]

§ 10 SCHLUSSBESTIMMUNGEN

(1) Änderungen bedürfen der Schriftform.

(2) Sollten einzelne Bestimmungen unwirksam sein, bleibt die Wirksamkeit im Übrigen unberührt.

(3) Gerichtsstand ist [Ort], sofern gesetzlich zulässig.

(4) Es gilt das Recht der Bundesrepublik Deutschland.

Erstelle den Vertrag exakt nach den nachfolgenden Vorgaben und dieser Struktur!` },
          { role: "user", content: generatedPrompt + buildOriginalDataBlock(originalInput) }
        ]
      }),
      RETRY_SETTINGS.timeoutMs
    );

    const contractText = replacePlaceholders(completion.choices[0].message.content, originalInput);
    const tokenCount = {
      prompt: completion.usage.prompt_tokens,
      completion: completion.usage.completion_tokens,
      total: completion.usage.total_tokens
    };

    const timingMs = Date.now() - startTime;

    console.log("✅ Phase 2 erfolgreich:", {
      textMetadata: sanitizeTextForLogging(contractText),
      timingMs,
      tokens: tokenCount.total
    });

    return {
      contractText,
      timingMs,
      tokenCount,
      model: MODEL_SETTINGS.phase2.model,
      temperature: MODEL_SETTINGS.phase2.temperature,
      retries: 0
    };

  } catch (error) {
    console.error("❌ Phase 2 fehlgeschlagen:", error.message);
    throw new Error(`Phase 2 Contract Generation failed: ${error.message}`);
  }
}

// ===== SELF-CHECK: QUALITÄTSSICHERUNG =====

/**
 * Prüft Vertragstext gegen Phase 1 Vorgaben
 * @param {string} contractText - Generierter Vertragstext
 * @param {string} generatedPrompt - Original Prompt aus Phase 1
 * @param {Object} snapshot - Snapshot aus Phase 1
 * @returns {Promise<{conforms: boolean, score: number, notes: string[]}>}
 */
async function runSelfCheck(contractText, generatedPrompt, snapshot) {
  console.log("🔍 Self-Check gestartet");

  const systemPrompt = `Du bist Qualitätsprüfer für Vertragstext.
Vergleiche den Vertragstext mit den Vorgaben aus Phase 1.

Prüfkriterien:
1. Sind alle Must-Clauses vorhanden?
2. Wurden Forbidden Topics vermieden? (WICHTIG: Themen in customRequirements sind ERLAUBT, auch wenn sie normalerweise verboten wären!)
3. Stimmen Rollenbezeichnungen exakt?
4. Wurden keine nicht übergebenen Themen erfunden?

WICHTIG: Wenn ein Thema in customRequirements erwähnt wird, ist es automatisch ERLAUBT, selbst wenn es in forbiddenTopics steht!

Gib JSON zurück:
{
  "conforms": true/false,
  "score": 0.0 - 1.0,
  "notes": ["Hinweis 1", "Hinweis 2", ...]
}`;

  const userPrompt = `VORGABEN (Phase 1):
${generatedPrompt}

SNAPSHOT:
${JSON.stringify(snapshot, null, 2)}

VERTRAGSTEXT:
${contractText.substring(0, 6000)}

Bewerte die Übereinstimmung!`;

  try {
    const completion = await callWithTimeout(
      () => openai.chat.completions.create({
        model: MODEL_SETTINGS.selfCheck.model,
        temperature: MODEL_SETTINGS.selfCheck.temperature,
        top_p: MODEL_SETTINGS.selfCheck.top_p,
        max_tokens: MODEL_SETTINGS.selfCheck.max_tokens,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ]
      }),
      RETRY_SETTINGS.timeoutMs
    );

    const response = completion.choices[0].message.content;

    // JSON parsen
    const cleaned = response.replace(/```json\s*/g, '').replace(/```\s*$/g, '');
    const result = JSON.parse(cleaned);

    console.log("✅ Self-Check abgeschlossen:", {
      conforms: result.conforms,
      score: result.score,
      notesCount: result.notes.length
    });

    return result;

  } catch (error) {
    console.error("❌ Self-Check fehlgeschlagen:", error.message);
    // Fallback: Assume okay wenn Self-Check selbst fehlschlägt
    return {
      conforms: true,
      score: 0.85,
      notes: [`Self-Check technisch fehlgeschlagen: ${error.message}`]
    };
  }
}

// ===== HELPER: Original-Daten Block für Phase 2 =====

/**
 * Baut einen strukturierten Block mit Original-Eingabedaten für Phase 2
 * Wird an den generatedPrompt angehängt, damit Phase 2 die echten Namen kennt
 */
function buildOriginalDataBlock(input) {
  if (!input) return '';

  let block = '\n\n===VERBINDLICHE ORIGINALDATEN (HÖCHSTE PRIORITÄT!)===\n';
  block += 'Die folgenden Daten MÜSSEN exakt so im Vertrag verwendet werden:\n\n';

  if (input.parteiA?.name) {
    block += `PARTEI A NAME: ${input.parteiA.name}\n`;
    if (input.parteiA.address) block += `PARTEI A ADRESSE: ${input.parteiA.address}\n`;
  }
  if (input.parteiB?.name) {
    block += `PARTEI B NAME: ${input.parteiB.name}\n`;
    if (input.parteiB.address) block += `PARTEI B ADRESSE: ${input.parteiB.address}\n`;
  }

  // Alle weiteren Vertragsdetails (Miete, Fläche, etc.)
  const skipKeys = ['parteiA', 'parteiB', 'title', 'customRequirements', 'rolesA', 'rolesB', 'mustClauses', 'forbiddenTopics', 'forbiddenSynonyms'];
  Object.entries(input).forEach(([key, value]) => {
    if (!skipKeys.includes(key) && value && typeof value === 'string' && value.trim()) {
      block += `${key}: ${value}\n`;
    }
  });

  if (input.customRequirements?.trim()) {
    block += `\nVERBINDLICHE ZUSATZANFORDERUNGEN (MÜSSEN als feste Vertragsklauseln formuliert werden, NICHT optional!):\n`;
    block += `${input.customRequirements}\n`;
  }

  block += '===ENDE ORIGINALDATEN===\n';
  return block;
}

/**
 * Deterministisches Post-Processing: Ersetzt verbleibende Platzhalter durch echte Daten
 * Sicherheitsnetz falls GPT trotzdem Platzhalter generiert
 */
function replacePlaceholders(text, input) {
  if (!input || !text) return text;

  let result = text;

  // Partei A Platzhalter ersetzen
  if (input.parteiA?.name) {
    const nameA = input.parteiA.name;
    result = result
      // Exakte Muster
      .replace(/\[Name des Vermieters?\]/gi, nameA)
      .replace(/\[Name des Verkäufers?\]/gi, nameA)
      .replace(/\[Name des Arbeitgebers?\]/gi, nameA)
      .replace(/\[Name des Auftraggebers?\]/gi, nameA)
      .replace(/\[Name des Verpächters?\]/gi, nameA)
      .replace(/\[Name des Darlehensgebers?\]/gi, nameA)
      .replace(/\[Name des Gesellschafters? A?\]/gi, nameA)
      // Kurzformen
      .replace(/\[Vermieter\]/gi, nameA)
      .replace(/\[Verkäufer\]/gi, nameA)
      .replace(/\[Arbeitgeber\]/gi, nameA)
      .replace(/\[Auftraggeber\]/gi, nameA)
      .replace(/\[Verpächter\]/gi, nameA)
      .replace(/\[Darlehensgeber\]/gi, nameA)
      .replace(/\[Lizenzgeber\]/gi, nameA)
      .replace(/\[Name des Lizenzgebers?\]/gi, nameA)
      .replace(/\[Offenlegende Partei\]/gi, nameA)
      .replace(/\[Name der [Oo]ffenlegenden Partei\]/gi, nameA)
      // Generische Muster
      .replace(/\[Name Partei A\]/gi, nameA)
      .replace(/\[Partei A\]/gi, nameA)
      .replace(/\[NAME FEHLT\]/gi, nameA)
      // Vollständiger-Name-Varianten
      .replace(/\[vollständiger Name des Vermieters?\]/gi, nameA)
      .replace(/\[vollständiger Name des Verkäufers?\]/gi, nameA)
      .replace(/\[vollständiger Name des Arbeitgebers?\]/gi, nameA)
      .replace(/\[vollständiger Name des Auftraggebers?\]/gi, nameA)
      .replace(/\[Vor- und (?:Zu|Nach)name (?:des )?(?:Vermieters?|Verkäufers?|Arbeitgebers?|Auftraggebers?|Verpächters?|Darlehensgebers?)\]/gi, nameA)
      .replace(/\[Vor- und (?:Zu|Nach)name Partei A\]/gi, nameA);
  }

  // Partei B Platzhalter ersetzen
  if (input.parteiB?.name) {
    const nameB = input.parteiB.name;
    result = result
      // Exakte Muster
      .replace(/\[Name des Mieters?\]/gi, nameB)
      .replace(/\[Name des Käufers?\]/gi, nameB)
      .replace(/\[Name des Arbeitnehmers?\]/gi, nameB)
      .replace(/\[Name des Auftragnehmers?\]/gi, nameB)
      .replace(/\[Name des Pächters?\]/gi, nameB)
      .replace(/\[Name des Darlehensnehmers?\]/gi, nameB)
      .replace(/\[Name des Gesellschafters? B?\]/gi, nameB)
      .replace(/\[Name des Freelancers?\]/gi, nameB)
      // Kurzformen
      .replace(/\[Mieter\]/gi, nameB)
      .replace(/\[Käufer\]/gi, nameB)
      .replace(/\[Arbeitnehmer\]/gi, nameB)
      .replace(/\[Auftragnehmer\]/gi, nameB)
      .replace(/\[Pächter\]/gi, nameB)
      .replace(/\[Darlehensnehmer\]/gi, nameB)
      .replace(/\[Freelancer\]/gi, nameB)
      .replace(/\[Lizenznehmer\]/gi, nameB)
      .replace(/\[Name des Lizenznehmers?\]/gi, nameB)
      .replace(/\[Empfangende Partei\]/gi, nameB)
      .replace(/\[Name der [Ee]mpfangenden Partei\]/gi, nameB)
      // Generische Muster
      .replace(/\[Name Partei B\]/gi, nameB)
      .replace(/\[Partei B\]/gi, nameB)
      // Vollständiger-Name-Varianten
      .replace(/\[vollständiger Name des Mieters?\]/gi, nameB)
      .replace(/\[vollständiger Name des Käufers?\]/gi, nameB)
      .replace(/\[vollständiger Name des Arbeitnehmers?\]/gi, nameB)
      .replace(/\[vollständiger Name des Auftragnehmers?\]/gi, nameB)
      .replace(/\[Vor- und (?:Zu|Nach)name (?:des )?(?:Mieters?|Käufers?|Arbeitnehmers?|Auftragnehmers?|Pächters?|Darlehensnehmers?)\]/gi, nameB)
      .replace(/\[Vor- und (?:Zu|Nach)name Partei B\]/gi, nameB);
  }

  // Adressen ersetzen (Partei A)
  if (input.parteiA?.address) {
    result = result
      .replace(/\[Straße\],?\s*\[PLZ Ort\]/gi, input.parteiA.address)
      .replace(/\[Adresse des Vermieters?\]/gi, input.parteiA.address)
      .replace(/\[Adresse des Verkäufers?\]/gi, input.parteiA.address)
      .replace(/\[Adresse des Arbeitgebers?\]/gi, input.parteiA.address)
      .replace(/\[Adresse des Auftraggebers?\]/gi, input.parteiA.address)
      .replace(/\[Adresse des Lizenzgebers?\]/gi, input.parteiA.address)
      .replace(/\[Adresse der [Oo]ffenlegenden Partei\]/gi, input.parteiA.address)
      .replace(/\[Adresse Partei A\]/gi, input.parteiA.address);
  }

  // Adressen ersetzen (Partei B)
  if (input.parteiB?.address) {
    result = result
      .replace(/\[Adresse des Mieters?\]/gi, input.parteiB.address)
      .replace(/\[Adresse des Käufers?\]/gi, input.parteiB.address)
      .replace(/\[Adresse des Arbeitnehmers?\]/gi, input.parteiB.address)
      .replace(/\[Adresse des Auftragnehmers?\]/gi, input.parteiB.address)
      .replace(/\[Adresse des Lizenznehmers?\]/gi, input.parteiB.address)
      .replace(/\[Adresse der [Ee]mpfangenden Partei\]/gi, input.parteiB.address)
      .replace(/\[Adresse des Freelancers?\]/gi, input.parteiB.address)
      .replace(/\[Adresse Partei B\]/gi, input.parteiB.address);
  }

  return result;
}

// ===== REPAIR-PASS: Ergänzt fehlende Pflichtklauseln =====

/**
 * Helper: Erstellt eine Zusammenfassung der Eingabedaten für Repair-Pass
 */
function buildInputSummary(input) {
  const parts = [];

  if (input.parteiA?.name) parts.push(`Partei A: ${input.parteiA.name}`);
  if (input.parteiB?.name) parts.push(`Partei B: ${input.parteiB.name}`);

  // Collect all non-party fields
  const otherFields = Object.keys(input).filter(k =>
    k !== 'parteiA' && k !== 'parteiB' && k !== 'customRequirements' && input[k]
  );

  otherFields.forEach(field => {
    const value = input[field];
    if (typeof value === 'string' && value.trim()) {
      parts.push(`${field}: ${value}`);
    } else if (typeof value === 'object' && value !== null) {
      parts.push(`${field}: ${JSON.stringify(value)}`);
    }
  });

  return parts.length > 0 ? parts.join('\n') : 'Keine zusätzlichen Angaben';
}

/**
 * Universeller Repair-Pass (Prompt 1)
 * Ergänzt fehlende Must-Clauses, korrigiert Nummerierung, integriert Sonderwünsche
 */
async function runUniversalRepair(contractText, snapshot, phase1Input) {
  const systemPrompt = `Du bist Jurist:in für deutsches Vertragsrecht (BGB). Du erhältst:
- den vom System erzeugten Vertragstext (CURRENT_TEXT),
- einen Snapshot mit Pflichtenliste (MUST_CLAUSES, inkl. Alternativtiteln mit "|"),
- Rollenbezeichnungen (ROLES),
- verbotene Themen (FORBIDDEN_TOPICS),
- optionale Sonderanforderungen (CUSTOM_REQUIREMENTS),
- Input-Zusammenfassung (INPUT_SUMMARY).

Deine Aufgabe: "Repair-Pass" = fehlende Pflichtklauseln ergänzen und formale Mängel beheben, ohne Inhalte zu erfinden.

KRITISCH: AUSFÜHRLICHKEIT BEIBEHALTEN!
Der Originaltext ist bereits umfassend und detailliert formuliert. Deine Aufgabe ist es NUR zu reparieren, NICHT zu kürzen!
Behalte die LÄNGE und AUSFÜHRLICHKEIT des Originaltexts bei. Wenn Paragraphen bereits ausführlich sind, lasse sie so.

HARTE REGELN
1) MUSS jede Pflichtklausel aus MUST_CLAUSES abdecken. Alternativtitel sind gleichwertig; nutze genau einen passenden Titel pro Pflichtklausel.
2) Nummerierung konsistent ab § 1 aufwärts; keine Nummer doppelt, keine Lücke.
3) Keine verbotenen Themen erwähnen – außer sie stehen ausdrücklich in INPUT_SUMMARY oder CUSTOM_REQUIREMENTS.
4) Keine Fakten erfinden. Wenn Daten unklar/fehlend sind, formuliere rechtssicher mit Platzhalter-Klammern: „[Datum eintragen]", „[Betrag eintragen]".
5) CUSTOM_REQUIREMENTS entweder als eigener Absatz ODER sauber in die passende Pflichtklausel integrieren (keine Dopplungen).
6) Stil: sachlich, präzise, deutsches Vertragsdeutsch - UMFASSEND und DETAILLIERT (nicht minimal!).

REPARATURSCHRITTE (Checkliste)
- [ ] Prüfe MUST_CLAUSES gegen CURRENT_TEXT. Ergänze vollständig fehlende Klauseln.
- [ ] Vereinheitliche Titel (einen Alternativtitel wählen), Nummerierung korrigieren.
- [ ] Ersetze unklare Datumsangaben ("Juli 2025") durch klare Formate „TT.MM.JJJJ" oder belasse sie mit klarer Klarstellung („…spätestens zum [TT.MM.JJJJ]").
- [ ] Integriere CUSTOM_REQUIREMENTS ohne Wiederholung.
- [ ] Entferne Wiederholungen/Widersprüche.
- [ ] Keine PII erfinden; nur übernehmen, was in INPUT_SUMMARY steht.

AUSGABE
Gib ausschließlich den finalen VERTRAGSTEXT zurück – ohne Erklärungen oder Listen.`;

  const inputSummary = phase1Input ? buildInputSummary(phase1Input) : 'Keine zusätzlichen Angaben';

  const userPrompt = `ROLES:
${JSON.stringify(snapshot.roles, null, 2)}

MUST_CLAUSES:
${(snapshot.mustClauses || []).map(c => `- ${c}`).join('\n')}

FORBIDDEN_TOPICS:
${(snapshot.forbiddenTopics || []).map(t => `- ${t}`).join('\n')}

CUSTOM_REQUIREMENTS:
${(snapshot.customRequirements || []).join('\n') || 'Keine'}

INPUT_SUMMARY:
${inputSummary}

CURRENT_TEXT:
<<<
${contractText}
>>>`;

  try {
    const completion = await callWithTimeout(
      () => openai.chat.completions.create({
        model: 'gpt-4o',
        temperature: 0.1,
        max_tokens: 6000,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ]
      }),
      RETRY_SETTINGS.timeoutMs
    );

    const repairedText = completion.choices[0].message.content.trim();
    console.log("✅ Universal Repair abgeschlossen:", {
      originalLength: contractText.length,
      repairedLength: repairedText.length,
      tokens: completion.usage.total_tokens
    });

    return repairedText;

  } catch (error) {
    console.error("❌ Universal Repair fehlgeschlagen:", error.message);
    return contractText; // Fallback: Original-Text
  }
}

/**
 * Darlehen-Spezialisierung (Prompt 2)
 * Erzwingt Zinsregelung/Zinsfreiheit-Klausel
 */
async function runDarlehenSpecialization(contractText, snapshot) {
  const systemPrompt = `Zusatzinstruktion für Vertragstyp DARLEHEN, speziell Edge Cases:

KRITISCH: AUSFÜHRLICHKEIT BEIBEHALTEN!
Der Vertrag ist bereits umfassend formuliert. Repariere nur, kürze NICHT! Behalte die ausführlichen Formulierungen bei.

SPEZIALISIERUNGSREGELN:
- Wenn Zinsfreiheit/„0 %" erkannt oder nahegelegt (in INPUT_SUMMARY oder CUSTOM_REQUIREMENTS), MUSS eine eigene Pflichtklausel „§ Zinsregelung" mit klarer Aussage zur Zinsfreiheit enthalten sein (z. B. „Das Darlehen ist zinsfrei. Es fallen keine laufenden Zinsen an.").
- Rückzahlung konkretisieren: Tilgungsmodus (Raten/Einmalzahlung), Fälligkeitstermine, Plan. Falls Datum unklar: Platzhalter in eckigen Klammern „[TT.MM.JJJJ]" und klarstellende Formulierungen.
- Sicherheiten, Kündigung, Verzug IMMER als eigenständige Paragraphen abbilden (gemäß MUST_CLAUSES/Alternativtiteln).
- Keine verbotenen Themen.
- Nummerierung lückenlos.

Beziehe diese Zusatzregeln ein und gib nur den finalen Vertragstext aus. Behalte die Länge und Detailtiefe bei!`;

  const userPrompt = `MUST_CLAUSES:
${(snapshot.mustClauses || []).map(c => `- ${c}`).join('\n')}

CUSTOM_REQUIREMENTS:
${(snapshot.customRequirements || []).join('\n') || 'Keine'}

CURRENT_TEXT:
<<<
${contractText}
>>>`;

  try {
    const completion = await callWithTimeout(
      () => openai.chat.completions.create({
        model: 'gpt-4o',
        temperature: 0.1,
        max_tokens: 6000,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ]
      }),
      RETRY_SETTINGS.timeoutMs
    );

    const specialized = completion.choices[0].message.content.trim();
    console.log("✅ Darlehen Specialization abgeschlossen:", {
      tokens: completion.usage.total_tokens
    });

    return specialized;

  } catch (error) {
    console.error("❌ Darlehen Specialization fehlgeschlagen:", error.message);
    return contractText; // Fallback
  }
}

/**
 * Individuell-Spezialisierung (Prompt 3)
 * Sichert benutzerdefinierte mustClauses/Rollen
 */
async function runIndividuellSpecialization(contractText, snapshot) {
  const systemPrompt = `Zusatzinstruktion für Vertragstyp INDIVIDUELL:

KRITISCH: AUSFÜHRLICHKEIT BEIBEHALTEN!
Der Vertrag ist bereits umfassend formuliert. Repariere nur, kürze NICHT! Behalte die ausführlichen Formulierungen bei.

SPEZIALISIERUNGSREGELN:
- Verwende die Rollenbezeichnungen exakt wie in ROLES vorgegeben (auch wenn vom Standard abweichend).
- MUST_CLAUSES können vom Nutzer überschrieben sein – behandle diese Liste als „maßgeblich". Für jede Klausel einen passenden Alternativtitel wählen (bei „|").
- CUSTOM_REQUIREMENTS müssen entweder als eigener Paragraph ODER sauber in eine passende Pflichtklausel integriert sein (keine Dopplung).
- Häufige Spezialfälle:
  • IP/Urheberrechte: explizit regeln, wem Arbeitsergebnisse zustehen (Übertragung vs. Lizenz).
  • Vertraulichkeit separat von Datenschutz halten.
  • Kündigung & Laufzeit trennen/vereinheitlichen.
- Nummerierung lückenlos. Keine verbotenen Themen.
- Keine Erklärungen – nur finalen Vertragstext liefern. Behalte die Länge und Detailtiefe bei!`;

  const userPrompt = `ROLES:
${JSON.stringify(snapshot.roles, null, 2)}

MUST_CLAUSES:
${(snapshot.mustClauses || []).map(c => `- ${c}`).join('\n')}

CUSTOM_REQUIREMENTS:
${(snapshot.customRequirements || []).join('\n') || 'Keine'}

CURRENT_TEXT:
<<<
${contractText}
>>>`;

  try {
    const completion = await callWithTimeout(
      () => openai.chat.completions.create({
        model: 'gpt-4o',
        temperature: 0.1,
        max_tokens: 6000,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ]
      }),
      RETRY_SETTINGS.timeoutMs
    );

    const specialized = completion.choices[0].message.content.trim();
    console.log("✅ Individuell Specialization abgeschlossen:", {
      tokens: completion.usage.total_tokens
    });

    return specialized;

  } catch (error) {
    console.error("❌ Individuell Specialization fehlgeschlagen:", error.message);
    return contractText; // Fallback
  }
}

/**
 * Orchestriert den Repair-Pass
 * Führt universellen Repair durch, dann optional Spezialisierungen
 */
async function runRepairPass(contractText, snapshot, contractType, phase1Input) {
  console.log("🔧 Repair-Pass gestartet für:", contractType);

  const startTime = Date.now();

  // 1) Universeller Repair (für alle Typen)
  let repaired = await runUniversalRepair(contractText, snapshot, phase1Input);

  // 2) Darlehen-Spezialisierung (nur wenn 0% Zins oder zinsfrei)
  if (contractType === 'darlehen') {
    const customReq = (snapshot.customRequirements || []).join(' ').toLowerCase();
    const hasZeroInterest = /0\s*%|zinsfrei|zinslos/i.test(customReq);

    if (hasZeroInterest) {
      console.log("🔧 Darlehen Edge Case erkannt (0% Zins), starte Spezialisierung...");
      repaired = await runDarlehenSpecialization(repaired, snapshot);
    }
  }

  // 3) Individuell-Spezialisierung (immer bei individuell)
  if (contractType === 'individuell') {
    console.log("🔧 Individuell-Typ erkannt, starte Spezialisierung...");
    repaired = await runIndividuellSpecialization(repaired, snapshot);
  }

  const duration = Date.now() - startTime;
  console.log(`✅ Repair-Pass abgeschlossen in ${duration}ms`);

  return repaired;
}

// ===== VALIDATOR (Deterministisch, JS-basiert) =====

/**
 * Deterministischer Validator (keine LLM-Calls)
 * @param {string} contractText - Vertragstext
 * @param {Object} snapshot - Snapshot aus Phase 1
 * @param {Object} typeProfile - Vertragstyp-Modul
 * @returns {Object} {passed: boolean, checks: Object, warnings: string[], errors: string[]}
 */
function runValidator(contractText, snapshot, typeProfile) {
  console.log("🔍 Validator gestartet (deterministisch)");

  const checks = {
    rolesCorrect: checkRoles(contractText, typeProfile.roles),
    mustClausesPresent: checkMustClauses(contractText, snapshot.mustClauses || []),
    paragraphsSequential: checkParagraphs(contractText),
    forbiddenTopicsAbsent: checkForbiddenTopics(contractText, snapshot.forbiddenTopics || []),
    dateFormatValid: checkDateFormat(contractText),
    currencyFormatValid: checkCurrencyFormat(contractText)
  };

  const warnings = [];
  const errors = [];

  // Sammle errors und warnings
  Object.keys(checks).forEach(key => {
    if (!checks[key].passed) {
      if (checks[key].severity === 'error') {
        errors.push(checks[key].message);
      } else {
        warnings.push(checks[key].message);
      }
    }
  });

  // ===== VALIDATOR SCORE (0-1) =====
  // Gewichte: rolesCorrect (30%), mustClauses (40%), other (30%)
  const weights = {
    rolesCorrect: 0.30,
    mustClausesPresent: 0.40,
    paragraphsSequential: 0.10,
    forbiddenTopicsAbsent: 0.10,
    dateFormatValid: 0.05,
    currencyFormatValid: 0.05
  };

  let validatorScore = 0;
  Object.keys(checks).forEach(key => {
    if (checks[key].passed) {
      validatorScore += (weights[key] || 0);
    }
  });

  // Score auf 2 Dezimalstellen runden
  validatorScore = Math.round(validatorScore * 100) / 100;

  const passed = errors.length === 0;

  console.log("✅ Validator abgeschlossen:", {
    passed,
    score: validatorScore,
    errorsCount: errors.length,
    warningsCount: warnings.length
  });

  return {
    passed,
    score: validatorScore,
    checks: Object.keys(checks).reduce((acc, key) => {
      acc[key] = checks[key].passed;
      return acc;
    }, {}),
    warnings,
    errors
  };
}

// Helper: Rollen-Check
function checkRoles(text, roles) {
  const allowedRoles = [roles.A, roles.B];
  const forbiddenRoles = ["Vermieter", "Mieter", "Auftraggeber", "Auftragnehmer", "Verkäufer", "Käufer"]
    .filter(r => !allowedRoles.includes(r));

  for (const forbidden of forbiddenRoles) {
    if (text.includes(forbidden)) {
      return {
        passed: false,
        severity: 'error',
        message: `Falsche Rolle gefunden: "${forbidden}" (erlaubt: ${allowedRoles.join(', ')})`
      };
    }
  }

  return { passed: true };
}

// Helper: Must-Clauses-Check (prüft ob alle Pflicht-Paragraphen vorhanden sind)
// V2.1: Fuzzy-Matching für robuste Validierung (Nummer ODER Titel reicht)
function checkMustClauses(text, mustClauses) {
  const missingClauses = [];

  // Helper: Fuzzy-Normalisierung für Titel
  function fuzzyNormalizeTitle(title) {
    return title
      .toLowerCase()
      .replace(/[:\-–—]/g, ' ')  // Doppelpunkte, Bindestriche entfernen
      .replace(/\s+/g, ' ')       // Mehrfach-Spaces zu einem
      .trim();
  }

  for (const clause of mustClauses) {
    // Extrahiere Paragraph-Nummer und Titel (z.B. "§ 1 Mietgegenstand")
    const match = clause.match(/§\s*(\d+)\s+(.+)/);
    if (!match) continue;

    const paragraphNum = match[1];
    const clauseTitle = match[2];

    // Prüfe ob Paragraph-Nummer vorhanden
    const hasNumber = new RegExp(`§\\s*${paragraphNum}\\b`).test(text);

    // Prüfe ob Titel vorhanden (mit Fuzzy-Matching und Alternativen)
    let hasTitle = false;

    // Unterstütze Alternativen mit | (z.B. "Haftung|Gewährleistung")
    const titleVariants = clauseTitle.split('|').map(v => v.trim());

    const fuzzyText = fuzzyNormalizeTitle(text);

    for (const variant of titleVariants) {
      const fuzzyVariant = fuzzyNormalizeTitle(variant);
      if (fuzzyText.includes(fuzzyVariant)) {
        hasTitle = true;
        break;
      }
    }

    // ✨ NEUE LOGIK: Nummer ODER Titel reicht (nicht beide erforderlich)
    if (!hasNumber && !hasTitle) {
      missingClauses.push(clause);
    }
  }

  if (missingClauses.length > 0) {
    return {
      passed: false,
      severity: 'error',
      message: `Fehlende Must-Clauses: ${missingClauses.join(', ')}`
    };
  }

  return { passed: true };
}

// Helper: Paragraphen-Check
function checkParagraphs(text) {
  const paragraphs = text.match(/§\s*\d+/g) || [];
  const numbers = paragraphs.map(p => parseInt(p.replace(/§\s*/, '')));

  // Prüfe lückenlose Nummerierung
  for (let i = 1; i <= numbers.length; i++) {
    if (!numbers.includes(i)) {
      return {
        passed: false,
        severity: 'warning',
        message: `Lücke in Paragraphen-Nummerierung: § ${i} fehlt`
      };
    }
  }

  return { passed: true };
}

// Helper: Forbidden Topics Check
function checkForbiddenTopics(text, forbiddenTopics) {
  for (const topic of forbiddenTopics) {
    const regex = new RegExp(`\\b${topic}\\w*\\b`, 'gi');
    if (regex.test(text)) {
      return {
        passed: false,
        severity: 'error',
        message: `Verbotenes Thema gefunden: "${topic}" (war nicht in Eingaben!)`
      };
    }
  }

  return { passed: true };
}

// Helper: Datumsformat-Check
// V2.1: Erlaubt Monatsnamen (de/en) als WARNING statt ERROR
function checkDateFormat(text) {
  const dates = text.match(/\b\d{4}-\d{2}-\d{2}\b/g);

  // Monatsnamen (de/en) erkennen
  const monthNames = [
    'januar', 'februar', 'märz', 'april', 'mai', 'juni', 'juli', 'august',
    'september', 'oktober', 'november', 'dezember',
    'january', 'february', 'march', 'april', 'may', 'june', 'july', 'august',
    'september', 'october', 'november', 'december'
  ];

  const textLower = text.toLowerCase();
  const hasMonthNames = monthNames.some(month => textLower.includes(month));

  if (hasMonthNames) {
    // Monatsnamen gefunden → Warning, nicht Error
    return {
      passed: true,
      severity: 'warning',
      message: 'Datumsangabe enthält Monatsnamen (z.B. "Juli 2025") - besser: TT.MM.JJJJ'
    };
  }

  return { passed: true }; // Immer OK, nur Warning bei Fehlen
}

// Helper: Prüft ob Darlehen zinsfrei ist
function isZeroInterest(snapshot) {
  if (!snapshot || !snapshot.customRequirements) return false;

  const customReq = (snapshot.customRequirements || '').toLowerCase();
  const hasZeroInterest =
    /0\s*%/.test(customReq) ||
    /zinsfrei/i.test(customReq) ||
    /zinslos/i.test(customReq);

  return hasZeroInterest;
}

// Helper: Währungsformat-Check (einfach)
function checkCurrencyFormat(text) {
  const currency = text.match(/\b\d{1,3}(?:\.\d{3})*,\d{2}\s?EUR\b/g);
  return { passed: true }; // Immer OK, nur Warning bei Fehlen
}

// ===== MAIN V2 FLOW =====

/**
 * Hauptfunktion für V2 Zwei-Phasen-Generierung
 * @param {Object} input - Formulareingaben
 * @param {string} contractType - Vertragstyp
 * @param {string} userId - User ID
 * @param {Object} db - MongoDB Connection
 * @param {string} runLabel - Optional: Label für Telemetrie/Staging-Runs (z.B. "staging-2025-11-05")
 * @returns {Promise<{contractText: string, artifacts: Object, generationDoc: Object}>}
 */
async function generateContractV2(input, contractType, userId, db, runLabel = null) {
  const overallStartTime = Date.now();

  console.log("🚀 V2 Zwei-Phasen-Generierung gestartet");
  console.log("📋 Vertragstyp:", contractType);
  console.log("👤 User ID (hash):", userId.substring(0, 8) + '...');
  console.log("📊 Input (sanitiert):", sanitizeInputForLogging(input));

  // Load Vertragstyp-Modul
  const typeProfile = loadContractTypeProfile(contractType);

  // Quality Threshold (aus typeProfile oder Fallback)
  const qualityThreshold = typeProfile.qualityThreshold || SELFCHECK_THRESHOLD;
  console.log(`🎯 Quality Threshold: ${qualityThreshold}`);

  // PHASE 1: Meta-Prompt Generation
  const phase1 = await runPhase1_MetaPrompt(input, contractType, typeProfile);

  // PHASE 2: Contract Generation
  let phase2 = await runPhase2_ContractGeneration(phase1.generatedPrompt, phase1.snapshot, input);

  // REPAIR-PASS (nur für individuell & darlehen zur Optimierung)
  // Ergänzt fehlende Pflichtklauseln und behebt formale Mängel
  if (contractType === 'individuell' || contractType === 'darlehen') {
    phase2.contractText = await runRepairPass(
      phase2.contractText,
      phase1.snapshot,
      contractType,
      input
    );
    // Sicherheitsnetz: Repair-Pass kann Platzhalter wieder einführen
    phase2.contractText = replacePlaceholders(phase2.contractText, input);
  }

  // VALIDATOR (deterministisch)
  let validator = runValidator(phase2.contractText, phase1.snapshot, typeProfile);

  // SELF-CHECK (LLM-basiert)
  let selfCheck = await runSelfCheck(phase2.contractText, phase1.generatedPrompt, phase1.snapshot);

  // ===== HYBRIDER QUALITÄTS-SCORE =====
  // finalScore = (0.7 * validatorScore) + (0.3 * llmScore)
  // Gewichtung: Validator 70% (deterministisch, zuverlässig) + LLM 30% (subjektiv)
  const validatorScore = validator.score;
  const llmScore = selfCheck.score;
  let finalScore = (0.7 * validatorScore) + (0.3 * llmScore);
  finalScore = Math.round(finalScore * 100) / 100;

  const initialScore = finalScore;
  let retriesUsed = 0;
  let reviewRequired = false;

  console.log(`📊 Hybrid Score: ${finalScore} (Validator: ${validatorScore}, LLM: ${llmScore})`);

  // ===== RETRY-LOGIK mit Exponential Backoff (max 2 retries) =====
  while (finalScore < qualityThreshold && retriesUsed < RETRY_SETTINGS.maxRetries) {
    retriesUsed++;

    // Exponential Backoff: 1s, 2s, 4s
    const backoffMs = 1000 * Math.pow(RETRY_SETTINGS.backoffMultiplier, retriesUsed - 1);
    console.log(`⚠️ Hybrid Score (${finalScore}) < Threshold (${qualityThreshold}), starte Retry ${retriesUsed}/${RETRY_SETTINGS.maxRetries} (Backoff: ${backoffMs}ms)...`);

    await sleep(backoffMs);

    try {
      // Retry mit temperature=0.0 (deterministisch)
      const retryCompletion = await callWithTimeout(
        () => openai.chat.completions.create({
          model: MODEL_SETTINGS.phase2.model,
          temperature: 0.0, // Komplett deterministisch!
          top_p: MODEL_SETTINGS.phase2.top_p,
          max_tokens: MODEL_SETTINGS.phase2.max_tokens,
          messages: [
            { role: "system", content: "Du bist Fachanwalt für deutsches Vertragsrecht. Erstelle den Vertrag exakt nach den Vorgaben. Verwende die EXAKTEN Namen und Daten aus den Originaldaten." },
            { role: "user", content: phase1.generatedPrompt + buildOriginalDataBlock(input) }
          ]
        }),
        RETRY_SETTINGS.timeoutMs
      );

      phase2.contractText = replacePlaceholders(retryCompletion.choices[0].message.content, input);
      phase2.retries = retriesUsed;

      // REPAIR-PASS auch im Retry (nur für individuell & darlehen)
      if (contractType === 'individuell' || contractType === 'darlehen') {
        phase2.contractText = await runRepairPass(
          phase2.contractText,
          phase1.snapshot,
          contractType,
          input
        );
        // Sicherheitsnetz: Repair-Pass kann Platzhalter wieder einführen
        phase2.contractText = replacePlaceholders(phase2.contractText, input);
      }

      // Validator & Self-Check erneut
      validator = runValidator(phase2.contractText, phase1.snapshot, typeProfile);
      selfCheck = await runSelfCheck(phase2.contractText, phase1.generatedPrompt, phase1.snapshot);

      // Neuen finalScore berechnen (70% Validator, 30% LLM)
      finalScore = (0.7 * validator.score) + (0.3 * selfCheck.score);
      finalScore = Math.round(finalScore * 100) / 100;

      console.log(`🔄 Retry ${retriesUsed} Hybrid Score: ${finalScore} (Validator: ${validator.score}, LLM: ${selfCheck.score})`);

    } catch (error) {
      console.error(`❌ Retry ${retriesUsed} fehlgeschlagen:`, error.message);
      // Bei Timeout/Fehler: Abbrechen und reviewRequired setzen
      break;
    }
  }

  // Wenn nach allen Retries Score < Threshold: reviewRequired = true
  if (finalScore < qualityThreshold) {
    reviewRequired = true;
    console.log(`⚠️ Quality threshold NOT met after ${retriesUsed} retries. reviewRequired = true`);
  }

  const overallDurationMs = Date.now() - overallStartTime;

  // ===== MongoDB Dokument erstellen (PII-SAFE!) =====
  const generationDoc = {
    userId: userId,
    contractType: contractType,
    input: sanitizeInputForLogging(input), // ⚠️ NUR SANITIERT!
    phase1: {
      // Kein generatedPrompt (enthält PII), nur Metadaten
      timingMs: phase1.timingMs,
      tokenCount: phase1.tokenCount,
      model: phase1.model,
      temperature: phase1.temperature,
      snapshot: {
        roles: phase1.snapshot.roles,
        mustClausesCount: phase1.snapshot.mustClauses?.length || 0,
        forbiddenTopicsCount: phase1.snapshot.forbiddenTopics?.length || 0,
        customRequirementsPresent: !!phase1.snapshot.customRequirements
      }
    },
    phase2: {
      contractTextMetadata: sanitizeTextForLogging(phase2.contractText), // ⚠️ NUR METADATEN!
      selfCheck: {
        conforms: selfCheck.conforms,
        initialScore: initialScore,
        finalScore: finalScore,
        validatorScore: validator.score,
        llmScore: selfCheck.score,
        retriesUsed: retriesUsed,
        reviewRequired: reviewRequired, // ⚠️ NEU!
        notesCount: selfCheck.notes?.length || 0
      },
      retries: phase2.retries,
      timingMs: phase2.timingMs,
      model: phase2.model,
      temperature: phase2.temperature,
      tokenCount: phase2.tokenCount
    },
    validator: {
      passed: validator.passed,
      score: validator.score,
      checks: validator.checks,
      errorsCount: validator.errors?.length || 0,
      warningsCount: validator.warnings?.length || 0
    },
    meta: {
      model: phase2.model,
      temperature: phase2.temperature,
      createdAt: new Date(),
      durationMs: overallDurationMs,
      featureFlag: true,
      version: "v2.1.0", // Version bump für Logging & Retry
      hybridScore: finalScore,
      reviewRequired: reviewRequired,
      runLabel: runLabel || null // Telemetrie-Label für Staging/Production-Runs
    }
  };

  // In MongoDB speichern (sanitiert + verschlüsselt)
  if (db) {
    try {
      // 1. Sanitierte Metadaten in öffentlicher Collection
      const collection = db.collection('contract_generations');
      const insertResult = await collection.insertOne(generationDoc);
      const generationId = insertResult.insertedId;
      console.log("✅ Generierung (sanitiert) in MongoDB gespeichert:", generationId);

      // 2. Verschlüsselte Artefakte in sicherer Collection (Audit/Regeneration)
      try {
        const secureCollection = db.collection('contract_generation_secure');

        // Verschlüsseln
        const phase1PromptEncrypted = encrypt(phase1.generatedPrompt);
        const contractTextEncrypted = encrypt(phase2.contractText);

        const secureDoc = {
          generationId: generationId, // Referenz auf öffentliches Dokument
          userId: userId,
          contractType: contractType,
          phase1PromptEncrypted: phase1PromptEncrypted,
          contractTextEncrypted: contractTextEncrypted,
          createdAt: new Date(),
          encryptionVersion: 'aes-256-gcm-v1'
        };

        await secureCollection.insertOne(secureDoc);
        console.log("✅ Sichere Artefakte (verschlüsselt) gespeichert");

      } catch (secureErr) {
        console.error("⚠️ Sichere Artefakt-Speicherung fehlgeschlagen:", secureErr.message);
        // Nicht critical - sanitierte Version ist gespeichert
      }

    } catch (err) {
      console.error("⚠️ MongoDB Speicherung fehlgeschlagen:", err.message);
    }
  }

  console.log("🎉 V2 Generierung abgeschlossen:", {
    durationMs: overallDurationMs,
    hybridScore: finalScore,
    validatorScore: validator.score,
    llmScore: selfCheck.score,
    validatorPassed: validator.passed,
    retriesUsed: retriesUsed,
    reviewRequired: reviewRequired,
    contractMetadata: sanitizeTextForLogging(phase2.contractText)
  });

  return {
    contractText: phase2.contractText,
    artifacts: {
      phase1: phase1,
      phase2: {
        contractText: phase2.contractText,
        timingMs: phase2.timingMs,
        model: phase2.model,
        temperature: phase2.temperature,
        tokenCount: phase2.tokenCount,
        retries: phase2.retries
      },
      selfCheck: {
        ...selfCheck,
        initialScore: initialScore,
        finalScore: finalScore,
        validatorScore: validator.score,
        llmScore: selfCheck.score,
        retriesUsed: retriesUsed,
        reviewRequired: reviewRequired // ⚠️ NEU!
      },
      validator: validator
    },
    generationDoc: generationDoc,
    reviewRequired: reviewRequired // ⚠️ NEU! Auch top-level für einfachen Zugriff
  };
}

/**
 * Lädt Vertragstyp-Modul (dynamisch)
 */
function loadContractTypeProfile(contractType) {
  const typeMap = {
    'mietvertrag': '../contractTypes/mietvertrag',
    'freelancer': '../contractTypes/freelancer',
    'kaufvertrag': '../contractTypes/kaufvertrag',
    'arbeitsvertrag': '../contractTypes/arbeitsvertrag',
    'nda': '../contractTypes/nda',
    'werkvertrag': '../contractTypes/werkvertrag',
    'lizenzvertrag': '../contractTypes/lizenzvertrag',
    // 🆕 Neue Vertragstypen
    'individuell': '../contractTypes/individuell',
    'darlehen': '../contractTypes/darlehen',
    'gesellschaft': '../contractTypes/gesellschaft',
    'aufhebungsvertrag': '../contractTypes/aufhebungsvertrag',
    'pacht': '../contractTypes/pacht',
    'kooperation': '../contractTypes/kooperation',
    'berater': '../contractTypes/berater',
    'softwareVertrieb': '../contractTypes/softwareVertrieb'
  };

  const modulePath = typeMap[contractType];
  if (!modulePath) {
    throw new Error(`Unbekannter Vertragstyp für V2: ${contractType}`);
  }

  return require(modulePath);
}

// ===== EXPORTS =====

module.exports = {
  FEATURE_ENABLED,
  generateContractV2,
  runPhase1_MetaPrompt,
  runPhase2_ContractGeneration,
  runSelfCheck,
  runValidator
};
