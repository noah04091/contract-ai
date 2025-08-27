// backend/services/rag/vectorStore.js
const { MongoClient } = require('mongodb');
const EmbeddingsService = require('./embeddings');

class VectorStore {
  constructor() {
    this.client = null;
    this.db = null;
    this.collection = null;
    this.embeddingsService = new EmbeddingsService();
    this.searchMode = process.env.VECTOR_SEARCH || 'mongodb'; // 'mongodb' or 'lite'
    this.isConnected = false;
  }

  async connect() {
    try {
      const mongoUri = process.env.MONGO_URI;
      if (!mongoUri) {
        throw new Error('MONGO_URI environment variable not set');
      }

      this.client = new MongoClient(mongoUri);
      await this.client.connect();
      
      this.db = this.client.db('contract_ai');
      this.collection = this.db.collection('contracts_embeddings');
      
      this.isConnected = true;
      console.log('✅ Connected to vector store');
      
      // Initialize indexes
      await this.initializeIndexes();
      
    } catch (error) {
      console.error('❌ Vector store connection failed:', error);
      throw error;
    }
  }

  async initializeIndexes() {
    try {
      // Create text indexes for hybrid search
      await this.collection.createIndex({
        'text': 'text',
        'metadata.fileName': 'text'
      });
      
      // Create compound indexes for filtering
      await this.collection.createIndex({
        'contractId': 1,
        'metadata.pageNum': 1,
        'chunkId': 1
      });
      
      // Try to create vector index for MongoDB Atlas
      if (this.searchMode === 'mongodb') {
        try {
          await this.createVectorSearchIndex();
        } catch (error) {
          console.warn('⚠️  MongoDB Atlas Vector Search not available, falling back to lite mode');
          this.searchMode = 'lite';
        }
      }
      
    } catch (error) {
      console.error('❌ Failed to create indexes:', error);
    }
  }

  async createVectorSearchIndex() {
    // This would typically be done through Atlas UI or Atlas CLI
    // For now, we'll assume the index exists or fallback to lite mode
    const vectorIndex = {
      'name': 'vector_index',
      'type': 'vectorSearch',
      'definition': {
        'fields': [{
          'type': 'vector',
          'path': 'vector',
          'numDimensions': this.embeddingsService.getEmbeddingDimensions(),
          'similarity': 'cosine'
        }]
      }
    };
    
    // Atlas Vector Search index creation would go here
    console.log('📋 Vector search index configuration ready');
  }

  /**
   * Store document chunks with embeddings
   */
  async indexDocument(contractId, chunks) {
    if (!this.isConnected) await this.connect();
    
    const startTime = Date.now();
    
    try {
      // Delete existing chunks for this contract
      await this.collection.deleteMany({ contractId });
      
      // Generate embeddings for all chunks
      console.log(`🔄 Generating embeddings for ${chunks.length} chunks...`);
      const chunksWithEmbeddings = await this.embeddingsService.batchGenerateEmbeddings(chunks);
      
      // Prepare documents for insertion
      const documents = chunksWithEmbeddings.map(chunk => ({
        contractId,
        chunkId: chunk.chunkId,
        text: chunk.text,
        vector: chunk.embedding ? chunk.embedding.vector : null,
        tokenCount: chunk.tokenCount,
        metadata: {
          ...chunk.metadata,
          indexedAt: new Date(),
          embeddingProvider: this.embeddingsService.provider,
          embeddingModel: this.embeddingsService.model
        },
        spans: chunk.spans
      }));
      
      // Filter out chunks without embeddings
      const validDocuments = documents.filter(doc => doc.vector !== null);
      const failedCount = documents.length - validDocuments.length;
      
      if (validDocuments.length === 0) {
        throw new Error('No valid embeddings generated for any chunks');
      }
      
      // Insert in batches to avoid document size limits
      const batchSize = 100;
      let insertedCount = 0;
      
      for (let i = 0; i < validDocuments.length; i += batchSize) {
        const batch = validDocuments.slice(i, i + batchSize);
        const result = await this.collection.insertMany(batch);
        insertedCount += result.insertedCount;
      }
      
      const duration = Date.now() - startTime;
      console.log(`✅ Indexed ${insertedCount} chunks in ${duration}ms`);
      
      if (failedCount > 0) {
        console.warn(`⚠️  ${failedCount} chunks failed to generate embeddings`);
      }
      
      return {
        contractId,
        chunksProcessed: chunks.length,
        chunksIndexed: insertedCount,
        chunksFailed: failedCount,
        duration
      };
      
    } catch (error) {
      console.error('❌ Failed to index document:', error);
      throw error;
    }
  }

