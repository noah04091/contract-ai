import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Save, AlertCircle, CheckCircle, Edit,
  FileText, Clock, Calendar, StickyNote,
  Loader2, ChevronDown, RotateCcw
} from "lucide-react";
import styles from "../styles/ContractEditModal.module.css";
import { apiCall } from "../utils/api";

// 📋 Vordefinierte Optionen für Dropdowns
const KUENDIGUNG_OPTIONS = [
  { value: "", label: "Bitte auswählen..." },
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
  { value: "Gekündigt", label: "Bereits gekündigt" },
  { value: "custom", label: "Eigene Eingabe..." }
];

const LAUFZEIT_OPTIONS = [
  { value: "", label: "Bitte auswählen..." },
  { value: "Unbefristet", label: "Unbefristet" },
  { value: "1 Monat", label: "1 Monat" },
  { value: "3 Monate", label: "3 Monate" },
  { value: "6 Monate", label: "6 Monate" },
  { value: "1 Jahr", label: "1 Jahr" },
  { value: "2 Jahre", label: "2 Jahre" },
  { value: "3 Jahre", label: "3 Jahre" },
  { value: "5 Jahre", label: "5 Jahre" },
  { value: "10 Jahre", label: "10 Jahre" },
  { value: "24 Monate mit Verlängerung", label: "24 Monate mit automatischer Verlängerung" },
  { value: "12 Monate mit Verlängerung", label: "12 Monate mit automatischer Verlängerung" },
  { value: "Einmalig", label: "Einmalig (kein Abo)" },
  { value: "custom", label: "Eigene Eingabe..." }
];

interface Contract {
  _id: string;
  name: string;
  kuendigung: string;
  laufzeit?: string;
  expiryDate?: string;
  status: string;
  createdAt: string; // ✅ HINZUGEFÜGT: Für Kompatibilität mit ContractDetailsView
  updatedAt?: string; // ✅ HINZUGEFÜGT: Für Update-Timestamps
  notes?: string; // Für eigene Notizen
}

interface ContractEditModalProps {
  contract: Contract;
  onClose: () => void;
  onUpdate: (updatedContract: Contract) => void;
  show: boolean;
}

interface FormData {
  name: string;
  kuendigung: string;
  laufzeit: string;
  expiryDate: string;
  notes: string;
}

