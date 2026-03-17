/**
 * Legal Lens V2 — Start-Seite
 *
 * Einstiegspunkt unter /legal-lens-v2
 * Upload + Vertragsauswahl → navigiert zu /legal-lens-v2/:contractId
 * Free-User sehen die Seite mit Premium-Banner, können aber nichts anklicken.
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchWithAuth, API_BASE_URL } from '../context/authUtils';
import UnifiedPremiumNotice from '../components/UnifiedPremiumNotice';
import styles from '../styles/LegalLensV2Start.module.css';

const PREMIUM_PLANS = ['business', 'enterprise', 'legendary'];

interface ContractItem {
  _id: string;
  name: string;
  uploadedAt?: string;
  createdAt?: string;
  status?: string;
  contractScore?: number;
  analysis?: {
    contractType?: string;
  };
  legalLens?: {
    preprocessStatus?: string;
  };
}

export default function LegalLensV2Start() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [contracts, setContracts] = useState<ContractItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [userPlan, setUserPlan] = useState('free');
  const [planLoading, setPlanLoading] = useState(true);

  const hasAccess = PREMIUM_PLANS.includes(userPlan.toLowerCase());

  // User Plan laden
  useEffect(() => {
    const fetchPlan = async () => {
      try {
        const res = await fetchWithAuth(`${API_BASE_URL}/auth/me`);
        if (res.ok) {
          const data = await res.json();
          const user = data.user || data;
          setUserPlan((user.subscriptionPlan || user.plan || 'free').toLowerCase());
        }
      } catch {
        // Silently default to free
      } finally {
        setPlanLoading(false);
      }
    };
    fetchPlan();
  }, []);

  // Verträge laden
  useEffect(() => {
    const fetchContracts = async () => {
      try {
        const res = await fetchWithAuth(`${API_BASE_URL}/contracts`);
        if (!res.ok) throw new Error('Fehler beim Laden');
        const data = await res.json();
        const list = Array.isArray(data) ? data : (data.contracts || []);
        setContracts(list);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Fehler beim Laden');
      } finally {
        setIsLoading(false);
      }
    };
    fetchContracts();
  }, []);

  // Gefilterte Verträge
  const filtered = searchQuery.trim()
    ? contracts.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.analysis?.contractType?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : contracts;

  // Upload Handler
  const handleFileUpload = async (file: File) => {
    if (!file.type.includes('pdf') && !file.name.endsWith('.docx')) {
      setError('Bitte eine PDF- oder DOCX-Datei hochladen');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`${API_BASE_URL}/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: formData
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Upload fehlgeschlagen');
      }

      const data = await res.json();
      const id = data.contractId || data._id;
      if (id) {
        navigate(`/legal-lens-v2/${id}`);
      } else {
        throw new Error('Keine Vertrags-ID erhalten');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload fehlgeschlagen');
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (!hasAccess) return;
    if (e.dataTransfer.files?.[0]) handleFileUpload(e.dataTransfer.files[0]);
  };

  const handleSelect = (contractId: string) => {
    if (!hasAccess) return;
    navigate(`/legal-lens-v2/${contractId}`);
  };

  const formatDate = (d?: string) => {
    if (!d) return '';
    return new Date(d).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  return (
    <div className={styles.page}>
      {/* Premium Banner für Free User */}
      {!planLoading && !hasAccess && (
        <UnifiedPremiumNotice featureName="Legal Lens" variant="fullWidth" />
      )}

      <div className={styles.container}>
        {/* Hero */}
        <div className={styles.hero}>
          <h1 className={styles.heroTitle}>
            Legal <span className={styles.heroAccent}>Lens</span>
          </h1>
          <p className={styles.heroSub}>
            Finde Risiken, die dich tausende Euro kosten können — bevor du unterschreibst.
          </p>
          <div className={styles.valueProps}>
            <span className={styles.valueProp}>{'\u2714'} Klausel für Klausel Analyse</span>
            <span className={styles.valueProp}>{'\u2714'} Konkrete Verhandlungstipps</span>
            <span className={styles.valueProp}>{'\u2714'} Verständlich in Sekunden statt Juristendeutsch</span>
          </div>
          {contracts.length > 0 && (
            <p className={styles.socialProof}>
              Bereits {contracts.length}+ Verträge in deinem Account analysierbar
            </p>
          )}
        </div>

        {/* Main Grid */}
        <div className={styles.grid}>
          {/* Upload Card */}
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Neuen Vertrag analysieren</h2>
            <p className={styles.cardSub}>PDF oder DOCX hochladen</p>

            <div
              className={`${styles.dropZone} ${dragActive ? styles.dropZoneActive : ''} ${!hasAccess ? styles.dropZoneLocked : ''}`}
              onDragEnter={(e) => { e.preventDefault(); if (hasAccess) setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => {
                if (!hasAccess || isUploading) return;
                fileInputRef.current?.click();
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx"
                onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                style={{ display: 'none' }}
                disabled={isUploading || !hasAccess}
              />

              {isUploading ? (
                <div className={styles.uploading}>
                  <div className={styles.uploadSpinner} />
                  <span>Wird hochgeladen...</span>
                </div>
              ) : (
                <>
                  <div className={styles.dropIcon}>
                    {!hasAccess ? '\u{1F512}' : '\u{1F4C4}'}
                  </div>
                  <p className={styles.dropText}>
                    {!hasAccess
                      ? 'Business-Abo erforderlich'
                      : 'Datei ablegen oder klicken'}
                  </p>
                  <p className={styles.dropMeta}>PDF, DOCX — max. 20 MB</p>
                </>
              )}
            </div>

            {error && <p className={styles.error}>{error}</p>}
          </div>

          {/* Contract List Card */}
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Bestehende Verträge</h2>
            <p className={styles.cardSub}>{contracts.length} Verträge in deiner Verwaltung</p>

            <div className={styles.searchBox}>
              <input
                type="text"
                placeholder="Vertrag suchen..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={styles.searchInput}
              />
            </div>

            <div className={styles.contractList}>
              {isLoading ? (
                <div className={styles.empty}>
                  <div className={styles.uploadSpinner} />
                  <span>Verträge laden...</span>
                </div>
              ) : filtered.length === 0 ? (
                <div className={styles.empty}>
                  <span>{contracts.length === 0 ? 'Noch keine Verträge vorhanden' : `Keine Treffer für "${searchQuery}"`}</span>
                </div>
              ) : (
                filtered.map(contract => (
                  <button
                    key={contract._id}
                    className={`${styles.contractRow} ${!hasAccess ? styles.contractRowLocked : ''}`}
                    onClick={() => handleSelect(contract._id)}
                  >
                    <div className={styles.contractInfo}>
                      <span className={styles.contractName}>{contract.name}</span>
                      <span className={styles.contractMeta}>
                        {contract.analysis?.contractType || 'Vertrag'}
                        {' \u00B7 '}
                        {formatDate(contract.uploadedAt || contract.createdAt)}
                      </span>
                    </div>
                    <span className={styles.contractArrow}>
                      {!hasAccess ? '\u{1F512}' : '\u203A'}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
