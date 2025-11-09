// 📁 backend/services/pulseNotificationService.js
// Legal Pulse 2.0 Phase 2 - Notification Service

const PulseNotification = require("../models/PulseNotification");
const nodemailer = require("nodemailer");

class PulseNotificationService {
  constructor() {
    this.emailEnabled = !!(process.env.EMAIL_HOST && process.env.EMAIL_USER);
    this.browserEnabled = true; // Always enabled (via SSE)

    if (this.emailEnabled) {
      this.emailTransporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: parseInt(process.env.EMAIL_PORT || "587"),
        secure: process.env.EMAIL_SECURE === "true",
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
      });
    }

    console.log('[PULSE-NOTIFICATION] Service initialized');
    console.log(`  - Email: ${this.emailEnabled ? 'Enabled' : 'Disabled'}`);
    console.log(`  - Browser: ${this.browserEnabled ? 'Enabled' : 'Disabled'}`);
  }

  /**
   * Create a new notification
   * @param {Object} notificationData - Notification details
   * @returns {Promise<Object>} - Created notification
   */
  async createNotification(notificationData) {
    try {
      const {
        userId,
        contractId,
        type,
        severity = 'medium',
        title,
        description,
        actionUrl = null,
        actionType = 'none',
        sourceUrl = null,
        lawReference = null,
        details = {},
        expiresInDays = null
      } = notificationData;

      // Calculate expiry
      let expiresAt = null;
      if (expiresInDays) {
        expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + expiresInDays);
      }

      // Create notification
      const notification = await PulseNotification.create({
        userId,
        contractId,
        type,
        severity,
        title,
        description,
        actionUrl,
        actionType,
        sourceUrl,
        lawReference,
        details,
        expiresAt,
        deliveryChannels: {
          browser: { sent: false },
          email: { sent: false },
          push: { sent: false }
        }
      });

      console.log(`[PULSE-NOTIFICATION] ✓ Created notification: ${notification._id} (${type}, ${severity})`);

      return notification;

    } catch (error) {
      console.error('[PULSE-NOTIFICATION] ✗ Error creating notification:', error);
      throw error;
    }
  }

  /**
   * Send notification via browser (SSE)
   * @param {Object} notification - Notification object
   * @param {Function} broadcastFunction - SSE broadcast function
   * @returns {Promise<boolean>} - Success status
   */
  async sendViaBrowser(notification, broadcastFunction) {
    try {
      if (!broadcastFunction) {
        console.log('[PULSE-NOTIFICATION] No broadcast function provided, skipping browser delivery');
        return false;
      }

      const alert = {
        contractId: notification.contractId,
        type: notification.type,
        severity: notification.severity,
        title: notification.title,
        description: notification.description,
        actionUrl: notification.actionUrl,
        actionType: notification.actionType,
        sourceUrl: notification.sourceUrl,
        details: notification.details,
        notificationId: notification._id,
        createdAt: notification.createdAt
      };

      // Broadcast to user
      broadcastFunction(notification.userId.toString(), alert);

      // Update delivery status
      await PulseNotification.findByIdAndUpdate(notification._id, {
        'deliveryChannels.browser.sent': true,
        'deliveryChannels.browser.sentAt': new Date()
      });

      console.log(`[PULSE-NOTIFICATION] ✓ Sent via browser: ${notification._id}`);
      return true;

    } catch (error) {
      console.error('[PULSE-NOTIFICATION] ✗ Error sending via browser:', error);
      return false;
    }
  }

  /**
   * Send notification via email
   * @param {Object} notification - Notification object
   * @param {Object} user - User object
   * @returns {Promise<boolean>} - Success status
   */
  async sendViaEmail(notification, user) {
    if (!this.emailEnabled) {
      console.log('[PULSE-NOTIFICATION] Email disabled, skipping');
      return false;
    }

    try {
      const emailHtml = this.generateEmailHTML(notification, user);

      const mailOptions = {
        from: `"Legal Pulse" <${process.env.EMAIL_USER}>`,
        to: user.email,
        subject: `🔔 ${notification.title}`,
        html: emailHtml
      };

      await this.emailTransporter.sendMail(mailOptions);

      // Update delivery status
      await PulseNotification.findByIdAndUpdate(notification._id, {
        'deliveryChannels.email.sent': true,
        'deliveryChannels.email.sentAt': new Date()
      });

      console.log(`[PULSE-NOTIFICATION] ✓ Sent via email: ${notification._id} to ${user.email}`);
      return true;

    } catch (error) {
      console.error('[PULSE-NOTIFICATION] ✗ Error sending via email:', error);
      return false;
    }
  }

  /**
   * Generate email HTML
   * @param {Object} notification - Notification object
   * @param {Object} user - User object
   * @returns {string} - HTML string
   */
  generateEmailHTML(notification, user) {
    const severityColors = {
      low: '#10b981',
      medium: '#f59e0b',
      high: '#ef4444',
      critical: '#dc2626'
    };

    const severityColor = severityColors[notification.severity] || '#6b7280';

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 24px;">⚡ Legal Pulse Alert</h1>
    </div>

    <!-- Content -->
    <div style="background-color: white; padding: 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
      <!-- Severity Badge -->
      <div style="margin-bottom: 20px;">
        <span style="display: inline-block; padding: 6px 12px; background-color: ${severityColor}20; color: ${severityColor}; border-radius: 6px; font-size: 12px; font-weight: 700; text-transform: uppercase;">
          ${notification.severity} Priority
        </span>
      </div>

      <!-- Title -->
      <h2 style="color: #1e293b; margin: 0 0 15px 0; font-size: 20px;">
        ${notification.title}
      </h2>

      <!-- Description -->
      <p style="color: #64748b; line-height: 1.6; margin: 0 0 25px 0;">
        ${notification.description}
      </p>

      <!-- Law Reference (if available) -->
      ${notification.lawReference ? `
      <div style="background-color: #f1f5f9; padding: 15px; border-radius: 8px; margin-bottom: 25px;">
        <p style="margin: 0; color: #475569; font-size: 14px;">
          <strong>Betroffen:</strong> ${notification.lawReference.lawId} ${notification.lawReference.sectionId || ''}
          ${notification.lawReference.area ? `(${notification.lawReference.area})` : ''}
        </p>
      </div>
      ` : ''}

      <!-- Action Button -->
      ${notification.actionUrl ? `
      <div style="text-align: center; margin-top: 30px;">
        <a href="${notification.actionUrl}" style="display: inline-block; padding: 12px 30px; background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">
          ${this.getActionButtonText(notification.actionType)}
        </a>
      </div>
      ` : ''}

      <!-- Footer -->
      <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center;">
        <p style="color: #94a3b8; font-size: 12px; margin: 0;">
          Diese Benachrichtigung wurde automatisch von Legal Pulse generiert.
        </p>
        <p style="color: #94a3b8; font-size: 12px; margin: 10px 0 0 0;">
          <a href="https://contract-ai.de/legalpulse" style="color: #6366f1; text-decoration: none;">Legal Pulse Dashboard öffnen</a>
        </p>
      </div>
    </div>
  </div>
</body>
</html>
    `;
  }

  /**
   * Get action button text
   * @param {string} actionType - Action type
   * @returns {string} - Button text
   */
  getActionButtonText(actionType) {
    const texts = {
      optimize: 'Vertrag optimieren',
      generate: 'Neue Version generieren',
      sign: 'Zur Signatur',
      review: 'Jetzt prüfen',
      none: 'Details anzeigen'
    };

    return texts[actionType] || 'Details anzeigen';
  }

  /**
   * Deliver notification via all enabled channels
   * @param {Object} notification - Notification object
   * @param {Object} user - User object
   * @param {Function} broadcastFunction - SSE broadcast function (optional)
   * @returns {Promise<Object>} - Delivery results
   */
  async deliverNotification(notification, user, broadcastFunction = null) {
    const results = {
      browser: false,
      email: false,
      push: false
    };

    // Browser (SSE)
    if (broadcastFunction) {
      results.browser = await this.sendViaBrowser(notification, broadcastFunction);
    }

    // Email
    if (user && user.email) {
      results.email = await this.sendViaEmail(notification, user);
    }

    // Push notifications (future implementation)
    // results.push = await this.sendViaPush(notification, user);

    console.log(`[PULSE-NOTIFICATION] Delivery complete for ${notification._id}:`, results);

    return results;
  }
}

// Singleton instance
let instance = null;

module.exports = {
  getInstance: () => {
    if (!instance) {
      instance = new PulseNotificationService();
    }
    return instance;
  },
  PulseNotificationService
};
