import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { PulseV2Result, PulseV2Action, PulseV2Finding, PulseV2LegalAlert, PulseV2Translation, PulseV2TranslateResponse } from '../../types/pulseV2';
import { useToast } from '../../context/ToastContext';
import { HealthScoreGauge } from './HealthScoreGauge';
import { FindingCard } from './FindingCard';
import { ScoreTrend } from './ScoreTrend';
import { PortfolioInsightsPanel } from './PortfolioInsightsPanel';
import { ActionItem } from './ActionItem';
import { ImpactGraph } from './ImpactGraph';
import styles from '../../styles/PulseV2.module.css';

/** Smooth scroll to a section by id */
function scrollToSection(id: string) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/** Clickable text style */
const clickableStyle: React.CSSProperties = {
  cursor: 'pointer',
  textDecoration: 'underline',
  textDecorationStyle: 'dotted',
  textUnderlineOffset: 2,
};

/** Safely extract string from contractType (may be string or object) */
function safeContractType(ct: unknown): string {
  if (!ct) return '';
  if (typeof ct === 'string') return ct;
  if (typeof ct === 'object' && ct !== null) {
    const obj = ct as Record<string, unknown>;
    return String(obj.displayName || obj.name || '');
  }
  return '';
}

interface ContractDetailProps {
  result: PulseV2Result;
  monitorInfo?: { nextRadarScan: string | null; alertCount: number } | null;
  contractAlerts?: PulseV2LegalAlert[];
}

