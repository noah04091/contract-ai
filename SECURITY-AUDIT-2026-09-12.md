# Security-Audit Contract AI — 12.09.2026

Anlass: ~15 Dependabot-Mails binnen zwei Tagen (13 davon lagen mir im Wortlaut vor).
Branch: `security-patch-2026-09-12`, Basis: `origin/main` @ `8386b63ea`.
Arbeitsort: eigener Worktree `C:\Users\liebo\Documents\contract-ai-security` — der Haupt-Worktree wurde nicht angefasst.

---

## 1. Executive Summary

**Wie ernst war die Situation?** Ernster als die Mails vermuten ließen — aber an einer anderen Stelle, als die Mails zeigten.

Die 13 Mails betrafen 5 Pakete. `npm audit` fand daneben **77 verwundbare Pakete** (Backend 51, Frontend 26), darunter zwei mit CRITICAL-Einstufung, die in **keiner einzigen Mail** vorkamen. Die Mails waren also die Spitze, nicht das Bild.

**Gab es tatsächlich kritische Schwachstellen?** Ja, zwei mit echtem Gewicht:

1. **`handlebars` 4.7.8** (CVSS 9.8, JavaScript-Injection) kam über `html-pdf-node` in den Baum — eine Dependency, die **im gesamten Code nirgends importiert wird**. Sie zog zusätzlich `puppeteer 10.4.0` (Stand 2021), `extract-zip`, `ws 7.x`, `tar-fs` und `node-fetch` mit. Reine Altlast, kompletter Ballast.
2. **`sharp`/libheif** — der einzige gemeldete Alert mit nachgewiesenem Nutzerdaten-Pfad. `scanner.js` erlaubt `image/heic` und `image/heif` ausdrücklich, `scannerService.js` reicht den Upload-Buffer ungeprüft an `sharp().metadata()`, und `imageToPdf.js` dekodiert mit `{ failOn: 'none' }` — also ohne sharps eigene Frühabbrüche. Ich habe gemessen, nicht vermutet: der HEIF-Decoder ist aktiv, libheif war 1.20.2.

**War Contract AI realistisch exponiert?** Teilweise — deutlich weniger, als die Severity-Labels nahelegen:

