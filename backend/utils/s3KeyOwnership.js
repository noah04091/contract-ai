// backend/utils/s3KeyOwnership.js
// 🔒 24.08.2026 — Sicherheits-Durchgang Schritt 6/6.
//
// Die rohen Zweige von routes/s3Routes.js (?key=, ?file=) unterschrieben einen
// beliebigen S3-Schluessel OHNE zu pruefen, wem die Datei gehoert (authentifizierte
// IDOR). Dieser Helfer schliesst das: Er beantwortet "gehoert dieser Schluessel dem
// Nutzer (oder seiner Organisation)?" — und deckt dabei ALLE Schluessel-Felder ab,
// aus denen die 13 legitimen Aufrufer ihren Schluessel lesen (Aussperr-Beweis im Plan):
//   Vertrag:  s3Key (Original) · optimizedPdfS3Key (optimiert) ·
//             sealedS3Key / s3KeySealed (signiert, ZWEI Schreibweisen!) · pdfS3Key
//   Envelope: s3Key · s3KeySealed
//
// ⚠️ WICHTIG (Bedingung 1 des Zweitpruefers): Die Envelope-Suche ist auf den BESITZER
// (ownerId) eingegrenzt. Ohne diese Eingrenzung wuerde der Fix genau das Leck wieder
// aufreissen, das er schliessen soll.
//
// ⚠️ Gesucht wird ueber die NATIVE Collection (.collection), nicht ueber das Mongoose-
// Modell: das Contract-Schema deklariert nur `s3Key`; die uebrigen Schluessel-Felder
// stehen zwar auf den Dokumenten, wuerden von einer schema-gebundenen Query aber nicht
// zuverlaessig getroffen.

const { ObjectId } = require("mongodb");
const Contract = require("../models/Contract");
const OrganizationMember = require("../models/OrganizationMember");
const Envelope = require("../models/Envelope");

const VERTRAG_KEY_FELDER = ['s3Key', 'optimizedPdfS3Key', 'sealedS3Key', 's3KeySealed', 'pdfS3Key'];
const ENVELOPE_KEY_FELDER = ['s3Key', 's3KeySealed'];

/**
 * @returns {Promise<boolean>} true, wenn der Schluessel zu einem Vertrag/Envelope des
 * Nutzers (oder seiner aktiven Organisation) gehoert.
 */
async function keyBelongsToUser(userId, key) {
  if (!key || typeof key !== 'string' || !userId) return false;

  // Besitzer in BEIDEN gespeicherten Formen: ObjectId (Regelfall) + String (Altbestand).
  const besitzerFormen = [String(userId)];
  let userOid = null;
  try { userOid = new ObjectId(String(userId)); besitzerFormen.push(userOid); } catch (_) { /* ungueltige id */ }

  // Aktive Org-Mitgliedschaften (fuer Vertraege des Teams).
  const orgIds = [];
  try {
    if (userOid) {
      const memberships = await OrganizationMember.find({ userId: userOid, isActive: true }).lean();
      for (const m of memberships) if (m.organizationId) orgIds.push(m.organizationId);
    }
  } catch (_) { /* ohne Org weiter */ }

  // 1) Vertrag: Schluessel in IRGENDEINEM Feld UND (eigener ODER Org-Vertrag).
  const keyOr = VERTRAG_KEY_FELDER.map(f => ({ [f]: key }));
  const besitzOr = [{ userId: { $in: besitzerFormen } }];
  if (orgIds.length) besitzOr.push({ organizationId: { $in: orgIds } });

  const vertrag = await Contract.collection.findOne({ $and: [{ $or: keyOr }, { $or: besitzOr }] });
  if (vertrag) return true;

  // 2) Envelope: Schluessel UND Besitzer (ownerId) — auf den Nutzer EINGEGRENZT.
  const envKeyOr = ENVELOPE_KEY_FELDER.map(f => ({ [f]: key }));
  const envelope = await Envelope.collection.findOne({ $and: [{ $or: envKeyOr }, { ownerId: { $in: besitzerFormen } }] });
  if (envelope) return true;

  return false;
}

module.exports = { keyBelongsToUser, VERTRAG_KEY_FELDER, ENVELOPE_KEY_FELDER };
