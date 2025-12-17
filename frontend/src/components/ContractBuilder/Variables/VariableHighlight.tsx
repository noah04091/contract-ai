/**
 * VariableHighlight - Hebt {{variablen}} im Text hervor
 * Unterstützt: System-Variablen ({{heute}}), Berechnungen ({{preis * 1.19}})
 */

import React, { useMemo } from 'react';
import { useContractBuilderStore, Variable } from '../../../stores/contractBuilderStore';
import { resolveSmartVariable } from '../../../utils/smartVariables';
import styles from './VariableHighlight.module.css';

interface VariableHighlightProps {
  text: string;
  multiline?: boolean;
}

// Regex für {{variable_name}} oder {{berechnung}}
const VARIABLE_PATTERN = /\{\{([^}]+)\}\}/g;

export const VariableHighlight: React.FC<VariableHighlightProps> = ({
  text,
  multiline = false,
}) => {
  const { document: currentDocument, setSelectedVariable } = useContractBuilderStore();
  const variables = currentDocument?.content.variables || [];

  // Variable-Werte als Map für Berechnungen
  const variableValuesMap = useMemo(() => {
    const map = new Map<string, string | number>();
    variables.forEach((v: Variable) => {
      if (v.value !== undefined && v.value !== '') {
        // Name ohne {{ }} speichern
        const cleanName = v.name.replace(/^\{\{|\}\}$/g, '');
        // Date zu String konvertieren
        if (v.value instanceof Date) {
          map.set(cleanName, v.value.toLocaleDateString('de-DE'));
        } else {
          map.set(cleanName, v.value);
        }
      }
    });
    return map;
  }, [variables]);

  // Text in Segmente aufteilen
  const segments = useMemo(() => {
    const result: Array<{
      type: 'text' | 'variable';
      content: string;
      variableName?: string;
      value?: string;
      isFilled?: boolean;
      varType?: 'system' | 'computed' | 'user';
    }> = [];

    let lastIndex = 0;
    let match;

    // Reset regex
    VARIABLE_PATTERN.lastIndex = 0;

    while ((match = VARIABLE_PATTERN.exec(text)) !== null) {
      // Text vor der Variable
      if (match.index > lastIndex) {
        result.push({
          type: 'text',
          content: text.slice(lastIndex, match.index),
        });
      }

      // Variable finden und Smart-Auflösung versuchen
      const variableName = match[1].trim();
      const resolved = resolveSmartVariable(variableName, variableValuesMap);

      // Für normale User-Variablen: Wert aus Store holen falls nicht resolved
      let finalValue = resolved.value;
      let hasValue = finalValue !== null && finalValue !== '';

      if (resolved.type === 'user' && !hasValue) {
        const variable = variables.find((v: { name: string }) => v.name === `{{${variableName}}}`);
        if (variable?.value !== undefined && variable?.value !== '') {
          finalValue = String(variable.value);
          hasValue = true;
        }
      }

      result.push({
        type: 'variable',
        content: match[0],
        variableName,
        value: hasValue ? finalValue! : undefined,
        isFilled: hasValue,
        varType: resolved.type,
      });

      lastIndex = match.index + match[0].length;
    }

    // Rest des Texts
    if (lastIndex < text.length) {
      result.push({
        type: 'text',
        content: text.slice(lastIndex),
      });
    }

    return result;
  }, [text, variables, variableValuesMap]);

  // Variable auswählen (nur für User-Variablen)
  const handleVariableClick = (variableName: string, varType?: string) => {
    // System-Variablen sind nicht editierbar
    if (varType === 'system' || varType === 'computed') return;

    // Finde die Variable anhand des Namens und übergebe die ID
    const variable = variables.find((v: Variable) =>
      v.name === `{{${variableName}}}` || v.name === variableName
    );

    if (variable) {
      setSelectedVariable(variable.id);
    }
  };

  // Tooltip-Text basierend auf Typ
  const getTooltip = (segment: typeof segments[0]) => {
    if (segment.varType === 'system') {
      return `⚡ System: ${segment.variableName} → ${segment.value}`;
    }
    if (segment.varType === 'computed') {
      return segment.isFilled
        ? `🔢 Berechnung: ${segment.variableName} = ${segment.value}`
        : `🔢 Berechnung: ${segment.variableName} (Werte fehlen)`;
    }
    return segment.isFilled
      ? `${segment.variableName}: ${segment.value}`
      : `Variable: ${segment.variableName} (nicht ausgefüllt)`;
  };

  // Render
  const content = segments.map((segment, index) => {
    if (segment.type === 'text') {
      return <span key={index}>{segment.content}</span>;
    }

    // CSS-Klasse basierend auf Typ und Status
    const varClass = [
      styles.variable,
      segment.isFilled ? styles.filled : styles.empty,
      segment.varType === 'system' ? styles.system : '',
      segment.varType === 'computed' ? styles.computed : '',
    ].filter(Boolean).join(' ');

    return (
      <span
        key={index}
        className={varClass}
        onClick={(e) => {
          e.stopPropagation();
          handleVariableClick(segment.variableName!, segment.varType);
        }}
        title={getTooltip(segment)}
        style={{
          cursor: segment.varType === 'system' || segment.varType === 'computed' ? 'default' : 'pointer'
        }}
      >
        {segment.isFilled ? segment.value : segment.content}
      </span>
    );
  });

  if (multiline) {
    return <div className={styles.multiline}>{content}</div>;
  }

  return <span className={styles.inline}>{content}</span>;
};

export default VariableHighlight;
