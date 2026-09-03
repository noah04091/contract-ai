// 📁 backend/routes/emailQuickAction.js
// 🔘 03.09.2026 — Mail-Knöpfe "Erinnern in 7 Tagen" / "Erinnerung ausschalten".
//
// WARUM ES DIESES MODUL GIBT: Die alte GET-Route lag in routes/calendar.js hinter
// dem verifyToken-Mount (server.js) — ausgeloggte Mail-Empfänger bekamen beim Klick
// rohes 401-JSON, der Knopf war seit jeher tot (live bewiesen 03.09.). Die Route war
// für Token-Zugriff GEBAUT (signierter 7-Tage-JWT im Link trägt die Autorisierung),
// nur falsch eingehängt. Präzedenzfall: der ICS-Feed, ebenfalls VOR dem Mount.
//
// SICHERHEITSMODELL (2 adversariale Reviews + Zweitprüfer-Auflagen, 03.09.):
//  • GET zeigt NUR eine Bestätigungsseite und schreibt NIE — Mail-Scanner
//    (Outlook SafeLinks, Link-Previews) rufen Links automatisch ab; ohne die
//    Zwischenseite würden sie Erinnerungen still ausschalten.
//  • POST /confirm prüft den Token KOMPLETT NEU (nie Browser-Zustand vertrauen)
//    und führt erst dann aus. Formular-Ziel ist eine ABSOLUTE api.contract-ai.de-
//    URL — kein Vercel-Proxy/Apex-www-Hop auf dem zustandsändernden Pfad.
//  • Schon-erledigt-Merker PRO LINK (sha1(token|action) am Event) — Reload/
//    Doppelklick führt nie doppelt aus (+7 wäre sonst +14); eine SPÄTERE Mail
//    trägt einen neuen Token und darf wieder.
//  • Ausgeschaltete (dismissed) Erinnerungen werden NIE still reaktiviert.
//  • Ergebnis steht AUF der Seite — das Frontend liest ?success=/?error= nirgends
//    aus, und /calendar wirft Ausgeloggte auf /login (Redirect wäre eine Sackgasse).
//  • Tarif: Mail-Aktionen sind bewusst für ALLE Empfänger offen (Noahs Linie:
//    ein Knopf, den wir selbst in die Mail schreiben, muss funktionieren;
//    "ausschalten" darf nie hinter der Kasse liegen). In-App bleibt Business+.
//
// Registrierung in server.js: app.get("/api/calendar/quick-action") — NUR GET,
// damit der App-interne POST /quick-action (routes/calendar.js, Bearer+Plan-Gate)
// unberührt weiterläuft — und app.post("/api/calendar/quick-action/confirm").
// Beides NACH der req.db-Middleware und VOR dem verifyToken-Mount.

const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { ObjectId } = require("mongodb");
const { isQuickActionPayload } = require("../utils/tokenShape");
const { escapeHtml } = require("../utils/escapeHtml");

const BACKEND_URL = process.env.BACKEND_URL || "https://api.contract-ai.de";
const FRONTEND_URL = process.env.FRONTEND_URL || "https://www.contract-ai.de";
const ERLAUBTE_AKTIONEN = ["snooze", "dismiss"];
const MAX_BODY_BYTES = 4096;

function safeObjectId(id) {
  if (!id || !ObjectId.isValid(id)) return null;
  return new ObjectId(id);
}

function aktionsSchluessel(token, action) {
  return crypto.createHash("sha1").update(`${token}|${action}`).digest("hex");
}

