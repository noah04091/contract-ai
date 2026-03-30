import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, FileText, File, Loader2, CheckCircle2, Mail, Copy, Check, Hammer } from 'lucide-react';
import { apiCall } from '../../utils/api';
import type { AnalysisResult, OptimizationMode, UserSelection } from '../../types/optimizerV2';
import { CATEGORY_LABELS, MODE_LABELS } from '../../types/optimizerV2';
import styles from '../../styles/OptimizerV2.module.css';

interface Props {
  result: AnalysisResult;
  userSelections?: Map<string, UserSelection>;
}

type DocxStep = 'idle' | 'selecting' | 'generating';

export default function ExportPanel({ result, userSelections }: Props) {
  const navigate = useNavigate();
  const optimizedCount = result.optimizations.filter(o => o.needsOptimization).length;
  const [downloading, setDownloading] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const showExportError = useCallback((msg: string) => {
    setExportError(msg);
    setTimeout(() => setExportError(null), 5000);
  }, []);

  // Count accepted clauses (user explicitly selected a version in Clauses tab)
  const acceptedCount = userSelections ? Array.from(userSelections.values()).filter(s => s.selectedVersion !== 'original').length : 0;

  // DOCX flow state
  const [docxStep, setDocxStep] = useState<DocxStep>('idle');
  const [docxMode, setDocxMode] = useState<OptimizationMode>('neutral');
  const [selectedClauses, setSelectedClauses] = useState<Set<string>>(() => {
    // If user has accepted clauses in the Clauses tab, use those
    if (userSelections && userSelections.size > 0) {
      return new Set(
        Array.from(userSelections.entries())
          .filter(([, sel]) => sel.selectedVersion !== 'original')
          .map(([clauseId]) => clauseId)
      );
    }
    // Fallback: pre-select all optimizable clauses
    return new Set(result.optimizations.filter(o => o.needsOptimization).map(o => o.clauseId));
  });
  const [generating, setGenerating] = useState(false);

  // Optimizable clauses with their data
  const optimizableClauses = useMemo(() => {
    return result.optimizations
      .filter(o => o.needsOptimization)
      .map(opt => {
        const clause = result.clauses.find(c => c.id === opt.clauseId);
        const analysis = result.clauseAnalyses.find(a => a.clauseId === opt.clauseId);
        return { opt, clause, analysis };
      })
      .filter(item => item.clause);
  }, [result]);

  const handlePdfExport = async () => {
    if (downloading || !result?.resultId) return;
    setDownloading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/optimizer-v2/results/${result.resultId}/pdf`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) {
        if (response.status === 403) throw new Error('SESSION_EXPIRED');
        throw new Error('EXPORT_FAILED');
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(result.structure?.contractTypeLabel || 'Analyse').replace(/\s+/g, '_')}_Bericht.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      showExportError(err instanceof Error && err.message === 'SESSION_EXPIRED'
        ? 'Sitzung abgelaufen — bitte Seite neu laden und erneut versuchen.'
        : 'Export fehlgeschlagen. Bitte versuchen Sie es erneut.');
    } finally {
      setDownloading(false);
    }
  };

  const handleDocxGenerate = async () => {
    if (generating || !result?.resultId) return;
    setGenerating(true);
    try {
      const token = localStorage.getItem('token');
      const selections = Array.from(selectedClauses).map(clauseId => {
        // Use per-clause accepted mode if available, otherwise fall back to global docxMode
        const userSel = userSelections?.get(clauseId);
        if (userSel?.selectedVersion === 'custom' && userSel.customText) {
          return { clauseId, mode: 'custom', customText: userSel.customText };
        }
        const mode = (userSel?.selectedVersion && userSel.selectedVersion !== 'original' && userSel.selectedVersion !== 'custom')
          ? userSel.selectedVersion as OptimizationMode
          : docxMode;
        return { clauseId, mode };
      });

      const response = await fetch(`/api/optimizer-v2/results/${result.resultId}/docx`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ selections, mode: docxMode })
      });

      if (!response.ok) {
        if (response.status === 403) throw new Error('SESSION_EXPIRED');
        const errData = await response.json().catch(() => null);
        throw new Error(errData?.message || 'EXPORT_FAILED');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(result.structure?.contractTypeLabel || 'Vertrag').replace(/\s+/g, '_')}_optimiert.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setDocxStep('idle');
    } catch (err) {
      showExportError(err instanceof Error && err.message === 'SESSION_EXPIRED'
        ? 'Sitzung abgelaufen — bitte Seite neu laden und erneut versuchen.'
        : 'Export fehlgeschlagen. Bitte versuchen Sie es erneut.');
    } finally {
      setGenerating(false);
    }
  };

  const toggleClause = (clauseId: string) => {
    setSelectedClauses(prev => {
      const next = new Set(prev);
      if (next.has(clauseId)) next.delete(clauseId);
      else next.add(clauseId);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedClauses.size === optimizableClauses.length) {
      setSelectedClauses(new Set());
    } else {
      setSelectedClauses(new Set(optimizableClauses.map(c => c.opt.clauseId)));
    }
  };

  // ── Contract Builder Import ──
  const [builderLoading, setBuilderLoading] = useState(false);

  const handleOpenInBuilder = async () => {
    if (builderLoading) return;
    setBuilderLoading(true);
    try {
      // Collect selections: all selected optimizations + accepted clauses
      const selections = Array.from(selectedClauses).map(clauseId => {
        const userSel = userSelections?.get(clauseId);
        if (userSel?.selectedVersion === 'custom' && userSel.customText) {
          return { clauseId, mode: 'custom', customText: userSel.customText };
        }
        const mode = (userSel?.selectedVersion && userSel.selectedVersion !== 'original' && userSel.selectedVersion !== 'custom')
          ? userSel.selectedVersion
          : docxMode;
        return { clauseId, mode };
      });

      const data = await apiCall('/contract-builder/import-from-optimizer', {
        method: 'POST',
        body: JSON.stringify({
          resultId: result.resultId,
          selections,
          mode: docxMode
        })
      }) as { success?: boolean; documentId?: string; redirectUrl?: string };

      if (data?.success && data.redirectUrl) {
        navigate(data.redirectUrl);
      }
    } catch {
      showExportError('Contract Builder konnte nicht geöffnet werden.');
    } finally {
      setBuilderLoading(false);
    }
  };

  // ── Email Pitch Templates ──
  type PitchStyle = 'lawyer' | 'business' | 'private';
  const [activePitch, setActivePitch] = useState<PitchStyle | null>(null);
  const [copiedPitch, setCopiedPitch] = useState(false);

  const pitchMeta: { key: PitchStyle; label: string; desc: string }[] = [
    { key: 'lawyer', label: 'An Anwalt', desc: 'Formell – für juristische Prüfung' },
    { key: 'business', label: 'An Geschäftspartner', desc: 'Professionell – Nachverhandlung' },
    { key: 'private', label: 'Privat', desc: 'Einfach – z. B. Vermieter, Dienstleister' },
  ];

  const criticalClauses = useMemo(() =>
    result.clauseAnalyses.filter(a => a.importanceLevel === 'critical' || a.importanceLevel === 'high'),
    [result.clauseAnalyses]
  );

  const generatePitch = useCallback((style: PitchStyle): string => {
    const contractType = result.structure?.contractTypeLabel || 'Vertrag';
    const score = result.scores.overall;
    const clauseCount = result.clauses.length;

    // Build critical findings list
    const findings = criticalClauses.slice(0, 5).map(a => {
      const clause = result.clauses.find(c => c.id === a.clauseId);
      const title = clause?.title || 'Unbenannte Klausel';
      const level = a.importanceLevel === 'critical' ? 'KRITISCH' : 'WICHTIG';
      return `• ${title} [${level}]: ${a.summary || a.concerns?.[0] || 'Überprüfungsbedarf'}`;
    }).join('\n');

    const optimizableList = result.optimizations
      .filter(o => o.needsOptimization)
      .slice(0, 3)
      .map(o => {
        const clause = result.clauses.find(c => c.id === o.clauseId);
        return `• ${clause?.title || 'Klausel'}: ${o.negotiationAdvice?.substring(0, 80) || 'Optimierungspotenzial'}`;
      }).join('\n');

    if (style === 'lawyer') {
      return `Sehr geehrte Damen und Herren,

ich bitte um rechtliche Prüfung des beigefügten ${contractType}s. Eine KI-gestützte Voranalyse (Contract AI) hat folgende Ergebnisse ergeben:

**Gesamtbewertung:** ${score}/100 Punkte
**Analysierte Klauseln:** ${clauseCount}
**Optimierungsbedarf:** ${optimizedCount} Klauseln

${criticalClauses.length > 0 ? `**Identifizierte Schwachstellen:**\n${findings}\n` : ''}${optimizedCount > 0 ? `**Optimierungsvorschläge liegen vor für:**\n${optimizableList}\n` : ''}
Ich bitte um Ihre Einschätzung, insbesondere bezüglich der markierten Risiken und der vorgeschlagenen Alternativformulierungen.

Den vollständigen Analysebericht und den optimierten Vertragsentwurf sende ich als Anlage mit.

Mit freundlichen Grüßen`;
    }

    if (style === 'business') {
      return `Guten Tag,

vielen Dank für die Übersendung des ${contractType}s. Ich habe den Vertrag eingehend geprüft und möchte einige Punkte ansprechen:

**Bewertung:** ${score}/100 (${score >= 70 ? 'insgesamt solide Basis' : score >= 50 ? 'einige Anpassungen nötig' : 'wesentlicher Überarbeitungsbedarf'})

${criticalClauses.length > 0 ? `Folgende Punkte sollten wir besprechen:\n${findings}\n` : 'Der Vertrag ist in den wesentlichen Punkten gut aufgestellt.\n'}
${optimizedCount > 0 ? `Für ${optimizedCount} Klauseln habe ich konkrete Formulierungsvorschläge, die für beide Seiten eine fairere Regelung ermöglichen.\n` : ''}
${criticalClauses.length > 0 || optimizedCount > 0 ? 'Ich würde vorschlagen, dass wir die genannten Punkte in einem kurzen Gespräch klären. Wann passt es Ihnen?' : 'Gerne können wir den Vertrag bei Gelegenheit gemeinsam durchgehen. Wann passt es Ihnen?'}

Beste Grüße`;
    }

    // private
    return `Hallo,

ich habe mir den ${contractType} genau angeschaut und ein paar Anmerkungen:

Gesamteindruck: ${score}/100 – ${score >= 70 ? 'sieht grundsätzlich gut aus' : score >= 50 ? 'ein paar Sachen sollten wir anpassen' : 'da müssen wir noch einiges ändern'}.

${criticalClauses.length > 0 ? `Das sollten wir klären:\n${findings}\n` : ''}${optimizedCount > 0 ? `Bei ${optimizedCount} Stellen habe ich bessere Formulierungen, die fairer für beide Seiten wären.\n` : ''}
Können wir kurz darüber sprechen?

Viele Grüße`;
  }, [result, criticalClauses, optimizedCount]);

  const handleCopyPitch = useCallback(async (style: PitchStyle) => {
    const text = generatePitch(style);
    try {
      await navigator.clipboard.writeText(text);
      setCopiedPitch(true);
      setTimeout(() => setCopiedPitch(false), 2000);
    } catch {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopiedPitch(true);
      setTimeout(() => setCopiedPitch(false), 2000);
    }
  }, [generatePitch]);

  return (
    <div className={styles.exportPanel}>
      <h3 className={styles.exportTitle}>Ergebnisse exportieren</h3>
      <p className={styles.exportSubtitle}>
        {result.clauses.length} Klauseln analysiert, {optimizedCount} optimiert
      </p>

      <div className={styles.exportOptions}>
        {/* PDF Export */}
        <div className={styles.exportOption}>
          <div className={styles.exportOptionIcon}>
            <FileText size={24} />
          </div>
          <div className={styles.exportOptionInfo}>
            <h4>Analyse-Bericht (PDF)</h4>
            <p>Vollständiger Bericht mit Scores, Risiken und Empfehlungen</p>
          </div>
          <button
            className={styles.exportBtnActive}
            onClick={handlePdfExport}
            disabled={downloading}
          >
            {downloading ? <Loader2 size={14} className={styles.spinIcon} /> : <Download size={14} />}
            {downloading ? 'Erstelle...' : 'Herunterladen'}
          </button>
          {exportError && !downloading && (
            <p style={{ color: '#ef4444', fontSize: '0.75rem', margin: '4px 0 0', width: '100%', textAlign: 'right' }}>{exportError}</p>
          )}
        </div>

        {/* DOCX Export */}
        <div className={`${styles.exportOption} ${docxStep === 'selecting' ? styles.exportOptionExpanded : ''}`}>
          <div className={styles.exportOptionIcon}>
            <File size={24} />
          </div>
          <div className={styles.exportOptionInfo}>
            <h4>Optimierter Vertrag (DOCX)</h4>
            <p>Vertrag mit ausgewählten Optimierungen als Word-Dokument</p>
          </div>
          {docxStep === 'idle' ? (
            <button
              className={styles.exportBtnActive}
              onClick={() => setDocxStep('selecting')}
              disabled={optimizedCount === 0 || generating}
            >
              <File size={14} /> Erstellen
            </button>
          ) : (
            <button
              className={styles.exportBtn}
              onClick={() => setDocxStep('idle')}
              style={{ cursor: 'pointer' }}
            >
              Abbrechen
            </button>
          )}
        </div>
      </div>

      {/* ── DOCX Selection Panel ── */}
      {docxStep === 'selecting' && (
        <div className={styles.docxSelection}>
          <div className={styles.docxSelectionHeader}>
            <h4>Welche Optimierungen übernehmen?</h4>
            <p>
              {acceptedCount > 0
                ? `${acceptedCount} Klausel${acceptedCount !== 1 ? 'n' : ''} bereits in der Klauselansicht akzeptiert.`
                : 'Wähle die Klauseln aus, die im DOCX optimiert werden sollen.'}
            </p>
          </div>

          {/* Mode selector */}
          <div className={styles.docxModeRow}>
            <span className={styles.docxModeLabel}>Perspektive:</span>
            <div className={styles.docxModeButtons}>
              {(['neutral', 'proCreator', 'proRecipient'] as OptimizationMode[]).map(m => (
                <button
                  key={m}
                  className={`${styles.docxModeBtn} ${docxMode === m ? styles.docxModeBtnActive : ''}`}
                  onClick={() => setDocxMode(m)}
                  style={docxMode === m ? { borderColor: MODE_LABELS[m].color, color: MODE_LABELS[m].color } : {}}
                >
                  {MODE_LABELS[m].label}
                </button>
              ))}
            </div>
          </div>

          {/* Select all / none */}
          <div className={styles.docxSelectAll}>
            <button onClick={toggleAll} className={styles.docxSelectAllBtn}>
              {selectedClauses.size === optimizableClauses.length ? 'Alle abwählen' : 'Alle auswählen'}
            </button>
            <span className={styles.docxCount}>
              {selectedClauses.size} von {optimizableClauses.length} ausgewählt
            </span>
          </div>

          {/* Clause list */}
          <div className={styles.docxClauseList}>
            {optimizableClauses.map(({ opt, clause, analysis }) => {
              const isSelected = selectedClauses.has(opt.clauseId);
              const sectionNum = clause!.sectionNumber && clause!.sectionNumber !== 'null' ? clause!.sectionNumber : '';
              const categoryLabel = CATEGORY_LABELS[clause!.category] || clause!.category;
              const userSel = userSelections?.get(opt.clauseId);
              const acceptedMode = userSel?.selectedVersion && userSel.selectedVersion !== 'original'
                ? userSel.selectedVersion : null;
              // Show preview: use accepted mode text if available, otherwise global docxMode
              const previewMode = (acceptedMode && acceptedMode !== 'custom' ? acceptedMode : docxMode) as OptimizationMode;

              return (
                <label
                  key={opt.clauseId}
                  className={`${styles.docxClauseItem} ${isSelected ? styles.docxClauseItemSelected : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleClause(opt.clauseId)}
                    className={styles.docxCheckbox}
                  />
                  <div className={styles.docxClauseInfo}>
                    <span className={styles.docxClauseTitle}>
                      {sectionNum && <span className={styles.docxClauseSection}>{sectionNum}</span>}
                      {sectionNum && clause!.title?.startsWith(sectionNum) ? clause!.title.slice(sectionNum.length).trimStart() : clause!.title}
                      {acceptedMode && (
                        <span className={styles.docxAcceptedBadge} title="In Klauselansicht akzeptiert">
                          <CheckCircle2 size={11} />
                          {acceptedMode === 'custom' ? 'Eigener Text' : (MODE_LABELS[previewMode]?.label || acceptedMode)}
                        </span>
                      )}
                    </span>
                    <span className={styles.docxClauseMeta}>
                      {categoryLabel}
                      {analysis?.importanceLevel === 'critical' && ' • Kritisch'}
                      {analysis?.importanceLevel === 'high' && ' • Wichtig'}
                    </span>
                  </div>
                  <div className={styles.docxClausePreview}>
                    {acceptedMode === 'custom' && userSel?.customText
                      ? userSel.customText.substring(0, 80) + '...'
                      : opt.versions?.[previewMode]?.text
                        ? opt.versions[previewMode].text.substring(0, 80) + '...'
                        : '–'}
                  </div>
                </label>
              );
            })}
          </div>

          {/* Generate button */}
          <button
            className={styles.docxGenerateBtn}
            onClick={handleDocxGenerate}
            disabled={generating || selectedClauses.size === 0}
          >
            {generating ? (
              <><Loader2 size={16} className={styles.spinIcon} /> DOCX wird erstellt...</>
            ) : (
              <><Download size={16} /> DOCX generieren ({selectedClauses.size} Optimierungen)</>
            )}
          </button>
          {exportError && !generating && (
            <p style={{ color: '#ef4444', fontSize: '0.75rem', margin: '4px 0 0', textAlign: 'center' }}>{exportError}</p>
          )}
        </div>
      )}

      {/* ── Contract Builder ── */}
      <div className={styles.exportOptions} style={{ marginTop: 8 }}>
        <div className={styles.exportOption}>
          <div className={styles.exportOptionIcon}>
            <Hammer size={24} />
          </div>
          <div className={styles.exportOptionInfo}>
            <h4>Im Contract Builder öffnen</h4>
            <p>Optimierten Vertrag im visuellen Editor bearbeiten, Design wählen und als PDF exportieren</p>
          </div>
          <button
            className={styles.exportBtnActive}
            onClick={handleOpenInBuilder}
            disabled={builderLoading}
          >
            {builderLoading ? <Loader2 size={14} className={styles.spinIcon} /> : <Hammer size={14} />}
            {builderLoading ? 'Erstelle...' : 'Öffnen'}
          </button>
        </div>
      </div>

      {/* ── Email Pitch Templates ── */}
      <div className={styles.pitchSection}>
        <div className={styles.pitchHeader}>
          <Mail size={18} />
          <div>
            <h4 className={styles.pitchTitle}>E-Mail-Vorlagen</h4>
            <p className={styles.pitchSubtitle}>Versende deine Ergebnisse per E-Mail — Vorlage wählen und kopieren</p>
          </div>
        </div>

        <div className={styles.pitchTabs}>
          {pitchMeta.map(({ key, label, desc }) => (
            <button
              key={key}
              className={`${styles.pitchTab} ${activePitch === key ? styles.pitchTabActive : ''}`}
              onClick={() => setActivePitch(prev => prev === key ? null : key)}
            >
              <span className={styles.pitchTabLabel}>{label}</span>
              <span className={styles.pitchTabDesc}>{desc}</span>
            </button>
          ))}
        </div>

        {activePitch && (
          <div className={styles.pitchPreview}>
            <pre className={styles.pitchText}>{generatePitch(activePitch)}</pre>
            <button
              className={styles.pitchCopyBtn}
              onClick={() => handleCopyPitch(activePitch)}
            >
              {copiedPitch
                ? <><Check size={14} /> Kopiert!</>
                : <><Copy size={14} /> In Zwischenablage kopieren</>
              }
            </button>
          </div>
        )}
      </div>

      {/* Analysis summary */}
      <div className={styles.exportSummary}>
        <h4>Analyse-Zusammenfassung</h4>
        <div className={styles.exportSummaryGrid}>
          <div><span>Vertragstyp:</span> {result.structure.contractTypeLabel}</div>
          <div><span>Klauseln:</span> {result.clauses.length}</div>
          <div><span>Optimiert:</span> {optimizedCount}</div>
          <div><span>Score:</span> {result.scores.overall}/100</div>
          <div><span>Analysezeit:</span> {result.performance ? `${(result.performance.totalDurationMs / 1000).toFixed(1)}s` : '-'}</div>
          <div><span>KI-Kosten:</span> {result.costs ? `$${result.costs.totalCostUSD.toFixed(3)}` : '-'}</div>
        </div>
      </div>
    </div>
  );
}
