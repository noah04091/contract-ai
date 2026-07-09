/**
 * 🎯 Pilot-Tiefenanalyse — ISOLIERTE Stufe (13.06.2026)
 * ────────────────────────────────────────────────────
 * Eigene, abgekapselte GPT-Stufe nach dem Vorbild von dateHuntService (DateHunt).
 * Erzeugt zuverlässig den strukturierten `typeSpecificFindings`-Block für Pilot-Typen
 * (Mietvertrag, Arbeitsvertrag, NDA, Kaufvertrag, Agenturvertrag, Aufhebungsvertrag, …),
 * GENAU ein Eintrag pro Checkpoint der jeweiligen pilotChecklist.
 *
 * GARANTIEN:
 *   - Berührt die Hauptanalyse NICHT. Diese Funktion liefert nur ein Array zurück;
 *     der Aufrufer hängt es additiv an `result.typeSpecificFindings`.
 *   - Wirft NIE: jeder Fehler/Timeout/Parse-Problem → leeres Array (= heutiges Verhalten,
 *     Block fehlt einfach). Score/Risiken/Termine bleiben dadurch unverändert.
 *   - Anti-Halluzination: Prompt zwingt "not_applicable" statt Erfindung; es werden nur
 *     Einträge mit checkpoint + gültigem status durchgelassen.
 */

const PILOT_CHECK_MODEL = process.env.PILOT_CHECK_MODEL || 'gpt-4o';
const VALID_STATUS = new Set(['ok', 'issue', 'not_applicable']);
const MAX_TEXT_CHARS = 60000; // Schutz gegen Monster-Verträge (≈15k Tokens; gpt-4o = 128k)

/**
 * Führt die strukturierte Pilot-Pflichtprüfung aus.
 * @returns {Promise<Array>} validierte typeSpecificFindings (leer bei jedem Problem)
 */
async function runPilotCheck(contractText, title, pilotChecklist, openaiClient, requestId = '') {
  if (!pilotChecklist || typeof pilotChecklist !== 'string') return [];
  if (!contractText || typeof contractText !== 'string') return [];
  if (!openaiClient || !openaiClient.chat || !openaiClient.chat.completions) return [];

  const text = contractText.length > MAX_TEXT_CHARS ? contractText.slice(0, MAX_TEXT_CHARS) : contractText;

  const system = `Du bist ${title || 'ein hochspezialisierter Fachanwalt'} mit 20+ Jahren Erfahrung. `
    + `Du führst eine strukturierte Pflicht-Prüfung des vorgelegten Vertrages anhand einer Checkliste durch `
    + `und antwortest AUSSCHLIESSLICH in validem JSON ohne Markdown.`;

  const user = `VERTRAGSTEXT:\n"""\n${text}\n"""\n\n`
    + `${pilotChecklist}\n\n`
    + `AUSGABE-REGELN (ZWINGEND):\n`
    + `- Antworte als JSON-Objekt: { "typeSpecificFindings": [ ... ] }\n`
    + `- GENAU EIN Eintrag pro CHECKPOINT oben, in der Reihenfolge der Nummerierung. Lass KEINEN aus.\n`
    + `- Eintrag-Format: { "checkpoint": "<Kurztitel>", "status": "ok" | "issue" | "not_applicable", "finding": "<1-2 konkrete Sätze>", "legalBasis": "<§, falls einschlägig>", "clauseRef": "<Klausel-/§-Verweis im Vertrag, nur bei status issue>" }\n`
    + `- Kommt ein Checkpoint in DIESEM Vertrag nicht vor → status "not_applicable" (NICHT erfinden, NICHT weglassen).\n`
    + `- Bewerte NUR, was TATSÄCHLICH im Vertrag steht. Keine Spekulation.`;

  let completion;
  try {
    completion = await openaiClient.chat.completions.create({
      model: PILOT_CHECK_MODEL,
      temperature: 0,
      seed: 42, // Reproduzierbarkeit, identisch zu Hauptanalyse + DateHunt
      max_tokens: 4000,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    });
  } catch (err) {
    console.warn(`⚠️ [${requestId}] [PilotCheck] GPT-Aufruf fehlgeschlagen (ignoriert): ${err.message}`);
    return [];
  }

  const raw = completion && completion.choices && completion.choices[0]
    && completion.choices[0].message && completion.choices[0].message.content;
  if (!raw || typeof raw !== 'string') return [];

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    console.warn(`⚠️ [${requestId}] [PilotCheck] JSON-Parse fehlgeschlagen (ignoriert)`);
    return [];
  }

  const arr = Array.isArray(parsed && parsed.typeSpecificFindings)
    ? parsed.typeSpecificFindings
    : (Array.isArray(parsed) ? parsed : []);

  const clean = arr
    .filter(it => it && typeof it === 'object' && it.checkpoint && it.status)
    .map(it => {
      const out = {
        checkpoint: String(it.checkpoint),
        status: VALID_STATUS.has(it.status) ? it.status : 'not_applicable',
        finding: it.finding != null ? String(it.finding) : '',
      };
      if (it.legalBasis != null && String(it.legalBasis).trim()) out.legalBasis = String(it.legalBasis);
      if (it.clauseRef != null && String(it.clauseRef).trim()) out.clauseRef = String(it.clauseRef);
      return out;
    });

  return clean;
}

// 🛡️ Welle 3: MAX_TEXT_CHARS exportiert — analyze.js setzt das pilotTruncated-
// Transparenz-Flag anhand DERSELBEN Konstante (kein Hardcode-Drift).
module.exports = { runPilotCheck, MAX_TEXT_CHARS };
