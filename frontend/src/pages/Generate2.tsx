/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  CheckCircle, Clipboard, Save, FileText, Check, Download,
  ArrowRight, ArrowLeft, Sparkles, Edit3, Building,
  Scale, Shield, FileSignature, Users,
  Briefcase, Home, CreditCard, Car, Laptop, PenTool,
  Eye, RefreshCw, Send, Clock, Award, Zap
} from "lucide-react";
import styles from "../styles/Generate2.module.css";
import { toast } from 'react-toastify';
import { useAuth } from "../context/AuthContext";
import UnifiedPremiumNotice from "../components/UnifiedPremiumNotice";

// Types
export interface FormDataType {
  title?: string;
  details?: string;
  [key: string]: string | undefined;
}

interface CompanyProfile {
  _id?: string;
  companyName: string;
  legalForm: string;
  street: string;
  postalCode: string;
  city: string;
  country: string;
  vatId: string;
  tradeRegister: string;
  contactEmail: string;
  contactPhone: string;
  bankName: string;
  iban: string;
  bic: string;
  logoUrl?: string;
  logoKey?: string;
}

interface ContractTypeField {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'date' | 'number' | 'email' | 'phone' | 'iban' | 'vat' | 'select';
  placeholder: string;
  required: boolean;
  validation?: {
    pattern?: string;
    min?: number;
    max?: number;
    message?: string;
  };
  options?: string[];
  group?: string;
  helpText?: string;
  dependsOn?: string;
}

interface ContractType {
  id: string;
  name: string;
  description: string;
  icon: string;
  jurisdiction?: string;
  category?: string;
  estimatedDuration?: string;
  popularity?: number;
  isNew?: boolean;
  fields: ContractTypeField[];
}

