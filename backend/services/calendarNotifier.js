// backend/services/calendarNotifier.js
// E-Mail-Benachrichtigungen fuer Kalender-Events mit Retry-Mechanismus

const nodemailer = require("nodemailer");
const { ObjectId } = require("mongodb");
const { generateEmailTemplate } = require("../utils/emailTemplate");
const { queueEmail, processEmailQueue } = require("./emailRetryService");

/**
 * Maskiert eine E-Mail-Adresse für Logs (DSGVO-Hygiene).
 * Beispiel: max.mustermann@example.com → m***@example.com
 * Verwendung NUR für console.log, nie für tatsächlichen Mail-Versand.
 */
function maskEmail(email) {
  if (!email || typeof email !== "string") return "(no-email)";
  const at = email.indexOf("@");
  if (at <= 0) return "(invalid)";
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  const masked = local.length <= 2 ? "*".repeat(local.length) : local[0] + "***";
  return `${masked}@${domain}`;
}

/**
 * Hauptfunktion fuer den taeglichen Notification-Check
 * Fuegt E-Mails zur Queue hinzu (statt direktem Versand)
 */
/**
 * Events, deren DATUM bereits der gewollte Benachrichtigungstag IST (Frist-Hinweise +
 * alle Erinnerungs-/Vorwarn-Events): Sie dürfen NIE vorgezogen werden — die Mail kommt an
 * ihrem eigenen Tag. Spiegelt 1:1 die Inline-Klassifikation in checkAndSendNotifications
 * (isFristHinweisEvent + hasReminderSemantics). Modul-Ebene + exportiert, damit testbar.
 */
const REMINDER_SEMANTIC_TYPES_OWN_DAY = new Set([
  "CANCELLATION_REMINDER", "MINIMUM_TERM_REMINDER", "PROBATION_REMINDER", "WARRANTY_REMINDER",
  "PAYMENT_REMINDER", "CUSTOM_REMINDER", "CANCEL_WARNING", "PRICE_INCREASE_WARNING",
  "CANCELLATION_CONFIRMATION_CHECK"
]);
function eventFiresOnlyOnOwnDay(event) {
  const src = event?.metadata?.source;
  const isFristHinweis = src === "fristHinweis-recurring" || src === "fristHinweis-anchor";
  const isReminder = /_REMINDER_\d+D$/i.test(event?.type || "");
  return isFristHinweis || isReminder ||
    REMINDER_SEMANTIC_TYPES_OWN_DAY.has(event?.type) ||
    event?.isManual === true || event?.manuallyCreated === true;
}

// Lifecycle-/Stichtag-Notizen, deren TEXT tagesgenau ist ("Kündigungsfenster öffnet HEUTE",
// "letzter Tag", "verlängert sich heute", "Preis steigt heute", Jahres-Review). Sie haben i.d.R.
// KEINE eigenen _REMINDER-Begleiter und würden sonst übers Lookahead bis zu 7 Tage zu früh
// rausgehen → der Text würde lügen. Darum: am EIGENEN Tag feuern.
const OWN_DAY_LIFECYCLE_TYPES = new Set([
  "CANCEL_WINDOW_OPEN", "LAST_CANCEL_DAY", "AUTO_RENEWAL", "REVIEW", "PRICE_INCREASE"
  // CANCEL_WARNING + PRICE_INCREASE_WARNING bereits in REMINDER_SEMANTIC_TYPES_OWN_DAY
]);

/**
 * Gehört dieses Event auf seinen EIGENEN Tag (statt via Lookahead früh)? JA wenn:
 *  (1) Vorwarnung/Frist-Hinweis/manuell (eventFiresOnlyOnOwnDay), ODER
 *  (2) tagesgenaue Lifecycle-Notiz (OWN_DAY_LIFECYCLE_TYPES), ODER
 *  (3) ein Stichtag MIT Reminder-Abdeckung (die Reminder haben vorgewarnt → der Stichtag selbst
 *      gehört auf den Tag, nicht davor).
 * NEIN nur für nackte Stichtage OHNE Reminder → die behalten das Lookahead-Sicherheitsnetz
 * (frühe Warnung, sonst gäbe es gar keine). Sichere Fehlrichtung: vergessener Typ → feuert
 * höchstens zu früh, nie "gar nicht".
 */
function firesOnOwnDay(event, hasReminderCoverage) {
  return eventFiresOnlyOnOwnDay(event)
    || OWN_DAY_LIFECYCLE_TYPES.has(event?.type)
    || hasReminderCoverage === true;
}

/**
 * Versand-Entscheidung: dieses Event auf seinen eigenen Tag aufschieben (statt zu früh)? JA wenn
 *  (a) es gehört auf den eigenen Tag (firesOnOwnDay),
 *  (b) es ist noch nicht sein Tag (daysUntilEventDay >= 1),
 *  (c) ⏱️ ZEIT-WÄCHTER: Uhrzeit liegt NACH dem Cron-Lauf (UTC-Stunde >= 9; Cron 07:00 Sommer /
 *      08:00 Winter UTC) → am eigenen Tag garantiert noch im `date >= now`-Fenster.
 * Ohne (c) würde ein früh gespeichertes Event am eigenen Tag aus dem Fenster fallen und NIE
 * gesendet (aus "zu früh" würde "gar nicht"); solche behalten ihr bisheriges Verhalten. Regulär
 * erzeugte Events liegen auf 12:00 (createLocalDate) → (c) erfüllt. DB-Audit 19.06.: 648/648 auf 12:00.
 */
function shouldDeferToOwnDay(event, daysUntilEventDay, hasReminderCoverage) {
  if (daysUntilEventDay < 1) return false;
  if (!firesOnOwnDay(event, hasReminderCoverage)) return false;
  return new Date(event.date).getUTCHours() >= 9;
}

/**
 * Abfrage-Fenster für fällige Events (Option A, 19.06.2026 — Cron-Robustheit OHNE späte Mails).
 * Untergrenze = HEUTE 00:00 (Tagesbeginn), NICHT der exakte Jetzt-Zeitpunkt: so werden Termine,
 * die HEUTE fällig sind, auch dann noch erfasst, wenn der Cron mal Stunden später läuft (z.B.
 * Render-Verzögerung) — sonst fiele ein 12:00-Event bei einem 14:00-Lauf aus dem Fenster.
 * WICHTIG: nur ab HEUTE — vergangene Tage werden NICHT nachgefasst → respektiert die Entscheidung
 * „keine verspäteten Mails" (driver-6-fix). Obergrenze = jetzt + lookaheadDays (unverändert).
 */
function getSendWindow(now, lookaheadDays) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setDate(end.getDate() + lookaheadDays);
  return { start, end };
}

