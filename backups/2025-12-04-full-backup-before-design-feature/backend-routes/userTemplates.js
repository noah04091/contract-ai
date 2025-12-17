// 📄 backend/routes/userTemplates.js
// API für benutzerdefinierte Vertragsvorlagen (Business+ Feature)

const express = require("express");
const router = express.Router();
const { ObjectId } = require("mongodb");

// Collections
let userTemplatesCollection;
let usersCollection;

// 🔐 Middleware: Business+ Check - Custom Templates nur für Business & Enterprise
const requireBusinessPlan = async (req, res, next) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Nicht autorisiert"
      });
    }

    const user = await usersCollection.findOne({ _id: new ObjectId(userId) });
    const plan = user?.subscriptionPlan || 'free';

    // Free-User haben keinen Zugriff auf eigene Vorlagen
    if (plan === 'free') {
      return res.status(403).json({
        success: false,
        error: 'Eigene Vorlagen sind nur für Business & Enterprise verfügbar',
        requiresUpgrade: true,
        feature: 'custom_templates',
        upgradeUrl: '/pricing',
        userPlan: plan
      });
    }
    next();
  } catch (error) {
    console.error('❌ Error checking subscription for templates:', error);
    return res.status(500).json({
      success: false,
      error: 'Fehler bei der Abo-Überprüfung'
    });
  }
};

module.exports = (db) => {
  userTemplatesCollection = db.collection("user_contract_templates");
  usersCollection = db.collection("users");
  return router;
};

/**
 * GET /api/user-templates/by-type/:contractType
 * Templates nach Vertragstyp filtern (Business+ only)
 * WICHTIG: Muss VOR /:id Route stehen, da Express Routes in Reihenfolge matcht!
 */
router.get("/by-type/:contractType", requireBusinessPlan, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { contractType } = req.params;

    const templates = await userTemplatesCollection
      .find({
        userId: new ObjectId(userId),
        contractType: contractType
      })
      .sort({ createdAt: -1 })
      .toArray();

    res.json({
      success: true,
      templates: templates.map(t => ({
        id: t._id.toString(),
        name: t.name,
        description: t.description,
        contractType: t.contractType,
        defaultValues: t.defaultValues,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt
      }))
    });

  } catch (error) {
    console.error("❌ Fehler beim Filtern der Templates:", error);
    res.status(500).json({
      success: false,
      message: "Fehler beim Laden der Vorlagen"
    });
  }
});

/**
 * GET /api/user-templates
 * Liste aller Templates des angemeldeten Users (Business+ only)
 */
router.get("/", requireBusinessPlan, async (req, res) => {
  try {
    const userId = req.user.userId;

    const templates = await userTemplatesCollection
      .find({ userId: new ObjectId(userId) })
      .sort({ createdAt: -1 })
      .toArray();

    res.json({
      success: true,
      templates: templates.map(t => ({
        id: t._id.toString(),
        name: t.name,
        description: t.description,
        contractType: t.contractType,
        defaultValues: t.defaultValues,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt
      }))
    });

  } catch (error) {
    console.error("❌ Fehler beim Abrufen der Templates:", error);
    res.status(500).json({
      success: false,
      message: "Fehler beim Laden der Vorlagen"
    });
  }
});

/**
 * GET /api/user-templates/:id
 * Einzelnes Template abrufen (Business+ only)
 */
router.get("/:id", requireBusinessPlan, async (req, res) => {
  try {
    const userId = req.user.userId;
    const templateId = req.params.id;

    if (!ObjectId.isValid(templateId)) {
      return res.status(400).json({
        success: false,
        message: "Ungültige Template-ID"
      });
    }

    const template = await userTemplatesCollection.findOne({
      _id: new ObjectId(templateId),
      userId: new ObjectId(userId)
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        message: "Vorlage nicht gefunden"
      });
    }

    res.json({
      success: true,
      template: {
        id: template._id.toString(),
        name: template.name,
        description: template.description,
        contractType: template.contractType,
        defaultValues: template.defaultValues,
        createdAt: template.createdAt,
        updatedAt: template.updatedAt
      }
    });

  } catch (error) {
    console.error("❌ Fehler beim Abrufen des Templates:", error);
    res.status(500).json({
      success: false,
      message: "Fehler beim Laden der Vorlage"
    });
  }
});

/**
 * POST /api/user-templates
 * Neues Template erstellen (Business+ only)
 */
