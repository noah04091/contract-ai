// 📁 src/pages/EditContract.tsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import styles from "./EditContract.module.css";

interface Contract {
  name: string;
  laufzeit: string;
  kuendigung: string;
}

export default function EditContract() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [contract, setContract] = useState<Contract>({
    name: "",
    laufzeit: "",
    kuendigung: "",
  });

  const [message, setMessage] = useState("");

  useEffect(() => {
    const fetchContract = async () => {
      try {
        const res = await fetch(`/api/contracts/${id}`, {
          credentials: "include", // ✅ wichtig für Cookie-Auth
        });

        if (!res.ok) {
          setMessage("❌ Vertrag nicht gefunden");
          return;
        }

        const data = await res.json();
        setContract({
          name: data.name || "",
          laufzeit: data.laufzeit || "",
          kuendigung: data.kuendigung || "",
        });
      } catch (err) {
        console.error("❌ Fehler beim Abrufen:", err);
        setMessage("❌ Serverfehler beim Abrufen");
      }
    };

    if (id) fetchContract();
  }, [id]);

  const handleUpdate = async () => {
    try {
      const res = await fetch(`/api/contracts/${id}`, {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(contract),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage("✅ Vertrag erfolgreich aktualisiert");
        setTimeout(() => navigate("/contracts"), 1500);
      } else {
        setMessage("❌ Fehler: " + (data.message || "Unbekannter Fehler"));
      }
    } catch (err) {
      console.error("❌ Fehler beim Speichern:", err);
      setMessage("❌ Serverfehler beim Speichern");
    }
  };

  return (
    <div className={styles.editContainer}>
      <h1>✏️ Vertrag bearbeiten</h1>

      <label>Name:</label>
      <input
        type="text"
        value={contract.name}
        onChange={(e) => setContract({ ...contract, name: e.target.value })}
        className={styles.input}
      />

      <label>Laufzeit:</label>
      <input
        type="text"
        value={contract.laufzeit}
        onChange={(e) => setContract({ ...contract, laufzeit: e.target.value })}
        className={styles.input}
      />

      <label>Kündigungsfrist:</label>
      <input
        type="text"
        value={contract.kuendigung}
        onChange={(e) => setContract({ ...contract, kuendigung: e.target.value })}
        className={styles.input}
      />

      <button onClick={handleUpdate} className={styles.saveButton}>
        💾 Speichern
      </button>

      {message && <p className={styles.message}>{message}</p>}
    </div>
  );
}
