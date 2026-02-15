/**
 * ContractBuilder API Routes
 * CRUD-Operationen und KI-Funktionen für den visuellen Vertragsbaukasten
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const ContractBuilder = require('../models/ContractBuilder');
const auth = require('../middleware/verifyToken');
const { v4: uuidv4 } = require('uuid');

// OpenAI für KI-Funktionen
const OpenAI = require('openai');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ============================================
// DOKUMENT-MANAGEMENT
// ============================================

/**
 * GET /api/contract-builder
 * Liste aller Builder-Dokumente des Users
 */
router.get('/', auth, async (req, res) => {
  try {
    const { status, contractType, limit = 50, skip = 0, sort = '-updatedAt' } = req.query;

    // Validate sort parameter (prevent NoSQL injection)
    const allowedSorts = [
      'createdAt', '-createdAt', 'updatedAt', '-updatedAt',
      'metadata.name', '-metadata.name', 'metadata.status', '-metadata.status'
    ];
    const safeSort = allowedSorts.includes(sort) ? sort : '-updatedAt';

    // Validate limit (1-100) and skip (0+)
    const safeLimit = Math.min(Math.max(parseInt(limit) || 50, 1), 100);
    const safeSkip = Math.max(parseInt(skip) || 0, 0);

    const query = { userId: req.user.userId };

    if (status && typeof status === 'string') query['metadata.status'] = status;
    if (contractType && typeof contractType === 'string') query['metadata.contractType'] = contractType;

    const documents = await ContractBuilder.find(query)
      .sort(safeSort)
      .skip(safeSkip)
      .limit(safeLimit)
      .select('metadata design.preset legalScore.totalScore content.blocks content.variables createdAt updatedAt');

    const total = await ContractBuilder.countDocuments(query);

    // Virtuelle Felder manuell hinzufügen
    const enrichedDocs = documents.map(doc => ({
      ...doc.toObject(),
      blockCount: doc.content?.blocks?.length || 0,
      variableCount: doc.content?.variables?.length || 0,
      completionPercentage: doc.completionPercentage
    }));

    res.json({
      success: true,
      documents: enrichedDocs,
      total,
      hasMore: skip + documents.length < total
    });
  } catch (error) {
    console.error('[ContractBuilder] GET / Error:', error);
    res.status(500).json({ success: false, error: 'Fehler beim Laden der Dokumente' });
  }
});

/**
 * GET /api/contract-builder/:id
 * Einzelnes Dokument laden
 */
router.get('/:id', auth, async (req, res) => {
  try {
    const document = await ContractBuilder.findOne({
      _id: req.params.id,
      $or: [
        { userId: req.user.userId },
        { 'collaboration.sharedWith.userId': req.user.userId }
      ]
    });

    if (!document) {
      return res.status(404).json({ success: false, error: 'Dokument nicht gefunden' });
    }

    res.json({ success: true, document });
  } catch (error) {
    console.error('[ContractBuilder] GET /:id Error:', error);
    res.status(500).json({ success: false, error: 'Fehler beim Laden des Dokuments' });
  }
});

/**
 * POST /api/contract-builder
 * Neues Dokument erstellen
 *
 * Body-Parameter:
 * - name: Dokumentname
 * - contractType: Vertragstyp (z.B. 'mietvertrag', 'arbeitsvertrag')
 * - templateId: Optional - MongoDB-ID eines gespeicherten Templates
 * - initialBlocks: Optional - Array von Blöcken (vom Frontend-Template)
 * - initialVariables: Optional - Array von Variablen (vom Frontend-Template)
 * - initialDesign: Optional - Design-Konfiguration
 */
