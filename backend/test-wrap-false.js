/**
 * TEST: wrap: false auf CoverPage - Verhindert das leere Seiten?
 */
const React = require('react');
const { Document, Page, Text, View, StyleSheet, renderToFile } = require('@react-pdf/renderer');
const path = require('path');

const e = React.createElement;

// ============================================
// TEST 1: wrap: true (AKTUELLER ZUSTAND) - erzeugt leere Seite?
// ============================================
const Test1_WrapTrue = () => {
  const styles = StyleSheet.create({
    page: { fontFamily: 'Helvetica', fontSize: 11, padding: 0 },
    coverPage: { flexDirection: 'row', paddingBottom: 60, lineHeight: 1.6 },
    sidebar: { width: 8, backgroundColor: '#0066cc' },
    mainContent: { flex: 1, padding: 40 },
    titleContainer: { marginTop: 60, marginBottom: 50 },
    title: { fontSize: 32, fontWeight: 'bold', color: '#0066cc' },
    partiesContainer: { marginTop: 40 },
    partyBox: { borderLeftWidth: 3, borderLeftColor: '#0066cc', padding: 15, marginBottom: 20 },
    partyName: { fontSize: 13, fontWeight: 'bold' },
    partyAddress: { fontSize: 10, marginTop: 3 },
    partyRole: { fontSize: 9, marginTop: 10 },
  });

  return e(Document, null,
    // CoverPage mit wrap: true
    e(Page, { size: 'A4', style: styles.page, wrap: true },
      e(View, { style: styles.coverPage },
        e(View, { style: styles.sidebar }),
        e(View, { style: styles.mainContent },
          e(View, { style: styles.titleContainer },
            e(Text, { style: styles.title }, 'KAUFVERTRAG'),
            e(Text, null, 'geschlossen am 07. Dezember 2025')
          ),
          e(View, { style: styles.partiesContainer },
            e(Text, null, 'Vertragsparteien'),
            e(View, { style: styles.partyBox },
              e(Text, { style: styles.partyName }, 'Mustermann GmbH & Co. KG'),
              e(Text, { style: styles.partyAddress }, 'Musterstraße 123'),
              e(Text, { style: styles.partyAddress }, '12345 Musterstadt'),
              e(Text, { style: styles.partyRole }, '– Verkäufer –')
            ),
            e(View, { style: styles.partyBox },
              e(Text, { style: styles.partyName }, 'Beispiel AG'),
              e(Text, { style: styles.partyAddress }, 'Beispielweg 456'),
              e(Text, { style: styles.partyAddress }, '67890 Beispielstadt'),
              e(Text, { style: styles.partyRole }, '– Käufer –')
            )
          )
        )
      ),
      // Footer
      e(Text, { style: { position: 'absolute', bottom: 25, left: 0, right: 0, textAlign: 'center', fontSize: 8, minHeight: 12 }, fixed: true,
        render: (props) => `Seite ${props.pageNumber} von ${props.totalPages}`
      })
    ),
    // ContentPage
    e(Page, { size: 'A4', style: { padding: 50 }, wrap: true },
      e(View, null,
        e(Text, { style: { fontSize: 14, fontWeight: 'bold', marginBottom: 10 } }, '§ 1 Vertragsgegenstand'),
        e(Text, null, 'Lorem ipsum dolor sit amet.')
      ),
      e(Text, { style: { position: 'absolute', bottom: 25, left: 0, right: 0, textAlign: 'center', fontSize: 8, minHeight: 12 }, fixed: true,
        render: (props) => `Seite ${props.pageNumber} von ${props.totalPages}`
      })
    )
  );
};

