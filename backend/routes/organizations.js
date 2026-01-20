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
const { generateEmailTemplate } = require('../utils/emailTemplate');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { isEnterpriseOrHigher } = require('../constants/subscriptionPlans'); // 📊 Zentrale Plan-Definitionen

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
    if (!isEnterpriseOrHigher(plan)) {
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

    // 👥 NEU: Alle bestehenden Verträge des Owners der Organisation zuweisen
    const contractsCollection = req.db.collection('contracts');
    const updateResult = await contractsCollection.updateMany(
      { userId: new ObjectId(userId), organizationId: null },
      { $set: { organizationId: organization._id } }
    );
    console.log(`📝 [ORGANIZATIONS] ${updateResult.modifiedCount} Verträge der Organisation zugewiesen`);

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
 * POST /api/organizations/:id/sync-contracts
 * Weist alle Verträge des Owners der Organisation zu (Admin-only)
 */
router.post('/:id/sync-contracts', verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id: orgId } = req.params;

    // Check: User ist Admin der Org
    const membership = await OrganizationMember.findOne({
      organizationId: new ObjectId(orgId),
      userId: new ObjectId(userId),
      isActive: true
    });

    if (!membership || membership.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Nur Admins können Verträge synchronisieren'
      });
    }

    // Hole alle Org-Member-IDs
    const members = await OrganizationMember.find({
      organizationId: new ObjectId(orgId),
      isActive: true
    });

    const memberUserIds = members.map(m => m.userId);

    // Update alle Verträge der Member ohne Org-ID
    const contractsCollection = req.db.collection('contracts');
    const updateResult = await contractsCollection.updateMany(
      {
        userId: { $in: memberUserIds },
        $or: [
          { organizationId: null },
          { organizationId: { $exists: false } }
        ]
      },
      { $set: { organizationId: new ObjectId(orgId) } }
    );

    console.log(`📝 [ORGANIZATIONS] Sync: ${updateResult.modifiedCount} Verträge der Organisation ${orgId} zugewiesen`);

    res.json({
      success: true,
      message: `${updateResult.modifiedCount} Verträge wurden der Organisation zugewiesen`,
      syncedCount: updateResult.modifiedCount
    });

  } catch (error) {
    console.error('❌ [ORGANIZATIONS] Sync Contracts Error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Synchronisieren der Verträge',
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

    const roleDisplay = role === 'admin' ? 'Administrator' : role === 'member' ? 'Mitglied' : 'Betrachter';

    const emailHtml = generateEmailTemplate({
      title: "Team-Einladung",
      preheader: `Sie wurden zum Team von ${organization.name} eingeladen`,
      body: `
        <div style="background-color: #f0f9ff; border-radius: 12px; padding: 20px; margin-bottom: 25px; text-align: center;">
          <span style="font-size: 48px;">🎉</span>
          <p style="color: #0369a1; font-size: 18px; font-weight: 600; margin: 10px 0 0 0;">Sie wurden eingeladen!</p>
        </div>

        <p style="text-align: center; margin-bottom: 25px;">
          Sie wurden eingeladen, dem Team von <strong>${organization.name}</strong> auf Contract AI beizutreten.
        </p>

        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f8f9fa; border-radius: 12px; margin-bottom: 25px;">
          <tr><td style="padding: 20px; text-align: center;">
            <p style="margin: 0 0 8px 0; font-size: 14px; color: #555;"><strong>Organisation:</strong> ${organization.name}</p>
            <p style="margin: 0; font-size: 14px; color: #555;"><strong>Ihre Rolle:</strong> ${roleDisplay}</p>
          </td></tr>
        </table>

        <p style="font-size: 13px; color: #888; text-align: center;">
          Diese Einladung ist 7 Tage gültig.
        </p>
      `,
      cta: { text: "Einladung annehmen", url: inviteLink }
    });

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
 * GET /api/organizations/validate-invite/:token
 * Validiert Einladungs-Token (OHNE Auth - öffentlich)
 */
router.get('/validate-invite/:token', async (req, res) => {
  try {
    const { token } = req.params;

    // Finde Invitation
    const invitation = await OrganizationInvitation.findOne({ token });

    if (!invitation) {
      return res.status(404).json({
        success: false,
        message: 'Einladung nicht gefunden',
        code: 'INVITE_NOT_FOUND'
      });
    }

    // Check: Expired?
    if (invitation.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Einladung wurde bereits verwendet',
        code: 'INVITE_USED'
      });
    }

    if (invitation.expiresAt < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Einladung ist abgelaufen',
        code: 'INVITE_EXPIRED'
      });
    }

    // Hol Org-Infos
    const organization = await Organization.findById(invitation.organizationId);

    if (!organization) {
      return res.status(404).json({
        success: false,
        message: 'Organisation nicht gefunden',
        code: 'ORG_NOT_FOUND'
      });
    }

    // Check: Existiert bereits ein User mit dieser Email?
    const existingUser = await req.usersCollection.findOne({
      email: invitation.email.toLowerCase()
    });

    res.json({
      success: true,
      invitation: {
        email: invitation.email,
        role: invitation.role,
        expiresAt: invitation.expiresAt
      },
      organization: {
        id: organization._id.toString(),
        name: organization.name
      },
      userExists: !!existingUser
    });

  } catch (error) {
    console.error('❌ [ORGANIZATIONS] Validate Invite Error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Validieren der Einladung',
      details: error.message
    });
  }
});

