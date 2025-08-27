// backend/utils/errorHandler.js
const telemetry = require('../services/telemetry');

class ChatError extends Error {
  constructor(message, code = 'CHAT_ERROR', statusCode = 500, context = {}) {
    super(message);
    this.name = 'ChatError';
    this.code = code;
    this.statusCode = statusCode;
    this.context = context;
    this.timestamp = new Date().toISOString();
  }
}

class RAGError extends Error {
  constructor(message, code = 'RAG_ERROR', statusCode = 500, context = {}) {
    super(message);
    this.name = 'RAGError';
    this.code = code;
    this.statusCode = statusCode;
    this.context = context;
    this.timestamp = new Date().toISOString();
  }
}

class ToolError extends Error {
  constructor(message, toolName, code = 'TOOL_ERROR', statusCode = 500, context = {}) {
    super(message);
    this.name = 'ToolError';
    this.code = code;
    this.statusCode = statusCode;
    this.toolName = toolName;
    this.context = context;
    this.timestamp = new Date().toISOString();
  }
}

class StreamingError extends Error {
  constructor(message, code = 'STREAMING_ERROR', statusCode = 500, context = {}) {
    super(message);
    this.name = 'StreamingError';
    this.code = code;
    this.statusCode = statusCode;
    this.context = context;
    this.timestamp = new Date().toISOString();
  }
}

/**
 * Enhanced error handler for Chat v2
 */
class ErrorHandler {
  constructor() {
    this.retryAttempts = new Map(); // Track retry attempts per operation
    this.circuitBreakers = new Map(); // Circuit breaker state per service
  }

  /**
   * Handle and categorize errors
   */
  handleError(error, context = {}) {
    // Track error in telemetry
    telemetry.trackError(error, context);
    
    // Enhance error with context
    const enhancedError = this.enhanceError(error, context);
    
    // Log error with appropriate level
    this.logError(enhancedError, context);
    
    return enhancedError;
  }

  /**
   * Enhance error with additional context
   */
  enhanceError(error, context) {
    if (error.name === 'ChatError' || error.name === 'RAGError' || 
        error.name === 'ToolError' || error.name === 'StreamingError') {
      return error;
    }

    // Convert generic errors to specific types
    if (context.component === 'rag') {
      return new RAGError(error.message, 'RAG_UNKNOWN_ERROR', 500, {
        ...context,
        originalError: error.name
      });
    }
    
    if (context.component === 'tool' && context.toolName) {
      return new ToolError(error.message, context.toolName, 'TOOL_UNKNOWN_ERROR', 500, {
        ...context,
        originalError: error.name
      });
    }
    
    if (context.component === 'streaming') {
      return new StreamingError(error.message, 'STREAMING_UNKNOWN_ERROR', 500, {
        ...context,
        originalError: error.name
      });
    }
    
    return new ChatError(error.message, 'UNKNOWN_ERROR', 500, {
      ...context,
      originalError: error.name
    });
  }

  /**
   * Log error with appropriate severity
   */
  logError(error, context) {
    const logData = {
      timestamp: new Date().toISOString(),
      level: this.getErrorLevel(error),
      name: error.name,
      code: error.code,
      message: error.message,
      statusCode: error.statusCode,
      context: context,
      stack: error.stack
    };

    switch (logData.level) {
      case 'critical':
        console.error('🚨 CRITICAL ERROR:', logData);
        break;
      case 'error':
        console.error('❌ ERROR:', logData);
        break;
      case 'warning':
        console.warn('⚠️  WARNING:', logData);
        break;
      default:
        console.log('ℹ️  INFO:', logData);
    }
  }

  /**
   * Determine error severity level
   */
  getErrorLevel(error) {
    if (error.statusCode >= 500) {
      return 'critical';
    }
    if (error.statusCode >= 400) {
      return 'error';
    }
    if (error.code?.includes('TIMEOUT') || error.code?.includes('RATE_LIMIT')) {
      return 'warning';
    }
    return 'info';
  }

  /**
   * Retry mechanism with exponential backoff
   */
  async withRetry(operation, options = {}) {
    const {
      maxRetries = 3,
      baseDelay = 1000,
      maxDelay = 10000,
      backoffFactor = 2,
      retryCondition = (error) => error.statusCode >= 500,
      operationId = 'unknown'
    } = options;

    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      try {
        const result = await operation();
        
        // Clear retry attempts on success
        this.retryAttempts.delete(operationId);
        
        return result;
      } catch (error) {
        lastError = error;
        
        // Track retry attempt
        this.retryAttempts.set(operationId, attempt);
        
        if (attempt > maxRetries || !retryCondition(error)) {
          throw this.handleError(error, { 
            operation: operationId, 
            attemptNumber: attempt,
            finalAttempt: true
          });
        }
        
        // Calculate delay with exponential backoff
        const delay = Math.min(
          baseDelay * Math.pow(backoffFactor, attempt - 1),
          maxDelay
        );
        
        // Add jitter to prevent thundering herd
        const jitteredDelay = delay + Math.random() * 1000;
        
        console.log(`🔄 Retry attempt ${attempt}/${maxRetries} for ${operationId} in ${Math.round(jitteredDelay)}ms`);
        
        await new Promise(resolve => setTimeout(resolve, jitteredDelay));
      }
    }
    
