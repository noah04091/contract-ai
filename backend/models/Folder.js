const mongoose = require("mongoose");

const folderSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  color: {
    type: String,
    default: "#667eea" // Default purple
  },
  icon: {
    type: String,
    default: "📁" // Default folder emoji
  },
  order: {
    type: Number,
    default: 0
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update updatedAt on save
folderSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model("Folder", folderSchema);
