// 📁 backend/utils/openaiWithTracking.js
// 💰 OpenAI Wrapper mit automatischem Cost Tracking + Circuit Breaker
// Wrapper um openai.chat.completions.create der JEDEN Call tracked

const { getInstance: getCostTrackingService } = require("../services/costTracking");

// ⚡ CIRCUIT BREAKER - Schützt vor kaskadierten Fehlern bei OpenAI-Ausfällen
const circuitBreaker = {
  state: 'CLOSED',           // CLOSED | OPEN | HALF_OPEN
  failures: 0,               // Anzahl aufeinanderfolgender Fehler
  lastFailureTime: null,     // Zeitpunkt des letzten Fehlers
  successesInHalfOpen: 0,    // Erfolge im Half-Open Zustand

  // Konfiguration
  FAILURE_THRESHOLD: 5,      // Nach 5 Fehlern öffnet der Circuit
  SUCCESS_THRESHOLD: 2,      // 2 Erfolge im Half-Open → zurück zu Closed
  TIMEOUT_MS: 30000,         // 30 Sekunden bis Half-Open

  // Prüfen ob Request durchgelassen wird
  canRequest() {
    if (this.state === 'CLOSED') {
      return true;
    }

    if (this.state === 'OPEN') {
      // Prüfen ob Timeout abgelaufen ist
      const timeSinceFailure = Date.now() - this.lastFailureTime;
      if (timeSinceFailure >= this.TIMEOUT_MS) {
        console.log('⚡ [CIRCUIT] State: OPEN → HALF_OPEN (Timeout abgelaufen)');
        this.state = 'HALF_OPEN';
        this.successesInHalfOpen = 0;
        return true;
      }
      return false;
    }

    // HALF_OPEN: Ein Request durchlassen zum Testen
    return true;
  },

  // Erfolg registrieren
  recordSuccess() {
    if (this.state === 'HALF_OPEN') {
      this.successesInHalfOpen++;
      if (this.successesInHalfOpen >= this.SUCCESS_THRESHOLD) {
        console.log(`✅ [CIRCUIT] State: HALF_OPEN → CLOSED (${this.SUCCESS_THRESHOLD} Erfolge)`);
        this.state = 'CLOSED';
        this.failures = 0;
        this.successesInHalfOpen = 0;
      }
    } else if (this.state === 'CLOSED') {
      // Bei Erfolg Fehler-Zähler zurücksetzen
      this.failures = 0;
    }
  },

  // Fehler registrieren
  recordFailure() {
    this.lastFailureTime = Date.now();

    if (this.state === 'HALF_OPEN') {
      // Bei Fehler im Half-Open sofort wieder öffnen
      console.log('⚡ [CIRCUIT] State: HALF_OPEN → OPEN (Fehler bei Test-Request)');
      this.state = 'OPEN';
      this.successesInHalfOpen = 0;
      return;
    }

    this.failures++;
    console.log(`⚠️ [CIRCUIT] Fehler registriert: ${this.failures}/${this.FAILURE_THRESHOLD}`);

    if (this.failures >= this.FAILURE_THRESHOLD) {
      console.log(`🔴 [CIRCUIT] State: CLOSED → OPEN (${this.FAILURE_THRESHOLD} Fehler)`);
      this.state = 'OPEN';
    }
  },

  // Status für Monitoring
  getStatus() {
    return {
      state: this.state,
      failures: this.failures,
      lastFailureTime: this.lastFailureTime,
      successesInHalfOpen: this.successesInHalfOpen
    };
  }
};

/**
 * 💰 GPT-4 Turbo Kosten-Berechnung
 */
function calculateCost(promptTokens, completionTokens, model = 'gpt-4-turbo-preview') {
  const PRICING = {
    'gpt-4-turbo-preview': {
      input: 0.01 / 1000,   // $0.01 per 1K input tokens
      output: 0.03 / 1000   // $0.03 per 1K output tokens
    },
    'gpt-4-turbo': {
      input: 0.01 / 1000,
      output: 0.03 / 1000
    },
    'gpt-4': {
      input: 0.03 / 1000,
      output: 0.06 / 1000
    },
    'gpt-3.5-turbo': {
      input: 0.0005 / 1000,
      output: 0.0015 / 1000
    }
  };

  const pricing = PRICING[model] || PRICING['gpt-4-turbo-preview'];
  const cost = (promptTokens * pricing.input) + (completionTokens * pricing.output);
  return parseFloat(cost.toFixed(4));
}

