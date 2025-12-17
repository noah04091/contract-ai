// 📁 components/LegalLens/IndustrySelector.tsx
// Branchen-Auswahl für kontextspezifische Analyse

import React, { useState, useRef, useEffect } from 'react';
import { Building2, ChevronDown, Check, Info } from 'lucide-react';
import type { IndustryType, IndustryInfo } from '../../types/legalLens';
import { INDUSTRIES } from '../../types/legalLens';
import styles from '../../styles/IndustrySelector.module.css';

interface IndustrySelectorProps {
  currentIndustry: IndustryType;
  onIndustryChange: (industry: IndustryType) => void;
  disabled?: boolean;
  compact?: boolean;
}

const IndustrySelector: React.FC<IndustrySelectorProps> = ({
  currentIndustry,
  onIndustryChange,
  disabled = false,
  compact = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showTooltip, setShowTooltip] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Aktuelle Branche finden
  const currentIndustryInfo = INDUSTRIES.find(i => i.id === currentIndustry) || INDUSTRIES[INDUSTRIES.length - 1];

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Branche auswählen
  const handleSelect = (industry: IndustryInfo) => {
    onIndustryChange(industry.id);
    setIsOpen(false);
  };

  return (
    <div className={`${styles.selectorContainer} ${compact ? styles.compact : ''}`} ref={dropdownRef}>
      <button
        className={`${styles.selectorButton} ${isOpen ? styles.open : ''}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        title={`Branche: ${currentIndustryInfo.name}`}
      >
        <span className={styles.buttonIcon}>{currentIndustryInfo.icon}</span>
        {!compact && (
          <>
            <span className={styles.buttonLabel}>{currentIndustryInfo.name}</span>
            <ChevronDown size={16} className={`${styles.chevron} ${isOpen ? styles.rotated : ''}`} />
          </>
        )}
      </button>

      {isOpen && (
        <div className={styles.dropdown}>
          <div className={styles.dropdownHeader}>
            <Building2 size={16} />
            <span>Branchen-Kontext</span>
          </div>
          <p className={styles.dropdownHint}>
            Wähle deine Branche für spezifischere Analysen
          </p>

          <div className={styles.optionsList}>
            {INDUSTRIES.map((industry) => (
              <button
                key={industry.id}
                className={`${styles.option} ${industry.id === currentIndustry ? styles.selected : ''}`}
                onClick={() => handleSelect(industry)}
                onMouseEnter={() => setShowTooltip(industry.id)}
                onMouseLeave={() => setShowTooltip(null)}
              >
                <span className={styles.optionIcon}>{industry.icon}</span>
                <div className={styles.optionContent}>
                  <span className={styles.optionName}>{industry.name}</span>
                  <span className={styles.optionDescription}>{industry.description}</span>
                </div>
                {industry.id === currentIndustry && (
                  <Check size={16} className={styles.checkIcon} />
                )}
              </button>
            ))}
          </div>

          {/* Tooltip für Key Terms */}
          {showTooltip && (
            <div className={styles.tooltip}>
              <div className={styles.tooltipHeader}>
                <Info size={14} />
                <span>Worauf wird geachtet:</span>
              </div>
              <div className={styles.tooltipKeywords}>
                {INDUSTRIES.find(i => i.id === showTooltip)?.keyTerms.map((term, idx) => (
                  <span key={idx} className={styles.keyword}>{term}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default IndustrySelector;
