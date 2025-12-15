# Contract AI: Vertragsbaukastensystem
## Enterprise-Konzeptdokument v1.0

---

# Executive Summary

Das **Vertragsbaukastensystem** (Codename: **ContractForge**) revolutioniert die Art, wie Verträge erstellt werden. Inspiriert von den intuitiven Rechnungs-Buildern wie LexOffice, Canva und Notion, kombiniert ContractForge die Flexibilität eines visuellen Drag&Drop-Editors mit der Intelligenz von KI-gestützter Textgenerierung.

**Vision:** Jeder Nutzer - vom Freelancer bis zum Konzern - soll in der Lage sein, professionelle, rechtssichere Verträge so einfach zu erstellen wie eine PowerPoint-Präsentation.

---

# Teil 1: Strategische Positionierung

## 1.1 Marktanalyse & Differenzierung

### Aktueller Stand Contract AI Generator:
| Aspekt | Ist-Zustand | Bewertung |
|--------|-------------|-----------|
| Vertragstypen | 12 vordefinierte | ✅ Gut |
| Design-Varianten | 11 Themes | ✅ Gut |
| Textgenerierung | GPT-4 mit Meta-Prompts | ✅ Exzellent |
| Anpassbarkeit | Formular-basiert | ⚠️ Limitiert |
| Visuelle Kontrolle | Minimal | ❌ Verbesserungspotenzial |
| Layout-Flexibilität | 5 Presets | ❌ Stark limitiert |

### ContractForge Zielzustand:
| Aspekt | Ziel-Zustand | Innovation |
|--------|--------------|------------|
| Vertragstypen | Unbegrenzt (Baukasten) | 🚀 |
| Design-Kontrolle | Pixel-perfekt | 🚀 |
| Textgenerierung | KI + Manuelle Bausteine | 🚀 |
| Anpassbarkeit | Vollständig visuell | 🚀 |
| Layout-Flexibilität | Drag & Drop | 🚀 |
| Templates | Community-Marketplace | 🚀 |

## 1.2 Wettbewerber-Vergleich

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        FEATURE-MATRIX                                        │
├─────────────────┬───────────┬───────────┬───────────┬──────────────────────┤
│                 │ LexOffice │ Lawlift   │ Juro      │ ContractForge (Neu)  │
├─────────────────┼───────────┼───────────┼───────────┼──────────────────────┤
│ Visual Editor   │    ✓      │    ✗      │    ✓      │         ✓✓           │
│ Drag & Drop     │    ✓      │    ✗      │    ✗      │         ✓✓           │
│ KI-Generierung  │    ✗      │    ✓      │    ✗      │         ✓✓           │
│ Klausel-Bib.    │    ✗      │    ✓      │    ✓      │         ✓✓           │
│ Custom Layouts  │    ✗      │    ✗      │    ✗      │         ✓✓           │
│ Deutsche Rechts │    ✓      │    ✓      │    ✗      │         ✓✓           │
│ Echtzeit-Preview│    ✓      │    ✗      │    ✓      │         ✓✓           │
│ Preismodell     │  €€€      │  €€€€     │  €€€€€    │         €€           │
└─────────────────┴───────────┴───────────┴───────────┴──────────────────────┘
```

---

# Teil 2: Produktkonzept

## 2.1 Die Drei Säulen von ContractForge

```
                    ┌─────────────────────────────────────┐
                    │         CONTRACTFORGE               │
                    │     Vertragsbaukastensystem         │
                    └─────────────────────────────────────┘
                                    │
          ┌─────────────────────────┼─────────────────────────┐
          │                         │                         │
          ▼                         ▼                         ▼
┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐
│   VISUAL STUDIO     │  │   CONTENT ENGINE    │  │   SMART LIBRARY     │
│                     │  │                     │  │                     │
│ • Drag & Drop       │  │ • KI-Textgenerierung│  │ • Klausel-Bibliothek│
│ • WYSIWYG Editor    │  │ • Variablen-System  │  │ • Template-Markt    │
│ • Design Controls   │  │ • Kontext-Analyse   │  │ • Versions-History  │
│ • Real-time Preview │  │ • Mehrsprachigkeit  │  │ • Kollaboration     │
└─────────────────────┘  └─────────────────────┘  └─────────────────────┘
```

## 2.2 Kernkonzepte

### 2.2.1 Das Block-System

Verträge bestehen aus **Blöcken** - modularen, wiederverwendbaren Einheiten:

```typescript
type BlockType =
  | 'header'           // Vertragskopf
  | 'parties'          // Vertragsparteien
  | 'preamble'         // Präambel
  | 'clause'           // Standardklausel
  | 'numbered-list'    // Nummerierte Aufzählung
  | 'table'            // Tabelle (z.B. Preise)
  | 'signature'        // Unterschriftenblock
  | 'attachment'       // Anlagen-Verweis
  | 'date-field'       // Datumsfeld
  | 'variable'         // Dynamische Variable
  | 'divider'          // Trenner
  | 'spacer'           // Abstandshalter
  | 'logo'             // Firmenlogo
  | 'watermark'        // Wasserzeichen
  | 'page-break'       // Seitenumbruch
  | 'custom-html'      // Freies HTML (Power-User)
```

### 2.2.2 Das Variablen-System

```typescript
interface Variable {
  id: string;
  name: string;                    // z.B. "{{vermieter_name}}"
  displayName: string;             // z.B. "Name des Vermieters"
  type: 'text' | 'date' | 'number' | 'currency' | 'select' | 'computed';
  defaultValue?: string;
  validation?: RegExp;
  options?: string[];              // Für Select-Typ
  computeFormula?: string;         // Für berechnete Felder
  linkedClauses: string[];         // Welche Klauseln nutzen diese Variable
}

// Beispiel: Automatische Berechnung
const kautionVariable: Variable = {
  id: 'kaution_betrag',
  name: '{{kaution}}',
  displayName: 'Kaution',
  type: 'computed',
  computeFormula: '{{miete_kalt}} * 3',  // 3 Monatsmieten
  linkedClauses: ['kaution-klausel', 'zahlung-klausel']
};
```

### 2.2.3 Klausel-Intelligenz

Jede Klausel kennt ihren rechtlichen Kontext:

```typescript
interface SmartClause {
  id: string;
  title: string;
  content: string;                    // Mit Variablen-Platzhaltern

  // Rechtlicher Kontext
  legalBasis: string[];               // z.B. ["BGB §535", "BGB §536"]
  applicableContractTypes: string[];  // z.B. ["mietvertrag", "pachtvertrag"]
  jurisdiction: 'DE' | 'AT' | 'CH';

  // Beziehungen
  requires: string[];                 // Muss mit diesen Klauseln kombiniert werden
  excludes: string[];                 // Darf nicht mit diesen kombiniert werden
  suggestedAfter: string[];           // Sollte nach diesen Klauseln kommen

  // KI-Metadaten
  aiGeneratable: boolean;             // Kann KI diese Klausel personalisieren?
  aiPromptHints: string[];            // Hinweise für bessere KI-Generierung

  // Varianten
  variants: ClauseVariant[];          // z.B. Standard, Streng, Mild

