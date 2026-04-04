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
        text = text + '\n\n--- Formularfelder ---\n' + formFieldText;
        console.log(`📄 PDF-Formular: ${formFieldText.split('\n').length} Felder extrahiert (${formFieldText.length} Zeichen)`);
      }
    } catch (e) {
      // Not a form PDF or corrupted — ignore silently
    }

    return {
      text,
      pageCount: result.numpages || 0
    };
  }

  // DOCX
  if (mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    const result = await mammoth.extractRawText({ buffer });
    return {
      text: result.value || '',
      pageCount: null // DOCX hat kein natives Seitenkonzept
    };
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

module.exports = {
  extractTextFromBuffer,
  isSupportedMimetype,
  isPdf,
  isDocx,
  SUPPORTED_MIMETYPES
};
