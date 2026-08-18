// 📁 backend/tests/unit/analysisJobAlerting.test.js
// Stufe 2 der Alarmierung (17.08.2026): Gescheiterte Analyse-Jobs werden sichtbar.
//
// Hintergrund: Die Analyse laeuft ASYNC. dispatchAnalyzeRequest antwortet dem Kunden
// mit HTTP 202 und die Pipeline arbeitet entkoppelt weiter — es entsteht also NIE eine
// 5xx-Antwort, die der Beobachter aus Stufe 1 (utils/logger.js) sehen koennte. Ohne
// diese Stufe bliebe ausgerechnet das Herzstueck blind, und die Spuren verfallen nach
// 24 h (TTL auf analysis_jobs.completedAt).
//
// Der sicherheitskritische Teil ist die ENTSCHEIDUNG, wann alarmiert wird: Ein
// beschaedigtes PDF darf niemals eine Mail ausloesen, ein Ausfall von S3 oder der
// Pipeline immer. Diese Regel liegt deshalb in utils/analysisJobFailure.js und wird
// hier mit den ECHTEN Fehlercodes aus analyze.js geprueft — nicht per Textsuche.

const { isOperationalFailure, OPERATIONAL_FAILURE_CODES } = require('../../utils/analysisJobFailure');

// Die Codes stammen 1:1 aus routes/analyze.js (Stand 17.08.2026), samt HTTP-Status.
const NUTZERFAELLE = [
  { code: 'PDF_CORRUPTED', httpStatus: 400 },
  { code: 'PDF_PASSWORD_PROTECTED', httpStatus: 400 },
  { code: 'OCR_NO_TEXT', httpStatus: 400 },
  { code: 'OCR_LIMIT_REACHED', httpStatus: 400 },
  { code: 'PARSE_ERROR', httpStatus: 400 },
  { code: 'INSUFFICIENT_CONTENT', httpStatus: 400 },
  { code: 'NO_TEXT_CONTENT', httpStatus: 400 },
  { code: 'VALIDATION_ERROR', httpStatus: 400 },
  { code: 'UPLOAD_ERROR', httpStatus: 400 },
  { code: 'IMAGE_CONVERSION_FAILED', httpStatus: 400 },
  { code: 'INVALID_JOB_ID', httpStatus: 400 },
  { code: 'FORBIDDEN', httpStatus: 403 },
  { code: 'USER_NOT_FOUND', httpStatus: 404 },
  { code: 'JOB_NOT_FOUND', httpStatus: 404 },
  { code: 'ANALYSIS_IN_PROGRESS', httpStatus: 409 },
  { code: 'DUPLICATE_CONTRACT', httpStatus: 409 },
  { code: 'FILE_TOO_LARGE', httpStatus: 413 },
  { code: 'RATE_LIMIT_EXCEEDED', httpStatus: 429 },
  { code: 'DOCUMENT_TOO_LARGE', httpStatus: 400 },
  { code: 'TOKEN_LIMIT_EXCEEDED', httpStatus: 400 }
];

const BETRIEBSFAELLE = [
  { code: 'JOB_INSERT_FAILED', httpStatus: 500 },
  { code: 'STATUS_LOOKUP_FAILED', httpStatus: 500 },
  { code: 'HISTORY_ERROR', httpStatus: 500 },
  { code: 'STORAGE_UNAVAILABLE', httpStatus: 503 },
  { code: 'PIPELINE_EXCEPTION' },        // traegt bewusst KEINEN HTTP-Status
  { code: 'STALE_JOB_TIMEOUT' }          // ebenso
];

describe('isOperationalFailure(): trennt Nutzerfall von Betriebsstoerung', () => {
  test.each(NUTZERFAELLE)('kein Alarm bei $code ($httpStatus)', (fall) => {
    expect(isOperationalFailure(fall)).toBe(false);
  });

  test.each(BETRIEBSFAELLE)('Alarm bei $code', (fall) => {
    expect(isOperationalFailure(fall)).toBe(true);
  });

  test('Alarm auch wenn der Code auf UNKNOWN faellt, der Status aber 5xx ist', () => {
    // analyze.js schreibt `code: fakeRes._body?.error || 'UNKNOWN'` — genau die Luecke,
    // die eine reine Positivliste von Codes offengelassen haette.
    expect(isOperationalFailure({ code: 'UNKNOWN', httpStatus: 503 })).toBe(true);
    expect(isOperationalFailure({ code: 'UNKNOWN', httpStatus: 400 })).toBe(false);
  });

  test('ein kuenftiger, hier unbekannter 5xx-Code alarmiert automatisch mit', () => {
    expect(isOperationalFailure({ code: 'IRGENDWAS_NEUES', httpStatus: 502 })).toBe(true);
  });

  test('ein kuenftiger 4xx-Code loest weiterhin keinen Alarm aus', () => {
    expect(isOperationalFailure({ code: 'IRGENDWAS_NEUES', httpStatus: 422 })).toBe(false);
  });

  test('unbrauchbarer Input fuehrt nie zu einem Alarm und wirft nicht', () => {
    expect(isOperationalFailure(null)).toBe(false);
    expect(isOperationalFailure(undefined)).toBe(false);
    expect(isOperationalFailure({})).toBe(false);
    expect(isOperationalFailure('kaputt')).toBe(false);
    expect(isOperationalFailure({ httpStatus: 'abc' })).toBe(false);
  });

  test('die Liste der statuslosen Betriebsfaelle bleibt eng', () => {
    // Waechst sie unbeabsichtigt, alarmiert das System mehr als beabsichtigt.
    expect([...OPERATIONAL_FAILURE_CODES].sort()).toEqual(['PIPELINE_EXCEPTION', 'STALE_JOB_TIMEOUT']);
  });
});

