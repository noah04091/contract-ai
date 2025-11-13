// 📁 backend/services/embeddingService.js
// OpenAI Embeddings Service

const { OpenAI } = require("openai");

class EmbeddingService {
  constructor() {
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    this.model = process.env.EMBEDDINGS_MODEL || 'text-embedding-3-small';

    // 🆕 Initialize cost optimization
    const { getInstance: getCostOptimization } = require('./costOptimization');
    this.costOptimization = getCostOptimization();
  }

  /**
   * Generate embedding for a single text (with caching & cost tracking)
   * @param {string} text
   * @returns {Promise<number[]>} embedding vector
   */
  async embedText(text) {
    try {
      // 🆕 Check cache first
      const textHash = this.costOptimization.hashText(text);
      const cachedEmbedding = this.costOptimization.getCachedEmbedding(textHash);

      if (cachedEmbedding) {
        return cachedEmbedding;
      }

      // 🆕 Estimate tokens and check rate limit
      const estimatedTokens = this.estimateTokens(text);
      const rateCheck = this.costOptimization.checkRateLimit('embedding', estimatedTokens);

      if (!rateCheck.allowed) {
        console.warn(`[EMBEDDING] Rate limit reached, waiting ${rateCheck.retryAfter}s...`);
        await this.sleep(rateCheck.retryAfter * 1000);
      }

      // Make API call
      const response = await this.openai.embeddings.create({
        model: this.model,
        input: text,
      });

      const embedding = response.data[0].embedding;

      // 🆕 Track cost (usage object contains token count)
      const actualTokens = response.usage?.total_tokens || estimatedTokens;
      this.costOptimization.trackEmbeddingCost(actualTokens);

      // 🆕 Cache the result
      this.costOptimization.cacheEmbedding(textHash, embedding);

      return embedding;
    } catch (error) {
      console.error('[EMBEDDING] Error generating embedding:', error);
      throw error;
    }
  }

  /**
   * Generate embeddings for multiple texts (batched)
   * NOW: Validates token limits and handles oversized chunks gracefully
   * @param {string[]} texts
   * @returns {Promise<number[][]>} array of embedding vectors
   */
  async embedBatch(texts) {
    if (texts.length === 0) return [];

    try {
      // 🛡️ SAFETY: Validate token limits BEFORE sending to API
      const MAX_TOKENS_PER_INPUT = 8192;
      const validatedTexts = [];

      for (let i = 0; i < texts.length; i++) {
        const text = texts[i];
        const tokenCount = this.estimateTokens(text);

        if (tokenCount > MAX_TOKENS_PER_INPUT) {
          console.error(`[EMBEDDING] ⚠️ Text ${i} exceeds token limit (${tokenCount} tokens), splitting...`);

          // Emergency: Split this text further (use safer 4000 token limit)
          const subChunks = this.chunkText(text, 4000, 100);
          console.log(`[EMBEDDING] Split into ${subChunks.length} sub-chunks`);
          validatedTexts.push(...subChunks);
        } else {
          validatedTexts.push(text);
        }
      }

      // OpenAI allows up to 2048 inputs per batch
      const batches = this.chunkArray(validatedTexts, 2048);
      const allEmbeddings = [];

      for (const batch of batches) {
        // 🆕 Check rate limit before batch
        const batchTokens = batch.reduce((sum, text) => sum + this.estimateTokens(text), 0);
        const rateCheck = this.costOptimization.checkRateLimit('embedding', batchTokens);

        if (!rateCheck.allowed) {
          console.warn(`[EMBEDDING] Rate limit reached, waiting ${rateCheck.retryAfter}s...`);
          await this.sleep(rateCheck.retryAfter * 1000);
        }

        const response = await this.openai.embeddings.create({
          model: this.model,
          input: batch,
        });

        allEmbeddings.push(...response.data.map(d => d.embedding));

        // 🆕 Track cost for this batch
        const actualTokens = response.usage?.total_tokens || batchTokens;
        this.costOptimization.trackEmbeddingCost(actualTokens);

        // Rate limiting - wait a bit between batches
        if (batches.length > 1) {
          await this.sleep(100);
        }
      }

      return allEmbeddings;
    } catch (error) {
      console.error('[EMBEDDING] Error generating batch embeddings:', error);

      // If error contains token limit info, provide helpful message
      if (error.message && error.message.includes('maximum context length')) {
        console.error('[EMBEDDING] 🚨 Token limit exceeded! Please check input sizes.');
      }

      throw error;
    }
  }

