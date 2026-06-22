// V2-Tabs-Section — 7 Tabs (+ optional Pilot-Tab) im v6-Mockup-Stil.
//
// Tab-Reihenfolge: Zusammenfassung | Risiken | Stärken | Empfehlungen
//                  [Pilotprüfung] | Verbesserungsideen | Marktvergleich | Rechtsgutachten
// Pilot-Tab nur sichtbar bei vorhandenem typeSpecificFindings.
//
// Adaptive Default-Tab:
//   - bei criticalIssues mit severity 'high' → Risiken-Tab vorne
//   - sonst → Zusammenfassung-Tab
//
// Empty-States für jeden Tab — niemals leerer Bildschirm.
// Tabs IMMER sichtbar (UX-Best-Practice „Hide tabs is bad UX").

import { useState, useMemo, useEffect, useRef } from "react";
import {
  AlertTriangle, CheckCircle, Zap, Lightbulb, BarChart3, Scale, Target,
  FileText
} from "lucide-react";
import styles from "./V2TabsSection.module.css";
import LegalRefPill from "../LegalRefPill";
import LockedAnalysisUpsell, { GatedCounts } from "../LockedAnalysisUpsell";
import { classifyDocType, getTabLabels, showMarketTab, getEmptyState, getVisibleTabs } from "./v2TabLabels";

type Severity = "high" | "medium" | "low" | string;

interface InsightItem {
  title?: string;
  name?: string;
  headline?: string;
  description?: string;
  text?: string;
  detail?: string;
  finding?: string; // Backend-Variation
  severity?: Severity;
  priority?: Severity;
  legalBasis?: string;
  consequence?: string;
  riskLevel?: string;
  impact?: string; // bei positiveAspects manchmal das einzige Beschreibungs-Feld
}

interface PilotItem {
  checkpoint?: string;
  name?: string;
  status?: "ok" | "issue" | "not_applicable" | string;
  finding?: string;
  description?: string;
  legalBasis?: string;
  clauseRef?: string;
}

interface RecoItem {
  title?: string;
  name?: string;
  recommendation?: string;
  description?: string;
  detail?: string;
  reason?: string;
  priority?: string;
  timeframe?: string;
  effort?: string;
}

interface AnalysisData {
  summary?: string[] | string | null;
  legalAssessment?: string[] | string | null;
  comparison?: string[] | string | null;
  positiveAspects?: InsightItem[] | string[] | null;
  criticalIssues?: InsightItem[] | string[] | null;
  recommendations?: RecoItem[] | string[] | null;
  suggestions?: string[] | null;
  detailedLegalOpinion?: string | null;
  typeSpecificFindings?: PilotItem[] | null;
  laymanSummary?: string[] | string | null;
  // 🎯 Typspezifische Tab-Labels + Empty-States (20.05.2026)
  documentType?: string | null;
  contractType?: string | null;
  // 🔒 Freemium-Tease (21.06.2026): Backend hat die Analyse für Free-User redigiert.
  // Gesperrte Felder sind server-seitig ENTFERNT — hier nur das Signal + Zähler für den Teaser.
  gated?: boolean;
  gatedCounts?: GatedCounts;
}

interface Props {
  data: AnalysisData;
}

type TabId = "summary" | "risks" | "strengths" | "recos" | "pilot" | "suggestions" | "market" | "opinion";

function asArray<T>(v: T[] | T | null | undefined): T[] {
  if (v == null) return [];
  const arr = Array.isArray(v) ? v : [v];
  // Leere Strings/Whitespace-only filtern, sonst rendert das Frontend einen
  // leeren Bullet-Point. Tritt auf wenn GPT z.B. summary: "" (statt undefined)
  // liefert — der Empty-State-Check `length === 0` würde sonst nicht greifen.
  return arr.filter(item => {
    if (typeof item === "string") return item.trim().length > 0;
    return item != null;
  }) as T[];
}

