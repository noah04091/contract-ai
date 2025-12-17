/**
 * DEBUG TEST: Was genau passiert im render callback?
 */
const React = require('react');
const { Document, Page, Text, View, renderToFile } = require('@react-pdf/renderer');
const path = require('path');

const e = React.createElement;

// Test mit console.log im render callback
const DebugDocument = () => {
  return e(Document, null,
    e(Page, { size: 'A4', style: { padding: 50 } },
      e(View, { style: { marginBottom: 500 } },
        e(Text, null, 'Seite 1 Content')
      ),
      e(View, { style: { marginBottom: 500 } },
        e(Text, null, 'Seite 2 Content')
      ),

      // Footer links - statisch
      e(Text, {
        style: { position: 'absolute', bottom: 30, left: 50, fontSize: 10 },
        fixed: true
      }, 'ID: TEST-123'),

      // Footer mitte - mit render und DEBUG
      e(Text, {
        style: { position: 'absolute', bottom: 30, left: 0, right: 0, textAlign: 'center', fontSize: 10, minHeight: 12 },
        fixed: true,
        render: (props) => {
          // Log the props to see what we get
          console.log('RENDER CALLED:', JSON.stringify(props));
          return `Seite ${props.pageNumber} von ${props.totalPages}`;
        }
      }),

      // Footer rechts - statisch
      e(Text, {
        style: { position: 'absolute', bottom: 30, right: 50, fontSize: 10, textAlign: 'right' },
        fixed: true
      }, '07.12.2025')
    )
  );
};

async function runTest() {
  console.log('=== DEBUG: render prop callback ===\n');

  try {
    const outputPath = path.join(__dirname, '..', 'test-debug-render.pdf');
    await renderToFile(e(DebugDocument), outputPath);
    console.log('\nPDF gespeichert:', outputPath);
  } catch (error) {
    console.error('FEHLER:', error.message);
    console.error(error.stack);
  }
}

runTest();
