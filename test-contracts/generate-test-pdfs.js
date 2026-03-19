// Generate 8 test contracts as PDFs for Compare V2 cross-testing
// 2 per type: NDA, Freelancer, Mietvertrag, SaaS
// Each pair has deliberate differences for testing

const PDFDocument = require('../backend/node_modules/pdfkit');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = __dirname;

function createPDF(filename, title, sections) {
  return new Promise((resolve) => {
    const doc = new PDFDocument({ size: 'A4', margin: 60 });
    const stream = fs.createWriteStream(path.join(OUTPUT_DIR, filename));
    doc.pipe(stream);

    // Title
    doc.fontSize(18).font('Helvetica-Bold').text(title, { align: 'center' });
    doc.moveDown(1.5);

    for (const section of sections) {
      if (doc.y > 700) doc.addPage();

      if (section.heading) {
        doc.fontSize(12).font('Helvetica-Bold').text(section.heading);
        doc.moveDown(0.3);
      }
      if (section.text) {
        doc.fontSize(10).font('Helvetica').text(section.text, { lineGap: 3 });
        doc.moveDown(0.8);
      }
    }

    // Footer
    doc.moveDown(2);
    doc.fontSize(8).font('Helvetica').fillColor('#888')
       .text('Testvertrag generiert fuer Compare V2 Cross-Testing', { align: 'center' });

    doc.end();
    stream.on('finish', resolve);
  });
}

// ============================================
// NDA Pair
// ============================================

const NDA_A = {
  filename: 'NDA_Version_A_TechCorp.pdf',
  title: 'Geheimhaltungsvereinbarung (NDA)\nzwischen TechCorp GmbH und DataFlow AG',
  sections: [
    { heading: 'Praeambel', text: 'Die Parteien TechCorp GmbH, Muenchen (nachfolgend "Offenlegender") und DataFlow AG, Berlin (nachfolgend "Empfaenger") beabsichtigen, vertrauliche Informationen im Rahmen einer moeglichen Geschaeftsbeziehung auszutauschen. Diese Vereinbarung regelt den Umgang mit diesen Informationen.' },
    { heading: '§ 1 Definition vertraulicher Informationen', text: 'Vertrauliche Informationen im Sinne dieser Vereinbarung sind saemtliche Informationen technischer, geschaeftlicher oder finanzieller Natur, die vom Offenlegenden an den Empfaenger weitergegeben werden, unabhaengig davon, ob sie als "vertraulich" gekennzeichnet sind oder nicht. Dies umfasst insbesondere Geschaeftsgeheimnisse, Kundendaten, Finanzdaten, technische Zeichnungen, Software-Quellcode, Geschaeftsplaene und strategische Planungen.' },
    { heading: '§ 2 Geheimhaltungspflicht', text: 'Der Empfaenger verpflichtet sich, die vertraulichen Informationen streng geheim zu halten und nur fuer den vereinbarten Zweck zu verwenden. Die Weitergabe an Dritte ist ohne vorherige schriftliche Zustimmung des Offenlegenden untersagt. Der Empfaenger wird vertrauliche Informationen nur solchen Mitarbeitern zugaenglich machen, die diese fuer die Erfuellung des Vertragszwecks benoetigen.' },
    { heading: '§ 3 Ausnahmen', text: 'Die Geheimhaltungspflicht gilt nicht fuer Informationen, die (a) zum Zeitpunkt der Offenlegung bereits oeffentlich bekannt waren, (b) nach der Offenlegung ohne Verschulden des Empfaengers oeffentlich bekannt werden, (c) dem Empfaenger bereits vor der Offenlegung rechtmaessig bekannt waren, oder (d) dem Empfaenger von einem Dritten ohne Verletzung einer Geheimhaltungspflicht mitgeteilt werden.' },
    { heading: '§ 4 Geheimhaltungsdauer', text: 'Die Geheimhaltungspflicht gilt fuer die Dauer von 3 Jahren ab dem Datum der jeweiligen Offenlegung.' },
    { heading: '§ 5 Vertragsstrafe', text: 'Fuer jeden Fall der schuldhaften Verletzung dieser Vereinbarung zahlt der Empfaenger eine Vertragsstrafe in Hoehe von 25.000 EUR. Die Geltendmachung eines weitergehenden Schadensersatzanspruchs bleibt unberuehrt.' },
    { heading: '§ 6 Rueckgabe', text: 'Auf Verlangen des Offenlegenden oder bei Beendigung der Geschaeftsbeziehung hat der Empfaenger saemtliche vertrauliche Informationen einschliesslich aller Kopien zurueckzugeben oder nachweislich zu vernichten.' },
    { heading: '§ 7 Anwendbares Recht und Gerichtsstand', text: 'Diese Vereinbarung unterliegt deutschem Recht. Gerichtsstand fuer alle Streitigkeiten aus oder im Zusammenhang mit dieser Vereinbarung ist Muenchen.' },
    { heading: '§ 8 Laufzeit und Kuendigung', text: 'Diese Vereinbarung tritt mit Unterzeichnung in Kraft und laeuft auf unbestimmte Zeit. Sie kann von jeder Partei mit einer Frist von 3 Monaten zum Monatsende gekuendigt werden. Die Geheimhaltungspflicht gemaess § 4 besteht ueber die Beendigung hinaus fort.' },
    { heading: '§ 9 Schlussbestimmungen', text: 'Aenderungen und Ergaenzungen dieser Vereinbarung beduerfen der Schriftform. Sollte eine Bestimmung dieser Vereinbarung unwirksam sein, bleibt die Wirksamkeit der uebrigen Bestimmungen unberuehrt.' },
  ]
};

