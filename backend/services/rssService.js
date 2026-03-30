// backend/services/rssService.js
// RSS Feed Service - Aggregate Legal News from Multiple German Sources
// Includes: Federal Gazette, Bundestag, Courts, Ministries, Legal News

const Parser = require('rss-parser');
const parser = new Parser({
  timeout: 15000,
  customFields: {
    item: [
      ['description', 'summary'],
      ['content:encoded', 'fullContent'],
      ['dc:creator', 'author'],
      ['category', 'categories', { keepArray: true }]
    ]
  }
});

/**
 * Curated list of German legal RSS feeds
 * All URLs verified and working as of January 2026
 */
const LEGAL_RSS_FEEDS = {
  // ═══════════════════════════════════════════════════
  // BUNDESGESETZBLATT (Federal Law Gazette)
  // ═══════════════════════════════════════════════════
  'bgbl-teil1': {
    url: 'https://www.recht.bund.de/rss/feeds/rss_bgbl-1.xml',
    name: 'Bundesgesetzblatt Teil I',
    category: 'bundesrecht',
    enabled: true
  },
  'bgbl-teil2': {
    url: 'https://www.recht.bund.de/rss/feeds/rss_bgbl-2.xml',
    name: 'Bundesgesetzblatt Teil II',
    category: 'bundesrecht',
    enabled: true
  },

  // ═══════════════════════════════════════════════════
  // BUNDESTAG (Parliament)
  // ═══════════════════════════════════════════════════
  'bundestag-presse': {
    url: 'https://www.bundestag.de/static/appdata/includes/rss/pressemitteilungen.rss',
    name: 'Bundestag Pressemitteilungen',
    category: 'gesetzgebung',
    enabled: true
  },
  'bundestag-drucksachen': {
    url: 'https://www.bundestag.de/static/appdata/includes/rss/drucksachen.rss',
    name: 'Bundestag Drucksachen',
    category: 'gesetzgebung',
    enabled: true
  },
  'bundestag-recht': {
    url: 'https://www.bundestag.de/static/appdata/includes/rss/recht.rss',
    name: 'Bundestag Rechtsthemen',
    category: 'gesetzgebung',
    enabled: true
  },

  // ═══════════════════════════════════════════════════
  // LEGAL TRIBUNE ONLINE (Legal News)
  // ═══════════════════════════════════════════════════
  'lto-news': {
    url: 'https://www.lto.de/rss/nachrichten-rss/feed.xml',
    name: 'Legal Tribune Online',
    category: 'rechtsnews',
    enabled: true
  },
  'lto-hintergruende': {
    url: 'https://www.lto.de/hintergruende-rss/rss/feed.xml',
    name: 'LTO Hintergründe',
    category: 'rechtsnews',
    enabled: true
  },

  // ═══════════════════════════════════════════════════
  // BUNDESMINISTERIEN (Federal Ministries)
  // ═══════════════════════════════════════════════════
  'bmj-presse': {
    url: 'https://www.bmjv.de/SiteGlobals/Functions/RSSNewsfeed/DE/RSSNewsfeed/RSSNewsfeedPressemitteilungen.xml',
    name: 'Bundesjustizministerium Presse',
    category: 'bundesrecht',
    enabled: true
  },
  'bmj-gesetzgebung': {
    url: 'https://www.bmjv.de/SiteGlobals/Functions/RSSNewsfeed/DE/RSSNewsfeed/RSSNewsfeedGesetzgebungsverfahren.xml',
    name: 'BMJ Gesetzgebungsverfahren',
    category: 'bundesrecht',
    enabled: true
  },
  'bmas-news': {
    url: 'https://www.bmas.de/SiteGlobals/Functions/RSSFeed/DE/RSSNewsfeed/RSSNewsfeed.xml',
    name: 'Bundesarbeitsministerium',
    category: 'arbeitsrecht',
    enabled: true
  },

  // ═══════════════════════════════════════════════════
  // BUNDESGERICHTE (Federal Courts) - rechtsprechung-im-internet.de
  // ═══════════════════════════════════════════════════
  'bgh-entscheidungen': {
    url: 'https://www.rechtsprechung-im-internet.de/jportal/docs/feed/bsjrs-bgh.xml',
    name: 'BGH Entscheidungen',
    category: 'rechtsprechung',
    enabled: true
  },
  'bag-entscheidungen': {
    url: 'https://www.rechtsprechung-im-internet.de/jportal/docs/feed/bsjrs-bag.xml',
    name: 'BAG Entscheidungen',
    category: 'arbeitsrecht',
    enabled: true
  },
  'bverfg-entscheidungen': {
    url: 'https://www.rechtsprechung-im-internet.de/jportal/docs/feed/bsjrs-bverfg.xml',
    name: 'BVerfG Entscheidungen',
    category: 'verfassungsrecht',
    enabled: true
  },
  'bfh-entscheidungen': {
    url: 'https://www.rechtsprechung-im-internet.de/jportal/docs/feed/bsjrs-bfh.xml',
    name: 'BFH Entscheidungen',
    category: 'steuerrecht',
    enabled: true
  },

  // ═══════════════════════════════════════════════════
  // WEITERE BUNDESGERICHTE (Additional Federal Courts)
  // ═══════════════════════════════════════════════════
  'bsg-entscheidungen': {
    url: 'https://www.rechtsprechung-im-internet.de/jportal/docs/feed/bsjrs-bsg.xml',
    name: 'BSG Entscheidungen (Sozialrecht)',
    category: 'sozialrecht',
    enabled: true
  },
  'bverwg-entscheidungen': {
    url: 'https://www.rechtsprechung-im-internet.de/jportal/docs/feed/bsjrs-bverwg.xml',
    name: 'BVerwG Entscheidungen (Verwaltungsrecht)',
    category: 'verwaltungsrecht',
    enabled: true
  },
  'bpatg-entscheidungen': {
    url: 'https://www.rechtsprechung-im-internet.de/jportal/docs/feed/bsjrs-bpatg.xml',
    name: 'BPatG Entscheidungen (Patentrecht)',
    category: 'patentrecht',
    enabled: true
  },

  // ═══════════════════════════════════════════════════
  // WEITERE QUELLEN (Additional Sources)
  // ═══════════════════════════════════════════════════
  'bundesrat-presse': {
    url: 'https://www.bundesrat.de/SiteGlobals/Functions/RSSFeed/RSSGenerator_Announcement.xml?nn=4352850',
    name: 'Bundesrat Beratungsvorgaenge',
    category: 'gesetzgebung',
    enabled: true
  },
  'bmi-presse': {
    url: 'https://www.bmi.bund.de/SiteGlobals/Functions/RSSFeed/DE/RSSNewsfeed/RSSNewsfeed.xml',
    name: 'Bundesinnenministerium',
    category: 'bundesrecht',
    enabled: true
  },
  'beck-aktuell': {
    url: 'https://rsw.beck.de/rsw/rss/becklink',
    name: 'beck-aktuell Rechtsnachrichten',
    category: 'rechtsnews',
    enabled: false // NOTE: URL nicht verifiziert, beck.de evtl. Paywall - deaktiviert bis URL bestaetigt
  },
  'bundesrat-drucksachen': {
    url: 'https://www.bundesrat.de/SiteGlobals/Functions/RSSFeed/RSSGenerator_PBPrintout.xml?nn=4352850',
    name: 'Bundesrat Drucksachen',
    category: 'gesetzgebung',
    enabled: true
  },

  // ═══════════════════════════════════════════════════
  // DATENSCHUTZ-AUFSICHTSBEHÖRDEN (Data Protection Authorities)
  // ═══════════════════════════════════════════════════
  'bfdi-news': {
    url: 'https://www.bfdi.bund.de/SiteGlobals/Functions/RSSFeed/Allgemein/rssnewsfeed.xml?nn=252136',
    name: 'BfDI Bundesbeauftragte Datenschutz',
    category: 'datenschutz',
    enabled: true
  },
  'baylfdi-news': {
    url: 'https://www.datenschutz-bayern.de/rss/inhalte.xml',
    name: 'BayLfD Bayern Datenschutz',
    category: 'datenschutz',
    enabled: true
  },
  'baylfdi-presse': {
    url: 'https://www.datenschutz-bayern.de/rss/pressemeldung.xml',
    name: 'BayLfD Bayern Pressemitteilungen',
    category: 'datenschutz',
    enabled: true
  },

  // ═══════════════════════════════════════════════════
  // EU-RECHT (C1)
  // ═══════════════════════════════════════════════════
  'edpb-news': {
    url: 'https://www.edpb.europa.eu/rss_en',
    name: 'EU Datenschutzausschuss (EDPB)',
    category: 'datenschutz',
    enabled: true
  },
  'eur-lex-amtsblatt': {
    url: 'https://eur-lex.europa.eu/rss/treaty/ojl.xml',
    name: 'EU Amtsblatt (OJ L)',
    category: 'eu_recht',
    enabled: true
  },

  // ═══════════════════════════════════════════════════
  // AUFSICHTSBEHÖRDEN (C2)
  // ═══════════════════════════════════════════════════
  'bafin-meldungen': {
    url: 'https://www.bafin.de/SiteGlobals/Functions/RSSFeed/DE/RSSNewsfeed/RSSNewsfeed_node.xml',
    name: 'BaFin Finanzaufsicht',
    category: 'finanzrecht',
    enabled: true
  },
  'bnetza-presse': {
    url: 'https://www.bundesnetzagentur.de/SiteGlobals/Functions/RSSFeed/DE/RSSNewsfeed/Pressemitteilungen.xml',
    name: 'Bundesnetzagentur',
    category: 'regulierung',
    enabled: true
  }
};

