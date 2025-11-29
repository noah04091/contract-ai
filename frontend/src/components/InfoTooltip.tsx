// InfoTooltip.tsx - Modern Design mit Glassmorphism
import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import styles from './InfoTooltip.module.css';

interface InfoTooltipProps {
  title: string;
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  size?: 'sm' | 'md' | 'lg';
}

const InfoTooltip: React.FC<InfoTooltipProps> = ({
  title,
  content,
  position = 'bottom',
  size = 'md'
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [actualPosition, setActualPosition] = useState(position);
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});
  const tooltipRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Portal container
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);

  useEffect(() => {
    // Create or get portal container
    let container = document.getElementById('tooltip-portal');
    if (!container) {
      container = document.createElement('div');
      container.id = 'tooltip-portal';
      container.style.position = 'relative';
      container.style.zIndex = '10000';
      document.body.appendChild(container);
    }
    setPortalContainer(container);

    return () => {
      // Cleanup on unmount
      if (container && container.children.length === 0) {
        document.body.removeChild(container);
      }
    };
  }, []);

  // Calculate absolute position for portal
  const calculateTooltipPosition = (): React.CSSProperties => {
    if (!triggerRef.current || isMobile) return {};

    const triggerRect = triggerRef.current.getBoundingClientRect();

    // Tooltip dimensions based on size
    const tooltipWidth = size === 'lg' ? 350 : size === 'md' ? 280 : 220;
    const tooltipHeight = 120;
    const offset = 10;

    // Calculate best position based on viewport space
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const spaceTop = triggerRect.top;
    const spaceBottom = viewportHeight - triggerRect.bottom;
    const spaceLeft = triggerRect.left;
    const spaceRight = viewportWidth - triggerRect.right;

    let bestPosition = position;

    // Smart position selection
    if (triggerRect.left > viewportWidth * 0.7 && spaceLeft >= tooltipWidth + offset) {
      bestPosition = 'left';
    } else if (triggerRect.left < viewportWidth * 0.3 && spaceRight >= tooltipWidth + offset) {
      bestPosition = 'right';
    } else if (triggerRect.top > viewportHeight * 0.6 && spaceTop >= tooltipHeight + offset) {
      bestPosition = 'top';
    } else if (spaceBottom >= tooltipHeight + offset) {
      bestPosition = 'bottom';
    } else {
      // Fallback to position with most space
      const maxSpace = Math.max(spaceTop, spaceBottom, spaceLeft, spaceRight);
      if (maxSpace === spaceTop) bestPosition = 'top';
      else if (maxSpace === spaceBottom) bestPosition = 'bottom';
      else if (maxSpace === spaceLeft) bestPosition = 'left';
      else bestPosition = 'right';
    }

    setActualPosition(bestPosition);

    // Build style object based on calculated best position
    const baseStyle: React.CSSProperties = {
      position: 'fixed',
      zIndex: 10000,
    };

    switch (bestPosition) {
      case 'top':
        return {
          ...baseStyle,
          left: Math.max(10, Math.min(
            triggerRect.left + triggerRect.width / 2 - tooltipWidth / 2,
            viewportWidth - tooltipWidth - 10
          )),
          top: triggerRect.top - tooltipHeight - offset,
        };
      case 'bottom':
        return {
          ...baseStyle,
          left: Math.max(10, Math.min(
            triggerRect.left + triggerRect.width / 2 - tooltipWidth / 2,
            viewportWidth - tooltipWidth - 10
          )),
          top: triggerRect.bottom + offset,
        };
      case 'left':
        return {
          ...baseStyle,
          left: triggerRect.left - tooltipWidth - offset,
          top: Math.max(10, Math.min(
            triggerRect.top + triggerRect.height / 2 - tooltipHeight / 2,
            viewportHeight - tooltipHeight - 10
          )),
        };
      case 'right':
        return {
          ...baseStyle,
          left: triggerRect.right + offset,
          top: Math.max(10, Math.min(
            triggerRect.top + triggerRect.height / 2 - tooltipHeight / 2,
            viewportHeight - tooltipHeight - 10
          )),
        };
      default:
        return baseStyle;
    }
  };

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (tooltipRef.current && triggerRef.current) {
        if (!tooltipRef.current.contains(event.target as Node) &&
            !triggerRef.current.contains(event.target as Node)) {
          setIsVisible(false);
        }
      }
    };

    if (isVisible) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isVisible]);

  const handleMouseEnter = () => {
    if (!isMobile) {
      const style = calculateTooltipPosition();
      setTooltipStyle(style);
      setIsVisible(true);
    }
  };

  const handleMouseLeave = () => {
    if (!isMobile) setIsVisible(false);
  };

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const style = calculateTooltipPosition();
    setTooltipStyle(style);
    setIsVisible(!isVisible);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const style = calculateTooltipPosition();
      setTooltipStyle(style);
      setIsVisible(!isVisible);
    }
    if (e.key === 'Escape') {
      setIsVisible(false);
    }
  };

  // Tooltip content
  const tooltipContent = (
    <>
      {isMobile && isVisible && <div className={styles.mobileOverlay} onClick={() => setIsVisible(false)} />}
      <div
        ref={tooltipRef}
        className={`
          ${styles.tooltipContent}
          ${styles[actualPosition]}
          ${styles[size]}
          ${isMobile ? styles.mobile : styles.desktop}
        `}
        style={isMobile ? {} : tooltipStyle}
        role="tooltip"
        aria-live="polite"
      >
        {isMobile && (
          <button
            className={styles.closeButton}
            onClick={() => setIsVisible(false)}
            aria-label="Schließen"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M18 6L6 18M6 6L18 18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        )}

        <div className={styles.tooltipHeader}>
          <div className={styles.tooltipIconWrapper}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 16V12M12 8H12.01M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <h4 className={styles.tooltipTitle}>{title}</h4>
        </div>

        <div className={styles.tooltipBody}>
          <p className={styles.tooltipText}>{content}</p>
        </div>

        {!isMobile && <div className={styles.tooltipArrow} />}
      </div>
    </>
  );

  return (
    <div className={styles.tooltipContainer}>
      <button
        ref={triggerRef}
        className={`${styles.tooltipTrigger} ${isVisible ? styles.active : ''}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        aria-label={`Information: ${title}`}
        aria-expanded={isVisible}
        type="button"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={styles.infoIcon}
        >
          <path
            d="M12 16V12M12 8H12.01M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {/* Render tooltip via portal to avoid container overflow issues */}
      {isVisible && portalContainer && createPortal(tooltipContent, portalContainer)}
    </div>
  );
};

export default InfoTooltip;
