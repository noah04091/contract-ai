// PlaybookReview.tsx — Playbook-System: Dashboard, Builder, Detail, Check
// Zentraler Einstiegspunkt fuer regelbasierte Vertragspruefung

import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Shield,
  Plus,
  FileText,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  ArrowLeft,
  Trash2,
  Edit3,
  Play,
  Star,
  Globe,
  Sparkles,
  Loader2,
  ChevronRight,
  Copy,
  Search,
  BookOpen
} from 'lucide-react';
import * as playbookAPI from '../services/playbookReviewAPI';
import { playbookTemplates } from '../data/playbookTemplates';
import { useToast } from '../context/ToastContext';
import { WelcomePopup } from '../components/Tour';
import styles from '../styles/PlaybookReview.module.css';

// ============================================
// TYPES
// ============================================
interface PlaybookRule {
  _id?: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  threshold: string;
  note?: string;
  standardText?: string;
}

interface Playbook {
  _id: string;
  name: string;
  description: string;
  contractType: string;
  role: string;
  industry: string;
  isDefault: boolean;
  isGlobal: boolean;
  status: string;
  rules: PlaybookRule[];
  checksCount: number;
  lastCheckAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface CheckResult {
  _id: string;
  ruleId: string;
  ruleTitle: string;
  ruleCategory: string;
  rulePriority: string;
  status: 'passed' | 'warning' | 'failed' | 'not_found';
  confidence: number;
  finding: string;
  clauseReference: string;
  deviation: string;
  riskLevel: string;
  riskExplanation: string;
  alternativeText: string;
  negotiationTip: string;
  isGlobalRule: boolean;
}

interface PlaybookCheck {
  _id: string;
  playbookId: string | { _id: string; name: string };
  contractId?: string;
  contractName: string;
  results: CheckResult[];
  summary: {
    passed: number;
    warnings: number;
    failed: number;
    notFound: number;
    totalRules: number;
    overallScore: number;
    overallRisk: string;
    recommendation: string;
  };
  checkedAt: string;
}

interface ContractItem {
  _id: string;
  name: string;
  contractType?: string;
  hasExtractedText?: boolean;
}

type View = 'dashboard' | 'builder' | 'detail' | 'check-result';

// ============================================
// CONSTANTS
// ============================================
const CATEGORY_LABELS: Record<string, string> = {
  zahlung: 'Zahlung',
  haftung: 'Haftung',
  kuendigung: 'Kündigung',
  gewaehrleistung: 'Gewährleistung',
  vertraulichkeit: 'Vertraulichkeit',
  datenschutz: 'Datenschutz',
  eigentum: 'Eigentum',
  force_majeure: 'Höhere Gewalt',
  vertragsstrafe: 'Vertragsstrafe',
  laufzeit: 'Laufzeit',
  abnahme: 'Abnahme',
  formvorschriften: 'Formvorschriften',
  gerichtsstand: 'Gerichtsstand',
  sonstiges: 'Sonstiges'
};

const PRIORITY_LABELS: Record<string, { label: string; color: string }> = {
  muss: { label: 'Pflicht', color: '#ef4444' },
  soll: { label: 'Empfohlen', color: '#f59e0b' },
  kann: { label: 'Optional', color: '#6b7280' }
};

const ROLE_LABELS: Record<string, string> = {
  auftraggeber: 'Auftraggeber',
  auftragnehmer: 'Auftragnehmer',
  neutral: 'Neutral'
};

const CONTRACT_TYPES = [
  'Allgemein', 'NDA / Geheimhaltung', 'Dienstleistungsvertrag', 'Liefervertrag',
  'Mietvertrag', 'Arbeitsvertrag', 'Kaufvertrag', 'Werkvertrag', 'Lizenzvertrag',
  'Rahmenvertrag', 'SaaS-Vertrag', 'Beratungsvertrag', 'Kooperationsvertrag',
  'AGB', 'Auftragsverarbeitung (AVV)', 'Gesellschaftsvertrag', 'Franchisevertrag',
  'Bauvertrag', 'Pachtvertrag', 'Versicherungsvertrag'
];

const INDUSTRIES = [
  { value: 'allgemein', label: 'Allgemein' },
  { value: 'it_software', label: 'IT & Software' },
  { value: 'handwerk', label: 'Handwerk' },
  { value: 'bau', label: 'Bauwesen' },
  { value: 'immobilien', label: 'Immobilien' },
  { value: 'beratung', label: 'Beratung' },
  { value: 'produktion', label: 'Produktion' },
  { value: 'handel', label: 'Handel' },
  { value: 'gesundheit', label: 'Gesundheit' },
  { value: 'finanzen', label: 'Finanzen' },
  { value: 'energie', label: 'Energie' },
  { value: 'logistik', label: 'Logistik' }
];

// Helper: UTF-8 Encoding-Artefakte in Vertragsnamen reparieren
const fixEncoding = (text: string): string => {
  if (!text) return text;
  return text
    .replace(/Ã¤/g, 'ä').replace(/Ã¶/g, 'ö').replace(/Ã¼/g, 'ü')
    .replace(/Ã„/g, 'Ä').replace(/Ã–/g, 'Ö').replace(/Ãœ/g, 'Ü')
    .replace(/ÃŸ/g, 'ß').replace(/Ã©/g, 'é').replace(/Ã¨/g, 'è')
    .replace(/Ã /g, 'à').replace(/Ã¢/g, 'â');
};

// ============================================
// MAIN COMPONENT
// ============================================
const PlaybookReview: React.FC = () => {
  const { playbookId } = useParams<{ playbookId?: string }>();
  const navigate = useNavigate();
  const toast = useToast();

  // View State
  const [view, setView] = useState<View>('dashboard');
  const [isLoading, setIsLoading] = useState(true);

  // Dashboard State
  const [playbooks, setPlaybooks] = useState<Playbook[]>([]);
  const [globalPlaybook, setGlobalPlaybook] = useState<Playbook | null>(null);
  const [recentChecks, setRecentChecks] = useState<PlaybookCheck[]>([]);
  const [stats, setStats] = useState({ total: 0, active: 0, draft: 0, totalRules: 0, totalChecks: 0 });

  // Builder State
  const [builderStep, setBuilderStep] = useState(1);
  const [builderData, setBuilderData] = useState({
    name: '',
    contractType: 'Allgemein',
    role: 'neutral' as string,
    industry: 'allgemein' as string,
    description: ''
  });
  const [generatedRules, setGeneratedRules] = useState<PlaybookRule[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  // Detail State
  const [selectedPlaybook, setSelectedPlaybook] = useState<Playbook | null>(null);
  const [playbookChecks, setPlaybookChecks] = useState<PlaybookCheck[]>([]);
  // Check State
  const [isChecking, setIsChecking] = useState(false);
  const [showCheckModal, setShowCheckModal] = useState(false);
  const [contracts, setContracts] = useState<ContractItem[]>([]);
  const [selectedContractId, setSelectedContractId] = useState<string>('');
  const [contractSearch, setContractSearch] = useState('');
  const [checkResult, setCheckResult] = useState<PlaybookCheck | null>(null);
  const [expandedResults, setExpandedResults] = useState<Set<string>>(new Set());
  const [showExtractModal, setShowExtractModal] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [isLoadingContracts, setIsLoadingContracts] = useState(false);

  // Expandable rule cards in detail view
  const [expandedRuleId, setExpandedRuleId] = useState<string | null>(null);
  const [editingRule, setEditingRule] = useState<PlaybookRule | null>(null);
  const [isRuleDirty, setIsRuleDirty] = useState(false);
  const [isSavingRule, setIsSavingRule] = useState(false);

  // PDF + Negotiation Letter
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [negotiationLetter, setNegotiationLetter] = useState<string>('');
  const [isGeneratingLetter, setIsGeneratingLetter] = useState(false);
  const [showLetterModal, setShowLetterModal] = useState(false);
  const [contractPdfUrl, setContractPdfUrl] = useState<string>('');
  const [showPdfPreview, setShowPdfPreview] = useState<string | null>(null);

  // ============================================
  // DATA LOADING
  // ============================================
  const loadDashboard = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await playbookAPI.getPlaybooks();
      setPlaybooks(data.playbooks || []);
      setGlobalPlaybook(data.globalPlaybook || null);
      setRecentChecks(data.recentChecks || []);
      setStats(data.stats || { total: 0, active: 0, draft: 0, totalRules: 0, totalChecks: 0 });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Fehler beim Laden');
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const loadPlaybookDetail = useCallback(async (id: string) => {
    setIsLoading(true);
    try {
      const data = await playbookAPI.getPlaybook(id);
      setSelectedPlaybook(data.playbook);
      setPlaybookChecks(data.checks || []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Playbook nicht gefunden');
      setView('dashboard');
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (playbookId) {
      setView('detail');
      loadPlaybookDetail(playbookId);
    } else {
      loadDashboard();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playbookId]);

  // Playbook laden wenn Check-Ergebnis vom Dashboard kommt (für Standardtext/Notiz)
  useEffect(() => {
    if (view === 'check-result' && checkResult && !selectedPlaybook) {
      const pbId = typeof checkResult.playbookId === 'object'
        ? checkResult.playbookId._id
        : checkResult.playbookId;
      if (pbId) loadPlaybookDetail(pbId);
    }
  }, [view, checkResult, selectedPlaybook, loadPlaybookDetail]);

  // PDF-URL laden wenn Check-Ergebnis angezeigt wird
  useEffect(() => {
    if (view === 'check-result' && checkResult?.contractId && !contractPdfUrl) {
      fetch(`/api/playbook-review/contracts/${checkResult.contractId}/pdf-url`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        credentials: 'include'
      })
        .then(r => r.ok ? r.json() : null)
        .then(data => { if (data?.pdfUrl) setContractPdfUrl(data.pdfUrl); })
        .catch(() => {});
    }
    if (view !== 'check-result') {
      setContractPdfUrl('');
      setShowPdfPreview(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, checkResult?.contractId]);

  // ============================================
  // BUILDER ACTIONS
  // ============================================
  const handleGenerateRules = async () => {
    setIsGenerating(true);
    try {
      const data = await playbookAPI.generateRules({
        contractType: builderData.contractType,
        role: builderData.role,
        industry: builderData.industry
      });
      setGeneratedRules(data.rules || []);
      setBuilderStep(3);
      toast.success(`${data.rules?.length || 0} Regeln generiert`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Fehler bei der Generierung');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleOpenExtractModal = async () => {
    setShowExtractModal(true);
    setSelectedContractId('');
    setContractSearch('');
    setIsLoadingContracts(true);
    try {
      const data = await playbookAPI.getContractsList();
      setContracts(data.contracts || []);
    } catch {
      toast.error('Fehler beim Laden der Verträge');
    } finally {
      setIsLoadingContracts(false);
    }
  };

  const handleExtractFromContract = async () => {
    if (!selectedContractId) return;
    setIsExtracting(true);
    setShowExtractModal(false);

    try {
      const contractData = await playbookAPI.getContractText(selectedContractId);
      const data = await playbookAPI.extractRules({
        contractText: contractData.text,
        role: builderData.role
      });
      setGeneratedRules(data.rules || []);
      setBuilderStep(3);
      toast.success(`${data.rules?.length || 0} Regeln aus Vertrag extrahiert`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('Text') || msg.includes('text') || msg.includes('kurz')) {
        toast.error('Dieser Vertrag hat keinen lesbaren Text. Bitte wählen Sie einen anderen Vertrag oder laden Sie eine neue PDF hoch.');
      } else {
        toast.error(msg || 'Fehler bei der Extraktion');
      }
    } finally {
      setIsExtracting(false);
    }
  };

  const handleSavePlaybook = async () => {
    if (!builderData.name.trim()) {
      toast.error('Bitte geben Sie einen Namen ein');
      return;
    }
    if (generatedRules.length === 0) {
      toast.error('Bitte fügen Sie mindestens eine Regel hinzu');
      return;
    }

    try {
      const data = await playbookAPI.createPlaybook({
        name: builderData.name.trim(),
        description: builderData.description,
        contractType: builderData.contractType,
        role: builderData.role,
        industry: builderData.industry,
        rules: generatedRules
      });
      toast.success('Playbook erstellt!');
      navigate(`/playbook-review/${data.playbook._id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Fehler beim Speichern');
    }
  };

  const handleRemoveRule = (index: number) => {
    setGeneratedRules(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpdateRule = (index: number, field: string, value: string) => {
    setGeneratedRules(prev => prev.map((r, i) =>
      i === index ? { ...r, [field]: value } : r
    ));
  };

  // ============================================
  // DETAIL ACTIONS
  // ============================================
  const handleDeletePlaybook = async (id: string) => {
    if (!window.confirm('Playbook wirklich löschen?')) return;
    try {
      await playbookAPI.deletePlaybook(id);
      toast.success('Playbook geloescht');
      navigate('/playbook-review');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Fehler beim Löschen');
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await playbookAPI.updatePlaybook(id, { isDefault: true });
      toast.success('Als Standard-Playbook gesetzt');
      if (selectedPlaybook) {
        setSelectedPlaybook({ ...selectedPlaybook, isDefault: true });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Fehler');
    }
  };

  // ============================================
  // RULE EXPAND/EDIT ACTIONS
  // ============================================
  const toggleRuleExpanded = (ruleId: string) => {
    if (expandedRuleId === ruleId) {
      if (isRuleDirty && !window.confirm('Ungespeicherte Änderungen verwerfen?')) return;
      setExpandedRuleId(null);
      setEditingRule(null);
      setIsRuleDirty(false);
    } else {
      if (isRuleDirty && !window.confirm('Ungespeicherte Änderungen verwerfen?')) return;
      setExpandedRuleId(ruleId);
      const rule = selectedPlaybook?.rules.find(r => r._id === ruleId);
      setEditingRule(rule ? { ...rule } : null);
      setIsRuleDirty(false);
    }
  };

  const handleRuleFieldChange = (field: keyof PlaybookRule, value: string) => {
    if (!editingRule) return;
    setEditingRule({ ...editingRule, [field]: value });
    setIsRuleDirty(true);
  };

  const handleSaveRule = async () => {
    if (!selectedPlaybook || !editingRule || !expandedRuleId) return;
    setIsSavingRule(true);
    try {
      const updatedRules = selectedPlaybook.rules.map(r =>
        r._id === expandedRuleId ? { ...editingRule } : r
      );
      await playbookAPI.updatePlaybook(selectedPlaybook._id, { rules: updatedRules });
      setSelectedPlaybook({ ...selectedPlaybook, rules: updatedRules });
      setIsRuleDirty(false);
      toast.success('Regel gespeichert');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Fehler beim Speichern');
    } finally {
      setIsSavingRule(false);
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!selectedPlaybook) return;
    if (selectedPlaybook.rules.length <= 1) {
      toast.error('Ein Playbook muss mindestens eine Regel haben.');
      return;
    }
    if (!window.confirm('Regel wirklich entfernen?')) return;
    try {
      const updatedRules = selectedPlaybook.rules.filter(r => r._id !== ruleId);
      await playbookAPI.updatePlaybook(selectedPlaybook._id, { rules: updatedRules });
      setSelectedPlaybook({ ...selectedPlaybook, rules: updatedRules });
      setExpandedRuleId(null);
      setEditingRule(null);
      setIsRuleDirty(false);
      toast.success('Regel entfernt');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Fehler beim Entfernen');
    }
  };

  // Helper: Lookup rule note/standardText for check results
  const getRuleNote = (ruleId: string): string => {
    if (!selectedPlaybook) return '';
    const rule = selectedPlaybook.rules.find(r => r._id === ruleId);
    return rule?.note || '';
  };

  const getRuleStandardText = (ruleId: string): string => {
    if (!selectedPlaybook) return '';
    const rule = selectedPlaybook.rules.find(r => r._id === ruleId);
    return rule?.standardText || '';
  };

  // ============================================
  // CHECK ACTIONS
  // ============================================
  const handleOpenCheck = async () => {
    setShowCheckModal(true);
    setSelectedContractId('');
    setContractSearch('');
    setIsLoadingContracts(true);
    try {
      const data = await playbookAPI.getContractsList();
      setContracts(data.contracts || []);
    } catch {
      toast.error('Fehler beim Laden der Verträge');
    } finally {
      setIsLoadingContracts(false);
    }
  };

  const handleRunCheck = async () => {
    if (!selectedPlaybook || !selectedContractId) return;
    setIsChecking(true);
    setShowCheckModal(false);

    try {
      // Vertragstext laden
      const contractData = await playbookAPI.getContractText(selectedContractId);

      // Prüfung durchfuehren
      const result = await playbookAPI.checkContract(selectedPlaybook._id, {
        contractText: contractData.text,
        contractName: contractData.contractName,
        contractId: selectedContractId
      });

      setCheckResult(result.check);
      setView('check-result');
      toast.success('Prüfung abgeschlossen!');
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('Text') || msg.includes('text') || msg.includes('kurz')) {
        toast.error('Dieser Vertrag hat keinen lesbaren Text. Bitte wählen Sie einen Vertrag mit extrahiertem Text.');
      } else {
        toast.error(msg || 'Fehler bei der Prüfung');
      }
    } finally {
      setIsChecking(false);
    }
  };

  // ============================================
  // PDF + LETTER ACTIONS
  // ============================================
  const handleExportPdf = async () => {
    if (!checkResult) return;
    setIsExportingPdf(true);
    try {
      const response = await fetch(`/api/playbook-review/checks/${checkResult._id}/export-pdf`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        credentials: 'include'
      });
      if (!response.ok) throw new Error('PDF-Export fehlgeschlagen');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Pruefbericht_${checkResult.contractName || 'Vertrag'}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('PDF heruntergeladen');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'PDF-Export fehlgeschlagen');
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleGenerateLetter = async () => {
    if (!checkResult) return;
    setIsGeneratingLetter(true);
    setShowLetterModal(true);
    try {
      const response = await fetch(`/api/playbook-review/checks/${checkResult._id}/negotiation-letter`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Brief konnte nicht generiert werden');
      const data = await response.json();
      setNegotiationLetter(data.letterText || '');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Fehler bei der Generierung');
      setShowLetterModal(false);
    } finally {
      setIsGeneratingLetter(false);
    }
  };

  const handleDownloadLetterPdf = async () => {
    if (!checkResult) return;
    try {
      const response = await fetch(`/api/playbook-review/checks/${checkResult._id}/negotiation-letter/pdf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        credentials: 'include'
      });
      if (!response.ok) throw new Error('PDF-Export fehlgeschlagen');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Verhandlungsbrief_${checkResult.contractName || 'Vertrag'}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'PDF-Export fehlgeschlagen');
    }
  };

  const toggleResultExpanded = (id: string) => {
    setExpandedResults(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('In Zwischenablage kopiert');
  };

  // ============================================
  // STATUS ICON
  // ============================================
  const StatusIcon = ({ status }: { status: string }) => {
    switch (status) {
      case 'passed':
        return <CheckCircle2 size={18} className={styles.statusPassed} />;
      case 'warning':
        return <AlertTriangle size={18} className={styles.statusWarning} />;
      case 'failed':
        return <XCircle size={18} className={styles.statusFailed} />;
      case 'not_found':
        return <HelpCircle size={18} className={styles.statusNotFound} />;
      default:
        return null;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#10b981';
    if (score >= 50) return '#f59e0b';
    return '#ef4444';
  };

  // ============================================
  // RENDER: DASHBOARD
  // ============================================
  const renderDashboard = () => (
    <div className={styles.dashboard}>
      {/* Stats */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <Shield size={20} />
          <div>
            <span className={styles.statValue}>{stats.total}</span>
            <span className={styles.statLabel}>Playbooks</span>
          </div>
        </div>
        <div className={styles.statCard}>
          <BookOpen size={20} />
          <div>
            <span className={styles.statValue}>{stats.totalRules}</span>
            <span className={styles.statLabel}>Regeln gesamt</span>
          </div>
        </div>
        <div className={styles.statCard}>
          <CheckCircle2 size={20} />
          <div>
            <span className={styles.statValue}>{stats.totalChecks}</span>
            <span className={styles.statLabel}>Prüfungen</span>
          </div>
        </div>
      </div>

      {/* Globale Anforderungen */}
      {globalPlaybook && (
        <div className={styles.globalSection}>
          <div className={styles.sectionHeader}>
            <Globe size={18} />
            <h3>Globale Anforderungen</h3>
            <span className={styles.badge}>{globalPlaybook.rules.length} Regeln</span>
          </div>
          <p className={styles.sectionDesc}>
            Diese Regeln werden bei jeder Prüfung automatisch mitgeprüft.
          </p>
        </div>
      )}

      {/* Playbook Liste */}
      <div className={styles.sectionHeader}>
        <Shield size={18} />
        <h3>Meine Playbooks</h3>
        <button className={styles.btnPrimary} onClick={() => { setView('builder'); setBuilderStep(1); }}>
          <Plus size={16} />
          Neues Playbook
        </button>
      </div>

      {playbooks.length === 0 ? (
        <div className={styles.emptyState}>
          <Shield size={48} />
          <h3>Noch keine Playbooks</h3>
          <p>Erstellen Sie Ihr erstes Playbook, um Verträge systematisch zu prüfen.</p>
          <button className={styles.btnPrimary} onClick={() => { setView('builder'); setBuilderStep(1); }}>
            <Sparkles size={16} />
            Erstes Playbook erstellen
          </button>
        </div>
      ) : (
        <div className={styles.playbookGrid}>
          {playbooks.map(pb => (
            <div
              key={pb._id}
              className={styles.playbookCard}
              onClick={() => navigate(`/playbook-review/${pb._id}`)}
            >
              <div className={styles.cardHeader}>
                <h4>{pb.name}</h4>
                {pb.isDefault && (
                  <span className={styles.badgeDefault}>
                    <Star size={12} /> Standard
                  </span>
                )}
              </div>
              <p className={styles.cardMeta}>
                {pb.contractType} &middot; {ROLE_LABELS[pb.role] || pb.role} &middot; {pb.rules.length} Regeln
              </p>
              {pb.description && <p className={styles.cardDesc}>{pb.description}</p>}
              <div className={styles.cardFooter}>
                <span>{pb.checksCount} Prüfungen</span>
                {pb.lastCheckAt && (
                  <span>Letzte: {new Date(pb.lastCheckAt).toLocaleDateString('de-DE')}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Letzte Prüfungen */}
      {recentChecks.length > 0 && (
        <>
          <div className={styles.sectionHeader} style={{ marginTop: '2rem' }}>
            <FileText size={18} />
            <h3>Letzte Prüfungen</h3>
          </div>
          <div className={styles.recentChecks}>
            {recentChecks.map(check => (
              <div
                key={check._id}
                className={styles.checkRow}
                onClick={async () => {
                  try {
                    const data = await playbookAPI.getCheck(check._id);
                    setCheckResult(data.check);
                    setView('check-result');
                  } catch {
                    toast.error('Prüfung konnte nicht geladen werden');
                  }
                }}
              >
                <span className={styles.checkName}>{fixEncoding(check.contractName)}</span>
                <span
                  className={styles.checkScore}
                  style={{ color: getScoreColor(check.summary.overallScore) }}
                >
                  {check.summary.overallScore}/100
                </span>
                <span className={styles.checkStats}>
                  <span className={styles.statPassed}>{check.summary.passed}</span>/
                  <span className={styles.statWarning}>{check.summary.warnings}</span>/
                  <span className={styles.statFailed}>{check.summary.failed}</span>
                </span>
                <span className={styles.checkDate}>
                  {new Date(check.checkedAt).toLocaleDateString('de-DE')}
                </span>
                <ChevronRight size={16} />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );

  // ============================================
  // RENDER: BUILDER (Wizard)
  // ============================================
  const renderBuilder = () => (
    <div className={styles.builder}>
      <button className={styles.backBtn} onClick={() => { setView('dashboard'); navigate('/playbook-review'); }}>
        <ArrowLeft size={16} /> Zurück
      </button>

      {/* Progress */}
      <div className={styles.wizardProgress}>
        {[1, 2, 3].map(step => (
          <div
            key={step}
            className={`${styles.wizardStep} ${builderStep >= step ? styles.wizardStepActive : ''}`}
          >
            <span className={styles.wizardStepNum}>{step}</span>
            <span className={styles.wizardStepLabel}>
              {step === 1 ? 'Typ & Rolle' : step === 2 ? 'KI-Generierung' : 'Regeln anpassen'}
            </span>
          </div>
        ))}
      </div>

      {/* Step 1: Typ & Rolle */}
      {builderStep === 1 && (
        <div className={styles.wizardContent}>
          <h3>Fuer welchen Vertragstyp soll das Playbook gelten?</h3>

          <label className={styles.fieldLabel}>Name des Playbooks</label>
          <input
            className={styles.input}
            placeholder="z.B. Lieferanten-Verträge prüfen"
            value={builderData.name}
            onChange={e => setBuilderData(d => ({ ...d, name: e.target.value }))}
          />

          <label className={styles.fieldLabel}>Vertragstyp</label>
          <select
            className={styles.select}
            value={builderData.contractType}
            onChange={e => setBuilderData(d => ({ ...d, contractType: e.target.value }))}
          >
            {CONTRACT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>

          <label className={styles.fieldLabel}>Ihre Rolle</label>
          <div className={styles.roleGrid}>
            {(['auftraggeber', 'auftragnehmer', 'neutral'] as const).map(role => (
              <button
                key={role}
                className={`${styles.roleCard} ${builderData.role === role ? styles.roleCardActive : ''}`}
                onClick={() => setBuilderData(d => ({ ...d, role }))}
              >
                <strong>{ROLE_LABELS[role]}</strong>
                <span>
                  {role === 'auftraggeber' ? 'Sie bestellen / kaufen ein'
                    : role === 'auftragnehmer' ? 'Sie liefern / erbringen die Leistung'
                    : 'Beide Seiten gleichwertig'}
                </span>
              </button>
            ))}
          </div>

          <label className={styles.fieldLabel}>Branche (optional)</label>
          <select
            className={styles.select}
            value={builderData.industry}
            onChange={e => setBuilderData(d => ({ ...d, industry: e.target.value }))}
          >
            {INDUSTRIES.map(i => <option key={i.value} value={i.value}>{i.label}</option>)}
          </select>

          <label className={styles.fieldLabel}>Beschreibung (optional)</label>
          <textarea
            className={styles.textarea}
            placeholder="Wofuer ist dieses Playbook gedacht?"
            value={builderData.description}
            onChange={e => setBuilderData(d => ({ ...d, description: e.target.value }))}
            rows={3}
          />

          <button
            className={styles.btnPrimary}
            onClick={() => setBuilderStep(2)}
            disabled={!builderData.name.trim()}
          >
            Weiter <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* Step 2: KI-Generierung */}
      {builderStep === 2 && (
        <div className={styles.wizardContent}>
          <h3>Wie möchten Sie die Regeln erstellen?</h3>

          {!showTemplates ? (
            <>
              <div className={styles.genOptionsGrid}>
                <button
                  className={styles.genOptionCard}
                  onClick={handleGenerateRules}
                  disabled={isGenerating || isExtracting}
                >
                  <Sparkles size={24} />
                  <strong>KI generiert Regeln</strong>
                  <span>Basierend auf Vertragstyp, Rolle und Branche</span>
                  {isGenerating && <Loader2 size={20} className={styles.spinner} />}
                </button>

                <button
                  className={styles.genOptionCard}
                  onClick={handleOpenExtractModal}
                  disabled={isGenerating || isExtracting}
                >
                  <FileText size={24} />
                  <strong>Aus Vertrag lernen</strong>
                  <span>Regeln aus einem Mustervertrag extrahieren</span>
                  {isExtracting && <Loader2 size={20} className={styles.spinner} />}
                </button>

                <button
                  className={styles.genOptionCard}
                  onClick={() => setShowTemplates(true)}
                  disabled={isGenerating || isExtracting}
                >
                  <BookOpen size={24} />
                  <strong>Aus Vorlage starten</strong>
                  <span>{playbookTemplates.length} fertige Regelsets für gängige Vertragstypen</span>
                </button>

                <button
                  className={styles.genOptionCard}
                  onClick={() => { setGeneratedRules([]); setBuilderStep(3); }}
                  disabled={isGenerating || isExtracting}
                >
                  <Edit3 size={24} />
                  <strong>Manuell erstellen</strong>
                  <span>Regeln selbst definieren</span>
                </button>
              </div>

              <button className={styles.backBtn} onClick={() => setBuilderStep(1)}>
                <ArrowLeft size={16} /> Zurück
              </button>
            </>
          ) : (
            <>
              <p className={styles.hint}>Wählen Sie eine Vorlage. Die Regeln können Sie danach anpassen.</p>
              <div className={styles.templateGrid}>
                {playbookTemplates.map(tpl => (
                  <div
                    key={tpl.id}
                    className={styles.templateCard}
                    onClick={() => {
                      setBuilderData(d => ({
                        ...d,
                        name: d.name || tpl.name,
                        contractType: tpl.contractType,
                        role: tpl.role,
                        industry: tpl.industry
                      }));
                      setGeneratedRules(tpl.rules.map(r => ({ ...r })));
                      setShowTemplates(false);
                      setBuilderStep(3);
                    }}
                  >
                    <strong>{tpl.name}</strong>
                    <p>{tpl.description}</p>
                    <div className={styles.templateMeta}>
                      <span>{tpl.rules.length} Regeln</span>
                      <span>{ROLE_LABELS[tpl.role]}</span>
                    </div>
                  </div>
                ))}
              </div>
              <button className={styles.backBtn} onClick={() => setShowTemplates(false)}>
                <ArrowLeft size={16} /> Zurück zur Auswahl
              </button>
            </>
          )}

          {/* Extract Modal */}
          {showExtractModal && (
            <div className={styles.modalOverlay} onClick={() => setShowExtractModal(false)}>
              <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <h3>Mustervertrag auswählen</h3>
                <p className={styles.hint} style={{ margin: '0 0 1rem 0' }}>
                  Wählen Sie einen bestehenden Vertrag aus. Die KI extrahiert daraus automatisch Regeln für Ihr Playbook.
                </p>
                <div className={styles.searchBox}>
                  <Search size={16} />
                  <input
                    placeholder="Vertrag suchen..."
                    value={contractSearch}
                    onChange={e => setContractSearch(e.target.value)}
                  />
                </div>
                <div className={styles.contractList}>
                  {isLoadingContracts ? (
                    <div className={styles.loading} style={{ minHeight: '120px' }}>
                      <Loader2 size={20} className={styles.spinner} />
                      <p>Verträge werden geladen...</p>
                    </div>
                  ) : (
                    <>
                      {contracts
                        .filter(c => !contractSearch || c.name?.toLowerCase().includes(contractSearch.toLowerCase()))
                        .map(c => (
                          <div
                            key={c._id}
                            className={`${styles.contractItem} ${selectedContractId === c._id ? styles.contractItemActive : ''} ${c.hasExtractedText === false ? styles.contractItemDisabled : ''}`}
                            onClick={() => c.hasExtractedText !== false && setSelectedContractId(c._id)}
                          >
                            <FileText size={16} />
                            <span>{fixEncoding(c.name) || 'Unbenannt'}</span>
                            {c.hasExtractedText === false && <span className={styles.noTextBadge}>Kein Text</span>}
                            {c.contractType && c.hasExtractedText !== false && <span className={styles.contractType}>{c.contractType}</span>}
                          </div>
                        ))}
                      {contracts.length === 0 && (
                        <p className={styles.emptyHint}>Keine Verträge gefunden. Laden Sie zuerst einen Vertrag hoch.</p>
                      )}
                    </>
                  )}
                </div>
                <div className={styles.modalActions}>
                  <button className={styles.btnOutline} onClick={() => setShowExtractModal(false)}>
                    Abbrechen
                  </button>
                  <button
                    className={styles.btnPrimary}
                    onClick={handleExtractFromContract}
                    disabled={!selectedContractId}
                  >
                    <Sparkles size={16} /> Regeln extrahieren
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 3: Regeln anpassen */}
      {builderStep === 3 && (
        <div className={styles.wizardContent}>
          <h3>Regeln prüfen & anpassen</h3>
          <p className={styles.hint}>
            {generatedRules.length} Regeln erstellt. Passen Sie Titel, Schwellenwerte und Prioritaeten an.
          </p>

          <div className={styles.rulesList}>
            {generatedRules.map((rule, index) => (
              <div key={index} className={styles.ruleCard}>
                <div className={styles.ruleHeader}>
                  <input
                    className={styles.ruleTitle}
                    value={rule.title}
                    onChange={e => handleUpdateRule(index, 'title', e.target.value)}
                  />
                  <button
                    className={styles.btnIcon}
                    onClick={() => handleRemoveRule(index)}
                    title="Regel entfernen"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <textarea
                  className={styles.ruleDesc}
                  value={rule.description}
                  onChange={e => handleUpdateRule(index, 'description', e.target.value)}
                  rows={2}
                />
                <div className={styles.ruleFooter}>
                  <select
                    value={rule.priority}
                    onChange={e => handleUpdateRule(index, 'priority', e.target.value)}
                    className={styles.selectSmall}
                  >
                    <option value="muss">Pflicht</option>
                    <option value="soll">Empfohlen</option>
                    <option value="kann">Optional</option>
                  </select>
                  <span className={styles.ruleCategory}>
                    {CATEGORY_LABELS[rule.category] || rule.category}
                  </span>
                  {rule.threshold && (
                    <span className={styles.ruleThreshold}>{rule.threshold}</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Neue Regel hinzufügen */}
          <button
            className={styles.btnOutline}
            onClick={() => setGeneratedRules(prev => [...prev, {
              title: '', description: '', category: 'sonstiges', priority: 'soll', threshold: ''
            }])}
          >
            <Plus size={16} /> Regel hinzufügen
          </button>

          <div className={styles.wizardActions}>
            <button className={styles.backBtn} onClick={() => setBuilderStep(2)}>
              <ArrowLeft size={16} /> Zurück
            </button>
            <button
              className={styles.btnPrimary}
              onClick={handleSavePlaybook}
              disabled={generatedRules.length === 0 || !builderData.name.trim()}
            >
              <Shield size={16} /> Playbook speichern
            </button>
          </div>
        </div>
      )}
    </div>
  );

  // ============================================
  // RENDER: DETAIL
  // ============================================
  const renderDetail = () => {
    if (!selectedPlaybook) return null;

    return (
      <div className={styles.detail}>
        <button className={styles.backBtn} onClick={() => { setView('dashboard'); navigate('/playbook-review'); }}>
          <ArrowLeft size={16} /> Alle Playbooks
        </button>

        <div className={styles.detailHeader}>
          <div>
            <h2>{selectedPlaybook.name}</h2>
            <p className={styles.detailMeta}>
              {selectedPlaybook.contractType} &middot; {ROLE_LABELS[selectedPlaybook.role] || selectedPlaybook.role}
              &middot; {selectedPlaybook.rules.length} Regeln
              {selectedPlaybook.isDefault && <span className={styles.badgeDefault}><Star size={12} /> Standard</span>}
            </p>
          </div>
          <div className={styles.detailActions}>
            <button className={styles.btnPrimary} onClick={handleOpenCheck} disabled={isChecking}>
              {isChecking ? <Loader2 size={16} className={styles.spinner} /> : <Play size={16} />}
              Vertrag prüfen
            </button>
            {!selectedPlaybook.isDefault && (
              <button className={styles.btnOutline} onClick={() => handleSetDefault(selectedPlaybook._id)}>
                <Star size={16} /> Als Standard
              </button>
            )}
            <button className={styles.btnDanger} onClick={() => handleDeletePlaybook(selectedPlaybook._id)}>
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        {/* Regeln */}
        <div className={styles.sectionHeader}>
          <BookOpen size={18} />
          <h3>Anforderungen ({selectedPlaybook.rules.length})</h3>
        </div>
        <div className={styles.rulesList}>
          {selectedPlaybook.rules.map((rule, index) => {
            const ruleId = rule._id || String(index);
            const isExpanded = expandedRuleId === ruleId;
            const currentData = isExpanded && editingRule ? editingRule : rule;

            return (
              <div key={ruleId} className={`${styles.ruleCard} ${isExpanded ? styles.ruleCardExpanded : ''}`}>
                {/* Klickbarer Header */}
                <div
                  className={styles.ruleHeader}
                  onClick={() => toggleRuleExpanded(ruleId)}
                  style={{ cursor: 'pointer' }}
                >
                  <span
                    className={styles.priorityBadge}
                    style={{ backgroundColor: PRIORITY_LABELS[rule.priority]?.color || '#6b7280' }}
                  >
                    {PRIORITY_LABELS[rule.priority]?.label || rule.priority}
                  </span>
                  <strong style={{ flex: 1 }}>{rule.title}</strong>
                  <ChevronRight size={16} className={isExpanded ? styles.chevronOpen : ''} />
                </div>

                {/* Zugeklappt: Beschreibung + Badges */}
                {!isExpanded && (
                  <>
                    <p className={styles.ruleDescText}>{rule.description}</p>
                    <div className={styles.ruleFooter}>
                      <span className={styles.ruleCategory}>
                        {CATEGORY_LABELS[rule.category] || rule.category}
                      </span>
                      {rule.threshold && <span className={styles.ruleThreshold}>{rule.threshold}</span>}
                      {rule.note && <span className={styles.ruleNoteIndicator} title={rule.note}>Notiz</span>}
                      {rule.standardText && <span className={styles.ruleStandardIndicator}>Standardtext</span>}
                    </div>
                  </>
                )}

                {/* Aufgeklappt: Editierbare Felder */}
                {isExpanded && editingRule && (
                  <div className={styles.ruleExpandedContent}>
                    <label className={styles.fieldLabel}>Titel</label>
                    <input
                      className={styles.input}
                      value={currentData.title}
                      onChange={e => handleRuleFieldChange('title', e.target.value)}
                      maxLength={200}
                    />

                    <label className={styles.fieldLabel}>Beschreibung</label>
                    <textarea
                      className={styles.textarea}
                      value={currentData.description}
                      onChange={e => handleRuleFieldChange('description', e.target.value)}
                      rows={3}
                      maxLength={1000}
                    />

                    <div className={styles.ruleEditRow}>
                      <div>
                        <label className={styles.fieldLabel}>Priorität</label>
                        <select
                          className={styles.selectSmall}
                          value={currentData.priority}
                          onChange={e => handleRuleFieldChange('priority', e.target.value)}
                        >
                          <option value="muss">Pflicht</option>
                          <option value="soll">Empfohlen</option>
                          <option value="kann">Optional</option>
                        </select>
                      </div>
                      <div>
                        <label className={styles.fieldLabel}>Kategorie</label>
                        <select
                          className={styles.selectSmall}
                          value={currentData.category}
                          onChange={e => handleRuleFieldChange('category', e.target.value)}
                        >
                          {Object.entries(CATEGORY_LABELS).map(([val, label]) => (
                            <option key={val} value={val}>{label}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <label className={styles.fieldLabel}>Schwellenwert</label>
                    <input
                      className={styles.input}
                      value={currentData.threshold}
                      onChange={e => handleRuleFieldChange('threshold', e.target.value)}
                      placeholder="z.B. max. 30 Tage, nicht über 5%"
                      maxLength={200}
                    />

                    <hr className={styles.ruleDivider} />

                    <label className={styles.fieldLabel}>
                      Notiz <span className={styles.fieldLabelOptional}>(optional)</span>
                    </label>
                    <textarea
                      className={styles.textarea}
                      value={currentData.note || ''}
                      onChange={e => handleRuleFieldChange('note', e.target.value)}
                      placeholder="Warum ist diese Regel wichtig? z.B. Hatten 2024 Probleme mit 90-Tage-Zahlungsfristen"
                      rows={2}
                      maxLength={500}
                    />
                    <span className={styles.charCount}>{(currentData.note || '').length}/500</span>

                    <label className={styles.fieldLabel}>
                      Standardtext <span className={styles.fieldLabelOptional}>(optional)</span>
                    </label>
                    <p className={styles.fieldHint}>
                      Ihre ideale Vertragsklausel. Wird bei der Prüfung direkt mit dem Vertrag verglichen.
                    </p>
                    <textarea
                      className={`${styles.textarea} ${styles.standardTextArea}`}
                      value={currentData.standardText || ''}
                      onChange={e => handleRuleFieldChange('standardText', e.target.value)}
                      placeholder='z.B. "Die Zahlungsfrist beträgt 14 Tage nach Rechnungseingang. Bei Zahlungsverzug werden Verzugszinsen in Höhe von 5 Prozentpunkten über dem Basiszinssatz erhoben."'
                      rows={4}
                      maxLength={2000}
                    />
                    <span className={styles.charCount}>{(currentData.standardText || '').length}/2000</span>

                    <div className={styles.ruleEditActions}>
                      {selectedPlaybook.rules.length > 1 && (
                        <button
                          className={styles.btnDanger}
                          onClick={() => handleDeleteRule(ruleId)}
                          style={{ marginRight: 'auto' }}
                        >
                          <Trash2 size={14} /> Entfernen
                        </button>
                      )}
                      <button
                        className={styles.btnOutline}
                        onClick={() => { setExpandedRuleId(null); setEditingRule(null); setIsRuleDirty(false); }}
                      >
                        Abbrechen
                      </button>
                      <button
                        className={styles.btnPrimary}
                        onClick={handleSaveRule}
                        disabled={!isRuleDirty || isSavingRule}
                      >
                        {isSavingRule ? <Loader2 size={14} className={styles.spinner} /> : <CheckCircle2 size={14} />}
                        Speichern
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Check-Historie */}
        <div className={styles.sectionHeader} style={{ marginTop: '2rem' }}>
          <FileText size={18} />
          <h3>Prüfungshistorie</h3>
        </div>
        {playbookChecks.length > 0 ? (
            <div className={styles.recentChecks}>
              {playbookChecks.map(check => (
                <div
                  key={check._id}
                  className={styles.checkRow}
                  onClick={async () => {
                  try {
                    const data = await playbookAPI.getCheck(check._id);
                    setCheckResult(data.check);
                    setView('check-result');
                  } catch {
                    toast.error('Prüfung konnte nicht geladen werden');
                  }
                }}
                >
                  <span className={styles.checkName}>{fixEncoding(check.contractName)}</span>
                  <span
                    className={styles.checkScore}
                    style={{ color: getScoreColor(check.summary.overallScore) }}
                  >
                    {check.summary.overallScore}/100
                  </span>
                  <span className={styles.checkDate}>
                    {new Date(check.checkedAt).toLocaleDateString('de-DE')}
                  </span>
                  <ChevronRight size={16} />
                </div>
              ))}
            </div>
        ) : (
          <p className={styles.emptyHint}>Noch keine Prüfungen durchgeführt. Klicken Sie oben auf "Vertrag prüfen".</p>
        )}

        {/* Check Modal */}
        {showCheckModal && (
          <div className={styles.modalOverlay} onClick={() => setShowCheckModal(false)}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
              <h3>Vertrag zur Prüfung auswählen</h3>
              <div className={styles.searchBox}>
                <Search size={16} />
                <input
                  placeholder="Vertrag suchen..."
                  value={contractSearch}
                  onChange={e => setContractSearch(e.target.value)}
                />
              </div>
              <div className={styles.contractList}>
                {isLoadingContracts ? (
                  <div className={styles.loading} style={{ minHeight: '120px' }}>
                    <Loader2 size={20} className={styles.spinner} />
                    <p>Verträge werden geladen...</p>
                  </div>
                ) : (
                  <>
                    {contracts
                      .filter(c => !contractSearch || c.name?.toLowerCase().includes(contractSearch.toLowerCase()))
                      .map(c => (
                        <div
                          key={c._id}
                          className={`${styles.contractItem} ${selectedContractId === c._id ? styles.contractItemActive : ''} ${c.hasExtractedText === false ? styles.contractItemDisabled : ''}`}
                          onClick={() => c.hasExtractedText !== false && setSelectedContractId(c._id)}
                        >
                          <FileText size={16} />
                          <span>{fixEncoding(c.name) || 'Unbenannt'}</span>
                          {c.hasExtractedText === false && <span className={styles.noTextBadge}>Kein Text</span>}
                          {c.contractType && c.hasExtractedText !== false && <span className={styles.contractType}>{c.contractType}</span>}
                        </div>
                      ))}
                    {contracts.length === 0 && (
                      <p className={styles.emptyHint}>Keine Verträge gefunden. Laden Sie zuerst einen Vertrag hoch.</p>
                    )}
                  </>
                )}
              </div>
              <div className={styles.modalActions}>
                <button className={styles.btnOutline} onClick={() => setShowCheckModal(false)}>
                  Abbrechen
                </button>
                <button
                  className={styles.btnPrimary}
                  onClick={handleRunCheck}
                  disabled={!selectedContractId}
                >
                  <Play size={16} /> Prüfung starten
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ============================================
  // RENDER: CHECK RESULT
  // ============================================
  const renderCheckResult = () => {
    if (!checkResult) return null;

    const summary = checkResult.summary || { passed: 0, warnings: 0, failed: 0, notFound: 0, totalRules: 0, overallScore: 0, overallRisk: 'low', recommendation: '' };
    const results = checkResult.results || [];
    const playbookName = typeof checkResult.playbookId === 'object'
      ? checkResult.playbookId.name
      : selectedPlaybook?.name || 'Playbook';

    return (
      <div className={styles.checkResultPage}>
        <button className={styles.backBtn} onClick={() => {
          setView(selectedPlaybook ? 'detail' : 'dashboard');
          setCheckResult(null);
        }}>
          <ArrowLeft size={16} /> Zurück
        </button>

        {/* Summary Header */}
        <div className={styles.resultSummary}>
          <div className={styles.scoreCircle} style={{ borderColor: getScoreColor(summary.overallScore) }}>
            <span className={styles.scoreValue} style={{ color: getScoreColor(summary.overallScore) }}>
              {summary.overallScore}
            </span>
            <span className={styles.scoreLabel}>von 100</span>
          </div>
          <div className={styles.summaryInfo}>
            <h2>Prüfung: {fixEncoding(checkResult.contractName)}</h2>
            <p>Playbook: {playbookName} &middot; {new Date(checkResult.checkedAt).toLocaleDateString('de-DE')}</p>
            <div className={styles.summaryStats}>
              <span className={styles.statPassed}><CheckCircle2 size={14} /> {summary.passed} Erfüllt</span>
              <span className={styles.statWarning}><AlertTriangle size={14} /> {summary.warnings} Warnung</span>
              <span className={styles.statFailed}><XCircle size={14} /> {summary.failed} Nicht erfüllt</span>
              <span className={styles.statNotFound}><HelpCircle size={14} /> {summary.notFound} Nicht gefunden</span>
            </div>
          </div>
        </div>

        {/* Empfehlung */}
        {summary.recommendation && (
          <div className={`${styles.recommendation} ${styles[`risk${summary.overallRisk.charAt(0).toUpperCase() + summary.overallRisk.slice(1)}`]}`}>
            <strong>Empfehlung:</strong> {summary.recommendation}
          </div>
        )}

        {/* Action Buttons */}
        <div className={styles.resultActions}>
          <button className={styles.btnPrimary} onClick={handleExportPdf} disabled={isExportingPdf}>
            {isExportingPdf ? <Loader2 size={14} className={styles.spinner} /> : <FileText size={14} />}
            Als PDF exportieren
          </button>
          {(summary.failed > 0 || summary.warnings > 0) && (
            <button className={styles.btnOutline} onClick={handleGenerateLetter} disabled={isGeneratingLetter}>
              {isGeneratingLetter ? <Loader2 size={14} className={styles.spinner} /> : <Edit3 size={14} />}
              Nachverhandlung vorbereiten
            </button>
          )}
        </div>

        {/* Verhandlungsbrief Modal */}
        {showLetterModal && (
          <div className={styles.modalOverlay} onClick={() => setShowLetterModal(false)}>
            <div className={`${styles.modal} ${styles.letterModal}`} onClick={e => e.stopPropagation()}>
              <h3>Verhandlungsbrief</h3>
              {isGeneratingLetter ? (
                <div className={styles.loading} style={{ minHeight: '200px' }}>
                  <Loader2 size={24} className={styles.spinner} />
                  <p>Brief wird generiert...</p>
                </div>
              ) : (
                <>
                  <div className={styles.letterPreview}>
                    {negotiationLetter.split('\n').map((line, i) => (
                      <p key={i}>{line || '\u00A0'}</p>
                    ))}
                  </div>
                  <div className={styles.modalActions}>
                    <button className={styles.btnOutline} onClick={() => { copyToClipboard(negotiationLetter); }}>
                      <Copy size={14} /> Brief kopieren
                    </button>
                    <button className={styles.btnPrimary} onClick={handleDownloadLetterPdf}>
                      <FileText size={14} /> Als PDF herunterladen
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Einzelergebnisse */}
        <div className={styles.resultsList}>
          {results.map((result, index) => (
            <div
              key={result._id || index}
              className={`${styles.resultCard} ${styles[`result${result.status.charAt(0).toUpperCase() + result.status.slice(1)}`]}`}
            >
              <div
                className={styles.resultHeader}
                onClick={() => toggleResultExpanded(result._id || String(index))}
              >
                <StatusIcon status={result.status} />
                <div className={styles.resultTitle}>
                  <div>
                    <strong>{result.ruleTitle}</strong>
                    {result.isGlobalRule && <span className={styles.globalTag}>Global</span>}
                    {getRuleNote(result.ruleId) && (
                      <span className={styles.resultNoteHint}>{getRuleNote(result.ruleId)}</span>
                    )}
                  </div>
                </div>
                <span
                  className={styles.priorityBadge}
                  style={{ backgroundColor: PRIORITY_LABELS[result.rulePriority]?.color || '#6b7280' }}
                >
                  {PRIORITY_LABELS[result.rulePriority]?.label || result.rulePriority}
                </span>
                <ChevronRight
                  size={16}
                  className={expandedResults.has(result._id || String(index)) ? styles.chevronOpen : ''}
                />
              </div>

              {expandedResults.has(result._id || String(index)) && (
                <div className={styles.resultColumns}>
                  {/* LINKS: Ihre Anforderung */}
                  <div className={styles.resultLeft}>
                    <h4 className={styles.columnLabel}>Ihre Anforderung</h4>
                    <div className={styles.detailBlock}>
                      <label>Regel:</label>
                      <p>{result.ruleTitle}</p>
                    </div>
                    {getRuleStandardText(result.ruleId) && (
                      <div className={`${styles.detailBlock} ${styles.standardBlock}`}>
                        <label>Ihr Standard:</label>
                        <p>{getRuleStandardText(result.ruleId)}</p>
                        <button
                          className={styles.copyBtn}
                          onClick={() => copyToClipboard(getRuleStandardText(result.ruleId))}
                        >
                          <Copy size={14} /> Kopieren
                        </button>
                      </div>
                    )}
                    {result.riskExplanation && (
                      <div className={styles.detailBlock}>
                        <label>Risiko:</label>
                        <p>{result.riskExplanation}</p>
                      </div>
                    )}
                  </div>

                  {/* RECHTS: Im Vertrag */}
                  <div className={styles.resultRight}>
                    <h4 className={styles.columnLabel}>Im Vertrag</h4>
                    {result.finding ? (
                      <div className={styles.detailBlock}>
                        <label>Gefunden:</label>
                        <p>{result.finding}</p>
                        {result.clauseReference && (
                          <span className={styles.clauseRef}>{result.clauseReference}</span>
                        )}
                      </div>
                    ) : (
                      <div className={styles.detailBlock}>
                        <p className={styles.notFoundHint}>Keine entsprechende Klausel im Vertrag gefunden.</p>
                      </div>
                    )}
                    {result.deviation && (
                      <div className={styles.detailBlock}>
                        <label>Abweichung:</label>
                        <p>{result.deviation}</p>
                      </div>
                    )}
                    {result.alternativeText && (
                      <div className={styles.detailBlock + ' ' + styles.alternativeBlock}>
                        <label>Empfohlene Formulierung:</label>
                        <p>{result.alternativeText}</p>
                        <button
                          className={styles.copyBtn}
                          onClick={() => copyToClipboard(result.alternativeText)}
                        >
                          <Copy size={14} /> Kopieren
                        </button>
                      </div>
                    )}
                    {result.negotiationTip && (
                      <div className={styles.detailBlock}>
                        <label>Verhandlungstipp:</label>
                        <p>{result.negotiationTip}</p>
                      </div>
                    )}

                    {/* PDF-Vorschau + Vertrag öffnen */}
                    {contractPdfUrl && (
                      <div className={styles.pdfActions}>
                        <button
                          className={styles.pdfToggleBtn}
                          onClick={() => setShowPdfPreview(
                            showPdfPreview === (result._id || String(index)) ? null : (result._id || String(index))
                          )}
                        >
                          <FileText size={14} />
                          {showPdfPreview === (result._id || String(index)) ? 'Vorschau schließen' : 'PDF-Vorschau'}
                        </button>
                        <a
                          href={contractPdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.pdfOpenBtn}
                        >
                          <ChevronRight size={14} /> Vertrag öffnen
                        </a>
                      </div>
                    )}
                    {showPdfPreview === (result._id || String(index)) && contractPdfUrl && (
                      <div className={styles.pdfPreview}>
                        <iframe
                          src={contractPdfUrl}
                          title="Vertrag PDF"
                          className={styles.pdfFrame}
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ============================================
  // RENDER: LOADING
  // ============================================
  if (isLoading && view !== 'builder') {
    return (
      <div className={styles.container}>
        <Helmet><title>Playbook Review | Contract AI</title></Helmet>
        <div className={styles.loading}>
          <Loader2 size={32} className={styles.spinner} />
          <p>Lade Playbooks...</p>
        </div>
      </div>
    );
  }

  if (isChecking) {
    return (
      <div className={styles.container}>
        <Helmet><title>Prüfung läuft... | Contract AI</title></Helmet>
        <div className={styles.loading}>
          <Loader2 size={32} className={styles.spinner} />
          <p>Vertrag wird geprüft... Dies kann bis zu 30 Sekunden dauern.</p>
        </div>
      </div>
    );
  }

  // ============================================
  // MAIN RENDER
  // ============================================
  return (
    <div className={styles.container}>
      <Helmet>
        <title>Playbook Review | Contract AI</title>
      </Helmet>

      <div className={styles.header}>
        <div className={styles.headerTitle}>
          <Shield size={24} />
          <h1>Playbook Review</h1>
        </div>
        <p className={styles.headerSubtitle}>
          Definieren Sie Ihre Vertrags-Standards und prüfen Sie neue Verträge automatisch dagegen.
        </p>
      </div>

      <WelcomePopup
        featureId="playbook-review"
        icon={<Shield size={32} />}
        title="Willkommen beim Playbook Review"
        description="Definieren Sie Ihre Vertrags-Standards als Playbook und prüfen Sie eingehende Verträge automatisch dagegen. Die KI zeigt Ihnen sofort, was passt, was fehlt und was nachverhandelt werden muss."
        tip="Tipp: Starten Sie mit 'Neues Playbook' und wählen Sie eine fertige Vorlage — in 30 Sekunden ist Ihr erstes Playbook einsatzbereit."
      />

      <div className={styles.content}>
        {view === 'dashboard' && renderDashboard()}
        {view === 'builder' && renderBuilder()}
        {view === 'detail' && renderDetail()}
        {view === 'check-result' && renderCheckResult()}
      </div>
    </div>
  );
};

export default PlaybookReview;
