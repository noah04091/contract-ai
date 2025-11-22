import { Link } from 'react-router-dom';
import { CheckCircle, X, Users, Zap, Star } from "lucide-react";
import styles from "../styles/Pricing.module.css";

export default function HomePricingCards() {
  const plans = [
    {
      title: "Starter",
      icon: <Users size={22} />,
      description: "Zum Testen & Reinschnuppern",
      price: "0€",
      originalPrice: null,
      discount: null,
      period: "",
      billing: "für immer kostenlos",
      features: [
        "3 KI-Vertragsanalysen (einmalig)",
        "Verträge hochladen & ansehen",
        "Kalender & Fristen (nur Ansicht)",
        "Legal Pulse Feed (nur Ansicht)",
        "Community Support",
      ],
      limitations: [
        "Keine Optimierung oder Vergleich",
        "Keine digitalen Signaturen",
        "Keine Email-Erinnerungen",
        "Keine KI-Vertragserstellung",
      ],
      color: "#0080FF",
      buttonText: "Kostenlos starten",
      buttonLink: "/register",
      buttonVariant: "outline" as const,
      popular: false
    },
    {
      title: "Business",
      icon: <Zap size={22} />,
      description: "Vollwertig mit Limits - für Freelancer",
      price: "19€",
      originalPrice: "29€",
      discount: "33%",
      period: "pro Monat",
      billing: "",
      features: [
        "25 KI-Analysen pro Monat",
        "15 Optimierungen & 20 Vergleiche",
        "50 KI-Chat Fragen pro Monat",
        "10 KI-Vertragserstellungen",
        "Unbegrenzte digitale Signaturen",
        "Email-Erinnerungen & Smart Folders",
        "Legal Pulse mit Benachrichtigungen",
        "Priority Support (24h)",
      ],
      limitations: null,
      color: "#2D7FF9",
      buttonText: "Zum Angebot",
      buttonLink: "/pricing",
      buttonVariant: "filled" as const,
      popular: true
    },
    {
      title: "Enterprise",
      icon: <Star size={22} />,
      description: "Unbegrenzt + Profi-Features",
      price: "29€",
      originalPrice: "39€",
      discount: "25%",
      period: "pro Monat",
      billing: "",
      features: [
        "Unbegrenzte Analysen & Optimierungen",
        "Unbegrenzter KI-Chat & Erstellung",
        "White-Label PDF-Export",
        "Team-Management (bis 10 User)",
        "Bulk-Operationen & Excel-Export",
        "Custom Templates & API-Zugang",
        "Priority Processing",
        "Persönliches Onboarding",
      ],
      limitations: null,
      color: "#0062E0",
      buttonText: "Zum Angebot",
      buttonLink: "/pricing",
      buttonVariant: "gradient" as const,
      popular: false
    },
  ];

  return (
    <div className={styles.plansContainer}>
      <div className={styles.plans}>
        {plans.map((plan, index) => (
          <div key={index} className={styles.cardWrapper}>
            <div className={`${styles.card} ${plan.popular ? styles.popularCard : ''}`}>
              {plan.popular && (
                <div className={styles.popularBadge} style={{ background: plan.color }}>
                  Beliebt
                </div>
              )}

              <div className={styles.cardHeader}>
                <div
                  className={styles.iconWrapper}
                  style={{
                    color: plan.color,
                    background: `${plan.color}12`
                  }}
                >
                  {plan.icon}
                </div>
                <h2 className={styles.planTitle}>{plan.title}</h2>
                <p className={styles.planDescription}>{plan.description}</p>

                <div className={styles.priceContainer}>
                  {plan.discount && (
                    <div className={styles.saleBadge}>
                      {plan.discount} RABATT
                    </div>
                  )}

                  {plan.originalPrice && (
                    <span className={styles.originalPrice}>
                      {plan.originalPrice}
                    </span>
                  )}

                  <p className={styles.price} style={{ color: plan.popular ? plan.color : undefined }}>
                    {plan.price}
                  </p>

                  {plan.period && (
                    <div className={styles.period}>
                      <span>{plan.period}</span>
                    </div>
                  )}

                  {plan.billing && (
                    <div className={styles.period}>
                      <span>{plan.billing}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className={styles.divider}></div>

              <div className={styles.cardContent}>
                <ul className={styles.features}>
                  {plan.features.map((feature, i) => (
                    <li key={i}>
                      <CheckCircle
                        size={16}
                        className={styles.featureIcon}
                        style={{ color: plan.color }}
                      />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                {plan.limitations && (
                  <ul className={styles.limitations}>
                    {plan.limitations.map((limitation, i) => (
                      <li key={i}>
                        <X size={16} className={styles.limitationIcon} />
                        <span>{limitation}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className={styles.buttonBox}>
                {plan.buttonVariant === 'outline' && (
                  <Link
                    to={plan.buttonLink}
                    className={styles.btnOutline}
                    style={{
                      borderColor: plan.color,
                      color: plan.color
                    }}
                  >
                    {plan.buttonText}
                  </Link>
                )}
                {plan.buttonVariant === 'filled' && (
                  <Link
                    to={plan.buttonLink}
                    className={styles.btnFilled}
                    style={{
                      backgroundColor: plan.color,
                      boxShadow: `0 8px 20px ${plan.color}40`
                    }}
                  >
                    {plan.buttonText}
                  </Link>
                )}
                {plan.buttonVariant === 'gradient' && (
                  <Link
                    to={plan.buttonLink}
                    className={styles.btnGradient}
                    style={{
                      background: `linear-gradient(135deg, ${plan.color} 0%, ${plan.color}BB 100%)`,
                      boxShadow: `0 8px 25px ${plan.color}50`
                    }}
                  >
                    {plan.buttonText}
                  </Link>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}