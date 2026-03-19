import { useState, useCallback, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Type, AlignJustify, MousePointer2 } from 'lucide-react';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import styles from '../../styles/LegalLensV2.module.css';

// PDF.js Worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

// German legal abbreviations — don't treat as sentence endings
const GERMAN_LEGAL_ABBREVIATIONS = /\b(Nr|Art|Abs|Ziff|lit|bzw|ca|etc|ggf|inkl|max|min|vgl|gem|ggü|usw|z\.?B|u\.?a|d\.?h|i\.?d\.?R|S|Rn|bez|bspw|lt|zzgl|abzgl|Tel|Fax|Str|Prof|Dr|i\.?V|evtl|einschl|sog|vorgen|nachf|Dipl|Ing|Aufl|Bd|Hrsg|allg|insb|entspr|ff|Fn|Kap|Zl|o\.?g|a\.?a\.?O|m\.?E|m\.?w\.?N|Anm|Anh)\.\s*$/i;

type SelectionMode = 'sentence' | 'paragraph' | 'custom';

interface PdfExplorerViewProps {
  pdfUrl: string | null;
  onTextSelected: (text: string, mode: SelectionMode) => void;
  containerRef: React.RefObject<HTMLDivElement>;
}

export default function PdfExplorerView({
  pdfUrl,
  onTextSelected,
  containerRef
}: PdfExplorerViewProps) {
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(1.2);
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  // Selection mode (persisted in localStorage)
  const [selectionMode, setSelectionMode] = useState<SelectionMode>(() => {
    const saved = localStorage.getItem('legalLensV2_selectionMode');
    return (saved === 'sentence' || saved === 'paragraph' || saved === 'custom') ? saved : 'paragraph';
  });

  // Highlight refs
  const highlightContainerRef = useRef<HTMLDivElement | null>(null);

  const handleDocumentLoad = useCallback(({ numPages: n }: { numPages: number }) => {
    setNumPages(n);
  }, []);

  // ============================================================
  // Mode Change
  // ============================================================

  const handleModeChange = useCallback((mode: SelectionMode) => {
    setSelectionMode(mode);
    if (mode !== 'custom') {
      localStorage.setItem('legalLensV2_selectionMode', mode);
    }
    clearHighlight();
  }, []);

  // ============================================================
  // Highlight System (ported from V1)
  // ============================================================

  const clearHighlight = useCallback(() => {
    if (highlightContainerRef.current) {
      highlightContainerRef.current.remove();
      highlightContainerRef.current = null;
    }
  }, []);

  const createHighlightOverlays = useCallback((spans: HTMLElement[]) => {
    if (spans.length === 0) return;

    const pdfPage = spans[0].closest('.react-pdf__Page') as HTMLElement;
    if (!pdfPage) return;

    // Remove old highlight
    if (highlightContainerRef.current) {
      highlightContainerRef.current.remove();
    }

    const container = document.createElement('div');
    container.className = 'legal-lens-v2-highlight-container';
    container.style.cssText = `
      position: absolute; top: 0; left: 0; width: 100%; height: 100%;
      pointer-events: none; z-index: 1;
    `;

    const pageRect = pdfPage.getBoundingClientRect();

    for (const span of spans) {
      const rect = span.getBoundingClientRect();
      const div = document.createElement('div');
      div.style.cssText = `
        position: absolute;
        left: ${rect.left - pageRect.left}px;
        top: ${rect.top - pageRect.top}px;
        width: ${rect.width}px;
        height: ${rect.height}px;
        background-color: rgba(253, 224, 71, 0.4);
        pointer-events: none;
        border-radius: 2px;
      `;
      container.appendChild(div);
    }

    // Insert BEFORE text layer (so it's behind clickable text)
    const textLayer = pdfPage.querySelector('.react-pdf__Page__textContent');
    if (textLayer) {
      pdfPage.insertBefore(container, textLayer);
    } else {
      pdfPage.appendChild(container);
    }

    highlightContainerRef.current = container;
  }, []);

  // ============================================================
  // PDF Text Click Handler — 3 Selection Modes
  // ============================================================

  const handlePdfTextClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const textContent = target.closest('.react-pdf__Page__textContent');
    if (!textContent) return;

    // ========== FREI-MODUS: Browser-Textauswahl per Drag ==========
    if (selectionMode === 'custom') {
      const selection = window.getSelection();
      const selectedText = selection?.toString().trim() || '';

      if (selectedText.length >= 10) {
        clearHighlight();

        const range = selection?.getRangeAt(0);
        if (range) {
          const allSpans = Array.from(textContent.querySelectorAll('span')) as HTMLElement[];
          const selectedSpans = allSpans.filter(span => range.intersectsNode(span));
          createHighlightOverlays(selectedSpans);
        }

        // Send selected text to parent for on-demand analysis
        onTextSelected(selectedText, 'custom');

        setTimeout(() => selection?.removeAllRanges(), 100);
      }
      return;
    }

    // ========== SATZ & PARAGRAPH MODUS ==========
    if (target.tagName !== 'SPAN') return;

    clearHighlight();

    const allSpans = Array.from(textContent.querySelectorAll('span')) as HTMLElement[];
    const clickedIndex = allSpans.indexOf(target);
    if (clickedIndex === -1) return;

    const spanData = allSpans.map((span, idx) => ({
      span,
      text: (span.textContent || '').normalize('NFC'),
      index: idx
    }));

    let startIdx = clickedIndex;
    let endIdx = clickedIndex;

    // Adaptive windows based on page size
    const totalSpans = allSpans.length;
    const sentenceBackward = Math.min(Math.max(30, Math.floor(totalSpans * 0.05)), 60);
    const sentenceForward = Math.min(Math.max(40, Math.floor(totalSpans * 0.07)), 80);
    const paragraphBackward = Math.min(Math.max(80, Math.floor(totalSpans * 0.15)), 250);
    const paragraphForward = Math.min(Math.max(100, Math.floor(totalSpans * 0.2)), 300);

    // ========== SATZ-MODUS ==========
    if (selectionMode === 'sentence') {
      // Backward: find sentence start
      for (let i = clickedIndex - 1; i >= 0; i--) {
        const text = spanData[i].text;
        if (/[.!?]\s*$/.test(text)) {
          startIdx = i + 1;
          break;
        }
        if (/^(§|Art\.|Artikel|\(\d|\d+\.)/.test(text.trim())) {
          startIdx = i;
          break;
        }
        startIdx = i;
        if (clickedIndex - i > sentenceBackward) break;
      }

      // Forward: find sentence end
      for (let i = clickedIndex; i < allSpans.length; i++) {
        endIdx = i;
        const text = spanData[i].text;
        if (/[.!?]\s*$/.test(text)) {
          if (!GERMAN_LEGAL_ABBREVIATIONS.test(text)) break;
        }
        if (i - clickedIndex > sentenceForward) break;
      }
    }

    // ========== PARAGRAPH-MODUS ==========
    else if (selectionMode === 'paragraph') {
      const isParagraphStart = (text: string): boolean => {
        const trimmed = text.trim();
        return /^(§\s*\d|Art\.?\s*\d|Artikel\s*\d|\d+\.\d*\s+[A-ZÄÖÜ]|[IVX]+\.\s|[A-Z]\)\s|\d+\)\s|[a-z]\)\s|Punkt\s+\d|Abschnitt\s+\d|Teil\s+\d|Ziffer\s+\d|Anlage\s+\d|Anhang\s+\d)/i.test(trimmed);
      };

      // Backward: find paragraph start
      for (let i = clickedIndex - 1; i >= 0; i--) {
        const text = spanData[i].text;
        if (isParagraphStart(text)) {
          startIdx = i;
          break;
        }
        startIdx = i;
        if (clickedIndex - i > paragraphBackward) break;
      }

      // Forward: find paragraph end
      let consecutiveShort = 0;
      for (let i = clickedIndex + 1; i < allSpans.length; i++) {
        const text = spanData[i].text;

        if (text.trim().length < 2) {
          consecutiveShort++;
          if (consecutiveShort >= 3) { endIdx = i - 3; break; }
        } else {
          consecutiveShort = 0;
        }

        if (isParagraphStart(text)) {
          endIdx = i - 1;
          break;
        }

        endIdx = i;
        if (i - clickedIndex > paragraphForward) break;
      }
    }

    // Safety: at least the clicked span
    if (startIdx > clickedIndex) startIdx = clickedIndex;
    if (endIdx < clickedIndex) endIdx = clickedIndex;

    // ========== Collect spans & extract text ==========
    const selectedSpans: HTMLElement[] = [];
    let selectedText = '';

    for (let i = startIdx; i <= endIdx; i++) {
      if (i >= 0 && i < spanData.length) {
        selectedSpans.push(spanData[i].span);
        selectedText += spanData[i].text + ' ';
      }
    }

    selectedText = selectedText.trim().normalize('NFC');

    if (selectedText.length < 10) return;

    // Create yellow highlight
    createHighlightOverlays(selectedSpans);

    // Send selected text to parent for on-demand analysis
    onTextSelected(selectedText, selectionMode);
  }, [selectionMode, onTextSelected, clearHighlight, createHighlightOverlays]);

  const zoomIn = useCallback(() => setScale(s => Math.min(s + 0.2, 3)), []);
  const zoomOut = useCallback(() => setScale(s => Math.max(s - 0.2, 0.5)), []);
  const zoomReset = useCallback(() => setScale(1.2), []);

  if (!pdfUrl) {
    return (
      <div className={styles.pdfExplorer}>
        <div className={styles.pdfExplorerEmpty}>
          Kein PDF verfügbar. Bitte nutzen Sie die Textansicht.
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={styles.pdfExplorer}
    >
      {/* Toolbar: Mode Selector + Zoom */}
      <div className={styles.pdfToolbar}>
        {/* Selection Mode Toggle */}
        <div className={styles.pdfModeGroup}>
          <button
            onClick={() => handleModeChange('sentence')}
            className={`${styles.pdfModeBtn} ${selectionMode === 'sentence' ? styles.pdfModeBtn_active : ''}`}
            title="Satz-Modus: Klick wählt ganzen Satz"
          >
            <Type size={13} />
            Satz
          </button>
          <button
            onClick={() => handleModeChange('paragraph')}
            className={`${styles.pdfModeBtn} ${selectionMode === 'paragraph' ? styles.pdfModeBtn_active : ''}`}
            title="Paragraph-Modus: Klick wählt ganzen §/Absatz"
          >
            <AlignJustify size={13} />
            §
          </button>
          <button
            onClick={() => handleModeChange('custom')}
            className={`${styles.pdfModeBtn} ${selectionMode === 'custom' ? styles.pdfModeBtn_active : ''}`}
            title="Frei-Modus: Text markieren und analysieren"
          >
            <MousePointer2 size={13} />
            Frei
          </button>
        </div>

        <div className={styles.pdfToolbarDivider} />

        {/* Zoom Controls */}
        <div className={styles.pdfZoomGroup}>
          <button onClick={zoomOut} className={styles.pdfZoomBtn} title="Verkleinern">-</button>
          <button onClick={zoomReset} className={styles.pdfZoomBtn} title="Zurücksetzen">
            {Math.round(scale * 100)}%
          </button>
          <button onClick={zoomIn} className={styles.pdfZoomBtn} title="Vergrößern">+</button>
        </div>
      </div>

      {/* PDF Document */}
      <div className={styles.pdfDocumentContainer}>
        <Document
          file={pdfUrl}
          onLoadSuccess={handleDocumentLoad}
          loading={<div className={styles.pdfLoading}>PDF wird geladen...</div>}
          error={<div className={styles.pdfError}>PDF konnte nicht geladen werden</div>}
        >
          {Array.from({ length: numPages }, (_, i) => i + 1).map(pageNum => (
            <div
              key={pageNum}
              className={styles.pdfPageWrapper}
              ref={(el) => { if (el) pageRefs.current.set(pageNum, el); }}
              data-selection-mode={selectionMode}
              onClick={handlePdfTextClick}
            >
              <Page
                pageNumber={pageNum}
                scale={scale}
                renderTextLayer={true}
                renderAnnotationLayer={true}
              />
            </div>
          ))}
        </Document>
      </div>

    </div>
  );
}
