/**
 * ContractBuilder Page - ContractForge Hauptseite
 * Der visuelle Vertragsbaukasten
 */

import React, { useEffect, useState, useRef } from 'react';
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
      console.log('[ContractBuilder] Variable ausgewählt:', selectedVariableId, '→ Wechsle zu Variables-Panel');
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
      console.log('[ContractBuilder] Auto-Calculate Legal Score (nach Änderung)');
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

  // PDF Export - Generiert HTML aus Block-Daten
  const handleExportPdf = async () => {
    setIsExporting(true);

    try {
      const filename = `${currentDocument?.metadata.name || 'Vertrag'}.pdf`;

      // Prüfe ob Dokument vorhanden
      if (!currentDocument) {
        throw new Error('Kein Dokument geladen');
      }

      // Sammle den Inhalt aller Blöcke
      const blocks = currentDocument.content?.blocks || [];
      const variables = currentDocument.content?.variables || [];

      console.log('[PDF Export] Blocks:', blocks.length, 'Variables:', variables.length);

      if (blocks.length === 0) {
        throw new Error('Keine Blöcke im Dokument');
      }

      // Variable-Werte als Map
      const varValues = new Map<string, string>();
      variables.forEach((v: { name: string; value?: string | number | Date }) => {
        if (v.value !== undefined && v.value !== '') {
          const cleanName = v.name.replace(/^\{\{|\}\}$/g, '');
          if (v.value instanceof Date) {
            varValues.set(cleanName, v.value.toLocaleDateString('de-DE'));
          } else {
            varValues.set(cleanName, String(v.value));
          }
        }
      });

      // Funktion zum Ersetzen von Variablen im Text
      const replaceVariables = (text: string): string => {
        if (!text) return '';
        return text.replace(/\{\{([^}]+)\}\}/g, (match, varName) => {
          const value = varValues.get(varName.trim());
          return value || match;
        });
      };

      // Escape HTML für Sicherheit
      const escapeHtml = (text: string): string => {
        if (!text) return '';
        return text
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#039;');
      };

      // Baue HTML-String aus den Block-Daten
      let htmlContent = '';

      blocks.forEach((block: { type: string; content: Record<string, unknown> }) => {
        const content = block.content || {};

        switch (block.type) {
          case 'header': {
            const title = escapeHtml(replaceVariables(content.title as string || ''));
            const subtitle = escapeHtml(replaceVariables(content.subtitle as string || ''));
            htmlContent += `
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="font-size: 22pt; font-weight: 700; margin: 0 0 8px 0; color: #1a365d;">
                  ${title || 'Vertrag'}
                </h1>
                ${subtitle ? `<p style="font-size: 12pt; color: #4a5568; margin: 0;">${subtitle}</p>` : ''}
              </div>
            `;
            break;
          }

          case 'parties': {
            const party1 = content.party1 as { role?: string; name?: string; address?: string } || {};
            const party2 = content.party2 as { role?: string; name?: string; address?: string } || {};
            htmlContent += `
              <table style="width: 100%; margin-bottom: 25px; border-collapse: collapse;">
                <tr>
                  <td style="width: 48%; vertical-align: top; padding: 15px; background: #f7fafc; border-radius: 6px;">
                    <p style="font-weight: 600; color: #2d3748; margin: 0 0 8px 0;">${escapeHtml(party1.role || 'Partei 1')}</p>
                    <p style="margin: 0; color: #1a202c;">${escapeHtml(replaceVariables(party1.name || ''))}</p>
                    <p style="margin: 4px 0 0 0; font-size: 10pt; color: #718096;">${escapeHtml(replaceVariables(party1.address || ''))}</p>
                  </td>
                  <td style="width: 4%;"></td>
                  <td style="width: 48%; vertical-align: top; padding: 15px; background: #f7fafc; border-radius: 6px;">
                    <p style="font-weight: 600; color: #2d3748; margin: 0 0 8px 0;">${escapeHtml(party2.role || 'Partei 2')}</p>
                    <p style="margin: 0; color: #1a202c;">${escapeHtml(replaceVariables(party2.name || ''))}</p>
                    <p style="margin: 4px 0 0 0; font-size: 10pt; color: #718096;">${escapeHtml(replaceVariables(party2.address || ''))}</p>
                  </td>
                </tr>
              </table>
            `;
            break;
          }

          case 'clause': {
            const clauseNum = content.number as string || '';
            const clauseTitle = escapeHtml(replaceVariables(content.clauseTitle as string || content.title as string || ''));
            const body = escapeHtml(replaceVariables(content.body as string || ''));
            const subclauses = content.subclauses as Array<{ number: string; text: string }> || [];

            htmlContent += `
              <div style="margin-bottom: 20px;">
                <h3 style="font-size: 12pt; font-weight: 600; color: #1a365d; margin: 0 0 10px 0;">
                  ${clauseNum ? `§ ${escapeHtml(clauseNum)} ` : ''}${clauseTitle}
                </h3>
                <p style="margin: 0 0 10px 0; text-align: justify;">${body}</p>
                ${subclauses.length > 0 ? `
                  <div style="margin-left: 20px;">
                    ${subclauses.map(sc => `
                      <p style="margin: 6px 0;"><strong>${escapeHtml(sc.number)}</strong> ${escapeHtml(replaceVariables(sc.text))}</p>
                    `).join('')}
                  </div>
                ` : ''}
              </div>
            `;
            break;
          }

          case 'preamble': {
            const preambleText = escapeHtml(replaceVariables(content.body as string || content.text as string || ''));
            htmlContent += `
              <div style="margin-bottom: 25px; padding: 15px; background: #f7fafc; border-left: 3px solid #3182ce; font-style: italic;">
                <p style="margin: 0;">${preambleText}</p>
              </div>
            `;
            break;
          }

          case 'signature': {
            const sigFields = content.signatureFields as Array<{ label: string; showDate?: boolean; showPlace?: boolean }> || [];
            if (sigFields.length > 0) {
              htmlContent += `
                <table style="width: 100%; margin-top: 50px; border-collapse: collapse;">
                  <tr>
                    ${sigFields.map(field => `
                      <td style="width: ${100 / sigFields.length}%; text-align: center; padding: 0 10px;">
                        <div style="border-top: 1px solid #2d3748; padding-top: 8px; margin-top: 60px;">
                          <p style="margin: 0; font-size: 10pt; color: #4a5568;">${escapeHtml(field.label)}</p>
                          ${field.showDate ? '<p style="margin: 4px 0 0 0; font-size: 9pt; color: #718096;">Datum: ________________</p>' : ''}
                          ${field.showPlace ? '<p style="margin: 4px 0 0 0; font-size: 9pt; color: #718096;">Ort: ________________</p>' : ''}
                        </div>
                      </td>
                    `).join('')}
                  </tr>
                </table>
              `;
            }
            break;
          }

          case 'divider':
            htmlContent += `<hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />`;
            break;

          case 'spacer':
            htmlContent += `<div style="height: 30px;"></div>`;
            break;

          case 'page-break':
            htmlContent += `<div style="page-break-after: always;"></div>`;
            break;

          case 'logo': {
            const logoUrl = content.logoUrl as string || content.imageUrl as string || '';
            if (logoUrl) {
              const logoWidth = content.width as number || 150;
              const alignment = content.alignment as string || 'center';
              htmlContent += `
                <div style="text-align: ${alignment}; margin-bottom: 20px;">
                  <img src="${logoUrl}" style="max-width: ${logoWidth}px; max-height: 100px;" />
                </div>
              `;
            }
            break;
          }

          default: {
            // Generischer Block
            const text = content.body as string || content.text as string;
            if (text) {
              htmlContent += `<p style="margin: 0 0 15px 0;">${escapeHtml(replaceVariables(text))}</p>`;
            }
          }
        }
      });

      console.log('[PDF Export] Generated HTML length:', htmlContent.length);

      // Erstelle Export-Container - WICHTIG: Muss im sichtbaren Bereich sein!
      const exportDiv = document.createElement('div');
      exportDiv.id = 'pdf-export-container';
      exportDiv.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 210mm;
        min-height: 297mm;
        padding: 20mm;
        box-sizing: border-box;
        background: white;
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        font-size: 11pt;
        line-height: 1.6;
        color: #1a202c;
        z-index: 9999;
        overflow: visible;
      `;

      exportDiv.innerHTML = htmlContent;
      document.body.appendChild(exportDiv);

      // Kurz warten bis DOM gerendert ist
      await new Promise(resolve => setTimeout(resolve, 100));

      console.log('[PDF Export] ExportDiv dimensions:', exportDiv.offsetWidth, 'x', exportDiv.offsetHeight);
      console.log('[PDF Export] ExportDiv innerHTML length:', exportDiv.innerHTML.length);

      const opt = {
        margin: 0,
        filename,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          logging: true, // Debug-Logging aktivieren
          backgroundColor: '#ffffff',
          windowWidth: 794,
          scrollX: 0,
          scrollY: 0,
        },
        jsPDF: {
          unit: 'mm' as const,
          format: 'a4' as const,
          orientation: 'portrait' as const
        },
      };

      await html2pdf().set(opt).from(exportDiv).save();

      // Aufräumen
      document.body.removeChild(exportDiv);
      console.log('[PDF Export] Success');

    } catch (error) {
      console.error('[PDF Export] Failed:', error);
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
      // Ctrl+/ oder Ctrl+? für Shortcuts Modal
      if ((e.ctrlKey || e.metaKey) && (e.key === '/' || e.key === '?')) {
        e.preventDefault();
        setShowShortcutsModal(prev => !prev);
      }
      // Escape zum Schließen von Modals
      if (e.key === 'Escape') {
        setShowShortcutsModal(false);
        setShowAiClauseModal(false);
        setShowMoreMenu(false);
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
            onClick={() => {
              // Zurück-Button zeigt Modal statt zum Dashboard zu navigieren
              setShowTypeSelector(true);
            }}
            title="Vorlage wechseln"
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
                  <span className={styles.shortcutKeys}><kbd>Strg</kbd> + <kbd>Y</kbd></span>
                  <span className={styles.shortcutDesc}>Wiederherstellen</span>
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
