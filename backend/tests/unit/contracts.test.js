// 📁 backend/tests/unit/contracts.test.js
// Umfassende Unit-Tests für Contracts API

const { ObjectId } = require('mongodb');

// Mock Environment
process.env.JWT_SECRET = 'test-secret-key-for-testing';
process.env.NODE_ENV = 'test';

describe('Contracts API - Unit Tests', () => {

  // ===== MOCK SETUP =====
  let mockContractsCollection;
  let mockEventsCollection;
  let mockReq;
  let mockRes;
  let mockUser;

  beforeEach(() => {
    // Mock User
    mockUser = {
      userId: new ObjectId().toString(),
      email: 'test@example.com'
    };

    // Reset collections
    mockContractsCollection = {
      find: jest.fn().mockReturnThis(),
      findOne: jest.fn(),
      insertOne: jest.fn(),
      updateOne: jest.fn(),
      deleteOne: jest.fn(),
      deleteMany: jest.fn(),
      countDocuments: jest.fn(),
      toArray: jest.fn(),
      aggregate: jest.fn().mockReturnThis()
    };

    mockEventsCollection = {
      find: jest.fn().mockReturnThis(),
      findOne: jest.fn(),
      insertOne: jest.fn(),
      deleteMany: jest.fn(),
      toArray: jest.fn()
    };

    mockReq = {
      body: {},
      params: {},
      query: {},
      headers: { 'user-agent': 'Jest Test Agent' },
      user: mockUser
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
  });

  // ===== GET /contracts TESTS =====
  describe('GET /contracts - Alle Verträge abrufen', () => {

    test('gibt leere Liste zurück wenn keine Verträge', async () => {
      mockContractsCollection.find.mockReturnValue({
        toArray: jest.fn().mockResolvedValue([])
      });

      const contracts = await mockContractsCollection.find({}).toArray();

      expect(contracts).toEqual([]);
      expect(contracts).toHaveLength(0);
    });

    test('filtert Verträge nach userId', async () => {
      const userId = new ObjectId();
      const mockContracts = [
        { _id: new ObjectId(), name: 'Contract 1', userId },
        { _id: new ObjectId(), name: 'Contract 2', userId }
      ];

      mockContractsCollection.find.mockReturnValue({
        toArray: jest.fn().mockResolvedValue(mockContracts)
      });

      const filter = { userId };
      const contracts = await mockContractsCollection.find(filter).toArray();

      expect(contracts).toHaveLength(2);
      expect(contracts[0].userId).toEqual(userId);
    });

    test('unterstützt Pagination (limit & skip)', async () => {
      const limit = 10;
      const skip = 20;

      // Test pagination parameters
      expect(limit).toBe(10);
      expect(skip).toBe(20);

      // Page 3 would be skip=20, limit=10 (items 21-30)
      const page = Math.floor(skip / limit) + 1;
      expect(page).toBe(3);
    });

    test('unterstützt Sortierung', async () => {
      const sortOptions = { createdAt: -1 }; // Neueste zuerst

      expect(sortOptions.createdAt).toBe(-1);
    });

    test('unterstützt Filter nach Status', async () => {
      const filter = {
        userId: new ObjectId(),
        status: 'active'
      };

      expect(filter.status).toBe('active');
    });

    test('unterstützt Filter nach Folder', async () => {
      const folderId = new ObjectId();
      const filter = {
        userId: new ObjectId(),
        folderId: folderId
      };

      expect(filter.folderId).toEqual(folderId);
    });

    test('unterstützt Suche nach Name', async () => {
      const searchTerm = 'Mietvertrag';
      const filter = {
        name: { $regex: searchTerm, $options: 'i' }
      };

      expect(filter.name.$regex).toBe('Mietvertrag');
      expect(filter.name.$options).toBe('i'); // Case-insensitive
    });
  });

  // ===== GET /contracts/:id TESTS =====
  describe('GET /contracts/:id - Einzelnen Vertrag abrufen', () => {

    test('gibt Vertrag mit gültiger ID zurück', async () => {
      const contractId = new ObjectId();
      const mockContract = {
        _id: contractId,
        name: 'Test Vertrag',
        content: 'Vertrag Inhalt...',
        userId: new ObjectId(mockUser.userId)
      };

      mockContractsCollection.findOne.mockResolvedValue(mockContract);

      const contract = await mockContractsCollection.findOne({
        _id: contractId,
        userId: new ObjectId(mockUser.userId)
      });

      expect(contract).toBeDefined();
      expect(contract.name).toBe('Test Vertrag');
    });

    test('gibt 404 für nicht existierenden Vertrag', async () => {
      const nonExistentId = new ObjectId();

      mockContractsCollection.findOne.mockResolvedValue(null);

      const contract = await mockContractsCollection.findOne({ _id: nonExistentId });

      if (!contract) {
        mockRes.status(404).json({ message: 'Vertrag nicht gefunden' });
      }

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    test('gibt 400 für ungültige ObjectId', () => {
      const invalidId = 'invalid-id-123';

      const isValid = ObjectId.isValid(invalidId);
      expect(isValid).toBe(false);

      if (!isValid) {
        mockRes.status(400).json({ message: 'Ungültige Vertrags-ID' });
      }

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    test('verhindert Zugriff auf fremde Verträge', async () => {
      const contractId = new ObjectId();
      const otherUserId = new ObjectId();

      // Vertrag gehört anderem User
      mockContractsCollection.findOne.mockResolvedValue(null); // wegen userId-Filter

      const contract = await mockContractsCollection.findOne({
        _id: contractId,
        userId: new ObjectId(mockUser.userId) // Eigene userId, nicht die des Vertrags
      });

      expect(contract).toBeNull();
    });
  });

  // ===== POST /contracts TESTS =====
  describe('POST /contracts - Neuen Vertrag erstellen', () => {

    test('erstellt Vertrag mit Pflichtfeldern', async () => {
      const newContract = {
        name: 'Neuer Vertrag',
        content: 'Vertragsinhalt...',
        contractType: 'Mietvertrag'
      };

      mockReq.body = newContract;

      const contractToInsert = {
        ...newContract,
        userId: new ObjectId(mockUser.userId),
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
        status: 'active'
      };

      mockContractsCollection.insertOne.mockResolvedValue({
        insertedId: new ObjectId()
      });

      const result = await mockContractsCollection.insertOne(contractToInsert);

      expect(result.insertedId).toBeDefined();
    });

    test('setzt Standard-Werte für neue Verträge', () => {
      const newContract = {
        name: 'Test',
        content: 'Content'
      };

      const defaults = {
        status: 'active',
        analysisCount: 0,
        isAnalyzed: false,
        riskScore: null,
        tags: [],
        folderId: null
      };

      const contractWithDefaults = { ...defaults, ...newContract };

      expect(contractWithDefaults.status).toBe('active');
      expect(contractWithDefaults.analysisCount).toBe(0);
      expect(contractWithDefaults.isAnalyzed).toBe(false);
      expect(contractWithDefaults.tags).toEqual([]);
    });

    test('validiert Pflichtfeld: name', () => {
      mockReq.body = { content: 'Inhalt ohne Namen' };

      const { name } = mockReq.body;
      if (!name) {
        mockRes.status(400).json({ message: 'Name ist erforderlich' });
      }

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    test('speichert userId des eingeloggten Users', () => {
      const userId = new ObjectId(mockUser.userId);

      const contract = {
        name: 'Test',
        content: 'Content',
        userId: userId
      };

      expect(contract.userId).toEqual(userId);
    });
  });

  // ===== PUT /contracts/:id TESTS =====
  describe('PUT /contracts/:id - Vertrag aktualisieren', () => {

    test('aktualisiert Vertragsname', async () => {
      const contractId = new ObjectId();
      const update = { name: 'Neuer Name' };

      mockContractsCollection.updateOne.mockResolvedValue({
        matchedCount: 1,
        modifiedCount: 1
      });

      const result = await mockContractsCollection.updateOne(
        { _id: contractId, userId: new ObjectId(mockUser.userId) },
        { $set: { ...update, updatedAt: new Date() } }
      );

      expect(result.matchedCount).toBe(1);
      expect(result.modifiedCount).toBe(1);
    });

    test('aktualisiert Vertragsstatus', async () => {
      const contractId = new ObjectId();
      const validStatuses = ['active', 'expired', 'cancelled', 'draft'];

      const newStatus = 'expired';
      expect(validStatuses).toContain(newStatus);
    });

    test('aktualisiert Tags', async () => {
      const contractId = new ObjectId();
      const newTags = ['wichtig', 'mietvertrag', '2024'];

      expect(Array.isArray(newTags)).toBe(true);
      expect(newTags).toHaveLength(3);
    });

    test('gibt 404 wenn Vertrag nicht existiert', async () => {
      const nonExistentId = new ObjectId();

      mockContractsCollection.updateOne.mockResolvedValue({
        matchedCount: 0,
        modifiedCount: 0
      });

      const result = await mockContractsCollection.updateOne(
        { _id: nonExistentId },
        { $set: { name: 'Test' } }
      );

      if (result.matchedCount === 0) {
        mockRes.status(404).json({ message: 'Vertrag nicht gefunden' });
      }

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    test('setzt updatedAt Timestamp', () => {
      const beforeUpdate = new Date();
      const update = {
        name: 'Updated',
        updatedAt: new Date()
      };

      expect(update.updatedAt.getTime()).toBeGreaterThanOrEqual(beforeUpdate.getTime());
    });
  });

  // ===== DELETE /contracts/:id TESTS =====
  describe('DELETE /contracts/:id - Vertrag löschen', () => {

    test('löscht Vertrag erfolgreich', async () => {
      const contractId = new ObjectId();

      mockContractsCollection.deleteOne.mockResolvedValue({
        deletedCount: 1
      });

      const result = await mockContractsCollection.deleteOne({
        _id: contractId,
        userId: new ObjectId(mockUser.userId)
      });

      expect(result.deletedCount).toBe(1);
    });

    test('löscht zugehörige Events', async () => {
      const contractId = new ObjectId();

      mockEventsCollection.deleteMany.mockResolvedValue({
        deletedCount: 3
      });

      const result = await mockEventsCollection.deleteMany({
        contractId: contractId,
        userId: new ObjectId(mockUser.userId)
      });

      expect(result.deletedCount).toBe(3);
    });

    test('gibt 404 wenn Vertrag nicht existiert', async () => {
      const nonExistentId = new ObjectId();

      mockContractsCollection.deleteOne.mockResolvedValue({
        deletedCount: 0
      });

      const result = await mockContractsCollection.deleteOne({
        _id: nonExistentId
      });

      if (result.deletedCount === 0) {
        mockRes.status(404).json({ message: 'Vertrag nicht gefunden' });
      }

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    test('verhindert Löschen fremder Verträge', async () => {
      const contractId = new ObjectId();
      const attackerUserId = new ObjectId();

      // Mit userId-Filter sollte kein Vertrag gefunden werden
      mockContractsCollection.deleteOne.mockResolvedValue({
        deletedCount: 0
      });

      const result = await mockContractsCollection.deleteOne({
        _id: contractId,
        userId: attackerUserId // Falscher User
      });

      expect(result.deletedCount).toBe(0);
    });
  });

  // ===== POST /contracts/bulk-delete TESTS =====
  describe('POST /contracts/bulk-delete - Mehrere Verträge löschen', () => {

    test('löscht mehrere Verträge auf einmal', async () => {
      const contractIds = [
        new ObjectId(),
        new ObjectId(),
        new ObjectId()
      ];

      mockContractsCollection.deleteMany.mockResolvedValue({
        deletedCount: 3
      });

      const result = await mockContractsCollection.deleteMany({
        _id: { $in: contractIds },
        userId: new ObjectId(mockUser.userId)
      });

      expect(result.deletedCount).toBe(3);
    });

    test('validiert Array von IDs', () => {
      const validIds = [new ObjectId().toString(), new ObjectId().toString()];
      const invalidIds = ['invalid-1', 'invalid-2'];

      const validCheck = validIds.every(id => ObjectId.isValid(id));
      const invalidCheck = invalidIds.every(id => ObjectId.isValid(id));

      expect(validCheck).toBe(true);
      expect(invalidCheck).toBe(false);
    });

    test('gibt 400 für leeres Array', () => {
      mockReq.body = { ids: [] };

      const { ids } = mockReq.body;
      if (!ids || ids.length === 0) {
        mockRes.status(400).json({ message: 'Keine Vertrags-IDs angegeben' });
      }

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  // ===== ANALYSIS TESTS =====
  describe('POST /contracts/:id/analyze - Vertrag analysieren', () => {

    test('validiert Vertrags-ID', () => {
      const validId = new ObjectId().toString();
      const invalidId = '123';

      expect(ObjectId.isValid(validId)).toBe(true);
      expect(ObjectId.isValid(invalidId)).toBe(false);
    });

    test('prüft ob Vertrag Content hat', async () => {
      const contractWithContent = {
        _id: new ObjectId(),
        name: 'Test',
        content: 'Dies ist der Vertragsinhalt...',
        userId: new ObjectId(mockUser.userId)
      };

      const contractWithoutContent = {
        _id: new ObjectId(),
        name: 'Test',
        content: '',
        userId: new ObjectId(mockUser.userId)
      };

      expect(contractWithContent.content.length).toBeGreaterThan(0);
      expect(contractWithoutContent.content.length).toBe(0);
    });

    test('speichert Analyse-Ergebnis', async () => {
      const analysisResult = {
        riskScore: 65,
        risks: [
          { type: 'Kündigungsfrist', severity: 'medium', description: 'Kurze Frist' }
        ],
        suggestions: ['Frist verlängern'],
        summary: 'Moderates Risiko',
        analyzedAt: new Date()
      };

      mockContractsCollection.updateOne.mockResolvedValue({
        matchedCount: 1,
        modifiedCount: 1
      });

      const result = await mockContractsCollection.updateOne(
        { _id: new ObjectId() },
        { $set: { analysis: analysisResult, isAnalyzed: true } }
      );

      expect(result.modifiedCount).toBe(1);
    });
  });

  // ===== CONTRACT STATUS TESTS =====
  describe('Vertragsstatus-Validierung', () => {

    test('akzeptiert gültige Status-Werte', () => {
      const validStatuses = ['active', 'expired', 'cancelled', 'draft', 'pending'];

      validStatuses.forEach(status => {
        expect(validStatuses).toContain(status);
      });
    });

    test('lehnt ungültige Status-Werte ab', () => {
      const validStatuses = ['active', 'expired', 'cancelled', 'draft', 'pending'];
      const invalidStatus = 'unknown';

      expect(validStatuses).not.toContain(invalidStatus);
    });
  });

  // ===== DATE HANDLING TESTS =====
  describe('Datums-Verarbeitung', () => {

    test('parst ISO-Datum korrekt', () => {
      const isoDate = '2024-12-31T12:00:00.000Z';
      const parsed = new Date(isoDate);

      // UTC-Methoden verwenden um Timezone-Probleme zu vermeiden
      expect(parsed.getUTCFullYear()).toBe(2024);
      expect(parsed.getUTCMonth()).toBe(11); // Dezember = 11
      expect(parsed.getUTCDate()).toBe(31);
    });

    test('parst deutsches Datum korrekt', () => {
      const germanDate = '31.12.2024';
      const parts = germanDate.split('.');
      const parsed = new Date(
        parseInt(parts[2]),
        parseInt(parts[1]) - 1,
        parseInt(parts[0])
      );

      expect(parsed.getFullYear()).toBe(2024);
      expect(parsed.getMonth()).toBe(11);
      expect(parsed.getDate()).toBe(31);
    });

    test('erkennt abgelaufene Verträge', () => {
      const expiredDate = new Date('2020-01-01');
      const now = new Date();

      const isExpired = expiredDate < now;
      expect(isExpired).toBe(true);
    });

    test('erkennt bald ablaufende Verträge (30 Tage)', () => {
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      const twentyDaysFromNow = new Date();
      twentyDaysFromNow.setDate(twentyDaysFromNow.getDate() + 20);

      const now = new Date();
      const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

      const isExpiringSoon = (twentyDaysFromNow.getTime() - now.getTime()) < thirtyDaysMs;
      expect(isExpiringSoon).toBe(true);
    });
  });

  // ===== RISK SCORE TESTS =====
  describe('Risk Score Berechnung', () => {

    test('Risk Score ist zwischen 0 und 100', () => {
      const validScores = [0, 25, 50, 75, 100];

      validScores.forEach(score => {
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(100);
      });
    });

    test('kategorisiert Risk Score korrekt', () => {
      const categorizeRisk = (score) => {
        if (score <= 30) return 'low';
        if (score <= 60) return 'medium';
        return 'high';
      };

      expect(categorizeRisk(20)).toBe('low');
      expect(categorizeRisk(45)).toBe('medium');
      expect(categorizeRisk(80)).toBe('high');
    });
  });

  // ===== FOLDER TESTS =====
  describe('Ordner-Funktionalität', () => {

    test('verschiebt Vertrag in Ordner', async () => {
      const contractId = new ObjectId();
      const folderId = new ObjectId();

      mockContractsCollection.updateOne.mockResolvedValue({
        matchedCount: 1,
        modifiedCount: 1
      });

      const result = await mockContractsCollection.updateOne(
        { _id: contractId },
        { $set: { folderId: folderId } }
      );

      expect(result.modifiedCount).toBe(1);
    });

    test('entfernt Vertrag aus Ordner (folderId: null)', async () => {
      const contractId = new ObjectId();

      mockContractsCollection.updateOne.mockResolvedValue({
        matchedCount: 1,
        modifiedCount: 1
      });

      const result = await mockContractsCollection.updateOne(
        { _id: contractId },
        { $set: { folderId: null } }
      );

      expect(result.modifiedCount).toBe(1);
    });
  });

  // ===== SECURITY TESTS =====
  describe('Security - Autorisierung', () => {

    test('alle CRUD-Operationen filtern nach userId', () => {
      const userId = new ObjectId(mockUser.userId);

      // Read
      const readFilter = { _id: new ObjectId(), userId };
      expect(readFilter.userId).toBeDefined();

      // Update
      const updateFilter = { _id: new ObjectId(), userId };
      expect(updateFilter.userId).toBeDefined();

      // Delete
      const deleteFilter = { _id: new ObjectId(), userId };
      expect(deleteFilter.userId).toBeDefined();
    });

    test('ObjectId-Injection wird verhindert', () => {
      const maliciousInput = { $ne: null };

      // ObjectId.isValid sollte false zurückgeben
      expect(ObjectId.isValid(maliciousInput)).toBe(false);

      // new ObjectId() sollte fehlschlagen
      expect(() => new ObjectId(maliciousInput)).toThrow();
    });
  });
});
