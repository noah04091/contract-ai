// 📁 backend/routes/envelopes.js - Digital Signature Envelope Routes
// 🔐 SECURITY: All /envelopes/* routes require Business+ subscription
const express = require("express");
const mongoose = require("mongoose");
const { ObjectId } = require("mongodb"); // 🆕 For user queries
const crypto = require("crypto");
const rateLimit = require("express-rate-limit");
const verifyToken = require("../middleware/verifyToken");
const requirePremium = require("../middleware/requirePremium"); // 🔐 Business+ Check
const idempotency = require("../middleware/idempotency"); // 🔒 Prevent duplicate requests
const sendEmail = require("../services/mailer");
const { sealPdf } = require("../services/pdfSealing"); // ✉️ PDF-Sealing Service
const { generateSignedUrl, deleteFiles } = require("../services/fileStorage"); // 🆕 For S3 download links + 🗑️ For deletion
const { generateEventsForEnvelope, markEnvelopeAsCompleted, deleteEnvelopeEvents } = require("../services/envelopeCalendarEvents"); // 📅 Calendar Integration
const { generateVoidNotificationHTML, generateVoidNotificationText, generateDeclineNotificationHTML, generateDeclineNotificationText, generateOtpEmailHTML, generateOtpEmailText } = require("../templates/signatureInvitationEmail"); // 📧 Void + Decline + OTP Notification
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

/**
 * Rate limiter for sending/reminding (prevents email abuse)
 * 10 sends per minute per user
 */
const emailSendLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // Max 10 email sends per minute
  message: { success: false, error: 'Zu viele E-Mail-Anfragen. Bitte warten Sie eine Minute.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Use user ID for authenticated endpoints
    return req.user?.userId ||
           req.headers['x-forwarded-for']?.split(',')[0] ||
           req.connection.remoteAddress ||
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
 * Hash OTP code with SHA-256
 */
function hashOtpCode(code) {
  return crypto.createHash('sha256').update(String(code)).digest('hex');
}

/**
 * Generate cryptographically secure 6-digit OTP code
 */
function generateOtpCode() {
  return crypto.randomInt(100000, 999999).toString();
}

// ===== OTP RATE LIMITERS =====

/**
 * Rate limiter for OTP sending (prevents email spam)
 * 3 sends per 15 minutes per IP
 */
const otpSendLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  message: { success: false, error: 'Zu viele Code-Anfragen. Bitte warten Sie 15 Minuten.' },
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

/**
 * Rate limiter for OTP verification (prevents brute-force)
 * 5 attempts per 15 minutes per IP
 */
const otpVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { success: false, error: 'Zu viele Verifizierungsversuche. Bitte warten Sie 15 Minuten.' },
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

/**
 * ✅ Sanitize error messages for client responses
 * Removes sensitive information like stack traces, file paths, database details
 */
function sanitizeErrorMessage(error) {
  const message = error?.message || String(error);

  // Patterns that indicate sensitive information
  const sensitivePatterns = [
    /at\s+\S+\s+\(\S+:\d+:\d+\)/gi,           // Stack trace lines
    /\/[\w\/\.\-]+\.(js|ts|json)/gi,           // File paths
    /mongodb(\+srv)?:\/\/[^\s]+/gi,            // MongoDB connection strings
    /aws[_-]?(access|secret|key)/gi,           // AWS credentials references
    /password\s*[=:]\s*\S+/gi,                 // Password values
    /token\s*[=:]\s*[a-f0-9]{32,}/gi,          // Token values
    /Bearer\s+[a-zA-Z0-9\-_.]+/gi,             // Bearer tokens
  ];

  let sanitized = message;
  for (const pattern of sensitivePatterns) {
    sanitized = sanitized.replace(pattern, '[REDACTED]');
  }

  // If the message is too long or looks like a stack trace, use generic message
  if (sanitized.length > 200 || sanitized.includes('[REDACTED]')) {
    return 'Ein interner Fehler ist aufgetreten';
  }

  return sanitized;
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
      case 'initial': // Backend model uses singular
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
      case 'location': // Ortsfeld wie Textfeld behandeln
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
        // Unbekannte Feldtypen als Text behandeln (statt Fehler)
        console.warn(`⚠️ Unbekannter Feldtyp: ${field.type} für Feld ${sig.fieldId} - wird als Text behandelt`);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Send signature invitation email (HTML + Plain Text)
 * @param {Object} signer - Signer object
 * @param {Object} envelope - Envelope object
 * @param {string} ownerEmail - Owner email
 * @param {boolean} isReminder - If true, use reminder templates
 */
async function sendSignatureInvitation(signer, envelope, ownerEmail, isReminder = false) {
  const signUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/sign/${signer.token}`;

  // Get signature fields for this signer
  const signerFields = envelope.signatureFields.filter(
    field => field.assigneeEmail.toLowerCase() === signer.email.toLowerCase()
  );

  // Import email templates
  const {
    generateSignatureInvitationHTML,
    generateSignatureInvitationText,
    generateSignatureReminderHTML,
    generateSignatureReminderText
  } = require('../templates/signatureInvitationEmail');

  // Prepare data for templates
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

  // Generate HTML and plain text versions (use reminder templates if isReminder)
  const htmlContent = isReminder
    ? generateSignatureReminderHTML(templateData)
    : generateSignatureInvitationHTML(templateData);
  const textContent = isReminder
    ? generateSignatureReminderText(templateData)
    : generateSignatureInvitationText(templateData);

  const subject = isReminder
    ? `Erinnerung: ${envelope.title} - Signatur ausstehend`
    : `${envelope.title} - Signaturanfrage`;

  try {
    await sendEmail(signer.email, subject, textContent, htmlContent);
    console.log(`✉️ ${isReminder ? 'Reminder' : 'Invitation'} sent to: ${signer.email} (${signerFields.length} fields)`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to send ${isReminder ? 'reminder' : 'invitation'} to ${signer.email}:`, error);
    return false;
  }
}

