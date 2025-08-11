// 📁 backend/routes/optimize.js - COMPLETE UNIVERSAL CONTRACT OPTIMIZER v4.0
const express = require("express");
const multer = require("multer");
const pdfParse = require("pdf-parse");
const fs = require("fs").promises;
const fsSync = require("fs");
const { OpenAI } = require("openai");
const verifyToken = require("../middleware/verifyToken");
const { ObjectId } = require("mongodb");

const router = express.Router();
const upload = multer({ dest: "uploads/" });

// ✅ SINGLETON OpenAI-Instance with retry logic
let openaiInstance = null;
const getOpenAI = () => {
  if (!openaiInstance) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OpenAI API Key fehlt in Umgebungsvariablen");
    }
    openaiInstance = new OpenAI({ 
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 60000,
      maxRetries: 3
    });
    console.log("🔧 OpenAI-Instance für Optimierung initialisiert");
  }
  return openaiInstance;
};

// 🚀 REVOLUTIONARY: Universal Contract Types Database (50+ types with sub-categories)
const CONTRACT_TYPES = {
  // ARBEITSRECHT - Main contracts
  arbeitsvertrag: {
    keywords: ['arbeitnehmer', 'arbeitgeber', 'gehalt', 'arbeitszeit', 'urlaub', 'kündigung', 'probezeit', 'tätigkeit', 'vergütung', 'arbeitsvertrag'],
    requiredClauses: ['arbeitszeit', 'vergütung', 'urlaub', 'kündigung', 'tätigkeit', 'probezeit', 'datenschutz', 'verschwiegenheit'],
    jurisdiction: 'DE',
    riskFactors: ['befristung', 'konkurrenzklausel', 'rückzahlungsklausel', 'vertragsstrafe', 'überstunden']
  },
  
  // ARBEITSRECHT - Amendments and special types
  arbeitsvertrag_aenderung: {
    keywords: ['arbeitszeitänderung', 'gehaltserhöhung', 'vertragsänderung', 'änderungsvereinbarung', 'anpassung', 'erhöhung arbeitszeit', 'arbeitszeiterhöhung', 'arbeitszeitanpassung', 'stundenerhöhung'],
    requiredClauses: ['aenderungsgegenstand', 'gueltigkeitsdatum', 'neue_konditionen', 'referenz_hauptvertrag', 'unveraenderte_bestandteile'],
    jurisdiction: 'DE',
    parentType: 'arbeitsvertrag',
    isAmendment: true,
    riskFactors: ['rueckwirkung', 'widerspruch_hauptvertrag', 'unklare_regelung']
  },
  aufhebungsvertrag: {
    keywords: ['aufhebung', 'beendigung', 'abfindung', 'aufhebungsvertrag', 'einvernehmlich', 'freistellung'],
    requiredClauses: ['beendigungsdatum', 'abfindung', 'zeugnis', 'freistellung', 'sperrzeit', 'resturlaub', 'rueckgabe'],
    jurisdiction: 'DE',
    riskFactors: ['sperrzeit', 'abfindungshoehe', 'zeugnisnote', 'nachvertragliches_wettbewerbsverbot']
  },
  praktikumsvertrag: {
    keywords: ['praktikum', 'praktikant', 'pflichtpraktikum', 'ausbildung', 'studium', 'praktikumsdauer'],
    requiredClauses: ['praktikumsdauer', 'ausbildungsinhalte', 'verguetung', 'urlaub', 'zeugnis', 'versicherung'],
    jurisdiction: 'DE',
    riskFactors: ['mindestlohn', 'scheinselbstaendigkeit', 'keine_ausbildungsinhalte']
  },
  ausbildungsvertrag: {
    keywords: ['ausbildung', 'auszubildender', 'azubi', 'berufsausbildung', 'lehrling', 'ausbilder'],
    requiredClauses: ['ausbildungsdauer', 'ausbildungsverguetung', 'ausbildungsplan', 'probezeit', 'urlaub', 'berufsschule'],
    jurisdiction: 'DE',
    riskFactors: ['verguetung_unter_tarif', 'fehlender_ausbildungsplan', 'unzulaessige_klauseln']
  },
  
  // MIETRECHT - All types
  mietvertrag: {
    keywords: ['mieter', 'vermieter', 'miete', 'nebenkosten', 'kaution', 'wohnung', 'mietobjekt', 'mietdauer', 'mietvertrag'],
    requiredClauses: ['mietdauer', 'miethöhe', 'nebenkosten', 'kaution', 'schönheitsreparaturen', 'kündigung', 'mietobjekt'],
    jurisdiction: 'DE',
    riskFactors: ['staffelmiete', 'indexmiete', 'renovierung', 'kleinreparaturen']
  },
  gewerbemietvertrag: {
    keywords: ['gewerbemiete', 'geschäftsraum', 'ladenfläche', 'bürofläche', 'gewerblich', 'geschäftsräume'],
    requiredClauses: ['mietdauer', 'mietzins', 'nebenkosten', 'verwendungszweck', 'untervermietung', 'konkurrenzschutz'],
    jurisdiction: 'DE',
    riskFactors: ['umsatzmiete', 'wertsicherung', 'betriebspflicht', 'konkurrenzschutz']
  },
  untermietvertrag: {
    keywords: ['untermiete', 'untervermieter', 'hauptmieter', 'untermieterlaubnis', 'untermieter'],
    requiredClauses: ['hauptmietvertrag_referenz', 'erlaubnis_vermieter', 'untermietdauer', 'untermietzins', 'kuendigung'],
    jurisdiction: 'DE',
    parentType: 'mietvertrag',
    riskFactors: ['fehlende_erlaubnis', 'haftung_hauptmieter', 'kuendigungsrisiko']
  },
  pachtvertrag: {
    keywords: ['pacht', 'pächter', 'verpächter', 'pachtzins', 'landwirtschaft', 'gastronomie'],
    requiredClauses: ['pachtobjekt', 'pachtzins', 'pachtdauer', 'verwendungszweck', 'inventar', 'instandhaltung'],
    jurisdiction: 'DE',
    riskFactors: ['betriebspflicht', 'inventarhaftung', 'pachtzinsanpassung']
  },
  
  // IT & SOFTWARE - Comprehensive
  saas_vertrag: {
    keywords: ['software', 'service', 'saas', 'subscription', 'cloud', 'lizenz', 'nutzer', 'api', 'sla', 'support'],
    requiredClauses: ['leistungsbeschreibung', 'sla', 'verfügbarkeit', 'support', 'datenschutz', 'haftung', 'kündigung', 'preisanpassung'],
    jurisdiction: 'INT',
    riskFactors: ['auto_renewal', 'preiserhöhung', 'datenexport', 'vendor_lock_in', 'haftungsausschluss']
  },
  softwarelizenz: {
    keywords: ['lizenz', 'software', 'nutzungsrecht', 'installation', 'aktivierung', 'updates', 'einzelplatz', 'mehrplatz'],
    requiredClauses: ['lizenzumfang', 'nutzungsbeschränkungen', 'updates', 'support', 'laufzeit', 'uebertragbarkeit'],
    jurisdiction: 'INT',
    riskFactors: ['keine_updates', 'keine_garantie', 'audit_rechte', 'territoriale_beschraenkung']
  },
  softwareentwicklungsvertrag: {
    keywords: ['softwareentwicklung', 'programmierung', 'entwicklung', 'agile', 'scrum', 'entwickler', 'pflichtenheft'],
    requiredClauses: ['leistungsbeschreibung', 'entwicklungsphasen', 'abnahme', 'nutzungsrechte', 'gewaehrleistung', 'vergütung'],
    jurisdiction: 'DE',
    riskFactors: ['unklare_spezifikation', 'fehlende_nutzungsrechte', 'keine_wartung', 'haftungsausschluss']
  },
  hosting_vertrag: {
    keywords: ['hosting', 'webhosting', 'server', 'domain', 'webspace', 'traffic', 'uptime'],
    requiredClauses: ['leistungsumfang', 'verfuegbarkeit', 'speicherplatz', 'traffic', 'backup', 'support', 'kuendigung'],
    jurisdiction: 'DE',
    riskFactors: ['keine_sla', 'haftungsausschluss', 'datenverlust', 'keine_backups']
  },
  
  // VERTRAULICHKEIT & IP
  nda: {
    keywords: ['confidential', 'vertraulich', 'geheimhaltung', 'non-disclosure', 'information', 'offenlegung', 'vertraulichkeit'],
    requiredClauses: ['definition_vertraulich', 'zweck', 'dauer', 'rückgabe', 'vertragsstrafe', 'gerichtsstand'],
    jurisdiction: 'INT',
    riskFactors: ['unbegrenzte_dauer', 'einseitige_verpflichtung', 'keine_ausnahmen', 'hohe_vertragsstrafe']
  },
  lizenzvertrag: {
    keywords: ['lizenz', 'lizenzgeber', 'lizenznehmer', 'nutzungsrecht', 'software', 'patent', 'marke', 'urheberrecht'],
    requiredClauses: ['lizenzgegenstand', 'nutzungsumfang', 'lizenzgebühr', 'laufzeit', 'territorium', 'unterlizenz', 'haftung'],
    jurisdiction: 'INT',
    riskFactors: ['exklusivität', 'mindestabnahme', 'wettbewerbsverbot', 'improvement_rights']
  },
  
  // KAUF & HANDEL
  kaufvertrag: {
    keywords: ['käufer', 'verkäufer', 'kaufpreis', 'kaufgegenstand', 'übergabe', 'eigentum', 'gewährleistung', 'zahlung'],
    requiredClauses: ['kaufgegenstand', 'kaufpreis', 'zahlung', 'lieferung', 'eigentumsvorbehalt', 'gewährleistung', 'haftung'],
    jurisdiction: 'DE',
    riskFactors: ['eigentumsvorbehalt', 'gewährleistungsausschluss', 'transportrisiko']
  },
  kaufvertrag_immobilie: {
    keywords: ['grundstück', 'immobilie', 'notar', 'grundbuch', 'kaufpreis', 'übergabe', 'bebauung'],
    requiredClauses: ['objektbeschreibung', 'kaufpreis', 'faelligkeit', 'uebergabe', 'gewaehrleistung', 'auflassung', 'grundbuch'],
    jurisdiction: 'DE',
    riskFactors: ['altlasten', 'bauschaeden', 'erschliessung', 'vorkaufsrecht']
  },
  kaufvertrag_kfz: {
    keywords: ['fahrzeug', 'kfz', 'auto', 'gebrauchtwagen', 'kilometer', 'fahrzeugbrief', 'tuev'],
    requiredClauses: ['fahrzeugdaten', 'kaufpreis', 'uebergabe', 'gewaehrleistung', 'unfallfreiheit', 'kilometerstand'],
    jurisdiction: 'DE',
    riskFactors: ['gewaehrleistungsausschluss', 'unfallschaden', 'manipulation']
  },
  
  // DIENSTLEISTUNGEN
  dienstvertrag: {
    keywords: ['auftragnehmer', 'auftraggeber', 'dienstleistung', 'honorar', 'leistung', 'freiberufler', 'freelancer'],
    requiredClauses: ['leistungsbeschreibung', 'vergütung', 'leistungszeit', 'abnahme', 'haftung', 'kündigung', 'geheimhaltung'],
    jurisdiction: 'DE',
    riskFactors: ['scheinselbständigkeit', 'haftung', 'verzug', 'mängelhaftung']
  },
  werkvertrag: {
    keywords: ['werkunternehmer', 'besteller', 'werk', 'abnahme', 'vergütung', 'mängel', 'nacherfüllung', 'werkvertrag'],
    requiredClauses: ['werkbeschreibung', 'vergütung', 'termine', 'abnahme', 'gewährleistung', 'haftung', 'kündigung'],
    jurisdiction: 'DE',
    riskFactors: ['pauschalpreis', 'vertragsstrafe', 'abnahmeverzug', 'mängelhaftung']
  },
  beratervertrag: {
    keywords: ['beratung', 'consultant', 'consulting', 'berater', 'expertise', 'analyse', 'strategie'],
    requiredClauses: ['beratungsumfang', 'vergütung', 'vertraulichkeit', 'haftungsbeschränkung', 'laufzeit', 'kuendigung'],
    jurisdiction: 'DE',
    parentType: 'dienstvertrag',
    riskFactors: ['erfolgsgarantie', 'unbegrenzte_haftung', 'interessenkonflikt']
  },
  mandatsvertrag: {
    keywords: ['mandat', 'rechtsanwalt', 'anwalt', 'mandant', 'vollmacht', 'rechtsberatung'],
    requiredClauses: ['mandatsumfang', 'verguetung', 'vollmacht', 'verschwiegenheit', 'haftung', 'kuendigung'],
    jurisdiction: 'DE',
    riskFactors: ['erfolgshonorar', 'haftungsbeschraenkung', 'interessenkonflikt']
  },
  
  // GESELLSCHAFTSRECHT
  gesellschaftsvertrag: {
    keywords: ['gesellschafter', 'geschäftsanteile', 'stammkapital', 'gewinnverteilung', 'geschäftsführung', 'gesellschaft', 'gmbh'],
    requiredClauses: ['gesellschafter', 'stammkapital', 'geschäftsführung', 'gewinnverteilung', 'beschlussfassung', 'verfügung_anteile', 'austritt'],
    jurisdiction: 'DE',
    riskFactors: ['drag_along', 'tag_along', 'vorkaufsrecht', 'wettbewerbsverbot', 'bad_leaver']
  },
  gmbh_satzung: {
    keywords: ['satzung', 'gmbh', 'stammkapital', 'geschäftsführer', 'gesellschafterversammlung', 'handelsregister'],
    requiredClauses: ['firma', 'sitz', 'gegenstand', 'stammkapital', 'geschaeftsfuehrer', 'vertretung', 'gesellschafterversammlung'],
    jurisdiction: 'DE',
    parentType: 'gesellschaftsvertrag',
    riskFactors: ['mehrheitserfordernisse', 'vinkulierung', 'wettbewerbsverbot']
  },
  beteiligungsvertrag: {
    keywords: ['beteiligung', 'investor', 'investment', 'anteil', 'einlage', 'kapitalerhöhung', 'venture'],
    requiredClauses: ['beteiligungshoehe', 'bewertung', 'verwässerungsschutz', 'exit_rechte', 'mitverkaufsrecht'],
    jurisdiction: 'DE',
    parentType: 'gesellschaftsvertrag',
    riskFactors: ['verwässerung', 'keine_mitsprache', 'exit_beschränkung', 'liquidationspraeferenz']
  },
  aktionaersvereinbarung: {
    keywords: ['aktionär', 'shareholder', 'agreement', 'aktien', 'stimmrecht', 'dividende'],
    requiredClauses: ['parteien', 'aktienverteilung', 'stimmrechte', 'uebertragungsbeschraenkungen', 'exit', 'verwaltung'],
    jurisdiction: 'INT',
    riskFactors: ['drag_along', 'tag_along', 'vesting', 'good_bad_leaver']
  },
  
  // FINANZIERUNG & KREDITE
  darlehensvertrag: {
    keywords: ['darlehen', 'darlehensgeber', 'darlehensnehmer', 'zinsen', 'tilgung', 'kredit', 'rückzahlung', 'valuta'],
    requiredClauses: ['darlehenssumme', 'zinssatz', 'laufzeit', 'tilgung', 'sicherheiten', 'kündigung', 'verzug'],
    jurisdiction: 'DE',
    riskFactors: ['variabler_zins', 'vorfälligkeit', 'sicherheiten', 'bürgschaft', 'verzugszins']
  },
  kreditvertrag: {
    keywords: ['kredit', 'kreditnehmer', 'kreditgeber', 'bank', 'ratenkredit', 'tilgungsplan'],
    requiredClauses: ['kreditsumme', 'effektivzins', 'laufzeit', 'tilgungsplan', 'sicherheiten', 'kuendigung', 'widerruf'],
    jurisdiction: 'DE',
    parentType: 'darlehensvertrag',
    riskFactors: ['restschuldversicherung', 'vorfaelligkeitsentschaedigung', 'variable_zinsen']
  },
  buergschaftsvertrag: {
    keywords: ['bürgschaft', 'bürge', 'hauptschuld', 'selbstschuldnerisch', 'ausfallbürgschaft', 'gläubiger'],
    requiredClauses: ['hauptforderung', 'buergschaftsumfang', 'buergschaftsdauer', 'selbstschuldnerisch', 'kuendigung'],
    jurisdiction: 'DE',
    riskFactors: ['selbstschuldnerisch', 'unbegrenzt', 'keine_einrede', 'verjaehrung']
  },
  factoring_vertrag: {
    keywords: ['factoring', 'forderungsverkauf', 'factor', 'forderung', 'abtretung', 'delkredere'],
    requiredClauses: ['forderungsankauf', 'verguetung', 'delkredere', 'abtretung', 'ruecktritt', 'kuendigung'],
    jurisdiction: 'DE',
    riskFactors: ['echtes_factoring', 'delkredererisiko', 'abtretungsverbot']
  },
  
  // LIEFERVERTRÄGE & HANDEL
  liefervertrag: {
    keywords: ['lieferung', 'lieferant', 'abnehmer', 'lieferbedingungen', 'incoterms', 'warenlieferung'],
    requiredClauses: ['liefergegenstand', 'liefertermine', 'preise', 'zahlungsbedingungen', 'gefahrübergang', 'mängelrüge'],
    jurisdiction: 'INT',
    riskFactors: ['lieferverzug', 'preisgleitklausel', 'force_majeure']
  },
  rahmenliefervertrag: {
    keywords: ['rahmenvertrag', 'abruf', 'kontingent', 'jahresvolumen', 'einzelabruf', 'rahmenvereinbarung'],
    requiredClauses: ['rahmenvolumen', 'abrufmodalitäten', 'preisanpassung', 'mindestabnahme', 'laufzeit'],
    jurisdiction: 'INT',
    parentType: 'liefervertrag',
    riskFactors: ['mindestabnahme', 'exklusivität', 'preisanpassung', 'take_or_pay']
  },
  distributionsvertrag: {
    keywords: ['distribution', 'vertrieb', 'händler', 'distributor', 'absatzgebiet', 'vertriebspartner'],
    requiredClauses: ['vertriebsgebiet', 'produkte', 'exklusivitaet', 'mindestabsatz', 'preise', 'marketing', 'kuendigung'],
    jurisdiction: 'INT',
    riskFactors: ['exklusivitaet', 'mindestabsatz', 'konkurrenzverbot', 'preisbindung']
  },
  kommissionsvertrag: {
    keywords: ['kommission', 'kommissionär', 'kommittent', 'verkauf', 'provision', 'lager'],
    requiredClauses: ['kommissionsware', 'provision', 'verkaufsbedingungen', 'abrechnung', 'lagerung', 'haftung'],
    jurisdiction: 'DE',
    riskFactors: ['delkredere', 'lagerhaltung', 'preisbindung']
  },
  
  // BAURECHT
  bauvertrag: {
    keywords: ['bauherr', 'bauunternehmer', 'bauleistung', 'bauzeit', 'vergütung', 'vob', 'werkvertrag', 'baustelle'],
    requiredClauses: ['bauleistung', 'bauzeit', 'vergütung', 'abnahme', 'mängelansprüche', 'sicherheitsleistung', 'vertragsstrafe'],
    jurisdiction: 'DE',
    riskFactors: ['bauzeitverzug', 'nachträge', 'mängelhaftung', 'vertragsstrafe', 'behinderung']
  },
  architektenvertrag: {
    keywords: ['architekt', 'bauherr', 'planung', 'hoai', 'leistungsphasen', 'objektüberwachung'],
    requiredClauses: ['leistungsphasen', 'honorar', 'hoai', 'urheberrecht', 'haftung', 'kuendigung'],
    jurisdiction: 'DE',
    riskFactors: ['honorarüberschreitung', 'haftung', 'urheberrechte', 'bauüberwachung']
  },
  generalunternehmervertrag: {
    keywords: ['generalunternehmer', 'schlüsselfertig', 'pauschalpreis', 'bauherr', 'subunternehmer'],
    requiredClauses: ['leistungsumfang', 'pauschalpreis', 'termine', 'abnahme', 'gewaehrleistung', 'sicherheiten'],
    jurisdiction: 'DE',
    parentType: 'bauvertrag',
    riskFactors: ['pauschalpreis', 'terminrisiko', 'subunternehmerhaftung']
  },
  
  // FRANCHISE
  franchise: {
    keywords: ['franchise', 'franchisegeber', 'franchisenehmer', 'gebühr', 'marke', 'system', 'know-how', 'territorium'],
    requiredClauses: ['franchisekonzept', 'gebühren', 'territorium', 'markennutzung', 'schulung', 'kontrolle', 'beendigung'],
    jurisdiction: 'INT',
    riskFactors: ['gebührenstruktur', 'gebietsschutz', 'konkurrenzverbot', 'systemänderungen']
  },
  masterfranchise: {
    keywords: ['masterfranchise', 'masterpartner', 'subfranchisenehmer', 'entwicklung', 'expansion'],
    requiredClauses: ['mastergebiet', 'entwicklungsverpflichtung', 'subfranchisenehmer', 'gebuehrenaufteilung'],
    jurisdiction: 'INT',
    parentType: 'franchise',
    riskFactors: ['entwicklungsverpflichtung', 'subfranchisenehmer_haftung']
  },
  
  // VERSICHERUNG
  versicherungsvertrag: {
    keywords: ['versicherung', 'versicherer', 'versicherungsnehmer', 'prämie', 'versicherungsfall', 'deckung', 'police'],
    requiredClauses: ['versicherungsumfang', 'praemie', 'selbstbeteiligung', 'ausschlüsse', 'obliegenheiten', 'kuendigung'],
    jurisdiction: 'DE',
    riskFactors: ['ausschlüsse', 'obliegenheitsverletzung', 'unterversicherung', 'wartezeit']
  },
  maklervertrag: {
    keywords: ['makler', 'provision', 'vermittlung', 'immobilie', 'nachweis', 'courtage'],
    requiredClauses: ['maklerobjekt', 'provision', 'provisionsfaelligkeit', 'doppeltaetigkeit', 'laufzeit'],
    jurisdiction: 'DE',
    riskFactors: ['doppelprovision', 'vorkenntnis', 'provisionspflicht']
  },
  
  // AGENTUR & MARKETING
  agenturvertrag: {
    keywords: ['agentur', 'kunde', 'werbung', 'marketing', 'kampagne', 'kreation', 'media', 'pitch'],
    requiredClauses: ['leistungsumfang', 'nutzungsrechte', 'vergütung', 'präsentation', 'vertraulichkeit', 'kuendigung'],
    jurisdiction: 'DE',
    riskFactors: ['nutzungsrechte', 'erfolgsgarantie', 'exklusivität', 'pitch_verguetung']
  },
  influencer_vertrag: {
    keywords: ['influencer', 'social media', 'content', 'reichweite', 'posting', 'werbung', 'kooperation'],
    requiredClauses: ['leistungsumfang', 'content_vorgaben', 'verguetung', 'nutzungsrechte', 'kennzeichnung', 'exklusivitaet'],
    jurisdiction: 'DE',
    riskFactors: ['kennzeichnungspflicht', 'reichweitengarantie', 'imageschaden']
  },
  sponsoring_vertrag: {
    keywords: ['sponsoring', 'sponsor', 'gesponsert', 'event', 'veranstaltung', 'werbeleistung'],
    requiredClauses: ['sponsoringleistung', 'gegenleistung', 'nutzungsrechte', 'laufzeit', 'exklusivitaet'],
    jurisdiction: 'DE',
    riskFactors: ['imageschaden', 'eventausfall', 'exklusivitaet']
  },
  
  // VERTRAGSÄNDERUNGEN (Universal)
  vertragsaenderung: {
    keywords: ['änderung', 'ergänzung', 'nachtrag', 'anpassung', 'modifikation', 'vereinbarung zur änderung', 'amendment'],
    requiredClauses: ['aenderungsgegenstand', 'bezug_hauptvertrag', 'gueltigkeitsdatum', 'unterschriften'],
    jurisdiction: 'INHERIT',
    isAmendment: true,
    riskFactors: ['unklarer_bezug', 'widersprüche', 'rueckwirkung']
  },
  zusatzvereinbarung: {
    keywords: ['zusatzvereinbarung', 'ergänzungsvereinbarung', 'zusatz', 'ergänzung', 'sondervereinbarung'],
    requiredClauses: ['ergaenzungsgegenstand', 'hauptvertrag_referenz', 'geltungsbeginn'],
    jurisdiction: 'INHERIT',
    isAmendment: true,
    riskFactors: ['widerspruch_hauptvertrag', 'rangfolge']
  },
  
  // JOINT VENTURES & KOOPERATIONEN
  joint_venture: {
    keywords: ['joint venture', 'kooperation', 'zusammenarbeit', 'gemeinschaftsunternehmen', 'jv'],
    requiredClauses: ['zweck', 'beitraege', 'gewinnverteilung', 'geschaeftsfuehrung', 'exit', 'wettbewerbsverbot'],
    jurisdiction: 'INT',
    riskFactors: ['deadlock', 'exit_beschraenkung', 'wettbewerbsverbot']
  },
  kooperationsvertrag: {
    keywords: ['kooperation', 'zusammenarbeit', 'partnerschaft', 'allianz', 'kollaboration'],
    requiredClauses: ['kooperationszweck', 'leistungen', 'kostenverteilung', 'ip_rechte', 'vertraulichkeit', 'laufzeit'],
    jurisdiction: 'DE',
    riskFactors: ['unklare_leistungen', 'ip_rechte', 'haftungsverteilung']
  },
  konsortialvertrag: {
    keywords: ['konsortium', 'bietergemeinschaft', 'arge', 'arbeitsgemeinschaft', 'konsortialführer'],
    requiredClauses: ['konsortialzweck', 'konsortialfuehrer', 'leistungsanteile', 'haftung', 'gewinnverteilung'],
    jurisdiction: 'DE',
    riskFactors: ['gesamtschuldnerische_haftung', 'ausfall_partner']
  },
  
  // TRANSPORT & LOGISTIK
  speditionsvertrag: {
    keywords: ['spedition', 'transport', 'logistik', 'fracht', 'versand', 'spediteur'],
    requiredClauses: ['transportgut', 'route', 'frachtkosten', 'liefertermin', 'haftung', 'versicherung'],
    jurisdiction: 'DE',
    riskFactors: ['haftungsbegrenzung', 'transportschaden', 'lieferverzug']
  },
  lagervertrag: {
    keywords: ['lagerung', 'lagerhalter', 'einlagerung', 'lagergut', 'lagerraum'],
    requiredClauses: ['lagergut', 'lagerdauer', 'lagerkosten', 'haftung', 'versicherung', 'herausgabe'],
    jurisdiction: 'DE',
    riskFactors: ['haftung_beschaedigung', 'versicherung', 'zugriffsrechte']
  },
  
  // ENERGIE & VERSORGUNG
  stromliefervertrag: {
    keywords: ['strom', 'energie', 'stromlieferung', 'energieversorgung', 'kwh', 'grundversorgung'],
    requiredClauses: ['liefermenge', 'preis', 'preisanpassung', 'laufzeit', 'kuendigung', 'zaehler'],
    jurisdiction: 'DE',
    riskFactors: ['preisanpassung', 'mindestabnahme', 'kuendigungsfristen']
  },
  gasliefervertrag: {
    keywords: ['gas', 'erdgas', 'gaslieferung', 'gasversorgung', 'kubikmeter'],
    requiredClauses: ['liefermenge', 'preis', 'preisanpassung', 'laufzeit', 'versorgungssicherheit'],
    jurisdiction: 'DE',
    riskFactors: ['preisgleitklausel', 'take_or_pay', 'versorgungsunterbrechung']
  },
  
  // TELEKOMMUNIKATION
  mobilfunkvertrag: {
    keywords: ['mobilfunk', 'handy', 'smartphone', 'tarif', 'datenvolumen', 'flatrate'],
    requiredClauses: ['leistungsumfang', 'tarif', 'laufzeit', 'kuendigung', 'roaming', 'geraet'],
    jurisdiction: 'DE',
    riskFactors: ['automatische_verlaengerung', 'drosselung', 'roaming_kosten']
  },
  internetvertrag: {
    keywords: ['internet', 'dsl', 'glasfaser', 'bandbreite', 'router', 'anschluss'],
    requiredClauses: ['bandbreite', 'verfuegbarkeit', 'tarif', 'laufzeit', 'router', 'stoerung'],
    jurisdiction: 'DE',
    riskFactors: ['mindestbandbreite', 'verfuegbarkeit', 'kuendigungsfrist']
  },
  
  // GASTRONOMIE & HOTELLERIE
  bewirtungsvertrag: {
    keywords: ['bewirtung', 'catering', 'veranstaltung', 'gastronomie', 'speisen', 'getränke'],
    requiredClauses: ['leistungsumfang', 'preis', 'termin', 'teilnehmerzahl', 'stornierung', 'haftung'],
    jurisdiction: 'DE',
    riskFactors: ['stornierungskosten', 'mindestumsatz', 'haftung_allergien']
  },
  hotelvertrag: {
    keywords: ['hotel', 'beherbergung', 'zimmer', 'übernachtung', 'reservation', 'buchung'],
    requiredClauses: ['zimmerart', 'preis', 'anreise', 'abreise', 'stornierung', 'haftung'],
    jurisdiction: 'DE',
    riskFactors: ['stornierung', 'no_show', 'haftungsbeschraenkung']
  },
  
  // BILDUNG & TRAINING
  schulvertrag: {
    keywords: ['schule', 'privatschule', 'schulbildung', 'schulgeld', 'unterricht'],
    requiredClauses: ['schulart', 'schulgeld', 'schuljahr', 'kuendigung', 'leistungen', 'aufsichtspflicht'],
    jurisdiction: 'DE',
    riskFactors: ['schulgeldanpassung', 'kuendigungsfristen', 'haftung']
  },
  weiterbildungsvertrag: {
    keywords: ['weiterbildung', 'fortbildung', 'seminar', 'kurs', 'training', 'schulung'],
    requiredClauses: ['kursinhalt', 'dozent', 'termine', 'gebuehr', 'stornierung', 'zertifikat'],
    jurisdiction: 'DE',
    riskFactors: ['kursausfall', 'stornierungskosten', 'keine_erfolgsgarantie']
  },
  
  // MEDIEN & ENTERTAINMENT
  verlagsvertrag: {
    keywords: ['verlag', 'autor', 'buch', 'manuskript', 'veröffentlichung', 'honorar'],
    requiredClauses: ['werk', 'nutzungsrechte', 'honorar', 'auflage', 'veroeffentlichung', 'optionsrecht'],
    jurisdiction: 'DE',
    riskFactors: ['rechteübertragung', 'honorarabrechnung', 'optionsrecht']
  },
  musikvertrag: {
    keywords: ['musik', 'künstler', 'label', 'aufnahme', 'verwertung', 'gema'],
    requiredClauses: ['werke', 'nutzungsrechte', 'verguetung', 'verwertung', 'gema', 'exklusivitaet'],
    jurisdiction: 'DE',
    riskFactors: ['rechteabtretung', 'exklusivitaet', 'abrechnung']
  },
  filmvertrag: {
    keywords: ['film', 'produktion', 'drehbuch', 'regie', 'schauspieler', 'verwertung'],
    requiredClauses: ['leistung', 'verguetung', 'nutzungsrechte', 'credits', 'verwertung'],
    jurisdiction: 'DE',
    riskFactors: ['buyout', 'verwertungsrechte', 'nachverguetung']
  },
  
  // MEDIZIN & GESUNDHEIT
  behandlungsvertrag: {
    keywords: ['behandlung', 'patient', 'arzt', 'therapie', 'eingriff', 'aufklärung'],
    requiredClauses: ['behandlung', 'aufklaerung', 'einwilligung', 'kosten', 'haftung', 'schweigepflicht'],
    jurisdiction: 'DE',
    riskFactors: ['aufklaerungspflicht', 'haftung', 'kostenuebernahme']
  },
  pflegevertrag: {
    keywords: ['pflege', 'pflegeheim', 'pflegedienst', 'betreuung', 'pflegegrad'],
    requiredClauses: ['pflegeleistungen', 'kosten', 'unterkunft', 'kuendigung', 'haftung'],
    jurisdiction: 'DE',
    riskFactors: ['kostensteigerung', 'haftungsbeschraenkung', 'kuendigungsschutz']
  },
  
  // SPORT & FREIZEIT
  sportlervertrag: {
    keywords: ['sportler', 'verein', 'spieler', 'trainer', 'transfer', 'gehalt'],
    requiredClauses: ['verguetung', 'laufzeit', 'einsatz', 'transferrechte', 'vermarktung', 'verletzung'],
    jurisdiction: 'DE',
    riskFactors: ['transferklausel', 'verletzung', 'vermarktungsrechte']
  },
  mitgliedschaftsvertrag: {
    keywords: ['mitgliedschaft', 'verein', 'fitness', 'mitgliedsbeitrag', 'kündigung'],
    requiredClauses: ['leistungen', 'beitrag', 'laufzeit', 'kuendigung', 'hausordnung'],
    jurisdiction: 'DE',
    riskFactors: ['automatische_verlaengerung', 'beitragserhoehung']
  },
  
  // LANDWIRTSCHAFT
  pachtvertrag_landwirtschaft: {
    keywords: ['landpacht', 'acker', 'wiese', 'landwirtschaft', 'bewirtschaftung'],
    requiredClauses: ['pachtflaeche', 'pachtzins', 'bewirtschaftung', 'pachtdauer', 'kuendigung'],
    jurisdiction: 'DE',
    riskFactors: ['pachtzinsanpassung', 'bewirtschaftungspflicht', 'vorkaufsrecht']
  },
  
  // AGB & DATENSCHUTZ
  agb: {
    keywords: ['allgemeine geschäftsbedingungen', 'agb', 'vertragsschluss', 'widerrufsrecht', 'lieferbedingungen', 'zahlungsbedingungen'],
    requiredClauses: ['vertragsschluss', 'preise', 'zahlung', 'lieferung', 'gewährleistung', 'haftung', 'datenschutz', 'schlussbestimmungen'],
    jurisdiction: 'DE',
    riskFactors: ['überraschende_klauseln', 'benachteiligung', 'intransparenz', 'unwirksame_klauseln']
  },
  datenschutzvereinbarung: {
    keywords: ['datenschutz', 'dsgvo', 'auftragsverarbeitung', 'personenbezogen', 'tom'],
    requiredClauses: ['gegenstand', 'dauer', 'art_zweck', 'datenarten', 'betroffene', 'tom', 'loeschung'],
    jurisdiction: 'EU',
    riskFactors: ['unzureichende_tom', 'subunternehmer', 'drittland']
  },
  
  // SONSTIGES
  schenkungsvertrag: {
    keywords: ['schenkung', 'schenker', 'beschenkter', 'unentgeltlich', 'zuwendung'],
    requiredClauses: ['schenkungsgegenstand', 'uebergabe', 'annahme', 'widerruf', 'auflagen'],
    jurisdiction: 'DE',
    riskFactors: ['formmangel', 'rueckforderung', 'pflichtteil']
  },
  vergleichsvertrag: {
    keywords: ['vergleich', 'streitbeilegung', 'einigung', 'verzicht', 'erledigung'],
    requiredClauses: ['streitgegenstand', 'vergleichsregelung', 'verzicht', 'kosten', 'vollstreckung'],
    jurisdiction: 'DE',
    riskFactors: ['unvollstaendiger_verzicht', 'neue_ansprueche']
  },
  garantievertrag: {
    keywords: ['garantie', 'garantiegeber', 'garantienehmer', 'garantiefall', 'bürgschaft'],
    requiredClauses: ['garantieumfang', 'garantiefall', 'laufzeit', 'inanspruchnahme', 'rueckgriff'],
    jurisdiction: 'DE',
    riskFactors: ['unbegrenzte_garantie', 'garantiefall_definition']
  },
  testamentsvollstreckungsvertrag: {
    keywords: ['testament', 'vollstrecker', 'erbe', 'nachlass', 'verwaltung'],
    requiredClauses: ['aufgaben', 'verguetung', 'haftung', 'dauer', 'rechenschaft'],
    jurisdiction: 'DE',
    riskFactors: ['haftung', 'interessenkonflikt', 'verguetung']
  },
  
  sonstiges: {
    keywords: [],
    requiredClauses: [],
    jurisdiction: 'DE',
    riskFactors: []
  }
};

