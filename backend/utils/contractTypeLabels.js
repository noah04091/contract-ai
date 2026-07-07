// 🆕 28.05.2026 (A1): Mapping englisch → deutsch für KI-erkannte Vertragstypen.
//
// Quelle: Türsteher 2 in backend/routes/analyze.js (VALID_CONTRACT_TYPES, Z. ~1050)
// liefert englische Pilot-Typen aus GPT-4o-mini-Klassifikation. Für die V2-Vertrags-
// Liste und das Edit-Modal brauchen wir deutsche User-freundliche Bezeichnungen.
//
// Architektur: separates File damit alle Konsumenten (analyze.js Insert/Update,
// Re-Analyse, Migration-Scripts, ggf. später PDF-Export) dieselbe Quelle nutzen.

const CONTRACT_TYPE_LABELS = Object.freeze({
  factoring: 'Factoringvertrag',
  rental: 'Mietvertrag',
  employment: 'Arbeitsvertrag',
  purchase: 'Kaufvertrag',
  nda: 'Geheimhaltungsvereinbarung (NDA)',
  loan: 'Darlehens-/Kreditvertrag',
  service: 'Dienstleistungsvertrag',
  telecom: 'Telekommunikationsvertrag',
  insurance: 'Versicherungsvertrag',
  energy: 'Energieversorgungsvertrag',
  agb: 'Allgemeine Geschäftsbedingungen (AGB)',
  leasing: 'Leasingvertrag',
  license: 'Lizenzvertrag',
  avv: 'Auftragsverarbeitungsvertrag (AVV)',
  franchise: 'Franchisevertrag',
  agency: 'Agenturvertrag',           // 13.06.2026: Pilot-Typ (deckt Handelsvertreter + Kreativagentur)
  aufhebung: 'Aufhebungsvertrag',     // 13.06.2026: Pilot-Typ (einvernehmliche Beendigung Arbeitsverhältnis)
  other: 'Sonstiger Vertrag'
});

/**
 * Mappt einen KI-erkannten Pilot-Typ auf seine deutsche Bezeichnung.
 * - null/undefined → null (Anzeige fällt im Frontend auf '—')
 * - Bekannter Typ → deutsche Bezeichnung
 * - Unbekannter Typ → 'Sonstiger Vertrag' (Safety-Net falls KI-Pilots erweitert werden)
 */
function pilotTypeToLabel(pilotType) {
  if (pilotType == null || typeof pilotType !== 'string') return null;
  const key = pilotType.toLowerCase().trim();
  if (!key) return null;
  return CONTRACT_TYPE_LABELS[key] || CONTRACT_TYPE_LABELS.other;
}

// 🆕 Welle 1 (07.07.2026): Deutsche Bezeichnungen für einseitige Schreiben (documentType=LETTER).
// Quelle: VALID_LETTER_TYPES in backend/routes/analyze.js (Türsteher 2).
const LETTER_TYPE_LABELS = Object.freeze({
  kuendigung_erhalten: 'Kündigungsschreiben (erhalten)',
  abmahnung: 'Abmahnung',
  behoerdenbescheid: 'Behördenbescheid',
  mahnbescheid: 'Gerichtlicher Mahnbescheid',
  mahnung: 'Mahnung',
  sonstiges_schreiben: 'Schreiben'
});

/**
 * Mappt einen KI-erkannten letterType auf seine deutsche Bezeichnung.
 * null/unbekannt → 'Schreiben' (nie null: die Liste soll für LETTER nie '—' zeigen).
 */
function letterTypeToLabel(letterType) {
  if (letterType == null || typeof letterType !== 'string') return LETTER_TYPE_LABELS.sonstiges_schreiben;
  const key = letterType.toLowerCase().trim();
  return LETTER_TYPE_LABELS[key] || LETTER_TYPE_LABELS.sonstiges_schreiben;
}

module.exports = {
  CONTRACT_TYPE_LABELS,
  pilotTypeToLabel,
  LETTER_TYPE_LABELS,
  letterTypeToLabel
};
