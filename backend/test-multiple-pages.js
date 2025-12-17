/**
 * TEST: Simuliert die EXAKTE Struktur von pdfGeneratorV2.js
 * - Mehrere separate Page-Komponenten (CoverPage, ContentPage, SignaturePage)
 * - Nicht eine Page die umbricht, sondern DREI verschiedene Pages
 */
const React = require('react');
const { Document, Page, Text, View, renderToFile } = require('@react-pdf/renderer');
const path = require('path');

const e = React.createElement;

// Simuliert CoverPage - eigene Page-Komponente
const CoverPage = () => {
  return e(Page, { size: 'A4', style: { padding: 50 }, wrap: true },
    e(View, { style: { flex: 1, justifyContent: 'center', alignItems: 'center' } },
      e(Text, { style: { fontSize: 24, marginBottom: 20 } }, 'DECKBLATT'),
      e(Text, { style: { fontSize: 14 } }, 'Vertrag zwischen Partei A und Partei B')
    ),
    // Footer mit render prop
    e(Text, { style: { position: 'absolute', bottom: 30, left: 50, fontSize: 8 }, fixed: true }, 'ID: DOC-123456'),
    e(Text, {
      style: { position: 'absolute', bottom: 30, left: 0, right: 0, textAlign: 'center', fontSize: 8 },
      fixed: true,
      render: ({ pageNumber, totalPages }) => `Seite ${pageNumber} von ${totalPages}`
    }),
    e(Text, { style: { position: 'absolute', bottom: 30, right: 50, fontSize: 8 }, fixed: true }, '07.12.2025')
  );
};

// Simuliert ContentPage - eigene Page-Komponente mit viel Content der umbricht
const ContentPage = () => {
  const longContent = [];
  for (let i = 1; i <= 15; i++) {
    longContent.push(
      e(View, { key: i, style: { marginBottom: 20 } },
        e(Text, { style: { fontSize: 12, fontWeight: 'bold', marginBottom: 5 } }, `§ ${i} Vertragsklausel`),
        e(Text, { style: { fontSize: 10 } },
          'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.'
        )
      )
    );
  }

  return e(Page, { size: 'A4', style: { padding: 50 }, wrap: true },
    e(View, { style: { paddingBottom: 50 } },
      ...longContent
    ),
    // Footer mit render prop
    e(Text, { style: { position: 'absolute', bottom: 30, left: 50, fontSize: 8 }, fixed: true }, 'ID: DOC-123456'),
    e(Text, {
      style: { position: 'absolute', bottom: 30, left: 0, right: 0, textAlign: 'center', fontSize: 8 },
      fixed: true,
      render: ({ pageNumber, totalPages }) => `Seite ${pageNumber} von ${totalPages}`
    }),
    e(Text, { style: { position: 'absolute', bottom: 30, right: 50, fontSize: 8 }, fixed: true }, '07.12.2025')
  );
};

// Simuliert SignaturePage - eigene Page-Komponente
const SignaturePage = () => {
  return e(Page, { size: 'A4', style: { padding: 50 }, wrap: true },
    e(View, { style: { flex: 1 } },
      e(Text, { style: { fontSize: 16, marginBottom: 30 } }, 'UNTERSCHRIFTEN'),
      e(View, { style: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 50 } },
        e(View, { style: { width: '45%' } },
          e(View, { style: { borderBottomWidth: 1, borderBottomColor: '#000', marginBottom: 5 } }),
          e(Text, { style: { fontSize: 10 } }, 'Partei A')
        ),
        e(View, { style: { width: '45%' } },
          e(View, { style: { borderBottomWidth: 1, borderBottomColor: '#000', marginBottom: 5 } }),
          e(Text, { style: { fontSize: 10 } }, 'Partei B')
        )
      )
    ),
    // Footer mit render prop
    e(Text, { style: { position: 'absolute', bottom: 30, left: 50, fontSize: 8 }, fixed: true }, 'ID: DOC-123456'),
    e(Text, {
      style: { position: 'absolute', bottom: 30, left: 0, right: 0, textAlign: 'center', fontSize: 8 },
      fixed: true,
      render: ({ pageNumber, totalPages }) => `Seite ${pageNumber} von ${totalPages}`
    }),
    e(Text, { style: { position: 'absolute', bottom: 30, right: 50, fontSize: 8 }, fixed: true }, '07.12.2025')
  );
};

// Das komplette Document - wie in pdfGeneratorV2.js
const TestDocument = () => {
  return e(Document, null,
    e(CoverPage),
    e(ContentPage),
    e(SignaturePage)
  );
};

async function runTest() {
  console.log('===========================================');
  console.log('TEST: Multiple Page Components (wie pdfGeneratorV2.js)');
  console.log('===========================================\n');

  try {
    const outputPath = path.join(__dirname, '..', 'test-multiple-pages.pdf');
    console.log('Generiere PDF mit 3 separaten Page-Komponenten...');
    await renderToFile(e(TestDocument), outputPath);
    console.log(`Gespeichert: ${outputPath}`);
    console.log('\nÖffne das PDF und prüfe ob "Seite X von Y" auf ALLEN Seiten erscheint!');
  } catch (error) {
    console.error('FEHLER:', error.message);
    console.error(error.stack);
  }
}

runTest();
