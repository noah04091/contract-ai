// 📁 backend/utils/escapeHtml.js
// 03.09.2026 (Mail-Knopf-Fix): zentraler HTML-Escaper — extrahiert aus
// services/calendarNotifier.js (dort war er lokal und nicht exportiert; die
// neue Mail-Bestätigungsseite hätte sonst eine Kopie gebraucht).
// Escapt & < > " ' — ausreichend für Textknoten UND quotierte Attribute.
function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

module.exports = { escapeHtml };
