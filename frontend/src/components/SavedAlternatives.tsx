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
  const [filterType, setFilterType] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'price' | 'type'>('newest');

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

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      const response = await fetch(`/api/saved-alternatives/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ status })
      });

      if (response.ok) {
        setAlternatives(prev =>
          prev.map(alt =>
            alt._id === id ? { ...alt, status: status as 'saved' | 'compared' | 'contacted' | 'dismissed' } : alt
          )
        );
      }
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  // Filter and sort alternatives
  const filteredAlternatives = alternatives
    .filter(alt => filterType === 'all' || alt.contractType === filterType)
    .sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime();
        case 'oldest':
          return new Date(a.savedAt).getTime() - new Date(b.savedAt).getTime();
        case 'price': {
          const priceA = a.monthlyPrice || 0;
          const priceB = b.monthlyPrice || 0;
          return priceA - priceB;
        }
        case 'type':
          return a.contractType.localeCompare(b.contractType);
        default:
          return 0;
      }
    });

  // Get unique contract types for filter
  const contractTypes = Array.from(new Set(alternatives.map(alt => alt.contractType)));

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'saved': return '#6b7280';
      case 'compared': return '#f59e0b';
      case 'contacted': return '#10b981';
      case 'dismissed': return '#ef4444';
      default: return '#6b7280';
    }
  };


  if (loading) {
    return (
      <div className="saved-alternatives-loading">
        <div className="spinner"></div>
        <p>Lade gespeicherte Alternativen...</p>
      </div>
    );
  }

  return (
    <div className="saved-alternatives">
      <div className="saved-alternatives-header">
        <h2>🔖 Gespeicherte Alternativen</h2>

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
      </div>

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
          <div className="controls">
            <div className="filter-group">
              <label>Filter:</label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="filter-select"
              >
                <option value="all">Alle Kategorien</option>
                {contractTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            <div className="sort-group">
              <label>Sortieren:</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'newest' | 'oldest' | 'price' | 'type')}
                className="sort-select"
              >
                <option value="newest">Neueste zuerst</option>
                <option value="oldest">Älteste zuerst</option>
                <option value="price">Nach Preis</option>
                <option value="type">Nach Kategorie</option>
              </select>
            </div>
          </div>

          <div className="alternatives-grid">
            {filteredAlternatives.map((alternative) => (
              <div key={alternative._id} className="alternative-card">
                <div className="card-header">
                  <h3 className="alternative-title">{alternative.title}</h3>
                  <div className="card-actions">
                    <select
                      value={alternative.status}
                      onChange={(e) => handleUpdateStatus(alternative._id, e.target.value)}
                      className="status-select"
                      style={{ color: getStatusColor(alternative.status) }}
                    >
                      <option value="saved">Gespeichert</option>
                      <option value="compared">Verglichen</option>
                      <option value="contacted">Kontaktiert</option>
                      <option value="dismissed">Abgelehnt</option>
                    </select>
                    <button
                      onClick={() => handleDelete(alternative._id)}
                      className="delete-btn"
                      title="Löschen"
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                <div className="card-content">
                  <div className="alternative-meta">
                    <span className="contract-type">{alternative.contractType}</span>
                    <span className="provider">von {alternative.provider}</span>
                    <span className="saved-date">
                      {new Date(alternative.savedAt).toLocaleDateString('de-DE')}
                    </span>
                  </div>

                  {alternative.monthlyPrice && (
                    <div className="price-info">
                      <span className="price">{alternative.monthlyPrice}€</span>
                      <span className="price-label">pro Monat</span>
                    </div>
                  )}

                  <p className="snippet">{alternative.snippet}</p>

                  {alternative.features.length > 0 && (
                    <div className="features">
                      <h4>Features:</h4>
                      <ul>
                        {alternative.features.slice(0, 3).map((feature, index) => (
                          <li key={index}>{feature}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                <div className="card-footer">
                  <a
                    href={alternative.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="visit-btn"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                      <polyline points="15 3 21 3 21 9"/>
                      <line x1="10" y1="14" x2="21" y2="3"/>
                    </svg>
                    Anbieter besuchen
                  </a>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default SavedAlternatives;