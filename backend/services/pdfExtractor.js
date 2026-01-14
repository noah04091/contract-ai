/**
 * PDF Text Extractor Service
 *
 * Robuste PDF-Textextraktion mit:
 * - Erkennung von gescannten PDFs
 * - Erkennung von verschlüsselten PDFs
 * - Qualitätsprüfung des extrahierten Textes
 * - Detaillierte Fehlermeldungen
 */

const pdfParse = require('pdf-parse');

class PdfExtractor {
  /**
   * Extrahiert Text aus einem PDF-Buffer
   *
   * @param {Buffer} pdfBuffer - Der PDF-Buffer
   * @param {Object} options - Optionen
   * @returns {Object} { success, text, quality, warnings, error }
   */
  async extractText(pdfBuffer, options = {}) {
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

    if (!pdfBuffer || pdfBuffer.length === 0) {
      result.error = 'Leerer PDF-Buffer erhalten';
      return result;
    }

    try {
      // PDF-Parse mit Optionen für bessere Extraktion
      const pdfData = await pdfParse(pdfBuffer, {
        // Maximale Seitenanzahl (Schutz vor riesigen PDFs)
        max: options.maxPages || 500,
        // Version Info für Debugging
        version: 'v2.0.0'
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
}

module.exports = new PdfExtractor();
