/**
 * premiumGenerate.js — Generate 2.0 "Premium-Modus" (Backend)
 * ------------------------------------------------------------------
 * Eigenständige, ADDITIVE Premium-Strecke. Fasst die bestehende generate.js
 * NICHT an. Claude Opus führt ein kurzes, intelligentes Aufnahmegespräch und
 * schreibt dann einen vollständigen Top-Vertrag; Ausgabe als Premium-PDF (AVV-Stil).
 * Gespeichert wird in `contracts` (Verwaltung + geteilter Usage-Zähler).
 *
 * Endpoints (Mount: /api/contracts/premium, mit verifyToken davor; KI-Routen rate-limitiert):
 *   POST /chat            { messages }                              -> { contractType, ready, summary, questions }
 *   POST /generate        { messages, contractType }                -> { contractId, title, contractText }   (Fallback, nicht-stream)
 *   POST /generate-stream { messages, contractType, existingContractId? } -> ndjson (delta/done/events/error)
 *                         + Fristen->Kalender (grounded extractContractDates -> cleanAndRegenerateAIEvents)
 *   POST /pdf             { contractId, design?, signature? }       -> application/pdf (AVV-Layout, 3 Designs)
 *   POST /review          { contractId }                            -> Rechts-Check (verdict/checks/empfehlungen)
 *
 * Gemountet in server.js (8.2). Frontend: PremiumChat.tsx, versteckt hinter SHOW_PREMIUM_ENTRY/?premium=1.
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
// 1b) Verfeinern-Intent: will der Nutzer wirklich den VERTRAG ändern, oder ist es
//     eine Frage/Smalltalk/Off-Topic? (verhindert versehentliches Neu-Generieren)
// =========================================================================
const REFINE_INTENT_SCHEMA = {
  type: "object", additionalProperties: false,
  properties: { isChange: { type: "boolean" }, reply: { type: "string" } },
  required: ["isChange", "reply"],
};
async function classifyRefineIntent(messages) {
  const lastUser = [...messages].reverse().find((m) => m && m.role === "user");
  const userText = (lastUser && typeof lastUser.content === "string") ? lastUser.content : "";
  const system =
    "Es wurde bereits ein vollständiger Vertrag erstellt. Beurteile die LETZTE Nachricht des Nutzers:\n" +
    "- isChange=true NUR, wenn sie eine konkrete Änderung/Ergänzung/Korrektur AM VERTRAG verlangt (z. B. „Laufzeit auf 6 Monate“, „Wettbewerbsverbot ergänzen“, „Namen ändern“, „Klausel zu Haftung strenger“).\n" +
    "- isChange=false bei allem anderen: Fragen ohne Vertragsbezug (z. B. Wetter), Smalltalk, Dank, Begrüßung, allgemeine Fragen, unverständliche/sinnlose Eingaben.\n" +
    "- reply: NUR wenn isChange=false — eine kurze, freundliche deutsche Antwort (1–2 Sätze) in der DU-Form (duzen, niemals siezen), die den Nutzer sanft zurück zum Vertrag führt (z. B. kurz auf die Frage eingehen, dann auf Änderungswünsche/Download hinweisen). Wenn isChange=true → reply=\"\".\n" +
    "Antworte ausschließlich über das Schema.";
  const res = await client().messages.create({
    model: MODEL, max_tokens: 400,
    output_config: { effort: "low", format: { type: "json_schema", schema: REFINE_INTENT_SCHEMA } },
    system, messages: [{ role: "user", content: "Letzte Nachricht des Nutzers:\n" + userText }],
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
  klassisch: { style: "line", body: "Helvetica", bold: "Helvetica-Bold", accent: "#1f4e8c", title: "#1a2230", rule: "#1f4e8c" },
  elegant: { style: "line", body: "Times-Roman", bold: "Times-Bold", accent: "#1a2230", title: "#1a2230", rule: "#9aa3af" },
  modern: { style: "line", body: "Helvetica", bold: "Helvetica-Bold", accent: "#0ea5e9", title: "#0b1324", rule: "#0ea5e9" },
  // Executive-Linie (User-Favoriten): dunkles Kopf-/Fußband + Akzentlinie
  gold: { style: "executive", body: "Helvetica", bold: "Helvetica-Bold", accent: "#c9a961", title: "#0f2747", bandDark: "#0f2747", eyebrow: "#b9c6db" },
  royal: { style: "executive", body: "Helvetica", bold: "Helvetica-Bold", accent: "#60a5fa", title: "#1e3a8a", bandDark: "#1e3a8a", eyebrow: "#b6c8f0" },
};

const HEX = /^#[0-9a-fA-F]{3,8}$/;
// Löst `design` auf: entweder Preset-String ODER frei konfigurierbares Objekt {style, accent, bandDark?, serif?}
function resolveDesign(design) {
  if (design && typeof design === "object" && design.style) {
    const accent = HEX.test(design.accent || "") ? design.accent : "#1f4e8c";
    if (design.style === "executive") {
      const bandDark = HEX.test(design.bandDark || "") ? design.bandDark : "#0f2747";
      return { style: "executive", body: "Helvetica", bold: "Helvetica-Bold", accent, title: bandDark, bandDark, eyebrow: "#cdd9ec" };
    }
    const s = (design.style === "kanzlei" || design.style === "modern" || design.style === "minimal") ? design.style : "line";
    const serif = s === "kanzlei";
    return { style: s, body: serif ? "Times-Roman" : "Helvetica", bold: serif ? "Times-Bold" : "Helvetica-Bold", accent, title: "#1a2230", rule: accent };
  }
  return DESIGNS[design] || DESIGNS.klassisch;
}

function renderPremiumPdfBuffer(text, design = "klassisch", signatureDataUrl = null, logoDataUrl = null) {
  const d = resolveDesign(design);
  const clean = sanitizeForPdf(text);
  let logoBuf = null;
  if (logoDataUrl && /^data:image\/(png|jpe?g);base64,/.test(logoDataUrl)) {
    try { logoBuf = Buffer.from(logoDataUrl.split(",")[1], "base64"); } catch (_) { logoBuf = null; }
  }
  return new Promise((resolve, reject) => {
    const M = 64;
    const doc = new PDFDocument({ size: "A4", margins: { top: M, bottom: M + 10, left: M, right: M }, bufferPages: true });
    const W = doc.page.width - M * 2;
    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const lines = clean.split("\n");
    let startIdx = 0;
    const isExec = d.style === "executive";
    const styledHead = d.style === "kanzlei" || d.style === "modern" || d.style === "minimal";
    if (isExec) {
      // Titel (erste nicht-leere Zeile) fürs Kopfband abgreifen → im Loop überspringen
      let title = "";
      for (let i = 0; i < lines.length; i++) {
        const t = lines[i].trim();
        if (!t) continue;
        title = t; startIdx = i + 1; break;
      }
      doc.rect(0, 0, doc.page.width, 110).fill(d.bandDark);
      doc.rect(0, 110, doc.page.width, 3).fill(d.accent);
      const titleW = logoBuf ? W - 60 : W;
      if (logoBuf) { try { doc.image(logoBuf, doc.page.width - M - 46, 32, { fit: [46, 46] }); } catch (_) { /* ignore */ } }
      doc.font("Helvetica").fontSize(8).fillColor(d.eyebrow || "#b9c6db").text("VERTRAGSDOKUMENT", M, 36, { width: titleW, characterSpacing: 3 });
      doc.font("Helvetica-Bold").fontSize(16).fillColor("#ffffff").text(title, M, 54, { width: titleW });
      doc.y = 132;
    } else if (styledHead) {
      // Titel abgreifen → pro Stil im Header rendern, im Loop überspringen
      let title = "";
      for (let i = 0; i < lines.length; i++) { const t = lines[i].trim(); if (!t) continue; title = t; startIdx = i + 1; break; }
      let topY = M;
      if (d.style === "kanzlei") {
        if (logoBuf) { try { doc.image(logoBuf, M + W / 2 - 24, M, { fit: [48, 48] }); } catch (_) { /* ignore */ } topY = M + 56; }
        doc.font(d.bold).fontSize(16).fillColor(d.title).text(title, M, topY, { width: W, align: "center" });
        const ry = doc.y + 6;
        doc.moveTo(M + W / 2 - 46, ry).lineTo(M + W / 2 + 46, ry).lineWidth(1).strokeColor(d.accent).stroke();
        doc.y = ry + 14;
      } else if (d.style === "modern") {
        if (logoBuf) { try { doc.image(logoBuf, M, M, { fit: [48, 48] }); } catch (_) { /* ignore */ } topY = M + 56; }
        doc.font("Helvetica").fontSize(8).fillColor("#94a3b8").text("VERTRAG", M, topY, { width: W, characterSpacing: 2 });
        doc.font(d.bold).fontSize(18).fillColor(d.title).text(title, M, doc.y + 4, { width: W });
        doc.rect(M, doc.y + 8, 52, 4).fill(d.accent);
        doc.y = doc.y + 24;
      } else { // minimal
        if (logoBuf) { try { doc.image(logoBuf, M, M, { fit: [48, 48] }); } catch (_) { /* ignore */ } topY = M + 56; }
        doc.font("Helvetica-Bold").fontSize(13).fillColor(d.title).text(title.toUpperCase(), M, topY, { width: W, characterSpacing: 0.5 });
        const ry = doc.y + 8;
        doc.moveTo(M, ry).lineTo(M + W, ry).lineWidth(0.5).strokeColor(d.accent).stroke();
        doc.y = ry + 12;
      }
    } else {
      // Presets/Standard: optionales Logo oben links + dezente Akzentlinie – KEIN Branding
      let topY = M;
      if (logoBuf) { try { doc.image(logoBuf, M, M, { fit: [48, 48] }); } catch (_) { /* ignore */ } topY = M + 58; }
      doc.moveTo(M, topY).lineTo(M + W, topY).lineWidth(1.4).strokeColor(d.rule || d.accent).stroke();
      doc.y = topY + 14;
    }
    for (let i = startIdx; i < lines.length; i++) {
      const line = lines[i].replace(/\s+$/g, "");
      if (!line.trim()) { doc.y += 5; continue; }
      if (doc.y > doc.page.height - M - 40) doc.addPage();
      const isPar = /^§\s*\d/.test(line.trim());
      const isHead = /^[A-ZÄÖÜ0-9 .,„""\-()]+$/.test(line.trim()) && line.trim().length < 70 && line.trim().length > 2;
      if (isPar) { doc.font(d.bold).fontSize(11).fillColor(d.accent).text(line.trim(), M, doc.y + 6, { width: W }); doc.y += 2; }
      else if (isHead && !line.startsWith("(")) { doc.font(d.bold).fontSize((isExec || styledHead) ? 11 : (doc.y < 110 ? 16 : 11)).fillColor(d.title).text(line.trim(), M, doc.y + 4, { width: W }); doc.y += 2; }
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

    // Fußzeile: Executive = Fußband, sonst neutrale Seitenzahl (kein „Contract AI")
    const range = doc.bufferedPageRange();
    for (let i = 0; i < range.count; i++) {
      doc.switchToPage(range.start + i); doc.page.margins.bottom = 0;
      if (isExec) {
        doc.rect(0, doc.page.height - 26, doc.page.width, 26).fill(d.bandDark);
        doc.font(d.body).fontSize(8).fillColor(d.eyebrow || "#b9c6db")
          .text("Seite " + (i + 1) + " / " + range.count, M, doc.page.height - 18, { width: W, align: "center", lineBreak: false });
      } else {
        doc.font(d.body).fontSize(7.5).fillColor("#9aa3af")
          .text("Seite " + (i + 1) + " von " + range.count, M, doc.page.height - M + 24, { width: W, align: "center", lineBreak: false });
      }
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

// Klausel-Erklärung: jeden Abschnitt in einfachen Worten + (vorsichtige) Rechtsgrundlage
const EXPLAIN_SCHEMA = {
  type: "object", additionalProperties: false,
  properties: {
    summary: { type: "string" },
    items: {
      type: "array",
      items: {
        type: "object", additionalProperties: false,
        properties: {
          titel: { type: "string" },
          erklaerung: { type: "string" },
          rechtsgrundlage: { type: "string" },
        },
        required: ["titel", "erklaerung", "rechtsgrundlage"],
      },
    },
  },
  required: ["summary", "items"],
};

async function explainContract(text) {
  const system =
    "Du bist ein Anwalt, der einem Laien seinen eigenen Vertrag verständlich erklärt — Abschnitt für Abschnitt.\n" +
    "Für jeden wesentlichen Paragraphen/Abschnitt:\n" +
    "- titel: kurze Bezeichnung (z. B. '§ 3 Zahlung').\n" +
    "- erklaerung: was das KONKRET für den Nutzer bedeutet — einfache, klare Worte, 1–2 Sätze, KEIN Juristen-Deutsch.\n" +
    "- rechtsgrundlage: die einschlägige gesetzliche Grundlage NUR wenn du sie sicher kennst (z. B. '§ 433 BGB', 'Art. 28 DSGVO'). Im Zweifel '–'. ERFINDE KEINE Paragraphen-Nummern.\n" +
    "summary = 1 Satz, worum es im Vertrag insgesamt geht. Beziehe dich ausschließlich auf den tatsächlichen Vertragstext.";
  const res = await client().messages.create({
    model: MODEL, max_tokens: 5000,
    thinking: { type: "adaptive" },
    output_config: { effort: "high", format: { type: "json_schema", schema: EXPLAIN_SCHEMA } },
    system, messages: [{ role: "user", content: "Erkläre diesen Vertrag:\n\n" + text }],
  });
  return JSON.parse(res.content.find((b) => b.type === "text").text);
}

// =========================================================================
// 5) Fristen-Extraktion (grounded) für den Kalender — nur was WIRKLICH im Text steht
// =========================================================================
const DATE_TYPES = [
  "start_date", "end_date", "cancellation_deadline", "minimum_term_end", "probation_end",
  "warranty_end", "renewal_date", "payment_due", "notice_period_start", "contract_signed",
  "service_start", "insurance_coverage_end", "trial_end", "license_expiry", "price_guarantee_end",
  "inspection_due", "lease_end", "option_deadline", "loan_end", "interest_rate_change", "delivery_date", "other",
];
const DATES_SCHEMA = {
  type: "object", additionalProperties: false,
  properties: {
    startDate: { type: ["string", "null"] },
    endDate: { type: ["string", "null"] },
    term: { type: ["string", "null"] },
    noticePeriod: { type: ["string", "null"] },
    isAutoRenewal: { type: "boolean" },
    autoRenewMonths: { type: ["number", "null"] },
    importantDates: {
      type: "array",
      items: {
        type: "object", additionalProperties: false,
        properties: { type: { type: "string", enum: DATE_TYPES }, date: { type: "string" }, label: { type: "string" } },
        required: ["type", "date", "label"],
      },
    },
  },
  required: ["startDate", "endDate", "term", "noticePeriod", "isAutoRenewal", "autoRenewMonths", "importantDates"],
};

async function extractContractDates(text) {
  const system =
    "Du extrahierst aus einem fertigen deutschen Vertragstext NUR die TATSÄCHLICH darin genannten Termine und Fristen — für einen Erinnerungskalender.\n" +
    "STRENG: Erfinde NICHTS. Übernimm nur konkrete Daten, die eindeutig im Text stehen. Leere Ausfüllfelder ('____'), Platzhalter oder nicht genannte Daten → weglassen bzw. null.\n" +
    "- startDate: Vertragsbeginn (YYYY-MM-DD) oder null.\n" +
    "- endDate: Vertragsende/Ablauf (YYYY-MM-DD) oder null.\n" +
    "- term: Laufzeit als kurzer Text (z. B. '2 Jahre', 'befristet bis 30.09.2028', 'unbefristet') oder null.\n" +
    "- noticePeriod: Kündigungsfrist als kurzer Text (z. B. '3 Monate') oder null.\n" +
    "- isAutoRenewal: true, wenn sich der Vertrag laut Text automatisch verlängert.\n" +
    "- autoRenewMonths: Verlängerungsdauer in Monaten oder null.\n" +
    "- importantDates: weitere konkrete Termine mit Datum (YYYY-MM-DD). 'type' aus der vorgegebenen Liste (sonst 'other'); 'label' = kurze deutsche Bezeichnung.\n" +
    "Gibt es keine konkreten Termine, gib null/false/leere Liste zurück.";
  const res = await client().messages.create({
    model: MODEL, max_tokens: 1500,
    thinking: { type: "adaptive" },
    output_config: { effort: "low", format: { type: "json_schema", schema: DATES_SCHEMA } },
    system, messages: [{ role: "user", content: text }],
  });
  return JSON.parse(res.content.find((b) => b.type === "text").text);
}

// Lifecycle-Typen, die bereits aus startDate/expiryDate/kuendigung erzeugt werden →
// NICHT zusätzlich in importantDates (sonst doppelte Kalender-Events + Doppel-Anzeige im Modal).
const LIFECYCLE_EXCLUDE = ["start_date", "end_date", "lease_end", "cancellation_deadline", "renewal_date"];

// Wandelt Extraktions-Ergebnis in EXAKT die Felder, die analysierte Verträge haben
// (Modal liest laufzeit/kuendigung/expiryDate/importantDates; Kalender liest start-/expiryDate + kuendigung).
function datesToContractFields(d) {
  const toDate = (s) => { const t = Date.parse(s); return Number.isNaN(t) ? null : new Date(t); };
  const importantDates = (Array.isArray(d.importantDates) ? d.importantDates : [])
    .filter((x) => x && x.date && toDate(x.date) && !LIFECYCLE_EXCLUDE.includes(x.type))
    .map((x) => ({ type: DATE_TYPES.includes(x.type) ? x.type : "other", date: x.date, label: x.label || x.type, confidence: 90, source: "KI-Analyse" }));
  return {
    startDate: toDate(d.startDate),
    expiryDate: toDate(d.endDate),
    startDateConfidence: toDate(d.startDate) ? 90 : 0,
    endDateConfidence: toDate(d.endDate) ? 90 : 0,
    laufzeit: d.term || null,            // Modal-Anzeige „Laufzeit"
    kuendigung: d.noticePeriod || null,  // Modal-Anzeige „Kündigungsfrist" + Kalender-Notice-Period
    isAutoRenewal: !!d.isAutoRenewal,
    autoRenewMonths: typeof d.autoRenewMonths === "number" ? d.autoRenewMonths : null,
    importantDates,
    dataSource: "ai_extracted",
  };
}

// Speichert/aktualisiert einen erzeugten Vertrag in `contracts`.
// existingContractId gesetzt → Verfeinern: denselben Vertrag UPDATEN (keine Dubletten).
async function persistContract(userId, text, contractType, existingContractId) {
  const typeLabel = (contractType || "Vertrag").toString().slice(0, 80);
  const title = `${typeLabel} – ${new Date().toLocaleDateString("de-DE")}`;
  await ensureDb();
  if (existingContractId && ObjectId.isValid(existingContractId)) {
    const _id = new ObjectId(existingContractId);
    const r = await contractsCollection.updateOne(
      { _id, $or: [{ userId }, { userId: new ObjectId(userId) }] },
      { $set: { name: title, content: text, contractHTML: textToBasicHtml(text, title), contractType: typeLabel, updatedAt: new Date() } }
    );
    if (r.matchedCount > 0) return { contractId: _id, contractType: typeLabel, title, updated: true };
  }
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
  return { contractId: ins.insertedId, contractType: typeLabel, title, updated: false };
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

    // Usage-Limit-Prüfung. Free: 1 ECHTE Gratis-Generierung (atomar geclaimt, Refund bei Fehler).
    let isFree = false, freeClaimed = false;
    try {
      await ensureDb();
      const user = await usersCollection.findOne({ _id: new ObjectId(req.user.userId) });
      if (!user) return res.status(401).json({ success: false, message: "Benutzer nicht gefunden." });
      const plan = (user.subscriptionPlan || user.subscription?.plan || user.plan || 'free').toLowerCase();
      if (plan === 'free') {
        isFree = true;
        const claim = await usersCollection.updateOne(
          { _id: new ObjectId(req.user.userId), $or: [{ freeGenerateCount: { $exists: false } }, { freeGenerateCount: { $lt: 1 } }] },
          { $inc: { freeGenerateCount: 1 }, $set: { freeGenerateAt: new Date() } }
        );
        if (claim.modifiedCount === 0) {
          return res.status(403).json({ success: false, message: "Deine kostenlose Probe-Generierung ist aufgebraucht. Schalte frei, um weitere Verträge zu erstellen.", upgradeRequired: true, freeUsed: true });
        }
        freeClaimed = true;
      } else {
        const { checkContractLimit } = require('../services/contractUsage');
        const { allowed, count, limit } = await checkContractLimit(req.user.userId, plan);
        if (!allowed) return res.status(403).json({ success: false, message: `Monatliches Generierungslimit erreicht (${limit}).`, limitReached: true, currentUsage: count, limit });
      }
    } catch (limitErr) {
      console.error("[Premium] Limit-Check Fehler (fail-open):", limitErr.message);
    }

    const refundFree = async () => { if (freeClaimed) { freeClaimed = false; try { await usersCollection.updateOne({ _id: new ObjectId(req.user.userId) }, { $inc: { freeGenerateCount: -1 } }); } catch (_) {} } };

    const text = await generateContractText(messages);
    if (!text || text.length < 200) { await refundFree(); return res.status(502).json({ success: false, error: "EMPTY", message: "Vertrag konnte nicht erstellt werden." }); }

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
    if (isFree) {
      // 🔒 Free: Vertrag ist gespeichert, aber Volltext + Download erst nach Freischaltung.
      // Nur eine kurze Vorschau zurückgeben — der VOLLTEXT verlässt den Server NICHT (kein Bypass).
      const previewText = text.split("\n").slice(0, 14).join("\n");
      return res.json({ success: true, contractId: ins.insertedId, contractType: typeLabel, title, gated: true, previewText });
    }
    return res.json({ success: true, contractId: ins.insertedId, contractType: typeLabel, title, contractText: text });
  } catch (e) {
    const status = e.code === "NO_AI_KEY" ? 503 : 502;
    return res.status(status).json({ success: false, error: e.code || "AI_ERROR", message: "Erstellung gerade nicht möglich — bitte erneut versuchen." });
  }
});

