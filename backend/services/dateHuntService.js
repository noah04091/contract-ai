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
// 19.05.2026 — Konzern-Robustheit gegen Termin-Lotto (3-Schichten-Plan):
// Timeouts verdoppelt (decken Render-Cold-Start + OpenAI Tail-Latency p99 ab).
// Pipeline-Cap auf 240s erhöht (Render Standard 300s als Safety-Net).
const JUNIOR_TIMEOUT_MS = 90_000;
const JUNIOR_MAX_TOKENS = 2500;
const CHUNK_AUDIT_TIMEOUT_MS = 60_000;     // pro Chunk
const CHUNK_AUDIT_MAX_TOKENS = 1200;       // pro Chunk — meist deutlich weniger nötig
const SENIOR_TIMEOUT_MS = 90_000;
const SENIOR_MAX_TOKENS = 2500;
const TOTAL_PIPELINE_TIMEOUT_MS = 240_000;

// Schicht 2 — Sequential Re-Run für gefailte ClauseAudit-Chunks
const CHUNK_RETRY_TIMEOUT_MS = 60_000;     // pro Re-Run-Chunk
const CHUNK_RETRY_MAX_CHUNKS = 3;          // max 3 failed Chunks werden retry'd
const CHUNK_RETRY_TOTAL_BUDGET_MS = 90_000;// gesamtes Re-Run-Budget

// Schicht 3 — Anomaly Sanity Pass
const ANOMALY_TIMEOUT_MS = 45_000;
const ANOMALY_MAX_TOKENS = 1500;
const ANOMALY_TRIGGER_MIN_CONTRACT_LEN = 10_000;  // ab hier "Anomalie wenn <2 Datums"
const ANOMALY_TRIGGER_MAX_DATES = 2;              // <2 Datums = anomalieverdächtig
const ANOMALY_SAMPLE_LEN = 3000;                  // Anfang + Ende, je 3000 chars
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

// ═══════════════════════════════════════════════════════════════════════
// SCHICHT 3 — Anomaly Sanity Pass (Compliance-Layer)
// ═══════════════════════════════════════════════════════════════════════
// Triggert nur wenn die Hauptpipeline auffällig wenig Datums findet (<2)
// bei langem Vertrag (>10k chars). Bekommt NUR Vertragsanfang + -ende
// (typischer Sitz von Vertragsdatum, Beginn, Unterschrift, Kündigungsfrist).
// Prompt-Wording bewusst defensiv ("Du musst NICHTS finden") gegen den
// "Lücken-füll-Bias" — das hat in der Vergangenheit "Vertragsunterzeichnung
// = heute" aus leeren "Ort, Datum: ___"-Linien produziert.
const ANOMALY_SYSTEM_PROMPT = `Du bist Compliance-Anwalt im Endcheck. Du bekommst nur Anfang und Ende eines Vertrags.

Wenn ein Vertragsdatum / Beginn / Unterschriftsdatum / Kündigungsfrist HIER WÖRTLICH steht, liefere es.
Wenn nichts steht: leere Arrays. Du musst NICHTS finden.

Drei Regeln, sonst keine:
1. evidence wörtlich aus dem gezeigten Text — nicht paraphrasieren, nicht ergänzen.
2. Nur was DA STEHT. Keine Vermutung aus "Ort, Datum: ___"-Leerlinien oder leeren Unterschriftsfeldern.
3. Antworte NUR als JSON.`;

// Schema-Bausteine — werden in jeden Stage-Prompt einmal eingebettet.
// Bewusst KOMPAKT (nicht 22 Datums-Typen + 17 Frist-Typen wie der alte Prompt).
// GPT findet die richtigen Typen, der Validator bewertet nur evidence.
const DATE_SCHEMA = `{
  "type": "<einer von: start_date, end_date, cancellation_deadline, minimum_term_end, probation_end, warranty_end, renewal_date, payment_due, notice_period_start, contract_signed, service_start, insurance_coverage_end, trial_end, license_expiry, price_guarantee_end, inspection_due, lease_end, option_deadline, loan_end, interest_rate_change, delivery_date, other>",
  "date": "YYYY-MM-DD",
  "label": "<Kurzname für Kalender, max 50 Zeichen>",
  "description": "<1 Satz warum für Mandanten wichtig>",
  "calculated": true|false,
  "confidence": <Zahl 0-100: wie sicher du dir bei diesem Datum bist. 90-100 nur wenn explizit + eindeutig im Text. 60-89 bei klaren Indizien. 30-59 bei berechneten/abgeleiteten Datums oder Mehrdeutigkeit. <30 bei großer Unsicherheit (besser dann gar nicht melden).>,
  "source": "<§ X / Klausel-Bezeichnung>",
  "evidence": "<wörtlicher Satz aus dem Vertrag, max ${EVIDENCE_MAX_LEN} Zeichen>"
}`;

const FRIST_SCHEMA = `{
  "type": "<einer von: kuendigungsfrist, widerrufsfrist, gewaehrleistungsfrist, verjaehrungsfrist, probezeit, maengelruegepflicht, lieferfrist, annahmefrist, karenzentschaedigung, optionsfrist, reaktionsfrist, wartungsfrist, anpassungsfrist, zahlungsfrist, ruegefrist, einwendungsfrist, sperrfrist, sonstige>",
  "title": "<Kurz-Hinweis, max 80 Zeichen, z.B. 'Kündigungsfrist 6 Monate zum Monatsende'>",
  "description": "<1-2 Sätze warum für Mandanten wichtig>",
  "legalBasis": "<§/Klausel im Vertrag>",
  "evidence": "<wörtlicher Satz aus dem Vertrag, max ${EVIDENCE_MAX_LEN} Zeichen>",
  "actionable": true|false,
  "recurrencePattern": null | {"intervalType": "quarterly"|"monthly"|"yearly"|"weekly"|"biweekly"|"semiannually", "intervalCount": 1},
  "anchorType": null | "contract_start" | "contract_end" | "fixed_date",
  "durationDays": null | <Zahl, z.B. 180 für '6 Monate'>
}`;

