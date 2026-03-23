import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, AlertCircle } from 'lucide-react';
import type { ChatMessage } from '../../types/optimizerV2';
import styles from '../../styles/OptimizerV2.module.css';

interface Props {
  clauseId: string;
  messages: ChatMessage[];
  onSend: (clauseId: string, message: string) => Promise<unknown>;
}

const QUICK_PROMPTS = [
  'Was bedeutet diese Klausel genau?',
  'Ist diese Klausel gefährlich für mich?',
  'Wie kann ich die Klausel verhandeln?',
  'Formuliere die Klausel fairer um.'
];

export default function ClauseChat({ clauseId, messages, onSend }: Props) {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    const msg = input.trim();
    if (!msg || isLoading) return;

    setInput('');
    setError(null);
    setIsLoading(true);
    try {
      await onSend(clauseId, msg);
    } catch {
      setError('Antwort konnte nicht geladen werden. Bitte erneut versuchen.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickPrompt = async (prompt: string) => {
    if (isLoading) return;
    setError(null);
    setIsLoading(true);
    try {
      await onSend(clauseId, prompt);
    } catch {
      setError('Antwort konnte nicht geladen werden. Bitte erneut versuchen.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.clauseChat}>
      {/* Quick prompts (only if no messages yet) */}
      {messages.length === 0 && (
        <div className={styles.quickPrompts}>
          {QUICK_PROMPTS.map((prompt, i) => (
            <button
              key={i}
              className={styles.quickPromptBtn}
              onClick={() => handleQuickPrompt(prompt)}
              disabled={isLoading}
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      {/* Messages */}
      {messages.length > 0 && (
        <div className={styles.chatMessages}>
          {messages.map((msg, i) => (
            <div key={i} className={`${styles.chatMessage} ${styles[`chat_${msg.role}`]}`}>
              <div className={styles.chatBubble}>
                {msg.content}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className={`${styles.chatMessage} ${styles.chat_assistant}`}>
              <div className={styles.chatBubble}>
                <Loader2 size={14} className={styles.spinIcon} /> Denke nach...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className={styles.chatError}>
          <AlertCircle size={13} />
          <span>{error}</span>
          <button className={styles.chatErrorDismiss} onClick={() => setError(null)}>&times;</button>
        </div>
      )}

      {/* Input */}
      <div className={styles.chatInputRow}>
        <input
          type="text"
          className={styles.chatInput}
          placeholder="Frage zu dieser Klausel stellen..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          disabled={isLoading}
        />
        <button
          className={styles.chatSendBtn}
          onClick={handleSend}
          disabled={!input.trim() || isLoading}
        >
          <Send size={14} />
        </button>
      </div>
    </div>
  );
}
