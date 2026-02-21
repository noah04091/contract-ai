/**
 * ContractBuilder MongoDB Schema
 * Speichert Vertragsdokumente aus dem visuellen Baukasten-Editor
 */

const mongoose = require('mongoose');

// Block-Inhalt Schema (variabel je nach Block-Typ)
const BlockContentSchema = new mongoose.Schema({
  // Header Block
  title: String,
  subtitle: String,
  logo: String,

  // Parties Block
  party1: {
    role: String,        // z.B. "Vermieter"
    name: String,
    address: String,
    taxId: String,
    email: String,
    phone: String
  },
  party2: {
    role: String,        // z.B. "Mieter"
    name: String,
    address: String,
    taxId: String,
    email: String,
    phone: String
  },

  // Clause Block
  number: String,        // z.B. "§ 1" oder "auto"
  clauseTitle: String,
  body: String,          // Mit {{variablen}}
  subclauses: [{
    number: String,
    text: String
  }],

  // Table Block
  headers: [String],
  rows: [[String]],
  footer: String,

  // Signature Block
  signatureFields: [{
    partyIndex: Number,
    label: String,
    showDate: { type: Boolean, default: true },
    showPlace: { type: Boolean, default: true }
  }],
  witnesses: { type: Number, default: 0 },

  // Preamble Block
  preambleText: String,

  // Attachment Block
  attachmentTitle: String,
  attachmentDescription: String,
  attachmentFile: String,        // Base64-codierte Datei
  attachmentFileName: String,    // Original-Dateiname
  attachmentFileType: String,    // MIME-Type

  // Definitions Block
  definitionsTitle: String,
  definitions: [{
    term: String,
    definition: String
  }],

  // Notice Block
  noticeType: { type: String, enum: ['info', 'warning', 'legal'] },
  noticeTitle: String,
  noticeText: String,
  showNoticeIcon: Boolean,

  // Cover Block
  coverTitle: String,
  coverSubtitle: String,
  contractType: String,
  coverLogo: String,
  coverDate: String,
  referenceNumber: String,
  confidentialityNotice: String,
  partySummary1: String,
  partySummary2: String,
  coverLayout: { type: String, enum: ['executive-center', 'modern-sidebar', 'minimal-clean', 'corporate-banner', 'elegant-frame'] },
  coverAccentColor: String,

  // Logo Block
  logoUrl: String,
  logoData: String,              // Base64-codiertes Bild
  altText: String,
  width: Number,
  alignment: String,

  // Divider/Spacer
  height: Number,
  style: String
}, { _id: false, strict: false });

// Block-Style Schema
const BlockStyleSchema = new mongoose.Schema({
  // Typografie
  fontFamily: String,
  fontSize: Number,
  fontWeight: Number,
  fontStyle: { type: String, enum: ['normal', 'italic'] },
  lineHeight: Number,
  letterSpacing: Number,
  textAlign: { type: String, enum: ['left', 'center', 'right', 'justify'] },

  // Farben
  textColor: String,
  backgroundColor: String,
  borderColor: String,
  accentColor: String,

  // Abstände
  marginTop: Number,
  marginBottom: Number,
  paddingTop: Number,
  paddingRight: Number,
  paddingBottom: Number,
  paddingLeft: Number,

  // Rahmen
  borderStyle: { type: String, enum: ['none', 'solid', 'dashed', 'dotted'] },
  borderWidth: Number,
  borderRadius: Number,

  // Effekte
  shadow: Boolean,
  highlight: Boolean,
  opacity: Number
}, { _id: false });

