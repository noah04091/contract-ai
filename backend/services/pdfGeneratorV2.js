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
// DESIGN THEMES - 5 EINZIGARTIGE Varianten mit unterschiedlichen LAYOUTS
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
  // MODERN - Farbige Sidebar, asymmetrisch, dynamisch
  // ═══════════════════════════════════════════════════════════════════════════
  modern: {
    name: 'Modern',
    fontFamily: 'Helvetica',
    layout: 'sidebar-accent', // Farbige Sidebar links
    colors: {
      primary: '#0066cc',
      secondary: '#0052a3',
      accent: '#00a3cc',
      text: '#2d2d2d',
      textLight: '#5a5a5a',
      textMuted: '#8a8a8a',
      border: '#e0e0e0',
      background: '#ffffff',
      headerBg: '#0066cc',
      line: '#0066cc',
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
  // ELEGANT - Goldene Akzente, Ornamente, luxuriös
  // ═══════════════════════════════════════════════════════════════════════════
  elegant: {
    name: 'Elegant',
    fontFamily: 'Times-Roman',
    layout: 'ornamental', // Dekorative Elemente
    colors: {
      primary: '#2c1810',
      secondary: '#4a3728',
      accent: '#c9a227',
      text: '#2c1810',
      textLight: '#5a4a3a',
      textMuted: '#8a7a6a',
      border: '#c9a227',
      background: '#fffef8',
      headerBg: '#faf8f5',
      line: '#c9a227',
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
  // CORPORATE - Strukturierte Boxen, formell, klare Hierarchie
  // ═══════════════════════════════════════════════════════════════════════════
  corporate: {
    name: 'Corporate',
    fontFamily: 'Helvetica',
    layout: 'structured-boxes', // Klare Box-Struktur
    colors: {
      primary: '#003366',
      secondary: '#004080',
      accent: '#0066cc',
      text: '#1a1a1a',
      textLight: '#4a4a4a',
      textMuted: '#6a6a6a',
      border: '#003366',
      background: '#ffffff',
      headerBg: '#003366',
      line: '#003366',
    },
    features: {
      showHeaderBar: true,
      logoPosition: 'left',
      titleStyle: 'white-on-dark',
      partyStyle: 'structured-table',
      sectionStyle: 'boxed-header',
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
  console.log('🔍 parseContractText aufgerufen');
  console.log('📝 Text-Typ:', typeof text);
  console.log('📝 Text-Länge:', text?.length || 0);
  console.log('📝 Erste 500 Zeichen:', text?.substring(0, 500));

  if (!text || typeof text !== 'string') {
    console.log('⚠️ KEIN TEXT oder kein String übergeben!');
    return [];
  }

  const lines = text.split('\n');
  console.log('📝 Anzahl Zeilen:', lines.length);

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

// ═══════════════════════════════════════════════════════════════════════════
// DESIGN-SPEZIFISCHE STYLE-GENERATOREN
// ═══════════════════════════════════════════════════════════════════════════

const createExecutiveStyles = (theme) => {
  const c = theme.colors;
  return StyleSheet.create({
    page: { fontFamily: theme.fontFamily, fontSize: 11, padding: 50, lineHeight: 1.5, color: c.text },
    // Deckblatt - Klassisch zentriert
    coverPage: { flex: 1 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', borderBottomWidth: 2, borderBottomColor: c.line, paddingBottom: 15, marginBottom: 30 },
    logo: { width: 60, height: 60, objectFit: 'contain' },
    companyInfo: { textAlign: 'right', fontSize: 9, color: c.textLight },
    companyName: { fontSize: 11, fontWeight: 'bold', color: c.primary, marginBottom: 2 },
    titleContainer: { alignItems: 'center', marginTop: 80, marginBottom: 60 },
    titleLine: { width: 100, height: 2, backgroundColor: c.line, marginBottom: 15 },
    title: { fontSize: 26, fontWeight: 'bold', letterSpacing: 4, color: c.primary, textTransform: 'uppercase' },
    titleLineBottom: { width: 100, height: 2, backgroundColor: c.line, marginTop: 15 },
    subtitle: { fontSize: 11, color: c.textLight, marginTop: 20, fontStyle: 'italic' },
    partiesContainer: { marginTop: 40 },
    partiesLabel: { fontSize: 11, color: c.textLight, textAlign: 'center', marginVertical: 15 },
    partyBox: { borderWidth: 1, borderColor: c.border, padding: 15, marginHorizontal: 40, marginBottom: 10, backgroundColor: c.headerBg },
    partyName: { fontSize: 12, fontWeight: 'bold', color: c.primary, marginBottom: 3 },
    partyAddress: { fontSize: 10, color: c.textLight },
    partyRole: { fontSize: 9, fontStyle: 'italic', color: c.textMuted, marginTop: 8 },
    footer: { position: 'absolute', bottom: 30, left: 50, right: 50, flexDirection: 'row', justifyContent: 'space-between', fontSize: 8, color: c.textMuted, borderTopWidth: 1, borderTopColor: c.border, paddingTop: 10 },
    // Content Styles
    contentPage: { flex: 1 },
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
    // Signature Styles
    signaturePage: { flex: 1 },
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
    page: { fontFamily: theme.fontFamily, fontSize: 11, padding: 0, lineHeight: 1.6, color: c.text },
    // Deckblatt - Mit Sidebar
    coverPage: { flex: 1, flexDirection: 'row' },
    sidebar: { width: 8, backgroundColor: c.primary },
    mainContent: { flex: 1, padding: 40 },
    header: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 30 },
    logo: { width: 80, height: 80, objectFit: 'contain' },
    companyInfo: { textAlign: 'right', fontSize: 9, color: c.textLight, marginTop: 10 },
    companyName: { fontSize: 12, fontWeight: 'bold', color: c.primary, marginBottom: 3 },
    titleContainer: { marginTop: 60, marginBottom: 50 },
    title: { fontSize: 32, fontWeight: 'bold', color: c.primary, textTransform: 'uppercase', letterSpacing: 2 },
    titleLine: { width: 60, height: 4, backgroundColor: c.accent, marginTop: 15 },
    subtitle: { fontSize: 12, color: c.textLight, marginTop: 15 },
    partiesContainer: { marginTop: 40 },
    partiesLabel: { fontSize: 10, color: c.accent, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 15 },
    partyBox: { backgroundColor: c.background, borderLeftWidth: 3, borderLeftColor: c.primary, padding: 15, marginBottom: 20 },
    partyName: { fontSize: 13, fontWeight: 'bold', color: c.primary },
    partyAddress: { fontSize: 10, color: c.textLight, marginTop: 3 },
    partyRole: { fontSize: 9, color: c.accent, marginTop: 10 },
    footer: { position: 'absolute', bottom: 20, left: 48, right: 40, flexDirection: 'row', justifyContent: 'space-between', fontSize: 8, color: c.textMuted },
    // Content Styles
    contentPage: { flex: 1, flexDirection: 'row' },
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
    // Signature Styles
    signaturePage: { flex: 1, flexDirection: 'row' },
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
    page: { fontFamily: theme.fontFamily, fontSize: 10, padding: 60, lineHeight: 1.7, color: c.text },
    // Deckblatt - Ultra clean
    coverPage: { flex: 1, justifyContent: 'center' },
    header: { position: 'absolute', top: 0, left: 0, right: 0, alignItems: 'center', paddingTop: 40 },
    logo: { width: 50, height: 50, objectFit: 'contain', opacity: 0.8 },
    companyInfo: { textAlign: 'center', fontSize: 8, color: c.textMuted, marginTop: 10 },
    companyName: { fontSize: 9, color: c.textLight, letterSpacing: 2, textTransform: 'uppercase' },
    titleContainer: { alignItems: 'center' },
    title: { fontSize: 20, fontWeight: 'normal', letterSpacing: 8, color: c.primary, textTransform: 'uppercase' },
    titleLine: { display: 'none' },
    subtitle: { fontSize: 10, color: c.textMuted, marginTop: 30, letterSpacing: 1 },
    partiesContainer: { marginTop: 80 },
    partiesLabel: { fontSize: 9, color: c.textMuted, textAlign: 'center', marginVertical: 25, letterSpacing: 3, textTransform: 'uppercase' },
    partyBox: { alignItems: 'center', marginBottom: 15 },
    partyName: { fontSize: 11, color: c.primary, letterSpacing: 1 },
    partyAddress: { fontSize: 9, color: c.textMuted, marginTop: 3 },
    partyRole: { fontSize: 8, color: c.textMuted, marginTop: 10, fontStyle: 'italic' },
    footer: { position: 'absolute', bottom: 40, left: 60, right: 60, flexDirection: 'row', justifyContent: 'center', fontSize: 7, color: c.textMuted },
    // Content Styles
    contentPage: { flex: 1 },
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
    // Signature Styles - Minimal: klare, sichtbare Linien
    signaturePage: { flex: 1, justifyContent: 'center' },
    signatureTitle: { fontSize: 10, textAlign: 'center', color: c.textMuted, letterSpacing: 4, textTransform: 'uppercase', marginBottom: 60 },
    signatureColumns: { flexDirection: 'row', justifyContent: 'space-around' },
    signatureColumn: { width: '40%' },
    signatureLabel: { fontSize: 8, color: c.textMuted, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 40 },
    signatureLine: { borderBottomWidth: 1, borderBottomColor: c.text, marginBottom: 8, height: 1 },
    signatureHint: { fontSize: 7, color: c.textMuted },
    signatureName: { fontSize: 9, marginTop: 20, color: c.textLight },
    signatureRole: { fontSize: 7, color: c.textMuted },
    verificationContainer: { alignItems: 'center', marginTop: 80 },
    qrCode: { width: 50, height: 50, opacity: 0.7 },
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
    page: { fontFamily: theme.fontFamily, fontSize: 11, padding: 40, lineHeight: 1.6, color: c.text, backgroundColor: c.background },
    // Deckblatt - Ornamental (kompakter für eine Seite)
    coverPage: { flex: 1 },
    header: { alignItems: 'center', marginBottom: 10 },
    ornamentTop: { width: 200, height: 2, backgroundColor: c.accent, marginBottom: 5 },
    ornamentTopInner: { width: 100, height: 1, backgroundColor: c.accent },
    logo: { width: 60, height: 60, objectFit: 'contain', marginTop: 15 },
    companyInfo: { textAlign: 'center', fontSize: 9, color: c.textLight, marginTop: 10 },
    companyName: { fontSize: 11, color: c.primary, letterSpacing: 2, marginBottom: 2 },
    titleContainer: { alignItems: 'center', marginTop: 25, marginBottom: 20 },
    titleOrnament: { width: 25, height: 25, borderWidth: 1, borderColor: c.accent, transform: 'rotate(45deg)', marginBottom: 12 },
    title: { fontSize: 24, color: c.primary, letterSpacing: 3, textTransform: 'uppercase' },
    titleLine: { width: 150, height: 1, backgroundColor: c.accent, marginTop: 10 },
    subtitle: { fontSize: 10, color: c.accent, marginTop: 10, fontStyle: 'italic' },
    partiesContainer: { marginTop: 15 },
    partiesLabel: { fontSize: 10, color: c.accent, textAlign: 'center', marginVertical: 10, fontStyle: 'italic' },
    partyBox: { borderWidth: 1, borderColor: c.border, padding: 12, marginHorizontal: 30, marginBottom: 8, backgroundColor: c.headerBg },
    partyName: { fontSize: 12, color: c.primary, textAlign: 'center' },
    partyAddress: { fontSize: 9, color: c.textLight, textAlign: 'center', marginTop: 3 },
    partyRole: { fontSize: 8, color: c.accent, textAlign: 'center', marginTop: 6, fontStyle: 'italic' },
    footer: { position: 'absolute', bottom: 25, left: 40, right: 40, alignItems: 'center' },
    footerOrnament: { width: 100, height: 1, backgroundColor: c.accent, marginBottom: 10 },
    footerText: { fontSize: 7, color: c.textMuted },
    // Content Styles
    contentPage: { flex: 1 },
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
    // Signature Styles - Elegant: klare, goldene Linien
    signaturePage: { flex: 1 },
    signatureTitle: { fontSize: 14, textAlign: 'center', color: c.primary, marginBottom: 50, borderBottomWidth: 1, borderBottomColor: c.accent, paddingBottom: 15 },
    signatureColumns: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 30 },
    signatureColumn: { width: '42%' },
    signatureLabel: { fontSize: 10, color: c.accent, fontStyle: 'italic', marginBottom: 35 },
    signatureLine: { borderBottomWidth: 1, borderBottomColor: c.accent, marginBottom: 8, height: 1 },
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
    page: { fontFamily: theme.fontFamily, fontSize: 10, padding: 0, lineHeight: 1.5, color: c.text, backgroundColor: '#ffffff' },
    // Deckblatt - Mit Header-Bar
    coverPage: { flex: 1, backgroundColor: '#ffffff', minHeight: '100%' },
    headerBar: { backgroundColor: c.primary, padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    logo: { width: 50, height: 50, objectFit: 'contain' },
    headerInfo: { color: '#ffffff', textAlign: 'right', fontSize: 8 },
    headerCompanyName: { fontSize: 10, fontWeight: 'bold', color: '#ffffff' },
    mainContent: { padding: 40 },
    titleContainer: { alignItems: 'center', marginTop: 50, marginBottom: 40, backgroundColor: c.headerBg, padding: 25 },
    title: { fontSize: 22, fontWeight: 'bold', color: '#ffffff', textTransform: 'uppercase', letterSpacing: 2 },
    titleLine: { display: 'none' },
    subtitle: { fontSize: 10, color: '#ffffff', marginTop: 10, opacity: 0.9 },
    partiesContainer: { marginTop: 30 },
    partiesLabel: { fontSize: 9, color: c.primary, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 },
    partyBox: { borderWidth: 1, borderColor: c.border, marginBottom: 15 },
    partyBoxHeader: { backgroundColor: '#f0f4f8', padding: 8, borderBottomWidth: 1, borderBottomColor: c.border },
    partyBoxContent: { padding: 12 },
    partyName: { fontSize: 11, fontWeight: 'bold', color: c.primary },
    partyAddress: { fontSize: 9, color: c.textLight },
    partyRole: { fontSize: 8, color: c.accent, fontWeight: 'bold' },
    footer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#f0f4f8', padding: 15, flexDirection: 'row', justifyContent: 'space-between', fontSize: 7, color: c.textMuted },
    // Content Styles - WICHTIG: minHeight entfernt da es Probleme verursachen kann
    contentPage: { flex: 1, backgroundColor: '#ffffff' },
    contentMain: { padding: 40, paddingTop: 30, backgroundColor: '#ffffff' },
    preambleContainer: { marginBottom: 25, backgroundColor: '#f8fafc', padding: 15, borderLeftWidth: 3, borderLeftColor: c.primary },
    preambleTitle: { fontSize: 10, fontWeight: 'bold', color: c.primary, textTransform: 'uppercase', marginBottom: 8 },
    preambleText: { fontSize: 9, color: c.textLight },
    sectionHeader: { fontSize: 11, fontWeight: 'bold', color: '#ffffff', backgroundColor: c.primary, padding: 8, marginTop: 20, marginBottom: 12 },
    numberedParagraph: { flexDirection: 'row', marginBottom: 8, paddingLeft: 10 },
    paragraphNumber: { width: 25, fontSize: 9, fontWeight: 'bold', color: c.primary },
    paragraphText: { flex: 1, fontSize: 9, textAlign: 'justify', color: c.text },
    letterItem: { flexDirection: 'row', marginLeft: 35, marginBottom: 5 },
    letterLabel: { width: 18, fontSize: 9, color: c.accent, fontWeight: 'bold' },
    letterContent: { flex: 1, fontSize: 9, color: c.text },
    bulletItem: { flexDirection: 'row', marginLeft: 35, marginBottom: 5 },
    bulletPoint: { width: 12, fontSize: 9, color: c.accent },
    bulletText: { flex: 1, fontSize: 9, color: c.text },
    paragraph: { fontSize: 9, marginBottom: 8, textAlign: 'justify', paddingLeft: 10, color: c.text },
    pageFooter: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#f0f4f8', padding: 10, flexDirection: 'row', justifyContent: 'space-between', fontSize: 7, color: c.textMuted },
    // Signature Styles
    signaturePage: { flex: 1, backgroundColor: '#ffffff' },
    signatureHeader: { backgroundColor: c.primary, padding: 15 },
    signatureTitle: { fontSize: 14, fontWeight: 'bold', color: '#ffffff', textAlign: 'center' },
    signatureMain: { padding: 40 },
    signatureColumns: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 30 },
    signatureColumn: { width: '45%', borderWidth: 1, borderColor: c.border, padding: 15 },
    signatureLabel: { fontSize: 9, fontWeight: 'bold', color: c.primary, textTransform: 'uppercase', marginBottom: 30, paddingBottom: 5, borderBottomWidth: 2, borderBottomColor: c.accent },
    signatureLine: { borderBottomWidth: 1, borderBottomColor: c.textLight, marginBottom: 5 },
    signatureHint: { fontSize: 7, color: c.textMuted },
    signatureName: { fontSize: 9, fontWeight: 'bold', marginTop: 15 },
    signatureRole: { fontSize: 7, color: c.textMuted },
    verificationContainer: { alignItems: 'center', marginTop: 40, padding: 15, backgroundColor: '#f8fafc' },
    qrCode: { width: 50, height: 50 },
    verificationText: { fontSize: 6, color: c.textMuted, marginTop: 5 },
    attachmentsBox: { marginTop: 30, borderWidth: 1, borderColor: c.border },
    attachmentsHeader: { backgroundColor: '#f0f4f8', padding: 8, borderBottomWidth: 1, borderBottomColor: c.border },
    attachmentsTitle: { fontSize: 8, fontWeight: 'bold', color: c.primary, textTransform: 'uppercase' },
    attachmentsContent: { padding: 10 },
    attachmentsText: { fontSize: 8, color: c.textMuted },
    watermark: { position: 'absolute', top: '35%', left: '15%', fontSize: 65, color: '#e8eef4', transform: 'rotate(-45deg)', opacity: 0.25 },
    companyInfo: { display: 'none' },
    companyName: { display: 'none' },
    header: { display: 'none' },
  });
};

// Style-Selector basierend auf Design
const createStyles = (theme) => {
  switch (theme.name) {
    case 'Modern': return createModernStyles(theme);
    case 'Minimal': return createMinimalStyles(theme);
    case 'Elegant': return createElegantStyles(theme);
    case 'Corporate': return createCorporateStyles(theme);
    default: return createExecutiveStyles(theme);
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// REACT-PDF KOMPONENTEN - Design-spezifisch
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Deckblatt-Komponente - passt sich dem Design an
 */
const CoverPage = ({ styles, theme, companyProfile, contractType, parties, partyLabels, currentDate, documentId, isDraft, logoBase64 }) => {
  const e = React.createElement;
  const c = theme.colors;
  const designName = theme.name;

  // Modern Design - mit Sidebar
  if (designName === 'Modern') {
    return e(Page, { size: 'A4', style: styles.page },
      isDraft && e(Text, { style: styles.watermark }, 'ENTWURF'),
      e(View, { style: styles.coverPage },
        e(View, { style: styles.sidebar }),
        e(View, { style: styles.mainContent },
          e(View, { style: styles.header },
            logoBase64 && e(Image, { src: logoBase64, style: styles.logo })
          ),
          companyProfile?.companyName && e(View, { style: styles.companyInfo },
            e(Text, { style: styles.companyName }, companyProfile.companyName),
            companyProfile?.street && e(Text, null, companyProfile.street),
            companyProfile?.zip && e(Text, null, `${companyProfile.zip} ${companyProfile.city || ''}`)
          ),
          e(View, { style: styles.titleContainer },
            e(Text, { style: styles.title }, contractType || 'VERTRAG'),
            e(View, { style: styles.titleLine }),
            e(Text, { style: styles.subtitle }, `geschlossen am ${currentDate}`)
          ),
          e(View, { style: styles.partiesContainer },
            e(Text, { style: styles.partiesLabel }, 'Vertragsparteien'),
            e(View, { style: styles.partyBox },
              e(Text, { style: styles.partyName }, companyProfile?.companyName || parties?.seller || '[Partei A]'),
              (companyProfile?.street || parties?.sellerAddress) && e(Text, { style: styles.partyAddress }, companyProfile?.street || parties?.sellerAddress),
              (companyProfile?.zip || parties?.sellerCity) && e(Text, { style: styles.partyAddress }, companyProfile?.zip ? `${companyProfile.zip} ${companyProfile.city || ''}` : parties?.sellerCity),
              e(Text, { style: styles.partyRole }, `– ${partyLabels.partyA} –`)
            ),
            e(View, { style: styles.partyBox },
              e(Text, { style: styles.partyName }, parties?.buyer || parties?.partyB || '[Partei B]'),
              parties?.buyerAddress && e(Text, { style: styles.partyAddress }, parties.buyerAddress),
              parties?.buyerCity && e(Text, { style: styles.partyAddress }, parties.buyerCity),
              e(Text, { style: styles.partyRole }, `– ${partyLabels.partyB} –`)
            )
          )
        )
      ),
      e(View, { style: styles.footer, fixed: true },
        e(Text, null, `ID: ${documentId?.substring(0, 12) || 'N/A'}`),
        e(Text, null, currentDate)
      )
    );
  }

  // Minimal Design - ultra clean
  if (designName === 'Minimal') {
    return e(Page, { size: 'A4', style: styles.page },
      isDraft && e(Text, { style: styles.watermark }, 'ENTWURF'),
      e(View, { style: styles.coverPage },
        e(View, { style: styles.header },
          logoBase64 && e(Image, { src: logoBase64, style: styles.logo }),
          companyProfile?.companyName && e(View, { style: styles.companyInfo },
            e(Text, { style: styles.companyName }, companyProfile.companyName)
          )
        ),
        e(View, { style: styles.titleContainer },
          e(Text, { style: styles.title }, contractType || 'VERTRAG'),
          e(Text, { style: styles.subtitle }, currentDate)
        ),
        e(View, { style: styles.partiesContainer },
          e(Text, { style: styles.partiesLabel }, 'zwischen'),
          e(View, { style: styles.partyBox },
            e(Text, { style: styles.partyName }, companyProfile?.companyName || parties?.seller || '[Partei A]'),
            (companyProfile?.street || parties?.sellerAddress) && e(Text, { style: styles.partyAddress }, companyProfile?.street || parties?.sellerAddress),
            e(Text, { style: styles.partyRole }, partyLabels.partyA)
          ),
          e(Text, { style: styles.partiesLabel }, 'und'),
          e(View, { style: styles.partyBox },
            e(Text, { style: styles.partyName }, parties?.buyer || parties?.partyB || '[Partei B]'),
            parties?.buyerAddress && e(Text, { style: styles.partyAddress }, parties.buyerAddress),
            e(Text, { style: styles.partyRole }, partyLabels.partyB)
          )
        )
      ),
      e(View, { style: styles.footer, fixed: true },
        e(Text, null, documentId?.substring(0, 16) || '')
      )
    );
  }

  // Elegant Design - mit Ornamenten
  if (designName === 'Elegant') {
    return e(Page, { size: 'A4', style: styles.page },
      isDraft && e(Text, { style: styles.watermark }, 'ENTWURF'),
      e(View, { style: styles.coverPage },
        e(View, { style: styles.header },
          e(View, { style: styles.ornamentTop }),
          e(View, { style: styles.ornamentTopInner }),
          logoBase64 && e(Image, { src: logoBase64, style: styles.logo }),
          companyProfile?.companyName && e(View, { style: styles.companyInfo },
            e(Text, { style: styles.companyName }, companyProfile.companyName),
            companyProfile?.street && e(Text, null, companyProfile.street),
            companyProfile?.zip && e(Text, null, `${companyProfile.zip} ${companyProfile.city || ''}`)
          )
        ),
        e(View, { style: styles.titleContainer },
          e(View, { style: styles.titleOrnament }),
          e(Text, { style: styles.title }, contractType || 'VERTRAG'),
          e(View, { style: styles.titleLine }),
          e(Text, { style: styles.subtitle }, `geschlossen am ${currentDate}`)
        ),
        e(View, { style: styles.partiesContainer },
          e(Text, { style: styles.partiesLabel }, '~ zwischen ~'),
          e(View, { style: styles.partyBox },
            e(Text, { style: styles.partyName }, companyProfile?.companyName || parties?.seller || '[Partei A]'),
            (companyProfile?.street || parties?.sellerAddress) && e(Text, { style: styles.partyAddress }, companyProfile?.street || parties?.sellerAddress),
            (companyProfile?.zip || parties?.sellerCity) && e(Text, { style: styles.partyAddress }, companyProfile?.zip ? `${companyProfile.zip} ${companyProfile.city || ''}` : parties?.sellerCity),
            e(Text, { style: styles.partyRole }, `– nachfolgend „${partyLabels.partyA}" genannt –`)
          ),
          e(Text, { style: styles.partiesLabel }, '~ und ~'),
          e(View, { style: styles.partyBox },
            e(Text, { style: styles.partyName }, parties?.buyer || parties?.partyB || '[Partei B]'),
            parties?.buyerAddress && e(Text, { style: styles.partyAddress }, parties.buyerAddress),
            parties?.buyerCity && e(Text, { style: styles.partyAddress }, parties.buyerCity),
            e(Text, { style: styles.partyRole }, `– nachfolgend „${partyLabels.partyB}" genannt –`)
          )
        )
      ),
      e(View, { style: styles.footer, fixed: true },
        e(View, { style: styles.footerOrnament }),
        e(Text, { style: styles.footerText }, `${documentId?.substring(0, 16) || ''} • ${currentDate}`)
      )
    );
  }

  // Corporate Design - mit Header-Bar
  if (designName === 'Corporate') {
    return e(Page, { size: 'A4', style: styles.page },
      isDraft && e(Text, { style: styles.watermark }, 'ENTWURF'),
      e(View, { style: styles.coverPage },
        e(View, { style: styles.headerBar },
          logoBase64 ? e(Image, { src: logoBase64, style: styles.logo }) : e(View, { style: { width: 50 } }),
          e(View, { style: styles.headerInfo },
            e(Text, { style: styles.headerCompanyName }, companyProfile?.companyName || ''),
            companyProfile?.street && e(Text, null, companyProfile.street),
            companyProfile?.zip && e(Text, null, `${companyProfile.zip} ${companyProfile.city || ''}`)
          )
        ),
        e(View, { style: styles.mainContent },
          e(View, { style: styles.titleContainer },
            e(Text, { style: styles.title }, contractType || 'VERTRAG'),
            e(Text, { style: styles.subtitle }, `Datum: ${currentDate}`)
          ),
          e(View, { style: styles.partiesContainer },
            e(Text, { style: styles.partiesLabel }, 'Partei A'),
            e(View, { style: styles.partyBox },
              e(View, { style: styles.partyBoxHeader },
                e(Text, { style: styles.partyRole }, partyLabels.partyA)
              ),
              e(View, { style: styles.partyBoxContent },
                e(Text, { style: styles.partyName }, companyProfile?.companyName || parties?.seller || '[Name]'),
                (companyProfile?.street || parties?.sellerAddress) && e(Text, { style: styles.partyAddress }, companyProfile?.street || parties?.sellerAddress),
                (companyProfile?.zip || parties?.sellerCity) && e(Text, { style: styles.partyAddress }, companyProfile?.zip ? `${companyProfile.zip} ${companyProfile.city || ''}` : parties?.sellerCity)
              )
            ),
            e(Text, { style: styles.partiesLabel }, 'Partei B'),
            e(View, { style: styles.partyBox },
              e(View, { style: styles.partyBoxHeader },
                e(Text, { style: styles.partyRole }, partyLabels.partyB)
              ),
              e(View, { style: styles.partyBoxContent },
                e(Text, { style: styles.partyName }, parties?.buyer || parties?.partyB || '[Name]'),
                parties?.buyerAddress && e(Text, { style: styles.partyAddress }, parties.buyerAddress),
                parties?.buyerCity && e(Text, { style: styles.partyAddress }, parties.buyerCity)
              )
            )
          )
        )
      ),
      e(View, { style: styles.footer, fixed: true },
        e(Text, null, `Dokument-ID: ${documentId?.substring(0, 16) || 'N/A'}`),
        e(Text, null, 'Seite 1'),
        e(Text, null, currentDate)
      )
    );
  }

  // Executive Design (Default) - klassisch zentriert
  return e(Page, { size: 'A4', style: styles.page },
    isDraft && e(Text, { style: styles.watermark }, 'ENTWURF'),
    e(View, { style: styles.coverPage },
      e(View, { style: styles.header },
        logoBase64 ? e(Image, { src: logoBase64, style: styles.logo }) : e(View, { style: { width: 60 } }),
        e(View, { style: styles.companyInfo },
          e(Text, { style: styles.companyName }, companyProfile?.companyName || ''),
          companyProfile?.street && e(Text, null, companyProfile.street),
          companyProfile?.zip && e(Text, null, `${companyProfile.zip} ${companyProfile.city || ''}`),
          companyProfile?.contactPhone && e(Text, null, `Tel: ${companyProfile.contactPhone}`),
          companyProfile?.contactEmail && e(Text, null, companyProfile.contactEmail)
        )
      ),
      e(View, { style: styles.titleContainer },
        e(View, { style: styles.titleLine }),
        e(Text, { style: styles.title }, contractType || 'VERTRAG'),
        e(View, { style: styles.titleLineBottom }),
        e(Text, { style: styles.subtitle }, `geschlossen am ${currentDate}`)
      ),
      e(View, { style: styles.partiesContainer },
        e(Text, { style: styles.partiesLabel }, 'zwischen'),
        e(View, { style: styles.partyBox },
          e(Text, { style: styles.partyName }, companyProfile?.companyName || parties?.seller || parties?.partyA || '[Vertragspartei A]'),
          (companyProfile?.street || parties?.sellerAddress || parties?.partyAAddress) && e(Text, { style: styles.partyAddress }, companyProfile?.street || parties?.sellerAddress || parties?.partyAAddress),
          (companyProfile?.zip || parties?.sellerCity || parties?.partyACity) && e(Text, { style: styles.partyAddress }, companyProfile?.zip ? `${companyProfile.zip} ${companyProfile.city || ''}` : (parties?.sellerCity || parties?.partyACity || '')),
          e(Text, { style: styles.partyRole }, `– nachfolgend „${partyLabels.partyA}" genannt –`)
        ),
        e(Text, { style: styles.partiesLabel }, 'und'),
        e(View, { style: styles.partyBox },
          e(Text, { style: styles.partyName }, parties?.buyer || parties?.partyB || parties?.buyerName || '[Vertragspartei B]'),
          (parties?.buyerAddress || parties?.partyBAddress) && e(Text, { style: styles.partyAddress }, parties?.buyerAddress || parties?.partyBAddress),
          (parties?.buyerCity || parties?.partyBCity) && e(Text, { style: styles.partyAddress }, parties?.buyerCity || parties?.partyBCity),
          e(Text, { style: styles.partyRole }, `– nachfolgend „${partyLabels.partyB}" genannt –`)
        )
      )
    ),
    e(View, { style: styles.footer, fixed: true },
      e(Text, null, `Dok-ID: ${documentId?.substring(0, 16) || 'N/A'}`),
      e(Text, null, 'Seite 1'),
      e(Text, null, currentDate)
    )
  );
};

/**
 * Inhalts-Seite Komponente
 */
const ContentPage = ({ styles, theme, sections, companyProfile, contractType }) => {
  const e = React.createElement;
  const designName = theme.name;

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

  // Modern/Corporate haben Sidebar-Layout
  if (designName === 'Modern') {
    return e(Page, { size: 'A4', style: styles.page },
      e(View, { style: styles.contentPage },
        e(View, { style: styles.sidebar }),
        e(View, { style: styles.contentMain },
          ...sections.map(renderSection)
        )
      ),
      e(View, { style: styles.pageFooter, fixed: true },
        e(Text, null, (contractType || 'Vertrag').toUpperCase()),
        e(Text, { render: ({ pageNumber }) => `Seite ${pageNumber}` })
      )
    );
  }

  if (designName === 'Corporate') {
    console.log('📊 Corporate ContentPage: Rendere', sections.length, 'Sections');
    sections.forEach((s, i) => console.log(`  Section ${i}: ${s.type} - ${s.title || 'no title'} (${s.content?.length || 0} items)`));

    return e(Page, { size: 'A4', style: styles.page },
      e(View, { style: styles.contentPage },
        e(View, { style: styles.contentMain },
          ...sections.map(renderSection)
        )
      ),
      e(View, { style: styles.pageFooter, fixed: true },
        e(Text, null, companyProfile?.companyName || ''),
        e(Text, null, (contractType || 'Vertrag').toUpperCase()),
        e(Text, { render: ({ pageNumber }) => `Seite ${pageNumber}` })
      )
    );
  }

  // Standard Layout
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
 * Unterschriften-Seite Komponente
 */
const SignaturePage = ({ styles, theme, partyLabels, companyProfile, parties, qrCode, documentId, currentDate }) => {
  const e = React.createElement;
  const designName = theme.name;

  // Corporate hat spezielle Struktur
  if (designName === 'Corporate') {
    return e(Page, { size: 'A4', style: styles.page },
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
              e(Text, { style: styles.signatureName }, companyProfile?.companyName || parties?.seller || partyLabels.partyA)
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
              e(Text, { style: styles.signatureName }, parties?.buyer || parties?.partyB || partyLabels.partyB)
            )
          ),
          e(View, { style: styles.verificationContainer },
            qrCode && e(Image, { src: qrCode, style: styles.qrCode }),
            e(Text, { style: styles.verificationText }, `Dok-ID: ${documentId?.substring(0, 20) || 'N/A'}`)
          ),
          e(View, { style: styles.attachmentsBox },
            e(View, { style: styles.attachmentsHeader },
              e(Text, { style: styles.attachmentsTitle }, 'Anlagen')
            ),
            e(View, { style: styles.attachmentsContent },
              e(Text, { style: styles.attachmentsText }, 'Diesem Vertrag sind keine Anlagen beigefügt.')
            )
          )
        )
      )
    );
  }

  // Modern hat Sidebar
  if (designName === 'Modern') {
    return e(Page, { size: 'A4', style: styles.page },
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
              e(Text, { style: styles.signatureName }, companyProfile?.companyName || parties?.seller || partyLabels.partyA)
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
              e(Text, { style: styles.signatureName }, parties?.buyer || parties?.partyB || partyLabels.partyB)
            )
          ),
          e(View, { style: styles.verificationContainer },
            qrCode && e(Image, { src: qrCode, style: styles.qrCode }),
            e(Text, { style: styles.verificationText }, `ID: ${documentId?.substring(0, 16) || 'N/A'}`)
          ),
          e(View, { style: styles.attachmentsBox },
            e(Text, { style: styles.attachmentsTitle }, 'Anlagen'),
            e(Text, { style: styles.attachmentsText }, 'Keine Anlagen beigefügt.')
          )
        )
      )
    );
  }

  // Standard Layout für Executive, Minimal, Elegant
  return e(Page, { size: 'A4', style: styles.page },
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
          e(Text, { style: styles.signatureName }, companyProfile?.companyName || parties?.seller || partyLabels.partyA),
          companyProfile?.companyName && e(Text, { style: styles.signatureRole }, '(Geschäftsführung)')
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
          e(Text, { style: styles.signatureName }, parties?.buyer || parties?.partyB || partyLabels.partyB),
          e(Text, { style: styles.signatureRole }, '(Name in Druckschrift)')
        )
      ),
      e(View, { style: styles.verificationContainer },
        qrCode && e(Image, { src: qrCode, style: styles.qrCode }),
        e(Text, { style: styles.verificationText }, 'Digitale Verifizierung'),
        e(Text, { style: styles.verificationText }, `ID: ${documentId?.substring(0, 20) || 'N/A'}`)
      ),
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

