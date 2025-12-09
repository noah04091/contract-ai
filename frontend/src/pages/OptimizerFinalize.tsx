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
import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Helmet } from "react-helmet-async";
import {
  CheckCircle, Download, FileText, Edit3, Sparkles,
  ArrowLeft, ArrowRight, Check, RefreshCw, X, ArrowLeftCircle
} from "lucide-react";
import styles from "../styles/Generate.module.css"; // Nutze gleiche Styles wie Generate
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

export default function OptimizerFinalize() {
  const { contractId } = useParams<{ contractId: string }>();
  const navigate = useNavigate();

  // Contract State
  const [contractText, setContractText] = useState<string>("");
  const [contractTitle, setContractTitle] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

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

  // 📄 Vertrag laden
  useEffect(() => {
    const token = getToken();
    if (!contractId || !token) return;

    const fetchContract = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`${API_URL}/api/contracts/${contractId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error("Vertrag konnte nicht geladen werden");
        }

        const data = await response.json();
        setContractText(data.content || "");
        setContractTitle(data.title || "Optimierter Vertrag");
        setSelectedDesign(data.designVariant || "executive");

        // Nach dem Laden: PDF-Vorschau generieren
        setTimeout(() => generatePdfPreview(), 500);
      } catch (err) {
        console.error("Fehler beim Laden:", err);
        setError("Vertrag konnte nicht geladen werden");
      } finally {
        setIsLoading(false);
      }
    };

    fetchContract();
  }, [contractId]);

  // 📄 PDF-Vorschau generieren
  const generatePdfPreview = useCallback(async () => {
    const token = getToken();
    if (!contractId || !token || isGeneratingPreview) return;

    setIsGeneratingPreview(true);

    try {
      // Zuerst den Text speichern falls geändert
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

      // PDF generieren via React-PDF V2
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
        throw new Error("PDF konnte nicht generiert werden");
      }

      const pdfBlob = await pdfResponse.blob();
      const url = window.URL.createObjectURL(pdfBlob);

      // Alte URL freigeben
      if (pdfPreviewUrl) {
        window.URL.revokeObjectURL(pdfPreviewUrl);
      }

      setPdfPreviewUrl(url);
    } catch (err) {
      console.error("Fehler bei PDF-Generierung:", err);
    } finally {
      setIsGeneratingPreview(false);
    }
  }, [contractId, contractText, selectedDesign, pdfPreviewUrl, isGeneratingPreview]);

  // 🎨 Design wechseln
  const handleDesignChange = useCallback(async (designId: string) => {
    const token = getToken();
    if (isChangingDesign || designId === selectedDesign || !token) return;

    setIsChangingDesign(true);
    setSelectedDesign(designId);

    // Alte Preview-URL löschen für visuelles Feedback
    if (pdfPreviewUrl) {
      window.URL.revokeObjectURL(pdfPreviewUrl);
      setPdfPreviewUrl(null);
    }

    // Neue PDF-Vorschau generieren
    setIsGeneratingPreview(true);

    try {
      // Design im Backend speichern
      await fetch(`${API_URL}/api/contracts/${contractId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          designVariant: designId,
        }),
      });

      // PDF mit neuem Design generieren
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
    if (!improvements.trim() || isImproving || !token) return;

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
        setTimeout(() => generatePdfPreview(), 500);
      }
    } catch (err) {
      console.error("Fehler bei KI-Verbesserung:", err);
      setError("KI-Verbesserung fehlgeschlagen");
    } finally {
      setIsImproving(false);
    }
  }, [contractId, contractText, improvements, pdfPreviewUrl, isImproving, generatePdfPreview]);

  // 📥 PDF Download
  const handleDownload = useCallback(async () => {
    const token = getToken();
    if (!contractId || !token || isDownloading) return;

    setIsDownloading(true);
    setDownloadSuccess(false);

    try {
      // Zuerst Text speichern
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

      // URL freigeben
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

  // 🔙 Zurück zur Übersicht
  const handleBack = () => {
    navigate("/contracts");
  };

  // Cleanup bei Unmount
  useEffect(() => {
    return () => {
      if (pdfPreviewUrl) {
        window.URL.revokeObjectURL(pdfPreviewUrl);
      }
    };
  }, [pdfPreviewUrl]);

  // Loading State
  if (isLoading) {
    return (
      <div className={styles.contractGenerator}>
        <div className={styles.step3ContainerNew}>
          <div className={styles.step3PdfLoading}>
            <div className={styles.loadingSpinner}></div>
            <p>Vertrag wird geladen...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error State
  if (error && !contractText) {
    return (
      <div className={styles.contractGenerator}>
        <div className={styles.step3ContainerNew}>
          <div className={styles.step3Error}>
            <span>{error}</span>
            <button onClick={handleBack}>Zurück zur Übersicht</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Vertrag finalisieren | Contract AI</title>
        <meta name="description" content="Finalisieren Sie Ihren optimierten Vertrag mit verschiedenen Designs und KI-Nachbesserungen." />
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
                className={`${styles.step3HeaderBtn}`}
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
                  <div className={styles.tinySpinner}></div>
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
          {error && (
            <motion.div
              className={styles.step3Error}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <span>{error}</span>
              <button onClick={() => setError(null)}>
                <X size={14} />
              </button>
            </motion.div>
          )}

          {/* Two Column Layout */}
          <div className={styles.step3TwoColumn}>
            {/* Left Column: Design + Editor + KI */}
            <div className={styles.step3LeftColumn}>
              {/* Design Selector Carousel */}
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
                          {isChangingDesign && selectedDesign !== design.id && (
                            <div className={styles.step3DesignLoading}>
                              <div className={styles.tinySpinner}></div>
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

              {/* Text Editor Panel */}
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
                      onClick={generatePdfPreview}
                      disabled={isGeneratingPreview || !contractText}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {isGeneratingPreview ? (
                        <div className={styles.tinySpinner}></div>
                      ) : (
                        <RefreshCw size={14} />
                      )}
                      PDF aktualisieren
                    </motion.button>
                  </div>
                </div>

                {/* KI Improvement Section */}
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
                        placeholder="Änderungswünsche eingeben, z.B.: Zahlungsfrist auf 30 Tage ändern, Kündigungsfrist hinzufügen..."
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
                              <div className={styles.tinySpinner}></div>
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

                {/* Text Editor */}
                <div className={styles.step3EditorContent}>
                  <textarea
                    value={contractText}
                    onChange={(e) => {
                      setContractText(e.target.value);
                      // PDF-Preview invalidieren bei Textänderung
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

            {/* Right Column: PDF Preview (Sticky) */}
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
                      <div className={styles.loadingSpinner}></div>
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
                      <button onClick={generatePdfPreview}>
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
