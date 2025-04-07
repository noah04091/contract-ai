import { Helmet } from "react-helmet-async";

export default function Datenschutz() {
  return (
    <div style={{ padding: "2rem" }}>
      <Helmet>
        <title>Datenschutz | Contract AI</title>
        <meta name="description" content="Datenschutzerklärung für contract-ai.de gemäß DSGVO." />
      </Helmet>
      <h1>🔐 Datenschutzerklärung</h1>
      <p>Diese Datenschutzerklärung klärt Sie über die Art, den Umfang und Zweck der Verarbeitung von personenbezogenen Daten auf unserer Website auf.</p>
      <h2>1. Verantwortlicher</h2>
      <p>Noah Liebold<br />Richard Oberle Weg 27<br />E-Mail: info@contract-ai.de</p>
      <h2>2. Erhebung und Speicherung personenbezogener Daten</h2>
      <p>Beim Besuch unserer Website werden folgende Daten automatisch erfasst: IP-Adresse, Browsertyp, Betriebssystem, Referrer URL, Uhrzeit des Zugriffs.</p>
      <h2>3. Verwendung von Cookies</h2>
      <p>Wir verwenden Cookies zur Verbesserung der Nutzererfahrung. Details entnehmen Sie bitte unserer Cookie-Richtlinie.</p>
      <h2>4. Rechte der betroffenen Person</h2>
      <ul>
        <li>Auskunft</li>
        <li>Löschung</li>
        <li>Einschränkung der Verarbeitung</li>
        <li>Datenübertragbarkeit</li>
        <li>Widerruf Ihrer Einwilligung</li>
      </ul>
      <p>Bei Fragen wenden Sie sich bitte an info@contract-ai.de.</p>
    </div>
  );
}
