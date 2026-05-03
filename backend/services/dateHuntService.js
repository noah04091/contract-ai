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

const DATE_HUNT_MODEL = 'gpt-4-turbo';
const MAX_DATES = 10;

// ─── Phase 4: Kanzlei-Kaskade ─────────────────────────────────────────────
// Drei Stages, modelliert nach echter Anwaltskanzlei:
//   Stage 1 — Junior-Anwalt:  liest den ganzen Vertrag mit kurzem Prompt,
//                             sammelt Datums + Fristen breit (kein Korsett).
//   Stage 2 — Klausel-Audit:  N parallele Mikro-Calls, einer pro Chunk;
//                             jeder GPT prüft NUR seinen Abschnitt fokussiert.
//   Stage 3 — Senior-Anwalt:  liest den Vertrag + alle Stage-1+2-Funde und
//                             ergänzt, was übersehen wurde.
// Alle drei Stages → gleicher Evidence-Validator → Halluzinationen müssen
// drei Validatoren passieren, was praktisch unmöglich ist.
//
// Architektur-Linie (memory/feedback_datum-extraktion-universalitaet.md):
// GPT entscheidet, niemals Regex. Universelle Logik, kein Vertragstyp-Branch.
const JUNIOR_TIMEOUT_MS = 60_000;
const JUNIOR_MAX_TOKENS = 2500;
const CHUNK_AUDIT_TIMEOUT_MS = 30_000;     // pro Chunk
const CHUNK_AUDIT_MAX_TOKENS = 1200;       // pro Chunk — meist deutlich weniger nötig
const SENIOR_TIMEOUT_MS = 60_000;
const SENIOR_MAX_TOKENS = 2500;
// Hartes Cap für die ganze Pipeline. Stage-Timeouts sind enger gesetzt, dieser
// Wert ist Worst-Case-Sicherheitsnetz, damit huntDates niemals länger blockt.
const TOTAL_PIPELINE_TIMEOUT_MS = 150_000;
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

// ─── Phase 4: Klausel-Audit-Chunker (deterministisch, kein GPT) ─────────────
// Splittet den Vertragstext entlang natürlicher Klausel-Grenzen (§-Marker,
// Artikel-/Abschnitt-Header, Aufzählungspunkte, Absätze). KEINE Modifikation
// des Texts — Chunks sind reine Slices des Originals, damit der Evidence-
// Validator (normalize(originalText).includes(normalize(evidence))) weiter
// funktioniert. Pro Chunk läuft später ein fokussierter GPT-Call.
//
// Werte sind benannte Konstanten, keine Magic Numbers.
const CHUNK_TARGET_LEN = 1200;   // Ziel-Größe pro Chunk
const CHUNK_MIN_LEN = 400;       // ein Chunk wird nie kleiner geschnitten
const CHUNK_MAX_LEN = 2000;      // Sicherheits-Cap, kein Chunk wird größer
const CHUNK_OVERLAP = 200;       // Überlappung zwischen Chunks → Klausel an
                                 // Boundary geht nicht verloren, Dedup fängt Doppel
const CHUNK_AUDIT_CONCURRENCY = 8; // max gleichzeitige GPT-Calls in Stage 2

/**
 * Split-Anker im Vertragstext finden — Position + Stärke.
 * Anker werden NUR an Newline-Beginn anerkannt, damit wir nicht mitten in
 * einem Satz ein "§ 5"-Match finden, das innerhalb von "Bezugnahme auf § 5"
 * steht.
 *
 * Stärken (höher = bevorzugt):
 *   3 — §-Marker, "Artikel N", "Abschnitt N", "Ziffer N"
 *   2 — Numerierte Punkte: "1.", "1.1", "(1)", "(2)"
 *   1 — Doppel-Newline (Absatzwechsel)
 */
