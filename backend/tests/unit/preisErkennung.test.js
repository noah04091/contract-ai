/**
 * Tests für die Preiserkennung von Better Contracts.
 *
 * Hintergrund (Befund 17.08.2026, behoben 01.09.2026): Die frühere Erkennung lag
 * in routes/betterContracts.js und las deutsche Tausenderpunkte als
 * Dezimaltrenner. Aus "Weiterbildung ab 4.452 €" wurde "4.45€/Monat" — eine um
 * das Tausendfache zu niedrige Zahl, die anschließend als Monatspreis angezeigt,
 * zum Sortieren benutzt und in ein Ersparnis-Abzeichen umgerechnet wurde.
 * Einmalpreise fehlten als Kategorie komplett.
 *
 * Diese Datei ist der erste Test, den Better Contracts überhaupt hat.
 */

const { deutscheZahl, formatiereEuro, extrahierePreise } = require('../../utils/preisErkennung');

describe('deutscheZahl', () => {
  test('liest Tausenderpunkte als Tausender, nicht als Dezimaltrenner', () => {
    expect(deutscheZahl('4.452')).toBe(4452);
    expect(deutscheZahl('1.299')).toBe(1299);
    expect(deutscheZahl('1.234.567')).toBe(1234567);
  });

  test('liest das Komma als Dezimaltrenner', () => {
    expect(deutscheZahl('29,99')).toBe(29.99);
    expect(deutscheZahl('4.452,00')).toBe(4452);
    expect(deutscheZahl('1.234,56')).toBe(1234.56);
  });

  test('behandelt einen Punkt mit ein bis zwei Nachkommastellen als Dezimalpunkt', () => {
    expect(deutscheZahl('4.45')).toBe(4.45);
    expect(deutscheZahl('19.9')).toBe(19.9);
  });

  test('kommt mit Zahlen ohne Trenner klar', () => {
    expect(deutscheZahl('4452')).toBe(4452);
    expect(deutscheZahl('19')).toBe(19);
  });

  test('liefert null statt zu raten', () => {
    expect(deutscheZahl('')).toBeNull();
    expect(deutscheZahl('   ')).toBeNull();
    expect(deutscheZahl('keine Zahl')).toBeNull();
    expect(deutscheZahl(null)).toBeNull();
    expect(deutscheZahl(undefined)).toBeNull();
    expect(deutscheZahl(4452)).toBeNull(); // bewusst: nur Zeichenketten
  });
});

describe('formatiereEuro', () => {
  test('schreibt glatte Beträge ohne Nachkommastellen', () => {
    expect(formatiereEuro(4452)).toBe('4.452 €');
    expect(formatiereEuro(19)).toBe('19 €');
  });

  test('schreibt krumme Beträge mit Komma', () => {
    expect(formatiereEuro(29.99)).toBe('29,99 €');
    expect(formatiereEuro(12.9)).toBe('12,90 €');
  });
});

describe('extrahierePreise — die Fälle aus dem Befund vom 17.08.2026', () => {
  test('4.452 € wird NICHT mehr zu 4,45 €/Monat', () => {
    const p = extrahierePreise('Weiterbildung ab 4.452 €');
    expect(p.monatlich).toEqual([]);
    expect(p.unbestimmt).toEqual([4452]);
    expect(p.anzeige).toEqual(['ab 4.452 €']);
  });

  test('1.299 € pro Monat wird als 1299 gelesen, nicht als 1,30', () => {
    const p = extrahierePreise('Unser Tarif ab 1.299 € pro Monat');
    expect(p.monatlich).toEqual([1299]);
    expect(p.anzeige).toEqual(['1.299 €/Monat']);
  });

  test('Einmalpreise werden erkannt statt verworfen', () => {
    expect(extrahierePreise('Der Kurs kostet 4.452 €').einmalig).toEqual([4452]);
    expect(extrahierePreise('Preis: 4452 EUR einmalig').einmalig).toEqual([4452]);
    expect(extrahierePreise('Seminargebühr 4.452,00 Euro').einmalig).toEqual([4452]);
    expect(extrahierePreise('Gesamtpreis 2.990 € einmalig').einmalig).toEqual([2990]);
  });

  test('ein Einmalpreis wird nicht als Monatspreis ausgezeichnet', () => {
    const p = extrahierePreise('Der Kurs kostet 4.452 €');
    expect(p.monatlich).toEqual([]);
    expect(p.anzeige).toEqual(['4.452 € einmalig']);
  });
});

