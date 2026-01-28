/**
 * Zentraler Text-Extraktor Service
 *
 * Unterstützt PDF und DOCX Formate.
 * Extrahiert reinen Text aus Dokumenten für die weitere Verarbeitung.
 */

const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');

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
    return {
      text: result.text || '',
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

module.exports = {
  extractTextFromBuffer,
  isSupportedMimetype,
  isPdf,
  isDocx,
  SUPPORTED_MIMETYPES
};
