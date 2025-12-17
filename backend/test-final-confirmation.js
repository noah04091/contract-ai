/**
 * FINALER TEST: lineHeight ist das Problem!
 * Test 1: OHNE lineHeight -> sollte funktionieren
 * Test 2: MIT lineHeight auf Page -> sollte NICHT funktionieren
 * Test 3: MIT lineHeight NUR auf content, NICHT auf Page -> sollte funktionieren
 */
const React = require('react');
const { Document, Page, Text, View, StyleSheet, renderToFile } = require('@react-pdf/renderer');
const path = require('path');

const e = React.createElement;

// TEST 1: OHNE lineHeight - Kontrollgruppe
const Test1_NoLineHeight = () => {
  const styles = StyleSheet.create({
    page: { fontFamily: 'Times-Roman', fontSize: 11, padding: 50, color: '#1B4332' },
    coverPage: { paddingBottom: 60 },
    title: { fontSize: 26, fontWeight: 'bold', marginTop: 80, textAlign: 'center' },
  });

  return e(Document, null,
    e(Page, { size: 'A4', style: styles.page, wrap: true },
      e(View, { style: styles.coverPage },
        e(Text, { style: styles.title }, 'OHNE lineHeight')
      ),
      e(Text, { style: { position: 'absolute', bottom: 30, left: 50, fontSize: 8 }, fixed: true }, 'ID: TEST'),
      e(Text, {
        style: { position: 'absolute', bottom: 30, left: 0, right: 0, textAlign: 'center', fontSize: 8, minHeight: 12 },
        fixed: true,
        render: (props) => `Seite ${props.pageNumber} von ${props.totalPages}`
      }),
      e(Text, { style: { position: 'absolute', bottom: 30, right: 50, fontSize: 8, textAlign: 'right' }, fixed: true }, 'DATUM')
    )
  );
};

// TEST 2: MIT lineHeight auf Page - sollte NICHT funktionieren
const Test2_WithLineHeightOnPage = () => {
  const styles = StyleSheet.create({
    page: { fontFamily: 'Times-Roman', fontSize: 11, padding: 50, color: '#1B4332', lineHeight: 1.5 }, // <- lineHeight hier!
    coverPage: { paddingBottom: 60 },
    title: { fontSize: 26, fontWeight: 'bold', marginTop: 80, textAlign: 'center' },
  });

  return e(Document, null,
    e(Page, { size: 'A4', style: styles.page, wrap: true },
      e(View, { style: styles.coverPage },
        e(Text, { style: styles.title }, 'MIT lineHeight auf Page')
      ),
      e(Text, { style: { position: 'absolute', bottom: 30, left: 50, fontSize: 8 }, fixed: true }, 'ID: TEST'),
      e(Text, {
        style: { position: 'absolute', bottom: 30, left: 0, right: 0, textAlign: 'center', fontSize: 8, minHeight: 12 },
        fixed: true,
        render: (props) => `Seite ${props.pageNumber} von ${props.totalPages}`
      }),
      e(Text, { style: { position: 'absolute', bottom: 30, right: 50, fontSize: 8, textAlign: 'right' }, fixed: true }, 'DATUM')
    )
  );
};

// TEST 3: lineHeight NUR auf Content-View, NICHT auf Page
const Test3_LineHeightOnContentOnly = () => {
  const styles = StyleSheet.create({
    page: { fontFamily: 'Times-Roman', fontSize: 11, padding: 50, color: '#1B4332' }, // KEIN lineHeight!
    coverPage: { paddingBottom: 60, lineHeight: 1.5 }, // lineHeight hier auf Content!
    title: { fontSize: 26, fontWeight: 'bold', marginTop: 80, textAlign: 'center' },
  });

  return e(Document, null,
    e(Page, { size: 'A4', style: styles.page, wrap: true },
      e(View, { style: styles.coverPage },
        e(Text, { style: styles.title }, 'lineHeight auf Content')
      ),
      e(Text, { style: { position: 'absolute', bottom: 30, left: 50, fontSize: 8 }, fixed: true }, 'ID: TEST'),
      e(Text, {
        style: { position: 'absolute', bottom: 30, left: 0, right: 0, textAlign: 'center', fontSize: 8, minHeight: 12 },
        fixed: true,
        render: (props) => `Seite ${props.pageNumber} von ${props.totalPages}`
      }),
      e(Text, { style: { position: 'absolute', bottom: 30, right: 50, fontSize: 8, textAlign: 'right' }, fixed: true }, 'DATUM')
    )
  );
};

// TEST 4: lineHeight auf Page, aber EXPLIZIT lineHeight: 1 auf Footer
const Test4_OverrideLineHeightOnFooter = () => {
  const styles = StyleSheet.create({
    page: { fontFamily: 'Times-Roman', fontSize: 11, padding: 50, color: '#1B4332', lineHeight: 1.5 },
    coverPage: { paddingBottom: 60 },
    title: { fontSize: 26, fontWeight: 'bold', marginTop: 80, textAlign: 'center' },
  });

  return e(Document, null,
    e(Page, { size: 'A4', style: styles.page, wrap: true },
      e(View, { style: styles.coverPage },
        e(Text, { style: styles.title }, 'Override lineHeight')
      ),
      e(Text, { style: { position: 'absolute', bottom: 30, left: 50, fontSize: 8, lineHeight: 1 }, fixed: true }, 'ID: TEST'),
      e(Text, {
        style: { position: 'absolute', bottom: 30, left: 0, right: 0, textAlign: 'center', fontSize: 8, minHeight: 12, lineHeight: 1 },
        fixed: true,
        render: (props) => `Seite ${props.pageNumber} von ${props.totalPages}`
      }),
      e(Text, { style: { position: 'absolute', bottom: 30, right: 50, fontSize: 8, textAlign: 'right', lineHeight: 1 }, fixed: true }, 'DATUM')
    )
  );
};

async function runTests() {
  console.log('=== FINAL CONFIRMATION TESTS ===\n');

  const tests = [
    { name: 'final-1-no-lineheight', component: Test1_NoLineHeight },
    { name: 'final-2-lineheight-on-page', component: Test2_WithLineHeightOnPage },
    { name: 'final-3-lineheight-on-content', component: Test3_LineHeightOnContentOnly },
    { name: 'final-4-override-lineheight', component: Test4_OverrideLineHeightOnFooter },
  ];

  for (const test of tests) {
    try {
      const outputPath = path.join(__dirname, '..', `${test.name}.pdf`);
      await renderToFile(e(test.component), outputPath);
      console.log(`✅ ${test.name} erstellt`);
    } catch (error) {
      console.error(`❌ ${test.name}: ${error.message}`);
    }
  }

  console.log('\n=== ERWARTETE ERGEBNISSE ===');
  console.log('final-1-no-lineheight: Seitenzahlen SICHTBAR');
  console.log('final-2-lineheight-on-page: Seitenzahlen NICHT SICHTBAR (BUG!)');
  console.log('final-3-lineheight-on-content: Seitenzahlen SICHTBAR');
  console.log('final-4-override-lineheight: Seitenzahlen SICHTBAR (wenn Fix funktioniert)');
}

runTests();
