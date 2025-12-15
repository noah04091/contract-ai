/**
 * TableBlock - Tabelle für strukturierte Daten
 */

import React from 'react';
import { BlockContent } from '../../../stores/contractBuilderStore';
import { VariableHighlight } from '../Variables/VariableHighlight';
import styles from './TableBlock.module.css';

interface TableBlockProps {
  content: BlockContent;
  isSelected: boolean;
  isPreview: boolean;
}

export const TableBlock: React.FC<TableBlockProps> = ({
  content,
  isSelected,
  isPreview,
}) => {
  const { headers, rows, footer } = content;

  // Default Tabelle falls leer
  const tableHeaders = headers && headers.length > 0
    ? headers
    : ['Spalte 1', 'Spalte 2', 'Spalte 3'];

  const tableRows = rows && rows.length > 0
    ? rows
    : [['Wert 1', 'Wert 2', 'Wert 3']];

  return (
    <div className={`${styles.tableWrapper} ${isSelected ? styles.selected : ''}`}>
      <table className={styles.table}>
        <thead>
          <tr>
            {tableHeaders.map((header, index) => (
              <th key={index} className={styles.headerCell}>
                {isPreview ? (
                  header
                ) : (
                  <VariableHighlight text={header} />
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
                  {isPreview ? (
                    cell
                  ) : (
                    <VariableHighlight text={cell} />
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
                {isPreview ? (
                  footer
                ) : (
                  <VariableHighlight text={footer} />
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
