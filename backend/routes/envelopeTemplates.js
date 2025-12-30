// 📋 Envelope Templates API Routes
const express = require("express");
const verifyToken = require("../middleware/verifyToken");
const EnvelopeTemplate = require("../models/EnvelopeTemplate");
const Envelope = require("../models/Envelope");

const router = express.Router();

// ===== GET /api/envelope-templates - List all templates =====
router.get("/envelope-templates", verifyToken, async (req, res) => {
  try {
    const { includeArchived } = req.query;

    const templates = await EnvelopeTemplate.findByOwner(
      req.user.userId,
      includeArchived === "true"
    );

    res.json({
      success: true,
      templates: templates.map(t => ({
        _id: t._id,
        name: t.name,
        description: t.description,
        signerCount: t.signerRoles.length,
        fieldCount: t.fields.length,
        signingMode: t.signingMode,
        usageCount: t.usageCount,
        lastUsedAt: t.lastUsedAt,
        createdAt: t.createdAt,
        isArchived: t.isArchived
      }))
    });
  } catch (error) {
    console.error("Error fetching templates:", error);
    res.status(500).json({
      success: false,
      error: "Fehler beim Laden der Vorlagen"
    });
  }
});

// ===== GET /api/envelope-templates/:id - Get single template =====
router.get("/envelope-templates/:id", verifyToken, async (req, res) => {
  try {
    const template = await EnvelopeTemplate.findOne({
      _id: req.params.id,
      ownerId: req.user.userId
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        error: "Vorlage nicht gefunden"
      });
    }

    res.json({
      success: true,
      template
    });
  } catch (error) {
    console.error("Error fetching template:", error);
    res.status(500).json({
      success: false,
      error: "Fehler beim Laden der Vorlage"
    });
  }
});

// ===== POST /api/envelope-templates - Create new template =====
router.post("/envelope-templates", verifyToken, async (req, res) => {
  try {
    const {
      name,
      description,
      signerRoles,
      fields,
      signingMode,
      defaultMessage
    } = req.body;

    // Validation
    if (!name || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: "Name ist erforderlich"
      });
    }

    if (!signerRoles || !Array.isArray(signerRoles) || signerRoles.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Mindestens eine Signer-Rolle ist erforderlich"
      });
    }

    if (!fields || !Array.isArray(fields) || fields.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Mindestens ein Feld ist erforderlich"
      });
    }

    // Validate that all fields have valid signerIndex
    const maxSignerIndex = signerRoles.length - 1;
    const invalidFields = fields.filter(f => f.signerIndex > maxSignerIndex);
    if (invalidFields.length > 0) {
      return res.status(400).json({
        success: false,
        error: "Einige Felder haben ungültige Signer-Indizes"
      });
    }

    const template = new EnvelopeTemplate({
      ownerId: req.user.userId,
      name: name.trim(),
      description: description?.trim() || "",
      signerRoles,
      fields,
      signingMode: signingMode || "PARALLEL",
      defaultMessage: defaultMessage?.trim() || ""
    });

    await template.save();

    console.log(`✅ Template created: ${template._id} by user ${req.user.userId}`);

    res.status(201).json({
      success: true,
      message: "Vorlage erfolgreich erstellt",
      template: {
        _id: template._id,
        name: template.name
      }
    });
  } catch (error) {
    console.error("Error creating template:", error);
    res.status(500).json({
      success: false,
      error: "Fehler beim Erstellen der Vorlage"
    });
  }
});

