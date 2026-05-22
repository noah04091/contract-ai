// backend/services/legalLensPdfExporter.js
// PDF-Export mit eingebrannten Marker-Highlights + Notiz-Seite am Ende

const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.mjs');

// Farbpalette für Marker (RGB normalisiert, 0-1) — gleiche Werte wie Frontend
const MARKER_COLORS = {
  green:  { r: 0.13, g: 0.77, b: 0.37 },
  orange: { r: 0.98, g: 0.45, b: 0.09 },
  red:    { r: 0.94, g: 0.27, b: 0.27 },
  blue:   { r: 0.23, g: 0.51, b: 0.96 },
};

const MARKER_LABELS = {
  green:  'Akzeptiert',
  orange: 'Verhandeln',
  red:    'Ablehnen',
  blue:   'Notiz',
};

const MARKER_OPACITY = 0.25; // Highlighter-Light wie Frontend

/**
 * pdf-lib's Standard-Fonts (Helvetica) nutzen WinAnsi (CP-1252). Unicode-Zeichen
 * außerhalb dieses Sets crashen das Encoding (z.B. U+2212 −, Pfeile, Emojis).
 * Diese Funktion mappt häufige Troublemaker und ersetzt nicht-darstellbare Zeichen
 * durch "?".
 */
function sanitizeForWinAnsi(text) {
  if (!text) return '';
  return String(text)
    // Math/typography
    .replace(/−/g, '-')   // minus sign
    .replace(/→/g, '->')  // right arrow
    .replace(/←/g, '<-')  // left arrow
    .replace(/↔/g, '<->') // left-right arrow
    .replace(/⇒/g, '=>')  // double right arrow
    .replace(/⇐/g, '<=')  // double left arrow
    .replace(/ /g, ' ')   // non-breaking space
    .replace(/ /g, ' ')   // narrow no-break space
    .replace(/ /g, ' ')   // thin space
    .replace(/​/g, '')    // zero-width space
    .replace(/‌/g, '')    // zero-width non-joiner
    .replace(/‍/g, '')    // zero-width joiner
    .replace(/﻿/g, '')    // BOM
    // Replace anything outside WinAnsi-safe ranges with "?"
    // Safe: 0x20-0x7E (ASCII), 0xA0-0xFF (Latin-1), plus WinAnsi-spezifische 0x80-0x9F-Mappings
    .replace(/[^\x20-\x7E\xA0-\xFF€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ\n\r\t]/g, '?');
}

/**
 * Annotiert ein PDF mit Marker-Highlights und einer separaten Notiz-Übersichtsseite
 * am Ende. Notizen liegen NICHT mehr über dem Text — Original-Layout unverändert.
 *
 * @param {Buffer} pdfBuffer - Original-PDF als Buffer
 * @param {Array} markers - Array von PdfMarker-Objekten
 * @returns {Promise<Uint8Array>} - Annotiertes PDF als Buffer
 */
