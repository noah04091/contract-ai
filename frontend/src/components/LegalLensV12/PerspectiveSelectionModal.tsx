// 📁 components/LegalLensV12/PerspectiveSelectionModal.tsx
// Erstmalige Perspektiven-Auswahl beim Öffnen von Legal Lens

import React, { useState } from 'react';
import type { PerspectiveType } from '../../types/legalLens';
import styles from '../../styles/LegalLensV12.module.css';

interface PerspectiveOption {
  id: PerspectiveType;
  name: string;
  icon: string;
  description: string;
  hint: string;
  color: string;
  bgColor: string;
}

const PERSPECTIVE_OPTIONS: PerspectiveOption[] = [
  {
    id: 'contractor',
    name: 'Auftraggeber',
    icon: '👔',
    description: 'Du gibst den Auftrag und zahlst.',
    hint: 'Dienstleister beauftragen, Produkte kaufen, Werkverträge',
    color: '#2563eb',
    bgColor: '#eff6ff'
  },
  {
    id: 'client',
    name: 'Auftragnehmer',
    icon: '🛠️',
    description: 'Du erbringst die Leistung.',
    hint: 'Service anbieten, Produkt liefern, Auftrag ausführen',
    color: '#059669',
    bgColor: '#ecfdf5'
  },
  {
    id: 'neutral',
    name: 'Marktüblich',
    icon: '⚖️',
    description: 'Neutraler Branchenvergleich.',
    hint: 'Fairness prüfen, Verhandlungsargumente, Marktstandard',
    color: '#7c3aed',
    bgColor: '#f5f3ff'
  },
  {
    id: 'worstCase',
    name: 'Worst Case',
    icon: '⚠️',
    description: 'Was schlimmstenfalls passiert.',
    hint: 'Alle Risiken kennen, Streitfälle, wichtige Verträge',
    color: '#dc2626',
    bgColor: '#fef2f2'
  }
];

interface PerspectiveSelectionModalProps {
  onSelect: (perspective: PerspectiveType) => void;
}

const PerspectiveSelectionModal: React.FC<PerspectiveSelectionModalProps> = ({ onSelect }) => {
  const [selected, setSelected] = useState<PerspectiveType | null>(null);

  const handleConfirm = () => {
    if (selected) {
      onSelect(selected);
    }
  };

  return (
    <div className={styles.perspectiveModalOverlay}>
      <div className={styles.perspectiveModalContent}>
        <div className={styles.perspectiveModalHeader}>
          <span className={styles.perspectiveModalIcon}>🔍</span>
          <h2 className={styles.perspectiveModalTitle}>
            Aus welcher Sicht analysieren?
          </h2>
          <p className={styles.perspectiveModalSubtitle}>
            Wähle deine Rolle — die Analyse wird darauf abgestimmt.
            Du kannst die Perspektive jederzeit oben ändern.
          </p>
        </div>

        <div className={styles.perspectiveModalGrid}>
          {PERSPECTIVE_OPTIONS.map((option) => {
            const isSelected = selected === option.id;
            return (
              <button
                key={option.id}
                className={`${styles.perspectiveModalCard} ${isSelected ? styles.perspectiveModalCardSelected : ''}`}
                onClick={() => setSelected(option.id)}
                style={{
                  '--card-color': option.color,
                  '--card-bg': option.bgColor
                } as React.CSSProperties}
              >
                <span className={styles.perspectiveModalCardIcon}>{option.icon}</span>
                <span className={styles.perspectiveModalCardName}>{option.name}</span>
                <span className={styles.perspectiveModalCardDesc}>{option.description}</span>
                <span className={styles.perspectiveModalCardHint}>{option.hint}</span>
                {isSelected && (
                  <span className={styles.perspectiveModalCardCheck}>&#10003;</span>
                )}
              </button>
            );
          })}
        </div>

        <button
          className={styles.perspectiveModalConfirm}
          onClick={handleConfirm}
          disabled={!selected}
        >
          Analyse starten
        </button>
      </div>
    </div>
  );
};

export default PerspectiveSelectionModal;
