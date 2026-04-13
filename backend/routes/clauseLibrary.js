/**
 * Clause Library API Routes
 *
 * Endpunkte für die Klausel-Bibliothek (Favoriten/Sammlung).
 * Ermöglicht Speichern, Kategorisieren und Wiedererkennen von Klauseln.
 *
 * @version 1.0.0
 */

const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/verifyToken');
const mongoose = require('mongoose');
const SavedClause = require('../models/SavedClause');
const Contract = require('../models/Contract');

// Helper für ObjectId-Konvertierung
const toObjectId = (id) => {
  try {
    return new mongoose.Types.ObjectId(id);
  } catch (err) {
    console.error('[ClauseLibrary] Invalid ObjectId:', id);
    return null;
  }
};

// ============================================
// GET ALL SAVED CLAUSES
// ============================================

/**
 * GET /api/clause-library
 *
 * Gibt alle gespeicherten Klauseln eines Users zurück.
 * Unterstützt Filter und Sortierung.
 */
router.get('/', verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const {
      category,
      clauseArea,
      tag,
      industryContext,
      search,
      sortBy = 'savedAt',
      sortOrder = 'desc',
      limit = 50,
      offset = 0
    } = req.query;

    console.log(`📚 [ClauseLibrary] Fetching clauses for user: ${userId}`);

    // Filter aufbauen
    const filter = { userId: toObjectId(userId) };

    if (category) {
      filter.category = category;
    }

    if (clauseArea) {
      filter.clauseArea = clauseArea;
    }

    if (tag) {
      filter.tags = tag.toLowerCase();
    }

    if (industryContext) {
      filter.industryContext = industryContext;
    }

    // Textsuche
    if (search) {
      filter.$or = [
        { clauseText: { $regex: search, $options: 'i' } },
        { userNotes: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } },
        { keywords: { $regex: search, $options: 'i' } }
      ];
    }

    // Sortierung
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Abfrage
    const clauses = await SavedClause.find(filter)
      .sort(sort)
      .skip(parseInt(offset))
      .limit(parseInt(limit))
      .lean();

    // Gesamtanzahl für Pagination
    const totalCount = await SavedClause.countDocuments(filter);

    console.log(`✅ [ClauseLibrary] Found ${clauses.length} clauses`);

    res.json({
      success: true,
      clauses,
      pagination: {
        total: totalCount,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: parseInt(offset) + clauses.length < totalCount
      }
    });

  } catch (error) {
    console.error('❌ [ClauseLibrary] Get clauses error:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Laden der Klauseln'
    });
  }
});

// ============================================
// SAVE NEW CLAUSE
// ============================================

/**
 * POST /api/clause-library
 *
 * Speichert eine neue Klausel in der Bibliothek.
 */
router.post('/', verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const {
      clauseText,
      category = 'important',
      clauseArea = 'other',
      sourceContractId,
      sourceContractName,
      sourceClauseId,
      originalAnalysis,
      userNotes,
      tags = [],
      industryContext
    } = req.body;

    console.log(`💾 [ClauseLibrary] Saving new clause for user: ${userId}`);
    console.log(`💾 [ClauseLibrary] Request body:`, JSON.stringify({
      clauseTextLength: clauseText?.length,
      category,
      clauseArea,
      sourceContractId,
      sourceClauseId,
      hasOriginalAnalysis: !!originalAnalysis,
      tagsCount: tags?.length
    }));

    // Validiere userId
    const userObjId = toObjectId(userId);
    if (!userObjId) {
      console.error(`❌ [ClauseLibrary] Invalid userId: ${userId}`);
      return res.status(400).json({
        success: false,
        error: 'Ungültige Benutzer-ID'
      });
    }

    if (!clauseText || clauseText.length < 10) {
      return res.status(400).json({
        success: false,
        error: 'Klauseltext ist erforderlich (mind. 10 Zeichen)'
      });
    }

    // Prüfe auf Duplikat
    const existing = await SavedClause.checkDuplicate(userObjId, clauseText);
    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'Diese Klausel ist bereits in deiner Bibliothek gespeichert',
        existingClause: {
          id: existing._id,
          savedAt: existing.savedAt,
          category: existing.category
        }
      });
    }

    // Vertragsname holen wenn nicht übergeben
    let contractName = sourceContractName;
    if (!contractName && sourceContractId) {
      try {
        const contract = await Contract.findById(sourceContractId);
        contractName = contract?.name || contract?.title;
      } catch (err) {
        console.warn('[ClauseLibrary] Could not fetch contract name:', err.message);
      }
    }

    // Validiere sourceContractId falls vorhanden
    let sourceContractObjId = undefined;
    if (sourceContractId) {
      sourceContractObjId = toObjectId(sourceContractId);
      if (!sourceContractObjId) {
        console.warn(`⚠️ [ClauseLibrary] Invalid sourceContractId: ${sourceContractId}, ignoring`);
      }
    }

    // Neue Klausel erstellen
    const savedClause = new SavedClause({
      userId: userObjId,
      clauseText,
      category,
      clauseArea,
      sourceContractId: sourceContractObjId,
      sourceContractName: contractName,
      sourceClauseId,
      originalAnalysis,
      userNotes,
      tags: tags ? tags.map(t => t.toLowerCase().trim()) : [],
      industryContext
    });

    await savedClause.save();

    console.log(`✅ [ClauseLibrary] Clause saved with ID: ${savedClause._id}`);

    res.status(201).json({
      success: true,
      clause: savedClause,
      message: 'Klausel erfolgreich gespeichert'
    });

  } catch (error) {
    console.error('❌ [ClauseLibrary] Save clause error:', error.message);
    console.error('❌ [ClauseLibrary] Error stack:', error.stack);
    console.error('❌ [ClauseLibrary] Error name:', error.name);

    // Spezifischere Fehlermeldungen
    let errorMessage = 'Fehler beim Speichern der Klausel';
    if (error.name === 'ValidationError') {
      errorMessage = `Validierungsfehler: ${Object.values(error.errors).map(e => e.message).join(', ')}`;
    } else if (error.code === 11000) {
      errorMessage = 'Diese Klausel existiert bereits in deiner Bibliothek';
    }

    res.status(500).json({
      success: false,
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ============================================
// GET SINGLE CLAUSE
// ============================================

/**
 * GET /api/clause-library/:id
 *
 * Gibt eine einzelne gespeicherte Klausel zurück.
 */
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const clause = await SavedClause.findOne({
      _id: toObjectId(id),
      userId: toObjectId(userId)
    });

    if (!clause) {
      return res.status(404).json({
        success: false,
        error: 'Klausel nicht gefunden'
      });
    }

    res.json({
      success: true,
      clause
    });

  } catch (error) {
    console.error('❌ [ClauseLibrary] Get clause error:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Laden der Klausel'
    });
  }
});