function getInsightSeverityClass(item: InsightItem): { card: string; icon: string; tag: string | null; tagLabel: string } {
  const sev = String(item.severity || item.priority || item.riskLevel || "").toLowerCase();
  const isHigh = /high|hoch|dringend|kritisch/.test(sev);
  const isMedium = /medium|mittel|wichtig|warn/.test(sev);
  if (isHigh) {
    return { card: styles.insightCardHigh, icon: styles.insightIconCrit, tag: styles.tagUrgent, tagLabel: "Hoch" };
  }
  if (isMedium) {
    return { card: styles.insightCardMedium, icon: styles.insightIconWarn, tag: styles.tagWarn, tagLabel: "Mittel" };
  }
  return { card: "", icon: styles.insightIconWarn, tag: null, tagLabel: "" };
}

function getInsightTitle(item: InsightItem | string): string {
  if (typeof item === "string") return item;
  return item.title || item.name || item.headline || "";
}

function getInsightDesc(item: InsightItem | string): string {
  if (typeof item === "string") return "";
  // Backend-Variationen: criticalIssues hat description, positiveAspects manchmal nur impact, Pilot-Items finding
  return item.description || item.text || item.detail || item.finding || item.impact || "";
}

function getInsightLegal(item: InsightItem | string): string {
  if (typeof item === "string") return "";
  return item.legalBasis || "";
}

function getRecoTitle(r: RecoItem | string): string {
  if (typeof r === "string") return r;
  return r.title || r.name || r.recommendation || "";
}

function getRecoSub(r: RecoItem | string): string {
  if (typeof r === "string") return "";
  return r.description || r.detail || r.reason || "";
}

function isHighPriority(r: RecoItem | string): boolean {
  if (typeof r === "string") return false;
  return /high|hoch|dringend/.test(String(r.priority || "").toLowerCase());
}

function getPilotStatus(item: PilotItem): { kind: "ok" | "issue" | "na"; icon: string; label: string; statusCls: string; tagCls: string } {
  const raw = String(item.status || "ok").toLowerCase().replace(/-/g, "_");
  if (raw === "issue" || raw === "warn" || raw === "fail") {
    return { kind: "issue", icon: "!", label: "Prüfen", statusCls: styles.pilotStatusIssue, tagCls: styles.pilotCpTagIssue };
  }
  if (raw === "not_applicable" || raw === "skip" || raw === "n/a") {
    return { kind: "na", icon: "—", label: "Nicht relevant", statusCls: styles.pilotStatusNa, tagCls: styles.pilotCpTagNa };
  }
  return { kind: "ok", icon: "✓", label: "Konform", statusCls: styles.pilotStatusOk, tagCls: styles.pilotCpTagOk };
}

function renderBulletList(arr: string[]) {
  if (arr.length === 0) return null;
  return (
    <ul className={styles.tbList}>
      {arr.map((x, i) => <li key={i}>{x}</li>)}
    </ul>
  );
}

interface EmptyProps {
  icon: string;
  iconCls: string;
  title: string;
  text: string;
}
function EmptyState({ icon, iconCls, title, text }: EmptyProps) {
  return (
    <div className={styles.emptyState}>
      <div className={`${styles.emptyStateIcon} ${iconCls}`}>{icon}</div>
      <div className={styles.emptyStateTitle}>{title}</div>
      <div className={styles.emptyStateText}>{text}</div>
    </div>
  );
}

