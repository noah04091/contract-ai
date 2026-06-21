/**
 * premiumGenerate.js — Generate 2.0 "Premium-Modus" (Backend)
 * ------------------------------------------------------------------
 * Eigenständige, ADDITIVE Premium-Strecke. Fasst die bestehende generate.js
 * NICHT an. Claude Opus führt ein kurzes, intelligentes Aufnahmegespräch und
 * schreibt dann einen vollständigen Top-Vertrag; Ausgabe als Premium-PDF (AVV-Stil).
 * Gespeichert wird in `contracts` (Verwaltung + geteilter Usage-Zähler).
 *
 * Endpoints (Mount: /api/contracts/premium, mit verifyToken davor):
 *   POST /chat      { messages }                  -> { contractType, ready, summary, questions }
 *   POST /generate  { messages, contractType }    -> { contractId, contractType, title, contractText }
 *   POST /pdf       { contractId }                -> application/pdf (AVV-Premium-Layout)
 *
 * NOCH NICHT in server.js gemountet — erst nach grünem TÜV + Frontend.
 */

const express = require("express");
const path = require("path");
const { ObjectId } = require("mongodb");
const database = require("../config/database");
const rateLimit = require("express-rate-limit");
const Anthropic = require("@anthropic-ai/sdk");
const PDFDocument = require("pdfkit");
try { require("dotenv").config({ path: path.join(__dirname, "..", ".env") }); } catch (_) {}

const MODEL = "claude-opus-4-8";

let _client = null;
function client() {
  if (!process.env.ANTHROPIC_API_KEY) { const e = new Error("ANTHROPIC_API_KEY fehlt"); e.code = "NO_AI_KEY"; throw e; }
  if (!_client) _client = new Anthropic();
  return _client;
}

// ---- DB (gleiches Singleton-Muster wie generate.js) ----------------------
let db, usersCollection, contractsCollection;
async function ensureDb() {
  if (contractsCollection) return;
  db = await database.connect();
  usersCollection = db.collection("users");
  contractsCollection = db.collection("contracts");
}

// =========================================================================
// 1) Bewertung: reicht es? sonst gezielte Rückfragen  (kalibriert: nicht über-fragen)
// =========================================================================
const ASSESS_SCHEMA = {
  type: "object", additionalProperties: false,
  properties: {
    contractType: { type: "string" },
    ready: { type: "boolean" },
    summary: { type: "string" },
    questions: {
      type: "array",
      items: {
        type: "object", additionalProperties: false,
        properties: { id: { type: "string" }, frage: { type: "string" }, warum: { type: "string" } },
        required: ["id", "frage", "warum"],
      },
    },
  },
  required: ["contractType", "ready", "summary", "questions"],
};

async function assess(messages) {
  const system =
    "Du bist ein erfahrener deutscher Vertragsanwalt und führst ein KURZES, effizientes Aufnahmegespräch.\n" +
    "Beurteile, ob die ZENTRALEN Eckpunkte für einen brauchbaren Vertrag vorliegen: (a) Parteien, " +
    "(b) Vertragsgegenstand/Hauptleistung, (c) Hauptkondition (Preis/Vergütung/Miete), (d) ausdrücklich genannte kritische Sonderpunkte.\n\n" +
    "Sei NICHT übervorsichtig:\n" +
    "- Liegen diese zentralen Eckpunkte vor → ready=true, questions=[], auch wenn Detail-Feinheiten fehlen (die füllst du später mit marktüblichen Standardregelungen).\n" +
    "- Rückfragen NUR wenn zentrale Eckpunkte fehlen — dann höchstens einmal die 3–5 wichtigsten, kurz und laienverständlich. Nie nach Kleinigkeiten fragen.\n" +
    "- Hat der Nutzer bereits geantwortet und die zentralen Eckpunkte liegen vor → ready=true (nicht erneut fragen).\n" +
    "summary = 1 Satz, was erstellt werden soll.";
  const res = await client().messages.create({
    model: MODEL, max_tokens: 1500,
    thinking: { type: "adaptive" },
    output_config: { effort: "high", format: { type: "json_schema", schema: ASSESS_SCHEMA } },
    system, messages,
  });
  return JSON.parse(res.content.find((b) => b.type === "text").text);
}

