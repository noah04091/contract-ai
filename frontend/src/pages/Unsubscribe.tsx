import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, CheckCircle, XCircle, ArrowLeft, RefreshCw } from 'lucide-react';

export default function Unsubscribe() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'already'>('loading');
  const [email, setEmail] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMessage('Kein Abmelde-Token gefunden. Bitte nutze den Link aus einer E-Mail.');
      return;
    }

    const processUnsubscribe = async () => {
      try {
        const response = await fetch(`/api/email/unsubscribe?token=${encodeURIComponent(token)}`, {
          credentials: 'include'
        });

        const data = await response.json();

        if (response.ok && data.success) {
          setEmail(data.email || '');
          if (data.message?.includes('bereits')) {
            setStatus('already');
          } else {
            setStatus('success');
          }
        } else {
          setStatus('error');
          setErrorMessage(data.error || 'Fehler bei der Abmeldung');
        }
      } catch {
        setStatus('error');
        setErrorMessage('Verbindungsfehler. Bitte versuche es erneut.');
      }
    };

    processUnsubscribe();
  }, [token]);

  const handleResubscribe = async () => {
    if (!email) return;

    try {
      const response = await fetch('/api/email/resubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, category: 'calendar' })
      });

      if (response.ok) {
        setStatus('loading');
        setTimeout(() => {
          navigate('/dashboard');
        }, 1500);
      }
    } catch {
      // Ignore errors
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
        {status === 'loading' && (
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
              Abmeldung wird verarbeitet...
            </h1>
            <p style={{ color: '#666', fontSize: '15px' }}>
              Bitte warte einen Moment.
            </p>
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
