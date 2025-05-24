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
    
    const spaceTop = triggerRect.top;
    const spaceBottom = viewportHeight - triggerRect.bottom;
    const spaceLeft = triggerRect.left;
    const spaceRight = viewportWidth - triggerRect.right;

    // Tooltip dimensions (approximate)
    const tooltipWidth = size === 'lg' ? 400 : size === 'md' ? 300 : 250;
    const tooltipHeight = 120; // Approximate height

    // Check if preferred position has enough space
    switch (position) {
      case 'top':
        if (spaceTop >= tooltipHeight) return 'top';
        if (spaceBottom >= tooltipHeight) return 'bottom';
        break;
      case 'bottom':
        if (spaceBottom >= tooltipHeight) return 'bottom';
        if (spaceTop >= tooltipHeight) return 'top';
        break;
      case 'left':
        if (spaceLeft >= tooltipWidth) return 'left';
        if (spaceRight >= tooltipWidth) return 'right';
        break;
      case 'right':
        if (spaceRight >= tooltipWidth) return 'right';
        if (spaceLeft >= tooltipWidth) return 'left';
        break;
    }

    // Fallback: Choose position with most space
    if (spaceBottom > spaceTop && spaceBottom > 100) return 'bottom';
    if (spaceTop > 100) return 'top';
    if (spaceRight > spaceLeft && spaceRight > tooltipWidth/2) return 'right';
    return 'left';
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
        {/* Professional Info Icon - Clear "i" Symbol */}
        <svg 
          width="16" 
          height="16" 
          viewBox="0 0 24 24" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
          className={styles.infoIcon}
        >
          {/* Circle background */}
          <circle 
            cx="12" 
            cy="12" 
            r="10" 
            fill="currentColor"
            stroke="none"
          />
          {/* Info "i" symbol */}
          <circle 
            cx="12" 
            cy="8" 
            r="1.5" 
            fill="white"
          />
          <rect 
            x="11" 
            y="11" 
            width="2" 
            height="8" 
            rx="1"
            fill="white"
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