const NDA_B = {
  filename: 'NDA_Version_B_InnoSoft.pdf',
  title: 'Vertraulichkeitsvereinbarung (NDA)\nzwischen InnoSoft Solutions GmbH und CloudBase Systems AG',
  sections: [
    { heading: 'Praeambel', text: 'Die Parteien InnoSoft Solutions GmbH, Hamburg (nachfolgend "Offenlegender") und CloudBase Systems AG, Frankfurt (nachfolgend "Empfaenger") beabsichtigen, im Rahmen einer geplanten Kooperation vertrauliche Informationen auszutauschen.' },
    { heading: '§ 1 Definition vertraulicher Informationen', text: 'Vertrauliche Informationen sind ausschliesslich solche Informationen, die ausdruecklich schriftlich als "VERTRAULICH" gekennzeichnet sind. Muendlich uebermittelte Informationen gelten nur dann als vertraulich, wenn sie innerhalb von 14 Tagen nach der muendlichen Offenlegung schriftlich bestaetigt und als vertraulich gekennzeichnet werden.' },
    { heading: '§ 2 Geheimhaltungspflicht', text: 'Der Empfaenger verpflichtet sich, die vertraulichen Informationen mit der gleichen Sorgfalt zu behandeln, die er auf seine eigenen vertraulichen Informationen anwendet, mindestens jedoch mit angemessener Sorgfalt. Der Empfaenger darf vertrauliche Informationen an verbundene Unternehmen und externe Berater weitergeben, sofern diese einer gleichwertigen Geheimhaltungsverpflichtung unterliegen.' },
    { heading: '§ 3 Ausnahmen', text: 'Die Geheimhaltungspflicht gilt nicht fuer Informationen, die (a) oeffentlich bekannt sind, (b) vom Empfaenger unabhaengig entwickelt wurden, (c) dem Empfaenger von einem berechtigten Dritten ohne Vertraulichkeitsbeschraenkung uebermittelt werden, oder (d) aufgrund gesetzlicher Verpflichtung oder behoerdlicher Anordnung offengelegt werden muessen.' },
    { heading: '§ 4 Geheimhaltungsdauer', text: 'Die Geheimhaltungspflicht gilt fuer die Dauer von 5 Jahren ab dem Datum der jeweiligen Offenlegung. Fuer Geschaeftsgeheimnisse im Sinne des GeschGehG gilt die Geheimhaltungspflicht unbefristet.' },
    { heading: '§ 5 Haftung', text: 'Die Haftung fuer Verletzungen dieser Vereinbarung ist auf den unmittelbaren, vorhersehbaren Schaden begrenzt. Die Haftung ist auf maximal 100.000 EUR pro Verstoss begrenzt. Eine Vertragsstrafe wird nicht vereinbart.' },
    { heading: '§ 6 Rueckgabe und Loeschung', text: 'Bei Beendigung der Vereinbarung hat der Empfaenger saemtliche vertrauliche Informationen zu loeschen. Eine Rueckgabe physischer Unterlagen erfolgt nur auf ausdrueckliches Verlangen. Der Empfaenger bestaetigt die Loeschung schriftlich innerhalb von 30 Tagen.' },
    { heading: '§ 7 Anwendbares Recht und Gerichtsstand', text: 'Diese Vereinbarung unterliegt deutschem Recht unter Ausschluss des UN-Kaufrechts. Gerichtsstand ist Hamburg. Die Parteien verpflichten sich, vor Einleitung eines Gerichtsverfahrens ein Mediationsverfahren durchzufuehren.' },
    { heading: '§ 8 Laufzeit und Kuendigung', text: 'Diese Vereinbarung tritt mit Unterzeichnung in Kraft und hat eine feste Laufzeit von 24 Monaten. Sie verlaengert sich automatisch um jeweils 12 Monate, wenn sie nicht mit einer Frist von 6 Monaten zum Laufzeitende gekuendigt wird.' },
    { heading: '§ 9 Wettbewerbsverbot', text: 'Waehrend der Laufzeit dieser Vereinbarung und fuer einen Zeitraum von 12 Monaten nach deren Beendigung verpflichtet sich der Empfaenger, keine Produkte oder Dienstleistungen zu entwickeln oder anzubieten, die in direktem Wettbewerb zu den offengelegten vertraulichen Informationen stehen.' },
    { heading: '§ 10 Schlussbestimmungen', text: 'Aenderungen beduerfen der Schriftform. Nebenabreden bestehen nicht. Salvatorische Klausel: Bei Unwirksamkeit einzelner Bestimmungen bleibt der Rest wirksam.' },
  ]
};

