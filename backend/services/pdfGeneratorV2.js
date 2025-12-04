// 📄 pdfGeneratorV2.js - React-PDF basierter Vertragsgenerator
// Verwendet @react-pdf/renderer für pixel-perfekte PDFs

const ReactPDF = require('@react-pdf/renderer');
const { Document, Page, Text, View, StyleSheet, Font, Image } = ReactPDF;
const React = require('react');
const QRCode = require('qrcode');
const path = require('path');

// ═══════════════════════════════════════════════════════════════════════════
// FONT REGISTRATION - Professionelle Schriftarten
// ═══════════════════════════════════════════════════════════════════════════

// Standard-Fonts registrieren (React-PDF hat diese eingebaut)
Font.register({
  family: 'Times-Roman',
  fonts: [
    { src: 'Times-Roman' },
    { src: 'Times-Bold', fontWeight: 'bold' },
    { src: 'Times-Italic', fontStyle: 'italic' },
    { src: 'Times-BoldItalic', fontWeight: 'bold', fontStyle: 'italic' }
  ]
});

// ═══════════════════════════════════════════════════════════════════════════
// STYLES - Professionelles Vertrags-Design
// ═══════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  // Seiten-Layout
  page: {
    fontFamily: 'Times-Roman',
    fontSize: 11,
    paddingTop: 25,
    paddingBottom: 25,
    paddingHorizontal: 25,
    lineHeight: 1.5,
    color: '#1a1a1a',
  },

  // ══════════════════════════════════════════════════════════════
  // DECKBLATT STYLES
  // ══════════════════════════════════════════════════════════════

  coverPage: {
    flex: 1,
    position: 'relative',
  },

  // Briefkopf
  letterhead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 40,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },

  logo: {
    width: 60,
    height: 60,
    objectFit: 'contain',
  },

  companyInfo: {
    textAlign: 'right',
    fontSize: 9,
    color: '#666',
  },

  companyName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 3,
  },

  // Vertragstyp-Titel
  contractTypeContainer: {
    marginTop: 60,
    marginBottom: 40,
    alignItems: 'center',
  },

  contractType: {
    fontSize: 22,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 3,
    color: '#1a1a1a',
    marginBottom: 10,
  },

  decorativeLine: {
    width: 80,
    height: 2,
    backgroundColor: '#333',
    marginVertical: 10,
  },

  contractDate: {
    fontSize: 11,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 5,
  },

  // Parteien-Block
  partiesContainer: {
    marginTop: 50,
    marginBottom: 40,
  },

  partiesLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 15,
  },

  partyBlock: {
    marginBottom: 20,
    paddingLeft: 15,
    borderLeftWidth: 2,
    borderLeftColor: '#ddd',
  },

  partyName: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 3,
  },

  partyAddress: {
    fontSize: 10,
    color: '#444',
    marginBottom: 2,
  },

  partyRole: {
    fontSize: 10,
    fontStyle: 'italic',
    color: '#666',
    marginTop: 5,
  },

  // Footer für Deckblatt
  coverFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 8,
    color: '#999',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },

  // ══════════════════════════════════════════════════════════════
  // INHALTS-SEITEN STYLES
  // ══════════════════════════════════════════════════════════════

  contentPage: {
    flex: 1,
  },

  // Präambel
  preambleContainer: {
    marginVertical: 20,
    alignItems: 'center',
  },

  preambleTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 10,
  },

  preambleLine: {
    width: 40,
    height: 1,
    backgroundColor: '#999',
  },

  preambleText: {
    marginTop: 15,
    fontSize: 10,
    textAlign: 'center',
    color: '#444',
    fontStyle: 'italic',
    maxWidth: '80%',
  },

  // Paragraph-Überschriften (§)
  sectionHeader: {
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginTop: 25,
    marginBottom: 10,
    letterSpacing: 0.5,
  },

  // Nummerierte Absätze
  numberedParagraph: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },

  paragraphNumber: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    marginTop: 2,
  },

  paragraphNumberText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#333',
  },

  paragraphText: {
    flex: 1,
    fontSize: 11,
    textAlign: 'justify',
    lineHeight: 1.55,
  },

  // Buchstaben-Aufzählung (a, b, c)
  letterList: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
    marginLeft: 30,
  },

  letterCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#666',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginTop: 2,
  },

  letterText: {
    fontSize: 8,
    color: '#444',
  },

  letterContent: {
    flex: 1,
    fontSize: 10,
    textAlign: 'justify',
  },

  // Normale Absätze
  paragraph: {
    fontSize: 11,
    textAlign: 'justify',
    marginBottom: 8,
    lineHeight: 1.55,
  },

  // Spiegelstriche
  bulletPoint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
    marginLeft: 30,
  },

  bullet: {
    fontSize: 12,
    color: '#333',
    marginRight: 8,
  },

  bulletText: {
    flex: 1,
    fontSize: 10,
  },

  // Seiten-Footer
  pageFooter: {
    position: 'absolute',
    bottom: 15,
    left: 25,
    right: 25,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 8,
    color: '#888',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },

  // ══════════════════════════════════════════════════════════════
  // UNTERSCHRIFTEN-SEITE STYLES
  // ══════════════════════════════════════════════════════════════

  signaturePage: {
    flex: 1,
  },

  signatureHeader: {
    backgroundColor: '#f5f0e6',
    marginHorizontal: -25,
    marginTop: -25,
    paddingVertical: 30,
    paddingHorizontal: 25,
    alignItems: 'center',
    marginBottom: 30,
  },

  signatureTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  signatureColumns: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  signatureColumn: {
    width: '45%',
  },

  signatureLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginBottom: 15,
  },

  signatureField: {
    marginBottom: 15,
  },

  signatureLine: {
    borderBottomWidth: 1,
    borderBottomColor: '#666',
    height: 25,
    marginBottom: 5,
  },

  signatureLineThick: {
    borderBottomWidth: 2,
    borderBottomColor: '#333',
    height: 30,
    marginBottom: 5,
  },

  signatureHint: {
    fontSize: 8,
    color: '#666',
  },

  // QR-Code Bereich
  qrContainer: {
    marginTop: 40,
    alignItems: 'center',
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },

  qrCode: {
    width: 60,
    height: 60,
    marginBottom: 8,
  },

  qrText: {
    fontSize: 8,
    color: '#888',
  },

  // Anlagen
  attachmentsBox: {
    marginTop: 30,
    padding: 15,
    backgroundColor: '#faf8f5',
    borderWidth: 1,
    borderColor: '#e5e0d5',
  },

  attachmentsTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    fontStyle: 'italic',
    marginBottom: 5,
  },

  attachmentsText: {
    fontSize: 10,
    color: '#666',
  },

  // Wasserzeichen (Entwurf)
  watermark: {
    position: 'absolute',
    top: '40%',
    left: '20%',
    fontSize: 60,
    color: '#f0f0f0',
    transform: 'rotate(-45deg)',
    opacity: 0.5,
  },
});

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generiert QR-Code als Data-URL
 */
