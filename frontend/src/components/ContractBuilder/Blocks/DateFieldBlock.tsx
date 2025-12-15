/**
 * DateFieldBlock - Datumsfeld
 */

import React from 'react';
import { BlockContent } from '../../../stores/contractBuilderStore';
import { Calendar } from 'lucide-react';
import styles from './DateFieldBlock.module.css';

interface DateFieldBlockProps {
  content: BlockContent;
  isSelected: boolean;
  isPreview: boolean;
}

export const DateFieldBlock: React.FC<DateFieldBlockProps> = ({
  content,
  isSelected,
  isPreview,
}) => {
  // Das Datum könnte als Variable gespeichert sein
  const dateValue = content.body || new Date().toLocaleDateString('de-DE');

  return (
    <div className={`${styles.dateField} ${isSelected ? styles.selected : ''}`}>
      <div className={styles.dateWrapper}>
        <Calendar size={14} className={styles.icon} />
        <span className={styles.dateLabel}>Datum:</span>
        <span className={styles.dateValue}>
          {isPreview ? dateValue : `{{datum}}`}
        </span>
      </div>
    </div>
  );
};

export default DateFieldBlock;