export default function V2TabsSection({ data }: Props) {
  const d = data;

  // Counts für Tab-Badges
  const summaryArr = useMemo(() => asArray<string>(d.summary), [d.summary]);
  const legalArr = useMemo(() => asArray<string>(d.legalAssessment), [d.legalAssessment]);
  const cmpArr = useMemo(() => asArray<string>(d.comparison), [d.comparison]);
  const positives = useMemo(() => asArray<InsightItem | string>(d.positiveAspects as InsightItem[]), [d.positiveAspects]);
  const criticals = useMemo(() => asArray<InsightItem | string>(d.criticalIssues as InsightItem[]), [d.criticalIssues]);
  const recos = useMemo(() => asArray<RecoItem | string>(d.recommendations as RecoItem[]), [d.recommendations]);
  const sugs = useMemo(() => asArray<string>(d.suggestions), [d.suggestions]);
  const pilot = useMemo(() => asArray<PilotItem>(d.typeSpecificFindings), [d.typeSpecificFindings]);
  const opinion = (d.detailedLegalOpinion || "").trim();

  const hasPilot = pilot.length > 0;

  // Adaptive Default-Tab
  const hasHighRisk = useMemo(() => {
    return criticals.some(c => {
      if (typeof c === "string") return false;
      const sev = String(c.severity || c.priority || c.riskLevel || "").toLowerCase();
      return /high|hoch|dringend|kritisch/.test(sev);
    });
  }, [criticals]);

  // User-Feedback: immer Zusammenfassung als Start-Tab, nicht adaptive auf Risiken.
  // hasHighRisk wird trotzdem für andere Zwecke berechnet (Badge-Indikator etc.).
  const [active, setActive] = useState<TabId>("summary");
  void hasHighRisk;

  // 🎯 Dokumentklasse normalisieren (20.05.2026): documentType + contractType → DocClass
  const docClass = classifyDocType(data.documentType, data.contractType);
  const labels = getTabLabels(docClass);
  const marketVisible = showMarketTab(docClass);

  // 🎯 Sichtbare Tabs basierend auf DocClass + Spill-over-Guard (20.05.2026):
  // Wenn ein eigentlich ausgeblendeter Tab Daten enthält, zeigen wir ihn trotzdem
  // an — verhindert silent Datenverlust z.B. bei einem als UNKNOWN klassifizierten
  // Dokument, das aber doch Stärken/Empfehlungen liefert.
  const visibleTabs = useMemo(() => {
    const base = new Set<TabId>(getVisibleTabs(docClass));
    if (positives.length > 0) base.add("strengths");
    if (sugs.length > 0) base.add("suggestions");
    if (cmpArr.length > 0 && marketVisible) base.add("market");
    if (recos.length > 0) base.add("recos");
    // 🔒 Bei redigierter Free-Analyse den Empfehlungen-Tab erzwingen, damit das
    // Schloss sichtbar wird (recos.length ist hier 0, weil server-seitig entfernt).
    if (d.gated) base.add("recos");
    // pilot/market werden zusätzlich konditional in tabs-Array
    return base;
  }, [docClass, positives.length, sugs.length, cmpArr.length, recos.length, marketVisible, d.gated]);

  // Wenn Daten sich ändern und der active Tab nicht mehr Sinn macht, fallback auf summary
  useEffect(() => {
    if (active === "pilot" && !hasPilot) {
      setActive("summary");
      return;
    }
    if (!visibleTabs.has(active)) {
      setActive("summary");
    }
  }, [active, hasPilot, visibleTabs]);

  const tabs: { id: TabId; label: string; icon?: React.ReactNode; count?: number; pilotBadge?: boolean }[] = [
    { id: "summary", label: labels.summary, icon: <FileText size={14} /> },
    { id: "risks", label: labels.risks, icon: <AlertTriangle size={14} style={{ color: "#ef4444" }} />, count: criticals.length },
    ...(visibleTabs.has("strengths")
      ? [{ id: "strengths" as TabId, label: labels.strengths, icon: <CheckCircle size={14} style={{ color: "#10b981" }} />, count: positives.length }]
      : []),
    ...(visibleTabs.has("recos")
      ? [{ id: "recos" as TabId, label: labels.recos, icon: <Zap size={14} style={{ color: "#8b5cf6" }} />, count: recos.length }]
      : []),
    ...(hasPilot
      ? [{ id: "pilot" as TabId, label: labels.pilot, icon: <Target size={14} style={{ color: "#8b5cf6" }} />, count: pilot.length, pilotBadge: true }]
      : []),
    ...(visibleTabs.has("suggestions")
      ? [{ id: "suggestions" as TabId, label: labels.suggestions, icon: <Lightbulb size={14} style={{ color: "#f59e0b" }} />, count: sugs.length }]
      : []),
    ...(visibleTabs.has("market") && marketVisible
      ? [{ id: "market" as TabId, label: labels.market, icon: <BarChart3 size={14} /> }]
      : []),
    { id: "opinion", label: labels.opinion, icon: <Scale size={14} /> },
  ];

  // Tab-Refs für Arrow-Key-Navigation (WCAG Tabs-Pattern)
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const handleTabKey = (e: React.KeyboardEvent<HTMLButtonElement>, idx: number) => {
    let next: number | null = null;
    if (e.key === "ArrowRight") next = (idx + 1) % tabs.length;
    else if (e.key === "ArrowLeft") next = (idx - 1 + tabs.length) % tabs.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = tabs.length - 1;
    if (next != null) {
      e.preventDefault();
      setActive(tabs[next].id);
      tabRefs.current[next]?.focus();
    }
  };

  return (
    <>
      <div className={styles.tabsContainer}>
        <div className={styles.tabs} role="tablist" aria-label="Vertragsanalyse">
          {tabs.map((t, idx) => (
            <button
              key={t.id}
              ref={el => { tabRefs.current[idx] = el; }}
              role="tab"
              aria-selected={active === t.id}
              aria-controls={`v2-panel-${t.id}`}
              id={`v2-tab-${t.id}`}
              tabIndex={active === t.id ? 0 : -1}
              className={`${styles.tab} ${active === t.id ? styles.tabActive : ""}`}
              onClick={() => setActive(t.id)}
              onKeyDown={(e) => handleTabKey(e, idx)}
            >
              {t.icon}
              <span>{t.label}</span>
              {t.pilotBadge && <span className={styles.pilotBadge}>Pilot</span>}
              {t.count != null && <span className={styles.tabCount}>{t.count}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* SUMMARY */}
      <div
        role="tabpanel"
        id="v2-panel-summary"
        aria-labelledby="v2-tab-summary"
        className={`${styles.tabContent} ${active === "summary" ? styles.tabContentActive : ""}`}
      >
        {summaryArr.length === 0 && legalArr.length === 0 ? (
          <EmptyState
            icon="📋"
            iconCls={styles.esIconPrimary}
            title={getEmptyState(docClass, "summary").title}
            text={getEmptyState(docClass, "summary").text}
          />
        ) : (
          <>
            {summaryArr.length > 0 && (
              <div className={styles.textBlock}>
                <div className={styles.tbTitle}>📋 Zusammenfassung</div>
                {renderBulletList(summaryArr)}
              </div>
            )}
            {legalArr.length > 0 && (
              <div className={styles.textBlock}>
                <div className={styles.tbTitle}>📜 Rechtssicherheit</div>
                {renderBulletList(legalArr)}
              </div>
            )}
          </>
        )}
      </div>

      {/* RISKS */}
      <div
        role="tabpanel"
        id="v2-panel-risks"
        aria-labelledby="v2-tab-risks"
        className={`${styles.tabContent} ${active === "risks" ? styles.tabContentActive : ""}`}
      >
        {criticals.length === 0 ? (
          <EmptyState
            icon="🎉"
            iconCls={styles.esIconSuccess}
            title={getEmptyState(docClass, "risks").title}
            text={getEmptyState(docClass, "risks").text}
          />
        ) : (
          <div className={styles.insightList}>
            {criticals.map((item, i) => {
              const sev = typeof item === "string" ? { card: "", icon: styles.insightIconCrit, tag: null, tagLabel: "" } : getInsightSeverityClass(item);
              const title = getInsightTitle(item);
              const desc = getInsightDesc(item);
              const legal = getInsightLegal(item);
              return (
                <div className={`${styles.insightCard} ${sev.card}`} key={i}>
                  <div className={`${styles.insightIcon} ${sev.icon}`}>!</div>
                  <div className={styles.insightContent}>
                    {title && <div className={styles.insightTitle}>{title}</div>}
                    <div className={styles.insightDesc}>{desc || (typeof item === "string" ? item : "")}</div>
                    {legal && (
                      <div className={styles.insightMeta}>
                        <LegalRefPill reference={legal} fallbackClassName={styles.insightMeta} />
                      </div>
                    )}
                  </div>
                  {sev.tag ? <span className={`${styles.insightTag} ${sev.tag}`}>{sev.tagLabel}</span> : <div />}
                </div>
              );
            })}
          </div>
        )}
        {/* 🔒 Free-Tease: weitere Risiken sind server-seitig gesperrt */}
        {d.gated && (
          <div style={{ marginTop: criticals.length ? 16 : 0 }}>
            <LockedAnalysisUpsell counts={d.gatedCounts} variant="risks" />
          </div>
        )}
      </div>

      {/* STRENGTHS — konditional je nach DocClass (ARIA-Korrektheit) */}
      {visibleTabs.has("strengths") && (
      <div
        role="tabpanel"
        id="v2-panel-strengths"
        aria-labelledby="v2-tab-strengths"
        className={`${styles.tabContent} ${active === "strengths" ? styles.tabContentActive : ""}`}
      >
        {positives.length === 0 ? (
          <EmptyState
            icon="📋"
            iconCls=""
            title={getEmptyState(docClass, "strengths").title}
            text={getEmptyState(docClass, "strengths").text}
          />
        ) : (
          <div className={styles.insightList}>
            {positives.map((item, i) => {
              const title = getInsightTitle(item);
              const desc = getInsightDesc(item);
              return (
                <div className={styles.insightCard} key={i}>
                  <div className={`${styles.insightIcon} ${styles.insightIconGood}`}>✓</div>
                  <div className={styles.insightContent}>
                    {title && <div className={styles.insightTitle}>{title}</div>}
                    <div className={styles.insightDesc}>{desc || (typeof item === "string" ? item : "")}</div>
                  </div>
                  <div />
                </div>
              );
            })}
          </div>
        )}
      </div>
      )}

      {/* RECOMMENDATIONS — konditional je nach DocClass */}
      {visibleTabs.has("recos") && (
      <div
        role="tabpanel"
        id="v2-panel-recos"
        aria-labelledby="v2-tab-recos"
        className={`${styles.tabContent} ${active === "recos" ? styles.tabContentActive : ""}`}
      >
        {recos.length === 0 ? (
          d.gated ? (
            <LockedAnalysisUpsell counts={d.gatedCounts} variant="recommendations" />
          ) : (
            <EmptyState
              icon="✓"
              iconCls={styles.esIconSuccess}
              title={getEmptyState(docClass, "recos").title}
              text={getEmptyState(docClass, "recos").text}
            />
          )
        ) : (
          <>
            <div className={styles.tabHelpText}>Konkrete Schritte mit Priorität — was du jetzt tun solltest</div>
            <div className={styles.insightList}>
              {recos.map((r, i) => (
                <div className={styles.recoCard} key={i}>
                  <div className={styles.recoNum}>{i + 1}</div>
                  <div className={styles.recoText}>
                    <div className={styles.recoTitle}>{getRecoTitle(r)}</div>
                    {getRecoSub(r) && <div className={styles.recoSub}>{getRecoSub(r)}</div>}
                  </div>
                  {isHighPriority(r) && <span className={`${styles.insightTag} ${styles.tagUrgent}`} style={{ margin: "0 4px" }}>Dringend</span>}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
      )}

      {/* PILOT */}
      {hasPilot && (
        <div
          role="tabpanel"
          id="v2-panel-pilot"
          aria-labelledby="v2-tab-pilot"
          className={`${styles.tabContent} ${active === "pilot" ? styles.tabContentActive : ""}`}
        >
          <div className={styles.pilotIntro}>
            <div className={styles.pilotIntroIcon}>🎯</div>
            <div>
              <div className={styles.pilotIntroTitle}>Spezifische Tiefenprüfung</div>
              <div className={styles.pilotIntroText}>
                Zusätzlich zur Universal-Analyse hat unsere KI eine <strong>spezialisierte Vertrags-Prüfung</strong> mit {pilot.length} Checkpoints durchgeführt.
                Jeder Punkt nennt Rechtsbasis und Klausel-Referenz, sofern im Vertrag erkannt.
              </div>
            </div>
          </div>
          <div className={styles.pilotList}>
            {pilot.map((item, i) => {
              const s = getPilotStatus(item);
              const title = item.checkpoint || item.name || "";
              const desc = item.finding || item.description || "";
              return (
                <div className={styles.pilotItem} key={i}>
                  <div className={`${styles.pilotStatus} ${s.statusCls}`}>{s.icon}</div>
                  <div>
                    {title && <div className={styles.pilotCpTitle}>{title}</div>}
                    {desc && <div className={styles.pilotCpDesc}>{desc}</div>}
                    {(item.legalBasis || item.clauseRef) && (
                      <div className={styles.pilotCpMeta}>
                        {item.legalBasis && (
                          <LegalRefPill reference={item.legalBasis} fallbackClassName={styles.pilotCpLegal} />
                        )}
                        {item.clauseRef && <span className={styles.pilotCpClauseRef}>{item.clauseRef}</span>}
                      </div>
                    )}
                  </div>
                  <span className={`${styles.pilotCpTag} ${s.tagCls}`}>{s.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUGGESTIONS — konditional je nach DocClass */}
      {visibleTabs.has("suggestions") && (
      <div
        role="tabpanel"
        id="v2-panel-suggestions"
        aria-labelledby="v2-tab-suggestions"
        className={`${styles.tabContent} ${active === "suggestions" ? styles.tabContentActive : ""}`}
      >
        {sugs.length === 0 ? (
          d.gated ? (
            <LockedAnalysisUpsell counts={d.gatedCounts} variant="suggestions" />
          ) : (
            <EmptyState
              icon="💡"
              iconCls={styles.esIconPrimary}
              title={getEmptyState(docClass, "suggestions").title}
              text={getEmptyState(docClass, "suggestions").text}
            />
          )
        ) : (
          <>
            <div className={styles.tabHelpText}>Konkrete Klausel-Vorschläge für die Verhandlung</div>
            {renderBulletList(sugs)}
          </>
        )}
      </div>
      )}

      {/* MARKET — konditional je nach DocClass + marketVisible */}
      {visibleTabs.has("market") && marketVisible && (
      <div
        role="tabpanel"
        id="v2-panel-market"
        aria-labelledby="v2-tab-market"
        className={`${styles.tabContent} ${active === "market" ? styles.tabContentActive : ""}`}
      >
        {cmpArr.length === 0 ? (
          d.gated ? (
            <LockedAnalysisUpsell counts={d.gatedCounts} variant="market" />
          ) : (
            <EmptyState
              icon="📊"
              iconCls={styles.esIconAmber}
              title={getEmptyState(docClass, "market").title}
              text={getEmptyState(docClass, "market").text}
            />
          )
        ) : (
          <div className={styles.textBlock}>
            <div className={styles.tbTitle}>📊 Branchenvergleich</div>
            {renderBulletList(cmpArr)}
          </div>
        )}
      </div>
      )}

      {/* OPINION */}
      <div
        role="tabpanel"
        id="v2-panel-opinion"
        aria-labelledby="v2-tab-opinion"
        className={`${styles.tabContent} ${active === "opinion" ? styles.tabContentActive : ""}`}
      >
        {opinion.length === 0 ? (
          d.gated ? (
            <LockedAnalysisUpsell counts={d.gatedCounts} variant="opinion" />
          ) : (
            <EmptyState
              icon="⚖️"
              iconCls=""
              title={getEmptyState(docClass, "opinion").title}
              text={getEmptyState(docClass, "opinion").text}
            />
          )
        ) : (
          <div className={styles.opinionContainer}>
            <div className={opinion.length > 1500 ? styles.opinionScroll : ""}>
              {opinion.split(/\n\n+/).filter(p => p.trim()).map((p, i) => (
                <p className={styles.opinionParagraph} key={i}>{p}</p>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