  // Risiko-Score
  riskLevel: 'low' | 'medium' | 'high';
  riskDescription?: string;
}
```

---

# Teil 3: User Interface Design

## 3.1 Hauptansicht - Der Visual Editor

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ ◀ Zurück │ Mietvertrag - Wohnung Musterstraße 123      │ [Vorschau] [Speichern] [▼]  │
├────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                        │
│  ┌─────────────┐  ┌───────────────────────────────────────────────────┐  ┌──────────┐ │
│  │             │  │                                                   │  │          │ │
│  │  BLÖCKE     │  │              LIVE-VORSCHAU                        │  │ EIGEN-   │ │
│  │             │  │              ═══════════════                      │  │ SCHAFTEN │ │
│  │ ┌─────────┐ │  │                                                   │  │          │ │
│  │ │📄 Header│ │  │  ┌─────────────────────────────────────────────┐  │  │ Ausge-   │ │
│  │ └─────────┘ │  │  │            MIETVERTRAG                      │  │  │ wählter  │ │
│  │ ┌─────────┐ │  │  │                                             │  │  │ Block:   │ │
│  │ │👥 Partei│ │  │  │  zwischen                                   │  │  │          │ │
│  │ └─────────┘ │  │  │                                             │  │  │ ┌──────┐ │ │
│  │ ┌─────────┐ │  │  │  Max Mustermann                             │  │  │ │Schrift│ │ │
│  │ │📝 Klausel│ │  │  │  - nachfolgend "Vermieter" genannt -        │  │  │ └──────┘ │ │
│  │ └─────────┘ │  │  │                                             │  │  │ ┌──────┐ │ │
│  │ ┌─────────┐ │  │  │  und                                        │  │  │ │Größe │ │ │
│  │ │📊 Tabelle│ │  │  │                                             │  │  │ └──────┘ │ │
│  │ └─────────┘ │  │  │  {{mieter_name}}                             │  │  │ ┌──────┐ │ │
│  │ ┌─────────┐ │  │  │  - nachfolgend "Mieter" genannt -            │  │  │ │Abstand│ │ │
│  │ │✍️ Signatur│ │  │  │                                             │  │  │ └──────┘ │ │
│  │ └─────────┘ │  │  │  § 1 Mietgegenstand                          │  │  │ ┌──────┐ │ │
│  │ ┌─────────┐ │  │  │  ══════════════════                          │  │  │ │Farbe │ │ │
│  │ │📎 Anlage│ │  │  │                                             │  │  │ └──────┘ │ │
│  │ └─────────┘ │  │  │  Der Vermieter vermietet dem Mieter zum      │  │  │          │ │
│  │             │  │  │  Zwecke der Nutzung als Wohnung folgende     │  │  │ [KI ✨]  │ │
│  │ ──────────  │  │  │  Räume...                                    │  │  │ Klausel  │ │
│  │             │  │  │                                             │  │  │ optimieren│ │
│  │ 🧠 KI-HILFE │  │  └─────────────────────────────────────────────┘  │  │          │ │
│  │ ┌─────────┐ │  │                                                   │  │          │ │
│  │ │Generate │ │  │  Seite 1 von 4                    [◀] [▶]         │  │          │ │
│  │ │ Klausel │ │  │                                                   │  │          │ │
│  │ └─────────┘ │  │                                                   │  │          │ │
│  │ ┌─────────┐ │  └───────────────────────────────────────────────────┘  │          │ │
│  │ │Complete │ │                                                         │          │ │
│  │ │Contract │ │                                                         │          │ │
│  │ └─────────┘ │                                                         └──────────┘ │
│  └─────────────┘                                                                      │
│                                                                                        │
│  ┌──────────────────────────────────────────────────────────────────────────────────┐ │
│  │ VARIABLEN   │ {{mieter_name}}: _______ │ {{miete}}: _______ │ {{datum}}: _______ │ │
│  └──────────────────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

## 3.2 Block-Palette (Linke Sidebar)

### Kategorie-Organisation:

```
┌─────────────────────────────────────┐
│         BLOCK-PALETTE               │
├─────────────────────────────────────┤
│                                     │
│  🔍 Suche...                        │
│                                     │
│  ▼ GRUNDSTRUKTUR                    │
│    ┌───────┐ ┌───────┐ ┌───────┐    │
│    │ 📄    │ │ 👥    │ │ 📋    │    │
│    │Header │ │Parteien│ │Präambel│   │
│    └───────┘ └───────┘ └───────┘    │
│    ┌───────┐ ┌───────┐ ┌───────┐    │
│    │ ✍️    │ │ 📎    │ │ 📅    │    │
│    │Signatur│ │Anlagen│ │ Datum │    │
│    └───────┘ └───────┘ └───────┘    │
│                                     │
│  ▼ KLAUSELN                         │
│    ┌───────┐ ┌───────┐ ┌───────┐    │
│    │ §     │ │ §     │ │ §     │    │
│    │Standard│ │Komplex│ │Tabelle│    │
│    └───────┘ └───────┘ └───────┘    │
│                                     │
│  ▼ LAYOUT-ELEMENTE                  │
│    ┌───────┐ ┌───────┐ ┌───────┐    │
│    │ ──    │ │ ↕️    │ │ ⏎    │    │
│    │Trenner│ │Abstand│ │Umbruch│    │
│    └───────┘ └───────┘ └───────┘    │
│                                     │
│  ▼ INHALTE                          │
│    ┌───────┐ ┌───────┐ ┌───────┐    │
│    │ 📊    │ │ 🖼️    │ │ 📝    │    │
│    │Tabelle│ │ Logo  │ │ Liste │    │
│    └───────┘ └───────┘ └───────┘    │
│                                     │
│  ▼ KI-ASSISTENZ                     │
│    ┌─────────────────────────────┐  │
│    │  🧠 Klausel generieren      │  │
│    │                             │  │
│    │  Beschreiben Sie, was die   │  │
│    │  Klausel regeln soll...     │  │
│    │  ┌───────────────────────┐  │  │
│    │  │                       │  │  │
│    │  └───────────────────────┘  │  │
│    │  [✨ Generieren]            │  │
│    └─────────────────────────────┘  │
│                                     │
│  ▼ KLAUSEL-BIBLIOTHEK               │
│    ├─ Zahlungsbedingungen           │
│    ├─ Kündigungsklauseln            │
│    ├─ Haftungsbeschränkungen        │
│    ├─ Geheimhaltung                 │
│    ├─ Datenschutz (DSGVO)           │
│    ├─ Gewährleistung                │
│    ├─ Salvatorische Klausel         │
│    └─ + Mehr anzeigen...            │
│                                     │
└─────────────────────────────────────┘
```

## 3.3 Eigenschaften-Panel (Rechte Sidebar)

### Für einen Klausel-Block:

```
┌─────────────────────────────────────┐
│         EIGENSCHAFTEN               │
├─────────────────────────────────────┤
│                                     │
│  📝 § 3 Mietzins                    │
│                                     │
│  ─────────────────────────────────  │
│                                     │
│  ALLGEMEIN                          │
│  ┌─────────────────────────────────┐│
│  │ Titel                           ││
│  │ [Mietzins und Nebenkosten    ]  ││
│  └─────────────────────────────────┘│
│  ┌─────────────────────────────────┐│
│  │ Paragraphen-Nr.   [Auto ▼]      ││
│  └─────────────────────────────────┘│
│                                     │
│  ─────────────────────────────────  │
│                                     │
│  TYPOGRAFIE                         │
│  ┌───────────────────────┐          │
│  │ Titel-Schrift         │          │
│  │ [Helvetica Bold  ▼]   │          │
│  │ Größe: [14px] │ ─●─── │          │
│  └───────────────────────┘          │
│  ┌───────────────────────┐          │
│  │ Text-Schrift          │          │
│  │ [Helvetica     ▼]     │          │
│  │ Größe: [11px] │ ──●── │          │
│  │ Zeilenhöhe:   │ ──●── │          │
│  └───────────────────────┘          │
│                                     │
│  FARBEN                             │
│  ┌───────────────────────┐          │
│  │ Titel    [■] #1a1a1a  │          │
│  │ Text     [■] #333333  │          │
│  │ Akzent   [■] #003366  │          │
│  └───────────────────────┘          │
│                                     │
│  ABSTÄNDE                           │
│  ┌───────────────────────┐          │
│  │      [12px]           │          │
│  │  ┌─────────────┐      │          │
│  │  │             │      │          │
│  │ [0]           [0]     │          │
│  │  │             │      │          │
│  │  └─────────────┘      │          │
│  │      [16px]           │          │
│  └───────────────────────┘          │
│                                     │
│  RAHMEN                             │
│  ┌───────────────────────┐          │
│  │ Stil:    [Kein    ▼]  │          │
│  │ Stärke:  [1px]        │          │
│  │ Farbe:   [■] #e5e5e5  │          │
│  │ Radius:  [0px]        │          │
│  └───────────────────────┘          │
│                                     │
│  ─────────────────────────────────  │
│                                     │
│  RECHTLICHER KONTEXT                │
│  ┌─────────────────────────────────┐│
│  │ ⚖️ BGB §535 Abs. 2              ││
│  │                                 ││
│  │ 💡 Diese Klausel regelt die     ││
│  │    Mietzahlungspflicht.         ││
│  │                                 ││
│  │ ⚠️ Risiko: Niedrig              ││
│  └─────────────────────────────────┘│
│                                     │
│  ─────────────────────────────────  │
│                                     │
│  KI-AKTIONEN                        │
│  ┌─────────────────────────────────┐│
│  │ [✨ Klausel optimieren]         ││
│  │ [🔄 Alternative generieren]     ││
│  │ [📖 Klausel erklären]           ││
│  │ [⚠️ Risiken prüfen]             ││
│  └─────────────────────────────────┘│
│                                     │
└─────────────────────────────────────┘
```

## 3.4 Variablen-Leiste (Untere Leiste)

```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│  VARIABLEN  │ 🔍 Suche │ [+ Neue Variable]                                           │
├──────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  ┌───────────────┐ │
│  │ {{vermieter}}    │  │ {{mieter}}       │  │ {{adresse}}      │  │ {{miete}}     │ │
│  │ ─────────────    │  │ ─────────────    │  │ ─────────────    │  │ ─────────────│ │
│  │ Max Mustermann   │  │ [Eingabe...]     │  │ Musterstr. 123   │  │ 850,00 €     │ │
│  │ ✓ Ausgefüllt     │  │ ○ Erforderlich   │  │ ✓ Ausgefüllt     │  │ ✓ Ausgefüllt │ │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘  └───────────────┘ │
│                                                                                      │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  ┌───────────────┐ │
│  │ {{kaution}}      │  │ {{beginn}}       │  │ {{kuendigung}}   │  │ + 4 weitere  │ │
│  │ ─────────────    │  │ ─────────────    │  │ ─────────────    │  │              │ │
│  │ 🔗 = miete × 3   │  │ 01.01.2025       │  │ 3 Monate         │  │              │ │
│  │ = 2.550,00 €     │  │ ✓ Ausgefüllt     │  │ ✓ Ausgefüllt     │  │              │ │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘  └───────────────┘ │
│                                                                                      │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

