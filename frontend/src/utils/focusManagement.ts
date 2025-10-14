// 🎯 src/utils/focusManagement.ts - Focus Management Utilities

/**
 * Get all focusable elements within a container
 */
export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const focusableSelectors = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
    'audio[controls]',
    'video[controls]',
    '[contenteditable]:not([contenteditable="false"])',
  ].join(', ');

  return Array.from(container.querySelectorAll<HTMLElement>(focusableSelectors)).filter(
    (element) => {
      // Filter out hidden elements
      return (
        element.offsetParent !== null &&
        !element.hasAttribute('hidden') &&
        getComputedStyle(element).visibility !== 'hidden'
      );
    }
  );
}

/**
 * Focus trap for modals and dialogs
 */
export class FocusTrap {
  private container: HTMLElement;
  private previousActiveElement: HTMLElement | null;
  private focusableElements: HTMLElement[];
  private firstFocusable: HTMLElement | null;
  private lastFocusable: HTMLElement | null;

  constructor(container: HTMLElement) {
    this.container = container;
    this.previousActiveElement = document.activeElement as HTMLElement;
    this.focusableElements = getFocusableElements(container);
    this.firstFocusable = this.focusableElements[0] || null;
    this.lastFocusable = this.focusableElements[this.focusableElements.length - 1] || null;
  }

  activate() {
    // Focus first element
    if (this.firstFocusable) {
      this.firstFocusable.focus();
    }

    // Add event listener for Tab key
    this.container.addEventListener('keydown', this.handleKeyDown);
  }

  deactivate() {
    // Remove event listener
    this.container.removeEventListener('keydown', this.handleKeyDown);

    // Restore focus to previous element
    if (this.previousActiveElement) {
      this.previousActiveElement.focus();
    }
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'Tab') return;

    // Refresh focusable elements in case DOM changed
    this.focusableElements = getFocusableElements(this.container);
    this.firstFocusable = this.focusableElements[0] || null;
    this.lastFocusable = this.focusableElements[this.focusableElements.length - 1] || null;

    if (e.shiftKey) {
      // Shift + Tab: Moving backwards
      if (document.activeElement === this.firstFocusable) {
        e.preventDefault();
        this.lastFocusable?.focus();
      }
    } else {
      // Tab: Moving forwards
      if (document.activeElement === this.lastFocusable) {
        e.preventDefault();
        this.firstFocusable?.focus();
      }
    }
  };
}

/**
 * React hook for focus trap
 */
import { useEffect, useRef } from 'react';

export function useFocusTrap<T extends HTMLElement>(isActive: boolean = true) {
  const containerRef = useRef<T>(null);
  const focusTrapRef = useRef<FocusTrap | null>(null);

  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    focusTrapRef.current = new FocusTrap(containerRef.current);
    focusTrapRef.current.activate();

    return () => {
      focusTrapRef.current?.deactivate();
    };
  }, [isActive]);

  return containerRef;
}

/**
 * Restore focus to a previous element after an action
 */
export function withFocusReturn<T extends (...args: Parameters<T>) => ReturnType<T>>(
  fn: T,
  triggerElement?: HTMLElement
): T {
  return ((...args: Parameters<T>) => {
    const previousFocus = triggerElement || (document.activeElement as HTMLElement);
    const result = fn(...args);

    // Restore focus after action completes
    if (result instanceof Promise) {
      result.finally(() => {
        previousFocus?.focus();
      });
    } else {
      setTimeout(() => {
        previousFocus?.focus();
      }, 0);
    }

    return result;
  }) as T;
}

/**
 * Check if an element is visible and focusable
 */
export function isFocusable(element: HTMLElement): boolean {
  const focusableElements = getFocusableElements(document.body);
  return focusableElements.includes(element);
}

/**
 * Focus the first error in a form
 */
export function focusFirstError(formElement: HTMLElement): boolean {
  const errorElements = formElement.querySelectorAll<HTMLElement>(
    '[aria-invalid="true"], .error-field, [data-error="true"]'
  );

  const firstError = Array.from(errorElements).find(isFocusable);

  if (firstError) {
    firstError.focus();
    firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return true;
  }

  return false;
}

/**
 * Navigate through elements with arrow keys
 */
export function createArrowKeyNavigation(
  container: HTMLElement,
  options: {
    selector?: string;
    loop?: boolean;
    orientation?: 'horizontal' | 'vertical' | 'both';
  } = {}
) {
  const {
    selector = '[role="menuitem"], [role="option"], button, a',
    loop = true,
    orientation = 'vertical',
  } = options;

  const handleKeyDown = (e: KeyboardEvent) => {
    const elements = Array.from(container.querySelectorAll<HTMLElement>(selector)).filter(
      isFocusable
    );

    if (elements.length === 0) return;

    const currentIndex = elements.indexOf(document.activeElement as HTMLElement);
    if (currentIndex === -1) return;

    let nextIndex = currentIndex;

    const isVertical = orientation === 'vertical' || orientation === 'both';
    const isHorizontal = orientation === 'horizontal' || orientation === 'both';

    switch (e.key) {
      case 'ArrowDown':
        if (isVertical) {
          e.preventDefault();
          nextIndex = currentIndex + 1;
        }
        break;
      case 'ArrowUp':
        if (isVertical) {
          e.preventDefault();
          nextIndex = currentIndex - 1;
        }
        break;
      case 'ArrowRight':
        if (isHorizontal) {
          e.preventDefault();
          nextIndex = currentIndex + 1;
        }
        break;
      case 'ArrowLeft':
        if (isHorizontal) {
          e.preventDefault();
          nextIndex = currentIndex - 1;
        }
        break;
      case 'Home':
        e.preventDefault();
        nextIndex = 0;
        break;
      case 'End':
        e.preventDefault();
        nextIndex = elements.length - 1;
        break;
      default:
        return;
    }

    // Handle looping
    if (loop) {
      nextIndex = (nextIndex + elements.length) % elements.length;
    } else {
      nextIndex = Math.max(0, Math.min(nextIndex, elements.length - 1));
    }

    if (nextIndex !== currentIndex) {
      elements[nextIndex]?.focus();
    }
  };

  container.addEventListener('keydown', handleKeyDown);

  return () => {
    container.removeEventListener('keydown', handleKeyDown);
  };
}
