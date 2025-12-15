/**
 * SignatureBlock - Unterschriftenbereich
 */

import React from 'react';
import { BlockContent } from '../../../stores/contractBuilderStore';
import { VariableHighlight } from '../Variables/VariableHighlight';
import { PenTool, Calendar, MapPin, User } from 'lucide-react';
import styles from './SignatureBlock.module.css';

interface SignatureBlockProps {
  content: BlockContent;
  isSelected: boolean;
  isPreview: boolean;
}

export const SignatureBlock: React.FC<SignatureBlockProps> = ({
  content,
  isSelected,
  isPreview,
}) => {
  const { signatureFields, witnesses } = content;

  // Default signature fields falls keine definiert
  const fields = signatureFields && signatureFields.length > 0
    ? signatureFields
    : [
        { partyIndex: 0, label: 'Partei 1', showDate: true, showPlace: true },
        { partyIndex: 1, label: 'Partei 2', showDate: true, showPlace: true },
      ];

  return (
    <div className={`${styles.signature} ${isSelected ? styles.selected : ''}`}>
      <div className={styles.signatureHeader}>
        <PenTool size={16} />
        <span>Unterschriften</span>
      </div>

      <div className={styles.signatureGrid}>
        {fields.map((field, index) => (
          <div key={index} className={styles.signatureField}>
            {/* Ort und Datum */}
            {(field.showPlace || field.showDate) && (
              <div className={styles.placeDateRow}>
                {field.showPlace && (
                  <div className={styles.placeField}>
                    <MapPin size={12} className={styles.fieldIcon} />
                    <span className={styles.fieldLabel}>Ort</span>
                    <div className={styles.fieldLine} />
                  </div>
                )}
                {field.showDate && (
                  <div className={styles.dateField}>
                    <Calendar size={12} className={styles.fieldIcon} />
                    <span className={styles.fieldLabel}>Datum</span>
                    <div className={styles.fieldLine} />
                  </div>
                )}
              </div>
            )}

            {/* Unterschriftslinie */}
            <div className={styles.signatureLine}>
              <div className={styles.signatureLineInner} />
            </div>

            {/* Label */}
            <div className={styles.signatureLabel}>
              <User size={12} className={styles.labelIcon} />
              {isPreview ? (
                <span>{field.label}</span>
              ) : (
                <VariableHighlight text={field.label || 'Unterschrift'} />
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Zeugen */}
      {witnesses && witnesses > 0 && (
        <div className={styles.witnessSection}>
          <div className={styles.witnessHeader}>
            <span>Zeugen</span>
          </div>
          <div className={styles.witnessGrid}>
            {Array.from({ length: witnesses }).map((_, index) => (
              <div key={index} className={styles.witnessField}>
                <div className={styles.signatureLine}>
                  <div className={styles.signatureLineInner} />
                </div>
                <span className={styles.witnessLabel}>Zeuge {index + 1}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SignatureBlock;
