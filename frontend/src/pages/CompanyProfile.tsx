// Company Profile Page with Logo Upload
// v3.0 - Stripe-Level Design Redesign
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import {
  Building, Upload, X, Save, Camera,
  Phone, FileText, CreditCard,
  AlertCircle, ArrowLeft, Lock, Sparkles,
  ChevronDown, Check, Info
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
  icon: React.ReactNode;
  fields: (keyof CompanyProfileData)[];
  premiumOnly: boolean;
}

const SECTIONS: SectionConfig[] = [
  {
    id: 'logo',
    title: 'Firmenlogo',
    icon: <Camera size={20} />,
    fields: ['logoUrl'],
    premiumOnly: true
  },
  {
    id: 'company',
    title: 'Unternehmensdaten',
    icon: <Building size={20} />,
    fields: ['companyName', 'legalForm', 'street', 'postalCode', 'city', 'country'],
    premiumOnly: false
  },
  {
    id: 'legal',
    title: 'Rechts- & Steuerangaben',
    icon: <FileText size={20} />,
    fields: ['vatId', 'tradeRegister'],
    premiumOnly: true
  },
  {
    id: 'contact',
    title: 'Kontaktdaten',
    icon: <Phone size={20} />,
    fields: ['contactEmail', 'contactPhone'],
    premiumOnly: true
  },
  {
    id: 'banking',
    title: 'Bankverbindung',
    icon: <CreditCard size={20} />,
    fields: ['bankName', 'iban', 'bic'],
    premiumOnly: true
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

  // Collapsible sections state - all expanded by default
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    logo: true,
    company: true,
    legal: true,
    contact: true,
    banking: true
  });

  // Enterprise Check - Vollständiges Firmenprofil nur für Enterprise User
  const isPremium = user?.subscriptionPlan === 'enterprise';

  // Calculate completion percentage
  const completionData = useMemo(() => {
    const fields: { key: keyof CompanyProfileData; weight: number; premiumOnly: boolean }[] = [
      { key: 'companyName', weight: 15, premiumOnly: false },
      { key: 'logoUrl', weight: 10, premiumOnly: true },
      { key: 'legalForm', weight: 5, premiumOnly: true },
      { key: 'street', weight: 10, premiumOnly: true },
      { key: 'postalCode', weight: 5, premiumOnly: true },
      { key: 'city', weight: 10, premiumOnly: true },
      { key: 'vatId', weight: 10, premiumOnly: true },
      { key: 'tradeRegister', weight: 5, premiumOnly: true },
      { key: 'contactEmail', weight: 10, premiumOnly: true },
      { key: 'contactPhone', weight: 5, premiumOnly: true },
      { key: 'bankName', weight: 5, premiumOnly: true },
      { key: 'iban', weight: 5, premiumOnly: true },
      { key: 'bic', weight: 5, premiumOnly: true }
    ];

    let totalWeight = 0;
    let completedWeight = 0;

    fields.forEach(field => {
      // For non-premium users, only count companyName
      if (!isPremium && field.premiumOnly) return;

      totalWeight += field.weight;
      const value = profile[field.key];
      if (value && String(value).trim() !== '') {
        completedWeight += field.weight;
      }
    });

    const percentage = totalWeight > 0 ? Math.round((completedWeight / totalWeight) * 100) : 0;

    return { percentage, totalWeight, completedWeight };
  }, [profile, isPremium]);

  // Calculate section completion
  const getSectionCompletion = (section: SectionConfig): number => {
    if (!isPremium && section.premiumOnly) return 0;

    const filledFields = section.fields.filter(field => {
      if (field === 'logoUrl') return !!logoPreview;
      const value = profile[field];
      return value && String(value).trim() !== '';
    });

    return section.fields.length > 0
      ? Math.round((filledFields.length / section.fields.length) * 100)
      : 0;
  };

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

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
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
        setTimeout(() => setSaveSuccess(false), 2000);
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

  return (
    <>
      <Helmet>
        <title>Firmenprofil verwalten | Contract AI</title>
        <meta name="description" content="Verwalten Sie Ihr Firmenprofil für die automatische Vertragserstellung" />
      </Helmet>

      <div className={styles.cpPage}>
        {/* Hero Section with Completion Bar */}
        <motion.div
          className={styles.cpHero}
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className={styles.cpHeroInner}>
            <button
              className={styles.cpBackButton}
              onClick={() => navigate('/dashboard')}
            >
              <ArrowLeft size={16} />
              <span>Dashboard</span>
            </button>

            <div className={styles.cpHeroContent}>
              <h1 className={styles.cpTitle}>Firmenprofil</h1>
              <p className={styles.cpSubtitle}>
                Ihre Unternehmensdaten für automatische Vertragserstellung
              </p>
            </div>

            {/* Completion Bar */}
            <div className={styles.cpCompletionWrapper}>
              <div className={styles.cpCompletionHeader}>
                <span className={styles.cpCompletionLabel}>Profilvollständigkeit</span>
                <span className={styles.cpCompletionValue}>{completionData.percentage}%</span>
              </div>
              <div className={styles.cpCompletionBar}>
                <motion.div
                  className={styles.cpCompletionFill}
                  initial={{ width: 0 }}
                  animate={{ width: `${completionData.percentage}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                />
              </div>
              {completionData.percentage < 100 && (
                <p className={styles.cpCompletionHint}>
                  {completionData.percentage < 50
                    ? 'Fügen Sie weitere Daten hinzu für professionelle Verträge'
                    : 'Fast vollständig! Nur noch wenige Felder fehlen'}
                </p>
              )}
            </div>
          </div>
        </motion.div>

        {/* Main Content - Single Column */}
        <div className={styles.cpContainer}>
          <div className={styles.cpContent}>

            {/* Premium Hint - Subtle inline notice */}
            {!isPremium && (
              <motion.div
                className={styles.cpPremiumHint}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2 }}
              >
                <div className={styles.cpPremiumHintIcon}>
                  <Sparkles size={16} />
                </div>
                <div className={styles.cpPremiumHintText}>
                  <span>Vollständiges Profil mit Enterprise</span>
                  <p>Logo, Adresse, Steuerdaten & Bankverbindung freischalten</p>
                </div>
                <Link to="/pricing" className={styles.cpPremiumHintButton}>
                  Upgraden
                </Link>
              </motion.div>
            )}

            {/* Collapsible Sections */}
            {SECTIONS.map((section, index) => {
              const isExpanded = expandedSections[section.id];
              const sectionCompletion = getSectionCompletion(section);
              const isLocked = !isPremium && section.premiumOnly;

              // Skip logo section content display for non-premium
              if (section.id === 'logo' && !isPremium) {
                return (
                  <motion.div
                    key={section.id}
                    className={`${styles.cpSection} ${styles.cpSectionLocked}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.1 * index }}
                  >
                    <div className={styles.cpSectionHeader}>
                      <div className={styles.cpSectionHeaderLeft}>
                        <div className={styles.cpSectionIcon}>{section.icon}</div>
                        <div className={styles.cpSectionTitleGroup}>
                          <h3 className={styles.cpSectionTitle}>{section.title}</h3>
                        </div>
                      </div>
                      <div className={styles.cpSectionHeaderRight}>
                        <span className={styles.cpUpgradePill}>
                          <Lock size={12} />
                          Enterprise
                        </span>
                      </div>
                    </div>
                  </motion.div>
                );
              }

              return (
                <motion.div
                  key={section.id}
                  className={`${styles.cpSection} ${isLocked ? styles.cpSectionLocked : ''}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.1 * index }}
                >
                  <button
                    className={styles.cpSectionHeader}
                    onClick={() => !isLocked && toggleSection(section.id)}
                    disabled={isLocked}
                  >
                    <div className={styles.cpSectionHeaderLeft}>
                      <div className={styles.cpSectionIcon}>{section.icon}</div>
                      <div className={styles.cpSectionTitleGroup}>
                        <h3 className={styles.cpSectionTitle}>{section.title}</h3>
                        {!isLocked && sectionCompletion > 0 && (
                          <div className={styles.cpSectionProgress}>
                            <div
                              className={styles.cpSectionProgressFill}
                              style={{ width: `${sectionCompletion}%` }}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                    <div className={styles.cpSectionHeaderRight}>
                      {isLocked ? (
                        <span className={styles.cpUpgradePill}>
                          <Lock size={12} />
                          Enterprise
                        </span>
                      ) : (
                        <>
                          {sectionCompletion === 100 && (
                            <span className={styles.cpCompleteBadge}>
                              <Check size={14} />
                            </span>
                          )}
                          <motion.div
                            animate={{ rotate: isExpanded ? 180 : 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <ChevronDown size={20} className={styles.cpChevron} />
                          </motion.div>
                        </>
                      )}
                    </div>
                  </button>

                  <AnimatePresence initial={false}>
                    {isExpanded && !isLocked && (
                      <motion.div
                        className={styles.cpSectionContent}
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                      >
                        <div className={styles.cpSectionInner}>
                          {/* Logo Section */}
                          {section.id === 'logo' && (
                            <div className={styles.cpLogoArea}>
                              {logoPreview ? (
                                <div className={styles.cpLogoPreview}>
                                  <img src={logoPreview} alt="Firmenlogo" />
                                  <div className={styles.cpLogoActions}>
                                    <button
                                      className={styles.cpLogoBtn}
                                      onClick={() => fileInputRef.current?.click()}
                                      disabled={uploadingLogo}
                                    >
                                      <Upload size={14} />
                                      Ändern
                                    </button>
                                    <button
                                      className={`${styles.cpLogoBtn} ${styles.cpLogoBtnDanger}`}
                                      onClick={handleDeleteLogo}
                                    >
                                      <X size={14} />
                                      Entfernen
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div
                                  className={styles.cpLogoUpload}
                                  onClick={() => fileInputRef.current?.click()}
                                >
                                  {uploadingLogo ? (
                                    <div className={styles.cpLogoUploading}>
                                      <div className={styles.loadingSpinner}></div>
                                      <span>Wird hochgeladen...</span>
                                    </div>
                                  ) : (
                                    <>
                                      <Upload size={28} strokeWidth={1.5} />
                                      <span>Logo hochladen</span>
                                      <small>JPG, PNG, SVG oder WebP (max. 5MB)</small>
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
                              <div className={styles.cpInlineHint}>
                                <Info size={14} />
                                <span>Ihr Logo erscheint auf generierten Verträgen und Rechnungen</span>
                              </div>
                            </div>
                          )}

                          {/* Company Data Section */}
                          {section.id === 'company' && (
                            <div className={styles.cpFormGrid}>
                              <div className={styles.cpFormGroup}>
                                <label htmlFor="companyName">
                                  Firmenname
                                  <span className={styles.cpRequired}>*</span>
                                  {!isPremium && <span className={styles.cpFreeBadge}>Kostenlos</span>}
                                </label>
                                <input
                                  id="companyName"
                                  type="text"
                                  className={styles.cpInput}
                                  value={profile.companyName}
                                  onChange={(e) => handleInputChange('companyName', e.target.value)}
                                  placeholder="z.B. Muster GmbH"
                                />
                              </div>

                              <div className={`${styles.cpFormGroup} ${!isPremium ? styles.cpFieldLocked : ''}`}>
                                <label htmlFor="legalForm">
                                  Rechtsform
                                  {!isPremium && <Lock size={12} className={styles.cpLockIcon} />}
                                </label>
                                <select
                                  id="legalForm"
                                  className={styles.cpInput}
                                  value={profile.legalForm}
                                  onChange={(e) => handleInputChange('legalForm', e.target.value)}
                                  disabled={!isPremium}
                                >
                                  {LEGAL_FORMS.map(form => (
                                    <option key={form} value={form}>{form}</option>
                                  ))}
                                </select>
                              </div>

                              <div className={`${styles.cpFormGroup} ${styles.cpFormGroupFull} ${!isPremium ? styles.cpFieldLocked : ''}`}>
                                <label htmlFor="street">
                                  Straße & Hausnummer
                                  {isPremium && <span className={styles.cpRequired}>*</span>}
                                  {!isPremium && <Lock size={12} className={styles.cpLockIcon} />}
                                </label>
                                <input
                                  id="street"
                                  type="text"
                                  className={styles.cpInput}
                                  value={profile.street}
                                  onChange={(e) => handleInputChange('street', e.target.value)}
                                  placeholder={isPremium ? "z.B. Musterstraße 123" : "Enterprise-Feature"}
                                  disabled={!isPremium}
                                />
                              </div>

                              <div className={`${styles.cpFormGroup} ${!isPremium ? styles.cpFieldLocked : ''}`}>
                                <label htmlFor="postalCode">
                                  PLZ
                                  {isPremium && <span className={styles.cpRequired}>*</span>}
                                  {!isPremium && <Lock size={12} className={styles.cpLockIcon} />}
                                </label>
                                <input
                                  id="postalCode"
                                  type="text"
                                  className={styles.cpInput}
                                  value={profile.postalCode}
                                  onChange={(e) => handleInputChange('postalCode', e.target.value)}
                                  placeholder={isPremium ? "12345" : "Enterprise"}
                                  disabled={!isPremium}
                                />
                              </div>

                              <div className={`${styles.cpFormGroup} ${!isPremium ? styles.cpFieldLocked : ''}`}>
                                <label htmlFor="city">
                                  Stadt
                                  {isPremium && <span className={styles.cpRequired}>*</span>}
                                  {!isPremium && <Lock size={12} className={styles.cpLockIcon} />}
                                </label>
                                <input
                                  id="city"
                                  type="text"
                                  className={styles.cpInput}
                                  value={profile.city}
                                  onChange={(e) => handleInputChange('city', e.target.value)}
                                  placeholder={isPremium ? "z.B. Berlin" : "Enterprise"}
                                  disabled={!isPremium}
                                />
                              </div>

                              <div className={`${styles.cpFormGroup} ${!isPremium ? styles.cpFieldLocked : ''}`}>
                                <label htmlFor="country">
                                  Land
                                  {!isPremium && <Lock size={12} className={styles.cpLockIcon} />}
                                </label>
                                <select
                                  id="country"
                                  className={styles.cpInput}
                                  value={profile.country}
                                  onChange={(e) => handleInputChange('country', e.target.value)}
                                  disabled={!isPremium}
                                >
                                  {COUNTRIES.map(country => (
                                    <option key={country} value={country}>{country}</option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          )}

                          {/* Legal & Tax Section */}
                          {section.id === 'legal' && (
                            <div className={styles.cpFormGrid}>
                              <div className={styles.cpFormGroup}>
                                <label htmlFor="vatId">USt-IdNr.</label>
                                <input
                                  id="vatId"
                                  type="text"
                                  className={styles.cpInput}
                                  value={profile.vatId}
                                  onChange={(e) => handleInputChange('vatId', e.target.value)}
                                  placeholder="z.B. DE123456789"
                                />
                              </div>

                              <div className={styles.cpFormGroup}>
                                <label htmlFor="tradeRegister">Handelsregister</label>
                                <input
                                  id="tradeRegister"
                                  type="text"
                                  className={styles.cpInput}
                                  value={profile.tradeRegister}
                                  onChange={(e) => handleInputChange('tradeRegister', e.target.value)}
                                  placeholder="z.B. HRB 12345"
                                />
                              </div>

                              <div className={`${styles.cpInlineHint} ${styles.cpFormGroupFull}`}>
                                <Info size={14} />
                                <span>Diese Angaben werden für rechtskonforme Verträge benötigt</span>
                              </div>
                            </div>
                          )}

                          {/* Contact Section */}
                          {section.id === 'contact' && (
                            <div className={styles.cpFormGrid}>
                              <div className={styles.cpFormGroup}>
                                <label htmlFor="contactEmail">E-Mail</label>
                                <input
                                  id="contactEmail"
                                  type="email"
                                  className={styles.cpInput}
                                  value={profile.contactEmail}
                                  onChange={(e) => handleInputChange('contactEmail', e.target.value)}
                                  placeholder="info@firma.de"
                                />
                              </div>

                              <div className={styles.cpFormGroup}>
                                <label htmlFor="contactPhone">Telefon</label>
                                <input
                                  id="contactPhone"
                                  type="tel"
                                  className={styles.cpInput}
                                  value={profile.contactPhone}
                                  onChange={(e) => handleInputChange('contactPhone', e.target.value)}
                                  placeholder="+49 30 12345678"
                                />
                              </div>
                            </div>
                          )}

                          {/* Banking Section */}
                          {section.id === 'banking' && (
                            <div className={styles.cpFormGrid}>
                              <div className={`${styles.cpFormGroup} ${styles.cpFormGroupFull}`}>
                                <label htmlFor="bankName">Bank</label>
                                <input
                                  id="bankName"
                                  type="text"
                                  className={styles.cpInput}
                                  value={profile.bankName}
                                  onChange={(e) => handleInputChange('bankName', e.target.value)}
                                  placeholder="z.B. Deutsche Bank AG"
                                />
                              </div>

                              <div className={styles.cpFormGroup}>
                                <label htmlFor="iban">IBAN</label>
                                <input
                                  id="iban"
                                  type="text"
                                  className={styles.cpInput}
                                  value={profile.iban}
                                  onChange={(e) => handleInputChange('iban', e.target.value)}
                                  placeholder="DE89 3704 0044 0532 0130 00"
                                />
                              </div>

                              <div className={styles.cpFormGroup}>
                                <label htmlFor="bic">BIC</label>
                                <input
                                  id="bic"
                                  type="text"
                                  className={styles.cpInput}
                                  value={profile.bic}
                                  onChange={(e) => handleInputChange('bic', e.target.value)}
                                  placeholder="COBADEFFXXX"
                                />
                              </div>

                              <div className={`${styles.cpInlineHint} ${styles.cpFormGroupFull}`}>
                                <Info size={14} />
                                <span>Bankdaten erscheinen auf Rechnungen und in Zahlungsanweisungen</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Sticky Save Footer */}
        <AnimatePresence>
          {hasChanges && (
            <motion.div
              className={styles.cpStickyFooter}
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className={styles.cpStickyFooterInner}>
                <div className={styles.cpUnsavedNotice}>
                  <AlertCircle size={16} />
                  <span>Ungespeicherte Änderungen</span>
                </div>
                <div className={styles.cpStickyFooterActions}>
                  <button
                    className={styles.cpCancelBtn}
                    onClick={() => {
                      setProfile(originalProfile);
                      if (originalProfile.logoUrl) {
                        setLogoPreview(originalProfile.logoUrl);
                      }
                    }}
                  >
                    Verwerfen
                  </button>
                  <motion.button
                    className={`${styles.cpSaveBtn} ${saveSuccess ? styles.cpSaveBtnSuccess : ''}`}
                    onClick={handleSave}
                    disabled={saving}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {saving ? (
                      <>
                        <div className={styles.loadingSpinnerSmall}></div>
                        <span>Speichert...</span>
                      </>
                    ) : saveSuccess ? (
                      <>
                        <Check size={16} />
                        <span>Gespeichert!</span>
                      </>
                    ) : (
                      <>
                        <Save size={16} />
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
