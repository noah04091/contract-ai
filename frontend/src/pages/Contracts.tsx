import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FileText, RefreshCw, Upload, CheckCircle, AlertCircle, 
  Plus, Calendar, Clock, FileSearch, Trash2, Eye, Edit, Filter, X
} from "lucide-react";
import styles from "../styles/Contracts.module.css";
import ContractAnalysis from "../components/ContractAnalysis";
import AnalysisHistory from "../components/AnalysisHistory";
import ContractDetailsModal from "../components/ContractDetailsModal";
import { apiCall } from "../utils/api";

interface Contract {
  _id: string;
  name: string;
  kuendigung: string;
  expiryDate: string;
  status: string;
  createdAt: string;
  content?: string;
  isGenerated?: boolean;
}

// ✅ NEU: Filter-Typen
type StatusFilter = 'alle' | 'aktiv' | 'bald_ablaufend' | 'abgelaufen' | 'gekündigt';
type DateFilter = 'alle' | 'letzte_7_tage' | 'letzte_30_tage' | 'letztes_jahr';

export default function Contracts() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [filteredContracts, setFilteredContracts] = useState<Contract[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [activeSection, setActiveSection] = useState<'upload' | 'contracts' | 'analysis'>('contracts');
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  // ✅ NEU: Filter States
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('alle');
  const [dateFilter, setDateFilter] = useState<DateFilter>('alle');
  const [showFilters, setShowFilters] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ✅ Verbesserte fetchContracts mit apiCall
  const fetchContracts = async () => {
    try {
      setLoading(true);
      setRefreshing(true);
      
      const data = await apiCall("/contracts") as Contract[];
      setContracts(data);
      setFilteredContracts(data);
      setError(null);
      
      console.log("✅ Verträge erfolgreich geladen:", data.length);
    } catch (err) {
      console.error("❌ Fehler beim Laden der Verträge:", err);
      setError("Die Verträge konnten nicht geladen werden. Bitte versuche es später erneut.");
      setContracts([]);
      setFilteredContracts([]);
    } finally {
      setLoading(false);
      setTimeout(() => setRefreshing(false), 600);
    }
  };

  // ✅ NEU: Erweiterte Filterfunktion
  const applyFilters = () => {
    let filtered = [...contracts];

    // Text-Suche
    if (searchQuery.trim()) {
      filtered = filtered.filter(contract => 
        contract.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contract.status.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (contract.kuendigung && contract.kuendigung.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // Status-Filter
    if (statusFilter !== 'alle') {
      filtered = filtered.filter(contract => {
        const status = contract.status.toLowerCase();
        switch (statusFilter) {
          case 'aktiv':
            return status === 'aktiv' || status === 'gültig';
          case 'bald_ablaufend':
            return status === 'läuft ab' || status === 'bald fällig';
          case 'abgelaufen':
            return status === 'abgelaufen' || status === 'beendet';
          case 'gekündigt':
            return status === 'gekündigt';
          default:
            return true;
        }
      });
    }

    // Datums-Filter
    if (dateFilter !== 'alle') {
      const now = new Date();
      filtered = filtered.filter(contract => {
        const createdDate = new Date(contract.createdAt);
        const diffTime = now.getTime() - createdDate.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        switch (dateFilter) {
          case 'letzte_7_tage':
            return diffDays <= 7;
          case 'letzte_30_tage':
            return diffDays <= 30;
          case 'letztes_jahr':
            return diffDays <= 365;
          default:
            return true;
        }
      });
    }

    setFilteredContracts(filtered);
  };

  // ✅ Suchfunktion implementiert
  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  // ✅ NEU: Filter zurücksetzen
  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter('alle');
    setDateFilter('alle');
    setShowFilters(false);
  };

  // ✅ Filter anwenden wenn sich etwas ändert
  useEffect(() => {
    applyFilters();
  }, [contracts, searchQuery, statusFilter, dateFilter]);

  // ✅ Verträge beim Laden abrufen
  useEffect(() => {
    fetchContracts();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
      setShowSuccess(true);
      setActiveSection('upload');
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
      setActiveSection('upload');
      setTimeout(() => setShowSuccess(false), 3000);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setActiveSection('contracts');
    // ✅ Nach Upload wieder Verträge laden
    fetchContracts();
  };

  const handleRowClick = (contract: Contract) => {
    setSelectedContract(contract);
    setShowDetails(true);
  };

  // ✅ Verbesserte Löschfunktion
  const handleDeleteContract = async (contractId: string, contractName: string) => {
    if (!confirm(`Möchtest du den Vertrag "${contractName}" wirklich löschen?`)) {
      return;
    }

    try {
      await apiCall(`/contracts/${contractId}`, {
        method: 'DELETE'
      });
      
      console.log("✅ Vertrag gelöscht:", contractName);
      // Verträge neu laden
      fetchContracts();
    } catch (err) {
      console.error("❌ Fehler beim Löschen:", err);
      alert("Fehler beim Löschen des Vertrags. Bitte versuche es erneut.");
    }
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

  // Format date helper function
  const formatDate = (dateString: string): string => {
    if (!dateString) return "—";
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("de-DE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
      });
    } catch {
      return dateString;
    }
  };

  const activateFileInput = () => {
    fileInputRef.current?.click();
  };

  // ✅ NEU: Aktive Filter zählen
  const activeFiltersCount = () => {
    let count = 0;
    if (statusFilter !== 'alle') count++;
    if (dateFilter !== 'alle') count++;
    if (searchQuery.trim()) count++;
    return count;
  };

  return (
    <div className={styles.pageContainer}>
      <motion.div 
        className={styles.container}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className={styles.header}>
          <motion.h1 
            className={styles.title}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}
          >
            <FileText size={28} className={styles.titleIcon} />
            Vertragsanalyse & Verwaltung
          </motion.h1>
          <motion.p 
            className={styles.subtitle}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            Verträge hochladen, analysieren und verwalten
          </motion.p>
        </div>

        <div className={styles.tabsContainer}>
          <button 
            className={`${styles.tabButton} ${activeSection === 'contracts' ? styles.activeTab : ''}`}
            onClick={() => setActiveSection('contracts')}
          >
            <FileText size={18} />
            <span>Verträge</span>
          </button>
          <button 
            className={`${styles.tabButton} ${activeSection === 'upload' ? styles.activeTab : ''}`}
            onClick={() => setActiveSection('upload')}
          >
            <Upload size={18} />
            <span>Hochladen</span>
          </button>
          <button 
            className={`${styles.tabButton} ${activeSection === 'analysis' ? styles.activeTab : ''}`}
            onClick={() => setActiveSection('analysis')}
          >
            <FileSearch size={18} />
            <span>Analyse-Historie</span>
          </button>
        </div>

        <AnimatePresence mode="wait">
          {activeSection === 'upload' && (
            <motion.div 
              key="upload-section"
              className={styles.section}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className={styles.sectionHeader}>
                <h2>Vertrag hochladen</h2>
                <p className={styles.sectionDescription}>
                  Lade einen Vertrag hoch, um ihn zu analysieren und zu verwalten
                </p>
              </div>
              
              <div 
                className={`${styles.uploadArea} ${dragActive ? styles.dragActive : ''}`} 
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={activateFileInput}
              >
                <input 
                  type="file" 
                  onChange={handleFileChange} 
                  className={styles.fileInput}
                  accept=".pdf,.doc,.docx"
                  id="contractFile"
                  ref={fileInputRef}
                />
                
                {selectedFile ? (
                  <div className={styles.filePreview}>
                    <div className={styles.fileIcon}>
                      <FileText size={40} />
                    </div>
                    <div className={styles.fileInfo}>
                      <h3 className={styles.fileName}>{selectedFile.name}</h3>
                      <p className={styles.fileSize}>
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    {showSuccess && (
                      <div className={styles.successMessage}>
                        <CheckCircle size={16} />
                        <span>Datei erfolgreich ausgewählt</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className={styles.uploadPrompt}>
                    <div className={styles.uploadIcon}>
                      <Upload size={40} />
                    </div>
                    <h3>Datei hierher ziehen</h3>
                    <p>oder klicke, um eine Datei auszuwählen</p>
                    <div className={styles.uploadFormats}>
                      Unterstützte Formate: PDF, DOC, DOCX
                    </div>
                  </div>
                )}
              </div>

              {selectedFile && (
                <div className={styles.analysisContainer}>
                  <ContractAnalysis file={selectedFile} onReset={handleReset} />
                </div>
              )}
            </motion.div>
          )}

          {activeSection === 'contracts' && (
            <motion.div 
              key="contracts-section"
              className={styles.section}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className={styles.sectionHeader}>
                <h2>Deine Verträge</h2>
                <motion.button 
                  className={styles.refreshButton} 
                  onClick={fetchContracts} 
                  aria-label="Aktualisieren"
                  disabled={refreshing}
                  animate={{ rotate: refreshing ? 360 : 0 }}
                  transition={{ duration: 1, ease: "linear", repeat: refreshing ? Infinity : 0 }}
                >
                  <RefreshCw size={16} />
                </motion.button>
              </div>

              <div className={styles.actionsBar}>
                <div className={styles.searchContainer}>
                  <input 
                    type="text" 
                    placeholder="Verträge durchsuchen..." 
                    className={styles.searchInput}
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                  />
                </div>
                
                {/* ✅ NEU: Filter Button */}
                <div className={styles.filterControls}>
                  <button 
                    className={`${styles.filterButton} ${showFilters ? styles.filterActive : ''}`}
                    onClick={() => setShowFilters(!showFilters)}
                  >
                    <Filter size={16} />
                    <span>Filter</span>
                    {activeFiltersCount() > 0 && (
                      <span className={styles.filterBadge}>{activeFiltersCount()}</span>
                    )}
                  </button>
                </div>

                <motion.button 
                  className={styles.newContractButton}
                  onClick={() => setActiveSection('upload')}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Plus size={16} />
                  <span>Neuer Vertrag</span>
                </motion.button>
              </div>

              {/* ✅ NEU: Erweiterte Filter */}
              {showFilters && (
                <motion.div 
                  className={styles.filterPanel}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className={styles.filterSection}>
                    <label>Status:</label>
                    <select 
                      value={statusFilter} 
                      onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                      className={styles.filterSelect}
                    >
                      <option value="alle">Alle Status</option>
                      <option value="aktiv">Aktiv/Gültig</option>
                      <option value="bald_ablaufend">Bald ablaufend</option>
                      <option value="abgelaufen">Abgelaufen</option>
                      <option value="gekündigt">Gekündigt</option>
                    </select>
                  </div>

                  <div className={styles.filterSection}>
                    <label>Zeitraum:</label>
                    <select 
                      value={dateFilter} 
                      onChange={(e) => setDateFilter(e.target.value as DateFilter)}
                      className={styles.filterSelect}
                    >
                      <option value="alle">Alle Zeiträume</option>
                      <option value="letzte_7_tage">Letzte 7 Tage</option>
                      <option value="letzte_30_tage">Letzte 30 Tage</option>
                      <option value="letztes_jahr">Letztes Jahr</option>
                    </select>
                  </div>

                  <button 
                    className={styles.clearFiltersButton}
                    onClick={clearFilters}
                  >
                    <X size={14} />
                    <span>Filter zurücksetzen</span>
                  </button>
                </motion.div>
              )}

              {/* ✅ Suchergebnisse-Anzeige */}
              {(searchQuery || statusFilter !== 'alle' || dateFilter !== 'alle') && (
                <div className={styles.searchResults}>
                  <p>
                    {filteredContracts.length} Ergebnis{filteredContracts.length !== 1 ? 'se' : ''} 
                    {searchQuery && ` für "${searchQuery}"`}
                    {activeFiltersCount() > 1 && ` (${activeFiltersCount()} Filter aktiv)`}
                  </p>
                </div>
              )}

              {loading && !refreshing ? (
                <div className={styles.loadingContainer}>
                  <div className={styles.loadingSpinner}></div>
                  <p>Verträge werden geladen...</p>
                </div>
              ) : errorMessage ? (
                <div className={styles.errorContainer}>
                  <AlertCircle size={40} className={styles.errorIcon} />
                  <p className={styles.errorMessage}>{errorMessage}</p>
                  <motion.button 
                    className={styles.retryButton} 
                    onClick={fetchContracts}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <RefreshCw size={16} />
                    <span>Erneut versuchen</span>
                  </motion.button>
                </div>
              ) : filteredContracts.length === 0 ? (
                <div className={styles.emptyState}>
                  <FileText size={64} className={styles.emptyIcon} />
                  <h3>
                    {activeFiltersCount() > 0 ? "Keine Ergebnisse gefunden" : "Keine Verträge vorhanden"}
                  </h3>
                  <p>
                    {activeFiltersCount() > 0 
                      ? "Probiere andere Filtereinstellungen oder lade neue Verträge hoch."
                      : "Lade deinen ersten Vertrag hoch, um ihn hier zu sehen."
                    }
                  </p>
                  {activeFiltersCount() === 0 && (
                    <motion.button 
                      className={styles.uploadButton}
                      onClick={() => setActiveSection('upload')}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Upload size={16} />
                      <span>Vertrag hochladen</span>
                    </motion.button>
                  )}
                </div>
              ) : (
                <div className={styles.tableContainer}>
                  <table className={styles.contractsTable}>
                    <thead>
                      <tr>
                        <th>Vertragsname</th>
                        <th>Kündigungsfrist</th>
                        <th>Ablaufdatum</th>
                        <th>Status</th>
                        <th>Upload-Datum</th>
                        <th>Aktionen</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredContracts.map((contract) => (
                        <motion.tr 
                          key={contract._id} 
                          className={styles.tableRow}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3 }}
                          onClick={() => handleRowClick(contract)}
                          style={{ cursor: 'pointer' }}
                        >
                          <td>
                            <div className={styles.contractName}>
                              <div className={styles.contractIcon}>
                                <FileText size={16} />
                              </div>
                              <div>
                                <span className={styles.contractNameText}>{contract.name}</span>
                                {contract.isGenerated && (
                                  <span className={styles.generatedBadge}>Generiert</span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td>
                            <div className={styles.contractDetail}>
                              <Clock size={14} className={styles.detailIcon} />
                              <span>{contract.kuendigung || "—"}</span>
                            </div>
                          </td>
                          <td>
                            <div className={styles.contractDetail}>
                              <Calendar size={14} className={styles.detailIcon} />
                              <span>{formatDate(contract.expiryDate)}</span>
                            </div>
                          </td>
                          <td>
                            <span className={`${styles.statusBadge} ${getStatusColor(contract.status)}`}>
                              {contract.status}
                            </span>
                          </td>
                          <td>
                            <span className={styles.uploadDate}>
                              {formatDate(contract.createdAt)}
                            </span>
                          </td>
                          <td>
                            <div className={styles.actionButtons}>
                              <button 
                                className={styles.actionButton}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRowClick(contract);
                                }}
                                title="Details anzeigen"
                              >
                                <Eye size={16} />
                              </button>
                              <button 
                                className={styles.actionButton}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  console.log("Edit contract:", contract._id);
                                }}
                                title="Bearbeiten"
                              >
                                <Edit size={16} />
                              </button>
                              <button 
                                className={`${styles.actionButton} ${styles.deleteButton}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteContract(contract._id, contract.name);
                                }}
                                title="Löschen"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </motion.div>
          )}

          {activeSection === 'analysis' && (
            <motion.div 
              key="analysis-section"
              className={styles.section}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className={styles.sectionHeader}>
                <h2>Analyse-Historie</h2>
                <p className={styles.sectionDescription}>
                  Übersicht deiner durchgeführten Vertragsanalysen
                </p>
              </div>
              <AnalysisHistory />
            </motion.div>
          )}
        </AnimatePresence>

        {selectedContract && (
          <ContractDetailsModal
            contract={selectedContract}
            onClose={() => setShowDetails(false)}
            show={showDetails}
          />
        )}
      </motion.div>
    </div>
  );
}