// CONTRACT TYPES - Same as original Generate.tsx
const CONTRACT_TYPES: ContractType[] = [
  {
    id: 'freelancer',
    name: 'Freelancer-Vertrag',
    description: 'Für freiberufliche Projekttätigkeiten',
    icon: '💼',
    jurisdiction: 'DE',
    category: 'Dienstleistung',
    estimatedDuration: '5-8 Minuten',
    popularity: 95,
    fields: [
      { name: 'nameClient', label: 'Auftraggeber', type: 'text', placeholder: 'Firmenname oder Privatperson', required: true },
      { name: 'nameFreelancer', label: 'Freelancer', type: 'text', placeholder: 'Ihr Name', required: true },
      { name: 'description', label: 'Leistungsbeschreibung', type: 'textarea', placeholder: 'Detaillierte Beschreibung der zu erbringenden Leistung...', required: true },
      { name: 'timeframe', label: 'Projektdauer', type: 'text', placeholder: 'z.B. 3 Monate oder bis 31.12.2024', required: true },
      { name: 'payment', label: 'Vergütung', type: 'text', placeholder: 'z.B. 5.000€ oder 80€/Stunde', required: true },
      { name: 'rights', label: 'Nutzungsrechte', type: 'text', placeholder: 'Wer erhält welche Rechte an den Ergebnissen?', required: true },
      { name: 'terminationClause', label: 'Kündigungsfrist', type: 'text', placeholder: 'z.B. 14 Tage zum Monatsende', required: true },
    ]
  },
  {
    id: 'dienstleistung',
    name: 'Dienstleistungsvertrag',
    description: 'Allgemeine Dienstleistungen',
    icon: '🔧',
    jurisdiction: 'DE',
    category: 'Dienstleistung',
    estimatedDuration: '4-6 Minuten',
    popularity: 88,
    fields: [
      { name: 'serviceProvider', label: 'Dienstleister', type: 'text', placeholder: 'Name des Dienstleisters', required: true },
      { name: 'client', label: 'Auftraggeber', type: 'text', placeholder: 'Name des Auftraggebers', required: true },
      { name: 'serviceDescription', label: 'Leistungsbeschreibung', type: 'textarea', placeholder: 'Welche Dienstleistungen werden erbracht?', required: true },
      { name: 'duration', label: 'Vertragslaufzeit', type: 'text', placeholder: 'z.B. 12 Monate ab Vertragsunterzeichnung', required: true },
      { name: 'compensation', label: 'Vergütung', type: 'text', placeholder: 'Höhe und Zahlungsmodalitäten', required: true },
      { name: 'terminationPeriod', label: 'Kündigungsfrist', type: 'text', placeholder: 'z.B. 3 Monate zum Quartalsende', required: true },
    ]
  },
  {
    id: 'arbeitsvertrag',
    name: 'Arbeitsvertrag',
    description: 'Für Festanstellungen',
    icon: '👔',
    jurisdiction: 'DE',
    category: 'Arbeitsrecht',
    estimatedDuration: '6-10 Minuten',
    popularity: 92,
    fields: [
      { name: 'employer', label: 'Arbeitgeber', type: 'text', placeholder: 'Firmenname', required: true },
      { name: 'employee', label: 'Arbeitnehmer', type: 'text', placeholder: 'Vollständiger Name', required: true },
      { name: 'position', label: 'Position/Tätigkeit', type: 'text', placeholder: 'Stellenbezeichnung', required: true },
      { name: 'startDate', label: 'Eintrittsdatum', type: 'date', placeholder: 'Beginn des Arbeitsverhältnisses', required: true },
      { name: 'salary', label: 'Gehalt', type: 'text', placeholder: 'Brutto pro Monat', required: true },
      { name: 'workingHours', label: 'Arbeitszeit', type: 'text', placeholder: 'z.B. 40 Stunden/Woche', required: true },
      { name: 'vacationDays', label: 'Urlaubstage', type: 'number', placeholder: 'Tage pro Jahr', required: true },
      { name: 'probationPeriod', label: 'Probezeit', type: 'text', placeholder: 'z.B. 6 Monate', required: true },
    ]
  },
  {
    id: 'mietvertrag',
    name: 'Mietvertrag',
    description: 'Für Wohn- und Gewerbeimmobilien',
    icon: '🏠',
    jurisdiction: 'DE',
    category: 'Immobilien',
    estimatedDuration: '8-12 Minuten',
    popularity: 85,
    fields: [
      { name: 'landlord', label: 'Vermieter', type: 'text', placeholder: 'Name des Vermieters', required: true },
      { name: 'tenant', label: 'Mieter', type: 'text', placeholder: 'Name des Mieters', required: true },
      { name: 'propertyAddress', label: 'Objektadresse', type: 'textarea', placeholder: 'Vollständige Adresse des Mietobjekts', required: true },
      { name: 'rentAmount', label: 'Kaltmiete', type: 'text', placeholder: 'Monatliche Miete in Euro', required: true },
      { name: 'utilities', label: 'Nebenkosten', type: 'text', placeholder: 'Nebenkostenvorauszahlung', required: true },
      { name: 'deposit', label: 'Kaution', type: 'text', placeholder: 'Höhe der Kaution', required: true },
      { name: 'startDate', label: 'Mietbeginn', type: 'date', placeholder: 'Beginn des Mietverhältnisses', required: true },
    ]
  },
  {
    id: 'kaufvertrag',
    name: 'Kaufvertrag',
    description: 'Für Waren und Güter',
    icon: '📦',
    jurisdiction: 'DE',
    category: 'Handel',
    estimatedDuration: '4-6 Minuten',
    popularity: 78,
    fields: [
      { name: 'seller', label: 'Verkäufer', type: 'text', placeholder: 'Name des Verkäufers', required: true },
      { name: 'buyer', label: 'Käufer', type: 'text', placeholder: 'Name des Käufers', required: true },
      { name: 'itemDescription', label: 'Kaufgegenstand', type: 'textarea', placeholder: 'Genaue Beschreibung des Kaufgegenstands', required: true },
      { name: 'price', label: 'Kaufpreis', type: 'text', placeholder: 'Preis in Euro', required: true },
      { name: 'paymentTerms', label: 'Zahlungsbedingungen', type: 'text', placeholder: 'z.B. Bei Übergabe, in Raten', required: true },
      { name: 'deliveryDate', label: 'Lieferdatum', type: 'date', placeholder: 'Geplantes Lieferdatum', required: true },
    ]
  },
  {
    id: 'nda',
    name: 'NDA / Geheimhaltung',
    description: 'Vertraulichkeitsvereinbarung',
    icon: '🔒',
    jurisdiction: 'DE',
    category: 'Unternehmensrecht',
    estimatedDuration: '3-5 Minuten',
    popularity: 90,
    isNew: true,
    fields: [
      { name: 'disclosingParty', label: 'Offenlegende Partei', type: 'text', placeholder: 'Wer gibt Informationen preis?', required: true },
      { name: 'receivingParty', label: 'Empfangende Partei', type: 'text', placeholder: 'Wer erhält die Informationen?', required: true },
      { name: 'purpose', label: 'Zweck', type: 'textarea', placeholder: 'Warum werden Informationen geteilt?', required: true },
      { name: 'confidentialInfo', label: 'Vertrauliche Informationen', type: 'textarea', placeholder: 'Was ist vertraulich?', required: true },
      { name: 'duration', label: 'Geheimhaltungsfrist', type: 'text', placeholder: 'z.B. 5 Jahre ab Unterzeichnung', required: true },
    ]
  },
];

