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
  Zap
} from 'lucide-react';
import styles from './AdminDashboard.module.css';

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
  };
}

interface SegmentFilter {
  userIds?: string[];
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
  filter: {
    usePlan: boolean;
    plan: string;
    subscriptionActive: boolean;
    useMinAnalyses: boolean;
    minAnalysisCount: number;
    useDateRange: boolean;
    createdAfter: string;
    createdBefore: string;
    useUserIds: boolean;
    userIdsText: string;
  };
}

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

function statusBadge(status: Campaign['status']) {
  const map: Record<Campaign['status'], { label: string; color: string; icon: React.ReactNode }> = {
    draft: { label: 'Entwurf', color: '#64748b', icon: <Clock size={12} /> },
    queued: { label: 'Eingereiht', color: '#3b82f6', icon: <Clock size={12} /> },
    sending: { label: 'Wird gesendet', color: '#f59e0b', icon: <Send size={12} /> },
    completed: { label: 'Abgeschlossen', color: '#10b981', icon: <CheckCircle size={12} /> },
    cancelled: { label: 'Abgebrochen', color: '#6b7280', icon: <Ban size={12} /> },
    failed: { label: 'Fehler', color: '#ef4444', icon: <AlertCircle size={12} /> }
  };
  const s = map[status] || map.draft;
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

  if (form.useUserIds && form.userIdsText.trim()) {
    filter.userIds = form.userIdsText
      .split(/[\s,\n]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    return filter; // userIds überschreibt alles
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
    filter: {
      usePlan: false,
      plan: 'all',
      subscriptionActive: false,
      useMinAnalyses: false,
      minAnalysisCount: 1,
      useDateRange: false,
      createdAfter: '',
      createdBefore: '',
      useUserIds: false,
      userIdsText: ''
    }
  };
}

// ============================================================================
// Live Email Preview Component
// ============================================================================

function EmailPreview({ form }: { form: CampaignForm }) {
  return (
    <div
      style={{
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        background: '#f8fafc',
        padding: '1rem',
        fontSize: '0.875rem'
      }}
    >
      <div style={{ color: '#64748b', marginBottom: '0.5rem', fontSize: '0.75rem' }}>
        Betreff: <strong style={{ color: '#1e293b' }}>{form.subject || '(leer)'}</strong>
      </div>
      {form.preheader && (
        <div style={{ color: '#94a3b8', fontStyle: 'italic', marginBottom: '1rem', fontSize: '0.75rem' }}>
          {form.preheader}
        </div>
      )}
      <div
        style={{
          background: '#fff',
          border: '1px solid #cbd5e1',
          borderRadius: '6px',
          padding: '1.5rem',
          maxWidth: '600px'
        }}
      >
        <div style={{ borderTop: '4px solid #3b82f6', marginBottom: '1rem', marginTop: '-1.5rem', marginLeft: '-1.5rem', marginRight: '-1.5rem' }} />
        <h2 style={{ margin: '0 0 1rem 0', color: '#1e293b', fontSize: '1.25rem' }}>
          {form.title || '(Titel)'}
        </h2>
        <div
          style={{ color: '#334155', lineHeight: 1.6 }}
          dangerouslySetInnerHTML={{ __html: form.body || '<p style="color:#94a3b8">(Body)</p>' }}
        />
        {form.ctaText && form.ctaUrl && (
          <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
            <span
              style={{
                display: 'inline-block',
                background: '#3b82f6',
                color: '#fff',
                padding: '0.75rem 1.5rem',
                borderRadius: '6px',
                fontWeight: 600,
                textDecoration: 'none'
              }}
            >
              {form.ctaText}
            </span>
          </div>
        )}
        <div
          style={{
            marginTop: '2rem',
            paddingTop: '1rem',
            borderTop: '1px solid #e2e8f0',
            fontSize: '0.7rem',
            color: '#94a3b8',
            textAlign: 'center'
          }}
        >
          Contract AI · <a href="#" style={{ color: '#94a3b8' }}>Abbestellen</a>
        </div>
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
  onCreated
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
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
      }, 300);
    }
  }, [open]);

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
          segmentFilter
        })
      });
      const createData = await createRes.json();
      if (!createRes.ok || !createData.success) {
        throw new Error(createData.message || 'Campaign-Erstellung fehlgeschlagen');
      }
      const campaignId = createData.campaignId;

      // 2. Queue
      const queueRes = await fetch(`${API_URL}/api/admin/campaigns/${campaignId}/queue`, {
        method: 'POST',
        headers: authHeaders()
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
        {/* Individuelle User-IDs */}
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
          <input
            type="checkbox"
            checked={form.filter.useUserIds}
            onChange={(e) => setForm({ ...form, filter: { ...form.filter, useUserIds: e.target.checked } })}
            style={{ marginTop: '0.25rem' }}
          />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>Nur bestimmte User-IDs (überschreibt andere Filter)</div>
            {form.filter.useUserIds && (
              <textarea
                value={form.filter.userIdsText}
                onChange={(e) => setForm({ ...form, filter: { ...form.filter, userIdsText: e.target.value } })}
                placeholder="User-IDs (kommagetrennt oder eine pro Zeile)"
                rows={3}
                style={{ width: '100%', marginTop: '0.5rem', padding: '0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontFamily: 'monospace', fontSize: '0.75rem' }}
              />
            )}
          </div>
        </label>

        {/* Plan */}
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '6px', opacity: form.filter.useUserIds ? 0.5 : 1 }}>
          <input
            type="checkbox"
            disabled={form.filter.useUserIds}
            checked={form.filter.usePlan}
            onChange={(e) => setForm({ ...form, filter: { ...form.filter, usePlan: e.target.checked } })}
          />
          <span style={{ fontSize: '0.875rem', flex: 1 }}>Nach Plan filtern:</span>
          <select
            disabled={!form.filter.usePlan || form.filter.useUserIds}
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
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '6px', opacity: form.filter.useUserIds ? 0.5 : 1 }}>
          <input
            type="checkbox"
            disabled={form.filter.useUserIds}
            checked={form.filter.subscriptionActive}
            onChange={(e) => setForm({ ...form, filter: { ...form.filter, subscriptionActive: e.target.checked } })}
          />
          <span style={{ fontSize: '0.875rem' }}>Nur aktive Abonnenten</span>
        </label>

        {/* Analyses */}
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '6px', opacity: form.filter.useUserIds ? 0.5 : 1 }}>
          <input
            type="checkbox"
            disabled={form.filter.useUserIds}
            checked={form.filter.useMinAnalyses}
            onChange={(e) => setForm({ ...form, filter: { ...form.filter, useMinAnalyses: e.target.checked } })}
          />
          <span style={{ fontSize: '0.875rem', flex: 1 }}>Mindestens</span>
          <input
            type="number"
            disabled={!form.filter.useMinAnalyses || form.filter.useUserIds}
            min={1}
            value={form.filter.minAnalysisCount}
            onChange={(e) => setForm({ ...form, filter: { ...form.filter, minAnalysisCount: Math.max(1, parseInt(e.target.value) || 1) } })}
            style={{ width: '70px', padding: '0.25rem 0.5rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}
          />
          <span style={{ fontSize: '0.875rem' }}>Analysen</span>
        </label>

        {/* Date range */}
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '6px', opacity: form.filter.useUserIds ? 0.5 : 1 }}>
          <input
            type="checkbox"
            disabled={form.filter.useUserIds}
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
  submitLoading
}: {
  form: CampaignForm;
  preview: PreviewResult;
  confirmText: string;
  setConfirmText: (v: string) => void;
  onSubmit: () => void;
  submitLoading: boolean;
}) {
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
            background: confirmText === 'SENDEN' ? '#dc2626' : '#cbd5e1',
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
          Kampagne jetzt starten
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
        <div className={styles.tabHeader}>
          <h3>Kampagnen</h3>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
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
              onClick={() => setModalOpen(true)}
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
                fontWeight: 600
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
                    <td>{statusBadge(c.status)}</td>
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
                      <div style={{ display: 'flex', gap: '0.25rem' }}>
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

      <ComposerModal open={modalOpen} onClose={() => setModalOpen(false)} onCreated={fetchCampaigns} />

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
                <p><strong>Status:</strong> {statusBadge(detailsData.status)}</p>
                <p><strong>Empfänger:</strong> {detailsData.recipientCount}</p>
                <p><strong>Erstellt:</strong> {formatDate(detailsData.createdAt)}</p>
                {detailsData.queuedAt && <p><strong>Eingereiht:</strong> {formatDate(detailsData.queuedAt)}</p>}
                {detailsData.startedAt && <p><strong>Gestartet:</strong> {formatDate(detailsData.startedAt)}</p>}
                {detailsData.completedAt && <p><strong>Abgeschlossen:</strong> {formatDate(detailsData.completedAt)}</p>}
                {detailsData.cancelledAt && <p><strong>Abgebrochen:</strong> {formatDate(detailsData.cancelledAt)}</p>}
                {detailsData.stats && (
                  <div style={{ marginTop: '1rem', padding: '1rem', background: '#f8fafc', borderRadius: '6px' }}>
                    <div><strong>Stats:</strong></div>
                    <div>Gesendet: {detailsData.stats.sent}</div>
                    <div>Fehler: {detailsData.stats.failed}</div>
                    {detailsData.stats.pending !== undefined && <div>Offen: {detailsData.stats.pending}</div>}
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
