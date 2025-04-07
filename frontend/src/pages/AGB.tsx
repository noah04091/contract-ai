import { Helmet } from "react-helmet-async";

export default function AGB() {
  return (
    <div style={{ padding: "2rem" }}>
      <Helmet>
        <title>AGB | Contract AI</title>
        <meta name="description" content="Allgemeine Geschäftsbedingungen (AGB) von Contract AI." />
      </Helmet>
      <h1>📘 Allgemeine Geschäftsbedingungen (AGB)</h1>
      <h2>1. Geltungsbereich</h2>
      <p>Diese AGB gelten für die Nutzung der Webanwendung Contract AI, bereitgestellt von Noah Liebold.</p>
      <h2>2. Vertragsschluss</h2>
      <p>Mit der Registrierung und Nutzung unserer Leistungen kommt ein Nutzungsvertrag zustande.</p>
      <h2>3. Leistungen</h2>
      <p>Die Plattform bietet KI-gestützte Vertragsanalysen, Vergleiche und Erinnerungsdienste.</p>
      <h2>4. Pflichten des Nutzers</h2>
      <p>Der Nutzer verpflichtet sich, keine rechtswidrigen Inhalte hochzuladen und die Plattform nicht zu missbrauchen.</p>
      <h2>5. Haftung</h2>
      <p>Wir haften nicht für die Richtigkeit der KI-generierten Analysen oder für etwaige rechtliche Fehlinterpretationen.</p>
      <h2>6. Schlussbestimmungen</h2>
      <p>Es gilt deutsches Recht. Gerichtsstand ist – soweit gesetzlich zulässig – der Sitz des Betreibers.</p>
    </div>
  );
}