/**
 * Send completion notification to owner
 */
async function sendCompletionNotification(envelope, recipientEmail) {
  const subject = `${envelope.title} - Signatur abgeschlossen`;

  // 🆕 Generate direct download link for signed PDF (valid 24 hours)
  let downloadLink = (process.env.FRONTEND_URL || 'http://localhost:5173') + '/contracts';

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

  // 🆕 Import and use V4 email templates
  const {
    generateCompletionNotificationHTML,
    generateCompletionNotificationText
  } = require('../templates/signatureInvitationEmail');

  const templateData = {
    envelope: envelope,
    downloadLink: downloadLink
  };

  const htmlContent = generateCompletionNotificationHTML(templateData);
  const textContent = generateCompletionNotificationText(templateData);

  try {
    await sendEmail(recipientEmail, subject, textContent, htmlContent);
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
router.post("/envelopes", verifyToken, requirePremium, async (req, res) => {
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

    // ✅ Validate signer email format and name
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    for (let i = 0; i < signers.length; i++) {
      const signer = signers[i];
      if (!signer.email || !emailRegex.test(signer.email.trim())) {
        return res.status(400).json({
          success: false,
          message: `Ungültige E-Mail-Adresse für Unterzeichner ${i + 1}: "${signer.email || 'leer'}"`
        });
      }
      if (!signer.name || signer.name.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: `Name fehlt für Unterzeichner ${i + 1}`
        });
      }
    }

    // ✅ Check for duplicate emails among signers
    const signerEmails = signers.map(s => s.email.toLowerCase().trim());
    const uniqueEmails = new Set(signerEmails);
    if (uniqueEmails.size !== signerEmails.length) {
      return res.status(400).json({
        success: false,
        message: "Doppelte E-Mail-Adressen unter den Unterzeichnern gefunden"
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
      error: sanitizeErrorMessage(error)
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
router.get("/envelopes", verifyToken, requirePremium, async (req, res) => {
  try {
    const { status, archived, search, limit = 50, offset = 0, sort = 'newest' } = req.query;

    console.log(`📦 Loading envelopes for user: ${req.user.userId}`, { status, archived, search, sort });

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
    // ✅ Escape special regex characters to prevent ReDoS attacks
    if (search && search.trim()) {
      const escapedSearch = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const searchRegex = new RegExp(escapedSearch, 'i');
      query.$or = [
        { title: searchRegex },
        { 'signers.email': searchRegex },
        { 'signers.name': searchRegex }
      ];
    }

    // Determine sort order
    let sortOption = { createdAt: -1 }; // Default: newest first
    switch (sort) {
      case 'oldest':
        sortOption = { createdAt: 1 };
        break;
      case 'a-z':
        sortOption = { title: 1 };
        break;
      case 'z-a':
        sortOption = { title: -1 };
        break;
      case 'newest':
      default:
        sortOption = { createdAt: -1 };
        break;
    }

    const envelopes = await Envelope.find(query)
      .sort(sortOption)
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

    // Count voided (cancelled) envelopes for the "Storniert" tab
    const voidedCount = await Envelope.countDocuments({
      ownerId: req.user.userId,
      status: "VOIDED",
      archived: { $ne: true }
    });

    console.log(`✅ Loaded ${envelopes.length} envelopes (total: ${total}, archived: ${archivedCount}, voided: ${voidedCount})`);

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
        sentAt: env.sentAt, // 🆕 When envelope was sent
        expiresAt: env.expiresAt,
        completedAt: env.completedAt
      })),
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: parseInt(offset) + envelopes.length < total
      },
      archivedCount, // For showing/hiding archive tab
      voidedCount // For showing/hiding "Storniert" tab
    });

  } catch (error) {
    console.error("❌ Error loading envelopes:", error);
    res.status(500).json({
      success: false,
      message: "Fehler beim Laden der Envelopes",
      error: sanitizeErrorMessage(error)
    });
  }
});

/**
 * GET /api/envelopes/:id - Get single envelope details
 */
router.get("/envelopes/:id", verifyToken, requirePremium, async (req, res) => {
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
      error: sanitizeErrorMessage(error)
    });
  }
});

/**
 * POST /api/envelopes/:id/send - Send invitations to signers
 * 🔒 Idempotency protected to prevent duplicate emails on retries
 */
router.post("/envelopes/:id/send", verifyToken, requirePremium, emailSendLimiter, idempotency(), async (req, res) => {
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

    // 🆕 Set sentAt timestamp (only on first send)
    if (!envelope.sentAt) {
      envelope.sentAt = new Date();
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
      error: sanitizeErrorMessage(error)
    });
  }
});

/**
 * POST /api/envelopes/:id/remind - Remind ALL pending signers (no specific email needed)
 * 🔒 Idempotency protected to prevent duplicate reminder emails
 */