---

# Teil 4: Detaillierte Feature-Spezifikation

## 4.1 Visual Studio (Drag & Drop Editor)

### 4.1.1 Drag & Drop System

```typescript
interface DragDropConfig {
  // Drag-Quellen
  sources: {
    blockPalette: true;           // Neue Blöcke aus Palette
    existingBlocks: true;         // Blöcke neu anordnen
    clauseLibrary: true;          // Klauseln aus Bibliothek
    templates: true;              // Komplette Sektionen
  };

  // Drop-Zonen
  dropZones: {
    betweenBlocks: true;          // Zwischen bestehenden Blöcken
    insideContainers: true;       // In Container-Blöcke
    trash: true;                  // Zum Löschen
  };

  // Visuelles Feedback
  feedback: {
    dragPreview: 'ghost';         // Transparente Kopie beim Ziehen
    dropIndicator: 'line';        // Linie zeigt Einfügeposition
    invalidDrop: 'shake';         // Animation bei ungültigem Drop
  };

  // Keyboard Support
  keyboard: {
    moveUp: 'Alt+ArrowUp';
    moveDown: 'Alt+ArrowDown';
    duplicate: 'Ctrl+D';
    delete: 'Delete';
  };
}
```

### 4.1.2 WYSIWYG Text-Editor

Inline-Bearbeitung direkt im Vorschau-Bereich:

```typescript
interface TextEditorFeatures {
  // Basis-Formatierung
  formatting: {
    bold: true;
    italic: true;
    underline: true;
    strikethrough: true;
  };

  // Absätze
  paragraphs: {
    alignment: ['left', 'center', 'right', 'justify'];
    indentation: true;
    lineHeight: [1.0, 1.15, 1.5, 2.0];
    spacing: { before: number; after: number };
  };

  // Listen
  lists: {
    bullet: ['disc', 'circle', 'square'];
    numbered: ['decimal', 'lower-alpha', 'lower-roman', 'upper-alpha'];
    nested: true;
  };

  // Variablen
  variables: {
    insert: true;                 // {{variable}} einfügen
    highlight: true;              // Farbliche Hervorhebung
    autocomplete: true;           // Vorschläge beim Tippen
  };

  // Tabellen
  tables: {
    create: true;
    resize: true;
    merge: true;
    styling: true;
  };
}
```

### 4.1.3 Design-Kontrollen

```typescript
interface DesignControls {
  // Globale Einstellungen
  global: {
    pageSize: 'A4' | 'Letter' | 'Legal';
    orientation: 'portrait' | 'landscape';
    margins: { top: number; right: number; bottom: number; left: number };
    backgroundColor: string;
  };

  // Typografie-System
  typography: {
    fonts: {
      available: ['Helvetica', 'Times New Roman', 'Arial', 'Georgia', 'Roboto', 'Open Sans'];
      custom: true;               // Eigene Fonts hochladen
    };
    scale: {
      h1: { size: number; weight: number; color: string };
      h2: { size: number; weight: number; color: string };
      h3: { size: number; weight: number; color: string };
      body: { size: number; weight: number; color: string };
      small: { size: number; weight: number; color: string };
    };
  };

  // Farb-Palette
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    text: { primary: string; secondary: string; muted: string };
    background: { primary: string; secondary: string };
    border: string;
  };

  // Abstands-System
  spacing: {
    base: number;                 // z.B. 8px
    scale: [0.25, 0.5, 1, 1.5, 2, 3, 4, 6, 8];  // Multiplikatoren
  };
}
```

