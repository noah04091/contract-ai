/**
 * ContractBuilder Page - ContractForge Hauptseite
 * Der visuelle Vertragsbaukasten
 */

import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { PDFDocument } from 'pdf-lib';
import JSZip from 'jszip';
import { useContractBuilderStore, Block } from '../stores/contractBuilderStore';
import {
  BuilderCanvas,
  BlockToolbar,
  PropertiesPanel,
  VariablesPanel,
  ContractTypeSelector,
} from '../components/ContractBuilder';
import {
  Save,
  Download,
  Eye,
  Edit3,
  Undo,
  Redo,
  ZoomIn,
  ZoomOut,
  Settings,
  FileText,
  Sparkles,
  ChevronLeft,
  MoreVertical,
  PanelLeftClose,
  Loader2,
  CloudOff,
  Check,
  Copy,
  FileOutput,
  Printer,
  Trash2,
  X,
  ShieldCheck,
  Keyboard,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
} from 'lucide-react';
import styles from '../styles/ContractBuilder.module.css';

type RightPanel = 'properties' | 'variables' | null;

// Typ für gespeicherte Entwürfe
interface SavedDraft {
  _id: string;
  metadata: {
    name: string;
    contractType: string;
    status: string;
  };
  updatedAt: string;
  blockCount: number;
}

