// InfoTooltip.tsx - Professionelle Info-Tooltip Komponente
import React, { useState, useRef, useEffect } from 'react';
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
  const tooltipRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Smart positioning to prevent cutoff
  const calculateBestPosition = () => {
    if (!triggerRef.current || isMobile) return position;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Calculate available space in each direction
    const spaceTop = triggerRect.top;
    const spaceBottom = viewportHeight - triggerRect.bottom;
    const spaceLeft = triggerRect.left;
    const spaceRight = viewportWidth - triggerRect.right;

    // Tooltip dimensions based on size
    const tooltipWidth = size === 'lg' ? 350 : size === 'md' ? 280 : 220;
    const tooltipHeight = 100;

    // FORCE safe positioning - prefer positions with most space
    
    // If trigger is in right half of screen, prefer left positioning
    if (triggerRect.left > viewportWidth * 0.6) {
      if (spaceLeft >= tooltipWidth + 20) return 'left';
    }
    
    // If trigger is in left half of screen, prefer right positioning  
    if (triggerRect.left < viewportWidth * 0.4) {
      if (spaceRight >= tooltipWidth + 20) return 'right';
    }

    // Vertical positioning preferences
    if (triggerRect.top > viewportHeight * 0.6) {
      if (spaceTop >= tooltipHeight + 20) return 'top';
    }
    
    if (triggerRect.top < viewportHeight * 0.4) {
      if (spaceBottom >= tooltipHeight + 20) return 'bottom';
    }

    // Fallback: Choose the position with the most available space
    const spaces = {
      top: spaceTop,
      bottom: spaceBottom,
      left: spaceLeft,
      right: spaceRight
    };

    const bestPosition = Object.entries(spaces).reduce((a, b) => 
      spaces[a[0] as keyof typeof spaces] > spaces[b[0] as keyof typeof spaces] ? a : b
    )[0];

    return bestPosition as typeof position;
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
      setActualPosition(calculateBestPosition());
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
      setActualPosition(calculateBestPosition());
      setIsVisible(!isVisible);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsVisible(!isVisible);
    }
    if (e.key === 'Escape') {
      setIsVisible(false);
    }
  };

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

      {isVisible && (
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
      )}
    </div>
  );
};

export default InfoTooltip;