// POST /generate-stream — wie /generate, streamt aber den Vertrag live (ndjson-Zeilen)
router.post("/generate-stream", aiLimiter, async (req, res) => {
  const { messages, contractType, existingContractId } = req.body || {};
  if (!Array.isArray(messages) || messages.length === 0) return res.status(400).json({ success: false, error: "NO_MESSAGES" });

  // 🛑 Verfeinern-Intent-Gate: bei BESTEHENDEM Vertrag nur neu generieren, wenn der Nutzer
  // wirklich eine Vertrags-Änderung will. Sonst (Frage/Smalltalk/Off-Topic) freundlich im Chat
  // antworten — kein (oft kaputter) Neu-Vertrag, kein Limit-/Gratis-Verbrauch. fail-open.
  if (existingContractId) {
    try {
      const intent = await classifyRefineIntent(messages);
      if (intent && intent.isChange === false) {
        res.setHeader("Content-Type", "application/x-ndjson; charset=utf-8");
        res.setHeader("Cache-Control", "no-cache, no-transform");
        res.write(JSON.stringify({ type: "chat", reply: intent.reply || "Ich helfe dir hier nur rund um deinen Vertrag — sag mir z. B. „Laufzeit auf 6 Monate ändern“ oder lade ihn als PDF herunter." }) + "\n");
        return res.end();
      }
    } catch (intentErr) {
      console.warn("[Premium] Refine-Intent-Check fehlgeschlagen (fail-open):", intentErr.message);
    }
  }

  let freeClaimed = false; // 🔓 Free-Tease: wurde die 1 Gratis-Generierung „geclaimt"? (für Refund bei Fehler)
  let isFree = false;      // 🔒 Free → Volltext NICHT streamen/zurückgeben (nur Vorschau + Sperre)

  // Usage-Limit-Prüfung VOR dem Streamen (noch als normaler JSON-Fehler möglich)
  try {
    await ensureDb();
    const user = await usersCollection.findOne({ _id: new ObjectId(req.user.userId) });
    if (!user) return res.status(401).json({ success: false, message: "Benutzer nicht gefunden." });
    const plan = (user.subscriptionPlan || user.subscription?.plan || user.plan || 'free').toLowerCase();
    if (plan === 'free') {
      isFree = true;
      // Free-Tease: 1 ECHTE Gratis-Generierung pro Account. Atomar claimen (gegen Parallel-/
      // Skript-Missbrauch: nur EIN Request bekommt modifiedCount=1). Bei Fehler unten Refund.
      const claim = await usersCollection.updateOne(
        { _id: new ObjectId(req.user.userId), $or: [{ freeGenerateCount: { $exists: false } }, { freeGenerateCount: { $lt: 1 } }] },
        { $inc: { freeGenerateCount: 1 }, $set: { freeGenerateAt: new Date() } }
      );
      if (claim.modifiedCount === 0) {
        return res.status(403).json({ success: false, message: "Deine kostenlose Probe-Generierung ist aufgebraucht. Schalte frei, um weitere Verträge zu erstellen.", upgradeRequired: true, freeUsed: true });
      }
      freeClaimed = true;
    } else {
      const { checkContractLimit } = require('../services/contractUsage');
      const { allowed, count, limit } = await checkContractLimit(req.user.userId, plan);
      if (!allowed) return res.status(403).json({ success: false, message: `Monatliches Generierungslimit erreicht (${limit}).`, limitReached: true, currentUsage: count, limit });
    }
  } catch (limitErr) {
    console.error("[Premium] Limit-Check Fehler (fail-open):", limitErr.message);
  }

  // Bei Generierungs-Fehler die geclaimte Gratis-Generierung zurückbuchen (User bekam ja nichts).
  const refundFreeIfNeeded = async () => {
    if (!freeClaimed) return;
    freeClaimed = false;
    try { await usersCollection.updateOne({ _id: new ObjectId(req.user.userId) }, { $inc: { freeGenerateCount: -1 } }); } catch (_) {}
  };

  // ab hier: ndjson-Stream (eine JSON-Zeile pro Ereignis)
  res.setHeader("Content-Type", "application/x-ndjson; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("X-Accel-Buffering", "no");
  const send = (obj) => { try { res.write(JSON.stringify(obj) + "\n"); } catch (_) {} };
  try {
    // 🔒 Free: KEINE Live-Deltas (der Volltext darf den Server nicht erreichen) — nur paid streamt mit.
    const text = await generateContractText(messages, isFree ? undefined : (t) => send({ type: "delta", text: t }));
    if (!text || text.length < 200) { await refundFreeIfNeeded(); send({ type: "error", message: "Vertrag konnte nicht erstellt werden." }); return res.end(); }
    const saved = await persistContract(req.user.userId, text, contractType, existingContractId);
    if (isFree) {
      // 🔒 Free: NUR Vorschau (14 Zeilen) + contractId zurück — Volltext bleibt auf dem Server (kein Bypass).
      send({ type: "done", gated: true, previewText: text.split("\n").slice(0, 14).join("\n"), contractId: saved.contractId, title: saved.title, contractType: saved.contractType });
    } else {
      send({ type: "done", contractText: text, ...saved });
    }

    // 🔔 Fristen → Kalender (additiv, non-fatal): grounded extrahieren, Felder wie bei der
    // Analyse setzen, dann den BESTEHENDEN Mechanismus aufrufen. cleanAndRegenerateAIEvents
    // räumt beim Verfeinern alte (geänderte) KI-/Lifecycle-Events sauber auf → keine Geister.
    try {
      const dates = await extractContractDates(text);
      const fields = datesToContractFields(dates);
      await contractsCollection.updateOne({ _id: saved.contractId }, { $set: fields });
      const dbConn = await database.connect();
      const { cleanAndRegenerateAIEvents } = require("../services/calendarEvents");
      const enriched = { _id: saved.contractId, userId: new ObjectId(req.user.userId), name: saved.title, status: "Aktiv", createdAt: new Date(), ...fields };
      await cleanAndRegenerateAIEvents(dbConn, enriched);
      // 🔇 Generierte Verträge mit EIGENEN Terminen: den generischen „Jahres-Review" (type REVIEW,
      // Erstell-Tag+1J, willkürliches Datum) entfernen — er doppelt sich gefühlt mit den echten
      // Stichtagen. Verträge OHNE eigene Termine behalten ihn als sinnvollen Fallback. NUR hier
      // im Generate-Pfad (Analyse-Pipeline bleibt unberührt).
      const hasOwnDates = !!fields.expiryDate || (Array.isArray(fields.importantDates) && fields.importantDates.length > 0);
      if (hasOwnDates) {
        try { await dbConn.collection("contract_events").deleteMany({ contractId: saved.contractId, type: "REVIEW" }); } catch (_) {}
      }
      // Die WIRKLICH gespeicherten, geplanten Kalender-Einträge zurücklesen (Beweis + Anzeige)
      const items = await dbConn.collection("contract_events")
        .find({ contractId: saved.contractId, status: "scheduled" })
        .sort({ date: 1 })
        .project({ title: 1, date: 1, severity: 1, _id: 0 })
        .toArray();
      send({ type: "events", count: items.length, items: items.map((e) => ({ title: e.title, date: e.date, severity: e.severity || "info" })) });
    } catch (calErr) {
      console.warn("[Premium] Fristen-Übernahme fehlgeschlagen (non-fatal):", calErr.message);
    }
    res.end();
  } catch (e) {
    await refundFreeIfNeeded();
    send({ type: "error", message: e.code === "NO_AI_KEY" ? "KI-Dienst nicht verfügbar." : "Erstellung gerade nicht möglich — bitte erneut versuchen." });
    res.end();
  }
});

// 🔒 Ist dieser GENERIERTE Vertrag für den aufrufenden User gesperrt?
// true ⇔ Vertrag ist generiert UND User ist (effektiv) Free UND nicht einmalig freigekauft.
// Hochgeladene Verträge + Zahler + freigekaufte → false (nie gesperrt). fail-open: Fehler → false
// (Zahler nie fälschlich blockieren — konsistent mit gatePremiumExport).
async function isGeneratedLockedFor(userId, contract) {
  try {
    if (!contract || contract.isGenerated !== true) return false; // nur generierte Verträge
    const { effectivePlan, isContractUnlocked } = require("../utils/analysisGate");
    if (isContractUnlocked(contract)) return false;               // einmalig freigekauft → frei
    const u = await usersCollection.findOne({ _id: new ObjectId(userId) }, { projection: { subscriptionPlan: 1 } });
    let orgPlan;
    try {
      const OrganizationMember = require("../models/OrganizationMember");
      const m = await OrganizationMember.findOne({ userId: new ObjectId(userId), isActive: true });
      orgPlan = m ? "business" : undefined;
    } catch (_) {}
    return effectivePlan(u?.subscriptionPlan, orgPlan) === "free";
  } catch (_) {
    return false; // fail-open
  }
}

// POST /pdf — Premium-PDF (AVV-Stil) aus gespeichertem Vertrag
router.post("/pdf", async (req, res) => {
  try {
    const { contractId, design, signature, logo } = req.body || {};
    if (!contractId) return res.status(400).json({ success: false, error: "NO_ID" });
    await ensureDb();
    const c = await contractsCollection.findOne({
      _id: new ObjectId(contractId),
      $or: [{ userId: req.user.userId }, { userId: new ObjectId(req.user.userId) }],
    });
    if (!c) return res.status(404).json({ success: false, error: "NOT_FOUND" });
    // 🔒 Free + generiert + nicht freigekauft → kein PDF (Volltext-Schutz). Zahler/Uploads/freigekauft passieren.
    if (await isGeneratedLockedFor(req.user.userId, c)) {
      return res.status(403).json({ success: false, gated: true, error: "GATED", message: "Dieser Vertrag ist gesperrt. Schalte ihn frei, um das PDF herunterzuladen." });
    }
    const sig = typeof signature === "string" && signature.startsWith("data:image/") && signature.length < 600000 ? signature : null;
    const logoVal = typeof logo === "string" && /^data:image\/(png|jpe?g);base64,/.test(logo) && logo.length < 800000 ? logo : null;
    const pdf = await renderPremiumPdfBuffer(c.content || "", design, sig, logoVal);
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
    // 🔒 Free + generiert + nicht freigekauft → kein Rechts-Check (bezahltes Feature). Freigekauft/Zahler passieren.
    if (await isGeneratedLockedFor(req.user.userId, c)) {
      return res.status(403).json({ success: false, gated: true, error: "GATED", message: "Dieser Vertrag ist gesperrt. Schalte ihn frei, um den Rechts-Check zu nutzen." });
    }
    const review = await reviewContract(c.content || "");
    return res.json({ success: true, ...review });
  } catch (e) {
    const status = e.code === "NO_AI_KEY" ? 503 : 502;
    return res.status(status).json({ success: false, error: e.code || "AI_ERROR", message: "Rechts-Check gerade nicht möglich — bitte erneut versuchen." });
  }
});

// POST /explain — Klausel-Erklärung in einfachen Worten + Rechtsgrundlage
router.post("/explain", aiLimiter, async (req, res) => {
  try {
    const { contractId } = req.body || {};
    if (!contractId) return res.status(400).json({ success: false, error: "NO_ID" });
    await ensureDb();
    const c = await contractsCollection.findOne({
      _id: new ObjectId(contractId),
      $or: [{ userId: req.user.userId }, { userId: new ObjectId(req.user.userId) }],
    });
    if (!c) return res.status(404).json({ success: false, error: "NOT_FOUND" });
    // 🔒 Free + generiert + nicht freigekauft → keine Klausel-Erklärung (bezahltes Feature).
    if (await isGeneratedLockedFor(req.user.userId, c)) {
      return res.status(403).json({ success: false, gated: true, error: "GATED", message: "Dieser Vertrag ist gesperrt. Schalte ihn frei, um die Klausel-Erklärung zu nutzen." });
    }
    const explanation = await explainContract(c.content || "");
    return res.json({ success: true, ...explanation });
  } catch (e) {
    const status = e.code === "NO_AI_KEY" ? 503 : 502;
    return res.status(status).json({ success: false, error: e.code || "AI_ERROR", message: "Erklärung gerade nicht möglich — bitte erneut versuchen." });
  }
});

module.exports = { router, assess, classifyRefineIntent, generateContractText, reviewContract, explainContract, extractContractDates, datesToContractFields, renderPremiumPdfBuffer, textToBasicHtml };
