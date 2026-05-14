// 📄 analysisGutachtenPdf.js — Anwalts-Gutachten-PDF-Export für Vertragsanalysen.
// Strikt adaptive Output: nur Sektionen rendern, die echte Daten haben.
// Anti-Halluzinations-Regel: lieber Sektion weglassen als Floskel-Inhalt erfinden.
// Keine Standardtexte wie "Nicht angegeben" — nichts ist besser als nichts.

const ReactPDF = require('@react-pdf/renderer');
const { Document, Page, Text, View, StyleSheet, Image } = ReactPDF;
const React = require('react');
const e = React.createElement;

// ─────────────────────────────────────────────────────────────────────────────
// Palette — abgeglichen mit der V2-Frontend-Design-Sprache.
// ─────────────────────────────────────────────────────────────────────────────

const C = {
  ink: '#0f172a',
  text: '#334155',
  muted: '#64748b',
  faint: '#94a3b8',
  border: '#e5e7eb',
  hairline: '#f1f5f9',
  panel: '#f8fafc',
  brand: '#1d4ed8',
  brandLight: '#eff6ff',
  scoreGreen: '#10b981',
  scoreYellow: '#f59e0b',
  scoreRed: '#ef4444',
  amber: '#f59e0b',
  amberBg: '#fffbeb',
  amberBorder: '#fde68a',
  amberInk: '#92400e',
  greenBg: '#ecfdf5',
  greenBorder: '#a7f3d0',
  greenInk: '#065f46',
};

