/**
 * clauseSectionDetector.ts
 *
 * Erkennt Dokumentsektionen anhand von Nummernschema-Wechseln und -Resets.
 * Rein Frontend-basiert, keine Backend-Änderungen nötig.
 *
 * Beispiel: Ein 101-Klauseln-Vertrag wird in ~8-12 übersichtliche Sektionen gruppiert.
 */

import type { ParsedClause } from '../types/legalLens';

// ── Numbering Scheme Detection ──────────────────────────────────────

type NumberScheme = 'roman' | 'arabic' | 'paragraph' | 'section' | 'letter' | 'unknown';

interface NumberInfo {
  scheme: NumberScheme;
  value: number; // Numerischer Wert (I=1, §3=3, 5.=5, a=1)
}

/** Römische Ziffer → Zahl */
function romanToInt(roman: string): number {
  const map: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100 };
  let result = 0;
  const upper = roman.toUpperCase();
  for (let i = 0; i < upper.length; i++) {
    const cur = map[upper[i]] || 0;
    const next = map[upper[i + 1]] || 0;
    result += cur < next ? -cur : cur;
  }
  return result;
}

/** Erkennt das Nummernschema einer Klausel aus dem `number`-Feld */
function detectNumberScheme(numberStr: string | undefined): NumberInfo | null {
  if (!numberStr) return null;
  const n = numberStr.trim();

  // §-Paragraphen: "§1", "§ 3", "§12"
  const paraMatch = n.match(/^§\s*(\d+)/);
  if (paraMatch) return { scheme: 'paragraph', value: parseInt(paraMatch[1]) };

  // "Abschnitt 1", "Abschnitt 2"
  const sectionMatch = n.match(/^Abschnitt\s+(\d+)/i);
  if (sectionMatch) return { scheme: 'section', value: parseInt(sectionMatch[1]) };

  // Römische Ziffern: "XI.", "IV.", "I." — nur am Anfang, mit Punkt
  const romanMatch = n.match(/^([IVXLC]+)\.?\s*$/);
  if (romanMatch && romanMatch[1].length <= 5) {
    const val = romanToInt(romanMatch[1]);
    if (val > 0 && val <= 50) return { scheme: 'roman', value: val };
  }

  // Arabische Zahlen: "1.", "2.", "12."
  const arabicMatch = n.match(/^(\d+)\.?\s*$/);
  if (arabicMatch) return { scheme: 'arabic', value: parseInt(arabicMatch[1]) };

  // Buchstaben: "a)", "b)", "c)"
  const letterMatch = n.match(/^([a-z])\)?\s*$/i);
  if (letterMatch) return { scheme: 'letter', value: letterMatch[1].toLowerCase().charCodeAt(0) - 96 };

  return null;
}

// ── Section Detection Algorithm ─────────────────────────────────────

export interface ClauseSection {
  id: string;
  label: string;
  clauses: ParsedClause[];
  riskCounts: { high: number; medium: number; low: number };
}

/** Mindestanzahl Klauseln für Sektions-Gruppierung */
const MIN_CLAUSES_FOR_SECTIONS = 15;

/** Mindestanzahl Sektionen damit Gruppierung sinnvoll ist */
const MIN_SECTIONS = 2;

/**
 * Bestimmt den Sektions-Namen basierend auf der ersten Klausel der Sektion.
 * Nutzt Titel, Nummer oder category als Fallback.
 */
function deriveSectionLabel(clauses: ParsedClause[], sectionIndex: number): string {
  if (clauses.length === 0) return `Abschnitt ${sectionIndex + 1}`;

  const first = clauses[0];

  // Wenn die erste Klausel einen aussagekräftigen Titel hat → als Sektionsname
  if (first.title && first.title.length > 3) {
    // Kürze zu lange Titel
    const title = first.title.length > 60 ? first.title.substring(0, 57) + '...' : first.title;
    return title;
  }

  // Fallback: Häufigste GPT-Kategorie in der Sektion
  const categories = clauses.map(c => c.category).filter(Boolean) as string[];
  if (categories.length > 0) {
    const freq = new Map<string, number>();
    for (const cat of categories) {
      freq.set(cat, (freq.get(cat) || 0) + 1);
    }
    let best = '';
    let bestCount = 0;
    for (const [cat, count] of freq) {
      if (count > bestCount) { best = cat; bestCount = count; }
    }
    if (best) return best;
  }

  // Letzter Fallback: generischer Name
  return `Abschnitt ${sectionIndex + 1}`;
}

