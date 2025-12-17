// checklistPdfGenerator.js - PDF-Generator für Verhandlungs-Checkliste
// Erstellt professionelle PDF-Reports der Verhandlungspunkte

const ReactPDF = require('@react-pdf/renderer');
const { Document, Page, Text, View, StyleSheet, Font } = ReactPDF;
const React = require('react');

// Font Registration
Font.register({
  family: 'Helvetica',
  fonts: [
    { src: 'Helvetica' },
    { src: 'Helvetica-Bold', fontWeight: 'bold' },
    { src: 'Helvetica-Oblique', fontStyle: 'italic' }
  ]
});

// ===== PRIORITY MAPPING =====
const PRIORITY_CONFIG = {
  1: { label: 'KRITISCH', color: '#dc2626', bgColor: '#fef2f2' },
  2: { label: 'WICHTIG', color: '#d97706', bgColor: '#fffbeb' },
  3: { label: 'OPTIONAL', color: '#16a34a', bgColor: '#f0fdf4' }
};

const DIFFICULTY_CONFIG = {
  easy: { label: 'Einfach', color: '#16a34a' },
  medium: { label: 'Mittel', color: '#d97706' },
  hard: { label: 'Schwierig', color: '#dc2626' }
};

const CATEGORY_LABELS = {
  financial: 'Finanziell',
  liability: 'Haftung',
  termination: 'Kündigung',
  scope: 'Leistungsumfang',
  other: 'Sonstiges'
};

// ===== STYLES =====
const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    padding: 40,
    backgroundColor: '#ffffff'
  },

  // Header
  header: {
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#3b82f6'
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#64748b',
    marginBottom: 2
  },
  headerDate: {
    fontSize: 9,
    color: '#94a3b8'
  },

  // Summary Box
  summaryBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 6,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  summaryTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 10
  },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12
  },
  summaryItem: {
    alignItems: 'center'
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b'
  },
  summaryLabel: {
    fontSize: 8,
    color: '#64748b',
    marginTop: 2
  },
  summaryValueCritical: {
    color: '#dc2626'
  },
  strategyText: {
    fontSize: 9,
    color: '#475569',
    fontStyle: 'italic',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0'
  },

  // Checklist Item
  checklistItem: {
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 6,
    overflow: 'hidden'
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#f8fafc'
  },
  checkbox: {
    width: 14,
    height: 14,
    borderWidth: 1.5,
    borderColor: '#94a3b8',
    borderRadius: 3,
    marginRight: 10
  },
  itemTitleSection: {
    flex: 1
  },
  itemTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4
  },
  itemMetaRow: {
    flexDirection: 'row',
    gap: 6
  },
  priorityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 6
  },
  priorityText: {
    fontSize: 7,
    fontWeight: 'bold'
  },
  categoryBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4
  },
  categoryText: {
    fontSize: 7,
    color: '#64748b'
  },

  // Item Content
  itemContent: {
    padding: 12
  },
  contentSection: {
    marginBottom: 10
  },
  contentLabel: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#64748b',
    marginBottom: 3,
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  contentText: {
    fontSize: 9,
    color: '#334155',
    lineHeight: 1.4
  },

  // Quote Box
  quoteBox: {
    backgroundColor: '#f0fdf4',
    borderLeftWidth: 3,
    borderLeftColor: '#16a34a',
    padding: 8,
    marginTop: 4
  },
  quoteText: {
    fontSize: 9,
    color: '#15803d',
    fontStyle: 'italic'
  },

  // Alternative Box
  alternativeBox: {
    backgroundColor: '#eff6ff',
    borderLeftWidth: 3,
    borderLeftColor: '#3b82f6',
    padding: 8,
    marginTop: 4
  },
  alternativeText: {
    fontSize: 9,
    color: '#1d4ed8'
  },

  // Difficulty
  difficultyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9'
  },
  difficultyLabel: {
    fontSize: 8,
    color: '#64748b'
  },
  difficultyValue: {
    fontSize: 8,
    fontWeight: 'bold',
    marginLeft: 4
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 10
  },
  footerText: {
    fontSize: 8,
    color: '#94a3b8'
  },
  pageNumber: {
    fontSize: 8,
    color: '#64748b'
  }
});

// ===== REACT COMPONENTS =====

