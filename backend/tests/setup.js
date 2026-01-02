// 📁 backend/tests/setup.js
// Jest Setup-Datei für alle Tests

// Mock für Environment-Variablen
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-for-testing-only';
process.env.MONGO_URI = 'mongodb://localhost:27017/contract_ai_test';

// Console-Logs in Tests reduzieren
if (process.env.JEST_SILENT !== 'false') {
  global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    // Errors und Warnings weiterhin anzeigen
    warn: console.warn,
    error: console.error,
  };
}

// Timeout für alle Tests
jest.setTimeout(10000);