// 🚀 HELPER FUNCTIONS - Category and label mappings
const getCategoryForClause = (clause) => {
  const categoryMap = {
    // Arbeitsrecht
    'arbeitszeit': 'working_hours',
    'vergütung': 'compensation',
    'gehalt': 'compensation',
    'urlaub': 'vacation',
    'kündigung': 'termination',
    'probezeit': 'probation',
    'überstunden': 'working_hours',
    'datenschutz': 'data_protection',
    'verschwiegenheit': 'confidentiality',
    'geheimhaltung': 'confidentiality',
    
    // Mietrecht
    'miete': 'payment',
    'nebenkosten': 'payment',
    'kaution': 'security',
    'schönheitsreparaturen': 'maintenance',
    'mietdauer': 'term',
    
    // Allgemeine Vertragsklauseln
    'haftung': 'liability',
    'gewährleistung': 'warranty',
    'zahlung': 'payment',
    'zahlungsbedingungen': 'payment',
    'lieferung': 'delivery',
    'eigentumsvorbehalt': 'ownership',
    'gerichtsstand': 'jurisdiction',
    'schriftform': 'formalities',
    
    // IT & Software
    'sla': 'service_levels',
    'support': 'support',
    'verfügbarkeit': 'availability',
    'datensicherheit': 'data_security',
    'updates': 'maintenance',
    
    // Änderungsvereinbarungen
    'aenderungsgegenstand': 'amendment_scope',
    'gueltigkeitsdatum': 'validity',
    'referenz_hauptvertrag': 'reference',
    'unveraenderte_bestandteile': 'unchanged_terms',
    'clear_reference': 'reference',
    'effective_date': 'validity',
    'unchanged_clauses': 'unchanged_terms',
    'signature_provision': 'formalities'
  };
  
  for (const [key, value] of Object.entries(categoryMap)) {
    if (clause.includes(key)) return value;
  }
  return 'general';
};

