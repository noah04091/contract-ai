// Legal Reference Parser — wandelt legalBasis-Strings („§ 309 Nr. 7 BGB") in
// klickbare externe Links zu gesetze-im-internet.de um.
//
// Anti-Halluzinations-Prinzip:
// - Wenn String nicht parsbar → null
// - Wenn Werk nicht im slugMap → null
// - Wenn Paragraph nicht numerisch → null
// → Frontend rendert dann KEINE Pille, sondern Plain-Text-Fallback.
//
// Slug-Map kommt vom Backend (/api/legal-references/slug-map) — Single Source
// of Truth mit Legal Pulse. Frontend cacht 24h via Browser-HTTP-Cache.

import { useEffect, useState } from "react";

export interface SlugMapData {
  /** Slug-Map: konzept → array of law slugs (z.B. "kündigungsfrist" → ["bgb", "kschg", "hgb"]) */
  slugMap: Record<string, string[]>;
  /** Law Info: slug → { title, abbreviation, area } */
  lawTitles: Record<string, { title?: string; abbreviation?: string; area?: string }>;
  version: string;
}

export interface ParsedLegalRef {
  /** Originaler Quell-String, unverändert (z.B. „§ 309 Nr. 7 BGB") */
  raw: string;
  /** Abkürzung des Werks (BGB, HGB, DSGVO, ...) */
  abbreviation: string;
  /** Paragraphen-Nummer (309, 477, etc.) */
  paragraph: string;
  /** Slug für gesetze-im-internet.de (z.B. "bgb") — null wenn nicht mappbar */
  slug: string | null;
  /** Vollständige URL zur offiziellen Quelle — null wenn slug fehlt */
  url: string | null;
  /** Vollständiger Titel des Gesetzes wenn bekannt */
  fullTitle: string | null;
}

// In-Memory-Cache, damit Hook nicht mehrfach fetched pro Session
let cachedSlugMap: SlugMapData | null = null;
let inflightPromise: Promise<SlugMapData> | null = null;

async function fetchSlugMap(): Promise<SlugMapData> {
  if (cachedSlugMap) return cachedSlugMap;
  if (inflightPromise) return inflightPromise;

  inflightPromise = (async () => {
    try {
      const res = await fetch("/api/legal-references/slug-map", {
        headers: { Accept: "application/json" },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      cachedSlugMap = {
        slugMap: data.slugMap || {},
        lawTitles: data.lawTitles || {},
        version: data.version || "unknown",
      };
      return cachedSlugMap;
    } catch (err) {
      // Fail-safe: leere Map. Frontend rendert dann keine Pillen (Anti-Halluzination).
      console.warn("[legalReferenceParser] Slug-Map fetch failed:", err);
      const empty: SlugMapData = { slugMap: {}, lawTitles: {}, version: "fallback" };
      cachedSlugMap = empty;
      return empty;
    } finally {
      inflightPromise = null;
    }
  })();

  return inflightPromise;
}

/**
 * React-Hook: liefert die Slug-Map des Backends.
 * Returns null bis Daten da sind. Wird einmal pro Session gefetched.
 */
export function useLegalSlugMap(): SlugMapData | null {
  const [data, setData] = useState<SlugMapData | null>(cachedSlugMap);

  useEffect(() => {
    if (cachedSlugMap) {
      setData(cachedSlugMap);
      return;
    }
    let cancelled = false;
    fetchSlugMap().then((result) => {
      if (!cancelled) setData(result);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return data;
}

// Slug-Lookup-Heuristik:
// 1. lawTitles direkt nach abbreviation durchsuchen → erste Match wins
// 2. Fallback: lowercase abbreviation als Slug versuchen (BGB → bgb)
function findSlugForAbbreviation(
  abbreviation: string,
  lawTitles: SlugMapData["lawTitles"]
): { slug: string; fullTitle: string } | null {
  const abbrLower = abbreviation.toLowerCase().trim();

  // Direkte Lookup nach abbreviation in lawTitles
  for (const [slug, info] of Object.entries(lawTitles)) {
    if (info.abbreviation && info.abbreviation.toLowerCase() === abbrLower) {
      return { slug, fullTitle: info.title || info.abbreviation };
    }
  }

  // Fallback: lowercase passt manchmal direkt (BGB → bgb)
  if (lawTitles[abbrLower]) {
    return {
      slug: abbrLower,
      fullTitle: lawTitles[abbrLower].title || abbreviation,
    };
  }

  return null;
}

/**
 * Parst einen legalBasis-String und gibt — wenn möglich — eine ParsedLegalRef zurück.
 * Anti-Halluzination: null wenn nicht eindeutig parsbar oder Werk nicht mappbar.
 *
 * Unterstützte Patterns:
 * - „§ 309 Nr. 7 BGB", „§ 309 BGB", „§309 BGB"
 * - „Art. 28 DSGVO" (Pille → externe DSGVO-Quelle nur falls slug existiert)
 */
export function parseLegalRef(
  raw: string | null | undefined,
  slugMap: SlugMapData | null
): ParsedLegalRef | null {
  if (!raw || typeof raw !== "string") return null;
  if (!slugMap || !slugMap.lawTitles) return null;

  // Pattern 1: § <nr> [Nr. X] <ABBR>  — z.B. „§ 309 Nr. 7 BGB"
  const paragraphMatch = raw.match(/§\s*(\d+[a-z]?)\s*(?:Abs\.?\s*\d+\s*)?(?:Nr\.?\s*\d+\s*)?(?:Satz\s*\d+\s*)?([A-ZÄÖÜ][A-ZÄÖÜa-zäöü]+)/);
  if (paragraphMatch) {
    const paragraph = paragraphMatch[1];
    const abbreviation = paragraphMatch[2];
    const lookup = findSlugForAbbreviation(abbreviation, slugMap.lawTitles);
    if (!lookup) return null;
    return {
      raw,
      abbreviation,
      paragraph,
      slug: lookup.slug,
      url: `https://www.gesetze-im-internet.de/${lookup.slug}/__${paragraph}.html`,
      fullTitle: lookup.fullTitle,
    };
  }

  // Pattern 2: Art. <nr> <ABBR>  — z.B. „Art. 28 DSGVO"
  // Nur weiterverarbeiten wenn Werk-Slug bekannt ist (sonst null → keine Pille)
  const articleMatch = raw.match(/Art\.?\s*(\d+)\s+([A-ZÄÖÜ][A-ZÄÖÜa-zäöü]+)/);
  if (articleMatch) {
    const paragraph = articleMatch[1];
    const abbreviation = articleMatch[2];
    const lookup = findSlugForAbbreviation(abbreviation, slugMap.lawTitles);
    if (!lookup) return null;
    return {
      raw,
      abbreviation,
      paragraph,
      slug: lookup.slug,
      url: `https://www.gesetze-im-internet.de/${lookup.slug}/__${paragraph}.html`,
      fullTitle: lookup.fullTitle,
    };
  }

  return null;
}