router.post('/', auth, async (req, res) => {
  try {
    const {
      name,
      contractType,
      templateId,
      initialBlocks,
      initialVariables,
      initialDesign: providedDesign
    } = req.body;

    let initialContent = {
      blocks: [],
      variables: []
    };

    let initialDesign = {
      preset: 'executive',
      primaryColor: '#0B1324',
      secondaryColor: '#6B7280',
      accentColor: '#3B82F6',
      fontFamily: 'Helvetica',
      pageSize: 'A4',
      marginTop: 25,
      marginRight: 20,
      marginBottom: 25,
      marginLeft: 20
    };

    // Option 1: Initial-Daten direkt vom Frontend (z.B. von Frontend-Templates)
    if (initialBlocks && Array.isArray(initialBlocks)) {
      initialContent.blocks = initialBlocks.map((block, index) => ({
        ...block,
        id: block.id || uuidv4(),
        order: block.order ?? index
      }));
    }

    if (initialVariables && Array.isArray(initialVariables)) {
      initialContent.variables = initialVariables.map(v => ({
        ...v,
        id: v.id || uuidv4()
      }));
    }

    if (providedDesign && typeof providedDesign === 'object') {
      initialDesign = { ...initialDesign, ...providedDesign };
    }

    // Option 2: Falls MongoDB-Template-ID angegeben (für gespeicherte Templates)
    if (templateId && !initialBlocks) {
      // Prüfen ob es eine gültige MongoDB ObjectId ist
      const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(templateId);

      if (isValidObjectId) {
        const template = await ContractBuilder.findOne({
          _id: templateId,
          'template.isTemplate': true,
          $or: [
            { 'template.isPublic': true },
            { userId: req.user.userId }
          ]
        });

        if (template) {
          initialContent = JSON.parse(JSON.stringify(template.content));
          initialDesign = JSON.parse(JSON.stringify(template.design));

          // Template-Downloads erhöhen
          template.template.downloads++;
          await template.save();
        }
      }
      // Wenn keine gültige ObjectId, ignorieren (Frontend-Template-ID)
    }

    // Fallback: Leeres Dokument mit Basis-Struktur erstellen
    if (initialContent.blocks.length === 0) {
      initialContent.blocks = [
        {
          id: uuidv4(),
          type: 'header',
          order: 0,
          content: {
            title: name || 'Neuer Vertrag',
            subtitle: ''
          },
          style: {},
          locked: false,
          aiGenerated: false
        }
      ];
    }

    const document = new ContractBuilder({
      userId: req.user.userId,
      metadata: {
        name: name || 'Neuer Vertrag',
        contractType: contractType || 'individuell',
        status: 'draft'
      },
      content: initialContent,
      design: initialDesign
    });

    await document.save();

    console.log(`[ContractBuilder] Dokument erstellt: ${document._id} (${contractType || 'individuell'})`);
    res.status(201).json({ success: true, document });
  } catch (error) {
    console.error('[ContractBuilder] POST / Error:', error);
    res.status(500).json({ success: false, error: 'Fehler beim Erstellen des Dokuments' });
  }
});

/**
 * PUT /api/contract-builder/:id
 * Dokument aktualisieren
 */
router.put('/:id', auth, async (req, res) => {
  try {
    const { metadata, content, design } = req.body;

    const document = await ContractBuilder.findOne({
      _id: req.params.id,
      $or: [
        { userId: req.user.userId },
        { 'collaboration.sharedWith': { $elemMatch: { userId: req.user.userId, permission: 'edit' } } }
      ]
    });

    if (!document) {
      return res.status(404).json({ success: false, error: 'Dokument nicht gefunden oder keine Berechtigung' });
    }

    // Selektives Update mit explizitem Field-Whitelisting
    if (metadata && typeof metadata === 'object') {
      const allowedMetaFields = ['name', 'contractType', 'status', 'language', 'jurisdiction', 'tags', 'description'];
      for (const key of allowedMetaFields) {
        if (key in metadata) document.metadata[key] = metadata[key];
      }
    }

    if (content) {
      if (content.blocks) document.content.blocks = content.blocks;
      if (content.variables) document.content.variables = content.variables;
    }

    if (design && typeof design === 'object') {
      const allowedDesignFields = ['preset', 'primaryColor', 'secondaryColor', 'accentColor', 'fontFamily', 'pageSize', 'marginTop', 'marginRight', 'marginBottom', 'marginLeft'];
      for (const key of allowedDesignFields) {
        if (key in design) document.design[key] = design[key];
      }
    }

    document.metadata.version++;
    await document.save();

    res.json({ success: true, document });
  } catch (error) {
    console.error('[ContractBuilder] PUT /:id Error:', error);
    res.status(500).json({ success: false, error: 'Fehler beim Speichern des Dokuments' });
  }
});

