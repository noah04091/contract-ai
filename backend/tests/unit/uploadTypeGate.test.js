// 📁 backend/tests/unit/uploadTypeGate.test.js
// QA-Punkt 5 (BUG-005/024): Magic-Byte-Gate im Upload — nur analysierbare Formate
// dürfen einen Vertrags-Datensatz erzeugen.

const fs = require('fs');
const path = require('path');
const { detectSupportedUploadType, SUPPORTED_UPLOAD_LABEL } = require('../../utils/uploadTypeGate');

const buf = (...teile) => Buffer.concat(teile.map(t => Buffer.isBuffer(t) ? t : Buffer.from(t)));

describe('detectSupportedUploadType — akzeptierte Formate', () => {
  test('PDF (%PDF)', () => {
    expect(detectSupportedUploadType(buf('%PDF-1.7 rest'))).toBe('application/pdf');
  });
  test('DOCX (PK + beide Word-Marker)', () => {
    const docx = buf(Buffer.from([0x50, 0x4B, 0x03, 0x04]), 'x'.repeat(50), '[Content_Types].xml', 'word/document.xml');
    expect(detectSupportedUploadType(docx)).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  });
  test('JPEG (FFD8FF)', () => {
    expect(detectSupportedUploadType(buf(Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]), 'rest'))).toBe('image/jpeg');
  });
  test('PNG (89504E47)', () => {
    expect(detectSupportedUploadType(buf(Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A])))).toBe('image/png');
  });
  test('HEIC (ftypheic an Offset 4)', () => {
    expect(detectSupportedUploadType(buf(Buffer.from([0, 0, 0, 24]), 'ftypheic', 'rest'))).toBe('image/heic');
  });
  test('HEIF (ftypmif1)', () => {
    expect(detectSupportedUploadType(buf(Buffer.from([0, 0, 0, 24]), 'ftypmif1', 'rest'))).toBe('image/heic');
  });
  test('WEBP (RIFF….WEBP)', () => {
    expect(detectSupportedUploadType(buf('RIFF', Buffer.from([1, 2, 3, 4]), 'WEBPVP8 '))).toBe('image/webp');
  });
  test('TIFF little + big endian', () => {
    expect(detectSupportedUploadType(buf(Buffer.from([0x49, 0x49, 0x2A, 0x00]), 'rest'))).toBe('image/tiff');
    expect(detectSupportedUploadType(buf(Buffer.from([0x4D, 0x4D, 0x00, 0x2A]), 'rest'))).toBe('image/tiff');
  });
});

describe('detectSupportedUploadType — abgelehnte Inhalte', () => {
  test('Klartext (.txt, der QA-Repro-Fall) → null', () => {
    expect(detectSupportedUploadType(Buffer.from('Dies ist ein QA-Testinhalt ohne Vertragsformat.'))).toBeNull();
  });
  test('MP4-Video (ftypisom) → null', () => {
    expect(detectSupportedUploadType(buf(Buffer.from([0, 0, 0, 24]), 'ftypisom', 'rest'))).toBeNull();
  });
  test('ZIP ohne Word-Marker → null', () => {
    expect(detectSupportedUploadType(buf(Buffer.from([0x50, 0x4B, 0x03, 0x04]), 'nur ein Archiv'))).toBeNull();
  });
  test('leer / zu kurz / kaputt → null, wirft nie', () => {
    expect(detectSupportedUploadType(Buffer.alloc(0))).toBeNull();
    expect(detectSupportedUploadType(Buffer.from([0x00, 0x01]))).toBeNull();
    expect(detectSupportedUploadType(null)).toBeNull();
    expect(detectSupportedUploadType(undefined)).toBeNull();
  });
  test('Zufalls-Binärdaten → null', () => {
    expect(detectSupportedUploadType(Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0A, 0x0B, 0x0C]))).toBeNull();
  });
});

describe('Source-Scan: Route nutzt das Gate vor dem Anlegen', () => {
  const src = fs.readFileSync(path.join(__dirname, '../../routes/upload.js'), 'utf8');

  test('upload.js importiert und ruft detectSupportedUploadType', () => {
    expect(src).toMatch(/require\("\.\.\/utils\/uploadTypeGate"\)/);
    expect(src).toContain('detectSupportedUploadType(');
  });

  test('Gate steht VOR insertOne', () => {
    expect(src.indexOf('detectSupportedUploadType(')).toBeGreaterThan(-1);
    expect(src.indexOf('detectSupportedUploadType(')).toBeLessThan(src.indexOf('contractsCollection.insertOne'));
  });

  test('Fehlermeldung nennt die erlaubten Formate', () => {
    expect(src).toContain('UNSUPPORTED_FILE_TYPE');
    expect(SUPPORTED_UPLOAD_LABEL).toContain('PDF');
  });
});