function findSplitAnchors(text) {
  const anchors = [];
  // Stark: §-Marker und Klausel-Header
  const strongPattern = /\n\s*(?:§\s*\d+[a-zA-Z]?|Artikel\s+\d+|Abschnitt\s+\d+|Ziffer\s+\d+)/gi;
  for (const m of text.matchAll(strongPattern)) {
    anchors.push({ pos: m.index, weight: 3 });
  }
  // Mittel: numerierte Punkte
  const mediumPattern = /\n\s*(?:\(\d+\)|\d+\.(?:\d+\.?)?)\s/g;
  for (const m of text.matchAll(mediumPattern)) {
    anchors.push({ pos: m.index, weight: 2 });
  }
  // Schwach: Doppel-Newline
  const weakPattern = /\n\s*\n/g;
  for (const m of text.matchAll(weakPattern)) {
    anchors.push({ pos: m.index, weight: 1 });
  }
  // Position-Dedup: pro Position höchste Stärke behalten
  const byPos = new Map();
  for (const a of anchors) {
    const prev = byPos.get(a.pos);
    if (!prev || a.weight > prev.weight) byPos.set(a.pos, a);
  }
  return Array.from(byPos.values()).sort((a, b) => a.pos - b.pos);
}

/**
 * Findet das nächste Satzende (`.`, `!`, `?` gefolgt von Whitespace)
 * im Bereich [from, to]. Für Fallback wenn keine Anker im Range sind.
 */
function findSentenceEnd(text, from, to) {
  for (let i = from; i < to && i < text.length - 1; i++) {
    const c = text[i];
    if (c === '.' || c === '!' || c === '?') {
      if (/[\s\n]/.test(text[i + 1])) return i + 1;
    }
  }
  return -1;
}

/**
 * Splittet Vertragstext in semantisch sinnvolle Chunks für Klausel-Audit.
 *
 * Eigenschaften:
 *  • Chunks sind exakte Slices des Originals — keine Modifikation.
 *  • Größe target ~1200 chars, min 400, max 2000.
 *  • Überlappung 200 chars zwischen Chunks (Klauseln auf Boundary werden
 *    von beiden Chunks gesehen, Dedup fängt Doppel auf).
 *  • Bei Texten ≤ MAX → 1 Chunk (kein Split).
 *
 * @returns {Array<{text, startOffset, endOffset, idx}>}
 */
function splitIntoSemanticChunks(text) {
  if (!text || typeof text !== 'string' || text.length === 0) return [];
  if (text.length <= CHUNK_MAX_LEN) {
    return [{ text, startOffset: 0, endOffset: text.length, idx: 0 }];
  }
  const anchors = findSplitAnchors(text);
  const chunks = [];
  let start = 0;
  let safety = 0;
  while (start < text.length) {
    if (++safety > 1000) break; // Notbremse gegen Endlos-Schleife
    const remaining = text.length - start;
    if (remaining <= CHUNK_MAX_LEN) {
      chunks.push({ text: text.slice(start), startOffset: start, endOffset: text.length, idx: chunks.length });
      break;
    }
    const targetEnd = start + CHUNK_TARGET_LEN;
    const minEnd = start + CHUNK_MIN_LEN;
    const maxEnd = start + CHUNK_MAX_LEN;
    // Besten Anker im Bereich [minEnd, maxEnd] finden
    let best = null;
    for (const a of anchors) {
      if (a.pos < minEnd) continue;
      if (a.pos > maxEnd) break;
      const dist = Math.abs(a.pos - targetEnd);
      if (!best || a.weight > best.weight || (a.weight === best.weight && dist < best.dist)) {
        best = { pos: a.pos, weight: a.weight, dist };
      }
    }
    let splitPos;
    if (best) {
      splitPos = best.pos;
    } else {
      // Kein Anker im Range → Satzende suchen
      const sentEnd = findSentenceEnd(text, targetEnd, maxEnd);
      splitPos = sentEnd > 0 ? sentEnd : maxEnd;
    }
    chunks.push({
      text: text.slice(start, splitPos),
      startOffset: start,
      endOffset: splitPos,
      idx: chunks.length
    });
    // Nächster Chunk startet mit Overlap (aber nie hinter splitPos)
    const nextStart = Math.max(start + CHUNK_MIN_LEN, splitPos - CHUNK_OVERLAP);
    if (nextStart <= start) break; // Schutz gegen Stagnation
    start = nextStart;
  }
  return chunks;
}

// ═══════════════════════════════════════════════════════════════════════
// STAGE 1 — Junior-Anwalt
// ═══════════════════════════════════════════════════════════════════════
// Bewusst KURZER Prompt. Kein 13-Regel-Korsett. Keine 6 Verbote-Beispiele.
// Junior soll BREIT sammeln — Halluzinationen werden vom Validator gefiltert.
// "Wenn du etwas findest, zitiere es wörtlich. Wenn du nichts findest, leer."
const JUNIOR_SYSTEM_PROMPT = `Du bist Junior-Anwalt in einer Kanzlei. Du liest Verträge und schreibst dem Mandanten alle wichtigen Datums + Fristen heraus.

Drei Regeln, sonst keine:
1. Zitiere die belegende Vertragsstelle wörtlich (Feld evidence). Nicht paraphrasieren, nicht kürzen.
2. Wenn du nichts findest: liefere leere Arrays. Lieber leer als erfunden.
3. Antworte NUR als JSON.`;