/**
 * POST /api/organizations/register-with-invite/:token
 * Registriert neuen User UND nimmt Einladung an (OHNE Auth)
 */
router.post('/register-with-invite/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const { firstName, lastName, password } = req.body;

    // Validierung
    if (!firstName || !lastName || !password) {
      return res.status(400).json({
        success: false,
        message: 'Vorname, Nachname und Passwort sind erforderlich'
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Passwort muss mindestens 8 Zeichen haben'
      });
    }

    // Finde Invitation
    const invitation = await OrganizationInvitation.findOne({ token });

    if (!invitation) {
      return res.status(404).json({
        success: false,
        message: 'Einladung nicht gefunden'
      });
    }

    // Check: Valid?
    if (invitation.status !== 'pending' || invitation.expiresAt < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Einladung ist abgelaufen oder wurde bereits verwendet'
      });
    }

    // Check: User existiert bereits?
    const existingUser = await req.usersCollection.findOne({
      email: invitation.email.toLowerCase()
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Ein Account mit dieser E-Mail existiert bereits. Bitte einloggen.',
        code: 'USER_EXISTS'
      });
    }

    // Hash Passwort
    const hashedPassword = await bcrypt.hash(password, 10);

    // Erstelle User
    const newUser = {
      email: invitation.email.toLowerCase(),
      password: hashedPassword,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      isVerified: true, // Team-Invite = automatisch verifiziert
      subscriptionPlan: 'free', // Wird durch Team-Membership überschrieben
      subscriptionStatus: 'team_member',
      createdAt: new Date(),
      updatedAt: new Date(),
      analysisCount: 0,
      analysisLimit: 3,
      optimizationCount: 0,
      optimizationLimit: 1,
      compareCount: 0,
      compareLimit: 1,
      chatMessageCount: 0,
      chatMessageLimit: 5,
      generatorCount: 0,
      generatorLimit: 1,
      legalPulseCount: 0,
      legalPulseLimit: 1
    };

    const userResult = await req.usersCollection.insertOne(newUser);
    const userId = userResult.insertedId;

    // Erstelle Member-Record
    const member = new OrganizationMember({
      organizationId: invitation.organizationId,
      userId: userId,
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

    // Erstelle JWT Token für Auto-Login
    const jwtToken = jwt.sign(
      { userId: userId.toString(), email: newUser.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log(`✅ [ORGANIZATIONS] New user ${newUser.email} registered & joined Org ${organization.name}`);

    res.status(201).json({
      success: true,
      message: `Willkommen im Team von ${organization.name}!`,
      token: jwtToken,
      user: {
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName
      },
      organization: {
        id: organization._id.toString(),
        name: organization.name,
        role: member.role
      }
    });

  } catch (error) {
    console.error('❌ [ORGANIZATIONS] Register With Invite Error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler bei der Registrierung',
      details: error.message
    });
  }
});

/**
 * POST /api/organizations/accept-invite/:token
 * Nimmt Einladung an (für bereits eingeloggte User)
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
 * GET /api/organizations/:id/invitations
 * Listet alle ausstehenden Einladungen
 */
router.get('/:id/invitations', verifyToken, async (req, res) => {
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

    // Hol alle pending Einladungen
    const invitations = await OrganizationInvitation.find({
      organizationId: new ObjectId(orgId),
      status: 'pending'
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      invitations: invitations.map(inv => ({
        id: inv._id.toString(),
        email: inv.email,
        role: inv.role,
        createdAt: inv.createdAt,
        expiresAt: inv.expiresAt
      }))
    });

  } catch (error) {
    console.error('❌ [ORGANIZATIONS] List Invitations Error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden der Einladungen',
      details: error.message
    });
  }
});

/**
 * DELETE /api/organizations/:id/invitations/:inviteId
 * Löscht/Storniert eine ausstehende Einladung
 */
router.delete('/:id/invitations/:inviteId', verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id: orgId, inviteId } = req.params;

    // Check: User ist Admin der Org
    const membership = await OrganizationMember.findOne({
      organizationId: new ObjectId(orgId),
      userId: new ObjectId(userId),
      isActive: true
    });

    if (!membership || membership.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Nur Admins können Einladungen stornieren'
      });
    }

    // Finde und lösche Einladung
    const invitation = await OrganizationInvitation.findOneAndDelete({
      _id: new ObjectId(inviteId),
      organizationId: new ObjectId(orgId),
      status: 'pending'
    });

    if (!invitation) {
      return res.status(404).json({
        success: false,
        message: 'Einladung nicht gefunden oder bereits verwendet'
      });
    }

    console.log(`✅ [ORGANIZATIONS] Invitation cancelled: ${invitation.email}`);

    res.json({
      success: true,
      message: 'Einladung erfolgreich storniert'
    });

  } catch (error) {
    console.error('❌ [ORGANIZATIONS] Cancel Invitation Error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Stornieren der Einladung',
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
