/**
 * Clause Collections API Routes
 *
 * Endpunkte fuer benutzerdefinierte Klausel-Sammlungen.
 * Erlaubt Erstellen, Bearbeiten und Verwalten von Sammlungen
 * mit Klauseln aus verschiedenen Quellen.
 */

const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/verifyToken");
const mongoose = require("mongoose");
const ClauseCollection = require("../models/ClauseCollection");
const SavedClause = require("../models/SavedClause");

const toObjectId = (id) => {
  try {
    return new mongoose.Types.ObjectId(id);
  } catch (err) {
    return null;
  }
};

// ============================================
// GET ALL COLLECTIONS
// ============================================

/**
 * GET /api/clause-collections
 * Gibt alle Sammlungen eines Users zurueck (mit Item-Counts).
 */
router.get("/", verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const userObjId = toObjectId(userId);
    if (!userObjId) {
      return res.status(400).json({ success: false, error: "Ungueltige Benutzer-ID" });
    }

    const collections = await ClauseCollection.getOverview(userId);

    res.json({
      success: true,
      collections
    });
  } catch (error) {
    console.error("[ClauseCollections] GET / error:", error);
    res.status(500).json({ success: false, error: "Fehler beim Laden der Sammlungen" });
  }
});

// ============================================
// CREATE COLLECTION
// ============================================

/**
 * POST /api/clause-collections
 * Erstellt eine neue Sammlung.
 */
router.post("/", verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const userObjId = toObjectId(userId);
    if (!userObjId) {
      return res.status(400).json({ success: false, error: "Ungueltige Benutzer-ID" });
    }

    const { name, description, icon, color } = req.body;

    if (!name || name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        error: "Name ist erforderlich (mind. 2 Zeichen)"
      });
    }

    const collection = new ClauseCollection({
      userId: userObjId,
      name: name.trim(),
      description: description || "",
      icon: icon || "📁",
      color: color || "#6366f1",
      items: []
    });

    await collection.save();

    console.log(`[ClauseCollections] Created: "${collection.name}" (${collection._id})`);

    res.status(201).json({
      success: true,
      collection,
      message: "Sammlung erstellt"
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        error: "Eine Sammlung mit diesem Namen existiert bereits"
      });
    }
    console.error("[ClauseCollections] POST / error:", error);
    res.status(500).json({ success: false, error: "Fehler beim Erstellen der Sammlung" });
  }
});

// ============================================
// GET SINGLE COLLECTION (with resolved items)
// ============================================

/**
 * GET /api/clause-collections/:id
 * Gibt eine Sammlung mit aufgeloesten Klauseln zurueck.
 * SavedClause-Referenzen werden aus der DB geladen.
 */
router.get("/:id", verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const userObjId = toObjectId(userId);
    const collectionId = toObjectId(req.params.id);

    if (!userObjId || !collectionId) {
      return res.status(400).json({ success: false, error: "Ungueltige ID" });
    }

    const collection = await ClauseCollection.findOne({
      _id: collectionId,
      userId: userObjId
    }).lean();

    if (!collection) {
      return res.status(404).json({ success: false, error: "Sammlung nicht gefunden" });
    }

    // SavedClause-Referenzen aufloesen
    const savedClauseIds = collection.items
      .filter(item => item.type === "saved" && item.savedClauseId)
      .map(item => item.savedClauseId);

    let savedClausesMap = {};
    if (savedClauseIds.length > 0) {
      const savedClauses = await SavedClause.find({
        _id: { $in: savedClauseIds },
        userId: userObjId
      }).lean();

      savedClauses.forEach(sc => {
        savedClausesMap[sc._id.toString()] = sc;
      });
    }

    // Items mit aufgeloesten Daten anreichern
    const resolvedItems = collection.items
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .map(item => {
        const resolved = { ...item };

        if (item.type === "saved" && item.savedClauseId) {
          const savedClause = savedClausesMap[item.savedClauseId.toString()];
          if (savedClause) {
            resolved.resolvedClause = {
              clauseText: savedClause.clauseText,
              clausePreview: savedClause.clausePreview,
              category: savedClause.category,
              clauseArea: savedClause.clauseArea,
              tags: savedClause.tags,
              originalAnalysis: savedClause.originalAnalysis,
              userNotes: savedClause.userNotes
            };
          } else {
            resolved.resolvedClause = null;
            resolved._deleted = true;
          }
        }

        return resolved;
      });

    res.json({
      success: true,
      collection: {
        ...collection,
        items: resolvedItems
      }
    });
  } catch (error) {
    console.error("[ClauseCollections] GET /:id error:", error);
    res.status(500).json({ success: false, error: "Fehler beim Laden der Sammlung" });
  }
});

// ============================================
// UPDATE COLLECTION
// ============================================

