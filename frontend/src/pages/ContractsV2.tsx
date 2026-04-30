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
} from "lucide-react";

import NewContractDetailsModal from "../components/NewContractDetailsModal";
import ContractEditModal from "../components/ContractEditModal";
import { apiCall } from "../utils/api";
import { fixUtf8Display } from "../utils/textUtils";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../context/ToastContext";

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
  // wird vom Modal weiterverwendet — wir reichen den ganzen Contract durch
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

type StatusTone = "ok" | "warn" | "bad" | "muted" | "accent";

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

/* =====================================================================
   Component
   ===================================================================== */

export default function ContractsV2() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();

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

  // Welche Zeile hat das ⋯-Popover offen? (string = contractId, null = keines)
  const [openPopoverFor, setOpenPopoverFor] = useState<string | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  // Lokale Volltextsuche — Backend-Filter binden wir in Schritt 3 ein.
  const [query, setQuery] = useState("");

  // Status-Filter über Chips. In Schritt 3 wird das an die Backend-Query gehängt.
  type StatusChip = "alle" | "aktiv" | "bald" | "gekündigt" | "generiert";
  const [statusChip, setStatusChip] = useState<StatusChip>("alle");

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
     Filter
  ------------------------------------------------------------------- */
  const chipMatches = (c: Contract, chip: StatusChip): boolean => {
    if (chip === "alle") return true;
    if (chip === "generiert") return !!c.isGenerated || !!c.isOptimized;
    const tone = statusInfo(c).tone;
    if (chip === "aktiv") return tone === "ok";
    if (chip === "bald") return tone === "warn";
    if (chip === "gekündigt") return tone === "muted";
    return true;
  };

  const counts = useMemo(() => {
    const result = { alle: contracts.length, aktiv: 0, bald: 0, gekündigt: 0, generiert: 0 };
    for (const c of contracts) {
      if (chipMatches(c, "aktiv")) result.aktiv++;
      if (chipMatches(c, "bald")) result.bald++;
      if (chipMatches(c, "gekündigt")) result.gekündigt++;
      if (chipMatches(c, "generiert")) result.generiert++;
    }
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contracts]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return contracts.filter((c) => {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contracts, query, statusChip]);

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
          {/* ===== Sidebar (statisch in Schritt 1/2, Folders folgen in Schritt 3) ===== */}
          <aside className={styles.sidebar}>
            <div className={styles.sidebarTopSpacer} />
            <div className={styles.navLabel}>Verträge</div>
            <button className={`${styles.navItem} ${styles.active}`} type="button">
              <FileText size={16} />
              Alle Verträge <span className={styles.count}>{contracts.length}</span>
            </button>
            <button
              className={styles.navItem}
              type="button"
              onClick={() => navigate("/contracts")}
              title="Hochladen läuft in Schritt 4 in V2 — nutze solange die produktive Seite"
            >
              <Upload size={16} />
              Hochladen
            </button>
            <button className={styles.navItem} type="button" disabled>
              <Mail size={16} />
              Email-Inbox
            </button>

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
                  className={`${styles.btn} ${styles.btnPrimary}`}
                  type="button"
                  onClick={() => navigate("/contracts")}
                  title="Upload-Drawer wird in Schritt 4 in V2 gebaut. Bis dahin nutzt du die V1-Seite zum Hochladen."
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
                  <table className={styles.contracts}>
                    <thead>
                      <tr>
                        <th style={{ width: "40%" }}>Vertrag</th>
                        <th>Anbieter</th>
                        <th>Ablauf</th>
                        <th style={{ width: "120px" }}>Status</th>
                        <th style={{ width: "120px" }}>Score</th>
                        <th style={{ width: "90px" }} aria-label="Aktionen" />
                      </tr>
                    </thead>
                    <tbody>
                      {visible.map((c) => {
                        const exp = expiryInfo(c.expiryDate);
                        const st = statusInfo(c);
                        const isSel = drawerContract?._id === c._id;
                        const isPopoverOpen = openPopoverFor === c._id;
                        return (
                          <tr
                            key={c._id}
                            className={isSel ? styles.selectedRow : undefined}
                            onClick={() => handleRowClick(c)}
                            onDoubleClick={() => handleRowDoubleClick(c)}
                          >
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
                            <td>{getProviderLabel(c)}</td>
                            <td>
                              {exp ? (
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
                              ) : (
                                <span style={{ color: "var(--text-3)" }}>unbefristet</span>
                              )}
                            </td>
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
                    onClick={() =>
                      toast?.info?.("Erinnerungen können in Schritt 3 direkt aus der Liste verwaltet werden.")
                    }
                  >
                    <Bell size={14} />
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
    </>
  );
}
