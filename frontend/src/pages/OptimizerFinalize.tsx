/**
 * 🎯 OptimizerFinalize - Post-Generation Seite für optimierte Verträge
 *
 * Diese Seite wird nach der Vertragsoptimierung angezeigt und ermöglicht:
 * - Text bearbeiten
 * - Design wählen (Carousel)
 * - KI-Nachbesserung
 * - PDF-Vorschau
 * - Download (Seite bleibt offen)
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Helmet } from "react-helmet-async";
import {
  CheckCircle, Download, FileText, Edit3, Sparkles,
  ArrowLeft, ArrowRight, Check, RefreshCw, X, ArrowLeftCircle,
  Loader2, Wand2, FileCheck
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import styles from "../styles/Generate.module.css";

// API URL
const API_URL = import.meta.env.VITE_API_URL || 'https://api.contract-ai.de';

// Token aus localStorage holen
const getToken = () => localStorage.getItem("token");

// Design-Varianten (wie in Generate.tsx)
const DESIGN_VARIANTS = [
  { id: 'executive', name: 'Executive', color: 'linear-gradient(135deg, #0B1324 0%, #1A2540 100%)' },
  { id: 'modern', name: 'Modern', color: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)' },
  { id: 'minimal', name: 'Minimal', color: '#F9FAFB' },
  { id: 'elegant', name: 'Elegant', color: 'linear-gradient(135deg, #D4AF37 0%, #B8860B 100%)' },
  { id: 'corporate', name: 'Corporate', color: 'linear-gradient(135deg, #003366 0%, #00264d 100%)' },
];

const VISIBLE_DESIGNS = 5;

// Lade-Nachrichten für Animation
const LOADING_MESSAGES = [
  "Vertrag wird geladen...",
  "Analysiere Vertragsstruktur...",
  "Bereite Editor vor...",
  "Generiere PDF-Vorschau...",
  "Fast fertig..."
];

export default function OptimizerFinalize() {
  const { contractId } = useParams<{ contractId: string }>();
  const navigate = useNavigate();
  const hasFetched = useRef(false);
  const { isLoading: authLoading } = useAuth();

  // Contract State
  const [contractText, setContractText] = useState<string>("");
  const [contractTitle, setContractTitle] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState<string>(LOADING_MESSAGES[0]);
  const [loadingProgress, setLoadingProgress] = useState<number>(0);

  // Design State
  const [selectedDesign, setSelectedDesign] = useState<string>("executive");
  const [designCarouselIndex, setDesignCarouselIndex] = useState<number>(0);
  const [isChangingDesign, setIsChangingDesign] = useState<boolean>(false);

  // PDF Preview State
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState<boolean>(false);

  // KI Improvement State
  const [showImprovementSection, setShowImprovementSection] = useState<boolean>(false);
  const [improvements, setImprovements] = useState<string>("");
  const [isImproving, setIsImproving] = useState<boolean>(false);

  // Download State
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [downloadSuccess, setDownloadSuccess] = useState<boolean>(false);

  // 🎬 Lade-Animation mit Fortschritt
  useEffect(() => {
    if (!isLoading) return;

    let messageIndex = 0;
    let progress = 0;

    const messageInterval = setInterval(() => {
      messageIndex = (messageIndex + 1) % LOADING_MESSAGES.length;
      setLoadingMessage(LOADING_MESSAGES[messageIndex]);
    }, 2000);

    const progressInterval = setInterval(() => {
      progress += Math.random() * 15;
      if (progress > 90) progress = 90; // Max 90% bis wirklich fertig
      setLoadingProgress(progress);
    }, 500);

    return () => {
      clearInterval(messageInterval);
      clearInterval(progressInterval);
    };
  }, [isLoading]);

  // 📄 Vertrag laden - nur einmal! Warten bis AuthContext fertig ist
  useEffect(() => {
    // ⏳ Warten bis AuthContext geladen hat
    if (authLoading) {
      console.log('⏳ Warte auf AuthContext...');
      return;
    }

    if (hasFetched.current) return;

    const token = getToken();
    console.log('🔑 Token Check:', token ? 'vorhanden' : 'FEHLT', 'contractId:', contractId);

    if (!contractId) {
      setError("Keine Contract-ID gefunden");
      setIsLoading(false);
      return;
    }

    if (!token) {
      console.log('⚠️ Kein Token - Redirect zu Login');
      navigate('/login', { state: { from: `/optimizer/finalize/${contractId}` } });
      return;
    }

    hasFetched.current = true;

    const fetchContract = async () => {
      console.log('📄 Lade Vertrag:', contractId);
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`${API_URL}/api/contracts/${contractId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        console.log('📄 Response Status:', response.status);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || `HTTP ${response.status}: Vertrag konnte nicht geladen werden`);
        }

        const data = await response.json();
        console.log('📄 Vertrag geladen:', data.title || 'Ohne Titel');

        setContractText(data.content || "");
        setContractTitle(data.title || "Optimierter Vertrag");
        setSelectedDesign(data.designVariant || "executive");
        setLoadingProgress(100);

        // PDF-Vorschau nach kurzer Verzögerung generieren
        setTimeout(() => {
          loadPdfPreview(contractId, data.designVariant || "executive", token);
        }, 300);

      } catch (err) {
        console.error("❌ Fehler beim Laden:", err);
        setError(err instanceof Error ? err.message : "Vertrag konnte nicht geladen werden");
      } finally {
        setIsLoading(false);
      }
    };

    fetchContract();
  }, [contractId, authLoading, navigate]);

  // 📄 PDF-Vorschau laden (separate Funktion, kein useCallback)
  const loadPdfPreview = async (id: string, design: string, token: string) => {
    if (isGeneratingPreview) return;

    console.log('🖼️ Generiere PDF-Vorschau für:', id, 'Design:', design);
    setIsGeneratingPreview(true);

    try {
      const pdfResponse = await fetch(
        `${API_URL}/api/contracts/${id}/pdf-v2?design=${design}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ design }),
        }
      );

      if (!pdfResponse.ok) {
        console.error('❌ PDF-Generierung fehlgeschlagen:', pdfResponse.status);
        return;
      }

      const pdfBlob = await pdfResponse.blob();
      const url = window.URL.createObjectURL(pdfBlob);

      console.log('✅ PDF-Vorschau erstellt');
      setPdfPreviewUrl(url);
    } catch (err) {
      console.error("❌ Fehler bei PDF-Generierung:", err);
    } finally {
      setIsGeneratingPreview(false);
    }
  };

  // 📄 PDF-Vorschau aktualisieren (für Button-Klick)
  const refreshPdfPreview = useCallback(async () => {
    const token = getToken();
    if (!contractId || !token || isGeneratingPreview) return;

    // Alte URL freigeben
    if (pdfPreviewUrl) {
      window.URL.revokeObjectURL(pdfPreviewUrl);
      setPdfPreviewUrl(null);
    }

    setIsGeneratingPreview(true);

    try {
      // Zuerst den Text speichern
      await fetch(`${API_URL}/api/contracts/${contractId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          content: contractText,
          designVariant: selectedDesign,
        }),
      });

      // PDF generieren
      const pdfResponse = await fetch(
        `${API_URL}/api/contracts/${contractId}/pdf-v2?design=${selectedDesign}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ design: selectedDesign }),
        }
      );

      if (pdfResponse.ok) {
        const pdfBlob = await pdfResponse.blob();
        const url = window.URL.createObjectURL(pdfBlob);
        setPdfPreviewUrl(url);
      }
    } catch (err) {
      console.error("Fehler bei PDF-Aktualisierung:", err);
    } finally {
      setIsGeneratingPreview(false);
    }
  }, [contractId, contractText, selectedDesign, pdfPreviewUrl, isGeneratingPreview]);

  // 🎨 Design wechseln
  const handleDesignChange = useCallback(async (designId: string) => {
    const token = getToken();
    if (isChangingDesign || designId === selectedDesign || !token || !contractId) return;

    setIsChangingDesign(true);
    setSelectedDesign(designId);

    // Alte Preview-URL löschen
    if (pdfPreviewUrl) {
      window.URL.revokeObjectURL(pdfPreviewUrl);
      setPdfPreviewUrl(null);
    }

    setIsGeneratingPreview(true);

    try {
      // Design speichern
      await fetch(`${API_URL}/api/contracts/${contractId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ designVariant: designId }),
      });

      // PDF mit neuem Design
      const pdfResponse = await fetch(
        `${API_URL}/api/contracts/${contractId}/pdf-v2?design=${designId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ design: designId }),
        }
      );

      if (pdfResponse.ok) {
        const pdfBlob = await pdfResponse.blob();
        const url = window.URL.createObjectURL(pdfBlob);
        setPdfPreviewUrl(url);
      }
    } catch (err) {
      console.error("Fehler beim Design-Wechsel:", err);
    } finally {
      setIsChangingDesign(false);
      setIsGeneratingPreview(false);
    }
  }, [contractId, selectedDesign, pdfPreviewUrl, isChangingDesign]);

  // ✨ KI-Nachbesserung
  const handleImproveContract = useCallback(async () => {
    const token = getToken();
    if (!improvements.trim() || isImproving || !token || !contractId) return;

    setIsImproving(true);

    try {
      const response = await fetch(`${API_URL}/api/generate/improve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          contractId,
          contractText,
          improvements: improvements.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error("Verbesserung fehlgeschlagen");
      }

      const data = await response.json();

      if (data.improvedText) {
        setContractText(data.improvedText);
        setImprovements("");
        setShowImprovementSection(false);

        // PDF neu generieren
        if (pdfPreviewUrl) {
          window.URL.revokeObjectURL(pdfPreviewUrl);
          setPdfPreviewUrl(null);
        }
        setTimeout(() => refreshPdfPreview(), 500);
      }
    } catch (err) {
      console.error("Fehler bei KI-Verbesserung:", err);
      setError("KI-Verbesserung fehlgeschlagen");
    } finally {
      setIsImproving(false);
    }
  }, [contractId, contractText, improvements, pdfPreviewUrl, isImproving, refreshPdfPreview]);

  // 📥 PDF Download
  const handleDownload = useCallback(async () => {
    const token = getToken();
    if (!contractId || !token || isDownloading) return;

    setIsDownloading(true);
    setDownloadSuccess(false);

    try {
      // Text speichern
      await fetch(`${API_URL}/api/contracts/${contractId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          content: contractText,
          designVariant: selectedDesign,
        }),
      });

      // PDF generieren
      const pdfResponse = await fetch(
        `${API_URL}/api/contracts/${contractId}/pdf-v2?design=${selectedDesign}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ design: selectedDesign }),
        }
      );

      if (!pdfResponse.ok) {
        throw new Error("PDF konnte nicht erstellt werden");
      }

      const pdfBlob = await pdfResponse.blob();
      const url = window.URL.createObjectURL(pdfBlob);

      // Download triggern
      const link = document.createElement("a");
      link.href = url;
      link.download = `${contractTitle.replace(/[^a-zA-Z0-9äöüÄÖÜß\s-]/g, "")}_${selectedDesign}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    } catch (err) {
      console.error("Fehler beim Download:", err);
      setError("Download fehlgeschlagen");
    } finally {
      setIsDownloading(false);
    }
  }, [contractId, contractText, selectedDesign, contractTitle, isDownloading]);

  // 🔙 Zurück
  const handleBack = () => navigate("/contracts");

  // Cleanup
  useEffect(() => {
    return () => {
      if (pdfPreviewUrl) {
        window.URL.revokeObjectURL(pdfPreviewUrl);
      }
    };
  }, [pdfPreviewUrl]);

  // 🎬 SCHÖNE LADE-ANIMATION
  if (isLoading) {
    return (
      <>
        <Helmet>
          <title>Vertrag wird geladen... | Contract AI</title>
        </Helmet>
        <div className={styles.contractGenerator}>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '70vh',
            gap: '2rem',
            padding: '2rem'
          }}>
            {/* Animiertes Icon */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
              style={{
                width: '120px',
                height: '120px',
                borderRadius: '24px',
                background: 'linear-gradient(135deg, #2E6CF6 0%, #1E53D8 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 20px 60px rgba(46, 108, 246, 0.3)'
              }}
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              >
                <Wand2 size={48} color="white" />
              </motion.div>
            </motion.div>

            {/* Text */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              style={{ textAlign: 'center' }}
            >
              <h2 style={{
                fontSize: '1.75rem',
                fontWeight: 600,
                color: '#0B1324',
                marginBottom: '0.5rem'
              }}>
                Dein Vertrag wird vorbereitet
              </h2>
              <motion.p
                key={loadingMessage}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                style={{
                  fontSize: '1rem',
                  color: '#667085',
                  marginTop: '0.5rem'
                }}
              >
                {loadingMessage}
              </motion.p>
            </motion.div>

            {/* Progress Bar */}
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: '300px', opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              style={{
                height: '6px',
                background: '#E5E7EB',
                borderRadius: '3px',
                overflow: 'hidden'
              }}
            >
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${loadingProgress}%` }}
                transition={{ duration: 0.3 }}
                style={{
                  height: '100%',
                  background: 'linear-gradient(90deg, #2E6CF6 0%, #1E53D8 100%)',
                  borderRadius: '3px'
                }}
              />
            </motion.div>

            {/* Floating Icons Animation */}
            <div style={{ position: 'relative', width: '200px', height: '60px' }}>
              {[FileText, FileCheck, Sparkles].map((Icon, i) => (
                <motion.div
                  key={i}
                  initial={{ y: 0, opacity: 0.3 }}
                  animate={{
                    y: [-5, 5, -5],
                    opacity: [0.3, 0.7, 0.3]
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    delay: i * 0.3
                  }}
                  style={{
                    position: 'absolute',
                    left: `${i * 80 + 20}px`,
                    top: '20px'
                  }}
                >
                  <Icon size={24} color="#2E6CF6" />
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </>
    );
  }

  // Error State
  if (error && !contractText) {
    return (
      <div className={styles.contractGenerator}>
        <div className={styles.step3ContainerNew}>
          <motion.div
            className={styles.step3Error}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              flexDirection: 'column',
              alignItems: 'center',
              padding: '3rem',
              textAlign: 'center'
            }}
          >
            <X size={48} style={{ marginBottom: '1rem', color: '#DC2626' }} />
            <h3 style={{ marginBottom: '0.5rem', fontSize: '1.25rem' }}>Fehler beim Laden</h3>
            <p style={{ marginBottom: '1.5rem', color: '#667085' }}>{error}</p>
            <button
              onClick={handleBack}
              style={{
                padding: '0.75rem 1.5rem',
                background: '#0B1324',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                cursor: 'pointer',
                fontWeight: 500
              }}
            >
              Zurück zur Übersicht
            </button>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Vertrag finalisieren | Contract AI</title>
        <meta name="description" content="Finalisieren Sie Ihren optimierten Vertrag." />
      </Helmet>

      <div className={styles.contractGenerator}>
        <div className={styles.step3ContainerNew}>
          {/* Success Header */}
          <div className={styles.step3SuccessHeader}>
            <div className={styles.step3SuccessLeft}>
              <div className={styles.step3SuccessIcon}>
                <CheckCircle size={24} />
              </div>
              <div className={styles.step3SuccessText}>
                <h2>{contractTitle}</h2>
                <p>Bearbeiten, Design wählen und herunterladen</p>
              </div>
            </div>
            <div className={styles.step3SuccessActions}>
              <motion.button
                onClick={handleBack}
                className={styles.step3HeaderBtn}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <ArrowLeftCircle size={16} />
                <span>Zurück</span>
              </motion.button>
              <motion.button
                onClick={handleDownload}
                disabled={isDownloading || !contractText}
                className={`${styles.step3HeaderBtn} ${downloadSuccess ? styles.success : styles.primary}`}
                whileHover={!isDownloading ? { scale: 1.02 } : {}}
                whileTap={!isDownloading ? { scale: 0.98 } : {}}
              >
                {isDownloading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : downloadSuccess ? (
                  <Check size={16} />
                ) : (
                  <Download size={16} />
                )}
                <span>{downloadSuccess ? "Heruntergeladen!" : "PDF herunterladen"}</span>
              </motion.button>
            </div>
          </div>

          {/* Error Display */}
          <AnimatePresence>
            {error && (
              <motion.div
                className={styles.step3Error}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <span>{error}</span>
                <button onClick={() => setError(null)}>
                  <X size={14} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Two Column Layout */}
          <div className={styles.step3TwoColumn}>
            {/* Left Column */}
            <div className={styles.step3LeftColumn}>
              {/* Design Carousel */}
              <div className={styles.step3DesignCompact}>
                <div className={styles.step3DesignHeader}>
                  <span><Sparkles size={16} /> Design</span>
                  <div className={styles.designHeaderRight}>
                    <span className={styles.designCount}>{DESIGN_VARIANTS.length} Varianten</span>
                  </div>
                </div>
                <div className={styles.step3DesignCarousel}>
                  <button
                    className={styles.carouselArrow}
                    onClick={() => setDesignCarouselIndex(Math.max(0, designCarouselIndex - 1))}
                    disabled={designCarouselIndex === 0 || isChangingDesign}
                  >
                    <ArrowLeft size={16} />
                  </button>
                  <div className={styles.step3DesignOptions}>
                    {DESIGN_VARIANTS
                      .slice(designCarouselIndex, designCarouselIndex + VISIBLE_DESIGNS)
                      .map((design) => (
                        <motion.button
                          key={design.id}
                          className={`${styles.step3DesignOption} ${selectedDesign === design.id ? styles.active : ''}`}
                          onClick={() => handleDesignChange(design.id)}
                          disabled={isChangingDesign}
                          whileHover={!isChangingDesign ? { scale: 1.03 } : {}}
                          whileTap={!isChangingDesign ? { scale: 0.97 } : {}}
                          data-design={design.id}
                        >
                          <div className={styles.step3DesignPreview} style={{ background: design.color }}>
                            <div className={styles.previewLines}>
                              <div className={styles.pLine}></div>
                              <div className={styles.pLine}></div>
                              <div className={styles.pLine}></div>
                            </div>
                          </div>
                          <span>{design.name}</span>
                          {selectedDesign === design.id && (
                            <div className={styles.step3DesignCheck}>
                              <Check size={10} />
                            </div>
                          )}
                        </motion.button>
                      ))}
                  </div>
                  <button
                    className={styles.carouselArrow}
                    onClick={() => setDesignCarouselIndex(Math.min(DESIGN_VARIANTS.length - VISIBLE_DESIGNS, designCarouselIndex + 1))}
                    disabled={designCarouselIndex >= DESIGN_VARIANTS.length - VISIBLE_DESIGNS || isChangingDesign}
                  >
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>

              {/* Text Editor */}
              <div className={styles.step3EditorPanel}>
                <div className={styles.step3EditorHeader}>
                  <div className={styles.step3EditorTitle}>
                    <Edit3 size={16} />
                    <span>Vertragstext bearbeiten</span>
                  </div>
                  <div className={styles.step3EditorActions}>
                    {!showImprovementSection && (
                      <button
                        className={styles.step3EditorBtn}
                        onClick={() => setShowImprovementSection(true)}
                        disabled={isImproving}
                      >
                        <Sparkles size={14} />
                        KI verbessern
                      </button>
                    )}
                    <motion.button
                      className={`${styles.step3EditorBtn} ${styles.primary}`}
                      onClick={refreshPdfPreview}
                      disabled={isGeneratingPreview || !contractText}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {isGeneratingPreview ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <RefreshCw size={14} />
                      )}
                      PDF aktualisieren
                    </motion.button>
                  </div>
                </div>

                {/* KI Improvement */}
                <AnimatePresence>
                  {showImprovementSection && (
                    <motion.div
                      className={styles.step3ImprovementBar}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                    >
                      <textarea
                        value={improvements}
                        onChange={(e) => setImprovements(e.target.value)}
                        placeholder="Änderungswünsche eingeben, z.B.: Zahlungsfrist auf 30 Tage ändern..."
                        disabled={isImproving}
                        rows={2}
                      />
                      <div className={styles.step3ImprovementActions}>
                        <button onClick={() => { setShowImprovementSection(false); setImprovements(""); }} disabled={isImproving}>
                          Abbrechen
                        </button>
                        <button
                          className={styles.primary}
                          onClick={handleImproveContract}
                          disabled={isImproving || !improvements.trim()}
                        >
                          {isImproving ? (
                            <>
                              <Loader2 size={14} className="animate-spin" />
                              Verbessere...
                            </>
                          ) : (
                            <>
                              <Sparkles size={14} />
                              Anwenden
                            </>
                          )}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className={styles.step3EditorContent}>
                  <textarea
                    value={contractText}
                    onChange={(e) => {
                      setContractText(e.target.value);
                      if (pdfPreviewUrl) {
                        window.URL.revokeObjectURL(pdfPreviewUrl);
                        setPdfPreviewUrl(null);
                      }
                    }}
                    placeholder="Vertragstext..."
                  />
                </div>
              </div>
            </div>

            {/* Right Column: PDF Preview */}
            <div className={styles.step3RightColumn}>
              <div className={styles.step3PdfPanel}>
                <div className={styles.step3PdfHeader}>
                  <span>
                    <FileText size={16} />
                    PDF-Vorschau
                  </span>
                </div>
                <div className={styles.step3PdfContent}>
                  {isGeneratingPreview ? (
                    <div className={styles.step3PdfLoading}>
                      <Loader2 size={32} className="animate-spin" style={{ color: '#2E6CF6' }} />
                      <p>PDF wird generiert...</p>
                    </div>
                  ) : pdfPreviewUrl ? (
                    <iframe
                      src={pdfPreviewUrl}
                      title="PDF Vorschau"
                    />
                  ) : (
                    <div className={styles.step3PdfEmpty}>
                      <FileText size={32} />
                      <p>Keine Vorschau verfügbar</p>
                      <button onClick={refreshPdfPreview}>
                        <RefreshCw size={14} />
                        Vorschau laden
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