    throw lastError;
  }

  /**
   * Circuit breaker pattern
   */
  async withCircuitBreaker(operation, serviceName, options = {}) {
    const {
      failureThreshold = 5,
      recoveryTimeout = 60000,
      monitoringPeriod = 30000
    } = options;

    const circuitState = this.circuitBreakers.get(serviceName) || {
      state: 'CLOSED', // CLOSED, OPEN, HALF_OPEN
      failures: 0,
      lastFailureTime: null,
      nextAttemptTime: null
    };

    // Check if circuit is open
    if (circuitState.state === 'OPEN') {
      if (Date.now() < circuitState.nextAttemptTime) {
        throw new ChatError(
          `Service ${serviceName} is temporarily unavailable (circuit breaker open)`,
          'CIRCUIT_BREAKER_OPEN',
          503,
          { serviceName, circuitState }
        );
      } else {
        circuitState.state = 'HALF_OPEN';
        console.log(`🔄 Circuit breaker for ${serviceName} is now HALF_OPEN`);
      }
    }

    try {
      const result = await operation();
      
      // Reset on success
      if (circuitState.state === 'HALF_OPEN') {
        circuitState.state = 'CLOSED';
        circuitState.failures = 0;
        circuitState.lastFailureTime = null;
        circuitState.nextAttemptTime = null;
        console.log(`✅ Circuit breaker for ${serviceName} is now CLOSED`);
      }
      
      this.circuitBreakers.set(serviceName, circuitState);
      return result;
      
    } catch (error) {
      circuitState.failures++;
      circuitState.lastFailureTime = Date.now();
      
      // Open circuit if threshold exceeded
      if (circuitState.failures >= failureThreshold) {
        circuitState.state = 'OPEN';
        circuitState.nextAttemptTime = Date.now() + recoveryTimeout;
        console.error(`🚨 Circuit breaker for ${serviceName} is now OPEN`);
      }
      
      this.circuitBreakers.set(serviceName, circuitState);
      throw error;
    }
  }

  /**
   * Graceful degradation helper
   */
  async withFallback(primaryOperation, fallbackOperation, context = {}) {
    try {
      return await primaryOperation();
    } catch (error) {
      console.warn(`⚠️  Primary operation failed, using fallback:`, {
        error: error.message,
        context
      });
      
      telemetry.trackChatEvent('fallback_triggered', {
        ...context,
        primaryError: error.message
      });
      
      try {
        return await fallbackOperation();
      } catch (fallbackError) {
        console.error('❌ Fallback operation also failed:', fallbackError);
        throw this.handleError(fallbackError, {
          ...context,
          primaryError: error.message,
          fallbackFailed: true
        });
      }
    }
  }

  /**
   * Timeout wrapper
   */
  async withTimeout(operation, timeoutMs = 30000, operationName = 'operation') {
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`${operationName} timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    });

    try {
      return await Promise.race([operation(), timeoutPromise]);
    } catch (error) {
      if (error.message.includes('timed out')) {
        throw new ChatError(
          error.message,
          'OPERATION_TIMEOUT',
          408,
          { operationName, timeoutMs }
        );
      }
      throw error;
    }
  }

  /**
   * Express middleware for error handling
   */
  middleware() {
    return (error, req, res, next) => {
      const enhancedError = this.handleError(error, {
        component: 'express',
        method: req.method,
        url: req.url,
        userAgent: req.get('User-Agent'),
        userId: req.user?.userId
      });

      // Send appropriate response
      const statusCode = enhancedError.statusCode || 500;
      const response = {
        error: true,
        code: enhancedError.code,
        message: this.getPublicErrorMessage(enhancedError),
        timestamp: enhancedError.timestamp
      };

      // Include details in development
      if (process.env.NODE_ENV === 'development') {
        response.details = enhancedError.context;
        response.stack = enhancedError.stack;
      }

      res.status(statusCode).json(response);
    };
  }

  /**
   * Get public-facing error message
   */
  getPublicErrorMessage(error) {
    const publicMessages = {
      'CHAT_ERROR': 'Ein Fehler beim Chat ist aufgetreten. Bitte versuchen Sie es erneut.',
      'RAG_ERROR': 'Fehler beim Abrufen der Dokumenteninformationen.',
      'TOOL_ERROR': 'Ein Tool-Fehler ist aufgetreten.',
      'STREAMING_ERROR': 'Fehler beim Streaming der Antwort.',
      'CIRCUIT_BREAKER_OPEN': 'Der Service ist vorübergehend nicht verfügbar.',
      'OPERATION_TIMEOUT': 'Die Anfrage dauerte zu lange. Bitte versuchen Sie es erneut.',
      'RATE_LIMIT_EXCEEDED': 'Zu viele Anfragen. Bitte warten Sie einen Moment.'
    };

    return publicMessages[error.code] || 'Ein unerwarteter Fehler ist aufgetreten.';
  }

  /**
   * Get circuit breaker status
   */
  getCircuitBreakerStatus() {
    const status = {};
    for (const [serviceName, state] of this.circuitBreakers.entries()) {
      status[serviceName] = {
        state: state.state,
        failures: state.failures,
        lastFailureTime: state.lastFailureTime,
        nextAttemptTime: state.nextAttemptTime
      };
    }
    return status;
  }
}

// Create singleton instance
const errorHandler = new ErrorHandler();

module.exports = {
  ErrorHandler,
  ChatError,
  RAGError,
  ToolError,
  StreamingError,
  errorHandler
};