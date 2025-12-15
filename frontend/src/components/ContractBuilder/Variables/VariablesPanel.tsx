/**
 * VariablesPanel - Seitenleiste für Variablen-Verwaltung
 */

import React, { useState, useMemo } from 'react';
import { useContractBuilderStore, Variable } from '../../../stores/contractBuilderStore';
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

  const {
    document: currentDocument,
    selectedVariableId,
    updateVariable,
    setSelectedVariable,
  } = useContractBuilderStore();

  const variables = currentDocument?.content.variables || [];

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
        <div className={styles.progressBadge}>
          {progress.filled}/{progress.total}
        </div>
      </div>

      {/* Progress Bar */}
      <div className={styles.progressBar}>
        <div
          className={styles.progressFill}
          style={{ width: `${progress.percentage}%` }}
        />
      </div>

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

        {/* Empty State */}
        {Object.keys(groupedVariables).length === 0 && (
          <div className={styles.emptyState}>
            <Type size={32} strokeWidth={1} />
            <p>Keine Variablen gefunden</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default VariablesPanel;