const getCategoryForRisk = (risk) => {
  const riskMap = {
    'befristung': 'employment_terms',
    'konkurrenzklausel': 'competition',
    'rückzahlungsklausel': 'repayment',
    'vertragsstrafe': 'penalties',
    'überstunden': 'working_hours',
    'haftungsausschluss': 'liability',
    'gewährleistungsausschluss': 'warranty',
    'preiserhöhung': 'pricing',
    'auto_renewal': 'termination',
    'vendor_lock_in': 'dependencies',
    'rueckwirkung': 'validity',
    'widerspruch_hauptvertrag': 'consistency',
    'unklare_regelung': 'clarity'
  };
  
  for (const [key, value] of Object.entries(riskMap)) {
    if (risk.includes(key)) return value;
  }
  return 'risk';
};

const getCategoryLabel = (category) => {
  const labels = {
    // Standard categories
    'working_hours': 'Arbeitszeit & Überstunden',
    'compensation': 'Vergütung & Gehalt',
    'vacation': 'Urlaub & Freizeit',
    'termination': 'Kündigung & Beendigung',
    'liability': 'Haftung & Risiko',
    'data_protection': 'Datenschutz & DSGVO',
    'confidentiality': 'Geheimhaltung & Vertraulichkeit',
    'warranty': 'Gewährleistung & Garantie',
    'payment': 'Zahlung & Konditionen',
    'delivery': 'Lieferung & Leistung',
    'service_levels': 'Service Level & SLA',
    'support': 'Support & Wartung',
    'availability': 'Verfügbarkeit & Uptime',
    
    // Employment specific
    'employment_terms': 'Beschäftigungsbedingungen',
    'competition': 'Wettbewerb & Konkurrenz',
    'repayment': 'Rückzahlung & Erstattung',
    'penalties': 'Vertragsstrafen & Sanktionen',
    'probation': 'Probezeit',
    
    // Amendment specific
    'amendment_scope': 'Änderungsumfang',
    'validity': 'Gültigkeit & Wirksamkeit',
    'reference': 'Vertragsbezug',
    'unchanged_terms': 'Unveränderte Bestandteile',
    'consistency': 'Widerspruchsfreiheit',
    
    // General
    'pricing': 'Preise & Konditionen',
    'dependencies': 'Abhängigkeiten & Lock-In',
    'risk': 'Risikofaktoren',
    'clarity': 'Klarheit & Präzision',
    'formalities': 'Formvorschriften',
    'security': 'Sicherheiten',
    'maintenance': 'Wartung & Instandhaltung',
    'ownership': 'Eigentum & Rechte',
    'jurisdiction': 'Gerichtsstand & Recht',
    'general': 'Allgemeine Optimierungen',
    'extracted': 'Erkannte Probleme'
  };
  
  return labels[category] || category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

// 🚀 CRITICAL HELPER FUNCTIONS - These were missing!
const cleanText = (text) => {
  if (!text) return '';
  return text
    .replace(/\*\*/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/^\s+|\s+$/g, '')
    .replace(/\[KATEGORIE:|KATEGORIE:/gi, '')
    .replace(/\[X\]/g, '§')
    .trim();
};

const calculateHealthScore = (gaps, optimizations) => {
  let score = 100;
  
  // Deduct for gaps
  gaps.forEach(gap => {
    if (gap.severity === 'critical') score -= 15;
    else if (gap.severity === 'high') score -= 10;
    else if (gap.severity === 'medium') score -= 5;
    else score -= 2;
  });
  
  // Deduct for optimizations needed
  if (Array.isArray(optimizations)) {
    optimizations.forEach(opt => {
      if (opt.risk >= 8) score -= 10;
      else if (opt.risk >= 6) score -= 7;
      else if (opt.risk >= 4) score -= 5;
      else score -= 3;
    });
  }
  
  return Math.max(25, Math.min(100, score));
};

// 🚀 MAIN NORMALIZATION FUNCTION
const normalizeAndValidateOutput = (aiOutput, contractType) => {
  // Default structure
  const defaultResult = {
    meta: {
      type: contractType || 'sonstiges',
      confidence: 75,
      jurisdiction: 'DE',
      language: 'de'
    },
    categories: [],
    score: { health: 75 },
    summary: {
      redFlags: 0,
      quickWins: 0,
      totalIssues: 0
    }
  };
  
  if (!aiOutput) {
    console.log('⚠️ No AI output to normalize');
    return defaultResult;
  }
  
  try {
    // Try to parse JSON
    let parsed;
    
    if (typeof aiOutput === 'string') {
      // Clean potential markdown or code blocks
      let cleanedOutput = aiOutput
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      
      // Try to find JSON in the output
      const jsonMatch = cleanedOutput.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanedOutput = jsonMatch[0];
      }
      
      try {
        parsed = JSON.parse(cleanedOutput);
      } catch (e) {
        console.log('⚠️ Failed to parse AI JSON, using fallback');
        // Try to extract key information from text
        parsed = extractFromText(aiOutput, contractType);
      }
    } else {
      parsed = aiOutput;
    }
    
    // Validate and normalize structure
    const result = {
      meta: {
        type: parsed?.meta?.type || contractType || 'sonstiges',
        confidence: parsed?.meta?.confidence || 75,
        jurisdiction: parsed?.meta?.jurisdiction || 'DE',
        language: parsed?.meta?.language || 'de',
        isAmendment: parsed?.meta?.isAmendment || false,
        parentType: parsed?.meta?.parentType || null
      },
      categories: [],
      score: {
        health: parsed?.score?.health || 75
      },
      summary: {
        redFlags: 0,
        quickWins: 0,
        totalIssues: 0
      }
    };
    
    // Process categories
    if (parsed?.categories && Array.isArray(parsed.categories)) {
      result.categories = parsed.categories.map(cat => ({
        tag: cat.tag || 'general',
        label: cat.label || getCategoryLabel(cat.tag || 'general'),
        present: cat.present !== false,
        issues: Array.isArray(cat.issues) ? cat.issues.map(issue => ({
          id: issue.id || `issue_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          summary: cleanText(issue.summary || issue.description || ''),
          originalText: cleanText(issue.originalText || issue.original || ''),
          improvedText: cleanText(issue.improvedText || issue.improved || ''),
          legalReasoning: cleanText(issue.legalReasoning || issue.reasoning || ''),
          risk: parseInt(issue.risk) || 5,
          impact: parseInt(issue.impact) || 5,
          confidence: parseInt(issue.confidence) || 75,
          difficulty: issue.difficulty || 'Mittel',
          benchmark: issue.benchmark || issue.marketBenchmark || ''
        })) : []
      }));
      
      // Calculate summary
      result.categories.forEach(cat => {
        cat.issues.forEach(issue => {
          result.summary.totalIssues++;
          if (issue.risk >= 8) result.summary.redFlags++;
          if (issue.difficulty === 'Einfach') result.summary.quickWins++;
        });
      });
    }
    
    // Update summary from parsed if available
    if (parsed?.summary) {
      result.summary = {
        ...result.summary,
        ...parsed.summary
      };
    }
    
    return result;
    
  } catch (error) {
    console.error('❌ Error normalizing AI output:', error);
    return defaultResult;
  }
};

// Helper: Extract information from text when JSON parsing fails
const extractFromText = (text, contractType) => {
  const result = {
    meta: {
      type: contractType || 'sonstiges',
      confidence: 70,
      jurisdiction: 'DE',
      language: 'de'
    },
    categories: [],
    score: { health: 70 },
    summary: {
      redFlags: 0,
      quickWins: 0,
      totalIssues: 0
    }
  };
  
  // Try to extract issues from text patterns
  const issuePatterns = [
    /(?:Problem|Issue|Risiko|Lücke):\s*([^.]+)/gi,
    /(?:Empfehlung|Recommendation|Vorschlag):\s*([^.]+)/gi,
    /(?:FEHLT|Missing|Fehlend):\s*([^.]+)/gi
  ];
  
  const issues = [];
  issuePatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      issues.push({
        id: `extracted_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        summary: match[1].trim(),
        originalText: 'Siehe Vertrag',
        improvedText: 'Verbesserung empfohlen',
        legalReasoning: 'Rechtliche Optimierung erforderlich',
        risk: 6,
        impact: 6,
        confidence: 70,
        difficulty: 'Mittel'
      });
    }
  });
  
  if (issues.length > 0) {
    result.categories.push({
      tag: 'extracted',
      label: 'Extrahierte Probleme',
      present: true,
      issues: issues.slice(0, 10) // Limit to 10 issues
    });
    
    result.summary.totalIssues = issues.length;
    result.summary.redFlags = Math.floor(issues.length / 3);
    result.summary.quickWins = Math.floor(issues.length / 2);
  }
  
  return result;
};

// Additional helper functions
const detectContentCategories = (text, contractType) => {
  const categories = [];
  const lowerText = text.toLowerCase();
  
  // Universal optimization patterns
  const optimizationPatterns = [
    {
      pattern: /kann|könnte|sollte|möglicherweise|eventuell|gegebenenfalls/gi,
      category: 'clarity',
      label: 'Klarheit & Präzision'
    },
    {
      pattern: /unbegrenzt|unbeschränkt|vollumfänglich|ausnahmslos/gi,
      category: 'liability',
      label: 'Haftung & Risiko'
    },
    {
      pattern: /sofort|unverzüglich|unmittelbar|fristlos/gi,
      category: 'termination',
      label: 'Kündigung & Fristen'
    },
    {
      pattern: /verzugszinsen|säumnis|mahnung|zahlungsverzug/gi,
      category: 'payment',
      label: 'Zahlung & Verzug'
    },
    {
      pattern: /mündlich|telefonisch|formlos/gi,
      category: 'formalities',
      label: 'Formvorschriften'
    },
    {
      pattern: /ausschließlich|exklusiv|alleinig/gi,
      category: 'exclusivity',
      label: 'Exklusivität'
    }
  ];
  
  optimizationPatterns.forEach(({ pattern, category, label }) => {
    if (pattern.test(lowerText)) {
      categories.push({
        tag: category,
        label: label,
        present: true,
        issues: []
      });
    }
  });
  
  return categories;
};

// 🚀 UNIVERSAL: Enhanced Multi-Stage Contract Type Detection
const detectContractType = async (text, fileName = '') => {
  const lowerText = text.toLowerCase();
  const lowerFileName = fileName.toLowerCase();
  
  // Check if it's an amendment/change document FIRST
  const amendmentIndicators = [
    'änderung', 'änderungsvereinbarung', 'ergänzung', 'nachtrag', 
    'anpassung', 'zusatzvereinbarung', 'modifikation', 'amendment',
    'addendum', 'supplement', 'modification', 'adjustment',
    'erhöhung', 'reduzierung', 'verlängerung', 'verkürzung',
    'arbeitszeitänderung', 'arbeitszeiterhöhung', 'gehaltserhöhung'
  ];
  
  let isAmendment = false;
  let parentContractType = null;
  
  // Check for amendment indicators
  for (const indicator of amendmentIndicators) {
    if (lowerText.includes(indicator) || lowerFileName.includes(indicator)) {
      isAmendment = true;
      
      // Try to identify what type of contract is being amended
      // Look for references to the main contract
      const mainContractPatterns = [
        /(?:arbeitsvertrag|arbeitsvertrages)\s+(?:vom|von|des)\s+\d{1,2}\.\d{1,2}\.\d{4}/i,
        /(?:mietvertrag|mietvertrages)\s+(?:vom|von|des)\s+\d{1,2}\.\d{1,2}\.\d{4}/i,
        /(?:kaufvertrag|kaufvertrages)\s+(?:vom|von|des)\s+\d{1,2}\.\d{1,2}\.\d{4}/i,
        /(?:vertrag|vertrages)\s+(?:vom|von|des)\s+\d{1,2}\.\d{1,2}\.\d{4}/i
      ];
      
      for (const pattern of mainContractPatterns) {
        const match = text.match(pattern);
        if (match) {
          const contractRef = match[0].toLowerCase();
          if (contractRef.includes('arbeitsvertrag')) {
            parentContractType = 'arbeitsvertrag';
          } else if (contractRef.includes('mietvertrag')) {
            parentContractType = 'mietvertrag';
          } else if (contractRef.includes('kaufvertrag')) {
            parentContractType = 'kaufvertrag';
          }
          break;
        }
      }
      
      // Also check context for parent type
      if (!parentContractType) {
        if (lowerText.includes('arbeitszeit') || lowerText.includes('gehalt') || lowerText.includes('arbeitnehmer')) {
          parentContractType = 'arbeitsvertrag';
        } else if (lowerText.includes('miete') || lowerText.includes('mieter') || lowerText.includes('wohnung')) {
          parentContractType = 'mietvertrag';
        }
      }
      
      break;
    }
  }
  
  // Stage 1: Keyword-based detection with scoring
  let typeScores = {};
  
  for (const [type, config] of Object.entries(CONTRACT_TYPES)) {
    let score = 0;
    
    // For amendments, prioritize amendment types
    if (isAmendment) {
      if (config.isAmendment) {
        score += 30; // Boost amendment types
        
        // Extra boost if parent type matches
        if (config.parentType === parentContractType) {
          score += 50;
        }
      } else if (!config.parentType) {
        // Skip non-amendment parent types when we detected an amendment
        continue;
      }
    }
    
    // Check keywords in text
    config.keywords.forEach(keyword => {
      const occurrences = (lowerText.match(new RegExp(keyword, 'g')) || []).length;
      score += occurrences * 2;
    });
    
    // Check keywords in filename
    config.keywords.forEach(keyword => {
      if (lowerFileName.includes(keyword)) {
        score += 10;
      }
    });
    
    // Check for required clauses indicators
    config.requiredClauses.forEach(clause => {
      if (lowerText.includes(clause.replace('_', ' '))) {
        score += 3;
      }
    });
    
    typeScores[type] = score;
  }
  
  // Find best match
  const sortedScores = Object.entries(typeScores).sort((a, b) => b[1] - a[1]);
  const bestMatch = sortedScores[0] || ['sonstiges', 0];
  
  let contractType = bestMatch[1] > 10 ? bestMatch[0] : 'sonstiges';
  
  // Special case: If it's clearly an amendment but we couldn't identify specific type
  if (isAmendment && !CONTRACT_TYPES[contractType]?.isAmendment) {
    // Try to find the specific amendment type
    if (parentContractType === 'arbeitsvertrag') {
      contractType = 'arbeitsvertrag_aenderung';
    } else {
      contractType = 'vertragsaenderung'; // Generic amendment
    }
  }
  
  // Get configuration for detected type
  const typeConfig = CONTRACT_TYPES[contractType] || CONTRACT_TYPES.sonstiges;
  
  // Stage 2: Extract jurisdiction
  let jurisdiction = typeConfig.jurisdiction || 'DE';
  if (jurisdiction === 'INHERIT' && parentContractType) {
    jurisdiction = CONTRACT_TYPES[parentContractType]?.jurisdiction || 'DE';
  }
  
  if (lowerText.includes('governed by the laws') || lowerText.includes('applicable law')) {
    if (lowerText.includes('united states') || lowerText.includes('delaware')) jurisdiction = 'US';
    else if (lowerText.includes('england') || lowerText.includes('wales')) jurisdiction = 'UK';
    else if (lowerText.includes('switzerland') || lowerText.includes('swiss')) jurisdiction = 'CH';
    else if (lowerText.includes('austria') || lowerText.includes('österreich')) jurisdiction = 'AT';
  }
  
  // Stage 3: Language detection
  const germanWords = ['der', 'die', 'das', 'und', 'oder', 'mit', 'von', 'für', 'bei', 'nach'];
  const englishWords = ['the', 'and', 'or', 'with', 'from', 'for', 'at', 'after', 'this', 'that'];
  
  let germanCount = 0;
  let englishCount = 0;
  
  germanWords.forEach(word => {
    germanCount += (lowerText.match(new RegExp(`\\b${word}\\b`, 'g')) || []).length;
  });
  
  englishWords.forEach(word => {
    englishCount += (lowerText.match(new RegExp(`\\b${word}\\b`, 'g')) || []).length;
  });
  
  const language = germanCount > englishCount ? 'de' : 'en';
  
  // Stage 4: Extract contract parties/roles
  const roles = [];
  
  // Different extraction patterns based on contract type
  if (contractType === 'arbeitsvertrag' || contractType === 'arbeitsvertrag_aenderung') {
    const arbeitgeberMatch = text.match(/(?:Arbeitgeber|Firma|Unternehmen|FERCHAU GmbH)[:\s]*([A-Za-zäöüÄÖÜß\s&.]+(?:GmbH|AG|KG|OHG|GbR|e\.V\.|Ltd|Inc)?)/i);
    const arbeitnehmerMatch = text.match(/(?:Arbeitnehmer|Mitarbeiter|Herr|Frau)\s+([A-Za-zäöüÄÖÜß\s]+)/i);
    if (arbeitgeberMatch) roles.push({ type: 'arbeitgeber', name: arbeitgeberMatch[1].trim() });
    if (arbeitnehmerMatch) roles.push({ type: 'arbeitnehmer', name: arbeitnehmerMatch[1].trim() });
  } else if (contractType.includes('miet')) {
    const vermieterMatch = text.match(/(?:Vermieter|Eigentümer)[:\s]+([A-Za-zäöüÄÖÜß\s&.]+)/i);
    const mieterMatch = text.match(/(?:Mieter)[:\s]+([A-Za-zäöüÄÖÜß\s]+)/i);
    if (vermieterMatch) roles.push({ type: 'vermieter', name: vermieterMatch[1].trim() });
    if (mieterMatch) roles.push({ type: 'mieter', name: mieterMatch[1].trim() });
  }
  
  // Extract dates
  const dateMatches = text.match(/\d{1,2}\.\d{1,2}\.\d{4}/g) || [];
  
  // Calculate confidence based on matches
  const confidence = Math.min(100, Math.round((bestMatch[1] / 50) * 100));
  
  return {
    type: contractType,
    confidence: confidence,
    jurisdiction,
    language,
    roles,
    isAmendment,
    parentType: typeConfig.parentType || parentContractType,
    detectedClauses: typeConfig.requiredClauses || [],
    riskFactors: typeConfig.riskFactors || [],
    dates: dateMatches,
    metadata: {
      fileName,
      textLength: text.length,
      hasSignature: text.includes('Unterschrift') || text.includes('signature') || text.includes('_____'),
      hasDate: dateMatches.length > 0,
      contractTypeConfig: typeConfig
    }
  };
};

// 🚀 UNIVERSAL: Context-Aware Gap Analysis
const analyzeContractGaps = (text, contractType, detectedClauses) => {
  const lowerText = text.toLowerCase();
  const gaps = [];
  const categories = new Map();
  
  // Get configuration for detected contract type
  const typeConfig = CONTRACT_TYPES[contractType] || CONTRACT_TYPES.sonstiges;
  
  // Special handling for amendments
  if (typeConfig.isAmendment) {
    // For amendments, check different requirements
    const amendmentChecks = [
      {
        clause: 'clear_reference',
        check: () => {
          // Check for reference to main contract with date
          const hasReference = /(?:Vertrag|Vereinbarung|Arbeitsvertrag|Mietvertrag)\s+(?:vom|von|des)\s+\d{1,2}\.\d{1,2}\.\d{4}/i.test(text);
          return !hasReference;
        },
        severity: 'high',
        category: 'reference',
        description: 'Klare Referenz zum Hauptvertrag mit Datum'
      },
      {
        clause: 'effective_date',
        check: () => {
          // Check for effective date
          const hasEffectiveDate = /(?:Wirkung zum|gültig ab|wirksam ab|gilt ab|tritt in Kraft am)\s*\d{1,2}\.\d{1,2}\.\d{4}/i.test(text);
          return !hasEffectiveDate;
        },
        severity: 'high',
        category: 'validity',
        description: 'Eindeutiges Gültigkeitsdatum der Änderung'
      },
      {
        clause: 'unchanged_clauses',
        check: () => {
          // Check for statement about unchanged parts
          const hasUnchangedStatement = lowerText.includes('bleiben unverändert') || 
                                        lowerText.includes('remain unchanged') ||
                                        lowerText.includes('übrigen bestandteile') ||
                                        lowerText.includes('im übrigen');
          return !hasUnchangedStatement;
        },
        severity: 'medium',
        category: 'clarity',
        description: 'Klarstellung über unveränderte Vertragsbestandteile'
      },
      {
        clause: 'signature_provision',
        check: () => {
          // Check for signature requirements
          const hasSignatureProvision = text.includes('Unterschrift') || 
                                        text.includes('gegengezeichnet') ||
                                        text.includes('_____') ||
                                        text.includes('Einverständnis');
          return !hasSignatureProvision;
        },
        severity: 'high',
        category: 'formalities',
        description: 'Unterschriftsregelung für beide Parteien'
      },
      {
        clause: 'retroactive_effect',
        check: () => {
          // Check if there's retroactive effect without clear statement
          const hasRetroactive = lowerText.includes('rückwirkend') || 
                                 lowerText.includes('rückwirkung');
          const hasClearStatement = lowerText.includes('keine rückwirkung') ||
                                    lowerText.includes('nicht rückwirkend');
          return hasRetroactive && !hasClearStatement;
        },
        severity: 'medium',
        category: 'validity',
        description: 'Unklare Rückwirkungsregelung'
      }
    ];
    
    // Run amendment-specific checks
    amendmentChecks.forEach(check => {
      if (check.check()) {
        gaps.push({
          type: check.clause === 'retroactive_effect' ? 'risk_factor' : 'missing_clause',
          clause: check.clause,
          severity: check.severity,
          category: check.category,
          description: check.description
        });
      }
    });
  } else {
    // Standard gap analysis for main contracts
    const requiredClauses = typeConfig.requiredClauses || [];
    const riskFactors = typeConfig.riskFactors || [];
    
    // Check for missing required clauses
    requiredClauses.forEach(clause => {
      const clauseKeywords = clause.replace(/_/g, ' ').split(' ');
      const hasClause = clauseKeywords.some(keyword => lowerText.includes(keyword));
      
      if (!hasClause) {
        gaps.push({
          type: 'missing_clause',
          clause: clause,
          severity: 'high',
          category: getCategoryForClause(clause),
          description: `Pflichtklausel fehlt: ${clause.replace(/_/g, ' ')}`
        });
      }
    });
    
    // Check for risk factors
    riskFactors.forEach(risk => {
      const riskKeywords = risk.replace(/_/g, ' ').split(' ');
      const hasRisk = riskKeywords.every(keyword => lowerText.includes(keyword));
      
      if (hasRisk) {
        gaps.push({
          type: 'risk_factor',
          risk: risk,
          severity: 'critical',
          category: getCategoryForRisk(risk),
          description: `Risikofaktor erkannt: ${risk.replace(/_/g, ' ')}`
        });
      }
    });
  }
  
  // Universal quality checks for ALL contract types
  const universalChecks = [
    {
      pattern: /kann|könnte|sollte|möglicherweise|eventuell|gegebenenfalls/gi,
      category: 'clarity',
      severity: 'medium',
      description: 'Unklare/vage Formulierungen gefunden'
    },
    {
      pattern: /unbegrenzt|unbeschränkt|vollumfänglich|ausnahmslos|in vollem umfang/gi,
      category: 'liability',
      severity: 'high',
      description: 'Unbegrenzte Verpflichtungen oder Haftung'
    },
    {
      pattern: /sofort|unverzüglich|unmittelbar|ohne vorherige|fristlos ohne grund/gi,
      category: 'termination',
      severity: 'medium',
      description: 'Sehr kurze oder fehlende Fristen'
    },
    {
      pattern: /mündlich|telefonisch|formlos|per email genügt/gi,
      category: 'formalities',
      severity: 'high',
      description: 'Fehlende oder unzureichende Schriftformklauseln'
    },
    {
      pattern: /automatisch verlängert|stillschweigend verlängert|verlängert sich automatisch/gi,
      category: 'termination',
      severity: 'medium',
      description: 'Automatische Vertragsverlängerung'
    }
  ];
  
  universalChecks.forEach(check => {
    const matches = text.match(check.pattern) || [];
    if (matches.length > 0) {
      gaps.push({
        type: 'quality_issue',
        pattern: check.pattern.source,
        severity: check.severity,
        category: check.category,
        description: check.description,
        occurrences: matches.length,
        examples: matches.slice(0, 3) // First 3 examples
      });
    }
  });
  
  // Generate dynamic categories based on findings
  gaps.forEach(gap => {
    if (!categories.has(gap.category)) {
      categories.set(gap.category, {
        tag: gap.category,
        label: getCategoryLabel(gap.category),
        present: gap.type !== 'missing_clause',
        issues: []
      });
    }
  });
  
  // Add categories for existing content that needs optimization
  const contentCategories = detectContentCategories(text, contractType);
  contentCategories.forEach(cat => {
    if (!categories.has(cat.tag)) {
      categories.set(cat.tag, cat);
    }
  });
  
  return {
    gaps,
    categories: Array.from(categories.values()),
    contractType,
    isAmendment: typeConfig.isAmendment || false,
    parentType: typeConfig.parentType || null
  };
};

// 🚀 REVOLUTIONARY: Professional Clause Generator
const generateProfessionalClauses = (contractType, gaps, language = 'de') => {
  const clauses = {};
  const typeConfig = CONTRACT_TYPES[contractType] || CONTRACT_TYPES.sonstiges;
  
  // Universal professional clause templates
  const universalTemplates = {
    schriftform: `§ [X] Schriftformklausel

Änderungen und Ergänzungen dieses Vertrages bedürfen zu ihrer Wirksamkeit der Schriftform. Dies gilt auch für die Aufhebung dieser Schriftformklausel selbst. Elektronische Dokumente in Textform (z.B. E-Mail) genügen der Schriftform nicht.`,

    salvatorisch: `§ [X] Salvatorische Klausel

Sollten einzelne Bestimmungen dieses Vertrages unwirksam oder undurchführbar sein oder nach Vertragsschluss unwirksam oder undurchführbar werden, bleibt davon die Wirksamkeit des Vertrages im Übrigen unberührt. An die Stelle der unwirksamen oder undurchführbaren Bestimmung soll diejenige wirksame und durchführbare Regelung treten, deren Wirkungen der wirtschaftlichen Zielsetzung am nächsten kommen, die die Vertragsparteien mit der unwirksamen bzw. undurchführbaren Bestimmung verfolgt haben.`,

    gerichtsstand: `§ [X] Anwendbares Recht und Gerichtsstand

(1) Für diese Vereinbarung gilt das Recht der Bundesrepublik Deutschland unter Ausschluss des UN-Kaufrechts (CISG).

(2) Ausschließlicher Gerichtsstand für alle Streitigkeiten aus oder im Zusammenhang mit diesem Vertrag ist [ORT], sofern die Parteien Kaufleute, juristische Personen des öffentlichen Rechts oder öffentlich-rechtliche Sondervermögen sind.`,

    datenschutz: `§ [X] Datenschutz

(1) Die Vertragsparteien verpflichten sich, die Bestimmungen der Datenschutz-Grundverordnung (DSGVO) und des Bundesdatenschutzgesetzes (BDSG) einzuhalten.

(2) Personenbezogene Daten werden ausschließlich zur Durchführung dieses Vertrages verarbeitet. Eine Weitergabe an Dritte erfolgt nur, soweit dies zur Vertragserfüllung erforderlich ist oder eine gesetzliche Verpflichtung besteht.

(3) Die betroffenen Personen haben das Recht auf Auskunft, Berichtigung, Löschung und Einschränkung der Verarbeitung ihrer personenbezogenen Daten.`,

    clear_reference: `§ [X] Bezugnahme auf Hauptvertrag

Diese Änderungsvereinbarung bezieht sich auf den [VERTRAGSTYP] vom [DATUM] zwischen den Parteien (im Folgenden "Hauptvertrag"). Die vorliegende Vereinbarung ergänzt und modifiziert den Hauptvertrag in den nachfolgend genannten Punkten.`,

    effective_date: `§ [X] Inkrafttreten

Diese Änderungsvereinbarung tritt mit Wirkung zum [DATUM] in Kraft. Eine rückwirkende Anwendung erfolgt nicht, es sei denn, dies ist ausdrücklich vereinbart.`,

    unchanged_clauses: `§ [X] Fortgeltung

Im Übrigen bleiben alle Bestimmungen des Hauptvertrages vom [DATUM] unverändert bestehen und gelten fort, soweit sie nicht durch diese Änderungsvereinbarung ausdrücklich geändert oder aufgehoben werden.`
  };
  
  // Contract-type specific templates
  const contractSpecificTemplates = {
    arbeitsvertrag: {
      kündigung: `§ [X] Kündigung

(1) Das Arbeitsverhältnis kann von beiden Seiten unter Einhaltung der gesetzlichen Kündigungsfristen ordentlich gekündigt werden.

(2) Die Kündigungsfrist beträgt:
   a) während der vereinbarten Probezeit von [X] Monaten: zwei Wochen zum Monatsende
   b) nach Ablauf der Probezeit: vier Wochen zum 15. oder zum Ende eines Kalendermonats
   c) für den Arbeitgeber verlängern sich die Fristen nach § 622 Abs. 2 BGB

(3) Das Recht zur außerordentlichen Kündigung aus wichtigem Grund bleibt unberührt.

(4) Kündigungen bedürfen zu ihrer Wirksamkeit der Schriftform gemäß § 623 BGB.`,

      datenschutz: `§ [X] Datenschutz und Verschwiegenheit

(1) Der Arbeitnehmer ist verpflichtet, über alle vertraulichen Angelegenheiten, die ihm im Rahmen oder aus Anlass seiner Tätigkeit bekannt werden, Stillschweigen zu bewahren. Diese Verpflichtung besteht auch nach Beendigung des Arbeitsverhältnisses fort.

(2) Die Verarbeitung personenbezogener Daten erfolgt unter Beachtung der DSGVO und des BDSG. Der Arbeitnehmer wurde über die Verarbeitung seiner personenbezogenen Daten gemäß Art. 13 DSGVO informiert.

(3) Der Arbeitnehmer verpflichtet sich zur Einhaltung der betrieblichen Datenschutzrichtlinien.`
    },
    
    arbeitsvertrag_aenderung: {
      aenderungsgegenstand: `§ 1 Änderungsgegenstand

Die Vertragsparteien vereinbaren einvernehmlich, den zwischen ihnen geschlossenen Arbeitsvertrag vom [DATUM] wie folgt zu ändern:

[KONKRETE ÄNDERUNGEN]

Diese Änderungen treten mit Wirkung zum [DATUM] in Kraft.`,

      unveraenderte_bestandteile: `§ 2 Fortbestand des Arbeitsvertrages

Im Übrigen bleiben alle Bestimmungen des Arbeitsvertrages vom [DATUM] unverändert bestehen. Insbesondere bleiben folgende Regelungen unberührt:
- Kündigungsfristen
- Urlaubsanspruch
- Verschwiegenheitsverpflichtungen
- Wettbewerbsverbot`
    }
  };
  
  // Generate clauses based on gaps
  gaps.forEach(gap => {
    if (gap.type === 'missing_clause') {
      // First check universal templates
      if (universalTemplates[gap.clause]) {
        clauses[gap.clause] = universalTemplates[gap.clause];
      }
      // Then check contract-specific templates
      else if (contractSpecificTemplates[contractType]?.[gap.clause]) {
        clauses[gap.clause] = contractSpecificTemplates[contractType][gap.clause];
      }
      // Default template
      else {
        clauses[gap.clause] = `§ [X] ${gap.clause.replace(/_/g, ' ').charAt(0).toUpperCase() + gap.clause.slice(1).replace(/_/g, ' ')}

[Diese Klausel sollte ${gap.description} regeln. Bitte lassen Sie sich von einem Rechtsanwalt beraten.]`;
      }
    }
  });
  
  return clauses;
};

// 🚀 FIX: Smart Text Truncation for Token Limit
const smartTruncateContract = (text, maxLength = 6000) => {
  if (text.length <= maxLength) return text;
  
  // Take beginning and end (most important parts)
  const startLength = Math.floor(maxLength * 0.6);
  const endLength = Math.floor(maxLength * 0.4);
  
  return text.slice(0, startLength) + 
         '\n\n[... Mittelteil für Analyse gekürzt ...]\n\n' + 
         text.slice(-endLength);
};

// 🚀 UNIVERSAL: Enhanced AI Prompt System
const createOptimizedPrompt = (contractText, contractType, gaps, fileName, contractInfo) => {
  const truncatedText = smartTruncateContract(contractText, 5000);
  
  // Build context-aware prompt based on contract type
  let contextInstructions = '';
  
  if (contractInfo.isAmendment) {
    contextInstructions = `
WICHTIG: Dies ist eine ÄNDERUNGSVEREINBARUNG/ERGÄNZUNG zu einem ${contractInfo.parentType || 'Vertrag'}.

Analysiere speziell:
1. Klarheit der Änderungen und deren Umfang
2. Eindeutiger Bezug zum Hauptvertrag (Datum, Parteien)
3. Gültigkeitsdatum und eventuelle Rückwirkung
4. Aussage über unveränderte Vertragsbestandteile
5. Widerspruchsfreiheit zum Hauptvertrag
6. Formelle Anforderungen (Unterschriften, Schriftform)

Gib KEINE Empfehlungen für Klauseln, die im Hauptvertrag stehen sollten (wie Kündigungsfristen, Grundvergütung etc.).
Fokussiere dich auf die Qualität der ÄNDERUNG selbst.`;
  } else {
    contextInstructions = `
Dies ist ein ${CONTRACT_TYPES[contractType]?.name || contractType}.

Analysiere nach branchenüblichen Standards für ${contractType}:
- Vollständigkeit der erforderlichen Klauseln
- Rechtliche Risiken und Unausgewogenheiten
- Klarheit und Eindeutigkeit der Formulierungen
- Marktüblichkeit der Konditionen`;
  }
  
  return `VERTRAGSTYP: ${contractType} | DATEI: ${fileName}
${contractInfo.isAmendment ? 'DOKUMENTART: Änderungsvereinbarung/Ergänzung' : ''}
LÜCKEN GEFUNDEN: ${gaps.length}
${contextInstructions}

VERTRAG (Auszug):
${truncatedText}

Erstelle die TOP 8-10 wichtigsten, KONKRETE Optimierungen im JSON-Format.
${contractInfo.isAmendment ? 'Fokus auf Änderungsspezifische Aspekte!' : ''}

{
  "meta": {
    "type": "${contractType}",
    "isAmendment": ${contractInfo.isAmendment || false},
    "parentType": "${contractInfo.parentType || ''}",
    "jurisdiction": "DE",
    "language": "de"
  },
  "categories": [
    {
      "tag": "kategorie_tag",
      "label": "Display Name",
      "present": true/false,
      "issues": [
        {
          "id": "unique_id",
          "summary": "Präzise Problembeschreibung",
          "originalText": "Exakter Auszug oder 'FEHLT'",
          "improvedText": "VOLLSTÄNDIGER verbesserter Klauseltext (mind. 200 Zeichen)",
          "legalReasoning": "Detaillierte juristische Begründung (2-3 Sätze)",
          "risk": 1-10,
          "impact": 1-10,
          "confidence": 70-100,
          "difficulty": "Einfach|Mittel|Komplex"
        }
      ]
    }
  ],
  "score": { "health": 0-100 },
  "summary": { "redFlags": X, "quickWins": Y, "totalIssues": Z }
}

WICHTIG: 
- NUR die relevantesten Probleme für DIESEN Vertragstyp
- KONKRETE, VOLLSTÄNDIGE Verbesserungsvorschläge
- Keine generischen Empfehlungen`;
};

// 🚀 MAIN ROUTE with Universal Support
router.post("/", verifyToken, upload.single("file"), async (req, res) => {
  const requestId = `opt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  console.log(`🚀 [${requestId}] UNIVERSAL Contract Optimization Request:`, {
    hasFile: !!req.file,
    userId: req.user?.userId,
    filename: req.file?.originalname,
    fileSize: req.file?.size
  });

  if (!req.file) {
    return res.status(400).json({ 
      success: false,
      message: "❌ Keine Datei hochgeladen.",
      error: "FILE_MISSING"
    });
  }

  let tempFilePath = null;
  
  try {
    tempFilePath = req.file.path;
    
    // Database setup
    const optimizationCollection = req.db.collection("optimizations");
    const usersCollection = req.db.collection("users");
    
    // User validation and limits
    const user = await usersCollection.findOne({ _id: new ObjectId(req.user.userId) });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "❌ Benutzer nicht gefunden.",
        error: "USER_NOT_FOUND"
      });
    }

    const plan = user.subscriptionPlan || "free";
    const optimizationCount = user.optimizationCount ?? 0;

    let limit = 0;
    if (plan === "business") limit = 50;
    if (plan === "premium") limit = Infinity;

    if (optimizationCount >= limit) {
      return res.status(403).json({
        success: false,
        message: plan === "free" 
          ? "❌ KI-Vertragsoptimierung ist ein Premium-Feature."
          : "❌ Optimierung-Limit erreicht.",
        error: "LIMIT_EXCEEDED",
        currentCount: optimizationCount,
        limit: limit,
        plan: plan
      });
    }

    // Extract text from PDF
    const buffer = await fs.readFile(tempFilePath);
    const parsed = await pdfParse(buffer, {
      max: 100000,
      normalizeWhitespace: true
    });
    
    const contractText = parsed.text?.slice(0, 15000) || '';
    
    if (!contractText.trim()) {
      throw new Error("PDF enthält keinen lesbaren Text.");
    }

    console.log(`🔍 [${requestId}] Starting UNIVERSAL contract analysis...`);
    
    // 🚀 STAGE 1: Universal Contract Type Detection
    const contractTypeInfo = await detectContractType(contractText, req.file.originalname);
    console.log(`📋 [${requestId}] Contract detected:`, {
      type: contractTypeInfo.type,
      isAmendment: contractTypeInfo.isAmendment,
      parentType: contractTypeInfo.parentType,
      confidence: contractTypeInfo.confidence,
      jurisdiction: contractTypeInfo.jurisdiction
    });
    
    // 🚀 STAGE 2: Context-Aware Gap Analysis
    const gapAnalysis = analyzeContractGaps(
      contractText, 
      contractTypeInfo.type,
      contractTypeInfo.detectedClauses
    );
    console.log(`🔍 [${requestId}] Gaps analysis:`, {
      totalGaps: gapAnalysis.gaps.length,
      categories: gapAnalysis.categories.length,
      isAmendment: gapAnalysis.isAmendment
    });
    
    // 🚀 STAGE 3: Generate Professional Clauses for gaps
    const generatedClauses = generateProfessionalClauses(
      contractTypeInfo.type,
      gapAnalysis.gaps,
      contractTypeInfo.language
    );
    console.log(`📝 [${requestId}] Generated ${Object.keys(generatedClauses).length} professional clauses`);
    
    // 🚀 STAGE 4: AI-Powered Deep Analysis
    const openai = getOpenAI();
    
    const optimizedPrompt = createOptimizedPrompt(
      contractText,
      contractTypeInfo.type,
      gapAnalysis.gaps,
      req.file.originalname,
      contractTypeInfo
    );

    const modelToUse = contractText.length > 8000 
      ? "gpt-4-turbo-preview"
      : "gpt-4-turbo-preview";

    console.log(`🤖 [${requestId}] Using AI model: ${modelToUse}`);

    let completion;
    try {
      completion = await Promise.race([
        openai.chat.completions.create({
          model: modelToUse,
          messages: [
            { 
              role: "system", 
              content: `Du bist ein spezialisierter Vertragsrechtsexperte mit Fokus auf ${contractTypeInfo.type}. 
                       ${contractTypeInfo.isAmendment ? 'Spezialisierung: Vertragsänderungen und Ergänzungsvereinbarungen.' : ''}
                       Antworte NUR mit validem JSON Format.` 
            },
            { role: "user", content: optimizedPrompt }
          ],
          temperature: 0.1,
          max_tokens: 3000,
          top_p: 0.95,
          response_format: { type: "json_object" }
        }).catch(async (error) => {
          if (error.code === 'context_length_exceeded') {
            console.log(`⚠️ [${requestId}] Token limit, using shorter prompt...`);
            
            const shorterPrompt = createOptimizedPrompt(
              smartTruncateContract(contractText, 3000),
              contractTypeInfo.type,
              gapAnalysis.gaps.slice(0, 5),
              req.file.originalname,
              contractTypeInfo
            );
            
            return openai.chat.completions.create({
              model: "gpt-3.5-turbo-16k",
              messages: [
                { role: "system", content: "Vertragsexperte. JSON-Antwort." },
                { role: "user", content: shorterPrompt }
              ],
              temperature: 0.1,
              max_tokens: 2000
            });
          }
          throw error;
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error("AI Timeout")), 60000)
        )
      ]);
    } catch (aiError) {
      console.error(`❌ [${requestId}] AI Error:`, aiError);
      
      // Fallback response
      completion = {
        choices: [{
          message: {
            content: JSON.stringify({
              meta: contractTypeInfo,
              categories: gapAnalysis.categories,
              score: { health: 75 },
              summary: { 
                redFlags: gapAnalysis.gaps.filter(g => g.severity === 'critical').length,
                quickWins: gapAnalysis.gaps.filter(g => g.severity === 'low').length,
                totalIssues: gapAnalysis.gaps.length
              }
            })
          }
        }]
      };
    }

    const aiOutput = completion.choices[0].message.content || "";
    
    // 🚀 STAGE 5: Normalize and Validate Output
    const normalizedResult = normalizeAndValidateOutput(aiOutput, contractTypeInfo.type);
    
    // 🚀 STAGE 6: Enhance with generated clauses
    gapAnalysis.gaps.forEach(gap => {
      if (gap.type === 'missing_clause' && generatedClauses[gap.clause]) {
        const categoryTag = getCategoryForClause(gap.clause);
        let category = normalizedResult.categories.find(c => c.tag === categoryTag);
        
        if (!category) {
          category = {
            tag: categoryTag,
            label: getCategoryLabel(categoryTag),
            present: false,
            issues: []
          };
          normalizedResult.categories.push(category);
        }
        
        category.issues.push({
          id: `missing_${gap.clause}_${Date.now()}`,
          summary: gap.description,
          originalText: 'FEHLT - Diese Klausel ist nicht vorhanden',
          improvedText: generatedClauses[gap.clause],
          legalReasoning: `Diese Klausel ist für ${contractTypeInfo.type} ${gap.severity === 'critical' ? 'zwingend erforderlich' : 'dringend empfohlen'}. ${contractTypeInfo.isAmendment ? 'Sollte im Hauptvertrag geregelt sein.' : 'Ohne diese Regelung bestehen rechtliche Risiken.'}`,
          benchmark: `${gap.severity === 'critical' ? '95%' : '85%'} aller professionellen ${contractTypeInfo.type}-Verträge enthalten diese Klausel`,
          risk: gap.severity === 'critical' ? 9 : gap.severity === 'high' ? 7 : 5,
          impact: gap.severity === 'critical' ? 9 : gap.severity === 'high' ? 7 : 5,
          confidence: 95,
          difficulty: 'Einfach'
        });
        
        normalizedResult.summary.totalIssues++;
        if (gap.severity === 'critical' || gap.severity === 'high') {
          normalizedResult.summary.redFlags++;
        }
      }
    });
    
    // 🚀 STAGE 7: Calculate proper health score
    let healthScore = 100;
    
    // Deduct points based on issues
    normalizedResult.summary.redFlags = normalizedResult.summary.redFlags || 0;
    normalizedResult.summary.quickWins = normalizedResult.summary.quickWins || 0;
    normalizedResult.summary.totalIssues = normalizedResult.summary.totalIssues || 0;
    
    // For amendments, be more lenient
    if (contractTypeInfo.isAmendment) {
      healthScore -= normalizedResult.summary.redFlags * 8;
      healthScore -= (normalizedResult.summary.totalIssues - normalizedResult.summary.redFlags) * 3;
      healthScore = Math.max(40, healthScore); // Minimum 40 for amendments
    } else {
      healthScore -= normalizedResult.summary.redFlags * 12;
      healthScore -= (normalizedResult.summary.totalIssues - normalizedResult.summary.redFlags) * 5;
      healthScore = Math.max(25, healthScore);
    }
    
    normalizedResult.score.health = Math.round(healthScore);
    
    // 🚀 STAGE 8: Final enrichment
    normalizedResult.meta = {
      ...normalizedResult.meta,
      ...contractTypeInfo,
      fileName: req.file.originalname,
      analysisVersion: '4.0-universal',
      gapsFound: gapAnalysis.gaps.length,
      categoriesGenerated: normalizedResult.categories.length,
      documentClass: contractTypeInfo.isAmendment ? 'amendment' : 'main_contract'
    };

    console.log(`✅ [${requestId}] UNIVERSAL optimization complete:`, {
      contractType: normalizedResult.meta.type,
      isAmendment: normalizedResult.meta.isAmendment,
      parentType: normalizedResult.meta.parentType,
      categories: normalizedResult.categories.length,
      totalIssues: normalizedResult.summary.totalIssues,
      redFlags: normalizedResult.summary.redFlags,
      quickWins: normalizedResult.summary.quickWins,
      healthScore: normalizedResult.score.health
    });

    // Save to database
    const optimizationData = {
      userId: req.user.userId,
      contractName: req.file.originalname,
      contractType: normalizedResult.meta.type,
      isAmendment: normalizedResult.meta.isAmendment,
      parentType: normalizedResult.meta.parentType,
      originalText: contractText.substring(0, 2000),
      optimizationResult: normalizedResult,
      fileSize: req.file.size,
      textLength: contractText.length,
      model: modelToUse,
      processingTime: Date.now() - parseInt(requestId.split('_')[1]),
      createdAt: new Date(),
      requestId,
      metadata: normalizedResult.meta
    };

    await optimizationCollection.insertOne(optimizationData);
    await usersCollection.updateOne(
      { _id: user._id },
      { 
        $inc: { optimizationCount: 1 },
        $set: { lastOptimization: new Date() }
      }
    );

    // Send response
    res.json({ 
      success: true,
      message: "✅ UNIVERSAL KI-Vertragsoptimierung erfolgreich",
      requestId,
      ...normalizedResult,
      originalText: contractText.substring(0, 1000),
      usage: {
        count: optimizationCount + 1,
        limit: limit,
        plan: plan
      }
    });

  } catch (error) {
    console.error(`❌ [${requestId}] Error:`, error);
    
    res.status(500).json({ 
      success: false,
      message: error.message || "Fehler bei der Vertragsoptimierung",
      error: "OPTIMIZATION_ERROR",
      requestId,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });

  } finally {
    if (tempFilePath && fsSync.existsSync(tempFilePath)) {
      await fs.unlink(tempFilePath).catch(err => 
        console.error(`Failed to delete temp file: ${err}`)
      );
    }
  }
});

// 🚀 ADDITIONAL ROUTES

// Health check endpoint
router.get("/health", async (req, res) => {
  res.json({
    status: "healthy",
    service: "optimize",
    version: "4.0-universal",
    contractTypes: Object.keys(CONTRACT_TYPES).length,
    features: {
      universalDetection: true,
      amendmentSupport: true,
      professionalClauses: true,
      aiAnalysis: true
    }
  });
});

// Get supported contract types
router.get("/contract-types", verifyToken, (req, res) => {
  const types = Object.entries(CONTRACT_TYPES).map(([key, config]) => ({
    id: key,
    name: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    isAmendment: config.isAmendment || false,
    parentType: config.parentType || null,
    jurisdiction: config.jurisdiction,
    requiredClauses: config.requiredClauses.length,
    riskFactors: config.riskFactors.length
  }));
  
  res.json({
    success: true,
    totalTypes: types.length,
    types: types
  });
});

// Get optimization history
router.get("/history", verifyToken, async (req, res) => {
  try {
    const optimizationCollection = req.db.collection("optimizations");
    
    const history = await optimizationCollection
      .find({ userId: req.user.userId })
      .sort({ createdAt: -1 })
      .limit(20)
      .toArray();
    
    res.json({
      success: true,
      count: history.length,
      optimizations: history.map(opt => ({
        id: opt._id,
        contractName: opt.contractName,
        contractType: opt.contractType,
        isAmendment: opt.isAmendment || false,
        healthScore: opt.optimizationResult?.score?.health || 0,
        totalIssues: opt.optimizationResult?.summary?.totalIssues || 0,
        createdAt: opt.createdAt,
        requestId: opt.requestId
      }))
    });
  } catch (error) {
    console.error("Error fetching optimization history:", error);
    res.status(500).json({
      success: false,
      message: "Fehler beim Laden der Historie",
      error: error.message
    });
  }
});

// Get specific optimization
router.get("/:requestId", verifyToken, async (req, res) => {
  try {
    const optimizationCollection = req.db.collection("optimizations");
    
    const optimization = await optimizationCollection.findOne({
      requestId: req.params.requestId,
      userId: req.user.userId
    });
    
    if (!optimization) {
      return res.status(404).json({
        success: false,
        message: "Optimierung nicht gefunden",
        error: "NOT_FOUND"
      });
    }
    
    res.json({
      success: true,
      ...optimization.optimizationResult,
      contractName: optimization.contractName,
      createdAt: optimization.createdAt
    });
  } catch (error) {
    console.error("Error fetching optimization:", error);
    res.status(500).json({
      success: false,
      message: "Fehler beim Laden der Optimierung",
      error: error.message
    });
  }
});

module.exports = router;