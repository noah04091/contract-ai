// 📁 src/components/PDFDocumentViewer.tsx
// PDF Viewer mit Text-Highlighting für Optimizer + Compare

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, ZoomIn, ZoomOut, ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// PDF.js Worker Setup
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

// Shared stopwords for search + highlighting
const STOPWORDS = new Set([
  'der', 'die', 'das', 'den', 'dem', 'des', 'ein', 'eine', 'einer', 'eines',
  'und', 'oder', 'aber', 'wenn', 'dann', 'weil', 'dass', 'daß',
  'ist', 'sind', 'war', 'wird', 'werden', 'wurde', 'wurden', 'sein', 'haben', 'hat', 'hatte',
  'kann', 'können', 'soll', 'sollen', 'muss', 'müssen', 'darf', 'dürfen',
  'am', 'im', 'an', 'in', 'um', 'zum', 'zur', 'auf', 'bei', 'nach', 'vor', 'aus',
  'über', 'unter', 'durch', 'gegen', 'ohne', 'mit', 'für', 'als', 'bis', 'von',
  'sich', 'nicht', 'auch', 'noch', 'nur', 'schon', 'sehr', 'mehr', 'bereits',
  'sowie', 'soweit', 'sofern', 'jedoch', 'daher', 'dabei', 'hierzu', 'hierbei',
  'vertrag', 'vertrags', 'verträge', 'kaufvertrag', 'mietvertrag', 'arbeitsvertrag',
  'vereinbarung', 'anlage', 'anlagen', 'paragraph', 'absatz', 'satz', 'ziffer',
  'artikel', 'seite', 'datum', 'unterschrift', 'parteien', 'partei'
]);

interface PDFDocumentViewerProps {
  file: File | null;
  highlightText?: string | null;
  renderAllPages?: boolean; // Alle Seiten untereinander statt Einzelseiten-Navigation
}

