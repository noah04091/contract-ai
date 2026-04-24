/**
 * Legal Lens - Clause Post-Processor
 *
 * Deterministische Nachverarbeitung von GPT-extrahierten Klauseln.
 * Faengt alles ab was GPT trotz Prompt-Anweisungen durchlaesst:
 * Adressen, Unterschriften, Duplikate, leere Titel, Seitenkoepfe, etc.
 *
 * Laeuft NACH dem GPT-Call, OHNE GPT. Rein regelbasiert.
 *
 * @version 1.0.0
 */

const { normalizeForMatch } = require('./textMatching');

// ══════════════════════════════════════════════════════════════
// FILTER-PIPELINE (Reihenfolge ist wichtig!)
// ══════════════════════════════════════════════════════════════

/**
 * Hauptfunktion: Wendet alle Filter nacheinander an.
 *
 * @param {Array} clauses - Array von { number, title, text }
 * @param {string} rawText - Original-Vertragstext (fuer Kontext)
 * @returns {{ clauses: Array, stats: object }}
 */
function postProcess(clauses, rawText = '') {
  if (!clauses || clauses.length === 0) return { clauses: [], stats: {} };

  const stats = {
    input: clauses.length,
    textCleaned: 0,
    pageHeadersStripped: 0,
    signaturesRemoved: 0,
    greetingsRemoved: 0,
    dateLocationRemoved: 0,
    tocRemoved: 0,
    companyDataRemoved: 0,
    partyDataStripped: 0,
    titleOnlyRemoved: 0,
    orphansMerged: 0,
    duplicatesRemoved: 0,
    output: 0
  };

  let result = clauses.map(c => ({ ...c })); // Shallow copy

  // 1. Text Cleanup (PDF-Artefakte in Klauseltexten)
  result = cleanTexts(result, stats);

  // 2. Seitenkopf/-fuss Erkennung und Entfernung aus Texten
  result = stripPageHeaders(result, stats);

  // 3. Unterschriftsfelder komplett entfernen
  result = removeSignatureBlocks(result, stats);

  // 4. Grussformeln / Begleitschreiben entfernen
  result = removeGreetingsAndCoverLetters(result, stats);

  // 5. Standalone Ort/Datum-Zeilen entfernen
  result = removeDateLocationLines(result, stats);

  // 6. Inhaltsverzeichnis entfernen
  result = removeTableOfContents(result, stats);

  // 7. Reine Firmenstammdaten entfernen
  result = removeCompanyRegistrationData(result, stats);

  // 8. Parteidaten aus Praembel/erster Klausel strippen
  result = stripPartyData(result, stats);

  // 9. Leere Titel-Klauseln (ohne Inhalt) entfernen oder mergen
  result = removeTitleOnlyClauses(result, stats);

  // 10. Verwaiste Unterpunkte an Eltern-Klausel anhaengen
  result = mergeOrphans(result, stats);

  // 11. Erweiterte Deduplizierung (mit Positions-Check gegen Originaltext)
  result = enhancedDedup(result, stats, rawText);

  stats.output = result.length;
  return { clauses: result, stats };
}

// ══════════════════════════════════════════════════════════════
// 1. TEXT CLEANUP
// ══════════════════════════════════════════════════════════════

function cleanTexts(clauses, stats) {
  return clauses.map(c => {
    let text = c.text || '';
    const before = text;

    // Ueberfluessige Leerzeilen reduzieren
    text = text.replace(/\n{3,}/g, '\n\n');
    // Ueberfluessige Spaces
    text = text.replace(/[ \t]{3,}/g, ' ');
    // Form-Feeds / Null-Bytes
    text = text.replace(/[\f\x00]/g, '');
    // Silbentrennung reparieren
    text = text.replace(/(\w)-\n(\w)/g, '$1$2');

    if (text !== before) stats.textCleaned++;
    return { ...c, text: text.trim() };
  });
}

