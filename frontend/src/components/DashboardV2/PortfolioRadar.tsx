// 📁 components/DashboardV2/PortfolioRadar.tsx
// 🧭 Cockpit v1 (Phase 1.1c, 12.09.2026): Fristen-Radar 90 Tage + Auto-Renewals + Deckung.
// Liest NUR GET /api/portfolio/summary (Aggregation aus Phase 1.1b) — keine eigene
// Fristenlogik, keine Finanzzahlen. Geschätzte Fristen werden sichtbar markiert.
// Eigenes CSS-Modul, damit das geteilte DashboardV2.module.css unangetastet bleibt.

import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Radar, RefreshCw, Repeat, ArrowRight, CheckCircle } from "lucide-react";
import { fixUtf8Display } from "../../utils/textUtils";
import styles from "./PortfolioRadar.module.css";

const API_BASE = import.meta.env.VITE_API_URL || "https://api.contract-ai.de";

interface RadarEintrag {
  eventId?: string;
  contractId?: string;
  titel: string;
  vertrag: string | null;
  typ: string;
  datum: string;
  inTagen: number;
  severity: "info" | "warning" | "critical";
  confidence: number | null;
  istGeschaetzt: boolean;
}

interface RadarFenster {
  anzahl: number;
  geschaetzt: number;
  eintraege: RadarEintrag[];
}

interface PortfolioSummary {
  success: boolean;
  fristenRadar: {
    tage0bis30: RadarFenster;
    tage31bis60: RadarFenster;
    tage61bis90: RadarFenster;
  };
  autoRenewals: {
    anzahl: number;
    eintraege: { contractId?: string; name: string; ablaufDatum: string | null; ablaufInTagen: number | null }[];
  };
  score: { kritischUnter40: number; mittel40bis69: number; gut70plus: number; nichtAnalysiert: number };
  deckung: { gesamt: number; analysiert: number; aktiveOhneEnddatum: number; radarEventsBetrachtet: number };
}

const FENSTER: { key: keyof PortfolioSummary["fristenRadar"]; label: string }[] = [
  { key: "tage0bis30", label: "0–30 Tage" },
  { key: "tage31bis60", label: "31–60 Tage" },
  { key: "tage61bis90", label: "61–90 Tage" },
];

const tageText = (t: number | null): string => {
  if (t === null) return "ohne Datum";
  if (t === 0) return "heute";
  if (t === 1) return "morgen";
  return `in ${t} Tagen`;
};

