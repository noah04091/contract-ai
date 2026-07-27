// 🚗 E2E-LIVE-PRÜFFAHRT (27.07.2026) — testet die ECHTE Produktions-Kette,
// exakt wie ein User: Browser→Cloudflare→Render→Pipeline→Ergebnis.
// Hintergrund: Alle 4 Live-Befunde vom 24.07. saßen NICHT in der KI, sondern in
// der Infrastruktur (Timeouts, Fehler-Mapping, Sessions). Komponenten-Tests sahen
// sie nicht. Diese Prüffahrt fährt die User-Wege ab und wird zum Standard-Gate
// vor/nach jedem Deploy.
//
// Tests (TESTS=AB oder TESTS=CD, damit ein Lauf <10 Min bleibt):
//   A  Haupt-Weg: Upload+Analyse async (echte PDF, forceReanalyze) → Job-Polling,
//      prüft: Erfolg, Score, Risiken, Evidence-Feld, ECHTE Fortschritts-Etappen.
//   B  Der offene Verdacht: blockierender Re-Analyse-Pfad /contracts/:id/analyze
//      durch Cloudflare — stirbt er bei ~100s (Error 524) oder läuft er durch?
//   C  Foto-Weg: generiertes Vertragsfoto (JPEG) hochladen → OCR → Analyse → ocrNotice.
//      Aufräumen: erzeugten Vertrag wieder löschen.
//   D  Müll-Datei (Text als .pdf) → MUSS scheitern, aber mit VERSTÄNDLICHER Meldung.
//
// Auth: Kurzzeit-JWT (30 Min) mit JWT_SECRET aus .env für den Test-Account —
// gleiches Muster wie der etablierte Design-Screenshot-Prozess.
// Aufruf: DOTENV_CONFIG_PATH=<main>/backend/.env TESTS=AB node -r dotenv/config scripts/e2eLivePrueffahrt.js
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');

const API = 'https://api.contract-ai.de/api'; // ⚠️ alle Routen liegen unter /api — ohne Präfix kommt 404
const TEST_USER_ID = process.env.E2E_USER_ID || '699c99de6ffba01ace3db87b';
const TEST_USER_EMAIL = process.env.E2E_USER_EMAIL || '2302test@flirt.ms';
const TESTS = (process.env.TESTS || 'AB').toUpperCase();

let pass = 0, fail = 0;
const ok = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.error(`  ❌ ${name}${detail ? ` — ${detail}` : ''}`); }
};
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function mintToken() {
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET fehlt in .env');
  return jwt.sign({ userId: TEST_USER_ID, email: TEST_USER_EMAIL }, process.env.JWT_SECRET, { expiresIn: '30m' });
}

async function api(pathname, opts = {}, token) {
  const res = await fetch(`${API}${pathname}`, {
    ...opts,
    headers: { Authorization: `Bearer ${token}`, ...(opts.headers || {}) },
  });
  let body = null;
  try { body = await res.json(); } catch { /* kein JSON */ }
  return { status: res.status, body };
}

async function pollJob(jobId, token, maxMs) {
  const t0 = Date.now();
  let sawProgress = 0, sawStage = null;
  while (Date.now() - t0 < maxMs) {
    await sleep(3000);
    const { status, body } = await api(`/analyze/job/${jobId}`, {}, token);
    if (status !== 200 || !body) continue;
    if (typeof body.progress === 'number' && body.progress > sawProgress) sawProgress = body.progress;
    if (body.stage) sawStage = body.stage;
    if (body.status === 'done') return { done: true, result: body.result, secs: (Date.now() - t0) / 1000, sawProgress, sawStage };
    if (body.status === 'failed') return { done: false, error: body.error, secs: (Date.now() - t0) / 1000, sawProgress, sawStage };
  }
  return { done: false, error: { message: 'Poll-Timeout' }, secs: (Date.now() - t0) / 1000, sawProgress, sawStage };
}

async function uploadAndPoll(token, fileBuffer, fileName, mime, maxMs, label) {
  const form = new FormData();
  form.append('file', new Blob([fileBuffer], { type: mime }), fileName);
  form.append('async', 'true');
  form.append('forceReanalyze', 'true');
  const t0 = Date.now();
  const res = await fetch(`${API}/analyze`, { method: 'POST', body: form, headers: { Authorization: `Bearer ${token}` } });
  const disp = await res.json().catch(() => null);
  if (res.status !== 202 || !disp?.jobId) {
    return { dispatched: false, status: res.status, body: disp, secs: (Date.now() - t0) / 1000 };
  }
  console.log(`  → [${label}] Job ${disp.jobId} dispatcht (${res.status}), polle...`);
  const out = await pollJob(disp.jobId, token, maxMs);
  return { dispatched: true, ...out };
}

