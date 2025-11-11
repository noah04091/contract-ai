// 📁 backend/services/embeddingService.js
// OpenAI Embeddings Service

const { OpenAI } = require("openai");

class EmbeddingService {
  constructor() {
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    this.model = process.env.EMBEDDINGS_MODEL || 'text-embedding-3-small';
  }

  /**
   * Generate embedding for a single text
   * @param {string} text
   * @returns {Promise<number[]>} embedding vector
   */
  async embedText(text) {
    try {
      const response = await this.openai.embeddings.create({
        model: this.model,
        input: text,
      });
      return response.data[0].embedding;
    } catch (error) {
      console.error('[EMBEDDING] Error generating embedding:', error);
      throw error;
    }
  }

  /**
   * Generate embeddings for multiple texts (batched)
   * @param {string[]} texts
   * @returns {Promise<number[][]>} array of embedding vectors
   */
  async embedBatch(texts) {
    if (texts.length === 0) return [];

    try {
      // OpenAI allows up to 2048 inputs per batch
      const batches = this.chunkArray(texts, 2048);
      const allEmbeddings = [];

      for (const batch of batches) {
        const response = await this.openai.embeddings.create({
          model: this.model,
          input: batch,
        });

        allEmbeddings.push(...response.data.map(d => d.embedding));

        // Rate limiting - wait a bit between batches
        if (batches.length > 1) {
          await this.sleep(100);
        }
      }

      return allEmbeddings;
    } catch (error) {
      console.error('[EMBEDDING] Error generating batch embeddings:', error);
      throw error;
    }
  }

  /**
   * Chunk a text into smaller pieces for embedding
   * @param {string} text
   * @param {number} maxTokens - approximate max tokens per chunk
   * @param {number} overlap - overlap between chunks
   * @returns {string[]} array of text chunks
   */
  chunkText(text, maxTokens = 800, overlap = 100) {
    if (!text || text.trim().length === 0) {
      return [];
    }

    // Simple word-based chunking (rough approximation of tokens)
    const words = text.split(/\s+/);
    const chunks = [];

    // If text is small enough, return as single chunk
    if (words.length <= maxTokens) {
      return [text];
    }

    for (let i = 0; i < words.length; i += (maxTokens - overlap)) {
      const chunk = words.slice(i, i + maxTokens).join(' ');
      if (chunk.trim().length > 0) {
        chunks.push(chunk);
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