// ---------------------------------------------------------------------------
// Haengengebliebene Jobs: eigener Meldeweg, weil dieser Cron direkt per updateOne
// schreibt und deshalb NICHT durch updateAnalysisJob laeuft.
// ---------------------------------------------------------------------------

jest.mock('../../services/errorMonitoring', () => ({ captureError: jest.fn() }));
const { captureError } = require('../../services/errorMonitoring');
const { runStaleAnalysisJobsCleanup } = require('../../jobs/staleAnalysisJobs');

function fakeDb(staleJobs, updateErgebnis = { modifiedCount: 1 }) {
  return {
    collection: () => ({
      find: () => ({ limit: () => ({ toArray: async () => staleJobs }) }),
      updateOne: async () => updateErgebnis
    })
  };
}

const jobDoc = (n) => ({ _id: `x${n}`, jobId: `job_${n}`, userId: 'u1', status: 'processing', updatedAt: new Date(0) });

describe('stale-analysis-jobs: haengende Jobs schlagen Alarm', () => {
  beforeEach(() => captureError.mockReset());

  test('meldet EINMAL pro Lauf, nicht einmal pro Job', async () => {
    const ergebnis = await runStaleAnalysisJobsCleanup(fakeDb([jobDoc(1), jobDoc(2), jobDoc(3)]));
    expect(ergebnis.marked).toBe(3);
    expect(captureError).toHaveBeenCalledTimes(1);
    const [fehler, kontext] = captureError.mock.calls[0];
    expect(fehler.name).toBe('AnalysisJobsStale');
    expect(fehler.message).toMatch(/3 Analyse-Job/);
    expect(kontext.severity).toBe('high');
    expect(kontext.route).toBe('CRON:stale-analysis-jobs');
  });

  test('meldet NICHT, wenn nichts haengt (Normalfall, jede 5 Minuten)', async () => {
    const ergebnis = await runStaleAnalysisJobsCleanup(fakeDb([]));
    expect(ergebnis.marked).toBe(0);
    expect(captureError).not.toHaveBeenCalled();
  });

  test('meldet NICHT, wenn der Race-Schutz alle Markierungen verworfen hat', async () => {
    const ergebnis = await runStaleAnalysisJobsCleanup(fakeDb([jobDoc(1)], { modifiedCount: 0 }));
    expect(ergebnis.marked).toBe(0);
    expect(captureError).not.toHaveBeenCalled();
  });

  test('ein Fehler in der Alarmierung bricht die Aufraeumung nicht ab', async () => {
    captureError.mockImplementation(() => { throw new Error('Mailserver weg'); });
    const ergebnis = await runStaleAnalysisJobsCleanup(fakeDb([jobDoc(1)]));
    expect(ergebnis.marked).toBe(1); // Aufraeumung ist trotzdem passiert
  });
});

// ---------------------------------------------------------------------------
// routes/analyze.js ist im Test nicht ladbar (oeffnet beim Require Verbindungen),
// deshalb hier statische Zusicherungen nach dem Muster von
// analyzeSaveErrorMonitoring.test.js fuer die Verdrahtung selbst.
// ---------------------------------------------------------------------------

const fs = require('fs');
const path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', '..', 'routes', 'analyze.js'), 'utf8');
const lines = src.split(/\r?\n/);

function fensterAb(marker, span) {
  const idx = lines.findIndex((l) => l.includes(marker));
  expect(idx).toBeGreaterThan(-1);
  return lines.slice(idx, idx + span).join('\n');
}

describe('routes/analyze.js: updateAnalysisJob ist der gemeinsame Meldeweg', () => {
  const block = () => fensterAb('async function updateAnalysisJob', 60);

  test('steigt sofort aus, wenn es kein Fehlschlag ist (laeuft ~8x pro Analyse)', () => {
    expect(block()).toMatch(/if \(updates\?\.status !== 'failed'\) return;/);
  });

  test('nutzt die geprueifte Entscheidungsregel statt einer Kopie davon', () => {
    expect(block()).toMatch(/isOperationalFailure/);
    expect(block()).toMatch(/utils\/analysisJobFailure/);
  });

  test('meldet mit severity high an das bestehende Alarmsystem', () => {
    expect(block()).toMatch(/captureError\(/);
    expect(block()).toMatch(/severity: 'high'/);
  });

  test('die Alarmierung ist gekapselt und kann den Job-Ablauf nie stoeren', () => {
    expect(block()).toMatch(/catch \(alarmErr\)/);
  });

  test('gibt weder Dateinamen noch Vertragsinhalt in den Alarm', () => {
    const b = block();
    expect(b).not.toMatch(/originalFilename/);
    expect(b).not.toMatch(/body:/);
    expect(b).not.toMatch(/fullText/);
  });

  test('contracts.js nutzt dieselbe Funktion (Re-Analyse ist damit mitgedeckt)', () => {
    const contracts = fs.readFileSync(path.join(__dirname, '..', '..', 'routes', 'contracts.js'), 'utf8');
    expect(contracts).toMatch(/updateAnalysisJob/);
    expect(contracts).toMatch(/require\("\.\/analyze"\)/);
  });
});