export default function ContractEditModal({ 
  contract, 
  onClose, 
  onUpdate,
  show 
}: ContractEditModalProps) {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    kuendigung: '',
    laufzeit: '',
    expiryDate: '',
    notes: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // 📋 States für Dropdown/Custom-Eingabe Toggle
  const [kuendigungMode, setKuendigungMode] = useState<'dropdown' | 'custom'>('dropdown');
  const [laufzeitMode, setLaufzeitMode] = useState<'dropdown' | 'custom'>('dropdown');

  // Helper: Prüft ob Wert in vordefinierten Optionen existiert
  const isInOptions = (value: string, options: { value: string }[]) => {
    return options.some(opt => opt.value === value && opt.value !== '' && opt.value !== 'custom');
  };

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
      const newFormData = {
        name: contract.name || '',
        kuendigung: contract.kuendigung || '',
        laufzeit: contract.laufzeit || '',
        expiryDate: contract.expiryDate ?
          new Date(contract.expiryDate).toISOString().split('T')[0] : '',
        notes: contract.notes || ''
      };

      setFormData(newFormData);
      setHasChanges(false);

      // 📋 Bestimme ob Dropdown oder Custom-Modus für vorhandene Werte
      const kuendigungValue = contract.kuendigung || '';
      const laufzeitValue = contract.laufzeit || '';

      // Wenn Wert nicht in Optionen, dann Custom-Modus
      if (kuendigungValue && !isInOptions(kuendigungValue, KUENDIGUNG_OPTIONS)) {
        setKuendigungMode('custom');
      } else {
        setKuendigungMode('dropdown');
      }

      if (laufzeitValue && !isInOptions(laufzeitValue, LAUFZEIT_OPTIONS)) {
        setLaufzeitMode('custom');
      } else {
        setLaufzeitMode('dropdown');
      }
      setError(null);
      setSuccess(false);
    }
  }, [contract, show]);

  // Änderungen tracken
  useEffect(() => {
    if (!contract) return;
    
    const hasChanged = (
      formData.name !== (contract.name || '') ||
      formData.kuendigung !== (contract.kuendigung || '') ||
      formData.laufzeit !== (contract.laufzeit || '') ||
      formData.expiryDate !== (contract.expiryDate ? 
        new Date(contract.expiryDate).toISOString().split('T')[0] : '') ||
      formData.notes !== (contract.notes || '')
    );
    
    setHasChanges(hasChanged);
  }, [formData, contract]);

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    setError(null);
  };

  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      setError("Vertragsname ist erforderlich");
      return false;
    }
    
    if (formData.name.trim().length < 3) {
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
      const updateData = {
        name: formData.name.trim(),
        kuendigung: formData.kuendigung.trim() || "Unbekannt",
        laufzeit: formData.laufzeit.trim() || "Unbekannt",
        expiryDate: formData.expiryDate || undefined, // ✅ FIX: Konsistente undefined Behandlung
        notes: formData.notes.trim()
      };

      console.log('Updating contract:', contract._id, updateData);

      // API-Call zum Speichern
      const response = await apiCall(`/contracts/${contract._id}`, {
        method: 'PUT',
        body: JSON.stringify(updateData)
      }) as { success: boolean; message?: string; contract?: Contract };

      if (response.success) {
        setSuccess(true);
        setHasChanges(false);
        
        // ✅ VERBESSERUNG: Verwende Server-Response wenn verfügbar, sonst lokale Daten
        const updatedContract: Contract = response.contract ? {
          ...contract,
          ...response.contract  // ✅ Server-Daten haben Priorität
        } : {
          ...contract,
          ...updateData,        // ✅ Fallback zu lokalen Daten
          updatedAt: new Date().toISOString() // ✅ Timestamp hinzufügen
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
            {/* Vertragsname */}
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>
                <FileText size={16} />
                <span>Vertragsname *</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className={styles.formInput}
                placeholder="z.B. Mietvertrag Hauptstraße 123"
                disabled={loading}
                maxLength={100}
              />
              <div className={styles.charCount}>
                {formData.name.length}/100
              </div>
            </div>

            {/* Kündigungsfrist - Dropdown + Custom Toggle */}
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>
                <Clock size={16} />
                <span>Kündigungsfrist</span>
                <button
                  type="button"
                  className={styles.modeToggle}
                  onClick={() => {
                    if (kuendigungMode === 'dropdown') {
                      setKuendigungMode('custom');
                    } else {
                      setKuendigungMode('dropdown');
                      // Reset zu leerem Wert wenn zurück zu Dropdown
                      if (!isInOptions(formData.kuendigung, KUENDIGUNG_OPTIONS)) {
                        handleInputChange('kuendigung', '');
                      }
                    }
                  }}
                  disabled={loading}
                  title={kuendigungMode === 'dropdown' ? 'Eigene Eingabe' : 'Aus Liste wählen'}
                >
                  {kuendigungMode === 'dropdown' ? (
                    <><Edit size={12} /> Eigene</>
                  ) : (
                    <><ChevronDown size={12} /> Liste</>
                  )}
                </button>
              </label>
              {kuendigungMode === 'dropdown' ? (
                <div className={styles.selectWrapper}>
                  <select
                    value={isInOptions(formData.kuendigung, KUENDIGUNG_OPTIONS) ? formData.kuendigung : ''}
                    onChange={(e) => {
                      if (e.target.value === 'custom') {
                        setKuendigungMode('custom');
                        handleInputChange('kuendigung', '');
                      } else {
                        handleInputChange('kuendigung', e.target.value);
                      }
                    }}
                    className={styles.formSelect}
                    disabled={loading}
                  >
                    {KUENDIGUNG_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <ChevronDown size={16} className={styles.selectIcon} />
                </div>
              ) : (
                <input
                  type="text"
                  value={formData.kuendigung}
                  onChange={(e) => handleInputChange('kuendigung', e.target.value)}
                  className={styles.formInput}
                  placeholder="z.B. 3 Monate zum Monatsende"
                  disabled={loading}
                  maxLength={50}
                />
              )}
            </div>

            {/* Laufzeit - Dropdown + Custom Toggle */}
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>
                <RotateCcw size={16} />
                <span>Laufzeit</span>
                <button
                  type="button"
                  className={styles.modeToggle}
                  onClick={() => {
                    if (laufzeitMode === 'dropdown') {
                      setLaufzeitMode('custom');
                    } else {
                      setLaufzeitMode('dropdown');
                      if (!isInOptions(formData.laufzeit, LAUFZEIT_OPTIONS)) {
                        handleInputChange('laufzeit', '');
                      }
                    }
                  }}
                  disabled={loading}
                  title={laufzeitMode === 'dropdown' ? 'Eigene Eingabe' : 'Aus Liste wählen'}
                >
                  {laufzeitMode === 'dropdown' ? (
                    <><Edit size={12} /> Eigene</>
                  ) : (
                    <><ChevronDown size={12} /> Liste</>
                  )}
                </button>
              </label>
              {laufzeitMode === 'dropdown' ? (
                <div className={styles.selectWrapper}>
                  <select
                    value={isInOptions(formData.laufzeit, LAUFZEIT_OPTIONS) ? formData.laufzeit : ''}
                    onChange={(e) => {
                      if (e.target.value === 'custom') {
                        setLaufzeitMode('custom');
                        handleInputChange('laufzeit', '');
                      } else {
                        handleInputChange('laufzeit', e.target.value);
                      }
                    }}
                    className={styles.formSelect}
                    disabled={loading}
                  >
                    {LAUFZEIT_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <ChevronDown size={16} className={styles.selectIcon} />
                </div>
              ) : (
                <input
                  type="text"
                  value={formData.laufzeit}
                  onChange={(e) => handleInputChange('laufzeit', e.target.value)}
                  className={styles.formInput}
                  placeholder="z.B. Unbefristet oder 2 Jahre"
                  disabled={loading}
                  maxLength={50}
                />
              )}
            </div>

            {/* Ablaufdatum */}
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>
                <Calendar size={16} />
                <span>Ablaufdatum</span>
              </label>
              <input
                type="date"
                value={formData.expiryDate}
                onChange={(e) => handleInputChange('expiryDate', e.target.value)}
                className={styles.formInput}
                disabled={loading}
              />
            </div>

            {/* Notizen */}
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>
                <StickyNote size={16} />
                <span>Eigene Notizen</span>
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                className={styles.formTextarea}
                placeholder="Hier können Sie eigene Notizen zu diesem Vertrag hinzufügen..."
                disabled={loading}
                rows={4}
                maxLength={500}
              />
              <div className={styles.charCount}>
                {formData.notes.length}/500
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