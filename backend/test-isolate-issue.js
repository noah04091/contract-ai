/**
 * TEST: Isoliere das genaue Problem
 * Vergleiche: FUNKTIONIERT vs FUNKTIONIERT NICHT
 */
const React = require('react');
const { Document, Page, Text, View, StyleSheet, renderToFile } = require('@react-pdf/renderer');
const path = require('path');

const e = React.createElement;

// ============================================
// TEST 1: FUNKTIONIERT - einfache inline styles
// ============================================
const Test1_Works = () => {
  return e(Document, null,
    e(Page, { size: 'A4', style: { padding: 50 }, wrap: true },
      e(View, { style: { marginBottom: 20 } },
        e(Text, null, 'Test 1 - Einfache Styles')
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

// ============================================
// TEST 2: Mit styles.page aus StyleSheet - Testen ob das Problem ist
// ============================================
const styles2 = StyleSheet.create({
  page: { fontFamily: 'Times-Roman', fontSize: 11, padding: 50, lineHeight: 1.5, color: '#1B4332' },
});

const Test2_WithPageStyle = () => {
  return e(Document, null,
    e(Page, { size: 'A4', style: styles2.page, wrap: true },
      e(View, { style: { marginBottom: 20 } },
        e(Text, null, 'Test 2 - Mit styles.page')
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

// ============================================
// TEST 3: Mit coverPage wrapper (wie im echten Code)
// ============================================
const styles3 = StyleSheet.create({
  page: { fontFamily: 'Times-Roman', fontSize: 11, padding: 50 },
  coverPage: { paddingBottom: 60 },  // <-- Das ist verdächtig!
});

const Test3_WithCoverPage = () => {
  return e(Document, null,
    e(Page, { size: 'A4', style: styles3.page, wrap: true },
      e(View, { style: styles3.coverPage },
        e(Text, null, 'Test 3 - Mit coverPage View')
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

// ============================================
// TEST 4: Viele Styles wie im echten Code
// ============================================
const styles4 = StyleSheet.create({
  page: { fontFamily: 'Times-Roman', fontSize: 11, padding: 50, lineHeight: 1.5, color: '#1B4332' },
  coverPage: { paddingBottom: 60 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', borderBottomWidth: 2, borderBottomColor: '#1B4332', paddingBottom: 15, marginBottom: 30 },
  companyInfo: { textAlign: 'right', fontSize: 9, color: '#3D5A4C' },
  companyName: { fontSize: 11, fontWeight: 'bold', color: '#1B4332', marginBottom: 2 },
  titleContainer: { alignItems: 'center', marginTop: 80, marginBottom: 60 },
  title: { fontSize: 26, fontWeight: 'bold', letterSpacing: 4, color: '#1B4332', textTransform: 'uppercase' },
});

const Test4_FullStyles = () => {
  return e(Document, null,
    e(Page, { size: 'A4', style: styles4.page, wrap: true },
      e(View, { style: styles4.coverPage },
        e(View, { style: styles4.header },
          e(View, { style: { width: 60 } }),
          e(View, { style: styles4.companyInfo },
            e(Text, { style: styles4.companyName }, 'Test GmbH'),
            e(Text, null, 'Teststraße 123')
          )
        ),
        e(View, { style: styles4.titleContainer },
          e(Text, { style: styles4.title }, 'VERTRAG')
        )
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

// ============================================
// TEST 5: Problem könnte lineHeight sein!
// ============================================
const styles5 = StyleSheet.create({
  page: { fontFamily: 'Times-Roman', fontSize: 11, padding: 50, lineHeight: 1.5 },  // lineHeight!
});

const Test5_LineHeight = () => {
  return e(Document, null,
    e(Page, { size: 'A4', style: styles5.page, wrap: true },
      e(View, { style: { marginBottom: 20 } },
        e(Text, null, 'Test 5 - Mit lineHeight: 1.5')
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

// ============================================
// TEST 6: color auf Page - könnte das Problem sein?
// ============================================
const styles6 = StyleSheet.create({
  page: { fontFamily: 'Times-Roman', fontSize: 11, padding: 50, color: '#1B4332' },  // color!
});

const Test6_Color = () => {
  return e(Document, null,
    e(Page, { size: 'A4', style: styles6.page, wrap: true },
      e(View, { style: { marginBottom: 20 } },
        e(Text, null, 'Test 6 - Mit color auf Page')
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

async function runTests() {
  console.log('=== ISOLATIONS-TESTS ===\n');

  const tests = [
    { name: 'test1-works', component: Test1_Works, desc: 'Einfache inline styles' },
    { name: 'test2-page-style', component: Test2_WithPageStyle, desc: 'Mit StyleSheet page' },
    { name: 'test3-coverpage', component: Test3_WithCoverPage, desc: 'Mit coverPage View' },
    { name: 'test4-full-styles', component: Test4_FullStyles, desc: 'Viele Styles' },
    { name: 'test5-lineheight', component: Test5_LineHeight, desc: 'Mit lineHeight' },
    { name: 'test6-color', component: Test6_Color, desc: 'Mit color auf Page' },
  ];

  for (const test of tests) {
    try {
      const outputPath = path.join(__dirname, '..', `isolate-${test.name}.pdf`);
      await renderToFile(e(test.component), outputPath);
      console.log(`✅ ${test.name}: ${test.desc}`);
    } catch (error) {
      console.error(`❌ ${test.name}: ${error.message}`);
    }
  }

  console.log('\n=== PRÜFE DIE PDFs! ===');
  console.log('Welche haben Seitenzahlen und welche nicht?');
}

runTests();
