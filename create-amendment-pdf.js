const fs = require('fs');

// Simples Text-basiertes PDF mit korrektem Header
// PDF 1.4 Format - minimal aber valide

const amendmentText = `Änderungsvereinbarung zum Arbeitsvertrag

zwischen

Muster GmbH, Musterstraße 1, 12345 Musterstadt
(nachfolgend "Arbeitgeber")

und

Max Mustermann, Beispielweg 2, 54321 Beispielstadt
(nachfolgend "Arbeitnehmer")

wird folgende Änderung des bestehenden Arbeitsvertrages vom 01.01.2020 vereinbart:

§ 1 Gegenstand der Änderung

Die wöchentliche Arbeitszeit wird mit Wirkung zum 01.03.2026 von 30 Stunden auf 40 Stunden erhöht.

§ 2 Gehaltsanpassung

Das monatliche Bruttogehalt wird entsprechend von 3.000 EUR auf 4.000 EUR angepasst.

§ 3 Fortgeltung des Hauptvertrages

Alle übrigen Bestimmungen des Arbeitsvertrages vom 01.01.2020 bleiben unverändert in Kraft.

§ 4 Inkrafttreten

Diese Änderungsvereinbarung tritt am 01.03.2026 in Kraft.

Musterstadt, den _______________

________________________          ________________________
Arbeitgeber                       Arbeitnehmer`;

// Erstelle ein minimales aber valides PDF
function createSimplePDF(text, outputPath) {
    const textBytes = Buffer.from(text, 'utf8');

    // PDF Objekte
    const objects = [];
    let objectNum = 1;

    // Catalog
    objects.push(`${objectNum} 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj`);
    objectNum++;

    // Pages
    objects.push(`${objectNum} 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj`);
    objectNum++;

    // Page
    objects.push(`${objectNum} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj`);
    objectNum++;

    // Content stream
    const lines = text.split('\n');
    let y = 750;
    let contentStream = 'BT\n/F1 11 Tf\n';

    lines.forEach(line => {
        // Escape special characters
        const escapedLine = line
            .replace(/\\/g, '\\\\')
            .replace(/\(/g, '\\(')
            .replace(/\)/g, '\\)')
            .replace(/ä/g, 'ae')
            .replace(/ö/g, 'oe')
            .replace(/ü/g, 'ue')
            .replace(/Ä/g, 'Ae')
            .replace(/Ö/g, 'Oe')
            .replace(/Ü/g, 'Ue')
            .replace(/ß/g, 'ss')
            .replace(/€/g, 'EUR');

        contentStream += `1 0 0 1 50 ${y} Tm\n(${escapedLine}) Tj\n`;
        y -= 14;
    });
    contentStream += 'ET';

    const streamBytes = Buffer.from(contentStream);
    objects.push(`${objectNum} 0 obj\n<< /Length ${streamBytes.length} >>\nstream\n${contentStream}\nendstream\nendobj`);
    objectNum++;

    // Font
    objects.push(`${objectNum} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj`);

    // Build PDF
    let pdf = '%PDF-1.4\n';
    const offsets = [];

    objects.forEach(obj => {
        offsets.push(pdf.length);
        pdf += obj + '\n';
    });

    // Cross-reference table
    const xrefOffset = pdf.length;
    pdf += 'xref\n';
    pdf += `0 ${objects.length + 1}\n`;
    pdf += '0000000000 65535 f \n';
    offsets.forEach(offset => {
        pdf += offset.toString().padStart(10, '0') + ' 00000 n \n';
    });

    // Trailer
    pdf += 'trailer\n';
    pdf += `<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
    pdf += 'startxref\n';
    pdf += xrefOffset + '\n';
    pdf += '%%EOF';

    fs.writeFileSync(outputPath, pdf);
    console.log('PDF erstellt:', outputPath);
}

createSimplePDF(amendmentText, './test-amendment-real.pdf');
