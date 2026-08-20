// 🚪 Kontolöschung mit Halteangebot (20.08.2026)
//
// Ersetzt das alte `window.confirm` im Profil. Vier Bildschirme:
//   1. Was im Konto steckt, plus die sanfteren Alternativen
//   2. Warum gehst du? (freiwillig, überspringbar)
//   3. Persönliches Rückkehr-Angebot (20 % auf 3 Monate, 14 Tage)
//   4. Endgültige Bestätigung durch Tippen des Wortes
//
// Grundregel: informieren, nicht blockieren. Kein Schritt ist Pflicht, der Weg zum
// Löschen ist auf jedem Bildschirm sichtbar (DSGVO Art. 17).

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, AlertTriangle, FileText, BellRing, CreditCard, Download,
  Gift, Trash2, ChevronLeft, RefreshCw, CalendarClock, Sparkles
} from "lucide-react";
import styles from "./DeleteAccountModal.module.css";

interface DeletionReason {
  key: string;
  label: string;
}

interface DeletionSummary {
  contracts: number;
  watchedContracts: number;
  analyses: number;
  daysWithUs: number | null;
  subscription: {
    active: boolean;
    plan: string;
    planLabel: string;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
  };
  everPaid: boolean;
  reasons: DeletionReason[];
}

interface RetentionOffer {
  code: string | null;
  expiresAt: string | null;
}

interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDeleted: () => void;
  onOpenNotificationSettings: () => void;
  onExportData: () => void;
  isExporting?: boolean;
}

const BESTAETIGUNGSWORT = "LÖSCHEN";