async function exportPdfWithMarkers(pdfBuffer, markers) {
  if (!markers || markers.length === 0) {
    return new Uint8Array(pdfBuffer);
  }

  // 1. pdfjs-dist: Text-Item-Positionen pro Page lesen
  const pdfjsDoc = await pdfjsLib.getDocument({
    data: new Uint8Array(pdfBuffer),
    verbosity: 0
  }).promise;

  // 2. pdf-lib: zum Editieren öffnen
  const pdfLibDoc = await PDFDocument.load(pdfBuffer);
  const helveticaFont = await pdfLibDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfLibDoc.embedFont(StandardFonts.HelveticaBold);
  const pages = pdfLibDoc.getPages();

  // 3. Marker sortieren: nach Page, dann nach erstem Span-Index (für Index-Nummerierung)
  const sortedMarkers = [...markers].sort((a, b) => {
    if (a.page !== b.page) return a.page - b.page;
    const aFirst = a.spanIndices?.[0] ?? 0;
    const bFirst = b.spanIndices?.[0] ?? 0;
    return aFirst - bFirst;
  });

  // 4. Marker nach Page gruppieren
  const markersByPage = new Map();
  sortedMarkers.forEach((m, idx) => {
    if (!markersByPage.has(m.page)) markersByPage.set(m.page, []);
    markersByPage.get(m.page).push({ marker: m, globalIndex: idx + 1 });
  });

  // 5. Pro Page: Highlights zeichnen + kleines [N]-Badge bei Notiz-Markern
  for (const [pageNum, pageMarkers] of markersByPage.entries()) {
    const pageIdx = pageNum - 1;
    if (pageIdx < 0 || pageIdx >= pages.length) continue;

    const pdfLibPage = pages[pageIdx];
    const pdfjsPage = await pdfjsDoc.getPage(pageNum);
    const textContent = await pdfjsPage.getTextContent();

    for (const { marker, globalIndex } of pageMarkers) {
      const color = MARKER_COLORS[marker.color] || MARKER_COLORS.green;
      const rects = [];

      for (const spanIdx of (marker.spanIndices || [])) {
        if (spanIdx < 0 || spanIdx >= textContent.items.length) continue;
        const item = textContent.items[spanIdx];
        if (!item || !item.transform) continue;

        const x = item.transform[4];
        const yBaseline = item.transform[5];
        const width = item.width || 0;
        const fontHeight = Math.abs(item.transform[3]) || 10;
        const y = yBaseline - fontHeight * 0.2;
        const height = fontHeight * 1.15;

        if (width > 0 && height > 0) {
          rects.push({ x, y, width, height });
        }
      }

      // Highlight-Rechtecke
      rects.forEach(r => {
        pdfLibPage.drawRectangle({
          x: r.x,
          y: r.y,
          width: r.width,
          height: r.height,
          color: rgb(color.r, color.g, color.b),
          opacity: MARKER_OPACITY,
          borderWidth: 0,
        });
      });

      // Bei Notiz: kleines [N]-Badge am Ende des markierten Bereichs (Verweis zur Notiz-Seite)
      if (marker.note && marker.note.trim().length > 0 && rects.length > 0) {
        const lastRect = rects[rects.length - 1];
        const badgeText = `[${globalIndex}]`;
        const badgeFontSize = 7;
        const badgeWidth = helveticaBold.widthOfTextAtSize(badgeText, badgeFontSize) + 6;
        const badgeHeight = badgeFontSize + 4;
        const badgeX = lastRect.x + lastRect.width + 2;
        const badgeY = lastRect.y + (lastRect.height / 2) - (badgeHeight / 2);

        pdfLibPage.drawRectangle({
          x: badgeX,
          y: badgeY,
          width: badgeWidth,
          height: badgeHeight,
          color: rgb(0.23, 0.51, 0.96),
          borderColor: rgb(0.16, 0.40, 0.83),
          borderWidth: 0.5,
          opacity: 1,
        });
        pdfLibPage.drawText(badgeText, {
          x: badgeX + 3,
          y: badgeY + 3,
          size: badgeFontSize,
          font: helveticaBold,
          color: rgb(1, 1, 1),
        });
      }
    }
  }

  // 6. Notiz-Übersichtsseite(n) am Ende
  const markersWithNotes = sortedMarkers
    .map((m, idx) => ({ marker: m, globalIndex: idx + 1 }))
    .filter(x => x.marker.note && x.marker.note.trim().length > 0);

  if (markersWithNotes.length > 0) {
    addNotesPages(pdfLibDoc, markersWithNotes, helveticaFont, helveticaBold);
  }

  return await pdfLibDoc.save();
}

/**
 * Fügt eine oder mehrere "Notizen"-Seiten am Ende des PDFs ein.
 * Standard A4-Format, mit nummerierter Liste der Notizen + Seitenverweisen.
 */
