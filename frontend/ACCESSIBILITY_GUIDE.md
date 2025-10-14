# Accessibility Guide

This guide documents the accessibility features implemented in Contract AI to ensure WCAG 2.1 Level AA compliance.

## Features Implemented

### 1. Skip Navigation Link
Allows keyboard users to skip directly to main content.

**Usage:**
- Press Tab when page loads to see "Zum Hauptinhalt springen" link
- Press Enter to skip to main content
- Located at: `src/components/SkipNavigation.tsx`

### 2. Focus Management
Comprehensive focus trap and management utilities.

**Features:**
- Focus trap for modals and dialogs
- Focus restoration after modal close
- Arrow key navigation for menus
- Tab order management

**Usage:**
```tsx
import { useFocusTrap } from '../utils/focusManagement';

function MyModal({ isOpen }: { isOpen: boolean }) {
  const modalRef = useFocusTrap<HTMLDivElement>(isOpen);

  return (
    <div ref={modalRef} role="dialog">
      {/* Modal content */}
    </div>
  );
}
```

### 3. Screen Reader Announcements
ARIA live regions for dynamic content updates.

**Usage:**
```tsx
import { useAnnouncer } from '../components/ScreenReaderAnnouncer';

function MyComponent() {
  const { announce } = useAnnouncer();

  const handleSuccess = () => {
    announce('Operation completed successfully', 'polite');
  };

  const handleError = () => {
    announce('Error occurred!', 'assertive');
  };

  return <button onClick={handleSuccess}>Save</button>;
}
```

### 4. Global Accessibility Styles

#### Focus Visible Indicators
All interactive elements have visible focus indicators that meet WCAG contrast requirements.

```css
*:focus-visible {
  outline: 3px solid #3b82f6;
  outline-offset: 2px;
}
```

#### Screen Reader Only Content
Hide content visually while keeping it accessible to screen readers.

```tsx
<span className="sr-only">Loading...</span>
```

#### Reduced Motion Support
Respects user's motion preferences.

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

#### High Contrast Mode
Ensures visibility in high contrast mode.

```css
@media (prefers-contrast: high) {
  button, input {
    border: 2px solid currentColor;
  }
}
```

### 5. Keyboard Navigation

All interactive elements are keyboard accessible:
- **Tab** - Navigate forward
- **Shift + Tab** - Navigate backward
- **Enter / Space** - Activate buttons and links
- **Escape** - Close modals and dropdowns
- **Arrow Keys** - Navigate through menus
- **Home / End** - Jump to first/last menu item

### 6. ARIA Attributes

#### Required Fields
```tsx
<input aria-required="true" />
```

#### Invalid Fields
```tsx
<input aria-invalid="true" aria-describedby="error-id" />
<span id="error-id">Error message</span>
```

#### Busy State
```tsx
<div aria-busy="true">Loading...</div>
```

#### Disabled State
```tsx
<button aria-disabled="true">Cannot Click</button>
```

## WCAG 2.1 Compliance

### Level AA Requirements Met

#### Perceivable
- ✅ **1.4.3 Contrast (Minimum)** - All text meets 4.5:1 contrast ratio
- ✅ **1.4.11 Non-text Contrast** - UI components meet 3:1 contrast
- ✅ **1.4.12 Text Spacing** - Text remains readable with custom spacing
- ✅ **1.4.13 Content on Hover/Focus** - Hover content is dismissible

#### Operable
- ✅ **2.1.1 Keyboard** - All functionality available via keyboard
- ✅ **2.1.2 No Keyboard Trap** - Focus can move away from all elements
- ✅ **2.4.1 Bypass Blocks** - Skip navigation link provided
- ✅ **2.4.3 Focus Order** - Logical focus order maintained
- ✅ **2.4.7 Focus Visible** - Focus indicators always visible
- ✅ **2.5.5 Target Size** - Touch targets are minimum 44x44px

#### Understandable
- ✅ **3.2.1 On Focus** - No context changes on focus
- ✅ **3.2.2 On Input** - No unexpected context changes
- ✅ **3.3.1 Error Identification** - Errors clearly identified
- ✅ **3.3.2 Labels or Instructions** - Form labels provided
- ✅ **3.3.3 Error Suggestion** - Error correction suggestions provided

#### Robust
- ✅ **4.1.2 Name, Role, Value** - All UI components have proper ARIA attributes
- ✅ **4.1.3 Status Messages** - ARIA live regions for status updates

## Testing Accessibility

