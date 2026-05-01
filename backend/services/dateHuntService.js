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
// Sanity-Cap, KEIN Steuer-Limit. 25 ist de facto unbegrenzt für reale Verträge —
// auch ein 50-seitiger Beratungsvertrag erreicht selten zweistellige Fristen-Zahlen.
// Der Evidence-Validator filtert die Wahrheit. Niemals als "Quote" im Prompt
// kommunizieren — das würde GPT zum Halluzinieren verleiten.
// (Architektur-Linie: memory/feedback_datum-extraktion-universalitaet.md, Punkt 0)
const MAX_FRIST_HINWEISE = 25;
const EVIDENCE_MIN_LEN = 8;
const EVIDENCE_MAX_LEN = 250;

const SYSTEM_PROMPT = `Du bist ein juristischer Spezialist für Vertrags-Termine und -Fristen. Du hast genau zwei Aufgaben:

(1) Finde alle rechtlich relevanten DATUMS im Vertrag — konkrete Kalendertage, die in einen Mandanten-Kalender gehören.
(2) Finde alle wichtigen FRIST-REGELUNGEN im Vertrag — Fristen ohne konkretes Datum, aber wichtig zu wissen (Kündigungsfristen, Widerrufsfristen, Gewährleistungsfristen, Probezeiten, etc.).

Du arbeitest wie ein Anwalt, der seinem Mandanten Termine UND Fristen aufschreibt. Erfinde nichts. Halluziniere nicht. Zitiere immer wörtlich aus dem Vertrag.`;

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

  // ─── Cap auf MAX-Limits ─────────────────────────────────────────────
  // Falls GPT trotz Prompt-Vorgabe mehr liefert: hartes Cap im Backend.
  const cappedDates = validatedDates.slice(0, MAX_DATES);
  const cappedFristen = validatedFristHinweise.slice(0, MAX_FRIST_HINWEISE);

  stats.durationMs = Date.now() - startTime;

  console.log(
    `📅 [${requestId}] [DateHunt] Datums: ${stats.raw} → ${cappedDates.length} validiert ` +
    `(${stats.rejected_evidence} Evidence-Fail, ${stats.rejected_format} Format-Fail, ${stats.rejected_other} Sonstige) | ` +
    `Frist-Hinweise: ${stats.fristHinweiseRaw} → ${cappedFristen.length} validiert ` +
    `(${stats.fristHinweiseRejectedEvidence} Evidence-Fail) ` +
    `in ${stats.durationMs}ms`
  );

  return { importantDates: cappedDates, fristHinweise: cappedFristen, stats };
}

module.exports = {
  huntDates,
  // Export für Tests
  validateDateEntry,
  validateFristHinweis,
  buildUserPrompt
};
