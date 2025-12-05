// 📄 pdfGeneratorV2.js - React-PDF basierter Vertragsgenerator
// Professioneller PDF-Generator mit 5 Design-Varianten
// Version 2.0 - Marktreif

const ReactPDF = require('@react-pdf/renderer');
const { Document, Page, Text, View, StyleSheet, Font, Image } = ReactPDF;
const React = require('react');
const QRCode = require('qrcode');

// ═══════════════════════════════════════════════════════════════════════════
// FONT REGISTRATION
// ═══════════════════════════════════════════════════════════════════════════

Font.register({
  family: 'Times-Roman',
  fonts: [
    { src: 'Times-Roman' },
    { src: 'Times-Bold', fontWeight: 'bold' },
    { src: 'Times-Italic', fontStyle: 'italic' },
    { src: 'Times-BoldItalic', fontWeight: 'bold', fontStyle: 'italic' }
  ]
});

Font.register({
  family: 'Helvetica',
  fonts: [
    { src: 'Helvetica' },
    { src: 'Helvetica-Bold', fontWeight: 'bold' },
    { src: 'Helvetica-Oblique', fontStyle: 'italic' },
    { src: 'Helvetica-BoldOblique', fontWeight: 'bold', fontStyle: 'italic' }
  ]
});

// ═══════════════════════════════════════════════════════════════════════════
// DESIGN THEMES - 5 professionelle Varianten
// ═══════════════════════════════════════════════════════════════════════════

