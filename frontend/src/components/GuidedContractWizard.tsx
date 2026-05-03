// GuidedContractWizard.tsx — Eingebetteter Playbook-Wizard für den Generate-Flow
// Wird in Generate.tsx verwendet wenn inputMode === 'guided'
// Nutzt den bestehenden Playbook-Backend-Endpoint /api/playbooks/:type/generate

import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield,
  Scale,
  Target,
  ChevronDown,
  Check,
  AlertTriangle,
  Lightbulb,
  User,
  Building2,
  FileText,
  Sparkles,
  Loader2,
  Info
} from 'lucide-react';
import { apiCall } from '../utils/api';
import { getErrorMessage } from '../utils/errorHandling';
import ErrorDisplay from './ErrorDisplay';

// ═══════════════════════════════════════════════
// Types (gleich wie in PlaybookWizard.tsx)
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

interface GuidedContractWizardProps {
  contractType: string;
  contractTypeName: string;
  onComplete: (result: { contractText: string; contractId: string }) => void;
}

// ═══════════════════════════════════════════════
// Styles (inline um keine externen Abhängigkeiten zu schaffen)
// ═══════════════════════════════════════════════

const S = {
  container: { maxWidth: '800px', margin: '0 auto' } as React.CSSProperties,
  // Steps
  stepsRow: { display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '28px' } as React.CSSProperties,
  stepPill: (active: boolean) => ({
    padding: '6px 16px', borderRadius: '20px', fontSize: '13px', fontWeight: active ? 600 : 400,
    // Generate-Theme-Blau (#2E6CF6) statt Indigo — passt zur Firmenfarbe
    background: active ? '#2E6CF6' : '#f3f4f6', color: active ? 'white' : '#6b7280',
    border: 'none', cursor: 'default', transition: 'all 0.2s'
  } as React.CSSProperties),
  // Mode cards
  modeGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '28px' } as React.CSSProperties,
  modeCard: (selected: boolean, color: string) => ({
    background: selected ? `${color}08` : 'white', border: `2px solid ${selected ? color : '#e5e7eb'}`,
    borderRadius: '14px', padding: '20px', cursor: 'pointer', textAlign: 'center' as const,
    transition: 'all 0.2s'
  } as React.CSSProperties),
  modeIcon: (color: string) => ({
    width: '44px', height: '44px', borderRadius: '50%', display: 'flex', alignItems: 'center',
    justifyContent: 'center', margin: '0 auto 10px', background: `${color}12`, color
  } as React.CSSProperties),
  modeTitle: { fontSize: '15px', fontWeight: 600, color: '#111827', margin: '0 0 4px 0' } as React.CSSProperties,
  modeDesc: { fontSize: '12px', color: '#6b7280', margin: 0, lineHeight: 1.4 } as React.CSSProperties,
  // Party fields
  section: { background: 'white', borderRadius: '14px', border: '1px solid #e5e7eb', padding: '22px', marginBottom: '18px' } as React.CSSProperties,
  sectionTitle: { fontSize: '15px', fontWeight: 600, color: '#111827', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' } as React.CSSProperties,
  fieldGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px' } as React.CSSProperties,
  fieldGroup: { display: 'flex', flexDirection: 'column' as const, gap: '5px' } as React.CSSProperties,
  fieldLabel: { fontSize: '13px', fontWeight: 500, color: '#374151' } as React.CSSProperties,
  fieldInput: { padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: '9px', fontSize: '14px', fontFamily: 'inherit', width: '100%', boxSizing: 'border-box' as const } as React.CSSProperties,
  // Section cards (decisions)
  sCard: (expanded: boolean) => ({
    background: 'white', borderRadius: '14px', border: `1px solid ${expanded ? '#c7d2fe' : '#e5e7eb'}`,
    marginBottom: '12px', overflow: 'hidden', transition: 'border-color 0.2s'
  } as React.CSSProperties),
  sHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', cursor: 'pointer' } as React.CSSProperties,
  sHeaderLeft: { display: 'flex', alignItems: 'center', gap: '10px' } as React.CSSProperties,
  sParagraph: { fontSize: '11px', fontWeight: 600, color: '#2E6CF6', background: '#dbeafe', padding: '3px 8px', borderRadius: '5px' } as React.CSSProperties,
  sTitle: { fontSize: '14px', fontWeight: 600, color: '#111827', margin: 0 } as React.CSSProperties,
  sBody: { padding: '0 20px 20px', borderTop: '1px solid #f3f4f6' } as React.CSSProperties,
  sDesc: { fontSize: '13px', color: '#6b7280', margin: '14px 0', lineHeight: 1.5 } as React.CSSProperties,
  // Options
  optCard: (selected: boolean) => ({
    display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '14px',
    border: `2px solid ${selected ? '#2E6CF6' : '#e5e7eb'}`, borderRadius: '11px',
    cursor: 'pointer', transition: 'all 0.2s', marginBottom: '8px',
    background: selected ? '#faf5ff' : 'white'
  } as React.CSSProperties),
  optRadio: (selected: boolean) => ({
    width: '18px', height: '18px', borderRadius: '50%', border: `2px solid ${selected ? '#2E6CF6' : '#d1d5db'}`,
    background: selected ? '#2E6CF6' : 'white', display: 'flex', alignItems: 'center',
    justifyContent: 'center', flexShrink: 0, marginTop: '2px'
  } as React.CSSProperties),
  optDot: { width: '7px', height: '7px', borderRadius: '50%', background: 'white' } as React.CSSProperties,
  optLabel: { fontSize: '13px', fontWeight: 600, color: '#111827' } as React.CSSProperties,
  optDesc: { fontSize: '12px', color: '#6b7280', margin: '2px 0 0 0', lineHeight: 1.4 } as React.CSSProperties,
  recBadge: { fontSize: '10px', fontWeight: 600, background: '#2E6CF6', color: 'white', padding: '2px 7px', borderRadius: '8px', marginLeft: '6px' } as React.CSSProperties,
  riskBadge: (risk: string) => ({
    fontSize: '10px', fontWeight: 600, padding: '3px 8px', borderRadius: '10px', marginLeft: 'auto',
    background: risk === 'low' ? '#ecfdf5' : risk === 'medium' ? '#fef3c7' : '#fef2f2',
    color: risk === 'low' ? '#059669' : risk === 'medium' ? '#d97706' : '#dc2626'
  } as React.CSSProperties),
  // Detail tabs
  detailTabs: { display: 'flex', gap: '3px', background: '#f3f4f6', borderRadius: '9px', padding: '3px', marginTop: '14px', marginBottom: '10px' } as React.CSSProperties,
  detailTab: (active: boolean) => ({
    flex: 1, padding: '7px 10px', border: 'none', borderRadius: '7px', fontSize: '11px',
    fontWeight: active ? 600 : 400, cursor: 'pointer', transition: 'all 0.2s',
    background: active ? 'white' : 'transparent', color: active ? '#111827' : '#6b7280',
    boxShadow: active ? '0 1px 2px rgba(0,0,0,0.06)' : 'none'
  } as React.CSSProperties),
  detailContent: { padding: '14px', background: '#fafbfc', borderRadius: '10px', fontSize: '12px', color: '#374151', lineHeight: 1.6 } as React.CSSProperties,
  // Footer
  footer: { display: 'flex', justifyContent: 'space-between', marginTop: '28px', paddingTop: '20px', borderTop: '1px solid #e5e7eb' } as React.CSSProperties,
  btnPrimary: { display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '10px 22px', background: 'linear-gradient(135deg, #2E6CF6, #1E53D8)', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: 600, color: 'white', cursor: 'pointer' } as React.CSSProperties,
  btnSecondary: { display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '10px 18px', background: 'white', border: '1px solid #d1d5db', borderRadius: '10px', fontSize: '14px', color: '#374151', cursor: 'pointer' } as React.CSSProperties,
  // Summary
  summaryBar: { display: 'flex', gap: '14px', padding: '14px 18px', background: 'white', borderRadius: '11px', border: '1px solid #e5e7eb', marginBottom: '20px', flexWrap: 'wrap' as const } as React.CSSProperties,
  summaryItem: { display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: '#6b7280' } as React.CSSProperties,
};

