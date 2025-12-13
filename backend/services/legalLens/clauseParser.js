/**
 * Legal Lens - Clause Parser Service
 *
 * Parst Vertragstext in strukturierte Klauseln für die interaktive Analyse.
 * Erkennt Paragraphen, Abschnitte und Sätze mit Risiko-Vorbewertung.
 *
 * @version 1.0.0
 * @author Contract AI
 */

const crypto = require('crypto');

class ClauseParser {
  constructor() {
    // Risiko-Keywords für schnelle Vorbewertung (vor GPT-Analyse)
    this.riskKeywords = {
      high: [
        // Haftung & Risiko
        'unbeschränkt', 'unbegrenzt', 'unbeschränkte haftung',
        'ausschließlich', 'unwiderruflich', 'endgültig',
        'freistellung', 'freistellen', 'schadloshaltung',
        'verzicht', 'verzichtet', 'ausgeschlossen',
        'keine haftung', 'kein anspruch', 'keine gewährleistung',
        'einseitig', 'jederzeit', 'ohne ankündigung',
        'ohne zustimmung', 'nach eigenem ermessen',
        'automatische verlängerung', 'stillschweigende verlängerung',
        'vertragsstrafe', 'konventionalstrafe',
        'höhere gewalt', 'force majeure',
        'gerichtsstand', 'schiedsgericht'
      ],
      medium: [
        // Vertragsbedingungen
        'berechtigt', 'vorbehalten', 'vorbehaltlich',
        'ermessen', 'anpassen', 'ändern', 'modifizieren',
        'kündigungsfrist', 'mindestlaufzeit', 'bindungsfrist',
        'zahlungsverzug', 'verzugszinsen', 'mahngebühr',
        'geheimhaltung', 'vertraulichkeit', 'verschwiegenheit',
        'wettbewerbsverbot', 'konkurrenzverbot',
        'datenschutz', 'personenbezogene daten',
        'haftungsbeschränkung', 'haftungsbegrenzung',
        'gewährleistung', 'garantie', 'zusicherung',
        'rücktritt', 'widerruf', 'anfechtung',
        'abtretung', 'übertragung'
      ],
      low: [
        // Standard-Klauseln
        'vertragsparteien', 'vertragsgegenstand',
        'leistungsumfang', 'vergütung', 'zahlung',
        'laufzeit', 'beginn', 'ende',
        'mitteilung', 'schriftform', 'textform',
        'salvatorische klausel', 'schlussbestimmungen',
        'gesamtvereinbarung', 'vollständigkeit',
        'anwendbares recht', 'deutsches recht'
      ]
    };

    // Paragraph-Erkennungsmuster
    this.paragraphPatterns = [
      // § 1, § 2.1, § 3 Absatz 2
      /^§\s*(\d+(?:\.\d+)?)\s*(?:Abs(?:atz)?\.?\s*(\d+))?\s*[:\-]?\s*(.+)?$/gm,
      // 1., 2., 3. mit Text
      /^(\d+)\.\s+([A-ZÄÖÜ][^\n]+)$/gm,
      // Artikel 1, Artikel 2
      /^(?:Art(?:ikel)?\.?|Article)\s*(\d+)\s*[:\-]?\s*(.+)?$/gm,
      // I., II., III. (römische Ziffern)
      /^([IVXLC]+)\.\s+([A-ZÄÖÜ][^\n]+)$/gm,
      // (1), (2), (3) Unterabschnitte
      /^\((\d+)\)\s+(.+)$/gm
    ];

    // Sektion-Titel-Muster
    this.sectionTitlePatterns = [
      // Großbuchstaben-Titel
      /^([A-ZÄÖÜ][A-ZÄÖÜ\s\-]{3,})$/gm,
      // Mit Nummerierung
      /^(?:§\s*\d+\s*)?([A-ZÄÖÜ][a-zäöüß]*(?:\s+[A-Za-zÄÖÜäöüß]+){0,4})$/gm
    ];
  }

