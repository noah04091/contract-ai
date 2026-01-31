// backend/services/contractEmbedder.js
// Automatic Contract Embedding Service
// Embeds contracts into the vector store for Legal Pulse monitoring

const { MongoClient, ObjectId } = require("mongodb");
const EmbeddingService = require("./embeddingService");
const VectorStore = require("./vectorStore");

// Singleton instances (reused across calls)
let vectorStoreInstance = null;
let embeddingServiceInstance = null;
let initPromise = null;

/**
 * Initialize shared instances (lazy singleton)
 */
async function getInstances() {
  if (vectorStoreInstance && embeddingServiceInstance) {
    return { vectorStore: vectorStoreInstance, embeddingService: embeddingServiceInstance };
  }

  // Prevent parallel initialization
  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    try {
      embeddingServiceInstance = new EmbeddingService();
      vectorStoreInstance = new VectorStore();
      await vectorStoreInstance.init();
      console.log("✅ [CONTRACT-EMBEDDER] Services initialized");
      return { vectorStore: vectorStoreInstance, embeddingService: embeddingServiceInstance };
    } catch (error) {
      // Reset on failure so next call retries
      initPromise = null;
      vectorStoreInstance = null;
      embeddingServiceInstance = null;
      throw error;
    }
  })();

  return initPromise;
}

/**
 * Embed a single contract into the vector store.
 * Fire-and-forget safe - logs errors but doesn't throw.
 *
 * @param {string} contractId - MongoDB ObjectId as string
 * @param {string} [textContent] - Optional pre-extracted text (skips DB text lookup)
 * @param {object} [metadata] - Optional metadata overrides {userId, contractName, contractType}
 */
async function embedContract(contractId, textContent, metadata) {
  const startTime = Date.now();

  try {
    const { vectorStore, embeddingService } = await getInstances();

    let text = textContent;
    let contractMeta = metadata || {};

    // If no text provided, load from MongoDB
    if (!text) {
      const mongoClient = new MongoClient(process.env.MONGO_URI);
      try {
        await mongoClient.connect();
        const db = mongoClient.db("contract_ai");
        const contract = await db.collection("contracts").findOne(
          { _id: new ObjectId(contractId) }
        );

        if (!contract) {
          console.warn(`[CONTRACT-EMBEDDER] Contract ${contractId} not found`);
          return { success: false, reason: "not_found" };
        }

        // Extract text from available fields (same priority as backfill script)
        text = contract.fullText
          || contract.content
          || contract.analysis?.fullText
          || contract.parsedText
          || contract.extractedText
          || "";

        // Fill metadata from contract
        contractMeta = {
          userId: contract.userId?.toString(),
          contractName: contract.name || "Unbekannt",
          contractType: contract.type || contract.contractType || "unknown",
          ...contractMeta
        };
      } finally {
        await mongoClient.close();
      }
    }

    if (!text || text.trim().length < 50) {
      console.log(`[CONTRACT-EMBEDDER] Contract ${contractId}: Text too short (${text?.length || 0} chars), skipping`);
      return { success: false, reason: "no_text" };
    }

    // Pseudonymize sensitive data
    text = embeddingService.pseudonymize(text);

    // Chunk the text
    const chunks = embeddingService.chunkText(text);

    if (chunks.length === 0) {
      console.log(`[CONTRACT-EMBEDDER] Contract ${contractId}: No chunks generated`);
      return { success: false, reason: "no_chunks" };
    }

    // Generate embeddings
    const embeddings = await embeddingService.embedBatch(chunks);

    // Prepare vector store documents
    const contractDocs = chunks.map((chunk, idx) => ({
      id: `${contractId}_chunk_${idx}`,
      embedding: embeddings[idx],
      text: chunk,
      metadata: {
        contractId: contractId,
        userId: contractMeta.userId,
        contractName: contractMeta.contractName,
        contractType: contractMeta.contractType,
        chunkIndex: idx,
        totalChunks: chunks.length,
        createdAt: new Date()
      }
    }));

    // Upsert to vector store
    await vectorStore.upsertContracts(contractDocs);

    // Mark contract as indexed
    const mongoClient = new MongoClient(process.env.MONGO_URI);
    try {
      await mongoClient.connect();
      const db = mongoClient.db("contract_ai");
      await db.collection("contracts").updateOne(
        { _id: new ObjectId(contractId) },
        { $set: { lastIndexedAt: new Date() } }
      );
    } finally {
      await mongoClient.close();
    }

    const duration = Date.now() - startTime;
    console.log(`✅ [CONTRACT-EMBEDDER] Contract ${contractId} embedded: ${chunks.length} chunks in ${duration}ms`);

    return { success: true, chunks: chunks.length, duration };

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ [CONTRACT-EMBEDDER] Error embedding contract ${contractId} (${duration}ms):`, error.message);
    return { success: false, reason: "error", error: error.message };
  }
}

/**
 * Async wrapper for fire-and-forget embedding.
 * Safe to call without await - logs errors internally.
 *
 * @param {string} contractId
 * @param {string} [textContent]
 * @param {object} [metadata]
 */
function embedContractAsync(contractId, textContent, metadata) {
  embedContract(contractId, textContent, metadata).then(result => {
    if (result.success) {
      console.log(`[CONTRACT-EMBEDDER] Async embedding complete for ${contractId}: ${result.chunks} chunks`);
    } else if (result.reason !== "no_text") {
      console.warn(`[CONTRACT-EMBEDDER] Async embedding skipped for ${contractId}: ${result.reason}`);
    }
  }).catch(err => {
    console.error(`[CONTRACT-EMBEDDER] Async embedding failed for ${contractId}:`, err.message);
  });
}

module.exports = {
  embedContract,
  embedContractAsync
};
