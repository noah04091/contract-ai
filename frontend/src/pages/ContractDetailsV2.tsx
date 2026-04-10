// ContractDetailsV2.tsx - Premium Enterprise Design
// Inspiriert von: Notion, Linear, Stripe, Figma

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-toastify";
import { Document, Page, pdfjs } from "react-pdf";
import {
  ArrowLeft,
  Calendar,
  Clock,
  FileText,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Download,
  Printer,
  Edit3,
  Trash2,
  ExternalLink,
  Copy,
  ChevronRight,
  ChevronDown,
  Shield,
  TrendingUp,
  Users,
  FileSearch,
  Zap,
  Eye,
  Share2,
  Info,
  AlertCircle,
  Maximize2,
  BookOpen,
  Lightbulb,
  HelpCircle,
  CreditCard,
  Package,
  Minimize2,
  Award,
  MessageSquare,
  Plus,
  Check,
  X,
  Pencil,
  Lock,
  CalendarPlus
} from "lucide-react";
import styles from "../styles/ContractDetailsV2.module.css";
import ContractEditModal from "../components/ContractEditModal";
import SmartContractInfo from "../components/SmartContractInfo";
import ContractShareModal from "../components/ContractShareModal";
import { useAuth } from "../hooks/useAuth";
import { isBusinessOrHigher } from "../utils/authUtils";
import { createEditableFields, type EditableField } from "../utils/contractEditableFields";

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

// ✅ KUENDIGUNG_OPTIONS, LAUFZEIT_OPTIONS und EDITABLE_FIELDS sind jetzt in:
// frontend/src/utils/contractEditableFields.ts (Shared mit NewContractDetailsModal)

// ============================================
// INTERFACES
// ============================================
interface ImportantDate {
  type: string;
  date: string;
  label: string;
  description?: string;
}

interface CalendarEvent {
  id: string;  // Backend gibt 'id' zurück, nicht '_id' (calendar.js:176)
  title: string;
  date: string;
  type: string;
  severity: 'info' | 'warning' | 'critical';
  isManual?: boolean;
  description?: string;
  status?: string;
}

interface Contract {
  _id: string;
  userId?: string;
  name: string;
  laufzeit: string;
  kuendigung: string;
  uploadedAt?: string;
  expiryDate?: string;
  status?: string;
  filePath?: string;
  s3Key?: string;
  content?: string;
  contentHTML?: string;
  contractHTML?: string;
  designVariant?: string;
  signature?: string;
  isGenerated?: boolean;
  createdAt?: string;
  updatedAt?: string;
  optimizedPdfS3Key?: string;
  importantDates?: ImportantDate[];
  // Felder für ContractEditModal
  gekuendigtZum?: string;
  anbieter?: string;
  kosten?: number;
  vertragsnummer?: string;
  notes?: string;
  // ✅ Editierbare Eckdaten — synchron mit NewContractDetailsModal EDITABLE_FIELDS
  contractType?: string;
  startDate?: string;
  provider?: {
    displayName?: string;
    name?: string;
    category?: string;
    confidence?: number;
  };
  // ✅ Strukturierte Analyse-Felder (für Print-Übersicht)
  positiveAspects?: Array<{ title: string; description: string }>;
  criticalIssues?: Array<{ title: string; description: string; riskLevel?: string }>;
  recommendations?: Array<string | { title: string; description?: string; priority?: string }>;
  // ✅ Dynamische QuickFacts (Rechnungsdatum, Fälligkeit, Betrag, etc.)
  quickFacts?: Array<{
    label: string;
    value: string;
    rating?: 'good' | 'neutral' | 'bad';
  }>;
  // ✅ Eigene benutzerdefinierte Felder (z.B. "Account Manager: Max Mustermann")
  customFields?: Array<{
    label: string;
    value: string;
  }>;
  // ✅ Payment-Tracking-Felder (für SmartContractInfo)
  paymentMethod?: string;
  paymentAmount?: number;
  paymentStatus?: 'paid' | 'unpaid';
  paymentDate?: string;
  paymentDueDate?: string;
  // Kündigungs-Tracking
  cancellationId?: string;
  cancellationDate?: string;
  // Root-Level Analyse-Felder (vom Backend)
  contractScore?: number;
  summary?: string;
  legalAssessment?: string | string[];
  suggestions?: string[];
  risiken?: string[];
  comparison?: string | string[];
  laymanSummary?: string[];
  detailedLegalOpinion?: string;
  analysis?: {
    summary?: string;
    contractType?: string;
    parties?: {
      provider?: string;
      customer?: string;
    };
    keyTerms?: {
      duration?: string;
      cancellation?: string;
      payment?: string;
      deliverables?: string;
    };
    positiveAspects?: Array<{
      title: string;
      description: string;
      relevance: string;
    }>;
    concerningAspects?: Array<{
      title: string;
      description: string;
      impact: string;
    }>;
    importantClauses?: Array<{
      title: string;
      content: string;
      explanation: string;
      action: string;
    }>;
    recommendations?: string[];
    missingInformation?: string[];
    analyzedAt?: string;
  };
  legalPulse?: {
    riskScore: number | null;
    summary?: string;
    riskFactors?: string[];
    legalRisks?: string[];
    recommendations?: string[];
    analysisDate?: string;
  };
}

type TabType = 'overview' | 'analysis' | 'document' | 'timeline';

