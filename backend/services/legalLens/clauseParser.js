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
const OpenAI = require('openai');

// Structured logger - debug output only when LEGAL_LENS_DEBUG=true
const DEBUG = process.env.LEGAL_LENS_DEBUG === 'true';
const log = {
  debug: (...args) => DEBUG && console.log('[LegalLens]', ...args),
  info: (...args) => console.log('[LegalLens]', ...args),
  warn: (...args) => console.warn('[LegalLens]', ...args),
  error: (...args) => console.error('[LegalLens]', ...args)
};

// OpenAI Client für GPT-Segmentierung
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

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
        'gerichtsstand', 'schiedsgericht',
        // Datenschutz & Compliance — kritisch
        'weitergabe an dritte', 'unbefristete speicherung',
        'profiling', 'automatisierte entscheidung',
        'ohne einwilligung', 'keine löschung'
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
        'abtretung', 'übertragung',
        // Datenschutz & Compliance — prüfenswert
        'einwilligung', 'widerspruchsrecht', 'widerspruch',
        'cookies', 'tracking', 'auftragsverarbeitung',
        'drittland', 'datenübermittlung', 'speicherdauer',
        'zweckbindung', 'datenminimierung'
      ],
      low: [
        // Standard-Klauseln
        'vertragsparteien', 'vertragsgegenstand',
        'leistungsumfang', 'vergütung', 'zahlung',
        'laufzeit', 'beginn', 'ende',
        'mitteilung', 'schriftform', 'textform',
        'salvatorische klausel', 'schlussbestimmungen',
        'gesamtvereinbarung', 'vollständigkeit',
        'anwendbares recht', 'deutsches recht',
        // Datenschutz & Compliance — Standard
        'betroffenenrechte', 'datenschutzbeauftragter',
        'rechtsgrundlage', 'verarbeitungszweck',
        'auskunftsrecht', 'löschungsrecht', 'datenportabilität'
      ]
    };

    // Pre-compiled regex patterns for word-boundary matching in risk assessment
    this.riskPatterns = {};
    for (const [severity, keywords] of Object.entries(this.riskKeywords)) {
      this.riskPatterns[severity] = keywords.map(keyword => ({
        keyword,
        regex: keyword.includes(' ')
          ? new RegExp(keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')
          : new RegExp(`(?:^|[\\s,.;:!?()\\[\\]"'„"«»])${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:$|[\\s,.;:!?()\\[\\]"'„"«»])`, 'gi'),
        severity
      }));
    }

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
    log.info('Starte Clause Parsing...');
    log.debug(`Text-Länge: ${text.length} Zeichen`);

    // Optionen mit Defaults
    const {
      minClauseLength = 20,
      maxClauseLength = 2000,
      detectRisk = true,
      includeLineNumbers = true
    } = options;

    // Vorverarbeitung
    const cleanedText = this.preprocessText(text, { isOCR: options.isOCR });

    // Schritt 1: Erkenne Sektionen und Paragraphen
    const sections = this.extractSections(cleanedText);
    log.debug(`${sections.length} Sektionen erkannt`);

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

        // V2: Erweiterte Position-Daten für PDF-Mapping
        if (clause.position) {
          clause.position.globalStart = clause.position.start;
          clause.position.globalEnd = clause.position.end;
          clause.position.estimatedPage = text.length > 0
            ? Math.floor(clause.position.start / Math.max(text.length / Math.max(1, Math.ceil(text.length / 3000)), 1)) + 1
            : 1;
          clause.position.anchorText = clause.text.substring(0, 80).trim();
        }
        clause.matchingData = {
          firstWords: this.extractSignificantWords(clause.text, 'first', 5),
          lastWords: this.extractSignificantWords(clause.text, 'last', 5),
          charLength: clause.text.length
        };

        clauses.push(clause);
      }
    }

    log.info(`${clauses.length} Klauseln extrahiert`);

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
  preprocessText(text, options = {}) {
    let processed = text
      // Normalisiere Zeilenumbrüche
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n');

    // Markdown-Formatierung entfernen (PDFs die aus Markdown erzeugt wurden)
    processed = processed.replace(/^#{1,6}\s+/gm, '');       // # ## ### Header-Prefix
    processed = processed.replace(/\*\*(.+?)\*\*/g, '$1');   // **bold** → bold
    processed = processed.replace(/^---+\s*$/gm, '');        // --- Horizontal rules
    processed = processed.replace(/^___+\s*$/gm, '');        // ___ Horizontal rules
    // Markdown-Tabellen: Trennzeilen entfernen, Datenzeilen als "  - col1; col2; ..." formatieren
    processed = processed.replace(/^\|[-\s:|]+\|$/gm, '');   // Tabellen-Trennzeilen (|---|---|)
    processed = processed.replace(/^\|(.+)\|$/gm, (_, inner) => { // Datenzeilen → eingerückt mit Semikolon
      const cells = inner.split('|').map(c => c.trim()).filter(c => c);
      return '  - ' + cells.join('; ');
    });

    // Silbentrennung reparieren: Wörter die am Zeilenende getrennt wurden
    // z.B. "Vertrags-\npartner" → "Vertragspartner"
    processed = processed.replace(/(\w)-\n(\w)/g, '$1$2');

    // Zeilenumbrüche innerhalb von Absätzen zusammenfügen
    // (einzelner Zeilenumbruch ohne Leerzeile = gleicher Absatz)
    processed = processed.replace(/([^\n])\n([^\n\s])/g, '$1 $2');

    // Übermäßige Leerzeilen reduzieren
    processed = processed.replace(/\n{4,}/g, '\n\n\n');

    // Mehrfache Leerzeichen zu einem zusammenfassen
    processed = processed.replace(/ {2,}/g, ' ');

    // Entferne führende/nachfolgende Leerzeichen pro Zeile
    processed = processed
      .split('\n')
      .map(line => line.trim())
      .join('\n');

    // Häufige Encoding-Artefakte bereinigen
    processed = processed
      .replace(/\u00AD/g, '')        // Soft-Hyphen entfernen
      .replace(/\u200B/g, '')        // Zero-width space entfernen
      .replace(/\u00A0/g, ' ')       // Non-breaking space → normales Leerzeichen
      .replace(/\uFEFF/g, '')        // BOM entfernen
      .replace(/\u2018|\u2019/g, "'")  // Smart quotes → normal
      .replace(/\u201C|\u201D/g, '"')  // Smart double quotes → normal
      .replace(/\u2013/g, '–')      // En-dash normalisieren
      .replace(/\u2014/g, '—')      // Em-dash normalisieren
      .replace(/\u2026/g, '...');    // Ellipsis normalisieren

    // OCR-Korrekturen NUR bei OCR-gescannten Texten anwenden
    // Diese Regexe beschädigen sauberen digitalen Text (z.B. "legal" -> "1ega1")
    if (options.isOCR) {
      processed = processed
        .replace(/l(\d)/g, '1$1')
        .replace(/(\d)l/g, '$11')
        .replace(/O(\d)/g, '0$1')
        .replace(/(\d)O/g, '$10');
    }

    return processed.trim();
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
        title: 'Dokument',
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
    // § X - Titel (auch mit optionalem Markdown-Prefix ## )
    let match = line.match(/^(?:#{1,6}\s+)?§\s*(\d+(?:\.\d+)?)\s*[:\-]?\s*(.*)$/);
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

    // Dezimal-Nummerierung: 1.1, 2.3.1, 1.1.1 (häufig in Datenschutz, AGB, etc.)
    match = line.match(/^(\d+(?:\.\d+)+)\s+(.+)$/);
    if (match && match[2].length < 80 && !/[.;,]$/.test(match[2].trim())) {
      return {
        id: match[1],
        title: match[2].trim(),
        type: 'numbered'
      };
    }

    // Nummerierte Überschrift: 1. Vertragsparteien
    // Erlaubt Klammern, Zahlen, Punkte im Titel (z.B. "1. Datenerhebung (Art. 6 DSGVO)")
    match = line.match(/^(\d+)\.\s+([A-ZÄÖÜ][^\n]{2,})$/);
    if (match && match[2].length < 80 && !/[;,]$/.test(match[2].trim())) {
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

    // Eigenständige Zeile mit Großbuchstabe am Anfang (1-6 Wörter, < 80 Zeichen)
    // Erkennt: "Präambel", "Delkrederehaftung", "Angaben zum Unternehmen", "Ankauf von Inkassoforderungen"
    if (line.length >= 3 && line.length < 80) {
      const wordCount = line.split(/\s+/).length;
      if (wordCount <= 6 && /^[A-ZÄÖÜ]/.test(line) && !/[.,:;!?]$/.test(line) && !/^\d/.test(line)) {
        // Keine normalen Sätze (die enden mit Punkt/enthalten viele Kleinwörter)
        const lowerWords = line.split(/\s+/).filter(w => /^[a-zäöüß]/.test(w) && w.length > 3);
        const isLikelyHeader = lowerWords.length <= 2;
        if (isLikelyHeader) {
          return {
            id: line.toLowerCase().replace(/\s+/g, '-'),
            title: line,
            type: 'header'
          };
        }
      }
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
        } else if (currentClause.length + sentence.length < maxClauseLength * 0.35) {
          // Kann noch zusammengefasst werden (max ~700 Zeichen bevor neue Klausel)
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
   * Erkennt nicht-analysierbare Klauseln (Titel, Metadaten, Unterschriften)
   * Diese sollten im Frontend nicht klickbar sein
   */
  detectNonAnalyzable(text, title = '') {
    if (!text || typeof text !== 'string') {
      return { nonAnalyzable: true, reason: 'empty', category: 'invalid' };
    }

    const trimmedText = text.trim();
    const lowerText = trimmedText.toLowerCase();
    const lowerTitle = (title || '').toLowerCase();

    log.debug(`[detectNonAnalyzable] title="${title}", text="${trimmedText.substring(0, 50)}...", lowerTitle="${lowerTitle}"`);

    // ===== HOHE-KONFIDENZ OVERRIDES (vor Escape Hatch) =====
    // Diese Muster sind so eindeutig, dass sie auch bei Vorhandensein
    // von rechtlichen Keywords als nicht-analysierbar gelten

    // Unterschriftsfelder: Titel enthält "Unterschrift/Signatur" UND Unterstriche im Text
    if ((lowerTitle.includes('unterschrift') || lowerTitle.includes('signatur') ||
         lowerTitle.includes('signature') || lowerTitle.includes('unterzeichn')) &&
        /__{3,}/.test(trimmedText)) {
      log.debug(`[detectNonAnalyzable] PRIORITY: signature_field via title+underscores for "${title}"`);
      return { nonAnalyzable: true, reason: 'signature_field', category: 'signature' };
    }

    // Vertragsparteien: Exakter Titelmatch (nicht Substring, um "Pflichten der Vertragsparteien" nicht zu treffen)
    if (lowerTitle === 'vertragsparteien' || lowerTitle === 'parteien' ||
        lowerTitle === 'vertragspartner' || lowerTitle === 'die vertragsparteien' ||
        lowerTitle === 'die parteien') {
      log.debug(`[detectNonAnalyzable] PRIORITY: contract_parties via exact title for "${title}"`);
      return { nonAnalyzable: true, reason: 'contract_parties', category: 'metadata' };
    }

    // ===== ESCAPE HATCHES - IMMER ANALYSIERBAR =====
    // Diese Keywords bedeuten: Klausel ist IMMER relevant, auch wenn kurz!
    const alwaysAnalyzableKeywords = [
      // Rechtliche Begriffe
      'verpflichtet', 'berechtigt', 'haftet', 'haftung', 'gewährleist',
      'schuldet', 'zahlt', 'vergütung', 'entgelt', 'gebühr',
      'kündigung', 'kündigungs', 'frist', 'laufzeit', 'dauer',
      'beginn', 'ende', 'gültig', 'wirksam', 'beendigung',
      'gerichtsstand', 'recht', 'gesetz', 'anwendbar',
      'schadensersatz', 'vertragsstrafe', 'verzug', 'mahnung',
      'gewährleistung', 'garantie', 'mängel',
      'geheimhaltung', 'vertraulich', 'datenschutz',
      'wettbewerb', 'konkurrenz',
      // Zuständigkeit & Gerichtsstand
      'erfüllungsort', 'leistungsort',
      'zuständig', 'zuständigkeit',
      'schriftform', 'textform',
      'salvatorisch',
      'abtretung', 'übertragung',
      'nebenabreden',
      'schlussbestimmung',
      'mitteilung', 'zustellung',
      'aufrechnung', 'zurückbehaltung',
      'streitigkeiten', 'streitigkeit',
      'schiedsgericht', 'schlichtung', 'mediation',
      'rechtswahl', 'rechtsordnung',
      'insolvenz', 'zahlungsunfähig',
      'verbot', 'untersagt',
      // Paragraph-Referenzen
      '§', 'abs.', 'absatz', 'ziffer', 'artikel', 'gemäß', 'nach maßgabe',
      // Vertragsbestandteile
      'leistung', 'pflicht', 'recht', 'anspruch',
      'vertragsbeginn', 'vertragsende', 'mindestlaufzeit', 'verlängerung',
      // Datenschutz & Compliance
      'personenbezogen', 'verarbeitung', 'einwilligung', 'widerspruch',
      'löschung', 'speicherdauer', 'cookies', 'tracking',
      'betroffenenrecht', 'dsgvo', 'gdpr', 'auftragsverarbeitung',
      'datenübermittlung', 'drittland', 'profiling', 'rechtsgrundlage',
      // AGB & Nutzungsbedingungen
      'nutzungsbedingung', 'haftungsausschluss', 'rückgabe',
      'widerrufsrecht', 'gewährleistungsausschluss'
    ];

    // Prüfe ob Titel oder Text relevante Keywords enthält
    const hasRelevantContent = alwaysAnalyzableKeywords.some(keyword =>
      lowerTitle.includes(keyword) || lowerText.includes(keyword)
    );

    if (hasRelevantContent) {
      log.debug(`[detectNonAnalyzable] ESCAPE: Relevanter Inhalt für "${title}" - bleibt analysierbar`);
      return { nonAnalyzable: false, reason: null, category: 'clause' };
    }

    // ===== TITEL-BASIERTE ERKENNUNG (Priorität!) =====
    // Wenn der Titel eindeutig auf nicht-analysierbar hindeutet

    // Titel ist "Vertragsname", "Vertragstitel" oder ähnlich (exakte Matches)
    if (lowerTitle === 'vertragsname' || lowerTitle === 'vertragstitel' ||
        lowerTitle === 'titel' || lowerTitle === 'name') {
      log.debug(`[detectNonAnalyzable] MATCH: contract_title via title="${lowerTitle}"`);
      return { nonAnalyzable: true, reason: 'contract_title', category: 'title' };
    }

    // Titel enthält "Vertragsparteien", "Parteien"
    if (lowerTitle === 'vertragsparteien' || lowerTitle === 'parteien' ||
        lowerTitle === 'vertragspartner' || lowerTitle.includes('vertragsparteien')) {
      log.debug(`[detectNonAnalyzable] MATCH: metadata via title="${lowerTitle}"`);
      return { nonAnalyzable: true, reason: 'contract_parties', category: 'metadata' };
    }

    // Titel enthält "Ort" und/oder "Datum"
    if (lowerTitle.includes('ort') && lowerTitle.includes('datum')) {
      log.debug(`[detectNonAnalyzable] MATCH: date_location via title="${lowerTitle}"`);
      return { nonAnalyzable: true, reason: 'date_location', category: 'metadata' };
    }
    if (lowerTitle === 'ort und datum' || lowerTitle === 'ort, datum' || lowerTitle === 'datum und ort') {
      return { nonAnalyzable: true, reason: 'date_location', category: 'metadata' };
    }

    // Titel enthält "Unterzeichnung", "Unterschrift", "Signatur", "Unterzeichner"
    if (lowerTitle.includes('unterzeichnung') || lowerTitle.includes('unterschrift') ||
        lowerTitle.includes('unterzeichner') || lowerTitle.includes('signatur') ||
        lowerTitle.includes('signature')) {
      log.debug(`[detectNonAnalyzable] MATCH: signature_field via title="${lowerTitle}"`);
      return { nonAnalyzable: true, reason: 'signature_field', category: 'signature' };
    }

    // ===== KURZER TEXT + SIGNATUR/DATUM-MUSTER =====
    if (trimmedText.length < 200) {
      // Zähle typische Signatur-Elemente
      const signatureIndicators = [
        /_+/.test(trimmedText),                           // Unterschriftslinien
        /\(.*geber\)|\(.*nehmer\)/i.test(trimmedText),   // (Auftraggeber), (Auftragnehmer)
        /unterschrift/i.test(lowerText),
        /unterzeichnung/i.test(lowerText),
        /gez\./i.test(lowerText),                        // "gez." = gezeichnet
        /i\.\s*a\./i.test(lowerText),                    // "i.A." = im Auftrag
      ];
      const signatureScore = signatureIndicators.filter(Boolean).length;

      if (signatureScore >= 2) {
        log.debug(`[detectNonAnalyzable] MATCH: signature_field via short text + ${signatureScore} indicators for title="${title}"`);
        return { nonAnalyzable: true, reason: 'signature_field', category: 'signature' };
      }

      // Zähle typische Ort/Datum-Elemente
      const dateLocationIndicators = [
        /ort[,:\s]*(den)?\s*datum/i.test(lowerText),     // "Ort, den Datum" Pattern
        /datum[:\s]+ort/i.test(lowerText),               // "Datum: Ort"
        /^[a-zäöü]+,\s*(den\s*)?\d{1,2}\./i.test(trimmedText), // "München, den 01." am Anfang
        /\d{1,2}\.\s*\d{1,2}\.\s*\d{2,4}/.test(trimmedText),   // Datum im Text
        /^ort\s*$/im.test(lowerText),                    // Nur "Ort" auf einer Zeile
        /^datum\s*$/im.test(lowerText),                  // Nur "Datum" auf einer Zeile
      ];
      const dateLocationScore = dateLocationIndicators.filter(Boolean).length;

      // Bei kurzen Texten (< 100 Zeichen) mit Datum-Mustern
      if (trimmedText.length < 100 && dateLocationScore >= 2) {
        log.debug(`[detectNonAnalyzable] MATCH: date_location via short text + ${dateLocationScore} indicators for title="${title}"`);
        return { nonAnalyzable: true, reason: 'date_location', category: 'metadata' };
      }
    }

    // ===== TEXT-BASIERTE ERKENNUNG =====

    // 1. Zu kurz für sinnvolle Analyse (< 15 Zeichen ohne Titel)
    if (trimmedText.length < 15) {
      // Ausnahme: Wenn es wie eine echte Mini-Klausel aussieht
      const looksLikeClause = /§|abs\.|artikel|ziffer|\d+\.\d+|gerichtsstand|erfüllungsort|anwendbar|recht|salvatorisch/.test(lowerText);
      if (!looksLikeClause) {
        log.debug(`[detectNonAnalyzable] MATCH: too_short (${trimmedText.length} chars) for title="${title}"`);
        return { nonAnalyzable: true, reason: 'too_short', category: 'metadata' };
      }
    }

    // 2. Vertragsname/Titel-Erkennung (TEXT)
    // WICHTIG: Alle Alternativen müssen gruppiert sein, sonst matcht z.B. "anlage" überall im Text!
    const titlePatterns = [
      /^(steuerberatungs|beratungs|dienst|arbeits|miet|kauf|lizenz|service|rahmen)?vertrag$/i,
      /^vertrag\s+(über|zur|zum|für)/i,
      /^(allgemeine\s+)?(geschäfts|vertrags|nutzungs)bedingungen$/i,
      /^agb$/i,
      /^(anhang|anlage|annex)\b/i  // FIX: Gruppierung + Wortgrenze
    ];
    if (titlePatterns.some(p => p.test(trimmedText)) ||
        (trimmedText.length < 50 && lowerTitle.includes('vertragsname'))) {
      log.debug(`[detectNonAnalyzable] MATCH: contract_title via TEXT pattern for title="${title}"`);
      return { nonAnalyzable: true, reason: 'contract_title', category: 'title' };
    }

    // 3. Ort und Datum Erkennung (TEXT)
    const dateLocationPatterns = [
      /^[a-zäöüß\s\-]+,\s*\d{1,2}[\.\-\/]\d{1,2}[\.\-\/]\d{2,4}$/i,  // "Ort, DD.MM.YYYY"
      /^[a-zäöüß\s\-]+\s+(den|am)\s+\d{1,2}[\.\-\/]\d{1,2}[\.\-\/]\d{2,4}$/i,  // "Ort am DD.MM.YYYY"
      /^\d{1,2}[\.\-\/]\d{1,2}[\.\-\/]\d{2,4}$/,  // Nur Datum
      /^(ort|datum|ort und datum|ort, datum)[:\s]*$/i,  // Nur Label
      // Erweiterte Patterns für typische Ort-Datum Kombinationen
      /^[a-zäöüß]{3,}\s*,?\s*(den\s*)?\d{1,2}\.\s*\d{1,2}\.\s*\d{2,4}$/i,  // "München, den 01.01.2024"
      /^[a-zäöüß]{3,}\s+(im\s+)?(januar|februar|märz|april|mai|juni|juli|august|september|oktober|november|dezember)\s+\d{4}$/i  // "München im Januar 2024"
    ];
    if (dateLocationPatterns.some(p => p.test(trimmedText))) {
      log.debug(`[detectNonAnalyzable] MATCH: date_location via TEXT pattern for title="${title}"`);
      return { nonAnalyzable: true, reason: 'date_location', category: 'metadata' };
    }
    // Kurzer Text + title enthält "ort" oder "datum" als standalone Wort
    if (trimmedText.length < 80) {
      const isStandaloneOrt = /\bort\b/i.test(lowerTitle) &&
        !/erfüllungsort|leistungsort|standort|einsatzort|dienstort/i.test(lowerTitle);
      const isStandaloneDatum = /\bdatum\b/i.test(lowerTitle) &&
        !/vertragsdatum|startdatum|enddatum/i.test(lowerTitle);
      if (isStandaloneOrt || isStandaloneDatum) {
        const hasLegalContent = alwaysAnalyzableKeywords.some(kw => lowerText.includes(kw));
        if (!hasLegalContent) {
          log.debug(`[detectNonAnalyzable] MATCH: date_location via short+title for title="${title}"`);
          return { nonAnalyzable: true, reason: 'date_location', category: 'metadata' };
        }
      }
    }

    // 4. Unterschriftsfelder Erkennung
    const signaturePatterns = [
      /_{3,}/,  // Mehrere Unterstriche (Unterschriftslinie)
      /\(auftraggeber\)/i,  // "(Auftraggeber)"
      /\(auftragnehmer\)/i,  // "(Auftragnehmer)"
      /\(steuerberater\)/i,  // "(Steuerberater)"
      /\(kunde\)/i,
      /\(anbieter\)/i,
      /\(vermieter\)/i,
      /\(mieter\)/i,
      /\(arbeitgeber\)/i,
      /\(arbeitnehmer\)/i,
      /unterschrift[:\s]*$/i,
      /^(für|name|gez\.|i\.?\s*a\.?|p\.?\s*p\.?)[:\s]*$/i
    ];
    if (signaturePatterns.some(p => p.test(trimmedText))) {
      log.debug(`[detectNonAnalyzable] MATCH: signature_field via TEXT pattern for title="${title}"`);
      return { nonAnalyzable: true, reason: 'signature_field', category: 'signature' };
    }
    // Kurzer Text + enthält Unterschriftslinie-ähnliche Struktur
    if (trimmedText.length < 150 && trimmedText.includes('_') &&
        (lowerText.includes('auftraggeber') || lowerText.includes('auftragnehmer') ||
         lowerText.includes('steuerberater') || lowerText.includes('unterschrift'))) {
      log.debug(`[detectNonAnalyzable] MATCH: signature_field via underscore+keyword for title="${title}"`);
      return { nonAnalyzable: true, reason: 'signature_field', category: 'signature' };
    }

    // 5. Reine Kontaktdaten/Adressen (ohne rechtlichen Inhalt)
    const onlyAddressPattern = /^[a-zäöüß\s\.\-]+\s*\n?\s*(str\.|straße|weg|platz|gasse)?\s*\d+[a-z]?\s*\n?\s*\d{5}\s+[a-zäöüß\s\-]+$/i;
    if (onlyAddressPattern.test(trimmedText) && trimmedText.length < 150) {
      log.debug(`[detectNonAnalyzable] MATCH: address_only for title="${title}"`);
      return { nonAnalyzable: true, reason: 'address_only', category: 'metadata' };
    }

    // 6. Seitenzahlen, Header/Footer
    const pagePattern = /^(seite\s*)?\d+(\s*(von|\/)\s*\d+)?$/i;
    if (pagePattern.test(trimmedText)) {
      log.debug(`[detectNonAnalyzable] MATCH: page_number via text pattern`);
      return { nonAnalyzable: true, reason: 'page_number', category: 'metadata' };
    }

    // Analysierbar - DEBUG: Log dass Klausel als analysierbar eingestuft wurde
    log.debug(`[detectNonAnalyzable] RESULT: analyzable=true for title="${title}"`);
    return { nonAnalyzable: false, reason: null, category: 'clause' };
  }

  /**
   * Bewertet das Risiko einer Klausel basierend auf Keywords
   */
  assessClauseRisk(text) {
    // FIX: Null-Check - GPT liefert manchmal null/undefined
    if (!text || typeof text !== 'string') {
      return { level: 'low', score: 0, keywords: [] };
    }
    const lowerText = ' ' + text.toLowerCase() + ' '; // Pad for word-boundary matching
    let score = 0;
    const foundKeywords = [];
    const foundSet = new Set();

    // Word-boundary matching using pre-compiled regex patterns
    const pointsMap = { high: 25, medium: 10, low: 2 };
    for (const [severity, patterns] of Object.entries(this.riskPatterns)) {
      const points = pointsMap[severity] || 2;
      for (const { keyword, regex } of patterns) {
        regex.lastIndex = 0; // Reset regex state
        if (!foundSet.has(keyword) && regex.test(lowerText)) {
          score += points;
          foundKeywords.push({ keyword, severity });
          foundSet.add(keyword);
        }
      }
    }

    // Bonus for short clauses with risk keywords (concentrated risk)
    if (text.length < 100 && foundKeywords.length > 0) score += 5;

    // Negation scoring - unique count, capped at 15
    const negations = (lowerText.match(/\b(nicht|kein|keine|keinen|ohne|niemals|ausgeschlossen)\b/g) || []);
    const uniqueNegations = new Set(negations).size;
    score += Math.min(uniqueNegations * 5, 15);

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
   * Extrahiert signifikante Wörter für Fuzzy-Matching im Frontend.
   * Filtert Stoppwörter und kurze Wörter heraus.
   *
   * @param {string} text - Klauseltext
   * @param {string} position - 'first' oder 'last'
   * @param {number} count - Anzahl der Wörter
   * @returns {string[]} Array signifikanter Wörter
   */
  extractSignificantWords(text, position = 'first', count = 5) {
    const stopWords = new Set([
      'der', 'die', 'das', 'den', 'dem', 'des', 'ein', 'eine', 'einer', 'eines',
      'und', 'oder', 'aber', 'auch', 'als', 'auf', 'aus', 'bei', 'bis', 'für',
      'mit', 'nach', 'über', 'von', 'vor', 'zum', 'zur', 'sich', 'ist', 'sind',
      'wird', 'hat', 'wird', 'kann', 'soll', 'muss', 'darf', 'nicht', 'dass',
      'wenn', 'wie', 'was', 'wer', 'wir', 'sie', 'ihr', 'ihm', 'uns', 'ich'
    ]);

    const words = text
      .replace(/[§()[\]{}"'„"«»]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length >= 4 && !stopWords.has(w.toLowerCase()));

    if (position === 'last') {
      return words.slice(-count);
    }
    return words.slice(0, count);
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

  // ============================================
  // STUFE 1 + 2: INTELLIGENTE GPT-SEGMENTIERUNG
  // ============================================

  /**
   * NEUE HAUPTFUNKTION: Intelligentes Parsing mit GPT
   * Zweistufiger Ansatz:
   * 1. Technische Vorverarbeitung (Header/Footer raus, Blöcke bilden)
   * 2. GPT-basierte semantische Segmentierung
   */
  async parseContractIntelligent(text, options = {}) {
    log.debug('🧠 [Legal Lens] Starte INTELLIGENTE Klausel-Extraktion...');
    log.debug(`📊 Text-Länge: ${text.length} Zeichen`);

    const {
      detectRisk = true,
      contractName = '',
      isOCR = false
    } = options;

    // ===== STUFE 1: Technische Vorverarbeitung =====
    log.debug('📋 Stufe 1: Technische Vorverarbeitung...');

    // 1a. Grundlegende Textbereinigung
    let cleanedText = this.preprocessText(text, { isOCR });

    // 1b. Header/Footer entfernen (wiederkehrende Textblöcke)
    const { text: filteredText, removedBlocks } = this.removeHeaderFooter(cleanedText);
    log.debug(`🗑️ ${removedBlocks.length} Header/Footer-Blöcke entfernt`);

    // 1c. Text in grobe Blöcke aufteilen (mit Position-Tracking)
    const rawBlocks = this.createTextBlocks(filteredText);
    log.debug(`📦 ${rawBlocks.length} Roh-Blöcke erstellt`);

    // ===== STUFE 2: GPT-basierte Segmentierung =====
    log.debug('🧠 Stufe 2: GPT-Segmentierung...');

    const gptClauses = await this.gptSegmentClauses(rawBlocks, contractName);
    log.debug(`✅ GPT hat ${gptClauses.length} Klauseln identifiziert`);

    // ===== Nachbearbeitung =====
    // FIX: Filtere ungültige Klauseln (null/undefined/leerer Text)
    const validClauses = gptClauses.filter(clause =>
      clause && clause.text && typeof clause.text === 'string' && clause.text.trim().length > 0
    );
    log.debug(`📋 ${validClauses.length} gültige Klauseln nach Filterung`);

    const clauses = validClauses.map((clause, index) => {
      // Risiko-Vorbewertung
      let riskAssessment = { level: 'low', score: 0, keywords: [] };
      if (detectRisk) {
        riskAssessment = this.assessClauseRisk(clause.text);
      }

      return {
        id: clause.id || `clause_${index + 1}`,
        number: clause.number || `${index + 1}`,
        title: clause.title || null,
        text: clause.text,
        type: clause.type || 'paragraph',
        riskLevel: riskAssessment.level,
        riskScore: riskAssessment.score,
        riskKeywords: riskAssessment.keywords,
        riskIndicators: {
          level: riskAssessment.level,
          keywords: riskAssessment.keywords,
          score: riskAssessment.score
        },
        // TRACEABILITY: Referenzen zu Ursprungsblöcken
        source: {
          blockIds: clause.sourceBlockIds || [],
          originalText: clause.originalText || clause.text,
          confidence: clause.confidence || 0.9
        },
        position: {
          start: clause.startPosition || 0,
          end: clause.endPosition || clause.text.length,
          // V2: Erweiterte Position-Daten für PDF-Mapping
          globalStart: clause.startPosition || 0,
          globalEnd: (clause.startPosition || 0) + clause.text.length,
          estimatedPage: text.length > 0 ? Math.floor((clause.startPosition || 0) / Math.max(text.length / Math.max(1, Math.ceil(text.length / 3000)), 1)) + 1 : 1,
          anchorText: clause.text.substring(0, 80).trim()
        },
        // V2: Matching-Daten für Frontend PDF Text-Layer Sync
        matchingData: {
          firstWords: this.extractSignificantWords(clause.text, 'first', 5),
          lastWords: this.extractSignificantWords(clause.text, 'last', 5),
          charLength: clause.text.length
        },
        textHash: this.generateHash(clause.text),
        metadata: {
          wordCount: clause.text.split(/\s+/).length,
          hasNumbers: /\d/.test(clause.text),
          hasDates: /\d{1,2}\.\d{1,2}\.\d{2,4}/.test(clause.text),
          hasMoneyReferences: /€|\$|EUR|USD/.test(clause.text)
        }
      };
    });

    // Risiko-Zusammenfassung
    const riskSummary = this.calculateRiskSummary(clauses);

    return {
      success: true,
      clauses,
      totalClauses: clauses.length,
      riskSummary,
      metadata: {
        originalLength: text.length,
        cleanedLength: filteredText.length,
        removedHeaderFooter: removedBlocks.length,
        rawBlockCount: rawBlocks.length,
        parsedAt: new Date().toISOString(),
        parserVersion: '2.0.0-intelligent',
        usedGPT: true
      }
    };
  }

  /**
   * STUFE 1b: Header/Footer erkennen und entfernen
   * Erkennt wiederkehrende Textblöcke (erscheinen auf mehreren "Seiten")
   */
  removeHeaderFooter(text) {
    const removedBlocks = [];
    let processedText = text;

    // Pattern für typische Header/Footer
    const headerFooterPatterns = [
      // Seitenzahlen: "Seite X von Y"
      /Seite\s+\d+\s+von\s+\d+/gi,
      // Dateiname-Wiederholungen
      /\d{6}\s+\w+\s+-\s+DE\s+–\s+\d{2}\/\d{2}\/\d{4}\s+V[\d.]+/g,
      // Ausdruck vom Datum
      /Ausdruck vom \d{2}\.\d{2}\.\d{4}/g,
      // Dateinamen
      /\d+\.\d+\s+\w+\s+\w+\s+\w+\.doc/g,
      // Geschäftsführer-Zeile (wenn wiederholt)
      /Geschäftsführer:\s*[\w\s-]+\s+Amtsgericht\s+\w+/g
    ];

    for (const pattern of headerFooterPatterns) {
      const matches = processedText.match(pattern);
      if (matches) {
        for (const match of matches) {
          removedBlocks.push({
            type: 'header_footer',
            text: match.substring(0, 100)
          });
        }
        processedText = processedText.replace(pattern, '\n');
      }
    }

    // Entferne wiederkehrende Textblöcke (Frequency-Analyse)
    const lines = processedText.split('\n');
    const lineFrequency = new Map();

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.length > 20 && trimmed.length < 200) {
        lineFrequency.set(trimmed, (lineFrequency.get(trimmed) || 0) + 1);
      }
    }

    // Zeilen die 3+ mal vorkommen sind wahrscheinlich Header/Footer
    // GUARD: Zeilen mit rechtlichen Begriffen NICHT entfernen (können legitimer Vertragstext sein)
    const legalKeywords = ['verpflichtet', 'haftung', 'kündigung', 'frist',
      'zahlung', 'leistung', 'gewährleistung', '§', 'gemäß', 'vertrag', 'pflicht',
      'anspruch', 'recht', 'gesetz', 'vertragspartei'];

    const repeatedLines = [];
    for (const [line, count] of lineFrequency) {
      if (count >= 3) {
        const lowerLine = line.toLowerCase();
        const isLikelyLegalContent = legalKeywords.some(kw => lowerLine.includes(kw));
        if (isLikelyLegalContent) {
          log.debug(`[Header/Footer] Behalte wiederholte Zeile mit Legal-Content: "${line.substring(0, 60)}..."`);
          continue; // Nicht entfernen
        }
        repeatedLines.push(line);
        removedBlocks.push({
          type: 'repeated_block',
          text: line.substring(0, 100),
          frequency: count
        });
      }
    }

    // Entferne wiederkehrende Zeilen
    if (repeatedLines.length > 0) {
      processedText = lines
        .filter(line => !repeatedLines.includes(line.trim()))
        .join('\n');
    }

    // Bereinige übermäßige Leerzeilen
    processedText = processedText
      .replace(/\n{4,}/g, '\n\n\n')
      .trim();

    return {
      text: processedText,
      removedBlocks
    };
  }

  /**
   * STUFE 1c: Text in grobe Blöcke aufteilen
   * Jeder Block behält seine Position für Traceability
   *
   * FIX: Kurze Blöcke werden NICHT verworfen, sondern markiert!
   * GPT entscheidet, ob sie relevant sind (z.B. "Gerichtsstand: München.")
   */
  createTextBlocks(text) {
    const blocks = [];

    // Splitte nach Doppel-Zeilenumbrüchen (Absätze)
    const paragraphs = text.split(/\n\n+/);
    let currentPosition = 0;
    let blockIndex = 0;

    for (let i = 0; i < paragraphs.length; i++) {
      const paragraph = paragraphs[i].trim();

      // FIX: Behalte ALLE Blöcke, auch kurze - markiere sie nur
      // Nur komplett leere oder rein aus Whitespace bestehende überspringen
      if (paragraph.length > 0) {
        blocks.push({
          id: `block_${blockIndex + 1}`,
          text: paragraph,
          startPosition: currentPosition,
          endPosition: currentPosition + paragraph.length,
          lineCount: paragraph.split('\n').length,
          wordCount: paragraph.split(/\s+/).length,
          // WICHTIG: Markiere kurze Blöcke, aber verwerfe sie nicht!
          short: paragraph.length < 20,
          // Erkenne strukturelle Marker (§, Artikel, etc.)
          isStructuralStart: /^(§\s*\d|Artikel\s*\d|Art\.\s*\d|\d+\.\d+\s|\d+\.\s+[A-ZÄÖÜ]|[IVXLC]+\.\s)/i.test(paragraph)
        });
        blockIndex++;
      }

      currentPosition += paragraph.length + 2; // +2 für \n\n
    }

    return blocks;
  }

  /**
   * STUFE 2: GPT-basierte semantische Segmentierung
   * GPT entscheidet mit "menschlicher Intuition" was zusammengehört
   *
   * FIX: Intelligentes Batching mit Overlap
   * - Paragraphen werden nicht mitten im § zerrissen
   * - 5 Blöcke Overlap zwischen Batches für Kontext
   */
  async gptSegmentClauses(blocks, contractName = '') {
    if (blocks.length === 0) {
      return [];
    }

    // Bereite Blöcke für GPT vor (mit IDs und Metadaten für Traceability)
    const blocksForGPT = blocks.map(b => ({
      id: b.id,
      text: b.text.substring(0, 1500), // Limit pro Block
      short: b.short || false,
      isStructuralStart: b.isStructuralStart || false
    }));

    // FIX: Intelligentes Batching - nicht mitten im § trennen
    // REDUZIERT von 50 auf 25 um Token-Limit nicht zu überschreiten
    const maxBlocksPerCall = 25;
    const allClauses = [];
    const processedClauseIds = new Set(); // Deduplizierung bei Overlap

    // Finde intelligente Trennpunkte (bei strukturellen Starts)
    const findBatchEnd = (startIdx) => {
      const idealEnd = Math.min(startIdx + maxBlocksPerCall, blocksForGPT.length);

      // Wenn wir am Ende sind, nimm alles
      if (idealEnd >= blocksForGPT.length) {
        return blocksForGPT.length;
      }

      // Suche rückwärts nach einem strukturellen Start (§, Artikel, etc.)
      // Mindestens 15 Blöcke pro Batch (halbe Batch-Größe)
      for (let i = idealEnd; i > startIdx + 15; i--) {
        if (blocksForGPT[i].isStructuralStart) {
          log.debug(`📍 Batch-Trennung bei Block ${i} (struktureller Start)`);
          return i;
        }
      }

      // Kein struktureller Start gefunden - nimm idealEnd
      return idealEnd;
    };

    let i = 0;
    let batchNum = 0;
    while (i < blocksForGPT.length) {
      const batchEnd = findBatchEnd(i);
      const batchBlocks = blocksForGPT.slice(i, batchEnd);
      batchNum++;
      log.debug(`📦 Batch ${batchNum}: Blöcke ${i + 1} bis ${batchEnd} (${batchBlocks.length} Blöcke)`);

      const prompt = `Du bist ein erfahrener Rechtsexperte. Analysiere die folgenden Text-Blöcke aus einem Rechtsdokument (Vertrag, AGB, Datenschutzhinweise, NDA, o.ä.) und gruppiere sie zu sinnvollen, eigenständigen Klauseln/Abschnitten.

DOKUMENTNAME: ${contractName || 'Unbekannt'}

TEXT-BLÖCKE (mit IDs):
${batchBlocks.map(b => `[${b.id}]\n${b.text}`).join('\n\n---\n\n')}

REGELN:
1. Jede Klausel muss einen abgeschlossenen rechtlichen Gedanken enthalten
2. Zusammengehörige Absätze (z.B. Aufzählungen, Unterabschnitte eines §) = EINE Klausel
3. Kurze eigenständige Sätze können einzelne Klauseln sein, wenn sie rechtlich relevant sind
4. Gebührentabellen/Konditionenübersichten = EINE Klausel "Konditionen" oder "Gebühren"
5. Reine Kontaktdaten/Adressen/Impressum = EINE Klausel "Kontaktdaten" oder "Firmendaten"
6. Ignoriere leere oder sinnlose Fragmente
7. WICHTIG: Jeder Block darf in GENAU EINER Klausel vorkommen. Keine Überlappungen.
8. Alle Blöcke müssen erfasst werden - überspringe keine.
9. Das Dokument kann ein beliebiges Rechtsdokument sein — nicht nur ein klassischer Vertrag.

WICHTIG: Behalte die Block-IDs für Traceability!

Antworte NUR mit einem JSON-Array:
[
  {
    "title": "Kurzer Titel der Klausel",
    "text": "Vollständiger Text der Klausel",
    "type": "paragraph|article|section|header|condition",
    "sourceBlockIds": ["block_1", "block_2"],
    "number": "§ 1" oder "1." oder null,
    "confidence": 0.0-1.0
  }
]`;

      try {
        const response = await openai.chat.completions.create({
          model: 'gpt-4o-mini', // Kosteneffizient
          messages: [
            {
              role: 'system',
              content: 'Du bist ein Rechtsexperte, der Rechtsdokumente (Verträge, AGB, Datenschutzhinweise, NDAs etc.) in sinnvolle Klauseln/Abschnitte segmentiert. Antworte IMMER mit validem JSON.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.15, // Niedrig aber flexibel genug für verschiedene Dokumenttypen
          max_tokens: 16000, // ERHÖHT von 4000 - GPT-4o-mini unterstützt bis 16k
          response_format: { type: 'json_object' }
        }, { timeout: 60000 });

        const content = response.choices[0].message.content;

        // Parse JSON Response
        let parsed;
        try {
          parsed = JSON.parse(content);
          // Handle both array and object with clauses property
          const clausesArray = Array.isArray(parsed) ? parsed : (parsed.clauses || parsed.result || []);

          // Fallback: GPT hat 0 Klauseln zurückgegeben
          if (clausesArray.length === 0 && batchBlocks.length > 0) {
            log.warn(`⚠️ GPT returned 0 clauses for ${batchBlocks.length} blocks - block-per-clause fallback`);
            for (const block of batchBlocks) {
              if (block.text && block.text.trim().length > 10) {
                clausesArray.push({
                  id: `fallback_${block.id}`,
                  title: null,
                  text: block.text,
                  type: 'paragraph',
                  sourceBlockIds: [block.id],
                  confidence: 0.4
                });
              }
            }
          }

          // Map source block positions
          for (const clause of clausesArray) {
            // Finde die Original-Blöcke für Position-Tracking
            const sourceBlocks = (clause.sourceBlockIds || [])
              .map(id => blocks.find(b => b.id === id))
              .filter(Boolean);

            if (sourceBlocks.length > 0) {
              clause.startPosition = sourceBlocks[0].startPosition;
              clause.endPosition = sourceBlocks[sourceBlocks.length - 1].endPosition;
              clause.originalText = sourceBlocks.map(b => b.text).join('\n\n');
            }

            // Generiere eindeutige ID basierend auf sourceBlockIds
            const clauseKey = (clause.sourceBlockIds || []).sort().join('_') || `clause_${allClauses.length}`;
            clause.id = clauseKey;
          }

          // FIX: Deduplizierung bei Overlap - nur neue Klauseln hinzufügen
          for (const clause of clausesArray) {
            if (!processedClauseIds.has(clause.id)) {
              processedClauseIds.add(clause.id);
              allClauses.push(clause);
            }
          }
        } catch (parseError) {
          log.error('⚠️ GPT JSON Parse Error:', parseError.message);
          log.debug('Raw response:', content.substring(0, 500));

          // Fallback: Behandle jeden Block als eigene Klausel
          for (const block of batchBlocks) {
            const clauseId = `fallback_${block.id}`;
            if (!processedClauseIds.has(clauseId)) {
              processedClauseIds.add(clauseId);
              allClauses.push({
                id: clauseId,
                title: null,
                text: block.text,
                type: 'paragraph',
                sourceBlockIds: [block.id],
                confidence: 0.5
              });
            }
          }
        }
      } catch (apiError) {
        log.error('❌ GPT API Error:', apiError.message);

        // Fallback: Verwende regelbasierten Parser
        log.warn('⚠️ Fallback auf regelbasierten Parser...');
        for (const block of batchBlocks) {
          const clauseId = `fallback_${block.id}`;
          if (!processedClauseIds.has(clauseId)) {
            processedClauseIds.add(clauseId);
            allClauses.push({
              id: clauseId,
              title: null,
              text: block.text,
              type: 'paragraph',
              sourceBlockIds: [block.id],
              confidence: 0.3
            });
          }
        }
      }

      // Nächster Batch startet beim Ende des aktuellen
      i = batchEnd;
    }

    return allClauses;
  }

  /**
   * Schätzt die Anzahl der Tokens für einen Text
   * Grobe Schätzung: ~4 Zeichen = 1 Token (Deutsch/Englisch gemischt)
   */
  estimateTokens(textOrLength) {
    if (!textOrLength) return 0;
    const len = typeof textOrLength === 'string' ? textOrLength.length : textOrLength;
    return Math.ceil(len / 3.5);
  }

  /**
   * GPT-Segmentierung für einen einzelnen Batch
   * Wird vom Streaming-Endpoint verwendet
   */
  async gptSegmentClausesBatch(blocks, contractName = '') {
    if (!blocks || blocks.length === 0) {
      return [];
    }

    // ===== TOKEN-LIMIT SCHUTZ =====
    // GPT-4o-mini: 128k Token Limit, wir bleiben sicher unter 100k
    const MAX_INPUT_TOKENS = 80000;
    const CHARS_PER_BLOCK_LIMIT = 2000; // Reduziert von 3000 wenn nötig

    // Bereite Blöcke für GPT vor
    // WICHTIG: Wir senden eine Preview an GPT, aber behalten den VOLLSTÄNDIGEN Text!
    let blocksForGPT = blocks.map(b => ({
      id: b.id,
      // Preview für GPT - dynamisch basierend auf Batch-Größe
      text: (b.text || '').substring(0, 3000),
      fullTextLength: (b.text || '').length,
      truncated: (b.text || '').length > 3000,
      short: b.short || false
    }));

    // Schätze Tokens für den gesamten Batch
    let totalChars = blocksForGPT.reduce((sum, b) => sum + b.text.length, 0);
    let estimatedTokens = this.estimateTokens(totalChars);

    // Wenn zu viele Tokens, reduziere Text pro Block
    if (estimatedTokens > MAX_INPUT_TOKENS) {
      log.debug(`⚠️ [Token-Limit] Batch zu groß (${estimatedTokens} Tokens), reduziere Text pro Block...`);

      blocksForGPT = blocks.map(b => ({
        id: b.id,
        text: (b.text || '').substring(0, CHARS_PER_BLOCK_LIMIT),
        fullTextLength: (b.text || '').length,
        truncated: (b.text || '').length > CHARS_PER_BLOCK_LIMIT,
        short: b.short || false
      }));

      totalChars = blocksForGPT.reduce((sum, b) => sum + b.text.length, 0);
      estimatedTokens = this.estimateTokens(totalChars);

      log.debug(`✅ [Token-Limit] Reduziert auf ${estimatedTokens} Tokens`);
    }

    // Finale Warnung wenn immer noch zu groß
    if (estimatedTokens > MAX_INPUT_TOKENS) {
      log.error(`❌ [Token-Limit] Batch immer noch zu groß (${estimatedTokens} Tokens), einige Blöcke werden übersprungen!`);
      // Nimm nur die ersten N Blöcke die ins Limit passen
      let currentTokens = 0;
      const safeBlocks = [];
      for (const block of blocksForGPT) {
        const blockTokens = this.estimateTokens(block.text.length);
        if (currentTokens + blockTokens < MAX_INPUT_TOKENS) {
          safeBlocks.push(block);
          currentTokens += blockTokens;
        } else {
          log.warn(`⚠️ [Token-Limit] Block ${block.id} übersprungen (würde Limit überschreiten)`);
        }
      }
      blocksForGPT = safeBlocks;
    }

    const prompt = `Du bist ein erfahrener Rechtsexperte. Analysiere die folgenden Text-Blöcke aus einem Rechtsdokument (Vertrag, AGB, Datenschutzhinweise, NDA, o.ä.) und gruppiere sie zu sinnvollen, eigenständigen Klauseln/Abschnitten.

DOKUMENTNAME: ${contractName || 'Unbekannt'}

TEXT-BLÖCKE (mit IDs):
${blocksForGPT.map(b => `[${b.id}]\n${b.text}`).join('\n\n---\n\n')}

REGELN:
1. Jede Klausel muss einen abgeschlossenen rechtlichen Gedanken enthalten
2. Zusammengehörige Absätze = EINE Klausel
3. Kurze eigenständige Sätze können einzelne Klauseln sein
4. Gebührentabellen = EINE Klausel "Konditionen"
5. Kontaktdaten/Impressum = EINE Klausel "Kontaktdaten"
6. WICHTIG: Jeder Block darf in GENAU EINER Klausel vorkommen. Keine Überlappungen.
7. Alle Blöcke müssen erfasst werden - überspringe keine.
8. Das Dokument kann ein beliebiges Rechtsdokument sein — nicht nur ein klassischer Vertrag.

Antworte NUR mit einem JSON-Array:
[
  {
    "title": "Kurzer Titel",
    "text": "Vollständiger Text",
    "type": "paragraph|article|section|header|condition",
    "sourceBlockIds": ["block_1"],
    "number": "§ 1" oder null,
    "confidence": 0.0-1.0
  }
]`;

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Du bist ein Rechtsexperte, der Rechtsdokumente (Verträge, AGB, Datenschutzhinweise, NDAs etc.) in sinnvolle Klauseln/Abschnitte segmentiert. Antworte mit validem JSON.'
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.15,
        max_tokens: 16000,
        response_format: { type: 'json_object' }
      }, { timeout: 60000 });

      const content = response.choices[0].message.content;
      const parsed = JSON.parse(content);
      let clausesArray = Array.isArray(parsed) ? parsed : (parsed.clauses || parsed.result || []);

      // ===== FALLBACK: GPT hat 0 Klauseln zurückgegeben =====
      if (clausesArray.length === 0 && blocks.length > 0) {
        log.warn(`⚠️ GPT returned 0 clauses for ${blocks.length} blocks - block-per-clause fallback`);
        for (const block of blocks) {
          if (block.text && block.text.trim().length > 10) {
            clausesArray.push({
              id: `fallback_${block.id}`,
              title: null,
              text: block.text,
              type: 'paragraph',
              sourceBlockIds: [block.id],
              confidence: 0.4
            });
          }
        }
      }

      // ===== COVERAGE VERIFICATION =====
      // Sammle alle Block-IDs die von GPT erfasst wurden
      const coveredBlockIds = new Set();

      // Map source block positions + Track Coverage
      for (const clause of clausesArray) {
        const sourceBlocks = (clause.sourceBlockIds || [])
          .map(id => blocks.find(b => b.id === id))
          .filter(Boolean);

        // Track covered blocks
        (clause.sourceBlockIds || []).forEach(id => coveredBlockIds.add(id));

        if (sourceBlocks.length > 0) {
          // WICHTIG: Verwende den VOLLSTÄNDIGEN Originaltext, nicht die GPT-Preview!
          clause.originalText = sourceBlocks.map(b => b.text).join('\n\n');
          // Überschreibe GPTs text mit dem vollständigen Text
          clause.text = clause.originalText;
        }

        clause.id = (clause.sourceBlockIds || []).sort().join('_') || `clause_${Math.random().toString(36).substr(2, 9)}`;
      }

      // ===== ORPHANED BLOCKS CHECK =====
      // Finde Blöcke die GPT NICHT erfasst hat
      const orphanedBlocks = blocks.filter(b => !coveredBlockIds.has(b.id));

      if (orphanedBlocks.length > 0) {
        log.debug(`⚠️ [Coverage] ${orphanedBlocks.length} von ${blocks.length} Blöcken wurden von GPT nicht erfasst!`);

        // Erstelle Klauseln für verwaiste Blöcke
        for (const orphan of orphanedBlocks) {
          // Nur wenn Block substantiellen Text hat (nicht nur Whitespace)
          if (orphan.text && orphan.text.trim().length > 10) {
            log.debug(`📥 [Coverage] Füge verwaisten Block hinzu: "${orphan.text.substring(0, 50)}..."`);
            clausesArray.push({
              id: `recovered_${orphan.id}`,
              title: null,
              text: orphan.text,  // VOLLSTÄNDIGER Text
              type: 'paragraph',
              sourceBlockIds: [orphan.id],
              confidence: 0.5,
              recovered: true,  // Markiere als "gerettet"
              recoveryReason: 'orphaned_block'
            });
          }
        }
      }

      // Log Coverage Statistics
      const coveragePercent = Math.round((coveredBlockIds.size / blocks.length) * 100);
      log.debug(`✅ [Coverage] ${coveragePercent}% der Blöcke erfasst (${coveredBlockIds.size}/${blocks.length})`);

      // ===== TEXT-BASIERTE DEDUPLIZIERUNG =====
      // Entfernt Duplikate die durch Orphaned-Block-Recovery oder GPT-Überlappung entstehen
      const deduplicatedClauses = [];
      const seenTextHashes = new Set();

      for (const clause of clausesArray) {
        const normalizedText = (clause.text || '')
          .toLowerCase().replace(/\s+/g, ' ').trim().substring(0, 300);
        const textHash = this.generateHash(normalizedText);

        if (!seenTextHashes.has(textHash)) {
          seenTextHashes.add(textHash);
          deduplicatedClauses.push(clause);
        } else {
          log.debug(`[Dedup] Duplikat entfernt: "${(clause.text || '').substring(0, 50)}..."`);
        }
      }

      if (deduplicatedClauses.length < clausesArray.length) {
        log.debug(`[Dedup] ${clausesArray.length - deduplicatedClauses.length} Duplikate in Batch entfernt`);
      }

      return deduplicatedClauses;

    } catch (error) {
      log.error('❌ GPT Batch Error:', error.message);

      // Fallback: Jeden Block als Klausel behandeln
      return blocks.map(block => ({
        id: `fallback_${block.id}`,
        title: null,
        text: block.text,
        type: 'paragraph',
        sourceBlockIds: [block.id],
        confidence: 0.3
      }));
    }
  }
}

// Singleton-Export
module.exports = new ClauseParser();
