/**
 * VariableHighlight - Hebt {{variablen}} im Text hervor
 */

import React, { useMemo } from 'react';
import { useContractBuilderStore } from '../../../stores/contractBuilderStore';
import styles from './VariableHighlight.module.css';

interface VariableHighlightProps {
  text: string;
  multiline?: boolean;
}

// Regex für {{variable_name}}
const VARIABLE_PATTERN = /\{\{([^}]+)\}\}/g;

export const VariableHighlight: React.FC<VariableHighlightProps> = ({
  text,
  multiline = false,
}) => {
  const { document: currentDocument, setSelectedVariable } = useContractBuilderStore();
  const variables = currentDocument?.content.variables || [];

  // Text in Segmente aufteilen
  const segments = useMemo(() => {
    const result: Array<{
      type: 'text' | 'variable';
      content: string;
      variableName?: string;
      value?: string;
      isFilled?: boolean;
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

      // Variable finden
      const variableName = match[1];
      const variable = variables.find((v: { name: string }) => v.name === `{{${variableName}}}`);
      const hasValue = variable?.value !== undefined && variable?.value !== '';

      result.push({
        type: 'variable',
        content: match[0],
        variableName,
        value: hasValue ? String(variable.value) : undefined,
        isFilled: hasValue,
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
  }, [text, variables]);

  // Variable auswählen
  const handleVariableClick = (variableName: string) => {
    setSelectedVariable(variableName);
  };

  // Render
  const content = segments.map((segment, index) => {
    if (segment.type === 'text') {
      return <span key={index}>{segment.content}</span>;
    }

    return (
      <span
        key={index}
        className={`
          ${styles.variable}
          ${segment.isFilled ? styles.filled : styles.empty}
        `}
        onClick={(e) => {
          e.stopPropagation();
          handleVariableClick(segment.variableName!);
        }}
        title={segment.isFilled
          ? `${segment.variableName}: ${segment.value}`
          : `Variable: ${segment.variableName} (nicht ausgefüllt)`
        }
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
