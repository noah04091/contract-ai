// 📨 Welle 2 (08.07.2026) — Token-Budget für den Dokument-Chat.
//
// WARUM: Der Chat bekommt Volltext-Kontext (bis 100.000 Zeichen statt 12.000).
// Ohne proaktive Budgetierung riskiert das context_length_exceeded (gpt-4o-mini
// 128k) — vor allem mit 30-Turn-History + RAG (Gesetze/Urteile). Muster aus
// analyze.js Koffer-Fix (:5003-5022): chars/4 untertreibt deutschen Text →
// Korrekturfaktor 1.2 (konservativ ≥ Realität, schätzt nie zu niedrig).
//
// Pure Funktionen — offline testbar (scripts/testChatWelle2.js).

const MODEL_CONTEXT_TOKENS = 128000;   // gpt-4o-mini / gpt-4o
const OUTPUT_RESERVE_TOKENS = 4000;    // = max_tokens des Antwort-Calls (Business-Antworten sind lang!)
const RAG_RESERVE_TOKENS = 2500;       // Gesetze (3×400 Z.) + Urteile (2×300 Z.) + Instruktionen — gedeckelt, fix reserviert
const SAFETY_MARGIN_TOKENS = 1500;
const ESTIMATE_CORRECTION = 1.2;
const MIN_DOC_BUDGET_TOKENS = 8000;    // Dokument-Kontext nie unter ~32k Zeichen drücken (History weicht zuerst)
const MAX_HISTORY_MESSAGES = 30;       // bestehender Cap bleibt als Obergrenze

/** Konservative Token-Schätzung (deutsch-korrigiert). */
function estimateChatTokens(text) {
  if (!text || typeof text !== 'string') return 0;
  return Math.ceil((text.length / 4) * ESTIMATE_CORRECTION);
}

/**
 * Budgetiert die Conversation-History TOKEN-basiert von der neuesten Nachricht
 * rückwärts (statt fixer 30 Stück — 30 lange Antworten à 4k Tokens wären 60k+).
 * @param {Array<{role,content}>} messages non-system Conversation (chronologisch)
 * @param {number} budgetTokens
 * @returns {Array} chronologisch, neueste garantiert enthalten
 */
function budgetHistory(messages, budgetTokens) {
  const arr = Array.isArray(messages) ? messages : [];
  const out = [];
  let used = 0;
  for (let i = arr.length - 1; i >= 0 && out.length < MAX_HISTORY_MESSAGES; i--) {
    const t = estimateChatTokens(arr[i]?.content || '');
    // Die NEUESTE Nachricht (i === arr.length-1) immer mitnehmen — ohne sie
    // fehlt die aktuelle User-Frage; alles davor nur solange Budget reicht.
    if (out.length > 0 && used + t > budgetTokens) break;
    out.unshift(arr[i]);
    used += t;
  }
  return out;
}

/**
 * Kürzt Dokumenttext auf ein Token-Budget — Head-lastig (Verträge/Schreiben
 * tragen vorn die Substanz) mit Tail-Anteil + EHRLICHEM Marker im Text selbst.
 * Der Marker MUSS im selben Kontext-Block bleiben (Reordering in chat.js behält
 * genau EINE Contract-Context-Message und filtert alle anderen System-Messages).
 * @returns {{ text: string, truncated: boolean, includedChars: number, totalChars: number }}
 */
function fitDocumentToBudget(docText, budgetTokens) {
  const text = docText || '';
  const totalChars = text.length;
  const maxChars = Math.max(0, Math.floor((budgetTokens * 4) / ESTIMATE_CORRECTION));
  if (totalChars <= maxChars) {
    return { text, truncated: false, includedChars: totalChars, totalChars };
  }
  const headChars = Math.floor(maxChars * 0.8);
  const tailChars = Math.max(0, maxChars - headChars - 200); // 200 Z. Puffer für den Marker
  const head = text.substring(0, headChars);
  const tail = tailChars > 0 ? text.substring(totalChars - tailChars) : '';
  const skipped = totalChars - headChars - tailChars;
  const marker = `\n\n[⚠️ DOKUMENT GEKÜRZT: ${skipped.toLocaleString('de-DE')} Zeichen in der Mitte ausgelassen (Zeichen ${headChars.toLocaleString('de-DE')}–${(totalChars - tailChars).toLocaleString('de-DE')}). Wenn eine Frage diesen Bereich betrifft: sage ehrlich, dass der Abschnitt nicht im Kontext liegt.]\n\n`;
  return {
    text: head + marker + tail,
    truncated: true,
    includedChars: headChars + tailChars,
    totalChars
  };
}

/**
 * Gesamt-Budget-Rechnung für einen Chat-Turn.
 * @param {Object} p
 * @param {number} p.systemPromptTokens  geschätzte Tokens des System-Prompts
 * @param {number} p.docCount            Anzahl Dokumente (Multi-Doc teilt das Budget)
 * @returns {{ docBudgetTokens: number, historyBudgetTokens: number }}
 */
function computeBudgets({ systemPromptTokens = 2000, docCount = 1 } = {}) {
  const fixed = systemPromptTokens + OUTPUT_RESERVE_TOKENS + RAG_RESERVE_TOKENS + SAFETY_MARGIN_TOKENS;
  const available = Math.max(0, MODEL_CONTEXT_TOKENS - fixed);
  // Aufteilung: Dokument(e) bekommen den Löwenanteil (Kontext ist der Kern-Nutzen),
  // History ~20% — sie ist zusätzlich durch budgetHistory hart gedeckelt.
  const historyBudgetTokens = Math.floor(available * 0.2);
  const docsTotal = Math.max(MIN_DOC_BUDGET_TOKENS, available - historyBudgetTokens);
  const docBudgetTokens = Math.max(
    Math.floor(MIN_DOC_BUDGET_TOKENS / Math.max(1, docCount)),
    Math.floor(docsTotal / Math.max(1, docCount))
  );
  return { docBudgetTokens, historyBudgetTokens };
}

module.exports = {
  MODEL_CONTEXT_TOKENS,
  OUTPUT_RESERVE_TOKENS,
  RAG_RESERVE_TOKENS,
  SAFETY_MARGIN_TOKENS,
  MIN_DOC_BUDGET_TOKENS,
  MAX_HISTORY_MESSAGES,
  estimateChatTokens,
  budgetHistory,
  fitDocumentToBudget,
  computeBudgets
};
