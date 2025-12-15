/**
 * ContractBuilder Page - ContractForge Hauptseite
 * Der visuelle Vertragsbaukasten
 */

import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useContractBuilderStore } from '../stores/contractBuilderStore';
import {
  BuilderCanvas,
  BlockToolbar,
  PropertiesPanel,
  VariablesPanel,
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
} from 'lucide-react';
import styles from '../styles/ContractBuilder.module.css';

type RightPanel = 'properties' | 'variables' | null;

const ContractBuilder: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();

  const [rightPanel, setRightPanel] = useState<RightPanel>('properties');
  const [showLeftPanel, setShowLeftPanel] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const {
    document: currentDocument,
    isLoading,
    error,
    view,
    zoom,
    canUndo,
    canRedo,
    loadDocument,
    createDocument,
    saveDocument,
    setView,
    setZoom,
    undo,
    redo,
    clearError,
  } = useContractBuilderStore();

  // Dokument laden oder neues erstellen
  useEffect(() => {
    if (id) {
      loadDocument(id);
    } else {
      createDocument('Neuer Vertrag', 'individuell');
    }
  }, [id, loadDocument, createDocument]);

  // Speichern
  const handleSave = async () => {
    setIsSaving(true);
    try {
      await saveDocument();
    } finally {
      setIsSaving(false);
    }
  };

  // Zoom Controls
  const handleZoomIn = () => setZoom(Math.min(200, zoom + 10));
  const handleZoomOut = () => setZoom(Math.max(50, zoom - 10));
  const handleZoomReset = () => setZoom(100);

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

  // Loading State
  if (isLoading && !currentDocument) {
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
              onChange={() => {
                // TODO: Update metadata name
              }}
              placeholder="Vertragstitel"
            />
            <span className={styles.documentStatus}>
              {currentDocument?.metadata.status === 'draft' ? 'Entwurf' :
               currentDocument?.metadata.status === 'review' ? 'In Prüfung' :
               currentDocument?.metadata.status === 'final' ? 'Final' : 'Entwurf'}
            </span>
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
              className={styles.iconButton}
              title="KI-Assistent"
            >
              <Sparkles size={16} />
            </button>

            <button
              className={styles.iconButton}
              title="Exportieren"
            >
              <Download size={16} />
            </button>

            <button
              className={`${styles.saveButton} ${isSaving ? styles.saving : ''}`}
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <Loader2 size={16} className={styles.spinner} />
              ) : (
                <Save size={16} />
              )}
              <span>Speichern</span>
            </button>
          </div>

          <button className={styles.iconButton} title="Mehr">
            <MoreVertical size={16} />
          </button>
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
      </div>
    </div>
  );
};

export default ContractBuilder;
