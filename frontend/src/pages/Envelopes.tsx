import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mail,
  Clock,
  CheckCircle,
  XCircle,
  Send,
  Copy,
  User,
  FileText,
  Calendar,
  AlertCircle,
  X,
  Activity,
  Download,
  Share2,
  QrCode,
  FileDown,
  RefreshCw,
  Edit,
  Save,
  StickyNote,
  CheckSquare,
  Square,
  Trash2,
  FileSpreadsheet,
  Plus,
  Search,
  Archive,
  RotateCcw,
  Loader,
  Filter,
  ChevronDown,
  ArrowUpDown
} from "lucide-react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import jsPDF from "jspdf";
import styles from "../styles/Envelopes.module.css";
import PDFViewer from "../components/PDFViewer";
import { QRCodeCanvas } from "qrcode.react";
import { WelcomePopup } from "../components/Tour";

interface Signer {
  email: string;
  name: string;
  role: string;
  order: number;
  status: "PENDING" | "SIGNED";
  signedAt?: string;
  token: string;
  tokenExpires: string;
}

interface Contract {
  _id?: string;
  s3Key?: string;
  title?: string;
  status?: string;
}

interface Envelope {
  _id: string;
  ownerId: string;
  contractId?: string;
  title: string;
  message: string;
  s3Key?: string;
  s3KeySealed?: string;
  status: "DRAFT" | "SENT" | "SIGNED" | "COMPLETED" | "EXPIRED" | "VOIDED";
  signers: Signer[];
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
  completedAt?: string;
  internalNote?: string;
  contract?: Contract;
  archived?: boolean;
  archivedAt?: string;
}

type FilterTab = "all" | "open" | "completed" | "cancelled" | "archived";