// Design Variants
const DESIGN_VARIANTS = [
  { id: 'executive', name: 'Executive', description: 'Klassische Großkanzlei', color: '#8B7355' },
  { id: 'modern', name: 'Modern', description: 'Tech & Startup Style', color: '#3B82F6' },
  { id: 'minimal', name: 'Minimal', description: 'Swiss Design', color: '#1E293B' },
  { id: 'elegant', name: 'Elegant', description: 'Boutique-Kanzlei', color: '#B8860B' },
  { id: 'corporate', name: 'Corporate', description: 'DAX-Konzern Style', color: '#003366' },
];

// Icon mapping for contract types
const getContractIcon = (iconStr: string) => {
  const iconMap: { [key: string]: React.ReactNode } = {
    '💼': <Briefcase size={24} />,
    '🔧': <PenTool size={24} />,
    '👔': <Users size={24} />,
    '🏠': <Home size={24} />,
    '📦': <CreditCard size={24} />,
    '🔒': <Shield size={24} />,
    '🚗': <Car size={24} />,
    '💻': <Laptop size={24} />,
  };
  return iconMap[iconStr] || <FileText size={24} />;
};

const Generate2: React.FC = () => {
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();

  // Derived auth states
  const userPlan = user?.subscriptionPlan || 'free';
  const isPremium = userPlan !== 'free';

  // Step Management
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Form State
  const [selectedType, setSelectedType] = useState<ContractType | null>(null);
  const [formData, setFormData] = useState<FormDataType>({});
  const [contractText, setContractText] = useState<string>("");
  const [generatedHTML, setGeneratedHTML] = useState<string>("");

  // UI State
  const [loading, setLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [saved, setSaved] = useState<boolean>(false);
  const [savedContractId, setSavedContractId] = useState<string | null>(null);

  // PDF Preview
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState<boolean>(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState<boolean>(false);

  // Company Profile
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(null);
  const [useCompanyProfile, setUseCompanyProfile] = useState<boolean>(false);

  // Design Variant
  const [selectedDesignVariant, setSelectedDesignVariant] = useState<string>('executive');
  const [isChangingDesign, setIsChangingDesign] = useState<boolean>(false);

  // Search/Filter for contract types
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Contract Data for saving
  const [contractData, setContractData] = useState<any>({
    contractType: '',
    parties: {},
    contractDetails: {}
  });

  // Load Company Profile
  useEffect(() => {
    if (isPremium && !isLoading && user) {
      loadCompanyProfile();
    }
  }, [isPremium, isLoading, user]);

  // Auto-activate company profile when loaded
  useEffect(() => {
    if (companyProfile) {
      setUseCompanyProfile(true);
    }
  }, [companyProfile]);

  // Auto-load PDF preview when Step 3 is reached
  useEffect(() => {
    if (currentStep === 3 && contractText && !pdfPreviewUrl && !isGeneratingPreview) {
      const timer = setTimeout(() => {
        generatePDFPreview();
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [currentStep, contractText]);

  const loadCompanyProfile = async () => {
    try {
      const response = await fetch('/api/company-profile/me', {
        credentials: 'include'
      });
      const data = await response.json();
      if (data.success && data.profile) {
        setCompanyProfile(data.profile);
      }
    } catch (error) {
      console.error('Error loading company profile:', error);
    }
  };

  // Filter contract types based on search
  const filteredContractTypes = CONTRACT_TYPES.filter(type =>
    type.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    type.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    type.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Step validation
  const canProceed = (): boolean => {
    switch (currentStep) {
      case 1: return selectedType !== null;
      case 2:
        if (!selectedType) return false;
        return selectedType.fields.filter(f => f.required).every(field =>
          formData[field.name] && formData[field.name]!.trim() !== ''
        );
      case 3: return contractText !== "";
      default: return false;
    }
  };

  // Generate contract
  const handleGenerate = async () => {
    if (!selectedType || userPlan === 'free') return;

    setLoading(true);
    setContractText("");
    setGeneratedHTML("");
    setCopied(false);
    setSaved(false);
    setSavedContractId(null);

    try {
      const res = await fetch("/api/contracts/generate", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: selectedType.id,
          formData: { ...formData, title: formData.title || selectedType.name },
          useCompanyProfile: useCompanyProfile && !!companyProfile,
          designVariant: selectedDesignVariant
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Fehler bei der Generierung.");

      setContractText(data.contractText);
      setGeneratedHTML(data.contractHTML || "");

      setContractData((prev: any) => ({
        ...prev,
        contractType: selectedType.name,
        parties: formData,
        contractDetails: formData
      }));

      setCurrentStep(3);
      toast.success("✅ Vertrag erfolgreich generiert!");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unbekannter Fehler";
      toast.error("❌ Fehler: " + msg);
    } finally {
      setLoading(false);
    }
  };

  // Copy to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(contractText);
      setCopied(true);
      toast.success("📋 Vertrag kopiert!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("❌ Kopieren fehlgeschlagen.");
    }
  };

  // Save contract
  const handleSave = async () => {
    try {
      const isUpdate = !!savedContractId;
      const url = isUpdate
        ? `${import.meta.env.VITE_API_URL || 'https://api.contract-ai.de'}/api/contracts/${savedContractId}`
        : `${import.meta.env.VITE_API_URL || 'https://api.contract-ai.de'}/api/contracts`;

      const bodyData: any = {
        name: `${contractData.contractType || 'Vertrag'} - ${new Date().toLocaleDateString('de-DE')}`,
        content: contractText || '',
        isGenerated: true,
        metadata: {
          contractType: contractData.contractType,
          parties: contractData.parties,
          contractDetails: contractData.contractDetails,
          hasLogo: !!(useCompanyProfile && companyProfile?.logoUrl),
          generatedAt: new Date().toISOString()
        }
      };

      if (isUpdate) {
        bodyData.htmlContent = null;
        bodyData.contractHTML = null;
      } else {
        bodyData.htmlContent = generatedHTML || undefined;
      }

      const res = await fetch(url, {
        method: isUpdate ? 'PUT' : 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyData)
      });

      const data = await res.json();

      if (res.ok) {
        const contractId = data.contractId || savedContractId;
        if (!savedContractId) {
          setSavedContractId(contractId);
        }
        setSaved(true);
        toast.success(isUpdate ? "✅ Änderungen gespeichert!" : "✅ Vertrag gespeichert!");
      } else {
        throw new Error(data.error || 'Speichern fehlgeschlagen');
      }
    } catch (error) {
      console.error("Error saving:", error);
      toast.error(`❌ Fehler beim Speichern`);
    }
  };

  // Generate PDF Preview
  const generatePDFPreview = async () => {
    if (!savedContractId && !contractText) return;

    setIsGeneratingPreview(true);
    try {
      // Try to use saved contract's PDF first
      if (savedContractId) {
        const s3Res = await fetch(`/api/s3/view?contractId=${savedContractId}`, {
          credentials: 'include'
        });

        if (s3Res.ok) {
          const s3Data = await s3Res.json();
          if (s3Data.fileUrl || s3Data.url) {
            setPdfPreviewUrl(s3Data.fileUrl || s3Data.url);
            return;
          }
        }
      }

      // Fallback: Generate preview from text
      const previewRes = await fetch('/api/contracts/generate/preview-pdf', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractText,
          designVariant: selectedDesignVariant,
          contractType: selectedType?.name || 'Vertrag'
        })
      });

      if (previewRes.ok) {
        const blob = await previewRes.blob();
        const url = URL.createObjectURL(blob);
        setPdfPreviewUrl(url);
      }
    } catch (error) {
      console.error('Error generating PDF preview:', error);
    } finally {
      setIsGeneratingPreview(false);
    }
  };

  // Download PDF
  const handleDownloadPDF = async () => {
    if (!savedContractId && !contractText) {
      toast.warning("Bitte speichern Sie den Vertrag zuerst.");
      return;
    }

    setIsGeneratingPDF(true);
    try {
      const response = await fetch(`/api/contracts/generate/download-pdf/${savedContractId || 'temp'}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractText,
          designVariant: selectedDesignVariant,
          contractType: selectedType?.name || 'Vertrag'
        })
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${contractData.contractType || 'Vertrag'}_${new Date().toISOString().split('T')[0]}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success("✅ PDF heruntergeladen!");
      } else {
        throw new Error('PDF generation failed');
      }
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast.error("❌ Fehler beim PDF-Download");
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // Change design variant
  const handleDesignChange = async (newDesign: string) => {
    if (isChangingDesign || newDesign === selectedDesignVariant) return;
    if (!savedContractId) {
      setSelectedDesignVariant(newDesign);
      toast.info("Design wird beim Speichern angewendet");
      return;
    }

    setIsChangingDesign(true);
    try {
      const response = await fetch('/api/contracts/generate/change-design', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractId: savedContractId,
          newDesignVariant: newDesign
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSelectedDesignVariant(newDesign);
        setGeneratedHTML(data.newHTML);
        setPdfPreviewUrl(null);
        toast.success(`✅ Design zu "${newDesign}" geändert!`);

        // Regenerate PDF preview
        setTimeout(() => generatePDFPreview(), 1000);
      } else {
        throw new Error(data.message || 'Design-Änderung fehlgeschlagen');
      }
    } catch (error) {
      console.error('Error changing design:', error);
      toast.error("❌ Fehler beim Design-Wechsel");
    } finally {
      setIsChangingDesign(false);
    }
  };

  // Group fields by their group property
  const groupFields = (fields: ContractTypeField[]) => {
    const groups: { [key: string]: ContractTypeField[] } = {};
    fields.forEach(field => {
      const group = field.group || 'Allgemein';
      if (!groups[group]) groups[group] = [];
      groups[group].push(field);
    });
    return groups;
  };

  // Render step indicator
  const renderStepIndicator = () => (
    <div className={styles.stepIndicator}>
      {[1, 2, 3].map((step) => (
        <React.Fragment key={step}>
          <motion.div
            className={`${styles.stepDot} ${currentStep >= step ? styles.stepActive : ''} ${currentStep === step ? styles.stepCurrent : ''}`}
            whileHover={{ scale: 1.1 }}
            onClick={() => {
              if (step < currentStep) setCurrentStep(step);
            }}
          >
            {currentStep > step ? (
              <Check size={16} />
            ) : (
              <span>{step}</span>
            )}
          </motion.div>
          {step < 3 && (
            <div className={`${styles.stepLine} ${currentStep > step ? styles.stepLineActive : ''}`} />
          )}
        </React.Fragment>
      ))}
      <div className={styles.stepLabels}>
        <span className={currentStep === 1 ? styles.labelActive : ''}>Vertragstyp</span>
        <span className={currentStep === 2 ? styles.labelActive : ''}>Details</span>
        <span className={currentStep === 3 ? styles.labelActive : ''}>Fertigstellen</span>
      </div>
    </div>
  );

  // STEP 1: Contract Type Selection
  const renderStep1 = () => (
    <motion.div
      className={styles.stepContent}
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
    >
      <div className={styles.stepHeader}>
        <div className={styles.stepIcon}>
          <Scale size={28} />
        </div>
        <div>
          <h2>Welchen Vertrag möchten Sie erstellen?</h2>
          <p>Wählen Sie aus unseren rechtssicheren Vorlagen</p>
        </div>
      </div>

      {/* Search */}
      <div className={styles.searchContainer}>
        <input
          type="text"
          placeholder="Vertragstyp suchen..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={styles.searchInput}
        />
      </div>

      {/* Contract Types Grid */}
      <div className={styles.contractTypesGrid}>
        {filteredContractTypes.map((type) => (
          <motion.div
            key={type.id}
            className={`${styles.contractTypeCard} ${selectedType?.id === type.id ? styles.selected : ''}`}
            onClick={() => setSelectedType(type)}
            whileHover={{ scale: 1.02, y: -4 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className={styles.cardHeader}>
              <div className={styles.cardIcon}>
                {getContractIcon(type.icon)}
              </div>
              {type.isNew && <span className={styles.newBadge}>Neu</span>}
              {selectedType?.id === type.id && (
                <div className={styles.selectedBadge}>
                  <CheckCircle size={18} />
                </div>
              )}
            </div>
            <h3>{type.name}</h3>
            <p>{type.description}</p>
            <div className={styles.cardMeta}>
              <span><Clock size={14} /> {type.estimatedDuration}</span>
              {type.category && <span className={styles.category}>{type.category}</span>}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Company Profile Toggle */}
      {isPremium && companyProfile && (
        <motion.div
          className={styles.companyProfileToggle}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className={styles.toggleContent}>
            <Building size={20} />
            <div>
              <strong>Firmenprofil verwenden</strong>
              <span>{companyProfile.companyName}</span>
            </div>
          </div>
          <label className={styles.switch}>
            <input
              type="checkbox"
              checked={useCompanyProfile}
              onChange={(e) => setUseCompanyProfile(e.target.checked)}
            />
            <span className={styles.slider}></span>
          </label>
        </motion.div>
      )}
    </motion.div>
  );

  // STEP 2: Details Form
  const renderStep2 = () => {
    if (!selectedType) return null;
    const groupedFields = groupFields(selectedType.fields);

    return (
      <motion.div
        className={styles.stepContent}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.3 }}
      >
        <div className={styles.stepHeader}>
          <div className={styles.stepIcon}>
            <Edit3 size={28} />
          </div>
          <div>
            <h2>{selectedType.name}</h2>
            <p>Füllen Sie die Vertragsdetails aus</p>
          </div>
        </div>

        {/* Design Variant Selector */}
        <div className={styles.designSelector}>
          <label>Design-Variante</label>
          <div className={styles.designOptions}>
            {DESIGN_VARIANTS.map((variant) => (
              <motion.button
                key={variant.id}
                className={`${styles.designOption} ${selectedDesignVariant === variant.id ? styles.designSelected : ''}`}
                onClick={() => setSelectedDesignVariant(variant.id)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                style={{ '--accent-color': variant.color } as React.CSSProperties}
              >
                <div className={styles.designPreviewDot} style={{ background: variant.color }} />
                <span>{variant.name}</span>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Form Fields */}
        <div className={styles.formContainer}>
          {Object.entries(groupedFields).map(([groupName, fields]) => (
            <div key={groupName} className={styles.fieldGroup}>
              {groupName !== 'Allgemein' && (
                <h4 className={styles.groupTitle}>{groupName}</h4>
              )}
              <div className={styles.fieldsGrid}>
                {fields.map((field) => (
                  <div
                    key={field.name}
                    className={`${styles.fieldWrapper} ${field.type === 'textarea' ? styles.fullWidth : ''}`}
                  >
                    <label>
                      {field.label}
                      {field.required && <span className={styles.required}>*</span>}
                    </label>
                    {field.type === 'textarea' ? (
                      <textarea
                        placeholder={field.placeholder}
                        value={formData[field.name] || ''}
                        onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                        rows={4}
                      />
                    ) : field.type === 'select' ? (
                      <select
                        value={formData[field.name] || ''}
                        onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                      >
                        <option value="">{field.placeholder}</option>
                        {field.options?.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={field.type === 'date' ? 'date' : field.type === 'number' ? 'number' : 'text'}
                        placeholder={field.placeholder}
                        value={formData[field.name] || ''}
                        onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                      />
                    )}
                    {field.helpText && (
                      <span className={styles.helpText}>{field.helpText}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    );
  };

  // STEP 3: Review & Finalize
  const renderStep3 = () => (
    <motion.div
      className={styles.stepContent}
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
    >
      <div className={styles.stepHeader}>
        <div className={styles.stepIcon}>
          <FileSignature size={28} />
        </div>
        <div>
          <h2>Ihr Vertrag ist fertig</h2>
          <p>Überprüfen, bearbeiten und herunterladen</p>
        </div>
      </div>

      {/* Quick Actions Bar */}
      <div className={styles.quickActions}>
        <motion.button
          className={`${styles.actionBtn} ${styles.primary}`}
          onClick={handleSave}
          disabled={saved}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {saved ? <Check size={18} /> : <Save size={18} />}
          {saved ? 'Gespeichert' : 'Speichern'}
        </motion.button>

        <motion.button
          className={styles.actionBtn}
          onClick={handleCopy}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {copied ? <Check size={18} /> : <Clipboard size={18} />}
          {copied ? 'Kopiert' : 'Kopieren'}
        </motion.button>

        <motion.button
          className={styles.actionBtn}
          onClick={handleDownloadPDF}
          disabled={isGeneratingPDF}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {isGeneratingPDF ? <RefreshCw size={18} className={styles.spinning} /> : <Download size={18} />}
          PDF
        </motion.button>

        <motion.button
          className={styles.actionBtn}
          onClick={() => navigate(`/signature-request/${savedContractId}`)}
          disabled={!savedContractId}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Send size={18} />
          Zur Unterschrift
        </motion.button>
      </div>

      {/* Design Selector in Step 3 */}
      {isPremium && (
        <div className={styles.step3DesignSelector}>
          <h4><Sparkles size={16} /> Design ändern</h4>
          <div className={styles.designChips}>
            {DESIGN_VARIANTS.map((variant) => (
              <motion.button
                key={variant.id}
                className={`${styles.designChip} ${selectedDesignVariant === variant.id ? styles.active : ''}`}
                onClick={() => handleDesignChange(variant.id)}
                disabled={isChangingDesign}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <div className={styles.chipDot} style={{ background: variant.color }} />
                {variant.name}
                {selectedDesignVariant === variant.id && <Check size={14} />}
              </motion.button>
            ))}
          </div>
        </div>
      )}

      {/* Split View: Editor + Preview */}
      <div className={styles.splitView}>
        {/* Text Editor */}
        <div className={styles.editorPanel}>
          <div className={styles.panelHeader}>
            <Edit3 size={16} />
            <span>Vertragstext bearbeiten</span>
          </div>
          <textarea
            className={styles.contractEditor}
            value={contractText}
            onChange={(e) => {
              setContractText(e.target.value);
              setPdfPreviewUrl(null);
              setSaved(false);
            }}
          />
        </div>

        {/* PDF Preview */}
        <div className={styles.previewPanel}>
          <div className={styles.panelHeader}>
            <Eye size={16} />
            <span>PDF-Vorschau</span>
            <button
              className={styles.refreshBtn}
              onClick={generatePDFPreview}
              disabled={isGeneratingPreview}
            >
              <RefreshCw size={14} className={isGeneratingPreview ? styles.spinning : ''} />
            </button>
          </div>
          <div className={styles.pdfContainer}>
            {isGeneratingPreview ? (
              <div className={styles.previewLoader}>
                <div className={styles.spinner} />
                <p>PDF wird geladen...</p>
              </div>
            ) : pdfPreviewUrl ? (
              <iframe
                src={pdfPreviewUrl}
                className={styles.pdfFrame}
                title="PDF Preview"
              />
            ) : (
              <div className={styles.previewPlaceholder}>
                <FileText size={48} />
                <p>PDF-Vorschau wird nach dem Speichern angezeigt</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );

  // Premium check
  if (userPlan === 'free') {
    return (
      <div className={styles.container}>
        <Helmet>
          <title>Vertrag erstellen | Contract AI</title>
        </Helmet>
        <UnifiedPremiumNotice
          featureName="Vertragsgenerator"
        />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Helmet>
        <title>Vertrag erstellen | Contract AI</title>
      </Helmet>

      {/* Background Decoration */}
      <div className={styles.bgDecoration}>
        <div className={styles.bgCircle1} />
        <div className={styles.bgCircle2} />
        <div className={styles.bgGrid} />
      </div>

      {/* Main Content */}
      <div className={styles.mainContent}>
        {/* Header */}
        <header className={styles.header}>
          <div className={styles.headerContent}>
            <div className={styles.logoSection}>
              <div className={styles.logo}>
                <Scale size={24} />
              </div>
              <div>
                <h1>Vertragsgenerator</h1>
                <span className={styles.badge}>
                  <Award size={12} /> Premium
                </span>
              </div>
            </div>

            {/* Step Indicator */}
            {renderStepIndicator()}
          </div>
        </header>

        {/* Step Content */}
        <main className={styles.main}>
          <AnimatePresence mode="wait">
            {currentStep === 1 && renderStep1()}
            {currentStep === 2 && renderStep2()}
            {currentStep === 3 && renderStep3()}
          </AnimatePresence>
        </main>

        {/* Footer Navigation */}
        <footer className={styles.footer}>
          <div className={styles.footerContent}>
            {currentStep > 1 && (
              <motion.button
                className={styles.navBtn}
                onClick={() => setCurrentStep(currentStep - 1)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <ArrowLeft size={18} />
                Zurück
              </motion.button>
            )}

            <div className={styles.footerSpacer} />

            {currentStep < 3 ? (
              <motion.button
                className={`${styles.navBtn} ${styles.navPrimary}`}
                onClick={() => {
                  if (currentStep === 2) {
                    handleGenerate();
                  } else {
                    setCurrentStep(currentStep + 1);
                  }
                }}
                disabled={!canProceed() || loading}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {loading ? (
                  <>
                    <RefreshCw size={18} className={styles.spinning} />
                    Generiere...
                  </>
                ) : currentStep === 2 ? (
                  <>
                    <Zap size={18} />
                    Vertrag generieren
                  </>
                ) : (
                  <>
                    Weiter
                    <ArrowRight size={18} />
                  </>
                )}
              </motion.button>
            ) : (
              <motion.button
                className={`${styles.navBtn} ${styles.navSuccess}`}
                onClick={() => navigate('/contracts')}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <CheckCircle size={18} />
                Zu meinen Verträgen
              </motion.button>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
};

export default Generate2;