// ═══════════════════════════════════════════════════
// FEED HEALTH TRACKING
// ═══════════════════════════════════════════════════
const feedHealth = {};

function getFeedHealth(feedId) {
  if (!feedHealth[feedId]) {
    feedHealth[feedId] = {
      lastSuccessfulFetch: null,
      consecutiveFailures: 0,
      lastError: null,
      totalFetches: 0,
      totalItems: 0
    };
  }
  return feedHealth[feedId];
}

// ═══════════════════════════════════════════════════
// AREA DETECTION - Map RSS items to Legal Pulse categories
// ═══════════════════════════════════════════════════

/**
 * Detect legal area from title and summary text
 * Maps to the same area values used in user Legal Pulse settings
 */
function detectLegalArea(title, summary = '') {
  const text = `${title} ${summary}`.replace(/<[^>]*>/g, ' ').toLowerCase();

  // Arbeitsrecht
  if (/arbeit(s|nehmer|geber|srecht|svertrag|sverhältnis|szeit)|kündigungs(schutz|frist)|betriebsrat|tarifvertrag|mindestlohn|teilzeit|befristung|entgeltfortzahlung|mutterschutz|elternzeit|urlaubsanspruch|betriebsübergang|abfindung|arbeitszeugnis|probezeit|überstunden/i.test(text)) {
    return 'Arbeitsrecht';
  }

  // Mietrecht
  if (/miet(recht|vertrag|erhöhung|spiegel|preisbremse)|vermieter|mieter|nebenkosten|betriebskosten|kaution|eigenbedarf|wohnung(s|smarkt)?|mietrückstand|schönheitsreparatur|modernisierung|staffelmiete/i.test(text)) {
    return 'Mietrecht';
  }

  // Datenschutz
  if (/dsgvo|datenschutz|personenbezogen|datenverarbeitung|datenpanne|aufsichtsbehörde|einwilligung|auftragsverarbeitung|betroffenenrecht|privacy|data protection|cookie|tracking|löschung.*daten|bdsg/i.test(text)) {
    return 'Datenschutz';
  }

  // Kaufrecht
  if (/kauf(recht|vertrag)|gewährleistung|sachmangel|nacherfüllung|mangel(recht|anspruch|haftung)|rücktritt.*kauf|kaufpreis|händler.*garantie|verbrauchsgüterkauf|umtausch/i.test(text)) {
    return 'Kaufrecht';
  }

  // Verbraucherrecht
  if (/verbrauch(er|erschutz)|widerruf(srecht|sfrist)|fernabsatz|online.*(handel|shop)|e-commerce|haustürgeschäft|allgemein.*geschäftsbedingung|agb|button-lösung|preisangabe/i.test(text)) {
    return 'Verbraucherrecht';
  }

  // Steuerrecht
  if (/steuer(recht|erklärung|bescheid|hinterziehung)|finanzamt|einkommensteuer|umsatzsteuer|gewerbesteuer|körperschaftsteuer|abgabenordnung|steuerfestsetzung|bfh/i.test(text)) {
    return 'Steuerrecht';
  }

  // Gesellschaftsrecht
  if (/gesellschaft(srecht|svertrag|erversammlung)|gmbh|aktiengesellschaft|geschäftsführer|vorstand|aufsichtsrat|handelsregister|kapitalgesellschaft|personengesellschaft|kommanditgesellschaft/i.test(text)) {
    return 'Gesellschaftsrecht';
  }

  // Insolvenzrecht
  if (/insolvenz(recht|verfahren|antrag|verwalter)|zahlungsunfähigkeit|überschuldung|gläubiger(versammlung)?|schuldner|restschuldbefreiung|insolvenzplan/i.test(text)) {
    return 'Insolvenzrecht';
  }

  // A6: Energierecht
  if (/energierecht|energieversorgung|erneuerbare|eeg|stromlieferung|netzentgelt|gasversorgung|energiewende/i.test(text)) {
    return 'Energierecht';
  }

  // A6: Telekommunikationsrecht
  if (/telekommunikation|tkg|netzneutralität|fernmeldegeheimnis|roaming|breitband/i.test(text)) {
    return 'Telekommunikationsrecht';
  }

  // A6: Transportrecht
  if (/transport(recht)?|spedition|frachtvertrag|frachtführer|cmt|hgb.*407/i.test(text)) {
    return 'Transportrecht';
  }

  // A6: Patentrecht/Markenrecht
  if (/patent(recht|gesetz)?|gebrauchsmuster|designschutz/i.test(text)) {
    return 'Patentrecht';
  }
  if (/marke(nrecht|ngesetz)|markeninhaber/i.test(text)) {
    return 'Markenrecht';
  }

  // A6: Umweltrecht
  if (/umwelt(recht|schutz)|emission|klimaschutz|bundes-immissionsschutz|naturschutz/i.test(text)) {
    return 'Umweltrecht';
  }

  // C1: EU-Recht (before IT-Recht so explicit EU markers take priority)
  if (/eu-verordnung|eu-richtlinie|digital services act|dsa\b|dma\b|ai act|data act|cyber resilience|europäische kommission|eu-kommission/i.test(text)) {
    return 'EU-Recht';
  }

  // Versicherungsrecht
  if (/versicherung(srecht|svertrag|snehmer|sschutz|sbedingung)|vvg|versicherer|prämie(nanpassung)?|deckung(summe|sschutz)|schadenfall|haftpflicht|rechtsschutzversicherung|lebensversicherung|kaskoversicherung/i.test(text)) {
    return 'Versicherungsrecht';
  }

  // Bankrecht/Finanzrecht
  if (/bank(recht|aufsicht|geheimnis)|finanz(recht|aufsicht|dienstleistung)|kredit(recht|vertrag|institut)|bafin|zahlungsdienste|wertpapier|anlageberatung|einlagensicherung|geldwäsche|kreditwesengesetz|kwg|zahlungsverkehr/i.test(text)) {
    return 'Bankrecht';
  }

  // IT-Recht
  if (/it-recht|softwarevertrag|lizenzrecht|cloud|saas|hosting|digitale.*dienste|plattformregulierung|cyber(sicherheit|angriff)|nis-?2|kritis/i.test(text)) {
    return 'IT-Recht';
  }

  // Wettbewerbsrecht
  if (/wettbewerb(srecht|sverbot|swidrig)|uwg|kartell(recht|verbot|amt)|bundeskartellamt|marktmissbrauch|preisabsprache|fusionskontrolle|beihilfe(recht|kontrolle)/i.test(text)) {
    return 'Wettbewerbsrecht';
  }

  // Urheberrecht
  if (/urheber(recht|rechtsgesetz)|copyright|lizenzgebühr|nutzungsrecht|verwertungsrecht|urheberrechtsverletzung|filesharing|kreativwirtschaft/i.test(text)) {
    return 'Urheberrecht';
  }

  // Baurecht
  if (/bau(recht|vertrag|ordnung|genehmigung|vorhaben)|hoai|architekt(envertrag)?|bauträger|werkvertrag.*bau|bauabnahme|baumangel|schwarzbau/i.test(text)) {
    return 'Baurecht';
  }

  // Sozialrecht
  if (/sozial(recht|versicherung|gesetzbuch|leistung)|sgb|rente(nrecht|nversicherung|nanspruch)|arbeitslosengeld|bürgergeld|krankenkasse|pflegeversicherung|sozialamt/i.test(text)) {
    return 'Sozialrecht';
  }

  // Handelsrecht
  if (/handels(recht|gesetzbuch|register|geschäft)|hgb|kaufmann|rügepflicht|handels(brauch|vertreter)|prokura|firma|wettbewerbsverbot/i.test(text)) {
    return 'Handelsrecht';
  }

  // Vertragsrecht (broad catch-all for contract-related)
  if (/vertrag(srecht|sschluss|sstrafe|sverletzung)|schuld(recht|verhältnis)|haftung|schadensersatz|verjährung|bürgschaft|werkvertrag|dienstvertrag|pflichtverletzung|verzug|anfechtung|arglist/i.test(text)) {
    return 'Vertragsrecht';
  }

  // Default based on feed category
  return null;
}

