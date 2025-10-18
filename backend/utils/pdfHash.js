// 📄 PDF Hash Calculator
// Calculates SHA-256 hashes for PDF integrity verification

const crypto = require('crypto');
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');

// S3 Client initialisieren
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'eu-central-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME || 'contract-ai-uploads';

/**
 * Calculates SHA-256 hash of a buffer
 * @param {Buffer} buffer - PDF buffer
 * @returns {string} Hex-encoded SHA-256 hash
 */
function calculateHash(buffer) {
  return crypto
    .createHash('sha256')
    .update(buffer)
    .digest('hex');
}

/**
 * Loads PDF from S3 and calculates its hash
 * @param {string} s3Key - S3 object key
 * @returns {Promise<{buffer: Buffer, hash: string}>}
 */
async function calculatePdfHashFromS3(s3Key) {
  try {
    console.log(`🔐 Calculating PDF hash for: ${s3Key}`);

    // Load PDF from S3
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key
    });

    const response = await s3Client.send(command);

    // Stream to Buffer
    const chunks = [];
    for await (const chunk of response.Body) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    // Calculate hash
    const hash = calculateHash(buffer);

    console.log(`✅ PDF hash calculated: ${hash.substring(0, 16)}...`);

    return { buffer, hash };
  } catch (error) {
    console.error('❌ Error calculating PDF hash:', error);
    throw new Error(`PDF-Hash-Berechnung fehlgeschlagen: ${error.message}`);
  }
}

/**
 * Calculates hash from buffer directly
 * @param {Buffer} pdfBuffer - PDF buffer
 * @returns {string} Hex-encoded SHA-256 hash
 */
function calculatePdfHash(pdfBuffer) {
  const hash = calculateHash(pdfBuffer);
  console.log(`✅ PDF hash calculated: ${hash.substring(0, 16)}...`);
  return hash;
}

/**
 * Verifies if two hashes match
 * @param {string} hash1
 * @param {string} hash2
 * @returns {boolean}
 */
function verifyHash(hash1, hash2) {
  return hash1 === hash2;
}

/**
 * Formats hash for display (shortened)
 * @param {string} hash - Full SHA-256 hash
 * @returns {string} Shortened hash (first 16 + last 8 chars)
 */
function formatHashForDisplay(hash) {
  if (!hash || hash.length < 24) return hash;
  return `${hash.substring(0, 16)}...${hash.substring(hash.length - 8)}`;
}

module.exports = {
  calculateHash,
  calculatePdfHashFromS3,
  calculatePdfHash,
  verifyHash,
  formatHashForDisplay
};
