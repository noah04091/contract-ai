import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Save, AlertCircle, CheckCircle, Edit,
  FileText, Clock, Calendar, StickyNote,
  Loader2, ChevronDown, RotateCcw, Plus, Minus, Tag
} from "lucide-react";
import styles from "../styles/ContractEditModal.module.css";
import { apiCall } from "../utils/api";

// 📋 Alle verfügbaren Feldtypen mit ihren Optionen
type FieldType = 'kuendigung' | 'laufzeit' | 'expiryDate' | 'gekuendigtZum' | 'anbieter' | 'kosten' | 'vertragsnummer';

interface FieldConfig {
  id: FieldType;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
  type: 'dropdown' | 'date' | 'text' | 'number';
  options?: { value: string; label: string }[];
  placeholder?: string;
  prefix?: string;
  suffix?: string;
}

// 📋 Alle verfügbaren Felder
const AVAILABLE_FIELDS: FieldConfig[] = [
  {
    id: 'kuendigung',
    label: 'Kündigungsfrist',
    icon: Clock,
    type: 'dropdown',
    options: [
      { value: "Keine Kündigungsfrist", label: "Keine Kündigungsfrist" },
      { value: "2 Wochen", label: "2 Wochen" },
      { value: "1 Monat", label: "1 Monat" },
      { value: "4 Wochen", label: "4 Wochen" },
      { value: "6 Wochen", label: "6 Wochen" },
      { value: "2 Monate", label: "2 Monate" },
      { value: "3 Monate", label: "3 Monate" },
      { value: "3 Monate zum Quartalsende", label: "3 Monate zum Quartalsende" },
      { value: "3 Monate zum Monatsende", label: "3 Monate zum Monatsende" },
      { value: "6 Monate", label: "6 Monate" },
      { value: "6 Monate zum Jahresende", label: "6 Monate zum Jahresende" },
      { value: "12 Monate", label: "12 Monate" },
      { value: "Unbefristet", label: "Unbefristet" },
    ]
  },
  {
    id: 'laufzeit',
    label: 'Laufzeit',
    icon: RotateCcw,
    type: 'dropdown',
    options: [
      { value: "Unbefristet", label: "Unbefristet" },
      { value: "1 Monat", label: "1 Monat" },
      { value: "3 Monate", label: "3 Monate" },
      { value: "6 Monate", label: "6 Monate" },
      { value: "1 Jahr", label: "1 Jahr" },
      { value: "2 Jahre", label: "2 Jahre" },
      { value: "3 Jahre", label: "3 Jahre" },
      { value: "5 Jahre", label: "5 Jahre" },
      { value: "10 Jahre", label: "10 Jahre" },
      { value: "24 Monate mit Verlängerung", label: "24 Monate + auto. Verlängerung" },
      { value: "12 Monate mit Verlängerung", label: "12 Monate + auto. Verlängerung" },
      { value: "Einmalig", label: "Einmalig (kein Abo)" },
    ]
  },
  {
    id: 'expiryDate',
    label: 'Ablaufdatum',
    icon: Calendar,
    type: 'date'
  },
  {
    id: 'gekuendigtZum',
    label: 'Gekündigt zum',
    icon: Calendar,
    type: 'date'
  },
  {
    id: 'anbieter',
    label: 'Anbieter',
    icon: Tag,
    type: 'text',
    placeholder: 'z.B. Telekom, Vodafone...'
  },
  {
    id: 'kosten',
    label: 'Monatliche Kosten',
    icon: Tag,
    type: 'number',
    placeholder: '0.00',
    suffix: '€'
  },
  {
    id: 'vertragsnummer',
    label: 'Vertragsnummer',
    icon: FileText,
    type: 'text',
    placeholder: 'z.B. VN-123456'
  }
];

// Standard-Felder die initial angezeigt werden
const DEFAULT_FIELDS: FieldType[] = ['kuendigung', 'laufzeit', 'expiryDate'];

