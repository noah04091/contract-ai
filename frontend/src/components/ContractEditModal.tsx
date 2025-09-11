import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, Save, AlertCircle, CheckCircle, Edit, 
  FileText, Clock, Calendar, StickyNote,
  Loader2
} from "lucide-react";
import styles from "../styles/ContractEditModal.module.css";
import { apiCall } from "../utils/api";

interface Contract {
  _id: string;
  name: string;
  kuendigung: string;
  laufzeit?: string;
  expiryDate?: string;
  status: string;
  createdAt: string; // ✅ HINZUGEFÜGT: Für Kompatibilität mit ContractDetailsView
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

  // ✅ Escape-Key-Handler für Accessibility
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && show) {
        handleClose(); // Verwende handleClose für Änderungs-Check
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

            {/* Kündigungsfrist */}
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>
                <Clock size={16} />
                <span>Kündigungsfrist</span>
              </label>
              <input
                type="text"
                value={formData.kuendigung}
                onChange={(e) => handleInputChange('kuendigung', e.target.value)}
                className={styles.formInput}
                placeholder="z.B. 3 Monate zum Monatsende"
                disabled={loading}
                maxLength={50}
              />
            </div>

            {/* Laufzeit */}
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>
                <Calendar size={16} />
                <span>Laufzeit</span>
              </label>
              <input
                type="text"
                value={formData.laufzeit}
                onChange={(e) => handleInputChange('laufzeit', e.target.value)}
                className={styles.formInput}
                placeholder="z.B. Unbefristet oder 2 Jahre"
                disabled={loading}
                maxLength={50}
              />
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