### Keyboard Testing Checklist
- [ ] Tab through all interactive elements
- [ ] Activate all buttons with Enter/Space
- [ ] Close modals with Escape key
- [ ] Navigate menus with arrow keys
- [ ] Ensure focus is always visible
- [ ] Check skip navigation link works

### Screen Reader Testing
Test with:
- **NVDA** (Windows - Free)
- **JAWS** (Windows - Paid)
- **VoiceOver** (macOS - Built-in)

Checklist:
- [ ] All images have alt text
- [ ] All buttons have descriptive labels
- [ ] Form fields have associated labels
- [ ] Error messages are announced
- [ ] Success messages are announced
- [ ] Loading states are announced

### Automated Testing Tools
- **axe DevTools** - Chrome/Firefox extension
- **Lighthouse** - Built into Chrome DevTools
- **WAVE** - Web accessibility evaluation tool

### Color Contrast Testing
- Use Chrome DevTools Accessibility panel
- Check all text against backgrounds
- Verify focus indicators have sufficient contrast

## Best Practices

### DO's
- ✅ Always provide meaningful alt text for images
- ✅ Use semantic HTML (`<button>`, `<nav>`, `<main>`, etc.)
- ✅ Provide keyboard equivalents for all mouse actions
- ✅ Use ARIA attributes when semantic HTML isn't sufficient
- ✅ Test with actual screen readers
- ✅ Respect user preferences (reduced motion, high contrast)
- ✅ Provide multiple ways to complete tasks

### DON'Ts
- ❌ Don't use div/span for buttons (use `<button>`)
- ❌ Don't remove focus outlines without replacement
- ❌ Don't rely solely on color to convey information
- ❌ Don't use placeholder as label replacement
- ❌ Don't create keyboard traps
- ❌ Don't use autofocus unless necessary
- ❌ Don't use ARIA when semantic HTML is available

## Common Patterns

### Accessible Modal
```tsx
function Modal({ isOpen, onClose }: ModalProps) {
  const modalRef = useFocusTrap<HTMLDivElement>(isOpen);
  const { announce } = useAnnouncer();

  useEffect(() => {
    if (isOpen) {
      announce('Modal opened', 'polite');
    }
  }, [isOpen, announce]);

  if (!isOpen) return null;

  return (
    <div
      ref={modalRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <h2 id="modal-title">Modal Title</h2>
      <button onClick={onClose} aria-label="Close modal">
        ×
      </button>
      {/* Modal content */}
    </div>
  );
}
```

### Accessible Form
```tsx
function ContactForm() {
  const [errors, setErrors] = useState({});

  return (
    <form>
      <label htmlFor="email">
        Email <span aria-label="required">*</span>
      </label>
      <input
        id="email"
        type="email"
        aria-required="true"
        aria-invalid={!!errors.email}
        aria-describedby={errors.email ? "email-error" : undefined}
      />
      {errors.email && (
        <span id="email-error" role="alert">
          {errors.email}
        </span>
      )}

      <button type="submit">Submit</button>
    </form>
  );
}
```

### Accessible Menu
```tsx
function Menu() {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && menuRef.current) {
      const cleanup = createArrowKeyNavigation(menuRef.current, {
        selector: '[role="menuitem"]',
        orientation: 'vertical',
      });
      return cleanup;
    }
  }, [isOpen]);

  return (
    <div>
      <button
        aria-haspopup="true"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(!isOpen)}
      >
        Menu
      </button>
      {isOpen && (
        <div ref={menuRef} role="menu">
          <button role="menuitem">Item 1</button>
          <button role="menuitem">Item 2</button>
          <button role="menuitem">Item 3</button>
        </div>
      )}
    </div>
  );
}
```

## Resources

### Documentation
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/)
- [MDN Accessibility](https://developer.mozilla.org/en-US/docs/Web/Accessibility)

### Tools
- [axe DevTools](https://www.deque.com/axe/devtools/)
- [Lighthouse](https://developers.google.com/web/tools/lighthouse)
- [WAVE](https://wave.webaim.org/)
- [Color Contrast Checker](https://webaim.org/resources/contrastchecker/)

### Screen Readers
- [NVDA (Free)](https://www.nvaccess.org/)
- [JAWS](https://www.freedomscientific.com/products/software/jaws/)
- [VoiceOver (Built-in macOS/iOS)](https://www.apple.com/accessibility/voiceover/)

## Continuous Improvement

Accessibility is an ongoing process. We should:
1. Regularly audit with automated tools
2. Conduct user testing with people with disabilities
3. Stay updated with WCAG updates
4. Train team members on accessibility best practices
5. Include accessibility in code reviews
6. Document new patterns and components