// =========================================================================
// 2) Vollständigen Vertrag schreiben (server-seitig gestreamt → finalMessage)
// =========================================================================
async function generateContractText(messages) {
  const system =
    "Du bist ein erfahrener deutscher Vertragsanwalt und erstellst professionelle, rechtssichere Verträge.\n\n" +
    "REGELN:\n" +
    "- Vollständiger Vertrag mit klarer §-Struktur (i. d. R. 8–14 Paragraphen). Reiner Text, kein Markdown/HTML.\n" +
    "- KEINE Platzhalter in eckigen Klammern — nutze die Angaben aus dem Gespräch. Wo eine Angabe fehlt, wähle eine marktübliche, faire Standardregelung und formuliere sie aus.\n" +
    "- Präzise, aber verständliche juristische Sprache. Deutsches Recht.\n" +
    "- Beginne mit dem Vertragstitel (Großbuchstaben), dann Parteien ('zwischen … und …'), dann die Paragraphen, am Ende Ort/Datum- und Unterschriftszeilen für beide Parteien.\n" +
    "- KEINE dekorativen Linien, Rahmen, ASCII-Kunst oder Trennzeichen-Ketten (z. B. ─────, =====, *****, ####). Nur sauberer Fließtext.\n" +
    "- Das visuelle DESIGN (Schrift/Layout/Farben) wählt der Nutzer separate über Buttons unter dem Vertrag — ändere bei Design-Wünschen NICHT den Text, sondern weise freundlich auf die Design-Auswahl hin und lass den Vertragstext unverändert.";
  const stream = client().messages.stream({
    model: MODEL, max_tokens: 16000,
    thinking: { type: "adaptive" }, output_config: { effort: "high" },
    system, messages: messages.concat([{ role: "user", content: "Erstelle jetzt den vollständigen Vertrag." }]),
  });
  const final = await stream.finalMessage();
  return (final.content.find((b) => b.type === "text")?.text || "").trim();
}

// =========================================================================
// 3) Rendering: einfaches HTML (für Speicherung/Verwaltung) + Premium-PDF (AVV-Stil)
// =========================================================================
function escapeHtml(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function textToBasicHtml(text, title) {
  const lines = text.split("\n").map((raw) => {
    const line = raw.replace(/\s+$/g, "");
    if (!line.trim()) return "<div style='height:8px'></div>";
    const isPar = /^§\s*\d/.test(line.trim());
    const isHead = /^[A-ZÄÖÜ0-9 .,„""\-()]+$/.test(line.trim()) && line.trim().length < 70 && line.trim().length > 2;
    if (isPar) return `<h3 style="color:#1f4e8c;margin:14px 0 4px;font-size:15px">${escapeHtml(line.trim())}</h3>`;
    if (isHead) return `<h2 style="text-align:center;margin:6px 0">${escapeHtml(line.trim())}</h2>`;
    return `<p style="margin:4px 0;text-align:justify;line-height:1.5">${escapeHtml(line)}</p>`;
  });
  return `<div style="font-family:Georgia,'Times New Roman',serif;color:#1a2230;max-width:720px;margin:0 auto">${lines.join("")}</div>`;
}

// Entfernt Zeichen, die die PDF-Standardschrift (WinAnsi) nicht darstellen kann
// (z. B. dekorative Linien ─/═/█, Emojis) → kein Zeichensalat im PDF.
function sanitizeForPdf(s) {
  return String(s)
    .replace(/ /g, " ")
    .replace(/[^\t\n\r\x20-\x7E¡-ÿ€§„""‚''‹›«»–—…•·°²³µ]/g, "");
}

// Echte Design-Varianten (pdfkit-Standardschriften → laufen auch auf Render/Linux)
const DESIGNS = {
  klassisch: { body: "Helvetica", bold: "Helvetica-Bold", accent: "#1f4e8c", title: "#1a2230", rule: "#1f4e8c" },
  elegant: { body: "Times-Roman", bold: "Times-Bold", accent: "#1a2230", title: "#1a2230", rule: "#9aa3af" },
  modern: { body: "Helvetica", bold: "Helvetica-Bold", accent: "#0ea5e9", title: "#0b1324", rule: "#0ea5e9" },
};

function renderPremiumPdfBuffer(text, design = "klassisch") {
  const d = DESIGNS[design] || DESIGNS.klassisch;
  const clean = sanitizeForPdf(text);
  return new Promise((resolve, reject) => {
    const M = 64;
    const doc = new PDFDocument({ size: "A4", margins: { top: M, bottom: M + 10, left: M, right: M }, bufferPages: true });
    const W = doc.page.width - M * 2;
    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    // Dezente Akzentlinie oben – KEIN Plattform-Branding im Dokument des Nutzers
    doc.moveTo(M, M).lineTo(M + W, M).lineWidth(1.4).strokeColor(d.rule).stroke();
    doc.y = M + 14;
    for (const raw of clean.split("\n")) {
      const line = raw.replace(/\s+$/g, "");
      if (!line.trim()) { doc.y += 5; continue; }
      if (doc.y > doc.page.height - M - 40) doc.addPage();
      const isPar = /^§\s*\d/.test(line.trim());
      const isHead = /^[A-ZÄÖÜ0-9 .,„""\-()]+$/.test(line.trim()) && line.trim().length < 70 && line.trim().length > 2;
      if (isPar) { doc.font(d.bold).fontSize(11).fillColor(d.accent).text(line.trim(), M, doc.y + 6, { width: W }); doc.y += 2; }
      else if (isHead && !line.startsWith("(")) { doc.font(d.bold).fontSize(doc.y < 110 ? 16 : 11).fillColor(d.title).text(line.trim(), M, doc.y + 4, { width: W }); doc.y += 2; }
      else { doc.font(d.body).fontSize(10).fillColor("#1a2230").text(line, M, doc.y + 2, { width: W, align: "justify", lineGap: 2.4 }); }
    }
    // Neutrale Fußzeile: nur Seitenzahl (kein „Contract AI")
    const range = doc.bufferedPageRange();
    for (let i = 0; i < range.count; i++) {
      doc.switchToPage(range.start + i); doc.page.margins.bottom = 0;
      doc.font(d.body).fontSize(7.5).fillColor("#9aa3af")
        .text("Seite " + (i + 1) + " von " + range.count, M, doc.page.height - M + 24, { width: W, align: "center", lineBreak: false });
    }
    doc.end();
  });
}

// =========================================================================
// Router
// =========================================================================
const router = express.Router();
const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, max: 80, standardHeaders: true, legacyHeaders: false,
  message: { success: false, error: "RATE_LIMIT", message: "Zu viele Anfragen — bitte kurz warten." },
});

