import { useEffect, useState, useRef } from "react";
import styles from "../styles/ContractChat.module.css";

interface Message {
  id: string;
  from: "user" | "ai" | "system";
  text: string;
  timestamp: string;
}

interface SuggestedQuestion {
  text: string;
  category: "general" | "clause" | "legal";
}

export default function Chat() {
  const [file, setFile] = useState<File | null>(null);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [contractLoaded, setContractLoaded] = useState(false);
  const [isPremium, setIsPremium] = useState<boolean | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [suggestionsExpanded, setSuggestionsExpanded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const chatMessagesRef = useRef<HTMLDivElement>(null);

  // Vorgeschlagene Fragen
  const suggestedQuestions: SuggestedQuestion[] = [
    { text: "Was bedeutet Kündigungsfrist 3 Monate zum Quartalsende?", category: "clause" },
    { text: "Muss ein Mietvertrag schriftlich sein?", category: "legal" },
    { text: "Welche Klauseln sind bei einem Freelancervertrag wichtig?", category: "general" },
    { text: "Was ist eine Vertragsstrafe und wann greift sie?", category: "legal" },
    { text: "Erkläre den Unterschied zwischen AGB und individuellen Vertragsklauseln", category: "general" }
  ];

  // Prüfen, ob wir auf einem Mobilgerät sind
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);

    return () => {
      window.removeEventListener('resize', checkIfMobile);
    };
  }, []);

  // Zeit-Formatierung für Nachrichten
  const getCurrentTime = (): string => {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  };

  // Generiere eindeutige IDs für Nachrichten
  const generateId = (): string => {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  };

  // Premium-Status abrufen und Willkommensnachricht setzen
  useEffect(() => {
    let cancelled = false;

    const fetchStatus = async () => {
      try {
        const res = await fetch("/api/auth/me", {
          credentials: "include",
        });

        if (!res.ok) throw new Error("Nicht authentifiziert");
        const data = await res.json();

        if (!cancelled) {
          setIsPremium(data.subscriptionActive === true || data.isPremium === true);
        }
      } catch (err) {
        console.error("❌ Fehler beim Abostatus:", err);
        if (!cancelled) setIsPremium(false);
      }
    };

    fetchStatus();
    
    // Willkommensnachricht hinzufügen
    setMessages([{
      id: generateId(),
      from: "system",
      text: "👋 Willkommen beim Contract AI-Assistenten! Lade einen Vertrag hoch oder stelle allgemeine Fragen zu rechtlichen Themen.",
      timestamp: getCurrentTime()
    }]);

    return () => {
      cancelled = true;
    };
  }, []);

  // Zum Ende des Chats scrollen, wenn neue Nachrichten hinzukommen
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Upload-Fortschritt simulieren
  useEffect(() => {
    if (loading && uploadProgress < 100 && !contractLoaded) {
      const timer = setTimeout(() => {
        setUploadProgress(prev => Math.min(prev + 10, 95));
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [loading, uploadProgress, contractLoaded]);

  // Event-Handler für Datei-Upload
  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/chat/upload", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Upload fehlgeschlagen");

      setUploadProgress(100);
      setTimeout(() => {
        setMessages(prev => [...prev, { 
          id: generateId(),
          from: "system", 
          text: `Vertrag "${file.name}" erfolgreich geladen. Stelle nun deine spezifischen Fragen zu diesem Vertrag.`, 
          timestamp: getCurrentTime() 
        }]);
        setContractLoaded(true);
        setShowSuggestions(true);
      }, 500);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unbekannter Fehler beim Upload.";
      setMessages(prev => [...prev, { 
        id: generateId(),
        from: "system", 
        text: `Fehler beim Upload: ${message}`, 
        timestamp: getCurrentTime() 
      }]);
    } finally {
      setTimeout(() => {
        setLoading(false);
      }, 500);
    }
  };

  // Frage stellen und Antwort erhalten
  const handleAsk = async (questionText: string = question) => {
    if (!questionText.trim()) return;
    setLoading(true);
    setShowSuggestions(false);

    const userMessage: Message = { 
      id: generateId(),
      from: "user", 
      text: questionText, 
      timestamp: getCurrentTime() 
    };
    setMessages((prev) => [...prev, userMessage]);
    setQuestion("");

    try {
      const res = await fetch("/api/chat/ask", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          question: questionText,
          hasContract: contractLoaded 
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Frage konnte nicht beantwortet werden");

      // KI-Tippanimation mit leichter Verzögerung
      setTimeout(() => {
        const aiMessage: Message = { 
          id: generateId(),
          from: "ai", 
          text: data.answer, 
          timestamp: getCurrentTime() 
        };
        setMessages((prev) => [...prev, aiMessage]);
        setLoading(false);
      }, 800);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unbekannter Fehler bei der Anfrage.";
      const errorMessage: Message = { 
        id: generateId(),
        from: "system", 
        text: `Fehler bei der Anfrage: ${message}`, 
        timestamp: getCurrentTime() 
      };
      setMessages((prev) => [...prev, errorMessage]);
      setLoading(false);
    }
  };

  // Drag & Drop Handler
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  // Drop-Handler für Dateien
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type === "application/pdf") {
        setFile(droppedFile);
      } else {
        setMessages(prev => [...prev, { 
          id: generateId(),
          from: "system", 
          text: "Bitte nur PDF-Dateien hochladen.", 
          timestamp: getCurrentTime() 
        }]);
      }
    }
  };

  // Datei-Auswahl-Dialog öffnen
  const handleFileButtonClick = () => {
    fileInputRef.current?.click();
  };
  
  // Chat-Verlauf löschen
  const handleClearChat = () => {
    setMessages([{
      id: generateId(),
      from: "system",
      text: "Chat-Verlauf wurde gelöscht. Du kannst eine neue Unterhaltung beginnen.",
      timestamp: getCurrentTime()
    }]);
    setShowSuggestions(true);
  };

  // Bei Klick auf Vorschlagsfrage
  const handleSuggestionClick = (question: string) => {
    handleAsk(question);
    inputRef.current?.focus();
    // Auf Mobilgeräten die Vorschläge ausblenden nach Klick
    if (isMobile) {
      setSuggestionsExpanded(false);
    }
  };

  // Toggle für die Vorschläge auf Mobilgeräten
  const toggleSuggestions = () => {
    setSuggestionsExpanded(!suggestionsExpanded);
  };

  // Lade-Zustand anzeigen
  if (isPremium === null) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}>
          <div></div><div></div><div></div>
        </div>
        <p>Lade Nutzerdaten...</p>
      </div>
    );
  }

  // Hauptkomponente rendern
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>🧠 Vertrags-Chat – Frag die KI</h2>
        {!isPremium && (
          <div className={styles.premiumBadge}>
            <span className={styles.premiumIcon}>✦</span>
            <span>Premium erforderlich</span>
          </div>
        )}
        {messages.length > 1 && isPremium && (
          <button 
            className={styles.clearChatButton} 
            onClick={handleClearChat}
            aria-label="Chat löschen"
          >
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 6H5H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6H19Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        )}
      </div>

      {!isPremium && (
        <div className={styles.premiumNotice}>
          <div className={styles.premiumNoticeContent}>
            <h3>Premium-Funktion</h3>
            <p>
              Mit einem Premium-Abonnement kannst du unbegrenzt Verträge analysieren 
              und bekommst Zugang zu erweiterten KI-Funktionen.
            </p>
            <button className={styles.upgradeButton}>
              Upgrade auf Premium
            </button>
          </div>
        </div>
      )}

      <div className={styles.chatContainer}>
        <div className={styles.chatMessages} ref={chatMessagesRef}>
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`${styles.message} ${styles[msg.from]}Message`}
            >
              <div className={styles.messageContent}>
                {msg.from === "system" && (
                  <div className={styles.systemIcon}>
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                      <path d="M12 8V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      <circle cx="12" cy="16" r="1" fill="currentColor"/>
                    </svg>
                  </div>
                )}
                {msg.from === "ai" && (
                  <div className={styles.aiIcon}>
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect x="2" y="2" width="20" height="20" rx="5" stroke="currentColor" strokeWidth="2"/>
                      <circle cx="9" cy="9" r="2" fill="currentColor"/>
                      <circle cx="15" cy="9" r="2" fill="currentColor"/>
                      <path d="M7 15C7 15 9 17 12 17C15 17 17 15 17 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  </div>
                )}
                {msg.from === "user" && (
                  <div className={styles.userIcon}>
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="12" cy="8" r="5" stroke="currentColor" strokeWidth="2"/>
                      <path d="M20 21C20 16.5817 16.4183 13 12 13C7.58172 13 4 16.5817 4 21" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                  </div>
                )}
                <div className={styles.messageBody}>
                  <div className={styles.messageHeader}>
                    <span className={styles.messageSender}>
                      {msg.from === "user" 
                        ? "Du" 
                        : msg.from === "ai" 
                          ? "KI-Assistent" 
                          : "System"}
                    </span>
                    <span className={styles.messageTime}>{msg.timestamp}</span>
                  </div>
                  <p dangerouslySetInnerHTML={{ __html: msg.text.replace(/\n/g, '<br>') }} />
                </div>
              </div>
            </div>
          ))}

          {loading && messages[messages.length - 1]?.from === "user" && (
            <div className={`${styles.message} ${styles.aiMessage} ${styles.typing}`}>
              <div className={styles.messageContent}>
                <div className={styles.aiIcon}>
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="2" y="2" width="20" height="20" rx="5" stroke="currentColor" strokeWidth="2"/>
                    <circle cx="9" cy="9" r="2" fill="currentColor"/>
                    <circle cx="15" cy="9" r="2" fill="currentColor"/>
                    <path d="M7 15C7 15 9 17 12 17C15 17 17 15 17 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </div>
                <div className={styles.messageBody}>
                  <div className={styles.messageHeader}>
                    <span className={styles.messageSender}>KI-Assistent</span>
                    <span className={styles.messageTime}>{getCurrentTime()}</span>
                  </div>
                  <div className={styles.typingIndicator}>
                    <span></span><span></span><span></span>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={chatEndRef} />
        </div>
        
        {!contractLoaded && isPremium && (
          <div 
            className={`${styles.uploadArea} ${dragActive ? styles.dragActive : ''}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              disabled={loading}
              className={styles.fileInput}
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            
            {file ? (
              <div className={styles.filePreview}>
                <div className={styles.fileIcon}>
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8L14 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M14 2V8H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M16 13H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M16 17H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M10 9H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div className={styles.fileInfo}>
                  <span className={styles.fileName}>{file.name}</span>
                  <span className={styles.fileSize}>{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                </div>
                {!loading && (
                  <button 
                    className={styles.uploadButton} 
                    onClick={handleUpload}
                  >
                    Hochladen
                  </button>
                )}
              </div>
            ) : (
              <div className={styles.uploadPrompt} onClick={handleFileButtonClick}>
                <div className={styles.uploadIcon}>
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M17 8L12 3L7 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M12 3V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <p>PDF-Vertrag auswählen oder hierhin ziehen</p>
                <button 
                  className={styles.selectFileButton}
                  disabled={loading}
                >
                  Datei auswählen
                </button>
              </div>
            )}
            
            {loading && (
              <div className={styles.progressContainer}>
                <div className={styles.progressBar}>
                  <div 
                    className={styles.progressFill} 
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
                <span>{uploadProgress}%</span>
              </div>
            )}
          </div>
        )}

        {/* Auf Mobilgeräten: Vorschläge als ausklappbare Komponente */}
        {showSuggestions && isPremium && messages.length < 3 && isMobile && (
          <div className={`${styles.suggestedQuestionsCollapsible} ${suggestionsExpanded ? styles.expanded : ''}`}>
            <div 
              className={styles.suggestionsToggle}
              onClick={toggleSuggestions}
            >
              <span>Vorschläge für Fragen</span>
              <svg 
                className={suggestionsExpanded ? styles.rotated : ''}
                viewBox="0 0 24 24" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            
            {suggestionsExpanded && (
              <div className={styles.suggestionsGrid}>
                {suggestedQuestions.map((sq, index) => (
                  <button 
                    key={index} 
                    className={styles.suggestionButton}
                    onClick={() => handleSuggestionClick(sq.text)}
                  >
                    {sq.text}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        
        {/* Auf Desktop: Vorschläge als horizontale Scrollleiste */}
        {showSuggestions && isPremium && messages.length < 3 && !isMobile && (
          <div className={styles.suggestedQuestionsHorizontal}>
            <p className={styles.suggestionsTitle}>Vorschläge für Fragen:</p>
            <div className={styles.suggestionsScroll}>
              {suggestedQuestions.map((sq, index) => (
                <button 
                  key={index} 
                  className={styles.suggestionChip}
                  onClick={() => handleSuggestionClick(sq.text)}
                >
                  {sq.text}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className={styles.chatInputContainer}>
          <div className={styles.chatInput}>
            <input
              ref={inputRef}
              type="text"
              value={question}
              placeholder={contractLoaded ? "Frage zum Vertrag stellen..." : "Frage zum Vertragsrecht stellen..."}
              disabled={loading || !isPremium}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !loading && question.trim() && handleAsk()}
            />
            <button
              className={styles.sendButton}
              onClick={() => handleAsk()}
              disabled={loading || !question.trim() || !isPremium}
            >
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
          <p className={styles.disclaimer}>Hinweis: Die KI gibt keine rechtsverbindliche Beratung. Bei konkreten Rechtsfragen wende dich an einen Anwalt.</p>
        </div>
      </div>
    </div>
  );
}