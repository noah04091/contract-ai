// backend/services/fileStorage.js
const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");
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

module.exports = {
  upload,
  generateSignedUrl,
};
