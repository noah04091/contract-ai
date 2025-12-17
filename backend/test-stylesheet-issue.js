/**
 * TEST: Ist StyleSheet.create() das Problem?
 */
const React = require('react');
const { Document, Page, Text, View, StyleSheet, renderToFile } = require('@react-pdf/renderer');
const path = require('path');

const e = React.createElement;

// Test 1: MIT StyleSheet.create
const styles = StyleSheet.create({
  page: { fontFamily: 'Times-Roman', fontSize: 11, padding: 50 },
  content: { marginBottom: 20 },
});

const TestWithStyleSheet = () => {
  return e(Document, null,
    e(Page, { size: 'A4', style: styles.page, wrap: true },
      e(View, { style: styles.content },
        e(Text, null, 'Test mit StyleSheet.create')
      ),
      // Footer
      e(Text, { style: { position: 'absolute', bottom: 30, left: 50, fontSize: 8 }, fixed: true }, 'ID: TEST'),
      e(Text, {
        style: { position: 'absolute', bottom: 30, left: 0, right: 0, textAlign: 'center', fontSize: 8, minHeight: 12 },
        fixed: true,
        render: (props) => `MIT StyleSheet: Seite ${props.pageNumber} von ${props.totalPages}`
      }),
      e(Text, { style: { position: 'absolute', bottom: 30, right: 50, fontSize: 8, textAlign: 'right' }, fixed: true }, 'DATUM')
    )
  );
};

// Test 2: OHNE StyleSheet.create - inline styles
const TestWithoutStyleSheet = () => {
  return e(Document, null,
    e(Page, { size: 'A4', style: { fontFamily: 'Times-Roman', fontSize: 11, padding: 50 }, wrap: true },
      e(View, { style: { marginBottom: 20 } },
        e(Text, null, 'Test ohne StyleSheet.create')
      ),
      // Footer
      e(Text, { style: { position: 'absolute', bottom: 30, left: 50, fontSize: 8 }, fixed: true }, 'ID: TEST'),
      e(Text, {
        style: { position: 'absolute', bottom: 30, left: 0, right: 0, textAlign: 'center', fontSize: 8, minHeight: 12 },
        fixed: true,
        render: (props) => `OHNE StyleSheet: Seite ${props.pageNumber} von ${props.totalPages}`
      }),
      e(Text, { style: { position: 'absolute', bottom: 30, right: 50, fontSize: 8, textAlign: 'right' }, fixed: true }, 'DATUM')
    )
  );
};

async function runTests() {
  console.log('=== TEST: StyleSheet.create vs Inline ===\n');

  try {
    // Test MIT StyleSheet
    const path1 = path.join(__dirname, '..', 'test-MIT-stylesheet.pdf');
    await renderToFile(e(TestWithStyleSheet), path1);
    console.log('MIT StyleSheet gespeichert:', path1);

    // Test OHNE StyleSheet
    const path2 = path.join(__dirname, '..', 'test-OHNE-stylesheet.pdf');
    await renderToFile(e(TestWithoutStyleSheet), path2);
    console.log('OHNE StyleSheet gespeichert:', path2);

  } catch (error) {
    console.error('FEHLER:', error.message);
  }
}

runTests();
