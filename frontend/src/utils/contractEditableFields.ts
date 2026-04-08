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
  anbieter?: string;
  vertragsnummer?: string;
  gekuendigtZum?: string;
  kuendigung?: string;
  laufzeit?: string;
  startDate?: string;
  expiryDate?: string;
  kosten?: number;
  provider?: {
    displayName?: string;
    name?: string;
  };
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
  return [
    {
      key: 'contractType', label: 'Vertragstyp', type: 'text',
      hasValue: () => !!contract.contractType,
      displayValue: () => contract.contractType || '',
      rawValue: () => contract.contractType || '',
    },
    {
      key: 'anbieter', label: 'Anbieter', type: 'text',
      hasValue: () => !!(contract.anbieter || contract.provider?.displayName || contract.provider?.name),
      displayValue: () => contract.anbieter || contract.provider?.displayName || contract.provider?.name || '',
      rawValue: () => contract.anbieter || contract.provider?.displayName || contract.provider?.name || '',
    },
    {
      key: 'vertragsnummer', label: 'Vertragsnummer', type: 'text',
      hasValue: () => !!contract.vertragsnummer,
      displayValue: () => contract.vertragsnummer || '',
      rawValue: () => contract.vertragsnummer || '',
    },
    {
      key: 'gekuendigtZum', label: 'Gekündigt zum', type: 'date',
      hasValue: () => !!contract.gekuendigtZum,
      displayValue: () => contract.gekuendigtZum ? formatDate(contract.gekuendigtZum) : '',
      rawValue: () => contract.gekuendigtZum || '',
    },
    {
      key: 'kuendigung', label: 'Kündigungsfrist', type: 'dropdown', options: KUENDIGUNG_OPTIONS,
      hasValue: () => !!contract.kuendigung,
      displayValue: () => contract.kuendigung || '',
      rawValue: () => contract.kuendigung || '',
    },
    {
      key: 'laufzeit', label: 'Laufzeit', type: 'dropdown', options: LAUFZEIT_OPTIONS,
      hasValue: () => !!contract.laufzeit,
      displayValue: () => contract.laufzeit || '',
      rawValue: () => contract.laufzeit || '',
    },
    {
      key: 'startDate', label: 'Vertragsbeginn', type: 'date',
      hasValue: () => !!contract.startDate,
      displayValue: () => contract.startDate ? formatDate(contract.startDate) : '',
      rawValue: () => contract.startDate || '',
    },
    {
      key: 'expiryDate', label: 'Enddatum', type: 'date',
      hasValue: () => !!contract.expiryDate,
      displayValue: () => contract.expiryDate ? formatDate(contract.expiryDate) : '',
      rawValue: () => contract.expiryDate || '',
    },
    {
      key: 'kosten', label: 'Monatliche Kosten', type: 'number',
      hasValue: () => contract.kosten != null && contract.kosten > 0,
      displayValue: () => contract.kosten != null && contract.kosten > 0
        ? contract.kosten.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })
        : '',
      rawValue: () => contract.kosten != null ? String(contract.kosten) : '',
    },
  ];
}
