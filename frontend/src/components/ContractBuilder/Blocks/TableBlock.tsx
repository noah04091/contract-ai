/**
 * TableBlock - Tabelle für strukturierte Daten
 * Unterstützt Inline-Editing per Doppelklick
 */

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { BlockContent, useContractBuilderStore } from '../../../stores/contractBuilderStore';
import { VariableHighlight } from '../Variables/VariableHighlight';
import styles from './TableBlock.module.css';

interface TableBlockProps {
  blockId: string;
  content: BlockContent;
  isSelected: boolean;
  isPreview: boolean;
}

type EditingCell = { type: 'header' | 'cell' | 'footer'; row?: number; col: number } | null;

export const TableBlock: React.FC<TableBlockProps> = ({
  blockId,
  content,
  isSelected,
  isPreview,
}) => {
  const { headers, rows, footer } = content;
  const updateBlockContent = useContractBuilderStore((state) => state.updateBlockContent);
  const syncVariables = useContractBuilderStore((state) => state.syncVariables);

  const [editingCell, setEditingCell] = useState<EditingCell>(null);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Default Tabelle falls leer
  const tableHeaders = useMemo(() =>
    headers && headers.length > 0
      ? headers
      : ['Spalte 1', 'Spalte 2', 'Spalte 3'],
    [headers]
  );

  const tableRows = useMemo(() =>
    rows && rows.length > 0
      ? rows
      : [['Wert 1', 'Wert 2', 'Wert 3']],
    [rows]
  );

  useEffect(() => {
    if (editingCell) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editingCell]);

  const handleDoubleClick = useCallback((cell: EditingCell, currentValue: string) => {
    if (isPreview) return;
    setEditingCell(cell);
    setEditValue(currentValue);
  }, [isPreview]);

  const handleSave = useCallback(() => {
    if (!editingCell) return;

    if (editingCell.type === 'header') {
      const newHeaders = [...tableHeaders];
      newHeaders[editingCell.col] = editValue;
      updateBlockContent(blockId, { headers: newHeaders });
    } else if (editingCell.type === 'cell' && editingCell.row !== undefined) {
      const newRows = tableRows.map((row, i) =>
        i === editingCell.row
          ? row.map((cell, j) => j === editingCell.col ? editValue : cell)
          : [...row]
      );
      updateBlockContent(blockId, { rows: newRows });
    } else if (editingCell.type === 'footer') {
      updateBlockContent(blockId, { footer: editValue });
    }

    syncVariables();
    setEditingCell(null);
    setEditValue('');
  }, [editingCell, editValue, blockId, tableHeaders, tableRows, updateBlockContent, syncVariables]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      setEditingCell(null);
      setEditValue('');
    } else if (e.key === 'Tab') {
      e.preventDefault();
      handleSave();
      // Optional: Move to next cell
    }
  }, [handleSave]);

  const isEditingThis = (type: 'header' | 'cell' | 'footer', row?: number, col?: number) => {
    if (!editingCell) return false;
    if (editingCell.type !== type) return false;
    if (type === 'cell' && editingCell.row !== row) return false;
    if (col !== undefined && editingCell.col !== col) return false;
    return true;
  };

  return (
    <div className={`${styles.tableWrapper} ${isSelected ? styles.selected : ''}`}>
      <table className={styles.table}>
        <thead>
          <tr>
            {tableHeaders.map((header, index) => (
              <th key={index} className={styles.headerCell}>
                {isEditingThis('header', undefined, index) ? (
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
                    text={header}
                    isPreview={isPreview}
                    onDoubleClick={() => handleDoubleClick({ type: 'header', col: index }, header)}
                  />
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tableRows.map((row, rowIndex) => (
            <tr key={rowIndex} className={styles.tableRow}>
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className={styles.tableCell}>
                  {isEditingThis('cell', rowIndex, cellIndex) ? (
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
                      text={cell}
                      isPreview={isPreview}
                      onDoubleClick={() => handleDoubleClick({ type: 'cell', row: rowIndex, col: cellIndex }, cell)}
                    />
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        {footer && (
          <tfoot>
            <tr>
              <td colSpan={tableHeaders.length} className={styles.footerCell}>
                {isEditingThis('footer') ? (
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
                  <span
                    onDoubleClick={() => handleDoubleClick({ type: 'footer', col: 0 }, footer)}
                    className={!isPreview ? styles.editable : ''}
                    title={!isPreview ? 'Doppelklick zum Bearbeiten' : undefined}
                  >
                    <VariableHighlight text={footer} isPreview={isPreview} />
                  </span>
                )}
              </td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
};

export default TableBlock;
