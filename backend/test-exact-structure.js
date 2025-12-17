/**
 * TEST: Exakte Struktur wie pdfGeneratorV2.js
 * - CoverPage als separate Komponente (returned Page element)
 * - ContentPage als separate Komponente
 * - SignaturePage als separate Komponente
 */
const React = require('react');
const { Document, Page, Text, View, renderToFile } = require('@react-pdf/renderer');
const path = require('path');

const e = React.createElement;

// CoverPage - wie in pdfGeneratorV2.js (returned e(Page, ...))
const CoverPage = ({ documentId, currentDate }) => {
  console.log('CoverPage wird gerendert...');

  return e(Page, { size: 'A4', style: { padding: 50 }, wrap: true },
    e(View, { style: { flex: 1, justifyContent: 'center', alignItems: 'center' } },
      e(Text, { style: { fontSize: 24 } }, 'DECKBLATT')
    ),
    // Footer
    e(Text, { style: { position: 'absolute', bottom: 30, left: 50, fontSize: 8 }, fixed: true }, `ID: ${documentId}`),
    e(Text, {
      style: { position: 'absolute', bottom: 30, left: 0, right: 0, textAlign: 'center', fontSize: 8, minHeight: 12 },
      fixed: true,
      render: (props) => {
        console.log('CoverPage render:', props);
        return `Seite ${props.pageNumber} von ${props.totalPages}`;
      }
    }),
    e(Text, { style: { position: 'absolute', bottom: 30, right: 50, fontSize: 8, textAlign: 'right' }, fixed: true }, currentDate)
  );
};

// ContentPage - wie in pdfGeneratorV2.js (returned e(Page, ...))
const ContentPage = ({ documentId, currentDate }) => {
  console.log('ContentPage wird gerendert...');

  // Viel Content der über mehrere Seiten umbricht
  const content = [];
  for (let i = 1; i <= 10; i++) {
    content.push(
      e(View, { key: i, style: { marginBottom: 30 } },
        e(Text, { style: { fontSize: 14, fontWeight: 'bold', marginBottom: 10 } }, `§ ${i} Paragraph`),
        e(Text, { style: { fontSize: 10 } }, 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam.')
      )
    );
  }

  return e(Page, { size: 'A4', style: { padding: 50 }, wrap: true },
    e(View, { style: { paddingBottom: 50 } },
      ...content
    ),
    // Footer
    e(Text, { style: { position: 'absolute', bottom: 30, left: 50, fontSize: 8 }, fixed: true }, `ID: ${documentId}`),
    e(Text, {
      style: { position: 'absolute', bottom: 30, left: 0, right: 0, textAlign: 'center', fontSize: 8, minHeight: 12 },
      fixed: true,
      render: (props) => {
        console.log('ContentPage render:', props);
        return `Seite ${props.pageNumber} von ${props.totalPages}`;
      }
    }),
    e(Text, { style: { position: 'absolute', bottom: 30, right: 50, fontSize: 8, textAlign: 'right' }, fixed: true }, currentDate)
  );
};

// SignaturePage - wie in pdfGeneratorV2.js
const SignaturePage = ({ documentId, currentDate }) => {
  console.log('SignaturePage wird gerendert...');

  return e(Page, { size: 'A4', style: { padding: 50 }, wrap: true },
    e(View, { style: { flex: 1 } },
      e(Text, { style: { fontSize: 18, marginBottom: 30 } }, 'UNTERSCHRIFTEN'),
      e(Text, null, 'Partei A: _________________'),
      e(Text, { style: { marginTop: 20 } }, 'Partei B: _________________')
    ),
    // Footer
    e(Text, { style: { position: 'absolute', bottom: 30, left: 50, fontSize: 8 }, fixed: true }, `ID: ${documentId}`),
    e(Text, {
      style: { position: 'absolute', bottom: 30, left: 0, right: 0, textAlign: 'center', fontSize: 8, minHeight: 12 },
      fixed: true,
      render: (props) => {
        console.log('SignaturePage render:', props);
        return `Seite ${props.pageNumber} von ${props.totalPages}`;
      }
    }),
    e(Text, { style: { position: 'absolute', bottom: 30, right: 50, fontSize: 8, textAlign: 'right' }, fixed: true }, currentDate)
  );
};

async function runTest() {
  console.log('=== TEST: Exakte pdfGeneratorV2 Struktur ===\n');

  const documentId = 'DOC-TEST123';
  const currentDate = '07.12.2025';

  // Document wie in pdfGeneratorV2.js
  const ContractDocument = e(Document, null,
    e(CoverPage, { documentId, currentDate }),
    e(ContentPage, { documentId, currentDate }),
    e(SignaturePage, { documentId, currentDate })
  );

  try {
    const outputPath = path.join(__dirname, '..', 'test-exact-structure.pdf');
    console.log('Generiere PDF...\n');
    await renderToFile(ContractDocument, outputPath);
    console.log('\n✅ PDF gespeichert:', outputPath);
  } catch (error) {
    console.error('❌ FEHLER:', error.message);
    console.error(error.stack);
  }
}

runTest();
