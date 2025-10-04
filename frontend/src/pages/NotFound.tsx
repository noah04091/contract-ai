// 📄 src/pages/NotFound.tsx
import { Link } from "react-router-dom";
import SEO from "../components/SEO";

export default function NotFound() {
  return (
    <>
      <SEO
        title="404 – Seite nicht gefunden | Contract AI"
        description="Die gesuchte Seite wurde nicht gefunden. Zurück zur Startseite von Contract AI."
        noindex={true}
      />

      <div
        style={{
          minHeight: "80vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: "2rem",
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          color: "white",
        }}
      >
        <h1 style={{ fontSize: "8rem", margin: 0, fontWeight: 900 }}>404</h1>
        <h2 style={{ fontSize: "2rem", marginTop: "1rem", fontWeight: 600 }}>
          Seite nicht gefunden
        </h2>
        <p style={{ fontSize: "1.2rem", marginTop: "1rem", maxWidth: "600px", opacity: 0.9 }}>
          Die von dir gesuchte Seite existiert leider nicht. Vielleicht wurde sie verschoben oder
          gelöscht.
        </p>

        <div style={{ marginTop: "2rem", display: "flex", gap: "1rem", flexWrap: "wrap", justifyContent: "center" }}>
          <Link
            to="/"
            style={{
              padding: "1rem 2rem",
              background: "white",
              color: "#667eea",
              borderRadius: "8px",
              textDecoration: "none",
              fontWeight: 600,
              fontSize: "1.1rem",
              transition: "transform 0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.05)")}
            onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
          >
            Zur Startseite
          </Link>

          <Link
            to="/hilfe"
            style={{
              padding: "1rem 2rem",
              background: "rgba(255, 255, 255, 0.2)",
              color: "white",
              borderRadius: "8px",
              textDecoration: "none",
              fontWeight: 600,
              fontSize: "1.1rem",
              border: "2px solid white",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "white";
              e.currentTarget.style.color = "#667eea";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.2)";
              e.currentTarget.style.color = "white";
            }}
          >
            Hilfe-Center
          </Link>
        </div>

        <div style={{ marginTop: "3rem", opacity: 0.8 }}>
          <p style={{ fontSize: "1rem" }}>Beliebte Seiten:</p>
          <div style={{ display: "flex", gap: "1.5rem", marginTop: "0.5rem", flexWrap: "wrap", justifyContent: "center" }}>
            <Link to="/features/vertragsanalyse" style={{ color: "white", textDecoration: "underline" }}>
              Vertragsanalyse
            </Link>
            <Link to="/features/optimierung" style={{ color: "white", textDecoration: "underline" }}>
              Optimierung
            </Link>
            <Link to="/pricing" style={{ color: "white", textDecoration: "underline" }}>
              Preise
            </Link>
            <Link to="/blog" style={{ color: "white", textDecoration: "underline" }}>
              Blog
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
