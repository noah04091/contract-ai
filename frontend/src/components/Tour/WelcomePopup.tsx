// 📁 frontend/src/components/Tour/WelcomePopup.tsx
// 🎯 Simple Welcome Popup for "action-first" pages
// Clean, professional, single-message introduction

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import type { TourId } from '../../config/tourConfig';
import styles from './WelcomePopup.module.css';

// Helper to get auth token
function getToken(): string | null {
  return localStorage.getItem('authToken') || localStorage.getItem('token');
}

interface WelcomePopupProps {
  featureId: TourId;
  icon: React.ReactNode;
  title: string;
  description: string;
  tip?: string;
}

export function WelcomePopup({
  featureId,
  icon,
  title,
  description,
  tip,
}: WelcomePopupProps) {
  const { user } = useAuth();
  const [isVisible, setIsVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  // Mount check for portal
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Check if user has seen this feature
  useEffect(() => {
    const checkStatus = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        const token = getToken();
        if (!token) {
          setIsLoading(false);
          return;
        }

        const response = await fetch('/api/onboarding/status', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          const seenFeatures = data.onboarding?.seenFeatures || [];
          const showTooltips = data.onboarding?.showTooltips !== false;

          const hasSeen = seenFeatures.includes(featureId);

          // Show popup if not seen and tooltips enabled
          if (!hasSeen && showTooltips) {
            // Short delay for page to settle
            setTimeout(() => {
              setIsVisible(true);
            }, 800);
          }
        }
      } catch (error) {
        console.error('Error checking feature status:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkStatus();
  }, [user, featureId]);

  // Mark feature as seen
  const markAsSeen = useCallback(async () => {
    try {
      const token = getToken();
      if (!token) return;

      await fetch(`/api/onboarding/feature/${featureId}`, {
        method: 'POST',  // Backend expects POST, not PUT!
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
    } catch (error) {
      console.error('Error marking feature as seen:', error);
    }
  }, [featureId]);

  // Handle close
  const handleClose = useCallback(() => {
    setIsVisible(false);
    markAsSeen();
  }, [markAsSeen]);

  // ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isVisible) {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isVisible, handleClose]);

  // Don't render if loading or not visible
  if (!mounted || isLoading || !isVisible) {
    return null;
  }

  const popupContent = (
    <AnimatePresence>
      {isVisible && (
        <>
          {/* Backdrop */}
          <motion.div
            className={styles.backdrop}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
          />

          {/* Popup Container - Flexbox centered */}
          <div className={styles.popup}>
            <motion.div
              className={styles.popupInner}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            >
              {/* Close button */}
              <button className={styles.closeBtn} onClick={handleClose}>
                <X size={18} />
              </button>

              {/* Icon */}
              <div className={styles.iconWrapper}>
                {icon}
              </div>

              {/* Content */}
              <h2 className={styles.title}>{title}</h2>
              <p className={styles.description}>{description}</p>

              {/* Tip (optional) */}
              {tip && (
                <div className={styles.tip}>
                  <span className={styles.tipLabel}>Tipp:</span> {tip}
                </div>
              )}

              {/* Action button */}
              <button className={styles.actionBtn} onClick={handleClose}>
                Verstanden
              </button>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );

  return createPortal(popupContent, document.body);
}

export default WelcomePopup;
