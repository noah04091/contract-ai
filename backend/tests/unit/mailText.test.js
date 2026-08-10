// 📁 backend/tests/unit/mailText.test.js
// Unit-Tests für die gemeinsamen Pulse-Mail-Text-Helfer.
// Die Fälle stammen aus echten Produktions-Mails vom 10.08.2026.

const { plural, greetingName, capitalizeFirst } = require('../../utils/mailText');

describe('Pulse-Mail-Texte', () => {

  describe('plural()', () => {

    // ✅ Der real verschickte Fehlerfall
    describe('Ein-/Mehrzahl', () => {
      test('nimmt bei genau 1 die Einzahl', () => {
        expect(plural(1, 'Vertrag', 'Verträge')).toBe('Vertrag');
      });

      test('nimmt bei 2 die Mehrzahl', () => {
        expect(plural(2, 'Vertrag', 'Verträge')).toBe('Verträge');
      });

      test('nimmt bei 0 die Mehrzahl (im Deutschen korrekt)', () => {
        expect(plural(0, 'Vertrag', 'Verträge')).toBe('Verträge');
      });

      test('nimmt bei großen Zahlen die Mehrzahl', () => {
        expect(plural(173, 'Änderung', 'Änderungen')).toBe('Änderungen');
      });
    });

    // ✅ Regression: exakt die Strings, die real falsch rausgingen
    describe('Regression aus echten Mails vom 10.08.2026', () => {
      test('Staleness-Betreff bei 1 Vertrag (war: "1 Verträge …")', () => {
        const n = 1;
        expect(`${n} ${plural(n, 'Vertrag', 'Verträge')} seit über 14 Tagen nicht geprüft`)
          .toBe('1 Vertrag seit über 14 Tagen nicht geprüft');
      });

      test('Wach-Bericht-Vorschauzeile bei 1 Vertrag (war: "1 Verträge überwacht")', () => {
        const n = 1;
        expect(`${n} ${plural(n, 'Vertrag', 'Verträge')} überwacht`)
          .toBe('1 Vertrag überwacht');
      });

      test('"+ 1 weitere Verträge" wird zu "+ 1 weiterer Vertrag"', () => {
        const rest = 1;
        expect(`+ ${rest} ${plural(rest, 'weiterer Vertrag', 'weitere Verträge')}`)
          .toBe('+ 1 weiterer Vertrag');
      });
    });

    // ✅ Fälle aus dem Lektorat: Beugung hängt nicht nur am Substantiv
    describe('Kongruenz von Adjektiv, Artikel und Verb', () => {
      test('nach "aus" (Dativ) bleibt das Adjektiv in beiden Zahlen "geprüften"', () => {
        // Gemischte Deklination durch das implizite "einer" — NICHT "geprüfter".
        const bau = (n) => `aus ${n} geprüften ${plural(n, 'Änderung', 'Änderungen')}`;
        expect(bau(1)).toBe('aus 1 geprüften Änderung');
        expect(bau(2)).toBe('aus 2 geprüften Änderungen');
      });

      test('Verb richtet sich nach der Anzahl', () => {
        const bau = (n) => `${n} ${plural(n, 'Vertrag', 'Verträge')} ${plural(n, 'sollte', 'sollten')} erneut geprüft werden`;
        expect(bau(1)).toBe('1 Vertrag sollte erneut geprüft werden');
        expect(bau(2)).toBe('2 Verträge sollten erneut geprüft werden');
      });

      test('Relativpronomen richtet sich nach der Anzahl', () => {
        const bau = (n) => `${n} ${plural(n, 'neuen Befund', 'neue Befunde')} gefunden, ${plural(n, 'den', 'die')} du dir ansehen solltest`;
        expect(bau(1)).toBe('1 neuen Befund gefunden, den du dir ansehen solltest');
        expect(bau(2)).toBe('2 neue Befunde gefunden, die du dir ansehen solltest');
      });
    });
  });

  describe('greetingName()', () => {

    describe('Großschreibung', () => {
      test('schreibt einen klein geschriebenen Vornamen groß', () => {
        expect(greetingName({ firstName: 'gülhan' })).toBe('Gülhan');
      });

      test('lässt einen bereits großen Namen unverändert', () => {
        expect(greetingName({ firstName: 'Noah' })).toBe('Noah');
      });

      test('zerstört Binnen-Großschreibung nicht', () => {
        expect(greetingName({ firstName: 'McDonald' })).toBe('McDonald');
      });
    });

    describe('Reihenfolge und Fallback', () => {
      test('bevorzugt firstName vor name', () => {
        expect(greetingName({ firstName: 'Noah', name: 'Noah Liebold' })).toBe('Noah');
      });

      test('nutzt name, wenn firstName fehlt', () => {
        expect(greetingName({ name: 'Michelle Hänchen' })).toBe('Michelle Hänchen');
      });

      test('liefert null, wenn kein Name da ist → Mail nutzt neutrales "Hallo,"', () => {
        expect(greetingName({ email: 'liebold.noah@web.de' })).toBeNull();
      });

      test('liefert null bei leerem String', () => {
        expect(greetingName({ firstName: '' })).toBeNull();
      });

      test('liefert null bei reinen Leerzeichen', () => {
        expect(greetingName({ firstName: '   ' })).toBeNull();
      });

      test('liefert null bei fehlendem User', () => {
        expect(greetingName(null)).toBeNull();
        expect(greetingName(undefined)).toBeNull();
      });

      test('liefert null bei unerwartetem Typ', () => {
        expect(greetingName({ firstName: 42 })).toBeNull();
      });

      test('entfernt umschließende Leerzeichen', () => {
        expect(greetingName({ firstName: '  noah  ' })).toBe('Noah');
      });
    });
  });

  describe('capitalizeFirst()', () => {
    test('macht den ersten Buchstaben groß', () => {
      expect(capitalizeFirst('test')).toBe('Test');
    });

    test('funktioniert mit Umlauten', () => {
      expect(capitalizeFirst('österreich')).toBe('Österreich');
    });

    test('gibt leeren String unverändert zurück', () => {
      expect(capitalizeFirst('')).toBe('');
    });
  });
});
