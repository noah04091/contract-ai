import { useState, useEffect } from "react";
import axios from "axios";
import styles from "../styles/Contracts.module.css";
import ContractAnalysis from "../components/ContractAnalysis";
import AnalysisHistory from "../components/AnalysisHistory";
import ContractDetailsModal from "../components/ContractDetailsModal";

interface Contract {
  _id: string;
  name: string;
  kuendigung: string;
  expiryDate: string;
  status: string;
}

export default function Contracts() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const fetchContracts = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const res = await axios.get<Contract[]>("https://contract-ai-backend.onrender.com/contracts", {
        headers: { Authorization: token || "" },
      });
      setContracts(res.data);
      setError(null);
    } catch (err) {
      console.error("Fehler beim Laden der Verträge:", err);
      setError("Die Verträge konnten nicht geladen werden. Bitte versuche es später erneut.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContracts();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    }
  };

  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setSelectedFile(e.dataTransfer.files[0]);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
  };

  const handleRowClick = (contract: Contract) => {
    setSelectedContract(contract);
    setShowDetails(true);
  };

  const getStatusColor = (status: string): string => {
    status = status.toLowerCase();
    if (status === "aktiv" || status === "gültig") {
      return styles.statusActive;
    } else if (status === "läuft ab" || status === "bald fällig") {
      return styles.statusWarning;
    } else if (status === "gekündigt" || status === "beendet") {
      return styles.statusCancelled;
    } else {
      return styles.statusNeutral;
    }
  };

  // Hilfsfunktion um Datum zu formatieren
  const formatDate = (dateString: string): string => {
    if (!dateString) return "—";
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("de-DE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
      });
    } catch (error) {
      return dateString;
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Vertragsanalyse & Verwaltung</h1>
        <p className={styles.subtitle}>
          Verträge hochladen, analysieren und verwalten
        </p>
      </div>

      <div 
        className={`${styles.uploadArea} ${dragActive ? styles.dragActive : ''}`} 
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <div className={styles.uploadIcon}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M8 16H6C4.89543 16 4 15.1046 4 14V6C4 4.89543 4.89543 4 6 4H14C15.1046 4 16 4.89543 16 6V8M10 20H18C19.1046 20 20 19.1046 20 18V10C20 8.89543 19.1046 8 18 8H10C8.89543 8 8 8.89543 8 10V18C8 19.1046 8.89543 20 10 20Z" 
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <h3>Vertrag hochladen</h3>
        <p>Ziehe eine Datei hierher oder klicke zum Auswählen</p>
        <input 
          type="file" 
          onChange={handleFileChange} 
          className={styles.fileInput}
          accept=".pdf,.doc,.docx"
          id="contractFile"
        />
        <label htmlFor="contractFile" className={styles.uploadButton}>
          Datei auswählen
        </label>

        {showSuccess && (
          <div className={styles.successMessage}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M5 13L9 17L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span>Datei erfolgreich ausgewählt: {selectedFile?.name}</span>
          </div>
        )}
      </div>

      {selectedFile && (
        <div className={styles.analysisContainer}>
          <ContractAnalysis file={selectedFile} onReset={handleReset} />
        </div>
      )}

      <section className={styles.contractsSection}>
        <div className={styles.sectionHeader}>
          <h2>Deine Verträge</h2>
          <button className={styles.refreshButton} onClick={fetchContracts} aria-label="Aktualisieren">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M4 4V9H4.58152M19.9381 11C19.446 7.05369 16.0796 4 12 4C8.64262 4 5.76829 6.06817 4.58152 9M4.58152 9H9M20 20V15H19.4185M19.4185 15C18.2317 17.9318 15.3574 20 12 20C7.92038 20 4.55399 16.9463 4.06189 13M19.4185 15H15" 
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        {loading ? (
          <div className={styles.loadingContainer}>
            <div className={styles.loadingSpinner}></div>
            <p>Verträge werden geladen...</p>
          </div>
        ) : errorMessage ? (
          <div className={styles.errorContainer}>
            <div className={styles.errorIcon}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 9V11M12 15H12.01M5.07183 19H18.9282C20.4678 19 21.4301 17.3333 20.6603 16L13.7321 4C12.9623 2.66667 11.0378 2.66667 10.268 4L3.33978 16C2.56998 17.3333 3.53223 19 5.07183 19Z" 
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <p>{errorMessage}</p>
            <button className={styles.retryButton} onClick={fetchContracts}>
              Erneut versuchen
            </button>
          </div>
        ) : contracts.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M8 14V18M12 14V18M16 14V18M3 10H21M5 5H19C20.1046 5 21 5.89543 21 7V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19V7C3 5.89543 3.89543 5 5 5Z" 
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <h3>Keine Verträge vorhanden</h3>
            <p>Lade deinen ersten Vertrag hoch, um ihn hier zu sehen.</p>
          </div>
        ) : (
          <div className={styles.tableContainer}>
            <table className={styles.contractsTable}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Kündigungsfrist</th>
                  <th>Ablaufdatum</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {contracts.map((contract) => (
                  <tr 
                    key={contract._id} 
                    onClick={() => handleRowClick(contract)} 
                    className={styles.tableRow}
                  >
                    <td>
                      <div className={styles.contractName}>
                        <div className={styles.contractIcon}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M9 12H15M9 16H15M17 21H7C5.89543 21 5 20.1046 5 19V5C5 3.89543 5.89543 3 7 3H12.5858C12.851 3 13.1054 3.10536 13.2929 3.29289L18.7071 8.70711C18.8946 8.89464 19 9.149 19 9.41421V19C19 20.1046 18.1046 21 17 21Z" 
                              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                        {contract.name}
                      </div>
                    </td>
                    <td>{contract.kuendigung || "—"}</td>
                    <td>{formatDate(contract.expiryDate)}</td>
                    <td>
                      <span className={`${styles.statusBadge} ${getStatusColor(contract.status)}`}>
                        {contract.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className={styles.historySection}>
        <div className={styles.sectionHeader}>
          <h2>Analyse-Historie</h2>
        </div>
        <AnalysisHistory />
      </section>

      {selectedContract && (
        <ContractDetailsModal
          contract={selectedContract}
          onClose={() => setShowDetails(false)}
          show={showDetails}
        />
      )}
    </div>
  );
}