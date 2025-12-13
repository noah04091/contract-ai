// 📁 pages/LegalLens.tsx
// Legal Lens Seite - Interaktive Vertragsanalyse

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { LegalLensViewer } from '../components/LegalLens';

interface Contract {
  _id: string;
  name: string;
  title?: string;
}

const LegalLens = () => {
  const { contractId } = useParams<{ contractId: string }>();
  const navigate = useNavigate();
  const [contract, setContract] = useState<Contract | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Vertrag laden um den Namen zu bekommen
  useEffect(() => {
    const fetchContract = async () => {
      if (!contractId) {
        setError('Keine Vertrags-ID angegeben');
        setIsLoading(false);
        return;
      }

      try {
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

        const apiUrl = getApiUrl();
        const response = await fetch(`${apiUrl}/api/contracts/${contractId}`, {
          credentials: 'include'
        });

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Vertrag nicht gefunden');
          }
          throw new Error('Fehler beim Laden des Vertrags');
        }

        const data = await response.json();
        setContract(data);
      } catch (err) {
        console.error('[Legal Lens] Error loading contract:', err);
        setError(err instanceof Error ? err.message : 'Unbekannter Fehler');
      } finally {
        setIsLoading(false);
      }
    };

    fetchContract();
  }, [contractId]);

  // Error State
  if (error) {
    return (
      <>
        <Helmet>
          <title>Legal Lens - Fehler | Contract AI</title>
        </Helmet>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          padding: '2rem',
          textAlign: 'center'
        }}>
          <span style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</span>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: '#1e293b' }}>
            Fehler beim Laden
          </h1>
          <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>{error}</p>
          <button
            onClick={() => navigate('/contracts')}
            style={{
              padding: '0.75rem 1.5rem',
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '0.875rem'
            }}
          >
            Zurück zu Verträgen
          </button>
        </div>
      </>
    );
  }

  // Loading State
  if (isLoading) {
    return (
      <>
        <Helmet>
          <title>Legal Lens - Lade... | Contract AI</title>
        </Helmet>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh'
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            border: '3px solid #e2e8f0',
            borderTopColor: '#3b82f6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
          <style>{`
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}</style>
          <p style={{ marginTop: '1rem', color: '#64748b' }}>
            Vertrag wird geladen...
          </p>
        </div>
      </>
    );
  }

  // No Contract ID
  if (!contractId) {
    return (
      <>
        <Helmet>
          <title>Legal Lens | Contract AI</title>
        </Helmet>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          padding: '2rem',
          textAlign: 'center'
        }}>
          <span style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔍</span>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: '#1e293b' }}>
            Kein Vertrag ausgewählt
          </h1>
          <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>
            Bitte wählen Sie einen Vertrag aus, um Legal Lens zu nutzen.
          </p>
          <button
            onClick={() => navigate('/contracts')}
            style={{
              padding: '0.75rem 1.5rem',
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '0.875rem'
            }}
          >
            Zu meinen Verträgen
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>Legal Lens: {contract?.name || 'Analyse'} | Contract AI</title>
        <meta name="description" content="Interaktive Vertragsanalyse mit KI - Klauseln verstehen, Risiken erkennen, Verhandlungstipps erhalten." />
      </Helmet>

      <LegalLensViewer
        contractId={contractId}
        contractName={contract?.name || contract?.title || 'Vertrag'}
      />
    </>
  );
};

export default LegalLens;
