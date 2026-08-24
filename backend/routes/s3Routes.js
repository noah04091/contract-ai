// backend/routes/s3Routes.js
const express = require("express");
const router = express.Router();
const { generateSignedUrl, generateInlineSignedUrl } = require("../services/fileStorage");
const verifyToken = require("../middleware/verifyToken");
const Contract = require("../models/Contract"); // Für refresh route
const OrganizationMember = require("../models/OrganizationMember"); // Für Team-Zugriff
const { ObjectId } = require("mongodb");
const { keyBelongsToUser } = require("../utils/s3KeyOwnership"); // 🔒 24.08.2026: Besitz am S3-Schluessel pruefen

// @route   GET /api/s3/view?file=... ODER ?contractId=... ODER ?key=... [&type=signed|original]
// @desc    Get a signed URL to view the file from S3
// @access  Private
router.get("/view", verifyToken, async (req, res) => {
  try {
    const { file, contractId, key, type } = req.query;

    console.log("🔍 S3 View Request:", {
      file,
      contractId,
      key,
      type,
      userId: req.user?.userId || req.user?.id,
      userObject: req.user
    });

    // 🔒 24.08.2026 SICHERHEIT (TÜV 6/6): Direkter key-Zugriff. Vorher wurde JEDER
    // Schluessel ohne Eigentumspruefung unterschrieben (authentifizierte IDOR — ein
    // Eingeloggter konnte jede Datei laden, deren Schluessel er kennt). Jetzt: nur
    // unterschreiben, wenn der Schluessel zu einem Vertrag/Envelope des Nutzers (oder
    // seiner Org) gehoert. Deckt alle Schluessel-Arten ab (Original/optimiert/signiert).
    if (key && !contractId && !file) {
      const uid = req.user?.userId || req.user?.id;
      if (!(await keyBelongsToUser(uid, key))) {
        console.warn("⛔ S3 View: key gehoert dem Nutzer nicht →", key);
        return res.status(403).json({ error: "Kein Zugriff auf diese Datei." });
      }
      console.log("🔍 S3 View aufgerufen mit key:", key);

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
      console.log("❌ No parameters provided");
      return res.status(400).json({
        error: "No file, contractId, or key provided",
        usage: "Use ?file=s3key or ?contractId=mongoId or ?key=s3key"
      });
    }

    // 🔒 24.08.2026 SICHERHEIT (TÜV 6/6): Auch der rohe `file`-Parameter unterschrieb
    // bisher jeden Schluessel ohne Eigentumspruefung. Kommt der Schluessel roh aus `file`
    // (also NICHT aus dem sicheren contractId-Zweig unten), pruefen wir den Besitz.
    if (file && !contractId) {
      const uid = req.user?.userId || req.user?.id;
      if (!(await keyBelongsToUser(uid, file))) {
        console.warn("⛔ S3 View: file gehoert dem Nutzer nicht →", file);
        return res.status(403).json({ error: "Kein Zugriff auf diese Datei." });
      }
    }

    let s3Key = file;
    let contractData = null;

    // Wenn contractId gegeben, hole s3Key aus Datenbank
    if (contractId && !file) {
      const userId = req.user.userId || req.user.id;
      console.log("📄 Searching for contract:", contractId, "userId:", userId);

      // 🆕 Prüfe Organization-Membership für Team-Zugriff
      let userOrgId = null;
      try {
        const membership = await OrganizationMember.findOne({
          userId: new ObjectId(userId),
          isActive: true
        });
        if (membership) {
          userOrgId = membership.organizationId;
          console.log("👥 User belongs to organization:", userOrgId);
        }
      } catch (memberErr) {
        console.log("⚠️ Could not check organization membership:", memberErr.message);
      }

      // Query: Eigene Verträge ODER Verträge der Organisation
      let contractQuery;
      if (userOrgId) {
        contractQuery = {
          _id: contractId,
          $or: [
            { userId: new ObjectId(userId) },
            { organizationId: userOrgId }
          ]
        };
      } else {
        contractQuery = {
          _id: contractId,
          userId: new ObjectId(userId)
        };
      }

      const contract = await Contract.findOne(contractQuery);

      console.log("📄 Contract found:", contract ? "YES" : "NO", contract ? {
        _id: contract._id,
        name: contract.name || contract.title,
        s3Key: contract.s3Key,
        uploadType: contract.uploadType,
        needsReupload: contract.needsReupload,
        organizationId: contract.organizationId
      } : null);

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

// @route   GET /api/s3/view-inline?contractId=...
// @desc    Liefert presigned URL mit Content-Disposition: inline
//          (fuer iframe-Embedding / Hover-Preview, 31.05.2026)
// @access  Private
router.get("/view-inline", verifyToken, async (req, res) => {
  try {
    const { contractId } = req.query;
    if (!contractId) {
      return res.status(400).json({ error: "contractId required" });
    }

    // Owner-Check + s3Key holen
    const contract = await Contract.findById(contractId).select('s3Key userId name organizationId').lean();
    if (!contract) {
      return res.status(404).json({ error: "Contract not found" });
    }

    // Zugriff: eigener Vertrag ODER Org-Mitgliedschaft
    const isOwner = String(contract.userId) === String(req.user.userId);
    let hasAccess = isOwner;
    if (!hasAccess && contract.organizationId) {
      const member = await OrganizationMember.findOne({
        userId: new ObjectId(req.user.userId),
        organizationId: contract.organizationId,
        isActive: true,
      }).lean();
      hasAccess = !!member;
    }
    if (!hasAccess) {
      return res.status(403).json({ error: "No access" });
    }

    if (!contract.s3Key) {
      return res.status(404).json({ error: "No S3 key (pre-S3 upload?)" });
    }

    const fileUrl = await generateInlineSignedUrl(contract.s3Key, contract.name || 'document.pdf');
    res.json({ fileUrl, expiresIn: 3600 });
  } catch (error) {
    console.error("❌ S3 inline URL error:", error.message);
    res.status(500).json({ error: "Failed to generate inline URL" });
  }
});

// @route   POST /api/s3/refresh
// @desc    Refresh expired signed URL
// @access  Private
router.post("/refresh", verifyToken, async (req, res) => {
  try {
    // 🔒 24.08.2026 SICHERHEIT (TÜV 6/6): Diese Route akzeptierte frueher einen ROHEN
    // `s3Key` aus dem Body und unterschrieb ihn OHNE Eigentumspruefung. Nachweis vor der
    // Aenderung: KEIN Aufrufer schickt einen rohen s3Key — der einzige Aufrufer
    // (frontend/src/utils/s3Utils.ts) sendet ausschliesslich `{contractId}`. Der rohe
    // Pfad wird deshalb ersatzlos entfernt; die Route arbeitet nur noch ueber die
    // Vertrags-Nummer MIT Besitz-/Org-Pruefung (wie der sichere /view-Zweig).
    const { contractId } = req.body;
    const userId = req.user.userId || req.user.id;

    if (!contractId) {
      return res.status(400).json({ error: "contractId erforderlich" });
    }

    // Prüfe Organization-Membership für Team-Zugriff
    let userOrgId = null;
    try {
      const membership = await OrganizationMember.findOne({
        userId: new ObjectId(userId),
        isActive: true
      });
      if (membership) {
        userOrgId = membership.organizationId;
      }
    } catch (memberErr) {
      console.log("⚠️ Could not check organization membership:", memberErr.message);
    }

    // Query: Eigene Verträge ODER Verträge der Organisation
    const contractQuery = userOrgId
      ? { _id: contractId, $or: [{ userId: new ObjectId(userId) }, { organizationId: userOrgId }] }
      : { _id: contractId, userId: new ObjectId(userId) };

    const contract = await Contract.findOne(contractQuery);

    if (!contract?.s3Key) {
      return res.status(404).json({ error: "Contract or S3 key not found" });
    }

    const keyToUse = contract.s3Key;

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