const DESIGN_THEMES = {
  // EXECUTIVE - Elegant & Kraftvoll (Standard/Default)
  executive: {
    name: 'Executive',
    fontFamily: 'Times-Roman',
    colors: {
      primary: '#1a1a1a',        // Fast Schwarz
      secondary: '#333333',      // Dunkelgrau
      accent: '#4a4a4a',         // Mittelgrau
      text: '#1a1a1a',           // Haupttext
      textLight: '#555555',      // Leichter Text
      textMuted: '#777777',      // Gedämpfter Text
      border: '#cccccc',         // Rahmen
      borderDark: '#999999',     // Dunklere Rahmen
      background: '#f5f5f5',     // Hintergrund
      backgroundAlt: '#fafafa', // Alt Hintergrund
      line: '#1a1a1a',           // Linien
    },
    spacing: {
      headerLine: 2,
      sectionLine: 1,
    }
  },

  // MODERN - Frisch & Dynamisch
  modern: {
    name: 'Modern',
    fontFamily: 'Helvetica',
    colors: {
      primary: '#0066cc',        // Blau
      secondary: '#0052a3',      // Dunkleres Blau
      accent: '#00a3cc',         // Türkis-Akzent
      text: '#2d2d2d',           // Haupttext
      textLight: '#5a5a5a',      // Leichter Text
      textMuted: '#8a8a8a',      // Gedämpfter Text
      border: '#e0e0e0',         // Rahmen
      borderDark: '#c0c0c0',     // Dunklere Rahmen
      background: '#f8f9fa',     // Hintergrund
      backgroundAlt: '#e8f4f8', // Alt Hintergrund (leicht blau)
      line: '#0066cc',           // Linien
    },
    spacing: {
      headerLine: 3,
      sectionLine: 2,
    }
  },

  // MINIMAL - Klar & Fokussiert
  minimal: {
    name: 'Minimal',
    fontFamily: 'Helvetica',
    colors: {
      primary: '#2d2d2d',        // Dunkelgrau
      secondary: '#4a4a4a',      // Mittelgrau
      accent: '#2d2d2d',         // Gleich wie Primary
      text: '#2d2d2d',           // Haupttext
      textLight: '#666666',      // Leichter Text
      textMuted: '#999999',      // Gedämpfter Text
      border: '#e5e5e5',         // Sehr heller Rahmen
      borderDark: '#d0d0d0',     // Dunklere Rahmen
      background: '#ffffff',     // Reines Weiß
      backgroundAlt: '#fafafa', // Fast weiß
      line: '#2d2d2d',           // Linien
    },
    spacing: {
      headerLine: 1,
      sectionLine: 0,
    }
  },

  // ELEGANT - Luxuriös & Raffiniert
  elegant: {
    name: 'Elegant',
    fontFamily: 'Times-Roman',
    colors: {
      primary: '#2c1810',        // Tiefes Braun
      secondary: '#4a3728',      // Warmes Braun
      accent: '#c9a227',         // Gold
      text: '#2c1810',           // Haupttext
      textLight: '#5a4a3a',      // Leichter Text
      textMuted: '#8a7a6a',      // Gedämpfter Text
      border: '#d4c4b0',         // Warmer Rahmen
      borderDark: '#b4a490',     // Dunklere Rahmen
      background: '#faf8f5',     // Cremiger Hintergrund
      backgroundAlt: '#f5f0e8', // Alt Hintergrund
      line: '#c9a227',           // Gold Linien
    },
    spacing: {
      headerLine: 2,
      sectionLine: 1,
    }
  },

  // CORPORATE - Struktur & Vertrauen
  corporate: {
    name: 'Corporate',
    fontFamily: 'Helvetica',
    colors: {
      primary: '#003366',        // Dunkelblau
      secondary: '#004080',      // Mittelblau
      accent: '#0066cc',         // Helles Blau
      text: '#1a1a1a',           // Haupttext
      textLight: '#4a4a4a',      // Leichter Text
      textMuted: '#6a6a6a',      // Gedämpfter Text
      border: '#d0d8e0',         // Bläulicher Rahmen
      borderDark: '#a0b0c0',     // Dunklere Rahmen
      background: '#f4f6f8',     // Kühler Hintergrund
      backgroundAlt: '#e8eef4', // Alt Hintergrund
      line: '#003366',           // Linien
    },
    spacing: {
      headerLine: 3,
      sectionLine: 1,
    }
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generiert QR-Code als Data-URL
 */
const generateQRCode = async (text) => {
  try {
    return await QRCode.toDataURL(text, {
      width: 100,
      margin: 1,
      color: { dark: '#333333', light: '#ffffff' }
    });
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
 * Parst den Vertragstext in strukturierte Abschnitte
 */
const parseContractText = (text) => {
  const lines = text.split('\n');
  const sections = [];
  let currentSection = null;
  let skipParties = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Überspringe Parteien-Bereich im Text (wird separat gerendert)
    if (trimmed.toLowerCase() === 'zwischen') {
      skipParties = true;
      continue;
    }
    if (skipParties && (trimmed === 'PRÄAMBEL' || trimmed.startsWith('§'))) {
      skipParties = false;
    }
    if (skipParties) continue;

    // Hauptüberschrift überspringen (wird als Deckblatt gerendert)
    if (trimmed === trimmed.toUpperCase() && trimmed.length > 5 &&
        !trimmed.startsWith('§') && !['PRÄAMBEL', 'ZWISCHEN', 'UND', 'ANLAGEN'].includes(trimmed)) {
      continue;
    }

    // Präambel
    if (trimmed === 'PRÄAMBEL' || trimmed === 'Präambel') {
      currentSection = { type: 'preamble', title: 'Präambel', content: [] };
      sections.push(currentSection);
      continue;
    }

    // Paragraph (§)
    if (trimmed.startsWith('§')) {
      currentSection = { type: 'section', title: trimmed.replace(/\*\*/g, ''), content: [] };
      sections.push(currentSection);
      continue;
    }

    // Nummerierte Absätze (1), (2), 1., 2. etc.
    if (/^\(?\d+\)?\.?\s/.test(trimmed)) {
      const text = trimmed.replace(/^\(?\d+\)?\.?\s*/, '').replace(/\*\*/g, '');
      if (currentSection) {
        currentSection.content.push({ type: 'numbered', text });
      }
      continue;
    }

    // Buchstaben-Aufzählung a), b), c)
    if (/^[a-z]\)/.test(trimmed)) {
      const letter = trimmed.charAt(0);
      const text = trimmed.substring(2).trim().replace(/\*\*/g, '');
      if (currentSection) {
        currentSection.content.push({ type: 'letter', letter, text });
      }
      continue;
    }

    // Spiegelstriche/Bullets
    if (trimmed.startsWith('-') || trimmed.startsWith('•') || trimmed.startsWith('–')) {
      const text = trimmed.substring(1).trim().replace(/\*\*/g, '');
      if (currentSection) {
        currentSection.content.push({ type: 'bullet', text });
      }
      continue;
    }

    // Normaler Text
    if (currentSection) {
      currentSection.content.push({ type: 'text', text: trimmed.replace(/\*\*/g, '') });
    }
  }

  return sections;
};

/**
 * Erstellt dynamische Styles basierend auf dem gewählten Theme
 */
const createStyles = (theme) => {
  const colors = theme.colors;

  return StyleSheet.create({
    // ══════════════════════════════════════════════════════════════
    // SEITEN-LAYOUT
    // ══════════════════════════════════════════════════════════════
    page: {
      fontFamily: theme.fontFamily,
      fontSize: 11,
      paddingTop: 50,
      paddingBottom: 60,
      paddingHorizontal: 55,
      lineHeight: 1.5,
      color: colors.text,
    },

    // ══════════════════════════════════════════════════════════════
    // DECKBLATT
    // ══════════════════════════════════════════════════════════════
    coverPage: {
      flex: 1,
      position: 'relative',
    },

    // Briefkopf/Header
    letterhead: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 20,
      paddingBottom: 15,
      borderBottomWidth: theme.spacing.headerLine,
      borderBottomColor: colors.line,
    },

    logo: {
      width: 70,
      height: 70,
      objectFit: 'contain',
    },

    companyInfo: {
      textAlign: 'right',
      fontSize: 9,
      color: colors.textLight,
    },

    companyName: {
      fontSize: 12,
      fontWeight: 'bold',
      color: colors.primary,
      marginBottom: 3,
    },

    // Vertragstyp-Titel Block
    contractTypeContainer: {
      marginTop: 60,
      marginBottom: 40,
      alignItems: 'center',
    },

    contractType: {
      fontSize: 24,
      fontWeight: 'bold',
      textTransform: 'uppercase',
      letterSpacing: 3,
      color: colors.primary,
      textAlign: 'center',
    },

    contractTypeLine: {
      width: 80,
      height: theme.spacing.headerLine,
      backgroundColor: colors.line,
      marginTop: 12,
      marginBottom: 12,
    },

    contractDate: {
      fontSize: 11,
      color: colors.textLight,
      fontStyle: 'italic',
      marginTop: 5,
    },

    // Parteien-Block
    partiesContainer: {
      marginTop: 40,
    },

    partiesLabel: {
      fontSize: 11,
      fontWeight: 'bold',
      marginBottom: 12,
      marginTop: 8,
      color: colors.text,
    },

    partyBlock: {
      marginBottom: 8,
      paddingLeft: 15,
      paddingVertical: 8,
      borderLeftWidth: 2,
      borderLeftColor: colors.border,
    },

    partyName: {
      fontSize: 12,
      fontWeight: 'bold',
      marginBottom: 3,
      color: colors.primary,
    },

    partyAddress: {
      fontSize: 10,
      color: colors.textLight,
      marginBottom: 1,
    },

    partyRole: {
      fontSize: 10,
      fontStyle: 'italic',
      color: colors.textMuted,
      marginTop: 4,
    },

    // Cover Footer
    coverFooter: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      flexDirection: 'row',
      justifyContent: 'space-between',
      fontSize: 8,
      color: colors.textMuted,
      paddingTop: 8,
      borderTopWidth: 0.5,
      borderTopColor: colors.border,
    },

    // ══════════════════════════════════════════════════════════════
    // INHALTS-SEITEN
    // ══════════════════════════════════════════════════════════════
    contentPage: {
      flex: 1,
    },

    // Präambel
    preambleContainer: {
      marginBottom: 20,
      paddingBottom: 15,
      borderBottomWidth: 0.5,
      borderBottomColor: colors.border,
    },

    preambleTitle: {
      fontSize: 11,
      fontWeight: 'bold',
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginBottom: 10,
      color: colors.primary,
      textAlign: 'center',
    },

    preambleText: {
      fontSize: 10,
      textAlign: 'justify',
      color: colors.textLight,
      fontStyle: 'italic',
      lineHeight: 1.6,
    },

    // Paragraph-Überschriften (§)
    sectionHeader: {
      fontSize: 11,
      fontWeight: 'bold',
      marginTop: 20,
      marginBottom: 8,
      color: colors.primary,
      paddingBottom: theme.spacing.sectionLine > 0 ? 3 : 0,
      borderBottomWidth: theme.spacing.sectionLine,
      borderBottomColor: colors.border,
    },

    // Nummerierte Absätze - OHNE Kreise, klassisch (1), (2)
    numberedParagraph: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: 6,
      marginTop: 2,
    },

    paragraphNumber: {
      width: 28,
      fontSize: 10,
      color: colors.text,
      fontWeight: 'bold',
    },

    paragraphText: {
      flex: 1,
      fontSize: 10,
      textAlign: 'justify',
      lineHeight: 1.55,
      color: colors.text,
    },

    // Buchstaben-Aufzählung - klassisch a), b)
    letterItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: 4,
      marginLeft: 28,
    },

    letterLabel: {
      width: 20,
      fontSize: 10,
      color: colors.textLight,
    },

    letterContent: {
      flex: 1,
      fontSize: 10,
      textAlign: 'justify',
      color: colors.text,
    },

    // Spiegelstriche/Bullets
    bulletItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: 3,
      marginLeft: 28,
    },

    bulletPoint: {
      width: 15,
      fontSize: 10,
      color: colors.textLight,
    },

    bulletText: {
      flex: 1,
      fontSize: 10,
      color: colors.text,
    },

    // Normaler Absatz
    paragraph: {
      fontSize: 10,
      textAlign: 'justify',
      marginBottom: 6,
      lineHeight: 1.55,
      color: colors.text,
    },

    // Seiten-Footer
    pageFooter: {
      position: 'absolute',
      bottom: 25,
      left: 55,
      right: 55,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      fontSize: 8,
      color: colors.textMuted,
      paddingTop: 8,
      borderTopWidth: 0.5,
      borderTopColor: colors.border,
    },

    // ══════════════════════════════════════════════════════════════
    // UNTERSCHRIFTEN-SEITE (schlicht gehalten)
    // ══════════════════════════════════════════════════════════════
    signaturePage: {
      flex: 1,
    },

    signatureHeader: {
      marginBottom: 30,
      paddingBottom: 15,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },

    signatureTitle: {
      fontSize: 14,
      fontWeight: 'bold',
      textTransform: 'uppercase',
      letterSpacing: 1,
      color: colors.primary,
      textAlign: 'center',
    },

    signatureColumns: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 20,
    },

    signatureColumn: {
      width: '45%',
    },

    signatureLabel: {
      fontSize: 9,
      fontWeight: 'bold',
      textTransform: 'uppercase',
      marginBottom: 20,
      color: colors.textLight,
    },

    signatureField: {
      marginBottom: 20,
    },

    signatureLine: {
      borderBottomWidth: 1,
      borderBottomColor: colors.borderDark,
      height: 30,
      marginBottom: 4,
    },

    signatureHint: {
      fontSize: 8,
      color: colors.textMuted,
    },

    signatureName: {
      fontSize: 10,
      fontWeight: 'bold',
      marginTop: 8,
      color: colors.text,
    },

    signatureRole: {
      fontSize: 8,
      color: colors.textMuted,
    },

    // QR-Code & Verifizierung
    verificationContainer: {
      marginTop: 40,
      paddingTop: 15,
      borderTopWidth: 0.5,
      borderTopColor: colors.border,
      alignItems: 'center',
    },

    qrCode: {
      width: 50,
      height: 50,
      marginBottom: 5,
    },

    verificationText: {
      fontSize: 7,
      color: colors.textMuted,
      textAlign: 'center',
    },

    // Anlagen-Box
    attachmentsBox: {
      marginTop: 25,
      padding: 12,
      backgroundColor: colors.backgroundAlt,
      borderWidth: 0.5,
      borderColor: colors.border,
    },

    attachmentsTitle: {
      fontSize: 9,
      fontWeight: 'bold',
      marginBottom: 4,
      color: colors.textLight,
    },

    attachmentsText: {
      fontSize: 9,
      color: colors.textMuted,
    },

    // Wasserzeichen
    watermark: {
      position: 'absolute',
      top: '40%',
      left: '20%',
      fontSize: 60,
      color: '#e0e0e0',
      transform: 'rotate(-45deg)',
      opacity: 0.3,
      fontWeight: 'bold',
    },
  });
};

