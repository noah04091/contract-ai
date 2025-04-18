import React, { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import styles from "../styles/Optimizer.module.css";
import { Upload, AlertCircle, Check, RefreshCw, Brain, FileText, XCircle } from "lucide-react";

interface Optimization {
  problem: string;
  suggestion: string;
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
          Die KI-Vertragsoptimierung ist eine Premium-Funktion. 
          Upgrade jetzt, um unbegrenzt Verträge zu optimieren und Risiken zu minimieren.
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

export default function Optimizer() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [optimizations, setOptimizations] = useState<Optimization[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPremium, setIsPremium] = useState<boolean | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchPremiumStatus = async () => {
      try {
        const res = await fetch("/api/auth/me", {
          credentials: "include",
        });

        if (!res.ok) throw new Error("Nicht authentifiziert");

        const data = await res.json();
        setIsPremium(data.subscriptionActive === true);
      } catch (error) {
        const err = error as Error;
        console.error("❌ Fehler beim Laden des Premium-Status:", err.message);
        setIsPremium(false);
      }
    };

    fetchPremiumStatus();
  }, []);

  const handleUpload = async () => {
    if (!file || !isPremium) return;

    setLoading(true);
    setOptimizations(null);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/optimize", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      const data: { optimizations?: Optimization[]; message?: string } = await res.json();
      if (!res.ok) throw new Error(data.message || "Unbekannter Fehler");

      if (!data.optimizations?.length) {
        setError("Keine Optimierungsvorschläge gefunden.");
      } else {
        setOptimizations(data.optimizations);
      }
    } catch (error) {
      const err = error as Error;
      setError("Fehler: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setOptimizations(null);
    setError(null);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0] && isPremium) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type === "application/pdf") {
        setFile(droppedFile);
      } else {
        setError("Nur PDF-Dateien werden unterstützt");
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const activateFileInput = () => {
    fileInputRef.current?.click();
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
            <Brain size={28} className={styles.titleIcon} />
            KI-Vertragsoptimierung
          </motion.h1>
          <motion.p 
            className={styles.subtitle}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            Lade deinen Vertrag hoch und erhalte sofort Optimierungsvorschläge von unserer KI.
          </motion.p>
        </div>

        {!isPremium && <PremiumNotice />}

        <motion.div 
          className={styles.contentArea}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <div 
            className={`${styles.uploadArea} ${dragActive ? styles.dragActive : ''} ${!isPremium ? styles.disabled : ''}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={isPremium ? activateFileInput : undefined}
          >
            <input
              type="file"
              ref={fileInputRef}
              className={styles.fileInput}
              accept="application/pdf"
              disabled={!isPremium}
              onChange={handleFileChange}
            />
            
            {file ? (
              <div className={styles.fileInfo}>
                <FileText size={40} className={styles.fileIcon} />
                <div className={styles.fileName}>{file.name}</div>
                <div className={styles.fileSize}>{(file.size / 1024 / 1024).toFixed(2)} MB</div>
              </div>
            ) : (
              <div className={styles.uploadPrompt}>
                <Upload size={40} className={styles.uploadIcon} />
                <p>PDF-Datei hierher ziehen oder klicken, um auszuwählen</p>
                {!isPremium && <p className={styles.premiumHint}>Premium-Funktion</p>}
              </div>
            )}
          </div>

          <div className={styles.buttonContainer}>
            <motion.button 
              className={styles.analyzeButton}
              onClick={handleUpload} 
              disabled={!file || loading || !isPremium}
              whileHover={file && isPremium && !loading ? { scale: 1.02 } : undefined}
              whileTap={file && isPremium && !loading ? { scale: 0.98 } : undefined}
            >
              {loading ? (
                <>
                  <span className={styles.buttonSpinner}></span>
                  <span>Wird analysiert...</span>
                </>
              ) : (
                <>
                  <Brain size={18} />
                  <span>Vertrag analysieren</span>
                </>
              )}
            </motion.button>
            
            {file && (
              <motion.button 
                onClick={handleReset} 
                className={styles.resetButton}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <RefreshCw size={16} />
                <span>Zurücksetzen</span>
              </motion.button>
            )}
          </div>

          <AnimatePresence>
            {error && (
              <motion.div 
                className={styles.errorMessage}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              >
                <AlertCircle size={20} />
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {optimizations && (
              <motion.div 
                className={styles.resultContainer}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
              >
                <div className={styles.resultHeader}>
                  <Check size={20} className={styles.resultIcon} />
                  <h3>Optimierungsvorschläge</h3>
                </div>
                
                <div className={styles.cards}>
                  {optimizations.map((opt, index) => (
                    <motion.div 
                      key={index} 
                      className={styles.card}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 * index, duration: 0.3 }}
                    >
                      <div className={styles.cardProblem}>
                        <XCircle size={18} className={styles.problemIcon} />
                        <div>
                          <h4>Problem</h4>
                          <p>{opt.problem}</p>
                        </div>
                      </div>
                      
                      <div className={styles.cardSuggestion}>
                        <Check size={18} className={styles.suggestionIcon} />
                        <div>
                          <h4>Vorschlag</h4>
                          <p>{opt.suggestion}</p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </div>
  );
}