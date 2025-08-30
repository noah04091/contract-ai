// 📁 backend/routes/companyProfile.js
// Firmenprofil-Verwaltung für Premium-User

const express = require("express");
const router = express.Router();
const { ObjectId } = require("mongodb");
const verifyToken = require("../middleware/verifyToken");
const aws = require("aws-sdk");
const multer = require("multer");
const multerS3 = require("multer-s3");
const https = require("https");
const http = require("http");

// AWS S3 Configuration
const s3 = new aws.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});

// Logo Upload Configuration
const logoUpload = multer({
  storage: multerS3({
    s3: s3,
    bucket: process.env.S3_BUCKET_NAME,
    metadata: function (req, file, cb) {
      cb(null, { fieldName: file.fieldname });
    },
    key: function (req, file, cb) {
      const userId = req.user.userId;
      const timestamp = Date.now();
      const extension = file.originalname.split('.').pop();
      cb(null, `company-logos/${userId}/${timestamp}.${extension}`);
    },
    contentType: multerS3.AUTO_CONTENT_TYPE
  }),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB max
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/svg+xml', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Nur Bilder (JPEG, PNG, SVG, WebP) sind erlaubt'), false);
    }
  }
});

// Helper: Convert S3 URL to Base64
const convertS3ToBase64 = async (url) => {
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
};

// Middleware: Premium Check - TEMPORÄR DEAKTIVIERT für Testing
const requirePremium = (req, res, next) => {
  // Temporär für Testing deaktiviert
  next();
  
  // Original Code:
  // if (req.user?.subscriptionPlan === 'free') {
  //   return res.status(403).json({
  //     success: false,
  //     message: "Firmenprofil ist nur für Premium-Nutzer verfügbar",
  //     requiresUpgrade: true
  //   });
  // }
  // next();
};

// GET /api/company-profile/me - Firmenprofil abrufen
router.get("/me", verifyToken, async (req, res) => {
  try {
    const userId = new ObjectId(req.user.userId);
    const db = req.db;
    
    const profile = await db.collection("company_profiles").findOne({ userId });
    
    if (!profile) {
      return res.json({
        success: true,
        profile: null,
        message: "Noch kein Firmenprofil erstellt"
      });
    }
    
    // Logo als Base64 konvertieren falls vorhanden
    if (profile.logoKey) {
      try {
        const s3Url = s3.getSignedUrl('getObject', {
          Bucket: process.env.S3_BUCKET_NAME,
          Key: profile.logoKey,
          Expires: 3600 // 1 Stunde
        });
        
        console.log("🔄 Konvertiere S3-URL zu Base64...");
        const base64Logo = await convertS3ToBase64(s3Url);
        profile.logoUrl = base64Logo;
        console.log("✅ Logo als Base64 konvertiert (Länge:", base64Logo.length, "Zeichen)");
      } catch (error) {
        console.error("❌ Fehler bei Base64-Konvertierung:", error);
        // Fallback auf S3-URL
        profile.logoUrl = s3.getSignedUrl('getObject', {
          Bucket: process.env.S3_BUCKET_NAME,
          Key: profile.logoKey,
          Expires: 3600
        });
      }
    }
    
    console.log("📤 Profil wird zurückgegeben mit Logo:", {
      hasLogoKey: !!profile.logoKey,
      hasLogoUrl: !!profile.logoUrl,
      isBase64: profile.logoUrl?.startsWith('data:')
    });
    
    res.json({
      success: true,
      profile
    });
  } catch (error) {
    console.error("❌ Fehler beim Abrufen des Firmenprofils:", error);
    res.status(500).json({
      success: false,
      message: "Fehler beim Abrufen des Firmenprofils"
    });
  }
});

