import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, CheckCircle, XCircle, ArrowLeft, RefreshCw, BellOff } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || '';

export default function Unsubscribe() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'verifying' | 'confirm' | 'processing' | 'success' | 'error' | 'already'>('verifying');
  const [email, setEmail] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Step 1: Verify the token and get current status
  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMessage('Kein Abmelde-Token gefunden. Bitte nutze den Link aus einer E-Mail.');
      return;
    }

    const verifyToken = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/auth/unsubscribe?token=${encodeURIComponent(token)}`, {
          credentials: 'include'
        });

        const data = await response.json();

        if (response.ok && data.success) {
          setEmail(data.email || '');

          if (!data.currentStatus) {
            // Already unsubscribed
            setStatus('already');
          } else {
            // Show confirmation
            setStatus('confirm');
          }
        } else {
          setStatus('error');
          setErrorMessage(data.message || 'Ungültiger oder abgelaufener Abmelde-Link');
        }
      } catch {
        setStatus('error');
        setErrorMessage('Verbindungsfehler. Bitte versuche es erneut.');
      }
    };

    verifyToken();
  }, [token]);

  // Step 2: Process unsubscribe when user confirms
  const handleUnsubscribe = async () => {
    if (!token) return;

    setStatus('processing');

    try {
      const response = await fetch(`${API_BASE}/api/auth/unsubscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ token })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setStatus('success');
      } else {
        setStatus('error');
        setErrorMessage(data.message || 'Fehler bei der Abmeldung');
      }
    } catch {
      setStatus('error');
      setErrorMessage('Verbindungsfehler. Bitte versuche es erneut.');
    }
  };

  // Resubscribe functionality
  const handleResubscribe = async () => {
    if (!token) return;

    setStatus('processing');

    try {
      const response = await fetch(`${API_BASE}/api/auth/resubscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ token })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Successfully resubscribed, navigate to dashboard
        navigate('/dashboard');
      } else {
        setStatus('error');
        setErrorMessage(data.message || 'Fehler beim Anmelden');
      }
    } catch {
      setStatus('error');
      setErrorMessage('Verbindungsfehler');
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f5f7fa 0%, #e4e8ec 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{
          background: 'white',
          borderRadius: '20px',
          padding: '50px',
          maxWidth: '480px',
          width: '100%',
          textAlign: 'center',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.1)'
        }}
      >
        {(status === 'verifying' || status === 'processing') && (
          <>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #3B82F6, #60A5FA)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px'
            }}>
              <RefreshCw size={36} color="white" className="animate-spin" />
            </div>
            <h1 style={{ fontSize: '24px', fontWeight: 600, color: '#1a1a1a', marginBottom: '12px' }}>
              {status === 'verifying' ? 'Link wird überprüft...' : 'Abmeldung wird verarbeitet...'}
            </h1>
            <p style={{ color: '#666', fontSize: '15px' }}>
              Bitte warte einen Moment.
            </p>
          </>
        )}

        {status === 'confirm' && (
          <>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #F59E0B, #FBBF24)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px'
            }}>
              <BellOff size={36} color="white" />
            </div>
            <h1 style={{ fontSize: '24px', fontWeight: 600, color: '#1a1a1a', marginBottom: '12px' }}>
              E-Mail-Benachrichtigungen abmelden?
            </h1>
            {email && (
              <p style={{ color: '#999', fontSize: '13px', marginBottom: '8px' }}>
                E-Mail: <strong>{email}</strong>
              </p>
            )}
            <p style={{ color: '#666', fontSize: '15px', marginBottom: '24px' }}>
              Du erhältst dann keine Legal Pulse Digest-E-Mails mehr zu Rechtsänderungen, die deine Verträge betreffen könnten.
            </p>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={() => navigate('/')}
                style={{
                  padding: '12px 24px',
                  background: 'white',
                  border: '1px solid #ddd',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: '#666',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <ArrowLeft size={16} />
                Abbrechen
              </button>
              <button
                onClick={handleUnsubscribe}
                style={{
                  padding: '12px 24px',
                  background: '#EF4444',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <BellOff size={16} />
                Ja, abmelden
              </button>
            </div>
          </>
        )}

        {status === 'success' && (
          <>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #22C55E, #4ADE80)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px'
            }}>
              <CheckCircle size={40} color="white" />
            </div>
            <h1 style={{ fontSize: '24px', fontWeight: 600, color: '#1a1a1a', marginBottom: '12px' }}>
              Erfolgreich abgemeldet
            </h1>
            <p style={{ color: '#666', fontSize: '15px', marginBottom: '8px' }}>
              Du wirst keine E-Mail-Benachrichtigungen mehr erhalten.
            </p>
            {email && (
              <p style={{ color: '#999', fontSize: '13px', marginBottom: '24px' }}>
                E-Mail: <strong>{email}</strong>
              </p>
            )}
            <p style={{ color: '#888', fontSize: '14px', marginBottom: '24px' }}>
              Du kannst dich jederzeit in den Profileinstellungen wieder anmelden.
            </p>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={handleResubscribe}
                style={{
                  padding: '12px 24px',
                  background: 'white',
                  border: '1px solid #ddd',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: '#666',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <Mail size={16} />
                Wieder anmelden
              </button>
              <button
                onClick={() => navigate('/')}
                style={{
                  padding: '12px 24px',
                  background: '#3B82F6',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <ArrowLeft size={16} />
                Zur Startseite
              </button>
            </div>
          </>
        )}

        {status === 'already' && (
          <>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #3B82F6, #60A5FA)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px'
            }}>
              <Mail size={36} color="white" />
            </div>
            <h1 style={{ fontSize: '24px', fontWeight: 600, color: '#1a1a1a', marginBottom: '12px' }}>
              Bereits abgemeldet
            </h1>
            <p style={{ color: '#666', fontSize: '15px', marginBottom: '24px' }}>
              Du bist bereits von E-Mail-Benachrichtigungen abgemeldet.
            </p>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={handleResubscribe}
                style={{
                  padding: '12px 24px',
                  background: 'white',
                  border: '1px solid #ddd',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: '#666',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <Mail size={16} />
                Wieder anmelden
              </button>
              <button
                onClick={() => navigate('/')}
                style={{
                  padding: '12px 24px',
                  background: '#3B82F6',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <ArrowLeft size={16} />
                Zur Startseite
              </button>
            </div>
          </>
        )}

        {status === 'error' && (
          <>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #EF4444, #F87171)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px'
            }}>
              <XCircle size={40} color="white" />
            </div>
            <h1 style={{ fontSize: '24px', fontWeight: 600, color: '#1a1a1a', marginBottom: '12px' }}>
              Abmeldung fehlgeschlagen
            </h1>
            <p style={{ color: '#666', fontSize: '15px', marginBottom: '24px' }}>
              {errorMessage}
            </p>

            <button
              onClick={() => navigate('/')}
              style={{
                padding: '12px 24px',
                background: '#3B82F6',
                border: 'none',
                borderRadius: '10px',
                fontSize: '14px',
                fontWeight: 500,
                color: 'white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                margin: '0 auto'
              }}
            >
              <ArrowLeft size={16} />
              Zur Startseite
            </button>
          </>
        )}
      </motion.div>
    </div>
  );
}
