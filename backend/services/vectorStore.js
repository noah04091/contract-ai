// backend/services/vectorStore.js
// Hybrid Vector Store: MongoDB Atlas Vector Search with In-Memory Fallback

const { MongoClient } = require("mongodb");

class VectorStore {
  constructor() {
    this.contractVectors = new Map(); // In-memory fallback
    this.lawVectors = new Map();
    this.mongoClient = null;
    this.db = null;
    this.atlasVectorSearchAvailable = false; // Detected at init
  }

  /**
   * Initialize MongoDB connection and detect Atlas Vector Search capability
   */
  async init() {
    try {
      const mongoUri = process.env.MONGO_URI;
      this.mongoClient = new MongoClient(mongoUri, {
        maxPoolSize: 10,
        minPoolSize: 2,
      });

      await this.mongoClient.connect();
      this.db = this.mongoClient.db("contract_ai");

      // Create standard indexes
      await this.db.collection("vector_contracts").createIndex({ contractId: 1 });
      await this.db.collection("vector_laws").createIndex({ lawId: 1 });
      await this.db.collection("vector_laws").createIndex({ updatedAt: -1 });

      console.log("✅ [VECTOR-STORE] MongoDB connected");

      // Detect Atlas Vector Search capability
      await this.detectAtlasVectorSearch();

      // Load existing vectors into memory (always needed as fallback)
      await this.loadFromMongoDB();

      const mode = this.atlasVectorSearchAvailable ? 'Atlas Vector Search' : 'In-Memory';
      console.log(`✅ [VECTOR-STORE] Initialized (${mode}) with ${this.contractVectors.size} contract chunks`);
    } catch (error) {
      console.error("❌ [VECTOR-STORE] Initialization error:", error);
      throw error;
    }
  }

  /**
   * Detect if MongoDB Atlas Vector Search ($vectorSearch) is available
   */
  async detectAtlasVectorSearch() {
    // Can be forced via env var
    if (process.env.ATLAS_VECTOR_SEARCH === 'false') {
      console.log("ℹ️  [VECTOR-STORE] Atlas Vector Search disabled via env");
      this.atlasVectorSearchAvailable = false;
      return;
    }

    try {
      // Try to list search indexes on vector_contracts
      const collection = this.db.collection("vector_contracts");
      const indexes = await collection.listSearchIndexes().toArray();

      const hasVectorIndex = indexes.some(idx =>
        idx.type === 'vectorSearch' || idx.name === 'contract_embedding_index'
      );

      if (hasVectorIndex) {
        this.atlasVectorSearchAvailable = true;
        console.log("✅ [VECTOR-STORE] Atlas Vector Search detected and available");
      } else {
        console.log("ℹ️  [VECTOR-STORE] No vector search index found, using in-memory fallback");
        console.log("   To enable Atlas Vector Search, create an index named 'contract_embedding_index'");
      }
    } catch (error) {
      // listSearchIndexes() fails on non-Atlas deployments
      console.log("ℹ️  [VECTOR-STORE] Atlas Vector Search not available (local/non-Atlas), using in-memory");
      this.atlasVectorSearchAvailable = false;
    }
  }

  /**
   * Load vectors from MongoDB into memory
   */
  async loadFromMongoDB() {
    try {
      // Load contract vectors
      const contractDocs = await this.db.collection("vector_contracts").find({}).toArray();
      for (const doc of contractDocs) {
        this.contractVectors.set(doc.id, {
          embedding: doc.embedding,
          metadata: doc.metadata,
          text: doc.text
        });
      }

      // Load law vectors
      const lawDocs = await this.db.collection("vector_laws").find({}).toArray();
      for (const doc of lawDocs) {
        this.lawVectors.set(doc.id, {
          embedding: doc.embedding,
          metadata: doc.metadata,
          text: doc.text
        });
      }

      console.log(`✅ [VECTOR-STORE] Loaded ${contractDocs.length} contract chunks, ${lawDocs.length} law sections`);
    } catch (error) {
      console.error("❌ [VECTOR-STORE] Error loading from MongoDB:", error);
    }
  }

