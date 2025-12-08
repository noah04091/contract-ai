// 📁 backend/middleware/verifyIntegrationWebhook.js
// Middleware zur Verifizierung von eingehenden Webhooks von CRM/ERP/CPQ Systemen
// Unterstützt verschiedene Signature-Methoden je nach System

const crypto = require("crypto");
const { MongoClient, ObjectId } = require("mongodb");

// MongoDB Connection
const client = new MongoClient(process.env.MONGO_URI);
let integrationCredentialsCollection;
let webhookEventsCollection;

(async () => {
  try {
    await client.connect();
    const db = client.db("contract_ai");
    integrationCredentialsCollection = db.collection("integrationcredentials");
    webhookEventsCollection = db.collection("integrationwebhookevents");
    console.log("📦 Integration Webhook Middleware: MongoDB verbunden");
  } catch (error) {
    console.error("❌ Integration Webhook Middleware: MongoDB Connection Error:", error);
  }
})();

/**
 * Salesforce Webhook Signature Verification
 * https://developer.salesforce.com/docs/atlas.en-us.api_streaming.meta/api_streaming/code_sample_auth_oauth.htm
 */
function verifySalesforceSignature(payload, signature, secret) {
  // Salesforce verwendet SHA-256 HMAC
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload, 'utf8')
    .digest('base64');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

/**
 * HubSpot Webhook Signature Verification (v3)
 * https://developers.hubspot.com/docs/api/webhooks#request-signature
 */
function verifyHubSpotSignature(payload, signature, secret, timestamp, method, url) {
  // HubSpot v3 Signature
  const sourceString = `${method}${url}${payload}${timestamp}`;
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(sourceString, 'utf8')
    .digest('hex');

  // Signature kommt als "sha256=xxx"
  const providedSig = signature.replace('sha256=', '');

  return crypto.timingSafeEqual(
    Buffer.from(providedSig),
    Buffer.from(expectedSignature)
  );
}

/**
 * SAP Webhook Signature Verification
 * SAP verwendet Basic Auth oder OAuth Token
 */
function verifySAPSignature(headers, credentials) {
  // Option 1: Basic Auth
  const authHeader = headers.authorization;
  if (authHeader && authHeader.startsWith('Basic ')) {
    const base64Credentials = authHeader.substring(6);
    const decoded = Buffer.from(base64Credentials, 'base64').toString('utf8');
    const [username, password] = decoded.split(':');
    return username === credentials.username && password === credentials.password;
  }

  // Option 2: API Key
  const apiKey = headers['x-sap-api-key'] || headers['api-key'];
  if (apiKey && apiKey === credentials.apiKey) {
    return true;
  }

  return false;
}

/**
 * Generic HMAC Signature Verification
 * Für Custom Webhooks und andere Systeme
 */
