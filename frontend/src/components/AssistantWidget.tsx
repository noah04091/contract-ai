// 📁 frontend/src/components/AssistantWidget.tsx
// Globaler KI-Assistent für Contract AI - Floating Chat Widget

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "react-router-dom";
import { useAssistantContext } from "../hooks/useAssistantContext";
import styles from "../styles/AssistantWidget.module.css";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface AssistantResponse {
  reply: string;
  mode: string;
  planUpgradeHint?: boolean;
}

// Einstiegsfragen für Teaser und leeren Chat
const QUICK_QUESTIONS = ["Was kann Contract AI?", "Was kostet es?", "Ist das rechtssicher?"];

export default function AssistantWidget() {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isBotEnabled, setIsBotEnabled] = useState(() => {
    const saved = localStorage.getItem('assistantBotEnabled');
    return saved === null ? true : saved === 'true';
  });
  const [isHiddenByUser, setIsHiddenByUser] = useState(() => {
    return sessionStorage.getItem('assistantHiddenByUser') === 'true';
  });
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  // Smart visibility states
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [teaserReady, setTeaserReady] = useState(false); // Tipp-Indikator → Text
  const [showTooltip, setShowTooltip] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const teaserHideTimer = useRef<number | null>(null);

  const assistantContext = useAssistantContext();

  // Dismiss onboarding (Merker sind bereits beim Anzeigen gesetzt)
  const dismissOnboarding = useCallback(() => {
    if (teaserHideTimer.current) {
      window.clearTimeout(teaserHideTimer.current);
      teaserHideTimer.current = null;
    }
    setShowOnboarding(false);
    setIsMinimized(true);
  }, []);

  // Auto-Ausblenden des Teasers armieren (pausiert bei Hover)
  const armTeaserHide = useCallback((delay: number) => {
    if (teaserHideTimer.current) window.clearTimeout(teaserHideTimer.current);
    teaserHideTimer.current = window.setTimeout(() => {
      teaserHideTimer.current = null;
      setShowOnboarding(false);
      setIsMinimized(true);
    }, delay);
  }, []);

  // Dismiss tooltip
  const dismissTooltip = useCallback(() => {
    setShowTooltip(false);
    setIsMinimized(true);
    sessionStorage.setItem('assistantShownThisSession', 'true');
  }, []);

  // Smart onboarding/tooltip logic - waits for cookie consent to be dismissed first.
  // Erstbesuch: Nachrichten-Teaser nach erstem Scroll ODER 6 s, genau einmal pro Besucher.
  useEffect(() => {
    const timers: number[] = [];
    let removeScrollListener: (() => void) | null = null;

    const showTeaser = () => {
      // Merker sofort beim Anzeigen setzen → Teaser erscheint nie ein zweites Mal
      localStorage.setItem('assistantOnboardingSeen', 'true');
      sessionStorage.setItem('assistantShownThisSession', 'true');
      setShowOnboarding(true);
      // Kurzer Tipp-Indikator, dann Begrüßung + Einstiegsfragen
      timers.push(window.setTimeout(() => setTeaserReady(true), 1400));
      // Nach 8 s Lesezeit von selbst ausblenden (Hover pausiert)
      timers.push(window.setTimeout(() => armTeaserHide(8000), 1400));
    };

    const triggerOnboarding = () => {
      const onboardingSeen = localStorage.getItem('assistantOnboardingSeen');
      const shownThisSession = sessionStorage.getItem('assistantShownThisSession');

      if (!isMobile && !onboardingSeen && assistantContext.mode === "sales") {
        const onFirstScroll = () => {
          removeScrollListener?.();
          removeScrollListener = null;
          showTeaser();
        };
        window.addEventListener('scroll', onFirstScroll, { once: true, passive: true });
        removeScrollListener = () => window.removeEventListener('scroll', onFirstScroll);
        timers.push(window.setTimeout(() => {
          removeScrollListener?.();
          removeScrollListener = null;
          showTeaser();
        }, 6000));
      } else if (!isMobile && !shownThisSession) {
        setShowTooltip(true);
        timers.push(window.setTimeout(dismissTooltip, 3000));
      } else {
        setIsMinimized(true);
      }
    };

    // Check if cookie consent already given
    const cookieConsent = localStorage.getItem('cookieConsent');
    let interval: number | undefined;
    if (cookieConsent) {
      // Cookie consent already accepted → trigger immediately
      triggerOnboarding();
    } else {
      // Cookie consent not yet given → poll until it appears
      interval = window.setInterval(() => {
        if (localStorage.getItem('cookieConsent')) {
          window.clearInterval(interval);
          // Small delay so cookie banner animation finishes first
          timers.push(window.setTimeout(triggerOnboarding, 600));
        }
      }, 300);
    }

    return () => {
      if (interval !== undefined) window.clearInterval(interval);
      timers.forEach((t) => window.clearTimeout(t));
      if (teaserHideTimer.current) {
        window.clearTimeout(teaserHideTimer.current);
        teaserHideTimer.current = null;
      }
      removeScrollListener?.();
    };
  }, [dismissTooltip, armTeaserHide, assistantContext.mode, isMobile]);

  // Listen for changes to bot enabled/disabled setting
  useEffect(() => {
    const handleStorageChange = () => {
      const saved = localStorage.getItem('assistantBotEnabled');
      setIsBotEnabled(saved === null ? true : saved === 'true');
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('assistantBotToggled', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('assistantBotToggled', handleStorageChange);
    };
  }, []);


  // Detect mobile screen size
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Reset chat when contract ID changes
  useEffect(() => {
    if (assistantContext.currentContractId) {
      console.log('🔄 [AssistantWidget] Contract ID gewechselt → Chat zurückgesetzt:', assistantContext.currentContractId);
    }
    setMessages([]);
  }, [assistantContext.currentContractId]);

  // Send message to backend
  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMessage: Message = {
      role: "user",
      content: text.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    console.log('📤 [AssistantWidget] Sende an Backend:', {
      message: userMessage.content,
      mode: assistantContext.mode,
      currentContractId: assistantContext.currentContractId,
      route: assistantContext.route
    });

    try {
      const response = await fetch("/api/assistant/message", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          message: userMessage.content,
          context: assistantContext,
          history: [...messages, userMessage]
            .slice(-10)
            .map(({ role, content }) => ({ role, content })),
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data: AssistantResponse = await response.json();

      const assistantMessage: Message = {
        role: "assistant",
        content: data.reply,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);

      if (data.planUpgradeHint) {
        console.log("💎 Upgrade-Hinweis: Legal Copilot ist Premium");
      }
    } catch (error) {
      console.error("❌ Assistant Message Error:", error);

      const errorMessage: Message = {
        role: "assistant",
        content:
          "Entschuldigung, es gab einen Fehler bei der Verarbeitung deiner Anfrage. Bitte versuche es später erneut.",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Send from input field
  const handleSendMessage = () => {
    const text = inputValue.trim();
    if (!text) return;
    setInputValue("");
    sendMessage(text);
  };

  // Einstiegsfrage aus dem Teaser: Chat öffnen und Frage direkt abschicken
  const handleQuickQuestion = (question: string) => {
    setShowOnboarding(false);
    setIsMinimized(false);
    setIsOpen(true);
    sendMessage(question);
  };

  // Handle Enter key
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Handle bubble click - un-minimize and open chat
  const handleBubbleClick = () => {
    // Dismiss any active tooltips
    if (showOnboarding) dismissOnboarding();
    if (showTooltip) dismissTooltip();
    setIsMinimized(false);
    setIsOpen(true);
  };

  // Visibility control
  const hiddenRoutes = [
    "/login",
    "/register",
    "/blog",
    "/pricing",
    "/forgot-password",
    "/reset-password",
    "/sign/",
    "/signature/",
    "/envelopes/create",
    "/chat",
  ];

  const shouldShowWidget = !hiddenRoutes.some((route) =>
    location.pathname.toLowerCase().startsWith(route.toLowerCase())
  );

  // Mobil nur auf öffentlichen Seiten (Sales-Modus); eingeloggt in der App bleibt mobil clean
  if (!shouldShowWidget || !isBotEnabled || (isMobile && assistantContext.mode !== "sales") || isHiddenByUser) {
    return null;
  }

  return (
    <>
      {/* Chat Bubble Button with Teaser + Tooltip (ein Dock, rutscht gemeinsam) */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            className={`${styles.chatBubbleContainer} ca-assistant-dock`}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            {/* Message Teaser - Erstbesuch, wie eine echte Nachricht vom Assistenten */}
            <AnimatePresence>
              {showOnboarding && (
          <motion.div
            className={styles.teaser}
            role="dialog"
            aria-label="Nachricht vom Contract AI Assistenten"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            onMouseEnter={() => {
              if (teaserHideTimer.current) {
                window.clearTimeout(teaserHideTimer.current);
                teaserHideTimer.current = null;
              }
            }}
            onMouseLeave={() => armTeaserHide(4000)}
          >
            <button
              className={styles.teaserClose}
              onClick={dismissOnboarding}
              aria-label="Nachricht schließen"
            >
              ✕
            </button>
            <div className={styles.teaserHead}>
              <span className={styles.teaserAvatar}>
                <svg width="17" height="17" viewBox="0 0 17 17" fill="none">
                  <path d="M2.5 3.5h12v8h-6.8L4.5 14v-2.5h-2z" stroke="#fff" strokeWidth="1.4" strokeLinejoin="round" />
                  <circle cx="6" cy="7.5" r="0.9" fill="#fff" />
                  <circle cx="8.5" cy="7.5" r="0.9" fill="#fff" />
                  <circle cx="11" cy="7.5" r="0.9" fill="#fff" />
                </svg>
              </span>
              <span className={styles.teaserWho}>
                <span className={styles.teaserName}>Contract AI Assistent</span>
                <span className={styles.teaserStatus}>
                  <span className={styles.onlineDot} />
                  KI-Assistent · Antwortet sofort
                </span>
              </span>
            </div>
            <div className={styles.teaserMsg}>
              {teaserReady ? (
                "Hi! Fragen zu Contract AI? Ich helfe dir sofort weiter."
              ) : (
                <span className={styles.teaserTyping}>
                  <i /><i /><i />
                </span>
              )}
            </div>
            {teaserReady && (
              <motion.div
                className={styles.teaserChips}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.35, delay: 0.1 }}
              >
                {QUICK_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    className={styles.teaserChip}
                    onClick={() => handleQuickQuestion(q)}
                  >
                    {q}
                  </button>
                ))}
              </motion.div>
            )}
          </motion.div>
              )}
            </AnimatePresence>

            {/* Session Tooltip (returning user, new session) */}
            <AnimatePresence>
              {showTooltip && (
                <motion.div
                  className={styles.sessionTooltip}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.3 }}
                >
                  <span>Ich bin hier, falls du Hilfe brauchst!</span>
                  <div className={styles.tooltipArrow} />
                </motion.div>
              )}
            </AnimatePresence>

            {/* X Button to hide bot */}
            <motion.button
              className={styles.hideBubbleButton}
              onClick={(e) => {
                e.stopPropagation();
                setIsHiddenByUser(true);
                sessionStorage.setItem('assistantHiddenByUser', 'true');
              }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              aria-label="Chat ausblenden"
              title="Chat für diese Session ausblenden"
            >
              ✕
            </motion.button>

            {/* Main Chat Bubble */}
            <motion.button
              className={`${styles.chatBubble} ${isMinimized ? styles.minimized : ''}`}
              onClick={handleBubbleClick}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              aria-label="Chat öffnen"
            >
              <span className={styles.chatBubbleIcon}>
                <svg
                  width={isMinimized ? 18 : 20}
                  height={isMinimized ? 18 : 20}
                  viewBox="0 0 22 22"
                  fill="none"
                >
                  <path
                    d="M3 4.5h16v10.5h-9L5.5 18.5v-3.5H3z"
                    stroke="#fff"
                    strokeWidth="1.7"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className={styles.chatWindow}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
          >
            {/* Header */}
            <div className={styles.chatHeader}>
              <div className={styles.headerContent}>
                <span className={styles.headerAvatar}>
                  <svg width="16" height="16" viewBox="0 0 17 17" fill="none">
                    <path d="M2.5 3.5h12v8h-6.8L4.5 14v-2.5h-2z" stroke="#fff" strokeWidth="1.4" strokeLinejoin="round" />
                    <circle cx="6" cy="7.5" r="0.9" fill="#fff" />
                    <circle cx="8.5" cy="7.5" r="0.9" fill="#fff" />
                    <circle cx="11" cy="7.5" r="0.9" fill="#fff" />
                  </svg>
                </span>
                <span className={styles.headerWho}>
                  <span className={styles.headerTitle}>Contract AI Assistent</span>
                  <span className={styles.headerStatus}>
                    <span className={styles.onlineDot} />
                    KI-Assistent · Antwortet sofort
                  </span>
                </span>
              </div>
              <motion.button
                className={styles.closeButton}
                onClick={() => {
                  setIsOpen(false);
                  setIsMinimized(true);
                }}
                whileTap={{ scale: 0.92 }}
                aria-label="Chat schließen"
              >
                ✕
              </motion.button>
            </div>

            {/* Messages */}
            <div className={styles.messagesContainer}>
              {messages.length === 0 && (
                <div className={styles.welcomeIntro}>
                  <div className={styles.welcomeBubble}>
                    Hi! Ich bin der KI-Assistent von Contract AI.
                    {assistantContext.mode === "sales" &&
                      " Wie kann ich dir helfen, mehr über Contract AI zu erfahren?"}
                    {assistantContext.mode === "product" &&
                      " Brauchst du Hilfe mit einer Funktion?"}
                    {assistantContext.mode === "legal" &&
                      " Ich kann dir bei der Analyse deiner Verträge helfen!"}
                  </div>
                  {assistantContext.mode === "sales" && (
                    <div className={styles.welcomeChips}>
                      {QUICK_QUESTIONS.map((q) => (
                        <button
                          key={q}
                          className={styles.teaserChip}
                          onClick={() => sendMessage(q)}
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {messages.map((msg, index) => (
                <motion.div
                  key={index}
                  className={`${styles.message} ${
                    msg.role === "user" ? styles.userMessage : styles.assistantMessage
                  }`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className={styles.messageContent}>{msg.content}</div>
                  <div className={styles.messageTime}>
                    {msg.timestamp.toLocaleTimeString("de-DE", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </motion.div>
              ))}

              {isLoading && (
                <motion.div
                  className={styles.loadingIndicator}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <span className={styles.loadingDot}></span>
                  <span className={styles.loadingDot}></span>
                  <span className={styles.loadingDot}></span>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className={styles.inputContainer}>
              <input
                ref={inputRef}
                type="text"
                className={styles.input}
                placeholder="Stelle eine Frage..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={isLoading}
              />
              <motion.button
                className={styles.sendButton}
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isLoading}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                aria-label="Nachricht senden"
              >
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                  <path
                    d="M10 16V4M10 4L5 9M10 4l5 5"
                    stroke="#fff"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