// ============================================
// Freelancer Pair
// ============================================

const FREELANCER_A = {
  filename: 'Freelancer_Version_A_WebDev.pdf',
  title: 'Freier Dienstvertrag\nzwischen Digital Solutions GmbH und Max Mustermann',
  sections: [
    { heading: 'Praeambel', text: 'Zwischen Digital Solutions GmbH, Koeln (nachfolgend "Auftraggeber") und Max Mustermann, freier Softwareentwickler, Berlin (nachfolgend "Auftragnehmer") wird folgender Vertrag geschlossen.' },
    { heading: '§ 1 Vertragsgegenstand', text: 'Der Auftragnehmer erbringt fuer den Auftraggeber Softwareentwicklungsleistungen im Bereich Web-Frontend (React/TypeScript). Der genaue Leistungsumfang wird in Einzelauftraegen (Statements of Work) definiert, die als Anlagen Bestandteil dieses Vertrages werden.' },
    { heading: '§ 2 Verguetung', text: 'Der Auftragnehmer erhaelt eine Verguetung von 85 EUR pro Stunde zzgl. gesetzlicher Umsatzsteuer. Die Abrechnung erfolgt monatlich auf Basis tatsaechlich geleisteter Stunden. Rechnungen sind innerhalb von 30 Tagen nach Zugang zahlbar. Reisekosten werden nach vorheriger Genehmigung gesondert erstattet.' },
    { heading: '§ 3 Arbeitszeit und -ort', text: 'Der Auftragnehmer ist in der Gestaltung seiner Arbeitszeit und seines Arbeitsortes frei. Eine Anwesenheitspflicht in den Raeumen des Auftraggebers besteht nicht. Der Auftragnehmer ist verpflichtet, an wesentlichen Projektmeetings teilzunehmen (maximal 2 pro Woche).' },
    { heading: '§ 4 Nutzungsrechte', text: 'Der Auftragnehmer raeumt dem Auftraggeber an allen im Rahmen dieses Vertrages erstellten Werken ein ausschliessliches, zeitlich und raeumlich unbeschraenktes Nutzungsrecht ein. Dies umfasst das Recht zur Bearbeitung, Vervielfaeltigung und oeffentlichen Zugaenglichmachung. Die Uebertragung erfolgt mit vollstaendiger Bezahlung der jeweiligen Leistung.' },
    { heading: '§ 5 Haftung', text: 'Der Auftragnehmer haftet fuer Schaeden, die durch vorsaetzliches oder grob fahrlaessiges Handeln entstehen, unbeschraenkt. Bei einfacher Fahrlaessigkeit ist die Haftung auf den Auftragswert des jeweiligen Einzelauftrags begrenzt, maximal jedoch auf 50.000 EUR. Folgeschaeden und entgangener Gewinn sind ausgeschlossen.' },
    { heading: '§ 6 Geheimhaltung', text: 'Der Auftragnehmer verpflichtet sich, ueber alle ihm im Rahmen der Taetigkeit bekannt werdenden Geschaeftsgeheimnisse Stillschweigen zu bewahren. Diese Pflicht besteht auch nach Beendigung des Vertrages fuer die Dauer von 2 Jahren fort.' },
    { heading: '§ 7 Kuendigung', text: 'Dieser Vertrag kann von jeder Partei mit einer Frist von 4 Wochen zum Monatsende gekuendigt werden. Das Recht zur ausserordentlichen Kuendigung aus wichtigem Grund bleibt unberuehrt. Laufende Einzelauftraege sind bis zum vereinbarten Termin abzuschliessen oder in einem uebergabefaehigen Zustand zu dokumentieren.' },
    { heading: '§ 8 Wettbewerbsverbot', text: 'Ein Wettbewerbsverbot wird nicht vereinbart. Der Auftragnehmer ist berechtigt, auch fuer andere Auftraggeber taetig zu sein, sofern dies die Erfuellung seiner Pflichten aus diesem Vertrag nicht beeintraechtigt.' },
    { heading: '§ 9 Gewaehrleistung', text: 'Der Auftragnehmer gewaehrleistet, dass die erbrachten Leistungen dem Stand der Technik entsprechen und frei von Maengeln sind. Die Gewaehrleistungsfrist betraegt 12 Monate ab Abnahme der jeweiligen Leistung.' },
    { heading: '§ 10 Anwendbares Recht', text: 'Es gilt deutsches Recht. Gerichtsstand ist Koeln.' },
  ]
};

