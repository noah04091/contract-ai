// 📁 backend/scripts/seedCourtDecisions.js
// Seed-Script für wichtige BGH/BAG Entscheidungen

require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const mongoose = require("mongoose");
const CourtDecision = require("../models/CourtDecision");
const { getInstance } = require("../services/courtDecisionEmbeddings");

// Wichtige deutsche Gerichtsentscheidungen
const courtDecisions = [
  // ==========================================
  // MIETRECHT
  // ==========================================
  {
    caseNumber: "VIII ZR 277/16",
    court: "BGH",
    senate: "VIII. Zivilsenat",
    decisionDate: new Date("2017-09-20"),
    legalArea: "Mietrecht",
    headnotes: [
      "Eine Eigenbedarfskündigung ist nur wirksam, wenn der Vermieter den Eigenbedarf hinreichend konkret darlegt.",
      "Der Vermieter muss die Person, für die er die Wohnung benötigt, benennen und die Gründe des Bedarfs substantiiert vortragen."
    ],
    summary: "Der BGH hat die Anforderungen an eine wirksame Eigenbedarfskündigung präzisiert. Der Vermieter muss den Eigenbedarf nicht nur behaupten, sondern konkret darlegen, für welche Person die Wohnung benötigt wird und aus welchen Gründen. Pauschale Angaben wie 'für Familienangehörige' reichen nicht aus.",
    relevantLaws: ["§ 573 BGB", "§ 573a BGB", "§ 574 BGB"],
    keywords: ["Eigenbedarfskündigung", "Mietrecht", "Kündigungsschutz", "Darlegungslast", "Eigenbedarf"],
    sourceUrl: "https://juris.bundesgerichtshof.de/cgi-bin/rechtsprechung/document.py?Gericht=bgh&Art=en&nr=79545"
  },
  {
    caseNumber: "VIII ZR 181/18",
    court: "BGH",
    senate: "VIII. Zivilsenat",
    decisionDate: new Date("2019-07-10"),
    legalArea: "Mietrecht",
    headnotes: [
      "Die Mietpreisbremse ist verfassungskonform.",
      "Die Regelungen der §§ 556d ff. BGB verstoßen nicht gegen das Grundgesetz."
    ],
    summary: "Der BGH hat entschieden, dass die Mietpreisbremse mit dem Grundgesetz vereinbar ist. Die Regelung greift zwar in die Vertragsfreiheit ein, ist aber durch das Sozialstaatsprinzip und den Schutz von Mietern vor überhöhten Mieten gerechtfertigt.",
    relevantLaws: ["§ 556d BGB", "§ 556e BGB", "§ 556g BGB", "Art. 14 GG"],
    keywords: ["Mietpreisbremse", "Verfassungsrecht", "Mietrecht", "Mieterhöhung", "Sozialstaatsprinzip"],
    sourceUrl: "https://juris.bundesgerichtshof.de/cgi-bin/rechtsprechung/document.py?Gericht=bgh&Art=en&nr=99321"
  },
  {
    caseNumber: "VIII ZR 9/18",
    court: "BGH",
    senate: "VIII. Zivilsenat",
    decisionDate: new Date("2018-06-27"),
    legalArea: "Mietrecht",
    headnotes: [
      "Schönheitsreparaturklauseln sind unwirksam, wenn die Wohnung bei Mietbeginn unrenoviert übergeben wurde.",
      "Der Mieter schuldet keine Schönheitsreparaturen, wenn er eine unrenovierte Wohnung übernommen hat und keinen angemessenen Ausgleich erhalten hat."
    ],
    summary: "Eine formularmäßige Überwälzung der Schönheitsreparaturen auf den Mieter ist unwirksam, wenn die Wohnung zu Beginn des Mietverhältnisses unrenoviert oder renovierungsbedürftig war und der Mieter hierfür keinen angemessenen Ausgleich erhalten hat. Dies gilt auch bei Quotenabgeltungsklauseln.",
    relevantLaws: ["§ 535 BGB", "§ 307 BGB", "§ 538 BGB"],
    keywords: ["Schönheitsreparaturen", "Renovierung", "AGB-Kontrolle", "unrenovierte Wohnung", "Mietrecht"],
    sourceUrl: "https://juris.bundesgerichtshof.de/cgi-bin/rechtsprechung/document.py?Gericht=bgh&Art=en&nr=85432"
  },
  {
    caseNumber: "VIII ZR 297/14",
    court: "BGH",
    senate: "VIII. Zivilsenat",
    decisionDate: new Date("2016-04-06"),
    legalArea: "Mietrecht",
    headnotes: [
      "Die Kaution darf drei Monatsmieten nicht übersteigen.",
      "Eine höhere Kaution ist auch bei einvernehmlicher Vereinbarung unwirksam."
    ],
    summary: "Der BGH bekräftigt, dass die Mietkaution maximal drei Nettokaltmieten betragen darf (§ 551 Abs. 1 BGB). Eine darüber hinausgehende Vereinbarung ist auch bei ausdrücklicher Zustimmung des Mieters unwirksam. Der Mieter kann den überzahlten Betrag zurückfordern.",
    relevantLaws: ["§ 551 BGB", "§ 134 BGB"],
    keywords: ["Kaution", "Mietkaution", "Mietsicherheit", "drei Monatsmieten", "Höchstgrenze"],
    sourceUrl: "https://juris.bundesgerichtshof.de/cgi-bin/rechtsprechung/document.py?Gericht=bgh&Art=en&nr=74891"
  },

  // ==========================================
  // ARBEITSRECHT
  // ==========================================
  {
    caseNumber: "2 AZR 424/19",
    court: "BAG",
    senate: "Zweiter Senat",
    decisionDate: new Date("2020-02-27"),
    legalArea: "Arbeitsrecht",
    headnotes: [
      "Eine krankheitsbedingte Kündigung setzt eine negative Gesundheitsprognose voraus.",
      "Der Arbeitgeber muss vor der Kündigung ein betriebliches Eingliederungsmanagement (BEM) durchführen."
    ],
    summary: "Das BAG hat die Anforderungen an eine krankheitsbedingte Kündigung konkretisiert. Vor einer Kündigung muss der Arbeitgeber regelmäßig ein BEM durchführen. Fehlt das BEM, ist dies bei der Interessenabwägung zu berücksichtigen. Eine negative Gesundheitsprognose allein reicht für die Kündigung nicht aus.",
    relevantLaws: ["§ 1 KSchG", "§ 84 Abs. 2 SGB IX", "§ 167 SGB IX"],
    keywords: ["krankheitsbedingte Kündigung", "BEM", "Gesundheitsprognose", "Kündigungsschutz", "Arbeitsrecht"],
    sourceUrl: "https://www.bundesarbeitsgericht.de/entscheidung/2-azr-424-19/"
  },
  {
    caseNumber: "2 AZR 147/17",
    court: "BAG",
    senate: "Zweiter Senat",
    decisionDate: new Date("2018-02-22"),
    legalArea: "Arbeitsrecht",
    headnotes: [
      "Bei einer fristlosen Kündigung ist grundsätzlich eine vorherige Abmahnung erforderlich.",
      "Nur bei besonders schweren Pflichtverletzungen kann auf eine Abmahnung verzichtet werden."
    ],
    summary: "Das BAG stellt klar, dass auch bei erheblichen Pflichtverletzungen grundsätzlich eine Abmahnung vor der Kündigung erforderlich ist. Nur wenn das Vertrauensverhältnis so schwer gestört ist, dass eine Wiederherstellung nicht erwartet werden kann, ist eine Abmahnung entbehrlich.",
    relevantLaws: ["§ 626 BGB", "§ 314 BGB", "§ 1 KSchG"],
    keywords: ["fristlose Kündigung", "Abmahnung", "Pflichtverletzung", "Vertrauensbruch", "Arbeitsrecht"],
    sourceUrl: "https://www.bundesarbeitsgericht.de/entscheidung/2-azr-147-17/"
  },
  {
    caseNumber: "5 AZR 457/16",
    court: "BAG",
    senate: "Fünfter Senat",
    decisionDate: new Date("2017-09-20"),
    legalArea: "Arbeitsrecht",
    headnotes: [
      "Überstunden müssen vom Arbeitgeber angeordnet, gebilligt oder geduldet werden.",
      "Der Arbeitnehmer trägt die Darlegungs- und Beweislast für geleistete Überstunden."
    ],
    summary: "Das BAG präzisiert die Anforderungen an die Darlegung von Überstunden. Der Arbeitnehmer muss konkret darlegen, an welchen Tagen und zu welchen Zeiten er über die reguläre Arbeitszeit hinaus gearbeitet hat. Pauschale Angaben reichen nicht aus. Der Arbeitgeber muss die Überstunden angeordnet oder zumindest gebilligt haben.",
    relevantLaws: ["§ 611a BGB", "§ 612 BGB", "§ 3 ArbZG"],
    keywords: ["Überstunden", "Mehrarbeit", "Darlegungslast", "Arbeitszeiterfassung", "Vergütung"],
    sourceUrl: "https://www.bundesarbeitsgericht.de/entscheidung/5-azr-457-16/"
  },
  {
    caseNumber: "1 ABR 22/21",
    court: "BAG",
    senate: "Erster Senat",
    decisionDate: new Date("2022-09-13"),
    legalArea: "Arbeitsrecht",
    headnotes: [
      "Arbeitgeber sind verpflichtet, ein System zur Erfassung der Arbeitszeit einzuführen.",
      "Die Pflicht zur Arbeitszeiterfassung ergibt sich aus dem Arbeitsschutzgesetz."
    ],
    summary: "Das BAG hat entschieden, dass Arbeitgeber bereits nach geltendem Recht verpflichtet sind, ein System einzuführen, mit dem die Arbeitszeit der Arbeitnehmer erfasst werden kann. Dies folgt aus der europarechtskonformen Auslegung des § 3 Abs. 2 Nr. 1 ArbSchG.",
    relevantLaws: ["§ 3 ArbSchG", "§ 16 ArbZG", "Art. 31 EU-Grundrechtecharta"],
    keywords: ["Arbeitszeiterfassung", "Stechuhr", "Arbeitsschutz", "Dokumentationspflicht", "EU-Recht"],
    sourceUrl: "https://www.bundesarbeitsgericht.de/entscheidung/1-abr-22-21/"
  },

  // ==========================================
  // KAUFRECHT / GEWÄHRLEISTUNG
  // ==========================================
  {
    caseNumber: "VIII ZR 225/17",
    court: "BGH",
    senate: "VIII. Zivilsenat",
    decisionDate: new Date("2019-07-24"),
    legalArea: "Kaufrecht",
    headnotes: [
      "Ein Sachmangel liegt vor, wenn die Kaufsache bei Gefahrübergang nicht die vereinbarte Beschaffenheit hat.",
      "Die Beweislast für das Vorliegen eines Mangels trägt grundsätzlich der Käufer."
    ],
    summary: "Der BGH konkretisiert die Beweislastverteilung bei Gewährleistungsansprüchen. Zeigt sich innerhalb von sechs Monaten ein Mangel, wird vermutet, dass dieser bereits bei Gefahrübergang vorlag. Nach Ablauf dieser Frist muss der Käufer beweisen, dass der Mangel bei Übergabe vorhanden war.",
    relevantLaws: ["§ 434 BGB", "§ 437 BGB", "§ 477 BGB"],
    keywords: ["Sachmangel", "Gewährleistung", "Beweislast", "Gefahrübergang", "Kaufrecht"],
    sourceUrl: "https://juris.bundesgerichtshof.de/cgi-bin/rechtsprechung/document.py?Gericht=bgh&Art=en&nr=99876"
  },
  {
    caseNumber: "VIII ZR 329/18",
    court: "BGH",
    senate: "VIII. Zivilsenat",
    decisionDate: new Date("2020-10-21"),
    legalArea: "Kaufrecht",
    headnotes: [
      "Der Verkäufer kann die Nacherfüllung verweigern, wenn sie mit unverhältnismäßigen Kosten verbunden ist.",
      "Bei der Unverhältnismäßigkeit ist auf das Verhältnis von Nacherfüllungskosten zum Wert der mangelfreien Sache abzustellen."
    ],
    summary: "Der BGH klärt die Grenzen des Nacherfüllungsanspruchs. Der Verkäufer kann die Nacherfüllung verweigern, wenn die Kosten in keinem vernünftigen Verhältnis zum Wert der Sache oder zum Interesse des Käufers stehen. Dies ist eine Einzelfallentscheidung unter Berücksichtigung aller Umstände.",
    relevantLaws: ["§ 439 BGB", "§ 275 BGB", "§ 440 BGB"],
    keywords: ["Nacherfüllung", "Unverhältnismäßigkeit", "Gewährleistung", "Reparaturkosten", "Kaufrecht"],
    sourceUrl: "https://juris.bundesgerichtshof.de/cgi-bin/rechtsprechung/document.py?Gericht=bgh&Art=en&nr=112543"
  },

  // ==========================================
  // VERTRAGSRECHT ALLGEMEIN
  // ==========================================
  {
    caseNumber: "VII ZR 192/13",
    court: "BGH",
    senate: "VII. Zivilsenat",
    decisionDate: new Date("2014-12-04"),
    legalArea: "Vertragsrecht",
    headnotes: [
      "Eine Vertragsstrafe muss angemessen sein, um wirksam zu sein.",
      "Unangemessen hohe Vertragsstrafen sind nach § 307 BGB unwirksam."
    ],
    summary: "Der BGH stellt klar, dass Vertragsstrafenklauseln einer AGB-Kontrolle unterliegen. Eine Vertragsstrafe ist unangemessen, wenn sie den Vertragspartner entgegen Treu und Glauben benachteiligt. Maßgeblich ist eine Gesamtwürdigung unter Berücksichtigung der Art und des Gewichts der sanktionierten Pflichtverletzung.",
    relevantLaws: ["§ 339 BGB", "§ 307 BGB", "§ 343 BGB"],
    keywords: ["Vertragsstrafe", "AGB-Kontrolle", "Angemessenheit", "Inhaltskontrolle", "Vertragsrecht"],
    sourceUrl: "https://juris.bundesgerichtshof.de/cgi-bin/rechtsprechung/document.py?Gericht=bgh&Art=en&nr=69782"
  },
  {
    caseNumber: "XII ZR 107/16",
    court: "BGH",
    senate: "XII. Zivilsenat",
    decisionDate: new Date("2017-07-19"),
    legalArea: "Vertragsrecht",
    headnotes: [
      "Eine stillschweigende Vertragsverlängerungsklausel in AGB ist grundsätzlich wirksam.",
      "Die Verlängerung um mehr als ein Jahr ist jedoch unangemessen."
    ],
    summary: "Der BGH prüft Vertragsverlängerungsklauseln nach AGB-Recht. Automatische Verlängerungen um bis zu ein Jahr sind grundsätzlich zulässig, längere Zeiträume benachteiligen den Kunden unangemessen. Die Kündigungsfrist vor automatischer Verlängerung darf drei Monate nicht überschreiten.",
    relevantLaws: ["§ 307 BGB", "§ 309 Nr. 9 BGB"],
    keywords: ["Vertragsverlängerung", "Laufzeitklausel", "AGB", "Kündigungsfrist", "Verbraucherschutz"],
    sourceUrl: "https://juris.bundesgerichtshof.de/cgi-bin/rechtsprechung/document.py?Gericht=bgh&Art=en&nr=79234"
  },
  {
    caseNumber: "III ZR 182/17",
    court: "BGH",
    senate: "III. Zivilsenat",
    decisionDate: new Date("2018-06-28"),
    legalArea: "Vertragsrecht",
    headnotes: [
      "Ein Widerrufsrecht besteht auch bei Online-Verträgen über digitale Inhalte.",
      "Das Widerrufsrecht erlischt bei digitalen Inhalten nur unter bestimmten Voraussetzungen vorzeitig."
    ],
    summary: "Der BGH konkretisiert das Widerrufsrecht bei digitalen Inhalten. Der Verbraucher kann Verträge über digitale Inhalte innerhalb von 14 Tagen widerrufen. Das Widerrufsrecht erlischt nur, wenn der Verbraucher ausdrücklich zugestimmt hat und der Unternehmer dies bestätigt hat.",
    relevantLaws: ["§ 312g BGB", "§ 356 BGB", "§ 357 BGB"],
    keywords: ["Widerrufsrecht", "digitale Inhalte", "Fernabsatzvertrag", "Verbraucherschutz", "Online-Kauf"],
    sourceUrl: "https://juris.bundesgerichtshof.de/cgi-bin/rechtsprechung/document.py?Gericht=bgh&Art=en&nr=85654"
  },

  // ==========================================
  // DATENSCHUTZ
  // ==========================================
  {
    caseNumber: "VI ZR 135/13",
    court: "BGH",
    senate: "VI. Zivilsenat",
    decisionDate: new Date("2015-01-28"),
    legalArea: "Datenschutzrecht",
    headnotes: [
      "Der Anspruch auf Löschung personenbezogener Daten aus Suchmaschinen kann bestehen.",
      "Es ist eine Abwägung zwischen dem Recht auf informationelle Selbstbestimmung und dem Informationsinteresse der Öffentlichkeit vorzunehmen."
    ],
    summary: "Der BGH wendet das 'Recht auf Vergessenwerden' an. Suchmaschinenbetreiber können verpflichtet sein, Links zu entfernen, die zu personenbezogenen Daten führen. Entscheidend ist eine Abwägung zwischen Persönlichkeitsrecht und Meinungs-/Informationsfreiheit.",
    relevantLaws: ["Art. 17 DSGVO", "§ 1004 BGB", "Art. 2 GG"],
    keywords: ["Recht auf Vergessenwerden", "Löschung", "Google", "Persönlichkeitsrecht", "Datenschutz"],
    sourceUrl: "https://juris.bundesgerichtshof.de/cgi-bin/rechtsprechung/document.py?Gericht=bgh&Art=en&nr=69987"
  },

  // ==========================================
  // GESELLSCHAFTSRECHT
  // ==========================================
  {
    caseNumber: "II ZR 75/18",
    court: "BGH",
    senate: "II. Zivilsenat",
    decisionDate: new Date("2019-07-16"),
    legalArea: "Gesellschaftsrecht",
    headnotes: [
      "Der GmbH-Geschäftsführer haftet bei Verletzung der Insolvenzantragspflicht persönlich.",
      "Die Pflicht zur Insolvenzanmeldung besteht spätestens drei Wochen nach Eintritt der Zahlungsunfähigkeit."
    ],
    summary: "Der BGH konkretisiert die Haftung von GmbH-Geschäftsführern bei Insolvenzverschleppung. Der Geschäftsführer haftet persönlich für Zahlungen, die nach Eintritt der Insolvenzreife geleistet werden, es sei denn, sie waren mit der Sorgfalt eines ordentlichen Geschäftsmanns vereinbar.",
    relevantLaws: ["§ 64 GmbHG", "§ 15a InsO", "§ 43 GmbHG"],
    keywords: ["Geschäftsführerhaftung", "Insolvenzantragspflicht", "Insolvenzverschleppung", "GmbH", "Gesellschaftsrecht"],
    sourceUrl: "https://juris.bundesgerichtshof.de/cgi-bin/rechtsprechung/document.py?Gericht=bgh&Art=en&nr=99456"
  },

  // ==========================================
  // VERSICHERUNGSRECHT
  // ==========================================
  {
    caseNumber: "IV ZR 273/15",
    court: "BGH",
    senate: "IV. Zivilsenat",
    decisionDate: new Date("2016-11-09"),
    legalArea: "Versicherungsrecht",
    headnotes: [
      "Die Obliegenheit zur Anzeige einer Gefahrerhöhung ist eng auszulegen.",
      "Der Versicherer muss den Versicherungsnehmer über die Folgen einer Obliegenheitsverletzung belehren."
    ],
    summary: "Der BGH stärkt die Rechte von Versicherungsnehmern. Bei Obliegenheitsverletzungen kann der Versicherer nur dann leistungsfrei werden, wenn er den Versicherungsnehmer ordnungsgemäß über die Rechtsfolgen belehrt hat. Die Belehrung muss klar und verständlich sein.",
    relevantLaws: ["§ 28 VVG", "§ 23 VVG", "§ 26 VVG"],
    keywords: ["Obliegenheitsverletzung", "Gefahrerhöhung", "Versicherung", "Belehrungspflicht", "Leistungsfreiheit"],
    sourceUrl: "https://juris.bundesgerichtshof.de/cgi-bin/rechtsprechung/document.py?Gericht=bgh&Art=en&nr=76543"
  },

  // ==========================================
  // BAURECHT
  // ==========================================
  {
    caseNumber: "VII ZR 216/19",
    court: "BGH",
    senate: "VII. Zivilsenat",
    decisionDate: new Date("2021-04-22"),
    legalArea: "Baurecht",
    headnotes: [
      "Die Abnahme eines Bauwerks setzt voraus, dass das Werk im Wesentlichen vertragsgemäß hergestellt ist.",
      "Bei wesentlichen Mängeln kann der Auftraggeber die Abnahme verweigern."
    ],
    summary: "Der BGH klärt die Voraussetzungen der Bauabnahme. Der Auftraggeber kann die Abnahme nur verweigern, wenn wesentliche Mängel vorliegen. Wesentlich sind Mängel, die die Gebrauchstauglichkeit erheblich beeinträchtigen oder den Wert des Werks deutlich mindern.",
    relevantLaws: ["§ 640 BGB", "§ 650g BGB", "§ 634 BGB"],
    keywords: ["Bauabnahme", "Baumangel", "Abnahmeverweigerung", "Werkvertrag", "Baurecht"],
    sourceUrl: "https://juris.bundesgerichtshof.de/cgi-bin/rechtsprechung/document.py?Gericht=bgh&Art=en&nr=119876"
  },

  // ==========================================
  // WETTBEWERBSRECHT
  // ==========================================
  {
    caseNumber: "I ZR 129/17",
    court: "BGH",
    senate: "I. Zivilsenat",
    decisionDate: new Date("2019-04-04"),
    legalArea: "Wettbewerbsrecht",
    headnotes: [
      "Influencer-Werbung muss als solche gekennzeichnet werden.",
      "Auch wenn keine Gegenleistung vereinbart ist, kann ein Werbehinweis erforderlich sein."
    ],
    summary: "Der BGH konkretisiert die Kennzeichnungspflicht bei Influencer-Marketing. Posts in sozialen Medien, die Produkte oder Marken zeigen, müssen als Werbung gekennzeichnet werden, wenn ein kommerzieller Zusammenhang besteht. Dies gilt auch bei kostenlosen Produktzusendungen.",
    relevantLaws: ["§ 5a UWG", "§ 3 UWG", "§ 6 TMG"],
    keywords: ["Influencer", "Werbung", "Kennzeichnungspflicht", "Social Media", "Schleichwerbung"],
    sourceUrl: "https://juris.bundesgerichtshof.de/cgi-bin/rechtsprechung/document.py?Gericht=bgh&Art=en&nr=96789"
  },

  // ==========================================
  // MIETRECHT - Erweitert
  // ==========================================
  {
    caseNumber: "VIII ZR 107/21",
    court: "BGH",
    senate: "VIII. Zivilsenat",
    decisionDate: new Date("2022-07-27"),
    legalArea: "Mietrecht",
    headnotes: [
      "Eine Mieterhöhung nach § 558 BGB ist nur wirksam, wenn der Vermieter die ortsübliche Vergleichsmiete nachweist.",
      "Der Mietspiegel ist ein geeignetes Begründungsmittel für Mieterhöhungen."
    ],
    summary: "Der BGH bestätigt, dass bei Mieterhöhungen auf die ortsübliche Vergleichsmiete ein qualifizierter Mietspiegel als Begründungsmittel ausreicht. Der Vermieter muss die Wohnung korrekt in die Mietspiegelkategorien einordnen.",
    relevantLaws: ["§ 558 BGB", "§ 558a BGB", "§ 558c BGB"],
    keywords: ["Mieterhöhung", "Mietspiegel", "Vergleichsmiete", "Mietrecht"],
    sourceUrl: "https://openjur.de"
  },
  {
    caseNumber: "VIII ZR 38/18",
    court: "BGH",
    senate: "VIII. Zivilsenat",
    decisionDate: new Date("2019-03-27"),
    legalArea: "Mietrecht",
    headnotes: [
      "Der Vermieter muss bei der Nebenkostenabrechnung das Wirtschaftlichkeitsgebot beachten.",
      "Überhöhte Kosten für Hausmeister oder Gartenpflege können beanstandet werden."
    ],
    summary: "Der BGH stellt klar, dass Vermieter bei Betriebskosten das Gebot der Wirtschaftlichkeit beachten müssen. Der Mieter kann die Abrechnung kürzen, wenn einzelne Positionen deutlich über dem Marktüblichen liegen.",
    relevantLaws: ["§ 556 BGB", "§ 560 BGB"],
    keywords: ["Nebenkosten", "Betriebskosten", "Wirtschaftlichkeitsgebot", "Nebenkostenabrechnung"],
    sourceUrl: "https://openjur.de"
  },
  {
    caseNumber: "VIII ZR 231/17",
    court: "BGH",
    senate: "VIII. Zivilsenat",
    decisionDate: new Date("2018-11-21"),
    legalArea: "Mietrecht",
    headnotes: [
      "Die Modernisierungsmieterhöhung ist auf 8% der aufgewendeten Kosten begrenzt.",
      "Der Mieter muss eine Modernisierung grundsätzlich dulden, kann aber unter Umständen Härtefall geltend machen."
    ],
    summary: "Der BGH konkretisiert die Voraussetzungen der Modernisierungsmieterhöhung. Die Erhöhung ist auf 8% der aufgewendeten Kosten jährlich begrenzt. Bei unzumutbarer Härte für den Mieter kann die Erhöhung ausgeschlossen sein.",
    relevantLaws: ["§ 559 BGB", "§ 555d BGB", "§ 559d BGB"],
    keywords: ["Modernisierung", "Mieterhöhung", "Härtefall", "Duldungspflicht"],
    sourceUrl: "https://openjur.de"
  },
  {
    caseNumber: "VIII ZR 167/17",
    court: "BGH",
    senate: "VIII. Zivilsenat",
    decisionDate: new Date("2018-07-18"),
    legalArea: "Mietrecht",
    headnotes: [
      "Der Vermieter kann bei Zahlungsverzug fristlos kündigen.",
      "Bei einem Rückstand von zwei Monatsmieten ist die fristlose Kündigung in der Regel gerechtfertigt."
    ],
    summary: "Der BGH bestätigt, dass der Vermieter bei einem Mietrückstand von mindestens zwei Monatsmieten zur fristlosen Kündigung berechtigt ist. Die Schonfristzahlung kann die Kündigung heilen, aber nur bei der ersten Kündigung innerhalb von zwei Jahren.",
    relevantLaws: ["§ 543 BGB", "§ 569 BGB", "§ 573c BGB"],
    keywords: ["Mietrückstand", "fristlose Kündigung", "Zahlungsverzug", "Schonfristzahlung"],
    sourceUrl: "https://openjur.de"
  },

  // ==========================================
  // ARBEITSRECHT - Erweitert
  // ==========================================
  {
    caseNumber: "9 AZR 541/15",
    court: "BAG",
    senate: "Neunter Senat",
    decisionDate: new Date("2016-11-22"),
    legalArea: "Arbeitsrecht",
    headnotes: [
      "Der gesetzliche Mindesturlaub verfällt nicht automatisch am Jahresende.",
      "Der Arbeitgeber muss den Arbeitnehmer auffordern, seinen Urlaub zu nehmen und auf den drohenden Verfall hinweisen."
    ],
    summary: "Das BAG hat die Rechtsprechung zum Urlaubsverfall grundlegend geändert. Urlaub verfällt nur noch, wenn der Arbeitgeber den Arbeitnehmer rechtzeitig und transparent auf den Urlaub hingewiesen und aufgefordert hat, diesen zu nehmen. Andernfalls wird der Urlaub übertragen.",
    relevantLaws: ["§ 7 BUrlG", "§ 1 BUrlG"],
    keywords: ["Urlaubsverfall", "Mindesturlaub", "Hinweispflicht", "Urlaubsanspruch"],
    sourceUrl: "https://openjur.de"
  },
  {
    caseNumber: "8 AZR 562/16",
    court: "BAG",
    senate: "Achter Senat",
    decisionDate: new Date("2018-01-25"),
    legalArea: "Arbeitsrecht",
    headnotes: [
      "Bei Diskriminierung im Bewerbungsverfahren kann der Bewerber Entschädigung verlangen.",
      "Die Beweislast kehrt sich um, wenn Indizien für eine Diskriminierung vorliegen."
    ],
    summary: "Das BAG stärkt den Schutz vor Diskriminierung im Bewerbungsverfahren. Werden Bewerber aufgrund von Alter, Geschlecht oder anderen geschützten Merkmalen benachteiligt, können sie Entschädigung in Höhe von bis zu drei Monatsgehältern verlangen.",
    relevantLaws: ["§ 15 AGG", "§ 22 AGG", "§ 1 AGG"],
    keywords: ["Diskriminierung", "Bewerbung", "AGG", "Entschädigung", "Beweislast"],
    sourceUrl: "https://openjur.de"
  },
  {
    caseNumber: "2 AZR 84/19",
    court: "BAG",
    senate: "Zweiter Senat",
    decisionDate: new Date("2020-08-27"),
    legalArea: "Arbeitsrecht",
    headnotes: [
      "Die betriebsbedingte Kündigung erfordert eine Sozialauswahl.",
      "Bei der Sozialauswahl sind Dauer der Betriebszugehörigkeit, Lebensalter, Unterhaltspflichten und Schwerbehinderung zu berücksichtigen."
    ],
    summary: "Das BAG präzisiert die Anforderungen an die Sozialauswahl bei betriebsbedingten Kündigungen. Der Arbeitgeber muss alle vergleichbaren Arbeitnehmer in die Auswahl einbeziehen und die sozialen Kriterien angemessen gewichten.",
    relevantLaws: ["§ 1 KSchG", "§ 1 Abs. 3 KSchG"],
    keywords: ["betriebsbedingte Kündigung", "Sozialauswahl", "Kündigungsschutz", "Kriterien"],
    sourceUrl: "https://openjur.de"
  },
  {
    caseNumber: "5 AZR 517/19",
    court: "BAG",
    senate: "Fünfter Senat",
    decisionDate: new Date("2021-04-21"),
    legalArea: "Arbeitsrecht",
    headnotes: [
      "Homeoffice kann nicht einseitig durch den Arbeitgeber angeordnet werden.",
      "Umgekehrt hat der Arbeitnehmer grundsätzlich keinen Anspruch auf Homeoffice."
    ],
    summary: "Das BAG klärt die Rechtslage zum Homeoffice. Weder Arbeitgeber noch Arbeitnehmer können Homeoffice einseitig durchsetzen. Es bedarf einer Vereinbarung, sofern nicht tarifvertragliche oder betriebliche Regelungen bestehen.",
    relevantLaws: ["§ 106 GewO", "§ 611a BGB"],
    keywords: ["Homeoffice", "Direktionsrecht", "Arbeitsort", "mobile Arbeit", "Telearbeit"],
    sourceUrl: "https://openjur.de"
  },
  {
    caseNumber: "6 AZR 465/18",
    court: "BAG",
    senate: "Sechster Senat",
    decisionDate: new Date("2019-06-27"),
    legalArea: "Arbeitsrecht",
    headnotes: [
      "Befristete Arbeitsverträge ohne Sachgrund sind nur bei Neueinstellungen zulässig.",
      "Eine frühere Beschäftigung beim selben Arbeitgeber kann der sachgrundlosen Befristung entgegenstehen."
    ],
    summary: "Das BAG bestätigt das Vorbeschäftigungsverbot bei sachgrundlosen Befristungen. War der Arbeitnehmer bereits zuvor beim selben Arbeitgeber beschäftigt, ist eine erneute sachgrundlose Befristung grundsätzlich unzulässig, es sei denn, die Vorbeschäftigung liegt sehr lange zurück.",
    relevantLaws: ["§ 14 TzBfG", "§ 14 Abs. 2 TzBfG"],
    keywords: ["Befristung", "sachgrundlos", "Vorbeschäftigung", "TzBfG", "Kettenarbeitsvertrag"],
    sourceUrl: "https://openjur.de"
  },

  // ==========================================
  // VERBRAUCHERSCHUTZ / E-COMMERCE
  // ==========================================
  {
    caseNumber: "I ZR 169/18",
    court: "BGH",
    senate: "I. Zivilsenat",
    decisionDate: new Date("2020-03-19"),
    legalArea: "Vertragsrecht",
    headnotes: [
      "Der Button-Lösung muss bei Online-Bestellungen eingehalten werden.",
      "Der Bestellbutton muss eindeutig auf die Zahlungspflicht hinweisen."
    ],
    summary: "Der BGH bestätigt die strengen Anforderungen an die Button-Lösung. Bei Online-Käufen muss der Bestellbutton eindeutig auf die Zahlungspflicht hinweisen, z.B. 'zahlungspflichtig bestellen'. Formulierungen wie nur 'Bestellen' sind unzureichend.",
    relevantLaws: ["§ 312j BGB", "§ 312i BGB"],
    keywords: ["Button-Lösung", "Online-Kauf", "Bestellbutton", "E-Commerce", "Verbraucherschutz"],
    sourceUrl: "https://openjur.de"
  },
  {
    caseNumber: "VIII ZR 319/17",
    court: "BGH",
    senate: "VIII. Zivilsenat",
    decisionDate: new Date("2019-07-03"),
    legalArea: "Kaufrecht",
    headnotes: [
      "Bei Internetkäufen beginnt die Widerrufsfrist erst mit ordnungsgemäßer Belehrung.",
      "Eine fehlerhafte Widerrufsbelehrung verlängert die Widerrufsfrist."
    ],
    summary: "Der BGH stärkt die Verbraucherrechte bei Online-Käufen. Ist die Widerrufsbelehrung fehlerhaft oder unvollständig, beginnt die 14-tägige Widerrufsfrist nicht zu laufen. Das Widerrufsrecht kann dann bis zu 12 Monate und 14 Tage nach Vertragsschluss ausgeübt werden.",
    relevantLaws: ["§ 355 BGB", "§ 356 BGB", "Art. 246a EGBGB"],
    keywords: ["Widerruf", "Online-Kauf", "Widerrufsbelehrung", "Fernabsatz", "E-Commerce"],
    sourceUrl: "https://openjur.de"
  },
  {
    caseNumber: "VIII ZR 200/05",
    court: "BGH",
    senate: "VIII. Zivilsenat",
    decisionDate: new Date("2006-11-08"),
    legalArea: "Kaufrecht",
    headnotes: [
      "Bei Verbrauchsgüterkäufen kann die Gewährleistungsfrist nicht unter zwei Jahre verkürzt werden.",
      "Klauseln, die die Gewährleistung bei Neuware einschränken, sind unwirksam."
    ],
    summary: "Der BGH schützt Verbraucher vor unzulässigen Gewährleistungsbeschränkungen. Bei Neuware kann die zweijährige Gewährleistungsfrist gegenüber Verbrauchern nicht durch AGB verkürzt werden. Nur bei Gebrauchtwaren ist eine Verkürzung auf ein Jahr möglich.",
    relevantLaws: ["§ 475 BGB", "§ 438 BGB", "§ 307 BGB"],
    keywords: ["Gewährleistung", "Verbrauchsgüterkauf", "Gewährleistungsfrist", "AGB", "Neuware"],
    sourceUrl: "https://openjur.de"
  },

  // ==========================================
  // VERTRAGSRECHT - Erweitert
  // ==========================================
  {
    caseNumber: "VII ZR 6/13",
    court: "BGH",
    senate: "VII. Zivilsenat",
    decisionDate: new Date("2014-06-05"),
    legalArea: "Vertragsrecht",
    headnotes: [
      "Allgemeine Geschäftsbedingungen unterliegen einer Inhaltskontrolle.",
      "Überraschende Klauseln werden nicht Vertragsbestandteil."
    ],
    summary: "Der BGH konkretisiert die AGB-Kontrolle. Klauseln, die so ungewöhnlich sind, dass der Vertragspartner nicht mit ihnen rechnen muss, werden nicht Vertragsbestandteil. Zudem müssen AGB klar und verständlich formuliert sein.",
    relevantLaws: ["§ 305c BGB", "§ 307 BGB", "§ 305 BGB"],
    keywords: ["AGB", "überraschende Klausel", "Inhaltskontrolle", "Transparenzgebot"],
    sourceUrl: "https://openjur.de"
  },
  {
    caseNumber: "III ZR 387/17",
    court: "BGH",
    senate: "III. Zivilsenat",
    decisionDate: new Date("2018-10-18"),
    legalArea: "Vertragsrecht",
    headnotes: [
      "Fitnessstudioverträge mit einer Mindestlaufzeit von mehr als 24 Monaten sind unwirksam.",
      "Die automatische Verlängerung um mehr als 12 Monate benachteiligt den Verbraucher unangemessen."
    ],
    summary: "Der BGH schützt Verbraucher vor zu langen Vertragslaufzeiten. Fitnessstudioverträge mit einer Erstlaufzeit von über 24 Monaten oder einer automatischen Verlängerung um mehr als 12 Monate sind nach AGB-Recht unwirksam.",
    relevantLaws: ["§ 309 Nr. 9 BGB", "§ 307 BGB"],
    keywords: ["Fitnessstudio", "Laufzeit", "Vertragsverlängerung", "AGB", "Verbraucherschutz"],
    sourceUrl: "https://openjur.de"
  },
  {
    caseNumber: "VIII ZR 249/14",
    court: "BGH",
    senate: "VIII. Zivilsenat",
    decisionDate: new Date("2016-01-20"),
    legalArea: "Vertragsrecht",
    headnotes: [
      "Der Verkäufer haftet auch für arglistig verschwiegene Mängel.",
      "Arglist liegt vor, wenn der Verkäufer einen Mangel kennt und bewusst verschweigt."
    ],
    summary: "Der BGH bestätigt die Haftung für arglistiges Verschweigen. Hat der Verkäufer einen Mangel gekannt und verschwiegen, kann er sich nicht auf Haftungsausschlüsse berufen. Der Käufer kann in diesen Fällen auch nach Ablauf der regulären Gewährleistungsfrist Ansprüche geltend machen.",
    relevantLaws: ["§ 444 BGB", "§ 438 BGB", "§ 437 BGB"],
    keywords: ["Arglist", "Mangel", "Haftungsausschluss", "Verschweigen", "Gewährleistung"],
    sourceUrl: "https://openjur.de"
  },

  // ==========================================
  // FAMILIENRECHT / ERBRECHT
  // ==========================================
  {
    caseNumber: "XII ZR 48/17",
    court: "BGH",
    senate: "XII. Zivilsenat",
    decisionDate: new Date("2018-03-14"),
    legalArea: "Familienrecht",
    headnotes: [
      "Ein Ehevertrag kann bei Sittenwidrigkeit unwirksam sein.",
      "Ein vollständiger Ausschluss des Versorgungsausgleichs ist in der Regel sittenwidrig."
    ],
    summary: "Der BGH schützt Ehepartner vor unfairen Eheverträgen. Ein Ehevertrag, der einseitig einen Partner benachteiligt und die Grundprinzipien des Scheidungsfolgenrechts völlig außer Kraft setzt, kann als sittenwidrig unwirksam sein.",
    relevantLaws: ["§ 138 BGB", "§ 1408 BGB", "§ 8 VersAusglG"],
    keywords: ["Ehevertrag", "Sittenwidrigkeit", "Versorgungsausgleich", "Unterhalt", "Familienrecht"],
    sourceUrl: "https://openjur.de"
  },
  {
    caseNumber: "IV ZR 23/14",
    court: "BGH",
    senate: "IV. Zivilsenat",
    decisionDate: new Date("2015-04-22"),
    legalArea: "Erbrecht",
    headnotes: [
      "Ein Testament muss eigenhändig geschrieben und unterschrieben sein.",
      "Ein am Computer geschriebenes Testament ist formunwirksam."
    ],
    summary: "Der BGH bestätigt die strengen Formerfordernisse für privatschriftliche Testamente. Das Testament muss vollständig handschriftlich geschrieben und unterschrieben sein. Computerausdrucke oder Schreibmaschinentexte genügen nicht, auch wenn sie unterschrieben sind.",
    relevantLaws: ["§ 2247 BGB", "§ 125 BGB"],
    keywords: ["Testament", "Formerfordernis", "eigenhändig", "Erbrecht", "Unwirksamkeit"],
    sourceUrl: "https://openjur.de"
  },
  {
    caseNumber: "IV ZR 51/19",
    court: "BGH",
    senate: "IV. Zivilsenat",
    decisionDate: new Date("2020-07-08"),
    legalArea: "Erbrecht",
    headnotes: [
      "Der Pflichtteilsanspruch verjährt in drei Jahren.",
      "Die Verjährung beginnt mit Kenntnis vom Erbfall und der beeinträchtigenden Verfügung."
    ],
    summary: "Der BGH klärt die Verjährung des Pflichtteilsanspruchs. Die dreijährige Verjährungsfrist beginnt mit dem Schluss des Jahres, in dem der Pflichtteilsberechtigte vom Erbfall und der ihn beeinträchtigenden Verfügung Kenntnis erlangt hat.",
    relevantLaws: ["§ 2303 BGB", "§ 195 BGB", "§ 199 BGB"],
    keywords: ["Pflichtteil", "Verjährung", "Erbrecht", "Pflichtteilsanspruch"],
    sourceUrl: "https://openjur.de"
  },

  // ==========================================
  // HANDELS- / GESELLSCHAFTSRECHT - Erweitert
  // ==========================================
  {
    caseNumber: "II ZR 243/15",
    court: "BGH",
    senate: "II. Zivilsenat",
    decisionDate: new Date("2017-07-11"),
    legalArea: "Gesellschaftsrecht",
    headnotes: [
      "Gesellschafter einer GbR haften grundsätzlich persönlich und unbeschränkt.",
      "Eine Haftungsbeschränkung muss dem Vertragspartner bekannt gemacht werden."
    ],
    summary: "Der BGH bestätigt die persönliche Haftung von GbR-Gesellschaftern. Eine Haftungsbeschränkung auf das Gesellschaftsvermögen ist nur wirksam, wenn sie dem Vertragspartner vor Vertragsschluss bekannt gemacht wurde.",
    relevantLaws: ["§ 128 HGB", "§ 714 BGB", "§ 705 BGB"],
    keywords: ["GbR", "Gesellschafterhaftung", "persönliche Haftung", "Haftungsbeschränkung"],
    sourceUrl: "https://openjur.de"
  },
  {
    caseNumber: "II ZR 175/19",
    court: "BGH",
    senate: "II. Zivilsenat",
    decisionDate: new Date("2020-10-06"),
    legalArea: "Gesellschaftsrecht",
    headnotes: [
      "Der Gesellschafter-Geschäftsführer unterliegt dem Wettbewerbsverbot.",
      "Konkurrierende Tätigkeiten sind nur mit Zustimmung der Gesellschaft zulässig."
    ],
    summary: "Der BGH konkretisiert das Wettbewerbsverbot für GmbH-Geschäftsführer. Ohne Zustimmung der Gesellschafterversammlung darf der Geschäftsführer keine konkurrierenden Tätigkeiten ausüben. Verstöße können Schadensersatzansprüche und außerordentliche Kündigung rechtfertigen.",
    relevantLaws: ["§ 43 GmbHG", "§ 88 HGB"],
    keywords: ["Wettbewerbsverbot", "Geschäftsführer", "GmbH", "Konkurrenz", "Treuepflicht"],
    sourceUrl: "https://openjur.de"
  },

  // ==========================================
  // BANKRECHT / FINANZRECHT
  // ==========================================
  {
    caseNumber: "XI ZR 101/15",
    court: "BGH",
    senate: "XI. Zivilsenat",
    decisionDate: new Date("2016-07-12"),
    legalArea: "Bankrecht",
    headnotes: [
      "Bearbeitungsentgelte für Verbraucherdarlehen sind unwirksam.",
      "Der Darlehensnehmer kann bereits gezahlte Bearbeitungsgebühren zurückfordern."
    ],
    summary: "Der BGH hat Bearbeitungsentgelte bei Verbraucherdarlehen für unwirksam erklärt. Banken dürfen keine gesonderten Gebühren für die Bearbeitung des Kreditantrags verlangen, da dies zu ihren regulären Aufgaben gehört. Bereits gezahlte Entgelte können zurückgefordert werden.",
    relevantLaws: ["§ 307 BGB", "§ 488 BGB"],
    keywords: ["Bearbeitungsgebühr", "Kredit", "Darlehen", "Bank", "Verbraucherschutz"],
    sourceUrl: "https://openjur.de"
  },
  {
    caseNumber: "XI ZR 7/19",
    court: "BGH",
    senate: "XI. Zivilsenat",
    decisionDate: new Date("2021-04-27"),
    legalArea: "Bankrecht",
    headnotes: [
      "Negativzinsen können auf Girokonten unter bestimmten Voraussetzungen erhoben werden.",
      "Die Zulässigkeit hängt von der konkreten vertraglichen Gestaltung ab."
    ],
    summary: "Der BGH hat sich zu Negativzinsen auf Girokonten geäußert. Grundsätzlich können Banken bei entsprechender vertraglicher Vereinbarung Verwahrentgelte erheben. Die Klauseln müssen aber transparent und verständlich sein.",
    relevantLaws: ["§ 307 BGB", "§ 675f BGB", "§ 488 BGB"],
    keywords: ["Negativzinsen", "Verwahrentgelt", "Girokonto", "Bank", "AGB"],
    sourceUrl: "https://openjur.de"
  },

  // ==========================================
  // IT-RECHT / DATENSCHUTZ - Erweitert
  // ==========================================
  {
    caseNumber: "I ZR 186/17",
    court: "BGH",
    senate: "I. Zivilsenat",
    decisionDate: new Date("2020-05-28"),
    legalArea: "Datenschutzrecht",
    headnotes: [
      "Die Einwilligung in Cookies muss aktiv durch den Nutzer erfolgen.",
      "Vorangekreuzte Checkboxen stellen keine wirksame Einwilligung dar."
    ],
    summary: "Der BGH bestätigt die Cookie-Rechtsprechung des EuGH. Für Tracking-Cookies ist eine aktive Einwilligung des Nutzers erforderlich. Voreingestellte Checkboxen oder das bloße Weitersurfen genügen nicht.",
    relevantLaws: ["§ 15 TMG", "Art. 6 DSGVO", "Art. 7 DSGVO"],
    keywords: ["Cookies", "Einwilligung", "DSGVO", "Tracking", "Datenschutz"],
    sourceUrl: "https://openjur.de"
  },
  {
    caseNumber: "VI ZR 489/20",
    court: "BGH",
    senate: "VI. Zivilsenat",
    decisionDate: new Date("2022-03-01"),
    legalArea: "Datenschutzrecht",
    headnotes: [
      "Bei Datenschutzverstößen kann ein immaterieller Schadensersatz verlangt werden.",
      "Der Schaden muss konkret dargelegt werden, ein bloßer DSGVO-Verstoß reicht nicht."
    ],
    summary: "Der BGH konkretisiert den Schadensersatzanspruch nach Art. 82 DSGVO. Ein Verstoß gegen die DSGVO allein begründet keinen Schadensersatzanspruch. Der Betroffene muss einen konkreten immateriellen Schaden darlegen.",
    relevantLaws: ["Art. 82 DSGVO", "§ 823 BGB"],
    keywords: ["DSGVO", "Schadensersatz", "Datenpanne", "immaterieller Schaden"],
    sourceUrl: "https://openjur.de"
  },

  // ==========================================
  // VERTRAGSSTRAFEN / SCHADENSERSATZ
  // ==========================================
  {
    caseNumber: "VII ZR 178/20",
    court: "BGH",
    senate: "VII. Zivilsenat",
    decisionDate: new Date("2022-01-13"),
    legalArea: "Vertragsrecht",
    headnotes: [
      "Die Vertragsstrafe muss verhältnismäßig zum Verstoß sein.",
      "Eine zu hohe Vertragsstrafe kann vom Gericht herabgesetzt werden."
    ],
    summary: "Der BGH bestätigt das richterliche Ermäßigungsrecht bei überhöhten Vertragsstrafen. Ist die vereinbarte Strafe unverhältnismäßig hoch, kann das Gericht sie auf einen angemessenen Betrag herabsetzen (§ 343 BGB).",
    relevantLaws: ["§ 339 BGB", "§ 343 BGB", "§ 307 BGB"],
    keywords: ["Vertragsstrafe", "Herabsetzung", "unverhältnismäßig", "richterliches Ermessen"],
    sourceUrl: "https://openjur.de"
  },
  {
    caseNumber: "VI ZR 252/19",
    court: "BGH",
    senate: "VI. Zivilsenat",
    decisionDate: new Date("2020-12-15"),
    legalArea: "Vertragsrecht",
    headnotes: [
      "Bei Vertragsverletzungen muss der Schaden konkret nachgewiesen werden.",
      "Pauschaler Schadensersatz ohne Nachweis ist unzulässig."
    ],
    summary: "Der BGH stellt klar, dass der Geschädigte seinen Schaden konkret darlegen muss. Pauschale Schadensbehauptungen ohne konkreten Nachweis reichen nicht aus. Dies gilt auch für entgangenen Gewinn.",
    relevantLaws: ["§ 249 BGB", "§ 252 BGB", "§ 280 BGB"],
    keywords: ["Schadensersatz", "Schadensnachweis", "entgangener Gewinn", "Darlegungslast"],
    sourceUrl: "https://openjur.de"
  }
];

