// 📁 backend/models/OrganizationMember.js
// Team-Management: Organization Members Model

const mongoose = require('mongoose');

const organizationMemberSchema = new mongoose.Schema({
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },

  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // Rolle im Team
  role: {
    type: String,
    enum: ['admin', 'member', 'viewer'],
    default: 'member',
    required: true
  },

  // Permissions (erweiterbar)
  permissions: {
    type: [String],
    default: function() {
      // Default permissions basierend auf Rolle
      if (this.role === 'admin') {
        return ['contracts.read', 'contracts.write', 'contracts.delete', 'team.manage'];
      } else if (this.role === 'member') {
        return ['contracts.read', 'contracts.write'];
      } else {
        return ['contracts.read'];
      }
    }
  },

  // Wer hat eingeladen?
  invitedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // Wann beigetreten?
  joinedAt: {
    type: Date,
    default: Date.now
  },

  // Aktiv/Deaktiviert
  isActive: {
    type: Boolean,
    default: true
  }
});

// Compound Index: Ein User kann nur einmal in einer Org sein
organizationMemberSchema.index({ organizationId: 1, userId: 1 }, { unique: true });

// Index für User-Org Lookup
organizationMemberSchema.index({ userId: 1 });

module.exports = mongoose.model('OrganizationMember', organizationMemberSchema);