/**
 * Detect ALL matching legal areas from title and summary text (A4: Multi-Area).
 * Returns array of areas, e.g. ["Datenschutz", "Arbeitsrecht"].
 */
function detectAllLegalAreas(title, summary = '') {
  const text = `${title} ${summary}`.replace(/<[^>]*>/g, ' ').toLowerCase();
  const areas = [];

  if (/arbeit(s|nehmer|geber|srecht|svertrag|sverhältnis|szeit)|kündigungs(schutz|frist)|betriebsrat|tarifvertrag|mindestlohn|teilzeit|befristung|entgeltfortzahlung|mutterschutz|elternzeit|urlaubsanspruch|betriebsübergang|abfindung|arbeitszeugnis|probezeit|überstunden/i.test(text)) {
    areas.push('Arbeitsrecht');
  }
  if (/miet(recht|vertrag|erhöhung|spiegel|preisbremse)|vermieter|mieter|nebenkosten|betriebskosten|kaution|eigenbedarf|wohnung(s|smarkt)?|mietrückstand|schönheitsreparatur|modernisierung|staffelmiete/i.test(text)) {
    areas.push('Mietrecht');
  }
  if (/dsgvo|datenschutz|personenbezogen|datenverarbeitung|datenpanne|aufsichtsbehörde|einwilligung|auftragsverarbeitung|betroffenenrecht|privacy|data protection|cookie|tracking|löschung.*daten|bdsg/i.test(text)) {
    areas.push('Datenschutz');
  }
  if (/kauf(recht|vertrag)|gewährleistung|sachmangel|nacherfüllung|mangel(recht|anspruch|haftung)|rücktritt.*kauf|kaufpreis|händler.*garantie|verbrauchsgüterkauf|umtausch/i.test(text)) {
    areas.push('Kaufrecht');
  }
  if (/verbrauch(er|erschutz)|widerruf(srecht|sfrist)|fernabsatz|online.*(handel|shop)|e-commerce|haustürgeschäft|allgemein.*geschäftsbedingung|agb|button-lösung|preisangabe/i.test(text)) {
    areas.push('Verbraucherrecht');
  }
  if (/steuer(recht|erklärung|bescheid|hinterziehung)|finanzamt|einkommensteuer|umsatzsteuer|gewerbesteuer|körperschaftsteuer|abgabenordnung|steuerfestsetzung|bfh/i.test(text)) {
    areas.push('Steuerrecht');
  }
  if (/gesellschaft(srecht|svertrag|erversammlung)|gmbh|aktiengesellschaft|geschäftsführer|vorstand|aufsichtsrat|handelsregister|kapitalgesellschaft|personengesellschaft|kommanditgesellschaft/i.test(text)) {
    areas.push('Gesellschaftsrecht');
  }
  if (/insolvenz(recht|verfahren|antrag|verwalter)|zahlungsunfähigkeit|überschuldung|gläubiger(versammlung)?|schuldner|restschuldbefreiung|insolvenzplan/i.test(text)) {
    areas.push('Insolvenzrecht');
  }
  if (/energierecht|energieversorgung|erneuerbare|eeg|stromlieferung|netzentgelt|gasversorgung|energiewende/i.test(text)) {
    areas.push('Energierecht');
  }
  if (/telekommunikation|tkg|netzneutralität|fernmeldegeheimnis|roaming|breitband/i.test(text)) {
    areas.push('Telekommunikationsrecht');
  }
  if (/transport(recht)?|spedition|frachtvertrag|frachtführer|cmt|hgb.*407/i.test(text)) {
    areas.push('Transportrecht');
  }
  if (/patent(recht|gesetz)?|gebrauchsmuster|designschutz/i.test(text)) {
    areas.push('Patentrecht');
  }
  if (/marke(nrecht|ngesetz)|markeninhaber/i.test(text)) {
    areas.push('Markenrecht');
  }
  if (/umwelt(recht|schutz)|emission|klimaschutz|bundes-immissionsschutz|naturschutz/i.test(text)) {
    areas.push('Umweltrecht');
  }
  if (/versicherung(srecht|svertrag|snehmer|sschutz|sbedingung)|vvg|versicherer|prämie(nanpassung)?|deckung(summe|sschutz)|schadenfall|haftpflicht|rechtsschutzversicherung|lebensversicherung|kaskoversicherung/i.test(text)) {
    areas.push('Versicherungsrecht');
  }
  if (/bank(recht|aufsicht|geheimnis)|finanz(recht|aufsicht|dienstleistung)|kredit(recht|vertrag|institut)|bafin|zahlungsdienste|wertpapier|anlageberatung|einlagensicherung|geldwäsche|kreditwesengesetz|kwg|zahlungsverkehr/i.test(text)) {
    areas.push('Bankrecht');
  }
  if (/it-recht|softwarevertrag|lizenzrecht|cloud|saas|hosting|digitale.*dienste|plattformregulierung|cyber(sicherheit|angriff)|nis-?2|kritis/i.test(text)) {
    areas.push('IT-Recht');
  }
  if (/wettbewerb(srecht|sverbot|swidrig)|uwg|kartell(recht|verbot|amt)|bundeskartellamt|marktmissbrauch|preisabsprache|fusionskontrolle|beihilfe(recht|kontrolle)/i.test(text)) {
    areas.push('Wettbewerbsrecht');
  }
  if (/urheber(recht|rechtsgesetz)|copyright|lizenzgebühr|nutzungsrecht|verwertungsrecht|urheberrechtsverletzung|filesharing|kreativwirtschaft/i.test(text)) {
    areas.push('Urheberrecht');
  }
  if (/bau(recht|vertrag|ordnung|genehmigung|vorhaben)|hoai|architekt(envertrag)?|bauträger|werkvertrag.*bau|bauabnahme|baumangel|schwarzbau/i.test(text)) {
    areas.push('Baurecht');
  }
  if (/sozial(recht|versicherung|gesetzbuch|leistung)|sgb|rente(nrecht|nversicherung|nanspruch)|arbeitslosengeld|bürgergeld|krankenkasse|pflegeversicherung|sozialamt/i.test(text)) {
    areas.push('Sozialrecht');
  }
  if (/eu-verordnung|eu-richtlinie|digital services act|dsa\b|dma\b|ai act|data act|cyber resilience|europäische kommission|eu-kommission/i.test(text)) {
    areas.push('EU-Recht');
  }
  if (/handels(recht|gesetzbuch|register|geschäft)|hgb|kaufmann|rügepflicht|handels(brauch|vertreter)|prokura|firma|wettbewerbsverbot/i.test(text)) {
    areas.push('Handelsrecht');
  }
  if (/vertrag(srecht|sschluss|sstrafe|sverletzung)|schuld(recht|verhältnis)|haftung|schadensersatz|verjährung|bürgschaft|werkvertrag|dienstvertrag|pflichtverletzung|verzug|anfechtung|arglist/i.test(text)) {
    areas.push('Vertragsrecht');
  }

  return areas;
}

