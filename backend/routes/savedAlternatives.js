const express = require('express');
const { ObjectId } = require('mongodb');
const { getDb } = require('../config/database');
const verifyToken = require('../middleware/verifyToken');

const router = express.Router();

// 📱 GET /api/saved-alternatives - Alle gespeicherten Alternativen abrufen
router.get('/', verifyToken, async (req, res) => {
  try {
    const db = getDb();
    const savedAlternatives = db.collection('saved_alternatives');

    const alternatives = await savedAlternatives
      .find({ userId: new ObjectId(req.user.userId) })
      .sort({ savedAt: -1 })
      .toArray();

    res.json({
      success: true,
      alternatives,
      total: alternatives.length
    });

  } catch (error) {
    console.error('❌ Error fetching saved alternatives:', error);
    res.status(500).json({
      error: 'Fehler beim Laden der gespeicherten Alternativen',
      details: error.message
    });
  }
});

// 💾 POST /api/saved-alternatives - Alternative speichern
router.post('/', verifyToken, async (req, res) => {
  try {
    const {
      title,
      link,
      snippet,
      prices,
      provider,
      features,
      contractType,
      relevantInfo,
      hasDetailedData,
      monthlyPrice
    } = req.body;

    // Validierung
    if (!title || !link || !contractType) {
      return res.status(400).json({
        error: 'Titel, Link und Vertragstyp sind erforderlich'
      });
    }

    const db = getDb();
    const savedAlternatives = db.collection('saved_alternatives');

    // Prüfen ob bereits gespeichert
    const existing = await savedAlternatives.findOne({
      userId: new ObjectId(req.user.userId),
      link: link
    });

    if (existing) {
      return res.status(409).json({
        error: 'Diese Alternative wurde bereits gespeichert',
        existingId: existing._id
      });
    }

    // Alternative speichern
    const savedAlternative = {
      userId: new ObjectId(req.user.userId),
      title,
      link,
      snippet: snippet || '',
      prices: prices || [],
      provider: provider || 'Unknown',
      features: features || [],
      contractType,
      relevantInfo: relevantInfo || '',
      hasDetailedData: hasDetailedData || false,
      monthlyPrice: monthlyPrice || null,
      savedAt: new Date(),
      status: 'saved', // saved, compared, contacted, dismissed
      notes: ''
    };

    const result = await savedAlternatives.insertOne(savedAlternative);

    console.log(`✅ Alternative gespeichert für User ${req.user.userId}: ${title}`);

    res.status(201).json({
      success: true,
      alternativeId: result.insertedId,
      message: 'Alternative erfolgreich gespeichert'
    });

  } catch (error) {
    console.error('❌ Error saving alternative:', error);
    res.status(500).json({
      error: 'Fehler beim Speichern der Alternative',
      details: error.message
    });
  }
});

// 🗑️ DELETE /api/saved-alternatives/:id - Alternative löschen
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        error: 'Ungültige Alternative-ID'
      });
    }

    const db = getDb();
    const savedAlternatives = db.collection('saved_alternatives');

    const result = await savedAlternatives.deleteOne({
      _id: new ObjectId(id),
      userId: new ObjectId(req.user.userId)
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        error: 'Alternative nicht gefunden oder keine Berechtigung'
      });
    }

    console.log(`🗑️ Alternative gelöscht für User ${req.user.userId}: ${id}`);

    res.json({
      success: true,
      message: 'Alternative erfolgreich gelöscht'
    });

  } catch (error) {
    console.error('❌ Error deleting alternative:', error);
    res.status(500).json({
      error: 'Fehler beim Löschen der Alternative',
      details: error.message
    });
  }
});

// 📝 PUT /api/saved-alternatives/:id - Alternative aktualisieren
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        error: 'Ungültige Alternative-ID'
      });
    }

    const db = getDb();
    const savedAlternatives = db.collection('saved_alternatives');

    const updateData = {
      updatedAt: new Date()
    };

    if (status) updateData.status = status;
    if (typeof notes === 'string') updateData.notes = notes;

    const result = await savedAlternatives.updateOne(
      {
        _id: new ObjectId(id),
        userId: new ObjectId(req.user.userId)
      },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        error: 'Alternative nicht gefunden oder keine Berechtigung'
      });
    }

    console.log(`📝 Alternative aktualisiert für User ${req.user.userId}: ${id}`);

    res.json({
      success: true,
      message: 'Alternative erfolgreich aktualisiert'
    });

  } catch (error) {
    console.error('❌ Error updating alternative:', error);
    res.status(500).json({
      error: 'Fehler beim Aktualisieren der Alternative',
      details: error.message
    });
  }
});

// 📊 GET /api/saved-alternatives/stats - Statistiken
router.get('/stats', verifyToken, async (req, res) => {
  try {
    const db = getDb();
    const savedAlternatives = db.collection('saved_alternatives');

    const stats = await savedAlternatives.aggregate([
      {
        $match: { userId: new ObjectId(req.user.userId) }
      },
      {
        $group: {
          _id: '$contractType',
          count: { $sum: 1 },
          latestSaved: { $max: '$savedAt' }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]).toArray();

    const totalCount = await savedAlternatives.countDocuments({
      userId: new ObjectId(req.user.userId)
    });

    res.json({
      success: true,
      totalSaved: totalCount,
      byContractType: stats
    });

  } catch (error) {
    console.error('❌ Error fetching stats:', error);
    res.status(500).json({
      error: 'Fehler beim Laden der Statistiken',
      details: error.message
    });
  }
});

module.exports = router;