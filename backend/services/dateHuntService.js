/**
 * Date Hunt Service — universelle, evidence-validierte Datums-Extraktion
 *
 * Architektur-Linie (siehe memory/feedback_datum-extraktion-universalitaet.md):
 *   • GPT ist die einzige Quelle, kein Regex-Mismatch.
 *   • Wörter UND Zahlen UND Berechnungen werden erkannt.
 *   • Universal: keine geschlossenen Listen pro Vertragstyp.
 *   • Evidence-Pflicht: jedes Datum muss den Original-Satz zitieren.
 *   • Strikt (Option A): kein Datum lieber als ein erfundenes.
 *
 * Wird parallel zur Hauptanalyse aufgerufen (Promise.all in analyze.js).
 * Bei Fehler/Timeout: Fallback auf leeres Array — Hauptanalyse bleibt unberührt.
 */

const DATE_HUNT_TIMEOUT_MS = 75_000;
const DATE_HUNT_MODEL = 'gpt-4-turbo';
const MAX_DATES = 10;

// ─── Phase 3: Review-Pass (Anwalt + Assistentin Pattern) ──────────────────
// Stage B läuft sequenziell nach Stage A. Bekommt den vollen Vertragstext +
// die Funde von Stage A und prüft Klausel für Klausel, ob etwas übersehen wurde.
// Liefert NUR Zusätze. Eigener Validator-Pfad → Halluzinationen müssten ZWEI
// Validatoren passieren (praktisch unmöglich). Bei Fehler/Timeout: Stage A bleibt
// unangetastet (graceful degradation).
const REVIEW_PASS_ENABLED = true;
const REVIEW_PASS_TIMEOUT_MS = 60_000;
const REVIEW_PASS_MAX_TOKENS = 2000;
// Sanity-Cap, KEIN Steuer-Limit. 25 ist de facto unbegrenzt für reale Verträge —
// auch ein 50-seitiger Beratungsvertrag erreicht selten zweistellige Fristen-Zahlen.
// Der Evidence-Validator filtert die Wahrheit. Niemals als "Quote" im Prompt
// kommunizieren — das würde GPT zum Halluzinieren verleiten.
// (Architektur-Linie: memory/feedback_datum-extraktion-universalitaet.md, Punkt 0)
const MAX_FRIST_HINWEISE = 25;
const EVIDENCE_MIN_LEN = 8;
// 400 statt 250: Komplexe Regelungen mit zwei Sätzen (z.B. Kündigungsfrist
// "2 Wochen in den ersten 3 Monaten, danach 6 Monate zum Monatsende") brauchen
// realistisch ~280-320 Zeichen Vertragszitat. 250 hat den korrekten Frist-Hinweis
// im Factoring-Test verworfen und den Fallback aktiviert — der Fallback zeigte
// nur die halbe Wahrheit. 400 deckt diese Fälle ab, der Validator bleibt strikt.
const EVIDENCE_MAX_LEN = 400;

const SYSTEM_PROMPT = `Du bist ein juristischer Spezialist für Vertrags-Termine und -Fristen. Du hast genau zwei Aufgaben:

(1) Finde alle rechtlich relevanten DATUMS im Vertrag — konkrete Kalendertage, die in einen Mandanten-Kalender gehören.
(2) Finde alle wichtigen FRIST-REGELUNGEN im Vertrag — Fristen ohne konkretes Datum, aber wichtig zu wissen (Kündigungsfristen, Widerrufsfristen, Gewährleistungsfristen, Probezeiten, etc.).

Du arbeitest wie ein Anwalt, der seinem Mandanten Termine UND Fristen aufschreibt. Erfinde nichts. Halluziniere nicht. Zitiere immer wörtlich aus dem Vertrag.`;

// Phase 3: System-Prompt für Stage B (Review-Pass).
// Bewusst anderer Tonfall als Stage A — die Assistentin ist die Sicherheitsschicht,
// nicht der zweite Anwalt. Sie sucht nicht "etwas zu finden"; sie prüft, ob etwas
// fehlt. "Leer ist OK" ist die wichtigste Regel.
//
// WICHTIG: Das Wort "JSON" muss irgendwo in den messages stehen, weil wir
// response_format: json_object benutzen — sonst lehnt OpenAI den Call ab mit
// "messages must contain the word 'json'". Hier explizit am Ende erwähnt.
const REVIEW_SYSTEM_PROMPT = `Du bist eine erfahrene juristische Assistentin in einer Anwaltskanzlei. Der Anwalt hat einen Vertrag analysiert und Datums + Frist-Hinweise notiert. Deine einzige Aufgabe: prüfen, ob er etwas übersehen hat — und nur ZUSÄTZLICHE Funde liefern.

Strenge Prinzipien:
- Es ist OKAY und richtig, NICHTS zu finden. Wenn der Anwalt alles hat, liefere leere Arrays. Das ist kein Versagen.
- Erfinde nichts. Halluziniere nicht. Zitiere immer wörtlich aus dem Vertrag.
- Doppele nicht. Was schon in der Anwalts-Liste steht, ergänzt du NICHT noch einmal.
- Du bist die Sicherheitsschicht, kein zweiter Anwalt. Lieber leer als erfunden.

Antworte AUSSCHLIESSLICH mit korrekt formatiertem JSON. Keine Markdown-Blöcke, kein Text vor oder nach dem JSON.`;

