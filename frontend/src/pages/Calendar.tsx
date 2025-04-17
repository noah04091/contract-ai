// src/pages/Calendar.tsx
import { useEffect, useState, useRef } from "react";
import axios from "axios";
import Calendar from "react-calendar";
import "../styles/AppleCalendar.css";

interface Contract {
  _id: string;
  name: string;
  expiryDate?: string;
  description?: string;
  provider?: string;
  amount?: number;
}

interface ContractWithDate extends Contract {
  parsedDate: Date;
}

export default function CalendarPage() {
  const [markedDates, setMarkedDates] = useState<ContractWithDate[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [today] = useState(new Date());
  const [view, setView] = useState<"month" | "year">("month");
  const [selectedContract, setSelectedContract] = useState<ContractWithDate | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchContracts = async () => {
      setLoading(true);
      setError("");
      
      try {
        const token = localStorage.getItem("token") || "";
        const res = await axios.get("https://contract-ai-backend.onrender.com/calendar-events", {
          headers: { Authorization: token },
        });

        const contracts = res.data as Contract[];
        
        // Filter and parse dates
        const contractsWithDates = contracts
          .filter((c) => c.expiryDate)
          .map((c) => ({
            ...c,
            parsedDate: new Date(c.expiryDate!)
          }));
        
        setMarkedDates(contractsWithDates);
      } catch (err) {
        console.error("Fehler beim Laden der Verträge:", err);
        setError("Die Vertragsdaten konnten nicht geladen werden. Bitte versuche es später erneut.");
      } finally {
        setLoading(false);
      }
    };
    
    fetchContracts();
  }, []);

  useEffect(() => {
    // Close modal when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        setSelectedContract(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const tileClassName = ({ date }: { date: Date }) => {
    const dateString = date.toDateString();
    
    // Check if any contract expires on this date
    const hasContract = markedDates.some(c => c.parsedDate.toDateString() === dateString);
    
    // Check if date is in the past
    const isPast = date < today && date.toDateString() !== today.toDateString();
    
    if (hasContract) {
      return "marked-date";
    } else if (isPast) {
      return "past-date";
    }
    
    return null;
  };

  const tileContent = ({ date }: { date: Date }) => {
    const contractsForDate = markedDates.filter(
      c => c.parsedDate.toDateString() === date.toDateString()
    );
    
    if (contractsForDate.length > 0) {
      return (
        <div className="contract-indicator">
          <span className="contract-dot"></span>
          {contractsForDate.length > 1 && (
            <span className="contract-count">{contractsForDate.length}</span>
          )}
        </div>
      );
    }
    
    return null;
  };

  // Wir können das onChange von react-calendar direkt verwenden
  // @ts-ignore - Um den TypeScript-Fehler zu umgehen
  const handleDateClick = (value) => {
    if (value instanceof Date) {
      setSelectedDate(value);
      
      // Find contracts for the selected date
      const contractsForDate = markedDates.filter(
        c => c.parsedDate.toDateString() === value.toDateString()
      );
      
      if (contractsForDate.length === 1) {
        setSelectedContract(contractsForDate[0]);
      } else if (contractsForDate.length > 1) {
        // If multiple contracts, first one will be selected
        setSelectedContract(contractsForDate[0]);
      } else {
        setSelectedContract(null);
      }
    }
  };

  const formatDate = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    };
    return date.toLocaleDateString('de-DE', options);
  };

  const getUpcomingContracts = () => {
    const now = new Date();
    
    // Filter contracts that expire in the future and sort by expiry date
    const upcoming = [...markedDates]
      .filter(contract => contract.parsedDate >= now)
      .sort((a, b) => a.parsedDate.getTime() - b.parsedDate.getTime());
    
    // Return the next 3 contracts
    return upcoming.slice(0, 3);
  };

  const getDaysRemaining = (date: Date) => {
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "Heute";
    if (diffDays === 1) return "Morgen";
    return `In ${diffDays} Tagen`;
  };

  return (
    <div className="apple-calendar-page">
      <div className="calendar-bg">
        <div className="calendar-shape shape-1"></div>
        <div className="calendar-shape shape-2"></div>
      </div>
      
      <div className="calendar-container">
        <div className="calendar-header">
          <div className="calendar-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
          </div>
          <h1>Vertragskalender</h1>
          <p className="calendar-subtitle">Übersicht aller ablaufenden Verträge</p>
        </div>
        
        <div className="calendar-view-toggle">
          <button 
            className={view === "month" ? "active" : ""} 
            onClick={() => setView("month")}
          >
            Monat
          </button>
          <button 
            className={view === "year" ? "active" : ""} 
            onClick={() => setView("year")}
          >
            Jahr
          </button>
        </div>
        
        <div className="calendar-layout">
          <div className="calendar-main">
            {loading ? (
              <div className="calendar-loading">
                <div className="spinner"></div>
                <p>Verträge werden geladen...</p>
              </div>
            ) : error ? (
              <div className="calendar-error">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                <p>{error}</p>
              </div>
            ) : (
              <Calendar 
                onChange={handleDateClick}
                value={selectedDate || today}
                tileClassName={tileClassName}
                tileContent={tileContent}
                view={view}
                onViewChange={({ view: newView }) => setView(newView as "month" | "year")}
                showNeighboringMonth={false}
                minDetail="year"
                next2Label={null}
                prev2Label={null}
                formatMonthYear={(_, date) => {
                  const month = date.toLocaleDateString('de-DE', { month: 'long' });
                  const year = date.getFullYear();
                  return `${month} ${year}`;
                }}
                formatShortWeekday={(_, date) => 
                  date.toLocaleDateString('de-DE', { weekday: 'short' }).substring(0, 2)
                }
              />
            )}
            
            <div className="calendar-legend">
              <div className="legend-item">
                <span className="legend-dot"></span>
                <span className="legend-text">Vertrag läuft aus</span>
              </div>
              <div className="legend-item">
                <span className="legend-today"></span>
                <span className="legend-text">Heute</span>
              </div>
            </div>
          </div>
          
          <div className="calendar-sidebar">
            <div className="sidebar-section">
              <h3>Kommende Ereignisse</h3>
              {getUpcomingContracts().length > 0 ? (
                <div className="upcoming-contracts">
                  {getUpcomingContracts().map((contract) => (
                    <div 
                      key={contract._id} 
                      className="contract-card"
                      onClick={() => setSelectedContract(contract)}
                    >
                      <div className="contract-card-header">
                        <h4>{contract.name || "Unbenannter Vertrag"}</h4>
                        <span className="expiry-badge">
                          {getDaysRemaining(contract.parsedDate)}
                        </span>
                      </div>
                      <div className="contract-date">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                          <line x1="16" y1="2" x2="16" y2="6"></line>
                          <line x1="8" y1="2" x2="8" y2="6"></line>
                          <line x1="3" y1="10" x2="21" y2="10"></line>
                        </svg>
                        {formatDate(contract.parsedDate)}
                      </div>
                      {contract.provider && (
                        <div className="contract-provider">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20 7h-9"></path>
                            <path d="M14 17H5"></path>
                            <circle cx="17" cy="17" r="3"></circle>
                            <circle cx="7" cy="7" r="3"></circle>
                          </svg>
                          {contract.provider}
                        </div>
                      )}
                      {contract.amount && (
                        <div className="contract-amount">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="12" y1="1" x2="12" y2="23"></line>
                            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                          </svg>
                          {contract.amount.toFixed(2)} €
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="no-contracts">Keine kommenden Vertragsenden</p>
              )}
            </div>
            
            <div className="sidebar-section">
              <h3>Kalenderübersicht</h3>
              <div className="calendar-stats">
                <div className="stat-card">
                  <div className="stat-value">{markedDates.length}</div>
                  <div className="stat-label">Verträge gesamt</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">
                    {markedDates.filter(c => c.parsedDate >= today).length}
                  </div>
                  <div className="stat-label">Zukünftige Ereignisse</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">
                    {markedDates.filter(c => {
                      const diffTime = c.parsedDate.getTime() - today.getTime();
                      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                      return diffDays <= 30 && diffDays >= 0;
                    }).length}
                  </div>
                  <div className="stat-label">In den nächsten 30 Tagen</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {selectedContract && (
        <div className="contract-modal-overlay">
          <div className="contract-modal" ref={modalRef}>
            <div className="modal-header">
              <h3>{selectedContract.name || "Unbenannter Vertrag"}</h3>
              <button 
                className="close-modal"
                onClick={() => setSelectedContract(null)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            
            <div className="modal-content">
              <div className="modal-detail">
                <span className="detail-label">Ablaufdatum:</span>
                <span className="detail-value">{formatDate(selectedContract.parsedDate)}</span>
              </div>
              
              {selectedContract.provider && (
                <div className="modal-detail">
                  <span className="detail-label">Anbieter:</span>
                  <span className="detail-value">{selectedContract.provider}</span>
                </div>
              )}
              
              {selectedContract.amount && (
                <div className="modal-detail">
                  <span className="detail-label">Betrag:</span>
                  <span className="detail-value">{selectedContract.amount.toFixed(2)} €</span>
                </div>
              )}
              
              {selectedContract.description && (
                <div className="modal-detail">
                  <span className="detail-label">Beschreibung:</span>
                  <p className="detail-value description">
                    {selectedContract.description}
                  </p>
                </div>
              )}
              
              <div className="modal-actions">
                <button className="modal-button secondary">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                    <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z"></path>
                  </svg>
                  Bearbeiten
                </button>
                <button className="modal-button primary">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                  </svg>
                  Zum Vertrag
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}