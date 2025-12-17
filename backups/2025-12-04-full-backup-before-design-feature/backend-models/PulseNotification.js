// 📁 backend/models/PulseNotification.js
// Legal Pulse 2.0 Phase 2 - Notification System

const mongoose = require("mongoose");

const pulseNotificationSchema = new mongoose.Schema({
  // User & Contract Reference
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

  // Notification Content
  type: {
    type: String,
    enum: ['law_change', 'risk_increase', 'deadline', 'forecast', 'action_required'],
    required: true,
    index: true
  },

  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium',
    index: true
  },

  title: {
    type: String,
    required: true
  },

  description: {
    type: String,
    required: true
  },

  // Action Details
  actionUrl: {
    type: String,
    required: false
  },

  actionType: {
    type: String,
    enum: ['optimize', 'generate', 'sign', 'review', 'none'],
    default: 'none'
  },

  // Source Information
  sourceUrl: {
    type: String,
    required: false
  },

  lawReference: {
    lawId: String,
    sectionId: String,
    area: String
  },

  // Metadata
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },

  // Status Tracking
  read: {
    type: Boolean,
    default: false,
    index: true
  },

  readAt: {
    type: Date,
    default: null
  },

  dismissed: {
    type: Boolean,
    default: false
  },

  dismissedAt: {
    type: Date,
    default: null
  },

  // Action Tracking
  actionTaken: {
    type: Boolean,
    default: false
  },

  actionTakenAt: {
    type: Date,
    default: null
  },

  actionResult: {
    type: String,
    default: null
  },

  // Delivery Tracking
  deliveryChannels: {
    browser: {
      sent: { type: Boolean, default: false },
      sentAt: { type: Date, default: null }
    },
    email: {
      sent: { type: Boolean, default: false },
      sentAt: { type: Date, default: null }
    },
    push: {
      sent: { type: Boolean, default: false },
      sentAt: { type: Date, default: null }
    }
  },

  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },

  expiresAt: {
    type: Date,
    default: null,
    index: true
  }
});

// Compound Indexes
pulseNotificationSchema.index({ userId: 1, read: 1, createdAt: -1 });
pulseNotificationSchema.index({ userId: 1, contractId: 1, type: 1 });
pulseNotificationSchema.index({ severity: 1, read: 1, createdAt: -1 });

// TTL Index (auto-delete after expiry)
pulseNotificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Methods
pulseNotificationSchema.methods.markAsRead = async function() {
  this.read = true;
  this.readAt = new Date();
  return await this.save();
};

pulseNotificationSchema.methods.dismiss = async function() {
  this.dismissed = true;
  this.dismissedAt = new Date();
  return await this.save();
};

pulseNotificationSchema.methods.markActionTaken = async function(result = null) {
  this.actionTaken = true;
  this.actionTakenAt = new Date();
  this.actionResult = result;
  return await this.save();
};

// Statics
pulseNotificationSchema.statics.getUnreadForUser = function(userId, limit = 20) {
  return this.find({
    userId,
    read: false,
    dismissed: false
  })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
};

pulseNotificationSchema.statics.getRecentForUser = function(userId, limit = 50) {
  return this.find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
};

pulseNotificationSchema.statics.getBySeverity = function(userId, severity, limit = 20) {
  return this.find({
    userId,
    severity,
    read: false,
    dismissed: false
  })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
};

pulseNotificationSchema.statics.markAllAsRead = function(userId) {
  return this.updateMany(
    { userId, read: false },
    { $set: { read: true, readAt: new Date() } }
  );
};

pulseNotificationSchema.statics.getStats = async function(userId) {
  const total = await this.countDocuments({ userId });
  const unread = await this.countDocuments({ userId, read: false, dismissed: false });
  const highSeverity = await this.countDocuments({
    userId,
    severity: { $in: ['high', 'critical'] },
    read: false,
    dismissed: false
  });

  return {
    total,
    unread,
    highSeverity,
    read: total - unread
  };
};

const PulseNotification = mongoose.model("PulseNotification", pulseNotificationSchema);

module.exports = PulseNotification;
