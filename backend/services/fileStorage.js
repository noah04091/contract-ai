// backend/services/fileStorage.js
const { S3Client, GetObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const multer = require("multer");
const multerS3 = require("multer-s3");

// ➤ S3-Client (SDK v3)
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// ➤ Multer-S3 Upload Konfiguration
const upload = multer({
  storage: multerS3({
    s3,
    bucket: process.env.S3_BUCKET_NAME,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    acl: "private",
    key: function (req, file, cb) {
      const filename = `${Date.now()}_${file.originalname}`;
      cb(null, filename);
    },
  }),
});

// ➤ Signierte URL generieren (für Download-Links etc.)
const generateSignedUrl = async (key) => {
  const command = new GetObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME,
    Key: key,
  });

  const url = await getSignedUrl(s3, command, { expiresIn: 3600 }); // 1 Stunde
  return url;
};

// ➤ Signierte URL fuer INLINE-Display (PDF-Viewer / iframe-Embedding)
// Setzt Content-Disposition: inline statt default attachment, damit Browser
// das PDF inline rendert statt Download triggert (31.05.2026, fuer Hover-Preview)
const generateInlineSignedUrl = async (key, filename = 'document.pdf') => {
  // RFC 5987: Content-Disposition muss ISO-8859-1 sein (S3-Anforderung) — sonst lehnt S3
  // Namen mit Zeichen > U+00FF ab (z.B. Gedankenstrich "–", den der Generator anhängt).
  // ASCII-Fallback + filename* — gleiches Muster wie buildContentDisposition() in routes/contracts.js
  const safe = String(filename || 'document.pdf');
  const ascii = safe.replace(/[^\x20-\x7E]/g, '_').replace(/"/g, '');
  const utf8 = encodeURIComponent(safe);
  const command = new GetObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME,
    Key: key,
    ResponseContentDisposition: `inline; filename="${ascii}"; filename*=UTF-8''${utf8}`,
    ResponseContentType: 'application/pdf',
  });

  const url = await getSignedUrl(s3, command, { expiresIn: 3600 });
  return url;
};

// ➤ Datei aus S3 löschen
const deleteFile = async (key) => {
  if (!key) {
    console.log("⚠️ deleteFile: Kein Key angegeben, überspringe");
    return false;
  }

  try {
    const command = new DeleteObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: key,
    });

    await s3.send(command);
    console.log(`🗑️ S3-Datei gelöscht: ${key}`);
    return true;
  } catch (error) {
    console.error(`❌ Fehler beim Löschen der S3-Datei ${key}:`, error.message);
    return false;
  }
};

// ➤ Mehrere Dateien aus S3 löschen
const deleteFiles = async (keys) => {
  if (!keys || keys.length === 0) {
    return { deleted: 0, failed: 0 };
  }

  let deleted = 0;
  let failed = 0;

  for (const key of keys) {
    const success = await deleteFile(key);
    if (success) {
      deleted++;
    } else {
      failed++;
    }
  }

  console.log(`🗑️ S3-Löschung abgeschlossen: ${deleted} gelöscht, ${failed} fehlgeschlagen`);
  return { deleted, failed };
};

module.exports = {
  upload,
  generateSignedUrl,
  generateInlineSignedUrl,
  deleteFile,
  deleteFiles,
};