/**
 * Verbleibende KALENDERTAGE bis zum Signatur-Ablauf für die Mail-Anzeige
 * ("Läuft in X Tagen ab" / "Noch X Tage bis zum Ablauf").
 *
 * Wurzel-Fix 28.06.2026: vorher `Math.ceil((expiresAt - now)/Tag)` → jede angebrochene
 * Stunde zählte als ganzer Tag. Da der Cron um 07:00 UTC läuft, `expiresAt` aber die
 * Erstellungs-Uhrzeit trägt (meist später), wurde die Zahl um 1 zu hoch ("in 2 Tagen"
 * obwohl Ablauf morgen / "in 4" statt 3). Jetzt Datum-gegen-Datum (beide auf Tagesbeginn
 * normalisiert) — exakt das Muster der daysUntilEventDay-Berechnung (~Z.241) und konsistent
 * mit dem Frontend-Kalender (Calendar.tsx getDaysRemaining). Reine Anzeige-Zahl; Timing,
 * Versand und Skip-Logik bleiben unberührt.
 *
 * @param {Date|string|number} expiresAt - Ablaufzeitpunkt des Envelopes
 * @param {Date} [now=new Date()] - Bezugszeitpunkt (Cron-Lauf)
 * @returns {number} ganze Kalendertage, nie negativ
 */
function signatureDaysUntilExpiry(expiresAt, now = new Date()) {
  const expiry = new Date(expiresAt);
  if (isNaN(expiry.getTime())) return 0;
  const expiryDateOnly = new Date(expiry);
  expiryDateOnly.setHours(0, 0, 0, 0);
  const todayDateOnly = new Date(now);
  todayDateOnly.setHours(0, 0, 0, 0);
  return Math.max(0, Math.round((expiryDateOnly - todayDateOnly) / 86400000));
}

