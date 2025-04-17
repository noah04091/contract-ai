import { useEffect, useState, useRef } from "react";
import styles from "../styles/Compare.module.css";
import PremiumNotice from "../components/PremiumNotice";
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

export default function Compare() {
  const [file1, setFile1] = useState<File | null>(null);
  const [file2, setFile2] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ComparisonResult | null>(null);
  const [isPremium, setIsPremium] = useState<boolean | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

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

  const handleSubmit = async () => {
    if (!file1 || !file2) {
      // Verwende den nativen Alert-Dialog im Apple-Stil
      showAlert("Bitte wähle zwei Verträge aus.");
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
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unbekannter Fehler beim Vergleich.";
      showAlert("Fehler: " + message);
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
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 2rem; max-width: 800px; margin: 0 auto;">
        <h2 style="font-weight: 600; font-size: 1.8rem; margin-bottom: 2rem; color: #1d1d1f;">Vertragsvergleich</h2>
        
        <h3 style="font-weight: 500; font-size: 1.4rem; margin-top: 2rem; color: #1d1d1f;">Unterschiede</h3>
        <p style="line-height: 1.6; color: #1d1d1f;">${result.differences}</p>
        
        <h3 style="font-weight: 500; font-size: 1.4rem; margin-top: 2rem; color: #1d1d1f;">Vorteile & Nachteile</h3>
        <p style="line-height: 1.6; color: #1d1d1f;">${result.prosAndCons}</p>
        
        <h3 style="font-weight: 500; font-size: 1.4rem; margin-top: 2rem; color: #1d1d1f;">KI-Zusammenfassung</h3>
        <p style="line-height: 1.6; color: #1d1d1f;">${result.summary}</p>
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

  // Apple-Style Alert
  const showAlert = (message: string) => {
    // In einer vollständigen Implementierung würde hier eine angepasste
    // Alert-Komponente im Apple-Stil verwendet werden
    alert(message);
  };

  if (isPremium === null) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}></div>
        <p>Lade...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Vertragsvergleich</h1>
        <p className={styles.subtitle}>
          Analysiere und vergleiche zwei Verträge, um Unterschiede zu identifizieren
          und die besten Konditionen zu erkennen.
        </p>
      </div>

      {!isPremium && <PremiumNotice />}

      <section className={styles.uploadSection}>
        <div className={styles.uploadContainer}>
          <div className={`${styles.uploadCard} ${file1 ? styles.fileSelected : ''}`}>
            <div className={styles.uploadIcon}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M13 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V9M13 2L20 9M13 2V9H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h3>Vertrag 1</h3>
            <label className={styles.fileInputLabel} htmlFor="file1">
              {file1 ? file1.name : "PDF auswählen"}
            </label>
            <input
              id="file1"
              type="file"
              accept="application/pdf"
              disabled={!isPremium}
              className={styles.fileInput}
              onChange={(e) => setFile1(e.target.files?.[0] || null)}
            />
            {file1 && (
              <div className={styles.fileIndicator}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            )}
          </div>

          <div className={`${styles.uploadCard} ${file2 ? styles.fileSelected : ''}`}>
            <div className={styles.uploadIcon}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M13 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V9M13 2L20 9M13 2V9H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h3>Vertrag 2</h3>
            <label className={styles.fileInputLabel} htmlFor="file2">
              {file2 ? file2.name : "PDF auswählen"}
            </label>
            <input
              id="file2"
              type="file"
              accept="application/pdf"
              disabled={!isPremium}
              className={styles.fileInput}
              onChange={(e) => setFile2(e.target.files?.[0] || null)}
            />
            {file2 && (
              <div className={styles.fileIndicator}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            )}
          </div>
        </div>
      </section>

      <div className={styles.actionButtons}>
        <button
          className={`${styles.primaryButton} ${(!file1 || !file2 || loading || !isPremium) ? styles.disabledButton : ''}`}
          onClick={handleSubmit}
          disabled={!file1 || !file2 || loading || !isPremium}
        >
          {loading ? (
            <>
              <div className={styles.buttonSpinner}></div>
              Analysiere...
            </>
          ) : (
            <>Vergleich starten</>
          )}
        </button>

        {(file1 || file2 || result) && (
          <button onClick={handleReset} className={styles.secondaryButton}>
            Zurücksetzen
          </button>
        )}
      </div>

        {result && (
          <div 
            className={styles.resultContainer}
            ref={resultRef}
          >
            <div className={styles.resultHeader}>
              <h2>Vergleichsergebnis</h2>
              <button 
                onClick={exportToPDF} 
                className={styles.exportButton}
                aria-label="Als PDF exportieren"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15M17 8L12 3M12 3L7 8M12 3V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Als PDF speichern
              </button>
            </div>

            <div className={styles.resultSection}>
              <div className={styles.sectionHeader}>
                <div className={styles.sectionIcon}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M12 16V12M12 8H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <h3>Unterschiede</h3>
              </div>
              <p className={styles.sectionContent}>{result.differences}</p>
            </div>

            <div className={styles.resultSection}>
              <div className={styles.sectionHeader}>
                <div className={styles.sectionIcon}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M7 11L12 16L17 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <h3>Vorteile & Nachteile</h3>
              </div>
              <p className={styles.sectionContent}>{result.prosAndCons}</p>
            </div>

            <div className={styles.resultSection}>
              <div className={styles.sectionHeader}>
                <div className={styles.sectionIcon}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2C11.0111 2 10.0444 2.29324 9.22215 2.84265C8.3999 3.39206 7.75904 4.17295 7.3806 5.08658C7.00216 6.00021 6.90315 7.00555 7.09607 7.97545C7.289 8.94536 7.7652 9.83627 8.46447 10.5355C9.16373 11.2348 10.0546 11.711 11.0245 11.9039C11.9945 12.0969 12.9998 11.9978 13.9134 11.6194C14.827 11.241 15.6079 10.6001 16.1573 9.77785C16.7068 8.95561 17 7.98891 17 7C17 5.67392 16.4732 4.40215 15.5355 3.46447C14.5979 2.52678 13.3261 2 12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M7 22H17C17.5304 22 18.0391 21.7893 18.4142 21.4142C18.7893 21.0391 19 20.5304 19 20V18C19 16.9391 18.5786 15.9217 17.8284 15.1716C17.0783 14.4214 16.0609 14 15 14H9C7.93913 14 6.92172 14.4214 6.17157 15.1716C5.42143 15.9217 5 16.9391 5 18V20C5 20.5304 5.21071 21.0391 5.58579 21.4142C5.96086 21.7893 6.46957 22 7 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <h3>KI-Zusammenfassung</h3>
              </div>
              <p className={styles.sectionContent}>{result.summary}</p>
            </div>
          </div>
        )}
                  </div>
  );
}