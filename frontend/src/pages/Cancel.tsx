// src/pages/Cancel.tsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import OneClickCancelModal from '../components/OneClickCancelModal';
import { Loader2 } from 'lucide-react';

interface Contract {
  _id: string;
  name: string;
  provider?: string;
  contractNumber?: string;
  customerNumber?: string;
  expiryDate?: string;
  amount?: number;
  address?: {
    street?: string;
    city?: string;
    zip?: string;
  };
}

export default function Cancel() {
  const { contractId } = useParams();
  const navigate = useNavigate();
  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchContract = async () => {
      if (!contractId) {
        setError('Keine Vertrags-ID angegeben');
        setLoading(false);
        return;
      }

      try {
        const token = localStorage.getItem("token") || 
                      localStorage.getItem("authToken") || 
                      localStorage.getItem("jwtToken");
        
        const headers: Record<string, string> = {};
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }

        // ✅ FIX: Type the axios response properly
        const response = await axios.get<Contract>(`/api/contracts/${contractId}`, {
          headers,
          withCredentials: true
        });

        setContract(response.data);
      } catch (err) {
        console.error('Fehler beim Laden des Vertrags:', err);
        setError('Vertrag konnte nicht geladen werden');
      } finally {
        setLoading(false);
      }
    };

    fetchContract();
  }, [contractId]);

  const handleClose = () => {
    navigate(-1); // Zurück zur vorherigen Seite
  };

  const handleSuccess = () => {
    navigate('/contracts'); // Nach erfolgreicher Kündigung zu Verträgen
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: '#f5f5f7'
      }}>
        <div style={{ textAlign: 'center' }}>
          <Loader2 className="animate-spin" size={48} style={{ color: '#007aff' }} />
          <p style={{ marginTop: '16px', color: '#86868b' }}>Vertrag wird geladen...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: '#f5f5f7'
      }}>
        <div style={{
          background: 'white',
          padding: '32px',
          borderRadius: '16px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
          textAlign: 'center',
          maxWidth: '400px'
        }}>
          <h2 style={{ color: '#ff3b30', marginBottom: '16px' }}>Fehler</h2>
          <p style={{ color: '#86868b', marginBottom: '24px' }}>{error}</p>
          <button
            onClick={() => navigate(-1)}
            style={{
              background: '#007aff',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '8px',
              fontSize: '16px',
              cursor: 'pointer'
            }}
          >
            Zurück
          </button>
        </div>
      </div>
    );
  }

  if (!contract) {
    return null;
  }

  return (
    <OneClickCancelModal
      contract={contract}
      show={true}
      onClose={handleClose}
      onSuccess={handleSuccess}
    />
  );
}