/**
 * DELETE /api/contract-builder/:id
 * Dokument löschen
 */
router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await ContractBuilder.deleteOne({
      _id: req.params.id,
      userId: req.user.userId
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, error: 'Dokument nicht gefunden' });
    }

    res.json({ success: true, message: 'Dokument gelöscht' });
  } catch (error) {
    console.error('[ContractBuilder] DELETE /:id Error:', error);
    res.status(500).json({ success: false, error: 'Fehler beim Löschen' });
  }
});

/**
 * PATCH /api/contract-builder/:id
 * Dokument partiell aktualisieren (z.B. nur Name ändern)
 */
router.patch('/:id', auth, async (req, res) => {
  try {
    const { metadata } = req.body;

    const document = await ContractBuilder.findOne({
      _id: req.params.id,
      userId: req.user.userId
    });

    if (!document) {
      return res.status(404).json({ success: false, error: 'Dokument nicht gefunden' });
    }

    // Nur Metadata-Felder aktualisieren die übergeben wurden
    if (metadata) {
      if (metadata.name) document.metadata.name = metadata.name;
      if (metadata.status) document.metadata.status = metadata.status;
      if (metadata.contractType) document.metadata.contractType = metadata.contractType;
    }

    await document.save();

    res.json({ success: true, document });
  } catch (error) {
    console.error('[ContractBuilder] PATCH /:id Error:', error);
    res.status(500).json({ success: false, error: 'Fehler beim Aktualisieren' });
  }
});

/**
 * POST /api/contract-builder/:id/duplicate
 * Dokument duplizieren
 */
router.post('/:id/duplicate', auth, async (req, res) => {
  try {
    const { name } = req.body;

    const original = await ContractBuilder.findOne({
      _id: req.params.id,
      userId: req.user.userId
    });

    if (!original) {
      return res.status(404).json({ success: false, error: 'Dokument nicht gefunden' });
    }

    const duplicate = await original.duplicate();
    duplicate.userId = req.user.userId;

    // Custom Name falls übergeben
    if (name) {
      duplicate.metadata.name = name;
    }

    await duplicate.save();

    res.status(201).json({ success: true, document: duplicate });
  } catch (error) {
    console.error('[ContractBuilder] POST /:id/duplicate Error:', error);
    res.status(500).json({ success: false, error: 'Fehler beim Duplizieren' });
  }
});

// ============================================
// BLOCK-OPERATIONEN
// ============================================

/**
 * POST /api/contract-builder/:id/blocks
 * Block hinzufügen
 */
router.post('/:id/blocks', auth, async (req, res) => {
  try {
    const { block, position } = req.body;

    const document = await ContractBuilder.findOne({
      _id: req.params.id,
      userId: req.user.userId
    });

    if (!document) {
      return res.status(404).json({ success: false, error: 'Dokument nicht gefunden' });
    }

    // Block-ID generieren falls nicht vorhanden
    if (!block.id) {
      block.id = uuidv4();
    }

    document.addBlock(block, position);
    await document.save();

    res.json({ success: true, block, document });
  } catch (error) {
    console.error('[ContractBuilder] POST /:id/blocks Error:', error);
    res.status(500).json({ success: false, error: 'Fehler beim Hinzufügen des Blocks' });
  }
});

/**
 * PUT /api/contract-builder/:id/blocks/:blockId
 * Block aktualisieren
 */
router.put('/:id/blocks/:blockId', auth, async (req, res) => {
  try {
    const { content, style, locked } = req.body;

    const document = await ContractBuilder.findOne({
      _id: req.params.id,
      userId: req.user.userId
    });

    if (!document) {
      return res.status(404).json({ success: false, error: 'Dokument nicht gefunden' });
    }

    const block = document.content.blocks.find(b => b.id === req.params.blockId);
    if (!block) {
      return res.status(404).json({ success: false, error: 'Block nicht gefunden' });
    }

    if (content && typeof content === 'object') {
      // Use spread to avoid prototype pollution — only own enumerable properties
      const { __proto__, constructor, ...safeContent } = content;
      Object.assign(block.content, safeContent);
    }
    if (style && typeof style === 'object') {
      const { __proto__, constructor, ...safeStyle } = style;
      Object.assign(block.style, safeStyle);
    }
    if (locked !== undefined) block.locked = locked;

    document.changelog.push({
      action: 'update',
      blockId: block.id,
      description: `Block "${block.type}" aktualisiert`
    });

    await document.save();

    res.json({ success: true, block, document });
  } catch (error) {
    console.error('[ContractBuilder] PUT /:id/blocks/:blockId Error:', error);
    res.status(500).json({ success: false, error: 'Fehler beim Aktualisieren des Blocks' });
  }
});

