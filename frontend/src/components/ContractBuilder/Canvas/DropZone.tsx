/**
 * DropZone - Bereich zum Ablegen neuer Blöcke
 */

import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { Plus, FileText } from 'lucide-react';
import styles from './DropZone.module.css';

interface DropZoneProps {
  position: number;
  isEmpty?: boolean;
  message?: string;
}

export const DropZone: React.FC<DropZoneProps> = ({
  position,
  isEmpty = false,
  message,
}) => {
  const { isOver, setNodeRef } = useDroppable({
    id: `dropzone-${position}`,
    data: {
      position,
      type: 'dropzone',
    },
  });

  if (isEmpty) {
    return (
      <div
        ref={setNodeRef}
        className={`${styles.emptyDropZone} ${isOver ? styles.over : ''}`}
      >
        <div className={styles.emptyContent}>
          <div className={styles.iconWrapper}>
            <FileText size={48} strokeWidth={1} />
            <Plus size={20} className={styles.plusIcon} />
          </div>
          <p className={styles.message}>
            {message || 'Blöcke hierher ziehen'}
          </p>
          <p className={styles.hint}>
            Wählen Sie einen Block aus der Seitenleiste oder drücken Sie <kbd>+</kbd>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      className={`${styles.dropZone} ${isOver ? styles.over : ''}`}
      data-position={position}
    >
      <div className={styles.indicator}>
        <Plus size={12} />
      </div>
    </div>
  );
};

export default DropZone;
