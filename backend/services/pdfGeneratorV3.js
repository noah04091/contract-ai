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
 * Parst den Vertragstext und formatiert ihn für Typst
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
#align(center)[
  #line(length: 3cm, stroke: 0.5pt + gray)
  #h(1em)
  #smallcaps[*Präambel*]
  #h(1em)
  #line(length: 3cm, stroke: 0.5pt + gray)
]
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
#text(weight: "bold", size: 12pt)[${escapeTypst(cleanTitle)}]
#v(0.5em)
`;
      continue;
    }

    // Nummerierte Absätze
    if (/^\(?\d+\)?\.?\s/.test(trimmed)) {
      paragraphNum++;
      const cleanText = trimmed.replace(/^\(?\d+\)?\.?\s*/, '').replace(/\*\*/g, '');
      typstContent += `
#grid(
  columns: (auto, 1fr),
  gutter: 0.8em,
  align(center + top)[
    #circle(radius: 0.45em, stroke: 1pt + rgb("#333"))[
      #text(size: 8pt, weight: "bold")[${paragraphNum}]
    ]
  ],
  [${escapeTypst(cleanText)}]
)
#v(0.3em)
`;
      continue;
    }

    // Buchstaben-Aufzählung
    if (/^[a-z]\)/.test(trimmed)) {
      const letter = trimmed.charAt(0);
      const cleanText = trimmed.substring(2).trim().replace(/\*\*/g, '');
      typstContent += `
#h(2em)
#grid(
  columns: (auto, 1fr),
  gutter: 0.5em,
  align(center + top)[
    #circle(radius: 0.35em, stroke: 0.5pt + rgb("#666"))[
      #text(size: 7pt)[${letter}]
    ]
  ],
  text(size: 10pt)[${escapeTypst(cleanText)}]
)
#v(0.2em)
`;
      continue;
    }

    // Spiegelstriche
    if (trimmed.startsWith('-') || trimmed.startsWith('•')) {
      const cleanText = trimmed.substring(1).trim().replace(/\*\*/g, '');
      typstContent += `
#h(2em) • #text(size: 10pt)[${escapeTypst(cleanText)}]
#v(0.15em)
`;
      continue;
    }

    // Normaler Text
    typstContent += `${escapeTypst(trimmed.replace(/\*\*/g, ''))}\n#v(0.3em)\n`;
  }

  return typstContent;
};

// ═══════════════════════════════════════════════════════════════════════════
// TYPST TEMPLATE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generiert das vollständige Typst-Dokument
 */
