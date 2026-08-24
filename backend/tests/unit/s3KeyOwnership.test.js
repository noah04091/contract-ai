// 📁 backend/tests/unit/s3KeyOwnership.test.js
// 24.08.2026 — Sicherheits-Durchgang Schritt 6/6.
// keyBelongsToUser prueft, ob ein S3-Schluessel zu einem Vertrag/Envelope des Nutzers
// (oder seiner Org) gehoert. Deckt ALLE Schluessel-Felder ab. Die drei rohen s3Routes-
// Zweige (?key=, ?file=, /refresh) haengen daran.
//
// Wir mocken die nativen Collections der Modelle, damit KEINE Produktiv-DB angefasst
// wird. Der Test prueft die Query-LOGIK: welches Feld/welcher Besitzer trifft.

const store = { contracts: [], envelopes: [], memberships: [] };

// Minimaler Mongo-Query-Matcher fuer die genutzten Operatoren ($and/$or/$in).
function matchOne(doc, cond) {
  if (cond.$and) return cond.$and.every(c => matchOne(doc, c));
  if (cond.$or) return cond.$or.some(c => matchOne(doc, c));
  return Object.entries(cond).every(([k, v]) => {
    const val = doc[k];
    if (v && v.$in) return v.$in.some(x => String(x) === String(val));
    return String(val) === String(v);
  });
}
const fakeCol = (arr) => ({ findOne: async (q) => arr.find(d => matchOne(d, q)) || null });

jest.mock('../../models/Contract', () => ({ collection: null }), { virtual: true });
jest.mock('../../models/Envelope', () => ({ collection: null }), { virtual: true });
jest.mock('../../models/OrganizationMember', () => ({ find: null }), { virtual: true });

const Contract = require('../../models/Contract');
const Envelope = require('../../models/Envelope');
const OrganizationMember = require('../../models/OrganizationMember');

const { ObjectId } = require('mongodb');
const { keyBelongsToUser } = require('../../utils/s3KeyOwnership');

const ME = new ObjectId();
const FREMD = new ObjectId();
const ORG = new ObjectId();

beforeEach(() => {
  store.contracts = []; store.envelopes = []; store.memberships = [];
  Contract.collection = fakeCol(store.contracts);
  Envelope.collection = fakeCol(store.envelopes);
  OrganizationMember.find = () => ({ lean: async () => store.memberships });
});

describe('keyBelongsToUser: eigene Schluessel — ALLE Arten erlaubt', () => {
  test('✅ Original-Schluessel (s3Key) des eigenen Vertrags', async () => {
    store.contracts.push({ userId: ME, s3Key: 'contracts/mein-original.pdf' });
    expect(await keyBelongsToUser(ME.toString(), 'contracts/mein-original.pdf')).toBe(true);
  });
  test('✅ Optimiert (optimizedPdfS3Key)', async () => {
    store.contracts.push({ userId: ME, optimizedPdfS3Key: 'contracts/opt.pdf' });
    expect(await keyBelongsToUser(ME.toString(), 'contracts/opt.pdf')).toBe(true);
  });
  test('✅ Signiert in BEIDEN Schreibweisen (s3KeySealed UND sealedS3Key)', async () => {
    store.contracts.push({ userId: ME, s3KeySealed: 'contracts/sig1.pdf' });
    store.contracts.push({ userId: ME, sealedS3Key: 'contracts/sig2.pdf' });
    expect(await keyBelongsToUser(ME.toString(), 'contracts/sig1.pdf')).toBe(true);
    expect(await keyBelongsToUser(ME.toString(), 'contracts/sig2.pdf')).toBe(true);
  });
  test('✅ Envelope-Schluessel des EIGENEN Envelopes (ownerId)', async () => {
    store.envelopes.push({ ownerId: ME, s3KeySealed: 'envelopes/mein-sig.pdf' });
    expect(await keyBelongsToUser(ME.toString(), 'envelopes/mein-sig.pdf')).toBe(true);
  });
  test('✅ Team: fremder Owner, aber gleiche aktive Organisation', async () => {
    store.memberships.push({ organizationId: ORG, isActive: true });
    store.contracts.push({ userId: FREMD, organizationId: ORG, s3Key: 'contracts/team.pdf' });
    expect(await keyBelongsToUser(ME.toString(), 'contracts/team.pdf')).toBe(true);
  });
  test('✅ Alt-Bestand: userId als STRING gespeichert', async () => {
    store.contracts.push({ userId: ME.toString(), s3Key: 'contracts/string-owner.pdf' });
    expect(await keyBelongsToUser(ME.toString(), 'contracts/string-owner.pdf')).toBe(true);
  });
});

describe('🔴 fremde Schluessel — alle abgewiesen', () => {
  test('fremder Vertrags-Schluessel → false', async () => {
    store.contracts.push({ userId: FREMD, s3Key: 'contracts/fremd.pdf' });
    expect(await keyBelongsToUser(ME.toString(), 'contracts/fremd.pdf')).toBe(false);
  });
  test('🔴 fremder ENVELOPE-Schluessel → false (Bedingung 2 des Pruefers)', async () => {
    store.envelopes.push({ ownerId: FREMD, s3KeySealed: 'envelopes/fremd-sig.pdf' });
    expect(await keyBelongsToUser(ME.toString(), 'envelopes/fremd-sig.pdf')).toBe(false);
  });
  test('fremder Org-Vertrag ohne eigene Mitgliedschaft → false', async () => {
    store.contracts.push({ userId: FREMD, organizationId: ORG, s3Key: 'contracts/fremd-org.pdf' });
    expect(await keyBelongsToUser(ME.toString(), 'contracts/fremd-org.pdf')).toBe(false);
  });
  test('unbekannter Schluessel → false', async () => {
    expect(await keyBelongsToUser(ME.toString(), 'contracts/gibtsnicht.pdf')).toBe(false);
  });
  test('leerer/ungueltiger Input → false', async () => {
    expect(await keyBelongsToUser(ME.toString(), '')).toBe(false);
    expect(await keyBelongsToUser(ME.toString(), null)).toBe(false);
    expect(await keyBelongsToUser(null, 'x')).toBe(false);
  });
});

describe('Feld-Abdeckung deckt sich mit dem Aussperr-Beweis', () => {
  const { VERTRAG_KEY_FELDER, ENVELOPE_KEY_FELDER } = require('../../utils/s3KeyOwnership');
  test('alle im Plan genannten Quellfelder sind abgedeckt', () => {
    for (const f of ['s3Key', 'optimizedPdfS3Key', 'sealedS3Key', 's3KeySealed', 'pdfS3Key']) {
      expect(VERTRAG_KEY_FELDER).toContain(f);
    }
    for (const f of ['s3Key', 's3KeySealed']) {
      expect(ENVELOPE_KEY_FELDER).toContain(f);
    }
  });
});
