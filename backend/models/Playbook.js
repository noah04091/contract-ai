const mongoose = require("mongoose");

/**
 * Playbook Model
 *
 * Regelbasiertes Vertrags-Pruefsystem.
 * User definiert Mindestanforderungen (Regeln), neue Vertraege werden dagegen geprueft.
 * Unterstuetzt: Individuelle Playbooks, Globale Anforderungen, Team-Sharing.
 */

// Sub-Schema fuer einzelne Regeln
const playbookRuleSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    maxlength: 200
  },
  description: {
    type: String,
    required: true,
    maxlength: 1000
  },
  // Vertragsbereich den die Regel prueft
  category: {
    type: String,
    enum: [
      "zahlung",           // Zahlungsbedingungen
      "haftung",           // Haftung & Schadensersatz
      "kuendigung",        // Kuendigungsfristen & -rechte
      "gewaehrleistung",   // Gewaehrleistung & Maengel
      "vertraulichkeit",   // Vertraulichkeit & Geheimhaltung
      "datenschutz",       // Datenschutz & DSGVO
      "eigentum",          // Eigentumsvorbehalt & IP
      "force_majeure",     // Hoehere Gewalt
      "vertragsstrafe",    // Vertragsstrafen & Poenalen
      "laufzeit",          // Vertragslaufzeit & Verlaengerung
      "abnahme",           // Abnahme & Leistungserbringung
      "formvorschriften",  // Schriftform & Formalia
      "gerichtsstand",     // Gerichtsstand & Recht
      "sonstiges"          // Weitere Anforderungen
    ],
    default: "sonstiges"
  },
  // Prioritaet der Regel
  priority: {
    type: String,
    enum: [
      "muss",   // Muss erfuellt sein (Deal-Breaker)
      "soll",   // Sollte erfuellt sein (Verhandlungspunkt)
      "kann"    // Nice-to-have (Optional)
    ],
    default: "soll"
  },
  // Schwellenwert als Freitext (z.B. "max. 30 Tage", "nicht ueber 5%")
  threshold: {
    type: String,
    maxlength: 200
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { _id: true });

const playbookSchema = new mongoose.Schema({
  // Referenz zum User
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true
  },

  // Organisation (fuer Team-Sharing)
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Organization"
  },

  // Playbook-Name
  name: {
    type: String,
    required: true,
    maxlength: 100
  },

  // Beschreibung
  description: {
    type: String,
    maxlength: 500,
    default: ""
  },

  // Vertragstyp fuer den das Playbook gilt
  contractType: {
    type: String,
    default: "allgemein"
  },

  // Perspektive/Rolle des Users
  role: {
    type: String,
    enum: ["auftraggeber", "auftragnehmer", "neutral"],
    default: "neutral"
  },

  // Branchenkontext (optional)
  industry: {
    type: String,
    enum: [
      "it_software",
      "handwerk",
      "bau",
      "immobilien",
      "beratung",
      "produktion",
      "handel",
      "gesundheit",
      "finanzen",
      "energie",
      "logistik",
      "allgemein"
    ],
    default: "allgemein"
  },

  // Standard-Playbook (wird bei jedem Upload automatisch geprueft)
  isDefault: {
    type: Boolean,
    default: false
  },

  // Globale Anforderungen (gelten fuer ALLE Playbooks des Users)
  isGlobal: {
    type: Boolean,
    default: false
  },

  // Status
  status: {
    type: String,
    enum: ["draft", "active"],
    default: "active"
  },

  // Die Regeln/Anforderungen
  rules: [playbookRuleSchema],

  // Nutzungsstatistik
  checksCount: {
    type: Number,
    default: 0
  },
  lastCheckAt: Date,

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

// Indexes
playbookSchema.index({ userId: 1, status: 1 });
playbookSchema.index({ userId: 1, isGlobal: 1 });
playbookSchema.index({ userId: 1, isDefault: 1 });
playbookSchema.index({ organizationId: 1 }, { sparse: true });

// Pre-save Hook
playbookSchema.pre("save", function(next) {
  this.updatedAt = new Date();

  // Nur ein globales Playbook pro User erlauben
  // (wird im Route-Layer geprueft, hier nur Sicherheitsnetz)
  next();
});

// Statische Methoden
playbookSchema.statics.findByUser = function(userId, options = {}) {
  const query = { userId, isGlobal: { $ne: true } };

  if (options.status) {
    query.status = options.status;
  }

  if (options.contractType) {
    query.contractType = options.contractType;
  }

  return this.find(query)
    .sort(options.sortBy || { updatedAt: -1 })
    .limit(options.limit || 50);
};

playbookSchema.statics.findGlobal = function(userId) {
  return this.findOne({ userId, isGlobal: true });
};

playbookSchema.statics.findDefault = function(userId) {
  return this.findOne({ userId, isDefault: true, status: "active" });
};

playbookSchema.statics.getStatistics = async function(userId) {
  const userObjId = typeof userId === "string"
    ? new mongoose.Types.ObjectId(userId)
    : userId;

  const [stats] = await this.aggregate([
    { $match: { userId: userObjId, isGlobal: { $ne: true } } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        active: { $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] } },
        draft: { $sum: { $cond: [{ $eq: ["$status", "draft"] }, 1, 0] } },
        totalRules: { $sum: { $size: "$rules" } },
        totalChecks: { $sum: "$checksCount" }
      }
    }
  ]);

  return stats || { total: 0, active: 0, draft: 0, totalRules: 0, totalChecks: 0 };
};

module.exports = mongoose.model("Playbook", playbookSchema);
