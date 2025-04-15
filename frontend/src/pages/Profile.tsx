import { useEffect, useState } from "react";
import styles from "../styles/Profile.module.css";

export default function Profile() {
  const [userEmail, setUserEmail] = useState<string>("");
  const [isPremium, setIsPremium] = useState<boolean>(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState("");
  const [upgradeMessage, setUpgradeMessage] = useState("");

  useEffect(() => {
    fetch("/api/auth/me", {
      method: "GET",
      credentials: "include",
    })
      .then((res) => {
        if (!res.ok) throw new Error("Nicht authentifiziert");
        return res.json();
      })
      .then((data) => {
        setUserEmail(data.email);
        setIsPremium(data.subscriptionActive === true || data.isPremium === true);
      })
      .catch((_err) => {
        console.error("❌ Fehler beim Laden des Profils");
      });
  }, []);

  const handlePasswordChange = async () => {
    setMessage("");

    try {
      const res = await fetch("/api/auth/change-password", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
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
    } catch (_err) {
      setMessage("❌ Fehler beim Passwortwechsel");
    }
  };

  const handleAccountDelete = async () => {
    const confirmDelete = confirm("Willst du deinen Account wirklich löschen? Alle Verträge gehen verloren!");
    if (!confirmDelete) return;

    try {
      const res = await fetch("/api/auth/delete", {
        method: "DELETE",
        credentials: "include",
      });

      if (res.ok) {
        alert("🗑️ Account gelöscht. Bis bald!");
        window.location.href = "/";
      } else {
        alert("❌ Fehler beim Löschen des Accounts");
      }
    } catch (_err) {
      alert("❌ Fehler beim Löschen des Accounts");
    }
  };

  const handleUpgrade = async () => {
    setUpgradeMessage("");

    try {
      const res = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        credentials: "include",
      });

      const data = await res.json();

      if (res.ok && data.url) {
        window.location.href = data.url;
      } else {
        setUpgradeMessage("❌ Upgrade fehlgeschlagen");
      }
    } catch (_err) {
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
