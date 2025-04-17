import { useEffect, useState, useRef } from "react";
import styles from "../styles/AppleChat.module.css";

interface Message {
  from: "user" | "ai" | "system";
  text: string;
  timestamp: string;
}

export default function AppleChat() {
  const [file, setFile] = useState<File | null>(null);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [contractLoaded, setContractLoaded] = useState(false);
  const [isPremium, setIsPremium] = useState<boolean | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Format current time for message timestamps
  const getCurrentTime = (): string => {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  };

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

    return () => {
      cancelled = true;
    };
  }, []);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Simulate upload progress
  useEffect(() => {
    if (loading && uploadProgress < 100 && !contractLoaded) {
      const timer = setTimeout(() => {
        setUploadProgress(prev => Math.min(prev + 10, 95));
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [loading, uploadProgress, contractLoaded]);

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
        setMessages([{ 
          from: "system", 
          text: "Vertrag erfolgreich geladen. Stelle nun deine Fragen!", 
          timestamp: getCurrentTime() 
        }]);
        setContractLoaded(true);
      }, 500);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unbekannter Fehler beim Upload.";
      setMessages([{ 
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

  const handleAsk = async () => {
    if (!question.trim()) return;
    setLoading(true);

    const userMessage: Message = { 
      from: "user", 
      text: question, 
      timestamp: getCurrentTime() 
    };
    setMessages((prev) => [...prev, userMessage]);
    setQuestion("");

    try {
      const res = await fetch("/api/chat/ask", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Frage konnte nicht beantwortet werden");

      // Simulate AI typing with a slight delay
      setTimeout(() => {
        const aiMessage: Message = { 
          from: "ai", 
          text: data.answer, 
          timestamp: getCurrentTime() 
        };
        setMessages((prev) => [...prev, aiMessage]);
        setLoading(false);
      }, 500);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unbekannter Fehler bei der Anfrage.";
      const errorMessage: Message = { 
        from: "system", 
        text: `Fehler bei der Anfrage: ${message}`, 
        timestamp: getCurrentTime() 
      };
      setMessages((prev) => [...prev, errorMessage]);
      setLoading(false);
    }
  };

  // Handle file drag events
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type === "application/pdf") {
        setFile(droppedFile);
      } else {
        setMessages([{ 
          from: "system", 
          text: "Bitte nur PDF-Dateien hochladen.", 
          timestamp: getCurrentTime() 
        }]);
      }
    }
  };

  // Trigger file input click
  const handleFileButtonClick = () => {
    fileInputRef.current?.click();
  };

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

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>Vertrag-Chat</h2>
        {!isPremium && (
          <div className={styles.premiumBadge}>
            <span className={styles.premiumIcon}>✦</span>
            <span>Premium erforderlich</span>
          </div>
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

      {!contractLoaded ? (
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
            disabled={!isPremium || loading}
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
                  disabled={!isPremium}
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
              <p>PDF-Datei auswählen oder hierhin ziehen</p>
              {isPremium ? (
                <button 
                  className={styles.selectFileButton}
                  disabled={loading}
                >
                  Datei auswählen
                </button>
              ) : (
                <div className={styles.premiumRequired}>
                  Premium erforderlich
                </div>
              )}
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
      ) : (
        <div className={styles.chatContainer}>
          <div className={styles.chatMessages}>
            {messages.map((msg, index) => (
              <div
                key={index}
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
                    <p>{msg.text}</p>
                  </div>
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
            
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
          </div>

          <div className={styles.chatInput}>
            <input
              type="text"
              value={question}
              placeholder="Frage zum Vertrag stellen..."
              disabled={loading || !isPremium}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !loading && question.trim() && handleAsk()}
            />
            <button
              className={styles.sendButton}
              onClick={handleAsk}
              disabled={loading || !question.trim() || !isPremium}
            >
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}