router.post("/", requireBusinessPlan, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { name, description, contractType, defaultValues } = req.body;

    // Validierung
    if (!name || !contractType) {
      return res.status(400).json({
        success: false,
        message: "Name und Vertragstyp sind erforderlich"
      });
    }

    if (name.trim().length < 3) {
      return res.status(400).json({
        success: false,
        message: "Name muss mindestens 3 Zeichen lang sein"
      });
    }

    if (name.length > 100) {
      return res.status(400).json({
        success: false,
        message: "Name darf maximal 100 Zeichen lang sein"
      });
    }

    // Template-Limit für Free-User (z.B. max 5 Templates)
    const user = await usersCollection.findOne({ _id: new ObjectId(userId) });
    const userPlan = user?.subscription?.plan || "free";

    const existingTemplatesCount = await userTemplatesCollection.countDocuments({
      userId: new ObjectId(userId)
    });

    const templateLimits = {
      free: 3,
      premium: 15,
      business: 50,
      legendary: 999
    };

    const limit = templateLimits[userPlan] || 3;

    if (existingTemplatesCount >= limit) {
      return res.status(403).json({
        success: false,
        message: `Sie haben das Limit von ${limit} Vorlagen für Ihren ${userPlan.toUpperCase()}-Plan erreicht`,
        limit: limit,
        current: existingTemplatesCount
      });
    }

    // Template erstellen
    const newTemplate = {
      userId: new ObjectId(userId),
      name: name.trim(),
      description: description?.trim() || "",
      contractType: contractType,
      defaultValues: defaultValues || {},
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await userTemplatesCollection.insertOne(newTemplate);

    console.log(`✅ Neue Vorlage erstellt: "${name}" von User ${userId}`);

    res.status(201).json({
      success: true,
      message: "Vorlage erfolgreich erstellt",
      template: {
        id: result.insertedId.toString(),
        name: newTemplate.name,
        description: newTemplate.description,
        contractType: newTemplate.contractType,
        defaultValues: newTemplate.defaultValues,
        createdAt: newTemplate.createdAt,
        updatedAt: newTemplate.updatedAt
      }
    });

  } catch (error) {
    console.error("❌ Fehler beim Erstellen des Templates:", error);
    res.status(500).json({
      success: false,
      message: "Fehler beim Erstellen der Vorlage"
    });
  }
});

/**
 * PUT /api/user-templates/:id
 * Template aktualisieren (Business+ only)
 */
router.put("/:id", requireBusinessPlan, async (req, res) => {
  try {
    const userId = req.user.userId;
    const templateId = req.params.id;
    const { name, description, defaultValues } = req.body;

    if (!ObjectId.isValid(templateId)) {
      return res.status(400).json({
        success: false,
        message: "Ungültige Template-ID"
      });
    }

    // Prüfen ob Template existiert und User gehört
    const existingTemplate = await userTemplatesCollection.findOne({
      _id: new ObjectId(templateId),
      userId: new ObjectId(userId)
    });

    if (!existingTemplate) {
      return res.status(404).json({
        success: false,
        message: "Vorlage nicht gefunden"
      });
    }

    // Update-Daten vorbereiten
    const updateData = {
      updatedAt: new Date()
    };

    if (name !== undefined) {
      if (name.trim().length < 3) {
        return res.status(400).json({
          success: false,
          message: "Name muss mindestens 3 Zeichen lang sein"
        });
      }
      if (name.length > 100) {
        return res.status(400).json({
          success: false,
          message: "Name darf maximal 100 Zeichen lang sein"
        });
      }
      updateData.name = name.trim();
    }

    if (description !== undefined) {
      updateData.description = description.trim();
    }

    if (defaultValues !== undefined) {
      updateData.defaultValues = defaultValues;
    }

    // Update durchführen
    const result = await userTemplatesCollection.updateOne(
      { _id: new ObjectId(templateId), userId: new ObjectId(userId) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Vorlage nicht gefunden"
      });
    }

    // Updated Template holen
    const updatedTemplate = await userTemplatesCollection.findOne({
      _id: new ObjectId(templateId)
    });

    console.log(`✅ Vorlage aktualisiert: "${updatedTemplate.name}" (${templateId})`);

    res.json({
      success: true,
      message: "Vorlage erfolgreich aktualisiert",
      template: {
        id: updatedTemplate._id.toString(),
        name: updatedTemplate.name,
        description: updatedTemplate.description,
        contractType: updatedTemplate.contractType,
        defaultValues: updatedTemplate.defaultValues,
        createdAt: updatedTemplate.createdAt,
        updatedAt: updatedTemplate.updatedAt
      }
    });

  } catch (error) {
    console.error("❌ Fehler beim Aktualisieren des Templates:", error);
    res.status(500).json({
      success: false,
      message: "Fehler beim Aktualisieren der Vorlage"
    });
  }
});

/**
 * DELETE /api/user-templates/:id
 * Template löschen (Business+ only)
 */
router.delete("/:id", requireBusinessPlan, async (req, res) => {
  try {
    const userId = req.user.userId;
    const templateId = req.params.id;

    if (!ObjectId.isValid(templateId)) {
      return res.status(400).json({
        success: false,
        message: "Ungültige Template-ID"
      });
    }

    const result = await userTemplatesCollection.deleteOne({
      _id: new ObjectId(templateId),
      userId: new ObjectId(userId)
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Vorlage nicht gefunden"
      });
    }

    console.log(`🗑️ Vorlage gelöscht: ${templateId} von User ${userId}`);

    res.json({
      success: true,
      message: "Vorlage erfolgreich gelöscht"
    });

  } catch (error) {
    console.error("❌ Fehler beim Löschen des Templates:", error);
    res.status(500).json({
      success: false,
      message: "Fehler beim Löschen der Vorlage"
    });
  }
});

