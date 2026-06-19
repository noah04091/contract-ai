# Generate 2.0 — Plan & Fahrplan (lebendes Dokument)

**Letzte Aktualisierung:** 2026-06-19
**Status:** Audit abgeschlossen, grünes Licht → bereit für Schritt 2 (Backend-Endpoint)
**Eigentümer:** Noah Liebold (Contract AI) · umgesetzt mit Claude

---

## 0. Wie dieses Dokument zu nutzen ist (Resume-Anleitung)
Wenn das Terminal geschlossen wurde oder wir später weitermachen: **Dieses Dokument zuerst lesen.** Es enthält Ziel, gewählten Ansatz, alle Schritte mit Status, das verbindliche Prüf-Protokoll und alle Schlüssel-Fundstellen. Der nächste offene Schritt ist immer der erste mit Status ⬜ in Abschnitt 3.

Begleitende Memory-Dateien (Detailbefunde):
- `project_generate-v2-prototype-2026-06-18.md` (Prototyp + Architektur-Diagnose)
- `project_generate-v2-audit-2026-06-19.md` (Voll-Audit, Befunde, grünes Licht)

---

## 1. Ziel & Vision
Aus dem heutigen 30-Felder-Formular ein **„Beschreib es einfach"-Erlebnis** machen:
> Nutzer beschreibt seinen Vertrag in 2-3 Sätzen → KI erkennt den Typ + stellt ggf. kluge Rückfragen → **füllt das bestehende Formular vor** → Nutzer prüft/korrigiert → bestehende Generierung erzeugt den fertigen Vertrag.

**Qualitätsanspruch (verbindlich):** Backend, Frontend und alle Prozesse auf **Konzernniveau** — maximal zuverlässig, sicher, top-modern. Nichts Bestehendes darf negativ beeinflusst werden.

## 2. Gewählter Ansatz: „Die KI füllt euer Formular" (Philosophy A)
- **Wiederverwendung statt Neubau:** bestehende Generierung, Rendering (4 Design-Varianten), PDF, Limits, Persistenz bleiben **unverändert**.
- **Architektur-Kernentscheidung (aus Konzern-Review):** Der neue Endpoint fasst die Generierung **NICHT** an. Er macht nur `Brief → {typeId, formData}`. Die echte Erzeugung läuft danach durch den **unveränderten** `/generate`, wenn der Nutzer nach dem Review auf „Generieren" klickt. → **Kein Backend-Refactor nötig.**
- **Single Source of Truth:** Die 14 Vertragstypen + Felder leben weiter im Frontend (`CONTRACT_TYPES`); das Frontend schickt das Schema an den Endpoint mit → kein Drift, keine Duplizierung.
- **Modell:** Mapping/Erkennung über Claude (Sonnet 4.6 / Haiku — günstig). Die eigentliche Vertragsgenerierung bleibt vorerst wie sie ist (GPT-4o); Claude-vs-GPT-4o ist eine **separate, spätere A/B-Entscheidung**.

## 3. Status-Übersicht (Checkliste)
- ✅ **Schritt 0 — Prototyp** (konversationell, Claude Opus 4.8) — gebaut & getestet (`backend/scripts/generateV2Prototype.js`, `GenerateV2_Demo.pdf`).
- ✅ **Schritt 1 — Mapping-Test (standalone)** — KI füllt echtes Formular; an Freelancer **und** Mietvertrag verifiziert, inkl. Auto-Typ-Erkennung, keine Halluzination (`backend/scripts/generateV2FillForm.js`).
- ✅ **Audit** — Detektiv (3 Ermittler) → Konzern → Grün-Licht → TÜV. Ergebnis: grünes Licht, Befunde dokumentiert.
- ✅ **Schritt 2 — Backend-Endpoint** `POST /api/contracts/brief-to-form` — FERTIG & verifiziert.
  - Kern `backend/routes/briefToForm.js` (+ standalone `testBriefToForm.js`: 2 Typen, 99% Erkennung, TÜV-Asserts bestanden).
  - **Gemountet in `server.js`** (Z. ~866, direkt nach `/generate`, VOR den generischen `/api/contracts`-Mounts → kein Shadowing), in `try/catch` (Ladefehler crasht den Serverstart nicht), mit `verifyToken` am Mount + **eigenem IPv6-sicheren Rate-Limiter** (60/Std., gekapselt).
  - **HTTP-Integrationstest isoliert** (`testBriefToFormHttp.js`, Mini-Express, KEINE DB/Crons/Prod): **11/11 grün** — Erfolgsfall + beide Fallback-Pfade.
  - Syntax-Check `server.js` + `briefToForm.js` OK. **Nichts deployt — rein lokal, Produktion unberührt.**
