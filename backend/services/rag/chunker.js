// backend/services/rag/chunker.js
const { encode, decode } = require('gpt-tokenizer');

class DocumentChunker {
  constructor(options = {}) {
    this.chunkSize = options.chunkSize || 1000; // tokens
    this.overlapSize = options.overlapSize || 250; // tokens
    this.minChunkSize = options.minChunkSize || 100; // tokens
  }

  /**
   * Chunks document text into overlapping segments with token-awareness
   * @param {string} text - The document text to chunk
   * @param {Object} metadata - Additional metadata (fileName, pageNum, etc.)
   * @returns {Array} Array of chunk objects
   */
  chunkText(text, metadata = {}) {
    try {
      // Normalize text
      const normalizedText = this.normalizeText(text);
      
      // Split into sentences for better semantic boundaries
      const sentences = this.splitIntoSentences(normalizedText);
      
      const chunks = [];
      let currentChunk = [];
      let currentTokenCount = 0;
      let chunkId = 0;

      for (let i = 0; i < sentences.length; i++) {
        const sentence = sentences[i];
        const sentenceTokens = this.getTokenCount(sentence);
        
        // If adding this sentence would exceed chunk size, finalize current chunk
        if (currentTokenCount + sentenceTokens > this.chunkSize && currentChunk.length > 0) {
          const chunkText = currentChunk.join(' ').trim();
          
          if (this.getTokenCount(chunkText) >= this.minChunkSize) {
            chunks.push(this.createChunk(chunkText, chunkId++, metadata));
          }
          
          // Start new chunk with overlap
          currentChunk = this.getOverlapSentences(currentChunk, this.overlapSize);
          currentTokenCount = this.getTokenCount(currentChunk.join(' '));
        }
        
        currentChunk.push(sentence);
        currentTokenCount += sentenceTokens;
      }
      
      // Handle final chunk
      if (currentChunk.length > 0) {
        const chunkText = currentChunk.join(' ').trim();
        if (this.getTokenCount(chunkText) >= this.minChunkSize) {
          chunks.push(this.createChunk(chunkText, chunkId++, metadata));
        }
      }
      
      return chunks;
    } catch (error) {
      console.error('Error chunking text:', error);
      throw new Error('Failed to chunk document text');
    }
  }

  /**
   * Chunks by pages for PDF documents
   * @param {Array} pages - Array of page objects with text and pageNum
   * @param {Object} metadata - Document metadata
   * @returns {Array} Array of chunk objects
   */
  chunkByPages(pages, metadata = {}) {
    const allChunks = [];
    
    for (const page of pages) {
      const pageChunks = this.chunkText(page.text, {
        ...metadata,
        pageNum: page.pageNum,
        totalPages: pages.length
      });
      
      // Add page-specific span information
      pageChunks.forEach(chunk => {
        chunk.spans = {
          pageStart: page.pageNum,
          pageEnd: page.pageNum,
          charStart: 0,
          charEnd: page.text.length
        };
      });
      
      allChunks.push(...pageChunks);
    }
    
    return allChunks;
  }

  /**
   * Creates a standardized chunk object
   */
  createChunk(text, chunkId, metadata) {
    const tokenCount = this.getTokenCount(text);
    
    return {
      chunkId,
      text: text.trim(),
      tokenCount,
      metadata: {
        ...metadata,
        timestamp: new Date().toISOString()
      },
      spans: {
        pageStart: metadata.pageNum || 1,
        pageEnd: metadata.pageNum || 1,
        charStart: 0,
        charEnd: text.length
      }
    };
  }

  /**
   * Normalizes text by removing extra whitespace and formatting
   */
  normalizeText(text) {
    return text
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[ \t]+/g, ' ')
      .trim();
  }

  /**
   * Splits text into sentences using regex patterns
   */
  splitIntoSentences(text) {
    // Enhanced sentence splitting that handles legal documents
    const sentences = text.split(/(?<=[.!?])\s+(?=[A-ZÄÖÜ]|\d+\.|§|Art\.|Abs\.)/)
      .filter(s => s.trim().length > 0)
      .map(s => s.trim());
    
    return sentences;
  }

  /**
   * Gets overlap sentences from the end of current chunk
   */
  getOverlapSentences(sentences, overlapTokens) {
    const overlapSentences = [];
    let tokenCount = 0;
    
    // Take sentences from the end until we reach overlap size
    for (let i = sentences.length - 1; i >= 0 && tokenCount < overlapTokens; i--) {
      const sentence = sentences[i];
      const sentenceTokens = this.getTokenCount(sentence);
      
      if (tokenCount + sentenceTokens <= overlapTokens) {
        overlapSentences.unshift(sentence);
        tokenCount += sentenceTokens;
      } else {
        break;
      }
    }
    
    return overlapSentences;
  }

  /**
   * Gets token count for text using GPT tokenizer
   */
  getTokenCount(text) {
    try {
      if (!text || typeof text !== 'string') return 0;
      return encode(text).length;
    } catch (error) {
      // Fallback to rough estimate: 1 token ≈ 4 characters
      return Math.ceil(text.length / 4);
    }
  }

  /**
   * Validates chunk quality
   */
  validateChunk(chunk) {
    const issues = [];
    
    if (!chunk.text || chunk.text.trim().length === 0) {
      issues.push('Empty chunk text');
    }
    
    if (chunk.tokenCount < this.minChunkSize) {
      issues.push(`Chunk too small: ${chunk.tokenCount} tokens`);
    }
    
    if (chunk.tokenCount > this.chunkSize * 1.5) {
      issues.push(`Chunk too large: ${chunk.tokenCount} tokens`);
    }
    
    return {
      isValid: issues.length === 0,
      issues
    };
  }
}

module.exports = DocumentChunker;