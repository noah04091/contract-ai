import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/AppleAuth.css";

export default function VerifySuccess() {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Auto-redirect nach 5 Sekunden
    const redirectTimer = setTimeout(() => {
      navigate("/login");
    }, 5000);

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
      clearTimeout(redirectTimer);
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, [navigate]);

  return (
    <div className="apple-auth-container" ref={containerRef}>
      <div className="apple-bg">
        <div className="shape shape-1"></div>
        <div className="shape shape-2"></div>
        <div className="shape shape-3"></div>
      </div>
      
      <div className="apple-auth-card">
        <div className="apple-logo">
          <svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#22c55e' }}>
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
        </div>
        
        <h1 className="apple-auth-title" style={{ color: '#22c55e' }}>
          E-Mail bestätigt! 🎉
        </h1>
        
        <p className="apple-auth-subtitle" style={{ marginBottom: '30px' }}>
          Ihre E-Mail-Adresse wurde erfolgreich bestätigt. Ihr Konto ist jetzt aktiviert.
        </p>
        
        <div style={{ 
          background: 'linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 100%)', 
          border: '1px solid #bbf7d0',
          borderRadius: '12px', 
          padding: '20px', 
          marginBottom: '30px' 
        }}>
          <h3 style={{ 
            margin: '0 0 15px 0', 
            fontSize: '18px', 
            color: '#166534',
            fontWeight: '600'
          }}>
            Was Sie jetzt tun können:
          </h3>
          
          <ul style={{ 
            margin: '0', 
            paddingLeft: '20px', 
            color: '#166534',
            lineHeight: '1.6'
          }}>
            <li>Mit Ihrem Konto anmelden</li>
            <li>Verträge hochladen und analysieren lassen</li>
            <li>KI-gestützte Optimierungsvorschläge erhalten</li>
            <li>Ihre Vertragslaufzeiten verwalten</li>
          </ul>
        </div>
        
        <button 
          onClick={() => navigate("/login")}
          className="apple-auth-button"
          style={{ 
            background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
            marginBottom: '15px'
          }}
        >
          <span className="button-text">Jetzt anmelden</span>
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14"></path>
            <path d="m12 5 7 7-7 7"></path>
          </svg>
        </button>
        
        <p style={{ 
          fontSize: '14px', 
          color: '#64748b', 
          textAlign: 'center',
          margin: '0'
        }}>
          Sie werden in 5 Sekunden automatisch zur Anmeldung weitergeleitet...
        </p>
        
        <div className="apple-auth-links" style={{ marginTop: '25px' }}>
          <p>
            Zur Startseite zurückkehren?
            <span className="apple-link" onClick={() => navigate("/")}>
              Startseite
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}