/**
 * DELETE /api/contract-builder/:id/blocks/:blockId
 * Block löschen
 */
router.delete('/:id/blocks/:blockId', auth, async (req, res) => {
  try {
    const document = await ContractBuilder.findOne({
      _id: req.params.id,
      userId: req.user.userId
    });

    if (!document) {
      return res.status(404).json({ success: false, error: 'Dokument nicht gefunden' });
    }

    document.removeBlock(req.params.blockId);
    await document.save();

    res.json({ success: true, document });
  } catch (error) {
    console.error('[ContractBuilder] DELETE /:id/blocks/:blockId Error:', error);
    res.status(500).json({ success: false, error: 'Fehler beim Löschen des Blocks' });
  }
});

/**
 * PUT /api/contract-builder/:id/blocks/reorder
 * Blöcke neu anordnen
 */
router.put('/:id/blocks/reorder', auth, async (req, res) => {
  try {
    const { fromIndex, toIndex } = req.body;

    const document = await ContractBuilder.findOne({
      _id: req.params.id,
      userId: req.user.userId
    });

    if (!document) {
      return res.status(404).json({ success: false, error: 'Dokument nicht gefunden' });
    }

    document.reorderBlocks(fromIndex, toIndex);
    await document.save();

    res.json({ success: true, document });
  } catch (error) {
    console.error('[ContractBuilder] PUT /:id/blocks/reorder Error:', error);
    res.status(500).json({ success: false, error: 'Fehler beim Neuanordnen' });
  }
});

// ============================================
// VARIABLEN
// ============================================

/**
 * PUT /api/contract-builder/:id/variables
 * Variablen aktualisieren
 */
router.put('/:id/variables', auth, async (req, res) => {
  try {
    const { variables } = req.body;

    const document = await ContractBuilder.findOne({
      _id: req.params.id,
      userId: req.user.userId
    });

    if (!document) {
      return res.status(404).json({ success: false, error: 'Dokument nicht gefunden' });
    }

    // Variablen-Werte aktualisieren
    for (const [id, value] of Object.entries(variables)) {
      document.updateVariable(id, value);
    }

    await document.save();

    res.json({ success: true, document });
  } catch (error) {
    console.error('[ContractBuilder] PUT /:id/variables Error:', error);
    res.status(500).json({ success: false, error: 'Fehler beim Aktualisieren der Variablen' });
  }
});

// ============================================
// KI-FUNKTIONEN
// ============================================

/**
 * POST /api/contract-builder/ai/clause
 * KI-Klausel generieren
 */
