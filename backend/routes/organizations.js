// 📁 backend/routes/organizations.js
// Team-Management: Organizations API Routes

const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');
const Organization = require('../models/Organization');
const OrganizationMember = require('../models/OrganizationMember');
const OrganizationInvitation = require('../models/OrganizationInvitation');
const verifyToken = require('../middleware/verifyToken');
const nodemailer = require('nodemailer');

// Email Transporter (reuse existing from auth)
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

/**
 * POST /api/organizations
 * Erstellt neue Organisation (nur Enterprise-User)
 */
router.post('/', verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { name, companyLogo } = req.body;

    // Validierung
    if (!name || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Organisationsname erforderlich'
      });
    }

    // Enterprise-Check
    const user = await req.usersCollection.findOne({ _id: new ObjectId(userId) });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User nicht gefunden' });
    }

    const plan = user.subscriptionPlan || 'free';
    if (plan !== 'premium') {
      return res.status(403).json({
        success: false,
        message: '⛔ Team-Management ist nur im Enterprise-Plan verfügbar.',
        requiresUpgrade: true,
        feature: 'team_management',
        upgradeUrl: '/pricing'
      });
    }

    // Check: User hat noch keine Org
    const existingMember = await OrganizationMember.findOne({ userId: new ObjectId(userId) });
    if (existingMember) {
      return res.status(400).json({
        success: false,
        message: 'Du bist bereits Mitglied einer Organisation'
      });
    }

    // Organisation erstellen
    const organization = new Organization({
      name: name.trim(),
      ownerId: new ObjectId(userId),
      subscriptionPlan: plan,
      companyLogo: companyLogo || null,
      maxMembers: 10
    });

    await organization.save();

    // Owner als Admin-Member hinzufügen
    const ownerMember = new OrganizationMember({
      organizationId: organization._id,
      userId: new ObjectId(userId),
      role: 'admin',
      invitedBy: new ObjectId(userId), // Self-invited
      permissions: ['contracts.read', 'contracts.write', 'contracts.delete', 'team.manage']
    });

    await ownerMember.save();

    console.log(`✅ [ORGANIZATIONS] Org created: ${organization.name} by User ${userId}`);

    res.status(201).json({
      success: true,
      message: 'Organisation erfolgreich erstellt',
      organization: {
        id: organization._id.toString(),
        name: organization.name,
        ownerId: organization.ownerId.toString(),
        memberCount: 1,
        maxMembers: organization.maxMembers,
        createdAt: organization.createdAt
      }
    });

  } catch (error) {
    console.error('❌ [ORGANIZATIONS] Create Error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Erstellen der Organisation',
      details: error.message
    });
  }
});

/**
 * GET /api/organizations/my-organization
 * Holt die Organisation des aktuellen Users
 */
router.get('/my-organization', verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    // Finde Member-Record
    const memberRecord = await OrganizationMember.findOne({
      userId: new ObjectId(userId),
      isActive: true
    });

    if (!memberRecord) {
      return res.json({
        success: true,
        organization: null,
        membership: null
      });
    }

    // Finde Organisation
    const organization = await Organization.findById(memberRecord.organizationId);

    if (!organization) {
      return res.status(404).json({
        success: false,
        message: 'Organisation nicht gefunden'
      });
    }

    // Zähle Members
    const memberCount = await OrganizationMember.countDocuments({
      organizationId: organization._id,
      isActive: true
    });

    res.json({
      success: true,
      organization: {
        id: organization._id.toString(),
        name: organization.name,
        ownerId: organization.ownerId.toString(),
        companyLogo: organization.companyLogo,
        memberCount,
        maxMembers: organization.maxMembers,
        createdAt: organization.createdAt
      },
      membership: {
        role: memberRecord.role,
        permissions: memberRecord.permissions,
        joinedAt: memberRecord.joinedAt,
        isOwner: organization.ownerId.toString() === userId
      }
    });

  } catch (error) {
    console.error('❌ [ORGANIZATIONS] Get My Org Error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Organisation',
      details: error.message
    });
  }
});

/**
 * POST /api/organizations/:id/invite
 * Lädt Member zur Organisation ein
 */
