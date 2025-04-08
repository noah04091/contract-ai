// 📁 src/components/Footer.tsx
import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer
      style={{
        background: "#111", // dunkler Hintergrund
        color: "#ccc",
        padding: "1rem 0",
        textAlign: "center",
        fontSize: "0.875rem",
        marginTop: "4rem",
        borderTop: "1px solid rgba(255, 255, 255, 0.1)",
      }}
    >
      <div style={{ marginBottom: "0.25rem" }}>
        <Link to="/impressum" style={linkStyle}>
          Impressum
        </Link>{" "}
        ·{" "}
        <Link to="/datenschutz" style={linkStyle}>
          Datenschutz
        </Link>{" "}
        ·{" "}
        <Link to="/agb" style={linkStyle}>
          AGB
        </Link>
      </div>
      <div style={{ color: "#777" }}>© 2025 Contract AI – Alle Rechte vorbehalten</div>
    </footer>
  );
}

const linkStyle = {
  color: "#61dafb",
  textDecoration: "none",
  margin: "0 0.5rem",
};
