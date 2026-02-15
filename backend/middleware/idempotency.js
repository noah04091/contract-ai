/**
 * 🔒 Idempotency Middleware
 * Prevents duplicate processing of POST requests on network retries
 *
 * Usage: Add header "Idempotency-Key: <unique-key>" to POST requests
 * The same key will return the cached response instead of re-processing
 */

const crypto = require('crypto');

// In-memory cache for idempotency keys (for development/simple deployments)
// In production, this should be stored in Redis or MongoDB
const idempotencyCache = new Map();

// Cache TTL: 24 hours (keys expire after this time)
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

// Cleanup old entries every hour
setInterval(() => {
  const now = Date.now();
  let cleaned = 0;
  for (const [key, entry] of idempotencyCache) {
    if (now - entry.timestamp > CACHE_TTL_MS) {
      idempotencyCache.delete(key);
      cleaned++;
    }
  }
  if (cleaned > 0) {
    console.log(`🧹 [Idempotency] Cleaned ${cleaned} expired entries`);
  }
}, 60 * 60 * 1000);

/**
 * Generate a unique key for a request if not provided
 */
function generateKey(req) {
  const data = `${req.user?.userId || 'anon'}-${req.originalUrl}-${Date.now()}-${Math.random()}`;
  return crypto.createHash('sha256').update(data).digest('hex').substring(0, 32);
}

/**
 * Idempotency middleware factory
 * @param {Object} options - Configuration options
 * @param {boolean} options.required - If true, reject requests without Idempotency-Key
 * @param {string[]} options.methods - HTTP methods to apply idempotency to (default: ['POST'])
 */
function idempotency(options = {}) {
  const { required = false, methods = ['POST'] } = options;

  return async (req, res, next) => {
    // Only apply to specified methods
    if (!methods.includes(req.method)) {
      return next();
    }

    // Get idempotency key from header
    let idempotencyKey = req.headers['idempotency-key'];

    // If key is required but not provided, reject
    if (required && !idempotencyKey) {
      return res.status(400).json({
        success: false,
        error: 'Idempotency-Key header is required'
      });
    }

    // If no key provided and not required, skip idempotency check
    if (!idempotencyKey) {
      return next();
    }

    // Create a unique cache key combining user ID and idempotency key
    const userId = req.user?.userId || 'anonymous';
    const cacheKey = `${userId}:${idempotencyKey}`;

    // Check if we have a cached response
    const cached = idempotencyCache.get(cacheKey);

    if (cached) {
      // Check if the request is still processing
      if (cached.status === 'processing') {
        console.log(`⏳ [Idempotency] Request ${cacheKey.substring(0, 16)}... is still processing`);
        return res.status(409).json({
          success: false,
          error: 'Request is already being processed',
          retryAfter: 5
        });
      }

      // Return cached response
      console.log(`🔄 [Idempotency] Returning cached response for ${cacheKey.substring(0, 16)}...`);
      res.set('X-Idempotency-Replay', 'true');
      return res.status(cached.statusCode).json(cached.body);
    }

    // Mark request as processing
    idempotencyCache.set(cacheKey, {
      status: 'processing',
      timestamp: Date.now()
    });

    // Intercept the response to cache it
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      // Cache the response
      idempotencyCache.set(cacheKey, {
        status: 'completed',
        statusCode: res.statusCode,
        body,
        timestamp: Date.now()
      });
      console.log(`✅ [Idempotency] Cached response for ${cacheKey.substring(0, 16)}...`);
      return originalJson(body);
    };

    // Handle errors - remove processing status
    res.on('close', () => {
      const entry = idempotencyCache.get(cacheKey);
      if (entry?.status === 'processing') {
        // Request was aborted before completion
        idempotencyCache.delete(cacheKey);
      }
    });

    next();
  };
}

module.exports = idempotency;