  /**
   * Hauptfunktion: Parst Vertragstext in strukturierte Klauseln
   *
   * @param {string} text - Der vollständige Vertragstext
   * @param {Object} options - Optionen für das Parsing
   * @returns {Object} Strukturierte Klauseln mit Metadaten
   */
  parseContract(text, options = {}) {
    console.log('📜 Legal Lens: Starte Clause Parsing...');
    console.log(`📊 Text-Länge: ${text.length} Zeichen`);

    // Optionen mit Defaults
    const {
      minClauseLength = 20,
      maxClauseLength = 2000,
      detectRisk = true,
      includeLineNumbers = true
    } = options;

    // Vorverarbeitung
    const cleanedText = this.preprocessText(text);

    // Schritt 1: Erkenne Sektionen und Paragraphen
    const sections = this.extractSections(cleanedText);
    console.log(`📁 ${sections.length} Sektionen erkannt`);

    // Schritt 2: Extrahiere Klauseln aus jeder Sektion
    const clauses = [];
    let globalClauseIndex = 0;

    for (const section of sections) {
      const sectionClauses = this.extractClauses(
        section.content,
        section.title,
        section.startPosition,
        globalClauseIndex,
        { minClauseLength, maxClauseLength }
      );

      for (const clause of sectionClauses) {
        globalClauseIndex++;

        // Schritt 3: Risiko-Vorbewertung (falls aktiviert)
        if (detectRisk) {
          const riskAssessment = this.assessClauseRisk(clause.text);
          clause.riskLevel = riskAssessment.level;
          clause.riskScore = riskAssessment.score;
          clause.riskKeywords = riskAssessment.keywords;
        }

        // Hash für Caching
        clause.textHash = this.generateHash(clause.text);

        clauses.push(clause);
      }
    }

    console.log(`✅ ${clauses.length} Klauseln extrahiert`);

    // Risiko-Zusammenfassung
    const riskSummary = this.calculateRiskSummary(clauses);

    return {
      success: true,
      clauses,
      totalClauses: clauses.length,
      sections: sections.map(s => ({
        title: s.title,
        clauseCount: s.clauseCount || 0
      })),
      riskSummary,
      metadata: {
        originalLength: text.length,
        cleanedLength: cleanedText.length,
        parsedAt: new Date().toISOString(),
        parserVersion: '1.0.0'
      }
    };
  }

  /**
   * Vorverarbeitung des Texts
   */
  preprocessText(text) {
    return text
      // Normalisiere Zeilenumbrüche
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      // Entferne übermäßige Leerzeilen
      .replace(/\n{4,}/g, '\n\n\n')
      // Entferne führende/nachfolgende Leerzeichen pro Zeile
      .split('\n')
      .map(line => line.trim())
      .join('\n')
      // Korrigiere häufige OCR-Fehler
      .replace(/l(\d)/g, '1$1')
      .replace(/(\d)l/g, '$11')
      .replace(/O(\d)/g, '0$1')
      .replace(/(\d)O/g, '$10')
      .trim();
  }

  /**
   * Extrahiert Sektionen (Hauptabschnitte) aus dem Text
   */
  extractSections(text) {
    const sections = [];
    const lines = text.split('\n');

    let currentSection = {
      title: 'Einleitung',
      content: '',
      startPosition: 0,
      startLine: 0
    };

    let currentPosition = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();

      // Prüfe auf Sektions-Header
      const sectionMatch = this.matchSectionHeader(trimmedLine);

      if (sectionMatch) {
        // Speichere vorherige Sektion (falls nicht leer)
        if (currentSection.content.trim().length > 0) {
          sections.push({ ...currentSection });
        }

        // Starte neue Sektion
        currentSection = {
          title: sectionMatch.title,
          id: sectionMatch.id,
          content: '',
          startPosition: currentPosition,
          startLine: i
        };
      } else {
        // Füge Zeile zur aktuellen Sektion hinzu
        currentSection.content += line + '\n';
      }

      currentPosition += line.length + 1; // +1 für Zeilenumbruch
    }