// ══════════════════════════════════════════════════════════════
// 2. SEITENKOPF/-FUSS ERKENNUNG
// ══════════════════════════════════════════════════════════════

const PAGE_HEADER_PATTERNS = [
  /^Seite\s+\d+\s*(von|\/)\s*\d+\s*$/im,
  /^\d+\s*\/\s*\d+$/m,
  /^[-–—]\s*\d+\s*[-–—]$/m,
  /^Seite\s+\d+$/im,
  /^Ausdruck vom\s+\d{2}\.\d{2}\.\d{4}/im,
  /^(VERTRAULICH|CONFIDENTIAL|ENTWURF|DRAFT|MUSTER|KOPIE)\s*$/im
];

function stripPageHeaders(clauses, stats) {
  // Finde Zeilen die in 3+ Klauseln vorkommen → wiederkehrende Header
  const lineCounts = {};
  for (const c of clauses) {
    const lines = (c.text || '').split('\n');
    const seen = new Set();
    for (const line of lines) {
      const norm = normalizeForMatch(line);
      if (norm.length > 3 && norm.length < 80 && !seen.has(norm)) {
        seen.add(norm);
        lineCounts[norm] = (lineCounts[norm] || 0) + 1;
      }
    }
  }
  const repeatingHeaders = new Set(
    Object.entries(lineCounts).filter(([, count]) => count >= 3).map(([line]) => line)
  );

  return clauses.map(c => {
    let text = c.text || '';
    const before = text;

    // Bekannte Patterns entfernen
    for (const pattern of PAGE_HEADER_PATTERNS) {
      text = text.replace(pattern, '');
    }

    // Wiederkehrende Zeilen entfernen
    if (repeatingHeaders.size > 0) {
      const lines = text.split('\n');
      text = lines.filter(line => {
        const norm = normalizeForMatch(line);
        return !repeatingHeaders.has(norm);
      }).join('\n');
    }

    text = text.replace(/\n{3,}/g, '\n\n').trim();
    if (text !== before.trim()) stats.pageHeadersStripped++;
    return { ...c, text };
  });
}

// ══════════════════════════════════════════════════════════════
// 3. UNTERSCHRIFTSFELDER
// ══════════════════════════════════════════════════════════════

function removeSignatureBlocks(clauses, stats) {
  return clauses.filter(c => {
    const text = (c.text || '').trim();
    const title = (c.title || '').trim().toLowerCase();

    // Titel ist Unterschrift/Signatur
    if (/^(unterschrift|signatur|signature|unterzeichnung)/i.test(title)) {
      stats.signaturesRemoved++;
      return false;
    }

    // Viele Unterstriche/Punkte + Signatur-Keywords
    const fillPatterns = (text.match(/[_]{3,}|\.{5,}/g) || []).length;
    const hasSignatureWords = /unterschrift|signature|datum|ort\s*,?\s*datum/i.test(text);
    if (fillPatterns >= 2 && hasSignatureWords) {
      stats.signaturesRemoved++;
      return false;
    }

    // Reiner Signaturblock: kurz, keine Saetze, Signatur-Keywords
    if (text.length < 400 && hasSignatureWords && fillPatterns >= 1 && !/[.;]\s+[A-ZÄÖÜ]/m.test(text)) {
      stats.signaturesRemoved++;
      return false;
    }

    return true;
  });
}

// ══════════════════════════════════════════════════════════════
// 4. GRUSSFORMELN / BEGLEITSCHREIBEN
// ══════════════════════════════════════════════════════════════