const ChecklistDocument = ({ checklist, summary, contractName, perspective }) => {
  const perspectiveLabel = {
    contractor: 'Auftragnehmer',
    client: 'Auftraggeber',
    neutral: 'Neutral',
    worstCase: 'Worst-Case'
  }[perspective] || perspective;

  const today = new Date().toLocaleDateString('de-DE', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });

  return React.createElement(
    Document,
    { title: `Verhandlungs-Checkliste - ${contractName}` },
    React.createElement(
      Page,
      { size: 'A4', style: styles.page },

      // Header
      React.createElement(
        View,
        { style: styles.header },
        React.createElement(Text, { style: styles.headerTitle }, 'Verhandlungs-Checkliste'),
        React.createElement(Text, { style: styles.headerSubtitle }, contractName),
        React.createElement(Text, { style: styles.headerDate }, `Perspektive: ${perspectiveLabel} | Erstellt am: ${today}`)
      ),

      // Summary Box
      summary && React.createElement(
        View,
        { style: styles.summaryBox },
        React.createElement(Text, { style: styles.summaryTitle }, 'Zusammenfassung'),
        React.createElement(
          View,
          { style: styles.summaryGrid },
          React.createElement(
            View,
            { style: styles.summaryItem },
            React.createElement(Text, { style: styles.summaryValue }, summary.totalIssues || 0),
            React.createElement(Text, { style: styles.summaryLabel }, 'Punkte gesamt')
          ),
          React.createElement(
            View,
            { style: styles.summaryItem },
            React.createElement(Text, { style: [styles.summaryValue, styles.summaryValueCritical] }, summary.criticalCount || 0),
            React.createElement(Text, { style: styles.summaryLabel }, 'Kritisch')
          ),
          React.createElement(
            View,
            { style: styles.summaryItem },
            React.createElement(Text, { style: styles.summaryValue }, summary.importantCount || 0),
            React.createElement(Text, { style: styles.summaryLabel }, 'Wichtig')
          ),
          React.createElement(
            View,
            { style: styles.summaryItem },
            React.createElement(Text, { style: styles.summaryValue }, summary.estimatedNegotiationTime || '-'),
            React.createElement(Text, { style: styles.summaryLabel }, 'Zeit geschätzt')
          )
        ),
        summary.overallStrategy && React.createElement(
          Text,
          { style: styles.strategyText },
          `Strategie: ${summary.overallStrategy}`
        )
      ),

      // Checklist Items
      ...checklist.map((item, index) => {
        const priority = PRIORITY_CONFIG[item.priority] || PRIORITY_CONFIG[3];
        const difficulty = DIFFICULTY_CONFIG[item.difficulty] || DIFFICULTY_CONFIG.medium;
        const category = CATEGORY_LABELS[item.category] || item.category;

        return React.createElement(
          View,
          { key: item.id || index, style: styles.checklistItem, wrap: false },

          // Item Header
          React.createElement(
            View,
            { style: styles.itemHeader },
            React.createElement(View, { style: styles.checkbox }),
            React.createElement(
              View,
              { style: styles.itemTitleSection },
              React.createElement(Text, { style: styles.itemTitle }, `${item.emoji || ''} ${item.title}`),
              React.createElement(
                View,
                { style: styles.itemMetaRow },
                React.createElement(
                  View,
                  { style: [styles.priorityBadge, { backgroundColor: priority.bgColor }] },
                  React.createElement(Text, { style: [styles.priorityText, { color: priority.color }] }, priority.label)
                ),
                React.createElement(
                  View,
                  { style: styles.categoryBadge },
                  React.createElement(Text, { style: styles.categoryText }, category)
                )
              )
            )
          ),

          // Item Content
          React.createElement(
            View,
            { style: styles.itemContent },

            // Problem
            item.issue && React.createElement(
              View,
              { style: styles.contentSection },
              React.createElement(Text, { style: styles.contentLabel }, 'Problem'),
              React.createElement(Text, { style: styles.contentText }, item.issue)
            ),

            // Risiko
            item.risk && React.createElement(
              View,
              { style: styles.contentSection },
              React.createElement(Text, { style: styles.contentLabel }, 'Risiko'),
              React.createElement(Text, { style: styles.contentText }, item.risk)
            ),

            // So sagst du es
            item.whatToSay && React.createElement(
              View,
              { style: styles.contentSection },
              React.createElement(Text, { style: styles.contentLabel }, 'So sagst du es'),
              React.createElement(
                View,
                { style: styles.quoteBox },
                React.createElement(Text, { style: styles.quoteText }, `"${item.whatToSay}"`)
              )
            ),

            // Bessere Formulierung
            item.alternativeSuggestion && React.createElement(
              View,
              { style: styles.contentSection },
              React.createElement(Text, { style: styles.contentLabel }, 'Bessere Formulierung'),
              React.createElement(
                View,
                { style: styles.alternativeBox },
                React.createElement(Text, { style: styles.alternativeText }, item.alternativeSuggestion)
              )
            ),

            // Difficulty
            React.createElement(
              View,
              { style: styles.difficultyRow },
              React.createElement(Text, { style: styles.difficultyLabel }, 'Verhandlungsschwierigkeit:'),
              React.createElement(Text, { style: [styles.difficultyValue, { color: difficulty.color }] }, difficulty.label)
            )
          )
        );
      }),

      // Footer
      React.createElement(
        View,
        { style: styles.footer, fixed: true },
        React.createElement(Text, { style: styles.footerText }, 'Generiert mit Contract AI - Legal Lens'),
        React.createElement(
          Text,
          { style: styles.pageNumber, render: ({ pageNumber, totalPages }) => `Seite ${pageNumber} von ${totalPages}` }
        )
      )
    )
  );
};

// ===== EXPORT FUNCTION =====

/**
 * Generiert ein PDF der Verhandlungs-Checkliste
 * @param {Object} options - Optionen
 * @param {Array} options.checklist - Die Checklisten-Items
 * @param {Object} options.summary - Die Zusammenfassung
 * @param {string} options.contractName - Name des Vertrags
 * @param {string} options.perspective - Die Perspektive
 * @returns {Promise<Buffer>} - PDF als Buffer
 */
async function generateChecklistPdf({ checklist, summary, contractName, perspective }) {
  console.log(`[ChecklistPDF] Generating PDF for ${checklist.length} items...`);

  const doc = React.createElement(ChecklistDocument, {
    checklist,
    summary,
    contractName,
    perspective
  });

  const pdfBuffer = await ReactPDF.renderToBuffer(doc);

  console.log(`[ChecklistPDF] PDF generated: ${pdfBuffer.length} bytes`);
  return pdfBuffer;
}

module.exports = {
  generateChecklistPdf
};
