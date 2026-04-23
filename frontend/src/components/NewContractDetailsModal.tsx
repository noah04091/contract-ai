// 🎨 New Contract Details Modal - Professional contract viewer
import React, { useState, useEffect, useRef } from 'react';
import { X, FileText, BarChart3, Share2, Edit, Trash2, PenTool, Eye, Download, AlertCircle, CheckCircle, Clock, XCircle, ExternalLink, MoreHorizontal, Pencil, Check, Plus, RotateCcw, Mail } from 'lucide-react';
import styles from './ContractDetailModal.module.css'; // Reuse signature modal styles
import SmartContractInfo from './SmartContractInfo';
import ContractShareModal from './ContractShareModal';
import ContractEditModal from './ContractEditModal';
import SignatureModal from './SignatureModal';
import ImportantDatesSection from './ImportantDatesSection';
import { fixUtf8Display } from "../utils/textUtils";
import { apiCall } from "../utils/api";
import { useToast } from "../context/ToastContext";
import { createEditableFields, type EditableField } from "../utils/contractEditableFields";

// Signature-related interfaces
interface Signer {
  _id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  order: number;
  signedAt?: string;
  declinedAt?: string;
  declineReason?: string;
  ip?: string;
}

interface AuditEvent {
  action: string;
  timestamp: string;
  details?: {
    userId?: string;
    email?: string;
    ip?: string;
    reason?: string;
    signedCount?: number;
    totalSigners?: number;
    [key: string]: string | number | boolean | undefined;
  };
}

// Legal Pulse interfaces
interface LegalPulseRisk {
  title: string;
  description?: string;
  severity?: string;
  impact?: string;
  solution?: string;
  recommendation?: string;
}

interface LegalPulseRecommendation {
  title: string;
  description?: string;
  priority?: string;
}

interface ContractInfo {
  _id: string;
  name: string;
  status: string;
  uploadDate: string;
  s3Key: string;
}

interface EnvelopeDetails {
  _id: string;
  title: string;
  message?: string;
  status: string;
  signingMode: string;
  createdAt: string;
  sentAt?: string;
  completedAt?: string;
  expiresAt: string;
  s3Key: string;
  s3KeySealed?: string;
  pdfHashOriginal?: string;
  pdfHashFinal?: string;
  signers: Signer[];
  auditTrail: AuditEvent[];
  contractId: ContractInfo;
  stats: {
    signersTotal: number;
    signersSigned: number;
    signersDeclined: number;
    signersPending: number;
    progressPercentage: number;
  };
}

interface Contract {
  _id: string;
  name: string;
  kuendigung: string;
  laufzeit?: string;
  expiryDate?: string;
  status: string;
  reminder?: boolean;
  createdAt: string;
  uploadDate?: string;
  content?: string;
  contractHTML?: string;
  designVariant?: string;
  isGenerated?: boolean;
  notes?: string;
  fullText?: string;
  extractedText?: string;
  s3Key?: string;
  s3Bucket?: string;
  s3Location?: string;
  uploadType?: string;
  needsReupload?: boolean;
  isOptimized?: boolean;
  analyzed?: boolean;  // ✅ Flag ob Vertrag analysiert wurde
  analyzedAt?: string; // ✅ Zeitpunkt der Analyse
  sourceType?: string;
  optimizedPdfS3Key?: string;        // 🆕 S3-Key für optimiertes PDF
  optimizedPdfS3Location?: string;   // 🆕 S3-Location für optimiertes PDF
  optimizedPdfGeneratedAt?: string;  // 🆕 Zeitpunkt der PDF-Generierung
  optimizations?: Array<{
    category: string;
    summary: string;
    original: string;
    improved: string;
    severity?: string;
    reasoning?: string;
  }>;
  // ✅ Standard Analysis fields (direct on contract)
  contractScore?: number;
  summary?: string | string[]; // Can be array or string for backward compatibility
  legalAssessment?: string | string[];
  suggestions?: string | string[];
  comparison?: string | string[];
  detailedLegalOpinion?: string; // ✅ NEU: Ausführliches Rechtsgutachten
  // ✅ Strukturierte Analyse-Felder (aus Live-Analyse, Top-Level in DB persistiert)
  positiveAspects?: Array<{ title: string; description: string }>;
  criticalIssues?: Array<{ title: string; description: string; riskLevel?: 'high' | 'medium' | 'low' }>;
  recommendations?: Array<string | { title: string; description?: string; priority?: 'high' | 'medium' | 'low' }>;
  analysis?: {
    analysisId?: string;
    lastAnalyzed?: string;
  };
  legalPulse?: {
    riskScore: number | null;
    summary?: string;
    riskFactors?: string[];
    legalRisks?: string[]; // Legacy
    topRisks?: Array<LegalPulseRisk>; // New structure
    recommendations?: Array<string | LegalPulseRecommendation>; // Support both old (string[]) and new (object[]) format
    analysisDate?: string;
  };
  signatureStatus?: string;
  signatureEnvelopeId?: string;
  envelope?: {
    _id: string;
    signatureStatus: string;
    signersTotal?: number;
    signersSigned?: number;
    s3KeySealed?: string | null;
    completedAt?: string | null;
  };
  paymentMethod?: string;
  paymentStatus?: 'paid' | 'unpaid';
  paymentAmount?: number;
  paymentDate?: string;
  // 🔴 Kündigungs-Tracking
  cancellationId?: string;
  cancellationDate?: string;
  cancellationConfirmed?: boolean;
  cancellationConfirmedAt?: string;
  // 📅 KI-extrahierte Eckdaten & Termine
  gekuendigtZum?: string;
  documentCategory?: 'cancellation_confirmation' | 'invoice' | 'active_contract';
  contractType?: string;
  provider?: {
    displayName?: string;
    name?: string;
    category?: string;
    confidence?: number; // 🔒 Konfidenz der Provider-Erkennung (0-100)
  };
  providerConfidence?: number; // 🔒 Alternative: Konfidenz auf Contract-Ebene
  // 🔒 KONFIDENZ-WERTE für Datenintegrität (Backend speichert diese jetzt)
  startDateConfidence?: number;
  endDateConfidence?: number;
  autoRenewalConfidence?: number;
  cancellationPeriodConfidence?: number;
  contractDurationConfidence?: number;
  quickFacts?: Array<{
    label: string;
    value: string;
    rating?: 'good' | 'neutral' | 'bad';
  }>;
  importantDates?: Array<{
    type: string;
    date: string;
    label: string;
    description?: string;
    calculated?: boolean;
    source?: string;
  }>;
  startDate?: string;
  anbieter?: string;
  kosten?: number;
  vertragsnummer?: string;
  customFields?: Array<{
    label: string;
    value: string;
  }>;
}

interface NewContractDetailsModalProps {
  contract: Contract;
  onClose: () => void;
  openEditModalDirectly?: boolean;
  initialTab?: TabType;
  onEdit?: (contractId: string) => void;
  onDelete?: (contractId: string, contractName: string) => void;
}

type TabType = 'overview' | 'pdf' | 'analysis' | 'optimizations' | 'optimizedPdf' | 'signature';

/**
 * 🔍 Zentrale Helper-Funktion: Prüft ob Analyse-Daten vorhanden sind
 * Wird für Tab-Aktivierung und bedingte Anzeige verwendet.
 *
 * Prüft alle möglichen Analyse-Felder für maximale Kompatibilität:
 * - analyzed: Neues Flag (Backend setzt dies bei jeder Analyse)
 * - contractScore: Numerischer Score der Analyse
 * - summary: Zusammenfassung der Analyse
 * - legalAssessment: Rechtliche Bewertung
 * - legalPulse: Erweiterte Risikoanalyse (Business+ Feature)
 */
const hasAnalysisData = (contract: Contract): boolean => {
  return !!(
    contract.analyzed ||
    contract.contractScore ||
    contract.summary ||
    contract.legalAssessment ||
    contract.legalPulse
  );
};

// Dropdown-Optionen (gleich wie ContractEditModal)
// ✅ KUENDIGUNG_OPTIONS und LAUFZEIT_OPTIONS sind jetzt in der Shared-Utility:
// frontend/src/utils/contractEditableFields.ts