function fmt(d) {
  try { return new Date(d).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" }); }
  catch { return ""; }
}

// Gemeinsames Seitengerüst: kein externes Asset (der Token steht in der URL —
// jeder Fremd-Request, auch ein <img src>-Logo, wäre ein potenzielles Leck über
// Referer/Logs). Die Marken-Optik ist deshalb KOMPLETT eingebettet: Wortmarken-
// Logo als HTML/CSS, Icons als Inline-SVG. Strenge Header bleiben.
function sende(res, status, titel, inhaltHtml) {
  res.status(status).set({
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-store",
    "Referrer-Policy": "no-referrer",
    "X-Robots-Tag": "noindex, nofollow",
    // Durchgesetzte CSP nur für diese Seiten (global ist CSP bewusst aus):
    "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; img-src data:; form-action " + BACKEND_URL + "; frame-ancestors 'none'; base-uri 'none'"
  }).send(`<!doctype html>
<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(titel)} · Contract AI</title>
<style>
  * { box-sizing: border-box; }
  body { margin:0; background:linear-gradient(180deg,#eef4ff 0%,#f6f8fc 240px,#f6f8fc 100%); font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; color:#0f172a; -webkit-font-smoothing:antialiased; }
  .huelle { max-width:460px; margin:0 auto; padding:44px 20px 32px; }
  .logo { display:flex; align-items:center; justify-content:center; gap:7px; margin-bottom:22px; user-select:none; }
  .logo .wort { font-weight:800; font-size:19px; letter-spacing:1.5px; color:#0f172a; }
  .logo .ai { display:inline-flex; align-items:center; justify-content:center; width:30px; height:30px; border-radius:50%; background:linear-gradient(135deg,#3b82f6,#1d4ed8); color:#fff; font-weight:800; font-size:12.5px; letter-spacing:.3px; box-shadow:0 3px 10px rgba(37,99,235,.35); }
  .karte { background:#ffffff; border:1px solid #e6eaf2; border-radius:18px; padding:30px 26px; box-shadow:0 10px 34px rgba(15,23,42,.08); }
  .ikon { width:56px; height:56px; border-radius:16px; margin:0 auto 16px; display:flex; align-items:center; justify-content:center; }
  .ikon.blau { background:#eff6ff; } .ikon.gruen { background:#ecfdf5; } .ikon.grau { background:#f1f5f9; }
  h1 { margin:0 0 10px; font-size:20px; text-align:center; letter-spacing:-.2px; }
  .text { margin:0; font-size:15px; line-height:1.6; color:#475569; text-align:center; }
  .termin { margin:18px 0 0; background:#f8fafc; border:1px solid #e8edf4; border-radius:12px; padding:13px 15px; display:flex; gap:11px; align-items:flex-start; text-align:left; }
  .termin .t-titel { font-weight:600; font-size:14.5px; color:#0f172a; line-height:1.4; overflow-wrap:anywhere; }
  .termin .t-datum { font-size:13px; color:#64748b; margin-top:2px; }
  .knopf { display:block; width:100%; margin-top:20px; background:linear-gradient(135deg,#3b82f6,#2563eb); color:#fff; border:none; font-weight:600; font-size:15.5px; font-family:inherit; padding:14px 20px; border-radius:11px; cursor:pointer; text-align:center; text-decoration:none; box-shadow:0 4px 14px rgba(37,99,235,.30); }
  .knopf:hover { filter:brightness(1.05); }
  .zweitlink { display:block; margin-top:14px; text-align:center; color:#64748b; font-size:13.5px; text-decoration:none; }
  .fuss { text-align:center; font-size:12.5px; color:#94a3b8; margin-top:20px; line-height:1.5; }
  .fuss a { color:#3b82f6; text-decoration:none; }
</style></head>
<body>
  <div class="huelle">
    <div class="logo"><span class="wort">CONTRACT</span><span class="ai">AI</span></div>
    <div class="karte">${inhaltHtml}</div>
    <p class="fuss">Du kannst alle Erinnerungen jederzeit in deinem <a href="${FRONTEND_URL}/calendar">Kalender</a> verwalten.<br>Contract AI · Dein Vertrags-Assistent</p>
  </div>
</body></html>`);
}

// Inline-SVG-Icons (kein externer Request; stroke = Markenblau bzw. Grün)
const ICONS = {
  glocke: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>',
  glockeAus: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#475569" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13.73 21a2 2 0 0 1-3.46 0"/><path d="M18.63 13A17.89 17.89 0 0 1 18 8"/><path d="M6.26 6.26A5.86 5.86 0 0 0 6 8c0 7-3 9-3 9h14"/><path d="M18 8a6 6 0 0 0-9.33-5"/><line x1="1" y1="1" x2="23" y2="23"/></svg>',
  haken: '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
  info: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
  kalender: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;margin-top:2px;"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>'
};

function terminBox(event) {
  const titel = escapeHtml(event.title || "Termin");
  const datum = escapeHtml(fmt(event.date));
  return `<div class="termin">${ICONS.kalender}<div><div class="t-titel">${titel}</div>${datum ? `<div class="t-datum">Termin am ${datum}</div>` : ""}</div></div>`;
}

function fehlerSeite(res, status, ueberschrift, text, ikon = "info") {
  const ikonKlasse = ikon === "haken" ? "gruen" : "grau";
  sende(res, status, ueberschrift, `
    <div class="ikon ${ikonKlasse}">${ICONS[ikon] || ICONS.info}</div>
    <h1>${escapeHtml(ueberschrift)}</h1>
    <p class="text">${escapeHtml(text)}</p>
    <a class="knopf" href="${FRONTEND_URL}/calendar">Zum Kalender</a>`);
}

/**
 * Gemeinsame Prüfkette für GET und POST: Token → Form → IDs → Event des Nutzers.
 * Gibt {event, decoded, action, days, schluessel} zurück oder null (Antwort ist dann schon raus).
 */
async function pruefeUndLade(req, res, token, actionRaw, daysRaw) {
  if (!token || typeof token !== "string") {
    fehlerSeite(res, 400, "Link unvollständig", "Diesem Link fehlt der Sicherheitscode. Bitte öffne den Knopf direkt aus deiner E-Mail.");
    return null;
  }
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    fehlerSeite(res, 400, "Link abgelaufen", "Dieser E-Mail-Link ist abgelaufen oder ungültig (Links gelten 7 Tage). Deine Erinnerung verwaltest du weiterhin direkt im Kalender.");
    return null;
  }
  if (!isQuickActionPayload(decoded)) {
    fehlerSeite(res, 400, "Link ungültig", "Dieser Link ist kein gültiger Erinnerungs-Link. Bitte nutze den Knopf aus deiner E-Mail.");
    return null;
  }
  const action = ERLAUBTE_AKTIONEN.includes(actionRaw) ? actionRaw : null;
  if (!action) {
    fehlerSeite(res, 400, "Unbekannte Aktion", "Dieser Link enthält eine unbekannte Aktion. Bitte nutze die Knöpfe aus deiner E-Mail.");
    return null;
  }
  const eventId = safeObjectId(decoded.eventId);
  const userId = safeObjectId(decoded.userId);
  if (!eventId || !userId) {
    fehlerSeite(res, 400, "Link ungültig", "Dieser Link ist beschädigt. Bitte nutze den Knopf aus deiner E-Mail.");
    return null;
  }
  const event = await req.db.collection("contract_events").findOne({ _id: eventId, userId });
  if (!event) {
    fehlerSeite(res, 404, "Termin nicht gefunden", "Dieser Termin existiert nicht mehr — vielleicht wurde der Vertrag gelöscht oder der Termin neu erzeugt. Aktuelle Erinnerungen findest du im Kalender.");
    return null;
  }
  const parsedDays = parseInt(daysRaw);
  const days = Number.isFinite(parsedDays) && parsedDays >= 1 && parsedDays <= 30 ? parsedDays : 7;
  return { event, decoded, action, days, schluessel: aktionsSchluessel(token, action) };
}

