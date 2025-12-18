const mongoose = require("mongoose");
const crypto = require("crypto");

/**
 * SavedClause Model
 *
 * Speichert favorisierte/wichtige Klauseln eines Users.
 * Ermöglicht Kategorisierung, Tagging und Ähnlichkeitserkennung.
 */
const savedClauseSchema = new mongoose.Schema({
  // Referenz zum User
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true
  },

  // Klauseltext
  clauseText: {
    type: String,
    required: true
  },

  // Hash für exakte Duplikaterkennung (wird automatisch im pre-save generiert)
  clauseTextHash: {
    type: String,
    index: true
  },

  // Kurzversion für Vorschau (max 200 Zeichen)
  clausePreview: {
    type: String,
    maxlength: 250
  },

  // Kategorisierung
  category: {
    type: String,
    enum: [
      "risky",         // Riskante Klausel (zur Warnung)
      "good_practice", // Best Practice (als Vorlage)
      "important",     // Wichtig zu beachten
      "unusual",       // Ungewöhnliche Formulierung
      "standard"       // Standard-Klausel (Referenz)
    ],
    required: true,
    default: "important"
  },

  // Ursprungsvertrag
  sourceContractId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Contract"
  },
  sourceContractName: String,
  sourceClauseId: String,

  // Ursprüngliche Analyse
  originalAnalysis: {
    riskLevel: {
      type: String,
      enum: ["low", "medium", "high"]
    },
    riskScore: {
      type: Number,
      min: 0,
      max: 100
    },
    actionLevel: {
      type: String,
      enum: ["accept", "negotiate", "reject"]
    },
    clauseType: String,
    mainRisk: String
  },

  // Benutzer-Notizen
  userNotes: {
    type: String,
    maxlength: 2000
  },

  // Tags für Filterung
  tags: [{
    type: String,
    lowercase: true,
    trim: true
  }],

  // Keywords für Ähnlichkeitssuche (automatisch extrahiert)
  keywords: [{
    type: String,
    lowercase: true
  }],

  // Klauseltyp/Bereich
  clauseArea: {
    type: String,
    enum: [
      "liability",      // Haftung
      "termination",    // Kündigung
      "payment",        // Zahlung
      "confidentiality", // Vertraulichkeit
      "intellectual_property", // Geistiges Eigentum
      "warranty",       // Gewährleistung
      "force_majeure",  // Höhere Gewalt
      "dispute",        // Streitbeilegung
      "data_protection", // Datenschutz
      "non_compete",    // Wettbewerbsverbot
      "other"           // Sonstiges
    ],
    default: "other"
  },

  // Branchen-Bezug (optional)
  industryContext: {
    type: String,
    enum: [
      "it_software",
      "construction",
      "real_estate",
      "consulting",
      "manufacturing",
      "retail",
      "healthcare",
      "finance",
      "general"
    ]
  },

  // Nutzungsstatistik
  usageCount: {
    type: Number,
    default: 0
  },
  lastUsedAt: Date,

  // Timestamps
  savedAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Compound Index für User + Hash (verhindert Duplikate pro User)
savedClauseSchema.index({ userId: 1, clauseTextHash: 1 }, { unique: true });

// Index für Tag-Suche
savedClauseSchema.index({ userId: 1, tags: 1 });

// Index für Kategorie-Filter
savedClauseSchema.index({ userId: 1, category: 1 });

// Index für Klauselbereich-Filter
savedClauseSchema.index({ userId: 1, clauseArea: 1 });

// Pre-save Hook
savedClauseSchema.pre("save", function(next) {
  this.updatedAt = new Date();

  // Hash generieren wenn nicht vorhanden
  if (!this.clauseTextHash && this.clauseText) {
    this.clauseTextHash = crypto
      .createHash("md5")
      .update(this.clauseText.toLowerCase().replace(/\s+/g, " ").trim())
      .digest("hex");
  }

  // Preview generieren
  if (this.clauseText && !this.clausePreview) {
    this.clausePreview = this.clauseText.substring(0, 200) +
      (this.clauseText.length > 200 ? "..." : "");
  }

  // Keywords extrahieren wenn nicht vorhanden
  if ((!this.keywords || this.keywords.length === 0) && this.clauseText) {
    this.keywords = extractKeywords(this.clauseText);
  }

  next();
});