async function checkAndSendNotifications(db) {
  try {
    console.log("Starte Calendar Notification Check...");

    const now = new Date();
    // Lookahead = 7 Tage (Safety-Net für Edge-Cases ohne Reminder-Coverage).
    // 4-Klassen-Hybrid-Skip-Logik weiter unten entscheidet pro Event, ob die Mail
    // tatsächlich vorgezogen wird oder erst am Event-Tag rausgeht:
    //   Klasse A — Haupt-Event MIT _REMINDER_XD-Begleiter → skippen, Reminder feuert
    //   Klasse B — Haupt-Event OHNE Reminder → Lookahead-Safety-Net aktiv (Vorab-Mail)
    //   Klasse C — Frist-Hinweis-Event (fristHinweis-recurring/anchor) → skippen, ist selbst Reminder
    //   Klasse D — Erinnerungs-Events (AI-Staffelung _REMINDER_XD, benannte Vorwarn-Typen,
    //              Custom-Reminder, manuell angelegte Termine) → NIEMALS vorziehen,
    //              feuern an ihrem eigenen Datum (Fix 04.06.2026: vorher kamen
    //              "7 Tage vorher"-Mails bis zu 7 Tage zu früh = 14 Tage vor dem Termin)
    const lookaheadDays = parseInt(process.env.REMINDER_LOOKAHEAD_DAYS || "7");
    // 🆕 Option A: Fenster ab HEUTE 00:00 (Cron-Robustheit, keine späten Mails) — siehe getSendWindow.
    const { start: windowStart, end: lookaheadDate } = getSendWindow(now, lookaheadDays);

    // Hole alle anstehenden Events (nur "scheduled" Status)
    const upcomingEvents = await db.collection("contract_events")
      .aggregate([
        {
          $match: {
            date: { $gte: windowStart, $lte: lookaheadDate },
            status: "scheduled",
            severity: { $in: ["info", "warning", "critical"] }
          }
        },
        // 🛟 32MB-Sort-Fix: KEIN contract-$lookup mehr.
        // Das eingebettete Vertrags-Doc wurde hier nie gelesen (Code nutzt ausschließlich
        // event.contractId / event.contractName / event.metadata + event.user). Früher
        // hängte der $lookup das ganze ~5MB-Vertrags-Doc an JEDES Event → der nachfolgende
        // $sort sprengte das 32MB-Limit (Atlas-Flex unterstützt kein allowDiskUse).
        // Smoke-Test (smokeTestNotifierSort.js, 921 Events) bewies: ein $project einzelner
        // Großfelder reicht NICHT (der Vertrag hat weitere große Felder wie criticalIssues/
        // recommendations/optimizations). Lösung: das tote Embed ganz weglassen → der Sort
        // läuft nur noch über schlanke Event+User-Docs. Verhalten unverändert.
        {
          $lookup: {
            from: "users",
            localField: "userId",
            foreignField: "_id",
            as: "user"
          }
        },
        { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
        { $sort: { date: 1, severity: -1 } }
      ])
      .toArray();

    console.log(`${upcomingEvents.length} Events zur Benachrichtigung gefunden`);

    // ─── HYBRID-SKIP-LOGIK: Pre-Fetch aller existierenden _REMINDER_XD-Events ───
    // Damit wir pro Haupt-Event in O(1) wissen, ob ein passender Reminder existiert.
    // Performance: 1 Query statt N Queries (bei vielen Events kritisch).
    // Fail-safe: Bei DB-Fehler im Pre-Fetch bleibt Map leer → Hybrid-Skip wirkt nicht,
    // Lookahead-Safety-Net springt für alle Events ein (= bisheriges Verhalten).
    const involvedContractIds = [...new Set(
      upcomingEvents.map(e => e.contractId?.toString()).filter(Boolean)
    )];
    const remindersByContractAndBaseType = new Map();  // "contractId|baseType" → true
    if (involvedContractIds.length > 0) {
      try {
        const { ObjectId: ObjId } = require("mongodb");
        const reminderEvents = await db.collection("contract_events").find({
          contractId: { $in: involvedContractIds.map(id => new ObjId(id)) },
          type: { $regex: /_REMINDER_\d+D$/i },
          status: { $nin: ["dismissed"] }  // dismissed Reminder zählen nicht als Coverage
        }, { projection: { contractId: 1, type: 1 } }).toArray();
        for (const r of reminderEvents) {
          const cid = r.contractId.toString();
          const baseType = r.type.replace(/_REMINDER_\d+D$/i, "");
          remindersByContractAndBaseType.set(`${cid}|${baseType}`, true);
        }
        console.log(`🔍 Hybrid-Pre-Fetch: ${reminderEvents.length} Reminder-Events für ${involvedContractIds.length} Verträge geladen`);
      } catch (preFetchErr) {
        console.error(`⚠️ Hybrid-Pre-Fetch fehlgeschlagen — fallback auf Lookahead-only:`, preFetchErr.message);
        // Map bleibt leer → keine Klasse-A-Skips → Lookahead-Safety-Net deckt alles ab
      }
    }

    // Helpers für 4-Klassen-Skip-Logik
    const isReminderType = (t) => /_REMINDER_\d+D$/i.test(t || "");
    const isFristHinweisEvent = (e) => {
      const src = e.metadata?.source;
      return src === "fristHinweis-recurring" || src === "fristHinweis-anchor";
    };
    // Klasse D: Event-Typen mit Erinnerungs-Charakter — ihr Datum IST bereits der
    // gewollte Benachrichtigungszeitpunkt (z.B. "⏰ In 7 Tagen kündbar" liegt 7 Tage
    // vor dem Stichtag). Vorziehen würde den Mail-Text zur Lüge machen.
    // Erzeugung: calendarEvents.js (520/549, 613/642, 711, 777, 1487, 443),
    // cancellations.js (298, 697, 814).
    const REMINDER_SEMANTIC_TYPES = new Set([
      "CANCELLATION_REMINDER",          // "Vertrag endet in 30/7 Tagen"
      "MINIMUM_TERM_REMINDER",          // "In 2 Wochen / 7 Tagen kündbar"
      "PROBATION_REMINDER",             // "Probezeit endet in 2 Wochen"
      "WARRANTY_REMINDER",              // "Gewährleistung endet in 30 Tagen"
      "PAYMENT_REMINDER",               // "Zahlung in 3 Tagen"
      "CUSTOM_REMINDER",                // User-konfigurierte Vertrags-Erinnerung
      "CANCEL_WARNING",                 // "Nur noch 7 Tage" (Kündigungsfrist)
      "PRICE_INCREASE_WARNING",         // "Preiserhöhung in 30 Tagen"
      "CANCELLATION_CONFIRMATION_CHECK" // Follow-up "Bestätigung erhalten?" (+14d)
    ]);
    // Manuell angelegte Termine (isManual/manuallyCreated): Der User hat das Datum
    // bewusst gewählt — Erinnerung kommt an diesem Tag, nicht Tage vorher.
    const hasReminderSemantics = (e) =>
      isReminderType(e.type) ||
      REMINDER_SEMANTIC_TYPES.has(e.type) ||
      e.isManual === true ||
      e.manuallyCreated === true;
    const todayDateOnly = new Date();
    todayDateOnly.setHours(0, 0, 0, 0);

    let queuedCount = 0;

    for (const event of upcomingEvents) {
      // Envelope-Reminder nur am geplanten Tag versenden (nicht durch Lookahead vorziehen)
      if (event.sourceType === "ENVELOPE") {
        const eventDateOnly = new Date(event.date);
        eventDateOnly.setHours(0, 0, 0, 0);
        const todayOnly = new Date();
        todayOnly.setHours(0, 0, 0, 0);
        if (eventDateOnly > todayOnly) {
          console.log(`⏳ Envelope-Event "${event.title}" noch nicht fällig (geplant: ${eventDateOnly.toISOString().split('T')[0]})`);
          continue;
        }
      }

      // ─── HYBRID-SKIP-LOGIK (3 Klassen) ───
      // Nur skippen wenn Event >1 Tag in der Zukunft. Tag-of-Mails laufen IMMER durch.
      // Math.floor() statt Math.round() — konservativ bei DST-Übergängen:
      // an einem 23-Stunden-Tag (Spring-Forward) ergibt sich 0.96, nicht 1.
      // floor(0.96)=0 → Event wird als „Tag-of" behandelt, keine Vorverlagerung. Sicher.
      const eventDateOnly = new Date(event.date);
      eventDateOnly.setHours(0, 0, 0, 0);
      const daysUntilEventDay = Math.floor((eventDateOnly - todayDateOnly) / 86400000);

      // ─── USER-GEWÄHLTE EXAKT-TERMINE: punktgenau am gewählten Tag, kein Vortags-Versand ───
      // Der bestehende Klasse-D-Skip greift nur bei `daysUntilEventDay > 1`. Bei genau 1
      // (= Event morgen) fiel ein user-gewählter Reminder durch und wurde EINEN TAG ZU FRÜH
      // verschickt (z.B. Reminder auf den 11.6. kam am 10.6.). Der User hat das Datum aber
      // bewusst gewählt — eine Mail "am 11.6." die am 10.6. ankommt wirkt wie ein Bug.
      // Darum: solche Events erst am Tag selbst (daysUntilEventDay === 0) feuern lassen.
      // WICHTIG — `reminderType === "custom"` ist load-bearing: der Typ CUSTOM_REMINDER wird
      // AUCH für abgeleitete Fristen-Vorwarner (reminderType 'expiry'/'cancellation') benutzt,
      // die bewusst Tage VOR der Frist kommen sollen. Die dürfen hier NICHT erfasst werden.
      // (Der Digest-Pfad calendarDigestService.js hat denselben Vortags-Effekt, ist aber
      // aktuell ein totes Feature ohne UI — separat als Tech-Debt dokumentiert.)
      const isUserPickedDate =
        (event.type === "CUSTOM_REMINDER" && event.metadata?.reminderType === "custom") ||
        event.isManual === true ||
        event.manuallyCreated === true;
      if (isUserPickedDate && daysUntilEventDay >= 1) {
        console.log(`⏸️ User-Exakt-Termin skip: ${event.type} in ${daysUntilEventDay}d — feuert am gewählten Tag`);
        continue;
      }

      // 🆕 Bug-Fix 19.06.2026: Mails feuern am EIGENEN Tag statt zu früh — für (1) Vorwarnungen,
      // (2) tagesgenaue Lifecycle-Notizen (Kündigungsfenster/letzter Tag/Verlängerung/Review/
      // Preiserhöhung) UND (3) Stichtage MIT Reminder-Abdeckung. Wurzel: die "1-Tag-Toleranz" (>1)
      // + Lookahead ließen diese 1 bis 7 Tage zu früh raus (verifiziert: PAYMENT_DUE_REMINDER_14D
      // dat. 20.06 ging am 19.06 raus). Nackte Stichtage OHNE Reminder behalten das Lookahead-
      // Sicherheitsnetz (frühe Warnung). Zeit-Wächter → nie verpasst. Details in shouldDeferToOwnDay.
      const hasReminderCoverage = !!(event.contractId &&
        remindersByContractAndBaseType.has(`${event.contractId.toString()}|${event.type}`));
      if (shouldDeferToOwnDay(event, daysUntilEventDay, hasReminderCoverage)) {
        console.log(`⏸️ Feuert erst am eigenen Tag: ${event.type} (in ${daysUntilEventDay}d) — skip`);
        continue;
      }

      if (daysUntilEventDay > 1) {
        // Klasse C: Frist-Hinweis-Events sind selbst „die Reminder" (Tier-2-Arbeit vom 27.05.2026)
        // → niemals vorziehen, immer am Event-Tag feuern
        if (isFristHinweisEvent(event)) {
          console.log(`⏸️ Klasse C (Frist-Hinweis) skip: ${event.type} in ${daysUntilEventDay}d — feuert am Tag selbst`);
          continue;
        }

        // Klasse D: Erinnerungs-Events SIND die Erinnerung → niemals vorziehen.
        // Schließt die Lücke vom 27.05.: _REMINDER_XD-Events fielen bis dahin durch
        // und wurden vom Lookahead bis zu 7 Tage vor ihrem eigenen Datum verschickt.
        if (hasReminderSemantics(event)) {
          console.log(`⏸️ Klasse D (Erinnerungs-Event) skip: ${event.type} in ${daysUntilEventDay}d — feuert an seinem Tag`);
          continue;
        }

        // Klasse A: Haupt-Event MIT zugehörigem _REMINDER_XD → skippen, Reminder feuert
        if (event.contractId) {
          const key = `${event.contractId.toString()}|${event.type}`;
          if (remindersByContractAndBaseType.has(key)) {
            console.log(`⏸️ Klasse A (Haupt+Reminder) skip: ${event.type} in ${daysUntilEventDay}d — Reminder übernimmt`);
            continue;
          }
        }

        // Klasse B: Haupt-Event OHNE Reminder-Coverage → Fall-through zum normalen
        // Versand (Lookahead-Safety-Net, z.B. alte Verträge ohne importantDates).
      }

      if (!event.user?.email) {
        console.warn(`Keine E-Mail fuer User ${event.userId}`);
        continue;
      }

      // Skip free users - Email reminders are Business+ only
      const userPlan = event.user?.subscriptionPlan || "free";
      if (userPlan === "free") {
        console.log(`Skipping free user ${maskEmail(event.user.email)} - Email reminders require Business+`);
        continue;
      }

      // Skip users with digest mode - they get a combined email instead
      const digestMode = event.user?.emailDigestMode;
      if (digestMode === "daily" || digestMode === "weekly") {
        // These users are handled by calendarDigestService
        continue;
      }

      // notificationSettings prüfen (default: alles aktiv)
      const ns = event.user?.notificationSettings;
      if (ns?.email?.enabled === false) {
        console.log(`Skipping ${maskEmail(event.user.email)} - E-Mail-Benachrichtigungen deaktiviert`);
        continue;
      }
      // Selbst gesetzte Erinnerungen sind KEINE „Vertragsfrist": Der Schalter heißt im UI
      // „Vertragsfristen — Kündigungsfristen & Ablaufdaten". Schaltet der User den aus, will er
      // keine automatischen Fristen-Mails mehr — aber NICHT, dass sein eigener Wecker (z.B.
      // Reminder auf den 11.6.) still verschwindet. Darum: user-gewählte Exakt-Termine hier
      // ausnehmen. Echte abgeleitete Fristen-Events bleiben vom Schalter gestoppt.
      if (ns?.email?.contractDeadlines === false && !isUserPickedDate) {
        console.log(`Skipping ${maskEmail(event.user.email)} - Vertragsfristen-Mails deaktiviert`);
        continue;
      }

      // deadlineReminders-Timing prüfen.
      // Bei Erinnerungs-Events zählt der GEMEINTE Vorlauf (metadata.daysUntil, z.B. 7
      // bei "_REMINDER_7D"), nicht der Abstand zum Versand-Tag: Seit Klasse D werden
      // diese Events erst an ihrem eigenen Tag verschickt (daysUntilEvent ≈ 0-1) —
      // ohne dieses Mapping würde der "1 Tag vorher"-Toggle ALLE Staffel-Mails steuern
      // und das UI-Versprechen ("7 Tage vorher" an/aus) brechen.
      const daysUntilEvent = Math.ceil((new Date(event.date) - now) / (1000 * 60 * 60 * 24));
      const intendedLead = Number.isFinite(event.metadata?.daysUntil)
        ? event.metadata.daysUntil
        : daysUntilEvent;
      const dr = ns?.deadlineReminders;
      // 3a — EHRLICHE 1:1-ZUORDNUNG Stufe → Schalter (kanonischer Satz 30/7/1/0).
      // Früher mappte ein Bereichs-Schema (>=6 → days7) den 7-Tage-Schalter heimlich auf
      // ALLE Vorläufe ab 6 Tagen (auch 14 und 30) — das Etikett log. Jetzt steuert jeder
      // Schalter exakt seine Stufe.
      // Selbst gesetzte Exakt-Termine (isUserPickedDate) bleiben ausgenommen — sie sind keine
      // Frist-Vorwarn-Stufen; ein abgeschaltetes „1 Tag vorher" darf sie nicht still verschlucken.
      // Nicht-kanonische Vorläufe werden auf die NÄCHSTE kanonische Stufe abgebildet — so
      // bleiben sie sauber von genau einem Schalter gesteuert und feuern nie ungewollt.
      // Das betrifft (a) Alt-Events aus Bestandsverträgen (vor 3a erzeugt, laufen aus) UND
      // (b) seltene Spezial-Erzeuger, die weiter eigene Vorläufe nutzen: Mindestlaufzeit-/
      // Probezeit-Reminder (14d → days7) und Zahlungs-Reminder (3d → days1).
      if (dr && !isUserPickedDate) {
        const canonicalStages = [
          { lead: 30, enabled: dr.days30 !== false },
          { lead: 7,  enabled: dr.days7 !== false },
          { lead: 1,  enabled: dr.days1 !== false },
          { lead: 0,  enabled: dr.daysSame !== false }
        ];
        // nächstliegende kanonische Stufe (bei Gleichstand gewinnt die frühere/größere Stufe)
        const stage = canonicalStages.reduce((best, s) =>
          Math.abs(s.lead - intendedLead) < Math.abs(best.lead - intendedLead) ? s : best
        );
        if (stage.enabled === false) {
          console.log(`Skipping ${maskEmail(event.user.email)} - Erinnerung ${intendedLead}d (Stufe ${stage.lead}d) deaktiviert`);
          continue;
        }
      }

      try {
        // Atomar: Status nur ändern wenn noch "scheduled" (verhindert doppelte E-Mails)
        const claimed = await db.collection("contract_events").findOneAndUpdate(
          { _id: event._id, status: "scheduled" },
          { $set: { status: "queued", queuedAt: new Date(), updatedAt: new Date() } }
        );
        // Driver 6.x liefert das Dokument direkt; ältere Driver wrappen es in { value }.
        // Gleiches Compat-Pattern wie in services/campaignService.js.
        const claimedDoc = claimed?.value || claimed;
        if (!claimedDoc) {
          console.log(`⏭️ Event ${event._id} bereits verarbeitet, überspringe`);
          continue;
        }

        // E-Mail zur Queue hinzufügen (nur wenn erfolgreich beansprucht)
        await queueEventNotification(event, db);

        queuedCount++;

      } catch (error) {
        console.error(`Fehler beim Queuing der Benachrichtigung fuer Event ${event._id}:`, error);
        // 🛟 Loch-1a-Schutz (19.06.2026): Die Mail-Übergabe ist NACH dem "queued"-Claim
        // fehlgeschlagen (z.B. DB-Schluckauf). Ohne Rücksetzen bliebe das Event für immer
        // "queued" → der nächste Lauf (sucht nur "scheduled") fasst es nie wieder an →
        // stille verlorene Erinnerung. Darum zurück auf "scheduled".
        await requeueEventOnQueueFailure(db, event._id);
      }
    }

    console.log(`${queuedCount} E-Mails zur Queue hinzugefuegt`);

    // Verarbeite Queue sofort (erster Versuch)
    if (queuedCount > 0) {
      console.log("Starte sofortige Queue-Verarbeitung...");
      const stats = await processEmailQueue(db);
      console.log(`Queue-Verarbeitung: ${stats.sent} gesendet, ${stats.retrying} warten auf Retry, ${stats.failed} fehlgeschlagen`);
    }

    return queuedCount;

  } catch (error) {
    console.error("Fehler im Notification Check:", error);
    throw error;
  }
}

/**
 * Fuegt eine Event-Benachrichtigung zur E-Mail-Queue hinzu
 */
async function queueEventNotification(event, db) {
  const actionToken = await generateActionToken(event._id, event.userId);
  const baseUrl = process.env.FRONTEND_URL || "https://contract-ai.de";

  let emailContent = "";
  let subject = "";
  let ctaButtons = [];

  switch (event.type) {
    case "CANCEL_REMINDER":
      subject = `${event.metadata.contractName} - Erinnerung: Kündigungsfrist naht`;
      emailContent = generateCancelReminderEmail(event, actionToken, baseUrl);
      ctaButtons = [
        { text: "Vertrag ansehen", url: `${baseUrl}/contracts?view=${event.contractId}`, style: "primary" },
        { text: "Im Kalender anzeigen", url: `${baseUrl}/calendar?eventId=${event._id}`, style: "secondary" }
      ];
      break;

    case "CANCEL_WINDOW_OPEN":
      subject = `${event.metadata.contractName} - Vertragsinformation`;
      emailContent = generateCancelWindowEmail(event, actionToken, baseUrl);
      ctaButtons = [
        { text: "Jetzt kündigen", url: `${baseUrl}/cancel/${event.contractId}?token=${actionToken}&action=cancel`, style: "primary" },
        { text: "Alternativen ansehen", url: `${baseUrl}/compare?contractId=${event.contractId}`, style: "secondary" }
      ];
      break;

    case "LAST_CANCEL_DAY":
      subject = `${event.metadata.contractName} - Frist heute`;
      emailContent = generateLastCancelDayEmail(event, actionToken, baseUrl);
      ctaButtons = [
        { text: "Jetzt kündigen", url: `${baseUrl}/cancel/${event.contractId}?token=${actionToken}&action=cancel`, style: "primary" }
      ];
      break;

    case "CANCEL_WARNING":
      subject = `${event.metadata.contractName} - Frist in ${event.metadata.daysLeft} Tagen`;
      emailContent = generateCancelWarningEmail(event, actionToken, baseUrl);
      ctaButtons = [
        { text: "Jetzt kündigen", url: `${baseUrl}/cancel/${event.contractId}?token=${actionToken}&action=cancel`, style: "primary" },
        { text: "Optimieren", url: `${baseUrl}/optimize/${event.contractId}`, style: "secondary" }
      ];
      break;

    case "PRICE_INCREASE":
      subject = `${event.metadata.contractName} - Preisanpassung`;
      emailContent = generatePriceIncreaseEmail(event, actionToken, baseUrl);
      ctaButtons = [
        { text: "Angebote vergleichen", url: `${baseUrl}/compare?contractId=${event.contractId}&reason=price_increase`, style: "primary" },
        { text: "Vertrag ansehen", url: `${baseUrl}/cancel/${event.contractId}?token=${actionToken}`, style: "secondary" }
      ];
      break;

    case "AUTO_RENEWAL":
      subject = `${event.metadata.contractName} - Vertragsverlaengerung`;
      emailContent = generateAutoRenewalEmail(event, actionToken, baseUrl);
      ctaButtons = [
        { text: "Jetzt kündigen", url: `${baseUrl}/cancel/${event.contractId}?token=${actionToken}&action=cancel`, style: "primary" },
        { text: "Vertrag ansehen", url: `${baseUrl}/contracts?view=${event.contractId}`, style: "secondary" }
      ];
      break;

    case "REVIEW":
      subject = `${event.metadata.contractName} - Vertragsinfo`;
      emailContent = generateReviewEmail(event, actionToken, baseUrl);
      ctaButtons = [
        { text: "Optimieren", url: `${baseUrl}/optimize/${event.contractId}`, style: "primary" },
        { text: "Vergleichen", url: `${baseUrl}/compare?contractId=${event.contractId}`, style: "secondary" }
      ];
      break;

    case "CANCELLATION_CONFIRMATION_CHECK":
      subject = `${event.metadata?.contractName || event.contractName} — Kündigungsbestätigung erhalten?`;
      emailContent = generateCancellationConfirmationCheckEmail(event, actionToken, baseUrl);
      ctaButtons = [
        { text: "Im Kalender prüfen", url: `${baseUrl}/calendar`, style: "primary" },
        { text: "Kündigungsarchiv", url: `${baseUrl}/cancellations`, style: "secondary" }
      ];
      break;

    case "SIGNATURE_REMINDER_3DAY":
    case "SIGNATURE_REMINDER_1DAY":
    case "SIGNATURE_EXPIRING": {
      const envelopeTitle = event.metadata?.envelopeTitle || event.title;
      const sigExpiresAt = event.metadata?.expiresAt ? new Date(event.metadata.expiresAt) : null;
      const daysUntilExpiry = sigExpiresAt
        ? signatureDaysUntilExpiry(sigExpiresAt)
        : (event.metadata?.daysUntilExpiry || 0);

      if (daysUntilExpiry === 0) {
        subject = `${envelopeTitle} — Signatur läuft heute ab`;
      } else if (daysUntilExpiry === 1) {
        subject = `${envelopeTitle} — Signatur läuft morgen ab`;
      } else {
        subject = `${envelopeTitle} — Signatur läuft in ${daysUntilExpiry} Tagen ab`;
      }

      emailContent = generateSignatureReminderEmail(event, daysUntilExpiry);
      ctaButtons = [
        { text: "Signaturanfrage ansehen", url: `${baseUrl}/envelopes`, style: "primary" },
        { text: "Im Kalender anzeigen", url: `${baseUrl}/calendar?eventId=${event._id}`, style: "secondary" }
      ];
      break;
    }

    default:
      subject = `${event.metadata?.contractName || event.title} - Vertragsinformation`;
      emailContent = generateGenericEmail(event, actionToken, baseUrl);
      ctaButtons = [
        { text: "Details ansehen", url: `${baseUrl}/contracts?view=${event.contractId}`, style: "primary" }
      ];
  }

  const htmlContent = generateCalendarEmailTemplate({
    title: subject,
    preheader: event.description,
    eventType: event.type,
    severity: event.severity,
    contractName: event.metadata.contractName,
    eventDate: event.date,
    content: emailContent,
    ctaButtons: ctaButtons,
    quickActions: generateQuickActionLinks(event, actionToken, baseUrl),
    recipientEmail: event.user.email,  // Fuer personalisierte Unsubscribe-Links
    recipientName: event.user?.name || ''  // v2: persönliche Anrede
  });

  // Zur Queue hinzufuegen (mit Retry-Mechanismus)
  await queueEmail(db, {
    to: event.user.email,
    subject: subject,
    html: htmlContent,
    from: process.env.EMAIL_FROM || '"Contract AI" <info@contract-ai.de>',
    eventId: event._id.toString(),
    userId: event.userId.toString(),
    emailType: `calendar_${event.type.toLowerCase()}`
  });

  console.log(`E-Mail zur Queue hinzugefuegt: ${subject} fuer ${maskEmail(event.user.email)}`);
}

/**
 * 🛟 Loch-1a-Schutz: Setzt ein nach dem "queued"-Claim hängengebliebenes Event zurück auf
 * "scheduled" — ABER nur, wenn für das Event KEIN email_queue-Eintrag existiert. Existiert einer,
 * kam die Mail real in die Warteschlange (wird dort versendet/retried) → Rücksetzen würde eine
 * Doppel-Mail erzeugen. So ist der Schutz doppel-mail-sicher. Idempotent + fail-safe
 * (ein Fehler hier darf den Cron nicht abbrechen).
 */
async function requeueEventOnQueueFailure(db, eventId) {
  try {
    const idStr = eventId.toString();
    const mailExists = await db.collection("email_queue").findOne(
      { eventId: idStr }, { projection: { _id: 1 } }
    );
    if (mailExists) return false; // Mail kam doch in die Queue → NICHT zurücksetzen
    const res = await db.collection("contract_events").updateOne(
      { _id: eventId, status: "queued" },
      { $set: { status: "scheduled", updatedAt: new Date() }, $unset: { queuedAt: "" } }
    );
    if (res.modifiedCount > 0) {
      console.warn(`↩️ Event ${idStr} nach Queuing-Fehler zurück auf "scheduled" (wird nächsten Lauf erneut versucht)`);
      return true;
    }
    return false;
  } catch (e) {
    console.error(`⚠️ requeueEventOnQueueFailure(${eventId}) fehlgeschlagen:`, e.message);
    return false;
  }
}

/**
 * Generiert einen sicheren Action-Token fuer Quick Actions
 */
async function generateActionToken(eventId, userId) {
  const jwt = require("jsonwebtoken");
  return jwt.sign(
    {
      eventId: eventId.toString(),
      userId: userId.toString(),
      exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60)
    },
    process.env.JWT_SECRET
  );
}

