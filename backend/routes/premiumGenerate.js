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
    "Du bist ein erfahrener deutscher Vertragsanwalt und führst ein kurzes, effizientes Aufnahmegespräch.\n" +
    "Prüfe, welche WICHTIGEN Angaben für einen belastbaren Vertrag noch fehlen. Dazu zählen:\n" +
    "(1) die zentralen Eckpunkte: Parteien, Vertragsgegenstand/Hauptleistung, Hauptkondition (Preis/Vergütung/Miete), ausdrücklich genannte kritische Sonderpunkte;\n" +
    "(2) wichtige Identifikations-/Faktenangaben, die sonst erfunden werden müssten oder leer blieben — z. B. vollständige Anschriften der Parteien, genaue Bezeichnung/Identifikation des Vertragsgegenstands (Marke/Modell/Zustand etc.), relevante Datums- oder Betragsangaben.\n\n" +
    "- Fehlt etwas Wichtiges → ready=false und stelle die wichtigsten 3–6 Rückfragen, kurz, laienverständlich und sinnvoll gebündelt. Frage NUR nach Angaben, die den Vertrag wirklich besser/sicherer machen — keine Nebensächlichkeiten.\n" +
    "- Liegt alles Wichtige bereits vor → ready=true, questions=[].\n" +
    "- ERFINDE selbst nichts. Der Nutzer kann Rückfragen jederzeit überspringen (dann werden Ausfüllfelder genutzt) — frage also freundlich, aber dränge nicht und frage nicht endlos nach.\n" +
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
async function generateContractText(messages, onDelta) {
  const system =
    "Du bist ein erfahrener deutscher Vertragsanwalt und erstellst professionelle, rechtssichere Verträge.\n\n" +
    "REGELN:\n" +
    "- Vollständiger Vertrag mit klarer §-Struktur (i. d. R. 8–14 Paragraphen). Reiner Text, kein Markdown/HTML.\n" +
    "- ERFINDE NIEMALS konkrete Fakten, die nicht ausdrücklich genannt wurden: keine Anschriften, Geburtsdaten, Datumsangaben, Preise, Maße, Mengen, Hersteller-/Modell-/Seriennummern, Bankdaten oder zusätzliche Namen. Solche Angaben dürfen NICHT ausgedacht werden.\n" +
    "- Fehlt eine konkrete Fakten-Angabe, setze an dieser Stelle ein klar erkennbares Ausfüllfeld mit kurzer Beschriftung ein (z. B. 'Anschrift: ____________________') — niemals einen erfundenen Wert. Lieber ein Leerfeld als eine erfundene Angabe.\n" +
    "- NUR für reine juristische Standardklauseln (z. B. Haftung, Gewährleistung, Zahlungsmodalitäten, Salvatorische Klausel) darfst du marktübliche, faire Formulierungen verwenden — das ist kein Erfinden von Fakten.\n" +
    "- Präzise, aber verständliche juristische Sprache. Deutsches Recht.\n" +
    "- Beginne mit dem Vertragstitel (Großbuchstaben), dann Parteien ('zwischen … und …'), dann die Paragraphen.\n" +
    "- Füge am Ende KEINE Unterschriften- oder Ort/Datum-Zeilen ein — den Unterschriftsbereich ergänzt die Plattform automatisch.\n" +
    "- KEINE dekorativen Linien, Rahmen, ASCII-Kunst oder Trennzeichen-Ketten (z. B. ─────, =====, *****, ####). Nur sauberer Fließtext.\n" +
    "- Das visuelle DESIGN (Schrift/Layout/Farben) wählt der Nutzer separate über Buttons unter dem Vertrag — ändere bei Design-Wünschen NICHT den Text, sondern weise freundlich auf die Design-Auswahl hin und lass den Vertragstext unverändert.";
  const stream = client().messages.stream({
    model: MODEL, max_tokens: 16000,
    thinking: { type: "adaptive" }, output_config: { effort: "high" },
    system, messages: messages.concat([{ role: "user", content: "Erstelle jetzt den vollständigen Vertrag." }]),
  });
  if (typeof onDelta === "function") stream.on("text", (t) => onDelta(t));
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
    .replace(/[^\t\n\r\x20-\x7E\u00A1-\u00FF\u2013\u2014\u2018\u2019\u201A\u201C\u201D\u201E\u2020\u2021\u2022\u2026\u2030\u2039\u203A\u20AC]/g, "");
}

