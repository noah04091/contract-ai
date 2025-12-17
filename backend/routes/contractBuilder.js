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

    const query = { userId: req.user._id };

    if (status) query['metadata.status'] = status;
    if (contractType) query['metadata.contractType'] = contractType;

    const documents = await ContractBuilder.find(query)
      .sort(sort)
      .skip(parseInt(skip))
      .limit(parseInt(limit))
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
        { userId: req.user._id },
        { 'collaboration.sharedWith.userId': req.user._id }
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
            { userId: req.user._id }
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
      userId: req.user._id,
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
        { userId: req.user._id },
        { 'collaboration.sharedWith': { $elemMatch: { userId: req.user._id, permission: 'edit' } } }
      ]
    });

    if (!document) {
      return res.status(404).json({ success: false, error: 'Dokument nicht gefunden oder keine Berechtigung' });
    }

    // Selektives Update
    if (metadata) {
      Object.assign(document.metadata, metadata);
    }

    if (content) {
      if (content.blocks) document.content.blocks = content.blocks;
      if (content.variables) document.content.variables = content.variables;
    }

    if (design) {
      Object.assign(document.design, design);
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
      userId: req.user._id
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
 * POST /api/contract-builder/:id/duplicate
 * Dokument duplizieren
 */
router.post('/:id/duplicate', auth, async (req, res) => {
  try {
    const original = await ContractBuilder.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!original) {
      return res.status(404).json({ success: false, error: 'Dokument nicht gefunden' });
    }

    const duplicate = await original.duplicate();
    duplicate.userId = req.user._id;
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
      userId: req.user._id
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
      userId: req.user._id
    });

    if (!document) {
      return res.status(404).json({ success: false, error: 'Dokument nicht gefunden' });
    }

    const block = document.content.blocks.find(b => b.id === req.params.blockId);
    if (!block) {
      return res.status(404).json({ success: false, error: 'Block nicht gefunden' });
    }

    if (content) Object.assign(block.content, content);
    if (style) Object.assign(block.style, style);
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
      userId: req.user._id
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
      userId: req.user._id
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
      userId: req.user._id
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

    // Wenn documentId vorhanden, aus DB laden
    if (documentId) {
      document = await ContractBuilder.findOne({
        _id: documentId,
        userId: req.user._id
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

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `Analysiere einen Vertrag und erstelle einen Legal Health Score.

Bewerte folgende Kategorien von 0-100:
- completeness: Vollständigkeit (alle wichtigen Klauseln vorhanden?)
- legalPrecision: Rechtliche Präzision (korrekte Formulierungen?)
- balance: Ausgewogenheit (fair für beide Parteien?)
- clarity: Klarheit (verständlich formuliert?)
- currentness: Aktualität (entspricht aktueller Rechtslage?)
- enforceability: Durchsetzbarkeit (vor Gericht haltbar?)

Antworte als JSON:
{
  "totalScore": 0-100,
  "categories": {
    "completeness": 0-100,
    "legalPrecision": 0-100,
    "balance": 0-100,
    "clarity": 0-100,
    "currentness": 0-100,
    "enforceability": 0-100
  },
  "findings": {
    "critical": [{ "message": "...", "autoFixAvailable": true/false }],
    "warnings": [{ "message": "...", "autoFixAvailable": true/false }],
    "suggestions": [{ "message": "..." }]
  }
}`
        },
        {
          role: 'user',
          content: `Analysiere diesen Vertrag (Typ: ${docType}):

${clauseTexts || 'Keine Klauseln vorhanden'}

Anzahl Blöcke: ${blockCount}`
        }
      ],
      temperature: 0.2,
      response_format: { type: 'json_object' }
    });

    const result = JSON.parse(response.choices[0].message.content);

    // Score im Dokument speichern (nur wenn Dokument aus DB)
    if (document) {
      document.legalScore = {
        ...result,
        lastAnalyzed: new Date()
      };
      await document.save();
    }

    res.json({ success: true, ...result });
  } catch (error) {
    console.error('[ContractBuilder] POST /ai/legal-score Error:', error);
    res.status(500).json({ success: false, error: 'Fehler bei der Score-Berechnung' });
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
      userId: req.user._id
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

    const query = {
      'template.isTemplate': true,
      'template.isPublic': true
    };

    if (category) {
      query['template.category'] = category;
    }

    const templates = await ContractBuilder.find(query)
      .sort({ 'template.downloads': -1 })
      .limit(parseInt(limit))
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
      userId: req.user._id
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
