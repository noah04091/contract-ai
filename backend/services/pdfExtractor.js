/**
 * Document Text Extractor Service
 *
 * Robuste Textextraktion mit:
 * - PDF und DOCX Unterstützung
 * - Erkennung von gescannten PDFs
 * - Erkennung von verschlüsselten PDFs
 * - Qualitätsprüfung des extrahierten Textes
 * - AWS Textract OCR-Fallback für gescannte PDFs
 * - Detaillierte Fehlermeldungen
 */

const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const { extractTextWithOCR, isTextractAvailable } = require('./textractService');
const { checkOcrUsage, incrementOcrUsage, getOcrLimitMessage } = require('./ocrUsageService');

class PdfExtractor {
  /**
   * Extrahiert Text aus einem PDF-Buffer
   *
   * @param {Buffer} pdfBuffer - Der PDF-Buffer
   * @param {Object} options - Optionen
   * @returns {Object} { success, text, quality, warnings, error }
   */
  async extractText(buffer, options = {}) {
    const mimetype = options.mimetype || 'application/pdf';

    const result = {
      success: false,
      text: '',
      quality: {
        charCount: 0,
        wordCount: 0,
        pageCount: 0,
        avgCharsPerPage: 0,
        isLikelyScanned: false,
        isLikelyEncrypted: false,
        hasMinimalContent: false,
        qualityScore: 0 // 0-100
      },
      warnings: [],
      error: null
    };

    if (!buffer || buffer.length === 0) {
      result.error = 'Leerer Buffer erhalten';
      return result;
    }

    try {
      // DOCX-Extraktion via mammoth
      if (mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        const docxResult = await mammoth.extractRawText({ buffer });
        result.text = docxResult.value || '';
        result.quality.charCount = result.text.length;
        result.quality.wordCount = result.text.split(/\s+/).filter(w => w.length > 0).length;
        result.quality.pageCount = 0; // DOCX hat kein natives Seitenkonzept

        // DOCX ist nie gescannt, Quality-Check vereinfacht
        if (result.quality.charCount >= 50) {
          result.success = true;
        }

        if (result.quality.charCount < 100) {
          result.quality.hasMinimalContent = true;
          result.warnings.push({
            type: 'minimal_content',
            message: `Nur ${result.quality.charCount} Zeichen extrahiert. Der Vertrag könnte unvollständig analysiert werden.`,
            suggestion: 'Prüfen Sie, ob das Dokument vollständig ist.'
          });
        }

        const garbageRatio = this.calculateGarbageRatio(result.text);
        result.quality.qualityScore = this.calculateQualityScore(result.quality, garbageRatio);

        console.log(`📄 [PdfExtractor] DOCX-Extraktion: ${result.quality.charCount} Zeichen, Score: ${result.quality.qualityScore}%`);
        return result;
      }

      // PDF-Parse mit Optionen für bessere Extraktion
      const pdfData = await pdfParse(buffer, {
        // Maximale Seitenanzahl (Schutz vor riesigen PDFs)
        max: options.maxPages || 500,
        // Version muss mit installierter pdf.js Version übereinstimmen
        version: 'v1.10.100'
      });

      result.text = pdfData.text || '';
      result.quality.charCount = result.text.length;
      result.quality.wordCount = result.text.split(/\s+/).filter(w => w.length > 0).length;
      result.quality.pageCount = pdfData.numpages || 0;

      // Berechne durchschnittliche Zeichen pro Seite
      if (result.quality.pageCount > 0) {
        result.quality.avgCharsPerPage = Math.round(result.quality.charCount / result.quality.pageCount);
      }

      // ===== QUALITÄTSPRÜFUNG =====

      // 1. Prüfe auf gescannte PDFs (sehr wenig Text pro Seite)
      if (result.quality.pageCount > 0 && result.quality.avgCharsPerPage < 100) {
        result.quality.isLikelyScanned = true;
        result.warnings.push({
          type: 'likely_scanned',
          message: 'Diese PDF scheint gescannt zu sein (Bilddatei). Der Text konnte möglicherweise nicht vollständig extrahiert werden.',
          suggestion: 'Bitte laden Sie eine digitale PDF hoch oder nutzen Sie ein OCR-Tool, um den Text zu extrahieren.'
        });
      }

      // 2. Prüfe auf minimalen Inhalt
      if (result.quality.charCount < 100) {
        result.quality.hasMinimalContent = true;
        result.warnings.push({
          type: 'minimal_content',
          message: `Nur ${result.quality.charCount} Zeichen extrahiert. Der Vertrag könnte unvollständig analysiert werden.`,
          suggestion: 'Prüfen Sie, ob die PDF lesbar ist und Text enthält.'
        });
      }

      // 3. Prüfe auf "Müll-Zeichen" (Hinweis auf Encoding-Probleme)
      const garbageRatio = this.calculateGarbageRatio(result.text);
      if (garbageRatio > 0.2) {
        result.warnings.push({
          type: 'encoding_issues',
          message: 'Der Text enthält möglicherweise Encoding-Fehler (unleserliche Zeichen).',
          suggestion: 'Die PDF könnte mit einem ungewöhnlichen Font erstellt worden sein.'
        });
      }

      // 4. Berechne Qualitätsscore (0-100)
      result.quality.qualityScore = this.calculateQualityScore(result.quality, garbageRatio);

      // Erfolg wenn genug Text vorhanden
      if (result.quality.charCount >= 50 && !result.quality.isLikelyScanned) {
        result.success = true;
      } else if (result.quality.charCount >= 50) {
        // Gescannt aber trotzdem etwas Text gefunden
        result.success = true;
        result.warnings.push({
          type: 'partial_extraction',
          message: 'Text wurde extrahiert, aber die Qualität könnte eingeschränkt sein.',
          suggestion: 'Überprüfen Sie das Analyseergebnis auf Vollständigkeit.'
        });
      }

      console.log(`📄 [PdfExtractor] Extraktion: ${result.quality.charCount} Zeichen, ${result.quality.pageCount} Seiten, Score: ${result.quality.qualityScore}%`);

    } catch (error) {
      console.error(`❌ [PdfExtractor] Fehler:`, error.message);

      // Spezifische Fehlererkennung
      if (error.message.includes('password') || error.message.includes('encrypted')) {
        result.quality.isLikelyEncrypted = true;
        result.error = 'Diese PDF ist passwortgeschützt. Bitte entfernen Sie den Schutz oder laden Sie eine ungeschützte Version hoch.';
      } else if (error.message.includes('Invalid') || error.message.includes('corrupt')) {
        result.error = 'Die PDF-Datei ist beschädigt oder ungültig. Bitte laden Sie eine gültige PDF hoch.';
      } else if (error.message.includes('stream')) {
        result.error = 'Die PDF konnte nicht gelesen werden. Das Format wird möglicherweise nicht unterstützt.';
      } else {
        result.error = `PDF-Extraktion fehlgeschlagen: ${error.message}`;
      }
    }

    return result;
  }

