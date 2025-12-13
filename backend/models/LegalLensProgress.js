const mongoose = require("mongoose");

/**
 * LegalLensProgress Model
 *
 * Speichert den Fortschritt eines Users bei der Legal Lens Analyse.
 * Enthält durchgesehene Klauseln, Notizen und Bookmarks.
 */
const legalLensProgressSchema = new mongoose.Schema({
  // Referenzen
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true
  },
  contractId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Contract",
    required: true,
    index: true
  },

  // Fortschritt
  reviewedClauses: [{
    type: String
  }],
  totalClauses: {
    type: Number,
    default: 0
  },
  percentComplete: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },

  // Aktuelle Position
  lastViewedClause: String,
  currentPerspective: {
    type: String,
    enum: ["contractor", "client", "neutral", "worstCase"],
    default: "contractor"
  },
  scrollPosition: {
    type: Number,
    default: 0
  },

  // Bookmarks
  bookmarks: [{
    clauseId: {
      type: String,
      required: true
    },
    label: String,
    color: {
      type: String,
      default: "yellow"
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],

  // Notizen
  notes: [{
    clauseId: {
      type: String,
      required: true
    },
    content: {
      type: String,
      required: true
    },
    isPrivate: {
      type: Boolean,
      default: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  }],

  // Markierte Klauseln (Highlight)
  highlights: [{
    clauseId: {
      type: String,
      required: true
    },
    type: {
      type: String,
      enum: ["important", "concern", "question", "approved"],
      default: "important"
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],

  // Session-Tracking
  sessions: [{
    startedAt: {
      type: Date,
      required: true
    },
    endedAt: Date,
    clausesReviewed: {
      type: Number,
      default: 0
    },
    duration: Number
  }],
  currentSessionStart: Date,
  totalTimeSpent: {
    type: Number,
    default: 0
  },

  // Export-Historie
  exports: [{
    type: {
      type: String,
      enum: ["pdf", "docx", "email"],
      required: true
    },
    includedSections: [String],
    exportedAt: {
      type: Date,
      default: Date.now
    }
  }],

  // Status
  status: {
    type: String,
    enum: ["in_progress", "completed", "paused"],
    default: "in_progress"
  },
  completedAt: Date,

  // Zusammenfassung (nach Abschluss)
  summary: {
    totalHighRisk: {
      type: Number,
      default: 0
    },
    totalMediumRisk: {
      type: Number,
      default: 0
    },
    totalLowRisk: {
      type: Number,
      default: 0
    },
    negotiationNeeded: {
      type: Boolean,
      default: false
    },
    overallAssessment: String,
    generatedAt: Date
  },

  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Compound Index für schnelle Lookups
legalLensProgressSchema.index({ userId: 1, contractId: 1 }, { unique: true });

// Pre-save Hook
legalLensProgressSchema.pre("save", function(next) {
  this.updatedAt = new Date();

  // Fortschritt berechnen
  if (this.totalClauses > 0 && this.reviewedClauses) {
    this.percentComplete = Math.round(
      (this.reviewedClauses.length / this.totalClauses) * 100
    );
  }

  // Status auf completed setzen wenn 100%
  if (this.percentComplete >= 100 && this.status !== "completed") {
    this.status = "completed";
    this.completedAt = new Date();
  }

  next();
});

// Methoden
legalLensProgressSchema.methods.markClauseReviewed = function(clauseId) {
  if (!this.reviewedClauses.includes(clauseId)) {
    this.reviewedClauses.push(clauseId);
    this.lastViewedClause = clauseId;
  }
  return this;
};

legalLensProgressSchema.methods.addNote = function(clauseId, content) {
  this.notes.push({
    clauseId,
    content,
    createdAt: new Date(),
    updatedAt: new Date()
  });
  return this;
};

legalLensProgressSchema.methods.addBookmark = function(clauseId, label = "", color = "yellow") {
  // Prüfen ob bereits gemerkt
  const existingIndex = this.bookmarks.findIndex(b => b.clauseId === clauseId);

  if (existingIndex === -1) {
    this.bookmarks.push({
      clauseId,
      label,
      color,
      createdAt: new Date()
    });
  }
  return this;
};

legalLensProgressSchema.methods.removeBookmark = function(clauseId) {
  this.bookmarks = this.bookmarks.filter(b => b.clauseId !== clauseId);
  return this;
};

legalLensProgressSchema.methods.startSession = function() {
  this.currentSessionStart = new Date();
  return this;
};

legalLensProgressSchema.methods.endSession = function(clausesReviewed = 0) {
  if (this.currentSessionStart) {
    const endTime = new Date();
    const duration = endTime - this.currentSessionStart;

    this.sessions.push({
      startedAt: this.currentSessionStart,
      endedAt: endTime,
      clausesReviewed,
      duration
    });

    this.totalTimeSpent += duration;
    this.currentSessionStart = null;
  }
  return this;
};

legalLensProgressSchema.methods.getNotesForClause = function(clauseId) {
  return this.notes.filter(n => n.clauseId === clauseId);
};

legalLensProgressSchema.methods.isClauseBookmarked = function(clauseId) {
  return this.bookmarks.some(b => b.clauseId === clauseId);
};

// Statische Methoden
legalLensProgressSchema.statics.getOrCreate = async function(userId, contractId, totalClauses = 0) {
  let progress = await this.findOne({ userId, contractId });

  if (!progress) {
    progress = new this({
      userId,
      contractId,
      totalClauses,
      reviewedClauses: [],
      currentSessionStart: new Date()
    });
    await progress.save();
  }

  return progress;
};

legalLensProgressSchema.statics.findByUser = function(userId) {
  return this.find({ userId })
    .populate("contractId", "name title")
    .sort({ updatedAt: -1 });
};

legalLensProgressSchema.statics.findInProgress = function(userId) {
  return this.find({
    userId,
    status: "in_progress"
  }).populate("contractId", "name title");
};

module.exports = mongoose.model("LegalLensProgress", legalLensProgressSchema);