function formatDatum(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default function DeleteAccountModal({
  isOpen,
  onClose,
  onDeleted,
  onOpenNotificationSettings,
  onExportData,
  isExporting = false
}: DeleteAccountModalProps) {
  const [schritt, setSchritt] = useState<1 | 2 | 3 | 4>(1);
  const [summary, setSummary] = useState<DeletionSummary | null>(null);
  const [ladeSummary, setLadeSummary] = useState(false);
  const [grund, setGrund] = useState<string | null>(null);
  const [grundText, setGrundText] = useState("");
  const [angebot, setAngebot] = useState<RetentionOffer | null>(null);
  const [ladeAngebot, setLadeAngebot] = useState(false);
  const [bestaetigung, setBestaetigung] = useState("");
  const [loescheGerade, setLoescheGerade] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);
  const [portalLaedt, setPortalLaedt] = useState(false);

  // Beim Öffnen zurück auf Anfang und Zahlen holen
  useEffect(() => {
    if (!isOpen) return;
    setSchritt(1);
    setGrund(null);
    setGrundText("");
    setAngebot(null);
    setBestaetigung("");
    setFehler(null);

    let abgebrochen = false;
    setLadeSummary(true);
    fetch("/api/auth/deletion-summary", { credentials: "include" })
      .then(r => (r.ok ? r.json() : Promise.reject(new Error("Übersicht nicht ladbar"))))
      .then(daten => { if (!abgebrochen) setSummary(daten); })
      .catch(() => { /* Ohne Zahlen läuft der Dialog trotzdem, nur ohne Bestandsaufnahme */ })
      .finally(() => { if (!abgebrochen) setLadeSummary(false); });

    return () => { abgebrochen = true; };
  }, [isOpen]);

  // Escape schließt, solange nicht gerade gelöscht wird
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loescheGerade) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, loescheGerade, onClose]);

  // Angebot erst holen, wenn der Nutzer Bildschirm 3 wirklich erreicht
  const holeAngebot = useCallback(async () => {
    if (angebot || ladeAngebot) return;
    setLadeAngebot(true);
    try {
      const res = await fetch("/api/auth/retention-offer", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" }
      });
      const daten = await res.json();
      setAngebot({ code: daten.code ?? null, expiresAt: daten.expiresAt ?? null });
    } catch {
      setAngebot({ code: null, expiresAt: null });
    } finally {
      setLadeAngebot(false);
    }
  }, [angebot, ladeAngebot]);

  const zuSchritt3 = () => {
    setSchritt(3);
    void holeAngebot();
  };

  const oeffnePortal = async () => {
    setPortalLaedt(true);
    try {
      const res = await fetch("/api/stripe/portal", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" }
      });
      const daten = await res.json();
      if (res.ok && daten.url) {
        window.location.href = daten.url;
        return;
      }
      setFehler("Die Abo-Verwaltung lässt sich gerade nicht öffnen. Schreib uns kurz, wir kümmern uns.");
    } catch {
      setFehler("Die Abo-Verwaltung lässt sich gerade nicht öffnen. Schreib uns kurz, wir kümmern uns.");
    } finally {
      setPortalLaedt(false);
    }
  };

  const loeschen = async () => {
    setLoescheGerade(true);
    setFehler(null);
    try {
      const res = await fetch("/api/auth/delete", {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: grund,
          reasonText: grundText.trim() || null,
          offerDeclined: Boolean(angebot?.code)
        })
      });
      if (res.ok) {
        onDeleted();
        return;
      }
      setFehler("Das Konto konnte nicht gelöscht werden. Bitte versuche es noch einmal.");
    } catch {
      setFehler("Das Konto konnte nicht gelöscht werden. Bitte versuche es noch einmal.");
    } finally {
      setLoescheGerade(false);
    }
  };

  if (!isOpen) return null;

  const abo = summary?.subscription;
  const laufzeitEnde = formatDatum(abo?.currentPeriodEnd ?? null);
  const gueltigBis = formatDatum(angebot?.expiresAt ?? null);
  const gruende = summary?.reasons ?? [];

  return (
    <AnimatePresence>
      <motion.div
        className={styles.overlay}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => { if (!loescheGerade) onClose(); }}
      >
        <motion.div
          className={styles.modal}
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-modal-titel"
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.98 }}
          transition={{ duration: 0.18 }}
          onClick={e => e.stopPropagation()}
        >
          <div className={styles.header}>
            <div className={styles.stepDots} aria-hidden="true">
              {[1, 2, 3, 4].map(n => (
                <span key={n} className={n === schritt ? styles.dotAktiv : styles.dot} />
              ))}
            </div>
            <button
              className={styles.closeButton}
              onClick={onClose}
              disabled={loescheGerade}
              aria-label="Schließen"
            >
              <X size={18} />
            </button>
          </div>

          <div className={styles.content}>
            <AnimatePresence mode="wait">

              {/* ---------- 1. Bestandsaufnahme ---------- */}
              {schritt === 1 && (
                <motion.div
                  key="s1"
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  transition={{ duration: 0.15 }}
                >
                  <h2 id="delete-modal-titel" className={styles.titel}>Bevor du dein Konto löschst</h2>
                  <p className={styles.lede}>Das steckt gerade in deinem Konto:</p>

                  {ladeSummary ? (
                    <div className={styles.laden}><RefreshCw size={16} className={styles.spin} /> Einen Moment</div>
                  ) : summary ? (
                    <div className={styles.stats}>
                      <div className={styles.stat}>
                        <b>{summary.contracts}</b>
                        <span>{summary.contracts === 1 ? "Vertrag" : "Verträge"}</span>
                      </div>
                      <div className={styles.stat}>
                        <b>{summary.watchedContracts}</b>
                        <span>{summary.watchedContracts === 1 ? "überwachter Vertrag" : "überwachte Verträge"}</span>
                      </div>
                      <div className={styles.stat}>
                        <b>{summary.analyses}</b>
                        <span>{summary.analyses === 1 ? "Analyse" : "Analysen"}</span>
                      </div>
                      {summary.daysWithUs !== null && (
                        <div className={styles.stat}>
                          <b>{summary.daysWithUs}</b>
                          <span>{summary.daysWithUs === 1 ? "Tag dabei" : "Tage dabei"}</span>
                        </div>
                      )}
                    </div>
                  ) : null}

                  {abo?.active && (
                    <div className={styles.warnung}>
                      <AlertTriangle size={16} />
                      <span>
                        Dein {abo.planLabel}-Abo läuft {laufzeitEnde ? `noch bis ${laufzeitEnde}` : "aktuell"}.
                        Beim Löschen endet es und die Restlaufzeit verfällt.
                      </span>
                    </div>
                  )}

                  <p className={styles.zwischenTitel}>Vielleicht reicht dir auch das:</p>
                  <div className={styles.alternativen}>
                    <button className={styles.alt} onClick={onOpenNotificationSettings}>
                      <BellRing size={17} />
                      <span>
                        <b>Nur die E-Mails abstellen</b>
                        <small>Konto und Verträge bleiben, es wird still</small>
                      </span>
                    </button>
                    <button className={styles.alt} onClick={() => { window.location.href = "/contracts"; }}>
                      <FileText size={17} />
                      <span>
                        <b>Einzelne Verträge löschen</b>
                        <small>Nur das entfernen, was weg soll</small>
                      </span>
                    </button>
                    {abo?.active && (
                      <button className={styles.alt} onClick={oeffnePortal} disabled={portalLaedt}>
                        <CreditCard size={17} />
                        <span>
                          <b>{portalLaedt ? "Wird geöffnet" : "Abo beenden, Konto behalten"}</b>
                          <small>Keine Abbuchung mehr, Daten bleiben erhalten</small>
                        </span>
                      </button>
                    )}
                  </div>

                  {fehler && <p className={styles.fehler}>{fehler}</p>}

                  <div className={styles.aktionen}>
                    <button className={styles.sekundaer} onClick={onExportData} disabled={isExporting}>
                      <Download size={15} />
                      {isExporting ? "Wird vorbereitet" : "Meine Daten herunterladen"}
                    </button>
                    <button className={styles.weiterLeise} onClick={() => setSchritt(2)}>
                      Weiter zum Löschen
                    </button>
                  </div>
                </motion.div>
              )}

              {/* ---------- 2. Grund ---------- */}
              {schritt === 2 && (
                <motion.div
                  key="s2"
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  transition={{ duration: 0.15 }}
                >
                  <h2 id="delete-modal-titel" className={styles.titel}>Warum gehst du?</h2>
                  <p className={styles.lede}>
                    Die Frage ist freiwillig. Deine Antwort hilft uns, Contract AI besser zu machen.
                  </p>

                  <div className={styles.gruende} role="radiogroup" aria-label="Grund für die Löschung">
                    {gruende.map(g => (
                      <button
                        key={g.key}
                        role="radio"
                        aria-checked={grund === g.key}
                        className={grund === g.key ? styles.grundAktiv : styles.grund}
                        onClick={() => setGrund(grund === g.key ? null : g.key)}
                      >
                        <span className={styles.radio} aria-hidden="true" />
                        {g.label}
                      </button>
                    ))}
                  </div>

                  <label className={styles.feldLabel} htmlFor="grund-text">
                    Magst du das kurz ausführen? (freiwillig)
                  </label>
                  <textarea
                    id="grund-text"
                    className={styles.textarea}
                    value={grundText}
                    maxLength={500}
                    rows={3}
                    onChange={e => setGrundText(e.target.value)}
                    placeholder="Was hätte anders laufen müssen?"
                  />
                  <div className={styles.zaehler}>{grundText.length}/500</div>

                  <div className={styles.aktionen}>
                    <button className={styles.zurueck} onClick={() => setSchritt(1)}>
                      <ChevronLeft size={15} /> Zurück
                    </button>
                    <div className={styles.rechts}>
                      <button className={styles.sekundaer} onClick={zuSchritt3}>Überspringen</button>
                      <button className={styles.primaer} onClick={zuSchritt3}>Weiter</button>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ---------- 3. Halteangebot ---------- */}
              {schritt === 3 && (
                <motion.div
                  key="s3"
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  transition={{ duration: 0.15 }}
                >
                  <h2 id="delete-modal-titel" className={styles.titel}>Schade, dass du gehst</h2>

                  {ladeAngebot ? (
                    <div className={styles.laden}><RefreshCw size={16} className={styles.spin} /> Einen Moment</div>
                  ) : angebot?.code ? (
                    <>
                      <p className={styles.lede}>
                        {summary?.everPaid
                          ? "Falls du es dir doch anders überlegst, haben wir etwas für dich:"
                          : "Falls du Business später doch einmal ausprobieren möchtest:"}
                      </p>
                      <div className={styles.angebot}>
                        <div className={styles.angebotKopf}>
                          <Sparkles size={15} />
                          <span>Dein persönlicher Code</span>
                        </div>
                        <div className={styles.rabatt}>20 % Rabatt, 3 Monate lang</div>
                        <div className={styles.code}>{angebot.code}</div>
                        <div className={styles.angebotFuss}>
                          <CalendarClock size={13} />
                          {gueltigBis ? `Gültig bis ${gueltigBis}` : "14 Tage gültig"} · einmal einlösbar
                        </div>
                      </div>
                      <p className={styles.hinweis}>
                        Wir schicken dir den Code gleich auch per E-Mail, damit du ihn nicht verlierst.
                      </p>

                      <div className={styles.aktionen}>
                        <button className={styles.zurueck} onClick={() => setSchritt(2)}>
                          <ChevronLeft size={15} /> Zurück
                        </button>
                        <div className={styles.rechts}>
                          <button className={styles.weiterLeise} onClick={() => setSchritt(4)}>
                            Trotzdem löschen
                          </button>
                          <button
                            className={styles.primaer}
                            onClick={() => { window.location.href = `/pricing?code=${encodeURIComponent(angebot.code as string)}`; }}
                          >
                            <Gift size={15} /> Angebot einlösen
                          </button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className={styles.lede}>
                        Danke, dass du Contract AI ausprobiert hast. Deine Verträge und Analysen
                        werden im nächsten Schritt endgültig gelöscht.
                      </p>
                      <div className={styles.aktionen}>
                        <button className={styles.zurueck} onClick={() => setSchritt(2)}>
                          <ChevronLeft size={15} /> Zurück
                        </button>
                        <button className={styles.primaer} onClick={() => setSchritt(4)}>Weiter</button>
                      </div>
                    </>
                  )}
                </motion.div>
              )}

              {/* ---------- 4. Endgültig ---------- */}
              {schritt === 4 && (
                <motion.div
                  key="s4"
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  transition={{ duration: 0.15 }}
                >
                  <h2 id="delete-modal-titel" className={styles.titel}>Das lässt sich nicht rückgängig machen</h2>
                  <p className={styles.lede}>Mit dem Löschen passiert Folgendes:</p>

                  <ul className={styles.folgen}>
                    <li>
                      {summary ? `${summary.contracts} ${summary.contracts === 1 ? "Vertrag wird" : "Verträge werden"}` : "Alle Verträge werden"} mit allen Analysen gelöscht
                    </li>
                    <li>
                      {summary && summary.watchedContracts > 0
                        ? `${summary.watchedContracts} ${summary.watchedContracts === 1 ? "überwachter Vertrag verliert seine Fristen" : "überwachte Verträge verlieren ihre Fristen"}, keine Erinnerungen mehr`
                        : "Alle Fristen und Erinnerungen entfallen"}
                    </li>
                    {abo?.active && <li>Dein {abo.planLabel}-Abo wird beendet, es wird nichts mehr abgebucht</li>}
                    <li>Deine Adresse wird aus allen Verteilern entfernt</li>
                  </ul>

                  <label className={styles.feldLabel} htmlFor="bestaetigung">
                    Tippe <b>{BESTAETIGUNGSWORT}</b>, um zu bestätigen
                  </label>
                  <input
                    id="bestaetigung"
                    className={styles.input}
                    value={bestaetigung}
                    onChange={e => setBestaetigung(e.target.value)}
                    autoComplete="off"
                    placeholder={BESTAETIGUNGSWORT}
                  />

                  {fehler && <p className={styles.fehler}>{fehler}</p>}

                  <div className={styles.aktionen}>
                    <button className={styles.zurueck} onClick={() => setSchritt(3)} disabled={loescheGerade}>
                      <ChevronLeft size={15} /> Zurück
                    </button>
                    <div className={styles.rechts}>
                      <button className={styles.sekundaer} onClick={onClose} disabled={loescheGerade}>
                        Abbrechen
                      </button>
                      <button
                        className={styles.gefahr}
                        onClick={loeschen}
                        disabled={bestaetigung.trim().toUpperCase() !== BESTAETIGUNGSWORT || loescheGerade}
                      >
                        {loescheGerade ? <RefreshCw size={15} className={styles.spin} /> : <Trash2 size={15} />}
                        {loescheGerade ? "Wird gelöscht" : "Konto endgültig löschen"}
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

            </AnimatePresence>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
