import React, { useState, useRef, useEffect } from "react";
import UniversalContractComparison from "../components/UniversalContractComparison";
import "../styles/ContractPages.css";

const BetterContracts: React.FC = () => {
  const [contractText, setContractText] = useState("");
  const [contractType, setContractType] = useState("");
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [step, setStep] = useState(1);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [analyzingProgress, setAnalyzingProgress] = useState(0);

  useEffect(() => {
    // Reset state when contract type changes
    if (contractType) {
      setSuccess(true);
    }
  }, [contractType]);

  useEffect(() => {
    if (loading) {
      const timer = setInterval(() => {
        setAnalyzingProgress(prev => {
          if (prev >= 95) {
            clearInterval(timer);
            return prev;
          }
          return prev + 5;
        });
      }, 300);
      
      return () => clearInterval(timer);
    } else {
      setAnalyzingProgress(0);
    }
  }, [loading]);

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      await processFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await processFile(file);
    }
  };

  const processFile = async (file: File) => {
    setError("");
    setFileName(file.name);
    setUploadProgress(0);
    
    // Show upload progress animation
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
      const res = await fetch("/api/extract-text", {
        method: "POST",
        credentials: "include",
        body: formData
      });

      setUploadProgress(100);
      setTimeout(() => setUploadProgress(0), 500);
      
      const data = await res.json();
      setContractText(data.text);
      setStep(2);
    } catch (err) {
      console.error("Fehler beim Extrahieren:", err);
      setError("Fehler beim Datei-Upload.");
    } finally {
      clearInterval(progressInterval);
    }
  };

  const handleAnalyze = async () => {
    setError("");
    if (!contractText || !currentPrice) {
      setError("Bitte Vertragstext und Preis eingeben.");
      return;
    }

    setLoading(true);
    setSuccess(false);

    try {
      const res = await fetch("/api/analyze-type", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ text: contractText })
      });

      const data = await res.json();
      if (data.contractType) {
        setContractType(data.contractType);
        setStep(3);
      } else {
        setError("Vertragstyp konnte nicht erkannt werden.");
      }
    } catch (err) {
      console.error("Fehler bei Vertragstyp-Erkennung:", err);
      setError("Serverfehler – bitte später erneut versuchen.");
    } finally {
      setLoading(false);
    }
  };

  return (
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
          <p className="contract-description">
            Wir erkennen den Vertragstyp und zeigen dir bessere Anbieter. Lade deinen Vertrag hoch oder füge den Text manuell ein.
          </p>
        </div>

        <div className="contract-progress-steps">
          <div className={`step ${step >= 1 ? 'active' : ''} ${step > 1 ? 'completed' : ''}`}>
            <div className="step-number">1</div>
            <div className="step-label">Vertrag hochladen</div>
          </div>
          <div className="step-connector"></div>
          <div className={`step ${step >= 2 ? 'active' : ''} ${step > 2 ? 'completed' : ''}`}>
            <div className="step-number">2</div>
            <div className="step-label">Preis eingeben</div>
          </div>
          <div className="step-connector"></div>
          <div className={`step ${step >= 3 ? 'active' : ''}`}>
            <div className="step-number">3</div>
            <div className="step-label">Alternativen vergleichen</div>
          </div>
        </div>

        {step === 1 && (
          <div className="contract-step-container">
            <div
              className={`contract-uploader ${dragActive ? 'drag-active' : ''}`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={handleFileSelect}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".pdf,.docx,.doc,.txt"
                className="file-input"
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
                    <p className="upload-subtitle">PDF, DOCX oder Textdateien</p>
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
                placeholder="Fügen Sie Ihren Vertragstext hier ein..."
                rows={8}
              />
              
              <button 
                className="contract-button"
                onClick={() => contractText ? setStep(2) : setError("Bitte Vertragstext eingeben.")}
                disabled={!contractText}
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
                  <p>Füge den monatlichen Preis deines aktuellen Vertrags ein, um bessere Angebote zu finden.</p>
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
                  />
                  <span className="currency-symbol">€</span>
                </div>
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
                  disabled={!currentPrice || loading}
                >
                  {loading ? (
                    <>
                      <div className="spinner"></div>
                      Analysiere...
                    </>
                  ) : (
                    <>
                      Vertrag analysieren
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12h14"></path>
                        <path d="m12 5 7 7-7 7"></path>
                      </svg>
                    </>
                  )}
                </button>
              </div>
              
              {loading && (
                <div className="analyzing-progress">
                  <div className="progress-container">
                    <div
                      className="progress-bar"
                      style={{ width: `${analyzingProgress}%` }}
                    ></div>
                  </div>
                  <p className="analyzing-text">Analysiere Vertragstyp...</p>
                </div>
              )}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="contract-step-container results-container">
            <div className="result-header">
              <div className={`result-badge ${success ? 'success' : ''}`}>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
                Vertragsanalyse abgeschlossen
              </div>
              
              <div className="result-summary">
                <h3>Erkannter Vertragstyp: <span className="highlighted-text">{contractType}</span></h3>
                <p>Aktueller Preis: <span className="highlighted-text">{currentPrice?.toFixed(2)}€</span> monatlich</p>
              </div>
            </div>
            
            <div className="comparison-container">
              <h3 className="comparison-title">Bessere Alternativen für dich</h3>
              <UniversalContractComparison
                contractType={contractType}
                currentPrice={currentPrice!}
              />
            </div>
            
            <button 
              className="contract-button secondary new-search"
              onClick={() => {
                setStep(1);
                setContractText("");
                setContractType("");
                setCurrentPrice(null);
                setFileName("");
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
                <path d="M3 3v5h5"></path>
              </svg>
              Neue Analyse starten
            </button>
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
          </div>
        )}
      </div>
    </div>
  );
};

export default BetterContracts;