  /**
   * Search for relevant chunks using hybrid approach
   */
  async search(query, contractId = null, options = {}) {
    if (!this.isConnected) await this.connect();
    
    const {
      limit = 10,
      minScore = 0.1,
      diversityThreshold = 0.85,
      includeMetadata = true
    } = options;
    
    const startTime = Date.now();
    
    try {
      let results;
      
      if (this.searchMode === 'mongodb' && this.supportsVectorSearch()) {
        results = await this.vectorSearch(query, contractId, options);
      } else {
        results = await this.liteSearch(query, contractId, options);
      }
      
      // Post-process results
      results = this.diversifyResults(results, diversityThreshold);
      results = results.slice(0, limit);
      
      const duration = Date.now() - startTime;
      console.log(`🔍 Search completed: ${results.length} results in ${duration}ms`);
      
      return {
        query,
        results: results.map(result => ({
          chunkId: result.chunkId,
          text: result.text,
          score: result.score,
          spans: result.spans,
          metadata: includeMetadata ? result.metadata : undefined
        })),
        metadata: {
          searchMode: this.searchMode,
          totalResults: results.length,
          searchTime: duration
        }
      };
      
    } catch (error) {
      console.error('❌ Search failed:', error);
      throw error;
    }
  }

  /**
   * Vector search using MongoDB Atlas Vector Search
   */
  async vectorSearch(query, contractId, options) {
    // Generate query embedding
    const queryEmbedding = await this.embeddingsService.generateEmbeddings(query);
    
    const pipeline = [
      {
        $vectorSearch: {
          index: 'vector_index',
          path: 'vector',
          queryVector: queryEmbedding.vector,
          numCandidates: options.numCandidates || 100,
          limit: options.limit || 10
        }
      }
    ];
    
    // Add contract filter if specified
    if (contractId) {
      pipeline.push({
        $match: { contractId }
      });
    }
    
    // Add score and metadata
    pipeline.push({
      $addFields: {
        score: { $meta: 'vectorSearchScore' }
      }
    });
    
    const cursor = this.collection.aggregate(pipeline);
    return await cursor.toArray();
  }

  /**
   * Lite search using cosine similarity calculation
   */
  async liteSearch(query, contractId, options) {
    // Generate query embedding
    const queryEmbedding = await this.embeddingsService.generateEmbeddings(query);
    
    // Build match query
    const matchQuery = {};
    if (contractId) {
      matchQuery.contractId = contractId;
    }
    
    // Also include text search for hybrid approach
    const hybridResults = await this.hybridTextSearch(query, contractId, options);
    
    // Get all potential matches
    const cursor = this.collection.find(matchQuery);
    const documents = await cursor.toArray();
    
    // Calculate similarities
    const results = documents.map(doc => {
      if (!doc.vector) return null;
      
      const similarity = this.embeddingsService.cosineSimilarity(
        queryEmbedding.vector,
        doc.vector
      );
      
      return {
        ...doc,
        score: similarity
      };
    }).filter(result => result && result.score >= options.minScore);
    
    // Combine with text search results
    const combinedResults = this.combineSearchResults(results, hybridResults);
    
    // Sort by score
    return combinedResults.sort((a, b) => b.score - a.score);
  }