const FREELANCER_B = {
  filename: 'Freelancer_Version_B_Design.pdf',
  title: 'Rahmenvertrag fuer freie Mitarbeit\nzwischen Creative Agency GmbH und Lisa Schmidt',
  sections: [
    { heading: 'Praeambel', text: 'Zwischen Creative Agency GmbH, Stuttgart (nachfolgend "Auftraggeber") und Lisa Schmidt, freie UX-Designerin, Muenchen (nachfolgend "Auftragnehmerin") wird folgender Rahmenvertrag geschlossen.' },
    { heading: '§ 1 Vertragsgegenstand', text: 'Die Auftragnehmerin erbringt UX/UI-Design-Leistungen fuer den Auftraggeber. Der Leistungsumfang umfasst Wireframing, Prototyping, User Research und Visual Design. Einzelne Projekte werden durch separate Leistungsbeschreibungen beauftragt.' },
    { heading: '§ 2 Verguetung', text: 'Die Auftragnehmerin erhaelt ein Pauschalhonorar pro Projekt gemaess der jeweiligen Leistungsbeschreibung. Bei Projektverguetung gilt ein kalkulatorischer Stundensatz von 95 EUR zzgl. USt. als Basis. Rechnungen sind innerhalb von 14 Tagen zahlbar. Bei Zahlungsverzug fallen Verzugszinsen in Hoehe von 9 Prozentpunkten ueber dem Basiszinssatz an. Reisekosten bis 200 EUR pro Monat sind in der Verguetung enthalten.' },
    { heading: '§ 3 Arbeitszeit und -ort', text: 'Die Auftragnehmerin arbeitet grundsaetzlich remote. Fuer Workshops und Praesentationen wird eine Anwesenheit in Stuttgart erwartet (maximal 4 Tage pro Monat). Die Auftragnehmerin stellt ihre eigene Arbeitsausstattung (Hardware, Software).' },
    { heading: '§ 4 Nutzungsrechte', text: 'Die Auftragnehmerin raeumt dem Auftraggeber ein einfaches, zeitlich unbeschraenktes Nutzungsrecht an allen Arbeitsergebnissen ein. Fuer eine ausschliessliche Nutzung oder die Weitergabe an Dritte ist eine gesonderte Vereinbarung und Verguetung erforderlich. Die Auftragnehmerin darf Arbeitsergebnisse in anonymisierter Form fuer ihr Portfolio verwenden.' },
    { heading: '§ 5 Haftung', text: 'Die Haftung der Auftragnehmerin ist auf Vorsatz und grobe Fahrlaessigkeit beschraenkt. Bei grober Fahrlaessigkeit ist die Haftung auf das Nettohonorar des betroffenen Projekts begrenzt, maximal 25.000 EUR. Eine Haftung fuer mittelbare Schaeden, Folgeschaeden oder entgangenen Gewinn ist ausgeschlossen.' },
    { heading: '§ 6 Geheimhaltung', text: 'Die Auftragnehmerin verpflichtet sich zur Geheimhaltung aller vertraulichen Informationen. Diese Pflicht gilt unbefristet ueber das Vertragsende hinaus. Bei Verstoss gegen die Geheimhaltungspflicht ist eine Vertragsstrafe von 10.000 EUR je Verstoss faellig.' },
    { heading: '§ 7 Kuendigung', text: 'Dieser Rahmenvertrag hat eine Mindestlaufzeit von 6 Monaten. Danach kann er von jeder Partei mit einer Frist von 3 Monaten zum Quartalsende gekuendigt werden. Laufende Projekte werden bei Kuendigung zu den vereinbarten Konditionen abgeschlossen. Bei vorzeitiger Beendigung eines Projekts durch den Auftraggeber sind 75% der vereinbarten Restverguetung faellig.' },
    { heading: '§ 8 Wettbewerbsverbot', text: 'Die Auftragnehmerin verpflichtet sich, waehrend der Vertragslaufzeit nicht fuer direkte Wettbewerber des Auftraggebers taetig zu werden. Als direkte Wettbewerber gelten Unternehmen, die in der gleichen Branche (Werbeagenturen) mit vergleichbaren Dienstleistungen aktiv sind. Nach Vertragsende entfaellt das Wettbewerbsverbot.' },
    { heading: '§ 9 Gewaehrleistung', text: 'Die Auftragnehmerin gewaehrleistet die fachgerechte Ausfuehrung der Leistungen. Maengelansprueche verjahren 6 Monate nach Abnahme. Der Auftraggeber hat Maengel innerhalb von 14 Tagen nach Entdeckung schriftlich zu ruegen.' },
    { heading: '§ 10 Anwendbares Recht', text: 'Es gilt deutsches Recht. Gerichtsstand ist Stuttgart. Vor Einleitung eines Gerichtsverfahrens ist ein Schlichtungsversuch bei der IHK Stuttgart durchzufuehren.' },
  ]
};