  /**
   * Berechnet den Anteil von "Müll-Zeichen" im Text
   */
  calculateGarbageRatio(text) {
    if (!text || text.length === 0) return 0;

    // Zähle Zeichen die nicht normal lesbar sind
    const garbageChars = text.match(/[^\w\s\d\.\,\;\:\!\?\-\(\)\[\]\{\}äöüÄÖÜßéèêëàáâãåçñ€§%&\/\\@#\*\+\=\'\"]/g);
    const garbageCount = garbageChars ? garbageChars.length : 0;

    return garbageCount / text.length;
  }

  /**
   * Berechnet einen Qualitätsscore von 0-100
   */
  calculateQualityScore(quality, garbageRatio) {
    let score = 100;

    // Abzüge für verschiedene Probleme
    if (quality.isLikelyScanned) score -= 40;
    if (quality.isLikelyEncrypted) score -= 50;
    if (quality.hasMinimalContent) score -= 30;
    if (quality.avgCharsPerPage < 500 && quality.pageCount > 0) score -= 20;

    // Abzug für Müll-Zeichen
    score -= Math.round(garbageRatio * 50);

    // Bonus für gute Extraktion
    if (quality.avgCharsPerPage > 2000) score += 10;
    if (quality.wordCount > 500) score += 10;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Generiert eine benutzerfreundliche Fehlermeldung
   */
  getErrorMessage(result) {
    if (result.error) {
      return result.error;
    }

    if (result.quality.isLikelyScanned && result.quality.charCount < 100) {
      return 'Diese PDF scheint ein gescanntes Dokument zu sein. Bitte laden Sie eine digitale PDF hoch oder nutzen Sie ein OCR-Tool.';
    }

    if (result.quality.hasMinimalContent) {
      return 'Die PDF enthält zu wenig Text für eine Analyse. Bitte prüfen Sie, ob der Vertrag vollständig ist.';
    }

    if (result.warnings.length > 0) {
      return result.warnings[0].message;
    }

    return 'Die PDF konnte nicht verarbeitet werden.';
  }

  /**
   * Prüft ob eine Warnung angezeigt werden sollte
   */
  shouldShowWarning(result) {
    return result.warnings.length > 0 || result.quality.qualityScore < 70;
  }

  /**
   * Extrahiert Text mit automatischem OCR-Fallback
   *
   * Ablauf:
   * 1. Versuche pdf-parse (schnell, kostenlos)
   * 2. Wenn Qualität < 50% → AWS Textract OCR (langsamer, kostet ~$0.0015/Seite)
   *
   * @param {Buffer} pdfBuffer - Der PDF-Buffer
   * @param {Object} options - Optionen
   * @param {boolean} options.enableOCR - OCR aktivieren (default: true)
   * @param {number} options.ocrThreshold - Qualitätsschwelle für OCR (default: 50)
   * @param {string} options.userId - User-ID für OCR-Nutzungstracking (optional)
   * @returns {Object} { success, text, quality, warnings, error, usedOCR, ocrUsage }
   */
  async extractTextWithOCRFallback(buffer, options = {}) {
    const enableOCR = options.enableOCR !== false;
    const ocrThreshold = options.ocrThreshold || 50;
    const userId = options.userId;
    const mimetype = options.mimetype || 'application/pdf';

    // Schritt 1: Normale Extraktion (PDF oder DOCX)
    const result = await this.extractText(buffer, options);
    result.usedOCR = false;
    result.ocrUsage = null;

    // Wenn erfolgreich und gute Qualität → fertig
    if (result.success && result.quality.qualityScore >= ocrThreshold) {
      console.log(`✅ [PdfExtractor] Normale Extraktion erfolgreich (Score: ${result.quality.qualityScore}%)`);
      return result;
    }

    // Schritt 2: OCR-Fallback wenn Qualität niedrig (nur für PDFs, DOCX braucht kein OCR)
    const isPdf = mimetype === 'application/pdf';
    if (isPdf && enableOCR && (result.quality.isLikelyScanned || result.quality.qualityScore < ocrThreshold)) {
      console.log(`🔍 [PdfExtractor] Qualität niedrig (${result.quality.qualityScore}%), versuche OCR...`);

      // Prüfe ob Textract verfügbar
      const textractStatus = await isTextractAvailable();
      if (!textractStatus.available) {
        console.warn(`⚠️ [PdfExtractor] OCR nicht verfügbar: ${textractStatus.reason}`);
        result.warnings.push({
          type: 'ocr_unavailable',
          message: 'OCR ist nicht konfiguriert. Gescannte PDFs können nicht automatisch verarbeitet werden.',
          suggestion: 'Bitte laden Sie eine digitale PDF hoch oder kontaktieren Sie den Support.'
        });
        return result;
      }

      // Prüfe OCR-Nutzungslimit (wenn userId vorhanden)
      if (userId) {
        const usageCheck = await checkOcrUsage(userId);
        result.ocrUsage = usageCheck;

        if (!usageCheck.allowed) {
          console.warn(`⚠️ [PdfExtractor] OCR-Limit erreicht für User ${userId}`);
          result.warnings.push({
            type: 'ocr_limit_reached',
            message: getOcrLimitMessage(usageCheck),
            suggestion: 'Upgraden Sie Ihren Plan für mehr OCR-Seiten oder laden Sie eine digitale PDF hoch.'
          });
          return result;
        }

        // Warnung wenn Limit fast erreicht (< 20% verbleibend)
        if (usageCheck.pagesLimit > 0) {
          const percentRemaining = (usageCheck.pagesRemaining / usageCheck.pagesLimit) * 100;
          if (percentRemaining < 20) {
            result.warnings.push({
              type: 'ocr_limit_warning',
              message: `OCR-Kontingent fast aufgebraucht: ${usageCheck.pagesRemaining} von ${usageCheck.pagesLimit} Seiten verbleibend.`,
              suggestion: 'Sparen Sie OCR-Seiten indem Sie digitale PDFs hochladen.'
            });
          }
        }

        console.log(`📊 [PdfExtractor] OCR-Nutzung: ${usageCheck.pagesUsed}/${usageCheck.pagesLimit} Seiten`);
      }

      try {
        const ocrResult = await extractTextWithOCR(buffer);

        if (ocrResult.success && ocrResult.text.length > result.text.length) {
          // OCR war erfolgreich und hat mehr Text gefunden
          console.log(`✅ [PdfExtractor] OCR erfolgreich: ${ocrResult.text.length} Zeichen (vorher: ${result.text.length})`);

          // OCR-Nutzung inkrementieren (wenn userId vorhanden)
          if (userId) {
            const pagesProcessed = ocrResult.pages || 1;
            const incrementResult = await incrementOcrUsage(userId, pagesProcessed);
            if (incrementResult.success) {
              console.log(`📊 [PdfExtractor] OCR-Nutzung erhöht: +${pagesProcessed} Seiten (Total: ${incrementResult.newTotal})`);
              // Update ocrUsage mit neuen Werten
              if (result.ocrUsage) {
                result.ocrUsage.pagesUsed = incrementResult.newTotal;
                result.ocrUsage.pagesRemaining = Math.max(0, result.ocrUsage.pagesLimit - incrementResult.newTotal);
              }
            }
          }

          result.text = ocrResult.text;
          result.success = true;
          result.usedOCR = true;
          result.ocrPages = ocrResult.pages || 1;
          result.quality.charCount = ocrResult.text.length;
          result.quality.wordCount = ocrResult.text.split(/\s+/).filter(w => w.length > 0).length;
          result.quality.qualityScore = Math.round(ocrResult.confidence);
          result.quality.isLikelyScanned = true; // War gescannt, aber jetzt haben wir Text

          // Entferne alte Warnungen über gescannte PDFs
          result.warnings = result.warnings.filter(w => w.type !== 'likely_scanned' && w.type !== 'minimal_content');

          // Füge OCR-Info hinzu
          result.warnings.push({
            type: 'ocr_used',
            message: `Text wurde per OCR extrahiert (${ocrResult.confidence.toFixed(0)}% Confidence, ${ocrResult.pages || 1} Seiten).`,
            suggestion: 'Bitte prüfen Sie die Analyse auf mögliche OCR-Fehler.'
          });

        } else if (ocrResult.error) {
          console.warn(`⚠️ [PdfExtractor] OCR fehlgeschlagen: ${ocrResult.error}`);
          result.warnings.push({
            type: 'ocr_failed',
            message: ocrResult.error,
            suggestion: 'Bitte laden Sie eine digitale PDF hoch.'
          });
        }

      } catch (ocrError) {
        console.error(`❌ [PdfExtractor] OCR Fehler:`, ocrError.message);
        result.warnings.push({
          type: 'ocr_error',
          message: `OCR-Verarbeitung fehlgeschlagen: ${ocrError.message}`,
          suggestion: 'Bitte laden Sie eine digitale PDF hoch.'
        });
      }
    }

    return result;
  }
}

module.exports = new PdfExtractor();
