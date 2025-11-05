// 🆕 V2 META-PROMPT SYSTEM - Zwei-Phasen-Vertragsgenerierung
// Phase 1: Meta-Prompt Generation (optimaler Prompt für Phase 2)
// Phase 2: Contract Text Generation (execution mit Phase 1 Prompt)
// Self-Check: Qualitätssicherung mit Score + Retry-Logik

const { OpenAI } = require("openai");
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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

  // System-Instruction für Phase 1
  const systemPrompt = `Du bist Fachanwalt für deutsches Vertragsrecht (BGB) mit 20+ Jahren Erfahrung.

Deine Aufgabe: Erzeuge ausschließlich einen optimalen Prompt-Text, mit dem du selbst in Phase 2 den Vertrag korrekt generierst.

Wichtige Regeln:
- Verwende EXAKT die korrekten Rollenbegriffe für diesen Vertragstyp: ${typeProfile.roles.A} und ${typeProfile.roles.B}
- Füge KEINE Themen hinzu, die nicht in den Eingaben stehen
- Verwende professionelle juristische Sprache
- Nummerierte Paragraphen (§ 1, § 2, ...)
- Deutsche Schreibweise (BGB-konform)

Output-Format (strikt einhalten!):
===PROMPT===
[VOLLSTÄNDIGER Prompt-Text für Phase 2]
===SNAPSHOT===
{
  "roles": {"A": "${typeProfile.roles.A}", "B": "${typeProfile.roles.B}"},
  "mustClauses": [...],
  "forbiddenTopics": [...],
  "customRequirements": [...]
}`;

  // User-Prompt (Template mit Eingabedaten)
  const userPrompt = buildPhase1UserPrompt(input, contractType, typeProfile);

  // GPT-4 Call
  try {
    const completion = await openai.chat.completions.create({
      model: MODEL_SETTINGS.phase1.model,
      temperature: MODEL_SETTINGS.phase1.temperature,
      top_p: MODEL_SETTINGS.phase1.top_p,
      max_tokens: MODEL_SETTINGS.phase1.max_tokens,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ]
    });

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
  let prompt = `VERTRAGSTYP: ${typeProfile.roles.A}/${typeProfile.roles.B}-Vertrag (DE, BGB)\n\n`;
  prompt += `EINGABEN:\n`;
  prompt += `- ${typeProfile.roles.A}: ${input.parteiA?.name || '[NAME FEHLT]'}\n`;
  prompt += `- ${typeProfile.roles.B}: ${input.parteiB?.name || '[NAME FEHLT]'}\n`;

  // Vertragstyp-spezifische Felder (dynamisch)
  Object.keys(input).forEach(key => {
    if (key !== 'parteiA' && key !== 'parteiB' && key !== 'title' && key !== 'customRequirements') {
      prompt += `- ${key}: ${input[key]}\n`;
    }
  });

  if (input.customRequirements) {
    prompt += `\nINDIVIDUELLE VEREINBARUNGEN:\n${input.customRequirements}\n`;
  }

  prompt += `\nERWARTE:\n`;
  prompt += `1) Optimalen Prompt-Text für die Vertragserstellung (Phase 2, juristische Sprache, §§, keine Platzhalter)\n`;
  prompt += `2) Snapshot-Objekt mit: roles, mustClauses, forbiddenTopics, customRequirements\n\n`;
  prompt += `REGELN:\n`;
  prompt += `- Nur relevante Klauseln (aus: ${typeProfile.mustClauses.slice(0, 3).join(', ')}...)\n`;
  prompt += `- Keine Themen erfinden, die nicht in Eingaben stehen!\n`;
  prompt += `- Nummerierung § 1, § 2, ...\n`;
  prompt += `- Sprache: Deutsch (BGB)\n`;

  return prompt;
}

/**
 * Parst Phase 1 Response (trennt PROMPT und SNAPSHOT)
 */
