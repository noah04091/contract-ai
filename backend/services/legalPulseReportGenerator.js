// 📄 legalPulseReportGenerator.js - PDF-Generator für Legal Pulse Audit-Reports
// Professioneller PDF-Report mit Risiken, Empfehlungen, Score-Verlauf

const ReactPDF = require('@react-pdf/renderer');
const { Document, Page, Text, View, StyleSheet, Font } = ReactPDF;
const React = require('react');

// Font Registration
Font.register({
  family: 'Helvetica',
  fonts: [
    { src: 'Helvetica' },
    { src: 'Helvetica-Bold', fontWeight: 'bold' },
    { src: 'Helvetica-Oblique', fontStyle: 'italic' },
    { src: 'Helvetica-BoldOblique', fontWeight: 'bold', fontStyle: 'italic' }
  ]
});

// Executive Theme Colors
const colors = {
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
};

// Styles
const s = StyleSheet.create({
  page: {
    padding: 50,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: colors.text
  },
  // Cover Page
  coverPage: {
    padding: 50,
    fontFamily: 'Helvetica',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%'
  },
  coverHeader: {
    backgroundColor: colors.headerBg,
    padding: 40,
    borderRadius: 8,
    width: '100%',
    marginBottom: 40
  },
  coverTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
    textAlign: 'center'
  },
  coverSubtitle: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center'
  },
  coverInfo: {
    width: '100%',
    marginTop: 30
  },
  coverInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0'
  },
  coverInfoLabel: {
    fontSize: 11,
    color: colors.textLight,
    fontWeight: 'bold'
  },
  coverInfoValue: {
    fontSize: 11,
    color: colors.text
  },
  scoreBox: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 30,
    marginTop: 40
  },
  scoreItem: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: colors.cardBg,
    borderRadius: 8,
    width: 150
  },
  scoreLabel: {
    fontSize: 10,
    color: colors.textLight,
    marginBottom: 6
  },
  scoreValue: {
    fontSize: 32,
    fontWeight: 'bold'
  },
  scoreUnit: {
    fontSize: 10,
    color: colors.textLight,
    marginTop: 4
  },
  // Section Headers
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: colors.accent
  },
  // Risk Cards
  riskCard: {
    backgroundColor: colors.cardBg,
    borderRadius: 6,
    padding: 14,
    marginBottom: 12,
    borderLeftWidth: 4
  },
  riskCardHigh: { borderLeftColor: colors.danger },
  riskCardMedium: { borderLeftColor: colors.warning },
  riskCardLow: { borderLeftColor: colors.success },
  riskCardCritical: { borderLeftColor: '#7c2d12' },
  riskTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 6
  },
  riskSeverity: {
    fontSize: 9,
    fontWeight: 'bold',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
    marginBottom: 8,
    alignSelf: 'flex-start'
  },
  riskDescription: {
    fontSize: 10,
    color: colors.secondary,
    lineHeight: 1.5,
    marginBottom: 8
  },
  riskSubSection: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0'
  },
  riskSubTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    color: colors.textLight,
    marginBottom: 4
  },
  riskSubText: {
    fontSize: 10,
    color: colors.secondary,
    lineHeight: 1.4,
    fontStyle: 'italic'
  },
  legalBasisBox: {
    backgroundColor: '#f1f5f9',
    padding: 8,
    borderRadius: 4,
    marginTop: 6
  },
  legalBasisText: {
    fontSize: 9,
    color: colors.textLight
  },
  // Recommendation Cards
  recCard: {
    backgroundColor: '#f0fdf4',
    borderRadius: 6,
    padding: 14,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: colors.success
  },
  recPriority: {
    fontSize: 9,
    fontWeight: 'bold',
    marginBottom: 6
  },
  // History Table
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingVertical: 8
  },
  tableHeader: {
    backgroundColor: colors.cardBg,
    fontWeight: 'bold'
  },
  tableCell: {
    flex: 1,
    fontSize: 9,
    color: colors.secondary,
    paddingHorizontal: 4
  },
  tableCellHeader: {
    flex: 1,
    fontSize: 9,
    fontWeight: 'bold',
    color: colors.primary,
    paddingHorizontal: 4
  },
  // Summary Stats
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20
  },
  statBox: {
    flex: 1,
    backgroundColor: colors.cardBg,
    borderRadius: 6,
    padding: 14,
    alignItems: 'center'
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.primary
  },
  statLabel: {
    fontSize: 9,
    color: colors.textLight,
    marginTop: 4
  },
  // Footer
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 50,
    right: 50,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 8,
    color: colors.textLight
  }
});