function buildUserPrompt(contractText) {
  const today = new Date().toISOString().slice(0, 10);
  return `HEUTIGES DATUM (für Berechnungen): ${today}

DEINE AUFGABE:
Lies den kompletten Vertragstext sorgfältig durch und finde JEDES rechtlich relevante Datum.

ERKENNE ALLE DATUMS-FORMEN:
1. Zahlen-Format: "01.04.2026", "1.4.2026", "2026-04-01", "1. April 2026", "01/04/2026"
2. Wörter-Format: "erster April zweitausendsechsundzwanzig", "im April des Jahres 2026", "der dreißigste Juni"
3. Berechenbare: "6 Monate Probezeit ab Arbeitsbeginn", "Kündigungsfrist 3 Monate zum Quartalsende", "Mindestlaufzeit 24 Monate ab Vertragsbeginn"
4. Indirekte: "monatlich kündbar nach 6 Monaten", "Beginn am Monatsersten nach Vertragsschluss"

FÜR JEDES DATUM LIEFERST DU:
{
  "type": "<Datums-Typ, siehe Liste unten>",
  "date": "YYYY-MM-DD",
  "label": "<Kurzname für Kalender, max. 50 Zeichen>",
  "description": "<warum für Mandant wichtig, 1 Satz>",
  "calculated": true | false,
  "source": "<§ X / Seite Y / Klausel-Bezeichnung>",
  "evidence": "<EXAKTER Satzauszug aus dem Vertragstext, max. 120 Zeichen, MUSS wörtlich im Text vorkommen>"
}

DATUMS-TYPEN (wähle den passendsten):
start_date, end_date, cancellation_deadline, minimum_term_end, probation_end,
warranty_end, renewal_date, payment_due, notice_period_start, contract_signed,
service_start, insurance_coverage_end, trial_end, license_expiry,
price_guarantee_end, inspection_due, lease_end, option_deadline,
loan_end, interest_rate_change, delivery_date, other

REGELN — STRIKT:
1. NIEMALS Datum erfinden. Wenn du nichts im Text belegen kannst → das Datum WEGLASSEN.
2. evidence ist PFLICHT. Wenn du den Original-Satz nicht WÖRTLICH kopieren kannst → das Datum WEGLASSEN.

3. EVIDENCE-REGEL — KRITISCH (95 % aller Fehler entstehen hier):
   evidence muss ein ZUSAMMENHÄNGENDES Copy-Paste aus dem Vertragstext sein.
   Behalte Tippfehler, Umlaute (ae/oe/ue/ß), Sonderzeichen, Kommas — alles 1:1.

   DREI ABSOLUTE VERBOTE:
   (a) NIEMALS Wörter aus der MITTE eines Satzes auslassen.
       Wenn ein Satz lautet "A B C D E F", darfst du NICHT "A B C F" liefern —
       du darfst NUR "A B C", "A B C D", "A B C D E", oder "A B C D E F" liefern.
       Niemals Anfang + Ende zusammenkleben und die Mitte überspringen.
   (b) NIEMALS Synonyme oder eigene Formulierungen.
   (c) NIEMALS Umlaute oder Schreibweisen ändern (auch wenn du sie "schöner" findest).

   KONKRETES BEISPIEL — der Vertragstext lautet wörtlich:
   "Eine Mietanpassung ist fruehestens 15 Monate nach Mietbeginn oder nach der
   letzten Mieterhoehung moeglich."

   ✅ RICHTIG (kompletter Satz, 1:1):
      "Eine Mietanpassung ist fruehestens 15 Monate nach Mietbeginn oder nach der letzten Mieterhoehung moeglich"

   ✅ AUCH RICHTIG (nur Anfang, ohne Auslassungen):
      "Eine Mietanpassung ist fruehestens 15 Monate nach Mietbeginn"

   ❌ FALSCH — MITTE AUSGELASSEN (das ist eine Halluzination!):
      "Eine Mietanpassung ist fruehestens 15 Monate nach Mietbeginn moeglich"
                                                                    ↑
       "oder nach der letzten Mieterhoehung" wurde übersprungen —
       der Satz "...Mietbeginn moeglich" steht NICHT so im Vertrag!

   ❌ FALSCH — paraphrasiert:
      "Mietanpassung 15 Monate nach Mietbeginn"               ← umformuliert
      "frühestens 15 Monate nach Mietbeginn"                  ← Umlaut geändert
      "Frist von 15 Monaten ab Mietvertragsbeginn"            ← Synonym

   Faustregel: Wenn du deine evidence neben den Vertrag legst und mit dem Finger
   Wort für Wort mitliest, MUSS jedes Wort identisch sein. Sobald du auch nur
   ein Wort überspringen, ändern oder ersetzen würdest → das Datum WEGLASSEN.
   Der Backend-Validator akzeptiert keine Verkürzungen mit Lücken in der Mitte.

4. Bei Berechnungen: zeige in description die Rechnung (z.B. "Vertragsbeginn 01.04.2026 + 6 Monate Probezeit = 01.10.2026"). Die Rechnung gehört in description, NICHT in evidence — evidence bleibt das wörtliche Zitat.

5. STAFFELZAHLUNGEN — wenn der Vertrag eine KONKRETE ANZAHL gestaffelter Zahlungen
   nennt (z.B. "in 3 Raten", "in 6 Tranchen", "in 4 Quartalsraten", "in zwei Teilbeträgen"),
   extrahiere JEDE einzelne Rate als separates Datum mit type=payment_due.

   AUSLÖSER (alle drei müssen erfüllt sein):
   • Konkrete Zahl ist genannt (drei, vier, 5, sechs, ...)
   • Zeitlicher Rhythmus ist nennbar (monatlich, quartalsweise, halbjährlich, ...)
   • Startpunkt ist nennbar (bei Mietbeginn, ab Vertragsabschluss, ab Lieferung, ...)

   KONKRETES BEISPIEL — Vertragstext:
   "Die Kaution kann in drei gleichen monatlichen Raten gezahlt werden.
   Die erste Rate ist bei Mietbeginn faellig."
   Mit Mietbeginn = 01.04.2026 → drei Datums:
   - Rate 1: 01.04.2026 (calculated=false — Mietbeginn ist explizit)
   - Rate 2: 01.05.2026 (calculated=true)
   - Rate 3: 01.06.2026 (calculated=true)
   Alle drei mit derselben evidence: "Die Kaution kann in drei gleichen
   monatlichen Raten gezahlt werden"
   Label-Beispiele: "Kaution Rate 1 von 3", "Kaution Rate 2 von 3", "Kaution Rate 3 von 3"

   KEIN AUSLÖSER — laufende Standard-Zahlungen ohne feste Anzahl:
   "Die Miete ist bis zum 3. Werktag eines jeden Monats zu zahlen"
   → Das ist KEINE Staffelung. Extrahiere höchstens die NÄCHSTE Mietzahlung als
   payment_due — NICHT alle 24 oder 36 Monatsmieten ausschreiben! Sonst Kalender-Spam.

   KEIN AUSLÖSER — wenn nur "in mehreren Raten" ohne konkrete Anzahl steht:
   → Dann nur EIN Datum mit description "in mehreren Raten zahlbar".

6. Wörter-Datums ("dreißigster Juni") ins ISO-Format konvertieren (2026-06-30).
7. Maximal ${MAX_DATES} Datums — fokussiere auf die wichtigsten für den Mandanten.

═══════════════════════════════════════════════════════════════════════
ZWEITE AUFGABE — FRIST-HINWEISE
═══════════════════════════════════════════════════════════════════════

Neben konkreten Datums hat fast jeder Vertrag FRIST-REGELUNGEN, die KEIN konkretes
Datum sind, aber für den Mandanten wichtig zu wissen sind. Extrahiere sie ALLE.

Beispiele für solche Fristen-Regelungen (universal — wähle den passendsten Typ):
• kuendigungsfrist          — Frist zur Kündigung des Vertrags
• widerrufsfrist            — Verbraucher-Widerrufsrecht (oft 14 Tage)
• gewaehrleistungsfrist     — Mängelhaftung (oft 2 Jahre)
• verjaehrungsfrist         — Allgemeine Verjährung (oft 3 Jahre)
• probezeit                 — Probezeit bei Arbeitsverträgen
• maengelruegepflicht       — Pflicht zur unverzüglichen Mängelanzeige
• lieferfrist               — Fristen für Lieferungen / Leistungen
• annahmefrist              — Frist zur Annahme von Angeboten
• karenzentschaedigung      — bei Wettbewerbsverboten
• optionsfrist              — Optionen, Vorkaufsrechte
• reaktionsfrist            — z.B. 5 Werktage zur Stellungnahme, 90 Tage Inkasso
• wartungsfrist             — TÜV, Wartung, Inspektion
• anpassungsfrist           — Preis-, Konditions-Anpassungen
• zahlungsfrist             — Zahlungsfristen ohne konkretes Datum
• ruegefrist                — Rügefrist
• einwendungsfrist          — Frist für Einwendungen
• sperrfrist                — z.B. Mietanpassungssperrfrist
• sonstige                  — alles andere, was als Frist relevant ist

FÜR JEDEN FRIST-HINWEIS LIEFERST DU:
{
  "type": "<Frist-Typ>",
  "title": "<Kurz-Hinweis, max. 80 Zeichen — z.B. 'Kündigungsfrist 6 Monate zum Monatsende'>",
  "description": "<1-2 Sätze warum es für den Mandanten wichtig ist>",
  "legalBasis": "<§/Abschnitt im Vertrag, z.B. '§ 8 Kündigung'>",
  "evidence": "<EXAKTER Satzauszug aus dem Vertragstext, max. 250 Zeichen, MUSS wörtlich im Text vorkommen>"
}

REGELN FÜR FRIST-HINWEISE — gleiche Disziplin wie für Datums:
8. Evidence-Pflicht: jede Frist muss durch wörtliches Vertragszitat belegt sein.
   Die EVIDENCE-REGEL aus Punkt 3 gilt 1:1 — keine Mitten-Auslassung, keine Paraphrasen,
   keine Synonym-Ersetzung, kein Umlaut-Tausch. Wörtlich oder gar nicht.
9. Niemals erfinden: wenn keine entsprechende Frist im Vertrag steht, fristHinweise = [].
10. Nicht doppeln: dieselbe Frist nur EINMAL extrahieren, auch wenn sie mehrfach erwähnt wird.
11. Der Vertrag bestimmt die Menge — manche Verträge haben gar keine Frist-Regelungen,
    andere 10–15. Erfinde keine, wenn der Vertrag wenige hat. Übersiehe aber auch keine,
    die wirklich da steht und belegbar ist. Der Backend-Validator entfernt automatisch
    jede Frist, deren evidence du nicht wörtlich aus dem Vertrag zitieren kannst —
    du musst dich nicht selbst zensieren, der Validator macht das.
12. Wenn aus einer Frist ein konkretes Datum berechenbar ist, gehört das Datum in importantDates.
    Der Frist-Hinweis bleibt zusätzlich, weil er die Regel beschreibt — er ist kein Termin.

KONKRETES BEISPIEL — Vertragstext enthält:
   "Das Mietverhaeltnis kann vom Mieter mit einer Frist von 3 Monaten zum Monatsende gekuendigt werden."

   ✅ RICHTIGER Frist-Hinweis-Eintrag:
   {
     "type": "kuendigungsfrist",
     "title": "Kündigungsfrist 3 Monate zum Monatsende",
     "description": "Wenn du den Vertrag beenden möchtest, plane diese Frist rechtzeitig ein. Eine Kündigung muss 3 Monate vor dem gewünschten Endtermin beim Vermieter eingehen.",
     "legalBasis": "§ 8 Kündigung",
     "evidence": "Das Mietverhaeltnis kann vom Mieter mit einer Frist von 3 Monaten zum Monatsende gekuendigt werden"
   }

═══════════════════════════════════════════════════════════════════════
13. Antworte AUSSCHLIESSLICH mit dem unten definierten JSON.

OUTPUT-FORMAT (beide Felder PFLICHT, jeweils mindestens leeres Array):
{
  "importantDates": [<konkrete Datums, oder [] wenn keine im Vertrag>],
  "fristHinweise":  [<Frist-Hinweise, oder [] wenn keine im Vertrag>]
}

VERTRAGSTEXT:
${contractText}`;
}

