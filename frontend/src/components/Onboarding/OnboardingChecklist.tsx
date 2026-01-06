// 📁 frontend/src/components/Onboarding/OnboardingChecklist.tsx
// Enterprise Onboarding System v4.0 - Premium Dashboard Checklist Widget
// ✨ LINEAR/NOTION QUALITY - Animations, professional icons, persistent state

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Check,
  ChevronRight,
  ChevronUp,
  Rocket,
  Lightbulb,
  UserCheck,
  Mail,
  FileUp,
  Building2,
  Search,
  X
} from 'lucide-react';
import { useOnboarding } from '../../hooks/useOnboarding';
import { useCelebrationContext } from '../Celebration';
import styles from './OnboardingChecklist.module.css';

interface ChecklistItemConfig {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  iconColor: string;
  action?: {
    label: string;
    path: string;
  };
}

const CHECKLIST_ITEMS: ChecklistItemConfig[] = [
  {
    id: 'accountCreated',
    label: 'Account erstellt',
    description: 'Du hast dich erfolgreich registriert',
    icon: UserCheck,
    iconColor: '#10B981'
  },
  {
    id: 'emailVerified',
    label: 'E-Mail bestätigt',
    description: 'Deine E-Mail-Adresse wurde verifiziert',
    icon: Mail,
    iconColor: '#3B82F6'
  },
  {
    id: 'firstContractUploaded',
    label: 'Ersten Vertrag hochgeladen',
    description: 'Lade deinen ersten Vertrag zur Analyse hoch',
    icon: FileUp,
    iconColor: '#8B5CF6',
    action: {
      label: 'Hochladen',
      path: '/contracts'
    }
  },
  {
    id: 'companyProfileComplete',
    label: 'Firmenprofil vervollständigt',
    description: 'Für automatische Vertragsgenerierung',
    icon: Building2,
    iconColor: '#F59E0B',
    action: {
      label: 'Ausfüllen',
      path: '/company-profile'
    }
  },
  {
    id: 'firstAnalysisComplete',
    label: 'Erste Analyse durchgeführt',
    description: 'Klicke bei einem Vertrag auf "Analysieren"',
    icon: Search,
    iconColor: '#EC4899',
    action: {
      label: 'Zu Verträge',
      path: '/contracts'
    }
  }
];

// SessionStorage key for persistent hide state
const CHECKLIST_HIDDEN_KEY = 'contract-ai-checklist-hidden';

interface OnboardingChecklistProps {
  className?: string;
}

