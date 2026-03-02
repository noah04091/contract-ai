// 📁 backend/middleware/verifyOrgAccess.js
// Team-Management: Middleware für Organization-Zugriffskontrolle

const { ObjectId } = require('mongodb');
const database = require('../config/database');
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

    // Hol Contract aus DB (shared pool)
    const db = await database.connect();
    const contract = await db.collection('contracts').findOne({
      _id: new ObjectId(contractId)
    });

    if (!contract) {
      return res.status(404).json({
        success: false,
        message: 'Contract nicht gefunden'
      });
    }

    // Check 1: User owns contract
    if (contract.userId && contract.userId.toString() === userId) {
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
        req.orgMembership = member; // Für spätere Permissions-Checks
        return next();
      }
    }

    // Kein Zugriff
    return res.status(403).json({
      success: false,
      message: 'Kein Zugriff auf diesen Vertrag'
    });

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