function removeGreetingsAndCoverLetters(clauses, stats) {
  return clauses.filter(c => {
    const text = (c.text || '').trim();

    // Grussformeln
    if (/^(mit freundlichen gr[uü][sß]en|sincerely|best regards|hochachtungsvoll|mfg)\b/i.test(text) && text.length < 200) {
      stats.greetingsRemoved++;
      return false;
    }

    // Begleitschreiben-Anfang
    if (/^sehr geehrte/i.test(text) && /(anbei|beigef[uü]gt|in der anlage|[uü]bersenden)/i.test(text) && text.length < 500) {
      stats.greetingsRemoved++;
      return false;
    }

    // Betreffzeilen
    if (/^(betreff|subject|re|unser zeichen|ihr zeichen|az)\s*:/i.test(text) && text.length < 200) {
      stats.greetingsRemoved++;
      return false;
    }

    return true;
  });
}

// ══════════════════════════════════════════════════════════════
// 5. STANDALONE ORT/DATUM
// ══════════════════════════════════════════════════════════════

function removeDateLocationLines(clauses, stats) {
  return clauses.filter(c => {
    const text = (c.text || '').trim();
    if (text.length > 150) return true;

    // "Berlin, den 15. März 2026" / "Berlin, 15.03.2026" / "Durmersheim, den 15. März 2026"
    if (/^[A-ZÄÖÜ][a-zäöüß]+,?\s+(den\s+)?\d{1,2}\.?\s*[A-Za-zÄÖÜäöü]*\s*\d{4}\s*$/.test(text)) {
      stats.dateLocationRemoved++;
      return false;
    }
    if (/^(datum|date)\s*[:.]\s*\d{2}\.\d{2}\.\d{4}\s*$/i.test(text)) {
      stats.dateLocationRemoved++;
      return false;
    }
    // Nur Ort + Datum, evtl. mit Komma
    if (/^[A-ZÄÖÜ][a-zäöüß]+,\s+\d{1,2}\.\s*\w+\.?\s+\d{4}\s*$/.test(text)) {
      stats.dateLocationRemoved++;
      return false;
    }

    return true;
  });
}

// ══════════════════════════════════════════════════════════════
// 6. INHALTSVERZEICHNIS
// ══════════════════════════════════════════════════════════════

function removeTableOfContents(clauses, stats) {
  return clauses.filter(c => {
    const text = (c.text || '').trim();
    const title = (c.title || '').trim();

    if (/^(inhaltsverzeichnis|table\s+of\s+contents|gliederung|[uü]bersicht)/i.test(title)) {
      stats.tocRemoved++;
      return false;
    }

    // Viele dot-leader Zeilen: "§ 1 Vertragsgegenstand ......... 3"
    const tocLines = (text.match(/\.{3,}\s*\d+/g) || []).length;
    if (tocLines >= 3) {
      stats.tocRemoved++;
      return false;
    }

    return true;
  });
}

// ══════════════════════════════════════════════════════════════
// 7. FIRMENSTAMMDATEN
// ══════════════════════════════════════════════════════════════

const COMPANY_DATA_PATTERNS = [
  /Handelsregister\s*[:.]\s*(HRB?|HRA)\s*\d+/i,
  /Amtsgericht\s+[A-ZÄÖÜ][a-zäöüß]+/i,
  /USt-?Id-?Nr\.?\s*[:.]\s*DE\s*\d/i,
  /Steuer-?Nr\.?\s*[:.]\s*\d+\s*\/\s*\d+/i,
  /\bIBAN\s*[:.]\s*[A-Z]{2}\d{2}/i,
  /\bBIC\s*[:.]\s*[A-Z]{4,}/i,
  /Gl[aä]ubiger-?ID\s*[:.]\s*DE/i,
  /Registergericht\s*[:.]\s*[A-ZÄÖÜ]/i,
  /Sitz\s+der\s+Gesellschaft/i
];

const LEGAL_VERB_PATTERN = /\b(verpflichtet|haftet|berechtigt|ist\s+(verpflichtet|berechtigt|gehalten)|muss|darf|soll|gilt|betr[aä]gt|wird\s+ge(w[aä]hr|leist))\b/i;

