// Company Profile Page with Logo Upload
// v2.0 - Freemium Model: Firmenname für alle, Rest Premium
import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import {
  Building, Upload, X, Save, Eye, Camera,
  Phone, FileText, CreditCard, Globe,
  AlertCircle, ArrowLeft, Lock, Sparkles, Crown
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

export default function CompanyProfile() {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<CompanyProfileData>(INITIAL_PROFILE);
  const [originalProfile, setOriginalProfile] = useState<CompanyProfileData>(INITIAL_PROFILE);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  // 🔐 Premium Check - Erweiterte Features nur für Premium/Business/Enterprise
  const isPremium = user?.subscriptionPlan === 'premium' ||
                    user?.subscriptionPlan === 'business' ||
                    user?.subscriptionPlan === 'enterprise';

  // Load existing profile - auch für Free User
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
      console.log('📥 Profil-Daten empfangen:', data);
      
      if (data.success && data.profile) {
        setProfile(data.profile);
        setOriginalProfile(data.profile);
        if (data.profile.logoUrl) {
          console.log('🖼️ Logo-URL gefunden:', data.profile.logoUrl);
          setLogoPreview(data.profile.logoUrl);
        } else if (data.profile.logoKey) {
          console.log('🔑 Logo-Key vorhanden, aber keine URL:', data.profile.logoKey);
        } else {
          console.log('❌ Kein Logo im Profil');
        }
      }
    } catch (error) {
      console.error('❌ Fehler beim Laden des Profils:', error);
      toast.error('Fehler beim Laden des Profils');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof CompanyProfileData, value: string) => {
    setProfile(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    // Free User: Nur Firmenname erforderlich
    // Premium User: Alle Pflichtfelder
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
      const response = await fetch('/api/company-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(profile)
      });

      const data = await response.json();
      
      if (data.success) {
        setOriginalProfile(profile);
        toast.success('✅ Firmenprofil erfolgreich gespeichert!');
      } else {
        throw new Error(data.message || 'Fehler beim Speichern');
      }
    } catch (error) {
      console.error('❌ Speichern fehlgeschlagen:', error);
      toast.error('Fehler beim Speichern des Profils');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (file: File) => {
    if (!file) return;

    // File validation
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
        toast.success('✅ Logo erfolgreich hochgeladen!');
        
        // Profil neu laden um sicherzustellen, dass alles korrekt ist
        setTimeout(() => {
          loadProfile();
        }, 500);
      } else {
        throw new Error(data.message || 'Upload fehlgeschlagen');
      }
    } catch (error) {
      console.error('❌ Logo-Upload fehlgeschlagen:', error);
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
      console.error('❌ Logo-Löschung fehlgeschlagen:', error);
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

      <div className={styles.companyProfilePage}>
        <motion.header
          className={styles.header}
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className={styles.headerContent}>
            <button 
              className={styles.backButton}
              onClick={() => navigate('/dashboard')}
            >
              <ArrowLeft size={16} />
              Zurück zum Dashboard
            </button>
            
            <div className={styles.headerText}>
              <h1>
                <Building size={28} />
                Firmenprofil
              </h1>
              <p>Verwalten Sie Ihre Firmendaten für die automatische Vertragserstellung</p>
            </div>
          </div>
        </motion.header>

        <div className={styles.profileContainer}>
          {/* Premium Upgrade Banner für Free User */}
          {!isPremium && (
            <motion.div
              className={styles.upgradeBanner}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <div className={styles.upgradeBannerContent}>
                <div className={styles.upgradeBannerIcon}>
                  <Crown size={24} />
                </div>
                <div className={styles.upgradeBannerText}>
                  <h3>Vollständiges Firmenprofil freischalten</h3>
                  <p>
                    Mit Premium kannst du alle Firmendaten speichern für die automatische Vertragserstellung,
                    inklusive Logo, Adresse, Steuerdaten und Bankverbindung.
                  </p>
                </div>
                <Link to="/pricing" className={styles.upgradeBannerButton}>
                  <Sparkles size={16} />
                  Jetzt upgraden
                </Link>
              </div>
            </motion.div>
          )}

          <motion.div
            className={styles.profileCard}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            {/* Logo Section - Premium Only */}
            <div className={`${styles.formSection} ${!isPremium ? styles.lockedSection : ''}`}>
              <h3>
                <Camera size={20} />
                Firmenlogo
                {!isPremium && <span className={styles.premiumBadge}><Lock size={12} /> Premium</span>}
              </h3>

              {isPremium ? (
                <>
                  <div className={styles.logoContainer}>
                    {logoPreview ? (
                      <div className={styles.logoPreview}>
                        <img
                          src={logoPreview}
                          alt="Firmenlogo"
                          onError={(e) => {
                            console.error('❌ Logo konnte nicht geladen werden:', logoPreview);
                            console.error('Error:', e);
                          }}
                          onLoad={() => {
                            console.log('✅ Logo erfolgreich geladen:', logoPreview);
                          }}
                          style={{
                            display: 'block',
                            maxWidth: '100%',
                            height: 'auto'
                          }}
                        />
                        <div className={styles.logoActions}>
                          <button
                            className={styles.logoActionButton}
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploadingLogo}
                          >
                            <Upload size={16} />
                            Ändern
                          </button>
                          <button
                            className={`${styles.logoActionButton} ${styles.danger}`}
                            onClick={handleDeleteLogo}
                          >
                            <X size={16} />
                            Entfernen
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div
                        className={styles.logoUpload}
                        onClick={() => fileInputRef.current?.click()}
                      >
                        {uploadingLogo ? (
                          <div className={styles.uploadingState}>
                            <div className={styles.loadingSpinner}></div>
                            <span>Wird hochgeladen...</span>
                          </div>
                        ) : (
                          <div className={styles.uploadPrompt}>
                            <Upload size={32} />
                            <span>Logo hochladen</span>
                            <small>JPG, PNG, SVG oder WebP (max. 5MB)</small>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/svg+xml,image/webp"
                    onChange={handleFileSelect}
                    style={{ display: 'none' }}
                  />
                </>
              ) : (
                <div className={styles.lockedContent}>
                  <div className={styles.lockedPlaceholder}>
                    <Lock size={24} />
                    <span>Logo-Upload mit Premium freischalten</span>
                  </div>
                </div>
              )}
            </div>

            {/* Company Information - Firmenname FREE, Rest Premium */}
            <div className={styles.formSection}>
              <h3>
                <Building size={20} />
                Unternehmensdaten
              </h3>

              <div className={styles.formGrid}>
                {/* Firmenname - IMMER FREI */}
                <div className={styles.formGroup}>
                  <label htmlFor="companyName">
                    Firmenname *
                    {!isPremium && <span className={styles.freeBadge}>Kostenlos</span>}
                  </label>
                  <input
                    id="companyName"
                    type="text"
                    value={profile.companyName}
                    onChange={(e) => handleInputChange('companyName', e.target.value)}
                    placeholder="z.B. Muster GmbH"
                    required
                  />
                </div>

                {/* Rechtsform - Premium */}
                <div className={`${styles.formGroup} ${!isPremium ? styles.lockedField : ''}`}>
                  <label htmlFor="legalForm">
                    Rechtsform
                    {!isPremium && <Lock size={12} className={styles.lockIcon} />}
                  </label>
                  <select
                    id="legalForm"
                    value={profile.legalForm}
                    onChange={(e) => handleInputChange('legalForm', e.target.value)}
                    disabled={!isPremium}
                  >
                    {LEGAL_FORMS.map(form => (
                      <option key={form} value={form}>{form}</option>
                    ))}
                  </select>
                </div>

                {/* Straße - Premium */}
                <div className={`${styles.formGroup} ${styles.spanning} ${!isPremium ? styles.lockedField : ''}`}>
                  <label htmlFor="street">
                    Straße & Hausnummer {isPremium && '*'}
                    {!isPremium && <Lock size={12} className={styles.lockIcon} />}
                  </label>
                  <input
                    id="street"
                    type="text"
                    value={profile.street}
                    onChange={(e) => handleInputChange('street', e.target.value)}
                    placeholder={isPremium ? "z.B. Musterstraße 123" : "Premium-Feature"}
                    required={isPremium}
                    disabled={!isPremium}
                  />
                </div>

                {/* PLZ - Premium */}
                <div className={`${styles.formGroup} ${!isPremium ? styles.lockedField : ''}`}>
                  <label htmlFor="postalCode">
                    PLZ {isPremium && '*'}
                    {!isPremium && <Lock size={12} className={styles.lockIcon} />}
                  </label>
                  <input
                    id="postalCode"
                    type="text"
                    value={profile.postalCode}
                    onChange={(e) => handleInputChange('postalCode', e.target.value)}
                    placeholder={isPremium ? "12345" : "Premium"}
                    required={isPremium}
                    disabled={!isPremium}
                  />
                </div>

                {/* Stadt - Premium */}
                <div className={`${styles.formGroup} ${!isPremium ? styles.lockedField : ''}`}>
                  <label htmlFor="city">
                    Stadt {isPremium && '*'}
                    {!isPremium && <Lock size={12} className={styles.lockIcon} />}
                  </label>
                  <input
                    id="city"
                    type="text"
                    value={profile.city}
                    onChange={(e) => handleInputChange('city', e.target.value)}
                    placeholder={isPremium ? "z.B. Berlin" : "Premium"}
                    required={isPremium}
                    disabled={!isPremium}
                  />
                </div>

                {/* Land - Premium */}
                <div className={`${styles.formGroup} ${!isPremium ? styles.lockedField : ''}`}>
                  <label htmlFor="country">
                    Land
                    {!isPremium && <Lock size={12} className={styles.lockIcon} />}
                  </label>
                  <select
                    id="country"
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
            </div>

            {/* Legal & Tax Information - Premium Only */}
            <div className={`${styles.formSection} ${!isPremium ? styles.lockedSection : ''}`}>
              <h3>
                <FileText size={20} />
                Rechts- & Steuerangaben
                {!isPremium && <span className={styles.premiumBadge}><Lock size={12} /> Premium</span>}
              </h3>

              <div className={styles.formGrid}>
                <div className={`${styles.formGroup} ${!isPremium ? styles.lockedField : ''}`}>
                  <label htmlFor="vatId">
                    USt-IdNr.
                    {!isPremium && <Lock size={12} className={styles.lockIcon} />}
                  </label>
                  <input
                    id="vatId"
                    type="text"
                    value={profile.vatId}
                    onChange={(e) => handleInputChange('vatId', e.target.value)}
                    placeholder={isPremium ? "z.B. DE123456789" : "Premium-Feature"}
                    disabled={!isPremium}
                  />
                </div>

                <div className={`${styles.formGroup} ${!isPremium ? styles.lockedField : ''}`}>
                  <label htmlFor="tradeRegister">
                    Handelsregister
                    {!isPremium && <Lock size={12} className={styles.lockIcon} />}
                  </label>
                  <input
                    id="tradeRegister"
                    type="text"
                    value={profile.tradeRegister}
                    onChange={(e) => handleInputChange('tradeRegister', e.target.value)}
                    placeholder={isPremium ? "z.B. HRB 12345" : "Premium-Feature"}
                    disabled={!isPremium}
                  />
                </div>
              </div>
            </div>

            {/* Contact Information - Premium Only */}
            <div className={`${styles.formSection} ${!isPremium ? styles.lockedSection : ''}`}>
              <h3>
                <Phone size={20} />
                Kontaktdaten
                {!isPremium && <span className={styles.premiumBadge}><Lock size={12} /> Premium</span>}
              </h3>

              <div className={styles.formGrid}>
                <div className={`${styles.formGroup} ${!isPremium ? styles.lockedField : ''}`}>
                  <label htmlFor="contactEmail">
                    E-Mail
                    {!isPremium && <Lock size={12} className={styles.lockIcon} />}
                  </label>
                  <input
                    id="contactEmail"
                    type="email"
                    value={profile.contactEmail}
                    onChange={(e) => handleInputChange('contactEmail', e.target.value)}
                    placeholder={isPremium ? "info@firma.de" : "Premium-Feature"}
                    disabled={!isPremium}
                  />
                </div>

                <div className={`${styles.formGroup} ${!isPremium ? styles.lockedField : ''}`}>
                  <label htmlFor="contactPhone">
                    Telefon
                    {!isPremium && <Lock size={12} className={styles.lockIcon} />}
                  </label>
                  <input
                    id="contactPhone"
                    type="tel"
                    value={profile.contactPhone}
                    onChange={(e) => handleInputChange('contactPhone', e.target.value)}
                    placeholder={isPremium ? "+49 30 12345678" : "Premium-Feature"}
                    disabled={!isPremium}
                  />
                </div>
              </div>
            </div>

            {/* Banking Information - Premium Only */}
            <div className={`${styles.formSection} ${!isPremium ? styles.lockedSection : ''}`}>
              <h3>
                <CreditCard size={20} />
                Bankverbindung
                {!isPremium && <span className={styles.premiumBadge}><Lock size={12} /> Premium</span>}
              </h3>

              <div className={styles.formGrid}>
                <div className={`${styles.formGroup} ${styles.spanning} ${!isPremium ? styles.lockedField : ''}`}>
                  <label htmlFor="bankName">
                    Bank
                    {!isPremium && <Lock size={12} className={styles.lockIcon} />}
                  </label>
                  <input
                    id="bankName"
                    type="text"
                    value={profile.bankName}
                    onChange={(e) => handleInputChange('bankName', e.target.value)}
                    placeholder={isPremium ? "z.B. Deutsche Bank AG" : "Premium-Feature"}
                    disabled={!isPremium}
                  />
                </div>

                <div className={`${styles.formGroup} ${!isPremium ? styles.lockedField : ''}`}>
                  <label htmlFor="iban">
                    IBAN
                    {!isPremium && <Lock size={12} className={styles.lockIcon} />}
                  </label>
                  <input
                    id="iban"
                    type="text"
                    value={profile.iban}
                    onChange={(e) => handleInputChange('iban', e.target.value)}
                    placeholder={isPremium ? "DE89 3704 0044 0532 0130 00" : "Premium-Feature"}
                    disabled={!isPremium}
                  />
                </div>

                <div className={`${styles.formGroup} ${!isPremium ? styles.lockedField : ''}`}>
                  <label htmlFor="bic">
                    BIC
                    {!isPremium && <Lock size={12} className={styles.lockIcon} />}
                  </label>
                  <input
                    id="bic"
                    type="text"
                    value={profile.bic}
                    onChange={(e) => handleInputChange('bic', e.target.value)}
                    placeholder={isPremium ? "COBADEFFXXX" : "Premium-Feature"}
                    disabled={!isPremium}
                  />
                </div>
              </div>
            </div>

            {/* Save Actions */}
            <div className={styles.actionSection}>
              {hasChanges && (
                <div className={styles.changesNotice}>
                  <AlertCircle size={16} />
                  <span>Sie haben ungespeicherte Änderungen</span>
                </div>
              )}

              <motion.button
                className={`${styles.saveButton} ${!hasChanges ? styles.disabled : ''}`}
                onClick={handleSave}
                disabled={saving || !hasChanges}
                whileHover={hasChanges ? { scale: 1.02 } : {}}
                whileTap={hasChanges ? { scale: 0.98 } : {}}
              >
                {saving ? (
                  <>
                    <div className={styles.loadingSpinner}></div>
                    <span>Speichere...</span>
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    <span>Profil speichern</span>
                  </>
                )}
              </motion.button>
            </div>
          </motion.div>

          {/* Info Panel */}
          <motion.div
            className={styles.infoPanel}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className={styles.infoCard}>
              <Eye size={24} />
              <h3>Automatische Verwendung</h3>
              <p>
                Ihre Firmendaten werden automatisch bei der Vertragserstellung verwendet.
                So sparen Sie Zeit und vermeiden Tippfehler.
              </p>
            </div>

            <div className={styles.infoCard}>
              <Globe size={24} />
              <h3>Rechtssicherheit</h3>
              <p>
                Vollständige Firmendaten sorgen für rechtskonforme Verträge mit
                allen notwendigen Angaben für deutsche und EU-Geschäfte.
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </>
  );
}