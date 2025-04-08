import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer
      style={{
        background: "rgba(255, 255, 255, 0.02)",
        color: "#bbb",
        fontSize: "0.8rem",
        textAlign: "center",
        padding: "1rem 1rem 1.5rem",
        borderTop: "1px solid rgba(255,255,255,0.05)",
        marginTop: "auto",
      }}
    >
      <div style={{ marginBottom: "0.4rem" }}>
        <Link to="/impressum" style={linkStyle}>
          Impressum
        </Link>{" "}
        •{" "}
        <Link to="/datenschutz" style={linkStyle}>
          Datenschutz
        </Link>{" "}
        •{" "}
        <Link to="/agb" style={linkStyle}>
          AGB
        </Link>
      </div>
      <div style={{ fontSize: "0.75rem", color: "#888" }}>
        © {new Date().getFullYear()} Contract AI – Alle Rechte vorbehalten
      </div>
    </footer>
  );
}

const linkStyle = {
  color: "#61dafb",
  textDecoration: "none",
  margin: "0 4px",
};