// Aufklärungs-Block für die neuen Felder — wird im OUTPUT_FORMAT_HINT
// referenziert, damit Junior/ClauseAudit/Senior konsistent strukturiert antworten.
const FRIST_CALENDAR_HINT = `
Calendar-Felder bei fristHinweise — WICHTIG für die Termin-Generierung:

- actionable=true NUR wenn die Frist OHNE externes Auslöse-Ereignis konkret
  zu einem Datum führen kann. Beispiele für actionable=true:
    * "Kündigungsfrist 6 Monate zum Monatsende" (mit Anker contract_end)
    * "EURIBOR-Anpassung quartalsweise" (recurrencePattern quarterly)
    * "Jährliche Konditionsprüfung" (recurrencePattern yearly)
    * "Probezeit 3 Monate ab Vertragsbeginn" (mit Anker contract_start, durationDays=90)

- actionable=false bei konditional/wenn-dann-Fristen (kein konkretes Datum möglich):
    * "Annahmefrist 7 Tage nach Zugang" — Trigger: konkretes Kaufangebot
    * "Sperrfrist >7 Tage bei Zahlungsverzug" — Trigger: Zahlungsverzug
    * "Reaktionsfrist 5 Werktage" — Trigger: konkrete Mitteilung
    * "Widerspruchsfrist 5 Tage nach Zugang" — Trigger: Zugang eines Schreibens
    * Faustregel: wenn im title "nach Zugang", "bei Verzug", "nach Erhalt",
      "im Falle von", "ab Eingang" vorkommt → actionable=false.

- recurrencePattern: NUR setzen wenn klar wiederkehrend mit festem Intervall:
    * "quartalsweise", "vierteljährlich", "alle 3 Monate" → quarterly
    * "monatlich", "pro Monat" → monthly
    * "jährlich", "pro Jahr", "p.a." → yearly
    * "halbjährlich", "alle 6 Monate" → semiannually
    * "wöchentlich" → weekly
  Sonst null.

- anchorType: nur bei einmaligen actionable-Fristen ohne recurrencePattern.
  "contract_start" bei Bezug auf Vertragsbeginn ("ab Vertragsbeginn", "ab Unterzeichnung").
  "contract_end" bei Bezug auf Vertragsende ("zum Vertragsende", "zum Laufzeitende").
  "fixed_date" wenn ein konkretes Datum im Text steht.

- durationDays: nur bei einmaligen actionable-Fristen mit Anker. "6 Monate" = 180, "3 Monate" = 90.

Sei konservativ: lieber actionable=false setzen als ein Phantom-Event riskieren.
`;

const OUTPUT_FORMAT_HINT = `Output (beide Felder PFLICHT, mind. leeres Array):
{
  "importantDates": [...],
  "fristHinweise": [...]
}
${FRIST_CALENDAR_HINT}`;

// 🆕 Problem I (28.05.2026): Ausschluss-Hint für Beispiel-/Vorlagen-/Hypothesen-Datums.
// Begründung: ohne diese Anweisung extrahiert GPT auch Datums aus "Beispiel: …",
// "z.B. …", "Im Fall dass …" — landet dann als Phantom-Calendar-Event.
// Bewusst semantisch via GPT, NICHT via Regex: ein deterministischer Filter würde
// legitime Vertragsanhänge ("Anlage 1") und Anwalts-Klarstellungen ("Hinweis: …")
// fälschlich killen (Audit 28.05. — File: project_offene-analyse-probleme.md).
const EXAMPLE_EXCLUSION_HINT = `⚠️ NICHT extrahieren — Datums/Fristen NUR aus echten Klauseln, nicht aus:
- Beispiel-Hinweisen: "Beispiel:", "z.B.", "beispielsweise", "Musterbeispiel", "zur Veranschaulichung", "nehmen wir an", "fiktiv"
- Hypothesen / Konjunktiv: "würde …", "im Fall dass", "angenommen, dass", "wäre", "könnte", "müsste", "Im Zweifel"
- Erläuterungs-Texten die NUR illustrieren, nicht verpflichten: "Hier ein Beispiel:", "Ein Beispiel wäre, wenn …"
Regel: Lieber leere Arrays als Beispiel-/Hypothesen-Datums melden. Wenn das Datum keine echte Verpflichtung/Frist im Vertrag verankert → weglassen.`;

// ═══════════════════════════════════════════════════════════════════════
// 📨 Welle 1 (07.07.2026) — LETTER-Modus für einseitige empfangene Schreiben
// ═══════════════════════════════════════════════════════════════════════
// Nur aktiv wenn analyze.js options.documentType === 'LETTER' übergibt.
// Der Vertrags-Pfad bleibt byte-identisch (alle mode-Parameter defaulten
// auf null → exakt die bisherigen Prompt-Strings).
//
// WARUM nötig: Der Vertrags-FRIST_CALENDAR_HINT lehrt explizit
// „Widerspruchsfrist X Tage nach Zugang → actionable=false" — für ein
// ERHALTENES Schreiben ist genau diese Frist aber DER zentrale Termin
// (Klagefrist § 4 KSchG, Widerspruch § 84 SGG, Mahnbescheid § 694 ZPO).
// Der LETTER-Modus leitet berechenbare Fristenden als importantDates mit
// eigenen Typen aus, die der Kalender kritisch (30/7/1) erinnert.
const LETTER_DATE_SCHEMA = `{
  "type": "<einer von: klagefrist, widerspruchsfrist, einspruchsfrist, reaktionsfrist, other>",
  "date": "YYYY-MM-DD",
  "label": "<Kurzname für Kalender, max 50 Zeichen>",
  "description": "<1 Satz warum für Mandanten wichtig>",
  "calculated": true|false,
  "confidence": <Zahl 0-100: wie sicher du dir bei diesem Datum bist. 90-100 nur wenn explizit + eindeutig im Text. 60-89 bei klaren Indizien. 30-59 bei berechneten/abgeleiteten Datums oder Mehrdeutigkeit. <30 bei großer Unsicherheit (besser dann gar nicht melden).>,
  "source": "<Absatz-/Stellen-Bezeichnung im Schreiben>",
  "evidence": "<wörtlicher Satz aus dem Schreiben, max ${EVIDENCE_MAX_LEN} Zeichen>"
}`;

function buildLetterModeHint(letterType) {
  const typeHints = {
    kuendigung_erhalten: `Dies ist ein ERHALTENES KÜNDIGUNGSSCHREIBEN. PFLICHT-Frist: Kündigungsschutzklage binnen 3 WOCHEN ab Zugang (§ 4 KSchG) → type "klagefrist", calculated: true, konservativ ab dem Briefdatum gerechnet, Label: "Klagefrist spätestens <Datum> (läuft ab Zugang — Empfangsdatum prüfen)". Zusätzlich den genannten Beendigungstermin als type "other" ausgeben.`,
    abmahnung: `Dies ist eine ABMAHNUNG. Extrahiere die gesetzte Frist (Unterlassungserklärung/Stellungnahme/Zahlung) als type "reaktionsfrist" mit konkretem Datum.`,
    behoerdenbescheid: `Dies ist ein BEHÖRDENBESCHEID. PFLICHT-Frist: Widerspruch/Einspruch binnen 1 Monat ab Bekanntgabe (§ 70 VwGO / § 84 SGG / § 355 AO) → type "widerspruchsfrist" bzw. "einspruchsfrist" (Steuer), calculated: true, konservativ ab dem Bescheiddatum, Label mit Zugangs-Hinweis.`,
    mahnbescheid: `Dies ist ein GERICHTLICHER MAHN-/VOLLSTRECKUNGSBESCHEID. PFLICHT-Frist: Widerspruch/Einspruch binnen 2 WOCHEN ab Zustellung (§ 694 / § 700 ZPO) → type "widerspruchsfrist" bzw. "einspruchsfrist", calculated: true, konservativ ab dem Bescheiddatum, Label mit Zustellungs-Hinweis. HÖCHSTE Dringlichkeit.`,
    mahnung: `Dies ist eine MAHNUNG/ZAHLUNGSERINNERUNG. Extrahiere die gesetzte Zahlungsfrist als type "reaktionsfrist" mit konkretem Datum.`,
    sonstiges_schreiben: `Dies ist ein einseitiges Schreiben. Extrahiere JEDE genannte oder berechenbare Reaktions-/Widerspruchs-/Antwortfrist als type "reaktionsfrist" bzw. "widerspruchsfrist" mit konkretem Datum.`
  };
  return `⚠️ SONDERFALL: Das Dokument ist KEIN Vertrag, sondern ein EINSEITIGES EMPFANGENES SCHREIBEN.
${typeHints[letterType] || typeHints.sonstiges_schreiben}

REGELN FÜR SCHREIBEN (ersetzen die Vertrags-Gewohnheiten):
- Reaktions-/Klage-/Widerspruchs-/Einspruchsfristen sind hier DIE zentralen Termine.
  Wenn das Fristende aus Briefdatum + Fristdauer berechenbar ist → als importantDate
  MIT Datum ausgeben (calculated: true), NICHT nur als vager Frist-Hinweis.
- Fristen, die "ab Zugang/Zustellung" laufen: konservativ ab dem Briefdatum rechnen
  und im Label kennzeichnen ("läuft ab Zugang — Empfangsdatum prüfen").
- KEINE Vertrags-Typen verwenden (kein start_date/end_date/cancellation_deadline) —
  ein Schreiben hat keinen Vertragsbeginn und kein Vertragsende.
- Bereits abgelaufene Fristen TROTZDEM ausgeben (Vergangenheits-Datum ist ok).
- fristHinweise darfst du zusätzlich liefern (für die Anzeige), aber das konkrete
  Fristende gehört IMMER auch in importantDates.`;
}