/**
 * Detect the legislative status of a law change from its title and content.
 * Returns: 'proposal' | 'passed' | 'effective' | 'court_decision' | 'guideline' | 'unknown'
 */
function detectLawStatus(title, summary = '', feedCategory = '') {
  // Strip HTML tags that RSS feeds sometimes include
  const text = `${title} ${summary}`.replace(/<[^>]*>/g, ' ').toLowerCase();
  const cat = feedCategory.toLowerCase();

  // Court decisions (from Bundesgerichte feeds)
  if (cat === 'rechtsprechung' || cat === 'verfassungsrecht' || cat === 'patentrecht' ||
    /\b(urteil|beschluss|entscheidung|bgh|bag|bverfg|bfh|bsg|bverwg|bpatg|gericht|kammer|senat|revisionsurteil|leitsatz)\b/i.test(text)) {
    return 'court_decision';
  }

  // Proposals & drafts
  if (/\b(entwurf|gesetzentwurf|referentenentwurf|kabinettsentwurf|vorschlag|richtlinienvorschlag|anhörung|konsultation|stellungnahme|beratung|1\.\s*lesung|2\.\s*lesung|3\.\s*lesung|ausschuss.*empf|geplant|soll.*gelten)\b/i.test(text)) {
    return 'proposal';
  }

  // Passed but not yet effective
  if (/\b(beschlossen|verabschiedet|zugestimmt|gebilligt|angenommen|verkündet|inkrafttreten|wird.*gelten\s*ab)\b/i.test(text) || /tritt.*in\s*kraft/i.test(text)) {
    return 'passed';
  }

  // Already in effect
  if (/\b(in\s*kraft\s*getreten|gilt\s*seit|wirksam\s*seit|geltend|neuregelung|neue\s*fassung|geändert\s*durch|novelliert|aktualisiert)\b/i.test(text)) {
    return 'effective';
  }

  // Guidelines & recommendations from authorities
  if (/\b(leitlinie|leitfaden|empfehlung|orientierungshilfe|hinweis|handreichung|merkblatt|faq|rundschreiben|mitteilung|aufsichtsbehörd)\b/i.test(text)) {
    return 'guideline';
  }

  return 'unknown';
}

