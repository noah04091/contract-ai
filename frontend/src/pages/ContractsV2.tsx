// 📄 src/pages/ContractsV2.tsx
//
// Schritt 1 + 2 — Skelett der neuen Vertragsverwaltung.
// Read-Only-Liste, Detail-Drawer rechts, Tabellen-Aktionen (👁 + ⋯).
// Eigenständige Datei. V1 (pages/Contracts.tsx) wird NICHT angefasst.
// Plan: memory/project_contracts-v2-redesign.md

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  FileText,
  Upload,
  Mail,
  Search,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Eye,
  MoreHorizontal,
  Edit3,
  Trash2,
  X,
  Bell,
  Sparkles,
  Folder,
  ChevronUp,
  ChevronDown,
  Zap,
  Loader,
  CheckSquare,
  Square,
  Download,
} from "lucide-react";

import NewContractDetailsModal from "../components/NewContractDetailsModal";
import ContractEditModal from "../components/ContractEditModal";
import ReminderSettingsModal from "../components/ReminderSettingsModal";
import { apiCall } from "../utils/api";
import { fixUtf8Display } from "../utils/textUtils";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../context/ToastContext";
import { useFolders } from "../hooks/useFolders";
import type { FolderType } from "../components/FolderBar";

import styles from "../styles/ContractsV2.module.css";

/* =====================================================================
   Types — bewusst minimal gehalten. Wir brauchen nur das, was die Liste
   anzeigt. Das Detail-Modal hat sein eigenes, vollständiges Interface.
   ===================================================================== */
