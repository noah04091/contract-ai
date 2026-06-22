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
        ? Math.max(0, Math.ceil((sigExpiresAt - new Date()) / (1000 * 60 * 60 * 24)))
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
    recipientEmail: event.user.email  // Fuer personalisierte Unsubscribe-Links
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
function generateCancelReminderEmail(event, token, baseUrl) {
  const daysUntilWindow = event.metadata?.daysUntilWindow || 30;
  return `
    <h2 style="color: #3b82f6; text-align: center;">Erinnerung: Kündigungsfrist naht</h2>
    <p style="text-align: center;">In ca. <strong>${daysUntilWindow} Tagen</strong> öffnet sich das Kündigungsfenster für <strong>${event.metadata.contractName}</strong>.</p>
    <div style="background: #f0f9ff; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0;">
      <h3>Details:</h3>
      <ul style="list-style: none; padding: 0;">
        <li><strong>Vertrag:</strong> ${event.metadata.contractName}</li>
        ${event.metadata?.provider ? `<li><strong>Anbieter:</strong> ${event.metadata.provider}</li>` : ''}
        ${event.metadata?.isAutoRenewal ? '<li><strong>Hinweis:</strong> Dieser Vertrag verlängert sich automatisch!</li>' : ''}
      </ul>
    </div>
    <p style="text-align: center;">Jetzt ist ein guter Zeitpunkt, Ihre Optionen zu prüfen.</p>
  `;
}

function generateCancelWindowEmail(event, token, baseUrl) {
  const daysUntilExpiry = Math.ceil((new Date(event.metadata.expiryDate) - new Date()) / (1000 * 60 * 60 * 24));
  return `
    <h2 style="color: #34c759; text-align: center;">Gute Nachrichten!</h2>
    <p style="text-align: center;">Das Kündigungsfenster für <strong>${event.metadata.contractName}</strong> ist jetzt geöffnet.</p>
    <div style="background: #f0f9ff; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0;">
      <h3>Wichtige Informationen:</h3>
      <ul style="list-style: none; padding: 0;">
        <li><strong>Vertragsende:</strong> ${new Date(event.metadata.expiryDate).toLocaleDateString('de-DE')}</li>
        <li><strong>Kündigungsfrist:</strong> ${event.metadata.noticePeriodDays} Tage</li>
        <li><strong>Anbieter:</strong> ${event.metadata.provider || 'Unbekannt'}</li>
        <li><strong>Verbleibende Zeit:</strong> ${daysUntilExpiry} Tage</li>
      </ul>
    </div>
  `;
}

function generateLastCancelDayEmail(event, token, baseUrl) {
  return `
    <h2 style="color: #991b1b; text-align: center;">Wichtige Erinnerung</h2>
    <p style="font-size: 15px; line-height: 1.7; color: #334155; text-align: center;">
      Heute ist der letzte Tag, um <strong>"${event.metadata.contractName}"</strong> zu kündigen.
    </p>
    <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; margin: 20px 0; border-radius: 0 8px 8px 0;">
      <p style="color: #991b1b; margin: 0; font-weight: 600;">Was passiert ohne Kündigung:</p>
      <ul style="color: #991b1b; margin: 12px 0 0 0; padding-left: 20px;">
        <li>Automatische Verlängerung um ${event.metadata.autoRenewMonths || 12} Monate</li>
        <li>Bindung für weitere ${event.metadata.autoRenewMonths || 12} Monate</li>
      </ul>
    </div>
  `;
}

function generateCancelWarningEmail(event, token, baseUrl) {
  return `
    <h2 style="color: #ff9500; text-align: center;">Wichtige Erinnerung</h2>
    <p style="text-align: center;">In <strong>${event.metadata.daysLeft} Tagen</strong> endet die Kündigungsfrist für "${event.metadata.contractName}".</p>
  `;
}

function generatePriceIncreaseEmail(event, token, baseUrl) {
  return `
    <h2 style="color: #ff6b35; text-align: center;">Preiserhöhung angekündigt</h2>
    <p style="text-align: center;">Der Preis für "${event.metadata.contractName}" wird erhöht.</p>
  `;
}

function generateAutoRenewalEmail(event, token, baseUrl) {
  return `
    <h2 style="color: #5c7cfa; text-align: center;">Automatische Verlängerung steht bevor</h2>
    <p style="text-align: center;">"${event.metadata.contractName}" verlängert sich automatisch.</p>
  `;
}

function generateReviewEmail(event, token, baseUrl) {
  return `
    <h2 style="color: #10b981; text-align: center;">Zeit für einen Vertrags-Check!</h2>
    <p style="text-align: center;">Ihr Vertrag "${event.metadata.contractName}" läuft seit längerer Zeit.</p>
  `;
}

