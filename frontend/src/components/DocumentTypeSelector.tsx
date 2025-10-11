// ✨ DocumentTypeSelector.tsx - Manuelle Dokumenttyp-Überschreibung
import { useState } from 'react';
import styles from '../styles/DocumentTypeSelector.module.css';

interface Contract {
  _id: string;
  name: string;
  contractType?: 'recurring' | 'one-time' | null;
  contractTypeConfidence?: 'high' | 'medium' | 'low';
  documentTypeOverride?: 'auto' | 'invoice' | 'recurring' | 'one-time' | null;
  manualOverride?: boolean;
}

interface DocumentTypeSelectorProps {
  contract: Contract;
  onTypeChange?: () => void; // Callback nach Änderung
}

export default function DocumentTypeSelector({ contract, onTypeChange }: DocumentTypeSelectorProps) {
  const [selectedType, setSelectedType] = useState<string>(
    contract.documentTypeOverride || 'auto'
  );
  const [isSaving, setIsSaving] = useState(false);

  // Confidence Badge
  const getConfidenceBadge = () => {
    if (contract.manualOverride) {
      return { text: 'Manuell', color: 'blue', icon: '✏️' };
    }

    const confidence = contract.contractTypeConfidence;
    if (confidence === 'high') {
      return { text: 'Sehr sicher', color: 'green', icon: '🎯' };
    }
    if (confidence === 'medium') {
      return { text: 'Wahrscheinlich', color: 'yellow', icon: '⚠️' };
    }
    return { text: 'Unsicher', color: 'gray', icon: '❓' };
  };

  // Typ-Label
  const getTypeLabel = (type?: string | null) => {
    if (!type || type === 'auto') {
      if (contract.contractType === 'recurring') return 'Abo-Vertrag';
      if (contract.contractType === 'one-time') return 'Einmalvertrag';
      return 'Unbekannt';
    }
    if (type === 'invoice') return 'Rechnung';
    if (type === 'recurring') return 'Abo-Vertrag';
    if (type === 'one-time') return 'Einmalvertrag';
    return 'Unbekannt';
  };

  // Handle Change
  const handleTypeChange = async (newType: string) => {
    setSelectedType(newType);
    setIsSaving(true);

    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      if (!token) throw new Error('Nicht angemeldet');

      const response = await fetch(`/api/contracts/${contract._id}/document-type`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          documentType: newType,
          manualOverride: newType !== 'auto'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Fehler beim Speichern');
      }

      console.log('✅ Document type updated:', newType);

      // Callback aufrufen
      if (onTypeChange) {
        onTypeChange();
      }

    } catch (error) {
      console.error('❌ Error updating document type:', error);
      alert('Fehler beim Speichern. Bitte versuche es erneut.');
      setSelectedType(contract.documentTypeOverride || 'auto'); // Rollback
    } finally {
      setIsSaving(false);
    }
  };

  const badge = getConfidenceBadge();
  const currentTypeLabel = getTypeLabel(contract.documentTypeOverride || contract.contractType);

  return (
    <div className={styles.selector}>
      {/* Current Type Display */}
      <div className={styles.currentType}>
        <span className={`${styles.badge} ${styles[badge.color]}`}>
          {badge.icon} {badge.text}
        </span>
        <span className={styles.typeLabel}>
          Typ: <strong>{currentTypeLabel}</strong>
        </span>
      </div>

      {/* Dropdown */}
      <div className={styles.dropdown}>
        <label htmlFor="documentType" className={styles.label}>
          📝 Typ ändern:
        </label>
        <select
          id="documentType"
          className={styles.select}
          value={selectedType}
          onChange={(e) => handleTypeChange(e.target.value)}
          disabled={isSaving}
        >
          <option value="auto">🤖 Automatisch (GPT)</option>
          <option value="invoice">📄 Rechnung (beide Tracker)</option>
          <option value="recurring">💰 Abo-Vertrag (nur Kosten)</option>
          <option value="one-time">💳 Einmalvertrag (nur Payment)</option>
        </select>
      </div>

      {/* Saving Indicator */}
      {isSaving && (
        <div className={styles.savingIndicator}>
          💾 Speichern...
        </div>
      )}
    </div>
  );
}
