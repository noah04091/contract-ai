// 📁 backend/middleware/verifyOrgAccess.js
// Team-Management: Middleware für Organization-Zugriffskontrolle

const { ObjectId } = require('mongodb');
const OrganizationMember = require('../models/OrganizationMember');

/**
 * Middleware: Prüft ob User Zugriff auf Contract hat
 * - Eigener Contract (userId matches)
 * - Org-Contract (User ist Member der Org)
 */
async function verifyOrgAccess(req, res, next) {
  try {
    const userId = req.user?.userId;
    const contractId = req.params.id || req.params.contractId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentifizierung erforderlich'
      });
    }

    if (!contractId) {
      // Kein contractId in Route → Skip Check
      return next();
    }

    // Hol Contract aus DB
    const { MongoClient } = require('mongodb');
    const client = new MongoClient(process.env.MONGO_URI);

    try {
      await client.connect();
      const db = client.db('contract_ai');
      const contract = await db.collection('contracts').findOne({
        _id: new ObjectId(contractId)
      });

      if (!contract) {
        await client.close();
        return res.status(404).json({
          success: false,
          message: 'Contract nicht gefunden'
        });
      }

      // Check 1: User owns contract
      if (contract.userId && contract.userId.toString() === userId) {
        await client.close();
        return next();
      }

      // Check 2: Contract gehört zu Org && User ist Member
      if (contract.organizationId) {
        const member = await OrganizationMember.findOne({
          organizationId: contract.organizationId,
          userId: new ObjectId(userId),
          isActive: true
        });

        if (member) {
          // User ist Member der Org → Zugriff erlaubt
          await client.close();
          req.orgMembership = member; // Für spätere Permissions-Checks
          return next();
        }
      }

      // Kein Zugriff
      await client.close();
      return res.status(403).json({
        success: false,
        message: 'Kein Zugriff auf diesen Vertrag'
      });

    } finally {
      await client.close();
    }

  } catch (error) {
    console.error('❌ [VERIFY-ORG-ACCESS] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Fehler bei Zugriffsprüfung',
      details: error.message
    });
  }
}

module.exports = verifyOrgAccess;
