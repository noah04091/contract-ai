// 📁 backend/utils/getCompanyLogo.js
// White-Label PDF Export: Hole Company Logo für Enterprise-User

const aws = require("aws-sdk");
const https = require("https");
const http = require("http");
const { ObjectId } = require("mongodb");

const s3 = new aws.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});

/**
 * Konvertiert S3-URL zu Base64-String
 * @param {string} url - S3 Signed URL
 * @returns {Promise<string>} Base64-String mit data URI
 */
async function convertS3ToBase64(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;

    protocol.get(url, (response) => {
      const chunks = [];

      response.on('data', (chunk) => {
        chunks.push(chunk);
      });

      response.on('end', () => {
        const buffer = Buffer.concat(chunks);
        const base64 = buffer.toString('base64');
        const mimeType = response.headers['content-type'] || 'image/png';
        resolve(`data:${mimeType};base64,${base64}`);
      });

      response.on('error', reject);
    }).on('error', reject);
  });
}

/**
 * Holt Company Logo für User (White-Label PDF Export)
 * @param {Object} db - MongoDB Database Connection
 * @param {string} userId - User ID
 * @param {string} userPlan - User Subscription Plan (free, business, premium)
 * @returns {Promise<Object>} { hasLogo, logoBase64, logoPath, isEnterprise }
 */
async function getCompanyLogo(db, userId, userPlan) {
  try {
    // 🔒 Enterprise-Check: Nur Premium/Enterprise haben White-Label
    const isEnterprise = userPlan === 'premium';

    if (!isEnterprise) {
      console.log(`⚠️ [White-Label] User ${userId} ist nicht Enterprise (Plan: ${userPlan})`);
      return {
        hasLogo: false,
        logoBase64: null,
        logoPath: null,
        isEnterprise: false
      };
    }

    // Company Profile laden
    const profile = await db.collection("company_profiles").findOne({
      userId: new ObjectId(userId)
    });

    if (!profile || !profile.logoKey) {
      console.log(`⚠️ [White-Label] User ${userId} hat kein Logo hochgeladen`);
      return {
        hasLogo: false,
        logoBase64: null,
        logoPath: null,
        isEnterprise: true
      };
    }

    // Logo von S3 als Base64 holen
    try {
      const s3Url = s3.getSignedUrl('getObject', {
        Bucket: process.env.S3_BUCKET_NAME,
        Key: profile.logoKey,
        Expires: 3600 // 1 Stunde
      });

      console.log(`🔄 [White-Label] Konvertiere Logo für User ${userId}...`);
      const logoBase64 = await convertS3ToBase64(s3Url);

      console.log(`✅ [White-Label] Logo geladen für User ${userId} (${logoBase64.length} chars)`);

      return {
        hasLogo: true,
        logoBase64,
        logoPath: null, // Base64 wird direkt verwendet
        isEnterprise: true
      };
    } catch (error) {
      console.error(`❌ [White-Label] Fehler beim Laden des Logos:`, error);
      return {
        hasLogo: false,
        logoBase64: null,
        logoPath: null,
        isEnterprise: true,
        error: error.message
      };
    }
  } catch (error) {
    console.error(`❌ [White-Label] Fehler in getCompanyLogo:`, error);
    return {
      hasLogo: false,
      logoBase64: null,
      logoPath: null,
      isEnterprise: false,
      error: error.message
    };
  }
}

module.exports = { getCompanyLogo, convertS3ToBase64 };