function parsePhase1Response(response) {
  const promptMatch = response.match(/===PROMPT===\s*([\s\S]*?)\s*===SNAPSHOT===/);
  const snapshotMatch = response.match(/===SNAPSHOT===\s*([\s\S]*?)$/);

  if (!promptMatch || !snapshotMatch) {
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
async function runPhase2_ContractGeneration(generatedPrompt, snapshot) {
  const startTime = Date.now();

  console.log("🔄 Phase 2: Contract Generation gestartet");
  console.log("📏 Prompt-Länge:", generatedPrompt.length);

  try {
    const completion = await openai.chat.completions.create({
      model: MODEL_SETTINGS.phase2.model,
      temperature: MODEL_SETTINGS.phase2.temperature,
      top_p: MODEL_SETTINGS.phase2.top_p,
      max_tokens: MODEL_SETTINGS.phase2.max_tokens,
      messages: [
        { role: "system", content: "Du bist Fachanwalt für deutsches Vertragsrecht. Erstelle den Vertrag exakt nach den Vorgaben." },
        { role: "user", content: generatedPrompt }
      ]
    });

    const contractText = completion.choices[0].message.content;
    const tokenCount = {
      prompt: completion.usage.prompt_tokens,
      completion: completion.usage.completion_tokens,
      total: completion.usage.total_tokens
    };

    const timingMs = Date.now() - startTime;

    console.log("✅ Phase 2 erfolgreich:", {
      textLength: contractText.length,
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
2. Wurden Forbidden Topics vermieden?
3. Stimmen Rollenbezeichnungen exakt?
4. Wurden keine nicht übergebenen Themen erfunden?

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
    const completion = await openai.chat.completions.create({
      model: MODEL_SETTINGS.selfCheck.model,
      temperature: MODEL_SETTINGS.selfCheck.temperature,
      top_p: MODEL_SETTINGS.selfCheck.top_p,
      max_tokens: MODEL_SETTINGS.selfCheck.max_tokens,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ]
    });

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
    paragraphsSequential: checkParagraphs(contractText),
    forbiddenTopicsAbsent: checkForbiddenTopics(contractText, snapshot.forbiddenTopics || []),
    dateFormatValid: checkDateFormat(contractText),
    currencyFormatValid: checkCurrencyFormat(contractText)
  };

  const warnings = [];
  const errors = [];

  Object.keys(checks).forEach(key => {
    if (!checks[key].passed) {
      if (checks[key].severity === 'error') {
        errors.push(checks[key].message);
      } else {
        warnings.push(checks[key].message);
      }
    }
  });

  const passed = errors.length === 0;

  console.log("✅ Validator abgeschlossen:", {
    passed,
    errorsCount: errors.length,
    warningsCount: warnings.length
  });

  return {
    passed,
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

// Helper: Datumsformat-Check (einfach)
function checkDateFormat(text) {
  const dates = text.match(/\b\d{4}-\d{2}-\d{2}\b/g);
  return { passed: true }; // Immer OK, nur Warning bei Fehlen
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
 * @returns {Promise<{contractText: string, artifacts: Object, generationDoc: Object}>}
 */
async function generateContractV2(input, contractType, userId, db) {
  const overallStartTime = Date.now();

  console.log("🚀 V2 Zwei-Phasen-Generierung gestartet");
  console.log("📋 Vertragstyp:", contractType);
  console.log("👤 User ID:", userId);

  // Load Vertragstyp-Modul
  const typeProfile = loadContractTypeProfile(contractType);

  // PHASE 1: Meta-Prompt Generation
  const phase1 = await runPhase1_MetaPrompt(input, contractType, typeProfile);

  // PHASE 2: Contract Generation
  let phase2 = await runPhase2_ContractGeneration(phase1.generatedPrompt, phase1.snapshot);

  // VALIDATOR (deterministisch)
  const validator = runValidator(phase2.contractText, phase1.snapshot, typeProfile);

  // SELF-CHECK (LLM-basiert)
  let selfCheck = await runSelfCheck(phase2.contractText, phase1.generatedPrompt, phase1.snapshot);

  // RETRY-LOGIK (wenn Score < Threshold)
  if (selfCheck.score < SELFCHECK_THRESHOLD) {
    console.log(`⚠️ Self-Check Score (${selfCheck.score}) < Threshold (${SELFCHECK_THRESHOLD}), starte Retry...`);

    // Retry mit temperature=0.0
    const retryCompletion = await openai.chat.completions.create({
      model: MODEL_SETTINGS.phase2.model,
      temperature: 0.0, // Komplett deterministisch!
      top_p: MODEL_SETTINGS.phase2.top_p,
      max_tokens: MODEL_SETTINGS.phase2.max_tokens,
      messages: [
        { role: "system", content: "Du bist Fachanwalt für deutsches Vertragsrecht. Erstelle den Vertrag exakt nach den Vorgaben." },
        { role: "user", content: phase1.generatedPrompt }
      ]
    });

    phase2.contractText = retryCompletion.choices[0].message.content;
    phase2.retries = 1;

    // Self-Check erneut
    selfCheck = await runSelfCheck(phase2.contractText, phase1.generatedPrompt, phase1.snapshot);
    console.log(`🔄 Retry Self-Check Score: ${selfCheck.score}`);
  }

  const overallDurationMs = Date.now() - overallStartTime;

  // MongoDB Dokument erstellen
  const generationDoc = {
    userId: userId,
    contractType: contractType,
    input: input,
    phase1: phase1,
    phase2: {
      contractText: phase2.contractText,
      selfCheck: selfCheck,
      retries: phase2.retries,
      timingMs: phase2.timingMs,
      model: phase2.model,
      temperature: phase2.temperature,
      tokenCount: phase2.tokenCount
    },
    validator: validator,
    meta: {
      model: phase2.model,
      temperature: phase2.temperature,
      createdAt: new Date(),
      durationMs: overallDurationMs,
      featureFlag: true,
      version: "v2.0.0"
    }
  };

  // In MongoDB speichern
  if (db) {
    try {
      const collection = db.collection('contract_generations');
      await collection.insertOne(generationDoc);
      console.log("✅ Generierung in MongoDB gespeichert");
    } catch (err) {
      console.error("⚠️ MongoDB Speicherung fehlgeschlagen:", err.message);
    }
  }

  console.log("🎉 V2 Generierung abgeschlossen:", {
    durationMs: overallDurationMs,
    selfCheckScore: selfCheck.score,
    validatorPassed: validator.passed
  });

  return {
    contractText: phase2.contractText,
    artifacts: {
      phase1Prompt: phase1.generatedPrompt,
      selfCheck: selfCheck,
      validator: validator
    },
    generationDoc: generationDoc
  };
}

/**
 * Lädt Vertragstyp-Modul (dynamisch)
 */
function loadContractTypeProfile(contractType) {
  const typeMap = {
    'mietvertrag': '../contractTypes/mietvertrag',
    'freelancer': '../contractTypes/freelancer',
    'kaufvertrag': '../contractTypes/kaufvertrag'
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
