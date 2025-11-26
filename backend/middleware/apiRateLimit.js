// 📁 backend/middleware/apiRateLimit.js
// Rate Limiting für REST API v1 (Enterprise-Feature)

const rateLimit = require("express-rate-limit");

/**
 * Rate Limiter für API v1 Endpoints
 *
 * Limits:
 * - Business: 100 Requests/Stunde
 * - Enterprise/Premium: 1000 Requests/Stunde
 *
 * Basiert auf API-Key (req.apiKey.keyId)
 */
const apiRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 Stunde
  max: async (req) => {
    // Standard Limit (falls kein User erkannt)
    if (!req.user || !req.user.subscriptionPlan) {
      return 100;
    }

    const plan = req.user.subscriptionPlan;

    // Enterprise/Premium/Legendary: Höheres Limit
    if (plan === "premium" || plan === "legendary") {
      return 1000; // 1000 Requests/Stunde
    }

    // Business: Standard Limit
    if (plan === "business") {
      return 100; // 100 Requests/Stunde
    }

    // Free: Kein API-Zugang (sollte bereits von verifyApiKey blockiert sein)
    return 0;
  },

  // Key für Rate Limiting: API-Key ID (pro Key, nicht pro User)
  keyGenerator: (req) => {
    if (req.apiKey && req.apiKey.keyId) {
      return `api_key:${req.apiKey.keyId}`;
    }
    // Fallback: IP-Adresse
    return req.ip;
  },

  // Standard headers setzen
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers

  // Handler wenn Limit überschritten
  handler: (req, res) => {
    const plan = req.user?.subscriptionPlan || "unknown";
    const resetTime = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    res.status(429).json({
      success: false,
      message: "Rate Limit überschritten",
      error: "TOO_MANY_REQUESTS",
      limits: {
        plan,
        maxRequests: (plan === "premium" || plan === "legendary") ? 1000 : 100,
        window: "1 hour",
        resetAt: resetTime
      },
      upgrade: (plan !== "premium" && plan !== "legendary") ? {
        message: "Upgrade zu Enterprise für höheres Rate Limit",
        upgradeUrl: "/pricing"
      } : null
    });
  },

  // Skip bei bestimmten Routen (z.B. Health Check)
  skip: (req) => {
    // Health Check nicht rate-limiten
    return req.path === "/health";
  }
});

/**
 * Leichteres Rate Limiting für API-Key Management Endpoints
 * (Generate, List, Delete sollten nicht so oft aufgerufen werden)
 */
const apiKeysRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 Minuten
  max: 20, // Max 20 Requests in 15 Minuten
  standardHeaders: true,
  legacyHeaders: false,

  keyGenerator: (req) => {
    if (req.user && req.user.userId) {
      return `api_keys:${req.user.userId}`;
    }
    return req.ip;
  },

  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: "Zu viele API-Key Management Requests. Bitte warte 15 Minuten.",
      error: "TOO_MANY_REQUESTS",
      resetIn: "15 minutes"
    });
  }
});

module.exports = {
  apiRateLimiter,
  apiKeysRateLimiter
};
