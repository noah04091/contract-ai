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
  const tooltipRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

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
    if (!isMobile) setIsVisible(true);
  };

  const handleMouseLeave = () => {
    if (!isMobile) setIsVisible(false);
  };

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isMobile) {
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
        {/* Professional Question Mark Icon */}
        <svg 
          width="16" 
          height="16" 
          viewBox="0 0 24 24" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
          className={styles.infoIcon}
        >
          <circle 
            cx="12" 
            cy="12" 
            r="10" 
            stroke="currentColor" 
            strokeWidth="2"
            fill="none"
          />
          <path 
            d="M9.09 9C9.3251 8.33167 9.78915 7.76811 10.4 7.40913C11.0108 7.05016 11.7289 6.91894 12.4272 7.03871C13.1255 7.15849 13.7588 7.52152 14.2151 8.06353C14.6713 8.60553 14.9211 9.29152 14.92 10C14.92 12 11.92 13 11.92 13" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          />
          <circle 
            cx="12" 
            cy="17" 
            r="1" 
            fill="currentColor"
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
              ${styles[position]} 
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