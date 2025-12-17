/**
 * LogoBlock - Firmenlogo-Block für den ContractBuilder
 */

import React from 'react';
import { Image as ImageIcon } from 'lucide-react';
import styles from './LogoBlock.module.css';

interface LogoBlockProps {
  content: {
    logoUrl?: string;
    altText?: string;
    width?: number;
    height?: number;
    alignment?: 'left' | 'center' | 'right';
  };
  isSelected: boolean;
  isPreview: boolean;
}

export const LogoBlock: React.FC<LogoBlockProps> = ({
  content,
  isSelected,
  isPreview,
}) => {
  const { logoUrl, altText = 'Firmenlogo', width = 150, alignment = 'left' } = content;

  const alignmentStyle: React.CSSProperties = {
    textAlign: alignment,
    display: 'flex',
    justifyContent: alignment === 'center' ? 'center' : alignment === 'right' ? 'flex-end' : 'flex-start',
  };

  // Wenn kein Logo-URL vorhanden, Platzhalter anzeigen
  if (!logoUrl) {
    return (
      <div
        className={`${styles.logoBlock} ${isSelected ? styles.selected : ''}`}
        style={alignmentStyle}
      >
        <div className={styles.placeholder}>
          <ImageIcon size={32} strokeWidth={1} />
          <span>Logo hier einfügen</span>
          {!isPreview && (
            <span className={styles.hint}>
              Klicken Sie hier und fügen Sie eine Logo-URL in den Eigenschaften ein
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`${styles.logoBlock} ${isSelected ? styles.selected : ''}`}
      style={alignmentStyle}
    >
      <img
        src={logoUrl}
        alt={altText}
        className={styles.logo}
        style={{
          maxWidth: width,
          height: 'auto',
        }}
        onError={(e) => {
          // Bei Ladefehler Platzhalter anzeigen
          const target = e.target as HTMLImageElement;
          target.style.display = 'none';
          const parent = target.parentElement;
          if (parent) {
            parent.innerHTML = `
              <div class="${styles.placeholder}">
                <span>Logo konnte nicht geladen werden</span>
              </div>
            `;
          }
        }}
      />
    </div>
  );
};

export default LogoBlock;
