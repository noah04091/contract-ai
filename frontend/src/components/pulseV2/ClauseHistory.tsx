import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import type { PulseV2ClauseVersion } from '../../types/pulseV2';

interface ClauseHistoryProps {
  contractId: string;
  clauseId: string;
  onClose: () => void;
}

interface HistoryData {
  clauseId: string;
  clauseTitle: string;
  currentText: string;
  originalText: string;
  history: PulseV2ClauseVersion[];
  totalVersions: number;
}

const SOURCE_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  original: { label: 'Original', color: '#6b7280', bg: '#f3f4f6' },
  legal_pulse_fix: { label: 'Legal Pulse Fix', color: '#059669', bg: '#ecfdf5' },
  user_edit: { label: 'Manuelle Änderung', color: '#2563eb', bg: '#eff6ff' },
};

export const ClauseHistory: React.FC<ClauseHistoryProps> = ({ contractId, clauseId, onClose }) => {
  const [data, setData] = useState<HistoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const res = await fetch(`/api/legal-pulse-v2/clause-history/${contractId}/${clauseId}`, {
          credentials: 'include',
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: 'Fehler' }));
          throw new Error(err.error || `HTTP ${res.status}`);
        }
        const result: HistoryData = await res.json();
        setData(result);
        // Select latest version by default
        if (result.history.length > 0) {
          setSelectedVersion(result.history[result.history.length - 1].version);
        }
      } catch (err) {
        console.error('[PulseV2] Clause history load failed:', err);
        setError(err instanceof Error ? err.message : 'Fehler beim Laden');
      } finally {
        setLoading(false);
      }
    };
    loadHistory();
  }, [contractId, clauseId]);

  const selectedEntry = data?.history.find(h => h.version === selectedVersion);

  const handleCopy = useCallback(() => {
    if (!selectedEntry) return;
    navigator.clipboard.writeText(selectedEntry.text);
  }, [selectedEntry]);

  return createPortal(
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.4)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: '#fff',
        borderRadius: 12,
        width: '90%',
        maxWidth: 700,
        maxHeight: '85vh',
        overflow: 'auto',
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          background: '#fff',
          zIndex: 1,
        }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#111827' }}>
              Klausel-Historie
            </div>
            {data && (
              <div style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>
                {data.clauseTitle} &middot; {data.totalVersions} Version(en)
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              width: 28, height: 28, borderRadius: 6,
              border: '1px solid #d1d5db', background: '#fff',
              cursor: 'pointer', fontSize: 14, color: '#6b7280',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            &#10005;
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: 20 }}>
          {loading && (
            <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>
              Wird geladen...
            </div>
          )}

          {error && (
            <div style={{
              padding: 16, background: '#fef2f2',
              border: '1px solid #fecaca', borderRadius: 8,
              color: '#dc2626', fontSize: 13,
            }}>
              {error}
            </div>
          )}

          {data && !loading && (
            <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 16 }}>
              {/* Version timeline */}
              <div style={{ borderRight: '1px solid #e5e7eb', paddingRight: 16 }}>
                {data.history.map((entry) => {
                  const source = SOURCE_LABELS[entry.source] || SOURCE_LABELS.original;
                  const isSelected = selectedVersion === entry.version;
                  return (
                    <button
                      key={entry.version}
                      onClick={() => setSelectedVersion(entry.version)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        marginBottom: 8,
                        borderRadius: 8,
                        border: isSelected ? '1px solid #3b82f6' : '1px solid #e5e7eb',
                        background: isSelected ? '#eff6ff' : '#fff',
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>
                          v{entry.version}
                        </span>
                        <span style={{
                          fontSize: 10, fontWeight: 600,
                          color: source.color, background: source.bg,
                          padding: '1px 6px', borderRadius: 4,
                        }}>
                          {source.label}
                        </span>
                      </div>
                      <div style={{ fontSize: 11, color: '#9ca3af' }}>
                        {new Date(entry.appliedAt).toLocaleDateString('de-DE', {
                          day: '2-digit', month: '2-digit', year: 'numeric',
                        })}
                      </div>
                      {entry.lawTitle && (
                        <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {entry.lawTitle}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Version detail */}
              <div>
                {selectedEntry ? (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>
                        Version {selectedEntry.version}
                      </div>
                      <button
                        onClick={handleCopy}
                        style={{
                          padding: '4px 12px', fontSize: 12, fontWeight: 600,
                          color: '#2563eb', background: '#eff6ff',
                          border: '1px solid #bfdbfe', borderRadius: 6,
                          cursor: 'pointer',
                        }}
                      >
                        Kopieren
                      </button>
                    </div>

                    {/* Metadata */}
                    {selectedEntry.source !== 'original' && (
                      <div style={{
                        padding: '10px 12px', marginBottom: 12,
                        background: '#f9fafb', borderRadius: 8,
                        border: '1px solid #e5e7eb',
                      }}>
                        {selectedEntry.reasoning && (
                          <div style={{ fontSize: 12, color: '#4b5563', marginBottom: 4 }}>
                            {selectedEntry.reasoning}
                          </div>
                        )}
                        {selectedEntry.legalBasis && (
                          <div style={{ fontSize: 11, color: '#1e40af', fontStyle: 'italic' }}>
                            Rechtsgrundlage: {selectedEntry.legalBasis}
                          </div>
                        )}
                        {selectedEntry.lawTitle && (
                          <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>
                            Gesetzesänderung: {selectedEntry.lawTitle}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Text content */}
                    <div style={{
                      padding: '12px 14px',
                      background: '#fafafa',
                      borderRadius: 8,
                      border: '1px solid #e5e7eb',
                      fontSize: 13,
                      lineHeight: 1.6,
                      whiteSpace: 'pre-wrap',
                      color: '#111827',
                    }}>
                      {selectedEntry.text}
                    </div>
                  </>
                ) : (
                  <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>
                    Version auswählen
                  </div>
                )}
              </div>
            </div>
          )}

          {data && data.history.length <= 1 && (
            <div style={{
              textAlign: 'center', padding: 20,
              color: '#9ca3af', fontSize: 13,
            }}>
              Noch keine Änderungen. Die Klausel ist im Originalzustand.
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
};
