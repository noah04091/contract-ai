# Mobile Konzept: Contracts-Seite

## Analyse der aktuellen Situation

Die Contracts.module.css hat bereits **6 Media Query Breakpoints**:
- `@media (max-width: 1024px)` - Tablet
- `@media (max-width: 768px)` - Mobile
- `@media (max-width: 640px)` - Smaller Mobile
- `@media (max-width: 480px)` - Very Small Mobile
- `@media (max-width: 375px)` - Extra Small (iPhone SE)
- `@media (max-width: 480px)` - Limit Badge (doppelt!)

### Identifizierte Problembereiche

---

## 1. NAVIGATION/TABS - Mobile Navigation

**Problem:** Die Tab-Navigation (Hochladen, Email-Upload, Meine Verträge) ist auf Mobile als vertikale Liste dargestellt, nimmt viel Platz ein.

**Lösung:**
- Horizontal scrollbare Tabs mit Pill-Design
- Icons prominent, Text kompakt
- Sticky am oberen Rand
- Touch-Target mindestens 44px

```css
/* MOBILE TABS - Horizontal Scroll */
@media (max-width: 768px) {
  .tabsContainer {
    flex-direction: row;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scroll-snap-type: x mandatory;
    gap: 0.5rem;
    padding: 0.5rem;
    background: white;
    position: sticky;
    top: 0;
    z-index: 100;
  }

  .tabButton {
    flex: 0 0 auto;
    scroll-snap-align: start;
    white-space: nowrap;
    min-width: fit-content;
  }
}
```

---

## 2. SECTION HEADER - Überschriften

**Problem:** Section Headers können abgeschnitten werden, Icons zu groß/klein.

**Lösung:**
- Flex-wrap für mehrzeilige Darstellung
- Icon-Größe anpassen (24-28px mobile)
- Beschreibungstext kleinere Schrift
- Gap zwischen Icon und Text

```css
@media (max-width: 480px) {
  .sectionTitle {
    font-size: 1.25rem;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  .sectionTitle svg {
    width: 28px;
    height: 28px;
    flex-shrink: 0;
  }

  .sectionDescription {
    font-size: 0.85rem;
    line-height: 1.5;
  }
}
```

---

## 3. UPLOAD AREA - Drag & Drop Bereich

**Problem:** Upload-Bereich zu groß, Icon zu prominent, Text schwer lesbar.

**Lösung:**
- Kompakteres Design für Mobile
- Tap-to-Upload statt Drag & Drop Fokus
- Icon auf 48-56px reduzieren
- Button prominenter machen

```css
@media (max-width: 480px) {
  .uploadArea {
    padding: 1.5rem 1rem;
    min-height: auto;
    border-radius: 16px;
  }

  .uploadIcon {
    width: 56px;
    height: 56px;
  }

  .uploadIcon svg {
    width: 28px;
    height: 28px;
  }

  .uploadPrompt h3 {
    font-size: 1rem;
  }

  .uploadPrompt p {
    font-size: 0.8rem;
  }

  /* Mobile: Button statt Drag & Drop */
  .uploadArea::after {
    content: 'Tippe zum Hochladen';
    /* ... */
  }
}
```

---

## 4. EMAIL INBOX WIDGET - Adress-Box

**Problem:** Email-Adresse kann abgeschnitten werden, Buttons zu klein.

**Lösung:**
- Adresse auf eigener Zeile, volle Breite
- Buttons darunter in Row
- Font-Size reduzieren für lange Adressen
- Copy-Feedback größer

```css
@media (max-width: 480px) {
  .addressBox {
    flex-direction: column;
    gap: 1rem;
  }

  .address {
    width: 100%;
    font-size: 11px;
    text-align: center;
    word-break: break-all;
    padding: 0.875rem;
  }

  .controls {
    justify-content: center;
    width: 100%;
  }

  .controlButton {
    min-width: 48px;
    min-height: 48px;
  }
}
```

---

## 5. MULTI-FILE PREVIEW - Datei-Liste

**Problem:** Datei-Items komplex, Actions überlappen.

**Lösung:**
- Vereinfachtes Card-Layout
- Actions in eigener Zeile unter Info
- Progress-Bar volle Breite
- Swipe-to-Delete (optional)

```css
@media (max-width: 480px) {
  .fileItem {
    flex-direction: column;
    align-items: stretch;
    gap: 0.75rem;
    padding: 1rem;
  }

  .fileItemLeft {
    width: 100%;
  }

  .fileItemRight {
    width: 100%;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
  }

  .fileItemName {
    max-width: 100%;
    font-size: 0.875rem;
  }

  .fileItemActions {
    gap: 0.5rem;
  }

  .fileItemActions button {
    min-width: 40px;
    min-height: 40px;
  }
}
```

---

## 6. CONTRACT CARDS - Vertrags-Karten

**Problem:** Cards zu dicht, Actions überlappen, Details schwer lesbar.

**Lösung:**
- Mehr Padding
- Details in Grid 2x2 statt 1 Spalte
- Actions als 2x2 Grid (nicht 4 in einer Reihe)
- Touch-Targets 44px+

```css
@media (max-width: 480px) {
  .contractCard {
    padding: 1rem;
    border-radius: 14px;
    margin-bottom: 0.875rem;
  }

  .cardDetails {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.75rem;
  }

  .cardActions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
  }

  .cardActionButton {
    min-height: 44px;
    justify-content: center;
    font-size: 0.8rem;
  }
}
```

---

## 7. BULK ACTION BAR - Sammel-Aktionen

**Problem:** Bar kann überlaufen, Buttons zu klein.

