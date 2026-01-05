// 📁 frontend/src/components/Onboarding/OnboardingModal.tsx
// Enterprise Onboarding System v3.0 - Main Modal Component
// 🔧 FIX: Native <dialog> Element für 100% zuverlässiges Modal-Verhalten
// Der Browser rendert showModal() in die "top layer" - umgeht ALLE CSS-Stacking-Probleme!

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Upload, FileText, Calendar, Shield, Sparkles, Building2, Check, Circle, X } from 'lucide-react';
import { useOnboarding } from '../../hooks/useOnboarding';
import { useCelebrationContext } from '../Celebration';
import type { OnboardingProfile } from '../../types/onboarding';
import styles from './OnboardingModal.module.css';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose?: () => void;
}

const STEPS = [
  { id: 'welcome', title: 'Willkommen' },
  { id: 'personalization', title: 'Personalisierung' },
  { id: 'upload', title: 'Erster Upload' },
  { id: 'features', title: 'Features' },
  { id: 'complete', title: 'Fertig' }
];

const USE_CASES = [
  { id: 'analyze', icon: '🔍', label: 'Verträge prüfen', hint: 'Risiken erkennen' },
  { id: 'generate', icon: '✍️', label: 'Verträge erstellen', hint: 'Generator nutzen' },
  { id: 'manage', icon: '📁', label: 'Verträge verwalten', hint: 'Fristen im Blick' },
  { id: 'sign', icon: '✒️', label: 'Verträge signieren', hint: 'Digital unterschreiben' }
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
  const {
    completeStep,
    completeOnboarding,
    skipOnboarding,
    startOnboarding
  } = useOnboarding();
  const { celebrate } = useCelebrationContext();

  const [currentStep, setCurrentStep] = useState(0);
  const [profile, setProfile] = useState<OnboardingProfile>({});

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
      setCurrentStep(prev => prev + 1);
    } else {
      await completeOnboarding();
      // 🎉 Celebrate onboarding completion with fireworks!
      celebrate('onboarding-complete');
      onClose?.();
      navigate('/dashboard');
    }
  };

  const handleSkip = async () => {
    await skipOnboarding();
    onClose?.();
  };

  const handleUseCaseSelect = (useCase: string) => {
    setProfile(prev => ({ ...prev, primaryUseCase: useCase as OnboardingProfile['primaryUseCase'] }));
  };

  const renderStepContent = () => {
    switch (STEPS[currentStep].id) {
      case 'welcome':
        return (
          <div className={styles.stepHeader}>
            <span className={styles.stepIcon}>🎉</span>
            <h2 className={styles.stepTitle}>Willkommen bei Contract AI!</h2>
            <p className={styles.stepDescription}>
              Du bist einer von über 5.000 Nutzern, die ihre Verträge intelligent verwalten.
              In 60 Sekunden zeigen wir dir, wie du das Maximum herausholst.
            </p>
            <div className={styles.welcomeStats}>
              <div className={styles.statItem}>
                <p className={styles.statNumber}>5.000+</p>
                <p className={styles.statLabel}>Nutzer</p>
              </div>
              <div className={styles.statItem}>
                <p className={styles.statNumber}>50.000+</p>
                <p className={styles.statLabel}>Verträge analysiert</p>
              </div>
              <div className={styles.statItem}>
                <p className={styles.statNumber}>98%</p>
                <p className={styles.statLabel}>Zufriedenheit</p>
              </div>
            </div>
          </div>
        );

      case 'personalization':
        return (
          <>
            <div className={styles.stepHeader}>
              <span className={styles.stepIcon}>🎯</span>
              <h2 className={styles.stepTitle}>Wie nutzt du Contract AI?</h2>
              <p className={styles.stepDescription}>
                Wähle deinen Hauptanwendungsfall – wir passen die Oberfläche für dich an.
              </p>
            </div>
            <div className={styles.useCaseGrid}>
              {USE_CASES.map(useCase => (
                <button
                  key={useCase.id}
                  className={`${styles.useCaseCard} ${profile.primaryUseCase === useCase.id ? styles.selected : ''}`}
                  onClick={() => handleUseCaseSelect(useCase.id)}
                >
                  <span className={styles.useCaseIcon}>{useCase.icon}</span>
                  <p className={styles.useCaseLabel}>{useCase.label}</p>
                  <p className={styles.useCaseHint}>{useCase.hint}</p>
                </button>
              ))}
            </div>
          </>
        );

      case 'upload':
        return (
          <>
            <div className={styles.stepHeader}>
              <span className={styles.stepIcon}>📄</span>
              <h2 className={styles.stepTitle}>Lade deinen ersten Vertrag</h2>
              <p className={styles.stepDescription}>
                Teste die KI-Analyse direkt mit einem deiner Verträge.
              </p>
            </div>
            <div
              className={styles.uploadZone}
              onClick={() => navigate('/contracts')}
            >
              <Upload className={styles.uploadIcon} size={48} />
              <p className={styles.uploadTitle}>Drag & Drop oder klicken</p>
              <p className={styles.uploadHint}>PDF, DOC, DOCX (max. 10 MB)</p>
            </div>
            <div className={styles.uploadTip}>
              <span className={styles.uploadTipIcon}>💡</span>
              <p className={styles.uploadTipText}>
                Tipp: Lade einen Handyvertrag, Mietvertrag oder Arbeitsvertrag hoch –
                unsere KI erkennt automatisch den Typ und analysiert relevante Klauseln.
              </p>
            </div>
          </>
        );

      case 'features': {
        const features = FEATURES_BY_USE_CASE[profile.primaryUseCase || 'analyze'];
        return (
          <>
            <div className={styles.stepHeader}>
              <span className={styles.stepIcon}>✨</span>
              <h2 className={styles.stepTitle}>Perfekt für dich</h2>
              <p className={styles.stepDescription}>
                Basierend auf deiner Auswahl empfehlen wir dir diese Features:
              </p>
            </div>
            <div className={styles.featureList}>
              {features.map((feature, index) => (
                <div key={index} className={styles.featureItem}>
                  <span className={styles.featureIcon}>{feature.icon}</span>
                  <div className={styles.featureContent}>
                    <p className={styles.featureTitle}>{feature.title}</p>
                    <p className={styles.featureDescription}>{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </>
        );
      }

      case 'complete':
        return (
          <>
            <div className={styles.stepHeader}>
              <span className={styles.stepIcon}>🚀</span>
              <h2 className={styles.stepTitle}>Du bist startklar!</h2>
              <p className={styles.stepDescription}>
                Dein Dashboard ist eingerichtet. Diese Checklist hilft dir bei den nächsten Schritten:
              </p>
            </div>
            <div className={styles.checklistPreview}>
              <div className={`${styles.checklistItem} ${styles.completed}`}>
                <Check className={styles.checklistIcon} size={18} />
                <span>Account erstellt</span>
              </div>
              <div className={`${styles.checklistItem} ${styles.completed}`}>
                <Check className={styles.checklistIcon} size={18} />
                <span>E-Mail bestätigt</span>
              </div>
              <div className={`${styles.checklistItem} ${styles.pending}`}>
                <Circle className={styles.checklistIcon} size={18} />
                <span>Ersten Vertrag hochladen</span>
              </div>
              <div className={`${styles.checklistItem} ${styles.pending}`}>
                <Circle className={styles.checklistIcon} size={18} />
                <span>Firmenprofil vervollständigen</span>
              </div>
              <div className={`${styles.checklistItem} ${styles.pending}`}>
                <Circle className={styles.checklistIcon} size={18} />
                <span>Erste Analyse durchführen</span>
              </div>
            </div>
            <p style={{ textAlign: 'center', color: '#6b7280', fontSize: 14 }}>
              Diese Checklist findest du auch in deinem Dashboard.
            </p>
          </>
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
        {/* Progress Dots */}
        <div className={styles.progress}>
          {STEPS.map((step, index) => (
            <div
              key={step.id}
              className={`${styles.progressDot} ${
                index === currentStep ? styles.active : ''
              } ${index < currentStep ? styles.completed : ''}`}
            />
          ))}
        </div>

        {/* Step Content */}
        {renderStepContent()}
      </div>

      {/* Footer */}
      <div className={styles.footer}>
        <button className={styles.skipButton} onClick={handleSkip}>
          Überspringen
        </button>

        {STEPS[currentStep].id === 'upload' ? (
          <div style={{ display: 'flex', gap: 12 }}>
            <button className={styles.laterButton} onClick={handleNext}>
              Später
            </button>
            <button
              className={styles.nextButton}
              onClick={() => {
                navigate('/contracts');
                handleNext();
              }}
            >
              Jetzt hochladen
              <ChevronRight size={18} />
            </button>
          </div>
        ) : (
          <button
            className={styles.nextButton}
            onClick={handleNext}
            disabled={STEPS[currentStep].id === 'personalization' && !profile.primaryUseCase}
          >
            {currentStep === STEPS.length - 1 ? 'Zum Dashboard' : 'Weiter'}
            <ChevronRight size={18} />
          </button>
        )}
      </div>
    </dialog>
  );

  // Native <dialog> mit showModal() braucht kein Portal - es wird automatisch in die "top layer" gerendert
  // Das ist der Browser-native Weg, der ALLE CSS-Stacking-Probleme umgeht!
  if (!isOpen) return null;
  return modalContent;
}

export default OnboardingModal;
