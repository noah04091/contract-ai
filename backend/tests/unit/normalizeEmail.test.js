// 📁 backend/tests/unit/normalizeEmail.test.js
// Unit-Tests für Email-Normalisierung

const { normalizeEmail } = require('../../utils/normalizeEmail');

describe('Email Normalizer', () => {
  describe('normalizeEmail()', () => {

    // ✅ Standard-Normalisierung
    describe('Standard-Normalisierung', () => {
      test('konvertiert zu Kleinbuchstaben', () => {
        expect(normalizeEmail('Test@Example.COM')).toBe('test@example.com');
      });

      test('entfernt führende Leerzeichen', () => {
        expect(normalizeEmail('  test@example.com')).toBe('test@example.com');
      });

      test('entfernt nachfolgende Leerzeichen', () => {
        expect(normalizeEmail('test@example.com  ')).toBe('test@example.com');
      });

      test('entfernt Leerzeichen auf beiden Seiten', () => {
        expect(normalizeEmail('  test@example.com  ')).toBe('test@example.com');
      });

      test('verändert bereits normalisierte E-Mail nicht', () => {
        expect(normalizeEmail('test@example.com')).toBe('test@example.com');
      });
    });

    // ❌ Edge Cases
    describe('Edge Cases', () => {
      test('gibt leeren String für null zurück', () => {
        expect(normalizeEmail(null)).toBe('');
      });

      test('gibt leeren String für undefined zurück', () => {
        expect(normalizeEmail(undefined)).toBe('');
      });

      test('gibt leeren String für leeren Input zurück', () => {
        expect(normalizeEmail('')).toBe('');
      });

      test('gibt leeren String für nur Leerzeichen zurück', () => {
        expect(normalizeEmail('   ')).toBe('');
      });
    });

    // 📧 Komplexe E-Mails
    describe('Komplexe E-Mails', () => {
      test('normalisiert E-Mail mit Subdomain', () => {
        expect(normalizeEmail('User@Mail.SUB.Example.COM')).toBe('user@mail.sub.example.com');
      });

      test('normalisiert E-Mail mit Zahlen', () => {
        expect(normalizeEmail('Test123@Example456.COM')).toBe('test123@example456.com');
      });

      test('normalisiert E-Mail mit Punkt im Local-Part', () => {
        expect(normalizeEmail('First.Last@Example.COM')).toBe('first.last@example.com');
      });

      test('normalisiert E-Mail mit Plus-Adressierung', () => {
        expect(normalizeEmail('User+Tag@Example.COM')).toBe('user+tag@example.com');
      });
    });
  });
});
