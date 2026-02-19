// 📁 src/components/PDFDocumentViewer.tsx
// PDF Viewer mit Text-Highlighting für Optimizer

import React, { useState, useRef, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, ZoomIn, ZoomOut, ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

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
  const [isSearching, setIsSearching] = useState<boolean>(false); // Suche läuft
  const [foundOnPage, setFoundOnPage] = useState<number | null>(null); // Seite wo Text gefunden wurde
  const [isTextSnippetOpen, setIsTextSnippetOpen] = useState<boolean>(false); // Dropdown für Text-Snippet
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
      // Nur suchen wenn PDF bereits geladen (sonst macht onDocumentLoadSuccess das)
      if (pdfDocumentRef.current) {
        searchAndHighlight(highlightText);
      }
    }
  }, [highlightText]);

  // Apply yellow highlighting to text spans in TextLayer - PRECISE MATCHING
  useEffect(() => {
    if (!highlightText) return;

    // Funktion zum Anwenden der Highlights
    const applyHighlights = () => {
      try {
        const textLayer = document.querySelector('.react-pdf__Page__textContent');
        if (!textLayer) {
          console.log('⚠️ TextLayer nicht gefunden im DOM');
          return false;
        }

        // Entferne alte Highlights
        const oldHighlights = textLayer.querySelectorAll('.pdf-highlight');
        oldHighlights.forEach(el => el.classList.remove('pdf-highlight'));

        // Finde alle spans im TextLayer
        const spans = textLayer.querySelectorAll('span');
        if (spans.length === 0) {
          console.log('⚠️ Keine Spans im TextLayer gefunden');
          return false;
        }

        const searchLower = highlightText.toLowerCase().trim();

        // STRIKTE Stopwords-Liste (inkl. generische Vertragsbezeichnungen)
        const stopwords = new Set([
          // Artikel & Pronomen
          'der', 'die', 'das', 'den', 'dem', 'des', 'ein', 'eine', 'einer', 'eines',
          'und', 'oder', 'aber', 'wenn', 'dann', 'weil', 'dass', 'daß',
          // Verben
          'ist', 'sind', 'war', 'wird', 'werden', 'wurde', 'wurden', 'sein', 'haben', 'hat', 'hatte',
          'kann', 'können', 'soll', 'sollen', 'muss', 'müssen', 'darf', 'dürfen',
          // Präpositionen
          'am', 'im', 'an', 'in', 'um', 'zum', 'zur', 'auf', 'bei', 'nach', 'vor', 'aus',
          'über', 'unter', 'durch', 'gegen', 'ohne', 'mit', 'für', 'als', 'bis', 'von',
          // Sonstige
          'sich', 'nicht', 'auch', 'noch', 'nur', 'schon', 'sehr', 'mehr', 'bereits',
          'sowie', 'soweit', 'sofern', 'jedoch', 'daher', 'dabei', 'hierzu', 'hierbei',
          // Generische Vertragsbezeichnungen (NICHT highlighten)
          'vertrag', 'vertrags', 'verträge', 'kaufvertrag', 'mietvertrag', 'arbeitsvertrag',
          'dienstvertrag', 'werkvertrag', 'vereinbarung', 'abkommen', 'anlage', 'anlagen',
          'paragraph', 'paragraf', 'absatz', 'satz', 'ziffer', 'nummer', 'punkt',
          'artikel', 'seite', 'datum', 'unterschrift', 'parteien', 'partei'
        ]);

        // Extrahiere NUR signifikante Keywords (Wörter >= 5 Buchstaben)
        const significantKeywords = searchLower
          .split(/[\s,.:;!?()"'„"°§€%\d]+/)
          .filter(word => word.length >= 5 && !stopwords.has(word))
          .slice(0, 8); // Maximal 8 Keywords

        console.log(`📋 Signifikante Keywords:`, significantKeywords);

        if (significantKeywords.length === 0) {
          console.log('ℹ️ Keine signifikanten Keywords - Vertrag wird ohne Highlighting angezeigt');
          return true; // Trotzdem erfolgreich - zeige PDF ohne Highlighting
        }

        let highlightedCount = 0;
        const highlightedSpans: Element[] = [];

        // Schritt 1: Sammle alle Span-Texte und ihre Positionen
        const spanData: { span: Element; text: string; matchScore: number }[] = [];

        spans.forEach((span) => {
          const spanText = span.textContent?.toLowerCase().trim() || '';
          if (spanText.length < 3) return; // Ignoriere sehr kurze Spans

          // Berechne Match-Score: Wie viele Keywords matchen?
          let matchScore = 0;
          significantKeywords.forEach(keyword => {
            if (spanText.includes(keyword)) {
              matchScore += keyword.length; // Längere Matches zählen mehr
            }
          });

          if (matchScore > 0) {
            spanData.push({ span, text: spanText, matchScore });
          }
        });

        // Sortiere nach Match-Score (beste Matches zuerst)
        spanData.sort((a, b) => b.matchScore - a.matchScore);

        // Schritt 2: Highlighte nur die besten Matches (max. 15 Spans)
        const maxHighlights = 15;
        const minScore = significantKeywords[0]?.length || 5; // Mindestens ein volles Keyword

        spanData.forEach(({ span, matchScore }) => {
          if (highlightedCount >= maxHighlights) return;
          if (matchScore < minScore) return; // Nur wenn mindestens ein ganzes Keyword matched

          span.classList.add('pdf-highlight');
          highlightedSpans.push(span);
          highlightedCount++;
        });

        console.log(`✨ ${highlightedCount} präzise Matches hervorgehoben`);

        // Schritt 3: Scrolle zum ersten Highlight
        if (highlightedSpans.length > 0) {
          setTimeout(() => {
            highlightedSpans[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 100);
        }

        return highlightedCount > 0;
      } catch (error) {
        console.error('❌ Fehler beim Highlighting:', error);
        return false;
      }
    };

    // Mehrere Versuche mit steigenden Delays
    const delays = [200, 500, 800, 1200];
    const timeouts: NodeJS.Timeout[] = [];

    delays.forEach((delay) => {
      const timeoutId = setTimeout(() => {
        const success = applyHighlights();
        if (success) {
          // Wenn erfolgreich, restliche Timeouts abbrechen
          timeouts.forEach(t => clearTimeout(t));
        }
      }, delay);
      timeouts.push(timeoutId);
    });

    return () => {
      timeouts.forEach(t => clearTimeout(t));
    };
  }, [highlightText, foundOnPage, pageNumber]);

  const onDocumentLoadSuccess = (pdf: PDFDocumentProxy) => {
    setNumPages(pdf.numPages);
    pdfDocumentRef.current = pdf; // Speichere PDF-Dokument für Text-Suche
    console.log(`📄 PDF geladen: ${pdf.numPages} Seiten`);

    // Wenn highlightText bereits gesetzt ist, Suche jetzt starten
    // (beim ersten Mount kommt highlightText oft VOR dem PDF-Load)
    if (highlightText) {
      console.log('🔄 PDF geladen — starte Suche nach highlightText');
      searchAndHighlight(highlightText);
    }
  };

  const onDocumentLoadError = (error: Error) => {
    console.error('❌ PDF Lade-Fehler:', error);
  };

  // 🔍 Präzise Suche: Suche Text im PDF mit signifikanten Keywords
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

      // STRIKTE Stopwords-Liste (gleich wie beim Highlighting)
      const stopwords = new Set([
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

      // Extrahiere NUR signifikante Keywords (Wörter >= 5 Buchstaben)
      const keywords = searchLower
        .split(/[\s,.:;!?()"'„"°§€%\d]+/)
        .filter(word => word.length >= 5 && !stopwords.has(word))
        .slice(0, 8);

      console.log(`📋 Signifikante Keywords für Suche:`, keywords);

      // Wenn keine Keywords gefunden, zeige einfach Seite 1
      if (keywords.length === 0) {
        console.log('ℹ️ Keine Keywords - zeige Vertrag auf Seite 1');
        setFoundOnPage(1);
        setPageNumber(1);
        setIsSearching(false);
        if (containerRef.current) {
          containerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        return;
      }

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
        setIsSearching(false);
        if (containerRef.current) {
          containerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        return;
      }

      // Nichts gefunden - zeige trotzdem Seite 1 für Orientierung
      console.log('ℹ️ Kein spezifischer Text gefunden - zeige Vertrag auf Seite 1');
      setFoundOnPage(1);
      setPageNumber(1);
      setIsSearching(false);
      if (containerRef.current) {
        containerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } catch (error) {
      console.error('❌ Fehler beim Suchen:', error);
      // Bei Fehler trotzdem Seite 1 zeigen
      setFoundOnPage(1);
      setPageNumber(1);
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
            <button
              onClick={() => setIsTextSnippetOpen(!isTextSnippetOpen)}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
              style={{
                fontSize: '11px',
                fontWeight: 600,
                color: isSearching ? '#007AFF' : foundOnPage ? '#34C759' : '#FF9500',
                background: isSearching ? 'rgba(0, 122, 255, 0.1)' : foundOnPage ? 'rgba(52, 199, 89, 0.1)' : 'rgba(255, 149, 0, 0.1)',
                padding: '4px 8px',
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
              {isSearching ? '🔍 Suche läuft...' : foundOnPage ? `✅ Gefunden auf Seite ${foundOnPage}` : '📍 Stelle markiert'}
              {!isSearching && (
                isTextSnippetOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />
              )}
            </button>
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
        </div>
      </div>

      {/* Highlight-Anzeige wenn Text gesucht wird (Dropdown) */}
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
              padding: '16px 20px',
              margin: '0 20px',
              borderRadius: '0 0 12px 12px',
              boxShadow: '0 4px 12px rgba(255, 149, 0, 0.2)',
              overflow: 'hidden'
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
      </AnimatePresence>

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
            renderTextLayer={true}
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

        @keyframes highlightPulse {
          0%, 100% { box-shadow: 0 0 0 3px rgba(255, 204, 0, 0.6); }
          50% { box-shadow: 0 0 0 6px rgba(255, 204, 0, 0.3); }
        }

        /* TextLayer: Text IMMER unsichtbar (Canvas rendert den sichtbaren Text) */
        .react-pdf__Page__textContent span {
          color: transparent !important;
          background: transparent !important;
        }

        /* Text-Highlighting: NUR gelber Hintergrund, Text bleibt unsichtbar
           Der Original-Canvas-Text bleibt unverändert sichtbar */
        .react-pdf__Page__textContent span.pdf-highlight {
          color: transparent !important; /* Text bleibt unsichtbar! */
          background: rgba(255, 235, 59, 0.5) !important; /* Halbtransparentes Gelb */
          border-radius: 2px !important;
          box-shadow: 0 0 0 2px rgba(255, 204, 0, 0.3) !important;
          mix-blend-mode: multiply !important; /* Verschmilzt mit dem Text darunter */
        }
      `}</style>
    </motion.div>
  );
};

export default PDFDocumentViewer;
