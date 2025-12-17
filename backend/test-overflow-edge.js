/**
 * TEST: Edge-Case wo Content GENAU an der Grenze ist
 * Das sollte das Problem mit leeren Seiten reproduzieren
 */
const React = require('react');
const { Document, Page, Text, View, StyleSheet, renderToFile } = require('@react-pdf/renderer');
const path = require('path');

const e = React.createElement;

// ============================================
// TEST 1: Content der FAST die Seite füllt (wrap: true)
// ============================================
const Test1_AlmostFull_WrapTrue = () => {
  const styles = StyleSheet.create({
    page: { fontFamily: 'Helvetica', fontSize: 11, padding: 0 },
    coverPage: { flexDirection: 'row', paddingBottom: 60, lineHeight: 1.6 },
    sidebar: { width: 8, backgroundColor: '#0066cc' },
    mainContent: { flex: 1, padding: 40 },
    header: { marginBottom: 30 },
    companyInfo: { textAlign: 'right', fontSize: 9 },
    companyName: { fontSize: 12, fontWeight: 'bold', marginBottom: 3 },
    titleContainer: { marginTop: 60, marginBottom: 50 },
    title: { fontSize: 32, fontWeight: 'bold', color: '#0066cc' },
    titleLine: { width: 60, height: 4, backgroundColor: '#00a3cc', marginTop: 15 },
    subtitle: { fontSize: 12, marginTop: 15 },
    partiesContainer: { marginTop: 40 },
    partiesLabel: { fontSize: 10, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 15 },
    partyBox: { borderLeftWidth: 3, borderLeftColor: '#0066cc', padding: 15, marginBottom: 20 },
    partyName: { fontSize: 13, fontWeight: 'bold' },
    partyAddress: { fontSize: 10, marginTop: 3 },
    partyRole: { fontSize: 9, marginTop: 10 },
  });

  return e(Document, null,
    // CoverPage mit wrap: true - VIEL CONTENT
    e(Page, { size: 'A4', style: styles.page, wrap: true },
      e(View, { style: styles.coverPage },
        e(View, { style: styles.sidebar }),
        e(View, { style: styles.mainContent },
          // Header mit Company Info
          e(View, { style: styles.header },
            e(View, { style: styles.companyInfo },
              e(Text, { style: styles.companyName }, 'Mustermann GmbH & Co. KG'),
              e(Text, null, 'Musterstraße 123'),
              e(Text, null, '12345 Musterstadt'),
              e(Text, null, 'Deutschland')
            )
          ),
          // Title
          e(View, { style: styles.titleContainer },
            e(Text, { style: styles.title }, 'INDIVIDUELLER KAUFVERTRAG'),
            e(View, { style: styles.titleLine }),
            e(Text, { style: styles.subtitle }, 'geschlossen am 07. Dezember 2025')
          ),
          // Parties
          e(View, { style: styles.partiesContainer },
            e(Text, { style: styles.partiesLabel }, 'Vertragsparteien'),
            e(View, { style: styles.partyBox },
              e(Text, { style: styles.partyName }, 'Mustermann GmbH & Co. KG Internationale Handelsgesellschaft'),
              e(Text, { style: styles.partyAddress }, 'Musterstraße 123, Gebäude A, 3. Stock'),
              e(Text, { style: styles.partyAddress }, '12345 Musterstadt, Bayern'),
              e(Text, { style: styles.partyAddress }, 'Deutschland'),
              e(Text, { style: styles.partyRole }, '– nachfolgend „Verkäufer" genannt –')
            ),
            e(View, { style: styles.partyBox },
              e(Text, { style: styles.partyName }, 'Beispiel AG Internationale Dienstleistungen und Beratung'),
              e(Text, { style: styles.partyAddress }, 'Beispielweg 456, Haus B, Erdgeschoss'),
              e(Text, { style: styles.partyAddress }, '67890 Beispielstadt, Baden-Württemberg'),
              e(Text, { style: styles.partyAddress }, 'Deutschland'),
              e(Text, { style: styles.partyRole }, '– nachfolgend „Käufer" genannt –')
            )
          )
        )
      ),
      // Footer
      e(Text, { style: { position: 'absolute', bottom: 25, left: 58, fontSize: 8 }, fixed: true }, 'ID: DOC-12345678'),
      e(Text, { style: { position: 'absolute', bottom: 25, left: 0, right: 0, textAlign: 'center', fontSize: 8, minHeight: 12 }, fixed: true,
        render: (props) => `Seite ${props.pageNumber} von ${props.totalPages}`
      }),
      e(Text, { style: { position: 'absolute', bottom: 25, right: 50, fontSize: 8, textAlign: 'right' }, fixed: true }, '07. Dezember 2025')
    ),
    // ContentPage
    e(Page, { size: 'A4', style: { padding: 50 }, wrap: true },
      e(View, null,
        e(Text, { style: { fontSize: 14, fontWeight: 'bold', marginBottom: 10 } }, '§ 1 Vertragsgegenstand'),
        e(Text, null, 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.')
      ),
      e(Text, { style: { position: 'absolute', bottom: 25, left: 0, right: 0, textAlign: 'center', fontSize: 8, minHeight: 12 }, fixed: true,
        render: (props) => `Seite ${props.pageNumber} von ${props.totalPages}`
      })
    )
  );
};

// ============================================
// TEST 2: Gleicher Content aber wrap: false
// ============================================
const Test2_AlmostFull_WrapFalse = () => {
  const styles = StyleSheet.create({
    page: { fontFamily: 'Helvetica', fontSize: 11, padding: 0 },
    coverPage: { flexDirection: 'row', paddingBottom: 60, lineHeight: 1.6 },
    sidebar: { width: 8, backgroundColor: '#0066cc' },
    mainContent: { flex: 1, padding: 40 },
    header: { marginBottom: 30 },
    companyInfo: { textAlign: 'right', fontSize: 9 },
    companyName: { fontSize: 12, fontWeight: 'bold', marginBottom: 3 },
    titleContainer: { marginTop: 60, marginBottom: 50 },
    title: { fontSize: 32, fontWeight: 'bold', color: '#0066cc' },
    titleLine: { width: 60, height: 4, backgroundColor: '#00a3cc', marginTop: 15 },
    subtitle: { fontSize: 12, marginTop: 15 },
    partiesContainer: { marginTop: 40 },
    partiesLabel: { fontSize: 10, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 15 },
    partyBox: { borderLeftWidth: 3, borderLeftColor: '#0066cc', padding: 15, marginBottom: 20 },
    partyName: { fontSize: 13, fontWeight: 'bold' },
    partyAddress: { fontSize: 10, marginTop: 3 },
    partyRole: { fontSize: 9, marginTop: 10 },
  });

  return e(Document, null,
    // CoverPage mit wrap: FALSE
    e(Page, { size: 'A4', style: styles.page, wrap: false },
      e(View, { style: styles.coverPage },
        e(View, { style: styles.sidebar }),
        e(View, { style: styles.mainContent },
          e(View, { style: styles.header },
            e(View, { style: styles.companyInfo },
              e(Text, { style: styles.companyName }, 'Mustermann GmbH & Co. KG'),
              e(Text, null, 'Musterstraße 123'),
              e(Text, null, '12345 Musterstadt'),
              e(Text, null, 'Deutschland')
            )
          ),
          e(View, { style: styles.titleContainer },
            e(Text, { style: styles.title }, 'INDIVIDUELLER KAUFVERTRAG'),
            e(View, { style: styles.titleLine }),
            e(Text, { style: styles.subtitle }, 'geschlossen am 07. Dezember 2025')
          ),
          e(View, { style: styles.partiesContainer },
            e(Text, { style: styles.partiesLabel }, 'Vertragsparteien'),
            e(View, { style: styles.partyBox },
              e(Text, { style: styles.partyName }, 'Mustermann GmbH & Co. KG Internationale Handelsgesellschaft'),
              e(Text, { style: styles.partyAddress }, 'Musterstraße 123, Gebäude A, 3. Stock'),
              e(Text, { style: styles.partyAddress }, '12345 Musterstadt, Bayern'),
              e(Text, { style: styles.partyAddress }, 'Deutschland'),
              e(Text, { style: styles.partyRole }, '– nachfolgend „Verkäufer" genannt –')
            ),
            e(View, { style: styles.partyBox },
              e(Text, { style: styles.partyName }, 'Beispiel AG Internationale Dienstleistungen und Beratung'),
              e(Text, { style: styles.partyAddress }, 'Beispielweg 456, Haus B, Erdgeschoss'),
              e(Text, { style: styles.partyAddress }, '67890 Beispielstadt, Baden-Württemberg'),
              e(Text, { style: styles.partyAddress }, 'Deutschland'),
              e(Text, { style: styles.partyRole }, '– nachfolgend „Käufer" genannt –')
            )
          )
        )
      ),
      e(Text, { style: { position: 'absolute', bottom: 25, left: 58, fontSize: 8 }, fixed: true }, 'ID: DOC-12345678'),
      e(Text, { style: { position: 'absolute', bottom: 25, left: 0, right: 0, textAlign: 'center', fontSize: 8, minHeight: 12 }, fixed: true,
        render: (props) => `Seite ${props.pageNumber} von ${props.totalPages}`
      }),
      e(Text, { style: { position: 'absolute', bottom: 25, right: 50, fontSize: 8, textAlign: 'right' }, fixed: true }, '07. Dezember 2025')
    ),
    e(Page, { size: 'A4', style: { padding: 50 }, wrap: true },
      e(View, null,
        e(Text, { style: { fontSize: 14, fontWeight: 'bold', marginBottom: 10 } }, '§ 1 Vertragsgegenstand'),
        e(Text, null, 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.')
      ),
      e(Text, { style: { position: 'absolute', bottom: 25, left: 0, right: 0, textAlign: 'center', fontSize: 8, minHeight: 12 }, fixed: true,
        render: (props) => `Seite ${props.pageNumber} von ${props.totalPages}`
      })
    )
  );
};

// ============================================
// TEST 3: KOMPAKTER - reduzierte Margins (BESTE LÖSUNG)
// ============================================
const Test3_Compact_WrapFalse = () => {
  const styles = StyleSheet.create({
    page: { fontFamily: 'Helvetica', fontSize: 11, padding: 0 },
    // KOMPAKTERE STYLES:
    coverPage: { flexDirection: 'row', paddingBottom: 40, lineHeight: 1.4 },  // Reduziert
    sidebar: { width: 8, backgroundColor: '#0066cc' },
    mainContent: { flex: 1, padding: 35 },  // Reduziert
    header: { marginBottom: 20 },  // Reduziert
    companyInfo: { textAlign: 'right', fontSize: 8 },  // Reduziert
    companyName: { fontSize: 11, fontWeight: 'bold', marginBottom: 2 },
    titleContainer: { marginTop: 40, marginBottom: 30 },  // Reduziert
    title: { fontSize: 26, fontWeight: 'bold', color: '#0066cc' },  // Reduziert
    titleLine: { width: 50, height: 3, backgroundColor: '#00a3cc', marginTop: 10 },
    subtitle: { fontSize: 11, marginTop: 10 },
    partiesContainer: { marginTop: 25 },  // Reduziert
    partiesLabel: { fontSize: 9, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 10 },
    partyBox: { borderLeftWidth: 3, borderLeftColor: '#0066cc', padding: 10, marginBottom: 12 },  // Reduziert
    partyName: { fontSize: 11, fontWeight: 'bold' },  // Reduziert
    partyAddress: { fontSize: 9, marginTop: 2 },  // Reduziert
    partyRole: { fontSize: 8, marginTop: 6 },  // Reduziert
  });

  return e(Document, null,
    e(Page, { size: 'A4', style: styles.page, wrap: false },
      e(View, { style: styles.coverPage },
        e(View, { style: styles.sidebar }),
        e(View, { style: styles.mainContent },
          e(View, { style: styles.header },
            e(View, { style: styles.companyInfo },
              e(Text, { style: styles.companyName }, 'Mustermann GmbH & Co. KG'),
              e(Text, null, 'Musterstraße 123'),
              e(Text, null, '12345 Musterstadt'),
              e(Text, null, 'Deutschland')
            )
          ),
          e(View, { style: styles.titleContainer },
            e(Text, { style: styles.title }, 'INDIVIDUELLER KAUFVERTRAG'),
            e(View, { style: styles.titleLine }),
            e(Text, { style: styles.subtitle }, 'geschlossen am 07. Dezember 2025')
          ),
          e(View, { style: styles.partiesContainer },
            e(Text, { style: styles.partiesLabel }, 'Vertragsparteien'),
            e(View, { style: styles.partyBox },
              e(Text, { style: styles.partyName }, 'Mustermann GmbH & Co. KG Internationale Handelsgesellschaft'),
              e(Text, { style: styles.partyAddress }, 'Musterstraße 123, Gebäude A, 3. Stock'),
              e(Text, { style: styles.partyAddress }, '12345 Musterstadt, Bayern'),
              e(Text, { style: styles.partyAddress }, 'Deutschland'),
              e(Text, { style: styles.partyRole }, '– nachfolgend „Verkäufer" genannt –')
            ),
            e(View, { style: styles.partyBox },
              e(Text, { style: styles.partyName }, 'Beispiel AG Internationale Dienstleistungen und Beratung'),
              e(Text, { style: styles.partyAddress }, 'Beispielweg 456, Haus B, Erdgeschoss'),
              e(Text, { style: styles.partyAddress }, '67890 Beispielstadt, Baden-Württemberg'),
              e(Text, { style: styles.partyAddress }, 'Deutschland'),
              e(Text, { style: styles.partyRole }, '– nachfolgend „Käufer" genannt –')
            )
          )
        )
      ),
      e(Text, { style: { position: 'absolute', bottom: 25, left: 58, fontSize: 8 }, fixed: true }, 'ID: DOC-12345678'),
      e(Text, { style: { position: 'absolute', bottom: 25, left: 0, right: 0, textAlign: 'center', fontSize: 8, minHeight: 12 }, fixed: true,
        render: (props) => `Seite ${props.pageNumber} von ${props.totalPages}`
      }),
      e(Text, { style: { position: 'absolute', bottom: 25, right: 50, fontSize: 8, textAlign: 'right' }, fixed: true }, '07. Dezember 2025')
    ),
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
  console.log('=== TEST: Edge-Case Overflow ===\n');

  const tests = [
    { name: 'edge-wrap-TRUE', component: Test1_AlmostFull_WrapTrue },
    { name: 'edge-wrap-FALSE', component: Test2_AlmostFull_WrapFalse },
    { name: 'edge-COMPACT', component: Test3_Compact_WrapFalse },
  ];

  for (const test of tests) {
    try {
      const outputPath = path.join(__dirname, '..', `test-${test.name}.pdf`);
      await renderToFile(e(test.component), outputPath);
      console.log(`✅ ${test.name} erstellt`);
    } catch (error) {
      console.error(`❌ ${test.name}: ${error.message}`);
    }
  }

  console.log('\n=== VERGLEICHE DIE PDFs! ===');
  console.log('Achte auf: Seitenzahl, leere Seiten, Content-Überlauf');
}

runTests();
