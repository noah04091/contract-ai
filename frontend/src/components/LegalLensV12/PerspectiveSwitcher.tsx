// 📁 components/LegalLens/PerspectiveSwitcher.tsx
// Kompakter Dropdown-Perspektiven-Wechsler mit ? Hilfe-Icon

import React, { useState, useRef, useEffect } from 'react';
import { HelpCircle, ChevronDown } from 'lucide-react';
import type { PerspectiveType } from '../../types/legalLens';
import styles from '../../styles/LegalLensV12.module.css';

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
  const [dropdownOpen, setDropdownOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const helpRef = useRef<HTMLDivElement>(null);
  const currentInfo = PERSPECTIVES_ENHANCED.find(p => p.id === currentPerspective);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
      if (helpRef.current && !helpRef.current.contains(e.target as Node)) {
        setShowHelp(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={styles.perspectiveSwitcherEnhanced}>
      <div className={styles.perspectiveDropdownRow}>
        {/* Compact Dropdown */}
        <div className={styles.perspectiveDropdownWrapper} ref={dropdownRef}>
          <button
            className={`${styles.perspectiveDropdownTrigger} ${dropdownOpen ? styles.open : ''}`}
            onClick={() => setDropdownOpen(!dropdownOpen)}
            disabled={disabled}
            style={{ '--perspective-color': currentInfo?.color, '--perspective-bg': currentInfo?.bgColor } as React.CSSProperties}
          >
            <span className={styles.perspectiveDropdownIcon}>{currentInfo?.icon}</span>
            <span className={styles.perspectiveDropdownName}>{currentInfo?.name}</span>
            <ChevronDown size={14} className={`${styles.perspectiveDropdownChevron} ${dropdownOpen ? styles.rotated : ''}`} />
          </button>

          {dropdownOpen && (
            <div className={styles.perspectiveDropdownMenu}>
              {PERSPECTIVES_ENHANCED.map((p) => {
                const isActive = currentPerspective === p.id;
                return (
                  <button
                    key={p.id}
                    className={`${styles.perspectiveDropdownItem} ${isActive ? styles.active : ''}`}
                    onClick={() => {
                      onChangePerspective(p.id);
                      setDropdownOpen(false);
                    }}
                    disabled={disabled}
                  >
                    <span className={styles.perspectiveDropdownItemIcon}>{p.icon}</span>
                    <div className={styles.perspectiveDropdownItemText}>
                      <span className={styles.perspectiveDropdownItemName}>{p.name}</span>
                      <span className={styles.perspectiveDropdownItemDesc}>{p.description}</span>
                    </div>
                    {isActive && <span className={styles.perspectiveDropdownCheck}>&#10003;</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Separate ? Help Icon */}
        <div ref={helpRef} style={{ position: 'relative' }}>
          <button
            className={`${styles.perspectiveHelpIcon} ${showHelp ? styles.active : ''}`}
            onClick={() => setShowHelp(!showHelp)}
            title="Perspektiven erklärt"
          >
            <HelpCircle size={16} />
          </button>

          {showHelp && (
            <div className={styles.perspectiveHelpPopover}>
              <div className={styles.perspectiveHelpTitle}>
                Welche Perspektive ist richtig?
              </div>
              <div className={styles.perspectiveHelpList}>
                {PERSPECTIVES_ENHANCED.map((p) => (
                  <div key={p.id} className={styles.perspectiveHelpListItem} style={{ borderLeftColor: p.color }}>
                    <div className={styles.perspectiveHelpItemHeader}>
                      <span>{p.icon}</span>
                      <strong>{p.name}</strong>
                    </div>
                    <p className={styles.perspectiveHelpItemDesc}>{p.longDescription}</p>
                    <ul className={styles.perspectiveHelpUseCasesList}>
                      {p.useCases.map((uc, idx) => (
                        <li key={idx}>{uc}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PerspectiveSwitcher;
