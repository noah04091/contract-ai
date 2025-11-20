// 📁 backend/models/OrganizationInvitation.js
// Team-Management: Organization Invitations Model

const mongoose = require('mongoose');
const crypto = require('crypto');

const organizationInvitationSchema = new mongoose.Schema({
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },

  // Email des eingeladenen Users
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },

  // Rolle die der User bekommen soll
  role: {
    type: String,
    enum: ['admin', 'member', 'viewer'],
    default: 'member',
    required: true
  },

  // Unique Invite Token
  token: {
    type: String,
    required: true,
    unique: true,
    default: function() {
      return crypto.randomBytes(32).toString('hex');
    }
  },

  // Wer hat eingeladen?
  invitedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // Status
  status: {
    type: String,
    enum: ['pending', 'accepted', 'expired', 'cancelled'],
    default: 'pending'
  },

  // Ablaufdatum (7 Tage)
  expiresAt: {
    type: Date,
    required: true,
    default: function() {
      return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 Tage
    }
  },

  // Wann wurde akzeptiert?
  acceptedAt: {
    type: Date,
    default: null
  },

  // Wann erstellt?
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index für Token-Lookup
organizationInvitationSchema.index({ token: 1 });

// Index für Email-Lookup (um Duplikate zu vermeiden)
organizationInvitationSchema.index({ organizationId: 1, email: 1, status: 1 });

// Auto-expire abgelaufene Invites (TTL Index)
organizationInvitationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('OrganizationInvitation', organizationInvitationSchema);
