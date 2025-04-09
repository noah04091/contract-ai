// src/pages/EditContract.tsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import styles from "./EditContract.module.css"; // ✅ Falls du’s lieber bei "pages" hast

export default function EditContract() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [contract, setContract] = useState({
    name: "",
    laufzeit: "",
    kuendigung: "",
  });

  const [message, setMessage] = useState("");

  useEffect(() => {
    const fetchContract = async () => {
      try {
        const res = await fetch(`https://contract-ai-backend.onrender.com/contracts/${id}`, {
          headers: {
            Authorization: localStorage.getItem("token") || "",
          },
        });
        const data = await res.json();
        if (res.ok) {
          setContract({
            name: data.name,
            laufzeit: data.laufzeit,
            kuendigung: data.kuendigung,
          });
        } else {
          setMessage("❌ Vertrag nicht gefunden");
        }
      } catch (err) {
        setMessage("❌ Serverfehler beim Abrufen");
      }
    };

    fetchContract();
  }, [id]);

  const handleUpdate = async () => {
    const res = await fetch(`https://contract-ai-backend.onrender.com/contracts/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: localStorage.getItem("token") || "",
      },
      body: JSON.stringify(contract),
    });

    const data = await res.json();

    if (res.ok) {
      setMessage("✅ Vertrag erfolgreich aktualisiert");
      setTimeout(() => navigate("/contracts"), 1500);
    } else {
      setMessage("❌ Fehler: " + data.message);
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