function verifyGenericHMACSignature(payload, signature, secret, algorithm = 'sha256') {
  const expectedSignature = crypto
    .createHmac(algorithm, secret)
    .update(payload, 'utf8')
    .digest('hex');

  // Handle verschiedene Signature-Formate
  let providedSig = signature;
  if (signature.includes('=')) {
    providedSig = signature.split('=')[1];
  }

  try {
    return crypto.timingSafeEqual(
      Buffer.from(providedSig, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  } catch (e) {
    return false;
  }
}

/**
 * Hauptmiddleware: Verifiziert eingehende Webhooks
 */
function verifyIntegrationWebhook(integrationType) {
  return async (req, res, next) => {
    const eventId = `evt_${integrationType}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const startTime = Date.now();

    try {
      console.log(`🔐 [Webhook] Eingehender ${integrationType} Webhook`);

      // Raw Body für Signature Verification
      const rawBody = JSON.stringify(req.body);

      // Event-Log erstellen
      const eventLog = {
        eventId,
        source: integrationType,
        direction: 'inbound',
        eventType: req.body.event || req.body.type || req.body.eventType || 'unknown',
        request: {
          method: req.method,
          url: req.originalUrl,
          headers: sanitizeHeaders(req.headers),
          body: req.body,
          timestamp: new Date()
        },
        status: 'received',
        receivedAt: new Date(),
        metadata: {
          ipAddress: req.ip || req.connection.remoteAddress,
          userAgent: req.headers['user-agent']
        }
      };

      // User ID aus verschiedenen Quellen ermitteln
      let userId = null;
      let credentials = null;

      // Option 1: User ID in URL Parameter
      if (req.params.userId) {
        userId = req.params.userId;
      }

      // Option 2: User ID in Header
      if (!userId && req.headers['x-contract-ai-user-id']) {
        userId = req.headers['x-contract-ai-user-id'];
      }

      // Option 3: User ID in Body (für manche CRM Webhooks)
      if (!userId && req.body.contractAiUserId) {
        userId = req.body.contractAiUserId;
      }

      // Credentials laden
      if (userId) {
        credentials = await integrationCredentialsCollection.findOne({
          userId: new ObjectId(userId),
          integrationType,
          status: 'active'
        });
      }

      // Ohne Credentials: Versuche über Webhook Token
      if (!credentials && req.params.token) {
        credentials = await integrationCredentialsCollection.findOne({
          'webhook.incomingUrl': { $regex: req.params.token },
          integrationType,
          status: 'active'
        });
        if (credentials) {
          userId = credentials.userId.toString();
        }
      }

      if (!credentials) {
        console.warn(`⚠️ [Webhook] Keine aktive ${integrationType} Integration gefunden`);
        eventLog.status = 'failed';
        eventLog.processing = {
          error: { message: 'No active integration found', code: 'NO_INTEGRATION' }
        };
        await webhookEventsCollection.insertOne(eventLog);

        return res.status(401).json({
          success: false,
          error: 'No active integration found',
          eventId
        });
      }

      eventLog.userId = new ObjectId(userId);

      // Signature Verification je nach Integration
      let signatureValid = false;
      const webhookSecret = credentials.webhook?.incomingSecret;

      eventLog.status = 'validating';

      switch (integrationType) {
        case 'salesforce':
          const sfSignature = req.headers['x-salesforce-signature'] || req.headers['x-sfdc-signature'];
          if (sfSignature && webhookSecret) {
            signatureValid = verifySalesforceSignature(rawBody, sfSignature, webhookSecret);
          } else if (!webhookSecret) {
            // Wenn kein Secret konfiguriert, Signatur überspringen (nicht empfohlen)
            console.warn(`⚠️ [Webhook] Salesforce: Kein Webhook Secret konfiguriert - Signatur übersprungen`);
            signatureValid = true;
          }
          break;

        case 'hubspot':
          const hsSignature = req.headers['x-hubspot-signature-v3'] || req.headers['x-hubspot-signature'];
          const hsTimestamp = req.headers['x-hubspot-request-timestamp'];
          if (hsSignature && webhookSecret && hsTimestamp) {
            signatureValid = verifyHubSpotSignature(
              rawBody,
              hsSignature,
              webhookSecret,
              hsTimestamp,
              req.method,
              req.originalUrl
            );
          } else if (!webhookSecret) {
            console.warn(`⚠️ [Webhook] HubSpot: Kein Webhook Secret konfiguriert - Signatur übersprungen`);
            signatureValid = true;
          }
          break;

        case 'sap':
        case 'sap_business_one':
        case 'sap_s4hana':
          signatureValid = verifySAPSignature(req.headers, {
            username: credentials.basicAuth?.username,
            password: credentials.basicAuth?.password,
            apiKey: credentials.apiKey?.key
          });
          break;

        case 'pipedrive':
        case 'zoho':
        case 'netsuite':
        case 'odoo':
        default:
          // Generic HMAC Verification
          const genericSignature = req.headers['x-signature'] ||
            req.headers['x-webhook-signature'] ||
            req.headers['x-hook-signature'];
          if (genericSignature && webhookSecret) {
            signatureValid = verifyGenericHMACSignature(rawBody, genericSignature, webhookSecret);
          } else if (!webhookSecret) {
            console.warn(`⚠️ [Webhook] ${integrationType}: Kein Webhook Secret - Signatur übersprungen`);
            signatureValid = true;
          }
          break;
      }

      if (!signatureValid) {
        console.error(`❌ [Webhook] ${integrationType} Signatur ungültig`);
        eventLog.status = 'failed';
        eventLog.processing = {
          completedAt: new Date(),
          duration: Date.now() - startTime,
          error: { message: 'Invalid signature', code: 'INVALID_SIGNATURE' }
        };
        await webhookEventsCollection.insertOne(eventLog);

        return res.status(401).json({
          success: false,
          error: 'Invalid webhook signature',
          eventId
        });
      }

      console.log(`✅ [Webhook] ${integrationType} Signatur verifiziert`);

      // Idempotency Check
      const idempotencyKey = req.headers['x-idempotency-key'] ||
        req.headers['x-request-id'] ||
        req.body.requestId ||
        req.body.messageId;

      if (idempotencyKey) {
        eventLog.idempotencyKey = idempotencyKey;

        const existingEvent = await webhookEventsCollection.findOne({
          idempotencyKey,
          source: integrationType,
          userId: new ObjectId(userId)
        });

        if (existingEvent) {
          console.log(`⚠️ [Webhook] Duplikat erkannt: ${idempotencyKey}`);
          eventLog.isDuplicate = true;
          eventLog.originalEventId = existingEvent.eventId;
          eventLog.status = 'skipped';
          await webhookEventsCollection.insertOne(eventLog);

          return res.status(200).json({
            success: true,
            message: 'Duplicate event - already processed',
            eventId,
            originalEventId: existingEvent.eventId
          });
        }
      }

      // Event-Log speichern
      eventLog.status = 'processing';
      eventLog.processing = { startedAt: new Date() };
      await webhookEventsCollection.insertOne(eventLog);

      // Request erweitern für Handler
      req.webhookEvent = {
        eventId,
        integrationType,
        credentials,
        userId,
        eventLog
      };

      // Weiter zum eigentlichen Handler
      next();

    } catch (error) {
      console.error(`❌ [Webhook] ${integrationType} Middleware Error:`, error);

      // Error Event speichern
      try {
        await webhookEventsCollection.insertOne({
          eventId,
          source: integrationType,
          direction: 'inbound',
          eventType: 'middleware_error',
          status: 'failed',
          processing: {
            completedAt: new Date(),
            duration: Date.now() - startTime,
            error: { message: error.message, stack: error.stack }
          },
          request: {
            method: req.method,
            url: req.originalUrl,
            body: req.body
          },
          receivedAt: new Date()
        });
      } catch (logError) {
        console.error('❌ Could not log webhook error:', logError);
      }

      res.status(500).json({
        success: false,
        error: 'Webhook processing error',
        eventId
      });
    }
  };
}

/**
 * Headers sanitieren (sensible Daten entfernen)
 */
function sanitizeHeaders(headers) {
  const sanitized = { ...headers };
  const sensitiveHeaders = [
    'authorization',
    'x-api-key',
    'x-salesforce-signature',
    'x-hubspot-signature',
    'x-hubspot-signature-v3',
    'cookie',
    'x-sap-api-key'
  ];

  sensitiveHeaders.forEach(header => {
    if (sanitized[header]) {
      sanitized[header] = '[REDACTED]';
    }
  });

  return sanitized;
}

/**
 * Utility: Event-Log aktualisieren
 */
async function updateWebhookEvent(eventId, updates) {
  try {
    await webhookEventsCollection.updateOne(
      { eventId },
      { $set: { ...updates, updatedAt: new Date() } }
    );
  } catch (error) {
    console.error(`❌ Could not update webhook event ${eventId}:`, error);
  }
}

/**
 * Utility: Action zum Event hinzufügen
 */
async function addWebhookAction(eventId, action) {
  try {
    await webhookEventsCollection.updateOne(
      { eventId },
      {
        $push: { actions: { ...action, timestamp: new Date() } },
        $set: { updatedAt: new Date() }
      }
    );
  } catch (error) {
    console.error(`❌ Could not add action to webhook event ${eventId}:`, error);
  }
}

/**
 * Utility: Event als abgeschlossen markieren
 */
async function completeWebhookEvent(eventId, success = true, error = null) {
  try {
    const updates = {
      status: success ? 'completed' : 'failed',
      'processing.completedAt': new Date(),
      updatedAt: new Date()
    };

    if (error) {
      updates['processing.error'] = {
        message: error.message || String(error),
        code: error.code
      };
    }

    await webhookEventsCollection.updateOne({ eventId }, { $set: updates });
  } catch (err) {
    console.error(`❌ Could not complete webhook event ${eventId}:`, err);
  }
}

module.exports = {
  verifyIntegrationWebhook,
  updateWebhookEvent,
  addWebhookAction,
  completeWebhookEvent,
  verifySalesforceSignature,
  verifyHubSpotSignature,
  verifySAPSignature,
  verifyGenericHMACSignature
};
