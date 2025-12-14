// 📁 pages/LegalLensStart.tsx
// Legal Lens Startseite - Vertragsauswahl oder Upload

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Search, Upload, FileText, ChevronRight, Loader, AlertCircle } from 'lucide-react';
import styles from './LegalLensStart.module.css';

interface Contract {
  _id: string;
  name: string;
  uploadedAt?: string;
  createdAt?: string;
  status?: string;
  analysis?: {
    contractType?: string;
  };
}

const LegalLensStart = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [contracts, setContracts] = useState<Contract[]>([]);
  const [filteredContracts, setFilteredContracts] = useState<Contract[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  // API URL Helper
  const getApiUrl = () => {
    if (import.meta.env.VITE_API_URL) {
      return import.meta.env.VITE_API_URL;
    }
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:5000';
    }
    return 'https://api.contract-ai.de';
  };

  // Verträge laden
  useEffect(() => {
    const fetchContracts = async () => {
      try {
        const apiUrl = getApiUrl();
        const response = await fetch(`${apiUrl}/api/contracts`, {
          credentials: 'include'
        });

        if (!response.ok) {
          throw new Error('Fehler beim Laden der Verträge');
        }

        const data = await response.json();
        // API gibt { success: true, contracts: [...] } zurück
        const contractsList = Array.isArray(data) ? data : (data.contracts || []);
        setContracts(contractsList);
        setFilteredContracts(contractsList);
      } catch (err) {
        console.error('[Legal Lens Start] Error:', err);
        setError(err instanceof Error ? err.message : 'Unbekannter Fehler');
      } finally {
        setIsLoading(false);
      }
    };

    fetchContracts();
  }, []);

  // Suche filtern
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredContracts(contracts);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = contracts.filter(contract =>
      contract.name.toLowerCase().includes(query) ||
      contract.analysis?.contractType?.toLowerCase().includes(query)
    );
    setFilteredContracts(filtered);
  }, [searchQuery, contracts]);

  // Datei hochladen
  const handleFileUpload = async (file: File) => {
    if (!file.type.includes('pdf')) {
      setError('Bitte laden Sie eine PDF-Datei hoch');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const apiUrl = getApiUrl();
      const formData = new FormData();
      formData.append('contract', file);

      const response = await fetch(`${apiUrl}/api/upload`, {
        method: 'POST',
        credentials: 'include',
        body: formData
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Upload fehlgeschlagen');
      }

      const data = await response.json();

      // Direkt zu Legal Lens navigieren
      if (data.contractId || data._id) {
        navigate(`/legal-lens/${data.contractId || data._id}`);
      } else {
        throw new Error('Keine Vertrags-ID erhalten');
      }
    } catch (err) {
      console.error('[Legal Lens Start] Upload error:', err);
      setError(err instanceof Error ? err.message : 'Upload fehlgeschlagen');
      setIsUploading(false);
    }
  };

  // Drag & Drop Handler
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <>
      <Helmet>
        <title>Legal Lens | Contract AI</title>
        <meta name="description" content="Analysieren Sie Ihre Verträge interaktiv mit KI - Klauseln verstehen, Risiken erkennen, Verhandlungstipps erhalten." />
      </Helmet>

      <div className={styles.container}>
        {/* Header */}
        <header className={styles.header}>
          <div className={styles.headerContent}>
            <div className={styles.headerIcon}>🔍</div>
            <div>
              <h1 className={styles.title}>Legal Lens</h1>
              <p className={styles.subtitle}>
                Interaktive Vertragsanalyse mit KI - Klauseln verstehen, Risiken erkennen
              </p>
            </div>
          </div>
        </header>

        <main className={styles.main}>
          {/* Upload Section */}
          <section className={styles.uploadSection}>
            <h2 className={styles.sectionTitle}>
              <Upload size={20} />
              Neuen Vertrag analysieren
            </h2>

            <div
              className={`${styles.dropzone} ${dragActive ? styles.dragActive : ''} ${isUploading ? styles.uploading : ''}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => !isUploading && fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                onChange={handleFileInput}
                className={styles.fileInput}
                disabled={isUploading}
              />

              {isUploading ? (
                <div className={styles.uploadingState}>
                  <Loader size={32} className={styles.spinner} />
                  <span>Vertrag wird hochgeladen...</span>
                </div>
              ) : (
                <>
                  <div className={styles.dropzoneIcon}>
                    <Upload size={32} />
                  </div>
                  <p className={styles.dropzoneText}>
                    PDF hier ablegen oder <span className={styles.browseLink}>durchsuchen</span>
                  </p>
                  <p className={styles.dropzoneHint}>
                    Der Vertrag wird automatisch analysiert
                  </p>
                </>
              )}
            </div>

            {error && (
              <div className={styles.errorMessage}>
                <AlertCircle size={16} />
                {error}
              </div>
            )}
          </section>

          {/* Divider */}
          <div className={styles.divider}>
            <span>oder</span>
          </div>

          {/* Contract Selection */}
          <section className={styles.contractsSection}>
            <h2 className={styles.sectionTitle}>
              <FileText size={20} />
              Bestehenden Vertrag auswählen
            </h2>

            {/* Search */}
            <div className={styles.searchContainer}>
              <Search size={18} className={styles.searchIcon} />
              <input
                type="text"
                placeholder="Vertrag suchen..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={styles.searchInput}
              />
            </div>

            {/* Contract List */}
            <div className={styles.contractList}>
              {isLoading ? (
                <div className={styles.loadingState}>
                  <Loader size={24} className={styles.spinner} />
                  <span>Verträge werden geladen...</span>
                </div>
              ) : filteredContracts.length === 0 ? (
                <div className={styles.emptyState}>
                  {contracts.length === 0 ? (
                    <>
                      <FileText size={32} />
                      <p>Noch keine Verträge vorhanden</p>
                      <span>Laden Sie oben einen Vertrag hoch</span>
                    </>
                  ) : (
                    <>
                      <Search size={32} />
                      <p>Keine Treffer für "{searchQuery}"</p>
                    </>
                  )}
                </div>
              ) : (
                filteredContracts.map((contract) => (
                  <button
                    key={contract._id}
                    className={styles.contractItem}
                    onClick={() => navigate(`/legal-lens/${contract._id}`)}
                  >
                    <div className={styles.contractIcon}>
                      <FileText size={20} />
                    </div>
                    <div className={styles.contractInfo}>
                      <span className={styles.contractName}>{contract.name}</span>
                      <span className={styles.contractMeta}>
                        {contract.analysis?.contractType || 'Vertrag'} • {formatDate(contract.uploadedAt || contract.createdAt)}
                      </span>
                    </div>
                    <ChevronRight size={18} className={styles.contractArrow} />
                  </button>
                ))
              )}
            </div>
          </section>
        </main>

        {/* Feature Highlights */}
        <footer className={styles.features}>
          <div className={styles.featureItem}>
            <span className={styles.featureIcon}>👔</span>
            <span>4 Perspektiven</span>
          </div>
          <div className={styles.featureItem}>
            <span className={styles.featureIcon}>⚖️</span>
            <span>Risikobewertung</span>
          </div>
          <div className={styles.featureItem}>
            <span className={styles.featureIcon}>💡</span>
            <span>Alternativen</span>
          </div>
          <div className={styles.featureItem}>
            <span className={styles.featureIcon}>🤝</span>
            <span>Verhandlungstipps</span>
          </div>
        </footer>
      </div>
    </>
  );
};

export default LegalLensStart;
