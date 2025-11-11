// 📁 backend/services/vectorStore.js
// In-Memory Vector Store with MongoDB Persistence

const { MongoClient } = require("mongodb");

class VectorStore {
  constructor() {
    this.contractVectors = new Map(); // contractId_chunkIdx -> {embedding, metadata, text}
    this.lawVectors = new Map(); // lawId -> {embedding, metadata, text}
    this.mongoClient = null;
    this.db = null;
  }

  /**
   * Initialize MongoDB connection
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

      // Create collections if they don't exist
      await this.db.collection("vector_contracts").createIndex({ contractId: 1 });
      await this.db.collection("vector_laws").createIndex({ lawId: 1 });
      await this.db.collection("vector_laws").createIndex({ updatedAt: -1 });

      console.log("✅ [VECTOR-STORE] MongoDB connected");

      // Load existing vectors into memory
      await this.loadFromMongoDB();

      console.log("✅ [VECTOR-STORE] Initialized with", this.contractVectors.size, "contract chunks");
    } catch (error) {
      console.error("❌ [VECTOR-STORE] Initialization error:", error);
      throw error;
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
      // Store in memory
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
   * @param {number[]} queryEmbedding - Query vector
   * @param {number} topK - Number of results to return
   * @param {object} filters - Metadata filters (e.g., {userId: '123'})
   * @returns {object} Results with ids, distances, metadatas, documents
   */
  async queryContracts(queryEmbedding, topK = 30, filters = {}) {
    const results = [];

    // Calculate cosine similarity for all contract vectors
    for (const [id, data] of this.contractVectors.entries()) {
      // Apply filters
      if (filters.userId && data.metadata.userId !== filters.userId) {
        continue;
      }

      const similarity = this.cosineSimilarity(queryEmbedding, data.embedding);
      const distance = 1 - similarity; // Convert to distance

      results.push({
        id,
        distance,
        metadata: data.metadata,
        document: data.text
      });
    }

    // Sort by distance (ascending) and take top K
    results.sort((a, b) => a.distance - b.distance);
    const topResults = results.slice(0, topK);

    // Format results to match Chroma API structure
    return {
      ids: [topResults.map(r => r.id)],
      distances: [topResults.map(r => r.distance)],
      metadatas: [topResults.map(r => r.metadata)],
      documents: [topResults.map(r => r.document)]
    };
  }

  /**
   * Query laws by similarity
   * @param {number[]} queryEmbedding - Query vector
   * @param {number} topK - Number of results to return
   * @returns {object} Results with ids, distances, metadatas, documents
   */
  async queryLaws(queryEmbedding, topK = 10) {
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
   * @param {number[]} vecA
   * @param {number[]} vecB
   * @returns {number} similarity score (0-1)
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
   * @param {string} contractId
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
      totalLawSections: this.lawVectors.size
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