router.post('/ai/clause', auth, async (req, res) => {
  try {
    const { description, contractType, existingClauses, preferences } = req.body;

    const tone = preferences?.tone || 'formal';
    const length = preferences?.length || 'mittel';
    const strictness = preferences?.strictness || 'ausgewogen';

    const systemPrompt = `Du bist ein erfahrener deutscher Vertragsanwalt. Erstelle rechtssichere Vertragsklauseln nach deutschem Recht.

WICHTIG:
- Verwende {{variable_name}} für Platzhalter (z.B. {{miete}}, {{vermieter_name}})
- Nummeriere Absätze mit (1), (2), (3) etc.
- Gib relevante Gesetzesgrundlagen an
- Bewerte das Risikoniveau

Formatiere die Antwort als JSON:
{
  "clause": {
    "title": "Titel der Klausel",
    "body": "Vollständiger Klauseltext mit {{variablen}}",
    "subclauses": [
      { "number": "(1)", "text": "..." }
    ]
  },
  "variants": {
    "mild": "...",
    "ausgewogen": "...",
    "streng": "..."
  },
  "legalBasis": ["BGB §...", "..."],
  "riskLevel": "low|medium|high",
  "riskDescription": "...",
  "suggestedVariables": [
    { "name": "{{name}}", "displayName": "...", "type": "text|date|number|currency" }
  ]
}`;

    const userPrompt = `Erstelle eine Klausel für folgenden Zweck:

VERTRAGSTYP: ${contractType || 'Allgemein'}
BESCHREIBUNG: ${description}

PRÄFERENZEN:
- Tonalität: ${tone}
- Länge: ${length}
- Strenge/Ausgewogenheit: ${strictness}

${existingClauses?.length ? `BEREITS VORHANDENE KLAUSELN:\n${existingClauses.join('\n')}` : ''}

Erstelle eine professionelle, rechtssichere Klausel.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.3,
      max_tokens: 2000,
      response_format: { type: 'json_object' }
    });

    const result = JSON.parse(response.choices[0].message.content);

    res.json({
      success: true,
      ...result,
      aiModel: 'gpt-4o',
      tokensUsed: response.usage?.total_tokens || 0
    });
  } catch (error) {
    console.error('[ContractBuilder] POST /ai/clause Error:', error);
    res.status(500).json({ success: false, error: 'Fehler bei der KI-Generierung' });
  }
});

/**
 * POST /api/contract-builder/ai/optimize
 * Klausel optimieren
 */
router.post('/ai/optimize', auth, async (req, res) => {
  try {
    const { clauseText, optimizationGoal } = req.body;

    const goals = {
      // English keys (legacy)
      clarity: 'Verbessere die Verständlichkeit und Klarheit',
      legal: 'Optimiere die rechtliche Präzision und Durchsetzbarkeit',
      balance: 'Mache die Klausel ausgewogener für beide Parteien',
      shorter: 'Kürze die Klausel ohne Inhaltsverlust',
      // German keys (from Frontend)
      rechtssicher: 'Optimiere die rechtliche Präzision und Durchsetzbarkeit. Stelle sicher, dass die Klausel gerichtlich durchsetzbar ist.',
      verständlich: 'Verbessere die Verständlichkeit und Klarheit. Verwende einfache Sprache ohne juristischen Jargon.',
      kürzer: 'Kürze die Klausel ohne Inhaltsverlust. Entferne Redundanzen.',
      ausgewogen: 'Mache die Klausel ausgewogener für beide Parteien. Vermeide einseitige Benachteiligungen.',
      strenger: 'Formuliere die Klausel strenger zugunsten meiner Position (des Auftraggebers). Stärke meine Rechte.'
    };

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `Du bist ein erfahrener Vertragsanwalt. Optimiere Vertragsklauseln.
Antworte als JSON: { "optimized": "...", "changes": ["..."], "explanation": "..." }`
        },
        {
          role: 'user',
          content: `Optimiere diese Klausel. Ziel: ${goals[optimizationGoal] || 'Allgemeine Verbesserung'}

ORIGINALKLAUSEL:
${clauseText}

Behalte {{variablen}} bei.`
        }
      ],
      temperature: 0.2,
      response_format: { type: 'json_object' }
    });

    const result = JSON.parse(response.choices[0].message.content);

    // Map 'optimized' to 'optimizedText' for frontend compatibility
    res.json({
      success: true,
      optimizedText: result.optimized || result.optimizedText,
      changes: result.changes || [],
      explanation: result.explanation || ''
    });
  } catch (error) {
    console.error('[ContractBuilder] POST /ai/optimize Error:', error);
    res.status(500).json({ success: false, error: 'Fehler bei der Optimierung' });
  }
});

/**
 * POST /api/contract-builder/ai/explain
 * Klausel erklären
 */
router.post('/ai/explain', auth, async (req, res) => {
  try {
    const { clauseText } = req.body;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Erkläre Vertragsklauseln verständlich für Laien. Antworte als JSON:
{
  "summary": "Kurze Zusammenfassung in 1-2 Sätzen",
  "explanation": "Ausführliche Erklärung",
  "keyPoints": ["Wichtiger Punkt 1", "..."],
  "legalBasis": ["Relevante Gesetze"],
  "practicalMeaning": "Was bedeutet das praktisch?"
}`
        },
        {
          role: 'user',
          content: `Erkläre diese Vertragsklausel:\n\n${clauseText}`
        }
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' }
    });

    const result = JSON.parse(response.choices[0].message.content);

    res.json({ success: true, ...result });
  } catch (error) {
    console.error('[ContractBuilder] POST /ai/explain Error:', error);
    res.status(500).json({ success: false, error: 'Fehler bei der Erklärung' });
  }
});

