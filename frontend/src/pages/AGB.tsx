import { Helmet } from "react-helmet-async";
import Footer from "../components/Footer";

export default function AGB() {
  return (
    <>
      <Helmet>
        <title>Allgemeine Geschäftsbedingungen | Contract AI</title>
        <meta name="description" content="Hier findest du die Allgemeinen Geschäftsbedingungen (AGB) von Contract AI – transparent, fair und verständlich erklärt." />
        <meta name="keywords" content="AGB, Vertragsbedingungen, Contract AI AGB, Nutzungsbedingungen" />
        <link rel="canonical" href="https://www.contract-ai.de/agb" />
        {/* Open Graph / Facebook */}
        <meta property="og:title" content="Allgemeine Geschäftsbedingungen | Contract AI" />
        <meta property="og:description" content="Unsere AGB geben dir volle Transparenz zu den Vertragsbedingungen und der Nutzung von Contract AI." />
        <meta property="og:url" content="https://www.contract-ai.de/agb" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://www.contract-ai.de/og-image.jpg" />
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Allgemeine Geschäftsbedingungen | Contract AI" />
        <meta name="twitter:description" content="Lies hier die Vertrags- und Nutzungsbedingungen von Contract AI. Transparent und klar formuliert." />
        <meta name="twitter:image" content="https://www.contract-ai.de/og-image.jpg" />
      </Helmet>

      <div style={{ backgroundColor: '#f5f5f7', minHeight: '100vh', paddingTop: '80px', paddingBottom: '0' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', padding: '40px 20px 60px', backgroundColor: 'white', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
          <h1 style={{ fontSize: '36px', fontWeight: '700', marginBottom: '10px', color: '#1d1d1f' }}>
            Allgemeine Geschäftsbedingungen
          </h1>
          <p style={{ fontSize: '16px', color: '#86868b', marginBottom: '40px' }}>
            Gültig ab 28. Oktober 2024
          </p>

          <h2 style={{ fontSize: '24px', fontWeight: '600', marginTop: '30px', marginBottom: '15px', color: '#1d1d1f' }}>
            1. Geltungsbereich und Vertragspartner
          </h2>
          <p style={{ fontSize: '16px', lineHeight: '1.6', color: '#1d1d1f', marginBottom: '15px' }}>
            Diese Allgemeinen Geschäftsbedingungen (AGB) regeln die Nutzung der Webanwendung Contract AI unter der Domain www.contract-ai.de sowie aller damit verbundenen Dienstleistungen.
          </p>
          <p style={{ fontSize: '16px', lineHeight: '1.6', color: '#1d1d1f', marginBottom: '15px' }}>
            <strong>Anbieter und Vertragspartner:</strong><br/>
            Noah Liebold<br/>
            E-Mail: info@contract-ai.de
          </p>
          <p style={{ fontSize: '16px', lineHeight: '1.6', color: '#1d1d1f', marginBottom: '15px' }}>
            Diese AGB gelten für alle Verträge zwischen dem Anbieter und den Nutzern der Plattform, unabhängig davon, ob es sich um Verbraucher oder Unternehmer handelt.
          </p>
          <p style={{ fontSize: '16px', lineHeight: '1.6', color: '#1d1d1f', marginBottom: '15px' }}>
            Abweichende, entgegenstehende oder ergänzende Allgemeine Geschäftsbedingungen des Nutzers werden nur dann und insoweit Vertragsbestandteil, als der Anbieter ihrer Geltung ausdrücklich zugestimmt hat.
          </p>

          <h2 style={{ fontSize: '24px', fontWeight: '600', marginTop: '30px', marginBottom: '15px', color: '#1d1d1f' }}>
            2. Vertragsschluss und Registrierung
          </h2>
          <p style={{ fontSize: '16px', lineHeight: '1.6', color: '#1d1d1f', marginBottom: '15px' }}>
            <strong>2.1 Registrierung</strong><br/>
            Die Nutzung der Plattform Contract AI erfordert die Erstellung eines Nutzerkontos. Mit der Registrierung gibt der Nutzer ein verbindliches Angebot zum Abschluss eines Nutzungsvertrages ab. Der Vertrag kommt durch die Bestätigung der E-Mail-Adresse durch den Nutzer zustande.
          </p>
          <p style={{ fontSize: '16px', lineHeight: '1.6', color: '#1d1d1f', marginBottom: '15px' }}>
            <strong>2.2 Voraussetzungen</strong><br/>
            Zur Registrierung berechtigt sind ausschließlich volljährige, geschäftsfähige natürliche Personen sowie juristische Personen. Mit der Registrierung versichert der Nutzer, dass er volljährig und geschäftsfähig ist.
          </p>
          <p style={{ fontSize: '16px', lineHeight: '1.6', color: '#1d1d1f', marginBottom: '15px' }}>
            <strong>2.3 Wahrheitsgemäße Angaben</strong><br/>
            Der Nutzer verpflichtet sich, bei der Registrierung wahrheitsgemäße und vollständige Angaben zu machen. Änderungen der angegebenen Daten sind dem Anbieter unverzüglich mitzuteilen.
          </p>
          <p style={{ fontSize: '16px', lineHeight: '1.6', color: '#1d1d1f', marginBottom: '15px' }}>
            <strong>2.4 Zugangsdaten</strong><br/>
            Der Nutzer ist verpflichtet, seine Zugangsdaten vertraulich zu behandeln und vor dem Zugriff Dritter zu schützen. Bei Verdacht auf Missbrauch ist der Anbieter unverzüglich zu informieren.
          </p>

          <h2 style={{ fontSize: '24px', fontWeight: '600', marginTop: '30px', marginBottom: '15px', color: '#1d1d1f' }}>
            3. Leistungsumfang und Funktionen
          </h2>
          <p style={{ fontSize: '16px', lineHeight: '1.6', color: '#1d1d1f', marginBottom: '15px' }}>
            Contract AI ist eine webbasierte SaaS-Plattform zur Verwaltung, Analyse und Optimierung von Verträgen mittels künstlicher Intelligenz. Die Plattform bietet folgende Hauptfunktionen:
          </p>
          <p style={{ fontSize: '16px', lineHeight: '1.6', color: '#1d1d1f', marginBottom: '15px' }}>
            <strong>3.1 KI-gestützte Vertragsanalyse</strong><br/>
            Upload von Vertragsdokumenten (PDF), automatische Textextraktion und Analyse durch KI (OpenAI GPT), Erkennung von Risiken, Schwachstellen und Optimierungspotenzialen, Bewertung mit Score-System zur Einschätzung der Vertragsqualität.
          </p>
          <p style={{ fontSize: '16px', lineHeight: '1.6', color: '#1d1d1f', marginBottom: '15px' }}>
            <strong>3.2 Vertragsverwaltung</strong><br/>
            Zentrale Ablage und Organisation aller Verträge, Kategorisierung nach Vertragstypen und Ordnern, Suchfunktion und Filtermöglichkeiten, sichere Cloud-Speicherung auf AWS S3 Servern.
          </p>
          <p style={{ fontSize: '16px', lineHeight: '1.6', color: '#1d1d1f', marginBottom: '15px' }}>
            <strong>3.3 Fristen und Erinnerungen</strong><br/>
            Automatische Erkennung von Kündigungsfristen und Vertragslaufzeiten, Kalenderintegration mit wichtigen Terminen, E-Mail-Benachrichtigungen vor Fristablauf, Export als iCal-Datei für externe Kalender.
          </p>
          <p style={{ fontSize: '16px', lineHeight: '1.6', color: '#1d1d1f', marginBottom: '15px' }}>
            <strong>3.4 Vertragsvergleich</strong><br/>
            Vergleich von zwei oder mehreren Verträgen, Aufzeigen von Unterschieden in Konditionen, Preisen und Laufzeiten, Empfehlungen zur Optimierung.
          </p>
          <p style={{ fontSize: '16px', lineHeight: '1.6', color: '#1d1d1f', marginBottom: '15px' }}>
            <strong>3.5 Vertragsoptimierung</strong><br/>
            Konkrete Verbesserungsvorschläge für bestehende Verträge, rechtliche Hinweise zu problematischen Klauseln, Formulierungsvorschläge für faire Vertragsgestaltung.
          </p>
          <p style={{ fontSize: '16px', lineHeight: '1.6', color: '#1d1d1f', marginBottom: '15px' }}>
            <strong>3.6 Vertragsgenerierung</strong><br/>
            KI-gestützte Erstellung neuer Vertragsdokumente, vorausgefüllte Templates für verschiedene Vertragstypen, digitale Signatur-Funktion, Export als PDF.
          </p>
          <p style={{ fontSize: '16px', lineHeight: '1.6', color: '#1d1d1f', marginBottom: '15px' }}>
            <strong>3.7 KI-Chat und Legal Pulse</strong><br/>
            Chat-basierte Beratung zu Vertragsfragen, Erklärung von Fachbegriffen und Klauseln, aktuelle Rechtsänderungen und Updates (Legal Pulse Feature).
          </p>
          <p style={{ fontSize: '16px', lineHeight: '1.6', color: '#1d1d1f', marginBottom: '15px' }}>
            <strong>3.8 Rechnungsverwaltung</strong><br/>
            Automatische Erstellung von Rechnungen für bezahlte Tarife, PDF-Export und E-Mail-Versand, Übersicht aller Zahlungen im Nutzerkonto.
          </p>
          <p style={{ fontSize: '16px', lineHeight: '1.6', color: '#1d1d1f', marginBottom: '15px' }}>
            <strong>3.9 Verfügbarkeit</strong><br/>
            Der Anbieter bemüht sich um eine ständige Verfügbarkeit der Plattform. Eine 100%ige Verfügbarkeit kann jedoch nicht garantiert werden. Wartungsarbeiten, Updates und technische Störungen können zu vorübergehenden Ausfällen führen. Geplante Wartungsarbeiten werden nach Möglichkeit im Voraus angekündigt.
          </p>

          <h2 style={{ fontSize: '24px', fontWeight: '600', marginTop: '30px', marginBottom: '15px', color: '#1d1d1f' }}>
            4. Tarife, Preise und Zahlungsbedingungen
          </h2>
          <p style={{ fontSize: '16px', lineHeight: '1.6', color: '#1d1d1f', marginBottom: '15px' }}>
            <strong>4.1 Tarifmodelle</strong><br/>
            Contract AI bietet verschiedene Tarife mit unterschiedlichen Leistungsumfängen an:
          </p>
          <p style={{ fontSize: '16px', lineHeight: '1.6', color: '#1d1d1f', marginBottom: '15px' }}>
            <strong>Free-Tarif:</strong> Kostenlos, 3 Vertragsanalysen pro Monat, Grundfunktionen der Plattform verfügbar.
          </p>
          <p style={{ fontSize: '16px', lineHeight: '1.6', color: '#1d1d1f', marginBottom: '15px' }}>
            <strong>Premium-Tarif:</strong> Kostenpflichtig, 15 Vertragsanalysen pro Monat, alle Standard-Features inklusive.
          </p>
          <p style={{ fontSize: '16px', lineHeight: '1.6', color: '#1d1d1f', marginBottom: '15px' }}>
            <strong>Business-Tarif:</strong> Kostenpflichtig, 50 Vertragsanalysen pro Monat, erweiterte Funktionen und Prioritätssupport.
          </p>
          <p style={{ fontSize: '16px', lineHeight: '1.6', color: '#1d1d1f', marginBottom: '15px' }}>
            <strong>Legendary-Tarif:</strong> Kostenpflichtig, unbegrenzte Analysen, alle Premium-Features, höchster Support-Level.
          </p>
          <p style={{ fontSize: '16px', lineHeight: '1.6', color: '#1d1d1f', marginBottom: '15px' }}>
            Die jeweils aktuellen Preise sind auf der Pricing-Seite unter www.contract-ai.de/pricing einsehbar. Alle Preise verstehen sich inklusive der gesetzlichen Mehrwertsteuer.
          </p>
          <p style={{ fontSize: '16px', lineHeight: '1.6', color: '#1d1d1f', marginBottom: '15px' }}>
            <strong>4.2 Zahlungsweise</strong><br/>
            Die Zahlung für kostenpflichtige Tarife erfolgt wahlweise monatlich oder jährlich im Voraus per Kreditkarte oder anderen von Stripe unterstützten Zahlungsmethoden. Die Zahlungsabwicklung erfolgt über den externen Zahlungsdienstleister Stripe. Der Anbieter speichert keine Kreditkartendaten.
          </p>
          <p style={{ fontSize: '16px', lineHeight: '1.6', color: '#1d1d1f', marginBottom: '15px' }}>
            <strong>4.3 Upgrade und Downgrade</strong><br/>
            Ein Wechsel zwischen Tarifen (Upgrade oder Downgrade) ist jederzeit über das Nutzerkonto möglich. Bei einem Upgrade wird die Differenz anteilig für die verbleibende Laufzeit berechnet. Bei einem Downgrade gilt der neue Tarif ab der nächsten Abrechnungsperiode.
          </p>
          <p style={{ fontSize: '16px', lineHeight: '1.6', color: '#1d1d1f', marginBottom: '15px' }}>
            <strong>4.4 Nutzungslimits</strong><br/>
            Bei Überschreitung der monatlichen Analyse-Limits wird der Nutzer aufgefordert, ein Upgrade durchzuführen. Überschreitungen werden nicht automatisch berechnet.
          </p>
          <p style={{ fontSize: '16px', lineHeight: '1.6', color: '#1d1d1f', marginBottom: '15px' }}>
            <strong>4.5 Zahlungsverzug</strong><br/>
            Bei Zahlungsverzug kann der Zugriff auf kostenpflichtige Funktionen bis zur vollständigen Begleichung der ausstehenden Beträge gesperrt werden. Der Nutzer wird hierüber per E-Mail informiert.
          </p>
          <p style={{ fontSize: '16px', lineHeight: '1.6', color: '#1d1d1f', marginBottom: '15px' }}>
            <strong>4.6 60-Tage-Geld-zurück-Garantie</strong><br/>
            Für Erstkunden gilt eine 60-Tage-Geld-zurück-Garantie. Sollten Sie mit Contract AI nicht zufrieden sein, erstatten wir Ihnen innerhalb von 60 Tagen nach Zahlungseingang den vollen Betrag zurück. Bitte kontaktieren Sie hierzu unseren Support unter info@contract-ai.de.
          </p>

          <h2 style={{ fontSize: '24px', fontWeight: '600', marginTop: '30px', marginBottom: '15px', color: '#1d1d1f' }}>
            5. Laufzeit, Kündigung und Widerrufsrecht
          </h2>
          <p style={{ fontSize: '16px', lineHeight: '1.6', color: '#1d1d1f', marginBottom: '15px' }}>
            <strong>5.1 Vertragslaufzeit</strong><br/>
            Der Nutzungsvertrag für den Free-Tarif wird auf unbestimmte Zeit geschlossen. Kostenpflichtige Tarife haben je nach Wahl eine Mindestlaufzeit von einem Monat (bei monatlicher Zahlung) oder einem Jahr (bei jährlicher Zahlung).
          </p>
          <p style={{ fontSize: '16px', lineHeight: '1.6', color: '#1d1d1f', marginBottom: '15px' }}>
            <strong>5.2 Kündigung durch den Nutzer</strong><br/>
            Der Vertrag kann jederzeit ohne Einhaltung einer Kündigungsfrist über das Nutzerkonto gekündigt werden. Die Kündigung wird zum Ende der aktuellen Abrechnungsperiode wirksam. Bereits gezahlte Beträge für die laufende Periode werden nicht erstattet (außer im Rahmen der 60-Tage-Geld-zurück-Garantie).
          </p>
          <p style={{ fontSize: '16px', lineHeight: '1.6', color: '#1d1d1f', marginBottom: '15px' }}>
            <strong>5.3 Keine automatische Verlängerung mit Preiserhöhung</strong><br/>
            Kostenpflichtige Abonnements verlängern sich automatisch um die gewählte Laufzeit, sofern nicht vor Ablauf gekündigt wird. Es fallen keine versteckten Kosten an. Preiserhöhungen werden dem Nutzer mindestens 30 Tage im Voraus per E-Mail mitgeteilt. Der Nutzer hat dann ein Sonderkündigungsrecht.
          </p>
          <p style={{ fontSize: '16px', lineHeight: '1.6', color: '#1d1d1f', marginBottom: '15px' }}>
            <strong>5.4 Kündigung durch den Anbieter</strong><br/>
            Der Anbieter kann den Vertrag aus wichtigem Grund fristlos kündigen, insbesondere bei:
          </p>
          <ul style={{ fontSize: '16px', lineHeight: '1.6', color: '#1d1d1f', marginBottom: '15px', paddingLeft: '25px' }}>
            <li>Verstoß gegen diese AGB oder geltendes Recht</li>
            <li>Missbrauch der Plattform oder der KI-Funktionen</li>
            <li>Upload von illegalen, urheberrechtsverletzenden oder schädlichen Inhalten</li>
            <li>Zahlungsverzug trotz Mahnung</li>
            <li>Weitergabe von Zugangsdaten an Dritte</li>
          </ul>
          <p style={{ fontSize: '16px', lineHeight: '1.6', color: '#1d1d1f', marginBottom: '15px' }}>
            <strong>5.5 Widerrufsrecht für Verbraucher</strong><br/>
            Verbraucher (§ 13 BGB) haben ein gesetzliches Widerrufsrecht von 14 Tagen ab Vertragsschluss. Das Widerrufsrecht erlischt vorzeitig, wenn der Nutzer die Dienstleistung vor Ablauf der Widerrufsfrist vollständig in Anspruch genommen hat und der Anbieter mit der Ausführung erst nach ausdrücklicher Zustimmung des Verbrauchers begonnen hat.
          </p>
          <p style={{ fontSize: '16px', lineHeight: '1.6', color: '#1d1d1f', marginBottom: '15px' }}>
            <strong>Widerrufsbelehrung:</strong><br/>
            Sie haben das Recht, binnen vierzehn Tagen ohne Angabe von Gründen diesen Vertrag zu widerrufen. Die Widerrufsfrist beträgt vierzehn Tage ab dem Tag des Vertragsschlusses. Um Ihr Widerrufsrecht auszuüben, müssen Sie uns (Noah Liebold, E-Mail: info@contract-ai.de) mittels einer eindeutigen Erklärung (z. B. per E-Mail) über Ihren Entschluss, diesen Vertrag zu widerrufen, informieren. Zur Wahrung der Widerrufsfrist reicht es aus, dass Sie die Mitteilung über die Ausübung des Widerrufsrechts vor Ablauf der Widerrufsfrist absenden.
          </p>
          <p style={{ fontSize: '16px', lineHeight: '1.6', color: '#1d1d1f', marginBottom: '15px' }}>
            <strong>Folgen des Widerrufs:</strong><br/>
            Wenn Sie diesen Vertrag widerrufen, haben wir Ihnen alle Zahlungen, die wir von Ihnen erhalten haben, unverzüglich und spätestens binnen vierzehn Tagen ab dem Tag zurückzuzahlen, an dem die Mitteilung über Ihren Widerruf bei uns eingegangen ist.
          </p>

          <h2 style={{ fontSize: '24px', fontWeight: '600', marginTop: '30px', marginBottom: '15px', color: '#1d1d1f' }}>
            6. Rechte und Pflichten des Nutzers
          </h2>
          <p style={{ fontSize: '16px', lineHeight: '1.6', color: '#1d1d1f', marginBottom: '15px' }}>
            <strong>6.1 Nutzungsrechte</strong><br/>
            Der Nutzer erhält für die Dauer des Vertragsverhältnisses ein nicht-exklusives, nicht übertragbares und nicht unterlizenzierbares Recht zur Nutzung der Plattform Contract AI im vertraglich vereinbarten Umfang.
          </p>
          <p style={{ fontSize: '16px', lineHeight: '1.6', color: '#1d1d1f', marginBottom: '15px' }}>
            <strong>6.2 Pflichten des Nutzers</strong><br/>
            Der Nutzer verpflichtet sich:
          </p>
          <ul style={{ fontSize: '16px', lineHeight: '1.6', color: '#1d1d1f', marginBottom: '15px', paddingLeft: '25px' }}>
            <li>Die Plattform ausschließlich zu rechtmäßigen Zwecken zu nutzen</li>
            <li>Keine rechtswidrigen, beleidigenden, diskriminierenden oder anderweitig schädlichen Inhalte hochzuladen</li>
            <li>Keine Verträge hochzuladen, die Geschäftsgeheimnisse Dritter oder personenbezogene Daten Dritter ohne deren Einwilligung enthalten</li>
            <li>Die Plattform nicht zu missbrauchen, insbesondere keine Versuche zu unternehmen, die Sicherheit der Plattform zu kompromittieren</li>
            <li>Keine automatisierten Zugriffe (Bots, Scraper) ohne Genehmigung des Anbieters durchzuführen</li>
            <li>Die generierten Inhalte eigenverantwortlich zu prüfen und nicht blind zu übernehmen</li>
          </ul>
          <p style={{ fontSize: '16px', lineHeight: '1.6', color: '#1d1d1f', marginBottom: '15px' }}>
            <strong>6.3 Verantwortung für hochgeladene Inhalte</strong><br/>
            Der Nutzer ist allein verantwortlich für alle Inhalte, die er auf die Plattform hochlädt. Er versichert, dass er über alle erforderlichen Rechte an den hochgeladenen Dokumenten verfügt und keine Rechte Dritter verletzt werden.
          </p>
          <p style={{ fontSize: '16px', lineHeight: '1.6', color: '#1d1d1f', marginBottom: '15px' }}>
            <strong>6.4 Urheberrecht</strong><br/>
            Alle Inhalte der Plattform (Texte, Grafiken, Logos, Software, Design) sind urheberrechtlich geschützt. Eine Vervielfältigung, Bearbeitung oder Verbreitung außerhalb der gestatteten Nutzung ist ohne schriftliche Zustimmung des Anbieters untersagt.
          </p>

          <h2 style={{ fontSize: '24px', fontWeight: '600', marginTop: '30px', marginBottom: '15px', color: '#1d1d1f' }}>
            7. Datenschutz und Datensicherheit
          </h2>
          <p style={{ fontSize: '16px', lineHeight: '1.6', color: '#1d1d1f', marginBottom: '15px' }}>
            <strong>7.1 Datenschutzerklärung</strong><br/>
            Der Schutz Ihrer personenbezogenen Daten ist uns wichtig. Die Verarbeitung Ihrer Daten erfolgt nach den Bestimmungen der Datenschutz-Grundverordnung (DSGVO) und des Bundesdatenschutzgesetzes (BDSG). Details entnehmen Sie bitte unserer Datenschutzerklärung unter www.contract-ai.de/datenschutz.
          </p>
          <p style={{ fontSize: '16px', lineHeight: '1.6', color: '#1d1d1f', marginBottom: '15px' }}>
            <strong>7.2 Datenverarbeitung</strong><br/>
            Zur Erbringung unserer Dienstleistungen verarbeiten wir personenbezogene Daten (Name, E-Mail-Adresse, Zahlungsinformationen) sowie die von Ihnen hochgeladenen Vertragsdokumente. Diese Daten werden ausschließlich zur Vertragserfüllung verwendet.
          </p>
          <p style={{ fontSize: '16px', lineHeight: '1.6', color: '#1d1d1f', marginBottom: '15px' }}>
            <strong>7.3 Externe Dienstleister</strong><br/>
            Wir nutzen folgende externe Dienstleister als Auftragsverarbeiter:
          </p>
          <ul style={{ fontSize: '16px', lineHeight: '1.6', color: '#1d1d1f', marginBottom: '15px', paddingLeft: '25px' }}>
            <li><strong>AWS S3 (Amazon Web Services):</strong> Speicherung hochgeladener Vertragsdokumente</li>
            <li><strong>OpenAI:</strong> KI-Analyse der Vertragsinhalte mittels GPT-Modellen</li>
            <li><strong>Stripe:</strong> Zahlungsabwicklung für kostenpflichtige Tarife</li>
            <li><strong>MongoDB Atlas:</strong> Datenbank für Nutzerdaten und Vertragsmetadaten</li>
          </ul>
          <p style={{ fontSize: '16px', lineHeight: '1.6', color: '#1d1d1f', marginBottom: '15px' }}>
            Mit allen Dienstleistern wurden Auftragsverarbeitungsverträge nach Art. 28 DSGVO geschlossen.
          </p>
          <p style={{ fontSize: '16px', lineHeight: '1.6', color: '#1d1d1f', marginBottom: '15px' }}>
            <strong>7.4 Datensicherheit</strong><br/>
            Wir setzen technische und organisatorische Maßnahmen ein, um Ihre Daten vor Verlust, Zerstörung, Manipulation und unberechtigtem Zugriff zu schützen. Die Datenübertragung erfolgt verschlüsselt per HTTPS/TLS. Zugangsdaten werden mit modernen Hashing-Verfahren gespeichert.
          </p>
          <p style={{ fontSize: '16px', lineHeight: '1.6', color: '#1d1d1f', marginBottom: '15px' }}>
            <strong>7.5 Löschung von Daten</strong><br/>
            Nach Beendigung des Vertragsverhältnisses werden alle personenbezogenen Daten und hochgeladenen Dokumente innerhalb von 30 Tagen vollständig gelöscht, sofern keine gesetzlichen Aufbewahrungspflichten entgegenstehen.
          </p>

          <h2 style={{ fontSize: '24px', fontWeight: '600', marginTop: '30px', marginBottom: '15px', color: '#1d1d1f' }}>
            8. Haftung und Gewährleistung
          </h2>
          <p style={{ fontSize: '16px', lineHeight: '1.6', color: '#1d1d1f', marginBottom: '15px' }}>
            <strong>8.1 Keine Rechtsberatung</strong><br/>
            Die von Contract AI bereitgestellten Analysen, Bewertungen und Empfehlungen dienen ausschließlich der Information und stellen keine Rechtsberatung dar. Eine Haftung für die Richtigkeit, Vollständigkeit oder Aktualität der KI-generierten Inhalte wird nicht übernommen. Im Zweifelsfall sollte stets ein Rechtsanwalt oder Notar konsultiert werden.
          </p>
          <p style={{ fontSize: '16px', lineHeight: '1.6', color: '#1d1d1f', marginBottom: '15px' }}>
            <strong>8.2 KI-Technologie und Fehlerpotential</strong><br/>
            Die Plattform nutzt künstliche Intelligenz (OpenAI GPT) zur Analyse von Verträgen. Trotz modernster Technologie können KI-Systeme Fehler machen, Inhalte falsch interpretieren oder wichtige Klauseln übersehen. Der Nutzer ist verpflichtet, alle KI-generierten Inhalte eigenverantwortlich zu prüfen und zu bewerten.
          </p>
          <p style={{ fontSize: '16px', lineHeight: '1.6', color: '#1d1d1f', marginBottom: '15px' }}>
            <strong>8.3 Haftungsbeschränkung</strong><br/>
            Der Anbieter haftet unbeschränkt für Schäden aus der Verletzung des Lebens, des Körpers oder der Gesundheit, die auf einer vorsätzlichen oder fahrlässigen Pflichtverletzung beruhen, sowie für Schäden, die auf Vorsatz oder grober Fahrlässigkeit beruhen.
          </p>
          <p style={{ fontSize: '16px', lineHeight: '1.6', color: '#1d1d1f', marginBottom: '15px' }}>
            Für leicht fahrlässige Pflichtverletzungen haftet der Anbieter nur, soweit eine wesentliche Vertragspflicht (Kardinalpflicht) betroffen ist. In diesem Fall ist die Haftung auf den vertragstypischen, vorhersehbaren Schaden begrenzt. Eine Haftung für mittelbare Schäden, Folgeschäden oder entgangenen Gewinn ist ausgeschlossen.
          </p>
          <p style={{ fontSize: '16px', lineHeight: '1.6', color: '#1d1d1f', marginBottom: '15px' }}>
            Die Haftung nach dem Produkthaftungsgesetz bleibt unberührt.
          </p>
          <p style={{ fontSize: '16px', lineHeight: '1.6', color: '#1d1d1f', marginBottom: '15px' }}>
            <strong>8.4 Keine Gewährleistung für bestimmte Ergebnisse</strong><br/>
            Der Anbieter garantiert nicht, dass die Nutzung der Plattform zu bestimmten rechtlichen oder wirtschaftlichen Ergebnissen führt. Insbesondere wird nicht garantiert, dass Verträge nach Optimierung rechtssicher sind oder dass erkannte Risiken vollständig erfasst wurden.
          </p>
          <p style={{ fontSize: '16px', lineHeight: '1.6', color: '#1d1d1f', marginBottom: '15px' }}>
            <strong>8.5 Verfügbarkeit</strong><br/>
            Der Anbieter bemüht sich um eine hohe Verfügbarkeit der Plattform, übernimmt jedoch keine Garantie für eine ununterbrochene Erreichbarkeit. Wartungsarbeiten, technische Störungen oder höhere Gewalt können zu vorübergehenden Ausfällen führen.
          </p>
          <p style={{ fontSize: '16px', lineHeight: '1.6', color: '#1d1d1f', marginBottom: '15px' }}>
            <strong>8.6 Externe Links</strong><br/>
            Die Plattform kann Links zu externen Webseiten Dritter enthalten. Für die Inhalte externer Seiten übernimmt der Anbieter keine Verantwortung.
          </p>

          <h2 style={{ fontSize: '24px', fontWeight: '600', marginTop: '30px', marginBottom: '15px', color: '#1d1d1f' }}>
            9. Änderungen der AGB
          </h2>
          <p style={{ fontSize: '16px', lineHeight: '1.6', color: '#1d1d1f', marginBottom: '15px' }}>
            <strong>9.1 Änderungsrecht</strong><br/>
            Der Anbieter behält sich das Recht vor, diese AGB bei Vorliegen eines sachlichen Grundes (z. B. Änderungen der Rechtslage, neue Funktionen, Anpassungen an technische Entwicklungen) mit Wirkung für die Zukunft zu ändern.
          </p>
          <p style={{ fontSize: '16px', lineHeight: '1.6', color: '#1d1d1f', marginBottom: '15px' }}>
            <strong>9.2 Mitteilung und Widerspruchsrecht</strong><br/>
            Änderungen der AGB werden dem Nutzer mindestens 30 Tage vor Inkrafttreten per E-Mail mitgeteilt. Widerspricht der Nutzer der Geltung der neuen AGB nicht innerhalb von 30 Tagen nach Zugang der Mitteilung, gelten die geänderten AGB als akzeptiert. Der Nutzer wird in der Änderungsmitteilung auf sein Widerspruchsrecht und die Bedeutung der Widerspruchsfrist gesondert hingewiesen.
          </p>
          <p style={{ fontSize: '16px', lineHeight: '1.6', color: '#1d1d1f', marginBottom: '15px' }}>
            <strong>9.3 Widerspruch</strong><br/>
            Widerspricht der Nutzer der Geltung der neuen AGB, ist der Anbieter berechtigt, den Vertrag ordentlich zu kündigen.
          </p>

          <h2 style={{ fontSize: '24px', fontWeight: '600', marginTop: '30px', marginBottom: '15px', color: '#1d1d1f' }}>
            10. Streitbeilegung und Gerichtsstand
          </h2>
          <p style={{ fontSize: '16px', lineHeight: '1.6', color: '#1d1d1f', marginBottom: '15px' }}>
            <strong>10.1 Online-Streitbeilegung</strong><br/>
            Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit: https://ec.europa.eu/consumers/odr. Der Anbieter ist nicht verpflichtet und nicht bereit, an einem Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.
          </p>
          <p style={{ fontSize: '16px', lineHeight: '1.6', color: '#1d1d1f', marginBottom: '15px' }}>
            <strong>10.2 Anwendbares Recht</strong><br/>
            Für sämtliche Rechtsbeziehungen zwischen dem Anbieter und dem Nutzer gilt ausschließlich das Recht der Bundesrepublik Deutschland unter Ausschluss des UN-Kaufrechts. Bei Verbrauchern gilt diese Rechtswahl nur insoweit, als nicht der gewährte Schutz durch zwingende Bestimmungen des Rechts des Staates, in dem der Verbraucher seinen gewöhnlichen Aufenthalt hat, entzogen wird.
          </p>
          <p style={{ fontSize: '16px', lineHeight: '1.6', color: '#1d1d1f', marginBottom: '15px' }}>
            <strong>10.3 Gerichtsstand</strong><br/>
            Ist der Nutzer Kaufmann, juristische Person des öffentlichen Rechts oder öffentlich-rechtliches Sondervermögen, ist ausschließlicher Gerichtsstand für alle Streitigkeiten aus diesem Vertrag der Geschäftssitz des Anbieters. Dasselbe gilt, wenn der Nutzer keinen allgemeinen Gerichtsstand in Deutschland hat oder Wohnsitz oder gewöhnlicher Aufenthalt im Zeitpunkt der Klageerhebung nicht bekannt sind.
          </p>

          <h2 style={{ fontSize: '24px', fontWeight: '600', marginTop: '30px', marginBottom: '15px', color: '#1d1d1f' }}>
            11. Schlussbestimmungen
          </h2>
          <p style={{ fontSize: '16px', lineHeight: '1.6', color: '#1d1d1f', marginBottom: '15px' }}>
            <strong>11.1 Salvatorische Klausel</strong><br/>
            Sollten einzelne Bestimmungen dieser AGB unwirksam oder undurchführbar sein oder werden, bleibt die Wirksamkeit der übrigen Bestimmungen hiervon unberührt. Anstelle der unwirksamen oder undurchführbaren Bestimmung gilt diejenige wirksame Regelung als vereinbart, die dem wirtschaftlichen Zweck der unwirksamen Bestimmung am nächsten kommt.
          </p>
          <p style={{ fontSize: '16px', lineHeight: '1.6', color: '#1d1d1f', marginBottom: '15px' }}>
            <strong>11.2 Vertragssprache</strong><br/>
            Die Vertragssprache ist Deutsch.
          </p>
          <p style={{ fontSize: '16px', lineHeight: '1.6', color: '#1d1d1f', marginBottom: '15px' }}>
            <strong>11.3 Abtretung</strong><br/>
            Der Nutzer darf Rechte und Pflichten aus dem Vertragsverhältnis nur mit vorheriger schriftlicher Zustimmung des Anbieters an Dritte abtreten.
          </p>
          <p style={{ fontSize: '16px', lineHeight: '1.6', color: '#1d1d1f', marginBottom: '30px' }}>
            <strong>11.4 Schriftformerfordernis</strong><br/>
            Änderungen oder Ergänzungen dieser AGB sowie Nebenabreden bedürfen zu ihrer Wirksamkeit der Textform (z. B. E-Mail). Dies gilt auch für die Änderung dieser Schriftformklausel.
          </p>

          <p style={{ fontSize: '14px', color: '#86868b', marginTop: '40px', paddingTop: '20px', borderTop: '1px solid #e0e0e0' }}>
            Bei Fragen zu unseren AGB kontaktieren Sie uns bitte unter <a href="mailto:info@contract-ai.de" style={{ color: '#0066cc', textDecoration: 'none' }}>info@contract-ai.de</a>
          </p>
          <p style={{ fontSize: '14px', color: '#86868b', marginTop: '10px' }}>
            Letzte Aktualisierung: Oktober 2024
          </p>
        </div>
      </div>

      <Footer />
    </>
  );
}
