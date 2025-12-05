// 📄 pdfGeneratorV3.js - Typst basierter Vertragsgenerator
// Verwendet Typst für professionelle Typografie (LaTeX-Alternative)

const typst = require('typst');
const QRCode = require('qrcode');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generiert QR-Code als PNG-Datei
 */
const generateQRCodeFile = async (text) => {
  try {
    const tempDir = os.tmpdir();
    const qrPath = path.join(tempDir, `qr-${Date.now()}.png`);
    await QRCode.toFile(qrPath, text, {
      width: 150,
      margin: 1,
      color: { dark: '#333333', light: '#ffffff' }
    });
    return qrPath;
  } catch (error) {
    console.error('QR-Code Fehler:', error);
    return null;
  }
};

/**
 * Bestimmt die Parteien-Bezeichnungen basierend auf Vertragstyp
 */
const getPartyLabels = (contractType) => {
  const type = (contractType || '').toLowerCase();

  if (type.includes('kauf')) return { partyA: 'Verkäufer', partyB: 'Käufer' };
  if (type.includes('miet')) return { partyA: 'Vermieter', partyB: 'Mieter' };
  if (type.includes('arbeit')) return { partyA: 'Arbeitgeber', partyB: 'Arbeitnehmer' };
  if (type.includes('dienst')) return { partyA: 'Auftraggeber', partyB: 'Auftragnehmer' };
  if (type.includes('pacht')) return { partyA: 'Verpächter', partyB: 'Pächter' };
  if (type.includes('darlehen') || type.includes('kredit')) return { partyA: 'Darlehensgeber', partyB: 'Darlehensnehmer' };
  if (type.includes('geheimhaltung') || type.includes('nda')) return { partyA: 'Offenlegende Partei', partyB: 'Empfangende Partei' };

  return { partyA: 'Partei A', partyB: 'Partei B' };
};

/**
 * Escaped Text für Typst (spezielle Zeichen)
 */
const escapeTypst = (text) => {
  if (!text) return '';
  return text
    .replace(/\\/g, '\\\\')
    .replace(/#/g, '\\#')
    .replace(/\$/g, '\\$')
    .replace(/@/g, '\\@')
    .replace(/</g, '\\<')
    .replace(/>/g, '\\>')
    .replace(/\*/g, '\\*')
    .replace(/_/g, '\\_')
    .replace(/`/g, '\\`');
};

/**
 * Parst den Vertragstext und formatiert ihn für Typst (vereinfachte kompatible Syntax)
 */
const parseContractForTypst = (text) => {
  const lines = text.split('\n');
  let typstContent = '';
  let skipParties = false;
  let paragraphNum = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Überspringe Parteien-Bereich
    if (trimmed.toLowerCase() === 'zwischen') {
      skipParties = true;
      continue;
    }
    if (skipParties && (trimmed === 'PRÄAMBEL' || trimmed.startsWith('§'))) {
      skipParties = false;
    }
    if (skipParties) continue;

    // Hauptüberschrift überspringen
    if (trimmed === trimmed.toUpperCase() && trimmed.length > 5 &&
        !trimmed.startsWith('§') && !['PRÄAMBEL', 'ZWISCHEN', 'UND', 'ANLAGEN'].includes(trimmed)) {
      continue;
    }

    // Präambel
    if (trimmed === 'PRÄAMBEL' || trimmed === 'Präambel') {
      typstContent += `
#v(1em)
#align(center)[*--- Präambel ---*]
#v(0.5em)
`;
      continue;
    }

    // Paragraph (§)
    if (trimmed.startsWith('§')) {
      paragraphNum = 0;
      const cleanTitle = trimmed.replace(/\*\*/g, '');
      typstContent += `
#v(1.5em)
*${escapeTypst(cleanTitle)}*
#v(0.5em)
`;
      continue;
    }

    // Nummerierte Absätze
    if (/^\(?\d+\)?\.?\s/.test(trimmed)) {
      paragraphNum++;
      const cleanText = trimmed.replace(/^\(?\d+\)?\.?\s*/, '').replace(/\*\*/g, '');
      typstContent += `
(${paragraphNum}) ${escapeTypst(cleanText)}

`;
      continue;
    }

    // Buchstaben-Aufzählung
    if (/^[a-z]\)/.test(trimmed)) {
      const cleanText = trimmed.replace(/\*\*/g, '');
      typstContent += `
#h(2em)${escapeTypst(cleanText)}

`;
      continue;
    }

    // Spiegelstriche
    if (trimmed.startsWith('-') || trimmed.startsWith('•')) {
      const cleanText = trimmed.substring(1).trim().replace(/\*\*/g, '');
      typstContent += `
- ${escapeTypst(cleanText)}
`;
      continue;
    }

    // Normaler Text
    typstContent += `${escapeTypst(trimmed.replace(/\*\*/g, ''))}

`;
  }

  return typstContent;
};

