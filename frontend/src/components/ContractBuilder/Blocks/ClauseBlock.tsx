/**
 * ClauseBlock - Standard-Vertragsklausel mit Nummerierung
 */

import React from 'react';
import { BlockContent } from '../../../stores/contractBuilderStore';
import { VariableHighlight } from '../Variables/VariableHighlight';
import styles from './ClauseBlock.module.css';

interface ClauseBlockProps {
  content: BlockContent;
  isSelected: boolean;
  isPreview: boolean;
}

export const ClauseBlock: React.FC<ClauseBlockProps> = ({
  content,
  isSelected,
  isPreview,
}) => {
  const { number, clauseTitle, body, subclauses } = content;

  // Paragraphen-Nummer formatieren
  const formatNumber = (num: string | undefined) => {
    if (!num || num === 'auto') return '§';
    if (num.startsWith('§')) return num;
    return `§ ${num}`;
  };

  return (
    <div className={`${styles.clause} ${isSelected ? styles.selected : ''}`}>
      {/* Klausel-Header */}
      <div className={styles.clauseHeader}>
        <span className={styles.clauseNumber}>
          {formatNumber(number)}
        </span>
        <h3 className={styles.clauseTitle}>
          {isPreview ? (
            clauseTitle || 'Klauseltitel'
          ) : (
            <VariableHighlight text={clauseTitle || 'Klauseltitel'} />
          )}
        </h3>
      </div>

      {/* Klausel-Body */}
      {body && (
        <div className={styles.clauseBody}>
          {isPreview ? (
            <p>{body}</p>
          ) : (
            <VariableHighlight text={body} multiline />
          )}
        </div>
      )}

      {/* Unterklauseln */}
      {subclauses && subclauses.length > 0 && (
        <ol className={styles.subclauses}>
          {subclauses.map((sub, index) => (
            <li key={index} className={styles.subclause}>
              <span className={styles.subclauseNumber}>
                {sub.number || `(${index + 1})`}
              </span>
              <span className={styles.subclauseText}>
                {isPreview ? (
                  sub.text
                ) : (
                  <VariableHighlight text={sub.text || ''} />
                )}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
};

export default ClauseBlock;
