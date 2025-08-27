// backend/routes/chat.js
const express = require('express');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const fs = require('fs');
const path = require('path');
const { MongoClient, ObjectId } = require('mongodb');

const verifyToken = require('../middleware/verifyToken');
const DocumentChunker = require('../services/rag/chunker');
const VectorStore = require('../services/rag/vectorStore');
const AnswerGenerator = require('../services/chat/generateAnswer');
const { sseManager } = require('../utils/sse');

const router = express.Router();

// Initialize services
const chunker = new DocumentChunker();
const vectorStore = new VectorStore();
const answerGenerator = new AnswerGenerator();

// MongoDB connection
const mongoUri = process.env.MONGO_URI;
const client = new MongoClient(mongoUri);
let usersCollection, contractsCollection;

(async () => {
  try {
    await client.connect();
    const db = client.db('contract_ai');
    usersCollection = db.collection('users');
    contractsCollection = db.collection('contracts');
    console.log('✅ Connected to MongoDB (chat routes)');
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err);
  }
})();

// Multer configuration for file uploads
const upload = multer({
  dest: './uploads',
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Nur PDF-Dateien sind erlaubt'), false);
    }
  }
});

/**
 * POST /api/chat/index - Index a contract for RAG search
 */
router.post('/index', verifyToken, upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ 
      success: false, 
      message: 'Keine Datei hochgeladen' 
    });
  }

  const startTime = Date.now();
  
  try {
    // Check feature flag
    if (process.env.CHAT_FEATURE_FLAG !== 'chat_v2') {
      return res.status(403).json({
        success: false,
        message: 'Chat v2 ist noch nicht aktiviert'
      });
    }

    // Check user subscription
    const user = await usersCollection.findOne({ _id: new ObjectId(req.user.userId) });
    if (!user || !user.subscriptionActive) {
      return res.status(403).json({
        success: false,
        message: 'Premium-Abonnement erforderlich'
      });
    }

    // Read and parse PDF
    const buffer = fs.readFileSync(req.file.path);
    const pdfData = await pdfParse(buffer);
    
    // Clean up uploaded file
    fs.unlinkSync(req.file.path);
    
    // Extract text by pages (simplified - in production you'd use a proper PDF parser)
    const pages = [{ 
      pageNum: 1, 
      text: pdfData.text 
    }];
    
    // Chunk the document
    const chunks = chunker.chunkByPages(pages, {
      fileName: req.file.originalname,
      uploadedBy: req.user.userId,
      uploadedAt: new Date()
    });
    
    // Generate contract ID
    const contractId = new ObjectId().toString();
    
    // Index in vector store
    const indexResult = await vectorStore.indexDocument(contractId, chunks);
    
    // Store contract metadata
    const contractDoc = {
      _id: new ObjectId(contractId),
      userId: new ObjectId(req.user.userId),
      fileName: req.file.originalname,
      originalSize: buffer.length,
      pageCount: pages.length,
      chunkCount: chunks.length,
      indexedChunks: indexResult.chunksIndexed,
      toolUsed: 'chat_v2',
      status: 'indexed',
      createdAt: new Date(),
      lastAccessedAt: new Date()
    };
    
    await contractsCollection.insertOne(contractDoc);
    
    const duration = Date.now() - startTime;
    
    res.json({
      success: true,
      data: {
        contractId,
        fileName: req.file.originalname,
        chunksProcessed: chunks.length,
        chunksIndexed: indexResult.chunksIndexed,
        processingTime: duration
      },
      message: `Vertrag "${req.file.originalname}" erfolgreich indexiert. Sie können nun Fragen stellen.`
    });
    
    console.log(`✅ Contract indexed: ${contractId} (${duration}ms)`);
    
  } catch (error) {
    console.error('❌ Contract indexing failed:', error);
    
    // Clean up file if it still exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({
      success: false,
      message: 'Fehler beim Indexieren des Vertrags',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * POST /api/chat/ask - Ask a question with streaming response
 */
router.post('/ask', verifyToken, async (req, res) => {
  const { question, contractId, userMode = 'business' } = req.body;
  
  if (!question?.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Frage ist erforderlich'
    });
  }
  
  try {
    // Check feature flag
    if (process.env.CHAT_FEATURE_FLAG !== 'chat_v2') {
      return res.status(403).json({
        success: false,
        message: 'Chat v2 ist noch nicht aktiviert'
      });
    }

    // Check user subscription and limits
    const user = await usersCollection.findOne({ _id: new ObjectId(req.user.userId) });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Benutzer nicht gefunden'
      });
    }

    if (!user.subscriptionActive) {
      return res.status(403).json({
        success: false,
        message: 'Premium-Abonnement erforderlich für Chat v2'
      });
    }

    // Check usage limits
    const plan = user.subscriptionPlan || 'free';
    const count = user.analysisCount || 0;
    
    let limit = 3;
    if (plan === 'premium') limit = 15;
    if (plan === 'business') limit = 50;
    if (plan === 'legendary') limit = Infinity;
    
    if (count >= limit) {
      return res.status(403).json({
        success: false,
        message: 'Analyse-Limit erreicht. Bitte upgraden Sie Ihr Abonnement.'
      });
    }

    // Validate contract if provided
    if (contractId) {
      const contract = await contractsCollection.findOne({
        _id: new ObjectId(contractId),
        userId: new ObjectId(req.user.userId)
      });
      
      if (!contract) {
        return res.status(404).json({
          success: false,
          message: 'Vertrag nicht gefunden oder nicht zugreifbar'
        });
      }
      
      // Update last accessed
      await contractsCollection.updateOne(
        { _id: new ObjectId(contractId) },
        { $set: { lastAccessedAt: new Date() } }
      );
    }

    // Create SSE connection
    const { connectionId, connection } = sseManager.createConnection(res, req.user.userId, {
      heartbeatInterval: 30000,
      retryTime: 3000
    });
    
    console.log(`🚀 Starting chat session: ${connectionId}`);
    
    // Process the question asynchronously
    (async () => {
      try {
        const context = {
          userId: req.user.userId,
          userMode,
          maxResults: 10,
          piiRedactionEnabled: user.piiRedactionEnabled || false
        };
        
        const result = await answerGenerator.generateStreamingAnswer(
          question,
          contractId,
          context,
          connection
        );
        
        // Update usage count
        await usersCollection.updateOne(
          { _id: new ObjectId(req.user.userId) },
          { $inc: { analysisCount: 1 } }
        );
        
        console.log(`✅ Chat session completed: ${connectionId} (${result.telemetry.totalLatency}ms)`);
        
      } catch (error) {
        console.error(`❌ Chat session failed: ${connectionId}`, error);
        
        if (connection.isActive()) {
          connection.sendError(error, false);
        }
      }
    })();
    
  } catch (error) {
    console.error('❌ Chat ask setup failed:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Verarbeiten der Anfrage',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/chat/suggest - Get suggested questions
 */
router.get('/suggest', verifyToken, async (req, res) => {
  const { contractId } = req.query;
  
  try {
    // Basic suggestions
    let suggestions = [
      {
        text: "Was sind die wichtigsten Punkte in diesem Vertrag?",
        category: "general",
        icon: "📋"
      },
      {
        text: "Welche Fristen und Deadlines gibt es?",
        category: "deadlines", 
        icon: "⏰"
      },
      {
        text: "Wie kann ich diesen Vertrag kündigen?",
        category: "termination",
        icon: "📋"
      },
      {
        text: "Welche Risiken bestehen für mich?",
        category: "risk",
        icon: "⚠️"
      },
      {
        text: "Welche Zahlungen und Kosten fallen an?",
        category: "financial",
        icon: "💰"
      }
    ];
    
    // If specific contract, get contract-specific suggestions
    if (contractId) {
      try {
        const contract = await contractsCollection.findOne({
          _id: new ObjectId(contractId),
          userId: new ObjectId(req.user.userId)
        });
        
        if (contract) {
          // Add contract-specific suggestions based on filename or content
          const fileName = contract.fileName.toLowerCase();
          
          if (fileName.includes('miet')) {
            suggestions.unshift({
              text: `Was sind meine Rechte und Pflichten als ${fileName.includes('vermieter') ? 'Vermieter' : 'Mieter'}?`,
              category: "rental",
              icon: "🏠"
            });
          } else if (fileName.includes('arbeit') || fileName.includes('job')) {
            suggestions.unshift({
              text: "Welche Arbeitszeiten und Urlaubsregelungen gelten?",
              category: "employment",
              icon: "👔"
            });
          } else if (fileName.includes('kauf') || fileName.includes('purchase')) {
            suggestions.unshift({
              text: "Welche Garantien und Gewährleistungen gibt es?",
              category: "purchase",
              icon: "🛒"
            });
          }
        }
      } catch (error) {
        console.error('Error fetching contract for suggestions:', error);
      }
    }
    
    res.json({
      success: true,
      data: {
        suggestions: suggestions.slice(0, 8),
        contractSpecific: !!contractId
      }
    });
    
  } catch (error) {
    console.error('❌ Suggestions request failed:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Vorschläge'
    });
  }
});

/**
 * GET /api/chat/contracts - List user's indexed contracts
 */
router.get('/contracts', verifyToken, async (req, res) => {
  try {
    const contracts = await contractsCollection
      .find(
        { userId: new ObjectId(req.user.userId) },
        { 
          projection: {
            fileName: 1,
            pageCount: 1,
            chunkCount: 1,
            status: 1,
            createdAt: 1,
            lastAccessedAt: 1
          }
        }
      )
      .sort({ lastAccessedAt: -1 })
      .limit(20)
      .toArray();
    
    res.json({
      success: true,
      data: {
        contracts: contracts.map(contract => ({
          id: contract._id.toString(),
          fileName: contract.fileName,
          pageCount: contract.pageCount,
          chunkCount: contract.chunkCount,
          status: contract.status,
          createdAt: contract.createdAt,
          lastAccessedAt: contract.lastAccessedAt
        })),
        total: contracts.length
      }
    });
    
  } catch (error) {
    console.error('❌ Contracts list failed:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Verträge'
    });
  }
});