// POST /api/company-profile - Firmenprofil erstellen/aktualisieren
router.post("/", verifyToken, requirePremium, async (req, res) => {
  try {
    const userId = new ObjectId(req.user.userId);
    const db = req.db;
    
    // Validierung der Pflichtfelder
    const requiredFields = ['companyName', 'street', 'postalCode', 'city', 'country'];
    for (const field of requiredFields) {
      if (!req.body[field]) {
        return res.status(400).json({
          success: false,
          message: `Feld '${field}' ist erforderlich`
        });
      }
    }
    
    // Profil-Daten vorbereiten
    const profileData = {
      userId,
      companyName: req.body.companyName,
      legalForm: req.body.legalForm || '',
      street: req.body.street,
      postalCode: req.body.postalCode,
      city: req.body.city,
      country: req.body.country,
      vatId: req.body.vatId || '',
      tradeRegister: req.body.tradeRegister || '',
      contactEmail: req.body.contactEmail || '',
      contactPhone: req.body.contactPhone || '',
      bankName: req.body.bankName || '',
      iban: req.body.iban || '',
      bic: req.body.bic || '',
      updatedAt: new Date()
    };
    
    // Logo-Informationen beibehalten, falls vorhanden
    if (req.body.logoUrl) {
      profileData.logoUrl = req.body.logoUrl;
    }
    if (req.body.logoKey) {
      profileData.logoKey = req.body.logoKey;
    }
    
    // Upsert (Update oder Insert)
    const result = await db.collection("company_profiles").updateOne(
      { userId },
      {
        $set: profileData,
        $setOnInsert: { createdAt: new Date() }
      },
      { upsert: true }
    );
    
    console.log("✅ Firmenprofil gespeichert für User:", req.user.userId);
    
    res.json({
      success: true,
      message: result.upsertedCount ? "Firmenprofil erstellt" : "Firmenprofil aktualisiert",
      profile: profileData
    });
  } catch (error) {
    console.error("❌ Fehler beim Speichern des Firmenprofils:", error);
    res.status(500).json({
      success: false,
      message: "Fehler beim Speichern des Firmenprofils"
    });
  }
});

// POST /api/company-profile/logo - Logo hochladen
router.post("/logo", verifyToken, requirePremium, logoUpload.single('logo'), async (req, res) => {
  try {
    console.log("📸 Logo-Upload gestartet für User:", req.user.userId);
    console.log("📁 File Info:", req.file);
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Keine Datei hochgeladen"
      });
    }
    
    const userId = new ObjectId(req.user.userId);
    const db = req.db;
    const logoKey = req.file.key;
    
    // Logo-Key im Profil speichern (mit upsert falls Profil noch nicht existiert)
    const updateResult = await db.collection("company_profiles").updateOne(
      { userId },
      {
        $set: {
          logoKey,
          updatedAt: new Date()
        },
        $setOnInsert: {
          userId,
          companyName: '',
          street: '',
          postalCode: '',
          city: '',
          country: 'Deutschland',
          createdAt: new Date()
        }
      },
      { upsert: true }
    );
    
    console.log("✅ Logo-Key in DB gespeichert:", { logoKey, updateResult });
    
    // Logo als Base64 zurückgeben für CSP-Umgehung
    let logoUrl;
    try {
      const s3Url = s3.getSignedUrl('getObject', {
        Bucket: process.env.S3_BUCKET_NAME,
        Key: logoKey,
        Expires: 3600
      });
      
      console.log("🔄 Konvertiere hochgeladenes Logo zu Base64...");
      logoUrl = await convertS3ToBase64(s3Url);
      console.log("✅ Logo als Base64 konvertiert");
    } catch (error) {
      console.error("❌ Base64-Konvertierung fehlgeschlagen:", error);
      // Fallback auf S3-URL
      logoUrl = s3.getSignedUrl('getObject', {
        Bucket: process.env.S3_BUCKET_NAME,
        Key: logoKey,
        Expires: 3600
      });
    }
    
    console.log("✅ Logo hochgeladen für User:", req.user.userId);
    
    res.json({
      success: true,
      message: "Logo erfolgreich hochgeladen",
      logoUrl,
      logoKey
    });
  } catch (error) {
    console.error("❌ Fehler beim Logo-Upload:", error);
    console.error("Stack:", error.stack);
    res.status(500).json({
      success: false,
      message: error.message || "Fehler beim Logo-Upload",
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// DELETE /api/company-profile/logo - Logo löschen
router.delete("/logo", verifyToken, requirePremium, async (req, res) => {
  try {
    const userId = new ObjectId(req.user.userId);
    const db = req.db;
    
    // Aktuelles Logo-Key abrufen
    const profile = await db.collection("company_profiles").findOne({ userId });
    
    if (!profile || !profile.logoKey) {
      return res.status(404).json({
        success: false,
        message: "Kein Logo vorhanden"
      });
    }
    
    // Logo aus S3 löschen
    await s3.deleteObject({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: profile.logoKey
    }).promise();
    
    // Logo-Key aus Profil entfernen
    await db.collection("company_profiles").updateOne(
      { userId },
      {
        $unset: { logoKey: "" },
        $set: { updatedAt: new Date() }
      }
    );
    
    console.log("✅ Logo gelöscht für User:", req.user.userId);
    
    res.json({
      success: true,
      message: "Logo erfolgreich gelöscht"
    });
  } catch (error) {
    console.error("❌ Fehler beim Logo-Löschen:", error);
    res.status(500).json({
      success: false,
      message: "Fehler beim Löschen des Logos"
    });
  }
});

module.exports = router;