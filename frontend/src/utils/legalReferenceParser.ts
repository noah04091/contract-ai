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

export interface LawInfo {
  title?: string;
  abbreviation?: string;
  area?: string;
  /** Optional. Falls gesetzt, wird {paragraph} mit der Paragraph-Nummer ersetzt.
   *  Fehlt der Platzhalter, wird das Template als statische URL verwendet
   *  (z.B. EU-Verordnungen ohne Article-Deep-Link). */
  urlTemplate?: string;
  /** 'paragraph' = § (z.B. § 307 BGB), 'article' = Art. (z.B. Art. 28 DSGVO).
   *  Falls undefined: beide Schemata akzeptiert. */
  urlScheme?: "paragraph" | "article";
}

export interface SlugMapData {
  /** Slug-Map: konzept → array of law slugs (z.B. "kündigungsfrist" → ["bgb", "kschg", "hgb"]) */
  slugMap: Record<string, string[]>;
  /** Law Info: slug → { title, abbreviation, area, urlTemplate?, urlScheme? } */
  lawTitles: Record<string, LawInfo>;
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
): { slug: string; info: LawInfo } | null {
  const abbrLower = abbreviation.toLowerCase().trim();

  // Direkte Lookup nach abbreviation in lawTitles (case-insensitive)
  for (const [slug, info] of Object.entries(lawTitles)) {
    if (info.abbreviation && info.abbreviation.toLowerCase() === abbrLower) {
      return { slug, info };
    }
  }

  // Fallback: lowercase passt manchmal direkt (BGB → bgb)
  if (lawTitles[abbrLower]) {
    return { slug: abbrLower, info: lawTitles[abbrLower] };
  }

  return null;
}

/**
 * Baut die finale URL für eine Quelle.
 * Priorität: urlTemplate (mit {paragraph}-Replace) > Default-Schema gesetze-im-internet.de.
 * Wenn der Eintrag KEIN urlTemplate hat UND er nicht als gesetze-im-internet.de-Slug
 * erkennbar ist (z.B. VOB/A, VOB/B), wird null returned → Frontend Plain-Text.
 */
function buildUrl(slug: string, info: LawInfo, paragraph: string): string | null {
  if (info.urlTemplate) {
    // Template kann {paragraph} enthalten — falls nicht, statische URL.
    return info.urlTemplate.replace(/\{paragraph\}/g, paragraph);
  }
  // Slugs ohne urlTemplate die als bekannt-aber-nicht-online markiert sind:
  // z.B. VOB-Werke. Erkennung: keine Standard-Online-Slug-Form.
  // Heuristik: Wenn Abbreviation Slashes/Spezialzeichen enthält, ist es
  // wahrscheinlich kein gesetze-im-internet.de-Slug.
  if (info.abbreviation && /[\/\s]/.test(info.abbreviation)) {
    return null;
  }
  // Default: gesetze-im-internet.de
  return `https://www.gesetze-im-internet.de/${slug}/__${paragraph}.html`;
}

/**
 * Parst einen legalBasis-String und gibt — wenn möglich — eine ParsedLegalRef zurück.
 * Anti-Halluzination: null wenn nicht eindeutig parsbar oder Werk nicht mappbar.
 *
 * Unterstützte Patterns:
 * - „§ 309 Nr. 7 BGB", „§ 309 BGB", „§309 BGB", „§ 4a HOAI"
 * - „Art. 28 DSGVO", „Art. 6 Abs. 1 DSGVO", „Art. 5 KI-VO"
 * - Mehrteilige Abkürzungen mit Slash (VOB/A, VOB/B) und Bindestrich (KI-VO, SGB-V)
 *
 * URL-Build:
 * - Werk hat urlTemplate → Template wird mit {paragraph} gefüllt (oder statisch genutzt)
 * - Sonst Default-Schema gesetze-im-internet.de/{slug}/__{paragraph}.html
 * - Werk hat KEIN urlTemplate UND Abkürzung enthält /, Leerzeichen → url: null
 *   (Pille wird trotzdem gerendert, aber als nicht-klickbar oder Plain-Text — Komponenten-Entscheidung)
 */
export function parseLegalRef(
  raw: string | null | undefined,
  slugMap: SlugMapData | null
): ParsedLegalRef | null {
  if (!raw || typeof raw !== "string") return null;
  if (!slugMap || !slugMap.lawTitles) return null;

  // Erweiterte Abkürzungs-Regex: erlaubt Slash (VOB/A, VOB/B), Bindestrich (KI-VO),
  // Großbuchstaben + kleine Buchstaben (BImSchG, EnWG). Muss mit einem Großbuchstaben starten.
  const ABBR = '[A-ZÄÖÜ][A-ZÄÖÜa-zäöü0-9]+(?:[\\/\\-][A-ZÄÖÜa-zäöü0-9]+)*';

  // Pattern 1: § <nr> [Abs. X] [Nr. X] [Satz X] <ABBR>  — z.B. „§ 309 Nr. 7 BGB"
  const paragraphRegex = new RegExp(`§\\s*(\\d+[a-z]?)\\s*(?:Abs\\.?\\s*\\d+\\s*)?(?:Nr\\.?\\s*\\d+\\s*)?(?:Satz\\s*\\d+\\s*)?(${ABBR})`);
  const paragraphMatch = raw.match(paragraphRegex);
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
      url: buildUrl(lookup.slug, lookup.info, paragraph),
      fullTitle: lookup.info.title || lookup.info.abbreviation || abbreviation,
    };
  }

  // Pattern 2: Art. <nr> [Abs. X] <ABBR>  — z.B. „Art. 28 DSGVO", „Art. 6 Abs. 1 DSGVO"
  // Anti-Halluzination: nur wenn Werk-Slug bekannt ist (sonst null → keine Pille).
  const articleRegex = new RegExp(`Art\\.?\\s*(\\d+[a-z]?)\\s*(?:Abs\\.?\\s*\\d+\\s*)?(${ABBR})`);
  const articleMatch = raw.match(articleRegex);
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
      url: buildUrl(lookup.slug, lookup.info, paragraph),
      fullTitle: lookup.info.title || lookup.info.abbreviation || abbreviation,
    };
  }

  return null;
}
