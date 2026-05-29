// ============================================================
// contractEditableFields.ts
//
// Shared definition für die editierbaren Eckdaten-Felder eines Vertrags.
// Wird von BEIDEN Stellen verwendet, an denen Eckdaten editiert werden:
//   1. NewContractDetailsModal.tsx (Popup aus der /contracts Liste)
//   2. ContractDetailsV2.tsx (Dedizierte /contracts/:id Seite)
//
// Dadurch ist garantiert, dass beide Komponenten dieselben Felder,
// Labels, Optionen und Logik verwenden — kein Drift mehr möglich.
//
// Bei neuen Feldern: NUR HIER hinzufügen, beide Stellen profitieren automatisch.
// ============================================================

// ----------------------------------------
// DROPDOWN OPTIONS
// ----------------------------------------
export const KUENDIGUNG_OPTIONS = [
  { value: "Keine Kündigungsfrist", label: "Keine Kündigungsfrist" },
  { value: "2 Wochen", label: "2 Wochen" },
  { value: "1 Monat", label: "1 Monat" },
  { value: "4 Wochen", label: "4 Wochen" },
  { value: "6 Wochen", label: "6 Wochen" },
  { value: "2 Monate", label: "2 Monate" },
  { value: "3 Monate", label: "3 Monate" },
  { value: "3 Monate zum Quartalsende", label: "3 Monate zum Quartalsende" },
  { value: "3 Monate zum Monatsende", label: "3 Monate zum Monatsende" },
  { value: "6 Monate", label: "6 Monate" },
  { value: "6 Monate zum Jahresende", label: "6 Monate zum Jahresende" },
  { value: "12 Monate", label: "12 Monate" },
  { value: "Unbefristet", label: "Unbefristet" },
];

export const LAUFZEIT_OPTIONS = [
  { value: "Unbefristet", label: "Unbefristet" },
  { value: "1 Monat", label: "1 Monat" },
  { value: "3 Monate", label: "3 Monate" },
  { value: "6 Monate", label: "6 Monate" },
  { value: "1 Jahr", label: "1 Jahr" },
  { value: "2 Jahre", label: "2 Jahre" },
  { value: "3 Jahre", label: "3 Jahre" },
  { value: "5 Jahre", label: "5 Jahre" },
  { value: "10 Jahre", label: "10 Jahre" },
  { value: "24 Monate mit Verlängerung", label: "24 Monate + auto. Verlängerung" },
  { value: "12 Monate mit Verlängerung", label: "12 Monate + auto. Verlängerung" },
  { value: "Einmalig", label: "Einmalig (kein Abo)" },
];

export const PAYMENT_FREQUENCY_OPTIONS = [
  { value: "Monatlich", label: "Monatlich" },
  { value: "Vierteljährlich", label: "Vierteljährlich" },
  { value: "Halbjährlich", label: "Halbjährlich" },
  { value: "Jährlich", label: "Jährlich" },
  { value: "Einmalig", label: "Einmalig" },
];

export const PAYMENT_METHOD_OPTIONS = [
  { value: "SEPA-Lastschrift", label: "SEPA-Lastschrift" },
  { value: "Überweisung", label: "Überweisung" },
  { value: "Kreditkarte", label: "Kreditkarte" },
  { value: "PayPal", label: "PayPal" },
  { value: "Bar", label: "Bar" },
  { value: "Rechnung", label: "Rechnung" },
];

// ----------------------------------------
// TYPES
// ----------------------------------------
export type EditableFieldType = 'text' | 'number' | 'date' | 'dropdown';

export interface EditableField {
  key: string;
  label: string;
  type: EditableFieldType;
  options?: { value: string; label: string }[];
  hasValue: () => boolean;
  displayValue: () => string;
  rawValue: () => string;
}

/**
 * Minimale Contract-Shape, die der Factory genügt.
 * Beide Komponenten haben reichere Contract-Typen, aber alle benötigen
 * (mindestens) diese Felder, damit createEditableFields funktioniert.
 */
export interface EditableContractShape {
  contractType?: string;
  contractTypeLabel?: string; // 🆕 A1 (28.05.2026): KI-deutsche-Bezeichnung
  anbieter?: string;
  vertragsnummer?: string;
  gekuendigtZum?: string;
  kuendigung?: string;
  laufzeit?: string;
  startDate?: string;
  expiryDate?: string;
  kosten?: number;
  paymentAmount?: number; // 🆕 A3 (29.05.2026): KI-extrahierter Betrag (Fallback für kosten)
  customerNumber?: string;
  paymentFrequency?: string;
  paymentMethod?: string;
  provider?: {
    displayName?: string;
    name?: string;
  };
}

// ----------------------------------------
// HELPER: Placeholder-Strings als leer behandeln
// ----------------------------------------
/**
 * Erkennt String-Werte, die zwar vorhanden sind, aber semantisch "kein Wert" bedeuten.
 * Damit verschwindet z.B. "Unbekannt" oder "Nicht angegeben" automatisch aus der UI,
 * statt als Pseudo-Wert angezeigt zu werden. Ergebnis: nur Felder mit echten Daten erscheinen.
 */
function isEmptyValue(value: string | undefined | null): boolean {
  if (!value) return true;
  const normalized = value.trim().toLowerCase();
  if (normalized === '') return true;
  const placeholders = [
    'unbekannt',
    'nicht angegeben',
    'keine angabe',
    'k.a.',
    'k. a.',
    'n/a',
    'na',
    '—',
    '-',
    '–',
  ];
  return placeholders.includes(normalized);
}