// ═══════════════════════════════════════════════════════════════════════════
// REACT-PDF KOMPONENTEN
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Deckblatt-Komponente
 */
const CoverPage = ({ styles, theme, companyProfile, contractType, parties, partyLabels, currentDate, documentId, isDraft }) => {
  const e = React.createElement;
  const colors = theme.colors;

  return e(Page, { size: 'A4', style: styles.page },
    // Wasserzeichen wenn Entwurf
    isDraft && e(Text, { style: styles.watermark }, 'ENTWURF'),

    e(View, { style: styles.coverPage },
      // Briefkopf
      e(View, { style: styles.letterhead },
        // Logo (falls vorhanden)
        companyProfile?.logoUrl
          ? e(Image, { src: companyProfile.logoUrl, style: styles.logo })
          : e(View, { style: { width: 50 } }),

        // Firmeninfo rechts
        e(View, { style: styles.companyInfo },
          e(Text, { style: styles.companyName }, companyProfile?.companyName || ''),
          companyProfile?.street && e(Text, null, companyProfile.street),
          companyProfile?.zip && e(Text, null, `${companyProfile.zip} ${companyProfile.city || ''}`),
          companyProfile?.phone && e(Text, null, `Tel: ${companyProfile.phone}`),
          companyProfile?.email && e(Text, null, companyProfile.email)
        )
      ),

      // Vertragstyp-Titel
      e(View, { style: styles.contractTypeContainer },
        e(View, { style: styles.contractTypeLine }),
        e(Text, { style: styles.contractType }, contractType || 'VERTRAG'),
        e(View, { style: styles.contractTypeLine }),
        e(Text, { style: styles.contractDate }, `geschlossen am ${currentDate}`)
      ),

      // Parteien
      e(View, { style: styles.partiesContainer },
        e(Text, { style: styles.partiesLabel }, 'zwischen'),

        // Partei A (Unternehmen/Verkäufer)
        e(View, { style: styles.partyBlock },
          e(Text, { style: styles.partyName }, companyProfile?.companyName || parties?.seller || parties?.partyA || '[Vertragspartei A]'),
          (companyProfile?.street || parties?.sellerAddress || parties?.partyAAddress) &&
            e(Text, { style: styles.partyAddress }, companyProfile?.street || parties?.sellerAddress || parties?.partyAAddress || ''),
          (companyProfile?.zip || parties?.sellerCity || parties?.partyACity) &&
            e(Text, { style: styles.partyAddress }, companyProfile?.zip ? `${companyProfile.zip} ${companyProfile.city || ''}` : (parties?.sellerCity || parties?.partyACity || '')),
          e(Text, { style: styles.partyRole }, `– nachfolgend „${partyLabels.partyA}" genannt –`)
        ),

        e(Text, { style: styles.partiesLabel }, 'und'),

        // Partei B (Käufer/Mieter)
        e(View, { style: styles.partyBlock },
          e(Text, { style: styles.partyName }, parties?.buyer || parties?.partyB || parties?.buyerName || '[Vertragspartei B]'),
          (parties?.buyerAddress || parties?.partyBAddress) &&
            e(Text, { style: styles.partyAddress }, parties?.buyerAddress || parties?.partyBAddress || ''),
          (parties?.buyerCity || parties?.partyBCity) &&
            e(Text, { style: styles.partyAddress }, parties?.buyerCity || parties?.partyBCity || ''),
          e(Text, { style: styles.partyRole }, `– nachfolgend „${partyLabels.partyB}" genannt –`)
        )
      ),

      // Footer
      e(View, { style: styles.coverFooter },
        e(Text, null, `Dok-ID: ${documentId?.substring(0, 16) || 'N/A'}`),
        e(Text, null, 'Seite 1'),
        e(Text, null, currentDate)
      )
    )
  );
};