// ============================================
// Mietvertrag Pair
// ============================================

const MIET_A = {
  filename: 'Mietvertrag_Version_A_Wohnung.pdf',
  title: 'Wohnraummietvertrag\nObjekt: Musterstrasse 15, 80333 Muenchen, 3. OG links',
  sections: [
    { heading: '§ 1 Mietparteien', text: 'Vermieter: Immobilien Schmitt GmbH, Muenchen. Mieter: Anna Bauer und Thomas Bauer, gemeinsam als Gesamtschuldner.' },
    { heading: '§ 2 Mietgegenstand', text: '3-Zimmer-Wohnung, ca. 78 m2 Wohnflaeche, bestehend aus 3 Zimmern, Kueche, Bad, Flur, Balkon sowie Kellerabteil Nr. 12. Ein PKW-Stellplatz in der Tiefgarage (Nr. 45) ist im Mietpreis enthalten.' },
    { heading: '§ 3 Mietdauer', text: 'Das Mietverhaeltnis beginnt am 01.04.2026 und wird auf unbestimmte Zeit geschlossen.' },
    { heading: '§ 4 Miete und Nebenkosten', text: 'Die monatliche Kaltmiete betraegt 1.450,00 EUR. Die monatliche Nebenkostenvorauszahlung betraegt 280,00 EUR. Die Gesamtmiete betraegt somit 1.730,00 EUR monatlich. Die Miete ist bis zum 3. Werktag eines jeden Monats im Voraus zu zahlen. In den Nebenkosten enthalten sind: Heizung, Wasser, Abwasser, Muellabfuhr, Strassenreinigung, Hausmeister, Aufzug, Allgemeinstrom, Gebaeudeversicherung.' },
    { heading: '§ 5 Mietanpassung', text: 'Der Vermieter kann die Miete nach den gesetzlichen Vorschriften (§§ 558 ff. BGB) auf die ortsuebliche Vergleichsmiete erhoehen. Eine Mietanpassung ist fruehestens 15 Monate nach Mietbeginn oder nach der letzten Mieterhoehung moeglich. Die Kappungsgrenze betraegt 15% innerhalb von 3 Jahren.' },
    { heading: '§ 6 Kaution', text: 'Der Mieter zahlt eine Mietkaution in Hoehe von 3 Monatskaltmieten (4.350,00 EUR). Die Kaution kann in drei gleichen monatlichen Raten gezahlt werden. Die erste Rate ist bei Mietbeginn faellig. Der Vermieter legt die Kaution auf einem separaten Kautionskonto an.' },
    { heading: '§ 7 Instandhaltung', text: 'Schoenheitsreparaturen gehen zu Lasten des Mieters. Kleine Instandhaltungen (bis 120 EUR pro Einzelfall, max. 350 EUR jaehrlich) traegt der Mieter. Der Vermieter ist fuer die Instandhaltung der Gebaedesubstanz, der Heizungsanlage und der Sanitaeranlagen verantwortlich.' },
    { heading: '§ 8 Kuendigung', text: 'Das Mietverhaeltnis kann vom Mieter mit einer Frist von 3 Monaten zum Monatsende gekuendigt werden. Fuer den Vermieter gelten die gesetzlichen Kuendigungsfristen (3-9 Monate je nach Mietdauer). Die Kuendigung bedarf der Schriftform.' },
    { heading: '§ 9 Tierhaltung', text: 'Die Haltung von Kleintieren (Fische, Hamster, Voegel) ist ohne Genehmigung gestattet. Die Haltung von Hunden und Katzen bedarf der vorherigen schriftlichen Zustimmung des Vermieters. Der Vermieter darf die Zustimmung nur aus wichtigem Grund verweigern.' },
    { heading: '§ 10 Untervermietung', text: 'Die Untervermietung der Wohnung oder einzelner Raeume bedarf der vorherigen schriftlichen Genehmigung des Vermieters. Bei berechtigtem Interesse des Mieters darf der Vermieter die Genehmigung nicht verweigern.' },
    { heading: '§ 11 Anwendbares Recht', text: 'Es gilt deutsches Mietrecht. Gerichtsstand ist Muenchen.' },
  ]
};