/**
 * Phase 3: User-Prompt für den Review-Pass (Stage B).
 * Bekommt den Vertragstext + die Stage-A-Funde als Kontext, fragt explizit
 * nach ZUSÄTZLICHEN Funden. "Leer ist OK" wird mehrfach betont, damit GPT
 * keinen Druck verspürt, künstlich was zu finden.
 */
function buildReviewPrompt(contractText, stageAResults) {
  const datesAlreadyFound = (stageAResults.importantDates || []).length > 0
    ? stageAResults.importantDates.map(d =>
        `- ${d.label} (${d.date}, type=${d.type})`
      ).join('\n')
    : '(keine — der Anwalt hat keine Datums notiert)';

  const fristenAlreadyFound = (stageAResults.fristHinweise || []).length > 0
    ? stageAResults.fristHinweise.map(f =>
        `- ${f.title} (type=${f.type}${f.legalBasis ? ', ' + f.legalBasis : ''})`
      ).join('\n')
    : '(keine — der Anwalt hat keine Frist-Hinweise notiert)';

  return `Der Anwalt hat den unten stehenden Vertrag bereits analysiert. Hier ist seine Notiz:

═══════════════════════════════════════════════════════════════════════
ANWALTS-NOTIZ — was bereits gefunden wurde
═══════════════════════════════════════════════════════════════════════

DATUMS:
${datesAlreadyFound}

FRIST-HINWEISE:
${fristenAlreadyFound}

═══════════════════════════════════════════════════════════════════════
DEINE AUFGABE
═══════════════════════════════════════════════════════════════════════

Lies den Vertrag JEDE KLAUSEL einzeln durch und prüfe: hat der Anwalt etwas übersehen?

Liefere AUSSCHLIESSLICH zusätzliche Funde, die noch nicht in der Liste oben stehen.
NICHT noch einmal erwähnen, was der Anwalt schon hat.

═══════════════════════════════════════════════════════════════════════
WICHTIGSTE REGEL
═══════════════════════════════════════════════════════════════════════

Es ist OKAY und richtig, NICHTS zu finden. Wenn der Anwalt alles erfasst hat,
liefere leere Arrays. Das ist die richtige Antwort, KEIN Versagen.

Du bist NICHT da, um Lücken auf Teufel komm raus zu finden. Du bist die zweite
Sicherheitsschicht, die nur dann Funde liefert, wenn sie WIRKLICH belegbar sind.

═══════════════════════════════════════════════════════════════════════
REGELN — STRIKT
═══════════════════════════════════════════════════════════════════════

1. Erfinde NICHTS. Jeder neue Eintrag muss durch wörtliches Vertragszitat (evidence)
   belegt sein. Der Backend-Validator filtert automatisch jede Frist/Datum, deren
   evidence du nicht wörtlich aus dem Vertrag zitieren kannst.

2. Doppele NICHT. Wenn ein Datum oder eine Frist schon in der ANWALTS-NOTIZ steht
   (auch in anderer Formulierung), ergänze sie NICHT noch einmal.

3. Evidence-Regel — KRITISCH (gleiche Disziplin wie der Anwalt):
   • evidence muss ein ZUSAMMENHÄNGENDES Copy-Paste aus dem Vertragstext sein
   • Behalte Tippfehler, Umlaute (ae/oe/ue/ß), Sonderzeichen — alles 1:1
   • NIEMALS Wörter aus der Mitte eines Satzes auslassen
   • NIEMALS Synonyme oder eigene Formulierungen
   • Wörtlich oder gar nicht — der Validator akzeptiert nichts Anderes

4. Häufig übersehen werden in komplexen Verträgen:
   • Reaktionsfristen (z.B. "5 Werktage zur Stellungnahme", "90 Tage Inkasso")
   • Einwendungsfristen (z.B. "6 Wochen nach Zugang")
   • Annahmefristen (z.B. "14 Tage gebunden")
   • Bestätigungsfristen (z.B. "10 Tage zur Bestätigung")
   • Mängelrügepflichten / Rügefristen
   • Optionsfristen / Vorkaufsrechte

   ABER: nur extrahieren wenn sie WIRKLICH im Vertrag stehen. NIEMALS erfinden.

═══════════════════════════════════════════════════════════════════════
OUTPUT-FORMAT (gleiches Schema wie der Anwalt — beide Felder PFLICHT)
═══════════════════════════════════════════════════════════════════════

{
  "importantDates": [<NUR zusätzliche Datums, sonst []>],
  "fristHinweise":  [<NUR zusätzliche Frist-Hinweise, sonst []>]
}

Datums-Schema:
{
  "type": "<Datums-Typ>",
  "date": "YYYY-MM-DD",
  "label": "<Kurzname, max. 50 Zeichen>",
  "description": "<warum für Mandant wichtig, 1 Satz>",
  "calculated": true | false,
  "source": "<§ X / Klausel-Bezeichnung>",
  "evidence": "<EXAKTER Satzauszug, max. 120 Zeichen, wörtlich>"
}

Frist-Hinweis-Schema:
{
  "type": "<Frist-Typ: kuendigungsfrist, widerrufsfrist, reaktionsfrist, einwendungsfrist, annahmefrist, ruegefrist, optionsfrist, sonstige, ...>",
  "title": "<Kurz-Hinweis, max. 80 Zeichen>",
  "description": "<1-2 Sätze warum für Mandant wichtig>",
  "legalBasis": "<§/Abschnitt, z.B. '§ 9 Abs. 2'>",
  "evidence": "<EXAKTER Satzauszug, max. 250 Zeichen, wörtlich>"
}

═══════════════════════════════════════════════════════════════════════
VERTRAGSTEXT
═══════════════════════════════════════════════════════════════════════

${contractText}`;
}