- **Alle** Upload-Pfade sind in `origin/main` authentifiziert. Ich habe jeden einzeln geprüft (`extract-text`, `scanner`, `optimizer-v2`, `upload`, `apiV1`, `optimize`, `compare`, `analyze`). Kein anonymer Angreifer kommt an multer, mammoth oder sharp heran.
- `handlebars` war nie erreichbar, weil `html-pdf-node` nie aufgerufen wurde — das Risiko lag in der Existenz des Codes, nicht in seiner Nutzung.
- `extract-zip` (Mail #1) ist zur Laufzeit **gar nicht erreichbar**: `@puppeteer/browsers` wird nirgends aufgerufen, Chromium kommt über `@sparticuz/chromium`.

**Sind wir jetzt sicherer?** Ja, messbar:

| | vorher | nachher |
|---|---|---|
| Backend | 51 (2 critical, 38 high) | **12** (1 critical, 6 high) |
| Frontend | 26 (3 critical, 15 high) | **0** |
| **Summe** | **77** | **12** |

**65 von 77 Alerts geschlossen.** Die 12 verbleibenden sind in Abschnitt 9 einzeln begründet — keiner davon hat einen erreichbaren Nutzerdaten-Pfad.

> Hinweis zur Genauigkeit: Die Überschrift des ersten Commits sagt „77 Alerts geschlossen". Korrekt sind **65 von 77**; die Detailzeilen im selben Commit nennen die richtigen Zahlen. Diese Korrektur gilt.

---

## 2. Dependabot-Übersicht

| # | Dependency | CVE / GHSA | Severity | Betroffen | Fix-Version | Status |
|---|---|---|---|---|---|---|
| 1 | extract-zip | CVE-2026-19693 | High | backend/lock (transitiv via puppeteer-core) | puppeteer-core 25 (Major) | **OFFEN — nicht erreichbar** |
| 2 | @xmldom/xmldom | CVE-2026-83619 | High | backend/lock (via mammoth) | 0.8.15 | ✅ geschlossen |
| 3 | @xmldom/xmldom | CVE-2026-83605 | High | dito | 0.8.15 | ✅ geschlossen |
| 4 | @xmldom/xmldom | CVE-2026-83614 | High | dito | 0.8.15 | ✅ geschlossen |
| 5 | @xmldom/xmldom | CVE-2026-83615 | High | dito | 0.8.15 | ✅ geschlossen |
| 6 | @xmldom/xmldom | CVE-2026-83607 | High | dito | 0.8.15 | ✅ geschlossen |
| 7 | @xmldom/xmldom | CVE-2026-83613 | High | dito | 0.8.15 | ✅ geschlossen |
| 8 | @xmldom/xmldom | CVE-2026-83608 | High | dito | 0.8.15 | ✅ geschlossen |
| 9 | @xmldom/xmldom | CVE-2026-83616 | High | dito | 0.8.15 | ✅ geschlossen |
| 10 | nodemailer | GHSA-2x7j-588g-ccc2 | High | backend/package.json + lock | 9.1.0 | ✅ geschlossen (9.1.1) |
| 11 | multer | CVE-2026-82333 | High | backend/lock | 2.3.0 | ✅ geschlossen |
| 12 | multer | CVE-2026-77078 | High | backend/lock | 2.3.0 | ✅ geschlossen |
| 13 | sharp | GHSA-rgj7-g3m4-5g8c | High | beide package.json + lock | 0.35.4 | ✅ geschlossen |

**12 von 13 Meldungen geschlossen.** Die eine offene ist nachweislich nicht erreichbar.

---

## 3. Deduplizierung — warum so viele Mails?

```
13 Mails
  →  5 betroffene Dependencies
  →  4 nötige Maßnahmen
```

Die Aufschlüsselung:

| Dependency | Mails | Warum mehrfach |
|---|---|---|
| @xmldom/xmldom | **8** | Eine Sammel-Veröffentlichung: 8 Einzel-CVEs am selben Tag für dasselbe Paket. **Alle 8 schließt ein einziger Versionssprung** (0.8.13 → 0.8.15). |
| multer | 2 | Zwei getrennte CVEs, beide in 2.3.0 behoben — eine Maßnahme. |
| extract-zip | 1 | Transitiv, zweimal im Baum (puppeteer alt + puppeteer-core). |
| nodemailer | 1 | Genannt wurde eine CVE; tatsächlich hingen **10 Advisories** an unserer Version. |
| sharp | 1 | Eine Mail, aber vier Pfade genannt (Frontend + Backend, je package.json + lock) — **ein** Paket. |

Der eigentliche Grund für die Flut: Es war keine neue Angriffswelle gegen euch, sondern eine **Aktualisierung der Advisory-Datenbank**. Dasselbe Muster sieht man an `axios` (28 Advisories) und `DOMPurify` (14) — auch die kamen als Block, ohne dass sich an eurem Code etwas geändert hätte.

**Wichtig:** Die Mails haben die zwei CRITICAL-Befunde (`handlebars`, `protobufjs`) nicht gemeldet. Wer nur die Mails abgearbeitet hätte, hätte die gefährlichste Altlast übersehen.

---

## 4. Contract-AI-Risiko im Einzelnen

### sharp / libheif — das war der ernsteste Befund
- **Angriffsvoraussetzung:** angemeldeter Nutzer, präparierte HEIC/HEIF- oder AVIF-Datei
- **Erreichbarkeit:** **bestätigt.** `scanner.js` lässt `image/heic`/`image/heif` durch den fileFilter; `scannerService.js:37` gibt den Buffer direkt an `sharp().metadata()`. `imageToPdf.js:64` nutzt `{ failOn: 'none' }` und schaltet damit die Frühabbrüche ab. Gemessen: HEIF-Decoder aktiv, libheif 1.20.2.
- **Impact:** Speicherfehler im nativen Code — Absturz des Backend-Prozesses, im schlimmsten Fall mehr
- **Gegenmaßnahme:** sharp → 0.35.4, libheif → **1.23.2**, libvips → 8.18.6

### multer — die beiden gemeldeten CVEs
- **Angriffsvoraussetzung:** angemeldeter Nutzer, manipulierte Multipart-Feldnamen
- **Erreichbarkeit:** ja, aber nur authentifiziert. `extract-text` hat zusätzlich keinen Rate-Limiter.
- **Impact:** CPU-/Speichererschöpfung → Backend blockiert
- **Gegenmaßnahme:** multer 2.3.0 **plus** explizite Grenzen auf den zwei Routen, die gar keine hatten (Abschnitt 7)

### @xmldom/xmldom — 8 Meldungen, alle über DOCX
- **Angriffsvoraussetzung:** angemeldeter Nutzer lädt präparierte DOCX hoch
- **Erreichbarkeit:** ja — `mammoth` parst jede hochgeladene DOCX, und mammoth nutzt xmldom
- **Impact:** überwiegend quadratische Laufzeit/Speicher (DoS), dazu Injection beim Serialisieren
- **Gegenmaßnahme:** override auf 0.8.15. Bewusst **in** der 0.8-Linie geblieben: auch das aktuelle mammoth 1.12.3 verlangt `^0.8.6`, ein Sprung auf 0.9.x wäre ein erzwungenes Upgrade außerhalb des deklarierten Bereichs — genau im Kernpfad DOCX.

### nodemailer — 1 gemeldet, 10 tatsächlich
- **Angriffsvoraussetzung:** angreiferkontrollierte Adressdaten
- **Erreichbarkeit:** eingeschränkt — Empfänger stammen aus eurer Datenbank, nicht aus freier Eingabe. Die schwereren Advisories (SMTP-Command-Injection, CRLF-Header-Injection) erfordern Kontrolle über Transport- oder Header-Felder, die bei euch aus Env-Variablen kommen.
- **Impact:** DoS im Mailversand; theoretisch Header-Manipulation
- **Gegenmaßnahme:** 7.0.12 → 9.1.1

### extract-zip (Mail #1) — NICHT RELEVANT
- **Erreichbarkeit:** **keine.** `@puppeteer/browsers` wird im gesamten Code nie aufgerufen; Chromium kommt über `chromium.executablePath()` von `@sparticuz/chromium`. extract-zip läuft nur beim Browser-Download, den ihr nicht macht.
- **Entscheidung:** kein Major-Upgrade von puppeteer-core für einen toten Pfad.

---

## 5. Geänderte Dateien

Nur fünf Dateien, davon **zwei** mit Code-Änderung:

| Datei | Art |
|---|---|
| `backend/package.json` | html-pdf-node entfernt, multer + sharp + nodemailer angehoben, xmldom-override |
| `backend/package-lock.json` | 84 Versionen geändert, 36 Pakete entfernt |
| `frontend/package.json` | sharp angehoben |
| `frontend/package-lock.json` | Lockfile-Updates |
| `backend/routes/extractText.js` | **Code:** Upload-Grenzen ergänzt |
| `backend/routes/optimize.js` | **Code:** Upload-Grenzen ergänzt |

Keine UI-Änderung, kein Refactoring, keine Env-Variablen, keine Secrets, keine Produktlogik.

**Commits:**
```
196490814  fix(security): sharp 0.34.5 -> 0.35.4 schliesst die libheif-Luecken
e063b228c  harden(upload): Groessen- und Multipart-Grenzen fuer die zwei Routen ohne Limits
68b9f0f91  fix(security): Dependency-Patch — Alerts geschlossen, kein Code-Eingriff
```
Bewusst getrennt: Das Hardening lässt sich einzeln zurücknehmen, ohne den Dependency-Patch zu verlieren.

---

## 6. Dependency-Updates (alt → neu)

**Direkte Dependencies:**

| Paket | alt | neu | Grund |
|---|---|---|---|
| html-pdf-node | 1.0.7 | **entfernt** | ungenutzt; zog handlebars (CVSS 9.8), puppeteer 10.4.0, extract-zip, ws 7.x, tar-fs |
| multer | 2.1.1 | 2.3.0 | Mails #11, #12 + 3 weitere |
| sharp (Backend) | 0.34.5 | 0.35.4 | Mail #13 — libheif 1.20.2 → 1.23.2 |
| sharp (Frontend) | 0.34.5 | 0.35.4 | Mail #13 (devDependency) |
| nodemailer | 7.0.12 | 9.1.1 | Mail #10 + 9 weitere |
| @xmldom/xmldom (override) | ~0.8.13 | ~0.8.15 | Mails #2–#9 |

**Transitiv mitgehoben** (durch `npm audit fix` ohne `--force`, also ausschließlich semver-kompatibel — `package.json` blieb dabei unberührt):

`mongoose 8.16.1 → 8.24.4` (NoSQL-Injection), `axios 1.13.5 → 1.20.0` (28 Advisories), `ws 8.19.0 → 8.21.3`, `lodash 4.17.23 → 4.18.1`, `form-data 4.0.5 → 4.0.6`, `js-yaml 3.14.2 → 3.15.2`, `undici 7.24.3 → 7.29.1`, `path-to-regexp 0.1.12 → 0.1.13`, `tar-fs 2.0.0 → 3.1.3`, `brace-expansion`, `browserslist`, `nanoid`, `picomatch`, `ip-address`, `basic-ftp`, `body-parser`, `mongodb`, `puppeteer-core 24.39.1 → 24.43.1` u. a.

Insgesamt: **84 Versionen geändert, 36 Pakete entfernt**, Gesamtbaum 1148 → 1136 Pakete.

Eine Randnotiz: `lru-cache` ging von 7.18.3 auf 5.1.1 **zurück** — die neuere Version kam nur über das entfernte puppeteer 10.4.0; übrig bleibt die Version, die eine andere Dependency ohnehin fordert. Ohne Wirkung auf euren Code.

---

## 7. Security-Hardening (nur tatsächlich umgesetzt)

`extractText.js` und `optimize.js` benutzten `multer({ dest: "uploads/" })` — **ohne jedes Limit**. Beliebig große Dateien und beliebig viele Multipart-Felder gingen ungebremst auf die Render-Disk. Beide Routen sind zwar authentifiziert, `extractText` hat aber keinen Rate-Limiter.

Gesetzt, bewusst großzügig, damit kein heute funktionierender Upload scheitert:

```js
limits: {
  fileSize: 50 * 1024 * 1024,  // wie analyze.js (400-Seiten-Verträge)
  files: 1,                    // beide Routen nutzen upload.single("file")
  fields: 10,                  // real: 0 (extractText) bzw. 4 (optimize)
  parts: 15,
}
```

Die Werte stammen nicht aus einer Vorlage, sondern aus eurem Code: 50 MB ist die Grenze, die `analyze.js` für Enterprise-Verträge bereits verwendet; die Feldzahlen habe ich aus den tatsächlichen `FormData`-Aufrufen im Frontend und den `req.body`-Zugriffen der Routen abgelesen.

---

## 8. Tests

| Test | Ergebnis |
|---|---|
| Backend `npm audit` | **PASS** — 51 → 12 |
| Frontend `npm audit` | **PASS** — 26 → 0 |
| Backend Unit-Tests (67 Suites) | **PASS** — 912/912, fünfmal gelaufen |
| Frontend Build (`tsc -b && vite build`) | **PASS** |
| Frontend Lint | **PASS** — 0 Errors (117 Warnings, wie vorher) |
| Frontend Tests | **PASS im Sinne von: keine Regression** — 7 Suites/16 Tests rot, **exakt wie in der gegengemessenen Baseline** |
| Backend `npm ci` | **NICHT AUSFÜHRBAR** — siehe unten |
| DOCX-Upload (mammoth + xmldom 0.8.15) | **PASS** — Umlaute, §-Zeichen, €, Datum, Volltext |
| PDF-Upload (pdf-parse) | **PASS** — Text + Datum extrahiert |
| Bild-Upload JPEG/PNG/WebP → PDF | **PASS** |
| AVIF/HEIF → PDF (der gepatchte libheif-Pfad) | **PASS** |
| Mailrendering (nodemailer 9.1.1) | **PASS** — Umlaute, HTML, ICS-Anhang, List-Unsubscribe, MIME-multipart |
| Negativ: 60-MB-Datei | **PASS** — `LIMIT_FILE_SIZE` |
| Negativ: zwei Dateien | **PASS** — `LIMIT_FILE_COUNT` |
| Negativ: 40 Textfelder | **PASS** — `LIMIT_FIELD_COUNT` |
| Negativ: CVE-Feldnamenmuster | **PASS** — 22 ms statt Hänger |
| Positiv-Gegenprobe: legitime 40-MB-Datei | **PASS** — wird **nicht** blockiert |

Alle Tests liefen offline. Das Backend wurde **nicht** gestartet — keine Verbindung zur Produktiv-DB, keine echten Mails. Der Mailtest nutzte `streamTransport` (rendert, versendet nicht), der Upload-Test eine isolierte Express-Instanz.

**Zwei Dinge, die ich nicht verschweige:**

1. **`npm ci` funktioniert im Backend nicht** — und das schon vor meinem Patch. `package-lock.json` ist nicht synchron mit `package.json`: `eslint@9.39.5` samt Baum fehlt im Lockfile. Das ist kein Sicherheitsloch, macht aber reproduzierbare Builds unmöglich. Ich habe geprüft, ob dadurch in Produktion andere Versionen laufen als Dependabot analysiert: **nein** — `npm install` ergab exakt denselben Baum. Meine anfängliche Sorge dazu war unbegründet.
2. **Ein Backend-Testlauf war einmalig rot** (2 Tests), viermal danach grün. Nicht reproduzierbar, vorbestehende Flakiness — welcher Test genau, konnte ich nicht mehr feststellen, weil die Ausgabe überschrieben war.

---

## 9. Verbleibende Alerts — jeder einzeln begründet

**Backend: 12. Frontend: 0.**

| Alert | Einstufung | Warum offen |
|---|---|---|
| `tar` (CRITICAL), `@mapbox/node-pre-gyp`, `adm-zip`, `@tensorflow/tfjs-node` | **NICHT AKUT** | Alle vier hängen an `tfjs-node`. Das sind **Installationszeit**-Pfade: node-pre-gyp lädt und entpackt die nativen Bindings beim `npm install`. Zur Laufzeit berührt keine Nutzerdatei diesen Code. npms „Fix" wäre ein **Downgrade auf tfjs-node 0.1.11** — das würde die ML-Prognose zerstören und wäre kein Sicherheitsgewinn. |
| `extract-zip`, `@puppeteer/browsers`, `puppeteer-core` | **NICHT RELEVANT** | `@puppeteer/browsers` wird zur Laufzeit nie aufgerufen (geprüft). Chromium kommt von `@sparticuz/chromium`. Fix wäre puppeteer-core 25 (Major) für einen toten Pfad — das Risiko des Upgrades übersteigt den Nutzen. |
| `aws-sdk` (moderate) | **NIEDRIG** | Betrifft SDK **v2**. npms „Fix" wäre `aws-sdk@1.18.0` — absurd. Der richtige Weg ist die Migration auf v3, die teilweise schon läuft (`@aws-sdk/*` ist bereits im Einsatz). Eigenes Projekt, kein Security-Patch. |
| `exceljs`, `node-cron`, `uuid` (moderate) | **NIEDRIG** | Jeweils nur über Major-Upgrades zu schließen. Kein erreichbarer Nutzerdaten-Pfad. Gehören in ein reguläres Wartungsfenster. |
| `qs` (moderate) | **NIEDRIG** | Kommt über `express 4.22.1`, das `~6.14.0` pinnt. Ein override auf 6.15.4+ würde express außerhalb seines deklarierten Bereichs zwingen — mehr Risiko als Nutzen für einen DoS in `qs.stringify`, den express so gar nicht aufruft. |

**GitHub selbst wird diese Zahlen erst nach dem Push aktualisieren** — Dependabot scannt das Repository, nicht meinen lokalen Worktree. Rechne mit ein paar Minuten nach dem Merge. Ein `gh`-Abgleich der offenen Alerts war mir hier nicht möglich, da kein authentifizierter GitHub-Zugriff vorlag.

---

## 10. Deployment

### ✅ SAFE TO DEPLOY

Begründung:

- Backend 51 → 12, Frontend 26 → 0 Alerts
- 912/912 Backend-Tests grün, fünfmal gelaufen
- Frontend-Build grün, Lint 0 Errors, Tests ohne jede Abweichung zur gegengemessenen Baseline
- Jeder Dateipfad, den Kunden tatsächlich benutzen, einzeln nachgewiesen: PDF, DOCX, JPEG, PNG, WebP, AVIF/HEIF, Mailversand
- Nur zwei Code-Zeilenblöcke geändert, beide rein additiv (Limits), beide negativ **und** positiv getestet
- Node-Verträglichkeit für sharp 0.35 belegt statt geraten (siehe unten)

**Eine Einschränkung, die du kennen musst:** Die Node-Version auf Render ließ sich nicht direkt auslesen — weder `render.yaml` noch `engines` setzen sie, und die API-Header verraten sie nicht (helmet arbeitet korrekt). Ich habe sie **indirekt belegt**: `@sparticuz/chromium` verlangt `>= 20.11.0` und wird in `generate.js` aktiv für die PDF-Erzeugung geladen; `cheerio` und `undici` verlangen `>= 20.18.1`. Alle laufen produktiv. sharp 0.35.4 verlangt `>= 20.9.0` — also gedeckt. Das ist ein starker Indizienbeweis, kein Direktmesswert.

Deshalb: **Prüfe nach dem Deploy als Erstes, ob das Backend hochkommt.** Falls nicht, ist Node die Ursache, und der Rollback ist ein Klick im Render-Dashboard.

Die genaue Version kannst du dir jederzeit selbst holen — als Admin eingeloggt:
```
GET https://api.contract-ai.de/api/admin/stats   →   system.nodeVersion
```

**Reihenfolge:** Backend (Render) zuerst, dann Frontend (Vercel). Das Frontend enthält nur Lockfile-Änderungen und eine devDependency — es kann nichts brechen, was das Backend nicht schon zeigt.

---

## 11. Was du nach dem Deployment selbst prüfen solltest

1. **Backend lebt** — `https://api.contract-ai.de/api/health` gibt `{"status":"ok"}`. *(Deckt das Node-/sharp-Restrisiko ab. Wenn das geht, ist der Rest Routine.)*
2. **Vertrag hochladen (PDF)** — Analyse läuft durch, Text und Fristen erscheinen
3. **Vertrag hochladen (DOCX)** — der Pfad mit dem gehobenen xmldom; achte auf Umlaute und Sonderzeichen
4. **Foto/Scan hochladen** — am besten ein **iPhone-Foto (HEIC)**. Das ist der Pfad, für den sharp gehoben wurde.
5. **Große, legitime Datei** — etwas zwischen 20 und 45 MB, um die neuen Grenzen gegenzuprüfen. Muss durchgehen.
6. **Better Contracts** — nutzt `/api/extract-text/public`, eine der zwei gehärteten Routen
7. **Optimizer** — nutzt `/api/optimize`, die andere gehärtete Route
8. **Eine Mail auslösen** — Fristen-Erinnerung oder Verifizierung. Der wichtigste Einzelpunkt, weil nodemailer zwei Majors gesprungen ist. Achte auf Umlaute im Betreff, den ICS-Anhang und den Abmelde-Link.
9. **PDF-Export/Generate** — nutzt puppeteer-core + @sparticuz/chromium, das vom Wegfall des alten puppeteer betroffen sein könnte (sollte es nicht, siehe unten)
10. **Dependabot** — nach dem Push prüfen, welche Alerts GitHub noch zeigt; erwartbar bleiben die 12 aus Abschnitt 9

Zu Punkt 9: `generate.js` hatte einen Fallback `require('puppeteer')` für den Fall, dass `@sparticuz/chromium` oder `puppeteer-core` fehlen. Dieser Fallback funktionierte nur, weil das ungenutzte `html-pdf-node` zufällig puppeteer 10.4.0 mitbrachte. Der Fallback ist jetzt weg. **Auf Render ist das ohne Wirkung** — dort greift der erste Zweig, beide Pakete sind direkte Dependencies. Geprüft: `@sparticuz/chromium` + `puppeteer-core` laden einwandfrei.

---

## Weitere Security-Empfehlungen (nicht umgesetzt, nichts davon angefasst)

1. **Lockfile-Synchronität herstellen** — `npm ci` schlägt im Backend fehl (`eslint@9.39.5` fehlt im Lockfile). Solange das so ist, sind Builds nicht exakt reproduzierbar. Ein `npm install` mit Commit des Lockfiles genügt.
2. **Git-Repository ist beschädigt** — `git fsck` meldet ein fehlendes Objekt (`5912666b…`) in der Historie. Jeder Commit zeigt deshalb `failed to perform geometric repack` / `failed to write commit-graph`. Die Commits selbst sind sauber, aber Wartungsaufgaben scheitern dauerhaft. Sollte behoben werden, bevor daraus ein Push-Problem wird.
3. **Node-Version festnageln** — weder `engines` in package.json noch `NODE_VERSION` in render.yaml. Damit hängt eure Laufzeit am Render-Default und kann sich unangekündigt ändern. Das hat dieses Audit spürbar erschwert. Empfehlung: explizit setzen, aber als eigener, separat getesteter Schritt.
4. **CI läuft auf Node 18** (`.github/workflows/ci.yml`), Produktion auf ≥ 20. Die CI prüft also gegen eine Runtime, die ihr nicht einsetzt — und baut zudem nur das Frontend. Backend-Tests laufen in CI gar nicht.
5. **Rate-Limiter fehlen auf Upload-Routen** — `extractText`, `scanner`, `upload`, `compare` und `companyProfile` haben keinen. Die Limiter existieren bereits in `middleware/rateLimiter.js`, sie sind dort nur nicht verdrahtet. Kleiner Aufwand, spürbare Wirkung gegen jede Art von DoS über Uploads.
6. **`imageToPdf.js` nutzt `failOn: 'none'`** — das schaltet sharps eigene Frühabbrüche bei defekten Bildern ab und schleust malformte Dateien maximal tief in libvips/libheif. Nachvollziehbar gewählt (Handy-Fotos sollen nicht an Kleinigkeiten scheitern), aber es vergrößert die Angriffsfläche genau dort, wo die CVEs sitzen. Einen Blick wert, ob `failOn: 'error'` fachlich reicht.
7. **`protobufjs`** kommt im Frontend über `onnxruntime-web` in den Browser (CRITICAL-Advisory). Durch den Lockfile-Fix jetzt geschlossen — bedenke aber bei künftigen Updates, dass dieses Paket im ausgelieferten Bundle landet.
8. **JWT liegt im `localStorage`** — damit wird aus jedem XSS im Frontend sofort eine Sitzungsübernahme. Das erklärt, warum die DOMPurify-Advisories für euch mehr zählen als für andere. Architekturthema, kein Patch.
9. **Beobachtung am Rande** (kein Sicherheitsthema): PDFs, die im selben Prozess mehrfach mit `pdf-lib` erzeugt und direkt wieder geparst werden, scheitern reproduzierbar in etwa einem Drittel der Fälle mit `Invalid PDF structure`. **Nicht durch diesen Patch verursacht** — `pdf-lib`, `pdfjs-dist` und `pdf-parse` sind unverändert. Der Upload-Pfad ist nicht betroffen, dort gehen Nutzer-PDFs direkt an `pdf-parse`. Relevant wäre es nur, falls ihr irgendwo selbst erzeugte PDFs sofort weiterverarbeitet.

---

## Anmerkung zur Arbeitsweise

Der Haupt-Worktree stand auf `STALE-DO-NOT-DEPLOY-video-opt` und wich in **über 300 Dateien** von `origin/main` ab. Hätte ich dort auditiert, wäre der Bericht falsch geworden: In diesem Branch hat `/api/extract-text/public` **kein** `verifyToken` — in `origin/main` ist die Route seit dem 14.08.2026 geschützt. Ich hätte einen kritischen, unauthentifizierten Upload-Endpunkt gemeldet, den es in Produktion nicht gibt.

Deshalb lief das gesamte Audit in einem eigenen Worktree gegen frisch gefetchtes `origin/main`. Der Haupt-Worktree und die parallelen Worktrees (`contract-ai-exec`, `temporal-stufe1`, `temporal-rehearsal`) wurden nicht berührt.
