// 🔐 Encryption Utility für sichere Artefakt-Ablage
// Verschlüsselt sensible Daten (Prompts, Vertragstexte) für Audit/Regeneration

const crypto = require('crypto');

// WICHTIG: In Production mit echtem KMS ersetzen (AWS KMS, Azure Key Vault, etc.)
// Aktuell: Stub-Implementierung mit env-basiertem Secret
const ENCRYPTION_KEY = process.env.ENCRYPTION_SECRET_KEY || crypto.randomBytes(32).toString('hex');
const ALGORITHM = 'aes-256-gcm';

/**
 * Verschlüsselt einen Text mit AES-256-GCM
 * @param {string} plaintext - Zu verschlüsselnder Text
 * @returns {string} Verschlüsselter Text als Base64 (format: iv:authTag:ciphertext)
 */
function encrypt(plaintext) {
  if (!plaintext) return null;

  try {
    // IV (Initialization Vector) generieren
    const iv = crypto.randomBytes(16);

    // Key aus Hex-String erstellen
    const key = Buffer.from(ENCRYPTION_KEY.substring(0, 64), 'hex');

    // Cipher erstellen
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    // Verschlüsseln
    let ciphertext = cipher.update(plaintext, 'utf8', 'base64');
    ciphertext += cipher.final('base64');

    // Auth Tag holen (für GCM)
    const authTag = cipher.getAuthTag();

    // Format: iv:authTag:ciphertext (alles Base64)
    return `${iv.toString('base64')}:${authTag.toString('base64')}:${ciphertext}`;

  } catch (error) {
    console.error('❌ Encryption failed:', error.message);
    throw new Error(`Encryption failed: ${error.message}`);
  }
}

/**
 * Entschlüsselt einen verschlüsselten Text
 * @param {string} encrypted - Verschlüsselter Text (format: iv:authTag:ciphertext)
 * @returns {string} Entschlüsselter Klartext
 */
function decrypt(encrypted) {
  if (!encrypted) return null;

  try {
    // Format: iv:authTag:ciphertext splitten
    const parts = encrypted.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted format (expected iv:authTag:ciphertext)');
    }

    const iv = Buffer.from(parts[0], 'base64');
    const authTag = Buffer.from(parts[1], 'base64');
    const ciphertext = parts[2];

    // Key aus Hex-String erstellen
    const key = Buffer.from(ENCRYPTION_KEY.substring(0, 64), 'hex');

    // Decipher erstellen
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    // Entschlüsseln
    let plaintext = decipher.update(ciphertext, 'base64', 'utf8');
    plaintext += decipher.final('utf8');

    return plaintext;

  } catch (error) {
    console.error('❌ Decryption failed:', error.message);
    throw new Error(`Decryption failed: ${error.message}`);
  }
}

/**
 * Prüft ob Encryption korrekt konfiguriert ist
 * @returns {boolean} True wenn Encryption verfügbar
 */
function isEncryptionConfigured() {
  return !!process.env.ENCRYPTION_SECRET_KEY;
}

/**
 * Generiert einen neuen Encryption Key (für Setup)
 * WICHTIG: Nur für Development/Setup! In Production KMS nutzen!
 * @returns {string} Hex-String (64 Zeichen = 32 Bytes)
 */
function generateEncryptionKey() {
  return crypto.randomBytes(32).toString('hex');
}

// Self-Test (beim Start)
if (!isEncryptionConfigured()) {
  console.warn('⚠️ ENCRYPTION_SECRET_KEY not set in .env! Using temporary key (NOT FOR PRODUCTION!)');
  console.warn('⚠️ Generate permanent key with: node backend/security/encryption.js --generate-key');
}

module.exports = {
  encrypt,
  decrypt,
  isEncryptionConfigured,
  generateEncryptionKey
};

// CLI-Modus: Key generieren
if (require.main === module) {
  if (process.argv.includes('--generate-key')) {
    const key = generateEncryptionKey();
    console.log('\n🔑 Generated Encryption Key (add to .env):');
    console.log(`ENCRYPTION_SECRET_KEY=${key}`);
    console.log('\n⚠️ Keep this key secret! Store securely!\n');
  } else if (process.argv.includes('--test')) {
    // Selbsttest
    const testData = 'Test Contract Text with Sensitive Data: Max Mustermann, Musterstraße 123';
    console.log('🧪 Testing encryption...');
    console.log('Original:', testData);

    const encrypted = encrypt(testData);
    console.log('Encrypted:', encrypted.substring(0, 50) + '...');

    const decrypted = decrypt(encrypted);
    console.log('Decrypted:', decrypted);

    if (decrypted === testData) {
      console.log('✅ Encryption test PASSED');
    } else {
      console.log('❌ Encryption test FAILED');
    }
  }
}