/**
 * Email-Content-Generatoren
 */
// Hairline-Detail-Karte (v2) — rows: [[label, value], …]; leere Werte werden ausgelassen.
function calDetail(rows) {
  const items = (rows || []).filter(r => r && r[1] != null && r[1] !== '');
  if (!items.length) return '';
  const trs = items.map((r, i) =>
    `<tr><td style="padding:13px 18px;${i < items.length - 1 ? ' border-bottom:1px solid #f1f3f5;' : ''}"><span style="font-size:13px; color:#8a94a6;">${r[0]}</span><br><span style="font-size:14.5px; color:#0f172a;">${r[1]}</span></td></tr>`
  ).join('');
  return `<table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #eaecef; border-radius:10px; margin:0 0 22px 0;">${trs}</table>`;
}

function generateCancelReminderEmail(event) {
  const m = event.metadata || {};
  const days = m.daysUntilWindow || 30;
  return `
    <h1 style="margin:0 0 14px 0; font-size:21px; line-height:1.35; color:#0f172a; font-weight:700;">Bald kannst du kündigen</h1>
    <p style="margin:0 0 22px 0;">In etwa <strong style="color:#0f172a;">${days} Tagen</strong> öffnet sich das Kündigungsfenster für <strong style="color:#0f172a;">${m.contractName || 'deinen Vertrag'}</strong>. Ein guter Moment, deine Optionen zu prüfen.</p>
    ${calDetail([['Vertrag', m.contractName], ['Anbieter', m.provider], m.isAutoRenewal ? ['Hinweis', 'Verlängert sich automatisch'] : null].filter(Boolean))}
  `;
}

