// 🔬 Repro Foto-Analyse-Fehler (27.07.2026, Prüffahrt-Fund Test C):
// Foto-Upload stirbt in Prod nach ~68s mit generischem ANALYSIS_ERROR.
// Hier: EXAKT derselbe Weg lokal — Foto → Router-Konvertierung (imageToPdf) →
// handleEnhancedDeepLawyerAnalysisRequest mit Prod-Env + Live-Modell-Flag.
// Lokal sehen wir die ECHTE Fehlermeldung im Handler-Log.
// Aufräumen: erzeugten Vertrag am Ende wieder löschen.
// Aufruf: DOTENV_CONFIG_PATH=<main>/backend/.env ANALYZE_MODEL=gpt-5.4-2026-03-05 ANALYZE_EVIDENCE_ENABLED=true node -r dotenv/config scripts/reproPhotoFail.js
/* eslint-disable no-console */
const fs = require('fs');
const os = require('os');
const path = require('path');

(async () => {
  const sharp = require('sharp');
  const { convertImageToPdf } = require('../services/imageToPdf');
  const analyze = require('../routes/analyze');
  const database = require('../config/database');

  // 1) Exakt das Prüffahrt-Foto bauen
  const svg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900"><rect width="100%" height="100%" fill="#fff"/>${
    ['PRUEFFAHRT-WERKVERTRAG', 'zwischen Malermeister Kurt Lang, Kassel', 'und Sabine Vogt, Kassel.',
     'Paragraph 1: Streichen von Wohnzimmer und Flur, 55 qm, weiss matt.',
     'Paragraph 2: Verguetung pauschal 1.450 EUR, faellig 14 Tage nach Abnahme.',
     'Paragraph 3: Ausfuehrung in KW 40/2026. Es gilt deutsches Recht.']
      .map((l, i) => `<text x="60" y="${120 + i * 90}" font-family="Arial" font-size="40" fill="#111">${l}</text>`).join('')
  }</svg>`);
  const jpg = await sharp(svg).jpeg({ quality: 92 }).toBuffer();

  // 2) Router-Schritt nachbilden: Foto → PDF → Temp-Datei (wie analyze.js router.post "/")
  const { pdfBuffer } = await convertImageToPdf(jpg, 'image/jpeg');
  const tempPath = path.join(os.tmpdir(), `repro-foto-${Date.now()}.pdf`);
  fs.writeFileSync(tempPath, pdfBuffer);
  const reproName = `repro-foto-${Date.now()}.pdf`;
  console.log(`📸 Foto→PDF: ${pdfBuffer.length} bytes → ${tempPath}`);

  // 3) Pipeline mit fakeReq/fakeRes (exakt das Async-Muster)
  const fakeReq = {
    file: { path: tempPath, originalname: reproName, mimetype: 'application/pdf', size: pdfBuffer.length, filename: path.basename(tempPath) },
    user: { userId: process.env.E2E_USER_ID || '699c99de6ffba01ace3db87b' },
    body: {}, query: {}, fromPhoto: true,
    on: () => {}, removeListener: () => {}
  };
  const fakeRes = {
    headersSent: false, _statusCode: 200, _body: null,
    status(c) { this._statusCode = c; return this; },
    json(b) { this._body = b; this.headersSent = true; return this; }
  };

  const t0 = Date.now();
  await analyze.handleEnhancedDeepLawyerAnalysisRequest(fakeReq, fakeRes);
  const secs = ((Date.now() - t0) / 1000).toFixed(0);
  console.log(`\n════ ERGEBNIS nach ${secs}s: HTTP ${fakeRes._statusCode} ════`);
  console.log(JSON.stringify(fakeRes._body, null, 2).substring(0, 1200));

  // 4) Aufräumen: erzeugten Vertrag (+ Events) des Repro-Laufs löschen
  try {
    const db = await database.connect();
    const { ObjectId } = require('mongodb');
    const uid = new ObjectId(fakeReq.user.userId);
    const doc = await db.collection('contracts').findOne({ userId: uid, name: reproName });
    if (doc) {
      await db.collection('contracts').deleteOne({ _id: doc._id });
      const ev = await db.collection('contract_events').deleteMany({ contractId: doc._id });
      console.log(`🧹 Aufgeräumt: Vertrag ${doc._id} + ${ev.deletedCount} Events gelöscht`);
    } else {
      console.log('🧹 Kein Repro-Vertrag zum Aufräumen gefunden (Pipeline hat evtl. vor dem Speichern abgebrochen)');
    }
  } catch (e) { console.warn('🧹 Aufräumen fehlgeschlagen:', e.message); }

  process.exit(fakeRes._statusCode < 300 ? 0 : 1);
})().catch(e => { console.error('💥 Repro-Crash:', e.stack || e.message); process.exit(1); });