// Helper: Keywords extrahieren
function extractKeywords(text) {
  // Deutsche und englische Stoppwörter
  const stopWords = new Set([
    "der", "die", "das", "und", "oder", "aber", "wenn", "weil", "als", "auch",
    "für", "von", "mit", "bei", "nach", "über", "unter", "vor", "zwischen",
    "durch", "gegen", "ohne", "um", "aus", "an", "auf", "in", "zu", "zur", "zum",
    "ist", "sind", "wird", "werden", "hat", "haben", "kann", "können", "muss", "müssen",
    "soll", "sollen", "darf", "dürfen", "einer", "eine", "einem", "einen", "eines",
    "nicht", "nur", "noch", "schon", "bereits", "sowie", "bzw", "etc", "ggf",
    "the", "and", "or", "but", "if", "because", "as", "also", "for", "from",
    "with", "at", "after", "over", "under", "before", "between", "through",
    "against", "without", "to", "is", "are", "will", "be", "has", "have",
    "can", "may", "must", "shall", "should", "would", "could", "a", "an", "the"
  ]);

  // Text bereinigen und in Wörter aufteilen
  const words = text
    .toLowerCase()
    .replace(/[^\wäöüß\s]/g, " ")
    .split(/\s+/)
    .filter(word =>
      word.length >= 4 &&
      !stopWords.has(word) &&
      !/^\d+$/.test(word)
    );

  // Häufigkeit zählen
  const frequency = {};
  words.forEach(word => {
    frequency[word] = (frequency[word] || 0) + 1;
  });

  // Top 10 Keywords zurückgeben
  return Object.entries(frequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word]) => word);
}

// Methoden
savedClauseSchema.methods.incrementUsage = function() {
  this.usageCount += 1;
  this.lastUsedAt = new Date();
  return this.save();
};

savedClauseSchema.methods.addTags = function(newTags) {
  const uniqueTags = new Set([
    ...this.tags,
    ...newTags.map(t => t.toLowerCase().trim())
  ]);
  this.tags = Array.from(uniqueTags);
  return this;
};

savedClauseSchema.methods.removeTag = function(tag) {
  this.tags = this.tags.filter(t => t !== tag.toLowerCase().trim());
  return this;
};

// Statische Methoden
savedClauseSchema.statics.findByUser = function(userId, options = {}) {
  const query = { userId };

  if (options.category) {
    query.category = options.category;
  }

  if (options.clauseArea) {
    query.clauseArea = options.clauseArea;
  }

  if (options.tag) {
    query.tags = options.tag.toLowerCase();
  }

  if (options.industryContext) {
    query.industryContext = options.industryContext;
  }

  return this.find(query)
    .sort(options.sortBy || { savedAt: -1 })
    .limit(options.limit || 100);
};

savedClauseSchema.statics.findByHash = function(userId, hash) {
  return this.findOne({ userId, clauseTextHash: hash });
};

savedClauseSchema.statics.checkDuplicate = async function(userId, clauseText) {
  const hash = crypto
    .createHash("md5")
    .update(clauseText.toLowerCase().replace(/\s+/g, " ").trim())
    .digest("hex");

  // Ensure userId is ObjectId
  const userObjId = typeof userId === 'string' ? new mongoose.Types.ObjectId(userId) : userId;
  return this.findOne({ userId: userObjId, clauseTextHash: hash });
};

savedClauseSchema.statics.findSimilar = async function(userId, clauseText, threshold = 3) {
  // Keywords aus dem zu prüfenden Text extrahieren
  const searchKeywords = extractKeywords(clauseText);

  if (searchKeywords.length === 0) {
    return [];
  }

  // Ensure userId is ObjectId
  const userObjId = typeof userId === 'string' ? new mongoose.Types.ObjectId(userId) : userId;

  // Klauseln mit übereinstimmenden Keywords finden
  const matches = await this.find({
    userId: userObjId,
    keywords: { $in: searchKeywords }
  }).lean();

  // Ähnlichkeit berechnen
  const withSimilarity = matches.map(clause => {
    const commonKeywords = clause.keywords.filter(k =>
      searchKeywords.includes(k)
    );
    return {
      ...clause,
      similarity: commonKeywords.length,
      commonKeywords
    };
  });

  // Nach Ähnlichkeit sortieren und filtern
  return withSimilarity
    .filter(c => c.similarity >= threshold)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 5);
};

savedClauseSchema.statics.getAllTags = async function(userId) {
  const result = await this.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId) } },
    { $unwind: "$tags" },
    { $group: { _id: "$tags", count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);

  return result.map(r => ({ tag: r._id, count: r.count }));
};

savedClauseSchema.statics.getStatistics = async function(userId) {
  const [stats] = await this.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        risky: { $sum: { $cond: [{ $eq: ["$category", "risky"] }, 1, 0] } },
        goodPractice: { $sum: { $cond: [{ $eq: ["$category", "good_practice"] }, 1, 0] } },
        important: { $sum: { $cond: [{ $eq: ["$category", "important"] }, 1, 0] } },
        unusual: { $sum: { $cond: [{ $eq: ["$category", "unusual"] }, 1, 0] } },
        standard: { $sum: { $cond: [{ $eq: ["$category", "standard"] }, 1, 0] } }
      }
    }
  ]);

  return stats || {
    total: 0,
    risky: 0,
    goodPractice: 0,
    important: 0,
    unusual: 0,
    standard: 0
  };
};

module.exports = mongoose.model("SavedClause", savedClauseSchema);