function generateCancelWindowEmail(event) {
  const m = event.metadata || {};
  const expiry = m.expiryDate ? new Date(m.expiryDate) : null;
  const daysLeft = expiry ? Math.ceil((expiry - new Date()) / (1000 * 60 * 60 * 24)) : null;
  return `
    <h1 style="margin:0 0 14px 0; font-size:21px; line-height:1.35; color:#0f172a; font-weight:700;">Du kannst ${m.contractName || 'deinen Vertrag'} jetzt kündigen</h1>
    <p style="margin:0 0 22px 0;">Das Kündigungsfenster ist ab jetzt offen. Wenn du wechseln oder beenden möchtest, ist jetzt der richtige Zeitpunkt.</p>
    ${calDetail([
      ['Anbieter', m.provider],
      expiry ? ['Vertragsende', expiry.toLocaleDateString('de-DE')] : null,
      m.noticePeriodDays ? ['Kündigungsfrist', `${m.noticePeriodDays} Tage`] : null,
      daysLeft != null ? ['Verbleibend', `${daysLeft} Tage`] : null
    ].filter(Boolean))}
    <p style="margin:0 0 4px 0;">Kündige rechtzeitig — wir erstellen dein Kündigungsschreiben mit einem Klick.</p>
  `;
}

function generateLastCancelDayEmail(event) {
  const m = event.metadata || {};
  const months = m.autoRenewMonths || 12;
  return `
    <p style="margin:0 0 6px 0; font-size:13px; font-weight:600; color:#dc2626; letter-spacing:.3px; text-transform:uppercase;">Heute ist der letzte Tag</p>
    <h1 style="margin:0 0 14px 0; font-size:21px; line-height:1.35; color:#0f172a; font-weight:700;">${m.contractName || 'Vertrag'} jetzt kündigen</h1>
    <p style="margin:0 0 22px 0;">Heute ist die letzte Möglichkeit, fristgerecht zu kündigen. Danach verlängert sich der Vertrag automatisch um <strong style="color:#0f172a;">${months} Monate</strong>.</p>
    ${calDetail([['Anbieter', m.provider], ['Letzter Kündigungstag', 'Heute'], ['Ohne Kündigung', `Verlängerung um ${months} Monate`]].filter(Boolean))}
  `;
}

