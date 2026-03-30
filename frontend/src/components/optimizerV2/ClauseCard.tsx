import { useState, useCallback } from 'react';
import { ChevronDown, ChevronUp, MessageSquare, BookOpen, AlertTriangle, CheckCircle, Scale, TrendingUp, Shield, ShieldAlert, Handshake, BookmarkPlus, Loader2 } from 'lucide-react';
import type {
  Clause, ClauseAnalysis, ClauseOptimization, ClauseScore,
  OptimizationMode, ChatMessage
} from '../../types/optimizerV2';
import { CATEGORY_LABELS, STRENGTH_CONFIG, IMPORTANCE_CONFIG } from '../../types/optimizerV2';
import { apiCall } from '../../utils/api';
import { useToast } from '../../context/ToastContext';
import ClauseAlternatives from './ClauseAlternatives';
import ClauseChat from './ClauseChat';
import styles from '../../styles/OptimizerV2.module.css';

// Map OptimizerV2 categories → SavedClause clauseArea
const AREA_MAP: Record<string, string> = {
  termination: 'termination', payment: 'payment', liability: 'liability',
  confidentiality: 'confidentiality', ip_rights: 'intellectual_property',
  warranty: 'warranty', force_majeure: 'force_majeure', dispute: 'dispute',
  data_protection: 'data_protection', non_compete: 'non_compete'
};

interface Props {
  clause: Clause;
  analysis: ClauseAnalysis | undefined;
  optimization: ClauseOptimization | undefined;
  score: ClauseScore | undefined;
  activeMode: OptimizationMode;
  isSelected: boolean;
  onSelect: (clauseId: string | null) => void;
  onAcceptVersion: (clauseId: string, version: 'neutral' | 'proCreator' | 'proRecipient' | 'original' | 'custom', customText?: string) => void;
  chatMessages: ChatMessage[];
  onSendChat: (clauseId: string, message: string) => Promise<unknown>;
}

