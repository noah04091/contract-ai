// frontend/src/components/chat/QuickPrompts.tsx
import React, { useState, useEffect } from 'react';
import ChatApi from '../../utils/chatApi';
import styles from '../../styles/Chat.module.css';

interface QuickPrompt {
  id: string;
  text: string;
  category: 'explain' | 'extract' | 'calculate' | 'risk' | 'draft' | 'redline' | 'general';
  icon: string;
  description?: string;
}

interface QuickPromptsProps {
  contractId?: string;
  onPromptSelect: (prompt: string) => void;
  disabled?: boolean;
  className?: string;
}

const QuickPrompts: React.FC<QuickPromptsProps> = ({
  contractId,
  onPromptSelect,
  disabled = false,
  className
}) => {
  const [suggestions, setSuggestions] = useState<QuickPrompt[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Default quick prompts
  const defaultPrompts: QuickPrompt[] = [
    {
      id: 'risks',
      text: 'Welche Risiken bestehen für mich in diesem Vertrag?',
      category: 'risk',
      icon: '⚠️',
      description: 'Identifiziert potentielle Risiken und Nachteile'
    },
    {
      id: 'deadlines',
      text: 'Alle Kündigungsfristen und Vertragsstrafen auflisten',
      category: 'extract',
      icon: '⏰',
      description: 'Extrahiert wichtige Fristen und Termine'
    },
    {
      id: 'explain_liability',
      text: 'Erkläre die Haftungsklauseln für Laien verständlich',
      category: 'explain',
      icon: '📚',
      description: 'Vereinfacht komplexe rechtliche Begriffe'
    },
    {
      id: 'payments',
      text: 'Alle Zahlungsverpflichtungen mit Fälligkeit',
      category: 'calculate',
      icon: '💰',
      description: 'Berechnet Kosten und Zahlungstermine'
    },
    {
      id: 'termination_letter',
      text: 'Entwurf: Kündigungsschreiben für diesen Vertrag',
      category: 'draft',
      icon: '📝',
      description: 'Erstellt rechtssichere Schreiben'
    },
    {
      id: 'redline',
      text: 'Redline-Vorschläge zur Verbesserung der AGB',
      category: 'redline',
      icon: '✏️',
      description: 'Schlägt Vertragsverbesserungen vor'
    },
    {
      id: 'key_points',
      text: 'Die 5 wichtigsten Punkte dieses Vertrags',
      category: 'general',
      icon: '📋',
      description: 'Fasst die Kernpunkte zusammen'
    },
    {
      id: 'parties_obligations',
      text: 'Welche Pflichten haben beide Vertragsparteien?',
      category: 'extract',
      icon: '🤝',
      description: 'Extrahiert Rechte und Pflichten'
    }
  ];

  /**
   * Load suggestions from API
   */
  const loadSuggestions = async () => {
    if (!contractId) {
      setSuggestions(defaultPrompts);
      return;
    }
    
    setLoading(true);
    try {
      const response = await ChatApi.getSuggestions(contractId);
      
      if (response.success && response.data) {
        // Convert API suggestions to QuickPrompt format
        const apiPrompts = response.data.suggestions.map((suggestion, index) => ({
          id: `api_${index}`,
          text: suggestion.text,
          category: suggestion.category as any,
          icon: suggestion.icon,
          description: 'Maßgeschneidert für Ihren Vertrag'
        }));
        
        // Combine with default prompts, prioritizing API suggestions
        const combinedPrompts = [...apiPrompts, ...defaultPrompts];
        // Remove duplicates based on similar text
        const uniquePrompts = combinedPrompts.filter((prompt, index, arr) => 
          arr.findIndex(p => p.text.toLowerCase() === prompt.text.toLowerCase()) === index
        );
        
        setSuggestions(uniquePrompts.slice(0, 12)); // Limit to 12 suggestions
      } else {
        setSuggestions(defaultPrompts);
      }
    } catch (error) {
      console.error('Failed to load suggestions:', error);
      setSuggestions(defaultPrompts);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Load suggestions when contract changes
   */
  useEffect(() => {
    loadSuggestions();
  }, [contractId]);

  /**
   * Get category filter options
   */
  const categories = [
    { id: 'all', label: 'Alle', icon: '🎯' },
    { id: 'explain', label: 'Erklären', icon: '📚' },
    { id: 'extract', label: 'Extrahieren', icon: '📊' },
    { id: 'calculate', label: 'Berechnen', icon: '💰' },
    { id: 'risk', label: 'Risiken', icon: '⚠️' },
    { id: 'draft', label: 'Entwürfe', icon: '📝' },
    { id: 'redline', label: 'Verbessern', icon: '✏️' }
  ];

  /**
   * Filter suggestions by category
   */
  const filteredSuggestions = selectedCategory === 'all' 
    ? suggestions 
    : suggestions.filter(s => s.category === selectedCategory);

  /**
   * Handle prompt selection
   */
  const handlePromptClick = (prompt: QuickPrompt) => {
    if (disabled) return;
    onPromptSelect(prompt.text);
  };

  /**
   * Handle category selection
   */
  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategory(categoryId);
  };

  if (loading) {
    return (
      <div className={`${styles.quickPrompts} ${className || ''}`}>
        <div className={styles.quickPromptsHeader}>
          <h4>Quick-Prompts</h4>
        </div>
        <div className={styles.promptsLoading}>
          <div className={styles.loadingSpinner}>
            <div></div><div></div><div></div>
          </div>
          <p>Lade Vorschläge...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.quickPrompts} ${className || ''}`}>
      <div className={styles.quickPromptsHeader}>
        <h4>
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M13 9L15 7L13 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M9 9H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Quick-Prompts
        </h4>
        <div className={styles.promptsCount}>
          {filteredSuggestions.length} Vorschläge
        </div>
      </div>

      {/* Category Filter */}
      <div className={styles.categoryFilter}>
        {categories.map(category => (
          <button
            key={category.id}
            className={`${styles.categoryButton} ${selectedCategory === category.id ? styles.active : ''}`}
            onClick={() => handleCategoryChange(category.id)}
            disabled={disabled}
          >
            <span className={styles.categoryIcon}>{category.icon}</span>
            <span className={styles.categoryLabel}>{category.label}</span>
          </button>
        ))}
      </div>

      {/* Prompts Grid */}
      <div className={styles.promptsGrid}>
        {filteredSuggestions.map(prompt => (
          <button
            key={prompt.id}
            className={`${styles.promptChip} ${disabled ? styles.disabled : ''}`}
            onClick={() => handlePromptClick(prompt)}
            disabled={disabled}
            title={prompt.description}
          >
            <div className={styles.promptContent}>
              <span className={styles.promptIcon}>{prompt.icon}</span>
              <span className={styles.promptText}>{prompt.text}</span>
            </div>
            
            {prompt.description && (
              <div className={styles.promptDescription}>
                {prompt.description}
              </div>
            )}
            
            <div className={styles.promptAction}>
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </button>
        ))}
      </div>

      {filteredSuggestions.length === 0 && (
        <div className={styles.noPrompts}>
          <div className={styles.noPromptsIcon}>
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/>
              <path d="M21 21L16.65 16.65" stroke="currentColor" strokeWidth="2"/>
            </svg>
          </div>
          <p>Keine Prompts für diese Kategorie verfügbar</p>
        </div>
      )}

      {/* Refresh Button */}
      {contractId && (
        <div className={styles.promptsActions}>
          <button
            className={styles.refreshButton}
            onClick={loadSuggestions}
            disabled={loading || disabled}
            title="Neue Vorschläge laden"
          >
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M1 4V10H7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M23 20V14H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10M23 14L18.36 18.36A9 9 0 0 1 3.51 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {loading ? 'Lädt...' : 'Aktualisieren'}
          </button>
        </div>
      )}
    </div>
  );
};

export default QuickPrompts;