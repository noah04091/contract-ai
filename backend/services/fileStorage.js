// backend/services/fileStorage.js
const AWS = require("aws-sdk");
const multer = require("multer");
const multerS3 = require("multer-s3");
const path = require("path");

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

// Upload-Konfiguration mit multerS3
const upload = multer({
  storage: multerS3({
    s3,
    bucket: process.env.S3_BUCKET_NAME,  // ✅ GEÄNDERT von AWS_S3_BUCKET
    contentType: multerS3.AUTO_CONTENT_TYPE,
    acl: "private",
    key: function (req, file, cb) {
      const filename = `${Date.now()}_${file.originalname}`;
      cb(null, filename);
    },
  }),
});

const generateSignedUrl = (key) => {
  const params = {
    Bucket: process.env.S3_BUCKET_NAME,  // ✅ GEÄNDERT von AWS_S3_BUCKET
    Key: key,
    Expires: 60 * 60, // 1 Stunde gültig
  };
  return s3.getSignedUrl("getObject", params);
};

module.exports = {
  upload,
  generateSignedUrl,
};