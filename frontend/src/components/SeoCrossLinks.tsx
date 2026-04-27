import React from 'react';
import { Link } from 'react-router-dom';

/**
 * Subtiler Inline-Banner für SEO Internal Linking.
 * Wird in den 10 Feature-Pages unter der Related-Section eingebaut.
 * Bewusst minimalistisch (kein Card-Block) um doppelte Card-Sektionen zu vermeiden.
 */
const SeoCrossLinks: React.FC = () => {
  return (
    <div
      style={{
        textAlign: 'center',
        marginTop: '40px',
        padding: '0 24px',
        maxWidth: '900px',
        marginLeft: 'auto',
        marginRight: 'auto',
        fontSize: '0.95rem',
        color: '#6b7280',
        lineHeight: 1.8,
      }}
    >
      <style>{`
        .seo-inline-link {
          color: #3b82f6;
          text-decoration: none;
          font-weight: 500;
          transition: color 0.2s ease;
        }
        .seo-inline-link:hover {
          color: #1d4ed8;
          text-decoration: underline;
        }
        .seo-inline-sep {
          margin: 0 8px;
          color: #d1d5db;
        }
      `}</style>
      <span style={{ marginRight: '8px' }}>Auch als spezialisierte Vertragsprüfung verfügbar:</span>
      <Link to="/arbeitsvertrag-pruefen" className="seo-inline-link">Arbeitsvertrag</Link>
      <span className="seo-inline-sep">·</span>
      <Link to="/mietvertrag-pruefen" className="seo-inline-link">Mietvertrag</Link>
      <span className="seo-inline-sep">·</span>
      <Link to="/nda-pruefen" className="seo-inline-link">NDA</Link>
      <span className="seo-inline-sep">·</span>
      <Link to="/kaufvertrag-pruefen" className="seo-inline-link">Kaufvertrag</Link>
    </div>
  );
};

export default SeoCrossLinks;
