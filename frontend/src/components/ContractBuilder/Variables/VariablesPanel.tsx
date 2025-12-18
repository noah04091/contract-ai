/**
 * VariablesPanel - Seitenleiste für Variablen-Verwaltung
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
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
  const variablesListRef = useRef<HTMLDivElement>(null);

  const {
    document: currentDocument,
    selectedVariableId,
    updateVariable,
    setSelectedVariable,
  } = useContractBuilderStore();

  const variables = currentDocument?.content.variables || [];

  // Auto-Scroll zur ausgewählten Variable UND Gruppe öffnen
  useEffect(() => {
    if (selectedVariableId && variablesListRef.current) {
      // Finde die Variable und ihre Gruppe
      const variable = variables.find((v: Variable) => v.id === selectedVariableId);
      console.log('[VariablesPanel] Variable ausgewählt:', selectedVariableId, 'Gefunden:', variable?.displayName);

      if (variable) {
        const group = variable.group || 'Allgemein';
        console.log('[VariablesPanel] Öffne Gruppe:', group);

        // Gruppe expandieren - ALLE anderen schließen für Fokus
        setExpandedGroups(new Set([group]));

        // Nach kurzer Verzögerung zum Element scrollen (damit DOM aktualisiert ist)
        setTimeout(() => {
          const element = document.querySelector(`[data-variable-id="${selectedVariableId}"]`) as HTMLElement;
          console.log('[VariablesPanel] Element gefunden:', !!element);

          if (element) {
            // Scroll zur Variable
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });

            // Visuelles Feedback durch Highlighting
            element.classList.add(styles.highlight);

            // Input-Feld finden und fokussieren
            const input = element.querySelector('input, select') as HTMLInputElement;
            if (input) {
              setTimeout(() => input.focus(), 200);
            }

            // Highlight nach 3 Sekunden entfernen
            setTimeout(() => element.classList.remove(styles.highlight), 3000);
          }
        }, 150); // Etwas mehr Zeit für DOM-Update
      }
    }
  }, [selectedVariableId, variables]);

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
              <span>Variable erscheint hier → Wert eingeben</span>
            </div>
            <div className={styles.helpExampleInline}>
              <span className={styles.exampleLabel}>Beispiel:</span>
              <code>{'{{kundenname}}'}</code>
              <span className={styles.exampleArrowInline}>→</span>
              <span className={styles.exampleValue}>Max Mustermann</span>
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
        {Object.entries(groupedVariables).map(([group, vars]) => (
          <div key={group} className={styles.group}>
            {/* Group Header */}
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

            {/* Group Content */}
            {expandedGroups.has(group) && (
              <div className={styles.groupContent}>
                {vars.map(variable => {
                  const isFilled = variable.value !== undefined && variable.value !== '';
                  const isSelected = selectedVariableId === variable.id;

                  return (
                    <div
                      key={variable.id}
                      data-variable-id={variable.id}
                      className={`
                        ${styles.variableItem}
                        ${isSelected ? styles.selected : ''}
                        ${isFilled ? styles.filled : ''}
                      `}
                      onClick={() => setSelectedVariable(variable.id)}
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
