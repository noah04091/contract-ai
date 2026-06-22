# Kalender & Erinnerungen — Changelog + Referenz

> **Zweck:** Single Source of Truth für die Kalender-/Erinnerungs-Arbeit. Beim Wiederaufnehmen
> ZUERST lesen — hier steht **wo, was, warum, wann**. Stand: **22.06.2026**.
> Begleitende Memory-Datei: `memory/project_kalender-erinnerungs-ui-2026-06-22.md`.

---

## 🧭 Mentales Modell (wie das System tickt)

- **Termine/Fristen** liegen als „Events" in der DB-Collection `contract_events` (userId = **ObjectId**, nicht JWT-String!).
- Pro Frist gibt es ein **Haupt-Event** (am Frist-Tag) + automatische **Vorwarnungen** („X Tage vorher", eigene `_REMINDER_…`-Events).
- **Versand** macht der Cron `calendarNotifier.js` (09:00 Europe/Berlin). **Anzeige** macht der Kalender (Frontend). Anzeige ≠ Versand — viele „Fixes" sind reine Anzeige-Filter.
- **Vorwarn-Staffel** ist severity-basiert (`calendarEvents.js:~1022`): kritisch **30/7/1** Tage vorher, wichtig **30/7**, normal **7** — jeweils + **am Tag selbst** (Haupt-Event, gesteuert vom Schalter `daysSame`).

---

## 🔑 Schlüssel-Dateien

**Frontend**
- `frontend/src/pages/Calendar.tsx` — Kalender-Seite. Enthält `QuickActionsModal` (= das **Event-Popup**), die Toolbar (mit „?"-Button), das Einbinden von `CalendarOverview`, und den Reminder-Loader im Popup.
- `frontend/src/components/ReminderSettingsModal.tsx` (+ `.module.css`) — das **„Erinnerungen verwalten"-Modal**.
- `frontend/src/components/CalendarOverview.tsx` (+ `.module.css`) — die **„Überblick"-Ansicht** (gebaut, aber ausgeblendet, siehe unten).
- `frontend/src/components/ReminderHelpModal.tsx` — das **„?"-Hilfe-Popup**.
- `frontend/src/utils/reminderGrouping.ts` — geteilte Helfer: `cleanDeadlineName`, `reminderLeadLabel`, `isReminderEntry`, `stripFileName`.
- `frontend/src/stores/calendarStore.ts` — Zustand-Store. Lädt `GET /api/calendar/events` (3 Jahre voraus), **cached 5 Min**.

**Backend**
- `backend/routes/calendar.js` — `GET /events` (Filter `contractId` **und** `envelopeId`; Bündelung via `VISIBLE_EVENT_MATCH`), `POST /quick-action` (dismiss/snooze, abo-pflichtig).
- `backend/utils/calendarVisibility.js` — `VISIBLE_EVENT_MATCH` + `HIDE_REMINDER_TYPES` (welche Events in der breiten Liste sichtbar sind = die Bündelung).
- `backend/services/calendarEvents.js` — **Event-Erzeugung** (Vorwarn-Staffel `~1022`, Kündigungs-Warnungen `152–249`, Beschreibungen). Dismiss-Persistenz dokumentiert bei `~1768`.
- `backend/services/calendarNotifier.js` — der **Versand-Cron** (Free-Skip `~312`, Exakt-Tag-Logik).
- `backend/services/envelopeCalendarEvents.js` — **Signatur-Events** (Typen: `SIGNATURE_REMINDER_3DAY`, `_1DAY`, `SIGNATURE_EXPIRING`, `SIGNATURE_COMPLETED`).

---

## ⚠️ Gotchas (unbedingt merken, bevor man was anfasst)

1. **Free-User bekommen KEINE Erinnerungs-Mails.** `calendarNotifier.js:~312` überspringt `subscriptionPlan === 'free'`. Mails gibt's **ab Premium**. Kalender-**Aktionen** (dismiss/snooze) brauchen **Business+** (`CALENDAR_FULL_ACCESS_PLANS = business/enterprise/legendary`, `calendar.js:21`). → Zwei verschiedene Stufen!
2. **Breite Event-Liste blendet Vorwarnungen aus.** `GET /events` OHNE `contractId`/`envelopeId` filtert via `VISIBLE_EVENT_MATCH` (Bündelung: pro Frist nur 1 Eintrag). MIT `?contractId=` oder `?envelopeId=` kommen **ALLE** Events inkl. Vorwarner zurück. Darum lädt das Popup per contractId/envelopeId.
3. **Dismiss („Ausblenden") ist PERSISTENT** — bleibt auch nach Re-Analyse weg (`calendarEvents.js:~1768`, bewusst so). Stoppt auch die Mail (Notifier verarbeitet nur `status:'scheduled'`).
4. **Wiederkehrende Events haben virtuelle IDs** (`calendar.js:~95`, z. B. `id_2026-07-01`). → Löschen/Aktionen nur auf **echten 24-stelligen ObjectIds** anbieten, sonst läuft's ins Leere.
5. **Signatur-Event-Titel/Beschreibungen sind relativ zum Feuer-Tag** formuliert („läuft heute/morgen/bald ab") → bei Anzeige Tage vorher neutralisieren.
6. **`getEventDisplayDate`** (`Calendar.tsx`) liefert für `SIGNATURE_*` das `metadata.expiresAt` (echtes Ablaufdatum), sonst `event.date`.
7. **`ReminderSettingsModal` speichert per Voll-Ersetzung** der `reminderSettings` (`PATCH /api/contracts/:id/reminder-settings`) → immer erst aktuelle laden, sonst Überschreiben.
8. **Signatur-Events haben `envelopeId` doppelt:** top-level (ObjectId, DB-Filter) + `metadata.envelopeId` (String, fürs Frontend).
9. **userId in `contract_events`/`contracts` = ObjectId**, nicht der JWT-String → Lösch-/Filter-Queries mit `$in:[str, ObjectId]`.

---

## 📜 Was wir gemacht haben (chronologisch, mit Commits — alles live)

### Fundament (Backend, davor)
- **Erinnerungs-Mails am EXAKTEN Tag** (kein Tag früher/später) + Zustell-Härtung (Re-Queue bei Mail-Fehler).
- **Account-Löschung räumt mit auf** (Termine/Erinnerungen/Verträge des gelöschten Users) — Cascade-Fix (userId String-vs-ObjectId).

### UI/UX-Überarbeitung (22.06.2026)
| # | Was | Warum | Commit |
|---|-----|-------|--------|
| 1 | **Lila → Blau** (Popup + Verwalten-Modal) | Lila (`#4f46e5`/Custom-Typ) war hässlich + inkonsistent | `1ebda411` |
| 2 | **„Überblick"-Ansicht gebaut → wieder ausgeblendet** | Breite Liste enthält keine Vorwarner → zeigte falsch „keine Erinnerung". Komponente bleibt dormant. | `1ebda411` / `1971b9e0` |
| 3 | **Event-Popup neu** („So wirst du an diese Frist erinnert" + ✉️-Liste + ehrlicher Button) | Klarheit; Sprung ins Modal war verwirrend | `e64a8123` |
| 4 | **Verwalten-Modal aufgeräumt** (Übersicht zuerst, dann Hinzufügen; auto/eigene markiert; lesbarer Name) | Reihenfolge war verkehrt (Assistent zuerst) | `f90998d9` |
| 5 | **„Am Tag selbst" mitzeigen** (Popup + Modal) | Fristen ohne offene Vorwarnung wirkten fälschlich als „keine Erinnerung" | `d14629b6` |
| 6 | **Signatur: ehrliche Erinnerungs-Notiz** im Popup | Signaturen haben keine contractId → Karte fehlte | `629f2da5` |
| 7 | **Signatur: Datums-Widerspruch behoben** (echtes Ablaufdatum + „läuft ab") | „läuft heute ab" bei Datum in 7 Tagen | `41d79a9a` |
| 8 | **„?"-Hilfe-Popup** (`ReminderHelpModal`) | Prozess in einfachen Worten erklären | `db59863e` |
| 9 | **Einzelne Erinnerung entfernen (🗑)** (vormerken → Speichern, ↩ Rückgängig) | „zu viele für einen Termin" | `0564a83a` |
| 10 | **Härtung Löschen** (nur echte ObjectIds, keine Recurrence-Instanzen) | TÜV-Fund: virtuelle IDs → Löschen liefe ins Leere | `9e82eeb1` |
| 11 | **Free-User-Upsell** („keine Erinnerungs-Mails — upgraden", nur für free) | Free sah „✉️ automatisch", bekommt aber nie Mails | `999f0c5f` / `ef6d63b5` (Umbruch-Fix) |
| 12 | **Signaturen im Kalender gebündelt** (1 Eintrag statt 3) | Konsistenz mit Verträgen | `24525f49` |
| 13 | **Signatur-Popup listet Vorwarner auf** (per `?envelopeId`) | Volle Gleichheit mit Verträgen | `4e979ba3` |
| 14 | **Relative Zeit neutralisiert + „Sie"→„du"** | „verlängert sich heute" trotz 9 Tagen; einheitliche Ansprache | `8106407d` |

---

## 🔎 Geprüft, bewusst NICHT geändert (sensible Extraktions-Ebene)

- **Auto-Verlängerung & Kündigungs-Warnung:** Kein Bug. `calendarEvents.js:152–249` erzeugt gestaffelte Warnungen (Kündigungsfenster/„nur noch 7 Tage"/letzter Tag) — aber **nur wenn in der Zukunft** (`> now`). Verträge mit bereits **vergangenem** Kündigungsfenster zeigen daher nur „am Tag selbst" (korrekt — man kann nicht vor einem vergangenen Datum warnen).

## ⏸️ Offen / geparkt (nur notiert, nichts angefasst)

- **Mögliche Dublette** „Ende der festen Laufzeit" (z. B. 30.06.) + „Vertragsende" (01.07.) — quasi dasselbe, 1 Tag auseinander, beide voll erinnert. Extraktions-/Dedup-Thema. Workaround: User kann doppelte Vorwarner per 🗑 entfernen.
- **„Nur noch 7 Tage" als Frist-Name** liest sich relativ/komisch (Backend-Titel).
- **Optionaler Hinweis** „Kündigungsfrist bereits verstrichen" bei spät hochgeladenen Auto-Verlängerungs-Verträgen (Nice-to-have).
- **„Überblick"-Ansicht reaktivieren:** bräuchte Erinnerungs-Daten in der breiten Liste (z. B. pro-Vertrag-Fetch oder Backend-Feld „Reminder-Count pro Frist").

---

## 🚀 Deploy

- **Frontend:** `cd frontend && npx vercel --prod` (Vercel). Build-Check vorher: `npm run build` (tsc strict — `noUnusedLocals` ist AN!).
- **Backend:** `git push origin main` → Render deployt automatisch. Syntax-Check: `node --check <datei>`.
- Nach Backend-Deploy: Store-Cache (5 Min) bzw. Strg+Shift+R, damit Änderungen sichtbar werden.