// ═══════════════════════════════════════════════════════════════════════
// STAGE 2 — Klausel-Audit (pro Chunk EIN Mikro-Call)
// ═══════════════════════════════════════════════════════════════════════
// Sehr fokussierter Prompt. GPT bekommt EINEN Vertragsabschnitt, nicht den
// ganzen Vertrag. Kognitive Last drastisch reduziert → findet, was der
// Junior beim Übersicht-Lesen übersehen hat.
const CHUNK_AUDIT_SYSTEM_PROMPT = `Du prüfst EINEN Abschnitt eines Vertrags. Liste alle Datums + Fristen, die in DIESEM Abschnitt stehen.

Drei Regeln, sonst keine:
1. evidence wörtlich aus dem Abschnitt zitieren. Nicht paraphrasieren.
2. Nur was IM ABSCHNITT steht. Wenn nichts → leere Arrays.
3. Antworte NUR als JSON.`;

// ═══════════════════════════════════════════════════════════════════════
// STAGE 3 — Senior-Anwalt
// ═══════════════════════════════════════════════════════════════════════
// Bekommt: vollen Vertrag + dedupliziertes Pool aus Stage 1+2. Liefert NUR
// Ergänzungen, was bisher fehlt. Empowert zum Finden, NICHT zum bloßen
// Verifizieren — das war der Fehler im alten Review-Pass.
const SENIOR_SYSTEM_PROMPT = `Du bist Senior-Anwalt. Junior und Klausel-Audit haben den Vertrag analysiert. Du machst die Endprüfung: was steht IM VERTRAG, fehlt aber in der bisherigen Liste?

Drei Regeln, sonst keine:
1. Liefere NUR ZUSÄTZE — was bereits in der Liste steht, NICHT noch einmal.
2. evidence wörtlich aus dem Vertrag zitieren. Nicht paraphrasieren.
3. Antworte NUR als JSON. Wenn nichts fehlt: leere Arrays.`;

// Schema-Bausteine — werden in jeden Stage-Prompt einmal eingebettet.
// Bewusst KOMPAKT (nicht 22 Datums-Typen + 17 Frist-Typen wie der alte Prompt).
// GPT findet die richtigen Typen, der Validator bewertet nur evidence.
const DATE_SCHEMA = `{
  "type": "<einer von: start_date, end_date, cancellation_deadline, minimum_term_end, probation_end, warranty_end, renewal_date, payment_due, notice_period_start, contract_signed, service_start, insurance_coverage_end, trial_end, license_expiry, price_guarantee_end, inspection_due, lease_end, option_deadline, loan_end, interest_rate_change, delivery_date, other>",
  "date": "YYYY-MM-DD",
  "label": "<Kurzname für Kalender, max 50 Zeichen>",
  "description": "<1 Satz warum für Mandanten wichtig>",
  "calculated": true|false,
  "source": "<§ X / Klausel-Bezeichnung>",
  "evidence": "<wörtlicher Satz aus dem Vertrag, max ${EVIDENCE_MAX_LEN} Zeichen>"
}`;

const FRIST_SCHEMA = `{
  "type": "<einer von: kuendigungsfrist, widerrufsfrist, gewaehrleistungsfrist, verjaehrungsfrist, probezeit, maengelruegepflicht, lieferfrist, annahmefrist, karenzentschaedigung, optionsfrist, reaktionsfrist, wartungsfrist, anpassungsfrist, zahlungsfrist, ruegefrist, einwendungsfrist, sperrfrist, sonstige>",
  "title": "<Kurz-Hinweis, max 80 Zeichen, z.B. 'Kündigungsfrist 6 Monate zum Monatsende'>",
  "description": "<1-2 Sätze warum für Mandanten wichtig>",
  "legalBasis": "<§/Klausel im Vertrag>",
  "evidence": "<wörtlicher Satz aus dem Vertrag, max ${EVIDENCE_MAX_LEN} Zeichen>"
}`;

