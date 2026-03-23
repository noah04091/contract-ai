import React, { useState, useEffect } from "react";
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
  "Zu teuer fuer den gebotenen Funktionsumfang",
  "Funktionen entsprechen nicht meinen Erwartungen",
  "Qualitaet der KI-Ergebnisse nicht ausreichend",
  "Zu kompliziert in der Bedienung",
  "Fehlende Funktionen, die ich benoetigt haette",
  "Technische Probleme / Bugs",
  "Alternative Loesung gefunden",
  "Kein Bedarf mehr",
  "Nur zum Testen registriert",
];

const ADDITIONAL_REASONS = [
  "Analyseergebnisse waren ungenau oder oberflaechlich",
  "Optimierungsvorschlaege waren nicht praxistauglich",
  "Zu lange Wartezeiten bei der Verarbeitung",
  "Fehlende Vertragstypen / Branchen",
  "Schlechte Dokumentenerkennung (PDF/OCR)",
  "Unuebersichtliche Benutzeroberflaeche",
  "Fehlende Integrationen (z.B. CRM, DMS)",
  "Datenschutzbedenken",
  "Kundenservice nicht zufriedenstellend",
  "Keine Collaboration / Team-Features",
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

// ─── Types ───────────────────────────────────────
type PageState = "loading" | "form" | "submitted" | "already" | "error";

export default function RefundFeedback() {
  const { token } = useParams<{ token: string }>();

  // Page state
  const [pageState, setPageState] = useState<PageState>("loading");
  const [customerName, setCustomerName] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Form state
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

  // ─── Load token data ─────────────────────────
  useEffect(() => {
    if (!token) {
      setErrorMsg("Kein gueltiger Feedback-Link.");
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
        setErrorMsg("Verbindungsfehler. Bitte versuche es spaeter erneut.");
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
      setFormError("Bitte waehle einen Kuendigungsgrund.");
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

  // ─── Render: Loading ─────────────────────────
  if (pageState === "loading") {
    return (
      <div className={styles.container}>
        <Helmet><title>Feedback | Contract AI</title></Helmet>
        <div className={styles.loadingContainer}>
          <div className={styles.spinner} />
          <p className={styles.loadingText}>Feedback wird geladen...</p>
        </div>
      </div>
    );
  }

  // ─── Render: Error ───────────────────────────
  if (pageState === "error") {
    return (
      <div className={styles.container}>
        <Helmet><title>Feedback nicht gefunden | Contract AI</title></Helmet>
        <div className={styles.errorContainer}>
          <div className={styles.errorIcon}>&#128533;</div>
          <h2 className={styles.errorTitle}>Link nicht gefunden</h2>
          <p className={styles.errorText}>{errorMsg}</p>
        </div>
      </div>
    );
  }

  // ─── Render: Already Submitted ───────────────
  if (pageState === "already") {
    return (
      <div className={styles.container}>
        <Helmet><title>Feedback bereits abgegeben | Contract AI</title></Helmet>
        <motion.div
          className={styles.alreadySubmitted}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className={styles.alreadyIcon}>&#9989;</div>
          <h2 className={styles.alreadyTitle}>Feedback bereits abgegeben</h2>
          <p className={styles.alreadyText}>
            Vielen Dank, {customerName}! Du hast dein Feedback bereits abgegeben.
            Deine Rueckerstattung wird bearbeitet.
          </p>
        </motion.div>
      </div>
    );
  }

  // ─── Render: Success ─────────────────────────
  if (pageState === "submitted") {
    return (
      <div className={styles.container}>
        <Helmet><title>Vielen Dank! | Contract AI</title></Helmet>
        <motion.div
          className={styles.successCard}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, type: "spring" }}
        >
          <div className={styles.successIconWrap}>&#10003;</div>
          <h2 className={styles.successTitle}>Vielen Dank fuer dein Feedback!</h2>
          <p className={styles.successText}>
            Dein Feedback hilft uns, Contract AI besser zu machen.
            Deine Rueckerstattung wird nun bearbeitet und du erhaeltst eine
            Bestaetigung per E-Mail.
          </p>
          <Link to="/" className={styles.successHomeLink}>
            <ArrowLeft size={16} />
            Zurueck zur Startseite
          </Link>
        </motion.div>
      </div>
    );
  }

  // ─── Render: Form ────────────────────────────
  return (
    <>
      <Helmet>
        <title>Feedback zur Kuendigung | Contract AI</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>

      <div className={styles.container}>
        {/* Logo */}
        <Link to="/" className={styles.logo}>
          <div className={styles.logoIcon}>
            <FileText size={18} />
          </div>
          Contract AI
        </Link>

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
              <MessageSquare size={28} />
            </motion.div>
            <h1 className={styles.title}>Dein Feedback ist uns wichtig</h1>
            <p className={styles.subtitle}>
              Hilf uns, Contract AI zu verbessern. Dein ehrliches Feedback ermoeglicht es uns,
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
            {/* Important Note */}
            <div className={styles.importantNote}>
              <span className={styles.importantNoteIcon}>&#9432;</span>
              <span className={styles.importantNoteText}>
                Bitte fuell dieses Formular vollstaendig aus. Nach Eingang deines Feedbacks
                wird deine Rueckerstattung bearbeitet.
              </span>
            </div>

            {/* 1. Gesamtbewertung */}
            <div className={styles.section}>
              <label className={styles.sectionLabel}>
                Wie zufrieden warst du insgesamt mit Contract AI?
                <span className={styles.required}>*</span>
              </label>
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
              </div>
            </div>

            <div className={styles.divider} />

            {/* 2. Genutzte Features */}
            <div className={styles.section}>
              <label className={styles.sectionLabel}>
                Welche Funktionen hast du genutzt?
              </label>
              <div className={styles.checkboxGrid}>
                {FEATURES.map((f) => {
                  const active = usedFeatures.includes(f);
                  return (
                    <label
                      key={f}
                      className={`${styles.checkboxItem} ${active ? styles.checkboxItemActive : ""}`}
                    >
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
              <label className={styles.sectionLabel}>
                Was war der Hauptgrund fuer deine Kuendigung?
                <span className={styles.required}>*</span>
              </label>
              <div className={styles.radioGroup}>
                {CANCELLATION_REASONS.map((r) => {
                  const active = cancellationReason === r;
                  return (
                    <label
                      key={r}
                      className={`${styles.radioItem} ${active ? styles.radioItemActive : ""}`}
                    >
                      <input
                        type="radio"
                        name="cancellationReason"
                        checked={active}
                        onChange={() => setCancellationReason(r)}
                      />
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

            {/* 4. Weitere Gruende */}
            <div className={styles.section}>
              <label className={styles.sectionLabel}>
                Treffen weitere Gruende zu?
              </label>
              <p className={styles.sectionHint}>Mehrfachauswahl moeglich</p>
              <div className={styles.radioGroup}>
                {ADDITIONAL_REASONS.map((r) => {
                  const active = additionalReasons.includes(r);
                  return (
                    <label
                      key={r}
                      className={`${styles.checkboxItem} ${active ? styles.checkboxItemActive : ""}`}
                      style={{ width: "100%" }}
                    >
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
                  <label className={styles.sectionLabel}>
                    Wie bewertest du die einzelnen Funktionen?
                  </label>
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

            {/* 6. PFLICHTFELD: Erwartungen / Vorstellungen */}
            <div className={styles.section}>
              <label className={styles.sectionLabel}>
                Was hast du dir von Contract AI vorgestellt? Welche Funktionen haettest du dir gewuenscht?
                <span className={styles.required}>*</span>
              </label>
              <p className={styles.sectionHint}>
                Deine Antwort hilft uns zu verstehen, was wir verbessern muessen
              </p>
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
              <label className={styles.sectionLabel}>
                Was hat dir an Contract AI gefallen?
              </label>
              <textarea
                className={styles.textarea}
                placeholder="Was war gut? Was hat funktioniert?"
                value={positiveFeedback}
                onChange={(e) => setPositiveFeedback(e.target.value)}
              />
            </div>

            {/* 8. Was hat nicht gefallen? */}
            <div className={styles.section}>
              <label className={styles.sectionLabel}>
                Was hat dir nicht gefallen oder gefehlt?
              </label>
              <textarea
                className={styles.textarea}
                placeholder="Was koennte besser sein? Was hat gestört?"
                value={negativeFeedback}
                onChange={(e) => setNegativeFeedback(e.target.value)}
              />
            </div>

            <div className={styles.divider} />

            {/* 9. NPS */}
            <div className={styles.section}>
              <label className={styles.sectionLabel}>
                Wie wahrscheinlich wuerdest du Contract AI weiterempfehlen?
              </label>
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
                    <button
                      key={i}
                      type="button"
                      className={`${styles.npsButton} ${cls}`}
                      onClick={() => setNpsScore(i)}
                    >
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

            {/* 10. Verbesserungsvorschlaege */}
            <div className={styles.section}>
              <label className={styles.sectionLabel}>
                Hast du Verbesserungsvorschlaege fuer uns?
              </label>
              <textarea
                className={styles.textarea}
                placeholder="Was sollten wir aendern oder hinzufuegen?"
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
    </>
  );
}
