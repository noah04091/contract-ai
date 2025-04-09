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

  const fetchContracts = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get<Contract[]>("https://contract-ai-backend.onrender.com/contracts", {
        headers: { Authorization: token || "" },
      });
      setContracts(res.data);
    } catch (err) {
      console.error("❌ Fehler beim Laden der Verträge:", err);
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

  const handleReset = () => {
    setSelectedFile(null);
  };

  const handleRowClick = (contract: Contract) => {
    setSelectedContract(contract);
    setShowDetails(true);
  };

  return (
    <div className={styles.container}>
      <h2>📑 Vertragsanalyse & Vergleich</h2>

      <div className={styles.uploadSection}>
        <input type="file" onChange={handleFileChange} />
        {showSuccess && <p className={styles.successMessage}>✅ Datei erfolgreich ausgewählt!</p>}
      </div>

      {selectedFile && (
        <div className={styles.analysisSection}>
          <ContractAnalysis file={selectedFile} onReset={handleReset} />
        </div>
      )}

      <h3>🧾 Deine Verträge</h3>
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
            <tr key={contract._id} onClick={() => handleRowClick(contract)} className={styles.clickableRow}>
              <td>{contract.name}</td>
              <td>{contract.kuendigung || "—"}</td>
              <td>{contract.expiryDate || "—"}</td>
              <td>{contract.status}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3>📚 Analyse-Historie</h3>
      <AnalysisHistory />

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