const MODE_ICONS: Record<string, React.ReactNode> = {
  sicher: <Shield size={20} />,
  ausgewogen: <Scale size={20} />,
  durchsetzungsstark: <Target size={20} />
};

const RISK_LABELS: Record<string, string> = { low: 'Gering', medium: 'Mittel', high: 'Hoch' };

// ═══════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════

const GuidedContractWizard: React.FC<GuidedContractWizardProps> = ({ contractType, contractTypeName, onComplete }) => {
  const [playbook, setPlaybook] = useState<PlaybookData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [wizardStep, setWizardStep] = useState(1); // 1=Modus, 2=Parteien, 3=Entscheidungen

  // Step 1
  const [selectedMode, setSelectedMode] = useState<string>('ausgewogen');
  // Step 2
  const [partyData, setPartyData] = useState<Record<string, string>>({});
  // Step 3
  const [decisions, setDecisions] = useState<Record<string, string>>({});
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [activeDetailTab, setActiveDetailTab] = useState<Record<string, string>>({});
  // Generation
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    loadPlaybook();
  }, [contractType]);

  const loadPlaybook = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiCall(`/playbooks/${contractType}`) as { success: boolean; playbook: PlaybookData };
      if (response.success && response.playbook) {
        setPlaybook(response.playbook);
        const defaults: Record<string, string> = {};
        for (const section of response.playbook.sections) {
          defaults[section.key] = section.smartDefault['ausgewogen'] || '';
        }
        setDecisions(defaults);
        if (response.playbook.sections.length > 0) {
          setExpandedSections(new Set([response.playbook.sections[0].key]));
        }
      } else {
        setError('Playbook konnte nicht geladen werden — Antwort unvollständig.');
      }
    } catch (err) {
      console.error('Playbook laden fehlgeschlagen:', err);
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleResetWizard = () => {
    if (!playbook) return;
    setWizardStep(1);
    setSelectedMode('ausgewogen');
    setPartyData({});
    const defaults: Record<string, string> = {};
    for (const section of playbook.sections) {
      defaults[section.key] = section.smartDefault['ausgewogen'] || '';
    }
    setDecisions(defaults);
    setExpandedSections(playbook.sections.length > 0 ? new Set([playbook.sections[0].key]) : new Set());
    setError(null);
  };

  const handleModeChange = useCallback((mode: string) => {
    setSelectedMode(mode);
    if (!playbook) return;
    setDecisions(prev => {
      const updated = { ...prev };
      for (const section of playbook.sections) {
        const currentDefault = section.smartDefault[selectedMode];
        if (prev[section.key] === currentDefault || !prev[section.key]) {
          updated[section.key] = section.smartDefault[mode] || '';
        }
      }
      return updated;
    });
  }, [playbook, selectedMode]);

  const isStep2Valid = (): boolean => {
    if (!playbook) return false;
    return playbook.partyFields.filter(f => f.required).every(f => partyData[f.key]?.trim());
  };

  const getChosenOption = (section: PlaybookSection): PlaybookOption | null => {
    return section.options.find(o => o.value === decisions[section.key]) || null;
  };

  const handleGenerate = async () => {
    if (!playbook || generating) return;
    setGenerating(true);
    setError(null);
    try {
      const response = await apiCall(`/playbooks/${contractType}/generate`, {
        method: 'POST',
        body: JSON.stringify({ decisions, mode: selectedMode, partyData })
      }) as { success: boolean; contractId: string; contractText: string };

      if (response.success) {
        onComplete({ contractText: response.contractText, contractId: response.contractId });
      } else {
        setError('Generierung fehlgeschlagen — Server lieferte keinen Vertragstext.');
      }
    } catch (err) {
      console.error('Generierung fehlgeschlagen:', err);
      setError(getErrorMessage(err));
    } finally {
      setGenerating(false);
    }
  };

  // ─── Loading / Error / Not found ───
  if (loading) {
    return <div style={{ textAlign: 'center', padding: '60px 0', color: '#6b7280' }}><Loader2 size={24} style={{ animation: 'spin 0.6s linear infinite' }} /> Lade geführte Erstellung...</div>;
  }

  if (error && !playbook) {
    return (
      <div style={{ padding: '24px 0' }}>
        <ErrorDisplay
          error={error}
          variant="card"
          onRetry={loadPlaybook}
          onDismiss={() => setError(null)}
        />
      </div>
    );
  }

  if (!playbook) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 0', color: '#6b7280' }}>
        <Info size={24} style={{ marginBottom: 8 }} />
        <p>Geführte Erstellung ist für "{contractTypeName}" noch nicht verfügbar.</p>
        <p style={{ fontSize: '13px' }}>Bitte nutze den detaillierten Modus.</p>
      </div>
    );
  }

  // ═══════════════════════════════════════════════
  // Wizard Steps
  // ═══════════════════════════════════════════════

  return (
    <div style={S.container}>
      {/* Step Pills (zentriert) + Reset-Button absolut rechts — analog Title oben */}
      <div style={{ position: 'relative', marginBottom: '28px' }}>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
          {['Strategie', 'Parteien', 'Entscheidungen'].map((label, i) => (
            <span key={label} style={S.stepPill(wizardStep === i + 1)}>{i + 1}. {label}</span>
          ))}
        </div>
        {(wizardStep > 1 || Object.keys(partyData).length > 0) && (
          <button
            type="button"
            onClick={handleResetWizard}
            disabled={generating}
            style={{
              position: 'absolute',
              right: 0,
              top: '50%',
              transform: 'translateY(-50%)',
              fontSize: 12,
              padding: '6px 12px',
              border: '1px solid #d1d5db',
              borderRadius: 6,
              background: 'white',
              color: '#6b7280',
              cursor: generating ? 'not-allowed' : 'pointer',
              opacity: generating ? 0.6 : 1
            }}
          >
            ↺ Von vorne
          </button>
        )}
      </div>

      {/* Generation-Error-Banner (für Fehler nach Klick auf "Generieren") */}
      {error && playbook && (
        <div style={{ marginTop: 12 }}>
          <ErrorDisplay
            error={error}
            variant="banner"
            onDismiss={() => setError(null)}
          />
        </div>
      )}

      {/* ─── WIZARD STEP 1: Modus ─── */}
      {wizardStep === 1 && (
        <>
          <div style={S.modeGrid}>
            {Object.entries(playbook.modes).map(([key, mode]) => (
              <div key={key} style={S.modeCard(selectedMode === key, mode.color)} onClick={() => handleModeChange(key)}>
                <div style={S.modeIcon(mode.color)}>{MODE_ICONS[key] || <Scale size={20} />}</div>
                <p style={S.modeTitle}>{mode.label}</p>
                <p style={S.modeDesc}>{mode.description}</p>
              </div>
            ))}
          </div>
          <div style={S.footer}>
            <div />
            <button style={S.btnPrimary} onClick={() => setWizardStep(2)}>
              Weiter <span style={{ fontSize: '16px' }}>→</span>
            </button>
          </div>
        </>
      )}

      {/* ─── WIZARD STEP 2: Parteien ─── */}
      {wizardStep === 2 && (
        <>
          {(() => {
            const groups: Record<string, PartyField[]> = {};
            for (const field of playbook.partyFields) {
              if (!groups[field.group]) groups[field.group] = [];
              groups[field.group].push(field);
            }
            const groupLabels: Record<string, { title: string; icon: React.ReactNode }> = {
              partyA: { title: playbook.roles.A.label, icon: <User size={16} /> },
              partyB: { title: playbook.roles.B.label, icon: <Building2 size={16} /> },
              context: { title: 'Kontext', icon: <FileText size={16} /> }
            };
            return Object.entries(groups).map(([gk, fields]) => {
              const gi = groupLabels[gk] || { title: gk, icon: <FileText size={16} /> };
              return (
                <div key={gk} style={S.section}>
                  <p style={S.sectionTitle}>{gi.icon} {gi.title}</p>
                  <div style={S.fieldGrid}>
                    {fields.map(field => (
                      <div key={field.key} style={{ ...S.fieldGroup, gridColumn: field.type === 'textarea' || field.type === 'select' ? '1 / -1' : undefined }}>
                        <label style={S.fieldLabel}>{field.label}{field.required && <span style={{ color: '#ef4444' }}> *</span>}</label>
                        {field.type === 'textarea' ? (
                          <textarea style={{ ...S.fieldInput, minHeight: '70px', resize: 'vertical' as const }} value={partyData[field.key] || ''} onChange={e => setPartyData(p => ({ ...p, [field.key]: e.target.value }))} placeholder={field.placeholder || ''} />
                        ) : field.type === 'select' ? (
                          <select style={{ ...S.fieldInput, appearance: 'none' as const }} value={partyData[field.key] || ''} onChange={e => setPartyData(p => ({ ...p, [field.key]: e.target.value }))}>
                            <option value="">Bitte wählen...</option>
                            {field.options?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                          </select>
                        ) : (
                          <input type="text" style={S.fieldInput} value={partyData[field.key] || ''} onChange={e => setPartyData(p => ({ ...p, [field.key]: e.target.value }))} placeholder={field.placeholder || ''} />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            });
          })()}
          <div style={S.footer}>
            <button style={S.btnSecondary} onClick={() => setWizardStep(1)}>← Zurück</button>
            <button style={{ ...S.btnPrimary, opacity: isStep2Valid() ? 1 : 0.5 }} onClick={() => isStep2Valid() && setWizardStep(3)} disabled={!isStep2Valid()}>
              Weiter <span style={{ fontSize: '16px' }}>→</span>
            </button>
          </div>
        </>
      )}

      {/* ─── WIZARD STEP 3: Entscheidungen ─── */}
      {wizardStep === 3 && (
        <>
          {/* Summary Bar */}
          {(() => {
            const riskCounts = { low: 0, medium: 0, high: 0 };
            let count = 0;
            for (const s of playbook.sections) { const o = getChosenOption(s); if (o) { riskCounts[o.risk]++; count++; } }
            return (
              <div style={S.summaryBar}>
                <span style={S.summaryItem}><Check size={13} /> <strong>{count}/{playbook.sections.length}</strong> Entscheidungen</span>
                <span style={S.summaryItem}><Shield size={13} /> <strong style={{ color: '#22c55e' }}>{riskCounts.low}</strong> gering</span>
                <span style={S.summaryItem}><AlertTriangle size={13} /> <strong style={{ color: '#d97706' }}>{riskCounts.medium}</strong> mittel</span>
                <span style={S.summaryItem}><AlertTriangle size={13} /> <strong style={{ color: '#dc2626' }}>{riskCounts.high}</strong> hoch</span>
              </div>
            );
          })()}

          {/* Section Cards */}
          {playbook.sections.map(section => {
            const isExp = expandedSections.has(section.key);
            const chosen = getChosenOption(section);
            const dTab = activeDetailTab[section.key] || 'explanation';
            return (
              <div key={section.key} style={S.sCard(isExp)}>
                <div style={S.sHeader} onClick={() => setExpandedSections(prev => { const n = new Set(prev); if (n.has(section.key)) { n.delete(section.key); } else { n.add(section.key); } return n; })}>
                  <div style={S.sHeaderLeft}>
                    <span style={S.sParagraph}>{section.paragraph}</span>
                    <h4 style={S.sTitle}>{section.title}</h4>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {chosen && <span style={S.riskBadge(chosen.risk)}>{RISK_LABELS[chosen.risk]}</span>}
                    <ChevronDown size={16} style={{ color: '#9ca3af', transform: isExp ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                  </div>
                </div>
                {isExp && (
                  <div style={S.sBody}>
                    <p style={S.sDesc}>{section.description}</p>
                    {section.options.map(opt => {
                      const isSel = decisions[section.key] === opt.value;
                      const isRec = opt.recommended?.[selectedMode];
                      return (
                        <div key={opt.value} style={S.optCard(isSel)} onClick={() => setDecisions(p => ({ ...p, [section.key]: opt.value }))}>
                          <div style={S.optRadio(isSel)}>{isSel && <div style={S.optDot} />}</div>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                              <span style={S.optLabel}>{opt.label}</span>
                              {isRec && <span style={S.recBadge}>Empfohlen</span>}
                              <span style={S.riskBadge(opt.risk)}>{RISK_LABELS[opt.risk]}</span>
                            </div>
                            <p style={S.optDesc}>{opt.description}</p>
                          </div>
                        </div>
                      );
                    })}
                    {chosen && (
                      <>
                        <div style={S.detailTabs}>
                          <button style={S.detailTab(dTab === 'explanation')} onClick={() => setActiveDetailTab(p => ({ ...p, [section.key]: 'explanation' }))}>Risiko-Info</button>
                          <button style={S.detailTab(dTab === 'problem')} onClick={() => setActiveDetailTab(p => ({ ...p, [section.key]: 'problem' }))}>Wann ein Problem?</button>
                          <button style={S.detailTab(dTab === 'negotiate')} onClick={() => setActiveDetailTab(p => ({ ...p, [section.key]: 'negotiate' }))}>Wann verhandeln?</button>
                        </div>
                        <div style={S.detailContent}>
                          {dTab === 'explanation' && <><p style={{ fontWeight: 600, marginBottom: 4 }}><Shield size={12} /> Risiko-Einschätzung</p><p>{chosen.riskNote}</p></>}
                          {dTab === 'problem' && <><p style={{ fontWeight: 600, marginBottom: 4, color: '#d97706' }}><AlertTriangle size={12} /> Wann wird das zum Problem?</p><p>{chosen.whenProblem}</p></>}
                          {dTab === 'negotiate' && <><p style={{ fontWeight: 600, marginBottom: 4, color: '#2E6CF6' }}><Lightbulb size={12} /> Wann solltest du verhandeln?</p><p>{chosen.whenNegotiate}</p></>}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          <div style={S.footer}>
            <button style={S.btnSecondary} onClick={() => setWizardStep(2)}>← Zurück</button>
            <button style={{ ...S.btnPrimary, opacity: generating ? 0.6 : 1 }} onClick={handleGenerate} disabled={generating}>
              {generating ? <><Loader2 size={16} /> Vertrag wird erstellt...</> : <><Sparkles size={16} /> Vertrag generieren</>}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default GuidedContractWizard;
