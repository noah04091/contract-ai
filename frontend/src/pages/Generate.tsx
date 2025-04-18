import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, Clipboard, Save, FileText, Trash2, Check, Download } from "lucide-react";
import html2pdf from "html2pdf.js";
import styles from "../styles/Generate.module.css";

interface FormDataType {
  title?: string;
  details?: string;
  [key: string]: string | undefined;
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
          Die KI-Vertragsgenerierung ist eine Premium-Funktion. 
          Upgrade jetzt, um unbegrenzt Verträge zu erstellen.
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

export default function Generate() {
  const [contractType, setContractType] = useState<string>("freelancer");
  const [formData, setFormData] = useState<FormDataType>({});
  const [generated, setGenerated] = useState<string>("");
  const [copied, setCopied] = useState<boolean>(false);
  const [saved, setSaved] = useState<boolean>(false);
  const [finished, setFinished] = useState<boolean>(false);
  const [isPremium, setIsPremium] = useState<boolean | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const contractRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [signatureURL, setSignatureURL] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'form' | 'preview'>(generated ? 'preview' : 'form');

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch("/api/auth/me", { credentials: "include" });
        if (!res.ok) throw new Error("Nicht authentifiziert");
        const data = await res.json();
        setIsPremium(data.subscriptionActive === true);
      } catch (err) {
        console.error("❌ Fehler beim Abo-Check:", err);
        setIsPremium(false);
      }
    };
    fetchStatus();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set up the canvas for better drawing
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#000";

    let drawing = false;

    const getPos = (e: MouseEvent | TouchEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = "touches" in e ? e.touches[0].clientX : e.clientX;
      const y = "touches" in e ? e.touches[0].clientY : e.clientY;
      return { x: x - rect.left, y: y - rect.top };
    };

    const start = (e: MouseEvent | TouchEvent) => {
      drawing = true;
      setIsDrawing(true);
      ctx.beginPath();
      const { x, y } = getPos(e);
      ctx.moveTo(x, y);
      
      // Prevent scrolling on touch devices
      if ("touches" in e) {
        e.preventDefault();
      }
    };

    const draw = (e: MouseEvent | TouchEvent) => {
      if (!drawing) return;
      
      // Prevent scrolling on touch devices
      if ("touches" in e) {
        e.preventDefault();
      }
      
      const { x, y } = getPos(e);
      ctx.lineTo(x, y);
      ctx.stroke();
    };

    const stop = () => {
      drawing = false;
      setIsDrawing(false);
    };

    canvas.addEventListener("mousedown", start);
    canvas.addEventListener("mousemove", draw);
    canvas.addEventListener("mouseup", stop);
    canvas.addEventListener("mouseleave", stop);
    canvas.addEventListener("touchstart", start, { passive: false });
    canvas.addEventListener("touchmove", draw, { passive: false });
    canvas.addEventListener("touchend", stop);

    return () => {
      canvas.removeEventListener("mousedown", start);
      canvas.removeEventListener("mousemove", draw);
      canvas.removeEventListener("mouseup", stop);
      canvas.removeEventListener("mouseleave", stop);
      canvas.removeEventListener("touchstart", start);
      canvas.removeEventListener("touchmove", draw);
      canvas.removeEventListener("touchend", stop);
    };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.details || !isPremium) return;

    setLoading(true);
    setGenerated("");
    setCopied(false);
    setSaved(false);
    setFinished(false);

    try {
      const res = await fetch("/api/contracts/generate", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: contractType, formData }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Fehler bei der Generierung.");
      setGenerated(data.contractText);
      setFinished(true);
      setActiveTab('preview');
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unbekannter Fehler";
      alert("❌ Fehler: " + msg);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generated);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert("❌ Kopieren fehlgeschlagen.");
    }
  };

  const handleSave = async () => {
    try {
      const res = await fetch("/api/contracts", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.title,
          laufzeit: "Generiert",
          kuendigung: "Generiert",
          expiryDate: "",
          status: "Aktiv",
          content: generated,
        }),
      });
      if (!res.ok) throw new Error("Speichern fehlgeschlagen.");
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unbekannter Fehler";
      alert("❌ Fehler beim Speichern: " + msg);
    }
  };

  const saveSignature = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const dataURL = canvas.toDataURL("image/png");
      setSignatureURL(dataURL);
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (ctx && canvas) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setSignatureURL(null);
    }
  };

  const handleDownloadPDF = () => {
    const container = contractRef.current;
    if (!container) return;

    const signatureImage = document.createElement("img");
    if (signatureURL) {
      signatureImage.src = signatureURL;
      signatureImage.style.maxWidth = "200px";
      signatureImage.style.marginTop = "20px";
      container.appendChild(signatureImage);
    }

    const opt = {
      margin: 0.5,
      filename: `${formData.title || 'Vertrag'}_contract-ai.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: "in", format: "a4", orientation: "portrait" },
    };

    // @ts-expect-error – html2pdf hat keine TS-Typen
    html2pdf(opt).from(container).save().then(() => {
      if (signatureImage && container.contains(signatureImage)) {
        container.removeChild(signatureImage);
      }
    });
  };

  const renderAdditionalFields = () => {
    if (contractType === "custom") {
      return (
        <motion.div 
          className={styles.formGroup}
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          transition={{ duration: 0.3 }}
        >
          <div className={styles.formLabel}>Beschreibung / Inhalte:</div>
          <textarea
            name="details"
            value={formData.details || ""}
            onChange={handleChange}
            rows={5}
            placeholder="Was soll der Vertrag enthalten? Ziele, Vereinbarungen, Fristen..."
            disabled={!isPremium}
            className={styles.textarea}
          />
        </motion.div>
      );
    }
    
    return (
      <motion.div 
        className={styles.formGroup}
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: "auto" }}
        transition={{ duration: 0.3 }}
      >
        <div className={styles.formLabel}>Details:</div>
        <textarea
          name="details"
          value={formData.details || ""}
          onChange={handleChange}
          rows={5}
          placeholder={getPlaceholderByType(contractType)}
          disabled={!isPremium}
          className={styles.textarea}
        />
      </motion.div>
    );
  };

  const getPlaceholderByType = (type: string): string => {
    switch (type) {
      case "freelancer":
        return "Details zum Freelancer-Auftrag, Leistungsbeschreibung, Honorar...";
      case "mietvertrag":
        return "Adresse, Mietbeginn, Miethöhe, Kaution, besondere Vereinbarungen...";
      case "arbeitsvertrag":
        return "Position, Gehalt, Arbeitszeit, Urlaub, Probezeit...";
      case "kaufvertrag":
        return "Beschreibung der Ware/Dienstleistung, Preis, Lieferbedingungen...";
      case "nda":
        return "Zu schützende Informationen, Dauer der Geheimhaltung, Vertragsstrafen...";
      default:
        return "Was soll der Vertrag enthalten? Ziele, Vereinbarungen, Fristen...";
    }
  };

  if (isPremium === null) return (
    <div className={styles.loadingContainer}>
      <div className={styles.loadingSpinner}></div>
      <p>Lädt...</p>
    </div>
  );

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
            <FileText size={24} className={styles.titleIcon} />
            Vertrag generieren
          </motion.h1>
          <motion.p 
            className={styles.subtitle}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.8 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            Erstelle individuelle Verträge mit KI. Wähle einen Typ, füge Details hinzu und unterschreibe direkt im Browser.
          </motion.p>
        </div>

        {!isPremium && <PremiumNotice />}

        {generated && (
          <div className={styles.tabs}>
            <button 
              className={`${styles.tab} ${activeTab === 'form' ? styles.activeTab : ''}`}
              onClick={() => setActiveTab('form')}
            >
              Formular
            </button>
            <button 
              className={`${styles.tab} ${activeTab === 'preview' ? styles.activeTab : ''}`}
              onClick={() => setActiveTab('preview')}
            >
              Vorschau
            </button>
          </div>
        )}

        <AnimatePresence mode="wait">
          {activeTab === 'form' && (
            <motion.div 
              key="form"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <form onSubmit={handleSubmit} className={styles.form}>
                <motion.div 
                  className={styles.formGroup}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1, duration: 0.3 }}
                >
                  <div className={styles.formLabel}>Vertragstyp:</div>
                  <select 
                    value={contractType} 
                    onChange={(e) => setContractType(e.target.value)} 
                    disabled={!isPremium}
                    className={styles.select}
                    name="contractType"
                  >
                    <option value="freelancer">Freelancervertrag</option>
                    <option value="mietvertrag">Mietvertrag</option>
                    <option value="arbeitsvertrag">Arbeitsvertrag</option>
                    <option value="kaufvertrag">Kaufvertrag</option>
                    <option value="nda">Geheimhaltungsvertrag (NDA)</option>
                    <option value="custom">Sonstiger Vertrag</option>
                  </select>
                </motion.div>

                <motion.div 
                  className={styles.formGroup}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.3 }}
                >
                  <div className={styles.formLabel}>Vertragstitel:</div>
                  <input
                    type="text"
                    name="title"
                    value={formData.title || ""}
                    onChange={handleChange}
                    placeholder="z. B. Freelancer-Vertrag für Webentwicklung"
                    disabled={!isPremium}
                    className={styles.input}
                  />
                </motion.div>

                {renderAdditionalFields()}

                <motion.button 
                  type="submit" 
                  className={styles.submitButton}
                  disabled={loading || !isPremium || !formData.title || !formData.details}
                  whileHover={isPremium ? { scale: 1.02 } : {}}
                  whileTap={isPremium ? { scale: 0.98 } : {}}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4, duration: 0.3 }}
                >
                  {loading ? (
                    <>
                      <span className={styles.spinnerSmall}></span>
                      <span>Generiere...</span>
                    </>
                  ) : (
                    <>
                      <span className={styles.buttonIcon}>🚀</span>
                      <span>Vertrag erstellen</span>
                    </>
                  )}
                </motion.button>
              </form>
              
              {loading && (
                <motion.div 
                  className={styles.loadingOverlay}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className={styles.loadingContent}>
                    <div className={styles.loadingSpinner}></div>
                    <p>KI generiert deinen Vertrag...</p>
                    <p className={styles.loadingSubtext}>Dies kann einige Sekunden dauern</p>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}

          {activeTab === 'preview' && generated && (
            <motion.div 
              key="preview"
              className={styles.previewContainer}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
            >
              <div className={styles.contractPreview}>
                <h3 className={styles.previewTitle}>
                  <FileText size={18} />
                  Generierter Vertrag
                </h3>
                
                <div 
                  ref={contractRef}
                  className={styles.contractContent}
                >
                  <div className={styles.contractText}>{generated}</div>
                  
                  {signatureURL && (
                    <div className={styles.signaturePreview}>
                      <h4>Unterschrift:</h4>
                      <img src={signatureURL} alt="Unterschrift" />
                    </div>
                  )}
                </div>
              </div>

              <div className={styles.signatureSection}>
                <h3 className={styles.signatureTitle}>Digitale Unterschrift</h3>
                
                <div className={styles.canvasContainer}>
                  <canvas 
                    ref={canvasRef} 
                    width={400} 
                    height={150} 
                    className={`${styles.signatureCanvas} ${isDrawing ? styles.drawing : ''}`} 
                  />
                  <p className={styles.canvasInstructions}>
                    {isDrawing ? "Zeichne deine Unterschrift..." : "Hier unterschreiben"}
                  </p>
                </div>
                
                <div className={styles.canvasControls}>
                  <motion.button 
                    onClick={clearCanvas}
                    className={styles.canvasButton}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Trash2 size={16} />
                    <span>Löschen</span>
                  </motion.button>
                  
                  <motion.button 
                    onClick={saveSignature}
                    className={`${styles.canvasButton} ${styles.saveSignature}`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Check size={16} />
                    <span>Unterschrift speichern</span>
                  </motion.button>
                </div>
              </div>

              <div className={styles.contractActions}>
                <motion.button 
                  onClick={handleCopy}
                  className={`${styles.actionButton} ${copied ? styles.actionSuccess : ''}`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {copied ? <CheckCircle size={16} /> : <Clipboard size={16} />}
                  <span>{copied ? "Kopiert!" : "Kopieren"}</span>
                </motion.button>

                <motion.button 
                  onClick={handleSave}
                  className={`${styles.actionButton} ${saved ? styles.actionSuccess : ''}`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {saved ? <CheckCircle size={16} /> : <Save size={16} />}
                  <span>{saved ? "Gespeichert!" : "In Verträge speichern"}</span>
                </motion.button>

                <motion.button 
                  onClick={handleDownloadPDF}
                  className={styles.actionButton}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Download size={16} />
                  <span>PDF herunterladen</span>
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {finished && (
            <motion.div 
              className={styles.successNotification}
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            >
              <CheckCircle size={20} className={styles.successIcon} />
              <span>Vertrag erfolgreich generiert! Du kannst ihn jetzt speichern, kopieren, unterschreiben oder herunterladen.</span>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}