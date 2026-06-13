/**
 * Offline-Beweis für die isolierte Pilot-Stufe (13.06.2026).
 * Mockt den OpenAI-Client (kein echter Netzwerk-Call) und beweist:
 *  - korrektes Parsen + Validieren der typeSpecificFindings
 *  - status-Normalisierung, Filtern kaputter Einträge
 *  - ISOLATION: jeder Fehler (Throw/Garbage/leer/kein Client) → leeres Array, NIE Exception
 * Aufruf: node backend/scripts/testPilotCheck.js
 */
const { runPilotCheck } = require('../services/pilotCheck');

let pass = 0, fail = 0;
const ok = (name, cond, info = '') => {
  if (cond) { pass++; console.log(`  ✅ ${name}${info ? ' — ' + info : ''}`); }
  else { fail++; console.log(`  ❌ ${name}${info ? ' — ' + info : ''}`); }
};

const mockClient = (content, shouldThrow = false) => ({
  chat: { completions: { create: async () => {
    if (shouldThrow) throw new Error('simulierter API-Ausfall');
    return { choices: [{ message: { content } }] };
  } } }
});

const CHECKLIST = 'CHECKPOINTS:\n1. Punkt A\n2. Punkt B';

(async () => {
  console.log('\n════════ Pilot-Stufe: Parsing + Validierung ════════');
  const validResp = JSON.stringify({ typeSpecificFindings: [
    { checkpoint: 'Punkt A', status: 'issue', finding: 'Problem gefunden', legalBasis: '§ 1 BGB', clauseRef: '§ 9' },
    { checkpoint: 'Punkt B', status: 'komisch', finding: 'unklar' },     // status ungültig → not_applicable
    { status: 'ok', finding: 'kein checkpoint' },                         // ohne checkpoint → gefiltert
    { checkpoint: 'Punkt C', status: 'not_applicable' },                  // ohne finding → finding=''
  ]});
  const r1 = await runPilotCheck('Vertragstext...', 'Fachanwalt für Test', CHECKLIST, mockClient(validResp));
  ok('Gültige Antwort → 3 Einträge (1 kaputter gefiltert)', r1.length === 3, `${r1.length}`);
  ok('status-Normalisierung "komisch" → not_applicable', r1[1] && r1[1].status === 'not_applicable', r1[1] && r1[1].status);
  ok('issue-Eintrag behält legalBasis + clauseRef', r1[0] && r1[0].legalBasis === '§ 1 BGB' && r1[0].clauseRef === '§ 9');
  ok('fehlendes finding → leerer String', r1[2] && r1[2].finding === '');

  console.log('\n════════ Pilot-Stufe: Bare-Array-Antwort (ohne Wrapper) ════════');
  const bare = JSON.stringify([{ checkpoint: 'X', status: 'ok', finding: 'gut' }]);
  const r2 = await runPilotCheck('text', 'titel', CHECKLIST, mockClient(bare));
  ok('Bare Array wird akzeptiert → 1 Eintrag', r2.length === 1);

  console.log('\n════════ ISOLATION: jeder Fehler → leeres Array, NIE Exception ════════');
  const rThrow = await runPilotCheck('text', 'titel', CHECKLIST, mockClient(null, true));
  ok('GPT wirft Fehler → []', Array.isArray(rThrow) && rThrow.length === 0);

  const rGarbage = await runPilotCheck('text', 'titel', CHECKLIST, mockClient('das ist kein json {{{'));
  ok('Garbage-Antwort (kein JSON) → []', Array.isArray(rGarbage) && rGarbage.length === 0);

  const rEmptyResp = await runPilotCheck('text', 'titel', CHECKLIST, mockClient(JSON.stringify({ foo: 'bar' })));
  ok('JSON ohne typeSpecificFindings → []', Array.isArray(rEmptyResp) && rEmptyResp.length === 0);

  const rNoChecklist = await runPilotCheck('text', 'titel', '', mockClient('{}'));
  ok('Leere Checkliste → [] (kein GPT-Call nötig)', Array.isArray(rNoChecklist) && rNoChecklist.length === 0);

  const rNoText = await runPilotCheck('', 'titel', CHECKLIST, mockClient('{}'));
  ok('Leerer Vertragstext → []', Array.isArray(rNoText) && rNoText.length === 0);

  const rNoClient = await runPilotCheck('text', 'titel', CHECKLIST, null);
  ok('Kein OpenAI-Client → [] (kein Crash)', Array.isArray(rNoClient) && rNoClient.length === 0);

  const rBadClient = await runPilotCheck('text', 'titel', CHECKLIST, {});
  ok('Client ohne chat.completions → []', Array.isArray(rBadClient) && rBadClient.length === 0);

  console.log('\n════════════════════════════════════════════════');
  console.log(`ERGEBNIS: ${pass} bestanden, ${fail} fehlgeschlagen`);
  console.log('════════════════════════════════════════════════\n');
  process.exit(fail === 0 ? 0 : 1);
})();
