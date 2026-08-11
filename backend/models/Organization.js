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
  //
  // Default 11.08.2026 von 'enterprise' auf 'free' geaendert (sicherer Ausgangswert):
  // Seit die Org-Vererbung an den Zugangs-Gates greift (utils/planAccess.js), wuerde
  // eine ohne expliziten Plan angelegte Organisation ihren Mitgliedern SOFORT
  // Enterprise-Rechte vererben. Aktuell gibt es genau einen Schreibpfad
  // (routes/organizations.js:63), der den Plan immer explizit aus dem geprueften Plan
  // des Erstellers setzt — der Default wird dort nie benutzt. Er ist damit reine
  // Absicherung fuer den Fall, dass je ein zweiter Schreibpfad entsteht.
  // Bestehende Organisationen sind nicht betroffen: Mongoose-Defaults greifen nur
  // beim Anlegen, und alle vorhandenen Dokumente haben den Plan gespeichert (geprueft).
  subscriptionPlan: {
    type: String,
    enum: ['free', 'business', 'enterprise'],
    default: 'free'
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
