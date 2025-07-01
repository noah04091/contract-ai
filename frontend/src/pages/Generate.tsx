/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet";
import { 
  CheckCircle, Clipboard, Save, FileText, Check, Download,
  ArrowRight, ArrowLeft, Sparkles, Edit3,
  Eye, PenTool, RefreshCw, Zap
} from "lucide-react";
import styles from "../styles/Generate.module.css";
import { toast } from 'react-toastify';
import { useAuth } from "../context/AuthContext";

// Types
interface FormDataType {
  title?: string;
  details?: string;
  [key: string]: string | undefined;
}

interface ContractType {
  id: string;
  name: string;
  description: string;
  icon: string;
  fields: Array<{
    name: string;
    label: string;
    type: 'text' | 'textarea' | 'date' | 'number' | 'email';
    placeholder: string;
    required: boolean;
  }>;
}

// HTML2PDF Types (using unknown to avoid linting errors)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Html2PdfOptions = any;

// Contract Types Configuration
const CONTRACT_TYPES: ContractType[] = [
  {
    id: 'freelancer',
    name: 'Freelancer-Vertrag',
    description: 'Für freiberufliche Projekttätigkeiten',
    icon: '💼',
    fields: [
      { name: 'nameClient', label: 'Auftraggeber', type: 'text', placeholder: 'Firmenname oder Privatperson', required: true },
      { name: 'nameFreelancer', label: 'Freelancer', type: 'text', placeholder: 'Ihr Name', required: true },
      { name: 'description', label: 'Leistungsbeschreibung', type: 'textarea', placeholder: 'Detaillierte Beschreibung der zu erbringenden Leistung...', required: true },
      { name: 'timeframe', label: 'Projektdauer', type: 'text', placeholder: 'z.B. 3 Monate oder bis 31.12.2024', required: true },
      { name: 'payment', label: 'Vergütung', type: 'text', placeholder: 'z.B. 5.000€ oder 80€/Stunde', required: true },
      { name: 'rights', label: 'Nutzungsrechte', type: 'text', placeholder: 'Wer erhält welche Rechte an den Ergebnissen?', required: true },
      { name: 'terminationClause', label: 'Kündigungsfrist', type: 'text', placeholder: 'z.B. 14 Tage zum Monatsende', required: true }
    ]
  },
  {
    id: 'mietvertrag',
    name: 'Mietvertrag',
    description: 'Für Wohnraum oder Gewerbeflächen',
    icon: '🏠',
    fields: [
      { name: 'landlord', label: 'Vermieter', type: 'text', placeholder: 'Name des Vermieters', required: true },
      { name: 'tenant', label: 'Mieter', type: 'text', placeholder: 'Name des Mieters', required: true },
      { name: 'address', label: 'Immobilienadresse', type: 'textarea', placeholder: 'Vollständige Adresse der Mietimmobilie', required: true },
      { name: 'startDate', label: 'Mietbeginn', type: 'date', placeholder: '', required: true },
      { name: 'baseRent', label: 'Kaltmiete', type: 'text', placeholder: 'z.B. 1.200€ monatlich', required: true },
      { name: 'extraCosts', label: 'Nebenkosten', type: 'text', placeholder: 'z.B. 200€ Vorauszahlung', required: true },
      { name: 'termination', label: 'Kündigungsfrist', type: 'text', placeholder: 'z.B. 3 Monate zum Quartalsende', required: true }
    ]
  },
  {
    id: 'arbeitsvertrag',  
    name: 'Arbeitsvertrag',
    description: 'Für Festanstellungen',
    icon: '👔',
    fields: [
      { name: 'employer', label: 'Arbeitgeber', type: 'text', placeholder: 'Firmenname', required: true },
      { name: 'employee', label: 'Arbeitnehmer', type: 'text', placeholder: 'Name des Mitarbeiters', required: true },
      { name: 'position', label: 'Position', type: 'text', placeholder: 'z.B. Senior Developer', required: true },
      { name: 'startDate', label: 'Beginn der Tätigkeit', type: 'date', placeholder: '', required: true },
      { name: 'salary', label: 'Gehalt', type: 'text', placeholder: 'z.B. 65.000€ brutto/Jahr', required: true },
      { name: 'workingHours', label: 'Arbeitszeit', type: 'text', placeholder: 'z.B. 40 Stunden/Woche', required: true }
    ]
  },
  {
    id: 'kaufvertrag',
    name: 'Kaufvertrag',
    description: 'Für Waren und Dienstleistungen',
    icon: '🛒',
    fields: [
      { name: 'seller', label: 'Verkäufer', type: 'text', placeholder: 'Name des Verkäufers', required: true },
      { name: 'buyer', label: 'Käufer', type: 'text', placeholder: 'Name des Käufers', required: true },
      { name: 'item', label: 'Verkaufsgegenstand', type: 'textarea', placeholder: 'Detaillierte Beschreibung der Ware/Dienstleistung', required: true },
      { name: 'price', label: 'Kaufpreis', type: 'text', placeholder: 'z.B. 15.000€', required: true },
      { name: 'deliveryDate', label: 'Liefertermin', type: 'date', placeholder: '', required: true }
    ]
  },
  {
    id: 'nda',
    name: 'Geheimhaltungsvertrag',
    description: 'Vertraulichkeitsvereinbarung',
    icon: '🔒',
    fields: [
      { name: 'partyA', label: 'Partei A', type: 'text', placeholder: 'Name der ersten Vertragspartei', required: true },
      { name: 'partyB', label: 'Partei B', type: 'text', placeholder: 'Name der zweiten Vertragspartei', required: true },
      { name: 'purpose', label: 'Zweck/Anlass', type: 'textarea', placeholder: 'Worum geht es? Warum wird Vertraulichkeit benötigt?', required: true },
      { name: 'duration', label: 'Gültigkeitsdauer', type: 'text', placeholder: 'z.B. 5 Jahre oder unbefristet', required: true }
    ]
  },
  {
    id: 'custom',
    name: 'Individueller Vertrag',
    description: 'Maßgeschneidert für Ihre Bedürfnisse',
    icon: '⚙️',
    fields: [
      { name: 'details', label: 'Vertragsinhalte', type: 'textarea', placeholder: 'Beschreiben Sie detailliert, was der Vertrag regeln soll: Parteien, Leistungen, Konditionen, Laufzeit, etc.', required: true }
    ]
  }
];

