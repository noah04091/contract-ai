import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check, X, Users, Zap, Crown, Shield, Clock, TrendingUp } from "lucide-react";

export default function HomePricingCards() {
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [loading, setLoading] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const navigate = useNavigate();

  // Stripe Checkout
  const startCheckout = async (plan: string) => {
    setLoading(true);
    setLoadingPlan(plan);
    let res: Response | undefined;

    try {
      res = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        credentials: "include",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, billing: billingPeriod })
      });

      const data: { url?: string; message?: string } = await res.json();

      if (!res.ok || !data.url) {
        throw new Error(data.message || "Fehler beim Stripe-Checkout");
      }

      window.location.href = data.url;
    } catch (error) {
      const err = error as Error;
      if (res && (res.status === 401 || res.status === 403)) {
        alert("Um ein Abo zu kaufen, müssen Sie sich zuerst registrieren.");
        navigate("/register?from=pricing&plan=" + plan);
      } else {
        alert("Fehler beim Checkout: " + err.message);
      }
    } finally {
      setLoading(false);
      setLoadingPlan(null);
    }
  };

  const plans = [
    {
      id: "free",
      title: "Starter",
      subtitle: "Perfekt zum Testen",
      icon: <Users size={22} />,
      pricing: {
        monthly: { price: "0", currency: "€", original: null, discount: null, note: "Für immer kostenlos" },
        yearly: { price: "0", currency: "€", original: null, discount: null, note: "Für immer kostenlos" }
      },
      features: [
        "3 KI-Vertragsanalysen",
        "Verträge hochladen & speichern",
        "Kalender & Fristen (Ansicht)",
        "Legal Pulse Feed",
        "Community Support",
      ],
      limitations: [
        "Keine Optimierung",
        "Keine Signaturen",
      ],
      buttonText: "Kostenlos starten",
      checkoutPlan: null, // Link to register
      popular: false,
      highlight: false
    },
    {
      id: "business",
      title: "Business",
      subtitle: "Für Profis & Teams",
      icon: <Zap size={22} />,
      pricing: {
        monthly: { price: "19", currency: "€", original: "29", discount: "33%", note: "/Monat" },
        yearly: { price: "15", currency: "€", original: "29", discount: "45%", note: "/Monat", yearlyTotal: "190€/Jahr", saving: "Sie sparen 158€" }
      },
      features: [
        "25 KI-Analysen pro Monat",
        "15 Optimierungen & 20 Vergleiche",
        "Unbegrenzte digitale Signaturen",
        "Email-Erinnerungen & Alerts",
        "Priority Support (24h)",
      ],
      limitations: null,
      buttonText: "Jetzt upgraden",
      checkoutPlan: "business", // Stripe checkout
      popular: false,
      highlight: false
    },
    {
      id: "enterprise",
      title: "Enterprise",
      subtitle: "Für Unternehmen",
      icon: <Crown size={22} />,
      pricing: {
        monthly: { price: "29", currency: "€", original: "39", discount: "25%", note: "/Monat" },
        yearly: { price: "24", currency: "€", original: "39", discount: "38%", note: "/Monat", yearlyTotal: "290€/Jahr", saving: "Sie sparen 178€" }
      },
      features: [
        "Unbegrenzte Analysen & Optimierungen",
        "Kalender-Synchronisierung (Google/Outlook)",
        "Automatische Fristenwarnungen",
        "White-Label PDF-Export",
        "API-Zugang & Custom Templates",
      ],
      limitations: null,
      buttonText: "Enterprise wählen",
      checkoutPlan: "premium", // Stripe checkout (premium = enterprise)
      popular: true,
      highlight: true,
      badge: "Meist gewählt"
    },
  ];

  const currentPricing = (plan: typeof plans[0]) => plan.pricing[billingPeriod];

  return (
    <div className="hp-section">
      {/* Billing Toggle - Pill Style */}
      <div className="hp-toggle-wrapper">
        <div className="hp-toggle">
          <button
            className={`hp-toggle-btn ${billingPeriod === 'monthly' ? 'active' : ''}`}
            onClick={() => setBillingPeriod('monthly')}
          >
            Monatlich
          </button>
          <button
            className={`hp-toggle-btn ${billingPeriod === 'yearly' ? 'active' : ''}`}
            onClick={() => setBillingPeriod('yearly')}
          >
            Jährlich
            <span className="hp-save-badge">-45%</span>
          </button>
          <div className={`hp-toggle-slider ${billingPeriod === 'yearly' ? 'yearly' : ''}`}></div>
        </div>
        {billingPeriod === 'yearly' && (
          <p className="hp-yearly-hint">
            <TrendingUp size={14} />
            10 Monate zahlen, 12 nutzen
          </p>
        )}
      </div>

      {/* Pricing Cards */}
      <div className="hp-cards">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`hp-card ${plan.highlight ? 'hp-card-highlight' : ''}`}
          >
            {/* Badge for Popular */}
            {plan.badge && (
              <div className="hp-badge">
                <span className="hp-badge-dot"></span>
                {plan.badge}
              </div>
            )}

            {/* Card Content */}
            <div className="hp-card-inner">
              {/* Header */}
              <div className="hp-header">
                <div className={`hp-icon ${plan.highlight ? 'hp-icon-light' : ''}`}>
                  {plan.icon}
                </div>
                <div className="hp-titles">
                  <h3 className="hp-title">{plan.title}</h3>
                  <p className="hp-subtitle">{plan.subtitle}</p>
                </div>
              </div>

              {/* Price Block */}
              <div className="hp-price-block">
                {currentPricing(plan).discount && (
                  <div className="hp-discount">
                    <span className="hp-discount-tag">{currentPricing(plan).discount} RABATT</span>
                  </div>
                )}

                <div className="hp-price-row">
                  {currentPricing(plan).original && (
                    <span className="hp-price-original">{currentPricing(plan).original}€</span>
                  )}
                  <span className="hp-price-current">
                    {currentPricing(plan).price}
                    <span className="hp-price-currency">{currentPricing(plan).currency}</span>
                  </span>
                  <span className="hp-price-period">{currentPricing(plan).note}</span>
                </div>

                {billingPeriod === 'yearly' && (currentPricing(plan) as any).saving && (
                  <div className="hp-saving-info">
                    <span className="hp-saving-text">{(currentPricing(plan) as any).saving}</span>
                  </div>
                )}
              </div>

              {/* Divider */}
              <div className="hp-divider"></div>

              {/* Features */}
              <ul className="hp-features">
                {plan.features.map((feature, i) => (
                  <li key={i} className="hp-feature">
                    <Check size={18} className="hp-check" />
                    <span>{feature}</span>
                  </li>
                ))}
                {plan.limitations?.map((limitation, i) => (
                  <li key={`lim-${i}`} className="hp-limitation">
                    <X size={18} className="hp-x" />
                    <span>{limitation}</span>
                  </li>
                ))}
              </ul>

              {/* Button - Link for free, Checkout for paid plans */}
              {plan.checkoutPlan ? (
                <button
                  onClick={() => startCheckout(plan.checkoutPlan!)}
                  disabled={loading}
                  className="hp-button hp-btn-primary"
                >
                  {loadingPlan === plan.checkoutPlan ? (
                    <>
                      <span className="hp-spinner"></span>
                      Lade...
                    </>
                  ) : (
                    <>
                      {plan.buttonText}
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M5 12h14M12 5l7 7-7 7"/>
                      </svg>
                    </>
                  )}
                </button>
              ) : (
                <Link
                  to="/register"
                  className="hp-button hp-btn-primary"
                >
                  {plan.buttonText}
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                  </svg>
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Trust Bar */}
      <div className="hp-trust">
        <div className="hp-trust-items">
          <div className="hp-trust-item">
            <Shield size={18} />
            <span>14-Tage-Geld-zurück-Garantie</span>
          </div>
          <div className="hp-trust-divider"></div>
          <div className="hp-trust-item">
            <Check size={18} />
            <span>Jederzeit kündbar</span>
          </div>
          <div className="hp-trust-divider"></div>
          <div className="hp-trust-item">
            <Clock size={18} />
            <span>Sofort einsatzbereit</span>
          </div>
        </div>
      </div>
    </div>
  );
}