  /**
   * Hybrid text search for better recall
   */
  async hybridTextSearch(query, contractId, options) {
    const textQuery = { $text: { $search: query } };
    
    if (contractId) {
      textQuery.contractId = contractId;
    }
    
    const cursor = this.collection.find(textQuery, {
      score: { $meta: 'textScore' }
    }).limit(50);
    
    const results = await cursor.toArray();
    
    return results.map(doc => ({
      ...doc,
      score: doc.score * 0.3 // Weight text search lower than semantic
    }));
  }

  /**
   * Combine and deduplicate search results
   */
  combineSearchResults(vectorResults, textResults) {
    const resultMap = new Map();
    
    // Add vector results
    vectorResults.forEach(result => {
      resultMap.set(result._id.toString(), result);
    });
    
    // Merge text results
    textResults.forEach(result => {
      const id = result._id.toString();
      if (resultMap.has(id)) {
        // Combine scores
        const existing = resultMap.get(id);
        existing.score = Math.max(existing.score, result.score);
      } else {
        resultMap.set(id, result);
      }
    });
    
    return Array.from(resultMap.values());
  }

  /**
   * Diversify results to avoid too similar chunks
   */
  diversifyResults(results, threshold) {
    if (results.length <= 1) return results;
    
    const diversified = [results[0]]; // Always include top result
    
    for (let i = 1; i < results.length; i++) {
      const candidate = results[i];
      let tooSimilar = false;
      
      for (const selected of diversified) {
        if (candidate.vector && selected.vector) {
          const similarity = this.embeddingsService.cosineSimilarity(
            candidate.vector,
            selected.vector
          );
          
          if (similarity > threshold) {
            tooSimilar = true;
            break;
          }
        }
      }
      
      if (!tooSimilar) {
        diversified.push(candidate);
      }
    }
    
    return diversified;
  }

  /**
   * Get document statistics
   */
  async getStats(contractId = null) {
    const matchQuery = contractId ? { contractId } : {};
    
    const stats = await this.collection.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: contractId ? null : '$contractId',
          totalChunks: { $sum: 1 },
          totalTokens: { $sum: '$tokenCount' },
          avgTokensPerChunk: { $avg: '$tokenCount' },
          uniquePages: { $addToSet: '$metadata.pageNum' }
        }
      }
    ]).toArray();
    
    return stats.map(stat => ({
      contractId: stat._id,
      totalChunks: stat.totalChunks,
      totalTokens: stat.totalTokens,
      avgTokensPerChunk: Math.round(stat.avgTokensPerChunk),
      totalPages: stat.uniquePages.length
    }));
  }

  /**
   * Delete document embeddings
   */
  async deleteDocument(contractId) {
    const result = await this.collection.deleteMany({ contractId });
    console.log(`🗑️  Deleted ${result.deletedCount} chunks for contract ${contractId}`);
    return result.deletedCount;
  }

  /**
   * Health check for vector store
   */
  async healthCheck() {
    try {
      if (!this.isConnected) await this.connect();
      
      const testSearch = await this.search('test query', null, { limit: 1 });
      
      return {
        status: 'healthy',
        searchMode: this.searchMode,
        isConnected: this.isConnected,
        totalDocuments: await this.collection.countDocuments()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        searchMode: this.searchMode,
        isConnected: this.isConnected
      };
    }
  }

  /**
   * Check if MongoDB Atlas Vector Search is supported
   */
  supportsVectorSearch() {
    // This would check if we're running on MongoDB Atlas with Vector Search enabled
    // For now, we'll use environment variable
    return process.env.MONGODB_ATLAS_VECTOR_SEARCH === 'true';
  }

  async close() {
    if (this.client) {
      await this.client.close();
      this.isConnected = false;
      console.log('📪 Vector store connection closed');
    }
  }
}

module.exports = VectorStore;