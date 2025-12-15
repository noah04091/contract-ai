// 📁 pages/LegalLensStart.tsx
// Legal Lens Startseite - Vertragsauswahl oder Upload

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Search, Upload, FileText, ChevronRight, Loader, AlertCircle } from 'lucide-react';

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
      formData.append('file', file); // Backend erwartet 'file', nicht 'contract'

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

      {/* Globale Styles für diese Seite - ÜBERSCHREIBT ALLE PARENTS! */}
      <style>{`
        /* HOLZHAMMER: Überschreibe #root UND alle inneren Container */
        #root:has(.legal-lens-page),
        #root:has(.legal-lens-page) > div,
        #root:has(.legal-lens-page) > div > main,
        #root:has(.legal-lens-page) > div > main > * {
          max-width: 100% !important;
          width: 100% !important;
          padding-left: 0 !important;
          padding-right: 0 !important;
        }

        .legal-lens-page {
          width: 100% !important;
          min-height: calc(100vh - 64px);
          background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
          padding: 0 0 2rem 0;
          box-sizing: border-box;
        }

        .legal-lens-header {
          width: 100%;
          background: white;
          border-bottom: 1px solid #e2e8f0;
          padding: 2rem 1rem;
          margin-bottom: 2rem;
          box-sizing: border-box;
          display: flex;
          justify-content: center;
        }

        .legal-lens-header-content {
          max-width: 800px;
          width: 100%;
          display: flex;
          align-items: center;
          gap: 1.25rem;
          text-align: left;
          padding: 0 1rem;
          box-sizing: border-box;
        }

        .legal-lens-main {
          max-width: 800px;
          width: 100%;
          margin-left: auto !important;
          margin-right: auto !important;
          padding: 0 1rem;
          text-align: left;
          box-sizing: border-box;
        }

        .legal-lens-footer {
          max-width: 800px;
          width: 100%;
          margin: 2rem auto 0;
          padding: 0 1rem;
          display: flex;
          justify-content: center;
          gap: 2rem;
          flex-wrap: wrap;
          box-sizing: border-box;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>

      <div className="legal-lens-page">
        {/* Header */}
        <header className="legal-lens-header">
          <div className="legal-lens-header-content">
            <div style={{ fontSize: '2.5rem' }}>🔍</div>
            <div>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1e293b', margin: '0 0 0.25rem' }}>Legal Lens</h1>
              <p style={{ fontSize: '0.95rem', color: '#64748b', margin: 0 }}>
                Interaktive Vertragsanalyse mit KI - Klauseln verstehen, Risiken erkennen
              </p>
            </div>
          </div>
        </header>

        {/* Main */}
        <main className="legal-lens-main">
          {/* Upload Section */}
          <section style={{ marginBottom: '1.5rem' }}>
            <h2 style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.625rem',
              fontSize: '1rem',
              fontWeight: 600,
              color: '#1e293b',
              margin: '0 0 1rem'
            }}>
              <Upload size={20} />
              Neuen Vertrag analysieren
            </h2>

            <div
              style={{
                border: dragActive ? '2px solid #3b82f6' : '2px dashed #cbd5e1',
                borderRadius: '12px',
                padding: '2.5rem 2rem',
                textAlign: 'center',
                cursor: isUploading ? 'not-allowed' : 'pointer',
                background: dragActive ? '#eff6ff' : 'white',
                transition: 'all 0.2s ease',
                opacity: isUploading ? 0.8 : 1
              }}
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
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', color: '#3b82f6', fontWeight: 500 }}>
                  <Loader size={32} style={{ animation: 'spin 1s linear infinite' }} />
                  <span>Vertrag wird hochgeladen...</span>
                </div>
              ) : (
                <>
                  <div style={{
                    width: '64px',
                    height: '64px',
                    margin: '0 auto 1rem',
                    background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                    borderRadius: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white'
                  }}>
                    <Upload size={32} />
                  </div>
                  <p style={{ fontSize: '1rem', color: '#374151', margin: '0 0 0.5rem' }}>
                    PDF hier ablegen oder <span style={{ color: '#3b82f6', fontWeight: 500, textDecoration: 'underline' }}>durchsuchen</span>
                  </p>
                  <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: 0 }}>
                    Der Vertrag wird automatisch analysiert
                  </p>
                </>
              )}
            </div>

            {error && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginTop: '1rem',
                padding: '0.75rem 1rem',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '8px',
                color: '#dc2626',
                fontSize: '0.875rem'
              }}>
                <AlertCircle size={16} />
                {error}
              </div>
            )}
          </section>

          {/* Divider */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            margin: '2rem 0'
          }}>
            <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
            <span style={{ fontSize: '0.875rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>oder</span>
            <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
          </div>

          {/* Contract Selection */}
          <section style={{
            background: 'white',
            borderRadius: '12px',
            padding: '1.5rem',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
          }}>
            <h2 style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.625rem',
              fontSize: '1rem',
              fontWeight: 600,
              color: '#1e293b',
              margin: '0 0 1rem'
            }}>
              <FileText size={20} />
              Bestehenden Vertrag auswählen
            </h2>

            {/* Search */}
            <div style={{ position: 'relative', marginBottom: '1rem' }}>
              <Search
                size={18}
                style={{
                  position: 'absolute',
                  left: '1rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#94a3b8'
                }}
              />
              <input
                type="text"
                placeholder="Vertrag suchen..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem 0.75rem 2.75rem',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '0.9rem',
                  boxSizing: 'border-box',
                  outline: 'none'
                }}
              />
            </div>

            {/* Contract List */}
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {isLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 2rem', color: '#64748b', gap: '1rem' }}>
                  <Loader size={24} style={{ animation: 'spin 1s linear infinite' }} />
                  <span>Verträge werden geladen...</span>
                </div>
              ) : filteredContracts.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 2rem', color: '#64748b', textAlign: 'center' }}>
                  {contracts.length === 0 ? (
                    <>
                      <FileText size={32} />
                      <p style={{ margin: '0.75rem 0 0.25rem', fontWeight: 500, color: '#475569' }}>Noch keine Verträge vorhanden</p>
                      <span style={{ fontSize: '0.875rem', color: '#94a3b8' }}>Laden Sie oben einen Vertrag hoch</span>
                    </>
                  ) : (
                    <>
                      <Search size={32} />
                      <p style={{ margin: '0.75rem 0 0.25rem', fontWeight: 500, color: '#475569' }}>Keine Treffer für "{searchQuery}"</p>
                    </>
                  )}
                </div>
              ) : (
                filteredContracts.map((contract) => (
                  <button
                    key={contract._id}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1rem',
                      padding: '1rem',
                      background: 'transparent',
                      border: 'none',
                      borderBottom: '1px solid #f1f5f9',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'background 0.2s'
                    }}
                    onClick={() => navigate(`/legal-lens/${contract._id}`)}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <div style={{
                      width: '40px',
                      height: '40px',
                      background: '#f1f5f9',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#64748b',
                      flexShrink: 0
                    }}>
                      <FileText size={20} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: 'block', fontSize: '0.9rem', fontWeight: 500, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{contract.name}</span>
                      <span style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.125rem' }}>
                        {contract.analysis?.contractType || 'Vertrag'} • {formatDate(contract.uploadedAt || contract.createdAt)}
                      </span>
                    </div>
                    <ChevronRight size={18} style={{ color: '#cbd5e1', flexShrink: 0 }} />
                  </button>
                ))
              )}
            </div>
          </section>
        </main>

        {/* Footer */}
        <footer className="legal-lens-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#64748b' }}>
            <span style={{ fontSize: '1.25rem' }}>👔</span>
            <span>4 Perspektiven</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#64748b' }}>
            <span style={{ fontSize: '1.25rem' }}>⚖️</span>
            <span>Risikobewertung</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#64748b' }}>
            <span style={{ fontSize: '1.25rem' }}>💡</span>
            <span>Alternativen</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#64748b' }}>
            <span style={{ fontSize: '1.25rem' }}>🤝</span>
            <span>Verhandlungstipps</span>
          </div>
        </footer>
      </div>
    </>
  );
};

export default LegalLensStart;