/**
 * Inhalts-Seite Komponente
 */
const ContentPage = ({ styles, theme, sections, companyProfile, contractType }) => {
  const e = React.createElement;

  const renderContent = (item, index, numberedCounter) => {
    switch (item.type) {
      case 'numbered':
        return e(View, { key: index, style: styles.numberedParagraph },
          e(Text, { style: styles.paragraphNumber }, `(${numberedCounter})`),
          e(Text, { style: styles.paragraphText }, item.text)
        );

      case 'letter':
        return e(View, { key: index, style: styles.letterItem },
          e(Text, { style: styles.letterLabel }, `${item.letter})`),
          e(Text, { style: styles.letterContent }, item.text)
        );

      case 'bullet':
        return e(View, { key: index, style: styles.bulletItem },
          e(Text, { style: styles.bulletPoint }, '–'),
          e(Text, { style: styles.bulletText }, item.text)
        );

      default:
        return e(Text, { key: index, style: styles.paragraph }, item.text);
    }
  };

  const renderSection = (section, sectionIndex) => {
    let numberedCounter = 0;

    if (section.type === 'preamble') {
      return e(View, { key: sectionIndex, style: styles.preambleContainer },
        e(Text, { style: styles.preambleTitle }, 'Präambel'),
        ...section.content.map((item, i) =>
          e(Text, { key: i, style: styles.preambleText }, item.text)
        )
      );
    }

    return e(View, { key: sectionIndex, wrap: false },
      e(Text, { style: styles.sectionHeader }, section.title),
      ...section.content.map((item, i) => {
        if (item.type === 'numbered') numberedCounter++;
        return renderContent(item, i, numberedCounter);
      })
    );
  };

  return e(Page, { size: 'A4', style: styles.page },
    e(View, { style: styles.contentPage },
      ...sections.map(renderSection)
    ),
    e(View, { style: styles.pageFooter, fixed: true },
      e(Text, null, (contractType || 'Vertrag').toUpperCase()),
      e(Text, { render: ({ pageNumber }) => `Seite ${pageNumber}` }),
      e(Text, null, companyProfile?.companyName || '')
    )
  );
};

