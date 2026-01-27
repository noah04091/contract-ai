import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from '../styles/ImportantDatesSection.module.css';

// Interface für wichtige Datums aus der KI-Analyse
interface ImportantDate {
  type: string;
  date: string;
  label: string;
  description?: string;
  calculated?: boolean;
  source?: string;
  confidence?: number;  // 🔒 NEU: Konfidenz-Wert (0-100)
  validated?: boolean;  // 🔒 NEU: Backend-validiert
}

// 🔒 KONFIDENZ-THRESHOLD für Anzeige
const MIN_CONFIDENCE_TO_DISPLAY = 60;

// Props für die Komponente
interface ImportantDatesSectionProps {
  importantDates: ImportantDate[];
  contractName: string;
}

// Mapping von Datums-Typen zu Emojis und Labels
const dateTypeConfig: Record<string, { emoji: string; color: string; priority: number }> = {
  'cancellation_deadline': { emoji: '⚠️', color: '#dc2626', priority: 1 },
  'notice_period_start': { emoji: '📬', color: '#dc2626', priority: 2 },
  'trial_end': { emoji: '⏳', color: '#dc2626', priority: 3 },
  'insurance_coverage_end': { emoji: '🛡️', color: '#dc2626', priority: 4 },
  'lease_end': { emoji: '🚗', color: '#dc2626', priority: 5 },
  'option_deadline': { emoji: '⏰', color: '#dc2626', priority: 6 },
  'interest_rate_change': { emoji: '📈', color: '#dc2626', priority: 7 },
  'license_expiry': { emoji: '🔑', color: '#dc2626', priority: 8 },
  'end_date': { emoji: '📅', color: '#f59e0b', priority: 10 },
  'renewal_date': { emoji: '🔄', color: '#f59e0b', priority: 11 },
  'warranty_end': { emoji: '🛡️', color: '#f59e0b', priority: 12 },
  'probation_end': { emoji: '👔', color: '#f59e0b', priority: 13 },
  'price_guarantee_end': { emoji: '💶', color: '#f59e0b', priority: 14 },
  'payment_due': { emoji: '💰', color: '#f59e0b', priority: 15 },
  'inspection_due': { emoji: '🔧', color: '#f59e0b', priority: 16 },
  'minimum_term_end': { emoji: '🔓', color: '#22c55e', priority: 20 },
  'start_date': { emoji: '📝', color: '#6366f1', priority: 30 },
  'contract_signed': { emoji: '✍️', color: '#6366f1', priority: 31 },
  'service_start': { emoji: '▶️', color: '#6366f1', priority: 32 },
  'loan_end': { emoji: '🏦', color: '#22c55e', priority: 33 },
  'delivery_date': { emoji: '📦', color: '#6366f1', priority: 34 },
  'other': { emoji: '📌', color: '#6b7280', priority: 99 }
};

// Reminder-Konfiguration basierend auf Severity
const reminderConfig = {
  critical: ['30 Tage vorher', '14 Tage vorher', '7 Tage vorher', '3 Tage vorher'],
  warning: ['14 Tage vorher', '7 Tage vorher'],
  info: ['7 Tage vorher']
};

// Severity basierend auf Typ
const getSeverity = (type: string): 'critical' | 'warning' | 'info' => {
  const criticalTypes = ['cancellation_deadline', 'notice_period_start', 'trial_end', 'insurance_coverage_end', 'lease_end', 'option_deadline', 'interest_rate_change', 'license_expiry'];
  const warningTypes = ['end_date', 'renewal_date', 'warranty_end', 'probation_end', 'price_guarantee_end', 'payment_due', 'inspection_due'];

  if (criticalTypes.includes(type)) return 'critical';
  if (warningTypes.includes(type)) return 'warning';
  return 'info';
};