export function OnboardingChecklist({ className }: OnboardingChecklistProps) {
  const navigate = useNavigate();
  const { celebrate } = useCelebrationContext();
  const {
    onboardingState,
    shouldShowChecklist,
    checklistProgress,
    checklistTotal,
    isLoading
  } = useOnboarding();

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isHidden, setIsHidden] = useState(() => {
    // Persistent hide state from sessionStorage
    return sessionStorage.getItem(CHECKLIST_HIDDEN_KEY) === 'true';
  });
  const [justCompletedId, setJustCompletedId] = useState<string | null>(null);
  const [previousProgress, setPreviousProgress] = useState(checklistProgress);

  // Track completion for celebration
  useEffect(() => {
    if (checklistProgress > previousProgress) {
      // Find which item was just completed
      const checklist = onboardingState?.checklist || {};
      const completedItem = CHECKLIST_ITEMS.find(
        item => checklist[item.id as keyof typeof checklist] &&
                !CHECKLIST_ITEMS.slice(0, CHECKLIST_ITEMS.indexOf(item))
                  .every(i => checklist[i.id as keyof typeof checklist])
      );

      if (completedItem) {
        setJustCompletedId(completedItem.id);
        setTimeout(() => setJustCompletedId(null), 1000);
      }

      // 🎉 Celebrate when all items are complete!
      if (checklistProgress === checklistTotal && previousProgress < checklistTotal) {
        celebrate('checklist-complete');
      }
    }
    setPreviousProgress(checklistProgress);
  }, [checklistProgress, previousProgress, checklistTotal, onboardingState?.checklist, celebrate]);

  // Persist hide state to sessionStorage
  const handleHide = () => {
    setIsHidden(true);
    sessionStorage.setItem(CHECKLIST_HIDDEN_KEY, 'true');
  };

  // Don't show if loading, hidden, or shouldn't show
  if (isLoading || isHidden || !shouldShowChecklist) {
    return null;
  }

  // Get checklist state
  const checklist = onboardingState?.checklist || {};

  // Calculate progress percentage
  const progressPercent = Math.round((checklistProgress / checklistTotal) * 100);

  // Check if all complete
  const isAllComplete = checklistProgress === checklistTotal;

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.3,
        staggerChildren: 0.05
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -10 },
    visible: { opacity: 1, x: 0 }
  };

  // Collapsed view
  if (isCollapsed) {
    return (
      <motion.div
        className={`${styles.widget} ${className || ''}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className={styles.collapsed}>
          <motion.button
            className={styles.expandButton}
            onClick={() => setIsCollapsed(false)}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            <Rocket size={18} className={styles.expandIcon} />
            <span>Erste Schritte ({checklistProgress}/{checklistTotal})</span>
            <ChevronUp size={16} />
          </motion.button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className={`${styles.widget} ${className || ''}`}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <motion.div
            className={styles.headerIconWrapper}
            animate={isAllComplete ? { rotate: [0, -10, 10, -10, 0] } : {}}
            transition={{ duration: 0.5 }}
          >
            <Rocket size={20} />
          </motion.div>
          <div>
            <h3 className={styles.headerTitle}>Erste Schritte</h3>
            <p className={styles.headerSubtitle}>
              {isAllComplete ? 'Alles erledigt!' : `${checklistProgress} von ${checklistTotal} abgeschlossen`}
            </p>
          </div>
        </div>
        <div className={styles.headerActions}>
          <button
            className={styles.collapseButton}
            onClick={() => setIsCollapsed(true)}
            title="Minimieren"
          >
            <ChevronUp size={18} />
          </button>
          <button
            className={styles.hideButton}
            onClick={handleHide}
            title="Ausblenden"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className={styles.progressBar}>
        <motion.div
          className={styles.progressFill}
          initial={{ width: 0 }}
          animate={{ width: `${progressPercent}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>

      {/* Checklist Items */}
      <div className={styles.items}>
        <AnimatePresence>
          {CHECKLIST_ITEMS.map((item) => {
            const isCompleted = checklist[item.id as keyof typeof checklist];
            const isJustCompleted = justCompletedId === item.id;
            const ItemIcon = item.icon;

            return (
              <motion.div
                key={item.id}
                variants={itemVariants}
                className={`${styles.item} ${isCompleted ? styles.completed : styles.pending}`}
                onClick={() => {
                  if (!isCompleted && item.action) {
                    navigate(item.action.path);
                  }
                }}
                whileHover={!isCompleted && item.action ? { x: 4 } : {}}
                layout
              >
                {/* Icon */}
                <motion.div
                  className={`${styles.itemIcon} ${isCompleted ? styles.completed : styles.pending}`}
                  style={{
                    backgroundColor: isCompleted ? item.iconColor : undefined,
                    borderColor: !isCompleted ? item.iconColor : undefined
                  }}
                  animate={isJustCompleted ? { scale: [1, 1.3, 1] } : {}}
                  transition={{ duration: 0.3 }}
                >
                  {isCompleted ? (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                    >
                      <Check size={14} strokeWidth={3} />
                    </motion.div>
                  ) : (
                    <ItemIcon size={14} style={{ color: item.iconColor }} />
                  )}
                </motion.div>

                {/* Content */}
                <div className={styles.itemContent}>
                  <p className={styles.itemLabel}>{item.label}</p>
                  <p className={styles.itemDescription}>{item.description}</p>
                </div>

                {/* Action Button */}
                {!isCompleted && item.action && (
                  <motion.button
                    className={styles.itemAction}
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(item.action!.path);
                    }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {item.action.label}
                    <ChevronRight size={14} />
                  </motion.button>
                )}

                {/* Completed Badge */}
                {isCompleted && (
                  <motion.span
                    className={styles.completedBadge}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                  >
                    Erledigt
                  </motion.span>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Tip - only show if not all complete */}
        {!isAllComplete && (
          <motion.div
            className={styles.tip}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <div className={styles.tipIconWrapper}>
              <Lightbulb size={16} />
            </div>
            <p className={styles.tipText}>
              <strong>Tipp:</strong> Vervollständige alle Schritte für die beste Contract AI Erfahrung!
            </p>
          </motion.div>
        )}

        {/* Success Message when all complete */}
        {isAllComplete && (
          <motion.div
            className={styles.successMessage}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className={styles.successIconWrapper}>
              <Check size={20} />
            </div>
            <div>
              <p className={styles.successTitle}>Perfekt eingerichtet!</p>
              <p className={styles.successText}>
                Du bist bereit, das volle Potenzial von Contract AI zu nutzen.
              </p>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

export default OnboardingChecklist;