export const ContractDetail: React.FC<ContractDetailProps> = ({ result, monitorInfo, contractAlerts }) => {
  const toast = useToast();
  const [actions, setActions] = useState<PulseV2Action[]>(result.actions || []);
  const [findingsState, setFindingsState] = useState<PulseV2Finding[]>(result.clauseFindings || []);
  const [scoresState, setScoresState] = useState(result.scores);
  const [showAllFindings, setShowAllFindings] = useState(false);
  const [showActionHistory, setShowActionHistory] = useState(false);
  const [showJuristischeInfo, setShowJuristischeInfo] = useState(false);
  const [showFindingsInfo, setShowFindingsInfo] = useState(false);
  const [showActionsInfo, setShowActionsInfo] = useState(false);
  const [pdfExporting, setPdfExporting] = useState(false);
  const juristischeInfoRef = useRef<HTMLDivElement>(null);

  // ── Language toggle (PR 4) ──
  // Source language is the contract's detected language. User can toggle to the
  // opposite language; translation is fetched from backend on first toggle and
  // cached server-side. Subsequent toggles between source and target are instant.
  const sourceLang = ((result.document?.language || 'de').toLowerCase() === 'en' ? 'en' : 'de') as 'de' | 'en';
  const otherLang: 'de' | 'en' = sourceLang === 'en' ? 'de' : 'en';
  const [displayLang, setDisplayLang] = useState<'original' | 'de' | 'en'>('original');
  const [translation, setTranslation] = useState<PulseV2Translation | null>(
    // If the result already has a cached translation for the other language,
    // pre-load it so toggling is instant on first click.
    (result.translations?.[otherLang] as PulseV2Translation | undefined) || null
  );
  const [translating, setTranslating] = useState(false);
  const [translationError, setTranslationError] = useState<string | null>(null);

  useEffect(() => {
    if (!showJuristischeInfo) return;
    const handler = (e: MouseEvent) => {
      if (juristischeInfoRef.current && !juristischeInfoRef.current.contains(e.target as Node)) {
        setShowJuristischeInfo(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showJuristischeInfo]);

  // Build contract name map for portfolio insights
  const [contractNames, setContractNames] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    setActions(result.actions || []);
    setFindingsState(result.clauseFindings || []);
    setScoresState(result.scores);
    // When the result instance changes (re-analyze, switch contract), reset
    // the language toggle to the original. Pre-load any server-cached
    // translation for the opposite language for instant first-click.
    setDisplayLang('original');
    setTranslation((result.translations?.[otherLang] as PulseV2Translation | undefined) || null);
    setTranslationError(null);
  }, [result, otherLang]);

  // Effective language currently shown in the UI (used for verdict-string branching).
  const effectiveLang = displayLang === 'original' ? sourceLang : displayLang;
  const isEN = effectiveLang === 'en';

  // Toggle handler: fetch translation if needed (cached server-side), then switch view.
  const handleToggleLanguage = useCallback(async () => {
    setTranslationError(null);
    // If currently showing translated → flip back to original instantly.
    if (displayLang !== 'original') {
      setDisplayLang('original');
      return;
    }
    // If we already have a cached translation for otherLang → switch instantly.
    if (translation) {
      setDisplayLang(otherLang);
      return;
    }
    // Otherwise fetch from backend.
    setTranslating(true);
    try {
      const API_BASE = import.meta.env.VITE_API_URL || '';
      const res = await fetch(`${API_BASE}/api/legal-pulse-v2/result/${result._id}/translate?to=${otherLang}`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${res.status}`);
      }
      const data = (await res.json()) as PulseV2TranslateResponse;
      if (data.translation) {
        setTranslation(data.translation);
        setDisplayLang(otherLang);
      } else {
        setTranslationError(isEN ? 'No translation needed' : 'Keine Übersetzung erforderlich');
      }
    } catch (err) {
      console.error('[PulseV2] Translation failed:', err);
      setTranslationError(
        sourceLang === 'en'
          ? (err instanceof Error ? err.message : 'Translation failed')
          : (err instanceof Error ? err.message : 'Übersetzung fehlgeschlagen')
      );
    } finally {
      setTranslating(false);
    }
  }, [displayLang, translation, otherLang, result._id, sourceLang, isEN]);

  useEffect(() => {
    const names = new Map<string, string>();
    names.set(result.contractId, result.context?.contractName || 'Aktueller Vertrag');
    if (result.context?.relatedContracts) {
      for (const rc of result.context.relatedContracts) {
        if (rc.name) names.set(rc.name, rc.name);
      }
    }
    setContractNames(names);
  }, [result]);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleActionStatusChange = useCallback(async (actionId: string, status: 'open' | 'done' | 'dismissed', _resultId?: string) => {
    try {
      const res = await fetch(`/api/legal-pulse-v2/results/${result._id}/actions/${actionId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (data.actions) {
        setActions(data.actions);
      } else {
        toast.error('Status-Änderung konnte nicht gespeichert werden.');
      }
    } catch (err) {
      console.error('[PulseV2] Action update failed:', err);
      toast.error('Verbindungsfehler — bitte erneut versuchen.');
    }
  }, [result._id, toast]);

  const handleActionCommentSave = useCallback(async (actionId: string, comment: string) => {
    try {
      const res = await fetch(`/api/legal-pulse-v2/results/${result._id}/actions/${actionId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment }),
      });
      const data = await res.json();
      if (data.actions) {
        setActions(data.actions);
      }
    } catch (err) {
      console.error('[PulseV2] Action comment save failed:', err);
    }
  }, [result._id]);

  const handleQuickFixApplied = useCallback((severity: string) => {
    const boost = severity === 'critical' ? 8 : severity === 'high' ? 5 : 3;
    setScoresState(prev => {
      if (!prev) return prev;
      const riskBoost = Math.round(boost * 1.5);
      return {
        ...prev,
        overall: Math.min(100, prev.overall + boost),
        risk: Math.min(100, prev.risk + riskBoost),
      };
    });
  }, []);

  const handlePdfExport = useCallback(async () => {
    setPdfExporting(true);
    try {
      const res = await fetch(`/api/legal-pulse-v2/results/${result._id}/export-pdf`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('PDF Export fehlgeschlagen');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Vertragsanalyse_${result.context?.contractName?.replace(/[^a-zA-Z0-9äöüÄÖÜß_-]/g, '_') || result.contractId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('[PulseV2] PDF export error:', err);
      toast.error('PDF-Export fehlgeschlagen. Bitte erneut versuchen.');
    } finally {
      setPdfExporting(false);
    }
  }, [result._id, result.context?.contractName, result.contractId]);

  const handleFindingStatusChange = useCallback(async (findingIndex: number, status: 'open' | 'resolved' | 'dismissed', comment?: string) => {
    try {
      const body: Record<string, unknown> = { status };
      if (comment !== undefined) body.comment = comment;

      const res = await fetch(`/api/legal-pulse-v2/results/${result._id}/findings/${findingIndex}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success && data.finding) {
        setFindingsState(prev => {
          const updated = [...prev];
          updated[findingIndex] = { ...updated[findingIndex], ...data.finding };
          return updated;
        });
      } else {
        toast.error('Status-Änderung konnte nicht gespeichert werden.');
      }
    } catch (err) {
      console.error('[PulseV2] Finding status update failed:', err);
      toast.error('Verbindungsfehler — bitte erneut versuchen.');
    }
  }, [result._id, toast]);

  // Language-aware derivations: when displayLang is the OTHER language and we have
  // a translation, replace user-facing fields. State (userStatus etc.) is preserved.
  const useTranslated = displayLang !== 'original' && !!translation;

  const findings = useMemo(() => {
    if (!useTranslated) return findingsState;
    const tMap = new Map(translation!.findings.map(t => [t.clauseId, t]));
    return findingsState.map(f => {
      const t = tMap.get(f.clauseId);
      if (!t) return f;
      return {
        ...f,
        title: t.title || f.title,
        description: t.description || f.description,
        legalBasis: t.legalBasis || f.legalBasis,
        reasoning: t.reasoning || f.reasoning,
      };
    });
  }, [findingsState, useTranslated, translation]);

  const displayActions = useMemo(() => {
    if (!useTranslated) return actions;
    const tMap = new Map(translation!.actions.map(t => [t.id, t]));
    return actions.map(a => {
      const t = tMap.get(a.id);
      if (!t) return a;
      return {
        ...a,
        title: t.title || a.title,
        description: t.description || a.description,
        nextStep: t.nextStep || a.nextStep,
        estimatedImpact: t.estimatedImpact || a.estimatedImpact,
      };
    });
  }, [actions, useTranslated, translation]);

  const clauses = useMemo(() => {
    const raw = result.clauses || [];
    if (!useTranslated) return raw;
    return raw.map(c => ({
      ...c,
      title: translation!.clauseTitles[c.id] || c.title,
    }));
  }, [result.clauses, useTranslated, translation]);

  const portfolioInsightsDisplay = useMemo(() => {
    const raw = result.portfolioInsights || [];
    if (!useTranslated) return raw;
    return raw.map((p, idx) => {
      const t = translation!.insights.find(ti => ti.idx === idx);
      if (!t) return p;
      return {
        ...p,
        title: t.title || p.title,
        description: t.description || p.description,
        reasoning: t.reasoning || p.reasoning,
      };
    });
  }, [result.portfolioInsights, useTranslated, translation]);

  const clauseMap = new Map(clauses.map(c => [c.id, c]));

  // Severity counts
  const criticalCount = findings.filter(f => f.severity === 'critical').length;
  const highCount = findings.filter(f => f.severity === 'high').length;
  const mediumCount = findings.filter(f => f.severity === 'medium').length;
  const lowCount = findings.filter(f => f.severity === 'low').length;
  const infoCount = findings.filter(f => f.severity === 'info').length;

  // Type counts
  const riskCount = findings.filter(f => f.type === 'risk').length;
  const complianceCount = findings.filter(f => f.type === 'compliance').length;
  const opportunityCount = findings.filter(f => f.type === 'opportunity').length;

  // Indexed findings — preserve original array index for PATCH endpoint
  const indexedFindings = findings.map((f, i) => ({ finding: f, originalIndex: i }));

  // Top findings: only critical + high
  const topFindings = indexedFindings
    .filter(({ finding: f }) => f.severity === 'critical' || f.severity === 'high');

  // Secondary findings: low + info, collapsed by default (medium already covered by Actions)
  const secondaryFindings = indexedFindings.filter(({ finding: f }) => f.severity === 'low' || f.severity === 'info');

  // Finding progress tracking
  const actionableFindings = findings.filter(f => f.severity === 'critical' || f.severity === 'high' || f.severity === 'medium');
  const resolvedFindingCount = actionableFindings.filter(f => f.userStatus === 'resolved' || f.userStatus === 'dismissed').length;

  // All actionable findings (critical/high/medium) — passed to optimizer for context
  const actionableFindingSummaries = findings
    .filter(f => f.severity === 'critical' || f.severity === 'high' || f.severity === 'medium')
    .map(f => ({
      title: f.title,
      description: f.description,
      severity: f.severity,
      type: f.type,
      legalBasis: f.legalBasis,
      affectedText: f.affectedText,
      clauseTitle: clauseMap.get(f.clauseId)?.title,
    }));

  // Score label + context description.
  // Language-aware via PR-4 toggle: isEN reflects the EFFECTIVE display language
  // (declared earlier together with the toggle state). When the user toggles to
  // the other language, verdict strings follow.
  const score = scoresState?.overall ?? 0;

  const scoreLabel = isEN
    ? (score >= 80 ? 'Good' : score >= 60 ? 'Acceptable' : score >= 40 ? 'Concerning' : 'Critical')
    : (score >= 80 ? 'Gut' : score >= 60 ? 'Akzeptabel' : score >= 40 ? 'Bedenklich' : 'Kritisch');
  const scoreLabelColor = score >= 80 ? '#15803d' : score >= 60 ? '#d97706' : score >= 40 ? '#ea580c' : '#dc2626';

  const scoreDescription = isEN
    ? (score >= 80
        ? 'Solid contract with no material risks.'
        : score >= 60
          ? `Solid contract with ${criticalCount + highCount > 0 ? 'a few important points' : 'some one-sided clauses'}. No acute risks.`
          : score >= 40
            ? (criticalCount + highCount > 0
              ? `Contract with ${criticalCount + highCount} ${criticalCount + highCount === 1 ? 'important point that should be reviewed' : 'important points that should be reviewed'}.`
              : 'Contract with optimization potential. See recommendations below.')
            : `Contract with substantial risks. ${criticalCount > 0 ? `${criticalCount} critical ${criticalCount > 1 ? 'points require' : 'point requires'} immediate attention.` : 'Urgent review required.'}`)
    : (score >= 80
        ? 'Solider Vertrag ohne wesentliche Risiken.'
        : score >= 60
          ? `Solider Vertrag mit ${criticalCount + highCount > 0 ? 'einigen wichtigen Punkten' : 'einseitigen Klauseln'}. Keine akuten Risiken.`
          : score >= 40
            ? (criticalCount + highCount > 0
              ? `Vertrag mit ${criticalCount + highCount} ${criticalCount + highCount === 1 ? 'wichtigem Punkt, der geprüft werden sollte' : 'wichtigen Punkten, die geprüft werden sollten'}.`
              : 'Vertrag mit Optimierungspotenzial. Siehe Empfehlungen unten.')
            : `Vertrag mit erheblichen Risiken. ${criticalCount > 0 ? `${criticalCount} kritische${criticalCount > 1 ? ' Punkte' : 'r Punkt'} erfordert sofortige Aufmerksamkeit.` : 'Dringend prüfen.'}`);

  return (
    <div>
      {/* ═══ Quality Warning Banner ═══ */}
      {result.qualityWarning && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '12px 16px',
          background: '#fffbeb',
          border: '1px solid #fde68a',
          borderRadius: 10,
          marginBottom: 16,
          fontSize: 13,
          color: '#92400e',
        }}>
          <span style={{ fontSize: 16, flexShrink: 0 }}>&#9888;</span>
          <div>
            <div style={{ fontWeight: 600 }}>Eingeschränkte Dokumentqualität (Score: {result.qualityWarning.score}/100)</div>
            <div style={{ fontSize: 12, color: '#a16207', marginTop: 2 }}>
              {result.qualityWarning.message}. Für bessere Ergebnisse laden Sie eine höher aufgelöste PDF hoch.
            </div>
          </div>
        </div>
      )}

      {/* ═══ Coverage Warning Banner ═══ */}
      {result.coverage && result.coverage.percentage < 100 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '12px 16px',
          background: '#eff6ff',
          border: '1px solid #bfdbfe',
          borderRadius: 10,
          marginBottom: 16,
          fontSize: 13,
          color: '#1e40af',
        }}>
          <span style={{ fontSize: 16, flexShrink: 0 }}>&#9432;</span>
          <div>
            <div style={{ fontWeight: 600 }}>
              {result.coverage.analyzed} von {result.coverage.total} Klauseln analysiert ({result.coverage.percentage}%)
            </div>
            <div style={{ fontSize: 12, color: '#3b82f6', marginTop: 2 }}>
              {result.coverage.notAnalyzed} Klauseln konnten nicht vollständig ausgewertet werden.
            </div>
          </div>
        </div>
      )}

      {/* ═══ Header: Score + Contract Overview ═══ */}
      <div className={`${styles.sectionCard} ${styles.fadeIn}`} style={{
        display: 'grid',
        gridTemplateColumns: 'auto 1fr',
        gap: 32,
        marginBottom: 20,
        padding: 24,
        background: '#ffffff',
        borderRadius: 16,
        border: '1px solid rgba(0,0,0,0.05)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.03)',
        overflow: 'visible',
      }}>
        <div>
          <HealthScoreGauge scores={scoresState} riskTrend={result.context?.riskTrend} />
        </div>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#111827', margin: '0 0 4px' }}>
            {result.context?.contractName || 'Vertragsanalyse'}
          </h2>
          <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 12 }}>
            {result.document?.contractType && (
              <span style={{
                background: '#eff6ff',
                color: '#1e40af',
                padding: '2px 8px',
                borderRadius: 4,
                marginRight: 8,
                fontSize: 12,
              }}>
                {safeContractType(result.document.contractType)}
              </span>
            )}
            {result.context?.provider && (
              <span style={{ marginRight: 12 }}>Anbieter: {safeContractType(result.context.provider)}</span>
            )}
            {result.context?.daysUntilExpiry !== null && result.context?.daysUntilExpiry !== undefined && (
              <span style={{
                color: (result.context.daysUntilExpiry ?? 999) < 30 ? '#dc2626' : '#6b7280',
              }}>
                {(result.context.daysUntilExpiry ?? 0) < 0
                  ? 'Abgelaufen'
                  : `${result.context.daysUntilExpiry} Tage bis Ablauf`
                }
              </span>
            )}
          </div>

          {/* Status line */}
          <div style={{
            fontSize: 14,
            fontWeight: 600,
            color: scoreLabelColor,
            marginBottom: 8,
          }}>
            {scoreLabel}
            {findings.length > 0 && (
              <span
                onClick={() => scrollToSection('empfehlungen')}
                style={{ fontWeight: 400, color: '#6b7280', fontSize: 13, marginLeft: 8, ...clickableStyle }}
              >
                &mdash; {findings.length} {isEN ? 'findings in' : 'Befunde in'} {result.coverage ? `${result.coverage.analyzed}/${result.coverage.total}` : String(clauses.length)} {isEN ? 'clauses' : 'Klauseln'}
                {result.coverage && result.coverage.percentage < 100 && (
                  <span style={{ color: '#d97706', marginLeft: 4 }}>({result.coverage.percentage}%)</span>
                )}
              </span>
            )}
          </div>

          {/* Score context */}
          <div
            onClick={() => scrollToSection('empfehlungen')}
            style={{ fontSize: 13, color: '#6b7280', marginBottom: 8, ...clickableStyle }}
          >
            {scoreDescription}
          </div>

          {/* Meta + PDF Export */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: monitorInfo ? 10 : 0 }}>
            <span style={{ fontSize: 12, color: '#9ca3af' }}>
              Analysiert am {new Date(result.createdAt).toLocaleDateString('de-DE')} um {new Date(result.createdAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
            </span>
            <button
              className={styles.btnSecondary}
              onClick={handlePdfExport}
              disabled={pdfExporting}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '3px 10px',
                fontSize: 11,
                fontWeight: 500,
                color: pdfExporting ? '#9ca3af' : '#4b5563',
                background: '#f9fafb',
                border: '1px solid #e5e7eb',
                borderRadius: 5,
                cursor: pdfExporting ? 'default' : 'pointer',
              }}
            >
              {pdfExporting ? '\u23F3' : '\uD83D\uDCC4'} {pdfExporting ? 'Exportiert...' : 'PDF'}
            </button>
            {/* Language toggle (PR 4): only rendered for English-language contracts.
                German contracts are the main customer base — the German UI is the
                correct default and a toggle would only add visual noise. English
                contracts (rare today) get a way to read findings in German. */}
            {sourceLang === 'en' && (
              <>
                <button
                  type="button"
                  onClick={handleToggleLanguage}
                  disabled={translating}
                  title={
                    displayLang === 'original'
                      ? 'Befunde auf Deutsch anzeigen'
                      : 'Show original (English)'
                  }
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: '3px 10px',
                    fontSize: 11,
                    fontWeight: 500,
                    color: translating ? '#9ca3af' : '#4b5563',
                    background: '#f9fafb',
                    border: '1px solid #e5e7eb',
                    borderRadius: 5,
                    cursor: translating ? 'default' : 'pointer',
                  }}
                >
                  {translating
                    ? 'Übersetze...'
                    : displayLang === 'original'
                      ? 'Auf Deutsch anzeigen'
                      : 'Show original'
                  }
                </button>
                {translationError && (
                  <span style={{ fontSize: 11, color: '#dc2626' }}>{translationError}</span>
                )}
              </>
            )}
          </div>

          {/* Monitoring Status */}
          {monitorInfo && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 12,
              color: '#15803d',
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: 6,
              padding: '6px 10px',
            }}>
              <span style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: '#22c55e',
                boxShadow: '0 0 4px rgba(34,197,94,0.5)',
                flexShrink: 0,
              }} />
              <span style={{ fontWeight: 600 }}>Aktiv überwacht</span>
              <span style={{ color: '#16a34a', fontSize: 11 }}>Bei Änderungen werden Sie per E-Mail benachrichtigt</span>
              {monitorInfo.alertCount > 0 && (
                <span
                  onClick={() => scrollToSection('contract-alerts')}
                  style={{
                    background: '#fef2f2',
                    color: '#dc2626',
                    fontSize: 11,
                    fontWeight: 600,
                    padding: '1px 6px',
                    borderRadius: 8,
                    border: '1px solid #fecaca',
                    marginLeft: 'auto',
                    cursor: 'pointer',
                  }}
                >
                  {monitorInfo.alertCount} {monitorInfo.alertCount === 1 ? 'Alert' : 'Alerts'}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ═══ Juristische Einschätzung ═══ */}
      <div className={`${styles.sectionCard} ${styles.fadeInDelay1}`} style={{
        background: '#ffffff',
        border: '1px solid rgba(0,0,0,0.05)',
        borderRadius: 16,
        padding: 24,
        marginBottom: 20,
        boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.03)',
      }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8, position: 'relative', paddingLeft: 14, borderLeft: '3px solid #3b82f6' }}>
          <span style={{ fontSize: 16 }}>&#x2696;&#xFE0F;</span>
          Juristische Einschätzung
          <span
            className={styles.btnInfo}
            onClick={() => setShowJuristischeInfo(!showJuristischeInfo)}
            style={{
              width: 18,
              height: 18,
              borderRadius: '50%',
              background: '#f3f4f6',
              border: '1px solid #d1d5db',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 11,
              color: '#6b7280',
              cursor: 'pointer',
              fontWeight: 700,
              lineHeight: 1,
            }}
          >
            ?
          </span>
          {showJuristischeInfo && (
            <div ref={juristischeInfoRef} style={{
              position: 'absolute',
              top: 28,
              left: 28,
              background: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: 8,
              padding: '12px 16px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              fontSize: 12,
              fontWeight: 400,
              color: '#374151',
              lineHeight: 1.6,
              maxWidth: 360,
              zIndex: 10,
            }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Was ist das?</div>
              Diese Einschätzung wird automatisch aus den Analyseergebnissen generiert — basierend auf Score, Befunden und Vertragsdaten. Sie gibt eine erste Orientierung und ersetzt keine individuelle anwaltliche Beratung.
              <div
                onClick={() => setShowJuristischeInfo(false)}
                style={{ marginTop: 8, color: '#3b82f6', cursor: 'pointer', fontWeight: 600 }}
              >
                Verstanden
              </div>
            </div>
          )}
        </div>
        <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.7 }}>
          {(() => {
            const ctx = result.context;
            const contractType = safeContractType(ctx?.contractType || result.document?.contractType);
            const parties = ctx?.parties || result.document?.extractedMeta?.parties || [];
            const scores = scoresState;

            // Build summary paragraphs
            const lines: (string | React.ReactNode)[] = [];

            // Line 1: Contract identification
            if (contractType && parties.length >= 2) {
              lines.push(`Bei dem vorliegenden Dokument handelt es sich um einen ${contractType} zwischen ${parties[0]} und ${parties[1]}${parties.length > 2 ? ` (sowie ${parties.length - 2} weiteren Parteien)` : ''}.`);
            } else if (contractType) {
              lines.push(`Bei dem vorliegenden Dokument handelt es sich um einen ${contractType}.`);
            }

            // Line 2: Duration & deadlines
            if (ctx?.duration || ctx?.endDate) {
              const durationParts: string[] = [];
              if (ctx?.duration) durationParts.push(`Laufzeit: ${ctx.duration}`);
              if (ctx?.endDate) {
                const end = new Date(ctx.endDate);
                durationParts.push(`Vertragsende: ${end.toLocaleDateString('de-DE')}`);
              }
              if (ctx?.autoRenewal) durationParts.push('mit automatischer Verlängerung');
              if (ctx?.daysUntilExpiry !== null && ctx?.daysUntilExpiry !== undefined) {
                if (ctx.daysUntilExpiry <= 30) {
                  durationParts.push(`Achtung: Ablauf in ${ctx.daysUntilExpiry} Tagen`);
                } else if (ctx.daysUntilExpiry <= 90) {
                  durationParts.push(`Ablauf in ${ctx.daysUntilExpiry} Tagen`);
                }
              }
              if (durationParts.length > 0) lines.push(durationParts.join(' \u2014 ') + '.');
            }

            // Line 3: Overall assessment
            if (scores) {
              const overall = scores.overall ?? 0;
              if (overall >= 80) {
                lines.push(`Die Analyse ergibt eine insgesamt solide vertragliche Gestaltung (Score: ${overall}/100). ${criticalCount === 0 && highCount === 0 ? 'Es wurden keine kritischen Mängel festgestellt.' : ''}`);
              } else if (overall >= 60) {
                if (criticalCount + highCount > 0) {
                  lines.push(`Die Analyse zeigt eine grundsätzlich akzeptable Vertragsgestaltung (Score: ${overall}/100), jedoch mit Optimierungsbedarf in ${criticalCount + highCount} ${criticalCount + highCount === 1 ? 'Punkt' : 'Punkten'}.`);
                } else {
                  lines.push(`Die Analyse zeigt eine grundsätzlich akzeptable Vertragsgestaltung (Score: ${overall}/100). Es wurden keine wesentlichen Mängel festgestellt.`);
                }
              } else if (overall >= 40) {
                if (criticalCount + highCount > 0) {
                  lines.push(`Die Analyse zeigt deutlichen Handlungsbedarf (Score: ${overall}/100). Es wurden ${criticalCount + highCount} ${criticalCount + highCount === 1 ? 'wesentlicher Mangel' : 'wesentliche Mängel'} identifiziert, die einer juristischen Überprüfung bedürfen.`);
                } else {
                  lines.push(`Die Analyse zeigt Optimierungspotenzial (Score: ${overall}/100). Es liegen keine kritischen Einzelmängel vor, jedoch deuten die Teilscores auf strukturelle Schwächen hin.`);
                }
              } else {
                lines.push(`Die Analyse ergibt erhebliche vertragliche Risiken (Score: ${overall}/100). ${criticalCount > 0 ? `${criticalCount} kritische${criticalCount > 1 ? ' Mängel erfordern' : 'r Mangel erfordert'} sofortiges Handeln.` : 'Eine umfassende Überarbeitung wird empfohlen.'}`);
              }
            }

            // Line 4: Key risk areas
            const riskAreas: string[] = [];
            if (scores && scores.compliance < 50) riskAreas.push('Compliance');
            if (scores && scores.terms < 50) riskAreas.push('Vertragskonditionen');
            if (scores && scores.completeness < 50) riskAreas.push('Vollständigkeit');
            if (scores && scores.risk < 50) riskAreas.push('Risikoabsicherung');
            if (riskAreas.length > 0) {
              lines.push(
                <span
                  key="risk-areas-link"
                  onClick={() => scrollToSection('risiko-uebersicht')}
                  style={{ ...clickableStyle, color: '#3b82f6' }}
                >
                  Besonderer Prüfungsbedarf besteht in den Bereichen: {riskAreas.join(', ')}.
                </span>
              );
            }

            // Line 5: Findings breakdown — clickable
            if (findings.length > 0) {
              const parts: string[] = [];
              if (criticalCount > 0) parts.push(`${criticalCount} kritisch`);
              if (highCount > 0) parts.push(`${highCount} hoch`);
              if (mediumCount > 0) parts.push(`${mediumCount} mittel`);
              if (lowCount + infoCount > 0) parts.push(`${lowCount + infoCount} gering`);
              lines.push(
                <span
                  key="findings-link"
                  onClick={() => scrollToSection(criticalCount + highCount > 0 ? 'empfehlungen' : 'geprueft')}
                  style={{ ...clickableStyle, color: '#3b82f6' }}
                >
                  Insgesamt {findings.length} Befunde: {parts.join(', ')}.
                </span>
              );
            }

            return lines.map((line, i) => (
              <p key={i} style={{ margin: i === 0 ? 0 : '6px 0 0 0' }}>{line}</p>
            ));
          })()}
        </div>
      </div>

      {/* ═══ Risk Overview: compact severity bars ═══ */}
      {findings.length > 0 && (
        <div id="risiko-uebersicht" className={`${styles.sectionCard} ${styles.fadeInDelay2}`} style={{
          background: '#ffffff',
          border: '1px solid rgba(0,0,0,0.05)',
          borderRadius: 16,
          padding: 24,
          marginBottom: 20,
          boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.03)',
        }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 12, paddingLeft: 14, borderLeft: '3px solid #3b82f6' }}>
            Risiko-Übersicht
          </div>

          {/* Severity bar */}
          <div style={{
            display: 'flex',
            height: 8,
            borderRadius: 4,
            overflow: 'hidden',
            marginBottom: 12,
            background: '#f3f4f6',
          }}>
            {criticalCount > 0 && <div style={{ width: `${(criticalCount / findings.length) * 100}%`, background: '#dc2626' }} />}
            {highCount > 0 && <div style={{ width: `${(highCount / findings.length) * 100}%`, background: '#ea580c' }} />}
            {mediumCount > 0 && <div style={{ width: `${(mediumCount / findings.length) * 100}%`, background: '#d97706' }} />}
            {lowCount > 0 && <div style={{ width: `${(lowCount / findings.length) * 100}%`, background: '#9ca3af' }} />}
            {infoCount > 0 && <div style={{ width: `${(infoCount / findings.length) * 100}%`, background: '#d1d5db' }} />}
          </div>

          {/* Legend — clickable to scroll to section */}
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 12 }}>
            {criticalCount > 0 && <span onClick={() => scrollToSection('empfehlungen')} style={{ cursor: 'pointer' }}><SeverityDot color="#dc2626" label="Kritisch" count={criticalCount} /></span>}
            {highCount > 0 && <span onClick={() => scrollToSection('empfehlungen')} style={{ cursor: 'pointer' }}><SeverityDot color="#ea580c" label="Hoch" count={highCount} /></span>}
            {mediumCount > 0 && <span onClick={() => scrollToSection('empfehlungen')} style={{ cursor: 'pointer' }}><SeverityDot color="#d97706" label="Mittel" count={mediumCount} /></span>}
            {lowCount > 0 && <span onClick={() => scrollToSection('geprueft')} style={{ cursor: 'pointer' }}><SeverityDot color="#9ca3af" label="Niedrig" count={lowCount} /></span>}
            {infoCount > 0 && <span onClick={() => scrollToSection('geprueft')} style={{ cursor: 'pointer' }}><SeverityDot color="#d1d5db" label="Info" count={infoCount} /></span>}
            <span style={{ color: '#d1d5db' }}>|</span>
            {riskCount > 0 && <span onClick={() => scrollToSection('empfehlungen')} style={{ color: '#6b7280', cursor: 'pointer' }}>{riskCount} Risiken</span>}
            {complianceCount > 0 && <span onClick={() => scrollToSection('empfehlungen')} style={{ color: '#6b7280', cursor: 'pointer' }}>{complianceCount} Compliance</span>}
            {opportunityCount > 0 && <span onClick={() => scrollToSection('empfehlungen')} style={{ color: '#16a34a', cursor: 'pointer' }}>{opportunityCount} Chancen</span>}
          </div>
        </div>
      )}

      {/* ═══ Empfehlungen — Actions + kritische Findings zusammen ═══ */}
      {(displayActions.length > 0 || topFindings.length > 0) && (() => {
        const openActions = displayActions.filter(a => a.status === 'open');
        const doneActions = displayActions.filter(a => a.status === 'done');
        const dismissedActions = displayActions.filter(a => a.status === 'dismissed');
        const doneCount = doneActions.length;
        const totalCount = displayActions.length;
        const progressPct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
        const historyActions = [...doneActions, ...dismissedActions];

        const hasCriticalFindings = topFindings.length > 0;
        const borderColor = hasCriticalFindings
          ? (criticalCount > 0 ? '#fecaca' : '#fed7aa')
          : '#e5e7eb';

        return (
          <div id="empfehlungen" className={`${styles.sectionCard} ${styles.fadeInDelay3}`} style={{
            background: '#ffffff',
            border: `1px solid ${borderColor}`,
            borderRadius: 16,
            padding: 24,
            marginBottom: 20,
            boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.03)',
          }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
              <div style={{ fontSize: 16, fontWeight: 600, color: '#111827', paddingLeft: 14, borderLeft: '3px solid #3b82f6' }}>
                Empfehlungen
              </div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                {resolvedFindingCount > 0 && (
                  <span style={{ fontSize: 12, color: '#059669', fontWeight: 600 }}>
                    {resolvedFindingCount}/{actionableFindings.length} Befunde bearbeitet
                  </span>
                )}
                {doneCount > 0 && (
                  <span style={{ fontSize: 12, color: '#16a34a', fontWeight: 600 }}>
                    {doneCount}/{totalCount} erledigt
                  </span>
                )}
              </div>
            </div>

            {/* Subtext — erklärt die Sektion */}
            <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 16, lineHeight: 1.5 }}>
              Basierend auf der Analyse aller {clauses.length} Klauseln.
              {hasCriticalFindings
                ? ' Beginnen Sie mit dem obersten Punkt — dieser hat die höchste Priorität.'
                : ' Sortiert nach Relevanz. Beginnen Sie mit dem obersten Punkt.'}
            </div>

            {/* Progress bar */}
            {doneCount > 0 && (
              <div style={{
                height: 4,
                background: '#f3f4f6',
                borderRadius: 2,
                marginBottom: 16,
                overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%',
                  width: `${progressPct}%`,
                  background: progressPct === 100 ? '#22c55e' : 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
                  borderRadius: 2,
                  transition: 'width 0.3s ease',
                }} />
              </div>
            )}

            {progressPct === 100 && (
              <div style={{
                padding: '16px 20px',
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: 10,
                marginBottom: 12,
                textAlign: 'center',
              }}>
                <div style={{ fontSize: 24, marginBottom: 4 }}>&#127881;</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#15803d' }}>
                  Alle Empfehlungen umgesetzt
                </div>
                <div style={{ fontSize: 13, color: '#16a34a', marginTop: 2 }}>
                  Der Score wird bei der nächsten Analyse aktualisiert.
                </div>
              </div>
            )}

            {/* ── Klauselbefunde ── */}
            {hasCriticalFindings && (
              <div style={{ marginBottom: openActions.length > 0 ? 20 : 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, position: 'relative' }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 10px',
                    background: criticalCount > 0 ? '#fef2f2' : '#fff7ed',
                    borderRadius: 6,
                    fontSize: 13,
                    fontWeight: 600,
                    color: criticalCount > 0 ? '#dc2626' : '#ea580c',
                  }}>
                    <span style={{ fontSize: 13 }}>&#9888;</span>
                    Klauselbefunde
                    <span style={{ fontWeight: 400, fontSize: 12 }}>
                      {topFindings.length} {topFindings.length === 1 ? 'Klausel' : 'Klauseln'}
                    </span>
                  </div>
                  <button
                    onClick={() => setShowFindingsInfo(!showFindingsInfo)}
                    style={{
                      width: 20, height: 20, borderRadius: '50%',
                      border: '1px solid #d1d5db', background: showFindingsInfo ? '#eff6ff' : '#fff',
                      cursor: 'pointer', fontSize: 11, fontWeight: 700,
                      color: showFindingsInfo ? '#3b82f6' : '#9ca3af',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}
                    title="Was sind Klauselbefunde?"
                  >
                    ?
                  </button>
                </div>
                {showFindingsInfo && (
                  <div style={{
                    padding: '10px 14px',
                    background: '#f0f9ff',
                    border: '1px solid #bfdbfe',
                    borderRadius: 8,
                    marginBottom: 12,
                    fontSize: 12,
                    color: '#1e40af',
                    lineHeight: 1.6,
                  }}>
                    <strong>Klauselbefunde</strong> sind konkrete Probleme in einzelnen Vertragsklauseln.
                    Hier sehen Sie den betroffenen Text, die Rechtsgrundlage und können per <strong>Quick Fix</strong> eine
                    verbesserte Formulierung direkt anwenden. Nur Quick Fixes verbessern den Health Score.
                  </div>
                )}
                {topFindings.map(({ finding, originalIndex }) => (
                  <FindingCard
                    key={`top-${finding.clauseId}-${originalIndex}`}
                    finding={finding}
                    findingIndex={originalIndex}
                    clause={clauseMap.get(finding.clauseId)}
                    contractId={result.contractId}
                    resultId={result._id}
                    allFindings={actionableFindingSummaries}
                    onFindingStatusChange={handleFindingStatusChange}
                    onQuickFixApplied={handleQuickFixApplied}
                  />
                ))}
              </div>
            )}

            {/* ── Handlungsempfehlungen ── */}
            {openActions.length > 0 && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, position: 'relative' }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 10px',
                    background: '#eff6ff',
                    borderRadius: 6,
                    fontSize: 13,
                    fontWeight: 600,
                    color: '#1e40af',
                  }}>
                    <span style={{ fontSize: 13 }}>&#128203;</span>
                    Handlungsempfehlungen
                    <span style={{ fontWeight: 400, fontSize: 12 }}>
                      {openActions.length} offen
                    </span>
                  </div>
                  <button
                    onClick={() => setShowActionsInfo(!showActionsInfo)}
                    style={{
                      width: 20, height: 20, borderRadius: '50%',
                      border: '1px solid #d1d5db', background: showActionsInfo ? '#eff6ff' : '#fff',
                      cursor: 'pointer', fontSize: 11, fontWeight: 700,
                      color: showActionsInfo ? '#3b82f6' : '#9ca3af',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}
                    title="Was sind Handlungsempfehlungen?"
                  >
                    ?
                  </button>
                </div>
                {showActionsInfo && (
                  <div style={{
                    padding: '10px 14px',
                    background: '#f0f9ff',
                    border: '1px solid #bfdbfe',
                    borderRadius: 8,
                    marginBottom: 12,
                    fontSize: 12,
                    color: '#1e40af',
                    lineHeight: 1.6,
                  }}>
                    <strong>Handlungsempfehlungen</strong> sind To-Dos für Sie oder Ihr Team — z.B.
                    Rechtsabteilung kontaktieren, Klausel nachverhandeln oder Fristen prüfen.
                    Das Abhaken dient der Nachverfolgung und ändert nicht den Health Score.
                  </div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[...openActions]
                    .sort((a, b) => {
                      const order: Record<string, number> = { now: 0, plan: 1, watch: 2 };
                      return (order[a.priority] ?? 2) - (order[b.priority] ?? 2);
                    })
                    .map(action => (
                    <ActionItem
                      key={action.id}
                      action={action}
                      contractId={result.contractId}
                      resultId={result._id}
                      onStatusChange={handleActionStatusChange}
                      onCommentSave={handleActionCommentSave}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Historie — done + dismissed, collapsible */}
            {historyActions.length > 0 && (
              <div style={{ marginTop: openActions.length > 0 ? 16 : 0 }}>
                <button
                  className={styles.btnCollapse}
                  onClick={() => setShowActionHistory(!showActionHistory)}
                  style={{
                    width: '100%',
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '10px 14px',
                    background: '#f9fafb', border: '1px solid #e5e7eb',
                    borderRadius: 8, cursor: 'pointer',
                    fontSize: 13, fontWeight: 600, color: '#6b7280',
                  }}
                >
                  <span style={{
                    fontSize: 12,
                    transform: showActionHistory ? 'rotate(90deg)' : 'rotate(0deg)',
                    transition: 'transform 0.15s ease',
                  }}>
                    &#x203A;
                  </span>
                  Erledigte Empfehlungen
                  {doneActions.length > 0 && (
                    <span style={{ fontSize: 11, color: '#16a34a', fontWeight: 500 }}>
                      {doneActions.length} umgesetzt
                    </span>
                  )}
                  {dismissedActions.length > 0 && (
                    <span style={{ fontSize: 11, color: '#9ca3af', fontWeight: 500 }}>
                      {dismissedActions.length} ausgeblendet
                    </span>
                  )}
                </button>
                {showActionHistory && (
                  <div className={styles.expandContent} style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
                    {historyActions.map(action => (
                      <ActionItem
                        key={`hist_${action.id}`}
                        action={action}
                        contractId={result.contractId}
                        resultId={result._id}
                        onStatusChange={handleActionStatusChange}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })()}

      {/* ═══ Legal Radar Alerts — laws that affect this contract ═══ */}
      {contractAlerts && contractAlerts.length > 0 && (
        <div id="contract-alerts" style={{
          background: '#ffffff',
          border: '1px solid rgba(0,0,0,0.05)',
          borderRadius: 16,
          overflow: 'hidden',
          marginTop: 20,
          boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.03)',
        }}>
          <div style={{
            padding: 24,
            borderBottom: '1px solid #fef2f2',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}>
            <span style={{ fontSize: 18 }}>&#9878;&#65039;</span>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#111827' }}>
                Legal Radar — Gesetzesänderungen
              </div>
              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                {contractAlerts.length === 1
                  ? 'Eine aktuelle Rechtsänderung betrifft diesen Vertrag. Nutzen Sie „Klausel automatisch anpassen" um den Vorschlag direkt zu übernehmen.'
                  : `${contractAlerts.length} aktuelle Rechtsänderungen betreffen diesen Vertrag. Nutzen Sie „Klausel automatisch anpassen" um Vorschläge direkt zu übernehmen.`}
              </div>
            </div>
          </div>
          <div style={{ padding: 24 }}>
            {contractAlerts.map(alert => (
              <ImpactGraph key={alert._id} alert={alert} hideContractInfo />
            ))}
          </div>
        </div>
      )}

      {/* ═══ Score Timeline ═══ */}
      <ScoreTrend contractId={result.contractId} />

      {/* ═══ Portfolio Insights ═══ */}
      <PortfolioInsightsPanel
        insights={portfolioInsightsDisplay}
        contractNames={contractNames}
      />

      {/* ═══ Geprüft & unauffällig — low + info only, collapsed ═══ */}
      {secondaryFindings.length > 0 && (() => {
        const allCheckedFindings = secondaryFindings;
        const contractType = safeContractType(result.context?.contractType || result.document?.contractType);
        return (
          <div id="geprueft" style={{
            background: '#ffffff',
            border: '1px solid rgba(0,0,0,0.05)',
            borderRadius: 16,
            overflow: 'hidden',
            marginTop: 20,
            boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.03)',
          }}>
            <button
              className={styles.btnCollapse}
              onClick={() => setShowAllFindings(!showAllFindings)}
              style={{
                width: '100%',
                padding: '14px 24px',
                background: showAllFindings ? '#f9fafb' : '#fff',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: 14,
                fontWeight: 500,
                color: '#374151',
                textAlign: 'left',
              }}
            >
              <div>
                <div>
                  Geprüft &amp; unauffällig
                  <span style={{ color: '#9ca3af', fontWeight: 400, marginLeft: 8, fontSize: 12 }}>
                    {allCheckedFindings.length} {allCheckedFindings.length === 1 ? 'Klausel' : 'Klauseln'}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: '#9ca3af', fontWeight: 400, marginTop: 2 }}>
                  {contractType
                    ? `Diese Klauseln sind für einen ${contractType} üblich und erfordern kein Handeln.`
                    : 'Diese Klauseln wurden geprüft und erfordern kein Handeln.'}
                </div>
              </div>
              <span style={{
                fontSize: 12,
                color: '#9ca3af',
                transform: showAllFindings ? 'rotate(180deg)' : 'none',
                transition: 'transform 0.2s',
                flexShrink: 0,
                marginLeft: 12,
              }}>
                &#9660;
              </span>
            </button>

            {showAllFindings && (
              <div className={styles.expandContent} style={{ padding: '0 24px 24px' }}>
                {allCheckedFindings.map(({ finding, originalIndex }) => (
                  <FindingCard
                    key={`checked-${finding.clauseId}-${originalIndex}`}
                    finding={finding}
                    findingIndex={originalIndex}
                    clause={clauseMap.get(finding.clauseId)}
                    contractId={result.contractId}
                    resultId={result._id}
                    allFindings={actionableFindingSummaries}
                    onFindingStatusChange={handleFindingStatusChange}
                    onQuickFixApplied={handleQuickFixApplied}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })()}

      {/* No findings at all */}
      {findings.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: 40,
          color: '#15803d',
          background: '#f0fdf4',
          borderRadius: 16,
          marginTop: 20,
          boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.03)',
        }}>
          <div style={{ fontSize: 24, marginBottom: 8 }}>&#10003;</div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>Keine Befunde</div>
          <div style={{ fontSize: 13, color: '#16a34a', marginTop: 4 }}>
            Der Vertrag scheint solide zu sein. Legal Pulse überwacht ihn weiterhin.
          </div>
        </div>
      )}

    </div>
  );
};

const SeverityDot: React.FC<{ color: string; label: string; count: number }> = ({ color, label, count }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
    <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
    <span style={{ color: '#4b5563' }}>{count} {label}</span>
  </div>
);
