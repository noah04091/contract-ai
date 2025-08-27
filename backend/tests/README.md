# Chat v2 Testing Guide

This directory contains comprehensive tests for the Chat v2 system including unit tests, integration tests, and sample data.

## Test Structure

```
tests/
├── chatv2.test.js          # Main test suite for Chat v2 functionality
├── setup.js                # Test setup and utilities
├── README.md               # This file
└── testData/
    ├── sample-contract-1.pdf  # Employment contract (text format)
    ├── sample-contract-2.pdf  # Rental agreement (text format) 
    └── sample-contract-3.pdf  # Service agreement (text format)
```

## Running Tests

### Prerequisites
```bash
# Install test dependencies
npm install --save-dev jest supertest mongodb-memory-server
```

### Environment Setup
Create a `.env.test` file:
```bash
NODE_ENV=test
JWT_SECRET=test-secret-key
CHAT_V2_ENABLED=true
RAG_SEARCH_MODE=lite
DEBUG_TESTS=false  # Set to true for verbose output
```

### Run Tests
```bash
# Run all tests
npm test

# Run specific test suite
npx jest chatv2.test.js

# Run with coverage
npx jest --coverage

# Run in watch mode
npx jest --watch
```

## Test Categories

### 1. API Endpoint Tests
- **GET /api/chat/index** - Chat initialization
- **POST /api/chat/ask** - Streaming chat questions
- **GET /api/chat/suggest** - Quick prompt suggestions

### 2. RAG System Tests
- **Chunker** - Text segmentation and token counting
- **Embeddings** - Vector generation and batch processing
- **VectorStore** - Search functionality and filtering

### 3. Intent Router Tests
- Intent classification accuracy
- Tool selection logic
- Confidence scoring

### 4. Tool Tests
- **ClauseFinder** - Legal clause identification
- **DeadlineScanner** - Date and deadline extraction
- **PIIRedactor** - Personal information detection/masking
- **TableExtractor** - Structured data extraction
- **LetterGenerator** - Document generation
- **Redliner** - Contract improvement suggestions

### 5. Error Handling Tests
- Custom error types (ChatError, RAGError, etc.)
- Retry mechanism with exponential backoff
- Circuit breaker pattern
- Graceful fallback scenarios

### 6. Integration Tests
- End-to-end chat flow
- Database operations
- Authentication middleware

## Sample Test Data

### Contract 1 - Employment Agreement
- **Type**: Arbeitsvertrag (Employment Contract)
- **Content**: Standard German employment terms
- **Key Features**: 
  - 6-month probation period
  - €5,500 monthly salary
  - 3-month termination notice
  - Confidentiality clauses
  - Penalty clauses

### Contract 2 - Rental Agreement  
- **Type**: Mietvertrag (Rental Contract)
- **Content**: 3-bedroom apartment rental
- **Key Features**:
  - €1,720 monthly rent (incl. utilities)
  - €4,200 security deposit
  - Pet policy restrictions
  - Renovation obligations
  - Penalty clauses

### Contract 3 - Service Agreement
- **Type**: Dienstleistungsvertrag (Service Contract)
- **Content**: Digital marketing services
- **Key Features**:
  - €8,500 monthly fee + €5,000 ad budget
  - 12-month term with auto-renewal
  - KPI-based performance metrics
  - €25,000 confidentiality penalties
  - Complex termination conditions

## Test Database Setup

Tests use MongoDB Memory Server for isolated database testing:

```javascript
// Automatic setup in setup.js
const mongoServer = await MongoMemoryServer.create();
const db = mongoClient.db('contractai_test');
```

### Available Test Helpers

```javascript
// Insert test contract
await global.testDb.insertTestContract({
  filename: 'custom-contract.pdf',
  analysis: { contractType: 'Mietvertrag' }
});

// Insert test user
await global.testDb.insertTestUser({
  email: 'custom@test.com',
  subscription: { plan: 'business' }
});

// Insert test chunks for RAG
await global.testDb.insertTestChunks([
  { text: 'Custom chunk text', contractId: 'test-123' }
]);

// Create authenticated JWT token
const token = global.createTestToken('user-123');

// Create mock SSE connection
const mockSSE = global.createMockSSEConnection();
```

## Testing Chat v2 Components

### Testing RAG Functionality
```javascript
describe('RAG System', () => {
  test('should chunk text appropriately', () => {
    const chunker = new Chunker();
    const chunks = chunker.chunkText(longText);
    expect(chunks.length).toBeGreaterThan(0);
  });

  test('should search contract content', async () => {
    const vectorStore = new VectorStore();
    const results = await vectorStore.search('Gehalt', 'contract-123');
    expect(results[0].text).toContain('Gehalt');
  });
});
```

### Testing Intent Classification
```javascript
test('should identify risk questions', async () => {
  const intentRouter = new IntentRouter();
  const result = await intentRouter.analyzeIntent(
    'Welche Risiken bestehen in diesem Vertrag?'
  );
  expect(result.primaryIntent).toBe('risk');
});
```

### Testing Streaming Chat
```javascript
test('should handle streaming responses', async () => {
  const mockSSE = global.createMockSSEConnection();
  
  // Simulate streaming chat
  await chatAPI.handleStreamingQuestion(question, mockSSE);
  
  // Verify events were sent
  expect(mockSSE.events).toContainEqual(
    expect.objectContaining({ type: 'chunk' })
  );
});
```

## Debugging Tests

### Enable Verbose Output
```bash
# Set environment variable
DEBUG_TESTS=true npm test

# Or run with verbose Jest flag
npx jest --verbose
```

### Mock Inspection
```javascript
// Check if mocks were called correctly
expect(mockEmbeddings.generateEmbeddings).toHaveBeenCalledWith(
  expect.arrayContaining([expect.stringContaining('Gehalt')])
);

// Inspect mock call arguments
console.log(mockTool.execute.mock.calls[0][0]);
```

## Performance Testing

### Memory Usage
Tests automatically clean up between runs to prevent memory leaks:

```javascript
afterEach(async () => {
  await global.testDb.clearTestData();
  jest.clearAllMocks();
});
```

### Timeout Configuration
```javascript
// For slow operations like embeddings
test('should generate embeddings', async () => {
  // Test implementation
}, 30000); // 30 second timeout
```

## Continuous Integration

### GitHub Actions Example
```yaml
name: Chat v2 Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm ci
      - run: npm test
      - run: npm run test:coverage
```

## Troubleshooting

### Common Issues

1. **MongoDB Connection Errors**
   ```bash
   # Ensure MongoDB Memory Server is installed
   npm install --save-dev mongodb-memory-server
   ```

2. **Timeout Errors**
   ```javascript
   // Increase timeout for slow tests
   jest.setTimeout(30000);
   ```

3. **Mock Not Working**
   ```javascript
   // Ensure mocks are cleared between tests
   beforeEach(() => {
     jest.clearAllMocks();
   });
   ```

4. **Environment Variables**
   ```javascript
   // Set test environment in setup
   process.env.NODE_ENV = 'test';
   ```

## Contributing

When adding new tests:

1. Follow the existing test structure
2. Add appropriate describe/test blocks
3. Use meaningful test descriptions
4. Clean up resources after tests
5. Add documentation for new test helpers

## Coverage Goals

- **API Routes**: >90% coverage
- **RAG System**: >85% coverage  
- **Tools**: >80% coverage
- **Error Handling**: >95% coverage
- **Integration**: >75% coverage