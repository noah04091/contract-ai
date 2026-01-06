// 📁 frontend/src/components/Onboarding/OnboardingModal.tsx
// Enterprise Onboarding System v4.0 - Premium Modal Component
// ✨ LINEAR/NOTION QUALITY - Smooth animations, personalization, professional design
// 🔧 Native <dialog> Element für 100% zuverlässiges Modal-Verhalten

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronRight,
  ChevronLeft,
  Upload,
  FileText,
  Calendar,
  Shield,
  Sparkles,
  Building2,
  Check,
  Circle,
  X,
  Search,
  PenTool,
  FolderOpen,
  FileSignature,
  Rocket,
  Target,
  Zap,
  ArrowRight
} from 'lucide-react';
import { useOnboarding } from '../../hooks/useOnboarding';
import { useAuth } from '../../context/AuthContext';
import { useCelebrationContext } from '../Celebration';
import type { OnboardingProfile } from '../../types/onboarding';
import styles from './OnboardingModal.module.css';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose?: () => void;
}

// ============================================
// ANIMATION VARIANTS - Smooth, professional transitions
// ============================================
const pageTransition = {
  type: 'tween',
  ease: 'easeInOut',
  duration: 0.3
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

// ============================================
// STEP CONFIGURATION
// ============================================
const STEPS = [
  { id: 'welcome', title: 'Willkommen', icon: Sparkles },
  { id: 'personalization', title: 'Personalisierung', icon: Target },
  { id: 'upload', title: 'Erster Upload', icon: Upload },
  { id: 'features', title: 'Features', icon: Zap },
  { id: 'complete', title: 'Startklar', icon: Rocket }
];

// ============================================
// USE CASES - Professional icons
// ============================================
const USE_CASES = [
  { id: 'analyze', Icon: Search, label: 'Verträge prüfen', hint: 'Risiken erkennen', color: '#3B82F6' },
  { id: 'generate', Icon: PenTool, label: 'Verträge erstellen', hint: 'Generator nutzen', color: '#8B5CF6' },
  { id: 'manage', Icon: FolderOpen, label: 'Verträge verwalten', hint: 'Fristen im Blick', color: '#10B981' },
  { id: 'sign', Icon: FileSignature, label: 'Verträge signieren', hint: 'Digital unterschreiben', color: '#F59E0B' }
];

const FEATURES_BY_USE_CASE: Record<string, Array<{ icon: React.ReactNode; title: string; description: string }>> = {
  analyze: [
    { icon: <Shield size={28} />, title: 'KI-Analyse', description: 'Risiken und Schwachstellen automatisch erkennen' },
    { icon: <Sparkles size={28} />, title: 'Legal Lens', description: 'Jede Klausel verständlich erklärt' },
    { icon: <FileText size={28} />, title: 'Optimierung', description: 'Konkrete Verbesserungsvorschläge' }
  ],
  generate: [
    { icon: <FileText size={28} />, title: 'Generator', description: 'Rechtssichere Verträge in Minuten' },
    { icon: <Building2 size={28} />, title: 'Contract Builder', description: 'Visueller Drag & Drop Editor' },
    { icon: <Sparkles size={28} />, title: 'KI-Assistent', description: 'Intelligente Formulierungshilfe' }
  ],
  manage: [
    { icon: <Calendar size={28} />, title: 'Fristenkalender', description: 'Nie wieder Kündigungsfristen verpassen' },
    { icon: <FileText size={28} />, title: 'Vertragsverwaltung', description: 'Alle Verträge an einem Ort' },
    { icon: <Sparkles size={28} />, title: 'Legal Pulse', description: 'Updates bei Gesetzesänderungen' }
  ],
  sign: [
    { icon: <FileText size={28} />, title: 'Digitale Signatur', description: 'Rechtsgültig digital unterschreiben' },
    { icon: <Building2 size={28} />, title: 'Signatur-Workflows', description: 'Mehrere Unterzeichner verwalten' },
    { icon: <Calendar size={28} />, title: 'Status-Tracking', description: 'Unterschriften in Echtzeit verfolgen' }
  ]
};

export function OnboardingModal({ isOpen, onClose }: OnboardingModalProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    completeStep,
    completeOnboarding,
    skipOnboarding,
    startOnboarding
  } = useOnboarding();
  const { celebrate } = useCelebrationContext();

  const [currentStep, setCurrentStep] = useState(0);
  const [profile, setProfile] = useState<OnboardingProfile>({});
  const [direction, setDirection] = useState(1); // 1 = forward, -1 = backward

  // Get user's first name for personalization
  const userName = user?.name?.split(' ')[0] || user?.email?.split('@')[0] || 'there';

  // Start onboarding when modal opens
  useEffect(() => {
    if (isOpen) {
      startOnboarding();
    }
  }, [isOpen, startOnboarding]);

  const handleNext = async () => {
    const step = STEPS[currentStep];

    // Save step data
    if (step.id === 'personalization' && profile.primaryUseCase) {
      await completeStep('personalization', profile as unknown as Record<string, unknown>);
    } else if (step.id !== 'welcome') {
      await completeStep(step.id);
    }

    // Move to next step or complete
    if (currentStep < STEPS.length - 1) {
      setDirection(1); // Forward animation
      setCurrentStep(prev => prev + 1);
    } else {
      await completeOnboarding();
      // 🎉 Celebrate onboarding completion with fireworks!
      celebrate('onboarding-complete');
      onClose?.();
      navigate('/dashboard');
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setDirection(-1); // Backward animation
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSkip = async () => {
    await skipOnboarding();
    onClose?.();
  };

  const handleUseCaseSelect = (useCase: string) => {
    setProfile(prev => ({ ...prev, primaryUseCase: useCase as OnboardingProfile['primaryUseCase'] }));
  };

  // ============================================
  // STEP CONTENT RENDERER - Premium animated content
  // ============================================
  const renderStepContent = () => {
    const animationVariants = {
      initial: { opacity: 0, x: direction * 30 },
      animate: { opacity: 1, x: 0 },
      exit: { opacity: 0, x: direction * -30 }
    };

    switch (STEPS[currentStep].id) {
      // ----------------------------------------
      // STEP 1: WELCOME - Personalized greeting
      // ----------------------------------------
      case 'welcome':
        return (
          <motion.div
            key="welcome"
            variants={animationVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={pageTransition}
            className={styles.stepContent}
          >
            {/* Animated Icon */}
            <motion.div
              className={styles.iconWrapper}
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
            >
              <Sparkles size={32} />
            </motion.div>

            {/* Personalized Title */}
            <motion.h2
              className={styles.stepTitle}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              Willkommen, <span className={styles.highlight}>{userName}</span>!
            </motion.h2>

            <motion.p
              className={styles.stepDescription}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              Du bist einer von über 5.000 Nutzern, die ihre Verträge intelligent verwalten.
              <br />In 60 Sekunden zeigen wir dir, wie du das Maximum herausholst.
            </motion.p>

            {/* Animated Stats */}
            <motion.div
              className={styles.welcomeStats}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              {[
                { value: '5.000+', label: 'Nutzer' },
                { value: '50.000+', label: 'Verträge' },
                { value: '98%', label: 'Zufriedenheit' }
              ].map((stat, index) => (
                <motion.div
                  key={stat.label}
                  className={styles.statItem}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5 + index * 0.1 }}
                >
                  <p className={styles.statNumber}>{stat.value}</p>
                  <p className={styles.statLabel}>{stat.label}</p>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        );

      // ----------------------------------------
      // STEP 2: PERSONALIZATION - Use case selection
      // ----------------------------------------
      case 'personalization':
        return (
          <motion.div
            key="personalization"
            variants={animationVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={pageTransition}
            className={styles.stepContent}
          >
            <motion.div
              className={styles.iconWrapper}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            >
              <Target size={32} />
            </motion.div>

            <motion.h2
              className={styles.stepTitle}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              Wie nutzt du Contract AI?
            </motion.h2>

            <motion.p
              className={styles.stepDescription}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              Wähle deinen Hauptanwendungsfall – wir passen das Erlebnis für dich an.
            </motion.p>

            <motion.div
              className={styles.useCaseGrid}
              variants={staggerContainer}
              initial="initial"
              animate="animate"
            >
              {USE_CASES.map((useCase, index) => (
                <motion.button
                  key={useCase.id}
                  className={`${styles.useCaseCard} ${profile.primaryUseCase === useCase.id ? styles.selected : ''}`}
                  onClick={() => handleUseCaseSelect(useCase.id)}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div
                    className={styles.useCaseIconWrapper}
                    style={{ backgroundColor: `${useCase.color}15`, color: useCase.color }}
                  >
                    <useCase.Icon size={24} />
                  </div>
                  <p className={styles.useCaseLabel}>{useCase.label}</p>
                  <p className={styles.useCaseHint}>{useCase.hint}</p>
                  {profile.primaryUseCase === useCase.id && (
                    <motion.div
                      className={styles.selectedCheck}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                    >
                      <Check size={14} />
                    </motion.div>
                  )}
                </motion.button>
              ))}
            </motion.div>
          </motion.div>
        );

      // ----------------------------------------
      // STEP 3: UPLOAD - First contract upload
      // ----------------------------------------
      case 'upload':
        return (
          <motion.div
            key="upload"
            variants={animationVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={pageTransition}
            className={styles.stepContent}
          >
            <motion.div
              className={styles.iconWrapper}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            >
              <Upload size={32} />
            </motion.div>

            <motion.h2
              className={styles.stepTitle}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              Lade deinen ersten Vertrag
            </motion.h2>

            <motion.p
              className={styles.stepDescription}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              Teste die KI-Analyse direkt mit einem deiner Verträge.
            </motion.p>

            <motion.div
              className={styles.uploadZone}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              whileHover={{ scale: 1.01, borderColor: '#3B82F6' }}
              onClick={() => navigate('/contracts')}
            >
              <motion.div
                animate={{ y: [0, -5, 0] }}
                transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
              >
                <Upload className={styles.uploadIconLarge} size={48} />
              </motion.div>
              <p className={styles.uploadTitle}>Drag & Drop oder klicken</p>
              <p className={styles.uploadHint}>PDF, DOC, DOCX (max. 10 MB)</p>
            </motion.div>

            <motion.div
              className={styles.uploadTip}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Zap size={18} className={styles.tipIcon} />
              <p className={styles.uploadTipText}>
                <strong>Tipp:</strong> Lade einen Handyvertrag, Mietvertrag oder Arbeitsvertrag hoch –
                unsere KI erkennt automatisch den Typ.
              </p>
            </motion.div>
          </motion.div>
        );

      // ----------------------------------------
      // STEP 4: FEATURES - Personalized recommendations
      // ----------------------------------------
      case 'features': {
        const features = FEATURES_BY_USE_CASE[profile.primaryUseCase || 'analyze'];
        return (
          <motion.div
            key="features"
            variants={animationVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={pageTransition}
            className={styles.stepContent}
          >
            <motion.div
              className={styles.iconWrapper}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            >
              <Zap size={32} />
            </motion.div>

            <motion.h2
              className={styles.stepTitle}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              Perfekt für dich, <span className={styles.highlight}>{userName}</span>
            </motion.h2>

            <motion.p
              className={styles.stepDescription}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              Basierend auf deiner Auswahl empfehlen wir dir diese Features:
            </motion.p>

            <div className={styles.featureList}>
              {features.map((feature, index) => (
                <motion.div
                  key={index}
                  className={styles.featureItem}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                  whileHover={{ x: 4 }}
                >
                  <div className={styles.featureIconWrapper}>
                    {feature.icon}
                  </div>
                  <div className={styles.featureContent}>
                    <p className={styles.featureTitle}>{feature.title}</p>
                    <p className={styles.featureDescription}>{feature.description}</p>
                  </div>
                  <ArrowRight size={18} className={styles.featureArrow} />
                </motion.div>
              ))}
            </div>
          </motion.div>
        );
      }

      // ----------------------------------------
      // STEP 5: COMPLETE - Ready to go!
      // ----------------------------------------
      case 'complete':
        return (
          <motion.div
            key="complete"
            variants={animationVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={pageTransition}
            className={styles.stepContent}
          >
            <motion.div
              className={`${styles.iconWrapper} ${styles.successIcon}`}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            >
              <Rocket size={32} />
            </motion.div>

            <motion.h2
              className={styles.stepTitle}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              Du bist startklar, <span className={styles.highlight}>{userName}</span>!
            </motion.h2>

            <motion.p
              className={styles.stepDescription}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              Dein Dashboard ist eingerichtet. Diese Checklist hilft dir bei den nächsten Schritten:
            </motion.p>

            <motion.div
              className={styles.checklistPreview}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              {[
                { label: 'Account erstellt', done: true },
                { label: 'E-Mail bestätigt', done: true },
                { label: 'Ersten Vertrag hochladen', done: false },
                { label: 'Firmenprofil vervollständigen', done: false },
                { label: 'Erste Analyse durchführen', done: false }
              ].map((item, index) => (
                <motion.div
                  key={item.label}
                  className={`${styles.checklistItem} ${item.done ? styles.completed : styles.pending}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + index * 0.08 }}
                >
                  <motion.div
                    className={styles.checklistIconWrapper}
                    initial={item.done ? { scale: 0 } : {}}
                    animate={item.done ? { scale: 1 } : {}}
                    transition={{ delay: 0.5 + index * 0.08, type: 'spring', stiffness: 500 }}
                  >
                    {item.done ? <Check size={14} /> : <Circle size={14} />}
                  </motion.div>
                  <span>{item.label}</span>
                </motion.div>
              ))}
            </motion.div>

            <motion.p
              className={styles.checklistHint}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
            >
              Diese Checklist findest du auch in deinem Dashboard.
            </motion.p>
          </motion.div>
        );

      default:
        return null;
    }
  };

  // 🔧 Native Dialog Ref
  const dialogRef = useRef<HTMLDialogElement>(null);

  // 🔧 Native Dialog öffnen/schließen
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && !dialog.open) {
      dialog.showModal();
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  // 🔧 ESC-Taste abfangen (native dialog schließt sonst automatisch)
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleCancel = (e: Event) => {
      e.preventDefault(); // Verhindert automatisches Schließen
      handleSkip(); // Unser eigenes Skip-Handling
    };

    dialog.addEventListener('cancel', handleCancel);
    return () => dialog.removeEventListener('cancel', handleCancel);
  }, []);

  // Native dialog styles
  const dialogStyle: React.CSSProperties = {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    margin: 0,
    padding: 0,
    border: 'none',
    background: '#fff',
    borderRadius: 20,
    width: '100%',
    maxWidth: 560,
    maxHeight: '90vh',
    overflow: 'hidden',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    zIndex: 2147483647,
  };

  // Backdrop wird über ::backdrop pseudo-element gestyled (siehe CSS)

  const modalContent = (
    <dialog
      ref={dialogRef}
      style={dialogStyle}
      onClick={(e) => {
        // Klick außerhalb des Dialogs (auf backdrop) schließt
        const rect = (e.target as HTMLDialogElement).getBoundingClientRect();
        if (
          e.clientX < rect.left ||
          e.clientX > rect.right ||
          e.clientY < rect.top ||
          e.clientY > rect.bottom
        ) {
          handleSkip();
        }
      }}
    >
      {/* Close Button */}
      <button
        className={styles.closeButton}
        onClick={handleSkip}
        aria-label="Schließen"
      >
        <X size={20} />
      </button>

      <div className={styles.content}>
        {/* ============================================
            PREMIUM PROGRESS INDICATOR - With step names
            ============================================ */}
        <div className={styles.progressContainer}>
          {/* Progress Bar Background */}
          <div className={styles.progressBar}>
            <motion.div
              className={styles.progressFill}
              initial={{ width: 0 }}
              animate={{ width: `${((currentStep) / (STEPS.length - 1)) * 100}%` }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
            />
          </div>

          {/* Step Indicators */}
          <div className={styles.progressSteps}>
            {STEPS.map((step, index) => {
              const StepIcon = step.icon;
              const isActive = index === currentStep;
              const isCompleted = index < currentStep;

              return (
                <div
                  key={step.id}
                  className={`${styles.progressStep} ${isActive ? styles.active : ''} ${isCompleted ? styles.completed : ''}`}
                >
                  <motion.div
                    className={styles.progressDot}
                    animate={{
                      scale: isActive ? 1.1 : 1,
                      backgroundColor: isCompleted ? '#10B981' : isActive ? '#3B82F6' : '#E5E7EB'
                    }}
                    transition={{ duration: 0.2 }}
                  >
                    {isCompleted ? (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                      >
                        <Check size={14} />
                      </motion.div>
                    ) : (
                      <StepIcon size={14} />
                    )}
                  </motion.div>
                  <span className={styles.progressLabel}>{step.title}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ============================================
            ANIMATED STEP CONTENT
            ============================================ */}
        <AnimatePresence mode="wait">
          {renderStepContent()}
        </AnimatePresence>
      </div>

      {/* ============================================
          FOOTER - With back button
          ============================================ */}
      <div className={styles.footer}>
        <div className={styles.footerLeft}>
          {currentStep > 0 ? (
            <motion.button
              className={styles.backButton}
              onClick={handleBack}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              whileHover={{ x: -2 }}
            >
              <ChevronLeft size={18} />
              Zurück
            </motion.button>
          ) : (
            <button className={styles.skipButton} onClick={handleSkip}>
              Überspringen
            </button>
          )}
        </div>

        <div className={styles.footerRight}>
          {STEPS[currentStep].id === 'upload' ? (
            <div className={styles.uploadActions}>
              <button className={styles.laterButton} onClick={handleNext}>
                Später
              </button>
              <motion.button
                className={styles.nextButton}
                onClick={() => {
                  navigate('/contracts');
                  handleNext();
                }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Jetzt hochladen
                <ChevronRight size={18} />
              </motion.button>
            </div>
          ) : (
            <motion.button
              className={styles.nextButton}
              onClick={handleNext}
              disabled={STEPS[currentStep].id === 'personalization' && !profile.primaryUseCase}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {currentStep === STEPS.length - 1 ? (
                <>
                  Zum Dashboard
                  <Rocket size={18} />
                </>
              ) : (
                <>
                  Weiter
                  <ChevronRight size={18} />
                </>
              )}
            </motion.button>
          )}
        </div>
      </div>
    </dialog>
  );

  // Native <dialog> mit showModal() braucht kein Portal - es wird automatisch in die "top layer" gerendert
  // Das ist der Browser-native Weg, der ALLE CSS-Stacking-Probleme umgeht!
  if (!isOpen) return null;
  return modalContent;
}

export default OnboardingModal;