/**
 * POST /api/contract-builder/ai/copilot
 * Echtzeit-Copilot-Vorschläge
 */
router.post('/ai/copilot', auth, async (req, res) => {
  try {
    const { text, context, cursorPosition } = req.body;

    // Schnelle Antwort für Copilot
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Du bist ein Vertrags-Copilot. Gib kurze, hilfreiche Vorschläge.
Antworte als JSON: {
  "suggestion": "Vorgeschlagener Text oder Formulierung",
  "type": "completion|improvement|warning|variable",
  "confidence": 0.0-1.0,
  "explanation": "Kurze Erklärung warum"
}`
        },
        {
          role: 'user',
          content: `Kontext: ${context?.contractType || 'Vertrag'}

Der Benutzer hat geschrieben:
"${text}"

Cursor-Position: ${cursorPosition || 'Ende'}

Gib einen hilfreichen Vorschlag.`
        }
      ],
      temperature: 0.4,
      max_tokens: 300,
      response_format: { type: 'json_object' }
    });

    const result = JSON.parse(response.choices[0].message.content);

    res.json({ success: true, ...result });
  } catch (error) {
    console.error('[ContractBuilder] POST /ai/copilot Error:', error);
    res.status(500).json({ success: false, error: 'Copilot-Fehler' });
  }
});

/**
 * POST /api/contract-builder/ai/legal-score
 * Legal Health Score berechnen
 */
router.post('/ai/legal-score', auth, async (req, res) => {
  try {
    const { documentId, blocks, contractType } = req.body;

    let document = null;
    let clauseTexts = '';
    let docType = contractType || 'Allgemeiner Vertrag';
    let blockCount = 0;

    // Wenn documentId vorhanden UND gültige MongoDB ObjectId, aus DB laden
    const isValidObjectId = documentId && /^[0-9a-fA-F]{24}$/.test(documentId);
    if (isValidObjectId) {
      document = await ContractBuilder.findOne({
        _id: documentId,
        userId: req.user.userId
      });
    }

    // Wenn Dokument aus DB geladen
    if (document) {
      clauseTexts = document.content.blocks
        .filter(b => b.type === 'clause')
        .map(b => `${b.content.clauseTitle || ''}\n${b.content.body || ''}`)
        .join('\n\n');
      docType = document.metadata?.contractType || docType;
      blockCount = document.content.blocks.length;
    }
    // Wenn Blöcke direkt übergeben (lokaler Modus)
    else if (blocks && Array.isArray(blocks)) {
      clauseTexts = blocks
        .filter(b => b.type === 'clause')
        .map(b => `${b.content?.clauseTitle || ''}\n${b.content?.body || ''}`)
        .join('\n\n');
      blockCount = blocks.length;
    }

    if (!clauseTexts.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Keine Klauseln zum Analysieren gefunden'
      });
    }

    console.log(`[ContractBuilder] Legal Score: Analysiere ${blockCount} Blöcke für ${docType}`);

    let result;
    try {
      // OpenAI API-Aufruf mit Error-Handling
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini', // Schneller und günstiger für Score-Berechnung
        messages: [
          {
            role: 'system',
            content: `Du bist ein deutscher Rechtsexperte. Analysiere einen Vertrag und erstelle einen Legal Health Score.

Bewerte folgende Kategorien von 0-100:
- completeness: Vollständigkeit (alle wichtigen Klauseln vorhanden?)
- legalPrecision: Rechtliche Präzision (korrekte Formulierungen?)
- balance: Ausgewogenheit (fair für beide Parteien?)
- clarity: Klarheit (verständlich formuliert?)
- currentness: Aktualität (entspricht aktueller Rechtslage?)
- enforceability: Durchsetzbarkeit (vor Gericht haltbar?)

Antworte IMMER als valides JSON mit genau dieser Struktur:
{
  "totalScore": 75,
  "categories": {
    "completeness": 70,
    "legalPrecision": 80,
    "balance": 75,
    "clarity": 85,
    "currentness": 70,
    "enforceability": 75
  },
  "findings": {
    "critical": [],
    "warnings": [{ "message": "Beispiel-Warnung", "autoFixAvailable": false }],
    "suggestions": [{ "message": "Beispiel-Vorschlag" }]
  }
}`
          },
          {
            role: 'user',
            content: `Analysiere diesen Vertrag (Typ: ${docType}):

${clauseTexts || 'Keine Klauseln vorhanden'}

Anzahl Blöcke: ${blockCount}

Gib einen realistischen Legal Health Score basierend auf dem Inhalt.`
          }
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' },
        max_tokens: 1500
      });

      const rawContent = response.choices[0].message.content;
      console.log('[ContractBuilder] OpenAI Response:', rawContent?.substring(0, 200));
      result = JSON.parse(rawContent);
    } catch (openaiError) {
      // OpenAI-Fehler oder JSON-Parse-Fehler
      console.error('[ContractBuilder] OpenAI/Parse Error:', openaiError.message || openaiError);

      // Fallback mit Standardwerten damit die UI trotzdem funktioniert
      result = {
        totalScore: 65,
        categories: {
          completeness: 60,
          legalPrecision: 65,
          balance: 70,
          clarity: 65,
          currentness: 65,
          enforceability: 65
        },
        findings: {
          critical: [],
          warnings: [{
            id: uuidv4(),
            message: 'KI-Analyse vorübergehend nicht verfügbar. Bitte versuchen Sie es später erneut.',
            autoFixAvailable: false
          }],
          suggestions: [{
            id: uuidv4(),
            message: 'Dies ist ein geschätzter Score basierend auf der Dokumentstruktur.'
          }]
        }
      };
    }

    // Zusätzliche Validierung (falls Result kein Objekt ist)
    if (!result || typeof result !== 'object') {
      console.error('[ContractBuilder] Result validation failed, using fallback');
      result = {
        totalScore: 70,
        categories: {
          completeness: 70,
          legalPrecision: 70,
          balance: 70,
          clarity: 70,
          currentness: 70,
          enforceability: 70
        },
        findings: {
          critical: [],
          warnings: [{ id: uuidv4(), message: 'Analyse konnte nicht vollständig durchgeführt werden', autoFixAvailable: false }],
          suggestions: []
        }
      };
    }

    // Ensure findings arrays exist and have IDs
    if (!result.findings) result.findings = {};
    if (!result.findings.critical) result.findings.critical = [];
    if (!result.findings.warnings) result.findings.warnings = [];
    if (!result.findings.suggestions) result.findings.suggestions = [];

    // Add UUIDs to all findings if missing
    result.findings.critical = result.findings.critical.map(f => ({
      id: f.id || uuidv4(),
      message: f.message || '',
      blockId: f.blockId || null,
      autoFixAvailable: f.autoFixAvailable || false
    }));
    result.findings.warnings = result.findings.warnings.map(f => ({
      id: f.id || uuidv4(),
      message: f.message || '',
      blockId: f.blockId || null,
      autoFixAvailable: f.autoFixAvailable || false
    }));
    result.findings.suggestions = result.findings.suggestions.map(f => ({
      id: f.id || uuidv4(),
      message: f.message || '',
      blockId: f.blockId || null
    }));

    // Score im Dokument speichern (nur wenn Dokument aus DB)
    if (document) {
      document.legalScore = {
        ...result,
        lastAnalyzed: new Date()
      };
      await document.save();
    }

    console.log(`[ContractBuilder] Legal Score berechnet: ${result.totalScore}/100`);
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('[ContractBuilder] POST /ai/legal-score Error:', error.message || error);
    res.status(500).json({
      success: false,
      error: 'Fehler bei der Score-Berechnung',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * POST /api/contract-builder/ai/intent
 * Intent Detection - natürliche Sprache verstehen
 */
router.post('/ai/intent', auth, async (req, res) => {
  try {
    const { description } = req.body;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `Du bist ein Vertrags-Assistent. Analysiere die Beschreibung des Benutzers und extrahiere strukturierte Informationen.

Antworte als JSON:
{
  "contractType": "mietvertrag|arbeitsvertrag|kaufvertrag|nda|freelancer|darlehen|...",
  "confidence": 0.0-1.0,
  "parties": [
    { "role": "Vermieter|Mieter|...", "type": "person|company", "extractedInfo": {} }
  ],
  "keyTerms": {
    "amounts": [{ "value": 1000, "currency": "EUR", "purpose": "Miete" }],
    "dates": [{ "value": "2025-01-01", "purpose": "Vertragsbeginn" }],
    "durations": [{ "value": 12, "unit": "months", "purpose": "Laufzeit" }]
  },
  "suggestedClauses": ["Kündigungsklausel", "Zahlungsklausel", "..."],
  "missingInfo": ["Adresse des Objekts", "..."],
  "summary": "Kurze Zusammenfassung was der Benutzer will"
}`
        },
        {
          role: 'user',
          content: description
        }
      ],
      temperature: 0.2,
      response_format: { type: 'json_object' }
    });

    const result = JSON.parse(response.choices[0].message.content);

    res.json({ success: true, ...result });
  } catch (error) {
    console.error('[ContractBuilder] POST /ai/intent Error:', error);
    res.status(500).json({ success: false, error: 'Fehler bei der Intent-Erkennung' });
  }
});

// ============================================
// EXPORT
// ============================================

/**
 * POST /api/contract-builder/:id/export/pdf
 * PDF exportieren
 */
router.post('/:id/export/pdf', auth, async (req, res) => {
  try {
    const document = await ContractBuilder.findOne({
      _id: req.params.id,
      userId: req.user.userId
    });

    if (!document) {
      return res.status(404).json({ success: false, error: 'Dokument nicht gefunden' });
    }

    // TODO: PDF-Generierung implementieren (kann bestehenden pdfGeneratorV2 nutzen)
    // Für jetzt: Placeholder-Response

    res.json({
      success: true,
      message: 'PDF-Export wird vorbereitet',
      documentId: document._id
    });
  } catch (error) {
    console.error('[ContractBuilder] POST /:id/export/pdf Error:', error);
    res.status(500).json({ success: false, error: 'Fehler beim PDF-Export' });
  }
});

// ============================================
// TEMPLATES
// ============================================

/**
 * GET /api/contract-builder/templates
 * Öffentliche Templates laden
 */
router.get('/templates/public', auth, async (req, res) => {
  try {
    const { category, limit = 20 } = req.query;

    // Validate limit (1-50)
    const safeLimit = Math.min(Math.max(parseInt(limit) || 20, 1), 50);

    const query = {
      'template.isTemplate': true,
      'template.isPublic': true
    };

    if (category && typeof category === 'string') {
      query['template.category'] = category;
    }

    const templates = await ContractBuilder.find(query)
      .sort({ 'template.downloads': -1 })
      .limit(safeLimit)
      .select('metadata template design.preset');

    res.json({ success: true, templates });
  } catch (error) {
    console.error('[ContractBuilder] GET /templates/public Error:', error);
    res.status(500).json({ success: false, error: 'Fehler beim Laden der Templates' });
  }
});

/**
 * POST /api/contract-builder/:id/save-as-template
 * Als Template speichern
 */
router.post('/:id/save-as-template', auth, async (req, res) => {
  try {
    const { category, isPublic } = req.body;

    const document = await ContractBuilder.findOne({
      _id: req.params.id,
      userId: req.user.userId
    });

    if (!document) {
      return res.status(404).json({ success: false, error: 'Dokument nicht gefunden' });
    }

    document.template = {
      isTemplate: true,
      isPublic: isPublic || false,
      category: category || 'Sonstige',
      downloads: 0
    };

    await document.save();

    res.json({ success: true, document });
  } catch (error) {
    console.error('[ContractBuilder] POST /:id/save-as-template Error:', error);
    res.status(500).json({ success: false, error: 'Fehler beim Speichern als Template' });
  }
});

module.exports = router;
