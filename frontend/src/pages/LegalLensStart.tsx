// 📁 pages/LegalLensStart.tsx
// Legal Lens Startseite - Stripe Style (V2)

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Upload, FileText, ChevronRight, Loader, AlertCircle,
  Eye, Scale, Lightbulb, Lock, Sparkles, X, Camera
} from 'lucide-react';
import styles from '../styles/LegalLensStart.module.css';
import UnifiedPremiumNotice from '../components/UnifiedPremiumNotice';
import { useDocumentScanner } from '../hooks/useDocumentScanner';
import { useAuth } from '../context/AuthContext';
import { apiCall } from '../utils/api';

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
  // 🔒 Premium Access — direkt aus AuthContext (kein eigener API-Call nötig)
  const { user: authUser, isLoading: planLoading } = useAuth();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const hasAccess = authUser?.isPremium || authUser?.isBusiness || authUser?.isEnterprise || false;

  // 📸 Document Scanner
  const { openScanner, ScannerModal } = useDocumentScanner((file) => {
    handleFileUpload(file);
  });

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
        /* 07.09.2026: war rohes fetch und meldete bei abgelaufener Sitzung
           nur "Fehler beim Laden". apiCall erkennt 401 und sagt, dass man
           sich neu anmelden muss. Der Upload bleibt bewusst bei fetch:
           er laeuft ueber Cookies ohne Authorization-Header. */
        const data = await apiCall('/contracts') as Contract[] | { contracts?: Contract[] };
        const contractsList = Array.isArray(data) ? data : (data.contracts || []);
        setContracts(contractsList);
        setFilteredContracts(contractsList);
      } catch (err) {
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
      contract.name?.toLowerCase().includes(query) ||
      contract.analysis?.contractType?.toLowerCase().includes(query)
    );
    setFilteredContracts(filtered);
  }, [searchQuery, contracts]);

  const handleFileUpload = async (file: File) => {
    if (!file.type.includes('pdf') && file.type !== 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      setError('Bitte lade eine PDF- oder DOCX-Datei hoch');
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
        <meta name="description" content="Jede Klausel deines Vertrags einzeln erklärt, mit Bewertung und Alternativen." />
      </Helmet>

      <div className={styles.page}>
        {/* Full-Width Premium Banner - außerhalb des Containers */}
        {!planLoading && !hasAccess && (
          <UnifiedPremiumNotice
            featureName="Legal Lens"
            variant="fullWidth"
          />
        )}

        <div className={styles.llSeite}>

          <div className={styles.llKopf}>
            <h1 className={styles.llTitel}>Vertrag im Detail lesen</h1>
            <p className={styles.llUnter}>
              Legal Lens zeigt dir jede Klausel im Originaldokument, erklärt sie in
              einfacher Sprache und schlägt Alternativen vor.
            </p>
          </div>

          <div className={styles.llWege}>

            {/* ── Weg 1: neues Dokument ──────────────────────────── */}
            <div>
              <div className={styles.llSchrittKopf}>
                <span className={styles.llNummer}>1</span>
                <span className={styles.llSchrittTitel}>Neues Dokument</span>
                {!hasAccess && !planLoading && <Lock size={14} className={styles.llSucheSymbol} />}
              </div>

              <div
                className={`${styles.llAblage} ${dragActive ? styles.llAblageAktiv : ''}`}
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
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    if (handleBlockedAction()) return;
                    if (!isUploading) fileInputRef.current?.click();
                  }
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx"
                  onChange={handleFileInput}
                  hidden
                  disabled={isUploading || !hasAccess}
                />

                {isUploading ? (
                  <>
                    <div className={styles.llAblageSymbol}>
                      <Loader size={21} className={styles.spinning} />
                    </div>
                    <p className={styles.llAblageTitel}>Wird hochgeladen…</p>
                  </>
                ) : (
                  <>
                    <div className={styles.llAblageSymbol}>
                      <Upload size={21} />
                    </div>
                    <p className={styles.llAblageTitel}>Datei hierher ziehen</p>
                    <p className={styles.llAblageUnter}>oder klicken zum Auswählen</p>
                    <div className={styles.llFormate}>
                      <span className={styles.llFormat}>PDF</span>
                      <span className={styles.llFormat}>DOCX</span>
                      <span className={styles.llFormat}>max. 20 MB</span>
                    </div>
                    {hasAccess && (
                      <button
                        className={styles.llScannen}
                        onClick={(e) => { e.stopPropagation(); openScanner(); }}
                      >
                        <Camera size={14} />
                        Stattdessen abfotografieren
                      </button>
                    )}
                  </>
                )}
              </div>

              {error && (
                <p className={styles.llFehler} role="alert">
                  <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
                  {error}
                </p>
              )}
            </div>

            {/* ── Weg 2: ein Vertrag, den du schon hast ──────────── */}
            <div>
              <div className={styles.llSchrittKopf}>
                <span className={styles.llNummer}>2</span>
                <span className={styles.llSchrittTitel}>Oder ein Vertrag, den du schon hast</span>
                {!hasAccess && !planLoading && <Lock size={14} className={styles.llSucheSymbol} />}
              </div>

              <div className={styles.llSuche}>
                <Search size={16} className={styles.llSucheSymbol} />
                <input
                  type="text"
                  placeholder="Vertrag suchen…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={styles.llSucheFeld}
                  aria-label="Vertrag suchen"
                />
              </div>

              <div className={styles.llListe}>
                {isLoading ? (
                  <p className={styles.llLeer}>
                    <Loader size={20} className={styles.spinning} />
                    <br />Verträge werden geladen…
                  </p>
                ) : filteredContracts.length === 0 ? (
                  <p className={styles.llLeer}>
                    {contracts.length === 0 ? (
                      <>
                        <span className={styles.llLeerTitel}>Noch keine Verträge</span>
                        Lade links dein erstes Dokument hoch.
                      </>
                    ) : (
                      <>
                        <span className={styles.llLeerTitel}>Keine Treffer</span>
                        Für „{searchQuery}" haben wir nichts gefunden.
                      </>
                    )}
                  </p>
                ) : (
                  filteredContracts.map((contract) => (
                    <button
                      key={contract._id}
                      className={styles.llZeile}
                      onClick={() => {
                        if (handleBlockedAction()) return;
                        navigate(`/legal-lens/${contract._id}`);
                      }}
                      title={contract.name || 'Unbenannter Vertrag'}
                    >
                      <span className={styles.llZeileSymbol}>
                        <FileText size={16} />
                      </span>
                      <span className={styles.llZeileText}>
                        <span className={styles.llZeileName}>
                          {contract.name || 'Unbenannter Vertrag'}
                        </span>
                        <span className={styles.llZeileMeta}>
                          {contract.analysis?.contractType || 'Vertrag'} · {formatDate(contract.uploadedAt || contract.createdAt)}
                        </span>
                      </span>
                      {!hasAccess && !planLoading
                        ? <Lock size={15} className={styles.llZeilePfeil} />
                        : <ChevronRight size={16} className={styles.llZeilePfeil} />}
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* ── Was dich dort erwartet ────────────────────────────── */}
          <div className={styles.llErwartung}>
            <p className={styles.llZonenTitel}>Was du dort sehen wirst</p>
            <div className={styles.llKarten}>
              <div className={styles.llKarte}>
                <FileText size={16} className={styles.llKarteSymbol} />
                <p className={styles.llKarteName}>Klausel für Klausel</p>
                <p className={styles.llKarteText}>Jeder Abschnitt einzeln, direkt neben dem Originaldokument.</p>
              </div>
              <div className={styles.llKarte}>
                <Lightbulb size={16} className={styles.llKarteSymbol} />
                <p className={styles.llKarteName}>In einfacher Sprache</p>
                <p className={styles.llKarteText}>Was die Klausel bedeutet, ohne Juristendeutsch.</p>
              </div>
              <div className={styles.llKarte}>
                <Eye size={16} className={styles.llKarteSymbol} />
                <p className={styles.llKarteName}>Aus vier Blickwinkeln</p>
                <p className={styles.llKarteText}>Wie dieselbe Klausel für beide Seiten wirkt.</p>
              </div>
              <div className={styles.llKarte}>
                <Scale size={16} className={styles.llKarteSymbol} />
                <p className={styles.llKarteName}>Mit Alternativen</p>
                <p className={styles.llKarteText}>Eine andere Formulierung, wenn eine Klausel dich benachteiligt.</p>
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
                  {/* 07.09.2026: Dieses Fenster sieht ausgerechnet der
                      Nicht-Zahler, den es überzeugen soll. "PDF-Sync mit
                      Klausel-Highlighting" sagt dem nichts. Jetzt dieselben
                      vier Punkte wie auf der Startseite, gleiche Sprache. */}
                  <li>Jede Klausel einzeln, direkt neben dem Originaldokument</li>
                  <li>Erklärt in einfacher Sprache, ohne Juristendeutsch</li>
                  <li>Aus vier Blickwinkeln: wie die Klausel für beide Seiten wirkt</li>
                  <li>Eine bessere Formulierung, wenn eine Klausel dich benachteiligt</li>
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
      {ScannerModal}
    </>
  );
};

export default LegalLensStart;
