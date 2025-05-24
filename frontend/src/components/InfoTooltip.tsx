// InfoTooltip.tsx - Mit Portal für Card-Container
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
    const tooltipHeight = 100;
    const offset = 12;

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

    if (isVisible && isMobile) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isVisible, isMobile]);

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
    if (isMobile) {
      setIsVisible(!isVisible);
    } else {
      const style = calculateTooltipPosition();
      setTooltipStyle(style);
      setIsVisible(!isVisible);
    }
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
      {isMobile && <div className={styles.mobileOverlay} />}
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
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
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
        className={styles.tooltipTrigger}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        aria-label={`Information: ${title}`}
        aria-expanded={isVisible}
        type="button"
      >
        {/* CLEAR INFO ICON - Simple and recognizable */}
        <svg 
          width="14" 
          height="14" 
          viewBox="0 0 20 20" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
          className={styles.infoIcon}
        >
          {/* Simple "i" in circle - VERY clear */}
          <circle 
            cx="10" 
            cy="10" 
            r="9" 
            fill="white"
            stroke="#3b82f6" 
            strokeWidth="2"
          />
          {/* Top dot of "i" */}
          <circle 
            cx="10" 
            cy="6" 
            r="1.5" 
            fill="#3b82f6"
          />
          {/* Bottom line of "i" */}
          <rect 
            x="9" 
            y="9" 
            width="2" 
            height="6" 
            rx="1"
            fill="#3b82f6"
          />
        </svg>
      </button>

      {/* Render tooltip via portal to avoid container overflow issues */}
      {isVisible && portalContainer && (
        isMobile ? 
          createPortal(tooltipContent, portalContainer) :
          createPortal(tooltipContent, portalContainer)
      )}
    </div>
  );
};

export default InfoTooltip;