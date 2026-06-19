/**
 * briefToForm.js — Generate 2.0, Schritt 2 (Backend-Endpoint)
 * ------------------------------------------------------------------
 * Zustandsloser, ADDITIVER Endpoint. Fasst die bestehende Generierung,
 * das Rendering, die Limits oder die Persistenz NICHT an.
 *
 * Aufgabe NUR: freie Beschreibung  →  { typeId, formData, confidence }
 * Die eigentliche Vertragserzeugung läuft danach unverändert über den
 * bestehenden POST /api/contracts/generate (Frontend ruft ihn wie bisher).
 *
 * Single Source of Truth: Das Frontend schickt die Typen + Felder mit
 * (contractTypes), damit es keinen Schema-Drift gibt.
 *
 * NOCH NICHT in server.js gemountet — wird erst nach grünem TÜV eingebunden.
 *
 * Exporte:
 *   - briefToFormCore(brief, contractTypes)  → reine, testbare Funktion
 *   - router                                  → Express-Router (POST /)
 */

const express = require("express");
const path = require("path");
try { require("dotenv").config({ path: path.join(__dirname, "..", ".env") }); } catch (_) {}
const Anthropic = require("@anthropic-ai/sdk");
const rateLimit = require("express-rate-limit");

// Eigener, IPv6-sicherer Rate-Limiter (Standard-Key-Generator von express-rate-limit).
// Bewusst NICHT der geteilte rateLimiter.js — dessen keyGenerator löst ERR_ERL_KEY_GEN_IPV6 aus
// (pre-existing, app-weit; separat zu fixen). 60 Anfragen/Stunde reichen fürs Vor-Ausfüllen.
const briefLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "RATE_LIMIT", message: "Zu viele Anfragen — bitte kurz warten oder das normale Formular nutzen.", fallbackToForm: true },
});

const MODEL = "claude-sonnet-4-6"; // günstig & klug genug für Erkennung + Mapping

let _client = null;
function client() {
  if (!process.env.ANTHROPIC_API_KEY) {
    const err = new Error("ANTHROPIC_API_KEY fehlt");
    err.code = "NO_AI_KEY";
    throw err;
  }
  if (!_client) _client = new Anthropic();
  return _client;
}

// --- Hilfen ---------------------------------------------------------------
function safeJsonFromMessage(res) {
  const text = (res.content.find((b) => b.type === "text") || {}).text || "{}";
  return JSON.parse(text);
}

// 1) Vertragstyp erkennen (enum der echten Frontend-IDs)
async function detectType(brief, contractTypes) {
  const list = contractTypes.map((t) => `- ${t.id}: ${t.name}${t.description ? " (" + t.description + ")" : ""}`).join("\n");
  const res = await client().messages.create({
    model: MODEL,
    max_tokens: 200,
    thinking: { type: "disabled" },
    output_config: {
      effort: "low",
      format: {
        type: "json_schema",
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            typeId: { type: "string", enum: contractTypes.map((t) => t.id) },
            confidence: { type: "number" },
          },
          required: ["typeId", "confidence"],
        },
      },
    },
    system: "Wähle aus der Liste den am besten passenden Vertragstyp für die Beschreibung des Nutzers. confidence = 0..1 wie sicher du bist.",
    messages: [{ role: "user", content: `Verfügbare Typen:\n${list}\n\nBeschreibung:\n"${brief}"` }],
  });
  return safeJsonFromMessage(res);
}

// 2) Formular dieses Typs ausfüllen
function buildFillSchema(type) {
  const props = {};
  for (const f of type.fields) {
    props[f.name] = Array.isArray(f.options) && f.options.length
      ? { type: "string", enum: ["", ...f.options] }
      : { type: "string" };
  }
  return { type: "object", additionalProperties: false, properties: props, required: type.fields.map((f) => f.name) };
}

async function fillForm(brief, type) {
  const fieldDocs = type.fields
    .map((f) => `- ${f.name} (${f.label || f.name})${Array.isArray(f.options) && f.options.length ? " [Auswahl: " + f.options.join(" | ") + "]" : ""}${f.required ? " *Pflicht" : ""}`)
    .join("\n");
  const system =
    "Du füllst aus einer freien Beschreibung ein Vertragsformular vor. STRIKTE REGELN:\n" +
    "- FAKTISCHE Felder (Namen, Adressen, Beträge, Flächen, Daten, Fristen, IDs): NUR mit Infos aus der Beschreibung. " +
    "Fehlt die Info → leerer String \"\". ERFINDE NIEMALS Namen, Adressen, IDs, Beträge oder Daten.\n" +
    "- AUSWAHL-Felder (enum): am besten passende Option; wenn nichts genannt, marktübliche faire Standard-Option.\n" +
    "- Antworte ausschließlich im vorgegebenen JSON-Schema.";
  const res = await client().messages.create({
    model: MODEL,
    max_tokens: 3000,
    thinking: { type: "disabled" },
    output_config: { effort: "low", format: { type: "json_schema", schema: buildFillSchema(type) } },
    system,
    messages: [{ role: "user", content: `FORMULAR: ${type.name}\nFelder:\n${fieldDocs}\n\nBESCHREIBUNG:\n"${brief}"\n\nFülle das Formular so weit wie möglich aus.` }],
  });
  return safeJsonFromMessage(res);
}

/**
 * Reine, testbare Kernfunktion.
 * @param {string} brief - freie Beschreibung des Nutzers
 * @param {Array}  contractTypes - [{id,name,description,fields:[{name,label,type,required,options?}]}]
 * @returns {{typeId,confidence,formData,missingRequired}}
 */
async function briefToFormCore(brief, contractTypes) {
  if (!brief || typeof brief !== "string" || brief.trim().length < 10) {
    const err = new Error("Beschreibung zu kurz");
    err.code = "BRIEF_TOO_SHORT";
    throw err;
  }
  if (!Array.isArray(contractTypes) || contractTypes.length === 0) {
    const err = new Error("contractTypes fehlt");
    err.code = "NO_TYPES";
    throw err;
  }

  const { typeId, confidence } = await detectType(brief, contractTypes);
  const type = contractTypes.find((t) => t.id === typeId);
  if (!type) {
    const err = new Error("Erkannter Typ nicht in der Liste");
    err.code = "TYPE_NOT_FOUND";
    throw err;
  }

  const formData = await fillForm(brief, type);
  const missingRequired = type.fields
    .filter((f) => f.required && !String(formData[f.name] || "").trim())
    .map((f) => f.name);

  return { typeId, confidence, formData, missingRequired };
}

// --- Express-Router (wird erst nach TÜV in server.js gemountet) ------------
const router = express.Router();

// Mount in server.js: app.use("/api/contracts/brief-to-form", verifyToken, briefToFormRouter)
// (verifyToken läuft am Mount; der Rate-Limiter briefLimiter ist hier gekapselt.)
router.post("/", briefLimiter, async (req, res) => {
  try {
    const { brief, contractTypes } = req.body || {};
    const result = await briefToFormCore(brief, contractTypes);
    return res.json({ success: true, ...result });
  } catch (e) {
    // Sauberer Fallback: klare Codes, damit das Frontend aufs normale Formular zurückfällt
    const status = e.code === "NO_AI_KEY" ? 503 : (e.code === "BRIEF_TOO_SHORT" || e.code === "NO_TYPES" ? 400 : 502);
    return res.status(status).json({
      success: false,
      error: e.code || "AI_ERROR",
      message: "Automatisches Ausfüllen nicht möglich — bitte nutze das normale Formular.",
      fallbackToForm: true,
    });
  }
});

module.exports = { briefToFormCore, router };
