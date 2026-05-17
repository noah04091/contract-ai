/**
 * Zentraler Text-Extraktor Service
 *
 * Unterstützt PDF und DOCX Formate.
 * Extrahiert reinen Text aus Dokumenten für die weitere Verarbeitung.
 */

const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const { PDFDocument } = require('pdf-lib');

const SUPPORTED_MIMETYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];

/**
 * Extrahiert Text aus einem Buffer basierend auf dem MIME-Type
 *
 * @param {Buffer} buffer - Datei-Buffer
 * @param {string} mimetype - MIME-Type der Datei
 * @returns {Promise<{text: string, pageCount: number|null}>}
 */
async function extractTextFromBuffer(buffer, mimetype) {
  if (!buffer || buffer.length === 0) {
    throw new Error('Leerer Buffer erhalten');
  }

  // PDF
  if (mimetype === 'application/pdf') {
    const result = await pdfParse(buffer);
    let text = result.text || '';

    // Extract AcroForm field values (fillable PDF forms)
    // pdf-parse misses form field content — pdf-lib reads it
    try {
      const formFieldText = await extractPdfFormFields(buffer);
      if (formFieldText) {
        text = text + '\n\n--- Ausgefüllte Vertragskonditionen (aus Formularfeldern) ---\nDie folgenden Werte wurden aus den ausgefüllten Formularfeldern dieses Dokuments extrahiert.\nSie ergänzen die oben genannten Paragraphen und enthalten die konkreten Vertragswerte:\n' + formFieldText;
        console.log(`📄 PDF-Formular: ${formFieldText.split('\n').length} Felder extrahiert (${formFieldText.length} Zeichen)`);
      }
    } catch (e) {
      // Not a form PDF or corrupted — log so we notice if it crashes frequently
      console.warn(`[TextExtractor] AcroForm-Read fehlgeschlagen: ${e.message}`);
    }

    // Extract PDF annotations (Acrobat Fill & Sign, FreeText comments, Stamps)
    // Nachträglich in PDFs eingetragene Werte landen oft als Annotation, nicht
    // als Text. pdfjs-dist liest die — pdf-parse nicht.
    //
    // Block-Header bewusst so formuliert, dass GPT die Annotation-Zeile als
    // EIGENSTÄNDIGE Evidence zitiert und NICHT mit dem leeren Body-Feld
    // ("Ort, Datum: _____") kombiniert. Sonst hätten wir Halluzinations-
    // Look-Alikes ("Ort, Datum: Durmersheim, den 04.04.26"), die nirgendwo
    // wörtlich im Text stehen und vom Evidence-Validator zu Recht abgelehnt
    // würden.
    try {
      const annotationText = await extractPdfAnnotations(buffer);
      if (annotationText) {
        text = text + '\n\n--- Eingefügte Vertragsdaten (PDF-Anmerkungen) ---\n'
          + 'Die folgenden Zeilen wurden nachträglich ins PDF eingefügt (z.B. via Acrobat Fill & Sign, Reviewer-Kommentare). '
          + 'Jede Zeile ist ein VOLLSTÄNDIGER, eigenständiger Vertragseintrag — typischerweise Datum, Ort oder Stempelinhalt einer Unterschrift. '
          + 'Bei Zitierung als Evidence bitte die Zeile EXAKT übernehmen und NICHT mit umliegenden Vertragstext-Platzhaltern (z.B. "Ort, Datum: ___") kombinieren.\n\n'
          + annotationText;
        console.log(`📝 PDF-Anmerkungen: ${annotationText.split('\n').length} Annotations extrahiert (${annotationText.length} Zeichen)`);
      }
    } catch (e) {
      console.warn(`[TextExtractor] Annotation-Read fehlgeschlagen: ${e.message}`);
    }

    return {
      text,
      pageCount: result.numpages || 0
    };
  }

  // DOCX
  if (mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    try {
      const result = await mammoth.extractRawText({ buffer });
      if (result.value && result.value.trim().length > 0) {
        return {
          text: result.value,
          pageCount: null
        };
      }
    } catch (mammothError) {
      console.warn('[TextExtractor] mammoth failed, trying fallback:', mammothError.message);
    }

    // Fallback: DOCX ist ein ZIP — document.xml manuell extrahieren
    try {
      const text = extractDocxFallback(buffer);
      if (text && text.trim().length > 0) {
        return { text, pageCount: null };
      }
    } catch (fallbackError) {
      console.warn('[TextExtractor] DOCX fallback also failed:', fallbackError.message);
    }

    throw new Error('DOCX-Text konnte nicht extrahiert werden. Bitte versuchen Sie es mit einer PDF-Datei.');
  }

  throw new Error(`Nicht unterstütztes Format: ${mimetype}`);
}

