// GeneratedContractsSection.tsx - Neue Komponente für das Dashboard
import React from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './GeneratedContractsSection.module.css';

interface Contract {
  _id: string;
  name: string;
  laufzeit: string;
  kuendigung: string;
  expiryDate?: string;
  status?: string;
  uploadedAt?: string;
  isGenerated?: boolean;
  createdAt?: string;
}

interface GeneratedContractsSectionProps {
  contracts: Contract[];
}

const GeneratedContractsSection: React.FC<GeneratedContractsSectionProps> = ({ contracts }) => {
  const navigate = useNavigate();
  
  // Filtere nur generierte Verträge und sortiere nach Erstellungsdatum
  const generatedContracts = contracts
    .filter(contract => contract.isGenerated === true)
    .sort((a, b) => {
      const dateA = new Date(a.createdAt || a.uploadedAt || 0).getTime();
      const dateB = new Date(b.createdAt || b.uploadedAt || 0).getTime();
      return dateB - dateA; // Neueste zuerst
    })
    .slice(0, 3); // Nur die 3 neuesten anzeigen

  if (generatedContracts.length === 0) {
    return null; // Sektion nicht anzeigen wenn keine generierten Verträge
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Unbekannt';
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <div className={styles.generatedSection}>
      <div className={styles.sectionHeader}>
        <div className={styles.headerContent}>
          <div className={styles.headerIcon}>
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 12L11 14L15 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className={styles.headerText}>
            <h2>✨ KI-Generierte Verträge</h2>
            <p>Ihre zuletzt erstellten Verträge mit künstlicher Intelligenz</p>
          </div>
        </div>
        <button 
          className={styles.viewAllButton}
          onClick={() => navigate('/contracts?filter=generated')}
        >
          <span>Alle anzeigen</span>
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      <div className={styles.contractsGrid}>
        {generatedContracts.map((contract) => (
          <div 
            key={contract._id} 
            className={styles.contractCard}
            onClick={() => navigate(`/contracts/${contract._id}`)}
          >
            <div className={styles.cardHeader}>
              <div className={styles.cardIcon}>
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M14 2V8H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M16 13H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M16 17H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M10 9H9H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className={styles.aiIndicator}>
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2L15.09 8.26L22 9L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9L8.91 8.26L12 2Z" fill="currentColor"/>
                </svg>
              </div>
            </div>
            
            <div className={styles.cardContent}>
              <h3 className={styles.contractName}>
                {contract.name || 'Unbenannter Vertrag'}
              </h3>
              <div className={styles.contractMeta}>
                <span className={styles.createdDate}>
                  Erstellt: {formatDate(contract.createdAt || contract.uploadedAt)}
                </span>
                <span className={`${styles.status} ${styles[contract.status?.toLowerCase().replace(' ', '') || 'unknown']}`}>
                  {contract.status || 'Aktiv'}
                </span>
              </div>
            </div>

            <div className={styles.cardFooter}>
              <div className={styles.cardActions}>
                <button 
                  className={styles.actionButton}
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/contracts/${contract._id}`);
                  }}
                >
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M1 12S5 4 12 4S23 12 23 12S19 20 12 20S1 12 1 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Anzeigen
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {generatedContracts.length === 0 && (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 12L11 14L15 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h3>Noch keine KI-Verträge erstellt</h3>
          <p>Nutzen Sie unseren intelligenten Vertragsgenerator, um schnell rechtssichere Verträge zu erstellen.</p>
          <button 
            className={styles.createButton}
            onClick={() => navigate('/generate')}
          >
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L15.09 8.26L22 9L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9L8.91 8.26L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Vertrag generieren
          </button>
        </div>
      )}
    </div>
  );
};

export default GeneratedContractsSection;