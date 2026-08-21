// 📁 backend/tests/unit/fotoAnalyseEinWeg.test.js
// Stufe 2 (21.08.2026): PDF, Word und Foto nehmen denselben Weg.
//
// Ausgangslage: Ein Foto zu analysieren ging auf ZWEI Arten schief.
//   Weg 1 (hochladen + analysieren): Das Bild wurde in ein PDF gewickelt und der
//     Fingerabdruck DANACH genommen. Verglichen wurde er mit dem des Original-Fotos
//     → nie ein Treffer → die Pipeline legte einen ZWEITEN Vertrag an.
//     Gemessen: 16 solcher Doppel im Bestand, 10 bei echten Kunden.
//   Weg 2 (Knopf in der Liste): Das Bild galt dort schlicht als PDF, die Pipeline
//     versuchte ein PNG als PDF zu lesen und brach ab. Von 40 Bild-Verträgen trug
//     genau EINER eine eigene Analyse.
//
// Diese Tests sichern die vier Zusicherungen, auf denen die Lösung steht.

const fs = require('fs');
const path = require('path');

const lies = (rel) => fs.readFileSync(path.join(__dirname, '..', '..', rel), 'utf8');
// Kommentare zaehlen nicht als Code — sonst wuerde die Erklaerung den Test bestehen lassen.
const nurCode = (src) => src.split(/\r?\n/).filter(z => !z.trim().startsWith('//')).join('\n');

describe('Zusicherung 1: Der Kern bekommt den Ziel-Vertrag gesagt, statt zu raten', () => {
  const code = nurCode(lies('routes/analyze.js'));

  test('die Pipeline nimmt einen vorgegebenen Ziel-Vertrag an', () => {
    expect(code).toMatch(/req\.zielVertrag/);
  });

  test('der Ziel-Vertrag wird VOR dem Fingerabdruck-Abgleich ausgewertet', () => {
    const posZiel = code.indexOf('req.zielVertrag');
    const posAbgleich = code.indexOf('checkForDuplicate(');
    expect(posZiel).toBeGreaterThan(-1);
    expect(posAbgleich).toBeGreaterThan(-1);
    // Der Abgleich darf nur noch der Rueckfall sein.
    expect(posZiel).toBeLessThan(code.lastIndexOf('checkForDuplicate('));
  });

  test('beide Wege in contracts.js geben ihn mit — der blockierende UND der Hintergrund-Lauf', () => {
    const c = nurCode(lies('routes/contracts.js'));
    const treffer = c.match(/zielVertrag/g) || [];
    expect(treffer.length).toBeGreaterThanOrEqual(3); // Laden + 2x Uebergabe
  });
});

describe('Zusicherung 2: Bilder werden auch im Listen-Weg eingewickelt', () => {
  const code = nurCode(lies('routes/contracts.js'));

  test('contracts.js kennt die Foto-Umwandlung', () => {
    expect(code).toMatch(/convertImageToPdf/);
    expect(code).toMatch(/isImageMimetype/);
  });

  test('⚠️ ein Bild faellt NICHT mehr stillschweigend in den PDF-Zweig', () => {
    // Die Umwandlung muss VOR der Typ-Entscheidung stehen, sonst wirkt sie nicht.
    const posWickeln = code.indexOf('convertImageToPdf');
    const posTypEntscheidung = code.indexOf("? erkannterTyp\n      : 'application/pdf'");
    expect(posWickeln).toBeGreaterThan(-1);
    expect(posTypEntscheidung).toBeGreaterThan(-1);
    expect(posWickeln).toBeLessThan(posTypEntscheidung);
  });
});

describe('Zusicherung 3: Ein bestehender Vertrag behaelt SEINE Datei', () => {
  const code = nurCode(lies('routes/analyze.js'));

  test('der Dateiverweis wird nur gesetzt, wenn der Vertrag noch keinen hat', () => {
    expect(code).toMatch(/if\s*\(\s*!existingContract\.s3Key\s*\)/);
  });

  test('⚠️ es gibt KEIN unbedingtes Ueberschreiben mehr', () => {
    // Genau eine Zuweisung, und die steht im Schutz-Zweig oben.
    const zuweisungen = code.match(/updateData\.s3Key\s*=/g) || [];
    expect(zuweisungen.length).toBe(1);
  });
});

describe('Zusicherung 4: Der Fingerabdruck stammt vom ORIGINAL, nicht von der gewickelten PDF', () => {
  const code = nurCode(lies('routes/analyze.js'));

  test('der Stempel des Originals wird vor dem Wickeln genommen', () => {
    const posStempel = code.indexOf('req.originalFileHash =');
    const posWickeln = code.indexOf('convertImageToPdf(imgBuffer');
    expect(posStempel).toBeGreaterThan(-1);
    expect(posWickeln).toBeGreaterThan(-1);
    expect(posStempel).toBeLessThan(posWickeln);
  });

  test('der Abgleich bevorzugt ihn', () => {
    expect(code).toMatch(/req\.originalFileHash\s*\|\|\s*fileHash/);
  });

  test('⚠️ er ueberlebt den Sprung in den Hintergrund-Lauf', () => {
    // Ohne diese beiden Stellen greift der Fix im Async-Modus NICHT.
    expect(code).toMatch(/originalFileHash:\s*req\.originalFileHash/);
    expect(code).toMatch(/originalFileHash:\s*snapshot\.originalFileHash/);
  });
});

describe('Bausteine der Foto-Erkennung funktionieren wirklich', () => {
  const { detectMimeType } = require('../../utils/emailImportSecurity');
  const { isImageMimetype } = require('../../services/imageToPdf');

  test('ein PNG-Puffer wird als Bild erkannt', () => {
    const png = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
    expect(detectMimeType(png)).toBe('image/png');
    expect(isImageMimetype(detectMimeType(png))).toBe(true);
  });

  test('ein JPEG-Puffer ebenfalls', () => {
    const jpg = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10]);
    expect(detectMimeType(jpg)).toBe('image/jpeg');
    expect(isImageMimetype(detectMimeType(jpg))).toBe(true);
  });

  test('⚠️ eine PDF ist KEIN Bild — der PDF-Weg bleibt unberuehrt', () => {
    const pdf = Buffer.from('%PDF-1.7\n');
    expect(detectMimeType(pdf)).toBe('application/pdf');
    expect(isImageMimetype(detectMimeType(pdf))).toBe(false);
  });

  test('⚠️ eine Word-Datei ist KEIN Bild', () => {
    const docx = Buffer.concat([Buffer.from([0x50, 0x4B, 0x03, 0x04]), Buffer.from('word/document.xml')]);
    expect(isImageMimetype(detectMimeType(docx))).toBe(false);
  });
});
