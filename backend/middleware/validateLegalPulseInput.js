// 📁 backend/middleware/validateLegalPulseInput.js
// Input Validation für Legal Pulse API Endpoints
// Verhindert MongoDB Injection und ungültige Parameter

const ALLOWED_AREAS = [
  'Arbeitsrecht',
  'Datenschutz',
  'Verbraucherschutz',
  'Mietrecht',
  'Kaufrecht',
  'Vertragsrecht',
  'Handelsrecht',
  'Gesellschaftsrecht',
  'Steuerrecht',
  'Versicherungsrecht',
  'Baurecht',
  'IT-Recht',
  'Urheberrecht',
  'Markenrecht',
  'Wettbewerbsrecht'
];

const ALLOWED_RISK_FILTERS = ['all', 'critical', 'high', 'medium', 'low'];
const ALLOWED_SORT_OPTIONS = ['name', 'date', 'risk', '-name', '-date', '-risk', 'riskScore', '-riskScore'];
const ALLOWED_SEVERITY = ['low', 'medium', 'high', 'critical'];

/**
 * Sanitize string input - removes potential injection characters
 */
function sanitizeString(input) {
  if (typeof input !== 'string') return '';

  // Remove MongoDB operators and dangerous characters
  return input
    .replace(/\$|{|}|\[|\]|;|'|"|`|\\|\|/g, '')
    .trim()
    .substring(0, 500); // Max 500 chars
}

/**
 * Validate Legal Pulse query parameters
 */
function validateLegalPulseQuery(req, res, next) {
  const { search, riskFilter, sort, limit, skip, area } = req.query;

  // Validate riskFilter
  if (riskFilter && !ALLOWED_RISK_FILTERS.includes(riskFilter)) {
    return res.status(400).json({
      error: 'Invalid risk filter',
      allowed: ALLOWED_RISK_FILTERS
    });
  }

  // Validate sort
  if (sort && !ALLOWED_SORT_OPTIONS.includes(sort)) {
    return res.status(400).json({
      error: 'Invalid sort option',
      allowed: ALLOWED_SORT_OPTIONS
    });
  }

  // Validate area
  if (area && !ALLOWED_AREAS.includes(area)) {
    return res.status(400).json({
      error: 'Invalid law area',
      allowed: ALLOWED_AREAS
    });
  }

  // Validate limit (1-100)
  if (limit) {
    const limitNum = parseInt(limit);
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      return res.status(400).json({
        error: 'Invalid limit',
        message: 'Limit must be between 1 and 100'
      });
    }
    req.query.limit = limitNum.toString();
  }

  // Validate skip (0+)
  if (skip) {
    const skipNum = parseInt(skip);
    if (isNaN(skipNum) || skipNum < 0) {
      return res.status(400).json({
        error: 'Invalid skip',
        message: 'Skip must be 0 or greater'
      });
    }
    req.query.skip = skipNum.toString();
  }

  // Sanitize search query
  if (search) {
    req.query.search = sanitizeString(search);
  }

  next();
}

/**
 * Validate Legal Pulse body parameters (POST/PUT)
 */
function validateLegalPulseBody(req, res, next) {
  const { area, severity, categories, similarityThreshold } = req.body;

  // Validate area
  if (area && !ALLOWED_AREAS.includes(area)) {
    return res.status(400).json({
      error: 'Invalid law area',
      allowed: ALLOWED_AREAS
    });
  }

  // Validate severity
  if (severity && !ALLOWED_SEVERITY.includes(severity)) {
    return res.status(400).json({
      error: 'Invalid severity',
      allowed: ALLOWED_SEVERITY
    });
  }

  // Validate categories array
  if (categories) {
    if (!Array.isArray(categories)) {
      return res.status(400).json({
        error: 'Categories must be an array'
      });
    }

    const invalidCategories = categories.filter(cat => !ALLOWED_AREAS.includes(cat));
    if (invalidCategories.length > 0) {
      return res.status(400).json({
        error: 'Invalid categories',
        invalid: invalidCategories,
        allowed: ALLOWED_AREAS
      });
    }
  }

  // Validate similarityThreshold (0.0 - 1.0)
  if (similarityThreshold !== undefined) {
    const threshold = parseFloat(similarityThreshold);
    if (isNaN(threshold) || threshold < 0 || threshold > 1) {
      return res.status(400).json({
        error: 'Invalid similarity threshold',
        message: 'Must be between 0.0 and 1.0'
      });
    }
    req.body.similarityThreshold = threshold;
  }

  next();
}

/**
 * Combined middleware for all Legal Pulse endpoints
 */
function validateLegalPulseInput(req, res, next) {
  if (req.method === 'GET') {
    return validateLegalPulseQuery(req, res, next);
  } else if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    return validateLegalPulseBody(req, res, next);
  }
  next();
}

module.exports = {
  validateLegalPulseInput,
  validateLegalPulseQuery,
  validateLegalPulseBody,
  sanitizeString,
  ALLOWED_AREAS,
  ALLOWED_RISK_FILTERS,
  ALLOWED_SORT_OPTIONS,
  ALLOWED_SEVERITY
};
