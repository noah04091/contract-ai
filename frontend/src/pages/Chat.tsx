import { useEffect, useState, useRef, useCallback, useMemo, useLayoutEffect } from "react";
import { Helmet } from "react-helmet";
import styles from "../styles/ContractChat.module.css";
import { useAuth } from "../context/AuthContext";

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
  // Auth Context
  const { user, isLoading } = useAuth();
  const isPremium = user?.subscriptionActive === true;

  const [file, setFile] = useState<File | null>(null);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [contractLoaded, setContractLoaded] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [suggestionsExpanded, setSuggestionsExpanded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const chatMessagesRef = useRef<HTMLDivElement>(null);
  const uploadControllerRef = useRef<AbortController | null>(null);
  const askControllerRef = useRef<AbortController | null>(null);

  // Vorgeschlagene Fragen (cached, da statisch)
  const suggestedQuestions = useMemo<SuggestedQuestion[]>(() => [
    { text: "Was bedeutet Kündigungsfrist 3 Monate zum Quartalsende?", category: "clause" },
    { text: "Muss ein Mietvertrag schriftlich sein?", category: "legal" },
    { text: "Welche Klauseln sind bei einem Freelancervertrag wichtig?", category: "general" },
    { text: "Was ist eine Vertragsstrafe und wann greift sie?", category: "legal" },
    { text: "Erkläre den Unterschied zwischen AGB und individuellen Vertragsklauseln", category: "general" }
  ], []);

  // Quick-Prompts für häufige Anfragen (cached, da statisch)
  const quickPrompts = useMemo(() => [
    {
      text: "📋 Zusammenfassung",
      prompt: "Gib mir eine kurze Zusammenfassung der wichtigsten Punkte dieses Vertrags.",
      contractOnly: true
    },
    {
      text: "⚠️ Risiken",
      prompt: "Welche Risiken und problematische Klauseln siehst du in diesem Vertrag?",
      contractOnly: true
    },
    {
      text: "📅 Fristen",
      prompt: "Welche wichtigen Fristen, Kündigungszeiten und Termine enthält dieser Vertrag?",
      contractOnly: true
    },
    {
      text: "💡 Tipps",
      prompt: "Welche Verbesserungsvorschläge hast du für diesen Vertrag?",
      contractOnly: true
    },
    {
      text: "❓ FAQ",
      prompt: "Was sind die häufigsten Fragen zu Verträgen dieser Art?",
      contractOnly: false
    }
  ], []);

  // Prüfen, ob wir auf einem Mobilgerät sind (optimiert mit useCallback)
  const checkIfMobile = useCallback(() => {
    setIsMobile(window.innerWidth < 768);
  }, []);

  useEffect(() => {
    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);

    return () => {
      window.removeEventListener('resize', checkIfMobile);
    };
  }, [checkIfMobile]);

  // Global Keyboard Shortcuts (nach Funktionsdeklarationen)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + / : Focus input
      if ((e.ctrlKey || e.metaKey) && e.key === "/") {
        e.preventDefault();
        inputRef.current?.focus();
      }
      
      // Cmd/Ctrl + Shift + E : Export chat (wird später definiert)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "E") {
        e.preventDefault();
        if (messages.length > 2) {
          // Export functionality wird per callback aufgerufen
        }
      }
      
      // Cmd/Ctrl + Shift + C : Clear chat (wird später definiert)  
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "C") {
        e.preventDefault();
        if (messages.length > 1 && isPremium) {
          // Clear functionality wird per callback aufgerufen
        }
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, [messages, isPremium]);

  // Zeit-Formatierung für Nachrichten (cached)
  const getCurrentTime = useCallback((): string => {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  }, []);

  // Relative Zeit-Formatierung (cached)
  const getRelativeTime = useCallback((timestamp: string): string => {
    const [hours, minutes] = timestamp.split(':').map(Number);
    const messageTime = new Date();
    messageTime.setHours(hours, minutes, 0, 0);
    
    const now = new Date();
    const diffMs = now.getTime() - messageTime.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return 'gerade eben';
    if (diffMins === 1) return 'vor 1 Min';
    if (diffMins < 60) return `vor ${diffMins} Min`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours === 1) return 'vor 1 Std';
    if (diffHours < 24) return `vor ${diffHours} Std`;
    
    return timestamp; // Fallback zu absoluter Zeit
  }, []);

  // Generiere eindeutige IDs für Nachrichten (cached)
  const generateId = useCallback((): string => {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  }, []);

  // Retry-Funktion für API-Calls
  const fetchWithRetry = useCallback(async (
    url: string, 
    options: RequestInit, 
    maxRetries: number = 2
  ): Promise<Response> => {
    let lastError: Error;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(url, options);
        if (response.ok) return response;
        
        // Bei 4xx Fehlern (Client-Error) nicht retry
        if (response.status >= 400 && response.status < 500) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      } catch (error) {
        lastError = error as Error;
        
        // Bei AbortError sofort aufhören
        if (lastError.name === 'AbortError') throw lastError;
        
        // Bei letztem Versuch Fehler werfen
        if (attempt === maxRetries) throw lastError;
        
        // Exponential backoff: 1s, 2s, 4s...
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError!;
  }, []);

  // Willkommensnachricht setzen (nur einmal beim Start)
  useEffect(() => {
    setMessages([{
      id: generateId(),
      from: "system",
      text: "👋 Willkommen beim Contract AI-Assistenten! Lade einen Vertrag hoch oder stelle allgemeine Fragen zu rechtlichen Themen.",
      timestamp: getCurrentTime()
    }]);
  }, [generateId, getCurrentTime]);

  // Cleanup AbortControllers bei Component Unmount
  useEffect(() => {
    return () => {
      uploadControllerRef.current?.abort();
      askControllerRef.current?.abort();
    };
  }, []);

  // Optimiertes Scrolling mit useLayoutEffect und Debouncing
  const scrollToBottom = useCallback(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, []);

  useLayoutEffect(() => {
    // Debounced scroll um Layout-Thrashing zu vermeiden
    const timeoutId = setTimeout(scrollToBottom, 50);
    return () => clearTimeout(timeoutId);
  }, [messages.length, scrollToBottom]); // Nur bei Änderung der Message-Anzahl

  // Upload-Fortschritt simulieren
  useEffect(() => {
    if (loading && uploadProgress < 100 && !contractLoaded) {
      const timer = setTimeout(() => {
        setUploadProgress(prev => Math.min(prev + 10, 95));
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [loading, uploadProgress, contractLoaded]);

  // Event-Handler für Datei-Upload mit AbortController (cached)
  const handleUpload = useCallback(async () => {
    if (!file) return;
    
    // Vorherigen Upload abbrechen falls noch laufend
    uploadControllerRef.current?.abort();
    uploadControllerRef.current = new AbortController();
    
    setLoading(true);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetchWithRetry("/api/chat/upload", {
        method: "POST",
        credentials: "include",
        body: formData,
        signal: uploadControllerRef.current.signal,
      }, 1); // Nur 1 Retry für Uploads

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
      if (err instanceof Error && err.name === 'AbortError') {
        console.log('Upload abgebrochen');
        return;
      }
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
        uploadControllerRef.current = null;
      }, 500);
    }
  }, [file, getCurrentTime, generateId, fetchWithRetry]);

  // Frage stellen und Antwort erhalten mit AbortController (cached)
  const handleAsk = useCallback(async (questionText: string = question) => {
    if (!questionText.trim()) return;
    
    // Vorherige Frage abbrechen falls noch laufend
    askControllerRef.current?.abort();
    askControllerRef.current = new AbortController();
    
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
      const res = await fetchWithRetry("/api/chat/ask", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          question: questionText,
          hasContract: contractLoaded 
        }),
        signal: askControllerRef.current.signal,
      }, 2); // 2 Retries für Chat-Anfragen

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Frage konnte nicht beantwortet werden");

      // Smooth transition: Minimum 1.2s für realistische KI-Antwortzeit
      const minDelay = 1200;
      const startTime = Date.now();
      
      setTimeout(() => {
        if (askControllerRef.current?.signal.aborted) return;
        
        const aiMessage: Message = { 
          id: generateId(),
          from: "ai", 
          text: data.answer, 
          timestamp: getCurrentTime() 
        };
        setMessages((prev) => [...prev, aiMessage]);
        setLoading(false);
        askControllerRef.current = null;
      }, Math.max(minDelay - (Date.now() - startTime), 200));
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        console.log('Frage abgebrochen');
        return;
      }
      const message = err instanceof Error ? err.message : "Unbekannter Fehler bei der Anfrage.";
      const errorMessage: Message = { 
        id: generateId(),
        from: "system", 
        text: `Fehler bei der Anfrage: ${message}`, 
        timestamp: getCurrentTime() 
      };
      setMessages((prev) => [...prev, errorMessage]);
      setLoading(false);
      askControllerRef.current = null;
    }
  }, [question, contractLoaded, getCurrentTime, generateId, fetchWithRetry]);

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
  
  // Chat-Verlauf löschen (cached)
  const handleClearChat = useCallback(() => {
    setMessages([{
      id: generateId(),
      from: "system",
      text: "Chat-Verlauf wurde gelöscht. Du kannst eine neue Unterhaltung beginnen.",
      timestamp: getCurrentTime()
    }]);
    setShowSuggestions(true);
  }, [generateId, getCurrentTime]);

  // Bei Klick auf Vorschlagsfrage (cached)
  const handleSuggestionClick = useCallback((questionText: string) => {
    handleAsk(questionText);
    inputRef.current?.focus();
    // Auf Mobilgeräten die Vorschläge ausblenden nach Klick
    if (isMobile) {
      setSuggestionsExpanded(false);
    }
  }, [handleAsk, isMobile]);

  // Toggle für die Vorschläge auf Mobilgeräten (cached)
  const toggleSuggestions = useCallback(() => {
    setSuggestionsExpanded(prev => !prev);
  }, []);

  // Copy Message zu Clipboard
  const copyMessage = useCallback(async (messageId: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedMessageId(messageId);
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, []);

  // Share Message (Web Share API falls verfügbar)
  const shareMessage = useCallback(async (text: string) => {
    if (navigator.share && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: 'Contract AI Chat',
          text: text,
        });
      } catch {
        // Fallback zu copy
        copyMessage('', text);
      }
    } else {
      // Fallback zu copy
      copyMessage('', text);
    }
  }, [copyMessage]);

  // Ganzen Chat exportieren
  const exportAllMessages = useCallback(() => {
    const chatText = messages
      .filter(msg => msg.from !== 'system')
      .map(msg => `${msg.from === 'user' ? 'Du' : 'KI-Assistent'} (${msg.timestamp}):\n${msg.text}`)
      .join('\n\n---\n\n');
    
    const fullExport = `Contract AI Chat Export\nExportiert am: ${new Date().toLocaleString()}\n\n${chatText}`;
    
    if (navigator.share && typeof navigator.share === 'function') {
      shareMessage(fullExport);
    } else {
      copyMessage('export', fullExport);
    }
  }, [messages, shareMessage, copyMessage]);

  // Keyboard Shortcuts Handler
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    // Enter: Send message
    if (e.key === "Enter" && !loading && question.trim()) {
      e.preventDefault();
      handleAsk();
    }
    
    // Ctrl/Cmd + K: Focus input and clear
    if ((e.ctrlKey || e.metaKey) && e.key === "k") {
      e.preventDefault();
      setQuestion("");
      inputRef.current?.focus();
    }
    
    // Escape: Clear input and suggestions
    if (e.key === "Escape") {
      setQuestion("");
      setShowSuggestions(false);
      setSuggestionsExpanded(false);
    }
    
    // Arrow Up: Load last question (wenn input leer)
    if (e.key === "ArrowUp" && !question) {
      e.preventDefault();
      const lastUserMessage = messages
        .filter(msg => msg.from === "user")
        .pop();
      if (lastUserMessage) {
        setQuestion(lastUserMessage.text);
      }
    }
  }, [loading, question, handleAsk, messages]);

  // Search Toggle
  const toggleSearch = useCallback(() => {
    setShowSearch(prev => !prev);
    if (!showSearch) {
      setSearchQuery("");
    }
  }, [showSearch]);

  // Filter Messages based on search
  const filteredMessages = useMemo(() => {
    if (!searchQuery.trim()) return messages;
    return messages.filter(msg => 
      msg.text.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [messages, searchQuery]);

  // Keyboard Shortcut Handlers (nach allen Funktionsdeklarationen)
  useEffect(() => {
    const handleKeyboardShortcuts = (e: KeyboardEvent) => {
      // Cmd/Ctrl + Shift + E : Export chat
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "E") {
        e.preventDefault();
        if (messages.length > 2) {
          exportAllMessages();
        }
      }
      
      // Cmd/Ctrl + Shift + C : Clear chat
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "C") {
        e.preventDefault();
        if (messages.length > 1 && isPremium) {
          handleClearChat();
        }
      }
    };

    document.addEventListener('keydown', handleKeyboardShortcuts);
    return () => document.removeEventListener('keydown', handleKeyboardShortcuts);
  }, [messages, isPremium, exportAllMessages, handleClearChat]);

  // Lade-Zustand anzeigen
  if (isLoading) {
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
    <>
      <Helmet>
        <title>Vertrags-Chat – Fragen an deine Verträge | Contract AI</title>
        <meta name="description" content="Chatte direkt mit deinen Verträgen, stelle Fragen und erhalte Antworten in Echtzeit. Mit dem KI-Vertrags-Chat von Contract AI wird Vertragsverständnis einfach." />
        <meta name="keywords" content="Vertrags-Chat, Fragen an Verträge, KI Vertragsfragen, Contract AI Chat" />
        <link rel="canonical" href="https://www.contract-ai.de/chat" />
        {/* Open Graph / Facebook */}
        <meta property="og:title" content="Vertrags-Chat – Fragen an deine Verträge | Contract AI" />
        <meta property="og:description" content="Verstehe komplexe Vertragsdetails durch direkten KI-Chat. Fragen stellen, Antworten erhalten, sofort Klarheit gewinnen." />
        <meta property="og:url" content="https://contract-ai.de/chat" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://contract-ai.de/og-image.jpg" />
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Vertrags-Chat – Fragen an deine Verträge | Contract AI" />
        <meta name="twitter:description" content="Stell deinen Verträgen Fragen und verstehe jedes Detail – mit dem KI-Chat von Contract AI." />
        <meta name="twitter:image" content="https://contract-ai.de/og-image.jpg" />
      </Helmet>
      
      <div className={styles.container}>
        <div className={styles.header}>
          <h2>🧠 Vertrags-Chat – Frag die KI</h2>
          {!isPremium && (
            <div className={styles.premiumTooltip}>
              <span className={styles.premiumIcon}>✦</span>
              <div className={styles.tooltipContent}>
                Premium erforderlich
              </div>
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {messages.length > 2 && (
              <button
                className={styles.darkModeToggle}
                onClick={toggleSearch}
                aria-label="In Nachrichten suchen"
              >
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/>
                  <path d="m21 21-4.35-4.35" stroke="currentColor" strokeWidth="2"/>
                </svg>
              </button>
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
        </div>

        {showSearch && (
          <div className={styles.searchBar}>
            <input
              className={styles.searchInput}
              type="text"
              placeholder="In Nachrichten suchen..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <span className={styles.searchResults}>
              {searchQuery ? `${filteredMessages.length} von ${messages.length}` : ''}
            </span>
          </div>
        )}

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
            {filteredMessages.map((msg) => (
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
                      <span className={styles.messageTime} title={msg.timestamp}>
                        {getRelativeTime(msg.timestamp)}
                      </span>
                    </div>
                    {/* Nachrichtentext sicher mit Zeilenumbrüchen */}
                    <p style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</p>
                    
                    {/* Export-Buttons nur für AI-Messages */}
                    {msg.from === "ai" && (
                      <div className={styles.messageActions}>
                        <button
                          className={`${styles.actionButton} ${copiedMessageId === msg.id ? styles.copied : ''}`}
                          onClick={() => copyMessage(msg.id, msg.text)}
                        >
                          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" stroke="currentColor" strokeWidth="2"/>
                            <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke="currentColor" strokeWidth="2"/>
                          </svg>
                          {copiedMessageId === msg.id ? 'Kopiert!' : 'Kopieren'}
                        </button>
                        <button
                          className={styles.actionButton}
                          onClick={() => shareMessage(msg.text)}
                        >
                          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" stroke="currentColor" strokeWidth="2"/>
                            <polyline points="16,6 12,2 8,6" stroke="currentColor" strokeWidth="2"/>
                            <line x1="12" y1="2" x2="12" y2="15" stroke="currentColor" strokeWidth="2"/>
                          </svg>
                          Teilen
                        </button>
                      </div>
                    )}
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
                      <span className={styles.messageTime}>gerade eben</span>
                    </div>
                    <div className={styles.typingIndicator}>
                      <span></span><span></span><span></span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={chatEndRef} />
            
            {/* Export All Button */}
            {messages.length > 2 && isPremium && (
              <button 
                className={styles.exportAllButton}
                onClick={exportAllMessages}
              >
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" stroke="currentColor" strokeWidth="2"/>
                  <polyline points="7,10 12,15 17,10" stroke="currentColor" strokeWidth="2"/>
                  <line x1="12" y1="15" x2="12" y2="3" stroke="currentColor" strokeWidth="2"/>
                </svg>
                Chat exportieren
              </button>
            )}
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

          {/* Auf Mobilgeräten: Vorschläge als Bottom Sheet */}
          {showSuggestions && isPremium && messages.length < 3 && isMobile && (
            <>
              <div 
                className={`${styles.bottomSheetBackdrop} ${suggestionsExpanded ? styles.visible : ''}`}
                onClick={toggleSuggestions}
              />
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
            </>
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

          {/* Quick-Prompts für häufige Anfragen */}
          {isPremium && messages.length > 1 && (
            <div className={styles.quickPrompts}>
              {quickPrompts.map((prompt, index) => {
                const canShow = !prompt.contractOnly || contractLoaded;
                if (!canShow) return null;
                
                return (
                  <button
                    key={index}
                    className={`${styles.quickPromptButton} ${prompt.contractOnly ? styles.contract : ''}`}
                    onClick={() => handleAsk(prompt.prompt)}
                    disabled={loading}
                  >
                    {prompt.text}
                  </button>
                );
              })}
            </div>
          )}

          <div className={styles.chatInputContainer}>
            <div className={styles.chatInput}>
              <input
                ref={inputRef}
                type="text"
                value={question}
                placeholder={contractLoaded ? "Frage zum Vertrag stellen... (Enter zum Senden)" : "Frage zum Vertragsrecht stellen... (Enter zum Senden)"}
                disabled={loading || !isPremium}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              {showSuggestions && isPremium && messages.length < 3 && isMobile && (
                <button
                  className={styles.suggestionsButton}
                  onClick={toggleSuggestions}
                  disabled={loading}
                >
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              )}
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
    </>
  );
}
