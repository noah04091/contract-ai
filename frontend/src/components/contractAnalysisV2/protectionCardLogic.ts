// 🛡️ Pure Entscheidungslogik der Schutz-Status-Karte (Retention Stufe 1c, 11.08.2026).
// Bewusst ohne React-/CSS-Imports — direkt unit-testbar (protectionCard.test.ts).

import { classifyDocType } from "./v2TabLabels";

/** Karte nur für Dokumente, deren Fristen der Wächter überhaupt überwacht. */
export function isProtectableDocType(docType?: string | null, contractType?: string | null): boolean {
  const cls = classifyDocType(docType, contractType);
  return cls === "CONTRACT" || cls === "AGB";
}

export type ProtectionVariant = "paid" | "free" | "freeLimit";

/**
 * Plan-Variante der Karte. Bewusst über isPaid-Flag statt Plan-Strings entschieden —
 * Aufrufer prüft business/enterprise; Legacy-Plan „legendary" fällt wie überall auf
 * die Free-Variante zurück (bekannte tote Hülse, 0 echte Nutzer, bewusst so).
 */
export function resolveProtectionVariant(isPaid: boolean, analysesLeft: number): ProtectionVariant {
  if (isPaid) return "paid";
  return analysesLeft > 0 ? "free" : "freeLimit";
}

/** Verbleibende Analysen aus den /me-Feldern (Infinity-sicher, nie negativ). */
export function remainingAnalyses(count?: number, limit?: number): number {
  if (limit === undefined || limit === null) return 0;
  if (!Number.isFinite(limit)) return Number.POSITIVE_INFINITY;
  return Math.max(0, limit - (count ?? 0));
}

/**
 * Zähler-Quelle wählen (Live-Test-Fund 11.08.): Der AuthContext wird VOR der Analyse
 * geladen und nicht automatisch aktualisiert — nach der 1. Analyse zeigte die Karte
 * „3 von 3 übrig" statt „2 von 3". Die Analyse-Antwort (result.usage) trägt die
 * FRISCHE Zahl (dieselbe Quelle wie der „X von Y"-Footer). Vorrang: usage → user.
 */
export function effectiveAnalysisNumbers(
  usage: { count?: number; limit?: number } | null | undefined,
  userCount?: number,
  userLimit?: number
): { count: number | undefined; limit: number | undefined } {
  return {
    count: usage?.count ?? userCount,
    limit: usage?.limit ?? userLimit,
  };
}
