// 📚 EnhancedTemplateLibrary.tsx - Erweiterte Vorlagen-Bibliothek mit User Templates

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Plus, Star, Trash2, AlertCircle } from 'lucide-react';
import { toast } from 'react-toastify';
import styles from '../styles/Generate.module.css';
import { UserTemplate, fetchTemplatesByType, deleteUserTemplate } from '../services/userTemplatesAPI';

interface ContractTemplate {
  id: string;
  name: string;
  description: string;
  contractType: string;
  icon: string;
  prefilled: Record<string, any>;
  tags: string[];
  isPremium?: boolean;
}

interface EnhancedTemplateLibraryProps {
  contractType: string;
  systemTemplates: ContractTemplate[];
  onSelectTemplate: (template: ContractTemplate | UserTemplate, isUserTemplate: boolean) => void;
  onCreateTemplate: () => void;
  isPremium: boolean;
  onUserTemplatesChange?: () => void;
}

const EnhancedTemplateLibrary: React.FC<EnhancedTemplateLibraryProps> = ({
  contractType,
  systemTemplates,
  onSelectTemplate,
  onCreateTemplate,
  isPremium,
  onUserTemplatesChange
}) => {
  const [userTemplates, setUserTemplates] = useState<UserTemplate[]>([]);
  const [isLoadingUserTemplates, setIsLoadingUserTemplates] = useState(true);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);

  // Load user templates for this contract type
  useEffect(() => {
    loadUserTemplates();
  }, [contractType]);

  const loadUserTemplates = async () => {
    setIsLoadingUserTemplates(true);
    try {
      const templates = await fetchTemplatesByType(contractType);
      setUserTemplates(templates);
    } catch (error: any) {
      console.error('Fehler beim Laden der User Templates:', error);
      // Nicht toast.error hier, um UI nicht zu spammen
    } finally {
      setIsLoadingUserTemplates(false);
    }
  };

  const handleDeleteUserTemplate = async (templateId: string, templateName: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent template selection

    if (!window.confirm(`Möchten Sie die Vorlage "${templateName}" wirklich löschen?`)) {
      return;
    }

    setIsDeletingId(templateId);
    try {
      await deleteUserTemplate(templateId);
      setUserTemplates(prev => prev.filter(t => t.id !== templateId));
      toast.success(`Vorlage "${templateName}" gelöscht`);
      onUserTemplatesChange?.();
    } catch (error: any) {
      toast.error(error.message || 'Fehler beim Löschen der Vorlage');
    } finally {
      setIsDeletingId(null);
    }
  };

  const hasTemplates = systemTemplates.length > 0 || userTemplates.length > 0;
  const totalTemplates = systemTemplates.length + userTemplates.length;

  // Fallback UI wenn keine Templates verfügbar
  if (!hasTemplates && !isLoadingUserTemplates) {
    return (
      <motion.div
        className={styles.templateLibrary}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className={styles.templateHeader}>
          <BookOpen size={20} />
          <h3>Vorlagen-Bibliothek</h3>
          <span className={styles.templateCount}>Keine Vorlagen</span>
        </div>

        <div className={styles.emptyTemplates}>
          <div className={styles.emptyIcon}>
            <AlertCircle size={48} />
          </div>
          <h4>Keine Vorlagen verfügbar</h4>
          <p>Es gibt noch keine vorgefertigten Vorlagen für diesen Vertragstyp.</p>
          <button
            className={styles.createTemplateButton}
            onClick={onCreateTemplate}
          >
            <Plus size={18} />
            <span>Erste Vorlage erstellen</span>
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className={styles.templateLibrary}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className={styles.templateHeader}>
        <BookOpen size={20} />
        <h3>Vorlagen-Bibliothek</h3>
        <span className={styles.templateCount}>
          {totalTemplates} {totalTemplates === 1 ? 'Vorlage' : 'Vorlagen'}
        </span>
      </div>

      {/* Create Template Button */}
      <button
        className={styles.createTemplateButtonInline}
        onClick={onCreateTemplate}
      >
        <Plus size={16} />
        <span>Eigene Vorlage erstellen</span>
      </button>

      <div className={styles.templateGrid}>
        {/* User Templates Section */}
        {userTemplates.length > 0 && (
          <>
            {userTemplates.map((template) => (
              <motion.div
                key={template.id}
                className={`${styles.templateCard} ${styles.userTemplate}`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  onSelectTemplate(template, true);
                  toast.success(`✅ Vorlage "${template.name}" geladen!`);
                }}
              >
                <div className={styles.templateIcon}>📝</div>
                <div className={styles.templateInfo}>
                  <h4>{template.name}</h4>
                  <p>{template.description || 'Eigene Vorlage'}</p>
                  <div className={styles.templateTags}>
                    <span className={`${styles.tag} ${styles.userTag}`}>
                      Meine Vorlage
                    </span>
                  </div>
                </div>
                <button
                  className={styles.deleteTemplateButton}
                  onClick={(e) => handleDeleteUserTemplate(template.id, template.name, e)}
                  disabled={isDeletingId === template.id}
                  aria-label="Vorlage löschen"
                  title="Vorlage löschen"
                >
                  {isDeletingId === template.id ? (
                    <div className={styles.miniSpinner}></div>
                  ) : (
                    <Trash2 size={14} />
                  )}
                </button>
              </motion.div>
            ))}
          </>
        )}

        {/* System Templates Section */}
        {systemTemplates.map((template) => (
          <motion.div
            key={template.id}
            className={`${styles.templateCard} ${template.isPremium && !isPremium ? styles.locked : ''}`}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              if (!template.isPremium || isPremium) {
                onSelectTemplate(template, false);
                toast.success(`✅ Vorlage "${template.name}" geladen!`);
              } else {
                toast.warning('🔒 Diese Vorlage erfordert Premium');
              }
            }}
          >
            <div className={styles.templateIcon}>{template.icon}</div>
            <div className={styles.templateInfo}>
              <h4>{template.name}</h4>
              <p>{template.description}</p>
              <div className={styles.templateTags}>
                {template.tags.map(tag => (
                  <span key={tag} className={styles.tag}>{tag}</span>
                ))}
              </div>
            </div>
            {template.isPremium && (
              <div className={styles.premiumBadge}>
                <Star size={12} />
                Premium
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

export default EnhancedTemplateLibrary;
