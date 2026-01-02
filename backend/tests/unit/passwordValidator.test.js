// 📁 backend/tests/unit/passwordValidator.test.js
// Unit-Tests für Password-Validierung

const { validatePassword } = require('../../utils/passwordValidator');

describe('Password Validator', () => {
  describe('validatePassword()', () => {

    // ✅ Gültige Passwörter
    describe('Gültige Passwörter', () => {
      test('akzeptiert starkes Passwort', () => {
        const result = validatePassword('Test1234');
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      test('akzeptiert Passwort mit Sonderzeichen', () => {
        const result = validatePassword('Test@1234!');
        expect(result.valid).toBe(true);
      });

      test('akzeptiert langes Passwort', () => {
        const result = validatePassword('DiesIstEinSehrLangesPasswort123');
        expect(result.valid).toBe(true);
      });
    });

    // ❌ Ungültige Passwörter
    describe('Ungültige Passwörter', () => {
      test('lehnt zu kurzes Passwort ab', () => {
        const result = validatePassword('Ab1');
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Mindestens 8 Zeichen erforderlich');
      });

      test('lehnt Passwort ohne Großbuchstaben ab', () => {
        const result = validatePassword('test1234');
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Mindestens 1 Großbuchstabe (A-Z) erforderlich');
      });

      test('lehnt Passwort ohne Kleinbuchstaben ab', () => {
        const result = validatePassword('TEST1234');
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Mindestens 1 Kleinbuchstabe (a-z) erforderlich');
      });

      test('lehnt Passwort ohne Zahl ab', () => {
        const result = validatePassword('TestTest');
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Mindestens 1 Zahl (0-9) erforderlich');
      });

      test('lehnt leeres Passwort ab', () => {
        const result = validatePassword('');
        expect(result.valid).toBe(false);
      });

      test('lehnt null/undefined ab', () => {
        const resultNull = validatePassword(null);
        const resultUndefined = validatePassword(undefined);

        expect(resultNull.valid).toBe(false);
        expect(resultUndefined.valid).toBe(false);
      });
    });

    // 📋 Mehrere Fehler
    describe('Mehrere Fehler', () => {
      test('gibt alle Fehler bei komplett ungültigem Passwort zurück', () => {
        const result = validatePassword('ab');
        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThanOrEqual(3);
      });
    });
  });
});
