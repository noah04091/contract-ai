// 📁 backend/utils/contractFileCleanup.js
// 🔒 Security-Triage 12.09.2026 (Master-Audit-Befund, DSGVO Art. 17):
// Vertrags- und Account-Löschung entfernten bisher NUR die Datenbank-Dokumente —
// die zugehörigen Dateien (Original-PDF, optimierte/gesiegelte Fassungen) blieben
// dauerhaft in S3 liegen. Dieser Helfer schließt die Lücke an EINER Stelle für
// alle vier Löschpfade (Einzel-Löschung, Bulk-Löschung, Selbst-Löschung des
// Accounts, Admin-Löschung einzeln/massenhaft).
//
// Grundsätze:
//  - Schlüssel stammen AUSSCHLIESSLICH aus den bereits besitz-/org-geprüften
//    Vertragsdokumenten selbst → es kann nie eine fremde Datei getroffen werden.
//  - Envelope-/Signatur-Dokumente haben ihren EIGENEN Lifecycle (envelopes.js +
//    Auto-Cleanup-Cron) und werden hier bewusst NICHT angefasst.
//  - Wirft NIE (die DB-Löschung ist dann bereits geschehen; ein S3-Fehler darf
//    die Antwort an den Nutzer nicht zerstören). Fehler werden ans Error-
//    Monitoring gemeldet, damit KEINE stille halbe Löschung entsteht.
//  - Idempotent: S3 DeleteObject auf einen nicht (mehr) existenten Schlüssel ist
//    erfolgreich (204) — ein wiederholter Lauf ist gefahrlos.
//  - Logging nur mit Zählwerten und contractIds, nie mit Dateiinhalten.

const { VERTRAG_KEY_FELDER } = require('./s3KeyOwnership');
const { deleteFiles } = require('../services/fileStorage');
const fs = require('fs').promises;

/**
 * Sammelt alle Datei-Referenzen aus einem oder mehreren Vertragsdokumenten.
 * @param {object|object[]} contracts
 * @returns {{ s3Keys: string[], localPaths: string[] }} dedupliziert, nur nicht-leere Strings
 */
function collectContractFileRefs(contracts) {
  const liste = Array.isArray(contracts) ? contracts : [contracts];
  const s3Keys = new Set();
  const localPaths = new Set();
  for (const c of liste) {
    if (!c || typeof c !== 'object') continue;
    for (const feld of VERTRAG_KEY_FELDER) {
      const wert = c[feld];
      if (typeof wert === 'string' && wert.trim() !== '') s3Keys.add(wert);
    }
    // LOCAL_UPLOAD-Fallback (S3 nicht konfiguriert/ausgefallen): Datei liegt lokal
    if (typeof c.filePath === 'string' && c.filePath.trim() !== '') localPaths.add(c.filePath);
  }
  return { s3Keys: [...s3Keys], localPaths: [...localPaths] };
}

/**
 * Löscht die Dateien der übergebenen (bereits DB-gelöschten) Verträge.
 * Wirft nie. Gibt Zählwerte zurück.
 * @param {object|object[]} contracts - die VOR dem DB-Delete geladenen Dokumente
 * @param {string} kontext - z. B. 'contract-delete', 'account-delete' (fürs Log)
 */
async function deleteContractFiles(contracts, kontext = 'unbekannt') {
  const ergebnis = { s3Deleted: 0, s3Failed: 0, localDeleted: 0, localFailed: 0, keys: 0 };
  try {
    const { s3Keys, localPaths } = collectContractFileRefs(contracts);
    ergebnis.keys = s3Keys.length + localPaths.length;
    if (ergebnis.keys === 0) return ergebnis;

    const s3 = await deleteFiles(s3Keys); // fehlertolerant je Key, wirft nicht
    ergebnis.s3Deleted = s3.deleted;
    ergebnis.s3Failed = s3.failed;

    for (const pfad of localPaths) {
      try { await fs.unlink(pfad); ergebnis.localDeleted++; }
      catch (e) {
        if (e && e.code === 'ENOENT') { ergebnis.localDeleted++; } // schon weg = idempotent ok
        else { ergebnis.localFailed++; }
      }
    }

    const anzahlVertraege = Array.isArray(contracts) ? contracts.length : 1;
    console.log(`🗑️ [FILE-CLEANUP:${kontext}] ${anzahlVertraege} Vertrag/Verträge → S3 ${ergebnis.s3Deleted}/${s3Keys.length} gelöscht, lokal ${ergebnis.localDeleted}/${localPaths.length}`);

    if (ergebnis.s3Failed > 0 || ergebnis.localFailed > 0) {
      // Keine stille halbe Löschung: sichtbar melden (nur Zählwerte, keine Inhalte)
      try {
        const { captureError } = require('../services/errorMonitoring');
        await captureError(new Error(`CONTRACT_FILE_CLEANUP_INCOMPLETE (${kontext})`), {
          source: 'contractFileCleanup',
          severity: 'high',
          metadata: { kontext, s3Failed: ergebnis.s3Failed, localFailed: ergebnis.localFailed, gesamt: ergebnis.keys }
        });
      } catch (_) { /* Monitoring darf den Löschpfad nie stören */ }
    }
  } catch (e) {
    console.error(`❌ [FILE-CLEANUP:${kontext}] unerwarteter Fehler:`, e?.message);
  }
  return ergebnis;
}

// Projektion, mit der Löschpfade die nötigen Felder VOR dem deleteMany laden
const FILE_CLEANUP_PROJECTION = VERTRAG_KEY_FELDER.reduce(
  (p, f) => { p[f] = 1; return p; },
  { filePath: 1 }
);

module.exports = { deleteContractFiles, collectContractFileRefs, FILE_CLEANUP_PROJECTION };
