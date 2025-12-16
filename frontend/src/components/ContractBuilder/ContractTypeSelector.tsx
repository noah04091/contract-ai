/**
 * ContractTypeSelector - Modal zur Auswahl des Vertragstyps
 */

import React, { useState } from 'react';
import {
  Briefcase,
  Handshake,
  Hammer,
  ShoppingCart,
  Home,
  Banknote,
  Lock,
  Users,
  FileKey,
  GraduationCap,
  Store,
  FileEdit,
  Building,
  User,
  Search,
  X,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { contractTemplates, templateCategories, ContractTemplate } from '../../data/contractTemplates';
import styles from './ContractTypeSelector.module.css';

interface ContractTypeSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (templateId: string) => void;
}

// Icon mapping
const iconMap: Record<string, React.ComponentType<{ size?: number }>> = {
  Briefcase,
  Handshake,
  Hammer,
  ShoppingCart,
  Home,
  Banknote,
  Lock,
  Users,
  FileKey,
  GraduationCap,
  Store,
  FileEdit,
  Building,
  User,
};

export const ContractTypeSelector: React.FC<ContractTypeSelectorProps> = ({
  isOpen,
  onClose,
  onSelect,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [hoveredTemplate, setHoveredTemplate] = useState<ContractTemplate | null>(null);

  if (!isOpen) return null;

  // Filter templates based on search and category
  const filteredTemplates = contractTemplates.filter(template => {
    const matchesSearch = searchQuery === '' ||
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === null || template.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleSelect = (templateId: string) => {
    // Nur onSelect aufrufen - der Parent ist verantwortlich für das Schließen
    onSelect(templateId);
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <Sparkles size={24} className={styles.headerIcon} />
            <div>
              <h2 className={styles.title}>Neuen Vertrag erstellen</h2>
              <p className={styles.subtitle}>Wählen Sie einen Vertragstyp als Grundlage</p>
            </div>
          </div>
          <button className={styles.closeButton} onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Search */}
        <div className={styles.searchSection}>
          <div className={styles.searchWrapper}>
            <Search size={18} className={styles.searchIcon} />
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Vertragstyp suchen..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
          </div>
        </div>

        {/* Categories */}
        <div className={styles.categories}>
          <button
            className={`${styles.categoryButton} ${selectedCategory === null ? styles.active : ''}`}
            onClick={() => setSelectedCategory(null)}
          >
            Alle
          </button>
          {templateCategories.map(cat => {
            const Icon = iconMap[cat.icon] || FileEdit;
            return (
              <button
                key={cat.id}
                className={`${styles.categoryButton} ${selectedCategory === cat.id ? styles.active : ''}`}
                onClick={() => setSelectedCategory(cat.id)}
              >
                <Icon size={14} />
                <span>{cat.name}</span>
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className={styles.content}>
          {/* Template Grid */}
          <div className={styles.templateGrid}>
            {filteredTemplates.map(template => {
              const Icon = iconMap[template.icon] || FileEdit;
              return (
                <button
                  key={template.id}
                  className={`${styles.templateCard} ${template.id === 'individuell' ? styles.customCard : ''}`}
                  onClick={() => handleSelect(template.id)}
                  onMouseEnter={() => setHoveredTemplate(template)}
                  onMouseLeave={() => setHoveredTemplate(null)}
                >
                  <div className={styles.templateIcon}>
                    <Icon size={28} />
                  </div>
                  <div className={styles.templateInfo}>
                    <h3 className={styles.templateName}>{template.name}</h3>
                    <p className={styles.templateDescription}>{template.description}</p>
                  </div>
                  <ChevronRight size={18} className={styles.templateArrow} />
                </button>
              );
            })}
          </div>

          {/* Preview Panel - immer gerendert um Layout-Shifts zu vermeiden */}
          <div className={`${styles.previewPanel} ${hoveredTemplate && hoveredTemplate.id !== 'individuell' ? styles.previewVisible : ''}`}>
            {hoveredTemplate && hoveredTemplate.id !== 'individuell' ? (
              <>
                <h4 className={styles.previewTitle}>
                  {hoveredTemplate.name} enthält:
                </h4>

                <div className={styles.previewSection}>
                  <span className={styles.previewLabel}>Parteien:</span>
                  <div className={styles.previewParties}>
                    <span>{hoveredTemplate.parties.party1.role}</span>
                    <span className={styles.previewDivider}>&</span>
                    <span>{hoveredTemplate.parties.party2.role}</span>
                  </div>
                </div>

                <div className={styles.previewSection}>
                  <span className={styles.previewLabel}>
                    {hoveredTemplate.suggestedClauses.length} vorbereitete Klauseln:
                  </span>
                  <ul className={styles.previewList}>
                    {hoveredTemplate.suggestedClauses.slice(0, 5).map((clause, index) => (
                      <li key={index}>{clause.title}</li>
                    ))}
                    {hoveredTemplate.suggestedClauses.length > 5 && (
                      <li className={styles.previewMore}>
                        + {hoveredTemplate.suggestedClauses.length - 5} weitere
                      </li>
                    )}
                  </ul>
                </div>

                <div className={styles.previewSection}>
                  <span className={styles.previewLabel}>
                    {hoveredTemplate.defaultVariables.length} Variablen:
                  </span>
                  <div className={styles.previewVariables}>
                    {hoveredTemplate.defaultVariables.slice(0, 6).map((v, index) => (
                      <span key={index} className={styles.previewVariable}>
                        {v.displayName}
                      </span>
                    ))}
                    {hoveredTemplate.defaultVariables.length > 6 && (
                      <span className={styles.previewVariableMore}>
                        +{hoveredTemplate.defaultVariables.length - 6}
                      </span>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className={styles.previewEmpty}>
                <p>Fahre mit der Maus über einen Vertragstyp um Details zu sehen</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <p className={styles.footerNote}>
            Alle Vorlagen können nach der Auswahl vollständig angepasst werden.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ContractTypeSelector;
