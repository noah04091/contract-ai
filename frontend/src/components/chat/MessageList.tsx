// frontend/src/components/chat/MessageList.tsx
import React from 'react';
import { Citation } from '../../utils/chatApi';
import SourceCard from './SourceCard';
import styles from '../../styles/Chat.module.css';

interface Message {
  id: string;
  from: 'user' | 'ai' | 'system';
  text: string;
  timestamp: string;
  isStreaming?: boolean;
  sources?: Citation[];
  error?: string;
  retryable?: boolean;
}

interface MessageListProps {
  messages: Message[];
  onRetry?: (messageId: string) => void;
  onShowInPdf?: (page: number, span?: [number, number]) => void;
  isTyping?: boolean;
  currentTypingText?: string;
}

const MessageList: React.FC<MessageListProps> = ({
  messages,
  onRetry,
  onShowInPdf,
  isTyping = false,
  currentTypingText = ''
}) => {

  /**
   * Copy text to clipboard
   */
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand('copy');
      } catch (err) {
        console.error('Failed to copy text:', err);
      }
      document.body.removeChild(textArea);
    }
  };

  /**
   * Format message text with markdown-like support
   */
  const formatMessageText = (text: string): JSX.Element => {
    if (!text) return <></>;

    // Split text into paragraphs
    const paragraphs = text.split('\n\n').filter(p => p.trim());
    
    return (
      <>
        {paragraphs.map((paragraph, pIndex) => {
          // Check if it's a heading (starts with #)
          if (paragraph.startsWith('# ')) {
            return (
              <h3 key={pIndex} className={styles.messageHeading}>
                {paragraph.substring(2)}
              </h3>
            );
          }
          
          if (paragraph.startsWith('## ')) {
            return (
              <h4 key={pIndex} className={styles.messageSubheading}>
                {paragraph.substring(3)}
              </h4>
            );
          }

          // Check if it's a list
          if (paragraph.includes('\n-') || paragraph.includes('\n•')) {
            const lines = paragraph.split('\n');
            const listItems: string[] = [];
            const nonListLines: string[] = [];
            
            lines.forEach(line => {
              if (line.trim().startsWith('-') || line.trim().startsWith('•')) {
                listItems.push(line.trim().substring(1).trim());
              } else if (line.trim()) {
                nonListLines.push(line.trim());
              }
            });
            
            return (
              <div key={pIndex} className={styles.messageParagraph}>
                {nonListLines.length > 0 && (
                  <p>{formatInlineText(nonListLines.join(' '))}</p>
                )}
                {listItems.length > 0 && (
                  <ul className={styles.messageList}>
                    {listItems.map((item, iIndex) => (
                      <li key={iIndex}>{formatInlineText(item)}</li>
                    ))}
                  </ul>
                )}
              </div>
            );
          }

          // Check if it's a table (contains | characters)
          if (paragraph.includes('|') && paragraph.split('\n').length > 1) {
            const lines = paragraph.split('\n').filter(line => line.includes('|'));
            if (lines.length >= 2) {
              const rows = lines.map(line => 
                line.split('|').map(cell => cell.trim()).filter(cell => cell !== '')
              );
              
              return (
                <div key={pIndex} className={styles.tableContainer}>
                  <table className={styles.messageTable}>
                    <thead>
                      <tr>
                        {rows[0].map((header, hIndex) => (
                          <th key={hIndex}>{header}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.slice(1).map((row, rIndex) => (
                        <tr key={rIndex}>
                          {row.map((cell, cIndex) => (
                            <td key={cIndex}>{formatInlineText(cell)}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            }
          }

          // Regular paragraph
          return (
            <p key={pIndex} className={styles.messageParagraph}>
              {formatInlineText(paragraph)}
            </p>
          );
        })}
      </>
    );
  };

  /**
   * Format inline text with bold, italic, code
   */
  const formatInlineText = (text: string): JSX.Element => {
    if (!text) return <></>;

    // Handle citations [Seite X: text]
    const citationRegex = /\[Seite (\d+):\s*([^\]]+)\]/g;
    let lastIndex = 0;
    const elements: (string | JSX.Element)[] = [];
    let match;

    while ((match = citationRegex.exec(text)) !== null) {
      // Add text before citation
      if (match.index > lastIndex) {
        elements.push(text.substring(lastIndex, match.index));
      }

      // Add citation as clickable element
      const page = parseInt(match[1]);
      const citationText = match[2];
      elements.push(
        <span
          key={match.index}
          className={styles.inlineCitation}
          onClick={() => onShowInPdf?.(page)}
          title={`Zur Seite ${page} springen`}
        >
          [Seite {page}: {citationText}]
        </span>
      );

      lastIndex = citationRegex.lastIndex;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      elements.push(text.substring(lastIndex));
    }

    // If no citations found, handle other formatting
    if (elements.length === 1 && typeof elements[0] === 'string') {
      const plainText = elements[0];
      
      // Simple bold/italic support
      const formatted = plainText
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`([^`]+)`/g, '<code>$1</code>');
      
      if (formatted !== plainText) {
        return <span dangerouslySetInnerHTML={{ __html: formatted }} />;
      }
    }

    return <>{elements}</>;
  };

  /**
   * Render loading skeleton for streaming message
   */
  const renderTypingIndicator = () => (
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
            <span className={styles.messageTime}>
              {new Date().toLocaleTimeString('de-DE', { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </span>
          </div>
          {currentTypingText ? (
            <div className={styles.streamingText}>
              {formatMessageText(currentTypingText)}
              <span className={styles.cursor}>|</span>
            </div>
          ) : (
            <div className={styles.typingIndicator}>
              <span></span><span></span><span></span>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  /**
   * Render error message with retry option
   */
  const renderErrorMessage = (message: Message) => (
    <div className={`${styles.message} ${styles.errorMessage}`}>
      <div className={styles.messageContent}>
        <div className={styles.errorIcon}>
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
            <line x1="12" y1="8" x2="12" y2="12" stroke="currentColor" strokeWidth="2"/>
            <line x1="12" y1="16" x2="12.01" y2="16" stroke="currentColor" strokeWidth="2"/>
          </svg>
        </div>
        <div className={styles.messageBody}>
          <div className={styles.messageHeader}>
            <span className={styles.messageSender}>System</span>
            <span className={styles.messageTime}>{message.timestamp}</span>
          </div>
          <div className={styles.errorContent}>
            <p>{message.error || 'Ein Fehler ist aufgetreten'}</p>
            {message.retryable && onRetry && (
              <button 
                className={styles.retryButton}
                onClick={() => onRetry(message.id)}
              >
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M1 4V10H7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M23 20V14H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10M23 14L18.36 18.36A9 9 0 0 1 3.51 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Erneut versuchen
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  /**
   * Render regular message
   */
  const renderMessage = (message: Message) => {
    const isUser = message.from === 'user';
    const isSystem = message.from === 'system';
    const isAI = message.from === 'ai';

    return (
      <div
        key={message.id}
        className={`${styles.message} ${styles[`${message.from}Message`]}`}
      >
        <div className={styles.messageContent}>
          {/* Icon */}
          {isSystem && (
            <div className={styles.systemIcon}>
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                <path d="M12 8V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <circle cx="12" cy="16" r="1" fill="currentColor"/>
              </svg>
            </div>
          )}
          {isAI && (
            <div className={styles.aiIcon}>
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="2" y="2" width="20" height="20" rx="5" stroke="currentColor" strokeWidth="2"/>
                <circle cx="9" cy="9" r="2" fill="currentColor"/>
                <circle cx="15" cy="9" r="2" fill="currentColor"/>
                <path d="M7 15C7 15 9 17 12 17C15 17 17 15 17 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
          )}
          {isUser && (
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
                {isUser ? 'Du' : isAI ? 'KI-Assistent' : 'System'}
              </span>
              <span className={styles.messageTime}>{message.timestamp}</span>
              {isAI && (
                <button
                  className={styles.copyButton}
                  onClick={() => copyToClipboard(message.text)}
                  title="Text kopieren"
                >
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" stroke="currentColor" strokeWidth="2" fill="none"/>
                    <path d="M5 15H4C2.89543 15 2 14.1046 2 13V4C2 2.89543 2.89543 2 4 2H13C14.1046 2 15 2.89543 15 4V5" stroke="currentColor" strokeWidth="2" fill="none"/>
                  </svg>
                </button>
              )}
            </div>
            
            <div className={styles.messageText}>
              {formatMessageText(message.text)}
            </div>

            {/* Sources for AI messages */}
            {isAI && message.sources && message.sources.length > 0 && (
              <div className={styles.sourcesContainer}>
                <h4 className={styles.sourcesTitle}>
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8L14 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M14 2V8H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Quellen ({message.sources.length})
                </h4>
                <div className={styles.sourcesList}>
                  {message.sources.map((source, index) => (
                    <SourceCard
                      key={source.id || index}
                      page={source.page}
                      snippet={source.text}
                      type={source.type}
                      confidence={source.confidence}
                      onShowInPdf={onShowInPdf}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={styles.messageList}>
      {messages.map(message => {
        if (message.error) {
          return renderErrorMessage(message);
        }
        return renderMessage(message);
      })}
      
      {isTyping && renderTypingIndicator()}
    </div>
  );
};

export default MessageList;