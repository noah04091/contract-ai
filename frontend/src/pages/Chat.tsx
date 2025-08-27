import { useEffect, useState, useRef } from "react";
import { Helmet } from "react-helmet";
import styles from "../styles/ContractChat.module.css";
import { useAuth } from "../context/AuthContext";
import ChatApi, { ChatStreamReader, StreamEvent, ChatStreamResult, Insight, Citation } from "../utils/chatApi";
import MessageList from "../components/chat/MessageList";
import PdfPreview from "../components/pdf/PdfPreview";
import InsightsPanel from "../components/chat/InsightsPanel";
import QuickPrompts from "../components/chat/QuickPrompts";

interface Message {
  id: string;
  text: string;
  from: "user" | "ai" | "system";
  timestamp: string;
  citations?: Citation[];
  insights?: Insight[];
}

interface SuggestedQuestion {
  text: string;
  category: "clause" | "legal" | "general";
}

type FeatureMode = 'v1' | 'v2';
type UserMode = 'laie' | 'business' | 'jurist';

const Chat = () => {
  const { user } = useAuth();

  // Basic states
  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [contractLoaded, setContractLoaded] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [suggestionsExpanded, setSuggestionsExpanded] = useState(false);

  // Chat v2 specific states
  const [featureMode, setFeatureMode] = useState<FeatureMode>('v1');
  const [userMode, setUserMode] = useState<UserMode>('business');
  const [contractId, setContractId] = useState<string | null>(null);
  const [currentInsights, setCurrentInsights] = useState<Insight[]>([]);
  const [_streamReader, setStreamReader] = useState<ChatStreamReader | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [lastQuestionForRetry, setLastQuestionForRetry] = useState<string>('');
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const chatMessagesRef = useRef<HTMLDivElement>(null);

  // Suggested questions
  const suggestedQuestions: SuggestedQuestion[] = [
    { text: "Was bedeutet Kündigungsfrist 3 Monate zum Quartalsende?", category: "clause" },
    { text: "Muss ein Mietvertrag schriftlich sein?", category: "legal" },
    { text: "Welche Klauseln sind bei einem Freelancervertrag wichtig?", category: "general" },
    { text: "Was ist eine Vertragsstrafe und wann greift sie?", category: "legal" },
    { text: "Erkläre den Unterschied zwischen AGB und individuellen Vertragsklauseln", category: "general" }
  ];

  const isPremium = user?.subscriptionPlan !== 'free';

  // Initialize feature mode
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);

    // Check if Chat v2 is enabled
    const chatV2Enabled = process.env.NODE_ENV === 'development' || 
                          localStorage.getItem('chat_v2_enabled') === 'true';
    
    if (chatV2Enabled && isPremium) {
      setFeatureMode('v2');
    }

    return () => window.removeEventListener('resize', checkIfMobile);
  }, [isPremium]);

  const generateId = () => Math.random().toString(36).substr(2, 9);
  const getCurrentTime = () => new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });

  // File upload for Chat v2
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

        setMessages(prev => [...prev, { 
          id: generateId(),
          from: "system", 
          text: `✅ ${data.message}`, 
          timestamp: getCurrentTime() 
        }]);
        setContractLoaded(true);
        setShowSuggestions(true);
      }

      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error: any) {
      console.error("Upload error:", error);
      setMessages(prev => [...prev, { 
        id: generateId(),
        from: "system", 
        text: `❌ **Fehler beim Upload:** ${error.message}`, 
        timestamp: getCurrentTime() 
      }]);
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  // Chat v2 streaming handler
  const handleStreamingAsk = async (questionText: string) => {
    if (!questionText.trim()) return;

    setIsStreaming(true);
    setStreamingText('');
    setLastQuestionForRetry(questionText);

    // Add user message immediately
    const userMessage: Message = {
      id: generateId(),
      from: "user",
      text: questionText,
      timestamp: getCurrentTime()
    };
    setMessages(prev => [...prev, userMessage]);

    // Add AI message placeholder for streaming
    const aiMessageId = generateId();
    const aiMessage: Message = {
      id: aiMessageId,
      from: "ai",
      text: "",
      timestamp: getCurrentTime(),
      citations: [],
      insights: []
    };
    setMessages(prev => [...prev, aiMessage]);

    // Clear input
    setQuestion("");

    // Stream handler
    const onEvent = (event: StreamEvent) => {
      switch (event.type) {
        case 'chunk':
          if (event.data.text) {
            setStreamingText(prev => prev + event.data.text);
            // Update the AI message with accumulated text
            setMessages(prev => prev.map(msg => 
              msg.id === aiMessageId 
                ? { ...msg, text: msg.text + event.data.text }
                : msg
            ));
          }
          break;
        case 'insights':
          if (event.data) {
            setCurrentInsights(prev => [...prev, event.data]);
          }
          break;
        case 'progress':
          // Handle progress updates if needed
          break;
      }
    };

    const onError = (error: Error) => {
      console.error('Streaming error:', error);
      setMessages(prev => prev.map(msg => 
        msg.id === aiMessageId 
          ? { ...msg, text: `❌ Fehler: ${error.message}` }
          : msg
      ));
      setIsStreaming(false);
    };

    const onComplete = (result: ChatStreamResult) => {
      // Update final message with complete response
      setMessages(prev => prev.map(msg => 
        msg.id === aiMessageId 
          ? { 
              ...msg, 
              text: result.answer || '',
              citations: result.citations || [],
              insights: result.insights || []
            }
          : msg
      ));

      if (result.insights) {
        setCurrentInsights(prev => [...prev, ...(result.insights || [])]);
      }

      setIsStreaming(false);
      setStreamingText('');
    };

    // Start streaming
    try {
      const reader = ChatApi.createStreamReader(onEvent, onError, onComplete);
      setStreamReader(reader);
      
      await reader.start({
        question: questionText,
        contractId: contractId || undefined,
        userMode
      });
    } catch (error) {
      onError(error as Error);
    }
  };

  // Traditional v1 chat handler
  const handleTraditionalAsk = async (questionText: string) => {
    if (!questionText.trim()) return;

    setLoading(true);
    setIsTyping(true);

    const userMessage: Message = {
      id: generateId(),
      from: "user",
      text: questionText,
      timestamp: getCurrentTime()
    };
    setMessages(prev => [...prev, userMessage]);
    setQuestion("");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ question: questionText }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Anfrage fehlgeschlagen");

      setTimeout(() => {
        setMessages(prev => [...prev, {
          id: generateId(),
          from: "ai",
          text: data.answer,
          timestamp: getCurrentTime()
        }]);
        setIsTyping(false);
      }, 1000);
    } catch (error: any) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, {
        id: generateId(),
        from: "system",
        text: `❌ **Fehler:** ${error.message}`,
        timestamp: getCurrentTime()
      }]);
      setIsTyping(false);
    } finally {
      setLoading(false);
    }
  };

  // Main ask handler
  const handleAsk = async () => {
    const questionText = question.trim();
    if (!questionText) return;

    if (featureMode === 'v2') {
      await handleStreamingAsk(questionText);
    } else {
      await handleTraditionalAsk(questionText);
    }
  };

  // File drag and drop handlers
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
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleSuggestionClick = (suggestionText: string) => {
    setQuestion(suggestionText);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const toggleSuggestions = () => {
    setSuggestionsExpanded(!suggestionsExpanded);
  };

  // PDF preview handlers
  const handleShowInPdf = (page: number, _span?: [number, number]) => {
    setCurrentPage(page);
    setShowPdfPreview(true);
    // Scroll to PDF preview if needed
    const pdfElement = document.getElementById('pdf-preview');
    if (pdfElement) {
      pdfElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Retry handler
  const handleRetry = () => {
    if (lastQuestionForRetry) {
      handleAsk();
    }
  };

  // Auto-scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping, streamingText]);

  return (
    <>
      <Helmet>
        <title>Chat mit Vertrag | Contract AI</title>
        <meta name="description" content="Stellen Sie intelligente Fragen zu Ihren Verträgen mit unserem KI-powered Chat-System." />
      </Helmet>

      <div className={styles.chatContainer}>
        <div className={styles.chatContent}>
          {featureMode === 'v2' ? (
            // Chat v2 Layout with sidebar panels
            <div className={styles.chatV2Layout}>
              <div className={styles.chatMainColumn}>
                {/* Mode Selector */}
                <div className={styles.modeSelector}>
                  <h3>Chat v2 (Beta) - {userMode === 'business' ? 'Business' : userMode === 'laie' ? 'Einsteiger' : 'Jurist'}</h3>
                  <select 
                    value={userMode} 
                    onChange={(e) => setUserMode(e.target.value as UserMode)}
                    className={styles.userModeSelect}
                  >
                    <option value="laie">Einsteiger-Modus</option>
                    <option value="business">Business-Modus</option>
                    <option value="jurist">Juristen-Modus</option>
                  </select>
                </div>

                {/* Quick Prompts */}
                {contractId && (
                  <QuickPrompts
                    contractId={contractId}
                    onPromptSelect={(prompt) => {
                      setQuestion(prompt);
                      if (inputRef.current) inputRef.current.focus();
                    }}
                    disabled={loading || isStreaming}
                    className={styles.quickPromptsContainer}
                  />
                )}

                {/* Messages */}
                <MessageList
                  messages={messages}
                  onRetry={handleRetry}
                  onShowInPdf={handleShowInPdf}
                  isTyping={isStreaming}
                  currentTypingText={streamingText}
                />

                <div ref={chatEndRef} />
              </div>

              {/* Sidebar Panels */}
              <div className={styles.sidebarPanels}>
                {/* Insights Panel */}
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
                        ×
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
                          <path d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
                        </svg>
                      </div>
                    )}
                    <div className={styles.messageBody}>
                      <div className={styles.messageHeader}>
                        <span className={styles.messageSender}>
                          {msg.from === "user" ? "Sie" : msg.from === "ai" ? "KI-Assistent" : "System"}
                        </span>
                        <span className={styles.messageTime}>{msg.timestamp}</span>
                      </div>
                      <div className={styles.messageText}>
                        {msg.text.split('\n').map((line, index) => (
                          <div key={index}>{line}</div>
                        ))}
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
          )}
          
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
                  <div className={styles.fileIcon}>📄</div>
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
                  <div className={styles.uploadIcon}>📁</div>
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
};

export default Chat;