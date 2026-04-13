const mongoose = require("mongoose");

/**
 * ClauseCollection Model
 *
 * Benutzerdefinierte Klausel-Sammlungen (z.B. "Arbeitsverträge", "Werkverträge").
 * Erlaubt das Gruppieren von Klauseln aus verschiedenen Quellen:
 * - Eigene gespeicherte Klauseln (SavedClause)
 * - Musterklauseln (statische Template-IDs)
 * - Rechtslexikon-Einträge (statische Term-IDs)
 * - Freitext-Klauseln (custom)
 */

const collectionItemSchema = new mongoose.Schema({
  // Typ der Klausel-Quelle
  type: {
    type: String,
    enum: ["saved", "template", "lexikon", "custom"],
    required: true
  },

  // Referenz auf SavedClause (wenn type === "saved")
  savedClauseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "SavedClause"
  },

  // Referenz auf statische Musterklausel (wenn type === "template")
  templateClauseId: String,

  // Referenz auf statischen Lexikon-Eintrag (wenn type === "lexikon")
  legalTermId: String,

  // Freitext-Klausel (wenn type === "custom")
  customTitle: String,
  customText: String,

  // Notiz zu diesem Eintrag innerhalb der Sammlung
  notes: {
    type: String,
    maxlength: 1000
  },

  // Reihenfolge innerhalb der Sammlung
  order: {
    type: Number,
    default: 0
  },

  addedAt: {
    type: Date,
    default: Date.now
  }
}, { _id: true });

const clauseCollectionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true
  },

  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },

  description: {
    type: String,
    maxlength: 500
  },

  icon: {
    type: String,
    maxlength: 10,
    default: "📁"
  },

  color: {
    type: String,
    maxlength: 20,
    default: "#6366f1"
  },

  items: [collectionItemSchema],

  createdAt: {
    type: Date,
    default: Date.now
  },

  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Compound Index: User + Name (eindeutig pro User)
clauseCollectionSchema.index({ userId: 1, name: 1 }, { unique: true });

// Pre-save: updatedAt aktualisieren
clauseCollectionSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

// Statische Methoden
clauseCollectionSchema.statics.findByUser = function (userId) {
  const userObjId = typeof userId === "string"
    ? new mongoose.Types.ObjectId(userId)
    : userId;
  return this.find({ userId: userObjId }).sort({ updatedAt: -1 });
};

clauseCollectionSchema.statics.getOverview = async function (userId) {
  const userObjId = typeof userId === "string"
    ? new mongoose.Types.ObjectId(userId)
    : userId;

  return this.find({ userId: userObjId })
    .select("name description icon color items createdAt updatedAt")
    .sort({ updatedAt: -1 })
    .lean()
    .then(collections =>
      collections.map(c => ({
        ...c,
        itemCount: c.items ? c.items.length : 0
      }))
    );
};

module.exports = mongoose.model("ClauseCollection", clauseCollectionSchema);