// ============================================
// MAIN COMPONENT
// ============================================
export default function ContractDetailsV2() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const documentRef = useRef<HTMLDivElement>(null);

  // 🏢 Rollen-Awareness
  const orgRole = user?.organization?.orgRole;
  const canEdit = () => {
    if (!orgRole || !contract) return true;
    if (contract.userId && user?._id && contract.userId.toString() === user._id.toString()) return true;
    return orgRole === 'admin' || orgRole === 'member';
  };
  const canDelete = () => {
    if (!orgRole || !contract) return true;
    if (contract.userId && user?._id && contract.userId.toString() === user._id.toString()) return true;
    return orgRole === 'admin';
  };

  // State
  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  // ESC-Taste Handler für Fullscreen-Modal
  useEffect(() => {
    const handleEscKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };

    if (isFullscreen) {
      document.addEventListener('keydown', handleEscKey);
      // Prevent body scroll when fullscreen is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey);
      document.body.style.overflow = '';
    };
  }, [isFullscreen]);

  // PDF Viewer State
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pdfScale, setPdfScale] = useState(1.0);

  // Accordion State for Important Clauses
  const [expandedClauses, setExpandedClauses] = useState<Set<number>>(new Set());

  // Chat State
  const [openingChat, setOpeningChat] = useState(false);

  // ✅ Inline-Edit State (synchron mit Modal-Pattern)
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [savingField, setSavingField] = useState(false);
  const [showAddFieldMenu, setShowAddFieldMenu] = useState(false);
  const addFieldMenuRef = useRef<HTMLDivElement>(null);

  // ✅ QuickFacts State (synchron mit Modal-Pattern)
  const [editingQuickFact, setEditingQuickFact] = useState<number | null>(null);
  const [addingQuickFact, setAddingQuickFact] = useState(false);
  const [qfLabel, setQfLabel] = useState('');
  const [qfValue, setQfValue] = useState('');
  const [qfRating, setQfRating] = useState<'good' | 'neutral' | 'bad'>('neutral');

  // ✅ CustomFields State (synchron mit Modal-Pattern)
  const [editingCustomField, setEditingCustomField] = useState<number | null>(null);
  const [addingCustomField, setAddingCustomField] = useState(false);
  const [customFieldLabel, setCustomFieldLabel] = useState('');
  const [customFieldValue, setCustomFieldValue] = useState('');

  // ✅ Notizen-Edit State
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState('');

  // ✅ Calendar-Event-CRUD State (Timeline-Tab)
  const [showKiInfoText, setShowKiInfoText] = useState(false);
  const [showAddEventForm, setShowAddEventForm] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [eventFormTitle, setEventFormTitle] = useState('');
  const [eventFormDate, setEventFormDate] = useState('');
  const [eventFormDescription, setEventFormDescription] = useState('');
  const [eventFormSeverity, setEventFormSeverity] = useState<'info' | 'warning' | 'critical'>('info');
  const [savingEvent, setSavingEvent] = useState(false);
  const [convertingImportantDateIdx, setConvertingImportantDateIdx] = useState<number | null>(null);

  // ✅ Subscription-Gate für Calendar-Event-CRUD (Backend erfordert Business+)
  const canEditCalendarEvents = user ? isBusinessOrHigher(user) : false;

  // Click-Outside-Handler für + Dropdown
  useEffect(() => {
    if (!showAddFieldMenu) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (addFieldMenuRef.current && !addFieldMenuRef.current.contains(e.target as Node)) {
        setShowAddFieldMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showAddFieldMenu]);

  // Mobile Detection
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  // Responsive resize listener
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ============================================
  // DATA FETCHING
  // ============================================
  useEffect(() => {
    const fetchContract = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/contracts/${id}`, {
          credentials: "include",
        });

        if (!res.ok) {
          toast.error("Vertrag nicht gefunden");
          setLoading(false);
          return;
        }

        const data = await res.json();
        setContract(data);
      } catch (error) {
        console.error("Fehler beim Laden:", error);
        toast.error("Fehler beim Laden des Vertrags");
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchContract();
  }, [id]);

  // Fetch Calendar Events — als useCallback für CRUD-Refetch wiederverwendbar
  const fetchCalendarEvents = useCallback(async () => {
    if (!id) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/calendar/events?contractId=${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.events) {
          setCalendarEvents(data.events);
        }
      }
    } catch (err) {
      console.error('Error fetching calendar events:', err);
    }
  }, [id]);

  useEffect(() => {
    fetchCalendarEvents();
  }, [fetchCalendarEvents]);

  // Fetch PDF URL for inline viewer
  useEffect(() => {
    const fetchPdfUrl = async () => {
      if (!contract?._id) return;

      setPdfLoading(true);
      try {
        const token = localStorage.getItem('token');

        if (contract?.s3Key) {
          // Normal: PDF von S3 laden
          const res = await fetch(`/api/s3/view?contractId=${contract._id}&type=original`, {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            credentials: 'include'
          });
          if (res.ok) {
            const data = await res.json();
            if (data.fileUrl || data.url) {
              setPdfUrl(data.fileUrl || data.url);
            }
          }
        } else if (contract?.content || contract?.contractHTML) {
          // Fallback: PDF on-demand generieren via React-PDF
          const res = await fetch(`/api/contracts/${contract._id}/pdf-v2`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ design: contract.designVariant || 'executive' })
          });
          if (res.ok) {
            const blob = await res.blob();
            setPdfUrl(window.URL.createObjectURL(blob));
          }
        }
      } catch (error) {
        console.error('Error fetching PDF URL:', error);
      } finally {
        setPdfLoading(false);
      }
    };

    fetchPdfUrl();
  }, [contract?._id, contract?.s3Key]);

  // PDF Navigation Handlers
  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setPageNumber(1);
  };

  const handlePdfZoomIn = () => setPdfScale(prev => Math.min(prev + 0.2, 2.5));
  const handlePdfZoomOut = () => setPdfScale(prev => Math.max(prev - 0.2, 0.5));
  const handleNextPage = () => numPages && pageNumber < numPages && setPageNumber(prev => prev + 1);
  const handlePrevPage = () => pageNumber > 1 && setPageNumber(prev => prev - 1);

  // ============================================
  // PDF & PRINT HANDLERS
  // ============================================
  const handlePrint = useCallback(() => {
    if (!contract) return;

    // ✅ Eckdaten sammeln (gleiche Felder wie EDITABLE_FIELDS)
    const eckdatenRows = [
      contract.anbieter || contract.provider?.displayName || contract.provider?.name
        ? `<tr><td>Anbieter</td><td>${contract.anbieter || contract.provider?.displayName || contract.provider?.name}</td></tr>` : '',
      contract.contractType ? `<tr><td>Vertragstyp</td><td>${contract.contractType}</td></tr>` : '',
      contract.vertragsnummer ? `<tr><td>Vertragsnummer</td><td>${contract.vertragsnummer}</td></tr>` : '',
      contract.startDate ? `<tr><td>Vertragsbeginn</td><td>${formatDate(contract.startDate)}</td></tr>` : '',
      contract.laufzeit ? `<tr><td>Laufzeit</td><td>${contract.laufzeit}</td></tr>` : '',
      contract.expiryDate ? `<tr><td>Enddatum</td><td>${formatDate(contract.expiryDate)}</td></tr>` : '',
      contract.kuendigung ? `<tr><td>Kündigungsfrist</td><td>${contract.kuendigung}</td></tr>` : '',
      contract.gekuendigtZum ? `<tr><td>Gekündigt zum</td><td>${formatDate(contract.gekuendigtZum)}</td></tr>` : '',
      contract.kosten != null && contract.kosten > 0
        ? `<tr><td>Monatliche Kosten</td><td>${contract.kosten.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}</td></tr>` : '',
    ].filter(Boolean).join('');

    // ✅ QuickFacts sammeln
    const quickFactsRows = (contract.quickFacts || []).map(f =>
      `<tr><td>${f.label}</td><td>${f.value}</td></tr>`
    ).join('');

    // ✅ Zusammenfassung
    const summaryHtml = contract.laymanSummary?.length
      ? `<ul>${contract.laymanSummary.map(s => `<li>${s}</li>`).join('')}</ul>`
      : contract.summary ? `<p>${contract.summary}</p>` : '';

    // ✅ Analyse-Felder
    const legalAssessmentHtml = contract.legalAssessment
      ? (Array.isArray(contract.legalAssessment)
          ? `<ul>${contract.legalAssessment.map(s => `<li>${s}</li>`).join('')}</ul>`
          : `<p>${contract.legalAssessment}</p>`)
      : '';

    const suggestionsHtml = contract.suggestions
      ? (Array.isArray(contract.suggestions)
          ? `<ul>${contract.suggestions.map(s => `<li>${s}</li>`).join('')}</ul>`
          : `<p>${contract.suggestions}</p>`)
      : '';

    // ✅ Strukturierte Analyse
    const positivesHtml = contract.positiveAspects?.length
      ? `<ul>${contract.positiveAspects.map(a =>
          `<li><strong>${a.title}</strong>${a.description ? ` — ${a.description}` : ''}</li>`
        ).join('')}</ul>` : '';

    const criticalsHtml = contract.criticalIssues?.length
      ? `<ul>${contract.criticalIssues.map(i =>
          `<li><strong>${i.title}</strong>${i.riskLevel ? ` (${i.riskLevel})` : ''}${i.description ? ` — ${i.description}` : ''}</li>`
        ).join('')}</ul>` : '';

    const recsHtml = contract.recommendations?.length
      ? `<ul>${contract.recommendations.map(r => {
          const isObj = typeof r === 'object' && r !== null;
          return `<li><strong>${isObj ? r.title : r}</strong>${isObj && r.description ? ` — ${r.description}` : ''}</li>`;
        }).join('')}</ul>` : '';

    // ✅ Calendar Events
    const eventsHtml = calendarEvents.length > 0
      ? `<ul>${calendarEvents.map(e =>
          `<li>${e.title} — ${formatDate(e.date)}${e.description ? ` (${e.description})` : ''}</li>`
        ).join('')}</ul>`
      : '<p style="color:#94a3b8;">Keine Kalender-Events vorhanden.</p>';

    // ✅ Wichtige Termine (KI)
    const importantDatesHtml = contract.importantDates?.length
      ? `<ul>${contract.importantDates.map(d =>
          `<li>${d.label} — ${formatDate(d.date)}${d.description ? ` (${d.description})` : ''}</li>`
        ).join('')}</ul>`
      : '';

    // ✅ Score
    const scoreValue = contract.contractScore;
    const scoreLabel = scoreValue != null
      ? (scoreValue >= 70 ? 'Gut' : scoreValue >= 40 ? 'Mittel' : 'Verbesserungsbedarf')
      : null;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Vertragsübersicht — ${contract.name}</title>
          <style>
            @page { size: A4; margin: 18mm 15mm 20mm 15mm; }
            body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 10pt; line-height: 1.6; color: #1a1a1a; max-width: 800px; margin: 0 auto; padding: 20px; }
            h1 { font-size: 16pt; color: #1e40af; margin-bottom: 5px; }
            h2 { font-size: 12pt; color: #1e40af; margin-top: 24px; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; }
            .subtitle { font-size: 10pt; color: #64748b; margin-bottom: 20px; }
            .score-box { display: inline-block; background: #f0f9ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 12px 20px; margin: 10px 0 20px; }
            .score-value { font-size: 24pt; font-weight: 700; color: #1e40af; }
            .score-label { font-size: 10pt; color: #64748b; margin-left: 8px; }
            table { width: 100%; border-collapse: collapse; margin: 8px 0; }
            table td { padding: 6px 10px; border-bottom: 1px solid #f1f5f9; font-size: 10pt; }
            table td:first-child { font-weight: 600; color: #475569; width: 40%; }
            ul { margin: 8px 0; padding-left: 20px; }
            li { margin-bottom: 6px; }
            .section { margin-bottom: 16px; }
            .footer { margin-top: 30px; text-align: center; font-size: 8pt; color: #94a3b8; border-top: 1px solid #e5e7eb; padding-top: 10px; }
          </style>
        </head>
        <body>
          <h1>${contract.name}</h1>
          <div class="subtitle">
            Status: ${contract.status || '—'} | Hochgeladen: ${formatDate(contract.uploadedAt || contract.createdAt)}
          </div>

          ${scoreValue != null ? `
            <div class="score-box">
              <span class="score-value">${scoreValue}/100</span>
              <span class="score-label">${scoreLabel}</span>
            </div>
          ` : ''}

          ${eckdatenRows ? `
            <h2>Vertragsdetails</h2>
            <table>${eckdatenRows}</table>
          ` : ''}

          ${quickFactsRows ? `
            <h2>Eckdaten auf einen Blick</h2>
            <table>${quickFactsRows}</table>
          ` : ''}

          ${summaryHtml ? `
            <h2>Zusammenfassung</h2>
            <div class="section">${summaryHtml}</div>
          ` : ''}

          ${legalAssessmentHtml ? `
            <h2>Rechtliche Bewertung</h2>
            <div class="section">${legalAssessmentHtml}</div>
          ` : ''}

          ${suggestionsHtml ? `
            <h2>Optimierungsvorschläge</h2>
            <div class="section">${suggestionsHtml}</div>
          ` : ''}

          ${positivesHtml ? `
            <h2>Positive Aspekte</h2>
            <div class="section">${positivesHtml}</div>
          ` : ''}

          ${criticalsHtml ? `
            <h2>Kritische Punkte</h2>
            <div class="section">${criticalsHtml}</div>
          ` : ''}

          ${recsHtml ? `
            <h2>Konkrete Empfehlungen</h2>
            <div class="section">${recsHtml}</div>
          ` : ''}

          <h2>Kalender-Events</h2>
          <div class="section">${eventsHtml}</div>

          ${importantDatesHtml ? `
            <h2>Wichtige Termine (KI-extrahiert)</h2>
            <div class="section">${importantDatesHtml}</div>
          ` : ''}

          ${contract.notes ? `
            <h2>Notizen</h2>
            <div class="section"><p>${contract.notes.replace(/\n/g, '<br/>')}</p></div>
          ` : ''}

          <div class="footer">
            Vertragsübersicht erstellt am ${new Date().toLocaleDateString('de-DE')} | Contract AI
          </div>
        </body>
        </html>
      `);
      printWindow.document.close();
      setTimeout(() => printWindow.print(), 300);
    } else {
      toast.error('Pop-up blockiert. Bitte erlauben Sie Pop-ups für diese Seite.');
    }
  }, [contract, calendarEvents]);

  const handleExportPDF = useCallback(async () => {
    if (!contract || exporting) return;
    setExporting(true);

    try {
      const html2pdfModule = await import('html2pdf.js');
      const html2pdf = (html2pdfModule.default || html2pdfModule) as typeof import('html2pdf.js').default;

      // Create content for PDF
      const content = document.createElement('div');
      content.innerHTML = `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto;">
          <h1 style="font-size: 24px; text-align: center; color: #1e40af; margin-bottom: 30px;">${contract.name}</h1>

          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
            <p style="margin: 5px 0;"><strong>Status:</strong> ${contract.status || 'Unbekannt'}</p>
            <p style="margin: 5px 0;"><strong>Hochgeladen:</strong> ${contract.uploadedAt ? new Date(contract.uploadedAt).toLocaleDateString('de-DE') : 'Unbekannt'}</p>
            ${contract.laufzeit ? `<p style="margin: 5px 0;"><strong>Laufzeit:</strong> ${contract.laufzeit}</p>` : ''}
            ${contract.kuendigung ? `<p style="margin: 5px 0;"><strong>Kündigungsfrist:</strong> ${contract.kuendigung}</p>` : ''}
          </div>

          <div style="line-height: 1.7;">
            ${contract.contentHTML || contract.content?.replace(/\n/g, '<br/>') || '<p style="color: #94a3b8; text-align: center;">Kein Inhalt verfügbar</p>'}
          </div>

          ${contract.signature ? `
            <div style="margin-top: 50px; padding-top: 20px; border-top: 2px solid #1e40af;">
              <p style="font-weight: 600; color: #1e40af;">Digitale Unterschrift:</p>
              <img src="${contract.signature}" alt="Unterschrift" style="max-width: 200px; margin-top: 10px;" />
            </div>
          ` : ''}

          <div style="margin-top: 50px; text-align: center; font-size: 10px; color: #94a3b8; border-top: 1px solid #e5e7eb; padding-top: 20px;">
            <p>Exportiert am ${new Date().toLocaleDateString('de-DE')} | Contract AI</p>
          </div>
        </div>
      `;

      const options = {
        margin: [10, 10, 15, 10] as [number, number, number, number],
        filename: `${contract.name.replace(/[^a-zA-Z0-9äöüÄÖÜß]/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, letterRendering: true },
        jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const }
      };

      await html2pdf().set(options).from(content).save();
      toast.success('PDF erfolgreich exportiert!');
    } catch (error) {
      console.error('PDF Export failed:', error);
      toast.error('PDF-Export fehlgeschlagen');
    } finally {
      setExporting(false);
    }
  }, [contract, exporting]);

  const handleOpenOriginalPDF = useCallback(async () => {
    if (!contract) return;

    try {
      const token = localStorage.getItem('token');

      // S3 PDF laden
      if (contract._id && contract.s3Key) {
        const res = await fetch(`/api/s3/view?contractId=${contract._id}&type=original`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        });
        if (res.ok) {
          const data = await res.json();
          if (data.fileUrl || data.url) {
            window.open(data.fileUrl || data.url, '_blank');
            return;
          }
        }
      }

      // Fallback: PDF on-demand generieren via React-PDF
      if (contract._id && (contract.content || contract.contractHTML)) {
        const res = await fetch(`/api/contracts/${contract._id}/pdf-v2`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify({ design: contract.designVariant || 'executive' })
        });
        if (res.ok) {
          const blob = await res.blob();
          const blobUrl = window.URL.createObjectURL(blob);
          window.open(blobUrl, '_blank');
          return;
        }
      }

      // Fallback to filePath
      if (contract.filePath) {
        window.open(`/api${contract.filePath}`, '_blank');
      } else {
        toast.error('Keine PDF-Datei verfügbar');
      }
    } catch (error) {
      console.error('Error opening PDF:', error);
      toast.error('Fehler beim Öffnen der PDF');
    }
  }, [contract]);

  const handleDownloadOptimizedPDF = useCallback(async () => {
    if (!contract?.optimizedPdfS3Key) return;

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/s3/view?key=${encodeURIComponent(contract.optimizedPdfS3Key)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.url) {
          window.open(data.url, '_blank');
          toast.success('Optimiertes PDF wird heruntergeladen');
        }
      }
    } catch (error) {
      console.error('Error downloading optimized PDF:', error);
      toast.error('Fehler beim Herunterladen');
    }
  }, [contract]);

  // ============================================
  // OTHER HANDLERS
  // ============================================
  const handleDelete = async () => {
    const confirmDelete = window.confirm("Bist du sicher, dass du diesen Vertrag löschen möchtest? Diese Aktion kann nicht rückgängig gemacht werden.");
    if (!confirmDelete || deleting) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/contracts/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (res.ok) {
        toast.success("Vertrag erfolgreich gelöscht");
        setTimeout(() => navigate("/contracts"), 1000);
      } else {
        toast.error("Fehler beim Löschen");
      }
    } catch (error) {
      console.error("Fehler beim Löschen:", error);
      toast.error("Serverfehler beim Löschen");
    } finally {
      setDeleting(false);
    }
  };


  const handleCopyContent = async () => {
    if (!contract?.content) {
      toast.error("Kein Inhalt zum Kopieren");
      return;
    }
    try {
      await navigator.clipboard.writeText(contract.content);
      toast.success("Inhalt in Zwischenablage kopiert!");
    } catch {
      toast.error("Kopieren fehlgeschlagen");
    }
  };

  const handleShare = () => {
    setShowShareModal(true);
  };

  const handleAnalyze = () => {
    if (contract) {
      navigate(`/optimizer?contractId=${contract._id}`);
    }
  };

  // 💬 Handler: Mit KI-Rechtsbot besprechen
  const handleOpenInChat = async () => {
    if (!contract) {
      toast.error('Kein Vertrag für den Chat gefunden.');
      return;
    }

    setOpeningChat(true);

    try {
      const token = localStorage.getItem('token');

      // Build analysis context from available data
      const contextParts: string[] = [];

      // Summary
      if (contract.laymanSummary?.length) {
        contextParts.push(`**Zusammenfassung:** ${contract.laymanSummary.join(' ')}`);
      } else if (contract.summary) {
        contextParts.push(`**Zusammenfassung:** ${contract.summary}`);
      } else if (contract.analysis?.summary) {
        contextParts.push(`**Zusammenfassung:** ${contract.analysis.summary}`);
      }

      // Contract Score
      if (contract.contractScore) {
        contextParts.push(`**Vertragsbewertung:** ${contract.contractScore}/100`);
      }

      // Legal Pulse Score
      if (contract.legalPulse?.riskScore !== null && contract.legalPulse?.riskScore !== undefined) {
        contextParts.push(`**Legal Pulse Score:** ${contract.legalPulse.riskScore}/100`);
      }

      // Positive Aspects
      if (contract.analysis?.positiveAspects?.length) {
        contextParts.push(`\n**Positive Aspekte:**`);
        contract.analysis.positiveAspects.forEach(a => {
          contextParts.push(`- ${a.title}`);
        });
      }

      // Concerning Aspects
      if (contract.analysis?.concerningAspects?.length) {
        contextParts.push(`\n**Bedenkliche Aspekte:**`);
        contract.analysis.concerningAspects.forEach(a => {
          contextParts.push(`- ${a.title}`);
        });
      }

      // Root-level Risiken
      if (contract.risiken?.length) {
        contextParts.push(`\n**Kritische Risiken:**`);
        contract.risiken.forEach(r => {
          contextParts.push(`- ${r}`);
        });
      }

      // Legal Pulse Risk Factors
      if (contract.legalPulse?.riskFactors?.length) {
        contextParts.push(`\n**Risikofaktoren:**`);
        contract.legalPulse.riskFactors.forEach(r => {
          const text = typeof r === 'string' ? r : '';
          if (text) contextParts.push(`- ${text}`);
        });
      }

      // Recommendations
      if (contract.analysis?.recommendations?.length) {
        contextParts.push(`\n**Empfehlungen:**`);
        contract.analysis.recommendations.forEach(r => {
          const text = typeof r === 'string' ? r : '';
          if (text) contextParts.push(`- ${text}`);
        });
      }

      const analysisContext = contextParts.join('\n');

      const response = await fetch('/api/chat/new-with-contract', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify({
          contractId: contract._id,
          contractName: contract.name,
          analysisContext: analysisContext,
          s3Key: contract.s3Key || null
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Chat konnte nicht erstellt werden');
      }

      const data = await response.json();
      navigate(`/chat?id=${data.chatId}`);
    } catch (error) {
      console.error('Error opening chat:', error);
      toast.error(error instanceof Error ? error.message : 'Chat konnte nicht geöffnet werden');
    } finally {
      setOpeningChat(false);
    }
  };

  // ============================================
  // HELPER FUNCTIONS
  // ============================================
  const formatDate = (dateString?: string): string => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    });
  };

  // ✅ Inline-Edit Handler (synchron mit Modal Zeile 739-774)
  const handleInlineSave = async (fieldKey: string, value: string) => {
    if (!contract) return;
    setSavingField(true);
    try {
      const updateData: Record<string, unknown> = {};
      if (fieldKey === 'kosten') {
        updateData[fieldKey] = value ? parseFloat(value) : null;
      } else {
        updateData[fieldKey] = value || null;
      }

      const token = localStorage.getItem('token');
      const res = await fetch(`/api/contracts/${contract._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` })
        },
        credentials: 'include',
        body: JSON.stringify(updateData),
      });

      if (!res.ok) throw new Error('Speichern fehlgeschlagen');
      setContract({ ...contract, ...updateData } as Contract);
      toast.success('Gespeichert');
    } catch (err) {
      console.error('Inline save error:', err);
      toast.error('Fehler beim Speichern');
    } finally {
      setSavingField(false);
      setEditingField(null);
    }
  };

  const startEditingField = (key: string, currentValue: string) => {
    setEditingField(key);
    setEditValue(currentValue);
  };

  const cancelEditingField = () => {
    setEditingField(null);
    setEditValue('');
  };

  // ✅ QuickFacts speichern (synchron mit Modal handleQuickFactsSave)
  const handleQuickFactsSave = async (
    updatedFacts: Array<{ label: string; value: string; rating?: 'good' | 'neutral' | 'bad' }>
  ) => {
    if (!contract) return;
    setSavingField(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/contracts/${contract._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` })
        },
        credentials: 'include',
        body: JSON.stringify({ quickFacts: updatedFacts }),
      });
      if (!res.ok) throw new Error('Speichern fehlgeschlagen');
      setContract({ ...contract, quickFacts: updatedFacts });
      toast.success('Gespeichert');
    } catch (err) {
      console.error('QuickFacts save error:', err);
      toast.error('Fehler beim Speichern');
    } finally {
      setSavingField(false);
      setEditingQuickFact(null);
      setAddingQuickFact(false);
    }
  };

  // ✅ Notizen speichern
  const handleNotesSave = async (value: string) => {
    if (!contract) return;
    setSavingField(true);
    try {
      const trimmed = value.trim();
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/contracts/${contract._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` })
        },
        credentials: 'include',
        body: JSON.stringify({ notes: trimmed || null }),
      });
      if (!res.ok) throw new Error('Speichern fehlgeschlagen');
      setContract({ ...contract, notes: trimmed || undefined });
      toast.success('Gespeichert');
    } catch (err) {
      console.error('Notes save error:', err);
      toast.error('Fehler beim Speichern');
    } finally {
      setSavingField(false);
      setEditingNotes(false);
    }
  };

  // ============================================
  // ✅ TIMELINE: Calendar-Event CRUD Handler
  // ============================================
  // Reset Event-Form-Felder
  const resetEventForm = () => {
    setEventFormTitle('');
    setEventFormDate('');
    setEventFormDescription('');
    setEventFormSeverity('info');
    setShowAddEventForm(false);
    setEditingEventId(null);
  };

  // Edit-Mode für ein bestehendes Event starten
  const startEditingEvent = (event: CalendarEvent) => {
    setEditingEventId(event.id);
    setEventFormTitle(event.title);
    // Date in YYYY-MM-DD Format konvertieren für <input type="date">
    const d = new Date(event.date);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    setEventFormDate(`${yyyy}-${mm}-${dd}`);
    setEventFormDescription(event.description || '');
    setEventFormSeverity(event.severity);
    setShowAddEventForm(false);
  };

  // Neues Event erstellen (POST /api/calendar/events)
  const handleCreateEvent = async () => {
    if (!id || !eventFormTitle.trim() || !eventFormDate) return;
    setSavingEvent(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/calendar/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` })
        },
        credentials: 'include',
        body: JSON.stringify({
          contractId: id,
          title: eventFormTitle.trim(),
          date: eventFormDate,
          description: eventFormDescription.trim() || undefined,
          type: 'CUSTOM',
          severity: eventFormSeverity,
        }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        if (res.status === 403 && errorData.upgradeRequired) {
          toast.error('Calendar-Events erstellen erfordert Business+ Plan');
        } else {
          throw new Error(errorData.error || 'Erstellen fehlgeschlagen');
        }
        return;
      }
      await fetchCalendarEvents();
      toast.success('Event erstellt');
      resetEventForm();
    } catch (err) {
      console.error('Create event error:', err);
      toast.error('Fehler beim Erstellen');
    } finally {
      setSavingEvent(false);
    }
  };

  // Event aktualisieren (PATCH /api/calendar/events/:id)
  const handleUpdateEvent = async () => {
    if (!editingEventId || !eventFormTitle.trim() || !eventFormDate) return;
    setSavingEvent(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/calendar/events/${editingEventId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` })
        },
        credentials: 'include',
        body: JSON.stringify({
          title: eventFormTitle.trim(),
          date: eventFormDate,
          description: eventFormDescription.trim(),
          severity: eventFormSeverity,
        }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        if (res.status === 403 && errorData.upgradeRequired) {
          toast.error('Calendar-Events bearbeiten erfordert Business+ Plan');
        } else {
          throw new Error(errorData.error || 'Aktualisieren fehlgeschlagen');
        }
        return;
      }
      await fetchCalendarEvents();
      toast.success('Event aktualisiert');
      resetEventForm();
    } catch (err) {
      console.error('Update event error:', err);
      toast.error('Fehler beim Aktualisieren');
    } finally {
      setSavingEvent(false);
    }
  };

  // Event löschen (DELETE /api/calendar/events/:id)
  const handleDeleteEvent = async (eventId: string) => {
    if (!eventId) return;
    if (!window.confirm('Dieses Event wirklich löschen?')) return;
    setSavingEvent(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/calendar/events/${eventId}`, {
        method: 'DELETE',
        headers: {
          ...(token && { Authorization: `Bearer ${token}` })
        },
        credentials: 'include',
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        if (res.status === 403 && errorData.upgradeRequired) {
          toast.error('Calendar-Events löschen erfordert Business+ Plan');
        } else {
          throw new Error(errorData.error || 'Löschen fehlgeschlagen');
        }
        return;
      }
      await fetchCalendarEvents();
      toast.success('Event gelöscht');
      resetEventForm();
    } catch (err) {
      console.error('Delete event error:', err);
      toast.error('Fehler beim Löschen');
    } finally {
      setSavingEvent(false);
    }
  };

  // Heuristik: Hat der Vertrag bereits ein Calendar-Event mit gleichem Datum & ähnlichem Titel?
  // Wird verwendet, um den "+ In Kalender übernehmen"-Button bei importantDates zu deaktivieren,
  // wenn das Event bereits existiert (Duplikat-Schutz)
  const isImportantDateInCalendar = (importantDate: ImportantDate): boolean => {
    if (!calendarEvents || calendarEvents.length === 0) return false;
    const targetDate = new Date(importantDate.date);
    const targetTime = targetDate.getTime();
    const oneDayMs = 24 * 60 * 60 * 1000;
    const labelLower = (importantDate.label || '').toLowerCase();
    return calendarEvents.some(ev => {
      const evDate = new Date(ev.date);
      // Datum muss innerhalb ±1 Tag sein
      const dateDiff = Math.abs(evDate.getTime() - targetTime);
      if (dateDiff > oneDayMs) return false;
      // Titel-Heuristik: enthält das Label oder wird vom Label enthalten
      const titleLower = (ev.title || '').toLowerCase();
      if (!labelLower) return true; // gleichem Datum reicht wenn Label fehlt
      return titleLower.includes(labelLower) || labelLower.includes(titleLower);
    });
  };

  // ImportantDate als richtigen Calendar-Event übernehmen
  const handleConvertImportantDate = async (importantDate: ImportantDate, idx: number) => {
    if (!id) return;
    if (isImportantDateInCalendar(importantDate)) {
      toast.info('Bereits im Kalender vorhanden');
      return;
    }
    setConvertingImportantDateIdx(idx);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/calendar/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` })
        },
        credentials: 'include',
        body: JSON.stringify({
          contractId: id,
          title: importantDate.label,
          date: importantDate.date,
          description: importantDate.description || `Übernommen aus KI-extrahierten Terminen (Typ: ${importantDate.type})`,
          type: 'DEADLINE',
          severity: 'warning',
        }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        if (res.status === 403 && errorData.upgradeRequired) {
          toast.error('In Kalender übernehmen erfordert Business+ Plan');
        } else {
          throw new Error(errorData.error || 'Übernehmen fehlgeschlagen');
        }
        return;
      }
      await fetchCalendarEvents();
      toast.success('In Kalender übernommen');
    } catch (err) {
      console.error('Convert importantDate error:', err);
      toast.error('Fehler beim Übernehmen');
    } finally {
      setConvertingImportantDateIdx(null);
    }
  };

  // ✅ CustomFields speichern (synchron mit Modal handleCustomFieldsSave)
  const handleCustomFieldsSave = async (
    updatedFields: Array<{ label: string; value: string }>
  ) => {
    if (!contract) return;
    setSavingField(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/contracts/${contract._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` })
        },
        credentials: 'include',
        body: JSON.stringify({ customFields: updatedFields }),
      });
      if (!res.ok) throw new Error('Speichern fehlgeschlagen');
      setContract({ ...contract, customFields: updatedFields });
      toast.success('Gespeichert');
    } catch (err) {
      console.error('CustomFields save error:', err);
      toast.error('Fehler beim Speichern');
    } finally {
      setSavingField(false);
      setEditingCustomField(null);
      setAddingCustomField(false);
    }
  };

  // ✅ Icon-Map: V2-spezifisch (nicht Teil der Shared-Utility, weil JSX)
  const FIELD_ICONS: Record<string, React.ReactNode> = {
    contractType: <Package size={16} />,
    anbieter: <Users size={16} />,
    vertragsnummer: <FileText size={16} />,
    gekuendigtZum: <Calendar size={16} />,
    kuendigung: <AlertCircle size={16} />,
    laufzeit: <Clock size={16} />,
    startDate: <Calendar size={16} />,
    expiryDate: <Calendar size={16} />,
    kosten: <CreditCard size={16} />,
  };

  // ✅ Felder kommen jetzt aus der Shared-Utility — single source of truth mit Modal
  // Icons werden V2-spezifisch über die FIELD_ICONS-Map ergänzt
  type EditableFieldWithIcon = EditableField & { icon?: React.ReactNode };
  const EDITABLE_FIELDS: EditableFieldWithIcon[] = !contract
    ? []
    : createEditableFields(contract, formatDate).map(f => ({
        ...f,
        icon: FIELD_ICONS[f.key],
      }));

  // ✅ Render einer einzelnen Eckdaten-Card (im Read- oder Edit-Modus)
  const renderEditableMetricCard = (field: EditableFieldWithIcon) => {
    const isEditing = editingField === field.key;

    if (isEditing) {
      return (
        <div key={field.key} className={styles.metricCard}>
          <div className={styles.metricHeader}>
            <span className={styles.metricLabel}>{field.label}</span>
            <div className={styles.metricIconWrapper}>{field.icon}</div>
          </div>
          <div className={styles.metricEditWrapper}>
            {field.type === 'dropdown' && field.options ? (
              <select
                className={styles.metricEditInput}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                autoFocus
              >
                <option value="">— Auswählen —</option>
                {field.options.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            ) : field.type === 'date' ? (
              <input
                type="date"
                className={styles.metricEditInput}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleInlineSave(field.key, editValue);
                  if (e.key === 'Escape') cancelEditingField();
                }}
              />
            ) : (
              <input
                type={field.type === 'number' ? 'number' : 'text'}
                className={styles.metricEditInput}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                autoFocus
                step={field.type === 'number' ? '0.01' : undefined}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleInlineSave(field.key, editValue);
                  if (e.key === 'Escape') cancelEditingField();
                }}
              />
            )}
          </div>
          <div className={styles.metricEditActions}>
            <button
              className={styles.metricEditSave}
              onClick={() => handleInlineSave(field.key, editValue)}
              disabled={savingField}
              title="Speichern"
            >
              <Check size={14} />
            </button>
            <button
              className={styles.metricEditCancel}
              onClick={cancelEditingField}
              title="Abbrechen"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      );
    }

    // Read-Mode → Card ist klickbar
    return (
      <div
        key={field.key}
        className={`${styles.metricCard} ${styles.metricCardEditable}`}
        onClick={() => {
          if (field.type === 'date' && field.rawValue()) {
            const d = new Date(field.rawValue());
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            startEditingField(field.key, `${yyyy}-${mm}-${dd}`);
          } else {
            startEditingField(field.key, field.rawValue());
          }
        }}
        title="Klicken zum Bearbeiten"
      >
        <div className={styles.metricHeader}>
          <span className={styles.metricLabel}>{field.label}</span>
          <div className={styles.metricIconWrapper}>{field.icon}</div>
        </div>
        <div className={styles.metricValue}>
          {field.displayValue()}
          <Pencil size={12} className={styles.metricEditPencil} />
        </div>
      </div>
    );
  };

  const getRelativeTime = (dateString: string): string => {
    const date = new Date(dateString);
    date.setHours(0, 0, 0, 0);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const diff = Math.round((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diff === -1) return "Gestern";
    if (diff < -1) return `vor ${Math.abs(diff)} Tagen`;
    if (diff === 0) return "Heute";
    if (diff === 1) return "Morgen";
    return `in ${diff} Tagen`;
  };

  const getStatusStyle = (status?: string): string => {
    if (!status) return styles.statusNeutral;
    switch (status.toLowerCase()) {
      case 'aktiv':
      case 'gültig':
        return styles.statusActive;
      case 'gekündigt':
      case 'beendet':
        return styles.statusCancelled;
      case 'läuft ab':
      case 'bald fällig':
        return styles.statusExpiring;
      default:
        return styles.statusNeutral;
    }
  };

  const getRiskLevel = (score: number | null | undefined) => {
    if (score === null || score === undefined) return { level: 'unrated', label: 'Nicht bewertet', style: styles.riskUnrated };
    if (score >= 70) return { level: 'low', label: 'Geringes Risiko', style: styles.riskLow };
    if (score >= 40) return { level: 'medium', label: 'Mittleres Risiko', style: styles.riskMedium };
    return { level: 'high', label: 'Hohes Risiko', style: styles.riskHigh };
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const getScoreInfo = (score: number | null | undefined) => {
    if (score === null || score === undefined) return { status: 'Nicht bewertet', color: 'var(--cd-text-tertiary)', bgColor: 'var(--cd-bg)' };
    if (score >= 80) return { status: 'Ausgezeichnet', color: 'var(--cd-success)', bgColor: 'var(--cd-success-light)' };
    if (score >= 60) return { status: 'Gut', color: '#22c55e', bgColor: 'rgba(34, 197, 94, 0.1)' };
    if (score >= 40) return { status: 'Mittel', color: 'var(--cd-warning)', bgColor: 'var(--cd-warning-light)' };
    return { status: 'Kritisch', color: 'var(--cd-danger)', bgColor: 'var(--cd-danger-light)' };
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const toggleClause = (index: number) => {
    setExpandedClauses(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  // ============================================
  // LOADING STATE
  // ============================================
  if (loading) {
    return (
      <div className={styles.pageContainer}>
        <div className={styles.loadingContainer}>
          <div className={styles.loadingSpinner} />
          <p className={styles.loadingText}>Vertrag wird geladen...</p>
        </div>
      </div>
    );
  }

  // ============================================
  // ERROR STATE
  // ============================================
  if (!contract) {
    return (
      <div className={styles.pageContainer}>
        <div className={styles.errorContainer}>
          <div className={styles.errorIcon}>
            <AlertTriangle size={40} />
          </div>
          <h2 className={styles.errorTitle}>Vertrag nicht gefunden</h2>
          <p className={styles.errorText}>
            Der angeforderte Vertrag konnte nicht geladen werden.
          </p>
          <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => navigate('/contracts')}>
            Zurück zur Übersicht
          </button>
        </div>
      </div>
    );
  }

  const riskInfo = getRiskLevel(contract.legalPulse?.riskScore);
  const scoreInfo = getScoreInfo(contract.contractScore);
  const hasContractScore = contract.contractScore !== null && contract.contractScore !== undefined;
  const hasAnalysis = contract.analysis && (
    contract.analysis.summary ||
    contract.analysis.positiveAspects?.length ||
    contract.analysis.concerningAspects?.length
  ) || contract.legalAssessment || contract.comparison || contract.risiken?.length || contract.laymanSummary?.length || contract.summary || contract.suggestions?.length || contract.detailedLegalOpinion || contract.contractScore;

  // Legal Pulse: generische Fallback-Daten erkennen und ausblenden
  const isLegalPulseGeneric = contract.legalPulse && (
    (contract.legalPulse.summary && (
      contract.legalPulse.summary.includes('Basis-Analyse') ||
      contract.legalPulse.summary.includes('manuelle Prüfung') ||
      contract.legalPulse.summary.includes('nicht vollständig')
    )) ||
    (contract.legalPulse.riskFactors && contract.legalPulse.riskFactors.some((r: string) =>
      typeof r === 'string' && (
        r.includes('unvollständig') ||
        r.includes('Automatische Analyse')
      )
    ))
  );

  // ============================================
  // RENDER
  // ============================================
  return (
    <>
      <Helmet>
        <title>{contract.name} | Contract AI</title>
        <meta name="description" content={`Vertragsdetails für ${contract.name}`} />
      </Helmet>

      <div className={styles.pageContainer}>
        <div className={styles.contentWrapper}>
          {/* Top Header - Breadcrumb & Actions (Desktop Only) */}
          {!isMobile && (
            <motion.div
              className={styles.topHeader}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className={styles.breadcrumb}>
                <button
                  className={styles.backButton}
                  onClick={() => navigate('/contracts')}
                  aria-label="Zurück zur Vertragsübersicht"
                >
                  <ArrowLeft size={18} />
                </button>
                <span className={styles.breadcrumbText}>
                  <Link to="/contracts">Verträge</Link>
                  <span className={styles.breadcrumbSeparator}> / </span>
                  <span className={styles.breadcrumbCurrent}>{contract.name}</span>
                </span>
              </div>
              <div className={styles.headerActions}>
                <button
                  className={`${styles.btn} ${styles.btnGhost} ${styles.btnIcon}`}
                  title="Teilen"
                  aria-label="Vertrag teilen"
                  onClick={handleShare}
                >
                  <Share2 size={18} />
                </button>
                <button
                  className={`${styles.btn} ${styles.btnGhost} ${styles.btnIcon}`}
                  title="Drucken"
                  aria-label="Vertrag drucken"
                  onClick={handlePrint}
                >
                  <Printer size={18} />
                </button>
              </div>
            </motion.div>
          )}

          {/* Mobile Header - Title & Meta (Only on Mobile) */}
          {isMobile && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              style={{
                marginBottom: 16,
                paddingBottom: 16,
                borderBottom: '1px solid var(--cd-border)'
              }}
            >
              {/* Mobile Top Row: Back Button & Actions */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 12
              }}>
                <button
                  onClick={() => navigate('/contracts')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 12px',
                    background: 'var(--cd-surface)',
                    border: '1px solid var(--cd-border)',
                    borderRadius: 8,
                    color: 'var(--cd-text-secondary)',
                    fontSize: 14,
                    fontWeight: 500,
                    cursor: 'pointer'
                  }}
                >
                  <ArrowLeft size={16} />
                  Zurück
                </button>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={handleShare}
                    title="Teilen"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 36,
                      height: 36,
                      background: 'var(--cd-surface)',
                      border: '1px solid var(--cd-border)',
                      borderRadius: 8,
                      color: 'var(--cd-text-secondary)',
                      cursor: 'pointer'
                    }}
                  >
                    <Share2 size={16} />
                  </button>
                  <button
                    onClick={handlePrint}
                    title="Drucken"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 36,
                      height: 36,
                      background: 'var(--cd-surface)',
                      border: '1px solid var(--cd-border)',
                      borderRadius: 8,
                      color: 'var(--cd-text-secondary)',
                      cursor: 'pointer'
                    }}
                  >
                    <Printer size={16} />
                  </button>
                </div>
              </div>

              <h1 style={{
                fontSize: 18,
                fontWeight: 600,
                color: 'var(--cd-text-primary)',
                margin: '0 0 8px 0',
                lineHeight: 1.3,
                wordWrap: 'break-word',
                overflowWrap: 'break-word'
              }}>
                {contract.name}
                {contract.isGenerated && (
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    marginLeft: 8,
                    padding: '2px 8px',
                    fontSize: 10,
                    fontWeight: 500,
                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                    color: 'white',
                    borderRadius: 12,
                    verticalAlign: 'middle'
                  }}>
                    <Zap size={10} /> KI
                  </span>
                )}
              </h1>
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: 12,
                fontSize: 13,
                color: 'var(--cd-text-secondary)'
              }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Calendar size={14} />
                  {contract.isGenerated ? 'Erstellt' : 'Hochgeladen'}: {formatDate(contract.isGenerated ? contract.createdAt : contract.uploadedAt)}
                </span>
                {contract.status && contract.status !== 'Unbekannt' && (
                  <span className={`${styles.statusBadge} ${getStatusStyle(contract.status)}`} style={{ fontSize: 11, padding: '4px 10px' }}>
                    {contract.status === 'Aktiv' && <CheckCircle size={12} />}
                    {contract.status === 'Gekündigt' && <XCircle size={12} />}
                    {contract.status === 'Läuft ab' && <AlertTriangle size={12} />}
                    {contract.status}
                  </span>
                )}
              </div>
            </motion.div>
          )}

          {/* Desktop Header - Title & Status */}
          {!isMobile && (
            <motion.div
              className={styles.mainHeader}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
            >
              <div className={styles.titleSection}>
                <h1 className={styles.contractTitle}>
                  {contract.name}
                  {contract.isGenerated && (
                    <span className={styles.aiGeneratedBadge}>
                      <Zap size={12} /> KI-Generiert
                    </span>
                  )}
                </h1>
                <div className={styles.contractMeta}>
                  <span className={styles.metaItem}>
                    <Calendar size={14} className={styles.metaIcon} />
                    {contract.isGenerated ? 'Erstellt' : 'Hochgeladen'}: {formatDate(contract.isGenerated ? contract.createdAt : contract.uploadedAt)}
                  </span>
                  {contract.analysis?.contractType && (
                    <span className={styles.metaItem}>
                      <FileText size={14} className={styles.metaIcon} />
                      {contract.analysis.contractType}
                    </span>
                  )}
                </div>
              </div>

              {contract.status && contract.status !== 'Unbekannt' && (
                <div className={styles.statusSection}>
                  <span className={`${styles.statusBadge} ${getStatusStyle(contract.status)}`}>
                    {contract.status === 'Aktiv' && <CheckCircle size={14} />}
                    {contract.status === 'Gekündigt' && <XCircle size={14} />}
                    {contract.status === 'Läuft ab' && <AlertTriangle size={14} />}
                    {contract.status}
                  </span>
                </div>
              )}
            </motion.div>
          )}

          {/* Tab Navigation */}
          <motion.div
            className={styles.tabNavigation}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            <button
              className={`${styles.tabButton} ${activeTab === 'overview' ? styles.active : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              <Eye size={18} className={styles.tabIcon} />
              Übersicht
            </button>
            <button
              className={`${styles.tabButton} ${activeTab === 'analysis' ? styles.active : ''}`}
              onClick={() => setActiveTab('analysis')}
            >
              <TrendingUp size={18} className={styles.tabIcon} />
              Analyse
              {hasAnalysis && <span className={styles.tabBadge}>!</span>}
            </button>
            <button
              className={`${styles.tabButton} ${activeTab === 'document' ? styles.active : ''}`}
              onClick={() => setActiveTab('document')}
            >
              <FileText size={18} className={styles.tabIcon} />
              Dokument
            </button>
            <button
              className={`${styles.tabButton} ${activeTab === 'timeline' ? styles.active : ''}`}
              onClick={() => setActiveTab('timeline')}
            >
              <Clock size={18} className={styles.tabIcon} />
              Timeline
              {calendarEvents.length > 0 && (
                <span className={styles.tabBadge}>{calendarEvents.length}</span>
              )}
            </button>
          </motion.div>

          {/* Content Grid */}
          <div className={styles.contentGrid}>
            <div className={styles.mainContent}>
              <AnimatePresence mode="wait">
                {/* OVERVIEW TAB */}
                {activeTab === 'overview' && (
                  <motion.div
                    key="overview"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.2 }}
                  >
                    {/* Contract Score Hero Card */}
                    {hasContractScore && (
                      <div className={`${styles.card} ${styles.scoreHeroCard} ${styles.fadeIn}`}>
                        <div className={styles.scoreHeroContent}>
                          <div className={styles.scoreCircleContainer}>
                            <div
                              className={styles.scoreCircle}
                              style={{
                                '--score-color': scoreInfo.color,
                                '--score-bg': scoreInfo.bgColor,
                                '--score-progress': `${(contract.contractScore || 0) * 3.6}deg`
                              } as React.CSSProperties}
                            >
                              <div className={styles.scoreCircleInner}>
                                <span className={styles.scoreValue} style={{ color: scoreInfo.color }}>
                                  {contract.contractScore}
                                </span>
                                <span className={styles.scoreMax}>/100</span>
                              </div>
                            </div>
                          </div>
                          <div className={styles.scoreDetails}>
                            <div className={styles.scoreHeader}>
                              <Award size={20} style={{ color: scoreInfo.color }} />
                              <h3 className={styles.scoreTitle}>Vertragsbewertung</h3>
                            </div>
                            <div className={styles.scoreStatus} style={{ color: scoreInfo.color, background: scoreInfo.bgColor }}>
                              {scoreInfo.status}
                            </div>
                            <div className={styles.scoreMetrics}>
                              <div className={styles.scoreMetric}>
                                <Shield size={14} />
                                <span>Risiko: {riskInfo.label}</span>
                              </div>
                              {contract.analysis?.positiveAspects && (
                                <div className={styles.scoreMetric}>
                                  <CheckCircle size={14} style={{ color: 'var(--cd-success)' }} />
                                  <span>{contract.analysis.positiveAspects.length} Stärken</span>
                                </div>
                              )}
                              {contract.analysis?.concerningAspects && (
                                <div className={styles.scoreMetric}>
                                  <AlertTriangle size={14} style={{ color: 'var(--cd-warning)' }} />
                                  <span>{contract.analysis.concerningAspects.length} Bedenken</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Key Metrics - Extended */}
                    <div className={`${styles.card} ${styles.fadeIn} ${hasContractScore ? styles.stagger1 : ''}`}>
                      <div className={styles.cardHeader}>
                        <h3 className={styles.cardTitle}>
                          <span className={styles.cardIcon}><Info size={18} /></span>
                          Vertragsdetails
                        </h3>
                        {/* ✅ + Button: fehlende Standard-Felder ODER eigenes Feld */}
                        {(() => {
                          const fieldsMissing = EDITABLE_FIELDS.filter(f => !f.hasValue() && editingField !== f.key);
                          return (
                            <div className={styles.addFieldWrapper} ref={addFieldMenuRef}>
                              <button
                                className={styles.addFieldButton}
                                onClick={() => setShowAddFieldMenu(!showAddFieldMenu)}
                                title="Feld hinzufügen"
                              >
                                <Plus size={16} />
                              </button>
                              {showAddFieldMenu && (
                                <div className={styles.addFieldDropdown}>
                                  {fieldsMissing.map((field) => (
                                    <button
                                      key={field.key}
                                      className={styles.addFieldItem}
                                      onClick={() => {
                                        setShowAddFieldMenu(false);
                                        startEditingField(field.key, '');
                                      }}
                                    >
                                      {field.label}
                                    </button>
                                  ))}
                                  {fieldsMissing.length > 0 && <div className={styles.addFieldDivider} />}
                                  <button
                                    className={styles.addFieldItem}
                                    onClick={() => {
                                      setShowAddFieldMenu(false);
                                      setAddingCustomField(true);
                                      setCustomFieldLabel('');
                                      setCustomFieldValue('');
                                    }}
                                  >
                                    ✏️ Eigenes Feld hinzufügen
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                      <div className={styles.cardBody}>
                        <div className={styles.metricsGrid}>
                          {/* ✅ Editierbare Felder — nur befüllte oder gerade bearbeitete werden gerendert */}
                          {EDITABLE_FIELDS.map((field) => {
                            const isBeingEdited = editingField === field.key;
                            if (!field.hasValue() && !isBeingEdited) return null;
                            return renderEditableMetricCard(field);
                          })}

                          {/* ✅ Custom Fields (vom User selbst angelegt) */}
                          {(contract.customFields || []).map((cf, index) => {
                            const isEditingCf = editingCustomField === index;
                            if (isEditingCf) {
                              return (
                                <div key={`cf-${index}`} className={styles.metricCard} style={{ gridColumn: '1 / -1' }}>
                                  <div className={styles.quickFactEditRow}>
                                    <input
                                      className={styles.metricEditInput}
                                      value={customFieldLabel}
                                      onChange={(e) => setCustomFieldLabel(e.target.value)}
                                      placeholder="Bezeichnung"
                                      autoFocus
                                      style={{ flex: 1 }}
                                    />
                                    <input
                                      className={styles.metricEditInput}
                                      value={customFieldValue}
                                      onChange={(e) => setCustomFieldValue(e.target.value)}
                                      placeholder="Wert"
                                      style={{ flex: 1 }}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter' && customFieldLabel && customFieldValue) {
                                          const updated = [...(contract.customFields || [])];
                                          updated[index] = { label: customFieldLabel, value: customFieldValue };
                                          handleCustomFieldsSave(updated);
                                        }
                                        if (e.key === 'Escape') setEditingCustomField(null);
                                      }}
                                    />
                                    <button
                                      className={styles.metricEditSave}
                                      onClick={() => {
                                        if (customFieldLabel && customFieldValue) {
                                          const updated = [...(contract.customFields || [])];
                                          updated[index] = { label: customFieldLabel, value: customFieldValue };
                                          handleCustomFieldsSave(updated);
                                        }
                                      }}
                                      disabled={!customFieldLabel || !customFieldValue || savingField}
                                      title="Speichern"
                                    >
                                      <Check size={14} />
                                    </button>
                                    <button
                                      className={styles.metricEditCancel}
                                      onClick={() => setEditingCustomField(null)}
                                      title="Abbrechen"
                                    >
                                      <X size={14} />
                                    </button>
                                    <button
                                      className={styles.metricEditCancel}
                                      onClick={() => {
                                        const updated = (contract.customFields || []).filter((_, i) => i !== index);
                                        handleCustomFieldsSave(updated);
                                      }}
                                      title="Löschen"
                                      style={{ color: '#dc2626' }}
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                </div>
                              );
                            }
                            return (
                              <div
                                key={`cf-${index}`}
                                className={`${styles.metricCard} ${styles.metricCardEditable}`}
                                onClick={() => {
                                  setEditingCustomField(index);
                                  setCustomFieldLabel(cf.label);
                                  setCustomFieldValue(cf.value);
                                }}
                                title="Klicken zum Bearbeiten"
                              >
                                <div className={styles.metricHeader}>
                                  <span className={styles.metricLabel}>{cf.label}</span>
                                </div>
                                <div className={styles.metricValue}>
                                  {cf.value}
                                  <Pencil size={12} className={styles.metricEditPencil} />
                                </div>
                              </div>
                            );
                          })}

                          {/* ✅ Inline-Form: neues Custom Field hinzufügen */}
                          {addingCustomField && (
                            <div className={styles.metricCard} style={{ gridColumn: '1 / -1' }}>
                              <div className={styles.quickFactEditRow}>
                                <input
                                  className={styles.metricEditInput}
                                  value={customFieldLabel}
                                  onChange={(e) => setCustomFieldLabel(e.target.value)}
                                  placeholder="Bezeichnung (z.B. Account Manager)"
                                  autoFocus
                                  style={{ flex: 1 }}
                                />
                                <input
                                  className={styles.metricEditInput}
                                  value={customFieldValue}
                                  onChange={(e) => setCustomFieldValue(e.target.value)}
                                  placeholder="Wert"
                                  style={{ flex: 1 }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && customFieldLabel && customFieldValue) {
                                      const updated = [...(contract.customFields || []), { label: customFieldLabel, value: customFieldValue }];
                                      handleCustomFieldsSave(updated);
                                    }
                                    if (e.key === 'Escape') setAddingCustomField(false);
                                  }}
                                />
                                <button
                                  className={styles.metricEditSave}
                                  onClick={() => {
                                    if (customFieldLabel && customFieldValue) {
                                      const updated = [...(contract.customFields || []), { label: customFieldLabel, value: customFieldValue }];
                                      handleCustomFieldsSave(updated);
                                    }
                                  }}
                                  disabled={!customFieldLabel || !customFieldValue || savingField}
                                  title="Hinzufügen"
                                >
                                  <Check size={14} />
                                </button>
                                <button
                                  className={styles.metricEditCancel}
                                  onClick={() => setAddingCustomField(false)}
                                  title="Abbrechen"
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            </div>
                          )}

                          {/* ℹ️ Hinweis wenn KEIN Feld befüllt ist (Standard + Custom) */}
                          {EDITABLE_FIELDS.every(f => !f.hasValue()) &&
                           (!contract.customFields || contract.customFields.length === 0) &&
                           editingField === null && !addingCustomField && (
                            <div className={styles.metricEmptyHint}>
                              <Info size={16} />
                              <span>Noch keine Eckdaten vorhanden. Klicke oben auf <strong>+</strong>, um welche hinzuzufügen.</span>
                            </div>
                          )}
                        </div>

                        {/* Sub-Info: Restzeit zum Ablaufdatum (read-only, berechnet) */}
                        {contract.expiryDate && editingField !== 'expiryDate' && (
                          <div className={styles.metricSubInfo}>
                            <Clock size={14} />
                            <span>Ablaufdatum: {getRelativeTime(contract.expiryDate)}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* ✅ QuickFacts — Eckdaten auf einen Blick (synchron mit Modal) */}
                    <div className={`${styles.card} ${styles.fadeIn}`} style={{ marginTop: 24 }}>
                      <div className={styles.cardHeader}>
                        <h3 className={styles.cardTitle}>
                          <span className={styles.cardIcon}><Info size={18} /></span>
                          Eckdaten auf einen Blick
                        </h3>
                        <button
                          className={styles.addFieldButton}
                          onClick={() => {
                            setAddingQuickFact(true);
                            setQfLabel('');
                            setQfValue('');
                            setQfRating('neutral');
                          }}
                          title="Eckdatum hinzufügen"
                          disabled={addingQuickFact}
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                      <div className={styles.cardBody}>
                        {/* Empty state */}
                        {(!contract.quickFacts || contract.quickFacts.length === 0) && !addingQuickFact && (
                          <div className={styles.metricEmptyHint}>
                            <Info size={16} />
                            <span>Noch keine Eckdaten vorhanden. Klicke oben auf <strong>+</strong>, um welche hinzuzufügen.</span>
                          </div>
                        )}

                        {/* List of QuickFacts */}
                        {contract.quickFacts && contract.quickFacts.length > 0 && (
                          <div className={styles.metricsGrid}>
                            {contract.quickFacts.map((fact, index) => {
                              const isEditing = editingQuickFact === index;
                              if (isEditing) {
                                return (
                                  <div key={index} className={styles.metricCard} style={{ gridColumn: '1 / -1' }}>
                                    <div className={styles.quickFactEditRow}>
                                      <input
                                        className={styles.metricEditInput}
                                        value={qfLabel}
                                        onChange={(e) => setQfLabel(e.target.value)}
                                        placeholder="Bezeichnung"
                                        autoFocus
                                        style={{ flex: 1 }}
                                      />
                                      <input
                                        className={styles.metricEditInput}
                                        value={qfValue}
                                        onChange={(e) => setQfValue(e.target.value)}
                                        placeholder="Wert"
                                        style={{ flex: 1 }}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter' && qfLabel && qfValue) {
                                            const updated = [...(contract.quickFacts || [])];
                                            updated[index] = { label: qfLabel, value: qfValue, rating: qfRating };
                                            handleQuickFactsSave(updated);
                                          }
                                          if (e.key === 'Escape') setEditingQuickFact(null);
                                        }}
                                      />
                                      <select
                                        className={styles.metricEditInput}
                                        value={qfRating}
                                        onChange={(e) => setQfRating(e.target.value as 'good' | 'neutral' | 'bad')}
                                        style={{ width: 'auto', flex: '0 0 auto' }}
                                      >
                                        <option value="good">Gut</option>
                                        <option value="neutral">Neutral</option>
                                        <option value="bad">Schlecht</option>
                                      </select>
                                      <button
                                        className={styles.metricEditSave}
                                        onClick={() => {
                                          if (qfLabel && qfValue) {
                                            const updated = [...(contract.quickFacts || [])];
                                            updated[index] = { label: qfLabel, value: qfValue, rating: qfRating };
                                            handleQuickFactsSave(updated);
                                          }
                                        }}
                                        disabled={!qfLabel || !qfValue || savingField}
                                        title="Speichern"
                                      >
                                        <Check size={14} />
                                      </button>
                                      <button
                                        className={styles.metricEditCancel}
                                        onClick={() => setEditingQuickFact(null)}
                                        title="Abbrechen"
                                      >
                                        <X size={14} />
                                      </button>
                                      <button
                                        className={styles.metricEditCancel}
                                        onClick={() => {
                                          const updated = (contract.quickFacts || []).filter((_, i) => i !== index);
                                          handleQuickFactsSave(updated);
                                        }}
                                        title="Löschen"
                                        style={{ color: '#dc2626' }}
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    </div>
                                  </div>
                                );
                              }

                              const ratingColor =
                                fact.rating === 'good' ? '#059669' :
                                fact.rating === 'bad' ? '#dc2626' :
                                undefined;
                              return (
                                <div
                                  key={index}
                                  className={`${styles.metricCard} ${styles.metricCardEditable}`}
                                  onClick={() => {
                                    setEditingQuickFact(index);
                                    setQfLabel(fact.label);
                                    setQfValue(fact.value);
                                    setQfRating(fact.rating || 'neutral');
                                  }}
                                  title="Klicken zum Bearbeiten"
                                >
                                  <div className={styles.metricHeader}>
                                    <span className={styles.metricLabel}>{fact.label}</span>
                                  </div>
                                  <div
                                    className={styles.metricValue}
                                    style={ratingColor ? { color: ratingColor } : undefined}
                                  >
                                    {fact.value}
                                    <Pencil size={12} className={styles.metricEditPencil} />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Inline-Form: neues QuickFact hinzufügen */}
                        {addingQuickFact && (
                          <div className={styles.quickFactEditRow} style={{ marginTop: contract.quickFacts && contract.quickFacts.length > 0 ? '12px' : 0 }}>
                            <input
                              className={styles.metricEditInput}
                              value={qfLabel}
                              onChange={(e) => setQfLabel(e.target.value)}
                              placeholder="Bezeichnung (z.B. Rechnungsdatum)"
                              autoFocus
                              style={{ flex: 1 }}
                            />
                            <input
                              className={styles.metricEditInput}
                              value={qfValue}
                              onChange={(e) => setQfValue(e.target.value)}
                              placeholder="Wert (z.B. 04.03.2026)"
                              style={{ flex: 1 }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && qfLabel && qfValue) {
                                  const updated = [...(contract.quickFacts || []), { label: qfLabel, value: qfValue, rating: qfRating }];
                                  handleQuickFactsSave(updated);
                                }
                                if (e.key === 'Escape') setAddingQuickFact(false);
                              }}
                            />
                            <select
                              className={styles.metricEditInput}
                              value={qfRating}
                              onChange={(e) => setQfRating(e.target.value as 'good' | 'neutral' | 'bad')}
                              style={{ width: 'auto', flex: '0 0 auto' }}
                            >
                              <option value="good">Gut</option>
                              <option value="neutral">Neutral</option>
                              <option value="bad">Schlecht</option>
                            </select>
                            <button
                              className={styles.metricEditSave}
                              onClick={() => {
                                if (qfLabel && qfValue) {
                                  const updated = [...(contract.quickFacts || []), { label: qfLabel, value: qfValue, rating: qfRating }];
                                  handleQuickFactsSave(updated);
                                }
                              }}
                              disabled={!qfLabel || !qfValue || savingField}
                              title="Hinzufügen"
                            >
                              <Check size={14} />
                            </button>
                            <button
                              className={styles.metricEditCancel}
                              onClick={() => setAddingQuickFact(false)}
                              title="Abbrechen"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* ✅ Notizen — editierbar */}
                    <div className={`${styles.card} ${styles.fadeIn}`} style={{ marginTop: 24 }}>
                      <div className={styles.cardHeader}>
                        <h3 className={styles.cardTitle}>
                          <span className={styles.cardIcon}><FileText size={18} /></span>
                          Notizen
                        </h3>
                        {!editingNotes && (
                          <button
                            className={styles.addFieldButton}
                            onClick={() => {
                              setEditingNotes(true);
                              setNotesValue(contract.notes || '');
                            }}
                            title={contract.notes ? 'Notizen bearbeiten' : 'Notizen hinzufügen'}
                          >
                            {contract.notes ? <Pencil size={14} /> : <Plus size={16} />}
                          </button>
                        )}
                      </div>
                      <div className={styles.cardBody}>
                        {editingNotes ? (
                          <div>
                            <textarea
                              className={styles.metricEditInput}
                              value={notesValue}
                              onChange={(e) => setNotesValue(e.target.value)}
                              placeholder="Notizen zu diesem Vertrag…"
                              autoFocus
                              rows={6}
                              style={{ width: '100%', resize: 'vertical', minHeight: '120px', fontFamily: 'inherit', fontWeight: 400, lineHeight: 1.6 }}
                              onKeyDown={(e) => {
                                if (e.key === 'Escape') {
                                  setEditingNotes(false);
                                  setNotesValue('');
                                }
                              }}
                            />
                            <div className={styles.metricEditActions} style={{ marginTop: '10px' }}>
                              <button
                                className={styles.metricEditSave}
                                onClick={() => handleNotesSave(notesValue)}
                                disabled={savingField}
                                title="Speichern"
                              >
                                <Check size={14} />
                              </button>
                              <button
                                className={styles.metricEditCancel}
                                onClick={() => {
                                  setEditingNotes(false);
                                  setNotesValue('');
                                }}
                                title="Abbrechen"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          </div>
                        ) : contract.notes ? (
                          <p style={{ margin: 0, lineHeight: 1.7, color: 'var(--cd-text-secondary)', whiteSpace: 'pre-wrap' }}>
                            {contract.notes}
                          </p>
                        ) : (
                          <p style={{ margin: 0, color: 'var(--cd-text-tertiary)', fontStyle: 'italic', fontSize: '14px' }}>
                            Noch keine Notizen vorhanden. Klicke oben auf <strong>+</strong>, um welche hinzuzufügen.
                          </p>
                        )}
                      </div>
                    </div>

                    {/* ✅ SmartContractInfo (Payment/Cost-Tracker) — synchron mit Modal */}
                    {(contract.paymentMethod || contract.paymentAmount || contract.paymentStatus) && (
                      <div className={`${styles.card} ${styles.fadeIn}`} style={{ marginTop: 24 }}>
                        <div className={styles.cardBody}>
                          <SmartContractInfo
                            contract={contract as Parameters<typeof SmartContractInfo>[0]['contract']}
                          />
                        </div>
                      </div>
                    )}

                    {/* Parties */}
                    {contract.analysis?.parties && (contract.analysis.parties.provider || contract.analysis.parties.customer) && (
                      <div className={`${styles.card} ${styles.fadeIn} ${styles.stagger1}`}>
                        <div className={styles.cardHeader}>
                          <h3 className={styles.cardTitle}>
                            <span className={styles.cardIcon}><Users size={18} /></span>
                            Vertragsparteien
                          </h3>
                        </div>
                        <div className={styles.cardBody}>
                          <div className={styles.partiesGrid}>
                            {contract.analysis.parties.provider && (
                              <div className={styles.partyCard}>
                                <div className={styles.partyAvatar}>
                                  {contract.analysis.parties.provider.charAt(0).toUpperCase()}
                                </div>
                                <div className={styles.partyInfo}>
                                  <div className={styles.partyRole}>Anbieter</div>
                                  <div className={styles.partyName}>{contract.analysis.parties.provider}</div>
                                </div>
                              </div>
                            )}
                            {contract.analysis.parties.customer && (
                              <div className={styles.partyCard}>
                                <div className={styles.partyAvatar}>
                                  {contract.analysis.parties.customer.charAt(0).toUpperCase()}
                                </div>
                                <div className={styles.partyInfo}>
                                  <div className={styles.partyRole}>Kunde</div>
                                  <div className={styles.partyName}>{contract.analysis.parties.customer}</div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Summary - Layman or Analysis Summary */}
                    {(contract.laymanSummary?.length || contract.analysis?.summary || contract.summary) && (
                      <div className={`${styles.card} ${styles.fadeIn} ${styles.stagger2}`}>
                        <div className={styles.cardHeader}>
                          <h3 className={styles.cardTitle}>
                            <span className={styles.cardIcon}><FileSearch size={18} /></span>
                            {contract.laymanSummary?.length ? 'Zusammenfassung (einfach erklärt)' : 'Zusammenfassung'}
                          </h3>
                        </div>
                        <div className={styles.cardBody}>
                          {contract.laymanSummary?.length ? (
                            <ul className={styles.summaryList}>
                              {contract.laymanSummary.map((item, idx) => (
                                <li key={idx}>{item}</li>
                              ))}
                            </ul>
                          ) : (
                            <p style={{ margin: 0, lineHeight: 1.7, color: 'var(--cd-text-secondary)' }}>
                              {contract.summary || contract.analysis?.summary}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* ANALYSIS TAB */}
                {activeTab === 'analysis' && (
                  <motion.div
                    key="analysis"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.2 }}
                  >
                    {/* Analysis Stats Header */}
                    {hasAnalysis && (
                      <div className={`${styles.analysisStatsHeader} ${styles.fadeIn}`}>
                        {hasContractScore && (
                          <div className={styles.statBadge} style={{ background: scoreInfo.bgColor, color: scoreInfo.color }}>
                            <Shield size={16} />
                            <span>Score: {contract.contractScore}</span>
                          </div>
                        )}
                        {((contract.risiken?.filter(r => typeof r === 'string' && r.trim()).length || 0) + (!isLegalPulseGeneric ? (contract.legalPulse?.riskFactors?.length || 0) : 0)) > 0 ? (
                          <div className={styles.statBadge} style={{ background: 'var(--cd-danger-light)', color: 'var(--cd-danger)' }}>
                            <AlertTriangle size={16} />
                            <span>Risiken: {(contract.risiken?.filter(r => typeof r === 'string' && r.trim()).length || 0) + (!isLegalPulseGeneric ? (contract.legalPulse?.riskFactors?.length || 0) : 0)}</span>
                          </div>
                        ) : null}
                        {contract.analysis?.positiveAspects?.length ? (
                          <div className={styles.statBadge} style={{ background: 'var(--cd-success-light)', color: 'var(--cd-success)' }}>
                            <CheckCircle size={16} />
                            <span>Stärken: {contract.analysis.positiveAspects.length}</span>
                          </div>
                        ) : null}
                        {(contract.analysis?.analyzedAt || contract.legalPulse?.analysisDate) && (
                          <div className={styles.statBadge}>
                            <Calendar size={16} />
                            <span>Analyse: {formatDate(contract.analysis?.analyzedAt || contract.legalPulse?.analysisDate)}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Contract Score Hero Card */}
                    {hasContractScore && (
                      <div className={`${styles.card} ${styles.scoreHeroCard} ${styles.fadeIn}`}>
                        <div className={styles.scoreHeroContent}>
                          <div className={styles.scoreCircleContainer}>
                            <div
                              className={styles.scoreCircle}
                              style={{
                                '--score-color': scoreInfo.color,
                                '--score-bg': scoreInfo.bgColor,
                                '--score-progress': `${(contract.contractScore || 0) * 3.6}deg`
                              } as React.CSSProperties}
                            >
                              <div className={styles.scoreCircleInner}>
                                <span className={styles.scoreValue} style={{ color: scoreInfo.color }}>
                                  {contract.contractScore}
                                </span>
                                <span className={styles.scoreMax}>/100</span>
                              </div>
                            </div>
                          </div>
                          <div className={styles.scoreDetails}>
                            <div className={styles.scoreHeader}>
                              <Award size={20} style={{ color: scoreInfo.color }} />
                              <h3 className={styles.scoreTitle}>Vertragsbewertung</h3>
                            </div>
                            <div className={styles.scoreStatus} style={{ color: scoreInfo.color, background: scoreInfo.bgColor }}>
                              {scoreInfo.status}
                            </div>
                            <div className={styles.scoreMetrics}>
                              <div className={styles.scoreMetric}>
                                <Shield size={14} />
                                <span>Risiko: {riskInfo.label}</span>
                              </div>
                              {contract.analysis?.positiveAspects && (
                                <div className={styles.scoreMetric}>
                                  <CheckCircle size={14} style={{ color: 'var(--cd-success)' }} />
                                  <span>{contract.analysis.positiveAspects.length} Stärken</span>
                                </div>
                              )}
                              {contract.analysis?.concerningAspects && (
                                <div className={styles.scoreMetric}>
                                  <AlertTriangle size={14} style={{ color: 'var(--cd-warning)' }} />
                                  <span>{contract.analysis.concerningAspects.length} Bedenken</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Zusammenfassung (Root-Level Summary) */}
                    {contract.summary && (
                      <div className={`${styles.card} ${styles.fadeIn} ${styles.stagger1}`}>
                        <div className={styles.cardHeader}>
                          <h3 className={styles.cardTitle}>
                            <span className={styles.cardIcon}>
                              <FileSearch size={18} />
                            </span>
                            Zusammenfassung
                          </h3>
                        </div>
                        <div className={styles.cardBody}>
                          {Array.isArray(contract.summary) ? (
                            <ul className={styles.summaryList}>
                              {(contract.summary as unknown as string[]).map((item: string, idx: number) => (
                                <li key={idx} style={{ marginBottom: '8px', lineHeight: 1.7, color: 'var(--cd-text-secondary)' }}>{item}</li>
                              ))}
                            </ul>
                          ) : (
                            <p style={{ margin: 0, lineHeight: 1.7, color: 'var(--cd-text-secondary)', whiteSpace: 'pre-wrap' }}>
                              {contract.summary}
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Rechtliche Bewertung / Legal Assessment */}
                    {contract.legalAssessment && (
                      <div className={`${styles.card} ${styles.fadeIn} ${styles.stagger1}`}>
                        <div className={styles.cardHeader}>
                          <h3 className={styles.cardTitle}>
                            <span className={styles.cardIcon} style={{ background: '#e0e7ff', color: '#4f46e5' }}>
                              <Shield size={18} />
                            </span>
                            Rechtliche Bewertung
                          </h3>
                        </div>
                        <div className={styles.cardBody}>
                          {Array.isArray(contract.legalAssessment) ? (
                            <ul className={styles.legalAssessmentList}>
                              {contract.legalAssessment.map((item, idx) => (
                                <li key={idx}>{item}</li>
                              ))}
                            </ul>
                          ) : (
                            <p style={{ margin: 0, lineHeight: 1.7, color: 'var(--cd-text-secondary)', whiteSpace: 'pre-wrap' }}>
                              {contract.legalAssessment}
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Vergleich & Analyse / Comparison */}
                    {contract.comparison && (
                      <div className={`${styles.card} ${styles.fadeIn} ${styles.stagger2}`}>
                        <div className={styles.cardHeader}>
                          <h3 className={styles.cardTitle}>
                            <span className={styles.cardIcon} style={{ background: '#fef3c7', color: '#b45309' }}>
                              <TrendingUp size={18} />
                            </span>
                            Vergleich & Analyse
                          </h3>
                        </div>
                        <div className={styles.cardBody}>
                          {Array.isArray(contract.comparison) ? (
                            <ul className={styles.comparisonList}>
                              {contract.comparison.map((item, idx) => (
                                <li key={idx}>{item}</li>
                              ))}
                            </ul>
                          ) : (
                            <p style={{ margin: 0, lineHeight: 1.7, color: 'var(--cd-text-secondary)', whiteSpace: 'pre-wrap' }}>
                              {contract.comparison}
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Empfehlungen / Vorschläge (Root-Level Suggestions) */}
                    {contract.suggestions && Array.isArray(contract.suggestions) && contract.suggestions.length > 0 && (
                      <div className={`${styles.card} ${styles.fadeIn} ${styles.stagger2}`}>
                        <div className={styles.cardHeader}>
                          <h3 className={styles.cardTitle}>
                            <span className={styles.cardIcon} style={{ background: '#dbeafe', color: '#2563eb' }}>
                              <Lightbulb size={18} />
                            </span>
                            Empfehlungen & Vorschläge
                          </h3>
                          <span className={styles.tabBadge} style={{ background: '#dbeafe', color: '#2563eb' }}>
                            {contract.suggestions.length}
                          </span>
                        </div>
                        <div className={styles.cardBody}>
                          <div className={styles.analysisList}>
                            {contract.suggestions.map((suggestion, idx) => {
                              const text = typeof suggestion === 'string' ? suggestion : '';
                              if (!text) return null;
                              return (
                                <div key={idx} className={`${styles.analysisItem} ${styles.neutral}`}>
                                  <div className={styles.analysisItemIcon} style={{ background: '#dbeafe', color: '#2563eb' }}>
                                    <Lightbulb size={16} />
                                  </div>
                                  <div className={styles.analysisItemContent}>
                                    <div className={styles.analysisItemText}>{text}</div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Ausführliches Rechtsgutachten */}
                    {contract.detailedLegalOpinion && (
                      <div className={`${styles.card} ${styles.fadeIn} ${styles.stagger2}`}>
                        <div className={styles.cardHeader}>
                          <h3 className={styles.cardTitle}>
                            <span className={styles.cardIcon} style={{ background: '#e0e7ff', color: '#4f46e5' }}>
                              <Shield size={18} />
                            </span>
                            Ausführliches Rechtsgutachten
                          </h3>
                          <span className={styles.tabBadge} style={{ background: '#fef3c7', color: '#b45309' }}>
                            Premium
                          </span>
                        </div>
                        <div className={styles.cardBody}>
                          <p style={{ margin: 0, lineHeight: 1.8, color: 'var(--cd-text-secondary)', whiteSpace: 'pre-wrap' }}>
                            {contract.detailedLegalOpinion}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Legal Pulse - nur anzeigen wenn echte Analyse-Daten vorhanden */}
                    {contract.legalPulse && !isLegalPulseGeneric && (
                      <div className={`${styles.card} ${styles.fadeIn}`}>
                        <div className={styles.cardHeader}>
                          <h3 className={styles.cardTitle}>
                            <span className={styles.cardIcon}><Shield size={18} /></span>
                            Legal Pulse Analyse
                          </h3>
                          <span className={`${styles.statusBadge} ${riskInfo.style === styles.riskLow ? styles.statusActive : riskInfo.style === styles.riskMedium ? styles.statusExpiring : styles.statusCancelled}`}>
                            {riskInfo.label}
                          </span>
                        </div>
                        <div className={styles.cardBody}>
                          {contract.legalPulse.summary && (
                            <p style={{ margin: '0 0 20px 0', lineHeight: 1.7, color: 'var(--cd-text-secondary)' }}>
                              {contract.legalPulse.summary}
                            </p>
                          )}

                          {contract.legalPulse.riskFactors && Array.isArray(contract.legalPulse.riskFactors) && contract.legalPulse.riskFactors.length > 0 && (
                            <div className={styles.analysisSection}>
                              <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'var(--cd-text-primary)' }}>
                                Identifizierte Risiken
                              </h4>
                              <div className={styles.analysisList}>
                                {contract.legalPulse.riskFactors.map((risk, idx) => {
                                  // Handle both string and object formats
                                  const riskText = typeof risk === 'string' ? risk : (risk as { title?: string; description?: string })?.title || (risk as { title?: string; description?: string })?.description || '';
                                  if (!riskText) return null;
                                  return (
                                    <div key={idx} className={`${styles.analysisItem} ${styles.negative}`}>
                                      <div className={styles.analysisItemIcon}>
                                        <AlertTriangle size={16} />
                                      </div>
                                      <div className={styles.analysisItemContent}>
                                        <div className={styles.analysisItemText}>{riskText}</div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {contract.legalPulse.recommendations && Array.isArray(contract.legalPulse.recommendations) && contract.legalPulse.recommendations.length > 0 && (
                            <div className={styles.analysisSection} style={{ marginTop: 20 }}>
                              <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'var(--cd-text-primary)' }}>
                                Empfehlungen
                              </h4>
                              <div className={styles.analysisList}>
                                {contract.legalPulse.recommendations.map((rec, idx) => {
                                  // Handle both string and object formats {title, description, priority, timeframe, effort}
                                  const recObj = typeof rec === 'string' ? { title: rec } : (rec as { title?: string; description?: string; priority?: string; timeframe?: string; effort?: string });
                                  const title = recObj?.title || recObj?.description || '';
                                  if (!title) return null;
                                  return (
                                    <div key={idx} className={`${styles.analysisItem} ${styles.positive}`}>
                                      <div className={styles.analysisItemIcon}>
                                        <CheckCircle size={16} />
                                      </div>
                                      <div className={styles.analysisItemContent}>
                                        <div className={styles.analysisItemTitle}>{title}</div>
                                        {recObj?.description && recObj.description !== title && (
                                          <div className={styles.analysisItemText}>{recObj.description}</div>
                                        )}
                                        {(recObj?.priority || recObj?.timeframe || recObj?.effort) && (
                                          <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                                            {recObj.priority && (
                                              <span style={{ fontSize: 11, padding: '2px 6px', borderRadius: 4, background: 'var(--cd-warning-light)', color: 'var(--cd-warning)' }}>
                                                {recObj.priority}
                                              </span>
                                            )}
                                            {recObj.timeframe && (
                                              <span style={{ fontSize: 11, padding: '2px 6px', borderRadius: 4, background: 'var(--cd-primary-light)', color: 'var(--cd-primary)' }}>
                                                {recObj.timeframe}
                                              </span>
                                            )}
                                            {recObj.effort && (
                                              <span style={{ fontSize: 11, padding: '2px 6px', borderRadius: 4, background: '#f1f5f9', color: '#64748b' }}>
                                                {recObj.effort}
                                              </span>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                        {contract.legalPulse.analysisDate && (
                          <div className={styles.cardFooter}>
                            <span style={{ fontSize: 12, color: 'var(--cd-text-tertiary)' }}>
                              Analyse vom {formatDate(contract.legalPulse.analysisDate)}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Positive Aspects */}
                    {contract.analysis?.positiveAspects && Array.isArray(contract.analysis.positiveAspects) && contract.analysis.positiveAspects.length > 0 && (
                      <div className={`${styles.card} ${styles.fadeIn} ${styles.stagger1}`}>
                        <div className={styles.cardHeader}>
                          <h3 className={styles.cardTitle}>
                            <span className={styles.cardIcon} style={{ background: 'var(--cd-success-light)', color: 'var(--cd-success)' }}>
                              <CheckCircle size={18} />
                            </span>
                            Positive Aspekte
                          </h3>
                          <span className={styles.tabBadge} style={{ background: 'var(--cd-success-light)', color: 'var(--cd-success)' }}>
                            {contract.analysis.positiveAspects.length}
                          </span>
                        </div>
                        <div className={styles.cardBody}>
                          <div className={styles.analysisList}>
                            {contract.analysis.positiveAspects.map((aspect, idx) => (
                              <div key={idx} className={`${styles.analysisItem} ${styles.positive}`}>
                                <div className={styles.analysisItemIcon}>
                                  <CheckCircle size={16} />
                                </div>
                                <div className={styles.analysisItemContent}>
                                  <div className={styles.analysisItemTitle}>{aspect.title}</div>
                                  <div className={styles.analysisItemText}>{aspect.description}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Concerning Aspects */}
                    {contract.analysis?.concerningAspects && Array.isArray(contract.analysis.concerningAspects) && contract.analysis.concerningAspects.length > 0 && (
                      <div className={`${styles.card} ${styles.fadeIn} ${styles.stagger2}`}>
                        <div className={styles.cardHeader}>
                          <h3 className={styles.cardTitle}>
                            <span className={styles.cardIcon} style={{ background: 'var(--cd-warning-light)', color: 'var(--cd-warning)' }}>
                              <AlertTriangle size={18} />
                            </span>
                            Bedenkliche Aspekte
                          </h3>
                          <span className={styles.tabBadge} style={{ background: 'var(--cd-warning-light)', color: 'var(--cd-warning)' }}>
                            {contract.analysis.concerningAspects.length}
                          </span>
                        </div>
                        <div className={styles.cardBody}>
                          <div className={styles.analysisList}>
                            {contract.analysis.concerningAspects.map((aspect, idx) => (
                              <div key={idx} className={`${styles.analysisItem} ${styles.warning}`}>
                                <div className={styles.analysisItemIcon}>
                                  <AlertTriangle size={16} />
                                </div>
                                <div className={styles.analysisItemContent}>
                                  <div className={styles.analysisItemTitle}>{aspect.title}</div>
                                  <div className={styles.analysisItemText}>{aspect.description}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Vertragsparteien */}
                    {contract.analysis?.parties && (contract.analysis.parties.provider || contract.analysis.parties.customer) && (
                      <div className={`${styles.card} ${styles.fadeIn} ${styles.stagger3}`}>
                        <div className={styles.cardHeader}>
                          <h3 className={styles.cardTitle}>
                            <span className={styles.cardIcon}>
                              <Users size={18} />
                            </span>
                            Vertragsparteien
                          </h3>
                        </div>
                        <div className={styles.cardBody}>
                          <div className={styles.metricsGrid} style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
                            {contract.analysis.parties.provider && (
                              <div className={styles.metricCard}>
                                <div className={styles.metricHeader}>
                                  <span className={styles.metricLabel}>Anbieter / Auftragnehmer</span>
                                </div>
                                <div className={styles.metricValue}>{contract.analysis.parties.provider}</div>
                              </div>
                            )}
                            {contract.analysis.parties.customer && (
                              <div className={styles.metricCard}>
                                <div className={styles.metricHeader}>
                                  <span className={styles.metricLabel}>Kunde / Auftraggeber</span>
                                </div>
                                <div className={styles.metricValue}>{contract.analysis.parties.customer}</div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Kernbedingungen */}
                    {contract.analysis?.keyTerms && (
                      contract.analysis.keyTerms.duration ||
                      contract.analysis.keyTerms.cancellation ||
                      contract.analysis.keyTerms.payment ||
                      contract.analysis.keyTerms.deliverables
                    ) && (
                      <div className={`${styles.card} ${styles.fadeIn} ${styles.stagger3}`}>
                        <div className={styles.cardHeader}>
                          <h3 className={styles.cardTitle}>
                            <span className={styles.cardIcon}>
                              <FileSearch size={18} />
                            </span>
                            Kernbedingungen
                          </h3>
                        </div>
                        <div className={styles.cardBody}>
                          <div className={styles.metricsGrid}>
                            {contract.analysis.keyTerms.duration && (
                              <div className={styles.metricCard}>
                                <div className={styles.metricHeader}>
                                  <span className={styles.metricLabel}>Laufzeit</span>
                                  <div className={styles.metricIconWrapper}><Clock size={16} /></div>
                                </div>
                                <div className={styles.metricValue}>{contract.analysis.keyTerms.duration}</div>
                              </div>
                            )}
                            {contract.analysis.keyTerms.cancellation && (
                              <div className={styles.metricCard}>
                                <div className={styles.metricHeader}>
                                  <span className={styles.metricLabel}>Kündigung</span>
                                  <div className={styles.metricIconWrapper}><AlertCircle size={16} /></div>
                                </div>
                                <div className={styles.metricValue}>{contract.analysis.keyTerms.cancellation}</div>
                              </div>
                            )}
                            {contract.analysis.keyTerms.payment && (
                              <div className={styles.metricCard}>
                                <div className={styles.metricHeader}>
                                  <span className={styles.metricLabel}>Zahlung</span>
                                  <div className={styles.metricIconWrapper}><CreditCard size={16} /></div>
                                </div>
                                <div className={styles.metricValue}>{contract.analysis.keyTerms.payment}</div>
                              </div>
                            )}
                            {contract.analysis.keyTerms.deliverables && (
                              <div className={styles.metricCard}>
                                <div className={styles.metricHeader}>
                                  <span className={styles.metricLabel}>Leistungen</span>
                                  <div className={styles.metricIconWrapper}><Package size={16} /></div>
                                </div>
                                <div className={styles.metricValue}>{contract.analysis.keyTerms.deliverables}</div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Wichtige Klauseln - Collapsible Accordion */}
                    {contract.analysis?.importantClauses && Array.isArray(contract.analysis.importantClauses) && contract.analysis.importantClauses.length > 0 && (
                      <div className={`${styles.card} ${styles.fadeIn} ${styles.stagger3}`}>
                        <div className={styles.cardHeader}>
                          <h3 className={styles.cardTitle}>
                            <span className={styles.cardIcon} style={{ background: 'var(--cd-primary-light)', color: 'var(--cd-primary)' }}>
                              <BookOpen size={18} />
                            </span>
                            Wichtige Klauseln
                          </h3>
                          <span className={styles.tabBadge}>
                            {contract.analysis.importantClauses.length}
                          </span>
                        </div>
                        <div className={styles.cardBody}>
                          <div className={styles.clausesList}>
                            {contract.analysis.importantClauses.map((clause, idx) => clause && (
                              <div key={idx} className={`${styles.clauseAccordion} ${expandedClauses.has(idx) ? styles.clauseExpanded : ''}`}>
                                <button
                                  className={styles.clauseAccordionHeader}
                                  onClick={() => toggleClause(idx)}
                                  aria-expanded={expandedClauses.has(idx)}
                                >
                                  <div className={styles.clauseAccordionTitle}>
                                    <span className={styles.clauseNumber}>{idx + 1}</span>
                                    <h4 className={styles.clauseTitle}>{clause.title || 'Klausel'}</h4>
                                  </div>
                                  <ChevronDown
                                    size={20}
                                    className={`${styles.clauseChevron} ${expandedClauses.has(idx) ? styles.clauseChevronOpen : ''}`}
                                  />
                                </button>
                                <AnimatePresence>
                                  {expandedClauses.has(idx) && (
                                    <motion.div
                                      initial={{ height: 0, opacity: 0 }}
                                      animate={{ height: 'auto', opacity: 1 }}
                                      exit={{ height: 0, opacity: 0 }}
                                      transition={{ duration: 0.2 }}
                                      className={styles.clauseAccordionContent}
                                    >
                                      {clause.content && (
                                        <div className={styles.clauseContent}>
                                          <strong>Inhalt:</strong> {clause.content}
                                        </div>
                                      )}
                                      {clause.explanation && (
                                        <div className={styles.clauseExplanation}>
                                          <strong>Erklärung:</strong> {clause.explanation}
                                        </div>
                                      )}
                                      {clause.action && (
                                        <div className={styles.clauseAction}>
                                          <Lightbulb size={14} style={{ marginRight: 6, flexShrink: 0 }} />
                                          <span><strong>Handlungsempfehlung:</strong> {clause.action}</span>
                                        </div>
                                      )}
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Empfehlungen */}
                    {contract.analysis?.recommendations && Array.isArray(contract.analysis.recommendations) && contract.analysis.recommendations.length > 0 && (
                      <div className={`${styles.card} ${styles.fadeIn} ${styles.stagger3}`}>
                        <div className={styles.cardHeader}>
                          <h3 className={styles.cardTitle}>
                            <span className={styles.cardIcon} style={{ background: '#dbeafe', color: '#2563eb' }}>
                              <Lightbulb size={18} />
                            </span>
                            Empfehlungen
                          </h3>
                          <span className={styles.tabBadge} style={{ background: '#dbeafe', color: '#2563eb' }}>
                            {contract.analysis.recommendations.length}
                          </span>
                        </div>
                        <div className={styles.cardBody}>
                          <div className={styles.analysisList}>
                            {contract.analysis.recommendations.map((rec, idx) => {
                              // Handle both string and object formats
                              const recText = typeof rec === 'string' ? rec : (rec as { title?: string; description?: string })?.title || (rec as { title?: string; description?: string })?.description || '';
                              if (!recText) return null;
                              return (
                                <div key={idx} className={`${styles.analysisItem} ${styles.neutral}`}>
                                  <div className={styles.analysisItemIcon} style={{ background: '#dbeafe', color: '#2563eb' }}>
                                    <Lightbulb size={16} />
                                  </div>
                                  <div className={styles.analysisItemContent}>
                                    <div className={styles.analysisItemText}>{recText}</div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Fehlende Informationen */}
                    {contract.analysis?.missingInformation && Array.isArray(contract.analysis.missingInformation) && contract.analysis.missingInformation.length > 0 && (
                      <div className={`${styles.card} ${styles.fadeIn} ${styles.stagger3}`}>
                        <div className={styles.cardHeader}>
                          <h3 className={styles.cardTitle}>
                            <span className={styles.cardIcon} style={{ background: '#fef3c7', color: '#d97706' }}>
                              <HelpCircle size={18} />
                            </span>
                            Fehlende Informationen
                          </h3>
                          <span className={styles.tabBadge} style={{ background: '#fef3c7', color: '#d97706' }}>
                            {contract.analysis.missingInformation.length}
                          </span>
                        </div>
                        <div className={styles.cardBody}>
                          <div className={styles.analysisList}>
                            {contract.analysis.missingInformation.map((info, idx) => {
                              // Handle both string and object formats
                              const infoText = typeof info === 'string' ? info : (info as { title?: string; description?: string })?.title || (info as { title?: string; description?: string })?.description || '';
                              if (!infoText) return null;
                              return (
                                <div key={idx} className={`${styles.analysisItem} ${styles.warning}`}>
                                  <div className={styles.analysisItemIcon} style={{ background: '#fef3c7', color: '#d97706' }}>
                                    <HelpCircle size={16} />
                                  </div>
                                  <div className={styles.analysisItemContent}>
                                    <div className={styles.analysisItemText}>{infoText}</div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Root-Level Risiken - nur anzeigen wenn echte nicht-leere Risiken vorhanden */}
                    {contract.risiken && Array.isArray(contract.risiken) && contract.risiken.filter(r => typeof r === 'string' && r.trim()).length > 0 && (
                      <div className={`${styles.card} ${styles.fadeIn} ${styles.stagger3}`}>
                        <div className={styles.cardHeader}>
                          <h3 className={styles.cardTitle}>
                            <span className={styles.cardIcon} style={{ background: 'var(--cd-danger-light)', color: 'var(--cd-danger)' }}>
                              <AlertTriangle size={18} />
                            </span>
                            Kritische Risiken
                          </h3>
                          <span className={styles.tabBadge} style={{ background: 'var(--cd-danger-light)', color: 'var(--cd-danger)' }}>
                            {contract.risiken.filter(r => typeof r === 'string' && r.trim()).length}
                          </span>
                        </div>
                        <div className={styles.cardBody}>
                          <div className={styles.analysisList}>
                            {contract.risiken.map((risk, idx) => {
                              const riskText = typeof risk === 'string' ? risk : '';
                              if (!riskText) return null;
                              return (
                                <div key={idx} className={`${styles.analysisItem} ${styles.negative}`}>
                                  <div className={styles.analysisItemIcon}>
                                    <AlertTriangle size={16} />
                                  </div>
                                  <div className={styles.analysisItemContent}>
                                    <div className={styles.analysisItemText}>{riskText}</div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Analyse-Zusammenfassung */}
                    {contract.analysis?.summary && (
                      <div className={`${styles.card} ${styles.fadeIn} ${styles.stagger3}`}>
                        <div className={styles.cardHeader}>
                          <h3 className={styles.cardTitle}>
                            <span className={styles.cardIcon}>
                              <FileSearch size={18} />
                            </span>
                            Zusammenfassung
                          </h3>
                        </div>
                        <div className={styles.cardBody}>
                          <p style={{ margin: 0, lineHeight: 1.7, color: 'var(--cd-text-secondary)' }}>
                            {contract.analysis.summary}
                          </p>
                        </div>
                        {contract.analysis.analyzedAt && (
                          <div className={styles.cardFooter}>
                            <span style={{ fontSize: 12, color: 'var(--cd-text-tertiary)' }}>
                              Analyse vom {formatDate(contract.analysis.analyzedAt)}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Empty State */}
                    {!hasAnalysis && !contract.legalPulse && (
                      <div className={styles.card}>
                        <div className={styles.emptyState}>
                          <div className={styles.emptyIcon}>
                            <TrendingUp size={32} />
                          </div>
                          <h4 className={styles.emptyTitle}>Keine Analyse vorhanden</h4>
                          <p className={styles.emptyText}>
                            Dieser Vertrag wurde noch nicht analysiert. Starte eine Analyse, um detaillierte Einblicke zu erhalten.
                          </p>
                          <button
                            className={`${styles.btn} ${styles.btnPrimary}`}
                            style={{ marginTop: 16 }}
                            onClick={handleAnalyze}
                          >
                            <Zap size={16} /> Jetzt analysieren
                          </button>
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* DOCUMENT TAB */}
                {activeTab === 'document' && (
                  <motion.div
                    key="document"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className={styles.documentViewer} style={{ width: '100%', maxWidth: '100%', overflow: 'hidden' }}>
                      {/* PDF Header with Controls */}
                      <div className={styles.documentHeader} style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: isMobile ? 8 : 12,
                        padding: isMobile ? '10px 12px' : '12px 16px',
                        width: '100%',
                        boxSizing: 'border-box'
                      }}>
                        {/* Top Row: File name and page info */}
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: isMobile ? 8 : 16,
                          width: '100%',
                          overflow: 'hidden'
                        }}>
                          <span style={{
                            fontSize: isMobile ? 12 : 14,
                            fontWeight: 500,
                            color: 'var(--cd-text-primary)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            flex: 1,
                            minWidth: 0,
                            overflow: 'hidden'
                          }}>
                            <FileText size={isMobile ? 14 : 16} style={{ flexShrink: 0 }} />
                            <span style={{
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}>
                              {isMobile ? (contract.name.length > 25 ? contract.name.slice(0, 25) + '...' : contract.name) : contract.name}
                            </span>
                          </span>
                          {numPages && (
                            <span style={{
                              fontSize: isMobile ? 11 : 13,
                              color: 'var(--cd-text-tertiary)',
                              whiteSpace: 'nowrap',
                              flexShrink: 0
                            }}>
                              {isMobile ? `${pageNumber}/${numPages}` : `Seite ${pageNumber} von ${numPages}`}
                            </span>
                          )}
                        </div>

                        {/* Action Buttons Row */}
                        <div className={styles.documentActions} style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: isMobile ? 4 : 8,
                          width: '100%'
                        }}>
                          {/* Zoom Controls */}
                          <button
                            className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSm}`}
                            onClick={handlePdfZoomOut}
                            disabled={pdfScale <= 0.5}
                            title="Verkleinern"
                            aria-label="PDF verkleinern"
                          >
                            -
                          </button>
                          <span style={{
                            fontSize: isMobile ? 11 : 12,
                            color: 'var(--cd-text-secondary)',
                            minWidth: isMobile ? 35 : 45,
                            textAlign: 'center',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            {Math.round(pdfScale * 100)}%
                          </span>
                          <button
                            className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSm}`}
                            onClick={handlePdfZoomIn}
                            disabled={pdfScale >= 2.5}
                            title="Vergrößern"
                            aria-label="PDF vergrößern"
                          >
                            +
                          </button>
                          {!isMobile && <div style={{ width: 1, height: 20, background: 'var(--cd-border)', margin: '0 4px' }} />}
                          {!isMobile && (
                            <button
                              className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSm}`}
                              onClick={handleCopyContent}
                              disabled={!contract.content}
                              title="Text kopieren"
                              aria-label="Vertragstext in Zwischenablage kopieren"
                            >
                              <Copy size={14} />
                            </button>
                          )}
                          {!isMobile && (
                            <button
                              className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSm}`}
                              onClick={() => setIsFullscreen(true)}
                              title="Vollbild"
                              aria-label="PDF im Vollbild anzeigen"
                            >
                              <Maximize2 size={14} />
                            </button>
                          )}
                          <button
                            className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSm}`}
                            onClick={handleOpenOriginalPDF}
                            title="In neuem Tab öffnen"
                            aria-label="Original-PDF in neuem Tab öffnen"
                          >
                            <ExternalLink size={isMobile ? 12 : 14} />
                          </button>
                          <button
                            className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSm}`}
                            onClick={handleExportPDF}
                            disabled={exporting}
                            aria-label="Vertrag als PDF exportieren"
                          >
                            <Download size={isMobile ? 12 : 14} /> {isMobile ? 'PDF' : (exporting ? 'Exportiere...' : 'PDF Export')}
                          </button>
                        </div>
                      </div>

                      {/* PDF Content */}
                      <div
                        className={styles.documentContent}
                        ref={documentRef}
                        style={{
                          background: '#525659',
                          minHeight: isMobile ? 400 : 600,
                          overflow: 'auto',
                          width: '100%',
                          maxWidth: '100%'
                        }}
                      >
                        {pdfLoading ? (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 60, color: 'white' }}>
                            <div className={styles.loadingSpinner} style={{ width: 40, height: 40, marginBottom: 16 }} />
                            <p>PDF wird geladen...</p>
                          </div>
                        ) : pdfUrl ? (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 0' }}>
                            <Document
                              file={pdfUrl}
                              onLoadSuccess={onDocumentLoadSuccess}
                              loading={
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 60, color: 'white' }}>
                                  <div className={styles.loadingSpinner} style={{ width: 40, height: 40, marginBottom: 16 }} />
                                  <p>PDF wird geladen...</p>
                                </div>
                              }
                              error={
                                <div style={{ textAlign: 'center', padding: 60, color: 'white' }}>
                                  <AlertCircle size={48} style={{ marginBottom: 16, opacity: 0.7 }} />
                                  <p>Fehler beim Laden der PDF</p>
                                  <button
                                    onClick={handleOpenOriginalPDF}
                                    className={`${styles.btn} ${styles.btnPrimary}`}
                                    style={{ marginTop: 16 }}
                                  >
                                    <ExternalLink size={16} /> In neuem Tab öffnen
                                  </button>
                                </div>
                              }
                            >
                              <Page
                                pageNumber={pageNumber}
                                scale={pdfScale}
                                renderTextLayer={false}
                                renderAnnotationLayer={false}
                                className={styles.pdfPage}
                              />
                            </Document>

                            {/* Page Navigation */}
                            {numPages && numPages > 1 && (
                              <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 16,
                                marginTop: 20,
                                padding: '12px 24px',
                                background: 'rgba(255,255,255,0.1)',
                                borderRadius: 8
                              }}>
                                <button
                                  onClick={handlePrevPage}
                                  disabled={pageNumber === 1}
                                  className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSm}`}
                                  style={{ color: 'white', borderColor: 'rgba(255,255,255,0.3)' }}
                                >
                                  ← Zurück
                                </button>
                                <span style={{ color: 'white', fontSize: 14 }}>
                                  Seite {pageNumber} / {numPages}
                                </span>
                                <button
                                  onClick={handleNextPage}
                                  disabled={pageNumber === numPages}
                                  className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSm}`}
                                  style={{ color: 'white', borderColor: 'rgba(255,255,255,0.3)' }}
                                >
                                  Weiter →
                                </button>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className={styles.emptyState} style={{ background: 'white', margin: 20, borderRadius: 12 }}>
                            <div className={styles.emptyIcon}>
                              <FileText size={32} />
                            </div>
                            <h4 className={styles.emptyTitle}>Keine PDF verfügbar</h4>
                            <p className={styles.emptyText}>
                              Für diesen Vertrag ist keine PDF-Datei hinterlegt.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Signature */}
                    {contract.signature && (
                      <div className={`${styles.card} ${styles.fadeIn}`} style={{ marginTop: 24 }}>
                        <div className={styles.cardHeader}>
                          <h3 className={styles.cardTitle}>
                            <span className={styles.cardIcon}><Edit3 size={18} /></span>
                            Digitale Unterschrift
                          </h3>
                        </div>
                        <div className={styles.cardBody}>
                          <img
                            src={contract.signature}
                            alt="Unterschrift"
                            style={{
                              maxWidth: 250,
                              border: '1px solid var(--cd-border)',
                              borderRadius: 8,
                              padding: 12,
                              background: 'white'
                            }}
                          />
                          <p style={{ margin: '12px 0 0', fontSize: 12, color: 'var(--cd-text-tertiary)' }}>
                            Unterschrieben am {formatDate(contract.createdAt)}
                          </p>
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* TIMELINE TAB */}
                {activeTab === 'timeline' && (
                  <motion.div
                    key="timeline"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className={styles.card}>
                      <div className={styles.cardHeader}>
                        <h3 className={styles.cardTitle}>
                          <span className={styles.cardIcon}><Calendar size={18} /></span>
                          Kalender-Events
                        </h3>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          {/* + Button: Business+ aktiv, Free Schloss */}
                          {canEditCalendarEvents ? (
                            <button
                              className={styles.addFieldButton}
                              onClick={() => {
                                resetEventForm();
                                setShowAddEventForm(true);
                              }}
                              title="Event hinzufügen"
                              disabled={showAddEventForm || editingEventId !== null}
                            >
                              <Plus size={16} />
                            </button>
                          ) : (
                            <button
                              className={styles.addFieldButton}
                              onClick={() => navigate('/pricing')}
                              title="Calendar-Events erstellen ist ein Business+ Feature — klicken zum Upgraden"
                              style={{ opacity: 0.7 }}
                            >
                              <Lock size={14} />
                            </button>
                          )}
                          <button className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSm}`} onClick={() => navigate('/calendar')}>
                            Zum Kalender <ChevronRight size={14} />
                          </button>
                        </div>
                      </div>
                      <div className={styles.cardBody}>
                        {/* ✅ Inline-Form: neues Event hinzufügen oder bestehendes bearbeiten */}
                        {(showAddEventForm || editingEventId !== null) && (
                          <div className={styles.metricCard} style={{ marginBottom: 16 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--cd-text-secondary)', marginBottom: 10 }}>
                              {editingEventId ? '✏️ Event bearbeiten' : '➕ Neues Event erstellen'}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                              <input
                                className={styles.metricEditInput}
                                value={eventFormTitle}
                                onChange={(e) => setEventFormTitle(e.target.value)}
                                placeholder="Titel (z.B. Quartalsmeeting)"
                                autoFocus
                              />
                              <input
                                type="date"
                                className={styles.metricEditInput}
                                value={eventFormDate}
                                onChange={(e) => setEventFormDate(e.target.value)}
                              />
                              <textarea
                                className={styles.metricEditInput}
                                value={eventFormDescription}
                                onChange={(e) => setEventFormDescription(e.target.value)}
                                placeholder="Beschreibung (optional)"
                                rows={3}
                                style={{ resize: 'vertical', minHeight: 60, fontFamily: 'inherit', fontWeight: 400 }}
                              />
                              <select
                                className={styles.metricEditInput}
                                value={eventFormSeverity}
                                onChange={(e) => setEventFormSeverity(e.target.value as 'info' | 'warning' | 'critical')}
                              >
                                <option value="info">ℹ️ Info</option>
                                <option value="warning">⚠️ Warnung</option>
                                <option value="critical">🚨 Kritisch</option>
                              </select>
                              <div className={styles.metricEditActions} style={{ marginTop: 4 }}>
                                <button
                                  className={styles.metricEditSave}
                                  onClick={editingEventId ? handleUpdateEvent : handleCreateEvent}
                                  disabled={!eventFormTitle.trim() || !eventFormDate || savingEvent}
                                  title={editingEventId ? 'Speichern' : 'Erstellen'}
                                >
                                  <Check size={14} />
                                </button>
                                <button
                                  className={styles.metricEditCancel}
                                  onClick={resetEventForm}
                                  title="Abbrechen"
                                  disabled={savingEvent}
                                >
                                  <X size={14} />
                                </button>
                                {editingEventId && (
                                  <button
                                    className={styles.metricEditCancel}
                                    onClick={() => handleDeleteEvent(editingEventId)}
                                    title="Event löschen"
                                    style={{ color: '#dc2626' }}
                                    disabled={savingEvent}
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* ✅ Liste der Events (mit Klick = Edit, sichtbarem Delete-Button) */}
                        {calendarEvents.length > 0 ? (
                          <div className={styles.timelineList}>
                            {calendarEvents.map((event) => (
                              <div
                                key={event.id}
                                className={`${styles.timelineItem} ${styles[event.severity]} ${canEditCalendarEvents && editingEventId !== event.id ? styles.metricCardEditable : ''}`}
                                onClick={() => {
                                  if (canEditCalendarEvents && editingEventId !== event.id) {
                                    startEditingEvent(event);
                                  }
                                }}
                                title={canEditCalendarEvents ? 'Klicken zum Bearbeiten' : undefined}
                                style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}
                              >
                                <div className={styles.timelineIcon}>
                                  {event.severity === 'critical' && <AlertTriangle size={16} style={{ color: 'var(--cd-danger)' }} />}
                                  {event.severity === 'warning' && <AlertCircle size={16} style={{ color: 'var(--cd-warning)' }} />}
                                  {event.severity === 'info' && <Calendar size={16} style={{ color: 'var(--cd-info)' }} />}
                                </div>
                                <div className={styles.timelineContent} style={{ flex: 1, minWidth: 0 }}>
                                  <div className={styles.timelineTitle}>
                                    {event.title}
                                    {canEditCalendarEvents && <Pencil size={11} style={{ marginLeft: 6, opacity: 0.4 }} />}
                                  </div>
                                  <div className={styles.timelineDate}>
                                    {formatDate(event.date)} • {getRelativeTime(event.date)}
                                    {event.description && (
                                      <div style={{ marginTop: 4, fontSize: 13, color: 'var(--cd-text-tertiary)' }}>
                                        {event.description}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                {/* Delete nur im Edit-Mode sichtbar (im Form unten rechts) */}
                              </div>
                            ))}
                          </div>
                        ) : !showAddEventForm && (
                          <div className={styles.emptyState}>
                            <div className={styles.emptyIcon}>
                              <Calendar size={32} />
                            </div>
                            <h4 className={styles.emptyTitle}>Keine Events</h4>
                            <p className={styles.emptyText}>
                              {canEditCalendarEvents
                                ? 'Für diesen Vertrag sind keine Kalender-Events hinterlegt. Klicke oben auf + um einen Termin zu erfassen.'
                                : 'Für diesen Vertrag sind keine Kalender-Events hinterlegt. Manuelle Termine sind ein Business+ Feature.'}
                            </p>
                            {!canEditCalendarEvents && (
                              <button
                                className={`${styles.btn} ${styles.btnPrimary}`}
                                style={{ marginTop: 16 }}
                                onClick={() => navigate('/pricing')}
                              >
                                <Lock size={14} style={{ marginRight: 6 }} /> Upgrade auf Business+
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* ✅ KI-Vorschläge — nur die importantDates, die noch NICHT im Kalender sind */}
                    {(() => {
                      // Filter: nur Termine zeigen, die noch nicht im Kalender vorhanden sind
                      const pendingImportantDates = (contract.importantDates || [])
                        .map((date, idx) => ({ date, idx }))
                        .filter(({ date }) => !isImportantDateInCalendar(date));

                      // Sektion komplett verstecken, wenn nichts mehr zu übernehmen ist
                      // (entweder importantDates komplett leer ODER alle bereits im Kalender)
                      if (pendingImportantDates.length === 0) {
                        return null;
                      }

                      return (
                        <div className={`${styles.card} ${styles.fadeIn}`} style={{ marginTop: 24 }}>
                          <div className={styles.cardHeader}>
                            <h3 className={styles.cardTitle}>
                              <span className={styles.cardIcon}><Info size={18} /></span>
                              KI-Vorschläge
                            </h3>
                          </div>
                          <div className={styles.cardBody}>
                            {/* Zuklappbare Info-Box */}
                            <button
                              onClick={() => setShowKiInfoText(!showKiInfoText)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                background: 'none',
                                border: 'none',
                                padding: '0 0 12px 0',
                                cursor: 'pointer',
                                fontSize: 13,
                                color: 'var(--cd-primary)',
                                fontWeight: 500,
                              }}
                            >
                              <HelpCircle size={14} />
                              <span>Warum sind diese Termine nicht im Kalender?</span>
                              {showKiInfoText ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            </button>
                            {showKiInfoText && (
                              <div style={{
                                margin: '0 0 16px 0',
                                padding: '12px 14px',
                                background: 'var(--cd-bg, #f9fafb)',
                                border: '1px solid var(--cd-border-light, var(--cd-border))',
                                borderRadius: 8,
                                fontSize: 13,
                                color: 'var(--cd-text-tertiary)',
                                lineHeight: 1.6
                              }}>
                                Die KI erkennt bei der Analyse automatisch wichtige Termine. Einige davon (z.B. Kündigungsfristen) werden <strong>direkt als Kalender-Events</strong> angelegt. Andere (z.B. Zahlungsfristen, Garantien) werden hier als <strong>Vorschläge</strong> angezeigt — du entscheidest, welche davon in deinen Kalender übernommen werden sollen.
                              </div>
                            )}
                            <div className={styles.timelineList}>
                              {pendingImportantDates.map(({ date, idx }) => {
                                const isConverting = convertingImportantDateIdx === idx;
                                return (
                                  <div key={idx} className={styles.timelineItem} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                                    <div className={styles.timelineIcon}>
                                      <Calendar size={16} style={{ color: 'var(--cd-primary)' }} />
                                    </div>
                                    <div className={styles.timelineContent} style={{ flex: 1, minWidth: 0 }}>
                                      <div className={styles.timelineTitle}>
                                        {date.label}
                                      </div>
                                      <div className={styles.timelineDate}>
                                        {formatDate(date.date)}
                                        {date.description && ` • ${date.description}`}
                                      </div>
                                    </div>
                                    {canEditCalendarEvents ? (
                                      <button
                                        className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSm}`}
                                        onClick={() => handleConvertImportantDate(date, idx)}
                                        disabled={isConverting}
                                        style={{ alignSelf: 'center', whiteSpace: 'nowrap', flexShrink: 0 }}
                                        title="Diesen Termin in den Kalender übernehmen"
                                      >
                                        <CalendarPlus size={14} style={{ marginRight: 4 }} />
                                        {isConverting ? '...' : 'In Kalender'}
                                      </button>
                                    ) : (
                                      <button
                                        className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSm}`}
                                        onClick={() => navigate('/pricing')}
                                        style={{ alignSelf: 'center', whiteSpace: 'nowrap', flexShrink: 0, opacity: 0.7 }}
                                        title="Business+ erforderlich"
                                      >
                                        <Lock size={12} style={{ marginRight: 4 }} />
                                        Upgrade
                                      </button>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* SIDEBAR */}
            <div className={styles.sidebar}>
              {/* Quick Actions */}
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <h3 className={styles.cardTitle}>Schnellaktionen</h3>
                </div>
                <div className={styles.cardBody}>
                  <div className={styles.quickActions}>
                    {canEdit() && (
                      <button className={styles.quickActionBtn} onClick={() => setShowEditModal(true)}>
                        <Edit3 size={18} /> Vertrag bearbeiten
                      </button>
                    )}
                    <button className={styles.quickActionBtn} onClick={() => navigate(`/legal-lens/${id}`)}>
                      <FileSearch size={18} /> Legal Lens öffnen
                    </button>
                    {(contract.filePath || contract.s3Key) && (
                      <button onClick={handleOpenOriginalPDF} className={styles.quickActionBtn}>
                        <ExternalLink size={18} /> Original PDF
                      </button>
                    )}
                    {contract.optimizedPdfS3Key && (
                      <button className={styles.quickActionBtn} onClick={handleDownloadOptimizedPDF}>
                        <Zap size={18} /> Optimiertes PDF
                      </button>
                    )}
                    <button className={styles.quickActionBtn} onClick={() => navigate('/calendar')}>
                      <Calendar size={18} /> Zum Kalender
                    </button>
                    <button
                      className={styles.quickActionBtn}
                      onClick={handleOpenInChat}
                      disabled={openingChat}
                    >
                      <MessageSquare size={18} /> {openingChat ? 'Wird geöffnet...' : 'Mit KI besprechen'}
                    </button>
                    {contract.status?.toLowerCase() !== 'gekündigt' && (
                      <button
                        className={styles.quickActionBtn}
                        onClick={() => navigate(`/cancel/${id}`)}
                        style={{ color: 'var(--cd-danger, #ef4444)' }}
                      >
                        <XCircle size={18} /> Vertrag kündigen
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Kündigungsinfo */}
              {contract.status?.toLowerCase() === 'gekündigt' && (
                <div className={styles.card}>
                  <div className={styles.cardHeader}>
                    <h3 className={styles.cardTitle} style={{ color: 'var(--cd-danger, #ef4444)' }}>
                      Vertrag gekündigt
                    </h3>
                  </div>
                  <div className={styles.cardBody}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                      {contract.cancellationDate && (
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--cd-text-secondary, #6b7280)' }}>Gekündigt am</span>
                          <span style={{ fontWeight: 600 }}>
                            {new Date(contract.cancellationDate).toLocaleDateString('de-DE')}
                          </span>
                        </div>
                      )}
                      {contract.cancellationId && (
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--cd-text-secondary, #6b7280)' }}>Referenz-ID</span>
                          <span style={{ fontWeight: 500, fontSize: '11px', fontFamily: 'monospace' }}>
                            {String(contract.cancellationId).slice(-8)}
                          </span>
                        </div>
                      )}
                      <button
                        className={styles.quickActionBtn}
                        onClick={() => navigate('/cancellations')}
                        style={{ marginTop: '4px' }}
                      >
                        <FileText size={16} /> Kündigungsarchiv
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Danger Zone */}
              {canDelete() && (
                <div className={styles.card}>
                  <div className={styles.cardHeader}>
                    <h3 className={styles.cardTitle} style={{ color: 'var(--cd-danger)' }}>
                      Gefahrenzone
                    </h3>
                  </div>
                  <div className={styles.cardBody}>
                    <button
                      className={`${styles.btn} ${styles.btnDanger} ${styles.btnBlock}`}
                      onClick={handleDelete}
                      disabled={deleting}
                    >
                      <Trash2 size={16} />
                      {deleting ? 'Lösche...' : 'Vertrag löschen'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Fullscreen PDF Modal */}
      <AnimatePresence>
        {isFullscreen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.95)',
              zIndex: 9999,
              display: 'flex',
              flexDirection: 'column'
            }}
            role="dialog"
            aria-modal="true"
            aria-label="PDF Vollbildansicht"
          >
            {/* Fullscreen Header */}
            <div style={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              justifyContent: 'space-between',
              alignItems: isMobile ? 'stretch' : 'center',
              padding: isMobile ? '10px 12px' : '12px 20px',
              gap: isMobile ? 10 : 0,
              borderBottom: '1px solid rgba(255,255,255,0.1)'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: isMobile ? 'space-between' : 'flex-start',
                gap: isMobile ? 8 : 16,
                width: isMobile ? '100%' : 'auto'
              }}>
                <h2 style={{
                  color: 'white',
                  margin: 0,
                  fontSize: isMobile ? 14 : 16,
                  fontWeight: 500,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: isMobile ? '60%' : 'none'
                }}>
                  <FileText size={isMobile ? 16 : 18} style={{ marginRight: 8, verticalAlign: 'middle' }} />
                  {contract.name}
                </h2>
                {numPages && (
                  <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: isMobile ? 12 : 14, whiteSpace: 'nowrap' }}>
                    {isMobile ? `${pageNumber}/${numPages}` : `Seite ${pageNumber} von ${numPages}`}
                  </span>
                )}
                {/* Close button on mobile - top right */}
                {isMobile && (
                  <button
                    onClick={() => setIsFullscreen(false)}
                    style={{
                      background: 'rgba(255,255,255,0.1)',
                      border: 'none',
                      borderRadius: 6,
                      padding: '8px',
                      color: 'white',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    aria-label="Vollbild beenden"
                  >
                    <Minimize2 size={18} />
                  </button>
                )}
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: isMobile ? 6 : 8,
                justifyContent: isMobile ? 'center' : 'flex-end',
                width: isMobile ? '100%' : 'auto'
              }}>
                {/* Zoom Controls */}
                <button
                  onClick={handlePdfZoomOut}
                  disabled={pdfScale <= 0.5}
                  style={{
                    background: 'rgba(255,255,255,0.1)',
                    border: 'none',
                    borderRadius: 6,
                    padding: isMobile ? '8px 10px' : '6px 12px',
                    color: 'white',
                    cursor: pdfScale <= 0.5 ? 'not-allowed' : 'pointer',
                    opacity: pdfScale <= 0.5 ? 0.5 : 1,
                    minWidth: isMobile ? 40 : 'auto',
                    minHeight: isMobile ? 40 : 'auto'
                  }}
                  aria-label="Verkleinern"
                >
                  −
                </button>
                <span style={{ color: 'white', fontSize: isMobile ? 12 : 13, minWidth: isMobile ? 40 : 50, textAlign: 'center' }}>
                  {Math.round(pdfScale * 100)}%
                </span>
                <button
                  onClick={handlePdfZoomIn}
                  disabled={pdfScale >= 2.5}
                  style={{
                    background: 'rgba(255,255,255,0.1)',
                    border: 'none',
                    borderRadius: 6,
                    padding: isMobile ? '8px 10px' : '6px 12px',
                    color: 'white',
                    cursor: pdfScale >= 2.5 ? 'not-allowed' : 'pointer',
                    opacity: pdfScale >= 2.5 ? 0.5 : 1,
                    minWidth: isMobile ? 40 : 'auto',
                    minHeight: isMobile ? 40 : 'auto'
                  }}
                  aria-label="Vergrößern"
                >
                  +
                </button>
                {/* Desktop close button */}
                {!isMobile && (
                  <>
                    <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.2)', margin: '0 8px' }} />
                    <button
                      onClick={() => setIsFullscreen(false)}
                      style={{
                        background: 'rgba(255,255,255,0.1)',
                        border: 'none',
                        borderRadius: 6,
                        padding: '8px 16px',
                        color: 'white',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8
                      }}
                      aria-label="Vollbild beenden"
                    >
                      <Minimize2 size={16} /> Beenden (ESC)
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* PDF Content */}
            <div
              style={{
                flex: 1,
                overflow: 'auto',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '20px 0',
                background: '#525659'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {pdfUrl ? (
                <>
                  <Document
                    file={pdfUrl}
                    onLoadSuccess={onDocumentLoadSuccess}
                    loading={
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 60, color: 'white' }}>
                        <div className={styles.loadingSpinner} style={{ width: 40, height: 40, marginBottom: 16 }} />
                        <p>PDF wird geladen...</p>
                      </div>
                    }
                    error={
                      <div style={{ textAlign: 'center', padding: 60, color: 'white' }}>
                        <AlertCircle size={48} style={{ marginBottom: 16, opacity: 0.7 }} />
                        <p>Fehler beim Laden der PDF</p>
                      </div>
                    }
                  >
                    <Page
                      pageNumber={pageNumber}
                      scale={pdfScale}
                      renderTextLayer={false}
                      renderAnnotationLayer={false}
                    />
                  </Document>

                  {/* Page Navigation */}
                  {numPages && numPages > 1 && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: isMobile ? 12 : 16,
                      marginTop: isMobile ? 12 : 20,
                      padding: isMobile ? '10px 16px' : '12px 24px',
                      background: 'rgba(0,0,0,0.5)',
                      borderRadius: 8
                    }}>
                      <button
                        onClick={handlePrevPage}
                        disabled={pageNumber === 1}
                        style={{
                          background: 'rgba(255,255,255,0.1)',
                          border: 'none',
                          borderRadius: 6,
                          padding: isMobile ? '10px 14px' : '8px 16px',
                          color: 'white',
                          cursor: pageNumber === 1 ? 'not-allowed' : 'pointer',
                          opacity: pageNumber === 1 ? 0.5 : 1,
                          minHeight: isMobile ? 44 : 'auto',
                          fontSize: isMobile ? 13 : 14
                        }}
                        aria-label="Vorherige Seite"
                      >
                        {isMobile ? '←' : '← Zurück'}
                      </button>
                      <span style={{ color: 'white', fontSize: isMobile ? 13 : 14 }}>
                        {pageNumber} / {numPages}
                      </span>
                      <button
                        onClick={handleNextPage}
                        disabled={pageNumber === numPages}
                        style={{
                          background: 'rgba(255,255,255,0.1)',
                          border: 'none',
                          borderRadius: 6,
                          padding: isMobile ? '10px 14px' : '8px 16px',
                          color: 'white',
                          cursor: pageNumber === numPages ? 'not-allowed' : 'pointer',
                          opacity: pageNumber === numPages ? 0.5 : 1,
                          minHeight: isMobile ? 44 : 'auto',
                          fontSize: isMobile ? 13 : 14
                        }}
                        aria-label="Nächste Seite"
                      >
                        {isMobile ? '→' : 'Weiter →'}
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  color: 'rgba(255,255,255,0.7)'
                }}>
                  <FileText size={48} style={{ marginBottom: 16, opacity: 0.5 }} />
                  <p>Keine PDF verfügbar</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit & Share Modals */}
      {contract && (
        <>
          <ContractEditModal
            contract={{
              ...contract,
              status: contract.status || 'Aktiv',
              createdAt: contract.createdAt || contract.uploadedAt || new Date().toISOString()
            }}
            show={showEditModal}
            onClose={() => setShowEditModal(false)}
            onUpdate={(updatedContract) => {
              setContract({
                ...contract,
                ...updatedContract
              });
              toast.success('Vertrag erfolgreich aktualisiert');
            }}
          />
          <ContractShareModal
            contract={{ _id: contract._id, name: contract.name }}
            show={showShareModal}
            onClose={() => setShowShareModal(false)}
          />
        </>
      )}
    </>
  );
}
