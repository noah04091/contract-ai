import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { FileText, Clock, Trash2, Loader2, ExternalLink, AlertTriangle, Sparkles, Plus } from 'lucide-react';
import { apiCall } from '../utils/api';
import styles from '../styles/OptimizerHistory.module.css';

interface HistoryItem {
  _id: string;
  requestId: string;
  fileName: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  scores?: { overall: number };
  structure?: {
    contractType: string;
    contractTypeLabel: string;
    recognizedAs: string;
  };
  performance?: {
    clauseCount: number;
    optimizedCount: number;
  };
  createdAt: string;
  completedAt?: string;
}

function getScoreColor(score: number): string {
  if (score >= 80) return '#34C759';
  if (score >= 60) return '#FF9500';
  if (score >= 40) return '#FF3B30';
  return '#AF52DE';
}

function getStatusConfig(status: HistoryItem['status']) {
  switch (status) {
    case 'completed': return { label: 'Abgeschlossen', color: '#34C759' };
    case 'running': return { label: 'Läuft...', color: '#007AFF' };
    case 'failed': return { label: 'Fehlgeschlagen', color: '#FF3B30' };
    case 'cancelled': return { label: 'Abgebrochen', color: '#8E8E93' };
    default: return { label: 'Ausstehend', color: '#FF9500' };
  }
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
    + ' ' + d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}

export default function OptimizerHistory() {
  const navigate = useNavigate();
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiCall('/optimizer-v2/history') as { success: boolean; results: HistoryItem[] };
      if (data?.success) {
        setItems(data.results);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { navigate('/login'); return; }
    loadHistory();
  }, [navigate, loadHistory]);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Analyse wirklich löschen?')) return;
    setDeletingId(id);
    try {
      await apiCall(`/optimizer-v2/results/${id}`, { method: 'DELETE' });
      setItems(prev => prev.filter(item => item._id !== id));
    } catch {
      // silent
    } finally {
      setDeletingId(null);
    }
  };

  const handleOpen = (item: HistoryItem) => {
    if (item.status !== 'completed') return;
    navigate(`/optimizer-v2?result=${item._id}`);
  };

  return (
    <>
      <Helmet>
        <title>Analyse-Historie - Contract AI</title>
      </Helmet>

      <div className={styles.page}>
        {/* Header area */}
        <div className={styles.headerArea}>
          <div className={styles.headerLeft}>
            <h1 className={styles.headerTitle}>Analyse-Historie</h1>
            <p className={styles.headerDesc}>
              Alle bisherigen Vertragsanalysen im Überblick
            </p>
          </div>
          <button className={styles.newAnalysisBtn} onClick={() => navigate('/optimizer-v2')}>
            <Plus size={16} />
            Neue Analyse
          </button>
        </div>

        {/* Content card */}
        <div className={styles.card}>
          {loading ? (
            <div className={styles.loadingState}>
              <Loader2 size={24} className={styles.spin} />
              <span>Lade Historie...</span>
            </div>
          ) : items.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>
                <FileText size={32} />
              </div>
              <h3>Noch keine Analysen</h3>
              <p>Starte deine erste Vertragsanalyse im Optimizer.</p>
              <button className={styles.ctaBtn} onClick={() => navigate('/optimizer-v2')}>
                <Sparkles size={16} />
                Erste Analyse starten
              </button>
            </div>
          ) : (
            <>
              <div className={styles.cardHeader}>
                <span className={styles.cardCount}>{items.length} {items.length === 1 ? 'Analyse' : 'Analysen'}</span>
              </div>
              <div className={styles.tableHeader}>
                <span className={styles.colFile}>Vertrag</span>
                <span className={styles.colType}>Typ</span>
                <span className={styles.colScore}>Score</span>
                <span className={styles.colClauses}>Klauseln</span>
                <span className={styles.colStatus}>Status</span>
                <span className={styles.colDate}>Datum</span>
                <span className={styles.colActions}></span>
              </div>

              {items.map(item => {
                const statusCfg = getStatusConfig(item.status);
                const score = item.scores?.overall;
                return (
                  <div
                    key={item._id}
                    className={`${styles.row} ${item.status === 'completed' ? styles.rowClickable : ''}`}
                    onClick={() => handleOpen(item)}
                  >
                    <div className={styles.colFile}>
                      <FileText size={16} className={styles.fileIcon} />
                      <span className={styles.fileName}>{item.fileName || 'Unbenannt'}</span>
                    </div>

                    <div className={styles.colType}>
                      <span className={styles.contractType}>
                        {item.structure?.recognizedAs || item.structure?.contractTypeLabel || '-'}
                      </span>
                    </div>

                    <div className={styles.colScore}>
                      {score !== undefined ? (
                        <span className={styles.score} style={{ color: getScoreColor(score) }}>
                          {score}
                        </span>
                      ) : (
                        <span className={styles.noScore}>-</span>
                      )}
                    </div>

                    <div className={styles.colClauses}>
                      <span>{item.performance?.clauseCount || '-'}</span>
                      {item.performance?.optimizedCount ? (
                        <span className={styles.optimizedCount} title="Optimierbar">
                          ({item.performance.optimizedCount})
                        </span>
                      ) : null}
                    </div>

                    <div className={styles.colStatus}>
                      <span className={styles.statusBadge} style={{ color: statusCfg.color, borderColor: statusCfg.color }}>
                        {item.status === 'failed' && <AlertTriangle size={11} />}
                        {statusCfg.label}
                      </span>
                    </div>

                    <div className={styles.colDate}>
                      <Clock size={12} className={styles.clockIcon} />
                      <span>{formatDate(item.createdAt)}</span>
                    </div>

                    <div className={styles.colActions}>
                      {item.status === 'completed' && (
                        <button
                          className={styles.openBtn}
                          onClick={(e) => { e.stopPropagation(); handleOpen(item); }}
                          title="Analyse öffnen"
                        >
                          <ExternalLink size={14} />
                        </button>
                      )}
                      <button
                        className={styles.deleteBtn}
                        onClick={(e) => handleDelete(item._id, e)}
                        disabled={deletingId === item._id}
                        title="Löschen"
                      >
                        {deletingId === item._id ? <Loader2 size={14} className={styles.spin} /> : <Trash2 size={14} />}
                      </button>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>
    </>
  );
}