describe('extrahierePreise — Währung und Schreibweisen', () => {
  test('erkennt €, EUR und Euro', () => {
    expect(extrahierePreise('29,99 € pro Monat').monatlich).toEqual([29.99]);
    expect(extrahierePreise('29,99 EUR pro Monat').monatlich).toEqual([29.99]);
    expect(extrahierePreise('29,99 Euro pro Monat').monatlich).toEqual([29.99]);
  });

  test('erkennt die Zeitangabe vor und hinter dem Betrag', () => {
    expect(extrahierePreise('Tarif ab 12,90 EUR mtl.').monatlich).toEqual([12.9]);
    expect(extrahierePreise('mtl. 12,90 €').monatlich).toEqual([12.9]);
    expect(extrahierePreise('monatlich ab 12,90 €').monatlich).toEqual([12.9]);
  });

  test('erkennt Jahresangaben', () => {
    expect(extrahierePreise('Jahresbeitrag 359,88 € pro Jahr').jaehrlich).toEqual([359.88]);
    expect(extrahierePreise('120 € p.a.').jaehrlich).toEqual([120]);
  });
});

describe('extrahierePreise — Ersparnisse sind keine Preise', () => {
  test('eine Ersparnis landet nicht in den Preisen', () => {
    const p = extrahierePreise('Sparen Sie bis zu 850 € im Jahr');
    expect(p.ersparnisse).toEqual([850]);
    expect(p.jaehrlich).toEqual([]);
    expect(p.anzeige).toEqual([]);
  });

  test('Preis und Ersparnis im selben Satz bleiben getrennt', () => {
    const p = extrahierePreise('Stromtarif ab 19 € monatlich, sparen Sie bis zu 850 € pro Jahr');
    expect(p.monatlich).toEqual([19]);
    expect(p.ersparnisse).toEqual([850]);
    expect(p.jaehrlich).toEqual([]);
  });

  test('Boni zählen als Ersparnis, nicht als Preis', () => {
    const p = extrahierePreise('Sofortbonus: 100 €');
    expect(p.ersparnisse).toEqual([100]);
    expect(p.einmalig).toEqual([]);
  });
});

describe('extrahierePreise — Plausibilität und Robustheit', () => {
  test('verwirft unplausible Monatsbeträge, lässt B2B-Höhen aber zu', () => {
    expect(extrahierePreise('0,10 € pro Monat').monatlich).toEqual([]);
    expect(extrahierePreise('2.500 € pro Monat').monatlich).toEqual([2500]);
    expect(extrahierePreise('999.999 € pro Monat').monatlich).toEqual([]);
  });

  test('kommt mit leerer und fehlender Eingabe klar', () => {
    for (const eingabe of ['', null, undefined, 123]) {
      const p = extrahierePreise(eingabe);
      expect(p.monatlich).toEqual([]);
      expect(p.anzeige).toEqual([]);
    }
  });

  test('meldet keine Preise, wo keine stehen', () => {
    const p = extrahierePreise('Rufen Sie uns an unter 0800 4452 452, Kundennummer 19.99');
    expect(p.anzeige).toEqual([]);
  });

  test('entfernt Dubletten und sortiert aufsteigend', () => {
    const p = extrahierePreise('19 € pro Monat. Erneut: 19 € pro Monat. Und 9 € pro Monat.');
    expect(p.monatlich).toEqual([9, 19]);
  });

  test('gibt höchstens fünf Anzeigewerte zurück', () => {
    const text = [10, 20, 30, 40, 50, 60, 70].map(n => `${n} € pro Monat`).join('. ');
    expect(extrahierePreise(text).anzeige.length).toBeLessThanOrEqual(5);
  });
});