const OUTPUT_FORMAT_HINT = `Output (beide Felder PFLICHT, mind. leeres Array):
{
  "importantDates": [...],
  "fristHinweise": [...]
}`;

/**
 * Stage 1 — Junior-User-Prompt.
 * Liest den ganzen Vertrag, sammelt breit. Kein 13-Regeln-Monster.
 */
function buildJuniorPrompt(contractText) {
  const today = new Date().toISOString().slice(0, 10);
  return `Heutiges Datum: ${today}

Lies den folgenden Vertrag durch und schreibe alle wichtigen Datums (konkrete Kalendertage, auch berechenbare wie "6 Monate nach Vertragsbeginn") sowie alle wichtigen Frist-Regelungen (Kündigung, Widerruf, Gewährleistung, Probezeit, Reaktion, Einwendung, Annahme, Bestätigung, …) heraus.

Datums erkennen in JEDER Form: "30.06.2026", "30. Juni 2026", "dreißigster Juni zweitausendsechsundzwanzig", "im April 2026", oder berechenbar aus Frist + Startdatum. Wörter-Datums ins ISO-Format wandeln.

Datums-Eintrag:
${DATE_SCHEMA}

Frist-Hinweis-Eintrag:
${FRIST_SCHEMA}

${OUTPUT_FORMAT_HINT}

Vertrag:
${contractText}`;
}

/**
 * Stage 2 — Klausel-Audit-Prompt für EINEN Chunk.
 * Sehr fokussiert. GPT bekommt nur diesen Abschnitt.
 */
function buildChunkPrompt(chunkText, chunkIdx, totalChunks) {
  return `Vertragsabschnitt ${chunkIdx + 1} von ${totalChunks}. Welche Datums + Frist-Regelungen stehen in DIESEM Abschnitt?

Datums-Eintrag:
${DATE_SCHEMA}

Frist-Hinweis-Eintrag:
${FRIST_SCHEMA}

${OUTPUT_FORMAT_HINT}

Abschnitt:
${chunkText}`;
}

/**
 * Stage 3 — Senior-Anwalt-Prompt.
 * Bekommt: vollen Vertrag + dedupliziertes Pool aus Stage 1+2.
 */
