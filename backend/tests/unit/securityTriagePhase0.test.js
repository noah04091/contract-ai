// 📁 backend/tests/unit/securityTriagePhase0.test.js
// 🔒 Security-Triage 12.09.2026 (Master-Execution Phase 0):
//  A) Öffentliche Verify-Route: nur GENERIERTE Verträge, mit Rate-Limit.
//  B) Datei-Löschkaskade: Vertrags-/Account-Löschung entfernt auch S3-/lokale Dateien.

const fs = require('fs');
const path = require('path');

jest.mock('../../services/fileStorage', () => ({
  deleteFiles: jest.fn(async (keys) => ({ deleted: keys.length, failed: 0 })),
  deleteFile: jest.fn(async () => true),
}));
jest.mock('../../services/errorMonitoring', () => ({
  captureError: jest.fn(async () => {}),
}));

const { collectContractFileRefs, deleteContractFiles, FILE_CLEANUP_PROJECTION } = require('../../utils/contractFileCleanup');
const { VERTRAG_KEY_FELDER } = require('../../utils/s3KeyOwnership');
const fileStorage = require('../../services/fileStorage');
const errorMonitoring = require('../../services/errorMonitoring');

describe('B1) collectContractFileRefs — Schlüssel-Sammlung', () => {
  test('sammelt alle 5 Vertrags-Schlüsselfelder + filePath, dedupliziert, ignoriert Leeres', () => {
    const doc = {
      s3Key: 'contracts/a.pdf',
      optimizedPdfS3Key: 'contracts/a-opt.pdf',
      sealedS3Key: 'contracts/a-sealed.pdf',
      s3KeySealed: 'contracts/a-sealed.pdf', // Duplikat (2 Schreibweisen, gleicher Wert)
      pdfS3Key: '',                          // leer → ignorieren
      filePath: '/tmp/uploads/a.pdf',
    };
    const refs = collectContractFileRefs(doc);
    expect(refs.s3Keys.sort()).toEqual(['contracts/a-opt.pdf', 'contracts/a-sealed.pdf', 'contracts/a.pdf']);
    expect(refs.localPaths).toEqual(['/tmp/uploads/a.pdf']);
  });

  test('mehrere Dokumente, null/undefined/Nicht-Strings sicher', () => {
    const refs = collectContractFileRefs([
      { s3Key: 'k1' },
      null,
      { s3Key: 'k1', pdfS3Key: 'k2', filePath: 42 },
      { name: 'ohne Keys' },
    ]);
    expect(refs.s3Keys.sort()).toEqual(['k1', 'k2']);
    expect(refs.localPaths).toEqual([]);
  });

  test('FILE_CLEANUP_PROJECTION deckt exakt die Schlüsselfelder + filePath', () => {
    for (const f of VERTRAG_KEY_FELDER) expect(FILE_CLEANUP_PROJECTION[f]).toBe(1);
    expect(FILE_CLEANUP_PROJECTION.filePath).toBe(1);
  });
});

describe('B2) deleteContractFiles — Verhalten', () => {
  beforeEach(() => jest.clearAllMocks());

  test('löscht genau die Schlüssel der übergebenen Dokumente (nie fremde)', async () => {
    const res = await deleteContractFiles([{ s3Key: 'mine/1.pdf' }, { s3Key: 'mine/2.pdf' }], 'test');
    expect(fileStorage.deleteFiles).toHaveBeenCalledTimes(1);
    expect(fileStorage.deleteFiles.mock.calls[0][0].sort()).toEqual(['mine/1.pdf', 'mine/2.pdf']);
    expect(res.s3Deleted).toBe(2);
    expect(res.s3Failed).toBe(0);
  });

  test('keine Schlüssel ⇒ kein S3-Aufruf (idempotent leer)', async () => {
    const res = await deleteContractFiles([{ name: 'nur-db' }], 'test');
    expect(fileStorage.deleteFiles).not.toHaveBeenCalled();
    expect(res.keys).toBe(0);
  });

  test('wirft NIE, auch wenn der Storage-Layer wirft — und meldet ans Monitoring', async () => {
    fileStorage.deleteFiles.mockImplementationOnce(async () => { throw new Error('S3 down'); });
    await expect(deleteContractFiles({ s3Key: 'x' }, 'test')).resolves.toBeDefined();

    // Teil-Fehlschlag ⇒ CONTRACT_FILE_CLEANUP_INCOMPLETE ans Error-Monitoring (keine stille halbe Löschung)
    fileStorage.deleteFiles.mockImplementationOnce(async (keys) => ({ deleted: 0, failed: keys.length }));
    const res = await deleteContractFiles({ s3Key: 'y' }, 'test');
    expect(res.s3Failed).toBe(1);
    expect(errorMonitoring.captureError).toHaveBeenCalled();
    const meldung = errorMonitoring.captureError.mock.calls[0][0];
    expect(String(meldung.message)).toContain('CONTRACT_FILE_CLEANUP_INCOMPLETE');
  });
});

