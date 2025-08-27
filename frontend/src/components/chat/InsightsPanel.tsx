// frontend/src/components/chat/InsightsPanel.tsx
import React, { useState } from 'react';
import { Insight } from '../../utils/chatApi';
import styles from '../../styles/Chat.module.css';

interface InsightsPanelProps {
  insights: Insight[];
  onShowInPdf?: (page: number, span?: [number, number]) => void;
  className?: string;
}

const InsightsPanel: React.FC<InsightsPanelProps> = ({
  insights,
  onShowInPdf,
  className
}) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['parties', 'amounts', 'deadlines', 'risks']));
  
  /**
   * Group insights by kind
   */
  const groupedInsights = React.useMemo(() => {
    return insights.reduce((groups, insight) => {
      if (!groups[insight.kind]) {
        groups[insight.kind] = [];
      }
      groups[insight.kind].push(insight);
      return groups;
    }, {} as Record<string, Insight[]>);
  }, [insights]);

  /**
   * Toggle section expansion
   */
  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  /**
   * Get section title in German
   */
  const getSectionTitle = (kind: string) => {
    const titles = {
      party: 'Vertragsparteien',
      amount: 'Beträge & Kosten',
      deadline: 'Fristen & Termine',
      risk: 'Risiken & Hinweise'
    };
    return titles[kind as keyof typeof titles] || kind;
  };

  /**
   * Get section icon
   */
  const getSectionIcon = (kind: string) => {
    switch (kind) {
      case 'party':
        return (
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M17 21V19C17 17.9391 16.5786 16.9217 15.8284 16.1716C15.0783 15.4214 14.0609 15 13 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
            <path d="M23 21V19C23 18.1332 22.7361 17.3328 22.2676 16.7201C21.7991 16.1074 21.1645 15.7122 20.5 15.5851" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M16 3.13C16.6645 3.25716 17.2991 3.6524 17.7676 4.2651C18.2361 4.87779 18.5 5.67821 18.5 6.545C18.5 7.41179 18.2361 8.21221 17.7676 8.8249C17.2991 9.4376 16.6645 9.83284 16 9.96" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );
      case 'amount':
        return (
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <line x1="12" y1="1" x2="12" y2="23" stroke="currentColor" strokeWidth="2"/>
            <path d="M17 5H9.5C8.57174 5 7.6815 5.36875 7.02513 6.02513C6.36875 6.6815 6 7.57174 6 8.5C6 9.42826 6.36875 10.3185 7.02513 10.9749C7.6815 11.6313 8.57174 12 9.5 12H14.5C15.4283 12 16.3185 12.3687 16.9749 13.0251C17.6313 13.6815 18 14.5717 18 15.5C18 16.4283 17.6313 17.3185 16.9749 17.9749C16.3185 18.6313 15.4283 19 14.5 19H6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );
      case 'deadline':
        return (
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
            <path d="M12 6V12L16 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );
      case 'risk':
        return (
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M10.29 3.86L1.82 18C1.64571 18.3024 1.55299 18.6453 1.55201 18.9945C1.55103 19.3437 1.64179 19.6871 1.81445 19.9905C1.98711 20.2939 2.23597 20.5467 2.53805 20.7239C2.84013 20.9011 3.18233 20.9962 3.53 21H20.47C20.8177 20.9962 21.1599 20.9011 21.4619 20.7239C21.764 20.5467 22.0129 20.2939 22.1856 19.9905C22.3582 19.6871 22.449 19.3437 22.448 18.9945C22.447 18.6453 22.3543 18.3024 22.18 18L13.71 3.86C13.5317 3.56611 13.2807 3.32312 12.9812 3.15133C12.6817 2.97953 12.3438 2.88467 12 2.88467C11.6562 2.88467 11.3183 2.97953 11.0188 3.15133C10.7193 3.32312 10.4683 3.56611 10.29 3.86V3.86Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <line x1="12" y1="9" x2="12" y2="13" stroke="currentColor" strokeWidth="2"/>
            <path d="M12 17H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );
      default:
        return (
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
            <line x1="12" y1="8" x2="12" y2="12" stroke="currentColor" strokeWidth="2"/>
            <line x1="12" y1="16" x2="12.01" y2="16" stroke="currentColor" strokeWidth="2"/>
          </svg>
        );
    }
  };

  /**
   * Get severity color for risks
   */
  const getSeverityColor = (severity?: string) => {
    switch (severity) {
      case 'high':
        return 'var(--error-color, #ef4444)';
      case 'medium':
        return 'var(--warning-color, #f59e0b)';
      case 'low':
        return 'var(--success-color, #10b981)';
      default:
        return 'var(--text-muted, #6b7280)';
    }
  };

  /**
   * Handle insight click
   */
  const handleInsightClick = (insight: Insight) => {
    if (insight.page && onShowInPdf) {
      onShowInPdf(insight.page, insight.span);
    }
  };

  /**
   * Render individual insight
   */
  const renderInsight = (insight: Insight, index: number) => {
    const isClickable = insight.page && onShowInPdf;
    
    return (
      <div
        key={index}
        className={`${styles.insightItem} ${isClickable ? styles.clickable : ''}`}
        onClick={isClickable ? () => handleInsightClick(insight) : undefined}
        role={isClickable ? 'button' : undefined}
        tabIndex={isClickable ? 0 : undefined}
        onKeyDown={isClickable ? (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleInsightClick(insight);
          }
        } : undefined}
      >
        <div className={styles.insightContent}>
          <div className={styles.insightLabel}>
            {insight.label}
          </div>
          <div className={styles.insightValue}>
            {insight.value}
          </div>
          {insight.kind === 'risk' && insight.severity && (
            <div 
              className={styles.severityBadge}
              style={{ 
                backgroundColor: getSeverityColor(insight.severity),
                color: 'white'
              }}
            >
              {insight.severity === 'high' ? 'Hoch' : 
               insight.severity === 'medium' ? 'Mittel' : 'Niedrig'}
            </div>
          )}
        </div>
        
        {insight.page && (
          <div className={styles.insightSource}>
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8L14 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M14 2V8H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Seite {insight.page}
          </div>
        )}
        
        {isClickable && (
          <div className={styles.insightArrow}>
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        )}
      </div>
    );
  };

  /**
   * Render section
   */
  const renderSection = (kind: string, sectionInsights: Insight[]) => {
    const isExpanded = expandedSections.has(kind);
    const sectionTitle = getSectionTitle(kind);
    
    return (
      <div key={kind} className={styles.insightSection}>
        <div 
          className={styles.sectionHeader}
          onClick={() => toggleSection(kind)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              toggleSection(kind);
            }
          }}
        >
          <div className={styles.sectionTitle}>
            <div className={styles.sectionIcon}>
              {getSectionIcon(kind)}
            </div>
            <span>{sectionTitle}</span>
            <span className={styles.sectionCount}>({sectionInsights.length})</span>
          </div>
          <div className={`${styles.expandIcon} ${isExpanded ? styles.expanded : ''}`}>
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>
        
        {isExpanded && (
          <div className={styles.sectionContent}>
            {sectionInsights.map((insight, index) => renderInsight(insight, index))}
          </div>
        )}
      </div>
    );
  };

  if (insights.length === 0) {
    return (
      <div className={`${styles.insightsPanel} ${className || ''}`}>
        <div className={styles.insightsPanelHeader}>
          <h3>
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 19C6.2 19 4 16.8 4 14V10C4 7.2 6.2 5 9 5H20L16 9H9C8.4 9 8 9.4 8 10V14C8 14.6 8.4 15 9 15H16L20 19H9Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="15" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
            </svg>
            Insights
          </h3>
        </div>
        
        <div className={styles.emptyInsights}>
          <div className={styles.emptyIcon}>
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 19C6.2 19 4 16.8 4 14V10C4 7.2 6.2 5 9 5H20L16 9H9C8.4 9 8 9.4 8 10V14C8 14.6 8.4 15 9 15H16L20 19H9Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <p>Stellen Sie eine Frage, um strukturierte Insights zu erhalten</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.insightsPanel} ${className || ''}`}>
      <div className={styles.insightsPanelHeader}>
        <h3>
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M9 19C6.2 19 4 16.8 4 14V10C4 7.2 6.2 5 9 5H20L16 9H9C8.4 9 8 9.4 8 10V14C8 14.6 8.4 15 9 15H16L20 19H9Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="15" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
          </svg>
          Insights
        </h3>
        <div className={styles.insightsSummary}>
          {insights.length} Erkenntnisse
        </div>
      </div>
      
      <div className={styles.insightsPanelContent}>
        {Object.entries(groupedInsights).map(([kind, sectionInsights]) => 
          renderSection(kind, sectionInsights)
        )}
      </div>
    </div>
  );
};

export default InsightsPanel;