/**
 * Shared contract-name utilities used by the Legal Pulse V2 dashboard
 * and its sub-components (LegalAlertsPanel, ImpactGraph, …).
 *
 * Backend may store raw filenames ("1769518956232-211103_EisQueen_GmbH.pdf")
 * or UUID filenames — we normalize them for display.
 */

const UUID_FILE_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.\w+$/i;

/** Repair common UTF-8-as-Latin-1 mojibake (Ã¼ → ü, Ã¶ → ö, ÃŸ → ß, …). */
function fixMojibake(s: string): string {
  if (!s || !s.includes('Ã')) return s;
  return s
    .replace(/Ã¼/g, 'ü').replace(/Ã„/g, 'Ä').replace(/Ã¤/g, 'ä')
    .replace(/Ã–/g, 'Ö').replace(/Ã¶/g, 'ö')
    .replace(/Ãœ/g, 'Ü')
    .replace(/ÃŸ/g, 'ß');
}

/** Clean contract name: remove file extensions, timestamps, date prefixes, underscores. */
export function cleanContractName(name: string | null | undefined): string {
  if (!name || UUID_FILE_RE.test(name)) return 'Unbenannter Vertrag';
  let clean = name;
  // Repair mojibake first so subsequent regexes see real chars
  clean = fixMojibake(clean);
  // Remove file extension (.pdf, .docx, etc.)
  clean = clean.replace(/\.\w{2,4}$/, '');
  // Remove leading 10–13-digit unix timestamp + separator
  clean = clean.replace(/^\d{10,13}[-_]/, '');
  // Remove leading 6-digit date prefix (YYMMDD_ or DDMMYY_)
  clean = clean.replace(/^\d{6}_/, '');
  // Replace underscores with spaces
  clean = clean.replace(/_/g, ' ');
  // Collapse whitespace and trim
  clean = clean.replace(/\s+/g, ' ').trim();
  return clean || 'Unbenannter Vertrag';
}