## 4.2 Content Engine (KI-Textgenerierung)

### 4.2.1 Klausel-Generator

```typescript
interface ClauseGenerator {
  // Input
  input: {
    description: string;          // Was soll die Klausel regeln?
    context: {                    // Kontext aus dem Vertrag
      contractType: string;
      existingClauses: string[];
      variables: Record<string, string>;
    };
    preferences: {
      tone: 'formal' | 'semi-formal' | 'verständlich';
      length: 'kurz' | 'mittel' | 'ausführlich';
      strictness: 'mild' | 'ausgewogen' | 'streng';
    };
  };

  // Output
  output: {
    mainClause: string;
    variants: ClauseVariant[];    // 3 Alternativen
    legalBasis: string[];         // Relevante Gesetze
    riskAnalysis: {
      score: number;
      concerns: string[];
    };
    suggestions: string[];        // Ergänzungsempfehlungen
  };
}

// KI-Prompt Template für Klausel-Generierung
const CLAUSE_GENERATION_PROMPT = `
Du bist ein erfahrener deutscher Vertragsanwalt. Erstelle eine rechtssichere Klausel.

KONTEXT:
- Vertragstyp: {{contractType}}
- Bestehende Klauseln: {{existingClauses}}
- Variablen: {{variables}}

ANFORDERUNG:
{{description}}

PRÄFERENZEN:
- Tonalität: {{tone}}
- Länge: {{length}}
- Strenge: {{strictness}}

Erstelle:
1. Eine Hauptklausel mit klarer Struktur
2. 3 Varianten (mild/ausgewogen/streng)
3. Rechtliche Grundlage mit BGB/HGB-Paragraphen
4. Risiko-Analyse
5. Ergänzungsempfehlungen

Formatiere als JSON.
`;
```

### 4.2.2 Kompletter Vertrags-Generator

```typescript
interface ContractGenerator {
  // Stufe 1: Struktur-Generierung
  generateStructure(input: {
    contractType: string;
    parties: PartyInfo[];
    keyTerms: Record<string, any>;
  }): Promise<ContractStructure>;

  // Stufe 2: Klausel-für-Klausel-Generierung
  generateClause(input: {
    structure: ContractStructure;
    clauseIndex: number;
    userFeedback?: string;
  }): Promise<GeneratedClause>;

  // Stufe 3: Optimierung & Review
  optimizeContract(input: {
    fullContract: string;
    optimizationGoals: ('clarity' | 'fairness' | 'completeness' | 'risk-reduction')[];
  }): Promise<OptimizedContract>;
}
```

### 4.2.3 Smart Autocomplete

```typescript
interface SmartAutocomplete {
  // Kontext-bewusstes Autocomplete
  trigger: {
    afterParagraphTitle: true;    // Nach "§ X Titel"
    onVariableStart: true;        // Nach "{{"
    onKeywords: ['der', 'die', 'das', 'beträgt', 'ist berechtigt'];
  };

  suggestions: {
    // Rechtliche Formulierungen
    legalPhrases: string[];
    // Passende Variablen
    variables: Variable[];
    // Häufige Fortsetzungen
    completions: string[];
    // Klausel-Templates
    clauseTemplates: ClauseTemplate[];
  };

  learning: {
    userPatterns: true;           // Lernt von Benutzer-Eingaben
    contractTypeSpecific: true;   // Spezifisch für Vertragstyp
  };
}
```

## 4.3 Smart Library (Klausel-Bibliothek)

### 4.3.1 Kategorisierung

```typescript
interface ClauseLibrary {
  categories: {
    // Allgemeine Klauseln
    'general': {
      'vertragsgegenstand': Clause[];
      'vertragsparteien': Clause[];
      'praambel': Clause[];
      'definitionen': Clause[];
      'salvatorische-klausel': Clause[];
      'schriftform': Clause[];
      'gerichtsstand': Clause[];
    };

    // Leistungsbezogen
    'performance': {
      'leistungsbeschreibung': Clause[];
      'leistungsumfang': Clause[];
      'leistungszeit': Clause[];
      'abnahme': Clause[];
      'mitwirkungspflichten': Clause[];
    };

    // Finanzen
    'financial': {
      'verguetung': Clause[];
      'zahlungsbedingungen': Clause[];
      'preisanpassung': Clause[];
      'aufrechnung': Clause[];
      'kaution': Clause[];
    };

    // Laufzeit & Beendigung
    'duration': {
      'laufzeit': Clause[];
      'kuendigung': Clause[];
      'ruhezeit': Clause[];
      'verlaengerung': Clause[];
    };

    // Haftung & Risiko
    'liability': {
      'haftungsbeschraenkung': Clause[];
      'freistellung': Clause[];
      'versicherung': Clause[];
      'hoehereGewalt': Clause[];
    };

    // Geistiges Eigentum
    'ip': {
      'nutzungsrechte': Clause[];
      'lizenzen': Clause[];
      'geheimhaltung': Clause[];
      'wettbewerbsverbot': Clause[];
    };

    // Datenschutz
    'privacy': {
      'dsgvo': Clause[];
      'auftragsdatenverarbeitung': Clause[];
      'datensicherheit': Clause[];
    };
  };
}
```

### 4.3.2 Klausel-Varianten-System

```typescript
interface ClauseVariants {
  // Beispiel: Kündigungsklausel
  'kuendigung': {
    standard: {
      name: 'Ausgewogen';
      content: 'Der Vertrag kann von jeder Partei mit einer Frist von {{frist}} zum Monatsende gekündigt werden.';
      favorability: 'neutral';
    };

    mild: {
      name: 'Mieter-freundlich';
      content: 'Der Mieter kann jederzeit mit einer Frist von einem Monat kündigen. Der Vermieter kann nur aus wichtigem Grund kündigen.';
      favorability: 'tenant';
    };

    strict: {
      name: 'Vermieter-freundlich';
      content: 'Eine Kündigung ist erstmals nach Ablauf der Mindestmietdauer von {{mindestdauer}} möglich. Danach gelten die gesetzlichen Fristen.';
      favorability: 'landlord';
    };

    custom: {
      name: 'Benutzerdefiniert';
      content: null;  // User-Input
      favorability: 'custom';
    };
  };
}
```

### 4.3.3 Template-Marketplace

