// 📁 frontend/src/pages/Team.tsx
// Team-Management UI (Enterprise-Feature)

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Helmet } from "react-helmet";
import { Users, Plus, Shield, Eye, Trash2, Crown, CheckCircle, AlertCircle, X } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useNavigate } from "react-router-dom";
import styles from "../styles/Team.module.css";

interface Organization {
  id: string;
  name: string;
  ownerId: string;
  memberCount: number;
  maxMembers: number;
  createdAt: string;
}

interface Membership {
  role: "admin" | "member" | "viewer";
  permissions: string[];
  joinedAt: string;
  isOwner: boolean;
}

interface Member {
  id: string;
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: "admin" | "member" | "viewer";
  joinedAt: string;
}

interface Notification {
  message: string;
  type: "success" | "error" | "warning";
}

export default function Team() {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

  const [organization, setOrganization] = useState<Organization | null>(null);
  const [membership, setMembership] = useState<Membership | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [notification, setNotification] = useState<Notification | null>(null);

  // Create Org Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [orgName, setOrgName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // Invite Modal
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "member" | "viewer">("member");
  const [isInviting, setIsInviting] = useState(false);

  // Enterprise-Check
  useEffect(() => {
    if (!isLoading && user && user.subscriptionPlan !== "premium") {
      navigate("/pricing");
    }
  }, [user, isLoading, navigate]);

  // Load Organization Data
  useEffect(() => {
    if (user && user.subscriptionPlan === "premium") {
      fetchOrganization();
    }
  }, [user]);

  const fetchOrganization = async () => {
    setIsLoadingData(true);
    try {
      const res = await fetch("/api/organizations/my-organization", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`
        }
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setOrganization(data.organization);
        setMembership(data.membership);

        if (data.organization) {
          await fetchMembers(data.organization.id);
        }
      } else {
        throw new Error(data.message || "Fehler beim Laden");
      }
    } catch (error: unknown) {
      console.error("Fehler beim Laden der Organisation:", error);
      const message = error instanceof Error ? error.message : "Fehler beim Laden";
      setNotification({
        message,
        type: "error"
      });
    } finally {
      setIsLoadingData(false);
    }
  };

  const fetchMembers = async (orgId: string) => {
    try {
      const res = await fetch(`/api/organizations/${orgId}/members`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`
        }
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setMembers(data.members);
      }
    } catch (error: unknown) {
      console.error("Fehler beim Laden der Members:", error);
    }
  };

  const handleCreateOrganization = async () => {
    if (!orgName.trim()) {
      setNotification({
        message: "Bitte gib einen Organisationsnamen ein",
        type: "error"
      });
      return;
    }

    setIsCreating(true);
    try {
      const res = await fetch("/api/organizations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({ name: orgName })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setNotification({
          message: "Organisation erfolgreich erstellt!",
          type: "success"
        });
        setShowCreateModal(false);
        setOrgName("");
        await fetchOrganization();
      } else {
        throw new Error(data.message || "Fehler beim Erstellen");
      }
    } catch (error: unknown) {
      console.error("Fehler beim Erstellen:", error);
      const message = error instanceof Error ? error.message : "Fehler beim Erstellen";
      setNotification({
        message,
        type: "error"
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleInviteMember = async () => {
    if (!inviteEmail.trim() || !inviteEmail.includes("@")) {
      setNotification({
        message: "Bitte gib eine gültige E-Mail-Adresse ein",
        type: "error"
      });
      return;
    }

    setIsInviting(true);
    try {
      const res = await fetch(`/api/organizations/${organization!.id}/invite`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({
          email: inviteEmail,
          role: inviteRole
        })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setNotification({
          message: "Einladung erfolgreich versendet!",
          type: "success"
        });
        setShowInviteModal(false);
        setInviteEmail("");
        setInviteRole("member");
      } else {
        throw new Error(data.message || "Fehler beim Einladen");
      }
    } catch (error: unknown) {
      console.error("Fehler beim Einladen:", error);
      const message = error instanceof Error ? error.message : "Fehler beim Einladen";
      setNotification({
        message,
        type: "error"
      });
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemoveMember = async (memberId: string, memberEmail: string) => {
    if (!confirm(`Mitglied "${memberEmail}" wirklich entfernen?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/organizations/${organization!.id}/members/${memberId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`
        }
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setNotification({
          message: "Mitglied erfolgreich entfernt",
          type: "success"
        });
        await fetchOrganization();
      } else {
        throw new Error(data.message || "Fehler beim Entfernen");
      }
    } catch (error: unknown) {
      console.error("Fehler beim Entfernen:", error);
      const message = error instanceof Error ? error.message : "Fehler beim Entfernen";
      setNotification({
        message,
        type: "error"
      });
    }
  };

  const handleChangeRole = async (memberId: string, newRole: string) => {
    try {
      const res = await fetch(`/api/organizations/${organization!.id}/members/${memberId}/role`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({ role: newRole })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setNotification({
          message: "Rolle erfolgreich geändert",
          type: "success"
        });
        await fetchOrganization();
      } else {
        throw new Error(data.message || "Fehler beim Ändern");
      }
    } catch (error: unknown) {
      console.error("Fehler beim Ändern der Rolle:", error);
      const message = error instanceof Error ? error.message : "Fehler beim Ändern";
      setNotification({
        message,
        type: "error"
      });
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "admin": return <Shield size={16} />;
      case "member": return <Users size={16} />;
      case "viewer": return <Eye size={16} />;
      default: return null;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "admin": return "#f59e0b";
      case "member": return "#3b82f6";
      case "viewer": return "#6b7280";
      default: return "#6b7280";
    }
  };

  if (isLoading || (user && user.subscriptionPlan !== "premium")) {
    return null;
  }

  return (
    <>
      <Helmet>
        <title>Team-Management - Contract AI</title>
      </Helmet>

      <div className={styles.container}>
        <motion.div
          className={styles.content}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Header */}
          <div className={styles.header}>
            <div className={styles.headerLeft}>
              <Users size={32} className={styles.headerIcon} />
              <div>
                <h1 className={styles.title}>Team-Management</h1>
                <p className={styles.subtitle}>
                  Verwalte dein Team und lade Mitglieder ein
                </p>
              </div>
            </div>
            {organization && membership?.role === "admin" && (
              <button
                className={styles.inviteButton}
                onClick={() => setShowInviteModal(true)}
                disabled={organization.memberCount >= organization.maxMembers}
              >
                <Plus size={18} />
                Mitglied einladen
              </button>
            )}
          </div>

          {isLoadingData ? (
            <div className={styles.loading}>Lade Team-Daten...</div>
          ) : !organization ? (
            /* Keine Organisation -> Create UI */
            <div className={styles.emptyState}>
              <Users size={64} className={styles.emptyIcon} />
              <h3>Noch keine Organisation</h3>
              <p>Erstelle eine Organisation, um mit deinem Team zusammenzuarbeiten.</p>
              <button
                className={styles.createButton}
                onClick={() => setShowCreateModal(true)}
              >
                Organisation erstellen
              </button>
            </div>
          ) : (
            /* Organisation vorhanden -> Team UI */
            <>
              {/* Org Info Box */}
              <div className={styles.orgInfo}>
                <div className={styles.orgHeader}>
                  <h2>{organization.name}</h2>
                  <span className={styles.memberCount}>
                    {organization.memberCount}/{organization.maxMembers} Mitglieder
                  </span>
                </div>
                <div className={styles.orgMeta}>
                  <span>Deine Rolle: <strong>{membership?.role === "admin" ? "Administrator" : membership?.role === "member" ? "Mitglied" : "Betrachter"}</strong></span>
                  {membership?.isOwner && (
                    <span className={styles.ownerBadge}>
                      <Crown size={14} />
                      Owner
                    </span>
                  )}
                </div>
              </div>

              {/* Members List */}
              <div className={styles.membersList}>
                <h3>Team-Mitglieder ({members.length})</h3>

                {members.map((member) => {
                  const isCurrentUser = member.email === user?.email;
                  const isOwner = member.userId === organization.ownerId;

                  return (
                    <motion.div
                      key={member.id}
                      className={styles.memberCard}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <div className={styles.memberInfo}>
                        <div className={styles.memberAvatar}>
                          {member.firstName?.[0] || member.email[0].toUpperCase()}
                        </div>
                        <div className={styles.memberDetails}>
                          <div className={styles.memberName}>
                            {member.firstName && member.lastName
                              ? `${member.firstName} ${member.lastName}`
                              : member.email}
                            {isCurrentUser && <span className={styles.youBadge}>(Du)</span>}
                            {isOwner && <Crown size={14} color="#f59e0b" />}
                          </div>
                          <div className={styles.memberEmail}>{member.email}</div>
                        </div>
                      </div>

                      <div className={styles.memberActions}>
                        {membership?.role === "admin" && !isOwner ? (
                          <>
                            <select
                              className={styles.roleSelect}
                              value={member.role}
                              onChange={(e) => handleChangeRole(member.userId, e.target.value)}
                              style={{ color: getRoleColor(member.role) }}
                            >
                              <option value="admin">Admin</option>
                              <option value="member">Member</option>
                              <option value="viewer">Viewer</option>
                            </select>

                            <button
                              className={styles.removeButton}
                              onClick={() => handleRemoveMember(member.userId, member.email)}
                              title="Mitglied entfernen"
                            >
                              <Trash2 size={16} />
                            </button>
                          </>
                        ) : (
                          <div className={styles.roleBadge} style={{ backgroundColor: getRoleColor(member.role) }}>
                            {getRoleIcon(member.role)}
                            <span>{member.role === "admin" ? "Admin" : member.role === "member" ? "Member" : "Viewer"}</span>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Limit Warning */}
              {organization.memberCount >= organization.maxMembers && (
                <div className={styles.warningBox}>
                  <AlertCircle size={18} />
                  Maximale Anzahl an Mitgliedern erreicht ({organization.maxMembers}/{organization.maxMembers})
                </div>
              )}
            </>
          )}
        </motion.div>

        {/* Create Org Modal */}
        <AnimatePresence>
          {showCreateModal && (
            <motion.div
              className={styles.modalOverlay}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCreateModal(false)}
            >
              <motion.div
                className={styles.modal}
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                onClick={(e) => e.stopPropagation()}
              >
                <h2 className={styles.modalTitle}>Organisation erstellen</h2>
                <p className={styles.modalDescription}>
                  Gib deiner Organisation einen Namen (z.B. Firmenname).
                </p>

                <input
                  type="text"
                  className={styles.input}
                  placeholder="z.B. Müller & Partner GmbH"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  maxLength={100}
                />

                <div className={styles.modalActions}>
                  <button
                    className={styles.cancelButton}
                    onClick={() => setShowCreateModal(false)}
                    disabled={isCreating}
                  >
                    Abbrechen
                  </button>
                  <button
                    className={styles.createButton}
                    onClick={handleCreateOrganization}
                    disabled={isCreating || !orgName.trim()}
                  >
                    {isCreating ? "Erstelle..." : "Erstellen"}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Invite Modal */}
        <AnimatePresence>
          {showInviteModal && (
            <motion.div
              className={styles.modalOverlay}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowInviteModal(false)}
            >
              <motion.div
                className={styles.modal}
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                onClick={(e) => e.stopPropagation()}
              >
                <h2 className={styles.modalTitle}>Mitglied einladen</h2>
                <p className={styles.modalDescription}>
                  Lade ein neues Mitglied per E-Mail ein.
                </p>

                <input
                  type="email"
                  className={styles.input}
                  placeholder="email@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />

                <label className={styles.label}>Rolle:</label>
                <select
                  className={styles.select}
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as any)}
                >
                  <option value="admin">Administrator (voller Zugriff)</option>
                  <option value="member">Mitglied (arbeiten)</option>
                  <option value="viewer">Betrachter (nur lesen)</option>
                </select>

                <div className={styles.modalActions}>
                  <button
                    className={styles.cancelButton}
                    onClick={() => setShowInviteModal(false)}
                    disabled={isInviting}
                  >
                    Abbrechen
                  </button>
                  <button
                    className={styles.createButton}
                    onClick={handleInviteMember}
                    disabled={isInviting || !inviteEmail.trim()}
                  >
                    {isInviting ? "Sende..." : "Einladung senden"}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Notification */}
        <AnimatePresence>
          {notification && (
            <motion.div
              className={`${styles.notification} ${styles[notification.type]}`}
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            >
              {notification.type === "success" ? (
                <CheckCircle size={18} />
              ) : (
                <AlertCircle size={18} />
              )}
              <span>{notification.message}</span>
              <button onClick={() => setNotification(null)}>
                <X size={16} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
