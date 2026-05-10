// 📄 pdfGeneratorV2.js - React-PDF basierter Vertragsgenerator
// Professioneller PDF-Generator mit 5 EINZIGARTIGEN Design-Varianten
// Version 2.1 - Mit unterschiedlichen Layouts pro Design

const ReactPDF = require('@react-pdf/renderer');
const { Document, Page, Text, View, StyleSheet, Font, Image } = ReactPDF;
const React = require('react');
const QRCode = require('qrcode');
const axios = require('axios');

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
// DESIGN THEMES - 12 EINZIGARTIGE Varianten mit unterschiedlichen LAYOUTS
// ═══════════════════════════════════════════════════════════════════════════

const DESIGN_THEMES = {
  // ═══════════════════════════════════════════════════════════════════════════
  // EXECUTIVE - Klassisch, seriös, horizontale Linien, zentriert
  // ═══════════════════════════════════════════════════════════════════════════
  executive: {
    name: 'Executive',
    fontFamily: 'Times-Roman',
    layout: 'classic-centered', // Zentriertes klassisches Layout
    colors: {
      primary: '#1a1a1a',
      secondary: '#333333',
      accent: '#4a4a4a',
      text: '#1a1a1a',
      textLight: '#555555',
      textMuted: '#777777',
      border: '#cccccc',
      background: '#ffffff',
      headerBg: '#f5f5f5',
      line: '#1a1a1a',
    },
    features: {
      showHeaderLine: true,
      showFooterLine: true,
      logoPosition: 'left',
      titleStyle: 'underlined',
      partyStyle: 'boxed',
      sectionStyle: 'numbered-bold',
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // MODERN - Brand-Blau Sidebar, modern asymmetrisch (Stripe-Style)
  // ═══════════════════════════════════════════════════════════════════════════
  modern: {
    name: 'Modern',
    fontFamily: 'Helvetica',
    layout: 'sidebar-accent', // Farbige Sidebar links
    colors: {
      primary: '#2E6CF6',
      secondary: '#1E53D8',
      accent: '#2E6CF6',
      text: '#1F2937',
      textLight: '#4B5563',
      textMuted: '#9CA3AF',
      border: '#E5E7EB',
      background: '#ffffff',
      headerBg: '#2E6CF6',
      line: '#2E6CF6',
    },
    features: {
      showSidebar: true,
      sidebarWidth: 8,
      logoPosition: 'right',
      titleStyle: 'modern-caps',
      partyStyle: 'cards',
      sectionStyle: 'colored-header',
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // MINIMAL - Ultra-clean, viel Weißraum, keine Rahmen
  // ═══════════════════════════════════════════════════════════════════════════
  minimal: {
    name: 'Minimal',
    fontFamily: 'Helvetica',
    layout: 'whitespace-focus', // Fokus auf Weißraum
    colors: {
      primary: '#2d2d2d',
      secondary: '#4a4a4a',
      accent: '#2d2d2d',
      text: '#2d2d2d',
      textLight: '#666666',
      textMuted: '#999999',
      border: '#e5e5e5',
      background: '#ffffff',
      headerBg: '#ffffff',
      line: '#e5e5e5',
    },
    features: {
      showHeaderLine: false,
      showFooterLine: false,
      logoPosition: 'center',
      titleStyle: 'light-spaced',
      partyStyle: 'minimal-text',
      sectionStyle: 'subtle-divider',
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // BOUTIQUE EDITORIAL - Cream-Bordeaux, redaktionell, Boutique-Kanzlei-Stil
  // ═══════════════════════════════════════════════════════════════════════════
  elegant: {
    name: 'Boutique Editorial',
    fontFamily: 'Times-Roman',
    layout: 'ornamental',
    colors: {
      primary: '#1A1A1A',
      secondary: '#6B1F32',
      accent: '#6B1F32',
      text: '#1A1A1A',
      textLight: '#4B5563',
      textMuted: '#9CA3AF',
      border: '#E5E7EB',
      background: '#FFFDF8',
      headerBg: '#FAF8F3',
      line: '#6B1F32',
    },
    features: {
      showOrnaments: true,
      logoPosition: 'center',
      titleStyle: 'elegant-framed',
      partyStyle: 'elegant-script',
      sectionStyle: 'gold-accent',
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // BIG LAW - Charcoal + Forest Green, Big-Law-Kanzlei-Niveau
  // ═══════════════════════════════════════════════════════════════════════════
  corporate: {
    name: 'Big Law',
    fontFamily: 'Helvetica',
    layout: 'structured-boxes',
    colors: {
      primary: '#2D2D30',
      secondary: '#1B4332',
      accent: '#1B4332',
      text: '#1F2937',
      textLight: '#4B5563',
      textMuted: '#9CA3AF',
      border: '#D1D5DB',
      background: '#ffffff',
      headerBg: '#2D2D30',
      line: '#2D2D30',
    },
    features: {
      showHeaderBar: true,
      logoPosition: 'left',
      titleStyle: 'white-on-dark',
      partyStyle: 'structured-table',
      sectionStyle: 'boxed-header',
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PROFESSIONAL - Dunkelgrün, vertrauenswürdig, seriös
  // ═══════════════════════════════════════════════════════════════════════════
  professional: {
    name: 'Professional',
    fontFamily: 'Times-Roman',
    layout: 'classic-centered',
    colors: {
      primary: '#1B4332',
      secondary: '#2D6A4F',
      accent: '#40916C',
      text: '#1B4332',
      textLight: '#3D5A4C',
      textMuted: '#6B8F7A',
      border: '#B7E4C7',
      background: '#ffffff',
      headerBg: '#F1F8F5',
      line: '#1B4332',
    },
    features: {
      showHeaderLine: true,
      showFooterLine: true,
      logoPosition: 'left',
      titleStyle: 'underlined',
      partyStyle: 'boxed',
      sectionStyle: 'numbered-bold',
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // NORDIC MODERN - Schwarz + Cognac, skandinavisch reduziert, warm
  // ═══════════════════════════════════════════════════════════════════════════
  startup: {
    name: 'Nordic Modern',
    fontFamily: 'Helvetica',
    layout: 'sidebar-accent',
    colors: {
      primary: '#0F0F0F',
      secondary: '#B5651D',
      accent: '#B5651D',
      text: '#1F2937',
      textLight: '#4B5563',
      textMuted: '#9CA3AF',
      border: '#E5E7EB',
      background: '#ffffff',
      headerBg: '#0F0F0F',
      line: '#0F0F0F',
    },
    features: {
      showSidebar: true,
      sidebarWidth: 8,
      logoPosition: 'right',
      titleStyle: 'modern-caps',
      partyStyle: 'cards',
      sectionStyle: 'colored-header',
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // LEGAL - Weiches Burgund, juristisch, traditionell
  // ═══════════════════════════════════════════════════════════════════════════
  legal: {
    name: 'Legal',
    fontFamily: 'Times-Roman',
    layout: 'ornamental',
    colors: {
      primary: '#7A1F2E',
      secondary: '#5C1622',
      accent: '#7A1F2E',
      text: '#1F2937',
      textLight: '#4B5563',
      textMuted: '#9CA3AF',
      border: '#E5E7EB',
      background: '#FFFDF8',
      headerBg: '#FAF6F4',
      line: '#7A1F2E',
    },
    features: {
      showOrnaments: true,
      logoPosition: 'center',
      titleStyle: 'elegant-framed',
      partyStyle: 'elegant-script',
      sectionStyle: 'gold-accent',
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SAAS PREMIUM - Anthrazit + Sky-Blue, Linear/Vercel-Niveau, modern-tech
  // ═══════════════════════════════════════════════════════════════════════════
  tech: {
    name: 'SaaS Premium',
    fontFamily: 'Helvetica',
    layout: 'sidebar-accent',
    colors: {
      primary: '#1F2937',
      secondary: '#0EA5E9',
      accent: '#0EA5E9',
      text: '#1F2937',
      textLight: '#4B5563',
      textMuted: '#9CA3AF',
      border: '#E5E7EB',
      background: '#ffffff',
      headerBg: '#1F2937',
      line: '#1F2937',
    },
    features: {
      showSidebar: true,
      sidebarWidth: 8,
      logoPosition: 'right',
      titleStyle: 'modern-caps',
      partyStyle: 'cards',
      sectionStyle: 'colored-header',
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // FINANCE - Navy/Gold, Premium, Banking
  // ═══════════════════════════════════════════════════════════════════════════
  finance: {
    name: 'Finance',
    fontFamily: 'Times-Roman',
    layout: 'ornamental',
    colors: {
      primary: '#0F172A',
      secondary: '#1E293B',
      accent: '#D4AF37',
      text: '#0F172A',
      textLight: '#334155',
      textMuted: '#64748B',
      border: '#D4AF37',
      background: '#FAFAF9',
      headerBg: '#F5F5F4',
      line: '#D4AF37',
    },
    features: {
      showOrnaments: true,
      logoPosition: 'center',
      titleStyle: 'elegant-framed',
      partyStyle: 'elegant-script',
      sectionStyle: 'gold-accent',
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // EDITORIAL - Schwarz + Charcoal-Akzent, redaktionell-monochrom (NYT-Style)
  // ═══════════════════════════════════════════════════════════════════════════
  creative: {
    name: 'Editorial',
    fontFamily: 'Helvetica',
    layout: 'sidebar-accent',
    colors: {
      primary: '#1A1A1A',
      secondary: '#3F3F46',
      accent: '#3F3F46',
      text: '#1A1A1A',
      textLight: '#4B5563',
      textMuted: '#9CA3AF',
      border: '#E5E7EB',
      background: '#ffffff',
      headerBg: '#1A1A1A',
      line: '#1A1A1A',
    },
    features: {
      showSidebar: true,
      sidebarWidth: 8,
      logoPosition: 'right',
      titleStyle: 'modern-caps',
      partyStyle: 'cards',
      sectionStyle: 'colored-header',
    }
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Konvertiert eine URL zu Base64 Data-URL für React-PDF
 */
const urlToBase64 = async (url) => {
  try {
    if (!url) return null;

    // Wenn bereits Base64, direkt zurückgeben
    if (url.startsWith('data:')) {
      return url;
    }

    console.log('🔄 Konvertiere Logo-URL zu Base64...');
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 10000
    });

    const contentType = response.headers['content-type'] || 'image/png';
    const base64 = Buffer.from(response.data).toString('base64');
    const dataUrl = `data:${contentType};base64,${base64}`;

    console.log('✅ Logo konvertiert:', `${(base64.length / 1024).toFixed(1)} KB`);
    return dataUrl;
  } catch (error) {
    console.error('⚠️ Logo-Konvertierung fehlgeschlagen:', error.message);
    return null;
  }
};

/**
 * Generiert QR-Code als Data-URL
 */
const generateQRCode = async (text) => {
  try {
    return await QRCode.toDataURL(text, {
      width: 80,
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
    const trimmed = line.trim().replace(/\*\*/g, '');
    if (!trimmed) continue;

    // Überspringe Parteien-Bereich im Text (wird separat gerendert)
    if (trimmed.toLowerCase() === 'zwischen') {
      skipParties = true;
      continue;
    }
    if (skipParties && (trimmed.toUpperCase() === 'PRÄAMBEL' || trimmed.startsWith('§'))) {
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

// ═══════════════════════════════════════════════════════════════════════════
// DESIGN-SPEZIFISCHE STYLE-GENERATOREN
// ═══════════════════════════════════════════════════════════════════════════

const createExecutiveStyles = (theme) => {
  const c = theme.colors;
  return StyleSheet.create({
    page: { fontFamily: theme.fontFamily, fontSize: 11, padding: 50, color: c.text },
    // Deckblatt - Klassisch zentriert (lineHeight hier statt auf page wegen render prop Bug)
    // KOMPAKTERE MARGINS um Overflow zu verhindern!
    coverPage: { paddingBottom: 40, lineHeight: 1.4 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', borderBottomWidth: 2, borderBottomColor: c.line, paddingBottom: 12, marginBottom: 20 },
    logo: { width: 55, height: 55, objectFit: 'contain' },
    companyInfo: { textAlign: 'right', fontSize: 9, color: c.textLight },
    companyName: { fontSize: 11, fontWeight: 'bold', color: c.primary, marginBottom: 2 },
    titleContainer: { alignItems: 'center', marginTop: 50, marginBottom: 35 },
    titleLine: { width: 100, height: 2, backgroundColor: c.line, marginBottom: 12 },
    title: { fontSize: 24, fontWeight: 'bold', letterSpacing: 3, color: c.primary, textTransform: 'uppercase' },
    titleLineBottom: { width: 100, height: 2, backgroundColor: c.line, marginTop: 12 },
    subtitle: { fontSize: 10, color: c.textLight, marginTop: 15, fontStyle: 'italic' },
    partiesContainer: { marginTop: 25 },
    partiesLabel: { fontSize: 10, color: c.textLight, textAlign: 'center', marginVertical: 10 },
    partyBox: { borderWidth: 1, borderColor: c.border, padding: 12, marginHorizontal: 35, marginBottom: 8, backgroundColor: c.headerBg },
    partyName: { fontSize: 11, fontWeight: 'bold', color: c.primary, marginBottom: 2 },
    partyAddress: { fontSize: 9, color: c.textLight },
    partyRole: { fontSize: 8, fontStyle: 'italic', color: c.textMuted, marginTop: 6 },
    footer: { position: 'absolute', bottom: 30, left: 50, right: 50, flexDirection: 'row', justifyContent: 'space-between', fontSize: 8, color: c.textMuted, borderTopWidth: 1, borderTopColor: c.border, paddingTop: 10 },
    // Content Styles - KEIN flex: 1, das blockiert fixed elements! (lineHeight hier statt auf page)
    contentPage: { paddingBottom: 0, lineHeight: 1.5 },
    preambleContainer: { marginBottom: 20, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: c.border },
    preambleTitle: { fontSize: 12, fontWeight: 'bold', textAlign: 'center', marginBottom: 10, color: c.secondary },
    preambleText: { fontSize: 10, color: c.textLight, textAlign: 'justify', marginBottom: 5 },
    sectionHeader: { fontSize: 12, fontWeight: 'bold', color: c.primary, marginTop: 20, marginBottom: 10, paddingBottom: 5, borderBottomWidth: 1, borderBottomColor: c.border },
    numberedParagraph: { flexDirection: 'row', marginBottom: 8 },
    paragraphNumber: { width: 25, fontSize: 10, fontWeight: 'bold', color: c.primary },
    paragraphText: { flex: 1, fontSize: 10, textAlign: 'justify', color: c.text },
    letterItem: { flexDirection: 'row', marginLeft: 25, marginBottom: 5 },
    letterLabel: { width: 20, fontSize: 10, color: c.secondary },
    letterContent: { flex: 1, fontSize: 10, color: c.text },
    bulletItem: { flexDirection: 'row', marginLeft: 25, marginBottom: 5 },
    bulletPoint: { width: 15, fontSize: 10, color: c.secondary },
    bulletText: { flex: 1, fontSize: 10, color: c.text },
    paragraph: { fontSize: 10, marginBottom: 8, textAlign: 'justify', color: c.text },
    pageFooter: { position: 'absolute', bottom: 30, left: 50, right: 50, flexDirection: 'row', justifyContent: 'space-between', fontSize: 8, color: c.textMuted, borderTopWidth: 1, borderTopColor: c.border, paddingTop: 8 },
    // Signature Styles (lineHeight hier statt auf page)
    signaturePage: { paddingBottom: 60, lineHeight: 1.5 },
    signatureTitle: { fontSize: 16, fontWeight: 'bold', textAlign: 'center', marginBottom: 40, color: c.primary, borderBottomWidth: 2, borderBottomColor: c.line, paddingBottom: 10 },
    signatureColumns: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 30 },
    signatureColumn: { width: '45%' },
    signatureLabel: { fontSize: 10, fontWeight: 'bold', color: c.primary, marginBottom: 30 },
    signatureLine: { borderBottomWidth: 1, borderBottomColor: c.text, marginBottom: 5 },
    signatureHint: { fontSize: 8, color: c.textMuted },
    signatureName: { fontSize: 10, fontWeight: 'bold', color: c.text, marginTop: 15 },
    signatureRole: { fontSize: 8, color: c.textMuted },
    verificationContainer: { alignItems: 'center', marginTop: 50, padding: 15, borderTopWidth: 1, borderTopColor: c.border },
    qrCode: { width: 60, height: 60, marginBottom: 5 },
    verificationText: { fontSize: 7, color: c.textMuted },
    attachmentsBox: { marginTop: 30, padding: 10, borderWidth: 1, borderColor: c.border },
    attachmentsTitle: { fontSize: 9, fontWeight: 'bold', color: c.textLight, marginBottom: 3 },
    attachmentsText: { fontSize: 8, color: c.textMuted },
    watermark: { position: 'absolute', top: '40%', left: '20%', fontSize: 60, color: '#e0e0e0', transform: 'rotate(-45deg)', opacity: 0.3 },
  });
};

const createModernStyles = (theme) => {
  const c = theme.colors;
  return StyleSheet.create({
    page: { fontFamily: theme.fontFamily, fontSize: 11, padding: 0, color: c.text },
    // Deckblatt - Mit Sidebar (lineHeight hier statt auf page wegen render prop Bug)
    // KOMPAKTERE MARGINS um Overflow zu verhindern!
    coverPage: { flexDirection: 'row', paddingBottom: 40, lineHeight: 1.4 },
    sidebar: { width: 8, backgroundColor: c.primary },
    mainContent: { flex: 1, padding: 35 },
    header: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 20 },
    logo: { width: 70, height: 70, objectFit: 'contain' },
    companyInfo: { textAlign: 'right', fontSize: 8, color: c.textLight, marginTop: 8 },
    companyName: { fontSize: 11, fontWeight: 'bold', color: c.primary, marginBottom: 2 },
    titleContainer: { marginTop: 40, marginBottom: 30 },
    title: { fontSize: 26, fontWeight: 'bold', color: c.primary, textTransform: 'uppercase', letterSpacing: 2 },
    titleLine: { width: 50, height: 3, backgroundColor: c.accent, marginTop: 12 },
    subtitle: { fontSize: 11, color: c.textLight, marginTop: 10 },
    partiesContainer: { marginTop: 25 },
    partiesLabel: { fontSize: 9, color: c.accent, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 10 },
    partyBox: { backgroundColor: c.background, borderLeftWidth: 3, borderLeftColor: c.primary, padding: 12, marginBottom: 15 },
    partyName: { fontSize: 11, fontWeight: 'bold', color: c.primary },
    partyAddress: { fontSize: 9, color: c.textLight, marginTop: 2 },
    partyRole: { fontSize: 8, color: c.accent, marginTop: 8 },
    footer: { position: 'absolute', bottom: 20, left: 48, right: 40, flexDirection: 'row', justifyContent: 'space-between', fontSize: 8, color: c.textMuted },
    // Content Styles - KEIN flex: 1 wegen fixed footer! (lineHeight hier statt auf page)
    contentPage: { flexDirection: 'row', paddingBottom: 0, lineHeight: 1.6 },
    contentMain: { flex: 1, paddingLeft: 40, paddingRight: 40, paddingTop: 30, paddingBottom: 50 },
    preambleContainer: { marginBottom: 25, paddingLeft: 15, borderLeftWidth: 3, borderLeftColor: c.accent },
    preambleTitle: { fontSize: 11, fontWeight: 'bold', color: c.accent, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 },
    preambleText: { fontSize: 10, color: c.textLight, textAlign: 'justify' },
    sectionHeader: { fontSize: 13, fontWeight: 'bold', color: c.primary, marginTop: 25, marginBottom: 12, backgroundColor: '#f0f7ff', padding: 8, marginLeft: -8 },
    numberedParagraph: { flexDirection: 'row', marginBottom: 10 },
    paragraphNumber: { width: 30, fontSize: 10, fontWeight: 'bold', color: c.accent },
    paragraphText: { flex: 1, fontSize: 10, textAlign: 'justify' },
    letterItem: { flexDirection: 'row', marginLeft: 30, marginBottom: 6 },
    letterLabel: { width: 20, fontSize: 10, color: c.accent, fontWeight: 'bold' },
    letterContent: { flex: 1, fontSize: 10 },
    bulletItem: { flexDirection: 'row', marginLeft: 30, marginBottom: 6 },
    bulletPoint: { width: 15, fontSize: 12, color: c.accent },
    bulletText: { flex: 1, fontSize: 10 },
    paragraph: { fontSize: 10, marginBottom: 10, textAlign: 'justify' },
    pageFooter: { position: 'absolute', bottom: 20, left: 48, right: 40, flexDirection: 'row', justifyContent: 'space-between', fontSize: 8, color: c.textMuted },
    // Signature Styles (lineHeight hier statt auf page)
    signaturePage: { flexDirection: 'row', paddingBottom: 60, lineHeight: 1.6 },
    signatureMain: { flex: 1, paddingLeft: 40, paddingRight: 40, paddingTop: 40 },
    signatureTitle: { fontSize: 18, fontWeight: 'bold', color: c.primary, marginBottom: 50 },
    signatureColumns: { flexDirection: 'row', justifyContent: 'space-between' },
    signatureColumn: { width: '45%' },
    signatureLabel: { fontSize: 11, fontWeight: 'bold', color: c.primary, marginBottom: 40, paddingBottom: 5, borderBottomWidth: 2, borderBottomColor: c.accent },
    signatureLine: { borderBottomWidth: 1, borderBottomColor: c.textLight, marginBottom: 5 },
    signatureHint: { fontSize: 8, color: c.textMuted },
    signatureName: { fontSize: 10, fontWeight: 'bold', marginTop: 15 },
    signatureRole: { fontSize: 8, color: c.textMuted },
    verificationContainer: { alignItems: 'center', marginTop: 60 },
    qrCode: { width: 50, height: 50 },
    verificationText: { fontSize: 7, color: c.textMuted, marginTop: 5 },
    attachmentsBox: { marginTop: 40, paddingLeft: 15, borderLeftWidth: 3, borderLeftColor: c.accent },
    attachmentsTitle: { fontSize: 9, fontWeight: 'bold', color: c.accent, textTransform: 'uppercase' },
    attachmentsText: { fontSize: 8, color: c.textMuted },
    watermark: { position: 'absolute', top: '40%', left: '25%', fontSize: 60, color: '#e0e0e0', transform: 'rotate(-45deg)', opacity: 0.2 },
  });
};

const createMinimalStyles = (theme) => {
  const c = theme.colors;
  return StyleSheet.create({
    page: { fontFamily: theme.fontFamily, fontSize: 10, padding: 60, color: c.text },
    // Deckblatt - Ultra clean (lineHeight hier statt auf page wegen render prop Bug)
    coverPage: { justifyContent: 'center', paddingBottom: 60, lineHeight: 1.7 },
    header: { alignItems: 'center', marginBottom: 30 },
    logo: { width: 50, height: 50, objectFit: 'contain', opacity: 0.8 },
    companyInfo: { textAlign: 'center', fontSize: 8, color: c.textMuted, marginTop: 10 },
    companyName: { fontSize: 9, color: c.textLight, letterSpacing: 2, textTransform: 'uppercase' },
    titleContainer: { alignItems: 'center' },
    title: { fontSize: 20, fontWeight: 'normal', letterSpacing: 8, color: c.primary, textTransform: 'uppercase' },
    titleLine: { display: 'none' },
    subtitle: { fontSize: 10, color: c.textMuted, marginTop: 15, letterSpacing: 1 },
    partiesContainer: { marginTop: 50 },
    partiesLabel: { fontSize: 9, color: c.textMuted, textAlign: 'center', marginVertical: 15, letterSpacing: 3, textTransform: 'uppercase' },
    partyBox: { alignItems: 'center', marginBottom: 15 },
    partyName: { fontSize: 11, color: c.primary, letterSpacing: 1 },
    partyAddress: { fontSize: 9, color: c.textMuted, marginTop: 3 },
    partyRole: { fontSize: 8, color: c.textMuted, marginTop: 10, fontStyle: 'italic' },
    footer: { position: 'absolute', bottom: 40, left: 60, right: 60, flexDirection: 'row', justifyContent: 'center', fontSize: 7, color: c.textMuted },
    // Content Styles - KEIN flex: 1, das blockiert fixed elements! (lineHeight hier statt auf page)
    contentPage: { paddingBottom: 0, lineHeight: 1.7 },
    preambleContainer: { marginBottom: 30, textAlign: 'center' },
    preambleTitle: { fontSize: 9, color: c.textMuted, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 15 },
    preambleText: { fontSize: 9, color: c.textLight, textAlign: 'center', lineHeight: 2 },
    sectionHeader: { fontSize: 10, color: c.primary, marginTop: 35, marginBottom: 15, letterSpacing: 1 },
    numberedParagraph: { flexDirection: 'row', marginBottom: 12 },
    paragraphNumber: { width: 25, fontSize: 9, color: c.textMuted },
    paragraphText: { flex: 1, fontSize: 9, textAlign: 'justify', lineHeight: 1.8 },
    letterItem: { flexDirection: 'row', marginLeft: 25, marginBottom: 8 },
    letterLabel: { width: 20, fontSize: 9, color: c.textMuted },
    letterContent: { flex: 1, fontSize: 9 },
    bulletItem: { flexDirection: 'row', marginLeft: 25, marginBottom: 8 },
    bulletPoint: { width: 15, fontSize: 9, color: c.textMuted },
    bulletText: { flex: 1, fontSize: 9 },
    paragraph: { fontSize: 9, marginBottom: 12, textAlign: 'justify', lineHeight: 1.8 },
    pageFooter: { position: 'absolute', bottom: 40, left: 60, right: 60, flexDirection: 'row', justifyContent: 'center', fontSize: 7, color: c.textMuted },
    // Signature Styles (lineHeight hier statt auf page)
    signaturePage: { justifyContent: 'center', paddingBottom: 60, lineHeight: 1.7 },
    signatureTitle: { fontSize: 10, textAlign: 'center', color: c.textMuted, letterSpacing: 4, textTransform: 'uppercase', marginBottom: 60 },
    signatureColumns: { flexDirection: 'row', justifyContent: 'space-around' },
    signatureColumn: { width: '40%', alignItems: 'center' },
    signatureLabel: { fontSize: 8, color: c.textMuted, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 50 },
    signatureLine: { borderBottomWidth: 0.5, borderBottomColor: c.textMuted, marginBottom: 5, width: '100%' },
    signatureHint: { fontSize: 7, color: c.textMuted },
    signatureName: { fontSize: 9, marginTop: 20, color: c.textLight },
    signatureRole: { fontSize: 7, color: c.textMuted },
    verificationContainer: { alignItems: 'center', marginTop: 80 },
    qrCode: { width: 40, height: 40, opacity: 0.6 },
    verificationText: { fontSize: 6, color: c.textMuted, marginTop: 5 },
    attachmentsBox: { marginTop: 40, alignItems: 'center' },
    attachmentsTitle: { fontSize: 7, color: c.textMuted, letterSpacing: 2, textTransform: 'uppercase' },
    attachmentsText: { fontSize: 7, color: c.textMuted },
    watermark: { position: 'absolute', top: '45%', left: '30%', fontSize: 50, color: '#f0f0f0', transform: 'rotate(-45deg)', opacity: 0.15 },
  });
};

const createElegantStyles = (theme) => {
  const c = theme.colors;
  return StyleSheet.create({
    page: { fontFamily: theme.fontFamily, fontSize: 11, padding: 40, color: c.text, backgroundColor: c.background },
    // Deckblatt - Ornamental (kompakter für eine Seite) (lineHeight hier statt auf page wegen render prop Bug)
    // KOMPAKTERE MARGINS um Overflow zu verhindern!
    coverPage: { paddingBottom: 40, lineHeight: 1.4 },
    header: { alignItems: 'center', marginBottom: 8 },
    ornamentTop: { width: 160, height: 2, backgroundColor: c.accent, marginBottom: 4 },
    ornamentTopInner: { width: 80, height: 1, backgroundColor: c.accent },
    logo: { width: 50, height: 50, objectFit: 'contain', marginTop: 10 },
    companyInfo: { textAlign: 'center', fontSize: 8, color: c.textLight, marginTop: 8 },
    companyName: { fontSize: 10, color: c.primary, letterSpacing: 2, marginBottom: 2 },
    titleContainer: { alignItems: 'center', marginTop: 18, marginBottom: 15 },
    titleOrnament: { width: 20, height: 20, borderWidth: 1, borderColor: c.accent, transform: 'rotate(45deg)', marginBottom: 10 },
    title: { fontSize: 22, color: c.primary, letterSpacing: 2, textTransform: 'uppercase' },
    titleLine: { width: 120, height: 1, backgroundColor: c.accent, marginTop: 8 },
    subtitle: { fontSize: 9, color: c.accent, marginTop: 8, fontStyle: 'italic' },
    partiesContainer: { marginTop: 12 },
    partiesLabel: { fontSize: 9, color: c.accent, textAlign: 'center', marginVertical: 8, fontStyle: 'italic' },
    partyBox: { borderWidth: 1, borderColor: c.border, padding: 10, marginHorizontal: 25, marginBottom: 6, backgroundColor: c.headerBg },
    partyName: { fontSize: 11, color: c.primary, textAlign: 'center' },
    partyAddress: { fontSize: 8, color: c.textLight, textAlign: 'center', marginTop: 2 },
    partyRole: { fontSize: 7, color: c.accent, textAlign: 'center', marginTop: 5, fontStyle: 'italic' },
    footer: { position: 'absolute', bottom: 25, left: 40, right: 40, alignItems: 'center' },
    footerOrnament: { width: 100, height: 1, backgroundColor: c.accent, marginBottom: 10 },
    footerText: { fontSize: 7, color: c.textMuted },
    // Content Styles - KEIN flex: 1, das blockiert fixed elements! (lineHeight hier statt auf page)
    contentPage: { paddingBottom: 0, lineHeight: 1.6 },
    preambleContainer: { marginBottom: 25, borderTopWidth: 1, borderBottomWidth: 1, borderColor: c.accent, paddingVertical: 15 },
    preambleTitle: { fontSize: 11, color: c.accent, textAlign: 'center', fontStyle: 'italic', marginBottom: 10 },
    preambleText: { fontSize: 10, color: c.textLight, textAlign: 'center' },
    sectionHeader: { fontSize: 12, fontWeight: 'bold', color: c.primary, marginTop: 25, marginBottom: 12, borderBottomWidth: 1, borderBottomColor: c.accent, paddingBottom: 5 },
    numberedParagraph: { flexDirection: 'row', marginBottom: 10 },
    paragraphNumber: { width: 30, fontSize: 10, color: c.accent, fontStyle: 'italic' },
    paragraphText: { flex: 1, fontSize: 10, textAlign: 'justify' },
    letterItem: { flexDirection: 'row', marginLeft: 30, marginBottom: 6 },
    letterLabel: { width: 20, fontSize: 10, color: c.accent },
    letterContent: { flex: 1, fontSize: 10 },
    bulletItem: { flexDirection: 'row', marginLeft: 30, marginBottom: 6 },
    bulletPoint: { width: 15, fontSize: 10, color: c.accent },
    bulletText: { flex: 1, fontSize: 10 },
    paragraph: { fontSize: 10, marginBottom: 10, textAlign: 'justify' },
    pageFooter: { position: 'absolute', bottom: 30, left: 50, right: 50, alignItems: 'center' },
    // Signature Styles (lineHeight hier statt auf page)
    signaturePage: { paddingBottom: 60, lineHeight: 1.6 },
    signatureTitle: { fontSize: 14, textAlign: 'center', color: c.primary, marginBottom: 50, borderBottomWidth: 1, borderBottomColor: c.accent, paddingBottom: 15 },
    signatureColumns: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 30 },
    signatureColumn: { width: '42%', alignItems: 'center' },
    signatureLabel: { fontSize: 10, color: c.accent, fontStyle: 'italic', marginBottom: 40 },
    signatureLine: { borderBottomWidth: 1, borderBottomColor: c.primary, marginBottom: 5, width: '100%' },
    signatureHint: { fontSize: 8, color: c.textMuted, fontStyle: 'italic' },
    signatureName: { fontSize: 10, marginTop: 15, color: c.primary },
    signatureRole: { fontSize: 8, color: c.textMuted },
    verificationContainer: { alignItems: 'center', marginTop: 60, borderTopWidth: 1, borderTopColor: c.accent, paddingTop: 20 },
    qrCode: { width: 55, height: 55 },
    verificationText: { fontSize: 7, color: c.textMuted, fontStyle: 'italic' },
    attachmentsBox: { marginTop: 30, padding: 15, borderWidth: 1, borderColor: c.accent },
    attachmentsTitle: { fontSize: 9, color: c.accent, fontStyle: 'italic', marginBottom: 5 },
    attachmentsText: { fontSize: 8, color: c.textMuted },
    watermark: { position: 'absolute', top: '40%', left: '20%', fontSize: 55, color: '#f5f0e8', transform: 'rotate(-45deg)', opacity: 0.3 },
  });
};

const createCorporateStyles = (theme) => {
  const c = theme.colors;
  return StyleSheet.create({
    // v4-FIX: Page mit padding wie Executive (KEIN backgroundColor - das verursacht das Problem!)
    page: { fontFamily: theme.fontFamily, fontSize: 10, padding: 50, color: '#1a1a1a' },
    // Deckblatt - Mit Header-Bar (ALLE FARBEN HARDCODIERT!) (lineHeight hier statt auf page wegen render prop Bug)
    // KOMPAKTERE MARGINS um Overflow zu verhindern!
    coverPage: { paddingBottom: 40, lineHeight: 1.4 },
    headerBar: { backgroundColor: '#003366', padding: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    logo: { width: 45, height: 45, objectFit: 'contain' },
    headerInfo: { color: '#ffffff', textAlign: 'right', fontSize: 7 },
    headerCompanyName: { fontSize: 9, fontWeight: 'bold', color: '#ffffff' },
    mainContent: { padding: 30, backgroundColor: '#ffffff' },
    titleContainer: { alignItems: 'center', marginTop: 30, marginBottom: 25, backgroundColor: '#003366', padding: 20 },
    title: { fontSize: 20, fontWeight: 'bold', color: '#ffffff', textTransform: 'uppercase', letterSpacing: 2 },
    titleLine: { display: 'none' },
    subtitle: { fontSize: 9, color: '#ffffff', marginTop: 8, opacity: 0.9 },
    partiesContainer: { marginTop: 20 },
    partiesLabel: { fontSize: 8, color: '#003366', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
    partyBox: { borderWidth: 1, borderColor: '#003366', marginBottom: 10 },
    partyBoxHeader: { padding: 6, borderBottomWidth: 1, borderBottomColor: '#003366' },
    partyBoxContent: { padding: 10 },
    partyName: { fontSize: 10, fontWeight: 'bold', color: '#003366' },
    partyAddress: { fontSize: 8, color: '#333333' },
    partyRole: { fontSize: 7, color: '#0066cc', fontWeight: 'bold' },
    footer: { position: 'absolute', bottom: 30, left: 50, right: 50, flexDirection: 'row', justifyContent: 'space-between', fontSize: 8, color: '#666666', borderTopWidth: 1, borderTopColor: '#003366', paddingTop: 10 },
    // Content Styles - KEIN flex: 1 wegen fixed footer! (lineHeight hier statt auf page)
    contentPage: { paddingBottom: 0, lineHeight: 1.5 },
    contentMain: { flex: 1 },
    preambleContainer: { marginBottom: 20, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: '#003366' },
    preambleTitle: { fontSize: 10, fontWeight: 'bold', color: '#003366', textTransform: 'uppercase', marginBottom: 8 },
    preambleText: { fontSize: 9, color: '#333333' },
    sectionHeader: { fontSize: 12, fontWeight: 'bold', color: '#003366', marginTop: 20, marginBottom: 10, paddingBottom: 5, borderBottomWidth: 1, borderBottomColor: '#003366' },
    numberedParagraph: { flexDirection: 'row', marginBottom: 8, paddingLeft: 10 },
    paragraphNumber: { width: 25, fontSize: 9, fontWeight: 'bold', color: '#003366' },
    paragraphText: { flex: 1, fontSize: 9, textAlign: 'justify', color: '#1a1a1a' },
    letterItem: { flexDirection: 'row', marginLeft: 35, marginBottom: 5 },
    letterLabel: { width: 18, fontSize: 9, color: '#0066cc', fontWeight: 'bold' },
    letterContent: { flex: 1, fontSize: 9, color: '#1a1a1a' },
    bulletItem: { flexDirection: 'row', marginLeft: 35, marginBottom: 5 },
    bulletPoint: { width: 12, fontSize: 9, color: '#0066cc' },
    bulletText: { flex: 1, fontSize: 9, color: '#1a1a1a' },
    paragraph: { fontSize: 9, marginBottom: 8, textAlign: 'justify', paddingLeft: 10, color: '#1a1a1a' },
    pageFooter: { position: 'absolute', bottom: 30, left: 50, right: 50, flexDirection: 'row', justifyContent: 'space-between', fontSize: 8, color: '#666666', borderTopWidth: 1, borderTopColor: '#003366', paddingTop: 8 },
    // Signature Styles - v4-FIX: Ohne flex:1 für fixed footer! (lineHeight hier statt auf page)
    signaturePage: { paddingBottom: 60, lineHeight: 1.5 },
    signatureHeader: { backgroundColor: '#003366', padding: 15 },
    signatureTitle: { fontSize: 14, fontWeight: 'bold', color: '#ffffff', textAlign: 'center' },
    signatureMain: { padding: 40 },
    signatureColumns: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 30 },
    signatureColumn: { width: '45%', borderWidth: 1, borderColor: '#003366', padding: 15 },
    signatureLabel: { fontSize: 9, fontWeight: 'bold', color: '#003366', textTransform: 'uppercase', marginBottom: 30, paddingBottom: 5, borderBottomWidth: 2, borderBottomColor: '#0066cc' },
    signatureLine: { borderBottomWidth: 1, borderBottomColor: '#333333', marginBottom: 5 },
    signatureHint: { fontSize: 7, color: '#666666' },
    signatureName: { fontSize: 9, fontWeight: 'bold', marginTop: 15, color: '#1a1a1a' },
    signatureRole: { fontSize: 7, color: '#666666' },
    verificationContainer: { alignItems: 'center', marginTop: 50, padding: 15, borderTopWidth: 1, borderTopColor: '#003366' },
    qrCode: { width: 50, height: 50 },
    verificationText: { fontSize: 6, color: '#666666', marginTop: 5 },
    attachmentsBox: { marginTop: 30, borderWidth: 1, borderColor: '#003366' },
    attachmentsHeader: { padding: 8, borderBottomWidth: 1, borderBottomColor: '#003366' },
    attachmentsTitle: { fontSize: 8, fontWeight: 'bold', color: '#003366', textTransform: 'uppercase' },
    attachmentsContent: { padding: 10 },
    attachmentsText: { fontSize: 8, color: '#666666' },
    watermark: { position: 'absolute', top: '35%', left: '15%', fontSize: 65, color: '#e8eef4', transform: 'rotate(-45deg)', opacity: 0.25 },
    companyInfo: { display: 'none' },
    companyName: { display: 'none' },
    header: { display: 'none' },
  });
};

// Style-Selector basierend auf Design-Layout
const createStyles = (theme) => {
  // Zunächst nach Layout-Typ auswählen (für neue Designs)
  switch (theme.layout) {
    case 'sidebar-accent':
      return createModernStyles(theme);
    case 'whitespace-focus':
      return createMinimalStyles(theme);
    case 'ornamental':
      return createElegantStyles(theme);
    case 'structured-boxes':
      return createCorporateStyles(theme);
    case 'classic-centered':
    default:
      return createExecutiveStyles(theme);
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// UNIVERSELLE PARTEI-NAMEN AUFLÖSUNG
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Löst Parteinamen aus verschiedenen Feldnamen auf (seller/buyer, landlord/tenant, etc.)
 * Ermöglicht einheitlichen Zugriff unabhängig vom Vertragstyp
 */
const resolvePartyNames = (parties) => {
  if (!parties) return { partyAName: null, partyBName: null, partyAAddress: null, partyBAddress: null, partyACity: null, partyBCity: null };

  // Partei A Name: typ-spezifisch → generisch → null
  const partyAName =
    parties.seller || parties.partyA ||
    parties.landlord || parties.employer || parties.lender ||
    parties.nameClient || parties.licensor ||
    parties.verpachter || parties.darlehensgeber ||
    (parties.parteiA?.name ? parties.parteiA.name : null) ||
    null;

  // Partei B Name: typ-spezifisch → generisch → null
  const partyBName =
    parties.buyer || parties.partyB || parties.buyerName ||
    parties.tenant || parties.employee || parties.borrower ||
    parties.nameFreelancer || parties.licensee ||
    parties.pachter || parties.darlehensnehmer ||
    (parties.parteiB?.name ? parties.parteiB.name : null) ||
    null;

  // Partei A Adresse
  const partyAAddress =
    parties.sellerAddress || parties.partyAAddress ||
    parties.landlordAddress || parties.employerAddress || parties.lenderAddress ||
    parties.clientAddress || parties.licensorAddress ||
    null;

  // Partei B Adresse
  const partyBAddress =
    parties.buyerAddress || parties.partyBAddress ||
    parties.tenantAddress || parties.employeeAddress || parties.borrowerAddress ||
    parties.freelancerAddress || parties.licenseeAddress ||
    null;

  // City fields
  const partyACity = parties.sellerCity || parties.partyACity || null;
  const partyBCity = parties.buyerCity || parties.partyBCity || null;

  return { partyAName, partyBName, partyAAddress, partyBAddress, partyACity, partyBCity };
};

/**
 * Prüft ob ein Firmenname ein Platzhalter ist (z.B. "TEST", "Firma", "Meine Firma")
 * Gibt true zurück wenn der Name NICHT angezeigt werden sollte
 */
const isPlaceholderCompanyName = (name) => {
  if (!name || typeof name !== 'string') return true;
  const trimmed = name.trim();
  if (trimmed.length < 3) return true;
  const lower = trimmed.toLowerCase();
  const placeholders = ['test', 'testing', 'testfirma', 'firma', 'meine firma', 'my company', 'company', 'example', 'beispiel', 'name', 'firmenname', 'xxx', 'abc', 'asdf', 'platzhalter'];
  return placeholders.includes(lower);
};

/**
 * Proper Case Normalisierung für Namen und Adressen
 * Konvertiert "naomi baba" → "Naomi Baba", "richard oberle weg 27" → "Richard Oberle Weg 27"
 * Lässt bereits korrekte Groß-/Kleinschreibung unverändert (z.B. "GmbH", "Dr. Schmidt")
 */
const toProperCase = (str) => {
  if (!str || typeof str !== 'string') return str;
  const trimmed = str.trim();
  if (!trimmed) return str;

  // Wenn der String bereits gemischte Groß-/Kleinschreibung hat → nicht ändern
  const hasUpper = /[A-ZÄÖÜ]/.test(trimmed);
  const hasLower = /[a-zäöüß]/.test(trimmed);
  if (hasUpper && hasLower) return trimmed;

  // Rein lowercase oder rein uppercase → Title Case anwenden
  return trimmed.replace(/\b\w+/g, word => {
    // Kurze Wörter wie "in", "am", "der" NICHT kapitalisieren, außer am Anfang
    const lowerWords = ['in', 'am', 'an', 'im', 'bei', 'der', 'die', 'das', 'und', 'oder', 'von', 'vom', 'zum', 'zur'];
    if (lowerWords.includes(word.toLowerCase()) && trimmed.indexOf(word) > 0) {
      return word.toLowerCase();
    }
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  });
};

/**
 * Extrahiert Parteinamen und -adressen aus dem Vertragstext
 * Parst den "zwischen ... und ..." Block der Präambel
 * Gibt die Namen zurück wie sie im LLM-generierten Text stehen (korrekte Groß-/Kleinschreibung)
 */
const extractPartiesFromText = (contractText) => {
  if (!contractText) return null;

  let partyAName = null, partyBName = null;
  let partyAAddress = null, partyBAddress = null;

  // Helper: Erkennt Markdown-Bold-Header allein in einer Zeile (z.B. "**Vermieter:**")
  const isMarkdownLabel = (s) => /^\*\*[^*]+\*\*\s*:?\s*$/.test(s.trim());
  // Helper: Erkennt Verbindungs-Wörter / Trenner die NICHT Name/Adresse sind
  const isConnector = (s) => /^(und|–|-|—|nachfolgend|wird folgender|geschlossen|im folgenden)/i.test(s.trim());
  // Helper: Liefert eine bereinigte Zeile oder null wenn sie zu skippen ist
  const cleanCandidate = (s) => {
    if (!s) return null;
    const trimmed = s.trim().replace(/^\*\*|\*\*$/g, '').trim();
    if (!trimmed) return null;
    if (isMarkdownLabel(s)) return null;
    if (isConnector(trimmed)) return null;
    return trimmed;
  };
  // Helper: Splittet 1-N Zeilen in Name + Adresse — entweder Komma-getrennt in einer Zeile
  // oder Multiline (erste Zeile = Name, Rest = Adresse).
  const splitNameAddress = (lines) => {
    const cleaned = lines.map(cleanCandidate).filter(Boolean);
    if (cleaned.length === 0) return { name: null, address: null };
    // Bei Komma in Zeile 1 → klassisches Format
    if (cleaned[0].includes(',')) {
      const idx = cleaned[0].indexOf(',');
      return {
        name: cleaned[0].substring(0, idx).trim(),
        address: [cleaned[0].substring(idx + 1).trim(), ...cleaned.slice(1)].filter(Boolean).join(', ')
      };
    }
    // Multiline-Format: Zeile 1 = Name, Rest = Adresse
    return {
      name: cleaned[0],
      address: cleaned.slice(1, 3).join(', ') || null
    };
  };

  try {
    // Erfasse "zwischen" + bis zu 5 Folgezeilen (deckt Komma-Format UND Markdown-Multiline ab)
    const zwischenRegex = /zwischen\s*\n+([^\n]+)(?:\n+([^\n]+))?(?:\n+([^\n]+))?(?:\n+([^\n]+))?(?:\n+([^\n]+))?/i;
    const matchA = contractText.match(zwischenRegex);
    if (matchA) {
      const candidateLines = [matchA[1], matchA[2], matchA[3], matchA[4], matchA[5]];
      const { name, address } = splitNameAddress(candidateLines);
      partyAName = name;
      partyAAddress = address;
    }

    // Erfasse "und" Block nach dem ersten "nachfolgend"
    const undRegex = /nachfolgend[^]*?\bund\s*\n+([^\n]+)(?:\n+([^\n]+))?(?:\n+([^\n]+))?(?:\n+([^\n]+))?(?:\n+([^\n]+))?/i;
    const matchB = contractText.match(undRegex);
    if (matchB) {
      const candidateLines = [matchB[1], matchB[2], matchB[3], matchB[4], matchB[5]];
      const { name, address } = splitNameAddress(candidateLines);
      partyBName = name;
      partyBAddress = address;
    }
  } catch (err) {
    console.warn('⚠️ [PDF] Party extraction from text failed:', err.message);
  }

  // Nur zurückgeben wenn mindestens ein Name gefunden wurde
  if (!partyAName && !partyBName) return null;
  return { partyAName, partyBName, partyAAddress, partyBAddress };
};

// ═══════════════════════════════════════════════════════════════════════════
// REACT-PDF KOMPONENTEN - Design-spezifisch
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Deckblatt-Komponente - passt sich dem Design an
 * WICHTIG: Alle CoverPage Layouts verwenden wrap: false um leere Seiten zu verhindern!
 * Das Deckblatt darf NIE umbrechen - lieber Content abschneiden als leere Seite erzeugen.
 */
const CoverPage = ({ styles, theme, companyProfile, contractType, parties, partyLabels, resolvedParties, currentDate, documentId, isDraft, logoBase64 }) => {
  const e = React.createElement;
  const c = theme.colors;
  const layoutType = theme.layout;

  // 🔧 FIX: Verwende parties.title als Vertragstitel wenn vorhanden, sonst contractType
  // Dies ermöglicht KI-Verbesserungen wie "Ändere den Titel zu X"
  const displayTitle = (parties?.title && parties.title !== contractType)
    ? parties.title.toUpperCase()
    : (contractType || 'VERTRAG').toUpperCase();

  // Sidebar-Layout (Modern, Startup, Tech, Creative)
  // wrap: false verhindert leere Seiten!
  if (layoutType === 'sidebar-accent') {
    return e(Page, { size: 'A4', style: styles.page, wrap: false },
      isDraft && e(Text, { style: styles.watermark, fixed: true }, 'ENTWURF'),
      e(View, { style: styles.coverPage },
        e(View, { style: styles.sidebar }),
        e(View, { style: styles.mainContent },
          e(View, { style: styles.header },
            logoBase64 && e(Image, { src: logoBase64, style: styles.logo })
          ),
          (companyProfile?.companyName && !isPlaceholderCompanyName(companyProfile.companyName)) && e(View, { style: styles.companyInfo },
            e(Text, { style: styles.companyName }, companyProfile.companyName),
            companyProfile?.street && e(Text, null, companyProfile.street),
            companyProfile?.zip && e(Text, null, `${companyProfile.zip} ${companyProfile.city || ''}`)
          ),
          e(View, { style: styles.titleContainer },
            e(Text, { style: styles.title }, displayTitle),
            e(View, { style: styles.titleLine }),
            e(Text, { style: styles.subtitle }, `geschlossen am ${currentDate}`)
          ),
          e(View, { style: styles.partiesContainer },
            e(Text, { style: styles.partiesLabel }, 'Vertragsparteien'),
            e(View, { style: styles.partyBox },
              e(Text, { style: styles.partyName }, resolvedParties.partyAName || '[Vertragspartei A]'),
              resolvedParties.partyAAddress && e(Text, { style: styles.partyAddress }, resolvedParties.partyAAddress),
              resolvedParties.partyACity && e(Text, { style: styles.partyAddress }, resolvedParties.partyACity),
              e(Text, { style: styles.partyRole }, `– ${partyLabels.partyA} –`)
            ),
            e(View, { style: styles.partyBox },
              e(Text, { style: styles.partyName }, resolvedParties.partyBName || '[Vertragspartei B]'),
              resolvedParties.partyBAddress && e(Text, { style: styles.partyAddress }, resolvedParties.partyBAddress),
              resolvedParties.partyBCity && e(Text, { style: styles.partyAddress }, resolvedParties.partyBCity),
              e(Text, { style: styles.partyRole }, `– ${partyLabels.partyB} –`)
            )
          )
        )
      ),
      // Fixed Footer mit dynamischer Seitenzahl
      e(Text, { style: { position: 'absolute', bottom: 25, left: 58, fontSize: 8, color: '#666666' }, fixed: true }, `ID: ${documentId?.substring(0, 12) || 'N/A'}`),
      e(Text, {
        style: { position: 'absolute', bottom: 25, left: 0, right: 0, textAlign: 'center', fontSize: 8, color: '#666666', minHeight: 12 },
        fixed: true,
        render: (props) => `Seite ${props.pageNumber} von ${props.totalPages}`
      }),
      e(Text, { style: { position: 'absolute', bottom: 25, right: 50, fontSize: 8, color: '#666666', textAlign: 'right' }, fixed: true }, currentDate || '')
    );
  }

  // Whitespace-Layout (Minimal)
  // wrap: false verhindert leere Seiten!
  if (layoutType === 'whitespace-focus') {
    return e(Page, { size: 'A4', style: styles.page, wrap: false },
      isDraft && e(Text, { style: styles.watermark, fixed: true }, 'ENTWURF'),
      e(View, { style: styles.coverPage },
        e(View, { style: styles.header },
          logoBase64 && e(Image, { src: logoBase64, style: styles.logo }),
          (companyProfile?.companyName && !isPlaceholderCompanyName(companyProfile.companyName)) && e(View, { style: styles.companyInfo },
            e(Text, { style: styles.companyName }, companyProfile.companyName)
          )
        ),
        e(View, { style: styles.titleContainer },
          e(Text, { style: styles.title }, displayTitle),
          e(Text, { style: styles.subtitle }, currentDate)
        ),
        e(View, { style: styles.partiesContainer },
          e(Text, { style: styles.partiesLabel }, 'zwischen'),
          e(View, { style: styles.partyBox },
            e(Text, { style: styles.partyName }, resolvedParties.partyAName || '[Vertragspartei A]'),
            resolvedParties.partyAAddress && e(Text, { style: styles.partyAddress }, resolvedParties.partyAAddress),
            e(Text, { style: styles.partyRole }, partyLabels.partyA)
          ),
          e(Text, { style: styles.partiesLabel }, 'und'),
          e(View, { style: styles.partyBox },
            e(Text, { style: styles.partyName }, resolvedParties.partyBName || '[Vertragspartei B]'),
            resolvedParties.partyBAddress && e(Text, { style: styles.partyAddress }, resolvedParties.partyBAddress),
            e(Text, { style: styles.partyRole }, partyLabels.partyB)
          )
        )
      ),
      // Fixed Footer mit dynamischer Seitenzahl
      e(Text, { style: { position: 'absolute', bottom: 40, left: 60, fontSize: 7, color: '#999999' }, fixed: true }, `ID: ${documentId?.substring(0, 12) || 'N/A'}`),
      e(Text, {
        style: { position: 'absolute', bottom: 40, left: 0, right: 0, textAlign: 'center', fontSize: 7, color: '#999999', minHeight: 12 },
        fixed: true,
        render: (props) => `Seite ${props.pageNumber} von ${props.totalPages}`
      }),
      e(Text, { style: { position: 'absolute', bottom: 40, right: 60, fontSize: 7, color: '#999999', textAlign: 'right' }, fixed: true }, currentDate || '')
    );
  }

  // Ornamental-Layout (Elegant, Legal, Finance)
  // wrap: false verhindert leere Seiten!
  if (layoutType === 'ornamental') {
    return e(Page, { size: 'A4', style: styles.page, wrap: false },
      isDraft && e(Text, { style: styles.watermark, fixed: true }, 'ENTWURF'),
      e(View, { style: styles.coverPage },
        e(View, { style: styles.header },
          e(View, { style: styles.ornamentTop }),
          e(View, { style: styles.ornamentTopInner }),
          logoBase64 && e(Image, { src: logoBase64, style: styles.logo }),
          (companyProfile?.companyName && !isPlaceholderCompanyName(companyProfile.companyName)) && e(View, { style: styles.companyInfo },
            e(Text, { style: styles.companyName }, companyProfile.companyName),
            companyProfile?.street && e(Text, null, companyProfile.street),
            companyProfile?.zip && e(Text, null, `${companyProfile.zip} ${companyProfile.city || ''}`)
          )
        ),
        e(View, { style: styles.titleContainer },
          e(View, { style: styles.titleOrnament }),
          e(Text, { style: styles.title }, displayTitle),
          e(View, { style: styles.titleLine }),
          e(Text, { style: styles.subtitle }, `geschlossen am ${currentDate}`)
        ),
        e(View, { style: styles.partiesContainer },
          e(Text, { style: styles.partiesLabel }, '~ zwischen ~'),
          e(View, { style: styles.partyBox },
            e(Text, { style: styles.partyName }, resolvedParties.partyAName || '[Vertragspartei A]'),
            resolvedParties.partyAAddress && e(Text, { style: styles.partyAddress }, resolvedParties.partyAAddress),
            resolvedParties.partyACity && e(Text, { style: styles.partyAddress }, resolvedParties.partyACity),
            e(Text, { style: styles.partyRole }, `– nachfolgend „${partyLabels.partyA}" genannt –`)
          ),
          e(Text, { style: styles.partiesLabel }, '~ und ~'),
          e(View, { style: styles.partyBox },
            e(Text, { style: styles.partyName }, resolvedParties.partyBName || '[Vertragspartei B]'),
            resolvedParties.partyBAddress && e(Text, { style: styles.partyAddress }, resolvedParties.partyBAddress),
            resolvedParties.partyBCity && e(Text, { style: styles.partyAddress }, resolvedParties.partyBCity),
            e(Text, { style: styles.partyRole }, `– nachfolgend „${partyLabels.partyB}" genannt –`)
          )
        )
      ),
      // Fixed Footer mit dynamischer Seitenzahl
      e(Text, { style: { position: 'absolute', bottom: 25, left: 40, fontSize: 8, color: '#8a7a6a' }, fixed: true }, `ID: ${documentId?.substring(0, 12) || 'N/A'}`),
      e(Text, {
        style: { position: 'absolute', bottom: 25, left: 0, right: 0, textAlign: 'center', fontSize: 8, color: '#8a7a6a', minHeight: 12 },
        fixed: true,
        render: (props) => `Seite ${props.pageNumber} von ${props.totalPages}`
      }),
      e(Text, { style: { position: 'absolute', bottom: 25, right: 40, fontSize: 8, color: '#8a7a6a', textAlign: 'right' }, fixed: true }, currentDate || '')
    );
  }

  // Structured-Boxes-Layout (Corporate)
  // wrap: false verhindert leere Seiten!
  if (layoutType === 'structured-boxes') {
    return e(Page, { size: 'A4', style: styles.page, wrap: false },
      isDraft && e(Text, { style: styles.watermark, fixed: true }, 'ENTWURF'),
      e(View, { style: styles.coverPage },
        e(View, { style: styles.headerBar },
          logoBase64 ? e(Image, { src: logoBase64, style: styles.logo }) : e(View, { style: { width: 50 } }),
          e(View, { style: styles.headerInfo },
            e(Text, { style: styles.headerCompanyName }, (!isPlaceholderCompanyName(companyProfile?.companyName) ? companyProfile.companyName : '')),
            companyProfile?.street && e(Text, null, companyProfile.street),
            companyProfile?.zip && e(Text, null, `${companyProfile.zip} ${companyProfile.city || ''}`)
          )
        ),
        e(View, { style: styles.mainContent },
          e(View, { style: styles.titleContainer },
            e(Text, { style: styles.title }, displayTitle),
            e(Text, { style: styles.subtitle }, `Datum: ${currentDate}`)
          ),
          e(View, { style: styles.partiesContainer },
            e(Text, { style: styles.partiesLabel }, 'Partei A'),
            e(View, { style: styles.partyBox },
              e(View, { style: styles.partyBoxHeader },
                e(Text, { style: styles.partyRole }, partyLabels.partyA)
              ),
              e(View, { style: styles.partyBoxContent },
                e(Text, { style: styles.partyName }, resolvedParties.partyAName || '[Name]'),
                resolvedParties.partyAAddress && e(Text, { style: styles.partyAddress }, resolvedParties.partyAAddress),
                resolvedParties.partyACity && e(Text, { style: styles.partyAddress }, resolvedParties.partyACity)
              )
            ),
            e(Text, { style: styles.partiesLabel }, 'Partei B'),
            e(View, { style: styles.partyBox },
              e(View, { style: styles.partyBoxHeader },
                e(Text, { style: styles.partyRole }, partyLabels.partyB)
              ),
              e(View, { style: styles.partyBoxContent },
                e(Text, { style: styles.partyName }, resolvedParties.partyBName || '[Name]'),
                resolvedParties.partyBAddress && e(Text, { style: styles.partyAddress }, resolvedParties.partyBAddress),
                resolvedParties.partyBCity && e(Text, { style: styles.partyAddress }, resolvedParties.partyBCity)
              )
            )
          )
        )
      ),
      // Fixed Footer mit dynamischer Seitenzahl
      e(Text, { style: { position: 'absolute', bottom: 25, left: 50, fontSize: 8, color: '#666666' }, fixed: true }, `ID: ${documentId?.substring(0, 12) || 'N/A'}`),
      e(Text, {
        style: { position: 'absolute', bottom: 25, left: 0, right: 0, textAlign: 'center', fontSize: 8, color: '#666666', minHeight: 12 },
        fixed: true,
        render: (props) => `Seite ${props.pageNumber} von ${props.totalPages}`
      }),
      e(Text, { style: { position: 'absolute', bottom: 25, right: 50, fontSize: 8, color: '#666666', textAlign: 'right' }, fixed: true }, currentDate || '')
    );
  }

  // Executive Design (Default) - klassisch zentriert
  // wrap: false verhindert leere Seiten!
  return e(Page, { size: 'A4', style: styles.page, wrap: false },
    isDraft && e(Text, { style: styles.watermark, fixed: true }, 'ENTWURF'),
    e(View, { style: styles.coverPage },
      e(View, { style: styles.header },
        logoBase64 ? e(Image, { src: logoBase64, style: styles.logo }) : e(View, { style: { width: 60 } }),
        e(View, { style: styles.companyInfo },
          e(Text, { style: styles.companyName }, (!isPlaceholderCompanyName(companyProfile?.companyName) ? companyProfile.companyName : '')),
          (!isPlaceholderCompanyName(companyProfile?.companyName) && companyProfile?.street) && e(Text, null, companyProfile.street),
          (!isPlaceholderCompanyName(companyProfile?.companyName) && companyProfile?.zip) && e(Text, null, `${companyProfile.zip} ${companyProfile.city || ''}`),
          companyProfile?.contactPhone && e(Text, null, `Tel: ${companyProfile.contactPhone}`),
          companyProfile?.contactEmail && e(Text, null, companyProfile.contactEmail)
        )
      ),
      e(View, { style: styles.titleContainer },
        e(View, { style: styles.titleLine }),
        e(Text, { style: styles.title }, displayTitle),
        e(View, { style: styles.titleLineBottom }),
        e(Text, { style: styles.subtitle }, `geschlossen am ${currentDate}`)
      ),
      e(View, { style: styles.partiesContainer },
        e(Text, { style: styles.partiesLabel }, 'zwischen'),
        e(View, { style: styles.partyBox },
          e(Text, { style: styles.partyName }, resolvedParties.partyAName || '[Vertragspartei A]'),
          resolvedParties.partyAAddress && e(Text, { style: styles.partyAddress }, resolvedParties.partyAAddress),
          resolvedParties.partyACity && e(Text, { style: styles.partyAddress }, resolvedParties.partyACity),
          e(Text, { style: styles.partyRole }, `– nachfolgend „${partyLabels.partyA}" genannt –`)
        ),
        e(Text, { style: styles.partiesLabel }, 'und'),
        e(View, { style: styles.partyBox },
          e(Text, { style: styles.partyName }, resolvedParties.partyBName || '[Vertragspartei B]'),
          resolvedParties.partyBAddress && e(Text, { style: styles.partyAddress }, resolvedParties.partyBAddress),
          resolvedParties.partyBCity && e(Text, { style: styles.partyAddress }, resolvedParties.partyBCity),
          e(Text, { style: styles.partyRole }, `– nachfolgend „${partyLabels.partyB}" genannt –`)
        )
      )
    ),
    // Fixed Footer mit dynamischer Seitenzahl
    e(Text, { style: { position: 'absolute', bottom: 25, left: 50, fontSize: 8, color: '#666666' }, fixed: true }, `ID: ${documentId?.substring(0, 12) || 'N/A'}`),
    e(Text, {
      style: { position: 'absolute', bottom: 25, left: 0, right: 0, textAlign: 'center', fontSize: 8, color: '#666666', minHeight: 12 },
      fixed: true,
      render: (props) => `Seite ${props.pageNumber} von ${props.totalPages}`
    }),
    e(Text, { style: { position: 'absolute', bottom: 25, right: 50, fontSize: 8, color: '#666666', textAlign: 'right' }, fixed: true }, currentDate || '')
  );
};

/**
 * Inhalts-Seite Komponente
 * WICHTIG: Der Footer muss als direktes Kind der Page mit fixed={true} sein,
 * damit er auf allen automatisch umgebrochenen Seiten erscheint!
 */
const ContentPage = ({ styles, theme, sections, companyProfile, contractType, documentId, currentDate, pageBreaks = [] }) => {
  const e = React.createElement;
  const layoutType = theme.layout;

  const renderContent = (item, index, numberedCounter) => {
    switch (item.type) {
      case 'numbered':
        // wrap: false hält Nummer und Text zusammen auf einer Seite
        return e(View, { key: index, style: styles.numberedParagraph, wrap: false },
          e(Text, { style: styles.paragraphNumber }, `(${numberedCounter})`),
          e(Text, { style: styles.paragraphText }, item.text)
        );
      case 'letter':
        return e(View, { key: index, style: styles.letterItem, wrap: false },
          e(Text, { style: styles.letterLabel }, `${item.letter})`),
          e(Text, { style: styles.letterContent }, item.text)
        );
      case 'bullet':
        return e(View, { key: index, style: styles.bulletItem, wrap: false },
          e(Text, { style: styles.bulletPoint }, '–'),
          e(Text, { style: styles.bulletText }, item.text)
        );
      default:
        return e(Text, { key: index, style: styles.paragraph }, item.text);
    }
  };

  const renderSection = (section, sectionIndex) => {
    let numberedCounter = 0;
    const forceBreak = pageBreaks.includes(sectionIndex);

    if (section.type === 'preamble') {
      return e(View, { key: sectionIndex, style: styles.preambleContainer, break: forceBreak || undefined },
        e(Text, { style: styles.preambleTitle }, 'Präambel'),
        ...section.content.map((item, i) =>
          e(Text, { key: i, style: styles.preambleText }, item.text)
        )
      );
    }

    // Seitenumbruch-Schutz:
    // 1. minPresenceAhead auf Header: verhindert verwaiste Überschriften am Seitenende
    // 2. Letzte 2 Items werden in wrap:false View gruppiert: verhindert einzelne Sätze
    //    auf einer neuen Seite (Witwen-Schutz)
    const contentItems = section.content.map((item, i) => {
      if (item.type === 'numbered') numberedCounter++;
      return renderContent(item, i, numberedCounter);
    });

    if (contentItems.length >= 2) {
      const initItems = contentItems.slice(0, -2);
      const lastTwo = contentItems.slice(-2);
      return e(View, { key: sectionIndex, wrap: true, break: forceBreak || undefined },
        e(Text, { style: styles.sectionHeader, minPresenceAhead: 80 }, section.title),
        ...initItems,
        e(View, { wrap: false }, ...lastTwo)
      );
    }

    return e(View, { key: sectionIndex, wrap: true, break: forceBreak || undefined },
      e(Text, { style: styles.sectionHeader, minPresenceAhead: 80 }, section.title),
      ...contentItems
    );
  };

  // FIXED Footer Style - position absolute am unteren Seitenrand
  // Muss als direktes Kind der Page mit fixed={true} sein!
  const fixedFooterStyle = {
    position: 'absolute',
    bottom: 25,
    left: 50,
    right: 50,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: 8,
    color: '#666666',
    borderTopWidth: 0.5,
    borderTopColor: '#cccccc',
    paddingTop: 8
  };

  const docIdShort = documentId?.substring(0, 12) || 'N/A';

  // Footer-Styles für alle Layouts
  // WICHTIG: minHeight ist ERFORDERLICH damit render prop mit totalPages funktioniert!
  // Siehe: https://github.com/diegomura/react-pdf/issues/931
  const footerLeft = { position: 'absolute', bottom: 25, left: 50, fontSize: 8, color: '#666666' };
  const footerCenter = { position: 'absolute', bottom: 25, left: 0, right: 0, textAlign: 'center', fontSize: 8, color: '#666666', minHeight: 12 };
  const footerRight = { position: 'absolute', bottom: 25, right: 50, fontSize: 8, color: '#666666', textAlign: 'right' };

  // Hilfsfunktion für Seitenzahl-Text mit render prop
  const PageNumberText = ({ style }) => {
    return e(Text, {
      style: style,
      fixed: true,
      render: ({ pageNumber, totalPages }) => `Seite ${pageNumber} von ${totalPages}`
    });
  };

  // Sidebar-Layout (Modern, Startup, Tech, Creative)
  // paddingTop/paddingBottom auf der Page sorgt für Ränder auf ALLEN Seiten (auch Folgeseiten)
  // Sidebar ist absolute-positioned (top: 0) und bleibt trotzdem am physischen Seitenrand
  // WICHTIG: paddingBottom MUSS auf Page-Level sein (nicht auf View), damit es pro Seite gilt
  // und keine Phantom-Leerseiten entstehen!
  if (layoutType === 'sidebar-accent') {
    return e(Page, { size: 'A4', style: { ...styles.page, paddingTop: 50, paddingBottom: 50 }, wrap: true },
      // Fixed Sidebar - auf allen Seiten (absolute: ignoriert page padding)
      e(View, { style: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 8, backgroundColor: theme.colors.primary }, fixed: true }),
      // Content ZUERST (paddingTop/paddingBottom auf 0, da Page-Padding das übernimmt)
      e(View, { style: { ...styles.contentPage, marginLeft: 8 } },
        e(View, { style: { ...styles.contentMain, paddingTop: 0, paddingBottom: 0 } },
          ...sections.map(renderSection)
        )
      ),
      // Fixed Footer - NACH dem Content!
      e(Text, { style: { ...footerLeft, left: 58 }, fixed: true }, `ID: ${docIdShort}`),
      e(Text, {
        style: footerCenter,
        fixed: true,
        render: (props) => `Seite ${props.pageNumber} von ${props.totalPages}`
      }),
      e(Text, { style: footerRight, fixed: true }, currentDate || '')
    );
  }

  // Structured-Boxes-Layout (Corporate)
  if (layoutType === 'structured-boxes') {
    return e(Page, { size: 'A4', style: styles.page, wrap: true },
      // Content ZUERST
      e(View, { style: styles.contentPage },
        ...sections.map(renderSection)
      ),
      // Fixed Footer - NACH dem Content!
      e(Text, { style: footerLeft, fixed: true }, `ID: ${docIdShort}`),
      e(Text, {
        style: footerCenter,
        fixed: true,
        render: (props) => `Seite ${props.pageNumber} von ${props.totalPages}`
      }),
      e(Text, { style: footerRight, fixed: true }, currentDate || '')
    );
  }

  // Standard Layout (Executive, Minimal, Elegant, etc.)
  return e(Page, { size: 'A4', style: styles.page, wrap: true },
    // Content ZUERST
    e(View, { style: styles.contentPage },
      ...sections.map(renderSection)
    ),
    // Fixed Footer - NACH dem Content!
    e(Text, { style: footerLeft, fixed: true }, `ID: ${docIdShort}`),
    e(Text, {
      style: footerCenter,
      fixed: true,
      render: (props) => `Seite ${props.pageNumber} von ${props.totalPages}`
    }),
    e(Text, { style: footerRight, fixed: true }, currentDate || '')
  );
};

/**
 * Unterschriften-Seite Komponente
 */
const SignaturePage = ({ styles, theme, partyLabels, companyProfile, parties, resolvedParties, qrCode, documentId, currentDate, attachments = [], contractType = 'Vertrag' }) => {
  const e = React.createElement;
  const layoutType = theme.layout;

  // Anlagen-Liste erstellen
  const hasAttachments = attachments && attachments.length > 0;
  const attachmentsList = hasAttachments
    ? attachments.map((att, index) => `${index + 1}. ${att.displayName || att.name || att.originalName || 'Anlage ' + (index + 1)}`).join('\n')
    : 'Diesem Vertrag sind keine Anlagen beigefügt.';

  // Footer-Styles (gleich wie in ContentPage)
  // WICHTIG: minHeight ist ERFORDERLICH damit render prop mit totalPages funktioniert!
  const footerLeft = { position: 'absolute', bottom: 25, left: 50, fontSize: 8, color: '#666666' };
  const footerCenter = { position: 'absolute', bottom: 25, left: 0, right: 0, textAlign: 'center', fontSize: 8, color: '#666666', minHeight: 12 };
  const footerRight = { position: 'absolute', bottom: 25, right: 50, fontSize: 8, color: '#666666', textAlign: 'right' };
  const docIdShort = documentId?.substring(0, 12) || 'N/A';

  // Structured-Boxes-Layout (Corporate)
  // wrap: false - SignaturePage passt immer auf eine Seite
  if (layoutType === 'structured-boxes') {
    return e(Page, { size: 'A4', style: styles.page, wrap: false },
      e(View, { style: styles.signaturePage },
        e(View, { style: styles.signatureHeader },
          e(Text, { style: styles.signatureTitle }, 'UNTERSCHRIFTEN')
        ),
        e(View, { style: styles.signatureMain },
          e(View, { style: styles.signatureColumns },
            e(View, { style: styles.signatureColumn },
              e(Text, { style: styles.signatureLabel }, partyLabels.partyA),
              e(View, { style: { marginBottom: 20 } },
                e(View, { style: styles.signatureLine }),
                e(Text, { style: styles.signatureHint }, 'Ort, Datum')
              ),
              e(View, { style: { marginBottom: 10 } },
                e(View, { style: styles.signatureLine }),
                e(Text, { style: styles.signatureHint }, 'Unterschrift')
              ),
              e(Text, { style: styles.signatureName }, resolvedParties.partyAName || partyLabels.partyA)
            ),
            e(View, { style: styles.signatureColumn },
              e(Text, { style: styles.signatureLabel }, partyLabels.partyB),
              e(View, { style: { marginBottom: 20 } },
                e(View, { style: styles.signatureLine }),
                e(Text, { style: styles.signatureHint }, 'Ort, Datum')
              ),
              e(View, { style: { marginBottom: 10 } },
                e(View, { style: styles.signatureLine }),
                e(Text, { style: styles.signatureHint }, 'Unterschrift')
              ),
              e(Text, { style: styles.signatureName }, resolvedParties.partyBName || partyLabels.partyB)
            )
          ),
          e(View, { style: styles.verificationContainer },
            qrCode && e(Image, { src: qrCode, style: styles.qrCode }),
            e(Text, { style: styles.verificationText }, `Dok-ID: ${documentId?.substring(0, 20) || 'N/A'}`)
          ),
          e(View, { style: styles.attachmentsBox },
            e(View, { style: styles.attachmentsHeader },
              e(Text, { style: styles.attachmentsTitle }, hasAttachments ? `Anlagen (${attachments.length})` : 'Anlagen')
            ),
            e(View, { style: styles.attachmentsContent },
              e(Text, { style: styles.attachmentsText }, attachmentsList)
            )
          )
        )
      ),
      // Fixed Footer
      e(Text, { style: footerLeft, fixed: true }, `ID: ${docIdShort}`),
      e(Text, {
        style: footerCenter,
        fixed: true,
        render: (props) => `Seite ${props.pageNumber} von ${props.totalPages}`
      }),
      e(Text, { style: footerRight, fixed: true }, currentDate || '')
    );
  }

  // Sidebar-Layout (Modern, Startup, Tech, Creative)
  // wrap: false - SignaturePage passt immer auf eine Seite
  if (layoutType === 'sidebar-accent') {
    return e(Page, { size: 'A4', style: styles.page, wrap: false },
      e(View, { style: styles.signaturePage },
        e(View, { style: styles.sidebar }),
        e(View, { style: styles.signatureMain },
          e(Text, { style: styles.signatureTitle }, 'Unterschriften'),
          e(View, { style: styles.signatureColumns },
            e(View, { style: styles.signatureColumn },
              e(Text, { style: styles.signatureLabel }, partyLabels.partyA),
              e(View, { style: { marginBottom: 20 } },
                e(View, { style: styles.signatureLine }),
                e(Text, { style: styles.signatureHint }, 'Ort, Datum')
              ),
              e(View, { style: { marginBottom: 10 } },
                e(View, { style: styles.signatureLine }),
                e(Text, { style: styles.signatureHint }, 'Unterschrift')
              ),
              e(Text, { style: styles.signatureName }, resolvedParties.partyAName || partyLabels.partyA)
            ),
            e(View, { style: styles.signatureColumn },
              e(Text, { style: styles.signatureLabel }, partyLabels.partyB),
              e(View, { style: { marginBottom: 20 } },
                e(View, { style: styles.signatureLine }),
                e(Text, { style: styles.signatureHint }, 'Ort, Datum')
              ),
              e(View, { style: { marginBottom: 10 } },
                e(View, { style: styles.signatureLine }),
                e(Text, { style: styles.signatureHint }, 'Unterschrift')
              ),
              e(Text, { style: styles.signatureName }, resolvedParties.partyBName || partyLabels.partyB)
            )
          ),
          e(View, { style: styles.verificationContainer },
            qrCode && e(Image, { src: qrCode, style: styles.qrCode }),
            e(Text, { style: styles.verificationText }, `ID: ${documentId?.substring(0, 16) || 'N/A'}`)
          ),
          e(View, { style: styles.attachmentsBox },
            e(Text, { style: styles.attachmentsTitle }, hasAttachments ? `Anlagen (${attachments.length})` : 'Anlagen'),
            e(Text, { style: styles.attachmentsText }, attachmentsList)
          )
        )
      ),
      // Fixed Footer
      e(Text, { style: { ...footerLeft, left: 58 }, fixed: true }, `ID: ${docIdShort}`),
      e(Text, {
        style: footerCenter,
        fixed: true,
        render: (props) => `Seite ${props.pageNumber} von ${props.totalPages}`
      }),
      e(Text, { style: footerRight, fixed: true }, currentDate || '')
    );
  }

  // Standard Layout für Executive, Minimal, Elegant
  // wrap: false - SignaturePage passt immer auf eine Seite
  return e(Page, { size: 'A4', style: styles.page, wrap: false },
    e(View, { style: styles.signaturePage },
      e(Text, { style: styles.signatureTitle }, 'Unterschriften'),
      e(View, { style: styles.signatureColumns },
        e(View, { style: styles.signatureColumn },
          e(Text, { style: styles.signatureLabel }, partyLabels.partyA),
          e(View, { style: { marginBottom: 25 } },
            e(View, { style: styles.signatureLine }),
            e(Text, { style: styles.signatureHint }, 'Ort, Datum')
          ),
          e(View, { style: { marginBottom: 15 } },
            e(View, { style: styles.signatureLine }),
            e(Text, { style: styles.signatureHint }, 'Unterschrift')
          ),
          e(Text, { style: styles.signatureName }, resolvedParties.partyAName || partyLabels.partyA),
          // Signatur-Rolle basierend auf Profil-Typ: Business = Geschäftsführung, Personal = nichts
          (companyProfile?.companyName && !isPlaceholderCompanyName(companyProfile.companyName) && companyProfile?.profileType !== 'personal') && e(Text, { style: styles.signatureRole }, '(Geschäftsführung)')
        ),
        e(View, { style: styles.signatureColumn },
          e(Text, { style: styles.signatureLabel }, partyLabels.partyB),
          e(View, { style: { marginBottom: 25 } },
            e(View, { style: styles.signatureLine }),
            e(Text, { style: styles.signatureHint }, 'Ort, Datum')
          ),
          e(View, { style: { marginBottom: 15 } },
            e(View, { style: styles.signatureLine }),
            e(Text, { style: styles.signatureHint }, 'Unterschrift')
          ),
          e(Text, { style: styles.signatureName }, resolvedParties.partyBName || partyLabels.partyB),
          e(Text, { style: styles.signatureRole }, '(Name in Druckschrift)')
        )
      ),
      e(View, { style: styles.verificationContainer },
        qrCode && e(Image, { src: qrCode, style: styles.qrCode }),
        e(Text, { style: styles.verificationText }, 'Digitale Verifizierung'),
        e(Text, { style: styles.verificationText }, `ID: ${documentId?.substring(0, 20) || 'N/A'}`)
      ),
      e(View, { style: styles.attachmentsBox },
        e(Text, { style: styles.attachmentsTitle }, hasAttachments ? `Anlagen (${attachments.length})` : 'Anlagen'),
        e(Text, { style: styles.attachmentsText }, attachmentsList)
      )
    ),
    // Fixed Footer
    e(Text, { style: footerLeft, fixed: true }, `ID: ${docIdShort}`),
    e(Text, {
      style: footerCenter,
      fixed: true,
      render: (props) => `Seite ${props.pageNumber} von ${props.totalPages}`
    }),
    e(Text, { style: footerRight, fixed: true }, currentDate || '')
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// HAUPT-EXPORT FUNKTION
// ═══════════════════════════════════════════════════════════════════════════

const generatePDFv2 = async (contractText, companyProfile, contractType, parties = {}, isDraft = false, designVariant = 'executive', contractId = null, attachments = [], customDesign = null, pageBreaks = []) => {
  console.log('🎨 [V2 React-PDF] Starte PDF-Generierung...');
  console.log('📄 Vertragstyp:', contractType);
  console.log('🏢 Firma:', companyProfile?.companyName);
  console.log('🏢 Firmen-Details:', JSON.stringify({
    name: companyProfile?.companyName,
    street: companyProfile?.street,
    zip: companyProfile?.zip,
    city: companyProfile?.city,
    hasLogo: !!companyProfile?.logoUrl,
    logoUrlStart: companyProfile?.logoUrl?.substring(0, 50)
  }));
  console.log('🎭 Design:', designVariant);
  console.log('🎨 Custom Design:', customDesign ? JSON.stringify(customDesign) : 'N/A');
  console.log('👥 Parteien:', JSON.stringify(parties).substring(0, 100));
  console.log('📎 Anlagen:', attachments?.length || 0);

  const e = React.createElement;

  // Theme auswählen - Custom Design oder vordefiniertes Theme
  let theme;
  if (designVariant === 'custom' && customDesign) {
    // Custom Theme aus den User-Einstellungen erstellen
    theme = {
      name: 'Custom',
      fontFamily: customDesign.fontFamily || 'Helvetica',
      layout: customDesign.layout || 'classic-centered',
      colors: {
        primary: customDesign.primaryColor || '#0B1324',
        secondary: customDesign.secondaryColor || '#1A2540',
        accent: customDesign.accentColor || '#3B82F6',
        text: customDesign.primaryColor || '#0B1324',
        textLight: '#4B5563',
        textMuted: '#6B7280',
        border: '#E5E7EB',
        background: '#ffffff',
        headerBg: '#F9FAFB',
        line: customDesign.primaryColor || '#0B1324',
      },
      features: {
        showHeaderLine: true,
        showFooterLine: true,
        logoPosition: 'left',
        titleStyle: 'underlined',
        partyStyle: 'boxed',
        sectionStyle: 'numbered-bold',
      }
    };
    console.log('🎨 Verwende Custom Theme mit Farben:', theme.colors.primary, theme.colors.accent);
  } else {
    theme = DESIGN_THEMES[designVariant] || DESIGN_THEMES.executive;
    console.log('🎨 Verwende Theme:', theme.name);
  }

  // Styles basierend auf Theme erstellen
  const styles = createStyles(theme);

  // Logo zu Base64 konvertieren (wenn vorhanden)
  let logoBase64 = null;
  if (companyProfile?.logoUrl) {
    console.log('🖼️ Lade Logo von:', companyProfile.logoUrl.substring(0, 50) + '...');
    logoBase64 = await urlToBase64(companyProfile.logoUrl);
  }

  // Dokument-ID generieren (für Footer-Anzeige)
  const documentId = `DOC-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

  // QR-Code generieren — mit echter Contract-ID für funktionierende Verifizierung
  // contractId = MongoDB _id → /verify/:id Route findet den Vertrag in der DB
  const verifyId = contractId || documentId;
  const qrCode = await generateQRCode(`https://contract-ai.de/verify/${verifyId}`);

  // Parteien-Labels basierend auf Vertragstyp
  const partyLabels = getPartyLabels(contractType);

  // Universelle Parteinamen-Auflösung (unabhängig vom Vertragstyp)
  const resolvedParties = resolvePartyNames(parties);

  // 🔧 SMART PARTY NAMES: Extrahiere Namen aus dem Vertragstext (höchste Priorität!)
  // Der LLM-generierte Vertragstext hat die korrekte Groß-/Kleinschreibung
  const textParties = extractPartiesFromText(contractText);
  if (textParties) {
    console.log('📝 [PDF] Parteinamen aus Vertragstext extrahiert:', JSON.stringify(textParties));
    // Text-extrahierte Namen überschreiben Form-Daten (höchste Priorität)
    if (textParties.partyAName) resolvedParties.partyAName = textParties.partyAName;
    if (textParties.partyBName) resolvedParties.partyBName = textParties.partyBName;
    if (textParties.partyAAddress) resolvedParties.partyAAddress = textParties.partyAAddress;
    if (textParties.partyBAddress) resolvedParties.partyBAddress = textParties.partyBAddress;
  }

  // Proper Case als Sicherheitsnetz (falls Daten aus Formular ganz klein geschrieben sind)
  if (resolvedParties.partyAName) resolvedParties.partyAName = toProperCase(resolvedParties.partyAName);
  if (resolvedParties.partyBName) resolvedParties.partyBName = toProperCase(resolvedParties.partyBName);
  if (resolvedParties.partyAAddress) resolvedParties.partyAAddress = toProperCase(resolvedParties.partyAAddress);
  if (resolvedParties.partyBAddress) resolvedParties.partyBAddress = toProperCase(resolvedParties.partyBAddress);
  if (resolvedParties.partyACity) resolvedParties.partyACity = toProperCase(resolvedParties.partyACity);
  if (resolvedParties.partyBCity) resolvedParties.partyBCity = toProperCase(resolvedParties.partyBCity);

  console.log('👥 [PDF] Finale Parteinamen:', JSON.stringify(resolvedParties));

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
      resolvedParties,
      currentDate,
      documentId,
      isDraft,
      logoBase64
    }),

    // Seiten 2-N: Vertragsinhalt
    e(ContentPage, {
      styles,
      theme,
      sections,
      companyProfile,
      contractType,
      documentId,
      currentDate,
      pageBreaks
    }),

    // Letzte Seite: Unterschriften
    e(SignaturePage, {
      styles,
      theme,
      partyLabels,
      companyProfile,
      parties,
      resolvedParties,
      qrCode,
      documentId,
      currentDate,
      attachments,
      contractType
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
  resolvePartyNames,
  extractPartiesFromText,
  toProperCase,
  parseContractText,
  DESIGN_THEMES
};