function removeCompanyRegistrationData(clauses, stats) {
  return clauses.filter(c => {
    const text = (c.text || '').trim();

    // Zaehle wie viele Company-Data Patterns matchen
    const matchCount = COMPANY_DATA_PATTERNS.filter(p => p.test(text)).length;

    // 3+ Matches UND keine juristischen Verben → reiner Firmenstempel
    if (matchCount >= 3 && !LEGAL_VERB_PATTERN.test(text)) {
      stats.companyDataRemoved++;
      return false;
    }

    // IBAN + BIC ohne juristische Substanz und kurz
    if (/\bIBAN\b/.test(text) && /\bBIC\b/.test(text) && !LEGAL_VERB_PATTERN.test(text) && text.length < 400) {
      stats.companyDataRemoved++;
      return false;
    }

    return true;
  });
}

// ══════════════════════════════════════════════════════════════
// 8. PARTEIDATEN AUS PRÄAMBEL STRIPPEN
// ══════════════════════════════════════════════════════════════

const PARTY_DATA_SIGNALS = [
  /Geburtsdatum\s*[:.]\s*\d{2}\.\d{2}\.\d{4}/i,
  /geboren\s+(am\s+)?\d{2}\.\d{2}\.\d{4}/i,
  /\b\d{5}\s+[A-ZÄÖÜ][a-zäöüß]{2,}/,                                   // PLZ + Ort
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[a-z]{2,}\b/,                    // E-Mail
  /(Stra[sß]e|Str\.|Ring|Weg|Allee|Platz|Gasse)\s*\d+/i,                // Strasse + Nr
  /nachfolgend\s+[„""']?(Partei|Auftragnehmer|Auftraggeber|Vermieter|Mieter|Arbeitgeber|Arbeitnehmer|Empfänger|empfangende)/i,
  /vertreten\s+durch\s+(den\s+|die\s+)?Gesch[aä]ftsf[uü]hrer/i,
  /Anschrift\s*[:]/i
];

function stripPartyData(clauses, stats) {
  if (clauses.length === 0) return clauses;

  return clauses.map((c, idx) => {
    const text = (c.text || '').trim();
    const title = (c.title || '').toLowerCase();

    // Nur bei den ersten 2 Klauseln oder bei typischen Titeln
    const isCandidate = idx < 2 ||
      /pr[aä]ambel|vertragsparteien|geheimhaltungsvereinbarung|parteien|between/i.test(title);
    if (!isCandidate) return c;

    // Wie viele Party-Data-Signale?
    const signalCount = PARTY_DATA_SIGNALS.filter(p => p.test(text)).length;
    if (signalCount < 2) return c;

    // Text in Zeilen aufteilen und Parteidaten-Block finden
    const lines = text.split('\n');
    let partyBlockEnd = -1;
    let consecutivePartyLines = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const isPartyLine = PARTY_DATA_SIGNALS.some(p => p.test(line)) ||
        /^(zwischen|und|–\s*nachfolgend|gemeinsam\s+als|einzeln\s+als|werden\s+einzeln)/i.test(line) ||
        /^(Name|Vorname|Firma|Gesellschaft|Anschrift|E-?Mail|Tel|Fax)\s*[:.]/i.test(line) ||
        /^[–—-]\s+nachfolgend/i.test(line) ||
        (line.length < 80 && /^[A-ZÄÖÜ][a-zäöüß]+\s+(UG|GmbH|AG|KG|OHG|SE|e\.?\s*V\.?)/i.test(line)) ||
        // Kurzzeile die nur ein Name ist (2-4 Woerter, nur Buchstaben, innerhalb eines Party-Blocks)
        (consecutivePartyLines > 0 && line.length < 50 && line.length > 3 && /^[A-ZÄÖÜ][a-zäöüß]+(\s+[A-ZÄÖÜ][a-zäöüß]+){0,3}$/.test(line));

      if (isPartyLine || (line === '' && consecutivePartyLines > 0)) {
        consecutivePartyLines++;
        partyBlockEnd = i;
      } else if (consecutivePartyLines > 0) {
        // Parteiblock endet hier
        break;
      }
    }

    if (partyBlockEnd >= 0 && partyBlockEnd < lines.length - 1) {
      // Rest nach Parteiblock behalten
      const remaining = lines.slice(partyBlockEnd + 1).join('\n').trim();
      if (remaining.length > 50) {
        stats.partyDataStripped++;
        return { ...c, text: remaining };
      }
    }

    // Wenn der gesamte Text nur Parteidaten ist und kurz → entfernen
    if (signalCount >= 4 && !LEGAL_VERB_PATTERN.test(text) && text.length < 800) {
      stats.partyDataStripped++;
      return { ...c, text: '' }; // Wird spaeter durch Leer-Filter entfernt
    }

    return c;
  }).filter(c => (c.text || '').trim().length > 0);
}

