/**
 * Shared utility for organization-based contract access.
 * Used by contracts.js, optimize.js, chat.js, legalLens.js
 */

const { ObjectId } = require("mongodb");
const OrganizationMember = require("../models/OrganizationMember");

/**
 * Find a contract with organization access check.
 * Works with native MongoDB driver (contractsCollection).
 *
 * @param {Collection} collection - MongoDB native collection
 * @param {string} userId - The requesting user's ID
 * @param {string} contractId - The contract ID to find
 * @returns {{ contract, membership, isOwner, role } | null}
 */
async function findContractWithOrgAccess(collection, userId, contractId) {
  const userOid = new ObjectId(userId);
  const contractOid = new ObjectId(contractId);

  // Look up active org membership for user
  const membership = await OrganizationMember.findOne({
    userId: userOid,
    isActive: true
  });

  // Build query: own contract OR org contract
  let filter;
  if (membership) {
    filter = {
      _id: contractOid,
      $or: [
        { userId: userOid },
        { organizationId: membership.organizationId }
      ]
    };
  } else {
    filter = {
      _id: contractOid,
      userId: userOid
    };
  }

  const contract = await collection.findOne(filter);

  if (!contract) return null;

  const isOwner = contract.userId && contract.userId.toString() === userId;
  const role = isOwner ? "owner" : (membership?.role || null);

  return { contract, membership, isOwner, role };
}

/**
 * Find a contract with organization access check.
 * Works with Mongoose model (Contract.findOne).
 *
 * @param {Model} Model - Mongoose Contract model
 * @param {string} userId - The requesting user's ID
 * @param {string} contractId - The contract ID to find
 * @returns {{ contract, membership, isOwner, role } | null}
 */
async function findContractWithOrgAccessMongoose(Model, userId, contractId) {
  const userOid = new ObjectId(userId);
  const contractOid = new ObjectId(contractId);

  const membership = await OrganizationMember.findOne({
    userId: userOid,
    isActive: true
  });

  let filter;
  if (membership) {
    filter = {
      _id: contractOid,
      $or: [
        { userId: userOid },
        { organizationId: membership.organizationId }
      ]
    };
  } else {
    filter = {
      _id: contractOid,
      userId: userOid
    };
  }

  const contract = await Model.findOne(filter);

  if (!contract) return null;

  const isOwner = contract.userId && contract.userId.toString() === userId;
  const role = isOwner ? "owner" : (membership?.role || null);

  return { contract, membership, isOwner, role };
}

/**
 * Check if a role has the required permission.
 *
 * Role hierarchy:
 *   owner  → contracts.read, contracts.write, contracts.delete, team.manage
 *   admin  → contracts.read, contracts.write, contracts.delete, team.manage
 *   member → contracts.read, contracts.write
 *   viewer → contracts.read
 */
const ROLE_PERMISSIONS = {
  owner:  ["contracts.read", "contracts.write", "contracts.delete", "team.manage"],
  admin:  ["contracts.read", "contracts.write", "contracts.delete", "team.manage"],
  member: ["contracts.read", "contracts.write"],
  viewer: ["contracts.read"]
};

function hasPermission(role, permission) {
  if (!role) return false;
  const perms = ROLE_PERMISSIONS[role];
  return perms ? perms.includes(permission) : false;
}

/**
 * Build an $or filter for bulk operations (userId OR organizationId).
 */
async function buildOrgFilter(userId) {
  const userOid = new ObjectId(userId);

  const membership = await OrganizationMember.findOne({
    userId: userOid,
    isActive: true
  });

  if (membership) {
    return {
      $or: [
        { userId: userOid },
        { organizationId: membership.organizationId }
      ],
      _membership: membership // attach for role checks
    };
  }

  return { userId: userOid, _membership: null };
}

module.exports = {
  findContractWithOrgAccess,
  findContractWithOrgAccessMongoose,
  hasPermission,
  buildOrgFilter,
  ROLE_PERMISSIONS
};
