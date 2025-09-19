import React, { useState, useEffect } from 'react';
import './SavedAlternatives.css';

interface SavedAlternative {
  _id: string;
  title: string;
  link: string;
  snippet: string;
  prices: string[];
  provider: string;
  features: string[];
  contractType: string;
  relevantInfo: string;
  hasDetailedData: boolean;
  monthlyPrice: number | null;
  savedAt: string;
  status: 'saved' | 'compared' | 'contacted' | 'dismissed';
  notes: string;
}

interface SavedAlternativesStats {
  totalSaved: number;
  byContractType: Array<{
    _id: string;
    count: number;
    latestSaved: string;
  }>;
}

const SavedAlternatives: React.FC = () => {
  const [alternatives, setAlternatives] = useState<SavedAlternative[]>([]);
  const [stats, setStats] = useState<SavedAlternativesStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSavedAlternatives();
    fetchStats();
  }, []);

  const fetchSavedAlternatives = async () => {
    try {
      const response = await fetch('/api/saved-alternatives', {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setAlternatives(data.alternatives);
      }
    } catch (error) {
      console.error('Error fetching saved alternatives:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/saved-alternatives/stats', {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Möchten Sie diese Alternative wirklich löschen?')) return;

    try {
      const response = await fetch(`/api/saved-alternatives/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        setAlternatives(prev => prev.filter(alt => alt._id !== id));
        fetchStats(); // Update stats

        // Show success message
        const successDiv = document.createElement('div');
        successDiv.innerHTML = `
          <div style="
            position: fixed;
            top: 20px;
            right: 20px;
            background: #ef4444;
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          ">
            🗑️ Alternative gelöscht
          </div>
        `;
        document.body.appendChild(successDiv);
        setTimeout(() => document.body.removeChild(successDiv), 3000);
      }
    } catch (error) {
      console.error('Error deleting alternative:', error);
      alert('Fehler beim Löschen der Alternative');
    }
  };


  // Sort alternatives by newest first
  const sortedAlternatives = alternatives
    .sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());

  // Show up to 5 alternatives in dashboard (oder so viele wie horizontal passen)
  const displayedAlternatives = sortedAlternatives.slice(0, 5);
  
  // DEBUG - Entferne das später wieder
  console.log('Total alternatives:', sortedAlternatives.length);
  console.log('Displayed alternatives:', displayedAlternatives.length);


  if (loading) {
    return (
      <div className="saved-alternatives-loading">
        <div className="spinner"></div>
        <p>Lade gespeicherte Alternativen...</p>
      </div>
    );
  }

  return (
    <div className="saved-alternatives-content">
      {/* Button GANZ OBEN mit absolute positioning */}
      {alternatives.length > 0 && (
        <button
          className="dashboard-view-all-btn"
          onClick={() => window.location.href = '/better-contracts'}
          style={{
            position: 'absolute',
            top: '-70px',  // HIER! Jetzt auf Augenhöhe mit der Überschrift
            right: '0px',
            zIndex: 1000
          }}
        >
          {sortedAlternatives.length > 5 
            ? `Alle ${sortedAlternatives.length} Alternativen in Better Contracts verwalten`
            : 'In Better Contracts verwalten'}
        </button>
      )}

      {/* Header nur mit Stats, OHNE Button */}
      {alternatives.length > 0 && (
        <div className="dashboard-section-header">
          <div className="dashboard-stats-row">
            <div className="dashboard-stat-item">
              <span className="dashboard-stat-number">{stats?.totalSaved || 0}</span>
              <span className="dashboard-stat-label">Gespeichert</span>
            </div>
            <div className="dashboard-stat-item">
              <span className="dashboard-stat-number">{stats?.byContractType.length || 0}</span>
              <span className="dashboard-stat-label">Kategorien</span>
            </div>
          </div>
        </div>
      )}

      {alternatives.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📌</div>
          <h3>Noch keine Alternativen gespeichert</h3>
          <p>Speichern Sie Alternativen in Better Contracts, um sie hier zu verwalten.</p>
          <button
            className="btn-primary"
            onClick={() => window.location.href = '/better-contracts'}
          >
            Zu Better Contracts
          </button>
        </div>
      ) : (
        <>
          <div className="dashboard-alternatives-grid">
            {displayedAlternatives.map((alternative) => (
              <div key={alternative._id} className="dashboard-alternative-card">
                <div className="dashboard-compact-content">
                  <div className="dashboard-compact-header">
                    <h3 className="dashboard-compact-title">{alternative.title}</h3>
                    <span className="dashboard-contract-type-badge">{alternative.contractType}</span>
                  </div>

                  <div className="dashboard-compact-info">
                    <span className="dashboard-provider-text">von {alternative.provider}</span>
                    {alternative.monthlyPrice && (
                      <span className="dashboard-compact-price">{alternative.monthlyPrice}€/Monat</span>
                    )}
                  </div>

                  <div className="dashboard-compact-actions">
                    <a
                      href={alternative.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="dashboard-compact-visit-btn"
                    >
                      Anbieter besuchen
                    </a>
                    <button
                      onClick={() => handleDelete(alternative._id)}
                      className="dashboard-compact-delete-btn"
                      title="Löschen"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Nur zeigen wenn es mehr Alternativen gibt als angezeigt werden */}
          {sortedAlternatives.length > 5 && (
            <div className="dashboard-more-info">
              <span className="dashboard-more-count">
                + {sortedAlternatives.length - 5} weitere Alternative{sortedAlternatives.length - 5 > 1 ? 'n' : ''}
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default SavedAlternatives;