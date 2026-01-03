// 📁 frontend/src/components/Onboarding/OnboardingChecklist.tsx
// Enterprise Onboarding System v3.0 - Dashboard Checklist Widget

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Circle, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react';
import { useOnboarding } from '../../hooks/useOnboarding';
import styles from './OnboardingChecklist.module.css';

interface ChecklistItemConfig {
  id: string;
  label: string;
  description: string;
  action?: {
    label: string;
    path: string;
  };
}

const CHECKLIST_ITEMS: ChecklistItemConfig[] = [
  {
    id: 'accountCreated',
    label: 'Account erstellt',
    description: 'Du hast dich erfolgreich registriert'
  },
  {
    id: 'emailVerified',
    label: 'E-Mail bestätigt',
    description: 'Deine E-Mail-Adresse wurde verifiziert'
  },
  {
    id: 'firstContractUploaded',
    label: 'Ersten Vertrag hochgeladen',
    description: 'Lade deinen ersten Vertrag zur Analyse hoch',
    action: {
      label: 'Hochladen',
      path: '/contracts'
    }
  },
  {
    id: 'companyProfileComplete',
    label: 'Firmenprofil vervollständigt',
    description: 'Für automatische Vertragsgenerierung',
    action: {
      label: 'Ausfüllen',
      path: '/company-profile'
    }
  },
  {
    id: 'firstAnalysisComplete',
    label: 'Erste Analyse durchgeführt',
    description: 'Lass die KI deinen Vertrag analysieren',
    action: {
      label: 'Analysieren',
      path: '/optimizer'
    }
  }
];

interface OnboardingChecklistProps {
  className?: string;
}

export function OnboardingChecklist({ className }: OnboardingChecklistProps) {
  const navigate = useNavigate();
  const {
    onboardingState,
    shouldShowChecklist,
    checklistProgress,
    checklistTotal,
    isLoading
  } = useOnboarding();

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isHidden, setIsHidden] = useState(false);

  // Don't show if loading, hidden, or shouldn't show
  if (isLoading || isHidden || !shouldShowChecklist) {
    return null;
  }

  // Get checklist state
  const checklist = onboardingState?.checklist || {};

  // Calculate progress percentage
  const progressPercent = Math.round((checklistProgress / checklistTotal) * 100);

  // Find next uncompleted item
  const nextItem = CHECKLIST_ITEMS.find(
    item => !checklist[item.id as keyof typeof checklist]
  );

  if (isCollapsed) {
    return (
      <div className={`${styles.widget} ${className || ''}`}>
        <div className={styles.collapsed}>
          <button
            className={styles.expandButton}
            onClick={() => setIsCollapsed(false)}
          >
            <span>🚀 Erste Schritte ({checklistProgress}/{checklistTotal})</span>
            <ChevronDown size={16} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.widget} ${className || ''}`}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.headerIcon}>🚀</span>
          <h3 className={styles.headerTitle}>Erste Schritte</h3>
          <span className={styles.headerProgress}>{checklistProgress}/{checklistTotal}</span>
        </div>
        <button
          className={styles.hideButton}
          onClick={() => setIsHidden(true)}
        >
          Ausblenden
        </button>
      </div>

      {/* Progress Bar */}
      <div className={styles.progressBar}>
        <div
          className={styles.progressFill}
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Checklist Items */}
      <div className={styles.items}>
        {CHECKLIST_ITEMS.map(item => {
          const isCompleted = checklist[item.id as keyof typeof checklist];

          return (
            <div
              key={item.id}
              className={`${styles.item} ${isCompleted ? styles.completed : styles.pending}`}
              onClick={() => {
                if (!isCompleted && item.action) {
                  navigate(item.action.path);
                }
              }}
            >
              <div className={`${styles.itemIcon} ${isCompleted ? styles.completed : styles.pending}`}>
                {isCompleted ? (
                  <Check size={16} />
                ) : (
                  <Circle size={16} />
                )}
              </div>

              <div className={styles.itemContent}>
                <p className={styles.itemLabel}>{item.label}</p>
                <p className={styles.itemDescription}>{item.description}</p>
              </div>

              {!isCompleted && item.action && (
                <button
                  className={styles.itemAction}
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(item.action!.path);
                  }}
                >
                  {item.action.label}
                  <ChevronRight size={14} />
                </button>
              )}
            </div>
          );
        })}

        {/* Tip */}
        {nextItem && (
          <div className={styles.tip}>
            <span className={styles.tipIcon}>💡</span>
            <p className={styles.tipText}>
              Tipp: Vervollständige alle Schritte für die beste Contract AI Erfahrung!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default OnboardingChecklist;