function generateCancelWarningEmail(event) {
  const m = event.metadata || {};
  const days = m.daysLeft != null ? m.daysLeft : 7;
  return `
    <p style="margin:0 0 6px 0; font-size:13px; font-weight:600; color:#b45309; letter-spacing:.3px; text-transform:uppercase;">Frist in ${days} Tagen</p>
    <h1 style="margin:0 0 14px 0; font-size:21px; line-height:1.35; color:#0f172a; font-weight:700;">${m.contractName || 'Vertrag'} rechtzeitig kündigen</h1>
    <p style="margin:0 0 22px 0;">In <strong style="color:#0f172a;">${days} Tagen</strong> endet die Kündigungsfrist. Danach ist eine fristgerechte Kündigung nicht mehr möglich.</p>
    ${calDetail([['Anbieter', m.provider], ['Frist endet in', `${days} Tagen`]].filter(Boolean))}
  `;
}

function generatePriceIncreaseEmail(event) {
  const m = event.metadata || {};
  const effDate = event.date ? new Date(event.date).toLocaleDateString('de-DE') : null;
  return `
    <p style="margin:0 0 6px 0; font-size:13px; font-weight:600; color:#b45309; letter-spacing:.3px; text-transform:uppercase;">Preisanpassung</p>
    <h1 style="margin:0 0 14px 0; font-size:21px; line-height:1.35; color:#0f172a; font-weight:700;">Der Preis für ${m.contractName || 'deinen Vertrag'} steigt</h1>
    <p style="margin:0 0 22px 0;">Dein Anbieter hat eine Preiserhöhung angekündigt. Ein guter Moment, Alternativen zu vergleichen oder zu kündigen.</p>
    ${calDetail([['Vertrag', m.contractName], ['Anbieter', m.provider], m.newPrice ? ['Neuer Preis', m.newPrice] : null, effDate ? ['Gültig ab', effDate] : null].filter(Boolean))}
  `;
}