// POST /chat — bewerten, ob genug Infos da sind / Rückfragen stellen
router.post("/chat", aiLimiter, async (req, res) => {
  try {
    const { messages } = req.body || {};
    if (!Array.isArray(messages) || messages.length === 0) return res.status(400).json({ success: false, error: "NO_MESSAGES" });
    const a = await assess(messages);
    return res.json({ success: true, ...a });
  } catch (e) {
    const status = e.code === "NO_AI_KEY" ? 503 : 502;
    return res.status(status).json({ success: false, error: e.code || "AI_ERROR", message: "Bitte kurz erneut versuchen." });
  }
});

// POST /generate — Vertrag erzeugen + speichern (zählt aufs Limit)
router.post("/generate", aiLimiter, async (req, res) => {
  try {
    const { messages, contractType } = req.body || {};
    if (!Array.isArray(messages) || messages.length === 0) return res.status(400).json({ success: false, error: "NO_MESSAGES" });

    // Usage-Limit-Prüfung (1:1 wie generate.js)
    try {
      await ensureDb();
      const user = await usersCollection.findOne({ _id: new ObjectId(req.user.userId) });
      if (!user) return res.status(401).json({ success: false, message: "Benutzer nicht gefunden." });
      const plan = (user.subscriptionPlan || user.subscription?.plan || user.plan || 'free').toLowerCase();
      const { checkContractLimit } = require('../services/contractUsage');
      const { allowed, count, limit } = await checkContractLimit(req.user.userId, plan);
      if (!allowed) return res.status(403).json({ success: false, message: `Monatliches Generierungslimit erreicht (${limit}).`, limitReached: true, currentUsage: count, limit });
    } catch (limitErr) {
      console.error("[Premium] Limit-Check Fehler (fail-open):", limitErr.message);
    }

    const text = await generateContractText(messages);
    if (!text || text.length < 200) return res.status(502).json({ success: false, error: "EMPTY", message: "Vertrag konnte nicht erstellt werden." });

    const typeLabel = (contractType || "Vertrag").toString().slice(0, 80);
    const title = `${typeLabel} – ${new Date().toLocaleDateString("de-DE")}`;

    await ensureDb();
    const contract = {
      userId: new ObjectId(req.user.userId),
      name: title,
      content: text,
      contractHTML: textToBasicHtml(text, title),
      status: "Aktiv",
      uploadedAt: new Date(),
      createdAt: new Date(),
      isGenerated: true,
      contractType: typeLabel,
      metadata: { version: "premium_opus_v1", generatedBy: "Claude Opus 4.8", premium: true },
    };
    const ins = await contractsCollection.insertOne(contract);
    return res.json({ success: true, contractId: ins.insertedId, contractType: typeLabel, title, contractText: text });
  } catch (e) {
    const status = e.code === "NO_AI_KEY" ? 503 : 502;
    return res.status(status).json({ success: false, error: e.code || "AI_ERROR", message: "Erstellung gerade nicht möglich — bitte erneut versuchen." });
  }
});

// POST /pdf — Premium-PDF (AVV-Stil) aus gespeichertem Vertrag
router.post("/pdf", async (req, res) => {
  try {
    const { contractId, design } = req.body || {};
    if (!contractId) return res.status(400).json({ success: false, error: "NO_ID" });
    await ensureDb();
    const c = await contractsCollection.findOne({
      _id: new ObjectId(contractId),
      $or: [{ userId: req.user.userId }, { userId: new ObjectId(req.user.userId) }],
    });
    if (!c) return res.status(404).json({ success: false, error: "NOT_FOUND" });
    const pdf = await renderPremiumPdfBuffer(c.content || "", design);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${(c.name || "Vertrag").replace(/[^a-zA-Z0-9 _.-]/g, "_")}.pdf"`);
    return res.end(pdf, "binary");
  } catch (e) {
    return res.status(500).json({ success: false, error: "PDF_ERROR" });
  }
});

module.exports = { router, assess, generateContractText, renderPremiumPdfBuffer, textToBasicHtml };