// Helper: Severity color
function getSeverityColor(severity) {
  switch (severity) {
    case 'critical': return '#7c2d12';
    case 'high': return colors.danger;
    case 'medium': return colors.warning;
    case 'low': return colors.success;
    default: return colors.textLight;
  }
}

function getSeverityLabel(severity) {
  switch (severity) {
    case 'critical': return 'Kritisch';
    case 'high': return 'Hoch';
    case 'medium': return 'Mittel';
    case 'low': return 'Niedrig';
    default: return 'Mittel';
  }
}

function getPriorityLabel(priority) {
  switch (priority) {
    case 'critical': return 'Kritisch';
    case 'high': return 'Hoch';
    case 'medium': return 'Mittel';
    case 'low': return 'Niedrig';
    default: return 'Mittel';
  }
}

function getRiskLevelLabel(score) {
  if (score <= 30) return 'Gering';
  if (score <= 60) return 'Mittel';
  return 'Hoch';
}

function getRiskLevelColor(score) {
  if (score <= 30) return colors.success;
  if (score <= 60) return colors.warning;
  return colors.danger;
}

function formatDate(date) {
  if (!date) return '-';
  const d = new Date(date);
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// Document Component
function LegalPulseReport({ contract, legalPulse }) {
  const riskScore = legalPulse?.riskScore ?? 0;
  const healthScore = legalPulse?.healthScore ?? 100;
  const topRisks = legalPulse?.topRisks || [];
  const recommendations = legalPulse?.recommendations || [];
  const history = legalPulse?.analysisHistory || [];
  const summary = legalPulse?.summary || 'Keine Zusammenfassung verfügbar';
  const now = new Date();

  return React.createElement(Document, {},
    // Cover Page
    React.createElement(Page, { size: 'A4', style: s.coverPage },
      React.createElement(View, { style: s.coverHeader },
        React.createElement(Text, { style: s.coverTitle }, 'Legal Pulse Report'),
        React.createElement(Text, { style: s.coverSubtitle }, 'Automatisierte Vertragsrisikoanalyse')
      ),
      React.createElement(View, { style: s.coverInfo },
        React.createElement(View, { style: s.coverInfoRow },
          React.createElement(Text, { style: s.coverInfoLabel }, 'Vertrag'),
          React.createElement(Text, { style: s.coverInfoValue }, contract.name || 'Unbenannter Vertrag')
        ),
        React.createElement(View, { style: s.coverInfoRow },
          React.createElement(Text, { style: s.coverInfoLabel }, 'Report-Datum'),
          React.createElement(Text, { style: s.coverInfoValue }, formatDate(now))
        ),
        React.createElement(View, { style: s.coverInfoRow },
          React.createElement(Text, { style: s.coverInfoLabel }, 'Letzte Analyse'),
          React.createElement(Text, { style: s.coverInfoValue }, formatDate(legalPulse?.lastChecked))
        ),
        React.createElement(View, { style: s.coverInfoRow },
          React.createElement(Text, { style: s.coverInfoLabel }, 'Risikolevel'),
          React.createElement(Text, { style: s.coverInfoValue }, getRiskLevelLabel(riskScore))
        )
      ),
      React.createElement(View, { style: s.scoreBox },
        React.createElement(View, { style: s.scoreItem },
          React.createElement(Text, { style: s.scoreLabel }, 'RISIKO-SCORE'),
          React.createElement(Text, { style: { ...s.scoreValue, color: getRiskLevelColor(riskScore) } }, String(riskScore)),
          React.createElement(Text, { style: s.scoreUnit }, '/ 100')
        ),
        React.createElement(View, { style: s.scoreItem },
          React.createElement(Text, { style: s.scoreLabel }, 'HEALTH-SCORE'),
          React.createElement(Text, { style: { ...s.scoreValue, color: colors.accent } }, String(healthScore)),
          React.createElement(Text, { style: s.scoreUnit }, '/ 100')
        )
      ),
      React.createElement(View, { style: s.footer },
        React.createElement(Text, {}, 'Contract AI - Legal Pulse Report'),
        React.createElement(Text, {}, formatDate(now))
      )
    ),

    // Summary + Risks Page
    React.createElement(Page, { size: 'A4', style: s.page },
      // Summary
      React.createElement(Text, { style: s.sectionTitle }, 'Zusammenfassung'),
      React.createElement(View, { style: s.statsRow },
        React.createElement(View, { style: s.statBox },
          React.createElement(Text, { style: { ...s.statValue, color: getRiskLevelColor(riskScore) } }, String(riskScore)),
          React.createElement(Text, { style: s.statLabel }, 'Risiko-Score')
        ),
        React.createElement(View, { style: s.statBox },
          React.createElement(Text, { style: s.statValue }, String(topRisks.length)),
          React.createElement(Text, { style: s.statLabel }, 'Identifizierte Risiken')
        ),
        React.createElement(View, { style: s.statBox },
          React.createElement(Text, { style: s.statValue }, String(recommendations.length)),
          React.createElement(Text, { style: s.statLabel }, 'Empfehlungen')
        ),
        React.createElement(View, { style: s.statBox },
          React.createElement(Text, { style: s.statValue }, String(history.length)),
          React.createElement(Text, { style: s.statLabel }, 'Analysen')
        )
      ),
      React.createElement(Text, { style: s.riskDescription }, summary),

      // Risks
      React.createElement(Text, { style: { ...s.sectionTitle, marginTop: 24 } }, `Identifizierte Risiken (${topRisks.length})`),
      ...topRisks.map((risk, i) => {
        const severity = risk.severity || 'medium';
        const borderStyle = severity === 'critical' ? s.riskCardCritical :
          severity === 'high' ? s.riskCardHigh :
          severity === 'low' ? s.riskCardLow : s.riskCardMedium;

        const elements = [
          React.createElement(View, { key: `risk-${i}`, style: { ...s.riskCard, ...borderStyle } },
            React.createElement(Text, { style: { ...s.riskSeverity, color: getSeverityColor(severity), backgroundColor: getSeverityColor(severity) + '15' } },
              getSeverityLabel(severity)
            ),
            React.createElement(Text, { style: s.riskTitle }, risk.title || `Risiko ${i + 1}`),
            React.createElement(Text, { style: s.riskDescription }, risk.description || ''),
            // Affected Clause
            risk.affectedClauseText ? React.createElement(View, { style: s.riskSubSection },
              React.createElement(Text, { style: s.riskSubTitle }, 'Betroffene Klausel:'),
              React.createElement(Text, { style: s.riskSubText }, risk.affectedClauseText)
            ) : null,
            // Replacement Text
            risk.replacementText ? React.createElement(View, { style: s.riskSubSection },
              React.createElement(Text, { style: s.riskSubTitle }, 'Vorgeschlagener Ersatz:'),
              React.createElement(Text, { style: s.riskSubText }, risk.replacementText)
            ) : null,
            // Legal Basis
            risk.legalBasis ? React.createElement(View, { style: s.legalBasisBox },
              React.createElement(Text, { style: s.legalBasisText }, `Rechtsgrundlage: ${risk.legalBasis}`)
            ) : null
          )
        ];
        return elements;
      }).flat().filter(Boolean),

      React.createElement(View, { style: s.footer },
        React.createElement(Text, {}, 'Contract AI - Legal Pulse Report'),
        React.createElement(Text, {}, `Seite 2 | ${formatDate(now)}`)
      )
    ),

    // Recommendations + History Page
    React.createElement(Page, { size: 'A4', style: s.page },
      // Recommendations
      React.createElement(Text, { style: s.sectionTitle }, `Empfehlungen (${recommendations.length})`),
      ...recommendations.map((rec, i) => {
        const priority = rec.priority || 'medium';
        return React.createElement(View, { key: `rec-${i}`, style: s.recCard },
          React.createElement(Text, { style: { ...s.recPriority, color: getSeverityColor(priority) } },
            `${getPriorityLabel(priority)} | ${rec.effort || 'Mittel'}`
          ),
          React.createElement(Text, { style: s.riskTitle }, rec.title || `Empfehlung ${i + 1}`),
          React.createElement(Text, { style: s.riskDescription }, rec.description || ''),
          // Steps
          rec.steps && rec.steps.length > 0 ? React.createElement(View, { style: s.riskSubSection },
            React.createElement(Text, { style: s.riskSubTitle }, 'Schritte:'),
            ...rec.steps.map((step, si) =>
              React.createElement(Text, { key: `step-${si}`, style: { ...s.riskSubText, fontStyle: 'normal' } }, `${si + 1}. ${step}`)
            )
          ) : null,
          // Suggested Text
          rec.suggestedText ? React.createElement(View, { style: s.riskSubSection },
            React.createElement(Text, { style: s.riskSubTitle }, 'Klauselvorschlag:'),
            React.createElement(Text, { style: s.riskSubText }, rec.suggestedText)
          ) : null,
          // Legal Basis
          rec.legalBasis ? React.createElement(View, { style: s.legalBasisBox },
            React.createElement(Text, { style: s.legalBasisText }, `Rechtsgrundlage: ${rec.legalBasis}`)
          ) : null
        );
      }),

      // History
      history.length > 0 ? React.createElement(View, { style: { marginTop: 30 } },
        React.createElement(Text, { style: s.sectionTitle }, 'Analyse-Historie'),
        // Table Header
        React.createElement(View, { style: { ...s.tableRow, ...s.tableHeader } },
          React.createElement(Text, { style: s.tableCellHeader }, 'Datum'),
          React.createElement(Text, { style: s.tableCellHeader }, 'Risiko'),
          React.createElement(Text, { style: s.tableCellHeader }, 'Health'),
          React.createElement(Text, { style: s.tableCellHeader }, 'Auslöser')
        ),
        // Table Rows
        ...history.slice(-15).map((entry, i) =>
          React.createElement(View, { key: `hist-${i}`, style: s.tableRow },
            React.createElement(Text, { style: s.tableCell }, formatDate(entry.date)),
            React.createElement(Text, { style: { ...s.tableCell, color: getRiskLevelColor(entry.riskScore) } }, String(entry.riskScore ?? '-')),
            React.createElement(Text, { style: s.tableCell }, String(entry.healthScore ?? '-')),
            React.createElement(Text, { style: s.tableCell },
              entry.triggeredBy === 'law_change' ? 'Gesetzesänderung' :
              entry.triggeredBy === 'periodic_scan' ? 'Periodischer Scan' :
              entry.triggeredBy === 'manual' ? 'Manuell' : entry.triggeredBy || '-'
            )
          )
        )
      ) : null,

      React.createElement(View, { style: s.footer },
        React.createElement(Text, {}, 'Contract AI - Legal Pulse Report'),
        React.createElement(Text, {}, `Seite 3 | ${formatDate(now)}`)
      )
    )
  );
}

/**
 * Generate Legal Pulse Report as PDF Buffer
 * @param {Object} contract - Contract object from MongoDB
 * @returns {Promise<Buffer>} - PDF buffer
 */
async function generateLegalPulseReport(contract) {
  const legalPulse = contract.legalPulse || {};

  const element = React.createElement(LegalPulseReport, {
    contract,
    legalPulse
  });

  const pdfBuffer = await ReactPDF.renderToBuffer(element);
  return pdfBuffer;
}

module.exports = { generateLegalPulseReport };