/**
 * Erkennt Sektionsgrenzen in einer Klauselliste.
 *
 * Eine neue Sektion beginnt wenn:
 * 1. Das Nummernschema wechselt (z.B. Arabisch → Römisch → §)
 * 2. Die Nummer zurückgesetzt wird (z.B. §14 → §1, 7 → 1)
 * 3. Buchstaben nach Zahlen gelten als Unterabschnitt (keine neue Sektion)
 *
 * @param clauses Hauptklauseln (ohne Anhänge), in Dokumentreihenfolge
 * @returns Array von Sektionen, oder null wenn Gruppierung nicht sinnvoll
 */
export function detectClauseSections(clauses: ParsedClause[]): ClauseSection[] | null {
  // Zu wenige Klauseln → keine Gruppierung
  if (clauses.length < MIN_CLAUSES_FOR_SECTIONS) return null;

  const sectionBreaks: number[] = [0]; // Index 0 ist immer eine Sektionsgrenze
  let lastInfo: NumberInfo | null = null;
  let lastNonLetterInfo: NumberInfo | null = null; // Letzte nicht-Buchstaben-Nummer

  for (let i = 0; i < clauses.length; i++) {
    const info = detectNumberScheme(clauses[i].number);

    if (!info) {
      // Kein Nummernschema erkannt → keine Sektionsgrenze
      continue;
    }

    if (lastInfo) {
      const isNewSection = (() => {
        // Buchstaben sind nie Sektionsgrenzen (Unterabschnitte)
        if (info.scheme === 'letter') return false;

        // Wechsel von Buchstabe zu anderem Schema → neue Sektion
        // (aber nur wenn es ein echter Wechsel ist, nicht zurück zum vorherigen Schema)
        if (lastInfo!.scheme === 'letter' && lastNonLetterInfo) {
          // Prüfe gegen das letzte nicht-Buchstaben-Schema
          if (info.scheme !== lastNonLetterInfo.scheme) return true;
          if (info.value <= lastNonLetterInfo.value) return true;
          return false;
        }

        // Schema-Wechsel (z.B. Arabisch → Römisch → §)
        if (info.scheme !== lastInfo!.scheme) return true;

        // Nummern-Reset innerhalb gleichen Schemas (z.B. §14 → §1)
        if (info.value < lastInfo!.value && lastInfo!.value - info.value >= 2) return true;

        return false;
      })();

      if (isNewSection && i !== sectionBreaks[sectionBreaks.length - 1]) {
        sectionBreaks.push(i);
      }
    }

    lastInfo = info;
    if (info.scheme !== 'letter') {
      lastNonLetterInfo = info;
    }
  }

  // Zu wenige Sektionen → nicht gruppieren
  if (sectionBreaks.length < MIN_SECTIONS) return null;

  // Sektionen aufbauen
  const sections: ClauseSection[] = [];

  for (let s = 0; s < sectionBreaks.length; s++) {
    const start = sectionBreaks[s];
    const end = s + 1 < sectionBreaks.length ? sectionBreaks[s + 1] : clauses.length;
    const sectionClauses = clauses.slice(start, end);

    if (sectionClauses.length === 0) continue;

    const riskCounts = { high: 0, medium: 0, low: 0 };
    for (const c of sectionClauses) {
      if (c.nonAnalyzable) continue;
      const level = c.preAnalysis?.riskLevel || c.riskIndicators?.level || 'low';
      if (level === 'high') riskCounts.high++;
      else if (level === 'medium') riskCounts.medium++;
      else riskCounts.low++;
    }

    sections.push({
      id: `section_${s}`,
      label: deriveSectionLabel(sectionClauses, s),
      clauses: sectionClauses,
      riskCounts
    });
  }

  return sections.length >= MIN_SECTIONS ? sections : null;
}