```typescript
interface TemplateMarketplace {
  templates: {
    id: string;
    name: string;
    description: string;
    category: string;

    // Autor-Info
    author: {
      name: string;
      verified: boolean;
      rating: number;
    };

    // Inhalt
    content: {
      structure: ContractStructure;
      clauses: Clause[];
      variables: Variable[];
      design: DesignConfig;
    };

    // Metadaten
    metadata: {
      downloads: number;
      rating: number;
      reviews: Review[];
      lastUpdated: Date;
      legalReview: boolean;       // Von Anwalt geprüft
    };

    // Preismodell
    pricing: {
      type: 'free' | 'premium' | 'subscription';
      price?: number;
    };
  };

  // Funktionen
  actions: {
    browse(): Template[];
    search(query: string): Template[];
    preview(templateId: string): TemplatePreview;
    use(templateId: string): Promise<Contract>;
    rate(templateId: string, rating: number): void;
    publish(template: Template): Promise<void>;
  };
}
```

---

# Teil 5: Technische Architektur

## 5.1 Datenmodell

```typescript
// Hauptentität: Vertragsdokument
interface ContractDocument {
  id: string;
  userId: string;

  // Metadaten
  metadata: {
    name: string;
    description?: string;
    contractType: string;
    status: 'draft' | 'review' | 'final' | 'signed';
    createdAt: Date;
    updatedAt: Date;
    version: number;
  };

  // Struktur
  structure: {
    blocks: Block[];
    variables: Variable[];
    relations: BlockRelation[];
  };

  // Design
  design: {
    preset?: string;
    custom?: DesignConfig;
  };

  // Generierungshistorie
  generations: Generation[];

  // Kollaboration
  collaboration: {
    sharedWith: SharedUser[];
    comments: Comment[];
    changes: ChangeLog[];
  };
}

// Block-Definitionen
interface Block {
  id: string;
  type: BlockType;
  order: number;
  content: BlockContent;
  style: BlockStyle;
  locked: boolean;
  aiGenerated: boolean;
}

interface BlockContent {
  // Je nach Typ unterschiedlich
  header?: {
    title: string;
    subtitle?: string;
    logo?: string;
  };

  parties?: {
    party1: PartyInfo;
    party2: PartyInfo;
  };

  clause?: {
    number: string | 'auto';
    title: string;
    body: string;              // Mit {{variablen}}
    subclauses?: Subclause[];
  };

  table?: {
    headers: string[];
    rows: string[][];
    footer?: string;
  };

  signature?: {
    parties: SignatureField[];
    date: boolean;
    place: boolean;
    witnesses?: number;
  };
}

interface BlockStyle {
  // Typografie
  typography?: {
    fontFamily?: string;
    fontSize?: number;
    fontWeight?: number;
    lineHeight?: number;
    letterSpacing?: number;
    textAlign?: 'left' | 'center' | 'right' | 'justify';
  };

  // Farben
  colors?: {
    text?: string;
    background?: string;
    border?: string;
    accent?: string;
  };

  // Abstände
  spacing?: {
    marginTop?: number;
    marginBottom?: number;
    paddingTop?: number;
    paddingRight?: number;
    paddingBottom?: number;
    paddingLeft?: number;
  };

  // Rahmen
  border?: {
    style?: 'none' | 'solid' | 'dashed' | 'dotted';
    width?: number;
    color?: string;
    radius?: number;
    sides?: ('top' | 'right' | 'bottom' | 'left')[];
  };

  // Spezielle Effekte
  effects?: {
    shadow?: boolean;
    highlight?: boolean;
    opacity?: number;
  };
}
```

## 5.2 API-Endpunkte

```typescript
// Contract Builder API
const API = {
  // Dokument-Management
  documents: {
    create: 'POST /api/contracts/builder/create',
    get: 'GET /api/contracts/builder/:id',
    update: 'PUT /api/contracts/builder/:id',
    delete: 'DELETE /api/contracts/builder/:id',
    list: 'GET /api/contracts/builder',
    duplicate: 'POST /api/contracts/builder/:id/duplicate',
  },

  // Block-Operationen
  blocks: {
    add: 'POST /api/contracts/builder/:id/blocks',
    update: 'PUT /api/contracts/builder/:id/blocks/:blockId',
    delete: 'DELETE /api/contracts/builder/:id/blocks/:blockId',
    reorder: 'PUT /api/contracts/builder/:id/blocks/reorder',
    duplicate: 'POST /api/contracts/builder/:id/blocks/:blockId/duplicate',
  },

  // Variablen
  variables: {
    list: 'GET /api/contracts/builder/:id/variables',
    update: 'PUT /api/contracts/builder/:id/variables',
    validate: 'POST /api/contracts/builder/:id/variables/validate',
  },

  // KI-Funktionen
  ai: {
    generateClause: 'POST /api/contracts/builder/ai/clause',
    optimizeClause: 'POST /api/contracts/builder/ai/optimize',
    explainClause: 'POST /api/contracts/builder/ai/explain',
    analyzeRisk: 'POST /api/contracts/builder/ai/risk',
    autocomplete: 'POST /api/contracts/builder/ai/autocomplete',
    generateContract: 'POST /api/contracts/builder/ai/generate-full',
  },

  // Library
  library: {
    clauses: 'GET /api/library/clauses',
    templates: 'GET /api/library/templates',
    search: 'GET /api/library/search',
  },

  // Export
  export: {
    pdf: 'POST /api/contracts/builder/:id/export/pdf',
    docx: 'POST /api/contracts/builder/:id/export/docx',
    html: 'GET /api/contracts/builder/:id/export/html',
  },
};
```

## 5.3 Frontend-Komponenten-Architektur

```
src/
├── pages/
│   └── ContractBuilder/
│       ├── ContractBuilder.tsx           # Haupt-Container
│       ├── ContractBuilder.module.css
│       └── index.ts
│
├── components/
│   └── ContractBuilder/
│       │
│       ├── Canvas/                        # Zentrale Vorschau
│       │   ├── Canvas.tsx
│       │   ├── CanvasBlock.tsx
│       │   ├── DropZone.tsx
│       │   ├── PageBreak.tsx
│       │   └── ZoomControls.tsx
│       │
│       ├── BlockPalette/                  # Linke Sidebar
│       │   ├── BlockPalette.tsx
│       │   ├── BlockCategory.tsx
│       │   ├── DraggableBlock.tsx
│       │   ├── ClauseLibrary.tsx
│       │   └── AIAssistant.tsx
│       │
│       ├── Properties/                    # Rechte Sidebar
│       │   ├── PropertiesPanel.tsx
│       │   ├── TypographyControls.tsx
│       │   ├── ColorPicker.tsx
│       │   ├── SpacingControls.tsx
│       │   ├── BorderControls.tsx
│       │   └── LegalContext.tsx
│       │
│       ├── Variables/                     # Untere Leiste
│       │   ├── VariablesBar.tsx
│       │   ├── VariableCard.tsx
│       │   ├── VariableEditor.tsx
│       │   └── ComputedVariable.tsx
│       │
│       ├── Blocks/                        # Block-Komponenten
│       │   ├── HeaderBlock.tsx
│       │   ├── PartiesBlock.tsx
│       │   ├── ClauseBlock.tsx
│       │   ├── TableBlock.tsx
│       │   ├── SignatureBlock.tsx
│       │   ├── DividerBlock.tsx
│       │   └── CustomBlock.tsx
│       │
│       ├── Editor/                        # Text-Editor
│       │   ├── InlineEditor.tsx
│       │   ├── Toolbar.tsx
│       │   ├── VariablePopover.tsx
│       │   └── Autocomplete.tsx
│       │
│       ├── Toolbar/                       # Haupt-Toolbar
│       │   ├── MainToolbar.tsx
│       │   ├── UndoRedo.tsx
│       │   ├── ViewToggle.tsx
│       │   └── ExportMenu.tsx
│       │
│       └── shared/
│           ├── DragLayer.tsx
│           ├── ResizeHandle.tsx
│           └── Tooltip.tsx
│
├── hooks/
│   └── ContractBuilder/
│       ├── useContractBuilder.ts          # Haupt-Hook
│       ├── useDragDrop.ts
│       ├── useBlockSelection.ts
│       ├── useVariables.ts
│       ├── useHistory.ts                  # Undo/Redo
│       └── useAutoSave.ts
│
├── stores/
│   └── contractBuilderStore.ts            # Zustand Store
│
├── services/
│   └── contractBuilderAPI.ts
│
└── types/
    └── contractBuilder.ts
```