function generateAutoRenewalEmail(event) {
  const m = event.metadata || {};
  const months = m.autoRenewMonths || 12;
  const renewDate = event.date ? new Date(event.date).toLocaleDateString('de-DE') : null;
  return `
    <h1 style="margin:0 0 14px 0; font-size:21px; line-height:1.35; color:#0f172a; font-weight:700;">${m.contractName || 'Dein Vertrag'} verlängert sich bald automatisch</h1>
    <p style="margin:0 0 22px 0;">Ohne Kündigung verlängert sich der Vertrag automatisch um <strong style="color:#0f172a;">${months} Monate</strong>. Wenn du das nicht möchtest, kündige rechtzeitig — wir erstellen dein Schreiben mit einem Klick.</p>
    ${calDetail([['Anbieter', m.provider], renewDate ? ['Verlängert sich am', renewDate] : null, ['Verlängerung', `um ${months} Monate`]].filter(Boolean))}
  `;
}

function generateReviewEmail(event) {
  const m = event.metadata || {};
  return `
    <h1 style="margin:0 0 14px 0; font-size:21px; line-height:1.35; color:#0f172a; font-weight:700;">Zeit für einen Vertrags-Check</h1>
    <p style="margin:0 0 22px 0;">Dein Vertrag <strong style="color:#0f172a;">${m.contractName || ''}</strong> läuft schon eine Weile. Vielleicht gibt es inzwischen ein besseres oder günstigeres Angebot — ein kurzer Vergleich lohnt sich oft.</p>
    ${calDetail([['Vertrag', m.contractName], ['Anbieter', m.provider]].filter(Boolean))}
  `;
}

function generateCancellationConfirmationCheckEmail(event) {
  const m = event.metadata || {};
  const contractName = m.contractName || event.contractName || "deinen Vertrag";
  const provider = m.provider || "";
  const isFollowUp = m.isFollowUp;
  return `
    <h1 style="margin:0 0 14px 0; font-size:21px; line-height:1.35; color:#0f172a; font-weight:700;">Kündigungsbestätigung erhalten?</h1>
    <p style="margin:0 0 18px 0;">Hast du schon eine <strong style="color:#0f172a;">Bestätigung</strong> für die Kündigung von <strong style="color:#0f172a;">${contractName}</strong>${provider ? ` bei ${provider}` : ''} bekommen?</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #eaecef; border-radius:10px; margin:0 0 20px 0;">
      <tr><td style="padding:13px 18px; border-bottom:1px solid #f1f3f5; font-size:14px; color:#475569;"><strong style="color:#0f172a;">Bestätigung erhalten?</strong> Im Kalender auf „Ja, erhalten" klicken.</td></tr>
      <tr><td style="padding:13px 18px; border-bottom:1px solid #f1f3f5; font-size:14px; color:#475569;"><strong style="color:#0f172a;">Keine Bestätigung?</strong> Erinnere den Anbieter mit einem Klick.</td></tr>
      <tr><td style="padding:13px 18px; font-size:14px; color:#475569;"><strong style="color:#0f172a;">Doch nicht gewünscht?</strong> Du kannst den Vertrag reaktivieren.</td></tr>
    </table>
    ${isFollowUp ? '<p style="margin:0 0 4px 0; font-size:13px; color:#b45309;">Das ist eine Folge-Erinnerung — du hattest zuvor angegeben, noch keine Bestätigung erhalten zu haben.</p>' : ''}
  `;
}

function generateSignatureReminderEmail(event, daysUntilExpiry) {
  const envelopeTitle = event.metadata?.envelopeTitle || event.title;
  const pendingSigners = event.metadata?.pendingSigners || 0;
  const totalSigners = event.metadata?.totalSigners || 0;
  const expiresAtFormatted = event.metadata?.expiresAt
    ? new Date(event.metadata.expiresAt).toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
    : 'Unbekannt';

  let urgencyColor, urgencyText, urgencyBg;
  if (daysUntilExpiry === 0) {
    urgencyColor = '#dc2626';
    urgencyText = 'Läuft heute ab!';
    urgencyBg = '#fef2f2';
  } else if (daysUntilExpiry === 1) {
    urgencyColor = '#f59e0b';
    urgencyText = 'Läuft morgen ab';
    urgencyBg = '#fffbeb';
  } else {
    urgencyColor = '#3b82f6';
    urgencyText = `Läuft in ${daysUntilExpiry} Tagen ab`;
    urgencyBg = '#eff6ff';
  }

  const eyebrow = daysUntilExpiry === 0 ? 'Läuft heute ab' : daysUntilExpiry === 1 ? 'Läuft morgen ab' : `Läuft in ${daysUntilExpiry} Tagen ab`;
  return `
    <p style="margin:0 0 6px 0; font-size:13px; font-weight:600; color:${urgencyColor}; letter-spacing:.3px; text-transform:uppercase;">${eyebrow}</p>
    <h1 style="margin:0 0 14px 0; font-size:21px; line-height:1.35; color:#0f172a; font-weight:700;">Deine Signaturanfrage läuft ab</h1>
    <p style="margin:0 0 22px 0;">${daysUntilExpiry === 0 ? 'Die Signaturanfrage läuft heute ab.' : `Noch ${daysUntilExpiry} Tag${daysUntilExpiry > 1 ? 'e' : ''} bis zum Ablauf.`} Erinnere ausstehende Unterzeichner rechtzeitig.</p>
    ${calDetail([['Dokument', envelopeTitle], expiresAtFormatted && expiresAtFormatted !== 'Unbekannt' ? ['Ablaufdatum', expiresAtFormatted] : null, ['Ausstehende Signaturen', `${pendingSigners} von ${totalSigners}`]].filter(Boolean))}
  `;
}

