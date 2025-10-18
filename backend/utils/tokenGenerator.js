// 🔐 Secure Token Generator
// Generates cryptographically secure tokens for signatures and envelope operations

const crypto = require('crypto');

/**
 * Generates a secure random token
 * @param {number} bytes - Number of random bytes (default: 16 = 128-bit)
 * @returns {string} Base64url-encoded token (22-32 characters)
 */
function generateSecureToken(bytes = 16) {
  // Generate cryptographically secure random bytes
  const buffer = crypto.randomBytes(bytes);

  // Convert to Base64url (URL-safe, no padding)
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Generates a signer token (128-bit, ~22 characters)
 * Used for signature links: /sign/:token
 */
function generateSignerToken() {
  return generateSecureToken(16); // 128-bit = 16 bytes
}

/**
 * Generates a revocation token (256-bit, ~43 characters)
 * Used for voiding envelopes (higher security)
 */
function generateRevocationToken() {
  return generateSecureToken(32); // 256-bit = 32 bytes
}

/**
 * Generates token expiration date
 * @param {number} days - Number of days until expiration (default: 14)
 * @returns {Date} Expiration date
 */
function getTokenExpiry(days = 14) {
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + days);
  return expiry;
}

/**
 * Validates if a token is still valid
 * @param {Object} signer - Signer object with token, tokenExpires, tokenInvalidated
 * @returns {boolean} True if token is valid
 */
function isTokenValid(signer) {
  // Token wurde manuell invalidiert
  if (signer.tokenInvalidated) {
    return false;
  }

  // Token ist abgelaufen
  if (new Date() > new Date(signer.tokenExpires)) {
    return false;
  }

  return true;
}

/**
 * Generates a short OTP code (6 digits)
 * For future OTP authentication
 */
function generateOTP() {
  return crypto.randomInt(100000, 999999).toString();
}

module.exports = {
  generateSecureToken,
  generateSignerToken,
  generateRevocationToken,
  getTokenExpiry,
  isTokenValid,
  generateOTP
};
