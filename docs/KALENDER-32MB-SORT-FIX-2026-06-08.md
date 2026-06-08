# Kalender-Stabilität: 32-MB-Sort-Bugs behoben (08.06.2026)

Kurz-Doku, was gemacht wurde und **wie du es selbst nachtesten kannst**.

---

## Das Problem (in einfach)

Verträge sind **groß** (kompletter Text + KI-Analyse, oft mehrere MB). Mehrere
Kalender-/Erinnerungs-Abfragen hängten beim **Sortieren** versehentlich das ganze
Vertrags-Dokument an jedes Event. Die Datenbank kann aber nur **32 MB auf einmal
sortieren** (MongoDB Atlas Flex, kein Disk-Fallback). Wurde das gesprengt → **Absturz**.

Folgen:
- **Der tägliche E-Mail-Job crashte** (am schweren Account schon bei 921 Events)
  → es gingen **keine Erinnerungs-Mails** mehr raus (lautlos!).
- Andere Abfragen (/upcoming, Dashboard) waren **fragil** — ein etwas größerer
  Vertrag und sie wären auch abgestürzt.
- Der **ICS-Kalender-Feed** lud volle Verträge in den Server-Speicher (kein
  Sort-Bug, aber Speicher-Risiko / mögliches OOM).

## Was gefixt wurde

| Stelle | Datei | Fix | Commit |
|---|---|---|---|
| E-Mail-Cron | `backend/services/calendarNotifier.js` | totes Vertrags-Anhängen entfernt | `25e4e65b` |
| `/upcoming` | `backend/routes/calendar.js` | nur `name` holen (Sub-Pipeline) | `261095b1` |
| Dashboard (2 Abfragen) | `backend/routes/dashboardNotifications.js` | Embed raus / nur kleine Felder | `ed1baed7` |
| ICS-Feed (2 Routen) | `backend/server.js`, `backend/routes/calendar.js` | nur `name`+`provider` holen | `5c2fa34b` |

**Wichtig:** Reine Backend-/Performance-Änderung. **Verhalten unverändert** — gleiche
Erinnerungen, gleiche E-Mails, gleiche Reihenfolge, gleiche ICS-Datei. Nur kein
Absturz/Speicher-Hunger mehr. Alles live (GitHub → Render).

**Lehre (für die Zukunft):** Einzelne große Felder „wegwerfen" reicht NICHT — ein
Vertrag hat viele große Felder. Lösung: das nie-genutzte Embed **ganz weglassen**
oder **nur die benötigten Felder** per Sub-Pipeline/Projection holen.

---

## So testest du es selbst (read-only, keine Mails, schreibt nichts)

Es gibt 4 Prüf-Skripte unter `backend/scripts/`. Sie verbinden sich **lesend** mit
der echten Datenbank, beweisen den Bug (ohne Fix) und dass der Fix wirkt (mit Fix).
Sie **senden keine E-Mails** und **ändern nichts**.

**Voraussetzung:** `backend/.env` mit `MONGO_URI` (hast du schon, läuft ja lokal).

### Einzeln (in einem Terminal im Projekt-Ordner):

```bash
node backend/scripts/smokeTestNotifierSort.js     # E-Mail-Cron
node backend/scripts/smokeTestUpcomingSort.js      # /upcoming
node backend/scripts/smokeTestDashboardSort.js     # Dashboard (2 Abfragen)
node backend/scripts/smokeTestIcsMemory.js         # ICS-Feed (Speicher)
```

### Alle auf einmal (PowerShell):

```powershell
node backend/scripts/smokeTestNotifierSort.js; node backend/scripts/smokeTestUpcomingSort.js; node backend/scripts/smokeTestDashboardSort.js; node backend/scripts/smokeTestIcsMemory.js
```

### Was du sehen solltest (= alles gut):

- **Notifier:** `OHNE Fix : 💥 FEHLER = Bug reproduziert` (32-MB-Crash) und
  `MIT Fix : ✅ lief durch` → beweist Bug **und** Fix.
- **/upcoming:** `MIT Fix : ✅ … contractName erhalten: 10/10`.
- **Dashboard:** beide Abfragen `MIT Fix : ✅ … KEIN 32MB-Fehler` und deutlich
  schneller (z.B. 22ms statt 597ms), Daten `20/20` erhalten.
- **ICS:** `Ersparnis ~99.8 %` und `byte-identisch alt vs. neu: ✅ JA`.

Wenn irgendwo bei **MIT Fix** ein `❌` oder `💥` steht → bitte melden, dann stimmt
etwas nicht. Solange **MIT Fix** überall `✅` zeigt, ist alles in Ordnung.

> Hinweis: Der „OHNE Fix 💥" bei Notifier ist **gewollt** — er beweist, dass der
> Bug ohne den Fix real auftritt. Der echte Live-Code nutzt natürlich den Fix.

---

## Live-Verifikation (optional, ohne Skript)

Der E-Mail-Cron läuft täglich um **08:00**. Nach dem Deploy kannst du in den
**Render-Logs** prüfen, dass der Lauf ohne den Fehler
`Sort exceeded memory limit of 33554432 bytes` durchläuft.
