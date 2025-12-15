// 📁 components/LegalLens/PerspectiveSwitcher.tsx
// Komponente für den Perspektiven-Wechsler - REDESIGNED mit Erklärungen

import React, { useState } from 'react';
import { HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';
import type { PerspectiveType } from '../../types/legalLens';
import styles from '../../styles/LegalLens.module.css';

interface PerspectiveInfo {
  id: PerspectiveType;
  name: string;
  icon: string;
  description: string;
  shortHint: string;
  longDescription: string;
  useCases: string[];
  color: string;
  bgColor: string;
}

const PERSPECTIVES_ENHANCED: PerspectiveInfo[] = [
  {
    id: 'contractor',
    name: 'Auftraggeber',
    icon: '👔',
    description: 'Du gibst den Auftrag',
    shortHint: 'Wenn du zahlst & beauftragst',
    longDescription: 'Analysiert, ob die Klausel deine Interessen als Auftraggeber schützt. Fokus auf Leistungsgarantien, Haftung des Auftragnehmers und Kontrollrechte.',
    useCases: [
      'Du beauftragst einen Dienstleister',
      'Du kaufst ein Produkt oder Service',
      'Du schließt einen Werkvertrag ab'
    ],
    color: '#2563eb',
    bgColor: '#eff6ff'
  },
  {
    id: 'client',
    name: 'Auftragnehmer',
    icon: '🛠️',
    description: 'Du erbringst die Leistung',
    shortHint: 'Wenn du lieferst & arbeitest',
    longDescription: 'Analysiert Risiken und Pflichten, die du als Auftragnehmer trägst. Fokus auf Haftungsbegrenzungen, faire Vergütung und realistische Deadlines.',
    useCases: [
      'Du bietest deine Dienstleistung an',
      'Du lieferst ein Produkt',
      'Du führst einen Auftrag aus'
    ],
    color: '#059669',
    bgColor: '#ecfdf5'
  },
  {
    id: 'neutral',
    name: 'Marktüblich',
    icon: '⚖️',
    description: 'Neutraler Branchenvergleich',
    shortHint: 'Objektive Einschätzung',
    longDescription: 'Vergleicht die Klausel mit branchenüblichen Standards. Zeigt, ob Konditionen fair sind oder stark von der Norm abweichen.',
    useCases: [
      'Du willst wissen ob die Klausel fair ist',
      'Du brauchst Verhandlungsargumente',
      'Du vergleichst mit anderen Anbietern'
    ],
    color: '#7c3aed',
    bgColor: '#f5f3ff'
  },
  {
    id: 'worstCase',
    name: 'Worst Case',
    icon: '⚠️',
    description: 'Was schlimmstenfalls passiert',
    shortHint: 'Risiko-Fokus Maximum',
    longDescription: 'Zeigt das maximale Risiko bei ungünstigster Auslegung. Konkrete Szenarien mit finanziellen und zeitlichen Auswirkungen.',
    useCases: [
      'Du willst alle Risiken kennen',
      'Du bereitest dich auf Streitfälle vor',
      'Du prüfst einen wichtigen Vertrag'
    ],
    color: '#dc2626',
    bgColor: '#fef2f2'
  }
];

interface PerspectiveSwitcherProps {
  currentPerspective: PerspectiveType;
  onChangePerspective: (perspective: PerspectiveType) => void;
  disabled?: boolean;
}

const PerspectiveSwitcher: React.FC<PerspectiveSwitcherProps> = ({
  currentPerspective,
  onChangePerspective,
  disabled = false
}) => {
  const [showHelp, setShowHelp] = useState<boolean>(false);
  const currentInfo = PERSPECTIVES_ENHANCED.find(p => p.id === currentPerspective);

  return (
    <div className={styles.perspectiveSwitcherEnhanced}>
      {/* Header mit Hilfe-Button */}
      <div className={styles.perspectiveHeader}>
        <div className={styles.perspectiveHeaderLeft}>
          <span className={styles.perspectiveLabel}>Analyse-Perspektive</span>
          <span className={styles.perspectiveCurrentHint}>
            {currentInfo?.shortHint}
          </span>
        </div>
        <button
          className={`${styles.perspectiveHelpBtn} ${showHelp ? styles.active : ''}`}
          onClick={() => setShowHelp(!showHelp)}
          title="Perspektiven erklärt"
        >
          <HelpCircle size={16} />
          <span>Welche wählen?</span>
          {showHelp ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {/* Perspektiven Cards */}
      <div className={styles.perspectiveCards}>
        {PERSPECTIVES_ENHANCED.map((perspective) => {
          const isActive = currentPerspective === perspective.id;
          return (
            <button
              key={perspective.id}
              className={`${styles.perspectiveCard} ${isActive ? styles.active : ''}`}
              onClick={() => onChangePerspective(perspective.id)}
              disabled={disabled}
              style={{
                '--perspective-color': perspective.color,
                '--perspective-bg': perspective.bgColor
              } as React.CSSProperties}
            >
              <div className={styles.perspectiveCardIcon}>
                {perspective.icon}
              </div>
              <div className={styles.perspectiveCardContent}>
                <span className={styles.perspectiveCardName}>
                  {perspective.name}
                </span>
                <span className={styles.perspectiveCardDesc}>
                  {perspective.description}
                </span>
              </div>
              {isActive && (
                <span className={styles.perspectiveCardActive}>
                  ✓
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Ausklappbare Hilfe */}
      {showHelp && (
        <div className={styles.perspectiveHelpPanel}>
          <div className={styles.perspectiveHelpTitle}>
            🎯 Welche Perspektive ist richtig für dich?
          </div>
          <div className={styles.perspectiveHelpGrid}>
            {PERSPECTIVES_ENHANCED.map((perspective) => (
              <div
                key={perspective.id}
                className={styles.perspectiveHelpCard}
                style={{
                  borderLeftColor: perspective.color
                }}
              >
                <div className={styles.perspectiveHelpCardHeader}>
                  <span>{perspective.icon}</span>
                  <strong>{perspective.name}</strong>
                </div>
                <p className={styles.perspectiveHelpDesc}>
                  {perspective.longDescription}
                </p>
                <div className={styles.perspectiveHelpUseCases}>
                  <span className={styles.perspectiveHelpUseCasesLabel}>
                    Nutze diese Perspektive wenn:
                  </span>
                  <ul>
                    {perspective.useCases.map((useCase, idx) => (
                      <li key={idx}>{useCase}</li>
                    ))}
                  </ul>
                </div>
                <button
                  className={styles.perspectiveHelpChoose}
                  onClick={() => {
                    onChangePerspective(perspective.id);
                    setShowHelp(false);
                  }}
                  disabled={disabled}
                  style={{
                    background: perspective.color,
                    opacity: currentPerspective === perspective.id ? 0.5 : 1
                  }}
                >
                  {currentPerspective === perspective.id ? 'Ausgewählt' : 'Auswählen'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PerspectiveSwitcher;
