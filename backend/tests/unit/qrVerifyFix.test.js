// 📁 backend/tests/unit/qrVerifyFix.test.js
// 🔧 QR-Verifikations-Fix (12.09.2026) — Zusicherungen per Source-Scan:
// Der Verifikations-QR in generierten PDFs trug eine zufällige, nirgends
// gespeicherte documentId als JSON-Payload → Scan zeigte Rohtext und
// /verify/:id (erwartet Mongo-ObjectId, seit Phase 0 zusätzlich isGenerated)
// fand nie etwas. Jetzt trägt der QR die pure Verify-URL mit der echten _id.

const fs = require('fs');
const path = require('path');
const src = fs.readFileSync(path.join(__dirname, '../../routes/generate.js'), 'utf8');

describe('QR-Inhalt', () => {
  test('mit echter Mongo-_id wird die pure Verify-URL kodiert (kein JSON-Payload)', () => {
    expect(src).toContain('if (contractData.mongoContractId)');
    expect(src).toContain('`https://contract-ai.de/verify/${contractData.mongoContractId}`');
  });

  test('formatContractToHTML nimmt die _id als Parameter und reicht sie in die QR-Daten', () => {
    expect(src).toMatch(/formatContractToHTML = async \([^)]*mongoContractId = null\)/);
    expect(src).toMatch(/mongoContractId:\s*mongoContractId/);
  });
});

describe('Neuerzeugung: _id existiert VOR dem HTML', () => {
  test('beide Erzeugungs-Zweige legen die Ziel-_id vor formatContractToHTML fest', () => {
    expect(src).toContain('const zielVertragsIdV2 = existingContractId ? new ObjectId(existingContractId) : new ObjectId()');
    expect(src).toContain('const zielVertragsIdV1 = existingContractId ? new ObjectId(existingContractId) : new ObjectId()');
  });

  test('die Insert-Objekte tragen exakt diese _id (QR und DB bleiben deckungsgleich)', () => {
    expect(src).toContain('_id: zielVertragsIdV2');
    expect(src).toContain('_id: zielVertragsIdV1');
  });
});

describe('Bestandsverträge', () => {
  test('alle 5 Bestands-Renderpfade reichen contract._id durch (pdf, preview, change-design, toggle-draft, batch-export)', () => {
    const treffer = src.match(/contract\._id\.toString\(\)/g) || [];
    expect(treffer.length).toBeGreaterThanOrEqual(5);
  });

  test('POST /pdf verwirft gecachtes HTML ohne gültigen Verify-QR genau einmal (repariert Altbestand beim nächsten Download)', () => {
    expect(src).toContain('!htmlContent.includes(`/verify/${contract._id}`)');
  });
});
