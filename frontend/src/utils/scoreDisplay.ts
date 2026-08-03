// 🎯 03.08.2026: Ein Vertrags-Risiko-Score (0–100, "Kritisch/Solide/…") ist nur für
// vertragsartige Dokumente aussagekräftig. Auf einer Lohnabrechnung, Rechnung, Quittung,
// Tabelle oder einem unzuordnbaren Dokument wäre so eine Zahl irreführend. Diese zentrale
// Regel entscheidet überall gleich, ob der Score gezeigt oder ein neutraler Zustand
// ("Kein Risiko-Score") gezeigt wird. NUR Anzeige — der gespeicherte Score-Wert bleibt
// unangetastet (Legal Pulse, Status, PDF, Filter nutzen ihn weiter).

// Akzeptiert entweder die aufgelöste Dokumentklasse (docClass aus classifyDocType:
// CONTRACT/AGB/INVOICE/RECEIPT/TABLE_DOCUMENT/FINANCIAL_DOCUMENT/LETTER/UNKNOWN)
// ODER den rohen Backend-documentType-Enum (ohne AGB — das kommt nur als contract='agb').
export function isRiskScoreMeaningful(
  docClassOrType?: string | null,
  contractType?: string | null
): boolean {
  const dc = (docClassOrType || "").toUpperCase().trim();
  if (dc === "CONTRACT" || dc === "AGB" || dc === "LETTER") return true;
  if ((contractType || "").toLowerCase().trim() === "agb") return true;
  return false;
}

// Kehrseite als sprechender Name für die Anzeige-Logik.
export function isNonContractDocument(
  docClassOrType?: string | null,
  contractType?: string | null
): boolean {
  return !isRiskScoreMeaningful(docClassOrType, contractType);
}

export const NO_SCORE_RATING = "Kein Risiko-Score";
export const NO_SCORE_SUBLINE = "Kein Vertragsdokument";
