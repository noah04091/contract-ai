// 📁 routes/folders.js - Folder Management Routes
const express = require('express');
const router = express.Router();
const Folder = require('../models/Folder');
const Contract = require('../models/Contract');
const verifyToken = require('../middleware/verifyToken');

// ✅ GET /api/folders - Get all folders for user
router.get('/', verifyToken, async (req, res) => {
  try {
    const folders = await Folder.find({ userId: req.userId })
      .sort({ order: 1, createdAt: 1 });

    // Count contracts per folder
    const foldersWithCounts = await Promise.all(
      folders.map(async (folder) => {
        const count = await Contract.countDocuments({
          userId: req.userId,
          folderId: folder._id
        });
        return {
          ...folder.toObject(),
          contractCount: count
        };
      })
    );

    res.json(foldersWithCounts);
  } catch (error) {
    console.error('❌ Error fetching folders:', error);
    res.status(500).json({ error: 'Fehler beim Laden der Ordner' });
  }
});

// ✅ POST /api/folders - Create new folder
router.post('/', verifyToken, async (req, res) => {
  try {
    const { name, color, icon } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Ordnername ist erforderlich' });
    }

    // Get highest order number
    const lastFolder = await Folder.findOne({ userId: req.userId })
      .sort({ order: -1 })
      .limit(1);

    const newOrder = lastFolder ? lastFolder.order + 1 : 0;

    const folder = new Folder({
      name: name.trim(),
      color: color || '#667eea',
      icon: icon || '📁',
      order: newOrder,
      userId: req.userId
    });

    await folder.save();

    res.status(201).json({
      message: 'Ordner erfolgreich erstellt',
      folder: {
        ...folder.toObject(),
        contractCount: 0
      }
    });
  } catch (error) {
    console.error('❌ Error creating folder:', error);
    res.status(500).json({ error: 'Fehler beim Erstellen des Ordners' });
  }
});

// ✅ PATCH /api/folders/:id - Update folder
router.patch('/:id', verifyToken, async (req, res) => {
  try {
    const { name, color, icon, order } = req.body;

    const folder = await Folder.findOne({
      _id: req.params.id,
      userId: req.userId
    });

    if (!folder) {
      return res.status(404).json({ error: 'Ordner nicht gefunden' });
    }

    if (name !== undefined) folder.name = name.trim();
    if (color !== undefined) folder.color = color;
    if (icon !== undefined) folder.icon = icon;
    if (order !== undefined) folder.order = order;

    await folder.save();

    const contractCount = await Contract.countDocuments({
      userId: req.userId,
      folderId: folder._id
    });

    res.json({
      message: 'Ordner erfolgreich aktualisiert',
      folder: {
        ...folder.toObject(),
        contractCount
      }
    });
  } catch (error) {
    console.error('❌ Error updating folder:', error);
    res.status(500).json({ error: 'Fehler beim Aktualisieren des Ordners' });
  }
});

// ✅ DELETE /api/folders/:id - Delete folder (moves contracts to "no folder")
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const folder = await Folder.findOne({
      _id: req.params.id,
      userId: req.userId
    });

    if (!folder) {
      return res.status(404).json({ error: 'Ordner nicht gefunden' });
    }

    // Move all contracts in this folder to "no folder"
    await Contract.updateMany(
      { userId: req.userId, folderId: folder._id },
      { $set: { folderId: null } }
    );

    await Folder.deleteOne({ _id: folder._id });

    res.json({
      message: 'Ordner erfolgreich gelöscht',
      deletedId: folder._id
    });
  } catch (error) {
    console.error('❌ Error deleting folder:', error);
    res.status(500).json({ error: 'Fehler beim Löschen des Ordners' });
  }
});