// System-Prompt-Varianten für den LETTER-Modus (gleiche 3 Regeln, richtige Rolle).
const LETTER_JUNIOR_SYSTEM_PROMPT = `Du bist Junior-Anwalt in einer Kanzlei. Der Mandant hat ein einseitiges Schreiben ERHALTEN (Kündigung, Abmahnung, Bescheid, Mahnung). Du schreibst ihm alle wichtigen Datums + Fristen heraus — besonders Reaktions-, Klage- und Widerspruchsfristen.

Drei Regeln, sonst keine:
1. Zitiere die belegende Textstelle wörtlich (Feld evidence). Nicht paraphrasieren, nicht kürzen.
2. Wenn du nichts findest: liefere leere Arrays. Lieber leer als erfunden.
3. Antworte NUR als JSON.`;

const LETTER_CHUNK_AUDIT_SYSTEM_PROMPT = `Du prüfst EINEN Abschnitt eines empfangenen Schreibens (Kündigung, Abmahnung, Bescheid, Mahnung). Liste alle Datums + Fristen, die in DIESEM Abschnitt stehen — besonders Reaktions-, Klage- und Widerspruchsfristen.

Drei Regeln, sonst keine:
1. evidence wörtlich aus dem Abschnitt zitieren. Nicht paraphrasieren.
2. Nur was IM ABSCHNITT steht. Wenn nichts → leere Arrays.
3. Antworte NUR als JSON.`;

const LETTER_SENIOR_SYSTEM_PROMPT = `Du bist Senior-Anwalt. Junior und Abschnitts-Audit haben ein empfangenes Schreiben analysiert. Du machst die Endprüfung: welche Frist/welches Datum steht IM SCHREIBEN oder ist berechenbar, fehlt aber in der bisherigen Liste? Besonders: Klagefrist (§ 4 KSchG), Widerspruchsfrist (Bescheid/Mahnbescheid), gesetzte Reaktionsfristen.

Drei Regeln, sonst keine:
1. Liefere NUR ZUSÄTZE — was bereits in der Liste steht, NICHT noch einmal.
2. evidence wörtlich aus dem Schreiben zitieren. Nicht paraphrasieren.
3. Antworte NUR als JSON. Wenn nichts fehlt: leere Arrays.`;

/**
 * Stage 1 — Junior-User-Prompt.
 * Liest den ganzen Vertrag, sammelt breit. Kein 13-Regeln-Monster.
 */