// ============================================
// TEST 2: wrap: false auf CoverPage - KEIN Overflow erlaubt
// ============================================
const Test2_WrapFalse = () => {
  const styles = StyleSheet.create({
    page: { fontFamily: 'Helvetica', fontSize: 11, padding: 0 },
    coverPage: { flexDirection: 'row', paddingBottom: 60, lineHeight: 1.6 },
    sidebar: { width: 8, backgroundColor: '#0066cc' },
    mainContent: { flex: 1, padding: 40 },
    titleContainer: { marginTop: 60, marginBottom: 50 },
    title: { fontSize: 32, fontWeight: 'bold', color: '#0066cc' },
    partiesContainer: { marginTop: 40 },
    partyBox: { borderLeftWidth: 3, borderLeftColor: '#0066cc', padding: 15, marginBottom: 20 },
    partyName: { fontSize: 13, fontWeight: 'bold' },
    partyAddress: { fontSize: 10, marginTop: 3 },
    partyRole: { fontSize: 9, marginTop: 10 },
  });

  return e(Document, null,
    // CoverPage mit wrap: FALSE!
    e(Page, { size: 'A4', style: styles.page, wrap: false },
      e(View, { style: styles.coverPage },
        e(View, { style: styles.sidebar }),
        e(View, { style: styles.mainContent },
          e(View, { style: styles.titleContainer },
            e(Text, { style: styles.title }, 'KAUFVERTRAG'),
            e(Text, null, 'geschlossen am 07. Dezember 2025')
          ),
          e(View, { style: styles.partiesContainer },
            e(Text, null, 'Vertragsparteien'),
            e(View, { style: styles.partyBox },
              e(Text, { style: styles.partyName }, 'Mustermann GmbH & Co. KG'),
              e(Text, { style: styles.partyAddress }, 'Musterstraße 123'),
              e(Text, { style: styles.partyAddress }, '12345 Musterstadt'),
              e(Text, { style: styles.partyRole }, '– Verkäufer –')
            ),
            e(View, { style: styles.partyBox },
              e(Text, { style: styles.partyName }, 'Beispiel AG'),
              e(Text, { style: styles.partyAddress }, 'Beispielweg 456'),
              e(Text, { style: styles.partyAddress }, '67890 Beispielstadt'),
              e(Text, { style: styles.partyRole }, '– Käufer –')
            )
          )
        )
      ),
      // Footer
      e(Text, { style: { position: 'absolute', bottom: 25, left: 0, right: 0, textAlign: 'center', fontSize: 8, minHeight: 12 }, fixed: true,
        render: (props) => `Seite ${props.pageNumber} von ${props.totalPages}`
      })
    ),
    // ContentPage
    e(Page, { size: 'A4', style: { padding: 50 }, wrap: true },
      e(View, null,
        e(Text, { style: { fontSize: 14, fontWeight: 'bold', marginBottom: 10 } }, '§ 1 Vertragsgegenstand'),
        e(Text, null, 'Lorem ipsum dolor sit amet.')
      ),
      e(Text, { style: { position: 'absolute', bottom: 25, left: 0, right: 0, textAlign: 'center', fontSize: 8, minHeight: 12 }, fixed: true,
        render: (props) => `Seite ${props.pageNumber} von ${props.totalPages}`
      })
    )
  );
};