interface Contract {
  _id: string;
  name: string;
  kuendigung: string;
  laufzeit?: string;
  expiryDate?: string;
  gekuendigtZum?: string;
  anbieter?: string;
  kosten?: number;
  vertragsnummer?: string;
  status: string;
  createdAt: string;
  updatedAt?: string;
  notes?: string;
}

interface ContractEditModalProps {
  contract: Contract;
  onClose: () => void;
  onUpdate: (updatedContract: Contract) => void;
  show: boolean;
}

// Dynamische Feldwerte
interface FieldValues {
  [key: string]: string;
}

export default function ContractEditModal({
  contract,
  onClose,
  onUpdate,
  show
}: ContractEditModalProps) {
  // Basis-Felder
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');

  // Dynamische Felder (können hinzugefügt/entfernt werden)
  const [activeFields, setActiveFields] = useState<FieldType[]>(DEFAULT_FIELDS);
  const [fieldValues, setFieldValues] = useState<FieldValues>({});
  const [customInputMode, setCustomInputMode] = useState<{ [key: string]: boolean }>({});

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [showAddField, setShowAddField] = useState(false);

  // Helper: Prüft ob Wert in vordefinierten Optionen existiert
  const isInOptions = (value: string, options?: { value: string }[]) => {
    if (!options) return false;
    return options.some(opt => opt.value === value);
  };

  // Feld hinzufügen
  const addField = (fieldId: FieldType) => {
    if (!activeFields.includes(fieldId)) {
      setActiveFields([...activeFields, fieldId]);
      setFieldValues({ ...fieldValues, [fieldId]: '' });
      setHasChanges(true);
    }
    setShowAddField(false);
  };

  // Feld entfernen
  const removeField = (fieldId: FieldType) => {
    setActiveFields(activeFields.filter(f => f !== fieldId));
    const newValues = { ...fieldValues };
    delete newValues[fieldId];
    setFieldValues(newValues);
    setHasChanges(true);
  };

  // Feldwert ändern
  const updateFieldValue = (fieldId: string, value: string) => {
    setFieldValues({ ...fieldValues, [fieldId]: value });
  };

  // Toggle zwischen Dropdown und Custom Input
  const toggleCustomInput = (fieldId: string) => {
    setCustomInputMode({ ...customInputMode, [fieldId]: !customInputMode[fieldId] });
  };

  // Verfügbare Felder (die noch nicht aktiv sind)
  const availableFieldsToAdd = AVAILABLE_FIELDS.filter(f => !activeFields.includes(f.id));

  // ✅ Escape-Key-Handler für Accessibility
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && show) {
        onClose(); // Verwende onClose für Änderungs-Check
      }
    };

    if (show) {
      document.addEventListener('keydown', handleEscapeKey);
    }

    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [show]);

  // Formular mit Contract-Daten initialisieren
  useEffect(() => {
    if (contract && show) {
      // Basis-Felder setzen
      setName(contract.name || '');
      setNotes(contract.notes || '');

      // Dynamische Felder aus Contract-Daten laden
      const initialValues: FieldValues = {};
      const initialActiveFields: FieldType[] = [];
      const initialCustomMode: { [key: string]: boolean } = {};

      // Prüfe welche Felder im Contract vorhanden sind
      if (contract.kuendigung && contract.kuendigung !== 'Unbekannt' && contract.kuendigung !== 'Nicht analysiert') {
        initialActiveFields.push('kuendigung');
        initialValues.kuendigung = contract.kuendigung;
        const fieldConfig = AVAILABLE_FIELDS.find(f => f.id === 'kuendigung');
        if (!isInOptions(contract.kuendigung, fieldConfig?.options)) {
          initialCustomMode.kuendigung = true;
        }
      }

      if (contract.laufzeit && contract.laufzeit !== 'Unbekannt' && contract.laufzeit !== 'Nicht analysiert') {
        initialActiveFields.push('laufzeit');
        initialValues.laufzeit = contract.laufzeit;
        const fieldConfig = AVAILABLE_FIELDS.find(f => f.id === 'laufzeit');
        if (!isInOptions(contract.laufzeit, fieldConfig?.options)) {
          initialCustomMode.laufzeit = true;
        }
      }

      if (contract.expiryDate) {
        initialActiveFields.push('expiryDate');
        initialValues.expiryDate = new Date(contract.expiryDate).toISOString().split('T')[0];
      }

      if (contract.gekuendigtZum) {
        initialActiveFields.push('gekuendigtZum');
        initialValues.gekuendigtZum = new Date(contract.gekuendigtZum).toISOString().split('T')[0];
      }

      if (contract.anbieter) {
        initialActiveFields.push('anbieter');
        initialValues.anbieter = contract.anbieter;
      }

      if (contract.kosten) {
        initialActiveFields.push('kosten');
        initialValues.kosten = String(contract.kosten);
      }

      if (contract.vertragsnummer) {
        initialActiveFields.push('vertragsnummer');
        initialValues.vertragsnummer = contract.vertragsnummer;
      }

      // Wenn keine Felder vorhanden, nutze Default-Felder
      if (initialActiveFields.length === 0) {
        setActiveFields(DEFAULT_FIELDS);
        setFieldValues({});
      } else {
        setActiveFields(initialActiveFields);
        setFieldValues(initialValues);
      }

      setCustomInputMode(initialCustomMode);
      setHasChanges(false);
      setError(null);
      setSuccess(false);
      setShowAddField(false);
    }
  }, [contract, show]);

  // Änderungen tracken
  useEffect(() => {
    if (!contract) return;

    // Prüfe ob sich etwas geändert hat
    const nameChanged = name !== (contract.name || '');
    const notesChanged = notes !== (contract.notes || '');

    // Felder-Änderungen prüfen (vereinfacht)
    const fieldsChanged = Object.keys(fieldValues).some(key => {
      const originalValue = (contract as unknown as Record<string, unknown>)[key];
      return fieldValues[key] !== (originalValue || '');
    });

    setHasChanges(nameChanged || notesChanged || fieldsChanged);
  }, [name, notes, fieldValues, activeFields, contract]);

  const validateForm = (): boolean => {
    if (!name.trim()) {
      setError("Vertragsname ist erforderlich");
      return false;
    }

    if (name.trim().length < 3) {
      setError("Vertragsname muss mindestens 3 Zeichen lang sein");
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setLoading(true);
    setError(null);

    try {
      // Bereite Update-Daten vor
      const updateData: Record<string, unknown> = {
        name: name.trim(),
        notes: notes.trim()
      };

      // Dynamische Felder hinzufügen
      activeFields.forEach(fieldId => {
        const value = fieldValues[fieldId];
        if (value !== undefined && value !== '') {
          // Spezielle Behandlung für bestimmte Felder
          if (fieldId === 'kosten') {
            updateData[fieldId] = parseFloat(value) || 0;
          } else if (fieldId === 'expiryDate' || fieldId === 'gekuendigtZum') {
            updateData[fieldId] = value || null;
          } else {
            updateData[fieldId] = value;
          }
        } else {
          // Leere Werte als null setzen
          updateData[fieldId] = null;
        }
      });

      // Felder die nicht mehr aktiv sind, auf null setzen
      const allFieldIds: FieldType[] = ['kuendigung', 'laufzeit', 'expiryDate', 'gekuendigtZum', 'anbieter', 'kosten', 'vertragsnummer'];
      allFieldIds.forEach(fieldId => {
        if (!activeFields.includes(fieldId)) {
          updateData[fieldId] = null;
        }
      });

      console.log('Updating contract:', contract._id, updateData);

      // API-Call zum Speichern
      const response = await apiCall(`/contracts/${contract._id}`, {
        method: 'PUT',
        body: JSON.stringify(updateData)
      }) as { success: boolean; message?: string; contract?: Contract };

      if (response.success) {
        setSuccess(true);
        setHasChanges(false);

        // Verwende Server-Response wenn verfügbar, sonst lokale Daten
        const updatedContract: Contract = response.contract ? {
          ...contract,
          ...response.contract
        } : {
          ...contract,
          ...updateData as Partial<Contract>,
          updatedAt: new Date().toISOString()
        };

        // Parent Component über Update informieren
        onUpdate(updatedContract);

        // Success-Anzeige kurz zeigen, dann schließen
        setTimeout(() => {
          onClose();
        }, 1500);

        console.log('Contract updated successfully');
      } else {
        throw new Error(response.message || 'Update fehlgeschlagen');
      }

    } catch (err) {
      console.error('Update error:', err);
      setError(err instanceof Error ? err.message : 'Fehler beim Speichern');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (hasChanges) {
      if (confirm("Möchtest du die Änderungen verwerfen?")) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  if (!show) return null;

  return (
    <AnimatePresence>
      <motion.div 
        className={styles.overlay}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={handleCancel}
      >
        <motion.div 
          className={styles.modal}
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className={styles.header}>
            <div className={styles.headerIcon}>
              <Edit size={24} />
            </div>
            <div className={styles.headerText}>
              <h2>Vertrag bearbeiten</h2>
              <p>Vertragsdetails anpassen</p>
            </div>
            <button 
              className={styles.closeBtn}
              onClick={handleCancel}
              title="Schließen"
              disabled={loading}
            >
              <X size={20} />
            </button>
          </div>

          {/* Status Messages */}
          <AnimatePresence>
            {error && (
              <motion.div 
                className={styles.errorMessage}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
              >
                <AlertCircle size={16} />
                <span>{error}</span>
              </motion.div>
            )}

            {success && (
              <motion.div 
                className={styles.successMessage}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
              >
                <CheckCircle size={16} />
                <span>Änderungen erfolgreich gespeichert!</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form */}
          <div className={styles.form}>
            {/* Vertragsname (immer sichtbar) */}
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>
                <FileText size={16} />
                <span>Vertragsname *</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={styles.formInput}
                placeholder="z.B. Mietvertrag Hauptstraße 123"
                disabled={loading}
                maxLength={100}
              />
              <div className={styles.charCount}>
                {name.length}/100
              </div>
            </div>

            {/* Dynamische Felder */}
            {activeFields.map((fieldId) => {
              const fieldConfig = AVAILABLE_FIELDS.find(f => f.id === fieldId);
              if (!fieldConfig) return null;

              const IconComponent = fieldConfig.icon;
              const isCustomMode = customInputMode[fieldId];
              const currentValue = fieldValues[fieldId] || '';

              return (
                <div key={fieldId} className={styles.formGroup}>
                  <label className={styles.formLabel}>
                    <IconComponent size={16} />
                    <span>{fieldConfig.label}</span>

                    {/* Aktions-Buttons Container (rechts) */}
                    <div className={styles.fieldActions}>
                      {/* Toggle für Dropdown-Felder */}
                      {fieldConfig.type === 'dropdown' && (
                        <button
                          type="button"
                          className={styles.modeToggle}
                          onClick={() => toggleCustomInput(fieldId)}
                          disabled={loading}
                          title={isCustomMode ? 'Aus Liste wählen' : 'Eigene Eingabe'}
                        >
                          {isCustomMode ? (
                            <><ChevronDown size={12} /> Liste</>
                          ) : (
                            <><Edit size={12} /> Eigene</>
                          )}
                        </button>
                      )}

                      {/* Entfernen-Button */}
                      <button
                        type="button"
                        className={styles.removeFieldBtn}
                        onClick={() => removeField(fieldId)}
                        disabled={loading}
                        title="Feld entfernen"
                      >
                        <Minus size={14} />
                      </button>
                    </div>
                  </label>

                  {/* Dropdown-Feld */}
                  {fieldConfig.type === 'dropdown' && !isCustomMode && (
                    <div className={styles.selectWrapper}>
                      <select
                        value={isInOptions(currentValue, fieldConfig.options) ? currentValue : ''}
                        onChange={(e) => updateFieldValue(fieldId, e.target.value)}
                        className={styles.formSelect}
                        disabled={loading}
                      >
                        <option value="">-- Auswählen --</option>
                        {fieldConfig.options?.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                      <ChevronDown size={16} className={styles.selectIcon} />
                    </div>
                  )}

                  {/* Text-Input (für Custom-Dropdown oder Text-Felder) */}
                  {(fieldConfig.type === 'text' || (fieldConfig.type === 'dropdown' && isCustomMode)) && (
                    <input
                      type="text"
                      value={currentValue}
                      onChange={(e) => updateFieldValue(fieldId, e.target.value)}
                      className={styles.formInput}
                      placeholder={fieldConfig.placeholder || `${fieldConfig.label} eingeben...`}
                      disabled={loading}
                      maxLength={100}
                    />
                  )}

                  {/* Datum-Input */}
                  {fieldConfig.type === 'date' && (
                    <input
                      type="date"
                      value={currentValue}
                      onChange={(e) => updateFieldValue(fieldId, e.target.value)}
                      className={styles.formInput}
                      disabled={loading}
                    />
                  )}

                  {/* Number-Input */}
                  {fieldConfig.type === 'number' && (
                    <div className={styles.numberInputWrapper}>
                      <input
                        type="number"
                        value={currentValue}
                        onChange={(e) => updateFieldValue(fieldId, e.target.value)}
                        className={styles.formInput}
                        placeholder={fieldConfig.placeholder}
                        disabled={loading}
                        step="0.01"
                        min="0"
                      />
                      {fieldConfig.suffix && (
                        <span className={styles.inputSuffix}>{fieldConfig.suffix}</span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Feld hinzufügen Button */}
            {availableFieldsToAdd.length > 0 && (
              <div className={styles.addFieldSection}>
                {!showAddField ? (
                  <button
                    type="button"
                    className={styles.addFieldBtn}
                    onClick={() => setShowAddField(true)}
                    disabled={loading}
                  >
                    <Plus size={16} />
                    <span>Feld hinzufügen</span>
                  </button>
                ) : (
                  <div className={styles.addFieldDropdown}>
                    <div className={styles.addFieldHeader}>
                      <span>Feld auswählen:</span>
                      <button
                        type="button"
                        className={styles.closeAddField}
                        onClick={() => setShowAddField(false)}
                      >
                        <X size={14} />
                      </button>
                    </div>
                    <div className={styles.addFieldOptions}>
                      {availableFieldsToAdd.map(field => {
                        const IconComponent = field.icon;
                        return (
                          <button
                            key={field.id}
                            type="button"
                            className={styles.addFieldOption}
                            onClick={() => addField(field.id)}
                          >
                            <IconComponent size={14} />
                            <span>{field.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Notizen (immer sichtbar) */}
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>
                <StickyNote size={16} />
                <span>Eigene Notizen</span>
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className={styles.formTextarea}
                placeholder="Hier können Sie eigene Notizen zu diesem Vertrag hinzufügen..."
                disabled={loading}
                rows={3}
                maxLength={500}
              />
              <div className={styles.charCount}>
                {notes.length}/500
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className={styles.footer}>
            <div className={styles.footerInfo}>
              {hasChanges && (
                <div className={styles.unsavedChanges}>
                  <div className={styles.unsavedDot}></div>
                  <span>Ungespeicherte Änderungen</span>
                </div>
              )}
            </div>
            
            <div className={styles.footerActions}>
              <button 
                className={styles.cancelBtn}
                onClick={handleCancel}
                disabled={loading}
              >
                Abbrechen
              </button>
              
              <button 
                className={`${styles.saveBtn} ${!hasChanges ? styles.disabled : ''}`}
                onClick={handleSave}
                disabled={loading || !hasChanges}
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className={styles.spinning} />
                    <span>Speichere...</span>
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    <span>Speichern</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}