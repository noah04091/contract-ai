// 📁 pages/LegalLens.tsx
// Legal Lens Seite - Interaktive Vertragsanalyse

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion, AnimatePresence } from 'framer-motion';
import { LegalLensViewer } from '../components/LegalLens';
import { WelcomePopup } from '../components/Tour';
import UnifiedPremiumNotice from '../components/UnifiedPremiumNotice';
import { Search, Crown, Sparkles } from 'lucide-react';

// Plans mit vollem Legal Lens Zugriff
const LEGAL_LENS_ACCESS_PLANS = ['business', 'enterprise', 'legendary'];

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

  // 🔒 Premium Access State
  const [userPlan, setUserPlan] = useState<string>('free');
  const [planLoading, setPlanLoading] = useState(true);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const hasAccess = LEGAL_LENS_ACCESS_PLANS.includes(userPlan);

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

  // 🔒 Fetch user plan for premium access check
  useEffect(() => {
    const fetchUserPlan = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setPlanLoading(false);
          return;
        }

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
        const response = await fetch(`${apiUrl}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          setUserPlan(data.subscriptionPlan || data.user?.subscriptionPlan || 'free');
        }
      } catch (err) {
        console.error('Error fetching user plan:', err);
      } finally {
        setPlanLoading(false);
      }
    };
    fetchUserPlan();
  }, []);

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

  // 🔒 No Access - Show Banner and Blocked View
  if (!planLoading && !hasAccess) {
    return (
      <>
        <Helmet>
          <title>Legal Lens | Contract AI</title>
        </Helmet>

        {/* Full-Width Premium Banner */}
        <UnifiedPremiumNotice
          featureName="Legal Lens"
          variant="fullWidth"
        />

        {/* Blocked Content */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 'calc(100vh - 120px)',
          padding: '2rem',
          textAlign: 'center',
          background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '20px',
            padding: '48px',
            maxWidth: '500px',
            boxShadow: '0 4px 24px rgba(0, 0, 0, 0.08)'
          }}>
            <div style={{
              width: '80px',
              height: '80px',
              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
              borderRadius: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px'
            }}>
              <Search size={40} color="white" />
            </div>
            <h2 style={{ fontSize: '24px', fontWeight: 600, color: '#1e293b', marginBottom: '12px' }}>
              Legal Lens - Premium Feature
            </h2>
            <p style={{ color: '#64748b', marginBottom: '24px', lineHeight: '1.6' }}>
              Die interaktive Vertragsanalyse ist nur mit einem Business- oder Enterprise-Plan verfügbar.
              Upgraden Sie jetzt, um Klauseln zu verstehen und Risiken zu erkennen.
            </p>
            <button
              onClick={() => setShowUpgradeModal(true)}
              style={{
                padding: '14px 28px',
                borderRadius: '12px',
                border: 'none',
                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                color: 'white',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '15px'
              }}
            >
              <Sparkles size={18} />
              Jetzt upgraden
            </button>
          </div>
        </div>

        {/* 🔒 Upgrade Modal */}
        <AnimatePresence>
          {showUpgradeModal && (
            <motion.div
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0, 0, 0, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 9999,
                padding: '20px'
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowUpgradeModal(false)}
            >
              <motion.div
                style={{
                  background: 'white',
                  borderRadius: '20px',
                  padding: '32px',
                  maxWidth: '420px',
                  width: '100%',
                  textAlign: 'center'
                }}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
              >
                <div style={{
                  width: '64px',
                  height: '64px',
                  background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                  borderRadius: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 20px'
                }}>
                  <Crown size={32} color="white" />
                </div>
                <h3 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '12px', color: '#1e293b' }}>
                  Premium-Funktion
                </h3>
                <p style={{ color: '#64748b', marginBottom: '24px', lineHeight: '1.6' }}>
                  Legal Lens ist nur mit einem Business- oder Enterprise-Plan verfügbar.
                  Upgraden Sie jetzt für volle Vertragsanalyse mit KI.
                </p>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                  <button
                    onClick={() => setShowUpgradeModal(false)}
                    style={{
                      padding: '12px 24px',
                      borderRadius: '10px',
                      border: '1px solid #e2e8f0',
                      background: 'white',
                      color: '#64748b',
                      fontWeight: 500,
                      cursor: 'pointer'
                    }}
                  >
                    Später
                  </button>
                  <button
                    onClick={() => window.location.href = '/pricing'}
                    style={{
                      padding: '12px 24px',
                      borderRadius: '10px',
                      border: 'none',
                      background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                      color: 'white',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <Sparkles size={18} />
                    Jetzt upgraden
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </>
    );
  }

  return (
    <>
      <WelcomePopup
        featureId="legal-lens"
        icon={<Search size={32} />}
        title="Legal Lens - Klauseln verstehen"
        description="Klicken Sie auf beliebige Stellen im Vertrag, um eine verständliche Erklärung zu erhalten. Risiken werden farblich markiert."
        tip="Grün = Unbedenklich, Gelb = Achtung, Rot = Risiko. Klicken Sie für Details und Verhandlungstipps."
      />
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
