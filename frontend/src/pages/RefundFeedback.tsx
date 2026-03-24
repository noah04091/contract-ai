import React, { useState, useEffect, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Helmet } from "react-helmet-async";
import { MessageSquare, ArrowLeft, FileText } from "lucide-react";
import styles from "./RefundFeedback.module.css";

const API_URL = import.meta.env.VITE_API_URL || "https://api.contract-ai.de";

// ─── Optionen ────────────────────────────────────
const FEATURES = [
  "Vertragsanalyse",
  "Vertragsoptimierung",
  "Legal Pulse",
  "KI-Chat",
  "Vertragsvergleich",
  "Fristenkalender",
  "Vertragsgenerator",
  "Legal Lens",
  "Digitale Signatur",
  "Contract Builder",
];

const CANCELLATION_REASONS = [
  "Zu teuer f\u00fcr den gebotenen Funktionsumfang",
  "Funktionen entsprechen nicht meinen Erwartungen",
  "Qualit\u00e4t der KI-Ergebnisse nicht ausreichend",
  "Zu kompliziert in der Bedienung",
  "Fehlende Funktionen, die ich ben\u00f6tigt h\u00e4tte",
  "Technische Probleme / Bugs",
  "Alternative L\u00f6sung gefunden",
  "Kein Bedarf mehr",
  "Nur zum Testen registriert",
];

const ADDITIONAL_REASONS = [
  "Analyseergebnisse waren ungenau oder oberfl\u00e4chlich",
  "Optimierungsvorschl\u00e4ge waren nicht praxistauglich",
  "Zu lange Wartezeiten bei der Verarbeitung",
  "Fehlende Vertragstypen / Branchen",
  "Schlechte Dokumentenerkennung (PDF/OCR)",
  "Un\u00fcbersichtliche Benutzeroberfl\u00e4che",
  "Fehlende Integrationen (z.B. CRM, DMS)",
  "Datenschutzbedenken",
  "Kundenservice nicht zufriedenstellend",
  "Keine Collaboration- / Team-Features",
];

const FEATURE_RATING_KEYS: { key: string; label: string }[] = [
  { key: "vertragsanalyse", label: "Vertragsanalyse" },
  { key: "optimizer", label: "Optimierung" },
  { key: "legalPulse", label: "Legal Pulse" },
  { key: "chat", label: "KI-Chat" },
  { key: "vergleich", label: "Vergleich" },
  { key: "kalender", label: "Kalender" },
  { key: "generator", label: "Generator" },
  { key: "legalLens", label: "Legal Lens" },
];

const STAR_LABELS = ["", "Sehr schlecht", "Schlecht", "Okay", "Gut", "Sehr gut"];

// ─── Types ───────────────────────────────────────
type PageState = "loading" | "form" | "submitted" | "already" | "error";

