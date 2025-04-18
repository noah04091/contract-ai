import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FileText, Download, ArrowRight, CheckCircle, AlertCircle, 
  RefreshCw, Upload, ChevronDown, Info, PlusCircle, MinusCircle
} from "lucide-react";
import styles from "../styles/Compare.module.css";

// html2pdf wird global über ein Script-Tag eingebunden
declare global {
  interface Window {
    html2pdf: {
      (): {
        from: (element: HTMLElement) => {
          set: (options: Record<string, unknown>) => {
            save: () => void;
          };
        };
      };
    };
  }
}

interface ComparisonResult {
  differences: string;
  prosAndCons: string;
  summary: string;
}

interface PremiumNoticeProps {
  className?: string;
}

const PremiumNotice: React.FC<PremiumNoticeProps> = ({ className }) => {
  return (
    <motion.div 
      className={`${styles.premiumNotice} ${className || ''}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className={styles.premiumIcon}>✨</div>
      <div className={styles.premiumContent}>
        <h3>Premium-Funktion</h3>
        <p>
          Der Vertragsvergleich ist eine Premium-Funktion.
          Upgrade jetzt, um Verträge zu vergleichen und bessere Konditionen zu identifizieren.
        </p>
        <motion.button 
          className={styles.upgradeButton}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          Jetzt upgraden
        </motion.button>
      </div>
    </motion.div>
  );
};

export default function Compare() {
  const [file1, setFile1] = useState<File | null>(null);
  const [file2, setFile2] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ComparisonResult | null>(null);
  const [isPremium, setIsPremium] = useState<boolean | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const file1InputRef = useRef<HTMLInputElement>(null);
  const file2InputRef = useRef<HTMLInputElement>(null);
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    differences: true,
    prosAndCons: true,
    summary: true
  });

  useEffect(() => {
    const controller = new AbortController();

    const fetchStatus = async () => {
      try {
        const res = await fetch("/api/auth/me", {
          credentials: "include",
          signal: controller.signal,
        });

        if (!res.ok) throw new Error("Nicht authentifiziert");

        const data = await res.json();
        setIsPremium(data.subscriptionActive === true || data.isPremium === true);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        console.error("Fehler beim Abo-Check:", err);
        setIsPremium(false);
      }
    };

    fetchStatus();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (result && resultRef.current) {
      resultRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [result]);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleSubmit = async () => {
    if (!file1 || !file2) {
      setNotification({
        message: "Bitte wähle zwei Verträge aus.",
        type: "error"
      });
      return;
    }

    setLoading(true);
    setResult(null);

    const formData = new FormData();
    formData.append("file1", file1);
    formData.append("file2", file2);

    try {
      const res = await fetch("/api/compare", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Vergleich fehlgeschlagen");

      setResult(data);
      setNotification({
        message: "Vertragsvergleich erfolgreich durchgeführt!",
        type: "success"
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unbekannter Fehler beim Vergleich.";
      setNotification({
        message: "Fehler: " + message,
        type: "error"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFile1(null);
    setFile2(null);
    setResult(null);
  };

  const exportToPDF = () => {
    if (!result) return;
    
    // Erstelle HTML-Element für PDF
    const element = document.createElement("div");
    element.innerHTML = `
      <div style="font-family: 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; padding: 2rem; max-width: 800px; margin: 0 auto;">
        <h2 style="font-weight: 600; font-size: 1.8rem; margin-bottom: 2rem; color: #1d1d1f;">Vertragsvergleich</h2>
        
        <h3 style="font-weight: 500; font-size: 1.4rem; margin-top: 2rem; color: #1d1d1f;">Unterschiede</h3>
        <p style="line-height: 1.6; color: #1d1d1f;">${result.differences}</p>
        
        <h3 style="font-weight: 500; font-size: 1.4rem; margin-top: 2rem; color: #1d1d1f;">Vorteile & Nachteile</h3>
        <p style="line-height: 1.6; color: #1d1d1f;">${result.prosAndCons}</p>
        
        <h3 style="font-weight: 500; font-size: 1.4rem; margin-top: 2rem; color: #1d1d1f;">KI-Zusammenfassung</h3>
        <p style="line-height: 1.6; color: #1d1d1f;">${result.summary}</p>
        
        <div style="margin-top: 3rem; text-align: center; font-size: 0.9rem; color: #86868b;">
          Erstellt mit Contract AI - ${new Date().toLocaleDateString()}
        </div>
      </div>
    `;

    const options = {
      margin: [15, 15],
      filename: "Vertragsvergleich.pdf",
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" }
    };

    // html2pdf ist jetzt mit Window-Interface deklariert
    window.html2pdf().from(element).set(options).save();
  };

  // Diese Funktion wird nicht mehr verwendet, da wir die Klicks direkt behandeln
  // const triggerFileInput = (inputRef: React.RefObject<HTMLInputElement>) => {
  //   if (inputRef.current) {
  //     inputRef.current.click();
  //   }
  // };

  if (isPremium === null) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}></div>
        <p>Lade...</p>
      </div>
    );
  }

  return (
    <div className={styles.pageContainer}>
      <motion.div 
        className={styles.container}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className={styles.header}>
          <motion.h1 
            className={styles.title}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}
          >
            <FileText size={28} className={styles.titleIcon} />
            Vertragsvergleich
          </motion.h1>
          <motion.p 
            className={styles.subtitle}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            Analysiere und vergleiche zwei Verträge, um Unterschiede zu identifizieren
            und die besten Konditionen zu erkennen
          </motion.p>
        </div>

        {!isPremium && <PremiumNotice />}

        <motion.div 
          className={styles.uploadSection}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <div className={styles.uploadContainer}>
            <motion.div 
              className={`${styles.uploadCard} ${file1 ? styles.fileSelected : ''} ${!isPremium ? styles.disabled : ''}`}
              whileHover={isPremium ? { y: -5, boxShadow: "0 10px 25px rgba(0, 0, 0, 0.08)" } : {}}
              onClick={() => isPremium && file1InputRef.current?.click()}
              transition={{ duration: 0.3 }}
            >
              <input
                ref={file1InputRef}
                type="file"
                accept="application/pdf"
                disabled={!isPremium}
                className={styles.fileInput}
                onChange={(e) => e.target.files?.[0] && setFile1(e.target.files[0])}
              />
              
              <div className={styles.uploadContent}>
                {file1 ? (
                  <div className={styles.filePreview}>
                    <div className={styles.fileIcon}>
                      <FileText size={32} />
                    </div>
                    <div className={styles.fileInfo}>
                      <h3 className={styles.fileName}>{file1.name}</h3>
                      <p className={styles.fileSize}>
                        {(file1.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <div className={styles.fileIndicator}>
                      <CheckCircle size={20} />
                    </div>
                  </div>
                ) : (
                  <>
                    <div className={styles.uploadIcon}>
                      <Upload size={32} />
                    </div>
                    <h3>Vertrag 1</h3>
                    <p>PDF auswählen</p>
                    {!isPremium && <span className={styles.premiumBadge}>Premium</span>}
                  </>
                )}
              </div>
            </motion.div>

            <div className={styles.arrowContainer}>
              <ArrowRight size={24} className={styles.arrowIcon} />
            </div>

            <motion.div 
              className={`${styles.uploadCard} ${file2 ? styles.fileSelected : ''} ${!isPremium ? styles.disabled : ''}`}
              whileHover={isPremium ? { y: -5, boxShadow: "0 10px 25px rgba(0, 0, 0, 0.08)" } : {}}
              onClick={() => isPremium && file2InputRef.current?.click()}
              transition={{ duration: 0.3 }}
            >
              <input
                ref={file2InputRef}
                type="file"
                accept="application/pdf"
                disabled={!isPremium}
                className={styles.fileInput}
                onChange={(e) => e.target.files?.[0] && setFile2(e.target.files[0])}
              />
              
              <div className={styles.uploadContent}>
                {file2 ? (
                  <div className={styles.filePreview}>
                    <div className={styles.fileIcon}>
                      <FileText size={32} />
                    </div>
                    <div className={styles.fileInfo}>
                      <h3 className={styles.fileName}>{file2.name}</h3>
                      <p className={styles.fileSize}>
                        {(file2.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <div className={styles.fileIndicator}>
                      <CheckCircle size={20} />
                    </div>
                  </div>
                ) : (
                  <>
                    <div className={styles.uploadIcon}>
                      <Upload size={32} />
                    </div>
                    <h3>Vertrag 2</h3>
                    <p>PDF auswählen</p>
                    {!isPremium && <span className={styles.premiumBadge}>Premium</span>}
                  </>
                )}
              </div>
            </motion.div>
          </div>
          
          <div className={styles.actionButtons}>
            <motion.button
              className={styles.primaryButton}
              onClick={handleSubmit}
              disabled={!file1 || !file2 || loading || !isPremium}
              whileHover={file1 && file2 && !loading && isPremium ? { scale: 1.02 } : {}}
              whileTap={file1 && file2 && !loading && isPremium ? { scale: 0.98 } : {}}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
            >
              {loading ? (
                <>
                  <div className={styles.buttonSpinner}></div>
                  <span>Wird analysiert...</span>
                </>
              ) : (
                <>
                  <FileText size={18} />
                  <span>Vergleich starten</span>
                </>
              )}
            </motion.button>

            {(file1 || file2) && (
              <motion.button 
                onClick={handleReset} 
                className={styles.secondaryButton}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
              >
                <RefreshCw size={16} />
                <span>Zurücksetzen</span>
              </motion.button>
            )}
          </div>
        </motion.div>

        <AnimatePresence>
          {result && (
            <motion.div 
              className={styles.resultContainer}
              ref={resultRef}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className={styles.resultHeader}>
                <h2>Vergleichsergebnis</h2>
                <motion.button 
                  onClick={exportToPDF} 
                  className={styles.exportButton}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                >
                  <Download size={16} />
                  <span>Als PDF speichern</span>
                </motion.button>
              </div>

              <motion.div 
                className={`${styles.resultSection} ${expandedSections.differences ? styles.expanded : ''}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.4 }}
              >
                <div 
                  className={styles.sectionHeader}
                  onClick={() => toggleSection('differences')}
                >
                  <div className={styles.sectionTitleContainer}>
                    <div className={styles.sectionIcon}>
                      <Info size={18} />
                    </div>
                    <h3>Unterschiede</h3>
                  </div>
                  <button className={styles.expandButton}>
                    {expandedSections.differences ? <MinusCircle size={18} /> : <PlusCircle size={18} />}
                  </button>
                </div>
                {expandedSections.differences && (
                  <div className={styles.sectionContent}>
                    <p>{result.differences}</p>
                  </div>
                )}
              </motion.div>

              <motion.div 
                className={`${styles.resultSection} ${expandedSections.prosAndCons ? styles.expanded : ''}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.4 }}
              >
                <div 
                  className={styles.sectionHeader}
                  onClick={() => toggleSection('prosAndCons')}
                >
                  <div className={styles.sectionTitleContainer}>
                    <div className={styles.sectionIcon}>
                      <ChevronDown size={18} />
                    </div>
                    <h3>Vorteile & Nachteile</h3>
                  </div>
                  <button className={styles.expandButton}>
                    {expandedSections.prosAndCons ? <MinusCircle size={18} /> : <PlusCircle size={18} />}
                  </button>
                </div>
                {expandedSections.prosAndCons && (
                  <div className={styles.sectionContent}>
                    <p>{result.prosAndCons}</p>
                  </div>
                )}
              </motion.div>

              <motion.div 
                className={`${styles.resultSection} ${expandedSections.summary ? styles.expanded : ''}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.4 }}
              >
                <div 
                  className={styles.sectionHeader}
                  onClick={() => toggleSection('summary')}
                >
                  <div className={styles.sectionTitleContainer}>
                    <div className={styles.sectionIcon}>
                      <FileText size={18} />
                    </div>
                    <h3>KI-Zusammenfassung</h3>
                  </div>
                  <button className={styles.expandButton}>
                    {expandedSections.summary ? <MinusCircle size={18} /> : <PlusCircle size={18} />}
                  </button>
                </div>
                {expandedSections.summary && (
                  <div className={styles.sectionContent}>
                    <p>{result.summary}</p>
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {notification && (
            <motion.div 
              className={`${styles.notification} ${styles[notification.type]}`}
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            >
              {notification.type === "success" ? (
                <CheckCircle size={18} className={styles.notificationIcon} />
              ) : (
                <AlertCircle size={18} className={styles.notificationIcon} />
              )}
              <span className={styles.notificationMessage}>{notification.message}</span>
              <button 
                onClick={() => setNotification(null)} 
                className={styles.notificationClose}
              >
                ✕
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}