const ContractBuilder: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();

  const [rightPanel, setRightPanel] = useState<RightPanel>('properties');
  const [showLeftPanel, setShowLeftPanel] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showAiAssistant, setShowAiAssistant] = useState(false);
  const [showAiClauseModal, setShowAiClauseModal] = useState(false);
  const [aiClausePrompt, setAiClausePrompt] = useState('');
  const [isGeneratingClause, setIsGeneratingClause] = useState(false);
  const [showTypeSelector, setShowTypeSelector] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [showLegalScoreModal, setShowLegalScoreModal] = useState(false);
  const [showOptimizeModal, setShowOptimizeModal] = useState(false);
  const [isCalculatingScore, setIsCalculatingScore] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizeResult, setOptimizeResult] = useState<{
    original: string;
    optimized: string;
    improvements: string[];
  } | null>(null);
  const [savedDrafts, setSavedDrafts] = useState<SavedDraft[]>([]);
  const [isLoadingDrafts, setIsLoadingDrafts] = useState(false);
  const [lastAutoSaved, setLastAutoSaved] = useState<Date | null>(null);
  const [isAutoSaving, setIsAutoSaving] = useState(false);

  const {
    document: currentDocument,
    isLoading,
    error,
    view,
    zoom,
    canUndo,
    canRedo,
    isLocalMode,
    isAiGenerating,
    aiOperation,
    selectedVariableId,
    selectedBlockId,
    hasUnsavedChanges,
    loadDocument,
    createDocument,
    createDocumentFromTemplate,
    saveDocument,
    setView,
    setZoom,
    undo,
    redo,
    clearError,
    addBlock,
    updateBlock,
    updateMetadata,
    generateClause,
    optimizeClause,
    calculateLegalScore,
    deleteBlock,
    duplicateBlock,
    selectBlock,
  } = useContractBuilderStore();

  // WARNUNG: Ungespeicherte Änderungen beim Verlassen der Seite
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = 'Sie haben ungespeicherte Änderungen. Möchten Sie die Seite wirklich verlassen?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // AUTO-SAVE: Alle 30 Sekunden automatisch speichern
  useEffect(() => {
    // Nur auto-speichern wenn: Dokument existiert UND ungespeicherte Änderungen vorhanden
    if (!currentDocument || !hasUnsavedChanges) return;

    const autoSaveInterval = setInterval(async () => {
      // Nicht speichern wenn bereits manuell oder auto gespeichert wird
      if (isSaving || isAutoSaving) return;

      setIsAutoSaving(true);
      try {
        await saveDocument();
        setLastAutoSaved(new Date());
      } catch (error) {
        console.error('[Auto-Save] Fehler:', error);
        // Stille Fehlerbehandlung - User nicht mit Auto-Save Fehlern nerven
      } finally {
        setIsAutoSaving(false);
      }
    }, 30000); // 30 Sekunden

    return () => clearInterval(autoSaveInterval);
  }, [currentDocument, hasUnsavedChanges, isSaving, isAutoSaving, saveDocument]);

  // Dokument laden oder Typ-Auswahl zeigen
  useEffect(() => {
    if (id) {
      loadDocument(id);
    } else if (!currentDocument) {
      // Bei neuem Dokument ohne existierendes Dokument: Typ-Auswahl Modal zeigen
      setShowTypeSelector(true);
    }
  }, [id, loadDocument, currentDocument]);

  // Gespeicherte Entwürfe laden wenn Modal geöffnet wird
  useEffect(() => {
    if (showTypeSelector) {
      const fetchSavedDrafts = async () => {
        setIsLoadingDrafts(true);
        try {
          const API_BASE = import.meta.env.VITE_API_URL || 'https://api.contract-ai.de';
          const token = localStorage.getItem('authToken') || localStorage.getItem('token');

          const response = await fetch(`${API_BASE}/api/contract-builder?limit=10&sort=-updatedAt`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });

          if (response.ok) {
            const data = await response.json();
            setSavedDrafts(data.documents || []);
          }
        } catch (error) {
          console.error('Fehler beim Laden der Entwürfe:', error);
        } finally {
          setIsLoadingDrafts(false);
        }
      };

      fetchSavedDrafts();
    }
  }, [showTypeSelector]);

  // Automatisch zum Variables-Panel wechseln wenn eine Variable ausgewählt wird
  useEffect(() => {
    if (selectedVariableId) {
      setRightPanel('variables');
    }
  }, [selectedVariableId]);

  // Auto-Calculate Legal Score bei Block-Änderungen (mit Debouncing)
  const legalScoreTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastBlocksHashRef = useRef<string>('');

  useEffect(() => {
    if (!currentDocument?.content?.blocks || currentDocument.content.blocks.length === 0) return;

    // Hash der Blöcke berechnen um unnötige Neuberechnungen zu vermeiden
    const blocksHash = JSON.stringify(
      currentDocument.content.blocks
        .filter(b => b.type === 'clause')
        .map(b => b.content?.body || '')
    );

    // Wenn sich nichts geändert hat, nicht neu berechnen
    if (blocksHash === lastBlocksHashRef.current) return;
    lastBlocksHashRef.current = blocksHash;

    // Debounce: 5 Sekunden nach letzter Änderung
    if (legalScoreTimerRef.current) {
      clearTimeout(legalScoreTimerRef.current);
    }

    legalScoreTimerRef.current = setTimeout(() => {
      calculateLegalScore();
    }, 5000);

    return () => {
      if (legalScoreTimerRef.current) {
        clearTimeout(legalScoreTimerRef.current);
      }
    };
  }, [currentDocument?.content?.blocks, calculateLegalScore]);

  // Handler für Template-Auswahl
  const handleTemplateSelect = async (templateId: string) => {
    // Erst Dokument erstellen, dann Modal schließen
    try {
      await createDocumentFromTemplate(templateId);
      setShowTypeSelector(false);
    } catch (err) {
      console.error('Fehler beim Erstellen des Dokuments:', err);
      // Bei Fehler zurück zur Vertragsliste
      navigate('/contracts');
    }
  };

  // Handler für gespeicherten Entwurf laden
  const handleLoadDraft = async (draftId: string) => {
    try {
      await loadDocument(draftId);
      setShowTypeSelector(false);
    } catch (err) {
      console.error('Fehler beim Laden des Entwurfs:', err);
    }
  };

  // Handler für Entwurf löschen
  const handleDeleteDraft = async (draftId: string) => {
    if (!confirm('Möchten Sie diesen Entwurf wirklich löschen?')) return;

    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'https://api.contract-ai.de';
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');

      const response = await fetch(`${API_BASE}/api/contract-builder/${draftId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        // Drafts neu laden
        setSavedDrafts(prev => prev.filter(d => d._id !== draftId));
      } else {
        alert('Fehler beim Löschen des Entwurfs');
      }
    } catch (error) {
      console.error('Fehler beim Löschen:', error);
      alert('Fehler beim Löschen des Entwurfs');
    }
  };

  // Handler für Entwurf umbenennen
  const handleRenameDraft = async (draftId: string, currentName: string) => {
    const newName = prompt('Neuer Name für den Entwurf:', currentName);
    if (!newName || newName === currentName) return;

    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'https://api.contract-ai.de';
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');

      const response = await fetch(`${API_BASE}/api/contract-builder/${draftId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          metadata: { name: newName }
        }),
      });

      if (response.ok) {
        // Drafts aktualisieren
        setSavedDrafts(prev => prev.map(d =>
          d._id === draftId
            ? { ...d, metadata: { ...d.metadata, name: newName } }
            : d
        ));
      } else {
        alert('Fehler beim Umbenennen des Entwurfs');
      }
    } catch (error) {
      console.error('Fehler beim Umbenennen:', error);
      alert('Fehler beim Umbenennen des Entwurfs');
    }
  };

  // Handler für Entwurf duplizieren
  const handleDuplicateDraft = async (draftId: string, originalName: string) => {
    try {
      const API_BASE = import.meta.env.VITE_API_URL || 'https://api.contract-ai.de';
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');

      const response = await fetch(`${API_BASE}/api/contract-builder/${draftId}/duplicate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: `${originalName} (Kopie)`
        }),
      });

      if (response.ok) {
        const data = await response.json();
        // Neuen Entwurf zur Liste hinzufügen
        setSavedDrafts(prev => [data.document, ...prev]);
      } else {
        alert('Fehler beim Duplizieren des Entwurfs');
      }
    } catch (error) {
      console.error('Fehler beim Duplizieren:', error);
      alert('Fehler beim Duplizieren des Entwurfs');
    }
  };

  // Speichern
  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      await saveDocument();
      setSaveSuccess(true);
      // Reset nach 2 Sekunden
      setTimeout(() => setSaveSuccess(false), 2000);
    } finally {
      setIsSaving(false);
    }
  };

  // PDF Export - Erfasst nur den Inhalt (kein Leerraum), fügt Seitenzahlen hinzu
  const handleExportPdf = async () => {
    // VALIDIERUNG: Prüfe ob Dokument existiert und nicht leer ist
    if (!currentDocument) {
      alert('Kein Dokument geladen. Bitte erstellen Sie zuerst ein Dokument.');
      return;
    }

    if (!currentDocument.content.blocks || currentDocument.content.blocks.length === 0) {
      alert('Das Dokument ist leer. Bitte fügen Sie mindestens einen Block hinzu bevor Sie exportieren.');
      return;
    }

    setIsExporting(true);

    try {
      const filename = `${currentDocument.metadata.name || 'Vertrag'}.pdf`;

      // Speichere aktuellen View-Modus und Zoom
      const previousView = view;
      const previousZoom = zoom;

      // Wechsle zu Preview-Modus und 100% Zoom
      setView('preview');
      setZoom(100);

      // Warte bis DOM aktualisiert ist
      await new Promise(resolve => setTimeout(resolve, 400));

      // Finde alle pageContent-Elemente (nur der tatsächliche Inhalt)
      const canvasWrapper = document.querySelector('[class*="canvasWrapper"]');
      if (!canvasWrapper) {
        throw new Error('Canvas nicht gefunden');
      }

      // Suche nach pageContent-Elementen
      const allElements = canvasWrapper.querySelectorAll('div');
      const contentElements: HTMLElement[] = [];

      allElements.forEach(el => {
        const classes = el.className || '';
        if (classes.includes('pageContent_')) {
          contentElements.push(el as HTMLElement);
        }
      });

      if (contentElements.length === 0) {
        throw new Error('Kein Inhalt gefunden');
      }

      // PDF erstellen
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pdfWidth = 210;
      const pdfHeight = 297;
      const margin = 15;
      const contentWidth = pdfWidth - (2 * margin);
      const footerHeight = 10;
      const usableHeight = pdfHeight - margin - footerHeight;

      let currentY = margin;
      let currentPage = 1;
      const totalPages = contentElements.length;

      // Funktion um Seitenzahl hinzuzufügen
      const addPageNumber = (pageNum: number, total: number) => {
        pdf.setFontSize(9);
        pdf.setTextColor(128, 128, 128);
        pdf.text(`Seite ${pageNum} von ${total}`, pdfWidth / 2, pdfHeight - 8, { align: 'center' });
        pdf.setTextColor(0, 0, 0);
      };

      // Jeden Inhaltsbereich erfassen
      for (let i = 0; i < contentElements.length; i++) {
        const content = contentElements[i];

        // Überspringe leere Inhalte
        if (content.children.length === 0) {
          continue;
        }

        // WICHTIG: Element in den sichtbaren Bereich scrollen
        content.scrollIntoView({ behavior: 'instant', block: 'start' });

        // Kurze Pause für Repaint/Reflow
        await new Promise(resolve => setTimeout(resolve, 50));

        // ============================================
        // GARANTIERTER FIX: Graue Farben zu SCHWARZ, Custom-Farben beibehalten
        // Der onclone callback ist unzuverlässig - funktioniert nur manchmal
        // Dieser Ansatz setzt die Farben direkt auf den Original-Elementen
        // ============================================
        const originalStyles: Map<HTMLElement, { color: string; opacity: string }> = new Map();

        // Prüft ob eine Farbe "grau" ist (Standard-Textfarbe die zu schwarz werden soll)
        // Custom-Farben (blau, rot, grün) werden NICHT geändert
        const isGrayColor = (color: string): boolean => {
          // Leere Farbe = erbt von Parent = wahrscheinlich grau
          if (!color || color === '' || color === 'inherit') return true;

          // RGB-Werte extrahieren
          const rgbMatch = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
          if (rgbMatch) {
            const r = parseInt(rgbMatch[1]);
            const g = parseInt(rgbMatch[2]);
            const b = parseInt(rgbMatch[3]);

            // Grau = R, G, B sind ähnlich (Differenz < 30)
            const maxDiff = Math.max(Math.abs(r - g), Math.abs(g - b), Math.abs(r - b));
            if (maxDiff < 30) return true; // Ist grau/schwarz

            return false; // Ist eine Custom-Farbe (blau, rot, etc.)
          }

          // Hex-Farben prüfen
          const hexMatch = color.match(/^#([0-9a-f]{6})$/i);
          if (hexMatch) {
            const hex = hexMatch[1];
            const r = parseInt(hex.substring(0, 2), 16);
            const g = parseInt(hex.substring(2, 4), 16);
            const b = parseInt(hex.substring(4, 6), 16);

            const maxDiff = Math.max(Math.abs(r - g), Math.abs(g - b), Math.abs(r - b));
            if (maxDiff < 30) return true;

            return false;
          }

          // Im Zweifel: als grau behandeln
          return true;
        };

        const setBlackText = (el: Element) => {
          const htmlEl = el as HTMLElement;
          if (htmlEl.style !== undefined) {
            // Hole die computed color (tatsächlich gerenderte Farbe)
            const computedColor = window.getComputedStyle(htmlEl).color;

            // Speichere Original-Styles
            originalStyles.set(htmlEl, {
              color: htmlEl.style.color,
              opacity: htmlEl.style.opacity
            });

            // NUR graue Farben zu Schwarz ändern, Custom-Farben beibehalten
            if (isGrayColor(computedColor)) {
              htmlEl.style.setProperty('color', '#000000', 'important');
            }
            htmlEl.style.setProperty('opacity', '1', 'important');
          }
          // Rekursiv für alle Kinder
          Array.from(el.children).forEach(child => setBlackText(child));
        };

        // Farben auf SCHWARZ setzen (nur graue)
        setBlackText(content);

        // Kurze Pause damit Browser die Styles anwendet
        await new Promise(resolve => setTimeout(resolve, 50));

        // html2canvas mit optimierten Einstellungen
        const canvas = await html2canvas(content, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          logging: false,
          ignoreElements: (element) => {
            let classes = '';
            if (typeof element.className === 'string') {
              classes = element.className;
            } else if (element.className && typeof element.className === 'object' && 'baseVal' in element.className) {
              classes = (element.className as SVGAnimatedString).baseVal || '';
            }
            return classes.includes('activePageBadge') ||
                   classes.includes('overflowWarning') ||
                   classes.includes('zoomIndicator') ||
                   classes.includes('blockControls') ||
                   classes.includes('dragHandle') ||
                   classes.includes('pageNumber');
          },
        });

        // ============================================
        // Original-Styles wiederherstellen
        // ============================================
        originalStyles.forEach((styles, el) => {
          el.style.color = styles.color;
          el.style.opacity = styles.opacity;
        });

        // Berechne die Bildgröße proportional
        const imgWidth = contentWidth;
        const imgHeight = (canvas.height * contentWidth) / canvas.width;

        // Prüfe ob wir eine neue Seite brauchen
        if (i > 0) {
          // Seitenzahl auf vorherige Seite
          addPageNumber(currentPage, totalPages);
          pdf.addPage();
          currentPage++;
          currentY = margin;
        }

        // Canvas als JPEG mit hoher Qualität für scharfen Text
        const imgData = canvas.toDataURL('image/jpeg', 0.95);

        // Bild zur PDF hinzufügen
        pdf.addImage(imgData, 'JPEG', margin, currentY, imgWidth, Math.min(imgHeight, usableHeight));
      }

      // Seitenzahl auf letzte Seite
      addPageNumber(currentPage, totalPages);

      // Zurück zum ursprünglichen Modus
      setView(previousView);
      setZoom(previousZoom);

      // === ANLAGEN-MERGE ===
      // Sammle alle Anlagen (sowohl neue Multi-Format als auch Legacy-Single-Format)
      type AttachmentData = {
        file: string;
        fileName: string;
        fileType: string;
        title?: string;
      };

      const allAttachments: AttachmentData[] = [];

      // Alle attachment-Blöcke durchgehen
      currentDocument.content.blocks.forEach((b: Block) => {
        if (b.type !== 'attachment') return;

        // Neues Multi-Attachment Format
        if (b.content.attachments && b.content.attachments.length > 0) {
          b.content.attachments.forEach(att => {
            if (att.file) {
              allAttachments.push({
                file: att.file,
                fileName: att.fileName,
                fileType: att.fileType,
                title: att.title,
              });
            }
          });
        }
        // Legacy Single-Attachment Format
        else if (b.content.attachmentFile) {
          allAttachments.push({
            file: b.content.attachmentFile,
            fileName: b.content.attachmentFileName || 'Anlage',
            fileType: b.content.attachmentFileType || 'application/octet-stream',
            title: b.content.attachmentTitle,
          });
        }
      });

      if (allAttachments.length > 0) {
        // Kategorisiere Anlagen
        const pdfAttachments = allAttachments.filter(
          att => att.fileType === 'application/pdf'
        );
        const imageAttachments = allAttachments.filter(
          att => att.fileType?.startsWith('image/')
        );
        const officeAttachments = allAttachments.filter(
          att =>
            att.fileType?.includes('word') ||
            att.fileType?.includes('excel') ||
            att.fileType?.includes('spreadsheet') ||
            att.fileType?.includes('msword') ||
            att.fileType?.includes('ms-excel')
        );

        // Haupt-PDF als Bytes holen
        const mainPdfBytes = pdf.output('arraybuffer');

        // Neues PDF mit pdf-lib erstellen
        const mergedPdf = await PDFDocument.create();

        // 1. Hauptvertrag-Seiten kopieren
        const mainDoc = await PDFDocument.load(mainPdfBytes);
        const mainPages = await mergedPdf.copyPages(mainDoc, mainDoc.getPageIndices());
        mainPages.forEach(page => mergedPdf.addPage(page));

        // 2. PDF-Anlagen anhängen
        for (const attachment of pdfAttachments) {
          try {
            const base64Data = attachment.file;
            // Base64 Data-URL zu ArrayBuffer konvertieren
            const base64String = base64Data.split(',')[1] || base64Data;
            const binaryString = atob(base64String);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }

            const attachmentDoc = await PDFDocument.load(bytes);
            const attachmentPages = await mergedPdf.copyPages(attachmentDoc, attachmentDoc.getPageIndices());
            attachmentPages.forEach(page => mergedPdf.addPage(page));
          } catch (err) {
            console.error('[PDF Export] Failed to attach PDF:', attachment.fileName, err);
          }
        }

        // 3. Bild-Anlagen als PDF-Seiten
        for (const attachment of imageAttachments) {
          try {
            const base64Data = attachment.file;
            const base64String = base64Data.split(',')[1] || base64Data;
            const binaryString = atob(base64String);
            const imageBytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              imageBytes[i] = binaryString.charCodeAt(i);
            }

            // Bild je nach Typ einbetten
            let image;
            if (attachment.fileType?.includes('png')) {
              image = await mergedPdf.embedPng(imageBytes);
            } else {
              image = await mergedPdf.embedJpg(imageBytes);
            }

            // Neue A4-Seite erstellen
            const page = mergedPdf.addPage([595.28, 841.89]); // A4 in Points

            // Bild zentriert und skaliert einfügen
            const maxWidth = 500;
            const maxHeight = 750;
            const scale = Math.min(maxWidth / image.width, maxHeight / image.height, 1);
            const scaledWidth = image.width * scale;
            const scaledHeight = image.height * scale;

            page.drawImage(image, {
              x: (595.28 - scaledWidth) / 2,
              y: (841.89 - scaledHeight) / 2,
              width: scaledWidth,
              height: scaledHeight,
            });
          } catch (err) {
            console.error('[PDF Export] Failed to attach image:', attachment.fileName, err);
          }
        }

        // 4. Finale PDF speichern
        const finalPdfBytes = await mergedPdf.save();

        // 5. Download - entweder PDF oder ZIP (wenn Office-Dateien vorhanden)
        if (officeAttachments.length > 0) {
          const zip = new JSZip();
          const contractName = currentDocument.metadata.name || 'Vertrag';

          // Vertrag-PDF hinzufügen
          zip.file(`${contractName}.pdf`, finalPdfBytes);

          // Anlagen-Ordner erstellen
          const anlagenFolder = zip.folder('Anlagen');
          if (anlagenFolder) {
            for (const attachment of officeAttachments) {
              const base64Data = attachment.file;
              const base64String = base64Data.split(',')[1] || base64Data;
              anlagenFolder.file(attachment.fileName || 'Anlage', base64String, { base64: true });
            }
          }

          // ZIP generieren und downloaden
          const zipBlob = await zip.generateAsync({ type: 'blob' });
          const url = URL.createObjectURL(zipBlob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${contractName}_mit_Anlagen.zip`;
          a.click();
          URL.revokeObjectURL(url);
        } else {
          // Nur PDF download
          const blob = new Blob([finalPdfBytes], { type: 'application/pdf' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = filename;
          a.click();
          URL.revokeObjectURL(url);
        }
      } else {
        // Keine Anlagen - normaler PDF-Export
        pdf.save(filename);
      }

    } catch (error) {
      console.error('[PDF Export] Failed:', error);
      setView('edit');
      alert(`PDF-Export fehlgeschlagen: ${(error as Error).message}`);
    } finally {
      setIsExporting(false);
    }
  };

  // Zoom Controls
  const handleZoomIn = () => setZoom(Math.min(200, zoom + 10));
  const handleZoomOut = () => setZoom(Math.max(50, zoom - 10));
  const handleZoomReset = () => setZoom(100);

  // Mehr-Menü Actions
  const handleDuplicate = async () => {
    // Warnung bei ungespeicherten Änderungen
    if (hasUnsavedChanges) {
      const confirmed = window.confirm(
        'Sie haben ungespeicherte Änderungen. Diese gehen verloren wenn Sie ein neues Dokument erstellen. Fortfahren?'
      );
      if (!confirmed) {
        setShowMoreMenu(false);
        return;
      }
    }
    setShowMoreMenu(false);
    if (currentDocument) {
      await createDocument(`${currentDocument.metadata.name} (Kopie)`, currentDocument.metadata.contractType);
    }
  };

  // Sichere Navigation mit Warnung bei ungespeicherten Änderungen
  const handleCloseDocument = () => {
    if (hasUnsavedChanges) {
      const confirmed = window.confirm(
        'Sie haben ungespeicherte Änderungen. Möchten Sie wirklich schließen?'
      );
      if (!confirmed) {
        setShowMoreMenu(false);
        return;
      }
    }
    setShowMoreMenu(false);
    navigate('/contracts');
  };

  const handlePrint = () => {
    setShowMoreMenu(false);
    window.print();
  };

  const handleExportTemplate = () => {
    setShowMoreMenu(false);
    // Template Export - JSON Download mit XSS-Schutz
    if (currentDocument) {
      // SICHERHEIT: Sanitize alle String-Inhalte
      const sanitizeString = (str: string | undefined, maxLength = 255): string => {
        if (!str) return '';
        return str
          .substring(0, maxLength)
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Scripts entfernen
          .replace(/javascript:/gi, '')  // javascript: URLs entfernen
          .replace(/on\w+\s*=/gi, '');   // Event-Handler entfernen (onclick, onerror, etc.)
      };

      // Block-Inhalte rekursiv sanitizen
      const sanitizeBlockContent = (content: Record<string, unknown>): Record<string, unknown> => {
        const sanitized: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(content)) {
          if (typeof value === 'string') {
            sanitized[key] = sanitizeString(value, 10000); // Längere Texte erlauben
          } else if (typeof value === 'object' && value !== null) {
            sanitized[key] = sanitizeBlockContent(value as Record<string, unknown>);
          } else {
            sanitized[key] = value;
          }
        }
        return sanitized;
      };

      const template = {
        name: sanitizeString(currentDocument.metadata.name, 100),
        type: sanitizeString(currentDocument.metadata.contractType, 50),
        blocks: currentDocument.content.blocks.map(block => ({
          ...block,
          content: sanitizeBlockContent(block.content as Record<string, unknown>),
        })),
        design: currentDocument.design,
        exportedAt: new Date().toISOString(),
        version: '1.0',
      };
      const blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      // Dateiname auch sanitizen
      const safeName = sanitizeString(currentDocument.metadata.name, 50).replace(/[^a-zA-Z0-9äöüß_-]/g, '_');
      a.download = `${safeName}_template.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  // KI-Klausel generieren
  const handleGenerateClause = async () => {
    if (!aiClausePrompt.trim()) return;

    setIsGeneratingClause(true);

    // TIMEOUT: Abbruch nach 60 Sekunden
    const timeoutId = setTimeout(() => {
      setIsGeneratingClause(false);
      alert('Die KI-Generierung hat zu lange gedauert (>60 Sekunden). Bitte versuchen Sie es erneut mit einer kürzeren Anfrage.');
    }, 60000);

    try {
      // Echte KI-Generierung über Backend-API
      const result = await generateClause(aiClausePrompt, {
        tone: 'formal',
        length: 'mittel',
        strictness: 'ausgewogen',
      }) as {
        clause?: { title?: string; body?: string; subclauses?: Array<{ number: string; text: string }> };
        legalBasis?: string[];
        riskLevel?: string;
        suggestedVariables?: Array<{ name: string; displayName: string; type: string }>;
      };

      // Timeout aufheben wenn erfolgreich
      clearTimeout(timeoutId);

      // Block mit KI-generiertem Inhalt erstellen
      const generatedClause = {
        type: 'clause' as const,
        content: {
          number: 'auto',
          clauseTitle: result.clause?.title || 'KI-generierte Klausel',
          body: result.clause?.body || `Klausel basierend auf: "${aiClausePrompt}"`,
          subclauses: result.clause?.subclauses || [],
        },
        style: {},
        locked: false,
        aiGenerated: true,
        aiPrompt: aiClausePrompt,
        legalBasis: result.legalBasis || [],
        riskLevel: result.riskLevel as 'low' | 'medium' | 'high' | undefined,
      };

      addBlock(generatedClause);
      setShowAiClauseModal(false);
      setAiClausePrompt('');
    } catch (error) {
      clearTimeout(timeoutId);
      console.error('Fehler bei KI-Generierung:', error);

      // Benutzerfreundliche Fehlermeldung
      const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
      if (errorMessage.includes('abgelaufen') || errorMessage.includes('anmelden')) {
        alert('Ihre Sitzung ist abgelaufen. Bitte melden Sie sich erneut an.');
      } else if (errorMessage.includes('Netzwerk') || errorMessage.includes('fetch')) {
        alert('Netzwerkfehler. Bitte prüfen Sie Ihre Internetverbindung und versuchen Sie es erneut.');
      } else {
        alert(`Fehler bei der KI-Generierung: ${errorMessage}`);
      }
    } finally {
      setIsGeneratingClause(false);
    }
  };

  // Rechtsprüfung (Legal Score)
  const handleLegalCheck = async () => {
    if (!currentDocument) return;

    setIsCalculatingScore(true);
    try {
      await calculateLegalScore();
      setShowLegalScoreModal(true);
    } catch (error) {
      console.error('Fehler bei Rechtsprüfung:', error);
      alert('Fehler bei der Rechtsprüfung. Bitte versuchen Sie es erneut.');
    } finally {
      setIsCalculatingScore(false);
    }
  };

  // Formulierung optimieren
  const handleOptimize = async () => {
    // Finde den aktuell ausgewählten Block
    const selectedBlock = currentDocument?.content.blocks.find(b => b.id === selectedBlockId);

    if (!selectedBlock || selectedBlock.type !== 'clause') {
      alert('Bitte wählen Sie zuerst eine Klausel aus, die optimiert werden soll.');
      return;
    }

    const clauseText = selectedBlock.content.body || '';
    if (!clauseText.trim()) {
      alert('Die ausgewählte Klausel hat keinen Text zum Optimieren.');
      return;
    }

    setIsOptimizing(true);
    setOptimizeResult(null);

    try {
      const result = await optimizeClause(clauseText, 'Klarheit und rechtliche Präzision verbessern') as {
        optimizedText?: string;
        improvements?: string[];
      };

      setOptimizeResult({
        original: clauseText,
        optimized: result.optimizedText || clauseText,
        improvements: result.improvements || ['Formulierung verbessert'],
      });
      setShowOptimizeModal(true);
    } catch (error) {
      console.error('Fehler bei Optimierung:', error);
      alert('Fehler bei der Optimierung. Bitte versuchen Sie es erneut.');
    } finally {
      setIsOptimizing(false);
    }
  };

  // Optimierten Text übernehmen
  const handleApplyOptimization = () => {
    if (!optimizeResult || !selectedBlockId) return;

    updateBlock(selectedBlockId, {
      content: {
        ...currentDocument?.content.blocks.find(b => b.id === selectedBlockId)?.content,
        body: optimizeResult.optimized,
      },
    });

    setShowOptimizeModal(false);
    setOptimizeResult(null);
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prüfe ob wir in einem Input/Textarea sind - dann keine Shortcuts außer Escape
      const target = e.target as HTMLElement;
      const isInputFocused = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

      // Ctrl+S: Speichern (immer aktiv)
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
        return;
      }

      // Ctrl+Z: Undo (immer aktiv)
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
        return;
      }

      // Ctrl+Y: Redo (immer aktiv)
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        redo();
        return;
      }

      // Ctrl+/ oder Ctrl+?: Shortcuts Modal (immer aktiv)
      if ((e.ctrlKey || e.metaKey) && (e.key === '/' || e.key === '?')) {
        e.preventDefault();
        setShowShortcutsModal(prev => !prev);
        return;
      }

      // Escape: Modals schließen (immer aktiv)
      if (e.key === 'Escape') {
        setShowShortcutsModal(false);
        setShowAiClauseModal(false);
        setShowMoreMenu(false);
        setShowLegalScoreModal(false);
        setShowOptimizeModal(false);
        return;
      }

      // Ab hier: Shortcuts nur wenn NICHT in Input/Textarea
      if (isInputFocused) return;

      // Ctrl+P: Preview/Edit umschalten
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        setView(view === 'preview' ? 'edit' : 'preview');
        return;
      }

      // Ctrl+D: Block duplizieren
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        if (selectedBlockId) {
          duplicateBlock(selectedBlockId);
        }
        return;
      }

      // Delete/Backspace: Block löschen
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedBlockId) {
        e.preventDefault();
        const blockToDelete = currentDocument?.content.blocks.find(b => b.id === selectedBlockId);
        if (blockToDelete && !blockToDelete.locked) {
          deleteBlock(selectedBlockId);
        }
        return;
      }

      // Pfeiltasten: Zwischen Blöcken navigieren
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        if (!currentDocument?.content.blocks.length) return;
        e.preventDefault();

        const blocks = currentDocument.content.blocks;
        const currentIndex = selectedBlockId
          ? blocks.findIndex(b => b.id === selectedBlockId)
          : -1;

        let newIndex: number;
        if (e.key === 'ArrowUp') {
          newIndex = currentIndex > 0 ? currentIndex - 1 : blocks.length - 1;
        } else {
          newIndex = currentIndex < blocks.length - 1 ? currentIndex + 1 : 0;
        }

        selectBlock(blocks[newIndex].id);
        return;
      }

      // Ctrl+B: Neuen Klausel-Block hinzufügen
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        addBlock({
          type: 'clause',
          content: {
            number: 'auto',
            clauseTitle: 'Neue Klausel',
            body: 'Klauseltext hier eingeben...',
            subclauses: [],
          },
          style: {},
          locked: false,
          aiGenerated: false,
        });
        return;
      }

      // Ctrl+Plus: Zoom In
      if ((e.ctrlKey || e.metaKey) && (e.key === '+' || e.key === '=')) {
        e.preventDefault();
        setZoom(Math.min(200, zoom + 10));
        return;
      }

      // Ctrl+Minus: Zoom Out
      if ((e.ctrlKey || e.metaKey) && e.key === '-') {
        e.preventDefault();
        setZoom(Math.max(50, zoom - 10));
        return;
      }

      // Ctrl+0: Zoom Reset
      if ((e.ctrlKey || e.metaKey) && e.key === '0') {
        e.preventDefault();
        setZoom(100);
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, view, selectedBlockId, currentDocument, zoom, duplicateBlock, deleteBlock, selectBlock, addBlock, setView, setZoom]);

  // Loading State - nur anzeigen wenn NICHT das TypeSelector Modal offen ist
  if (isLoading && !currentDocument && !showTypeSelector) {
    return (
      <div className={styles.loadingState}>
        <Loader2 size={32} className={styles.spinner} />
        <p>Vertrag wird geladen...</p>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className={styles.errorState}>
        <p>{error}</p>
        <button onClick={clearError}>Erneut versuchen</button>
      </div>
    );
  }

  return (
    <div className={styles.builderPage}>
      {/* Top Toolbar */}
      <header className={styles.topBar}>
        {/* Left Section */}
        <div className={styles.topBarLeft}>
          {/* Zurück zum Dashboard */}
          <button
            className={styles.backButton}
            onClick={() => {
              if (hasUnsavedChanges) {
                const confirmed = window.confirm(
                  'Sie haben ungespeicherte Änderungen. Möchten Sie wirklich zum Dashboard zurückkehren?'
                );
                if (!confirmed) return;
              }
              navigate('/dashboard');
            }}
            title="Zurück zum Dashboard"
          >
            <ChevronLeft size={18} />
          </button>

          <div className={styles.documentInfo}>
            {/* Vorlagen-Button */}
            <button
              className={styles.templateButton}
              onClick={() => setShowTypeSelector(true)}
              title="Vorlage wechseln"
            >
              <FileText size={16} />
            </button>
            <input
              type="text"
              className={styles.documentTitle}
              value={currentDocument?.metadata.name || 'Neuer Vertrag'}
              onChange={(e) => updateMetadata({ name: e.target.value })}
              placeholder="Vertragstitel"
            />
            <span className={styles.documentStatus}>
              {currentDocument?.metadata.status === 'draft' ? 'Entwurf' :
               currentDocument?.metadata.status === 'review' ? 'In Prüfung' :
               currentDocument?.metadata.status === 'final' ? 'Final' : 'Entwurf'}
            </span>
            {isLocalMode && (
              <span className={styles.localModeBadge} title="Offline-Modus: Dokument wird lokal gespeichert">
                <CloudOff size={12} />
                <span>Lokal</span>
              </span>
            )}
            {/* Auto-Save Indikator */}
            {isAutoSaving && (
              <span className={styles.autoSaveBadge} title="Automatisches Speichern...">
                <Loader2 size={12} className={styles.spinner} />
                <span>Speichert...</span>
              </span>
            )}
            {lastAutoSaved && !isAutoSaving && !hasUnsavedChanges && (
              <span className={styles.autoSavedBadge} title={`Zuletzt gespeichert: ${lastAutoSaved.toLocaleTimeString('de-DE')}`}>
                <Check size={12} />
                <span>Gespeichert</span>
              </span>
            )}
          </div>
        </div>

        {/* Center Section - View Toggle */}
        <div className={styles.topBarCenter}>
          <div className={styles.viewToggle}>
            <button
              className={`${styles.viewButton} ${view === 'edit' ? styles.active : ''}`}
              onClick={() => setView('edit')}
              title="Bearbeiten"
            >
              <Edit3 size={14} />
              <span>Bearbeiten</span>
            </button>
            <button
              className={`${styles.viewButton} ${view === 'preview' ? styles.active : ''}`}
              onClick={() => setView('preview')}
              title="Vorschau"
            >
              <Eye size={14} />
              <span>Vorschau</span>
            </button>
          </div>
        </div>

        {/* Right Section */}
        <div className={styles.topBarRight}>
          {/* Undo/Redo */}
          <div className={styles.historyButtons}>
            <button
              className={styles.iconButton}
              onClick={undo}
              disabled={!canUndo}
              title="Rückgängig (Ctrl+Z)"
            >
              <Undo size={16} />
            </button>
            <button
              className={styles.iconButton}
              onClick={redo}
              disabled={!canRedo}
              title="Wiederholen (Ctrl+Y)"
            >
              <Redo size={16} />
            </button>
          </div>

          {/* Zoom Controls */}
          <div className={styles.zoomControls}>
            <button
              className={styles.iconButton}
              onClick={handleZoomOut}
              disabled={zoom <= 50}
              title="Verkleinern"
            >
              <ZoomOut size={16} />
            </button>
            <button
              className={styles.zoomValue}
              onClick={handleZoomReset}
              title="Zoom zurücksetzen"
            >
              {zoom}%
            </button>
            <button
              className={styles.iconButton}
              onClick={handleZoomIn}
              disabled={zoom >= 200}
              title="Vergrößern"
            >
              <ZoomIn size={16} />
            </button>
          </div>

          {/* Legal Health Score - Klick öffnet Modal mit Details */}
          <button
            className={`${styles.legalScoreBadge} ${
              currentDocument?.legalScore
                ? currentDocument.legalScore.totalScore >= 80
                  ? styles.scoreGood
                  : currentDocument.legalScore.totalScore >= 60
                  ? styles.scoreMedium
                  : styles.scoreLow
                : ''
            }`}
            onClick={() => {
              if (currentDocument?.legalScore) {
                // Score vorhanden → Modal öffnen
                setShowLegalScoreModal(true);
              } else {
                // Noch kein Score → erst berechnen
                calculateLegalScore();
              }
            }}
            disabled={isAiGenerating}
            title={
              currentDocument?.legalScore
                ? `Legal Score: ${currentDocument.legalScore.totalScore}/100 - Klicken für Details`
                : 'Legal Score wird automatisch berechnet...'
            }
          >
            {isAiGenerating && aiOperation === 'Legal Score berechnen' ? (
              <Loader2 size={14} className={styles.spinner} />
            ) : (
              <ShieldCheck size={14} />
            )}
            <span>
              {currentDocument?.legalScore
                ? `${currentDocument.legalScore.totalScore}`
                : '—'}
            </span>
          </button>

          {/* Actions */}
          <div className={styles.mainActions}>
            <button
              className={`${styles.iconButton} ${showAiAssistant ? styles.active : ''}`}
              onClick={() => setShowAiAssistant(!showAiAssistant)}
              title="KI-Assistent"
            >
              <Sparkles size={16} />
            </button>

            <button
              className={styles.iconButton}
              onClick={handleExportPdf}
              disabled={isExporting}
              title="Als PDF exportieren"
            >
              {isExporting ? (
                <Loader2 size={16} className={styles.spinner} />
              ) : (
                <Download size={16} />
              )}
            </button>

            <button
              className={`${styles.saveButton} ${isSaving ? styles.saving : ''} ${saveSuccess ? styles.saveSuccess : ''}`}
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <Loader2 size={16} className={styles.spinner} />
              ) : saveSuccess ? (
                <Check size={16} />
              ) : (
                <Save size={16} />
              )}
              <span>{saveSuccess ? 'Gespeichert!' : 'Speichern'}</span>
            </button>
          </div>

          {/* Mehr-Menü */}
          <div className={styles.moreMenuWrapper}>
            <button
              className={`${styles.iconButton} ${showMoreMenu ? styles.active : ''}`}
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              title="Mehr"
            >
              <MoreVertical size={16} />
            </button>

            {showMoreMenu && (
              <div className={styles.moreMenu}>
                <button onClick={handleDuplicate}>
                  <Copy size={14} />
                  <span>Dokument duplizieren</span>
                </button>
                <button onClick={handleExportTemplate}>
                  <FileOutput size={14} />
                  <span>Als Vorlage exportieren</span>
                </button>
                <button onClick={handlePrint}>
                  <Printer size={14} />
                  <span>Drucken</span>
                </button>
                <div className={styles.menuDivider} />
                <button onClick={handleCloseDocument} className={styles.dangerItem}>
                  <Trash2 size={14} />
                  <span>Schließen</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className={styles.mainContent}>
        {/* Left Sidebar - Block Toolbar */}
        {showLeftPanel && view === 'edit' && (
          <aside className={styles.leftSidebar}>
            <BlockToolbar />
          </aside>
        )}

        {/* Panel Toggle Button - positioniert am rechten Rand der Sidebar */}
        {view === 'edit' && showLeftPanel && (
          <button
            className={styles.panelToggle}
            onClick={() => setShowLeftPanel(false)}
            title="Panel schließen"
          >
            <PanelLeftClose size={16} />
          </button>
        )}

        {/* Show Panel Button - wenn Sidebar geschlossen */}
        {view === 'edit' && !showLeftPanel && (
          <button
            className={styles.showPanelButton}
            onClick={() => setShowLeftPanel(true)}
            title="Blöcke anzeigen"
          >
            <PanelLeftClose size={16} style={{ transform: 'rotate(180deg)' }} />
          </button>
        )}

        {/* Canvas */}
        <main className={styles.canvasWrapper}>
          <BuilderCanvas />
        </main>

        {/* Right Sidebar */}
        {view === 'edit' && (
          <aside className={styles.rightSidebar}>
            {/* Panel Tabs */}
            <div className={styles.panelTabs}>
              <button
                className={`${styles.panelTab} ${rightPanel === 'properties' ? styles.active : ''}`}
                onClick={() => setRightPanel(rightPanel === 'properties' ? null : 'properties')}
                title="Eigenschaften"
              >
                <Settings size={16} />
              </button>
              <button
                className={`${styles.panelTab} ${rightPanel === 'variables' ? styles.active : ''}`}
                onClick={() => setRightPanel(rightPanel === 'variables' ? null : 'variables')}
                title="Variablen"
              >
                <FileText size={16} />
              </button>
            </div>

            {/* Panel Content */}
            {rightPanel === 'properties' && <PropertiesPanel />}
            {rightPanel === 'variables' && <VariablesPanel />}
          </aside>
        )}

        {/* KI-Assistent Sidebar */}
        {showAiAssistant && view === 'edit' && (
          <aside className={styles.aiAssistantSidebar}>
            <div className={styles.aiAssistantHeader}>
              <div className={styles.aiAssistantTitle}>
                <Sparkles size={18} />
                <span>KI-Assistent</span>
              </div>
              <button
                className={styles.closeButton}
                onClick={() => setShowAiAssistant(false)}
              >
                <X size={16} />
              </button>
            </div>

            <div className={styles.aiAssistantContent}>
              <div className={styles.aiQuickActions}>
                <h4>Schnellaktionen</h4>
                <button onClick={() => setShowAiClauseModal(true)}>
                  <Sparkles size={14} />
                  <span>Klausel generieren</span>
                </button>
                <button
                  onClick={handleLegalCheck}
                  disabled={isCalculatingScore || !currentDocument}
                >
                  {isCalculatingScore ? (
                    <Loader2 size={14} className={styles.spinner} />
                  ) : (
                    <ShieldCheck size={14} />
                  )}
                  <span>{isCalculatingScore ? 'Prüfe...' : 'Rechtsprüfung starten'}</span>
                </button>
                <button
                  onClick={handleOptimize}
                  disabled={isOptimizing || !selectedBlockId}
                  title={!selectedBlockId ? 'Wählen Sie zuerst eine Klausel aus' : ''}
                >
                  {isOptimizing ? (
                    <Loader2 size={14} className={styles.spinner} />
                  ) : (
                    <Edit3 size={14} />
                  )}
                  <span>{isOptimizing ? 'Optimiere...' : 'Formulierung optimieren'}</span>
                </button>
              </div>

              <div className={styles.aiChatSection}>
                <h4>Fragen zum Vertrag</h4>
                <p className={styles.aiHint}>
                  Der KI-Assistent kann Ihnen bei rechtlichen Fragen zu Ihrem Vertrag helfen.
                </p>
                <div className={styles.aiComingSoon}>
                  <Sparkles size={24} />
                  <span>Chat-Funktion kommt bald</span>
                </div>
              </div>
            </div>
          </aside>
        )}
      </div>

      {/* KI-Klausel Modal */}
      {showAiClauseModal && (
        <div className={styles.modalOverlay} onClick={() => setShowAiClauseModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalTitle}>
                <Sparkles size={20} />
                <span>KI-Klausel generieren</span>
              </div>
              <button
                className={styles.modalClose}
                onClick={() => setShowAiClauseModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className={styles.modalContent}>
              <label className={styles.inputLabel}>
                Beschreiben Sie, welche Klausel Sie benötigen:
              </label>
              <textarea
                className={styles.aiPromptInput}
                placeholder="z.B. 'Eine Haftungsausschlussklausel für Softwaredienstleistungen' oder 'Kündigungsfristen für einen Arbeitsvertrag'"
                value={aiClausePrompt}
                onChange={(e) => setAiClausePrompt(e.target.value)}
                rows={4}
              />

              <div className={styles.aiSuggestions}>
                <span className={styles.suggestionLabel}>Vorschläge:</span>
                <button onClick={() => setAiClausePrompt('Haftungsausschluss für Softwaredienstleistungen')}>
                  Haftungsausschluss
                </button>
                <button onClick={() => setAiClausePrompt('Vertraulichkeitsklausel für sensible Geschäftsdaten')}>
                  Vertraulichkeit
                </button>
                <button onClick={() => setAiClausePrompt('Kündigungsklausel mit 3 Monaten Frist')}>
                  Kündigung
                </button>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button
                className={styles.cancelButton}
                onClick={() => setShowAiClauseModal(false)}
              >
                Abbrechen
              </button>
              <button
                className={styles.generateButton}
                onClick={handleGenerateClause}
                disabled={!aiClausePrompt.trim() || isGeneratingClause}
              >
                {isGeneratingClause ? (
                  <>
                    <Loader2 size={16} className={styles.spinner} />
                    <span>Generiere...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    <span>Generieren</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Click-Outside Handler für Mehr-Menü */}
      {showMoreMenu && (
        <div
          className={styles.menuBackdrop}
          onClick={() => setShowMoreMenu(false)}
        />
      )}

      {/* Keyboard Shortcuts Modal */}
      {showShortcutsModal && (
        <div className={styles.modalOverlay} onClick={() => setShowShortcutsModal(false)}>
          <div className={`${styles.modal} ${styles.shortcutsModal}`} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalTitle}>
                <Keyboard size={20} />
                <span>Tastenkürzel</span>
              </div>
              <button
                className={styles.modalClose}
                onClick={() => setShowShortcutsModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className={styles.shortcutsContent}>
              <div className={styles.shortcutsCategory}>
                <h4>Allgemein</h4>
                <div className={styles.shortcutRow}>
                  <span className={styles.shortcutKeys}><kbd>Strg</kbd> + <kbd>S</kbd></span>
                  <span className={styles.shortcutDesc}>Dokument speichern</span>
                </div>
                <div className={styles.shortcutRow}>
                  <span className={styles.shortcutKeys}><kbd>Strg</kbd> + <kbd>/</kbd></span>
                  <span className={styles.shortcutDesc}>Tastenkürzel anzeigen</span>
                </div>
                <div className={styles.shortcutRow}>
                  <span className={styles.shortcutKeys}><kbd>Strg</kbd> + <kbd>P</kbd></span>
                  <span className={styles.shortcutDesc}>Vorschau/Bearbeiten umschalten</span>
                </div>
                <div className={styles.shortcutRow}>
                  <span className={styles.shortcutKeys}><kbd>Esc</kbd></span>
                  <span className={styles.shortcutDesc}>Modal/Menü schließen</span>
                </div>
              </div>

              <div className={styles.shortcutsCategory}>
                <h4>Bearbeitung</h4>
                <div className={styles.shortcutRow}>
                  <span className={styles.shortcutKeys}><kbd>Strg</kbd> + <kbd>Z</kbd></span>
                  <span className={styles.shortcutDesc}>Rückgängig</span>
                </div>
                <div className={styles.shortcutRow}>
                  <span className={styles.shortcutKeys}><kbd>Strg</kbd> + <kbd>Shift</kbd> + <kbd>Z</kbd></span>
                  <span className={styles.shortcutDesc}>Wiederherstellen</span>
                </div>
                <div className={styles.shortcutRow}>
                  <span className={styles.shortcutKeys}><kbd>Strg</kbd> + <kbd>B</kbd></span>
                  <span className={styles.shortcutDesc}>Neue Klausel hinzufügen</span>
                </div>
                <div className={styles.shortcutRow}>
                  <span className={styles.shortcutKeys}><kbd>Strg</kbd> + <kbd>D</kbd></span>
                  <span className={styles.shortcutDesc}>Block duplizieren</span>
                </div>
              </div>

              <div className={styles.shortcutsCategory}>
                <h4>Navigation</h4>
                <div className={styles.shortcutRow}>
                  <span className={styles.shortcutKeys}><kbd>↑</kbd> / <kbd>↓</kbd></span>
                  <span className={styles.shortcutDesc}>Block wechseln</span>
                </div>
                <div className={styles.shortcutRow}>
                  <span className={styles.shortcutKeys}><kbd>Entf</kbd></span>
                  <span className={styles.shortcutDesc}>Ausgewählten Block löschen</span>
                </div>
              </div>

              <div className={styles.shortcutsCategory}>
                <h4>Zoom</h4>
                <div className={styles.shortcutRow}>
                  <span className={styles.shortcutKeys}><kbd>Strg</kbd> + <kbd>+</kbd></span>
                  <span className={styles.shortcutDesc}>Vergrößern</span>
                </div>
                <div className={styles.shortcutRow}>
                  <span className={styles.shortcutKeys}><kbd>Strg</kbd> + <kbd>-</kbd></span>
                  <span className={styles.shortcutDesc}>Verkleinern</span>
                </div>
                <div className={styles.shortcutRow}>
                  <span className={styles.shortcutKeys}><kbd>Strg</kbd> + <kbd>0</kbd></span>
                  <span className={styles.shortcutDesc}>Zoom zurücksetzen</span>
                </div>
              </div>

              <div className={styles.shortcutsTip}>
                <Sparkles size={14} />
                <span>Tipp: Nutze die KI-Klausel-Generierung im Assistent-Panel für schnellere Vertragserstellung!</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Legal Score Modal */}
      {showLegalScoreModal && currentDocument?.legalScore && (
        <div className={styles.modalOverlay} onClick={() => setShowLegalScoreModal(false)}>
          <div className={`${styles.modal} ${styles.legalScoreModal}`} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalTitle}>
                <ShieldCheck size={20} />
                <span>Rechtsprüfung Ergebnis</span>
              </div>
              <button
                className={styles.modalClose}
                onClick={() => setShowLegalScoreModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className={styles.legalScoreContent}>
              {/* Overall Score */}
              <div className={styles.scoreOverview}>
                <div
                  className={styles.scoreCircle}
                  style={{
                    '--score-color': currentDocument.legalScore.totalScore >= 80 ? '#10b981' :
                                     currentDocument.legalScore.totalScore >= 60 ? '#f59e0b' : '#ef4444'
                  } as React.CSSProperties}
                >
                  <span className={styles.scoreValue}>{currentDocument.legalScore.totalScore}</span>
                  <span className={styles.scoreLabel}>von 100</span>
                </div>
                <div className={styles.scoreInfo}>
                  <h4 className={styles.scoreTitle}>
                    {currentDocument.legalScore.totalScore >= 80 ? 'Sehr gut' :
                     currentDocument.legalScore.totalScore >= 60 ? 'Gut mit Hinweisen' : 'Verbesserungsbedarf'}
                  </h4>
                  <p className={styles.scoreDescription}>
                    {currentDocument.legalScore.totalScore >= 80
                      ? 'Ihr Vertrag erfüllt die wichtigsten rechtlichen Standards.'
                      : currentDocument.legalScore.totalScore >= 60
                      ? 'Es gibt einige Punkte, die Sie überprüfen sollten.'
                      : 'Wir empfehlen eine Überarbeitung wichtiger Klauseln.'}
                  </p>
                </div>
              </div>

              {/* Findings - Critical & Warnings */}
              {currentDocument.legalScore.findings && (
                (currentDocument.legalScore.findings.critical.length > 0 || currentDocument.legalScore.findings.warnings.length > 0) && (
                <div className={styles.legalIssues}>
                  <h4><AlertTriangle size={16} /> Hinweise & Verbesserungen</h4>
                  <ul>
                    {currentDocument.legalScore.findings.critical.map((finding, index) => (
                      <li key={`critical-${index}`} className={styles.issueItem}>
                        <span className={`${styles.issueSeverity} ${styles.high}`}>Kritisch</span>
                        <span className={styles.issueText}>{finding.message}</span>
                      </li>
                    ))}
                    {currentDocument.legalScore.findings.warnings.map((finding, index) => (
                      <li key={`warning-${index}`} className={styles.issueItem}>
                        <span className={`${styles.issueSeverity} ${styles.medium}`}>Warnung</span>
                        <span className={styles.issueText}>{finding.message}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}

              {/* Categories */}
              {currentDocument.legalScore.categories && (
                <div className={styles.legalCategories}>
                  <h4><TrendingUp size={16} /> Kategorien</h4>
                  <div className={styles.categoryGrid}>
                    <div className={styles.categoryItem}>
                      <span className={styles.categoryName}>Vollständigkeit</span>
                      <div className={styles.categoryBar}>
                        <div className={styles.categoryFill} style={{ width: `${currentDocument.legalScore.categories.completeness}%`, background: currentDocument.legalScore.categories.completeness >= 80 ? '#10b981' : currentDocument.legalScore.categories.completeness >= 60 ? '#f59e0b' : '#ef4444' }} />
                      </div>
                      <span className={styles.categoryScore}>{currentDocument.legalScore.categories.completeness}%</span>
                    </div>
                    <div className={styles.categoryItem}>
                      <span className={styles.categoryName}>Rechtliche Präzision</span>
                      <div className={styles.categoryBar}>
                        <div className={styles.categoryFill} style={{ width: `${currentDocument.legalScore.categories.legalPrecision}%`, background: currentDocument.legalScore.categories.legalPrecision >= 80 ? '#10b981' : currentDocument.legalScore.categories.legalPrecision >= 60 ? '#f59e0b' : '#ef4444' }} />
                      </div>
                      <span className={styles.categoryScore}>{currentDocument.legalScore.categories.legalPrecision}%</span>
                    </div>
                    <div className={styles.categoryItem}>
                      <span className={styles.categoryName}>Ausgewogenheit</span>
                      <div className={styles.categoryBar}>
                        <div className={styles.categoryFill} style={{ width: `${currentDocument.legalScore.categories.balance}%`, background: currentDocument.legalScore.categories.balance >= 80 ? '#10b981' : currentDocument.legalScore.categories.balance >= 60 ? '#f59e0b' : '#ef4444' }} />
                      </div>
                      <span className={styles.categoryScore}>{currentDocument.legalScore.categories.balance}%</span>
                    </div>
                    <div className={styles.categoryItem}>
                      <span className={styles.categoryName}>Klarheit</span>
                      <div className={styles.categoryBar}>
                        <div className={styles.categoryFill} style={{ width: `${currentDocument.legalScore.categories.clarity}%`, background: currentDocument.legalScore.categories.clarity >= 80 ? '#10b981' : currentDocument.legalScore.categories.clarity >= 60 ? '#f59e0b' : '#ef4444' }} />
                      </div>
                      <span className={styles.categoryScore}>{currentDocument.legalScore.categories.clarity}%</span>
                    </div>
                    <div className={styles.categoryItem}>
                      <span className={styles.categoryName}>Durchsetzbarkeit</span>
                      <div className={styles.categoryBar}>
                        <div className={styles.categoryFill} style={{ width: `${currentDocument.legalScore.categories.enforceability}%`, background: currentDocument.legalScore.categories.enforceability >= 80 ? '#10b981' : currentDocument.legalScore.categories.enforceability >= 60 ? '#f59e0b' : '#ef4444' }} />
                      </div>
                      <span className={styles.categoryScore}>{currentDocument.legalScore.categories.enforceability}%</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className={styles.modalFooter}>
              <button
                className={styles.generateButton}
                onClick={() => setShowLegalScoreModal(false)}
              >
                <CheckCircle size={16} />
                <span>Verstanden</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Optimierung Modal */}
      {showOptimizeModal && optimizeResult && (
        <div className={styles.modalOverlay} onClick={() => setShowOptimizeModal(false)}>
          <div className={`${styles.modal} ${styles.optimizeModal}`} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalTitle}>
                <Sparkles size={20} />
                <span>Optimierungsvorschlag</span>
              </div>
              <button
                className={styles.modalClose}
                onClick={() => setShowOptimizeModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className={styles.optimizeContent}>
              {/* Improvements List */}
              <div className={styles.improvementsList}>
                <h4><CheckCircle size={16} /> Verbesserungen</h4>
                <ul>
                  {optimizeResult.improvements.map((imp, index) => (
                    <li key={index}>{imp}</li>
                  ))}
                </ul>
              </div>

              {/* Side by Side Comparison */}
              <div className={styles.textComparison}>
                <div className={styles.comparisonColumn}>
                  <h5>Original</h5>
                  <div className={styles.comparisonText}>{optimizeResult.original}</div>
                </div>
                <div className={styles.comparisonColumn}>
                  <h5>Optimiert</h5>
                  <div className={styles.comparisonText}>{optimizeResult.optimized}</div>
                </div>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button
                className={styles.cancelButton}
                onClick={() => setShowOptimizeModal(false)}
              >
                Abbrechen
              </button>
              <button
                className={styles.generateButton}
                onClick={handleApplyOptimization}
              >
                <CheckCircle size={16} />
                <span>Änderung übernehmen</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Vertragstyp-Auswahl Modal */}
      <ContractTypeSelector
        isOpen={showTypeSelector}
        onClose={() => {
          // Wenn geschlossen ohne Auswahl, erstelle leere Vorlage
          if (!currentDocument) {
            handleTemplateSelect('individuell');
          } else {
            setShowTypeSelector(false);
          }
        }}
        onSelect={handleTemplateSelect}
        savedDrafts={savedDrafts}
        isLoadingDrafts={isLoadingDrafts}
        onLoadDraft={handleLoadDraft}
        onDeleteDraft={handleDeleteDraft}
        onRenameDraft={handleRenameDraft}
        onDuplicateDraft={handleDuplicateDraft}
      />
    </div>
  );
};

export default ContractBuilder;