// ✅ POST /api/folders/smart-suggest - Suggest smart folders based on contracts
router.post('/smart-suggest', verifyToken, async (req, res) => {
  try {
    // Get all contracts without folder
    const contracts = await Contract.find({
      userId: req.userId,
      folderId: null
    });

    // Categorization logic
    const categories = {
      'Abo-Verträge': {
        icon: '💰',
        color: '#10b981',
        contracts: []
      },
      'Rechnungen': {
        icon: '📄',
        color: '#3b82f6',
        contracts: []
      },
      'Versicherungen': {
        icon: '🛡️',
        color: '#f59e0b',
        contracts: []
      },
      'Mietverträge': {
        icon: '🏠',
        color: '#8b5cf6',
        contracts: []
      },
      'Streaming & Abos': {
        icon: '🎬',
        color: '#ec4899',
        contracts: []
      }
    };

    // Categorize contracts
    contracts.forEach(contract => {
      const name = contract.name?.toLowerCase() || '';

      // Check for subscriptions/recurring
      const recurringKeywords = ['abo', 'abonnement', 'subscription', 'netflix', 'spotify', 'disney', 'amazon prime'];
      if (contract.contractType === 'recurring' || recurringKeywords.some(kw => name.includes(kw))) {
        // Further categorize streaming services
        const streamingKeywords = ['netflix', 'spotify', 'disney', 'amazon prime', 'youtube', 'twitch'];
        if (streamingKeywords.some(kw => name.includes(kw))) {
          categories['Streaming & Abos'].contracts.push(contract);
        } else {
          categories['Abo-Verträge'].contracts.push(contract);
        }
        return;
      }

      // Check for invoices
      const invoiceKeywords = ['rechnung', 'invoice', 're-', 're_', '_re'];
      if (contract.contractType === 'one-time' || invoiceKeywords.some(kw => name.includes(kw))) {
        categories['Rechnungen'].contracts.push(contract);
        return;
      }

      // Check for insurance
      const insuranceKeywords = ['versicherung', 'insurance', 'allianz', 'axa', 'huk'];
      if (insuranceKeywords.some(kw => name.includes(kw))) {
        categories['Versicherungen'].contracts.push(contract);
        return;
      }

      // Check for rent
      const rentKeywords = ['miet', 'miete', 'vermietung', 'wohnung', 'apartment'];
      if (rentKeywords.some(kw => name.includes(kw))) {
        categories['Mietverträge'].contracts.push(contract);
        return;
      }
    });

    // Filter out empty categories
    const suggestions = Object.entries(categories)
      .filter(([_, data]) => data.contracts.length > 0)
      .map(([name, data]) => ({
        name,
        icon: data.icon,
        color: data.color,
        contractCount: data.contracts.length,
        contractIds: data.contracts.map(c => c._id)
      }));

    res.json({
      suggestions,
      totalContracts: contracts.length,
      categorizedCount: suggestions.reduce((sum, s) => sum + s.contractCount, 0)
    });
  } catch (error) {
    console.error('❌ Error generating smart folder suggestions:', error);
    res.status(500).json({ error: 'Fehler beim Generieren der Vorschläge' });
  }
});

// ✅ POST /api/folders/smart-create - Create smart folders and assign contracts
router.post('/smart-create', verifyToken, async (req, res) => {
  try {
    const { folders } = req.body; // Array of { name, icon, color, contractIds }

    if (!folders || !Array.isArray(folders)) {
      return res.status(400).json({ error: 'Ungültiges Format' });
    }

    const createdFolders = [];

    // Get highest order number
    const lastFolder = await Folder.findOne({ userId: req.userId })
      .sort({ order: -1 })
      .limit(1);

    let currentOrder = lastFolder ? lastFolder.order + 1 : 0;

    for (const folderData of folders) {
      // Create folder
      const folder = new Folder({
        name: folderData.name,
        color: folderData.color,
        icon: folderData.icon,
        order: currentOrder++,
        userId: req.userId
      });

      await folder.save();

      // Assign contracts to folder
      if (folderData.contractIds && folderData.contractIds.length > 0) {
        await Contract.updateMany(
          {
            _id: { $in: folderData.contractIds },
            userId: req.userId,
            folderId: null // Only move contracts that don't have a folder yet
          },
          { $set: { folderId: folder._id } }
        );
      }

      createdFolders.push({
        ...folder.toObject(),
        contractCount: folderData.contractIds?.length || 0
      });
    }

    res.status(201).json({
      message: `${createdFolders.length} Ordner erfolgreich erstellt`,
      folders: createdFolders
    });
  } catch (error) {
    console.error('❌ Error creating smart folders:', error);
    res.status(500).json({ error: 'Fehler beim Erstellen der Ordner' });
  }
});

module.exports = router;