export default function RefundFeedback() {
  const { token } = useParams<{ token: string }>();

  const [pageState, setPageState] = useState<PageState>("loading");
  const [customerName, setCustomerName] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const [overallRating, setOverallRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [usedFeatures, setUsedFeatures] = useState<string[]>([]);
  const [cancellationReason, setCancellationReason] = useState("");
  const [additionalReasons, setAdditionalReasons] = useState<string[]>([]);
  const [featureRatings, setFeatureRatings] = useState<Record<string, number>>({});
  const [expectedFeatures, setExpectedFeatures] = useState("");
  const [positiveFeedback, setPositiveFeedback] = useState("");
  const [negativeFeedback, setNegativeFeedback] = useState("");
  const [npsScore, setNpsScore] = useState<number | null>(null);
  const [suggestions, setSuggestions] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // Progress calculation
  const progress = useMemo(() => {
    let filled = 0;
    const total = 7;
    if (overallRating > 0) filled++;
    if (usedFeatures.length > 0) filled++;
    if (cancellationReason) filled++;
    if (expectedFeatures.trim()) filled++;
    if (positiveFeedback.trim() || negativeFeedback.trim()) filled++;
    if (npsScore !== null) filled++;
    if (suggestions.trim()) filled++;
    return Math.round((filled / total) * 100);
  }, [overallRating, usedFeatures, cancellationReason, expectedFeatures, positiveFeedback, negativeFeedback, npsScore, suggestions]);

  // ─── Load token data ─────────────────────────
  useEffect(() => {
    if (!token) {
      setErrorMsg("Kein g\u00fcltiger Feedback-Link.");
      setPageState("error");
      return;
    }

    (async () => {
      try {
        const res = await fetch(`${API_URL}/api/refund-feedback/${token}`);
        const data = await res.json();

        if (!res.ok) {
          setErrorMsg(data.error || "Link nicht gefunden.");
          setPageState("error");
          return;
        }

        if (data.alreadySubmitted) {
          setCustomerName(data.customerName);
          setPageState("already");
          return;
        }

        setCustomerName(data.customerName);
        setPageState("form");
      } catch {
        setErrorMsg("Verbindungsfehler. Bitte versuche es sp\u00e4ter erneut.");
        setPageState("error");
      }
    })();
  }, [token]);

  // ─── Toggle helpers ──────────────────────────
  const toggleFeature = (f: string) =>
    setUsedFeatures((prev) => (prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]));

  const toggleAdditional = (r: string) =>
    setAdditionalReasons((prev) => (prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]));

  const setFeatureRating = (key: string, val: number) =>
    setFeatureRatings((prev) => ({ ...prev, [key]: val }));

  // ─── Submit ──────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!overallRating) {
      setFormError("Bitte gib eine Gesamtbewertung ab.");
      return;
    }
    if (!cancellationReason) {
      setFormError("Bitte w\u00e4hle einen K\u00fcndigungsgrund.");
      return;
    }
    if (!expectedFeatures.trim()) {
      setFormError("Bitte beschreibe, was du dir von Contract AI vorgestellt hast.");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch(`${API_URL}/api/refund-feedback/${token}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          overallRating,
          usedFeatures,
          cancellationReason,
          additionalReasons,
          featureRatings,
          expectedFeatures,
          positiveFeedback,
          negativeFeedback,
          npsScore,
          suggestions,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setFormError(data.error || "Fehler beim Absenden.");
        setSubmitting(false);
        return;
      }

      setPageState("submitted");
    } catch {
      setFormError("Verbindungsfehler. Bitte versuche es erneut.");
      setSubmitting(false);
    }
  };

  // ─── Background Mesh ─────────────────────────
  const BgMesh = () => (
    <div className={styles.bgMesh}>
      <div className={styles.bgOrb1} />
      <div className={styles.bgOrb2} />
      <div className={styles.bgOrb3} />
    </div>
  );

  const Logo = () => (
    <Link to="/" className={styles.logo}>
      <div className={styles.logoMark}><FileText size={17} /></div>
      Contract AI
    </Link>
  );

  // ─── Render: Loading ─────────────────────────
  if (pageState === "loading") {
    return (
      <div className={styles.page}>
        <BgMesh />
        <Helmet><title>Feedback | Contract AI</title></Helmet>
        <div className={styles.content}>
          <Logo />
          <div className={styles.stateContainer}>
            <div className={styles.spinner} />
            <p className={styles.loadingText}>Feedback wird geladen...</p>
          </div>
        </div>
      </div>
    );
  }

  // ─── Render: Error ───────────────────────────
  if (pageState === "error") {
    return (
      <div className={styles.page}>
        <BgMesh />
        <Helmet><title>Feedback nicht gefunden | Contract AI</title></Helmet>
        <div className={styles.content}>
          <Logo />
          <div className={styles.stateContainer}>
            <div className={styles.errorIcon}>&#128533;</div>
            <h2 className={styles.errorTitle}>Link nicht gefunden</h2>
            <p className={styles.errorText}>{errorMsg}</p>
          </div>
        </div>
      </div>
    );
  }

  // ─── Render: Already Submitted ───────────────
  if (pageState === "already") {
    return (
      <div className={styles.page}>
        <BgMesh />
        <Helmet><title>Feedback bereits abgegeben | Contract AI</title></Helmet>
        <div className={styles.content}>
          <Logo />
          <motion.div
            className={styles.alreadyCard}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className={styles.alreadyIcon}>&#9989;</div>
            <h2 className={styles.alreadyTitle}>Feedback bereits abgegeben</h2>
            <p className={styles.alreadyText}>
              Vielen Dank, {customerName}! Du hast dein Feedback bereits abgegeben.
              Deine R{"\u00fc"}ckerstattung wird bearbeitet.
            </p>
          </motion.div>
        </div>
      </div>
    );
  }

  // ─── Render: Success ─────────────────────────
  if (pageState === "submitted") {
    return (
      <div className={styles.page}>
        <BgMesh />
        <Helmet><title>Vielen Dank! | Contract AI</title></Helmet>
        <div className={styles.content}>
          <Logo />
          <motion.div
            className={styles.successCard}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, type: "spring" }}
          >
            <div className={styles.successIconWrap}>&#10003;</div>
            <h2 className={styles.successTitle}>Vielen Dank f{"\u00fc"}r dein Feedback!</h2>
            <p className={styles.successText}>
              Dein Feedback hilft uns, Contract AI besser zu machen.
              Deine R{"\u00fc"}ckerstattung wird nun bearbeitet und du erh{"\u00e4"}ltst eine
              Best{"\u00e4"}tigung per E-Mail.
            </p>
            <Link to="/" className={styles.successHomeLink}>
              <ArrowLeft size={16} />
              Zur{"\u00fc"}ck zur Startseite
            </Link>
          </motion.div>
        </div>
      </div>
    );
  }

  // ─── Section number counter ──────────────────
  let sectionCounter = 0;
  const nextNum = () => { sectionCounter++; return sectionCounter; };

  // ─── Render: Form ────────────────────────────
  return (
    <>
      <Helmet>
        <title>Feedback zur K{"\u00fc"}ndigung | Contract AI</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>

      <div className={styles.page}>
        <BgMesh />
        <div className={styles.content}>
          <Logo />

          {/* Progress */}
          <div className={styles.progressWrap}>
            <div className={styles.progressBar}>
              <div className={styles.progressFill} style={{ width: `${progress}%` }} />
            </div>
            <div className={styles.progressLabel}>{progress}% ausgef{"\u00fc"}llt</div>
          </div>

          <motion.div
            className={styles.card}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* Header */}
            <div className={styles.header}>
              <motion.div
                className={styles.headerIconWrap}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.2, type: "spring" }}
              >
                <MessageSquare size={26} />
              </motion.div>
              <h1 className={styles.title}>Dein Feedback ist uns wichtig</h1>
              <p className={styles.subtitle}>
                Hilf uns, Contract AI zu verbessern. Dein ehrliches Feedback erm{"\u00f6"}glicht es uns,
                unsere Plattform weiterzuentwickeln.
              </p>
              {customerName && (
                <p className={styles.greeting}>
                  Hallo <span className={styles.greetingName}>{customerName}</span>
                </p>
              )}
            </div>

            {/* Form */}
            <form className={styles.form} onSubmit={handleSubmit}>
              {/* Info-Hinweis */}
              <div className={styles.importantNote}>
                <span className={styles.importantNoteIcon}>&#9432;</span>
                <span className={styles.importantNoteText}>
                  Bitte f{"\u00fc"}ll dieses Formular vollst{"\u00e4"}ndig aus. Nach Eingang deines Feedbacks
                  wird deine R{"\u00fc"}ckerstattung bearbeitet.
                </span>
              </div>

              {/* 1. Gesamtbewertung */}
              <div className={styles.section}>
                <div className={styles.sectionHeader}>
                  <div className={styles.sectionNum}>{nextNum()}</div>
                  <div className={styles.sectionLabelWrap}>
                    <label className={styles.sectionLabel}>
                      Wie zufrieden warst du insgesamt mit Contract AI?
                      <span className={styles.required}>*</span>
                    </label>
                  </div>
                </div>
                <div className={styles.starRow}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      className={`${styles.star} ${(hoverRating || overallRating) >= n ? styles.starActive : ""}`}
                      onMouseEnter={() => setHoverRating(n)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => setOverallRating(n)}
                      aria-label={`${n} Stern${n > 1 ? "e" : ""}`}
                    >
                      &#9733;
                    </button>
                  ))}
                  {(hoverRating || overallRating) > 0 && (
                    <span className={styles.starLabel}>{STAR_LABELS[hoverRating || overallRating]}</span>
                  )}
                </div>
              </div>

              <div className={styles.divider} />

              {/* 2. Genutzte Features */}
              <div className={styles.section}>
                <div className={styles.sectionHeader}>
                  <div className={styles.sectionNum}>{nextNum()}</div>
                  <div className={styles.sectionLabelWrap}>
                    <label className={styles.sectionLabel}>Welche Funktionen hast du genutzt?</label>
                  </div>
                </div>
                <div className={styles.checkboxGrid}>
                  {FEATURES.map((f) => {
                    const active = usedFeatures.includes(f);
                    return (
                      <label key={f} className={`${styles.checkboxItem} ${active ? styles.checkboxItemActive : ""}`}>
                        <input type="checkbox" checked={active} onChange={() => toggleFeature(f)} />
                        <span className={`${styles.checkmark} ${active ? styles.checkmarkActive : ""}`}>
                          {active ? "\u2713" : ""}
                        </span>
                        {f}
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className={styles.divider} />

              {/* 3. Hauptgrund */}
              <div className={styles.section}>
                <div className={styles.sectionHeader}>
                  <div className={styles.sectionNum}>{nextNum()}</div>
                  <div className={styles.sectionLabelWrap}>
                    <label className={styles.sectionLabel}>
                      Was war der Hauptgrund f{"\u00fc"}r deine K{"\u00fc"}ndigung?
                      <span className={styles.required}>*</span>
                    </label>
                  </div>
                </div>
                <div className={styles.radioGroup}>
                  {CANCELLATION_REASONS.map((r) => {
                    const active = cancellationReason === r;
                    return (
                      <label key={r} className={`${styles.radioItem} ${active ? styles.radioItemActive : ""}`}>
                        <input type="radio" name="cancellationReason" checked={active} onChange={() => setCancellationReason(r)} />
                        <span className={`${styles.radioDot} ${active ? styles.radioDotActive : ""}`}>
                          <span className={`${styles.radioDotInner} ${active ? styles.radioDotInnerActive : ""}`} />
                        </span>
                        {r}
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className={styles.divider} />

              {/* 4. Weitere Gr\u00fcnde */}
              <div className={styles.section}>
                <div className={styles.sectionHeader}>
                  <div className={styles.sectionNum}>{nextNum()}</div>
                  <div className={styles.sectionLabelWrap}>
                    <label className={styles.sectionLabel}>Treffen weitere Gr{"\u00fc"}nde zu?</label>
                    <span className={styles.sectionHint}>Mehrfachauswahl m{"\u00f6"}glich</span>
                  </div>
                </div>
                <div className={styles.radioGroup}>
                  {ADDITIONAL_REASONS.map((r) => {
                    const active = additionalReasons.includes(r);
                    return (
                      <label key={r} className={`${styles.checkboxItem} ${active ? styles.checkboxItemActive : ""}`} style={{ width: "100%" }}>
                        <input type="checkbox" checked={active} onChange={() => toggleAdditional(r)} />
                        <span className={`${styles.checkmark} ${active ? styles.checkmarkActive : ""}`}>
                          {active ? "\u2713" : ""}
                        </span>
                        {r}
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className={styles.divider} />

              {/* 5. Feature-Bewertungen */}
              {usedFeatures.length > 0 && (
                <>
                  <div className={styles.section}>
                    <div className={styles.sectionHeader}>
                      <div className={styles.sectionNum}>{nextNum()}</div>
                      <div className={styles.sectionLabelWrap}>
                        <label className={styles.sectionLabel}>Wie bewertest du die einzelnen Funktionen?</label>
                      </div>
                    </div>
                    <div className={styles.featureRatingList}>
                      {FEATURE_RATING_KEYS.map(({ key, label }) => (
                        <div key={key} className={styles.featureRatingRow}>
                          <span className={styles.featureRatingLabel}>{label}</span>
                          <div className={styles.featureStarRow}>
                            {[1, 2, 3, 4, 5].map((n) => (
                              <button
                                key={n}
                                type="button"
                                className={`${styles.featureStar} ${(featureRatings[key] || 0) >= n ? styles.featureStarActive : ""}`}
                                onClick={() => setFeatureRating(key, n)}
                                aria-label={`${label} ${n} Sterne`}
                              >
                                &#9733;
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className={styles.divider} />
                </>
              )}

              {/* 6. Erwartungen (Pflicht) */}
              <div className={styles.section}>
                <div className={styles.sectionHeader}>
                  <div className={styles.sectionNum}>{nextNum()}</div>
                  <div className={styles.sectionLabelWrap}>
                    <label className={styles.sectionLabel}>
                      Was hast du dir von Contract AI vorgestellt? Welche Funktionen h{"\u00e4"}ttest du dir gew{"\u00fc"}nscht?
                      <span className={styles.required}>*</span>
                    </label>
                    <span className={styles.sectionHint}>
                      Deine Antwort hilft uns zu verstehen, was wir verbessern m{"\u00fc"}ssen
                    </span>
                  </div>
                </div>
                <textarea
                  className={`${styles.textarea} ${styles.textareaLarge}`}
                  placeholder="Beschreibe, was du erwartet hast und welche Funktionen dir gefehlt haben..."
                  value={expectedFeatures}
                  onChange={(e) => setExpectedFeatures(e.target.value)}
                  required
                />
              </div>

              <div className={styles.divider} />

              {/* 7. Was hat gefallen? */}
              <div className={styles.section}>
                <div className={styles.sectionHeader}>
                  <div className={styles.sectionNum}>{nextNum()}</div>
                  <div className={styles.sectionLabelWrap}>
                    <label className={styles.sectionLabel}>Was hat dir an Contract AI gefallen?</label>
                  </div>
                </div>
                <textarea
                  className={styles.textarea}
                  placeholder="Was war gut? Was hat funktioniert?"
                  value={positiveFeedback}
                  onChange={(e) => setPositiveFeedback(e.target.value)}
                />
              </div>

              {/* 8. Was hat nicht gefallen? */}
              <div className={styles.section}>
                <div className={styles.sectionHeader}>
                  <div className={styles.sectionNum}>{nextNum()}</div>
                  <div className={styles.sectionLabelWrap}>
                    <label className={styles.sectionLabel}>Was hat dir nicht gefallen oder gefehlt?</label>
                  </div>
                </div>
                <textarea
                  className={styles.textarea}
                  placeholder={"Was k\u00f6nnte besser sein? Was hat gest\u00f6rt?"}
                  value={negativeFeedback}
                  onChange={(e) => setNegativeFeedback(e.target.value)}
                />
              </div>

              <div className={styles.divider} />

              {/* 9. NPS */}
              <div className={styles.section}>
                <div className={styles.sectionHeader}>
                  <div className={styles.sectionNum}>{nextNum()}</div>
                  <div className={styles.sectionLabelWrap}>
                    <label className={styles.sectionLabel}>
                      Wie wahrscheinlich w{"\u00fc"}rdest du Contract AI weiterempfehlen?
                    </label>
                  </div>
                </div>
                <div className={styles.npsRow}>
                  {Array.from({ length: 11 }, (_, i) => {
                    const active = npsScore === i;
                    let cls = "";
                    if (active) {
                      if (i <= 6) cls = styles.npsButtonDetractor;
                      else if (i <= 8) cls = styles.npsButtonPassive;
                      else cls = styles.npsButtonPromoter;
                    }
                    return (
                      <button key={i} type="button" className={`${styles.npsButton} ${cls}`} onClick={() => setNpsScore(i)}>
                        {i}
                      </button>
                    );
                  })}
                </div>
                <div className={styles.npsLabels}>
                  <span className={styles.npsLabel}>Sehr unwahrscheinlich</span>
                  <span className={styles.npsLabel}>Sehr wahrscheinlich</span>
                </div>
              </div>

              <div className={styles.divider} />

              {/* 10. Verbesserungsvorschl\u00e4ge */}
              <div className={styles.section}>
                <div className={styles.sectionHeader}>
                  <div className={styles.sectionNum}>{nextNum()}</div>
                  <div className={styles.sectionLabelWrap}>
                    <label className={styles.sectionLabel}>Hast du Verbesserungsvorschl{"\u00e4"}ge f{"\u00fc"}r uns?</label>
                  </div>
                </div>
                <textarea
                  className={styles.textarea}
                  placeholder={"Was sollten wir \u00e4ndern oder hinzuf\u00fcgen?"}
                  value={suggestions}
                  onChange={(e) => setSuggestions(e.target.value)}
                />
              </div>

              {/* Error */}
              <AnimatePresence>
                {formError && (
                  <motion.div
                    className={styles.errorMessage}
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                  >
                    {formError}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Submit */}
              <motion.button
                type="submit"
                className={styles.submitButton}
                disabled={submitting}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {submitting ? (
                  <>
                    <span className={styles.buttonSpinner} />
                    Wird gesendet...
                  </>
                ) : (
                  "Feedback absenden"
                )}
              </motion.button>
            </form>
          </motion.div>

          <p className={styles.footer}>
            Contract AI &mdash; Dein Feedback bleibt vertraulich
          </p>
        </div>
      </div>
    </>
  );
}
