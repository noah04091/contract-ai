// backend/routes/s3Routes.js
const express = require("express");
const router = express.Router();
const { generateSignedUrl } = require("../services/fileStorage");
const verifyToken = require("../middleware/verifyToken");
const Contract = require("../models/Contract"); // Für refresh route

// @route   GET /api/s3/view?file=... ODER ?contractId=... ODER ?key=... [&type=signed|original]
// @desc    Get a signed URL to view the file from S3
// @access  Private
router.get("/view", verifyToken, async (req, res) => {
  try {
    const { file, contractId, key, type } = req.query; // 🆕 Added type parameter
    
    // ✅ CHATGPT FIX: Für direkten key-Zugriff OHNE MongoDB (löst Timeout-Problem)
    if (key && !contractId && !file) {
      console.log("🔍 S3 View aufgerufen mit key:", key);
      console.log("⏰ Starte S3-Zugriff...");
      
      try {
        // Generiere Signed URL (24 Stunden) - DIREKT zu S3, KEIN MONGODB!
        const signedUrlResult = await generateSignedUrl(key, 86400); // 24 Stunden - AWAIT HINZUGEFÜGT!
        
        // Falls generateSignedUrl ein Objekt zurückgibt, extrahiere die URL
        const signedUrl = typeof signedUrlResult === 'string' ? signedUrlResult : signedUrlResult.url || signedUrlResult;
        
        console.log("✅ Generated signed URL:", signedUrl, "Type:", typeof signedUrl);
        
        return res.json({ url: signedUrl });
      } catch (err) {
        console.error("❌ S3 Error:", err);
        return res.status(500).json({ error: "S3-Fehler" });
      }
    }
    
    // ✅ ORIGINAL LOGIC: Für Backward Compatibility beibehalten
    if (!file && !contractId) {
      return res.status(400).json({ 
        error: "No file, contractId, or key provided",
        usage: "Use ?file=s3key or ?contractId=mongoId or ?key=s3key"
      });
    }

    let s3Key = file;
    let contractData = null;

    // Wenn contractId gegeben, hole s3Key aus Datenbank
    if (contractId && !file) {
      const contract = await Contract.findOne({
        _id: contractId,
        userId: req.user.id
      });

      if (!contract) {
        return res.status(404).json({ error: "Contract not found" });
      }

      contractData = contract;

      // 🆕 Smart PDF selection: signed vs original
      if (type === 'signed') {
        // Try to get sealed PDF from envelope
        try {
          const Envelope = require("../models/Envelope");
          const envelope = await Envelope.findOne({ contractId: contract._id })
            .sort({ createdAt: -1 }) // Latest envelope
            .lean();

          if (envelope?.s3KeySealed) {
            s3Key = envelope.s3KeySealed;
            console.log(`📥 Serving signed PDF: ${s3Key}`);
          } else {
            // Fallback to original if no sealed PDF available
            s3Key = contract.s3Key;
            console.log(`⚠️ No sealed PDF available, falling back to original: ${s3Key}`);
          }
        } catch (envelopeErr) {
          console.warn("⚠️ Could not load envelope, using original PDF:", envelopeErr.message);
          s3Key = contract.s3Key;
        }
      } else {
        // Default or type=original → use original PDF
        s3Key = contract.s3Key;
      }

      if (!s3Key) {
        return res.status(404).json({
          error: "This contract was uploaded before S3 integration",
          suggestion: "Please re-upload this contract",
          contractTitle: contract.title,
          uploadDate: contract.uploadDate
        });
      }
    }

    // Generiere Signed URL (24 Stunden statt nur 1 Stunde)
    const fileUrl = await generateSignedUrl(s3Key, 86400); // 24 Stunden - AWAIT HINZUGEFÜGT!
    
    res.json({ 
      fileUrl, 
      s3Key, 
      expiresIn: 86400, // 24 Stunden
      contract: contractData ? {
        id: contractData._id,
        title: contractData.title,
        uploadDate: contractData.uploadDate
      } : null,
      message: "S3 signed URL generated successfully"
    });

  } catch (error) {
    console.error("❌ S3 signed URL error:", error);
    
    // Detaillierteres Error Handling
    if (error.name === 'CastError') {
      return res.status(400).json({ 
        error: "Invalid contract ID format" 
      });
    }
    
    res.status(500).json({ 
      error: "Failed to generate S3 URL", 
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   POST /api/s3/refresh
// @desc    Refresh expired signed URL
// @access  Private
router.post("/refresh", verifyToken, async (req, res) => {
  try {
    const { s3Key, contractId } = req.body;
    
    let keyToUse = s3Key;
    
    if (contractId && !s3Key) {
      const contract = await Contract.findOne({ 
        _id: contractId, 
        userId: req.user.id 
      });
      
      if (!contract?.s3Key) {
        return res.status(404).json({ error: "Contract or S3 key not found" });
      }
      
      keyToUse = contract.s3Key;
    }
    
    const fileUrl = await generateSignedUrl(keyToUse, 86400); // AWAIT HINZUGEFÜGT!
    
    res.json({ 
      fileUrl, 
      s3Key: keyToUse, 
      expiresIn: 86400,
      refreshedAt: new Date().toISOString()
    });
    
  } catch (error) {
    console.error("❌ S3 URL refresh error:", error);
    res.status(500).json({ error: "Failed to refresh S3 URL" });
  }
});

module.exports = router;