**Lösung:**
- Volle Breite nutzen
- Vertikales Layout mit Actions unten
- Größere Touch-Targets
- Safe-Area für iPhone Notch

```css
@media (max-width: 480px) {
  .bulkActionBar {
    flex-direction: column;
    gap: 0.75rem;
    padding: 1rem;
    padding-bottom: max(1rem, env(safe-area-inset-bottom));
    left: 0.75rem;
    right: 0.75rem;
    max-width: none;
    transform: none;
  }

  .bulkActionButtons {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
    width: 100%;
  }

  .bulkActionButton,
  .bulkDeleteButton {
    min-height: 44px;
    justify-content: center;
  }
}
```

---

## 8. MODALS - Popup-Fenster

**Problem:** Modals können über Viewport hinausgehen.

**Lösung:**
- Max-Height mit dvh für iOS
- Safe-Area Insets
- Scroll im Content-Bereich
- Actions sticky am unteren Rand

```css
@media (max-width: 480px) {
  .modalOverlay {
    padding: max(0.5rem, env(safe-area-inset-top))
             max(0.5rem, env(safe-area-inset-right))
             max(0.5rem, env(safe-area-inset-bottom))
             max(0.5rem, env(safe-area-inset-left));
  }

  .duplicateModal,
  .legacyModal {
    max-height: 90dvh;
    border-radius: 16px;
    display: flex;
    flex-direction: column;
  }

  .modalContent {
    flex: 1;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
  }

  .modalActions {
    position: sticky;
    bottom: 0;
    background: white;
    padding-bottom: max(1rem, env(safe-area-inset-bottom));
  }
}
```

---

## 9. FILTERS & SEARCH - Such-Bereich

**Problem:** Filter nehmen zu viel Platz ein.

**Lösung:**
- Kollabierbare Filter (Accordion)
- Suchleiste volle Breite
- Filter-Chips horizontal scrollbar
- Aktive Filter als Tags

```css
@media (max-width: 480px) {
  .filtersToolbar {
    gap: 0.75rem;
  }

  .searchSection {
    width: 100%;
  }

  .searchInput {
    font-size: 16px; /* Verhindert iOS Zoom */
    padding: 0.875rem 1rem 0.875rem 2.75rem;
  }

  .quickFilters {
    overflow-x: auto;
    flex-wrap: nowrap;
    padding-bottom: 0.25rem;
    -webkit-overflow-scrolling: touch;
  }

  .quickFilter {
    flex: 0 0 auto;
    white-space: nowrap;
  }
}
```

---

## 10. EMPTY STATE - Leerer Zustand

**Problem:** Empty State nutzt Platz nicht optimal.

**Lösung:**
- Zentriert vertikal
- Icon kleiner
- CTA-Button prominent

```css
@media (max-width: 480px) {
  .emptyState {
    padding: 3rem 1.5rem;
    min-height: 50vh;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }

  .emptyIcon {
    width: 56px;
    height: 56px;
  }

  .emptyState h3 {
    font-size: 1.125rem;
  }
}
```

---

## 11. LIMIT BADGE - Analyse-Limit Anzeige

**Problem:** Badge kann umbrechen, schlecht lesbar.

**Lösung:**
- Kompaktes vertikales Layout
- Progress-Bar prominent
- Upgrade-Button volle Breite

```css
@media (max-width: 480px) {
  .limitBadge {
    flex-direction: column;
    align-items: stretch;
    gap: 0.75rem;
    padding: 0.875rem;
    text-align: center;
  }

  .limitBadgeText {
    font-size: 0.8rem;
  }

  .limitBadgeUpgrade {
    width: 100%;
    padding: 0.75rem;
    font-size: 0.875rem;
  }
}
```

---

## 12. UPGRADE SECTION - Premium Werbung

**Problem:** Plan-Cards zu groß, Text schwer lesbar.

**Lösung:**
- Single-Column Layout
- Kompaktere Cards
- Horizontaler Scroll für mehrere Pläne

```css
@media (max-width: 480px) {
  .upgradeSection {
    padding: 2rem 1rem;
  }

  .upgradeSection h2 {
    font-size: 1.375rem;
  }

  .upgradePlans {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .upgradePlan {
    padding: 1.25rem;
  }
}
```

---

## Zusammenfassung: Zu bearbeitende CSS-Bereiche

### Priorität 1 (Kritisch):
1. **Tabs Navigation** - Horizontal scrollbar machen
2. **Contract Cards** - Actions als 2x2 Grid
3. **Search Input** - Font-size 16px für iOS
4. **Modals** - Safe-Area + dvh

### Priorität 2 (Wichtig):
5. **Email Widget** - Adresse + Controls gestapelt
6. **Multi-File Preview** - Vereinfachen
7. **Bulk Action Bar** - Grid Layout
8. **Filters** - Horizontal scroll

### Priorität 3 (Nice to have):
9. **Empty State** - Zentrierung
10. **Limit Badge** - Kompakter
11. **Upgrade Section** - Single Column
12. **Section Headers** - Icon-Sizing

---

## Geschätzter Umfang

- **~200-300 Zeilen CSS** zu ändern/ergänzen
- **Keine JSX-Änderungen** notwendig (nur CSS)
- **Bestehende Media Queries** erweitern/korrigieren
- **Duplikat bei 480px** entfernen

## Testgeräte

Nach Implementierung testen auf:
- iPhone SE (375px)
- iPhone 12/13/14 (390px)
- iPhone 12/13/14 Pro Max (428px)
- Samsung Galaxy S21 (360px)
- iPad Mini (768px)
