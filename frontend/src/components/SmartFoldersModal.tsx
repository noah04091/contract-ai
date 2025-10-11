// 🤖 SmartFoldersModal.tsx - AI Folder Suggestions Modal
import { useState } from 'react';
import { X, Sparkles, Folder, Loader } from 'lucide-react';
import styles from '../styles/SmartFoldersModal.module.css';

interface SmartFolderSuggestion {
  name: string;
  icon: string;
  color: string;
  contracts: Array<{
    _id: string;
    name: string;
  }>;
}

interface SmartFoldersModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (suggestions: SmartFolderSuggestion[]) => Promise<void>;
  onFetchSuggestions: () => Promise<SmartFolderSuggestion[]>;
}

export default function SmartFoldersModal({
  isOpen,
  onClose,
  onConfirm,
  onFetchSuggestions
}: SmartFoldersModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [suggestions, setSuggestions] = useState<SmartFolderSuggestion[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Fetch suggestions when modal opens
  useState(() => {
    if (isOpen && suggestions.length === 0) {
      handleFetchSuggestions();
    }
  });

  const handleFetchSuggestions = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await onFetchSuggestions();
      setSuggestions(data);
    } catch (err: any) {
      setError(err.message || 'Fehler beim Laden der Vorschläge');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirm = async () => {
    setIsCreating(true);
    setError(null);

    try {
      await onConfirm(suggestions);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Fehler beim Erstellen der Ordner');
    } finally {
      setIsCreating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerIcon}>
            <Sparkles size={24} />
          </div>
          <div>
            <h3>Smart Folders</h3>
            <p>KI-basierte Ordnervorschläge für deine Verträge</p>
          </div>
          <button
            className={styles.closeBtn}
            onClick={onClose}
            disabled={isCreating}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className={styles.content}>
          {isLoading ? (
            <div className={styles.loadingState}>
              <Loader size={48} className={styles.spinner} />
              <p>Analysiere deine Verträge...</p>
            </div>
          ) : error ? (
            <div className={styles.errorState}>
              <p className={styles.errorMessage}>{error}</p>
              <button className={styles.retryBtn} onClick={handleFetchSuggestions}>
                Erneut versuchen
              </button>
            </div>
          ) : suggestions.length === 0 ? (
            <div className={styles.emptyState}>
              <Folder size={48} />
              <p>Keine Vorschläge gefunden</p>
              <small>Du hast bereits alle Verträge organisiert.</small>
            </div>
          ) : (
            <>
              <div className={styles.suggestionsList}>
                {suggestions.map((suggestion, index) => (
                  <div key={index} className={styles.suggestionCard}>
                    <div className={styles.suggestionHeader}>
                      <span
                        className={styles.suggestionIcon}
                        style={{ color: suggestion.color }}
                      >
                        {suggestion.icon}
                      </span>
                      <div className={styles.suggestionInfo}>
                        <h4>{suggestion.name}</h4>
                        <span className={styles.suggestionCount}>
                          {suggestion.contracts.length} Vertrag{suggestion.contracts.length !== 1 ? 'e' : ''}
                        </span>
                      </div>
                    </div>

                    {/* Contract List */}
                    <div className={styles.contractList}>
                      {suggestion.contracts.slice(0, 3).map((contract) => (
                        <div key={contract._id} className={styles.contractItem}>
                          • {contract.name}
                        </div>
                      ))}
                      {suggestion.contracts.length > 3 && (
                        <div className={styles.contractMore}>
                          +{suggestion.contracts.length - 3} weitere
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className={styles.info}>
                <Sparkles size={16} />
                <p>
                  Die KI hat {suggestions.length} Ordner vorgeschlagen, die {suggestions.reduce((sum, s) => sum + s.contracts.length, 0)} Verträge automatisch organisieren.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Actions */}
        {!isLoading && !error && suggestions.length > 0 && (
          <div className={styles.actions}>
            <button
              className={styles.cancelBtn}
              onClick={onClose}
              disabled={isCreating}
            >
              Abbrechen
            </button>
            <button
              className={styles.confirmBtn}
              onClick={handleConfirm}
              disabled={isCreating}
            >
              {isCreating ? (
                <>
                  <Loader size={16} className={styles.spinner} />
                  Erstelle...
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  Ordner erstellen
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