// ══════════════════════════════════════════════════════════════
// 9. LEERE TITEL-KLAUSELN
// ══════════════════════════════════════════════════════════════

function removeTitleOnlyClauses(clauses, stats) {
  return clauses.filter(c => {
    const text = (c.text || '').trim();

    // Nummerierung/Titel-Prefix entfernen
    const stripped = text.replace(/^[§\s\d.\-–—()]+/g, '').trim();

    // Kein Satzinhalt: kein Punkt, kein Semikolon, wenig Woerter
    if (stripped.length < 80 && !/[.;:]/.test(stripped) && stripped.split(/\s+/).length < 8) {
      stats.titleOnlyRemoved++;
      return false;
    }

    // Einzeilig und sehr kurz
    if (text.length < 60 && !text.includes('\n') && !/[.;:]/.test(text)) {
      stats.titleOnlyRemoved++;
      return false;
    }

    return true;
  });
}

// ══════════════════════════════════════════════════════════════
// 10. VERWAISTE UNTERPUNKTE
// ══════════════════════════════════════════════════════════════

function mergeOrphans(clauses, stats) {
  if (clauses.length < 2) return clauses;

  const result = [clauses[0]];

  for (let i = 1; i < clauses.length; i++) {
    const current = clauses[i];
    const prev = result[result.length - 1];
    const currentText = (current.text || '').trim();

    // Hat die aktuelle Klausel keinen eigenen Titel/Nummer?
    const hasOwnIdentity = current.number || current.title;

    // Beginnt der Text mit einem Unterpunkt der zum Vorgaenger passt?
    const startsWithSubpoint = /^\s*\d+\.\s/.test(currentText) && !current.number;
    const startsWithBullet = /^\s*[-–•]\s/.test(currentText) && !current.number;

    // Vorgaenger endet mitten im Satz?
    const prevText = (prev.text || '').trim();
    const prevEndsIncomplete = !/[.;:!?)]$/.test(prevText);

    if (!hasOwnIdentity && (startsWithSubpoint || startsWithBullet || prevEndsIncomplete)) {
      // Anhaengen
      result[result.length - 1] = {
        ...prev,
        text: prevText + '\n' + currentText
      };
      stats.orphansMerged++;
    } else {
      result.push(current);
    }
  }

  return result;
}

// ══════════════════════════════════════════════════════════════
// 11. ERWEITERTE DEDUPLIZIERUNG
// ══════════════════════════════════════════════════════════════

