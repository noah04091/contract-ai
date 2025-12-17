// DashboardWidget - Wrapper für alle Dashboard Widgets mit Drag & Drop Support

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { WidgetId } from '../types/dashboard';
import styles from './DashboardWidget.module.css';

interface DashboardWidgetProps {
  id: WidgetId;
  children: React.ReactNode;
  isEditMode?: boolean;
  onRemove?: (id: WidgetId) => void;
  className?: string;
}

export function DashboardWidget({
  id,
  children,
  isEditMode = false,
  onRemove,
  className = '',
}: DashboardWidgetProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled: !isEditMode });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 'auto',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${styles.widgetContainer} ${isDragging ? styles.dragging : ''} ${isEditMode ? styles.editMode : ''} ${className}`}
    >
      {/* Drag Handle - nur im Edit Mode sichtbar */}
      {isEditMode && (
        <div className={styles.widgetControls}>
          <button
            className={styles.dragHandle}
            {...attributes}
            {...listeners}
            title="Ziehen zum Verschieben"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
            >
              <path
                d="M8 6H8.01M8 12H8.01M8 18H8.01M16 6H16.01M16 12H16.01M16 18H16.01"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          {onRemove && (
            <button
              className={styles.removeButton}
              onClick={() => onRemove(id)}
              title="Widget ausblenden"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
              >
                <path
                  d="M18 6L6 18M6 6L18 18"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          )}
        </div>
      )}

      {/* Widget Content */}
      <div className={styles.widgetContent}>{children}</div>
    </div>
  );
}

export default DashboardWidget;