/**
 * Map RSS feed category to Legal Pulse area
 */
function mapFeedCategoryToArea(feedCategory) {
  const mapping = {
    'arbeitsrecht': 'Arbeitsrecht',
    'steuerrecht': 'Steuerrecht',
    'verbraucherrecht': 'Verbraucherrecht',
    'mietrecht': 'Mietrecht',
    'datenschutz': 'Datenschutz',
    'rechtsprechung': null, // A2: BGH-Urteile → per Content-Analyse klassifizieren, nicht pauschal
    'verfassungsrecht': 'Verfassungsrecht',
    'sozialrecht': 'Sozialrecht',
    'verwaltungsrecht': 'Verwaltungsrecht',
    'patentrecht': 'Patentrecht',
    // C1/C2
    'eu_recht': 'EU-Recht',
    'finanzrecht': 'Finanzrecht',
    'regulierung': 'Regulierung',
  };
  return mapping[feedCategory] || null;
}

// ═══════════════════════════════════════════════════
// FETCH WITH RETRY LOGIC
// ═══════════════════════════════════════════════════

/**
 * Sleep helper
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Fetch and parse a single RSS feed with retry logic
 */
async function fetchFeed(feedId, feedConfig) {
  if (!feedConfig.enabled) {
    return [];
  }

  const health = getFeedHealth(feedId);
  const maxRetries = 3;
  const baseDelay = 1000; // 1s, 3s, 9s exponential backoff

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const feed = await parser.parseURL(feedConfig.url);

      const items = feed.items.map(item => ({
        source: 'rss',
        feedId,
        feedName: feedConfig.name,
        category: feedConfig.category,
        title: item.title || 'Untitled',
        link: item.link || null,
        date: item.isoDate ? new Date(item.isoDate) : (item.pubDate ? new Date(item.pubDate) : new Date()),
        summary: item.summary || item.contentSnippet || item.content || '',
        fullContent: item.fullContent || null,
        author: item.author || item.creator || null,
        categories: item.categories || [],
        guid: item.guid || item.link || `${feedId}-${Date.now()}`
      }));

      // Update health tracking
      health.lastSuccessfulFetch = new Date();
      health.consecutiveFailures = 0;
      health.lastError = null;
      health.totalFetches++;
      health.totalItems += items.length;

      if (attempt > 1) {
        console.log(`   [RSS] ${feedConfig.name}: ${items.length} items (retry ${attempt} succeeded)`);
      }

      return items;

    } catch (error) {
      health.consecutiveFailures++;
      health.lastError = error.message;

      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(3, attempt - 1);
        console.warn(`   [RSS] ${feedConfig.name} attempt ${attempt} failed, retrying in ${delay}ms...`);
        await sleep(delay);
      } else {
        console.error(`   [RSS] ${feedConfig.name} failed after ${maxRetries} attempts: ${error.message}`);

        // Auto-disable after 10 consecutive failures
        if (health.consecutiveFailures >= 10) {
          console.warn(`   [RSS] AUTO-DISABLING ${feedConfig.name} after ${health.consecutiveFailures} consecutive failures`);
          feedConfig.enabled = false;
        }

        return [];
      }
    }
  }

  return [];
}

