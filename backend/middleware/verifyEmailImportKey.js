// 📁 backend/middleware/verifyEmailImportKey.js
// 🔒 Middleware zum Absichern des E-Mail-Import Endpoints

require('dotenv').config();

const EMAIL_IMPORT_API_KEY = process.env.EMAIL_IMPORT_API_KEY;

// 🔒 Erlaubte IP-Adressen (AWS Lambda NAT IPs eurer Region)
// Diese müsst ihr nach Lambda-Deployment eintragen
const ALLOWED_IPS = (process.env.EMAIL_IMPORT_ALLOWED_IPS || '').split(',').filter(Boolean);

/**
 * Middleware: API-Key + Optional IP-Allowlist Check
 */
function verifyEmailImportKey(req, res, next) {
  console.log('🔐 verifyEmailImportKey aufgerufen für:', req.originalUrl);
  console.log('🔑 EMAIL_IMPORT_API_KEY aus env:', EMAIL_IMPORT_API_KEY ? `${EMAIL_IMPORT_API_KEY.substring(0, 10)}...` : 'UNDEFINED!');

  // 1. API-Key Check
  const apiKey = req.headers['x-internal-key'];
  console.log('🔑 Empfangener API-Key:', apiKey ? `${apiKey.substring(0, 10)}...` : 'KEINER!');

  if (!apiKey) {
    console.warn('⚠️ E-Mail-Import: Kein API-Key im Header');
    return res.status(401).json({
      success: false,
      message: 'Unauthorized: Missing API Key'
    });
  }

  if (apiKey !== EMAIL_IMPORT_API_KEY) {
    console.warn('⚠️ E-Mail-Import: Ungültiger API-Key', {
      provided: apiKey ? apiKey.substring(0, 10) + '...' : 'null',
      expected: EMAIL_IMPORT_API_KEY ? EMAIL_IMPORT_API_KEY.substring(0, 10) + '...' : 'UNDEFINED',
      ip: req.ip || req.connection.remoteAddress
    });
    return res.status(401).json({
      success: false,
      message: 'Unauthorized: Invalid API Key'
    });
  }

  // 2. IP-Allowlist Check (optional, wenn IPs konfiguriert)
  if (ALLOWED_IPS.length > 0) {
    const clientIP = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'];

    const isAllowed = ALLOWED_IPS.some(allowedIP => {
      // Exact match oder CIDR-Range (vereinfacht)
      return clientIP.includes(allowedIP) || allowedIP.includes(clientIP);
    });

    if (!isAllowed) {
      console.warn('⚠️ E-Mail-Import: IP nicht in Allowlist', {
        clientIP,
        allowedIPs: ALLOWED_IPS
      });
      return res.status(403).json({
        success: false,
        message: 'Forbidden: IP not allowed'
      });
    }
  }

  // ✅ Alles OK
  console.log('✅ E-Mail-Import: API-Key verifiziert');
  next();
}

module.exports = verifyEmailImportKey;
