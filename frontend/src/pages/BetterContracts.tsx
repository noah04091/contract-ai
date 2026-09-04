import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { Helmet } from "react-helmet-async";
import { Bookmark, Camera, Upload, FileText, Eye, Check, ArrowLeft, ArrowRight, RotateCcw, AlertCircle, ChevronRight, Info } from "lucide-react";
import BetterContractsResults from "../components/BetterContractsResults";
import SavedAlternativesFull from "../components/SavedAlternativesFull";
import UnifiedPremiumNotice from "../components/UnifiedPremiumNotice";
import "../styles/ContractPages.css";
import "../styles/BetterContractsWerkbank.css";
import { useDocumentScanner } from "../hooks/useDocumentScanner";

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
  aiSuggestedAlternatives?: Array<{
    title: string;
    link: string;
    snippet: string;
    prices: string[];
    relevantInfo: string;
    hasDetailedData: boolean;
    pricingModel?: string;
    targetSegment?: string;
    industryFocus?: string;
    whyFit?: string;
    confidence?: 'high' | 'medium' | 'low';
    evidenceSource?: 'website' | 'search-result' | 'ai-knowledge';
    isAiSuggested?: boolean;
    b2bSummary?: string;
  }>;
  isB2B?: boolean;
  // 02.09.2026: meldet, ob die Anbietersuche ueberhaupt durchkam. Ohne dieses
  // Feld sah ein gestoerter Suchdienst genauso aus wie ein leeres Suchergebnis.
  sucheGestoert?: boolean;
  stoerungsgrund?: string | null;
  // 03.09.2026: Eckdaten aus dem Dokument fuer den Kopf ueber der Ergebnisliste.
  // Jedes Feld kann null sein — lieber leer als geraten.
  vertragsfakten?: {
    anbieter: string | null;
    vertragsart: string | null;
    preisMonatlich: string | null;
    preisEinmalig: string | null;
    leistung: string | null;
    laufzeitBis: string | null;
    kuendigungsfrist: string | null;
  } | null;
  // 03.09.2026: Zusammensetzung der Treffer. Nicht die Anzahl entscheidet
  // ueber den Nutzen, sondern wie viele davon echte Anbieter sind.
  suchBilanz?: {
    versuche?: number;
    fehlgeschlagen?: number;
    roheTreffer?: number;
    nachFilter?: number;
    trefferArten?: { anbieter: number; portale: number; infoquellen: number; istAnbieter: number };
  } | null;
  searchQuery: string;
  performance: {
    totalAlternatives: number;
    detailedExtractions: number;
    aiSuggestedCount?: number;
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
  
  // ✅ Premium Check - alle bezahlten Pläne (Business oder Enterprise)
  const isPremium = user?.subscriptionActive === true ||
                    user?.subscriptionPlan === 'business' ||
                    user?.subscriptionPlan === 'enterprise';

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
  // 03.09.2026: Die hochgeladene Datei bleibt im Speicher, damit der Nutzer sie
  // in der Ergebnisanzeige oeffnen kann. Sie verlaesst den Browser dafuer nicht.
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [step, setStep] = useState(1);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [analyzingProgress, setAnalyzingProgress] = useState(0);

  // FAB States for saved alternatives
  const [savedAlternativesCount, setSavedAlternativesCount] = useState(0);
  const [showFAB, setShowFAB] = useState(false);

  // 📸 Document Scanner
  const { openScanner, ScannerModal } = useDocumentScanner((file) => {
    processFile(file);
  });

  // ✅ AUTH CHECK (vereinfacht - nur redirect wenn nicht eingeloggt):
  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/login?redirect=/better-contracts', { replace: true });
    }
  }, [user, isLoading, navigate]);

  // Load saved alternatives count for FAB
  useEffect(() => {
    const fetchSavedAlternativesCount = async () => {
      try {
        const response = await fetch('/api/saved-alternatives/stats', {
          credentials: 'include'
        });
        if (response.ok) {
          const data = await response.json();
          setSavedAlternativesCount(data.totalSaved || 0);
          setShowFAB(data.totalSaved > 0);
        }
      } catch (error) {
        console.error('Error fetching saved alternatives count:', error);
      }
    };

    if (user && !isLoading) {
      fetchSavedAlternativesCount();
    }
  }, [user, isLoading]);

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
  // 04.09.2026: Hier lief .spinner aus ContractPages.css, der fuer den blauen
  // Knopf gemacht ist: weisser Rand auf weissem Grund, also unsichtbar. Dazu
  // hing er per padding oben statt in der Mitte zu stehen.
  if (isLoading) {
    return (
      <div className="bcw-seite">
        <div className="bcw-schirm">
          <div className="bcw-buehne">
            <div className="bcw-spalte">
              <div className="bcw-laden">
                <div className="bcw-kreis"></div>
                <h3>Einen Moment</h3>
                <p>Deine Daten werden geladen.</p>
              </div>
            </div>
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
    };

    const knownQuery = searchQueries[detectedType.toLowerCase()];
    if (knownQuery) return knownQuery;

    // Für unbekannte/B2B-Typen: Direct-Provider-fokussierte Default-Query
    // ("services anbieter" zwingt Google zu Anbieter-Service-Pages statt Vergleichsseiten)
    if (detectedType && detectedType !== 'unbekannt') {
      return `${detectedType} services anbieter deutschland`;
    }

    return "anbieter services deutschland";
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    // ✅ Premium Check
    if (!isPremium) {
      setError("Diese Funktion ist nur für Business- oder Enterprise-Nutzer verfügbar.");
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
      setError("Diese Funktion ist nur für Business- oder Enterprise-Nutzer verfügbar.");
      return;
    }

    // ✅ Reset file input value vor dem Click um onChange zu garantieren
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      setTimeout(() => {
        // ✅ Kleine Verzögerung um sicherzustellen dass reset komplett ist
        fileInputRef.current?.click();
      }, 10);
    }
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
    setUploadedFile(file);
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

      // ✅ Reset file input nach erfolgreichem Upload
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      console.error("Fehler beim Extrahieren:", err);
      setError("Die Datei konnte nicht gelesen werden. Bitte versuche es erneut.");
      // ✅ Reset file input auch bei Fehlern
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
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
      setError("Diese Funktion ist nur für Business- oder Enterprise-Nutzer verfügbar.");
      return;
    }
    
    setError("");
    setResults(null);
    
    if (!contractText || contractText.trim().length < 20) {
      setError("Vertragstext muss mindestens 20 Zeichen lang sein.");
      return;
    }

    // Preis ist jetzt optional — nur validieren wenn eingegeben
    if (currentPrice !== null && currentPrice < 0) {
      setError("Der Preis darf nicht negativ sein.");
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
      // 02.09.2026: Wir merken uns, ob die Suchanfrage vom Nutzer stammt.
      // Nur dann darf der Server sie vorrangig behandeln. Eine automatisch aus
      // dem Vertragstyp gebaute Anfrage ist die schwaechste von allen und stand
      // vorher trotzdem an erster Stelle.
      const eigeneEingabe = Boolean(searchQuery && searchQuery.trim().length > 0);
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
          searchQuery: generatedQuery,
          queryVomNutzer: eigeneEingabe,
          // 01.09.2026: Der oben ermittelte Typ wird jetzt mitgesendet. Vorher
          // fehlte dieses Feld, weshalb der Server ein zweites Mal klassifiziert
          // hat — mit anderem Modell und widersprüchlichem Ergebnis.
          contractType: detectedType
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
        setError("Zu viele Anfragen. Bitte warte eine Minute und versuche es erneut.");
      } else if (errorMessage.includes('timeout') || errorMessage.includes('408')) {
        setError("Die Suche dauert zu lange. Versuche es mit einem kürzeren Vertragstext.");
      } else if (errorMessage.includes('404')) {
        setError("Wir haben keine passenden Alternativen gefunden. Ein eigenes Stichwort im Suchfeld hilft oft weiter.");
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
    setUploadedFile(null);
    setResults(null);
    setError("");
  };

  // FAB scroll to saved alternatives
  const scrollToSavedAlternatives = () => {
    const savedSection = document.querySelector('.full-saved-alternatives');
    if (savedSection) {
      savedSection.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  };

  return (
    <>
      <Helmet>
        <title>Bessere Vertragsalternativen finden | Contract AI</title>
        <meta name="description" content="Finde automatisch bessere Alternativen zu deinen bestehenden Verträgen. Spare Geld, verbessere Leistungen – mit Contract AI Better Contracts." />
        <meta name="keywords" content="bessere Verträge, Vertragsalternativen, Verträge vergleichen, Contract AI Better Contracts" />
        <link rel="canonical" href="https://www.contract-ai.de/better-contracts" />
        {/* Open Graph / Facebook */}
        <meta property="og:title" content="Bessere Vertragsalternativen finden | Contract AI" />
        <meta property="og:description" content="Vergleiche deine aktuellen Verträge mit besseren Angeboten. Spare sofort mit Contract AI Better Contracts." />
        <meta property="og:url" content="https://www.contract-ai.de/better-contracts" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://www.contract-ai.de/og-image.jpg" />
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Bessere Vertragsalternativen finden | Contract AI" />
        <meta name="twitter:description" content="Finde automatisch die besten Vertragsalternativen mit Contract AI. Einfach vergleichen & sparen." />
        <meta name="twitter:image" content="https://www.contract-ai.de/og-image.jpg" />
      </Helmet>

      {/* 🔒 Premium Banner - Full Width - außerhalb container */}
      {!isPremium && (
        <UnifiedPremiumNotice
          featureName="Bessere Vertragsalternativen"
          variant="fullWidth"
        />
      )}

      {/* ══════════════════════════════════════════════════════════════
          WERKBANK (04.09.2026)

          Vorher standen neun Bloecke vor der ersten Handlung: Hero-Symbol,
          Abzeichen "Enterprise Feature", Verlaufsueberschrift, Beschreibungs-
          satz, drei Feature-Pillen und ein breites Fortschrittsband. Zusammen
          rund 420 px Werbung an jemanden, der bereits eingeloggt ist und
          bezahlt hat. Jetzt eine 54 px hohe Kopfleiste, dadurch steht die
          Ablageflaeche im ersten Bildschirm.

          Eingaben laufen in einer gefassten Spalte von 760 px. Eine
          Ablageflaeche ueber die volle Fensterbreite wirkt immer leer.
          ══════════════════════════════════════════════════════════════ */}
      <div className={`bcw-seite ${!isPremium ? 'mit-banner' : ''}`}>

        <div className="bcw-schirm">

          <div className="bcw-kopf">
            <div>
              <div className="bcw-kopf-titel">Bessere Alternativen finden</div>
              <div className="bcw-kopf-sub">Wir vergleichen deinen Vertrag mit dem aktuellen Markt</div>
            </div>

            <div className="bcw-schritte">
              <div className={`bcw-schritt ${step === 1 ? 'jetzt' : ''} ${step > 1 ? 'fertig' : ''}`}>
                <span className="bcw-schritt-punkt">{step > 1 ? <Check size={11} strokeWidth={3.5} /> : '1'}</span>
                <span className="bcw-schritt-wort">Vertrag</span>
              </div>
              <div className="bcw-schritt-strich"></div>
              <div className={`bcw-schritt ${step === 2 ? 'jetzt' : ''} ${step > 2 ? 'fertig' : ''}`}>
                <span className="bcw-schritt-punkt">{step > 2 ? <Check size={11} strokeWidth={3.5} /> : '2'}</span>
                <span className="bcw-schritt-wort">Preis</span>
              </div>
              <div className="bcw-schritt-strich"></div>
              <div className={`bcw-schritt ${step === 3 ? 'jetzt' : ''}`}>
                <span className="bcw-schritt-punkt">3</span>
                <span className="bcw-schritt-wort">Alternativen</span>
              </div>
            </div>
          </div>

          <div className="bcw-buehne">

            {/* ══════════ SCHRITT 1 ══════════ */}
            {step === 1 && (
              <div className="bcw-spalte">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".pdf,.docx"
                  style={{ display: 'none' }}
                  disabled={!isPremium}
                />

                <div
                  className={`bcw-ablage ${dragActive ? 'zieht' : ''} ${!isPremium ? 'gesperrt' : ''}`}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onClick={handleFileSelect}
                  style={{
                    opacity: isPremium ? 1 : 0.6,
                    cursor: isPremium ? 'pointer' : 'not-allowed'
                  }}
                >
                  <div className="bcw-ablage-symbol">
                    <Upload size={21} strokeWidth={1.8} />
                  </div>

                  {fileName ? (
                    <p className="bcw-dateiname">{fileName}</p>
                  ) : (
                    <>
                      <h2>{isPremium ? 'Vertrag hierher ziehen' : 'Premium erforderlich'}</h2>
                      <p>
                        {isPremium
                          ? <>oder <span className="bcw-ablage-link">Datei auswählen</span></>
                          : 'Diese Funktion ist Teil der Premium-Mitgliedschaft'}
                      </p>
                    </>
                  )}

                  {uploadProgress > 0 && (
                    <div className="bcw-balken"><i style={{ width: `${uploadProgress}%` }} /></div>
                  )}

                  {isPremium && !fileName && (
                    <div className="bcw-ablage-fuss">
                      <span className="bcw-typ">PDF</span>
                      <span className="bcw-typ">DOCX</span>
                      <span className="bcw-typ">TXT</span>
                      <span className="bcw-trenner">·</span>
                      <span>bis 10 MB</span>
                    </div>
                  )}
                </div>

                {isPremium && (
                  <div className="bcw-nebenwege">
                    <button className="bcw-nebenweg" onClick={openScanner}>
                      <Camera size={16} />
                      Vertrag abfotografieren
                    </button>
                  </div>
                )}

                {/* Kaum jemand tippt einen Vertrag ab, deshalb liegt der
                    Textweg eingeklappt darunter statt gleichrangig daneben. */}
                <details className="bcw-textweg">
                  <summary>
                    <ChevronRight className="bcw-pfeil" size={15} />
                    Vertragstext stattdessen einfügen
                  </summary>

                  <div className="bcw-textfeld">
                    <label htmlFor="contract-text">Vertragstext</label>
                    <textarea
                      id="contract-text"
                      value={contractText}
                      onChange={(e) => setContractText(e.target.value)}
                      placeholder={isPremium ? "Füge deinen Vertragstext hier ein..." : "Premium erforderlich für diese Funktion"}
                      rows={8}
                      disabled={!isPremium}
                      style={{
                        opacity: isPremium ? 1 : 0.6,
                        cursor: isPremium ? 'text' : 'not-allowed'
                      }}
                    />

                    <div className="bcw-knopfreihe">
                      <button
                        className="bcw-knopf bcw-schieb"
                        onClick={() => isPremium && contractText.trim().length >= 20 ? setStep(2) : setError(isPremium ? "Vertragstext muss mindestens 20 Zeichen lang sein." : "Premium erforderlich für diese Funktion.")}
                        disabled={!isPremium || contractText.trim().length < 20}
                      >
                        Weiter
                        <ArrowRight size={15} strokeWidth={1.8} />
                      </button>
                    </div>
                  </div>
                </details>
              </div>
            )}

            {/* ══════════ SCHRITT 2 ══════════ */}
            {step === 2 && (
              <div className="bcw-spalte">

                {loading && isPremium ? (
                  /* Der alte Ladekreis sass oben statt mittig, weil sein
                     Kasten per Flexbox zentrierte, aber keine eigene Hoehe
                     hatte. Er war damit genau so hoch wie sein Inhalt. */
                  <div className="bcw-laden">
                    <div className="bcw-kreis"></div>
                    <h3>
                      {analyzingProgress < 30 ? "Vertragstyp wird erkannt" :
                       analyzingProgress < 60 ? "Suche nach Alternativen" :
                       analyzingProgress < 90 ? "Angebote werden geprüft" :
                       "Empfehlung wird erstellt"}
                    </h3>
                    <p>Das dauert einen Moment. Wir durchsuchen den Markt für dich.</p>
                    <div className="bcw-balken"><i style={{ width: `${analyzingProgress}%` }} /></div>
                  </div>
                ) : (
                  <>
                    {/* Hier stand ein Ausschnitt von 150 rohen Zeichen
                        Vertragstext, der aussah wie ein Fehler. */}
                    <div className="bcw-fakten">
                      <div className="bcw-fakten-kopf">
                        <div className="bcw-fakten-symbol">
                          <FileText size={17} strokeWidth={1.8} />
                        </div>
                        <div className="bcw-fakten-text">
                          <div className="bcw-fakten-titel">
                            {contractType ? contractType : 'Vertrag eingelesen'}
                          </div>
                          <div className="bcw-fakten-datei">{fileName || 'Eingefügter Text'}</div>
                        </div>
                        {uploadedFile && (
                          <button
                            className="bcw-ansehen"
                            onClick={() => {
                              const url = URL.createObjectURL(uploadedFile);
                              const fenster = window.open(url, "_blank");
                              if (fenster) { fenster.addEventListener("load", () => URL.revokeObjectURL(url), { once: true }); }
                              setTimeout(() => URL.revokeObjectURL(url), 60000);
                            }}
                          >
                            <Eye size={14} strokeWidth={1.8} />
                            Ansehen
                          </button>
                        )}
                      </div>

                      <div className="bcw-gitter">
                        <div className="bcw-feld">
                          <div className="bcw-feld-name">Erkannte Art</div>
                          <div className="bcw-feld-wert">{contractType || 'Wird ermittelt'}</div>
                        </div>
                        <div className="bcw-feld">
                          <div className="bcw-feld-name">Eingelesen</div>
                          <div className="bcw-feld-wert">{contractText.length.toLocaleString('de-DE')} Zeichen</div>
                        </div>
                        <div className="bcw-feld">
                          <div className="bcw-feld-name">Quelle</div>
                          <div className="bcw-feld-wert">{fileName ? 'Datei' : 'Eingefügter Text'}</div>
                        </div>
                      </div>

                      <div className="bcw-fakten-fuss">
                        <Info size={12} />
                        Aus deinem Dokument gelesen, nicht geschätzt.
                      </div>
                    </div>

                    <div className="bcw-eingabe-block">
                      <div className="bcw-paar">
                        <div className="bcw-feldgruppe">
                          <label htmlFor="price-input">Dein Preis pro Monat</label>
                          <div className="bcw-eingabe">
                            <input
                              id="price-input"
                              type="number"
                              placeholder="0,00"
                              value={currentPrice ?? ""}
                              onChange={(e) => setCurrentPrice(parseFloat(e.target.value))}
                              min="0"
                              step="0.01"
                              disabled={!isPremium}
                            />
                            <span className="bcw-einheit">€</span>
                          </div>
                          <div className="bcw-hilfe">Optional. Ohne festen Monatspreis leer lassen.</div>
                        </div>

                        <div className="bcw-feldgruppe">
                          <label htmlFor="search-query">Wonach gesucht wird</label>
                          <div className="bcw-eingabe">
                            <input
                              id="search-query"
                              type="text"
                              placeholder={isPremium ? "wird automatisch aus dem Vertrag erzeugt" : "Premium erforderlich"}
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              disabled={!isPremium}
                            />
                          </div>
                          <div className="bcw-hilfe">
                            {isPremium ? "Anpassen, wenn du etwas Bestimmtes suchst. Sonst einfach lassen." : "Premium erforderlich für diese Funktion"}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bcw-knopfreihe">
                      <button className="bcw-knopf still" onClick={() => setStep(1)}>
                        <ArrowLeft size={15} strokeWidth={1.8} />
                        Zurück
                      </button>

                      <button
                        className="bcw-knopf bcw-schieb"
                        onClick={handleAnalyze}
                        disabled={!isPremium || loading}
                      >
                        {isPremium ? "Alternativen finden" : "Premium erforderlich"}
                        <ArrowRight size={15} strokeWidth={1.8} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ══════════ SCHRITT 3 ══════════ */}
            {step === 3 && results && isPremium && (
              <div className="bcw-spalte-breit">
                <BetterContractsResults
                  analysis={results.analysis}
                  alternatives={results.alternatives}
                  searchQuery={results.searchQuery}
                  currentPrice={currentPrice ?? 0}
                  contractType={contractType}
                  fromCache={results.fromCache}
                  isB2B={results.isB2B || false}
                  sucheGestoert={results.sucheGestoert || false}
                  stoerungsgrund={results.stoerungsgrund || null}
                  trefferArten={results.suchBilanz?.trefferArten || null}
                  vertragsfakten={results.vertragsfakten || null}
                  fileName={fileName}
                  onOpenDocument={uploadedFile ? () => {
                    const url = URL.createObjectURL(uploadedFile);
                    const fenster = window.open(url, "_blank");
                    // Objekt-URL wieder freigeben, sonst bleibt die Datei im Speicher liegen
                    if (fenster) { fenster.addEventListener("load", () => URL.revokeObjectURL(url), { once: true }); }
                    setTimeout(() => URL.revokeObjectURL(url), 60000);
                  } : undefined}
                  aiSuggestedAlternatives={results.aiSuggestedAlternatives || []}
                />

                {/* Die beiden Knoepfe standen frei im Nichts unter der
                    Ergebnisliste. Jetzt haengen sie an einem Satz, der
                    sagt, wofuer sie da sind. */}
                <div className="bcw-ergebnis-fuss">
                  <span className="bcw-fuss-text">
                    Nichts Passendes dabei? Du kannst dieselbe Suche wiederholen oder einen anderen Vertrag prüfen.
                  </span>
                  <button
                    className="bcw-knopf still"
                    onClick={handleRetry}
                    disabled={loading || !isPremium}
                  >
                    <RotateCcw size={15} strokeWidth={1.8} />
                    Erneut suchen
                  </button>
                  <button className="bcw-knopf still" onClick={handleStartOver}>
                    <Upload size={15} strokeWidth={1.8} />
                    Neuer Vertrag
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>

        {error && (
          <div className="bcw-fehler">
            <AlertCircle size={17} />
            {error}
            {step === 2 && isPremium && (
              <button
                className="bcw-fehler-knopf"
                onClick={handleRetry}
                disabled={loading}
              >
                Erneut versuchen
              </button>
            )}
          </div>
        )}

        {/* Die Merkliste stand ohne Zaesur unter dem Ergebnis und wirkte
            dadurch verloren. Jetzt ein eigener Bereich mit eigener
            Ueberschrift. Die Komponente darin bringt keine eigene mit. */}
        <div className="bcw-merkliste">
          <div className="bcw-merk-kopf">
            <h2>Merkliste</h2>
            {savedAlternativesCount > 0 && (
              <span className="bcw-merk-anzahl">{savedAlternativesCount}</span>
            )}
            <p style={{ marginLeft: 'auto' }}>Alternativen, die du dir für später gemerkt hast</p>
          </div>

          <SavedAlternativesFull />
        </div>

        {showFAB && (
          <button
            onClick={scrollToSavedAlternatives}
            className="bcw-fab"
            title={`Zu gespeicherten Alternativen (${savedAlternativesCount})`}
          >
            <Bookmark size={20} strokeWidth={2} />
            {savedAlternativesCount > 0 && (
              <span className="bcw-fab-zahl">{savedAlternativesCount}</span>
            )}
          </button>
        )}

      </div>
      {ScannerModal}
    </>
  );
};

export default BetterContracts;