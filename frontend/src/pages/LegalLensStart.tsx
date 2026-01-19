// 📁 pages/LegalLensStart.tsx
// Legal Lens Startseite - Stripe Style (V2)

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Upload, FileText, ChevronRight, Loader, AlertCircle,
  Eye, Scale, Lightbulb, Lock, Sparkles, X, Crown
} from 'lucide-react';
import styles from '../styles/LegalLensStart.module.css';

// Plans mit vollem Legal Lens Zugriff
const LEGAL_LENS_ACCESS_PLANS = ['business', 'enterprise', 'legendary'];

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
  const [userPlan, setUserPlan] = useState<string>('free');
  const [planLoading, setPlanLoading] = useState(true);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Prüfen ob User Zugriff hat
  const hasAccess = LEGAL_LENS_ACCESS_PLANS.includes(userPlan);

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

  // User Plan laden
  useEffect(() => {
    const fetchUserPlan = async () => {
      try {
        const apiUrl = getApiUrl();
        const token = localStorage.getItem('token');
        const response = await fetch(`${apiUrl}/api/auth/me`, {
          credentials: 'include',
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        if (response.ok) {
          const data = await response.json();
          setUserPlan(data.subscriptionPlan || data.plan || 'free');
        }
      } catch (err) {
        console.error('[Legal Lens] Error fetching user plan:', err);
      } finally {
        setPlanLoading(false);
      }
    };
    fetchUserPlan();
  }, []);

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

  // Handler für blockierte Aktionen (Free User)
  const handleBlockedAction = () => {
    if (!hasAccess) {
      setShowUpgradeModal(true);
      return true;
    }
    return false;
  };

  return (
    <>
      <Helmet>
        <title>Legal Lens | Contract AI</title>
        <meta name="description" content="Analysieren Sie Ihre Verträge interaktiv mit KI" />
      </Helmet>

      <div className={styles.page}>
        <div className={styles.container}>
          {/* 🔒 Premium Banner für Free User */}
          {!planLoading && !hasAccess && (
            <div style={{
              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
              borderRadius: '16px',
              padding: '20px 24px',
              marginBottom: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '20px',
              flexWrap: 'wrap',
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.25)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  background: 'rgba(255,255,255,0.2)',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Crown size={24} color="white" />
                </div>
                <div>
                  <h3 style={{
                    color: 'white',
                    fontSize: '16px',
                    fontWeight: '600',
                    margin: 0,
                    marginBottom: '4px'
                  }}>
                    Premium-Feature
                  </h3>
                  <p style={{
                    color: 'rgba(255,255,255,0.85)',
                    fontSize: '14px',
                    margin: 0
                  }}>
                    Legal Lens ist nur mit Business oder Enterprise verfügbar
                  </p>
                </div>
              </div>
              <button
                onClick={() => navigate('/pricing')}
                style={{
                  padding: '12px 24px',
                  background: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  color: '#2563eb',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  whiteSpace: 'nowrap'
                }}
              >
                <Sparkles size={16} />
                Jetzt upgraden
              </button>
            </div>
          )}

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
                  {!hasAccess && !planLoading && (
                    <Lock size={14} style={{ marginLeft: '8px', color: '#9ca3af' }} />
                  )}
                </h2>
                <p className={styles.sectionSubtitle}>PDF hochladen zur Analyse</p>

                <div
                  className={`${styles.uploadZone} ${dragActive ? styles.uploadZoneActive : ''} ${isUploading ? styles.uploadZoneDisabled : ''}`}
                  style={!hasAccess && !planLoading ? { opacity: 0.6, cursor: 'pointer' } : {}}
                  onDragEnter={(e) => { if (hasAccess) handleDrag(e); }}
                  onDragLeave={(e) => { if (hasAccess) handleDrag(e); }}
                  onDragOver={(e) => { e.preventDefault(); if (hasAccess) handleDrag(e); }}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (handleBlockedAction()) return;
                    handleDrop(e);
                  }}
                  onClick={() => {
                    if (handleBlockedAction()) return;
                    if (!isUploading) fileInputRef.current?.click();
                  }}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf"
                    onChange={handleFileInput}
                    style={{ display: 'none' }}
                    disabled={isUploading || !hasAccess}
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
                  {!hasAccess && !planLoading && (
                    <Lock size={14} style={{ marginLeft: '8px', color: '#9ca3af' }} />
                  )}
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
                        style={!hasAccess && !planLoading ? { opacity: 0.7 } : {}}
                        onClick={() => {
                          if (handleBlockedAction()) return;
                          navigate(`/legal-lens/${contract._id}`);
                        }}
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
                        {!hasAccess && !planLoading ? (
                          <Lock size={16} style={{ color: '#9ca3af' }} />
                        ) : (
                          <ChevronRight size={18} className={styles.contractRowArrow} />
                        )}
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* 🔒 Upgrade Modal */}
      <AnimatePresence>
        {showUpgradeModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowUpgradeModal(false)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.6)',
              backdropFilter: 'blur(4px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
              padding: '20px'
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                position: 'relative',
                background: 'white',
                borderRadius: '20px',
                padding: '32px',
                maxWidth: '420px',
                width: '100%',
                textAlign: 'center',
                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)'
              }}
            >
              <button
                onClick={() => setShowUpgradeModal(false)}
                style={{
                  position: 'absolute',
                  top: '16px',
                  right: '16px',
                  background: '#f3f4f6',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px',
                  cursor: 'pointer',
                  color: '#6b7280'
                }}
              >
                <X size={20} />
              </button>

              <div style={{
                width: '80px',
                height: '80px',
                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 24px'
              }}>
                <Lock size={36} color="white" />
              </div>

              <h2 style={{
                fontSize: '24px',
                fontWeight: '700',
                color: '#1f2937',
                marginBottom: '12px'
              }}>
                Premium-Feature
              </h2>

              <p style={{
                color: '#6b7280',
                fontSize: '16px',
                lineHeight: '1.6',
                marginBottom: '24px'
              }}>
                <strong style={{ color: '#1f2937' }}>Legal Lens</strong> ist nur mit einem
                <span style={{ color: '#3b82f6', fontWeight: '600' }}> Business</span> oder
                <span style={{ color: '#2563eb', fontWeight: '600' }}> Enterprise</span> Abo verfügbar.
              </p>

              <div style={{
                background: '#f8fafc',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '24px',
                border: '1px solid #e2e8f0'
              }}>
                <p style={{
                  color: '#64748b',
                  fontSize: '14px',
                  margin: 0,
                  marginBottom: '12px'
                }}>
                  Mit Legal Lens erhältst du:
                </p>
                <ul style={{
                  color: '#475569',
                  fontSize: '14px',
                  textAlign: 'left',
                  margin: 0,
                  paddingLeft: '20px'
                }}>
                  <li>Interaktive Vertragsanalyse mit 4 Perspektiven</li>
                  <li>Detaillierte Risikobewertung jeder Klausel</li>
                  <li>Alternative Formulierungsvorschläge</li>
                  <li>PDF-Sync mit Klausel-Highlighting</li>
                </ul>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => setShowUpgradeModal(false)}
                  style={{
                    flex: 1,
                    padding: '14px 20px',
                    background: '#f3f4f6',
                    border: '1px solid #e5e7eb',
                    borderRadius: '12px',
                    color: '#374151',
                    fontSize: '15px',
                    fontWeight: '500',
                    cursor: 'pointer'
                  }}
                >
                  Später
                </button>
                <button
                  onClick={() => navigate('/pricing')}
                  style={{
                    flex: 1,
                    padding: '14px 20px',
                    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                    border: 'none',
                    borderRadius: '12px',
                    color: 'white',
                    fontSize: '15px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  <Sparkles size={16} />
                  Upgraden
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default LegalLensStart;