/**
 * Normalisiert einen String für Evidence-Vergleich.
 * Toleriert: Case, Whitespace, Umlaut-Varianten (ä/ae, ö/oe, ü/ue, ß/ss),
 * typografische Anführungszeichen, em-/en-dashes — alles, was bei OCR/PDF-
 * Konvertierung legitim variieren kann. Bewusst NICHT toleriert: Paraphrasen,
 * Synonyme, hinzugefügte/entfernte Wörter — Halluzinationen müssen weiter scheitern.
 */
function normalize(s) {
  return s
    .toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[‘’‚‛′]/g, "'")
    .replace(/[“”„‟″]/g, '"')
    .replace(/[‐-―]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Validiert ein einzelnes Datum strikt.
 * Returns { valid: boolean, reason?: string }.
 */
function validateDateEntry(entry, contractText) {
  if (!entry || typeof entry !== 'object') {
    return { valid: false, reason: 'not_an_object' };
  }
  if (!entry.date || typeof entry.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(entry.date)) {
    return { valid: false, reason: 'invalid_date_format' };
  }
  const parsed = new Date(entry.date);
  if (isNaN(parsed.getTime())) {
    return { valid: false, reason: 'unparseable_date' };
  }
  if (!entry.evidence || typeof entry.evidence !== 'string') {
    return { valid: false, reason: 'missing_evidence' };
  }
  const evidence = entry.evidence.trim();
  if (evidence.length < EVIDENCE_MIN_LEN || evidence.length > EVIDENCE_MAX_LEN) {
    return { valid: false, reason: `evidence_length_${evidence.length}` };
  }
  // Evidence muss wörtlich im Volltext vorkommen.
  const normEvidence = normalize(evidence);
  const normText = normalize(contractText);
  if (!normText.includes(normEvidence)) {
    return { valid: false, reason: 'evidence_not_in_text' };
  }
  if (!entry.type || typeof entry.type !== 'string') {
    return { valid: false, reason: 'missing_type' };
  }
  if (!entry.label || typeof entry.label !== 'string') {
    return { valid: false, reason: 'missing_label' };
  }
  return { valid: true };
}

/**
 * Validiert einen Frist-Hinweis strikt — gleiche Disziplin wie für Datums.
 * Evidence muss wörtlich im Vertragstext stehen, sonst fliegt der Hinweis raus.
 */
function validateFristHinweis(entry, contractText) {
  if (!entry || typeof entry !== 'object') {
    return { valid: false, reason: 'not_an_object' };
  }
  if (!entry.type || typeof entry.type !== 'string') {
    return { valid: false, reason: 'missing_type' };
  }
  if (!entry.title || typeof entry.title !== 'string' || entry.title.trim().length < 5) {
    return { valid: false, reason: 'missing_title' };
  }
  if (!entry.evidence || typeof entry.evidence !== 'string') {
    return { valid: false, reason: 'missing_evidence' };
  }
  const evidence = entry.evidence.trim();
  if (evidence.length < EVIDENCE_MIN_LEN || evidence.length > EVIDENCE_MAX_LEN) {
    return { valid: false, reason: `evidence_length_${evidence.length}` };
  }
  const normEvidence = normalize(evidence);
  const normText = normalize(contractText);
  if (!normText.includes(normEvidence)) {
    return { valid: false, reason: 'evidence_not_in_text' };
  }
  return { valid: true };
}

/**
 * Phase 3: Dedup-Logik für Datums-Merge.
 * Stage A gewinnt bei Konflikt — sie kam zuerst und ist die "Hauptquelle".
 * Dedup-Kriterium: gleicher type + gleiches Datum (YYYY-MM-DD).
 */
function dedupDates(stageA, stageB) {
  if (!Array.isArray(stageB) || stageB.length === 0) return stageA;
  const result = [...stageA];
  for (const b of stageB) {
    const isDup = stageA.some(a => a.type === b.type && a.date === b.date);
    if (!isDup) result.push(b);
  }
  return result;
}

/**
 * Phase 3: Dedup-Logik für Frist-Hinweise.
 * Stage A gewinnt bei Konflikt. Dedup-Kriterium: gleicher type UND
 * Evidence-Substring-Match (mindestens 40 Zeichen Overlap) — verhindert,
 * dass dieselbe Frist in leicht anderer Formulierung doppelt erscheint.
 */
function dedupFristen(stageA, stageB) {
  if (!Array.isArray(stageB) || stageB.length === 0) return stageA;
  const result = [...stageA];
  for (const b of stageB) {
    const bEvNorm = normalize(b.evidence || '');
    const isDup = stageA.some(a => {
      if (a.type !== b.type) return false;
      const aEvNorm = normalize(a.evidence || '');
      if (!aEvNorm || !bEvNorm) return false;
      // Substring-Overlap mindestens 40 Zeichen → wahrscheinlich gleiche Klausel
      const minOverlap = 40;
      if (aEvNorm.length >= minOverlap && bEvNorm.includes(aEvNorm.slice(0, minOverlap))) return true;
      if (bEvNorm.length >= minOverlap && aEvNorm.includes(bEvNorm.slice(0, minOverlap))) return true;
      return false;
    });
    if (!isDup) result.push(b);
  }
  return result;
}

/**
 * Phase 3: Review-Pass (Stage B — Anwalt-Assistentin-Pattern).
 * Wird sequenziell nach Stage A aufgerufen. Bekommt Vertragstext + Stage-A-Funde,
 * prüft Klausel für Klausel auf Übersehenes. Liefert NUR Zusätze.
 *
 * Eigener Validator-Pfad: validateDateEntry / validateFristHinweis laufen
 * 1:1 wie für Stage A — Halluzinationen müssen ZWEI Validatoren passieren,
 * was praktisch unmöglich ist.
 *
 * Bei Fehler/Timeout: graceful fallback (leere Arrays). Stage A bleibt aktiv.
 *
 * @returns {Promise<{importantDates: Array, fristHinweise: Array, stats: object}>}
 */
async function runReviewPass(contractText, stageAResults, openaiClient, requestId = '') {
  const startTime = Date.now();
  const stats = {
    raw_dates: 0,
    raw_fristen: 0,
    validated_dates: 0,
    validated_fristen: 0,
    rejected: 0,
    durationMs: 0,
    fallback: false,
    skipped: false
  };
  const empty = (s) => ({ importantDates: [], fristHinweise: [], stats: s });

  if (!REVIEW_PASS_ENABLED) {
    stats.skipped = true;
    return empty(stats);
  }
  if (!contractText || contractText.length < 100) {
    stats.skipped = true;
    return empty(stats);
  }

  let response;
  try {
    response = await Promise.race([
      openaiClient.chat.completions.create({
        model: DATE_HUNT_MODEL,
        temperature: 0,
        response_format: { type: 'json_object' },
        max_tokens: REVIEW_PASS_MAX_TOKENS,
        messages: [
          { role: 'system', content: REVIEW_SYSTEM_PROMPT },
          { role: 'user', content: buildReviewPrompt(contractText, stageAResults) }
        ]
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`Review-Pass timeout after ${REVIEW_PASS_TIMEOUT_MS}ms`)), REVIEW_PASS_TIMEOUT_MS)
      )
    ]);
  } catch (err) {
    console.warn(`⚠️ [${requestId}] [Review-Pass] Aufruf fehlgeschlagen: ${err.message} — Stage A bleibt aktiv`);
    stats.fallback = true;
    stats.durationMs = Date.now() - startTime;
    return empty(stats);
  }

  const raw = response?.choices?.[0]?.message?.content || '';
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    console.warn(`⚠️ [${requestId}] [Review-Pass] JSON-Parse fehlgeschlagen: ${err.message} — Stage A bleibt aktiv`);
    stats.fallback = true;
    stats.durationMs = Date.now() - startTime;
    return empty(stats);
  }

  // Datums validieren — gleicher Validator wie Stage A
  const dateCands = Array.isArray(parsed?.importantDates) ? parsed.importantDates : [];
  stats.raw_dates = dateCands.length;
  const validDates = [];
  for (const e of dateCands) {
    const v = validateDateEntry(e, contractText);
    if (v.valid) {
      validDates.push({
        type: e.type,
        date: e.date,
        label: e.label,
        description: e.description || e.label,
        calculated: !!e.calculated,
        source: e.source || '',
        evidence: e.evidence
      });
    } else {
      stats.rejected++;
      console.warn(
        `⚠️ [${requestId}] [Review-Pass] Datum verworfen (${v.reason}): ` +
        `type=${e.type} label="${e.label || '(leer)'}"`
      );
    }
  }
  stats.validated_dates = validDates.length;

  // Frist-Hinweise validieren
  const fristCands = Array.isArray(parsed?.fristHinweise) ? parsed.fristHinweise : [];
  stats.raw_fristen = fristCands.length;
  const validFristen = [];
  for (const e of fristCands) {
    const v = validateFristHinweis(e, contractText);
    if (v.valid) {
      validFristen.push({
        type: e.type,
        title: e.title,
        description: e.description || '',
        legalBasis: e.legalBasis || '',
        evidence: e.evidence
      });
    } else {
      stats.rejected++;
      console.warn(
        `⚠️ [${requestId}] [Review-Pass] Frist-Hinweis verworfen (${v.reason}): ` +
        `type=${e.type} title="${e.title || '(leer)'}"`
      );
    }
  }
  stats.validated_fristen = validFristen.length;
  stats.durationMs = Date.now() - startTime;

  console.log(
    `🔍 [${requestId}] [Review-Pass] zusätzliche Funde: ` +
    `Datums ${stats.raw_dates}→${stats.validated_dates}, ` +
    `Fristen ${stats.raw_fristen}→${stats.validated_fristen} ` +
    `(${stats.rejected} abgelehnt) in ${stats.durationMs}ms`
  );

  return { importantDates: validDates, fristHinweise: validFristen, stats };
}

