// src/pages/CalendarView.tsx
import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet";
import FullCalendar from "@fullcalendar/react";
import { EventClickArg, EventInput } from "@fullcalendar/core";
import dayGridPlugin from "@fullcalendar/daygrid";
// Das Interaction-Plugin optional machen, falls es Probleme macht
// import interactionPlugin from "@fullcalendar/interaction";
import "../styles/AppleCalendarView.css"; // Neues Apple-Style CSS

interface Contract {
  _id: string;
  name: string;
  expiryDate?: string;
  provider?: string;
  amount?: number;
}

export default function CalendarView() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>(
    new Date().toLocaleString('de-DE', { month: 'long', year: 'numeric' })
  );
  const calendarRef = useRef<FullCalendar>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchContracts = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const res = await fetch("/api/contracts", {
          credentials: "include",
        });

        if (!res.ok) throw new Error("Verträge konnten nicht geladen werden");

        const data = await res.json();
        setContracts(data.filter((c: Contract) => c.expiryDate));
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unbekannter Fehler beim Laden der Verträge.";
        setError(message);
        console.error("❌ Fehler beim Laden der Verträge:", message);
      } finally {
        setLoading(false);
      }
    };

    fetchContracts();
  }, []);

  const events: EventInput[] = contracts.map((contract) => ({
    title: contract.name,
    date: contract.expiryDate,
    id: contract._id,
    extendedProps: {
      provider: contract.provider,
      amount: contract.amount
    },
    className: 'contract-event'
  }));

  const handleEventClick = (info: EventClickArg) => {
    navigate(`/contracts/${info.event.id}`);
  };

  const handlePrevMonth = () => {
    const calendarApi = calendarRef.current?.getApi();
    if (calendarApi) {
      calendarApi.prev();
      // Verwende einen sichereren Weg, um den aktuellen Monat zu bekommen
      updateCurrentMonth();
    }
  };

  const handleNextMonth = () => {
    const calendarApi = calendarRef.current?.getApi();
    if (calendarApi) {
      calendarApi.next();
      updateCurrentMonth();
    }
  };

  const handleToday = () => {
    const calendarApi = calendarRef.current?.getApi();
    if (calendarApi) {
      calendarApi.today();
      updateCurrentMonth();
    }
  };

  // Aktualisieren des Monatsnamens basierend auf der aktuellen Ansicht
  const updateCurrentMonth = () => {
    if (calendarRef.current) {
      const date = calendarRef.current.getApi().getDate();
      const monthYear = date.toLocaleString('de-DE', { 
        month: 'long', 
        year: 'numeric' 
      });
      setSelectedMonth(monthYear);
    }
  };

  // Statistiken für den Seitenbereich
  const getTotalContracts = () => contracts.length;
  
  const getContractsThisMonth = () => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    return contracts.filter(contract => {
      if (!contract.expiryDate) return false;
      const date = new Date(contract.expiryDate);
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    }).length;
  };

  const getUpcomingContracts = () => {
    const now = new Date();
    const futureLimit = new Date();
    futureLimit.setDate(now.getDate() + 30);
    
    return contracts.filter(contract => {
      if (!contract.expiryDate) return false;
      const date = new Date(contract.expiryDate);
      return date >= now && date <= futureLimit;
    });
  };

  // Formatiert ein Datum im deutschen Format
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('de-DE', { 
      day: '2-digit', 
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Berechnet die verbleibenden Tage bis zu einem Datum
  const getDaysRemaining = (dateString: string) => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const date = new Date(dateString);
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "Heute";
    if (diffDays === 1) return "Morgen";
    return `In ${diffDays} Tagen`;
  };

  return (
    <>
      <Helmet>
        <title>Kalenderansicht – Vertragsfristen im Überblick | Contract AI</title>
        <meta name="description" content="Visualisiere alle deine Vertragsfristen in einer interaktiven Kalenderansicht. Contract AI macht dein Vertragsmanagement übersichtlich und stressfrei." />
        <meta name="keywords" content="Kalenderansicht Verträge, Fristenübersicht, Vertragsfristen Kalender, Contract AI" />
        <link rel="canonical" href="https://contract-ai.de/calendar-view" />
        {/* Open Graph / Facebook */}
        <meta property="og:title" content="Kalenderansicht – Vertragsfristen im Überblick | Contract AI" />
        <meta property="og:description" content="Sieh alle deine Fristen und Termine in einer klaren, visuellen Übersicht. Mit Contract AI immer bestens organisiert." />
        <meta property="og:url" content="https://contract-ai.de/calendar-view" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://contract-ai.de/og-image.jpg" />
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Kalenderansicht – Vertragsfristen im Überblick | Contract AI" />
        <meta name="twitter:description" content="Alle Fristen und Vertragsereignisse auf einen Blick. Contract AI macht Vertragsmanagement visuell und einfach." />
        <meta name="twitter:image" content="https://contract-ai.de/og-image.jpg" />
      </Helmet>

      <div className="apple-calendar-view">
        <div className="calendar-background">
          <div className="bg-shape shape-1"></div>
          <div className="bg-shape shape-2"></div>
        </div>
        
        <div className="calendar-container">
          <div className="calendar-header">
            <div className="header-icon-container">
              <div className="header-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
              </div>
              <h1>Vertragskalender</h1>
            </div>
            <p className="subtitle">Übersicht Ihrer Vertragsfristen</p>
          </div>
          
          <div className="calendar-layout">
            <div className="calendar-main">
              <div className="calendar-controls">
                <div className="navigation-controls">
                  <button className="control-button" onClick={handlePrevMonth}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M15 18l-6-6 6-6"/>
                    </svg>
                  </button>
                  
                  <span className="current-month">{selectedMonth}</span>
                  
                  <button className="control-button" onClick={handleNextMonth}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 18l6-6-6-6"/>
                    </svg>
                  </button>
                </div>
                
                <button className="today-button" onClick={handleToday}>
                  Heute
                </button>
              </div>
              
              {loading ? (
                <div className="loading-container">
                  <div className="spinner"></div>
                  <p>Verträge werden geladen...</p>
                </div>
              ) : error ? (
                <div className="error-container">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                  </svg>
                  <p>{error}</p>
                </div>
              ) : (
                <div className="fullcalendar-wrapper">
                  <FullCalendar
                    ref={calendarRef}
                    plugins={[dayGridPlugin]}
                    initialView="dayGridMonth"
                    events={events}
                    eventClick={handleEventClick}
                    locale="de"
                    height="auto"
                    datesSet={() => {
                      // Aktualisiere den Monat wenn sich das Datum ändert
                      updateCurrentMonth();
                    }}
                    headerToolbar={false} // Wir erstellen unsere eigene Toolbar
                    dayMaxEvents={3}
                    eventTimeFormat={{
                      hour: '2-digit',
                      minute: '2-digit',
                      meridiem: false
                    }}
                    eventDidMount={(info) => {
                      // Tooltip für Events hinzufügen
                      const title = info.event.title;
                      const provider = info.event.extendedProps?.provider;
                      
                      let tooltipContent = title;
                      if (provider) {
                        tooltipContent += ` (${provider})`;
                      }
                      
                      info.el.setAttribute('title', tooltipContent);
                    }}
                  />
                </div>
              )}
              
              <div className="calendar-legend">
                <div className="legend-item">
                  <span className="legend-dot"></span>
                  <span>Vertrag läuft aus</span>
                </div>
                <div className="legend-item">
                  <span className="today-dot"></span>
                  <span>Heute</span>
                </div>
              </div>
            </div>
            
            <div className="calendar-sidebar">
              <div className="sidebar-card statistics-card">
                <h3>Statistik</h3>
                
                <div className="stat-grid">
                  <div className="stat-item">
                    <div className="stat-value">{getTotalContracts()}</div>
                    <div className="stat-label">Verträge gesamt</div>
                  </div>
                  
                  <div className="stat-item">
                    <div className="stat-value">{getContractsThisMonth()}</div>
                    <div className="stat-label">Diesen Monat</div>
                  </div>
                  
                  <div className="stat-item">
                    <div className="stat-value">{getUpcomingContracts().length}</div>
                    <div className="stat-label">In 30 Tagen</div>
                  </div>
                </div>
              </div>
              
              <div className="sidebar-card upcoming-card">
                <h3>Kommende Fristen</h3>
                
                {getUpcomingContracts().length > 0 ? (
                  <div className="upcoming-list">
                    {getUpcomingContracts()
                      .sort((a, b) => {
                        if (!a.expiryDate || !b.expiryDate) return 0;
                        return new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
                      })
                      .slice(0, 5)
                      .map(contract => (
                        <div 
                          key={contract._id} 
                          className="upcoming-item"
                          onClick={() => navigate(`/contracts/${contract._id}`)}
                        >
                          <div className="upcoming-header">
                            <h4>{contract.name}</h4>
                            <span className="days-badge">
                              {contract.expiryDate && getDaysRemaining(contract.expiryDate)}
                            </span>
                          </div>
                          
                          {contract.expiryDate && (
                            <div className="upcoming-date">
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                <line x1="16" y1="2" x2="16" y2="6"></line>
                                <line x1="8" y1="2" x2="8" y2="6"></line>
                                <line x1="3" y1="10" x2="21" y2="10"></line>
                              </svg>
                              {formatDate(contract.expiryDate)}
                            </div>
                          )}
                          
                          {contract.provider && (
                            <div className="upcoming-provider">
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                                <circle cx="12" cy="10" r="3"></circle>
                              </svg>
                              {contract.provider}
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="no-upcoming">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"></circle>
                      <path d="M12 8v4"></path>
                      <path d="M12 16h.01"></path>
                    </svg>
                    <p>Keine auslaufenden Verträge in den nächsten 30 Tagen</p>
                  </div>
                )}
              </div>
              
              <div className="sidebar-card cta-card">
                <h3>Vertragsmanagement</h3>
                <p>Fügen Sie neue Verträge hinzu oder verwalten Sie bestehende.</p>
                
                <div className="cta-buttons">
                  <button 
                    className="cta-button primary"
                    onClick={() => navigate('/contracts/new')}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 5v14M5 12h14"/>
                    </svg>
                    Vertrag hinzufügen
                  </button>
                  
                  <button 
                    className="cta-button secondary"
                    onClick={() => navigate('/contracts')}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                      <line x1="16" y1="13" x2="8" y2="13"></line>
                      <line x1="16" y1="17" x2="8" y2="17"></line>
                      <polyline points="10 9 9 9 8 9"></polyline>
                    </svg>
                    Alle Verträge ansehen
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}