// ===== POST /api/envelope-templates/from-envelope/:envelopeId - Create template from existing envelope =====
router.post("/envelope-templates/from-envelope/:envelopeId", verifyToken, async (req, res) => {
  try {
    const { name, description } = req.body;
    const { envelopeId } = req.params;

    // Find the envelope
    const envelope = await Envelope.findOne({
      _id: envelopeId,
      ownerId: req.user.userId
    });

    if (!envelope) {
      return res.status(404).json({
        success: false,
        error: "Envelope nicht gefunden"
      });
    }

    // Validation
    if (!name || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: "Name ist erforderlich"
      });
    }

    // Create signer roles from envelope signers
    const signerRoles = envelope.signers.map((signer, index) => ({
      roleName: signer.role === "sender" ? "Auftraggeber" : `Unterzeichner ${index + 1}`,
      order: signer.order
    }));

    // Create email-to-index mapping
    const emailToIndex = {};
    envelope.signers.forEach((signer, index) => {
      emailToIndex[signer.email.toLowerCase()] = index;
    });

    // Convert signature fields to template fields
    const fields = envelope.signatureFields.map(field => ({
      page: field.page,
      nx: field.nx || (field.x / 612), // Fallback to legacy coords
      ny: field.ny || (field.y / 792),
      nwidth: field.nwidth || (field.width / 612),
      nheight: field.nheight || (field.height / 792),
      type: field.type,
      signerIndex: emailToIndex[field.assigneeEmail.toLowerCase()] || 0,
      label: field.label || null,
      required: field.required !== false
    }));

    const template = new EnvelopeTemplate({
      ownerId: req.user.userId,
      name: name.trim(),
      description: description?.trim() || `Erstellt aus: ${envelope.title}`,
      signerRoles,
      fields,
      signingMode: envelope.signingMode || "PARALLEL",
      defaultMessage: envelope.message || ""
    });

    await template.save();

    console.log(`✅ Template created from envelope: ${template._id}`);

    res.status(201).json({
      success: true,
      message: "Vorlage aus Envelope erstellt",
      template: {
        _id: template._id,
        name: template.name
      }
    });
  } catch (error) {
    console.error("Error creating template from envelope:", error);
    res.status(500).json({
      success: false,
      error: "Fehler beim Erstellen der Vorlage"
    });
  }
});

// ===== PUT /api/envelope-templates/:id - Update template =====
router.put("/envelope-templates/:id", verifyToken, async (req, res) => {
  try {
    const { name, description, signerRoles, fields, signingMode, defaultMessage } = req.body;

    const template = await EnvelopeTemplate.findOne({
      _id: req.params.id,
      ownerId: req.user.userId
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        error: "Vorlage nicht gefunden"
      });
    }

    // Update fields
    if (name) template.name = name.trim();
    if (description !== undefined) template.description = description.trim();
    if (signerRoles) template.signerRoles = signerRoles;
    if (fields) template.fields = fields;
    if (signingMode) template.signingMode = signingMode;
    if (defaultMessage !== undefined) template.defaultMessage = defaultMessage.trim();

    await template.save();

    res.json({
      success: true,
      message: "Vorlage aktualisiert",
      template: {
        _id: template._id,
        name: template.name
      }
    });
  } catch (error) {
    console.error("Error updating template:", error);
    res.status(500).json({
      success: false,
      error: "Fehler beim Aktualisieren der Vorlage"
    });
  }
});

// ===== DELETE /api/envelope-templates/:id - Delete (archive) template =====
router.delete("/envelope-templates/:id", verifyToken, async (req, res) => {
  try {
    const { permanent } = req.query;

    const template = await EnvelopeTemplate.findOne({
      _id: req.params.id,
      ownerId: req.user.userId
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        error: "Vorlage nicht gefunden"
      });
    }

    if (permanent === "true") {
      // Permanently delete
      await EnvelopeTemplate.deleteOne({ _id: req.params.id });
      console.log(`🗑️ Template permanently deleted: ${req.params.id}`);
    } else {
      // Soft delete (archive)
      template.isArchived = true;
      await template.save();
      console.log(`📦 Template archived: ${req.params.id}`);
    }

    res.json({
      success: true,
      message: permanent === "true" ? "Vorlage gelöscht" : "Vorlage archiviert"
    });
  } catch (error) {
    console.error("Error deleting template:", error);
    res.status(500).json({
      success: false,
      error: "Fehler beim Löschen der Vorlage"
    });
  }
});

// ===== POST /api/envelope-templates/:id/restore - Restore archived template =====
router.post("/envelope-templates/:id/restore", verifyToken, async (req, res) => {
  try {
    const template = await EnvelopeTemplate.findOne({
      _id: req.params.id,
      ownerId: req.user.userId
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        error: "Vorlage nicht gefunden"
      });
    }

    template.isArchived = false;
    await template.save();

    res.json({
      success: true,
      message: "Vorlage wiederhergestellt"
    });
  } catch (error) {
    console.error("Error restoring template:", error);
    res.status(500).json({
      success: false,
      error: "Fehler beim Wiederherstellen der Vorlage"
    });
  }
});

module.exports = router;