function buildJuniorPrompt(contractText, mode = null) {
  const today = new Date().toISOString().slice(0, 10);
  return `Heutiges Datum: ${today}

Lies den folgenden ${mode?.letter ? 'Text (empfangenes Schreiben)' : 'Vertrag'} durch und schreibe alle wichtigen Datums (konkrete Kalendertage, auch berechenbare wie "6 Monate nach Vertragsbeginn") sowie alle wichtigen Frist-Regelungen (Kündigung, Widerruf, Gewährleistung, Probezeit, Reaktion, Einwendung, Annahme, Bestätigung, …) heraus.

Datums erkennen in JEDER Form: "30.06.2026", "30. Juni 2026", "dreißigster Juni zweitausendsechsundzwanzig", "im April 2026", oder berechenbar aus Frist + Startdatum. Wörter-Datums ins ISO-Format wandeln.

${mode?.letter ? buildLetterModeHint(mode.letterType) + '\n\n' : ''}${EXAMPLE_EXCLUSION_HINT}

Datums-Eintrag:
${mode?.letter ? LETTER_DATE_SCHEMA : DATE_SCHEMA}

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
function buildChunkPrompt(chunkText, chunkIdx, totalChunks, mode = null) {
  return `${mode?.letter ? 'Abschnitt eines empfangenen Schreibens' : 'Vertragsabschnitt'} ${chunkIdx + 1} von ${totalChunks}. Welche Datums + Frist-Regelungen stehen in DIESEM Abschnitt?

${mode?.letter ? buildLetterModeHint(mode.letterType) + '\n\n' : ''}${EXAMPLE_EXCLUSION_HINT}

Datums-Eintrag:
${mode?.letter ? LETTER_DATE_SCHEMA : DATE_SCHEMA}

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
function buildSeniorPrompt(contractText, knownFindings, mode = null) {
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

Deine Endprüfung: was steht IM ${mode?.letter ? 'SCHREIBEN' : 'VERTRAG'}, fehlt aber oben? Liefere NUR Zusätze. Wenn alles da ist → leere Arrays.

Häufig übersehen werden: Reaktionsfristen, Einwendungsfristen, Annahmefristen, Bestätigungsfristen, Stellungnahmefristen, Optionsfristen, Sperrfristen. Aber: nur extrahieren wenn WIRKLICH im ${mode?.letter ? 'Schreiben' : 'Vertrag'}.

${mode?.letter ? buildLetterModeHint(mode.letterType) + '\n\n' : ''}${EXAMPLE_EXCLUSION_HINT}

Datums-Eintrag:
${mode?.letter ? LETTER_DATE_SCHEMA : DATE_SCHEMA}

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
    // 🆕 29.05.2026 Watch-Item-Fix: KI liefert manchmal doppel-escaped Unicode
    // (z.B. "K\\u00fcndigung" statt "Kündigung") im Evidence-Field. Wird hier
    // dekodiert bevor andere Transformationen greifen. Junior-Stage hatte 5/5
    // evidence_not_in_text-Fails am 28.05. wegen dieses Mismatchs — Senior und
    // ClauseAudit kompensierten. Defensiv: Regex matched nur explizite \uXXXX-
    // Sequenzen, keine False-Positives auf normalen Texten möglich.
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
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
 * Prüft ob normalisierte Evidence im normalisierten Vertragstext steht.
 * Erweiterung: PDF-Extract verschluckt häufig den Satzend-Punkt vor
 * folgender Aufzählungs-Nummerierung ("…in Kraft." → "…in Kraft 2.").
 * Wenn der direkte Match scheitert, probieren wir den Match nochmal
 * ohne letztes Satzzeichen — bevor wir die Evidence als Halluzination
 * verwerfen. Halluzinationen, die NICHT im Text vorkommen, werden
 * weiterhin abgelehnt (Strip ändert nur Trailing-Punctuation).
 */
function evidenceMatchesText(normEvidence, normText) {
  if (normText.includes(normEvidence)) return true;
  const stripped = normEvidence.replace(/[.!?,;]\s*$/, '').trim();
  if (stripped !== normEvidence && normText.includes(stripped)) return true;
  // 🆕 09.06.2026: Das LLM tippt beim Zitieren deutschen Texts sporadisch das Unicode-
  // Replacement-Zeichen "�" statt Umlaut/§ (z.B. "l�uft" statt "läuft") — der
  // Quelltext ist sauber, nur das KI-Zitat ist betroffen. Der strikte Substring-Match
  // scheitert dann → valide Termine/Fristen wurden fälschlich als "evidence_not_in_text"
  // verworfen (v.a. bei gescannten/OCR-Verträgen). Fallback NUR nach Fehlschlag UND nur
  // wenn "�" vorkommt: jedes "�" als Platzhalter für 1–2 Zeichen (deckt § → 1
  // Zeichen UND die ae/oe/ue/ss-Expansion aus normalize() ab). Der Rest muss weiter exakt
  // matchen → Halluzinationen bleiben abgewehrt.
  if (normEvidence.includes('�')) return matchWithReplacementChar(normEvidence, normText);
  return false;
}

// 🆕 Toleranter Match für KI-Zitate mit "�" (Unicode-Replacement-Zeichen).
// Guards: mind. 10 echte Anker-Zeichen (Halluzinations-Schutz) + max. 20 Platzhalter
// (keine Regex-Überlastung). Bei Regex-Fehler defensiv strikt ablehnen.
function matchWithReplacementChar(normEvidence, normText) {
  const phCount = (normEvidence.match(/�/g) || []).length;
  const literalLen = normEvidence.length - phCount;
  if (literalLen < 10 || phCount > 20) return false;
  const pattern = [...normEvidence]
    .map(ch => ch === '�' ? '.{1,2}' : ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('');
  try {
    return new RegExp(pattern, 's').test(normText);
  } catch {
    return false;
  }
}

// 🆕 10.06.2026 — Anzeige-Text-Reparatur für das Unicode-Ersatzzeichen "�".
// GPT tippt sporadisch "�" statt Umlaut/§ in die GENERIERTEN Felder label/title/
// description (NICHT in evidence — der Quelltext ist sauber). Wir holen das echte
// Zeichen aus dem sauberen Vertragstext zurück: pro zusammenhängendem Buchstaben-
// Lauf mit "�" werden Kandidaten gebildet (jedes "�" → eines aus UMLAUT_CANDIDATES)
// und der Kandidat gewählt, der im Quelltext vorkommt ("m�ssen" → "müssen").
// Akkurat & universell (kein Raten); berührt KEINE Validierungs-/Dedup-Logik,
// da evidence unangetastet bleibt. Kein Treffer → "�" entfernen (sauberer Fallback).
const UMLAUT_CANDIDATES = ['ä', 'ö', 'ü', 'Ä', 'Ö', 'Ü', 'ß', '§'];

// Fallback-Wortliste (lowercase): häufige deutsche Umlaut-/ß-Wörter, die in KI-
// PARAPHRASEN vorkommen können, ohne im Vertragstext verbatim zu stehen (z.B.
// "müssen", während das Original "...sind zu überweisen" sagt). Greift NUR, wenn
// die Quelltext-Recovery scheitert. Bewusst auf Funktions-/Vertrags-Vokabular
// fokussiert — bei Unbekanntem wird das "�" sauber entfernt statt geraten.
const GERMAN_UMLAUT_WORDS = new Set([
  'für','über','müssen','muss','müsste','müssten','möglich','möglichkeit','während','gegenüber',
  'zunächst','dafür','hängt','abhängig','gehört','könnte','würde','wäre','hätte','größer','höher',
  'später','spätestens','frühestens','frühzeitig','regelmäßig','gemäß','jährlich','täglich','wöchentlich',
  'monatliche','jährliche','ändern','änderung','änderungen','erhöhung','erhöhungen','prüfen','prüfung',
  'kündigung','kündigungsfrist','kündigen','vergütung','vergütungen','verfügung','rückzahlung','rücktritt',
  'zurück','gebühr','gebühren','fällig','fälligkeit','beträgt','beträge','enthält','schönheitsreparaturen',
  'schäden','mängel','räume','übernahme','überlassung','geschäft','geschäftlich','persönlich','zusätzlich',
  'nachträglich','ordnungsgemäß','unverzüglich','einschließlich','ausschließlich','beschädigung','erklärung',
  'behörde','grundsätzlich','mietverhältnis','vertragsgemäß','überweisen','überweisung','rückgabe','wohnfläche'
]);

function recoverReplacementRun(run, lowerSource) {
  const phCount = (run.match(/�/g) || []).length;
  const anchorLen = run.length - phCount;
  // Kein echter Buchstabe als Anker → nicht raten. Max 3 "�" pro Lauf (Kombinations-Deckel).
  if (anchorLen < 1 || phCount > 3) return run.replace(/�/g, '');
  let candidates = [''];
  for (const ch of run) {
    if (ch === '�') {
      const next = [];
      for (const c of candidates) for (const u of UMLAUT_CANDIDATES) next.push(c + u);
      candidates = next;
    } else {
      candidates = candidates.map(c => c + ch);
    }
  }
  // 1. Primär: das echte Wort steht im sauberen Quelltext (akkurat, jeder Vertrag).
  const fromSource = candidates.find(c => lowerSource.includes(c.toLowerCase()));
  if (fromSource) return fromSource;
  // 2. Fallback: häufiges deutsches Umlaut-Wort (deckt KI-Paraphrasen ab).
  const fromList = candidates.find(c => GERMAN_UMLAUT_WORDS.has(c.toLowerCase()));
  if (fromList) return fromList;
  // 3. Notnagel: "�" entfernen (besser als ein Kästchen).
  return run.replace(/�/g, '');
}

function repairReplacementChars(text, lowerSource) {
  if (typeof text !== 'string' || text.indexOf('�') === -1) return text;
  if (!lowerSource) return text.replace(/�/g, '');
  const isRunChar = (ch) => ch === '�' || /\p{L}/u.test(ch);
  const chars = [...text];
  let out = '';
  let i = 0;
  while (i < chars.length) {
    if (!isRunChar(chars[i])) { out += chars[i]; i++; continue; }
    let run = '';
    while (i < chars.length && isRunChar(chars[i])) { run += chars[i]; i++; }
    out += run.indexOf('�') === -1 ? run : recoverReplacementRun(run, lowerSource);
  }
  return out;
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
  // Anti-Halluzination: Evidence darf nicht überwiegend aus leeren
  // Unterschriftsfeldern (___), Whitespace oder dekorativen Punkten/Dashes
  // bestehen. Trust-Bug-Guard: aktuell halluziniert GPT gerne "Vertrags-
  // unterzeichnung = heute" aus leeren "Ort, Datum: ___"-Linien.
  // Threshold 40% sinnvolle Zeichen (alphanumerisch + Umlaute + sonstige
  // Symbole außer Padding-Chars). Konservativ — echte Datums-Sätze haben
  // immer >70% sinnvolle Zeichen.
  const meaningfulChars = evidence.replace(/[\s_.\-—–]/g, '');
  if (meaningfulChars.length / evidence.length < 0.4) {
    return { valid: false, reason: 'evidence_mostly_blank' };
  }
  // Ziffer-Check für nicht-berechnete Datums: jedes echte Kalenderdatum
  // enthält mindestens 4 Ziffern (Jahresangabe YYYY). Berechnete Datums
  // ("ab Vertragsbeginn", "6 Monate nach Unterzeichnung") sind explizit
  // ausgenommen. Bewusst `=== false` statt `!== true` — wenn GPT das
  // Feld vergisst, greift der Check NICHT (konservativ).
  if (entry.calculated === false) {
    const digitCount = (evidence.match(/\d/g) || []).length;
    if (digitCount < 4) {
      return { valid: false, reason: 'evidence_lacks_date_digits' };
    }
  }
  // Evidence muss wörtlich im Volltext vorkommen (mit Trailing-Punctuation-
  // Toleranz für PDF-Extract-Bugs — siehe evidenceMatchesText).
  const normEvidence = normalize(evidence);
  const normText = normalize(contractText);
  if (!evidenceMatchesText(normEvidence, normText)) {
    return { valid: false, reason: 'evidence_not_in_text' };
  }
  if (!entry.type || typeof entry.type !== 'string') {
    return { valid: false, reason: 'missing_type' };
  }
  if (!entry.label || typeof entry.label !== 'string') {
    return { valid: false, reason: 'missing_label' };
  }
  // 🆕 Echte GPT-Konfidenz normalisieren (Problem F, 26.05.2026).
  // Schema fordert confidence 0-100. Fallback: 70 wenn GPT das Feld vergisst
  // (konservativer Default — drückt UI-Warn-Schwelle aber lässt Calendar-Event durch).
  if (typeof entry.confidence === 'number') {
    entry.confidence = Math.max(0, Math.min(100, Math.round(entry.confidence)));
  } else {
    entry.confidence = 70;
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
  if (!evidenceMatchesText(normEvidence, normText)) {
    return { valid: false, reason: 'evidence_not_in_text' };
  }

  // 🆕 Tier 2 (Problem F, 27.05.2026): Calendar-Felder normalisieren.
  // Whitelist-Validierung verhindert dass KI freie Strings einschmuggelt
  // (z.B. "quartalsmäßig" statt "quarterly"). Defaults: actionable=false
  // (sicherer Fallback — wenn KI Feld nicht liefert, wird kein Event erzeugt).
  entry.actionable = entry.actionable === true;

  // Anti-Pattern-Check: wenn title konditionale Trigger enthält, actionable
  // automatisch auf false setzen (Schutz vor KI-Inkonsistenz).
  const conditionalTriggers = /(nach\s+(zugang|eingang|erhalt|mitteilung|f[äa]lligkeit|entstehen|kenntnis|kenntniserlangung|abschluss)|bei\s+(verzug|verz[öo]gerung|ausfall|streit|widerspruch|verletzung)|im\s+(falle|anspruchsfall|streitfall|schadensfall)|sofern|soweit|ab\s+eingang)/i;
  // Tier 2 Härtung (27.05.2026): KI schreibt Trigger manchmal in description
  // statt im title. Beide prüfen für robusten Phantom-Schutz.
  const combinedText = `${entry.title || ''} ${entry.description || ''}`;
  if (conditionalTriggers.test(combinedText)) {
    entry.actionable = false;
  }

  // recurrencePattern Whitelist
  const VALID_INTERVALS = new Set(['quarterly', 'monthly', 'yearly', 'weekly', 'biweekly', 'semiannually']);
  if (entry.recurrencePattern && typeof entry.recurrencePattern === 'object') {
    const it = String(entry.recurrencePattern.intervalType || '').toLowerCase().trim();
    const ic = parseInt(entry.recurrencePattern.intervalCount, 10);
    if (VALID_INTERVALS.has(it) && Number.isFinite(ic) && ic >= 1 && ic <= 12) {
      entry.recurrencePattern = { intervalType: it, intervalCount: ic };
    } else {
      entry.recurrencePattern = null;
    }
  } else {
    entry.recurrencePattern = null;
  }

  // anchorType Whitelist
  const VALID_ANCHORS = new Set(['contract_start', 'contract_end', 'fixed_date']);
  if (entry.anchorType && VALID_ANCHORS.has(String(entry.anchorType).toLowerCase())) {
    entry.anchorType = String(entry.anchorType).toLowerCase();
  } else {
    entry.anchorType = null;
  }

  // durationDays normalisieren
  if (typeof entry.durationDays === 'number' && entry.durationDays >= 1 && entry.durationDays <= 36500) {
    entry.durationDays = Math.round(entry.durationDays);
  } else {
    entry.durationDays = null;
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
  // Richness-Score: wie viele Calendar-relevante Felder sind gesetzt?
  // (Tier 2 Bugfix 27.05.2026 — vorher gewann Stage A immer, auch wenn arm.
  // Folge: reichere ClauseAudit-Daten gingen verloren wenn Junior arm war.)
  const richnessScore = (frist) => {
    if (!frist) return 0;
    let s = 0;
    if (frist.recurrencePattern) s++;
    if (frist.anchorType) s++;
    if (frist.durationDays) s++;
    if (frist.actionable === true) s++;
    return s;
  };
  for (const b of stageB) {
    const bEvNorm = normalize(b.evidence || '');
    const dupIdx = result.findIndex(a => {
      if (a.type !== b.type) return false;
      const aEvNorm = normalize(a.evidence || '');
      if (!aEvNorm || !bEvNorm) return false;
      // Substring-Overlap mindestens 40 Zeichen → wahrscheinlich gleiche Klausel
      const minOverlap = 40;
      if (aEvNorm.length >= minOverlap && bEvNorm.includes(aEvNorm.slice(0, minOverlap))) return true;
      if (bEvNorm.length >= minOverlap && aEvNorm.includes(bEvNorm.slice(0, minOverlap))) return true;
      return false;
    });
    if (dupIdx === -1) {
      result.push(b);
    } else if (richnessScore(b) > richnessScore(result[dupIdx])) {
      // Bug 5 Fix: bei Duplikat gewinnt das reichere Objekt (mehr Calendar-Felder).
      // Bei gleichem Score bleibt Stage A (Status quo) erhalten.
      result[dupIdx] = b;
    }
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
  // 🆕 Sauberer Quelltext (lowercase, einmalig) für die "�"-Anzeige-Reparatur.
  const lowerSource = (typeof contractText === 'string' ? contractText : '').toLowerCase();
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
        label: repairReplacementChars(e.label, lowerSource),
        description: repairReplacementChars(e.description || e.label, lowerSource),
        calculated: !!e.calculated,
        confidence: typeof e.confidence === 'number' ? e.confidence : 70, // 🆕 Problem F Schritt 1: GPT-Konfidenz durchreichen (Bugfix 26.05. — Feld wurde vorher beim Push verworfen)
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
        title: repairReplacementChars(e.title, lowerSource),
        description: repairReplacementChars(e.description || '', lowerSource),
        legalBasis: repairReplacementChars(e.legalBasis || '', lowerSource),
        evidence: e.evidence,
        // 🆕 Tier 2 (Problem F, 27.05.2026): Calendar-Felder durchreichen
        actionable: e.actionable === true,
        recurrencePattern: e.recurrencePattern || null,
        anchorType: e.anchorType || null,
        durationDays: e.durationDays || null
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
  // AbortController: bei Timeout wird die OpenAI-Connection sauber geschlossen,
  // statt im Hintergrund weiterzulaufen (vorher: Memory-Leak, siehe Loop-Storm
  // SIGABRT vom 15.05.).
  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);

  let response;
  try {
    response = await openaiClient.chat.completions.create({
      model: DATE_HUNT_MODEL,
      temperature: 0,
      seed: 42, // 🎯 Reproduzierbarkeit — identisch zur Hauptanalyse (analyze.js:3716); gleicher Vertrag → konstante Termin-Anzahl. Nur Determinismus, kein Einfluss auf WAS gefunden wird.
      response_format: { type: 'json_object' },
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]
    }, { signal: controller.signal });
  } catch (err) {
    const isAbort = err.name === 'AbortError' || controller.signal.aborted;
    const label = isAbort ? `timeout after ${timeoutMs}ms` : err.message;
    console.warn(`⚠️ [${requestId}] [${source}] GPT-Aufruf fehlgeschlagen: ${label}`);
    return null;
  } finally {
    clearTimeout(timeoutHandle);
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
async function runJuniorPass(contractText, openaiClient, requestId, mode = null) {
  const t0 = Date.now();
  const empty = (extra = {}) => ({
    importantDates: [], fristHinweise: [],
    stats: { source: 'Junior', durationMs: Date.now() - t0, fallback: true, ...extra }
  });
  const parsed = await runSingleGPTCall({
    openaiClient,
    systemPrompt: mode?.letter ? LETTER_JUNIOR_SYSTEM_PROMPT : JUNIOR_SYSTEM_PROMPT,
    userPrompt: buildJuniorPrompt(contractText, mode),
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

async function runClauseAuditPass(contractText, openaiClient, requestId, mode = null) {
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
      systemPrompt: mode?.letter ? LETTER_CHUNK_AUDIT_SYSTEM_PROMPT : CHUNK_AUDIT_SYSTEM_PROMPT,
      userPrompt: buildChunkPrompt(chunk.text, idx, chunks.length, mode),
      maxTokens: CHUNK_AUDIT_MAX_TOKENS,
      timeoutMs: CHUNK_AUDIT_TIMEOUT_MS,
      source: `ClauseAudit#${idx}`,
      requestId
    });
    if (!parsed) return null;
    return validateAndCollect(parsed, contractText, `ClauseAudit#${idx}`, requestId);
  });

  const settled = await runWithConcurrency(tasks, CHUNK_AUDIT_CONCURRENCY);

  // Pool aller Funde aus allen Chunks. Failed-Indizes für Re-Run merken.
  let succeeded = 0;
  let failed = 0;
  let rawDates = 0, rawFristen = 0, validDatesTotal = 0, validFristenTotal = 0;
  let poolDates = [];
  let poolFristen = [];
  const failedIndices = [];
  for (let i = 0; i < settled.length; i++) {
    const r = settled[i];
    // Failed = rejected ODER fulfilled+null (runSingleGPTCall returnt null bei
    // Timeout/Parse-Fail, deshalb beide Fälle prüfen — siehe Audit-Befund).
    const isFailed = r.status === 'rejected' || (r.status === 'fulfilled' && !r.value);
    if (!isFailed) {
      succeeded++;
      const { validDates, validFristen, stats } = r.value;
      rawDates += stats.raw_dates;
      rawFristen += stats.raw_fristen;
      validDatesTotal += stats.validated_dates;
      validFristenTotal += stats.validated_fristen;
      poolDates = dedupDates(poolDates, validDates);
      poolFristen = dedupFristen(poolFristen, validFristen);
    } else {
      failed++;
      failedIndices.push(i);
    }
  }

  // ── Schicht 2: Sequential Re-Run gefailter Chunks ─────────────────────────
  // Wenn Chunk-Calls timeoutet sind (häufigster Fail-Modus durch OpenAI
  // Tail-Latency oder Render-Cold-Start), bekommt jeder gefailte Chunk noch
  // EINE Chance — sequenziell, ohne Concurrency-Stress, mit hartem Total-Budget.
  let retryAttempted = 0;
  let retryRecovered = 0;
  let retryFailedAfter = 0;
  if (failedIndices.length > 0) {
    const retryBudgetStart = Date.now();
    const targets = failedIndices.slice(0, CHUNK_RETRY_MAX_CHUNKS);
    console.log(
      `🔁 [${requestId}] [ClauseAudit] Re-Run: ${targets.length} von ${failedIndices.length} ` +
      `gefailten Chunks (Budget ${CHUNK_RETRY_TOTAL_BUDGET_MS}ms)`
    );
    for (const idx of targets) {
      if (Date.now() - retryBudgetStart > CHUNK_RETRY_TOTAL_BUDGET_MS) {
        console.log(`🔁 [${requestId}] [ClauseAudit] Re-Run abgebrochen: Budget erschöpft`);
        break;
      }
      retryAttempted++;
      const chunk = chunks[idx];
      const parsed = await runSingleGPTCall({
        openaiClient,
        systemPrompt: mode?.letter ? LETTER_CHUNK_AUDIT_SYSTEM_PROMPT : CHUNK_AUDIT_SYSTEM_PROMPT,
        userPrompt: buildChunkPrompt(chunk.text, idx, chunks.length, mode),
        maxTokens: CHUNK_AUDIT_MAX_TOKENS,
        timeoutMs: CHUNK_RETRY_TIMEOUT_MS,
        source: `ClauseAudit#${idx}:retry`,
        requestId
      });
      if (!parsed) {
        retryFailedAfter++;
        console.log(`🔁 [${requestId}] [ClauseAudit#${idx}] Retry FAILED`);
        continue;
      }
      const collected = validateAndCollect(parsed, contractText, `ClauseAudit#${idx}:retry`, requestId);
      retryRecovered++;
      rawDates += collected.stats.raw_dates;
      rawFristen += collected.stats.raw_fristen;
      validDatesTotal += collected.stats.validated_dates;
      validFristenTotal += collected.stats.validated_fristen;
      poolDates = dedupDates(poolDates, collected.validDates);
      poolFristen = dedupFristen(poolFristen, collected.validFristen);
      console.log(`🔁 [${requestId}] [ClauseAudit#${idx}] Retry SUCCESS`);
    }
    succeeded += retryRecovered;
    failed -= retryRecovered;
  }
  // ──────────────────────────────────────────────────────────────────────────

  const durationMs = Date.now() - t0;
  const retrySummary = retryAttempted > 0
    ? ` | Re-Run: ${retryAttempted} versucht, ${retryRecovered} recovered, ${retryFailedAfter} weiter failed`
    : '';
  console.log(
    `📅 [${requestId}] [ClauseAudit] ${chunks.length} Chunks (${succeeded} ok, ${failed} fail)${retrySummary} | ` +
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
      retry_attempted: retryAttempted,
      retry_recovered: retryRecovered,
      retry_failed_after: retryFailedAfter,
      raw_dates: rawDates, raw_fristen: rawFristen,
      validated_dates: validDatesTotal, validated_fristen: validFristenTotal
    }
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// Stage 3 — Senior-Anwalt (1 GPT-Call, ganzer Vertrag + Pool als Kontext)
// ═══════════════════════════════════════════════════════════════════════════
async function runSeniorPass(contractText, knownFindings, openaiClient, requestId, mode = null) {
  const t0 = Date.now();
  const empty = (extra = {}) => ({
    importantDates: [], fristHinweise: [],
    stats: { source: 'Senior', durationMs: Date.now() - t0, fallback: true, ...extra }
  });
  const parsed = await runSingleGPTCall({
    openaiClient,
    systemPrompt: mode?.letter ? LETTER_SENIOR_SYSTEM_PROMPT : SENIOR_SYSTEM_PROMPT,
    userPrompt: buildSeniorPrompt(contractText, knownFindings, mode),
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
// Schicht 3 — Anomaly Sanity Pass
// ═══════════════════════════════════════════════════════════════════════════
// Letzter Sicherheitsnetz: wenn die Pipeline bei einem langen Vertrag <2
// Datums findet, ist das suspekt. Ein fokussierter Call auf Anfang + Ende
// des Vertrags (wo Vertragsdatum/Beginn/Unterschrift typischerweise stehen)
// kann den Kopf-Bereich nachholen, falls Junior + ClauseAudit-Chunk-#1 + Senior
// gleichzeitig die Datums-Findings verloren haben.
//
// Validator läuft gegen Vertragsvolltext (nicht gegen Sample) — sonst könnte
// GPT ein Datum aus dem nicht-gezeigten Mittelteil erfinden.
function buildAnomalyUserPrompt(contractText) {
  const today = new Date().toISOString().slice(0, 10);
  const t = (contractText || '').trim();
  const headSection = t.substring(0, ANOMALY_SAMPLE_LEN);
  const tailSection = t.length > ANOMALY_SAMPLE_LEN * 2
    ? t.substring(t.length - ANOMALY_SAMPLE_LEN)
    : '';
  const sample = tailSection
    ? `[Anfang des Vertrags]\n${headSection}\n\n[Ende des Vertrags]\n${tailSection}`
    : headSection;
  return `Heutiges Datum: ${today}

Schau nur in Anfang und Ende dieses Vertrags. Liefere Vertragsdatum / Beginn / Unterschriftsdatum / Kündigungsfrist NUR wenn wörtlich vorhanden.

${EXAMPLE_EXCLUSION_HINT}

Datums-Eintrag:
${DATE_SCHEMA}

Frist-Hinweis-Eintrag:
${FRIST_SCHEMA}

${OUTPUT_FORMAT_HINT}

Auszug:
${sample}`;
}

async function runAnomalyPass(contractText, openaiClient, requestId) {
  const t0 = Date.now();
  const empty = (extra = {}) => ({
    importantDates: [], fristHinweise: [],
    stats: { source: 'Anomaly', durationMs: Date.now() - t0, fallback: true, ...extra }
  });
  const parsed = await runSingleGPTCall({
    openaiClient,
    systemPrompt: ANOMALY_SYSTEM_PROMPT,
    userPrompt: buildAnomalyUserPrompt(contractText),
    maxTokens: ANOMALY_MAX_TOKENS,
    timeoutMs: ANOMALY_TIMEOUT_MS,
    source: 'Anomaly',
    requestId
  });
  if (!parsed) return empty();
  // Validator läuft gegen Vertragsvolltext — kein Halluzinations-Vector
  // durch Sample-only-Validation.
  const { validDates, validFristen, stats } = validateAndCollect(parsed, contractText, 'Anomaly', requestId);
  const durationMs = Date.now() - t0;
  console.log(
    `🚨 [${requestId}] [Anomaly] Datums ${stats.raw_dates}→${stats.validated_dates} | ` +
    `Fristen ${stats.raw_fristen}→${stats.validated_fristen} ` +
    `(${stats.rejected_dates + stats.rejected_fristen} Evidence-Fail) in ${durationMs}ms`
  );
  return {
    importantDates: validDates,
    fristHinweise: validFristen,
    stats: { source: 'Anomaly', durationMs, fallback: false, ...stats }
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// Hauptfunktion: 3-Stage-Kaskade
// ═══════════════════════════════════════════════════════════════════════════
/**
 * @param {string} contractText - Vertragsvolltext
 * @param {object} openaiClient - OpenAI-Instanz
 * @param {string} requestId - für Logging
 * @param {object} [options] - { signal?: AbortSignal } — bei Client-Disconnect Pipeline frühzeitig beenden
 * @returns {Promise<{importantDates: Array, fristHinweise: Array, stats: object}>}
 */
async function huntDates(contractText, openaiClient, requestId = '', options = {}) {
  const { signal } = options;
  // 📨 Welle 1: LETTER-Modus — nur aktiv wenn analyze.js documentType='LETTER'
  // übergibt. mode=null (Default) → alle Prompts byte-identisch zum Vertrags-Pfad.
  const mode = options.documentType === 'LETTER'
    ? { letter: true, letterType: options.letterType || 'sonstiges_schreiben' }
    : null;
  if (mode) console.log(`📨 [${requestId}] [DateHunt] LETTER-Modus aktiv (letterType=${mode.letterType})`);
  const t0 = Date.now();
  const stats = {
    durationMs: 0,
    fallback: false,
    junior: null,
    clauseAudit: null,
    senior: null,
    anomaly: null,
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

  // 🛑 Stufe 2 (22.05.2026): Abort-Check vor Pipeline-Start. Wenn Client schon
  // weg ist, sparen wir uns die ganze Pipeline (366 GPT-Calls bei großen Verträgen).
  if (signal?.aborted) {
    console.log(`🛑 [${requestId}] [DateHunt] aborted vor Pipeline-Start`);
    return emptyResult();
  }

  // Hartes Cap für die ganze Pipeline. Stage-Timeouts sind enger gesetzt;
  // dieser Wert greift nur, wenn etwas dramatisch hängt.
  let pipelinePromise = (async () => {
    // Stage 1 + Stage 2 parallel — beide brauchen nur den Vertragstext, sind
    // unabhängig voneinander. Stage 2 ist der Hauptmotor (chunked), Stage 1
    // liefert die "Übersicht" als Backup.
    const [juniorResult, clauseAuditResult] = await Promise.all([
      runJuniorPass(contractText, openaiClient, requestId, mode).catch(err => {
        console.warn(`⚠️ [${requestId}] [Junior] unerwarteter Fehler: ${err.message}`);
        return { importantDates: [], fristHinweise: [], stats: { source: 'Junior', fallback: true, error: err.message, durationMs: 0 } };
      }),
      runClauseAuditPass(contractText, openaiClient, requestId, mode).catch(err => {
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

    // 🛑 Stufe 2: Abort-Check zwischen Stage 1+2 und Stage 3. Wenn Client weg ist,
    // spart das den Senior-Call (~125k Tokens) und Anomaly-Call.
    if (signal?.aborted) {
      console.log(`🛑 [${requestId}] [DateHunt] aborted nach ClauseAudit — überspringe Senior+Anomaly`);
      stats.fallback = false; // Wir haben echte Daten aus Stage 1+2, kein Fallback
      stats.finalCounts.dates = poolDates.slice(0, MAX_DATES).length;
      stats.finalCounts.fristen = poolFristen.slice(0, MAX_FRIST_HINWEISE).length;
      stats.durationMs = Date.now() - t0;
      return {
        importantDates: poolDates.slice(0, MAX_DATES),
        fristHinweise: poolFristen.slice(0, MAX_FRIST_HINWEISE),
        stats
      };
    }

    // Stage 3 — Senior schließt verbliebene Lücken
    const seniorResult = await runSeniorPass(
      contractText,
      { importantDates: poolDates, fristHinweise: poolFristen },
      openaiClient,
      requestId,
      mode
    ).catch(err => {
      console.warn(`⚠️ [${requestId}] [Senior] unerwarteter Fehler: ${err.message}`);
      return { importantDates: [], fristHinweise: [], stats: { source: 'Senior', fallback: true, error: err.message, durationMs: 0 } };
    });
    stats.senior = seniorResult.stats;

    // Pre-Anomaly-Merge: Pool + Senior
    let mergedDates = dedupDates(poolDates, seniorResult.importantDates);
    let mergedFristen = dedupFristen(poolFristen, seniorResult.fristHinweise);

    // ── Schicht 3: Anomaly Sanity Pass ──────────────────────────────────────
    // Wenn Pipeline auffällig wenig Datums findet bei langem Vertrag, ist das
    // suspekt. Letzter fokussierter Call auf Anfang+Ende des Vertrags.
    let anomalyResult = null;
    // 📨 Welle 1 (TÜV m5): Anomaly-Pass ist vertrags-framed (sucht Vertragsdatum/
    // Beginn mit Vertrags-DATE_SCHEMA) — für Briefe deaktiviert, sonst könnte er
    // start_date/end_date/contract_signed für ein Schreiben emittieren.
    const isAnomaly =
      !mode &&
      contractText.length > ANOMALY_TRIGGER_MIN_CONTRACT_LEN &&
      mergedDates.length < ANOMALY_TRIGGER_MAX_DATES;
    if (isAnomaly) {
      console.log(
        `🚨 [${requestId}] [Anomaly] TRIGGERED (${mergedDates.length} Datums bei ` +
        `${contractText.length} chars, Threshold <${ANOMALY_TRIGGER_MAX_DATES}/${ANOMALY_TRIGGER_MIN_CONTRACT_LEN})`
      );
      anomalyResult = await runAnomalyPass(contractText, openaiClient, requestId).catch(err => {
        console.warn(`⚠️ [${requestId}] [Anomaly] unerwarteter Fehler: ${err.message}`);
        return { importantDates: [], fristHinweise: [], stats: { source: 'Anomaly', fallback: true, error: err.message, durationMs: 0 } };
      });
      stats.anomaly = { triggered: true, ...anomalyResult.stats };
      mergedDates = dedupDates(mergedDates, anomalyResult.importantDates);
      mergedFristen = dedupFristen(mergedFristen, anomalyResult.fristHinweise);
    } else {
      stats.anomaly = { triggered: false };
    }
    // ──────────────────────────────────────────────────────────────────────────

    // Final-Cap
    const finalDates = mergedDates.slice(0, MAX_DATES);
    const finalFristen = mergedFristen.slice(0, MAX_FRIST_HINWEISE);
    stats.finalCounts.dates = finalDates.length;
    stats.finalCounts.fristen = finalFristen.length;

    // Fallback nur wenn ALLE drei Stages gefailed sind (Anomaly ist optional,
    // zählt nicht zum Fallback-Kriterium).
    const allFailed = juniorResult.stats.fallback && clauseAuditResult.stats.fallback && seniorResult.stats.fallback;
    stats.fallback = allFailed;
    stats.durationMs = Date.now() - t0;

    const anomalySummary = anomalyResult
      ? `, Anomaly +${anomalyResult.importantDates.length}+${anomalyResult.fristHinweise.length}`
      : '';
    console.log(
      `🎯 [${requestId}] [DateHunt] FINAL: ${finalDates.length} Datums + ${finalFristen.length} Fristen ` +
      `(Junior ${juniorResult.importantDates.length}+${juniorResult.fristHinweise.length}, ` +
      `ClauseAudit ${clauseAuditResult.importantDates.length}+${clauseAuditResult.fristHinweise.length} aus ${stats.clauseAudit?.chunks || 0} Chunks, ` +
      `Senior +${seniorResult.importantDates.length}+${seniorResult.fristHinweise.length}${anomalySummary}) ` +
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
  repairReplacementChars,
  // 🛡️ Welle 3: Evidence-Validator für die Hauptanalyse wiederverwendet
  // (utils/analysisEvidence.js) — strikt-wörtlich mit OCR-/Unicode-Toleranz.
  normalize,
  evidenceMatchesText,
  EVIDENCE_MIN_LEN,
  EVIDENCE_MAX_LEN,
  buildJuniorPrompt,
  buildChunkPrompt,
  buildSeniorPrompt,
  buildAnomalyUserPrompt,
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
  CHUNK_AUDIT_TIMEOUT_MS,
  CHUNK_RETRY_TIMEOUT_MS,
  CHUNK_RETRY_MAX_CHUNKS,
  CHUNK_RETRY_TOTAL_BUDGET_MS,
  ANOMALY_TIMEOUT_MS,
  ANOMALY_TRIGGER_MIN_CONTRACT_LEN,
  ANOMALY_TRIGGER_MAX_DATES,
  ANOMALY_SAMPLE_LEN,
  JUNIOR_TIMEOUT_MS,
  SENIOR_TIMEOUT_MS,
  TOTAL_PIPELINE_TIMEOUT_MS
};
