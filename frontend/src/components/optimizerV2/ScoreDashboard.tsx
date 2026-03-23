import { useMemo, useState, useCallback } from 'react';
import { Shield, Eye, CheckSquare, BarChart3, AlertTriangle, Flame, Scale, Crosshair, FileWarning, Search, Sparkles, Copy, Check, Loader2, X, Activity, Info, BookmarkPlus } from 'lucide-react';
import type { Scores, AnalysisResult, ContractStructure, ImportanceLevel, PowerBalance, MissingClause, ClauseCategory } from '../../types/optimizerV2';
import { IMPORTANCE_CONFIG, INDUSTRY_LABELS, CATEGORY_LABELS } from '../../types/optimizerV2';
import { apiCall } from '../../utils/api';
import { useToast } from '../../context/ToastContext';
import styles from '../../styles/OptimizerV2.module.css';

interface Props {
  scores: Scores;
  result: AnalysisResult;
  structure: ContractStructure;
  onNavigate: (tab: string, clauseId?: string) => void;
}

const SCORE_CONFIGS = [
  { key: 'risk', label: 'Risiko', icon: Shield, color: '#FF3B30' },
  { key: 'fairness', label: 'Fairness', icon: Scale, color: '#AF52DE' },
  { key: 'clarity', label: 'Klarheit', icon: Eye, color: '#007AFF' },
  { key: 'completeness', label: 'Vollständigkeit', icon: CheckSquare, color: '#34C759' },
  { key: 'marketStandard', label: 'Marktstandard', icon: BarChart3, color: '#FF9500' }
] as const;

function getScoreColor(score: number): string {
  if (score >= 80) return '#34C759';
  if (score >= 60) return '#FF9500';
  if (score >= 40) return '#FF3B30';
  return '#AF52DE';
}

function getScoreLabel(score: number): string {
  if (score >= 80) return 'Sehr gut';
  if (score >= 60) return 'Gut';
  if (score >= 40) return 'Verbesserbar';
  return 'Kritisch';
}

// ── Power Balance Labels ──
const PB_LABELS: Record<string, string> = {
  balanced: 'Ausgewogen',
  slightly_one_sided: 'Leicht einseitig',
  strongly_one_sided: 'Deutlich einseitig',
  extremely_one_sided: 'Extrem einseitig'
};