export default function PortfolioRadar() {
  const [data, setData] = useState<PortfolioSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const navigate = useNavigate();

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(false);
    try {
      const token = localStorage.getItem("authToken") || localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/api/portfolio/summary`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        credentials: "include",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: PortfolioSummary = await res.json();
      if (!json.success) throw new Error("success=false");
      setData(json);
    } catch {
      setError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const oeffneEintrag = (e: RadarEintrag) => {
    if (e.eventId) navigate(`/calendar?eventId=${e.eventId}`);
    else if (e.contractId) navigate(`/contracts/${e.contractId}`);
  };

  // Kein Vertrag im Bestand → das Widget hat nichts zu sagen; die bestehenden
  // Empty States der Listen übernehmen die Ansprache.
  if (!isLoading && !error && data && data.deckung.gesamt === 0) return null;

  const fristenGesamt = data
    ? data.fristenRadar.tage0bis30.anzahl + data.fristenRadar.tage31bis60.anzahl + data.fristenRadar.tage61bis90.anzahl
    : 0;

  return (
    <div className={styles.radarCard}>
      <div className={styles.radarHeader}>
        <div className={styles.radarHeaderLeft}>
          <Radar size={16} className={styles.radarIcon} />
          <span>Fristen-Radar · nächste 90 Tage</span>
        </div>
        <Link to="/calendar" className={styles.radarLink}>
          Kalender <ArrowRight size={14} />
        </Link>
      </div>

      {isLoading && (
        <div className={styles.radarLoading}>
          <RefreshCw size={18} className={styles.radarSpin} />
          <span>Portfolio wird geladen …</span>
        </div>
      )}

      {!isLoading && error && (
        <div className={styles.radarError}>
          <span>Die Portfolio-Übersicht konnte nicht geladen werden.</span>
          <button type="button" onClick={load} className={styles.radarRetry}>Erneut versuchen</button>
        </div>
      )}

      {!isLoading && !error && data && (
        <>
          {fristenGesamt === 0 ? (
            <div className={styles.radarEmpty}>
              <CheckCircle size={20} className={styles.radarEmptyIcon} />
              <div>
                <strong>Keine Fristen in den nächsten 90 Tagen.</strong>
                {data.deckung.aktiveOhneEnddatum > 0 && (
                  <p className={styles.radarEmptyHinweis}>
                    Hinweis: Bei {data.deckung.aktiveOhneEnddatum} aktiven{" "}
                    {data.deckung.aktiveOhneEnddatum === 1 ? "Vertrag" : "Verträgen"} ist kein Enddatum
                    erkannt — dort kann der Radar nichts überwachen.
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className={styles.radarFenster}>
              {FENSTER.map(({ key, label }) => {
                const f = data.fristenRadar[key];
                return (
                  <div key={key} className={styles.fensterSpalte}>
                    <div className={styles.fensterKopf}>
                      <span className={styles.fensterLabel}>{label}</span>
                      <span className={`${styles.fensterZahl} ${key === "tage0bis30" && f.anzahl > 0 ? styles.fensterZahlDringend : ""}`}>
                        {f.anzahl}
                      </span>
                    </div>
                    {f.eintraege.length === 0 ? (
                      <span className={styles.fensterLeer}>Keine Fristen</span>
                    ) : (
                      <ul className={styles.fensterListe}>
                        {f.eintraege.map((e) => (
                          <li key={e.eventId || `${e.contractId}-${e.datum}`}>
                            <button
                              type="button"
                              className={`${styles.fristEintrag} ${e.istGeschaetzt ? styles.fristGeschaetzt : ""}`}
                              onClick={() => oeffneEintrag(e)}
                              title={e.istGeschaetzt ? "Geschätzte Frist — Datum bitte im Vertrag prüfen" : undefined}
                            >
                              <span className={`${styles.fristPunkt} ${e.severity === "critical" ? styles.fristPunktRot : e.severity === "warning" ? styles.fristPunktOrange : styles.fristPunktBlau}`} />
                              <span className={styles.fristText}>
                                <span className={styles.fristTitel}>{fixUtf8Display(e.titel)}</span>
                                {/* Unterzeile nur, wenn der Titel den Vertragsnamen nicht schon trägt
                                    (generische Titel wie „Kündigungsfrist während der Probezeit") */}
                                {e.vertrag && !e.titel.includes(e.vertrag) && (
                                  <span className={styles.fristVertrag}>{fixUtf8Display(e.vertrag)}</span>
                                )}
                              </span>
                              <span className={styles.fristTage}>
                                {tageText(e.inTagen)}
                                {e.istGeschaetzt && <em className={styles.fristSchaetzMarke}> · geschätzt</em>}
                              </span>
                            </button>
                          </li>
                        ))}
                        {f.anzahl > f.eintraege.length && (
                          <li className={styles.fensterMehr}>
                            <Link to="/calendar">+ {f.anzahl - f.eintraege.length} weitere im Kalender</Link>
                          </li>
                        )}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {data.autoRenewals.anzahl > 0 && (
            <div className={styles.renewalBlock}>
              <div className={styles.renewalKopf}>
                <Repeat size={14} />
                <span>
                  {data.autoRenewals.anzahl === 1
                    ? "1 Vertrag verlängert sich automatisch"
                    : `${data.autoRenewals.anzahl} Verträge verlängern sich automatisch`}
                </span>
              </div>
              <ul className={styles.renewalListe}>
                {data.autoRenewals.eintraege.map((r) => (
                  <li key={r.contractId || r.name}>
                    <button
                      type="button"
                      className={styles.renewalEintrag}
                      onClick={() => r.contractId && navigate(`/contracts/${r.contractId}`)}
                    >
                      <span className={styles.renewalName}>{fixUtf8Display(r.name)}</span>
                      <span className={styles.renewalTage}>
                        {r.ablaufInTagen === null ? "Ablauf unbekannt" : `läuft ${tageText(r.ablaufInTagen)} ab`}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className={styles.deckungZeile}>
            <span>
              {data.deckung.analysiert} von {data.deckung.gesamt} Dokumenten analysiert
              {data.deckung.aktiveOhneEnddatum > 0 && (
                <> · {data.deckung.aktiveOhneEnddatum} aktive ohne erkanntes Enddatum</>
              )}
            </span>
            {data.score.kritischUnter40 > 0 && (
              <Link to="/contracts" className={styles.deckungKritisch}>
                {data.score.kritischUnter40 === 1
                  ? "1 Vertrag mit kritischem Score prüfen"
                  : `${data.score.kritischUnter40} Verträge mit kritischem Score prüfen`}
              </Link>
            )}
          </div>
        </>
      )}
    </div>
  );
}
