// 📁 frontend/src/components/AssistantWidget.tsx
// Globaler KI-Assistent für Contract AI - Floating Chat Widget

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "react-router-dom";
import { useAssistantContext } from "../hooks/useAssistantContext";
import LawyerMascot from "./LawyerMascot";
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
  const [showTooltip, setShowTooltip] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const assistantContext = useAssistantContext();

  // Dismiss onboarding
  const dismissOnboarding = useCallback(() => {
    setShowOnboarding(false);
    setIsMinimized(true);
    localStorage.setItem('assistantOnboardingSeen', 'true');
    sessionStorage.setItem('assistantShownThisSession', 'true');
  }, []);

  // Dismiss tooltip
  const dismissTooltip = useCallback(() => {
    setShowTooltip(false);
    setIsMinimized(true);
    sessionStorage.setItem('assistantShownThisSession', 'true');
  }, []);

  // Smart onboarding/tooltip logic - waits for cookie consent to be dismissed first
  useEffect(() => {
    const triggerOnboarding = () => {
      const onboardingSeen = localStorage.getItem('assistantOnboardingSeen');
      const shownThisSession = sessionStorage.getItem('assistantShownThisSession');

      if (!onboardingSeen) {
        setShowOnboarding(true);
        const timer = setTimeout(dismissOnboarding, 7000);
        return () => clearTimeout(timer);
      } else if (!shownThisSession) {
        setShowTooltip(true);
        const timer = setTimeout(dismissTooltip, 3000);
        return () => clearTimeout(timer);
      } else {
        setIsMinimized(true);
      }
    };

    // Check if cookie consent already given
    const cookieConsent = localStorage.getItem('cookieConsent');
    if (cookieConsent) {
      // Cookie consent already accepted → trigger immediately
      return triggerOnboarding();
    }

    // Cookie consent not yet given → poll until it appears
    const interval = setInterval(() => {
      if (localStorage.getItem('cookieConsent')) {
        clearInterval(interval);
        // Small delay so cookie banner animation finishes first
        setTimeout(triggerOnboarding, 600);
      }
    }, 300);

    return () => clearInterval(interval);
  }, [dismissOnboarding, dismissTooltip]);

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
  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      role: "user",
      content: inputValue.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
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

  // Handle Enter key
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Get mode indicator
  const getModeLabel = () => {
    switch (assistantContext.mode) {
      case "sales":
        return "💼 Sales Assistant";
      case "product":
        return "🛠️ Product Support";
      case "legal":
        return "⚖️ Legal Copilot";
      default:
        return "🤖 Assistant";
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
  ];

  const shouldShowWidget = !hiddenRoutes.some((route) =>
    location.pathname.toLowerCase().startsWith(route.toLowerCase())
  );

  if (!shouldShowWidget || !isBotEnabled || isMobile || isHiddenByUser) {
    return null;
  }

  return (
    <>
      {/* Mascot Onboarding - pops up from bottom-right */}
      <AnimatePresence>
        {showOnboarding && !isOpen && (
          <motion.div
            className={styles.mascotOverlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <motion.div
              className={styles.mascotContainer}
              initial={{ y: 300, opacity: 0, scale: 0.7 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 300, opacity: 0, scale: 0.7 }}
              transition={{ type: "spring", stiffness: 150, damping: 16, delay: 0.2 }}
            >
              {/* Speech bubble appears from the left */}
              <motion.div
                className={styles.mascotSpeechBubble}
                initial={{ opacity: 0, scale: 0.5, x: 60 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                transition={{ delay: 1, type: "spring", stiffness: 250, damping: 18 }}
              >
                <p className={styles.mascotGreeting}>Willkommen bei Contract AI!</p>
                <p className={styles.mascotTitle}>Ich bin dein KI-Rechtsassistent</p>
                <p className={styles.mascotText}>
                  Verträge analysieren, optimieren oder erstellen - ich helfe dir bei allen rechtlichen Fragen. Klick einfach auf mich!
                </p>
                <button
                  className={styles.mascotButton}
                  onClick={(e) => {
                    e.stopPropagation();
                    dismissOnboarding();
                  }}
                >
                  Los geht's!
                </button>
                <div className={styles.speechArrow} />
              </motion.div>

              {/* Mascot figure */}
              <motion.div
                className={styles.mascotFigure}
                animate={{
                  y: [0, -8, 0],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                <LawyerMascot size={220} />
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Bubble Button with Tooltip */}
      <AnimatePresence>
        {!isOpen && !showOnboarding && (
          <motion.div
            className={styles.chatBubbleContainer}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
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
              <span className={styles.chatBubbleIcon}>💬</span>
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
                <span className={styles.headerTitle}>Contract AI Assistant</span>
                <span className={styles.modeIndicator}>{getModeLabel()}</span>
              </div>
              <motion.button
                className={styles.closeButton}
                onClick={() => {
                  setIsOpen(false);
                  setIsMinimized(true);
                }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                aria-label="Chat schließen"
              >
                ✕
              </motion.button>
            </div>

            {/* Messages */}
            <div className={styles.messagesContainer}>
              {messages.length === 0 && (
                <div className={styles.welcomeMessage}>
                  <p className={styles.welcomeTitle}>👋 Willkommen!</p>
                  <p className={styles.welcomeText}>
                    Ich bin dein persönlicher Contract AI Assistent.
                    {assistantContext.mode === "sales" &&
                      " Wie kann ich dir helfen, mehr über Contract AI zu erfahren?"}
                    {assistantContext.mode === "product" &&
                      " Brauchst du Hilfe mit einer Funktion?"}
                    {assistantContext.mode === "legal" &&
                      " Ich kann dir bei der Analyse deiner Verträge helfen!"}
                  </p>
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
                ➤
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
