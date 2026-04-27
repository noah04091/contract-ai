import React from 'react';
import { Link } from 'react-router-dom';

/**
 * Reusable Cross-Link-Section für SEO Internal Linking.
 * Wird in Pricing, Features und allen 10 Feature-Pages eingebaut,
 * um Authority-Flow zu den 4 SEO-Landingpages und zur Pillar Page zu leiten.
 */
const SeoCrossLinks: React.FC = () => {
  return (
    <section style={{ padding: '80px 24px', background: 'transparent' }}>
      <style>{`
        .seo-crosslinks-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
          max-width: 1200px;
          margin: 0 auto;
        }
        @media (max-width: 1024px) {
          .seo-crosslinks-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 560px) {
          .seo-crosslinks-grid { grid-template-columns: 1fr; }
        }
        .seo-crosslinks-card {
          display: block;
          padding: 24px;
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(10px);
          border-radius: 16px;
          border: 1px solid rgba(0, 0, 0, 0.06);
          text-decoration: none;
          color: inherit;
          transition: transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease;
        }
        .seo-crosslinks-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.08);
          border-color: rgba(59, 130, 246, 0.3);
        }
      `}</style>
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h2 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '12px', color: '#1f2937' }}>
          Spezialisierte Vertrags-Prüfungen
        </h2>
        <p style={{ fontSize: '1.05rem', color: '#6b7280', maxWidth: '640px', margin: '0 auto' }}>
          Direkt zu den wichtigsten Vertragstypen — auf Basis aktueller BGH- und BAG-Rechtsprechung.
        </p>
      </div>
      <div className="seo-crosslinks-grid">
        <Link to="/arbeitsvertrag-pruefen" className="seo-crosslinks-card">
          <div style={{ fontSize: '1.75rem', marginBottom: '8px' }}>💼</div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '6px', color: '#1f2937' }}>
            Arbeitsvertrag prüfen
          </h3>
          <p style={{ fontSize: '0.9rem', color: '#6b7280', lineHeight: 1.5, margin: 0 }}>
            BAG-Rechtsprechung, Wettbewerbsverbot, Probezeit
          </p>
        </Link>
        <Link to="/mietvertrag-pruefen" className="seo-crosslinks-card">
          <div style={{ fontSize: '1.75rem', marginBottom: '8px' }}>🏠</div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '6px', color: '#1f2937' }}>
            Mietvertrag prüfen
          </h3>
          <p style={{ fontSize: '0.9rem', color: '#6b7280', lineHeight: 1.5, margin: 0 }}>
            Schönheitsreparaturen, Kaution, Indexmiete
          </p>
        </Link>
        <Link to="/nda-pruefen" className="seo-crosslinks-card">
          <div style={{ fontSize: '1.75rem', marginBottom: '8px' }}>🔒</div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '6px', color: '#1f2937' }}>
            NDA prüfen
          </h3>
          <p style={{ fontSize: '0.9rem', color: '#6b7280', lineHeight: 1.5, margin: 0 }}>
            Vertragsstrafe, Carve-Outs, GeschGehG
          </p>
        </Link>
        <Link to="/kaufvertrag-pruefen" className="seo-crosslinks-card">
          <div style={{ fontSize: '1.75rem', marginBottom: '8px' }}>🛒</div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '6px', color: '#1f2937' }}>
            Kaufvertrag prüfen
          </h3>
          <p style={{ fontSize: '0.9rem', color: '#6b7280', lineHeight: 1.5, margin: 0 }}>
            Gewährleistung, Beschaffenheit, BGB
          </p>
        </Link>
      </div>
      <div style={{ textAlign: 'center', marginTop: '32px' }}>
        <Link
          to="/ki-vertragsanalyse"
          style={{ color: '#3b82f6', fontWeight: 600, fontSize: '0.95rem', textDecoration: 'none' }}
        >
          Mehr über KI-Vertragsanalyse erfahren →
        </Link>
      </div>
    </section>
  );
};

export default SeoCrossLinks;
