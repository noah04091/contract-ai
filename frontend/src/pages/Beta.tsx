import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  Gift,
  Star,
  Clock,
  MessageSquare,
  CheckCircle,
  Sparkles,
  FileText,
  Shield,
  Zap,
  Heart
} from 'lucide-react';
import styles from '../styles/FeaturePage.module.css';
import betaStyles from '../styles/Beta.module.css';
import Footer from '../components/Footer';

const Beta: React.FC = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

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

          {/* Feedback Form Link */}
          <section className={betaStyles.feedbackSection}>
            <div className={betaStyles.feedbackCard}>
              <MessageSquare size={40} className={betaStyles.feedbackIcon} />
              <h3>Feedback-Formular</h3>
              <p>
                Nach dem Testen kannst du hier dein Feedback abgeben.
                Dauert nur 2 Minuten und hilft mir enorm!
              </p>
              <a
                href="https://forms.google.com/YOUR-FORM-ID"
                target="_blank"
                rel="noopener noreferrer"
                className={betaStyles.feedbackButton}
              >
                Zum Feedback-Formular
              </a>
            </div>
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
