// 📁 frontend/src/components/AssistantWidget.tsx
// Globaler KI-Assistent für Contract AI - Floating Chat Widget

import { useState, useRef, useEffect } from "react";
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

export default function AssistantWidget() {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isBotEnabled, setIsBotEnabled] = useState(() => {
    // Check localStorage for bot enabled/disabled state (default: enabled)
    const saved = localStorage.getItem('assistantBotEnabled');
    return saved === null ? true : saved === 'true';
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const assistantContext = useAssistantContext();

  // Listen for changes to bot enabled/disabled setting
  useEffect(() => {
    const handleStorageChange = () => {
      const saved = localStorage.getItem('assistantBotEnabled');
      setIsBotEnabled(saved === null ? true : saved === 'true');
    };

    window.addEventListener('storage', handleStorageChange);
    // Also listen for custom event from same tab
    window.addEventListener('assistantBotToggled', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('assistantBotToggled', handleStorageChange);
    };
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

  // ✅ RESET Chat wenn Contract ID wechselt (verhindert gecachten alten Context)
  useEffect(() => {
    if (assistantContext.currentContractId) {
      console.log('🔄 [AssistantWidget] Contract ID gewechselt → Chat zurückgesetzt:', assistantContext.currentContractId);
    }
    // Lösche Nachrichten wenn sich die Contract ID ändert
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

      // Show upgrade hint if needed
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

  // ============================================
  // VISIBILITY CONTROL - Hide on specific pages OR if disabled by user
  // ============================================
  const hiddenRoutes = [
    "/login",
    "/register",
    "/blog",
    "/pricing",
    "/forgot-password",
    "/reset-password",
    // Signatur-Prozess - Bot würde wichtige UI-Elemente überdecken
    "/sign/",
    "/signature/",
    "/envelopes/create",
  ];

  const shouldShowWidget = !hiddenRoutes.some((route) =>
    location.pathname.toLowerCase().startsWith(route.toLowerCase())
  );

  // If widget should be hidden OR bot is disabled, don't render anything
  if (!shouldShowWidget || !isBotEnabled) {
    return null;
  }

  return (
    <>
      {/* Chat Bubble Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            className={styles.chatBubble}
            onClick={() => setIsOpen(true)}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            aria-label="Chat öffnen"
          >
            <span className={styles.chatBubbleIcon}>💬</span>
          </motion.button>
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
                onClick={() => setIsOpen(false)}
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
