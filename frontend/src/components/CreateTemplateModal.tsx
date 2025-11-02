// 📝 CreateTemplateModal.tsx - Modal für benutzerdefinierte Vertragsvorlagen

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Sparkles } from 'lucide-react';
import styles from '../styles/TemplateModal.module.css';

interface CreateTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (templateData: TemplateFormData) => Promise<void>;
  contractType: string;
  contractTypeName: string;
  currentFormData: Record<string, unknown>;
}

export interface TemplateFormData {
  name: string;
  description: string;
  contractType: string;
  defaultValues: Record<string, unknown>;
}

const CreateTemplateModal: React.FC<CreateTemplateModalProps> = ({
  isOpen,
  onClose,
  onSave,
  contractType,
  contractTypeName,
  currentFormData
}) => {
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    // Validation
    if (!templateName.trim()) {
      setError('Bitte geben Sie einen Namen für die Vorlage ein');
      return;
    }

    if (templateName.trim().length < 3) {
      setError('Der Name muss mindestens 3 Zeichen lang sein');
      return;
    }

    if (templateName.length > 100) {
      setError('Der Name darf maximal 100 Zeichen lang sein');
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      const templateData: TemplateFormData = {
        name: templateName.trim(),
        description: templateDescription.trim(),
        contractType: contractType,
        defaultValues: currentFormData
      };

      await onSave(templateData);

      // Reset form
      setTemplateName('');
      setTemplateDescription('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Speichern der Vorlage');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    if (!isSaving) {
      setTemplateName('');
      setTemplateDescription('');
      setError('');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className={styles.modalOverlay} onClick={handleClose}>
          <motion.div
            className={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
          >
            {/* Header */}
            <div className={styles.modalHeader}>
              <div className={styles.headerIcon}>
                <Sparkles size={24} />
              </div>
              <div>
                <h2>Neue Vorlage erstellen</h2>
                <p>Für: {contractTypeName}</p>
              </div>
              <button
                className={styles.closeButton}
                onClick={handleClose}
                disabled={isSaving}
                aria-label="Schließen"
              >
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <div className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label htmlFor="templateName">
                  Vorlagen-Name *
                </label>
                <input
                  id="templateName"
                  type="text"
                  value={templateName}
                  onChange={(e) => {
                    setTemplateName(e.target.value);
                    setError('');
                  }}
                  placeholder="z.B. Mein Standard-Freelancer-Vertrag"
                  maxLength={100}
                  disabled={isSaving}
                  autoFocus
                />
                <span className={styles.charCount}>
                  {templateName.length}/100
                </span>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="templateDescription">
                  Beschreibung
                  <span className={styles.optionalBadge}>optional</span>
                </label>
                <textarea
                  id="templateDescription"
                  value={templateDescription}
                  onChange={(e) => setTemplateDescription(e.target.value)}
                  placeholder="z.B. Für Webentwicklungs-Projekte mit monatlicher Abrechnung"
                  rows={3}
                  maxLength={500}
                  disabled={isSaving}
                />
                <span className={styles.charCount}>
                  {templateDescription.length}/500
                </span>
              </div>

              <div className={styles.infoBox}>
                <div className={styles.infoHeader}>
                  <strong>⚠️ WICHTIG: So funktioniert's!</strong>
                </div>
                <ol className={styles.infoSteps}>
                  <li><strong>ZUERST</strong> das Formular unten ausfüllen (Vertragsgegenstand, Kaufpreis, etc.)</li>
                  <li><strong>DANN</strong> auf "Vorlage erstellen" klicken</li>
                  <li><strong>FERTIG!</strong> Alle ausgefüllten Felder werden gespeichert</li>
                </ol>
                <p className={styles.infoFooter}>
                  ✅ Später mit einem Klick alle Daten wiederherstellen!
                </p>
              </div>

              {error && (
                <div className={styles.errorBox}>
                  {error}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className={styles.modalFooter}>
              <button
                className={styles.cancelButton}
                onClick={handleClose}
                disabled={isSaving}
              >
                Abbrechen
              </button>
              <button
                className={styles.saveButton}
                onClick={handleSave}
                disabled={isSaving || !templateName.trim()}
              >
                {isSaving ? (
                  <>
                    <div className={styles.spinner}></div>
                    <span>Speichern...</span>
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    <span>Vorlage speichern</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default CreateTemplateModal;
