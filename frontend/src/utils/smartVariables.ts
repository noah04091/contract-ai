/**
 * Smart Variables Utility
 * System-Variablen und berechnete Felder für ContractBuilder
 */

// ============================================
// SYSTEM VARIABLES (auto-resolving)
// ============================================

export interface SystemVariable {
  name: string;
  displayName: string;
  description: string;
  getValue: () => string;
  group: 'Datum' | 'Zeit' | 'System';
}

// Deutsche Monatsnamen
const MONTHS_DE = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
];

// Deutsche Wochentage
const WEEKDAYS_DE = [
  'Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'
];

// Datum formatieren (DD.MM.YYYY)
const formatDate = (date: Date): string => {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
};

// Datum formatieren (ausgeschrieben)
const formatDateLong = (date: Date): string => {
  const day = date.getDate();
  const month = MONTHS_DE[date.getMonth()];
  const year = date.getFullYear();
  return `${day}. ${month} ${year}`;
};

// System-Variablen Definition
export const SYSTEM_VARIABLES: SystemVariable[] = [
  // Datum-Variablen
  {
    name: 'heute',
    displayName: 'Heute',
    description: 'Aktuelles Datum (DD.MM.YYYY)',
    getValue: () => formatDate(new Date()),
    group: 'Datum',
  },
  {
    name: 'heute_lang',
    displayName: 'Heute (ausgeschrieben)',
    description: 'Aktuelles Datum ausgeschrieben',
    getValue: () => formatDateLong(new Date()),
    group: 'Datum',
  },
  {
    name: 'morgen',
    displayName: 'Morgen',
    description: 'Morgiges Datum',
    getValue: () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      return formatDate(tomorrow);
    },
    group: 'Datum',
  },
  {
    name: 'naechste_woche',
    displayName: 'Nächste Woche',
    description: 'Datum in 7 Tagen',
    getValue: () => {
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      return formatDate(nextWeek);
    },
    group: 'Datum',
  },
  {
    name: 'naechster_monat',
    displayName: 'Nächster Monat',
    description: 'Datum in 30 Tagen',
    getValue: () => {
      const nextMonth = new Date();
      nextMonth.setDate(nextMonth.getDate() + 30);
      return formatDate(nextMonth);
    },
    group: 'Datum',
  },
  {
    name: 'monatsende',
    displayName: 'Monatsende',
    description: 'Letzter Tag des aktuellen Monats',
    getValue: () => {
      const date = new Date();
      const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      return formatDate(lastDay);
    },
    group: 'Datum',
  },
  {
    name: 'jahresende',
    displayName: 'Jahresende',
    description: '31.12. des aktuellen Jahres',
    getValue: () => {
      const year = new Date().getFullYear();
      return `31.12.${year}`;
    },
    group: 'Datum',
  },
  {
    name: 'jahr',
    displayName: 'Jahr',
    description: 'Aktuelles Jahr',
    getValue: () => new Date().getFullYear().toString(),
    group: 'Datum',
  },
  {
    name: 'monat',
    displayName: 'Monat',
    description: 'Aktueller Monat (Name)',
    getValue: () => MONTHS_DE[new Date().getMonth()],
    group: 'Datum',
  },
  {
    name: 'monat_zahl',
    displayName: 'Monat (Zahl)',
    description: 'Aktueller Monat (1-12)',
    getValue: () => (new Date().getMonth() + 1).toString(),
    group: 'Datum',
  },
  {
    name: 'wochentag',
    displayName: 'Wochentag',
    description: 'Aktueller Wochentag',
    getValue: () => WEEKDAYS_DE[new Date().getDay()],
    group: 'Datum',
  },
  {
    name: 'kalenderwoche',
    displayName: 'Kalenderwoche',
    description: 'Aktuelle Kalenderwoche',
    getValue: () => {
      const date = new Date();
      const startOfYear = new Date(date.getFullYear(), 0, 1);
      const days = Math.floor((date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
      return Math.ceil((days + startOfYear.getDay() + 1) / 7).toString();
    },
    group: 'Datum',
  },
  // Zeit-Variablen
  {
    name: 'uhrzeit',
    displayName: 'Uhrzeit',
    description: 'Aktuelle Uhrzeit (HH:MM)',
    getValue: () => {
      const now = new Date();
      return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    },
    group: 'Zeit',
  },
];

// Map für schnellen Zugriff
export const SYSTEM_VARIABLES_MAP = new Map<string, SystemVariable>(
  SYSTEM_VARIABLES.map(v => [v.name, v])
);

// ============================================
// COMPUTED VARIABLES (calculations)
// ============================================

/**
 * Prüft ob ein Variablenname eine Berechnung enthält
 * z.B. "preis * 1.19" oder "netto + mwst"
 */
export function isComputedVariable(varName: string): boolean {
  // Enthält mathematische Operatoren?
  return /[\+\-\*\/\(\)]/.test(varName);
}

/**
 * Berechnet einen Ausdruck mit Variablenwerten
 * @param expression - z.B. "preis * 1.19"
 * @param variableValues - Map von Variablennamen zu Werten
 */
export function evaluateExpression(
  expression: string,
  variableValues: Map<string, string | number>
): string | null {
  try {
    // Variablen durch Werte ersetzen
    let evalExpression = expression;

    // Alle Variablennamen finden (Wörter die nicht nur Zahlen sind)
    const varPattern = /[a-zA-Z_äöüÄÖÜß][a-zA-Z0-9_äöüÄÖÜß]*/g;
    const matches = expression.match(varPattern) || [];

    for (const varName of matches) {
      const value = variableValues.get(varName);
      if (value === undefined) {
        // Variable nicht gefunden - kann nicht berechnen
        return null;
      }

      // Numerischen Wert extrahieren (entferne € und andere Zeichen)
      let numValue: number;
      if (typeof value === 'number') {
        numValue = value;
      } else {
        // String zu Nummer konvertieren
        const cleaned = value.replace(/[^\d,.\-]/g, '').replace(',', '.');
        numValue = parseFloat(cleaned);
        if (isNaN(numValue)) {
          return null;
        }
      }

      // Variable durch Wert ersetzen (als Zahl)
      evalExpression = evalExpression.replace(
        new RegExp(`\\b${varName}\\b`, 'g'),
        numValue.toString()
      );
    }

    // Sicherheitscheck: Nur erlaubte Zeichen
    if (!/^[\d\s\+\-\*\/\(\)\.,]+$/.test(evalExpression)) {
      return null;
    }

    // Berechnen (sichere eval-Alternative)
    const result = Function(`"use strict"; return (${evalExpression})`)();

    if (typeof result !== 'number' || isNaN(result)) {
      return null;
    }

    // Auf 2 Dezimalstellen runden und formatieren
    return result.toFixed(2).replace('.', ',');
  } catch {
    return null;
  }
}

/**
 * Löst einen Variablennamen auf (System oder Berechnung)
 */
export function resolveSmartVariable(
  varName: string,
  userVariables: Map<string, string | number>
): { value: string | null; type: 'system' | 'computed' | 'user' } {
  // 1. System-Variable?
  const systemVar = SYSTEM_VARIABLES_MAP.get(varName);
  if (systemVar) {
    return { value: systemVar.getValue(), type: 'system' };
  }

  // 2. Berechnete Variable?
  if (isComputedVariable(varName)) {
    const result = evaluateExpression(varName, userVariables);
    return { value: result, type: 'computed' };
  }

  // 3. Normale User-Variable
  const userValue = userVariables.get(varName);
  return {
    value: userValue !== undefined ? String(userValue) : null,
    type: 'user'
  };
}

/**
 * Formatiert einen Währungsbetrag
 */
export function formatCurrency(value: number | string, symbol: string = '€'): string {
  const num = typeof value === 'number' ? value : parseFloat(String(value).replace(',', '.'));
  if (isNaN(num)) return String(value);
  return `${num.toFixed(2).replace('.', ',')} ${symbol}`;
}

/**
 * Berechnet MwSt
 */
export function calculateMwSt(netto: number, rate: number = 19): { brutto: number; mwst: number } {
  const mwst = netto * (rate / 100);
  const brutto = netto + mwst;
  return { brutto, mwst };
}