// ----------------------------------------
// FACTORY
// ----------------------------------------
/**
 * Erzeugt die Liste aller editierbaren Felder für einen Vertrag.
 *
 * Wichtig: Diese Funktion wird auf jedem Render neu aufgerufen, damit die
 * geschlossenen `contract`-Referenzen immer aktuell sind. NICHT in useMemo
 * kapseln, sonst werden Updates nicht reflektiert.
 *
 * Die Reihenfolge ist die offizielle UI-Reihenfolge — beide Komponenten
 * rendern die Felder in dieser Reihenfolge.
 */
export function createEditableFields(
  contract: EditableContractShape,
  formatDate: (dateString: string) => string
): EditableField[] {
  // Helper für anbieter (mehrere Quellen)
  const anbieterValue = () => contract.anbieter || contract.provider?.displayName || contract.provider?.name || '';

  return [
    {
      key: 'contractType', label: 'Vertragstyp', type: 'text',
      // 🆕 A1 (28.05.2026): KI-deutsche-Bezeichnung (contractTypeLabel) hat Vorrang.
      // Fallback auf altes Top-Level contractType (recurring/one-time-Semantik) für
      // Backwards-Compat alter Daten. Save schreibt weiter in 'contractType' (key
      // unverändert für Spalten-Konfigurator-Konsistenz) — User-Eingaben überschreiben
      // dann manuell den KI-Wert in der Anzeige bis zur nächsten Re-Analyse.
      hasValue: () => !isEmptyValue(contract.contractTypeLabel) || !isEmptyValue(contract.contractType),
      displayValue: () => contract.contractTypeLabel || contract.contractType || '',
      rawValue: () => contract.contractTypeLabel || contract.contractType || '',
    },
    {
      key: 'anbieter', label: 'Anbieter', type: 'text',
      hasValue: () => !isEmptyValue(anbieterValue()),
      displayValue: () => anbieterValue(),
      rawValue: () => anbieterValue(),
    },
    {
      key: 'vertragsnummer', label: 'Vertragsnummer', type: 'text',
      hasValue: () => !isEmptyValue(contract.vertragsnummer),
      displayValue: () => contract.vertragsnummer || '',
      rawValue: () => contract.vertragsnummer || '',
    },
    {
      key: 'gekuendigtZum', label: 'Gekündigt zum', type: 'date',
      hasValue: () => !isEmptyValue(contract.gekuendigtZum),
      displayValue: () => contract.gekuendigtZum ? formatDate(contract.gekuendigtZum) : '',
      rawValue: () => contract.gekuendigtZum || '',
    },
    {
      key: 'kuendigung', label: 'Kündigungsfrist', type: 'dropdown', options: KUENDIGUNG_OPTIONS,
      hasValue: () => !isEmptyValue(contract.kuendigung),
      displayValue: () => contract.kuendigung || '',
      rawValue: () => contract.kuendigung || '',
    },
    {
      key: 'laufzeit', label: 'Laufzeit', type: 'dropdown', options: LAUFZEIT_OPTIONS,
      hasValue: () => !isEmptyValue(contract.laufzeit),
      displayValue: () => contract.laufzeit || '',
      rawValue: () => contract.laufzeit || '',
    },
    {
      key: 'startDate', label: 'Vertragsbeginn', type: 'date',
      hasValue: () => !isEmptyValue(contract.startDate),
      displayValue: () => contract.startDate ? formatDate(contract.startDate) : '',
      rawValue: () => contract.startDate || '',
    },
    {
      key: 'expiryDate', label: 'Enddatum', type: 'date',
      hasValue: () => !isEmptyValue(contract.expiryDate),
      displayValue: () => contract.expiryDate ? formatDate(contract.expiryDate) : '',
      rawValue: () => contract.expiryDate || '',
    },
    {
      key: 'kosten', label: 'Monatliche Kosten', type: 'number',
      // 🆕 A3 (29.05.2026): Fallback auf paymentAmount (KI-extrahiert).
      // User-Eingabe (kosten) hat Vorrang, KI-Wert (paymentAmount) zeigt sich nur wenn
      // User noch nichts eingetragen hat. Save schreibt weiter in 'kosten' (key unverändert).
      hasValue: () => (contract.kosten != null && contract.kosten > 0) || (contract.paymentAmount != null && contract.paymentAmount > 0),
      displayValue: () => {
        const value = contract.kosten ?? contract.paymentAmount;
        return value != null && value > 0
          ? value.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })
          : '';
      },
      rawValue: () => {
        const value = contract.kosten ?? contract.paymentAmount;
        return value != null ? String(value) : '';
      },
    },
    {
      key: 'customerNumber', label: 'Kundennummer', type: 'text',
      hasValue: () => !isEmptyValue(contract.customerNumber),
      displayValue: () => contract.customerNumber || '',
      rawValue: () => contract.customerNumber || '',
    },
    {
      key: 'paymentFrequency', label: 'Zahlungs-Häufigkeit', type: 'dropdown', options: PAYMENT_FREQUENCY_OPTIONS,
      hasValue: () => !isEmptyValue(contract.paymentFrequency),
      displayValue: () => contract.paymentFrequency || '',
      rawValue: () => contract.paymentFrequency || '',
    },
    {
      key: 'paymentMethod', label: 'Zahlungsmethode', type: 'dropdown', options: PAYMENT_METHOD_OPTIONS,
      hasValue: () => !isEmptyValue(contract.paymentMethod),
      displayValue: () => contract.paymentMethod || '',
      rawValue: () => contract.paymentMethod || '',
    },
  ];
}
