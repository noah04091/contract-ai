// 📁 backend/utils/generateInvoiceNumber.js

// Mindest-Startnummer: damit Rechnungsnummern „etabliert" wirken (nicht erkennbar, dass es erst
// die ~60. Rechnung ist), ohne die Eindeutigkeit/Fortlaufendheit zu verletzen (§14 UStG-konform).
// Einmaliger Sprung auf diese Basis, danach läuft der Zähler ganz normal weiter (+1 je Rechnung).
const MIN_INVOICE_NUMBER = 25000;

function generateInvoiceNumber(latestNumber = 0) {
  const year = new Date().getFullYear();
  // Immer mindestens MIN_INVOICE_NUMBER; ist der bisherige Zähler bereits höher, zählt er normal weiter.
  // Math.max garantiert eine MONOTON steigende, eindeutige Nummer (keine Duplikate, kein Rückwärts).
  const next = Math.max((Number(latestNumber) || 0) + 1, MIN_INVOICE_NUMBER);
  const number = next.toString().padStart(5, '0');
  return `RE-${year}-${number}`;
}

module.exports = generateInvoiceNumber;
