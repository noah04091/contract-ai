// frontend/src/components/CampaignsTab.tsx
// Admin-Tab für Email-Campaigns (Phase 2B)

import { useState, useEffect, useMemo } from 'react';
import {
  Mail,
  Plus,
  RefreshCw,
  X,
  Send,
  Users,
  Eye,
  AlertCircle,
  CheckCircle,
  Clock,
  Ban,
  ChevronRight,
  ChevronLeft,
  Zap,
  Copy
} from 'lucide-react';
import styles from './AdminDashboard.module.css';
import { fixUtf8Display } from '../utils/textUtils';

const API_URL = import.meta.env.VITE_API_URL || 'https://api.contract-ai.de';

// ============================================================================
// Types
// ============================================================================

interface Campaign {
  _id: string;
  name: string;
  subject: string;
  preheader: string | null;
  title: string;
  body: string;
  ctaText: string | null;
  ctaUrl: string | null;
  segmentFilter: SegmentFilter;
  recipientCount: number;
  status: 'draft' | 'queued' | 'sending' | 'completed' | 'cancelled' | 'failed';
  scheduledFor: string | null;
  trackOpens?: boolean;
  trackClicks?: boolean;
  createdBy: string | null;
  createdByEmail: string | null;
  createdAt: string;
  queuedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  stats: {
    total: number;
    sent: number;
    failed: number;
    skipped: number;
    pending?: number;
    opens?: number;
    uniqueOpens?: number;
    clicks?: number;
    uniqueClicks?: number;
  };
  topClicks?: Array<{ url: string; clicks: number; uniqueClickers: number }>;
}

interface SegmentFilter {
  userIds?: string[];
  emails?: string[];
  plan?: string | string[];
  subscriptionActive?: boolean;
  minAnalysisCount?: number;
  createdAfter?: string;
  createdBefore?: string;
}

interface PreviewResult {
  total: number;
  eligible: number;
  excludedByHealth: number;
  excludedByUnsubscribe: number;
  overLimit: boolean;
  maxAllowed: number;
  sample: Array<{ _id: string; email: string; subscriptionPlan: string | null }>;
}

interface CampaignForm {
  name: string;
  subject: string;
  preheader: string;
  title: string;
  body: string;
  ctaText: string;
  ctaUrl: string;
  trackOpens: boolean;
  trackClicks: boolean;
  filter: {
    usePlan: boolean;
    plan: string;
    subscriptionActive: boolean;
    useMinAnalyses: boolean;
    minAnalysisCount: number;
    useDateRange: boolean;
    createdAfter: string;
    createdBefore: string;
    useEmails: boolean;
    selectedEmails: string[];
  };
}

interface UserSearchResult {
  _id: string;
  email: string;
  subscriptionPlan: string | null;
  verified: boolean;
  emailOptOut: boolean;
}

const MAX_SELECTED_EMAILS = 100;

// ============================================================================
// Helpers
// ============================================================================

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('token');
  return token
    ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' };
}

