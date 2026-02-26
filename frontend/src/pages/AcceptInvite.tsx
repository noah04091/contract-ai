// 📁 frontend/src/pages/AcceptInvite.tsx
// Team-Einladung annehmen - Registrierung oder Login für eingeladene User

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Helmet } from "react-helmet-async";
import { Users, CheckCircle, AlertCircle, Eye, EyeOff, Loader2 } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import styles from "../styles/AcceptInvite.module.css";

const API_URL = import.meta.env.VITE_API_URL || "https://api.contract-ai.de";

interface InviteData {
  invitation: {
    email: string;
    role: "admin" | "member" | "viewer";
    expiresAt: string;
  };
  organization: {
    id: string;
    name: string;
  };
  userExists: boolean;
}

export default function AcceptInvite() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user, refetchUser } = useAuth();

  const [inviteData, setInviteData] = useState<InviteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  // Form State
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Validiere Token beim Laden
  useEffect(() => {
    const validateInvite = async () => {
      if (!token) {
        setError("Kein Einladungs-Token gefunden");
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`${API_URL}/api/organizations/validate-invite/${token}`);
        const data = await response.json();

        if (!response.ok || !data.success) {
          setError(data.message || "Einladung ungültig");
          setErrorCode(data.code || null);
          setLoading(false);
          return;
        }

        setInviteData(data);
        setLoading(false);
      } catch (err) {
        console.error("Validate invite error:", err);
        setError("Fehler beim Laden der Einladung");
        setLoading(false);
      }
    };

    validateInvite();
  }, [token]);

  // Wenn User eingeloggt ist und Email matcht → direkt annehmen
  const handleAcceptAsLoggedInUser = async () => {
    if (!token || !user) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const authToken = localStorage.getItem("token");
      const response = await fetch(`${API_URL}/api/organizations/accept-invite/${token}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.message || "Fehler beim Annehmen der Einladung");
        setIsSubmitting(false);
        return;
      }

      setSuccess(true);
      await refetchUser();

      // Redirect nach 2 Sekunden
      setTimeout(() => {
        navigate("/team");
      }, 2000);
    } catch (err) {
      console.error("Accept invite error:", err);
      setError("Fehler beim Annehmen der Einladung");
      setIsSubmitting(false);
    }
  };

  // Neuen User registrieren + Einladung annehmen
  const handleRegisterAndAccept = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      setError("Passwörter stimmen nicht überein");
      return;
    }

    if (password.length < 8) {
      setError("Passwort muss mindestens 8 Zeichen haben");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/organizations/register-with-invite/${token}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          firstName,
          lastName,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.message || "Fehler bei der Registrierung");
        setIsSubmitting(false);
        return;
      }

      // Auto-Login: Token speichern (beide Keys wie Login.tsx)
      localStorage.setItem("token", data.token);
      localStorage.setItem("authToken", data.token);

      setSuccess(true);
      await refetchUser();

      // Redirect nach 2 Sekunden
      setTimeout(() => {
        navigate("/team");
      }, 2000);
    } catch (err) {
      console.error("Register with invite error:", err);
      setError("Fehler bei der Registrierung");
      setIsSubmitting(false);
    }
  };

  const getRoleName = (role: string) => {
    switch (role) {
      case "admin": return "Administrator";
      case "member": return "Mitglied";
      case "viewer": return "Betrachter";
      default: return role;
    }
  };

  // Loading State
  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <Loader2 className={styles.spinner} size={48} />
          <p>Einladung wird geladen...</p>
        </div>
      </div>
    );
  }

  // Error State
  if (error && !inviteData) {
    return (
      <div className={styles.container}>
        <Helmet>
          <title>Einladung ungültig | Contract AI</title>
        </Helmet>
        <motion.div
          className={styles.card}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <AlertCircle className={styles.errorIcon} size={64} />
          <h1>Einladung ungültig</h1>
          <p className={styles.errorMessage}>{error}</p>

          {errorCode === "INVITE_EXPIRED" && (
            <p className={styles.hint}>
              Bitte kontaktiere den Team-Admin für eine neue Einladung.
            </p>
          )}

          <button
            className={styles.primaryButton}
            onClick={() => navigate("/")}
          >
            Zur Startseite
          </button>
        </motion.div>
      </div>
    );
  }

  // Success State
  if (success) {
    return (
      <div className={styles.container}>
        <Helmet>
          <title>Willkommen im Team! | Contract AI</title>
        </Helmet>
        <motion.div
          className={styles.card}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <CheckCircle className={styles.successIcon} size={64} />
          <h1>Willkommen im Team!</h1>
          <p>Du bist jetzt Mitglied von <strong>{inviteData?.organization.name}</strong></p>
          <p className={styles.hint}>Du wirst gleich weitergeleitet...</p>
        </motion.div>
      </div>
    );
  }

  // User ist eingeloggt
  if (user && inviteData) {
    const emailMatches = user.email.toLowerCase() === inviteData.invitation.email.toLowerCase();

    return (
      <div className={styles.container}>
        <Helmet>
          <title>Team-Einladung annehmen | Contract AI</title>
        </Helmet>
        <motion.div
          className={styles.card}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Users className={styles.headerIcon} size={48} />
          <h1>Team-Einladung</h1>

          <div className={styles.inviteInfo}>
            <p>
              Du wurdest eingeladen, dem Team von{" "}
              <strong>{inviteData.organization.name}</strong> beizutreten.
            </p>
            <div className={styles.roleTag}>
              Rolle: <strong>{getRoleName(inviteData.invitation.role)}</strong>
            </div>
          </div>

          {emailMatches ? (
            <>
              {error && <p className={styles.error}>{error}</p>}
              <button
                className={styles.primaryButton}
                onClick={handleAcceptAsLoggedInUser}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className={styles.buttonSpinner} size={18} />
                    Wird angenommen...
                  </>
                ) : (
                  "Einladung annehmen"
                )}
              </button>
            </>
          ) : (
            <div className={styles.emailMismatch}>
              <AlertCircle size={20} />
              <p>
                Diese Einladung ist für <strong>{inviteData.invitation.email}</strong>,
                aber du bist als <strong>{user.email}</strong> eingeloggt.
              </p>
              <button
                className={styles.secondaryButton}
                onClick={() => {
                  localStorage.removeItem("token");
                  window.location.reload();
                }}
              >
                Abmelden und mit anderem Account fortfahren
              </button>
            </div>
          )}
        </motion.div>
      </div>
    );
  }

  // User existiert bereits aber ist nicht eingeloggt
  if (inviteData?.userExists) {
    return (
      <div className={styles.container}>
        <Helmet>
          <title>Einloggen zum Beitreten | Contract AI</title>
        </Helmet>
        <motion.div
          className={styles.card}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Users className={styles.headerIcon} size={48} />
          <h1>Team-Einladung</h1>

          <div className={styles.inviteInfo}>
            <p>
              Du wurdest eingeladen, dem Team von{" "}
              <strong>{inviteData.organization.name}</strong> beizutreten.
            </p>
            <div className={styles.roleTag}>
              Rolle: <strong>{getRoleName(inviteData.invitation.role)}</strong>
            </div>
          </div>

          <div className={styles.loginPrompt}>
            <p>
              Ein Account mit <strong>{inviteData.invitation.email}</strong> existiert bereits.
            </p>
            <button
              className={styles.primaryButton}
              onClick={() => navigate(`/login?redirect=/accept-invite/${token}`)}
            >
              Einloggen um beizutreten
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // Neuer User - Registrierungsformular
  return (
    <div className={styles.container}>
      <Helmet>
        <title>Team beitreten | Contract AI</title>
      </Helmet>
      <motion.div
        className={styles.card}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Users className={styles.headerIcon} size={48} />
        <h1>Team beitreten</h1>

        <div className={styles.inviteInfo}>
          <p>
            Du wurdest eingeladen, dem Team von{" "}
            <strong>{inviteData?.organization.name}</strong> beizutreten.
          </p>
          <div className={styles.roleTag}>
            Rolle: <strong>{getRoleName(inviteData?.invitation.role || "member")}</strong>
          </div>
        </div>

        <form onSubmit={handleRegisterAndAccept} className={styles.form}>
          <div className={styles.inputGroup}>
            <label>E-Mail</label>
            <input
              type="email"
              value={inviteData?.invitation.email || ""}
              disabled
              className={styles.disabledInput}
            />
          </div>

          <div className={styles.row}>
            <div className={styles.inputGroup}>
              <label>Vorname</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Max"
                required
              />
            </div>
            <div className={styles.inputGroup}>
              <label>Nachname</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Mustermann"
                required
              />
            </div>
          </div>

          <div className={styles.inputGroup}>
            <label>Passwort</label>
            <div className={styles.passwordWrapper}>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mindestens 8 Zeichen"
                minLength={8}
                required
              />
              <button
                type="button"
                className={styles.togglePassword}
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className={styles.inputGroup}>
            <label>Passwort bestätigen</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Passwort wiederholen"
              required
            />
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <button
            type="submit"
            className={styles.primaryButton}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className={styles.buttonSpinner} size={18} />
                Account wird erstellt...
              </>
            ) : (
              "Account erstellen & Team beitreten"
            )}
          </button>
        </form>

        <p className={styles.terms}>
          Mit der Registrierung akzeptierst du unsere{" "}
          <a href="/agb" target="_blank">AGB</a> und{" "}
          <a href="/datenschutz" target="_blank">Datenschutzerklärung</a>.
        </p>
      </motion.div>
    </div>
  );
}
