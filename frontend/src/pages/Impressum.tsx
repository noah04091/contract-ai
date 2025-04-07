import { Helmet } from "react-helmet-async";

export default function Impressum() {
  return (
    <div style={{ padding: "2rem" }}>
      <Helmet>
        <title>Impressum | Contract AI</title>
        <meta name="description" content="Impressum der Website contract-ai.de. Verantwortliche Angaben gemäß § 5 TMG." />
      </Helmet>
      <h1>📄 Impressum</h1>
      <p><strong>Angaben gemäß § 5 TMG</strong></p>
      <p>Noah Liebold<br />Richard Oberle Weg 27<br />Deutschland</p>
      <p><strong>Kontakt</strong><br />Telefon: –<br />E-Mail: info@contract-ai.de</p>
      <p><strong>Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV</strong><br />Noah Liebold</p>
      <p>Plattform der EU-Kommission zur Online-Streitbeilegung: <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noreferrer">https://ec.europa.eu/consumers/odr</a></p>
    </div>
  );
}