const MIET_B = {
  filename: 'Mietvertrag_Version_B_Wohnung.pdf',
  title: 'Mietvertrag ueber Wohnraum\nObjekt: Bergstrasse 42, 80639 Muenchen, 2. OG rechts',
  sections: [
    { heading: '§ 1 Mietparteien', text: 'Vermieter: Dr. Klaus Weber, privat. Mieter: Sarah Mueller.' },
    { heading: '§ 2 Mietgegenstand', text: '2-Zimmer-Wohnung, ca. 55 m2 Wohnflaeche, bestehend aus 2 Zimmern, Kueche, Bad, Flur. Kein Kellerabteil. Kein Stellplatz.' },
    { heading: '§ 3 Mietdauer', text: 'Das Mietverhaeltnis beginnt am 01.04.2026 und ist auf 2 Jahre befristet (bis 31.03.2028). Der Befristungsgrund ist Eigenbedarf (§ 575 BGB). Nach Ablauf der Befristung endet das Mietverhaeltnis automatisch ohne Kuendigung.' },
    { heading: '§ 4 Miete und Nebenkosten', text: 'Die monatliche Kaltmiete betraegt 950,00 EUR. Die monatliche Nebenkostenpauschale betraegt 180,00 EUR (keine Nachberechnung). Die Gesamtmiete betraegt somit 1.130,00 EUR monatlich. Die Miete ist bis zum 1. Werktag eines jeden Monats im Voraus zu zahlen. Die Nebenkostenpauschale umfasst: Wasser, Abwasser, Muellabfuhr, Strassenreinigung, Allgemeinstrom, Gebaeudeversicherung. NICHT enthalten: Heizung (eigene Gastherme, Mieter traegt Gaskosten direkt).' },
    { heading: '§ 5 Mietanpassung', text: 'Waehrend der befristeten Mietdauer ist eine Mieterhoehung ausgeschlossen. Es wird keine Staffel- oder Indexmiete vereinbart.' },
    { heading: '§ 6 Kaution', text: 'Der Mieter zahlt eine Mietkaution in Hoehe von 2 Monatskaltmieten (1.900,00 EUR). Die Kaution ist vollstaendig bei Mietbeginn zu zahlen. Eine Ratenzahlung ist nicht vorgesehen. Der Vermieter darf die Kaution mit seinen privaten Mitteln anlegen.' },
    { heading: '§ 7 Instandhaltung', text: 'Schoenheitsreparaturen gehen zu Lasten des Vermieters. Der Mieter hat Beschaedigungen, die ueber die normale Abnutzung hinausgehen, zu beseitigen. Eine Kleinreparaturklausel wird nicht vereinbart. Der Vermieter uebernimmt die vollstaendige Instandhaltung einschliesslich der Gastherme.' },
    { heading: '§ 8 Kuendigung', text: 'Das Mietverhaeltnis ist befristet und endet automatisch. Eine ordentliche Kuendigung ist waehrend der Befristung ausgeschlossen. Das Recht zur ausserordentlichen Kuendigung aus wichtigem Grund bleibt fuer beide Parteien unberuehrt.' },
    { heading: '§ 9 Tierhaltung', text: 'Die Haltung von Haustieren jeglicher Art ist nicht gestattet. Ausnahme: Kleintiere in artgerechter Haltung (Fische bis 60l Aquarium).' },
    { heading: '§ 10 Untervermietung', text: 'Die Untervermietung ist vollstaendig untersagt, auch die teilweise Untervermietung einzelner Raeume. Bei Verstoss ist der Vermieter zur fristlosen Kuendigung berechtigt.' },
    { heading: '§ 11 Anwendbares Recht', text: 'Es gilt deutsches Mietrecht. Gerichtsstand ist Muenchen.' },
  ]
};

// ============================================
// SaaS Pair
// ============================================

