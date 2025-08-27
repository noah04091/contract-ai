import { useEffect, useState, useRef } from "react";
import { Helmet } from "react-helmet";
import styles from "../styles/ContractChat.module.css";
import { useAuth } from "../context/AuthContext";
import ChatApi, { ChatStreamReader, StreamEvent, ChatStreamResult, Insight, Citation } from "../utils/chatApi";
import MessageList from "../components/chat/MessageList";
import SourceCard from "../components/chat/SourceCard";
import PdfPreview from "../components/pdf/PdfPreview";
import InsightsPanel from "../components/chat/InsightsPanel";
import QuickPrompts from "../components/chat/QuickPrompts";

interface Message {
  id: string;
  from: "user" | "ai" | "system";
  text: string;
  timestamp: string;
  isStreaming?: boolean;
  sources?: Citation[];
  error?: string;
  retryable?: boolean;
}

interface SuggestedQuestion {
  text: string;
  category: "general" | "clause" | "legal";
}

type UserMode = 'laie' | 'business' | 'jurist';
type FeatureMode = 'v1' | 'v2';

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
  
  // Chat v2 states
  const [featureMode, setFeatureMode] = useState<FeatureMode>('v1');
  const [userMode, setUserMode] = useState<UserMode>('business');
  const [contractId, setContractId] = useState<string | null>(null);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [currentInsights, setCurrentInsights] = useState<Insight[]>([]);
  const [streamReader, setStreamReader] = useState<ChatStreamReader | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [retryableMessageId, setRetryableMessageId] = useState<string | null>(null);
  const [lastQuestionForRetry, setLastQuestionForRetry] = useState<string>('');
  
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

  // Initialize feature mode and mobile detection
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);
    
    // Check if Chat v2 is enabled
    const chatV2Enabled = ChatApi.isChatV2Enabled();
    setFeatureMode(chatV2Enabled ? 'v2' : 'v1');
    
    // Load user preferences
    const savedUserMode = localStorage.getItem('chatUserMode') as UserMode;
    if (savedUserMode && ['laie', 'business', 'jurist'].includes(savedUserMode)) {
      setUserMode(savedUserMode);
    }

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

  // Set welcome message based on feature mode
  useEffect(() => {
    const welcomeText = featureMode === 'v2' 
      ? "🚀 Willkommen bei Contract AI Chat v2! Laden Sie einen Vertrag hoch für intelligente Analyse mit RAG-Suche, Tools und Streaming-Antworten."
      : "👋 Willkommen beim Contract AI-Assistenten! Lade einen Vertrag hoch oder stelle allgemeine Fragen zu rechtlichen Themen.";
      
    setMessages([{
      id: generateId(),
      from: "system",
      text: welcomeText,
      timestamp: getCurrentTime()
    }]);
    
    // Clear previous state when mode changes
    setContractId(null);
    setInsights([]);
    setCurrentInsights([]);
    setStreamingText('');
    setIsStreaming(false);
  }, [featureMode]);

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

  // Enhanced file upload handler for v2
  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setUploadProgress(0);

    try {
      if (featureMode === 'v2') {
        // Use Chat v2 API with indexing
        const response = await ChatApi.indexContract({ file });
        
        if (response.success && response.data) {
          setContractId(response.data?.contractId || null);
          setUploadProgress(100);
          
          setTimeout(() => {
            setMessages(prev => [...prev, { 
              id: generateId(),
              from: "system", 
              text: `✅ ${response.message}\n\n📊 **Indexierung abgeschlossen:**\n- ${response.data?.chunksIndexed || 0} Textabschnitte indexiert\n- Verarbeitungszeit: ${response.data?.processingTime || 0}ms\n\nSie können nun intelligente Fragen stellen!`, 
              timestamp: getCurrentTime() 
            }]);
            setContractLoaded(true);
            setShowSuggestions(true);
            setShowPdfPreview(true);
          }, 500);
        } else {
          throw new Error(response.message || 'Indexierung fehlgeschlagen');
        }
      } else {
        // Use original v1 API
        const formData = new FormData();
        formData.append("file", file);

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
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unbekannter Fehler beim Upload.";
      setMessages(prev => [...prev, { 
        id: generateId(),
        from: "system", 
        text: `❌ Fehler beim Upload: ${message}`, 
        timestamp: getCurrentTime(),
        error: message,
        retryable: true
      }]);
      setRetryableMessageId(generateId());
    } finally {
      setTimeout(() => {
        setLoading(false);
      }, 500);
    }
  };

  // Enhanced question handler with streaming support
  const handleAsk = async (questionText: string = question) => {
    if (!questionText.trim() || isStreaming) return;
    
    setShowSuggestions(false);
    setLastQuestionForRetry(questionText);
    
    const userMessage: Message = { 
      id: generateId(),
      from: "user", 
      text: questionText, 
      timestamp: getCurrentTime() 
    };
    setMessages((prev) => [...prev, userMessage]);
    setQuestion("");

    if (featureMode === 'v2') {
      await handleStreamingAsk(questionText);
    } else {
      await handleTraditionalAsk(questionText);
    }
  };
  
  // Traditional v1 ask implementation
  const handleTraditionalAsk = async (questionText: string) => {
    setLoading(true);
    
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
        text: `❌ Fehler bei der Anfrage: ${message}`, 
        timestamp: getCurrentTime(),
        error: message,
        retryable: true
      };
      setMessages((prev) => [...prev, errorMessage]);
      setRetryableMessageId(errorMessage.id);
      setLoading(false);
    }
  };
  
  // Streaming ask implementation for v2
  const handleStreamingAsk = async (questionText: string) => {
    setIsStreaming(true);
    setStreamingText('');
    setCurrentInsights([]);
    
    // Cleanup previous stream
    if (streamReader) {
      streamReader.abort();
    }
    
    let fullAnswer = '';
    let finalCitations: Citation[] = [];
    
    const reader = ChatApi.createStreamReader(
      (event: StreamEvent) => {
        switch (event.type) {
          case 'progress':
            // Progress events are handled silently or could show a progress bar
            break;
            
          case 'chunk':
            if (event.data?.text) {
              fullAnswer += event.data.text;
              setStreamingText(fullAnswer);
            }
            break;
            
          case 'insights':
            if (event.data?.insights) {
              const newInsights = event.data.insights as Insight[];
              setCurrentInsights(newInsights);
              setInsights(prev => [...prev, ...newInsights]);
            }
            break;
            
          case 'citations':
            if (event.data?.citations) {
              finalCitations = event.data.citations;
            }
            break;
        }
      },
      (error: Error) => {
        console.error('Streaming error:', error);
        const errorMessage: Message = {
          id: generateId(),
          from: "system",
          text: `❌ Streaming-Fehler: ${error.message}`,
          timestamp: getCurrentTime(),
          error: error.message,
          retryable: true
        };
        setMessages(prev => [...prev, errorMessage]);
        setRetryableMessageId(errorMessage.id);
        setIsStreaming(false);
        setStreamingText('');
      },
      (result: ChatStreamResult) => {
        // Stream completed successfully
        const aiMessage: Message = {
          id: generateId(),
          from: "ai",
          text: result.answer || fullAnswer,
          timestamp: getCurrentTime(),
          sources: finalCitations
        };
        
        setMessages(prev => [...prev, aiMessage]);
        setIsStreaming(false);
        setStreamingText('');
        
        console.log('✅ Streaming completed:', {
          latency: result.telemetry?.totalLatency,
          tokens: result.telemetry?.tokensOut,
          citations: finalCitations.length,
          intent: result.intentAnalysis?.primary
        });
      }
    );
    
    setStreamReader(reader);
    
    try {
      await reader.start({
        question: questionText,
        contractId: contractId || undefined,
        userMode
      });
    } catch (error) {
      console.error('Failed to start streaming:', error);
      setIsStreaming(false);
      setStreamingText('');
    }
  };
  
  // Handle retry functionality
  const handleRetry = (messageId: string) => {
    if (lastQuestionForRetry) {
      // Remove the failed message
      setMessages(prev => prev.filter(m => m.id !== messageId));
      setRetryableMessageId(null);
      
      // Retry the question
      handleAsk(lastQuestionForRetry);
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

  // Handle suggestion and quick prompt clicks
  const handleSuggestionClick = (question: string) => {
    handleAsk(question);
    inputRef.current?.focus();
    if (isMobile) {
      setSuggestionsExpanded(false);
    }
  };
  
  const handleQuickPromptSelect = (prompt: string) => {
    setQuestion(prompt);
    handleAsk(prompt);
  };
  
  // Handle PDF preview interactions
  const handleShowInPdf = (page: number, span?: [number, number]) => {
    setCurrentPage(page);
    setShowPdfPreview(true);
    
    // Scroll to PDF preview on mobile
    if (isMobile) {
      const pdfElement = document.getElementById('pdf-preview');
      pdfElement?.scrollIntoView({ behavior: 'smooth' });
    }
  };
  
  // Handle mode switches
  const handleUserModeChange = (mode: UserMode) => {
    setUserMode(mode);
    localStorage.setItem('chatUserMode', mode);
  };
  
  const handleFeatureModeToggle = () => {
    const newMode = featureMode === 'v1' ? 'v2' : 'v1';
    setFeatureMode(newMode);
    ChatApi.setChatV2Enabled(newMode === 'v2');
  };
  
  // Abort current streaming
  const handleAbortStreaming = () => {
    if (streamReader) {
      streamReader.abort();
      setStreamReader(null);
    }
    setIsStreaming(false);
    setStreamingText('');
  };

  // Toggle für die Vorschläge auf Mobilgeräten
  const toggleSuggestions = () => {
    setSuggestionsExpanded(!suggestionsExpanded);
  };

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
        <title>{featureMode === 'v2' ? 'Contract AI Chat v2 – Intelligente Vertragsanalyse' : 'Vertrags-Chat – Fragen an deine Verträge'} | Contract AI</title>
        <meta name="description" content={featureMode === 'v2' ? 
          'Weltklasse Chat v2 mit RAG-Suche, Tool-Integration und Streaming-Antworten. Intelligente Vertragsanalyse mit Echtzeit-Insights.' :
          'Chatte direkt mit deinen Verträgen, stelle Fragen und erhalte Antworten in Echtzeit. Mit dem KI-Vertrags-Chat von Contract AI wird Vertragsverständnis einfach.'
        } />
        <meta name="keywords" content="Vertrags-Chat, Fragen an Verträge, KI Vertragsfragen, Contract AI Chat, RAG, Streaming" />
        <link rel="canonical" href="https://contract-ai.de/chat" />
        <meta property="og:title" content={`Contract AI Chat ${featureMode === 'v2' ? 'v2' : ''} – Intelligente Vertragsanalyse`} />
        <meta property="og:description" content={featureMode === 'v2' ? 
          'Weltklasse RAG-Chat mit Tools, Streaming und Echtzeit-Insights für präzise Vertragsanalyse.' :
          'Verstehe komplexe Vertragsdetails durch direkten KI-Chat. Fragen stellen, Antworten erhalten, sofort Klarheit gewinnen.'
        } />
        <meta property="og:url" content="https://contract-ai.de/chat" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://contract-ai.de/og-image.jpg" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`Contract AI Chat ${featureMode === 'v2' ? 'v2' : ''} – Intelligente Vertragsanalyse`} />
        <meta name="twitter:description" content="Stell deinen Verträgen Fragen und verstehe jedes Detail – mit dem KI-Chat von Contract AI." />
        <meta name="twitter:image" content="https://contract-ai.de/og-image.jpg" />
      </Helmet>
      
      <div className={`${styles.container} ${featureMode === 'v2' ? styles.chatV2 : ''}`}>
        <div className={styles.header}>
          <div className={styles.headerMain}>
            <h2>
              {featureMode === 'v2' ? '🚀 Contract AI Chat v2' : '🧠 Vertrags-Chat – Frag die KI'}
              {featureMode === 'v2' && (
                <span className={styles.betaBadge}>Beta</span>
              )}
            </h2>
            
            {featureMode === 'v2' && (
              <div className={styles.modeSelector}>
                <label>Modus:</label>
                <select 
                  value={userMode} 
                  onChange={(e) => handleUserModeChange(e.target.value as UserMode)}
                  className={styles.modeSelect}
                >
                  <option value="laie">👤 Laie</option>
                  <option value="business">💼 Business</option>
                  <option value="jurist">⚖️ Jurist</option>
                </select>
              </div>
            )}
          </div>
          
          <div className={styles.headerControls}>
            {/* Feature Toggle (Dev/Testing) */}
            {process.env.NODE_ENV === 'development' && (
              <button 
                className={styles.toggleButton}
                onClick={handleFeatureModeToggle}
                title={`Wechseln zu Chat ${featureMode === 'v1' ? 'v2' : 'v1'}`}
              >
                {featureMode === 'v1' ? '🚀 v2' : '🧠 v1'}
              </button>
            )}
            
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
            
            {isStreaming && (
              <button 
                className={styles.abortButton}
                onClick={handleAbortStreaming}
                aria-label="Streaming abbrechen"
              >
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                  <line x1="15" y1="9" x2="9" y2="15" stroke="currentColor" strokeWidth="2"/>
                  <line x1="9" y1="9" x2="15" y2="15" stroke="currentColor" strokeWidth="2"/>
                </svg>
              </button>
            )}
          </div>
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

        <div className={`${styles.chatContainer} ${featureMode === 'v2' ? styles.chatV2Layout : ''}`}>
          {featureMode === 'v2' ? (
            <div className={styles.chatMainArea}>
              <div className={styles.chatColumn}>
                <MessageList 
                  messages={messages}
                  onRetry={handleRetry}
                  onShowInPdf={handleShowInPdf}
                  isTyping={isStreaming}
                  currentTypingText={streamingText}
                />
                
                {/* Quick Prompts for v2 */}
                {showSuggestions && isPremium && messages.length < 3 && (
                  <QuickPrompts 
                    contractId={contractId || undefined}
                    onPromptSelect={handleQuickPromptSelect}
                    disabled={isStreaming || loading}
                    className={styles.quickPromptsContainer}
                  />
                )}
              </div>
              
              {/* Insights Panel - Desktop Right, Mobile Bottom */}
              <div className={styles.insightsColumn}>
                <InsightsPanel 
                  insights={currentInsights}
                  onShowInPdf={handleShowInPdf}
                  className={styles.insightsPanelContainer}
                />
                
                {/* PDF Preview - Collapsible */}
                {showPdfPreview && contractId && (
                  <div className={styles.pdfColumn} id="pdf-preview">
                    <div className={styles.pdfHeader}>
                      <h4>📄 PDF-Vorschau</h4>
                      <button 
                        className={styles.collapsePdfButton}
                        onClick={() => setShowPdfPreview(false)}
                        aria-label="PDF-Vorschau schließen"
                      >
                        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2"/>
                          <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2"/>
                        </svg>
                      </button>
                    </div>
                    <PdfPreview 
                      contractId={contractId}
                      currentPage={currentPage}
                      onPageChange={setCurrentPage}
                      className={styles.pdfPreviewContainer}
                    />
                  </div>
                )}
              </div>
            </div>
          ) : (
            // Traditional v1 layout
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
                    {/* Nachrichtentext mit korrekter Textfarbe */}
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
              ))}
            
            {isTyping && (
              <div className={`${styles.message} ${styles.aiMessage}`}>
                <div className={styles.messageContent}>
                  <div className={styles.aiIcon}>
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="12" cy="12" r="5" fill="none" stroke="currentColor" strokeWidth="2"/>
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

            {/* Traditional v1 suggestions */}
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
            
            <div ref={chatEndRef} />
          </div>
        )}

        <div className={styles.chatInputContainer}>
            <div className={styles.chatInput}>
              <input
                ref={inputRef}
                type="text"
                value={question}
                placeholder={
                  featureMode === 'v2' 
                    ? (contractId 
                        ? "Intelligente Frage zum Vertrag stellen... (RAG-Suche aktiviert)" 
                        : "Frage stellen oder Vertrag hochladen für RAG-Analyse...")
                    : (contractLoaded 
                        ? "Frage zum Vertrag stellen..." 
                        : "Frage zum Vertragsrecht stellen...")
                }
                disabled={loading || isStreaming || !isPremium}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !loading && !isStreaming && question.trim()) {
                    handleAsk();
                  }
                }}
              />
              <button
                className={`${styles.sendButton} ${isStreaming ? styles.streaming : ''}`}
                onClick={() => handleAsk()}
                disabled={loading || isStreaming || !question.trim() || !isPremium}
                title={isStreaming ? 'Antwort wird generiert...' : 'Nachricht senden'}
              >
                {isStreaming ? (
                  <div className={styles.streamingSpinner}>
                    <div></div><div></div><div></div>
                  </div>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </button>
            </div>
            <p className={styles.disclaimer}>
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                <path d="M12 8V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <circle cx="12" cy="16" r="1" fill="currentColor"/>
              </svg>
              Hinweis: Die KI gibt keine rechtsverbindliche Beratung. Bei konkreten Rechtsfragen wende dich an einen Anwalt.
              {featureMode === 'v2' && ' Antworten basieren auf RAG-Suche und können Quellen enthalten.'}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}