import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import styles from "./Dashboard.module.css";
import ContractNotification from "../components/ContractNotification";
import { generateICS } from "../utils/icsGenerator";
import StatusPieChart from "../components/StatusPieChart";
import UploadBarChart from "../components/UploadBarChart";
import Notification from "../components/Notification";
import { Helmet } from "react-helmet-async";

interface Contract {
  _id: string;
  name: string;
  laufzeit: string;
  kuendigung: string;
  expiryDate?: string;
  status?: string;
  uploadedAt?: string;
  filePath?: string;
  reminder?: boolean;
}

export default function Dashboard() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [filteredContracts, setFilteredContracts] = useState<Contract[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [userEmail, setUserEmail] = useState("");
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const countStatus = (status: string) => contracts.filter((c) => c.status === status).length;
  const countWithReminder = () => contracts.filter((c) => c.reminder).length;
  const averageLaufzeit = () => {
    const laufzeiten = contracts
      .map((c) => {
        const match = c.laufzeit.match(/(\d+)\s*(Jahr|Monat)/i);
        if (!match) return 0;
        const num = parseInt(match[1]);
        return match[2].toLowerCase().startsWith("jahr") ? num * 12 : num;
      })
      .filter((val) => val > 0);
    return laufzeiten.length > 0 ? Math.round(laufzeiten.reduce((a, b) => a + b, 0) / laufzeiten.length) : 0;
  };

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => setUserEmail(data.email))
      .catch((err) => console.error("Fehler beim Laden des Nutzers:", err));

    fetch("/api/contracts", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        setContracts(data);
        setFilteredContracts(data);
      });
  }, []);

  useEffect(() => {
    const filtered = contracts.filter((contract) => {
      const combinedText = `${contract.name} ${contract.laufzeit} ${contract.kuendigung}`.toLowerCase();
      const matchesSearch = combinedText.includes(searchTerm.toLowerCase());
      const matchesStatus = selectedStatus === "all" || contract.status === selectedStatus;
      return matchesSearch && matchesStatus;
    });
    setFilteredContracts(filtered);
  }, [searchTerm, selectedStatus, contracts]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const status = params.get("status");
    if (status === "success") {
      setNotification({ message: "✅ Dein Abo wurde erfolgreich aktiviert!", type: "success" });
    } else if (status === "error") {
      setNotification({ message: "❌ Es gab ein Problem beim Bezahlen. Bitte versuche es erneut.", type: "error" });
    }
  }, [location.search]);

  const handleFileUpload = async () => {
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/upload", {
      method: "POST",
      credentials: "include",
      body: formData,
    });

    const data = await res.json();
    if (res.ok) {
      const updatedContracts = [...contracts, data.contract];
      setContracts(updatedContracts);
      setFilteredContracts(updatedContracts);
      setShowModal(false);
      setFile(null);
    } else {
      alert("Fehler beim Hochladen: " + data.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bist du sicher, dass du diesen Vertrag löschen möchtest?")) return;

    const res = await fetch(`/api/contracts/${id}`, {
      method: "DELETE",
      credentials: "include",
    });

    if (res.ok) {
      const updated = contracts.filter((c) => c._id !== id);
      setContracts(updated);
      setFilteredContracts(updated);
    } else {
      alert("❌ Fehler beim Löschen");
    }
  };

  const toggleReminder = async (id: string) => {
    try {
      const res = await fetch(`/api/contracts/${id}/reminder`, {
        method: "PATCH",
        credentials: "include",
      });

      if (!res.ok) throw new Error("Fehler beim Umschalten des Reminders");

      const updated = contracts.map((c) =>
        c._id === id ? { ...c, reminder: !c.reminder } : c
      );
      setContracts(updated);
      setFilteredContracts(updated);
      alert("🔔 Erinnerung wurde aktualisiert!");
    } catch (err) {
      console.error(err);
      alert("❌ Fehler beim Umschalten des Reminders");
    }
  };

  const exportToCSV = () => {
    const headers = ["Name", "Laufzeit", "Kündigungsfrist", "Ablaufdatum", "Status"];
    const rows = contracts.map((c) => [
      `"${c.name}"`,
      `"${c.laufzeit}"`,
      `"${c.kuendigung}"`,
      `"${c.expiryDate || ""}"`,
      `"${c.status || ""}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers, ...rows].map((row) => row.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "vertraege_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportAllICS = () => {
    const soonExpiring = contracts.filter((c) => {
      if (!c.expiryDate) return false;
      const daysLeft = (new Date(c.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
      return daysLeft <= 30 && daysLeft > 0;
    });

    if (soonExpiring.length === 0) {
      alert("Keine bald ablaufenden Verträge vorhanden.");
      return;
    }

    soonExpiring.forEach((c) => {
      generateICS({ name: c.name, expiryDate: c.expiryDate! });
    });

    alert("📅 ICS-Dateien für bald ablaufende Verträge exportiert.");
  };

  return (
    <div className={styles.dashboard}>
      <Helmet>
        <title>📊 Dashboard – Contract AI</title>
        <meta name="description" content="Deine Vertragsübersicht mit Analyse, Export und Reminder auf einen Blick." />
      </Helmet>

      <h1>📊 Vertragsübersicht</h1>

      {userEmail && (
        <p className={styles.userInfo}>
          ✅ Eingeloggt als: <strong>{userEmail}</strong>
        </p>
      )}

      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}

      <div className={styles.statsRow}>
        <p>📦 Verträge insgesamt: <strong>{contracts.length}</strong></p>
        <p>⏰ Mit Erinnerung: <strong>{countWithReminder()}</strong></p>
        <p>📈 Ø Laufzeit: <strong>{averageLaufzeit()} Monate</strong></p>
      </div>

      <ContractNotification contracts={contracts} />

      <div className={styles.statusOverview}>
        <div className={styles.statusCard}>✅ Aktiv: <strong>{countStatus("Aktiv")}</strong></div>
        <div className={styles.statusCard}>⚠️ Bald ablaufend: <strong>{countStatus("Bald ablaufend")}</strong></div>
        <div className={styles.statusCard}>❌ Abgelaufen: <strong>{countStatus("Abgelaufen")}</strong></div>
      </div>

      <div className={styles.actionsRow}>
        <input
          type="text"
          placeholder="🔎 Vertrag suchen..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={styles.searchInput}
        />
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className={styles.filterSelect}
        >
          <option value="all">📁 Alle</option>
          <option value="Aktiv">✅ Aktiv</option>
          <option value="Bald ablaufend">⚠️ Bald ablaufend</option>
          <option value="Abgelaufen">❌ Abgelaufen</option>
        </select>
        <button onClick={() => setShowModal(true)} className={styles.uploadButton}>📄 Vertrag hinzufügen</button>
        <button onClick={exportToCSV} className={styles.exportButton}>📥 CSV Export</button>
        <button onClick={exportAllICS} className={styles.exportButton}>📅 ICS Export (30 Tage)</button>
      </div>

      <table className={styles.contractTable}>
        <thead>
          <tr>
            <th>Name</th>
            <th>Laufzeit</th>
            <th>Kündigungsfrist</th>
            <th>Ablaufdatum</th>
            <th>Status</th>
            <th>Aktionen</th>
          </tr>
        </thead>
        <tbody>
          {filteredContracts.map((contract) => (
            <tr key={contract._id} className={styles.clickableRow}>
              <td onClick={() => navigate(`/contracts/${contract._id}`)}>{contract.name}</td>
              <td onClick={() => navigate(`/contracts/${contract._id}`)}>{contract.laufzeit}</td>
              <td onClick={() => navigate(`/contracts/${contract._id}`)}>{contract.kuendigung}</td>
              <td onClick={() => navigate(`/contracts/${contract._id}`)}>{contract.expiryDate || "?"}</td>
              <td onClick={() => navigate(`/contracts/${contract._id}`)}>{contract.status || "?"}</td>
              <td>
                <button className={styles.deleteButton} onClick={() => handleDelete(contract._id)}>🗑️</button>
                <button className={styles.reminderButton} onClick={() => toggleReminder(contract._id)} title="Erinnerung aktivieren/deaktivieren">🔔</button>
                <button className={styles.calendarButton} onClick={() => generateICS({ name: contract.name, expiryDate: contract.expiryDate })} title="Zum Kalender hinzufügen">📅</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className={styles.chartGrid}>
        <div className={styles.chartCard}>
          <StatusPieChart contracts={contracts} />
        </div>
        <div className={styles.chartCard}>
          <UploadBarChart contracts={contracts} />
        </div>
      </div>

      {showModal && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h2>Vertrag hochladen</h2>
            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            <button onClick={handleFileUpload}>📤 Hochladen</button>
            <button onClick={() => setShowModal(false)}>❌ Abbrechen</button>
          </div>
        </div>
      )}
    </div>
  );
}
