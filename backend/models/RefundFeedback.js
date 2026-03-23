const mongoose = require("mongoose");

const refundFeedbackSchema = new mongoose.Schema({
  // Token für öffentlichen Zugang
  token: { type: String, required: true, unique: true, index: true },

  // Kunden-Info (wird beim Erstellen gesetzt)
  customerName: { type: String, required: true },
  customerEmail: { type: String, required: true },
  subscriptionPlan: { type: String, default: "" },

  // Status
  status: {
    type: String,
    enum: ["pending", "submitted", "refunded"],
    default: "pending",
  },

  // Feedback-Daten (werden beim Absenden gefüllt)
  overallRating: { type: Number, min: 1, max: 5 },

  // Genutzte Features (Checkboxen)
  usedFeatures: [String],

  // Hauptgrund für die Kündigung (Multiple Choice)
  cancellationReason: { type: String, default: "" },

  // Weitere Gründe (Multiple Choice, mehrere möglich)
  additionalReasons: [String],

  // Feature-Bewertungen (1-5 Sterne pro Feature)
  featureRatings: {
    vertragsanalyse: { type: Number, min: 0, max: 5, default: 0 },
    optimizer: { type: Number, min: 0, max: 5, default: 0 },
    legalPulse: { type: Number, min: 0, max: 5, default: 0 },
    chat: { type: Number, min: 0, max: 5, default: 0 },
    vergleich: { type: Number, min: 0, max: 5, default: 0 },
    kalender: { type: Number, min: 0, max: 5, default: 0 },
    generator: { type: Number, min: 0, max: 5, default: 0 },
    legalLens: { type: Number, min: 0, max: 5, default: 0 },
  },

  // PFLICHTFELD: Was hatte der Kunde erwartet / sich vorgestellt?
  expectedFeatures: { type: String, default: "" },

  // Was hat gefallen?
  positiveFeedback: { type: String, default: "" },

  // Was hat nicht gefallen / gefehlt?
  negativeFeedback: { type: String, default: "" },

  // NPS (0-10)
  npsScore: { type: Number, min: 0, max: 10 },

  // Verbesserungsvorschläge
  suggestions: { type: String, default: "" },

  // Timestamps
  createdAt: { type: Date, default: Date.now },
  submittedAt: { type: Date },
});

module.exports = mongoose.model("RefundFeedback", refundFeedbackSchema);