    // Letzte Sektion hinzufügen
    if (currentSection.content.trim().length > 0) {
      sections.push(currentSection);
    }

    // Falls keine Sektionen erkannt wurden, behandle gesamten Text als eine Sektion
    if (sections.length === 0) {
      sections.push({
        title: 'Vertrag',
        content: text,
        startPosition: 0,
        startLine: 0
      });
    }

    return sections;
  }

  /**
   * Prüft ob eine Zeile ein Sektions-Header ist
   */
  matchSectionHeader(line) {
    // § X - Titel
    let match = line.match(/^§\s*(\d+(?:\.\d+)?)\s*[:\-]?\s*(.*)$/);
    if (match) {
      return {
        id: `§${match[1]}`,
        title: match[2] || `§ ${match[1]}`,
        type: 'paragraph'
      };
    }

    // Artikel X - Titel
    match = line.match(/^(?:Art(?:ikel)?\.?|Article)\s*(\d+)\s*[:\-]?\s*(.*)$/i);
    if (match) {
      return {
        id: `Art${match[1]}`,
        title: match[2] || `Artikel ${match[1]}`,
        type: 'article'
      };
    }

    // Nummerierte Überschrift: 1. Vertragsparteien
    match = line.match(/^(\d+)\.\s+([A-ZÄÖÜ][A-Za-zÄÖÜäöüß\s\-]+)$/);
    if (match && match[2].length < 50) {
      return {
        id: match[1],
        title: match[2].trim(),
        type: 'numbered'
      };
    }

    // Reine Großbuchstaben-Überschrift (mind. 4 Zeichen)
    if (/^[A-ZÄÖÜ][A-ZÄÖÜ\s\-]{3,}$/.test(line) && line.length < 60) {
      return {
        id: line.toLowerCase().replace(/\s+/g, '-'),
        title: this.toTitleCase(line),
        type: 'header'
      };
    }

    return null;
  }

  /**
   * Extrahiert einzelne Klauseln aus Sektions-Content
   */
  extractClauses(content, sectionTitle, sectionStartPosition, startIndex, options) {
    const clauses = [];
    const { minClauseLength, maxClauseLength } = options;

    // Strategie 1: Versuche nach Unterabschnitten zu splitten
    const subSections = this.splitBySubsections(content);

    if (subSections.length > 1) {
      // Es gibt Unterabschnitte
      let currentPosition = sectionStartPosition;

      for (let i = 0; i < subSections.length; i++) {
        const sub = subSections[i];
        const clauseText = sub.text.trim();

        if (clauseText.length >= minClauseLength && clauseText.length <= maxClauseLength) {
          clauses.push({
            id: sub.id || `${startIndex + i + 1}`,
            sectionTitle: sectionTitle,
            text: clauseText,
            position: {
              start: currentPosition,
              end: currentPosition + clauseText.length,
              paragraph: i + 1
            }
          });
        } else if (clauseText.length > maxClauseLength) {
          // Zu lang - weiter aufsplitten nach Sätzen
          const sentences = this.splitIntoSentences(clauseText);
          let sentencePos = currentPosition;

          for (let j = 0; j < sentences.length; j++) {
            const sentence = sentences[j].trim();
            if (sentence.length >= minClauseLength) {
              clauses.push({
                id: `${sub.id || startIndex + i + 1}.${j + 1}`,
                sectionTitle: sectionTitle,
                text: sentence,
                position: {
                  start: sentencePos,
                  end: sentencePos + sentence.length,
                  paragraph: i + 1,
                  sentence: j + 1
                }
              });
            }
            sentencePos += sentence.length + 1;
          }
        }

        currentPosition += sub.text.length + 1;
      }
    } else {
      // Keine Unterabschnitte - splitten nach Sätzen
      const sentences = this.splitIntoSentences(content);
      let currentPosition = sectionStartPosition;

      // Gruppiere kurze Sätze zusammen
      let currentClause = '';
      let clauseStartPosition = currentPosition;

      for (let i = 0; i < sentences.length; i++) {
        const sentence = sentences[i].trim();

        if (sentence.length < 10) {
          // Sehr kurzer Satz - anhängen
          currentClause += (currentClause ? ' ' : '') + sentence;
        } else if (currentClause.length + sentence.length < maxClauseLength / 2) {
          // Kann noch zusammengefasst werden
          currentClause += (currentClause ? ' ' : '') + sentence;
        } else {
          // Speichere aktuelle Klausel und starte neue
          if (currentClause.length >= minClauseLength) {
            clauses.push({
              id: `${startIndex + clauses.length + 1}`,
              sectionTitle: sectionTitle,
              text: currentClause,
              position: {
                start: clauseStartPosition,
                end: clauseStartPosition + currentClause.length,
                paragraph: Math.ceil((clauses.length + 1) / 3)
              }
            });
          }

          currentClause = sentence;
          clauseStartPosition = currentPosition;
        }

        currentPosition += sentence.length + 1;
      }

      // Letzte Klausel
      if (currentClause.length >= minClauseLength) {
        clauses.push({
          id: `${startIndex + clauses.length + 1}`,
          sectionTitle: sectionTitle,
          text: currentClause,
          position: {
            start: clauseStartPosition,
            end: clauseStartPosition + currentClause.length,
            paragraph: Math.ceil((clauses.length + 1) / 3)
          }
        });
      }
    }

    return clauses;
  }

  /**
   * Splittet Content nach Unterabschnitten (1), (2), a), b), etc.
   */
  splitBySubsections(content) {
    const subSections = [];

    // Pattern für Unterabschnitte
    const patterns = [
      /^\((\d+)\)\s*/gm,    // (1), (2)
      /^(\d+)\.\s+/gm,      // 1., 2.
      /^([a-z])\)\s*/gm,    // a), b)
      /^-\s+/gm             // Aufzählungen
    ];

    // Versuche verschiedene Patterns
    for (const pattern of patterns) {
      const parts = content.split(pattern);

      if (parts.length > 2) {
        // Pattern gefunden
        let currentId = null;
        let currentText = '';

        for (let i = 0; i < parts.length; i++) {
          const part = parts[i].trim();

          // Prüfe ob es eine ID ist (kurz, numerisch oder Buchstabe)
          if (part.match(/^(\d+|[a-z])$/) && i > 0) {
            // Speichere vorherigen Abschnitt
            if (currentText.trim()) {
              subSections.push({
                id: currentId,
                text: currentText.trim()
              });
            }
            currentId = part;
            currentText = '';
          } else {
            currentText += part + ' ';
          }
        }

        // Letzten Abschnitt hinzufügen
        if (currentText.trim()) {
          subSections.push({
            id: currentId,
            text: currentText.trim()
          });
        }

        if (subSections.length > 1) {
          return subSections;
        }
      }
    }

    // Kein Pattern gefunden - gib gesamten Content zurück
    return [{
      id: null,
      text: content
    }];
  }

  /**
   * Splittet Text in Sätze
   */
  splitIntoSentences(text) {
    // Ersetze Abkürzungen temporär
    let processed = text
      .replace(/\b(Nr|Art|Abs|bzw|z\.B|d\.h|u\.a|etc|ca|inkl|ggf|max|min)\./gi, '$1§DOT§')
      .replace(/\b(GmbH|AG|KG|OHG|e\.V)\./gi, '$1§DOT§');

    // Splitte nach Satzzeichen
    const sentences = processed
      .split(/(?<=[.!?])\s+/)
      .map(s => s.replace(/§DOT§/g, '.').trim())
      .filter(s => s.length > 0);

    return sentences;
  }

  /**
   * Bewertet das Risiko einer Klausel basierend auf Keywords
   */
  assessClauseRisk(text) {
    const lowerText = text.toLowerCase();
    let score = 0;
    const foundKeywords = [];

    // High-Risk Keywords (+25 Punkte)
    for (const keyword of this.riskKeywords.high) {
      if (lowerText.includes(keyword)) {
        score += 25;
        foundKeywords.push({ keyword, severity: 'high' });
      }
    }

    // Medium-Risk Keywords (+10 Punkte)
    for (const keyword of this.riskKeywords.medium) {
      if (lowerText.includes(keyword)) {
        score += 10;
        foundKeywords.push({ keyword, severity: 'medium' });
      }
    }

    // Low-Risk Keywords (+2 Punkte)
    for (const keyword of this.riskKeywords.low) {
      if (lowerText.includes(keyword)) {
        score += 2;
        foundKeywords.push({ keyword, severity: 'low' });
      }
    }

    // Zusätzliche Faktoren
    // Lange Klauseln sind oft komplexer
    if (text.length > 500) score += 5;
    if (text.length > 1000) score += 10;

    // Viele Verneinungen können problematisch sein
    const negations = (lowerText.match(/\b(nicht|kein|keine|keinen|ohne|niemals|ausgeschlossen)\b/g) || []).length;
    score += negations * 5;

    // Begrenzen auf 0-100
    score = Math.min(100, Math.max(0, score));

    // Level bestimmen
    let level;
    if (score >= 50) {
      level = 'high';
    } else if (score >= 20) {
      level = 'medium';
    } else {
      level = 'low';
    }

    return {
      level,
      score,
      keywords: foundKeywords.slice(0, 5) // Top 5 Keywords
    };
  }

  /**
   * Berechnet die Risiko-Zusammenfassung für alle Klauseln
   */
  calculateRiskSummary(clauses) {
    const summary = {
      low: 0,
      medium: 0,
      high: 0,
      averageScore: 0,
      highestRiskClauses: []
    };

    let totalScore = 0;

    for (const clause of clauses) {
      const level = clause.riskLevel || 'low';
      summary[level]++;
      totalScore += clause.riskScore || 0;

      // Track höchste Risiken
      if (level === 'high') {
        summary.highestRiskClauses.push({
          id: clause.id,
          score: clause.riskScore,
          preview: clause.text.substring(0, 100) + '...'
        });
      }
    }

    summary.averageScore = clauses.length > 0
      ? Math.round(totalScore / clauses.length)
      : 0;

    // Sortiere nach Score
    summary.highestRiskClauses.sort((a, b) => b.score - a.score);
    summary.highestRiskClauses = summary.highestRiskClauses.slice(0, 5);

    return summary;
  }

  /**
   * Generiert einen Hash für Caching-Zwecke
   */
  generateHash(text) {
    return crypto
      .createHash('md5')
      .update(text.toLowerCase().trim())
      .digest('hex')
      .substring(0, 16);
  }

  /**
   * Konvertiert Text zu Title Case
   */
  toTitleCase(str) {
    return str
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Findet eine spezifische Klausel nach ID
   */
  findClauseById(clauses, clauseId) {
    return clauses.find(c => c.id === clauseId) || null;
  }

  /**
   * Gibt Klauseln nach Risiko-Level zurück
   */
  getClausesByRiskLevel(clauses, level) {
    return clauses.filter(c => c.riskLevel === level);
  }

  /**
   * Sucht in Klauseln nach Text
   */
  searchClauses(clauses, searchText) {
    const lowerSearch = searchText.toLowerCase();
    return clauses.filter(c =>
      c.text.toLowerCase().includes(lowerSearch)
    );
  }
}

// Singleton-Export
module.exports = new ClauseParser();
