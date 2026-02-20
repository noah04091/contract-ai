// Company Profile Page with Logo Upload
// v4.0 - Stripe-Level Premium Design
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import {
  Building2, Upload, X, Save, Camera,
  Phone, CreditCard, MapPin,
  AlertCircle, ArrowLeft, Lock, Sparkles,
  ChevronRight, Check, Info, Shield, Zap,
  Globe, CheckCircle2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import styles from '../styles/CompanyProfile.module.css';

interface CompanyProfileData {
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

const INITIAL_PROFILE: CompanyProfileData = {
  companyName: '',
  legalForm: 'GmbH',
  street: '',
  postalCode: '',
  city: '',
  country: 'Deutschland',
  vatId: '',
  tradeRegister: '',
  contactEmail: '',
  contactPhone: '',
  bankName: '',
  iban: '',
  bic: ''
};

const LEGAL_FORMS = [
  'GmbH', 'AG', 'UG', 'KG', 'OHG', 'Einzelunternehmen',
  'GbR', 'eK', 'Freiberufler', 'Sonstige'
];

const COUNTRIES = [
  'Deutschland', 'Österreich', 'Schweiz', 'Niederlande',
  'Belgien', 'Frankreich', 'Italien', 'Spanien'
];

// Section configuration
interface SectionConfig {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  fields: (keyof CompanyProfileData)[];
  premiumOnly: boolean;
  gradient: string;
}

const SECTIONS: SectionConfig[] = [
  {
    id: 'logo',
    title: 'Firmenlogo',
    subtitle: 'Ihr visuelles Markenzeichen',
    icon: <Camera size={22} strokeWidth={1.5} />,
    fields: ['logoUrl'],
    premiumOnly: true,
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
  },
  {
    id: 'company',
    title: 'Unternehmensdaten',
    subtitle: 'Grundlegende Firmendaten',
    icon: <Building2 size={22} strokeWidth={1.5} />,
    fields: ['companyName', 'legalForm', 'street', 'postalCode', 'city', 'country'],
    premiumOnly: false,
    gradient: 'linear-gradient(135deg, #0066ff 0%, #00d4ff 100%)'
  },
  {
    id: 'legal',
    title: 'Rechts- & Steuerangaben',
    subtitle: 'Gesetzlich erforderliche Daten',
    icon: <Shield size={22} strokeWidth={1.5} />,
    fields: ['vatId', 'tradeRegister'],
    premiumOnly: true,
    gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
  },
  {
    id: 'contact',
    title: 'Kontaktdaten',
    subtitle: 'Erreichbarkeit für Vertragspartner',
    icon: <Phone size={22} strokeWidth={1.5} />,
    fields: ['contactEmail', 'contactPhone'],
    premiumOnly: true,
    gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'
  },
  {
    id: 'banking',
    title: 'Bankverbindung',
    subtitle: 'Zahlungsdaten für Rechnungen',
    icon: <CreditCard size={22} strokeWidth={1.5} />,
    fields: ['bankName', 'iban', 'bic'],
    premiumOnly: true,
    gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)'
  }
];

export default function CompanyProfile() {
  const { user, isLoading, refetchUser } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<CompanyProfileData>(INITIAL_PROFILE);
  const [originalProfile, setOriginalProfile] = useState<CompanyProfileData>(INITIAL_PROFILE);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>('company');

  // Enterprise Check
  const isPremium = user?.subscriptionPlan === 'enterprise';

  // Calculate completion data
  const completionData = useMemo(() => {
    const sections = SECTIONS.map(section => {
      if (!isPremium && section.premiumOnly) {
        return { ...section, completion: 0, isLocked: true };
      }

      const filledFields = section.fields.filter(field => {
        if (field === 'logoUrl') return !!logoPreview;
        const value = profile[field];
        return value && String(value).trim() !== '';
      });

      const completion = section.fields.length > 0
        ? Math.round((filledFields.length / section.fields.length) * 100)
        : 0;

      return { ...section, completion, isLocked: false };
    });

    const completedSections = sections.filter(s => s.completion === 100 && !s.isLocked).length;
    const totalSections = sections.filter(s => !s.isLocked).length;
    const overallPercentage = totalSections > 0
      ? Math.round((completedSections / totalSections) * 100)
      : 0;

    return { sections, completedSections, totalSections, overallPercentage };
  }, [profile, logoPreview, isPremium]);

  // Load existing profile
  useEffect(() => {
    if (!user || isLoading) return;
    loadProfile();
  }, [user, isLoading]);

  // Check for changes
  useEffect(() => {
    const hasProfileChanges = JSON.stringify(profile) !== JSON.stringify(originalProfile);
    setHasChanges(hasProfileChanges);
  }, [profile, originalProfile]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/company-profile/me', {
        credentials: 'include'
      });

      const data = await response.json();

      if (data.success && data.profile) {
        setProfile(data.profile);
        setOriginalProfile(data.profile);
        if (data.profile.logoUrl) {
          setLogoPreview(data.profile.logoUrl);
        }
      }
    } catch (error) {
      console.error('Fehler beim Laden des Profils:', error);
      toast.error('Fehler beim Laden des Profils');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof CompanyProfileData, value: string) => {
    setProfile(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!profile.companyName) {
      toast.error('Bitte geben Sie einen Firmennamen ein');
      return;
    }

    if (isPremium && (!profile.street || !profile.postalCode || !profile.city)) {
      toast.error('Bitte füllen Sie alle Pflichtfelder aus');
      return;
    }

    try {
      setSaving(true);
      const endpoint = isPremium ? '/api/company-profile' : '/api/company-profile/basic';

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(profile)
      });

      const data = await response.json();

      if (data.success) {
        setOriginalProfile(profile);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2500);
        toast.success('Firmenprofil erfolgreich gespeichert!');
        await refetchUser();
      } else {
        throw new Error(data.message || 'Fehler beim Speichern');
      }
    } catch (error) {
      console.error('Speichern fehlgeschlagen:', error);
      toast.error('Fehler beim Speichern des Profils');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (file: File) => {
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/svg+xml', 'image/webp'].includes(file.type)) {
      toast.error('Nur JPG, PNG, SVG und WebP Dateien sind erlaubt');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Datei ist zu groß (max. 5MB)');
      return;
    }

    try {
      setUploadingLogo(true);
      const formData = new FormData();
      formData.append('logo', file);

      const response = await fetch('/api/company-profile/logo', {
        method: 'POST',
        credentials: 'include',
        body: formData
      });

      const data = await response.json();

      if (data.success) {
        setLogoPreview(data.logoUrl);
        setProfile(prev => ({ ...prev, logoUrl: data.logoUrl, logoKey: data.logoKey }));
        toast.success('Logo erfolgreich hochgeladen!');
        setTimeout(() => loadProfile(), 500);
      } else {
        throw new Error(data.message || 'Upload fehlgeschlagen');
      }
    } catch (error) {
      console.error('Logo-Upload fehlgeschlagen:', error);
      toast.error('Fehler beim Hochladen des Logos');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleDeleteLogo = async () => {
    try {
      const response = await fetch('/api/company-profile/logo', {
        method: 'DELETE',
        credentials: 'include'
      });

      const data = await response.json();

      if (data.success) {
        setLogoPreview(null);
        setProfile(prev => ({ ...prev, logoUrl: '', logoKey: '' }));
        toast.success('Logo erfolgreich gelöscht');
      }
    } catch (error) {
      console.error('Logo-Löschung fehlgeschlagen:', error);
      toast.error('Fehler beim Löschen des Logos');
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleLogoUpload(file);
    }
  };

  if (isLoading || loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingContent}>
          <div className={styles.loadingSpinner}></div>
          <p>Lade Firmenprofil...</p>
        </div>
      </div>
    );
  }

  const renderSectionContent = (section: SectionConfig) => {
    const sectionData = completionData.sections.find(s => s.id === section.id);
    const isLocked = sectionData?.isLocked;

    if (isLocked) {
      return (
        <div className={styles.lockedOverlay}>
          <div className={styles.lockedContent}>
            <div className={styles.lockedIconWrapper}>
              <Lock size={24} />
            </div>
            <h4>Enterprise Feature</h4>
            <p>Schalten Sie alle Profilfelder frei für professionelle Verträge</p>
            <Link to="/pricing" className={styles.upgradeBtn}>
              <Sparkles size={16} />
              Jetzt freischalten
            </Link>
          </div>
        </div>
      );
    }

    switch (section.id) {
      case 'logo':
        return (
          <div className={styles.logoSection}>
            {logoPreview ? (
              <div className={styles.logoDisplay}>
                <div className={styles.logoImageWrapper}>
                  <img src={logoPreview} alt="Firmenlogo" />
                </div>
                <div className={styles.logoMeta}>
                  <span className={styles.logoStatus}>
                    <CheckCircle2 size={14} />
                    Logo hochgeladen
                  </span>
                  <div className={styles.logoActions}>
                    <button
                      className={styles.logoBtn}
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingLogo}
                    >
                      <Upload size={14} />
                      Ändern
                    </button>
                    <button
                      className={`${styles.logoBtn} ${styles.logoBtnDanger}`}
                      onClick={handleDeleteLogo}
                    >
                      <X size={14} />
                      Entfernen
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div
                className={styles.logoDropzone}
                onClick={() => fileInputRef.current?.click()}
              >
                {uploadingLogo ? (
                  <div className={styles.uploadingState}>
                    <div className={styles.loadingSpinner}></div>
                    <span>Wird hochgeladen...</span>
                  </div>
                ) : (
                  <>
                    <div className={styles.dropzoneIcon}>
                      <Camera size={32} strokeWidth={1.5} />
                    </div>
                    <h4>Logo hochladen</h4>
                    <p>Ziehen Sie ein Bild hierher oder klicken Sie zum Auswählen</p>
                    <span className={styles.dropzoneFormats}>PNG, JPG, SVG oder WebP bis 5MB</span>
                  </>
                )}
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/svg+xml,image/webp"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
          </div>
        );

      case 'company':
        return (
          <div className={styles.formSection}>
            <div className={styles.formRow}>
              <div className={styles.formField}>
                <label>
                  Firmenname
                  <span className={styles.required}>*</span>
                  {!isPremium && <span className={styles.freeTag}>Kostenlos</span>}
                </label>
                <input
                  type="text"
                  value={profile.companyName}
                  onChange={(e) => handleInputChange('companyName', e.target.value)}
                  placeholder="Ihre Firma GmbH"
                  className={styles.input}
                />
              </div>
              <div className={`${styles.formField} ${!isPremium ? styles.fieldLocked : ''}`}>
                <label>
                  Rechtsform
                  {!isPremium && <Lock size={12} className={styles.lockIcon} />}
                </label>
                <select
                  value={profile.legalForm}
                  onChange={(e) => handleInputChange('legalForm', e.target.value)}
                  disabled={!isPremium}
                  className={styles.select}
                >
                  {LEGAL_FORMS.map(form => (
                    <option key={form} value={form}>{form}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className={`${styles.formField} ${styles.fullWidth} ${!isPremium ? styles.fieldLocked : ''}`}>
              <label>
                <MapPin size={14} />
                Straße & Hausnummer
                {isPremium && <span className={styles.required}>*</span>}
                {!isPremium && <Lock size={12} className={styles.lockIcon} />}
              </label>
              <input
                type="text"
                value={profile.street}
                onChange={(e) => handleInputChange('street', e.target.value)}
                placeholder={isPremium ? "Musterstraße 123" : "Enterprise-Feature"}
                disabled={!isPremium}
                className={styles.input}
              />
            </div>

            <div className={styles.formRow}>
              <div className={`${styles.formField} ${styles.small} ${!isPremium ? styles.fieldLocked : ''}`}>
                <label>
                  PLZ
                  {isPremium && <span className={styles.required}>*</span>}
                  {!isPremium && <Lock size={12} className={styles.lockIcon} />}
                </label>
                <input
                  type="text"
                  value={profile.postalCode}
                  onChange={(e) => handleInputChange('postalCode', e.target.value)}
                  placeholder={isPremium ? "12345" : "—"}
                  disabled={!isPremium}
                  className={styles.input}
                />
              </div>
              <div className={`${styles.formField} ${!isPremium ? styles.fieldLocked : ''}`}>
                <label>
                  Stadt
                  {isPremium && <span className={styles.required}>*</span>}
                  {!isPremium && <Lock size={12} className={styles.lockIcon} />}
                </label>
                <input
                  type="text"
                  value={profile.city}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                  placeholder={isPremium ? "Berlin" : "Enterprise"}
                  disabled={!isPremium}
                  className={styles.input}
                />
              </div>
              <div className={`${styles.formField} ${!isPremium ? styles.fieldLocked : ''}`}>
                <label>
                  <Globe size={14} />
                  Land
                  {!isPremium && <Lock size={12} className={styles.lockIcon} />}
                </label>
                <select
                  value={profile.country}
                  onChange={(e) => handleInputChange('country', e.target.value)}
                  disabled={!isPremium}
                  className={styles.select}
                >
                  {COUNTRIES.map(country => (
                    <option key={country} value={country}>{country}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        );

      case 'legal':
        return (
          <div className={styles.formSection}>
            <div className={styles.formRow}>
              <div className={styles.formField}>
                <label>USt-IdNr.</label>
                <input
                  type="text"
                  value={profile.vatId}
                  onChange={(e) => handleInputChange('vatId', e.target.value)}
                  placeholder="DE123456789"
                  className={styles.input}
                />
                <span className={styles.fieldHint}>Umsatzsteuer-Identifikationsnummer</span>
              </div>
              <div className={styles.formField}>
                <label>Handelsregister</label>
                <input
                  type="text"
                  value={profile.tradeRegister}
                  onChange={(e) => handleInputChange('tradeRegister', e.target.value)}
                  placeholder="HRB 12345, Amtsgericht Berlin"
                  className={styles.input}
                />
                <span className={styles.fieldHint}>Registernummer & Registergericht</span>
              </div>
            </div>
          </div>
        );

      case 'contact':
        return (
          <div className={styles.formSection}>
            <div className={styles.formRow}>
              <div className={styles.formField}>
                <label>Geschäftliche E-Mail</label>
                <input
                  type="email"
                  value={profile.contactEmail}
                  onChange={(e) => handleInputChange('contactEmail', e.target.value)}
                  placeholder="info@ihrefirma.de"
                  className={styles.input}
                />
              </div>
              <div className={styles.formField}>
                <label>Telefon</label>
                <input
                  type="tel"
                  value={profile.contactPhone}
                  onChange={(e) => handleInputChange('contactPhone', e.target.value)}
                  placeholder="+49 30 12345678"
                  className={styles.input}
                />
              </div>
            </div>
          </div>
        );

      case 'banking':
        return (
          <div className={styles.formSection}>
            <div className={styles.formField}>
              <label>Kreditinstitut</label>
              <input
                type="text"
                value={profile.bankName}
                onChange={(e) => handleInputChange('bankName', e.target.value)}
                placeholder="Deutsche Bank AG"
                className={styles.input}
              />
            </div>
            <div className={styles.formRow}>
              <div className={`${styles.formField} ${styles.large}`}>
                <label>IBAN</label>
                <input
                  type="text"
                  value={profile.iban}
                  onChange={(e) => handleInputChange('iban', e.target.value)}
                  placeholder="DE89 3704 0044 0532 0130 00"
                  className={styles.input}
                />
              </div>
              <div className={styles.formField}>
                <label>BIC / SWIFT</label>
                <input
                  type="text"
                  value={profile.bic}
                  onChange={(e) => handleInputChange('bic', e.target.value)}
                  placeholder="COBADEFFXXX"
                  className={styles.input}
                />
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <>
      <Helmet>
        <title>Firmenprofil | Contract AI</title>
        <meta name="description" content="Verwalten Sie Ihr Firmenprofil für die automatische Vertragserstellung" />
      </Helmet>

      <div className={styles.page}>
        {/* Background Effects */}
        <div className={styles.bgGradient}></div>
        <div className={styles.bgPattern}></div>

        {/* Main Content */}
        <div className={styles.container}>
          {/* Header */}
          <motion.header
            className={styles.header}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <button
              className={styles.backBtn}
              onClick={() => navigate('/dashboard')}
            >
              <ArrowLeft size={18} />
              <span>Dashboard</span>
            </button>

            <div className={styles.headerContent}>
              <div className={styles.headerLeft}>
                <div className={styles.headerIcon}>
                  <Building2 size={28} strokeWidth={1.5} />
                </div>
                <div className={styles.headerText}>
                  <h1>Firmenprofil</h1>
                  <p>Verwalten Sie Ihre Unternehmensdaten für automatische Vertragserstellung</p>
                </div>
              </div>

              {/* Progress Ring */}
              <div className={styles.progressRing}>
                <svg viewBox="0 0 100 100">
                  <circle
                    className={styles.progressBg}
                    cx="50"
                    cy="50"
                    r="42"
                    fill="none"
                    strokeWidth="8"
                  />
                  <motion.circle
                    className={styles.progressFill}
                    cx="50"
                    cy="50"
                    r="42"
                    fill="none"
                    strokeWidth="8"
                    strokeLinecap="round"
                    initial={{ strokeDasharray: '0 264' }}
                    animate={{
                      strokeDasharray: `${(completionData.overallPercentage / 100) * 264} 264`
                    }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                  />
                </svg>
                <div className={styles.progressText}>
                  <span className={styles.progressValue}>{completionData.completedSections}</span>
                  <span className={styles.progressLabel}>/{completionData.totalSections}</span>
                </div>
              </div>
            </div>
          </motion.header>

          {/* Main Grid */}
          <div className={styles.mainGrid}>
            {/* Sidebar Navigation */}
            <motion.aside
              className={styles.sidebar}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <nav className={styles.sidebarNav}>
                {SECTIONS.map((section, index) => {
                  const sectionData = completionData.sections.find(s => s.id === section.id);
                  const isActive = activeSection === section.id;
                  const isComplete = sectionData?.completion === 100;
                  const isLocked = sectionData?.isLocked;

                  return (
                    <motion.button
                      key={section.id}
                      className={`${styles.navItem} ${isActive ? styles.navItemActive : ''} ${isLocked ? styles.navItemLocked : ''}`}
                      onClick={() => !isLocked && setActiveSection(section.id)}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: 0.1 + index * 0.05 }}
                    >
                      <div
                        className={styles.navItemIcon}
                        style={{ background: isLocked ? '#94a3b8' : section.gradient }}
                      >
                        {section.icon}
                      </div>
                      <div className={styles.navItemText}>
                        <span className={styles.navItemTitle}>{section.title}</span>
                        <span className={styles.navItemSubtitle}>
                          {isLocked ? 'Enterprise' : isComplete ? 'Vollständig' : section.subtitle}
                        </span>
                      </div>
                      <div className={styles.navItemStatus}>
                        {isLocked ? (
                          <Lock size={14} />
                        ) : isComplete ? (
                          <CheckCircle2 size={18} className={styles.checkIcon} />
                        ) : (
                          <ChevronRight size={18} />
                        )}
                      </div>
                    </motion.button>
                  );
                })}
              </nav>

              {/* Upgrade Card for Free Users */}
              {!isPremium && (
                <motion.div
                  className={styles.upgradeCard}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.4 }}
                >
                  <div className={styles.upgradeCardGlow}></div>
                  <div className={styles.upgradeCardContent}>
                    <div className={styles.upgradeCardIcon}>
                      <Zap size={20} />
                    </div>
                    <h4>Vollzugriff freischalten</h4>
                    <p>Logo, Steuerdaten, Bankverbindung und mehr für professionelle Verträge</p>
                    <Link to="/pricing" className={styles.upgradeCardBtn}>
                      Enterprise ansehen
                      <ChevronRight size={16} />
                    </Link>
                  </div>
                </motion.div>
              )}
            </motion.aside>

            {/* Content Area */}
            <motion.main
              className={styles.content}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <AnimatePresence mode="wait">
                {SECTIONS.filter(s => s.id === activeSection).map(section => {
                  const sectionData = completionData.sections.find(s => s.id === section.id);

                  return (
                    <motion.div
                      key={section.id}
                      className={styles.card}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className={styles.cardHeader}>
                        <div
                          className={styles.cardHeaderIcon}
                          style={{ background: section.gradient }}
                        >
                          {section.icon}
                        </div>
                        <div className={styles.cardHeaderText}>
                          <h2>{section.title}</h2>
                          <p>{section.subtitle}</p>
                        </div>
                        {!sectionData?.isLocked && (
                          <div className={styles.cardHeaderBadge}>
                            {sectionData?.completion === 100 ? (
                              <span className={styles.completeBadge}>
                                <Check size={14} />
                                Vollständig
                              </span>
                            ) : (
                              <span className={styles.progressBadge}>
                                {sectionData?.completion}%
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      <div className={styles.cardContent}>
                        {renderSectionContent(section)}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {/* Tips Card */}
              {activeSection && !completionData.sections.find(s => s.id === activeSection)?.isLocked && (
                <motion.div
                  className={styles.tipsCard}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3, delay: 0.3 }}
                >
                  <Info size={18} />
                  <div className={styles.tipsContent}>
                    <strong>Tipp:</strong>
                    {activeSection === 'logo' && ' Ein professionelles Logo stärkt Ihre Markenidentität in Verträgen.'}
                    {activeSection === 'company' && ' Vollständige Firmendaten sorgen für rechtssichere Verträge.'}
                    {activeSection === 'legal' && ' Die USt-IdNr. ist für B2B-Geschäfte in der EU erforderlich.'}
                    {activeSection === 'contact' && ' Kontaktdaten ermöglichen schnelle Kommunikation bei Vertragsthemen.'}
                    {activeSection === 'banking' && ' Bankdaten erscheinen automatisch auf generierten Rechnungen.'}
                  </div>
                </motion.div>
              )}
            </motion.main>
          </div>
        </div>

        {/* Sticky Save Bar */}
        <AnimatePresence>
          {hasChanges && (
            <motion.div
              className={styles.saveBar}
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            >
              <div className={styles.saveBarInner}>
                <div className={styles.saveBarLeft}>
                  <div className={styles.saveBarPulse}></div>
                  <AlertCircle size={18} />
                  <span>Ungespeicherte Änderungen</span>
                </div>
                <div className={styles.saveBarActions}>
                  <button
                    className={styles.discardBtn}
                    onClick={() => {
                      setProfile(originalProfile);
                      if (originalProfile.logoUrl) {
                        setLogoPreview(originalProfile.logoUrl);
                      } else {
                        setLogoPreview(null);
                      }
                    }}
                  >
                    Verwerfen
                  </button>
                  <motion.button
                    className={`${styles.saveBtn} ${saveSuccess ? styles.saveBtnSuccess : ''}`}
                    onClick={handleSave}
                    disabled={saving}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {saving ? (
                      <>
                        <div className={styles.btnSpinner}></div>
                        <span>Speichert...</span>
                      </>
                    ) : saveSuccess ? (
                      <>
                        <Check size={18} />
                        <span>Gespeichert!</span>
                      </>
                    ) : (
                      <>
                        <Save size={18} />
                        <span>Änderungen speichern</span>
                      </>
                    )}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
