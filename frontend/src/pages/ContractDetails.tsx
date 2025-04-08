import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import styles from "../styles/ContractDetails.module.css";
import { generateICS } from "../utils/icsGenerator";
import Notification from "../components/Notification";

interface Contract {
  _id: string;
  name: string;
  laufzeit: string;
  kuendigung: string;
  uploadedAt?: string;
  expiryDate?: string;
  status?: string;
  filePath?: string;
  reminder?: boolean;
  reminderLastSentAt?: string;
}

type NotificationType = "success" | "error" | "info";

export default function ContractDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [contract, setContract] = useState<Contract | null>(null);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    laufzeit: "",
    kuendigung: "",
  });

  const [notification, setNotification] = useState<{ message: string; type?: NotificationType } | null>(null);

  useEffect(() => {
    fetch(`http://https://contract-ai-backend.onrender.com/contracts/${id}`, {
      headers: {
        Authorization: localStorage.getItem("token") || "",
      },
    })
      .then((res) => res.json())
      .then((data) => {
        setContract(data);
        setFormData({
          name: data.name || "",
          laufzeit: data.laufzeit || "",
          kuendigung: data.kuendigung || "",
        });
      });
  }, [id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    const res = await fetch(`http://https://contract-ai-backend.onrender.com/contracts/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: localStorage.getItem("token") || "",
      },
      body: JSON.stringify(formData),
    });

    const data = await res.json();

    if (res.ok) {
      setContract({ ...contract!, ...formData });
      setEditing(false);
      setNotification({ message: "✅ Vertrag erfolgreich aktualisiert", type: "success" });
    } else {
      setNotification({ message: "❌ Fehler beim Speichern: " + data.message, type: "error" });
    }
  };

  const handleDelete = async () => {
    const confirmDelete = confirm("Bist du sicher, dass du diesen Vertrag löschen möchtest?");
    if (!confirmDelete) return;

    const res = await fetch(`http://https://contract-ai-backend.onrender.com/contracts/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: localStorage.getItem("token") || "",
      },
    });

    if (res.ok) {
      setNotification({ message: "🗑️ Vertrag gelöscht", type: "success" });
      setTimeout(() => navigate("/dashboard"), 1000);
    } else {
      setNotification({ message: "❌ Fehler beim Löschen", type: "error" });
    }
  };

  const handleCalendarExport = () => {
    if (contract?.expiryDate) {
      generateICS({
        name: contract.name,
        expiryDate: contract.expiryDate,
      });
      setNotification({ message: "📅 Zum Kalender exportiert", type: "info" });
    } else {
      setNotification({ message: "⚠️ Kein Ablaufdatum vorhanden", type: "error" });
    }
  };

  const toggleReminder = async () => {
    try {
      const res = await fetch(`http://https://contract-ai-backend.onrender.com/contracts/${contract?._id}/reminder`, {
        method: "PATCH",
        headers: {
          Authorization: localStorage.getItem("token") || "",
        },
      });

      if (!res.ok) throw new Error("Fehler beim Umschalten");

      const updatedContract = { ...contract!, reminder: !contract?.reminder };
      setContract(updatedContract);
      setNotification({
        message: `🔔 Erinnerung ${updatedContract.reminder ? "aktiviert" : "deaktiviert"}`,
        type: "success",
      });
    } catch (err) {
      setNotification({ message: "❌ Fehler beim Umschalten der Erinnerung", type: "error" });
    }
  };

  if (!contract) return <p className={styles.loading}>⏳ Lade Vertrag...</p>;

  return (
    <div className={styles.container}>
      <h1>🔍 Vertragsdetails</h1>

      <div className={styles.statusRow}>
        {contract.status && (
          <div className={styles.statusBox}>
            <strong>Status:</strong> {contract.status}
          </div>
        )}
        {contract.expiryDate && (
          <div className={styles.statusBox}>
            <strong>Ablaufdatum:</strong> {contract.expiryDate}
          </div>
        )}
        {contract.reminderLastSentAt && (
          <div className={styles.statusBox}>
            <strong>Letzte Erinnerung:</strong>{" "}
            {new Date(contract.reminderLastSentAt).toLocaleDateString("de-DE")}
          </div>
        )}
      </div>

      <div className={styles.detailBlock}>
        <label>Name:</label>
        {editing ? (
          <input name="name" value={formData.name} onChange={handleChange} />
        ) : (
          <p>{contract.name}</p>
        )}
      </div>

      <div className={styles.detailBlock}>
        <label>Laufzeit:</label>
        {editing ? (
          <input name="laufzeit" value={formData.laufzeit} onChange={handleChange} />
        ) : (
          <p>{contract.laufzeit}</p>
        )}
      </div>

      <div className={styles.detailBlock}>
        <label>Kündigungsfrist:</label>
        {editing ? (
          <input name="kuendigung" value={formData.kuendigung} onChange={handleChange} />
        ) : (
          <p>{contract.kuendigung}</p>
        )}
      </div>

      <div className={styles.detailBlock}>
        <label>🔔 Erinnerung aktivieren:</label>
        <input
          type="checkbox"
          checked={contract.reminder || false}
          onChange={toggleReminder}
        />
      </div>

      {contract.filePath && (
        <div className={styles.detailBlock}>
          <label>📎 Datei:</label>
          <a
            href={`http://https://contract-ai-backend.onrender.com${contract.filePath}`}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.downloadLink}
          >
            💾 PDF herunterladen
          </a>
        </div>
      )}

      <div className={styles.buttonRow}>
        {editing ? (
          <>
            <button onClick={handleSave}>💾 Speichern</button>
            <button onClick={() => setEditing(false)}>❌ Abbrechen</button>
          </>
        ) : (
          <>
            <button onClick={() => setEditing(true)}>✏️ Bearbeiten</button>
            <button onClick={() => navigate(-1)}>🔙 Zurück</button>
            <button onClick={handleDelete}>🗑️ Löschen</button>
            <button onClick={handleCalendarExport}>📅 Kalender speichern</button>
          </>
        )}
      </div>

      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}
    </div>
  );
}