  /**
   * Upsert contract chunks
   * @param {Array} contracts - [{id, embedding, metadata, text}]
   */
  async upsertContracts(contracts) {
    const bulkOps = [];

    for (const contract of contracts) {
      // Store in memory (always, for fallback)
      this.contractVectors.set(contract.id, {
        embedding: contract.embedding,
        metadata: contract.metadata,
        text: contract.text
      });

      // Prepare MongoDB bulk operation
      bulkOps.push({
        updateOne: {
          filter: { id: contract.id },
          update: {
            $set: {
              id: contract.id,
              embedding: contract.embedding,
              metadata: contract.metadata,
              text: contract.text,
              contractId: contract.metadata.contractId,
              updatedAt: new Date()
            }
          },
          upsert: true
        }
      });
    }

    // Batch write to MongoDB
    if (bulkOps.length > 0) {
      await this.db.collection("vector_contracts").bulkWrite(bulkOps);
    }

    console.log(`✅ [VECTOR-STORE] Upserted ${contracts.length} contract chunks`);
  }

  /**
   * Upsert law sections
   * @param {Array} laws - [{id, embedding, metadata, text}]
   */
  async upsertLaws(laws) {
    const bulkOps = [];

    for (const law of laws) {
      // Store in memory
      this.lawVectors.set(law.id, {
        embedding: law.embedding,
        metadata: law.metadata,
        text: law.text
      });

      // Prepare MongoDB bulk operation
      bulkOps.push({
        updateOne: {
          filter: { id: law.id },
          update: {
            $set: {
              id: law.id,
              embedding: law.embedding,
              metadata: law.metadata,
              text: law.text,
              lawId: law.metadata.lawId,
              updatedAt: new Date()
            }
          },
          upsert: true
        }
      });
    }

    // Batch write to MongoDB
    if (bulkOps.length > 0) {
      await this.db.collection("vector_laws").bulkWrite(bulkOps);
    }

    console.log(`✅ [VECTOR-STORE] Upserted ${laws.length} law sections`);
  }

  /**
   * Query contracts by similarity
   * Uses Atlas Vector Search if available, falls back to in-memory
   */
  async queryContracts(queryEmbedding, topK = 30, filters = {}) {
    // Try Atlas Vector Search first
    if (this.atlasVectorSearchAvailable) {
      try {
        return await this.queryContractsAtlas(queryEmbedding, topK, filters);
      } catch (error) {
        console.warn(`⚠️ [VECTOR-STORE] Atlas Vector Search failed, falling back to in-memory:`, error.message);
      }
    }

    // In-memory fallback
    return this.queryContractsInMemory(queryEmbedding, topK, filters);
  }

  /**
   * Atlas Vector Search query for contracts
   */
  async queryContractsAtlas(queryEmbedding, topK, filters) {
    const pipeline = [
      {
        $vectorSearch: {
          index: "contract_embedding_index",
          path: "embedding",
          queryVector: queryEmbedding,
          numCandidates: topK * 5, // Over-fetch for better results
          limit: topK
        }
      },
      {
        $addFields: {
          searchScore: { $meta: "vectorSearchScore" }
        }
      }
    ];

    // Apply userId filter if provided
    if (filters.userId) {
      pipeline.push({
        $match: { "metadata.userId": filters.userId }
      });
    }

    pipeline.push({
      $project: {
        id: 1,
        metadata: 1,
        text: 1,
        searchScore: 1
      }
    });

    const results = await this.db.collection("vector_contracts")
      .aggregate(pipeline)
      .toArray();

    // Format to match existing API structure
    return {
      ids: [results.map(r => r.id)],
      distances: [results.map(r => 1 - (r.searchScore || 0))], // Convert score to distance
      metadatas: [results.map(r => r.metadata)],
      documents: [results.map(r => r.text)]
    };
  }

