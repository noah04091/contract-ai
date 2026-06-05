/**
 * Rechtslexikon — Hilfsfunktionen für öffentliche URLs.
 *
 * Die Begriff-IDs nutzen Unterstriche (z. B. "personenbezogene_daten").
 * In URLs sind Bindestriche SEO-technisch besser (Google trennt an Bindestrichen,
 * nicht an Unterstrichen). Deshalb mappen wir ID <-> Slug:
 *   ID   "personenbezogene_daten"  ->  Slug "personenbezogene-daten"
 *   Slug "personenbezogene-daten"  ->  ID   "personenbezogene_daten"
 *
 * Voraussetzung (per Audit verifiziert): IDs enthalten nie Bindestriche,
 * nur Kleinbuchstaben + Unterstriche. Damit ist das Mapping verlustfrei.
 */

export const LEXIKON_BASE_PATH = '/rechtslexikon';
export const SITE_URL = 'https://www.contract-ai.de';

/** Begriff-ID -> URL-Slug (Unterstriche zu Bindestrichen). */
export function termIdToSlug(id: string): string {
  return id.replace(/_/g, '-');
}

/** URL-Slug -> Begriff-ID (Bindestriche zurück zu Unterstrichen). */
export function slugToTermId(slug: string): string {
  return slug.replace(/-/g, '_');
}

/** Vollständiger Pfad zu einer Begriff-Seite, z. B. "/rechtslexikon/abfindung". */
export function termPath(id: string): string {
  return `${LEXIKON_BASE_PATH}/${termIdToSlug(id)}`;
}

/** Absolute URL zu einer Begriff-Seite (für canonical / Schema). */
export function termUrl(id: string): string {
  return `${SITE_URL}${termPath(id)}`;
}

/** Hex-Farbe (#rrggbb) → rgba-String mit Alpha (für Badge-Tints im Lexikon). */
export function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