/**
 * Hauptfunktion: Date Hunt.
 *
 * @param {string} contractText - Vertragsvolltext
 * @param {object} openaiClient - OpenAI-Instanz
 * @param {string} requestId - für Logging
 * @returns {Promise<{importantDates: Array, fristHinweise: Array, stats: object}>}
 */
async function huntDates(contractText, openaiClient, requestId = '') {
  const startTime = Date.now();
  const stats = {
    raw: 0,
    validated: 0,
    rejected_evidence: 0,
    rejected_format: 0,
    rejected_other: 0,
    fristHinweiseRaw: 0,
    fristHinweiseValidated: 0,
    fristHinweiseRejectedEvidence: 0,
    durationMs: 0,
    fallback: false
  };
  const emptyResult = (statsCopy) => ({ importantDates: [], fristHinweise: [], stats: statsCopy });

  if (!contractText || contractText.length < 100) {
    console.warn(`⚠️ [${requestId}] [DateHunt] Kein/zu kurzer Vertragstext — übersprungen`);
    stats.fallback = true;
    stats.durationMs = Date.now() - startTime;
    return emptyResult(stats);
  }

  let response;
  try {
    response = await Promise.race([
      openaiClient.chat.completions.create({
        model: DATE_HUNT_MODEL,
        temperature: 0,
        response_format: { type: 'json_object' },
        max_tokens: 3000, // erhöht von 2000 → braucht Platz für importantDates + fristHinweise
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: buildUserPrompt(contractText) }
        ]
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`DateHunt timeout after ${DATE_HUNT_TIMEOUT_MS}ms`)), DATE_HUNT_TIMEOUT_MS)
      )
    ]);
  } catch (err) {
    console.warn(`⚠️ [${requestId}] [DateHunt] OpenAI call failed: ${err.message} — Fallback auf leere Arrays`);
    stats.fallback = true;
    stats.durationMs = Date.now() - startTime;
    return emptyResult(stats);
  }

  const raw = response?.choices?.[0]?.message?.content || '';
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    console.warn(`⚠️ [${requestId}] [DateHunt] JSON-Parse fehlgeschlagen: ${err.message} — Fallback`);
    stats.fallback = true;
    stats.durationMs = Date.now() - startTime;
    return emptyResult(stats);
  }

  // ─── Datums validieren ──────────────────────────────────────────────
  const dateCandidates = Array.isArray(parsed?.importantDates) ? parsed.importantDates : [];
  stats.raw = dateCandidates.length;

  const validatedDates = [];
  for (const entry of dateCandidates) {
    const v = validateDateEntry(entry, contractText);
    if (v.valid) {
      validatedDates.push({
        type: entry.type,
        date: entry.date,
        label: entry.label,
        description: entry.description || entry.label,
        calculated: !!entry.calculated,
        source: entry.source || '',
        evidence: entry.evidence
      });
    } else {
      if (v.reason === 'evidence_not_in_text' || v.reason === 'missing_evidence' || v.reason?.startsWith('evidence_length')) {
        stats.rejected_evidence++;
      } else if (v.reason === 'invalid_date_format' || v.reason === 'unparseable_date') {
        stats.rejected_format++;
      } else {
        stats.rejected_other++;
      }
      const evidence = entry.evidence || '';
      console.warn(
        `⚠️ [${requestId}] [DateHunt] Datum verworfen (${v.reason}): ` +
        `type=${entry.type} date=${entry.date} label=${entry.label}`
      );
      if (v.reason === 'evidence_not_in_text' && evidence) {
        console.warn(`   📝 Evidence (${evidence.length} chars): "${evidence}"`);
        const firstWords = evidence.trim().split(/\s+/).slice(0, 5).join(' ');
        if (firstWords.length >= 8) {
          const idx = contractText.toLowerCase().indexOf(firstWords.toLowerCase());
          if (idx >= 0) {
            const snippet = contractText.slice(Math.max(0, idx - 10), idx + evidence.length + 50);
            console.warn(`   🔎 Ähnlicher Vertragsabschnitt (Pos ${idx}): "${snippet}"`);
          } else {
            console.warn(`   🔎 Erste 5 Wörter der Evidence ("${firstWords}") nicht im Vertragstext gefunden`);
          }
        }
      }
    }
  }
  stats.validated = validatedDates.length;

  // ─── Frist-Hinweise validieren ──────────────────────────────────────
  const fristCandidates = Array.isArray(parsed?.fristHinweise) ? parsed.fristHinweise : [];
  stats.fristHinweiseRaw = fristCandidates.length;

  const validatedFristHinweise = [];
  for (const entry of fristCandidates) {
    const v = validateFristHinweis(entry, contractText);
    if (v.valid) {
      validatedFristHinweise.push({
        type: entry.type,
        title: entry.title,
        description: entry.description || '',
        legalBasis: entry.legalBasis || '',
        evidence: entry.evidence
      });
    } else {
      if (v.reason === 'evidence_not_in_text' || v.reason === 'missing_evidence' || v.reason?.startsWith('evidence_length')) {
        stats.fristHinweiseRejectedEvidence++;
      }
      console.warn(
        `⚠️ [${requestId}] [DateHunt] Frist-Hinweis verworfen (${v.reason}): ` +
        `type=${entry.type} title="${entry.title || '(leer)'}"`
      );
    }
  }
  stats.fristHinweiseValidated = validatedFristHinweise.length;

  // ─── Phase 3: Review-Pass (Stage B — Anwalt-Assistentin) ────────────
  // Sequenzieller zweiter GPT-Call. Bekommt die Stage-A-Funde + den Vertragstext
  // und prüft, ob etwas übersehen wurde. Liefert NUR Zusätze — Halluzinationen
  // werden vom Validator gefiltert (gleiche Disziplin wie Stage A). Bei
  // Fehler/Timeout: leere Arrays, Stage A bleibt aktiv.
  const reviewResult = await runReviewPass(
    contractText,
    { importantDates: validatedDates, fristHinweise: validatedFristHinweise },
    openaiClient,
    requestId
  );

  // Review-Pass-Stats in das Haupt-Stats-Objekt mergen
  stats.reviewPass_raw_dates = reviewResult.stats.raw_dates;
  stats.reviewPass_raw_fristen = reviewResult.stats.raw_fristen;
  stats.reviewPass_validated_dates = reviewResult.stats.validated_dates;
  stats.reviewPass_validated_fristen = reviewResult.stats.validated_fristen;
  stats.reviewPass_rejected = reviewResult.stats.rejected;
  stats.reviewPass_durationMs = reviewResult.stats.durationMs;
  stats.reviewPass_fallback = reviewResult.stats.fallback;
  stats.reviewPass_skipped = reviewResult.stats.skipped;

  // ─── Merge Stage A + Review-Pass mit Dedup ──────────────────────────
  // Stage A gewinnt bei Konflikt (sie ist die "Hauptquelle"). Review-Pass-Funde
  // werden nur ergänzt, wenn sie wirklich neu sind.
  const mergedDates = dedupDates(validatedDates, reviewResult.importantDates);
  const mergedFristen = dedupFristen(validatedFristHinweise, reviewResult.fristHinweise);

  // ─── Cap auf MAX-Limits ─────────────────────────────────────────────
  // Falls GPT trotz Prompt-Vorgabe mehr liefert: hartes Cap im Backend.
  const cappedDates = mergedDates.slice(0, MAX_DATES);
  const cappedFristen = mergedFristen.slice(0, MAX_FRIST_HINWEISE);

  stats.durationMs = Date.now() - startTime;

  console.log(
    `📅 [${requestId}] [DateHunt] Stage A: Datums ${stats.raw}→${stats.validated} | ` +
    `Fristen ${stats.fristHinweiseRaw}→${stats.fristHinweiseValidated} ` +
    `(${stats.rejected_evidence + stats.fristHinweiseRejectedEvidence} Evidence-Fail) ` +
    `in ${stats.durationMs - (stats.reviewPass_durationMs || 0)}ms`
  );
  console.log(
    `🔄 [${requestId}] [DateHunt] Final: ${cappedDates.length} Datums + ${cappedFristen.length} Fristen ` +
    `(Stage A: ${validatedDates.length}+${validatedFristHinweise.length}, ` +
    `Review-Pass: +${reviewResult.importantDates.length}+${reviewResult.fristHinweise.length} ` +
    `${stats.reviewPass_fallback ? '[FALLBACK]' : stats.reviewPass_skipped ? '[SKIPPED]' : ''}) ` +
    `total ${stats.durationMs}ms`
  );

  return { importantDates: cappedDates, fristHinweise: cappedFristen, stats };
}

module.exports = {
  huntDates,
  // Export für Tests
  validateDateEntry,
  validateFristHinweis,
  buildUserPrompt,
  buildReviewPrompt,
  dedupDates,
  dedupFristen
};