interface Contract {
  _id: string;
  name: string;
  status?: string;
  expiryDate?: string;
  kuendigung?: string;
  laufzeit?: string;
  contractType?: string;
  provider?: { displayName?: string; category?: string };
  createdAt: string;
  isGenerated?: boolean;
  isOptimized?: boolean;
  contractScore?: number;
  summary?: string;
  risiken?: Array<string | { title?: string; description?: string }>;
  paymentAmount?: number;
  paymentFrequency?: string;
  folderId?: string | null;
  analyzed?: boolean;
  legalAssessment?: string;
  suggestions?: string;
  reminderDays?: number[];
  reminderSettings?: Array<{
    type: "expiry" | "cancellation" | "custom";
    days: number;
    targetDate?: string;
    label?: string;
  }>;
  // wird vom Modal weiterverwendet — wir reichen den ganzen Contract durch
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

type StatusTone = "ok" | "warn" | "bad" | "muted" | "accent";
type SortDir = "asc" | "desc";

/* =====================================================================
   Spalten-Konfigurator — 3 freie Slots zwischen Vertrag und Status.
   Persistiert in user.uiPreferences.contractColumns (geteilt mit V1's
   eckdatenLabels — Migration aus alten Labels in Slot A/B).
   ===================================================================== */
type ColumnFieldKey =
  | "provider"        // Anbieter (provider.displayName)
  | "contractType"    // Vertragstyp (contractType / provider.category)
  | "contractNumber"  // Vertragsnummer
  | "laufzeit"        // Laufzeit
  | "kuendigung"      // Kündigung
  | "expiry"          // Ablauf (Resttage + Datum, farblich)
  | "startDate"       // Vertragsbeginn
  | "payment"         // Zahlung (€/Frequenz)
  | "createdAt"       // Hochgeladen
  | "remaining"       // Restlaufzeit (Tage, computed)
  | "folder";         // Ordner-Name

interface ColumnConfig {
  title: string;
  field: ColumnFieldKey;
}

const FIELD_OPTIONS: { key: ColumnFieldKey; label: string; defaultTitle: string }[] = [
  { key: "provider", label: "Anbieter / Vertragspartner", defaultTitle: "Anbieter" },
  { key: "contractType", label: "Vertragstyp", defaultTitle: "Vertragstyp" },
  { key: "contractNumber", label: "Vertragsnummer", defaultTitle: "Nummer" },
  { key: "laufzeit", label: "Laufzeit", defaultTitle: "Laufzeit" },
  { key: "kuendigung", label: "Kündigungsfrist", defaultTitle: "Kündigung" },
  { key: "expiry", label: "Ablaufdatum + Resttage", defaultTitle: "Ablauf" },
  { key: "remaining", label: "Restlaufzeit (Tage)", defaultTitle: "Rest" },
  { key: "startDate", label: "Vertragsbeginn", defaultTitle: "Beginn" },
  { key: "payment", label: "Zahlung (€ / Frequenz)", defaultTitle: "Zahlung" },
  { key: "createdAt", label: "Hochgeladen am", defaultTitle: "Hochgeladen" },
  { key: "folder", label: "Ordner-Zuordnung", defaultTitle: "Ordner" },
];

const DEFAULT_COLUMNS: ColumnConfig[] = [
  { title: "Anbieter", field: "provider" },
  { title: "Vertragstyp", field: "contractType" },
  { title: "Ablauf", field: "expiry" },
];

/* =====================================================================
   Pure Helpers — keine Side-Effects, kein State.
   ===================================================================== */

function formatDateShort(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function expiryInfo(iso?: string): { label: string; tone: StatusTone | null } | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const ms = d.getTime() - Date.now();
  const days = Math.ceil(ms / (1000 * 60 * 60 * 24));
  if (days < 0) return { label: "abgelaufen", tone: "bad" };
  if (days === 0) return { label: "heute", tone: "bad" };
  if (days <= 30) return { label: `${days} Tag${days === 1 ? "" : "e"}`, tone: "warn" };
  if (days <= 90) return { label: `${days} Tage`, tone: null };
  const months = Math.round(days / 30);
  return { label: `${months} Monate`, tone: null };
}

function statusInfo(c: Contract): { label: string; tone: StatusTone } {
  if (c.isGenerated) return { label: "Generiert", tone: "accent" };
  if (c.isOptimized) return { label: "Optimiert", tone: "accent" };
  const raw = (c.status || "").toLowerCase();
  if (raw.includes("aktiv")) return { label: "Aktiv", tone: "ok" };
  if (raw.includes("bald")) return { label: "Bald fällig", tone: "warn" };
  if (raw.includes("abgelaufen") || raw.includes("beendet"))
    return { label: "Abgelaufen", tone: "bad" };
  if (raw.includes("kündigt") || raw.includes("kuendigt"))
    return { label: "Gekündigt", tone: "muted" };
  if (raw.includes("entwurf")) return { label: "Entwurf", tone: "muted" };
  if (raw.includes("neu")) return { label: "Neu", tone: "muted" };
  return { label: c.status || "—", tone: "muted" };
}

function pillClass(tone: StatusTone): string {
  switch (tone) {
    case "ok":
      return styles.pillOk;
    case "warn":
      return styles.pillWarn;
    case "bad":
      return styles.pillBad;
    case "accent":
      return styles.pillAccent;
    default:
      return styles.pillMuted;
  }
}

function getProviderLabel(c: Contract): string {
  return c.provider?.displayName || "—";
}

function getContractTypeLabel(c: Contract): string {
  return c.contractType || c.provider?.category || "—";
}

function isMobileViewport(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(max-width: 900px)").matches;
}

function getRiskList(c: Contract): string[] {
  if (!Array.isArray(c.risiken)) return [];
  return c.risiken
    .map((r) => {
      if (typeof r === "string") return r;
      return r?.title || r?.description || "";
    })
    .filter(Boolean);
}

function isAnalyzed(c: Contract): boolean {
  if (c.isGenerated || c.isOptimized) return true;
  if (c.analyzed === true) return true;
  if (c.summary || c.legalAssessment || c.suggestions) return true;
  if (typeof c.contractScore === "number" && c.contractScore > 0) return true;
  if (Array.isArray(c.risiken) && c.risiken.length > 0) return true;
  return false;
}

function isExpiringSoon(c: Contract): boolean {
  if (!c.expiryDate) return false;
  const d = new Date(c.expiryDate);
  if (Number.isNaN(d.getTime())) return false;
  const days = Math.ceil((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  return days >= 0 && days <= 30;
}

function hasActiveReminder(c: Contract): boolean {
  return (
    (Array.isArray(c.reminderSettings) && c.reminderSettings.length > 0) ||
    (Array.isArray(c.reminderDays) && c.reminderDays.length > 0)
  );
}

/* Sortierwert pro Field — funktioniert generisch für jeden Slot. */
function getFieldSortValue(c: Contract, field: ColumnFieldKey | "name" | "status" | "score"): number | string {
  switch (field) {
    case "name":
      return (c.name || "").toLowerCase();
    case "status":
      return statusInfo(c).label;
    case "score":
      return typeof c.contractScore === "number" ? c.contractScore : -1;
    case "provider":
      return (c.provider?.displayName || "").toLowerCase();
    case "contractType":
      return (c.contractType || c.provider?.category || "").toLowerCase();
    case "contractNumber":
      return (c.contractNumber || "").toLowerCase();
    case "laufzeit":
      return (c.laufzeit || "").toLowerCase();
    case "kuendigung":
      return (c.kuendigung || "").toLowerCase();
    case "expiry": {
      return c.expiryDate ? new Date(c.expiryDate).getTime() : Number.POSITIVE_INFINITY;
    }
    case "startDate": {
      return c.startDate ? new Date(c.startDate).getTime() : Number.POSITIVE_INFINITY;
    }
    case "payment":
      return typeof c.paymentAmount === "number" ? c.paymentAmount : -1;
    case "remaining": {
      if (!c.expiryDate) return Number.POSITIVE_INFINITY;
      const d = new Date(c.expiryDate);
      if (Number.isNaN(d.getTime())) return Number.POSITIVE_INFINITY;
      return Math.ceil((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    }
    case "folder":
      return c.folderId || "";
    case "createdAt":
    default: {
      return c.createdAt ? new Date(c.createdAt).getTime() : 0;
    }
  }
}

type SortKey = ColumnFieldKey | "name" | "status" | "score";

function compareContracts(a: Contract, b: Contract, key: SortKey, dir: SortDir): number {
  const factor = dir === "asc" ? 1 : -1;
  const ax = getFieldSortValue(a, key);
  const bx = getFieldSortValue(b, key);
  if (typeof ax === "number" && typeof bx === "number") return (ax - bx) * factor;
  return String(ax).localeCompare(String(bx), "de") * factor;
}

/* =====================================================================
   Component
   ===================================================================== */

export default function ContractsV2() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();
  const { folders, fetchFolders, bulkMoveToFolder } = useFolders();

  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Drawer öffnet bei Single-Click (Desktop). Mobile → öffnet direkt das Modal.
  const [drawerContract, setDrawerContract] = useState<Contract | null>(null);

  // Doppelklick und "Vollständige Details öffnen" → bestehendes V1-Modal
  const [modalContract, setModalContract] = useState<Contract | null>(null);
  const [modalInitialTab, setModalInitialTab] = useState<
    "overview" | "pdf" | "analysis" | undefined
  >(undefined);

  // Quick-Edit-Modal aus V1, wiederverwendet
  const [editContract, setEditContract] = useState<Contract | null>(null);

  // Reminder-Modal (geteilt mit V1)
  const [reminderContract, setReminderContract] = useState<Contract | null>(null);

  // Welche Zeile hat das ⋯-Popover offen? (string = contractId, null = keines)
  const [openPopoverFor, setOpenPopoverFor] = useState<string | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  // Loading-State pro Vertrag für "Jetzt analysieren"
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);

  // Lokale Volltextsuche
  const [query, setQuery] = useState("");

  // Status-Filter über Chips
  type StatusChip = "alle" | "aktiv" | "bald" | "gekündigt" | "generiert" | "nicht_analysiert";
  const [statusChip, setStatusChip] = useState<StatusChip>("alle");

  // Folder-Filter: null = Alle, "unassigned" = ohne Ordner, sonst Folder-ID
  const [activeFolder, setActiveFolder] = useState<string | null>(null);

  // Sortierung
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // Spalten-Konfigurator
  const [columns, setColumns] = useState<ColumnConfig[]>(() => {
    const stored = user?.uiPreferences?.contractColumns as ColumnConfig[] | undefined;
    if (Array.isArray(stored) && stored.length === 3) {
      // Validieren, dass jeder Eintrag ein gültiges Field hat
      const valid = stored.every(
        (c) => c && typeof c.title === "string" && FIELD_OPTIONS.some((o) => o.key === c.field),
      );
      if (valid) return stored;
    }
    // Migration: alte eckdatenLabels aus V1 als Spaltentitel übernehmen
    const oldLabels = user?.uiPreferences?.eckdatenLabels as Record<string, string> | undefined;
    return DEFAULT_COLUMNS.map((col, i) => {
      const t = oldLabels?.[String(i)];
      return t ? { ...col, title: t } : col;
    });
  });
  const [columnPopoverFor, setColumnPopoverFor] = useState<number | null>(null);
  const [columnDraftTitle, setColumnDraftTitle] = useState("");
  const columnPopoverRef = useRef<HTMLDivElement | null>(null);

  // Bulk-Modus
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkFolderDropdownOpen, setBulkFolderDropdownOpen] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);
  const bulkFolderRef = useRef<HTMLDivElement | null>(null);

  /* -------------------------------------------------------------------
     Initial-Fetch
  ------------------------------------------------------------------- */
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    apiCall("/contracts")
      .then((data: unknown) => {
        if (cancelled) return;
        const list: Contract[] = Array.isArray(data)
          ? (data as Contract[])
          : ((data as { contracts?: Contract[] })?.contracts ?? []);
        setContracts(list);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const msg =
          err instanceof Error ? err.message : "Verträge konnten nicht geladen werden.";
        setError(msg);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  /* -------------------------------------------------------------------
     Folders laden (parallel, geteilt mit V1)
  ------------------------------------------------------------------- */
  useEffect(() => {
    fetchFolders();
  }, [fetchFolders]);

  /* -------------------------------------------------------------------
     Click-Outside für Spalten-Popover
  ------------------------------------------------------------------- */
  useEffect(() => {
    if (columnPopoverFor === null) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node | null;
      if (columnPopoverRef.current && target && !columnPopoverRef.current.contains(target)) {
        setColumnPopoverFor(null);
      }
    };
    const t = setTimeout(() => document.addEventListener("mousedown", handler), 0);
    return () => {
      clearTimeout(t);
      document.removeEventListener("mousedown", handler);
    };
  }, [columnPopoverFor]);

  /* -------------------------------------------------------------------
     Click-Outside für Bulk-Folder-Dropdown
  ------------------------------------------------------------------- */
  useEffect(() => {
    if (!bulkFolderDropdownOpen) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node | null;
      if (bulkFolderRef.current && target && !bulkFolderRef.current.contains(target)) {
        setBulkFolderDropdownOpen(false);
      }
    };
    const t = setTimeout(() => document.addEventListener("mousedown", handler), 0);
    return () => {
      clearTimeout(t);
      document.removeEventListener("mousedown", handler);
    };
  }, [bulkFolderDropdownOpen]);

  /* -------------------------------------------------------------------
     Click-Outside für ⋯-Popover
  ------------------------------------------------------------------- */
  useEffect(() => {
    if (!openPopoverFor) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node | null;
      if (popoverRef.current && target && !popoverRef.current.contains(target)) {
        setOpenPopoverFor(null);
      }
    };
    // Mit kleinem Delay, sonst feuert das gleich beim Öffnen.
    const t = setTimeout(() => {
      document.addEventListener("mousedown", handler);
    }, 0);
    return () => {
      clearTimeout(t);
      document.removeEventListener("mousedown", handler);
    };
  }, [openPopoverFor]);

