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

// 🎯 03.08.2026 (Ehrlichkeits-Prinzip): Deutsche Bezeichnungen für ERKANNTE Nicht-
// Vertrags-Dokumenttypen. Diese sind ehrliche Benennungen dessen, was tatsächlich
// erkannt wurde — KEINE geratenen Vertragstypen. UNKNOWN bleibt ehrlich „unbekannt".
const DOCUMENT_TYPE_LABELS = Object.freeze({
  INVOICE: 'Rechnung',
  RECEIPT: 'Quittung',
  TABLE_DOCUMENT: 'Tabellen-Dokument',
  FINANCIAL_DOCUMENT: 'Finanzdokument',
  UNKNOWN: 'Unbekannter Dokumenttyp'
});

// Kill-Switch: HONEST_DOCTYPE_LABEL_ENABLED=false → altes Verhalten (Nicht-LETTER
// bekommt IMMER pilotTypeToLabel(contractType), auch geratene Typen bei Nicht-Verträgen).
const HONEST_DOCTYPE_LABEL_ENABLED = process.env.HONEST_DOCTYPE_LABEL_ENABLED !== 'false';

// 🧠 Phase 2 (03.08.2026): Für UNKNOWN-Dokumente das Label aus der KI-EIGENEN
// Einschätzung (documentCharacterization.description) ableiten, statt „Unbekannt".
// Kein Prompt-Eingriff — nutzt nur das Feld, das die KI ohnehin liefert.
const AI_TYPE_LABEL_ENABLED = process.env.AI_TYPE_LABEL_ENABLED !== 'false';

// 🎚️ Verteidigungs-Gate: die KI-Ableitung nur bei ausreichender Klassifikator-Konfidenz
// nutzen. Das Doc-Gate lässt zwar nur ≥0.65 als UNKNOWN durch (echte Dokumente); dieser
// Zusatz-Deckel hält Phase 2 auch dann ehrlich, falls je ein Niedrig-Konfidenz-Schrott
// (Rezept/Flyer: Klassifikator-Konfidenz ~0) den UNKNOWN-Pfad erreicht → „Unbekannt".
const AI_TYPE_MIN_CONFIDENCE = 0.5;
function normConfidence(c) {
  if (typeof c !== 'number' || isNaN(c)) return null;
  return c > 1 ? c / 100 : c; // 0-100 ODER 0-1 akzeptieren
}

// Signalisiert die KI SELBST Unsicherheit? Dann bleibt es ehrlich „unbekannt"
// (echter Schrott behält den Banner + „Unbekannter Dokumenttyp").
const UNCERTAIN_CHARACTERIZATION_RE = /(unbekannt|unklar|nicht eindeutig|nicht sicher|nicht.{0,14}(erkenn|zuordn|bestimm|klassifiz|identifiz)|l[aä]sst sich nicht|kein(e|en)?\s+(klar|eindeutig|zuordn)|schwer.{0,12}zuzuordnen|kann.{0,20}nicht.{0,20}(zuordn|einordn))/i;

function isUncertainCharacterization(description) {
  if (!description || typeof description !== 'string') return true;
  const s = description.trim();
  if (!s) return true;
  return UNCERTAIN_CHARACTERIZATION_RE.test(s);
}

// Leitet aus der freien KI-Beschreibung ein kurzes, ehrliches Typ-Label ab.
// "Entgeltabrechnung / Lohnabrechnung Februar 2026" → "Entgeltabrechnung".
function deriveTypeLabelFromCharacterization(description) {
  if (!description || typeof description !== 'string') return null;
  let s = description.replace(/\s+/g, ' ').trim();
  if (!s) return null;
  // Ersten Sinnabschnitt vor einem Trenner nehmen (/, (, Gedankenstrich, Doppelpunkt, Komma)
  s = s.split(/\s*[/(–—:,]\s*/)[0].trim();
  // Nachlaufende Zeit-/Monatsangaben abschneiden ("… Februar 2026", "… zum 30.09.2026")
  s = s.replace(/\s+(vom|zum|für|per|ab)\s+.*$/i, '').trim();
  if (s.length > 42) s = s.slice(0, 42).replace(/\s+\S*$/, '').trim();
  return s || null;
}

/**
 * 🎯 Phase 1 (03.08.2026) — Ehrliches Anzeige-Label für den Dokumenttyp.
 * Grundsatz: NIE einen Vertragstyp raten. Ein „…vertrag"-Label gibt es nur, wenn das
 * Dokument auch WIRKLICH als Vertrag (CONTRACT) erkannt wurde.
 *  - LETTER   → letterTypeToLabel (wie bisher)
 *  - CONTRACT → pilotTypeToLabel(contractType) (KI-Vertragstyp; null → Frontend zeigt '—')
 *  - erkannter Nicht-Vertrag (INVOICE/RECEIPT/TABLE/FINANCIAL) → ehrlicher Dokumenttyp
 *  - UNKNOWN / alles andere → „Unbekannter Dokumenttyp" (kein Rateversuch!)
 * Berührt NUR die Anzeige (Label/Name), nicht die Analyse-Qualität oder das interne
 * contractType-Feld. Bei Flag=false: exakt altes Verhalten.
 */
function resolveDisplayTypeLabel({ documentType, contractType, letterType, characterizationDescription, classificationConfidence } = {}) {
  const dt = typeof documentType === 'string' ? documentType.toUpperCase().trim() : '';
  if (dt === 'LETTER') return letterTypeToLabel(letterType);
  if (!HONEST_DOCTYPE_LABEL_ENABLED) return pilotTypeToLabel(contractType) || null;
  if (dt === 'CONTRACT') return pilotTypeToLabel(contractType) || null;
  // Erkannter Nicht-Vertrag (INVOICE/RECEIPT/TABLE/FINANCIAL) → ehrliches Enum-Label.
  const enumLabel = DOCUMENT_TYPE_LABELS[dt];
  if (enumLabel && dt !== 'UNKNOWN') return enumLabel;
  // 🧠 Phase 2: UNKNOWN → aus KI-EIGENER Einschätzung ableiten, außer (a) die KI ist selbst
  // unsicher ODER (b) die Klassifikator-Konfidenz ist zu niedrig (Schrott-Verdacht). So wird
  // eine Lohnabrechnung positiv als „Entgeltabrechnung" gelabelt; echter Schrott bleibt „Unbekannt".
  const conf = normConfidence(classificationConfidence);
  const confOk = conf == null || conf >= AI_TYPE_MIN_CONFIDENCE;
  if (AI_TYPE_LABEL_ENABLED && confOk && !isUncertainCharacterization(characterizationDescription)) {
    const aiLabel = deriveTypeLabelFromCharacterization(characterizationDescription);
    if (aiLabel) return aiLabel;
  }
  return DOCUMENT_TYPE_LABELS.UNKNOWN;
}

module.exports = {
  CONTRACT_TYPE_LABELS,
  pilotTypeToLabel,
  LETTER_TYPE_LABELS,
  letterTypeToLabel,
  DOCUMENT_TYPE_LABELS,
  resolveDisplayTypeLabel,
  isUncertainCharacterization,
  deriveTypeLabelFromCharacterization
};