router.post("/envelopes/:id/remind", verifyToken, requirePremium, emailSendLimiter, idempotency(), async (req, res) => {
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

    // Allow reminders for SENT and AWAITING_SIGNER_* (Sequential mode)
    const isActiveEnvelope = envelope.status === 'SENT' || envelope.status.startsWith('AWAITING_SIGNER_');
    if (!isActiveEnvelope) {
      return res.status(400).json({
        success: false,
        message: "Erinnerungen können nur für aktive Envelopes verschickt werden"
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

    // 🔄 Refresh tokens for all pending signers (in case they expired)
    const newExpiresAt = new Date();
    newExpiresAt.setDate(newExpiresAt.getDate() + 7); // 7 days from now

    for (const signer of pendingSigners) {
      // Generate new token if expired or about to expire (< 1 day left)
      const tokenExpiresDate = new Date(signer.tokenExpires);
      const oneDayFromNow = new Date();
      oneDayFromNow.setDate(oneDayFromNow.getDate() + 1);

      if (tokenExpiresDate < oneDayFromNow) {
        signer.token = generateSignerToken();
        signer.tokenExpires = newExpiresAt;
        console.log(`🔄 Token refreshed for ${signer.email}`);
      }
    }

    // Save the updated tokens
    await envelope.save();

    // Send reminders to all pending signers (with fresh tokens) - use reminder templates
    const sendResults = await Promise.allSettled(
      pendingSigners.map(signer =>
        sendSignatureInvitation(signer, envelope, req.user.email, true)
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
      error: sanitizeErrorMessage(error)
    });
  }
});

/**
 * POST /api/envelopes/:id/resend - Resend invitation reminder to SPECIFIC signer
 * 🔒 Idempotency protected to prevent duplicate emails
 */
router.post("/envelopes/:id/resend", verifyToken, requirePremium, emailSendLimiter, idempotency(), async (req, res) => {
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

    // Allow reminders for SENT and AWAITING_SIGNER_* (Sequential mode)
    const isActiveEnvelope = envelope.status === 'SENT' || envelope.status.startsWith('AWAITING_SIGNER_');
    if (!isActiveEnvelope) {
      return res.status(400).json({
        success: false,
        message: "Erinnerungen können nur für aktive Envelopes verschickt werden"
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

    // 🔄 Refresh token if expired or about to expire (< 1 day left)
    const tokenExpiresDate = new Date(signer.tokenExpires);
    const oneDayFromNow = new Date();
    oneDayFromNow.setDate(oneDayFromNow.getDate() + 1);

    if (tokenExpiresDate < oneDayFromNow) {
      const newExpiresAt = new Date();
      newExpiresAt.setDate(newExpiresAt.getDate() + 7); // 7 days from now

      signer.token = generateSignerToken();
      signer.tokenExpires = newExpiresAt;
      await envelope.save();
      console.log(`🔄 Token refreshed for ${signer.email}`);
    }

    // Send reminder (with fresh token if refreshed) - use reminder templates
    const sent = await sendSignatureInvitation(signer, envelope, req.user.email, true);

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
      error: sanitizeErrorMessage(error)
    });
  }
});

/**
 * POST /api/envelopes/:id/seal - Manually seal PDF (COMPLETED envelopes only)
 */
router.post("/envelopes/:id/seal", verifyToken, requirePremium, async (req, res) => {
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
      error: sanitizeErrorMessage(error)
    });
  }
});

/**
 * PATCH /api/envelopes/:id/signer/:index - Update signer information
 * Only works for DRAFT envelopes (not yet sent)
 */
router.patch("/envelopes/:id/signer/:index", verifyToken, requirePremium, async (req, res) => {
  try {
    const { id, index } = req.params;
    const { email, name } = req.body;
    const signerIndex = parseInt(index, 10);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: "Ungültige Envelope-ID"
      });
    }

    if (isNaN(signerIndex) || signerIndex < 0) {
      return res.status(400).json({
        success: false,
        error: "Ungültiger Signer-Index"
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

    // Only allow updates for DRAFT envelopes
    if (envelope.status !== 'DRAFT') {
      return res.status(400).json({
        success: false,
        error: "Unterzeichner können nur im Entwurfsstatus geändert werden"
      });
    }

    // Check if signer exists
    if (signerIndex >= envelope.signers.length) {
      return res.status(404).json({
        success: false,
        error: "Unterzeichner nicht gefunden"
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (email && !emailRegex.test(email.trim())) {
      return res.status(400).json({
        success: false,
        error: "Ungültige E-Mail-Adresse"
      });
    }

    // Check for duplicate email
    const normalizedEmail = email?.toLowerCase().trim();
    if (normalizedEmail) {
      const isDuplicate = envelope.signers.some((s, idx) =>
        idx !== signerIndex && s.email.toLowerCase() === normalizedEmail
      );
      if (isDuplicate) {
        return res.status(400).json({
          success: false,
          error: "Diese E-Mail-Adresse wird bereits von einem anderen Unterzeichner verwendet"
        });
      }
    }

    // Update signer
    if (email) {
      envelope.signers[signerIndex].email = normalizedEmail;
    }
    if (name) {
      envelope.signers[signerIndex].name = name.trim();
    }

    // Also update signature fields if email changed
    if (email) {
      const oldEmail = envelope.signers[signerIndex].email;
      envelope.signatureFields.forEach(field => {
        if (field.assigneeEmail.toLowerCase() === oldEmail) {
          field.assigneeEmail = normalizedEmail;
        }
      });
    }

    envelope.updatedAt = new Date();
    await envelope.save();

    console.log(`✅ Signer ${signerIndex} updated in envelope ${id}`);

    res.json({
      success: true,
      message: "Unterzeichner aktualisiert",
      signer: envelope.signers[signerIndex]
    });

  } catch (error) {
    console.error("❌ Error updating signer:", error);
    res.status(500).json({
      success: false,
      error: "Fehler beim Aktualisieren des Unterzeichners"
    });
  }
});

/**
 * PATCH /api/envelopes/:id/note - Update internal note
 */
router.patch("/envelopes/:id/note", verifyToken, requirePremium, async (req, res) => {
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
      error: sanitizeErrorMessage(error)
    });
  }
});

/**
 * POST /api/envelopes/:id/void - Cancel/void envelope
 */
