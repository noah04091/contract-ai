// 📁 backend/routes/envelopes.js - Digital Signature Envelope Routes
const express = require("express");
const mongoose = require("mongoose");
const { ObjectId } = require("mongodb"); // 🆕 For user queries
const crypto = require("crypto");
const rateLimit = require("express-rate-limit");
const verifyToken = require("../middleware/verifyToken");
const sendEmail = require("../services/mailer");
const { sealPdf } = require("../services/pdfSealing"); // ✉️ PDF-Sealing Service
const { generateSignedUrl } = require("../services/fileStorage"); // 🆕 For S3 download links
const { generateEventsForEnvelope, markEnvelopeAsCompleted, deleteEnvelopeEvents } = require("../services/envelopeCalendarEvents"); // 📅 Calendar Integration
const Envelope = require("../models/Envelope");
const Contract = require("../models/Contract");

const router = express.Router();

// ===== RATE LIMITERS =====

/**
 * Rate limiter for signature submission (prevents spam/abuse)
 * 5 attempts per 15 minutes per IP
 */
const signatureSubmitLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Max 5 requests per window
  message: 'Zu viele Signaturversuche. Bitte warten Sie 15 Minuten.',
  standardHeaders: true,
  legacyHeaders: false,
  // Use IP address as key
  keyGenerator: (req) => {
    return req.headers['x-forwarded-for']?.split(',')[0] ||
           req.headers['x-real-ip'] ||
           req.connection.remoteAddress ||
           req.socket.remoteAddress ||
           'unknown';
  }
});

/**
 * Rate limiter for signature decline (prevents spam)
 * 3 attempts per 15 minutes per IP
 */
const signatureDeclineLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  message: 'Zu viele Ablehnungsversuche. Bitte warten Sie 15 Minuten.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.headers['x-forwarded-for']?.split(',')[0] ||
           req.headers['x-real-ip'] ||
           req.connection.remoteAddress ||
           req.socket.remoteAddress ||
           'unknown';
  }
});

// ===== UTILITY FUNCTIONS =====

/**
 * Generate secure magic link token
 */
function generateSignerToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Get client IP address
 */
function getClientIP(req) {
  return req.headers['x-forwarded-for']?.split(',')[0] ||
         req.headers['x-real-ip'] ||
         req.connection.remoteAddress ||
         req.socket.remoteAddress ||
         'unknown';
}

/**
 * Validate signature data (Base64, Size, Empty Check)
 */
function validateSignature(signatureValue) {
  // Check if signature exists
  if (!signatureValue || typeof signatureValue !== 'string') {
    return { valid: false, error: 'Signatur fehlt oder ist ungültig' };
  }

  // Check if it's a valid Base64 PNG
  if (!signatureValue.startsWith('data:image/png;base64,')) {
    return { valid: false, error: 'Signatur muss ein PNG-Bild sein' };
  }

  // Extract Base64 data (remove prefix)
  const base64Data = signatureValue.replace(/^data:image\/png;base64,/, '');

  // Check if Base64 is valid
  try {
    const buffer = Buffer.from(base64Data, 'base64');

    // Check size (max 1MB = 1048576 bytes)
    if (buffer.length > 1048576) {
      return { valid: false, error: 'Signatur ist zu groß (max 1MB)' };
    }

    // Check if canvas is not empty (PNG has minimum size)
    if (buffer.length < 1000) {
      return { valid: false, error: 'Bitte zeichnen Sie eine Signatur' };
    }

    return { valid: true };
  } catch (err) {
    return { valid: false, error: 'Ungültiges Signatur-Format' };
  }
}

/**
 * 🆕 FIX 6: Comprehensive envelope submission validation
 * Validates all required fields, field types, and signer permissions
 */
