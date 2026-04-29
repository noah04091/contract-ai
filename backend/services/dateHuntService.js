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

const DATE_HUNT_TIMEOUT_MS = 60_000;
const DATE_HUNT_MODEL = 'gpt-4-turbo';
const MAX_DATES = 10;
const EVIDENCE_MIN_LEN = 8;
const EVIDENCE_MAX_LEN = 200;

const SYSTEM_PROMPT = `Du bist ein juristischer Datums-Spezialist. Deine einzige Aufgabe: alle rechtlich relevanten Datums in einem Vertrag finden, klassifizieren und mit dem Original-Wortlaut belegen.

Du arbeitest wie ein Anwalt, der einem Mandanten genau aufschreibt, welche Termine er sich notieren muss. Erfinde nichts. Halluziniere nicht. Zitiere immer.`;

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

3. EVIDENCE-REGEL — KRITISCH (90 % aller Fehler entstehen hier):
   evidence muss ein WÖRTLICHES Copy-Paste aus dem Vertragstext sein.
   Behalte Tippfehler, Umlaute (ae/oe/ue/ß), Sonderzeichen, Kommas — alles 1:1.
   NIEMALS umformulieren, zusammenfassen oder eigene Worte verwenden.

   ✅ RICHTIG (1:1 aus dem Vertrag kopiert):
      Vertrag enthält:  "Eine Mietanpassung ist fruehestens 15 Monate nach Mietbeginn moeglich."
      evidence:         "Eine Mietanpassung ist fruehestens 15 Monate nach Mietbeginn moeglich"

   ❌ FALSCH (paraphrasiert, eigene Worte):
      Vertrag enthält:  "Eine Mietanpassung ist fruehestens 15 Monate nach Mietbeginn moeglich."
      evidence:         "Mietanpassung 15 Monate nach Mietbeginn"           ← UMFORMULIERT
      evidence:         "frühestens 15 Monate nach Mietbeginn"              ← Umlaut geändert
      evidence:         "Frist von 15 Monaten ab Mietvertragsbeginn"        ← Synonym

   Faustregel: Wenn deine evidence Wörter enthält, die NICHT im Vertrag stehen,
   ist sie falsch. Lieber das Datum komplett weglassen als eine paraphrasierte
   Evidence liefern — der Backend-Validator wird sie sowieso verwerfen.

4. Bei Berechnungen: zeige in description die Rechnung (z.B. "Vertragsbeginn 01.04.2026 + 6 Monate Probezeit = 01.10.2026"). Die Rechnung gehört in description, NICHT in evidence — evidence bleibt das wörtliche Zitat.
5. Wörter-Datums ("dreißigster Juni") ins ISO-Format konvertieren (2026-06-30).
6. Maximal ${MAX_DATES} Datums — fokussiere auf die wichtigsten für den Mandanten.
7. Antworte AUSSCHLIESSLICH mit dem unten definierten JSON.

OUTPUT-FORMAT:
{
  "importantDates": [<Liste der Datums-Objekte, oder leeres Array wenn keine im Vertrag>]
}

VERTRAGSTEXT:
${contractText}`;
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
  // Toleriert: Case, Whitespace, Umlaut-Varianten (ä/ae, ö/oe, ü/ue, ß/ss),
  // typografische Anführungszeichen — alles, was bei OCR/PDF-Konvertierung
  // legitim variieren kann. Bewusst NICHT toleriert: Paraphrasen, Synonyme,
  // hinzugefügte/entfernte Wörter — Halluzinationen müssen weiter scheitern.
  const normalize = (s) => s
    .toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[‘’‚‛′]/g, "'")
    .replace(/[“”„‟″]/g, '"')
    .replace(/[‐-―]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
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
 * Hauptfunktion: Date Hunt.
 *
 * @param {string} contractText - Vertragsvolltext
 * @param {object} openaiClient - OpenAI-Instanz
 * @param {string} requestId - für Logging
 * @returns {Promise<{importantDates: Array, stats: object}>}
 */
async function huntDates(contractText, openaiClient, requestId = '') {
  const startTime = Date.now();
  const stats = {
    raw: 0,
    validated: 0,
    rejected_evidence: 0,
    rejected_format: 0,
    rejected_other: 0,
    durationMs: 0,
    fallback: false
  };

  if (!contractText || contractText.length < 100) {
    console.warn(`⚠️ [${requestId}] [DateHunt] Kein/zu kurzer Vertragstext — übersprungen`);
    stats.fallback = true;
    stats.durationMs = Date.now() - startTime;
    return { importantDates: [], stats };
  }

  let response;
  try {
    response = await Promise.race([
      openaiClient.chat.completions.create({
        model: DATE_HUNT_MODEL,
        temperature: 0,
        response_format: { type: 'json_object' },
        max_tokens: 2000,
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
    console.warn(`⚠️ [${requestId}] [DateHunt] OpenAI call failed: ${err.message} — Fallback auf leeres Array`);
    stats.fallback = true;
    stats.durationMs = Date.now() - startTime;
    return { importantDates: [], stats };
  }

  const raw = response?.choices?.[0]?.message?.content || '';
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    console.warn(`⚠️ [${requestId}] [DateHunt] JSON-Parse fehlgeschlagen: ${err.message} — Fallback`);
    stats.fallback = true;
    stats.durationMs = Date.now() - startTime;
    return { importantDates: [], stats };
  }

  const candidates = Array.isArray(parsed?.importantDates) ? parsed.importantDates : [];
  stats.raw = candidates.length;

  const validated = [];
  for (const entry of candidates) {
    const v = validateDateEntry(entry, contractText);
    if (v.valid) {
      validated.push({
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
      // Diagnose-Logging: Bei evidence_not_in_text die volle Evidence + den
      // ähnlichsten Vertragsabschnitt zeigen, damit wir paraphrasierte Outputs
      // von Encoding-Mismatches unterscheiden können.
      const evidence = entry.evidence || '';
      console.warn(
        `⚠️ [${requestId}] [DateHunt] Datum verworfen (${v.reason}): ` +
        `type=${entry.type} date=${entry.date} label=${entry.label}`
      );
      if (v.reason === 'evidence_not_in_text' && evidence) {
        console.warn(`   📝 Evidence (${evidence.length} chars): "${evidence}"`);
        // Zeige den ähnlichsten Treffer im Volltext: erste 5 Wörter der Evidence im Text suchen
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

  stats.validated = validated.length;
  stats.durationMs = Date.now() - startTime;

  console.log(
    `📅 [${requestId}] [DateHunt] ${stats.raw} Kandidaten → ${stats.validated} validiert ` +
    `(${stats.rejected_evidence} Evidence-Fail, ${stats.rejected_format} Format-Fail, ` +
    `${stats.rejected_other} Sonstige) in ${stats.durationMs}ms`
  );

  return { importantDates: validated, stats };
}

module.exports = {
  huntDates,
  // Export für Tests
  validateDateEntry,
  buildUserPrompt
};
