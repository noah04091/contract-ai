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
  MessageSquare
} from "lucide-react";
import styles from "../styles/ContractDetailsV2.module.css";
import ContractEditModal from "../components/ContractEditModal";
import { useAuth } from "../hooks/useAuth";

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

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
  _id: string;
  title: string;
  date: string;
  type: string;
  severity: 'info' | 'warning' | 'critical';
  isManual?: boolean;
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

  // Fetch Calendar Events
  useEffect(() => {
    const fetchCalendarEvents = async () => {
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
    };
    fetchCalendarEvents();
  }, [id]);

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

    const printContent = contract.contentHTML || contract.content?.replace(/\n/g, '<br/>') || '';
    const printWindow = window.open('', '_blank');

    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>${contract.name}</title>
          <style>
            @page { size: A4; margin: 20mm 15mm 25mm 20mm; }
            body {
              font-family: 'Segoe UI', Arial, sans-serif;
              font-size: 11pt;
              line-height: 1.6;
              color: #1a1a1a;
              max-width: 800px;
              margin: 0 auto;
              padding: 20px;
            }
            h1 { font-size: 18pt; text-align: center; margin-bottom: 30px; color: #1e40af; }
            h2 { font-size: 14pt; margin-top: 20px; color: #1e40af; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px; }
            .meta { background: #f8fafc; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
            .meta p { margin: 5px 0; font-size: 10pt; color: #64748b; }
            .signature { margin-top: 40px; padding-top: 20px; border-top: 2px solid #1e40af; }
            .footer { margin-top: 40px; text-align: center; font-size: 9pt; color: #94a3b8; }
          </style>
        </head>
        <body>
          <h1>${contract.name}</h1>
          <div class="meta">
            <p><strong>Status:</strong> ${contract.status || 'Unbekannt'}</p>
            <p><strong>Hochgeladen:</strong> ${contract.uploadedAt ? new Date(contract.uploadedAt).toLocaleDateString('de-DE') : 'Unbekannt'}</p>
            ${contract.laufzeit ? `<p><strong>Laufzeit:</strong> ${contract.laufzeit}</p>` : ''}
            ${contract.kuendigung ? `<p><strong>Kündigungsfrist:</strong> ${contract.kuendigung}</p>` : ''}
          </div>
          <div class="content">${printContent}</div>
          ${contract.signature ? `
            <div class="signature">
              <p><strong>Digitale Unterschrift:</strong></p>
              <img src="${contract.signature}" alt="Unterschrift" style="max-width: 200px;" />
            </div>
          ` : ''}
          <div class="footer">
            <p>Gedruckt am ${new Date().toLocaleDateString('de-DE')} | Contract AI</p>
          </div>
        </body>
        </html>
      `);
      printWindow.document.close();
      setTimeout(() => printWindow.print(), 300);
    } else {
      toast.error('Pop-up blockiert. Bitte erlauben Sie Pop-ups für diese Seite.');
    }
  }, [contract]);

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
      const res = await fetch(`/api/s3/download-url?key=${encodeURIComponent(contract.optimizedPdfS3Key)}`, {
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

  const handleShare = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({
          title: contract?.name || 'Vertrag',
          url: url
        });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("Link in Zwischenablage kopiert!");
      }
    } catch {
      // User cancelled share
    }
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

  const getRelativeTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const diff = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diff < 0) return `vor ${Math.abs(diff)} Tagen`;
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
                      </div>
                      <div className={styles.cardBody}>
                        <div className={styles.metricsGrid}>
                          <div className={styles.metricCard}>
                            <div className={styles.metricHeader}>
                              <span className={styles.metricLabel}>Laufzeit</span>
                              <div className={styles.metricIconWrapper}>
                                <Clock size={16} />
                              </div>
                            </div>
                            <div className={`${styles.metricValue} ${!contract.laufzeit ? styles.metricEmpty : ''}`}>
                              {contract.laufzeit || "Nicht angegeben"}
                            </div>
                          </div>

                          <div className={styles.metricCard}>
                            <div className={styles.metricHeader}>
                              <span className={styles.metricLabel}>Ablaufdatum</span>
                              <div className={styles.metricIconWrapper}>
                                <Calendar size={16} />
                              </div>
                            </div>
                            <div className={`${styles.metricValue} ${!contract.expiryDate ? styles.metricEmpty : ''}`}>
                              {contract.expiryDate ? formatDate(contract.expiryDate) : "Nicht angegeben"}
                            </div>
                            {contract.expiryDate && (
                              <div className={styles.metricSubtext}>{getRelativeTime(contract.expiryDate)}</div>
                            )}
                          </div>

                          <div className={styles.metricCard}>
                            <div className={styles.metricHeader}>
                              <span className={styles.metricLabel}>Kündigungsfrist</span>
                              <div className={styles.metricIconWrapper}>
                                <AlertCircle size={16} />
                              </div>
                            </div>
                            <div className={`${styles.metricValue} ${!contract.kuendigung ? styles.metricEmpty : ''}`}>
                              {contract.kuendigung || "Nicht angegeben"}
                            </div>
                          </div>

                          {/* NEU: Kosten */}
                          {contract.kosten !== undefined && contract.kosten !== null && (
                            <div className={styles.metricCard}>
                              <div className={styles.metricHeader}>
                                <span className={styles.metricLabel}>Kosten</span>
                                <div className={styles.metricIconWrapper}>
                                  <CreditCard size={16} />
                                </div>
                              </div>
                              <div className={styles.metricValue}>
                                {contract.kosten.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })}
                              </div>
                            </div>
                          )}

                          {/* NEU: Anbieter */}
                          {contract.anbieter && (
                            <div className={styles.metricCard}>
                              <div className={styles.metricHeader}>
                                <span className={styles.metricLabel}>Anbieter</span>
                                <div className={styles.metricIconWrapper}>
                                  <Users size={16} />
                                </div>
                              </div>
                              <div className={styles.metricValue}>{contract.anbieter}</div>
                            </div>
                          )}

                          {/* NEU: Vertragsnummer */}
                          {contract.vertragsnummer && (
                            <div className={styles.metricCard}>
                              <div className={styles.metricHeader}>
                                <span className={styles.metricLabel}>Vertragsnummer</span>
                                <div className={styles.metricIconWrapper}>
                                  <FileText size={16} />
                                </div>
                              </div>
                              <div className={styles.metricValue}>{contract.vertragsnummer}</div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

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
                        <button className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSm}`} onClick={() => navigate('/calendar')}>
                          Zum Kalender <ChevronRight size={14} />
                        </button>
                      </div>
                      <div className={styles.cardBody}>
                        {calendarEvents.length > 0 ? (
                          <div className={styles.timelineList}>
                            {calendarEvents.map((event) => (
                              <div key={event._id} className={`${styles.timelineItem} ${styles[event.severity]}`}>
                                <div className={styles.timelineIcon}>
                                  {event.severity === 'critical' && <AlertTriangle size={16} style={{ color: 'var(--cd-danger)' }} />}
                                  {event.severity === 'warning' && <AlertCircle size={16} style={{ color: 'var(--cd-warning)' }} />}
                                  {event.severity === 'info' && <Calendar size={16} style={{ color: 'var(--cd-info)' }} />}
                                </div>
                                <div className={styles.timelineContent}>
                                  <div className={styles.timelineTitle}>{event.title}</div>
                                  <div className={styles.timelineDate}>
                                    {formatDate(event.date)} • {getRelativeTime(event.date)}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className={styles.emptyState}>
                            <div className={styles.emptyIcon}>
                              <Calendar size={32} />
                            </div>
                            <h4 className={styles.emptyTitle}>Keine Events</h4>
                            <p className={styles.emptyText}>
                              Für diesen Vertrag sind keine Kalender-Events hinterlegt.
                            </p>
                            <button
                              className={`${styles.btn} ${styles.btnPrimary}`}
                              style={{ marginTop: 16 }}
                              onClick={() => navigate('/calendar')}
                            >
                              Event erstellen
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Important Dates */}
                    {contract.importantDates && contract.importantDates.length > 0 && (
                      <div className={`${styles.card} ${styles.fadeIn}`} style={{ marginTop: 24 }}>
                        <div className={styles.cardHeader}>
                          <h3 className={styles.cardTitle}>
                            <span className={styles.cardIcon}><Clock size={18} /></span>
                            Wichtige Termine (KI-extrahiert)
                          </h3>
                        </div>
                        <div className={styles.cardBody}>
                          <div className={styles.timelineList}>
                            {contract.importantDates.map((date, idx) => (
                              <div key={idx} className={styles.timelineItem}>
                                <div className={styles.timelineIcon}>
                                  <Calendar size={16} style={{ color: 'var(--cd-primary)' }} />
                                </div>
                                <div className={styles.timelineContent}>
                                  <div className={styles.timelineTitle}>{date.label}</div>
                                  <div className={styles.timelineDate}>
                                    {formatDate(date.date)}
                                    {date.description && ` • ${date.description}`}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
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
                  </div>
                </div>
              </div>

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

      {/* Edit Modal */}
      {contract && (
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
      )}
    </>
  );
}