const generateQRCode = async (text) => {
  try {
    return await QRCode.toDataURL(text, {
      width: 120,
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
      currentSection = { type: 'preamble', title: 'PRÄAMBEL', content: [] };
      sections.push(currentSection);
      continue;
    }

    // Paragraph (§)
    if (trimmed.startsWith('§')) {
      currentSection = { type: 'section', title: trimmed.replace(/\*\*/g, ''), content: [] };
      sections.push(currentSection);
      continue;
    }

    // Nummerierte Absätze
    if (/^\(?\d+\)?\.?\s/.test(trimmed)) {
      const text = trimmed.replace(/^\(?\d+\)?\.?\s*/, '').replace(/\*\*/g, '');
      if (currentSection) {
        currentSection.content.push({ type: 'numbered', text });
      }
      continue;
    }

    // Buchstaben-Aufzählung
    if (/^[a-z]\)/.test(trimmed)) {
      const letter = trimmed.charAt(0);
      const text = trimmed.substring(2).trim().replace(/\*\*/g, '');
      if (currentSection) {
        currentSection.content.push({ type: 'letter', letter, text });
      }
      continue;
    }

    // Spiegelstriche
    if (trimmed.startsWith('-') || trimmed.startsWith('•')) {
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

// ═══════════════════════════════════════════════════════════════════════════
// REACT-PDF KOMPONENTEN
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Deckblatt-Komponente
 */
const CoverPage = ({ companyProfile, contractType, parties, partyLabels, currentDate, documentId, isDraft }) => {
  const e = React.createElement;

  return e(Page, { size: 'A4', style: styles.page },
    // Wasserzeichen wenn Entwurf
    isDraft && e(Text, { style: styles.watermark }, 'ENTWURF'),

    e(View, { style: styles.coverPage },
      // Briefkopf
      e(View, { style: styles.letterhead },
        // Logo (falls vorhanden)
        companyProfile?.logoUrl
          ? e(Image, { src: companyProfile.logoUrl, style: styles.logo })
          : e(View, { style: { width: 60 } }),

        // Firmeninfo rechts
        e(View, { style: styles.companyInfo },
          e(Text, { style: styles.companyName }, companyProfile?.companyName || 'Unternehmen'),
          companyProfile?.street && e(Text, null, companyProfile.street),
          companyProfile?.zip && e(Text, null, `${companyProfile.zip} ${companyProfile.city || ''}`),
          companyProfile?.phone && e(Text, null, `Tel: ${companyProfile.phone}`),
          companyProfile?.email && e(Text, null, companyProfile.email)
        )
      ),

      // Vertragstyp
      e(View, { style: styles.contractTypeContainer },
        e(View, { style: styles.decorativeLine }),
        e(Text, { style: styles.contractType }, contractType || 'VERTRAG'),
        e(View, { style: styles.decorativeLine }),
        e(Text, { style: styles.contractDate }, `geschlossen am ${currentDate}`)
      ),

      // Parteien
      e(View, { style: styles.partiesContainer },
        e(Text, { style: styles.partiesLabel }, 'zwischen'),

        // Partei A
        e(View, { style: styles.partyBlock },
          e(Text, { style: styles.partyName }, companyProfile?.companyName || 'Vertragspartei A'),
          companyProfile?.street && e(Text, { style: styles.partyAddress }, companyProfile.street),
          companyProfile?.zip && e(Text, { style: styles.partyAddress }, `${companyProfile.zip} ${companyProfile.city || ''}`),
          e(Text, { style: styles.partyRole }, `– nachfolgend "${partyLabels.partyA}" genannt –`)
        ),

        e(Text, { style: styles.partiesLabel }, 'und'),

        // Partei B
        e(View, { style: styles.partyBlock },
          e(Text, { style: styles.partyName }, parties?.buyer || parties?.partyB || 'Vertragspartei B'),
          e(Text, { style: styles.partyAddress }, parties?.buyerAddress || parties?.partyBAddress || ''),
          e(Text, { style: styles.partyAddress }, parties?.buyerCity || parties?.partyBCity || ''),
          e(Text, { style: styles.partyRole }, `– nachfolgend "${partyLabels.partyB}" genannt –`)
        )
      ),

      // Footer
      e(View, { style: styles.coverFooter },
        e(Text, null, `DOK-ID: ${documentId?.substring(0, 20) || 'N/A'}`),
        e(Text, null, 'Seite 1'),
        e(Text, null, new Date().toLocaleDateString('de-DE'))
      )
    )
  );
};

/**
 * Inhalts-Seite Komponente
 */
const ContentPage = ({ sections, pageNumber, companyProfile, contractType }) => {
  const e = React.createElement;
  let numberedCounter = 0;

  const renderContent = (item, index) => {
    switch (item.type) {
      case 'numbered':
        numberedCounter++;
        return e(View, { key: index, style: styles.numberedParagraph },
          e(View, { style: styles.paragraphNumber },
            e(Text, { style: styles.paragraphNumberText }, numberedCounter.toString())
          ),
          e(Text, { style: styles.paragraphText }, item.text)
        );

      case 'letter':
        return e(View, { key: index, style: styles.letterList },
          e(View, { style: styles.letterCircle },
            e(Text, { style: styles.letterText }, item.letter)
          ),
          e(Text, { style: styles.letterContent }, item.text)
        );

      case 'bullet':
        return e(View, { key: index, style: styles.bulletPoint },
          e(Text, { style: styles.bullet }, '•'),
          e(Text, { style: styles.bulletText }, item.text)
        );

      default:
        return e(Text, { key: index, style: styles.paragraph }, item.text);
    }
  };

  const renderSection = (section, index) => {
    numberedCounter = 0; // Reset für jeden §

    if (section.type === 'preamble') {
      return e(View, { key: index, style: styles.preambleContainer },
        e(View, { style: { flexDirection: 'row', alignItems: 'center' } },
          e(View, { style: styles.preambleLine }),
          e(Text, { style: [styles.preambleTitle, { marginHorizontal: 15 }] }, 'PRÄAMBEL'),
          e(View, { style: styles.preambleLine })
        ),
        section.content.map((item, i) =>
          e(Text, { key: i, style: styles.preambleText }, item.text)
        )
      );
    }

    return e(View, { key: index, wrap: false },
      e(Text, { style: styles.sectionHeader }, section.title),
      ...section.content.map(renderContent)
    );
  };

  return e(Page, { size: 'A4', style: styles.page },
    e(View, { style: styles.contentPage },
      ...sections.map(renderSection)
    ),
    e(View, { style: styles.pageFooter, fixed: true },
      e(Text, null, (contractType || 'Vertrag').toUpperCase()),
      e(Text, { render: ({ pageNumber }) => `Seite ${pageNumber}` }),
      e(Text, null, `© ${new Date().getFullYear()} ${companyProfile?.companyName || 'Contract AI'}`)
    )
  );
};

/**
 * Unterschriften-Seite Komponente
 */
const SignaturePage = ({ partyLabels, companyProfile, parties, qrCode, documentId }) => {
  const e = React.createElement;

  return e(Page, { size: 'A4', style: styles.page },
    e(View, { style: styles.signaturePage },
      // Header
      e(View, { style: styles.signatureHeader },
        e(Text, { style: styles.signatureTitle }, 'Unterschriften der Vertragsparteien')
      ),

      // Zwei Spalten für Unterschriften
      e(View, { style: styles.signatureColumns },
        // Partei A
        e(View, { style: styles.signatureColumn },
          e(Text, { style: styles.signatureLabel }, `${partyLabels.partyA} / Partei A`),

          e(View, { style: styles.signatureField },
            e(View, { style: styles.signatureLine }),
            e(Text, { style: styles.signatureHint }, 'Ort, Datum')
          ),

          e(View, { style: styles.signatureField },
            e(View, { style: styles.signatureLineThick }),
            e(Text, { style: styles.signatureHint }, '(Unterschrift / Stempel)')
          ),

          e(Text, { style: { fontSize: 10, fontWeight: 'bold', marginTop: 10 } },
            companyProfile?.companyName || partyLabels.partyA
          ),
          e(Text, { style: styles.signatureHint }, '(Geschäftsführung)')
        ),

        // Partei B
        e(View, { style: styles.signatureColumn },
          e(Text, { style: styles.signatureLabel }, `${partyLabels.partyB} / Partei B`),

          e(View, { style: styles.signatureField },
            e(View, { style: styles.signatureLine }),
            e(Text, { style: styles.signatureHint }, 'Ort, Datum')
          ),

          e(View, { style: styles.signatureField },
            e(View, { style: styles.signatureLineThick }),
            e(Text, { style: styles.signatureHint }, '(Unterschrift)')
          ),

          e(Text, { style: { fontSize: 10, fontWeight: 'bold', marginTop: 10 } },
            parties?.buyer || parties?.partyB || partyLabels.partyB
          ),
          e(Text, { style: styles.signatureHint }, '(Name in Druckschrift)')
        )
      ),

      // QR-Code
      e(View, { style: styles.qrContainer },
        qrCode && e(Image, { src: qrCode, style: styles.qrCode }),
        e(Text, { style: styles.qrText }, 'Digitale Verifizierung'),
        e(Text, { style: [styles.qrText, { marginTop: 3 }] }, `ID: ${documentId?.substring(0, 20) || 'N/A'}`)
      ),

      // Anlagen
      e(View, { style: styles.attachmentsBox },
        e(Text, { style: styles.attachmentsTitle }, 'ANLAGEN'),
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
 * @returns {Promise<Buffer>} - PDF als Buffer
 */
const generatePDFv2 = async (contractText, companyProfile, contractType, parties = {}, isDraft = false) => {
  console.log('🎨 [V2 React-PDF] Starte PDF-Generierung...');
  console.log('📄 Vertragstyp:', contractType);
  console.log('🏢 Firma:', companyProfile?.companyName);

  const e = React.createElement;

  // Dokument-ID generieren
  const documentId = `DOC-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

  // QR-Code generieren
  const qrCode = await generateQRCode(`https://contract-ai.de/verify/${documentId}`);

  // Parteien-Labels
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
      sections,
      companyProfile,
      contractType
    }),

    // Letzte Seite: Unterschriften
    e(SignaturePage, {
      partyLabels,
      companyProfile,
      parties,
      qrCode,
      documentId
    })
  );

  // PDF rendern
  console.log('⏳ Rendere PDF...');
  const pdfBuffer = await ReactPDF.renderToBuffer(ContractDocument);
  console.log(`✅ [V2 React-PDF] PDF generiert: ${(pdfBuffer.length / 1024).toFixed(1)} KB`);

  return pdfBuffer;
};

module.exports = {
  generatePDFv2,
  getPartyLabels,
  parseContractText
};