function buildSeniorPrompt(contractText, knownFindings) {
  const datesAlreadyFound = (knownFindings.importantDates || []).length > 0
    ? knownFindings.importantDates.map(d => `- ${d.label} (${d.date}, ${d.type})`).join('\n')
    : '(noch keine)';
  const fristenAlreadyFound = (knownFindings.fristHinweise || []).length > 0
    ? knownFindings.fristHinweise.map(f => `- ${f.title} (${f.type})`).join('\n')
    : '(noch keine)';
  const today = new Date().toISOString().slice(0, 10);
  return `Heutiges Datum: ${today}

Junior + Klausel-Audit haben bereits geprüft. Bisher gefunden:

DATUMS:
${datesAlreadyFound}

FRIST-HINWEISE:
${fristenAlreadyFound}

Deine Endprüfung: was steht IM VERTRAG, fehlt aber oben? Liefere NUR Zusätze. Wenn alles da ist → leere Arrays.

Häufig übersehen werden: Reaktionsfristen, Einwendungsfristen, Annahmefristen, Bestätigungsfristen, Stellungnahmefristen, Optionsfristen, Sperrfristen. Aber: nur extrahieren wenn WIRKLICH im Vertrag.

Datums-Eintrag:
${DATE_SCHEMA}

Frist-Hinweis-Eintrag:
${FRIST_SCHEMA}

${OUTPUT_FORMAT_HINT}

Vertrag:
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
    .replace(/­/g, '')                  // Soft-Hyphen-Unicode entfernen
    .replace(/(\w)-\n\s*(\w)/g, '$1$2')      // Silbentrennung am Zeilenende heilen
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

// ═══════════════════════════════════════════════════════════════════════════
// Stage-Helper — gemeinsame Validierungs- und Logging-Logik
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Validiert die Datums + Frist-Hinweise aus einem GPT-Antwort-Objekt.
 * Gleiche Disziplin wie zuvor — Halluzinationen scheitern am Validator.
 * Reichhaltiges Logging: bei evidence_not_in_text wird die GPT-Evidence + ein
 * ähnlicher Vertragsabschnitt geloggt (vorher fehlte das für Frist-Hinweise).
 *
 * @returns {{ validDates, validFristen, stats }}
 */
function validateAndCollect(parsed, contractText, source, requestId) {
  const dateCands = Array.isArray(parsed?.importantDates) ? parsed.importantDates : [];
  const fristCands = Array.isArray(parsed?.fristHinweise) ? parsed.fristHinweise : [];
  const stats = {
    raw_dates: dateCands.length,
    raw_fristen: fristCands.length,
    validated_dates: 0,
    validated_fristen: 0,
    rejected_dates: 0,
    rejected_fristen: 0
  };
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
      stats.rejected_dates++;
      const evidence = e.evidence || '';
      console.warn(
        `⚠️ [${requestId}] [${source}] Datum verworfen (${v.reason}): ` +
        `type=${e.type} date=${e.date} label="${e.label || '(leer)'}"`
      );
      if (v.reason === 'evidence_not_in_text' && evidence) {
        console.warn(`   📝 Evidence (${evidence.length} chars): "${evidence}"`);
        const firstWords = evidence.trim().split(/\s+/).slice(0, 5).join(' ');
        if (firstWords.length >= 8) {
          const idx = contractText.toLowerCase().indexOf(firstWords.toLowerCase());
          if (idx >= 0) {
            const snippet = contractText.slice(Math.max(0, idx - 10), idx + evidence.length + 50);
            console.warn(`   🔎 Ähnlicher Vertragsabschnitt (Pos ${idx}): "${snippet.replace(/\s+/g, ' ').trim()}"`);
          }
        }
      }
    }
  }
  stats.validated_dates = validDates.length;

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
      stats.rejected_fristen++;
      const evidence = e.evidence || '';
      console.warn(
        `⚠️ [${requestId}] [${source}] Frist-Hinweis verworfen (${v.reason}): ` +
        `type=${e.type} title="${e.title || '(leer)'}"`
      );
      // Phase 4: erweitertes Logging auch für Frist-Hinweise (vorher fehlte das)
      if (v.reason === 'evidence_not_in_text' && evidence) {
        console.warn(`   📝 Evidence (${evidence.length} chars): "${evidence}"`);
        const firstWords = evidence.trim().split(/\s+/).slice(0, 5).join(' ');
        if (firstWords.length >= 8) {
          const idx = contractText.toLowerCase().indexOf(firstWords.toLowerCase());
          if (idx >= 0) {
            const snippet = contractText.slice(Math.max(0, idx - 10), idx + evidence.length + 50);
            console.warn(`   🔎 Ähnlicher Vertragsabschnitt (Pos ${idx}): "${snippet.replace(/\s+/g, ' ').trim()}"`);
          }
        }
      }
    }
  }
  stats.validated_fristen = validFristen.length;
  return { validDates, validFristen, stats };
}

/**
 * Ein einzelner GPT-Call mit Timeout-Wrapper. Gibt das parsed JSON oder null zurück.
 * Loggt Fehler, wirft NICHT — der Caller darf weiterlaufen.
 */
async function runSingleGPTCall({
  openaiClient, systemPrompt, userPrompt, maxTokens, timeoutMs, source, requestId
}) {
  let response;
  try {
    response = await Promise.race([
      openaiClient.chat.completions.create({
        model: DATE_HUNT_MODEL,
        temperature: 0,
        response_format: { type: 'json_object' },
        max_tokens: maxTokens,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ]
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`${source} timeout after ${timeoutMs}ms`)), timeoutMs)
      )
    ]);
  } catch (err) {
    console.warn(`⚠️ [${requestId}] [${source}] GPT-Aufruf fehlgeschlagen: ${err.message}`);
    return null;
  }
  const raw = response?.choices?.[0]?.message?.content || '';
  try {
    return JSON.parse(raw);
  } catch (err) {
    console.warn(`⚠️ [${requestId}] [${source}] JSON-Parse fehlgeschlagen: ${err.message}`);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Stage 1 — Junior-Anwalt (1 GPT-Call, ganzer Vertrag, kurzer Prompt)
// ═══════════════════════════════════════════════════════════════════════════
async function runJuniorPass(contractText, openaiClient, requestId) {
  const t0 = Date.now();
  const empty = (extra = {}) => ({
    importantDates: [], fristHinweise: [],
    stats: { source: 'Junior', durationMs: Date.now() - t0, fallback: true, ...extra }
  });
  const parsed = await runSingleGPTCall({
    openaiClient,
    systemPrompt: JUNIOR_SYSTEM_PROMPT,
    userPrompt: buildJuniorPrompt(contractText),
    maxTokens: JUNIOR_MAX_TOKENS,
    timeoutMs: JUNIOR_TIMEOUT_MS,
    source: 'Junior',
    requestId
  });
  if (!parsed) return empty();
  const { validDates, validFristen, stats } = validateAndCollect(parsed, contractText, 'Junior', requestId);
  const durationMs = Date.now() - t0;
  console.log(
    `📅 [${requestId}] [Junior] Datums ${stats.raw_dates}→${stats.validated_dates} | ` +
    `Fristen ${stats.raw_fristen}→${stats.validated_fristen} ` +
    `(${stats.rejected_dates + stats.rejected_fristen} Evidence-Fail) in ${durationMs}ms`
  );
  return {
    importantDates: validDates,
    fristHinweise: validFristen,
    stats: { source: 'Junior', durationMs, fallback: false, ...stats }
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// Stage 2 — Klausel-Audit (N parallele Mikro-Calls mit Concurrency-Limit)
// ═══════════════════════════════════════════════════════════════════════════
/**
 * Führt Promises mit Concurrency-Limit aus. Statt Promise.all (alle gleichzeitig
 * → Rate-Limit-Risiko) laufen nur N Promises parallel; sobald eines fertig ist,
 * startet das nächste.
 *
 * Promise.allSettled-Semantik: ein Failure killt nicht den Rest.
 */
async function runWithConcurrency(tasks, concurrency) {
  const results = new Array(tasks.length);
  let nextIdx = 0;
  async function worker() {
    while (true) {
      const i = nextIdx++;
      if (i >= tasks.length) return;
      try {
        results[i] = { status: 'fulfilled', value: await tasks[i]() };
      } catch (err) {
        results[i] = { status: 'rejected', reason: err };
      }
    }
  }
  const workers = [];
  for (let i = 0; i < Math.min(concurrency, tasks.length); i++) workers.push(worker());
  await Promise.all(workers);
  return results;
}

async function runClauseAuditPass(contractText, openaiClient, requestId) {
  const t0 = Date.now();
  const chunks = splitIntoSemanticChunks(contractText);
  const empty = (extra = {}) => ({
    importantDates: [], fristHinweise: [],
    stats: {
      source: 'ClauseAudit', durationMs: Date.now() - t0, fallback: true,
      chunks: chunks.length, succeeded: 0, failed: 0, ...extra
    }
  });
  if (chunks.length === 0) return empty();

  // Pro Chunk eine Task. Validator läuft pro Chunk-Antwort gegen den GANZEN
  // Vertragstext (nicht den Chunk) — sonst würden Klauseln, die im Overlap
  // landen, vom Validator gegen den Chunk geprüft, der sie nicht enthält.
  const tasks = chunks.map((chunk, idx) => async () => {
    const parsed = await runSingleGPTCall({
      openaiClient,
      systemPrompt: CHUNK_AUDIT_SYSTEM_PROMPT,
      userPrompt: buildChunkPrompt(chunk.text, idx, chunks.length),
      maxTokens: CHUNK_AUDIT_MAX_TOKENS,
      timeoutMs: CHUNK_AUDIT_TIMEOUT_MS,
      source: `ClauseAudit#${idx}`,
      requestId
    });
    if (!parsed) return null;
    return validateAndCollect(parsed, contractText, `ClauseAudit#${idx}`, requestId);
  });

  const settled = await runWithConcurrency(tasks, CHUNK_AUDIT_CONCURRENCY);

  // Pool aller Funde aus allen Chunks
  let succeeded = 0;
  let failed = 0;
  let rawDates = 0, rawFristen = 0, validDatesTotal = 0, validFristenTotal = 0;
  let poolDates = [];
  let poolFristen = [];
  for (const r of settled) {
    if (r.status === 'fulfilled' && r.value) {
      succeeded++;
      const { validDates, validFristen, stats } = r.value;
      rawDates += stats.raw_dates;
      rawFristen += stats.raw_fristen;
      validDatesTotal += stats.validated_dates;
      validFristenTotal += stats.validated_fristen;
      // Inner-Pool dedup während wir aggregieren — verhindert duplikate aus
      // Overlap-Bereichen, bevor wir am Ende mit Junior/Senior dedup-mergen.
      poolDates = dedupDates(poolDates, validDates);
      poolFristen = dedupFristen(poolFristen, validFristen);
    } else {
      failed++;
    }
  }
  const durationMs = Date.now() - t0;
  console.log(
    `📅 [${requestId}] [ClauseAudit] ${chunks.length} Chunks (${succeeded} ok, ${failed} fail) | ` +
    `Pool: ${poolDates.length} Datums + ${poolFristen.length} Fristen ` +
    `(roh: ${rawDates}+${rawFristen}, validiert: ${validDatesTotal}+${validFristenTotal}) in ${durationMs}ms`
  );
  return {
    importantDates: poolDates,
    fristHinweise: poolFristen,
    stats: {
      source: 'ClauseAudit', durationMs,
      fallback: succeeded === 0,
      chunks: chunks.length, succeeded, failed,
      raw_dates: rawDates, raw_fristen: rawFristen,
      validated_dates: validDatesTotal, validated_fristen: validFristenTotal
    }
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// Stage 3 — Senior-Anwalt (1 GPT-Call, ganzer Vertrag + Pool als Kontext)
// ═══════════════════════════════════════════════════════════════════════════
async function runSeniorPass(contractText, knownFindings, openaiClient, requestId) {
  const t0 = Date.now();
  const empty = (extra = {}) => ({
    importantDates: [], fristHinweise: [],
    stats: { source: 'Senior', durationMs: Date.now() - t0, fallback: true, ...extra }
  });
  const parsed = await runSingleGPTCall({
    openaiClient,
    systemPrompt: SENIOR_SYSTEM_PROMPT,
    userPrompt: buildSeniorPrompt(contractText, knownFindings),
    maxTokens: SENIOR_MAX_TOKENS,
    timeoutMs: SENIOR_TIMEOUT_MS,
    source: 'Senior',
    requestId
  });
  if (!parsed) return empty();
  const { validDates, validFristen, stats } = validateAndCollect(parsed, contractText, 'Senior', requestId);
  const durationMs = Date.now() - t0;
  console.log(
    `📅 [${requestId}] [Senior] Datums ${stats.raw_dates}→${stats.validated_dates} | ` +
    `Fristen ${stats.raw_fristen}→${stats.validated_fristen} ` +
    `(${stats.rejected_dates + stats.rejected_fristen} Evidence-Fail) in ${durationMs}ms`
  );
  return {
    importantDates: validDates,
    fristHinweise: validFristen,
    stats: { source: 'Senior', durationMs, fallback: false, ...stats }
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// Hauptfunktion: 3-Stage-Kaskade
// ═══════════════════════════════════════════════════════════════════════════
/**
 * @param {string} contractText - Vertragsvolltext
 * @param {object} openaiClient - OpenAI-Instanz
 * @param {string} requestId - für Logging
 * @returns {Promise<{importantDates: Array, fristHinweise: Array, stats: object}>}
 */
async function huntDates(contractText, openaiClient, requestId = '') {
  const t0 = Date.now();
  const stats = {
    durationMs: 0,
    fallback: false,
    junior: null,
    clauseAudit: null,
    senior: null,
    finalCounts: { dates: 0, fristen: 0 }
  };
  const emptyResult = () => ({
    importantDates: [], fristHinweise: [],
    stats: { ...stats, fallback: true, durationMs: Date.now() - t0 }
  });

  if (!contractText || contractText.length < 100) {
    console.warn(`⚠️ [${requestId}] [DateHunt] Kein/zu kurzer Vertragstext — übersprungen`);
    return emptyResult();
  }

  // Hartes Cap für die ganze Pipeline. Stage-Timeouts sind enger gesetzt;
  // dieser Wert greift nur, wenn etwas dramatisch hängt.
  let pipelinePromise = (async () => {
    // Stage 1 + Stage 2 parallel — beide brauchen nur den Vertragstext, sind
    // unabhängig voneinander. Stage 2 ist der Hauptmotor (chunked), Stage 1
    // liefert die "Übersicht" als Backup.
    const [juniorResult, clauseAuditResult] = await Promise.all([
      runJuniorPass(contractText, openaiClient, requestId).catch(err => {
        console.warn(`⚠️ [${requestId}] [Junior] unerwarteter Fehler: ${err.message}`);
        return { importantDates: [], fristHinweise: [], stats: { source: 'Junior', fallback: true, error: err.message, durationMs: 0 } };
      }),
      runClauseAuditPass(contractText, openaiClient, requestId).catch(err => {
        console.warn(`⚠️ [${requestId}] [ClauseAudit] unerwarteter Fehler: ${err.message}`);
        return { importantDates: [], fristHinweise: [], stats: { source: 'ClauseAudit', fallback: true, error: err.message, durationMs: 0 } };
      })
    ]);
    stats.junior = juniorResult.stats;
    stats.clauseAudit = clauseAuditResult.stats;

    // Pool aus Junior + ClauseAudit zusammenführen (Stage 1 gewinnt bei Konflikt,
    // weil sie den ganzen Vertrag als Kontext gesehen hat — Chunk-Auditoren
    // sehen nur ihren Abschnitt).
    const poolDates = dedupDates(juniorResult.importantDates, clauseAuditResult.importantDates);
    const poolFristen = dedupFristen(juniorResult.fristHinweise, clauseAuditResult.fristHinweise);

    // Stage 3 — Senior schließt verbliebene Lücken
    const seniorResult = await runSeniorPass(
      contractText,
      { importantDates: poolDates, fristHinweise: poolFristen },
      openaiClient,
      requestId
    ).catch(err => {
      console.warn(`⚠️ [${requestId}] [Senior] unerwarteter Fehler: ${err.message}`);
      return { importantDates: [], fristHinweise: [], stats: { source: 'Senior', fallback: true, error: err.message, durationMs: 0 } };
    });
    stats.senior = seniorResult.stats;

    // Final-Merge: Pool + Senior, dedup, cap
    const finalDates = dedupDates(poolDates, seniorResult.importantDates).slice(0, MAX_DATES);
    const finalFristen = dedupFristen(poolFristen, seniorResult.fristHinweise).slice(0, MAX_FRIST_HINWEISE);
    stats.finalCounts.dates = finalDates.length;
    stats.finalCounts.fristen = finalFristen.length;

    // Fallback nur wenn ALLE drei Stages gefailed sind
    const allFailed = juniorResult.stats.fallback && clauseAuditResult.stats.fallback && seniorResult.stats.fallback;
    stats.fallback = allFailed;
    stats.durationMs = Date.now() - t0;

    console.log(
      `🎯 [${requestId}] [DateHunt] FINAL: ${finalDates.length} Datums + ${finalFristen.length} Fristen ` +
      `(Junior ${juniorResult.importantDates.length}+${juniorResult.fristHinweise.length}, ` +
      `ClauseAudit ${clauseAuditResult.importantDates.length}+${clauseAuditResult.fristHinweise.length} aus ${stats.clauseAudit?.chunks || 0} Chunks, ` +
      `Senior +${seniorResult.importantDates.length}+${seniorResult.fristHinweise.length}) ` +
      `total ${stats.durationMs}ms${allFailed ? ' [FALLBACK]' : ''}`
    );

    return { importantDates: finalDates, fristHinweise: finalFristen, stats };
  })();

  // Pipeline-Cap: wenn alles dramatisch hängt, garantiert Timeout
  try {
    return await Promise.race([
      pipelinePromise,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`Pipeline timeout after ${TOTAL_PIPELINE_TIMEOUT_MS}ms`)), TOTAL_PIPELINE_TIMEOUT_MS)
      )
    ]);
  } catch (err) {
    console.warn(`⚠️ [${requestId}] [DateHunt] Pipeline-Timeout/Fehler: ${err.message} — Fallback`);
    return emptyResult();
  }
}

module.exports = {
  huntDates,
  // Export für Tests
  validateDateEntry,
  validateFristHinweis,
  buildJuniorPrompt,
  buildChunkPrompt,
  buildSeniorPrompt,
  dedupDates,
  dedupFristen,
  // Phase 4: Klausel-Audit-Chunker (deterministisch)
  splitIntoSemanticChunks,
  findSplitAnchors,
  // Konstanten für Tests
  CHUNK_TARGET_LEN,
  CHUNK_MIN_LEN,
  CHUNK_MAX_LEN,
  CHUNK_OVERLAP,
  CHUNK_AUDIT_CONCURRENCY,
  JUNIOR_TIMEOUT_MS,
  SENIOR_TIMEOUT_MS,
  TOTAL_PIPELINE_TIMEOUT_MS
};