  /* -------------------------------------------------------------------
     Deep-Link via ?view=<id> — wie V1
  ------------------------------------------------------------------- */
  useEffect(() => {
    if (modalContract) return;
    const params = new URLSearchParams(window.location.search);
    const viewId = params.get("view");
    if (!viewId) return;
    const found = contracts.find((c) => c._id === viewId);
    if (found) setModalContract(found);
  }, [contracts, modalContract]);

  /* -------------------------------------------------------------------
     Filter + Sort
  ------------------------------------------------------------------- */
  const chipMatches = (c: Contract, chip: StatusChip): boolean => {
    if (chip === "alle") return true;
    if (chip === "generiert") return !!c.isGenerated || !!c.isOptimized;
    if (chip === "nicht_analysiert") return !isAnalyzed(c);
    const tone = statusInfo(c).tone;
    if (chip === "aktiv") return tone === "ok";
    if (chip === "bald") return tone === "warn";
    if (chip === "gekündigt") return tone === "muted";
    return true;
  };

  const folderMatches = (c: Contract, folder: string | null): boolean => {
    if (folder === null) return true;
    if (folder === "unassigned") return !c.folderId;
    return c.folderId === folder;
  };

  // Counts werden auf der Basis des Folder-Filters berechnet — so zeigen
  // die Chips nur, was im aktuellen Ordner-Kontext sichtbar wäre.
  const folderScoped = useMemo(
    () => contracts.filter((c) => folderMatches(c, activeFolder)),
    [contracts, activeFolder],
  );

  const counts = useMemo(() => {
    const result = {
      alle: folderScoped.length,
      aktiv: 0,
      bald: 0,
      gekündigt: 0,
      generiert: 0,
      nicht_analysiert: 0,
    };
    for (const c of folderScoped) {
      if (chipMatches(c, "aktiv")) result.aktiv++;
      if (chipMatches(c, "bald")) result.bald++;
      if (chipMatches(c, "gekündigt")) result.gekündigt++;
      if (chipMatches(c, "generiert")) result.generiert++;
      if (chipMatches(c, "nicht_analysiert")) result.nicht_analysiert++;
    }
    return result;
  }, [folderScoped]);

  // Sidebar-Counts (unabhängig vom aktiven Status-Chip)
  const sidebarCounts = useMemo(() => {
    let baldAblaufend = 0;
    let aktiv = 0;
    let nichtAnalysiert = 0;
    let unassigned = 0;
    for (const c of contracts) {
      if (isExpiringSoon(c)) baldAblaufend++;
      if (statusInfo(c).tone === "ok") aktiv++;
      if (!isAnalyzed(c)) nichtAnalysiert++;
      if (!c.folderId) unassigned++;
    }
    return {
      total: contracts.length,
      baldAblaufend,
      aktiv,
      nichtAnalysiert,
      unassigned,
    };
  }, [contracts]);

