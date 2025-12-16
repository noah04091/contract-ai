/**
 * ContractBuilder Page - ContractForge Hauptseite
 * Der visuelle Vertragsbaukasten
 */

import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import html2pdf from 'html2pdf.js';
import { useContractBuilderStore } from '../stores/contractBuilderStore';
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
} from 'lucide-react';
import styles from '../styles/ContractBuilder.module.css';

type RightPanel = 'properties' | 'variables' | null;

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

  const {
    document: currentDocument,
    isLoading,
    error,
    view,
    zoom,
    canUndo,
    canRedo,
    isLocalMode,
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
    updateMetadata,
    generateClause,
  } = useContractBuilderStore();

  // Dokument laden oder Typ-Auswahl zeigen
  useEffect(() => {
    if (id) {
      loadDocument(id);
    } else if (!currentDocument) {
      // Bei neuem Dokument ohne existierendes Dokument: Typ-Auswahl Modal zeigen
      setShowTypeSelector(true);
    }
  }, [id, loadDocument, currentDocument]);

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

  // PDF Export - Rendert jede Seite einzeln
  const handleExportPdf = async () => {
    // Finde alle Paper-Elemente (jede Seite ist ein separates Paper)
    const paperElements = document.querySelectorAll(`.${styles.canvasWrapper} [class*="paper"]`);
    if (!paperElements || paperElements.length === 0) {
      console.error('Paper elements not found');
      return;
    }

    setIsExporting(true);

    // Temporäre Klasse für sauberen Export hinzufügen
    document.body.classList.add('pdf-export-mode');

    try {
      const filename = `${currentDocument?.metadata.name || 'Vertrag'}.pdf`;

      const opt = {
        margin: 0,
        filename,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          letterRendering: true,
          // Ignoriere Editor-UI-Elemente
          ignoreElements: (element: Element) => {
            const classList = element.classList;
            if (!classList) return false;
            // Ignoriere Drag-Handles, Block-Controls, Separators, etc.
            return (
              classList.contains('blockControls') ||
              classList.contains('dragHandle') ||
              classList.contains('riskIndicator') ||
              classList.contains('selectionBorder') ||
              classList.contains('pageSeparatorLabel') ||
              classList.contains('zoomIndicator') ||
              element.getAttribute('data-no-export') === 'true'
            );
          },
        },
        jsPDF: {
          unit: 'mm',
          format: 'a4',
          orientation: 'portrait' as const
        },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
      };

      // Erstelle ein Container-Element mit allen Seiten
      const exportContainer = document.createElement('div');
      exportContainer.style.cssText = 'position: absolute; left: -9999px; top: 0;';

      paperElements.forEach((paper, index) => {
        const clone = paper.cloneNode(true) as HTMLElement;
        // Entferne Editor-spezifische Elemente
        clone.querySelectorAll('[class*="blockControls"], [class*="dragHandle"], [class*="riskIndicator"], [class*="selectionBorder"], [class*="statusIcons"]').forEach(el => el.remove());
        // Style für sauberen Export
        clone.style.cssText = 'width: 210mm; height: 297mm; box-shadow: none; margin: 0; page-break-after: always;';
        if (index === paperElements.length - 1) {
          clone.style.pageBreakAfter = 'auto';
        }
        exportContainer.appendChild(clone);
      });

      document.body.appendChild(exportContainer);

      await html2pdf().set(opt).from(exportContainer).save();

      // Cleanup
      document.body.removeChild(exportContainer);
    } catch (error) {
      console.error('PDF export failed:', error);
    } finally {
      document.body.classList.remove('pdf-export-mode');
      setIsExporting(false);
    }
  };

  // Zoom Controls
  const handleZoomIn = () => setZoom(Math.min(200, zoom + 10));
  const handleZoomOut = () => setZoom(Math.max(50, zoom - 10));
  const handleZoomReset = () => setZoom(100);

  // Mehr-Menü Actions
  const handleDuplicate = async () => {
    setShowMoreMenu(false);
    if (currentDocument) {
      await createDocument(`${currentDocument.metadata.name} (Kopie)`, currentDocument.metadata.contractType);
    }
  };

  const handlePrint = () => {
    setShowMoreMenu(false);
    window.print();
  };

  const handleExportTemplate = () => {
    setShowMoreMenu(false);
    // Template Export - JSON Download
    if (currentDocument) {
      const template = {
        name: currentDocument.metadata.name,
        type: currentDocument.metadata.contractType,
        blocks: currentDocument.content.blocks,
        design: currentDocument.design,
      };
      const blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${currentDocument.metadata.name}_template.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  // KI-Klausel generieren
  const handleGenerateClause = async () => {
    if (!aiClausePrompt.trim()) return;

    setIsGeneratingClause(true);
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

      // Optional: Vorgeschlagene Variablen könnten hier zum Dokument hinzugefügt werden
      console.log('[ContractBuilder] KI-Klausel generiert:', {
        title: generatedClause.content.clauseTitle,
        legalBasis: result.legalBasis,
        riskLevel: result.riskLevel,
        suggestedVariables: result.suggestedVariables,
      });
    } catch (error) {
      console.error('Fehler bei KI-Generierung:', error);
      // Fallback: Zeige Fehlermeldung im UI
      alert('Fehler bei der KI-Generierung. Bitte versuchen Sie es erneut.');
    } finally {
      setIsGeneratingClause(false);
    }
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

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
          <button
            className={styles.backButton}
            onClick={() => navigate('/contracts')}
            title="Zurück"
          >
            <ChevronLeft size={18} />
          </button>

          <div className={styles.documentInfo}>
            <FileText size={16} className={styles.documentIcon} />
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
                <button onClick={() => { setShowMoreMenu(false); navigate('/contracts'); }} className={styles.dangerItem}>
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
            <button
              className={styles.panelToggle}
              onClick={() => setShowLeftPanel(false)}
              title="Panel schließen"
            >
              <PanelLeftClose size={16} />
            </button>
          </aside>
        )}

        {/* Toggle Left Panel */}
        {!showLeftPanel && view === 'edit' && (
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
                <button onClick={() => alert('Rechtsprüfung - Coming Soon!')}>
                  <FileText size={14} />
                  <span>Rechtsprüfung starten</span>
                </button>
                <button onClick={() => alert('Formulierung optimieren - Coming Soon!')}>
                  <Edit3 size={14} />
                  <span>Formulierung optimieren</span>
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

      {/* Vertragstyp-Auswahl Modal */}
      <ContractTypeSelector
        isOpen={showTypeSelector}
        onClose={() => {
          // Wenn geschlossen ohne Auswahl, navigiere zurück
          if (!currentDocument) {
            navigate('/contracts');
          }
          setShowTypeSelector(false);
        }}
        onSelect={handleTemplateSelect}
      />
    </div>
  );
};

export default ContractBuilder;
