// PlaybookWizard.tsx — Smart Playbook System: Geführte Vertragserstellung
// Steps 1-4: Modus → Parteien → Entscheidungen → Ergebnis

import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Shield,
  Scale,
  Target,
  ChevronDown,
  Check,
  AlertTriangle,
  Info,
  Lightbulb,
  User,
  Building2,
  FileText,
  Sparkles,
  Loader2,
  Copy,
  ExternalLink,
  BarChart3,
  CheckCircle2
} from 'lucide-react';
import { apiCall } from '../utils/api';
import styles from '../styles/PlaybookWizard.module.css';

// ═══════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════

interface PlaybookOption {
  value: string;
  label: string;
  description: string;
  risk: 'low' | 'medium' | 'high';
  riskNote: string;
  whenProblem: string;
  whenNegotiate: string;
  recommended: Record<string, boolean>;
}

interface PlaybookSection {
  key: string;
  title: string;
  paragraph: string;
  description: string;
  importance: string;
  options: PlaybookOption[];
  smartDefault: Record<string, string>;
}

interface PlaybookMode {
  label: string;
  emoji: string;
  description: string;
  color: string;
}

interface PlaybookRole {
  key: string;
  label: string;
  description: string;
}

interface PartyField {
  key: string;
  label: string;
  type: string;
  required: boolean;
  group: string;
  placeholder?: string;
  options?: Array<{ value: string; label: string }>;
}

interface PlaybookData {
  type: string;
  title: string;
  description: string;
  modes: Record<string, PlaybookMode>;
  roles: Record<string, PlaybookRole>;
  partyFields: PartyField[];
  sections: PlaybookSection[];
}

// ═══════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════