- ✅ **Schritt 3 — Frontend-Modus** „✨ Einfach beschreiben" — IMPLEMENTIERT & build-verifiziert.
  - Mockups: `mockups/generate-v2-beschreiben-mockup.html` (v1) + `…-v2.html` (v2, Stripe/DocuSign-Niveau: lucide-Icons statt Emoji, edler Segmented-Control, leichter Inline-Stepper) — v2 vom User freigegeben.
  - In `frontend/src/pages/Generate.tsx` umgesetzt: 3 State-Vars (`briefMode/briefText/isBriefProcessing`), Handler `handleBriefSubmit` (POST `/api/contracts/brief-to-form` → `handleTypeSelect` → KI-`formData` nur nicht-leer drübergelegt → Step 2), Step-1-Umschalter + Beschreiben-Panel (inline-Styles, lucide-Icons; Icons `Lock/Briefcase/Home/Shield/ShoppingCart` ergänzt). Fehler/Fallback → Toast + klassischer Modus. Free-User geblockt.
  - **`npm run build` grün.** Nichts deployt — rein lokal, Produktion unberührt.
  - ⚠️ Echtes visuelles/Klick-Testen erst auf Preview-Deploy möglich (kein lokales Login). Optik via freigegebenem Mockup abgesichert; Logik build- + isoliert-getestet.
- ⬜ **Schritt 4 — End-to-End-Review** im echten Produkt (mehrere Vertragstypen, Optik, PDF).
- ⬜ **Schritt 5 (separat/optional)** — (a) ID-Mismatch-Fix (darlehensvertrag/gesellschaftsvertrag/pachtvertrag → V2), (b) Modell-A/B Claude vs GPT-4o.
- ⬜ **Go-Live-Gate** — TÜV-Must-Dos erfüllt (siehe Abschnitt 6), dann Deploy (GitHub → Render → Vercel).

## 4. Die Schritte im Detail
### Schritt 2 — Backend-Endpoint `/brief-to-form`
- **Was:** zustandsloser Endpoint. Input: `{ brief, contractTypes: [{id,name,description,fields}] }`. Output: `{ typeId, formData, confidence, missingRequired[] }`.
- **Wie:** Claude structured output. `typeId` als enum der mitgeschickten Frontend-IDs. Auswahlfelder als enum der mitgeschickten Optionen. Faktische Felder nur aus dem Brief (sonst leer — keine Erfindung).
- **Sicherheit:** `verifyToken`; leichtes **Rate-Limit**; **sauberer Fehler-Fallback** (bei Claude-Ausfall klare Fehlermeldung → Frontend fällt auf normales Formular zurück). Verbraucht **keine** Generierungs-Quote.
- **Verifikation:** komplettes Prüf-Protokoll (Abschnitt 5) + Standalone-Test, BEVOR es ins `server.js` gemountet/ans Frontend angebunden wird.

### Schritt 3 — Frontend-Modus
- **Einstieg:** Step-1-Toggle „📋 Formular ausfüllen | ✨ Einfach beschreiben".
- **Handler:** ruft `/brief-to-form` → `setSelectedType(detectedType)` → `setFormData(aiFormData)` → `setCurrentStep(2)` → `initializeAccordion`. (3 neue State-Variablen.)
- **Review:** Nutzer sieht vorausgefülltes Formular, korrigiert, klickt bestehenden „Generieren"-Button → unveränderte Pipeline.
- **Optik:** top-modern, passend zum bestehenden Stil.