function bereitsErledigtSeite(res, action) {
  const text = action === "dismiss"
    ? "Diese Erinnerung wurde über diesen Link bereits ausgeschaltet."
    : "Diese Erinnerung wurde über diesen Link bereits verschoben. In der nächsten Erinnerungs-Mail bekommst du neue Knöpfe.";
  fehlerSeite(res, 200, "Schon erledigt", text, "haken");
}

// ============ GET: Bestätigungsseite (führt NIE aus) ============
async function renderMailActionPage(req, res) {
  try {
    const geladen = await pruefeUndLade(req, res, req.query.token, req.query.action, req.query.days);
    if (!geladen) return;
    const { event, action, days, schluessel } = geladen;

    if (event.metadata?.lastMailActionKey === schluessel) return bereitsErledigtSeite(res, action);

    if (event.status === "dismissed") {
      if (action === "dismiss") return fehlerSeite(res, 200, "Bereits ausgeschaltet", "Diese Erinnerung ist schon ausgeschaltet — du musst nichts weiter tun.", "haken");
      return fehlerSeite(res, 200, "Erinnerung ist ausgeschaltet", "Diese Erinnerung wurde ausgeschaltet und wird nicht verschoben. Wenn du sie wieder brauchst, aktiviere sie im Kalender.");
    }

    const frage = action === "snooze"
      ? `Möchtest du in <strong>${days} Tagen</strong> erneut an diesen Termin erinnert werden?`
      : `Möchtest du diese Erinnerung ausschalten? Du bekommst dazu dann keine E-Mails mehr.`;
    const knopf = action === "snooze" ? `Ja, in ${days} Tagen erinnern` : "Ja, Erinnerung ausschalten";

    sende(res, 200, action === "snooze" ? "Später erinnern" : "Erinnerung ausschalten", `
      <div class="ikon ${action === "snooze" ? "blau" : "grau"}">${action === "snooze" ? ICONS.glocke : ICONS.glockeAus}</div>
      <h1>${action === "snooze" ? "Später erinnern?" : "Erinnerung ausschalten?"}</h1>
      <p class="text">${frage}</p>
      ${terminBox(event)}
      <form method="POST" action="${BACKEND_URL}/api/calendar/quick-action/confirm" style="margin:0;">
        <input type="hidden" name="token" value="${escapeHtml(req.query.token)}">
        <input type="hidden" name="action" value="${escapeHtml(action)}">
        <input type="hidden" name="days" value="${days}">
        <button type="submit" class="knopf">${escapeHtml(knopf)}</button>
      </form>
      <a class="zweitlink" href="${FRONTEND_URL}/calendar">Abbrechen und zum Kalender</a>`);
  } catch (err) {
    console.error("❌ Mail-Aktion (GET) fehlgeschlagen:", err.message);
    fehlerSeite(res, 500, "Etwas ist schiefgelaufen", "Bitte versuche es in ein paar Minuten erneut oder verwalte die Erinnerung direkt im Kalender.");
  }
}