const SAAS_A = {
  filename: 'SaaS_Version_A_CloudPlatform.pdf',
  title: 'Software-as-a-Service Vertrag\nCloudPlatform Enterprise Plan',
  sections: [
    { heading: 'Vertragsparteien', text: 'Anbieter: CloudPlatform GmbH, Berlin. Kunde: Mittelstand Solutions AG, Frankfurt.' },
    { heading: '§ 1 Vertragsgegenstand', text: 'CloudPlatform stellt dem Kunden die cloudbasierte Projektmanagement-Software "CloudPlatform Enterprise" als Software-as-a-Service (SaaS) zur Verfuegung. Der Leistungsumfang umfasst: Projektmanagement, Zeiterfassung, Ressourcenplanung, Reporting-Dashboard, API-Zugang, Single Sign-On (SSO). Lizenz fuer bis zu 100 Benutzer.' },
    { heading: '§ 2 Verfuegbarkeit (SLA)', text: 'CloudPlatform garantiert eine Verfuegbarkeit von 99,5% pro Kalendermonat (gemessen exkl. geplanter Wartungsfenster). Geplante Wartungen finden samstags zwischen 02:00 und 06:00 Uhr statt und werden mindestens 5 Werktage vorher angekuendigt. Bei Unterschreitung der Verfuegbarkeit erhaelt der Kunde eine Gutschrift: unter 99,5%: 5% der Monatsgebuehr, unter 99,0%: 10%, unter 98,0%: 25%.' },
    { heading: '§ 3 Verguetung', text: 'Die monatliche Lizenzgebuehr betraegt 2.500 EUR netto fuer 100 Benutzerlizenzen (25 EUR pro Benutzer/Monat). Die Abrechnung erfolgt jaehrlich im Voraus. Bei Ueberschreitung der Benutzerzahl werden zusaetzliche Lizenzen zu 30 EUR pro Benutzer/Monat berechnet. Preisanpassungen sind mit 3 Monaten Vorlauf zum Vertragsjahrgang moeglich, maximal 5% pro Jahr.' },
    { heading: '§ 4 Datenschutz und Datensicherheit', text: 'CloudPlatform verarbeitet personenbezogene Daten ausschliesslich im Auftrag des Kunden (Auftragsverarbeitung gemaess Art. 28 DSGVO). Die Daten werden ausschliesslich in Rechenzentren in Deutschland (Frankfurt) gespeichert. CloudPlatform ist nach ISO 27001 zertifiziert. Eine Datenverarbeitung in Drittlaendern findet nicht statt.' },
    { heading: '§ 5 Haftung', text: 'Die Haftung von CloudPlatform ist bei einfacher Fahrlaessigkeit auf die jaehrliche Verguetungssumme begrenzt (30.000 EUR). Bei Vorsatz und grober Fahrlaessigkeit haftet CloudPlatform unbeschraenkt. Die Haftung fuer Datenverlust ist auf die Kosten der Wiederherstellung aus dem letzten Backup begrenzt. CloudPlatform erstellt taegliche Backups mit einer Aufbewahrung von 30 Tagen.' },
    { heading: '§ 6 Laufzeit und Kuendigung', text: 'Der Vertrag hat eine Mindestlaufzeit von 12 Monaten. Er verlaengert sich automatisch um jeweils 12 Monate, wenn er nicht mit einer Frist von 3 Monaten zum Laufzeitende gekuendigt wird. Nach der Mindestlaufzeit ist eine Kuendigung mit 1 Monat Frist zum Monatsende moeglich.' },
    { heading: '§ 7 Datenmigration bei Vertragsende', text: 'Bei Vertragsende stellt CloudPlatform dem Kunden saemtliche Daten in einem maschinenlesbaren Format (JSON/CSV) zum Download bereit. Die Daten stehen nach Vertragsende noch 90 Tage zum Download zur Verfuegung. Danach werden alle Kundendaten unwiderruflich geloescht.' },
    { heading: '§ 8 Support', text: 'Im Enterprise Plan enthalten: E-Mail-Support (Reaktionszeit: 4 Stunden waehrend der Geschaeftszeiten), Telefon-Support (Mo-Fr 9-18 Uhr), dedizierter Account Manager, quartalsmaessige Business Reviews.' },
    { heading: '§ 9 Gerichtsstand', text: 'Es gilt deutsches Recht. Gerichtsstand ist Berlin.' },
  ]
};