// ═══════════════════════════════════════════════════════════════════════════
// TYPST TEMPLATE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generiert das vollständige Typst-Dokument (vereinfachte kompatible Syntax)
 */
const generateTypstDocument = (contractText, companyProfile, contractType, parties, partyLabels, documentId, isDraft, currentDate) => {
  const contentSections = parseContractForTypst(contractText);

  return `
// VERTRAGSDOKUMENT - Generiert mit Typst

#set page(
  paper: "a4",
  margin: (top: 2.5cm, bottom: 2cm, left: 2.5cm, right: 2cm),
  numbering: "1",
)

#set text(size: 11pt)

#set par(justify: true)

// DECKBLATT

#align(right)[
  #text(size: 9pt)[
    *${escapeTypst(companyProfile?.companyName || 'Unternehmen')}*
    ${companyProfile?.street ? `\\\\ ${escapeTypst(companyProfile.street)}` : ''}
    ${companyProfile?.zip ? `\\\\ ${escapeTypst(companyProfile.zip)} ${escapeTypst(companyProfile?.city || '')}` : ''}
  ]
]

#v(4cm)

#align(center)[
  #text(size: 24pt)[*${escapeTypst((contractType || 'VERTRAG').toUpperCase())}*]

  #v(1em)

  #text(size: 11pt)[_geschlossen am ${escapeTypst(currentDate)}_]
]

#v(3cm)

*zwischen*

#v(0.5em)

#box(inset: (left: 1em))[
  *${escapeTypst(companyProfile?.companyName || 'Vertragspartei A')}*
  ${companyProfile?.street ? `\\\\ ${escapeTypst(companyProfile.street)}` : ''}
  ${companyProfile?.zip ? `\\\\ ${escapeTypst(companyProfile.zip)} ${escapeTypst(companyProfile?.city || '')}` : ''}
  \\\\ _– nachfolgend "${escapeTypst(partyLabels.partyA)}" genannt –_
]

#v(0.5em)

*und*

#v(0.5em)

#box(inset: (left: 1em))[
  *${escapeTypst(parties?.buyer || parties?.partyB || 'Vertragspartei B')}*
  ${parties?.buyerAddress ? `\\\\ ${escapeTypst(parties.buyerAddress)}` : ''}
  ${parties?.buyerCity ? `\\\\ ${escapeTypst(parties.buyerCity)}` : ''}
  \\\\ _– nachfolgend "${escapeTypst(partyLabels.partyB)}" genannt –_
]

#pagebreak()

// VERTRAGSINHALT

${contentSections}

#pagebreak()

// UNTERSCHRIFTEN

#align(center)[
  #text(size: 16pt)[*UNTERSCHRIFTEN DER VERTRAGSPARTEIEN*]
]

#v(2cm)

#table(
  columns: (1fr, 1fr),
  stroke: none,
  [
    *${escapeTypst(partyLabels.partyA.toUpperCase())} / PARTEI A*
    #v(1cm)
    #line(length: 100%)
    Ort, Datum
    #v(1cm)
    #line(length: 100%)
    (Unterschrift / Stempel)
    #v(0.5cm)
    *${escapeTypst(companyProfile?.companyName || partyLabels.partyA)}*
  ],
  [
    *${escapeTypst(partyLabels.partyB.toUpperCase())} / PARTEI B*
    #v(1cm)
    #line(length: 100%)
    Ort, Datum
    #v(1cm)
    #line(length: 100%)
    (Unterschrift)
    #v(0.5cm)
    *${escapeTypst(parties?.buyer || parties?.partyB || partyLabels.partyB)}*
  ]
)

#v(2cm)

#box(stroke: 1pt, inset: 1em, width: 100%)[
  *_ANLAGEN_*
  \\\\ Diesem Vertrag sind keine Anlagen beigefügt.
]

#v(1cm)

#align(center)[
  #line(length: 100%)
  #v(0.5cm)
  #text(size: 8pt)[Digitale Verifizierung - ID: ${escapeTypst(documentId?.substring(0, 20) || 'N/A')}]
]
`;
};

