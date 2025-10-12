// 📁 routes/folders.js - Folder Management Routes
const express = require('express');
const router = express.Router();
const Folder = require('../models/Folder');
const Contract = require('../models/Contract');
const verifyToken = require('../middleware/verifyToken');
const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

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
    console.log('🤖 Smart Folders: Starting analysis for user', req.userId);

    // Get ALL contracts for analysis
    const contracts = await Contract.find({
      userId: req.userId
    }).select('name contractType folderId');

    console.log(`📊 Found ${contracts.length} contracts to analyze`);

    if (contracts.length === 0) {
      console.log('⚠️ No contracts found, returning empty suggestions');
      return res.json({ suggestions: [], totalContracts: 0, categorizedCount: 0 });
    }

    // Get existing folders to avoid duplicates
    const existingFolders = await Folder.find({ userId: req.userId }).select('name');
    const existingFolderNames = existingFolders.map(f => f.name.toLowerCase());

    console.log(`📁 Existing folders: ${existingFolderNames.join(', ') || 'None'}`);

    // Prepare contract list for OpenAI (limit to 100 for performance)
    const contractSample = contracts.slice(0, 100).map(c => c.name);

    console.log(`🎯 Sending ${contractSample.length} contracts to OpenAI for categorization...`);

    // 🤖 OpenAI Smart Categorization
    const prompt = `Analysiere diese ${contractSample.length} Vertragsnamen und schlage 3-5 sinnvolle Ordner-Kategorien vor.

VERTRAGSNAMEN:
${contractSample.join('\n')}

BESTEHENDE ORDNER (nicht vorschlagen):
${existingFolderNames.join(', ') || 'Keine'}

ANFORDERUNGEN:
- Vorschläge auf Deutsch
- Maximal 5 Kategorien
- Jede Kategorie sollte mindestens 3 Verträge enthalten
- Passende Emojis als Icons
- Sinnvolle Hex-Farben

ANTWORT-FORMAT (NUR JSON, KEINE ERKLÄRUNGEN):
{
  "categories": [
    {
      "name": "Kategoriename",
      "icon": "📁",
      "color": "#667eea",
      "keywords": ["keyword1", "keyword2"]
    }
  ]
}`;

    const aiResponse = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'Du bist ein Experte für Vertragsorganisation. Antworte NUR mit validem JSON.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 1000
    });

    const aiContent = aiResponse.choices[0].message.content.trim();
    console.log('🤖 OpenAI Response:', aiContent.substring(0, 200) + '...');

    let aiCategories;

    try {
      // Extract JSON from response (in case GPT adds markdown)
      const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
      aiCategories = JSON.parse(jsonMatch ? jsonMatch[0] : aiContent);
      console.log(`✅ Parsed ${aiCategories.categories?.length || 0} AI categories`);
    } catch (parseError) {
      console.error('❌ Failed to parse OpenAI response:', aiContent);
      // Fallback to keyword-based
      throw new Error('KI-Antwort konnte nicht verarbeitet werden');
    }

    // Match contracts to AI categories
    const categorizedSuggestions = aiCategories.categories.map(category => {
      const matchedContracts = contracts.filter(contract => {
        const name = contract.name?.toLowerCase() || '';
        return category.keywords.some(kw => name.includes(kw.toLowerCase()));
      });

      console.log(`📂 Category "${category.name}": ${matchedContracts.length} contracts matched`);

      return {
        name: category.name,
        icon: category.icon,
        color: category.color,
        contractCount: matchedContracts.length,
        contractIds: matchedContracts.map(c => c._id),
        contracts: matchedContracts
      };
    }).filter(cat => cat.contractCount >= 3); // Only suggest categories with 3+ contracts

    console.log(`✅ Returning ${categorizedSuggestions.length} suggestions (filtered for 3+ contracts)`);

    res.json({
      suggestions: categorizedSuggestions,
      totalContracts: contracts.length,
      categorizedCount: categorizedSuggestions.reduce((sum, s) => sum + s.contractCount, 0)
    });
  } catch (error) {
    console.error('❌ Error generating smart folder suggestions:', error);
    res.status(500).json({ error: 'Fehler beim Generieren der Vorschläge' });
  }
});

// ✅ POST /api/folders/smart-create - Create smart folders and assign contracts
router.post('/smart-create', verifyToken, async (req, res) => {
  try {
    const { suggestions } = req.body; // Array of SmartFolderSuggestion

    if (!suggestions || !Array.isArray(suggestions)) {
      return res.status(400).json({ error: 'Ungültiges Format' });
    }

    const createdFolders = [];

    // Get highest order number
    const lastFolder = await Folder.findOne({ userId: req.userId })
      .sort({ order: -1 })
      .limit(1);

    let currentOrder = lastFolder ? lastFolder.order + 1 : 0;

    for (const suggestion of suggestions) {
      // Create folder
      const folder = new Folder({
        name: suggestion.name,
        color: suggestion.color,
        icon: suggestion.icon,
        order: currentOrder++,
        userId: req.userId
      });

      await folder.save();

      // Assign contracts to folder (extract IDs from contracts array)
      const contractIds = suggestion.contracts.map(c => c._id);

      if (contractIds && contractIds.length > 0) {
        await Contract.updateMany(
          {
            _id: { $in: contractIds },
            userId: req.userId
            // REMOVED: folderId: null - Allow reassignment if user wants
          },
          { $set: { folderId: folder._id } }
        );
      }

      createdFolders.push({
        ...folder.toObject(),
        contractCount: contractIds.length
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