const SAAS_B = {
  filename: 'SaaS_Version_B_WorkFlow.pdf',
  title: 'Nutzungsvertrag SaaS-Loesung\nWorkFlow Pro Business',
  sections: [
    { heading: 'Vertragsparteien', text: 'Anbieter: WorkFlow Pro Inc., Niederlassung Muenchen. Kunde: Handel & Logistik GmbH, Duesseldorf.' },
    { heading: '§ 1 Vertragsgegenstand', text: 'WorkFlow Pro stellt dem Kunden die Workflow-Management-Software "WorkFlow Pro Business" als Cloud-Dienst bereit. Der Leistungsumfang umfasst: Workflow-Automatisierung, Dokumentenmanagement, Genehmigungsprozesse. Kein API-Zugang im Business-Plan. Lizenz fuer bis zu 50 Benutzer.' },
    { heading: '§ 2 Verfuegbarkeit (SLA)', text: 'WorkFlow Pro strebt eine Verfuegbarkeit von 99,0% pro Kalendermonat an. Dies ist ein Zielwert, keine Garantie. Wartungsfenster koennen jederzeit mit 24 Stunden Vorankuendigung durchgefuehrt werden. Eine SLA-Gutschrift ist nicht vorgesehen.' },
    { heading: '§ 3 Verguetung', text: 'Die monatliche Nutzungsgebuehr betraegt 1.750 EUR netto fuer 50 Benutzerlizenzen (35 EUR pro Benutzer/Monat). Die Abrechnung erfolgt monatlich. Zusaetzliche Benutzer kosten 40 EUR pro Benutzer/Monat. Preisanpassungen sind jederzeit mit 30 Tagen Vorlauf moeglich, ohne Begrenzung der Hoehe.' },
    { heading: '§ 4 Datenschutz und Datensicherheit', text: 'WorkFlow Pro verarbeitet Daten gemaess den geltenden Datenschutzbestimmungen. Die primaere Datenhaltung erfolgt in der EU (Irland). WorkFlow Pro behaelt sich vor, Daten zur Leistungsoptimierung auch in Rechenzentren in den USA zu verarbeiten (unter Einhaltung der EU-Standard-Vertragsklauseln). Eine ISO-Zertifizierung liegt nicht vor; WorkFlow Pro unterzieht sich jaehrlichen SOC-2-Pruefungen.' },
    { heading: '§ 5 Haftung', text: 'Die Gesamthaftung von WorkFlow Pro ist auf 3 Monatsgebuehren begrenzt (5.250 EUR). Diese Begrenzung gilt fuer alle Anspruchsgruende. WorkFlow Pro haftet nicht fuer Datenverlust. Der Kunde ist selbst fuer die Sicherung seiner Daten verantwortlich. WorkFlow Pro empfiehlt den regelmaessigen Export wichtiger Daten.' },
    { heading: '§ 6 Laufzeit und Kuendigung', text: 'Der Vertrag hat eine Mindestlaufzeit von 24 Monaten. Er verlaengert sich automatisch um jeweils 24 Monate. Kuendigung ist nur mit einer Frist von 6 Monaten zum Laufzeitende moeglich.' },
    { heading: '§ 7 Datenmigration bei Vertragsende', text: 'Bei Vertragsende kann der Kunde seine Daten als PDF-Export herunterladen. Maschinenlesbare Formate (API/CSV) sind nur im Enterprise-Plan verfuegbar. Die Daten werden 30 Tage nach Vertragsende geloescht.' },
    { heading: '§ 8 Support', text: 'Im Business Plan enthalten: E-Mail-Support (Reaktionszeit: 24 Stunden waehrend der Geschaeftszeiten). Kein Telefon-Support. Kein dedizierter Ansprechpartner. Community-Forum verfuegbar.' },
    { heading: '§ 9 Aenderungsvorbehalt', text: 'WorkFlow Pro behaelt sich vor, Funktionen der Software jederzeit zu aendern, zu erweitern oder einzuschraenken. Der Kunde wird ueber wesentliche Aenderungen mit 14 Tagen Vorlauf informiert. Bei wesentlichen Funktionseinschraenkungen hat der Kunde ein Sonderkuendigungsrecht mit 30 Tagen Frist.' },
    { heading: '§ 10 Gerichtsstand', text: 'Es gilt deutsches Recht. Gerichtsstand ist Muenchen. WorkFlow Pro behaelt sich vor, Streitigkeiten auch vor dem zustaendigen Gericht am Sitz des Kunden geltend zu machen.' },
  ]
};

// ============================================
// Generate all PDFs
// ============================================

async function main() {
  const contracts = [NDA_A, NDA_B, FREELANCER_A, FREELANCER_B, MIET_A, MIET_B, SAAS_A, SAAS_B];

  for (const contract of contracts) {
    await createPDF(contract.filename, contract.title, contract.sections);
    console.log(`Created: ${contract.filename}`);
  }

  console.log('\n8 test contracts generated successfully!');
  console.log(`Location: ${OUTPUT_DIR}`);
}

main().catch(console.error);
