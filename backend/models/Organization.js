// 📁 backend/models/Organization.js
// Team-Management: Organisation Model

const mongoose = require('mongoose');

const organizationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },

  // Owner (der User der zahlt & Admin ist)
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // Subscription vom Owner geerbt
  subscriptionPlan: {
    type: String,
    enum: ['free', 'business', 'enterprise'],
    default: 'enterprise'
  },

  // Team-Limits
  maxMembers: {
    type: Number,
    default: 10
  },

  // Company Branding (optional)
  companyLogo: {
    type: String, // S3 Key
    default: null
  },

  // Settings
  settings: {
    allowMemberInvites: {
      type: Boolean,
      default: false // Nur Admins können einladen
    },
    defaultMemberRole: {
      type: String,
      enum: ['member', 'viewer'],
      default: 'member'
    }
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

// Index für schnelle Owner-Suche
organizationSchema.index({ ownerId: 1 });

// Update timestamp on save
organizationSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Organization', organizationSchema);