const PlaybookWizard: React.FC = () => {
  const { type } = useParams<{ type: string }>();
  const navigate = useNavigate();

  // State
  const [playbook, setPlaybook] = useState<PlaybookData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(() => {
    // If we have a saved result, jump to Step 4
    try {
      const saved = sessionStorage.getItem(`playbook_result_${type}`);
      if (saved) return 4;
    } catch { /* ignore */ }
    return 1;
  });

  // Step 1: Modus + Rolle
  const [selectedMode, setSelectedMode] = useState<string>('ausgewogen');
  const [selectedRole, setSelectedRole] = useState<string>('A');

  // Step 2: Parteien
  const [partyData, setPartyData] = useState<Record<string, string>>({});

  // Step 3: Entscheidungen
  const [decisions, setDecisions] = useState<Record<string, string>>({});
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [activeDetailTab, setActiveDetailTab] = useState<Record<string, string>>({});

  // Generierung + Ergebnis (Step 4)
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<{
    contractId: string;
    contractText: string;
    modeLabel: string;
    riskProfile: {
      overall: string;
      averageScore: number;
      sections: Array<{ title: string; risk: string; chosenLabel: string; paragraph: string }>;
    };
  } | null>(() => {
    // Restore result from sessionStorage (survives navigation)
    try {
      const saved = sessionStorage.getItem(`playbook_result_${type}`);
      if (saved) return JSON.parse(saved);
    } catch { /* ignore */ }
    return null;
  });
  const [editedText, setEditedText] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [importingToBuilder, setImportingToBuilder] = useState(false);

  // ─── Restore editedText from result ───
  useEffect(() => {
    if (result && !editedText) {
      setEditedText(result.contractText);
    }
  }, [result]);

  // ─── Playbook laden ───
  useEffect(() => {
    if (!type) return;
    loadPlaybook();
  }, [type]);

  const loadPlaybook = async () => {
    try {
      const response = await apiCall(`/playbooks/${type}`) as { success: boolean; playbook: PlaybookData };
      if (response.success && response.playbook) {
        setPlaybook(response.playbook);
        // Smart Defaults initialisieren
        initializeDefaults(response.playbook);
      }
    } catch (err) {
      console.error('Fehler beim Laden des Playbooks:', err);
    } finally {
      setLoading(false);
    }
  };

  const initializeDefaults = (pb: PlaybookData) => {
    // Smart Defaults basierend auf Modus vorausfüllen
    const defaults: Record<string, string> = {};
    for (const section of pb.sections) {
      defaults[section.key] = section.smartDefault['ausgewogen'] || '';
    }
    setDecisions(defaults);
    // Erste Sektion expandiert
    if (pb.sections.length > 0) {
      setExpandedSections(new Set([pb.sections[0].key]));
    }
  };

  // ─── Smart Defaults bei Modus-Wechsel aktualisieren ───
  const handleModeChange = useCallback((mode: string) => {
    setSelectedMode(mode);
    if (!playbook) return;
    // Nur Defaults aktualisieren die der User NICHT manuell geändert hat
    setDecisions(prev => {
      const updated = { ...prev };
      for (const section of playbook.sections) {
        const currentDefault = section.smartDefault[selectedMode];
        // Wenn der aktuelle Wert der alte Default war, auf neuen Default wechseln
        if (prev[section.key] === currentDefault || !prev[section.key]) {
          updated[section.key] = section.smartDefault[mode] || '';
        }
      }
      return updated;
    });
  }, [playbook, selectedMode]);

  // ─── Party Data Handler ───
  const handlePartyField = (key: string, value: string) => {
    setPartyData(prev => ({ ...prev, [key]: value }));
  };

  // ─── Decision Handler ───
  const handleDecision = (sectionKey: string, value: string) => {
    setDecisions(prev => ({ ...prev, [sectionKey]: value }));
  };

  // ─── Section Toggle ───
  const toggleSection = (key: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  // ─── Validierung ───
  const isStep2Valid = (): boolean => {
    if (!playbook) return false;
    return playbook.partyFields
      .filter(f => f.required)
      .every(f => partyData[f.key]?.trim());
  };

  const isStep3Valid = (): boolean => {
    if (!playbook) return false;
    return playbook.sections.every(s => decisions[s.key]);
  };

  // ─── Navigation ───
  const goNext = () => {
    if (currentStep < 3) {
      setCurrentStep(prev => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const goBack = () => {
    if (currentStep > 1 && currentStep < 4) {
      setCurrentStep(prev => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // ─── Generierung ───
  const handleGenerate = async () => {
    if (!playbook || generating) return;
    setGenerating(true);

    try {
      const response = await apiCall(`/playbooks/${type}/generate`, {
        method: 'POST',
        body: JSON.stringify({
          decisions,
          mode: selectedMode,
          partyData
        })
      }) as {
        success: boolean;
        contractId: string;
        contractText: string;
        modeLabel: string;
        riskProfile: {
          overall: string;
          averageScore: number;
          sections: Array<{ title: string; risk: string; chosenLabel: string; paragraph: string }>;
        };
      };

      if (response.success) {
        const newResult = {
          contractId: response.contractId,
          contractText: response.contractText,
          modeLabel: response.modeLabel,
          riskProfile: response.riskProfile
        };
        setResult(newResult);
        setEditedText(response.contractText);
        // Persist in sessionStorage so it survives navigation
        try { sessionStorage.setItem(`playbook_result_${type}`, JSON.stringify(newResult)); } catch { /* ignore */ }
        setCurrentStep(4);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (err) {
      console.error('Fehler bei der Generierung:', err);
    } finally {
      setGenerating(false);
    }
  };

  // ─── Copy to Clipboard ───
  const handleCopy = async () => {
    const text = editedText || result?.contractText;
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // ─── Import to Contract Builder ───
  const handleOpenInBuilder = async () => {
    if (!result || importingToBuilder) return;
    setImportingToBuilder(true);
    try {
      const response = await apiCall('/contract-builder/import-from-generator', {
        method: 'POST',
        body: JSON.stringify({
          contractText: editedText || result.contractText,
          contractType: type || 'nda',
          name: `NDA — Playbook (${result.modeLabel})`,
          contractId: result.contractId
        })
      }) as { success: boolean; documentId: string; blockCount: number };

      if (response.success) {
        navigate(`/contract-builder/${response.documentId}`);
      }
    } catch (err) {
      console.error('Fehler beim Import in Builder:', err);
    } finally {
      setImportingToBuilder(false);
    }
  };

  // ─── Risiko-Info für gewählte Option ───
  const getChosenOption = (section: PlaybookSection): PlaybookOption | null => {
    const chosen = decisions[section.key];
    return section.options.find(o => o.value === chosen) || null;
  };

  // ─── Render Helpers ───

  const MODE_ICONS: Record<string, React.ReactNode> = {
    sicher: <Shield size={22} />,
    ausgewogen: <Scale size={22} />,
    durchsetzungsstark: <Target size={22} />
  };

  const RISK_LABELS: Record<string, string> = {
    low: 'Geringes Risiko',
    medium: 'Mittleres Risiko',
    high: 'Hohes Risiko'
  };

  // ═══════════════════════════════════════════════
  // Loading
  // ═══════════════════════════════════════════════

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner} />
          Playbook wird geladen...
        </div>
      </div>
    );
  }

  if (!playbook) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          Playbook nicht gefunden.
          <button className={styles.btnSecondary} onClick={() => navigate('/playbooks')} style={{ marginLeft: 12 }}>
            Zur Übersicht
          </button>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════
  // STEP 1: Modus + Rolle
  // ═══════════════════════════════════════════════

  const renderStep1 = () => (
    <>
      <div className={styles.stepHeader}>
        <h2 className={styles.stepTitle}>{playbook.title}</h2>
        <p className={styles.stepSubtitle}>
          Wähle deine Strategie und Rolle. Das beeinflusst alle Empfehlungen und Smart Defaults.
        </p>
      </div>

      {/* Modus-Auswahl */}
      <div className={styles.modeGrid}>
        {Object.entries(playbook.modes).map(([key, mode]) => (
          <div
            key={key}
            className={`${styles.modeCard} ${selectedMode === key ? styles.modeCardSelected : ''}`}
            onClick={() => handleModeChange(key)}
          >
            <div className={styles.modeIcon} style={{ background: `${mode.color}15`, color: mode.color }}>
              {MODE_ICONS[key] || <Scale size={22} />}
            </div>
            <h3 className={styles.modeTitle}>{mode.label}</h3>
            <p className={styles.modeDescription}>{mode.description}</p>
          </div>
        ))}
      </div>

      {/* Rollen-Auswahl */}
      <div className={styles.roleSection}>
        <h3 className={styles.roleSectionTitle}>Welche Rolle hast du in diesem Vertrag?</h3>
        <div className={styles.roleCards}>
          {Object.entries(playbook.roles).map(([key, role]) => (
            <div
              key={key}
              className={`${styles.roleCard} ${selectedRole === key ? styles.roleCardSelected : ''}`}
              onClick={() => setSelectedRole(key)}
            >
              <p className={styles.roleLabel}>
                {key === 'A' ? <User size={14} style={{ display: 'inline', marginRight: 6 }} /> : <Building2 size={14} style={{ display: 'inline', marginRight: 6 }} />}
                {role.label}
              </p>
              <p className={styles.roleDescription}>{role.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Info Box */}
      <div className={styles.infoBox}>
        <p className={styles.infoBoxTitle}>
          <Info size={14} />
          Was ist ein NDA?
        </p>
        <p className={styles.infoBoxText}>
          Eine Geheimhaltungsvereinbarung (NDA) schützt vertrauliche Informationen bei Geschäftsbeziehungen.
          Sie legt fest, was als vertraulich gilt, wie lange der Schutz besteht und was bei einem Verstoß passiert.
          Rechtliche Grundlage: BGB §§ 241 ff., GeschGehG.
        </p>
      </div>
    </>
  );

  // ═══════════════════════════════════════════════
  // STEP 2: Parteien
  // ═══════════════════════════════════════════════

  const renderStep2 = () => {
    // Felder nach Gruppen sortieren
    const groups: Record<string, PartyField[]> = {};
    for (const field of playbook.partyFields) {
      if (!groups[field.group]) groups[field.group] = [];
      groups[field.group].push(field);
    }

    const GROUP_LABELS: Record<string, { title: string; icon: React.ReactNode }> = {
      partyA: { title: playbook.roles.A.label, icon: <User size={18} /> },
      partyB: { title: playbook.roles.B.label, icon: <Building2 size={18} /> },
      context: { title: 'Kontext der Vereinbarung', icon: <FileText size={18} /> }
    };

    return (
      <>
        <div className={styles.stepHeader}>
          <h2 className={styles.stepTitle}>Vertragsparteien</h2>
          <p className={styles.stepSubtitle}>
            Gib die Daten der beteiligten Parteien ein.
          </p>
        </div>

        {Object.entries(groups).map(([groupKey, fields]) => {
          const groupInfo = GROUP_LABELS[groupKey] || { title: groupKey, icon: <FileText size={18} /> };
          return (
            <div key={groupKey} className={styles.partySection}>
              <div className={styles.partySectionHeader}>
                <div className={styles.partySectionIcon}>
                  {groupInfo.icon}
                </div>
                <h3 className={styles.partySectionTitle}>{groupInfo.title}</h3>
              </div>
              <div className={styles.fieldGrid}>
                {fields.map(field => (
                  <div
                    key={field.key}
                    className={`${styles.fieldGroup} ${field.type === 'textarea' || field.type === 'select' ? styles.fieldFull : ''}`}
                  >
                    <label className={styles.fieldLabel}>
                      {field.label}
                      {field.required && <span className={styles.fieldRequired}>*</span>}
                    </label>
                    {field.type === 'textarea' ? (
                      <textarea
                        className={styles.fieldInput}
                        value={partyData[field.key] || ''}
                        onChange={e => handlePartyField(field.key, e.target.value)}
                        placeholder={field.placeholder || ''}
                        rows={3}
                      />
                    ) : field.type === 'select' ? (
                      <select
                        className={styles.fieldSelect}
                        value={partyData[field.key] || ''}
                        onChange={e => handlePartyField(field.key, e.target.value)}
                      >
                        <option value="">Bitte wählen...</option>
                        {field.options?.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={field.type}
                        className={styles.fieldInput}
                        value={partyData[field.key] || ''}
                        onChange={e => handlePartyField(field.key, e.target.value)}
                        placeholder={field.placeholder || ''}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </>
    );
  };

  // ═══════════════════════════════════════════════
  // STEP 3: Entscheidungen
  // ═══════════════════════════════════════════════

  const renderStep3 = () => {
    // Berechne Risiko-Summary
    const riskCounts = { low: 0, medium: 0, high: 0 };
    let decisionsCount = 0;
    for (const section of playbook.sections) {
      const chosen = getChosenOption(section);
      if (chosen) {
        riskCounts[chosen.risk]++;
        decisionsCount++;
      }
    }

    return (
      <>
        <div className={styles.stepHeader}>
          <h2 className={styles.stepTitle}>Strategische Entscheidungen</h2>
          <p className={styles.stepSubtitle}>
            Für jede Sektion: Wähle deinen Ansatz. Smart Defaults sind basierend auf Modus "{playbook.modes[selectedMode]?.label}" vorausgewählt.
          </p>
        </div>

        {/* Progress Summary */}
        <div className={styles.progressSummary}>
          <span className={styles.progressItem}>
            <Check size={14} />
            <span className={styles.progressValue}>{decisionsCount}/{playbook.sections.length}</span> Entscheidungen
          </span>
          <span className={styles.progressItem}>
            <Shield size={14} />
            <span className={styles.progressValue} style={{ color: '#22c55e' }}>{riskCounts.low}</span> gering
          </span>
          <span className={styles.progressItem}>
            <AlertTriangle size={14} />
            <span className={styles.progressValue} style={{ color: '#d97706' }}>{riskCounts.medium}</span> mittel
          </span>
          <span className={styles.progressItem}>
            <AlertTriangle size={14} />
            <span className={styles.progressValue} style={{ color: '#dc2626' }}>{riskCounts.high}</span> hoch
          </span>
        </div>

        {/* Section Cards */}
        {playbook.sections.map((section) => {
          const isExpanded = expandedSections.has(section.key);
          const chosenOption = getChosenOption(section);
          const chosenValue = decisions[section.key];
          const detailTab = activeDetailTab[section.key] || 'explanation';

          return (
            <div
              key={section.key}
              className={`${styles.sectionCard} ${isExpanded ? styles.sectionCardActive : ''}`}
            >
              {/* Section Header */}
              <div className={styles.sectionHeader} onClick={() => toggleSection(section.key)}>
                <div className={styles.sectionHeaderLeft}>
                  <span className={styles.sectionParagraph}>{section.paragraph}</span>
                  <h3 className={styles.sectionTitle}>{section.title}</h3>
                </div>
                <div className={styles.sectionHeaderRight}>
                  {chosenOption && (
                    <span className={`${styles.riskBadge} ${
                      chosenOption.risk === 'low' ? styles.riskLow :
                      chosenOption.risk === 'medium' ? styles.riskMedium :
                      styles.riskHigh
                    }`}>
                      {RISK_LABELS[chosenOption.risk]}
                    </span>
                  )}
                  <ChevronDown
                    size={18}
                    className={`${styles.chevron} ${isExpanded ? styles.chevronOpen : ''}`}
                  />
                </div>
              </div>

              {/* Section Body (expanded) */}
              {isExpanded && (
                <div className={styles.sectionBody}>
                  <p className={styles.sectionDescription}>{section.description}</p>

                  {/* Options */}
                  <div className={styles.optionsList}>
                    {section.options.map(option => {
                      const isSelected = chosenValue === option.value;
                      const isRecommended = option.recommended?.[selectedMode];

                      return (
                        <div
                          key={option.value}
                          className={`${styles.optionCard} ${isSelected ? styles.optionCardSelected : ''}`}
                          onClick={() => handleDecision(section.key, option.value)}
                        >
                          <div className={`${styles.optionRadio} ${isSelected ? styles.optionRadioSelected : ''}`}>
                            {isSelected && <div className={styles.optionRadioDot} />}
                          </div>
                          <div className={styles.optionContent}>
                            <div className={styles.optionHeader}>
                              <span className={styles.optionLabel}>{option.label}</span>
                              {isRecommended && (
                                <span className={styles.recommendedBadge}>Empfohlen</span>
                              )}
                              <span className={`${styles.riskBadge} ${
                                option.risk === 'low' ? styles.riskLow :
                                option.risk === 'medium' ? styles.riskMedium :
                                styles.riskHigh
                              }`} style={{ marginLeft: 'auto' }}>
                                {option.risk === 'low' ? 'Gering' : option.risk === 'medium' ? 'Mittel' : 'Hoch'}
                              </span>
                            </div>
                            <p className={styles.optionDescription}>{option.description}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Detail Tabs — nur für gewählte Option */}
                  {chosenOption && (
                    <>
                      <div className={styles.detailTabs}>
                        <button
                          className={`${styles.detailTab} ${detailTab === 'explanation' ? styles.detailTabActive : ''}`}
                          onClick={() => setActiveDetailTab(prev => ({ ...prev, [section.key]: 'explanation' }))}
                        >
                          Risiko-Info
                        </button>
                        <button
                          className={`${styles.detailTab} ${detailTab === 'problem' ? styles.detailTabActive : ''}`}
                          onClick={() => setActiveDetailTab(prev => ({ ...prev, [section.key]: 'problem' }))}
                        >
                          Wann ein Problem?
                        </button>
                        <button
                          className={`${styles.detailTab} ${detailTab === 'negotiate' ? styles.detailTabActive : ''}`}
                          onClick={() => setActiveDetailTab(prev => ({ ...prev, [section.key]: 'negotiate' }))}
                        >
                          Wann verhandeln?
                        </button>
                      </div>

                      <div className={styles.detailContent}>
                        {detailTab === 'explanation' && (
                          <>
                            <p className={styles.detailIcon}>
                              <Shield size={14} />
                              Risiko-Einschätzung
                            </p>
                            <p>{chosenOption.riskNote}</p>
                          </>
                        )}
                        {detailTab === 'problem' && (
                          <>
                            <p className={`${styles.detailIcon} ${styles.detailWarning}`}>
                              <AlertTriangle size={14} />
                              Wann wird das zum Problem?
                            </p>
                            <p>{chosenOption.whenProblem}</p>
                          </>
                        )}
                        {detailTab === 'negotiate' && (
                          <>
                            <p className={`${styles.detailIcon} ${styles.detailTip}`}>
                              <Lightbulb size={14} />
                              Wann solltest du verhandeln?
                            </p>
                            <p>{chosenOption.whenNegotiate}</p>
                          </>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </>
    );
  };

  // ═══════════════════════════════════════════════
  // STEP 4: Ergebnis
  // ═══════════════════════════════════════════════

  const renderStep4 = () => {
    if (!result || !playbook) return null;

    const RISK_COLORS: Record<string, string> = {
      low: '#22c55e',
      medium: '#f59e0b',
      high: '#ef4444'
    };

    const OVERALL_LABELS: Record<string, string> = {
      low: 'Geringes Gesamtrisiko',
      medium: 'Mittleres Gesamtrisiko',
      high: 'Hohes Gesamtrisiko'
    };

    return (
      <>
        {/* Success Header */}
        <div className={styles.resultHeader}>
          <div className={styles.resultIcon}>
            <CheckCircle2 size={32} />
          </div>
          <h2 className={styles.stepTitle}>Dein Vertrag ist fertig!</h2>
          <p className={styles.stepSubtitle}>
            Erstellt im Modus "{result.modeLabel}" mit {playbook.sections.length} strategischen Entscheidungen.
          </p>
        </div>

        {/* Risk Profile Summary */}
        <div className={styles.resultRiskProfile}>
          <div className={styles.resultScoreBox}>
            <div className={styles.resultScore} style={{ color: RISK_COLORS[result.riskProfile.overall] }}>
              {result.riskProfile.averageScore}/100
            </div>
            <div className={styles.resultScoreLabel}>
              {OVERALL_LABELS[result.riskProfile.overall] || 'Risikoprofil'}
            </div>
          </div>
          <div className={styles.resultRiskSections}>
            {result.riskProfile.sections.map((s) => (
              <div key={s.title} className={styles.resultRiskRow}>
                <span className={styles.resultRiskParagraph}>{s.paragraph}</span>
                <span className={styles.resultRiskTitle}>{s.title}</span>
                <span className={`${styles.riskBadge} ${
                  s.risk === 'low' ? styles.riskLow :
                  s.risk === 'medium' ? styles.riskMedium :
                  styles.riskHigh
                }`}>
                  {s.risk === 'low' ? 'Gering' : s.risk === 'medium' ? 'Mittel' : 'Hoch'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className={styles.resultActions}>
          <button className={styles.btnPrimary} onClick={handleCopy}>
            {copied ? <><Check size={16} /> Kopiert!</> : <><Copy size={16} /> Vertrag kopieren</>}
          </button>
          <button className={styles.btnSecondary} onClick={handleOpenInBuilder} disabled={importingToBuilder}>
            {importingToBuilder ? <><Loader2 size={16} className={styles.spinner} /> Importiere...</> : <><ExternalLink size={16} /> Im Builder öffnen</>}
          </button>
          <button className={styles.btnSecondary} onClick={() => navigate(`/contracts/${result.contractId}`)}>
            <FileText size={16} />
            In Verträgen anzeigen
          </button>
        </div>

        {/* Contract Text — editable */}
        <div className={styles.resultContract}>
          <div className={styles.resultContractHeader}>
            <h3>Vertragstext bearbeiten</h3>
            <span className={styles.resultContractBadge}>
              <BarChart3 size={12} />
              Modus: {result.modeLabel}
            </span>
          </div>
          <textarea
            className={styles.resultContractTextarea}
            value={editedText}
            onChange={e => setEditedText(e.target.value)}
            spellCheck={false}
          />
        </div>

        {/* Neuen Vertrag erstellen */}
        <div className={styles.resultNewContract}>
          <button className={styles.btnSecondary} onClick={() => {
            setResult(null);
            setEditedText('');
            try { sessionStorage.removeItem(`playbook_result_${type}`); } catch { /* ignore */ }
            setCurrentStep(1);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}>
            <Sparkles size={16} />
            Neuen Vertrag erstellen
          </button>
        </div>
      </>
    );
  };

  // ═══════════════════════════════════════════════
  // Step Indicator
  // ═══════════════════════════════════════════════

  const steps = [
    { num: 1, label: 'Strategie' },
    { num: 2, label: 'Parteien' },
    { num: 3, label: 'Entscheidungen' },
    { num: 4, label: 'Ergebnis' }
  ];

  return (
    <>
      <Helmet>
        <title>{playbook.title} — Playbook | Contract AI</title>
      </Helmet>

      <div className={styles.container}>
        {/* Back */}
        <button className={styles.backButton} onClick={() => currentStep === 1 ? navigate('/playbooks') : goBack()}>
          <ArrowLeft size={16} />
          {currentStep === 1 ? 'Alle Playbooks' : 'Zurück'}
        </button>

        {/* Step Indicator */}
        <div className={styles.stepIndicator}>
          {steps.map((step, i) => (
            <React.Fragment key={step.num}>
              <div className={styles.step}>
                <div className={`${styles.stepDot} ${
                  currentStep === step.num ? styles.stepDotActive :
                  currentStep > step.num ? styles.stepDotCompleted :
                  styles.stepDotPending
                }`}>
                  {currentStep > step.num ? <Check size={14} /> : step.num}
                </div>
                <span className={`${styles.stepLabel} ${currentStep === step.num ? styles.stepLabelActive : ''}`}>
                  {step.label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div className={`${styles.stepDivider} ${currentStep > step.num ? styles.stepDividerDone : ''}`} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Step Content */}
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
        {currentStep === 4 && renderStep4()}

        {/* Footer Navigation — nur Steps 1-3 */}
        {currentStep < 4 && (
        <div className={styles.footer}>
          <div className={styles.footerLeft}>
            {currentStep > 1 && (
              <button className={styles.btnSecondary} onClick={goBack}>
                <ArrowLeft size={16} />
                Zurück
              </button>
            )}
          </div>

          {currentStep < 3 ? (
            <button
              className={styles.btnPrimary}
              onClick={goNext}
              disabled={currentStep === 2 && !isStep2Valid()}
            >
              Weiter
              <ArrowRight size={16} />
            </button>
          ) : (
            <button
              className={styles.btnPrimary}
              onClick={handleGenerate}
              disabled={generating || !isStep3Valid()}
            >
              {generating ? (
                <>
                  <Loader2 size={16} className={styles.spinner} />
                  Vertrag wird erstellt...
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  Vertrag generieren
                </>
              )}
            </button>
          )}
        </div>
        )}
      </div>
    </>
  );
};

export default PlaybookWizard;
