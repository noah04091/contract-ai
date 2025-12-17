/**
 * TEST: Mit den EXAKTEN Styles aus pdfGeneratorV2.js
 */
const React = require('react');
const { Document, Page, Text, View, StyleSheet, renderToFile } = require('@react-pdf/renderer');
const path = require('path');

const e = React.createElement;

// Exakt die Styles aus createExecutiveStyles
const styles = StyleSheet.create({
  page: { fontFamily: 'Times-Roman', fontSize: 11, padding: 50, lineHeight: 1.5, color: '#1B4332' },
  coverPage: { paddingBottom: 60 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', borderBottomWidth: 2, borderBottomColor: '#1B4332', paddingBottom: 15, marginBottom: 30 },
  companyInfo: { textAlign: 'right', fontSize: 9, color: '#3D5A4C' },
  companyName: { fontSize: 11, fontWeight: 'bold', color: '#1B4332', marginBottom: 2 },
  titleContainer: { alignItems: 'center', marginTop: 80, marginBottom: 60 },
  titleLine: { width: 100, height: 2, backgroundColor: '#1B4332', marginBottom: 15 },
  title: { fontSize: 26, fontWeight: 'bold', letterSpacing: 4, color: '#1B4332', textTransform: 'uppercase' },
  titleLineBottom: { width: 100, height: 2, backgroundColor: '#1B4332', marginTop: 15 },
  subtitle: { fontSize: 11, color: '#3D5A4C', marginTop: 20, fontStyle: 'italic' },
  partiesContainer: { marginTop: 40 },
  partiesLabel: { fontSize: 11, color: '#3D5A4C', textAlign: 'center', marginVertical: 15 },
  partyBox: { borderWidth: 1, borderColor: '#B7E4C7', padding: 15, marginHorizontal: 40, marginBottom: 10, backgroundColor: '#F1F8F5' },
  partyName: { fontSize: 12, fontWeight: 'bold', color: '#1B4332', marginBottom: 3 },
  partyAddress: { fontSize: 10, color: '#3D5A4C' },
  partyRole: { fontSize: 9, fontStyle: 'italic', color: '#6B8F7A', marginTop: 8 },
  // Content
  contentPage: { paddingBottom: 60 },
  sectionHeader: { fontSize: 12, fontWeight: 'bold', color: '#1B4332', marginTop: 20, marginBottom: 10, paddingBottom: 5, borderBottomWidth: 1, borderBottomColor: '#B7E4C7' },
  paragraph: { fontSize: 10, marginBottom: 8, textAlign: 'justify', color: '#1B4332' },
  // Signature
  signaturePage: { paddingBottom: 60 },
  signatureTitle: { fontSize: 16, fontWeight: 'bold', textAlign: 'center', marginBottom: 40, color: '#1B4332' },
});

// CoverPage mit exakter Struktur
const CoverPage = ({ documentId, currentDate }) => {
  return e(Page, { size: 'A4', style: styles.page, wrap: true },
    e(View, { style: styles.coverPage },
      e(View, { style: styles.header },
        e(View, { style: { width: 60 } }),
        e(View, { style: styles.companyInfo },
          e(Text, { style: styles.companyName }, 'Test GmbH'),
          e(Text, null, 'Teststraße 123'),
          e(Text, null, '12345 Berlin')
        )
      ),
      e(View, { style: styles.titleContainer },
        e(View, { style: styles.titleLine }),
        e(Text, { style: styles.title }, 'VERTRAG'),
        e(View, { style: styles.titleLineBottom }),
        e(Text, { style: styles.subtitle }, `geschlossen am ${currentDate}`)
      ),
      e(View, { style: styles.partiesContainer },
        e(Text, { style: styles.partiesLabel }, 'zwischen'),
        e(View, { style: styles.partyBox },
          e(Text, { style: styles.partyName }, 'Test GmbH'),
          e(Text, { style: styles.partyAddress }, 'Teststraße 123'),
          e(Text, { style: styles.partyAddress }, '12345 Berlin'),
          e(Text, { style: styles.partyRole }, '– nachfolgend „Partei A" genannt –')
        ),
        e(Text, { style: styles.partiesLabel }, 'und'),
        e(View, { style: styles.partyBox },
          e(Text, { style: styles.partyName }, 'Kunde AG'),
          e(Text, { style: styles.partyAddress }, 'Kundenstraße 456'),
          e(Text, { style: styles.partyAddress }, '67890 München'),
          e(Text, { style: styles.partyRole }, '– nachfolgend „Partei B" genannt –')
        )
      )
    ),
    // Footer - AUSSERHALB der coverPage View!
    e(Text, { style: { position: 'absolute', bottom: 25, left: 50, fontSize: 8, color: '#666666' }, fixed: true }, `ID: ${documentId}`),
    e(Text, {
      style: { position: 'absolute', bottom: 25, left: 0, right: 0, textAlign: 'center', fontSize: 8, color: '#666666', minHeight: 12 },
      fixed: true,
      render: (props) => {
        console.log('CoverPage render:', props.pageNumber, 'von', props.totalPages);
        return `Seite ${props.pageNumber} von ${props.totalPages}`;
      }
    }),
    e(Text, { style: { position: 'absolute', bottom: 25, right: 50, fontSize: 8, color: '#666666', textAlign: 'right' }, fixed: true }, currentDate)
  );
};

// ContentPage
const ContentPage = ({ documentId, currentDate }) => {
  const sections = [];
  for (let i = 1; i <= 6; i++) {
    sections.push(
      e(View, { key: i },
        e(Text, { style: styles.sectionHeader }, `§ ${i} Vertragsklausel`),
        e(Text, { style: styles.paragraph }, 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation.')
      )
    );
  }

  return e(Page, { size: 'A4', style: styles.page, wrap: true },
    e(View, { style: styles.contentPage },
      ...sections
    ),
    // Footer
    e(Text, { style: { position: 'absolute', bottom: 25, left: 50, fontSize: 8, color: '#666666' }, fixed: true }, `ID: ${documentId}`),
    e(Text, {
      style: { position: 'absolute', bottom: 25, left: 0, right: 0, textAlign: 'center', fontSize: 8, color: '#666666', minHeight: 12 },
      fixed: true,
      render: (props) => {
        console.log('ContentPage render:', props.pageNumber, 'von', props.totalPages);
        return `Seite ${props.pageNumber} von ${props.totalPages}`;
      }
    }),
    e(Text, { style: { position: 'absolute', bottom: 25, right: 50, fontSize: 8, color: '#666666', textAlign: 'right' }, fixed: true }, currentDate)
  );
};

// SignaturePage
const SignaturePage = ({ documentId, currentDate }) => {
  return e(Page, { size: 'A4', style: styles.page, wrap: true },
    e(View, { style: styles.signaturePage },
      e(Text, { style: styles.signatureTitle }, 'UNTERSCHRIFTEN'),
      e(Text, null, 'Partei A: _________________'),
      e(Text, { style: { marginTop: 30 } }, 'Partei B: _________________')
    ),
    // Footer
    e(Text, { style: { position: 'absolute', bottom: 25, left: 50, fontSize: 8, color: '#666666' }, fixed: true }, `ID: ${documentId}`),
    e(Text, {
      style: { position: 'absolute', bottom: 25, left: 0, right: 0, textAlign: 'center', fontSize: 8, color: '#666666', minHeight: 12 },
      fixed: true,
      render: (props) => {
        console.log('SignaturePage render:', props.pageNumber, 'von', props.totalPages);
        return `Seite ${props.pageNumber} von ${props.totalPages}`;
      }
    }),
    e(Text, { style: { position: 'absolute', bottom: 25, right: 50, fontSize: 8, color: '#666666', textAlign: 'right' }, fixed: true }, currentDate)
  );
};

async function runTest() {
  console.log('=== TEST: Mit exakten pdfGeneratorV2 Styles ===\n');

  const documentId = 'DOC-TEST456';
  const currentDate = '07.12.2025';

  const ContractDocument = e(Document, null,
    e(CoverPage, { documentId, currentDate }),
    e(ContentPage, { documentId, currentDate }),
    e(SignaturePage, { documentId, currentDate })
  );

  try {
    const outputPath = path.join(__dirname, '..', 'test-with-styles.pdf');
    await renderToFile(ContractDocument, outputPath);
    console.log('\n✅ PDF gespeichert:', outputPath);
  } catch (error) {
    console.error('❌ FEHLER:', error.message);
  }
}

runTest();