// Einzelner Block
const BlockSchema = new mongoose.Schema({
  id: { type: String, required: true },
  type: {
    type: String,
    required: true,
    enum: [
      'header',           // Vertragskopf
      'cover',            // Deckblatt
      'parties',          // Vertragsparteien
      'preamble',         // Präambel
      'clause',           // Standard-Klausel
      'definitions',      // Begriffsbestimmungen
      'notice',           // Hinweis/Widerrufsbelehrung
      'numbered-list',    // Nummerierte Aufzählung
      'table',            // Tabelle
      'signature',        // Unterschriftenblock
      'attachment',       // Anlagen-Verweis
      'date-field',       // Datumsfeld
      'divider',          // Trenner
      'spacer',           // Abstandshalter
      'logo',             // Firmenlogo
      'page-break',       // Seitenumbruch
      'custom'            // Benutzerdefiniert
    ]
  },
  order: { type: Number, required: true },
  content: BlockContentSchema,
  style: BlockStyleSchema,
  locked: { type: Boolean, default: false },
  aiGenerated: { type: Boolean, default: false },
  aiPrompt: String,       // Original-Prompt falls KI-generiert
  legalBasis: [String],   // Rechtliche Grundlagen z.B. ["BGB §535"]
  riskLevel: { type: String, enum: ['low', 'medium', 'high'] }
}, { _id: false });

// Variable Schema
const VariableSchema = new mongoose.Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },           // z.B. "{{mieter_name}}"
  displayName: { type: String, required: true },    // z.B. "Name des Mieters"
  type: {
    type: String,
    required: true,
    enum: ['text', 'date', 'number', 'currency', 'select', 'computed', 'email', 'phone', 'iban']
  },
  value: mongoose.Schema.Types.Mixed,               // Aktueller Wert
  defaultValue: mongoose.Schema.Types.Mixed,
  required: { type: Boolean, default: false },
  validation: String,                               // Regex-Pattern
  options: [String],                                // Für Select-Typ
  computeFormula: String,                           // Für berechnete Felder z.B. "{{miete}} * 3"
  linkedBlocks: [String],                           // Block-IDs die diese Variable nutzen
  group: String                                     // Gruppierung z.B. "Vertragsparteien"
}, { _id: false });

// Design-Konfiguration
const DesignConfigSchema = new mongoose.Schema({
  preset: String,          // z.B. "executive", "modern", "minimal"

  // Custom Farben
  primaryColor: String,
  secondaryColor: String,
  accentColor: String,
  textPrimary: String,
  textSecondary: String,
  textMuted: String,
  backgroundPrimary: String,
  backgroundSecondary: String,
  borderColor: String,

  // Typografie
  fontFamily: String,
  headingFont: String,
  baseFontSize: Number,

  // Layout
  pageSize: { type: String, enum: ['A4', 'Letter', 'Legal'], default: 'A4' },
  orientation: { type: String, enum: ['portrait', 'landscape'], default: 'portrait' },
  marginTop: Number,
  marginRight: Number,
  marginBottom: Number,
  marginLeft: Number,

  // Extras
  showPageNumbers: { type: Boolean, default: true },
  pageNumberPosition: { type: String, enum: ['top-left', 'top-center', 'top-right', 'bottom-left', 'bottom-center', 'bottom-right'], default: 'bottom-center' },
  showHeaderOnAllPages: { type: Boolean, default: false },
  watermark: String,
  watermarkOpacity: Number
}, { _id: false });

// Legal Health Score
const LegalScoreSchema = new mongoose.Schema({
  totalScore: { type: Number, min: 0, max: 100 },

  categories: {
    completeness: { type: Number, min: 0, max: 100 },
    legalPrecision: { type: Number, min: 0, max: 100 },
    balance: { type: Number, min: 0, max: 100 },
    clarity: { type: Number, min: 0, max: 100 },
    currentness: { type: Number, min: 0, max: 100 },
    enforceability: { type: Number, min: 0, max: 100 }
  },

  findings: {
    critical: [{
      id: String,
      message: String,
      blockId: String,
      autoFixAvailable: Boolean
    }],
    warnings: [{
      id: String,
      message: String,
      blockId: String,
      autoFixAvailable: Boolean
    }],
    suggestions: [{
      id: String,
      message: String,
      blockId: String
    }]
  },

  lastAnalyzed: Date
}, { _id: false });

