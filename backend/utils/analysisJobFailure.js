// 📁 backend/utils/analysisJobFailure.js
// 🚨 17.08.2026 (Stufe 2 der Alarmierung): Entscheidet, ob ein gescheiterter
// Analyse-Job eine BETRIEBS-Störung ist (→ Alarm an ERROR_ALERT_EMAIL) oder ein
// normaler Nutzerfall (→ kein Alarm; der Kunde hat seine Meldung bereits gesehen).
//
// Bewusst ein eigenes Modul und nicht inline in routes/analyze.js: Diese Entscheidung
// ist der sicherheitskritische Teil der Stufe (sie bestimmt, wann Noahs Postfach
// klingelt), und analyze.js lässt sich im Test nicht laden (öffnet beim Require
// Verbindungen). Hier ist die Regel mit echten Zusicherungen prüfbar statt nur per
// Quelltext-Textsuche.
//
// Kriterium, an den TATSÄCHLICH vergebenen Codes in analyze.js gemessen (17.08.2026):
//  - Jeder Nutzerfall antwortet 4xx:
//      PDF_CORRUPTED / PDF_PASSWORD_PROTECTED / OCR_NO_TEXT / OCR_LIMIT_REACHED /
//      PARSE_ERROR / INSUFFICIENT_CONTENT / NO_TEXT_CONTENT / VALIDATION_ERROR /
//      UPLOAD_ERROR / IMAGE_CONVERSION_FAILED / INVALID_JOB_ID (400),
//      FORBIDDEN (403), USER_NOT_FOUND / JOB_NOT_FOUND (404),
//      ANALYSIS_IN_PROGRESS / DUPLICATE_CONTRACT (409), FILE_TOO_LARGE (413),
//      RATE_LIMIT_EXCEEDED (429 — unser EIGENES Limit, kein Ausfall).
//  - Jeder Betriebsfall antwortet 5xx:
//      JOB_INSERT_FAILED / STATUS_LOOKUP_FAILED / HISTORY_ERROR (500),
//      STORAGE_UNAVAILABLE (503).
//
// Deshalb `httpStatus >= 500` statt einer Positivliste von Codes:
//  (a) selbstpflegend — ein später ergänzter Fehlercode wird automatisch richtig
//      eingeordnet und kann weder eine Mailflut auslösen noch stillschweigend fehlen,
//  (b) es schließt die Lücke, dass `error.code` auf `'UNKNOWN'` zurückfällt
//      (analyze.js: `code: fakeRes._body?.error || 'UNKNOWN'`).
//
// Dazu die zwei Fälle, die GAR KEINEN HTTP-Status tragen, weil sie außerhalb einer
// Antwort entstehen und immer eine echte Störung bedeuten.

const OPERATIONAL_FAILURE_CODES = new Set([
  'PIPELINE_EXCEPTION',   // Ausnahme in der Hintergrund-Pipeline (analyze.js / contracts.js)
  'STALE_JOB_TIMEOUT'     // Job hing >15 Min — Hard-Crash/OOM (jobs/staleAnalysisJobs.js)
]);

/**
 * @param {{code?: string, httpStatus?: number}|null|undefined} error - das error-Feld des Job-Dokuments
 * @returns {boolean} true = Betriebsstörung, alarmieren. false = Nutzerfall, still.
 */
function isOperationalFailure(error) {
  if (!error || typeof error !== 'object') return false;
  const status = Number(error.httpStatus);
  if (Number.isFinite(status) && status >= 500) return true;
  return OPERATIONAL_FAILURE_CODES.has(error.code);
}

module.exports = { isOperationalFailure, OPERATIONAL_FAILURE_CODES };