router.post("/envelopes/:id/void", verifyToken, requirePremium, async (req, res) => {
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

    console.log(`🚫 Voiding envelope: ${envelope.title} (previous status: ${envelope.status})`);

    // Speichere vorherigen Status für Wiederherstellen-Funktion
    envelope.previousStatus = envelope.status;
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

    // 💾 Speichern
    await envelope.save();

    // 📅 KILLER FEATURE: Delete calendar events when envelope is voided
    try {
      await deleteEnvelopeEvents(req.db, envelope._id);
      console.log(`📅 Calendar events deleted for voided envelope`);
    } catch (calendarError) {
      console.error('⚠️ Could not delete calendar events:', calendarError.message);
      // Don't block voiding if calendar deletion fails
    }

    // 📧 Benachrichtige alle Unterzeichner per E-Mail
    const signersWithEmail = envelope.signers.filter(s => s.email);
    let emailsSent = 0;

    for (const signer of signersWithEmail) {
      try {
        const htmlContent = generateVoidNotificationHTML({
          signer,
          envelope: { title: envelope.title },
          ownerEmail: req.user.email,
          voidReason: envelope.voidReason,
          voidedAt: envelope.voidedAt
        });

        const textContent = generateVoidNotificationText({
          signer,
          envelope: { title: envelope.title },
          ownerEmail: req.user.email,
          voidReason: envelope.voidReason,
          voidedAt: envelope.voidedAt
        });

        await sendEmail(
          signer.email,
          `Signaturanfrage storniert: ${envelope.title}`,
          textContent,
          htmlContent
        );

        emailsSent++;
        console.log(`📧 Void notification sent to: ${signer.email}`);
      } catch (emailError) {
        console.error(`⚠️ Could not send void notification to ${signer.email}:`, emailError.message);
        // Don't block voiding if email fails
      }
    }

    console.log(`✅ Envelope voided: ${envelope._id} (${emailsSent}/${signersWithEmail.length} notifications sent)`);

    res.json({
      success: true,
      message: "Envelope erfolgreich storniert",
      envelope: {
        _id: envelope._id,
        status: envelope.status,
        voidedAt: envelope.voidedAt
      },
      notificationsSent: emailsSent
    });

  } catch (error) {
    console.error("❌ Error voiding envelope:", error);
    res.status(500).json({
      success: false,
      message: "Fehler beim Stornieren des Envelopes",
      error: sanitizeErrorMessage(error)
    });
  }
});

/**
 * POST /api/envelopes/:id/restore - Restore voided envelope
 * Stellt eine stornierte Signaturanfrage wieder her
 */
router.post("/envelopes/:id/restore", verifyToken, requirePremium, async (req, res) => {
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

    // Nur VOIDED Envelopes können wiederhergestellt werden
    if (envelope.status !== 'VOIDED') {
      return res.status(400).json({
        success: false,
        message: `Nur stornierte Envelopes können wiederhergestellt werden (aktueller Status: ${envelope.status})`
      });
    }

    console.log(`🔄 Restoring envelope: ${envelope.title}`);

    // Stelle vorherigen Status wieder her oder setze auf DRAFT
    const restoreToStatus = envelope.previousStatus || 'DRAFT';

    // Wenn der vorherige Status SENT oder AWAITING_SIGNER_X war, setze auf DRAFT (Tokens könnten abgelaufen sein)
    // User kann dann erneut versenden
    const isActiveStatus = restoreToStatus === 'SENT' || restoreToStatus.startsWith('AWAITING_SIGNER_');
    const safeRestoreStatus = isActiveStatus ? 'DRAFT' : restoreToStatus;

    envelope.status = safeRestoreStatus === 'DRAFT' ? 'DRAFT' : restoreToStatus;
    envelope.voidedAt = null;
    envelope.voidReason = null;
    envelope.previousStatus = null;

    await envelope.addAuditEvent('RESTORED', {
      userId: req.user.userId,
      email: req.user.email,
      ip: getClientIP(req),
      userAgent: req.headers['user-agent'],
      details: { restoredTo: envelope.status }
    });

    await envelope.save();

    console.log(`✅ Envelope restored to status: ${envelope.status}`);

    res.json({
      success: true,
      message: `Envelope wiederhergestellt (Status: ${envelope.status === 'DRAFT' ? 'Entwurf' : envelope.status})`,
      envelope: {
        _id: envelope._id,
        status: envelope.status,
        title: envelope.title
      }
    });

  } catch (error) {
    console.error("❌ Error restoring envelope:", error);
    res.status(500).json({
      success: false,
      message: "Fehler beim Wiederherstellen des Envelopes",
      error: sanitizeErrorMessage(error)
    });
  }
});

/**
 * POST /api/envelopes/archive - Archive multiple envelopes (bulk)
 */
router.post("/envelopes/archive", verifyToken, requirePremium, async (req, res) => {
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
      error: sanitizeErrorMessage(error)
    });
  }
});

/**
 * POST /api/envelopes/unarchive - Unarchive multiple envelopes (bulk)
 */
router.post("/envelopes/unarchive", verifyToken, requirePremium, async (req, res) => {
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
      error: sanitizeErrorMessage(error)
    });
  }
});

/**
 * DELETE /api/envelopes/bulk - Permanently delete multiple envelopes
 * Safety: Only archived OR voided envelopes can be deleted
 * 🗑️ Includes S3 file cleanup
 */