const generateTypstDocument = (contractText, companyProfile, contractType, parties, partyLabels, documentId, isDraft, currentDate) => {
  const contentSections = parseContractForTypst(contractText);

  return `
// ═══════════════════════════════════════════════════════════════════════════
// VERTRAGSDOKUMENT - Generiert mit Typst
// ═══════════════════════════════════════════════════════════════════════════

#set document(
  title: "${escapeTypst(contractType || 'Vertrag')}",
  author: "${escapeTypst(companyProfile?.companyName || 'Contract AI')}"
)

#set page(
  paper: "a4",
  margin: (top: 2.5cm, bottom: 2cm, left: 2.5cm, right: 2cm),
  numbering: "1 / 1",
  number-align: center,
)

#set text(
  size: 11pt,
  lang: "de"
)

#set par(
  justify: true,
  leading: 0.65em
)

// ═══════════════════════════════════════════════════════════════════════════
// SEITE 1: DECKBLATT
// ═══════════════════════════════════════════════════════════════════════════

// Briefkopf
#grid(
  columns: (1fr, auto),
  align: (left, right),
  [],
  [
    #set text(9pt, fill: rgb("#666"))
    #strong[${escapeTypst(companyProfile?.companyName || 'Unternehmen')}]
    ${companyProfile?.street ? `\\\\ ${escapeTypst(companyProfile.street)}` : ''}
    ${companyProfile?.zip ? `\\\\ ${escapeTypst(companyProfile.zip)} ${escapeTypst(companyProfile?.city || '')}` : ''}
    ${companyProfile?.phone ? `\\\\ Tel: ${escapeTypst(companyProfile.phone)}` : ''}
    ${companyProfile?.email ? `\\\\ ${escapeTypst(companyProfile.email)}` : ''}
  ]
)

#line(length: 100%, stroke: 0.5pt + rgb("#ddd"))

#v(4cm)

// Vertragstyp
#align(center)[
  #line(length: 6cm, stroke: 1.5pt + rgb("#333"))
  #v(0.8em)
  #text(size: 24pt, weight: "bold", tracking: 3pt)[
    #upper[${escapeTypst(contractType || 'VERTRAG')}]
  ]
  #v(0.8em)
  #line(length: 6cm, stroke: 1.5pt + rgb("#333"))
  #v(1em)
  #text(size: 11pt, fill: rgb("#666"), style: "italic")[
    geschlossen am ${escapeTypst(currentDate)}
  ]
]

#v(3cm)

// Parteien
#text(weight: "bold")[zwischen]
#v(0.5em)

#pad(left: 1.5em)[
  #block(
    stroke: (left: 2pt + rgb("#ddd")),
    inset: (left: 1em, y: 0.5em)
  )[
    #strong[${escapeTypst(companyProfile?.companyName || 'Vertragspartei A')}]
    ${companyProfile?.street ? `\\\\ ${escapeTypst(companyProfile.street)}` : ''}
    ${companyProfile?.zip ? `\\\\ ${escapeTypst(companyProfile.zip)} ${escapeTypst(companyProfile?.city || '')}` : ''}
    \\\\ #text(style: "italic", fill: rgb("#666"))[– nachfolgend "${escapeTypst(partyLabels.partyA)}" genannt –]
  ]
]

#v(0.5em)
#text(weight: "bold")[und]
#v(0.5em)

#pad(left: 1.5em)[
  #block(
    stroke: (left: 2pt + rgb("#ddd")),
    inset: (left: 1em, y: 0.5em)
  )[
    #strong[${escapeTypst(parties?.buyer || parties?.partyB || 'Vertragspartei B')}]
    ${parties?.buyerAddress ? `\\\\ ${escapeTypst(parties.buyerAddress)}` : ''}
    ${parties?.buyerCity ? `\\\\ ${escapeTypst(parties.buyerCity)}` : ''}
    \\\\ #text(style: "italic", fill: rgb("#666"))[– nachfolgend "${escapeTypst(partyLabels.partyB)}" genannt –]
  ]
]

#v(1fr)

// Footer Seite 1
#set text(8pt, fill: rgb("#999"))
#grid(
  columns: (1fr, 1fr, 1fr),
  align: (left, center, right),
  [DOK-ID: ${escapeTypst(documentId?.substring(0, 20) || 'N/A')}],
  [Seite 1],
  [${new Date().toLocaleDateString('de-DE')}]
)

#pagebreak()

// ═══════════════════════════════════════════════════════════════════════════
// SEITEN 2-N: VERTRAGSINHALT
// ═══════════════════════════════════════════════════════════════════════════

${contentSections}

#pagebreak()

// ═══════════════════════════════════════════════════════════════════════════
// LETZTE SEITE: UNTERSCHRIFTEN
// ═══════════════════════════════════════════════════════════════════════════

#block(
  width: 100% + 4.5cm,
  inset: (x: -2.25cm, y: 1.5cm),
  fill: rgb("#f5f0e6")
)[
  #align(center)[
    #text(size: 16pt, weight: "bold", tracking: 1pt)[
      #upper[Unterschriften der Vertragsparteien]
    ]
  ]
]

#v(1.5cm)

#grid(
  columns: (1fr, 1fr),
  gutter: 2cm,
  [
    #text(weight: "bold", size: 10pt)[#upper[${escapeTypst(partyLabels.partyA)} / Partei A]]
    #v(1cm)

    #line(length: 100%, stroke: 0.5pt + rgb("#666"))
    #text(size: 8pt, fill: rgb("#666"))[Ort, Datum]
    #v(1cm)

    #line(length: 100%, stroke: 1.5pt + rgb("#333"))
    #text(size: 8pt, fill: rgb("#666"))[(Unterschrift / Stempel)]
    #v(1cm)

    #line(length: 100%, stroke: (dash: "dotted") + rgb("#ccc"))
    #v(0.3em)
    #strong[${escapeTypst(companyProfile?.companyName || partyLabels.partyA)}]
    \\\\ #text(size: 8pt, fill: rgb("#666"))[(Geschäftsführung)]
  ],
  [
    #text(weight: "bold", size: 10pt)[#upper[${escapeTypst(partyLabels.partyB)} / Partei B]]
    #v(1cm)

    #line(length: 100%, stroke: 0.5pt + rgb("#666"))
    #text(size: 8pt, fill: rgb("#666"))[Ort, Datum]
    #v(1cm)

    #line(length: 100%, stroke: 1.5pt + rgb("#333"))
    #text(size: 8pt, fill: rgb("#666"))[(Unterschrift)]
    #v(1cm)

    #line(length: 100%, stroke: (dash: "dotted") + rgb("#ccc"))
    #v(0.3em)
    #strong[${escapeTypst(parties?.buyer || parties?.partyB || partyLabels.partyB)}]
    \\\\ #text(size: 8pt, fill: rgb("#666"))[(Name in Druckschrift)]
  ]
)

#v(2cm)

// Anlagen-Box
#block(
  width: 100%,
  fill: rgb("#faf8f5"),
  stroke: 1pt + rgb("#e5e0d5"),
  inset: 1em
)[
  #text(weight: "bold", style: "italic")[ANLAGEN]
  \\\\ #text(fill: rgb("#666"))[Diesem Vertrag sind keine Anlagen beigefügt.]
]

#v(1cm)

// QR-Code Bereich
#align(center)[
  #line(length: 100%, stroke: 0.5pt + rgb("#ddd"))
  #v(0.5cm)
  #text(size: 8pt, fill: rgb("#888"))[Digitale Verifizierung]
  \\\\ #text(size: 8pt, fill: rgb("#888"))[ID: ${escapeTypst(documentId?.substring(0, 20) || 'N/A')}]
]

${isDraft ? `
// Wasserzeichen (Entwurf)
#place(
  center + horizon,
  rotate(
    -45deg,
    text(size: 60pt, fill: rgb("#f0f0f0").transparentize(50%))[ENTWURF]
  )
)
` : ''}
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
