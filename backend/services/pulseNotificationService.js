// 📁 backend/services/pulseNotificationService.js
// Legal Pulse 2.0 Phase 2 - Notification Service

const PulseNotification = require("../models/PulseNotification");
const nodemailer = require("nodemailer");
const { generateEmailTemplate } = require("../utils/emailTemplate");

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
        subject: `Legal Pulse - ${notification.title}`,
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
      low: { bg: '#ecfdf5', text: '#065f46', label: 'LOW' },
      medium: { bg: '#fffbeb', text: '#92400e', label: 'MEDIUM' },
      high: { bg: '#fef2f2', text: '#dc2626', label: 'HIGH' },
      critical: { bg: '#fef2f2', text: '#dc2626', label: 'CRITICAL' }
    };

    const severity = severityColors[notification.severity] || severityColors.medium;

    const lawRefHtml = notification.lawReference ? `
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f8f9fa; border-radius: 12px; margin-bottom: 25px;">
        <tr><td style="padding: 20px;">
          <p style="margin: 0; font-size: 14px; color: #555;">
            <strong>Betroffen:</strong> ${notification.lawReference.lawId} ${notification.lawReference.sectionId || ''}
            ${notification.lawReference.area ? `(${notification.lawReference.area})` : ''}
          </p>
        </td></tr>
      </table>
    ` : '';

    return generateEmailTemplate({
      title: "Legal Pulse Alert",
      preheader: notification.title,
      body: `
        <div style="margin-bottom: 20px; text-align: center;">
          <span style="display: inline-block; padding: 6px 14px; background-color: ${severity.bg}; color: ${severity.text}; border-radius: 20px; font-size: 12px; font-weight: 700; text-transform: uppercase;">
            ⚠️ ${severity.label} Priority
          </span>
        </div>

        <h2 style="font-size: 20px; font-weight: 600; color: #1a1a1a; text-align: center; margin: 0 0 20px 0;">
          ${notification.title}
        </h2>

        <p style="text-align: center; margin-bottom: 25px;">
          ${notification.description}
        </p>

        ${lawRefHtml}
      `,
      cta: notification.actionUrl ? {
        text: this.getActionButtonText(notification.actionType),
        url: notification.actionUrl
      } : null
    });
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

    // 🔐 Check subscription plan - nur Business/Enterprise erhalten Notifications
    const userPlan = (user?.subscriptionPlan || 'free').toLowerCase();
    const allowedPlans = ['business', 'enterprise'];
    if (!allowedPlans.includes(userPlan)) {
      console.log(`[PULSE-NOTIFICATION] ⏩ Skipping user ${user?.email} (Plan: ${userPlan}) - Legal Pulse requires Business+`);
      return results;
    }

    // Browser (SSE)
    if (broadcastFunction) {
      results.browser = await this.sendViaBrowser(notification, broadcastFunction);
    }

    // Email (only for Business+ users)
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
