// 📁 src/__tests__/fileType.test.ts
// Stufe 5 der Dateityp-Kette (20.08.2026): der gemeinsame Typ-Helfer.
//
// Hintergrund: 136 von 843 Vertraegen sind gar keine PDF (102 Word, 32 Bilder, 1 ZIP,
// 1 ODT). Die Oberflaeche zeigte trotzdem ueberall PDF an und oeffnete einen
// PDF-Betrachter, der dann mit "Fehler beim Laden des PDF-Dokuments" abbrach.
//
// Die wichtigste Zusicherung hier ist die FAIL-SAFE-RICHTUNG: Wer den Typ nicht
// sicher kennt, behandelt die Datei als PDF. 79 % aller Vertraege SIND PDFs; eine
// Datei faelschlich als "keine PDF" einzustufen wuerde eine heute funktionierende
// Ansicht aussperren (echte Verschlechterung), waehrend der umgekehrte Fehler nur
// den bereits bekannten Zustand stehen laesst.

import { getFileTypeInfo, canOpenInPdfViewer } from '../utils/fileType';

const DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

describe('getFileTypeInfo: der gespeicherte Typ schlaegt den Dateinamen', () => {
  test('PDF wird als PDF erkannt', () => {
    const i = getFileTypeInfo({ mimetype: 'application/pdf', name: 'Vertrag.pdf' });
    expect(i.variant).toBe('pdf');
    expect(i.isPdf).toBe(true);
    expect(i.label).toBe('PDF');
  });

  test('Word wird als Dokument erkannt, auch wenn der Name luegt', () => {
    const i = getFileTypeInfo({ mimetype: DOCX, name: 'sieht_aus_wie.pdf' });
    expect(i.variant).toBe('doc');
    expect(i.isPdf).toBe(false);
    expect(i.actionLabel).toBe('Dokument öffnen');
  });

  test('Bilder werden als Bild erkannt', () => {
    expect(getFileTypeInfo({ mimetype: 'image/png', name: 'x.png' }).variant).toBe('image');
    expect(getFileTypeInfo({ mimetype: 'image/jpeg', name: 'x.jpg' }).label).toBe('BILD');
    expect(getFileTypeInfo({ mimetype: 'image/png' }).isPdf).toBe(false);
  });

  test('Archive gelten als sonstige Datei', () => {
    expect(getFileTypeInfo({ mimetype: 'application/zip', name: 'ANNEX.zip' }).variant).toBe('other');
    expect(getFileTypeInfo({ mimetype: 'application/zip' }).isPdf).toBe(false);
  });

  test('das alte Word-Format .doc wird ebenfalls erkannt', () => {
    expect(getFileTypeInfo({ mimetype: 'application/msword' }).variant).toBe('doc');
  });
});

describe('Rueckfall auf die Dateiendung (die 42 Vertraege ohne gespeicherten Typ)', () => {
  test('ohne MIME-Typ entscheidet die Endung', () => {
    expect(getFileTypeInfo({ name: 'Vertrag.pdf' }).variant).toBe('pdf');
    expect(getFileTypeInfo({ name: 'Vertrag.docx' }).variant).toBe('doc');
    expect(getFileTypeInfo({ name: 'Foto.JPEG' }).variant).toBe('image');
    expect(getFileTypeInfo({ name: 'Archiv.zip' }).variant).toBe('other');
  });

  test('Grossschreibung ist egal', () => {
    expect(getFileTypeInfo({ name: 'VERTRAG.DOCX' }).variant).toBe('doc');
  });
});

describe('⚠️ FAIL-SAFE: im Zweifel PDF, damit nichts ausgesperrt wird', () => {
  test('Name ganz ohne Endung (E-Mail-Import) gilt als PDF', () => {
    // Realfall: "Mustervergleich_RMAZ-5986359" — Name ohne Endung.
    const i = getFileTypeInfo({ name: 'Mustervergleich_RMAZ-5986359' });
    expect(i.isPdf).toBe(true);
  });

  test('unbekannte Endung gilt als PDF', () => {
    expect(getFileTypeInfo({ name: 'datei.xyz' }).isPdf).toBe(true);
  });

  test('unbekannter MIME-Typ faellt auf die Endung zurueck', () => {
    expect(getFileTypeInfo({ mimetype: 'application/octet-stream', name: 'x.docx' }).variant).toBe('doc');
  });

  test('gar keine Angaben gelten als PDF', () => {
    expect(getFileTypeInfo(null).isPdf).toBe(true);
    expect(getFileTypeInfo(undefined).isPdf).toBe(true);
    expect(getFileTypeInfo({}).isPdf).toBe(true);
    expect(getFileTypeInfo({ mimetype: null, name: null }).isPdf).toBe(true);
  });

  test('leere Zeichenketten brechen nichts', () => {
    expect(getFileTypeInfo({ mimetype: '', name: '' }).isPdf).toBe(true);
    expect(getFileTypeInfo({ name: '   ' }).isPdf).toBe(true);
    expect(getFileTypeInfo({ name: '.pdf' }).isPdf).toBe(true);   // nur Endung, kein Name
  });
});

describe('canOpenInPdfViewer: die Sperre vor dem Betrachter', () => {
  test('erlaubt bei echter PDF', () => {
    expect(canOpenInPdfViewer({ mimetype: 'application/pdf' })).toBe(true);
  });

  test('sperrt bei Word und Bild — genau hier entstand der Fehler', () => {
    expect(canOpenInPdfViewer({ mimetype: DOCX })).toBe(false);
    expect(canOpenInPdfViewer({ mimetype: 'image/png' })).toBe(false);
  });

  test('erlaubt im Zweifel, statt eine funktionierende Ansicht auszusperren', () => {
    expect(canOpenInPdfViewer(null)).toBe(true);
    expect(canOpenInPdfViewer({ name: 'ohne-endung' })).toBe(true);
  });
});
