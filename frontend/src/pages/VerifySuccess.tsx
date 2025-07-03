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
    <div className="apple-auth-container" ref={containerRef}>
      {/* ✅ SUCCESS BACKGROUND - Gradient aber nicht zu hell */}
      <div className="apple-bg success-gradient">
        <div className="shape shape-1"></div>
        <div className="shape shape-2"></div>
        <div className="shape shape-3"></div>
        {/* ✅ SUCCESS PARTICLES */}
        <div className="success-particles">
          {[...Array(15)].map((_, i) => (
            <div key={i} className={`particle particle-${i + 1}`} 
                 style={{
                   left: `${Math.random() * 100}%`,
                   animationDelay: `${Math.random() * 3}s`,
                   animationDuration: `${2 + Math.random() * 3}s`
                 }}></div>
          ))}
        </div>
      </div>

      {/* ✅ CONFETTI EFFECT */}
      {showConfetti && (
        <div className="confetti-container">
          {[...Array(30)].map((_, i) => (
            <div 
              key={i} 
              className={`confetti confetti-${(i % 4) + 1}`}
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${3 + Math.random() * 2}s`
              }}
            ></div>
          ))}
        </div>
      )}
      
      {/* ✅ MAIN SUCCESS CARD - Apple Style */}
      <div className="apple-auth-card success-card">
        
        {/* ✅ ANIMATED SUCCESS ICON - ZENTRIERT */}
        <div className="success-icon-container">
          <div className="success-icon-wrapper">
            <div className="success-checkmark">
              <svg width="120" height="120" viewBox="0 0 120 120">
                <circle 
                  className="success-circle-bg" 
                  cx="60" 
                  cy="60" 
                  r="50" 
                  fill="url(#successGradient)"
                />
                <circle 
                  className="success-circle-border" 
                  cx="60" 
                  cy="60" 
                  r="50" 
                  fill="none" 
                  stroke="#10b981" 
                  strokeWidth="3"
                  strokeDasharray="314"
                  strokeDashoffset="314"
                />
                <path 
                  className="success-checkmark-path" 
                  fill="none" 
                  stroke="white" 
                  strokeWidth="6" 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  d="M35 60l15 15 30-30"
                  strokeDasharray="60"
                  strokeDashoffset="60"
                />
                <defs>
                  <linearGradient id="successGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#10b981" />
                    <stop offset="50%" stopColor="#059669" />
                    <stop offset="100%" stopColor="#047857" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </div>
        </div>
        
        {/* ✅ SUCCESS CONTENT - DUNKLE SCHRIFT FÜR LESBARKEIT */}
        <div className="success-content">
          <h1 className="success-title">
            🎉 Fantastisch!
          </h1>
          
          <p className="success-subtitle">
            Ihre E-Mail-Adresse wurde erfolgreich bestätigt
          </p>
          
          {/* ✅ EMAIL CONFIRMED BADGE - LESBARE FARBEN */}
          <div className="email-confirmed-badge">
            <div className="email-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
            </div>
            <span className="email-text">{email}</span>
          </div>
        </div>

        {/* ✅ WHAT'S NEXT SECTION - DUNKLE SCHRIFT */}
        <div className="whats-next-section">
          <h3 className="whats-next-title">
            🚀 Jetzt kann's losgehen!
          </h3>
          
          <div className="feature-grid">
            <div className="feature-item">
              <div className="feature-icon">📄</div>
              <div className="feature-content">
                <div className="feature-title">Verträge hochladen</div>
                <div className="feature-description">PDF-Dateien einfach per Drag & Drop</div>
              </div>
            </div>
            
            <div className="feature-item">
              <div className="feature-icon">🤖</div>
              <div className="feature-content">
                <div className="feature-title">KI-Analyse starten</div>
                <div className="feature-description">Automatische Vertragsprüfung</div>
              </div>
            </div>
            
            <div className="feature-item">
              <div className="feature-icon">💡</div>
              <div className="feature-content">
                <div className="feature-title">Optimierungen erhalten</div>
                <div className="feature-description">Verbesserungsvorschläge von der KI</div>
              </div>
            </div>
            
            <div className="feature-item">
              <div className="feature-icon">📅</div>
              <div className="feature-content">
                <div className="feature-title">Fristen verwalten</div>
                <div className="feature-description">Kündigungsfristen im Blick behalten</div>
              </div>
            </div>
          </div>
        </div>
        
        {/* ✅ ACTION BUTTONS - APPLE STYLE & ZENTRIERT */}
        <div className="success-actions">
          <button 
            onClick={() => navigate("/login")}
            className="apple-auth-button primary success-primary"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16,17 21,12 16,7"/>
              <path d="M21 12H9"/>
            </svg>
            <span>Jetzt anmelden & loslegen</span>
          </button>
        </div>

        {/* ✅ COUNTDOWN - LESBARE FARBEN */}
        <div className="auto-redirect-info">
          <div className="countdown-container">
            <div className="countdown-circle">
              <svg width="40" height="40" viewBox="0 0 40 40">
                <circle
                  cx="20" 
                  cy="20" 
                  r="18"
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth="2"
                />
                <circle
                  cx="20"
                  cy="20"
                  r="18"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="2"
                  strokeDasharray={113.04}
                  strokeDashoffset={113.04 - (113.04 * (5 - countdown)) / 5}
                  style={{ transition: 'stroke-dashoffset 1s linear' }}
                  transform="rotate(-90 20 20)"
                />
                <text x="20" y="26" textAnchor="middle" fill="#374151" fontSize="12" fontWeight="bold">
                  {countdown}
                </text>
              </svg>
            </div>
            <div className="countdown-text">
              <span className="countdown-label">Automatische Weiterleitung in</span>
              <span className="countdown-timer">{countdown} Sekunden</span>
            </div>
          </div>
        </div>
        
        {/* ✅ ALTERNATIVE LINKS - LESBARE FARBEN */}
        <div className="success-links">
          <button onClick={() => navigate("/")} className="success-link-button">
            🏠 Zur Startseite
          </button>
          <span className="link-separator">•</span>
          <button onClick={() => navigate("/pricing")} className="success-link-button">
            💎 Preise ansehen
          </button>
        </div>
      </div>

      {/* ✅ CUSTOM STYLES für lesbare Farben */}
      <style>{`
        .apple-auth-container .success-gradient {
          background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 50%, #f0f9ff 100%);
        }
        
        .success-card {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }
        
        .success-title {
          color: #1f2937;
          font-size: 2rem;
          font-weight: 700;
          margin: 20px 0 10px;
          text-align: center;
        }
        
        .success-subtitle {
          color: #4b5563;
          font-size: 1.1rem;
          margin-bottom: 30px;
          text-align: center;
        }
        
        .email-confirmed-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: linear-gradient(135deg, #ecfdf5, #f0fdf4);
          border: 1px solid #10b981;
          padding: 12px 20px;
          border-radius: 50px;
          margin: 20px 0;
        }
        
        .email-icon {
          color: #10b981;
        }
        
        .email-text {
          color: #065f46;
          font-weight: 600;
          font-size: 0.95rem;
        }
        
        .whats-next-title {
          color: #1f2937;
          font-size: 1.3rem;
          font-weight: 600;
          margin: 30px 0 20px;
          text-align: center;
        }
        
        .feature-item {
          display: flex;
          align-items: center;
          gap: 15px;
          padding: 15px;
          background: rgba(248, 250, 252, 0.8);
          border-radius: 12px;
          margin-bottom: 12px;
          border: 1px solid rgba(226, 232, 240, 0.5);
        }
        
        .feature-title {
          color: #1e293b;
          font-weight: 600;
          font-size: 0.95rem;
        }
        
        .feature-description {
          color: #64748b;
          font-size: 0.85rem;
          margin-top: 2px;
        }
        
        .countdown-label {
          color: #6b7280;
          font-size: 0.9rem;
        }
        
        .countdown-timer {
          color: #1f2937;
          font-weight: 600;
          margin-left: 5px;
        }
        
        .success-link-button {
          color: #4b5563;
          background: none;
          border: none;
          cursor: pointer;
          font-size: 0.9rem;
          transition: color 0.2s;
        }
        
        .success-link-button:hover {
          color: #1f2937;
        }
        
        .link-separator {
          color: #d1d5db;
          margin: 0 12px;
        }
        
        .particle {
          position: absolute;
          width: 6px;
          height: 6px;
          background: #10b981;
          border-radius: 50%;
          opacity: 0.6;
          animation: float 4s infinite ease-in-out;
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); opacity: 0.6; }
          50% { transform: translateY(-20px) rotate(180deg); opacity: 1; }
        }
        
        .confetti {
          position: absolute;
          width: 8px;
          height: 8px;
          animation: confetti-fall linear infinite;
        }
        
        .confetti-1 { background: #10b981; }
        .confetti-2 { background: #3b82f6; }
        .confetti-3 { background: #f59e0b; }
        .confetti-4 { background: #ef4444; }
        
        @keyframes confetti-fall {
          0% { transform: translateY(-100vh) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(360deg); opacity: 0; }
        }
        
        .success-circle-border {
          animation: draw-circle 2s ease-out forwards;
        }
        
        .success-checkmark-path {
          animation: draw-checkmark 1s ease-out 1.5s forwards;
        }
        
        @keyframes draw-circle {
          to { stroke-dashoffset: 0; }
        }
        
        @keyframes draw-checkmark {
          to { stroke-dashoffset: 0; }
        }
      `}</style>
    </div>
  );
}