router.post('/:id/invite', verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id: orgId } = req.params;
    const { email, role = 'member' } = req.body;

    // Validierung
    if (!email || !email.includes('@')) {
      return res.status(400).json({
        success: false,
        message: 'Gültige E-Mail-Adresse erforderlich'
      });
    }

    if (!['admin', 'member', 'viewer'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Ungültige Rolle'
      });
    }

    // Check: User ist Admin der Org
    const membership = await OrganizationMember.findOne({
      organizationId: new ObjectId(orgId),
      userId: new ObjectId(userId),
      isActive: true
    });

    if (!membership || membership.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Nur Admins können Mitglieder einladen'
      });
    }

    // Check: Member-Limit
    const organization = await Organization.findById(orgId);
    const currentMemberCount = await OrganizationMember.countDocuments({
      organizationId: new ObjectId(orgId),
      isActive: true
    });

    if (currentMemberCount >= organization.maxMembers) {
      return res.status(400).json({
        success: false,
        message: `Maximale Anzahl an Mitgliedern erreicht (${organization.maxMembers}/${organization.maxMembers})`
      });
    }

    // Check: Email bereits Member?
    const user = await req.usersCollection.findOne({ email: email.toLowerCase() });
    if (user) {
      const existingMember = await OrganizationMember.findOne({
        organizationId: new ObjectId(orgId),
        userId: user._id
      });

      if (existingMember) {
        return res.status(400).json({
          success: false,
          message: 'Dieser User ist bereits Mitglied der Organisation'
        });
      }
    }

    // Check: Pending Invite?
    const pendingInvite = await OrganizationInvitation.findOne({
      organizationId: new ObjectId(orgId),
      email: email.toLowerCase(),
      status: 'pending'
    });

    if (pendingInvite) {
      return res.status(400).json({
        success: false,
        message: 'Eine Einladung für diese E-Mail ist bereits ausstehend'
      });
    }

    // Erstelle Invitation
    const invitation = new OrganizationInvitation({
      organizationId: new ObjectId(orgId),
      email: email.toLowerCase(),
      role,
      invitedBy: new ObjectId(userId)
    });

    await invitation.save();

    // Sende Einladungs-Email
    const inviteLink = `${process.env.FRONTEND_URL || 'https://www.contract-ai.de'}/accept-invite/${invitation.token}`;

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>🎉 Einladung zu ${organization.name}</h2>
        <p>Du wurdest eingeladen, dem Team von <strong>${organization.name}</strong> auf Contract AI beizutreten!</p>

        <p><strong>Deine Rolle:</strong> ${role === 'admin' ? 'Administrator' : role === 'member' ? 'Mitglied' : 'Betrachter'}</p>

        <div style="margin: 30px 0;">
          <a href="${inviteLink}" style="background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Einladung annehmen
          </a>
        </div>

        <p style="color: #666; font-size: 13px;">
          Oder kopiere diesen Link in deinen Browser:<br/>
          <code>${inviteLink}</code>
        </p>

        <p style="color: #666; font-size: 13px;">
          Diese Einladung ist 7 Tage gültig.
        </p>
      </div>
    `;

    await transporter.sendMail({
      from: `"Contract AI" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `Einladung zum Team von ${organization.name}`,
      html: emailHtml
    });

    console.log(`✅ [ORGANIZATIONS] Invite sent: ${email} to Org ${orgId} as ${role}`);

    res.json({
      success: true,
      message: 'Einladung erfolgreich versendet',
      invitation: {
        id: invitation._id.toString(),
        email: invitation.email,
        role: invitation.role,
        expiresAt: invitation.expiresAt
      }
    });

  } catch (error) {
    console.error('❌ [ORGANIZATIONS] Invite Error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Versenden der Einladung',
      details: error.message
    });
  }
});

/**
 * POST /api/organizations/accept-invite/:token
 * Nimmt Einladung an
 */