/**
 * Prüft ob ein MIME-Type unterstützt wird
 */
function isSupportedMimetype(mimetype) {
  return SUPPORTED_MIMETYPES.includes(mimetype);
}

/**
 * Prüft ob eine Datei ein PDF ist
 */
function isPdf(mimetype) {
  return mimetype === 'application/pdf';
}

/**
 * Prüft ob eine Datei ein DOCX ist
 */
function isDocx(mimetype) {
  return mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
}

/**
 * Extracts filled-in form field values from AcroForm PDFs.
 * Returns "Feldname: Wert" lines for all non-empty fields.
 */
async function extractPdfFormFields(buffer) {
  const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
  const form = doc.getForm();
  const fields = form.getFields();

  if (!fields || fields.length === 0) return null;

  const lines = [];
  for (const field of fields) {
    const name = field.getName() || '';
    let value = '';

    try {
      const typeName = field.constructor.name;
      if (typeName === 'PDFCheckBox') {
        value = field.isChecked() ? 'Ja' : 'Nein';
      } else if (typeName === 'PDFDropdown' || typeName === 'PDFOptionList') {
        const selected = field.getSelected();
        value = Array.isArray(selected) ? selected.join(', ') : String(selected || '');
      } else if (typeName === 'PDFRadioGroup') {
        value = String(field.getSelected() || '');
      } else if (typeof field.getText === 'function') {
        value = field.getText() || '';
      }
    } catch {
      // Field read error — skip
      continue;
    }

    if (value && value.trim()) {
      // Clean field name: "form1[0].page1[0].Flatrate_Gebuehr[0]" → "Flatrate Gebühr"
      const cleanName = name
        .replace(/\[\d+\]/g, '')       // Remove index brackets [0], [1]
        .replace(/^[^a-zA-ZÄÖÜäöü]*/, '') // Remove leading non-alpha chars
        .replace(/_/g, ' ')
        .trim() || name.trim();

      lines.push(`${cleanName}: ${value.trim()}`);
    }
  }

  return lines.length > 0 ? lines.join('\n') : null;
}

/**
 * Liest PDF-Annotations (Acrobat Fill & Sign FreeText, Stempel, Reviewer-
 * Kommentare) via pdfjs-dist. pdf-parse erfasst diese Werte nicht, weil
 * Annotations nicht im Haupt-Text-Stream stehen, sondern als Overlays.
 *
 * Gibt eine Zeile pro Annotation zurück: "Seite N - Subtype: Inhalt".
 * Bewusst KEIN Sig-Subtype (digitale Signaturen liefern Image-Stempel,
 * keinen Text — würden nur Noise erzeugen).
 *
 * Universal: kein Vertragstyp-Branch. Robust gegen fehlende Annotations
 * (gibt dann null zurück).
 */