/**
 * Fetch all enabled RSS feeds
 */
async function fetchAllFeeds({ feeds = null, maxAge = 30 } = {}) {
  try {
    console.log('[RSS] Fetching legal RSS feeds...');

    const feedsToFetch = feeds
      ? feeds.filter(id => LEGAL_RSS_FEEDS[id]).map(id => [id, LEGAL_RSS_FEEDS[id]])
      : Object.entries(LEGAL_RSS_FEEDS);

    const enabledCount = feedsToFetch.filter(([, config]) => config.enabled).length;
    console.log(`[RSS] ${enabledCount} active feeds of ${feedsToFetch.length} total`);

    const results = await Promise.allSettled(
      feedsToFetch.map(([id, config]) => fetchFeed(id, config))
    );

    const allItems = results
      .filter(r => r.status === 'fulfilled')
      .flatMap(r => r.value);

    // Filter by age if specified
    if (maxAge) {
      const cutoffDate = new Date(Date.now() - maxAge * 86400000);
      const filteredItems = allItems.filter(item => item.date >= cutoffDate);
      console.log(`[RSS] Total: ${allItems.length} items, after ${maxAge}d filter: ${filteredItems.length}`);
      return filteredItems;
    }

    console.log(`[RSS] Total items fetched: ${allItems.length}`);
    return allItems;

  } catch (error) {
    console.error('[RSS] Failed to fetch feeds:', error);
    return [];
  }
}

