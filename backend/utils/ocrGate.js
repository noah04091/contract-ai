/**
 * OCR-Weiche (14.06.2026) — entscheidet, ob für ein geparstes PDF der OCR-Fallback
 * versucht werden soll. Pure Funktion → offline testbar.
 *
 * Erweitert die bisherige „Text < 200 Zeichen"-Regel um eine DICHTE-Prüfung:
 * gescannte Mehrseiter mit etwas (Junk-)Text rutschten bisher durch (z.B. 300 Zeichen
 * auf 10 Seiten = 30/Seite). Spiegelt `pdfExtractor.isLikelyScanned` (avgCharsPerPage<100).
 *
 * SICHER: Löst OCR nur ZUSÄTZLICH aus. Der Aufrufer übernimmt den OCR-Text ohnehin nur,
 * wenn er LÄNGER ist als das Original (analyze.js Accept-Guard) → kein Qualitätsverlust,
 * nur ggf. OCR-Kosten bei echt dünnen Scans. Kurze 1-Seiter + dichte digitale PDFs
 * werden NICHT angefasst.
 */

const MIN_TOTAL_CHARS = 200;        // bisherige Regel: weniger Gesamttext → OCR
const MIN_PAGES_FOR_DENSITY = 2;    // Dichte-Regel nur bei Mehrseitern (schützt kurze 1-Seiter)
const MIN_CHARS_PER_PAGE = 100;     // < 100 Zeichen/Seite = scan-typisch (wie isLikelyScanned)

/**
 * @param {{ text?: string, numPages?: number, isPdf?: boolean }} input
 * @returns {{ ocr: boolean, reason: string|null, charLen: number, avgPerPage: number|null }}
 */
function shouldAttemptOcr({ text, numPages, isPdf } = {}) {
  const charLen = typeof text === 'string' ? text.trim().length : 0;
  const pages = Number.isFinite(numPages) && numPages > 0 ? numPages : 0;
  const avgPerPage = pages > 0 ? Math.round(charLen / pages) : null;

  if (!isPdf) return { ocr: false, reason: null, charLen, avgPerPage };

  // 1) Bisherige Regel: insgesamt sehr wenig Text
  if (charLen < MIN_TOTAL_CHARS) {
    return { ocr: true, reason: 'text_too_short', charLen, avgPerPage };
  }

  // 2) NEU: scan-typische Dichte bei Mehrseitern
  if (pages >= MIN_PAGES_FOR_DENSITY && avgPerPage !== null && avgPerPage < MIN_CHARS_PER_PAGE) {
    return { ocr: true, reason: 'low_density_scan', charLen, avgPerPage };
  }

  return { ocr: false, reason: null, charLen, avgPerPage };
}

module.exports = { shouldAttemptOcr, MIN_TOTAL_CHARS, MIN_PAGES_FOR_DENSITY, MIN_CHARS_PER_PAGE };
