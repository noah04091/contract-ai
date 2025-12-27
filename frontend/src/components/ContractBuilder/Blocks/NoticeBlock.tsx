/**
 * NoticeBlock - Hinweis/Info-Box
 * Für Widerrufsbelehrung, wichtige Hinweise, Datenschutzhinweise etc.
 * Verschiedene Typen: info, warning, important, legal
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { BlockContent, useContractBuilderStore } from '../../../stores/contractBuilderStore';
import { VariableHighlight } from '../Variables/VariableHighlight';
import { Info, AlertTriangle, AlertCircle, Scale } from 'lucide-react';
import styles from './NoticeBlock.module.css';

interface NoticeBlockProps {
  blockId: string;
  content: BlockContent;
  isSelected: boolean;
  isPreview: boolean;
}

type EditingField = 'title' | 'text' | null;

// Typ-Konfigurationen
const noticeTypeConfig = {
  info: {
    icon: Info,
    defaultTitle: 'Hinweis',
    defaultBorder: '#3b82f6',
    defaultBackground: '#eff6ff',
    iconColor: '#3b82f6',
  },
  warning: {
    icon: AlertTriangle,
    defaultTitle: 'Wichtiger Hinweis',
    defaultBorder: '#f59e0b',
    defaultBackground: '#fffbeb',
    iconColor: '#f59e0b',
  },
  important: {
    icon: AlertCircle,
    defaultTitle: 'Achtung',
    defaultBorder: '#ef4444',
    defaultBackground: '#fef2f2',
    iconColor: '#ef4444',
  },
  legal: {
    icon: Scale,
    defaultTitle: 'Widerrufsbelehrung',
    defaultBorder: '#6366f1',
    defaultBackground: '#eef2ff',
    iconColor: '#6366f1',
  },
};

export const NoticeBlock: React.FC<NoticeBlockProps> = ({
  blockId,
  content,
  isSelected,
  isPreview,
}) => {
  const {
    noticeType = 'info',
    noticeTitle,
    noticeText,
    showNoticeIcon = false,
    noticeBorderColor,
    noticeBackgroundColor,
  } = content;

  const updateBlockContent = useContractBuilderStore((state) => state.updateBlockContent);
  const syncVariables = useContractBuilderStore((state) => state.syncVariables);

  const [editingField, setEditingField] = useState<EditingField>(null);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const config = noticeTypeConfig[noticeType as keyof typeof noticeTypeConfig] || noticeTypeConfig.info;
  const IconComponent = config.icon;

  // Farben: Benutzerdefiniert oder Default
  const borderColor = noticeBorderColor || config.defaultBorder;
  const backgroundColor = noticeBackgroundColor || config.defaultBackground;
  const title = noticeTitle || config.defaultTitle;
  const text = noticeText || 'Hier können Sie Ihren Hinweistext eingeben. Doppelklicken zum Bearbeiten.';

  useEffect(() => {
    if (editingField) {
      if (editingField === 'text') {
        textareaRef.current?.focus();
        textareaRef.current?.select();
      } else {
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    }
  }, [editingField]);

  const handleDoubleClick = useCallback((field: EditingField, currentValue: string) => {
    if (isPreview) return;
    setEditingField(field);
    setEditValue(currentValue);
  }, [isPreview]);

  const handleSave = useCallback(() => {
    if (!editingField) return;

    if (editingField === 'title') {
      updateBlockContent(blockId, { noticeTitle: editValue });
    } else if (editingField === 'text') {
      updateBlockContent(blockId, { noticeText: editValue });
    }

    syncVariables();
    setEditingField(null);
    setEditValue('');
  }, [editingField, editValue, blockId, updateBlockContent, syncVariables]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && editingField === 'title') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      setEditingField(null);
      setEditValue('');
    }
  }, [editingField, handleSave]);

  return (
    <div
      className={`${styles.notice} ${styles[noticeType]} ${isSelected ? styles.selected : ''}`}
      style={{
        borderColor: borderColor,
        backgroundColor: backgroundColor,
      }}
    >
      {/* Header mit Icon und Titel */}
      <div className={styles.header}>
        {showNoticeIcon && (
          <div className={styles.iconWrapper} style={{ color: config.iconColor }}>
            <IconComponent size={20} />
          </div>
        )}
        <h4 className={styles.title}>
          {editingField === 'title' ? (
            <input
              ref={inputRef}
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleSave}
              onKeyDown={handleKeyDown}
              className={styles.inlineInput}
            />
          ) : (
            <VariableHighlight
              text={title}
              isPreview={isPreview}
              onDoubleClick={() => handleDoubleClick('title', title)}
            />
          )}
        </h4>
      </div>

      {/* Text Content */}
      <div className={styles.content}>
        {editingField === 'text' ? (
          <textarea
            ref={textareaRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            className={styles.inlineTextarea}
            rows={Math.max(3, editValue.split('\n').length)}
          />
        ) : (
          <VariableHighlight
            text={text}
            multiline
            isPreview={isPreview}
            onDoubleClick={() => handleDoubleClick('text', text)}
          />
        )}
      </div>
    </div>
  );
};

export default NoticeBlock;
