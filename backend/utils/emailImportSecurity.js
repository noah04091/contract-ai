// 📁 backend/utils/emailImportSecurity.js
// 🔒 Security-Funktionen für E-Mail-Import

const crypto = require('crypto');

/**
 * 🧹 Filename Sanitizer
 * Entfernt gefährliche Zeichen und Pfad-Traversal-Versuche
 *
 * @param {string} filename - Original-Dateiname
 * @returns {string} - Sanitized Filename
 */
function sanitizeFilename(filename) {
  if (!filename || typeof filename !== 'string') {
    return 'unnamed_file.pdf';
  }

  // Unicode Normalisierung (verhindert Unicode-Tricks)
  let safe = filename.normalize('NFD');

  // Entferne Pfad-Traversal (../, ..\, etc.)
  safe = safe.replace(/\.\.[\/\\]/g, '');

  // Entferne Steuerzeichen (ASCII 0-31)
  safe = safe.replace(/[\x00-\x1F\x7F]/g, '');

  // Entferne gefährliche Zeichen
  safe = safe.replace(/[<>:"|?*]/g, '_');

  // Begrenze Länge (max 200 Zeichen)
  if (safe.length > 200) {
    const ext = safe.split('.').pop();
    const name = safe.substring(0, 200 - ext.length - 1);
    safe = `${name}.${ext}`;
  }

  // Falls nichts übrig bleibt, Default-Name
  if (!safe || safe.trim().length === 0) {
    safe = 'unnamed_file.pdf';
  }

  return safe;
}

/**
 * 🔍 MIME Type Sniffer
 * Prüft den tatsächlichen Content-Type der Datei (nicht nur Extension)
 *
 * @param {Buffer} buffer - File Buffer
 * @returns {string|null} - Detected MIME type oder null
 */
function detectMimeType(buffer) {
  if (!buffer || buffer.length < 4) {
    return null;
  }

  // PDF Magic Bytes: %PDF (25 50 44 46)
  if (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) {
    return 'application/pdf';
  }

  // ZIP (für DOCX, etc.): PK (50 4B)
  if (buffer[0] === 0x50 && buffer[1] === 0x4B) {
    // DOCX ist ein ZIP-Archiv, prüfe auf [Content_Types].xml
    const bufferString = buffer.toString('utf-8', 0, Math.min(buffer.length, 1000));
    if (bufferString.includes('[Content_Types].xml')) {
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    }
    return 'application/zip';
  }

  // JPEG: FF D8 FF
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
    return 'image/jpeg';
  }

  // PNG: 89 50 4E 47
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
    return 'image/png';
  }

  return null;
}

/**
 * ✅ Validiere Attachment
 * Kombination aus Filename-Sanitizing, MIME-Checking, Size-Limit
 *
 * @param {object} attachment - { filename, contentType, data (base64) }
 * @param {number} maxSizeMB - Maximum size in MB (default: 15)
 * @returns {object} - { valid: boolean, error?: string, sanitizedFilename?: string, detectedMimeType?: string }
 */
function validateAttachment(attachment, maxSizeMB = 15) {
  const { filename, contentType, data } = attachment;

  // 1. Filename sanitizen
  const sanitizedFilename = sanitizeFilename(filename);

  // 2. Buffer erstellen und Größe prüfen
  let buffer;
  try {
    buffer = Buffer.from(data, 'base64');
  } catch (err) {
    return { valid: false, error: 'Ungültiges Base64-Format' };
  }

  const sizeMB = buffer.length / (1024 * 1024);
  if (sizeMB > maxSizeMB) {
    return {
      valid: false,
      error: `Datei zu groß: ${sizeMB.toFixed(2)} MB (max ${maxSizeMB} MB)`,
      sanitizedFilename
    };
  }

  // 3. MIME Type prüfen
  const detectedMimeType = detectMimeType(buffer);

  if (!detectedMimeType) {
    return {
      valid: false,
      error: 'Dateityp konnte nicht erkannt werden',
      sanitizedFilename
    };
  }

  // 4. Erlaubte Formate: PDF + Word (.docx) — 13.08.2026: DOCX freigeschaltet.
  // Die Analyse-Pipeline beherrscht DOCX längst (mammoth in analyze.js); die alte
  // "Nur PDFs (MVP)"-Sperre hier war Altbestand und hat Word-Mails still verworfen.
  // Erkennung läuft über Magic Bytes (detectMimeType oben), nie über den Dateinamen.
  const ALLOWED_MIMETYPES = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];
  if (!ALLOWED_MIMETYPES.includes(detectedMimeType)) {
    return {
      valid: false,
      error: `Nur PDF- oder Word-Dateien (.docx) erlaubt (erkannt: ${detectedMimeType})`,
      sanitizedFilename,
      detectedMimeType
    };
  }

  // ✅ Alles OK
  return {
    valid: true,
    sanitizedFilename,
    detectedMimeType,
    buffer,
    sizeMB: sizeMB.toFixed(2)
  };
}

/**
 * 🔐 Generiere Idempotenz-Key
 * Erstellt eindeutigen Hash aus messageId + attachment content
 *
 * @param {string} messageId - SES Message ID
 * @param {Buffer} buffer - File Buffer
 * @returns {string} - SHA256 Hash
 */
function generateIdempotencyKey(messageId, buffer) {
  const hash = crypto.createHash('sha256');
  hash.update(messageId);
  hash.update(buffer);
  return hash.digest('hex');
}

module.exports = {
  sanitizeFilename,
  detectMimeType,
  validateAttachment,
  generateIdempotencyKey
};
