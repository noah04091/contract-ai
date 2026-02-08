// 📁 backend/utils/unsubscribeToken.js
// GDPR-Compliant Unsubscribe Token Generation & Verification

const crypto = require('crypto');

const SECRET = process.env.JWT_SECRET || 'contract-ai-unsubscribe-secret';

/**
 * Generate a secure unsubscribe token for a user
 * Token is valid indefinitely but tied to user ID
 */
function generateUnsubscribeToken(userId) {
  if (!userId) return null;

  const data = `unsubscribe:${userId}`;
  const hmac = crypto.createHmac('sha256', SECRET);
  hmac.update(data);
  const signature = hmac.digest('hex');

  // Format: userId:signature (base64 encoded for URL safety)
  const token = Buffer.from(`${userId}:${signature}`).toString('base64url');
  return token;
}

/**
 * Verify an unsubscribe token and extract user ID
 * Returns userId if valid, null if invalid
 */
function verifyUnsubscribeToken(token) {
  if (!token) return null;

  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf8');
    const [userId, signature] = decoded.split(':');

    if (!userId || !signature) return null;

    // Recreate the signature to verify
    const data = `unsubscribe:${userId}`;
    const hmac = crypto.createHmac('sha256', SECRET);
    hmac.update(data);
    const expectedSignature = hmac.digest('hex');

    // Timing-safe comparison to prevent timing attacks
    if (crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      return userId;
    }

    return null;
  } catch (error) {
    console.error('Unsubscribe token verification error:', error.message);
    return null;
  }
}

/**
 * Generate the full unsubscribe URL
 */
function generateUnsubscribeUrl(userId) {
  const token = generateUnsubscribeToken(userId);
  if (!token) return null;

  const baseUrl = process.env.FRONTEND_URL || 'https://www.contract-ai.de';
  return `${baseUrl}/unsubscribe?token=${token}`;
}

module.exports = {
  generateUnsubscribeToken,
  verifyUnsubscribeToken,
  generateUnsubscribeUrl
};
