// 📁 backend/utils/openaiWithTracking.js
// 💰 OpenAI Wrapper mit automatischem Cost Tracking
// Wrapper um openai.chat.completions.create der JEDEN Call tracked

const { getInstance: getCostTrackingService } = require("../services/costTracking");

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

          try {
            // Original OpenAI Call
            const response = await openaiClient.chat.completions.create(params);

            const endTime = Date.now();
            const duration = endTime - startTime;

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
                promptTokens: response.usage.prompt_tokens,
                completionTokens: response.usage.completion_tokens,
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
            // OpenAI Error - nicht tracken, einfach weiterwerfen
            throw error;
          }
        }
      }
    }
  };
}

module.exports = {
  createTrackedOpenAI,
  calculateCost
};