// Changelog Entry
const ChangelogEntrySchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  userName: String,
  action: { type: String, enum: ['create', 'update', 'delete', 'reorder', 'style', 'ai-generate'] },
  blockId: String,
  description: String,
  previousValue: mongoose.Schema.Types.Mixed,
  newValue: mongoose.Schema.Types.Mixed
}, { _id: false });

// Hauptschema für ContractBuilder Dokumente
const ContractBuilderSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // Metadaten
  metadata: {
    name: { type: String, required: true, default: 'Neuer Vertrag' },
    description: String,
    contractType: {
      type: String,
      default: 'individuell',
      index: true
    },
    language: { type: String, default: 'de' },
    status: {
      type: String,
      enum: ['draft', 'review', 'final', 'signed', 'archived'],
      default: 'draft',
      index: true
    },
    version: { type: Number, default: 1 },
    tags: [String]
  },

  // Inhalt
  content: {
    blocks: [BlockSchema],
    variables: [VariableSchema]
  },

  // Design
  design: DesignConfigSchema,

  // KI-Metadaten
  ai: {
    generatedBlocks: [String],          // IDs der KI-generierten Blöcke
    totalAiCalls: { type: Number, default: 0 },
    lastAiInteraction: Date
  },

  // Legal Health Score
  legalScore: LegalScoreSchema,

  // Verknüpfungen
  connections: {
    parentContract: { type: mongoose.Schema.Types.ObjectId, ref: 'ContractBuilder' },
    childContracts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ContractBuilder' }],
    relatedContracts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ContractBuilder' }],
    linkedToContract: { type: mongoose.Schema.Types.ObjectId, ref: 'Contract' } // Verknüpfung zum klassischen Contract
  },

  // Kollaboration
  collaboration: {
    sharedWith: [{
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      email: String,
      permission: { type: String, enum: ['view', 'comment', 'edit'], default: 'view' },
      sharedAt: { type: Date, default: Date.now }
    }],
    isPublic: { type: Boolean, default: false },
    publicLink: String
  },

  // Audit Trail
  changelog: [ChangelogEntrySchema],

  // Export-Historie
  exports: {
    pdf: [{
      exportedAt: Date,
      url: String,
      designUsed: String,
      version: Number
    }],
    docx: [{
      exportedAt: Date,
      url: String,
      version: Number
    }]
  },

  // Template-Info (falls als Vorlage gespeichert)
  template: {
    isTemplate: { type: Boolean, default: false },
    isPublic: { type: Boolean, default: false },
    category: String,
    downloads: { type: Number, default: 0 },
    rating: { type: Number, min: 0, max: 5 },
    reviews: [{
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      rating: Number,
      comment: String,
      createdAt: { type: Date, default: Date.now }
    }]
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indizes für Performance
ContractBuilderSchema.index({ userId: 1, 'metadata.status': 1 });
ContractBuilderSchema.index({ userId: 1, createdAt: -1 });
ContractBuilderSchema.index({ 'template.isPublic': 1, 'template.category': 1 });
ContractBuilderSchema.index({ 'metadata.tags': 1 });

// Virtuelle Felder
ContractBuilderSchema.virtual('blockCount').get(function() {
  return this.content?.blocks?.length || 0;
});

ContractBuilderSchema.virtual('variableCount').get(function() {
  return this.content?.variables?.length || 0;
});

ContractBuilderSchema.virtual('filledVariables').get(function() {
  if (!this.content?.variables) return 0;
  return this.content.variables.filter(v => v.value !== undefined && v.value !== '').length;
});

ContractBuilderSchema.virtual('completionPercentage').get(function() {
  const requiredVars = this.content?.variables?.filter(v => v.required) || [];
  if (requiredVars.length === 0) return 100;
  const filled = requiredVars.filter(v => v.value !== undefined && v.value !== '').length;
  return Math.round((filled / requiredVars.length) * 100);
});

// Pre-save Hook: Changelog-Eintrag bei Updates
ContractBuilderSchema.pre('save', function(next) {
  if (this.isNew) {
    this.changelog.push({
      action: 'create',
      description: 'Vertrag erstellt'
    });
  }
  next();
});

// Statische Methoden
ContractBuilderSchema.statics.findByUser = function(userId, options = {}) {
  const query = this.find({ userId });

  if (options.status) {
    query.where('metadata.status').equals(options.status);
  }

  if (options.contractType) {
    query.where('metadata.contractType').equals(options.contractType);
  }

  return query.sort({ updatedAt: -1 });
};

ContractBuilderSchema.statics.findTemplates = function(options = {}) {
  const query = this.find({ 'template.isTemplate': true, 'template.isPublic': true });

  if (options.category) {
    query.where('template.category').equals(options.category);
  }

  return query.sort({ 'template.downloads': -1 });
};

// Instanz-Methoden
ContractBuilderSchema.methods.addBlock = function(block, position) {
  if (position === undefined) {
    block.order = this.content.blocks.length;
    this.content.blocks.push(block);
  } else {
    block.order = position;
    // Alle nachfolgenden Blöcke um 1 erhöhen
    this.content.blocks.forEach(b => {
      if (b.order >= position) b.order++;
    });
    this.content.blocks.push(block);
    this.content.blocks.sort((a, b) => a.order - b.order);
  }

  this.changelog.push({
    action: 'create',
    blockId: block.id,
    description: `Block "${block.type}" hinzugefügt`
  });

  return this;
};

ContractBuilderSchema.methods.removeBlock = function(blockId) {
  const blockIndex = this.content.blocks.findIndex(b => b.id === blockId);
  if (blockIndex === -1) return this;

  const removedBlock = this.content.blocks[blockIndex];
  this.content.blocks.splice(blockIndex, 1);

  // Order neu berechnen
  this.content.blocks.forEach((b, i) => {
    b.order = i;
  });

  this.changelog.push({
    action: 'delete',
    blockId: blockId,
    description: `Block "${removedBlock.type}" entfernt`,
    previousValue: removedBlock
  });

  return this;
};

ContractBuilderSchema.methods.reorderBlocks = function(fromIndex, toIndex) {
  const block = this.content.blocks.splice(fromIndex, 1)[0];
  this.content.blocks.splice(toIndex, 0, block);

  // Order neu berechnen
  this.content.blocks.forEach((b, i) => {
    b.order = i;
  });

  this.changelog.push({
    action: 'reorder',
    description: `Block von Position ${fromIndex} nach ${toIndex} verschoben`
  });

  return this;
};

ContractBuilderSchema.methods.updateVariable = function(variableId, value) {
  const variable = this.content.variables.find(v => v.id === variableId);
  if (variable) {
    const oldValue = variable.value;
    variable.value = value;

    this.changelog.push({
      action: 'update',
      description: `Variable "${variable.displayName}" aktualisiert`,
      previousValue: oldValue,
      newValue: value
    });
  }
  return this;
};

ContractBuilderSchema.methods.duplicate = async function() {
  const duplicate = new this.constructor(this.toObject());
  duplicate._id = new mongoose.Types.ObjectId();
  duplicate.isNew = true;
  duplicate.metadata.name = `${this.metadata.name} (Kopie)`;
  duplicate.metadata.status = 'draft';
  duplicate.metadata.version = 1;
  duplicate.changelog = [{
    action: 'create',
    description: `Kopie erstellt von "${this.metadata.name}"`
  }];
  duplicate.exports = { pdf: [], docx: [] };
  duplicate.createdAt = new Date();
  duplicate.updatedAt = new Date();

  return duplicate.save();
};

module.exports = mongoose.model('ContractBuilder', ContractBuilderSchema);
