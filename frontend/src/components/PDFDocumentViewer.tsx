// 📁 src/components/PDFDocumentViewer.tsx
// PDF Viewer mit Text-Highlighting für Optimizer

import React, { useState, useRef, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { motion } from 'framer-motion';
import { FileText, ZoomIn, ZoomOut, ChevronLeft, ChevronRight } from 'lucide-react';

// PDF.js Worker Setup
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PDFDocumentViewerProps {
  file: File | null;
  highlightText?: string | null; // Text der highlighted werden soll
  // onTextFound?: (pageNumber: number) => void; // Callback wenn Text gefunden wurde - TODO: Phase 2
}

export const PDFDocumentViewer: React.FC<PDFDocumentViewerProps> = ({
  file,
  highlightText
}) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.2);
  const [showTextLayer, setShowTextLayer] = useState<boolean>(false); // Toggle für TextLayer
  const [isSearching, setIsSearching] = useState<boolean>(false); // Suche läuft
  const [foundOnPage, setFoundOnPage] = useState<number | null>(null); // Seite wo Text gefunden wurde
  const containerRef = useRef<HTMLDivElement>(null);
  const highlightRef = useRef<string | null>(null);
  const pdfDocumentRef = useRef<PDFDocumentProxy | null>(null); // Referenz zum geladenen PDF-Dokument

  // Reset when file changes
  useEffect(() => {
    setPageNumber(1);
  }, [file]);

  // Handle highlighting when highlightText changes
  useEffect(() => {
    if (highlightText && highlightText !== highlightRef.current) {
      highlightRef.current = highlightText;
      searchAndHighlight(highlightText);
    }
  }, [highlightText]);

  // Apply yellow highlighting to text spans in TextLayer (mit Keyword-Support)
  useEffect(() => {
    if (!highlightText || !foundOnPage || !showTextLayer) return;

    // Warte bis TextLayer gerendert ist
    const timeoutId = setTimeout(() => {
      try {
        const textLayer = document.querySelector('.react-pdf__Page__textContent');
        if (!textLayer) {
          console.log('⚠️ TextLayer nicht gefunden im DOM');
          return;
        }

        // Entferne alte Highlights
        const oldHighlights = textLayer.querySelectorAll('.pdf-highlight');
        oldHighlights.forEach(el => el.classList.remove('pdf-highlight'));

        // Finde alle spans im TextLayer
        const spans = textLayer.querySelectorAll('span');
        const searchLower = highlightText.toLowerCase().trim();

        // Extrahiere Keywords für Highlighting
        const stopwords = ['der', 'die', 'das', 'den', 'dem', 'des', 'ein', 'eine', 'einer', 'eines', 'und', 'oder', 'aber', 'ist', 'wird', 'werden', 'sich', 'am', 'im', 'zum', 'zur', 'bis', 'von', 'mit', 'für', 'als'];
        const keywords = searchLower
          .split(/[\s,.:;!?()]+/)
          .filter(word => word.length > 3 && !stopwords.includes(word));

        let highlightedCount = 0;

        spans.forEach((span) => {
          const spanText = span.textContent?.toLowerCase() || '';

          // Highlighte wenn exakter Text oder Keywords gefunden
          const shouldHighlight = spanText.includes(searchLower) ||
                                 keywords.some(keyword => spanText.includes(keyword));

          if (shouldHighlight) {
            span.classList.add('pdf-highlight');
            highlightedCount++;
          }
        });

        console.log(`✨ ${highlightedCount} Text-Spans hervorgehoben`);
      } catch (error) {
        console.error('❌ Fehler beim Highlighting:', error);
      }
    }, 500); // 500ms warten

    return () => clearTimeout(timeoutId);
  }, [highlightText, foundOnPage, showTextLayer]);

  const onDocumentLoadSuccess = (pdf: PDFDocumentProxy) => {
    setNumPages(pdf.numPages);
    pdfDocumentRef.current = pdf; // Speichere PDF-Dokument für Text-Suche
    console.log(`📄 PDF geladen: ${pdf.numPages} Seiten`);
  };

  const onDocumentLoadError = (error: Error) => {
    console.error('❌ PDF Lade-Fehler:', error);
  };

  // 🔍 Fuzzy Search: Suche Text im PDF mit Keyword-Matching
  const searchAndHighlight = async (searchText: string) => {
    if (!searchText || !pdfDocumentRef.current) {
      console.log('⚠️ Kein PDF oder kein Suchtext');
      return;
    }

    setIsSearching(true);
    setFoundOnPage(null);

    try {
      console.log('🔍 Suche nach:', searchText);
      const pdf = pdfDocumentRef.current;
      const searchLower = searchText.toLowerCase().trim();

      // Stopwords die ignoriert werden (deutsche Füllwörter)
      const stopwords = ['der', 'die', 'das', 'den', 'dem', 'des', 'ein', 'eine', 'einer', 'eines', 'und', 'oder', 'aber', 'ist', 'wird', 'werden', 'sich', 'am', 'im', 'zum', 'zur', 'bis', 'von', 'mit', 'für', 'als'];

      // Extrahiere Keywords aus Suchtext (Wörter > 3 Buchstaben, keine Stopwords)
      const keywords = searchLower
        .split(/[\s,.:;!?()]+/)
        .filter(word => word.length > 3 && !stopwords.includes(word));

      console.log(`📋 Keywords für Suche:`, keywords);

      // Erster Versuch: Exakte Suche
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item) => ('str' in item ? item.str : ''))
          .join(' ')
          .toLowerCase();

        if (pageText.includes(searchLower)) {
          console.log(`✅ Exakter Text gefunden auf Seite ${pageNum}`);
          setFoundOnPage(pageNum);
          setPageNumber(pageNum);
          setShowTextLayer(true);
          setIsSearching(false);
          if (containerRef.current) {
            containerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
          return;
        }
      }

      // Zweiter Versuch: Fuzzy Keyword-Search
      let bestMatch: { pageNum: number; score: number } | null = null;

      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item) => ('str' in item ? item.str : ''))
          .join(' ')
          .toLowerCase();

        // Zähle wie viele Keywords auf dieser Seite vorkommen
        let matchCount = 0;
        keywords.forEach(keyword => {
          if (pageText.includes(keyword)) {
            matchCount++;
          }
        });

        // Beste Seite merken (mindestens 2 Keywords oder 50% der Keywords)
        const requiredMatches = Math.max(2, Math.ceil(keywords.length * 0.5));
        if (matchCount >= requiredMatches) {
          if (!bestMatch || matchCount > bestMatch.score) {
            bestMatch = { pageNum, score: matchCount };
          }
        }
      }

      if (bestMatch) {
        console.log(`✅ Fuzzy Match gefunden auf Seite ${bestMatch.pageNum} (${bestMatch.score}/${keywords.length} Keywords)`);
        setFoundOnPage(bestMatch.pageNum);
        setPageNumber(bestMatch.pageNum);
        setShowTextLayer(true);
        setIsSearching(false);
        if (containerRef.current) {
          containerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        return;
      }

      // Nichts gefunden
      console.log('❌ Text nicht gefunden im PDF (auch nicht mit Fuzzy Search)');
      setIsSearching(false);
    } catch (error) {
      console.error('❌ Fehler beim Suchen:', error);
      setIsSearching(false);
    }
  };

  const changePage = (offset: number) => {
    setPageNumber(prevPageNumber => {
      const newPage = prevPageNumber + offset;
      return Math.min(Math.max(1, newPage), numPages);
    });
  };

  const changeScale = (delta: number) => {
    setScale(prevScale => Math.min(Math.max(0.5, prevScale + delta), 3));
  };

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
        padding: '16px 20px',
        borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
        background: '#FAFAFA'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <FileText size={20} style={{ color: '#007AFF' }} />
          <span style={{
            fontSize: '14px',
            fontWeight: 600,
            color: '#1D1D1F',
            letterSpacing: '-0.01em'
          }}>
            Dokument-Vorschau
          </span>
          {highlightText && (
            <span style={{
              fontSize: '11px',
              fontWeight: 600,
              color: isSearching ? '#007AFF' : foundOnPage ? '#34C759' : '#FF9500',
              background: isSearching ? 'rgba(0, 122, 255, 0.1)' : foundOnPage ? 'rgba(52, 199, 89, 0.1)' : 'rgba(255, 149, 0, 0.1)',
              padding: '4px 8px',
              borderRadius: '6px',
              letterSpacing: '0.3px'
            }}>
              {isSearching ? '🔍 Suche läuft...' : foundOnPage ? `✅ Gefunden auf Seite ${foundOnPage}` : '📍 Stelle markiert'}
            </span>
          )}
        </div>

        {/* Zoom + Navigation Controls */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {/* Zoom Controls */}
          <button
            onClick={() => changeScale(-0.2)}
            disabled={scale <= 0.5}
            style={{
              padding: '6px 10px',
              border: '1px solid rgba(0, 0, 0, 0.1)',
              borderRadius: '8px',
              background: scale <= 0.5 ? '#F5F5F7' : '#FFFFFF',
              cursor: scale <= 0.5 ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              transition: 'all 0.2s'
            }}
          >
            <ZoomOut size={16} style={{ color: scale <= 0.5 ? '#C7C7CC' : '#1D1D1F' }} />
          </button>

          <span style={{
            fontSize: '13px',
            fontWeight: 500,
            color: '#86868B',
            minWidth: '45px',
            textAlign: 'center'
          }}>
            {Math.round(scale * 100)}%
          </span>

          <button
            onClick={() => changeScale(0.2)}
            disabled={scale >= 3}
            style={{
              padding: '6px 10px',
              border: '1px solid rgba(0, 0, 0, 0.1)',
              borderRadius: '8px',
              background: scale >= 3 ? '#F5F5F7' : '#FFFFFF',
              cursor: scale >= 3 ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              transition: 'all 0.2s'
            }}
          >
            <ZoomIn size={16} style={{ color: scale >= 3 ? '#C7C7CC' : '#1D1D1F' }} />
          </button>

          {/* Divider */}
          <div style={{
            width: '1px',
            height: '24px',
            background: 'rgba(0, 0, 0, 0.1)',
            margin: '0 4px'
          }} />

          {/* Page Navigation */}
          <button
            onClick={() => changePage(-1)}
            disabled={pageNumber <= 1}
            style={{
              padding: '6px 10px',
              border: '1px solid rgba(0, 0, 0, 0.1)',
              borderRadius: '8px',
              background: pageNumber <= 1 ? '#F5F5F7' : '#FFFFFF',
              cursor: pageNumber <= 1 ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              transition: 'all 0.2s'
            }}
          >
            <ChevronLeft size={16} style={{ color: pageNumber <= 1 ? '#C7C7CC' : '#1D1D1F' }} />
          </button>

          <span style={{
            fontSize: '13px',
            fontWeight: 500,
            color: '#1D1D1F',
            minWidth: '70px',
            textAlign: 'center'
          }}>
            {pageNumber} / {numPages || '...'}
          </span>

          <button
            onClick={() => changePage(1)}
            disabled={pageNumber >= numPages}
            style={{
              padding: '6px 10px',
              border: '1px solid rgba(0, 0, 0, 0.1)',
              borderRadius: '8px',
              background: pageNumber >= numPages ? '#F5F5F7' : '#FFFFFF',
              cursor: pageNumber >= numPages ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              transition: 'all 0.2s'
            }}
          >
            <ChevronRight size={16} style={{ color: pageNumber >= numPages ? '#C7C7CC' : '#1D1D1F' }} />
          </button>

          {/* Divider */}
          <div style={{
            width: '1px',
            height: '24px',
            background: 'rgba(0, 0, 0, 0.1)',
            margin: '0 4px'
          }} />

          {/* Text Layer Toggle */}
          <button
            onClick={() => setShowTextLayer(!showTextLayer)}
            style={{
              padding: '6px 12px',
              border: `1.5px solid ${showTextLayer ? '#007AFF' : 'rgba(0, 0, 0, 0.1)'}`,
              borderRadius: '8px',
              background: showTextLayer ? 'rgba(0, 122, 255, 0.08)' : '#FFFFFF',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s',
              fontSize: '12px',
              fontWeight: showTextLayer ? 600 : 500,
              color: showTextLayer ? '#007AFF' : '#1D1D1F'
            }}
            title={showTextLayer ? 'Text ausblenden' : 'Text anzeigen'}
          >
            📝 Text
          </button>
        </div>
      </div>

      {/* Highlight-Anzeige wenn Text gesucht wird */}
      {highlightText && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          style={{
            background: 'linear-gradient(135deg, rgba(255, 204, 0, 0.15) 0%, rgba(255, 149, 0, 0.15) 100%)',
            border: '2px solid #FFCC00',
            borderLeft: '4px solid #FF9500',
            padding: '16px 20px',
            margin: '0 20px',
            borderRadius: '0 0 12px 12px',
            boxShadow: '0 4px 12px rgba(255, 149, 0, 0.2)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <div style={{
              background: '#FFCC00',
              borderRadius: '50%',
              padding: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <FileText size={16} style={{ color: '#1D1D1F' }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{
                fontSize: '13px',
                fontWeight: 700,
                color: '#1D1D1F',
                marginBottom: '6px',
                letterSpacing: '-0.01em'
              }}>
                🔍 Gesuchte Stelle im Dokument:
              </div>
              <div style={{
                fontSize: '12px',
                color: '#1D1D1F',
                lineHeight: '1.5',
                background: 'rgba(255, 255, 255, 0.7)',
                padding: '8px 12px',
                borderRadius: '8px',
                fontFamily: 'monospace',
                maxHeight: '80px',
                overflowY: 'auto',
                border: '1px solid rgba(255, 149, 0, 0.3)'
              }}>
                {highlightText}
              </div>
              <div style={{
                fontSize: '11px',
                color: '#86868B',
                marginTop: '8px',
                fontStyle: 'italic'
              }}>
                💡 Tipp: Scrolle durch das PDF um die Stelle zu finden
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* PDF Content */}
      <div style={{
        padding: '20px',
        background: '#F5F5F7',
        maxHeight: '800px',
        overflowY: 'auto',
        display: 'flex',
        justifyContent: 'center'
      }}>
        <Document
          file={file}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={onDocumentLoadError}
          loading={
            <div style={{
              textAlign: 'center',
              padding: '40px',
              color: '#86868B'
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                border: '3px solid #E5E5E7',
                borderTop: '3px solid #007AFF',
                borderRadius: '50%',
                margin: '0 auto 16px',
                animation: 'spin 1s linear infinite'
              }} />
              <p style={{ fontSize: '14px', margin: 0 }}>PDF wird geladen...</p>
            </div>
          }
        >
          <Page
            pageNumber={pageNumber}
            scale={scale}
            renderTextLayer={showTextLayer}
            renderAnnotationLayer={false}
            loading={
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
            }
          />
        </Document>
      </div>

      {/* Loading Spinner Animation + TextLayer Styling */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        /* TextLayer: TRANSPARENT (nur Highlights sichtbar!) */
        .react-pdf__Page__textContent {
          color: transparent !important;
          /* Erlaubt Textauswahl, aber Text ist unsichtbar */
        }
        .react-pdf__Page__textContent span {
          color: transparent !important;
        }

        /* Text-Highlighting: Gelber Hintergrund mit schwarzem Text */
        .react-pdf__Page__textContent span.pdf-highlight {
          color: #000000 !important; /* NUR gehighlighteter Text ist sichtbar */
          background-color: #FFEB3B !important;
          border-radius: 2px !important;
          padding: 2px 0 !important;
          box-shadow: 0 0 0 2px #FFEB3B !important;
        }
      `}</style>
    </motion.div>
  );
};

export default PDFDocumentViewer;