router.delete("/envelopes/bulk", verifyToken, requirePremium, async (req, res) => {
  try {
    const { envelopeIds } = req.body;

    if (!envelopeIds || !Array.isArray(envelopeIds) || envelopeIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Keine Envelope-IDs angegeben"
      });
    }

    console.log(`🗑️ Deleting ${envelopeIds.length} envelopes for user: ${req.user.userId}`);

    // 🛡️ Prüfe ob COMPLETED Envelopes dabei sind (diese sind geschützt!)
    const completedEnvelopes = await Envelope.find({
      _id: { $in: envelopeIds },
      ownerId: req.user.userId,
      status: "COMPLETED"
    }).select("title");

    if (completedEnvelopes.length > 0) {
      const titles = completedEnvelopes.map(e => e.title).join(", ");
      console.log(`🛡️ ${completedEnvelopes.length} COMPLETED envelope(s) protected from deletion: ${titles}`);

      // Wenn NUR COMPLETED Envelopes angefragt wurden, blockieren
      if (completedEnvelopes.length === envelopeIds.length) {
        return res.status(403).json({
          success: false,
          message: "Abgeschlossene Signaturen können nicht gelöscht werden. Diese Dokumente sind rechtlich bindend.",
          protectedCount: completedEnvelopes.length
        });
      }
    }

    // 1️⃣ Erst die Envelopes finden um S3-Keys zu sammeln (nur archived oder voided)
    const envelopesToDelete = await Envelope.find({
      _id: { $in: envelopeIds },
      ownerId: req.user.userId,
      $or: [
        { archived: true },
        { status: "VOIDED" }
      ]
    }).select("s3Key s3KeySealed title");

    if (envelopesToDelete.length === 0) {
      // Prüfe ob es an geschützten COMPLETED Envelopes liegt
      if (completedEnvelopes.length > 0) {
        return res.status(403).json({
          success: false,
          message: "Abgeschlossene Signaturen können nicht gelöscht werden. Diese Dokumente sind rechtlich bindend.",
          protectedCount: completedEnvelopes.length
        });
      }
      return res.json({
        success: true,
        message: "Keine löschbaren Envelopes gefunden",
        deletedCount: 0
      });
    }

    // 2️⃣ S3-Keys sammeln
    const s3KeysToDelete = [];
    for (const env of envelopesToDelete) {
      if (env.s3Key) s3KeysToDelete.push(env.s3Key);
      if (env.s3KeySealed) s3KeysToDelete.push(env.s3KeySealed);
    }

    console.log(`📦 ${s3KeysToDelete.length} S3-Dateien zu löschen für ${envelopesToDelete.length} Envelope(s)`);

    // 3️⃣ S3-Dateien löschen (vor DB-Löschung, falls S3 fehlschlägt)
    let s3Result = { deleted: 0, failed: 0 };
    if (s3KeysToDelete.length > 0) {
      s3Result = await deleteFiles(s3KeysToDelete);
      console.log(`📦 S3-Löschung: ${s3Result.deleted} gelöscht, ${s3Result.failed} fehlgeschlagen`);
    }

    // 4️⃣ Aus der Datenbank löschen
    const envelopeIdsToDelete = envelopesToDelete.map(e => e._id);
    const result = await Envelope.deleteMany({
      _id: { $in: envelopeIdsToDelete }
    });

    console.log(`✅ Deleted ${result.deletedCount} envelopes + ${s3Result.deleted} S3 files`);

    // Response mit Info über geschützte Envelopes
    const response = {
      success: true,
      message: `${result.deletedCount} Envelope(s) endgültig gelöscht`,
      deletedCount: result.deletedCount,
      s3FilesDeleted: s3Result.deleted,
      s3FilesFailed: s3Result.failed
    };

    // 🛡️ Wenn COMPLETED Envelopes übersprungen wurden, informieren
    if (completedEnvelopes.length > 0) {
      response.protectedCount = completedEnvelopes.length;
      response.protectedMessage = `${completedEnvelopes.length} abgeschlossene Signatur(en) wurden geschützt und nicht gelöscht.`;
    }

    res.json(response);

  } catch (error) {
    console.error("❌ Error deleting envelopes:", error);
    res.status(500).json({
      success: false,
      message: "Fehler beim Löschen",
      error: sanitizeErrorMessage(error)
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

    // 🔄 SEQUENTIAL SIGNING: Check if it's this signer's turn
    let waitingForSigners = null;
    if (envelope.signingMode === 'SEQUENTIAL') {
      const sortedSigners = [...envelope.signers].sort((a, b) => a.order - b.order);
      const previousUnsignedSigners = sortedSigners.filter(
        s => s.order < signer.order && s.status !== 'SIGNED'
      );

      if (previousUnsignedSigners.length > 0) {
        waitingForSigners = previousUnsignedSigners.map(s => ({
          name: s.name,
          order: s.order
        }));
        console.log(`⏳ Sequential mode: ${signer.email} must wait for ${waitingForSigners.length} signer(s)`);
      }
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

    // Get signature fields for this signer (case-insensitive email comparison)
    const myFields = envelope.signatureFields.filter(
      field => field.assigneeEmail.toLowerCase() === signer.email.toLowerCase()
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
        expiresAt: envelope.expiresAt,
        signingMode: envelope.signingMode // 🔄 Sequential or Parallel
      },
      signer: {
        name: signer.name,
        email: signer.email,
        role: signer.role,
        order: signer.order // 🔄 Signer order for sequential mode
      },
      signatureFields: myFields,
      // 🔄 SEQUENTIAL: If waiting for other signers
      waitingForSigners: waitingForSigners,
      // 🔐 OTP: Whether OTP verification is required
      otpRequired: signer.authMethod === 'OTP',
      otpVerified: signer.otpVerified || false
    });

  } catch (error) {
    console.error("❌ Error loading signature session:", error);
    res.status(500).json({
      success: false,
      message: "Fehler beim Laden der Signature-Sitzung",
      error: sanitizeErrorMessage(error)
    });
  }
});

/**
 * POST /api/sign/:token/send-otp - Send OTP code to signer's email (public)
 */