  /* -------------------------------------------------------------------
     Cell-Renderer pro Field — wird in jeder Slot-Spalte aufgerufen
  ------------------------------------------------------------------- */
  const renderFieldCell = (c: Contract, field: ColumnFieldKey): React.ReactNode => {
    switch (field) {
      case "provider":
        return getProviderLabel(c);
      case "contractType":
        return getContractTypeLabel(c);
      case "contractNumber":
        return c.contractNumber || <span style={{ color: "var(--text-3)" }}>—</span>;
      case "laufzeit":
        return c.laufzeit || <span style={{ color: "var(--text-3)" }}>—</span>;
      case "kuendigung":
        return c.kuendigung || <span style={{ color: "var(--text-3)" }}>—</span>;
      case "expiry": {
        const exp = expiryInfo(c.expiryDate);
        if (!exp) return <span style={{ color: "var(--text-3)" }}>unbefristet</span>;
        return (
          <>
            <span
              style={{
                color:
                  exp.tone === "bad"
                    ? "var(--bad)"
                    : exp.tone === "warn"
                    ? "var(--warn)"
                    : "var(--text-2)",
                fontWeight: exp.tone ? 500 : 400,
              }}
            >
              {exp.label}
            </span>
            <span style={{ color: "var(--text-3)", fontSize: 12 }}>
              {" · "}
              {formatDateShort(c.expiryDate)}
            </span>
          </>
        );
      }
      case "remaining": {
        if (!c.expiryDate) return <span style={{ color: "var(--text-3)" }}>unbefristet</span>;
        const d = new Date(c.expiryDate);
        if (Number.isNaN(d.getTime())) return <span style={{ color: "var(--text-3)" }}>—</span>;
        const days = Math.ceil((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        if (days < 0) return <span style={{ color: "var(--bad)" }}>abgelaufen</span>;
        if (days <= 30) return <span style={{ color: "var(--warn)", fontWeight: 500 }}>{days} Tage</span>;
        return <span>{days} Tage</span>;
      }
      case "startDate":
        return c.startDate ? formatDateShort(c.startDate) : <span style={{ color: "var(--text-3)" }}>—</span>;
      case "payment":
        return c.paymentAmount ? (
          <span>
            {c.paymentAmount} €
            {c.paymentFrequency ? (
              <span style={{ color: "var(--text-3)", fontSize: 12 }}> / {c.paymentFrequency}</span>
            ) : null}
          </span>
        ) : (
          <span style={{ color: "var(--text-3)" }}>—</span>
        );
      case "createdAt":
        return formatDateShort(c.createdAt);
      case "folder": {
        if (!c.folderId) return <span style={{ color: "var(--text-3)" }}>Ohne Ordner</span>;
        const f = folders.find((x) => x._id === c.folderId);
        if (!f) return <span style={{ color: "var(--text-3)" }}>—</span>;
        return (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            {f.icon ? (
              <span style={{ fontSize: 14 }}>{f.icon}</span>
            ) : (
              <Folder size={12} style={{ color: f.color || "#fbbf24" }} />
            )}
            {f.name}
          </span>
        );
      }
      default:
        return <span style={{ color: "var(--text-3)" }}>—</span>;
    }
  };

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = folderScoped.filter((c) => {
      if (!chipMatches(c, statusChip)) return false;
      if (!q) return true;
      const haystack = [
        c.name,
        c.provider?.displayName,
        c.contractType,
        c.provider?.category,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
    return [...filtered].sort((a, b) => compareContracts(a, b, sortKey, sortDir));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [folderScoped, query, statusChip, sortKey, sortDir]);

  /* -------------------------------------------------------------------
     Handlers
  ------------------------------------------------------------------- */
  const openModal = (c: Contract, tab?: "overview" | "pdf" | "analysis") => {
    setModalContract(c);
    setModalInitialTab(tab);
    navigate(`/contracts-v2?view=${c._id}`, { replace: true });
  };

  const handleRowClick = (c: Contract) => {
    setOpenPopoverFor(null);
    // Im Bulk-Modus: Klick togglet die Auswahl, kein Drawer/Modal
    if (bulkMode) {
      toggleSelect(c._id);
      return;
    }
    if (isMobileViewport()) {
      // Auf Mobile öffnet Single-Click direkt das Modal (Drawer ist auf Mobile aus).
      openModal(c);
      return;
    }
    setDrawerContract(c);
  };

  const handleRowDoubleClick = (c: Contract) => {
    setOpenPopoverFor(null);
    setDrawerContract(null);
    openModal(c);
  };

  const handleModalClose = () => {
    setModalContract(null);
    setModalInitialTab(undefined);
    navigate("/contracts-v2", { replace: true });
  };

  const handleDrawerClose = () => {
    setDrawerContract(null);
  };

  const handleEdit = (c: Contract) => {
    setOpenPopoverFor(null);
    setEditContract(c);
  };

  const handleEditUpdate = (updated: Contract) => {
    // ContractEditModal liefert das aktualisierte Objekt — Liste lokal patchen.
    setContracts((prev) =>
      prev.map((c) => (c._id === updated._id ? { ...c, ...updated } : c)),
    );
    if (drawerContract?._id === updated._id) {
      setDrawerContract({ ...drawerContract, ...updated });
    }
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      // Datum/Score: neueste/höchste zuerst sinnvoll, sonst A→Z
      setSortDir(
        key === "createdAt" ||
          key === "expiry" ||
          key === "startDate" ||
          key === "score" ||
          key === "payment"
          ? "desc"
          : "asc",
      );
    }
  };

  /* ----------------------------- Spalten-Konfig ----------------------------- */
  const persistColumns = async (next: ColumnConfig[]) => {
    setColumns(next);
    // Optimistisch im user-Objekt cachen, damit Page-Refresh ohne Re-Fetch klappt
    if (user) {
      user.uiPreferences = { ...user.uiPreferences, contractColumns: next };
    }
    try {
      const token = localStorage.getItem("authToken") || localStorage.getItem("token");
      await fetch("/api/auth/ui-preferences", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token ?? ""}`,
        },
        credentials: "include",
        body: JSON.stringify({ contractColumns: next }),
      });
    } catch (err) {
      console.error("Spalten-Config konnte nicht gespeichert werden:", err);
    }
  };

  const handleColumnHeaderClick = (slotIdx: number) => {
    if (columnPopoverFor === slotIdx) {
      setColumnPopoverFor(null);
      return;
    }
    setColumnDraftTitle(columns[slotIdx]?.title || "");
    setColumnPopoverFor(slotIdx);
  };

  const handleColumnFieldChange = (slotIdx: number, field: ColumnFieldKey) => {
    const opt = FIELD_OPTIONS.find((o) => o.key === field);
    const next = columns.map((c, i) =>
      i === slotIdx
        ? {
            // Wenn Title gleich dem alten Default war, automatisch auf neuen Default umstellen
            title:
              c.title === FIELD_OPTIONS.find((o) => o.key === c.field)?.defaultTitle
                ? opt?.defaultTitle || c.title
                : c.title,
            field,
          }
        : c,
    );
    void persistColumns(next);
    // Wenn nach diesem Field gerade sortiert wurde, neu sortieren mit neuem Field
    if (sortKey === columns[slotIdx]?.field) {
      setSortKey(field);
    }
  };

  const handleColumnTitleSave = (slotIdx: number) => {
    const trimmed = columnDraftTitle.trim();
    if (!trimmed) {
      setColumnPopoverFor(null);
      return;
    }
    const next = columns.map((c, i) => (i === slotIdx ? { ...c, title: trimmed } : c));
    void persistColumns(next);
    setColumnPopoverFor(null);
  };

  const handleColumnReset = (slotIdx: number) => {
    const next = columns.map((c, i) => (i === slotIdx ? DEFAULT_COLUMNS[slotIdx] : c));
    void persistColumns(next);
    setColumnPopoverFor(null);
  };

  const handleAnalyze = async (c: Contract) => {
    setOpenPopoverFor(null);
    setAnalyzingId(c._id);
    try {
      const result = (await apiCall(`/contracts/${c._id}/analyze`, { method: "POST" })) as {
        success?: boolean;
        contract?: Contract;
        message?: string;
      };
      if (result?.contract) {
        setContracts((prev) =>
          prev.map((x) => (x._id === c._id ? { ...x, ...result.contract } : x)),
        );
        if (drawerContract?._id === c._id) {
          setDrawerContract({ ...drawerContract, ...result.contract });
        }
        toast?.success?.("Analyse abgeschlossen");
      } else {
        toast?.success?.(result?.message || "Analyse gestartet");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Analyse fehlgeschlagen";
      toast?.error?.(msg);
    } finally {
      setAnalyzingId(null);
    }
  };

  const handleReminder = (c: Contract) => {
    setOpenPopoverFor(null);
    setReminderContract(c);
  };

  /* ----------------------------- Bulk-Modus ----------------------------- */
  const toggleBulkMode = () => {
    setBulkMode((m) => {
      if (m) setSelectedIds(new Set()); // beim Beenden: Auswahl leeren
      return !m;
    });
    setOpenPopoverFor(null);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllVisible = () => {
    setSelectedIds((prev) => {
      const allVisibleSelected = visible.length > 0 && visible.every((c) => prev.has(c._id));
      if (allVisibleSelected) {
        // alle abwählen, die gerade sichtbar sind (außerhalb des Filters bleibt erhalten)
        const next = new Set(prev);
        for (const c of visible) next.delete(c._id);
        return next;
      }
      const next = new Set(prev);
      for (const c of visible) next.add(c._id);
      return next;
    });
  };

  const handleBulkMove = async (folderId: string | null) => {
    if (selectedIds.size === 0) return;
    setBulkBusy(true);
    try {
      await bulkMoveToFolder(Array.from(selectedIds), folderId);
      // Lokal aktualisieren — kein Re-Fetch nötig
      setContracts((prev) =>
        prev.map((c) => (selectedIds.has(c._id) ? { ...c, folderId } : c)),
      );
      toast?.success?.(`${selectedIds.size} Verträge verschoben`);
      setSelectedIds(new Set());
      setBulkFolderDropdownOpen(false);
      // Folder-Counts neu laden
      fetchFolders(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Verschieben fehlgeschlagen";
      toast?.error?.(msg);
    } finally {
      setBulkBusy(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    const confirmed = window.confirm(`${selectedIds.size} Verträge wirklich löschen?`);
    if (!confirmed) return;

    setBulkBusy(true);
    const ids = Array.from(selectedIds);
    const previous = contracts;

    // Optimistisch entfernen
    setContracts((prev) => prev.filter((c) => !selectedIds.has(c._id)));
    if (drawerContract && selectedIds.has(drawerContract._id)) setDrawerContract(null);

    try {
      const token = localStorage.getItem("authToken") || localStorage.getItem("token");
      const response = await fetch("/api/contracts/bulk-delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token ?? ""}`,
        },
        body: JSON.stringify({ contractIds: ids }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        if (data.requiresUpgrade) {
          throw new Error(data.message || "Bulk-Löschen ist ein Enterprise-Feature");
        }
        throw new Error(data.message || `Fehler ${response.status}`);
      }
      toast?.success?.(`${ids.length} Verträge gelöscht`);
      setSelectedIds(new Set());
      fetchFolders(true);
    } catch (err) {
      // Rollback
      setContracts(previous);
      const msg = err instanceof Error ? err.message : "Löschen fehlgeschlagen";
      toast?.error?.(msg);
    } finally {
      setBulkBusy(false);
    }
  };

  const handleBulkDownloadZip = async () => {
    if (selectedIds.size === 0) return;
    if (selectedIds.size > 100) {
      toast?.error?.("Maximal 100 Verträge gleichzeitig downloadbar");
      return;
    }
    setBulkBusy(true);
    try {
      const token = localStorage.getItem("authToken") || localStorage.getItem("token");
      const response = await fetch("/api/contracts/bulk-download", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token ?? ""}`,
        },
        credentials: "include",
        body: JSON.stringify({ contractIds: Array.from(selectedIds) }),
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const cd = response.headers.get("Content-Disposition");
      let filename = "Contract_AI_Vertraege.zip";
      if (cd) {
        const m = cd.match(/filename[^;=\n]*=\s*["']?([^"';\n]+)["']?/);
        if (m && m[1]) filename = m[1].trim();
      }

      const blob = await response.blob();
      const typedBlob = new Blob([blob], { type: "application/zip" });
      const url = window.URL.createObjectURL(typedBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }, 100);

      toast?.success?.(`${selectedIds.size} Verträge als ZIP heruntergeladen`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "ZIP-Download fehlgeschlagen";
      toast?.error?.(msg);
    } finally {
      setBulkBusy(false);
    }
  };

  const handleDelete = async (c: Contract) => {
    setOpenPopoverFor(null);
    const confirmed = window.confirm(
      `Möchtest du den Vertrag "${fixUtf8Display(c.name)}" wirklich löschen?`,
    );
    if (!confirmed) return;

    // Optimistic Update wie in V1
    const previous = contracts;
    setContracts((prev) => prev.filter((x) => x._id !== c._id));
    if (drawerContract?._id === c._id) setDrawerContract(null);

    try {
      await apiCall(`/contracts/${c._id}`, { method: "DELETE" });
      toast?.success?.("Vertrag gelöscht");
    } catch (err) {
      // Rollback bei Fehler
      setContracts(previous);
      const msg = err instanceof Error ? err.message : "Löschen fehlgeschlagen";
      toast?.error?.(msg);
    }
  };

  /* -------------------------------------------------------------------
     Derived
  ------------------------------------------------------------------- */
  const userInitials =
    (user?.name || user?.email || "U")
      .split(/[\s@.]/)
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase() ?? "")
      .join("") || "U";

  const showDrawer = !!drawerContract;
  const score =
    drawerContract?.contractScore !== undefined && drawerContract?.contractScore !== null
      ? Math.max(0, Math.min(100, drawerContract.contractScore))
      : null;
  const drawerStatus = drawerContract ? statusInfo(drawerContract) : null;
  const drawerExpiry = drawerContract ? expiryInfo(drawerContract.expiryDate) : null;
  const drawerRisks = drawerContract ? getRiskList(drawerContract) : [];

  return (
    <>
      <Helmet>
        <title>Verträge — Contract AI (V2 Vorschau)</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>

      <div className={styles.page}>
        <div className={`${styles.shell} ${showDrawer ? styles.shellWithDrawer : ""}`}>
          {/* ===== Sidebar — echte Folders + Schnellfilter ===== */}
          <aside className={styles.sidebar}>
            <div className={styles.sidebarTopSpacer} />

            <div className={styles.navLabel}>Verträge</div>
            <button
              className={`${styles.navItem} ${activeFolder === null && statusChip === "alle" ? styles.active : ""}`}
              type="button"
              onClick={() => {
                setActiveFolder(null);
                setStatusChip("alle");
              }}
            >
              <FileText size={16} />
              Alle Verträge <span className={styles.count}>{sidebarCounts.total}</span>
            </button>
            <button
              className={styles.navItem}
              type="button"
              onClick={() => navigate("/contracts")}
              title="Upload-Drawer wird in Schritt 4 in V2 gebaut. Bis dahin nutzt du die V1-Seite zum Hochladen."
            >
              <Upload size={16} />
              Hochladen
            </button>
            <button className={styles.navItem} type="button" disabled>
              <Mail size={16} />
              Email-Inbox
            </button>

            <div className={styles.navLabel}>Schnellfilter</div>
            <button
              className={`${styles.navItem} ${statusChip === "bald" ? styles.active : ""}`}
              type="button"
              onClick={() => {
                setActiveFolder(null);
                setStatusChip(statusChip === "bald" ? "alle" : "bald");
              }}
            >
              <AlertTriangle size={16} style={{ color: "#f59e0b" }} />
              Bald ablaufend <span className={styles.count}>{sidebarCounts.baldAblaufend}</span>
            </button>
            <button
              className={`${styles.navItem} ${statusChip === "aktiv" ? styles.active : ""}`}
              type="button"
              onClick={() => {
                setActiveFolder(null);
                setStatusChip(statusChip === "aktiv" ? "alle" : "aktiv");
              }}
            >
              <CheckCircle2 size={16} style={{ color: "#22c55e" }} />
              Aktive Verträge <span className={styles.count}>{sidebarCounts.aktiv}</span>
            </button>
            <button
              className={`${styles.navItem} ${statusChip === "nicht_analysiert" ? styles.active : ""}`}
              type="button"
              onClick={() => {
                setActiveFolder(null);
                setStatusChip(statusChip === "nicht_analysiert" ? "alle" : "nicht_analysiert");
              }}
            >
              <Clock size={16} style={{ color: "#94a3b8" }} />
              Nicht analysiert <span className={styles.count}>{sidebarCounts.nichtAnalysiert}</span>
            </button>

            <div className={styles.navLabel}>Ordner</div>
            <button
              className={`${styles.navItem} ${activeFolder === "unassigned" ? styles.active : ""}`}
              type="button"
              onClick={() => {
                setStatusChip("alle");
                setActiveFolder(activeFolder === "unassigned" ? null : "unassigned");
              }}
            >
              <Folder size={16} style={{ color: "#94a3b8" }} />
              Ohne Ordner <span className={styles.count}>{sidebarCounts.unassigned}</span>
            </button>
            {folders.map((f: FolderType) => (
              <button
                key={f._id}
                className={`${styles.navItem} ${activeFolder === f._id ? styles.active : ""}`}
                type="button"
                onClick={() => {
                  setStatusChip("alle");
                  setActiveFolder(activeFolder === f._id ? null : f._id);
                }}
                title={f.name}
              >
                {f.icon ? (
                  <span style={{ fontSize: 14, lineHeight: 1, width: 16, textAlign: "center" }}>
                    {f.icon}
                  </span>
                ) : (
                  <Folder size={16} style={{ color: f.color || "#fbbf24" }} />
                )}
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {f.name}
                </span>
                <span className={styles.count}>{f.contractCount ?? 0}</span>
              </button>
            ))}

            <div className={styles.sidebarFooter}>
              <div className={styles.avatar}>{userInitials}</div>
              <div className={styles.who}>
                <div className={styles.name}>{user?.name || user?.email || "User"}</div>
                <div className={styles.plan}>
                  {user?.subscriptionPlan === "enterprise"
                    ? "Enterprise"
                    : user?.subscriptionPlan === "business"
                    ? "Business"
                    : "Free"}
                </div>
              </div>
            </div>
          </aside>

          {/* ===== Main ===== */}
          <main className={styles.main}>
            {/* Page Header */}
            <div className={styles.pageHeader}>
              <div>
                <div className={styles.pageHeaderTitleRow}>
                  <h1>Alle Verträge</h1>
                  <span className={styles.devBanner}>
                    <b>Vorschau</b> · neue Verwaltung, eigene Route
                  </span>
                </div>
                <div className={styles.subtitle}>
                  {loading ? "Lade Verträge…" : `${contracts.length} Verträge — neueste zuerst`}
                </div>
              </div>
              <div className={styles.headerActions}>
                <button
                  className={`${styles.btn} ${bulkMode ? styles.btnPrimary : ""}`}
                  type="button"
                  onClick={toggleBulkMode}
                  title={bulkMode ? "Auswahlmodus beenden" : "Mehrere Verträge auswählen"}
                >
                  {bulkMode ? <CheckSquare size={14} /> : <Square size={14} />}
                  {bulkMode ? "Auswahl beenden" : "Auswählen"}
                </button>
                <button
                  className={`${styles.btn} ${styles.btnPrimary}`}
                  type="button"
                  onClick={() => navigate("/contracts")}
                  title="Upload kommt nach V2-Rollout in V2 selbst. Bis dahin nutzt du die produktive Seite."
                >
                  <Upload size={14} />
                  Vertrag hochladen
                </button>
              </div>
            </div>

            {/* Filter row: Suche + Status-Chips */}
            <div className={styles.filterRow}>
              <div className={styles.search}>
                <Search size={14} />
                <input
                  placeholder="Verträge durchsuchen — Name, Anbieter, Vertragstyp…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>

              <div className={styles.chipGroup}>
                <button
                  type="button"
                  className={`${styles.chip} ${statusChip === "alle" ? styles.chipActive : ""}`}
                  onClick={() => setStatusChip("alle")}
                >
                  Alle
                  <span className={styles.chipCount}>{counts.alle}</span>
                </button>
                <button
                  type="button"
                  className={`${styles.chip} ${statusChip === "aktiv" ? styles.chipActive : ""}`}
                  onClick={() => setStatusChip(statusChip === "aktiv" ? "alle" : "aktiv")}
                >
                  Aktiv
                  <span className={styles.chipCount}>{counts.aktiv}</span>
                </button>
                <button
                  type="button"
                  className={`${styles.chip} ${statusChip === "bald" ? styles.chipActive : ""}`}
                  onClick={() => setStatusChip(statusChip === "bald" ? "alle" : "bald")}
                >
                  Bald fällig
                  <span className={styles.chipCount}>{counts.bald}</span>
                </button>
                <button
                  type="button"
                  className={`${styles.chip} ${statusChip === "gekündigt" ? styles.chipActive : ""}`}
                  onClick={() => setStatusChip(statusChip === "gekündigt" ? "alle" : "gekündigt")}
                >
                  Gekündigt
                  <span className={styles.chipCount}>{counts.gekündigt}</span>
                </button>
                <button
                  type="button"
                  className={`${styles.chip} ${statusChip === "generiert" ? styles.chipActive : ""}`}
                  onClick={() => setStatusChip(statusChip === "generiert" ? "alle" : "generiert")}
                >
                  Generiert
                  <span className={styles.chipCount}>{counts.generiert}</span>
                </button>
              </div>
            </div>

            {/* Tabelle */}
            <div className={styles.card}>
              {loading ? (
                <div className={styles.center}>
                  <div className={styles.spinner} />
                  Lade deine Verträge…
                </div>
              ) : error ? (
                <div className={styles.center}>
                  <div className={styles.errorBox}>{error}</div>
                </div>
              ) : visible.length === 0 ? (
                <div className={styles.center}>
                  {contracts.length === 0
                    ? "Noch keine Verträge vorhanden."
                    : "Keine Treffer für deine Suche."}
                </div>
              ) : (
                <>
                  <table className={`${styles.contracts} ${bulkMode ? styles.bulkActive : ""}`}>
                    <thead>
                      <tr>
                        {bulkMode && (
                          <th style={{ width: "44px" }}>
                            <button
                              type="button"
                              className={styles.checkboxBtn}
                              onClick={toggleSelectAllVisible}
                              title={
                                visible.length > 0 && visible.every((c) => selectedIds.has(c._id))
                                  ? "Alle abwählen"
                                  : "Alle auswählen"
                              }
                            >
                              {visible.length > 0 && visible.every((c) => selectedIds.has(c._id)) ? (
                                <CheckSquare size={16} />
                              ) : (
                                <Square size={16} />
                              )}
                            </button>
                          </th>
                        )}
                        <th
                          style={{ width: "40%", cursor: "pointer" }}
                          onClick={() => handleSort("name")}
                          title="Sortieren nach Name"
                        >
                          <span className={styles.sortHead}>
                            Vertrag
                            {sortKey === "name" &&
                              (sortDir === "asc" ? (
                                <ChevronUp size={12} />
                              ) : (
                                <ChevronDown size={12} />
                              ))}
                          </span>
                        </th>
                        {columns.map((col, idx) => {
                          const isSorted = sortKey === col.field;
                          const isPopoverOpen = columnPopoverFor === idx;
                          return (
                            <th
                              key={`col-${idx}`}
                              className={styles.configurableHead}
                            >
                              <div className={styles.configurableHeadInner}>
                                <span
                                  className={styles.sortHead}
                                  onClick={() => handleSort(col.field)}
                                  title={`Sortieren nach ${col.title}`}
                                  style={{ cursor: "pointer" }}
                                >
                                  {col.title}
                                  {isSorted &&
                                    (sortDir === "asc" ? (
                                      <ChevronUp size={12} />
                                    ) : (
                                      <ChevronDown size={12} />
                                    ))}
                                </span>
                                <button
                                  type="button"
                                  className={styles.configBtn}
                                  onClick={() => handleColumnHeaderClick(idx)}
                                  title="Spalte konfigurieren"
                                  aria-label="Spalte konfigurieren"
                                >
                                  <Edit3 size={11} />
                                </button>
                                {isPopoverOpen && (
                                  <div
                                    ref={columnPopoverRef}
                                    className={`${styles.popover} ${styles.columnPopover}`}
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <div className={styles.columnPopoverSection}>
                                      <label className={styles.columnPopoverLabel}>
                                        Spaltentitel
                                      </label>
                                      <input
                                        type="text"
                                        className={styles.columnPopoverInput}
                                        value={columnDraftTitle}
                                        onChange={(e) => setColumnDraftTitle(e.target.value)}
                                        onKeyDown={(e) => {
                                          if (e.key === "Enter") handleColumnTitleSave(idx);
                                          if (e.key === "Escape") setColumnPopoverFor(null);
                                        }}
                                        autoFocus
                                        placeholder="z. B. Anbieter"
                                      />
                                      <div className={styles.columnPopoverActions}>
                                        <button
                                          type="button"
                                          className={styles.btn}
                                          onClick={() => handleColumnReset(idx)}
                                          title="Auf Standard zurücksetzen"
                                        >
                                          Standard
                                        </button>
                                        <button
                                          type="button"
                                          className={`${styles.btn} ${styles.btnPrimary}`}
                                          onClick={() => handleColumnTitleSave(idx)}
                                        >
                                          Speichern
                                        </button>
                                      </div>
                                    </div>
                                    <div className={styles.popoverDivider} />
                                    <div className={styles.columnPopoverSection}>
                                      <label className={styles.columnPopoverLabel}>
                                        Anzuzeigender Wert
                                      </label>
                                      <div className={styles.fieldOptionsList}>
                                        {FIELD_OPTIONS.map((opt) => (
                                          <button
                                            key={opt.key}
                                            type="button"
                                            className={`${styles.fieldOption} ${col.field === opt.key ? styles.fieldOptionActive : ""}`}
                                            onClick={() => handleColumnFieldChange(idx, opt.key)}
                                          >
                                            <span className={styles.fieldRadio}>
                                              {col.field === opt.key ? <CheckCircle2 size={13} /> : <span />}
                                            </span>
                                            <span>{opt.label}</span>
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </th>
                          );
                        })}
                        <th
                          style={{ width: "120px", cursor: "pointer" }}
                          onClick={() => handleSort("status")}
                          title="Sortieren nach Status"
                        >
                          <span className={styles.sortHead}>
                            Status
                            {sortKey === "status" &&
                              (sortDir === "asc" ? (
                                <ChevronUp size={12} />
                              ) : (
                                <ChevronDown size={12} />
                              ))}
                          </span>
                        </th>
                        <th
                          style={{ width: "120px", cursor: "pointer" }}
                          onClick={() => handleSort("score")}
                          title="Sortieren nach Score"
                        >
                          <span className={styles.sortHead}>
                            Score
                            {sortKey === "score" &&
                              (sortDir === "asc" ? (
                                <ChevronUp size={12} />
                              ) : (
                                <ChevronDown size={12} />
                              ))}
                          </span>
                        </th>
                        <th style={{ width: "90px" }} aria-label="Aktionen" />
                      </tr>
                    </thead>
                    <tbody>
                      {visible.map((c) => {
                        const st = statusInfo(c);
                        const isSel = drawerContract?._id === c._id;
                        const isPopoverOpen = openPopoverFor === c._id;
                        return (
                          <tr
                            key={c._id}
                            className={`${isSel ? styles.selectedRow : ""} ${bulkMode && selectedIds.has(c._id) ? styles.bulkSelectedRow : ""}`}
                            onClick={() => handleRowClick(c)}
                            onDoubleClick={() => handleRowDoubleClick(c)}
                          >
                            {bulkMode && (
                              <td onClick={(e) => { e.stopPropagation(); toggleSelect(c._id); }}>
                                <button
                                  type="button"
                                  className={styles.checkboxBtn}
                                  tabIndex={-1}
                                  aria-label={selectedIds.has(c._id) ? "Abwählen" : "Auswählen"}
                                >
                                  {selectedIds.has(c._id) ? <CheckSquare size={16} /> : <Square size={16} />}
                                </button>
                              </td>
                            )}
                            <td>
                              <div className={styles.docCell}>
                                <div className={styles.docIcon}>
                                  <FileText size={16} />
                                </div>
                                <div className={styles.docMeta}>
                                  <div
                                    className={styles.docName}
                                    title={fixUtf8Display(c.name)}
                                  >
                                    {fixUtf8Display(c.name)}
                                  </div>
                                  <div className={styles.docSub}>
                                    <span>
                                      {getContractTypeLabel(c) !== "—"
                                        ? getContractTypeLabel(c)
                                        : "Vertrag"}
                                    </span>
                                    <span className={styles.sep}>·</span>
                                    <span>Hochgeladen {formatDateShort(c.createdAt)}</span>
                                  </div>
                                </div>
                              </div>
                            </td>
                            {columns.map((col, ci) => (
                              <td key={`cell-${c._id}-${ci}`}>
                                {renderFieldCell(c, col.field)}
                              </td>
                            ))}
                            <td>
                              <span className={`${styles.pill} ${pillClass(st.tone)}`}>
                                {st.tone === "ok" && <span className={styles.pulse} />}
                                {st.tone === "warn" && <Clock size={11} />}
                                {st.tone === "bad" && st.label !== "Abgelaufen" && (
                                  <AlertTriangle size={11} />
                                )}
                                {st.label}
                                {st.tone === "ok" && <CheckCircle2 size={11} />}
                              </span>
                            </td>
                            <td>
                              {typeof c.contractScore === "number" && c.contractScore > 0 ? (
                                <span className={styles.scoreCell}>
                                  <span className={styles.scoreBar}>
                                    <i style={{ width: `${Math.min(100, Math.max(0, c.contractScore))}%` }} />
                                  </span>
                                  <span>{c.contractScore}</span>
                                </span>
                              ) : (
                                <span className={styles.scoreEmpty}>—</span>
                              )}
                            </td>
                            <td className={styles.actionsCell} onClick={(e) => e.stopPropagation()}>
                              <button
                                className={styles.iconBtn}
                                type="button"
                                title="PDF öffnen"
                                onClick={() => openModal(c, "pdf")}
                              >
                                <Eye size={15} />
                              </button>
                              <span className={styles.popoverWrap}>
                                <button
                                  className={styles.iconBtn}
                                  type="button"
                                  title="Mehr"
                                  onClick={() =>
                                    setOpenPopoverFor(isPopoverOpen ? null : c._id)
                                  }
                                >
                                  <MoreHorizontal size={15} />
                                </button>
                                {isPopoverOpen && (
                                  <div
                                    ref={popoverRef}
                                    className={styles.popover}
                                    role="menu"
                                  >
                                    <button
                                      className={styles.popoverItem}
                                      type="button"
                                      onClick={() => {
                                        setOpenPopoverFor(null);
                                        openModal(c, "overview");
                                      }}
                                    >
                                      <FileText size={14} />
                                      Vollständige Details öffnen
                                    </button>
                                    <button
                                      className={styles.popoverItem}
                                      type="button"
                                      onClick={() => handleEdit(c)}
                                    >
                                      <Edit3 size={14} />
                                      Bearbeiten
                                    </button>
                                    {!isAnalyzed(c) && (
                                      <button
                                        className={styles.popoverItem}
                                        type="button"
                                        onClick={() => handleAnalyze(c)}
                                        disabled={analyzingId === c._id}
                                      >
                                        {analyzingId === c._id ? (
                                          <>
                                            <Loader size={14} className={styles.spinner} />
                                            Analysiert…
                                          </>
                                        ) : (
                                          <>
                                            <Zap size={14} />
                                            Jetzt analysieren
                                          </>
                                        )}
                                      </button>
                                    )}
                                    {isAnalyzed(c) && (
                                      <button
                                        className={styles.popoverItem}
                                        type="button"
                                        onClick={() => {
                                          setOpenPopoverFor(null);
                                          openModal(c, "analysis");
                                        }}
                                      >
                                        <Sparkles size={14} />
                                        Analyse anzeigen
                                      </button>
                                    )}
                                    <button
                                      className={styles.popoverItem}
                                      type="button"
                                      onClick={() => handleReminder(c)}
                                    >
                                      <Bell size={14} />
                                      Erinnerung einrichten
                                    </button>
                                    <div className={styles.popoverDivider} />
                                    <button
                                      className={`${styles.popoverItem} ${styles.danger}`}
                                      type="button"
                                      onClick={() => handleDelete(c)}
                                    >
                                      <Trash2 size={14} />
                                      Löschen
                                    </button>
                                  </div>
                                )}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  <div className={styles.tableFooter}>
                    <span>
                      {visible.length} von {contracts.length} Verträgen
                      {query ? " (gefiltert)" : ""}
                    </span>
                    <span>Klick öffnet Vorschau · Doppelklick öffnet Vollansicht</span>
                  </div>
                </>
              )}
            </div>
          </main>

          {/* ===== Detail-Drawer (Desktop only — Mobile öffnet direkt das Modal) ===== */}
          {drawerContract && (
            <aside className={styles.drawer}>
              <div className={styles.drawerHead}>
                <div>
                  <div className={styles.drawerLabel}>Vertragsdetails</div>
                  <h2 className={styles.drawerTitle}>{fixUtf8Display(drawerContract.name)}</h2>
                  {drawerStatus && (
                    <span className={`${styles.pill} ${pillClass(drawerStatus.tone)}`}>
                      {drawerStatus.tone === "ok" && <span className={styles.pulse} />}
                      {drawerStatus.tone === "warn" && <Clock size={11} />}
                      {drawerStatus.tone === "bad" && drawerStatus.label !== "Abgelaufen" && (
                        <AlertTriangle size={11} />
                      )}
                      {drawerStatus.label}
                      {drawerStatus.tone === "ok" && <CheckCircle2 size={11} />}
                    </span>
                  )}
                </div>
                <button
                  className={styles.iconBtn}
                  type="button"
                  title="Schließen"
                  onClick={handleDrawerClose}
                >
                  <X size={15} />
                </button>
              </div>

              {/* Score */}
              {score !== null && (
                <div className={styles.drawerSection}>
                  <h3>Vertragsbewertung</h3>
                  <div className={styles.scorePanel}>
                    <div
                      className={styles.scoreRing}
                      style={{ ["--val" as string]: String(score) } as React.CSSProperties}
                    >
                      <div>{score}</div>
                    </div>
                    <div className={styles.scoreDetail}>
                      <div className={styles.value}>
                        {score >= 75
                          ? "Solider Vertrag"
                          : score >= 50
                          ? "Verbesserungspotenzial"
                          : "Kritische Punkte"}
                      </div>
                      <div className={styles.meta}>
                        {drawerRisks.length > 0 && (
                          <span>
                            <AlertTriangle size={13} style={{ color: "var(--bad)" }} />
                            {drawerRisks.length} Risiken
                          </span>
                        )}
                        <span>
                          <CheckCircle2 size={13} style={{ color: "var(--ok)" }} />
                          KI-analysiert
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Eckdaten */}
              <div className={styles.drawerSection}>
                <h3>Eckdaten</h3>
                <dl className={styles.kv}>
                  <dt>Anbieter</dt>
                  <dd className={getProviderLabel(drawerContract) === "—" ? styles.muted : ""}>
                    {getProviderLabel(drawerContract)}
                  </dd>

                  <dt>Vertragstyp</dt>
                  <dd className={getContractTypeLabel(drawerContract) === "—" ? styles.muted : ""}>
                    {getContractTypeLabel(drawerContract)}
                  </dd>

                  {drawerContract.laufzeit && (
                    <>
                      <dt>Laufzeit</dt>
                      <dd>{drawerContract.laufzeit}</dd>
                    </>
                  )}

                  {drawerContract.kuendigung && (
                    <>
                      <dt>Kündigung</dt>
                      <dd
                        className={
                          drawerContract.kuendigung.toLowerCase().includes("3 monate")
                            ? styles.warn
                            : ""
                        }
                      >
                        {drawerContract.kuendigung}
                      </dd>
                    </>
                  )}

                  <dt>Ablauf</dt>
                  <dd>
                    {drawerExpiry ? (
                      <>
                        {drawerExpiry.label}
                        <span style={{ color: "var(--text-3)", fontWeight: 400 }}>
                          {" · "}
                          {formatDateShort(drawerContract.expiryDate)}
                        </span>
                      </>
                    ) : (
                      <span className={styles.muted}>unbefristet</span>
                    )}
                  </dd>

                  {drawerContract.paymentAmount ? (
                    <>
                      <dt>Zahlung</dt>
                      <dd>
                        {drawerContract.paymentAmount} €
                        {drawerContract.paymentFrequency
                          ? ` / ${drawerContract.paymentFrequency}`
                          : ""}
                      </dd>
                    </>
                  ) : null}

                  <dt>Hochgeladen</dt>
                  <dd className={styles.muted}>{formatDateShort(drawerContract.createdAt)}</dd>
                </dl>
              </div>

              {/* Risiken */}
              {drawerRisks.length > 0 && (
                <div className={styles.drawerSection}>
                  <h3>Erkannte Risiken</h3>
                  <div className={styles.risks}>
                    {drawerRisks.slice(0, 4).map((r, i) => {
                      const lvlClass = i === 0 ? "" : i === 1 ? styles.med : styles.low;
                      return (
                        <div key={i} className={styles.risk}>
                          <div className={`${styles.lvl} ${lvlClass}`} />
                          <div>{r}</div>
                        </div>
                      );
                    })}
                    {drawerRisks.length > 4 && (
                      <div
                        style={{
                          fontSize: 12,
                          color: "var(--text-3)",
                          padding: "4px 12px",
                          cursor: "pointer",
                        }}
                        onClick={() => openModal(drawerContract, "analysis")}
                      >
                        +{drawerRisks.length - 4} weitere — vollständig anzeigen
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Aktionen */}
              <div className={styles.drawerActions}>
                <button
                  className={`${styles.btn} ${styles.btnPrimary}`}
                  type="button"
                  onClick={() => openModal(drawerContract, "overview")}
                >
                  <Eye size={14} />
                  Vollständige Details öffnen
                </button>
                <div className={styles.secondaryRow}>
                  <button
                    className={styles.btn}
                    type="button"
                    onClick={() => handleEdit(drawerContract)}
                  >
                    <Edit3 size={14} />
                    Bearbeiten
                  </button>
                  <button
                    className={styles.btn}
                    type="button"
                    onClick={() => handleReminder(drawerContract)}
                    title={hasActiveReminder(drawerContract) ? "Erinnerung aktiv — klick zum Bearbeiten" : "Erinnerung einrichten"}
                  >
                    <Bell size={14} style={hasActiveReminder(drawerContract) ? { color: "var(--accent)" } : undefined} />
                    Erinnern
                  </button>
                  <button
                    className={`${styles.btn} ${styles.btnDanger}`}
                    type="button"
                    onClick={() => handleDelete(drawerContract)}
                  >
                    <Trash2 size={14} />
                    Löschen
                  </button>
                </div>
              </div>
            </aside>
          )}
        </div>
      </div>

      {/* Floating Bulk Action Bar */}
      {bulkMode && selectedIds.size > 0 &&
        createPortal(
          <div className={styles.bulkBar} role="toolbar" aria-label="Bulk-Aktionen">
            <div className={styles.bulkBarInfo}>
              <CheckSquare size={16} />
              <span>{selectedIds.size} ausgewählt</span>
            </div>
            <div className={styles.bulkBarActions}>
              <div className={styles.popoverWrap} ref={bulkFolderRef}>
                <button
                  type="button"
                  className={styles.btn}
                  onClick={() => setBulkFolderDropdownOpen((v) => !v)}
                  disabled={bulkBusy}
                >
                  <Folder size={14} />
                  In Ordner verschieben
                  <ChevronDown size={12} />
                </button>
                {bulkFolderDropdownOpen && (
                  <div className={`${styles.popover} ${styles.popoverUp}`}>
                    <button
                      type="button"
                      className={styles.popoverItem}
                      onClick={() => handleBulkMove(null)}
                    >
                      <Folder size={14} style={{ color: "#94a3b8" }} />
                      Ohne Ordner
                    </button>
                    {folders.length > 0 && <div className={styles.popoverDivider} />}
                    {folders.map((f) => (
                      <button
                        key={f._id}
                        type="button"
                        className={styles.popoverItem}
                        onClick={() => handleBulkMove(f._id)}
                      >
                        {f.icon ? (
                          <span style={{ fontSize: 14, lineHeight: 1, width: 14, textAlign: "center" }}>
                            {f.icon}
                          </span>
                        ) : (
                          <Folder size={14} style={{ color: f.color || "#fbbf24" }} />
                        )}
                        {f.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                type="button"
                className={styles.btn}
                onClick={handleBulkDownloadZip}
                disabled={bulkBusy}
                title="Ausgewählte Verträge als ZIP herunterladen"
              >
                <Download size={14} />
                Als ZIP
              </button>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnDanger}`}
                onClick={handleBulkDelete}
                disabled={bulkBusy}
              >
                <Trash2 size={14} />
                Löschen
              </button>
              <button
                type="button"
                className={styles.iconBtn}
                onClick={() => {
                  setSelectedIds(new Set());
                  setBulkMode(false);
                }}
                title="Auswahl beenden"
              >
                <X size={15} />
              </button>
            </div>
          </div>,
          document.body,
        )}

      {/* Detail-Modal — exakt dasselbe wie in V1 */}
      {modalContract &&
        createPortal(
          <NewContractDetailsModal
            key={modalContract._id}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            contract={modalContract as any}
            initialTab={modalInitialTab}
            onClose={handleModalClose}
            onEdit={() => {
              // In Schritt 3 fügen wir hier ein silent refresh ein.
            }}
            onDelete={(contractId: string) => {
              setContracts((prev) => prev.filter((x) => x._id !== contractId));
              if (drawerContract?._id === contractId) setDrawerContract(null);
              setModalContract(null);
            }}
          />,
          document.body,
        )}

      {/* Quick-Edit-Modal aus V1, wiederverwendet */}
      {editContract && (
        <ContractEditModal
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          contract={editContract as any}
          show={true}
          onClose={() => setEditContract(null)}
          onUpdate={(updated) => {
            handleEditUpdate(updated as Contract);
            setEditContract(null);
          }}
        />
      )}

      {/* Reminder-Settings-Modal aus V1, wiederverwendet */}
      {reminderContract && (
        <ReminderSettingsModal
          contractId={reminderContract._id}
          contractName={fixUtf8Display(reminderContract.name)}
          currentReminderSettings={reminderContract.reminderSettings || []}
          currentReminderDays={reminderContract.reminderDays || []}
          expiryDate={reminderContract.expiryDate}
          kuendigung={reminderContract.kuendigung}
          onClose={() => setReminderContract(null)}
          onSuccess={() => {
            // Nach erfolgreichem Speichern: Liste neu laden, damit reminderSettings aktuell sind.
            apiCall("/contracts").then((data: unknown) => {
              const list: Contract[] = Array.isArray(data)
                ? (data as Contract[])
                : ((data as { contracts?: Contract[] })?.contracts ?? []);
              setContracts(list);
              if (drawerContract) {
                const refreshed = list.find((c) => c._id === drawerContract._id);
                if (refreshed) setDrawerContract(refreshed);
              }
            });
          }}
        />
      )}
    </>
  );
}
