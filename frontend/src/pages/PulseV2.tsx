import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/DashboardV2/DashboardLayout';
import { usePulseV2 } from '../hooks/usePulseV2';
import { AnalysisPipeline } from '../components/pulseV2/AnalysisPipeline';
import { ContractDetail } from '../components/pulseV2/ContractDetail';
import type { PulseV2DashboardItem } from '../types/pulseV2';

const API_BASE = '/api';

const PulseV2: React.FC = () => {
  const { contractId } = useParams<{ contractId?: string }>();
  const navigate = useNavigate();

  if (contractId) {
    return (
      <DashboardLayout>
        <ContractView contractId={contractId} />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <DashboardView onSelectContract={(id) => navigate(`/pulse/${id}`)} />
    </DashboardLayout>
  );
};

// ═══════════════════════════════════════════════════════════
// Contract View — Single contract analysis
// ═══════════════════════════════════════════════════════════
const ContractView: React.FC<{ contractId: string }> = ({ contractId }) => {
  const {
    status, progress, progressMessage, stages,
    result, error,
    startAnalysis, cancelAnalysis, loadLatest,
  } = usePulseV2();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await loadLatest(contractId);
      setLoading(false);
    })();
  }, [contractId, loadLatest]);

  const handleStartAnalysis = useCallback(() => {
    startAnalysis(contractId);
  }, [contractId, startAnalysis]);

  if (loading && status === 'idle') {
    return (
      <div style={{ textAlign: 'center', padding: 60, color: '#6b7280' }}>
        Lade...
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px' }}>
      {/* Back button */}
      <button
        onClick={() => navigate('/pulse')}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 12px',
          fontSize: 13,
          color: '#6b7280',
          background: 'none',
          border: '1px solid #e5e7eb',
          borderRadius: 6,
          cursor: 'pointer',
          marginBottom: 16,
        }}
      >
        &#8592; Alle Verträge
      </button>

      {/* Analysis Running */}
      {status === 'analyzing' && (
        <AnalysisPipeline
          stages={stages}
          progress={progress}
          message={progressMessage}
          onCancel={cancelAnalysis}
        />
      )}

      {/* Error */}
      {status === 'error' && (
        <div style={{
          padding: 24,
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: 12,
          marginBottom: 16,
        }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#dc2626', marginBottom: 8 }}>
            Analyse fehlgeschlagen
          </div>
          <div style={{ fontSize: 13, color: '#7f1d1d' }}>{error}</div>
          <button
            onClick={handleStartAnalysis}
            style={{
              marginTop: 12,
              padding: '8px 16px',
              fontSize: 13,
              color: '#fff',
              background: '#dc2626',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
            }}
          >
            Erneut versuchen
          </button>
        </div>
      )}

      {/* Result */}
      {status === 'completed' && result && (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            <button
              onClick={handleStartAnalysis}
              style={{
                padding: '8px 20px',
                fontSize: 13,
                fontWeight: 600,
                color: '#fff',
                background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
              }}
            >
              Erneut analysieren
            </button>
          </div>
          <ContractDetail result={result} />
        </>
      )}

      {/* No result yet */}
      {status === 'idle' && !result && (
        <div style={{
          textAlign: 'center',
          padding: 60,
          background: '#fff',
          borderRadius: 12,
          border: '1px solid #e5e7eb',
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>&#x1f50d;</div>
          <div style={{ fontSize: 18, fontWeight: 600, color: '#111827', marginBottom: 8 }}>
            Noch keine Analyse vorhanden
          </div>
          <div style={{ fontSize: 14, color: '#6b7280', marginBottom: 24 }}>
            Starten Sie eine tiefgehende Legal Pulse V2 Analyse für diesen Vertrag.
          </div>
          <button
            onClick={handleStartAnalysis}
            style={{
              padding: '12px 32px',
              fontSize: 15,
              fontWeight: 600,
              color: '#fff',
              background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
              border: 'none',
              borderRadius: 10,
              cursor: 'pointer',
            }}
          >
            Analyse starten
          </button>
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
// Dashboard View — All contracts overview
// ═══════════════════════════════════════════════════════════
const DashboardView: React.FC<{ onSelectContract: (id: string) => void }> = ({ onSelectContract }) => {
  const [items, setItems] = useState<PulseV2DashboardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, analyzed: 0 });

  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE}/legal-pulse-v2/dashboard`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setItems(data.items || []);
        setStats({ total: data.totalContracts || 0, analyzed: data.analyzedContracts || 0 });
      } catch (err) {
        console.error('Dashboard load error:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 60, color: '#6b7280' }}>Lade Dashboard...</div>;
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111827', margin: 0 }}>
            Legal Pulse
          </h1>
          <div style={{ fontSize: 14, color: '#6b7280', marginTop: 4 }}>
            {stats.analyzed} von {stats.total} Verträgen analysiert
          </div>
        </div>
      </div>

      {items.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: 60,
          background: '#f9fafb',
          borderRadius: 12,
          color: '#6b7280',
        }}>
          Keine Verträge vorhanden.
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320, 1fr))',
          gap: 16,
        }}>
          {items.map(item => (
            <ContractCard key={item.contractId} item={item} onClick={() => onSelectContract(item.contractId)} />
          ))}
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
// Contract Card
// ═══════════════════════════════════════════════════════════
const ContractCard: React.FC<{ item: PulseV2DashboardItem; onClick: () => void }> = ({ item, onClick }) => {
  const score = item.v2Score;
  const scoreColor = score === null ? '#9ca3af' : score >= 80 ? '#22c55e' : score >= 60 ? '#eab308' : score >= 40 ? '#f97316' : '#ef4444';

  return (
    <div
      onClick={onClick}
      style={{
        padding: 16,
        background: '#fff',
        border: '1px solid #e5e7eb',
        borderRadius: 12,
        cursor: 'pointer',
        transition: 'box-shadow 0.2s',
        display: 'flex',
        gap: 16,
        alignItems: 'center',
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = 'none'; }}
    >
      {/* Score Circle */}
      <div style={{
        width: 52,
        height: 52,
        borderRadius: '50%',
        border: `3px solid ${scoreColor}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 18, fontWeight: 700, color: scoreColor }}>
          {score ?? '—'}
        </span>
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 14,
          fontWeight: 600,
          color: '#111827',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {item.name}
        </div>
        <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
          {item.contractType && <span>{item.contractType} · </span>}
          {item.provider && <span>{item.provider} · </span>}
          {item.hasV2Result
            ? `${item.v2FindingsCount} Befunde${item.v2CriticalCount > 0 ? ` (${item.v2CriticalCount} kritisch)` : ''}`
            : 'Noch nicht analysiert'
          }
        </div>
        {item.endDate && (
          <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
            Ablauf: {new Date(item.endDate).toLocaleDateString('de-DE')}
          </div>
        )}
      </div>

      <span style={{ fontSize: 16, color: '#d1d5db' }}>&#8250;</span>
    </div>
  );
};

export default PulseV2;
