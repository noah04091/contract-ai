// 📁 src/components/BetterContractsResults.tsx

import React, { useState } from "react";
import './BetterContractsResults.css';

interface Alternative {
  title: string;
  link: string;
  snippet: string;
  prices: string[];
  relevantInfo: string;
  hasDetailedData: boolean;
  recommendation?: 'best' | 'value' | 'premium';
  monthlyPrice?: number;
  provider?: string;
  features?: string[];
}

interface ResultsProps {
  analysis: string;
  alternatives: Alternative[];
  searchQuery: string;
  currentPrice: number;
  contractType: string;
  loading?: boolean;
  fromCache?: boolean;
}

type SortOption = 'price' | 'relevance' | 'features';

const BetterContractsResults: React.FC<ResultsProps> = ({
  analysis,
  alternatives,
  searchQuery,
  currentPrice,
  contractType,
  loading = false,
  fromCache = false
}) => {
  const [sortBy, setSortBy] = useState<SortOption>('relevance');
  const [showAllAlternatives, setShowAllAlternatives] = useState(false);

  // Extract price from strings and estimate monthly cost
  const extractPrice = (priceStrings: string[]): number | null => {
    for (const priceStr of priceStrings) {
      const match = priceStr.match(/(\d+)[,.]?(\d*)\s*(€|EUR)/);
      if (match) {
        const price = parseFloat(match[1] + '.' + (match[2] || '0'));
        return price;
      }
    }
    return null;
  };

  // Enhance alternatives with extracted data
  const enhancedAlternatives = alternatives.map(alt => {
    const extractedPrice = extractPrice(alt.prices);
    return {
      ...alt,
      monthlyPrice: extractedPrice,
      provider: alt.title.split(' ')[0] || 'Anbieter',
      features: alt.relevantInfo ? alt.relevantInfo.split('.').filter(f => f.length > 10).slice(0, 3) : []
    };
  });

  // Sort alternatives
  const sortedAlternatives = [...enhancedAlternatives].sort((a, b) => {
    switch (sortBy) {
      case 'price': {
        const priceA = a.monthlyPrice || 999;
        const priceB = b.monthlyPrice || 999;
        return priceA - priceB;
      }
      case 'features': {
        return (b.features?.length || 0) - (a.features?.length || 0);
      }
      default: {
        return b.hasDetailedData ? 1 : -1;
      }
    }
  });

  const displayedAlternatives = showAllAlternatives ? sortedAlternatives : sortedAlternatives.slice(0, 3);

  const formatAnalysis = (analysisText: string) => {
    return analysisText.split('\n').map((line, index) => {
      if (line.startsWith('##')) {
        return <h3 key={index} className="analysis-heading">{line.replace('##', '').trim()}</h3>;
      }
      if (line.startsWith('**') && line.endsWith('**')) {
        return <h4 key={index} className="analysis-subheading">{line.replace(/\*\*/g, '')}</h4>;
      }
      if (line.trim()) {
        return <p key={index} className="analysis-text">{line}</p>;
      }
      return null;
    });
  };

  const handleSortChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSortBy(event.target.value as SortOption);
  };

  if (loading) {
    return (
      <div className="results-container loading">
        <div className="loading-animation">
          <div className="spinner-large"></div>
          <h3>Analysiere bessere Alternativen...</h3>
          <p>Durchsuche das Internet nach den besten Angeboten für dich</p>
        </div>
      </div>
    );
  }

  return (
    <div className="results-container">
      {/* Header Section */}
      <div className="results-header">
        <div className="results-badge">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 11H1l8-8 8 8"/>
            <path d="M9 11v10"/>
          </svg>
          {fromCache ? 'Aus Cache geladen' : 'Neue Analyse'}
        </div>
        
        <h2 className="results-title">🔍 Bessere Alternativen gefunden</h2>
        <div className="results-summary">
          <div className="summary-item">
            <span className="summary-label">Vertragstyp:</span>
            <span className="summary-value">{contractType}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Aktueller Preis:</span>
            <span className="summary-value">{currentPrice}€/Monat</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Gefundene Alternativen:</span>
            <span className="summary-value">{alternatives.length}</span>
          </div>
        </div>
      </div>

      {/* Filter Section */}
      <div className="results-filters">
        <div className="filter-group">
          <label>Sortieren nach:</label>
          <select 
            value={sortBy} 
            onChange={handleSortChange}
            className="filter-select"
          >
            <option value="relevance">Relevanz</option>
            <option value="price">Preis (niedrig → hoch)</option>
            <option value="features">Umfang der Informationen</option>
          </select>
        </div>
      </div>

      {/* Alternatives Grid */}
      <div className="alternatives-grid">
        {displayedAlternatives.map((alternative, index) => {
          const savings = alternative.monthlyPrice && alternative.monthlyPrice < currentPrice 
            ? currentPrice - alternative.monthlyPrice 
            : null;

          return (
            <div key={index} className={`alternative-card ${alternative.hasDetailedData ? 'detailed' : 'basic'}`}>
              {/* Recommendation Badge */}
              {index === 0 && (
                <div className="recommendation-badge best">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                  Beste Option
                </div>
              )}
              
              {savings && savings > 5 && (
                <div className="savings-badge">
                  -{savings.toFixed(0)}€/Monat
                </div>
              )}

              {/* Card Header */}
              <div className="card-header">
                <div className="provider-info">
                  <div className="provider-avatar">
                    {alternative.provider?.charAt(0).toUpperCase() || '?'}
                  </div>
                  <div className="provider-details">
                    <h3 className="provider-name">{alternative.provider}</h3>
                    <p className="offer-title">{alternative.title.slice(0, 60)}...</p>
                  </div>
                </div>
                
                {alternative.monthlyPrice && (
                  <div className="price-display">
                    <span className="price-amount">{alternative.monthlyPrice.toFixed(2)}€</span>
                    <span className="price-period">/Monat</span>
                  </div>
                )}
              </div>

              {/* Card Content */}
              <div className="card-content">
                <p className="offer-snippet">{alternative.snippet}</p>
                
                {alternative.prices.length > 0 && (
                  <div className="price-details">
                    <span className="price-label">Weitere Preise:</span>
                    <div className="price-tags">
                      {alternative.prices.slice(0, 3).map((price, i) => (
                        <span key={i} className="price-tag">{price}</span>
                      ))}
                    </div>
                  </div>
                )}

                {alternative.features && alternative.features.length > 0 && (
                  <div className="features-list">
                    {alternative.features.map((feature, i) => (
                      <div key={i} className="feature-item">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M20 6L9 17l-5-5"/>
                        </svg>
                        {feature.trim()}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Card Actions */}
              <div className="card-actions">
                <a 
                  href={alternative.link} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="action-button primary"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                    <polyline points="15,3 21,3 21,9"/>
                    <line x1="10" y1="14" x2="21" y2="3"/>
                  </svg>
                  Zum Anbieter
                </a>
                
                <button className="action-button secondary">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7z"/>
                  </svg>
                  Merken
                </button>
              </div>

              {/* Data Quality Indicator */}
              <div className="data-quality">
                {alternative.hasDetailedData ? (
                  <div className="quality-indicator good">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20 6L9 17l-5-5"/>
                    </svg>
                    Detaillierte Daten verfügbar
                  </div>
                ) : (
                  <div className="quality-indicator basic">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/>
                      <path d="M12 6v6l4 2"/>
                    </svg>
                    Basisdaten verfügbar
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Show More Button */}
      {alternatives.length > 3 && (
        <div className="show-more-section">
          <button 
            className="show-more-button"
            onClick={() => setShowAllAlternatives(!showAllAlternatives)}
          >
            {showAllAlternatives ? 'Weniger anzeigen' : `Alle ${alternatives.length} Alternativen anzeigen`}
            <svg 
              width="16" 
              height="16" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2"
              style={{ transform: showAllAlternatives ? 'rotate(180deg)' : 'none' }}
            >
              <path d="M6 9l6 6 6-6"/>
            </svg>
          </button>
        </div>
      )}

      {/* AI Analysis Section */}
      <div className="analysis-section">
        <div className="analysis-header">
          <div className="analysis-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
            </svg>
          </div>
          <h3>KI-Analyse & Empfehlung</h3>
        </div>
        
        <div className="analysis-content">
          {formatAnalysis(analysis)}
        </div>
      </div>

      {/* Meta Information */}
      <div className="results-meta">
        <div className="meta-item">
          <span className="meta-label">Suchanfrage:</span>
          <span className="meta-value">"{searchQuery}"</span>
        </div>
        <div className="meta-item">
          <span className="meta-label">Datenqualität:</span>
          <span className="meta-value">
            {enhancedAlternatives.filter(a => a.hasDetailedData).length} von {alternatives.length} mit Details
          </span>
        </div>
        {fromCache && (
          <div className="meta-item">
            <span className="meta-label">Cache:</span>
            <span className="meta-value">Ergebnis aus Cache geladen</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default BetterContractsResults;