router.post('/accept-invite/:token', verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { token } = req.params;

    // Finde Invitation
    const invitation = await OrganizationInvitation.findOne({ token });

    if (!invitation) {
      return res.status(404).json({
        success: false,
        message: 'Einladung nicht gefunden'
      });
    }

    // Check: Expired?
    if (invitation.status !== 'pending' || invitation.expiresAt < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Einladung ist abgelaufen oder wurde bereits verwendet'
      });
    }

    // Check: Email matches?
    const user = await req.usersCollection.findOne({ _id: new ObjectId(userId) });
    if (user.email.toLowerCase() !== invitation.email.toLowerCase()) {
      return res.status(403).json({
        success: false,
        message: 'Diese Einladung ist nicht für dich bestimmt'
      });
    }

    // Check: User bereits in Org?
    const existingMember = await OrganizationMember.findOne({
      organizationId: invitation.organizationId,
      userId: new ObjectId(userId)
    });

    if (existingMember) {
      return res.status(400).json({
        success: false,
        message: 'Du bist bereits Mitglied dieser Organisation'
      });
    }

    // Erstelle Member-Record
    const member = new OrganizationMember({
      organizationId: invitation.organizationId,
      userId: new ObjectId(userId),
      role: invitation.role,
      invitedBy: invitation.invitedBy,
      permissions: invitation.role === 'admin'
        ? ['contracts.read', 'contracts.write', 'contracts.delete', 'team.manage']
        : invitation.role === 'member'
        ? ['contracts.read', 'contracts.write']
        : ['contracts.read']
    });

    await member.save();

    // Update Invitation
    invitation.status = 'accepted';
    invitation.acceptedAt = new Date();
    await invitation.save();

    // Hol Org-Infos
    const organization = await Organization.findById(invitation.organizationId);

    console.log(`✅ [ORGANIZATIONS] User ${userId} joined Org ${organization._id}`);

    res.json({
      success: true,
      message: `Willkommen im Team von ${organization.name}!`,
      organization: {
        id: organization._id.toString(),
        name: organization.name,
        role: member.role
      }
    });

  } catch (error) {
    console.error('❌ [ORGANIZATIONS] Accept Invite Error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Annehmen der Einladung',
      details: error.message
    });
  }
});

/**
 * GET /api/organizations/:id/members
 * Listet alle Members der Organisation
 */
router.get('/:id/members', verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id: orgId } = req.params;

    // Check: User ist Member der Org
    const membership = await OrganizationMember.findOne({
      organizationId: new ObjectId(orgId),
      userId: new ObjectId(userId),
      isActive: true
    });

    if (!membership) {
      return res.status(403).json({
        success: false,
        message: 'Kein Zugriff auf diese Organisation'
      });
    }

    // Hol alle Members
    const members = await OrganizationMember.find({
      organizationId: new ObjectId(orgId),
      isActive: true
    }).sort({ joinedAt: 1 });

    // Hol User-Details
    const userIds = members.map(m => m.userId);
    const users = await req.usersCollection.find({
      _id: { $in: userIds }
    }).toArray();

    const userMap = {};
    users.forEach(u => {
      userMap[u._id.toString()] = u;
    });

    // Kombiniere
    const membersWithDetails = members.map(m => {
      const user = userMap[m.userId.toString()];
      return {
        id: m._id.toString(),
        userId: m.userId.toString(),
        email: user?.email || 'unknown',
        firstName: user?.firstName || '',
        lastName: user?.lastName || '',
        role: m.role,
        permissions: m.permissions,
        joinedAt: m.joinedAt,
        invitedBy: m.invitedBy.toString()
      };
    });

    res.json({
      success: true,
      members: membersWithDetails,
      total: membersWithDetails.length
    });

  } catch (error) {
    console.error('❌ [ORGANIZATIONS] List Members Error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Mitglieder',
      details: error.message
    });
  }
});

/**
 * PATCH /api/organizations/:id/members/:userId/role
 * Ändert Rolle eines Members
 */
