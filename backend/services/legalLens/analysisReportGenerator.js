// 📄 analysisReportGenerator.js - PDF-Generator für Legal Lens Analyse-Reports
// Professionelle PDF-Reports mit verschiedenen Design-Varianten

const ReactPDF = require('@react-pdf/renderer');
const { Document, Page, Text, View, StyleSheet, Font } = ReactPDF;
const React = require('react');

// ═══════════════════════════════════════════════════════════════════════════
// FONT REGISTRATION
// ═══════════════════════════════════════════════════════════════════════════

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
// DESIGN THEMES
// ═══════════════════════════════════════════════════════════════════════════

const DESIGN_THEMES = {
  executive: {
    name: 'Executive',
    fontFamily: 'Helvetica',
    colors: {
      primary: '#1e293b',
      secondary: '#334155',
      accent: '#3b82f6',
      danger: '#dc2626',
      warning: '#d97706',
      success: '#16a34a',
      text: '#1e293b',
      textLight: '#64748b',
      background: '#ffffff',
      headerBg: '#1e293b',
      cardBg: '#f8fafc'
    }
  },
  modern: {
    name: 'Modern',
    fontFamily: 'Helvetica',
    colors: {
      primary: '#0f172a',
      secondary: '#475569',
      accent: '#6366f1',
      danger: '#ef4444',
      warning: '#f59e0b',
      success: '#10b981',
      text: '#0f172a',
      textLight: '#64748b',
      background: '#ffffff',
      headerBg: '#6366f1',
      cardBg: '#f1f5f9'
    }
  },
  minimal: {
    name: 'Minimal',
    fontFamily: 'Helvetica',
    colors: {
      primary: '#18181b',
      secondary: '#3f3f46',
      accent: '#18181b',
      danger: '#dc2626',
      warning: '#ca8a04',
      success: '#16a34a',
      text: '#18181b',
      textLight: '#71717a',
      background: '#ffffff',
      headerBg: '#fafafa',
      cardBg: '#fafafa'
    }
  },
  detailed: {
    name: 'Detailed',
    fontFamily: 'Helvetica',
    colors: {
      primary: '#1e3a5f',
      secondary: '#2d4a6f',
      accent: '#2563eb',
      danger: '#b91c1c',
      warning: '#b45309',
      success: '#15803d',
      text: '#1e293b',
      textLight: '#64748b',
      background: '#ffffff',
      headerBg: '#1e3a5f',
      cardBg: '#f0f9ff'
    }
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// SHARED STYLES
// ═══════════════════════════════════════════════════════════════════════════

const createStyles = (theme) => StyleSheet.create({
  page: {
    backgroundColor: theme.colors.background,
    fontFamily: theme.fontFamily,
    padding: 40,
    fontSize: 10
  },
  // Cover Page
  coverPage: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
    padding: 60
  },
  coverTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.primary,
    textAlign: 'center',
    marginBottom: 8
  },
  coverSubtitle: {
    fontSize: 16,
    color: theme.colors.textLight,
    textAlign: 'center',
    marginBottom: 40
  },
  coverMeta: {
    marginTop: 60,
    padding: 20,
    borderTop: `1px solid ${theme.colors.textLight}`,
    width: '60%'
  },
  coverMetaItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  coverMetaLabel: {
    fontSize: 10,
    color: theme.colors.textLight
  },
  coverMetaValue: {
    fontSize: 10,
    fontWeight: 'bold',
    color: theme.colors.text
  },
  // Risk Score Circle (visual)
  riskScoreBox: {
    marginTop: 40,
    alignItems: 'center'
  },
  riskScoreValue: {
    fontSize: 48,
    fontWeight: 'bold'
  },
  riskScoreLabel: {
    fontSize: 12,
    color: theme.colors.textLight,
    marginTop: 4
  },
  // Page Header
  pageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 10,
    borderBottom: `2px solid ${theme.colors.accent}`
  },
  pageTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.primary
  },
  pageNumber: {
    fontSize: 9,
    color: theme.colors.textLight
  },
  // Sections
  section: {
    marginBottom: 20
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginBottom: 12,
    paddingBottom: 4,
    borderBottom: `1px solid ${theme.colors.accent}`
  },
  // Summary Boxes
  summaryGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20
  },
  summaryBox: {
    flex: 1,
    padding: 12,
    backgroundColor: theme.colors.cardBg,
    borderRadius: 4
  },
  summaryBoxTitle: {
    fontSize: 9,
    color: theme.colors.textLight,
    marginBottom: 4,
    textTransform: 'uppercase'
  },
  summaryBoxValue: {
    fontSize: 20,
    fontWeight: 'bold'
  },
  summaryBoxLabel: {
    fontSize: 8,
    color: theme.colors.textLight,
    marginTop: 2
  },
  // Risk Distribution
  riskBar: {
    height: 16,
    flexDirection: 'row',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8
  },
  riskBarSegment: {
    height: '100%'
  },
  riskLegend: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8
  },
  riskLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  riskLegendDot: {
    width: 8,
    height: 8,
    borderRadius: 4
  },
  riskLegendText: {
    fontSize: 9,
    color: theme.colors.textLight
  },
  // Clause Cards
  clauseCard: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: theme.colors.cardBg,
    borderRadius: 4,
    borderLeft: '4px solid'
  },
  clauseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  clauseNumber: {
    fontSize: 11,
    fontWeight: 'bold',
    color: theme.colors.primary
  },
  clauseRiskBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    fontSize: 8,
    fontWeight: 'bold',
    color: '#fff'
  },
  clauseText: {
    fontSize: 9,
    color: theme.colors.text,
    lineHeight: 1.5,
    marginBottom: 8
  },
  clauseSummary: {
    fontSize: 9,
    color: theme.colors.textLight,
    fontStyle: 'italic',
    marginBottom: 8
  },
  clauseAlternative: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#f0fdf4',
    borderRadius: 4
  },
  clauseAlternativeTitle: {
    fontSize: 8,
    fontWeight: 'bold',
    color: theme.colors.success,
    marginBottom: 4
  },
  clauseAlternativeText: {
    fontSize: 9,
    color: '#166534',
    lineHeight: 1.4
  },
  // Checklist
  checklistItem: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
    paddingBottom: 10,
    borderBottom: `1px solid ${theme.colors.cardBg}`
  },
  checklistPriority: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },
  checklistPriorityText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff'
  },
  checklistContent: {
    flex: 1
  },
  checklistTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 2
  },
  checklistIssue: {
    fontSize: 9,
    color: theme.colors.textLight,
    lineHeight: 1.4
  },
  // Footer
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 8,
    color: theme.colors.textLight,
    borderTop: `1px solid ${theme.colors.cardBg}`,
    paddingTop: 8
  },
  // Text utilities
  bold: {
    fontWeight: 'bold'
  },
  textMuted: {
    color: theme.colors.textLight
  },
  paragraph: {
    fontSize: 10,
    color: theme.colors.text,
    lineHeight: 1.6,
    marginBottom: 8
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

function getRiskColor(level, theme) {
  switch (level) {
    case 'high': return theme.colors.danger;
    case 'medium': return theme.colors.warning;
    case 'low': return theme.colors.success;
    default: return theme.colors.textLight;
  }
}

function getRiskLabel(level) {
  switch (level) {
    case 'high': return 'Hoch';
    case 'medium': return 'Mittel';
    case 'low': return 'Niedrig';
    default: return level;
  }
}

function getPriorityColor(priority, theme) {
  switch (priority) {
    case 1: return theme.colors.danger;
    case 2: return theme.colors.warning;
    case 3: return theme.colors.success;
    default: return theme.colors.textLight;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// DOCUMENT COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

// Cover Page Component
const CoverPage = ({ data, theme, styles }) => {
  const overallRisk = data.riskSummary?.overallRisk || 'medium';
  const riskScore = data.riskSummary?.averageScore || 50;

  return React.createElement(Page, { size: 'A4', style: styles.page },
    React.createElement(View, { style: styles.coverPage },
      React.createElement(Text, { style: styles.coverTitle }, 'Vertragsanalyse-Report'),
      React.createElement(Text, { style: styles.coverSubtitle }, data.contractName || 'Vertrag'),

      React.createElement(View, { style: styles.riskScoreBox },
        React.createElement(Text, {
          style: [styles.riskScoreValue, { color: getRiskColor(overallRisk, theme) }]
        }, `${riskScore}%`),
        React.createElement(Text, { style: styles.riskScoreLabel }, 'Gesamt-Risiko-Score')
      ),

      React.createElement(View, { style: styles.coverMeta },
        React.createElement(View, { style: styles.coverMetaItem },
          React.createElement(Text, { style: styles.coverMetaLabel }, 'Erstellt am:'),
          React.createElement(Text, { style: styles.coverMetaValue },
            new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
          )
        ),
        React.createElement(View, { style: styles.coverMetaItem },
          React.createElement(Text, { style: styles.coverMetaLabel }, 'Analysierte Klauseln:'),
          React.createElement(Text, { style: styles.coverMetaValue },
            `${data.clauses?.length || 0} Klauseln`
          )
        ),
        React.createElement(View, { style: styles.coverMetaItem },
          React.createElement(Text, { style: styles.coverMetaLabel }, 'Kritische Punkte:'),
          React.createElement(Text, { style: styles.coverMetaValue },
            `${data.riskSummary?.highRisk || 0} kritisch`
          )
        )
      )
    ),
    React.createElement(View, { style: styles.footer },
      React.createElement(Text, null, 'Legal Lens - Contract AI'),
      React.createElement(Text, null, 'Seite 1')
    )
  );
};

// Executive Summary Page
const ExecutiveSummaryPage = ({ data, theme, styles, pageNumber }) => {
  const riskSummary = data.riskSummary || {};
  const totalClauses = data.clauses?.length || 0;
  const highRisk = riskSummary.highRisk || 0;
  const mediumRisk = riskSummary.mediumRisk || 0;
  const lowRisk = riskSummary.lowRisk || 0;

  // Calculate percentages for risk bar
  const highPercent = totalClauses ? (highRisk / totalClauses) * 100 : 0;
  const mediumPercent = totalClauses ? (mediumRisk / totalClauses) * 100 : 0;
  const lowPercent = totalClauses ? (lowRisk / totalClauses) * 100 : 0;

  return React.createElement(Page, { size: 'A4', style: styles.page },
    React.createElement(View, { style: styles.pageHeader },
      React.createElement(Text, { style: styles.pageTitle }, 'Executive Summary'),
      React.createElement(Text, { style: styles.pageNumber }, `Seite ${pageNumber}`)
    ),

    // Summary Stats
    React.createElement(View, { style: styles.summaryGrid },
      React.createElement(View, { style: styles.summaryBox },
        React.createElement(Text, { style: styles.summaryBoxTitle }, 'Gesamt'),
        React.createElement(Text, { style: [styles.summaryBoxValue, { color: theme.colors.accent }] }, totalClauses),
        React.createElement(Text, { style: styles.summaryBoxLabel }, 'Klauseln analysiert')
      ),
      React.createElement(View, { style: styles.summaryBox },
        React.createElement(Text, { style: styles.summaryBoxTitle }, 'Kritisch'),
        React.createElement(Text, { style: [styles.summaryBoxValue, { color: theme.colors.danger }] }, highRisk),
        React.createElement(Text, { style: styles.summaryBoxLabel }, 'Hohe Risiko-Klauseln')
      ),
      React.createElement(View, { style: styles.summaryBox },
        React.createElement(Text, { style: styles.summaryBoxTitle }, 'Verhandeln'),
        React.createElement(Text, { style: [styles.summaryBoxValue, { color: theme.colors.warning }] }, mediumRisk),
        React.createElement(Text, { style: styles.summaryBoxLabel }, 'Mittlere Risiko-Klauseln')
      ),
      React.createElement(View, { style: styles.summaryBox },
        React.createElement(Text, { style: styles.summaryBoxTitle }, 'Akzeptabel'),
        React.createElement(Text, { style: [styles.summaryBoxValue, { color: theme.colors.success }] }, lowRisk),
        React.createElement(Text, { style: styles.summaryBoxLabel }, 'Niedrige Risiko-Klauseln')
      )
    ),

    // Risk Distribution Bar
    React.createElement(View, { style: styles.section },
      React.createElement(Text, { style: styles.sectionTitle }, 'Risiko-Verteilung'),
      React.createElement(View, { style: styles.riskBar },
        highPercent > 0 && React.createElement(View, {
          style: [styles.riskBarSegment, { width: `${highPercent}%`, backgroundColor: theme.colors.danger }]
        }),
        mediumPercent > 0 && React.createElement(View, {
          style: [styles.riskBarSegment, { width: `${mediumPercent}%`, backgroundColor: theme.colors.warning }]
        }),
        lowPercent > 0 && React.createElement(View, {
          style: [styles.riskBarSegment, { width: `${lowPercent}%`, backgroundColor: theme.colors.success }]
        })
      ),
      React.createElement(View, { style: styles.riskLegend },
        React.createElement(View, { style: styles.riskLegendItem },
          React.createElement(View, { style: [styles.riskLegendDot, { backgroundColor: theme.colors.danger }] }),
          React.createElement(Text, { style: styles.riskLegendText }, `Hoch (${highRisk})`)
        ),
        React.createElement(View, { style: styles.riskLegendItem },
          React.createElement(View, { style: [styles.riskLegendDot, { backgroundColor: theme.colors.warning }] }),
          React.createElement(Text, { style: styles.riskLegendText }, `Mittel (${mediumRisk})`)
        ),
        React.createElement(View, { style: styles.riskLegendItem },
          React.createElement(View, { style: [styles.riskLegendDot, { backgroundColor: theme.colors.success }] }),
          React.createElement(Text, { style: styles.riskLegendText }, `Niedrig (${lowRisk})`)
        )
      )
    ),

    // Top 3 Risks
    data.topRisks && data.topRisks.length > 0 && React.createElement(View, { style: styles.section },
      React.createElement(Text, { style: styles.sectionTitle }, 'Top 3 Risiken'),
      ...data.topRisks.slice(0, 3).map((risk, idx) =>
        React.createElement(View, {
          key: idx,
          style: [styles.clauseCard, { borderLeftColor: theme.colors.danger }]
        },
          React.createElement(View, { style: styles.clauseHeader },
            React.createElement(Text, { style: styles.clauseNumber }, `${idx + 1}. ${risk.title || `Klausel ${risk.clauseId}`}`),
            React.createElement(View, { style: [styles.clauseRiskBadge, { backgroundColor: theme.colors.danger }] },
              React.createElement(Text, null, `${risk.score}%`)
            )
          ),
          React.createElement(Text, { style: styles.clauseSummary }, risk.summary || risk.mainRisk)
        )
      )
    ),

    // Overall Recommendation
    React.createElement(View, { style: styles.section },
      React.createElement(Text, { style: styles.sectionTitle }, 'Empfehlung'),
      React.createElement(Text, { style: styles.paragraph },
        highRisk > 0
          ? `Dieser Vertrag enthält ${highRisk} kritische Klausel(n), die vor Unterzeichnung geprüft und nachverhandelt werden sollten. Eine juristische Beratung wird empfohlen.`
          : mediumRisk > 0
            ? `Der Vertrag enthält ${mediumRisk} verhandlungswürdige Punkt(e). Eine Nachverhandlung kann die Vertragsbedingungen zu Ihren Gunsten verbessern.`
            : 'Der Vertrag erscheint ausgewogen. Die analysierten Klauseln entsprechen weitgehend marktüblichen Standards.'
      )
    ),

    React.createElement(View, { style: styles.footer },
      React.createElement(Text, null, 'Legal Lens - Contract AI'),
      React.createElement(Text, null, `Seite ${pageNumber}`)
    )
  );
};

// Critical Clauses Page
const CriticalClausesPage = ({ clauses, theme, styles, pageNumber, startIndex = 0 }) => {
  return React.createElement(Page, { size: 'A4', style: styles.page },
    React.createElement(View, { style: styles.pageHeader },
      React.createElement(Text, { style: styles.pageTitle }, 'Kritische Klauseln'),
      React.createElement(Text, { style: styles.pageNumber }, `Seite ${pageNumber}`)
    ),

    ...clauses.map((clause, idx) => {
      const riskColor = getRiskColor(clause.riskLevel, theme);
      const hasAlternative = clause.alternative && clause.alternative.length > 0;

      return React.createElement(View, {
        key: idx,
        style: [styles.clauseCard, { borderLeftColor: riskColor }],
        wrap: false
      },
        React.createElement(View, { style: styles.clauseHeader },
          React.createElement(Text, { style: styles.clauseNumber },
            clause.number || `Klausel ${startIndex + idx + 1}`
          ),
          React.createElement(View, { style: [styles.clauseRiskBadge, { backgroundColor: riskColor }] },
            React.createElement(Text, null, getRiskLabel(clause.riskLevel))
          )
        ),
        React.createElement(Text, { style: styles.clauseText },
          clause.text?.substring(0, 300) + (clause.text?.length > 300 ? '...' : '')
        ),
        clause.summary && React.createElement(Text, { style: styles.clauseSummary },
          `Analyse: ${clause.summary}`
        ),
        hasAlternative && React.createElement(View, { style: styles.clauseAlternative },
          React.createElement(Text, { style: styles.clauseAlternativeTitle }, 'Bessere Alternative:'),
          React.createElement(Text, { style: styles.clauseAlternativeText }, clause.alternative)
        )
      );
    }),

    React.createElement(View, { style: styles.footer },
      React.createElement(Text, null, 'Legal Lens - Contract AI'),
      React.createElement(Text, null, `Seite ${pageNumber}`)
    )
  );
};

// Negotiation Checklist Page
const NegotiationChecklistPage = ({ checklist, theme, styles, pageNumber }) => {
  return React.createElement(Page, { size: 'A4', style: styles.page },
    React.createElement(View, { style: styles.pageHeader },
      React.createElement(Text, { style: styles.pageTitle }, 'Verhandlungs-Checkliste'),
      React.createElement(Text, { style: styles.pageNumber }, `Seite ${pageNumber}`)
    ),

    React.createElement(Text, { style: [styles.paragraph, { marginBottom: 16 }] },
      'Die folgenden Punkte sollten in Vertragsverhandlungen angesprochen werden:'
    ),

    ...checklist.map((item, idx) => {
      const priorityColor = getPriorityColor(item.priority, theme);

      return React.createElement(View, {
        key: idx,
        style: styles.checklistItem,
        wrap: false
      },
        React.createElement(View, { style: [styles.checklistPriority, { backgroundColor: priorityColor }] },
          React.createElement(Text, { style: styles.checklistPriorityText }, item.priority)
        ),
        React.createElement(View, { style: styles.checklistContent },
          React.createElement(Text, { style: styles.checklistTitle }, item.title),
          React.createElement(Text, { style: styles.checklistIssue }, item.issue),
          item.whatToSay && React.createElement(Text, {
            style: [styles.clauseSummary, { marginTop: 4 }]
          }, `"${item.whatToSay}"`)
        )
      );
    }),

    React.createElement(View, { style: styles.footer },
      React.createElement(Text, null, 'Legal Lens - Contract AI'),
      React.createElement(Text, null, `Seite ${pageNumber}`)
    )
  );
};

// Main Document Component
const AnalysisReportDocument = ({ data, design, includeSections }) => {
  const theme = DESIGN_THEMES[design] || DESIGN_THEMES.executive;
  const styles = createStyles(theme);
  let pageNumber = 1;

  const pages = [];

  // Cover Page (always included)
  pages.push(React.createElement(CoverPage, {
    key: 'cover',
    data,
    theme,
    styles
  }));
  pageNumber++;

  // Executive Summary
  if (includeSections.includes('summary')) {
    pages.push(React.createElement(ExecutiveSummaryPage, {
      key: 'summary',
      data,
      theme,
      styles,
      pageNumber
    }));
    pageNumber++;
  }

  // Critical Clauses
  if (includeSections.includes('criticalClauses') && data.criticalClauses?.length > 0) {
    // Split into pages of ~3 clauses each
    const clausesPerPage = 3;
    for (let i = 0; i < data.criticalClauses.length; i += clausesPerPage) {
      const pageClauses = data.criticalClauses.slice(i, i + clausesPerPage);
      pages.push(React.createElement(CriticalClausesPage, {
        key: `critical-${i}`,
        clauses: pageClauses,
        theme,
        styles,
        pageNumber,
        startIndex: i
      }));
      pageNumber++;
    }
  }

  // Negotiation Checklist
  if (includeSections.includes('checklist') && data.checklist?.length > 0) {
    pages.push(React.createElement(NegotiationChecklistPage, {
      key: 'checklist',
      checklist: data.checklist,
      theme,
      styles,
      pageNumber
    }));
    pageNumber++;
  }

  return React.createElement(Document, null, ...pages);
};

// ═══════════════════════════════════════════════════════════════════════════
// MAIN EXPORT FUNCTION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generiert einen PDF-Report für eine Legal Lens Analyse
 *
 * @param {Object} data - Analyse-Daten
 * @param {string} data.contractName - Name des Vertrags
 * @param {Array} data.clauses - Alle Klauseln
 * @param {Array} data.criticalClauses - Kritische Klauseln mit Details
 * @param {Object} data.riskSummary - Zusammenfassung der Risiken
 * @param {Array} data.topRisks - Top 3 Risiken
 * @param {Array} data.checklist - Verhandlungs-Checkliste (optional)
 * @param {string} design - Design-Variante (executive, modern, minimal, detailed)
 * @param {Array} includeSections - Welche Sektionen einschließen
 * @returns {Promise<Buffer>} PDF als Buffer
 */
async function generateAnalysisReport(data, design = 'executive', includeSections = ['summary', 'criticalClauses']) {
  try {
    console.log(`[AnalysisReport] Generating PDF with design: ${design}`);
    console.log(`[AnalysisReport] Sections: ${includeSections.join(', ')}`);
    console.log(`[AnalysisReport] Data: ${data.clauses?.length || 0} clauses, ${data.criticalClauses?.length || 0} critical`);

    const document = React.createElement(AnalysisReportDocument, {
      data,
      design,
      includeSections
    });

    const pdfBuffer = await ReactPDF.renderToBuffer(document);

    console.log(`[AnalysisReport] PDF generated successfully (${pdfBuffer.length} bytes)`);

    return pdfBuffer;
  } catch (error) {
    console.error('[AnalysisReport] Error generating PDF:', error);
    throw error;
  }
}

/**
 * Gibt verfügbare Designs zurück
 */
function getAvailableDesigns() {
  return Object.entries(DESIGN_THEMES).map(([id, theme]) => ({
    id,
    name: theme.name,
    primaryColor: theme.colors.primary,
    accentColor: theme.colors.accent
  }));
}

/**
 * Gibt verfügbare Sektionen zurück
 */
function getAvailableSections() {
  return [
    { id: 'summary', name: 'Executive Summary', description: 'Übersicht und Risiko-Verteilung', default: true },
    { id: 'criticalClauses', name: 'Kritische Klauseln', description: 'Detaillierte Analyse der Risiko-Klauseln', default: true },
    { id: 'checklist', name: 'Verhandlungs-Checkliste', description: 'Priorisierte Verhandlungspunkte', default: false },
    { id: 'allClauses', name: 'Alle Klauseln', description: 'Vollständige Klausel-Liste (Anhang)', default: false }
  ];
}

module.exports = {
  generateAnalysisReport,
  getAvailableDesigns,
  getAvailableSections
};
