// 📁 components/LegalLens/SmartSummary.tsx
// Smart Summary Komponente - Sofort-Übersicht nach Upload

import React, { useEffect, useState, useCallback } from 'react';
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  ChevronRight,
  RefreshCw,
  X
} from 'lucide-react';
import styles from '../../styles/SmartSummary.module.css';

interface TopRisk {
  rank: number;
  severity: 'critical' | 'warning' | 'info';
  emoji: string;
  title: string;
  section?: string;
  whatItMeans: string;
  worstCase: {
    scenario: string;
    financialRisk: string;
    timeRisk: string;
  };
  recommendation: string;
  negotiationHint?: string;
}

interface SmartSummaryData {
  contractType: string;
  contractTypeDetail: string;
  overallVerdict: {
    action: 'accept' | 'negotiate' | 'reject' | 'review';
    emoji: string;
    headline: string;
    confidence: number;
  };
  riskScore: {
    overall: number;
    breakdown: {
      financial: number;
      legal: number;
      operational: number;
    };
  };
  quickStats: {
    criticalCount: number;
    warningCount: number;
    okayCount: number;
    totalClauses: number;
  };
  topRisks: TopRisk[];
  highlights: {
    positive: string[];
    negative: string[];
    unusual: string[];
  };
  keyTerms: {
    duration: string;
    terminationNotice: string;
    value: string;
    liability?: string;
    specialClauses?: string[];
  };
  nextSteps: Array<{
    priority: number;
    action: string;
    reason: string;
  }>;
  tldr: string;
}

interface SmartSummaryProps {
  contractId: string;
  contractName: string;
  onDismiss: () => void;
}