function errMsg(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === 'string') return e;
  return 'Unbekannter Fehler';
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${d.toLocaleDateString('de-DE')} ${d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}`;
}

function statusBadge(campaign: Pick<Campaign, 'status' | 'scheduledFor'>) {
  // Wenn queued + scheduledFor in der Zukunft → "Geplant" statt "Eingereiht"
  const isScheduled =
    campaign.status === 'queued' &&
    campaign.scheduledFor &&
    new Date(campaign.scheduledFor).getTime() > Date.now();

  const map: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    draft: { label: 'Entwurf', color: '#64748b', icon: <Clock size={12} /> },
    queued: { label: 'Eingereiht', color: '#3b82f6', icon: <Clock size={12} /> },
    scheduled: { label: 'Geplant', color: '#8b5cf6', icon: <Clock size={12} /> },
    sending: { label: 'Wird gesendet', color: '#f59e0b', icon: <Send size={12} /> },
    completed: { label: 'Abgeschlossen', color: '#10b981', icon: <CheckCircle size={12} /> },
    cancelled: { label: 'Abgebrochen', color: '#6b7280', icon: <Ban size={12} /> },
    failed: { label: 'Fehler', color: '#ef4444', icon: <AlertCircle size={12} /> }
  };
  const key = isScheduled ? 'scheduled' : campaign.status;
  const s = map[key] || map.draft;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.25rem',
        padding: '0.2rem 0.6rem',
        borderRadius: '10px',
        background: s.color + '20',
        color: s.color,
        fontSize: '0.7rem',
        fontWeight: 600
      }}
    >
      {s.icon} {s.label}
    </span>
  );
}

function buildSegmentFilter(form: CampaignForm['filter']): SegmentFilter {
  const filter: SegmentFilter = {};

  if (form.useEmails && form.selectedEmails.length > 0) {
    filter.emails = form.selectedEmails.slice(0, MAX_SELECTED_EMAILS);
    return filter; // Email-Auswahl überschreibt alles
  }

  if (form.usePlan && form.plan !== 'all') filter.plan = form.plan;
  if (form.subscriptionActive) filter.subscriptionActive = true;
  if (form.useMinAnalyses && form.minAnalysisCount > 0) filter.minAnalysisCount = form.minAnalysisCount;
  if (form.useDateRange) {
    if (form.createdAfter) filter.createdAfter = form.createdAfter;
    if (form.createdBefore) filter.createdBefore = form.createdBefore;
  }
  return filter;
}

function defaultForm(): CampaignForm {
  return {
    name: '',
    subject: '',
    preheader: '',
    title: '',
    body: '',
    ctaText: '',
    ctaUrl: '',
    trackOpens: true,
    trackClicks: true,
    filter: {
      usePlan: false,
      plan: 'all',
      subscriptionActive: false,
      useMinAnalyses: false,
      minAnalysisCount: 1,
      useDateRange: false,
      createdAfter: '',
      createdBefore: '',
      useEmails: false,
      selectedEmails: []
    }
  };
}

// ============================================================================
// EmailPicker: Search + Select mit Chips
// ============================================================================

function EmailPicker({
  value,
  onChange,
  disabled
}: {
  value: string[];
  onChange: (emails: string[]) => void;
  disabled?: boolean;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `${API_URL}/api/admin/users/search?q=${encodeURIComponent(query.trim())}&limit=20`,
          { headers: authHeaders() }
        );
        const data = await res.json();
        if (res.ok && data.success) {
          setResults(data.users || []);
        } else {
          setError(data.message || 'Suche fehlgeschlagen');
        }
      } catch (err) {
        setError(errMsg(err));
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  function addEmail(email: string) {
    if (value.includes(email)) return;
    if (value.length >= MAX_SELECTED_EMAILS) {
      setError(`Max ${MAX_SELECTED_EMAILS} Empfänger erreicht`);
      return;
    }
    onChange([...value, email]);
    setQuery('');
    setResults([]);
    setShowDropdown(false);
  }

  function removeEmail(email: string) {
    onChange(value.filter((e) => e !== email));
  }

  return (
    <div style={{ marginTop: '0.5rem' }}>
      {/* Chips */}
      {value.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginBottom: '0.5rem' }}>
          {value.map((email) => (
            <span
              key={email}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem',
                padding: '0.25rem 0.5rem',
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: '4px',
                fontSize: '0.75rem',
                color: '#1d4ed8',
                maxWidth: '100%'
              }}
            >
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {email}
              </span>
              {!disabled && (
                <button
                  onClick={() => removeEmail(email)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                    display: 'flex',
                    alignItems: 'center',
                    color: '#1d4ed8'
                  }}
                  title="Entfernen"
                >
                  <X size={12} />
                </button>
              )}
            </span>
          ))}
        </div>
      )}

      {/* Search input */}
      <div style={{ position: 'relative' }}>
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowDropdown(true);
          }}
          onFocus={() => setShowDropdown(true)}
          onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
          disabled={disabled || value.length >= MAX_SELECTED_EMAILS}
          placeholder={
            value.length >= MAX_SELECTED_EMAILS
              ? `Max ${MAX_SELECTED_EMAILS} erreicht`
              : 'Email suchen (min. 2 Zeichen)...'
          }
          style={{
            width: '100%',
            padding: '0.5rem 0.75rem',
            borderRadius: '4px',
            border: '1px solid #cbd5e1',
            fontSize: '0.875rem'
          }}
        />

        {showDropdown && (results.length > 0 || loading || query.length >= 2) && (
          <div
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              marginTop: '2px',
              background: '#fff',
              border: '1px solid #cbd5e1',
              borderRadius: '4px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              maxHeight: '240px',
              overflow: 'auto',
              zIndex: 10
            }}
          >
            {loading && (
              <div style={{ padding: '0.5rem 0.75rem', color: '#64748b', fontSize: '0.75rem' }}>
                Suche...
              </div>
            )}
            {!loading && results.length === 0 && query.length >= 2 && (
              <div style={{ padding: '0.5rem 0.75rem', color: '#94a3b8', fontSize: '0.75rem' }}>
                Keine Treffer
              </div>
            )}
            {results.map((u) => {
              const already = value.includes(u.email);
              return (
                <button
                  key={u._id}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => addEmail(u.email)}
                  disabled={already}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '0.5rem 0.75rem',
                    background: already ? '#f1f5f9' : '#fff',
                    border: 'none',
                    borderBottom: '1px solid #f1f5f9',
                    cursor: already ? 'default' : 'pointer',
                    fontSize: '0.8125rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '0.5rem',
                    opacity: already ? 0.6 : 1
                  }}
                  onMouseEnter={(e) => {
                    if (!already) (e.currentTarget as HTMLButtonElement).style.background = '#f8fafc';
                  }}
                  onMouseLeave={(e) => {
                    if (!already) (e.currentTarget as HTMLButtonElement).style.background = '#fff';
                  }}
                >
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                    {u.email}
                  </span>
                  <span style={{ fontSize: '0.65rem', color: '#64748b', display: 'flex', gap: '0.25rem' }}>
                    {u.subscriptionPlan && (
                      <span style={{ padding: '0.1rem 0.4rem', background: '#f1f5f9', borderRadius: '3px' }}>
                        {u.subscriptionPlan}
                      </span>
                    )}
                    {!u.verified && (
                      <span style={{ padding: '0.1rem 0.4rem', background: '#fef3c7', color: '#92400e', borderRadius: '3px' }}>
                        unbest.
                      </span>
                    )}
                    {u.emailOptOut && (
                      <span style={{ padding: '0.1rem 0.4rem', background: '#fef2f2', color: '#991b1b', borderRadius: '3px' }}>
                        opt-out
                      </span>
                    )}
                    {already && <CheckCircle size={12} style={{ color: '#16a34a' }} />}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {error && (
        <div style={{ marginTop: '0.25rem', fontSize: '0.75rem', color: '#dc2626' }}>{error}</div>
      )}

      <div style={{ marginTop: '0.25rem', fontSize: '0.7rem', color: '#64748b' }}>
        {value.length}/{MAX_SELECTED_EMAILS} ausgewählt
      </div>
    </div>
  );
}

// ============================================================================
// Live Email Preview Component
// ============================================================================

function EmailPreview({ form }: { form: CampaignForm }) {
  const isRawHtml = form.body.trim().toLowerCase().startsWith('<!doctype') ||
                    form.body.trim().toLowerCase().startsWith('<html');

  // Raw-HTML-Mode: zeige in iframe (eigenes Design, kein Template-Wrapper)
  if (isRawHtml) {
    return (
      <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
        <div style={{ padding: '0.5rem 1rem', background: '#f0fdf4', borderBottom: '1px solid #bbf7d0', fontSize: '0.7rem', color: '#16a34a', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <CheckCircle size={12} /> Eigenes HTML erkannt — wird ohne Template-Wrapper gesendet
        </div>
        <iframe
          srcDoc={form.body}
          title="Email-Preview"
          style={{ width: '100%', height: '600px', border: 'none' }}
          sandbox=""
        />
      </div>
    );
  }

  return (
    <div
      style={{
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        background: '#ffffff',
        fontSize: '0.875rem',
        overflow: 'hidden'
      }}
    >
      {/* Betreff-Zeile (Postfach-Simulation) */}
      <div style={{ padding: '0.5rem 1rem', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: '0.75rem', color: '#64748b' }}>
        Betreff: <strong style={{ color: '#1e293b' }}>{form.subject || '(leer)'}</strong>
        {form.preheader && (
          <span style={{ marginLeft: '0.75rem', color: '#94a3b8', fontStyle: 'italic' }}>
            – {form.preheader}
          </span>
        )}
      </div>

      {/* Email-Body Preview (matched neues generateCampaignTemplate Design) */}
      <div style={{ padding: '2rem 1.5rem 1rem', textAlign: 'center' }}>
        {/* Logo */}
        <img
          src="https://www.contract-ai.de/logo.png"
          alt="Contract AI"
          style={{ height: '24px', marginBottom: '1rem' }}
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />

        {/* Titel */}
        <h2 style={{ margin: '0 0 0.5rem', color: '#0f172a', fontSize: '1.2rem', fontWeight: 700, lineHeight: 1.35 }}>
          {form.title || '(Titel)'}
        </h2>

        {/* Blauer Akzent-Strich */}
        <div style={{ width: '48px', height: '3px', background: '#3b82f6', borderRadius: '2px', margin: '0.75rem auto 1.25rem' }} />
      </div>

      {/* Content */}
      <div style={{ padding: '0 1.5rem 1.5rem', textAlign: 'left' }}>
        <div
          style={{ color: '#334155', lineHeight: 1.7, fontSize: '0.875rem' }}
          dangerouslySetInnerHTML={{ __html: form.body || '<p style="color:#94a3b8">(Body-Inhalt hier eingeben)</p>' }}
        />

        {/* CTA Button */}
        {form.ctaText && form.ctaUrl && (
          <div style={{ marginTop: '1.25rem', textAlign: 'center' }}>
            <span
              style={{
                display: 'inline-block',
                background: '#3b82f6',
                color: '#fff',
                padding: '0.7rem 1.5rem',
                borderRadius: '25px',
                fontWeight: 600,
                fontSize: '0.85rem'
              }}
            >
              {form.ctaText}
            </span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div
        style={{
          padding: '0.75rem 1.5rem',
          borderTop: '1px solid #e2e8f0',
          fontSize: '0.65rem',
          color: '#94a3b8',
          textAlign: 'center',
          lineHeight: 1.5
        }}
      >
        &copy; {new Date().getFullYear()} Contract AI &middot; Website &middot; Datenschutz &middot; Abmelden
      </div>
    </div>
  );
}

// ============================================================================
// Composer Modal — 4-Step Wizard
// ============================================================================

function ComposerModal({
  open,
  onClose,
  onCreated,
  prefill
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  prefill?: Campaign | null;
}) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [form, setForm] = useState<CampaignForm>(defaultForm);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [testStatus, setTestStatus] = useState<string | null>(null);
  const [testLoading, setTestLoading] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sendMode, setSendMode] = useState<'now' | 'scheduled'>('now');
  const [scheduledAt, setScheduledAt] = useState('');

  useEffect(() => {
    if (!open) {
      // Reset on close
      setTimeout(() => {
        setStep(1);
        setForm(defaultForm());
        setPreview(null);
        setTestEmail('');
        setTestStatus(null);
        setConfirmText('');
        setError(null);
        setSendMode('now');
        setScheduledAt('');
      }, 300);
    } else if (prefill) {
      // Vorbefüllung durch Duplicate — Emails werden BEWUSST NICHT kopiert (Sicherheit)
      const f = defaultForm();
      f.name = prefill.name ? `Kopie von ${fixUtf8Display(prefill.name)}` : '';
      f.subject = fixUtf8Display(prefill.subject || '');
      f.preheader = fixUtf8Display(prefill.preheader || '');
      f.title = fixUtf8Display(prefill.title || '');
      f.body = fixUtf8Display(prefill.body || '');
      f.ctaText = fixUtf8Display(prefill.ctaText || '');
      f.ctaUrl = prefill.ctaUrl || '';

      const sf = prefill.segmentFilter || {};
      // Segment-Filter uebernehmen — aber NICHT userIds/emails (sicherer Re-Start)
      if (sf.plan && sf.plan !== 'all') {
        f.filter.usePlan = true;
        f.filter.plan = typeof sf.plan === 'string' ? sf.plan : 'all';
      }
      if (sf.subscriptionActive) f.filter.subscriptionActive = true;
      if (sf.minAnalysisCount) {
        f.filter.useMinAnalyses = true;
        f.filter.minAnalysisCount = sf.minAnalysisCount;
      }
      if (sf.createdAfter || sf.createdBefore) {
        f.filter.useDateRange = true;
        f.filter.createdAfter = sf.createdAfter || '';
        f.filter.createdBefore = sf.createdBefore || '';
      }
      setForm(f);
    }
  }, [open, prefill]);

  const segmentFilter = useMemo(() => buildSegmentFilter(form.filter), [form.filter]);

  async function fetchPreview() {
    setPreviewLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/admin/campaigns/preview`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ segmentFilter })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Preview-Fehler');
      setPreview(data);
    } catch (err) {
      setError(errMsg(err) || 'Preview-Fehler');
    } finally {
      setPreviewLoading(false);
    }
  }

  async function sendTest() {
    if (!testEmail) return;
    setTestLoading(true);
    setTestStatus(null);
    try {
      const res = await fetch(`${API_URL}/api/admin/campaigns/test`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          testEmail,
          campaign: {
            subject: form.subject,
            preheader: form.preheader || null,
            title: form.title,
            body: form.body,
            ctaText: form.ctaText || null,
            ctaUrl: form.ctaUrl || null
          }
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Test-Send fehlgeschlagen');
      setTestStatus(`Test-Mail an ${testEmail} gesendet`);
    } catch (err) {
      setTestStatus('Fehler: ' + (errMsg(err) || 'Unbekannt'));
    } finally {
      setTestLoading(false);
    }
  }

  async function submitCampaign() {
    if (confirmText !== 'SENDEN') {
      setError('Bitte "SENDEN" exakt tippen zur Bestätigung');
      return;
    }
    // Validate scheduled time
    let scheduledForIso: string | null = null;
    if (sendMode === 'scheduled') {
      if (!scheduledAt) {
        setError('Bitte Zeitpunkt für geplanten Versand wählen');
        return;
      }
      const scheduledDate = new Date(scheduledAt);
      if (isNaN(scheduledDate.getTime())) {
        setError('Ungültiger Zeitpunkt');
        return;
      }
      if (scheduledDate.getTime() <= Date.now()) {
        setError('Geplanter Zeitpunkt muss in der Zukunft liegen');
        return;
      }
      scheduledForIso = scheduledDate.toISOString();
    }
    setSubmitLoading(true);
    setError(null);
    try {
      // 1. Create
      const createRes = await fetch(`${API_URL}/api/admin/campaigns`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          name: form.name || form.subject,
          subject: form.subject,
          preheader: form.preheader || null,
          title: form.title,
          body: form.body,
          ctaText: form.ctaText || null,
          ctaUrl: form.ctaUrl || null,
          trackOpens: form.trackOpens,
          trackClicks: form.trackClicks,
          segmentFilter
        })
      });
      const createData = await createRes.json();
      if (!createRes.ok || !createData.success) {
        throw new Error(createData.message || 'Campaign-Erstellung fehlgeschlagen');
      }
      const campaignId = createData.campaignId;

      // 2. Queue (mit oder ohne scheduledFor)
      const queueRes = await fetch(`${API_URL}/api/admin/campaigns/${campaignId}/queue`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(scheduledForIso ? { scheduledFor: scheduledForIso } : {})
      });
      const queueData = await queueRes.json();
      if (!queueRes.ok || !queueData.success) {
        throw new Error(queueData.message || 'Campaign konnte nicht eingereiht werden');
      }

      onCreated();
      onClose();
    } catch (err) {
      setError(errMsg(err) || 'Fehler');
    } finally {
      setSubmitLoading(false);
    }
  }

  if (!open) return null;

  const canProceedStep1 = !!preview && preview.eligible > 0 && !preview.overLimit;
  const canProceedStep2 = !!form.subject && !!form.title && !!form.body;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.6)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem'
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '1000px',
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: '0 20px 60px rgba(0,0,0,0.2)'
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            position: 'sticky',
            top: 0,
            background: '#fff',
            zIndex: 1
          }}
        >
          <h2 style={{ margin: 0, fontSize: '1.125rem' }}>
            Neue Kampagne · Schritt {step} von 4
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '0.25rem',
              borderRadius: '6px'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Step indicator */}
        <div style={{ display: 'flex', gap: '0.25rem', padding: '0.75rem 1.5rem', background: '#f8fafc' }}>
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              style={{
                flex: 1,
                height: '4px',
                borderRadius: '2px',
                background: step >= (s as 1 | 2 | 3 | 4) ? '#3b82f6' : '#e2e8f0',
                transition: 'background 0.2s'
              }}
            />
          ))}
        </div>

        {/* Content */}
        <div style={{ padding: '1.5rem' }}>
          {error && (
            <div
              style={{
                marginBottom: '1rem',
                padding: '0.75rem 1rem',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '6px',
                color: '#dc2626',
                fontSize: '0.875rem'
              }}
            >
              {error}
            </div>
          )}

          {step === 1 && (
            <Step1Recipients
              form={form}
              setForm={setForm}
              preview={preview}
              previewLoading={previewLoading}
              onFetchPreview={fetchPreview}
            />
          )}

          {step === 2 && <Step2Content form={form} setForm={setForm} />}

          {step === 3 && (
            <Step3Test
              form={form}
              testEmail={testEmail}
              setTestEmail={setTestEmail}
              onSendTest={sendTest}
              testLoading={testLoading}
              testStatus={testStatus}
            />
          )}

          {step === 4 && preview && (
            <Step4Confirm
              form={form}
              preview={preview}
              confirmText={confirmText}
              setConfirmText={setConfirmText}
              onSubmit={submitCampaign}
              submitLoading={submitLoading}
              sendMode={sendMode}
              setSendMode={setSendMode}
              scheduledAt={scheduledAt}
              setScheduledAt={setScheduledAt}
            />
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '1rem 1.5rem',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            position: 'sticky',
            bottom: 0,
            background: '#fff'
          }}
        >
          <button
            onClick={() => setStep((s) => (s > 1 ? ((s - 1) as 1 | 2 | 3 | 4) : s))}
            disabled={step === 1}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              background: '#fff',
              cursor: step === 1 ? 'not-allowed' : 'pointer',
              opacity: step === 1 ? 0.5 : 1,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem'
            }}
          >
            <ChevronLeft size={16} /> Zurück
          </button>
          {step < 4 ? (
            <button
              onClick={() => {
                if (step === 1 && !canProceedStep1) return;
                if (step === 2 && !canProceedStep2) return;
                setStep((s) => ((s + 1) as 1 | 2 | 3 | 4));
              }}
              disabled={(step === 1 && !canProceedStep1) || (step === 2 && !canProceedStep2)}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                border: 'none',
                background: '#3b82f6',
                color: '#fff',
                cursor: 'pointer',
                opacity: (step === 1 && !canProceedStep1) || (step === 2 && !canProceedStep2) ? 0.5 : 1,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem'
              }}
            >
              Weiter <ChevronRight size={16} />
            </button>
          ) : (
            <span style={{ fontSize: '0.875rem', color: '#64748b' }}>
              Nutze "Senden"-Button oben, um Kampagne zu starten
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// Step 1: Recipients
function Step1Recipients({
  form,
  setForm,
  preview,
  previewLoading,
  onFetchPreview
}: {
  form: CampaignForm;
  setForm: (f: CampaignForm) => void;
  preview: PreviewResult | null;
  previewLoading: boolean;
  onFetchPreview: () => void;
}) {
  return (
    <div>
      <h3 style={{ marginTop: 0 }}>Empfänger wählen</h3>
      <p style={{ fontSize: '0.875rem', color: '#64748b' }}>
        Es werden <strong>automatisch</strong> nur User erreicht die: verifiziert sind · Marketing nicht abbestellt · keine inaktive/quarantine Email.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
        {/* Individuelle Email-Auswahl */}
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
          <input
            type="checkbox"
            checked={form.filter.useEmails}
            onChange={(e) => setForm({ ...form, filter: { ...form.filter, useEmails: e.target.checked } })}
            style={{ marginTop: '0.25rem' }}
          />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>
              Bestimmte User per Email auswählen (überschreibt andere Filter)
            </div>
            <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.15rem' }}>
              Max. {MAX_SELECTED_EMAILS} Empfänger · Suche nach Email-Teil, klicke zum Hinzufügen
            </div>
            {form.filter.useEmails && (
              <EmailPicker
                value={form.filter.selectedEmails}
                onChange={(emails) => setForm({ ...form, filter: { ...form.filter, selectedEmails: emails } })}
              />
            )}
          </div>
        </label>

        {/* Plan */}
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '6px', opacity: form.filter.useEmails ? 0.5 : 1 }}>
          <input
            type="checkbox"
            disabled={form.filter.useEmails}
            checked={form.filter.usePlan}
            onChange={(e) => setForm({ ...form, filter: { ...form.filter, usePlan: e.target.checked } })}
          />
          <span style={{ fontSize: '0.875rem', flex: 1 }}>Nach Plan filtern:</span>
          <select
            disabled={!form.filter.usePlan || form.filter.useEmails}
            value={form.filter.plan}
            onChange={(e) => setForm({ ...form, filter: { ...form.filter, plan: e.target.value } })}
            style={{ padding: '0.25rem 0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
          >
            <option value="all">Alle Pläne</option>
            <option value="free">Free</option>
            <option value="business">Business</option>
            <option value="enterprise">Enterprise</option>
          </select>
        </label>

        {/* Active */}
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '6px', opacity: form.filter.useEmails ? 0.5 : 1 }}>
          <input
            type="checkbox"
            disabled={form.filter.useEmails}
            checked={form.filter.subscriptionActive}
            onChange={(e) => setForm({ ...form, filter: { ...form.filter, subscriptionActive: e.target.checked } })}
          />
          <span style={{ fontSize: '0.875rem' }}>Nur aktive Abonnenten</span>
        </label>

        {/* Analyses */}
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '6px', opacity: form.filter.useEmails ? 0.5 : 1 }}>
          <input
            type="checkbox"
            disabled={form.filter.useEmails}
            checked={form.filter.useMinAnalyses}
            onChange={(e) => setForm({ ...form, filter: { ...form.filter, useMinAnalyses: e.target.checked } })}
          />
          <span style={{ fontSize: '0.875rem', flex: 1 }}>Mindestens</span>
          <input
            type="number"
            disabled={!form.filter.useMinAnalyses || form.filter.useEmails}
            min={1}
            value={form.filter.minAnalysisCount}
            onChange={(e) => setForm({ ...form, filter: { ...form.filter, minAnalysisCount: Math.max(1, parseInt(e.target.value) || 1) } })}
            style={{ width: '70px', padding: '0.25rem 0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
          />
          <span style={{ fontSize: '0.875rem' }}>Analysen</span>
        </label>

        {/* Date range */}
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '6px', opacity: form.filter.useEmails ? 0.5 : 1 }}>
          <input
            type="checkbox"
            disabled={form.filter.useEmails}
            checked={form.filter.useDateRange}
            onChange={(e) => setForm({ ...form, filter: { ...form.filter, useDateRange: e.target.checked } })}
            style={{ marginTop: '0.25rem' }}
          />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>Registriert zwischen</div>
            {form.filter.useDateRange && (
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                <input
                  type="date"
                  value={form.filter.createdAfter}
                  onChange={(e) => setForm({ ...form, filter: { ...form.filter, createdAfter: e.target.value } })}
                  style={{ padding: '0.25rem 0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                />
                <span style={{ alignSelf: 'center' }}>—</span>
                <input
                  type="date"
                  value={form.filter.createdBefore}
                  onChange={(e) => setForm({ ...form, filter: { ...form.filter, createdBefore: e.target.value } })}
                  style={{ padding: '0.25rem 0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                />
              </div>
            )}
          </div>
        </label>

        {/* Preview Button */}
        <button
          onClick={onFetchPreview}
          disabled={previewLoading}
          style={{
            padding: '0.75rem',
            borderRadius: '6px',
            border: '1px solid #3b82f6',
            background: '#eff6ff',
            color: '#1d4ed8',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            fontWeight: 600
          }}
        >
          {previewLoading ? <RefreshCw size={16} className="spin" /> : <Eye size={16} />}
          Empfänger zählen
        </button>

        {/* Preview result */}
        {preview && (
          <div
            style={{
              padding: '1rem',
              borderRadius: '6px',
              background: preview.overLimit ? '#fef2f2' : '#f0fdf4',
              border: `1px solid ${preview.overLimit ? '#fecaca' : '#bbf7d0'}`
            }}
          >
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: preview.overLimit ? '#dc2626' : '#16a34a' }}>
              {preview.eligible.toLocaleString('de-DE')} Empfänger
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
              {preview.total} Treffer · {preview.excludedByHealth} wegen Email-Health · {preview.excludedByUnsubscribe} Abbestellungen
            </div>
            {preview.overLimit && (
              <div style={{ fontSize: '0.875rem', color: '#dc2626', marginTop: '0.5rem' }}>
                ⚠️ Über Limit ({preview.maxAllowed}). Filter enger fassen.
              </div>
            )}
            {preview.sample.length > 0 && (
              <details style={{ marginTop: '0.75rem', fontSize: '0.75rem' }}>
                <summary style={{ cursor: 'pointer', color: '#64748b' }}>Sample anzeigen</summary>
                <ul style={{ margin: '0.5rem 0 0 0', paddingLeft: '1.25rem' }}>
                  {preview.sample.map((u) => (
                    <li key={u._id} style={{ color: '#475569' }}>
                      {u.email} ({u.subscriptionPlan || '—'})
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Step 2: Content
function Step2Content({ form, setForm }: { form: CampaignForm; setForm: (f: CampaignForm) => void }) {
  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.5rem 0.75rem',
    borderRadius: '6px',
    border: '1px solid #cbd5e1',
    fontSize: '0.875rem',
    marginTop: '0.25rem'
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
      <div>
        <h3 style={{ marginTop: 0 }}>Inhalt</h3>

        <label style={{ fontSize: '0.875rem', fontWeight: 600 }}>
          Kampagnen-Name (intern, optional)
          <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="z.B. Launch-Newsletter" style={inputStyle} />
        </label>

        <label style={{ fontSize: '0.875rem', fontWeight: 600, display: 'block', marginTop: '0.75rem' }}>
          Betreff *
          <input type="text" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} maxLength={200} required style={inputStyle} />
        </label>

        <label style={{ fontSize: '0.875rem', fontWeight: 600, display: 'block', marginTop: '0.75rem' }}>
          Preheader (Vorschau-Text im Postfach, optional)
          <input type="text" value={form.preheader} onChange={(e) => setForm({ ...form, preheader: e.target.value })} maxLength={200} style={inputStyle} />
        </label>

        <label style={{ fontSize: '0.875rem', fontWeight: 600, display: 'block', marginTop: '0.75rem' }}>
          Titel (H1 in der Mail) *
          <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} maxLength={200} required style={inputStyle} />
        </label>

        <label style={{ fontSize: '0.875rem', fontWeight: 600, display: 'block', marginTop: '0.75rem' }}>
          Body (HTML erlaubt) *
          <textarea
            value={form.body}
            onChange={(e) => setForm({ ...form, body: e.target.value })}
            rows={10}
            required
            style={{ ...inputStyle, fontFamily: 'monospace', fontSize: '0.8rem' }}
          />
        </label>
        <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.25rem' }}>
          Tipp: {'<p>'}, {'<strong>'}, {'<ul><li>'}, {'<a href=...>'} funktionieren.
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.75rem' }}>
          <label style={{ fontSize: '0.875rem', fontWeight: 600 }}>
            CTA-Button Text
            <input type="text" value={form.ctaText} onChange={(e) => setForm({ ...form, ctaText: e.target.value })} placeholder="z.B. Jetzt ansehen" style={inputStyle} />
          </label>
          <label style={{ fontSize: '0.875rem', fontWeight: 600 }}>
            CTA-Button URL
            <input type="url" value={form.ctaUrl} onChange={(e) => setForm({ ...form, ctaUrl: e.target.value })} placeholder="https://..." style={inputStyle} />
          </label>
        </div>

        {/* Tracking-Optionen */}
        <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.5rem', color: '#334155' }}>
            📊 Tracking
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={form.trackOpens}
              onChange={(e) => setForm({ ...form, trackOpens: e.target.checked })}
            />
            Öffnungen tracken (1x1-Pixel — Apple/Gmail-Proxies verfälschen die Zahl)
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', cursor: 'pointer', marginTop: '0.25rem' }}>
            <input
              type="checkbox"
              checked={form.trackClicks}
              onChange={(e) => setForm({ ...form, trackClicks: e.target.checked })}
            />
            Klicks tracken (Links werden über Redirect umgeleitet — ab Commit 3D aktiv)
          </label>
          <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.5rem' }}>
            Tracking ist durch Marketing-Consent + Datenschutzerklärung + Unsubscribe-Link abgedeckt.
          </div>
        </div>
      </div>

      <div>
        <h3 style={{ marginTop: 0 }}>Live-Vorschau</h3>
        <EmailPreview form={form} />
      </div>
    </div>
  );
}

// Step 3: Test
function Step3Test({
  form,
  testEmail,
  setTestEmail,
  onSendTest,
  testLoading,
  testStatus
}: {
  form: CampaignForm;
  testEmail: string;
  setTestEmail: (v: string) => void;
  onSendTest: () => void;
  testLoading: boolean;
  testStatus: string | null;
}) {
  return (
    <div>
      <h3 style={{ marginTop: 0 }}>Test-Mail senden</h3>
      <p style={{ fontSize: '0.875rem', color: '#64748b' }}>
        Bevor du an echte Empfänger sendest — teste die Mail an dir selbst. Betreff bekommt "[TEST]" Prefix.
      </p>
      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
        <input
          type="email"
          value={testEmail}
          onChange={(e) => setTestEmail(e.target.value)}
          placeholder="test@example.com"
          style={{ flex: 1, padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
        />
        <button
          onClick={onSendTest}
          disabled={testLoading || !testEmail || !form.subject || !form.title || !form.body}
          style={{
            padding: '0.5rem 1rem',
            borderRadius: '6px',
            border: 'none',
            background: '#3b82f6',
            color: '#fff',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            opacity: testLoading || !testEmail || !form.subject || !form.title || !form.body ? 0.5 : 1
          }}
        >
          {testLoading ? <RefreshCw size={16} /> : <Send size={16} />}
          Test senden
        </button>
      </div>
      {testStatus && (
        <div
          style={{
            marginTop: '1rem',
            padding: '0.75rem',
            borderRadius: '6px',
            background: testStatus.startsWith('Fehler') ? '#fef2f2' : '#f0fdf4',
            color: testStatus.startsWith('Fehler') ? '#dc2626' : '#16a34a',
            fontSize: '0.875rem'
          }}
        >
          {testStatus}
        </div>
      )}
    </div>
  );
}

// Step 4: Confirm
function Step4Confirm({
  form,
  preview,
  confirmText,
  setConfirmText,
  onSubmit,
  submitLoading,
  sendMode,
  setSendMode,
  scheduledAt,
  setScheduledAt
}: {
  form: CampaignForm;
  preview: PreviewResult;
  confirmText: string;
  setConfirmText: (v: string) => void;
  onSubmit: () => void;
  submitLoading: boolean;
  sendMode: 'now' | 'scheduled';
  setSendMode: (m: 'now' | 'scheduled') => void;
  scheduledAt: string;
  setScheduledAt: (v: string) => void;
}) {
  // Datetime-local min: 5 Minuten in der Zukunft, max: 1 Jahr
  const minDateTime = new Date(Date.now() + 5 * 60 * 1000).toISOString().slice(0, 16);
  const maxDateTime = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16);

  return (
    <div>
      <h3 style={{ marginTop: 0 }}>Bestätigen & Senden</h3>

      <div
        style={{
          padding: '1.25rem',
          background: '#fef3c7',
          border: '1px solid #fde68a',
          borderRadius: '8px',
          marginBottom: '1.5rem'
        }}
      >
        <div style={{ fontSize: '1rem', fontWeight: 600, color: '#92400e', marginBottom: '0.5rem' }}>
          ⚠️ Du wirst an <strong>{preview.eligible.toLocaleString('de-DE')} Empfänger</strong> senden
        </div>
        <div style={{ fontSize: '0.875rem', color: '#78350f' }}>
          Betreff: <strong>{form.subject}</strong>
        </div>
        <div style={{ fontSize: '0.75rem', color: '#78350f', marginTop: '0.5rem' }}>
          Bei ~10 Mails/Min dauert der Versand ca. <strong>{Math.ceil(preview.eligible / 10)} Minuten</strong>.
        </div>
      </div>

      {/* Zeitpunkt-Wahl */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>Versand-Zeitpunkt</div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <label
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              border: `2px solid ${sendMode === 'now' ? '#3b82f6' : '#cbd5e1'}`,
              background: sendMode === 'now' ? '#eff6ff' : '#fff',
              cursor: 'pointer',
              fontSize: '0.875rem'
            }}
          >
            <input
              type="radio"
              name="sendMode"
              checked={sendMode === 'now'}
              onChange={() => setSendMode('now')}
            />
            Jetzt senden
          </label>
          <label
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              border: `2px solid ${sendMode === 'scheduled' ? '#8b5cf6' : '#cbd5e1'}`,
              background: sendMode === 'scheduled' ? '#f5f3ff' : '#fff',
              cursor: 'pointer',
              fontSize: '0.875rem'
            }}
          >
            <input
              type="radio"
              name="sendMode"
              checked={sendMode === 'scheduled'}
              onChange={() => setSendMode('scheduled')}
            />
            Später senden
          </label>
        </div>
        {sendMode === 'scheduled' && (
          <div style={{ marginTop: '0.75rem' }}>
            <label style={{ fontSize: '0.8125rem', color: '#475569', display: 'block', marginBottom: '0.25rem' }}>
              Zeitpunkt (frühestens in 5 Min, max. 1 Jahr voraus):
            </label>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              min={minDateTime}
              max={maxDateTime}
              style={{
                padding: '0.5rem 0.75rem',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '0.875rem'
              }}
            />
            {scheduledAt && (
              <div style={{ marginTop: '0.25rem', fontSize: '0.75rem', color: '#64748b' }}>
                Geplant für: <strong>{new Date(scheduledAt).toLocaleString('de-DE')}</strong>
              </div>
            )}
          </div>
        )}
      </div>

      <p style={{ fontSize: '0.875rem', color: '#475569' }}>
        Zur Bestätigung tippe <code style={{ background: '#f1f5f9', padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: 600 }}>SENDEN</code>:
      </p>
      <input
        type="text"
        value={confirmText}
        onChange={(e) => setConfirmText(e.target.value)}
        placeholder="SENDEN"
        style={{
          width: '200px',
          padding: '0.5rem 0.75rem',
          borderRadius: '6px',
          border: '2px solid ' + (confirmText === 'SENDEN' ? '#16a34a' : '#cbd5e1'),
          fontSize: '0.875rem',
          fontWeight: 600,
          textTransform: 'uppercase'
        }}
      />

      <div style={{ marginTop: '1.5rem' }}>
        <button
          onClick={onSubmit}
          disabled={submitLoading || confirmText !== 'SENDEN'}
          style={{
            padding: '0.75rem 1.5rem',
            borderRadius: '6px',
            border: 'none',
            background: confirmText === 'SENDEN' ? (sendMode === 'scheduled' ? '#8b5cf6' : '#dc2626') : '#cbd5e1',
            color: '#fff',
            cursor: confirmText === 'SENDEN' && !submitLoading ? 'pointer' : 'not-allowed',
            fontWeight: 700,
            fontSize: '1rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          {submitLoading ? <RefreshCw size={18} /> : <Zap size={18} />}
          {sendMode === 'scheduled' ? 'Kampagne planen' : 'Kampagne jetzt starten'}
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// Main Tab Component
// ============================================================================

export default function CampaignsTab() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [detailsId, setDetailsId] = useState<string | null>(null);
  const [detailsData, setDetailsData] = useState<Campaign | null>(null);
  const [duplicateSource, setDuplicateSource] = useState<Campaign | null>(null);

  function openNewCampaign() {
    setDuplicateSource(null);
    setModalOpen(true);
  }

  function openDuplicate(campaign: Campaign) {
    setDuplicateSource(campaign);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setDuplicateSource(null);
  }

  async function fetchCampaigns() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/admin/campaigns?limit=100`, {
        headers: authHeaders()
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Laden fehlgeschlagen');
      setCampaigns(data.campaigns || []);
    } catch (err) {
      setError(errMsg(err) || 'Fehler beim Laden');
    } finally {
      setLoading(false);
    }
  }

  async function fetchDetails(id: string) {
    setDetailsId(id);
    setDetailsData(null);
    try {
      const res = await fetch(`${API_URL}/api/admin/campaigns/${id}`, {
        headers: authHeaders()
      });
      const data = await res.json();
      if (res.ok && data.success) setDetailsData(data.campaign);
    } catch {
      /* ignore */
    }
  }

  async function cancelCampaign(id: string) {
    if (!window.confirm('Kampagne wirklich abbrechen? Alle noch nicht gesendeten Mails werden gestoppt.')) return;
    try {
      const res = await fetch(`${API_URL}/api/admin/campaigns/${id}/cancel`, {
        method: 'POST',
        headers: authHeaders()
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Cancel fehlgeschlagen');
      fetchCampaigns();
      if (detailsId === id) fetchDetails(id);
    } catch (err) {
      alert('Fehler: ' + (errMsg(err) || 'Unbekannt'));
    }
  }

  useEffect(() => {
    fetchCampaigns();
    // Auto-refresh alle 30s wenn aktive Campaigns
  }, []);

  const hasActive = useMemo(
    () => campaigns.some((c) => c.status === 'queued' || c.status === 'sending'),
    [campaigns]
  );

  useEffect(() => {
    if (!hasActive) return;
    const timer = setInterval(() => {
      fetchCampaigns();
      if (detailsId) fetchDetails(detailsId);
    }, 15000);
    return () => clearInterval(timer);
  }, [hasActive, detailsId]);

  return (
    <div className={styles.activityTab}>
      <div className={styles.tableCard}>
        <div className={styles.tabHeader} style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
          <h3 style={{ margin: 0 }}>Kampagnen</h3>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              className={styles.exportButton}
              onClick={fetchCampaigns}
              disabled={loading}
              title="Aktualisieren"
            >
              <RefreshCw size={16} />
              Aktualisieren
            </button>
            <button
              onClick={openNewCampaign}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                border: 'none',
                background: '#3b82f6',
                color: '#fff',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontWeight: 600,
                whiteSpace: 'nowrap'
              }}
            >
              <Plus size={16} />
              Neue Kampagne
            </button>
          </div>
        </div>

        {error && (
          <div style={{ padding: '1rem', color: '#dc2626', background: '#fef2f2' }}>
            {error}
          </div>
        )}

        <div className={styles.tableContainer}>
          {loading && campaigns.length === 0 ? (
            <div className={styles.emptyState}>
              <RefreshCw size={48} />
              <p>Lade Kampagnen...</p>
            </div>
          ) : campaigns.length === 0 ? (
            <div className={styles.emptyState}>
              <Mail size={48} />
              <p>Noch keine Kampagnen</p>
              <span>Erstelle deine erste Kampagne über den Button oben</span>
            </div>
          ) : (
            <table className={styles.userTable}>
              <thead>
                <tr>
                  <th>Erstellt</th>
                  <th>Name / Betreff</th>
                  <th>Empfänger</th>
                  <th>Status</th>
                  <th>Fortschritt</th>
                  <th>Aktion</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c) => (
                  <tr key={c._id}>
                    <td style={{ fontSize: '0.75rem' }}>{formatDate(c.createdAt)}</td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{c.name || c.subject}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{c.subject}</div>
                    </td>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Users size={14} /> {c.recipientCount}
                      </span>
                    </td>
                    <td>
                      {statusBadge(c)}
                      {c.status === 'queued' && c.scheduledFor && new Date(c.scheduledFor).getTime() > Date.now() && (
                        <div style={{ fontSize: '0.7rem', color: '#8b5cf6', marginTop: '2px' }}>
                          → {formatDate(c.scheduledFor)}
                        </div>
                      )}
                    </td>
                    <td style={{ fontSize: '0.75rem' }}>
                      {c.stats ? (
                        <>
                          ✓ {c.stats.sent}
                          {c.stats.failed > 0 && <span style={{ color: '#dc2626' }}> · ✗ {c.stats.failed}</span>}
                        </>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                        <button
                          onClick={() => fetchDetails(c._id)}
                          style={{
                            padding: '0.25rem 0.5rem',
                            borderRadius: '4px',
                            border: '1px solid #cbd5e1',
                            background: '#fff',
                            cursor: 'pointer',
                            fontSize: '0.75rem'
                          }}
                        >
                          Details
                        </button>
                        <button
                          onClick={() => openDuplicate(c)}
                          title="Kampagne als Vorlage verwenden"
                          style={{
                            padding: '0.25rem 0.5rem',
                            borderRadius: '4px',
                            border: '1px solid #bfdbfe',
                            background: '#eff6ff',
                            color: '#1d4ed8',
                            cursor: 'pointer',
                            fontSize: '0.75rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.2rem'
                          }}
                        >
                          <Copy size={12} />
                          Duplizieren
                        </button>
                        {(c.status === 'draft' || c.status === 'queued' || c.status === 'sending') && (
                          <button
                            onClick={() => cancelCampaign(c._id)}
                            style={{
                              padding: '0.25rem 0.5rem',
                              borderRadius: '4px',
                              border: '1px solid #fecaca',
                              background: '#fef2f2',
                              color: '#dc2626',
                              cursor: 'pointer',
                              fontSize: '0.75rem'
                            }}
                          >
                            Abbrechen
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <ComposerModal
        open={modalOpen}
        onClose={closeModal}
        onCreated={fetchCampaigns}
        prefill={duplicateSource}
      />

      {/* Details Overlay */}
      {detailsId && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            zIndex: 9998,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem'
          }}
          onClick={() => setDetailsId(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#fff',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '600px',
              padding: '1.5rem',
              maxHeight: '80vh',
              overflow: 'auto'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ margin: 0 }}>Campaign-Details</h2>
              <button onClick={() => setDetailsId(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            {detailsData ? (
              <div style={{ fontSize: '0.875rem' }}>
                <p><strong>Name:</strong> {detailsData.name}</p>
                <p><strong>Betreff:</strong> {detailsData.subject}</p>
                <p><strong>Status:</strong> {statusBadge(detailsData)}</p>
                {detailsData.scheduledFor && (
                  <p><strong>Geplant für:</strong> {formatDate(detailsData.scheduledFor)}</p>
                )}
                <p><strong>Empfänger:</strong> {detailsData.recipientCount}</p>
                <p><strong>Erstellt:</strong> {formatDate(detailsData.createdAt)}</p>
                {detailsData.queuedAt && <p><strong>Eingereiht:</strong> {formatDate(detailsData.queuedAt)}</p>}
                {detailsData.startedAt && <p><strong>Gestartet:</strong> {formatDate(detailsData.startedAt)}</p>}
                {detailsData.completedAt && <p><strong>Abgeschlossen:</strong> {formatDate(detailsData.completedAt)}</p>}
                {detailsData.cancelledAt && <p><strong>Abgebrochen:</strong> {formatDate(detailsData.cancelledAt)}</p>}
                {detailsData.stats && (
                  <div style={{ marginTop: '1rem', padding: '1rem', background: '#f8fafc', borderRadius: '6px' }}>
                    <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Versand</div>
                    <div>Empfänger gesamt: {detailsData.stats.total}</div>
                    {(detailsData.stats.skipped ?? 0) > 0 && (
                      <div style={{ color: '#f59e0b' }}>
                        Übersprungen: {detailsData.stats.skipped} (abbestellt/inaktiv)
                      </div>
                    )}
                    <div>Berechtigt: {detailsData.stats.eligible ?? (detailsData.stats.total - (detailsData.stats.skipped ?? 0))}</div>
                    <div style={{ color: '#16a34a' }}>Gesendet: {detailsData.stats.sent}</div>
                    {(detailsData.stats.failed ?? 0) > 0 && (
                      <div style={{ color: '#dc2626' }}>Fehler: {detailsData.stats.failed}</div>
                    )}
                    {(detailsData.stats.pending ?? 0) > 0 && <div>Ausstehend: {detailsData.stats.pending}</div>}

                    {detailsData.trackOpens !== false && (detailsData.stats.sent > 0) && (
                      <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #e2e8f0' }}>
                        <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>📊 Öffnungen</div>
                        <div>
                          Unique: <strong>{detailsData.stats.uniqueOpens ?? 0}</strong> von {detailsData.stats.sent}
                          {detailsData.stats.sent > 0 && (
                            <span style={{ color: '#3b82f6', marginLeft: '0.5rem' }}>
                              ({Math.round(((detailsData.stats.uniqueOpens ?? 0) / detailsData.stats.sent) * 100)}%)
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.8125rem', color: '#64748b' }}>
                          Gesamt-Öffnungen: {detailsData.stats.opens ?? 0}
                        </div>
                      </div>
                    )}

                    {detailsData.trackClicks !== false && (detailsData.stats.clicks ?? 0) > 0 && (
                      <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #e2e8f0' }}>
                        <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>🔗 Klicks</div>
                        <div>Unique-Klicker: <strong>{detailsData.stats.uniqueClicks ?? 0}</strong></div>
                        <div style={{ fontSize: '0.8125rem', color: '#64748b', marginBottom: '0.5rem' }}>
                          Gesamt-Klicks: {detailsData.stats.clicks ?? 0}
                        </div>
                        {detailsData.topClicks && detailsData.topClicks.length > 0 && (
                          <div style={{ marginTop: '0.5rem' }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
                              Top-Links:
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                              {detailsData.topClicks.map((tc, idx) => (
                                <div key={idx} style={{ fontSize: '0.7rem', display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}>
                                  <span
                                    style={{
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap',
                                      maxWidth: '300px',
                                      color: '#475569'
                                    }}
                                    title={tc.url}
                                  >
                                    {tc.url}
                                  </span>
                                  <span style={{ color: '#3b82f6', fontWeight: 600, whiteSpace: 'nowrap' }}>
                                    {tc.clicks}× ({tc.uniqueClickers} unique)
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <p>Lädt...</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
