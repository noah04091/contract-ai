/**
 * TableBlock - Tabelle für strukturierte Daten
 * Unterstützt Inline-Editing per Doppelklick
 * Plus/X Buttons im Edit-Modus zum Hinzufügen/Entfernen von Zeilen/Spalten
 */

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Plus, X } from 'lucide-react';
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

  // Default Tabelle nur im Edit-Modus. Im PDF-Preview: echte Daten oder leer.
  // (sonst erschienen "Spalte 1/2/3" + "Wert 1/2/3" als echte Vertrags-Tabelle)
  const tableHeaders = useMemo(() => {
    if (headers && headers.length > 0) return headers;
    return isPreview ? [] : ['Spalte 1', 'Spalte 2', 'Spalte 3'];
  }, [headers, isPreview]);

  const tableRows = useMemo(() => {
    if (rows && rows.length > 0) return rows;
    return isPreview ? [] : [['Wert 1', 'Wert 2', 'Wert 3']];
  }, [rows, isPreview]);

  // Im PDF-Preview: komplett leere Tabelle (keine Header und keine Rows) gar nicht rendern
  if (isPreview && tableHeaders.length === 0 && tableRows.length === 0) return null;

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

  // Zeile hinzufügen — leere Zellen passend zur Spaltenanzahl
  const addRow = useCallback(() => {
    const emptyRow = tableHeaders.map(() => '');
    updateBlockContent(blockId, { rows: [...tableRows, emptyRow] });
    syncVariables();
  }, [blockId, tableHeaders, tableRows, updateBlockContent, syncVariables]);

  // Spalte hinzufügen — neuer Header + leere Zelle in jeder Zeile
  const addColumn = useCallback(() => {
    const newHeaders = [...tableHeaders, `Spalte ${tableHeaders.length + 1}`];
    const newRows = tableRows.map((row) => [...row, '']);
    updateBlockContent(blockId, { headers: newHeaders, rows: newRows });
    syncVariables();
  }, [blockId, tableHeaders, tableRows, updateBlockContent, syncVariables]);

  // Zeile entfernen
  const removeRow = useCallback((rowIndex: number) => {
    const newRows = tableRows.filter((_, i) => i !== rowIndex);
    updateBlockContent(blockId, { rows: newRows });
    syncVariables();
  }, [blockId, tableRows, updateBlockContent, syncVariables]);

  // Spalte entfernen — aus Headers UND jeder Zeile
  const removeColumn = useCallback((colIndex: number) => {
    const newHeaders = tableHeaders.filter((_, i) => i !== colIndex);
    const newRows = tableRows.map((row) => row.filter((_, i) => i !== colIndex));
    updateBlockContent(blockId, { headers: newHeaders, rows: newRows });
    syncVariables();
  }, [blockId, tableHeaders, tableRows, updateBlockContent, syncVariables]);

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
              <th key={`h-${index}-${header.slice(0, 15)}`} className={styles.headerCell}>
                <div
                  className={styles.headerInner}
                  onDoubleClick={() => !isPreview && !isEditingThis('header', undefined, index) && handleDoubleClick({ type: 'header', col: index }, header)}
                >
                  <div className={styles.headerText}>
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
                    ) : header ? (
                      <VariableHighlight
                        text={header}
                        isPreview={isPreview}
                        onDoubleClick={() => handleDoubleClick({ type: 'header', col: index }, header)}
                      />
                    ) : !isPreview ? (
                      <span className={styles.placeholder}>Doppelklick zum Bearbeiten</span>
                    ) : null}
                  </div>
                  {!isPreview && tableHeaders.length > 1 && (
                    <button
                      className={`${styles.removeBtn} blockControls`}
                      onClick={(e) => { e.stopPropagation(); removeColumn(index); }}
                      title="Spalte entfernen"
                      type="button"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              </th>
            ))}
            {!isPreview && (
              <th className={`${styles.actionCell} blockControls`} aria-hidden="true"></th>
            )}
          </tr>
        </thead>
        <tbody>
          {tableRows.map((row, rowIndex) => (
            <tr key={`row-${rowIndex}`} className={styles.tableRow}>
              {row.map((cell, cellIndex) => (
                <td
                  key={`cell-${rowIndex}-${cellIndex}`}
                  className={styles.tableCell}
                  onDoubleClick={() => !isPreview && !isEditingThis('cell', rowIndex, cellIndex) && handleDoubleClick({ type: 'cell', row: rowIndex, col: cellIndex }, cell)}
                >
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
                  ) : cell ? (
                    <VariableHighlight
                      text={cell}
                      isPreview={isPreview}
                      onDoubleClick={() => handleDoubleClick({ type: 'cell', row: rowIndex, col: cellIndex }, cell)}
                    />
                  ) : !isPreview ? (
                    <span className={styles.placeholder}>Doppelklick zum Bearbeiten</span>
                  ) : null}
                </td>
              ))}
              {!isPreview && (
                <td className={`${styles.actionCell} blockControls`}>
                  {tableRows.length > 1 && (
                    <button
                      className={`${styles.removeBtn} blockControls`}
                      onClick={(e) => { e.stopPropagation(); removeRow(rowIndex); }}
                      title="Zeile entfernen"
                      type="button"
                    >
                      <X size={12} />
                    </button>
                  )}
                </td>
              )}
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
              {!isPreview && (
                <td className={`${styles.actionCell} blockControls`} aria-hidden="true"></td>
              )}
            </tr>
          </tfoot>
        )}
      </table>
      {!isPreview && (
        <div className={`${styles.tableActions} blockControls`}>
          <button
            className={styles.addBtn}
            onClick={addRow}
            type="button"
          >
            <Plus size={14} />
            <span>Zeile hinzufügen</span>
          </button>
          <button
            className={styles.addBtn}
            onClick={addColumn}
            type="button"
          >
            <Plus size={14} />
            <span>Spalte hinzufügen</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default TableBlock;