const PremiumNotice: React.FC<{ onUpgradeClick: () => void }> = ({ onUpgradeClick }) => (
  <motion.div 
    className={styles.premiumNotice}
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.5 }}
  >
    <div className={styles.premiumContent}>
      <div className={styles.premiumIcon}>
        <Sparkles size={24} />
      </div>
      <div className={styles.premiumText}>
        <h3>Premium-Feature</h3>
        <p>KI-Vertragsgenerierung erfordert ein Premium-Abo</p>
      </div>
      <motion.button 
        className={styles.upgradeButton}
        onClick={onUpgradeClick}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <Zap size={16} />
        Jetzt upgraden
      </motion.button>
    </div>
  </motion.div>
);

export default function Generate() {
  // Navigation
  const navigate = useNavigate();

  // Auth Context
  const { user, isLoading } = useAuth();
  const isPremium = user?.subscriptionActive === true;

  // State Management
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedType, setSelectedType] = useState<ContractType | null>(null);
  const [formData, setFormData] = useState<FormDataType>({});
  const [generated, setGenerated] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [saved, setSaved] = useState<boolean>(false);
  const [signatureURL, setSignatureURL] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [showPreview, setShowPreview] = useState<boolean>(false);

  // Refs
  const contractRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // 🖊️ DIREKTE CANVAS-FUNKTIONEN (BESTEHENDE LÖSUNG)
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Canvas-Setup falls noch nicht geschehen
    if (canvas.width !== 800) {
      canvas.width = 800;
      canvas.height = 200;
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = "#1d4ed8";
    }

    setIsDrawing(true);
    
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);
    
    ctx.beginPath();
    ctx.moveTo(x, y);
    
    console.log("🖊️ Maus gedrückt - Zeichnen startet:", { x, y });
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);
    
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const handleCanvasMouseUp = () => {
    setIsDrawing(false);
    console.log("🖊️ Maus losgelassen - Zeichnen beendet");
  };

  const handleCanvasClick = () => {
    console.log("🖊️ Canvas wurde geklickt! Canvas ist funktionsfähig.");
  };

  // Touch-Events für Mobile
  const handleCanvasTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Canvas-Setup falls noch nicht geschehen
    if (canvas.width !== 800) {
      canvas.width = 800;
      canvas.height = 200;
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = "#1d4ed8";
    }

    setIsDrawing(true);
    
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const x = (touch.clientX - rect.left) * (canvas.width / rect.width);
    const y = (touch.clientY - rect.top) * (canvas.height / rect.height);
    
    ctx.beginPath();
    ctx.moveTo(x, y);
    
    console.log("🖊️ Touch gestartet:", { x, y });
  };

  const handleCanvasTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();
    
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const x = (touch.clientX - rect.left) * (canvas.width / rect.width);
    const y = (touch.clientY - rect.top) * (canvas.height / rect.height);
    
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const handleCanvasTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    setIsDrawing(false);
    console.log("🖊️ Touch beendet");
  };

  // Form Handling
  const handleInputChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleTypeSelect = (type: ContractType) => {
    setSelectedType(type);
    setFormData({ title: `${type.name} - ${new Date().toLocaleDateString()}` });
    setCurrentStep(2);
  };

  const isStepComplete = (step: number): boolean => {
    switch (step) {
      case 1: return selectedType !== null;
      case 2: 
        if (!selectedType) return false;
        return selectedType.fields.filter(f => f.required).every(field => 
          formData[field.name] && formData[field.name]!.trim() !== ''
        );
      case 3: return generated !== "";
      default: return false;
    }
  };

  const handleGenerate = async () => {
    if (!selectedType || !isPremium) return;

    setLoading(true);
    setGenerated("");
    setCopied(false);
    setSaved(false);

    try {
      const res = await fetch("/api/contracts/generate", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          type: selectedType.id, 
          formData: { ...formData, title: formData.title || selectedType.name }
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Fehler bei der Generierung.");
      
      setGenerated(data.contractText);
      setCurrentStep(3);
      setShowPreview(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unbekannter Fehler";
      toast.error("❌ Fehler: " + msg);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generated);
      setCopied(true);
      toast.success("📋 Vertrag erfolgreich kopiert!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("❌ Kopieren fehlgeschlagen.");
    }
  };

  // ✅ AKTUALISIERTE SAVE-FUNKTION mit Dashboard-Weiterleitung
  const handleSave = async () => {
    try {
      const res = await fetch("/api/contracts", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.title || "Generierter Vertrag",
          laufzeit: "Generiert",
          kuendigung: "Generiert",
          expiryDate: "",
          status: "Aktiv",
          content: generated,
          signature: signatureURL,
          isGenerated: true // ✅ Wichtig für Dashboard-Filter
        }),
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Speichern fehlgeschlagen.");
      }
      
      const result = await res.json();
      console.log("✅ Vertrag gespeichert:", result);
      
      setSaved(true);
      
      // ✅ NEU: Erfolgreiche Benachrichtigung mit automatischer Weiterleitung
      toast.success("✅ Vertrag wurde erfolgreich gespeichert! Sie werden zum Dashboard weitergeleitet.");
      
      // ✅ NEU: Automatische Weiterleitung zum Dashboard nach 1 Sekunde
      setTimeout(() => {
        navigate('/dashboard');
      }, 1000);
      
    } catch (err) {
      console.error("❌ Save error:", err);
      const msg = err instanceof Error ? err.message : "Unbekannter Fehler";
      toast.error("❌ Fehler beim Speichern: " + msg);
    }
  };

  const saveSignature = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      // VEREINFACHTE Überprüfung - vergleicht mit leerem Canvas
      const ctx = canvas.getContext("2d");
      if (ctx) {
        // Erstelle ein leeres Referenz-Canvas zum Vergleich
        const blankCanvas = document.createElement('canvas');
        blankCanvas.width = canvas.width;
        blankCanvas.height = canvas.height;
        
        // Vergleiche die Canvas-Inhalte
        const canvasData = canvas.toDataURL();
        const blankData = blankCanvas.toDataURL();
        
        if (canvasData === blankData) {
          toast.warning("🖊️ Bitte zeichnen Sie zuerst eine Unterschrift!");
          return;
        }
      }
      
      const dataURL = canvas.toDataURL("image/png");
      setSignatureURL(dataURL);
      console.log("🖊️ Unterschrift erfolgreich gespeichert!");
      toast.success("✅ Unterschrift wurde erfolgreich gespeichert!");
    }
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (ctx && canvas) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setSignatureURL(null);
      console.log("🖊️ Canvas wurde geleert");
    }
  };

  const handleDownloadPDF = async () => {
    try {
      // Dynamically import html2pdf - disable linting for this specific case
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const html2pdfModule = await import("html2pdf.js") as any;
      const html2pdf = html2pdfModule.default || html2pdfModule;
      
      const container = contractRef.current;
      if (!container) return;

      // Phase 3: Schutz vor leerem DOM bei PDF-Export
      if (!container || !container.innerHTML.trim()) {
        toast.warning("⚠️ Der Vertrag konnte nicht exportiert werden – keine Inhalte gefunden.");
        return;
      }

      // Add signature if exists
      const signatureDiv = document.createElement("div");
      if (signatureURL) {
        signatureDiv.innerHTML = `
          <div style="margin-top: 40px; border-top: 1px solid #e5e7eb; padding-top: 20px;">
            <p style="margin-bottom: 10px; font-weight: 600;">Digitale Unterschrift:</p>
            <img src="${signatureURL}" style="max-width: 200px; border: 1px solid #e5e7eb; border-radius: 4px;" />
            <p style="margin-top: 10px; font-size: 12px; color: #6b7280;">
              Unterschrieben am ${new Date().toLocaleString('de-DE')}
            </p>
          </div>
        `;
        container.appendChild(signatureDiv);
      }

      const opt: Html2PdfOptions = {
        margin: [20, 20, 20, 20],
        filename: `${formData.title || 'Vertrag'}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { 
          scale: 2,
          useCORS: true,
          letterRendering: true
        },
        jsPDF: { 
          unit: "pt", 
          format: "a4", 
          orientation: "portrait",
          putOnlyUsedFonts: true
        },
      };

      try {
        await html2pdf().from(container).set(opt).save();
        toast.success("✅ PDF erfolgreich generiert und heruntergeladen!");
      } catch (pdfError) {
        console.error("❌ PDF-Export fehlgeschlagen (Generate)", pdfError);
        toast.error("Beim Exportieren des generierten Vertrags ist ein Fehler aufgetreten. Bitte versuche es erneut.");
      }
      
      // Cleanup
      if (signatureDiv && container.contains(signatureDiv)) {
        container.removeChild(signatureDiv);
      }
    } catch (error) {
      console.error("PDF generation failed:", error);
      toast.error("❌ Fehler beim PDF-Export");
    }
  };

  // ✅ NEU: Upgrade Button Handler
  const handleUpgradeClick = () => {
    navigate('/upgrade');
  };

  // Loading State
  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingContent}>
          <div className={styles.loadingSpinner}></div>
          <p>Initialisiere Vertragsgenerator...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Verträge automatisch erstellen | Contract AI</title>
        <meta name="description" content="Erstelle individuelle, rechtssichere Verträge in Minuten. Contract AI kombiniert geprüfte Vorlagen mit KI-Personalisierung für perfekte Ergebnisse." />
        <meta name="keywords" content="Verträge erstellen, Vertragsgenerator, Vertragsvorlagen, KI Vertragserstellung, Contract AI" />
        <link rel="canonical" href="https://contract-ai.de/generate" />
        {/* Open Graph / Facebook */}
        <meta property="og:title" content="Verträge automatisch erstellen | Contract AI" />
        <meta property="og:description" content="Schnell, einfach und rechtssicher: Erstelle deine Verträge mit dem KI-Generator von Contract AI." />
        <meta property="og:url" content="https://contract-ai.de/generate" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://contract-ai.de/og-image.jpg" />
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Verträge automatisch erstellen | Contract AI" />
        <meta name="twitter:description" content="Dein smarter Vertragsgenerator für individuelle, rechtssichere Dokumente – powered by KI." />
        <meta name="twitter:image" content="https://contract-ai.de/og-image.jpg" />
      </Helmet>

      <div className={styles.contractGenerator}>
        {/* Header */}
        <motion.header 
          className={styles.generatorHeader}
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className={styles.headerContent}>
            <div className={styles.headerText}>
              <h1>
                <FileText size={28} />
                Intelligente Vertragserstellung
              </h1>
              <p>Erstellen Sie rechtssichere Verträge in wenigen Minuten – powered by KI</p>
            </div>
            
            {/* Progress Steps */}
            <div className={styles.progressSteps}>
              {[
                { num: 1, label: "Typ auswählen", icon: Clipboard },
                { num: 2, label: "Details eingeben", icon: Edit3 },
                { num: 3, label: "Vertrag erstellen", icon: Sparkles },
                { num: 4, label: "Finalisieren", icon: CheckCircle }
              ].map(({ num, label, icon: Icon }) => (
                <div 
                  key={num}
                  className={`${styles.step} ${currentStep >= num ? styles.active : ''} ${isStepComplete(num) ? styles.completed : ''}`}
                >
                  <div className={styles.stepIndicator}>
                    {isStepComplete(num) ? <Check size={16} /> : <Icon size={16} />}
                  </div>
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.header>

        <div className={styles.generatorContent}>
          {/* Premium Notice */}
          {!isPremium && <PremiumNotice onUpgradeClick={handleUpgradeClick} />}

          {/* Main Content */}
          <div className={`${styles.contentGrid} ${showPreview ? styles.withPreview : ''}`}>
            {/* Left Panel - Forms */}
            <motion.div 
              className={styles.formPanel}
              layout
              transition={{ duration: 0.3 }}
            >
              <AnimatePresence mode="wait" initial={false}>
                {/* Step 1: Contract Type Selection */}
                {currentStep === 1 && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className={styles.stepContent}
                  >
                    <div className={styles.stepHeader}>
                      <h2>Welchen Vertrag möchten Sie erstellen?</h2>
                      <p>Wählen Sie den passenden Vertragstyp aus unserer Bibliothek</p>
                    </div>

                    <div className={styles.contractTypesGrid}>
                      {CONTRACT_TYPES.map((type) => (
                        <motion.button
                          key={type.id}
                          className={`${styles.contractTypeCard} ${selectedType?.id === type.id ? styles.selected : ''}`}
                          onClick={() => handleTypeSelect(type)}
                          disabled={!isPremium}
                          whileHover={isPremium ? { scale: 1.02, y: -4 } : {}}
                          whileTap={isPremium ? { scale: 0.98 } : {}}
                          transition={{ duration: 0.2 }}
                        >
                          <div className={styles.cardIcon}>{type.icon}</div>
                          <h3>{type.name}</h3>
                          <p>{type.description}</p>
                          <div className={styles.cardArrow}>
                            <ArrowRight size={16} />
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Step 2: Form Fields */}
                {currentStep === 2 && selectedType && (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className={styles.stepContent}
                  >
                    <div className={styles.stepHeader}>
                      <button 
                        className={styles.backButton}
                        onClick={() => setCurrentStep(1)}
                      >
                        <ArrowLeft size={16} />
                        Zurück
                      </button>
                      <h2>{selectedType.name} erstellen</h2>
                      <p>Füllen Sie die benötigten Informationen aus</p>
                    </div>

                    <div className={styles.contractForm}>
                      <div className={styles.formGrid}>
                        {/* Title Field */}
                        <div className={`${styles.formGroup} ${styles.spanning}`}>
                          <label htmlFor="title">Vertragstitel *</label>
                          <input
                            id="title"
                            type="text"
                            value={formData.title || ''}
                            onChange={(e) => handleInputChange('title', e.target.value)}
                            placeholder="z.B. Freelancer-Vertrag für Webentwicklung"
                            disabled={!isPremium}
                          />
                        </div>

                        {/* Dynamic Fields */}
                        {selectedType.fields.map((field) => (
                          <div key={field.name} className={styles.formGroup}>
                            <label htmlFor={field.name}>
                              {field.label} {field.required && '*'}
                            </label>
                            {field.type === 'textarea' ? (
                              <textarea
                                id={field.name}
                                rows={4}
                                value={formData[field.name] || ''}
                                onChange={(e) => handleInputChange(field.name, e.target.value)}
                                placeholder={field.placeholder}
                                disabled={!isPremium}
                              />
                            ) : (
                              <input
                                id={field.name}
                                type={field.type}
                                value={formData[field.name] || ''}
                                onChange={(e) => handleInputChange(field.name, e.target.value)}
                                placeholder={field.placeholder}
                                disabled={!isPremium}
                              />
                            )}
                          </div>
                        ))}
                      </div>

                      <motion.button
                        type="button"
                        className={styles.generateButton}
                        onClick={handleGenerate}
                        disabled={loading || !isPremium || !isStepComplete(2)}
                        whileHover={isPremium && isStepComplete(2) ? { scale: 1.02 } : {}}
                        whileTap={isPremium && isStepComplete(2) ? { scale: 0.98 } : {}}
                      >
                        {loading ? (
                          <>
                            <div className={`${styles.loadingSpinner} ${styles.small}`}></div>
                            <span>KI erstellt Ihren Vertrag...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles size={18} />
                            <span>Vertrag mit KI erstellen</span>
                          </>
                        )}
                      </motion.button>
                    </div>
                  </motion.div>
                )}

                {/* Step 3: Generated Contract */}
                {currentStep === 3 && (
                  <motion.div
                    key="step3"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className={styles.stepContent}
                  >
                    <div className={styles.stepHeader}>
                      <h2>Ihr Vertrag ist fertig!</h2>
                      <p>Überprüfen Sie den Inhalt und fügen Sie optional eine Unterschrift hinzu</p>
                    </div>

                    {/* Action Buttons */}
                    <div className={styles.actionButtons}>
                      <motion.button
                        onClick={handleCopy}
                        className={`${styles.actionButton} ${copied ? styles.success : ''}`}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        {copied ? <CheckCircle size={16} /> : <Clipboard size={16} />}
                        <span>{copied ? "Kopiert!" : "Text kopieren"}</span>
                      </motion.button>

                      <motion.button
                        onClick={handleSave}
                        className={`${styles.actionButton} ${saved ? styles.success : ''}`}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        {saved ? <CheckCircle size={16} /> : <Save size={16} />}
                        <span>{saved ? "Gespeichert!" : "Speichern & zum Dashboard"}</span>
                      </motion.button>

                      <motion.button
                        onClick={handleDownloadPDF}
                        className={`${styles.actionButton} ${styles.primary}`}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Download size={16} />
                        <span>Als PDF herunterladen</span>
                      </motion.button>
                    </div>

                    {/* Digital Signature */}
                    <div className={styles.signatureSection}>
                      <h3>
                        <PenTool size={18} />
                        Digitale Unterschrift (optional)
                      </h3>
                      
                      <div className={styles.signatureCanvasContainer}>
                        <canvas 
                          ref={canvasRef}
                          className={`${styles.signatureCanvas} ${isDrawing ? styles.drawing : ''}`}
                          width={800}
                          height={200}
                          onClick={handleCanvasClick}
                          onMouseDown={handleCanvasMouseDown}
                          onMouseMove={handleCanvasMouseMove}
                          onMouseUp={handleCanvasMouseUp}
                          onMouseLeave={handleCanvasMouseUp}
                          onTouchStart={handleCanvasTouchStart}
                          onTouchMove={handleCanvasTouchMove}
                          onTouchEnd={handleCanvasTouchEnd}
                          style={{
                            cursor: 'crosshair',
                            touchAction: 'none',
                            userSelect: 'none',
                            display: 'block',
                            width: '100%',
                            height: '200px'
                          }}
                        />
                        <div className={styles.canvasOverlay}>
                          {!signatureURL && (
                            <p className={styles.canvasPlaceholder}>
                              Hier unterschreiben
                            </p>
                          )}
                          {signatureURL && (
                            <div className={styles.signaturePreview}>
                              <img src={signatureURL} alt="Unterschrift" />
                            </div>
                          )}
                        </div>
                      </div>

                      <div className={styles.signatureControls}>
                        <motion.button
                          onClick={clearSignature}
                          className={`${styles.signatureButton} ${styles.secondary}`}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <RefreshCw size={16} />
                          <span>Neu zeichnen</span>
                        </motion.button>

                        <motion.button
                          onClick={saveSignature}
                          className={`${styles.signatureButton} ${styles.primary}`}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <Check size={16} />
                          <span>Unterschrift verwenden</span>
                        </motion.button>
                      </div>
                    </div>

                    <motion.button
                      className={styles.backToStartButton}
                      onClick={() => {
                        setCurrentStep(1);
                        setSelectedType(null);
                        setFormData({});
                        setGenerated("");
                        setShowPreview(false);
                        setSignatureURL(null);
                      }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <ArrowLeft size={16} />
                      <span>Neuen Vertrag erstellen</span>
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Right Panel - Preview */}
            <AnimatePresence>
              {showPreview && generated && (
                <motion.div 
                  className={styles.previewPanel}
                  initial={{ opacity: 0, x: 20, width: 0 }}
                  animate={{ opacity: 1, x: 0, width: "auto" }}
                  exit={{ opacity: 0, x: 20, width: 0 }}
                  transition={{ duration: 0.4 }}
                >
                  <div className={styles.previewHeader}>
                    <h3>
                      <Eye size={18} />
                      Vertragsvorschau
                    </h3>
                    <button 
                      className={styles.closePreview}
                      onClick={() => setShowPreview(false)}
                    >
                      ×
                    </button>
                  </div>
                  
                  <div className={styles.previewContainer}>
                    <div 
                      ref={contractRef}
                      className={styles.contractContent}
                      dangerouslySetInnerHTML={{ 
                        __html: generated.replace(/\n/g, '<br/>') 
                      }}
                    />
                    
                    {signatureURL && (
                      <div className={styles.signatureInPreview}>
                        <div className={styles.signatureLabel}>Digitale Unterschrift:</div>
                        <img src={signatureURL} alt="Unterschrift" />
                        <div className={styles.signatureDate}>
                          Unterschrieben am {new Date().toLocaleString('de-DE')}
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Loading Overlay */}
        <AnimatePresence>
          {loading && (
            <motion.div 
              className={styles.loadingOverlay}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className={styles.loadingContent}>
                <div className={`${styles.loadingSpinner} ${styles.large}`}></div>
                <h3>KI erstellt Ihren Vertrag</h3>
                <p>Bitte warten Sie einen Moment...</p>
                <div className={styles.loadingProgress}>
                  <div className={styles.loadingBar}></div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}