## 5.4 State Management

```typescript
// Zustand Store für Contract Builder
interface ContractBuilderStore {
  // Dokument
  document: ContractDocument | null;

  // UI State
  ui: {
    selectedBlockId: string | null;
    hoveredBlockId: string | null;
    zoom: number;
    view: 'edit' | 'preview' | 'split';
    sidebarLeft: boolean;
    sidebarRight: boolean;
    variablesBar: boolean;
  };

  // Drag & Drop
  dragDrop: {
    isDragging: boolean;
    draggedItem: DraggedItem | null;
    dropTarget: DropTarget | null;
  };

  // History (Undo/Redo)
  history: {
    past: ContractDocument[];
    future: ContractDocument[];
    canUndo: boolean;
    canRedo: boolean;
  };

  // AI State
  ai: {
    isGenerating: boolean;
    currentOperation: string | null;
    suggestions: Suggestion[];
  };

  // Actions
  actions: {
    // Document
    loadDocument(id: string): Promise<void>;
    saveDocument(): Promise<void>;

    // Blocks
    addBlock(block: Block, position: number): void;
    updateBlock(blockId: string, updates: Partial<Block>): void;
    deleteBlock(blockId: string): void;
    reorderBlocks(fromIndex: number, toIndex: number): void;
    duplicateBlock(blockId: string): void;

    // Selection
    selectBlock(blockId: string | null): void;

    // Variables
    updateVariable(variableId: string, value: any): void;
    addVariable(variable: Variable): void;
    deleteVariable(variableId: string): void;

    // History
    undo(): void;
    redo(): void;

    // AI
    generateClause(prompt: string): Promise<void>;
    optimizeClause(clauseId: string): Promise<void>;
  };
}
```

---

# Teil 6: Benutzer-Workflows

## 6.1 Workflow 1: Komplett neuer Vertrag

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        NEUEN VERTRAG ERSTELLEN                               │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  SCHRITT 1: Ausgangspunkt wählen                                             │
│                                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │             │  │             │  │             │  │             │         │
│  │  🧠 KI      │  │  📋 Template│  │  📄 Vorlage │  │  ✨ Leer    │         │
│  │  Assistent  │  │  Bibliothek │  │  Hochladen  │  │  Starten    │         │
│  │             │  │             │  │             │  │             │         │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘         │
│                                                                              │
│  💡 Empfohlen: KI-Assistent für schnellen Einstieg                          │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    │               │               │
                    ▼               ▼               ▼
         ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
         │ KI-ASSISTENT │ │   TEMPLATE   │ │ LEERER START │
         │              │ │              │ │              │
         │ Beschreiben  │ │ Auswählen    │ │ Block für    │
         │ Sie Ihren    │ │ & Anpassen   │ │ Block        │
         │ Vertrag...   │ │              │ │ aufbauen     │
         └──────────────┘ └──────────────┘ └──────────────┘
                    │               │               │
                    └───────────────┼───────────────┘
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  SCHRITT 2: Im Visual Editor verfeinern                                      │
│                                                                              │
│  • Blöcke hinzufügen, entfernen, umordnen                                   │
│  • Klauseln anpassen oder neu generieren lassen                             │
│  • Design und Styling anpassen                                               │
│  • Variablen ausfüllen                                                       │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  SCHRITT 3: Prüfen & Finalisieren                                            │
│                                                                              │
│  • KI-Risikoanalyse durchführen                                             │
│  • Rechtschreibung & Konsistenz prüfen                                      │
│  • Vorschau aller Seiten                                                     │
│  • Finale Anpassungen                                                        │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  SCHRITT 4: Export & Signatur                                                │
│                                                                              │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐                 │
│  │  PDF      │  │  DOCX     │  │  Signatur │  │  E-Mail   │                 │
│  │  Export   │  │  Export   │  │  anfordern│  │  senden   │                 │
│  └───────────┘  └───────────┘  └───────────┘  └───────────┘                 │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 6.2 Workflow 2: KI-gestützte Klausel-Erstellung

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     KI-KLAUSEL-GENERIERUNG                                   │
└─────────────────────────────────────────────────────────────────────────────┘

User klickt "🧠 Klausel generieren" in der Sidebar
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│  Was soll die Klausel regeln?                                               │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ Eine Klausel zur Regelung der Arbeitszeiten. Der Arbeitnehmer soll   │  │
│  │ flexibel zwischen 7 und 10 Uhr beginnen können, aber eine Kernzeit   │  │
│  │ von 10-15 Uhr einhalten. Überstunden sollen ausgeglichen werden.     │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  Präferenzen:                                                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                          │
│  │ Tonalität   │  │ Länge       │  │ Strenge     │                          │
│  │ [Formal ▼]  │  │ [Mittel ▼]  │  │ [Ausge. ▼] │                          │
│  └─────────────┘  └─────────────┘  └─────────────┘                          │
│                                                                              │
│  [✨ Klausel generieren]                                                     │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│  🎯 GENERIERTE KLAUSEL                                                       │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  § X Arbeitszeit                                                             │
│                                                                              │
│  (1) Die regelmäßige wöchentliche Arbeitszeit beträgt {{arbeitszeit}}        │
│      Stunden, verteilt auf fünf Arbeitstage.                                 │
│                                                                              │
│  (2) Der Arbeitnehmer kann den Arbeitsbeginn flexibel zwischen 7:00 und      │
│      10:00 Uhr wählen. Die Kernarbeitszeit von 10:00 bis 15:00 Uhr ist       │
│      verbindlich einzuhalten.                                                │
│                                                                              │
│  (3) Überstunden sind grundsätzlich durch Freizeitausgleich abzugelten.      │
│      Der Ausgleich soll innerhalb von {{ausgleichsfrist}} erfolgen.          │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  ⚖️ Rechtliche Basis: ArbZG §3, §5                                           │
│  ⚠️ Risiko-Score: Niedrig (0.2)                                              │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                              │
│  📋 VARIANTEN                                                                │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐                    │
│  │ Arbeitnehmer- │  │ Ausgewogen    │  │ Arbeitgeber-  │                    │
│  │ freundlich    │  │ (Angezeigt)   │  │ freundlich    │                    │
│  └───────────────┘  └───────────────┘  └───────────────┘                    │
│                                                                              │
│  [In Vertrag einfügen]  [Bearbeiten]  [Neu generieren]                       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 6.3 Workflow 3: Design-Anpassung

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        DESIGN ANPASSEN                                       │
└─────────────────────────────────────────────────────────────────────────────┘

