// backend/middleware/rateLimiter.js
// Rate Limiting fuer Contract AI API Endpoints

const rateLimit = require('express-rate-limit');

const standardLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: {
    error: 'Zu viele Anfragen',
    message: 'Bitte warten Sie einige Minuten und versuchen Sie es erneut.',
    retryAfter: '15 Minuten'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id || req.ip
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: {
    error: 'Zu viele Anmeldeversuche',
    message: 'Bitte warten Sie 15 Minuten und versuchen Sie es erneut.',
    retryAfter: '15 Minuten'
  },
  standardHeaders: true,
  legacyHeaders: false
});

const analyzeLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 50,
  message: {
    error: 'Analyse-Limit erreicht',
    message: 'Sie haben das stuendliche Analyse-Limit erreicht.',
    retryAfter: '1 Stunde'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id || req.ip
});

const legalPulseLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: {
    error: 'Legal Pulse Limit erreicht',
    message: 'Zu viele Anfragen an Legal Pulse.',
    retryAfter: '15 Minuten'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id || req.ip
});

const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  message: {
    error: 'Upload-Limit erreicht',
    message: 'Sie haben das stuendliche Upload-Limit erreicht.',
    retryAfter: '1 Stunde'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id || req.ip
});

const sensitiveLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    error: 'Zu viele sensible Anfragen',
    message: 'Bitte warten Sie einige Minuten.',
    retryAfter: '15 Minuten'
  },
  standardHeaders: true,
  legacyHeaders: false
});

const sseLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: {
    error: 'Zu viele Stream-Verbindungen',
    message: 'Bitte warten Sie eine Minute.',
    retryAfter: '1 Minute'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id || req.ip
});

function createDynamicLimiter(options) {
  const freeLimit = options.freeLimit;
  const premiumMultiplier = options.premiumMultiplier || 3;
  const windowMs = options.windowMs || 15 * 60 * 1000;
  
  return rateLimit({
    windowMs,
    max: (req) => {
      const plan = req.user?.subscriptionPlan?.toLowerCase() || 'free';
      const isPaidPlan = ['business', 'enterprise', 'legendary'].includes(plan);
      return isPaidPlan ? freeLimit * premiumMultiplier : freeLimit;
    },
    message: {
      error: 'Rate Limit erreicht',
      message: 'Premium-Nutzer haben hoehere Limits.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.user?.id || req.ip
  });
}

function skipForPremium(req) {
  const plan = req.user?.subscriptionPlan?.toLowerCase() || 'free';
  return ['business', 'enterprise', 'legendary'].includes(plan);
}

module.exports = {
  standardLimiter,
  authLimiter,
  analyzeLimiter,
  legalPulseLimiter,
  uploadLimiter,
  sensitiveLimiter,
  sseLimiter,
  createDynamicLimiter,
  skipForPremium
};
