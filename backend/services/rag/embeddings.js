// backend/services/rag/embeddings.js
const { OpenAI } = require('openai');

class EmbeddingsService {
  constructor() {
    this.provider = process.env.EMBEDDINGS_PROVIDER || 'openai';
    this.model = process.env.EMBEDDINGS_MODEL || 'text-embedding-3-large';
    
    // Initialize provider clients
    this.initializeProviders();
  }

  initializeProviders() {
    switch (this.provider) {
      case 'openai':
        this.openai = new OpenAI({ 
          apiKey: process.env.OPENAI_API_KEY 
        });
        break;
      case 'anthropic':
        // Future implementation
        throw new Error('Anthropic embeddings not yet implemented');
      case 'huggingface':
        // Future implementation
        throw new Error('HuggingFace embeddings not yet implemented');
      default:
        throw new Error(`Unsupported embeddings provider: ${this.provider}`);
    }
  }

  /**
   * Generate embeddings for text chunks
   * @param {Array|string} input - Array of texts or single text
   * @returns {Promise<Array>} Array of embedding vectors
   */
  async generateEmbeddings(input) {
    const startTime = Date.now();
    
    try {
      const texts = Array.isArray(input) ? input : [input];
      
      // Validate input
      this.validateInput(texts);
      
      // Generate embeddings based on provider
      let embeddings;
      switch (this.provider) {
        case 'openai':
          embeddings = await this.generateOpenAIEmbeddings(texts);
          break;
        default:
          throw new Error(`Provider ${this.provider} not implemented`);
      }
      
      // Log telemetry
      const duration = Date.now() - startTime;
      console.log(`Generated ${embeddings.length} embeddings in ${duration}ms`);
      
      return Array.isArray(input) ? embeddings : embeddings[0];
      
    } catch (error) {
      console.error('Error generating embeddings:', error);
      throw new Error(`Failed to generate embeddings: ${error.message}`);
    }
  }

  /**
   * Generate embeddings using OpenAI
   */
  async generateOpenAIEmbeddings(texts) {
    try {
      const response = await this.openai.embeddings.create({
        model: this.model,
        input: texts,
        encoding_format: 'float'
      });
      
      return response.data.map(item => ({
        vector: item.embedding,
        dimensions: item.embedding.length,
        model: this.model,
        provider: 'openai'
      }));
      
    } catch (error) {
      if (error.status === 429) {
        throw new Error('Rate limit exceeded for OpenAI embeddings');
      } else if (error.status === 401) {
        throw new Error('Invalid OpenAI API key');
      } else if (error.status === 413) {
        throw new Error('Input text too large for embeddings');
      }
      throw error;
    }
  }

  /**
   * Validate input texts for embedding generation
   */
  validateInput(texts) {
    if (!Array.isArray(texts) || texts.length === 0) {
      throw new Error('Input must be a non-empty array of texts');
    }
    
    for (let i = 0; i < texts.length; i++) {
      const text = texts[i];
      if (typeof text !== 'string' || text.trim().length === 0) {
        throw new Error(`Text at index ${i} is invalid or empty`);
      }
      
      // Check token limit (OpenAI has ~8191 token limit for embeddings)
      if (this.estimateTokens(text) > 8000) {
        throw new Error(`Text at index ${i} exceeds token limit`);
      }
    }
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  cosineSimilarity(vectorA, vectorB) {
    if (vectorA.length !== vectorB.length) {
      throw new Error('Vectors must have same dimensions');
    }
    
    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;
    
    for (let i = 0; i < vectorA.length; i++) {
      dotProduct += vectorA[i] * vectorB[i];
      magnitudeA += vectorA[i] * vectorA[i];
      magnitudeB += vectorB[i] * vectorB[i];
    }
    
    if (magnitudeA === 0 || magnitudeB === 0) {
      return 0;
    }
    
    return dotProduct / (Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB));
  }

  /**
   * Batch process embeddings with rate limiting
   */
  async batchGenerateEmbeddings(textChunks, batchSize = 100, delayMs = 100) {
    const allEmbeddings = [];
    
    for (let i = 0; i < textChunks.length; i += batchSize) {
      const batch = textChunks.slice(i, i + batchSize);
      const batchTexts = batch.map(chunk => chunk.text || chunk);
      
      try {
        const batchEmbeddings = await this.generateEmbeddings(batchTexts);
        
        // Merge embeddings with chunk metadata
        const enrichedEmbeddings = batch.map((chunk, idx) => ({
          ...chunk,
          embedding: batchEmbeddings[idx]
        }));
        
        allEmbeddings.push(...enrichedEmbeddings);
        
        // Rate limiting delay
        if (i + batchSize < textChunks.length) {
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
        
        console.log(`Processed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(textChunks.length / batchSize)}`);
        
      } catch (error) {
        console.error(`Failed to process batch starting at index ${i}:`, error);
        
        // Add empty embeddings for failed batch to maintain alignment
        const failedEmbeddings = batch.map(chunk => ({
          ...chunk,
          embedding: null,
          error: error.message
        }));
        allEmbeddings.push(...failedEmbeddings);
      }
    }
    
    return allEmbeddings;
  }

  /**
   * Get embedding dimensions for the current model
   */
  getEmbeddingDimensions() {
    const dimensions = {
      'text-embedding-3-large': 3072,
      'text-embedding-3-small': 1536,
      'text-embedding-ada-002': 1536
    };
    
    return dimensions[this.model] || 1536;
  }

  /**
   * Estimate token count (rough approximation)
   */
  estimateTokens(text) {
    // Rough estimate: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }

  /**
   * Health check for embeddings service
   */
  async healthCheck() {
    try {
      const testEmbedding = await this.generateEmbeddings(['test']);
      return {
        status: 'healthy',
        provider: this.provider,
        model: this.model,
        dimensions: testEmbedding[0].dimensions
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        provider: this.provider,
        model: this.model,
        error: error.message
      };
    }
  }
}

module.exports = EmbeddingsService;