router.patch('/:id/members/:userId/role', verifyToken, async (req, res) => {
  try {
    const currentUserId = req.user.userId;
    const { id: orgId, userId: targetUserId } = req.params;
    const { role } = req.body;

    // Validierung
    if (!['admin', 'member', 'viewer'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Ungültige Rolle'
      });
    }

    // Check: Current User ist Admin
    const currentMembership = await OrganizationMember.findOne({
      organizationId: new ObjectId(orgId),
      userId: new ObjectId(currentUserId),
      isActive: true
    });

    if (!currentMembership || currentMembership.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Nur Admins können Rollen ändern'
      });
    }

    // Check: Owner kann nicht geändert werden
    const organization = await Organization.findById(orgId);
    if (organization.ownerId.toString() === targetUserId) {
      return res.status(400).json({
        success: false,
        message: 'Die Rolle des Owners kann nicht geändert werden'
      });
    }

    // Update Member
    const member = await OrganizationMember.findOneAndUpdate(
      {
        organizationId: new ObjectId(orgId),
        userId: new ObjectId(targetUserId)
      },
      {
        $set: {
          role,
          permissions: role === 'admin'
            ? ['contracts.read', 'contracts.write', 'contracts.delete', 'team.manage']
            : role === 'member'
            ? ['contracts.read', 'contracts.write']
            : ['contracts.read']
        }
      },
      { new: true }
    );

    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Mitglied nicht gefunden'
      });
    }

    console.log(`✅ [ORGANIZATIONS] Role updated: User ${targetUserId} → ${role}`);

    res.json({
      success: true,
      message: 'Rolle erfolgreich geändert',
      member: {
        id: member._id.toString(),
        userId: member.userId.toString(),
        role: member.role,
        permissions: member.permissions
      }
    });

  } catch (error) {
    console.error('❌ [ORGANIZATIONS] Update Role Error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Ändern der Rolle',
      details: error.message
    });
  }
});

/**
 * DELETE /api/organizations/:id/members/:userId
 * Entfernt Member aus Organisation
 */
router.delete('/:id/members/:userId', verifyToken, async (req, res) => {
  try {
    const currentUserId = req.user.userId;
    const { id: orgId, userId: targetUserId } = req.params;

    // Check: Current User ist Admin ODER entfernt sich selbst
    const currentMembership = await OrganizationMember.findOne({
      organizationId: new ObjectId(orgId),
      userId: new ObjectId(currentUserId),
      isActive: true
    });

    const isSelf = currentUserId === targetUserId;
    const isAdmin = currentMembership && currentMembership.role === 'admin';

    if (!isSelf && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Nur Admins können andere Mitglieder entfernen'
      });
    }

    // Check: Owner kann nicht entfernt werden
    const organization = await Organization.findById(orgId);
    if (organization.ownerId.toString() === targetUserId) {
      return res.status(400).json({
        success: false,
        message: 'Der Owner kann nicht entfernt werden. Organisation muss gelöscht werden.'
      });
    }

    // Deaktiviere Member
    await OrganizationMember.findOneAndUpdate(
      {
        organizationId: new ObjectId(orgId),
        userId: new ObjectId(targetUserId)
      },
      {
        $set: { isActive: false }
      }
    );

    console.log(`✅ [ORGANIZATIONS] Member removed: User ${targetUserId} from Org ${orgId}`);

    res.json({
      success: true,
      message: isSelf ? 'Du hast die Organisation verlassen' : 'Mitglied erfolgreich entfernt'
    });

  } catch (error) {
    console.error('❌ [ORGANIZATIONS] Remove Member Error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Entfernen des Mitglieds',
      details: error.message
    });
  }
});

/**
 * DELETE /api/organizations/:id
 * Löscht Organisation (nur Owner)
 */
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id: orgId } = req.params;

    // Hol Organisation
    const organization = await Organization.findById(orgId);

    if (!organization) {
      return res.status(404).json({
        success: false,
        message: 'Organisation nicht gefunden'
      });
    }

    // Check: Nur Owner kann löschen
    if (organization.ownerId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Nur der Owner kann die Organisation löschen'
      });
    }

    // Lösche alle Members
    await OrganizationMember.deleteMany({ organizationId: new ObjectId(orgId) });

    // Lösche alle Invitations
    await OrganizationInvitation.deleteMany({ organizationId: new ObjectId(orgId) });

    // Lösche Organisation
    await Organization.findByIdAndDelete(orgId);

    // TODO: Contracts können optional behalten oder gelöscht werden
    // Hier: Contracts werden auf personal zurückgesetzt (organizationId = null)

    console.log(`✅ [ORGANIZATIONS] Organization deleted: ${orgId}`);

    res.json({
      success: true,
      message: 'Organisation erfolgreich gelöscht'
    });

  } catch (error) {
    console.error('❌ [ORGANIZATIONS] Delete Org Error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Löschen der Organisation',
      details: error.message
    });
  }
});

module.exports = router;