export default function ImportantDatesSection({ importantDates, contractName }: ImportantDatesSectionProps) {
  const [selectedDate, setSelectedDate] = useState<ImportantDate | null>(null);
  const navigate = useNavigate();

  // Keine Anzeige wenn keine Datums vorhanden
  if (!importantDates || importantDates.length === 0) {
    return null;
  }

  // 🔒 FILTER: Nur hochkonfidente Daten anzeigen
  // Rückwärtskompatibilität: Wenn keine Konfidenz vorhanden, zeigen (alte Daten)
  const filteredDates = importantDates.filter(d => {
    // Wenn Konfidenz vorhanden ist, muss sie >= Threshold sein
    if (d.confidence !== undefined && d.confidence < MIN_CONFIDENCE_TO_DISPLAY) {
      console.log(`🔒 ImportantDate gefiltert (Konfidenz ${d.confidence}% < ${MIN_CONFIDENCE_TO_DISPLAY}%):`, d.type, d.date);
      return false;
    }
    return true;
  });

  // Keine Anzeige wenn nach Filter keine Datums übrig
  if (filteredDates.length === 0) {
    return null;
  }

  // Navigiere zum Kalender mit dem ausgewählten Datum
  const handleOpenInCalendar = (date: string) => {
    // Formatiere das Datum für die Kalender-URL (YYYY-MM-DD)
    const dateObj = new Date(date);
    const year = dateObj.getFullYear();
    const month = dateObj.getMonth(); // 0-indexed für Kalender
    navigate(`/calendar?year=${year}&month=${month}&highlight=${date}`);
  };

  // Sortiere nach Priorität (kritische zuerst) und dann nach Datum
  // 🔒 Verwende gefilterte Daten statt Original
  const sortedDates = [...filteredDates].sort((a, b) => {
    const priorityA = dateTypeConfig[a.type]?.priority || 99;
    const priorityB = dateTypeConfig[b.type]?.priority || 99;
    if (priorityA !== priorityB) return priorityA - priorityB;
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  });

  // Formatiere Datum auf Deutsch
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Berechne Tage bis zum Datum
  const getDaysUntil = (dateString: string): number => {
    const date = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    return Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  // Formatiere "Tage bis" Anzeige
  const formatDaysUntil = (days: number): string => {
    if (days < 0) return `${Math.abs(days)} Tage vergangen`;
    if (days === 0) return 'Heute!';
    if (days === 1) return 'Morgen';
    if (days <= 7) return `In ${days} Tagen`;
    if (days <= 30) return `In ${Math.ceil(days / 7)} Wochen`;
    if (days <= 365) return `In ${Math.ceil(days / 30)} Monaten`;
    return `In ${Math.ceil(days / 365)} Jahren`;
  };

  // Bestimme Urgency-Klasse basierend auf Tagen
  const getUrgencyClass = (days: number, type: string): string => {
    const severity = getSeverity(type);
    if (days < 0) return styles.past;
    if (severity === 'critical') {
      if (days <= 7) return styles.urgent;
      if (days <= 30) return styles.warning;
    }
    if (severity === 'warning') {
      if (days <= 14) return styles.warning;
    }
    return styles.normal;
  };

  return (
    <>
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.headerIcon}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M8 7V3M16 7V3M7 11H17M5 21H19C20.1046 21 21 20.1046 21 19V7C21 5.89543 20.1046 5 19 5H5C3.89543 5 3 5.89543 3 7V19C3 20.1046 3.89543 21 5 21Z"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h3 className={styles.title}>Wichtige Termine</h3>
          <span className={styles.badge}>{sortedDates.length}</span>
        </div>

        <div className={styles.datesList}>
          {sortedDates.map((dateItem, index) => {
            const config = dateTypeConfig[dateItem.type] || dateTypeConfig['other'];
            const daysUntil = getDaysUntil(dateItem.date);
            const urgencyClass = getUrgencyClass(daysUntil, dateItem.type);

            return (
              <div
                key={index}
                className={`${styles.dateItem} ${urgencyClass}`}
                onClick={() => setSelectedDate(dateItem)}
              >
                <div className={styles.dateEmoji} style={{ color: config.color }}>
                  {config.emoji}
                </div>
                <div className={styles.dateContent}>
                  <div className={styles.dateLabel}>{dateItem.label}</div>
                  <div className={styles.dateValue}>{formatDate(dateItem.date)}</div>
                </div>
                <div className={styles.dateCountdown}>
                  <span className={`${styles.daysUntil} ${urgencyClass}`}>
                    {formatDaysUntil(daysUntil)}
                  </span>
                  {/* 🔒 Warnung für berechnete/unsichere Daten */}
                  {dateItem.calculated && (
                    <span
                      className={styles.calculatedBadge}
                      title={`Von KI berechnet${dateItem.confidence ? ` (Konfidenz: ${dateItem.confidence}%)` : ''}`}
                      style={{
                        backgroundColor: dateItem.confidence && dateItem.confidence < 75 ? '#f59e0b' : '#6366f1'
                      }}
                    >
                      {dateItem.confidence && dateItem.confidence < 75 ? '~' : 'KI'}
                    </span>
                  )}
                </div>
                <button
                  className={styles.detailsButton}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedDate(dateItem);
                  }}
                  aria-label="Details anzeigen"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal für Datums-Details */}
      {selectedDate && (
        <div className={styles.modalOverlay} onClick={() => setSelectedDate(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalTitle}>
                <span className={styles.modalEmoji}>
                  {dateTypeConfig[selectedDate.type]?.emoji || '📌'}
                </span>
                <h3>{selectedDate.label}</h3>
              </div>
              <button
                className={styles.closeButton}
                onClick={() => setSelectedDate(null)}
                aria-label="Schließen"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>

            <div className={styles.modalContent}>
              <div className={styles.modalDateDisplay}>
                <div className={styles.bigDate}>
                  {formatDate(selectedDate.date)}
                </div>
                <div className={`${styles.countdown} ${getUrgencyClass(getDaysUntil(selectedDate.date), selectedDate.type)}`}>
                  {formatDaysUntil(getDaysUntil(selectedDate.date))}
                </div>
              </div>

              {selectedDate.description && (
                <div className={styles.modalSection}>
                  <h4>Beschreibung</h4>
                  <p>{selectedDate.description}</p>
                </div>
              )}

              {selectedDate.source && (
                <div className={styles.modalSection}>
                  <h4>Fundstelle</h4>
                  <p className={styles.source}>{selectedDate.source}</p>
                </div>
              )}

              <div className={styles.modalSection}>
                <h4>Erinnerungen</h4>
                <div className={styles.reminderList}>
                  {reminderConfig[getSeverity(selectedDate.type)].map((reminder, idx) => (
                    <div key={idx} className={styles.reminderItem}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <span>{reminder}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 🔒 Verbesserte Warnung für berechnete/unsichere Daten */}
              {selectedDate.calculated && (
                <div
                  className={styles.calculatedNote}
                  style={{
                    backgroundColor: selectedDate.confidence && selectedDate.confidence < 75
                      ? 'rgba(245, 158, 11, 0.1)'
                      : 'rgba(99, 102, 241, 0.1)',
                    borderColor: selectedDate.confidence && selectedDate.confidence < 75
                      ? 'rgba(245, 158, 11, 0.3)'
                      : 'rgba(99, 102, 241, 0.3)'
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386L9.663 17z"
                      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span>
                    Dieses Datum wurde von der KI aus den Vertragsangaben berechnet
                    {selectedDate.confidence && (
                      <strong> (Konfidenz: {selectedDate.confidence}%)</strong>
                    )}
                  </span>
                </div>
              )}

              {/* 📅 Kalender-Link Button */}
              <button
                className={styles.calendarLinkButton}
                onClick={() => handleOpenInCalendar(selectedDate.date)}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M8 7V3M16 7V3M7 11H17M5 21H19C20.1046 21 21 20.1046 21 19V7C21 5.89543 20.1046 5 19 5H5C3.89543 5 3 5.89543 3 7V19C3 20.1046 3.89543 21 5 21Z"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span>Im Vertragskalender anzeigen</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>

              <div className={styles.modalFooter}>
                <span className={styles.contractName}>
                  Vertrag: {contractName}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