export const PDFDocumentViewer: React.FC<PDFDocumentViewerProps> = ({
  file,
  highlightText,
  renderAllPages = false,
}) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(renderAllPages ? 0.8 : 1.2);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [foundOnPage, setFoundOnPage] = useState<number | null>(null);
  const [isTextSnippetOpen, setIsTextSnippetOpen] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const highlightRef = useRef<string | null>(null);
  const pdfDocumentRef = useRef<PDFDocumentProxy | null>(null);
  const pageRefsMap = useRef<Map<number, HTMLDivElement>>(new Map());

  // Reset when file changes
  useEffect(() => {
    setPageNumber(1);
    setFoundOnPage(null);
    pageRefsMap.current.clear();
  }, [file]);

  // Handle highlighting when highlightText changes
  useEffect(() => {
    if (highlightText && highlightText !== highlightRef.current) {
      highlightRef.current = highlightText;
      if (pdfDocumentRef.current) {
        searchAndHighlight(highlightText);
      }
    }
  }, [highlightText]);

  // Auto-scroll to found page in all-pages mode
  useEffect(() => {
    if (!renderAllPages || !foundOnPage) return;
    // Small delay to let pages render
    const timer = setTimeout(() => {
      const pageEl = pageRefsMap.current.get(foundOnPage);
      if (pageEl && scrollContainerRef.current) {
        pageEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [renderAllPages, foundOnPage, numPages]);

  // 3-tier highlighting logic for a single textLayer element
  const applyHighlightsToLayer = useCallback((textLayer: Element, searchText: string): boolean => {
    try {
      const spans = Array.from(textLayer.querySelectorAll('span'));
      if (spans.length === 0) return false;

      const spanEntries: { span: Element; start: number; end: number }[] = [];
      let fullText = '';
      spans.forEach((span) => {
        const text = span.textContent || '';
        const start = fullText.length;
        fullText += text;
        spanEntries.push({ span, start, end: fullText.length });
        fullText += ' ';
      });

      const fullTextLower = fullText.toLowerCase();
      const searchLower = searchText.toLowerCase().trim();

      const highlightRange = (matchStart: number, matchEnd: number): number => {
        let count = 0;
        spanEntries.forEach(({ span, start, end }) => {
          if (start < matchEnd && end > matchStart) {
            span.classList.add('pdf-highlight');
            count++;
          }
        });
        return count;
      };

      // Strategie 1: Exakter Substring-Match
      const exactIdx = fullTextLower.indexOf(searchLower);
      if (exactIdx !== -1) {
        return highlightRange(exactIdx, exactIdx + searchLower.length) > 0;
      }

      // Strategie 2: Flexibler Match (Whitespace-Unterschiede)
      try {
        const escaped = searchLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const flexPattern = escaped.replace(/\s+/g, '\\s+');
        const regex = new RegExp(flexPattern);
        const match = regex.exec(fullTextLower);
        if (match) {
          return highlightRange(match.index, match.index + match[0].length) > 0;
        }
      } catch { /* weiter zu Strategie 3 */ }

      // Strategie 3: Sliding Window Keyword-Match
      const keywords = searchLower
        .split(/[\s,.:;!?()"'„"°§€%\d]+/)
        .filter(word => word.length >= 5 && !STOPWORDS.has(word))
        .slice(0, 12);

      if (keywords.length === 0) return false;

      const spanScores = spans.map((span) => {
        const text = (span.textContent || '').toLowerCase();
        let score = 0;
        keywords.forEach(kw => { if (text.includes(kw)) score++; });
        return score;
      });

      const windowSize = Math.min(Math.max(10, keywords.length * 3), spans.length);
      let bestStart = 0;
      let bestScore = 0;
      let currentScore = 0;
      for (let i = 0; i < windowSize; i++) currentScore += spanScores[i];
      bestScore = currentScore;

      for (let i = 1; i <= spans.length - windowSize; i++) {
        currentScore -= spanScores[i - 1];
        currentScore += spanScores[i + windowSize - 1];
        if (currentScore > bestScore) {
          bestScore = currentScore;
          bestStart = i;
        }
      }

      if (bestScore < keywords.length * 0.3) return false;

      let count = 0;
      for (let i = bestStart; i < bestStart + windowSize && i < spans.length; i++) {
        if (spanScores[i] > 0) {
          spans[i].classList.add('pdf-highlight');
          count++;
        }
      }
      return count > 0;
    } catch {
      return false;
    }
  }, []);

  // Apply yellow highlighting to text spans in TextLayer
  useEffect(() => {
    if (!highlightText) return;

    const applyHighlights = () => {
      const container = containerRef.current;
      if (!container) return false;

      // Scope query to our container to avoid cross-component interference
      const textLayers = Array.from(container.querySelectorAll('.react-pdf__Page__textContent'));
      if (textLayers.length === 0) return false;

      // Clear old highlights
      textLayers.forEach(tl => tl.querySelectorAll('.pdf-highlight').forEach(el => el.classList.remove('pdf-highlight')));

      // Apply to each text layer
      let anyFound = false;
      for (const tl of textLayers) {
        if (applyHighlightsToLayer(tl, highlightText)) {
          anyFound = true;
          // In single-page mode, one match is enough
          if (!renderAllPages) break;
        }
      }
      return anyFound;
    };

    const delays = renderAllPages ? [400, 800, 1500, 2500] : [200, 500, 800, 1200];
    const timeouts: NodeJS.Timeout[] = [];

    delays.forEach((delay) => {
      const timeoutId = setTimeout(() => {
        const success = applyHighlights();
        if (success) {
          timeouts.forEach(t => clearTimeout(t));
        }
      }, delay);
      timeouts.push(timeoutId);
    });

    return () => { timeouts.forEach(t => clearTimeout(t)); };
  }, [highlightText, foundOnPage, pageNumber, numPages, renderAllPages, applyHighlightsToLayer]);

  const onDocumentLoadSuccess = (pdf: PDFDocumentProxy) => {
    setNumPages(pdf.numPages);
    pdfDocumentRef.current = pdf;
    console.log(`📄 PDF geladen: ${pdf.numPages} Seiten${renderAllPages ? ' (alle Seiten)' : ''}`);

    if (highlightText) {
      searchAndHighlight(highlightText);
    }
  };

  const onDocumentLoadError = (error: Error) => {
    console.error('❌ PDF Lade-Fehler:', error);
  };

  // Text-Suche: Finde die Seite mit dem gesuchten Text
  const searchAndHighlight = async (searchText: string) => {
    if (!searchText || !pdfDocumentRef.current) return;

    setIsSearching(true);
    setFoundOnPage(null);

    try {
      const pdf = pdfDocumentRef.current;
      const searchLower = searchText.toLowerCase().trim();

      const keywords = searchLower
        .split(/[\s,.:;!?()"'„"°§€%\d]+/)
        .filter(word => word.length >= 5 && !STOPWORDS.has(word))
        .slice(0, 8);

      if (keywords.length === 0) {
        setFoundOnPage(1);
        if (!renderAllPages) setPageNumber(1);
        setIsSearching(false);
        return;
      }

      // Exakte Suche
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item) => ('str' in item ? item.str : ''))
          .join(' ')
          .toLowerCase();

        if (pageText.includes(searchLower)) {
          setFoundOnPage(pageNum);
          if (!renderAllPages) setPageNumber(pageNum);
          setIsSearching(false);
          return;
        }
      }

      // Fuzzy Keyword-Search
      let bestMatch: { pageNum: number; score: number } | null = null;
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item) => ('str' in item ? item.str : ''))
          .join(' ')
          .toLowerCase();

        let matchCount = 0;
        keywords.forEach(keyword => { if (pageText.includes(keyword)) matchCount++; });

        const requiredMatches = Math.max(2, Math.ceil(keywords.length * 0.5));
        if (matchCount >= requiredMatches) {
          if (!bestMatch || matchCount > bestMatch.score) {
            bestMatch = { pageNum, score: matchCount };
          }
        }
      }

      if (bestMatch) {
        setFoundOnPage(bestMatch.pageNum);
        if (!renderAllPages) setPageNumber(bestMatch.pageNum);
        setIsSearching(false);
        return;
      }

      // Fallback
      setFoundOnPage(1);
      if (!renderAllPages) setPageNumber(1);
      setIsSearching(false);
    } catch (error) {
      console.error('❌ Fehler beim Suchen:', error);
      setFoundOnPage(1);
      if (!renderAllPages) setPageNumber(1);
      setIsSearching(false);
    }
  };

  const changePage = (offset: number) => {
    setPageNumber(prev => Math.min(Math.max(1, prev + offset), numPages));
  };

  const changeScale = (delta: number) => {
    setScale(prev => Math.min(Math.max(0.5, prev + delta), 3));
  };

  const setPageRef = useCallback((pageNum: number, el: HTMLDivElement | null) => {
    if (el) pageRefsMap.current.set(pageNum, el);
    else pageRefsMap.current.delete(pageNum);
  }, []);

  if (!file) {
    return (
      <div style={{
        background: '#F5F5F7',
        borderRadius: '16px',
        padding: '60px 20px',
        textAlign: 'center',
        border: '2px dashed rgba(0, 0, 0, 0.1)'
      }}>
        <FileText size={48} style={{ color: '#86868B', margin: '0 auto 16px' }} />
        <p style={{ color: '#86868B', fontSize: '14px', margin: 0 }}>
          Kein Dokument geladen
        </p>
      </div>
    );
  }

  const pageLoadingPlaceholder = (
    <div style={{
      width: '595px',
      height: '842px',
      background: '#FFFFFF',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: '8px',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
    }}>
      <p style={{ color: '#86868B', fontSize: '14px' }}>Seite wird geladen...</p>
    </div>
  );

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      style={{
        background: '#FFFFFF',
        borderRadius: '16px',
        border: '1px solid rgba(0, 0, 0, 0.08)',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
        overflow: 'hidden'
      }}
    >
      {/* Header mit Controls */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
        background: '#FAFAFA'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <FileText size={18} style={{ color: '#007AFF' }} />
          <span style={{
            fontSize: '13px',
            fontWeight: 600,
            color: '#1D1D1F',
            letterSpacing: '-0.01em'
          }}>
            {renderAllPages ? `${numPages || '...'} Seiten` : 'Dokument-Vorschau'}
          </span>
          {highlightText && (
            <button
              onClick={() => setIsTextSnippetOpen(!isTextSnippetOpen)}
              style={{
                fontSize: '11px',
                fontWeight: 600,
                color: isSearching ? '#007AFF' : foundOnPage ? '#34C759' : '#FF9500',
                background: isSearching ? 'rgba(0, 122, 255, 0.1)' : foundOnPage ? 'rgba(52, 199, 89, 0.1)' : 'rgba(255, 149, 0, 0.1)',
                padding: '3px 7px',
                borderRadius: '6px',
                letterSpacing: '0.3px',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                transition: 'all 0.2s'
              }}
              title="Klicken um gesuchten Text anzuzeigen"
            >
              {isSearching ? '🔍 Suche...' : foundOnPage ? `✅ Seite ${foundOnPage}` : '📍 Markiert'}
              {!isSearching && (
                isTextSnippetOpen ? <ChevronUp size={11} /> : <ChevronDown size={11} />
              )}
            </button>
          )}
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          {/* Zoom Controls */}
          <button
            onClick={() => changeScale(-0.2)}
            disabled={scale <= 0.5}
            style={{
              padding: '5px 8px',
              border: '1px solid rgba(0, 0, 0, 0.1)',
              borderRadius: '6px',
              background: scale <= 0.5 ? '#F5F5F7' : '#FFFFFF',
              cursor: scale <= 0.5 ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              transition: 'all 0.2s'
            }}
          >
            <ZoomOut size={14} style={{ color: scale <= 0.5 ? '#C7C7CC' : '#1D1D1F' }} />
          </button>

          <span style={{
            fontSize: '12px',
            fontWeight: 500,
            color: '#86868B',
            minWidth: '40px',
            textAlign: 'center'
          }}>
            {Math.round(scale * 100)}%
          </span>

          <button
            onClick={() => changeScale(0.2)}
            disabled={scale >= 3}
            style={{
              padding: '5px 8px',
              border: '1px solid rgba(0, 0, 0, 0.1)',
              borderRadius: '6px',
              background: scale >= 3 ? '#F5F5F7' : '#FFFFFF',
              cursor: scale >= 3 ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              transition: 'all 0.2s'
            }}
          >
            <ZoomIn size={14} style={{ color: scale >= 3 ? '#C7C7CC' : '#1D1D1F' }} />
          </button>

          {/* Page Navigation — nur im Einzelseiten-Modus */}
          {!renderAllPages && (
            <>
              <div style={{
                width: '1px',
                height: '20px',
                background: 'rgba(0, 0, 0, 0.1)',
                margin: '0 2px'
              }} />

              <button
                onClick={() => changePage(-1)}
                disabled={pageNumber <= 1}
                style={{
                  padding: '5px 8px',
                  border: '1px solid rgba(0, 0, 0, 0.1)',
                  borderRadius: '6px',
                  background: pageNumber <= 1 ? '#F5F5F7' : '#FFFFFF',
                  cursor: pageNumber <= 1 ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  transition: 'all 0.2s'
                }}
              >
                <ChevronLeft size={14} style={{ color: pageNumber <= 1 ? '#C7C7CC' : '#1D1D1F' }} />
              </button>

              <span style={{
                fontSize: '12px',
                fontWeight: 500,
                color: '#1D1D1F',
                minWidth: '60px',
                textAlign: 'center'
              }}>
                {pageNumber} / {numPages || '...'}
              </span>

              <button
                onClick={() => changePage(1)}
                disabled={pageNumber >= numPages}
                style={{
                  padding: '5px 8px',
                  border: '1px solid rgba(0, 0, 0, 0.1)',
                  borderRadius: '6px',
                  background: pageNumber >= numPages ? '#F5F5F7' : '#FFFFFF',
                  cursor: pageNumber >= numPages ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  transition: 'all 0.2s'
                }}
              >
                <ChevronRight size={14} style={{ color: pageNumber >= numPages ? '#C7C7CC' : '#1D1D1F' }} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Highlight-Text Dropdown */}
      <AnimatePresence>
        {highlightText && isTextSnippetOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            style={{
              background: 'linear-gradient(135deg, rgba(255, 204, 0, 0.15) 0%, rgba(255, 149, 0, 0.15) 100%)',
              border: '2px solid #FFCC00',
              borderLeft: '4px solid #FF9500',
              padding: '12px 16px',
              margin: '0 16px',
              borderRadius: '0 0 10px 10px',
              boxShadow: '0 4px 12px rgba(255, 149, 0, 0.2)',
              overflow: 'hidden'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <div style={{
                background: '#FFCC00',
                borderRadius: '50%',
                padding: '5px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <FileText size={14} style={{ color: '#1D1D1F' }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#1D1D1F', marginBottom: '4px' }}>
                  Gesuchte Stelle:
                </div>
                <div style={{
                  fontSize: '11px',
                  color: '#1D1D1F',
                  lineHeight: '1.4',
                  background: 'rgba(255, 255, 255, 0.7)',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  fontFamily: 'monospace',
                  maxHeight: '60px',
                  overflowY: 'auto',
                  border: '1px solid rgba(255, 149, 0, 0.3)'
                }}>
                  {highlightText}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PDF Content */}
      <div
        ref={scrollContainerRef}
        style={{
          padding: renderAllPages ? '12px' : '20px',
          background: '#F5F5F7',
          maxHeight: renderAllPages ? 'none' : '800px',
          overflowY: renderAllPages ? 'visible' : 'auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: renderAllPages ? '8px' : undefined,
        }}
      >
        <Document
          file={file}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={onDocumentLoadError}
          loading={
            <div style={{ textAlign: 'center', padding: '40px', color: '#86868B' }}>
              <div style={{
                width: '36px', height: '36px',
                border: '3px solid #E5E5E7', borderTop: '3px solid #007AFF',
                borderRadius: '50%', margin: '0 auto 12px',
                animation: 'spin 1s linear infinite'
              }} />
              <p style={{ fontSize: '13px', margin: 0 }}>PDF wird geladen...</p>
            </div>
          }
        >
          {renderAllPages ? (
            // Alle Seiten untereinander
            Array.from({ length: numPages }, (_, i) => {
              const pNum = i + 1;
              return (
                <div
                  key={pNum}
                  ref={(el) => setPageRef(pNum, el)}
                  style={{ position: 'relative' }}
                >
                  {/* Seitennummer-Label */}
                  <div style={{
                    textAlign: 'center',
                    fontSize: '10px',
                    color: '#86868B',
                    padding: '4px 0 2px',
                    fontWeight: 500,
                  }}>
                    Seite {pNum}
                  </div>
                  <Page
                    pageNumber={pNum}
                    scale={scale}
                    renderTextLayer={true}
                    renderAnnotationLayer={false}
                    loading={pageLoadingPlaceholder}
                  />
                </div>
              );
            })
          ) : (
            // Einzelseiten-Modus (bestehend)
            <Page
              pageNumber={pageNumber}
              scale={scale}
              renderTextLayer={true}
              renderAnnotationLayer={false}
              loading={pageLoadingPlaceholder}
            />
          )}
        </Document>
      </div>

      {/* Styles */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .react-pdf__Page__textContent span {
          color: transparent !important;
          background: transparent !important;
        }

        .react-pdf__Page__textContent span.pdf-highlight {
          color: transparent !important;
          background: rgba(255, 235, 59, 0.5) !important;
          border-radius: 2px !important;
          box-shadow: 0 0 0 2px rgba(255, 204, 0, 0.3) !important;
          mix-blend-mode: multiply !important;
        }
      `}</style>
    </motion.div>
  );
};

export default PDFDocumentViewer;
