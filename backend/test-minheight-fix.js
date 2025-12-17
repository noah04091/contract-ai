/**
 * Test: Beweist dass minHeight den render prop mit totalPages fixed
 */
const React = require('react');
const { Document, Page, Text, View, StyleSheet, renderToFile } = require('@react-pdf/renderer');
const path = require('path');

const e = React.createElement;

// Test 1: OHNE minHeight (der Bug)
const TestWithoutMinHeight = () => {
  return e(Document, null,
    e(Page, { size: 'A4', style: { padding: 50 } },
      e(View, { style: { marginBottom: 700 } },
        e(Text, null, 'Seite 1 Content - viel Text damit es mehrere Seiten gibt'),
        e(Text, null, 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.'),
        e(Text, null, 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.'),
        e(Text, null, 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.')
      ),
      e(View, { style: { marginBottom: 700 } },
        e(Text, null, 'Seite 2 Content'),
        e(Text, null, 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.')
      ),
      e(View, { style: { marginBottom: 700 } },
        e(Text, null, 'Seite 3 Content'),
        e(Text, null, 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.')
      ),
      // Footer OHNE minHeight
      e(Text, {
        style: { position: 'absolute', bottom: 30, left: 0, right: 0, textAlign: 'center', fontSize: 10, color: 'red' },
        fixed: true,
        render: ({ pageNumber, totalPages }) => `OHNE minHeight: Seite ${pageNumber} von ${totalPages}`
      })
    )
  );
};

// Test 2: MIT minHeight (der Fix)
const TestWithMinHeight = () => {
  return e(Document, null,
    e(Page, { size: 'A4', style: { padding: 50 } },
      e(View, { style: { marginBottom: 700 } },
        e(Text, null, 'Seite 1 Content - viel Text damit es mehrere Seiten gibt'),
        e(Text, null, 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.'),
        e(Text, null, 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.'),
        e(Text, null, 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.')
      ),
      e(View, { style: { marginBottom: 700 } },
        e(Text, null, 'Seite 2 Content'),
        e(Text, null, 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.')
      ),
      e(View, { style: { marginBottom: 700 } },
        e(Text, null, 'Seite 3 Content'),
        e(Text, null, 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.')
      ),
      // Footer MIT minHeight
      e(Text, {
        style: { position: 'absolute', bottom: 30, left: 0, right: 0, textAlign: 'center', fontSize: 10, color: 'green', minHeight: 12 },
        fixed: true,
        render: ({ pageNumber, totalPages }) => `MIT minHeight: Seite ${pageNumber} von ${totalPages}`
      })
    )
  );
};

async function runTests() {
  const outputDir = path.join(__dirname, '..');

  console.log('===========================================');
  console.log('TEST: minHeight Fix für react-pdf render prop');
  console.log('===========================================\n');

  try {
    // Test OHNE minHeight
    console.log('1. Generiere PDF OHNE minHeight...');
    const pathWithout = path.join(outputDir, 'test-OHNE-minHeight.pdf');
    await renderToFile(e(TestWithoutMinHeight), pathWithout);
    console.log(`   -> Gespeichert: ${pathWithout}`);

    // Test MIT minHeight
    console.log('\n2. Generiere PDF MIT minHeight...');
    const pathWith = path.join(outputDir, 'test-MIT-minHeight.pdf');
    await renderToFile(e(TestWithMinHeight), pathWith);
    console.log(`   -> Gespeichert: ${pathWith}`);

    console.log('\n===========================================');
    console.log('ERGEBNIS:');
    console.log('- Öffne beide PDFs und vergleiche den Footer!');
    console.log('- OHNE minHeight: "Seite X von undefined" (BUG)');
    console.log('- MIT minHeight:  "Seite X von 3" (FIX)');
    console.log('===========================================\n');

  } catch (error) {
    console.error('FEHLER:', error.message);
  }
}

runTests();