async function extractPdfAnnotations(buffer) {
  const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.mjs');
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(buffer),
    // Reduziert Console-Spam bei Warnungen aus den PDFs
    verbosity: 0
  });
  const pdfDoc = await loadingTask.promise;

  // Welche Annotation-Subtypes liefern menschenlesbaren Text-Inhalt?
  // FreeText: Acrobat Fill & Sign Text-Stempel, Notizen
  // Text: Reviewer-Comments mit Inhalt
  // Stamp: Genehmigt/Vertraulich/etc. mit Namen-Wert
  // (Widget liegt schon im AcroForm-Reader; Sig würde nur "user1" o.ä. liefern)
  const RELEVANT_SUBTYPES = new Set(['FreeText', 'Text', 'Stamp']);

  const lines = [];
  for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
    const page = await pdfDoc.getPage(pageNum);
    const annotations = await page.getAnnotations();
    if (!annotations || annotations.length === 0) continue;

    for (const a of annotations) {
      if (!RELEVANT_SUBTYPES.has(a.subtype)) continue;
      // Inhalt aus mehreren möglichen Feldern lesen (je nach Annotation-Variante)
      let content = '';
      if (typeof a.contents === 'string') content = a.contents;
      else if (a.contentsObj && typeof a.contentsObj.str === 'string') content = a.contentsObj.str;
      else if (a.titleObj && typeof a.titleObj.str === 'string') content = a.titleObj.str;

      content = (content || '').trim();
      if (!content) continue;
      // Whitespace normalisieren, damit der nachfolgende Date-Hunt/Evidence-
      // Validator das Sätze sauber findet.
      content = content.replace(/\s+/g, ' ');
      lines.push(`Seite ${pageNum} - ${a.subtype}: ${content}`);
    }
  }

  return lines.length > 0 ? lines.join('\n') : null;
}

/**
 * Fallback DOCX-Textextraktion ohne mammoth.
 * DOCX = ZIP mit word/document.xml. Wir suchen die XML-Datei im Buffer
 * und strippen die XML-Tags um reinen Text zu extrahieren.
 */
function extractDocxFallback(buffer) {
  const zlib = require('zlib');

  // DOCX ist ein ZIP — PK-Signatur prüfen
  if (buffer[0] !== 0x50 || buffer[1] !== 0x4b) {
    throw new Error('Keine gültige DOCX-Datei (kein ZIP-Format)');
  }

  // Einfacher ZIP-Parser: Local File Headers durchsuchen
  let offset = 0;
  const files = [];

  while (offset < buffer.length - 30) {
    // Local File Header Signature: PK\x03\x04
    if (buffer[offset] === 0x50 && buffer[offset + 1] === 0x4b &&
        buffer[offset + 2] === 0x03 && buffer[offset + 3] === 0x04) {

      const compressionMethod = buffer.readUInt16LE(offset + 8);
      const compressedSize = buffer.readUInt32LE(offset + 18);
      const uncompressedSize = buffer.readUInt32LE(offset + 22);
      const fileNameLength = buffer.readUInt16LE(offset + 26);
      const extraFieldLength = buffer.readUInt16LE(offset + 28);
      const fileName = buffer.toString('utf8', offset + 30, offset + 30 + fileNameLength);
      const dataStart = offset + 30 + fileNameLength + extraFieldLength;

      if (fileName === 'word/document.xml' && compressedSize > 0) {
        const compressedData = buffer.slice(dataStart, dataStart + compressedSize);
        let xmlContent;
        if (compressionMethod === 8) { // Deflate
          xmlContent = zlib.inflateRawSync(compressedData).toString('utf8');
        } else if (compressionMethod === 0) { // Stored
          xmlContent = compressedData.toString('utf8');
        }
        if (xmlContent) {
          files.push(xmlContent);
        }
      }

      offset = dataStart + (compressedSize > 0 ? compressedSize : 0);
    } else {
      offset++;
    }
  }

  if (files.length === 0) {
    throw new Error('word/document.xml nicht in DOCX gefunden');
  }

  // XML → reiner Text: Tags entfernen, Absätze erhalten
  let text = files[0];
  // Paragraph-Ends (</w:p>) und Zeilenumbrüche (</w:br>) als \n
  text = text.replace(/<\/w:p>/g, '\n');
  text = text.replace(/<w:br[^>]*\/>/g, '\n');
  // Tab-Elemente
  text = text.replace(/<w:tab\/>/g, '\t');
  // Alle XML-Tags entfernen
  text = text.replace(/<[^>]+>/g, '');
  // HTML-Entities decodieren
  text = text.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'");
  // Mehrfache Leerzeilen reduzieren
  text = text.replace(/\n{3,}/g, '\n\n').trim();

  return text;
}

module.exports = {
  extractTextFromBuffer,
  isSupportedMimetype,
  isPdf,
  isDocx,
  SUPPORTED_MIMETYPES
};