export default function ScoreDashboard({ scores, result, structure, onNavigate }: Props) {
  const optimizedCount = result.optimizations.filter(o => o.needsOptimization).length;
  const criticalCount = result.clauseAnalyses.filter(a => a.strength === 'critical').length;
  const weakCount = result.clauseAnalyses.filter(a => a.strength === 'weak').length;

  // Importance distribution
  const importanceCounts: Record<ImportanceLevel, number> = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const a of result.clauseAnalyses) {
    const level = a.importanceLevel || 'medium';
    if (level in importanceCounts) importanceCounts[level]++;
  }

  // ── AI Contract Strategy: Top negotiation points ──
  const strategyPoints = useMemo(() => {
    return result.clauseAnalyses
      .filter(a => {
        const isRisky = a.riskLevel >= 6;
        const isOneSided = a.powerBalance === 'strongly_one_sided' || a.powerBalance === 'extremely_one_sided';
        const isImportant = a.importanceLevel === 'critical' || a.importanceLevel === 'high';
        return (isRisky || isOneSided) && isImportant;
      })
      .sort((a, b) => {
        const scoreA = a.riskLevel + (a.powerBalance === 'extremely_one_sided' ? 4 : a.powerBalance === 'strongly_one_sided' ? 2 : 0);
        const scoreB = b.riskLevel + (b.powerBalance === 'extremely_one_sided' ? 4 : b.powerBalance === 'strongly_one_sided' ? 2 : 0);
        return scoreB - scoreA;
      })
      .slice(0, 4)
      .map(a => {
        const clause = result.clauses.find(c => c.id === a.clauseId);
        // Pick the most actionable one-liner
        const insight = a.neutralRecommendation || a.recipientView || a.economicRiskAssessment || a.concerns?.[0] || a.summary;
        return {
          clauseId: a.clauseId,
          title: clause ? `${clause.sectionNumber && clause.sectionNumber !== 'null' ? clause.sectionNumber + ' ' : ''}${clause.sectionNumber && clause.title?.startsWith(clause.sectionNumber) ? clause.title.slice(clause.sectionNumber.length).trimStart() : clause.title}` : a.clauseId,
          insight: insight.length > 120 ? insight.substring(0, 117) + '...' : insight,
          powerBalance: a.powerBalance,
          riskLevel: a.riskLevel
        };
      });
  }, [result]);

  return (
    <div className={styles.scoreDashboard}>
      {/* Contract Summary Panel */}
      <div className={styles.summaryPanel}>
        <div className={styles.summaryLeft}>
          <div className={styles.overallScore} style={{ borderColor: getScoreColor(scores.overall) }}>
            <span className={styles.overallScoreNumber}>{scores.overall}</span>
            <span className={styles.overallScoreMax}>/100</span>
          </div>
          <div className={styles.overallScoreInfo}>
            <span className={styles.overallScoreLabel} style={{ color: getScoreColor(scores.overall) }}>
              {getScoreLabel(scores.overall)}
            </span>
            <span className={styles.contractType}>{structure.recognizedAs || structure.contractTypeLabel}</span>
          </div>
        </div>

        <div className={styles.summaryStats}>
          <div className={styles.statItem}>
            <span className={styles.statValue}>{result.clauses.length}</span>
            <span className={styles.statLabel}>Klauseln</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statValue} style={{ color: '#FF9500' }}>{optimizedCount}</span>
            <span className={styles.statLabel}>Optimierbar</span>
          </div>
          {criticalCount > 0 && (
            <div className={styles.statItem}>
              <span className={styles.statValue} style={{ color: '#FF3B30' }}>{criticalCount}</span>
              <span className={styles.statLabel}>Kritisch</span>
            </div>
          )}
          {weakCount > 0 && (
            <div className={styles.statItem}>
              <span className={styles.statValue} style={{ color: '#FF9500' }}>{weakCount}</span>
              <span className={styles.statLabel}>Schwach</span>
            </div>
          )}
        </div>

        <div className={styles.summaryActions}>
          <button className={styles.summaryActionBtn} onClick={() => onNavigate('clauses')}>
            Zu den Klauseln
          </button>
          <button className={styles.summaryActionBtn} onClick={() => onNavigate('redline')}>
            Redline ansehen
          </button>
        </div>
      </div>

      {/* Score Cards */}
      <div className={styles.scoreCards}>
        {SCORE_CONFIGS.map(({ key, label, icon: Icon, color }) => {
          const value = scores[key] ?? 0;
          return (
            <div key={key} className={styles.scoreCard}>
              <div className={styles.scoreCardHeader}>
                <Icon size={16} style={{ color }} />
                <span className={styles.scoreCardLabel}>{label}</span>
              </div>
              <div className={styles.scoreCardBar}>
                <div
                  className={styles.scoreCardBarFill}
                  style={{ width: `${value}%`, backgroundColor: getScoreColor(value) }}
                />
              </div>
              <span className={styles.scoreCardValue} style={{ color: getScoreColor(value) }}>
                {value}/100
              </span>
            </div>
          );
        })}
      </div>

      {/* Score Explanation */}
      <ScoreExplanation scores={scores} result={result} />

      {/* Risk Heatmap */}
      <RiskHeatmap result={result} onNavigate={onNavigate} />

      {/* AI Contract Strategy */}
      {strategyPoints.length > 0 && (
        <div className={styles.contractStrategy}>
          <div className={styles.contractStrategyHeader}>
            <Sparkles size={15} style={{ color: '#5856D6' }} />
            <span className={styles.contractStrategyTitle}>Verhandlungsstrategie</span>
            <span className={styles.contractStrategySubtitle}>Wichtigste Verhandlungspunkte</span>
          </div>
          <div className={styles.contractStrategyList}>
            {strategyPoints.map((point, i) => (
              <button
                key={point.clauseId}
                className={styles.strategyItem}
                onClick={() => onNavigate('clauses', point.clauseId)}
              >
                <span className={styles.strategyRank}>#{i + 1}</span>
                <div className={styles.strategyInfo}>
                  <span className={styles.strategyClause}>{point.title}</span>
                  <span className={styles.strategyInsight}>{point.insight}</span>
                </div>
                <div className={styles.strategyMeta}>
                  {point.powerBalance !== 'balanced' && (
                    <span className={styles.strategyTag} style={{
                      color: point.powerBalance === 'extremely_one_sided' ? '#FF3B30' : '#FF9500',
                      borderColor: point.powerBalance === 'extremely_one_sided' ? '#FF3B30' : '#FF9500'
                    }}>
                      {PB_LABELS[point.powerBalance] || point.powerBalance}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Importance distribution */}
      <div className={styles.importanceBar}>
        <div className={styles.importanceBarHeader}>
          <Flame size={14} style={{ color: '#FF3B30' }} />
          <span className={styles.importanceBarTitle}>Klausel-Priorität</span>
        </div>
        <div className={styles.importanceItems}>
          {(Object.entries(importanceCounts) as [ImportanceLevel, number][])
            .filter(([, count]) => count > 0)
            .map(([level, count]) => {
              const config = IMPORTANCE_CONFIG[level];
              return (
                <button
                  key={level}
                  className={styles.importanceItem}
                  onClick={() => onNavigate('clauses')}
                  title={`${count} ${config.label}e Klausel${count > 1 ? 'n' : ''} anzeigen`}
                >
                  <span className={styles.importanceDot} style={{ background: config.color }} />
                  <span className={styles.importanceCount} style={{ color: config.color }}>{count}</span>
                  <span className={styles.importanceLabel}>{config.label}</span>
                </button>
              );
            })}
        </div>
      </div>

      {/* Quick insights */}
      {(criticalCount > 0 || weakCount > 0) && (
        <div className={styles.quickInsights}>
          <AlertTriangle size={16} style={{ color: '#FF9500' }} />
          <span>
            {criticalCount > 0 && `${criticalCount} kritische Klausel${criticalCount > 1 ? 'n' : ''}`}
            {criticalCount > 0 && weakCount > 0 && ' und '}
            {weakCount > 0 && `${weakCount} schwache Klausel${weakCount > 1 ? 'n' : ''}`}
            {' '}gefunden. Klicke auf "Zu den Klauseln" für Details.
          </span>
        </div>
      )}

      {/* Top Risk Clauses */}
      <TopRiskClauses result={result} onNavigate={onNavigate} />

      {/* Missing Clauses Detection */}
      <MissingClausesPanel missingClauses={scores.missingClauses} resultId={result.resultId} />

      {/* Contract metadata */}
      <div className={styles.metadataGrid}>
        {structure.parties?.length > 0 && (
          <div className={styles.metadataItem}>
            <span className={styles.metadataLabel}>Parteien</span>
            <span className={styles.metadataValue}>
              {structure.parties.map(p => p.name || p.role).join(' / ')}
            </span>
          </div>
        )}
        {structure.jurisdiction && (
          <div className={styles.metadataItem}>
            <span className={styles.metadataLabel}>Jurisdiktion</span>
            <span className={styles.metadataValue}>{structure.jurisdiction}</span>
          </div>
        )}
        {structure.industry && structure.industry !== 'other' && (
          <div className={styles.metadataItem}>
            <span className={styles.metadataLabel}>Branche</span>
            <span className={styles.metadataValue}>{INDUSTRY_LABELS[structure.industry] || structure.industry}</span>
          </div>
        )}
        {structure.duration && (
          <div className={styles.metadataItem}>
            <span className={styles.metadataLabel}>Laufzeit</span>
            <span className={styles.metadataValue}>{structure.duration}</span>
          </div>
        )}
        <div className={styles.metadataItem}>
          <span className={styles.metadataLabel}>Qualität</span>
          <span className={styles.metadataValue}>
            {structure.maturity === 'high' ? 'Professionell' : structure.maturity === 'medium' ? 'Solide' : 'Basis'}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Missing Clauses Panel ──
const SEVERITY_CONFIG: Record<string, { label: string; color: string }> = {
  critical: { label: 'Kritisch', color: '#FF3B30' },
  high: { label: 'Wichtig', color: '#FF9500' },
  medium: { label: 'Empfohlen', color: '#007AFF' },
  low: { label: 'Optional', color: '#8E8E93' }
};

function MissingClausesPanel({ missingClauses, resultId }: { missingClauses?: MissingClause[]; resultId: string }) {
  const toast = useToast();
  const [generating, setGenerating] = useState<string | null>(null);
  const [generatedClauses, setGeneratedClauses] = useState<Map<string, { label: string; text: string; whyImportant?: string }>>(new Map());
  const [visibleClause, setVisibleClause] = useState<{ category: string; label: string; text: string; whyImportant?: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [savedToLibrary, setSavedToLibrary] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleGenerate = useCallback(async (category: string, label: string) => {
    // If already generated, just show it
    const existing = generatedClauses.get(category);
    if (existing) {
      setVisibleClause({ category, ...existing });
      setCopied(false);
      setSavedToLibrary(false);
      return;
    }

    setGenerating(category);
    try {
      const res = await apiCall(`/optimizer-v2/results/${resultId}/generate-clause`, {
        method: 'POST',
        body: JSON.stringify({ category })
      }) as { success: boolean; generatedClause: string; whyImportant?: string };
      if (res.success) {
        const clause = { label, text: res.generatedClause, whyImportant: res.whyImportant };
        setGeneratedClauses(prev => new Map(prev).set(category, clause));
        setVisibleClause({ category, ...clause });
        setCopied(false);
        setSavedToLibrary(false);
      }
    } catch {
      // silently fail
    } finally {
      setGenerating(null);
    }
  }, [resultId, generatedClauses]);

  const handleCopy = useCallback(() => {
    if (visibleClause) {
      navigator.clipboard.writeText(visibleClause.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [visibleClause]);

  const handleSaveToLibrary = useCallback(async () => {
    if (!visibleClause || saving) return;
    setSaving(true);
    try {
      // Map V2 categories to SavedClause enum values
      const areaMap: Record<string, string> = {
        parties: 'other', subject: 'other', duration: 'termination',
        termination: 'termination', payment: 'payment', liability: 'liability',
        warranty: 'warranty', confidentiality: 'confidentiality',
        ip_rights: 'intellectual_property', data_protection: 'data_protection',
        non_compete: 'non_compete', force_majeure: 'force_majeure',
        dispute_resolution: 'dispute', general_provisions: 'other',
        deliverables: 'other', sla: 'other', penalties: 'payment',
        insurance: 'other', compliance: 'other', amendments: 'other', other: 'other'
      };
      const res = await apiCall('/clause-library', {
        method: 'POST',
        body: JSON.stringify({
          clauseText: visibleClause.text,
          category: 'important',
          clauseArea: areaMap[visibleClause.category] || 'other',
          userNotes: visibleClause.whyImportant || `Generierte Klausel: ${visibleClause.label}`,
          tags: ['generiert', 'optimizer-v2']
        })
      }) as { success: boolean };
      if (res.success) {
        setSavedToLibrary(true);
        toast.success('Klausel in Bibliothek gespeichert');
      }
    } catch (err: unknown) {
      // 409 = duplicate → clause already exists in library, treat as success
      if (err && typeof err === 'object' && ('duplicate' in err || ('status' in err && (err as { status: number }).status === 409))) {
        setSavedToLibrary(true);
        toast.info('Klausel bereits in Bibliothek vorhanden');
        return;
      }
      const msg = err instanceof Error ? err.message : (err && typeof err === 'object' && 'message' in err ? String((err as { message: unknown }).message) : 'Speichern fehlgeschlagen');
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }, [visibleClause, saving]);

  if (!missingClauses || missingClauses.length === 0) return null;

  const trulyMissing = missingClauses.filter(mc => !mc.foundInContent);
  const miscategorized = missingClauses.filter(mc => mc.foundInContent);

  return (
    <>
      <div className={styles.missingClauses}>
        <div className={styles.missingClausesHeader}>
          <FileWarning size={15} style={{ color: '#FF9500' }} />
          <span className={styles.missingClausesTitle}>
            Fehlende Klauseln ({trulyMissing.length} fehlend{miscategorized.length > 0 ? `, ${miscategorized.length} unvollständig` : ''})
          </span>
        </div>
        <div className={styles.missingClausesList}>
          {trulyMissing.map(mc => {
            const sev = SEVERITY_CONFIG[mc.severity] || SEVERITY_CONFIG.medium;
            const isGenerating = generating === mc.category;
            const isGenerated = generatedClauses.has(mc.category);
            return (
              <div key={mc.category} className={styles.missingClauseItem}>
                <div className={styles.missingClauseDot} style={{ background: sev.color }} />
                <div className={styles.missingClauseInfo}>
                  <span className={styles.missingClauseName}>{mc.categoryLabel}</span>
                  <span className={styles.missingClauseDesc}>{mc.recommendation}</span>
                </div>
                <button
                  className={`${styles.generateClauseBtn} ${isGenerated ? styles.generateClauseBtnDone : ''}`}
                  onClick={() => handleGenerate(mc.category, mc.categoryLabel)}
                  disabled={isGenerating || (generating !== null && !isGenerated)}
                  title={isGenerated ? 'Generierte Klausel anzeigen' : 'Klausel generieren'}
                >
                  {isGenerating
                    ? <Loader2 size={13} className={styles.spinning} />
                    : isGenerated
                      ? <Eye size={13} />
                      : <Sparkles size={13} />
                  }
                  <span>{isGenerating ? 'Generiere...' : isGenerated ? 'Anzeigen' : 'Generieren'}</span>
                </button>
                <span className={styles.missingClauseTag} style={{ color: sev.color, borderColor: sev.color }}>
                  {sev.label}
                </span>
              </div>
            );
          })}
          {miscategorized.map(mc => (
            <div key={mc.category} className={styles.missingClauseItem} style={{ opacity: 0.8 }}>
              <Search size={12} style={{ color: '#FF9500', flexShrink: 0, marginTop: 2 }} />
              <div className={styles.missingClauseInfo}>
                <span className={styles.missingClauseName}>{mc.categoryLabel}</span>
                <span className={styles.missingClauseDesc}>{mc.recommendation}</span>
              </div>
              <span className={styles.missingClauseTag} style={{ color: '#FF9500', borderColor: '#FF9500' }}>
                Im Text
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Generated Clause Modal */}
      {visibleClause && (
        <div className={styles.generatedClauseOverlay} onClick={() => setVisibleClause(null)}>
          <div className={styles.generatedClauseModal} onClick={e => e.stopPropagation()}>
            <div className={styles.generatedClauseHeader}>
              <div className={styles.generatedClauseHeaderLeft}>
                <Sparkles size={16} style={{ color: '#007AFF' }} />
                <span className={styles.generatedClauseTitle}>{visibleClause.label}</span>
              </div>
              <button className={styles.generatedClauseClose} onClick={() => setVisibleClause(null)}>
                <X size={18} />
              </button>
            </div>
            <pre className={styles.generatedClauseText}>{visibleClause.text}</pre>
            {visibleClause.whyImportant && (
              <div className={styles.whyImportant}>
                <AlertTriangle size={14} style={{ color: '#FF9500', flexShrink: 0, marginTop: 1 }} />
                <div>
                  <span className={styles.whyImportantTitle}>Warum ist diese Klausel wichtig?</span>
                  <span className={styles.whyImportantText}>{visibleClause.whyImportant}</span>
                </div>
              </div>
            )}
            <div className={styles.generatedClauseActions}>
              <button className={styles.generatedClauseCopyBtn} onClick={handleCopy}>
                {copied ? <Check size={14} /> : <Copy size={14} />}
                <span>{copied ? 'Kopiert!' : 'In Zwischenablage kopieren'}</span>
              </button>
              <button
                className={`${styles.generatedClauseSaveBtn} ${savedToLibrary ? styles.generatedClauseSaveBtnDone : ''}`}
                onClick={handleSaveToLibrary}
                disabled={saving || savedToLibrary}
              >
                {saving
                  ? <Loader2 size={14} className={styles.spinning} />
                  : savedToLibrary
                    ? <Check size={14} />
                    : <BookmarkPlus size={14} />
                }
                <span>{saving ? 'Speichere...' : savedToLibrary ? 'Gespeichert!' : 'In Klauselbibliothek speichern'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── Score Explanation Panel ──
const SCORE_WEIGHTS = [
  { key: 'risk', label: 'Risiko-Score', weight: 0.20, icon: Shield, color: '#FF3B30' },
  { key: 'fairness', label: 'Fairness-Score', weight: 0.20, icon: Scale, color: '#AF52DE' },
  { key: 'clarity', label: 'Klarheits-Score', weight: 0.15, icon: Eye, color: '#007AFF' },
  { key: 'completeness', label: 'Vollständigkeit', weight: 0.10, icon: CheckSquare, color: '#34C759' },
  { key: 'marketStandard', label: 'Marktstandard', weight: 0.10, icon: BarChart3, color: '#FF9500' },
] as const;

function ScoreExplanation({ scores, result }: { scores: Scores; result: AnalysisResult }) {
  const factors = useMemo(() => {
    return SCORE_WEIGHTS.map(({ key, label, weight, icon, color }) => {
      const value = scores[key] ?? 0;
      const contribution = Math.round(value * weight);
      const isPositive = value >= 70;
      return { key, label, value, weight, contribution, icon, color, isPositive };
    }).sort((a, b) => a.value - b.value); // worst first
  }, [scores]);

  // Find top negative and positive impacts
  const topNegative = useMemo(() => {
    const items: { label: string; impact: string; color: string }[] = [];

    // Check for one-sided clauses
    const oneSided = result.clauseAnalyses.filter(a =>
      a.powerBalance === 'strongly_one_sided' || a.powerBalance === 'extremely_one_sided'
    );
    if (oneSided.length > 0) {
      const clause = result.clauses.find(c => c.id === oneSided[0].clauseId);
      items.push({
        label: `${clause?.title || 'Klausel'} stark einseitig`,
        impact: `−${Math.round(oneSided.length * 3)} Punkte`,
        color: '#FF3B30'
      });
    }

    // Check for missing clauses
    const missing = (scores.missingClauses || []).filter(mc => !mc.foundInContent);
    if (missing.length > 0) {
      items.push({
        label: `${missing.length} essentielle Klausel${missing.length > 1 ? 'n' : ''} fehlen`,
        impact: `−${Math.round(missing.length * 6)} Punkte`,
        color: '#FF9500'
      });
    }

    // Check for high-risk clauses
    const highRisk = result.clauseAnalyses.filter(a => a.riskLevel >= 7);
    if (highRisk.length > 0) {
      items.push({
        label: `${highRisk.length} Klausel${highRisk.length > 1 ? 'n' : ''} mit hohem Risiko`,
        impact: `−${Math.round(highRisk.length * 4)} Punkte`,
        color: '#FF3B30'
      });
    }

    return items.slice(0, 3);
  }, [result, scores]);

  const topPositive = useMemo(() => {
    const items: { label: string; impact: string; color: string }[] = [];

    const strongCount = result.clauseAnalyses.filter(a => a.strength === 'strong').length;
    if (strongCount > 0) {
      items.push({
        label: `${strongCount} professionell formulierte Klauseln`,
        impact: `+${Math.round(strongCount * 2)} Punkte`,
        color: '#34C759'
      });
    }

    const balancedCount = result.clauseAnalyses.filter(a => a.powerBalance === 'balanced').length;
    if (balancedCount > 0) {
      items.push({
        label: `${balancedCount} ausgewogene Klauseln`,
        impact: `+${Math.round(balancedCount * 1.5)} Punkte`,
        color: '#34C759'
      });
    }

    return items.slice(0, 2);
  }, [result]);

  return (
    <div className={styles.scoreExplanation}>
      <div className={styles.scoreExplanationHeader}>
        <Info size={15} style={{ color: '#007AFF' }} />
        <span className={styles.scoreExplanationTitle}>Warum {scores.overall}/100?</span>
      </div>

      {/* Score formula breakdown */}
      <div className={styles.scoreFactors}>
        {factors.map(f => {
          const Icon = f.icon;
          return (
            <div key={f.key} className={styles.scoreFactor}>
              <Icon size={14} style={{ color: f.color }} />
              <span className={styles.scoreFactorLabel}>{f.label}</span>
              <div className={styles.scoreFactorBar}>
                <div
                  className={styles.scoreFactorBarFill}
                  style={{ width: `${f.value}%`, backgroundColor: getScoreColor(f.value) }}
                />
              </div>
              <span className={styles.scoreFactorValue} style={{ color: getScoreColor(f.value) }}>
                {f.value}
              </span>
              <span className={styles.scoreFactorImpact} style={{ color: 'var(--ov2-gray-400)' }}>
                ×{(f.weight * 100).toFixed(0)}%
              </span>
            </div>
          );
        })}
      </div>

      {/* Positive & negative impacts */}
      {(topNegative.length > 0 || topPositive.length > 0) && (
        <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {topNegative.map((item, i) => (
            <div key={`neg-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
              <AlertTriangle size={12} style={{ color: item.color, flexShrink: 0 }} />
              <span style={{ color: 'var(--ov2-gray-600)', flex: 1 }}>{item.label}</span>
              <span style={{ color: item.color, fontWeight: 600, whiteSpace: 'nowrap' }}>{item.impact}</span>
            </div>
          ))}
          {topPositive.map((item, i) => (
            <div key={`pos-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
              <Check size={12} style={{ color: item.color, flexShrink: 0 }} />
              <span style={{ color: 'var(--ov2-gray-600)', flex: 1 }}>{item.label}</span>
              <span style={{ color: item.color, fontWeight: 600, whiteSpace: 'nowrap' }}>{item.impact}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Risk Heatmap Panel ──
const RISK_COLORS: Record<string, string> = {
  low: '#34C759',
  medium: '#FF9500',
  high: '#FF3B30',
  critical: '#AF52DE'
};

function getRiskLevel(avgRisk: number): { label: string; color: string } {
  if (avgRisk >= 7) return { label: 'Kritisch', color: RISK_COLORS.critical };
  if (avgRisk >= 5) return { label: 'Hoch', color: RISK_COLORS.high };
  if (avgRisk >= 3) return { label: 'Mittel', color: RISK_COLORS.medium };
  return { label: 'Gering', color: RISK_COLORS.low };
}

function RiskHeatmap({ result, onNavigate }: { result: AnalysisResult; onNavigate: (tab: string, clauseId?: string) => void }) {
  const categoryRisks = useMemo(() => {
    const map = new Map<string, { risks: number[]; powerBalances: PowerBalance[]; count: number }>();

    for (const clause of result.clauses) {
      const analysis = result.clauseAnalyses.find(a => a.clauseId === clause.id);
      if (!analysis || clause.category === 'other') continue;

      const existing = map.get(clause.category) || { risks: [], powerBalances: [], count: 0 };
      existing.risks.push(analysis.riskLevel);
      existing.powerBalances.push(analysis.powerBalance);
      existing.count++;
      map.set(clause.category, existing);
    }

    return Array.from(map.entries())
      .map(([category, data]) => {
        const avgRisk = data.risks.reduce((a, b) => a + b, 0) / data.risks.length;
        const maxRisk = Math.max(...data.risks);
        const worstBalance = data.powerBalances.includes('extremely_one_sided') ? 'extremely_one_sided'
          : data.powerBalances.includes('strongly_one_sided') ? 'strongly_one_sided'
          : data.powerBalances.includes('slightly_one_sided') ? 'slightly_one_sided' : 'balanced';
        const level = getRiskLevel(maxRisk);

        return { category, avgRisk, maxRisk, count: data.count, worstBalance, ...level };
      })
      .sort((a, b) => b.maxRisk - a.maxRisk);
  }, [result]);

  if (categoryRisks.length === 0) return null;

  return (
    <div className={styles.riskHeatmap}>
      <div className={styles.riskHeatmapHeader}>
        <Activity size={15} style={{ color: '#FF3B30' }} />
        <span className={styles.riskHeatmapTitle}>Risk Heatmap nach Kategorie</span>
      </div>
      <div className={styles.riskHeatmapGrid}>
        {categoryRisks.map(cat => (
          <div
            key={cat.category}
            className={styles.riskHeatmapCell}
            style={{ borderColor: cat.color + '30', background: cat.color + '08' }}
            onClick={() => onNavigate('clauses')}
          >
            <span className={styles.riskHeatmapCellName}>
              {CATEGORY_LABELS[cat.category as ClauseCategory] || cat.category}
            </span>
            <div className={styles.riskHeatmapCellBar}>
              <div
                className={styles.riskHeatmapCellBarFill}
                style={{ width: `${cat.maxRisk * 10}%`, backgroundColor: cat.color }}
              />
            </div>
            <div className={styles.riskHeatmapCellMeta}>
              <span className={styles.riskHeatmapCellRisk} style={{ color: cat.color }}>
                {cat.label}
              </span>
              <span className={styles.riskHeatmapCellCount}>
                {cat.count} Klausel{cat.count > 1 ? 'n' : ''}
              </span>
            </div>
            {cat.worstBalance !== 'balanced' && (
              <span className={styles.riskHeatmapCellTag} style={{ color: cat.color }}>
                {PB_LABELS[cat.worstBalance] || cat.worstBalance}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Top Risk Clauses Panel ──
const POWER_BALANCE_LABELS: Record<PowerBalance, string> = {
  balanced: 'Ausgewogen',
  slightly_one_sided: 'Leicht einseitig',
  strongly_one_sided: 'Deutlich einseitig',
  extremely_one_sided: 'Extrem einseitig'
};

const POWER_BALANCE_RANK: Record<PowerBalance, number> = {
  balanced: 0, slightly_one_sided: 1, strongly_one_sided: 2, extremely_one_sided: 3
};

function TopRiskClauses({ result, onNavigate }: { result: AnalysisResult; onNavigate: (tab: string, clauseId?: string) => void }) {
  const topRisks = useMemo(() => {
    const analysisMap = new Map(result.clauseAnalyses.map(a => [a.clauseId, a]));
    const scoreMap = new Map(result.scores.perClause.map(s => [s.clauseId, s]));

    return result.clauses
      .map(clause => {
        const analysis = analysisMap.get(clause.id);
        const clauseScore = scoreMap.get(clause.id);
        if (!analysis) return null;

        // Composite risk: high importance + high risk + one-sided = higher rank
        const importanceRank = analysis.importanceLevel === 'critical' ? 4 : analysis.importanceLevel === 'high' ? 3 : analysis.importanceLevel === 'medium' ? 1 : 0;
        const pbRank = POWER_BALANCE_RANK[analysis.powerBalance] || 0;
        const riskRank = importanceRank * 3 + analysis.riskLevel + pbRank * 2;

        return { clause, analysis, score: clauseScore?.score, riskRank };
      })
      .filter((item): item is NonNullable<typeof item> => {
        if (!item) return false;
        const a = item.analysis;
        return a.importanceLevel === 'critical'
          || a.importanceLevel === 'high'
          || a.powerBalance === 'strongly_one_sided'
          || a.powerBalance === 'extremely_one_sided'
          || a.riskLevel >= 7;
      })
      .sort((a, b) => b.riskRank - a.riskRank)
      .slice(0, 5);
  }, [result]);

  if (topRisks.length === 0) return null;

  return (
    <div className={styles.topRisks}>
      <div className={styles.topRisksHeader}>
        <Crosshair size={15} style={{ color: '#FF3B30' }} />
        <span className={styles.topRisksTitle}>Kritischste Klauseln</span>
      </div>
      <div className={styles.topRisksList}>
        {topRisks.map(({ clause, analysis, score }, i) => (
          <button
            key={clause.id}
            className={styles.topRiskItem}
            onClick={() => onNavigate('clauses', clause.id)}
          >
            <span className={styles.topRiskRank}>{i + 1}</span>
            <div className={styles.topRiskInfo}>
              <span className={styles.topRiskName}>
                {clause.sectionNumber && clause.sectionNumber !== 'null' && `${clause.sectionNumber} `}{clause.sectionNumber && clause.title?.startsWith(clause.sectionNumber) ? clause.title.slice(clause.sectionNumber.length).trimStart() : clause.title}
              </span>
              <span className={styles.topRiskCategory}>{CATEGORY_LABELS[clause.category]}</span>
            </div>
            <div className={styles.topRiskTags}>
              {analysis.powerBalance !== 'balanced' && (
                <span
                  className={styles.topRiskTag}
                  style={{
                    color: analysis.powerBalance === 'extremely_one_sided' ? '#FF3B30' :
                           analysis.powerBalance === 'strongly_one_sided' ? '#FF9500' : '#8E8E93',
                    borderColor: analysis.powerBalance === 'extremely_one_sided' ? '#FF3B30' :
                                 analysis.powerBalance === 'strongly_one_sided' ? '#FF9500' : '#8E8E93'
                  }}
                >
                  {POWER_BALANCE_LABELS[analysis.powerBalance]}
                </span>
              )}
              {analysis.riskLevel >= 6 && (
                <span className={styles.topRiskTag} style={{ color: '#FF3B30', borderColor: '#FF3B30' }}>
                  Risiko {analysis.riskLevel}/10
                </span>
              )}
            </div>
            {score !== undefined && (
              <span className={styles.topRiskScore} style={{ color: getScoreColor(score) }}>{score}</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