// ============================================
// TEST 3: wrap: false + REDUZIERTE Margins (EMPFOHLENE LÖSUNG)
// ============================================
const Test3_WrapFalseReducedMargins = () => {
  const styles = StyleSheet.create({
    page: { fontFamily: 'Helvetica', fontSize: 11, padding: 0 },
    coverPage: { flexDirection: 'row', paddingBottom: 40, lineHeight: 1.5 },  // REDUZIERT
    sidebar: { width: 8, backgroundColor: '#0066cc' },
    mainContent: { flex: 1, padding: 35 },  // REDUZIERT
    titleContainer: { marginTop: 40, marginBottom: 30 },  // REDUZIERT
    title: { fontSize: 28, fontWeight: 'bold', color: '#0066cc' },  // REDUZIERT
    partiesContainer: { marginTop: 25 },  // REDUZIERT
    partyBox: { borderLeftWidth: 3, borderLeftColor: '#0066cc', padding: 12, marginBottom: 15 },  // REDUZIERT
    partyName: { fontSize: 12, fontWeight: 'bold' },
    partyAddress: { fontSize: 9, marginTop: 2 },  // REDUZIERT
    partyRole: { fontSize: 8, marginTop: 8 },
  });

  return e(Document, null,
    // CoverPage mit wrap: FALSE + reduzierte Margins
    e(Page, { size: 'A4', style: styles.page, wrap: false },
      e(View, { style: styles.coverPage },
        e(View, { style: styles.sidebar }),
        e(View, { style: styles.mainContent },
          e(View, { style: styles.titleContainer },
            e(Text, { style: styles.title }, 'KAUFVERTRAG'),
            e(Text, null, 'geschlossen am 07. Dezember 2025')
          ),
          e(View, { style: styles.partiesContainer },
            e(Text, null, 'Vertragsparteien'),
            e(View, { style: styles.partyBox },
              e(Text, { style: styles.partyName }, 'Mustermann GmbH & Co. KG'),
              e(Text, { style: styles.partyAddress }, 'Musterstraße 123'),
              e(Text, { style: styles.partyAddress }, '12345 Musterstadt'),
              e(Text, { style: styles.partyRole }, '– Verkäufer –')
            ),
            e(View, { style: styles.partyBox },
              e(Text, { style: styles.partyName }, 'Beispiel AG'),
              e(Text, { style: styles.partyAddress }, 'Beispielweg 456'),
              e(Text, { style: styles.partyAddress }, '67890 Beispielstadt'),
              e(Text, { style: styles.partyRole }, '– Käufer –')
            )
          )
        )
      ),
      // Footer
      e(Text, { style: { position: 'absolute', bottom: 25, left: 0, right: 0, textAlign: 'center', fontSize: 8, minHeight: 12 }, fixed: true,
        render: (props) => `Seite ${props.pageNumber} von ${props.totalPages}`
      })
    ),
    // ContentPage
    e(Page, { size: 'A4', style: { padding: 50 }, wrap: true },
      e(View, null,
        e(Text, { style: { fontSize: 14, fontWeight: 'bold', marginBottom: 10 } }, '§ 1 Vertragsgegenstand'),
        e(Text, null, 'Lorem ipsum dolor sit amet.')
      ),
      e(Text, { style: { position: 'absolute', bottom: 25, left: 0, right: 0, textAlign: 'center', fontSize: 8, minHeight: 12 }, fixed: true,
        render: (props) => `Seite ${props.pageNumber} von ${props.totalPages}`
      })
    )
  );
};

async function runTests() {
  console.log('=== TEST: wrap Verhalten auf CoverPage ===\n');

  const tests = [
    { name: 'wrap-TRUE', component: Test1_WrapTrue, desc: 'Aktueller Zustand - wrap: true' },
    { name: 'wrap-FALSE', component: Test2_WrapFalse, desc: 'Nur wrap: false' },
    { name: 'wrap-FALSE-reduced', component: Test3_WrapFalseReducedMargins, desc: 'wrap: false + reduzierte Margins (EMPFOHLEN)' },
  ];

  for (const test of tests) {
    try {
      const outputPath = path.join(__dirname, '..', `test-${test.name}.pdf`);
      await renderToFile(e(test.component), outputPath);
      console.log(`✅ ${test.name}: ${test.desc}`);
    } catch (error) {
      console.error(`❌ ${test.name}: ${error.message}`);
    }
  }

  console.log('\n=== PRÜFE DIE PDFs! ===');
  console.log('test-wrap-TRUE.pdf      -> Hat Seite 2 leeren Inhalt?');
  console.log('test-wrap-FALSE.pdf     -> Keine leere Seite 2?');
  console.log('test-wrap-FALSE-reduced.pdf -> Beste Version?');
  console.log('\nErwartung: wrap-TRUE = 3 Seiten (mit leerer Seite 2)');
  console.log('           wrap-FALSE = 2 Seiten (keine leere Seite)');
}

runTests();