User klickt auf "Design" in der Haupt-Toolbar
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│  DESIGN-STUDIO                                                               │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                                                                         ││
│  │  PRESETS                                                                ││
│  │  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐      ││
│  │  │Exec │ │Modern│ │Mini │ │Eleg │ │Corp │ │Prof │ │Start│ │Legal│      ││
│  │  │utive│ │     │ │mal  │ │ant  │ │orate│ │     │ │up   │ │     │      ││
│  │  └──●──┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘      ││
│  │                                                                         ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                                                                         ││
│  │  FARBEN                                      TYPOGRAFIE                 ││
│  │  ─────────                                   ───────────                ││
│  │                                                                         ││
│  │  Primär     ┌────┐  #0B1324               Überschriften                 ││
│  │             │████│                         [Helvetica Bold    ▼]        ││
│  │             └────┘                         Größe: 16px                  ││
│  │                                                                         ││
│  │  Sekundär   ┌────┐  #6B7280               Fließtext                     ││
│  │             │████│                         [Helvetica        ▼]        ││
│  │             └────┘                         Größe: 11px                  ││
│  │                                                                         ││
│  │  Akzent     ┌────┐  #D4AF37               Zeilenhöhe: 1.5              ││
│  │             │████│                                                      ││
│  │             └────┘                                                      ││
│  │                                                                         ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                                                                         ││
│  │  LAYOUT                                      ERWEITERT                  ││
│  │  ───────                                     ──────────                 ││
│  │                                                                         ││
│  │  Seitenränder:                              Header auf jeder Seite: ☑   ││
│  │  ┌──────────────────┐                       Seitenzahlen: ☑            ││
│  │  │    Oben: 2.5cm   │                       Position: [Unten Mitte ▼]  ││
│  │  │ L │          │ R │                                                   ││
│  │  │2cm│          │2cm│                       Wasserzeichen: ☐            ││
│  │  │   │          │   │                       [Wasserzeichen hochladen]   ││
│  │  │   Unten: 2cm │   │                                                   ││
│  │  └──────────────────┘                       Hintergrund: ☐              ││
│  │                                                                         ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  [Änderungen anwenden]  [Als Vorlage speichern]  [Zurücksetzen]             │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

# Teil 7: Premium-Features

## 7.1 Feature-Matrix nach Plan

```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│                           CONTRACTFORGE FEATURE-MATRIX                                │
├────────────────────────────────┬────────────┬────────────┬────────────┬─────────────┤
│ Feature                        │   Free     │  Premium   │  Business  │  Legendary  │
├────────────────────────────────┼────────────┼────────────┼────────────┼─────────────┤
│                                │            │            │            │             │
│ VISUAL STUDIO                  │            │            │            │             │
│ ─────────────                  │            │            │            │             │
│ Drag & Drop Editor             │     ✓      │     ✓      │     ✓      │      ✓      │
│ Block-Palette (Basis)          │     ✓      │     ✓      │     ✓      │      ✓      │
│ Design-Presets                 │   3 von 11 │     ✓      │     ✓      │      ✓      │
│ Custom Design Studio           │     ✗      │     ✓      │     ✓      │      ✓      │
│ Logo-Upload                    │     ✗      │     ✓      │     ✓      │      ✓      │
│ Custom Fonts                   │     ✗      │     ✗      │     ✓      │      ✓      │
│                                │            │            │            │             │
│ CONTENT ENGINE                 │            │            │            │             │
│ ──────────────                 │            │            │            │             │
│ KI-Klausel-Generierung         │  3/Monat   │  15/Monat  │  50/Monat  │  Unbegrenzt │
│ Klausel-Optimierung            │     ✗      │     ✓      │     ✓      │      ✓      │
│ Komplette Vertrags-Generierung │  1/Monat   │  5/Monat   │  20/Monat  │  Unbegrenzt │
│ Smart Autocomplete             │     ✗      │     ✓      │     ✓      │      ✓      │
│ Mehrsprachigkeit               │     ✗      │     ✗      │     ✓      │      ✓      │
│                                │            │            │            │             │
│ SMART LIBRARY                  │            │            │            │             │
│ ─────────────                  │            │            │            │             │
│ Klausel-Bibliothek (Basis)     │     ✓      │     ✓      │     ✓      │      ✓      │
│ Erweiterte Klauseln            │     ✗      │     ✓      │     ✓      │      ✓      │
│ Premium Templates              │     ✗      │     ✓      │     ✓      │      ✓      │
│ Eigene Templates speichern     │   Bis 3    │   Bis 20   │  Unbegrenzt│  Unbegrenzt │
│ Team-Bibliothek                │     ✗      │     ✗      │     ✓      │      ✓      │
│ Marketplace-Zugang             │     ✗      │     ✓      │     ✓      │      ✓      │
│                                │            │            │            │             │
│ KOLLABORATION                  │            │            │            │             │
│ ─────────────                  │            │            │            │             │
│ Teilen (View-Only)             │     ✓      │     ✓      │     ✓      │      ✓      │
│ Kommentare                     │     ✗      │     ✓      │     ✓      │      ✓      │
│ Echtzeit-Kollaboration         │     ✗      │     ✗      │     ✓      │      ✓      │
│ Versions-Historie              │  Letzte 5  │  Letzte 20 │  Unbegrenzt│  Unbegrenzt │
│ Änderungsverfolgung            │     ✗      │     ✓      │     ✓      │      ✓      │
│                                │            │            │            │             │
│ EXPORT & SIGNATUR              │            │            │            │             │
│ ────────────────               │            │            │            │             │
│ PDF-Export                     │  Mit Logo  │     ✓      │     ✓      │      ✓      │
│ DOCX-Export                    │     ✗      │     ✓      │     ✓      │      ✓      │
│ Digitale Signatur              │     ✗      │  3/Monat   │  20/Monat  │  Unbegrenzt │
│ E-Mail-Versand                 │     ✗      │     ✓      │     ✓      │      ✓      │
│ API-Zugang                     │     ✗      │     ✗      │     ✓      │      ✓      │
│                                │            │            │            │             │
└────────────────────────────────┴────────────┴────────────┴────────────┴─────────────┘
```

## 7.2 Enterprise-Features

### 7.2.1 Team-Funktionen

```typescript
interface TeamFeatures {
  // Team-Verwaltung
  teamManagement: {
    roles: ['admin', 'editor', 'viewer'];
    permissions: {
      admin: ['all'];
      editor: ['create', 'edit', 'comment', 'export'];
      viewer: ['view', 'comment'];
    };
    invitations: boolean;
    sso: boolean;  // Enterprise
  };

  // Geteilte Ressourcen
  sharedResources: {
    teamTemplates: boolean;
    teamClauseLibrary: boolean;
    brandAssets: boolean;  // Logos, Fonts, Farben
    companyProfile: boolean;
  };

  // Workflows
  workflows: {
    approvalProcess: boolean;
    reviewCycles: boolean;
    notifications: boolean;
    auditLog: boolean;
  };
}
```

