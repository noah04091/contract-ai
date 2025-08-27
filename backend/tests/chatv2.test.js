// backend/tests/chatv2.test.js
const request = require('supertest');
const express = require('express');
const { MongoClient } = require('mongodb');
const jwt = require('jsonwebtoken');

// Mock dependencies
jest.mock('../services/telemetry');
jest.mock('../utils/sse');
jest.mock('../services/rag/vectorStore');
jest.mock('../services/chat/intentRouter');

const app = express();
app.use(express.json());

// Import routes and middleware after mocking
const chatRoutes = require('../routes/chat');
const verifyToken = require('../middleware/verifyToken');

// Mock middleware
app.use('/api/chat', (req, res, next) => {
  req.user = { userId: 'test-user-123' };
  next();
});

app.use('/api/chat', chatRoutes);

describe('Chat v2 API Tests', () => {
  let mockDb;
  let mockCollection;

  beforeAll(async () => {
    // Setup mock database
    mockCollection = {
      findOne: jest.fn(),
      find: jest.fn().mockReturnValue({ toArray: jest.fn() }),
      insertOne: jest.fn(),
      updateOne: jest.fn(),
      deleteMany: jest.fn()
    };

    mockDb = {
      collection: jest.fn(() => mockCollection)
    };

    // Mock database connection
    require('../config/database').getDb = jest.fn(() => mockDb);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/chat/index', () => {
    test('should return chat index for existing contract', async () => {
      mockCollection.findOne.mockResolvedValueOnce({
        _id: 'test-contract-123',
        userId: 'test-user-123',
        filename: 'test-contract.pdf',
        analyzedAt: new Date()
      });

      const response = await request(app)
        .get('/api/chat/index')
        .query({ contractId: 'test-contract-123' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.contractId).toBe('test-contract-123');
    });

    test('should return 404 for non-existent contract', async () => {
      mockCollection.findOne.mockResolvedValueOnce(null);

      const response = await request(app)
        .get('/api/chat/index')
        .query({ contractId: 'non-existent' });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/chat/ask', () => {
    test('should process chat question with streaming response', async () => {
      mockCollection.findOne.mockResolvedValueOnce({
        _id: 'test-contract-123',
        userId: 'test-user-123',
        filename: 'test-contract.pdf'
      });

      const response = await request(app)
        .post('/api/chat/ask')
        .send({
          question: 'Welche Risiken bestehen in diesem Vertrag?',
          contractId: 'test-contract-123',
          userMode: 'business'
        });

      // For streaming responses, we expect the response to start immediately
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/event-stream');
    });

    test('should return 400 for missing question', async () => {
      const response = await request(app)
        .post('/api/chat/ask')
        .send({
          contractId: 'test-contract-123'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Question is required');
    });

    test('should return 404 for non-existent contract', async () => {
      mockCollection.findOne.mockResolvedValueOnce(null);

      const response = await request(app)
        .post('/api/chat/ask')
        .send({
          question: 'Test question',
          contractId: 'non-existent'
        });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/chat/suggest', () => {
    test('should return suggestions for contract', async () => {
      mockCollection.findOne.mockResolvedValueOnce({
        _id: 'test-contract-123',
        userId: 'test-user-123',
        filename: 'test-contract.pdf',
        analysis: {
          contractType: 'Arbeitsvertrag'
        }
      });

      const response = await request(app)
        .get('/api/chat/suggest')
        .query({ contractId: 'test-contract-123' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.suggestions).toBeInstanceOf(Array);
      expect(response.body.data.suggestions.length).toBeGreaterThan(0);
    });
  });
});

describe('RAG System Tests', () => {
  const VectorStore = require('../services/rag/vectorStore');
  const Chunker = require('../services/rag/chunker');
  const Embeddings = require('../services/rag/embeddings');

  let vectorStore;
  let chunker;
  let embeddings;

  beforeEach(() => {
    vectorStore = new VectorStore();
    chunker = new Chunker();
    embeddings = new Embeddings();
  });

  describe('Chunker', () => {
    test('should chunk text into appropriate segments', () => {
      const testText = `
        Dies ist ein Testvertrag. Er enthält mehrere Paragraphen.
        
        Paragraph 1: Der Arbeitnehmer verpflichtet sich zur gewissenhaften Erfüllung seiner Aufgaben.
        
        Paragraph 2: Die Arbeitszeit beträgt 40 Stunden pro Woche. Überstunden sind möglich.
        
        Paragraph 3: Das Gehalt beträgt 5000 Euro brutto monatlich.
      `;

      const chunks = chunker.chunkText(testText, { page: 1, contractId: 'test' });

      expect(chunks).toBeInstanceOf(Array);
      expect(chunks.length).toBeGreaterThan(0);
      
      chunks.forEach(chunk => {
        expect(chunk).toHaveProperty('text');
        expect(chunk).toHaveProperty('metadata');
        expect(chunk.metadata).toHaveProperty('page', 1);
        expect(chunk.metadata).toHaveProperty('contractId', 'test');
      });
    });

    test('should respect token limits', () => {
      const longText = 'Wort '.repeat(2000); // Very long text
      const chunks = chunker.chunkText(longText);

      chunks.forEach(chunk => {
        const estimatedTokens = chunker.estimateTokens(chunk.text);
        expect(estimatedTokens).toBeLessThanOrEqual(chunker.chunkSize);
      });
    });
  });

  describe('Embeddings Service', () => {
    test('should generate embeddings for text', async () => {
      // Mock OpenAI response
      const mockEmbeddings = [[0.1, 0.2, 0.3, 0.4]];
      embeddings.openai = {
        embeddings: {
          create: jest.fn().mockResolvedValue({
            data: [{ embedding: mockEmbeddings[0] }]
          })
        }
      };

      const result = await embeddings.generateEmbeddings(['test text']);

      expect(result).toEqual(mockEmbeddings);
      expect(embeddings.openai.embeddings.create).toHaveBeenCalledWith({
        model: 'text-embedding-3-small',
        input: ['test text'],
        encoding_format: 'float'
      });
    });

    test('should handle batch processing', async () => {
      const texts = Array(10).fill('test text');
      
      embeddings.openai = {
        embeddings: {
          create: jest.fn().mockResolvedValue({
            data: texts.map(() => ({ embedding: [0.1, 0.2, 0.3] }))
          })
        }
      };

      const result = await embeddings.generateEmbeddings(texts);

      expect(result.length).toBe(texts.length);
      expect(embeddings.openai.embeddings.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('Vector Store', () => {
    test('should search in lite mode', async () => {
      vectorStore.searchMode = 'lite';
      vectorStore.chunks = [
        {
          text: 'Der Arbeitnehmer erhält ein Gehalt von 5000 Euro.',
          metadata: { contractId: 'test', page: 1 }
        },
        {
          text: 'Die Kündigungsfrist beträgt 3 Monate.',
          metadata: { contractId: 'test', page: 2 }
        }
      ];

      const results = await vectorStore.search('Gehalt', 'test');

      expect(results).toBeInstanceOf(Array);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]).toHaveProperty('text');
      expect(results[0]).toHaveProperty('score');
      expect(results[0]).toHaveProperty('metadata');
    });

    test('should filter by contract ID', async () => {
      vectorStore.searchMode = 'lite';
      vectorStore.chunks = [
        {
          text: 'Contract 1 content',
          metadata: { contractId: 'contract-1', page: 1 }
        },
        {
          text: 'Contract 2 content',
          metadata: { contractId: 'contract-2', page: 1 }
        }
      ];

      const results = await vectorStore.search('content', 'contract-1');

      expect(results.length).toBe(1);
      expect(results[0].metadata.contractId).toBe('contract-1');
    });
  });
});

describe('Intent Router Tests', () => {
  const IntentRouter = require('../services/chat/intentRouter');

  let intentRouter;

  beforeEach(() => {
    intentRouter = new IntentRouter();
  });

  test('should identify risk intent', async () => {
    const questions = [
      'Welche Risiken bestehen in diesem Vertrag?',
      'Was sind die Nachteile für mich?',
      'Gibt es gefährliche Klauseln?'
    ];

    for (const question of questions) {
      const result = await intentRouter.analyzeIntent(question);
      expect(result.primaryIntent).toBe('risk');
      expect(result.confidence).toBeGreaterThan(0.5);
    }
  });

  test('should identify extract intent', async () => {
    const questions = [
      'Alle Fristen und Termine auflisten',
      'Welche Zahlungsverpflichtungen gibt es?',
      'Liste alle wichtigen Daten auf'
    ];

    for (const question of questions) {
      const result = await intentRouter.analyzeIntent(question);
      expect(result.primaryIntent).toBe('extract');
    }
  });

  test('should identify explain intent', async () => {
    const questions = [
      'Erkläre mir die Haftungsklauseln',
      'Was bedeutet diese Regelung?',
      'Können Sie das vereinfachen?'
    ];

    for (const question of questions) {
      const result = await intentRouter.analyzeIntent(question);
      expect(result.primaryIntent).toBe('explain');
    }
  });

  test('should select appropriate tools', async () => {
    const riskAnalysis = await intentRouter.analyzeIntent('Welche Risiken gibt es?');
    expect(riskAnalysis.selectedTools).toContain('clauseFinder');

    const extractAnalysis = await intentRouter.analyzeIntent('Liste alle Fristen auf');
    expect(extractAnalysis.selectedTools).toContain('deadlineScanner');
  });
});

describe('Tool Tests', () => {
  describe('ClauseFinder Tool', () => {
    const ClauseFinder = require('../services/tools/clauseFinder');
    let clauseFinder;

    beforeEach(() => {
      clauseFinder = new ClauseFinder();
    });

    test('should identify liability clauses', async () => {
      const context = {
        question: 'Welche Haftungsklauseln gibt es?',
        retrievalResults: [
          {
            text: 'Der Arbeitnehmer haftet für Schäden nur bei grober Fahrlässigkeit.',
            metadata: { page: 2 }
          }
        ]
      };

      const result = await clauseFinder.execute(context);

      expect(result.identifiedClauses).toBeInstanceOf(Array);
      expect(result.identifiedClauses.length).toBeGreaterThan(0);
      expect(result.explanations).toBeInstanceOf(Array);
    });
  });

  describe('DeadlineScanner Tool', () => {
    const DeadlineScanner = require('../services/tools/deadlineScanner');
    let deadlineScanner;

    beforeEach(() => {
      deadlineScanner = new DeadlineScanner();
    });

    test('should extract deadlines from text', async () => {
      const context = {
        retrievalResults: [
          {
            text: 'Die Kündigungsfrist beträgt 3 Monate zum Monatsende.',
            metadata: { page: 1 }
          },
          {
            text: 'Der Vertrag läuft bis zum 31.12.2024.',
            metadata: { page: 1 }
          }
        ]
      };

      const result = await deadlineScanner.execute(context);

      expect(result.deadlines).toBeInstanceOf(Array);
      expect(result.deadlines.length).toBeGreaterThan(0);
      expect(result.insights).toBeInstanceOf(Array);
    });
  });

  describe('PII Redactor Tool', () => {
    const PIIRedactor = require('../services/tools/piiRedactor');
    let piiRedactor;

    beforeEach(() => {
      piiRedactor = new PIIRedactor();
    });

    test('should detect PII in text', () => {
      const text = 'Herr Max Mustermann, geboren am 01.01.1980, wohnhaft in Berlin.';
      const detectedPII = piiRedactor.detectPII(text);

      expect(detectedPII.names).toBeInstanceOf(Array);
      expect(detectedPII.names.length).toBeGreaterThan(0);
      expect(detectedPII.dates).toBeInstanceOf(Array);
      expect(detectedPII.locations).toBeInstanceOf(Array);
    });

    test('should mask PII when requested', () => {
      const text = 'Max Mustermann erhält ein Gehalt von 5000 Euro.';
      const masked = piiRedactor.maskPII(text);

      expect(masked).not.toContain('Max Mustermann');
      expect(masked).toContain('[NAME]');
    });
  });
});

describe('Error Handling Tests', () => {
  const { errorHandler, ChatError, RAGError } = require('../utils/errorHandler');

  test('should handle ChatError correctly', () => {
    const error = new ChatError('Test error', 'TEST_CODE', 400);
    const handled = errorHandler.handleError(error);

    expect(handled).toBeInstanceOf(ChatError);
    expect(handled.code).toBe('TEST_CODE');
    expect(handled.statusCode).toBe(400);
  });

  test('should enhance generic errors', () => {
    const error = new Error('Generic error');
    const handled = errorHandler.handleError(error, { component: 'rag' });

    expect(handled).toBeInstanceOf(RAGError);
    expect(handled.context.originalError).toBe('Error');
  });

  test('should retry with exponential backoff', async () => {
    let attempts = 0;
    const operation = jest.fn().mockImplementation(() => {
      attempts++;
      if (attempts < 3) {
        throw new Error('Temporary failure');
      }
      return 'success';
    });

    const result = await errorHandler.withRetry(operation, {
      maxRetries: 3,
      baseDelay: 100
    });

    expect(result).toBe('success');
    expect(attempts).toBe(3);
  });

  test('should implement circuit breaker', async () => {
    const failingOperation = jest.fn().mockRejectedValue(new Error('Service down'));
    
    // Trigger failures to open circuit
    for (let i = 0; i < 5; i++) {
      try {
        await errorHandler.withCircuitBreaker(failingOperation, 'test-service');
      } catch (error) {
        // Expected failures
      }
    }

    // Circuit should now be open
    await expect(
      errorHandler.withCircuitBreaker(failingOperation, 'test-service')
    ).rejects.toThrow('circuit breaker open');
  });
});

describe('Integration Tests', () => {
  test('should process complete chat flow', async () => {
    // Mock all required services
    const mockContract = {
      _id: 'test-contract',
      userId: 'test-user',
      filename: 'test.pdf'
    };

    mockCollection.findOne.mockResolvedValueOnce(mockContract);

    // This would be a more complex integration test
    // that verifies the entire chat flow works together
    const response = await request(app)
      .get('/api/chat/index')
      .query({ contractId: 'test-contract' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });
});

// Cleanup
afterAll(async () => {
  jest.clearAllMocks();
});