/**
 * Unterschriften-Seite Komponente (schlicht gehalten)
 */
const SignaturePage = ({ styles, theme, partyLabels, companyProfile, parties, qrCode, documentId, currentDate }) => {
  const e = React.createElement;

  return e(Page, { size: 'A4', style: styles.page },
    e(View, { style: styles.signaturePage },
      // Header
      e(View, { style: styles.signatureHeader },
        e(Text, { style: styles.signatureTitle }, 'Unterschriften')
      ),

      // Zwei Spalten für Unterschriften
      e(View, { style: styles.signatureColumns },
        // Partei A
        e(View, { style: styles.signatureColumn },
          e(Text, { style: styles.signatureLabel }, partyLabels.partyA),

          e(View, { style: styles.signatureField },
            e(View, { style: styles.signatureLine }),
            e(Text, { style: styles.signatureHint }, 'Ort, Datum')
          ),

          e(View, { style: styles.signatureField },
            e(View, { style: styles.signatureLine }),
            e(Text, { style: styles.signatureHint }, 'Unterschrift')
          ),

          e(Text, { style: styles.signatureName },
            companyProfile?.companyName || parties?.seller || parties?.partyA || partyLabels.partyA
          ),
          companyProfile?.companyName && e(Text, { style: styles.signatureRole }, '(Geschäftsführung)')
        ),

        // Partei B
        e(View, { style: styles.signatureColumn },
          e(Text, { style: styles.signatureLabel }, partyLabels.partyB),

          e(View, { style: styles.signatureField },
            e(View, { style: styles.signatureLine }),
            e(Text, { style: styles.signatureHint }, 'Ort, Datum')
          ),

          e(View, { style: styles.signatureField },
            e(View, { style: styles.signatureLine }),
            e(Text, { style: styles.signatureHint }, 'Unterschrift')
          ),

          e(Text, { style: styles.signatureName },
            parties?.buyer || parties?.partyB || parties?.buyerName || partyLabels.partyB
          ),
          e(Text, { style: styles.signatureRole }, '(Name in Druckschrift)')
        )
      ),

      // Verifizierung & QR-Code
      e(View, { style: styles.verificationContainer },
        qrCode && e(Image, { src: qrCode, style: styles.qrCode }),
        e(Text, { style: styles.verificationText }, 'Digitale Verifizierung'),
        e(Text, { style: styles.verificationText }, `ID: ${documentId?.substring(0, 20) || 'N/A'}`)
      ),

      // Anlagen
      e(View, { style: styles.attachmentsBox },
        e(Text, { style: styles.attachmentsTitle }, 'Anlagen'),
        e(Text, { style: styles.attachmentsText }, 'Diesem Vertrag sind keine Anlagen beigefügt.')
      )
    )
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// HAUPT-EXPORT FUNKTION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generiert ein professionelles PDF mit React-PDF
 *
 * @param {string} contractText - Der Vertragstext
 * @param {Object} companyProfile - Firmenprofil mit Logo, Adresse etc.
 * @param {string} contractType - Typ des Vertrags (Kaufvertrag, Mietvertrag, etc.)
 * @param {Object} parties - Informationen zu den Vertragsparteien
 * @param {boolean} isDraft - Ob es ein Entwurf ist (zeigt Wasserzeichen)
 * @param {string} designVariant - Design-Variante ('executive', 'modern', 'minimal', 'elegant', 'corporate')
 * @returns {Promise<Buffer>} - PDF als Buffer
 */
const generatePDFv2 = async (contractText, companyProfile, contractType, parties = {}, isDraft = false, designVariant = 'executive') => {
  console.log('🎨 [V2 React-PDF] Starte PDF-Generierung...');
  console.log('📄 Vertragstyp:', contractType);
  console.log('🏢 Firma:', companyProfile?.companyName);
  console.log('🎭 Design:', designVariant);
  console.log('👥 Parteien:', JSON.stringify(parties).substring(0, 100));

  const e = React.createElement;

  // Theme auswählen (fallback zu executive)
  const theme = DESIGN_THEMES[designVariant] || DESIGN_THEMES.executive;
  console.log('🎨 Verwende Theme:', theme.name);

  // Styles basierend auf Theme erstellen
  const styles = createStyles(theme);

  // Dokument-ID generieren
  const documentId = `DOC-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

  // QR-Code generieren
  const qrCode = await generateQRCode(`https://contract-ai.de/verify/${documentId}`);

  // Parteien-Labels basierend auf Vertragstyp
  const partyLabels = getPartyLabels(contractType);

  // Vertragstext parsen
  const sections = parseContractText(contractText);
  console.log(`📊 ${sections.length} Abschnitte gefunden`);

  // Datum formatieren
  const currentDate = new Date().toLocaleDateString('de-DE', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });

  // Dokument erstellen
  const ContractDocument = e(Document, null,
    // Seite 1: Deckblatt
    e(CoverPage, {
      styles,
      theme,
      companyProfile,
      contractType,
      parties,
      partyLabels,
      currentDate,
      documentId,
      isDraft
    }),

    // Seiten 2-N: Vertragsinhalt
    e(ContentPage, {
      styles,
      theme,
      sections,
      companyProfile,
      contractType
    }),

    // Letzte Seite: Unterschriften
    e(SignaturePage, {
      styles,
      theme,
      partyLabels,
      companyProfile,
      parties,
      qrCode,
      documentId,
      currentDate
    })
  );

  // PDF rendern
  console.log('⏳ Rendere PDF...');
  const pdfBuffer = await ReactPDF.renderToBuffer(ContractDocument);
  console.log(`✅ [V2 React-PDF] PDF generiert: ${(pdfBuffer.length / 1024).toFixed(1)} KB`);

  return pdfBuffer;
};

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

module.exports = {
  generatePDFv2,
  getPartyLabels,
  parseContractText,
  DESIGN_THEMES
};