### 7.2.2 Compliance & Audit

```typescript
interface ComplianceFeatures {
  // Audit-Trail
  auditTrail: {
    allChanges: boolean;
    userActions: boolean;
    timestamps: boolean;
    ipLogging: boolean;
  };

  // Compliance
  compliance: {
    dsgvo: boolean;
    iso27001: boolean;
    soc2: boolean;
  };

  // Data Retention
  dataRetention: {
    customPolicies: boolean;
    automaticDeletion: boolean;
    exportAll: boolean;
  };
}
```

---

# Teil 8: Implementierungs-Roadmap

## Phase 1: Foundation (MVP)

**Ziel:** Funktionierender Visual Editor mit Basis-Blöcken

```
Kern-Features:
├── Visual Canvas mit Drag & Drop
├── 5 Basis-Blöcke (Header, Parteien, Klausel, Signatur, Spacer)
├── Eigenschaften-Panel für Styling
├── 3 Design-Presets
├── Variablen-System (Basis)
├── PDF-Export
└── Integration mit bestehendem Generator
```

## Phase 2: Content Engine

**Ziel:** KI-Integration und Smart Features

```
KI-Features:
├── Klausel-Generator
├── Klausel-Optimierung
├── Smart Autocomplete
├── Kontext-bewusste Vorschläge
└── Risiko-Analyse
```

## Phase 3: Smart Library

**Ziel:** Umfangreiche Bibliothek und Templates

```
Bibliothek-Features:
├── 100+ vorgefertigte Klauseln
├── 20+ Vertrags-Templates
├── Varianten-System
├── Such- und Filterfunktionen
└── User-Templates speichern
```

## Phase 4: Collaboration & Polish

**Ziel:** Team-Funktionen und UX-Verfeinerung

```
Kollaboration:
├── Echtzeit-Kollaboration
├── Kommentar-System
├── Versions-Historie
├── Team-Verwaltung
└── UX-Optimierungen
```

---

# Teil 9: Technische Anforderungen

## 9.1 Performance-Ziele

| Metrik | Zielwert |
|--------|----------|
| Time to Interactive | < 2s |
| Block Drag Response | < 16ms (60fps) |
| KI-Klausel-Generierung | < 5s |
| PDF-Export | < 3s |
| Autosave Interval | 5s |
| Max Blocks per Document | 500 |
| Max Variables | 100 |

## 9.2 Browser-Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## 9.3 Abhängigkeiten

```json
{
  "core": {
    "react": "^18.2.0",
    "typescript": "^5.0.0",
    "zustand": "^4.0.0"
  },
  "dragDrop": {
    "@dnd-kit/core": "^6.0.0",
    "@dnd-kit/sortable": "^7.0.0"
  },
  "editor": {
    "@tiptap/react": "^2.0.0",
    "@tiptap/starter-kit": "^2.0.0"
  },
  "pdf": {
    "@react-pdf/renderer": "^3.0.0"
  },
  "ui": {
    "framer-motion": "^10.0.0",
    "@radix-ui/react-*": "latest"
  }
}
```

---

# Teil 10: Metriken & Erfolg

## 10.1 KPIs

| KPI | Baseline | Ziel (6 Monate) |
|-----|----------|-----------------|
| Contract Builder Nutzung | 0% | 40% aller User |
| Durchschnittliche Erstellzeit | 45 min | 15 min |
| KI-Klausel-Akzeptanzrate | - | > 70% |
| Template-Nutzung | - | > 50% |
| Premium-Conversion | 8% | 15% |
| User Retention (30d) | 35% | 55% |

## 10.2 User Feedback Loops

- In-App Feedback nach Export
- A/B Testing für UI-Varianten
- Heatmaps für Block-Nutzung
- Session Recordings (mit Consent)

---

# Anhang A: Konkurrenz-Analyse Detail

## LexOffice (Rechnungs-Builder)

**Stärken:**
- Extrem intuitive UI
- Perfekte Mobile-Unterstützung
- Nahtlose Integration

**Anwendbar für ContractForge:**
- Variablen-Karten-Design
- Inline-Editing
- Schnell-Aktionen

## Notion

**Stärken:**
- Block-basierte Architektur
- Slash-Commands
- Keyboard-Navigation

**Anwendbar für ContractForge:**
- Block-Menü bei /
- Drag-Handle Design
- Verschachtelte Blöcke

## Canva

**Stärken:**
- Design-Presets
- Drag from Sidebar
- Template-Bibliothek

**Anwendbar für ContractForge:**
- Design-Presets UI
- Sidebar-Organisation
- Template-Browser

---

# Anhang B: Glossar

| Begriff | Definition |
|---------|------------|
| Block | Modulare Einheit im Vertrag (Klausel, Header, etc.) |
| Klausel | Rechtlicher Paragraph mit spezifischer Regelung |
| Variable | Platzhalter für dynamische Werte ({{name}}) |
| Template | Wiederverwendbare Vertragsvorlage |
| Canvas | Zentrale Arbeitsfläche im Editor |
| Design-Preset | Vordefinierte Kombination aus Farben, Fonts, Layout |

---

# Anhang C: Beispiel-Klauseln

## C.1 Kündigungsklausel (Mietvertrag)

```
§ X Kündigung

(1) Das Mietverhältnis kann von beiden Parteien unter Einhaltung der
    gesetzlichen Kündigungsfristen gemäß § 573c BGB gekündigt werden.

(2) Die Kündigung bedarf der Schriftform. Eine Kündigung per E-Mail
    oder Fax ist ausgeschlossen.

(3) Bei Kündigung durch den Vermieter ist diese zu begründen. Die
    Kündigungsgründe sind im Kündigungsschreiben anzugeben.

(4) Im Falle einer außerordentlichen Kündigung aus wichtigem Grund
    gemäß § 543 BGB ist keine Kündigungsfrist einzuhalten.
```

## C.2 Haftungsklausel (Dienstleistungsvertrag)

```
§ X Haftung

(1) Der Auftragnehmer haftet für Schäden, die er oder seine
    Erfüllungsgehilfen im Rahmen der Vertragserfüllung verursachen,
    nach den gesetzlichen Bestimmungen.

(2) Die Haftung für leichte Fahrlässigkeit wird ausgeschlossen,
    soweit keine wesentlichen Vertragspflichten, Schäden aus der
    Verletzung des Lebens, des Körpers oder der Gesundheit oder
    Garantien betroffen sind.

(3) Die Haftungshöhe ist auf den vertragstypischen, vorhersehbaren
    Schaden begrenzt, maximal jedoch auf {{max_haftung}}.

(4) Die vorstehenden Haftungsbeschränkungen gelten auch zugunsten
    der Erfüllungsgehilfen des Auftragnehmers.
```

---

**Ende des Konzeptdokuments**

*Version 1.0 | Erstellt für Contract AI | Dezember 2024*
