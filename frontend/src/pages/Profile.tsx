import { useEffect, useState } from "react"; 
import { jwtDecode } from "jwt-decode";
import axios from "axios";
import styles from "../styles/Profile.module.css";

interface DecodedToken {
  email: string;
  exp: number;
  iat: number;
}

interface CheckoutResponse {
  url: string;
}

interface UserProfile {
  email: string;
  isPremium: boolean;
}

export default function Profile() {
  const [userEmail, setUserEmail] = useState<string>("");
  const [isPremium, setIsPremium] = useState<boolean>(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState("");
  const [upgradeMessage, setUpgradeMessage] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const decoded = jwtDecode<DecodedToken>(token);
        setUserEmail(decoded.email);

        axios
          .get<UserProfile>("http://https://contract-ai-backend.onrender.com/auth/me", {
            headers: { Authorization: `Bearer ${token}` },
          })
          .then((res) => {
            setIsPremium(res.data.isPremium);
            setUserEmail(res.data.email);
          })
          .catch((err) => console.error("❌ Fehler beim Laden des Profils:", err));
      } catch (error) {
        console.error("❌ Fehler beim Token-Decode:", error);
      }
    }
  }, []);

  const handlePasswordChange = async () => {
    setMessage("");
    try {
      const res = await fetch("http://https://contract-ai-backend.onrender.com/auth/change-password", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: localStorage.getItem("token") || "",
        },
        body: JSON.stringify({ oldPassword, newPassword }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage("✅ Passwort erfolgreich geändert");
        setOldPassword("");
        setNewPassword("");
      } else {
        setMessage("❌ " + data.message);
      }
    } catch (err) {
      setMessage("❌ Fehler beim Passwortwechsel");
    }
  };

  const handleAccountDelete = async () => {
    const confirmDelete = confirm("Willst du deinen Account wirklich löschen? Alle Verträge gehen verloren!");
    if (!confirmDelete) return;

    const res = await fetch("http://https://contract-ai-backend.onrender.com/auth/delete", {
      method: "DELETE",
      headers: {
        Authorization: localStorage.getItem("token") || "",
      },
    });

    if (res.ok) {
      alert("🗑️ Account gelöscht. Bis bald!");
      localStorage.removeItem("token");
      window.location.href = "/";
    } else {
      alert("❌ Fehler beim Löschen des Accounts");
    }
  };

  const handleUpgrade = async () => {
    setUpgradeMessage("");

    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Kein Token vorhanden");

      const res = await axios.post<CheckoutResponse>(
        "http://https://contract-ai-backend.onrender.com/stripe/create-checkout-session",
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (res.data?.url) {
        window.location.href = res.data.url;
      } else {
        setUpgradeMessage("❌ Keine Stripe-URL empfangen");
      }
    } catch (err) {
      console.error("❌ Upgrade fehlgeschlagen:", err);
      setUpgradeMessage("❌ Upgrade fehlgeschlagen");
    }
  };

  return (
    <div className={styles.container}>
      <h1>👤 Dein Profil</h1>

      {userEmail ? (
        <>
          <p className={styles.welcome}>
            Willkommen, <strong>{userEmail}</strong>!
          </p>

          <p className={styles.subscriptionInfo}>
            {isPremium ? (
              <span className="premium">💎 Du hast ein aktives Premium-Abo</span>
            ) : (
              <span className="standard">🔓 Aktuell Standard – kein Abo aktiv</span>
            )}
          </p>

          {!isPremium && (
            <button onClick={handleUpgrade} className={styles.upgradeButton}>
              💳 Jetzt upgraden für unbegrenzte Analysen
            </button>
          )}

          {upgradeMessage && (
            <p
              className={`${styles.message} ${
                upgradeMessage.startsWith("✅") ? styles.success : styles.error
              }`}
            >
              {upgradeMessage}
            </p>
          )}

          <h2 className={styles.sectionTitle}>🔐 Passwort ändern</h2>

          <div className={styles.passwordBox}>
            <input
              type="password"
              placeholder="Altes Passwort"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              className={styles.input}
            />
            <input
              type="password"
              placeholder="Neues Passwort"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={styles.input}
            />
            <button onClick={handlePasswordChange} className={styles.button}>
              🔄 Passwort ändern
            </button>
            {message && (
              <p
                className={`${styles.message} ${
                  message.startsWith("✅") ? styles.success : styles.error
                }`}
              >
                {message}
              </p>
            )}
          </div>

          <hr className={styles.divider} />

          <button onClick={handleAccountDelete} className={styles.deleteButton}>
            🗑️ Account löschen
          </button>
        </>
      ) : (
        <p>❌ Keine Benutzerdaten gefunden.</p>
      )}
    </div>
  );
}