// ============================================
// UPDATE CLAUSE
// ============================================

/**
 * PUT /api/clause-library/:id
 *
 * Aktualisiert eine gespeicherte Klausel.
 */
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    const {
      title,
      category,
      clauseArea,
      userNotes,
      tags,
      industryContext
    } = req.body;

    console.log(`📝 [ClauseLibrary] Updating clause: ${id}`);

    const updateData = { updatedAt: new Date() };

    if (title !== undefined) updateData.title = title;
    if (category) updateData.category = category;
    if (clauseArea) updateData.clauseArea = clauseArea;
    if (userNotes !== undefined) updateData.userNotes = userNotes;
    if (tags) updateData.tags = tags.map(t => t.toLowerCase().trim());
    if (industryContext) updateData.industryContext = industryContext;

    const clause = await SavedClause.findOneAndUpdate(
      {
        _id: toObjectId(id),
        userId: toObjectId(userId)
      },
      { $set: updateData },
      { new: true }
    );

    if (!clause) {
      return res.status(404).json({
        success: false,
        error: 'Klausel nicht gefunden'
      });
    }

    console.log(`✅ [ClauseLibrary] Clause updated: ${id}`);

    res.json({
      success: true,
      clause,
      message: 'Klausel aktualisiert'
    });

  } catch (error) {
    console.error('❌ [ClauseLibrary] Update clause error:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Aktualisieren der Klausel'
    });
  }
});

// ============================================
// DELETE CLAUSE
// ============================================

/**
 * DELETE /api/clause-library/:id
 *
 * Löscht eine gespeicherte Klausel.
 */
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    console.log(`🗑️ [ClauseLibrary] Deleting clause: ${id}`);

    const result = await SavedClause.findOneAndDelete({
      _id: toObjectId(id),
      userId: toObjectId(userId)
    });

    if (!result) {
      return res.status(404).json({
        success: false,
        error: 'Klausel nicht gefunden'
      });
    }

    console.log(`✅ [ClauseLibrary] Clause deleted: ${id}`);

    res.json({
      success: true,
      message: 'Klausel gelöscht'
    });

  } catch (error) {
    console.error('❌ [ClauseLibrary] Delete clause error:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Löschen der Klausel'
    });
  }
});

// ============================================
// GET ALL TAGS
// ============================================

/**
 * GET /api/clause-library/meta/tags
 *
 * Gibt alle verwendeten Tags eines Users zurück.
 */
router.get('/meta/tags', verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    const tags = await SavedClause.getAllTags(userId);

    res.json({
      success: true,
      tags
    });

  } catch (error) {
    console.error('❌ [ClauseLibrary] Get tags error:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Laden der Tags'
    });
  }
});

// ============================================
// GET STATISTICS
// ============================================

/**
 * GET /api/clause-library/meta/statistics
 *
 * Gibt Statistiken zur Klausel-Bibliothek zurück.
 */