export default function Envelopes() {
  const navigate = useNavigate();
  const [envelopes, setEnvelopes] = useState<Envelope[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [selectedEnvelope, setSelectedEnvelope] = useState<Envelope | null>(null);
  const [showPDFViewer, setShowPDFViewer] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfTitle, setPdfTitle] = useState<string>("");
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [showSignerEdit, setShowSignerEdit] = useState(false);
  const [editingSigner, setEditingSigner] = useState<{ signer: Signer; index: number } | null>(null);
  const [newSignerEmail, setNewSignerEmail] = useState("");
  const [newSignerName, setNewSignerName] = useState("");
  const [internalNote, setInternalNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [selectedEnvelopeIds, setSelectedEnvelopeIds] = useState<string[]>([]);

  // Search, pagination and archive states
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [archivedCount, setArchivedCount] = useState(0);
  const [voidedCount, setVoidedCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [sortBy, setSortBy] = useState<string>("newest");
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const LIMIT = 50;

  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText: string;
    confirmStyle: "danger" | "warning" | "primary";
    onConfirm: () => void;
  } | null>(null);

  // Responsive handler
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Debounce search query to avoid focus loss
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load envelopes from API (triggered by debounced search, not direct input)
  useEffect(() => {
    loadEnvelopes(true, 0);
  }, [activeFilter, debouncedSearchQuery, sortBy, statusFilter]);

  const loadEnvelopes = useCallback(async (isInitial: boolean = false, newOffset: number = 0) => {
    try {
      // Only show full loading spinner on very first load (no envelopes yet)
      if (isInitial && envelopes.length === 0) {
        setLoading(true);
      }
      if (isInitial) {
        setOffset(0);
      } else {
        setLoadingMore(true);
      }
      const token = localStorage.getItem("token");

      // Build query params
      const params = new URLSearchParams();
      params.append("limit", String(LIMIT));
      params.append("offset", String(newOffset));

      // Archive filter
      if (activeFilter === "archived") {
        params.append("archived", "true");
      }

      // Search query (use debounced version)
      if (debouncedSearchQuery.trim()) {
        params.append("search", debouncedSearchQuery.trim());
      }

      // Sort parameter
      if (sortBy) {
        params.append("sort", sortBy);
      }

      // Status filter (from dropdown, not tabs)
      if (statusFilter && statusFilter !== "all") {
        params.append("status", statusFilter);
      }

      const response = await fetch(`/api/envelopes?${params.toString()}`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        credentials: "include"
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Fehler beim Laden der Signaturanfragen");
      }

      const newEnvelopes = data.envelopes || [];

      // Check for status changes and show notifications (only on refresh, not initial load)
      if (!isInitial && newOffset === 0 && envelopes.length > 0) {
        newEnvelopes.forEach((newEnv: Envelope) => {
          const oldEnv = envelopes.find(e => e._id === newEnv._id);
          if (oldEnv) {
            if (oldEnv.status !== newEnv.status) {
              if (newEnv.status === "COMPLETED") {
                toast.success(`🎉 "${newEnv.title}" wurde vollständig signiert!`, {
                  position: "top-right",
                  autoClose: 5000,
                });
              } else if (newEnv.status === "SIGNED") {
                toast.info(`✍️ Neue Unterschrift bei "${newEnv.title}"`, {
                  position: "top-right",
                  autoClose: 4000,
                });
              }
            }
          }
        });
      }

      console.log("✅ Envelopes loaded:", data);

      // Set or append envelopes
      if (isInitial || newOffset === 0) {
        setEnvelopes(newEnvelopes);
      } else {
        setEnvelopes(prev => [...prev, ...newEnvelopes]);
      }

      setOffset(newOffset);
      setHasMore(data.pagination?.hasMore || false);
      setArchivedCount(data.archivedCount || 0);
      setVoidedCount(data.voidedCount || 0);
      setLastUpdated(new Date());

      // Update selected envelope if it's currently open
      if (selectedEnvelope) {
        const updated = newEnvelopes.find((e: Envelope) => e._id === selectedEnvelope._id);
        if (updated) {
          setSelectedEnvelope(updated);
        }
      }
    } catch (err) {
      console.error("❌ Error loading envelopes:", err);
      const errorMessage = err instanceof Error ? err.message : "Unbekannter Fehler";
      if (isInitial) setError(errorMessage);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [envelopes, selectedEnvelope, activeFilter, debouncedSearchQuery, sortBy, statusFilter]);

  // Load more (infinite scroll)
  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      loadEnvelopes(false, offset + LIMIT);
    }
  };

  // Manual refresh
  const handleManualRefresh = () => {
    loadEnvelopes(true, 0);
    toast.info("Aktualisiert!", { autoClose: 2000 });
  };

  // Filter envelopes based on active tab (now done server-side for archived, but still filter for open/completed)
  const filteredEnvelopes = envelopes.filter(env => {
    // Archived is handled by API, so if activeFilter is "archived", show all returned envelopes
    if (activeFilter === "archived") return true;
    // "Alle" zeigt KEINE stornierten (VOIDED) Envelopes
    if (activeFilter === "all") return env.status !== "VOIDED";
    if (activeFilter === "open") return env.status !== "COMPLETED" && env.status !== "VOIDED";
    if (activeFilter === "completed") return env.status === "COMPLETED";
    // "Storniert" Tab zeigt NUR VOIDED Envelopes
    if (activeFilter === "cancelled") return env.status === "VOIDED";
    return true;
  });

  // Archive selected envelopes
  const handleBatchArchive = async () => {
    if (selectedEnvelopeIds.length === 0) return;

    if (!confirm(`${selectedEnvelopeIds.length} Signaturanfrage(n) archivieren?`)) return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/envelopes/archive", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({ envelopeIds: selectedEnvelopeIds })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Fehler beim Archivieren");

      toast.success(`📦 ${data.archivedCount} Signaturanfrage(n) archiviert`);
      setSelectedEnvelopeIds([]);
      loadEnvelopes(true, 0);
    } catch (err) {
      console.error("Error archiving:", err);
      toast.error("Fehler beim Archivieren");
    }
  };

  // Unarchive selected envelopes
  const handleBatchUnarchive = async () => {
    if (selectedEnvelopeIds.length === 0) return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/envelopes/unarchive", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({ envelopeIds: selectedEnvelopeIds })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Fehler beim Wiederherstellen");

      toast.success(`✅ ${data.unarchivedCount} Signaturanfrage(n) wiederhergestellt`);
      setSelectedEnvelopeIds([]);
      loadEnvelopes(true, 0);
    } catch (err) {
      console.error("Error unarchiving:", err);
      toast.error("Fehler beim Wiederherstellen");
    }
  };

  // Permanently delete archived envelopes
  const handleBatchPermanentDelete = () => {
    if (selectedEnvelopeIds.length === 0) return;

    setConfirmDialog({
      isOpen: true,
      title: "Endgültig löschen?",
      message: `Sie sind dabei, ${selectedEnvelopeIds.length} Signaturanfrage(n) endgültig zu löschen. Diese Aktion kann nicht rückgängig gemacht werden.`,
      confirmText: "Endgültig löschen",
      confirmStyle: "danger",
      onConfirm: async () => {
        try {
          const token = localStorage.getItem("token");
          const response = await fetch("/api/envelopes/bulk", {
            method: "DELETE",
            headers: {
              "Authorization": `Bearer ${token}`,
              "Content-Type": "application/json"
            },
            credentials: "include",
            body: JSON.stringify({ envelopeIds: selectedEnvelopeIds })
          });

          const data = await response.json();
          if (!response.ok) throw new Error(data.message || "Fehler beim Löschen");

          toast.success(`${data.deletedCount} Signaturanfrage(n) endgültig gelöscht`);
          setSelectedEnvelopeIds([]);
          loadEnvelopes(true, 0);
        } catch (err) {
          console.error("Error deleting:", err);
          toast.error("Fehler beim Löschen");
        }
        setConfirmDialog(null);
      }
    });
  };

  // Copy signature link to clipboard
  const handleCopyLink = (token: string) => {
    const signUrl = `${window.location.origin}/sign/${token}`;
    navigator.clipboard.writeText(signUrl);
    alert("📋 Link in die Zwischenablage kopiert!");
  };

  // Send reminder email
  const handleRemind = async (envelopeId: string) => {
    try {
      const token = localStorage.getItem("token");

      const response = await fetch(`/api/envelopes/${envelopeId}/remind`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        credentials: "include"
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Fehler beim Senden der Erinnerung");
      }

      alert("✅ Erinnerung erfolgreich versendet!");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unbekannter Fehler";
      alert(`❌ Fehler: ${errorMessage}`);
    }
  };

  // Cancel envelope
  const handleCancel = (envelopeId: string, envelopeTitle: string) => {
    setConfirmDialog({
      isOpen: true,
      title: "Signaturanfrage stornieren?",
      message: `Möchten Sie "${envelopeTitle}" wirklich stornieren? Die Unterzeichner können dann nicht mehr unterschreiben.`,
      confirmText: "Stornieren",
      confirmStyle: "warning",
      onConfirm: async () => {
        try {
          const token = localStorage.getItem("token");

          const response = await fetch(`/api/envelopes/${envelopeId}/void`, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${token}`,
              "Content-Type": "application/json"
            },
            credentials: "include"
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || "Fehler beim Stornieren");
          }

          toast.success("Signaturanfrage storniert");
          loadEnvelopes(); // Reload list
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : "Unbekannter Fehler";
          toast.error(`Fehler: ${errorMessage}`);
        }
        setConfirmDialog(null);
      }
    });
  };

  // Hard delete (endgültig löschen) - nur für VOIDED envelopes
  const handleHardDelete = (envelopeId: string, envelopeTitle: string) => {
    setConfirmDialog({
      isOpen: true,
      title: "Endgültig löschen?",
      message: `Möchten Sie "${envelopeTitle}" wirklich endgültig löschen? Diese Aktion kann nicht rückgängig gemacht werden.`,
      confirmText: "Endgültig löschen",
      confirmStyle: "danger",
      onConfirm: async () => {
        try {
          const token = localStorage.getItem("token");

          const response = await fetch("/api/envelopes/bulk", {
            method: "DELETE",
            headers: {
              "Authorization": `Bearer ${token}`,
              "Content-Type": "application/json"
            },
            credentials: "include",
            body: JSON.stringify({ envelopeIds: [envelopeId] })
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || "Fehler beim Löschen");
          }

          toast.success("Signaturanfrage endgültig gelöscht");
          loadEnvelopes(true, 0); // Reload list
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : "Unbekannter Fehler";
          toast.error(`Fehler: ${errorMessage}`);
        }
        setConfirmDialog(null);
      }
    });
  };

  // Wiederherstellen (restore) - nur für VOIDED envelopes
  const handleRestore = async (envelopeId: string, envelopeTitle: string) => {
    setConfirmDialog({
      isOpen: true,
      title: "Wiederherstellen?",
      message: `Möchten Sie "${envelopeTitle}" wiederherstellen? Die Signaturanfrage wird als Entwurf wiederhergestellt.`,
      confirmText: "Wiederherstellen",
      confirmStyle: "primary",
      onConfirm: async () => {
        try {
          const token = localStorage.getItem("token");

          const response = await fetch(`/api/envelopes/${envelopeId}/restore`, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${token}`,
              "Content-Type": "application/json"
            },
            credentials: "include"
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || data.message || "Fehler beim Wiederherstellen");
          }

          toast.success("Signaturanfrage wiederhergestellt");
          setSelectedEnvelope(null);
          loadEnvelopes(true, 0); // Reload list
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : "Unbekannter Fehler";
          toast.error(`Fehler: ${errorMessage}`);
        }
        setConfirmDialog(null);
      }
    });
  };

  // Get status badge color
  const getStatusColor = (status: Envelope["status"]) => {
    switch (status) {
      case "DRAFT": return styles.statusDraft;
      case "SENT": return styles.statusSent;
      case "SIGNED": return styles.statusSigned;
      case "COMPLETED": return styles.statusCompleted;
      case "EXPIRED": return styles.statusExpired;
      case "VOIDED": return styles.statusVoided;
      default: return styles.statusDefault;
    }
  };

  // Get status label
  const getStatusLabel = (status: Envelope["status"]) => {
    switch (status) {
      case "DRAFT": return "Entwurf";
      case "SENT": return "Gesendet";
      case "SIGNED": return "Signiert";
      case "COMPLETED": return "Abgeschlossen";
      case "EXPIRED": return "Abgelaufen";
      case "VOIDED": return "Storniert";
      default: return status;
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    });
  };

  // Get signer progress
  const getSignerProgress = (signers: Signer[]) => {
    const signed = signers.filter(s => s.status === "SIGNED").length;
    const total = signers.length;
    return `${signed}/${total}`;
  };

  // Get progress percentage
  const getProgressPercentage = (signers: Signer[]) => {
    const signed = signers.filter(s => s.status === "SIGNED").length;
    const total = signers.length;
    return total > 0 ? (signed / total) * 100 : 0;
  };

  // Format relative time
  const getRelativeTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);

    if (seconds < 60) return "Gerade eben";
    if (minutes === 1) return "Vor 1 Minute";
    if (minutes < 60) return `Vor ${minutes} Minuten`;
    return formatDateTime(date.toString());
  };

  // Generate timeline events for drawer
  const generateTimelineEvents = (envelope: Envelope) => {
    const events = [];

    // Envelope created
    events.push({
      type: "completed",
      title: "Signaturanfrage erstellt",
      description: `Dokument "${envelope.title}" wurde hochgeladen und vorbereitet`,
      time: envelope.createdAt
    });

    // Envelope sent
    if (envelope.status !== "DRAFT") {
      events.push({
        type: "completed",
        title: "Versandt an Empfänger",
        description: `E-Mail wurde an ${envelope.signers.length} Empfänger versendet`,
        time: envelope.createdAt
      });
    }

    // Signer activities
    envelope.signers.forEach(signer => {
      if (signer.status === "SIGNED" && signer.signedAt) {
        events.push({
          type: "completed",
          title: `Unterschrift von ${signer.name}`,
          description: `${signer.email} hat das Dokument unterschrieben`,
          time: signer.signedAt
        });
      } else if (envelope.status === "SENT") {
        events.push({
          type: "pending",
          title: `Warte auf ${signer.name}`,
          description: `${signer.email} hat noch nicht unterschrieben`,
          time: signer.tokenExpires
        });
      }
    });

    // Envelope completed
    if (envelope.status === "COMPLETED") {
      events.push({
        type: "completed",
        title: "Vollständig abgeschlossen",
        description: "Alle Unterschriften wurden gesammelt",
        time: envelope.updatedAt
      });
    }

    // Envelope expired
    if (envelope.status === "EXPIRED") {
      events.push({
        type: "completed",
        title: "Abgelaufen",
        description: "Die Signaturanfrage ist abgelaufen",
        time: envelope.expiresAt || envelope.updatedAt
      });
    }

    // Envelope voided
    if (envelope.status === "VOIDED") {
      events.push({
        type: "completed",
        title: "Storniert",
        description: "Die Signaturanfrage wurde storniert",
        time: envelope.updatedAt
      });
    }

    // Sort by time (newest first)
    return events.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
  };

  // Format date and time
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  // Load PDF URL from backend
  const handleViewPDF = async (envelope: Envelope, signed: boolean = false) => {
    console.log("📄 Envelope Data:", envelope);
    console.log("📄 Loading signed:", signed);

    // Choose between signed or original document
    let s3Key = signed ? envelope.s3KeySealed : envelope.s3Key;

    // Fallback to contract s3Key if original is not available
    if (!s3Key && !signed) {
      s3Key = envelope.contract?.s3Key;
    }

    // If no s3Key but we have a contractId, load the full contract
    const contractId = envelope.contractId || envelope.contract?._id;
    if (!s3Key && !signed && contractId) {
      console.log("🔍 Lade Contract separat:", contractId);
      try {
        const token = localStorage.getItem("token");
        const contractResponse = await fetch(`/api/contracts/${contractId}`, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          credentials: "include"
        });

        if (contractResponse.ok) {
          const contractData = await contractResponse.json();
          s3Key = contractData.s3Key;
          console.log("✅ Contract geladen, s3Key:", s3Key);
        }
      } catch (err) {
        console.error("❌ Fehler beim Laden des Contracts:", err);
      }
    }

    if (!s3Key) {
      toast.error(signed ? "Kein signiertes Dokument verfügbar" : "Keine PDF-Datei verfügbar");
      console.error("❌ Kein s3Key gefunden für Envelope:", envelope._id);
      return;
    }

    try {
      setLoadingPdf(true);
      const token = localStorage.getItem("token");

      const response = await fetch(`/api/s3/view?key=${encodeURIComponent(s3Key)}`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        credentials: "include"
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Fehler beim Laden der PDF-URL");
      }

      setPdfUrl(data.url);
      setPdfTitle(signed ? `${envelope.title} (Signiert)` : envelope.title);
      setShowPDFViewer(true);
    } catch (err) {
      console.error("❌ Error loading PDF URL:", err);
      const errorMessage = err instanceof Error ? err.message : "Unbekannter Fehler";
      toast.error(`Fehler: ${errorMessage}`);
    } finally {
      setLoadingPdf(false);
    }
  };

  // Download PDF
  const handleDownloadPDF = async (envelope: Envelope, signed: boolean = false) => {
    // Try to get s3Key from envelope first, then from contract as fallback
    let s3Key = signed ? envelope.s3KeySealed : envelope.s3Key;

    // Fallback to contract.s3Key if envelope.s3Key is not available
    if (!s3Key && !signed) {
      s3Key = envelope.contract?.s3Key;
    }

    // If no s3Key but we have a contractId, load the full contract
    const contractId = envelope.contractId || envelope.contract?._id;
    if (!s3Key && !signed && contractId) {
      try {
        const token = localStorage.getItem("token");
        const contractResponse = await fetch(`/api/contracts/${contractId}`, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          credentials: "include"
        });

        if (contractResponse.ok) {
          const contractData = await contractResponse.json();
          s3Key = contractData.s3Key;
        }
      } catch (err) {
        console.error("❌ Fehler beim Laden des Contracts:", err);
      }
    }

    if (!s3Key) {
      toast.error(signed ? "Kein signiertes Dokument verfügbar" : "Keine PDF-Datei verfügbar");
      return;
    }

    try {
      const token = localStorage.getItem("token");

      const response = await fetch(`/api/s3/view?key=${encodeURIComponent(s3Key)}`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        credentials: "include"
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Fehler beim Laden der PDF-URL");
      }

      // Download file
      const pdfResponse = await fetch(data.url);
      const blob = await pdfResponse.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${envelope.title}${signed ? "_signiert" : ""}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("❌ Error downloading PDF:", err);
      const errorMessage = err instanceof Error ? err.message : "Unbekannter Fehler";
      alert(`❌ Fehler: ${errorMessage}`);
    }
  };

  // Duplicate envelope
  const handleDuplicate = (envelope: Envelope) => {
    if (confirm(`Möchten Sie "${envelope.title}" als Vorlage duplizieren?`)) {
      // TODO: Navigate to create envelope page with pre-filled data
      alert("Duplizieren-Feature wird demnächst implementiert!");
    }
  };

  // Generate QR Code
  const handleGenerateQRCode = (signer: Signer) => {
    const signUrl = `${window.location.origin}/sign/${signer.token}`;
    setQrCodeUrl(signUrl);
    setShowQRCode(true);
  };

  // Export Audit Log as PDF
  const handleExportAuditLog = (envelope: Envelope) => {
    const events = generateTimelineEvents(envelope);
    const doc = new jsPDF();

    // Header
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("Audit-Log", 105, 20, { align: "center" });

    // Document Info
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(`Dokument: ${envelope.title}`, 20, 35);
    doc.text(`Erstellt am: ${formatDateTime(envelope.createdAt)}`, 20, 42);
    doc.text(`Status: ${getStatusLabel(envelope.status)}`, 20, 49);

    // Timeline Section
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Aktivitätsverlauf", 20, 65);

    let yPosition = 75;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");

    events.forEach((event, idx) => {
      if (yPosition > 270) {
        doc.addPage();
        yPosition = 20;
      }

      doc.setFont("helvetica", "bold");
      doc.text(`${idx + 1}. ${event.title}`, 20, yPosition);
      yPosition += 6;

      doc.setFont("helvetica", "normal");
      doc.text(`   ${event.description}`, 20, yPosition);
      yPosition += 6;
      doc.text(`   Zeitpunkt: ${formatDateTime(event.time)}`, 20, yPosition);
      yPosition += 10;
    });

    // Signers Section
    if (yPosition > 240) {
      doc.addPage();
      yPosition = 20;
    }

    yPosition += 10;
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Unterzeichner", 20, yPosition);
    yPosition += 10;

    doc.setFontSize(10);
    envelope.signers.forEach((signer, idx) => {
      if (yPosition > 270) {
        doc.addPage();
        yPosition = 20;
      }

      doc.setFont("helvetica", "bold");
      doc.text(`${idx + 1}. ${signer.name}`, 20, yPosition);
      yPosition += 6;

      doc.setFont("helvetica", "normal");
      doc.text(`   E-Mail: ${signer.email}`, 20, yPosition);
      yPosition += 6;
      doc.text(`   Rolle: ${signer.role}`, 20, yPosition);
      yPosition += 6;
      doc.text(`   Status: ${signer.status === "SIGNED" ? "✓ Signiert" : "○ Ausstehend"}`, 20, yPosition);
      yPosition += 6;
      if (signer.signedAt) {
        doc.text(`   Signiert am: ${formatDateTime(signer.signedAt)}`, 20, yPosition);
        yPosition += 6;
      }
      yPosition += 5;
    });

    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text(
        `Seite ${i} von ${pageCount} | Generiert am ${new Date().toLocaleString("de-DE")}`,
        105,
        290,
        { align: "center" }
      );
    }

    // Download PDF
    doc.save(`Audit-Log_${envelope.title}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  // Open signer edit modal
  const handleEditSigner = (signer: Signer, index: number) => {
    setEditingSigner({ signer, index });
    setNewSignerEmail(signer.email);
    setNewSignerName(signer.name);
    setShowSignerEdit(true);
  };

  // Update signer information
  const handleUpdateSigner = async () => {
    if (!selectedEnvelope || !editingSigner) return;

    if (!newSignerEmail || !newSignerName) {
      toast.error("Bitte Name und E-Mail eingeben");
      return;
    }

    try {
      const token = localStorage.getItem("token");

      const response = await fetch(`/api/envelopes/${selectedEnvelope._id}/signer/${editingSigner.index}`, {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({
          email: newSignerEmail,
          name: newSignerName
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Fehler beim Aktualisieren");
      }

      toast.success("Unterzeichner aktualisiert!");
      setShowSignerEdit(false);
      setEditingSigner(null);
      loadEnvelopes(false);
    } catch (err) {
      console.error("❌ Error updating signer:", err);
      const errorMessage = err instanceof Error ? err.message : "Unbekannter Fehler";
      toast.error(`Fehler: ${errorMessage}`);
    }
  };

  // Remind individual signer
  const handleRemindIndividual = async (envelopeId: string, signerEmail: string) => {
    try {
      const token = localStorage.getItem("token");

      const response = await fetch(`/api/envelopes/${envelopeId}/remind-individual`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({ email: signerEmail })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Fehler beim Senden der Erinnerung");
      }

      toast.success(`Erinnerung an ${signerEmail} versendet!`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unbekannter Fehler";
      toast.error(`Fehler: ${errorMessage}`);
    }
  };

  // Load internal note when drawer opens
  useEffect(() => {
    if (selectedEnvelope) {
      setInternalNote(selectedEnvelope.internalNote || "");
    }
  }, [selectedEnvelope]);

  // Save internal note (debounced)
  useEffect(() => {
    if (!selectedEnvelope) return;

    const timeoutId = setTimeout(() => {
      if (internalNote !== (selectedEnvelope.internalNote || "")) {
        handleSaveNote();
      }
    }, 1000); // Auto-save after 1 second of inactivity

    return () => clearTimeout(timeoutId);
  }, [internalNote, selectedEnvelope]);

  // Save note to backend
  const handleSaveNote = async () => {
    if (!selectedEnvelope) return;

    try {
      setSavingNote(true);
      const token = localStorage.getItem("token");

      const response = await fetch(`/api/envelopes/${selectedEnvelope._id}/note`, {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({ note: internalNote }) // ✅ FIX: Backend expects "note", not "internalNote"
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Fehler beim Speichern");
      }

      // Update selected envelope
      setSelectedEnvelope({ ...selectedEnvelope, internalNote });

      // ✅ FIX: Also update the envelope in the list so it persists when reopening
      setEnvelopes(prev => prev.map(env =>
        env._id === selectedEnvelope._id
          ? { ...env, internalNote }
          : env
      ));
    } catch (err) {
      console.error("❌ Error saving note:", err);
    } finally {
      setSavingNote(false);
    }
  };

  // Batch Actions
  const handleSelectEnvelope = (id: string) => {
    setSelectedEnvelopeIds(prev =>
      prev.includes(id) ? prev.filter(eid => eid !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    setSelectedEnvelopeIds(filteredEnvelopes.map(env => env._id));
  };

  const handleDeselectAll = () => {
    setSelectedEnvelopeIds([]);
  };

  const handleBatchRemind = async () => {
    const selectedEnvs = envelopes.filter(env => selectedEnvelopeIds.includes(env._id));
    const pendingEnvs = selectedEnvs.filter(env => env.status === "SENT" || env.status === "SIGNED");

    if (pendingEnvs.length === 0) {
      toast.warning("Keine ausstehenden Signaturanfragen ausgewählt");
      return;
    }

    if (!confirm(`Möchten Sie ${pendingEnvs.length} Erinnerungen versenden?`)) {
      return;
    }

    let success = 0;
    let failed = 0;

    for (const env of pendingEnvs) {
      try {
        await handleRemind(env._id);
        success++;
      } catch {
        failed++;
      }
    }

    toast.success(`${success} Erinnerungen versendet${failed > 0 ? `, ${failed} fehlgeschlagen` : ""}`);
    handleDeselectAll();
  };

  const handleBatchDownload = async () => {
    if (selectedEnvelopeIds.length === 0) return;

    toast.info(`Download von ${selectedEnvelopeIds.length} PDFs wird gestartet...`);

    for (const envId of selectedEnvelopeIds) {
      const env = envelopes.find(e => e._id === envId);
      if (env) {
        await handleDownloadPDF(env, false);
        // Small delay to avoid overwhelming the browser
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    toast.success("Downloads abgeschlossen!");
    handleDeselectAll();
  };

  const handleBatchExport = () => {
    if (selectedEnvelopeIds.length === 0) return;

    const selectedEnvs = envelopes.filter(env => selectedEnvelopeIds.includes(env._id));

    // Create CSV content
    let csv = "Titel,Status,Empfänger,Signiert,Erstellt,Läuft ab\n";

    selectedEnvs.forEach(env => {
      const signedCount = env.signers.filter(s => s.status === "SIGNED").length;
      const totalCount = env.signers.length;
      const recipientsText = env.signers.map(s => s.name).join("; ");

      csv += `"${env.title}","${getStatusLabel(env.status)}","${recipientsText}","${signedCount}/${totalCount}","${formatDate(env.createdAt)}","${env.expiresAt ? formatDate(env.expiresAt) : "-"}"\n`;
    });

    // Download as CSV
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Envelopes_Export_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    toast.success(`${selectedEnvelopeIds.length} Einträge exportiert!`);
    handleDeselectAll();
  };

  const handleBatchDelete = () => {
    if (selectedEnvelopeIds.length === 0) return;

    setConfirmDialog({
      isOpen: true,
      title: "Mehrere stornieren?",
      message: `Möchten Sie ${selectedEnvelopeIds.length} Signaturanfrage(n) wirklich stornieren? Die Unterzeichner können dann nicht mehr unterschreiben.`,
      confirmText: "Alle stornieren",
      confirmStyle: "warning",
      onConfirm: async () => {
        let success = 0;
        let failed = 0;

        for (const envId of selectedEnvelopeIds) {
          try {
            const token = localStorage.getItem("token");

            const response = await fetch(`/api/envelopes/${envId}/void`, {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
              },
              credentials: "include"
            });

            if (response.ok) {
              success++;
            } else {
              failed++;
            }
          } catch {
            failed++;
          }
        }

        toast.success(`${success} storniert${failed > 0 ? `, ${failed} fehlgeschlagen` : ""}`);
        handleDeselectAll();
        loadEnvelopes(false);
        setConfirmDialog(null);
      }
    });
  };

  // Loading state - Skeleton Loading
  if (loading) {
    return (
      <div className={styles.pageContainer}>
        <div className={styles.container}>
          {/* Skeleton Header */}
          <div className={styles.skeletonHeader}>
            <div className={styles.skeletonIcon}></div>
            <div className={styles.skeletonTextGroup}>
              <div className={styles.skeletonTitle}></div>
              <div className={styles.skeletonSubtitle}></div>
            </div>
          </div>

          {/* Skeleton Tabs */}
          <div className={styles.skeletonTabs}>
            <div className={styles.skeletonTab}></div>
            <div className={styles.skeletonTab}></div>
            <div className={styles.skeletonTab}></div>
            <div className={styles.skeletonTab}></div>
          </div>

          {/* Skeleton Search */}
          <div className={styles.skeletonSearch}></div>

          {/* Skeleton Cards */}
          <div className={styles.skeletonSection}>
            {[1, 2, 3].map((i) => (
              <div key={i} className={styles.skeletonCard}>
                <div className={styles.skeletonCardHeader}>
                  <div className={styles.skeletonCardTitle}></div>
                  <div className={styles.skeletonBadge}></div>
                </div>
                <div className={styles.skeletonCardBody}>
                  <div className={styles.skeletonLine}></div>
                  <div className={styles.skeletonLine}></div>
                  <div className={styles.skeletonLineShort}></div>
                </div>
                <div className={styles.skeletonCardActions}>
                  <div className={styles.skeletonButton}></div>
                  <div className={styles.skeletonButton}></div>
                  <div className={styles.skeletonButton}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={styles.pageContainer}>
        <div className={styles.errorContainer}>
          <AlertCircle size={48} className={styles.errorIcon} />
          <h2>Fehler beim Laden</h2>
          <p>{error}</p>
          <button className={styles.retryBtn} onClick={() => loadEnvelopes(true)}>
            Erneut versuchen
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.pageContainer}>
      <WelcomePopup
        featureId="envelopes"
        icon={<Send size={32} />}
        title="Digitale Signaturen"
        description="Hier verwalten Sie alle Ihre Signaturanfragen. Senden Sie Verträge zur Unterschrift, verfolgen Sie den Status und laden Sie signierte Dokumente herunter."
        tip="Klicken Sie auf eine Anfrage, um Details zu sehen und Erinnerungen zu versenden."
      />
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerTitle}>
            <Mail size={32} className={styles.headerIcon} />
            <div>
              <h1>Signaturanfragen</h1>
              <p className={styles.subtitle}>
                Verwalten Sie Ihre digitalen Signaturen
              </p>
            </div>
          </div>
          <div className={styles.headerActions}>
            <div className={styles.lastUpdated}>
              <Clock size={14} />
              <span>Zuletzt aktualisiert: {getRelativeTime(lastUpdated)}</span>
            </div>
            <button
              className={styles.refreshBtn}
              onClick={handleManualRefresh}
              title="Jetzt aktualisieren"
            >
              <RefreshCw size={16} />
              Aktualisieren
            </button>
            <button
              className={styles.newRequestBtn}
              onClick={() => navigate("/envelopes/new")}
              title="Neue Signaturanfrage"
            >
              <Plus size={18} />
              Neue Anfrage
            </button>
          </div>
        </div>

        {/* Filter Row - Tabs + Search + Filter Dropdown */}
        <div className={styles.filterRow}>
          {/* Filter Tabs - Scrollable Container */}
          <div className={styles.filterTabsWrapper}>
            <div className={styles.filterTabs}>
              <button
                className={`${styles.filterTab} ${activeFilter === "all" ? styles.filterTabActive : ""}`}
                onClick={() => { setActiveFilter("all"); setSelectedEnvelopeIds([]); }}
              >
                <FileText size={16} />
                <span>Alle</span>
              </button>
              <button
                className={`${styles.filterTab} ${activeFilter === "open" ? styles.filterTabActive : ""}`}
                onClick={() => { setActiveFilter("open"); setSelectedEnvelopeIds([]); }}
              >
                <Clock size={16} />
                <span>Offen</span>
              </button>
              <button
                className={`${styles.filterTab} ${activeFilter === "completed" ? styles.filterTabActive : ""}`}
                onClick={() => { setActiveFilter("completed"); setSelectedEnvelopeIds([]); }}
              >
                <CheckCircle size={16} />
                <span>Abgeschlossen</span>
              </button>
              {/* Storniert Tab - nur anzeigen wenn stornierte Envelopes existieren */}
              {voidedCount > 0 && (
                <button
                  className={`${styles.filterTab} ${styles.filterTabCancelled} ${activeFilter === "cancelled" ? styles.filterTabActive : ""}`}
                  onClick={() => { setActiveFilter("cancelled"); setSelectedEnvelopeIds([]); }}
                >
                  <XCircle size={16} />
                  <span>Storniert ({voidedCount})</span>
                </button>
              )}
              {/* Archive Tab - nur anzeigen wenn archivierte Envelopes existieren */}
              {archivedCount > 0 && (
                <button
                  className={`${styles.filterTab} ${activeFilter === "archived" ? styles.filterTabActive : ""}`}
                  onClick={() => { setActiveFilter("archived"); setSelectedEnvelopeIds([]); }}
                >
                  <Archive size={16} />
                  <span>Archiv ({archivedCount})</span>
                </button>
              )}

              {/* Select All Button - Mobile: in der Tab-Zeile */}
              {isMobile && filteredEnvelopes.length > 0 && (
                <button
                  className={styles.selectAllTabBtn}
                  onClick={selectedEnvelopeIds.length === filteredEnvelopes.length ? handleDeselectAll : handleSelectAll}
                >
                  {selectedEnvelopeIds.length === filteredEnvelopes.length ? (
                    <>
                      <CheckSquare size={16} />
                      <span>Abwählen</span>
                    </>
                  ) : (
                    <>
                      <Square size={16} />
                      <span>Auswählen</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Search + Filter */}
          <div className={styles.searchFilterGroup}>
            {/* Compact Search */}
            <div className={styles.searchBarCompact}>
              <Search size={16} className={styles.searchIcon} />
              <input
                type="text"
                placeholder="Suchen..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={styles.searchInput}
              />
              {searchQuery && (
                <button
                  className={styles.searchClear}
                  onClick={() => setSearchQuery("")}
                  title="Suche leeren"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Filter Dropdowns - Side by side on mobile */}
            <div className={styles.filterDropdownRow}>
              {/* Status Filter Dropdown */}
              <div className={styles.filterDropdownWrapper}>
                <button
                  className={styles.filterDropdownBtn}
                  onClick={() => { setShowFilterDropdown(!showFilterDropdown); setShowSortDropdown(false); }}
                >
                  <Filter size={16} />
                  <span>{statusFilter === "all" ? "Status" :
                    statusFilter === "DRAFT" ? "Entwurf" :
                    statusFilter === "SENT" ? "Gesendet" :
                    statusFilter === "COMPLETED" ? "Fertig" :
                    statusFilter === "EXPIRED" ? "Abgelaufen" :
                    statusFilter === "VOIDED" ? "Storniert" : statusFilter
                  }</span>
                  <ChevronDown size={14} className={showFilterDropdown ? styles.chevronUp : ""} />
                </button>
                {showFilterDropdown && (
                  <div className={styles.filterDropdown}>
                    <button
                      className={`${styles.filterDropdownItem} ${statusFilter === "all" ? styles.filterDropdownItemActive : ""}`}
                      onClick={() => { setStatusFilter("all"); setShowFilterDropdown(false); }}
                    >
                      Alle Status
                    </button>
                    <button
                      className={`${styles.filterDropdownItem} ${statusFilter === "DRAFT" ? styles.filterDropdownItemActive : ""}`}
                      onClick={() => { setStatusFilter("DRAFT"); setShowFilterDropdown(false); }}
                    >
                      Entwurf
                    </button>
                    <button
                      className={`${styles.filterDropdownItem} ${statusFilter === "SENT" ? styles.filterDropdownItemActive : ""}`}
                      onClick={() => { setStatusFilter("SENT"); setShowFilterDropdown(false); }}
                    >
                      Versendet
                    </button>
                    <button
                      className={`${styles.filterDropdownItem} ${statusFilter === "COMPLETED" ? styles.filterDropdownItemActive : ""}`}
                      onClick={() => { setStatusFilter("COMPLETED"); setShowFilterDropdown(false); }}
                    >
                      Abgeschlossen
                    </button>
                    <button
                      className={`${styles.filterDropdownItem} ${statusFilter === "EXPIRED" ? styles.filterDropdownItemActive : ""}`}
                      onClick={() => { setStatusFilter("EXPIRED"); setShowFilterDropdown(false); }}
                    >
                      Abgelaufen
                    </button>
                    <button
                      className={`${styles.filterDropdownItem} ${statusFilter === "VOIDED" ? styles.filterDropdownItemActive : ""}`}
                      onClick={() => { setStatusFilter("VOIDED"); setShowFilterDropdown(false); }}
                    >
                      Storniert
                    </button>
                  </div>
                )}
              </div>

              {/* Sort Dropdown */}
              <div className={styles.filterDropdownWrapper}>
                <button
                  className={styles.filterDropdownBtn}
                  onClick={() => { setShowSortDropdown(!showSortDropdown); setShowFilterDropdown(false); }}
                >
                  <ArrowUpDown size={16} />
                  <span>
                    {sortBy === "newest" && "Neueste"}
                    {sortBy === "oldest" && "Älteste"}
                    {sortBy === "a-z" && "A-Z"}
                    {sortBy === "z-a" && "Z-A"}
                  </span>
                  <ChevronDown size={14} className={showSortDropdown ? styles.chevronUp : ""} />
                </button>
                {showSortDropdown && (
                  <div className={styles.filterDropdown}>
                    <button
                      className={`${styles.filterDropdownItem} ${sortBy === "newest" ? styles.filterDropdownItemActive : ""}`}
                      onClick={() => { setSortBy("newest"); setShowSortDropdown(false); }}
                    >
                      Neueste zuerst
                    </button>
                    <button
                      className={`${styles.filterDropdownItem} ${sortBy === "oldest" ? styles.filterDropdownItemActive : ""}`}
                      onClick={() => { setSortBy("oldest"); setShowSortDropdown(false); }}
                    >
                      Älteste zuerst
                    </button>
                    <button
                      className={`${styles.filterDropdownItem} ${sortBy === "a-z" ? styles.filterDropdownItemActive : ""}`}
                      onClick={() => { setSortBy("a-z"); setShowSortDropdown(false); }}
                    >
                      Titel A-Z
                    </button>
                    <button
                      className={`${styles.filterDropdownItem} ${sortBy === "z-a" ? styles.filterDropdownItemActive : ""}`}
                      onClick={() => { setSortBy("z-a"); setShowSortDropdown(false); }}
                    >
                      Titel Z-A
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Batch Actions Bar */}
        <AnimatePresence>
          {selectedEnvelopeIds.length > 0 && (
            <motion.div
              className={styles.batchActionsBar}
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
            >
              <div className={styles.batchActionsContent}>
                <div className={styles.batchSelectionInfo}>
                  <CheckSquare size={20} className={styles.batchIcon} />
                  <span className={styles.batchCount}>
                    {selectedEnvelopeIds.length} ausgewählt
                  </span>
                  <button
                    className={styles.batchDeselectBtn}
                    onClick={handleDeselectAll}
                    title="Auswahl aufheben"
                  >
                    <X size={16} />
                  </button>
                </div>
                <div className={styles.batchActions}>
                  {activeFilter !== "archived" ? (
                    <>
                      <button
                        className={styles.batchActionBtn}
                        onClick={handleBatchRemind}
                        title="Erinnerungen versenden"
                      >
                        <Send size={18} />
                        <span>Erinnern</span>
                      </button>
                      <button
                        className={styles.batchActionBtn}
                        onClick={handleBatchDownload}
                        title="Alle herunterladen"
                      >
                        <Download size={18} />
                        <span>Download</span>
                      </button>
                      <button
                        className={styles.batchActionBtn}
                        onClick={handleBatchExport}
                        title="Als CSV exportieren"
                      >
                        <FileSpreadsheet size={18} />
                        <span>CSV</span>
                      </button>
                      <button
                        className={styles.batchActionBtn}
                        onClick={handleBatchArchive}
                        title="Ausgewählte archivieren"
                      >
                        <Archive size={18} />
                        <span>Archiv</span>
                      </button>
                      <button
                        className={`${styles.batchActionBtn} ${styles.batchActionBtnDanger}`}
                        onClick={handleBatchDelete}
                        title="Ausgewählte stornieren"
                      >
                        <Trash2 size={18} />
                        <span>Stornieren</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        className={styles.batchActionBtn}
                        onClick={handleBatchUnarchive}
                        title="Wiederherstellen"
                      >
                        <RotateCcw size={18} />
                        <span>Wiederherstellen</span>
                      </button>
                      <button
                        className={`${styles.batchActionBtn} ${styles.batchActionBtnDanger}`}
                        onClick={handleBatchPermanentDelete}
                        title="Endgültig löschen"
                      >
                        <Trash2 size={18} />
                        <span>Löschen</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Auto-Delete Info Banner für Storniert-Tab */}
        {activeFilter === "cancelled" && filteredEnvelopes.length > 0 && (
          <div className={styles.infoBanner}>
            <AlertCircle size={18} />
            <span>
              Stornierte Anfragen werden nach <strong>30 Tagen</strong> automatisch endgültig gelöscht.
              Nutzen Sie "Wiederherstellen" um eine Anfrage zu retten.
            </span>
          </div>
        )}

        {/* Content Section */}
        <div className={styles.section}>
          {filteredEnvelopes.length === 0 ? (
            <div className={styles.emptyState}>
              {/* Different empty states based on context */}
              {debouncedSearchQuery ? (
                // Search returned no results
                <>
                  <Search size={64} className={styles.emptyIcon} />
                  <h3>Keine Ergebnisse gefunden</h3>
                  <p>Für "{debouncedSearchQuery}" wurden keine Signaturanfragen gefunden.</p>
                  <button
                    className={styles.emptyStateBtn}
                    onClick={() => setSearchQuery("")}
                  >
                    Suche zurücksetzen
                  </button>
                </>
              ) : statusFilter !== "all" ? (
                // Filter returned no results
                <>
                  <Filter size={64} className={styles.emptyIcon} />
                  <h3>Keine Signaturanfragen</h3>
                  <p>Es gibt keine Signaturanfragen mit dem Status "{
                    statusFilter === "DRAFT" ? "Entwurf" :
                    statusFilter === "SENT" ? "Versendet" :
                    statusFilter === "COMPLETED" ? "Abgeschlossen" :
                    statusFilter === "EXPIRED" ? "Abgelaufen" :
                    statusFilter === "VOIDED" ? "Storniert" : statusFilter
                  }".</p>
                  <button
                    className={styles.emptyStateBtn}
                    onClick={() => setStatusFilter("all")}
                  >
                    Filter zurücksetzen
                  </button>
                </>
              ) : activeFilter === "archived" ? (
                // Archive is empty
                <>
                  <Archive size={64} className={styles.emptyIcon} />
                  <h3>Archiv ist leer</h3>
                  <p>Sie haben noch keine Signaturanfragen archiviert.</p>
                  <button
                    className={styles.emptyStateBtn}
                    onClick={() => setActiveFilter("all")}
                  >
                    Alle Anfragen anzeigen
                  </button>
                </>
              ) : activeFilter === "cancelled" ? (
                // Papierkorb ist leer
                <>
                  <Trash2 size={64} className={styles.emptyIcon} />
                  <h3>Papierkorb ist leer</h3>
                  <p>Keine stornierten Signaturanfragen vorhanden.</p>
                  <button
                    className={styles.emptyStateBtn}
                    onClick={() => setActiveFilter("all")}
                  >
                    Alle Anfragen anzeigen
                  </button>
                </>
              ) : activeFilter === "open" ? (
                // No open requests
                <>
                  <CheckCircle size={64} className={`${styles.emptyIcon} ${styles.emptyIconSuccess}`} />
                  <h3>Alles erledigt!</h3>
                  <p>Sie haben keine offenen Signaturanfragen. Erstellen Sie eine neue Anfrage.</p>
                  <button
                    className={styles.emptyStateBtnPrimary}
                    onClick={() => navigate("/signature/new")}
                  >
                    <Plus size={18} />
                    Neue Signaturanfrage
                  </button>
                </>
              ) : activeFilter === "completed" ? (
                // No completed requests
                <>
                  <FileText size={64} className={styles.emptyIcon} />
                  <h3>Noch keine abgeschlossenen Anfragen</h3>
                  <p>Sobald Ihre Signaturanfragen vollständig unterschrieben sind, erscheinen sie hier.</p>
                  <button
                    className={styles.emptyStateBtn}
                    onClick={() => setActiveFilter("all")}
                  >
                    Alle Anfragen anzeigen
                  </button>
                </>
              ) : (
                // No envelopes at all - first time user
                <>
                  <Mail size={64} className={styles.emptyIcon} />
                  <h3>Willkommen bei Digitale Signaturen</h3>
                  <p>Erstellen Sie Ihre erste Signaturanfrage und lassen Sie Dokumente rechtssicher unterschreiben.</p>
                  <button
                    className={styles.emptyStateBtnPrimary}
                    onClick={() => navigate("/signature/new")}
                  >
                    <Plus size={18} />
                    Erste Signaturanfrage erstellen
                  </button>
                </>
              )}
            </div>
          ) : (
            <>
              {/* Mobile View - Cards */}
              {isMobile && (
                <div className={`${styles.cardsContainer} ${selectedEnvelopeIds.length > 0 ? styles.cardsContainerWithBatchBar : ''}`}>
                  <AnimatePresence>
                    {filteredEnvelopes.map((envelope) => (
                      <motion.div
                        key={envelope._id}
                        className={styles.card}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.2 }}
                      >
                        {/* Card Header */}
                        <div className={styles.cardHeader}>
                          <div className={styles.cardHeaderLeft}>
                            <button
                              className={styles.cardCheckbox}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectEnvelope(envelope._id);
                              }}
                              aria-label="Envelope auswählen"
                            >
                              {selectedEnvelopeIds.includes(envelope._id) ? (
                                <CheckSquare size={20} className={styles.checkboxChecked} />
                              ) : (
                                <Square size={20} className={styles.checkboxUnchecked} />
                              )}
                            </button>
                            <h3
                              className={styles.cardTitle}
                              onClick={() => setSelectedEnvelope(envelope)}
                              style={{ cursor: "pointer" }}
                            >
                              {envelope.title}
                            </h3>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                            <span className={`${styles.statusBadge} ${getStatusColor(envelope.status)}`}>
                              {getStatusLabel(envelope.status)}
                            </span>
                            {/* ✅ COMPLETED: Zeige Abschluss-Datum beim Status (rechts unter Badge) */}
                            {(envelope.status === "COMPLETED" || envelope.status === "SIGNED") && envelope.completedAt && (
                              <span style={{
                                color: '#10b981',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}>
                                <CheckCircle size={12} />
                                {formatDate(envelope.completedAt)}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Progress Bar */}
                        {envelope.status === "SENT" && (
                          <div className={styles.progressBarContainer}>
                            <div className={styles.progressBarLabel}>
                              <span>Signatur-Fortschritt</span>
                              <span>{getSignerProgress(envelope.signers)}</span>
                            </div>
                            <div className={styles.progressBar}>
                              <motion.div
                                className={styles.progressBarFill}
                                initial={{ width: 0 }}
                                animate={{ width: `${getProgressPercentage(envelope.signers)}%` }}
                                transition={{ duration: 0.5, ease: "easeOut" }}
                              />
                            </div>
                          </div>
                        )}

                        {/* Card Body */}
                        <div className={styles.cardBody}>
                          <div className={styles.cardRow}>
                            <User size={14} />
                            <span className={styles.cardLabel}>Empfänger:</span>
                            <span className={styles.cardValue}>
                              {getSignerProgress(envelope.signers)} signiert
                            </span>
                          </div>

                          <div className={styles.cardRow}>
                            <Calendar size={14} />
                            <span className={styles.cardLabel}>Erstellt:</span>
                            <span className={styles.cardValue}>
                              {formatDate(envelope.createdAt)}
                            </span>
                          </div>

                          {envelope.expiresAt && (
                            <div className={styles.cardRow}>
                              <Clock size={14} />
                              <span className={styles.cardLabel}>Läuft ab:</span>
                              <span className={styles.cardValue}>
                                {formatDate(envelope.expiresAt)}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Card Actions */}
                        <div className={styles.cardActions} onClick={(e) => e.stopPropagation()}>
                          {/* ✅ FIX: Different actions for completed vs. pending envelopes */}
                          {(envelope.status === "COMPLETED" || envelope.status === "SIGNED") ? (
                            <>
                              {/* Abgeschlossen: PDF-Buttons */}
                              {envelope.s3Key && (
                                <button
                                  className={styles.actionBtnSmall}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleViewPDF(envelope, false);
                                  }}
                                  title="Original-PDF anzeigen"
                                >
                                  <FileText size={14} />
                                  Original-PDF
                                </button>
                              )}
                              {envelope.s3KeySealed && (
                                <button
                                  className={styles.actionBtnSmall}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleViewPDF(envelope, true);
                                  }}
                                  title="Signierte PDF herunterladen"
                                >
                                  <FileDown size={14} />
                                  Signierte PDF
                                </button>
                              )}
                            </>
                          ) : (
                            <>
                              {/* Ausstehend: Link-Buttons für PENDING signers - NUR ICONS */}
                              {envelope.signers
                                .filter(signer => signer.status === "PENDING")
                                .map((signer, idx) => (
                                  <button
                                    key={idx}
                                    className={styles.actionBtnIcon}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleCopyLink(signer.token);
                                    }}
                                    title={`Link kopieren für ${signer.name}`}
                                  >
                                    <Copy size={16} />
                                  </button>
                                ))}
                              {envelope.status === "SENT" && (
                                <>
                                  <button
                                    className={styles.actionBtnIcon}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRemind(envelope._id);
                                    }}
                                    title="Erinnerung senden"
                                  >
                                    <Send size={16} />
                                  </button>
                                  <button
                                    className={`${styles.actionBtnIcon} ${styles.actionBtnDanger}`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleCancel(envelope._id, envelope.title);
                                    }}
                                    title="Stornieren"
                                  >
                                    <XCircle size={16} />
                                  </button>
                                </>
                              )}
                            </>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}

              {/* Desktop View - Table */}
              {!isMobile && (
                <div className={styles.tableContainer}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th style={{ width: "42px" }}>
                          <button
                            className={styles.tableCheckbox}
                            onClick={selectedEnvelopeIds.length === filteredEnvelopes.length ? handleDeselectAll : handleSelectAll}
                            title={selectedEnvelopeIds.length === filteredEnvelopes.length ? "Alle abwählen" : "Alle auswählen"}
                          >
                            {selectedEnvelopeIds.length === filteredEnvelopes.length ? (
                              <CheckSquare size={18} className={styles.checkboxChecked} />
                            ) : (
                              <Square size={18} className={styles.checkboxUnchecked} />
                            )}
                          </button>
                        </th>
                        <th style={{ width: "32%" }}>Titel</th>
                        <th style={{ width: "18%" }}>Empfänger</th>
                        <th style={{ width: "12%" }}>Status</th>
                        <th style={{ width: "10%" }}>Erstellt</th>
                        <th style={{ width: "10%" }}>Läuft ab</th>
                        <th style={{ width: "12%" }}>Aktionen</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredEnvelopes.map((envelope) => (
                        <motion.tr
                          key={envelope._id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className={selectedEnvelopeIds.includes(envelope._id) ? styles.rowSelected : ""}
                        >
                          <td onClick={(e) => e.stopPropagation()}>
                            <button
                              className={styles.tableCheckbox}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectEnvelope(envelope._id);
                              }}
                              aria-label="Envelope auswählen"
                            >
                              {selectedEnvelopeIds.includes(envelope._id) ? (
                                <CheckSquare size={18} className={styles.checkboxChecked} />
                              ) : (
                                <Square size={18} className={styles.checkboxUnchecked} />
                              )}
                            </button>
                          </td>
                          <td
                            onClick={() => setSelectedEnvelope(envelope)}
                            style={{ cursor: "pointer" }}
                          >
                            <div className={styles.titleCell}>
                              <FileText size={16} className={styles.fileIcon} />
                              <span>{envelope.title}</span>
                            </div>
                          </td>
                          <td
                            onClick={() => setSelectedEnvelope(envelope)}
                            style={{ cursor: "pointer" }}
                          >
                            <div className={styles.signersCell}>
                              {envelope.signers.map((signer, idx) => (
                                <div key={idx} className={styles.signerRow}>
                                  <span className={styles.signerName}>
                                    {signer.name}
                                  </span>
                                  <span className={`${styles.signerStatus} ${signer.status === "SIGNED" ? styles.signerStatusSigned : ""}`}>
                                    {signer.status === "SIGNED" ? "✓ Signiert" : "○ Ausstehend"}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </td>
                          <td
                            onClick={() => setSelectedEnvelope(envelope)}
                            style={{ cursor: "pointer" }}
                          >
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              <span className={`${styles.statusBadge} ${getStatusColor(envelope.status)}`}>
                                {getStatusLabel(envelope.status)}
                              </span>
                              {/* ✅ COMPLETED: Zeige Abschluss-Datum unter Status Badge */}
                              {(envelope.status === "COMPLETED" || envelope.status === "SIGNED") && envelope.completedAt && (
                                <span style={{
                                  color: '#10b981',
                                  fontSize: '0.8rem',
                                  fontWeight: 600,
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}>
                                  <CheckCircle size={12} />
                                  {formatDate(envelope.completedAt)}
                                </span>
                              )}
                            </div>
                          </td>
                          <td
                            onClick={() => setSelectedEnvelope(envelope)}
                            style={{ cursor: "pointer" }}
                          >
                            {formatDate(envelope.createdAt)}
                          </td>
                          <td
                            onClick={() => setSelectedEnvelope(envelope)}
                            style={{ cursor: "pointer" }}
                          >
                            {envelope.expiresAt ? formatDate(envelope.expiresAt) : "-"}
                          </td>
                          <td onClick={(e) => e.stopPropagation()}>
                            <div className={styles.actionsCell}>
                              {/* ✅ FIX: Different actions for completed vs. pending envelopes */}
                              {(envelope.status === "COMPLETED" || envelope.status === "SIGNED") ? (
                                <>
                                  {/* Abgeschlossen: PDF-Buttons */}
                                  {envelope.s3Key && (
                                    <button
                                      className={styles.actionBtn}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleViewPDF(envelope, false);
                                      }}
                                      title="Original-PDF anzeigen"
                                    >
                                      <FileText size={14} />
                                    </button>
                                  )}
                                  {envelope.s3KeySealed && (
                                    <button
                                      className={styles.actionBtn}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleViewPDF(envelope, true);
                                      }}
                                      title="Signierte PDF herunterladen"
                                    >
                                      <FileDown size={14} />
                                    </button>
                                  )}
                                </>
                              ) : envelope.status === "DRAFT" ? (
                                <>
                                  {/* Entwurf: Bearbeiten-Button */}
                                  <button
                                    className={`${styles.actionBtn} ${styles.actionBtnPrimary}`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigate(`/signature/place-fields/${envelope._id}`);
                                    }}
                                    title="Entwurf bearbeiten"
                                  >
                                    <Edit size={14} />
                                  </button>
                                  <button
                                    className={`${styles.actionBtn} ${styles.actionBtnDanger}`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleCancel(envelope._id, envelope.title);
                                    }}
                                    title="Entwurf löschen"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </>
                              ) : envelope.status === "VOIDED" ? (
                                <>
                                  {/* Storniert: Wiederherstellen + Endgültig löschen */}
                                  <button
                                    className={`${styles.actionBtn} ${styles.actionBtnPrimary}`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRestore(envelope._id, envelope.title);
                                    }}
                                    title="Wiederherstellen"
                                  >
                                    <RotateCcw size={14} />
                                  </button>
                                  <button
                                    className={`${styles.actionBtn} ${styles.actionBtnDanger}`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleHardDelete(envelope._id, envelope.title);
                                    }}
                                    title="Endgültig löschen"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </>
                              ) : (
                                <>
                                  {/* Ausstehend: Link-Buttons für PENDING signers */}
                                  {envelope.signers
                                    .filter(signer => signer.status === "PENDING")
                                    .map((signer, idx) => (
                                      <button
                                        key={idx}
                                        className={styles.actionBtn}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleCopyLink(signer.token);
                                        }}
                                        title={`Link kopieren für ${signer.name}`}
                                      >
                                        <Copy size={14} />
                                      </button>
                                    ))}
                                  {envelope.status === "SENT" && (
                                    <>
                                      <button
                                        className={styles.actionBtn}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleRemind(envelope._id);
                                        }}
                                        title="Erinnerung senden"
                                      >
                                        <Send size={14} />
                                      </button>
                                      <button
                                        className={`${styles.actionBtn} ${styles.actionBtnDanger}`}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleCancel(envelope._id, envelope.title);
                                        }}
                                        title="Stornieren"
                                      >
                                        <XCircle size={14} />
                                      </button>
                                    </>
                                  )}
                                </>
                              )}
                            </div>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Load More Button */}
              {hasMore && (
                <div className={styles.loadMoreContainer}>
                  <button
                    className={styles.loadMoreBtn}
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                  >
                    {loadingMore ? (
                      <>
                        <Loader size={16} className={styles.loadingSpinner} />
                        Lade mehr...
                      </>
                    ) : (
                      <>
                        <RefreshCw size={16} />
                        Mehr laden
                      </>
                    )}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Detail Drawer */}
      <AnimatePresence>
        {selectedEnvelope && (
          <>
            {/* Overlay */}
            <motion.div
              className={styles.drawerOverlay}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedEnvelope(null)}
            />

            {/* Drawer */}
            <motion.div
              className={styles.drawer}
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
            >
              {/* Header */}
              <div className={styles.drawerHeader}>
                <div className={styles.drawerTitle}>
                  <h2>{selectedEnvelope.title}</h2>
                  <p className={styles.drawerSubtitle}>
                    Signaturanfrage-Details
                  </p>
                </div>
                <button
                  className={styles.closeBtn}
                  onClick={() => setSelectedEnvelope(null)}
                  aria-label="Schließen"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Content */}
              <div className={styles.drawerContent}>
                {/* Quick Actions */}
                <div className={styles.drawerSection}>
                  <h3 className={styles.sectionTitle}>
                    <Share2 size={18} />
                    Schnellaktionen
                  </h3>
                  <div className={styles.actionGrid}>
                    {/* Weiter bearbeiten - nur bei Entwürfen */}
                    {selectedEnvelope.status === "DRAFT" && (
                      <button
                        className={`${styles.quickActionBtn} ${styles.quickActionPrimary}`}
                        onClick={() => navigate(`/signature/place-fields/${selectedEnvelope._id}`)}
                        title="Entwurf weiter bearbeiten"
                      >
                        <Edit size={20} />
                        <span>Weiter bearbeiten</span>
                      </button>
                    )}
                    {/* Wiederherstellen + Endgültig löschen - nur bei Stornierten */}
                    {selectedEnvelope.status === "VOIDED" && (
                      <>
                        <button
                          className={`${styles.quickActionBtn} ${styles.quickActionPrimary}`}
                          onClick={() => handleRestore(selectedEnvelope._id, selectedEnvelope.title)}
                          title="Wiederherstellen"
                        >
                          <RotateCcw size={20} />
                          <span>Wiederherstellen</span>
                        </button>
                        <button
                          className={`${styles.quickActionBtn} ${styles.quickActionDanger}`}
                          onClick={() => handleHardDelete(selectedEnvelope._id, selectedEnvelope.title)}
                          title="Endgültig löschen"
                        >
                          <Trash2 size={20} />
                          <span>Endgültig löschen</span>
                        </button>
                      </>
                    )}
                    <button
                      className={styles.quickActionBtn}
                      onClick={() => handleDownloadPDF(selectedEnvelope, false)}
                      title="Original-PDF herunterladen"
                    >
                      <Download size={20} />
                      <span>Original herunterladen</span>
                    </button>
                    {selectedEnvelope.s3KeySealed && (
                      <button
                        className={styles.quickActionBtn}
                        onClick={() => handleDownloadPDF(selectedEnvelope, true)}
                        title="Signiertes PDF herunterladen"
                      >
                        <FileDown size={20} />
                        <span>Signiert herunterladen</span>
                      </button>
                    )}
                    <button
                      className={styles.quickActionBtn}
                      onClick={() => handleDuplicate(selectedEnvelope)}
                      title="Als Vorlage duplizieren"
                    >
                      <RefreshCw size={20} />
                      <span>Duplizieren</span>
                    </button>
                    <button
                      className={styles.quickActionBtn}
                      onClick={() => handleExportAuditLog(selectedEnvelope)}
                      title="Audit-Log exportieren"
                    >
                      <FileDown size={20} />
                      <span>Audit-Log</span>
                    </button>
                  </div>
                </div>

                {/* Info Grid */}
                <div className={styles.drawerSection}>
                  <div className={styles.infoGrid}>
                    <div className={styles.infoCard}>
                      <p className={styles.infoLabel}>
                        <FileText size={14} />
                        Status
                      </p>
                      <p className={styles.infoValue}>
                        {getStatusLabel(selectedEnvelope.status)}
                      </p>
                    </div>
                    <div className={styles.infoCard}>
                      <p className={styles.infoLabel}>
                        <User size={14} />
                        Empfänger
                      </p>
                      <p className={styles.infoValue}>
                        {getSignerProgress(selectedEnvelope.signers)} signiert
                      </p>
                    </div>
                    <div className={styles.infoCard}>
                      <p className={styles.infoLabel}>
                        <Calendar size={14} />
                        Erstellt
                      </p>
                      <p className={styles.infoValue}>
                        {formatDate(selectedEnvelope.createdAt)}
                      </p>
                    </div>
                    <div className={styles.infoCard}>
                      <p className={styles.infoLabel}>
                        <Clock size={14} />
                        Läuft ab
                      </p>
                      <p className={styles.infoValue}>
                        {selectedEnvelope.expiresAt
                          ? formatDate(selectedEnvelope.expiresAt)
                          : "Kein Ablaufdatum"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Document Preview */}
                <div className={styles.drawerSection}>
                  <h3 className={styles.sectionTitle}>
                    <FileText size={18} />
                    Dokumente
                  </h3>
                  <div className={styles.documentButtons}>
                    {/* Original PDF Button */}
                    <button
                      className={styles.documentButton}
                      onClick={() => handleViewPDF(selectedEnvelope)}
                      disabled={loadingPdf}
                    >
                      <FileText size={20} />
                      <div className={styles.documentButtonContent}>
                        <strong>Original-PDF</strong>
                        <span>Ursprüngliches Dokument</span>
                      </div>
                    </button>

                    {/* Signed PDF Button */}
                    {selectedEnvelope.status === "COMPLETED" && selectedEnvelope.s3KeySealed ? (
                      <button
                        className={`${styles.documentButton} ${styles.signedDocument}`}
                        onClick={() => handleViewPDF(selectedEnvelope, true)}
                        disabled={loadingPdf}
                      >
                        <CheckCircle size={20} />
                        <div className={styles.documentButtonContent}>
                          <strong>Signiertes Dokument</strong>
                          <span>Mit Unterschriften</span>
                        </div>
                      </button>
                    ) : (
                      <button
                        className={`${styles.documentButton} ${styles.disabledDocument}`}
                        disabled
                        title="Signiertes Dokument ist noch nicht verfügbar"
                      >
                        <Clock size={20} />
                        <div className={styles.documentButtonContent}>
                          <strong>Signiertes Dokument</strong>
                          <span>Noch nicht verfügbar</span>
                        </div>
                      </button>
                    )}
                  </div>
                </div>

                {/* Signer Details */}
                <div className={styles.drawerSection}>
                  <h3 className={styles.sectionTitle}>
                    <User size={18} />
                    Unterzeichner ({selectedEnvelope.signers.length})
                  </h3>
                  <div className={styles.signerDetailsList}>
                    {selectedEnvelope.signers.map((signer, idx) => (
                      <div
                        key={idx}
                        className={`${styles.signerDetailCard} ${
                          signer.status === "SIGNED" ? styles.signed : styles.pending
                        }`}
                      >
                        <div className={styles.signerHeader}>
                          <div className={styles.signerInfo}>
                            <h4 className={styles.signerName}>{signer.name}</h4>
                            <p className={styles.signerEmail}>{signer.email}</p>
                          </div>
                          <span
                            className={`${styles.signerBadge} ${
                              signer.status === "SIGNED"
                                ? styles.signed
                                : styles.pending
                            }`}
                          >
                            {signer.status === "SIGNED" ? (
                              <>
                                <CheckCircle size={14} />
                                Signiert
                              </>
                            ) : (
                              <>
                                <Clock size={14} />
                                Ausstehend
                              </>
                            )}
                          </span>
                        </div>
                        <div className={styles.signerMeta}>
                          <div className={styles.signerMetaRow}>
                            <User size={14} />
                            <span>Rolle: {signer.role}</span>
                          </div>
                          <div className={styles.signerMetaRow}>
                            <Calendar size={14} />
                            <span>Reihenfolge: #{signer.order}</span>
                          </div>
                          {signer.status === "SIGNED" && signer.signedAt && (
                            <div className={styles.signerMetaRow}>
                              <CheckCircle size={14} />
                              <span>
                                Signiert am: {formatDateTime(signer.signedAt)}
                              </span>
                            </div>
                          )}
                          {signer.status === "PENDING" && (
                            <div className={styles.signerMetaRow}>
                              <Clock size={14} />
                              <span>
                                Link läuft ab: {formatDateTime(signer.tokenExpires)}
                              </span>
                            </div>
                          )}
                        </div>
                        {signer.status === "PENDING" && (
                          <div className={styles.signerActions}>
                            <button
                              className={styles.actionBtnSmall}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditSigner(signer, idx);
                              }}
                              title="Unterzeichner bearbeiten"
                            >
                              <Edit size={14} />
                              Bearbeiten
                            </button>
                            <button
                              className={styles.actionBtnSmall}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopyLink(signer.token);
                              }}
                            >
                              <Copy size={14} />
                              Link
                            </button>
                            <button
                              className={styles.actionBtnSmall}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleGenerateQRCode(signer);
                              }}
                            >
                              <QrCode size={14} />
                              QR
                            </button>
                            <button
                              className={styles.actionBtnSmall}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemindIndividual(selectedEnvelope._id, signer.email);
                              }}
                            >
                              <Send size={14} />
                              Erinnern
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Timeline */}
                <div className={styles.drawerSection}>
                  <h3 className={styles.sectionTitle}>
                    <Activity size={18} />
                    Aktivitätsverlauf
                  </h3>
                  <div className={styles.timeline}>
                    {generateTimelineEvents(selectedEnvelope).map((event, idx) => (
                      <div
                        key={idx}
                        className={`${styles.timelineItem} ${
                          event.type === "completed"
                            ? styles.completed
                            : styles.pending
                        }`}
                      >
                        <div className={styles.timelineContent}>
                          <h4 className={styles.timelineTitle}>{event.title}</h4>
                          <p className={styles.timelineDescription}>
                            {event.description}
                          </p>
                          <p className={styles.timelineTime}>
                            <Clock size={12} />
                            {formatDateTime(event.time)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Internal Notes */}
                <div className={styles.drawerSection}>
                  <h3 className={styles.sectionTitle}>
                    <StickyNote size={18} />
                    Interne Notizen
                    {savingNote && <span className={styles.savingIndicator}>Speichern...</span>}
                  </h3>
                  <div className={styles.noteContainer}>
                    <textarea
                      className={styles.noteTextarea}
                      placeholder="Interne Notizen (nicht sichtbar für Unterzeichner)..."
                      value={internalNote}
                      onChange={(e) => setInternalNote(e.target.value.slice(0, 500))}
                      maxLength={500}
                    />
                    <div className={styles.noteFooter}>
                      <span className={styles.charCount}>
                        {internalNote.length} / 500 Zeichen
                      </span>
                      <span className={styles.noteHint}>
                        💡 Automatisch gespeichert
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* PDF Viewer Modal */}
      {showPDFViewer && pdfUrl && (
        <PDFViewer
          pdfUrl={pdfUrl}
          title={pdfTitle}
          onClose={() => {
            setShowPDFViewer(false);
            setPdfUrl(null);
            setPdfTitle("");
          }}
        />
      )}

      {/* QR Code Modal */}
      <AnimatePresence>
        {showQRCode && (
          <motion.div
            className={styles.modalOverlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowQRCode(false)}
          >
            <motion.div
              className={styles.qrCodeModal}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={styles.qrCodeHeader}>
                <h3>QR-Code für mobile Signatur</h3>
                <button
                  className={styles.closeBtn}
                  onClick={() => setShowQRCode(false)}
                >
                  <X size={20} />
                </button>
              </div>
              <div className={styles.qrCodeContent}>
                <QRCodeCanvas
                  value={qrCodeUrl}
                  size={256}
                  level="H"
                  includeMargin={true}
                />
                <p className={styles.qrCodeText}>
                  Scannen Sie diesen QR-Code mit Ihrem Smartphone, um das Dokument mobil zu signieren.
                </p>
                <div className={styles.qrCodeUrl}>
                  <code>{qrCodeUrl}</code>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Signer Modal */}
      <AnimatePresence>
        {showSignerEdit && editingSigner && (
          <motion.div
            className={styles.modalOverlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowSignerEdit(false)}
          >
            <motion.div
              className={styles.qrCodeModal}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={styles.qrCodeHeader}>
                <h3>Unterzeichner bearbeiten</h3>
                <button
                  className={styles.closeBtn}
                  onClick={() => setShowSignerEdit(false)}
                >
                  <X size={20} />
                </button>
              </div>
              <div className={styles.qrCodeContent}>
                <div className={styles.editForm}>
                  <div className={styles.formGroup}>
                    <label htmlFor="signerName">Name</label>
                    <input
                      id="signerName"
                      type="text"
                      value={newSignerName}
                      onChange={(e) => setNewSignerName(e.target.value)}
                      placeholder="Name des Unterzeichners"
                      className={styles.formInput}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label htmlFor="signerEmail">E-Mail</label>
                    <input
                      id="signerEmail"
                      type="email"
                      value={newSignerEmail}
                      onChange={(e) => setNewSignerEmail(e.target.value)}
                      placeholder="email@beispiel.de"
                      className={styles.formInput}
                    />
                  </div>
                  <p className={styles.editWarning}>
                    ⚠️ Achtung: Wenn Sie die E-Mail-Adresse ändern, wird ein neuer Link generiert und an die neue Adresse gesendet.
                  </p>
                  <button
                    className={styles.saveBtn}
                    onClick={handleUpdateSigner}
                  >
                    <Save size={18} />
                    Änderungen speichern
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirmation Dialog Modal */}
      <AnimatePresence>
        {confirmDialog?.isOpen && (
          <motion.div
            className={styles.modalOverlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setConfirmDialog(null)}
          >
            <motion.div
              className={styles.confirmModal}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={styles.confirmIcon}>
                {confirmDialog.confirmStyle === "danger" ? (
                  <Trash2 size={32} />
                ) : (
                  <AlertCircle size={32} />
                )}
              </div>
              <h3 className={styles.confirmTitle}>{confirmDialog.title}</h3>
              <p className={styles.confirmMessage}>{confirmDialog.message}</p>
              <div className={styles.confirmActions}>
                <button
                  className={styles.confirmCancelBtn}
                  onClick={() => setConfirmDialog(null)}
                >
                  Abbrechen
                </button>
                <button
                  className={`${styles.confirmBtn} ${
                    confirmDialog.confirmStyle === "danger" ? styles.confirmBtnDanger :
                    confirmDialog.confirmStyle === "warning" ? styles.confirmBtnWarning :
                    styles.confirmBtnPrimary
                  }`}
                  onClick={confirmDialog.onConfirm}
                >
                  {confirmDialog.confirmText}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast Container for Notifications */}
      <ToastContainer
        position="top-right"
        autoClose={4000}
        hideProgressBar={false}
        newestOnTop={true}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
    </div>
  );
}
