/**
 * HeaderBlock - Vertragskopf mit Titel und optionalem Logo
 */

import React from 'react';
import { BlockContent } from '../../../stores/contractBuilderStore';
import { VariableHighlight } from '../Variables/VariableHighlight';
import styles from './HeaderBlock.module.css';

interface HeaderBlockProps {
  content: BlockContent;
  isSelected: boolean;
  isPreview: boolean;
}

export const HeaderBlock: React.FC<HeaderBlockProps> = ({
  content,
  isSelected,
  isPreview,
}) => {
  const { title, subtitle, logo } = content;

  return (
    <div className={`${styles.header} ${isSelected ? styles.selected : ''}`}>
      {/* Logo */}
      {logo && (
        <div className={styles.logoWrapper}>
          <img
            src={logo}
            alt="Logo"
            className={styles.logo}
          />
        </div>
      )}

      {/* Titel */}
      <h1 className={styles.title}>
        {isPreview ? (
          title || 'Vertragstitel'
        ) : (
          <VariableHighlight text={title || 'Vertragstitel'} />
        )}
      </h1>

      {/* Untertitel */}
      {subtitle && (
        <p className={styles.subtitle}>
          {isPreview ? (
            subtitle
          ) : (
            <VariableHighlight text={subtitle} />
          )}
        </p>
      )}

      {/* Decorative Line */}
      <div className={styles.decorativeLine} />
    </div>
  );
};

export default HeaderBlock;
