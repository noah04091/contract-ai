/**
 * VariablesPanel - Seitenleiste für Variablen-Verwaltung
 */

import React, { useState, useMemo, useEffect } from 'react';
import { useContractBuilderStore, Variable } from '../../../stores/contractBuilderStore';
import { SYSTEM_VARIABLES } from '../../../utils/smartVariables';
import {
  Hash,
  Calendar,
  Type,
  DollarSign,
  Mail,
  Phone,
  CreditCard,
  List,
  Calculator,
  Search,
  ChevronDown,
  ChevronRight,
  CheckCircle,
  AlertCircle,
  HelpCircle,
  X,
  Zap,
  Copy,
  Clock,
  Edit3,
} from 'lucide-react';
import styles from './VariablesPanel.module.css';

interface VariablesPanelProps {
  className?: string;
}

// Variable Type Icons
const typeIcons: Record<string, React.ReactNode> = {
  text: <Type size={14} />,
  date: <Calendar size={14} />,
  number: <Hash size={14} />,
  currency: <DollarSign size={14} />,
  email: <Mail size={14} />,
  phone: <Phone size={14} />,
  iban: <CreditCard size={14} />,
  select: <List size={14} />,
  computed: <Calculator size={14} />,
};

export const VariablesPanel: React.FC<VariablesPanelProps> = ({ className }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['Allgemein']));
  const [showHelp, setShowHelp] = useState(false);
  const [showSystemVars, setShowSystemVars] = useState(false);
  const [copiedVar, setCopiedVar] = useState<string | null>(null);
  const [quickFillGroup, setQuickFillGroup] = useState<string | null>(null);
  const [quickFillValues, setQuickFillValues] = useState<Record<string, string>>({});

  const {
    document: currentDocument,
    selectedVariableId,
    updateVariable,
    setSelectedVariable,
  } = useContractBuilderStore();

  const variables = currentDocument?.content.variables || [];

  // State für die zu scrollende Variable (nach Gruppen-Öffnung)
  const [pendingScrollToVariable, setPendingScrollToVariable] = useState<string | null>(null);

  // SCHRITT 1: Variable ausgewählt → Gruppe öffnen
  useEffect(() => {
    if (selectedVariableId) {
      // Finde die Variable und ihre Gruppe
      const variable = variables.find((v: Variable) => v.id === selectedVariableId);

      if (variable) {
        const group = variable.group || 'Allgemein';

        // Gruppe expandieren
        setExpandedGroups(prev => {
          const newSet = new Set(prev);
          newSet.add(group);
          return newSet;
        });

        // Merken, dass wir zur Variable scrollen müssen
        setPendingScrollToVariable(selectedVariableId);
      }
    }
  }, [selectedVariableId, variables]);

  // SCHRITT 2: Nach Gruppen-Expansion zum Element scrollen (separater Effect!)
  useEffect(() => {
    if (pendingScrollToVariable) {
      // Multiple Frames warten, damit React das DOM vollständig aktualisiert hat
      let attempts = 0;
      const maxAttempts = 10;

      const tryScroll = () => {
        const element = document.querySelector(`[data-variable-id="${pendingScrollToVariable}"]`) as HTMLElement;

        if (element) {
          // Scroll zur Variable (smooth)
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });

          // Visuelles Feedback durch Highlighting
          element.classList.add(styles.highlight);

          // WICHTIG: Kein auto-focus! Das würde den Canvas-Input-Fokus stehlen.
          // User kann im Panel klicken wenn er dort editieren will.

          // Highlight nach 3 Sekunden entfernen
          setTimeout(() => element.classList.remove(styles.highlight), 3000);

          // Erfolgreich - pendingScrollToVariable zurücksetzen
          setPendingScrollToVariable(null);
        } else if (attempts < maxAttempts) {
          // Element noch nicht im DOM - nochmal versuchen
          attempts++;
          requestAnimationFrame(tryScroll);
        } else {
          // Element nicht gefunden - aufgeben
          setPendingScrollToVariable(null);
        }
      };

      // Starte nach kurzem Delay (für setState-Batching)
      requestAnimationFrame(tryScroll);
    }
  }, [pendingScrollToVariable, expandedGroups]);

  // Variablen nach Gruppen sortieren
  const groupedVariables = useMemo(() => {
    const groups: Record<string, Variable[]> = {};

    variables.forEach((variable: Variable) => {
      const group = variable.group || 'Allgemein';
      if (!groups[group]) {
        groups[group] = [];
      }
      groups[group].push(variable);
    });

    // Filtern nach Suche
    if (searchQuery) {
      Object.keys(groups).forEach(group => {
        groups[group] = groups[group].filter(v =>
          v.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          v.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
        if (groups[group].length === 0) {
          delete groups[group];
        }
      });
    }

    return groups;
  }, [variables, searchQuery]);

  // Gruppe ein-/ausklappen
  const toggleGroup = (group: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(group)) {
      newExpanded.delete(group);
    } else {
      newExpanded.add(group);
    }
    setExpandedGroups(newExpanded);
  };

  // Fortschritt berechnen
  const progress = useMemo(() => {
    const required = variables.filter((v: Variable) => v.required);
    const filled = required.filter((v: Variable) => v.value !== undefined && v.value !== '');
    return {
      total: required.length,
      filled: filled.length,
      percentage: required.length > 0 ? Math.round((filled.length / required.length) * 100) : 100,
    };
  }, [variables]);

  // Variable bearbeiten
  const handleValueChange = (variableId: string, value: string) => {
    updateVariable(variableId, value);
  };

  // UMGEKEHRTE NAVIGATION: Sidebar-Klick scrollt zum Canvas-Element
  const scrollToCanvasVariable = (variable: Variable) => {
    // Variable-Name ohne {{ }} extrahieren
    const varName = variable.name.replace(/^\{\{|\}\}$/g, '');

    // Element im Canvas finden (hat data-variable-name Attribut)
    const canvasElement = document.querySelector(
      `[data-variable-name="${varName}"]`
    ) as HTMLElement;

    if (canvasElement) {
      // Smooth scroll zum Element
      canvasElement.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest'
      });

      // Visuelles Highlight im Canvas
      canvasElement.style.transition = 'box-shadow 0.3s ease, transform 0.2s ease';
      canvasElement.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.5)';
      canvasElement.style.transform = 'scale(1.05)';
      canvasElement.style.borderRadius = '4px';

      // Highlight nach 2 Sekunden entfernen
      setTimeout(() => {
        canvasElement.style.boxShadow = '';
        canvasElement.style.transform = '';
      }, 2000);
    }
  };

  // SCHNELL-AUSFÜLLEN: Alle Variablen einer Gruppe auf einmal
  const startQuickFill = (group: string, vars: Variable[]) => {
    // Nur leere Variablen zum Ausfüllen vorbereiten
    const emptyVars = vars.filter(v => !v.value || v.value === '');
    if (emptyVars.length === 0) return;

    // Initiale Werte setzen
    const initialValues: Record<string, string> = {};
    emptyVars.forEach(v => {
      initialValues[v.id] = '';
    });
    setQuickFillValues(initialValues);
    setQuickFillGroup(group);
  };

  const applyQuickFill = () => {
    // Alle Werte anwenden
    Object.entries(quickFillValues).forEach(([id, value]) => {
      if (value.trim()) {
        updateVariable(id, value);
      }
    });
    // Quick-Fill beenden
    setQuickFillGroup(null);
    setQuickFillValues({});
  };

  const cancelQuickFill = () => {
    setQuickFillGroup(null);
    setQuickFillValues({});
  };

  // Input-Typ basierend auf Variable-Typ
  const renderInput = (variable: Variable) => {
    // Convert value to string for input elements
    const stringValue = variable.value instanceof Date
      ? variable.value.toISOString().split('T')[0]
      : String(variable.value ?? '');

    switch (variable.type) {
      case 'select':
        return (
          <select
            className={styles.input}
            value={stringValue}
            onChange={(e) => handleValueChange(variable.id, e.target.value)}
            onFocus={() => setSelectedVariable(variable.id)}
          >
            <option value="">Auswählen...</option>
            {variable.options?.map((option, index) => (
              <option key={index} value={option}>{option}</option>
            ))}
          </select>
        );

      case 'date':
        return (
          <input
            type="date"
            className={styles.input}
            value={stringValue}
            onChange={(e) => handleValueChange(variable.id, e.target.value)}
            onFocus={() => setSelectedVariable(variable.id)}
          />
        );

      case 'number':
      case 'currency':
        return (
          <input
            type="number"
            className={styles.input}
            value={stringValue}
            placeholder={variable.defaultValue?.toString() || '0'}
            onChange={(e) => handleValueChange(variable.id, e.target.value)}
            onFocus={() => setSelectedVariable(variable.id)}
            step={variable.type === 'currency' ? '0.01' : '1'}
          />
        );

      case 'computed':
        return (
          <div className={styles.computedValue}>
            {stringValue || 'Berechnet...'}
          </div>
        );

      default:
        return (
          <input
            type={variable.type === 'email' ? 'email' : variable.type === 'phone' ? 'tel' : 'text'}
            className={styles.input}
            value={stringValue}
            placeholder={variable.defaultValue?.toString() || `${variable.displayName} eingeben...`}
            onChange={(e) => handleValueChange(variable.id, e.target.value)}
            onFocus={() => setSelectedVariable(variable.id)}
          />
        );
    }
  };

  return (
    <div className={`${styles.panel} ${className || ''}`}>
      {/* Header */}
      <div className={styles.header}>
        <h3 className={styles.title}>Variablen</h3>
        <div className={styles.headerActions}>
          <button
            className={`${styles.helpButton} ${showHelp ? styles.active : ''}`}
            onClick={() => setShowHelp(!showHelp)}
            title="Hilfe anzeigen"
          >
            <HelpCircle size={16} />
          </button>
          <div className={styles.progressBadge}>
            {progress.filled}/{progress.total}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className={styles.progressBar}>
        <div
          className={styles.progressFill}
          style={{ width: `${progress.percentage}%` }}
        />
      </div>

      {/* Collapsible Help Section */}
      {showHelp && (
        <div className={styles.helpBanner}>
          <div className={styles.helpBannerHeader}>
            <span>So funktionieren Variablen</span>
            <button onClick={() => setShowHelp(false)}>
              <X size={14} />
            </button>
          </div>
          <div className={styles.helpBannerContent}>
            <div className={styles.helpStep}>
              <span className={styles.stepNumber}>1</span>
              <span>Klausel hinzufügen (links im Menü)</span>
            </div>
            <div className={styles.helpStep}>
              <span className={styles.stepNumber}>2</span>
              <span>Im Text <code>{'{{'}</code><strong>name</strong><code>{'}}'}</code> schreiben</span>
            </div>
            <div className={styles.helpStep}>
              <span className={styles.stepNumber}>3</span>
              <span>Auf Variable klicken → direkt Wert eingeben</span>
            </div>
            <div className={styles.helpExampleInline}>
              <span className={styles.exampleLabel}>Tipp:</span>
              <span>Variablen lassen sich direkt im Vertrag anklicken und bearbeiten!</span>
            </div>
          </div>
        </div>
      )}

      {/* System Variables Toggle */}
      <button
        className={`${styles.systemVarsToggle} ${showSystemVars ? styles.active : ''}`}
        onClick={() => setShowSystemVars(!showSystemVars)}
      >
        <Zap size={14} />
        <span>Smart Variables</span>
        {showSystemVars ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
      </button>

      {/* System Variables List */}
      {showSystemVars && (
        <div className={styles.systemVarsList}>
          <div className={styles.systemVarsIntro}>
            <p className={styles.systemVarsHint}>
              <strong>Automatische Variablen</strong> - werden beim Export mit aktuellen Werten gefüllt.
            </p>
            <div className={styles.systemVarsExample}>
              <span className={styles.exampleLabel}>Beispiel im Vertrag:</span>
              <code>Datum: {'{{heute}}'}</code>
              <span className={styles.exampleArrow}>→</span>
              <code className={styles.exampleResult}>Datum: {new Date().toLocaleDateString('de-DE')}</code>
            </div>
          </div>

          {/* Usage Hint */}
          <div className={styles.usageHint}>
            <span className={styles.usageIcon}>💡</span>
            <span>Klicke auf eine Variable zum Kopieren, dann füge sie mit <kbd>Strg+V</kbd> in eine Klausel ein.</span>
          </div>

          {['Datum', 'Zeit'].map(group => (
            <div key={group} className={styles.systemVarsGroup}>
              <div className={styles.systemVarsGroupHeader}>
                {group === 'Datum' ? <Calendar size={12} /> : <Clock size={12} />}
                <span>{group}</span>
              </div>
              <div className={styles.systemVarsItems}>
                {SYSTEM_VARIABLES.filter(v => v.group === group).map(sysVar => (
                  <button
                    key={sysVar.name}
                    className={`${styles.systemVarItem} ${copiedVar === sysVar.name ? styles.copied : ''}`}
                    onClick={() => {
                      navigator.clipboard.writeText(`{{${sysVar.name}}}`);
                      setCopiedVar(sysVar.name);
                      setTimeout(() => setCopiedVar(null), 2000);
                    }}
                    title={`${sysVar.description}\nAktueller Wert: ${sysVar.getValue()}\n\nKlicken zum Kopieren`}
                  >
                    <span className={styles.systemVarName}>{`{{${sysVar.name}}}`}</span>
                    <span className={styles.systemVarValue}>{sysVar.getValue()}</span>
                    {copiedVar === sysVar.name ? (
                      <span className={styles.copiedBadge}>
                        <CheckCircle size={12} className={styles.copiedIcon} />
                        <span>Kopiert!</span>
                      </span>
                    ) : (
                      <Copy size={12} className={styles.copyIcon} />
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <div className={styles.computedHint}>
            <Calculator size={14} />
            <span>Tipp: Nutze Berechnungen wie <code>{`{{preis * 1.19}}`}</code></span>
          </div>
        </div>
      )}

      {/* Search */}
      <div className={styles.searchWrapper}>
        <Search size={14} className={styles.searchIcon} />
        <input
          type="text"
          className={styles.searchInput}
          placeholder="Variable suchen..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Variables List */}
      <div className={styles.variablesList}>
        {Object.entries(groupedVariables).map(([group, vars]) => {
          const emptyVars = vars.filter(v => !v.value || v.value === '');
          const hasEmptyVars = emptyVars.length > 0;
          const isQuickFillActive = quickFillGroup === group;

          return (
          <div key={group} className={styles.group}>
            {/* Group Header */}
            <div className={styles.groupHeaderRow}>
              <button
                className={styles.groupHeader}
                onClick={() => toggleGroup(group)}
              >
                {expandedGroups.has(group) ? (
                  <ChevronDown size={14} />
                ) : (
                  <ChevronRight size={14} />
                )}
                <span className={styles.groupName}>{group}</span>
                <span className={styles.groupCount}>{vars.length}</span>
              </button>
              {/* Quick-Fill Button */}
              {hasEmptyVars && !isQuickFillActive && (
                <button
                  className={styles.quickFillButton}
                  onClick={(e) => {
                    e.stopPropagation();
                    startQuickFill(group, vars);
                  }}
                  title={`${emptyVars.length} leere Felder schnell ausfüllen`}
                >
                  <Edit3 size={12} />
                  <span>{emptyVars.length}</span>
                </button>
              )}
            </div>

            {/* Quick-Fill Mode */}
            {isQuickFillActive && (
              <div className={styles.quickFillForm}>
                <div className={styles.quickFillHeader}>
                  <span>Schnell-Ausfüllen: {group}</span>
                  <button onClick={cancelQuickFill} className={styles.quickFillClose}>
                    <X size={14} />
                  </button>
                </div>
                <div className={styles.quickFillFields}>
                  {emptyVars.map(variable => (
                    <div key={variable.id} className={styles.quickFillField}>
                      <label>{variable.displayName}</label>
                      <input
                        type="text"
                        value={quickFillValues[variable.id] || ''}
                        onChange={(e) => setQuickFillValues(prev => ({
                          ...prev,
                          [variable.id]: e.target.value
                        }))}
                        placeholder={`${variable.displayName} eingeben...`}
                        autoFocus={emptyVars.indexOf(variable) === 0}
                      />
                    </div>
                  ))}
                </div>
                <div className={styles.quickFillActions}>
                  <button onClick={cancelQuickFill} className={styles.quickFillCancel}>
                    Abbrechen
                  </button>
                  <button onClick={applyQuickFill} className={styles.quickFillApply}>
                    <CheckCircle size={14} />
                    Alle übernehmen
                  </button>
                </div>
              </div>
            )}

            {/* Group Content - nur anzeigen wenn nicht im Quick-Fill Modus */}
            {expandedGroups.has(group) && !isQuickFillActive && (
              <div className={styles.groupContent}>
                {vars.map(variable => {
                  const isFilled = variable.value !== undefined && variable.value !== '';
                  const isSelected = selectedVariableId === variable.id;
                  const isEmptyRequired = variable.required && !isFilled;

                  return (
                    <div
                      key={variable.id}
                      data-variable-id={variable.id}
                      className={`
                        ${styles.variableItem}
                        ${isSelected ? styles.selected : ''}
                        ${isFilled ? styles.filled : ''}
                        ${isEmptyRequired ? styles.emptyRequired : ''}
                      `}
                      onClick={() => {
                        setSelectedVariable(variable.id);
                        scrollToCanvasVariable(variable);
                      }}
                    >
                      {/* Variable Header */}
                      <div className={styles.variableHeader}>
                        <span className={styles.variableIcon}>
                          {typeIcons[variable.type] || <Type size={14} />}
                        </span>
                        <span className={styles.variableName}>
                          {variable.displayName}
                        </span>
                        {variable.required && (
                          <span className={styles.requiredBadge}>*</span>
                        )}
                        <span className={styles.statusIcon}>
                          {isFilled ? (
                            <CheckCircle size={12} className={styles.filledIcon} />
                          ) : variable.required ? (
                            <AlertCircle size={12} className={styles.emptyIcon} />
                          ) : null}
                        </span>
                      </div>

                      {/* Variable Input */}
                      <div className={styles.variableInput}>
                        {renderInput(variable)}
                      </div>

                      {/* Variable ID (for developers) */}
                      <div className={styles.variableId}>
                        {variable.name}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}

        {/* Empty State with Clear CTA */}
        {Object.keys(groupedVariables).length === 0 && (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>
              <Type size={40} strokeWidth={1.5} />
            </div>
            <h4 className={styles.emptyTitle}>Noch keine Variablen</h4>
            <p className={styles.emptyText}>
              Fügen Sie links eine <strong>Klausel</strong> hinzu – sie enthält bereits Beispiel-Variablen!
            </p>
            <button
              className={styles.showHelpButton}
              onClick={() => setShowHelp(true)}
            >
              <HelpCircle size={14} />
              <span>Wie funktionieren Variablen?</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default VariablesPanel;
