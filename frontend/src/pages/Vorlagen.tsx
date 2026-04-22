// Vorlagen.tsx — Template-Bibliothek mit Quick-Fill
// System-Vorlagen (18 Typen) + eigene User-Vorlagen + Quick-Fill-Flow

import React, { useState, useEffect, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import {
  FileText, Briefcase, Home, Banknote, User, Handshake,
  Building, Layers, Shield, BookOpen, PenTool, Scale,
  Clock, Copy, Check, X, Sparkles, Search,
  Loader2, ExternalLink
} from 'lucide-react';
import { contractTemplates, templateCategories } from '../data/contractTemplates';
import type { ContractTemplate } from '../data/contractTemplates';
import { fetchUserTemplates } from '../services/userTemplatesAPI';
import type { UserTemplate } from '../services/userTemplatesAPI';
import { apiCall } from '../utils/api';
import styles from '../styles/Vorlagen.module.css';

// Icon mapping
const ICON_MAP: Record<string, React.ReactNode> = {
  FileEdit: <PenTool size={20} />, Briefcase: <Briefcase size={20} />,
  Handshake: <Handshake size={20} />, Wrench: <Building size={20} />,
  ShoppingCart: <Layers size={20} />, Home: <Home size={20} />,
  Banknote: <Banknote size={20} />, ShieldCheck: <Shield size={20} />,
  Users: <BookOpen size={20} />, Award: <Scale size={20} />,
  Building: <Building size={20} />, FileText: <FileText size={20} />,
  User: <User size={20} />,
};

const CAT_ICONS: Record<string, React.ReactNode> = {
  business: <Building size={14} />, employment: <Briefcase size={14} />,
  property: <Home size={14} />, finance: <Banknote size={14} />,
  personal: <User size={14} />,
};

const Vorlagen: React.FC = () => {
  const navigate = useNavigate();
  const [userTemplates, setUserTemplates] = useState<UserTemplate[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<ContractTemplate | null>(null);
  const [selectedUserTemplate, setSelectedUserTemplate] = useState<UserTemplate | null>(null);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [generatedText, setGeneratedText] = useState('');
  const [generatedContractId, setGeneratedContractId] = useState('');

  useEffect(() => {
    loadUserTemplates();
  }, []);

  const loadUserTemplates = async () => {
    try {
      const templates = await fetchUserTemplates();
      setUserTemplates(templates);
    } catch {
      // User might be free plan - that's OK
    }
  };

  // Filter templates
  const filteredSystemTemplates = useMemo(() => {
    return contractTemplates.filter(t => {
      if (t.id === 'individuell') return false; // Skip blank template
      const matchesCat = activeCategory === 'all' || t.category === activeCategory;
      const matchesSearch = !searchQuery ||
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCat && matchesSearch;
    });
  }, [activeCategory, searchQuery]);

  const filteredUserTemplates = useMemo(() => {
    if (!searchQuery) return userTemplates;
    return userTemplates.filter(t =>
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [userTemplates, searchQuery]);

  // ─── Open Quick-Fill Modal ───
  const openTemplate = (template: ContractTemplate) => {
    setSelectedTemplate(template);
    setSelectedUserTemplate(null);
    setFormValues({});
    setGeneratedText('');
    setGeneratedContractId('');
  };

  const openUserTemplate = (template: UserTemplate) => {
    setSelectedUserTemplate(template);
    setSelectedTemplate(null);
    // Pre-fill from saved default values
    const vals: Record<string, string> = {};
    if (template.defaultValues) {
      for (const [k, v] of Object.entries(template.defaultValues)) {
        vals[k] = String(v || '');
      }
    }
    setFormValues(vals);
    setGeneratedText('');
    setGeneratedContractId('');
  };

  const closeModal = () => {
    setSelectedTemplate(null);
    setSelectedUserTemplate(null);
    setFormValues({});
    setGeneratedText('');
  };

  // ─── Generate Contract from Template ───
  const handleGenerate = async () => {
    if (!selectedTemplate || generating) return;
    setGenerating(true);

    try {
      // Build contract text from template clauses + filled variables
      let fullText = `${selectedTemplate.name}\n\n`;
      fullText += `zwischen\n${formValues[selectedTemplate.parties.party1.defaultName.replace(/\{\{|\}\}/g, '')] || selectedTemplate.parties.party1.role} (nachfolgend "${selectedTemplate.parties.party1.role}")\n\n`;
      fullText += `und\n${formValues[selectedTemplate.parties.party2.defaultName.replace(/\{\{|\}\}/g, '')] || selectedTemplate.parties.party2.role} (nachfolgend "${selectedTemplate.parties.party2.role}")\n\n`;

      // Replace variables in clauses
      for (let i = 0; i < selectedTemplate.suggestedClauses.length; i++) {
        const clause = selectedTemplate.suggestedClauses[i];
        let body = clause.body;
        // Replace all {{variable}} with user values
        body = body.replace(/\{\{(\w+)\}\}/g, (_, varName) => {
          return formValues[varName] || `[${varName}]`;
        });
        fullText += `§ ${i + 1} ${clause.title}\n${body}\n\n`;
      }

      // Save to DB via API
      const response = await apiCall('/contracts', {
        method: 'POST',
        body: JSON.stringify({
          name: `${selectedTemplate.name} — Vorlage`,
          content: fullText,
          contractType: selectedTemplate.id,
          isGenerated: true,
          source: 'template',
          status: 'Aktiv',
          formData: formValues
        })
      }) as { contractId?: string; _id?: string };

      const contractId = response.contractId || response._id || '';
      setGeneratedContractId(contractId);
      setGeneratedText(fullText);
    } catch (err) {
      console.error('Fehler bei Vorlagen-Generierung:', err);
    } finally {
      setGenerating(false);
    }
  };

  // ─── Copy generated text ───
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generatedText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* fallback */
    }
  };

  // ─── Render ───
  const isModalOpen = !!(selectedTemplate || selectedUserTemplate);
  const modalTemplate = selectedTemplate;

  return (
    <>
      <Helmet><title>Vorlagen | Contract AI</title></Helmet>

      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.badge}>
            <FileText size={13} />
            Vertragsvorlagen
          </div>
          <h1 className={styles.title}>Vorlagen-Bibliothek</h1>
          <p className={styles.subtitle}>
            Fertige Musterverträge — Felder ausfüllen, exportieren, fertig.
            Oder erstelle eigene Vorlagen für wiederkehrende Verträge.
          </p>
        </div>

        {/* Search */}
        <div style={{ maxWidth: 400, margin: '0 auto 20px', position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input
            type="text"
            placeholder="Vorlage suchen..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              width: '100%', padding: '10px 14px 10px 38px', border: '1px solid #d1d5db',
              borderRadius: '11px', fontSize: '14px', fontFamily: 'inherit', boxSizing: 'border-box'
            }}
          />
        </div>

        {/* Category Filter */}
        <div className={styles.filterRow}>
          <button
            className={`${styles.filterBtn} ${activeCategory === 'all' ? styles.filterBtnActive : ''}`}
            onClick={() => setActiveCategory('all')}
          >
            Alle
            <span className={styles.filterCount}>{contractTemplates.length - 1}</span>
          </button>
          {templateCategories.map(cat => {
            const count = contractTemplates.filter(t => t.category === cat.id && t.id !== 'individuell').length;
            return (
              <button
                key={cat.id}
                className={`${styles.filterBtn} ${activeCategory === cat.id ? styles.filterBtnActive : ''}`}
                onClick={() => setActiveCategory(cat.id)}
              >
                {CAT_ICONS[cat.id]} {cat.name}
                <span className={styles.filterCount}>{count}</span>
              </button>
            );
          })}
        </div>

        {/* User Templates Section */}
        {filteredUserTemplates.length > 0 && (
          <>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Meine Vorlagen</h2>
              <span className={styles.sectionBadge}>{filteredUserTemplates.length} Vorlagen</span>
            </div>
            <div className={styles.grid}>
              {filteredUserTemplates.map(t => (
                <div key={t.id} className={styles.card} onClick={() => openUserTemplate(t)}>
                  <div className={styles.cardHeader}>
                    <div className={styles.cardIcon}><User size={20} /></div>
                    <span className={styles.cardUserBadge}>Eigene Vorlage</span>
                  </div>
                  <h3 className={styles.cardTitle}>{t.name}</h3>
                  <p className={styles.cardDesc}>{t.description || 'Benutzerdefinierte Vorlage'}</p>
                  <div className={styles.cardMeta}>
                    <span className={styles.cardMetaItem}><FileText size={12} /> {t.contractType}</span>
                    <span className={styles.cardMetaItem}><Clock size={12} /> {new Date(t.createdAt).toLocaleDateString('de-DE')}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* System Templates Section */}
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Musterverträge</h2>
          <span className={styles.sectionBadge}>{filteredSystemTemplates.length} Vorlagen</span>
        </div>
        <div className={styles.grid}>
          {filteredSystemTemplates.map(t => (
            <div key={t.id} className={styles.card} onClick={() => openTemplate(t)}>
              <div className={styles.cardHeader}>
                <div className={styles.cardIcon}>{ICON_MAP[t.icon] || <FileText size={20} />}</div>
                <span className={styles.cardSystemBadge}>Mustervertrag</span>
              </div>
              <h3 className={styles.cardTitle}>{t.name}</h3>
              <p className={styles.cardDesc}>{t.description}</p>
              <div className={styles.cardMeta}>
                <span className={styles.cardMetaItem}><Layers size={12} /> {t.suggestedClauses.length} Klauseln</span>
                <span className={styles.cardMetaItem}><PenTool size={12} /> {t.defaultVariables.length} Felder</span>
              </div>
            </div>
          ))}
        </div>

        {filteredSystemTemplates.length === 0 && (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}><Search size={24} /></div>
            <p>Keine Vorlagen gefunden für "{searchQuery}"</p>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════ */}
      {/* QUICK-FILL MODAL                               */}
      {/* ═══════════════════════════════════════════════ */}
      {isModalOpen && modalTemplate && (
        <div className={styles.overlay} onClick={closeModal}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>{modalTemplate.name}</h2>
              <button className={styles.modalClose} onClick={closeModal}><X size={18} /></button>
            </div>
            <p className={styles.modalSubtitle}>{modalTemplate.description} — Felder ausfüllen und Vertrag erstellen.</p>

            {!generatedText ? (
              <>
                <div className={styles.modalBody}>
                  {/* Group variables by group */}
                  {(() => {
                    const groups: Record<string, typeof modalTemplate.defaultVariables> = {};
                    for (const v of modalTemplate.defaultVariables) {
                      const g = v.group || 'Allgemein';
                      if (!groups[g]) groups[g] = [];
                      groups[g].push(v);
                    }
                    return Object.entries(groups).map(([groupName, vars]) => (
                      <div key={groupName} className={styles.formSection}>
                        <p className={styles.formSectionTitle}>{groupName}</p>
                        <div className={styles.formGrid}>
                          {vars.map(v => (
                            <div key={v.name} className={styles.formGroup}>
                              <label className={styles.formLabel}>
                                {v.displayName}
                                {v.required && <span className={styles.formRequired}> *</span>}
                              </label>
                              {v.type === 'select' && v.options ? (
                                <select
                                  className={styles.formInput}
                                  value={formValues[v.name] || ''}
                                  onChange={e => setFormValues(p => ({ ...p, [v.name]: e.target.value }))}
                                >
                                  <option value="">Bitte wählen...</option>
                                  {v.options.map(o => <option key={o} value={o}>{o}</option>)}
                                </select>
                              ) : (
                                <input
                                  type={v.type === 'date' ? 'date' : v.type === 'number' || v.type === 'currency' ? 'number' : 'text'}
                                  className={styles.formInput}
                                  value={formValues[v.name] || ''}
                                  onChange={e => setFormValues(p => ({ ...p, [v.name]: e.target.value }))}
                                  placeholder={v.displayName}
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ));
                  })()}
                </div>
                <div className={styles.modalFooter}>
                  <button className={styles.btnSecondary} onClick={closeModal}>Abbrechen</button>
                  <button
                    className={styles.btnPrimary}
                    onClick={handleGenerate}
                    disabled={generating || !modalTemplate.defaultVariables.filter(v => v.required).every(v => formValues[v.name]?.trim())}
                  >
                    {generating ? <><Loader2 size={16} /> Erstelle...</> : <><Sparkles size={16} /> Vertrag erstellen</>}
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* Generated Result */}
                <div className={styles.modalBody}>
                  <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
                    <button className={styles.btnPrimary} onClick={handleCopy}>
                      {copied ? <><Check size={15} /> Kopiert!</> : <><Copy size={15} /> Kopieren</>}
                    </button>
                    <button className={styles.btnSecondary} onClick={() => navigate(`/contract-builder`)}>
                      <ExternalLink size={15} /> Im Builder öffnen
                    </button>
                    {generatedContractId && (
                      <button className={styles.btnSecondary} onClick={() => navigate(`/contracts/${generatedContractId}`)}>
                        <FileText size={15} /> In Verträgen
                      </button>
                    )}
                  </div>
                  <textarea
                    value={generatedText}
                    onChange={e => setGeneratedText(e.target.value)}
                    style={{
                      width: '100%', minHeight: '350px', padding: '16px', border: '1px solid #e5e7eb',
                      borderRadius: '11px', fontSize: '14px', lineHeight: 1.7, fontFamily: 'inherit',
                      resize: 'vertical', boxSizing: 'border-box'
                    }}
                  />
                </div>
                <div className={styles.modalFooter}>
                  <button className={styles.btnSecondary} onClick={() => { setGeneratedText(''); setGeneratedContractId(''); }}>
                    ← Zurück bearbeiten
                  </button>
                  <button className={styles.btnSecondary} onClick={closeModal}>Schließen</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default Vorlagen;
