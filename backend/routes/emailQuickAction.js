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
// jeder Fremd-Request wäre ein potenzielles Leck über Referer), strenge Header.
function sende(res, status, titel, inhaltHtml) {
  res.status(status).set({
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-store",
    "Referrer-Policy": "no-referrer",
    "X-Robots-Tag": "noindex, nofollow",
    // Durchgesetzte CSP nur für diese Seiten (global ist CSP bewusst aus):
    "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; form-action " + BACKEND_URL + "; frame-ancestors 'none'; base-uri 'none'"
  }).send(`<!doctype html>
<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(titel)} · Contract AI</title></head>
<body style="margin:0;background:#f5f7fb;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a;">
  <div style="max-width:440px;margin:0 auto;padding:48px 20px;">
    <div style="text-align:center;margin-bottom:18px;font-weight:800;font-size:17px;letter-spacing:.2px;color:#1d4ed8;">CONTRACT AI</div>
    <div style="background:#ffffff;border:1px solid #e5e9f0;border-radius:16px;padding:28px 24px;box-shadow:0 6px 24px rgba(15,23,42,.06);">
      ${inhaltHtml}
    </div>
    <p style="text-align:center;font-size:12px;color:#94a3b8;margin-top:18px;">Du kannst alle Erinnerungen jederzeit in deinem <a href="${FRONTEND_URL}/calendar" style="color:#3b82f6;text-decoration:none;">Kalender</a> verwalten.</p>
  </div>
</body></html>`);
}

function fehlerSeite(res, status, ueberschrift, text) {
  sende(res, status, ueberschrift, `
    <h1 style="margin:0 0 10px 0;font-size:19px;">${escapeHtml(ueberschrift)}</h1>
    <p style="margin:0;font-size:14.5px;line-height:1.55;color:#475569;">${escapeHtml(text)}</p>
    <p style="margin:18px 0 0 0;"><a href="${FRONTEND_URL}/calendar" style="display:inline-block;background:#3b82f6;color:#fff;text-decoration:none;font-weight:600;font-size:14.5px;padding:11px 20px;border-radius:9px;">Zum Kalender</a></p>`);
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
  fehlerSeite(res, 200, "Schon erledigt ✓", text);
}

// ============ GET: Bestätigungsseite (führt NIE aus) ============
async function renderMailActionPage(req, res) {
  try {
    const geladen = await pruefeUndLade(req, res, req.query.token, req.query.action, req.query.days);
    if (!geladen) return;
    const { event, action, days, schluessel } = geladen;

    if (event.metadata?.lastMailActionKey === schluessel) return bereitsErledigtSeite(res, action);

    if (event.status === "dismissed") {
      if (action === "dismiss") return fehlerSeite(res, 200, "Bereits ausgeschaltet ✓", "Diese Erinnerung ist schon ausgeschaltet — du musst nichts weiter tun.");
      return fehlerSeite(res, 200, "Erinnerung ist ausgeschaltet", "Diese Erinnerung wurde ausgeschaltet und wird nicht verschoben. Wenn du sie wieder brauchst, aktiviere sie im Kalender.");
    }

    const titel = escapeHtml(event.title || "Termin");
    const datum = escapeHtml(fmt(event.date));
    const frage = action === "snooze"
      ? `Möchtest du in <strong>${days} Tagen</strong> erneut an <strong>„${titel}"</strong>${datum ? ` (${datum})` : ""} erinnert werden?`
      : `Möchtest du die Erinnerung <strong>„${titel}"</strong>${datum ? ` (${datum})` : ""} ausschalten? Du bekommst dazu dann keine E-Mails mehr.`;
    const knopf = action === "snooze" ? `Ja, in ${days} Tagen erinnern` : "Ja, Erinnerung ausschalten";

    sende(res, 200, action === "snooze" ? "Später erinnern" : "Erinnerung ausschalten", `
      <h1 style="margin:0 0 10px 0;font-size:19px;">${action === "snooze" ? "Später erinnern?" : "Erinnerung ausschalten?"}</h1>
      <p style="margin:0 0 20px 0;font-size:14.5px;line-height:1.55;color:#475569;">${frage}</p>
      <form method="POST" action="${BACKEND_URL}/api/calendar/quick-action/confirm" style="margin:0;">
        <input type="hidden" name="token" value="${escapeHtml(req.query.token)}">
        <input type="hidden" name="action" value="${escapeHtml(action)}">
        <input type="hidden" name="days" value="${days}">
        <button type="submit" style="width:100%;background:#3b82f6;color:#fff;border:none;font-weight:600;font-size:15px;padding:13px 20px;border-radius:9px;cursor:pointer;">${escapeHtml(knopf)}</button>
      </form>
      <p style="margin:14px 0 0 0;text-align:center;"><a href="${FRONTEND_URL}/calendar" style="color:#64748b;font-size:13.5px;text-decoration:none;">Abbrechen und zum Kalender</a></p>`);
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
      <div style="text-align:center;font-size:34px;line-height:1;margin-bottom:10px;">✅</div>
      <h1 style="margin:0 0 10px 0;font-size:19px;text-align:center;">Erledigt!</h1>
      <p style="margin:0;font-size:14.5px;line-height:1.55;color:#475569;text-align:center;">${escapeHtml(ergebnisText)}</p>
      <p style="margin:20px 0 0 0;text-align:center;"><a href="${FRONTEND_URL}/calendar" style="display:inline-block;background:#3b82f6;color:#fff;text-decoration:none;font-weight:600;font-size:14.5px;padding:11px 20px;border-radius:9px;">Zum Kalender</a></p>`);
  } catch (err) {
    console.error("❌ Mail-Aktion (POST) fehlgeschlagen:", err.message);
    fehlerSeite(res, 500, "Etwas ist schiefgelaufen", "Bitte versuche es in ein paar Minuten erneut oder verwalte die Erinnerung direkt im Kalender.");
  }
}

module.exports = { renderMailActionPage, executeMailAction };