router.post("/sign/:token/send-otp", otpSendLimiter, async (req, res) => {
  try {
    const { token } = req.params;

    // Find envelope by signer token
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

    // Already verified? Return success
    if (signer.otpVerified) {
      return res.status(200).json({
        success: true,
        message: "Bereits verifiziert"
      });
    }

    // 60s cooldown between sends
    if (signer.otpLastSentAt) {
      const secondsSinceLastSend = (Date.now() - new Date(signer.otpLastSentAt).getTime()) / 1000;
      if (secondsSinceLastSend < 60) {
        const waitSeconds = Math.ceil(60 - secondsSinceLastSend);
        return res.status(429).json({
          success: false,
          message: `Bitte warten Sie ${waitSeconds} Sekunden, bevor Sie einen neuen Code anfordern.`,
          retryAfter: waitSeconds
        });
      }
    }

    // Generate 6-digit code
    const code = generateOtpCode();
    const hashedCode = hashOtpCode(code);

    // Generate email FIRST, then send, then persist to DB
    const signerIndex = envelope.signers.findIndex(s => s.token === token);

    const emailHTML = generateOtpEmailHTML({
      code,
      signer: { name: signer.name, email: signer.email },
      envelope: { title: envelope.title },
      expiresMinutes: 10
    });

    const emailText = generateOtpEmailText({
      code,
      signer: { name: signer.name, email: signer.email },
      envelope: { title: envelope.title },
      expiresMinutes: 10
    });

    // Send email first — only persist to DB if email was sent successfully
    await sendEmail(
      signer.email,
      `Ihr Verifizierungscode - ${envelope.title}`,
      emailText,
      emailHTML
    );

    // Email sent successfully → now persist code + cooldown to DB
    await Envelope.updateOne(
      { _id: envelope._id },
      {
        $set: {
          [`signers.${signerIndex}.otpCode`]: hashedCode,
          [`signers.${signerIndex}.otpExpires`]: new Date(Date.now() + 10 * 60 * 1000), // 10 min
          [`signers.${signerIndex}.otpAttempts`]: 0,
          [`signers.${signerIndex}.otpLastSentAt`]: new Date()
        },
        $push: {
          audit: {
            event: 'OTP_SENT',
            timestamp: new Date(),
            email: signer.email,
            ip: getClientIP(req),
            userAgent: req.headers['user-agent'] || 'unknown',
            details: {}
          }
        }
      }
    );

    console.log(`🔐 OTP sent to ${signer.email} for envelope ${envelope._id}`);

    res.json({
      success: true,
      message: "Verifizierungscode wurde gesendet"
    });

  } catch (error) {
    console.error("❌ Error sending OTP:", error);
    res.status(500).json({
      success: false,
      message: "Fehler beim Senden des Verifizierungscodes"
    });
  }
});

/**
 * POST /api/sign/:token/verify-otp - Verify OTP code (public)
 */
