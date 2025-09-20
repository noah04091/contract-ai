// 📁 src/components/BetterContractsResults.tsx
// ERWEITERTE VERSION MIT PARTNER-INTEGRATION

import React, { useState, useRef } from "react";
import './BetterContractsResults.css';

interface Alternative {
  title: string;
  link: string;
  snippet: string;
  prices: string[];
  relevantInfo: string;
  hasDetailedData: boolean;
  recommendation?: 'best' | 'value' | 'premium';
  monthlyPrice?: number | null;
  provider?: string;
  features?: string[];
  // 🆕 Partner-spezifische Felder
  source?: 'serp' | 'partner';
  widget?: any;
  directLink?: string;
  isVerified?: boolean;
  category?: string;
  isPriorityPortal?: boolean;
}

// 🆕 Partner Category Interface
interface PartnerCategory {
  category: string;
  name: string;
  provider: string;
  type: string;
  matchScore?: number;
}

interface ResultsProps {
  analysis: string;
  alternatives: Alternative[];
  searchQuery: string;
  currentPrice: number;
  contractType: string;
  loading?: boolean;
  fromCache?: boolean;
  // 🆕 Partner-spezifische Props
  partnerCategory?: PartnerCategory | null;
  partnerOffers?: Alternative[];
}

type SortOption = 'price' | 'relevance' | 'features';