/**
 * PUT /api/clause-collections/:id
 * Aktualisiert Name, Beschreibung, Icon oder Farbe.
 */
router.put("/:id", verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const userObjId = toObjectId(userId);
    const collectionId = toObjectId(req.params.id);

    if (!userObjId || !collectionId) {
      return res.status(400).json({ success: false, error: "Ungueltige ID" });
    }

    const { name, description, icon, color } = req.body;
    const updateData = { updatedAt: new Date() };

    if (name !== undefined) {
      if (name.trim().length < 2) {
        return res.status(400).json({
          success: false,
          error: "Name muss mind. 2 Zeichen haben"
        });
      }
      updateData.name = name.trim();
    }
    if (description !== undefined) updateData.description = description;
    if (icon !== undefined) updateData.icon = icon;
    if (color !== undefined) updateData.color = color;

    const collection = await ClauseCollection.findOneAndUpdate(
      { _id: collectionId, userId: userObjId },
      { $set: updateData },
      { new: true }
    );

    if (!collection) {
      return res.status(404).json({ success: false, error: "Sammlung nicht gefunden" });
    }

    res.json({
      success: true,
      collection,
      message: "Sammlung aktualisiert"
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        error: "Eine Sammlung mit diesem Namen existiert bereits"
      });
    }
    console.error("[ClauseCollections] PUT /:id error:", error);
    res.status(500).json({ success: false, error: "Fehler beim Aktualisieren" });
  }
});

// ============================================
// DELETE COLLECTION
// ============================================

/**
 * DELETE /api/clause-collections/:id
 * Loescht eine Sammlung (Klauseln selbst bleiben erhalten).
 */
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const userObjId = toObjectId(userId);
    const collectionId = toObjectId(req.params.id);

    if (!userObjId || !collectionId) {
      return res.status(400).json({ success: false, error: "Ungueltige ID" });
    }

    const result = await ClauseCollection.findOneAndDelete({
      _id: collectionId,
      userId: userObjId
    });

    if (!result) {
      return res.status(404).json({ success: false, error: "Sammlung nicht gefunden" });
    }

    console.log(`[ClauseCollections] Deleted: "${result.name}" (${result._id})`);

    res.json({
      success: true,
      message: "Sammlung geloescht"
    });
  } catch (error) {
    console.error("[ClauseCollections] DELETE /:id error:", error);
    res.status(500).json({ success: false, error: "Fehler beim Loeschen" });
  }
});

// ============================================
// ADD ITEM TO COLLECTION
// ============================================

/**
 * POST /api/clause-collections/:id/items
 * Fuegt eine Klausel zur Sammlung hinzu.
 */
router.post("/:id/items", verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const userObjId = toObjectId(userId);
    const collectionId = toObjectId(req.params.id);

    if (!userObjId || !collectionId) {
      return res.status(400).json({ success: false, error: "Ungueltige ID" });
    }

    const { type, savedClauseId, templateClauseId, legalTermId, customTitle, customText, notes } = req.body;

    // Validierung
    if (!type || !["saved", "template", "lexikon", "custom"].includes(type)) {
      return res.status(400).json({
        success: false,
        error: "Typ muss 'saved', 'template', 'lexikon' oder 'custom' sein"
      });
    }

    if (type === "saved" && !savedClauseId) {
      return res.status(400).json({ success: false, error: "savedClauseId ist erforderlich" });
    }
    if (type === "template" && !templateClauseId) {
      return res.status(400).json({ success: false, error: "templateClauseId ist erforderlich" });
    }
    if (type === "lexikon" && !legalTermId) {
      return res.status(400).json({ success: false, error: "legalTermId ist erforderlich" });
    }
    if (type === "custom" && (!customText || customText.trim().length < 5)) {
      return res.status(400).json({ success: false, error: "Klauseltext ist erforderlich (mind. 5 Zeichen)" });
    }

    const collection = await ClauseCollection.findOne({
      _id: collectionId,
      userId: userObjId
    });

    if (!collection) {
      return res.status(404).json({ success: false, error: "Sammlung nicht gefunden" });
    }

    // Duplikat-Check innerhalb der Sammlung
    const isDuplicate = collection.items.some(item => {
      if (item.type !== type) return false;
      if (type === "saved") return item.savedClauseId?.toString() === savedClauseId;
      if (type === "template") return item.templateClauseId === templateClauseId;
      if (type === "lexikon") return item.legalTermId === legalTermId;
      return false; // custom darf mehrfach vorkommen
    });

    if (isDuplicate) {
      return res.status(409).json({
        success: false,
        error: "Dieser Eintrag ist bereits in der Sammlung"
      });
    }

    // Naechste Order-Nummer
    const maxOrder = collection.items.reduce((max, item) => Math.max(max, item.order || 0), -1);

    const newItem = {
      type,
      order: maxOrder + 1,
      addedAt: new Date()
    };

    if (type === "saved") newItem.savedClauseId = toObjectId(savedClauseId);
    if (type === "template") newItem.templateClauseId = templateClauseId;
    if (type === "lexikon") newItem.legalTermId = legalTermId;
    if (type === "custom") {
      newItem.customTitle = customTitle || "";
      newItem.customText = customText.trim();
    }
    if (notes) newItem.notes = notes;

    collection.items.push(newItem);
    await collection.save();

    const addedItem = collection.items[collection.items.length - 1];

    res.status(201).json({
      success: true,
      item: addedItem,
      itemCount: collection.items.length,
      message: "Klausel zur Sammlung hinzugefuegt"
    });
  } catch (error) {
    console.error("[ClauseCollections] POST /:id/items error:", error);
    res.status(500).json({ success: false, error: "Fehler beim Hinzufuegen" });
  }
});