const NewContractDetailsModal: React.FC<NewContractDetailsModalProps> = ({
  contract: initialContract,
  onClose,
  openEditModalDirectly = false,
  initialTab,
  onEdit,
  onDelete
}) => {
  const [activeTab, setActiveTab] = useState<TabType>(initialTab || 'overview');
  const [contract, setContract] = useState<Contract>(initialContract);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [optimizedPdfUrl, setOptimizedPdfUrl] = useState<string | null>(null); // 🆕 Optimized PDF URL
  const [optimizedPdfLoading, setOptimizedPdfLoading] = useState(false); // 🆕 Optimized PDF loading
  const [contentExpanded, setContentExpanded] = useState(false);

  // 🆕 Legal Pulse Polling
  const [legalPulsePolling, setLegalPulsePolling] = useState(false);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // 🔐 User Subscription Check für Legal Pulse
  const [userPlan, setUserPlan] = useState<string>('free');
  const canAccessLegalPulse = ['business', 'enterprise'].includes(userPlan.toLowerCase());

  // Modals
  const [showShareModal, setShowShareModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(openEditModalDirectly);
  const [showSignatureModal, setShowSignatureModal] = useState(false);

  // Signature tab state
  const [envelope, setEnvelope] = useState<EnvelopeDetails | null>(null);
  const [envelopeLoading, setEnvelopeLoading] = useState(false);
  const [envelopeError, setEnvelopeError] = useState<string | null>(null);
  const [originalPdfUrl, setOriginalPdfUrl] = useState<string | null>(null);
  const [signedPdfUrl, setSignedPdfUrl] = useState<string | null>(null);

  // 🔔 Kalendererinnerungen für diesen Vertrag
  const [calendarEvents, setCalendarEvents] = useState<Array<{
    id: string;  // Backend transformiert _id zu id
    title: string;
    date: string;
    type: string;
    severity: 'info' | 'warning' | 'critical';
    isManual?: boolean;
  }>>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [actionsMenuOpen, setActionsMenuOpen] = useState(false);
  const actionsMenuRef = useRef<HTMLDivElement>(null);

  // Inline editing state
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [showAddFieldMenu, setShowAddFieldMenu] = useState(false);
  const addFieldMenuRef = useRef<HTMLDivElement>(null);
  const toast = useToast();

  // QuickFacts editing state
  const [editingQuickFact, setEditingQuickFact] = useState<number | null>(null);
  const [qfLabel, setQfLabel] = useState('');
  const [qfValue, setQfValue] = useState('');
  const [qfRating, setQfRating] = useState<'good' | 'neutral' | 'bad'>('neutral');
  const [addingQuickFact, setAddingQuickFact] = useState(false);

  // Custom fields editing state
  const [addingCustomField, setAddingCustomField] = useState(false);
  const [customFieldLabel, setCustomFieldLabel] = useState('');
  const [customFieldValue, setCustomFieldValue] = useState('');
  const [editingCustomField, setEditingCustomField] = useState<number | null>(null);

  // Close actions menu on click outside
  useEffect(() => {
    if (!actionsMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(e.target as Node)) {
        setActionsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [actionsMenuOpen]);

  // Close add-field menu on click outside
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

  // Update contract when prop changes
  useEffect(() => {
    setContract(initialContract);
  }, [initialContract]);

  // 🔔 Kalendererinnerungen für diesen Vertrag laden
  useEffect(() => {
    const fetchCalendarEvents = async () => {
      if (!contract._id) return;
      setLoadingEvents(true);
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`/api/calendar/events?contractId=${contract._id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.events) {
            setCalendarEvents(data.events);
          }
        } else {
          console.error('📅 Calendar Events API Error:', res.status, res.statusText);
        }
      } catch (err) {
        console.error('Error fetching calendar events:', err);
      } finally {
        setLoadingEvents(false);
      }
    };
    fetchCalendarEvents();
  }, [contract._id]);

  // 🔐 User Subscription Plan laden für Legal Pulse Zugriffsprüfung
  useEffect(() => {
    const fetchUserPlan = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` },
          credentials: 'include'
        });
        if (res.ok) {
          const data = await res.json();
          // API gibt { user: { subscriptionPlan: ... } } zurück
          const user = data.user || data;
          setUserPlan(user.subscriptionPlan || user.plan || 'free');
        }
      } catch (err) {
        console.error('Error fetching user plan:', err);
        setUserPlan('free'); // Default to free on error
      }
    };
    fetchUserPlan();
  }, []);

  // ✅ BUG FIX: Update showEditModal when openEditModalDirectly prop changes
  useEffect(() => {
    if (openEditModalDirectly) {
      setShowEditModal(true);
    }
  }, [openEditModalDirectly]);

  // ESC key - cancel inline editing first, then close modal
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (editingField || editingQuickFact !== null || addingQuickFact || showAddFieldMenu || addingCustomField || editingCustomField !== null) {
          setEditingField(null);
          setEditValue('');
          setEditingQuickFact(null);
          setAddingQuickFact(false);
          setShowAddFieldMenu(false);
          setAddingCustomField(false);
          setEditingCustomField(null);
        } else {
          onClose();
        }
      }
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onClose, editingField, editingQuickFact, addingQuickFact, showAddFieldMenu, addingCustomField, editingCustomField]);

  // Dateityp-Erkennung: PDF vs. Word
  const isDocx = !!(contract.s3Key?.toLowerCase().endsWith('.docx') || (!contract.s3Key && contract.name?.toLowerCase().endsWith('.docx')));

  // Load PDF URL when PDF tab is opened
  const hasPdfSource = !!(contract.s3Key || contract.content || contract.contractHTML || contract.isGenerated);
  useEffect(() => {
    if (activeTab === 'pdf' && hasPdfSource && !pdfUrl && !pdfLoading) {
      loadPdfUrl();
    }
  }, [activeTab, contract.s3Key, hasPdfSource]);

  // Load envelope details when signature tab is opened
  useEffect(() => {
    if (activeTab === 'signature' && (contract.envelope || contract.signatureEnvelopeId) && !envelope && !envelopeLoading) {
      loadEnvelope();
    }
  }, [activeTab, contract.envelope, contract.signatureEnvelopeId]);

  // 🆕 Load optimized PDF URL when optimizedPdf tab is opened
  useEffect(() => {
    if (activeTab === 'optimizedPdf' && contract.optimizedPdfS3Key && !optimizedPdfUrl && !optimizedPdfLoading) {
      loadOptimizedPdfUrl();
    }
  }, [activeTab, contract.optimizedPdfS3Key, optimizedPdfUrl, optimizedPdfLoading]);

  // 🆕 Poll for Legal Pulse data when analysis tab is active and Legal Pulse not yet loaded
  // 🔐 NUR für Premium/Business/Enterprise User - Free User bekommen kein Legal Pulse
  useEffect(() => {
    if (activeTab === 'analysis' && !contract.legalPulse && (contract.summary || contract.legalAssessment) && !legalPulsePolling && canAccessLegalPulse) {
      startLegalPulsePolling();
    }

    // Cleanup polling on unmount or tab change
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [activeTab, contract.legalPulse, legalPulsePolling, canAccessLegalPulse]);

  const startLegalPulsePolling = () => {
    setLegalPulsePolling(true);

    // Clear any existing interval
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    let pollCount = 0;
    const maxPolls = 40; // Max 2 minutes

    const pollLegalPulse = async () => {
      try {
        pollCount++;
        const response = await fetch(`/api/contracts/${contract._id}`, {
          credentials: 'include'
        });

        if (!response.ok) {
          console.error('[Modal] Failed to fetch contract:', response.status);
          return;
        }

        const contractData = await response.json();

        // Check if Legal Pulse data is available
        if (contractData.legalPulse) {
          setContract(prev => ({ ...prev, legalPulse: contractData.legalPulse }));
          setLegalPulsePolling(false);

          // Stop polling
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
        } else if (pollCount >= maxPolls) {
          setLegalPulsePolling(false);

          // Stop polling
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
        }
      } catch (error) {
        console.error('[Modal] Error polling Legal Pulse:', error);
      }
    };

    // Initial poll
    pollLegalPulse();

    // Set up interval
    pollingIntervalRef.current = setInterval(pollLegalPulse, 3000);
  };

  const loadPdfUrl = async () => {
    if (contract.needsReupload) return;

    setPdfLoading(true);
    try {
      const token = localStorage.getItem('token');

      if (contract.s3Key) {
        // Normal: PDF von S3 laden
        const response = await fetch(`/api/s3/view?contractId=${contract._id}&type=original`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        });

        const data = await response.json();
        if (data.fileUrl || data.url) {
          setPdfUrl(data.fileUrl || data.url);
        }
      } else if (contract.content || contract.contractHTML || contract.isGenerated) {
        // Fallback: PDF on-demand generieren via React-PDF (isGenerated als Fallback, da content nicht in der Liste geladen wird)
        const response = await fetch(`/api/contracts/${contract._id}/pdf-v2`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify({ design: contract.designVariant || 'executive' })
        });
        if (response.ok) {
          const blob = await response.blob();
          setPdfUrl(window.URL.createObjectURL(blob));
        }
      }
    } catch (error) {
      console.error('Error loading PDF:', error);
    } finally {
      setPdfLoading(false);
    }
  };

  // 🆕 Load optimized PDF URL
  const loadOptimizedPdfUrl = async () => {
    if (!contract.optimizedPdfS3Key) return;

    setOptimizedPdfLoading(true);
    try {
      const response = await fetch(`/api/s3/view?key=${contract.optimizedPdfS3Key}`, {
        credentials: "include"
      });

      const data = await response.json();
      if (data.url) {
        setOptimizedPdfUrl(data.url);
      }
    } catch (error) {
      console.error('Error loading optimized PDF:', error);
    } finally {
      setOptimizedPdfLoading(false);
    }
  };

  const loadEnvelope = async () => {
    const envelopeId = contract.envelope?._id || contract.signatureEnvelopeId;
    if (!envelopeId) return;

    setEnvelopeLoading(true);
    try {
      const token = localStorage.getItem('token');

      const response = await fetch(`/api/envelopes/${envelopeId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Fehler beim Laden der Signatur-Details');
      }

      const data = await response.json();
      setEnvelope(data.envelope);

      // Load PDF URLs
      if (data.envelope.contractId?.s3Key) {
        const pdfResponse = await fetch(`/api/s3/view?contractId=${data.envelope.contractId._id}&type=original`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        });
        const pdfData = await pdfResponse.json();
        if (pdfData.fileUrl || pdfData.url) {
          setOriginalPdfUrl(pdfData.fileUrl || pdfData.url);
        }
      }

      if (data.envelope.s3KeySealed) {
        const signedResponse = await fetch(`/api/s3/view?contractId=${data.envelope.contractId._id}&type=signed`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        });
        const signedData = await signedResponse.json();
        if (signedData.fileUrl || signedData.url) {
          setSignedPdfUrl(signedData.fileUrl || signedData.url);
        }
      }

    } catch (err) {
      console.error('❌ Error loading envelope:', err);
      setEnvelopeError(err instanceof Error ? err.message : 'Fehler beim Laden');
    } finally {
      setEnvelopeLoading(false);
    }
  };

  // Format date helper
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('de-DE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Format date with time (for signatures)
  const formatDateTime = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('de-DE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get status badge
  const renderStatusBadge = () => {
    const statusMap: Record<string, { className: string; icon: React.ReactNode; text: string }> = {
      aktiv: { className: styles.statusCompleted, icon: <CheckCircle size={16} />, text: 'Aktiv' },
      gekuendigt: { className: styles.statusDeclined, icon: <AlertCircle size={16} />, text: 'Gekündigt' },
      'gekündigt': { className: styles.statusDeclined, icon: <XCircle size={16} />, text: 'Gekündigt' },
      abgelaufen: { className: styles.statusExpired, icon: <Clock size={16} />, text: 'Abgelaufen' }
    };

    const status = statusMap[contract.status?.toLowerCase()] || statusMap.aktiv;

    return (
      <div className={`${styles.statusBadge} ${status.className}`}>
        {status.icon}
        <span>{status.text}</span>
      </div>
    );
  };

  // Action handlers
  const handleEdit = () => setShowEditModal(true);
  const handleShare = () => setShowShareModal(true);
  const handleDelete = () => {
    if (onDelete) {
      onDelete(contract._id, fixUtf8Display(contract.name));
      onClose();
    }
  };
  const handleSendToSignature = () => setShowSignatureModal(true);

  // Download content as TXT
  const handleDownloadContent = () => {
    const textContent = contract.extractedText || contract.fullText || contract.content || '';
    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${fixUtf8Display(contract.name)}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Inline editing handlers
  const handleInlineSave = async (fieldKey: string, value: string) => {
    setSaving(true);
    try {
      const updateData: Record<string, unknown> = {};
      if (fieldKey === 'kosten') {
        updateData[fieldKey] = value ? parseFloat(value) : null;
      } else {
        updateData[fieldKey] = value || null;
      }

      const response = await apiCall(`/contracts/${contract._id}`, {
        method: 'PUT',
        body: JSON.stringify(updateData),
      }) as Record<string, unknown>;
      if (response.success !== false) {
        setContract(prev => ({ ...prev, ...updateData } as Contract));
        toast.success('Gespeichert');
        if (onEdit) onEdit(contract._id);
      }
    } catch {
      toast.error('Fehler beim Speichern');
    } finally {
      setSaving(false);
      setEditingField(null);
    }
  };

  const startEditing = (key: string, currentValue: string) => {
    setEditingField(key);
    setEditValue(currentValue);
  };

  const cancelEditing = () => {
    setEditingField(null);
    setEditValue('');
  };

  // QuickFacts save handler
  const handleQuickFactsSave = async (updatedFacts: Array<{ label: string; value: string; rating?: 'good' | 'neutral' | 'bad' }>) => {
    setSaving(true);
    try {
      const response = await apiCall(`/contracts/${contract._id}`, {
        method: 'PUT',
        body: JSON.stringify({ quickFacts: updatedFacts }),
      }) as Record<string, unknown>;
      if (response.success !== false) {
        setContract(prev => ({ ...prev, quickFacts: updatedFacts } as Contract));
        toast.success('Gespeichert');
        if (onEdit) onEdit(contract._id);
      }
    } catch {
      toast.error('Fehler beim Speichern');
    } finally {
      setSaving(false);
      setEditingQuickFact(null);
      setAddingQuickFact(false);
    }
  };

  // Custom fields save handler
  const handleCustomFieldsSave = async (updatedFields: Array<{ label: string; value: string }>) => {
    setSaving(true);
    try {
      const response = await apiCall(`/contracts/${contract._id}`, {
        method: 'PUT',
        body: JSON.stringify({ customFields: updatedFields }),
      }) as Record<string, unknown>;
      if (response.success !== false) {
        setContract(prev => ({ ...prev, customFields: updatedFields } as Contract));
        toast.success('Gespeichert');
        if (onEdit) onEdit(contract._id);
      }
    } catch {
      toast.error('Fehler beim Speichern');
    } finally {
      setSaving(false);
      setAddingCustomField(false);
      setEditingCustomField(null);
    }
  };

  /**
   * Renders a field in read or edit mode depending on editingField state.
   */
  const renderInlineField = (
    key: string,
    label: string,
    displayValue: string,
    rawValue: string,
    type: 'text' | 'number' | 'date' | 'dropdown',
    options?: { value: string; label: string }[]
  ) => {
    const isEmpty = !rawValue && !displayValue;
    const isEditing = editingField === key;

    if (isEditing) {
      return (
        <div className={styles.detailItem}>
          <span className={styles.label}>{label}:</span>
          <div className={styles.inlineEditRow}>
            {type === 'dropdown' && options ? (
              <select
                className={styles.inlineSelect}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                autoFocus
              >
                <option value="">— Auswählen —</option>
                {options.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            ) : type === 'date' ? (
              <input
                type="date"
                className={styles.inlineDateInput}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleInlineSave(key, editValue);
                  if (e.key === 'Escape') cancelEditing();
                }}
              />
            ) : (
              <input
                type={type === 'number' ? 'number' : 'text'}
                className={styles.inlineInput}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                autoFocus
                step={type === 'number' ? '0.01' : undefined}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleInlineSave(key, editValue);
                  if (e.key === 'Escape') cancelEditing();
                }}
              />
            )}
            <button
              className={styles.inlineSaveBtn}
              onClick={() => handleInlineSave(key, editValue)}
              disabled={saving}
              title="Speichern"
            >
              <Check size={16} />
            </button>
            <button
              className={styles.inlineCancelBtn}
              onClick={cancelEditing}
              title="Abbrechen"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      );
    }

    // Read mode
    return (
      <div
        className={`${styles.detailItem} ${styles.editableField}`}
        onClick={() => {
          // For date fields, convert display date back to YYYY-MM-DD format
          if (type === 'date' && rawValue) {
            const d = new Date(rawValue);
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            startEditing(key, `${yyyy}-${mm}-${dd}`);
          } else {
            startEditing(key, rawValue || '');
          }
        }}
      >
        <span className={styles.label}>{label}:</span>
        <span className={isEmpty ? styles.notSetValue : styles.value}>
          {isEmpty ? 'Nicht angegeben' : displayValue}
          <Pencil size={14} className={styles.editPencil} />
        </span>
      </div>
    );
  };

  // Berechne Restlaufzeit
  const calculateRemainingTime = (endDate: string): string => {
    const end = new Date(endDate);
    const today = new Date();
    const diffTime = end.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'Abgelaufen';
    if (diffDays === 0) return 'Heute';
    if (diffDays === 1) return '1 Tag';
    if (diffDays < 30) return `${diffDays} Tage`;
    if (diffDays < 365) {
      const months = Math.ceil(diffDays / 30);
      return `${months} ${months === 1 ? 'Monat' : 'Monate'}`;
    }
    const years = Math.floor(diffDays / 365);
    const remainingMonths = Math.ceil((diffDays % 365) / 30);
    if (remainingMonths === 0) return `${years} ${years === 1 ? 'Jahr' : 'Jahre'}`;
    return `${years} ${years === 1 ? 'Jahr' : 'Jahre'}, ${remainingMonths} ${remainingMonths === 1 ? 'Monat' : 'Monate'}`;
  };

  // ✅ EDITABLE_FIELDS jetzt aus Shared-Utility — single source of truth für beide Komponenten
  const EDITABLE_FIELDS: EditableField[] = createEditableFields(contract, formatDate);

  // Render Overview Tab
  const renderOverviewTab = () => {
    // Felder ohne Wert → im + Menü anbieten
    const fieldsMissing = EDITABLE_FIELDS.filter(f => !f.hasValue() && editingField !== f.key);

    return (
    <div className={styles.tabContent}>
      <div className={styles.section}>
        <h3 style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>📋 Vertragsdetails</span>
          <div className={styles.addFieldWrapper} ref={addFieldMenuRef}>
            <button
              className={styles.quickFactAddBtn}
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
                      startEditing(field.key, '');
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
        </h3>
        <div className={styles.detailsGrid}>
          {/* Vertragsname — immer sichtbar, inline editable */}
          {renderInlineField('name', 'Vertragsname', fixUtf8Display(contract.name), contract.name, 'text')}

          {/* Status — read-only */}
          <div className={styles.detailItem}>
            <span className={styles.label}>Status:</span>
            <span className={styles.value}>{renderStatusBadge()}</span>
          </div>

          {/* Editierbare Felder — nur anzeigen wenn Wert vorhanden ODER gerade editiert */}
          {EDITABLE_FIELDS.map((field) => {
            const isBeingEdited = editingField === field.key;
            if (!field.hasValue() && !isBeingEdited) return null;
            return (
              <React.Fragment key={field.key}>
                {renderInlineField(field.key, field.label, field.displayValue(), field.rawValue(), field.type, field.options)}
              </React.Fragment>
            );
          })}

          {/* Restlaufzeit — read-only (berechneter Wert) */}
          {(contract.expiryDate || contract.gekuendigtZum) && (
            <div className={styles.detailItem}>
              <span className={styles.label}>Restlaufzeit:</span>
              <span className={styles.value} style={{
                color: calculateRemainingTime(contract.gekuendigtZum || contract.expiryDate || '') === 'Abgelaufen' ? '#dc2626' : '#059669',
                fontWeight: 500
              }}>
                {calculateRemainingTime(contract.gekuendigtZum || contract.expiryDate || '')}
              </span>
            </div>
          )}

          {/* Hochgeladen am — read-only (Systemfeld) */}
          <div className={styles.detailItem}>
            <span className={styles.label}>Hochgeladen am:</span>
            <span className={styles.value}>{formatDate(contract.uploadDate || contract.createdAt)}</span>
          </div>

          {/* Quelle — read-only (Systemfeld) */}
          {contract.isGenerated && (
            <div className={styles.detailItem}>
              <span className={styles.label}>Quelle:</span>
              <span className={styles.value}>✨ KI-generiert</span>
            </div>
          )}

          {/* Eigene/Custom Felder */}
          {(contract.customFields || []).map((cf, index) => {
            if (editingCustomField === index) {
              return (
                <div key={`cf-${index}`} className={styles.detailItem} style={{ gridColumn: '1 / -1' }}>
                  <div className={styles.quickFactEditRow}>
                    <input
                      className={styles.inlineInput}
                      value={customFieldLabel}
                      onChange={(e) => setCustomFieldLabel(e.target.value)}
                      placeholder="Bezeichnung"
                      style={{ flex: 1 }}
                    />
                    <input
                      className={styles.inlineInput}
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
                      className={styles.inlineSaveBtn}
                      onClick={() => {
                        if (customFieldLabel && customFieldValue) {
                          const updated = [...(contract.customFields || [])];
                          updated[index] = { label: customFieldLabel, value: customFieldValue };
                          handleCustomFieldsSave(updated);
                        }
                      }}
                      disabled={!customFieldLabel || !customFieldValue || saving}
                      title="Speichern"
                    >
                      <Check size={16} />
                    </button>
                    <button
                      className={styles.inlineCancelBtn}
                      onClick={() => setEditingCustomField(null)}
                      title="Abbrechen"
                    >
                      <X size={16} />
                    </button>
                    <button
                      className={styles.inlineCancelBtn}
                      onClick={() => {
                        const updated = (contract.customFields || []).filter((_, i) => i !== index);
                        handleCustomFieldsSave(updated);
                      }}
                      title="Löschen"
                      style={{ color: '#dc2626' }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={`cf-${index}`}
                className={`${styles.detailItem} ${styles.editableField}`}
                onClick={() => {
                  setEditingCustomField(index);
                  setCustomFieldLabel(cf.label);
                  setCustomFieldValue(cf.value);
                }}
              >
                <span className={styles.label}>{cf.label}:</span>
                <span className={styles.value}>
                  {cf.value}
                  <Pencil size={14} className={styles.editPencil} />
                </span>
              </div>
            );
          })}

          {/* Inline-Formular für neues eigenes Feld */}
          {addingCustomField && (
            <div className={styles.detailItem} style={{ gridColumn: '1 / -1' }}>
              <div className={styles.quickFactEditRow}>
                <input
                  className={styles.inlineInput}
                  value={customFieldLabel}
                  onChange={(e) => setCustomFieldLabel(e.target.value)}
                  placeholder="Bezeichnung (z.B. Kundennummer)"
                  autoFocus
                  style={{ flex: 1 }}
                />
                <input
                  className={styles.inlineInput}
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
                  className={styles.inlineSaveBtn}
                  onClick={() => {
                    if (customFieldLabel && customFieldValue) {
                      const updated = [...(contract.customFields || []), { label: customFieldLabel, value: customFieldValue }];
                      handleCustomFieldsSave(updated);
                    }
                  }}
                  disabled={!customFieldLabel || !customFieldValue || saving}
                  title="Hinzufügen"
                >
                  <Check size={16} />
                </button>
                <button
                  className={styles.inlineCancelBtn}
                  onClick={() => setAddingCustomField(false)}
                  title="Abbrechen"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 🔴/🟢 Kündigungsinfo-Banner — 3 States */}
      {(contract.status === 'gekündigt' || contract.cancellationId) && contract.cancellationConfirmed && (
        <div className={styles.section}>
          <div style={{
            padding: '16px 20px',
            background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)',
            border: '1px solid #86efac',
            borderRadius: '12px',
            display: 'flex', alignItems: 'center', gap: '12px'
          }}>
            <CheckCircle size={20} style={{ color: '#16a34a', flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, color: '#166534' }}>
                Kündigung erfolgreich bestätigt
                {contract.cancellationConfirmedAt && (
                  <span style={{ fontWeight: 400, marginLeft: '8px' }}>
                    am {new Date(contract.cancellationConfirmedAt).toLocaleDateString('de-DE')}
                  </span>
                )}
              </div>
              <div style={{ fontSize: '13px', color: '#15803d', marginTop: '4px' }}>
                Die Kündigungsbestätigung liegt vor.
              </div>
            </div>
            <button
              onClick={() => window.location.href = '/cancellations'}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                border: '1px solid #86efac',
                background: 'white',
                color: '#166534',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap' as const
              }}
            >
              Archiv →
            </button>
          </div>
        </div>
      )}
      {(contract.status === 'gekündigt' || contract.cancellationId) && !contract.cancellationConfirmed && (
        <div className={styles.section}>
          <div style={{
            padding: '16px 20px',
            background: 'linear-gradient(135deg, #fef2f2, #fee2e2)',
            border: '1px solid #fca5a5',
            borderRadius: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <XCircle size={20} style={{ color: '#dc2626', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, color: '#991b1b' }}>
                  Vertrag wurde gekündigt
                  {contract.cancellationDate && (
                    <span style={{ fontWeight: 400, marginLeft: '8px' }}>
                      am {new Date(contract.cancellationDate).toLocaleDateString('de-DE')}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '13px', color: '#b91c1c', marginTop: '4px' }}>
                  Bestätigung steht noch aus — Prüfen Sie Ihren Posteingang
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                onClick={async () => {
                  try {
                    setSaving(true);
                    const token = localStorage.getItem("token");
                    // Find the cancellation's confirmation event to pass eventId
                    const eventsRes = await fetch(`/api/calendar/events?contractId=${contract._id}`, {
                      headers: { Authorization: `Bearer ${token}` }
                    });
                    const eventsData = await eventsRes.json();
                    const confirmEvent = eventsData.events?.find((e: { type: string; status: string }) =>
                      e.type === 'CANCELLATION_CONFIRMATION_CHECK' && e.status === 'scheduled'
                    );
                    const res = await fetch("/api/cancellations/confirmation-response", {
                      method: "POST",
                      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
                      body: JSON.stringify({
                        cancellationId: contract.cancellationId,
                        eventId: confirmEvent?._id || confirmEvent?.id || 'manual',
                        confirmed: true
                      })
                    });
                    if (!res.ok) throw new Error(`HTTP ${res.status}`);
                    const data = await res.json();
                    if (data.success) {
                      setContract(prev => ({
                        ...prev,
                        cancellationConfirmed: true,
                        cancellationConfirmedAt: new Date().toISOString()
                      } as Contract));
                      toast.success('Kündigungsbestätigung hinterlegt!');
                      if (onEdit) onEdit(contract._id);
                    } else {
                      toast.error(data.error || 'Fehler bei der Bestätigung');
                    }
                  } catch (err) {
                    console.error("Confirmation error:", err);
                    toast.error('Fehler bei der Bestätigung');
                  } finally {
                    setSaving(false);
                  }
                }}
                disabled={saving}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '8px 14px',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                  color: 'white',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: saving ? 'not-allowed' : 'pointer',
                  opacity: saving ? 0.6 : 1,
                  transition: 'all 0.2s'
                }}
              >
                <CheckCircle size={14} />
                Bestätigung erhalten
              </button>
              <button
                onClick={() => window.location.href = '/calendar'}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '8px 14px',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                  color: 'white',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <Mail size={14} />
                Anbieter erinnern
              </button>
              <button
                onClick={async () => {
                  if (!window.confirm('Möchten Sie die Kündigung wirklich zurücknehmen und den Vertrag reaktivieren?')) return;
                  try {
                    setSaving(true);
                    const token = localStorage.getItem("token");
                    const res = await fetch(`/api/cancellations/${contract.cancellationId}/reactivate`, {
                      method: "POST",
                      headers: { Authorization: `Bearer ${token}` }
                    });
                    if (!res.ok) throw new Error(`HTTP ${res.status}`);
                    const data = await res.json();
                    if (data.success) {
                      setContract(prev => ({
                        ...prev,
                        status: 'aktiv',
                        cancellationId: undefined,
                        cancellationDate: undefined,
                        cancellationConfirmed: undefined,
                        cancellationConfirmedAt: undefined
                      } as Contract));
                      toast.success('Vertrag reaktiviert!');
                      if (onEdit) onEdit(contract._id);
                    } else {
                      toast.error(data.error || 'Fehler bei der Reaktivierung');
                    }
                  } catch (err) {
                    console.error("Reactivation error:", err);
                    toast.error('Fehler bei der Reaktivierung');
                  } finally {
                    setSaving(false);
                  }
                }}
                disabled={saving}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '8px 14px',
                  borderRadius: '8px',
                  border: '1px solid #d1d5db',
                  background: 'white',
                  color: '#374151',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: saving ? 'not-allowed' : 'pointer',
                  opacity: saving ? 0.6 : 1,
                  transition: 'all 0.2s'
                }}
              >
                <RotateCcw size={14} />
                Kündigung zurücknehmen
              </button>
              <button
                onClick={() => window.location.href = '/cancellations'}
                style={{
                  padding: '8px 14px',
                  borderRadius: '8px',
                  border: '1px solid #fca5a5',
                  background: 'white',
                  color: '#991b1b',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap' as const,
                  transition: 'all 0.2s'
                }}
              >
                Archiv →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 📅 Wichtige Termine - KI-extrahierte Datums */}
      {contract.importantDates && contract.importantDates.length > 0 && (
        <div className={styles.section}>
          <ImportantDatesSection
            importantDates={contract.importantDates}
            contractName={fixUtf8Display(contract.name)}
          />
        </div>
      )}

      {/* 🔔 Kalendererinnerungen für diesen Vertrag */}
      <div className={styles.section} style={{
        opacity: (contract.status === 'gekündigt' || contract.cancellationId) ? 0.5 : 1,
        pointerEvents: (contract.status === 'gekündigt' || contract.cancellationId) ? 'none' : 'auto'
      }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <span style={{ fontSize: '1.2rem' }}>🔔</span> Kalendererinnerungen
        </h3>
        {loadingEvents ? (
          <p style={{ color: '#666', fontStyle: 'italic' }}>Lade Erinnerungen...</p>
        ) : calendarEvents.length === 0 ? (
          <p style={{ color: '#888', fontSize: '0.9rem' }}>
            Keine Kalendererinnerungen für diesen Vertrag vorhanden.
            <br />
            <span style={{ fontSize: '0.85rem', color: '#aaa' }}>
              Erstelle im Kalender ein Ereignis und verknüpfe es mit diesem Vertrag.
            </span>
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {calendarEvents.map((event) => {
              const eventDate = new Date(event.date);
              eventDate.setHours(0, 0, 0, 0);
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const daysUntil = Math.round((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
              const isPast = daysUntil < 0;

              const severityColors = {
                critical: { bg: '#fee2e2', border: '#ef4444', text: '#b91c1c' },
                warning: { bg: '#fef3c7', border: '#f59e0b', text: '#b45309' },
                info: { bg: '#eff6ff', border: '#3B82F6', text: '#1d4ed8' }  // Firmenblau
              };
              const colors = severityColors[event.severity] || severityColors.info;

              return (
                <div
                  key={event.id}
                  style={{
                    padding: '0.75rem 1rem',
                    borderRadius: '8px',
                    backgroundColor: colors.bg,
                    borderLeft: `4px solid ${colors.border}`,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    opacity: isPast ? 0.6 : 1
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 500, color: colors.text }}>{event.title}</div>
                    <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.25rem' }}>
                      {eventDate.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                      {' • '}
                      {isPast ? `vor ${Math.abs(daysUntil)} Tagen` : daysUntil === 0 ? 'Heute' : daysUntil === 1 ? 'Morgen' : `in ${daysUntil} Tagen`}
                    </div>
                  </div>
                  <button
                    onClick={() => window.location.href = `/calendar?eventId=${event.id}`}
                    style={{
                      padding: '0.4rem 0.8rem',
                      fontSize: '0.8rem',
                      background: 'white',
                      border: `1px solid ${colors.border}`,
                      borderRadius: '6px',
                      color: colors.text,
                      cursor: 'pointer'
                    }}
                  >
                    Zum Kalender
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 📊 QuickFacts - Dynamische Eckdaten (immer sichtbar) */}
      <div className={styles.section}>
        <h3 style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>📊 Eckdaten auf einen Blick</span>
          <button
            className={styles.quickFactAddBtn}
            onClick={() => {
              setAddingQuickFact(true);
              setQfLabel('');
              setQfValue('');
              setQfRating('neutral');
            }}
            title="Eckdatum hinzufügen"
          >
            <Plus size={16} />
          </button>
        </h3>

        {(!contract.quickFacts || contract.quickFacts.length === 0) && !addingQuickFact ? (
          <div style={{ color: '#9ca3af', fontSize: '0.875rem', fontStyle: 'italic', margin: 0 }}>
            <span>Keine Eckdaten vorhanden. Klicke + um welche hinzuzufügen.</span>
            {!hasAnalysisData(contract) && (
              <span style={{ display: 'block', marginTop: '6px', fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'normal' }}>
                💡 Tipp: Eckdaten werden auch automatisch erkannt, wenn du den Vertrag analysierst.
              </span>
            )}
          </div>
        ) : (
          <div className={styles.detailsGrid}>
            {(contract.quickFacts || []).map((fact, index) => {
              if (editingQuickFact === index) {
                return (
                  <div key={index} className={styles.detailItem} style={{ gridColumn: '1 / -1' }}>
                    <div className={styles.quickFactEditRow}>
                      <input
                        className={styles.inlineInput}
                        value={qfLabel}
                        onChange={(e) => setQfLabel(e.target.value)}
                        placeholder="Label"
                        style={{ flex: 1 }}
                      />
                      <input
                        className={styles.inlineInput}
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
                        className={styles.inlineSelect}
                        value={qfRating}
                        onChange={(e) => setQfRating(e.target.value as 'good' | 'neutral' | 'bad')}
                        style={{ width: 'auto' }}
                      >
                        <option value="good">Gut</option>
                        <option value="neutral">Neutral</option>
                        <option value="bad">Schlecht</option>
                      </select>
                      <button
                        className={styles.inlineSaveBtn}
                        onClick={() => {
                          if (qfLabel && qfValue) {
                            const updated = [...(contract.quickFacts || [])];
                            updated[index] = { label: qfLabel, value: qfValue, rating: qfRating };
                            handleQuickFactsSave(updated);
                          }
                        }}
                        disabled={!qfLabel || !qfValue || saving}
                        title="Speichern"
                      >
                        <Check size={16} />
                      </button>
                      <button
                        className={styles.inlineCancelBtn}
                        onClick={() => setEditingQuickFact(null)}
                        title="Abbrechen"
                      >
                        <X size={16} />
                      </button>
                      <button
                        className={styles.inlineCancelBtn}
                        onClick={() => {
                          const updated = (contract.quickFacts || []).filter((_, i) => i !== index);
                          handleQuickFactsSave(updated);
                        }}
                        title="Löschen"
                        style={{ color: '#dc2626' }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={index}
                  className={`${styles.detailItem} ${styles.editableField}`}
                  onClick={() => {
                    setEditingQuickFact(index);
                    setQfLabel(fact.label);
                    setQfValue(fact.value);
                    setQfRating(fact.rating || 'neutral');
                  }}
                >
                  <span className={styles.label}>{fact.label}:</span>
                  <span className={styles.value} style={{
                    color: fact.rating === 'good' ? '#059669' : fact.rating === 'bad' ? '#dc2626' : '#6b7280',
                    fontWeight: fact.rating ? 500 : 400
                  }}>
                    {fact.value}
                    <Pencil size={14} className={styles.editPencil} />
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Inline form for adding a new QuickFact */}
        {addingQuickFact && (
          <div className={styles.quickFactEditRow} style={{ marginTop: '12px' }}>
            <input
              className={styles.inlineInput}
              value={qfLabel}
              onChange={(e) => setQfLabel(e.target.value)}
              placeholder="Label (z.B. Zahlungsintervall)"
              autoFocus
              style={{ flex: 1 }}
            />
            <input
              className={styles.inlineInput}
              value={qfValue}
              onChange={(e) => setQfValue(e.target.value)}
              placeholder="Wert (z.B. Monatlich)"
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
              className={styles.inlineSelect}
              value={qfRating}
              onChange={(e) => setQfRating(e.target.value as 'good' | 'neutral' | 'bad')}
              style={{ width: 'auto' }}
            >
              <option value="good">Gut</option>
              <option value="neutral">Neutral</option>
              <option value="bad">Schlecht</option>
            </select>
            <button
              className={styles.inlineSaveBtn}
              onClick={() => {
                if (qfLabel && qfValue) {
                  const updated = [...(contract.quickFacts || []), { label: qfLabel, value: qfValue, rating: qfRating }];
                  handleQuickFactsSave(updated);
                }
              }}
              disabled={!qfLabel || !qfValue || saving}
              title="Hinzufügen"
            >
              <Check size={16} />
            </button>
            <button
              className={styles.inlineCancelBtn}
              onClick={() => setAddingQuickFact(false)}
              title="Abbrechen"
            >
              <X size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Smart Contract Info (Payment/Cost Tracking) */}
      {(contract.paymentMethod || contract.paymentAmount || contract.paymentStatus) && (
        <div className={styles.section}>
          <SmartContractInfo contract={contract as Parameters<typeof SmartContractInfo>[0]['contract']} />
        </div>
      )}

      {/* Notes */}
      {contract.notes && (
        <div className={styles.section}>
          <h3>📝 Notizen</h3>
          <div className={styles.messageBox}>
            <p>{contract.notes}</p>
          </div>
        </div>
      )}

      {/* Content */}
      {(contract.extractedText || contract.fullText || contract.content) && (
        <div className={styles.section}>
          <div className={styles.contentSectionHeader}>
            <h3>📄 Vertragsinhalt</h3>
            <button
              className={styles.downloadButton}
              onClick={handleDownloadContent}
            >
              <Download size={16} />
              <span>Als TXT herunterladen</span>
            </button>
          </div>

          <div className={styles.messageBox} style={{ maxHeight: contentExpanded ? 'none' : '200px', overflow: 'hidden', position: 'relative' }}>
            <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>
              {contract.extractedText || contract.fullText || contract.content}
            </p>
            {!contentExpanded && (contract.extractedText || contract.fullText || contract.content || '').length > 500 && (
              <div style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: '60px',
                background: 'linear-gradient(transparent, white)',
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'center',
                paddingBottom: '8px'
              }}>
                <button
                  onClick={() => setContentExpanded(true)}
                  style={{
                    background: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    padding: '6px 16px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: 500
                  }}
                >
                  Mehr anzeigen
                </button>
              </div>
            )}
          </div>

          {contentExpanded && (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '12px' }}>
              <button
                onClick={() => setContentExpanded(false)}
                style={{
                  background: '#f3f4f6',
                  color: '#6b7280',
                  border: 'none',
                  padding: '6px 16px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: 500
                }}
              >
                Weniger anzeigen
              </button>
            </div>
          )}

          {/* Statistics */}
          <div className={styles.statsGrid}>
            <div className={styles.statItem}>
              <div className={styles.statLabel}>Zeichen</div>
              <div className={styles.statValue}>
                {(contract.extractedText || contract.fullText || contract.content || '').length.toLocaleString()}
              </div>
            </div>
            <div className={styles.statItem}>
              <div className={styles.statLabel}>Wörter</div>
              <div className={styles.statValue}>
                {(contract.extractedText || contract.fullText || contract.content || '').split(/\s+/).filter(w => w.length > 0).length.toLocaleString()}
              </div>
            </div>
            <div className={styles.statItem}>
              <div className={styles.statLabel}>Absätze</div>
              <div className={styles.statValue}>
                {(contract.extractedText || contract.fullText || contract.content || '').split(/\n\s*\n/).filter(p => p.trim().length > 0).length.toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
  };

  // Open PDF in new tab
  const handleOpenPdfInNewTab = () => {
    if (pdfUrl) {
      window.open(pdfUrl, '_blank');
    }
  };

  // Render PDF Tab
  const renderPdfTab = () => {
    if (contract.needsReupload) {
      return (
        <div className={styles.tabContent}>
          <div className={styles.emptyState}>
            <AlertCircle size={64} />
            <p>Dieser Vertrag wurde vor der Cloud-Integration hochgeladen</p>
            <span className={styles.hint}>Bitte laden Sie den Vertrag erneut hoch, um ihn anzuzeigen.</span>
          </div>
        </div>
      );
    }

    if (!contract.s3Key && !contract.content && !contract.contractHTML && !contract.isGenerated) {
      return (
        <div className={styles.tabContent}>
          <div className={styles.emptyState}>
            <FileText size={64} />
            <p>{isDocx ? 'Kein Dokument verfügbar' : 'Kein PDF verfügbar'}</p>
            <span className={styles.hint}>Für diesen Vertrag ist kein Dokument verfügbar.</span>
          </div>
        </div>
      );
    }

    if (pdfLoading) {
      return (
        <div className={styles.tabContent}>
          <div className={styles.loadingContainer}>
            <div className={styles.spinner}></div>
            <p>{isDocx ? 'Lade Dokument...' : 'Lade PDF...'}</p>
          </div>
        </div>
      );
    }

    if (!pdfUrl) {
      return (
        <div className={styles.tabContent}>
          <div className={styles.emptyState}>
            <AlertCircle size={64} />
            <p>{isDocx ? 'Fehler beim Laden des Dokuments' : 'Fehler beim Laden des PDFs'}</p>
            <span className={styles.hint}>
              Das Dokument konnte nicht geladen werden. Bitte versuchen Sie es später erneut.
            </span>
          </div>
        </div>
      );
    }

    // DOCX: Download-Bereich (Browser kann Word-Dateien nicht im iframe anzeigen)
    if (isDocx) {
      return (
        <div className={styles.tabContent}>
          <div className={styles.emptyState}>
            <FileText size={64} style={{ color: '#2b579a' }} />
            <p style={{ fontSize: '18px', fontWeight: 600 }}>Word-Dokument</p>
            <span className={styles.hint} style={{ maxWidth: '400px', lineHeight: '1.6' }}>
              Word-Dokumente können nicht direkt im Browser angezeigt werden.
              Laden Sie die Datei herunter, um sie in Microsoft Word oder Google Docs zu öffnen.
            </span>
            <a
              href={pdfUrl}
              download={contract.name || 'Vertrag.docx'}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                marginTop: '20px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 24px',
                background: '#2b579a',
                color: '#fff',
                borderRadius: '8px',
                textDecoration: 'none',
                fontSize: '15px',
                fontWeight: 500,
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#1e3f73')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#2b579a')}
            >
              <Download size={18} />
              Dokument herunterladen
            </a>
          </div>
        </div>
      );
    }

    return (
      <div className={styles.tabContent}>
        {/* PDF Preview - Mit FitH für bessere Übersicht */}
        <div className={styles.pdfViewerContainer}>
          <iframe
            src={`${pdfUrl}#view=FitH&toolbar=0&navpanes=0`}
            className={styles.pdfViewer}
            title="Contract PDF"
            style={{ border: '1px solid #e5e7eb', borderRadius: '8px' }}
          />
        </div>
      </div>
    );
  };

  // Download Analysis as PDF
  const handleDownloadAnalysisPDF = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/contracts/${contract._id}/analysis-report`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (!response.ok) {
        // Parse error message from backend
        const errorData = await response.json().catch(() => null);
        if (response.status === 404) {
          throw new Error(errorData?.message || 'Dieser Vertrag wurde noch nicht analysiert. Bitte führe zuerst eine Analyse durch.');
        }
        throw new Error(errorData?.message || 'Fehler beim Generieren des Analyse-Reports');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${fixUtf8Display(contract.name)}_Analyse.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading analysis PDF:', error);
      // Show the specific error message to the user
      const errorMessage = error instanceof Error ? error.message : 'Fehler beim Herunterladen des Analyse-Reports';
      alert(errorMessage);
    }
  };

  // Render Analysis Tab
  const renderAnalysisTab = () => {
    // ✅ Read standard analysis from contract directly
    const contractScore = contract.contractScore;
    const summary = contract.summary;
    const legalAssessment = contract.legalAssessment;
    const suggestions = contract.suggestions;
    const comparison = contract.comparison;

    // Check if ANY analysis exists
    if (!contractScore && !summary && !legalAssessment) {
      return (
        <div className={styles.tabContent}>
          <div className={styles.emptyState}>
            <BarChart3 size={64} />
            <p>Keine Analyse verfügbar</p>
            <span className={styles.hint}>Dieser Vertrag wurde noch nicht analysiert.</span>
          </div>
        </div>
      );
    }

    const score = contractScore;
    const hasScore = score !== null && score !== undefined;

    // ✅ Defensive Validation: Items ohne title/null herausfiltern, um Crashes & leere Renderings zu vermeiden
    const validPositives = (contract.positiveAspects || []).filter(a => a && a.title);
    const validCriticals = (contract.criticalIssues || []).filter(i => i && i.title);
    const validRecommendations = (contract.recommendations || []).filter(r => {
      if (typeof r === 'string') return r.length > 0;
      return !!(r && r.title);
    });
    // Wenn mindestens EINS der drei strukturierten Arrays Daten hat → "neue" Analyse
    // → alle 3 Sektionen werden angezeigt (leere mit Empty-State-Text)
    const hasAnyStructured = validPositives.length > 0 || validCriticals.length > 0 || validRecommendations.length > 0;

    return (
      <div className={styles.tabContent}>
        {/* Contract Score */}
        {hasScore && (
          <div className={styles.section}>
            <h3>📊 Contract Score</h3>
            <div className={styles.progressContainer}>
              <div className={styles.progressBar}>
                <div
                  className={styles.progressFill}
                  style={{ width: `${score}%` }}
                ></div>
              </div>
              <div className={styles.progressStats}>
                <span>{score!}/100</span>
                <span>{score! >= 70 ? '✅ Gut' : score! >= 40 ? '⚠️ Mittel' : '❌ Verbesserungsbedarf'}</span>
              </div>
            </div>
          </div>
        )}

        {/* Summary */}
        {summary && (
          <div className={styles.section}>
            <h3>📝 Zusammenfassung</h3>
            <div className={styles.messageBox}>
              {Array.isArray(summary) ? (
                <ul style={{ margin: 0, paddingLeft: '20px', listStyle: 'disc', color: '#1f2937' }}>
                  {summary.map((item, index) => (
                    <li key={index} style={{ marginBottom: '8px', lineHeight: '1.6', color: '#1f2937' }}>{item}</li>
                  ))}
                </ul>
              ) : (
                <p>{summary}</p>
              )}
            </div>
          </div>
        )}

        {/* Legal Assessment */}
        {legalAssessment && (
          <div className={styles.section}>
            <h3>⚖️ Rechtliche Bewertung</h3>
            <div className={styles.messageBox}>
              {Array.isArray(legalAssessment) ? (
                <ul style={{ margin: 0, paddingLeft: '20px', listStyle: 'disc', color: '#1f2937' }}>
                  {legalAssessment.map((item, index) => (
                    <li key={index} style={{ marginBottom: '8px', lineHeight: '1.6', color: '#1f2937' }}>{item}</li>
                  ))}
                </ul>
              ) : (
                <p>{legalAssessment}</p>
              )}
            </div>
          </div>
        )}

        {/* Comparison */}
        {comparison && (
          <div className={styles.section}>
            <h3>🔍 Vergleich & Analyse</h3>
            <div className={styles.messageBox}>
              {Array.isArray(comparison) ? (
                <ul style={{ margin: 0, paddingLeft: '20px', listStyle: 'disc', color: '#1f2937' }}>
                  {comparison.map((item, index) => (
                    <li key={index} style={{ marginBottom: '8px', lineHeight: '1.6', color: '#1f2937' }}>{item}</li>
                  ))}
                </ul>
              ) : (
                <p>{comparison}</p>
              )}
            </div>
          </div>
        )}

        {/* Suggestions */}
        {suggestions && (
          <div className={styles.section}>
            <h3>💡 Optimierungsvorschläge</h3>
            <div className={styles.messageBox}>
              {Array.isArray(suggestions) ? (
                <ul style={{ margin: 0, paddingLeft: '20px', listStyle: 'disc', color: '#1f2937' }}>
                  {suggestions.map((item, index) => (
                    <li key={index} style={{ marginBottom: '8px', lineHeight: '1.6', color: '#1f2937' }}>{item}</li>
                  ))}
                </ul>
              ) : (
                <p>{suggestions}</p>
              )}
            </div>
          </div>
        )}

        {/* ✅ NEU: Ausführliches Rechtsgutachten */}
        {contract.detailedLegalOpinion && (
          <div className={styles.legalOpinionSection}>
            <div className={styles.legalOpinionHeader}>
              <div className={styles.legalOpinionIcon}>⚖️</div>
              <h3 className={styles.legalOpinionTitle}>
                Ausführliches Rechtsgutachten
              </h3>
              <div className={styles.legalOpinionBadge}>
                ⭐ Premium
              </div>
            </div>
            <div className={styles.legalOpinionContent}>
              <div className={styles.legalOpinionText}>
                {contract.detailedLegalOpinion}
              </div>
            </div>
          </div>
        )}

        {/* ✅ Positive Aspekte (strukturiert) — wird nur gerendert, wenn die Analyse strukturierte Daten hat */}
        {hasAnyStructured && (
          <div className={styles.section}>
            <h3>✅ Positive Aspekte</h3>
            <div className={styles.messageBox}>
              {validPositives.length > 0 ? (
                <ul style={{ margin: 0, paddingLeft: 0, listStyle: 'none' }}>
                  {validPositives.map((aspect, idx) => (
                    <li key={idx} style={{ marginBottom: idx < validPositives.length - 1 ? '16px' : 0, paddingLeft: 0 }}>
                      <strong style={{ color: '#1f2937', display: 'block', marginBottom: '4px' }}>{aspect.title}</strong>
                      {aspect.description && (
                        <p style={{ margin: 0, color: '#4b5563', lineHeight: 1.6 }}>{aspect.description}</p>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p style={{ margin: 0, color: '#6b7280', fontStyle: 'italic' }}>
                  Keine besonders positiven Aspekte identifiziert.
                </p>
              )}
            </div>
          </div>
        )}

        {/* ⚠️ Kritische Punkte (strukturiert) */}
        {hasAnyStructured && (
          <div className={styles.section}>
            <h3>⚠️ Kritische Punkte</h3>
            <div className={styles.messageBox}>
              {validCriticals.length > 0 ? (
                <ul style={{ margin: 0, paddingLeft: 0, listStyle: 'none' }}>
                  {validCriticals.map((issue, idx) => {
                    const riskColor =
                      issue.riskLevel === 'high' ? { bg: '#fee2e2', text: '#991b1b', label: 'Hoch' } :
                      issue.riskLevel === 'medium' ? { bg: '#fef3c7', text: '#92400e', label: 'Mittel' } :
                      issue.riskLevel === 'low' ? { bg: '#d1fae5', text: '#065f46', label: 'Niedrig' } :
                      null;
                    return (
                      <li key={idx} style={{ marginBottom: idx < validCriticals.length - 1 ? '16px' : 0, paddingLeft: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                          <strong style={{ color: '#1f2937' }}>{issue.title}</strong>
                          {riskColor && (
                            <span style={{
                              background: riskColor.bg,
                              color: riskColor.text,
                              fontSize: '11px',
                              fontWeight: 600,
                              padding: '2px 8px',
                              borderRadius: '9999px',
                              textTransform: 'uppercase',
                              letterSpacing: '0.03em'
                            }}>
                              {riskColor.label}
                            </span>
                          )}
                        </div>
                        {issue.description && (
                          <p style={{ margin: 0, color: '#4b5563', lineHeight: 1.6 }}>{issue.description}</p>
                        )}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p style={{ margin: 0, color: '#6b7280', fontStyle: 'italic' }}>
                  Keine kritischen Punkte identifiziert.
                </p>
              )}
            </div>
          </div>
        )}

        {/* 💡 Konkrete Empfehlungen (strukturiert) */}
        {hasAnyStructured && (
          <div className={styles.section}>
            <h3>💡 Konkrete Empfehlungen</h3>
            <div className={styles.messageBox}>
              {validRecommendations.length > 0 ? (
                <ul style={{ margin: 0, paddingLeft: 0, listStyle: 'none' }}>
                  {validRecommendations.map((rec, idx) => {
                    const isObj = typeof rec === 'object' && rec !== null;
                    const title = isObj ? rec.title : rec;
                    const description = isObj ? rec.description : undefined;
                    const priority = isObj ? rec.priority : undefined;
                    const priorityColor =
                      priority === 'high' ? { bg: '#fee2e2', text: '#991b1b', label: 'Hoch' } :
                      priority === 'medium' ? { bg: '#fef3c7', text: '#92400e', label: 'Mittel' } :
                      priority === 'low' ? { bg: '#d1fae5', text: '#065f46', label: 'Niedrig' } :
                      null;
                    return (
                      <li key={idx} style={{ marginBottom: idx < validRecommendations.length - 1 ? '16px' : 0, paddingLeft: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                          <strong style={{ color: '#1f2937' }}>{title}</strong>
                          {priorityColor && (
                            <span style={{
                              background: priorityColor.bg,
                              color: priorityColor.text,
                              fontSize: '11px',
                              fontWeight: 600,
                              padding: '2px 8px',
                              borderRadius: '9999px',
                              textTransform: 'uppercase',
                              letterSpacing: '0.03em'
                            }}>
                              Prio: {priorityColor.label}
                            </span>
                          )}
                        </div>
                        {description && (
                          <p style={{ margin: 0, color: '#4b5563', lineHeight: 1.6 }}>{description}</p>
                        )}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p style={{ margin: 0, color: '#6b7280', fontStyle: 'italic' }}>
                  Keine konkreten Empfehlungen vorhanden.
                </p>
              )}
            </div>
          </div>
        )}

        {/* ℹ️ Fallback-Hinweis für alte Verträge ohne strukturierte Felder */}
        {!hasAnyStructured && (contractScore || summary || legalAssessment) && (
          <div style={{
            marginTop: '20px',
            padding: '12px 16px',
            background: '#f3f4f6',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            color: '#6b7280',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span style={{ fontSize: '16px' }}>ℹ️</span>
            <span>Diese Analyse enthält noch keine strukturierten Detail-Insights.</span>
          </div>
        )}
      </div>
    );
  };

  // 🆕 Render Optimizations Tab
  const renderOptimizationsTab = () => {
    const optimizations = contract.optimizations;

    if (!optimizations || optimizations.length === 0) {
      return (
        <div className={styles.tabContent}>
          <div className={styles.emptyState}>
            <CheckCircle size={64} />
            <p>Keine Optimierungen verfügbar</p>
            <span className={styles.hint}>Dieser Vertrag wurde nicht optimiert.</span>
          </div>
        </div>
      );
    }

    // Category badge colors
    const getCategoryColor = (category: string) => {
      const colors: Record<string, string> = {
        'RECHTLICHE LÜCKEN': '#dc2626',
        'UNKLARE FORMULIERUNGEN': '#d97706',
        'FEHLENDE KLAUSELN': '#ea580c',
        'RISIKO-MINIMIERUNG': '#7c3aed',
        'FORMALE FEHLER': '#0891b2',
      };
      return colors[category] || '#6b7280';
    };

    return (
      <div className={styles.tabContent}>
        <div className={styles.section}>
          <h3>✨ Vorgenommene Optimierungen</h3>
          <p className={styles.hint}>
            {optimizations.length} Optimierung{optimizations.length !== 1 ? 'en' : ''} wurden am Originalvertrag vorgenommen:
          </p>
        </div>

        <div className={styles.optimizationsList}>
          {optimizations.map((opt, index) => (
            <div key={index} className={styles.optimizationCard}>
              <div className={styles.optimizationHeader}>
                <div
                  className={styles.categoryBadge}
                  style={{ background: getCategoryColor(opt.category) }}
                >
                  {opt.category}
                </div>
                <span className={styles.optimizationNumber}>#{index + 1}</span>
              </div>

              <h4 className={styles.optimizationSummary}>{opt.summary}</h4>

              {opt.original && (
                <div className={styles.optimizationSection}>
                  <div className={styles.optimizationLabel}>
                    <XCircle size={16} color="#dc2626" />
                    <strong>Ursprüngliches Problem:</strong>
                  </div>
                  <div className={styles.optimizationOriginal}>
                    {opt.original}
                  </div>
                </div>
              )}

              {opt.improved && (
                <div className={styles.optimizationSection}>
                  <div className={styles.optimizationLabel}>
                    <CheckCircle size={16} color="#16a34a" />
                    <strong>Verbesserte Klausel:</strong>
                  </div>
                  <div className={styles.optimizationImproved}>
                    {opt.improved}
                  </div>
                </div>
              )}

              {opt.reasoning && (
                <div className={styles.optimizationSection}>
                  <div className={styles.optimizationLabel}>
                    <AlertCircle size={16} color="#7c3aed" />
                    <strong>Begründung:</strong>
                  </div>
                  <div className={styles.optimizationReasoning}>
                    {opt.reasoning}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // 🆕 Render Optimized PDF Tab
  const renderOptimizedPdfTab = () => {
    if (!contract.optimizedPdfS3Key) {
      return (
        <div className={styles.tabContent}>
          <div className={styles.emptyState}>
            <FileText size={64} />
            <p>Kein optimiertes PDF verfügbar</p>
            <span className={styles.hint}>Für diesen Vertrag wurde noch kein optimiertes PDF generiert.</span>
          </div>
        </div>
      );
    }

    if (optimizedPdfLoading) {
      return (
        <div className={styles.tabContent}>
          <div className={styles.loadingContainer}>
            <div className={styles.spinner}></div>
            <p>Lade optimiertes PDF...</p>
          </div>
        </div>
      );
    }

    if (!optimizedPdfUrl) {
      return (
        <div className={styles.tabContent}>
          <div className={styles.emptyState}>
            <AlertCircle size={64} />
            <p>PDF konnte nicht geladen werden</p>
            <span className={styles.hint}>Bitte versuchen Sie es später erneut.</span>
          </div>
        </div>
      );
    }

    return (
      <div className={styles.tabContent}>
        <div className={styles.pdfViewer}>
          <iframe
            src={`${optimizedPdfUrl}#view=FitH`}
            title="Optimierter Vertrag PDF"
            style={{
              width: '100%',
              height: '600px',
              border: 'none',
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}
          />
          <div style={{
            marginTop: '16px',
            padding: '12px',
            background: '#f9fafb',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            color: '#374151',
            fontSize: '14px',
            textAlign: 'center'
          }}>
            <FileText size={16} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle' }} />
            Optimierter Vertrag PDF
            {contract.optimizedPdfGeneratedAt && (
              <span style={{ marginLeft: '12px', opacity: 0.7 }}>
                • Erstellt am {new Date(contract.optimizedPdfGeneratedAt).toLocaleDateString('de-DE')}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Render Signature Tab - Clean scrollable sections (no sub-tabs)
  const renderSignatureTab = () => {
    if (envelopeLoading) {
      return (
        <div className={styles.tabContent}>
          <div className={styles.loadingContainer}>
            <div className={styles.spinner}></div>
            <p>Lade Signatur-Details...</p>
          </div>
        </div>
      );
    }

    if (envelopeError || !envelope) {
      return (
        <div className={styles.tabContent}>
          <div className={styles.emptyState}>
            <AlertCircle size={64} />
            <p>{envelopeError || 'Signatur-Details nicht gefunden'}</p>
          </div>
        </div>
      );
    }

    // Render signature status badge
    const renderSignatureStatusBadge = () => {
      const statusMap: Record<string, { icon: React.ReactNode; className: string; text: string }> = {
        COMPLETED: { icon: <CheckCircle size={16} />, className: styles.statusCompleted, text: 'Vollständig signiert' },
        SENT: { icon: <Clock size={16} />, className: styles.statusSent, text: 'Ausstehend' },
        AWAITING_SIGNER_1: { icon: <Clock size={16} />, className: styles.statusSent, text: 'Wartet auf Unterzeichner 1' },
        AWAITING_SIGNER_2: { icon: <Clock size={16} />, className: styles.statusSent, text: 'Wartet auf Unterzeichner 2' },
        DECLINED: { icon: <XCircle size={16} />, className: styles.statusDeclined, text: 'Abgelehnt' },
        DRAFT: { icon: <FileText size={16} />, className: styles.statusDraft, text: 'Entwurf' },
        EXPIRED: { icon: <AlertCircle size={16} />, className: styles.statusExpired, text: 'Abgelaufen' },
      };

      const status = statusMap[envelope.status] || statusMap.DRAFT;

      return (
        <div className={`${styles.statusBadge} ${status.className}`}>
          {status.icon}
          <span>{status.text}</span>
        </div>
      );
    };

    const eventIcons: Record<string, string> = {
      CREATED: '📝',
      SENT: '📤',
      VIEWED: '👀',
      SIGNED: '✍️',
      DECLINED: '❌',
      PDF_SEALED: '🔒',
      COMPLETED: '✅',
      EXPIRED: '⏰',
      VOIDED: '🚫'
    };

    return (
      <div className={styles.tabContent}>
        {/* Signatur-Details Section */}
        <div className={styles.section}>
          <h3>📋 Signatur-Details</h3>
          <div className={styles.detailsGrid}>
            <div className={styles.detailItem}>
              <span className={styles.label}>Titel:</span>
              <span className={styles.valueTruncate} title={envelope.title}>{envelope.title}</span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.label}>Status:</span>
              <span className={styles.value}>{renderSignatureStatusBadge()}</span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.label}>Signaturmodus:</span>
              <span className={styles.value}>
                {envelope.signingMode === 'SEQUENTIAL' ? '📝 Sequenziell' :
                 envelope.signingMode === 'PARALLEL' ? '🔄 Parallel' : '✍️ Einzeln'}
              </span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.label}>Erstellt am:</span>
              <span className={styles.value}>{formatDateTime(envelope.createdAt)}</span>
            </div>
            {envelope.sentAt && (
              <div className={styles.detailItem}>
                <span className={styles.label}>Versendet am:</span>
                <span className={styles.value}>{formatDateTime(envelope.sentAt)}</span>
              </div>
            )}
            {envelope.completedAt && (
              <div className={styles.detailItem}>
                <span className={styles.label}>Abgeschlossen am:</span>
                <span className={styles.value}>{formatDateTime(envelope.completedAt)}</span>
              </div>
            )}
            <div className={styles.detailItem}>
              <span className={styles.label}>Gültig bis:</span>
              <span className={styles.value}>{formatDateTime(envelope.expiresAt)}</span>
            </div>
          </div>

          {envelope.message && (
            <div className={styles.messageBox} style={{ marginTop: '1rem' }}>
              <strong>Nachricht an Unterzeichner:</strong>
              <p>{envelope.message}</p>
            </div>
          )}
        </div>

        {/* Fortschritt Section */}
        <div className={styles.section}>
          <h3>📊 Signatur-Fortschritt</h3>
          <div className={styles.progressContainer}>
            <div className={styles.progressBar}>
              <div
                className={styles.progressFill}
                style={{ width: `${envelope.stats.progressPercentage}%` }}
              ></div>
            </div>
            <div className={styles.progressStats}>
              <span>✅ {envelope.stats.signersSigned} von {envelope.stats.signersTotal} signiert</span>
              <span>{envelope.stats.progressPercentage}%</span>
            </div>
          </div>
        </div>

        {/* Unterzeichner Section */}
        <div className={styles.section}>
          <h3>👥 Unterzeichner ({envelope.signers.length})</h3>
          <div className={styles.signersGrid}>
            {envelope.signers.map((signer) => (
              <div key={signer._id} className={styles.signerCard}>
                <div className={styles.signerHeader}>
                  <div className={styles.signerInfo}>
                    <strong>{signer.name}</strong>
                    <span className={styles.signerEmail}>{signer.email}</span>
                  </div>
                  <div className={`${styles.signerStatus} ${styles[`status${signer.status}`]}`}>
                    {signer.status === 'SIGNED' && <CheckCircle size={16} />}
                    {signer.status === 'DECLINED' && <XCircle size={16} />}
                    {signer.status === 'PENDING' && <Clock size={16} />}
                    <span>{signer.status === 'SIGNED' ? 'Signiert' : signer.status === 'DECLINED' ? 'Abgelehnt' : 'Ausstehend'}</span>
                  </div>
                </div>
                <div className={styles.signerDetails}>
                  <span className={styles.signerRole}>{signer.role === 'sender' ? '📤 Absender' : '📥 Empfänger'}</span>
                  {envelope.signingMode === 'SEQUENTIAL' && (
                    <span className={styles.signerOrder}>Reihenfolge: {signer.order}</span>
                  )}
                </div>
                {signer.signedAt && (
                  <div className={styles.signerTimestamp}>
                    ✅ Signiert am: {formatDateTime(signer.signedAt)}
                  </div>
                )}
                {signer.declinedAt && (
                  <div className={styles.signerTimestamp}>
                    ❌ Abgelehnt am: {formatDateTime(signer.declinedAt)}
                    {signer.declineReason && <p className={styles.declineReason}>Grund: {signer.declineReason}</p>}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* PDF-Dokumente Section */}
        <div className={styles.section}>
          <h3>📄 PDF-Dokumente</h3>

          {/* Original PDF */}
          <div style={{ marginBottom: '2rem' }}>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.75rem', color: '#4b5563' }}>
              📄 Original PDF
            </h4>
            {originalPdfUrl ? (
              <div>
                <div className={styles.pdfViewerContainer}>
                  <iframe
                    src={originalPdfUrl}
                    className={styles.pdfViewer}
                    title="Original PDF"
                  />
                </div>
                <div className={styles.pdfActions} style={{ marginTop: '0.75rem' }}>
                  <a href={originalPdfUrl} download className={styles.downloadButton}>
                    <Download size={16} />
                    Original PDF herunterladen
                  </a>
                </div>
              </div>
            ) : (
              <div className={styles.messageBox} style={{ textAlign: 'center', padding: '2rem', background: '#f9fafb' }}>
                <FileText size={32} style={{ margin: '0 auto 0.5rem', opacity: 0.5 }} />
                <p style={{ margin: 0, color: '#6b7280' }}>Original PDF nicht verfügbar</p>
              </div>
            )}
          </div>

          {/* Signiertes PDF */}
          <div>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.75rem', color: '#4b5563' }}>
              ✍️ Signiertes PDF
            </h4>
            {signedPdfUrl ? (
              <div>
                <div className={styles.pdfViewerContainer}>
                  <iframe
                    src={signedPdfUrl}
                    className={styles.pdfViewer}
                    title="Signiertes PDF"
                  />
                </div>
                <div className={styles.pdfActions} style={{ marginTop: '0.75rem' }}>
                  <a href={signedPdfUrl} download className={styles.downloadButton}>
                    <Download size={16} />
                    Signiertes PDF herunterladen
                  </a>
                </div>
              </div>
            ) : (
              <div className={styles.messageBox} style={{ textAlign: 'center', padding: '2rem', background: '#f9fafb' }}>
                <CheckCircle size={32} style={{ margin: '0 auto 0.5rem', opacity: 0.5 }} />
                <p style={{ margin: 0, color: '#6b7280' }}>
                  {envelope.status !== 'COMPLETED'
                    ? 'Das signierte PDF wird erstellt, sobald alle Parteien signiert haben.'
                    : 'Signiertes PDF nicht verfügbar'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Historie Section */}
        <div className={styles.section}>
          <h3>📅 Signatur-Historie</h3>
          <div className={styles.timeline}>
            {envelope.auditTrail && envelope.auditTrail.length > 0 ? (
              envelope.auditTrail.map((event, index) => (
                <div key={index} className={styles.timelineItem}>
                  <div className={styles.timelineIcon}>
                    {eventIcons[event.action] || '📌'}
                  </div>
                  <div className={styles.timelineContent}>
                    <div className={styles.timelineHeader}>
                      <strong>{event.action.replace(/_/g, ' ')}</strong>
                      <span className={styles.timelineTimestamp}>{formatDateTime(event.timestamp)}</span>
                    </div>
                    {event.details && (
                      <div className={styles.timelineDetails}>
                        {event.details.email && <p>👤 {event.details.email}</p>}
                        {event.details.ip && <p>🌐 IP: {event.details.ip}</p>}
                        {event.details.reason && <p>💬 {event.details.reason}</p>}
                        {event.details.signedCount !== undefined && (
                          <p>📊 {event.details.signedCount}/{event.details.totalSigners} Unterzeichner</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className={styles.emptyState}>
                <Clock size={64} />
                <p>Keine Historie verfügbar</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className={styles.modalOverlay} onClick={onClose}>
        <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className={styles.modalHeader}>
            <div className={styles.headerLeft}>
              <FileText size={24} />
              <div>
                <h2>{fixUtf8Display(contract.name)}</h2>
                <p className={styles.contractName}>
                  {contract.kuendigung && `Kündigungsfrist: ${contract.kuendigung}`}
                </p>
              </div>
            </div>

            {/* Header Right: 3-Dot-Menü + Close Button */}
            <div className={styles.headerRight}>
              <div className={styles.actionsMenuWrapper} ref={actionsMenuRef}>
                <button
                  className={styles.actionsMenuBtn}
                  onClick={() => setActionsMenuOpen(!actionsMenuOpen)}
                  aria-label="Aktionen"
                  aria-expanded={actionsMenuOpen}
                >
                  <MoreHorizontal size={20} />
                </button>
                {actionsMenuOpen && (
                  <div className={styles.actionsDropdown}>
                    <button className={styles.dropdownItem} onClick={() => { window.open(`/contracts/${contract._id}`, '_blank'); setActionsMenuOpen(false); }}>
                      <ExternalLink size={16} /><span>Vollansicht öffnen</span>
                    </button>
                    <button className={styles.dropdownItem} onClick={() => { handleShare(); setActionsMenuOpen(false); }}>
                      <Share2 size={16} /><span>Teilen</span>
                    </button>
                    <button className={styles.dropdownItem} onClick={() => { handleEdit(); setActionsMenuOpen(false); }}>
                      <Edit size={16} /><span>Bearbeiten</span>
                    </button>
                    {contract.s3Key && !contract.needsReupload && !contract.envelope && (
                      <button className={styles.dropdownItem} onClick={() => { handleSendToSignature(); setActionsMenuOpen(false); }}>
                        <PenTool size={16} /><span>Signatur senden</span>
                      </button>
                    )}
                    <div className={styles.dropdownDivider} />
                    <button className={`${styles.dropdownItem} ${styles.dropdownItemDanger}`} onClick={() => { handleDelete(); setActionsMenuOpen(false); }}>
                      <Trash2 size={16} /><span>Löschen</span>
                    </button>
                  </div>
                )}
              </div>
              <button onClick={onClose} className={styles.closeBtn} aria-label="Schließen">
                <X size={20} />
              </button>
            </div>

            {/* Desktop: Action Buttons (auf Mobile per CSS versteckt) */}
            <div className={styles.headerActions}>
              <button className={styles.actionBtn} onClick={() => window.open(`/contracts/${contract._id}`, '_blank')} title="Vollansicht öffnen">
                <ExternalLink size={18} />
              </button>
              <button className={styles.actionBtn} onClick={handleShare} title="Teilen">
                <Share2 size={18} />
              </button>
              <button className={styles.actionBtn} onClick={handleEdit} title="Bearbeiten">
                <Edit size={18} />
              </button>
              {contract.s3Key && !contract.needsReupload && !contract.envelope && (
                <button className={styles.actionBtn} onClick={handleSendToSignature} title="Zur Signatur senden">
                  <PenTool size={18} />
                </button>
              )}
              <button className={`${styles.actionBtn} ${styles.deleteBtn}`} onClick={handleDelete} title="Löschen">
                <Trash2 size={18} />
              </button>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className={styles.tabNav}>
            {/* Tab Buttons - Left */}
            <div className={styles.tabNavLeft}>
              <button
                className={`${styles.tabButton} ${activeTab === 'overview' ? styles.tabActive : ''}`}
                onClick={() => setActiveTab('overview')}
              >
                <FileText size={18} />
                <span>Übersicht</span>
              </button>
              <button
                className={`${styles.tabButton} ${activeTab === 'pdf' ? styles.tabActive : ''}`}
                onClick={() => setActiveTab('pdf')}
                disabled={!hasPdfSource}
              >
                <Eye size={18} />
                <span>{isDocx ? 'Word' : 'PDF'}</span>
                {!hasPdfSource && <span className={styles.tabDisabled}>(nicht verfügbar)</span>}
              </button>
              <button
                className={`${styles.tabButton} ${activeTab === 'analysis' ? styles.tabActive : ''}`}
                onClick={() => {
                  setActiveTab('analysis');
                }}
                disabled={!hasAnalysisData(contract)}
              >
                <BarChart3 size={18} />
                <span>Analyse</span>
                {!hasAnalysisData(contract) && (
                  <span className={styles.tabDisabled}>(nicht verfügbar)</span>
                )}
              </button>
              {contract.isOptimized && contract.optimizations && contract.optimizations.length > 0 && (
                <button
                  className={`${styles.tabButton} ${activeTab === 'optimizations' ? styles.tabActive : ''}`}
                  onClick={() => setActiveTab('optimizations')}
                >
                  <CheckCircle size={18} />
                  <span>Optimierungen</span>
                </button>
              )}
              {/* 🆕 Optimiertes PDF Tab */}
              {contract.optimizedPdfS3Key && (
                <button
                  className={`${styles.tabButton} ${activeTab === 'optimizedPdf' ? styles.tabActive : ''}`}
                  onClick={() => setActiveTab('optimizedPdf')}
                >
                  <FileText size={18} />
                  <span>Optimierter Vertrag PDF</span>
                </button>
              )}
              {(contract.envelope || contract.signatureEnvelopeId) && (
                <button
                  className={`${styles.tabButton} ${activeTab === 'signature' ? styles.tabActive : ''}`}
                  onClick={() => setActiveTab('signature')}
                >
                  <PenTool size={18} />
                  <span>Signierprozess</span>
                </button>
              )}
            </div>

            {/* Tab Actions - Right (context-sensitive) */}
            <div className={styles.tabNavRight}>
              {/* PDF Tab Actions */}
              {activeTab === 'pdf' && pdfUrl && (
                <button
                  onClick={handleOpenPdfInNewTab}
                  className={styles.tabActionButton}
                  title="In neuem Tab öffnen"
                >
                  <Eye size={16} />
                  <span>In neuem Tab öffnen</span>
                </button>
              )}

              {/* Analysis Tab Actions */}
              {activeTab === 'analysis' && hasAnalysisData(contract) && (
                <button
                  onClick={handleDownloadAnalysisPDF}
                  className={styles.tabActionButton}
                  title="Analyse als PDF herunterladen"
                >
                  <Download size={16} />
                  <span>Analyse-PDF</span>
                </button>
              )}
            </div>
          </div>

          {/* Tab Content */}
          <div className={styles.modalBody}>
            {activeTab === 'overview' && renderOverviewTab()}
            {activeTab === 'pdf' && renderPdfTab()}
            {activeTab === 'analysis' && renderAnalysisTab()}
            {activeTab === 'optimizations' && renderOptimizationsTab()}
            {activeTab === 'optimizedPdf' && renderOptimizedPdfTab()}
            {activeTab === 'signature' && renderSignatureTab()}
          </div>
        </div>
      </div>

      {/* Sub-Modals - Wrapped with higher z-index to appear above main modal */}
      <div style={{ position: 'relative', zIndex: 10000 }}>
        <ContractShareModal
          contract={contract}
          onClose={() => setShowShareModal(false)}
          show={showShareModal}
        />

        <ContractEditModal
          contract={contract}
          onClose={() => setShowEditModal(false)}
          onUpdate={(updatedContract: Contract) => {
            setContract(updatedContract);
            if (onEdit) onEdit(updatedContract._id);
            setShowEditModal(false);
          }}
          show={showEditModal}
        />

        {contract.s3Key && (
          <SignatureModal
            show={showSignatureModal}
            onClose={() => setShowSignatureModal(false)}
            contractId={contract._id}
            contractName={fixUtf8Display(contract.name)}
            contractS3Key={contract.s3Key}
          />
        )}
      </div>
    </>
  );
};

export default NewContractDetailsModal;