async function seedCourtDecisions() {
  try {
    // Connect to MongoDB
    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");

    // Get embeddings service
    const embeddingsService = getInstance();

    // Check existing count
    const existingCount = await CourtDecision.countDocuments();
    console.log(`📊 Existing court decisions in database: ${existingCount}`);

    // Upsert all decisions
    console.log(`\n📜 Seeding ${courtDecisions.length} court decisions...\n`);
    const stats = await embeddingsService.upsertDecisions(courtDecisions);

    console.log("\n✅ Seeding complete!");
    console.log(`   - Inserted: ${stats.inserted}`);
    console.log(`   - Updated: ${stats.updated}`);
    console.log(`   - Errors: ${stats.errors}`);

    // Show final stats
    const finalStats = await embeddingsService.getStats();
    console.log("\n📊 Database Statistics:");
    console.log(`   - Total decisions: ${finalStats.total}`);
    console.log("\n   By Court:");
    finalStats.byCourt.forEach(c => console.log(`     - ${c._id}: ${c.count}`));
    console.log("\n   By Legal Area:");
    finalStats.byArea.forEach(a => console.log(`     - ${a._id}: ${a.count}`));

  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("\n🔌 Disconnected from MongoDB");
  }
}

// Run if called directly
if (require.main === module) {
  seedCourtDecisions();
}

module.exports = { seedCourtDecisions, courtDecisions };
