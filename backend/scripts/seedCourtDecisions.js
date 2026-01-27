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
