/**
 * PartiesBlock - Vertragsparteien (2 Spalten)
 */

import React from 'react';
import { BlockContent } from '../../../stores/contractBuilderStore';
import { VariableHighlight } from '../Variables/VariableHighlight';
import { User, Building2, Mail, Phone, FileText } from 'lucide-react';
import styles from './PartiesBlock.module.css';

interface PartiesBlockProps {
  content: BlockContent;
  isSelected: boolean;
  isPreview: boolean;
}

export const PartiesBlock: React.FC<PartiesBlockProps> = ({
  content,
  isSelected,
  isPreview,
}) => {
  const { party1, party2 } = content;

  const renderParty = (party: typeof party1, index: number) => {
    if (!party) return null;

    return (
      <div className={styles.partyCard}>
        <div className={styles.partyHeader}>
          <div className={styles.partyIcon}>
            {index === 0 ? <Building2 size={18} /> : <User size={18} />}
          </div>
          <span className={styles.partyRole}>
            {isPreview ? (
              party.role || `Partei ${index + 1}`
            ) : (
              <VariableHighlight text={party.role || `Partei ${index + 1}`} />
            )}
          </span>
        </div>

        <div className={styles.partyDetails}>
          {/* Name */}
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Name:</span>
            <span className={styles.detailValue}>
              {isPreview ? (
                party.name || '{{name}}'
              ) : (
                <VariableHighlight text={party.name || '{{name}}'} />
              )}
            </span>
          </div>

          {/* Adresse */}
          {party.address && (
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Adresse:</span>
              <span className={styles.detailValue}>
                {isPreview ? (
                  party.address
                ) : (
                  <VariableHighlight text={party.address} />
                )}
              </span>
            </div>
          )}

          {/* Steuer-ID */}
          {party.taxId && (
            <div className={styles.detailRow}>
              <FileText size={12} className={styles.detailIcon} />
              <span className={styles.detailValue}>
                {isPreview ? (
                  party.taxId
                ) : (
                  <VariableHighlight text={party.taxId} />
                )}
              </span>
            </div>
          )}

          {/* E-Mail */}
          {party.email && (
            <div className={styles.detailRow}>
              <Mail size={12} className={styles.detailIcon} />
              <span className={styles.detailValue}>
                {isPreview ? (
                  party.email
                ) : (
                  <VariableHighlight text={party.email} />
                )}
              </span>
            </div>
          )}

          {/* Telefon */}
          {party.phone && (
            <div className={styles.detailRow}>
              <Phone size={12} className={styles.detailIcon} />
              <span className={styles.detailValue}>
                {isPreview ? (
                  party.phone
                ) : (
                  <VariableHighlight text={party.phone} />
                )}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className={`${styles.parties} ${isSelected ? styles.selected : ''}`}>
      <div className={styles.partiesGrid}>
        {renderParty(party1, 0)}
        <div className={styles.partiesDivider}>
          <span className={styles.andText}>und</span>
        </div>
        {renderParty(party2, 1)}
      </div>
    </div>
  );
};

export default PartiesBlock;
