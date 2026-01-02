// 📁 pages/LegalLensStart.tsx
// Legal Lens Startseite - Stripe Style (V2)

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  Search, Upload, FileText, ChevronRight, Loader, AlertCircle,
  Eye, Scale, Lightbulb
} from 'lucide-react';
import styles from '../styles/LegalLensStart.module.css';

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
      formData.append('file', file);

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
        <meta name="description" content="Analysieren Sie Ihre Verträge interaktiv mit KI" />
      </Helmet>

      <div className={styles.page}>
        <div className={styles.container}>
          {/* Header Row */}
          <header className={styles.headerRow}>
            <div className={styles.headerLeft}>
              <div className={styles.headerIcon}>
                <Scale size={22} />
              </div>
              <div className={styles.headerText}>
                <h1 className={styles.headerTitle}>Legal Lens</h1>
                <p className={styles.headerSubtitle}>Interaktive Vertragsanalyse mit KI</p>
              </div>
            </div>
            <div className={styles.headerFeatures}>
              <div className={styles.headerFeature}>
                <Eye size={14} />
                <span>4 Perspektiven</span>
              </div>
              <div className={styles.headerFeature}>
                <Scale size={14} />
                <span>Risikobewertung</span>
              </div>
              <div className={styles.headerFeature}>
                <Lightbulb size={14} />
                <span>Alternativen</span>
              </div>
            </div>
          </header>

          {/* Main Card with Two Sections */}
          <div className={styles.mainCard}>
            <div className={styles.mainCardInner}>
              {/* Upload Section */}
              <div className={`${styles.cardSection} ${styles.cardSectionUpload}`}>
                <h2 className={styles.sectionTitle}>
                  <Upload size={18} />
                  Neuer Vertrag
                </h2>
                <p className={styles.sectionSubtitle}>PDF hochladen zur Analyse</p>

                <div
                  className={`${styles.uploadZone} ${dragActive ? styles.uploadZoneActive : ''} ${isUploading ? styles.uploadZoneDisabled : ''}`}
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
                    style={{ display: 'none' }}
                    disabled={isUploading}
                  />

                  {isUploading ? (
                    <div className={styles.uploadLoading}>
                      <Loader size={32} className={styles.spinning} />
                      <span>Wird hochgeladen...</span>
                    </div>
                  ) : (
                    <>
                      <div className={styles.uploadIcon}>
                        <Upload size={32} />
                      </div>
                      <p className={styles.uploadTitle}>
                        PDF ablegen oder <span className={styles.uploadLink}>auswählen</span>
                      </p>
                      <p className={styles.uploadMeta}>Max. 20 MB</p>
                    </>
                  )}
                </div>

                {error && (
                  <div className={styles.error}>
                    <AlertCircle size={16} />
                    {error}
                  </div>
                )}
              </div>

              <div className={styles.divider} />

              {/* Contracts Section */}
              <div className={styles.cardSection}>
                <h2 className={styles.sectionTitle}>
                  <FileText size={18} />
                  Bestehende Verträge
                </h2>
                <p className={styles.sectionSubtitle}>Bereits hochgeladene Dokumente</p>

                <div className={styles.searchBox}>
                  <Search size={18} className={styles.searchIcon} />
                  <input
                    type="text"
                    placeholder="Suchen..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={styles.searchInput}
                  />
                </div>

                <div className={styles.contractList}>
                  {isLoading ? (
                    <div className={styles.emptyState}>
                      <Loader size={24} className={styles.spinning} />
                      <p className={styles.emptyTitle}>Laden...</p>
                    </div>
                  ) : filteredContracts.length === 0 ? (
                    <div className={styles.emptyState}>
                      {contracts.length === 0 ? (
                        <>
                          <div className={styles.emptyIcon}>
                            <FileText size={24} />
                          </div>
                          <p className={styles.emptyTitle}>Keine Verträge</p>
                          <p className={styles.emptyText}>Laden Sie links einen Vertrag hoch</p>
                        </>
                      ) : (
                        <>
                          <div className={styles.emptyIcon}>
                            <Search size={24} />
                          </div>
                          <p className={styles.emptyTitle}>Keine Treffer</p>
                          <p className={styles.emptyText}>für "{searchQuery}"</p>
                        </>
                      )}
                    </div>
                  ) : (
                    filteredContracts.map((contract) => (
                      <button
                        key={contract._id}
                        className={styles.contractRow}
                        onClick={() => navigate(`/legal-lens/${contract._id}`)}
                      >
                        <div className={styles.contractRowIcon}>
                          <FileText size={20} />
                        </div>
                        <div className={styles.contractRowContent}>
                          <span className={styles.contractRowName}>{contract.name}</span>
                          <span className={styles.contractRowMeta}>
                            {contract.analysis?.contractType || 'Vertrag'} • {formatDate(contract.uploadedAt || contract.createdAt)}
                          </span>
                        </div>
                        <ChevronRight size={18} className={styles.contractRowArrow} />
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </>
  );
};

export default LegalLensStart;