export default function ClauseCard({
  clause, analysis, optimization, score, activeMode,
  isSelected, onSelect, onAcceptVersion, chatMessages, onSendChat
}: Props) {
  const [showChat, setShowChat] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const toast = useToast();
  const strengthConfig = analysis ? STRENGTH_CONFIG[analysis.strength] : null;
  const categoryLabel = CATEGORY_LABELS[clause.category] || clause.category;

  const handleSaveToLibrary = useCallback(async () => {
    if (saving || saved) return;
    setSaving(true);
    try {
      // Save the optimized version (active mode) if available, otherwise original
      const optimizedText = optimization?.needsOptimization && optimization.versions?.[activeMode]?.text
        ? optimization.versions[activeMode].text
        : clause.originalText;
      const category = optimization?.needsOptimization ? 'good_practice' : 'important';
      const res = await apiCall('/clause-library', {
        method: 'POST',
        body: JSON.stringify({
          clauseText: optimizedText,
          category,
          clauseArea: AREA_MAP[clause.category] || 'other',
          sourceClauseId: clause.id,
          userNotes: `${clause.sectionNumber && clause.sectionNumber !== 'null' ? clause.sectionNumber + ' ' : ''}${clause.sectionNumber && clause.title?.startsWith(clause.sectionNumber) ? clause.title.slice(clause.sectionNumber.length).trimStart() : clause.title}`,
          tags: ['optimizer-v2', clause.category]
        }),
        headers: { 'Content-Type': 'application/json' }
      }) as { success?: boolean };
      if (res?.success) {
        setSaved(true);
        toast.success('Klausel in Bibliothek gespeichert');
      }
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'status' in err && (err as { status: number }).status === 409) {
        setSaved(true);
        toast.info('Klausel bereits in Bibliothek vorhanden');
        return;
      }
      toast.error('Speichern fehlgeschlagen');
    } finally {
      setSaving(false);
    }
  }, [saving, saved, clause, optimization, activeMode, toast]);

  return (
    <div
      className={`${styles.clauseCard} ${isSelected ? styles.clauseCardExpanded : ''}`}
      id={`clause-${clause.id}`}
    >
      {/* Header - always visible */}
      <div className={styles.clauseCardHeader} onClick={() => onSelect(clause.id)}>
        <div className={styles.clauseCardLeft}>
          {clause.sectionNumber && clause.sectionNumber !== 'null' && (
            <span className={styles.clauseSectionNumber}>{clause.sectionNumber}</span>
          )}
          <span className={styles.clauseTitle}>
            {clause.sectionNumber && clause.title?.startsWith(clause.sectionNumber)
              ? clause.title.slice(clause.sectionNumber.length).trimStart()
              : clause.title}
          </span>
          <span className={styles.clauseCategory}>{categoryLabel}</span>
        </div>

        <div className={styles.clauseCardRight}>
          {analysis?.importanceLevel && (analysis.importanceLevel === 'critical' || analysis.importanceLevel === 'high') && (
            <span
              className={styles.importanceBadge}
              style={{ color: IMPORTANCE_CONFIG[analysis.importanceLevel].color }}
            >
              {IMPORTANCE_CONFIG[analysis.importanceLevel].icon}{' '}{IMPORTANCE_CONFIG[analysis.importanceLevel].label}
            </span>
          )}
          {analysis && strengthConfig && (
            <span className={styles.strengthBadge} style={{ color: strengthConfig.color, borderColor: strengthConfig.color }}>
              {analysis.strength === 'critical' || analysis.strength === 'weak'
                ? <AlertTriangle size={12} />
                : <CheckCircle size={12} />
              }
              {strengthConfig.label}
            </span>
          )}
          {score && (
            <span className={styles.clauseScore} style={{
              color: score.score >= 80 ? '#34C759' : score.score >= 60 ? '#FF9500' : score.score >= 40 ? '#FF3B30' : '#AF52DE'
            }}>{score.score}</span>
          )}
          {isSelected ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </div>

      {/* Expanded content */}
      {isSelected && (
        <div className={styles.clauseCardBody}>
          {/* Plain language summary */}
          {analysis && (
            <div className={styles.clauseAnalysis}>
              <div className={styles.clauseSummary}>
                <BookOpen size={14} />
                <p>{analysis.plainLanguage}</p>
              </div>

              {/* Legal assessment */}
              <div className={styles.clauseAssessment}>
                <h4>Juristische Bewertung</h4>
                <p>{analysis.legalAssessment}</p>
              </div>

              {/* Risk info */}
              {analysis.riskLevel > 0 && (
                <div className={styles.clauseRisk}>
                  <span className={styles.riskIndicator}>
                    Risiko: {analysis.riskLevel}/10 ({analysis.riskType})
                  </span>
                </div>
              )}

              {/* Power Balance & Market Comparison */}
              {(analysis.powerBalance || analysis.marketComparison) && (
                <div className={styles.clauseInsights}>
                  {analysis.powerBalance && analysis.powerBalance !== 'balanced' && (
                    <div className={styles.insightItem}>
                      <Scale size={14} style={{ color: analysis.powerBalance === 'extremely_one_sided' ? '#FF3B30' : analysis.powerBalance === 'strongly_one_sided' ? '#FF9500' : '#8E8E93' }} />
                      <span>{
                        analysis.powerBalance === 'slightly_one_sided' ? 'Leicht einseitig' :
                        analysis.powerBalance === 'strongly_one_sided' ? 'Deutlich einseitig' :
                        'Extrem einseitig'
                      }</span>
                    </div>
                  )}
                  {analysis.marketComparison && analysis.marketComparison !== 'market_standard' && (
                    <div className={styles.insightItem}>
                      <TrendingUp size={14} style={{ color: analysis.marketComparison === 'unusually_disadvantageous' ? '#FF3B30' : analysis.marketComparison === 'significantly_strict' ? '#FF9500' : '#007AFF' }} />
                      <span>{
                        analysis.marketComparison === 'below_market' ? 'Unter Marktstandard' :
                        analysis.marketComparison === 'slightly_strict' ? 'Strenger als üblich' :
                        analysis.marketComparison === 'significantly_strict' ? 'Deutlich strenger als üblich' :
                        'Ungewöhnlich nachteilig'
                      }</span>
                    </div>
                  )}
                </div>
              )}

              {/* Economic Risk Assessment */}
              {analysis.economicRiskAssessment && (
                <div className={styles.clauseAssessment}>
                  <h4>Wirtschaftliche Risikobewertung</h4>
                  <p>{analysis.economicRiskAssessment}</p>
                </div>
              )}

              {/* Adversarial Dual Review */}
              {analysis.creatorView && analysis.recipientView && (
                <div className={styles.dualReview}>
                  <h4 className={styles.dualReviewTitle}>Verhandlungsperspektiven</h4>
                  <div className={styles.perspectiveGrid}>
                    <div className={`${styles.perspectiveCard} ${styles.perspectiveCreator}`}>
                      <div className={styles.perspectiveHeader}>
                        <Shield size={13} />
                        <span>Pro Anbieter</span>
                      </div>
                      <p>{analysis.creatorView}</p>
                    </div>
                    <div className={`${styles.perspectiveCard} ${styles.perspectiveRecipient}`}>
                      <div className={styles.perspectiveHeader}>
                        <ShieldAlert size={13} />
                        <span>Pro Empfänger</span>
                      </div>
                      <p>{analysis.recipientView}</p>
                    </div>
                    {analysis.neutralRecommendation && (
                      <div className={`${styles.perspectiveCard} ${styles.perspectiveNeutral}`}>
                        <div className={styles.perspectiveHeader}>
                          <Handshake size={13} />
                          <span>Realistischer Kompromiss</span>
                        </div>
                        <p>{analysis.neutralRecommendation}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Concerns */}
              {analysis.concerns.length > 0 && (
                <div className={styles.clauseConcerns}>
                  <h4>Bedenken</h4>
                  <ul>
                    {analysis.concerns.map((concern, i) => (
                      <li key={i}>{concern}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Legal references */}
              {analysis.legalReferences.length > 0 && (
                <div className={styles.clauseRefs}>
                  {analysis.legalReferences.map((ref, i) => (
                    <span key={i} className={styles.legalRefBadge}>{ref}</span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Optimization alternatives */}
          {optimization && optimization.needsOptimization && (
            <ClauseAlternatives
              clauseId={clause.id}
              originalText={clause.originalText}
              optimization={optimization}
              activeMode={activeMode}
              onAcceptVersion={onAcceptVersion}
            />
          )}

          {/* Original text (collapsible) */}
          <details className={styles.originalTextDetails}>
            <summary>Originaltext anzeigen</summary>
            <pre className={styles.originalText}>{clause.originalText}</pre>
          </details>

          {/* Action row */}
          <div className={styles.clauseActions}>
            <button
              className={styles.chatToggle}
              onClick={() => setShowChat(!showChat)}
            >
              <MessageSquare size={14} />
              {showChat ? 'Chat schließen' : 'Klausel besprechen'}
              {chatMessages.length > 0 && (
                <span className={styles.chatBadge}>{chatMessages.length}</span>
              )}
            </button>
            <button
              className={`${styles.saveToLibraryBtn} ${saved ? styles.saveToLibraryBtnDone : ''}`}
              onClick={handleSaveToLibrary}
              disabled={saving || saved}
              title={saved ? 'In Bibliothek gespeichert' : 'In Klausel-Bibliothek speichern'}
            >
              {saving ? <Loader2 size={14} className={styles.spinIcon} /> : <BookmarkPlus size={14} />}
              {saved ? 'Gespeichert' : 'Speichern'}
            </button>
          </div>

          {showChat && (
            <ClauseChat
              clauseId={clause.id}
              messages={chatMessages}
              onSend={onSendChat}
            />
          )}
        </div>
      )}
    </div>
  );
}
