// 📁 backend/middleware/rateLimiter.js - Smart Rate Limiting for Contract AI (Built-in Implementation)

// Simple in-memory rate limiter to avoid external dependencies
const rateLimitStore = new Map();

/**
 * Simple built-in rate limiter without external dependencies
 */
const createRateLimiter = (options = {}) => {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes
    max = 10, // Limit each key to 10 requests per windowMs
    message = '⚠️ Zu viele Anfragen. Bitte warten Sie.',
    keyGenerator = (req) => req.ip,
    prefix = 'rl:'
  } = options;

  // Cleanup old entries periodically
  setInterval(() => {
    const now = Date.now();
    for (const [key, data] of rateLimitStore.entries()) {
      if (now - data.resetTime > windowMs) {
        rateLimitStore.delete(key);
      }
    }
  }, windowMs / 2); // Cleanup every half window

  return (req, res, next) => {
    try {
      const key = prefix + keyGenerator(req);
      const now = Date.now();
      
      let rateLimitData = rateLimitStore.get(key);
      
      if (!rateLimitData || (now - rateLimitData.resetTime) > windowMs) {
        // Reset or initialize
        rateLimitData = {
          count: 0,
          resetTime: now,
          windowStart: now
        };
      }
      
      rateLimitData.count++;
      rateLimitStore.set(key, rateLimitData);
      
      // Set headers
      res.set('X-RateLimit-Limit', max);
      res.set('X-RateLimit-Remaining', Math.max(0, max - rateLimitData.count));
      res.set('X-RateLimit-Reset', new Date(rateLimitData.windowStart + windowMs).toISOString());
      
      if (rateLimitData.count > max) {
        console.warn(`🚨 Rate limit exceeded for ${key}: ${rateLimitData.count}/${max}`);
        
        return res.status(429).json({
          success: false,
          error: 'RATE_LIMIT_EXCEEDED',
          message: message,
          retryAfter: Math.ceil((rateLimitData.windowStart + windowMs - now) / 1000),
          limit: max,
          current: rateLimitData.count,
          windowMs: windowMs,
          resetTime: new Date(rateLimitData.windowStart + windowMs).toISOString()
        });
      }
      
      next();
    } catch (error) {
      console.error('Rate limiter error:', error);
      // Continue without rate limiting on error
      next();
    }
  };
};

/**
 * General API Rate Limiter - Relaxed for development
 * 200 requests per 15 minutes
 */
const generalLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: '⚠️ Zu viele Anfragen. Bitte warten Sie 15 Minuten.',
  prefix: 'general:'
});

/**
 * AI Processing Rate Limiter
 * 10 requests per 10 minutes (doubled for development)
 */
const aiProcessingLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  max: 10,
  message: '🤖 KI-Analyse überlastet. Bitte warten Sie 10 Minuten.',
  keyGenerator: (req) => req.user?.userId || req.ip,
  prefix: 'ai:'
});

/**
 * Upload Rate Limiter - More permissive for development
 * 50 uploads per hour
 */
const uploadLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 50,
  message: '📁 Zu viele Datei-Uploads. Bitte warten Sie eine Stunde.',
  keyGenerator: (req) => req.user?.userId || req.ip,
  prefix: 'upload:'
});

/**
 * Premium User Rate Limiter - Higher limits
 */
const premiumLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  max: 50,
  message: '⭐ Premium-Limit erreicht. Bitte warten Sie 10 Minuten.',
  keyGenerator: (req) => req.user?.userId || req.ip,
  prefix: 'premium:'
});

/**
 * Smart Rate Limiter that adjusts based on user plan
 */
const smartRateLimiter = async (req, res, next) => {
  try {
    // Check if user has premium plan
    const isPremium = req.user?.subscriptionPlan === 'premium' || 
                     req.user?.subscriptionPlan === 'business';
    
    if (isPremium) {
      return premiumLimiter(req, res, next);
    } else {
      return aiProcessingLimiter(req, res, next);
    }
  } catch (error) {
    console.error('Rate limiter error:', error);
    // Continue without rate limiting if there's an error
    next();
  }
};

/**
 * Global Rate Limiter for Authentication endpoints
 * Prevent brute force attacks
 */
const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Very restrictive
  message: '🔐 Zu viele Login-Versuche. Bitte warten Sie 15 Minuten.',
  skipSuccessfulRequests: true,
  prefix: 'auth:'
});

/**
 * Health Check Rate Limiter
 * Allow frequent health checks but prevent abuse
 */
const healthCheckLimiter = createRateLimiter({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 50,
  message: '❤️ Zu viele Health-Checks.',
  prefix: 'health:'
});

module.exports = {
  createRateLimiter,
  generalLimiter,
  aiProcessingLimiter,
  uploadLimiter,
  premiumLimiter,
  smartRateLimiter,
  authLimiter,
  healthCheckLimiter
};