  /**
   * In-memory fallback query for contracts
   */
  queryContractsInMemory(queryEmbedding, topK, filters) {
    const results = [];

    for (const [id, data] of this.contractVectors.entries()) {
      // Apply filters
      if (filters.userId && data.metadata.userId !== filters.userId) {
        continue;
      }

      const similarity = this.cosineSimilarity(queryEmbedding, data.embedding);
      const distance = 1 - similarity;

      results.push({
        id,
        distance,
        metadata: data.metadata,
        document: data.text
      });
    }

    results.sort((a, b) => a.distance - b.distance);
    const topResults = results.slice(0, topK);

    return {
      ids: [topResults.map(r => r.id)],
      distances: [topResults.map(r => r.distance)],
      metadatas: [topResults.map(r => r.metadata)],
      documents: [topResults.map(r => r.document)]
    };
  }

  /**
   * Query laws by similarity
   */
  async queryLaws(queryEmbedding, topK = 10) {
    // Try Atlas Vector Search first
    if (this.atlasVectorSearchAvailable) {
      try {
        return await this.queryLawsAtlas(queryEmbedding, topK);
      } catch (error) {
        console.warn(`⚠️ [VECTOR-STORE] Atlas law search failed, falling back to in-memory:`, error.message);
      }
    }

    return this.queryLawsInMemory(queryEmbedding, topK);
  }

  /**
   * Atlas Vector Search query for laws
   */
  async queryLawsAtlas(queryEmbedding, topK) {
    const pipeline = [
      {
        $vectorSearch: {
          index: "law_embedding_index",
          path: "embedding",
          queryVector: queryEmbedding,
          numCandidates: topK * 5,
          limit: topK
        }
      },
      {
        $addFields: {
          searchScore: { $meta: "vectorSearchScore" }
        }
      },
      {
        $project: {
          id: 1,
          metadata: 1,
          text: 1,
          searchScore: 1
        }
      }
    ];

    const results = await this.db.collection("vector_laws")
      .aggregate(pipeline)
      .toArray();

    return {
      ids: [results.map(r => r.id)],
      distances: [results.map(r => 1 - (r.searchScore || 0))],
      metadatas: [results.map(r => r.metadata)],
      documents: [results.map(r => r.text)]
    };
  }

  /**
   * In-memory fallback query for laws
   */
  queryLawsInMemory(queryEmbedding, topK) {
    const results = [];

    for (const [id, data] of this.lawVectors.entries()) {
      const similarity = this.cosineSimilarity(queryEmbedding, data.embedding);
      const distance = 1 - similarity;

      results.push({
        id,
        distance,
        metadata: data.metadata,
        document: data.text
      });
    }

    results.sort((a, b) => a.distance - b.distance);
    const topResults = results.slice(0, topK);

    return {
      ids: [topResults.map(r => r.id)],
      distances: [topResults.map(r => r.distance)],
      metadatas: [topResults.map(r => r.metadata)],
      documents: [topResults.map(r => r.document)]
    };
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  cosineSimilarity(vecA, vecB) {
    if (vecA.length !== vecB.length) {
      throw new Error("Vectors must have the same length");
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (normA * normB);
  }

  /**
   * Delete contract vectors
   */
  async deleteContractVectors(contractId) {
    // Delete from memory
    for (const [id, data] of this.contractVectors.entries()) {
      if (data.metadata.contractId === contractId) {
        this.contractVectors.delete(id);
      }
    }

    // Delete from MongoDB
    await this.db.collection("vector_contracts").deleteMany({ contractId });

    console.log(`✅ [VECTOR-STORE] Deleted vectors for contract ${contractId}`);
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      totalContractChunks: this.contractVectors.size,
      totalLawSections: this.lawVectors.size,
      atlasVectorSearch: this.atlasVectorSearchAvailable
    };
  }

  /**
   * Close MongoDB connection
   */
  async close() {
    if (this.mongoClient) {
      await this.mongoClient.close();
      console.log("✅ [VECTOR-STORE] MongoDB connection closed");
    }
  }
}

module.exports = VectorStore;