function generateGenericEmail(event) {
  return `
    <h1 style="margin:0 0 14px 0; font-size:21px; line-height:1.35; color:#0f172a; font-weight:700;">${event.title || 'Vertragsinformation'}</h1>
    <p style="margin:0 0 8px 0;">${event.description || ''}</p>
  `;
}

function generateQuickActionLinks(event, token, baseUrl) {
  return [
    { icon: "", text: "Im Kalender anzeigen", url: `${baseUrl}/calendar?eventId=${event._id}` },
    { icon: "", text: "Erinnern in 7 Tagen", url: `${baseUrl}/api/calendar/quick-action?token=${token}&action=snooze&days=7` },
    { icon: "", text: "Erinnerung ausschalten", url: `${baseUrl}/api/calendar/quick-action?token=${token}&action=dismiss` }
  ];
}

// v2-Hülle (Stripe/DocuSign-Stil): eigene, responsive Vorlage — Anrede, linksbündig,
// EIN primärer Button + dezenter Sekundär-Link, ruhige Schnellaktionen, sauberer Footer.
// Bewusst NICHT die geteilte Basis (generateEmailTemplate) — der v2-Look gilt nur für Kalender-Mails.
function generateCalendarEmailTemplate(params) {
  const { title, preheader, content, ctaButtons = [], quickActions = [], recipientEmail, recipientName } = params;
  const FRONTEND = process.env.FRONTEND_URL || "https://www.contract-ai.de";
  const logoUrl = `${FRONTEND}/logo.png`;
  const firstName = (recipientName && String(recipientName).trim().split(/\s+/)[0]) || "";
  const greeting = firstName ? `Hallo ${firstName},` : "Hallo,";

  const primary = ctaButtons.find(b => b.style === "primary") || ctaButtons[0] || null;
  const secondaries = ctaButtons.filter(b => b !== primary);
  const primaryHtml = primary ? `
        <table cellpadding="0" cellspacing="0" style="margin:0 0 12px 0;"><tr><td style="border-radius:8px; background-color:#3b82f6;">
          <a href="${primary.url}" target="_blank" style="display:inline-block; padding:13px 26px; font-size:15px; font-weight:600; color:#ffffff; text-decoration:none; border-radius:8px;">${primary.text}</a>
        </td></tr></table>` : "";
  const secondaryHtml = secondaries.length ? `
        <p style="margin:0; font-size:14px; color:#8a94a6;">${secondaries.map(s => `oder <a href="${s.url}" target="_blank" style="color:#3b82f6; text-decoration:none;">${s.text}</a>`).join(" &nbsp;·&nbsp; ")}</p>` : "";

  const quickHtml = quickActions.length ? `
    <tr><td class="cal-pad" style="padding:22px 44px 0 44px;">
      <p style="margin:0; font-size:13px; color:#9aa3b2;">${quickActions.map(a => `<a href="${a.url}" target="_blank" style="color:#9aa3b2; text-decoration:none;">${a.text}</a>`).join(" &nbsp;·&nbsp; ")}</p>
    </td></tr>` : "";

  const unsubscribeUrl = `${FRONTEND}/api/email/unsubscribe?email=${encodeURIComponent(recipientEmail)}&category=CALENDAR`;
  const preheaderHtml = preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">${preheader}</div>` : "";

  return `<!DOCTYPE html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>@media only screen and (max-width:480px){ .cal-pad{ padding-left:24px !important; padding-right:24px !important; } }</style></head>
<body style="margin:0; padding:0; background-color:#f4f6f8; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
${preheaderHtml}
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f8; padding:32px 12px;"><tr><td align="center">
  <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px; width:100%; background-color:#ffffff; border:1px solid #e6e9ec; border-radius:12px; overflow:hidden;">
    <tr><td class="cal-pad" style="padding:32px 44px 0 44px;"><img src="${logoUrl}" alt="Contract AI" style="height:26px; max-width:160px;"></td></tr>
    <tr><td class="cal-pad" style="padding:24px 44px 8px 44px;">
      <p style="margin:0 0 18px 0; font-size:15px; color:#475569;">${greeting}</p>
      <div style="font-size:15px; line-height:1.65; color:#475569;">${content}</div>
      <div style="margin-top:26px;">${primaryHtml}${secondaryHtml}</div>
    </td></tr>
    ${quickHtml}
    <tr><td class="cal-pad" style="padding:26px 44px 30px 44px;">
      <table width="100%" cellpadding="0" cellspacing="0"><tr><td style="border-top:1px solid #eaecef; padding-top:18px;">
        <p style="margin:0 0 6px 0; font-size:12.5px; color:#9aa3b2;">© ${new Date().getFullYear()} Contract AI</p>
        <p style="margin:0; font-size:12px;">
          <a href="${FRONTEND}" target="_blank" style="color:#9aa3b2; text-decoration:none;">Website</a> <span style="color:#d7dbe0; margin:0 8px;">·</span>
          <a href="${FRONTEND}/datenschutz" target="_blank" style="color:#9aa3b2; text-decoration:none;">Datenschutz</a> <span style="color:#d7dbe0; margin:0 8px;">·</span>
          <a href="${FRONTEND}/impressum" target="_blank" style="color:#9aa3b2; text-decoration:none;">Impressum</a> <span style="color:#d7dbe0; margin:0 8px;">·</span>
          <a href="${unsubscribeUrl}" target="_blank" style="color:#9aa3b2; text-decoration:none;">Abmelden</a>
        </p>
      </td></tr></table>
    </td></tr>
  </table>
</td></tr></table></body></html>`;
}

module.exports = {
  checkAndSendNotifications,
  queueEventNotification,
  processEmailQueue,
  requeueEventOnQueueFailure,
  eventFiresOnlyOnOwnDay,
  firesOnOwnDay,
  shouldDeferToOwnDay,
  getSendWindow,
  signatureDaysUntilExpiry,
  // Reine Render-Funktionen (für Vorschau/Tests; keine Seiteneffekte)
  __render: {
    generateCalendarEmailTemplate,
    generateCancelReminderEmail,
    generateCancelWindowEmail,
    generateLastCancelDayEmail,
    generateCancelWarningEmail,
    generatePriceIncreaseEmail,
    generateAutoRenewalEmail,
    generateReviewEmail,
    generateCancellationConfirmationCheckEmail,
    generateSignatureReminderEmail,
    generateGenericEmail
  }
};