function enhancedDedup(clauses, stats, rawText = '') {
  // Index-Abstand: Klauseln die in der Extraktions-Reihenfolge weit auseinander
  // stehen, werden NIE als Duplikate behandelt — sie stammen aus verschiedenen
  // Dokumentteilen (z.B. Safe Plus Versicherung vs RSV Plus Versicherung).
  //
  // Warum Index statt Text-Position: GPT reformuliert Text beim Extrahieren,
  // daher ist Text-Matching gegen den Rohtext unzuverlaessig. Aber die
  // Reihenfolge bleibt erhalten — Klausel #5 kommt immer vor Klausel #60.
  //
  // Schwellenwert 5: Batch-Overlap-Duplikate sind 1-2 Positionen auseinander
  // (5K Overlap bei 60K Batch = ~8% = ~1-2 Klauseln pro Grenze).
  // Verschiedene Versicherungsprodukte sind 3-6+ Positionen auseinander.
  // 5 gibt genug Spielraum fuer echte Overlap-Duplikate.
  const MIN_INDEX_DISTANCE = 5;

  const result = [];
  const resultOriginalIndices = []; // Original-Index jeder akzeptierten Klausel

  for (let i = 0; i < clauses.length; i++) {
    const clause = clauses[i];
    const normText = normalizeForMatch((clause.text || '').toLowerCase());
    const normTitle = normalizeForMatch(((clause.title || '') + ' ' + (clause.number || '')).toLowerCase());

    let isDuplicate = false;

    for (let j = 0; j < result.length; j++) {
      const existing = result[j];
      const originalIdx = resultOriginalIndices[j];

      // INDEX-ABSTAND-CHECK: Weit auseinander → verschiedene Dokumentteile → kein Duplikat
      if (Math.abs(i - originalIdx) > MIN_INDEX_DISTANCE) {
        continue; // Naechsten Kandidaten pruefen
      }

      const existingNormText = normalizeForMatch((existing.text || '').toLowerCase());
      const existingNormTitle = normalizeForMatch(((existing.title || '') + ' ' + (existing.number || '')).toLowerCase());

      // a) Titel-Match + Text-Overlap
      if (normTitle.length > 3 && existingNormTitle.length > 3) {
        const titleSimilarity = jaccardWords(normTitle, existingNormTitle);
        if (titleSimilarity > 0.5) {
          const textOverlap = jaccardWords(normText, existingNormText);
          // Bei hoher Titel-Aehnlichkeit reicht weniger Text-Overlap
          const textThreshold = titleSimilarity > 0.8 ? 0.25 : 0.4;
          if (textOverlap > textThreshold) {
            isDuplicate = true;
            // Behalte den laengeren Text
            if (normText.length > existingNormText.length) {
              existing.text = clause.text;
            }
            break;
          }
        }
      }

      // b) Text-Containment: Kurzer Text ist Teilmenge des laengeren
      if (normText.length > 20 && existingNormText.length > 20) {
        const shorter = normText.length < existingNormText.length ? normText : existingNormText;
        const longer = normText.length < existingNormText.length ? existingNormText : normText;
        if (longer.includes(shorter.substring(0, Math.min(100, shorter.length)))) {
          isDuplicate = true;
          if (normText.length > existingNormText.length) {
            existing.text = clause.text;
          }
          break;
        }
      }

      // c) Erste 150 Chars > 80% identisch (bestehende Logik)
      const a = normText.substring(0, 150);
      const b = existingNormText.substring(0, 150);
      if (a.length > 20 && b.length > 20) {
        const compareLen = Math.min(a.length, b.length, 100);
        let matches = 0;
        for (let i = 0; i < compareLen; i++) {
          if (a[i] === b[i]) matches++;
        }
        if (matches / compareLen > 0.80) {
          isDuplicate = true;
          if (normText.length > existingNormText.length) {
            existing.text = clause.text;
          }
          break;
        }
      }
    }

    if (!isDuplicate) {
      result.push(clause);
      resultOriginalIndices.push(i);
    } else {
      stats.duplicatesRemoved++;
    }
  }

  return result;
}

/**
 * Jaccard-Aehnlichkeit auf Wort-Ebene.
 */
function jaccardWords(a, b) {
  const setA = new Set(a.split(/\s+/).filter(w => w.length > 2));
  const setB = new Set(b.split(/\s+/).filter(w => w.length > 2));
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersection = 0;
  for (const word of setA) {
    if (setB.has(word)) intersection++;
  }
  const union = setA.size + setB.size - intersection;
  return union > 0 ? intersection / union : 0;
}

module.exports = { postProcess };
