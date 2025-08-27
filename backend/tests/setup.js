// backend/tests/setup.js
const { MongoMemoryServer } = require('mongodb-memory-server');
const { MongoClient } = require('mongodb');

let mongoServer;
let mongoClient;
let db;

// Global test setup
beforeAll(async () => {
  // Start in-memory MongoDB instance
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  
  // Connect to the in-memory database
  mongoClient = new MongoClient(uri);
  await mongoClient.connect();
  db = mongoClient.db('contractai_test');
  
  // Mock the database connection
  jest.doMock('../config/database', () => ({
    getDb: () => db,
    connectToDatabase: jest.fn().mockResolvedValue(db)
  }));

  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-secret';
  process.env.CHAT_V2_ENABLED = 'true';
  process.env.RAG_SEARCH_MODE = 'lite';
  process.env.DEBUG_TELEMETRY = 'false';
});

// Global test teardown
afterAll(async () => {
  if (mongoClient) {
    await mongoClient.close();
  }
  if (mongoServer) {
    await mongoServer.stop();
  }
});

// Test database helpers
global.testDb = {
  getDb: () => db,
  
  async insertTestContract(contractData = {}) {
    const defaultContract = {
      _id: 'test-contract-123',
      userId: 'test-user-123',
      filename: 'test-contract.pdf',
      uploadedAt: new Date(),
      analyzedAt: new Date(),
      analysis: {
        contractType: 'Arbeitsvertrag',
        parties: ['ABC GmbH', 'Max Mustermann'],
        keyDates: [
          { label: 'Vertragsbeginn', date: '2024-01-01', type: 'start' },
          { label: 'Kündigungsfrist', value: '3 Monate', type: 'termination' }
        ],
        risks: [
          { 
            level: 'medium', 
            description: 'Lange Kündigungsfrist von 3 Monaten',
            category: 'termination'
          }
        ]
      },
      s3Key: 'contracts/test-user-123/test-contract.pdf',
      fileSize: 1024000,
      status: 'analyzed'
    };

    const contract = { ...defaultContract, ...contractData };
    await db.collection('contracts').insertOne(contract);
    return contract;
  },

  async insertTestUser(userData = {}) {
    const defaultUser = {
      _id: 'test-user-123',
      email: 'test@example.com',
      password: '$2a$10$hashedpassword',
      firstName: 'Test',
      lastName: 'User',
      subscription: {
        plan: 'premium',
        status: 'active',
        analysesUsed: 0,
        analysesLimit: 15
      },
      createdAt: new Date(),
      isVerified: true
    };

    const user = { ...defaultUser, ...userData };
    await db.collection('users').insertOne(user);
    return user;
  },

  async insertTestChunks(chunks = []) {
    const defaultChunks = [
      {
        contractId: 'test-contract-123',
        text: 'Der Arbeitnehmer wird als Software-Entwickler eingestellt.',
        metadata: {
          page: 1,
          contractId: 'test-contract-123',
          chunkIndex: 0,
          tokens: 15
        },
        embedding: new Array(1536).fill(0).map(() => Math.random() - 0.5),
        createdAt: new Date()
      },
      {
        contractId: 'test-contract-123',
        text: 'Das Bruttomonatsgehalt beträgt € 5.500,00.',
        metadata: {
          page: 1,
          contractId: 'test-contract-123',
          chunkIndex: 1,
          tokens: 12
        },
        embedding: new Array(1536).fill(0).map(() => Math.random() - 0.5),
        createdAt: new Date()
      },
      {
        contractId: 'test-contract-123',
        text: 'Die Kündigungsfrist beträgt 3 Monate zum Monatsende.',
        metadata: {
          page: 2,
          contractId: 'test-contract-123',
          chunkIndex: 2,
          tokens: 14
        },
        embedding: new Array(1536).fill(0).map(() => Math.random() - 0.5),
        createdAt: new Date()
      }
    ];

    const chunksToInsert = chunks.length > 0 ? chunks : defaultChunks;
    await db.collection('contract_chunks').insertMany(chunksToInsert);
    return chunksToInsert;
  },

  async clearTestData() {
    await db.collection('contracts').deleteMany({});
    await db.collection('users').deleteMany({});
    await db.collection('contract_chunks').deleteMany({});
    await db.collection('chat_sessions').deleteMany({});
  }
};

// Mock JWT token creation for tests
global.createTestToken = (userId = 'test-user-123') => {
  const jwt = require('jsonwebtoken');
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
};

// Mock SSE connection for streaming tests
global.createMockSSEConnection = () => {
  const events = [];
  
  return {
    events,
    sendEvent: jest.fn((type, data, options) => {
      events.push({ type, data, options });
    }),
    sendChunk: jest.fn((text) => {
      events.push({ type: 'chunk', data: { text } });
    }),
    sendInsight: jest.fn((insight) => {
      events.push({ type: 'insight', data: insight });
    }),
    sendProgress: jest.fn((progress) => {
      events.push({ type: 'progress', data: progress });
    }),
    sendError: jest.fn((error) => {
      events.push({ type: 'error', data: { error } });
    }),
    end: jest.fn(() => {
      events.push({ type: 'end' });
    }),
    res: {
      writeHead: jest.fn(),
      write: jest.fn(),
      end: jest.fn()
    }
  };
};

// Suppress console output during tests unless DEBUG is set
if (!process.env.DEBUG_TESTS) {
  global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  };
}

// Clean up between tests
beforeEach(async () => {
  if (db) {
    await global.testDb.clearTestData();
  }
  jest.clearAllMocks();
});

module.exports = {
  mongoServer,
  mongoClient,
  db
};