function addNotesPages(pdfLibDoc, markersWithNotes, font, fontBold) {
  const A4_WIDTH = 595.28;   // PDF-Punkte
  const A4_HEIGHT = 841.89;
  const MARGIN = 50;
  const CONTENT_WIDTH = A4_WIDTH - 2 * MARGIN;
  const TITLE_SIZE = 18;
  const HEADER_SIZE = 9;
  const TEXT_SIZE = 10;
  const NOTE_SIZE = 9.5;
  const LINE_HEIGHT_NOTE = NOTE_SIZE * 1.4;

  let page = pdfLibDoc.addPage([A4_WIDTH, A4_HEIGHT]);
  let cursorY = A4_HEIGHT - MARGIN;

  // Titel
  page.drawText('Notizen zum Vertrag', {
    x: MARGIN,
    y: cursorY - TITLE_SIZE,
    size: TITLE_SIZE,
    font: fontBold,
    color: rgb(0.12, 0.27, 0.55),
  });
  cursorY -= TITLE_SIZE + 8;

  // Untertitel mit Stats
  const counts = { green: 0, orange: 0, red: 0, blue: 0 };
  markersWithNotes.forEach(({ marker }) => { counts[marker.color] = (counts[marker.color] || 0) + 1; });
  const statsLine = `${markersWithNotes.length} Notiz${markersWithNotes.length === 1 ? '' : 'en'} insgesamt`;
  page.drawText(statsLine, {
    x: MARGIN,
    y: cursorY - HEADER_SIZE,
    size: HEADER_SIZE,
    font: font,
    color: rgb(0.4, 0.45, 0.55),
  });
  cursorY -= HEADER_SIZE + 6;

  // Trennlinie
  page.drawLine({
    start: { x: MARGIN, y: cursorY },
    end: { x: A4_WIDTH - MARGIN, y: cursorY },
    thickness: 0.8,
    color: rgb(0.85, 0.88, 0.92),
  });
  cursorY -= 18;

  // Notizen-Liste
  for (const { marker, globalIndex } of markersWithNotes) {
    const color = MARKER_COLORS[marker.color] || MARKER_COLORS.green;
    const label = MARKER_LABELS[marker.color] || '';
    const snippet = sanitizeForWinAnsi((marker.textSnippet || '').replace(/\s+/g, ' ').trim());
    const truncatedSnippet = snippet.length > 130 ? snippet.slice(0, 127) + '…' : snippet;

    const noteText = sanitizeForWinAnsi(marker.note.trim());
    const wrappedNote = wrapText(noteText, font, NOTE_SIZE, CONTENT_WIDTH - 32);

    // Höhe vorberechnen für Seitenumbruch
    const headerHeight = TEXT_SIZE + 4;
    const snippetHeight = wrapText(truncatedSnippet, font, NOTE_SIZE - 1, CONTENT_WIDTH - 32).length * (NOTE_SIZE - 1) * 1.35;
    const noteHeight = wrappedNote.length * LINE_HEIGHT_NOTE;
    const blockHeight = headerHeight + snippetHeight + noteHeight + 20;

    if (cursorY - blockHeight < MARGIN) {
      // Neue Seite
      page = pdfLibDoc.addPage([A4_WIDTH, A4_HEIGHT]);
      cursorY = A4_HEIGHT - MARGIN;
      page.drawText('Notizen zum Vertrag (Fortsetzung)', {
        x: MARGIN,
        y: cursorY - TITLE_SIZE,
        size: TITLE_SIZE,
        font: fontBold,
        color: rgb(0.12, 0.27, 0.55),
      });
      cursorY -= TITLE_SIZE + 18;
    }

    // Index-Badge
    const indexBadge = `[${globalIndex}]`;
    const indexBadgeWidth = fontBold.widthOfTextAtSize(indexBadge, TEXT_SIZE) + 8;
    page.drawRectangle({
      x: MARGIN,
      y: cursorY - TEXT_SIZE - 3,
      width: indexBadgeWidth,
      height: TEXT_SIZE + 5,
      color: rgb(0.23, 0.51, 0.96),
      borderWidth: 0,
    });
    page.drawText(indexBadge, {
      x: MARGIN + 4,
      y: cursorY - TEXT_SIZE,
      size: TEXT_SIZE,
      font: fontBold,
      color: rgb(1, 1, 1),
    });

    // Page-Info + Farb-Label
    const pageInfo = `Seite ${marker.page} · ${label}`;
    page.drawText(pageInfo, {
      x: MARGIN + indexBadgeWidth + 8,
      y: cursorY - TEXT_SIZE,
      size: TEXT_SIZE,
      font: fontBold,
      color: rgb(color.r * 0.75, color.g * 0.75, color.b * 0.75),
    });

    cursorY -= TEXT_SIZE + 8;

    // Snippet (Vorschau-Text)
    if (truncatedSnippet) {
      const snippetLines = wrapText(`„${truncatedSnippet}"`, font, NOTE_SIZE - 1, CONTENT_WIDTH - 16);
      for (const line of snippetLines) {
        page.drawText(line, {
          x: MARGIN + 8,
          y: cursorY - (NOTE_SIZE - 1),
          size: NOTE_SIZE - 1,
          font: font,
          color: rgb(0.45, 0.50, 0.58),
        });
        cursorY -= (NOTE_SIZE - 1) * 1.35;
      }
      cursorY -= 4;
    }

    // Notiz-Text (eigentliche Notiz)
    for (const line of wrappedNote) {
      page.drawText(line, {
        x: MARGIN + 8,
        y: cursorY - NOTE_SIZE,
        size: NOTE_SIZE,
        font: font,
        color: rgb(0.15, 0.18, 0.25),
      });
      cursorY -= LINE_HEIGHT_NOTE;
    }

    cursorY -= 14;
  }
}

/**
 * Einfaches Word-Wrap für PDF-Text. Bricht bei Leerzeichen-Grenzen um.
 */
function wrapText(text, font, fontSize, maxWidth) {
  const lines = [];
  const paragraphs = text.replace(/[\r\n]+/g, '\n').split('\n');

  for (const paragraph of paragraphs) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const width = font.widthOfTextAtSize(testLine, fontSize);

      if (width <= maxWidth) {
        currentLine = testLine;
      } else {
        if (currentLine) lines.push(currentLine);
        if (font.widthOfTextAtSize(word, fontSize) > maxWidth) {
          let chunk = '';
          for (const ch of word) {
            const test = chunk + ch;
            if (font.widthOfTextAtSize(test, fontSize) > maxWidth) {
              if (chunk) lines.push(chunk);
              chunk = ch;
            } else {
              chunk = test;
            }
          }
          currentLine = chunk;
        } else {
          currentLine = word;
        }
      }
    }
    if (currentLine) lines.push(currentLine);
    if (paragraphs.length > 1) lines.push('');
  }
  while (lines.length > 0 && lines[lines.length - 1] === '') lines.pop();
  return lines;
}

module.exports = { exportPdfWithMarkers };