## 5. Verbindliches Prüf-Protokoll (gilt für JEDEN Code-Schritt)
Kein Schritt gilt als fertig ohne **alle** Stufen:
1. 🕵️ **Detektiv** — betroffene Stellen identifizieren & im Code verifizieren (file:line).
2. 🏢 **Konzern** — kritische Architektur-/Auswirkungs-Review: Bricht etwas? Seiteneffekte?
3. 🟢 **Grün-Licht** — explizites Go/No-Go mit Bedingungen.
4. 🔧 **TÜV** — adversariale Gegenprüfung + Tests (Standalone, dann Integration). Doppelt/dreifach.
5. Erst **nach** grünem TÜV: deployen — und auch dann nur additiv, umkehrbar (`git revert`, nie `reset --hard`).

## 6. TÜV — Must-Dos VOR Live-Schaltung an echte Nutzer
1. ✅ **ERLEDIGT IM CODE (pending Deploy):** Anthropic als Unterauftragnehmer ergänzt in **Datenschutz.tsx** (Abschnitt „KI-Verarbeitung (Anthropic Claude)", USA/SCC/kein Training), **AVV Anlage 3** (`generateAVV.js` → `AVV_Contract-AI_v1.0.pdf` neu, 8 S.) und **AGB.tsx** (7.3 Liste + 8.2 KI-Hinweis). Frontend-Build grün. Geht erst mit dem Deploy live.
2. 🛟 Sanfter Fallback aufs normale Formular bei Claude-Ausfall.
3. 🔑 `ANTHROPIC_API_KEY` in der Render-Umgebung setzen; `@anthropic-ai/sdk` ist bereits in `package.json`.
4. 🚦 Rate-Limit auf den neuen Endpoint aktiv.
5. ⚠️ **API-Key rotieren** — der aktuelle Key wurde im Chat geteilt → in der Anthropic-Console löschen + neuen erstellen.

## 7. Schlüssel-Fundstellen (für schnelles Wiedereinsteigen)
- `backend/routes/generate.js` — `POST /generate` (Z.2048), Limit-Check (Z.2081-2104), V2-Routing `V2_SUPPORTED_TYPES` (Z.2107), `PARTY_FIELD_MAP` (Z.2123), `formatContractToHTML` (Z.400), PDF-Route `/pdf` (Z.3401).
- `backend/routes/generateV2.js` — 2-Phasen-System + Self-Check + Validator.
- `backend/services/contractUsage.js` — `checkContractLimit` (Limits FREE=0, Business=10, Enterprise=∞).
- `backend/models/Contract.js` — Datenmodell (content, contractHTML, formData, designVariant, metadata …).
- `frontend/src/pages/Generate.tsx` — `CONTRACT_TYPES` (Z.103-3357, 14 Typen), State (Z.3519-3619), Submit (Z.4466-4504, liest `data.contractText`/`data.contractHTML`), Einstiegspunkt neuer Modus = Step 1 (Z.6113-6182).

## 8. Offene Befunde / Risiken
- 🔴 **Pre-existing-Bug:** `darlehensvertrag`/`gesellschaftsvertrag`/`pachtvertrag` (Frontend-IDs) fehlen in `V2_SUPPORTED_TYPES`/`PARTY_FIELD_MAP` (dort `darlehen`/`gesellschaft`/`pacht`) → fallen heute auf schwächeres V1. Nicht von uns; separater optionaler Fix (Schritt 5a).
- Bedingte Felder (`dependsOn`) — harmlos; Review-Schritt fängt alles ab.
- 🟠 **Pre-existing (TÜV-Fund 2b):** `backend/middleware/rateLimiter.js` nutzt `keyGenerator: req.user?.id || req.ip` → `express-rate-limit` wirft `ERR_ERL_KEY_GEN_IPV6` (IPv6-Nutzer könnten Limits umgehen). Betrifft ALLE dortigen Limiter, app-weit. Nicht von uns; unser Endpoint nutzt bewusst einen eigenen IPv6-sicheren Limiter. Separater optionaler Fix.

## 9. Artefakte (bereits vorhanden)
- `backend/scripts/generateV2Prototype.js` — konversationeller Prototyp (Opus 4.8).
- `backend/scripts/generateV2FillForm.js` — Mapping-Test (Schritt 1), 2 Typen.
- `GenerateV2_Demo.pdf` — Beispielergebnis.
- Render-/Vorschau-Helfer: `backend/scripts/renderPdf.mjs`, `shotPdf.mjs`.