/**
 * 🎁 OpenAI Wrapper mit automatischem Cost Tracking
 *
 * Usage:
 * const openai = createTrackedOpenAI(openaiClient, { userId, feature, contractId });
 * const response = await openai.chat.completions.create({...});
 * // → Cost wird automatisch getrackt!
 */
function createTrackedOpenAI(openaiClient, context = {}) {
  const { userId, feature = 'unknown', contractId, requestId } = context;

  return {
    chat: {
      completions: {
        create: async (params) => {
          const startTime = Date.now();

          // ⚡ Circuit Breaker Check
          if (!circuitBreaker.canRequest()) {
            const status = circuitBreaker.getStatus();
            const waitTime = Math.ceil((circuitBreaker.TIMEOUT_MS - (Date.now() - status.lastFailureTime)) / 1000);
            console.log(`🔴 [CIRCUIT] Request blockiert - Circuit ist OPEN (noch ${waitTime}s)`);
            const error = new Error(`OpenAI Service temporär nicht verfügbar. Bitte in ${waitTime} Sekunden erneut versuchen.`);
            error.code = 'CIRCUIT_OPEN';
            error.retryAfter = waitTime;
            throw error;
          }

          try {
            // Original OpenAI Call
            const response = await openaiClient.chat.completions.create(params);

            const endTime = Date.now();
            const duration = endTime - startTime;

            // ⚡ Erfolg registrieren
            circuitBreaker.recordSuccess();

            // Cost Tracking (async, fehlt nicht wenn es fehlschlägt)
            if (response.usage) {
              const cost = calculateCost(
                response.usage.prompt_tokens,
                response.usage.completion_tokens,
                params.model || 'gpt-4-turbo-preview'
              );

              // Track in Hintergrund (non-blocking)
              const costTracking = getCostTrackingService();
              costTracking.trackAPICall({
                userId: userId || 'unknown',
                contractId: contractId || null,
                model: params.model || 'gpt-4-turbo-preview',
                feature: feature,
                // trackAPICall liest inputTokens/outputTokens (NICHT promptTokens/completionTokens) —
                // die falschen Feldnamen führten zu $0.0000 im Cost-Tracking. Jetzt korrekt benannt.
                inputTokens: response.usage.prompt_tokens,
                outputTokens: response.usage.completion_tokens,
                totalTokens: response.usage.total_tokens,
                estimatedCost: cost,
                duration: duration
              }).catch(trackError => {
                // Cost tracking sollte nicht den Hauptflow brechen
                console.warn(`⚠️ Cost Tracking failed (non-critical):`, trackError.message);
              });

              // Logging
              console.log(`💰 [COST] ${feature}: ${response.usage.total_tokens} tokens = $${cost} (${duration}ms)`);
            }

            return response;

          } catch (error) {
            // ⚡ Fehler nur bei API-Fehlern registrieren (nicht bei Circuit-Open)
            if (error.code !== 'CIRCUIT_OPEN') {
              // Nur echte OpenAI-Fehler zählen (Rate Limit, Server Error, Timeout)
              const isTransientError =
                error.status === 429 || // Rate Limit
                error.status === 500 || // Server Error
                error.status === 502 || // Bad Gateway
                error.status === 503 || // Service Unavailable
                error.status === 504 || // Gateway Timeout
                error.code === 'ECONNRESET' ||
                error.code === 'ETIMEDOUT';

              if (isTransientError) {
                circuitBreaker.recordFailure();
              }
            }
            throw error;
          }
        }
      }
    }
  };
}

module.exports = {
  createTrackedOpenAI,
  calculateCost,
  // ⚡ Circuit Breaker Status für Health-Checks / Monitoring
  getCircuitBreakerStatus: () => circuitBreaker.getStatus(),
  // ⚡ Manueller Reset (für Admin-Zwecke)
  resetCircuitBreaker: () => {
    circuitBreaker.state = 'CLOSED';
    circuitBreaker.failures = 0;
    circuitBreaker.lastFailureTime = null;
    circuitBreaker.successesInHalfOpen = 0;
    console.log('⚡ [CIRCUIT] Manuell zurückgesetzt → CLOSED');
  }
};