  /**
   * Estimate token count for a text (rough approximation)
   * Rule: ~2.5 characters = 1 token (VERY CONSERVATIVE for safety)
   * OpenAI's actual tokenization can be MUCH HIGHER than character-based estimates,
   * especially for special chars, numbers, punctuation, and German compound words.
   * @param {string} text
   * @returns {number} estimated token count
   */
  estimateTokens(text) {
    if (!text) return 0;
    // VERY CONSERVATIVE estimate: 1 token per 2.5 characters
    return Math.ceil(text.length / 2.5);
  }

  /**
   * Chunk a text into smaller pieces for embedding
   * NOW: Uses token-safe chunking to prevent exceeding OpenAI's 8192 token limit
   * @param {string} text
   * @param {number} maxTokens - max tokens per chunk (default: 4000 for MAXIMUM safety margin)
   * @param {number} overlap - overlap between chunks in tokens
   * @returns {string[]} array of text chunks
   */
  chunkText(text, maxTokens = 4000, overlap = 100) {
    if (!text || text.trim().length === 0) {
      return [];
    }

    const estimatedTokens = this.estimateTokens(text);

    // If text is small enough, return as single chunk
    if (estimatedTokens <= maxTokens) {
      return [text];
    }

    // Character-based chunking (more accurate for token limits)
    const charsPerChunk = Math.floor(maxTokens * 2.5); // ~2.5 chars per token (VERY CONSERVATIVE)
    const overlapChars = Math.floor(overlap * 2.5);
    const chunks = [];

    for (let i = 0; i < text.length; i += (charsPerChunk - overlapChars)) {
      const chunk = text.substring(i, i + charsPerChunk);

      if (chunk.trim().length > 0) {
        // Double-check this chunk doesn't exceed limit
        const chunkTokens = this.estimateTokens(chunk);

        if (chunkTokens > maxTokens) {
          // Emergency: Further split oversized chunk
          console.warn(`[EMBEDDING] Chunk exceeds ${maxTokens} tokens (${chunkTokens}), splitting further...`);
          const subChunks = this.chunkText(chunk, Math.floor(maxTokens / 2), overlap);
          chunks.push(...subChunks);
        } else {
          chunks.push(chunk);
        }
      }
    }

    return chunks;
  }

  /**
   * Pseudonymize sensitive data before embedding
   * @param {string} text
   * @returns {string} pseudonymized text
   */
  pseudonymize(text) {
    let cleaned = text;

    // Remove email addresses
    cleaned = cleaned.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL]');

    // Remove IBANs (simplified pattern)
    cleaned = cleaned.replace(/\b[A-Z]{2}\d{2}[\s]?[\d]{4}[\s]?[\d]{4}[\s]?[\d]{4}[\s]?[\d]{4}[\s]?[\d]{0,2}\b/g, '[IBAN]');

    // Remove phone numbers (simplified)
    cleaned = cleaned.replace(/\b(\+\d{1,3}[\s-]?)?\(?\d{2,4}\)?[\s.-]?\d{3,4}[\s.-]?\d{3,4}\b/g, '[PHONE]');

    // Remove specific person names (basic - looks for "Herr/Frau Lastname")
    cleaned = cleaned.replace(/\b(Herr|Frau|Mr\.|Mrs\.|Ms\.)\s+[A-ZÄÖÜ][a-zäöüß]+\b/g, '[NAME]');

    return cleaned;
  }

  /**
   * Utility: Split array into chunks
   */
  chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Utility: Sleep for ms
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = EmbeddingService;