/**
 * Search RSS items by keyword
 */
async function searchFeeds(query, options = {}) {
  const items = await fetchAllFeeds(options);
  const lowerQuery = query.toLowerCase();

  return items.filter(item =>
    item.title.toLowerCase().includes(lowerQuery) ||
    item.summary.toLowerCase().includes(lowerQuery) ||
    (item.fullContent && item.fullContent.toLowerCase().includes(lowerQuery))
  );
}

/**
 * Get feed statistics including health data
 */
function getFeedStats() {
  const total = Object.keys(LEGAL_RSS_FEEDS).length;
  const enabled = Object.values(LEGAL_RSS_FEEDS).filter(f => f.enabled).length;
  const disabled = total - enabled;

  return {
    total,
    enabled,
    disabled,
    feeds: Object.entries(LEGAL_RSS_FEEDS).map(([id, config]) => ({
      id,
      name: config.name,
      category: config.category,
      enabled: config.enabled,
      health: feedHealth[id] || null
    }))
  };
}

/**
 * Enable/disable a specific feed
 */
function toggleFeed(feedId, enabled) {
  if (LEGAL_RSS_FEEDS[feedId]) {
    LEGAL_RSS_FEEDS[feedId].enabled = enabled;
    if (enabled) {
      // Reset consecutive failures when re-enabling
      const health = getFeedHealth(feedId);
      health.consecutiveFailures = 0;
    }
    return true;
  }
  return false;
}