// ═══════════════════════════════════════════════════════════════════════════
// HAUPT-EXPORT FUNKTION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generiert ein professionelles PDF mit Typst
 *
 * @param {string} contractText - Der Vertragstext
 * @param {Object} companyProfile - Firmenprofil mit Logo, Adresse etc.
 * @param {string} contractType - Typ des Vertrags (Kaufvertrag, Mietvertrag, etc.)
 * @param {Object} parties - Informationen zu den Vertragsparteien
 * @param {boolean} isDraft - Ob es ein Entwurf ist (zeigt Wasserzeichen)
 * @returns {Promise<Buffer>} - PDF als Buffer
 */
const generatePDFv3 = async (contractText, companyProfile, contractType, parties = {}, isDraft = false) => {
  console.log('🎨 [V3 Typst] Starte PDF-Generierung...');
  console.log('📄 Vertragstyp:', contractType);
  console.log('🏢 Firma:', companyProfile?.companyName);

  // Dokument-ID generieren
  const documentId = `DOC-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

  // Parteien-Labels
  const partyLabels = getPartyLabels(contractType);

  // Datum formatieren
  const currentDate = new Date().toLocaleDateString('de-DE', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });

  // Typst-Dokument generieren
  const typstSource = generateTypstDocument(
    contractText,
    companyProfile,
    contractType,
    parties,
    partyLabels,
    documentId,
    isDraft,
    currentDate
  );

  console.log('📝 Typst-Dokument erstellt, kompiliere zu PDF...');

  // Temporäre Dateien erstellen
  const tempDir = os.tmpdir();
  const timestamp = Date.now();
  const typFile = path.join(tempDir, `contract-${timestamp}.typ`);
  const pdfFile = path.join(tempDir, `contract-${timestamp}.pdf`);

  try {
    // Typst-Quellcode in temporäre Datei schreiben
    await fs.writeFile(typFile, typstSource, 'utf8');
    console.log('📄 Typst-Datei geschrieben:', typFile);

    // Typst zu PDF kompilieren
    await typst.compile(typFile, pdfFile);
    console.log('📄 PDF-Datei erstellt:', pdfFile);

    // PDF-Datei lesen
    const pdfBuffer = await fs.readFile(pdfFile);

    // Temporäre Dateien aufräumen
    try {
      await fs.unlink(typFile);
      await fs.unlink(pdfFile);
    } catch (cleanupError) {
      console.log('⚠️ Cleanup-Fehler (nicht kritisch):', cleanupError.message);
    }

    console.log(`✅ [V3 Typst] PDF generiert: ${(pdfBuffer.length / 1024).toFixed(1)} KB`);
    return pdfBuffer;
  } catch (error) {
    console.error('❌ [V3 Typst] Kompilierung fehlgeschlagen:', error);

    // Cleanup bei Fehler
    try {
      await fs.unlink(typFile).catch(() => {});
      await fs.unlink(pdfFile).catch(() => {});
    } catch (e) {}

    throw new Error(`Typst-Kompilierung fehlgeschlagen: ${error.message}`);
  }
};

module.exports = {
  generatePDFv3,
  getPartyLabels,
  parseContractForTypst
};