router.get('/meta/statistics', verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    const stats = await SavedClause.getStatistics(userId);
    const tags = await SavedClause.getAllTags(userId);

    res.json({
      success: true,
      statistics: {
        ...stats,
        topTags: tags.slice(0, 10)
      }
    });

  } catch (error) {
    console.error('❌ [ClauseLibrary] Get statistics error:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Laden der Statistiken'
    });
  }
});

// ============================================
// CHECK FOR SIMILAR CLAUSES
// ============================================

/**
 * POST /api/clause-library/check-similar
 *
 * Prüft ob ähnliche Klauseln in der Bibliothek existieren.
 */
router.post('/check-similar', verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { clauseText, threshold = 3 } = req.body;

    console.log(`🔍 [ClauseLibrary] Checking for similar clauses`);

    if (!clauseText || clauseText.length < 20) {
      return res.status(400).json({
        success: false,
        error: 'Klauseltext ist erforderlich (mind. 20 Zeichen)'
      });
    }

    // Exakten Treffer prüfen
    const exactMatch = await SavedClause.checkDuplicate(userId, clauseText);

    if (exactMatch) {
      return res.json({
        success: true,
        exactMatch: {
          id: exactMatch._id,
          category: exactMatch.category,
          clauseArea: exactMatch.clauseArea,
          savedAt: exactMatch.savedAt,
          userNotes: exactMatch.userNotes,
          tags: exactMatch.tags
        },
        similarClauses: []
      });
    }

    // Ähnliche Klauseln suchen
    const similarClauses = await SavedClause.findSimilar(
      userId,
      clauseText,
      parseInt(threshold)
    );

    console.log(`✅ [ClauseLibrary] Found ${similarClauses.length} similar clauses`);

    res.json({
      success: true,
      exactMatch: null,
      similarClauses: similarClauses.map(c => ({
        id: c._id,
        clausePreview: c.clausePreview,
        category: c.category,
        clauseArea: c.clauseArea,
        savedAt: c.savedAt,
        similarity: c.similarity,
        commonKeywords: c.commonKeywords,
        userNotes: c.userNotes,
        tags: c.tags
      }))
    });

  } catch (error) {
    console.error('❌ [ClauseLibrary] Check similar error:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler bei der Ähnlichkeitsprüfung'
    });
  }
});

// ============================================
// BATCH CHECK MULTIPLE CLAUSES
// ============================================

/**
 * POST /api/clause-library/batch-check
 *
 * Prüft mehrere Klauseln auf Ähnlichkeit (für Legal Lens Integration).
 */
router.post('/batch-check', verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { clauses } = req.body;

    if (!Array.isArray(clauses) || clauses.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Klausel-Array ist erforderlich'
      });
    }

    console.log(`🔍 [ClauseLibrary] Batch checking ${clauses.length} clauses`);

    const results = {};

    for (const clause of clauses.slice(0, 50)) { // Max 50 Klauseln
      if (!clause.id || !clause.text || clause.text.length < 20) continue;

      // Exakten Treffer prüfen
      const exactMatch = await SavedClause.checkDuplicate(userId, clause.text);

      if (exactMatch) {
        results[clause.id] = {
          hasMatch: true,
          type: 'exact',
          savedClause: {
            id: exactMatch._id,
            category: exactMatch.category,
            clauseArea: exactMatch.clauseArea,
            userNotes: exactMatch.userNotes
          }
        };
      } else {
        // Ähnliche prüfen (nur top 1)
        const similar = await SavedClause.findSimilar(userId, clause.text, 4);

        if (similar.length > 0) {
          results[clause.id] = {
            hasMatch: true,
            type: 'similar',
            savedClause: {
              id: similar[0]._id,
              category: similar[0].category,
              clauseArea: similar[0].clauseArea,
              similarity: similar[0].similarity
            }
          };
        } else {
          results[clause.id] = { hasMatch: false };
        }
      }
    }

    console.log(`✅ [ClauseLibrary] Batch check complete`);

    res.json({
      success: true,
      results,
      checkedCount: Object.keys(results).length
    });

  } catch (error) {
    console.error('❌ [ClauseLibrary] Batch check error:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler bei der Batch-Prüfung'
    });
  }
});

// ============================================
// INCREMENT USAGE COUNT
// ============================================

/**
 * POST /api/clause-library/:id/use
 *
 * Inkrementiert den Nutzungszähler einer Klausel.
 */
router.post('/:id/use', verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const clause = await SavedClause.findOne({
      _id: toObjectId(id),
      userId: toObjectId(userId)
    });

    if (!clause) {
      return res.status(404).json({
        success: false,
        error: 'Klausel nicht gefunden'
      });
    }

    await clause.incrementUsage();

    res.json({
      success: true,
      usageCount: clause.usageCount
    });

  } catch (error) {
    console.error('❌ [ClauseLibrary] Increment usage error:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Aktualisieren'
    });
  }
});

module.exports = router;
