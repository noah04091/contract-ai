// utils/formatProvider.js
//
// Provider/Anbieter kommt historisch in DREI Formen vor: als String (Alt-Verträge),
// als Objekt {name, displayName, confidence, extractedFromText, source} (KI-Extraktion
// seit analyze.js/contractAnalyzer.js) oder null. Wird das Objekt roh in Text/HTML
// interpoliert, steht "[object Object]" in der Mail (real passiert am 24.07.2026,
// CANCEL_WARNING "Frist in 7 Tagen"). Dieser Helfer ist die EINE Stelle, die alle
// Formen auf einen anzeigbaren String normalisiert — identische Logik wie das lokale
// normalizeProvider in routes/cancellations.js, hier zentral für alle Verbraucher.
function formatProvider(provider) {
  if (!provider) return "";
  if (typeof provider === "string") return provider;
  if (typeof provider === "object") return provider.displayName || provider.name || "";
  return String(provider);
}

module.exports = { formatProvider };
