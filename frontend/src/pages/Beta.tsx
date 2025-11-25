import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  Gift,
  Star,
  Clock,
  CheckCircle,
  Sparkles,
  FileText,
  Shield,
  Zap,
  Heart,
  Send,
  Loader2
} from 'lucide-react';
import styles from '../styles/FeaturePage.module.css';
import betaStyles from '../styles/Beta.module.css';
import Footer from '../components/Footer';

const API_URL = import.meta.env.VITE_API_URL || 'https://api.contract-ai.de';

interface FeedbackForm {
  name: string;
  email: string;
  rating: number;
  improvements: string;
  wouldPay: string;
  testimonial: string;
}

const Beta: React.FC = () => {
  const [feedbackForm, setFeedbackForm] = useState<FeedbackForm>({
    name: '',
    email: '',
    rating: 0,
    improvements: '',
    wouldPay: '',
    testimonial: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFeedbackForm(prev => ({ ...prev, [name]: value }));
  };

  const handleRatingClick = (rating: number) => {
    setFeedbackForm(prev => ({ ...prev, rating }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError('');

    try {
      const response = await fetch(`${API_URL}/api/beta-feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(feedbackForm),
      });

      if (!response.ok) {
        throw new Error('Feedback konnte nicht gesendet werden');
      }

      setSubmitSuccess(true);
      setFeedbackForm({
        name: '',
        email: '',
        rating: 0,
        improvements: '',
        wouldPay: '',
        testimonial: ''
      });
    } catch {
      setSubmitError('Fehler beim Senden. Bitte versuche es erneut.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Beta-Tester Einladung | Contract AI</title>
        <meta name="robots" content="noindex, nofollow" />
        <meta name="description" content="Exklusive Beta-Tester Einladung - Teste Contract AI kostenlos und erhalte Lifetime-Rabatt + 3 Monate Premium gratis." />
      </Helmet>

      <div className={styles.featureContainer}>
        {/* Hero Section */}
        <section className={styles.heroSection}>
          <div className={betaStyles.exclusiveBadge}>
            <Sparkles size={16} />
            Exklusive Einladung
          </div>

          <div className={styles.heroIcon}>
            <Gift size={48} />
          </div>

          <h1 className={styles.heroTitle}>
            Du wurdest <span className={styles.heroTitleHighlight}>ausgewählt</span>
          </h1>

          <p className={styles.heroSubtitle}>
            Vielen Dank, dass du auf den Link geklickt hast! Ich freue mich sehr,
            dass du Interesse an Contract AI hast. Als einer der ersten Beta-Tester
            bekommst du exklusiven Zugang zu allen Features.
          </p>

          {/* Benefits Badges */}
          <div className={betaStyles.benefitsBadges}>
            <div className={betaStyles.badge}>
              <Gift size={18} />
              <span>3 Monate Premium gratis</span>
            </div>
            <div className={betaStyles.badge}>
              <Star size={18} />
              <span>Lifetime-Rabatt</span>
            </div>
            <div className={betaStyles.badge}>
              <Clock size={18} />
              <span>Nur 2 Min. zum Testen</span>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className={betaStyles.ctaGroup}>
            <Link to="/register?beta=true" className={styles.ctaButton}>
              Jetzt kostenlos starten
            </Link>
          </div>
        </section>

        <div className={styles.contentContainer}>
          {/* Was ist Contract AI */}
          <section className={styles.funktionSection}>
            <h2 className={styles.sectionTitle}>Was ist Contract AI?</h2>
            <p className={betaStyles.introText}>
              Contract AI ist ein KI-gestütztes Tool, das dir hilft, Verträge schneller zu verstehen,
              zu analysieren und zu optimieren. Egal ob Freelancer, Gründer oder kleine Agentur –
              du sparst Zeit und vermeidest teure Fehler.
            </p>

            <div className={styles.funktionGrid}>
              <div className={styles.funktionItem}>
                <div className={styles.funktionIcon}>
                  <FileText size={20} />
                </div>
                <p className={styles.funktionText}>
                  <strong>KI-Vertragsanalyse:</strong> Lade deinen Vertrag hoch und erhalte in Sekunden
                  eine verständliche Zusammenfassung mit Risikobewertung.
                </p>
              </div>

              <div className={styles.funktionItem}>
                <div className={styles.funktionIcon}>
                  <Zap size={20} />
                </div>
                <p className={styles.funktionText}>
                  <strong>Optimierungsvorschläge:</strong> Die KI erkennt problematische Klauseln und
                  schlägt bessere Formulierungen vor.
                </p>
              </div>

              <div className={styles.funktionItem}>
                <div className={styles.funktionIcon}>
                  <Clock size={20} />
                </div>
                <p className={styles.funktionText}>
                  <strong>Fristenmanagement:</strong> Verpasse nie wieder wichtige Deadlines –
                  automatische Erinnerungen für alle Vertragsfristen.
                </p>
              </div>

              <div className={styles.funktionItem}>
                <div className={styles.funktionIcon}>
                  <Shield size={20} />
                </div>
                <p className={styles.funktionText}>
                  <strong>DSGVO-konform:</strong> Deine Daten bleiben in Deutschland und werden
                  nach höchsten Sicherheitsstandards verarbeitet.
                </p>
              </div>
            </div>
          </section>

          {/* Was du bekommst */}
          <section className={betaStyles.rewardsSection}>
            <h2 className={styles.sectionTitle}>Das bekommst du als Beta-Tester</h2>

            <div className={betaStyles.rewardsGrid}>
              <div className={betaStyles.rewardCard}>
                <div className={betaStyles.rewardIcon}>
                  <Star size={32} />
                </div>
                <h3>3 Monate Premium</h3>
                <p>Voller Zugang zu allen Features – komplett kostenlos.</p>
              </div>

              <div className={betaStyles.rewardCard}>
                <div className={betaStyles.rewardIcon}>
                  <Gift size={32} />
                </div>
                <h3>Lifetime-Rabatt</h3>
                <p>Dauerhaft günstiger, wenn du dich später für ein Abo entscheidest.</p>
              </div>

              <div className={betaStyles.rewardCard}>
                <div className={betaStyles.rewardIcon}>
                  <Heart size={32} />
                </div>
                <h3>Direkter Draht</h3>
                <p>Dein Feedback fließt direkt in die Produktentwicklung ein.</p>
              </div>
            </div>
          </section>

          {/* Was ich erwarte */}
          <section className={styles.funktionSection}>
            <h2 className={styles.sectionTitle}>Was ich mir von dir wünsche</h2>

            <div className={betaStyles.expectationBox}>
              <p>
                Als Gründer von Contract AI ist mir dein ehrliches Feedback unglaublich wichtig.
                Du hilfst mir damit, das Tool noch besser zu machen.
              </p>

              <div className={betaStyles.expectationList}>
                <div className={betaStyles.expectationItem}>
                  <CheckCircle size={20} className={betaStyles.checkIcon} />
                  <span>Teste die Vertragsanalyse mit einem echten oder Beispiel-Vertrag</span>
                </div>
                <div className={betaStyles.expectationItem}>
                  <CheckCircle size={20} className={betaStyles.checkIcon} />
                  <span>Fülle das kurze Feedback-Formular aus (nur 4 Fragen, ~2 Min.)</span>
                </div>
                <div className={betaStyles.expectationItem}>
                  <CheckCircle size={20} className={betaStyles.checkIcon} />
                  <span>Optional: Schreib mir ein kurzes Testimonial, wenn dir das Tool gefällt</span>
                </div>
              </div>
            </div>
          </section>

          {/* So funktioniert's */}
          <section className={styles.funktionSection}>
            <h2 className={styles.sectionTitle}>So funktioniert's</h2>

            <div className={betaStyles.stepsGrid}>
              <div className={betaStyles.stepCard}>
                <div className={betaStyles.stepNumber}>1</div>
                <h3>Registrieren</h3>
                <p>Erstelle kostenlos deinen Account – dauert nur 30 Sekunden.</p>
              </div>

              <div className={betaStyles.stepCard}>
                <div className={betaStyles.stepNumber}>2</div>
                <h3>Vertrag hochladen</h3>
                <p>Lade einen PDF-Vertrag hoch oder nutze unseren Beispielvertrag.</p>
              </div>

              <div className={betaStyles.stepCard}>
                <div className={betaStyles.stepNumber}>3</div>
                <h3>Analyse erhalten</h3>
                <p>Bekomme in Sekunden eine KI-Analyse mit Risiken und Empfehlungen.</p>
              </div>

              <div className={betaStyles.stepCard}>
                <div className={betaStyles.stepNumber}>4</div>
                <h3>Feedback geben</h3>
                <p>Fülle das kurze Formular aus und hilf mir, Contract AI zu verbessern.</p>
              </div>
            </div>
          </section>

          {/* Feedback Form */}
          <section className={betaStyles.feedbackSection} id="feedback">
            <h2 className={styles.sectionTitle}>Dein Feedback</h2>

            {submitSuccess ? (
              <div className={betaStyles.successMessage}>
                <CheckCircle size={48} />
                <h3>Vielen Dank!</h3>
                <p>Dein Feedback wurde erfolgreich gesendet. Ich melde mich bei dir!</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className={betaStyles.feedbackForm}>
                {/* Name & Email */}
                <div className={betaStyles.formRow}>
                  <div className={betaStyles.formGroup}>
                    <label htmlFor="name">Dein Name</label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={feedbackForm.name}
                      onChange={handleInputChange}
                      placeholder="Max Mustermann"
                      required
                    />
                  </div>
                  <div className={betaStyles.formGroup}>
                    <label htmlFor="email">Deine E-Mail</label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={feedbackForm.email}
                      onChange={handleInputChange}
                      placeholder="max@beispiel.de"
                      required
                    />
                  </div>
                </div>

                {/* Rating */}
                <div className={betaStyles.formGroup}>
                  <label>Wie hilfreich war die Analyse? *</label>
                  <div className={betaStyles.ratingStars}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => handleRatingClick(star)}
                        className={`${betaStyles.starButton} ${feedbackForm.rating >= star ? betaStyles.starActive : ''}`}
                        aria-label={`${star} Sterne`}
                      >
                        <Star size={32} fill={feedbackForm.rating >= star ? '#FFD700' : 'none'} />
                      </button>
                    ))}
                    <span className={betaStyles.ratingLabel}>
                      {feedbackForm.rating > 0 ? `${feedbackForm.rating}/5 Sterne` : 'Bitte bewerten'}
                    </span>
                  </div>
                </div>

                {/* Improvements */}
                <div className={betaStyles.formGroup}>
                  <label htmlFor="improvements">Was würdest du verbessern?</label>
                  <textarea
                    id="improvements"
                    name="improvements"
                    value={feedbackForm.improvements}
                    onChange={handleInputChange}
                    placeholder="z.B. schnellere Analyse, bessere Übersicht, mehr Features..."
                    rows={3}
                  />
                </div>

                {/* Would Pay */}
                <div className={betaStyles.formGroup}>
                  <label htmlFor="wouldPay">Würdest du Contract AI nutzen, wenn es kostenpflichtig wäre? *</label>
                  <select
                    id="wouldPay"
                    name="wouldPay"
                    value={feedbackForm.wouldPay}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Bitte auswählen...</option>
                    <option value="ja">Ja, auf jeden Fall!</option>
                    <option value="vielleicht">Vielleicht, kommt auf den Preis an</option>
                    <option value="nein">Nein, eher nicht</option>
                  </select>
                </div>

                {/* Testimonial */}
                <div className={betaStyles.formGroup}>
                  <label htmlFor="testimonial">
                    Optional: Kurzes Testimonial
                    <span className={betaStyles.labelHint}>(Darf ich auf der Website zeigen?)</span>
                  </label>
                  <textarea
                    id="testimonial"
                    name="testimonial"
                    value={feedbackForm.testimonial}
                    onChange={handleInputChange}
                    placeholder="z.B. 'Contract AI hat mir geholfen, versteckte Klauseln in meinem Freelancer-Vertrag zu finden. Super Tool!'"
                    rows={3}
                  />
                </div>

                {submitError && (
                  <div className={betaStyles.errorMessage}>
                    {submitError}
                  </div>
                )}

                <button
                  type="submit"
                  className={betaStyles.submitButton}
                  disabled={isSubmitting || feedbackForm.rating === 0}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={20} className={betaStyles.spinner} />
                      Wird gesendet...
                    </>
                  ) : (
                    <>
                      <Send size={20} />
                      Feedback absenden
                    </>
                  )}
                </button>
              </form>
            )}
          </section>

          {/* Final CTA */}
          <section className={styles.ctaSection}>
            <div className={styles.ctaCard}>
              <h2 className={styles.ctaTitle}>Bereit, Contract AI zu testen?</h2>
              <p className={styles.ctaSubtitle}>
                Registriere dich jetzt und erhalte sofort Zugang zu allen Premium-Features.
              </p>
              <Link to="/register?beta=true" className={styles.ctaButton}>
                Kostenlos starten
              </Link>
            </div>
          </section>
        </div>
      </div>

      <Footer />
    </>
  );
};

export default Beta;