/**
 * Normalize RSS items to match legal pulse format
 * Now includes intelligent area detection
 */
function normalizeForLegalPulse(items) {
  return items.map(item => {
    // Detect legal area from content
    const detectedArea = detectLegalArea(item.title, item.summary);
    // A4: Detect ALL matching areas for cross-cutting laws
    const allDetectedAreas = detectAllLegalAreas(item.title, item.summary);
    // Fallback to feed category mapping
    const feedArea = mapFeedCategoryToArea(item.category);
    // Use detected area, fallback to feed area, fallback to 'Vertragsrecht'
    const area = detectedArea || feedArea || 'Vertragsrecht';

    // Build areas array: primary + all detected (deduplicated)
    const areasSet = new Set([area, ...allDetectedAreas]);
    if (feedArea) areasSet.add(feedArea);
    const areas = [...areasSet];

    // Detect legislative status
    const lawStatus = detectLawStatus(item.title, item.summary, item.category);

    return {
      source: 'rss',
      feedId: item.feedId,
      lawId: item.guid || `rss-${item.feedId}-${Date.now()}`,
      sectionId: item.guid,
      title: item.title,
      summary: item.summary.substring(0, 500),
      description: item.summary,
      url: item.link,
      area,
      areas, // A4: All detected areas for multi-area matching
      lawStatus,
      updatedAt: item.date,
      createdAt: new Date(),
      metadata: {
        feedName: item.feedName,
        author: item.author,
        categories: item.categories,
        fullContent: item.fullContent,
        detectedArea,
        feedCategory: item.category
      }
    };
  });
}

/**
 * Get health report for all feeds (used by health endpoint)
 */
function getFeedHealthReport() {
  return LEGAL_RSS_FEEDS.map(feed => ({
    id: feed.id,
    name: feed.name,
    enabled: feed.enabled,
    category: feed.category,
    consecutiveFailures: feedHealth[feed.id]?.consecutiveFailures || 0,
    lastSuccessfulFetch: feedHealth[feed.id]?.lastSuccessfulFetch || null,
    lastError: feedHealth[feed.id]?.lastError || null,
    totalFetches: feedHealth[feed.id]?.totalFetches || 0,
    totalItems: feedHealth[feed.id]?.totalItems || 0
  }));
}

module.exports = {
  fetchFeed,
  fetchAllFeeds,
  searchFeeds,
  getFeedStats,
  toggleFeed,
  normalizeForLegalPulse,
  detectLegalArea,
  detectAllLegalAreas,
  detectLawStatus,
  getFeedHealthReport,
  LEGAL_RSS_FEEDS
};