// Echte Design-Varianten (pdfkit-Standardschriften → laufen auch auf Render/Linux)
const DESIGNS = {
  klassisch: { body: "Helvetica", bold: "Helvetica-Bold", accent: "#1f4e8c", title: "#1a2230", rule: "#1f4e8c" },
  elegant: { body: "Times-Roman", bold: "Times-Bold", accent: "#1a2230", title: "#1a2230", rule: "#9aa3af" },
  modern: { body: "Helvetica", bold: "Helvetica-Bold", accent: "#0ea5e9", title: "#0b1324", rule: "#0ea5e9" },
};

function renderPremiumPdfBuffer(text, design = "klassisch", signatureDataUrl = null) {
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

    // Unterschriftsbereich (KI lässt ihn im Text weg → hier sauber, mit gezeichneter Unterschrift)
    {
      const roles = [...clean.matchAll(/nachfolgend\s+[\u201E\u201C\u201D"]?\s*([A-Za-z\u00C0-\u017F .\/-]{2,40}?)\s*[\u201C\u201D\u201E"]?\s*genannt/g)].map((x) => x[1].trim());
      const left = roles[0] || "Partei 1";
      const right = roles[1] || "Partei 2";
      if (doc.y > doc.page.height - M - 140) doc.addPage();
      const y0 = doc.y + 34;
      const colW = (W - 40) / 2;
      const xL = M, xR = M + colW + 40;
      doc.font(d.body).fontSize(8.5).fillColor("#5b6573");
      doc.text("Ort, Datum: ______________________", xL, y0, { width: colW, lineBreak: false });
      doc.text("Ort, Datum: ______________________", xR, y0, { width: colW, lineBreak: false });
      const sigLineY = y0 + 58;
      if (signatureDataUrl && /^data:image\//.test(signatureDataUrl)) {
        try { doc.image(Buffer.from(signatureDataUrl.split(",")[1], "base64"), xL + 4, sigLineY - 42, { fit: [colW - 8, 40] }); } catch (_) { /* ignore */ }
      }
      doc.lineWidth(0.8).strokeColor("#1a2230");
      doc.moveTo(xL, sigLineY).lineTo(xL + colW, sigLineY).stroke();
      doc.moveTo(xR, sigLineY).lineTo(xR + colW, sigLineY).stroke();
      doc.font(d.body).fontSize(9).fillColor("#1a2230");
      doc.text(left, xL, sigLineY + 5, { width: colW, lineBreak: false });
      doc.text(right, xR, sigLineY + 5, { width: colW, lineBreak: false });
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
// 4) Rechts-Check: zweite Opus-Runde als kritischer Gegenanwalt
// =========================================================================
const REVIEW_SCHEMA = {
  type: "object", additionalProperties: false,
  properties: {
    verdict: { type: "string", enum: ["gut", "mit_empfehlungen", "luecken"] },
    summary: { type: "string" },
    checks: {
      type: "array",
      items: {
        type: "object", additionalProperties: false,
        properties: {
          klausel: { type: "string" },
          status: { type: "string", enum: ["vorhanden", "schwach", "fehlt"] },
          hinweis: { type: "string" },
        },
        required: ["klausel", "status", "hinweis"],
      },
    },
    empfehlungen: { type: "array", items: { type: "string" } },
  },
  required: ["verdict", "summary", "checks", "empfehlungen"],
};

async function reviewContract(text) {
  const system =
    "Du bist ein erfahrener deutscher Vertragsanwalt und prüfst einen FERTIGEN Vertrag als kritischer Gegenanwalt auf Rechtssicherheit und Vollständigkeit.\n" +
    "Prüfe, ob die je nach Vertragstyp üblichen Schutz- und Standardklauseln vorhanden, schwach oder fehlend sind — u. a.: Vertragsgegenstand, Vergütung/Zahlung, Laufzeit & Kündigung, Haftung/Haftungsbegrenzung, Gewährleistung, Geheimhaltung, Datenschutz (falls relevant), anwendbares Recht & Gerichtsstand, Schriftform, Salvatorische Klausel.\n" +
    "Sei konkret, streng, aber fair und praxisnah. Beziehe dich auf den tatsächlichen Vertragstext.\n" +
    "- verdict: 'gut' = alles Wesentliche da; 'mit_empfehlungen' = kleinere Verbesserungen sinnvoll; 'luecken' = echte, wichtige Lücken.\n" +
    "- checks: die 8–14 wichtigsten Punkte mit Status (vorhanden/schwach/fehlt) und kurzem, konkretem Hinweis.\n" +
    "- empfehlungen: 1–5 konkrete, sofort umsetzbare Verbesserungsvorschläge (jeweils 1 Satz).\n" +
    "- summary: 1 Satz Gesamteinschätzung.";
  const res = await client().messages.create({
    model: MODEL, max_tokens: 4000,
    thinking: { type: "adaptive" },
    output_config: { effort: "high", format: { type: "json_schema", schema: REVIEW_SCHEMA } },
    system, messages: [{ role: "user", content: "Prüfe diesen Vertrag:\n\n" + text }],
  });
  return JSON.parse(res.content.find((b) => b.type === "text").text);
}

// Speichert einen erzeugten Vertrag in `contracts` (gemeinsam für /generate-stream)
async function persistContract(userId, text, contractType) {
  const typeLabel = (contractType || "Vertrag").toString().slice(0, 80);
  const title = `${typeLabel} – ${new Date().toLocaleDateString("de-DE")}`;
  await ensureDb();
  const contract = {
    userId: new ObjectId(userId),
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
  return { contractId: ins.insertedId, contractType: typeLabel, title };
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

// POST /generate-stream — wie /generate, streamt aber den Vertrag live (ndjson-Zeilen)
router.post("/generate-stream", aiLimiter, async (req, res) => {
  const { messages, contractType } = req.body || {};
  if (!Array.isArray(messages) || messages.length === 0) return res.status(400).json({ success: false, error: "NO_MESSAGES" });

  // Usage-Limit-Prüfung VOR dem Streamen (noch als normaler JSON-Fehler möglich)
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

  // ab hier: ndjson-Stream (eine JSON-Zeile pro Ereignis)
  res.setHeader("Content-Type", "application/x-ndjson; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("X-Accel-Buffering", "no");
  const send = (obj) => { try { res.write(JSON.stringify(obj) + "\n"); } catch (_) {} };
  try {
    const text = await generateContractText(messages, (t) => send({ type: "delta", text: t }));
    if (!text || text.length < 200) { send({ type: "error", message: "Vertrag konnte nicht erstellt werden." }); return res.end(); }
    const saved = await persistContract(req.user.userId, text, contractType);
    send({ type: "done", contractText: text, ...saved });
    res.end();
  } catch (e) {
    send({ type: "error", message: e.code === "NO_AI_KEY" ? "KI-Dienst nicht verfügbar." : "Erstellung gerade nicht möglich — bitte erneut versuchen." });
    res.end();
  }
});

// POST /pdf — Premium-PDF (AVV-Stil) aus gespeichertem Vertrag
router.post("/pdf", async (req, res) => {
  try {
    const { contractId, design, signature } = req.body || {};
    if (!contractId) return res.status(400).json({ success: false, error: "NO_ID" });
    await ensureDb();
    const c = await contractsCollection.findOne({
      _id: new ObjectId(contractId),
      $or: [{ userId: req.user.userId }, { userId: new ObjectId(req.user.userId) }],
    });
    if (!c) return res.status(404).json({ success: false, error: "NOT_FOUND" });
    const sig = typeof signature === "string" && signature.startsWith("data:image/") && signature.length < 600000 ? signature : null;
    const pdf = await renderPremiumPdfBuffer(c.content || "", design, sig);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${(c.name || "Vertrag").replace(/[^a-zA-Z0-9 _.-]/g, "_")}.pdf"`);
    return res.end(pdf, "binary");
  } catch (e) {
    return res.status(500).json({ success: false, error: "PDF_ERROR" });
  }
});

// POST /review — Rechts-Check eines gespeicherten Vertrags (KI-Gegenanwalt)
router.post("/review", aiLimiter, async (req, res) => {
  try {
    const { contractId } = req.body || {};
    if (!contractId) return res.status(400).json({ success: false, error: "NO_ID" });
    await ensureDb();
    const c = await contractsCollection.findOne({
      _id: new ObjectId(contractId),
      $or: [{ userId: req.user.userId }, { userId: new ObjectId(req.user.userId) }],
    });
    if (!c) return res.status(404).json({ success: false, error: "NOT_FOUND" });
    const review = await reviewContract(c.content || "");
    return res.json({ success: true, ...review });
  } catch (e) {
    const status = e.code === "NO_AI_KEY" ? 503 : 502;
    return res.status(status).json({ success: false, error: e.code || "AI_ERROR", message: "Rechts-Check gerade nicht möglich — bitte erneut versuchen." });
  }
});

module.exports = { router, assess, generateContractText, reviewContract, renderPremiumPdfBuffer, textToBasicHtml };