const ASYM_LABELS = {
  'balanced': 'Ausgewogen',
  'mostly-fair': 'Größtenteils ausgewogen',
  'one-sided': 'Einseitig',
  'heavily-one-sided': 'Stark einseitig',
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function safeStr(v) {
  if (v == null) return '';
  if (typeof v === 'string') return v.trim();
  if (typeof v === 'number') return String(v);
  return '';
}

function formatDate(d) {
  if (!d) return '';
  const dt = d instanceof Date ? d : new Date(d);
  if (isNaN(dt.getTime())) return '';
  const dd = String(dt.getDate()).padStart(2, '0');
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const yyyy = dt.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}

function scoreColor(n) {
  if (n == null || isNaN(n)) return C.muted;
  if (n >= 75) return C.scoreGreen;
  if (n >= 50) return C.scoreYellow;
  return C.scoreRed;
}

function scoreRating(n) {
  if (n == null || isNaN(n)) return '';
  if (n >= 85) return 'Sehr gut';
  if (n >= 70) return 'Gut';
  if (n >= 50) return 'Akzeptabel';
  if (n >= 30) return 'Kritisch';
  return 'Sehr kritisch';
}

function formatPct(v) {
  if (v == null || v === '') return '';
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  if (isNaN(n) || n <= 0) return '';
  return Math.round(n <= 1 ? n * 100 : n) + '%';
}

function pickRecommendations(contract) {
  const a = Array.isArray(contract?.analysis?.recommendations) ? contract.analysis.recommendations.filter(safeStr) : [];
  if (a.length) return a;
  const b = Array.isArray(contract?.optimierungen) ? contract.optimierungen.filter(safeStr) : [];
  return b;
}

function pickRisks(contract) {
  const ca = Array.isArray(contract?.analysis?.concerningAspects) ? contract.analysis.concerningAspects : [];
  if (ca.length) {
    return ca
      .map(x => ({
        title: safeStr(x?.title),
        description: safeStr(x?.description),
        impact: safeStr(x?.impact),
      }))
      .filter(x => x.title || x.description);
  }
  const r = Array.isArray(contract?.risiken) ? contract.risiken.filter(safeStr) : [];
  return r.map(s => ({ title: '', description: s, impact: '' }));
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  page: {
    paddingTop: 64,
    paddingBottom: 56,
    paddingHorizontal: 56,
    fontFamily: 'Helvetica',
    fontSize: 10.5,
    color: C.text,
    lineHeight: 1.55,
  },
  headerFixed: {
    position: 'absolute',
    top: 28,
    left: 56,
    right: 56,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.hairline,
    fontSize: 8.5,
    color: C.faint,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerBrand: {
    fontFamily: 'Helvetica',
    fontWeight: 'bold',
    color: C.ink,
    fontSize: 9,
    letterSpacing: 0.5,
  },
  headerSep: {
    color: C.border,
  },
  headerContract: {
    color: C.muted,
    fontSize: 8.5,
  },
  footerFixed: {
    position: 'absolute',
    bottom: 24,
    left: 56,
    right: 56,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: C.hairline,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    fontSize: 7.5,
    color: C.faint,
  },
  footerDisclaimer: {
    width: '70%',
    color: C.faint,
    lineHeight: 1.4,
  },
  footerPage: {
    color: C.muted,
    fontSize: 8,
  },

  // Cover
  coverWrap: {
    flexGrow: 1,
    justifyContent: 'space-between',
  },
  coverTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  coverBrandStack: {
    flexDirection: 'column',
  },
  coverBrandMark: {
    fontSize: 11,
    fontFamily: 'Helvetica',
    fontWeight: 'bold',
    color: C.ink,
    letterSpacing: 1,
  },
  coverBrandSub: {
    fontSize: 8.5,
    color: C.faint,
    marginTop: 2,
    letterSpacing: 0.5,
  },
  coverLogo: {
    maxHeight: 38,
    maxWidth: 130,
    objectFit: 'contain',
  },
  coverCenter: {
    marginTop: 80,
  },
  coverKicker: {
    fontSize: 9.5,
    color: C.brand,
    letterSpacing: 2,
    fontFamily: 'Helvetica',
    fontWeight: 'bold',
    marginBottom: 14,
    textTransform: 'uppercase',
  },
  coverTitle: {
    fontSize: 26,
    fontFamily: 'Helvetica',
    fontWeight: 'bold',
    color: C.ink,
    letterSpacing: -0.5,
    lineHeight: 1.2,
  },
  coverContractName: {
    marginTop: 18,
    fontSize: 14,
    color: C.text,
    lineHeight: 1.4,
  },
  coverMeta: {
    marginTop: 36,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 26,
  },
  coverMetaItem: {
    flexDirection: 'column',
  },
  coverMetaLabel: {
    fontSize: 8,
    color: C.faint,
    letterSpacing: 1.2,
    fontFamily: 'Helvetica',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  coverMetaValue: {
    fontSize: 11,
    color: C.ink,
  },
  coverFooter: {
    marginTop: 30,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: C.hairline,
    fontSize: 8,
    color: C.faint,
    lineHeight: 1.5,
  },

  // Section
  sectionWrap: {
    marginTop: 14,
  },
  sectionHeader: {
    marginBottom: 10,
  },
  sectionKicker: {
    fontSize: 8,
    color: C.faint,
    letterSpacing: 1.4,
    fontFamily: 'Helvetica',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: 'Helvetica',
    fontWeight: 'bold',
    color: C.ink,
    letterSpacing: -0.2,
  },

  // Score block
  scoreBlock: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 22,
    marginTop: 4,
    marginBottom: 14,
  },
  scoreNum: {
    fontSize: 56,
    fontFamily: 'Helvetica',
    fontWeight: 'bold',
    letterSpacing: -2,
    lineHeight: 1,
  },
  scoreSide: {
    flex: 1,
    paddingTop: 6,
  },
  scoreRatingLine: {
    fontSize: 12,
    fontFamily: 'Helvetica',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  scoreBarTrack: {
    height: 6,
    backgroundColor: C.hairline,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  scoreBarFill: {
    height: 6,
    borderRadius: 3,
  },
  scoreScale: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 7.5,
    color: C.faint,
  },
  scoreReasoning: {
    marginTop: 4,
    fontSize: 10.5,
    color: C.text,
    lineHeight: 1.6,
  },

  // Sub-blocks (asymmetry, completeness)
  subBlock: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: C.hairline,
  },
  subLabel: {
    fontSize: 8,
    color: C.faint,
    letterSpacing: 1.2,
    fontFamily: 'Helvetica',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  subValue: {
    fontSize: 11,
    fontFamily: 'Helvetica',
    fontWeight: 'bold',
    color: C.ink,
    marginBottom: 4,
  },
  subDetail: {
    fontSize: 10,
    color: C.muted,
    marginBottom: 3,
  },
  subText: {
    fontSize: 10,
    color: C.text,
    lineHeight: 1.55,
    marginTop: 3,
  },

  // Badges (inline pill row)
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
    fontSize: 9,
    fontFamily: 'Helvetica',
    fontWeight: 'bold',
  },

  // Risks / Recommendations list
  itemWrap: {
    marginBottom: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: C.hairline,
  },
  itemFirst: {
    borderTopWidth: 0,
    paddingTop: 0,
  },
  itemHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 4,
  },
  itemNum: {
    fontSize: 10,
    fontFamily: 'Helvetica',
    fontWeight: 'bold',
    color: C.faint,
    width: 22,
    paddingTop: 1,
  },
  itemBody: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 11.5,
    fontFamily: 'Helvetica',
    fontWeight: 'bold',
    color: C.ink,
    marginBottom: 3,
    lineHeight: 1.35,
  },
  itemDesc: {
    fontSize: 10.5,
    color: C.text,
    lineHeight: 1.55,
  },
  itemImpact: {
    marginTop: 4,
    fontSize: 9.5,
    color: C.muted,
    fontStyle: 'italic',
    lineHeight: 1.5,
  },

  // Disclaimer
  disclaimerWrap: {
    marginTop: 24,
    padding: 14,
    backgroundColor: C.panel,
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: C.brand,
  },
  disclaimerTitle: {
    fontSize: 9.5,
    fontFamily: 'Helvetica',
    fontWeight: 'bold',
    color: C.ink,
    letterSpacing: 0.4,
    marginBottom: 5,
  },
  disclaimerText: {
    fontSize: 8.5,
    color: C.muted,
    lineHeight: 1.55,
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// Components
// ─────────────────────────────────────────────────────────────────────────────

function HeaderFixed({ contractName }) {
  return e(View, { style: styles.headerFixed, fixed: true },
    e(View, { style: styles.headerLeft },
      e(Text, { style: styles.headerBrand }, 'CONTRACT AI'),
      e(Text, { style: styles.headerSep }, '·'),
      e(Text, { style: styles.headerContract }, 'Anwalts-Gutachten'),
    ),
    e(Text, { style: styles.headerContract }, contractName || ''),
  );
}

function FooterFixed() {
  return e(View, { style: styles.footerFixed, fixed: true },
    e(Text, { style: styles.footerDisclaimer },
      'Dieses Gutachten ist eine KI-gestützte Vorprüfung und ersetzt keine individuelle Rechtsberatung nach RDG. Erstellt durch Contract AI.',
    ),
    e(Text, {
      style: styles.footerPage,
      render: ({ pageNumber, totalPages }) => `Seite ${pageNumber} / ${totalPages}`,
    }),
  );
}

function CoverPage({ contract, companyProfile, analysisDate }) {
  const score = typeof contract?.contractScore === 'number' ? contract.contractScore : null;
  const contractType = safeStr(contract?.analysis?.contractType) || safeStr(contract?.contractType);
  const provider = safeStr(contract?.analysis?.parties?.provider) || safeStr(contract?.provider?.name);
  const customer = safeStr(contract?.analysis?.parties?.customer);
  const company = safeStr(companyProfile?.companyName);
  const hasLogo = !!safeStr(companyProfile?.logoUrl);

  const metaItems = [];
  if (analysisDate) metaItems.push({ label: 'Analyse erstellt', value: formatDate(analysisDate) });
  if (contractType) metaItems.push({ label: 'Vertragsart', value: contractType });
  if (provider) metaItems.push({ label: 'Anbieter', value: provider });
  if (customer) metaItems.push({ label: 'Vertragspartner', value: customer });
  if (score != null) metaItems.push({ label: 'Score', value: `${Math.round(score)} / 100` });

  return e(View, { style: styles.coverWrap },
    e(View, { style: styles.coverTopRow },
      e(View, { style: styles.coverBrandStack },
        e(Text, { style: styles.coverBrandMark }, 'CONTRACT AI'),
        e(Text, { style: styles.coverBrandSub }, 'Rechtliche Vorprüfung'),
      ),
      hasLogo
        ? e(Image, { src: companyProfile.logoUrl, style: styles.coverLogo })
        : (company ? e(Text, { style: styles.coverBrandMark }, company.toUpperCase()) : null),
    ),

    e(View, { style: styles.coverCenter },
      e(Text, { style: styles.coverKicker }, 'Anwaltsgutachten · Vertragsanalyse'),
      e(Text, { style: styles.coverTitle }, 'Rechtliche Bewertung\nIhres Vertrags'),
      e(Text, { style: styles.coverContractName }, safeStr(contract?.name) || safeStr(contract?.title) || 'Unbenannter Vertrag'),

      metaItems.length > 0 && e(View, { style: styles.coverMeta },
        ...metaItems.map((it, i) =>
          e(View, { key: `meta-${i}`, style: styles.coverMetaItem },
            e(Text, { style: styles.coverMetaLabel }, it.label),
            e(Text, { style: styles.coverMetaValue }, it.value),
          ),
        ),
      ),
    ),

    e(View, { style: styles.coverFooter },
      e(Text, null,
        'Erstellt durch Contract AI auf Basis Ihrer hochgeladenen Vertragsdaten. Die rechtliche Bewertung erfolgt KI-gestützt und ersetzt keine anwaltliche Beratung. Für verbindliche Auskünfte konsultieren Sie bitte einen Rechtsanwalt.',
      ),
    ),
  );
}

function ScoreSection({ contract }) {
  const score = typeof contract?.contractScore === 'number' ? contract.contractScore : null;
  const reasoning = safeStr(contract?.scoreReasoning);
  const asym = contract?.asymmetryAssessment || null;
  const completeness = contract?.completeness || null;

  if (score == null && !reasoning && !asym && !completeness) return null;

  const color = scoreColor(score);
  const rating = scoreRating(score);
  const pct = score != null ? Math.max(0, Math.min(100, score)) : 0;

  const asymKey = asym?.rating ? String(asym.rating).toLowerCase().replace(/_/g, '-') : '';
  const asymLabel = ASYM_LABELS[asymKey];
  const asymFav = safeStr(asym?.favoredParty);
  const asymExp = safeStr(asym?.explanation);
  const showAsym = !!asymLabel;

  const compObs = safeStr(completeness?.observation);
  const compIsComplete = completeness?.isComplete;
  const compOpen = Array.isArray(completeness?.openItems) ? completeness.openItems.filter(safeStr) : [];
  const showCompleteness = compIsComplete != null || compObs || compOpen.length > 0;

  return e(View, { style: styles.sectionWrap },
    e(View, { style: styles.sectionHeader },
      e(Text, { style: styles.sectionKicker }, '01 · Gesamtbewertung'),
      e(Text, { style: styles.sectionTitle }, 'Score und rechtliche Einordnung'),
    ),

    e(View, { style: styles.scoreBlock },
      score != null
        ? e(Text, { style: [styles.scoreNum, { color }] }, String(Math.round(score)))
        : e(Text, { style: [styles.scoreNum, { color: C.faint }] }, '—'),

      e(View, { style: styles.scoreSide },
        rating && e(Text, { style: [styles.scoreRatingLine, { color }] }, rating),
        e(View, { style: styles.scoreBarTrack },
          e(View, { style: [styles.scoreBarFill, { width: `${pct}%`, backgroundColor: color }] }),
        ),
        e(View, { style: styles.scoreScale },
          e(Text, null, '0 kritisch'),
          e(Text, null, '50 akzeptabel'),
          e(Text, null, '100 optimal'),
        ),
      ),
    ),

    reasoning && e(Text, { style: styles.scoreReasoning }, reasoning),

    showAsym && e(View, { style: styles.subBlock },
      e(Text, { style: styles.subLabel }, 'Ausgewogenheit der Vertragsgestaltung'),
      e(Text, { style: styles.subValue }, asymLabel),
      asymFav && asymFav !== 'null' && e(Text, { style: styles.subDetail }, `Bevorzugte Partei: ${asymFav}`),
      asymExp && e(Text, { style: styles.subText }, asymExp),
    ),

    showCompleteness && e(View, { style: styles.subBlock },
      e(Text, { style: styles.subLabel }, 'Vollständigkeit der Analyse'),
      compIsComplete != null && e(Text, { style: styles.subValue },
        compIsComplete === false
          ? `Eingeschränkt — ${compOpen.length} offene${compOpen.length === 1 ? 'r' : ''} Punkt${compOpen.length === 1 ? '' : 'e'}`
          : 'Vollständig',
      ),
      compObs && e(Text, { style: styles.subText }, compObs),
      compOpen.length > 0 && e(View, { style: { marginTop: 6 } },
        ...compOpen.slice(0, 6).map((it, i) =>
          e(Text, { key: `co-${i}`, style: { fontSize: 9.5, color: C.muted, lineHeight: 1.55 } },
            `•  ${it}`,
          ),
        ),
      ),
    ),
  );
}

function RisksSection({ contract, sectionNumber }) {
  const risks = pickRisks(contract);
  if (!risks.length) return null;

  return e(View, { style: styles.sectionWrap, break: true },
    e(View, { style: styles.sectionHeader },
      e(Text, { style: styles.sectionKicker }, `${String(sectionNumber).padStart(2, '0')} · Risiken und kritische Punkte`),
      e(Text, { style: styles.sectionTitle },
        risks.length === 1 ? 'Identifiziertes Risiko' : `${risks.length} identifizierte Risiken`,
      ),
    ),

    ...risks.map((r, i) =>
      e(View, { key: `risk-${i}`, style: [styles.itemWrap, i === 0 && styles.itemFirst].filter(Boolean), wrap: false },
        e(View, { style: styles.itemHeaderRow },
          e(Text, { style: styles.itemNum }, String(i + 1).padStart(2, '0')),
          e(View, { style: styles.itemBody },
            r.title && e(Text, { style: styles.itemTitle }, r.title),
            r.description && e(Text, { style: styles.itemDesc }, r.description),
            r.impact && e(Text, { style: styles.itemImpact }, `Auswirkung: ${r.impact}`),
          ),
        ),
      ),
    ),
  );
}

function RecommendationsSection({ contract, sectionNumber }) {
  const recs = pickRecommendations(contract);
  if (!recs.length) return null;

  return e(View, { style: styles.sectionWrap, break: true },
    e(View, { style: styles.sectionHeader },
      e(Text, { style: styles.sectionKicker }, `${String(sectionNumber).padStart(2, '0')} · Handlungsempfehlungen`),
      e(Text, { style: styles.sectionTitle },
        recs.length === 1 ? 'Empfohlene Maßnahme' : `${recs.length} empfohlene Maßnahmen`,
      ),
    ),

    ...recs.map((r, i) =>
      e(View, { key: `rec-${i}`, style: [styles.itemWrap, i === 0 && styles.itemFirst].filter(Boolean), wrap: false },
        e(View, { style: styles.itemHeaderRow },
          e(Text, { style: styles.itemNum }, String(i + 1).padStart(2, '0')),
          e(View, { style: styles.itemBody },
            e(Text, { style: styles.itemDesc }, safeStr(r)),
          ),
        ),
      ),
    ),
  );
}

function DisclaimerBlock() {
  return e(View, { style: styles.disclaimerWrap, wrap: false },
    e(Text, { style: styles.disclaimerTitle }, 'RECHTLICHER HINWEIS'),
    e(Text, { style: styles.disclaimerText },
      'Dieses Gutachten wurde KI-gestützt erstellt und stellt keine individuelle Rechtsberatung im Sinne des Rechtsdienstleistungsgesetzes (RDG) dar. Es ersetzt keine Beratung durch einen zugelassenen Rechtsanwalt. Die rechtliche Bewertung basiert auf dem hochgeladenen Vertragstext und kann durch Aspekte beeinflusst werden, die der KI nicht zugänglich waren. Für verbindliche rechtliche Auskünfte konsultieren Sie bitte einen Fachanwalt.',
    ),
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Document
// ─────────────────────────────────────────────────────────────────────────────

function GutachtenDocument({ contract, companyProfile }) {
  const contractName = safeStr(contract?.name) || safeStr(contract?.title) || 'Vertragsanalyse';
  const analysisDate =
    contract?.analysisCompletedAt ||
    contract?.analysis?.analyzedAt ||
    contract?.updatedAt ||
    contract?.createdAt ||
    new Date();

  // Section-Nummerierung: 01 = Score (immer wenn Daten da), 02/03 = Risiken/Empfehlungen wenn vorhanden.
  const hasRisks = pickRisks(contract).length > 0;
  let nextNum = 2;
  const risksNum = hasRisks ? nextNum++ : null;
  const recsNum = pickRecommendations(contract).length > 0 ? nextNum : null;

  return e(Document, {
    title: `Anwalts-Gutachten · ${contractName}`,
    author: 'Contract AI',
    subject: 'KI-gestützte Vertragsanalyse',
    creator: 'Contract AI',
  },
    // Page 1: Cover (kein Header/Footer)
    e(Page, { size: 'A4', style: [styles.page, { paddingTop: 56, paddingBottom: 48 }] },
      e(CoverPage, { contract, companyProfile, analysisDate }),
    ),

    // Page 2+: Content mit Header/Footer
    e(Page, { size: 'A4', style: styles.page },
      e(HeaderFixed, { contractName }),
      e(FooterFixed),
      e(ScoreSection, { contract }),
      hasRisks && e(RisksSection, { contract, sectionNumber: risksNum }),
      recsNum && e(RecommendationsSection, { contract, sectionNumber: recsNum }),
      e(DisclaimerBlock),
    ),
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Entry
// ─────────────────────────────────────────────────────────────────────────────

async function generateGutachtenPdf({ contract, companyProfile }) {
  if (!contract) throw new Error('generateGutachtenPdf: contract is required');
  const docElement = e(GutachtenDocument, { contract, companyProfile: companyProfile || null });
  return await ReactPDF.renderToBuffer(docElement);
}

module.exports = {
  generateGutachtenPdf,
};
