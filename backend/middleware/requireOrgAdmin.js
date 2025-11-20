// 📁 backend/middleware/requireOrgAdmin.js
// Team-Management: Middleware für Admin-Rechte

const { ObjectId } = require('mongodb');
const OrganizationMember = require('../models/OrganizationMember');

/**
 * Middleware: Prüft ob User Admin in der Organisation ist
 * Voraussetzung: req.params.id ist die organizationId
 */
async function requireOrgAdmin(req, res, next) {
  try {
    const userId = req.user?.userId;
    const orgId = req.params.id || req.params.organizationId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentifizierung erforderlich'
      });
    }

    if (!orgId) {
      return res.status(400).json({
        success: false,
        message: 'Organisation-ID fehlt'
      });
    }

    // Check: User ist Admin der Org
    const membership = await OrganizationMember.findOne({
      organizationId: new ObjectId(orgId),
      userId: new ObjectId(userId),
      isActive: true
    });

    if (!membership) {
      return res.status(403).json({
        success: false,
        message: 'Du bist kein Mitglied dieser Organisation'
      });
    }

    if (membership.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Diese Aktion erfordert Admin-Rechte'
      });
    }

    // User ist Admin → Zugriff erlaubt
    req.orgMembership = membership;
    next();

  } catch (error) {
    console.error('❌ [REQUIRE-ORG-ADMIN] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Fehler bei Rechteprüfung',
      details: error.message
    });
  }
}

module.exports = requireOrgAdmin;
