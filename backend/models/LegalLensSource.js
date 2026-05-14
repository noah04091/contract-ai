// 📁 backend/models/LegalLensSource.js
// Phase 2.5 — Legal Lens eigene Datenbasis für stabile Gesetzes-Paragraphen
// (BGB, StGB, HGB, DSGVO, etc.)
//
// KRITISCH WICHTIG:
// - Diese Collection ist KOMPLETT ISOLIERT von der laws-Collection (Legal Pulse).
// - Sync läuft MANUELL (backend/scripts/syncLegalLensSources.js).
// - Wird NICHT von pulseV2RssSync oder legalPulseMonitor angefasst.
// - Legal Pulse Code-Files (lawEmbeddings.js, etc.) bleiben unberührt.

const mongoose = require("mongoose");
const crypto = require("crypto");

const legalLensSourceSchema = new mongoose.Schema({
  // ─── Identifikation ────────────────────────────────────────
  code: {
    type: String,
    required: true,
    index: true,
    trim: true
    // z.B. "BGB", "StGB", "HGB", "DSGVO", "BDSG", "KSchG", "ArbZG",
    //      "BetrVG", "TKG", "TMG", "VVG", "GewO", "UrhG", "UWG", "VOB-B"
  },

  section: {
    type: String,
    required: true,
    trim: true
    // z.B. "§ 305c", "§ 622", "Art. 6", "§ 1"
  },

  // ─── Inhalt ────────────────────────────────────────────────
  title: {
    type: String,
    required: true,
    trim: true
    // z.B. "Überraschende und mehrdeutige Klauseln"
  },

  text: {
    type: String,
    required: true
    // Vollständiger Paragraphentext, gekürzt auf max 8000 chars (für Embedding-Limit)
  },

  // ─── Klassifikation (für RAG-Filter) ───────────────────────
  area: {
    type: String,
    required: true,
    index: true
    // z.B. "Vertragsrecht", "AGB-Recht", "Mietrecht", "Arbeitsrecht",
    //      "Datenschutz", "Handelsrecht", "Strafrecht", "Versicherungsrecht"
    // Wird in der Konfiguration pro § zugeordnet (primaryArea oder secondaryAreas)
  },

  secondaryAreas: {
    type: [String],
    default: []
    // Optional: zusätzliche Rechtsgebiete für breitere Suche
  },

  // ─── Quelle (verifiziert, garantiert keine Halluzination) ──
  sourceUrl: {
    type: String,
    required: true,
    trim: true
    // z.B. "https://www.gesetze-im-internet.de/bgb/__305c.html"
  },

  sourceOrigin: {
    type: String,
    default: "gesetze-im-internet.de"
    // Quellen-Provider — z.B. "gesetze-im-internet.de", "dsgvo-gesetz.de"
  },

  // ─── Vector Embedding (1536-Dim via text-embedding-3-small) ─
  embedding: {
    type: [Number],
    default: []
  },

  // ─── Re-Sync-Logik ─────────────────────────────────────────
  contentHash: {
    type: String,
    index: true
    // SHA-256 Hash von title+text — erkennt geänderte §§ beim Re-Sync.
  },

  // ─── Status / Metadaten ────────────────────────────────────
  isActive: {
    type: Boolean,
    default: true
    // Falls § später aufgehoben wurde — wird auf false gesetzt statt zu löschen.
  },

  importedAt: {
    type: Date,
    default: Date.now,
    index: true
  },

  updatedAt: {
    type: Date,
    default: Date.now
  },

  // Optional: zusätzliche Metadaten
  language: {
    type: String,
    default: "de"
  },

  version: {
    type: String,
    default: null
    // Falls Gesetz versioniert ist (z.B. "BGB-2025")
  }
}, {
  // Mongoose-Optionen
  collection: "legalLensSources",   // Explizit benannt — KEIN Konflikt mit "laws"
  strict: true,                      // Schema strikt erzwingen
  minimize: false
});

// ─── Indizes ────────────────────────────────────────────────
// Compound Unique: code + section (z.B. BGB + §305c) → eindeutig
legalLensSourceSchema.index({ code: 1, section: 1 }, { unique: true });
// Area + Active für RAG-Filter (nur aktive §§ zurückgeben)
legalLensSourceSchema.index({ area: 1, isActive: 1 });
// Importiert-Datum für Re-Sync-Queries
legalLensSourceSchema.index({ importedAt: -1 });

// ─── Pre-Save Hook: contentHash automatisch berechnen ───────
legalLensSourceSchema.pre("save", function(next) {
  if (this.isModified("title") || this.isModified("text")) {
    const content = `${this.title}::${this.text}`;
    this.contentHash = crypto.createHash("sha256").update(content).digest("hex").substring(0, 16);
    this.updatedAt = new Date();
  }
  next();
});

// ─── Static Helpers ─────────────────────────────────────────
legalLensSourceSchema.statics.findByCodeAndSection = function(code, section) {
  return this.findOne({ code, section, isActive: true });
};

legalLensSourceSchema.statics.findByArea = function(area, limit = 100) {
  return this.find({ area, isActive: true })
    .limit(limit)
    .sort({ code: 1, section: 1 });
};

legalLensSourceSchema.statics.countByCode = function() {
  return this.aggregate([
    { $match: { isActive: true } },
    { $group: { _id: "$code", count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);
};

// ─── Instance Helpers ───────────────────────────────────────
legalLensSourceSchema.methods.getFullCitation = function() {
  return `${this.section} ${this.code}`;
};

legalLensSourceSchema.methods.hasEmbedding = function() {
  return Array.isArray(this.embedding) && this.embedding.length > 0;
};

const LegalLensSource = mongoose.model("LegalLensSource", legalLensSourceSchema);

module.exports = LegalLensSource;
