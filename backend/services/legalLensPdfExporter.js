// backend/services/legalLensPdfExporter.js
// PDF-Export mit eingebrannten Marker-Highlights + Notizen für Legal Lens

const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.mjs');

// Farbpalette für Marker (RGB normalisiert, 0-1)
const MARKER_COLORS = {
  green:  { r: 0.13, g: 0.77, b: 0.37 },
  orange: { r: 0.98, g: 0.45, b: 0.09 },
  red:    { r: 0.94, g: 0.27, b: 0.27 },
  blue:   { r: 0.23, g: 0.51, b: 0.96 },
};

const MARKER_OPACITY = 0.25; // Highlighter-Light wie Frontend
const NOTE_TEXT_MAX_LENGTH = 250;
const NOTE_AREA_WIDTH = 140;
const NOTE_FONT_SIZE = 7;

/**
 * Annotiert ein PDF mit Marker-Highlights und Notiz-Texten am rechten Rand.
 *
 * @param {Buffer} pdfBuffer - Original-PDF als Buffer
 * @param {Array} markers - Array von PdfMarker-Objekten
 * @returns {Promise<Uint8Array>} - Annotiertes PDF als Buffer
 */
async function exportPdfWithMarkers(pdfBuffer, markers) {
  if (!markers || markers.length === 0) {
    // Nichts zu annotieren — Original zurückgeben
    return new Uint8Array(pdfBuffer);
  }

  // 1. pdfjs-dist: Text-Item-Positionen pro Page lesen
  const pdfjsDoc = await pdfjsLib.getDocument({ data: new Uint8Array(pdfBuffer) }).promise;

  // 2. pdf-lib: zum Editieren öffnen
  const pdfLibDoc = await PDFDocument.load(pdfBuffer);
  const helveticaFont = await pdfLibDoc.embedFont(StandardFonts.Helvetica);
  const pages = pdfLibDoc.getPages();

  // 3. Marker nach Page gruppieren (Performance: Page-Items nur einmal laden)
  const markersByPage = new Map();
  markers.forEach(m => {
    if (!markersByPage.has(m.page)) markersByPage.set(m.page, []);
    markersByPage.get(m.page).push(m);
  });

  // 4. Pro Page: Text-Items holen, Marker zeichnen
  for (const [pageNum, pageMarkers] of markersByPage.entries()) {
    const pageIdx = pageNum - 1; // 1-indexed → 0-indexed
    if (pageIdx < 0 || pageIdx >= pages.length) continue;

    const pdfLibPage = pages[pageIdx];
    const pdfjsPage = await pdfjsDoc.getPage(pageNum);
    const textContent = await pdfjsPage.getTextContent();
    const pageWidth = pdfLibPage.getWidth();
    const pageHeight = pdfLibPage.getHeight();

    for (const marker of pageMarkers) {
      const color = MARKER_COLORS[marker.color] || MARKER_COLORS.green;

      // 4a. Rechtecke für jeden span-Index zeichnen
      const rects = [];
      for (const spanIdx of (marker.spanIndices || [])) {
        if (spanIdx < 0 || spanIdx >= textContent.items.length) continue;
        const item = textContent.items[spanIdx];
        if (!item || !item.transform) continue;

        // pdfjs transform: [a, b, c, d, e, f] — e/f sind Position
        // f ist die BASELINE-y des Texts (bottom-up Koordinatensystem in PDFs)
        const x = item.transform[4];
        const yBaseline = item.transform[5];
        const width = item.width || 0;
        // Höhe schätzen aus Font-Skalierung (transform[3] = scaleY)
        const fontHeight = Math.abs(item.transform[3]) || 10;
        // pdf-lib drawRectangle nimmt bottom-left corner
        // Baseline ist innerhalb des Glyph — wir ziehen leicht nach unten für volle Abdeckung
        const y = yBaseline - fontHeight * 0.2;
        const height = fontHeight * 1.15;

        if (width > 0 && height > 0) {
          rects.push({ x, y, width, height });
        }
      }

      // 4b. Highlight-Rechtecke zeichnen
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

      // 4c. Bei Notiz: Text-Anmerkung am rechten Rand zeichnen
      if (marker.note && marker.note.trim().length > 0 && rects.length > 0) {
        const firstRect = rects[0];
        const noteRaw = marker.note.trim().slice(0, NOTE_TEXT_MAX_LENGTH);

        // Word-Wrap für Notiz-Text
        const wrappedLines = wrapText(noteRaw, helveticaFont, NOTE_FONT_SIZE, NOTE_AREA_WIDTH - 16);
        const lineHeight = NOTE_FONT_SIZE * 1.3;
        const boxHeight = Math.min(wrappedLines.length, 8) * lineHeight + 8;
        const visibleLines = wrappedLines.slice(0, 8); // Max 8 Zeilen

        const noteX = Math.max(pageWidth - NOTE_AREA_WIDTH - 4, firstRect.x + firstRect.width + 8);
        const noteY = Math.min(firstRect.y + firstRect.height, pageHeight - boxHeight - 4);

        // Hintergrund-Box für Notiz (sanftes Blau wie im Frontend)
        pdfLibPage.drawRectangle({
          x: noteX,
          y: noteY - boxHeight + 4,
          width: NOTE_AREA_WIDTH,
          height: boxHeight,
          color: rgb(0.95, 0.97, 1.0),
          borderColor: rgb(0.58, 0.78, 0.98),
          borderWidth: 0.8,
          opacity: 0.95,
        });

        // Notiz-Text zeilenweise
        visibleLines.forEach((line, i) => {
          pdfLibPage.drawText(line, {
            x: noteX + 4,
            y: noteY - 8 - (i * lineHeight),
            size: NOTE_FONT_SIZE,
            font: helveticaFont,
            color: rgb(0.12, 0.27, 0.55),
          });
        });

        // Cut-Indicator wenn Notiz länger als 8 Zeilen
        if (wrappedLines.length > 8) {
          pdfLibPage.drawText('…', {
            x: noteX + NOTE_AREA_WIDTH - 12,
            y: noteY - boxHeight + 8,
            size: NOTE_FONT_SIZE,
            font: helveticaFont,
            color: rgb(0.4, 0.55, 0.75),
          });
        }
      }
    }
  }

  return await pdfLibDoc.save();
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
        // Falls einzelnes Wort zu lang: hart abschneiden
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
    if (paragraphs.length > 1) lines.push(''); // Absatz-Leerzeile
  }
  // Trailing-empty entfernen
  while (lines.length > 0 && lines[lines.length - 1] === '') lines.pop();
  return lines;
}

module.exports = { exportPdfWithMarkers };
