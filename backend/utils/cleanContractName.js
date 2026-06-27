// 📁 backend/utils/cleanContractName.js
// Säubert rohe Datei-/Vertragsnamen NUR FÜR DIE ANZEIGE (Dateiendung, Unix-Timestamp-
// Präfix, YYMMDD-Präfix, Unterstriche). Spiegelt 1:1 die Logik der Legal-Pulse-Mails
// (cleanName in jobs/pulseV2Radar.js), damit Glocke und E-Mail denselben Namen zeigen.
// Rein für die Anzeige — verändert KEINE gespeicherten Daten.
//
// Beispiele:
//   "1776950971378-mustervertrag_contract_ai_test.docx" → "mustervertrag contract ai test"
//   "260414_Darlehensvertrag_AutoEuropa.pdf"            → "Darlehensvertrag AutoEuropa"

const { fixUtf8Filename, isPlaceholderDocName } = require("./fixUtf8");

function cleanContractName(name, fallback = "Unbenannter Vertrag") {
  if (!name || typeof name !== "string") return fallback;
  // 1. Mojibake reparieren: "Obst & GemÃ¼se" → "Obst & Gemüse" (Latin1→UTF8, mit Safeguards)
  const fixed = fixUtf8Filename(name);
  // 2. Platzhalter/Müll ($value.pdf, undefined.pdf, nur-Endung) → Fallback statt Müll-Anzeige
  if (isPlaceholderDocName(fixed)) return fallback;
  // 3. Für die Anzeige säubern
  const cleaned = fixed
    // NUR echte Dokument-Endungen abschneiden — NICHT Datums-/Zahl-Endungen wie "…26.6.2026".
    // (Bewusst strenger als die ältere cleanName-Logik der Mails, die ".2026" mit-abschnitt.)
    .replace(/\.(pdf|docx?|txt|rtf|odt|pages|xlsx?|pptx?|csv|png|jpe?g)$/i, "")
    .replace(/^\d{10,13}[-_]/, "")     // Unix-Timestamp-Präfix (z. B. 1776950971378-)
    .replace(/^\d{6}_/, "")            // YYMMDD_ Präfix
    .replace(/_/g, " ")               // Unterstriche → Leerzeichen
    .trim();
  return cleaned || fallback;
}

module.exports = { cleanContractName };
