/**
 * Parses German legal references (e.g. "§ 276 BGB") and returns
 * a dejure.org URL if the law is supported.
 */

const SUPPORTED_LAWS: Record<string, string> = {
  'BGB': 'BGB',
  'HGB': 'HGB',
  'StGB': 'StGB',
  'ZPO': 'ZPO',
  'GewO': 'GewO',
  'ArbGG': 'ArbGG',
  'BetrVG': 'BetrVG',
  'KSchG': 'KSchG',
  'TzBfG': 'TzBfG',
  'AGG': 'AGG',
  'MuSchG': 'MuSchG',
  'EFZG': 'EFZG',
  'BUrlG': 'BUrlG',
  'ArbZG': 'ArbZG',
  'AÜG': 'AÜG',
  'GmbHG': 'GmbHG',
  'AktG': 'AktG',
  'InsO': 'InsO',
  'UStG': 'UStG',
  'EStG': 'EStG',
  'AO': 'AO',
  'SGB': 'SGB',
  'VVG': 'VVG',
  'WEG': 'WEG',
  'MietR': 'BGB', // Mietrecht is part of BGB
  'UWG': 'UWG',
  'GWB': 'GWB',
  'PatG': 'PatG',
  'MarkenG': 'MarkenG',
  'UrhG': 'UrhG',
  'TMG': 'TMG',
  'TTDSG': 'TTDSG',
  'TKG': 'TKG',
  'BDSG': 'BDSG',
  'DSGVO': 'DSGVO', // dejure has EU regulations too
  'VOB': 'VOB',
  'BauGB': 'BauGB',
  'StVG': 'StVG',
  'ProdHaftG': 'ProdHaftG',
  'VerpackG': 'VerpackG',
  'GenG': 'GenG',
};

interface LegalReference {
  text: string;
  url: string | null;
}

/**
 * Parses a legalBasis string like "§ 276 BGB" or "Art. 6 DSGVO"
 * and returns a dejure.org URL if possible.
 *
 * Supported formats:
 * - "§ 276 BGB"
 * - "§ 309 Nr. 7 BGB"
 * - "§§ 305-306 BGB" (links to first paragraph)
 * - "Art. 6 DSGVO"
 * - "§ 280 Abs. 1 BGB"
 */
export function getLegalReferenceUrl(legalBasis: string): LegalReference {
  if (!legalBasis) return { text: legalBasis, url: null };

  // Try § pattern: "§ 276 BGB", "§ 309 Nr. 7 BGB", "§ 280 Abs. 1 BGB"
  const paragraphMatch = legalBasis.match(/§§?\s*(\d+)(?:[a-z])?(?:\s*(?:Abs\.|Nr\.|S\.|Satz)\s*\d+)*\s+([A-ZÄÖÜa-zäöü]+)/);
  if (paragraphMatch) {
    const [, number, law] = paragraphMatch;
    const dejureLaw = SUPPORTED_LAWS[law];
    if (dejureLaw) {
      return {
        text: legalBasis,
        url: `https://dejure.org/gesetze/${dejureLaw}/${number}.html`,
      };
    }
  }

  // Try Art. pattern: "Art. 6 DSGVO"
  const articleMatch = legalBasis.match(/Art\.?\s*(\d+)\s+([A-ZÄÖÜa-zäöü]+)/);
  if (articleMatch) {
    const [, number, law] = articleMatch;
    const dejureLaw = SUPPORTED_LAWS[law];
    if (dejureLaw) {
      return {
        text: legalBasis,
        url: `https://dejure.org/gesetze/${dejureLaw}/${number}.html`,
      };
    }
  }

  // No match — return as plain text
  return { text: legalBasis, url: null };
}
