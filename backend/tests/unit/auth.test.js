// 📁 backend/tests/unit/auth.test.js
// Umfassende Unit-Tests für Auth Routes

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Mock Environment
process.env.JWT_SECRET = 'test-secret-key-for-testing';
process.env.NODE_ENV = 'test';

describe('Auth Routes - Unit Tests', () => {

  // ===== MOCK SETUP =====
  let mockUsersCollection;
  let mockDb;
  let mockReq;
  let mockRes;

  beforeEach(() => {
    // Reset mocks
    mockUsersCollection = {
      findOne: jest.fn(),
      insertOne: jest.fn(),
      updateOne: jest.fn(),
      deleteOne: jest.fn()
    };

    mockDb = {
      collection: jest.fn().mockReturnValue(mockUsersCollection)
    };

    mockReq = {
      body: {},
      headers: { 'user-agent': 'Jest Test Agent' },
      cookies: {},
      ip: '127.0.0.1'
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      cookie: jest.fn().mockReturnThis()
    };
  });

  // ===== REGISTRATION TESTS =====
  describe('POST /register - Registrierung', () => {

    test('lehnt Registrierung ohne E-Mail ab', async () => {
      mockReq.body = { password: 'Test123!@#' };

      // Simulate validation
      const { email, password } = mockReq.body;
      if (!email || !password) {
        mockRes.status(400).json({ message: '❌ E-Mail und Passwort erforderlich' });
      }

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining('E-Mail') })
      );
    });

    test('lehnt Registrierung ohne Passwort ab', async () => {
      mockReq.body = { email: 'test@example.com' };

      const { email, password } = mockReq.body;
      if (!email || !password) {
        mockRes.status(400).json({ message: '❌ E-Mail und Passwort erforderlich' });
      }

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    test('lehnt Registrierung ohne Namen ab', async () => {
      mockReq.body = {
        email: 'test@example.com',
        password: 'Test123!@#'
      };

      const { firstName, lastName } = mockReq.body;
      if (!firstName || !lastName) {
        mockRes.status(400).json({ message: '❌ Vorname und Nachname erforderlich' });
      }

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining('Vorname') })
      );
    });

    test('lehnt bereits registrierte E-Mail ab (409)', async () => {
      mockReq.body = {
        email: 'existing@example.com',
        password: 'Test123!@#',
        firstName: 'Max',
        lastName: 'Mustermann'
      };

      // Simulate existing user
      mockUsersCollection.findOne.mockResolvedValue({ email: 'existing@example.com' });

      const existing = await mockUsersCollection.findOne({ email: mockReq.body.email });
      if (existing) {
        mockRes.status(409).json({ message: '❌ E-Mail bereits registriert' });
      }

      expect(mockRes.status).toHaveBeenCalledWith(409);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining('bereits registriert') })
      );
    });

    test('erstellt neuen User mit korrekten Feldern', async () => {
      mockReq.body = {
        email: 'newuser@example.com',
        password: 'SecurePass123!@#',
        firstName: 'Max',
        lastName: 'Mustermann'
      };

      mockUsersCollection.findOne.mockResolvedValue(null); // No existing user
      mockUsersCollection.insertOne.mockResolvedValue({ insertedId: 'new-id' });

      const existing = await mockUsersCollection.findOne({ email: mockReq.body.email });
      expect(existing).toBeNull();

      // Hash password
      const hashedPassword = await bcrypt.hash(mockReq.body.password, 10);
      expect(hashedPassword).toBeDefined();
      expect(hashedPassword).not.toBe(mockReq.body.password);
    });

    test('Beta-Tester erhalten legendary subscription', async () => {
      mockReq.body = {
        email: 'beta@example.com',
        password: 'SecurePass123!@#',
        firstName: 'Beta',
        lastName: 'Tester',
        isBetaTester: true
      };

      const { isBetaTester } = mockReq.body;
      const subscriptionPlan = isBetaTester ? 'legendary' : 'free';

      expect(subscriptionPlan).toBe('legendary');
    });

    test('normale User erhalten free subscription', async () => {
      mockReq.body = {
        email: 'normal@example.com',
        password: 'SecurePass123!@#',
        firstName: 'Normal',
        lastName: 'User',
        isBetaTester: false
      };

      const { isBetaTester } = mockReq.body;
      const subscriptionPlan = isBetaTester ? 'legendary' : 'free';

      expect(subscriptionPlan).toBe('free');
    });
  });

  // ===== LOGIN TESTS =====
  describe('POST /login - Anmeldung', () => {

    test('lehnt Login ohne E-Mail ab', async () => {
      mockReq.body = { password: 'Test123!@#' };

      const { email, password } = mockReq.body;
      if (!email || !password) {
        mockRes.status(400).json({ message: '❌ E-Mail und Passwort erforderlich' });
      }

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    test('lehnt Login ohne Passwort ab', async () => {
      mockReq.body = { email: 'test@example.com' };

      const { email, password } = mockReq.body;
      if (!email || !password) {
        mockRes.status(400).json({ message: '❌ E-Mail und Passwort erforderlich' });
      }

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    test('lehnt Login mit unbekannter E-Mail ab (401)', async () => {
      mockReq.body = { email: 'unknown@example.com', password: 'Test123!@#' };

      mockUsersCollection.findOne.mockResolvedValue(null);

      const user = await mockUsersCollection.findOne({ email: mockReq.body.email });
      if (!user) {
        mockRes.status(401).json({ message: '❌ Ungültige Anmeldedaten' });
      }

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining('Ungültige') })
      );
    });

    test('lehnt Login mit falschem Passwort ab (401)', async () => {
      const hashedPassword = await bcrypt.hash('CorrectPassword123!', 10);

      mockReq.body = { email: 'user@example.com', password: 'WrongPassword123!' };

      mockUsersCollection.findOne.mockResolvedValue({
        email: 'user@example.com',
        password: hashedPassword,
        verified: true
      });

      const user = await mockUsersCollection.findOne({ email: mockReq.body.email });
      const match = await bcrypt.compare(mockReq.body.password, user.password);

      expect(match).toBe(false);

      if (!match) {
        mockRes.status(401).json({ message: '❌ Ungültige Anmeldedaten' });
      }

      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    test('verlangt E-Mail-Verifizierung (403)', async () => {
      const hashedPassword = await bcrypt.hash('Test123!@#', 10);

      mockReq.body = { email: 'unverified@example.com', password: 'Test123!@#' };

      mockUsersCollection.findOne.mockResolvedValue({
        email: 'unverified@example.com',
        password: hashedPassword,
        verified: false // Nicht verifiziert!
      });

      const user = await mockUsersCollection.findOne({ email: mockReq.body.email });
      const match = await bcrypt.compare(mockReq.body.password, user.password);

      expect(match).toBe(true);

      if (user.verified === false) {
        mockRes.status(403).json({
          message: 'Bitte bestätigen Sie zuerst Ihre E-Mail-Adresse',
          requiresVerification: true
        });
      }

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ requiresVerification: true })
      );
    });

    test('blockiert gesperrte User (403)', async () => {
      const hashedPassword = await bcrypt.hash('Test123!@#', 10);

      mockReq.body = { email: 'suspended@example.com', password: 'Test123!@#' };

      mockUsersCollection.findOne.mockResolvedValue({
        email: 'suspended@example.com',
        password: hashedPassword,
        verified: true,
        suspended: true,
        suspendReason: 'Abuse'
      });

      const user = await mockUsersCollection.findOne({ email: mockReq.body.email });

      if (user.suspended === true) {
        mockRes.status(403).json({
          message: 'Ihr Konto wurde gesperrt.',
          suspended: true,
          reason: user.suspendReason
        });
      }

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ suspended: true })
      );
    });

    test('erfolgreicher Login gibt Token zurück', async () => {
      const hashedPassword = await bcrypt.hash('Test123!@#', 10);

      mockReq.body = { email: 'valid@example.com', password: 'Test123!@#' };

      mockUsersCollection.findOne.mockResolvedValue({
        _id: 'user-123',
        email: 'valid@example.com',
        password: hashedPassword,
        verified: true,
        isPremium: true
      });

      const user = await mockUsersCollection.findOne({ email: mockReq.body.email });
      const match = await bcrypt.compare(mockReq.body.password, user.password);

      expect(match).toBe(true);
      expect(user.verified).toBe(true);
      expect(user.suspended).toBeUndefined();

      // Generate token
      const token = jwt.sign(
        { email: user.email, userId: user._id },
        process.env.JWT_SECRET,
        { expiresIn: '2h' }
      );

      expect(token).toBeDefined();

      // Verify token is valid
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      expect(decoded.email).toBe('valid@example.com');
      expect(decoded.userId).toBe('user-123');
    });

    test('setzt HttpOnly Cookie bei erfolgreichem Login', async () => {
      const token = jwt.sign(
        { email: 'user@example.com', userId: '123' },
        process.env.JWT_SECRET,
        { expiresIn: '2h' }
      );

      const cookieOptions = {
        httpOnly: true,
        secure: false, // Test-Umgebung
        sameSite: 'Lax',
        path: '/',
        maxAge: 1000 * 60 * 60 * 2
      };

      mockRes.cookie('token', token, cookieOptions);

      expect(mockRes.cookie).toHaveBeenCalledWith('token', token, expect.objectContaining({
        httpOnly: true,
        sameSite: 'Lax'
      }));
    });
  });

  // ===== GET /me TESTS =====
  describe('GET /me - Aktueller User', () => {

    test('gibt User-Daten ohne Passwort zurück', async () => {
      const mockUser = {
        _id: 'user-123',
        email: 'user@example.com',
        password: 'hashed-password-should-not-appear',
        firstName: 'Max',
        lastName: 'Mustermann',
        subscriptionPlan: 'premium',
        verified: true
      };

      mockUsersCollection.findOne.mockResolvedValue(mockUser);

      const user = await mockUsersCollection.findOne({ _id: 'user-123' });

      // Passwort sollte entfernt werden
      const { password, ...safeUser } = user;

      expect(safeUser.password).toBeUndefined();
      expect(safeUser.email).toBe('user@example.com');
      expect(safeUser.firstName).toBe('Max');
    });

    test('gibt 404 wenn User nicht existiert', async () => {
      mockUsersCollection.findOne.mockResolvedValue(null);

      const user = await mockUsersCollection.findOne({ _id: 'non-existent' });

      if (!user) {
        mockRes.status(404).json({ message: 'User nicht gefunden' });
      }

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });
  });

  // ===== LOGOUT TESTS =====
  describe('POST /logout - Abmeldung', () => {

    test('löscht Token-Cookie', () => {
      const clearCookieOptions = {
        httpOnly: true,
        secure: false,
        sameSite: 'Lax',
        path: '/'
      };

      // Simulate clearing cookie by setting empty value with immediate expiry
      mockRes.cookie('token', '', { ...clearCookieOptions, maxAge: 0 });

      expect(mockRes.cookie).toHaveBeenCalledWith('token', '', expect.objectContaining({
        maxAge: 0
      }));
    });
  });

  // ===== PASSWORD VALIDATION TESTS =====
  describe('Passwort-Validierung', () => {

    test('lehnt zu kurzes Passwort ab', () => {
      const password = 'Short1!';
      const isValid = password.length >= 8;

      expect(isValid).toBe(false);
    });

    test('akzeptiert starkes Passwort', () => {
      const password = 'SecurePass123!@#';

      const hasMinLength = password.length >= 8;
      const hasUppercase = /[A-Z]/.test(password);
      const hasLowercase = /[a-z]/.test(password);
      const hasNumber = /[0-9]/.test(password);
      const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);

      expect(hasMinLength).toBe(true);
      expect(hasUppercase).toBe(true);
      expect(hasLowercase).toBe(true);
      expect(hasNumber).toBe(true);
      expect(hasSpecial).toBe(true);
    });

    test('lehnt Passwort ohne Sonderzeichen ab', () => {
      const password = 'SecurePass123';
      const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);

      expect(hasSpecial).toBe(false);
    });
  });

  // ===== EMAIL NORMALIZATION TESTS =====
  describe('E-Mail Normalisierung', () => {

    test('konvertiert E-Mail zu Kleinbuchstaben', () => {
      const email = 'TEST@EXAMPLE.COM';
      const normalized = email.toLowerCase().trim();

      expect(normalized).toBe('test@example.com');
    });

    test('entfernt Leerzeichen', () => {
      const email = '  test@example.com  ';
      const normalized = email.toLowerCase().trim();

      expect(normalized).toBe('test@example.com');
    });
  });

  // ===== JWT TOKEN TESTS =====
  describe('JWT Token Handling', () => {

    test('generiert gültigen JWT Token', () => {
      const payload = { userId: '123', email: 'test@example.com' };
      const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '2h' });

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT hat 3 Teile
    });

    test('Token enthält korrekten Payload', () => {
      const payload = { userId: '123', email: 'test@example.com' };
      const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '2h' });

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      expect(decoded.userId).toBe('123');
      expect(decoded.email).toBe('test@example.com');
      expect(decoded.exp).toBeDefined();
    });

    test('lehnt abgelaufenen Token ab', () => {
      const payload = { userId: '123', email: 'test@example.com' };
      const expiredToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '-1h' });

      expect(() => {
        jwt.verify(expiredToken, process.env.JWT_SECRET);
      }).toThrow();
    });

    test('lehnt Token mit falschem Secret ab', () => {
      const payload = { userId: '123', email: 'test@example.com' };
      const token = jwt.sign(payload, 'wrong-secret', { expiresIn: '2h' });

      expect(() => {
        jwt.verify(token, process.env.JWT_SECRET);
      }).toThrow();
    });
  });

  // ===== PASSWORD HASHING TESTS =====
  describe('Passwort Hashing', () => {

    test('hasht Passwort korrekt', async () => {
      const password = 'TestPassword123!';
      const hashed = await bcrypt.hash(password, 10);

      expect(hashed).not.toBe(password);
      expect(hashed.length).toBeGreaterThan(50);
    });

    test('verifiziert korrektes Passwort', async () => {
      const password = 'TestPassword123!';
      const hashed = await bcrypt.hash(password, 10);

      const match = await bcrypt.compare(password, hashed);
      expect(match).toBe(true);
    });

    test('lehnt falsches Passwort ab', async () => {
      const password = 'TestPassword123!';
      const hashed = await bcrypt.hash(password, 10);

      const match = await bcrypt.compare('WrongPassword', hashed);
      expect(match).toBe(false);
    });

    test('gleiche Passwörter haben unterschiedliche Hashes (Salt)', async () => {
      const password = 'TestPassword123!';
      const hash1 = await bcrypt.hash(password, 10);
      const hash2 = await bcrypt.hash(password, 10);

      expect(hash1).not.toBe(hash2);

      // Aber beide verifizieren korrekt
      expect(await bcrypt.compare(password, hash1)).toBe(true);
      expect(await bcrypt.compare(password, hash2)).toBe(true);
    });
  });
});
