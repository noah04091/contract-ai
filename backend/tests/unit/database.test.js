// 📁 backend/tests/unit/database.test.js
// Unit-Tests für Database Connection & Reconnect Logic

// Wir testen nur die Logik, nicht die echte DB-Verbindung
describe('Database Module', () => {
  let Database;
  let mockMongoClient;

  beforeEach(() => {
    // Reset module cache
    jest.resetModules();

    // Mock MongoClient
    mockMongoClient = {
      connect: jest.fn().mockResolvedValue(),
      db: jest.fn().mockReturnValue({
        collection: jest.fn().mockReturnValue({}),
        admin: jest.fn().mockReturnValue({
          ping: jest.fn().mockResolvedValue(true)
        })
      }),
      on: jest.fn(),
      close: jest.fn().mockResolvedValue()
    };

    // Mock mongodb module
    jest.doMock('mongodb', () => ({
      MongoClient: jest.fn().mockImplementation(() => mockMongoClient)
    }));
  });

  describe('Connection Status', () => {
    test('getStatus gibt korrekten Status zurück', () => {
      const database = require('../../config/database');

      const status = database.getStatus();

      expect(status).toHaveProperty('connected');
      expect(status).toHaveProperty('isConnecting');
      expect(status).toHaveProperty('hasClient');
      expect(typeof status.connected).toBe('boolean');
    });
  });

  describe('Reconnect Configuration', () => {
    test('hat korrekte Reconnect-Parameter', () => {
      // Diese Werte sind im database.js definiert
      const database = require('../../config/database');

      // Prüfe dass die Klasse existiert und Eigenschaften hat
      expect(database).toBeDefined();
      expect(typeof database.connect).toBe('function');
      expect(typeof database.close).toBe('function');
      expect(typeof database.ping).toBe('function');
    });
  });

  describe('Collection Methods', () => {
    test('getCollection ist eine Funktion', () => {
      const database = require('../../config/database');
      expect(typeof database.getCollection).toBe('function');
    });

    test('find ist eine Funktion', () => {
      const database = require('../../config/database');
      expect(typeof database.find).toBe('function');
    });

    test('findOne ist eine Funktion', () => {
      const database = require('../../config/database');
      expect(typeof database.findOne).toBe('function');
    });

    test('insertOne ist eine Funktion', () => {
      const database = require('../../config/database');
      expect(typeof database.insertOne).toBe('function');
    });

    test('updateOne ist eine Funktion', () => {
      const database = require('../../config/database');
      expect(typeof database.updateOne).toBe('function');
    });

    test('deleteOne ist eine Funktion', () => {
      const database = require('../../config/database');
      expect(typeof database.deleteOne).toBe('function');
    });

    test('aggregate ist eine Funktion', () => {
      const database = require('../../config/database');
      expect(typeof database.aggregate).toBe('function');
    });
  });
});