function validateEnvelopeSubmission(envelope, signatures, signerEmail) {
  const errors = [];

  // Get all fields for this signer
  const signerFields = envelope.signatureFields.filter(
    field => field.assigneeEmail.toLowerCase() === signerEmail.toLowerCase()
  );

  // 1. Check all REQUIRED fields have values
  const requiredFields = signerFields.filter(field => field.required);
  const submittedFieldIds = new Set(signatures.map(sig => sig.fieldId.toString()));

  for (const field of requiredFields) {
    if (!submittedFieldIds.has(field._id.toString())) {
      errors.push(`Pflichtfeld fehlt: ${field.label || field.type} (${field._id})`);
    }
  }

  // 2. Validate each signature
  for (const sig of signatures) {
    // Find the field
    const field = envelope.signatureFields.id(sig.fieldId);

    if (!field) {
      errors.push(`Feld nicht gefunden: ${sig.fieldId}`);
      continue;
    }

    // 3. Verify field belongs to this signer (assigneeEmail check)
    if (field.assigneeEmail.toLowerCase() !== signerEmail.toLowerCase()) {
      errors.push(`Feld gehört nicht zu diesem Unterzeichner: ${sig.fieldId}`);
      continue;
    }

    // 4. Field-type specific validation
    switch (field.type) {
      case 'signature':
      case 'initials':
        // Already validated by validateSignature() function
        break;

      case 'date':
        // Validate date format (ISO 8601 or DD.MM.YYYY)
        if (sig.value && typeof sig.value === 'string') {
          const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;
          const germanDateRegex = /^\d{2}\.\d{2}\.\d{4}$/;

          if (!isoDateRegex.test(sig.value) && !germanDateRegex.test(sig.value)) {
            errors.push(`Ungültiges Datumsformat für Feld ${sig.fieldId}: ${sig.value}`);
          }

          // Additional: Check if date is valid (not a future date for signatures)
          const parsedDate = new Date(sig.value);
          if (isNaN(parsedDate.getTime())) {
            errors.push(`Ungültiges Datum für Feld ${sig.fieldId}: ${sig.value}`);
          }
        } else {
          errors.push(`Datum fehlt oder ist ungültig für Feld ${sig.fieldId}`);
        }
        break;

      case 'text':
        // Validate text field (max 500 chars, no empty required fields)
        if (!sig.value || typeof sig.value !== 'string') {
          if (field.required) {
            errors.push(`Textfeld ist erforderlich: ${sig.fieldId}`);
          }
        } else if (sig.value.length > 500) {
          errors.push(`Textfeld zu lang (max 500 Zeichen): ${sig.fieldId}`);
        }
        break;

      default:
        errors.push(`Unbekannter Feldtyp: ${field.type} für Feld ${sig.fieldId}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Send signature invitation email (HTML + Plain Text)
 */
async function sendSignatureInvitation(signer, envelope, ownerEmail) {
  const signUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/sign/${signer.token}`;

  // 🆕 Get signature fields for this signer
  const signerFields = envelope.signatureFields.filter(
    field => field.assigneeEmail.toLowerCase() === signer.email.toLowerCase()
  );

  // 🆕 Import email templates
  const {
    generateSignatureInvitationHTML,
    generateSignatureInvitationText
  } = require('../templates/signatureInvitationEmail');

  // 🆕 Prepare data for templates
  const templateData = {
    signer: {
      name: signer.name,
      email: signer.email
    },
    envelope: {
      title: envelope.title,
      message: envelope.message || ''
    },
    ownerEmail,
    signUrl,
    expiresAt: signer.tokenExpires,
    signatureFields: signerFields
  };

  // 🆕 Generate HTML and plain text versions
  const htmlContent = generateSignatureInvitationHTML(templateData);
  const textContent = generateSignatureInvitationText(templateData);

  const subject = `📝 Signaturanfrage: ${envelope.title}`;

  try {
    await sendEmail(signer.email, subject, textContent, htmlContent);
    console.log(`✉️ Signature invitation sent to: ${signer.email} (${signerFields.length} fields)`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to send invitation to ${signer.email}:`, error);
    return false;
  }
}

/**
 * Send completion notification to owner
 */
async function sendCompletionNotification(envelope, recipientEmail) {
  const subject = `✅ Dokument vollständig signiert: ${envelope.title}`;

  // 🆕 Generate direct download link for signed PDF (valid 24 hours)
  let downloadLink = "Dashboard: " + (process.env.FRONTEND_URL || 'http://localhost:5173') + '/contracts';

  if (envelope.s3KeySealed) {
    try {
      const signedUrl = await generateSignedUrl(envelope.s3KeySealed, 86400); // 24 hours
      const pdfUrl = typeof signedUrl === 'string' ? signedUrl : signedUrl.url || signedUrl;
      downloadLink = pdfUrl;
      console.log(`✅ Generated download link for completion email: ${pdfUrl.substring(0, 80)}...`);
    } catch (err) {
      console.warn(`⚠️ Could not generate download link, using dashboard fallback:`, err.message);
    }
  }

  const text = `
Hallo,

gute Nachrichten! Ihr Dokument wurde von allen Parteien signiert.

Dokument: ${envelope.title}
Signiert am: ${new Date().toLocaleString('de-DE')}

Unterzeichner:
${envelope.signers.map(s => `  - ${s.name} (${s.email}) - Signiert am ${new Date(s.signedAt).toLocaleString('de-DE')}`).join('\n')}

📥 Signiertes Dokument herunterladen:
${downloadLink}

${envelope.s3KeySealed ? '(Dieser Link ist 24 Stunden gültig)' : ''}

Mit freundlichen Grüßen
Ihr Contract AI Team
`;

  try {
    await sendEmail(recipientEmail, subject, text);
    console.log(`✉️ Completion notification sent to: ${recipientEmail}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to send completion notification:`, error);
    return false;
  }
}

// ===== AUTHENTICATED ROUTES =====

/**
 * POST /api/envelopes - Create new envelope
 */
router.post("/envelopes", verifyToken, async (req, res) => {
  try {
    const {
      contractId,
      title,
      message,
      s3Key,
      signers,
      signatureFields,
      signingMode = "SINGLE", // 🆕 SINGLE | SEQUENTIAL | PARALLEL
      expiresInDays = 14
    } = req.body;

    console.log("✉️ Creating new envelope:", {
      title,
      signersCount: signers?.length,
      signingMode
    });

    // Validation
    if (!title || !s3Key) {
      return res.status(400).json({
        success: false,
        message: "Titel und Dokument sind erforderlich"
      });
    }

    if (!signers || !Array.isArray(signers) || signers.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Mindestens ein Unterzeichner erforderlich"
      });
    }

    // ✅ OPTIONAL: signatureFields kann leer sein (werden später im Field Placement Editor hinzugefügt)
    if (!signatureFields || !Array.isArray(signatureFields)) {
      return res.status(400).json({
        success: false,
        message: "signatureFields muss ein Array sein"
      });
    }

    // Verify contract ownership if contractId provided
    if (contractId) {
      const contract = await Contract.findOne({
        _id: contractId,
        userId: req.user.userId
      });

      if (!contract) {
        return res.status(404).json({
          success: false,
          message: "Vertrag nicht gefunden"
        });
      }
    }

    // Generate tokens for each signer
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    const enrichedSigners = signers.map((signer, index) => ({
      email: signer.email.toLowerCase().trim(),
      name: signer.name.trim(),
      role: signer.role || "Signer",
      order: signer.order || index + 1,
      status: "PENDING",
      signedAt: null,
      ip: null,
      userAgent: null,
      token: generateSignerToken(),
      tokenExpires: expiresAt
    }));

    // Validate signature fields assignments (nur wenn Felder vorhanden)
    if (signatureFields.length > 0) {
      const signerEmails = new Set(enrichedSigners.map(s => s.email));
      const invalidFields = signatureFields.filter(
        field => !signerEmails.has(field.assigneeEmail.toLowerCase())
      );

      if (invalidFields.length > 0) {
        return res.status(400).json({
          success: false,
          message: "Signaturfelder enthalten ungültige Unterzeichner-E-Mails"
        });
      }
    }

    // Create envelope
    const envelope = new Envelope({
      ownerId: req.user.userId,
      contractId: contractId || null,
      title,
      message: message || "",
      s3Key,
      s3KeySealed: null,
      pdfHash: null,
      status: "DRAFT", // Will be updated to AWAITING_SIGNER_X when sent
      signingMode, // 🆕 SINGLE | SEQUENTIAL | PARALLEL
      signers: enrichedSigners,
      signatureFields: signatureFields.map(field => ({
        ...field,
        assigneeEmail: field.assigneeEmail.toLowerCase().trim()
      })),
      expiresAt,
      audit: [{
        event: "CREATED",
        timestamp: new Date(),
        userId: req.user.userId,
        email: req.user.email,
        ip: getClientIP(req),
        userAgent: req.headers['user-agent'] || 'unknown',
        details: {
          signersCount: enrichedSigners.length,
          fieldsCount: signatureFields.length,
          signingMode // 🆕 Log signing mode
        }
      }]
    });

    await envelope.save();

    console.log(`✅ Envelope created: ${envelope._id}`);

    // ✉️ BUG FIX 2: Update Contract with Envelope reference
    if (contractId) {
      try {
        await Contract.findByIdAndUpdate(
          contractId,
          {
            signatureEnvelopeId: envelope._id,
            signatureStatus: 'draft' // Status wird zu 'sent' nach dem Versenden
          }
        );
        console.log(`✅ Contract ${contractId} updated with envelope reference`);
      } catch (contractUpdateError) {
        console.error('⚠️ Could not update contract:', contractUpdateError.message);
        // Don't fail envelope creation if contract update fails
      }
    }

    res.status(201).json({
      success: true,
      message: "Envelope erfolgreich erstellt",
      envelope: {
        _id: envelope._id,
        title: envelope.title,
        status: envelope.status,
        signersCount: envelope.signers.length,
        expiresAt: envelope.expiresAt
      }
    });

  } catch (error) {
    console.error("❌ Error creating envelope:", error);
    res.status(500).json({
      success: false,
      message: "Fehler beim Erstellen des Envelopes",
      error: error.message
    });
  }
});

/**
 * GET /api/envelopes - Get all envelopes for user
 * Query params:
 * - status: filter by status (DRAFT, SENT, COMPLETED, etc.)
 * - archived: 'true' to show only archived, 'false' or omit for non-archived
 * - search: search in title and signer emails
 * - limit: pagination limit (default 50)
 * - offset: pagination offset (default 0)
 */
router.get("/envelopes", verifyToken, async (req, res) => {
  try {
    const { status, archived, search, limit = 50, offset = 0 } = req.query;

    console.log(`📦 Loading envelopes for user: ${req.user.userId}`, { status, archived, search });

    const query = { ownerId: req.user.userId };

    // Filter by archived status
    if (archived === 'true') {
      query.archived = true;
    } else {
      // By default, don't show archived envelopes
      query.archived = { $ne: true };
    }

    // Filter by status
    if (status) {
      query.status = status;
    }

    // Search in title and signer emails
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { title: searchRegex },
        { 'signers.email': searchRegex },
        { 'signers.name': searchRegex }
      ];
    }

    const envelopes = await Envelope.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset))
      .populate('contractId', 'name')
      .lean();

    const total = await Envelope.countDocuments(query);

    // Also count archived envelopes to show/hide archive tab
    const archivedCount = await Envelope.countDocuments({
      ownerId: req.user.userId,
      archived: true
    });

    console.log(`✅ Loaded ${envelopes.length} envelopes (total: ${total}, archived: ${archivedCount})`);

    res.json({
      success: true,
      envelopes: envelopes.map(env => ({
        _id: env._id,
        title: env.title,
        status: env.status,
        contract: env.contractId, // Populated contract object mit _id und name
        signers: env.signers, // ✉️ BUG FIX 4: Vollständiges signers Array senden
        s3Key: env.s3Key, // ✉️ Original PDF
        s3KeySealed: env.s3KeySealed, // ✉️ Signiertes PDF
        internalNote: env.internalNote, // ✉️ Interne Notizen
        archived: env.archived || false,
        archivedAt: env.archivedAt,
        createdAt: env.createdAt,
        expiresAt: env.expiresAt,
        completedAt: env.completedAt
      })),
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: parseInt(offset) + envelopes.length < total
      },
      archivedCount // For showing/hiding archive tab
    });

  } catch (error) {
    console.error("❌ Error loading envelopes:", error);
    res.status(500).json({
      success: false,
      message: "Fehler beim Laden der Envelopes",
      error: error.message
    });
  }
});

/**
 * GET /api/envelopes/:id - Get single envelope details
 */
router.get("/envelopes/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Ungültige Envelope-ID"
      });
    }

    const envelope = await Envelope.findOne({
      _id: id,
      ownerId: req.user.userId
    })
    .populate('contractId', 'name status uploadDate s3Key')
    .lean();

    if (!envelope) {
      return res.status(404).json({
        success: false,
        message: "Envelope nicht gefunden"
      });
    }

    console.log(`✅ Loaded envelope details: ${envelope.title}`);

    // 🆕 Enrich response with computed fields
    const signersTotal = envelope.signers?.length || 0;
    const signersSigned = envelope.signers?.filter(s => s.status === 'SIGNED').length || 0;
    const signersDeclined = envelope.signers?.filter(s => s.status === 'DECLINED').length || 0;
    const signersPending = signersTotal - signersSigned - signersDeclined;

    // 🆕 Calculate progress percentage
    const progressPercentage = signersTotal > 0
      ? Math.round((signersSigned / signersTotal) * 100)
      : 0;

    // Process audit trail - Transform 'event' field to 'action' for frontend compatibility
    const transformedAudit = (envelope.audit || [])
      .filter(evt => evt && (evt.action || evt.event))  // Accept both field names
      .map(evt => ({
        ...evt,
        action: evt.action || evt.event,  // Use 'action' if exists, otherwise use 'event'
        timestamp: evt.timestamp,
        details: evt.details || {}
      }));

    // 🆕 Add enriched data
    const enrichedEnvelope = {
      ...envelope,
      stats: {
        signersTotal,
        signersSigned,
        signersDeclined,
        signersPending,
        progressPercentage
      },
      // ✅ FIX: Keep audit trail for timeline display (field is 'audit' in model, not 'auditTrail')
      // Transform 'event' field to 'action' for frontend compatibility
      auditTrail: transformedAudit
    };

    res.json({
      success: true,
      envelope: enrichedEnvelope
    });

  } catch (error) {
    console.error("❌ Error loading envelope:", error);
    res.status(500).json({
      success: false,
      message: "Fehler beim Laden des Envelopes",
      error: error.message
    });
  }
});

/**
 * POST /api/envelopes/:id/send - Send invitations to signers
 */
router.post("/envelopes/:id/send", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Ungültige Envelope-ID"
      });
    }

    const envelope = await Envelope.findOne({
      _id: id,
      ownerId: req.user.userId
    });

    if (!envelope) {
      return res.status(404).json({
        success: false,
        message: "Envelope nicht gefunden"
      });
    }

    // Can only send DRAFT envelopes
    if (envelope.status !== 'DRAFT') {
      return res.status(400).json({
        success: false,
        message: `Envelope kann nicht gesendet werden (Status: ${envelope.status})`
      });
    }

    console.log(`📤 Sending invitations for envelope: ${envelope.title} (Mode: ${envelope.signingMode})`);

    // 🆕 Determine which signers to notify based on signing mode
    let signersToNotify = [];

    if (envelope.signingMode === 'SEQUENTIAL') {
      // Only notify the first signer (lowest order number)
      const sortedSigners = envelope.signers.sort((a, b) => a.order - b.order);
      signersToNotify = [sortedSigners[0]];
      console.log(`📧 Sequential mode: Notifying only first signer (order ${sortedSigners[0].order}): ${sortedSigners[0].email}`);
    } else {
      // SINGLE or PARALLEL: Notify all signers
      signersToNotify = envelope.signers;
      console.log(`📧 ${envelope.signingMode} mode: Notifying all ${envelope.signers.length} signers`);
    }

    // Send invitations
    const sendResults = await Promise.allSettled(
      signersToNotify.map(signer =>
        sendSignatureInvitation(signer, envelope, req.user.email)
      )
    );

    const successCount = sendResults.filter(r => r.status === 'fulfilled' && r.value).length;
    const failedCount = signersToNotify.length - successCount;

    // 🆕 Update envelope status based on signing mode
    if (envelope.signingMode === 'SEQUENTIAL') {
      envelope.status = 'AWAITING_SIGNER_1';
    } else {
      envelope.status = 'SENT';
    }

    await envelope.addAuditEvent('SENT', {
      userId: req.user.userId,
      email: req.user.email,
      ip: getClientIP(req),
      userAgent: req.headers['user-agent'],
      details: {
        signingMode: envelope.signingMode,
        totalSigners: envelope.signers.length,
        notifiedSigners: signersToNotify.length,
        successCount,
        failedCount
      }
    });

    console.log(`✅ Invitations sent: ${successCount} successful, ${failedCount} failed`);

    // ✉️ BUG FIX 2: Update Contract status to 'sent'
    if (envelope.contractId) {
      try {
        await Contract.findByIdAndUpdate(
          envelope.contractId,
          { signatureStatus: 'sent' }
        );
        console.log(`✅ Contract ${envelope.contractId} status updated to 'sent'`);
      } catch (contractUpdateError) {
        console.error('⚠️ Could not update contract status:', contractUpdateError.message);
      }
    }

    // 📅 KILLER FEATURE: Auto-create calendar events for signature lifecycle
    try {
      await generateEventsForEnvelope(req.db, envelope);
      console.log(`📅 Calendar events created for envelope: ${envelope.title}`);
    } catch (calendarError) {
      console.error('⚠️ Could not create calendar events:', calendarError.message);
      // Don't block envelope sending if calendar creation fails
    }

    res.json({
      success: true,
      message: `Einladungen an ${successCount} von ${envelope.signers.length} Unterzeichnern gesendet`,
      envelope: {
        _id: envelope._id,
        status: envelope.status,
        successCount,
        failedCount
      }
    });

  } catch (error) {
    console.error("❌ Error sending invitations:", error);
    res.status(500).json({
      success: false,
      message: "Fehler beim Senden der Einladungen",
      error: error.message
    });
  }
});

/**
 * POST /api/envelopes/:id/remind - Remind ALL pending signers (no specific email needed)
 */
router.post("/envelopes/:id/remind", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Ungültige Envelope-ID"
      });
    }

    const envelope = await Envelope.findOne({
      _id: id,
      ownerId: req.user.userId
    });

    if (!envelope) {
      return res.status(404).json({
        success: false,
        message: "Envelope nicht gefunden"
      });
    }

    if (envelope.status !== 'SENT') {
      return res.status(400).json({
        success: false,
        message: "Erinnerungen können nur für gesendete Envelopes verschickt werden"
      });
    }

    console.log(`🔔 Reminding ALL pending signers for envelope: ${envelope.title}`);

    // Find all pending signers
    const pendingSigners = envelope.signers.filter(s => s.status === 'PENDING');

    if (pendingSigners.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Alle Unterzeichner haben bereits signiert"
      });
    }

    // Send reminders to all pending signers
    const sendResults = await Promise.allSettled(
      pendingSigners.map(signer =>
        sendSignatureInvitation(signer, envelope, req.user.email)
      )
    );

    const successCount = sendResults.filter(r => r.status === 'fulfilled' && r.value).length;
    const failedCount = pendingSigners.length - successCount;

    // Log audit event
    await envelope.addAuditEvent('REMINDER_SENT', {
      userId: req.user.userId,
      email: req.user.email,
      ip: getClientIP(req),
      userAgent: req.headers['user-agent'],
      details: {
        remindedCount: pendingSigners.length,
        successCount,
        failedCount
      }
    });

    res.json({
      success: true,
      message: `Erinnerungen an ${successCount} von ${pendingSigners.length} ausstehenden Unterzeichnern gesendet`,
      details: {
        successCount,
        failedCount,
        totalReminded: pendingSigners.length
      }
    });

  } catch (error) {
    console.error("❌ Error sending reminders:", error);
    res.status(500).json({
      success: false,
      message: "Fehler beim Senden der Erinnerungen",
      error: error.message
    });
  }
});

/**
 * POST /api/envelopes/:id/resend - Resend invitation reminder to SPECIFIC signer
 */
router.post("/envelopes/:id/resend", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { signerEmail } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Ungültige Envelope-ID"
      });
    }

    const envelope = await Envelope.findOne({
      _id: id,
      ownerId: req.user.userId
    });

    if (!envelope) {
      return res.status(404).json({
        success: false,
        message: "Envelope nicht gefunden"
      });
    }

    if (envelope.status !== 'SENT') {
      return res.status(400).json({
        success: false,
        message: "Erinnerungen können nur für gesendete Envelopes verschickt werden"
      });
    }

    // Find signer
    const signer = envelope.getSignerByEmail(signerEmail);

    if (!signer) {
      return res.status(404).json({
        success: false,
        message: "Unterzeichner nicht gefunden"
      });
    }

    if (signer.status === 'SIGNED') {
      return res.status(400).json({
        success: false,
        message: "Unterzeichner hat bereits signiert"
      });
    }

    console.log(`🔔 Resending invitation to: ${signerEmail}`);

    // Send reminder
    const sent = await sendSignatureInvitation(signer, envelope, req.user.email);

    if (sent) {
      await envelope.addAuditEvent('REMINDER_SENT', {
        userId: req.user.userId,
        email: signerEmail,
        ip: getClientIP(req),
        userAgent: req.headers['user-agent']
      });

      res.json({
        success: true,
        message: `Erinnerung an ${signerEmail} gesendet`
      });
    } else {
      res.status(500).json({
        success: false,
        message: "Fehler beim Senden der Erinnerung"
      });
    }

  } catch (error) {
    console.error("❌ Error resending invitation:", error);
    res.status(500).json({
      success: false,
      message: "Fehler beim Senden der Erinnerung",
      error: error.message
    });
  }
});

/**
 * POST /api/envelopes/:id/seal - Manually seal PDF (COMPLETED envelopes only)
 */
router.post("/envelopes/:id/seal", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Ungültige Envelope-ID"
      });
    }

    const envelope = await Envelope.findOne({
      _id: id,
      ownerId: req.user.userId
    });

    if (!envelope) {
      return res.status(404).json({
        success: false,
        message: "Envelope nicht gefunden"
      });
    }

    if (envelope.status !== 'COMPLETED') {
      return res.status(400).json({
        success: false,
        message: `PDF kann nur für abgeschlossene Envelopes versiegelt werden (Status: ${envelope.status})`
      });
    }

    if (envelope.s3KeySealed) {
      return res.status(400).json({
        success: false,
        message: "PDF wurde bereits versiegelt",
        s3KeySealed: envelope.s3KeySealed
      });
    }

    console.log(`🔒 Manual PDF sealing requested for envelope: ${envelope.title}`);

    try {
      const sealedS3Key = await sealPdf(envelope);
      envelope.s3KeySealed = sealedS3Key;

      await envelope.addAuditEvent('PDF_SEALED', {
        userId: req.user.userId,
        email: req.user.email,
        ip: getClientIP(req),
        userAgent: req.headers['user-agent'],
        details: { s3KeySealed: sealedS3Key, manual: true }
      });

      console.log(`✅ PDF sealed manually: ${sealedS3Key}`);

      res.json({
        success: true,
        message: "PDF erfolgreich versiegelt",
        envelope: {
          _id: envelope._id,
          s3KeySealed: envelope.s3KeySealed
        }
      });

    } catch (sealError) {
      console.error('❌ PDF sealing failed:', sealError);

      await envelope.addAuditEvent('PDF_SEALING_FAILED', {
        userId: req.user.userId,
        email: req.user.email,
        ip: getClientIP(req),
        userAgent: req.headers['user-agent'],
        details: { error: sealError.message, manual: true }
      });

      res.status(500).json({
        success: false,
        message: "Fehler beim Versiegeln des PDFs",
        error: sealError.message
      });
    }

  } catch (error) {
    console.error("❌ Error in seal endpoint:", error);
    res.status(500).json({
      success: false,
      message: "Fehler beim Versiegeln des PDFs",
      error: error.message
    });
  }
});

/**
 * PATCH /api/envelopes/:id/note - Update internal note
 */
router.patch("/envelopes/:id/note", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { note } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Ungültige Envelope-ID"
      });
    }

    const envelope = await Envelope.findOne({
      _id: id,
      ownerId: req.user.userId
    });

    if (!envelope) {
      return res.status(404).json({
        success: false,
        message: "Envelope nicht gefunden"
      });
    }

    // Validate note length (max 500 chars per model)
    if (note && note.length > 500) {
      return res.status(400).json({
        success: false,
        message: "Notiz zu lang (max 500 Zeichen)"
      });
    }

    console.log(`📝 Updating internal note for envelope: ${envelope.title}`);

    envelope.internalNote = note || null;
    await envelope.save();

    console.log(`✅ Internal note updated for envelope: ${envelope._id}`);

    res.json({
      success: true,
      message: "Notiz gespeichert",
      internalNote: envelope.internalNote
    });

  } catch (error) {
    console.error("❌ Error updating note:", error);
    res.status(500).json({
      success: false,
      message: "Fehler beim Speichern der Notiz",
      error: error.message
    });
  }
});

/**
 * POST /api/envelopes/:id/void - Cancel/void envelope
 */
router.post("/envelopes/:id/void", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Ungültige Envelope-ID"
      });
    }

    const envelope = await Envelope.findOne({
      _id: id,
      ownerId: req.user.userId
    });

    if (!envelope) {
      return res.status(404).json({
        success: false,
        message: "Envelope nicht gefunden"
      });
    }

    if (envelope.status === 'COMPLETED' || envelope.status === 'VOIDED') {
      return res.status(400).json({
        success: false,
        message: `Envelope kann nicht storniert werden (Status: ${envelope.status})`
      });
    }

    console.log(`🚫 Voiding envelope: ${envelope.title}`);

    envelope.status = 'VOIDED';
    envelope.voidedAt = new Date();
    envelope.voidReason = reason || 'Vom Eigentümer storniert';

    await envelope.addAuditEvent('VOIDED', {
      userId: req.user.userId,
      email: req.user.email,
      ip: getClientIP(req),
      userAgent: req.headers['user-agent'],
      details: { reason: envelope.voidReason }
    });

    // 📅 KILLER FEATURE: Delete calendar events when envelope is voided
    try {
      await deleteEnvelopeEvents(req.db, envelope._id);
      console.log(`📅 Calendar events deleted for voided envelope`);
    } catch (calendarError) {
      console.error('⚠️ Could not delete calendar events:', calendarError.message);
      // Don't block voiding if calendar deletion fails
    }

    console.log(`✅ Envelope voided: ${envelope._id}`);

    res.json({
      success: true,
      message: "Envelope erfolgreich storniert",
      envelope: {
        _id: envelope._id,
        status: envelope.status,
        voidedAt: envelope.voidedAt
      }
    });

  } catch (error) {
    console.error("❌ Error voiding envelope:", error);
    res.status(500).json({
      success: false,
      message: "Fehler beim Stornieren des Envelopes",
      error: error.message
    });
  }
});

/**
 * POST /api/envelopes/archive - Archive multiple envelopes (bulk)
 */
router.post("/envelopes/archive", verifyToken, async (req, res) => {
  try {
    const { envelopeIds } = req.body;

    if (!envelopeIds || !Array.isArray(envelopeIds) || envelopeIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Keine Envelope-IDs angegeben"
      });
    }

    console.log(`📦 Archiving ${envelopeIds.length} envelopes for user: ${req.user.userId}`);

    const result = await Envelope.updateMany(
      {
        _id: { $in: envelopeIds },
        ownerId: req.user.userId
      },
      {
        $set: {
          archived: true,
          archivedAt: new Date()
        }
      }
    );

    console.log(`✅ Archived ${result.modifiedCount} envelopes`);

    res.json({
      success: true,
      message: `${result.modifiedCount} Envelope(s) archiviert`,
      archivedCount: result.modifiedCount
    });

  } catch (error) {
    console.error("❌ Error archiving envelopes:", error);
    res.status(500).json({
      success: false,
      message: "Fehler beim Archivieren",
      error: error.message
    });
  }
});

/**
 * POST /api/envelopes/unarchive - Unarchive multiple envelopes (bulk)
 */
router.post("/envelopes/unarchive", verifyToken, async (req, res) => {
  try {
    const { envelopeIds } = req.body;

    if (!envelopeIds || !Array.isArray(envelopeIds) || envelopeIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Keine Envelope-IDs angegeben"
      });
    }

    console.log(`📦 Unarchiving ${envelopeIds.length} envelopes for user: ${req.user.userId}`);

    const result = await Envelope.updateMany(
      {
        _id: { $in: envelopeIds },
        ownerId: req.user.userId
      },
      {
        $set: {
          archived: false,
          archivedAt: null
        }
      }
    );

    console.log(`✅ Unarchived ${result.modifiedCount} envelopes`);

    res.json({
      success: true,
      message: `${result.modifiedCount} Envelope(s) wiederhergestellt`,
      unarchivedCount: result.modifiedCount
    });

  } catch (error) {
    console.error("❌ Error unarchiving envelopes:", error);
    res.status(500).json({
      success: false,
      message: "Fehler beim Wiederherstellen",
      error: error.message
    });
  }
});

/**
 * DELETE /api/envelopes/bulk - Permanently delete multiple envelopes (only archived ones)
 */
router.delete("/envelopes/bulk", verifyToken, async (req, res) => {
  try {
    const { envelopeIds } = req.body;

    if (!envelopeIds || !Array.isArray(envelopeIds) || envelopeIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Keine Envelope-IDs angegeben"
      });
    }

    console.log(`🗑️ Deleting ${envelopeIds.length} envelopes for user: ${req.user.userId}`);

    // Only allow deletion of archived envelopes
    const result = await Envelope.deleteMany({
      _id: { $in: envelopeIds },
      ownerId: req.user.userId,
      archived: true // Safety: only delete archived envelopes
    });

    console.log(`✅ Deleted ${result.deletedCount} envelopes`);

    res.json({
      success: true,
      message: `${result.deletedCount} Envelope(s) endgültig gelöscht`,
      deletedCount: result.deletedCount
    });

  } catch (error) {
    console.error("❌ Error deleting envelopes:", error);
    res.status(500).json({
      success: false,
      message: "Fehler beim Löschen",
      error: error.message
    });
  }
});

// ===== PUBLIC ROUTES (NO AUTH) =====

/**
 * GET /api/sign/:token - Load signature session (public)
 */
router.get("/sign/:token", async (req, res) => {
  try {
    const { token } = req.params;

    console.log(`🔍 Loading signature session for token: ${token.substring(0, 10)}...`);

    // Find envelope by signer token
    const envelope = await Envelope.findBySignerToken(token).lean();

    if (!envelope) {
      return res.status(404).json({
        success: false,
        message: "Signature-Link nicht gefunden oder ungültig"
      });
    }

    // Find the signer
    const signer = envelope.signers.find(s => s.token === token);

    if (!signer) {
      return res.status(404).json({
        success: false,
        message: "Unterzeichner nicht gefunden"
      });
    }

    // Check token expiration
    if (new Date() > new Date(signer.tokenExpires)) {
      return res.status(410).json({
        success: false,
        message: "Signature-Link ist abgelaufen",
        expired: true
      });
    }

    // ✅ Check if token was invalidated (security)
    if (signer.tokenInvalidated) {
      return res.status(410).json({
        success: false,
        message: "Signature-Link wurde invalidiert",
        invalidated: true
      });
    }

    // Check if already signed
    if (signer.status === 'SIGNED') {
      return res.status(200).json({
        success: true,
        message: "Sie haben dieses Dokument bereits signiert",
        alreadySigned: true,
        signedAt: signer.signedAt
      });
    }

    // Check envelope status
    if (envelope.status === 'VOIDED') {
      return res.status(410).json({
        success: false,
        message: "Dieses Dokument wurde storniert"
      });
    }

    if (envelope.status === 'COMPLETED') {
      return res.status(410).json({
        success: false,
        message: "Dieses Dokument wurde bereits vollständig signiert"
      });
    }

    // Log opened event
    await Envelope.updateOne(
      { _id: envelope._id },
      {
        $push: {
          audit: {
            event: 'OPENED',
            timestamp: new Date(),
            userId: null,
            email: signer.email,
            ip: getClientIP(req),
            userAgent: req.headers['user-agent'] || 'unknown',
            details: {}
          }
        }
      }
    );

    console.log(`✅ Signature session loaded for: ${signer.email}`);

    // Get signature fields for this signer
    const myFields = envelope.signatureFields.filter(
      field => field.assigneeEmail === signer.email
    );

    // 📄 Generate presigned URL for PDF preview
    let pdfUrl = null;
    if (envelope.s3Key) {
      try {
        const { generateSignedUrl } = require("../services/fileStorage");
        pdfUrl = await generateSignedUrl(envelope.s3Key);
        console.log(`✅ Generated presigned PDF URL for: ${envelope.s3Key}`);
      } catch (error) {
        console.error(`❌ Failed to generate presigned URL:`, error);
      }
    }

    res.json({
      success: true,
      envelope: {
        _id: envelope._id,
        title: envelope.title,
        message: envelope.message,
        s3Key: envelope.s3Key,
        pdfUrl, // 📄 NEU: Presigned URL für PDF-Vorschau
        expiresAt: envelope.expiresAt
      },
      signer: {
        name: signer.name,
        email: signer.email,
        role: signer.role
      },
      signatureFields: myFields
    });

  } catch (error) {
    console.error("❌ Error loading signature session:", error);
    res.status(500).json({
      success: false,
      message: "Fehler beim Laden der Signature-Sitzung",
      error: error.message
    });
  }
});

/**
 * POST /api/sign/:token/submit - Submit signature (public)
 */
router.post("/sign/:token/submit", signatureSubmitLimiter, async (req, res) => {
  try {
    const { token } = req.params;
    const { signatures } = req.body; // Array of { fieldId, value (base64) }

    console.log(`✍️ Submitting signature for token: ${token.substring(0, 10)}...`);

    if (!signatures || !Array.isArray(signatures) || signatures.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Signaturen fehlen"
      });
    }

    // Find envelope
    const envelope = await Envelope.findBySignerToken(token);

    if (!envelope) {
      return res.status(404).json({
        success: false,
        message: "Signature-Link nicht gefunden"
      });
    }

    // Find signer
    const signer = envelope.getSignerByToken(token);

    if (!signer) {
      return res.status(404).json({
        success: false,
        message: "Unterzeichner nicht gefunden"
      });
    }

    // Check token expiration
    if (new Date() > new Date(signer.tokenExpires)) {
      return res.status(410).json({
        success: false,
        message: "Signature-Link ist abgelaufen"
      });
    }

    // ✅ IDEMPOTENZ: Wenn bereits signiert, gib Success zurück
    if (signer.status === 'SIGNED') {
      console.log(`⚠️ Signature already exists for ${signer.email} (idempotent request)`);

      // Generate presigned URL for sealed PDF if available
      let sealedPdfUrl = null;
      if (envelope.s3KeySealed) {
        try {
          const { generateSignedUrl } = require("../services/fileStorage");
          sealedPdfUrl = await generateSignedUrl(envelope.s3KeySealed);
        } catch (error) {
          console.error(`❌ Failed to generate sealed PDF URL:`, error);
        }
      }

      return res.status(200).json({
        success: true,
        message: "Bereits signiert",
        envelope: {
          _id: envelope._id,
          status: envelope.status,
          allSigned: envelope.allSigned(),
          completedAt: envelope.completedAt,
          sealedPdfUrl
        }
      });
    }

    // Check envelope status
    if (envelope.status === 'VOIDED' || envelope.status === 'COMPLETED') {
      return res.status(400).json({
        success: false,
        message: "Signatur kann nicht mehr hinzugefügt werden"
      });
    }

    console.log(`✅ Processing ${signatures.length} signatures for: ${signer.email}`);

    // ✅ FIX 6: COMPREHENSIVE VALIDATION (Required fields, Field types, Permissions)
    const validationResult = validateEnvelopeSubmission(envelope, signatures, signer.email);
    if (!validationResult.valid) {
      console.error(`❌ Validation failed for ${signer.email}:`, validationResult.errors);
      return res.status(400).json({
        success: false,
        message: 'Validierungsfehler',
        errors: validationResult.errors
      });
    }

    // ✅ VALIDATE SIGNATURE/INITIALS FORMAT (Base64, Size)
    for (const sig of signatures) {
      const field = envelope.signatureFields.id(sig.fieldId);

      // Only validate signature/initials fields (not text/date)
      if (field && (field.type === 'signature' || field.type === 'initials')) {
        const validation = validateSignature(sig.value);
        if (!validation.valid) {
          return res.status(400).json({
            success: false,
            message: validation.error
          });
        }
      }
    }

    // Update signature fields
    const now = new Date();
    let updatedCount = 0;

    for (const sig of signatures) {
      const field = envelope.signatureFields.id(sig.fieldId);

      if (field && field.assigneeEmail === signer.email) {
        field.value = sig.value;
        field.signedAt = now;
        updatedCount++;
      }
    }

    if (updatedCount === 0) {
      return res.status(400).json({
        success: false,
        message: "Keine gültigen Signaturfelder gefunden"
      });
    }

    // Update signer status
    signer.status = 'SIGNED';
    signer.signedAt = now;
    signer.ip = getClientIP(req);
    signer.userAgent = req.headers['user-agent'] || 'unknown';

    // ✅ Invalidate token immediately after signing (security)
    signer.tokenInvalidated = true;
    console.log(`🔐 Token invalidated for: ${signer.email}`);

    // Check if envelope status should be updated
    if (envelope.status === 'SENT') {
      envelope.status = 'SIGNED';
    }

    // 🆕 FIX 6: Calculate integrity hashes for audit trail
    const docHash = crypto.createHash('sha256')
      .update(envelope.s3Key || envelope._id.toString())
      .digest('hex')
      .substring(0, 16);

    // Create hash of all submitted values (for integrity verification)
    const valuesString = signatures
      .map(sig => `${sig.fieldId}:${sig.value}`)
      .sort()
      .join('|');
    const valuesHash = crypto.createHash('sha256')
      .update(valuesString)
      .digest('hex')
      .substring(0, 16);

    // Add audit event with integrity hashes
    await envelope.addAuditEvent('SIGNED', {
      userId: null,
      email: signer.email,
      ip: signer.ip,
      userAgent: signer.userAgent,
      details: {
        signaturesCount: updatedCount,
        docHash,      // 🔒 Document integrity hash
        valuesHash    // 🔒 Values integrity hash
      }
    });

    // 🆕 SEQUENTIAL SIGNING LOGIC: Notify next signer
    if (envelope.signingMode === 'SEQUENTIAL' && !envelope.allSigned()) {
      // Find next unsigned signer by order
      const sortedSigners = envelope.signers.sort((a, b) => a.order - b.order);
      const nextSigner = sortedSigners.find(s => s.status === 'PENDING');

      if (nextSigner) {
        console.log(`📧 Sequential mode: Notifying next signer (order ${nextSigner.order}): ${nextSigner.email}`);

        // Get owner info for email (using MongoDB native driver)
        const owner = await req.db.collection("users").findOne({ _id: new ObjectId(envelope.ownerId) });
        const ownerEmail = owner?.email || "Contract AI";

        // Send invitation to next signer
        try {
          await sendSignatureInvitation(nextSigner, envelope, ownerEmail);

          // Update status to AWAITING_SIGNER_X
          envelope.status = `AWAITING_SIGNER_${nextSigner.order}`;

          await envelope.addAuditEvent('SENT', {
            userId: null,
            email: nextSigner.email,
            ip: getClientIP(req),
            userAgent: req.headers['user-agent'],
            details: {
              reason: 'Sequential signing - next signer notified',
              signerOrder: nextSigner.order
            }
          });

          console.log(`✅ Next signer notified: ${nextSigner.email} (order ${nextSigner.order})`);
        } catch (emailError) {
          console.error(`❌ Failed to notify next signer:`, emailError);
          // Don't fail the request, just log the error
        }
      }
    } else if (envelope.status === 'SENT' || envelope.status.startsWith('AWAITING_SIGNER_')) {
      // Non-sequential mode: Just update status to SIGNED
      envelope.status = 'SIGNED';
    }

    // 🆕 ALWAYS seal PDF after EVERY signature (not just final one)
    // This allows signers to download partial PDFs with their signature
    try {
      console.log('🔒 Starting automatic PDF sealing...');
      const result = await sealPdf(envelope);

      // ✅ Store sealed PDF location + integrity hashes
      envelope.s3KeySealed = result.sealedS3Key;
      envelope.pdfHashOriginal = result.pdfHashOriginal;
      envelope.pdfHashFinal = result.pdfHashFinal;

      await envelope.addAuditEvent('PDF_SEALED', {
        userId: null,
        email: null,
        ip: getClientIP(req),
        userAgent: req.headers['user-agent'],
        details: {
          s3KeySealed: result.sealedS3Key,
          pdfHashOriginal: result.pdfHashOriginal,
          pdfHashFinal: result.pdfHashFinal,
          signedCount: envelope.signers.filter(s => s.status === 'SIGNED').length,
          totalSigners: envelope.signers.length
        }
      });
      console.log(`✅ PDF sealed successfully: ${result.sealedS3Key}`);
    } catch (sealError) {
      console.error('⚠️ PDF sealing failed:', sealError.message);
      // Don't fail the whole request if sealing fails
      await envelope.addAuditEvent('PDF_SEALING_FAILED', {
        userId: null,
        email: null,
        ip: getClientIP(req),
        userAgent: req.headers['user-agent'],
        details: { error: sealError.message }
      });
    }

    // Check if all signers have signed
    if (envelope.allSigned()) {
      envelope.status = 'COMPLETED';
      envelope.completedAt = now;

      await envelope.addAuditEvent('COMPLETED', {
        userId: null,
        email: null,
        ip: getClientIP(req),
        userAgent: req.headers['user-agent'],
        details: {
          totalSigners: envelope.signers.length
        }
      });

      console.log(`🎉 All signers completed! Envelope: ${envelope.title}`);

      // ✉️ Update Contract status to 'completed'
      if (envelope.contractId) {
        try {
          await Contract.findByIdAndUpdate(
            envelope.contractId,
            { signatureStatus: 'completed' }
          );
          console.log(`✅ Contract ${envelope.contractId} status updated to 'completed'`);
        } catch (contractUpdateError) {
          console.error('⚠️ Could not update contract status:', contractUpdateError.message);
        }
      }

      // 📅 KILLER FEATURE: Mark envelope as completed in calendar
      try {
        await markEnvelopeAsCompleted(req.db, envelope);
        console.log(`📅 Calendar events updated: Envelope marked as completed`);
      } catch (calendarError) {
        console.error('⚠️ Could not update calendar events:', calendarError.message);
        // Don't block completion if calendar update fails
      }

      // 🆕 Send completion notification to ALL signers (not just owner)
      try {
        console.log('📧 Sending completion notifications to all signers...');

        for (const envSigner of envelope.signers) {
          try {
            await sendCompletionNotification(envelope, envSigner.email);
            console.log(`✅ Completion email sent to: ${envSigner.email}`);
          } catch (emailError) {
            console.error(`❌ Failed to send completion email to ${envSigner.email}:`, emailError.message);
          }
        }
      } catch (notificationError) {
        console.error("⚠️ Could not send completion notifications:", notificationError.message);
      }
    }

    console.log(`✅ Signature submitted successfully by: ${signer.email}`);

    // 📄 Generate presigned URL for sealed PDF download
    let sealedPdfUrl = null;
    if (envelope.s3KeySealed) {
      try {
        const { generateSignedUrl } = require("../services/fileStorage");
        sealedPdfUrl = await generateSignedUrl(envelope.s3KeySealed);
        console.log(`✅ Generated download URL for sealed PDF`);
      } catch (error) {
        console.error(`❌ Failed to generate sealed PDF URL:`, error);
      }
    }

    // 🆕 Dynamic success message based on context
    let message = "✅ Signatur erfolgreich übermittelt!";
    let details = null;

    if (envelope.allSigned()) {
      // All signatures completed
      message = "✅ Signatur erfolgreich übermittelt! Das Dokument ist vollständig signiert.";

      // Only notify about owner notification if signer is NOT the owner
      if (signer.role !== 'sender') {
        details = "Der Vertragsinhaber wurde benachrichtigt.";
      }
    } else {
      // More signatures pending
      if (envelope.signingMode === 'SEQUENTIAL') {
        message = "✅ Signatur erfolgreich übermittelt!";
        details = "Der nächste Unterzeichner wurde benachrichtigt.";
      } else {
        message = "✅ Signatur erfolgreich übermittelt!";
        details = signer.role === 'sender'
          ? "Alle Empfänger wurden benachrichtigt."
          : "Der Vertragsinhaber wurde benachrichtigt.";
      }
    }

    res.json({
      success: true,
      message,
      details, // 🆕 Additional context-aware info
      envelope: {
        _id: envelope._id,
        status: envelope.status,
        allSigned: envelope.allSigned(),
        completedAt: envelope.completedAt,
        sealedPdfUrl // 📄 Download-URL für signiertes PDF
      }
    });

  } catch (error) {
    console.error("❌ Error submitting signature:", error);
    res.status(500).json({
      success: false,
      message: "Fehler beim Übermitteln der Signatur",
      error: error.message
    });
  }
});

/**
 * POST /api/sign/:token/decline - Decline signature request (public)
 */
router.post("/sign/:token/decline", signatureDeclineLimiter, async (req, res) => {
  try {
    const { token } = req.params;
    const { reason } = req.body; // Optional decline reason

    console.log(`❌ Declining signature for token: ${token.substring(0, 10)}...`);

    // Find envelope
    const envelope = await Envelope.findBySignerToken(token);

    if (!envelope) {
      return res.status(404).json({
        success: false,
        message: "Signature-Link nicht gefunden"
      });
    }

    // Find signer
    const signer = envelope.getSignerByToken(token);

    if (!signer) {
      return res.status(404).json({
        success: false,
        message: "Unterzeichner nicht gefunden"
      });
    }

    // Check token expiration
    if (new Date() > new Date(signer.tokenExpires)) {
      return res.status(410).json({
        success: false,
        message: "Signature-Link ist abgelaufen"
      });
    }

    // Check if token was invalidated
    if (signer.tokenInvalidated) {
      return res.status(410).json({
        success: false,
        message: "Signature-Link wurde invalidiert"
      });
    }

    // ✅ IDEMPOTENZ: Wenn bereits declined, gib Success zurück
    if (signer.status === 'DECLINED') {
      console.log(`⚠️ Already declined by ${signer.email} (idempotent request)`);
      return res.status(200).json({
        success: true,
        message: "Bereits abgelehnt",
        envelope: {
          _id: envelope._id,
          status: envelope.status
        }
      });
    }

    // Check if already signed (can't decline after signing)
    if (signer.status === 'SIGNED') {
      return res.status(400).json({
        success: false,
        message: "Sie haben bereits signiert - Ablehnung nicht möglich"
      });
    }

    // Update signer status
    const now = new Date();
    signer.status = 'DECLINED';
    signer.declinedAt = now;
    signer.declineReason = reason || null;
    signer.ip = getClientIP(req);
    signer.userAgent = req.headers['user-agent'] || 'unknown';

    // ✅ Invalidate token after decline (security)
    signer.tokenInvalidated = true;

    // Update envelope status
    if (envelope.status === 'SENT' || envelope.status === 'AWAITING_SIGNER_1' || envelope.status === 'AWAITING_SIGNER_2') {
      envelope.status = 'DECLINED';
    }

    // Add audit event
    await envelope.addAuditEvent('DECLINED', {
      userId: null,
      email: signer.email,
      ip: signer.ip,
      userAgent: signer.userAgent,
      details: {
        reason: reason || 'Kein Grund angegeben'
      }
    });

    await envelope.save();

    console.log(`✅ Signature declined by: ${signer.email}`);

    // TODO: Send notification to owner (später in Email-Templates)

    res.json({
      success: true,
      message: "Signaturanfrage abgelehnt",
      envelope: {
        _id: envelope._id,
        status: envelope.status
      }
    });

  } catch (error) {
    console.error("❌ Error declining signature:", error);
    res.status(500).json({
      success: false,
      message: "Fehler beim Ablehnen der Signatur",
      error: error.message
    });
  }
});

// ===================================================
// UPDATE ENVELOPE (Signature Fields)
// PUT /api/envelopes/:id
// ===================================================
router.put("/envelopes/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { signatureFields } = req.body;

    console.log(`📝 Updating envelope ${id} with ${signatureFields?.length || 0} fields`);

    // Validate fields array
    if (!signatureFields || !Array.isArray(signatureFields)) {
      return res.status(400).json({
        success: false,
        error: "signatureFields muss ein Array sein"
      });
    }

    // Find envelope and verify ownership
    const envelope = await Envelope.findOne({
      _id: id,
      ownerId: req.user.userId
    });

    if (!envelope) {
      return res.status(404).json({
        success: false,
        error: "Envelope nicht gefunden"
      });
    }

    // Only allow updating DRAFT envelopes
    if (envelope.status !== "DRAFT") {
      return res.status(400).json({
        success: false,
        error: "Nur DRAFT Envelopes können bearbeitet werden"
      });
    }

    // Validate field assignments (nur wenn Felder vorhanden)
    if (signatureFields.length > 0) {
      // Normalize all signer emails to lowercase for comparison
      const signerEmails = new Set(envelope.signers.map(s => s.email.toLowerCase().trim()));
      const invalidFields = signatureFields.filter(
        field => !signerEmails.has(field.assigneeEmail.toLowerCase().trim())
      );

      if (invalidFields.length > 0) {
        console.log("⚠️ Invalid field emails:", invalidFields.map(f => f.assigneeEmail));
        console.log("✅ Valid signer emails:", Array.from(signerEmails));
        return res.status(400).json({
          success: false,
          error: `Signaturfelder enthalten ungültige Unterzeichner-E-Mails: ${invalidFields.map(f => f.assigneeEmail).join(", ")}. Gültige Emails: ${Array.from(signerEmails).join(", ")}`
        });
      }
    }

    // Update signature fields
    envelope.signatureFields = signatureFields.map(field => ({
      ...field,
      assigneeEmail: field.assigneeEmail.toLowerCase().trim()
    }));

    // Add audit event
    envelope.audit.push({
      event: "FIELDS_UPDATED",
      timestamp: new Date(),
      userId: req.user.userId,
      email: req.user.email,
      ip: getClientIP(req),
      userAgent: req.headers['user-agent'] || 'unknown',
      details: {
        fieldsCount: signatureFields.length
      }
    });

    await envelope.save();

    console.log(`✅ Envelope updated successfully with ${signatureFields.length} fields`);

    res.json({
      success: true,
      message: "Envelope erfolgreich aktualisiert",
      envelope
    });
  } catch (error) {
    console.error("❌ Error updating envelope:", error);
    res.status(500).json({
      success: false,
      error: "Fehler beim Aktualisieren des Envelopes",
      message: error.message
    });
  }
});

module.exports = router;