const generatePDFv2 = async (contractText, companyProfile, contractType, parties = {}, isDraft = false, designVariant = 'executive', contractId = null) => {
  console.log('🎨 [V2 React-PDF] Starte PDF-Generierung...');
  console.log('📄 Vertragstyp:', contractType);
  console.log('🏢 Firma:', companyProfile?.companyName);
  console.log('🔗 Contract-ID für QR:', contractId);
  console.log('🏢 Firmen-Details:', JSON.stringify({
    name: companyProfile?.companyName,
    street: companyProfile?.street,
    zip: companyProfile?.zip,
    city: companyProfile?.city,
    hasLogo: !!companyProfile?.logoUrl,
    logoUrlStart: companyProfile?.logoUrl?.substring(0, 50)
  }));
  console.log('🎭 Design:', designVariant);
  console.log('👥 Parteien:', JSON.stringify(parties).substring(0, 100));

  const e = React.createElement;

  // Theme auswählen (fallback zu executive)
  const theme = DESIGN_THEMES[designVariant] || DESIGN_THEMES.executive;
  console.log('🎨 Verwende Theme:', theme.name);

  // Styles basierend auf Theme erstellen
  const styles = createStyles(theme);

  // Logo zu Base64 konvertieren (wenn vorhanden)
  let logoBase64 = null;
  if (companyProfile?.logoUrl) {
    console.log('🖼️ Lade Logo von:', companyProfile.logoUrl.substring(0, 50) + '...');
    logoBase64 = await urlToBase64(companyProfile.logoUrl);
  }

  // Dokument-ID: Verwende Contract-ID falls vorhanden, sonst generiere eine zufällige
  const documentId = contractId || `DOC-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

  // QR-Code generieren - Link zur Verifizierungsseite
  const verifyUrl = contractId
    ? `https://contract-ai.de/verify/${contractId}`
    : `https://contract-ai.de/verify/${documentId}`;
  const qrCode = await generateQRCode(verifyUrl);
  console.log('🔗 QR-Code Verifizierungs-URL:', verifyUrl);

  // Parteien-Labels basierend auf Vertragstyp
  const partyLabels = getPartyLabels(contractType);

  // Vertragstext parsen
  const sections = parseContractText(contractText);
  console.log(`📊 ${sections.length} Abschnitte gefunden`);
  if (sections.length > 0) {
    console.log('📝 Erste 3 Sections:', sections.slice(0, 3).map(s => ({
      type: s.type,
      title: s.title || 'no title',
      contentCount: s.content?.length || 0
    })));
  } else {
    console.log('⚠️ KEINE SECTIONS GEFUNDEN! Vertragstext-Anfang:', contractText?.substring(0, 200));
  }

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
      isDraft,
      logoBase64
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

module.exports = {
  generatePDFv2,
  getPartyLabels,
  parseContractText,
  DESIGN_THEMES
};
