import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import "../styles/AppleAuth.css";

export default function VerifySuccess() {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const [searchParams] = useSearchParams();
  const [countdown, setCountdown] = useState(5);
  const [showConfetti, setShowConfetti] = useState(true);
  
  const email = searchParams.get('email') || 'Ihre E-Mail-Adresse';

  useEffect(() => {
    // Confetti Animation
    const confettiTimer = setTimeout(() => {
      setShowConfetti(false);
    }, 3000);

    // Countdown Timer
    const countdownInterval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          navigate("/login");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Add parallax effect on mouse move
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      
      const container = containerRef.current;
      const containerRect = container.getBoundingClientRect();
      
      const mouseX = e.clientX - containerRect.left;
      const mouseY = e.clientY - containerRect.top;
      
      const centerX = containerRect.width / 2;
      const centerY = containerRect.height / 2;
      
      const moveX = (mouseX - centerX) / 20;
      const moveY = (mouseY - centerY) / 20;
      
      const card = container.querySelector('.apple-auth-card') as HTMLElement;
      if (card) {
        card.style.transform = `perspective(1000px) rotateY(${moveX * 0.2}deg) rotateX(${-moveY * 0.2}deg) translateZ(10px)`;
      }

      const shapes = container.querySelectorAll('.shape');
      shapes.forEach((shape, index) => {
        const element = shape as HTMLElement;
        const speed = index % 2 === 0 ? 0.05 : 0.03;
        const offsetX = moveX * speed * (index + 1);
        const offsetY = moveY * speed * (index + 1);
        element.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
      });
    };

    document.addEventListener('mousemove', handleMouseMove);

    return () => {
      clearTimeout(confettiTimer);
      clearInterval(countdownInterval);
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, [navigate]);

  return (
    <div className="apple-auth-container success-page" ref={containerRef}>
      {/* Enhanced Background */}
      <div className="apple-bg success-bg">
        <div className="shape shape-1"></div>
        <div className="shape shape-2"></div>
        <div className="shape shape-3"></div>
        <div className="success-particles">
          {[...Array(20)].map((_, i) => (
            <div key={i} className={`particle particle-${i + 1}`}></div>
          ))}
        </div>
      </div>

      {/* Confetti Effect */}
      {showConfetti && (
        <div className="confetti-container">
          {[...Array(50)].map((_, i) => (
            <div 
              key={i} 
              className={`confetti confetti-${i % 5 + 1}`}
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${3 + Math.random() * 2}s`
              }}
            ></div>
          ))}
        </div>
      )}
      
      <div className="apple-auth-card success-card">
        {/* Animated Success Icon */}
        <div className="success-icon-container">
          <div className="success-circle-wrapper">
            <div className="success-circle">
              <div className="checkmark-animation large">
                <svg width="120" height="120" viewBox="0 0 120 120">
                  <circle 
                    className="checkmark-circle" 
                    cx="60" 
                    cy="60" 
                    r="50" 
                    fill="none" 
                    stroke="url(#successGradient)" 
                    strokeWidth="4"
                  />
                  <path 
                    className="checkmark-path" 
                    fill="none" 
                    stroke="#22c55e" 
                    strokeWidth="6" 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    d="M35 60l15 15 30-30"
                  />
                  <defs>
                    <linearGradient id="successGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#22c55e" />
                      <stop offset="50%" stopColor="#16a34a" />
                      <stop offset="100%" stopColor="#15803d" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
            </div>
          </div>
        </div>
        
        {/* Success Message */}
        <div className="success-content">
          <h1 className="success-title">
            🎉 Fantastisch!
          </h1>
          
          <p className="success-subtitle">
            Ihre E-Mail-Adresse wurde erfolgreich bestätigt
          </p>
          
          <div className="email-confirmed-badge">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
            <span>{email}</span>
          </div>
        </div>

        {/* What's Next Section */}
        <div className="whats-next-section">
          <h3 className="whats-next-title">
            🚀 Jetzt kann's losgehen!
          </h3>
          
          <div className="feature-grid">
            <div className="feature-item">
              <div className="feature-icon">📄</div>
              <div className="feature-text">
                <strong>Verträge hochladen</strong>
                <span>PDF-Dateien einfach per Drag & Drop</span>
              </div>
            </div>
            
            <div className="feature-item">
              <div className="feature-icon">🤖</div>
              <div className="feature-text">
                <strong>KI-Analyse starten</strong>
                <span>Automatische Vertragsprüfung</span>
              </div>
            </div>
            
            <div className="feature-item">
              <div className="feature-icon">💡</div>
              <div className="feature-text">
                <strong>Optimierungen erhalten</strong>
                <span>Verbesserungsvorschläge von der KI</span>
              </div>
            </div>
            
            <div className="feature-item">
              <div className="feature-icon">📅</div>
              <div className="feature-text">
                <strong>Fristen verwalten</strong>
                <span>Kündigungsfristen im Blick behalten</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="success-actions">
          <button 
            onClick={() => navigate("/login")}
            className="apple-auth-button modern success-primary"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16,17 21,12 16,7"/>
              <path d="M21 12H9"/>
            </svg>
            <span>Jetzt anmelden & loslegen</span>
          </button>
        </div>

        {/* Countdown */}
        <div className="auto-redirect-info">
          <div className="countdown-circle">
            <svg width="32" height="32" viewBox="0 0 32 32">
              <circle
                cx="16" 
                cy="16" 
                r="14"
                fill="none"
                stroke="#e2e8f0"
                strokeWidth="2"
              />
              <circle
                cx="16"
                cy="16"
                r="14"
                fill="none"
                stroke="#22c55e"
                strokeWidth="2"
                strokeDasharray="87.96"
                strokeDashoffset={87.96 - (87.96 * (5 - countdown)) / 5}
                style={{ transition: 'stroke-dashoffset 1s linear' }}
                transform="rotate(-90 16 16)"
              />
              <text x="16" y="20" textAnchor="middle" fill="#22c55e" fontSize="10" fontWeight="bold">
                {countdown}
              </text>
            </svg>
          </div>
          <span>Automatische Weiterleitung in {countdown} Sekunden...</span>
        </div>
        
        {/* Alternative Links */}
        <div className="success-links">
          <button onClick={() => navigate("/")} className="link-button">
            🏠 Zur Startseite
          </button>
          <span className="link-separator">•</span>
          <button onClick={() => navigate("/pricing")} className="link-button">
            💎 Preise ansehen
          </button>
        </div>
      </div>
    </div>
  );
}