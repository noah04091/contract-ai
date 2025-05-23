import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import styles from "./Dashboard.module.css";
import ContractNotification from "../components/ContractNotification";
import LegalPulseOverview from "../components/LegalPulseOverview";
import GeneratedContractsSection from "../components/GeneratedContractsSection";
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
  isGenerated?: boolean;
  createdAt?: string;
  legalPulse?: {
    riskScore: number | null;
  };
}

interface UserData {
  email: string;
  analysisCount?: number;
  analysisLimit?: number;
  subscriptionPlan?: string;
}

export default function Dashboard() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [filteredContracts, setFilteredContracts] = useState<Contract[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [userEmail, setUserEmail] = useState("");
  const [userData, setUserData] = useState<UserData | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  // Hilfsfunktion für die Farbbestimmung des Fortschrittsbalkens
  const getProgressBarColor = () => {
    if (!userData || !userData.analysisCount || !userData.analysisLimit) return "";
    
    const usagePercentage = (userData.analysisCount / userData.analysisLimit) * 100;
    
    if (usagePercentage >= 100) return styles.progressRed;
    if (usagePercentage >= 80) return styles.progressOrange;
    return styles.progressGreen;
  };

  // ✅ Korrigierte Funktionen mit Null-Checks
  const countStatus = (status: string) => {
    return contracts.filter((c) => c && c.status === status).length;
  };

  const countWithReminder = () => {
    return contracts.filter((c) => c && c.reminder).length;
  };

  const averageLaufzeit = () => {
    const laufzeiten = contracts
      .filter((c) => c && c.laufzeit && typeof c.laufzeit === 'string') // ✅ Null-Checks hinzugefügt
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
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [userResponse, contractsResponse] = await Promise.all([
          fetch("/api/auth/me", { credentials: "include" }),
          fetch("/api/contracts", { credentials: "include" })
        ]);
        
        const userDataResponse = await userResponse.json();
        const contractsData = await contractsResponse.json();
        
        setUserEmail(userDataResponse.email);
        setUserData(userDataResponse); // Speichern der kompletten Nutzerdaten
        setContracts(contractsData);
        setFilteredContracts(contractsData);
      } catch (err) {
        console.error("Error loading data:", err);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, []);

  useEffect(() => {
    const filtered = contracts.filter((contract) => {
      // ✅ Null-Checks für contract properties hinzufügen
      if (!contract) return false;
      
      const name = contract.name || '';
      const laufzeit = contract.laufzeit || '';
      const kuendigung = contract.kuendigung || '';
      
      const combinedText = `${name} ${laufzeit} ${kuendigung}`.toLowerCase();
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
      setNotification({ message: "Dein Abo wurde erfolgreich aktiviert", type: "success" });
    } else if (status === "error") {
      setNotification({ message: "Es gab ein Problem beim Bezahlen. Bitte versuche es erneut.", type: "error" });
    }
  }, [location.search]);

  const handleFileUpload = async () => {
    if (!file) return;
    
    setIsLoading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
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
        setNotification({ message: "Vertrag erfolgreich hochgeladen", type: "success" });
      } else {
        setNotification({ message: `Fehler beim Hochladen: ${data.message}`, type: "error" });
      }
    } catch (err) {
      console.error(err);
      setNotification({ message: "Ein unerwarteter Fehler ist aufgetreten", type: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!confirm("Bist du sicher, dass du diesen Vertrag löschen möchtest?")) return;

    setIsLoading(true);
    try {
      const res = await fetch(`/api/contracts/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (res.ok) {
        const updated = contracts.filter((c) => c._id !== id);
        setContracts(updated);
        setFilteredContracts(updated);
        setNotification({ message: "Vertrag erfolgreich gelöscht", type: "success" });
      } else {
        setNotification({ message: "Fehler beim Löschen", type: "error" });
      }
    } catch (err) {
      console.error(err);
      setNotification({ message: "Ein unerwarteter Fehler ist aufgetreten", type: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleReminder = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    setIsLoading(true);
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
      setNotification({ message: "Erinnerung wurde aktualisiert", type: "success" });
    } catch (err) {
      console.error(err);
      setNotification({ message: "Fehler beim Umschalten des Reminders", type: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportICS = (contract: Contract, e: React.MouseEvent) => {
    e.stopPropagation();
    if (contract.expiryDate) {
      generateICS({ name: contract.name, expiryDate: contract.expiryDate });
      setNotification({ message: `Kalendereintrag für "${contract.name}" erstellt`, type: "success" });
    } else {
      setNotification({ message: "Kein Ablaufdatum vorhanden", type: "error" });
    }
  };

  const exportToCSV = () => {
    const headers = ["Name", "Laufzeit", "Kündigungsfrist", "Ablaufdatum", "Status"];
    const rows = contracts.map((c) => [
      `"${c.name || ""}"`,
      `"${c.laufzeit || ""}"`,
      `"${c.kuendigung || ""}"`,
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
    
    setNotification({ message: "CSV-Export erfolgreich erstellt", type: "success" });
  };

  const exportAllICS = () => {
    const soonExpiring = contracts.filter((c) => {
      if (!c || !c.expiryDate) return false;
      const daysLeft = (new Date(c.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
      return daysLeft <= 30 && daysLeft > 0;
    });

    if (soonExpiring.length === 0) {
      setNotification({ message: "Keine bald ablaufenden Verträge vorhanden", type: "error" });
      return;
    }

    soonExpiring.forEach((c) => {
      generateICS({ name: c.name, expiryDate: c.expiryDate! });
    });

    setNotification({ message: `${soonExpiring.length} Kalendereinträge exportiert`, type: "success" });
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case "Aktiv": return <span className={styles.statusIconActive}>●</span>;
      case "Bald ablaufend": return <span className={styles.statusIconWarning}>●</span>;
      case "Abgelaufen": return <span className={styles.statusIconExpired}>●</span>;
      default: return <span className={styles.statusIconUnknown}>●</span>;
    }
  };

  return (
    <div className={styles.dashboardContainer}>
      <Helmet>
        <title>Dashboard – Contract AI</title>
        <meta name="description" content="Deine Vertragsübersicht mit Analyse, Export und Reminder auf einen Blick." />
      </Helmet>

      <div className={styles.dashboardHeader}>
        <h1>Vertragsübersicht</h1>
        
        {userEmail && (
          <div className={styles.userInfoContainer}>
            <svg className={styles.userIcon} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 12C14.7614 12 17 9.76142 17 7C17 4.23858 14.7614 2 12 2C9.23858 2 7 4.23858 7 7C7 9.76142 9.23858 12 12 12Z" fill="currentColor" fillOpacity="0.6"/>
              <path d="M12.0002 14.5C6.99016 14.5 2.91016 17.86 2.91016 22C2.91016 22.28 3.13016 22.5 3.41016 22.5H20.5902C20.8702 22.5 21.0902 22.28 21.0902 22C21.0902 17.86 17.0102 14.5 12.0002 14.5Z" fill="currentColor" fillOpacity="0.6"/>
            </svg>
            <span className={styles.userEmail}>{userEmail}</span>
          </div>
        )}
      </div>

      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}

      {/* Analyse-Limit Warnung */}
      {userData && 
       userData.analysisCount !== undefined && 
       userData.analysisLimit !== undefined && 
       userData.analysisCount >= userData.analysisLimit && 
       userData.subscriptionPlan !== "premium" && (
        <div className={styles.analysisLimitWarning}>
          <div className={styles.warningContent}>
            <svg className={styles.warningIcon} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M12 8V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M12 16H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>Du hast dein monatliches Analyse-Limit erreicht</span>
          </div>
          <button 
            className={`${styles.actionButton} ${styles.upgradeButton}`}
            onClick={() => navigate('/upgrade')}
          >
            Jetzt upgraden
          </button>
        </div>
      )}

      {/* Analyse-Fortschrittsbalken */}
      {userData && 
       userData.analysisCount !== undefined && 
       userData.analysisLimit !== undefined && 
       userData.analysisLimit > 0 && (
        <div className={styles.analysisProgressContainer}>
          <div className={styles.progressInfo}>
            <span>{userData.analysisCount} / {userData.analysisLimit} Analysen genutzt</span>
          </div>
          <div className={styles.progressBarContainer}>
            <div 
              className={`${styles.progressBar} ${getProgressBarColor()}`}
              style={{ width: `${Math.min((userData.analysisCount / userData.analysisLimit) * 100, 100)}%` }}
            ></div>
          </div>
        </div>
      )}

      <div className={styles.dashboardContent}>
        <div className={styles.metricCards}>
          <div className={styles.metricCard}>
            <div className={styles.metricValue}>{contracts.length}</div>
            <div className={styles.metricLabel}>Verträge insgesamt</div>
          </div>
          <div className={styles.metricCard}>
            <div className={styles.metricValue}>
              {isLoading ? "..." : countWithReminder()}
            </div>
            <div className={styles.metricLabel}>Mit Erinnerung</div>
          </div>
          <div className={styles.metricCard}>
            <div className={styles.metricValue}>
              {isLoading ? "..." : averageLaufzeit()}
            </div>
            <div className={styles.metricLabel}>Ø Laufzeit (Monate)</div>
          </div>
          <div className={styles.metricCard}>
            <div className={styles.metricValue}>
              {isLoading ? "..." : countStatus("Aktiv")}
            </div>
            <div className={styles.metricLabel}>Aktive Verträge</div>
          </div>
          <div className={styles.metricCard}>
            <div className={styles.metricValue}>
              {isLoading ? "..." : countStatus("Bald ablaufend")}
            </div>
            <div className={styles.metricLabel}>Bald ablaufend</div>
          </div>
        </div>

        {/* Generierte Verträge Sektion */}
        <GeneratedContractsSection contracts={contracts} />

        <ContractNotification contracts={contracts} />

        {/* Legal Pulse Overview - Neue Komponente */}
        <LegalPulseOverview contracts={contracts} />

        <div className={styles.actionsContainer}>
          <div className={styles.searchContainer}>
            <svg className={styles.searchIcon} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M11 19C15.4183 19 19 15.4183 19 11C19 6.58172 15.4183 3 11 3C6.58172 3 3 6.58172 3 11C3 15.4183 6.58172 19 11 19Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M21 21L16.65 16.65" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <input
              type="text"
              placeholder="Vertrag suchen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={styles.searchInput}
            />
          </div>

          <div className={styles.filterContainer}>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className={styles.filterSelect}
            >
              <option value="all">Alle Status</option>
              <option value="Aktiv">Aktiv</option>
              <option value="Bald ablaufend">Bald ablaufend</option>
              <option value="Abgelaufen">Abgelaufen</option>
            </select>
          </div>

          <div className={styles.buttonGroup}>
            <button 
              className={`${styles.actionButton} ${styles.primaryButton}`}
              onClick={() => setShowModal(true)}
            >
              <svg className={styles.buttonIcon} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 5V19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Vertrag hinzufügen
            </button>
            
            <button 
              className={styles.actionButton}
              onClick={exportToCSV}
            >
              <svg className={styles.buttonIcon} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M7 10L12 15L17 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 15V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              CSV Export
            </button>
            
            <button 
              className={styles.actionButton}
              onClick={exportAllICS}
            >
              <svg className={styles.buttonIcon} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M19 4H5C3.89543 4 3 4.89543 3 6V20C3 21.1046 3.89543 22 5 22H19C20.1046 22 21 21.1046 21 20V6C21 4.89543 20.1046 4 19 4Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M16 2V6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M8 2V6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M3 10H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              ICS Export
            </button>
          </div>
        </div>

        <div className={styles.tableContainer}>
          {isLoading ? (
            <div className={styles.loadingContainer}>
              <div className={styles.loadingSpinner}></div>
              <p>Daten werden geladen...</p>
            </div>
          ) : filteredContracts.length > 0 ? (
            <div className={styles.tableWrapper}>
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
                    <tr 
                      key={contract._id} 
                      className={styles.contractRow}
                      onClick={() => navigate(`/contracts/${contract._id}`)}
                    >
                      <td className={styles.nameCell}>{contract.name || "—"}</td>
                      <td>{contract.laufzeit || "—"}</td>
                      <td>{contract.kuendigung || "—"}</td>
                      <td>{contract.expiryDate || "—"}</td>
                      <td>
                        <div className={styles.statusCell}>
                          {getStatusIcon(contract.status)}
                          <span>{contract.status || "Unbekannt"}</span>
                        </div>
                      </td>
                      <td>
                        <div className={styles.actionButtons}>
                          <button 
                            className={`${styles.iconButton} ${styles.reminderButton} ${contract.reminder ? styles.active : ''}`} 
                            onClick={(e) => toggleReminder(contract._id, e)} 
                            title={contract.reminder ? "Erinnerung deaktivieren" : "Erinnerung aktivieren"}
                          >
                            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M18 8C18 6.4087 17.3679 4.88258 16.2426 3.75736C15.1174 2.63214 13.5913 2 12 2C10.4087 2 8.88258 2.63214 7.75736 3.75736C6.63214 4.88258 6 6.4087 6 8C6 15 3 17 3 17H21C21 17 18 15 18 8Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              <path d="M13.73 21C13.5542 21.3031 13.3019 21.5547 12.9982 21.7295C12.6946 21.9044 12.3504 21.9965 12 21.9965C11.6496 21.9965 11.3054 21.9044 11.0018 21.7295C10.6982 21.5547 10.4458 21.3031 10.27 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </button>
                          <button 
                            className={`${styles.iconButton} ${styles.calendarButton}`} 
                            onClick={(e) => handleExportICS(contract, e)} 
                            title="Zum Kalender hinzufügen"
                          >
                            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M19 4H5C3.89543 4 3 4.89543 3 6V20C3 21.1046 3.89543 22 5 22H19C20.1046 22 21 21.1046 21 20V6C21 4.89543 20.1046 4 19 4Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              <path d="M16 2V6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              <path d="M8 2V6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              <path d="M3 10H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </button>
                          <button 
                            className={`${styles.iconButton} ${styles.deleteButton}`} 
                            onClick={(e) => handleDelete(contract._id, e)} 
                            title="Vertrag löschen"
                          >
                            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M3 6H5H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              <path d="M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6H19Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className={styles.emptyState}>
              <svg className={styles.emptyStateIcon} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M13 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V9L13 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M13 2V9H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <line x1="8" y1="13" x2="16" y2="13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <line x1="8" y1="17" x2="16" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              <h3>Keine Verträge gefunden</h3>
              <p>Füge einen neuen Vertrag hinzu oder ändere deine Filtereinstellungen.</p>
              <button 
                className={`${styles.actionButton} ${styles.primaryButton}`}
                onClick={() => setShowModal(true)}
              >
                Vertrag hinzufügen
              </button>
            </div>
          )}
        </div>

        <div className={styles.chartGrid}>
          <div className={styles.chartCard}>
            <h3>Statusverteilung</h3>
            <div className={styles.chartWrapper}>
              <StatusPieChart contracts={contracts} />
            </div>
          </div>
          <div className={styles.chartCard}>
            <h3>Uploads pro Monat</h3>
            <div className={styles.chartWrapper}>
              <UploadBarChart contracts={contracts} />
            </div>
          </div>
        </div>
      </div>

      {showModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2>Vertrag hochladen</h2>
              <button 
                className={styles.modalCloseButton} 
                onClick={() => setShowModal(false)}
              >
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.fileUploadContainer}>
                <div className={styles.fileUploadArea}>
                  {file ? (
                    <div className={styles.fileSelected}>
                      <svg className={styles.fileIcon} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M14 2V8H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M16 13H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M16 17H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M10 9H9H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <span className={styles.fileName}>{file.name}</span>
                      <button 
                        className={styles.removeFileButton}
                        onClick={() => setFile(null)}
                      >
                        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <>
                      <svg className={styles.uploadIcon} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M17 8L12 3L7 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M12 3V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <h3>Datei hierher ziehen</h3>
                      <p>oder</p>
                      <label className={styles.fileInputLabel}>
                        Datei auswählen
                        <input
                          type="file"
                          accept="application/pdf"
                          onChange={(e) => setFile(e.target.files?.[0] || null)}
                          className={styles.fileInput}
                        />
                      </label>
                      <p className={styles.fileHint}>Nur PDF-Dateien werden unterstützt</p>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button 
                className={styles.secondaryButton}
                onClick={() => setShowModal(false)}
              >
                Abbrechen
              </button>
              <button 
                className={`${styles.primaryButton} ${!file ? styles.disabled : ''}`}
                onClick={handleFileUpload}
                disabled={!file}
              >
                {isLoading ? (
                  <>
                    <div className={styles.buttonSpinner}></div>
                    <span>Wird hochgeladen...</span>
                  </>
                ) : (
                  <>
                    <svg className={styles.buttonIcon} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M17 8L12 3L7 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M12 3V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span>Hochladen</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}