const SmartSummary: React.FC<SmartSummaryProps> = ({
  contractId,
  contractName,
  onDismiss
}) => {
  const [summary, setSummary] = useState<SmartSummaryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedRisk, setExpandedRisk] = useState<number | null>(0);

  const getApiUrl = useCallback(() => {
    if (import.meta.env.VITE_API_URL) {
      return import.meta.env.VITE_API_URL;
    }
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:5000';
    }
    return 'https://api.contract-ai.de';
  }, []);

  const loadSummary = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const apiUrl = getApiUrl();

      // Erst prüfen ob gecachte Summary existiert
      const cacheResponse = await fetch(`${apiUrl}/api/legal-lens/${contractId}/smart-summary`, {
        credentials: 'include'
      });

      if (cacheResponse.ok) {
        const cacheData = await cacheResponse.json();
        if (cacheData.success && cacheData.summary && cacheData.cached) {
          console.log('[SmartSummary] Using cached summary');
          setSummary(cacheData.summary);
          setIsLoading(false);
          return;
        }
      }

      // Keine gecachte Summary - neue generieren
      console.log('[SmartSummary] Generating new summary...');
      const response = await fetch(`${apiUrl}/api/legal-lens/smart-summary`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contractId })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Smart Summary konnte nicht generiert werden');
      }

      const data = await response.json();
      if (data.success && data.summary) {
        setSummary(data.summary);
      } else {
        throw new Error('Ungültige Antwort vom Server');
      }

    } catch (err) {
      console.error('[SmartSummary] Error:', err);
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler');
    } finally {
      setIsLoading(false);
    }
  }, [contractId, getApiUrl]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);



  // Loading State
  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingState}>
          <div className={styles.loadingSpinner} />
          <h3 className={styles.loadingTitle}>KI analysiert Vertrag...</h3>
          <p className={styles.loadingSubtitle}>
            Identifiziere Risiken und erstelle Übersicht
          </p>
          <div className={styles.loadingSteps}>
            <div className={styles.loadingStep}>
              <CheckCircle size={16} /> Vertragstext extrahiert
            </div>
            <div className={`${styles.loadingStep} ${styles.active}`}>
              <RefreshCw size={16} className={styles.spinning} /> Analysiere Klauseln...
            </div>
            <div className={styles.loadingStep}>
              <Clock size={16} /> Erstelle Zusammenfassung
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.errorState}>
          <AlertTriangle size={48} className={styles.errorIcon} />
          <h3 className={styles.errorTitle}>Analyse fehlgeschlagen</h3>
          <p className={styles.errorMessage}>{error}</p>
          <div className={styles.errorActions}>
            <button onClick={loadSummary} className={styles.retryButton}>
              <RefreshCw size={16} /> Erneut versuchen
            </button>
            <button onClick={onDismiss} className={styles.skipButton}>
              Überspringen
            </button>
          </div>
        </div>
      </div>
    );
  }

  /**
   * 07.09.2026: overallVerdict.action bestimmt die Ampel.
   * accept = tragbar, negotiate = mit Auflagen, reject = nicht so,
   * review = unklar. Ohne das Feld bleibt der Rahmen neutral grau.
   */
  const aktion = summary?.overallVerdict?.action;
  const ampelRahmen =
    aktion === 'accept' ? styles.ssKopfGruen :
    aktion === 'reject' ? styles.ssKopfRot :
    aktion === 'negotiate' ? styles.ssKopfGelb : styles.ssKopfGrau;
  const ampelText =
    aktion === 'accept' ? styles.ssAmpelGruen :
    aktion === 'reject' ? styles.ssAmpelRot :
    aktion === 'negotiate' ? styles.ssAmpelGelb : styles.ssAmpelGrau;
  const ampelWort =
    aktion === 'accept' ? 'Tragbar' :
    aktion === 'reject' ? 'So nicht unterschreiben' :
    aktion === 'negotiate' ? 'Mit Auflagen tragbar' : 'Prüfung empfohlen';

  /** Je hoeher das Risiko, desto roter. Dieselben Schwellen wie bisher. */
  const risikoFarbe = (wert: number) =>
    wert > 70 ? '#dc2626' : wert > 40 ? '#b45309' : '#15803d';

  if (!summary) return null;

  return (
    <div className={styles.container}>
      {/* 08.09.2026: Das Karten-Element. .container ist nur die
          Overlay-Hülle (position:fixed, dunkler Grund). Ohne diesen
          Rahmen lief der Inhalt ungerahmt über die ganze Seite, und die
          --ss-Variablen (auf .ssFenster definiert) griffen nirgends. */}
      <div className={styles.ssFenster}>
      <div className={`${styles.ssKopf} ${ampelRahmen}`}>
        <div className={styles.ssKopfText}>
          {/* 07.09.2026: overallVerdict wird vom Backend geliefert (die KI
              wird ausdruecklich danach gefragt) und war hier nirgends
              angezeigt. Der Satz sagt, ob man unterschreiben kann. */}
          {summary.overallVerdict?.headline ? (
            <>
              <p className={`${styles.ssAmpel} ${ampelText}`}>{ampelWort}</p>
              <p className={styles.ssUrteil}>{summary.overallVerdict.headline}</p>
            </>
          ) : (
            <p className={styles.ssUrteil}>Das Wichtigste aus deinem Vertrag</p>
          )}
          <p className={styles.ssTyp}>
            {/* contractName sagt, WELCHEN Vertrag man vor sich hat.
                Stand vorher als Untertitel im Kopf. */}
            {contractName}
            {summary.contractType ? ` · ${summary.contractType}` : ''}
            {summary.contractTypeDetail ? ` · ${summary.contractTypeDetail}` : ''}
          </p>
        </div>
        <button onClick={onDismiss} className={styles.ssZu} aria-label="Übersicht schließen">
          <X size={16} />
        </button>
      </div>

      <div className={styles.ssInhalt}>

        {/* ── Die Essenz. Stand vorher als LETZTER Abschnitt unten. ── */}
        {summary.tldr && (
          <p className={styles.ssEssenz}>{summary.tldr}</p>
        )}

        {/* ── Was konkret zu beachten ist ── */}
        {summary.topRisks && summary.topRisks.length > 0 && (
          <div>
            <p className={styles.ssZonenTitel}>Was du beachten solltest</p>
            <div className={styles.ssRisiken}>
              {summary.topRisks.map((risk, index) => {
                const offen = expandedRisk === index;
                const marke = risk.severity === 'critical' ? styles.ssMarkeRot
                  : risk.severity === 'warning' ? styles.ssMarkeGelb : styles.ssMarkeBlau;
                const kante = risk.severity === 'critical' ? styles.ssRisikoRot
                  : risk.severity === 'warning' ? styles.ssRisikoGelb : styles.ssRisikoBlau;
                const markeWort = risk.severity === 'critical' ? 'Kritisch'
                  : risk.severity === 'warning' ? 'Prüfen' : 'Hinweis';
                return (
                  <div key={index} className={`${styles.ssRisiko} ${kante}`}>
                    <button
                      className={styles.ssRisikoKopf}
                      onClick={() => setExpandedRisk(offen ? null : index)}
                      aria-expanded={offen}
                    >
                      <span className={`${styles.ssRisikoMarke} ${marke}`}>{markeWort}</span>
                      <span className={styles.ssRisikoText}>
                        <span className={styles.ssRisikoTitel}>{risk.title}</span>
                        {risk.section && <span className={styles.ssRisikoStelle}>{risk.section}</span>}
                      </span>
                      <ChevronRight
                        size={16}
                        className={`${styles.ssRisikoPfeil} ${offen ? styles.ssRisikoPfeilAuf : ''}`}
                      />
                    </button>

                    {offen && (
                      <div className={styles.ssRisikoInhalt}>
                        {risk.whatItMeans && (
                          <div className={styles.ssBlock}>
                            <span className={styles.ssBlockTitel}>Was das für dich bedeutet</span>
                            <p className={styles.ssBlockText}>{risk.whatItMeans}</p>
                          </div>
                        )}

                        {(risk.worstCase?.financialRisk || risk.worstCase?.timeRisk) && (
                          <div className={styles.ssBlock}>
                            <span className={styles.ssBlockTitel}>Schlimmstenfalls</span>
                            <div className={styles.ssFolgen}>
                              {risk.worstCase?.financialRisk && (
                                <span className={styles.ssFolge}>
                                  <span className={styles.ssFolgeLabel}>Finanziell</span>
                                  <span className={styles.ssFolgeWert}>{risk.worstCase.financialRisk}</span>
                                </span>
                              )}
                              {risk.worstCase?.timeRisk && (
                                <span className={styles.ssFolge}>
                                  <span className={styles.ssFolgeLabel}>Zeitlich</span>
                                  <span className={styles.ssFolgeWert}>{risk.worstCase.timeRisk}</span>
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        {risk.recommendation && (
                          <div className={styles.ssBlock}>
                            <span className={styles.ssBlockTitel}>Empfehlung</span>
                            <p className={styles.ssBlockText}>{risk.recommendation}</p>
                          </div>
                        )}

                        {risk.negotiationHint && (
                          <div className={styles.ssBlock}>
                            <span className={styles.ssBlockTitel}>So sprichst du es an</span>
                            <p className={styles.ssZitat}>„{risk.negotiationHint}"</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Was zu tun ist ── */}
        {summary.nextSteps && summary.nextSteps.length > 0 && (
          <div>
            <p className={styles.ssZonenTitel}>Nächste Schritte</p>
            <div className={styles.ssSchritte}>
              {summary.nextSteps.map((step, index) => (
                <div key={index} className={styles.ssSchritt}>
                  <span className={styles.ssSchrittNr}>{step.priority}</span>
                  <span className={styles.ssSchrittText}>
                    <span className={styles.ssSchrittTun}>{step.action}</span>
                    {step.reason && <span className={styles.ssSchrittGrund}>{step.reason}</span>}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Wo das Risiko liegt: Ring, Balken und Zahlen zusammen ── */}
        <div>
          <p className={styles.ssZonenTitel}>Wo das Risiko liegt</p>
          <div className={styles.ssRisikoLage}>
            <div>
              <div className={styles.ssRing}>
                <svg viewBox="0 0 100 100" className={styles.ssRingSvg}>
                  <circle cx="50" cy="50" r="45" fill="none" className={styles.ssRingSpur} strokeWidth="8" />
                  <circle
                    cx="50" cy="50" r="45" fill="none"
                    stroke={risikoFarbe(summary.riskScore?.overall ?? 0)}
                    strokeWidth="8"
                    strokeDasharray={`${(summary.riskScore?.overall ?? 0) * 2.83} 283`}
                    strokeLinecap="round"
                  />
                </svg>
                <span className={styles.ssRingWert}>{summary.riskScore?.overall ?? '–'}</span>
              </div>
              <span className={styles.ssRingLabel}>Gesamtrisiko</span>
            </div>

            <div className={styles.ssBalken}>
              {([
                ['Finanziell', summary.riskScore?.breakdown?.financial ?? 0],
                ['Rechtlich', summary.riskScore?.breakdown?.legal ?? 0],
                ['Operativ', summary.riskScore?.breakdown?.operational ?? 0]
              ] as [string, number][]).map(([name, wert]) => (
                <div key={name} className={styles.ssBalkenZeile}>
                  <span className={styles.ssBalkenName}>{name}</span>
                  <span className={styles.ssBalkenSpur}>
                    <span
                      className={styles.ssBalkenFuell}
                      style={{ width: `${wert}%`, background: risikoFarbe(wert) }}
                    />
                  </span>
                  <span className={styles.ssBalkenWert} style={{ color: risikoFarbe(wert) }}>{wert}</span>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.ssZahlen}>
            <span className={styles.ssZahl}>
              <span className={styles.ssZahlWert} style={{ color: '#dc2626' }}>
                {summary.quickStats?.criticalCount ?? 0}
              </span>
              <span className={styles.ssZahlLabel}>kritisch</span>
            </span>
            <span className={styles.ssZahl}>
              <span className={styles.ssZahlWert} style={{ color: '#b45309' }}>
                {summary.quickStats?.warningCount ?? 0}
              </span>
              <span className={styles.ssZahlLabel}>prüfenswert</span>
            </span>
            <span className={styles.ssZahl}>
              <span className={styles.ssZahlWert} style={{ color: '#15803d' }}>
                {summary.quickStats?.okayCount ?? 0}
              </span>
              <span className={styles.ssZahlLabel}>unauffällig</span>
            </span>
          </div>
        </div>

        {/* ── Eckdaten ── */}
        <div>
          <p className={styles.ssZonenTitel}>Die Eckdaten</p>
          <div className={styles.ssEckdaten}>
            <span className={styles.ssEck}>
              <span className={styles.ssEckLabel}>Laufzeit</span>
              <span className={styles.ssEckWert}>{summary.keyTerms?.duration ?? 'Nicht angegeben'}</span>
            </span>
            <span className={styles.ssEck}>
              <span className={styles.ssEckLabel}>Kündigungsfrist</span>
              <span className={styles.ssEckWert}>{summary.keyTerms?.terminationNotice ?? 'Nicht angegeben'}</span>
            </span>
            {summary.keyTerms?.value && summary.keyTerms.value !== 'Nicht angegeben' && (
              <span className={styles.ssEck}>
                <span className={styles.ssEckLabel}>Vertragswert</span>
                <span className={styles.ssEckWert}>{summary.keyTerms.value}</span>
              </span>
            )}
          </div>
        </div>

        {/* ── Weitere Beobachtungen ── */}
        {((summary.highlights?.positive?.length ?? 0) > 0 ||
          (summary.highlights?.negative?.length ?? 0) > 0 ||
          (summary.highlights?.unusual?.length ?? 0) > 0) && (
          <div>
            <p className={styles.ssZonenTitel}>Weitere Beobachtungen</p>
            <div className={styles.ssBeobachtungen}>
              {(summary.highlights?.negative?.length ?? 0) > 0 && (
                <div className={styles.ssGruppe}>
                  <p className={styles.ssGruppeTitel}>
                    <span className={`${styles.ssPunkt} ${styles.ssPunktRot}`} />
                    Spricht dagegen
                  </p>
                  <ul className={styles.ssListe}>
                    {summary.highlights.negative.map((item, i) => <li key={i}>{item}</li>)}
                  </ul>
                </div>
              )}
              {(summary.highlights?.unusual?.length ?? 0) > 0 && (
                <div className={styles.ssGruppe}>
                  <p className={styles.ssGruppeTitel}>
                    <span className={`${styles.ssPunkt} ${styles.ssPunktGelb}`} />
                    Ungewöhnlich
                  </p>
                  <ul className={styles.ssListe}>
                    {summary.highlights.unusual.map((item, i) => <li key={i}>{item}</li>)}
                  </ul>
                </div>
              )}
              {(summary.highlights?.positive?.length ?? 0) > 0 && (
                <div className={styles.ssGruppe}>
                  <p className={styles.ssGruppeTitel}>
                    <span className={`${styles.ssPunkt} ${styles.ssPunktGruen}`} />
                    Spricht dafür
                  </p>
                  <ul className={styles.ssListe}>
                    {summary.highlights.positive.map((item, i) => <li key={i}>{item}</li>)}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className={styles.ssFuss}>
        <button onClick={onDismiss} className={styles.ssKnopf}>
          Zur ausführlichen Analyse
          <ChevronRight size={16} />
        </button>
      </div>
      </div>
    </div>
  );
};

export default SmartSummary;
