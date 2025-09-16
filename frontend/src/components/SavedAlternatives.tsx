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


  // Sort alternatives by newest first and show only first 3 in dashboard
  const sortedAlternatives = alternatives
    .sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());

  // Show only first 3 alternatives in dashboard
  const displayedAlternatives = sortedAlternatives.slice(0, 3);


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
      {stats && (
        <div className="stats-summary">
          <div className="stat-item">
            <span className="stat-number">{stats.totalSaved}</span>
            <span className="stat-label">Gespeichert</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">{stats.byContractType.length}</span>
            <span className="stat-label">Kategorien</span>
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
          <div className="alternatives-grid">
            {displayedAlternatives.map((alternative) => (
              <div key={alternative._id} className="alternative-card">
                <div className="compact-card-content">
                  <div className="compact-header">
                    <h3 className="compact-title">{alternative.title}</h3>
                    <span className="contract-type-badge">{alternative.contractType}</span>
                  </div>

                  <div className="compact-info">
                    <span className="provider-text">von {alternative.provider}</span>
                    {alternative.monthlyPrice && (
                      <span className="compact-price">{alternative.monthlyPrice}€/Monat</span>
                    )}
                  </div>

                  <div className="compact-actions">
                    <a
                      href={alternative.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="compact-visit-btn"
                    >
                      Anbieter besuchen
                    </a>
                    <button
                      onClick={() => handleDelete(alternative._id)}
                      className="compact-delete-btn"
                      title="Löschen"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {sortedAlternatives.length > 3 && (
            <div className="show-more-container">
              <p className="alternatives-count">
                {sortedAlternatives.length - 3} weitere Alternativen verfügbar
              </p>
              <button
                className="btn-primary"
                onClick={() => window.location.href = '/better-contracts'}
              >
                Alle {sortedAlternatives.length} Alternativen in Better Contracts verwalten
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default SavedAlternatives;