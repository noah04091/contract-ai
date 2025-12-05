import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import "../styles/SplitAuth.css";

// Back Arrow Icon SVG
const BackArrowIcon = () => (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
  </svg>
);

// Check Icon SVG
const CheckIcon = () => (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
  </svg>
);

// X Icon SVG
const XIcon = () => (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

// Shield Icon SVG
const ShieldIcon = () => (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);

// Document Icon SVG
const DocumentIcon = () => (
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

// Loading Spinner
const LoadingSpinner = () => (
  <div className="split-auth-loading-spinner">
    <svg viewBox="0 0 50 50">
      <circle cx="25" cy="25" r="20" fill="none" stroke="currentColor" strokeWidth="4" strokeDasharray="80" strokeLinecap="round">
        <animateTransform attributeName="transform" type="rotate" from="0 25 25" to="360 25 25" dur="1s" repeatCount="indefinite" />
      </circle>
    </svg>
  </div>
);

interface ContractVerification {
  verified: boolean;
  message: string;
  contract?: {
    id: string;
    name: string;
    type: string;
    status: string;
    createdAt: string;
    updatedAt: string;
    designVariant: string;
  };
  platform?: {
    name: string;
    url: string;
    verifiedAt: string;
  };
  error?: string;
}

export default function VerifyContract() {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [verification, setVerification] = useState<ContractVerification | null>(null);

  useEffect(() => {
    const verifyContract = async () => {
      if (!id) {
        setVerification({
          verified: false,
          message: 'Keine Vertrags-ID angegeben',
          error: 'MISSING_ID'
        });
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_URL || 'https://api.contract-ai.de'}/api/contracts/verify/${id}`
        );
        const data = await response.json();
        setVerification(data);
      } catch (error) {
        console.error('Verifizierungsfehler:', error);
        setVerification({
          verified: false,
          message: 'Verbindungsfehler bei der Verifizierung',
          error: 'CONNECTION_ERROR'
        });
      } finally {
        setLoading(false);
      }
    };

    verifyContract();
  }, [id]);

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <>
      <Helmet>
        <title>Vertragsverifizierung | Contract AI</title>
        <meta name="robots" content="noindex, nofollow" />
        <meta name="description" content="Verifizieren Sie die Echtheit eines Vertrags von Contract AI." />
      </Helmet>

      <div className="split-auth-container">
        {/* Left Side - Branding */}
        <div className={`split-auth-branding ${verification?.verified ? 'green' : loading ? '' : 'red'}`}>
          {/* Background Effects */}
          <div className="split-auth-bg-effects">
            <div className="split-auth-bg-circle-1"></div>
            <div className="split-auth-bg-circle-2"></div>
          </div>

          <div className="split-auth-branding-content">
            {/* Logo - Klickbar zur Homepage */}
            <Link to="/" className="split-auth-logo-link">
              <div className="split-auth-back-arrow">
                <BackArrowIcon />
              </div>
              <img src="/logo-contractai.png" alt="Contract AI" className="split-auth-logo-img" />
            </Link>

            {/* Headline */}
            <h1 className="split-auth-headline">
              Vertrags-<br />Verifizierung
            </h1>
            <p className="split-auth-subheadline">
              {loading
                ? 'Der Vertrag wird verifiziert...'
                : verification?.verified
                  ? 'Dieser Vertrag wurde erfolgreich in unserem System verifiziert.'
                  : 'Der Vertrag konnte nicht verifiziert werden.'
              }
            </p>

            {/* Security Features */}
            <div className="split-auth-features">
              {[
                "Digitale Signatur-Prüfung",
                "Manipulationsschutz",
                "Zeitstempel-Validierung",
                "Blockchain-ähnliche Sicherheit",
              ].map((feature, i) => (
                <div key={i} className="split-auth-feature">
                  <span className="split-auth-feature-icon"><ShieldIcon /></span>
                  <span className="split-auth-feature-text">{feature}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="split-auth-branding-footer">
            <p className="split-auth-footer-text">
              Sichere Vertragsverwaltung mit Contract AI
            </p>
          </div>
        </div>

        {/* Right Side - Verification Result */}
        <div className="split-auth-form-side">
          <div className="split-auth-form-container">
            {/* Mobile Logo */}
            <Link to="/" className="split-auth-mobile-logo-link">
              <div className="split-auth-mobile-back-arrow">
                <BackArrowIcon />
              </div>
              <img src="/logo.png" alt="Contract AI" className="split-auth-mobile-logo-img" />
            </Link>

            {/* Content */}
            <div className="split-auth-success">
              {loading ? (
                <>
                  <LoadingSpinner />
                  <h2 className="split-auth-success-title" style={{ marginTop: '2rem' }}>
                    Verifizierung läuft...
                  </h2>
                  <p className="split-auth-success-text">
                    Der Vertrag wird überprüft. Bitte warten Sie einen Moment.
                  </p>
                </>
              ) : verification?.verified ? (
                <>
                  {/* Success Icon */}
                  <div className="split-auth-success-icon" style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}>
                    <CheckIcon />
                  </div>

                  <h2 className="split-auth-success-title">Vertrag verifiziert!</h2>
                  <p className="split-auth-success-text">
                    Dieser Vertrag wurde in unserem System gefunden und ist authentisch.
                  </p>

                  {/* Contract Details */}
                  <div style={{
                    background: '#f8fafc',
                    borderRadius: '12px',
                    padding: '1.5rem',
                    marginTop: '1.5rem',
                    width: '100%',
                    maxWidth: '400px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                      <DocumentIcon />
                      <span style={{ fontWeight: 600, color: '#1e293b' }}>Vertragsdaten</span>
                    </div>

                    <div style={{ display: 'grid', gap: '0.75rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                        <span style={{ color: '#64748b' }}>Name:</span>
                        <span style={{ color: '#1e293b', fontWeight: 500 }}>{verification.contract?.name}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                        <span style={{ color: '#64748b' }}>Typ:</span>
                        <span style={{ color: '#1e293b', fontWeight: 500 }}>{verification.contract?.type}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                        <span style={{ color: '#64748b' }}>Status:</span>
                        <span style={{
                          color: verification.contract?.status === 'Aktiv' ? '#10b981' : '#f59e0b',
                          fontWeight: 500
                        }}>
                          {verification.contract?.status}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                        <span style={{ color: '#64748b' }}>Erstellt:</span>
                        <span style={{ color: '#1e293b', fontWeight: 500 }}>{formatDate(verification.contract?.createdAt || '')}</span>
                      </div>
                      {verification.platform?.verifiedAt && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', borderTop: '1px solid #e2e8f0', paddingTop: '0.75rem', marginTop: '0.5rem' }}>
                          <span style={{ color: '#64748b' }}>Verifiziert am:</span>
                          <span style={{ color: '#10b981', fontWeight: 500 }}>{formatDate(verification.platform.verifiedAt)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Platform Badge */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    marginTop: '1.5rem',
                    padding: '0.75rem 1rem',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    borderRadius: '8px',
                    color: 'white',
                    fontSize: '0.85rem'
                  }}>
                    <ShieldIcon />
                    <span>Verifiziert von Contract AI</span>
                  </div>
                </>
              ) : (
                <>
                  {/* Error Icon */}
                  <div className="split-auth-success-icon" style={{ background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' }}>
                    <XIcon />
                  </div>

                  <h2 className="split-auth-success-title" style={{ color: '#ef4444' }}>
                    Verifizierung fehlgeschlagen
                  </h2>
                  <p className="split-auth-success-text">
                    {verification?.message || 'Der Vertrag konnte nicht verifiziert werden.'}
                  </p>

                  {/* Error Details */}
                  <div style={{
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: '12px',
                    padding: '1rem',
                    marginTop: '1.5rem',
                    width: '100%',
                    maxWidth: '400px',
                    textAlign: 'center'
                  }}>
                    <p style={{ color: '#dc2626', fontSize: '0.9rem', margin: 0 }}>
                      {verification?.error === 'NOT_FOUND'
                        ? 'Dieser Vertrag existiert nicht in unserem System oder wurde gelöscht.'
                        : verification?.error === 'INVALID_ID'
                          ? 'Die angegebene Vertrags-ID ist ungültig.'
                          : 'Es ist ein Fehler bei der Verifizierung aufgetreten.'
                      }
                    </p>
                  </div>
                </>
              )}

              {/* Alternative Links */}
              <div className="split-auth-alt-links" style={{ marginTop: '2rem' }}>
                <Link to="/" className="split-auth-alt-link">
                  Zur Startseite
                </Link>
                <span className="split-auth-alt-separator">|</span>
                <Link to="/login" className="split-auth-alt-link">
                  Anmelden
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
