/**
 * Password Validator - Contract AI
 *
 * Sichere Passwort-Policy mit klaren Fehlermeldungen.
 *
 * Anforderungen:
 * - Mindestens 8 Zeichen
 * - Mindestens 1 Großbuchstabe (A-Z)
 * - Mindestens 1 Kleinbuchstabe (a-z)
 * - Mindestens 1 Zahl (0-9)
 */

const PASSWORD_MIN_LENGTH = 8;

/**
 * Validiert ein Passwort gegen die Sicherheitsanforderungen
 *
 * @param {string} password - Das zu validierende Passwort
 * @returns {{ valid: boolean, errors: string[], message: string }}
 */
function validatePassword(password) {
  const errors = [];

  // Grundlegende Prüfung
  if (!password || typeof password !== 'string') {
    return {
      valid: false,
      errors: ['Passwort ist erforderlich'],
      message: 'Passwort ist erforderlich'
    };
  }

  // Längenprüfung
  if (password.length < PASSWORD_MIN_LENGTH) {
    errors.push(`Mindestens ${PASSWORD_MIN_LENGTH} Zeichen erforderlich`);
  }

  // Großbuchstabe
  if (!/[A-Z]/.test(password)) {
    errors.push('Mindestens 1 Großbuchstabe (A-Z) erforderlich');
  }

  // Kleinbuchstabe
  if (!/[a-z]/.test(password)) {
    errors.push('Mindestens 1 Kleinbuchstabe (a-z) erforderlich');
  }

  // Zahl
  if (!/[0-9]/.test(password)) {
    errors.push('Mindestens 1 Zahl (0-9) erforderlich');
  }

  // Ergebnis zusammenstellen
  if (errors.length === 0) {
    return {
      valid: true,
      errors: [],
      message: 'Passwort erfüllt alle Anforderungen'
    };
  }

  return {
    valid: false,
    errors: errors,
    message: errors.join('. ')
  };
}

/**
 * Gibt die Passwort-Anforderungen als Text zurück
 * (für Frontend-Anzeige oder API-Response)
 */
function getPasswordRequirements() {
  return {
    minLength: PASSWORD_MIN_LENGTH,
    requirements: [
      `Mindestens ${PASSWORD_MIN_LENGTH} Zeichen`,
      'Mindestens 1 Großbuchstabe (A-Z)',
      'Mindestens 1 Kleinbuchstabe (a-z)',
      'Mindestens 1 Zahl (0-9)'
    ]
  };
}

module.exports = {
  validatePassword,
  getPasswordRequirements,
  PASSWORD_MIN_LENGTH
};