const BetterContractsResults: React.FC<ResultsProps> = ({
  analysis,
  alternatives,
  searchQuery,
  currentPrice,
  contractType,
  loading = false,
  fromCache = false,
  partnerCategory = null,
  partnerOffers = []
}) => {
  const [sortBy, setSortBy] = useState<SortOption>('relevance');
  const [showAllAlternatives, setShowAllAlternatives] = useState(false);
  const [savingStates, setSavingStates] = useState<Record<string, boolean>>({});
  const [savedStates, setSavedStates] = useState<Record<string, boolean>>({});
  
  // 🆕 Partner Widget States
  const [selectedWidget, setSelectedWidget] = useState<Alternative | null>(null);
  const [widgetLoading, setWidgetLoading] = useState(false);
  const widgetContainerRef = useRef<HTMLDivElement>(null);

  // 🆕 Load Widget Scripts
  const loadWidgetScript = (widget: any) => {
    if (!widget || !widget.html) return;
    
    // Parse HTML um Script-URLs zu extrahieren
    const parser = new DOMParser();
    const doc = parser.parseFromString(widget.html, 'text/html');
    const scripts = doc.querySelectorAll('script[src]');
    const links = doc.querySelectorAll('link[rel="stylesheet"]');
    
    // CSS laden
    links.forEach((link: any) => {
      const existingLink = document.querySelector(`link[href="${link.href}"]`);
      if (!existingLink) {
        const newLink = document.createElement('link');
        newLink.rel = 'stylesheet';
        newLink.type = 'text/css';
        newLink.href = link.href;
        document.head.appendChild(newLink);
      }
    });
    
    // Scripts laden
    scripts.forEach((script: any) => {
      const existingScript = document.querySelector(`script[src="${script.src}"]`);
      if (!existingScript) {
        const newScript = document.createElement('script');
        newScript.src = script.src;
        newScript.async = true;
        document.body.appendChild(newScript);
      }
    });
  };

  // 🆕 Open Widget Modal
  const openWidgetModal = (alternative: Alternative) => {
    if (alternative.widget) {
      setSelectedWidget(alternative);
      setWidgetLoading(true);
      
      // Load scripts after a short delay to ensure modal is rendered
      setTimeout(() => {
        loadWidgetScript(alternative.widget);
        setWidgetLoading(false);
      }, 100);
    } else if (alternative.directLink) {
      // Direkt zum Partner-Link
      window.open(alternative.directLink, '_blank');
    } else if (alternative.link && alternative.link !== '#partner-widget') {
      // Normaler externer Link
      window.open(alternative.link, '_blank');
    }
  };

  // 🆕 Close Widget Modal
  const closeWidgetModal = () => {
    setSelectedWidget(null);
    setWidgetLoading(false);
  };

  // 💾 Save alternative function
  const handleSaveAlternative = async (alternative: Alternative & { monthlyPrice?: number | null; provider?: string; features?: string[] }) => {
    const alternativeKey = alternative.link;

    if (savedStates[alternativeKey]) {
      // Already saved, show message
      alert('Diese Alternative wurde bereits gespeichert!');
      return;
    }

    setSavingStates(prev => ({ ...prev, [alternativeKey]: true }));

    try {
      const response = await fetch('/api/saved-alternatives', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          title: alternative.title,
          link: alternative.link,
          snippet: alternative.snippet,
          prices: alternative.prices,
          provider: alternative.provider || 'Unknown',
          features: alternative.features || [],
          contractType,
          relevantInfo: alternative.relevantInfo,
          hasDetailedData: alternative.hasDetailedData,
          monthlyPrice: alternative.monthlyPrice,
          // 🆕 Partner-spezifische Daten
          source: alternative.source || 'serp',
          isPartner: alternative.source === 'partner',
          category: alternative.category
        }),
      });

      if (response.ok) {
        setSavedStates(prev => ({ ...prev, [alternativeKey]: true }));

        // Show success message
        const successDiv = document.createElement('div');
        successDiv.innerHTML = `
          <div style="
            position: fixed;
            top: 20px;
            right: 20px;
            background: #10b981;
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          ">
            ✅ Alternative gespeichert! Im Dashboard anzeigen
          </div>
        `;
        document.body.appendChild(successDiv);
        setTimeout(() => document.body.removeChild(successDiv), 3000);

      } else {
        const error = await response.json();
        if (response.status === 409) {
          // Already exists
          setSavedStates(prev => ({ ...prev, [alternativeKey]: true }));
          alert('Diese Alternative wurde bereits gespeichert!');
        } else {
          throw new Error(error.error || 'Fehler beim Speichern');
        }
      }
    } catch (error) {
      console.error('Error saving alternative:', error);
      alert('Fehler beim Speichern der Alternative. Bitte versuchen Sie es erneut.');
    } finally {
      setSavingStates(prev => ({ ...prev, [alternativeKey]: false }));
    }
  };

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
      provider: alt.provider || alt.title.split(' ')[0] || 'Anbieter',
      features: alt.features || (alt.relevantInfo ? alt.relevantInfo.split('.').filter(f => f.length > 10).slice(0, 3) : [])
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
        // 🆕 Partner results get priority in relevance sorting
        if (a.source === 'partner' && b.source !== 'partner') return -1;
        if (a.source !== 'partner' && b.source === 'partner') return 1;
        return b.hasDetailedData ? 1 : -1;
      }
    }
  });

  const displayedAlternatives = showAllAlternatives ? sortedAlternatives : sortedAlternatives.slice(0, 5); // 🆕 Show 5 by default instead of 3

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
          {/* 🆕 Partner Category Badge */}
          {partnerCategory && (
            <div className="summary-item">
              <span className="summary-label">Vergleichsportal:</span>
              <span className="summary-value partner-badge">
                {partnerCategory.provider === 'check24' ? 'CHECK24' : 'TarifCheck'} verfügbar
              </span>
            </div>
          )}
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
          
          // 🆕 Check if this is a partner result
          const isPartner = alternative.source === 'partner';
          const hasWidget = isPartner && alternative.widget;

          return (
            <div 
              key={index} 
              className={`alternative-card ${alternative.hasDetailedData ? 'detailed' : 'basic'} ${isPartner ? 'partner-card' : ''}`}
            >
              {/* 🆕 Partner Badge */}
              {isPartner && (
                <div className="partner-indicator">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                  {alternative.provider === 'check24' ? 'CHECK24' : 
                   alternative.provider === 'tarifcheck' ? 'TarifCheck' : 'Partner'}
                </div>
              )}

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
                  <div className={`provider-avatar ${isPartner ? 'partner' : ''}`}>
                    {alternative.provider?.charAt(0).toUpperCase() || '?'}
                  </div>
                  <div className="provider-details">
                    <h3 className="provider-name">
                      {alternative.provider}
                      {/* 🆕 Verified Badge for Partner Results */}
                      {alternative.isVerified && (
                        <span className="verified-badge">✓</span>
                      )}
                    </h3>
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
                {/* 🆕 Widget Button for Partner Results */}
                {hasWidget ? (
                  <button 
                    onClick={() => openWidgetModal(alternative)}
                    className="action-button primary partner"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                      <line x1="9" y1="9" x2="15" y2="15"/>
                      <line x1="15" y1="9" x2="9" y2="15"/>
                    </svg>
                    Jetzt vergleichen
                  </button>
                ) : (
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
                )}
                
                <button
                  className={`action-button ${savedStates[alternative.link] ? 'saved' : 'secondary'}`}
                  onClick={() => handleSaveAlternative(alternative)}
                  disabled={savingStates[alternative.link]}
                >
                  {savingStates[alternative.link] ? (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin">
                        <path d="M12 2v4"/>
                        <path d="M12 18v4"/>
                        <path d="M4.93 4.93l2.83 2.83"/>
                        <path d="M16.24 16.24l2.83 2.83"/>
                        <path d="M2 12h4"/>
                        <path d="M18 12h4"/>
                        <path d="M4.93 19.07l2.83-2.83"/>
                        <path d="M16.24 7.76l2.83-2.83"/>
                      </svg>
                      Speichern...
                    </>
                  ) : savedStates[alternative.link] ? (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M20 6L9 17l-5-5"/>
                      </svg>
                      Gespeichert
                    </>
                  ) : (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7z"/>
                      </svg>
                      Merken
                    </>
                  )}
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
      {alternatives.length > 5 && (
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
        {/* 🆕 Partner Info */}
        {partnerOffers && partnerOffers.length > 0 && (
          <div className="meta-item">
            <span className="meta-label">Partner-Angebote:</span>
            <span className="meta-value">
              {partnerOffers.length} Vergleichsportal{partnerOffers.length > 1 ? 'e' : ''} verfügbar
            </span>
          </div>
        )}
        {fromCache && (
          <div className="meta-item">
            <span className="meta-label">Cache:</span>
            <span className="meta-value">Ergebnis aus Cache geladen</span>
          </div>
        )}
      </div>

      {/* 🆕 Partner Widget Modal */}
      {selectedWidget && (
        <div className="widget-modal-overlay" onClick={closeWidgetModal}>
          <div className="widget-modal" onClick={(e) => e.stopPropagation()}>
            <div className="widget-modal-header">
              <h2>
                {selectedWidget.provider === 'check24' && '📊 CHECK24 Vergleichsrechner'}
                {selectedWidget.provider === 'tarifcheck' && '📋 TarifCheck Vergleichsrechner'}
                {!selectedWidget.provider && '🔍 Vergleichsrechner'}
              </h2>
              <button className="close-button" onClick={closeWidgetModal}>×</button>
            </div>
            
            {widgetLoading ? (
              <div className="widget-modal-loading">
                <div className="spinner-large"></div>
                <p>Lade Vergleichsrechner...</p>
              </div>
            ) : (
              <div 
                className="widget-modal-content"
                ref={widgetContainerRef}
                dangerouslySetInnerHTML={{ __html: selectedWidget.widget?.html || '' }}
              />
            )}
            
            <div className="widget-modal-footer">
              <p className="disclaimer">
                * Wir erhalten eine Provision bei erfolgreicher Vermittlung.
                Dies hat keinen Einfluss auf Ihre Preise.
              </p>
              {selectedWidget.category && (
                <p className="widget-category">
                  Kategorie: {selectedWidget.category}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BetterContractsResults;