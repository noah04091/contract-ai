import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { Helmet } from "react-helmet";
import BetterContractsResults from "../components/BetterContractsResults";
import "../styles/ContractPages.css";

interface ApiResponse {
  analysis: string;
  alternatives: Array<{
    title: string;
    link: string;
    snippet: string;
    prices: string[];
    relevantInfo: string;
    hasDetailedData: boolean;
  }>;
  searchQuery: string;
  performance: {
    totalAlternatives: number;
    detailedExtractions: number;
    timestamp: string;
  };
  fromCache?: boolean;
  cacheKey?: string;
}

interface ErrorWithMessage {
  message: string;
}

const BetterContracts: React.FC = () => {
  // ✅ Auth Context - ähnlich wie Chat.tsx
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  
  // ✅ Premium Check - wie in Chat.tsx
  const isPremium = user?.subscriptionActive === true || 
                    user?.subscriptionPlan === 'business' || 
                    user?.subscriptionPlan === 'premium';

  const [contractText, setContractText] = useState("");
  const [contractType, setContractType] = useState("");
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [results, setResults] = useState<ApiResponse | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [step, setStep] = useState(1);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [analyzingProgress, setAnalyzingProgress] = useState(0);

  // ✅ AUTH CHECK (vereinfacht - nur redirect wenn nicht eingeloggt):
  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/login?redirect=/better-contracts', { replace: true });
    }
  }, [user, isLoading, navigate]);

  useEffect(() => {
    if (loading) {
      const timer = setInterval(() => {
        setAnalyzingProgress(prev => {
          if (prev >= 95) {
            clearInterval(timer);
            return prev;
          }
          return prev + 2;
        });
      }, 500);
      
      return () => clearInterval(timer);
    } else {
      setAnalyzingProgress(0);
    }
  }, [loading]);

  // ✅ LOADING STATE
  if (isLoading) {
    return (
      <div className="contract-page">
        <div className="contract-container">
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <div className="spinner"></div>
            <p>Lade Nutzerdaten...</p>
          </div>
        </div>
      </div>
    );
  }

  // Generate smart search query based on contract type
  const generateSearchQuery = (detectedType: string): string => {
    const searchQueries: Record<string, string> = {
      "handy": "günstige handytarife vergleich 2024",
      "mobilfunk": "mobilfunk tarife vergleich günstig",
      "internet": "internet dsl vergleich anbieter günstig",
      "hosting": "webhosting vergleich günstig provider",
      "versicherung": "versicherung vergleich günstig",
      "kfz": "kfz versicherung vergleich günstig",
      "haftpflicht": "haftpflichtversicherung vergleich",
      "strom": "strom anbieter vergleich günstig",
      "gas": "gas anbieter vergleich",
      "fitness": "fitnessstudio vergleich günstig",
      "streaming": "streaming dienst vergleich",
      "bank": "girokonto vergleich kostenlos",
      "kredit": "kredit vergleich günstig",
      "default": "anbieter vergleich günstig alternative"
    };

    return searchQueries[detectedType.toLowerCase()] || searchQueries.default;
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    // ✅ Premium Check
    if (!isPremium) {
      setError("Diese Funktion ist nur für Premium-Nutzer verfügbar.");
      return;
    }
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      await processFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (isPremium) {
      setDragActive(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleFileSelect = () => {
    if (!isPremium) {
      setError("Diese Funktion ist nur für Premium-Nutzer verfügbar.");
      return;
    }
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isPremium) return;
    
    const file = e.target.files?.[0];
    if (file) {
      await processFile(file);
    }
  };

  const processFile = async (file: File) => {
    if (!isPremium) return;
    
    setError("");
    setFileName(file.name);
    setUploadProgress(0);
    
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 95) {
          clearInterval(progressInterval);
          return prev;
        }
        return prev + 10;
      });
    }, 100);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/extract-text/public", {
        method: "POST",
        credentials: "include",
        body: formData
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      setUploadProgress(100);
      setTimeout(() => setUploadProgress(0), 500);
      
      const data = await res.json();
      setContractText(data.text || '');
      setStep(2);
    } catch (err) {
      console.error("Fehler beim Extrahieren:", err);
      setError("Fehler beim Datei-Upload. Bitte versuchen Sie es erneut.");
    } finally {
      clearInterval(progressInterval);
    }
  };

  const getErrorMessage = (error: unknown): string => {
    if (error instanceof Error) return error.message;
    if (typeof error === 'string') return error;
    if (error && typeof error === 'object' && 'message' in error) {
      return (error as ErrorWithMessage).message;
    }
    return 'Ein unbekannter Fehler ist aufgetreten';
  };

  const handleAnalyze = async () => {
    // ✅ Premium Check
    if (!isPremium) {
      setError("Diese Funktion ist nur für Premium-Nutzer verfügbar.");
      return;
    }
    
    setError("");
    setResults(null);
    
    if (!contractText || contractText.trim().length < 20) {
      setError("Vertragstext muss mindestens 20 Zeichen lang sein.");
      return;
    }

    if (!currentPrice || currentPrice <= 0) {
      setError("Bitte geben Sie einen gültigen Preis ein.");
      return;
    }

    setLoading(true);

    try {
      // Step 1: Detect contract type
      console.log("🔍 Erkenne Vertragstyp...");
      const typeRes = await fetch("/api/analyze-type/public", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ text: contractText })
      });

      if (!typeRes.ok) {
        throw new Error(`Vertragstyp-Erkennung fehlgeschlagen: ${typeRes.status}`);
      }

      const typeData = await typeRes.json();
      const detectedType = typeData.contractType || 'unbekannt';
      setContractType(detectedType);

      // Step 2: Generate search query
      const generatedQuery = searchQuery || generateSearchQuery(detectedType);
      setSearchQuery(generatedQuery);

      console.log(`📊 Vertragstyp: ${detectedType}, Suchanfrage: ${generatedQuery}`);

      // Step 3: Find better alternatives
      console.log("🚀 Suche nach besseren Alternativen...");
      const contractRes = await fetch("/api/better-contracts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          contractText: contractText,
          searchQuery: generatedQuery
        })
      });

      if (!contractRes.ok) {
        const errorData = await contractRes.json().catch(() => ({}));
        throw new Error(errorData.error || `API Fehler: ${contractRes.status}`);
      }

      const contractData: ApiResponse = await contractRes.json();
      console.log("✅ Alternativen gefunden:", contractData);

      setResults(contractData);
      setStep(3);

    } catch (err: unknown) {
      console.error("❌ Analyse-Fehler:", err);
      
      const errorMessage = getErrorMessage(err);
      
      // User-friendly error messages
      if (errorMessage.includes('429')) {
        setError("Zu viele Anfragen. Bitte warten Sie eine Minute und versuchen Sie es erneut.");
      } else if (errorMessage.includes('timeout') || errorMessage.includes('408')) {
        setError("Die Analyse dauert zu lange. Bitte versuchen Sie es mit einem kürzeren Vertrag.");
      } else if (errorMessage.includes('404')) {
        setError("Keine passenden Alternativen gefunden. Versuchen Sie es mit einem anderen Vertragstyp.");
      } else {
        setError(`Fehler bei der Analyse: ${errorMessage}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    if (!isPremium) return;
    setError("");
    setResults(null);
    handleAnalyze();
  };

  const handleStartOver = () => {
    setStep(1);
    setContractText("");
    setContractType("");
    setCurrentPrice(null);
    setSearchQuery("");
    setFileName("");
    setResults(null);
    setError("");
  };

  return (
    <>
      <Helmet>
        <title>Bessere Vertragsalternativen finden | Contract AI</title>
        <meta name="description" content="Finde automatisch bessere Alternativen zu deinen bestehenden Verträgen. Spare Geld, verbessere Leistungen — mit Contract AI Better Contracts." />
        <meta name="keywords" content="bessere Verträge, Vertragsalternativen, Verträge vergleichen, Contract AI Better Contracts" />
        <link rel="canonical" href="https://contract-ai.de/better-contracts" />
        {/* Open Graph / Facebook */}
        <meta property="og:title" content="Bessere Vertragsalternativen finden | Contract AI" />
        <meta property="og:description" content="Vergleiche deine aktuellen Verträge mit besseren Angeboten. Spare sofort mit Contract AI Better Contracts." />
        <meta property="og:url" content="https://contract-ai.de/better-contracts" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://contract-ai.de/og-image.jpg" />
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Bessere Vertragsalternativen finden | Contract AI" />
        <meta name="twitter:description" content="Finde automatisch die besten Vertragsalternativen mit Contract AI. Einfach vergleichen & sparen." />
        <meta name="twitter:image" content="https://contract-ai.de/og-image.jpg" />
      </Helmet>
      
      <div className="contract-page">
        <div className="contract-page-bg">
          <div className="contract-page-shape shape-1"></div>
          <div className="contract-page-shape shape-2"></div>
        </div>
        
        <div className="contract-container">
          <div className="contract-header">
            <div className="contract-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <path d="m21 21-4.3-4.3"></path>
                <path d="M8 11h6"></path>
                <path d="M11 8v6"></path>
              </svg>
            </div>
            <h1>Bessere Alternativen zu deinem Vertrag</h1>
            
            {/* ✅ Premium Badge wie in Chat.tsx */}
            {!isPremium && (
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                padding: '6px 12px',
                borderRadius: '20px',
                fontSize: '0.8rem',
                fontWeight: '600',
                marginTop: '0.5rem'
              }}>
                <span style={{ marginRight: '4px' }}>✦</span>
                Premium erforderlich
              </div>
            )}
            
            <p className="contract-description">
              Wir analysieren deinen Vertrag und finden automatisch bessere Anbieter mit echten Preisen und Konditionen.
            </p>
          </div>

          {/* ✅ Premium Notice wie in Chat.tsx */}
          {!isPremium && (
            <div style={{
              background: '#f8f9fa',
              border: '1px solid #e9ecef',
              borderRadius: '12px',
              padding: '2rem',
              margin: '2rem 0',
              textAlign: 'center'
            }}>
              <div style={{
                width: '60px',
                height: '60px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1rem',
                color: 'white',
                fontSize: '1.5rem'
              }}>
                ⭐
              </div>
              <h3 style={{ marginBottom: '1rem', color: '#333' }}>Premium-Funktion</h3>
              <p style={{ color: '#666', marginBottom: '1.5rem', lineHeight: '1.6' }}>
                Mit einem Premium-Abonnement kannst du unbegrenzt Vertragsalternativen 
                finden und sparst bares Geld durch bessere Angebote.
              </p>
              <button 
                onClick={() => navigate('/pricing')}
                style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'transform 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                Upgrade auf Premium
              </button>
            </div>
          )}

          <div className="contract-progress-steps">
            <div className={`step ${step >= 1 ? 'active' : ''} ${step > 1 ? 'completed' : ''}`}>
              <div className="step-number">1</div>
              <div className="step-label">Vertrag hochladen</div>
            </div>
            <div className="step-connector"></div>
            <div className={`step ${step >= 2 ? 'active' : ''} ${step > 2 ? 'completed' : ''}`}>
              <div className="step-number">2</div>
              <div className="step-label">Preis & Analyse</div>
            </div>
            <div className="step-connector"></div>
            <div className={`step ${step >= 3 ? 'active' : ''}`}>
              <div className="step-number">3</div>
              <div className="step-label">Bessere Alternativen</div>
            </div>
          </div>

          {step === 1 && (
            <div className="contract-step-container">
              <div
                className={`contract-uploader ${dragActive ? 'drag-active' : ''} ${!isPremium ? 'disabled' : ''}`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={handleFileSelect}
                style={{
                  opacity: isPremium ? 1 : 0.6,
                  cursor: isPremium ? 'pointer' : 'not-allowed'
                }}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".pdf,.docx,.doc,.txt"
                  className="file-input"
                  disabled={!isPremium}
                />
                
                <div className="uploader-content">
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="17 8 12 3 7 8"></polyline>
                    <line x1="12" y1="3" x2="12" y2="15"></line>
                  </svg>
                  
                  {fileName ? (
                    <p className="file-name">{fileName}</p>
                  ) : (
                    <>
                      <p className="upload-title">Vertrag hochladen</p>
                      <p className="upload-subtitle">
                        {isPremium ? "PDF, DOCX oder Textdateien" : "Premium erforderlich"}
                      </p>
                    </>
                  )}
                  
                  {uploadProgress > 0 && (
                    <div className="progress-container">
                      <div
                        className="progress-bar"
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                  )}
                </div>
              </div>

              <div className="divider-container">
                <div className="divider"></div>
                <span className="divider-text">oder</span>
                <div className="divider"></div>
              </div>

              <div className="contract-text-form">
                <label htmlFor="contract-text">Vertrag manuell eingeben</label>
                <textarea
                  id="contract-text"
                  value={contractText}
                  onChange={(e) => setContractText(e.target.value)}
                  placeholder={isPremium ? "Fügen Sie Ihren Vertragstext hier ein..." : "Premium erforderlich für diese Funktion"}
                  rows={8}
                  disabled={!isPremium}
                  style={{
                    opacity: isPremium ? 1 : 0.6,
                    cursor: isPremium ? 'text' : 'not-allowed'
                  }}
                />
                
                <button 
                  className="contract-button"
                  onClick={() => isPremium && contractText.trim().length >= 20 ? setStep(2) : setError(isPremium ? "Vertragstext muss mindestens 20 Zeichen lang sein." : "Premium erforderlich für diese Funktion.")}
                  disabled={!isPremium || contractText.trim().length < 20}
                  style={{
                    opacity: isPremium && contractText.trim().length >= 20 ? 1 : 0.6,
                    cursor: isPremium && contractText.trim().length >= 20 ? 'pointer' : 'not-allowed'
                  }}
                >
                  Weiter
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14"></path>
                    <path d="m12 5 7 7-7 7"></path>
                  </svg>
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="contract-step-container">
              <div className="price-input-section">
                <div className="contract-info-box">
                  <div className="info-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"></circle>
                      <path d="M12 16v-4"></path>
                      <path d="M12 8h.01"></path>
                    </svg>
                  </div>
                  <div className="info-text">
                    <p>Geben Sie den monatlichen Preis ein. Wir suchen dann automatisch nach günstigeren Alternativen.</p>
                  </div>
                </div>
                
                <div className="price-input-container">
                  <label htmlFor="price-input">Monatlicher Preis (€)</label>
                  <div className="currency-input">
                    <input
                      id="price-input"
                      type="number"
                      placeholder="0,00"
                      value={currentPrice ?? ""}
                      onChange={(e) => setCurrentPrice(parseFloat(e.target.value))}
                      min="0"
                      step="0.01"
                      disabled={!isPremium}
                      style={{
                        opacity: isPremium ? 1 : 0.6,
                        cursor: isPremium ? 'text' : 'not-allowed'
                      }}
                    />
                    <span className="currency-symbol">€</span>
                  </div>
                </div>

                {/* Optional: Custom Search Query */}
                <div className="search-input-container">
                  <label htmlFor="search-query">Suchanfrage (optional)</label>
                  <input
                    id="search-query"
                    type="text"
                    placeholder={isPremium ? "z.B. 'günstige handytarife' (wird automatisch generiert)" : "Premium erforderlich"}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    disabled={!isPremium}
                    style={{
                      opacity: isPremium ? 1 : 0.6,
                      cursor: isPremium ? 'text' : 'not-allowed'
                    }}
                  />
                  <p className="input-help">
                    {isPremium ? "Lassen Sie das Feld leer für automatische Erkennung" : "Premium erforderlich für diese Funktion"}
                  </p>
                </div>
                
                <div className="contract-text-preview">
                  <label>Vertragstext (Ausschnitt)</label>
                  <div className="text-preview">
                    {contractText.length > 150 
                      ? contractText.substring(0, 150) + "..."
                      : contractText}
                  </div>
                </div>
                
                <div className="contract-actions">
                  <button 
                    className="contract-button secondary"
                    onClick={() => setStep(1)}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m12 19-7-7 7-7"></path>
                      <path d="M19 12H5"></path>
                    </svg>
                    Zurück
                  </button>
                  
                  <button 
                    className="contract-button"
                    onClick={handleAnalyze}
                    disabled={!isPremium || !currentPrice || currentPrice <= 0 || loading}
                    style={{
                      opacity: isPremium && currentPrice && currentPrice > 0 && !loading ? 1 : 0.6,
                      cursor: isPremium && currentPrice && currentPrice > 0 && !loading ? 'pointer' : 'not-allowed'
                    }}
                  >
                    {loading ? (
                      <>
                        <div className="spinner"></div>
                        Analysiere...
                      </>
                    ) : (
                      <>
                        {isPremium ? "Alternativen finden" : "Premium erforderlich"}
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M5 12h14"></path>
                          <path d="m12 5 7 7-7 7"></path>
                        </svg>
                      </>
                    )}
                  </button>
                </div>
                
                {loading && isPremium && (
                  <div className="analyzing-progress">
                    <div className="progress-container">
                      <div
                        className="progress-bar"
                        style={{ width: `${analyzingProgress}%` }}
                      ></div>
                    </div>
                    <p className="analyzing-text">
                      {analyzingProgress < 30 ? "Erkenne Vertragstyp..." :
                       analyzingProgress < 60 ? "Suche nach Alternativen..." :
                       analyzingProgress < 90 ? "Analysiere Websites..." :
                       "Erstelle Empfehlungen..."}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 3 && results && isPremium && (
            <div className="contract-step-container results-step">
              <BetterContractsResults
                analysis={results.analysis}
                alternatives={results.alternatives}
                searchQuery={results.searchQuery}
                currentPrice={currentPrice!}
                contractType={contractType}
                fromCache={results.fromCache}
              />
              
              <div className="step-actions">
                <button 
                  className="contract-button secondary"
                  onClick={handleRetry}
                  disabled={loading || !isPremium}
                  style={{
                    opacity: isPremium && !loading ? 1 : 0.6,
                    cursor: isPremium && !loading ? 'pointer' : 'not-allowed'
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
                    <path d="M3 3v5h5"></path>
                  </svg>
                  Erneut suchen
                </button>
                
                <button 
                  className="contract-button secondary"
                  onClick={handleStartOver}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
                    <path d="M3 3v5h5"></path>
                  </svg>
                  Neuer Vertrag
                </button>
              </div>
            </div>
          )}
          
          {error && (
            <div className="error-message">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              {error}
              {step === 2 && isPremium && (
                <button 
                  className="retry-button"
                  onClick={handleRetry}
                  disabled={loading}
                >
                  Erneut versuchen
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default BetterContracts;