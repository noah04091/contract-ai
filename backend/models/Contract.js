const mongoose = require("mongoose");

const contractSchema = new mongoose.Schema({
  name: String,
  laufzeit: String,
  kuendigung: String,
  expiryDate: String,
  status: String,
  filePath: String,
  reminder: { type: Boolean, default: false },
  uploadedAt: { type: Date, default: Date.now },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  reminderLastSentAt: { type: Date },

  // 📁 Folder Organization
  folderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Folder",
    default: null
  },

  // ✉️ Digital Signature Integration
  signatureEnvelopeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Envelope",
    default: null
  },
  signatureStatus: {
    type: String,
    enum: ["draft", "sent", "signed", "completed"],
    default: null
  }
});

module.exports = mongoose.model("Contract", contractSchema);
