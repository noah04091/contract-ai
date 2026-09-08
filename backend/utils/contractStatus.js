// 📁 backend/utils/contractStatus.js
// Zentrale Status-Wahrheit — hierher AUSGELAGERT aus routes/contracts.js (08.09.2026, QA-Punkt 1),
// damit AUCH die Dashboard-Summary (routes/dashboardNotifications.js) dieselbe Zählregel nutzt
// und nie wieder eine zweite "aktiv"-Definition entsteht. Die Funktion selbst ist UNVERÄNDERT.

// 📊 Backend-seitige Status-Berechnung — SINGLE SOURCE für Filter, Sidebar-Counts und das
// an jeden Vertrag angehängte `computedStatus` (= Detail-Anzeige).
// ⚠️⚠️ MUSS 1:1 IDENTISCH bleiben mit `calculateSmartStatus` in:
//        - frontend/src/pages/ContractsV2.tsx   (Listen-Badge)
//        - frontend/src/pages/Contracts.tsx     (V1-Kopie)
//      Bei JEDER Änderung der Status-Logik ALLE DREI Funktionen gleich anpassen —
//      sonst weichen Liste, Detail, Filter und Zähler wieder voneinander ab.
function calculateSmartStatusBackend(contract) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 0. 📨 Einseitiges Schreiben (Welle 1, 07.07.2026) — MUSS als allererster Branch
  // stehen (VOR Kündigungs-/gekuendigtZum-Logik): ein erhaltenes Kündigungsschreiben
  // ist weder „Gekündigt" noch „Aktiv", sondern schlicht „Erhalten".
  if (contract.documentType === 'LETTER' || contract.documentCategory === 'letter') {
    return 'Erhalten';
  }

  // 1. Kündigungsbestätigung
  if (contract.documentCategory === 'cancellation_confirmation' || contract.gekuendigtZum) {
    const gekuendigtDate = contract.gekuendigtZum ? new Date(contract.gekuendigtZum) : null;
    if (gekuendigtDate) {
      gekuendigtDate.setHours(0, 0, 0, 0);
      if (gekuendigtDate < today) return 'Beendet';
      return 'Gekündigt';
    }
    return 'Gekündigt';
  }

  // 1.5 Via Contract AI gekündigt
  if (contract.status === 'gekündigt' || contract.cancellationId) {
    return contract.cancellationConfirmed ? 'Gekündigt ✓' : 'Gekündigt — offen';
  }

  // 2. Rechnung
  // 🛠️ 24.08.2026 (Noahs Fund): NUR echte Rechnungen bekommen den Zahl-Status „Offen/Bezahlt".
  // Vorher haderte das an `documentCategory === 'invoice'` — dieser grobe Topf enthielt auch
  // RECEIPT (Kontoauszug/Quittung) und TABLE_DOCUMENT (Bestell-Tabelle), die dann faelschlich
  // „Offen" trugen. Gleichzeitig HATTEN 30 echte Rechnungen `documentType='INVOICE'`, aber
  // `documentCategory=undefined` → die bekamen den Zahl-Status GAR NICHT. Das praezise Signal
  // ist `documentType === 'INVOICE'`: schliesst Beleg/Tabelle aus UND erfasst alle echten Rechnungen.
  if (contract.documentType === 'INVOICE') {
    return contract.paymentStatus === 'paid' ? 'Bezahlt' : 'Offen';
  }

  // 2.5 🔒 Manueller Override (nur wenn gesetzt) — nach Kündigung/Rechnung, vor Datums-Logik
  // typeof-Guard: schützt vor 500-Crash, falls status mal kein String ist (Daten-Korruption)
  if (contract.statusOverride && typeof contract.status === 'string') {
    const s = contract.status.toLowerCase();
    if (['aktiv', 'gültig', 'laufend', 'active'].includes(s)) return 'Aktiv';
    if (s === 'gekündigt' || s === 'gekuendigt') return 'Gekündigt';
    if (['beendet', 'abgelaufen', 'expired'].includes(s)) return 'Beendet';
    if (['läuft ab', 'bald fällig', 'bald_ablaufend'].includes(s)) return 'Läuft ab';
    if (s === 'pausiert') return 'Pausiert';
    if (['entwurf', 'draft'].includes(s)) return 'Entwurf';
    return 'Aktiv';
  }

  // 3. Ablaufdatum
  const expiryDate = contract.expiryDate ? new Date(contract.expiryDate) : null;
  if (expiryDate && !isNaN(expiryDate.getTime())) {
    expiryDate.setHours(0, 0, 0, 0);
    const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilExpiry < 0) {
      // Plausibility Check: Kürzlich hochgeladen mit altem Datum
      const createdAt = contract.createdAt ? new Date(contract.createdAt) : null;
      const daysSinceCreation = createdAt
        ? Math.ceil((today.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24))
        : 999;
      if (daysSinceCreation <= 14 && daysUntilExpiry < -60) return 'Aktiv';
      return 'Beendet';
    }
    if (daysUntilExpiry <= 30) return 'Läuft ab';
    return 'Aktiv';
  }

  // 4. Manueller Status (typeof-Guard gegen Nicht-String-status → kein 500-Crash)
  if (typeof contract.status === 'string') {
    const status = contract.status.toLowerCase();
    if (['aktiv', 'gültig', 'laufend'].includes(status)) return 'Aktiv';
    if (status === 'gekündigt') return 'Gekündigt';
    if (['beendet', 'abgelaufen', 'expired'].includes(status)) return 'Beendet';
    if (['läuft ab', 'bald fällig'].includes(status)) return 'Läuft ab';
    if (status === 'pausiert') return 'Pausiert';
    if (['entwurf', 'draft'].includes(status)) return 'Entwurf';
  }

  // 5. Generierte/Optimierte Verträge
  if (contract.isGenerated) return 'Entwurf';
  if (contract.isOptimized) return 'Optimiert';

  // 6. Nicht analysiert
  if (!contract.analyzed && !contract.contractScore) return 'Neu';

  // 7. Fallback
  return 'Aktiv';
}


// Felder, die calculateSmartStatusBackend liest — als gemeinsame Projektion für alle
// Aufrufer, die Verträge NUR zum Status-Zählen laden (schlank, keine Analyse-Blobs):
const SMART_STATUS_PROJECTION = {
  expiryDate: 1, status: 1, statusOverride: 1, documentCategory: 1, documentType: 1,
  letterType: 1, gekuendigtZum: 1, cancellationId: 1, cancellationConfirmed: 1,
  isGenerated: 1, isOptimized: 1, analyzed: 1, contractScore: 1,
  paymentStatus: 1, createdAt: 1
};

module.exports = { calculateSmartStatusBackend, SMART_STATUS_PROJECTION };