// ============ POST /confirm: führt aus (prüft ALLES neu) ============
async function executeMailAction(req, res) {
  try {
    const laenge = parseInt(req.headers["content-length"] || "0");
    if (Number.isFinite(laenge) && laenge > MAX_BODY_BYTES) {
      return fehlerSeite(res, 413, "Anfrage zu groß", "Bitte nutze den Knopf aus deiner E-Mail.");
    }

    const geladen = await pruefeUndLade(req, res, req.body?.token, req.body?.action, req.body?.days);
    if (!geladen) return;
    const { event, action, days, schluessel } = geladen;

    if (event.metadata?.lastMailActionKey === schluessel) return bereitsErledigtSeite(res, action);
    if (event.status === "dismissed" && action === "snooze") {
      return fehlerSeite(res, 200, "Erinnerung ist ausgeschaltet", "Diese Erinnerung wurde ausgeschaltet und wird nicht verschoben. Wenn du sie wieder brauchst, aktiviere sie im Kalender.");
    }

    let ergebnisText;
    if (action === "snooze") {
      const { applySnooze } = require("../services/calendarSnooze");
      const snoozeResult = await applySnooze(req.db, event, days);
      ergebnisText = snoozeResult.message;
    } else {
      await req.db.collection("contract_events").updateOne(
        { _id: event._id },
        { $set: { status: "dismissed", dismissedAt: new Date(), updatedAt: new Date() } }
      );
      ergebnisText = `Die Erinnerung „${event.title || "Termin"}" ist ausgeschaltet. Du bekommst dazu keine E-Mails mehr.`;
    }

    // Schon-erledigt-Merker PRO LINK setzen (Reload/Doppelklick führt nie doppelt aus).
    await req.db.collection("contract_events").updateOne(
      { _id: event._id },
      { $set: { "metadata.lastMailActionKey": schluessel, "metadata.lastMailActionAt": new Date() } }
    );

    sende(res, 200, "Erledigt", `
      <div class="ikon gruen">${ICONS.haken}</div>
      <h1>Erledigt!</h1>
      <p class="text">${escapeHtml(ergebnisText)}</p>
      ${terminBox(event)}
      <a class="knopf" href="${FRONTEND_URL}/calendar">Zum Kalender</a>`);
  } catch (err) {
    console.error("❌ Mail-Aktion (POST) fehlgeschlagen:", err.message);
    fehlerSeite(res, 500, "Etwas ist schiefgelaufen", "Bitte versuche es in ein paar Minuten erneut oder verwalte die Erinnerung direkt im Kalender.");
  }
}

module.exports = { renderMailActionPage, executeMailAction };