/**
 * DELETE /api/chat/contracts/:id - Delete a contract and its embeddings
 */
router.delete('/contracts/:id', verifyToken, async (req, res) => {
  const { id } = req.params;
  
  try {
    // Verify ownership
    const contract = await contractsCollection.findOne({
      _id: new ObjectId(id),
      userId: new ObjectId(req.user.userId)
    });
    
    if (!contract) {
      return res.status(404).json({
        success: false,
        message: 'Vertrag nicht gefunden'
      });
    }
    
    // Delete from vector store
    const deletedEmbeddings = await vectorStore.deleteDocument(id);
    
    // Delete contract document
    await contractsCollection.deleteOne({ _id: new ObjectId(id) });
    
    res.json({
      success: true,
      data: {
        contractId: id,
        deletedEmbeddings
      },
      message: `Vertrag "${contract.fileName}" wurde gelöscht`
    });
    
    console.log(`🗑️ Contract deleted: ${id} (${deletedEmbeddings} embeddings)`);
    
  } catch (error) {
    console.error('❌ Contract deletion failed:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Löschen des Vertrags'
    });
  }
});

/**
 * GET /api/chat/health - Health check for chat services
 */
router.get('/health', async (req, res) => {
  try {
    const health = {
      timestamp: new Date().toISOString(),
      status: 'healthy',
      services: {}
    };
    
    // Check vector store
    health.services.vectorStore = await vectorStore.healthCheck();
    
    // Check answer generator
    health.services.answerGenerator = await answerGenerator.healthCheck();
    
    // Check database
    try {
      await client.db('contract_ai').admin().ping();
      health.services.database = { status: 'healthy' };
    } catch (error) {
      health.services.database = { status: 'unhealthy', error: error.message };
    }
    
    // Check SSE manager
    const sseStats = sseManager.getStats();
    health.services.sse = {
      status: 'healthy',
      activeConnections: sseStats.active,
      totalConnections: sseStats.total
    };
    
    // Overall status
    const allHealthy = Object.values(health.services).every(service => 
      service.status === 'healthy'
    );
    
    if (!allHealthy) {
      health.status = 'degraded';
    }
    
    res.status(health.status === 'healthy' ? 200 : 503).json(health);
    
  } catch (error) {
    console.error('❌ Health check failed:', error);
    res.status(500).json({
      timestamp: new Date().toISOString(),
      status: 'unhealthy',
      error: error.message
    });
  }
});

/**
 * GET /api/chat/stats - Get usage statistics
 */
router.get('/stats', verifyToken, async (req, res) => {
  try {
    const userId = new ObjectId(req.user.userId);
    
    // Get user's contract count
    const contractCount = await contractsCollection.countDocuments({ userId });
    
    // Get vector store stats for user's contracts
    const userContracts = await contractsCollection
      .find({ userId }, { projection: { _id: 1 } })
      .toArray();
    
    let totalChunks = 0;
    for (const contract of userContracts) {
      const stats = await vectorStore.getStats(contract._id.toString());
      totalChunks += stats[0]?.totalChunks || 0;
    }
    
    // Get SSE connections for this user
    const userConnections = sseManager.getUserConnections(req.user.userId);
    
    res.json({
      success: true,
      data: {
        contractsIndexed: contractCount,
        totalChunks,
        activeConnections: userConnections.length,
        lastActivity: userConnections.length > 0 ? 
          Math.max(...userConnections.map(c => c.createdAt.getTime())) : null
      }
    });
    
  } catch (error) {
    console.error('❌ Stats request failed:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Statistiken'
    });
  }
});

module.exports = router;