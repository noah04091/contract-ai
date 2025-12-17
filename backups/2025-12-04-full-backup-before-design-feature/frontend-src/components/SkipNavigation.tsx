// ⚡ src/components/SkipNavigation.tsx - Skip to Main Content Link
import { useEffect, useState } from 'react';
import styles from './SkipNavigation.module.css';

export default function SkipNavigation() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Show skip link when Tab is pressed
      if (e.key === 'Tab' && !e.shiftKey) {
        setIsVisible(true);
      }
    };

    const handleBlur = () => {
      // Hide skip link when it loses focus
      setTimeout(() => setIsVisible(false), 100);
    };

    document.addEventListener('keydown', handleKeyDown);
    const skipLink = document.getElementById('skip-to-main');
    skipLink?.addEventListener('blur', handleBlur);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      skipLink?.removeEventListener('blur', handleBlur);
    };
  }, []);

  const handleSkipClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const mainContent = document.querySelector('main');

    if (mainContent) {
      // Set tabindex temporarily to make main focusable
      mainContent.setAttribute('tabindex', '-1');
      mainContent.focus();

      // Scroll to main content
      mainContent.scrollIntoView({ behavior: 'smooth', block: 'start' });

      // Remove tabindex after focus
      setTimeout(() => {
        mainContent.removeAttribute('tabindex');
      }, 100);
    }
  };

  return (
    <a
      id="skip-to-main"
      href="#main-content"
      className={`${styles.skipLink} ${isVisible ? styles.visible : ''}`}
      onClick={handleSkipClick}
    >
      Zum Hauptinhalt springen
    </a>
  );
}