router.post("/sign/:token/verify-otp", otpVerifyLimiter, async (req, res) => {
  try {
    const { token } = req.params;
    const { code } = req.body;

    // Validate input: exactly 6 digits
    if (!code || !/^\d{6}$/.test(String(code))) {
      return res.status(400).json({
        success: false,
        message: "Bitte geben Sie einen gültigen 6-stelligen Code ein."
      });
    }

    // Find envelope by signer token
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

    // Already verified?
    if (signer.otpVerified) {
      return res.status(200).json({
        success: true,
        message: "Bereits verifiziert"
      });
    }

    // Check if code was ever sent
    if (!signer.otpCode || !signer.otpExpires) {
      return res.status(400).json({
        success: false,
        message: "Bitte fordern Sie zuerst einen Verifizierungscode an."
      });
    }

    // Max 3 attempts per code
    if (signer.otpAttempts >= 3) {
      return res.status(429).json({
        success: false,
        message: "Zu viele Fehlversuche. Bitte fordern Sie einen neuen Code an.",
        maxAttemptsReached: true
      });
    }

    // Check code expiration (10 min)
    if (new Date() > new Date(signer.otpExpires)) {
      return res.status(410).json({
        success: false,
        message: "Der Code ist abgelaufen. Bitte fordern Sie einen neuen Code an.",
        codeExpired: true
      });
    }

    // Compare hashes
    const inputHash = hashOtpCode(code);
    const signerIndex = envelope.signers.findIndex(s => s.token === token);

    if (inputHash !== signer.otpCode) {
      // Increment attempts
      await Envelope.updateOne(
        { _id: envelope._id },
        {
          $inc: { [`signers.${signerIndex}.otpAttempts`]: 1 },
          $push: {
            audit: {
              event: 'OTP_FAILED',
              timestamp: new Date(),
              email: signer.email,
              ip: getClientIP(req),
              userAgent: req.headers['user-agent'] || 'unknown',
              details: { attempt: signer.otpAttempts + 1 }
            }
          }
        }
      );

      const remainingAttempts = 2 - signer.otpAttempts; // 3 max, 0-indexed
      console.log(`❌ OTP failed for ${signer.email}, attempt ${signer.otpAttempts + 1}/3`);

      return res.status(401).json({
        success: false,
        message: remainingAttempts > 0
          ? `Falscher Code. Noch ${remainingAttempts} ${remainingAttempts === 1 ? 'Versuch' : 'Versuche'} übrig.`
          : "Zu viele Fehlversuche. Bitte fordern Sie einen neuen Code an.",
        maxAttemptsReached: remainingAttempts <= 0
      });
    }

    // Success! Set verified and clear code
    await Envelope.updateOne(
      { _id: envelope._id },
      {
        $set: {
          [`signers.${signerIndex}.otpVerified`]: true,
          [`signers.${signerIndex}.otpVerifiedAt`]: new Date(),
          [`signers.${signerIndex}.otpVerifiedIp`]: getClientIP(req),
          [`signers.${signerIndex}.otpCode`]: null,
          [`signers.${signerIndex}.otpExpires`]: null,
          [`signers.${signerIndex}.otpAttempts`]: 0
        },
        $push: {
          audit: {
            event: 'OTP_VERIFIED',
            timestamp: new Date(),
            email: signer.email,
            ip: getClientIP(req),
            userAgent: req.headers['user-agent'] || 'unknown',
            details: {}
          }
        }
      }
    );

    console.log(`✅ OTP verified for ${signer.email} on envelope ${envelope._id}`);

    res.json({
      success: true,
      message: "Identität erfolgreich bestätigt"
    });

  } catch (error) {
    console.error("❌ Error verifying OTP:", error);
    res.status(500).json({
      success: false,
      message: "Fehler bei der Verifizierung"
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

    // Find envelope (let: wird nach atomicResult re-assigned)
    let envelope = await Envelope.findBySignerToken(token);

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

    // 🔐 OTP SECURITY GATE: Verify OTP before allowing signature
    if (signer.authMethod === 'OTP' && !signer.otpVerified) {
      return res.status(403).json({
        success: false,
        message: "E-Mail-Verifizierung erforderlich. Bitte bestätigen Sie zuerst Ihre Identität mit dem Code."
      });
    }

    // Check envelope status
    if (envelope.status === 'VOIDED' || envelope.status === 'COMPLETED') {
      return res.status(400).json({
        success: false,
        message: "Signatur kann nicht mehr hinzugefügt werden"
      });
    }

    // 🔄 SEQUENTIAL SIGNING: Check if it's this signer's turn
    // ✅ FIX TOCTOU: Re-fetch envelope to ensure we have the latest signer states
    if (envelope.signingMode === 'SEQUENTIAL') {
      // Re-fetch envelope to get latest signer states (prevents race condition)
      const freshEnvelope = await Envelope.findById(envelope._id).lean();
      if (!freshEnvelope) {
        return res.status(404).json({
          success: false,
          message: "Envelope nicht mehr gefunden"
        });
      }

      // Sort signers by order
      const sortedSigners = [...freshEnvelope.signers].sort((a, b) => a.order - b.order);

      // Find all signers with lower order that haven't signed yet
      const previousUnsignedSigners = sortedSigners.filter(
        s => s.order < signer.order && s.status !== 'SIGNED'
      );

      if (previousUnsignedSigners.length > 0) {
        const waitingFor = previousUnsignedSigners.map(s => s.name).join(', ');
        console.log(`⏳ Sequential mode: ${signer.email} must wait for: ${waitingFor}`);

        return res.status(403).json({
          success: false,
          message: `Sie sind noch nicht an der Reihe. Bitte warten Sie bis ${waitingFor} unterschrieben hat.`,
          waitingFor: previousUnsignedSigners.map(s => ({
            name: s.name,
            email: s.email,
            order: s.order
          }))
        });
      }
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
      if (field && (field.type === 'signature' || field.type === 'initials' || field.type === 'initial')) {
        const validation = validateSignature(sig.value);
        if (!validation.valid) {
          return res.status(400).json({
            success: false,
            message: validation.error
          });
        }
      }
    }

    // ✅ ATOMIC UPDATE: Update signature fields and signer status in one operation
    // This prevents race conditions when multiple signers submit simultaneously
    const now = new Date();
    const signerEmail = signer.email.toLowerCase();

    // Build atomic update operations for signature fields
    const fieldUpdates = {};
    let updatedCount = 0;

    for (const sig of signatures) {
      const fieldIndex = envelope.signatureFields.findIndex(
        f => f._id.toString() === sig.fieldId && f.assigneeEmail.toLowerCase() === signerEmail
      );
      if (fieldIndex !== -1) {
        fieldUpdates[`signatureFields.${fieldIndex}.value`] = sig.value;
        fieldUpdates[`signatureFields.${fieldIndex}.signedAt`] = now;
        updatedCount++;
      }
    }

    if (updatedCount === 0) {
      return res.status(400).json({
        success: false,
        message: "Keine gültigen Signaturfelder gefunden"
      });
    }

    // Find the signer index for atomic update
    const signerIndex = envelope.signers.findIndex(s => s.token === token);
    if (signerIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Unterzeichner nicht gefunden"
      });
    }

    // ✅ ATOMIC UPDATE: Update signer status and fields in single operation
    // Uses arrayFilters for precise targeting, prevents race conditions
    // ✅ FIX: For sequential mode, add additional query condition using $expr
    const queryConditions = {
      _id: envelope._id,
      'signers.token': token,
      'signers.status': 'PENDING' // Only update if still PENDING (idempotency check)
    };

    // ✅ SEQUENTIAL MODE: Add atomic check that all lower-order signers are SIGNED
    if (envelope.signingMode === 'SEQUENTIAL' && signer.order > 1) {
      queryConditions.$expr = {
        $eq: [
          // Count of signers with lower order that are NOT signed
          {
            $size: {
              $filter: {
                input: '$signers',
                as: 's',
                cond: {
                  $and: [
                    { $lt: ['$$s.order', signer.order] },
                    { $ne: ['$$s.status', 'SIGNED'] }
                  ]
                }
              }
            }
          },
          0 // Must be zero (all lower-order signers must be signed)
        ]
      };
    }

    const atomicResult = await Envelope.findOneAndUpdate(
      queryConditions,
      {
        $set: {
          ...fieldUpdates,
          [`signers.${signerIndex}.status`]: 'SIGNED',
          [`signers.${signerIndex}.signedAt`]: now,
          [`signers.${signerIndex}.ip`]: getClientIP(req),
          [`signers.${signerIndex}.userAgent`]: req.headers['user-agent'] || 'unknown',
          [`signers.${signerIndex}.tokenInvalidated`]: true,
          updatedAt: now
        }
      },
      { new: true }
    );

    // If no document was updated, it means either already signed or race condition
    if (!atomicResult) {
      // Re-check if already signed (idempotent case)
      const freshEnvelope = await Envelope.findById(envelope._id);
      const freshSigner = freshEnvelope?.signers.find(s => s.token === token);

      if (freshSigner?.status === 'SIGNED') {
        console.log(`⚠️ Race condition detected - already signed by ${signer.email}`);

        // Return idempotent success response
        let sealedPdfUrl = null;
        if (freshEnvelope.s3KeySealed) {
          try {
            const { generateSignedUrl } = require("../services/fileStorage");
            sealedPdfUrl = await generateSignedUrl(freshEnvelope.s3KeySealed);
          } catch (error) {
            console.error(`❌ Failed to generate sealed PDF URL:`, error);
          }
        }

        return res.status(200).json({
          success: true,
          message: "Bereits signiert",
          envelope: {
            _id: freshEnvelope._id,
            status: freshEnvelope.status,
            allSigned: freshEnvelope.allSigned(),
            completedAt: freshEnvelope.completedAt,
            sealedPdfUrl
          }
        });
      }

      return res.status(409).json({
        success: false,
        message: "Konflikt beim Speichern - bitte erneut versuchen"
      });
    }

    // Use the atomically updated envelope for subsequent operations
    envelope = atomicResult;
    // Re-get the signer reference from updated envelope
    const updatedSigner = envelope.signers[signerIndex];

    console.log(`🔐 Token invalidated for: ${updatedSigner.email} (atomic update)`);

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
      email: updatedSigner.email,
      ip: updatedSigner.ip,
      userAgent: updatedSigner.userAgent,
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
    let sealingFailed = false;
    let sealingError = null;
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
      sealingFailed = true;
      sealingError = sealError.message;
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

      // 📧 Send completion notification to owner + all signers
      try {
        console.log('📧 Sending completion notifications...');

        // 1. Owner notification (most important!)
        try {
          const ownerIdStr = envelope.ownerId?.toString() || envelope.ownerId;
          const owner = await req.db.collection("users").findOne({
            _id: new ObjectId(ownerIdStr)
          });

          if (owner && owner.email) {
            await sendCompletionNotification(envelope, owner.email);
            console.log(`✅ Completion email sent to owner: ${owner.email}`);
          } else {
            console.error(`⚠️ Owner not found for completion notification, ownerId: ${ownerIdStr}`);
          }
        } catch (ownerEmailError) {
          console.error(`❌ Failed to send completion email to owner:`, ownerEmailError.message);
        }

        // 2. All signers (skip if signer email = owner email to avoid duplicate)
        const ownerIdStr = envelope.ownerId?.toString() || envelope.ownerId;
        const ownerDoc = await req.db.collection("users").findOne({ _id: new ObjectId(ownerIdStr) });
        const ownerEmail = ownerDoc?.email?.toLowerCase();

        for (const envSigner of envelope.signers) {
          // Skip if signer is the owner (already notified above)
          if (ownerEmail && envSigner.email.toLowerCase() === ownerEmail) {
            console.log(`⏭️ Skipping signer ${envSigner.email} (is owner, already notified)`);
            continue;
          }
          try {
            await sendCompletionNotification(envelope, envSigner.email);
            console.log(`✅ Completion email sent to signer: ${envSigner.email}`);
          } catch (emailError) {
            console.error(`❌ Failed to send completion email to ${envSigner.email}:`, emailError.message);
          }
        }
      } catch (notificationError) {
        console.error("⚠️ Could not send completion notifications:", notificationError.message);
      }
    }

    console.log(`✅ Signature submitted successfully by: ${updatedSigner.email}`);

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
      if (updatedSigner.role !== 'sender') {
        details = "Der Vertragsinhaber wurde benachrichtigt.";
      }
    } else {
      // More signatures pending
      if (envelope.signingMode === 'SEQUENTIAL') {
        message = "✅ Signatur erfolgreich übermittelt!";
        details = "Der nächste Unterzeichner wurde benachrichtigt.";
      } else {
        message = "✅ Signatur erfolgreich übermittelt!";
        details = updatedSigner.role === 'sender'
          ? "Alle Empfänger wurden benachrichtigt."
          : "Der Vertragsinhaber wurde benachrichtigt.";
      }
    }

    res.json({
      success: true,
      message,
      details, // 🆕 Additional context-aware info
      sealingFailed, // 🆕 Flag if PDF sealing failed
      sealingError: sealingFailed ? sealingError : null, // 🆕 Error message if sealing failed
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
      error: sanitizeErrorMessage(error)
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

    // Update envelope status (handles AWAITING_SIGNER_1, _2, _3, etc.)
    if (envelope.status === 'SENT' || envelope.status.startsWith('AWAITING_SIGNER_')) {
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

    // 📧 Send decline notification to document owner
    try {
      // 🔧 FIX: Properly convert ownerId to ObjectId (handle both string and ObjectId)
      const ownerIdStr = envelope.ownerId?.toString() || envelope.ownerId;
      console.log(`📧 Looking up owner for decline notification: ${ownerIdStr}`);

      const owner = await req.db.collection("users").findOne({
        _id: new ObjectId(ownerIdStr)
      });

      console.log(`📧 Owner lookup result: ${owner ? owner.email : 'NOT FOUND'}`);

      if (owner && owner.email) {
        const declineNotificationData = {
          signer: {
            name: signer.name,
            email: signer.email
          },
          envelope: {
            title: envelope.title,
            signers: envelope.signers
          },
          ownerEmail: owner.email,
          declineReason: reason || null,
          declinedAt: now
        };

        await sendEmail(
          owner.email,
          `Signatur abgelehnt: ${envelope.title}`,
          generateDeclineNotificationText(declineNotificationData),
          generateDeclineNotificationHTML(declineNotificationData)
        );

        console.log(`📧 Decline notification sent to owner: ${owner.email}`);
      } else {
        console.error(`⚠️ Owner not found for envelope ${envelope._id}, ownerId: ${ownerIdStr}`);
      }
    } catch (emailError) {
      console.error('⚠️ Could not send decline notification email:', emailError.message);
      console.error('⚠️ Email error stack:', emailError.stack);
      // Don't fail the decline operation if email fails
    }

    // 📅 Delete calendar events since envelope is declined
    try {
      await deleteEnvelopeEvents(req.db, envelope._id);
      console.log(`📅 Calendar events deleted for declined envelope`);
    } catch (calendarError) {
      console.error('⚠️ Could not delete calendar events:', calendarError.message);
    }

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
      error: sanitizeErrorMessage(error)
    });
  }
});

// ===================================================
// UPDATE ENVELOPE (Signature Fields)
// PUT /api/envelopes/:id
// ===================================================
router.put("/envelopes/:id", verifyToken, requirePremium, async (req, res) => {
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