function generateCancellationConfirmationCheckEmail(event, token, baseUrl) {
  const contractName = event.metadata?.contractName || event.contractName || "Vertrag";
  const provider = event.metadata?.provider || "Anbieter";
  const isFollowUp = event.metadata?.isFollowUp;
  return `
    <h2 style="color: #f59e0b; text-align: center;">Kündigungsbestätigung prüfen</h2>
    <p style="text-align: center;">Haben Sie bereits eine <strong>Bestätigung</strong> für die Kündigung von <strong>${contractName}</strong> ${provider ? `bei ${provider}` : ''} erhalten?</p>
    <div style="background: #fffbeb; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
      <h3 style="margin: 0 0 8px; font-size: 15px;">Was Sie jetzt tun sollten:</h3>
      <ul style="padding-left: 18px; margin: 0;">
        <li><strong>Bestätigung erhalten?</strong> — Im Kalender auf "Ja, erhalten" klicken</li>
        <li><strong>Keine Bestätigung?</strong> — Erinnern Sie den Anbieter mit einem Klick</li>
        <li><strong>Kündigung doch nicht gewünscht?</strong> — Vertrag reaktivieren</li>
      </ul>
    </div>
    ${isFollowUp ? '<p style="color: #92400e; font-size: 13px;">Dies ist eine Folge-Erinnerung. Sie haben zuvor angegeben, keine Bestätigung erhalten zu haben.</p>' : ''}
    <p style="text-align: center;">Öffnen Sie Ihren Kalender in Contract AI, um direkt zu reagieren.</p>
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

  return `
    <h2 style="color: ${urgencyColor}; text-align: center;">Signaturanfrage: ${urgencyText}</h2>
    <div style="background: ${urgencyBg}; border-left: 4px solid ${urgencyColor}; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0;">
      <ul style="list-style: none; padding: 0; margin: 0;">
        <li style="margin-bottom: 8px;"><strong>Dokument:</strong> ${envelopeTitle}</li>
        <li style="margin-bottom: 8px;"><strong>Ablaufdatum:</strong> ${expiresAtFormatted}</li>
        <li><strong>Ausstehende Signaturen:</strong> ${pendingSigners} von ${totalSigners}</li>
      </ul>
    </div>
    <p style="text-align: center; color: #4b5563;">
      ${daysUntilExpiry === 0
        ? 'Bitte prüfen Sie den Status der Signaturanfrage umgehend.'
        : `Noch ${daysUntilExpiry} Tag${daysUntilExpiry > 1 ? 'e' : ''} bis zum Ablauf. Erinnern Sie ausstehende Unterzeichner rechtzeitig.`
      }
    </p>
  `;
}

function generateGenericEmail(event, token, baseUrl) {
  return `
    <h2>${event.title}</h2>
    <p>${event.description}</p>
  `;
}

function generateQuickActionLinks(event, token, baseUrl) {
  return [
    { icon: "", text: "Im Kalender anzeigen", url: `${baseUrl}/calendar?eventId=${event._id}` },
    { icon: "", text: "Erinnern in 7 Tagen", url: `${baseUrl}/api/calendar/quick-action?token=${token}&action=snooze&days=7` },
    { icon: "", text: "Erinnerung ausschalten", url: `${baseUrl}/api/calendar/quick-action?token=${token}&action=dismiss` }
  ];
}

function generateCalendarEmailTemplate(params) {
  const { title, preheader, eventType, severity, content, ctaButtons, quickActions, recipientEmail } = params;
  const severityColors = { info: "#3b82f6", warning: "#ff9500", critical: "#ff3b30" };
  const primaryColor = severityColors[severity] || "#3b82f6";

  const ctaHtml = ctaButtons.map(button => {
    const buttonColors = {
      primary: { bg: primaryColor, text: "#ffffff" },
      secondary: { bg: "#f3f4f6", text: "#1f2937" },
      warning: { bg: "#ff9500", text: "#ffffff" },
      urgent: { bg: "#ff3b30", text: "#ffffff" }
    };
    const colors = buttonColors[button.style] || buttonColors.primary;
    return `
      <table border="0" cellpadding="0" cellspacing="0" style="margin: 10px auto;">
        <tr>
          <td align="center">
            <a href="${button.url}" target="_blank" style="display: inline-block; padding: 14px 28px; font-size: 16px; font-weight: 600; color: ${colors.text}; text-decoration: none; background: ${colors.bg}; border-radius: 25px;">${button.text}</a>
          </td>
        </tr>
      </table>
    `;
  }).join('');

  const quickActionsHtml = quickActions.map(action =>
    `<a href="${action.url}" style="display: inline-block; margin: 0 10px; color: #6b7280; text-decoration: none; font-size: 14px;">${action.text}</a>`
  ).join(' | ');

  const baseUrlForUnsub = process.env.FRONTEND_URL || "https://contract-ai.de";
  const unsubscribeUrl = `${baseUrlForUnsub}/api/email/unsubscribe?email=${encodeURIComponent(recipientEmail)}&category=CALENDAR`;

  return generateEmailTemplate({
    title: title,
    preheader: preheader,
    body: `
      <div style="margin-bottom: 30px;">${content}</div>
      <div style="text-align: center; margin: 30px 0;">${ctaHtml}</div>
      <div style="border-top: 1px solid #e5e7eb; margin-top: 40px; padding-top: 20px; text-align: center; font-size: 14px; color: #6b7280;">
        <p><strong>Quick Actions:</strong></p>
        <div style="margin: 15px 0;">${quickActionsHtml}</div>
      </div>
    `,
    recipientEmail: recipientEmail,
    emailCategory: 'calendar',
    unsubscribeUrl: unsubscribeUrl
  });
}

module.exports = {
  checkAndSendNotifications,
  queueEventNotification,
  processEmailQueue,
  requeueEventOnQueueFailure,
  eventFiresOnlyOnOwnDay,
  firesOnOwnDay,
  shouldDeferToOwnDay,
  getSendWindow
};