(async () => {
  console.log(`🚗 E2E-Prüffahrt gegen ${API} — Tests: ${TESTS}\n`);
  const token = mintToken();

  // Vorab: Auth + Health über die echte Kette
  const me = await api('/auth/me', {}, token);
  ok(`Auth über Cloudflare (Plan: ${me.body?.subscriptionPlan || me.body?.plan || '?'})`, me.status === 200);

  if (TESTS.includes('A')) {
    console.log('\n━━━ TEST A: Haupt-Weg — Upload + Async-Analyse (echte PDF) ━━━');
    const pdf = fs.readFileSync(path.join(__dirname, '..', '..', 'test-contracts', 'real_factoring_eisqueen.pdf'));
    const r = await uploadAndPoll(token, pdf, 'real_factoring_eisqueen.pdf', 'application/pdf', 6 * 60 * 1000, 'A');
    ok('A1 Dispatch angenommen (202 + jobId)', r.dispatched, `status=${r.status}`);
    if (r.dispatched) {
      ok(`A2 Analyse erfolgreich (${Math.round(r.secs)}s)`, r.done === true, JSON.stringify(r.error || {}).substring(0, 200));
      const a = r.result?.analysis || r.result;
      const score = a?.contractScore ?? r.result?.contractScore;
      const issues = a?.criticalIssues || r.result?.criticalIssues || [];
      ok(`A3 Score vorhanden (${score})`, typeof score === 'number');
      ok(`A4 Risiken gefunden (${issues.length})`, Array.isArray(issues) && issues.length >= 3);
      const withEvidence = issues.filter(i => i && i.evidence).length;
      ok(`A5 Evidence-Feld aktiv (${withEvidence}/${issues.length} mit Zitat)`, withEvidence >= 1);
      ok(`A6 ECHTER Fortschritt beim Polling gesehen (max ${r.sawProgress}%, Etappe: ${String(r.sawStage || '—').substring(0, 40)})`, r.sawProgress >= 40 && !!r.sawStage);
    }
  }

  if (TESTS.includes('B')) {
    console.log('\n━━━ TEST B: Blockierender Analyse-Pfad durch Cloudflare (der offene Verdacht) ━━━');
    // Erkenntnis aus Lauf 1: /contracts/:id/analyze lehnt BEREITS analysierte Verträge
    // mit 400 ab — die Route bedient den User-Weg „erst nur speichern, später analysieren".
    // Also exakt diesen Weg fahren: (1) frisches PDF NUR speichern (/upload), (2) die
    // blockierende Route darauf loslassen und messen, (3) aufräumen.
    // Unique-Trick: PDFs tolerieren Anhang nach %%EOF → Zeitstempel anhängen ändert den
    // fileHash (kein 409-Duplikat), pdf-parse liest die Datei weiter normal.
    const basePdf = fs.readFileSync(path.join(__dirname, '..', '..', 'test-contracts', 'real_factoring_eisqueen.pdf'));
    const uniquePdf = Buffer.concat([basePdf, Buffer.from(`\n% e2e-pruefFahrt-${Date.now()}\n`)]);
    let bContractId = null;
    try {
      const form = new FormData();
      form.append('file', new Blob([uniquePdf], { type: 'application/pdf' }), `pruef-blockpfad-${Date.now()}.pdf`);
      const upRes = await fetch(`${API}/upload`, { method: 'POST', body: form, headers: { Authorization: `Bearer ${token}` } });
      const upBody = await upRes.json().catch(() => null);
      bContractId = upBody?.contract?._id || upBody?.contractId || upBody?._id || null;
      ok(`B1 Frischer Vertrag NUR gespeichert (HTTP ${upRes.status}, id=${String(bContractId).substring(0, 8)}…)`, upRes.status === 200 && !!bContractId,
        JSON.stringify(upBody || {}).substring(0, 200));

      if (bContractId) {
        const t0 = Date.now();
        try {
          const res = await fetch(`${API}/contracts/${bContractId}/analyze`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          });
          const secs = (Date.now() - t0) / 1000;
          const body = await res.json().catch(() => null);
          if (res.status >= 200 && res.status < 300 && body?.success) {
            console.log(`  → Durchgelaufen in ${Math.round(secs)}s, HTTP ${res.status}`);
            ok(`B2 VERDACHT ENTKRÄFTET: blockierender Pfad überlebt ${Math.round(secs)}s (kein 100s-Cut)`, true);
          } else {
            console.log(`  → HTTP ${res.status} nach ${Math.round(secs)}s: ${JSON.stringify(body || {}).substring(0, 300)}`);
            const looksLikeCut = res.status === 524 || (secs >= 90 && secs <= 130 && res.status >= 500);
            ok(`B2 ${looksLikeCut ? 'VERDACHT BESTÄTIGT: Proxy kappt bei ~100s' : `Anderer Fehler (HTTP ${res.status} nach ${Math.round(secs)}s)`}`, false,
              looksLikeCut ? 'Cloudflare/Proxy-Cut → Umbau auf Async nötig' : 'analysieren!');
          }
        } catch (e) {
          const secs = (Date.now() - t0) / 1000;
          const looksLikeCut = secs >= 90 && secs <= 130;
          ok(`B2 ${looksLikeCut ? 'VERDACHT BESTÄTIGT: Verbindung nach ~100s gekappt (Backend rechnet weiter!)' : `Netzwerkfehler nach ${Math.round(secs)}s`}`, false, e.message);
        }
      }
    } finally {
      if (bContractId) {
        // Backend analysiert bei Proxy-Cut evtl. noch — kurz warten, dann löschen (2 Versuche)
        await sleep(5000);
        let del = await api(`/contracts/${bContractId}`, { method: 'DELETE' }, token);
        if (!(del.status >= 200 && del.status < 300)) { await sleep(60000); del = await api(`/contracts/${bContractId}`, { method: 'DELETE' }, token); }
        console.log(`  🧹 Aufgeräumt: Test-Vertrag gelöscht (HTTP ${del.status})`);
      }
    }
  }

  if (TESTS.includes('C')) {
    console.log('\n━━━ TEST C: Foto-Weg — Vertragsfoto (JPEG) hochladen ━━━');
    const sharp = require('sharp');
    const svg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900"><rect width="100%" height="100%" fill="#fff"/>${
      ['PRUEFFAHRT-WERKVERTRAG', 'zwischen Malermeister Kurt Lang, Kassel', 'und Sabine Vogt, Kassel.',
       'Paragraph 1: Streichen von Wohnzimmer und Flur, 55 qm, weiss matt.',
       'Paragraph 2: Verguetung pauschal 1.450 EUR, faellig 14 Tage nach Abnahme.',
       'Paragraph 3: Ausfuehrung in KW 40/2026. Es gilt deutsches Recht.']
        .map((l, i) => `<text x="60" y="${120 + i * 90}" font-family="Arial" font-size="40" fill="#111">${l}</text>`).join('')
    }</svg>`);
    const jpg = await sharp(svg).jpeg({ quality: 92 }).toBuffer();
    const r = await uploadAndPoll(token, jpg, `pruef-foto-${Date.now()}.jpg`, 'image/jpeg', 6 * 60 * 1000, 'C');
    ok('C1 Foto-Dispatch angenommen', r.dispatched, `status=${r.status} ${JSON.stringify(r.body || {}).substring(0, 150)}`);
    if (r.dispatched) {
      ok(`C2 Foto-Analyse erfolgreich (${Math.round(r.secs)}s)`, r.done === true, JSON.stringify(r.error || {}).substring(0, 200));
      const a = r.result?.analysis || r.result || {};
      ok('C3 OCR-Ehrlichkeits-Hinweis gesetzt (ocrNotice)', !!(a.ocrNotice || r.result?.ocrNotice));
      const cid = r.result?.originalContractId || r.result?.contractId || a.contractId;
      if (cid) {
        const del = await api(`/contracts/${cid}`, { method: 'DELETE' }, token);
        ok(`C4 Aufgeräumt (Test-Vertrag gelöscht)`, del.status >= 200 && del.status < 300, `HTTP ${del.status}`);
      } else {
        console.log('  ⚠️ C4 contractId im Ergebnis nicht gefunden — bitte Test-Foto-Vertrag manuell löschen');
      }
    }
  }

  if (TESTS.includes('D')) {
    console.log('\n━━━ TEST D: Müll-Datei — muss SCHEITERN, aber mit verständlicher Meldung ━━━');
    const garbage = Buffer.from('Dies ist keine PDF. Nur Text. '.repeat(500));
    const r = await uploadAndPoll(token, garbage, 'kaputt.pdf', 'application/pdf', 4 * 60 * 1000, 'D');
    if (!r.dispatched) {
      // Sofort-Ablehnung ist auch ok — Hauptsache verständlich
      const msg = r.body?.message || '';
      ok(`D1 Sofort abgelehnt mit Meldung: "${msg.substring(0, 80)}"`, msg.length > 15);
    } else {
      ok('D1 Analyse korrekt GESCHEITERT (Müll darf nicht "erfolgreich" sein)', r.done === false);
      const msg = r.error?.message || '';
      console.log(`  → Fehlermeldung: "${msg.substring(0, 140)}"`);
      ok('D2 Meldung ist verständlich (kein nacktes "unavailable"/Stacktrace)',
        msg.length > 20 && !/stack|undefined|null/i.test(msg));
    }
  }

  if (TESTS.includes('E')) {
    console.log('\n━━━ TEST E: ASYNC Re-Analyse /contracts/:id/analyze?async=true (Cloudflare-sicher) ━━━');
    // Beweist den 27.07.-Fix: der Re-Analyse-Button laeuft jetzt als Hintergrund-Job (202+jobId),
    // haelt keine HTTP-Verbindung >100s offen. Setup wie Test B: frisches Unique-PDF NUR speichern,
    // dann async re-analysieren, pollen, Enrichment (legalPulse) pruefen, aufraeumen.
    const basePdf = fs.readFileSync(path.join(__dirname, '..', '..', 'test-contracts', 'real_factoring_eisqueen.pdf'));
    const uniquePdf = Buffer.concat([basePdf, Buffer.from(`\n% e2e-async-${Date.now()}\n`)]);
    let eId = null;
    try {
      const form = new FormData();
      form.append('file', new Blob([uniquePdf], { type: 'application/pdf' }), `pruef-async-${Date.now()}.pdf`);
      const up = await fetch(`${API}/upload`, { method: 'POST', body: form, headers: { Authorization: `Bearer ${token}` } });
      const upBody = await up.json().catch(() => null);
      eId = upBody?.contract?._id || upBody?.contractId || upBody?._id || null;
      ok(`E1 Frischer Vertrag NUR gespeichert (HTTP ${up.status})`, up.status === 200 && !!eId);

      if (eId) {
        const t0 = Date.now();
        const disp = await api(`/contracts/${eId}/analyze?async=true`, { method: 'POST', headers: { 'Content-Type': 'application/json' } }, token);
        ok(`E2 Async-Dispatch angenommen (202 + jobId)`, disp.status === 202 && !!disp.body?.jobId,
          `status=${disp.status} ${JSON.stringify(disp.body || {}).substring(0, 150)}`);
        if (disp.body?.jobId) {
          console.log(`  → [E] Job ${disp.body.jobId} dispatcht, polle...`);
          const out = await pollJob(disp.body.jobId, token, 6 * 60 * 1000);
          ok(`E3 Analyse erfolgreich (${Math.round(out.secs)}s, kein offener HTTP-Cut)`, out.done === true,
            JSON.stringify(out.error || {}).substring(0, 200));
          ok(`E4 ECHTER Fortschritt gesehen (max ${out.sawProgress}%, Etappe: ${String(out.sawStage || '—').substring(0, 30)})`,
            out.sawProgress >= 40 && !!out.sawStage);
          // Enrichment-Beweis: legalPulse muss nach der async Re-Analyse am Vertrag stehen
          const detail = await api(`/contracts/${eId}`, {}, token);
          const lp = detail.body?.contract?.legalPulse || detail.body?.legalPulse;
          ok(`E5 Enrichment lief (legalPulse gesetzt, healthScore=${lp?.healthScore ?? '—'})`,
            !!lp && typeof lp.healthScore === 'number');
        }
      }
    } finally {
      if (eId) {
        await sleep(3000);
        const del = await api(`/contracts/${eId}`, { method: 'DELETE' }, token);
        console.log(`  🧹 Aufgeräumt: Test-Vertrag gelöscht (HTTP ${del.status})`);
      }
    }
  }

  console.log(`\n${fail === 0 ? '🎉 PRÜFFAHRT BESTANDEN' : '💥 PRÜFFAHRT MIT BEFUNDEN'} — ${pass} bestanden, ${fail} fehlgeschlagen`);
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.error('💥 Prüffahrt-Crash:', e.message); process.exit(1); });
