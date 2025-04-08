// 📁 src/components/Footer.tsx
import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer
      style={{
        backgroundColor: "rgba(0,0,0,0.7)",
        color: "#ccc",
        fontSize: "0.85rem",
        textAlign: "center",
        padding: "1rem 0",
        marginTop: "4rem",
        borderTop: "1px solid rgba(255, 255, 255, 0.1)",
      }}
    >
      <div>
        <Link to="/impressum" style={linkStyle}>
          Impressum
        </Link>
        {" · "}
        <Link to="/datenschutz" style={linkStyle}>
          Datenschutz
        </Link>
        {" · "}
        <Link to="/agb" style={linkStyle}>
          AGB
        </Link>
      </div>
      <div style={{ marginTop: "0.5rem", fontSize: "0.75rem", opacity: 0.6 }}>
        © {new Date().getFullYear()} Contract AI – Alle Rechte vorbehalten
      </div>
    </footer>
  );
}

const linkStyle = {
  color: "#ccc",
  textDecoration: "none",
  margin: "0 0.3rem",
};