describe('C) Source-Scans — Kaskade ist an ALLEN vier Löschpfaden verdrahtet', () => {
  const lese = (p) => fs.readFileSync(path.join(__dirname, '../../', p), 'utf8');

  test('contracts.js: Einzel-Löschung + Bulk-Löschung rufen deleteContractFiles', () => {
    const src = lese('routes/contracts.js');
    expect(src).toMatch(/deleteContractFiles\(access, 'contract-delete'\)/);
    expect(src).toMatch(/deleteContractFiles\(ownedDocs, 'bulk-delete'\)/);
    // Bulk lädt die Schlüsselfelder VOR dem deleteMany
    expect(src.indexOf('FILE_CLEANUP_PROJECTION')).toBeGreaterThan(-1);
    expect(src.indexOf('FILE_CLEANUP_PROJECTION')).toBeLessThan(src.indexOf("deleteContractFiles(ownedDocs, 'bulk-delete')"));
  });

  test('auth.js: Selbst-Löschung sichert Schlüssel VOR deleteMany und löscht danach Dateien', () => {
    const src = lese('routes/auth.js');
    const ladeIdx = src.indexOf('vertragsDocsFuerCleanup');
    const deleteIdx = src.indexOf('contractsCollection.deleteMany({ userId: { $in: uidVariants } })');
    const cleanupIdx = src.indexOf("deleteContractFiles(vertragsDocsFuerCleanup, 'account-delete')");
    expect(ladeIdx).toBeGreaterThan(-1);
    expect(deleteIdx).toBeGreaterThan(ladeIdx);
    expect(cleanupIdx).toBeGreaterThan(deleteIdx);
  });

  test('admin.js: Einzel- und Massen-Löschung rufen die Kaskade', () => {
    const src = lese('routes/admin.js');
    expect(src).toContain("'admin-user-delete'");
    expect(src).toContain("'admin-bulk-user-delete'");
  });
});

describe('A) Source-Scans — öffentliche Verify-Route abgesichert', () => {
  const serverSrc = fs.readFileSync(path.join(__dirname, '../../server.js'), 'utf8');
  const limiterSrc = fs.readFileSync(path.join(__dirname, '../../middleware/rateLimiter.js'), 'utf8');

  test('Route nutzt publicVerifyLimiter', () => {
    expect(serverSrc).toMatch(/app\.get\("\/api\/contracts\/verify\/:id",\s*publicVerifyLimiter,/);
  });

  test('Route beantwortet NUR generierte Verträge (isGenerated: true im Filter)', () => {
    const routeStart = serverSrc.indexOf('app.get("/api/contracts/verify/:id"');
    const routeAusschnitt = serverSrc.slice(routeStart, routeStart + 3000);
    expect(routeAusschnitt).toMatch(/_id:\s*new ObjectId\(contractId\),\s*isGenerated:\s*true/);
  });

  test('publicVerifyLimiter existiert und ist exportiert (30/15min, Client-Adresse)', () => {
    expect(limiterSrc).toMatch(/const publicVerifyLimiter = rateLimit\(/);
    expect(limiterSrc).toMatch(/publicVerifyLimiter,/);
    const block = limiterSrc.slice(limiterSrc.indexOf('const publicVerifyLimiter'));
    expect(block.slice(0, 600)).toMatch(/max:\s*30/);
    expect(block.slice(0, 600)).toMatch(/keyGenerator:\s*clientAddressKey/);
  });
});