// ============================================
// REMOVE ITEM FROM COLLECTION
// ============================================

/**
 * DELETE /api/clause-collections/:id/items/:itemId
 * Entfernt eine Klausel aus der Sammlung.
 */
router.delete("/:id/items/:itemId", verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const userObjId = toObjectId(userId);
    const collectionId = toObjectId(req.params.id);
    const itemId = toObjectId(req.params.itemId);

    if (!userObjId || !collectionId || !itemId) {
      return res.status(400).json({ success: false, error: "Ungueltige ID" });
    }

    const collection = await ClauseCollection.findOne({
      _id: collectionId,
      userId: userObjId
    });

    if (!collection) {
      return res.status(404).json({ success: false, error: "Sammlung nicht gefunden" });
    }

    const itemIndex = collection.items.findIndex(
      item => item._id.toString() === itemId.toString()
    );

    if (itemIndex === -1) {
      return res.status(404).json({ success: false, error: "Eintrag nicht gefunden" });
    }

    collection.items.splice(itemIndex, 1);
    await collection.save();

    res.json({
      success: true,
      itemCount: collection.items.length,
      message: "Eintrag entfernt"
    });
  } catch (error) {
    console.error("[ClauseCollections] DELETE /:id/items/:itemId error:", error);
    res.status(500).json({ success: false, error: "Fehler beim Entfernen" });
  }
});

// ============================================
// REORDER ITEMS
// ============================================

/**
 * PUT /api/clause-collections/:id/items/reorder
 * Aendert die Reihenfolge der Klauseln in einer Sammlung.
 * Body: { itemIds: ["id1", "id2", ...] } in gewuenschter Reihenfolge
 */
router.put("/:id/items/reorder", verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const userObjId = toObjectId(userId);
    const collectionId = toObjectId(req.params.id);

    if (!userObjId || !collectionId) {
      return res.status(400).json({ success: false, error: "Ungueltige ID" });
    }

    const { itemIds } = req.body;

    if (!Array.isArray(itemIds) || itemIds.length === 0) {
      return res.status(400).json({ success: false, error: "itemIds Array ist erforderlich" });
    }

    const collection = await ClauseCollection.findOne({
      _id: collectionId,
      userId: userObjId
    });

    if (!collection) {
      return res.status(404).json({ success: false, error: "Sammlung nicht gefunden" });
    }

    // Order-Werte neu setzen
    itemIds.forEach((itemId, index) => {
      const item = collection.items.find(i => i._id.toString() === itemId);
      if (item) {
        item.order = index;
      }
    });

    await collection.save();

    res.json({
      success: true,
      message: "Reihenfolge aktualisiert"
    });
  } catch (error) {
    console.error("[ClauseCollections] PUT /:id/items/reorder error:", error);
    res.status(500).json({ success: false, error: "Fehler beim Sortieren" });
  }
});

// ============================================
// GET COLLECTIONS CONTAINING A SPECIFIC CLAUSE
// ============================================

/**
 * GET /api/clause-collections/by-clause/:clauseId
 * Gibt alle Sammlungen zurueck, die eine bestimmte SavedClause enthalten.
 */
router.get("/by-clause/:clauseId", verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const userObjId = toObjectId(userId);
    const clauseId = toObjectId(req.params.clauseId);

    if (!userObjId || !clauseId) {
      return res.status(400).json({ success: false, error: "Ungueltige ID" });
    }

    const collections = await ClauseCollection.find({
      userId: userObjId,
      "items.savedClauseId": clauseId
    }).select("name icon color").lean();

    res.json({
      success: true,
      collections: collections.map(c => ({
        _id: c._id,
        name: c.name,
        icon: c.icon || "📁",
        color: c.color || "#6366f1"
      }))
    });
  } catch (error) {
    console.error("[ClauseCollections] GET /by-clause/:clauseId error:", error);
    res.status(500).json({ success: false, error: "Fehler beim Laden" });
  }
});

module.exports = router;
