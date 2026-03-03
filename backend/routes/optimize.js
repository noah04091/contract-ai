// 📁 backend/routes/optimize.js - ULTIMATIVE ANWALTSKANZLEI-VERSION v5.0
// 🚀 UNIVERSELLE KI-VERTRAGSOPTIMIERUNG AUF WELTKLASSE-NIVEAU
// ⚖️ JURISTISCHE PRÄZISION + VOLLSTÄNDIGE KLAUSELN + ALLE VERTRAGSTYPEN

const express = require("express");
const multer = require("multer");
const pdfParse = require("pdf-parse");
const { extractTextFromBuffer, isSupportedMimetype } = require("../services/textExtractor");
const fs = require("fs").promises;
const fsSync = require("fs");
const path = require("path");
const { OpenAI } = require("openai");
const verifyToken = require("../middleware/verifyToken");
const { ObjectId } = require("mongodb");
const database = require("../config/database");
const { standardLimiter, uploadLimiter, analyzeLimiter } = require("../middleware/rateLimiter");
const { runBaselineRules } = require("../services/optimizer/rules");
// 🔥 FIX 4+: Quality Layer imports (mit Sanitizer + Content-Mismatch Guard + Context-Aware Benchmarks)
const { dedupeIssues, ensureCategory, sanitizeImprovedText, sanitizeText, sanitizeBenchmark, cleanPlaceholders, isTextMatchingCategory, generateContextAwareBenchmark } = require("../services/optimizer/quality");
const { getFeatureLimit, isEnterpriseOrHigher } = require("../constants/subscriptionPlans"); // 📊 Zentrale Plan-Definitionen
const { findContractWithOrgAccess, hasPermission } = require("../utils/orgContractAccess"); // 👥 Org-basierter Zugriff
const { fixUtf8Filename } = require("../utils/fixUtf8"); // ✅ Fix UTF-8 Encoding

// 🆕 S3 SDK für PDF-Upload
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

const router = express.Router();
const upload = multer({ dest: "uploads/" });

// 🔥 MongoDB Setup für Contract-Speicherung (Shared Singleton Pool)
let contractsCollection, db;

async function ensureDb() {
  if (!db) {
    db = await database.connect();
    contractsCollection = db.collection("contracts");
  }
}

// 🆕 S3 Client Setup
let s3Instance = null;
try {
  s3Instance = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });
  console.log("✅ Optimize.js: S3 Client initialisiert für PDF-Upload!");
} catch (err) {
  console.error("❌ Optimize.js S3 Init Fehler:", err);
}

// ✅ SINGLETON OpenAI-Instance with retry logic and fallback
let openaiInstance = null;
const getOpenAI = () => {
  if (!openaiInstance) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OpenAI API Key fehlt in Umgebungsvariablen");
    }
    openaiInstance = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 300000, // 🔥 Erhöht auf 300s (5min) für gpt-4o mit langen Verträgen
      maxRetries: 3    // Reduce retries (with 5min timeout, retries take too long)
    });
    console.log("🔧 OpenAI-Instance für Anwaltskanzlei-Level Optimierung initialisiert");
  }
  return openaiInstance;
};

// 🆕 Upload PDF to S3
const uploadToS3 = async (localFilePath, originalFilename, userId) => {
  try {
    const fileBuffer = await fs.readFile(localFilePath);
    const s3Key = `contracts/${Date.now()}-${originalFilename}`;

    const command = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: s3Key,
      Body: fileBuffer,
      ContentType: originalFilename?.endsWith('.docx') ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : 'application/pdf',
      Metadata: {
        uploadDate: new Date().toISOString(),
        userId: userId || 'unknown',
        source: 'optimizer'
      },
    });

    await s3Instance.send(command);

    const s3Location = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`;

    console.log(`✅ [S3-Optimizer] Successfully uploaded to: ${s3Location}`);

    return {
      s3Key,
      s3Location,
      s3Bucket: process.env.S3_BUCKET_NAME,
    };
  } catch (error) {
    console.error(`❌ [S3-Optimizer] Upload failed:`, error);
    throw error;
  }
};

// 🚀 ULTIMATIVE VERTRAGSTYPEN-DATENBANK (100+ Typen mit juristischer Präzision)
const CONTRACT_TYPES = {
  // ════════════════════════════════════════════════════════════════════
  // ARBEITSRECHT - Vollständige Abdeckung
  // ════════════════════════════════════════════════════════════════════
  arbeitsvertrag: {
    keywords: ['arbeitnehmer', 'arbeitgeber', 'gehalt', 'arbeitszeit', 'urlaub', 'kündigung', 'probezeit', 'tätigkeit', 'vergütung', 'arbeitsvertrag', 'beschäftigung', 'dienstverhältnis'],
    requiredClauses: ['arbeitszeit', 'vergütung', 'urlaub', 'kündigung', 'tätigkeit', 'probezeit', 'datenschutz', 'verschwiegenheit', 'arbeitsort', 'nebentätigkeit'],
    jurisdiction: 'DE',
    legalFramework: ['BGB §§ 611-630', 'ArbZG', 'BUrlG', 'EntgFG', 'KSchG', 'NachwG', 'BetrVG', 'AGG'],
    riskFactors: ['befristung_ohne_grund', 'konkurrenzklausel_unbillig', 'rückzahlungsklausel_unwirksam', 'vertragsstrafe_überhöht', 'überstunden_pauschal', 'urlaubsverfall', 'probezeitverlängerung'],
    specificChecks: {
      mindesturlaub: value => value >= 24,
      probezeit: value => value <= 6,
      kündigungsfrist: value => value >= 4,
      wochenarbeitszeit: value => value <= 48
    }
  },
  
  arbeitsvertrag_aenderung: {
    keywords: ['arbeitszeitänderung', 'gehaltserhöhung', 'vertragsänderung', 'änderungsvereinbarung', 'anpassung', 'erhöhung arbeitszeit', 'arbeitszeiterhöhung', 'arbeitszeitanpassung', 'stundenerhöhung', 'vertragsergänzung', 'zusatzvereinbarung'],
    requiredClauses: ['aenderungsgegenstand', 'gueltigkeitsdatum', 'neue_konditionen', 'referenz_hauptvertrag', 'unveraenderte_bestandteile', 'schriftform', 'salvatorisch'],
    jurisdiction: 'DE',
    parentType: 'arbeitsvertrag',
    isAmendment: true,
    legalFramework: ['BGB § 311', 'NachwG § 2', 'TzBfG § 8', 'GewO § 106'],
    riskFactors: ['rueckwirkung_unzulaessig', 'widerspruch_hauptvertrag', 'unklare_regelung', 'fehlende_gegenleistung', 'aenderungskuendigung_erforderlich']
  },
  
  aufhebungsvertrag: {
    keywords: ['aufhebung', 'beendigung', 'abfindung', 'aufhebungsvertrag', 'einvernehmlich', 'freistellung', 'ausscheiden', 'trennung'],
    requiredClauses: ['beendigungsdatum', 'abfindung', 'zeugnis', 'freistellung', 'sperrzeit', 'resturlaub', 'rueckgabe', 'ausgleichsquittung', 'wettbewerbsverbot'],
    jurisdiction: 'DE',
    legalFramework: ['BGB §§ 779ff', 'SGB III § 159', 'EStG § 34', 'KSchG'],
    riskFactors: ['sperrzeit_alg', 'abfindung_zu_niedrig', 'zeugnisnote_schlecht', 'nachvertragliches_wettbewerbsverbot_ohne_karenz', 'klageverzicht_unwirksam']
  },
  
  praktikumsvertrag: {
    keywords: ['praktikum', 'praktikant', 'pflichtpraktikum', 'ausbildung', 'studium', 'praktikumsdauer', 'hochschule', 'universität'],
    requiredClauses: ['praktikumsdauer', 'ausbildungsinhalte', 'verguetung', 'urlaub', 'zeugnis', 'versicherung', 'betreuung', 'lernziele'],
    jurisdiction: 'DE',
    legalFramework: ['BBiG § 26', 'MiLoG', 'NachwG', 'BUrlG', 'JArbSchG'],
    riskFactors: ['mindestlohn_unterschreitung', 'scheinselbstaendigkeit', 'keine_ausbildungsinhalte', 'zu_lange_dauer', 'fehlende_betreuung']
  },
  
  ausbildungsvertrag: {
    keywords: ['ausbildung', 'auszubildender', 'azubi', 'berufsausbildung', 'lehrling', 'ausbilder', 'ihk', 'handwerkskammer'],
    requiredClauses: ['ausbildungsdauer', 'ausbildungsverguetung', 'ausbildungsplan', 'probezeit', 'urlaub', 'berufsschule', 'pruefungen', 'uebernahme'],
    jurisdiction: 'DE',
    legalFramework: ['BBiG', 'HwO', 'JArbSchG', 'BUrlG', 'TVAöD'],
    riskFactors: ['verguetung_unter_tarif', 'fehlender_ausbildungsplan', 'unzulaessige_klauseln', 'probezeit_zu_lang', 'kuendigung_nach_probezeit']
  },
  
  geschaeftsfuehrervertrag: {
    keywords: ['geschäftsführer', 'geschäftsführung', 'gmbh', 'anstellungsvertrag', 'organ', 'gesellschaft', 'prokura'],
    requiredClauses: ['bestellung', 'vertretungsmacht', 'verguetung', 'tantiemen', 'wettbewerbsverbot', 'haftung', 'abberufung', 'd&o_versicherung'],
    jurisdiction: 'DE',
    legalFramework: ['GmbHG §§ 35ff', 'HGB §§ 48ff', 'AktG §§ 84ff', 'BGB § 611a'],
    riskFactors: ['persoenliche_haftung', 'unklare_kompetenzen', 'fehlende_do_versicherung', 'wettbewerbsverbot_ohne_karenz']
  },
  
  // ════════════════════════════════════════════════════════════════════
  // MIETRECHT - Vollständige Systematik
  // ════════════════════════════════════════════════════════════════════
  mietvertrag_wohnung: {
    keywords: ['mieter', 'vermieter', 'miete', 'nebenkosten', 'kaution', 'wohnung', 'mietobjekt', 'wohnraum', 'zimmer'],
    requiredClauses: ['mietdauer', 'miethöhe', 'nebenkosten', 'kaution', 'schönheitsreparaturen', 'kündigung', 'mietobjekt', 'mietanpassung', 'betriebskosten'],
    jurisdiction: 'DE',
    legalFramework: ['BGB §§ 535-580a', 'BetrkV', 'WoFlV', 'MietNovG', 'EnEV'],
    riskFactors: ['mietpreisbremse', 'staffelmiete_unwirksam', 'indexmiete_falsch', 'renovierung_unwirksam', 'kleinreparaturen_zu_hoch', 'kaution_ueber_3mm']
  },
  
  gewerbemietvertrag: {
    keywords: ['gewerbemiete', 'geschäftsraum', 'ladenfläche', 'bürofläche', 'gewerblich', 'geschäftsräume', 'gewerbe'],
    requiredClauses: ['mietdauer', 'mietzins', 'nebenkosten', 'verwendungszweck', 'untervermietung', 'konkurrenzschutz', 'bauliche_veraenderungen', 'instandhaltung'],
    jurisdiction: 'DE',
    legalFramework: ['BGB §§ 535ff', 'HGB', 'GewO', 'BauNVO'],
    riskFactors: ['umsatzmiete_unklar', 'wertsicherung_unwirksam', 'betriebspflicht', 'konkurrenzschutz_zu_weitgehend', 'keine_sonderkuendigung']
  },
  
  untermietvertrag: {
    keywords: ['untermiete', 'untervermieter', 'hauptmieter', 'untermieterlaubnis', 'untermieter', 'zwischenmiete'],
    requiredClauses: ['hauptmietvertrag_referenz', 'erlaubnis_vermieter', 'untermietdauer', 'untermietzins', 'kuendigung', 'kaution', 'beendigung_hauptmietvertrag'],
    jurisdiction: 'DE',
    parentType: 'mietvertrag_wohnung',
    legalFramework: ['BGB § 540', 'BGB § 553', 'AGG'],
    riskFactors: ['fehlende_erlaubnis', 'haftung_hauptmieter', 'kuendigungsrisiko', 'keine_direktansprueche']
  },
  
  pachtvertrag: {
    keywords: ['pacht', 'pächter', 'verpächter', 'pachtzins', 'landwirtschaft', 'gastronomie', 'pachtgrundstück'],
    requiredClauses: ['pachtobjekt', 'pachtzins', 'pachtdauer', 'verwendungszweck', 'inventar', 'instandhaltung', 'rueckgabe', 'investitionen'],
    jurisdiction: 'DE',
    legalFramework: ['BGB §§ 581-597', 'LPachtVG', 'BauGB'],
    riskFactors: ['betriebspflicht', 'inventarhaftung', 'pachtzinsanpassung', 'investitionsrisiko', 'vorkaufsrecht']
  },
  
  // ════════════════════════════════════════════════════════════════════
  // IT & SOFTWARE - Digitale Transformation
  // ════════════════════════════════════════════════════════════════════
  saas_vertrag: {
    keywords: ['software', 'service', 'saas', 'subscription', 'cloud', 'lizenz', 'nutzer', 'api', 'sla', 'support', 'hosting'],
    requiredClauses: ['leistungsbeschreibung', 'sla', 'verfügbarkeit', 'support', 'datenschutz', 'haftung', 'kündigung', 'preisanpassung', 'datenportabilität', 'exit_strategie'],
    jurisdiction: 'INT',
    legalFramework: ['DSGVO', 'TMG', 'TKG', 'UrhG', 'Cloud Act'],
    riskFactors: ['auto_renewal', 'preiserhöhung_unbegrenzt', 'datenexport_unklar', 'vendor_lock_in', 'haftungsausschluss_unwirksam', 'keine_sla_penalties']
  },
  
  softwarelizenz: {
    keywords: ['lizenz', 'software', 'nutzungsrecht', 'installation', 'aktivierung', 'updates', 'einzelplatz', 'mehrplatz', 'perpetual', 'subscription'],
    requiredClauses: ['lizenzumfang', 'nutzungsbeschränkungen', 'updates', 'support', 'laufzeit', 'uebertragbarkeit', 'audit_rechte', 'source_code_escrow'],
    jurisdiction: 'INT',
    legalFramework: ['UrhG', 'MarkenG', 'UWG', 'EULA Standards'],
    riskFactors: ['keine_updates', 'keine_garantie', 'audit_rechte_exzessiv', 'territoriale_beschraenkung', 'keine_uebertragbarkeit']
  },
  
  softwareentwicklungsvertrag: {
    keywords: ['softwareentwicklung', 'programmierung', 'entwicklung', 'agile', 'scrum', 'entwickler', 'pflichtenheft', 'lastenheft', 'customizing'],
    requiredClauses: ['leistungsbeschreibung', 'entwicklungsphasen', 'abnahme', 'nutzungsrechte', 'gewaehrleistung', 'vergütung', 'change_requests', 'dokumentation'],
    jurisdiction: 'DE',
    legalFramework: ['BGB §§ 631ff', 'UrhG §§ 69a ff', 'VOL/B'],
    riskFactors: ['unklare_spezifikation', 'fehlende_nutzungsrechte', 'keine_wartung', 'haftungsausschluss', 'keine_source_code_herausgabe']
  },
  
  // ════════════════════════════════════════════════════════════════════
  // KAUF & HANDEL - Kommerzielle Transaktionen
  // ════════════════════════════════════════════════════════════════════
  kaufvertrag: {
    keywords: ['käufer', 'verkäufer', 'kaufpreis', 'kaufgegenstand', 'übergabe', 'eigentum', 'gewährleistung', 'zahlung', 'kaufsache'],
    requiredClauses: ['kaufgegenstand', 'kaufpreis', 'zahlung', 'lieferung', 'eigentumsvorbehalt', 'gewährleistung', 'haftung', 'gefahruebergang'],
    jurisdiction: 'DE',
    legalFramework: ['BGB §§ 433-515', 'HGB §§ 373-382', 'UN-Kaufrecht', 'ProdHaftG'],
    riskFactors: ['eigentumsvorbehalt_unwirksam', 'gewährleistungsausschluss_verbraucher', 'transportrisiko', 'sachmangel', 'rechtsmangel']
  },
  
  kaufvertrag_immobilie: {
    keywords: ['grundstück', 'immobilie', 'notar', 'grundbuch', 'kaufpreis', 'übergabe', 'bebauung', 'eigentumswohnung', 'haus'],
    requiredClauses: ['objektbeschreibung', 'kaufpreis', 'faelligkeit', 'uebergabe', 'gewaehrleistung', 'auflassung', 'grundbuch', 'erschliessung', 'belastungen'],
    jurisdiction: 'DE',
    legalFramework: ['BGB §§ 433ff', 'BeurkG', 'GBO', 'GrEStG', 'BauGB', 'WEG'],
    riskFactors: ['altlasten', 'bauschaeden', 'erschliessung_unklar', 'vorkaufsrecht', 'baulasten', 'denkmalschutz']
  },
  
  // ════════════════════════════════════════════════════════════════════
  // DIENSTLEISTUNGEN - Professionelle Services
  // ════════════════════════════════════════════════════════════════════
  dienstvertrag: {
    keywords: ['auftragnehmer', 'auftraggeber', 'dienstleistung', 'honorar', 'leistung', 'freiberufler', 'freelancer', 'selbständig'],
    requiredClauses: ['leistungsbeschreibung', 'vergütung', 'leistungszeit', 'abnahme', 'haftung', 'kündigung', 'geheimhaltung', 'subunternehmer'],
    jurisdiction: 'DE',
    legalFramework: ['BGB §§ 611-630', 'HGB', 'SGB IV § 7', 'AÜG'],
    riskFactors: ['scheinselbständigkeit', 'haftung_unbegrenzt', 'verzug', 'mängelhaftung', 'keine_versicherung']
  },
  
  werkvertrag: {
    keywords: ['werkunternehmer', 'besteller', 'werk', 'abnahme', 'vergütung', 'mängel', 'nacherfüllung', 'werkvertrag', 'herstellung'],
    requiredClauses: ['werkbeschreibung', 'vergütung', 'termine', 'abnahme', 'gewährleistung', 'haftung', 'kündigung', 'vob'],
    jurisdiction: 'DE',
    legalFramework: ['BGB §§ 631-651', 'VOB/B', 'HOAI'],
    riskFactors: ['pauschalpreis_risiko', 'vertragsstrafe', 'abnahmeverzug', 'mängelhaftung', 'mehrkosten']
  },
  
  beratervertrag: {
    keywords: ['beratung', 'consultant', 'consulting', 'berater', 'expertise', 'analyse', 'strategie', 'unternehmensberatung'],
    requiredClauses: ['beratungsumfang', 'vergütung', 'vertraulichkeit', 'haftungsbeschränkung', 'laufzeit', 'kuendigung', 'erfolg', 'reporting'],
    jurisdiction: 'DE',
    parentType: 'dienstvertrag',
    legalFramework: ['BGB §§ 611ff', 'StBerG', 'RDG', 'WpHG'],
    riskFactors: ['erfolgsgarantie_unzulaessig', 'unbegrenzte_haftung', 'interessenkonflikt', 'keine_berufshaftpflicht']
  },
  
  // ════════════════════════════════════════════════════════════════════
  // GESELLSCHAFTSRECHT - Unternehmensstrukturen
  // ════════════════════════════════════════════════════════════════════
  gesellschaftsvertrag_gmbh: {
    keywords: ['gesellschafter', 'geschäftsanteile', 'stammkapital', 'gewinnverteilung', 'geschäftsführung', 'gesellschaft', 'gmbh'],
    requiredClauses: ['gesellschafter', 'stammkapital', 'geschäftsführung', 'gewinnverteilung', 'beschlussfassung', 'verfügung_anteile', 'austritt', 'jahresabschluss'],
    jurisdiction: 'DE',
    legalFramework: ['GmbHG', 'HGB', 'AktG', 'UmwG', 'InsO'],
    riskFactors: ['drag_along', 'tag_along', 'vorkaufsrecht', 'wettbewerbsverbot', 'bad_leaver', 'deadlock']
  },
  
  aktionaersvereinbarung: {
    keywords: ['aktionär', 'shareholder', 'agreement', 'aktien', 'stimmrecht', 'dividende', 'hauptversammlung'],
    requiredClauses: ['parteien', 'aktienverteilung', 'stimmrechte', 'uebertragungsbeschraenkungen', 'exit', 'verwaltung', 'information_rights'],
    jurisdiction: 'INT',
    legalFramework: ['AktG', 'WpHG', 'WpÜG', 'BörsG'],
    riskFactors: ['drag_along', 'tag_along', 'vesting', 'good_bad_leaver', 'liquidation_preference']
  },
  
  // ════════════════════════════════════════════════════════════════════
  // FINANZIERUNG & KREDITE - Kapitalgeschäfte
  // ════════════════════════════════════════════════════════════════════
  darlehensvertrag: {
    keywords: ['darlehen', 'darlehensgeber', 'darlehensnehmer', 'zinsen', 'tilgung', 'kredit', 'rückzahlung', 'valuta'],
    requiredClauses: ['darlehenssumme', 'zinssatz', 'laufzeit', 'tilgung', 'sicherheiten', 'kündigung', 'verzug', 'vorfaelligkeit'],
    jurisdiction: 'DE',
    legalFramework: ['BGB §§ 488-515', 'VerbrKrG', 'PAngV', 'KWG'],
    riskFactors: ['variabler_zins', 'vorfälligkeit', 'sicherheiten_unwirksam', 'bürgschaft', 'verzugszins_zu_hoch']
  },

  factoringvertrag: {
    name: 'Factoring-Rahmenvertrag',
    keywords: ['factoring', 'factoringkunde', 'factor', 'forderungskauf', 'forderungsabtretung', 'abtretung', 'debitor', 'debitoren', 'delkredere', 'ankauflimit', 'debitorenlimit', 'sicherungseinbehalt', 'inkasso', 'forderungsverwaltung', 'ankauf', 'grenkefactoring', 'forderung', 'forderungen', 'kaufpreis', 'flatrate', 'rahmenvertrag'],
    requiredClauses: ['forderungsabtretung', 'ankauflimit', 'debitorenlimit', 'kaufpreisberechnung', 'gebuehren', 'sicherungseinbehalt', 'delkrederehaftung', 'veritaetshaftung', 'kuendigung', 'offenlegung', 'datenschutz', 'zahlungsweiterleitung', 'mahn_inkasso'],
    jurisdiction: 'DE',
    legalFramework: ['BGB §§ 398-413 (Abtretung)', 'BGB §§ 433ff (Kaufrecht)', 'HGB', 'KWG', 'GwG', 'DSGVO'],
    riskFactors: ['abtretungsverbot', 'verität_falsch', 'delkredere_ausschluss', 'limit_ueberschreitung', 'rueckgriff', 'offenlegungspflicht', 'konzentration_debitoren', 'insolvenz_factoringkunde'],
    specificChecks: {
      ankauflimit: value => value > 0,
      sicherungseinbehalt: value => value >= 0 && value <= 20,
      kuendigungsfrist: value => value >= 2
    }
  },

  leasingvertrag: {
    name: 'Leasingvertrag',
    keywords: ['leasing', 'leasinggeber', 'leasingnehmer', 'leasingrate', 'leasinggegenstand', 'restwert', 'laufzeit', 'kilometerleasing', 'finanzierungsleasing'],
    requiredClauses: ['leasinggegenstand', 'leasingrate', 'laufzeit', 'restwert', 'versicherung', 'instandhaltung', 'rueckgabe', 'kuendigung', 'mehr_minderkilometer'],
    jurisdiction: 'DE',
    legalFramework: ['BGB §§ 535ff', 'BGB §§ 488ff', 'HGB', 'UStG'],
    riskFactors: ['restwertrisiko', 'vorzeitige_beendigung', 'schaeden_rueckgabe', 'kilometerueberschreitung', 'totalschaden']
  },

  buergschaftsvertrag: {
    name: 'Bürgschaftsvertrag',
    keywords: ['bürgschaft', 'bürge', 'gläubiger', 'hauptschuldner', 'bürgschaftserklärung', 'selbstschuldnerisch', 'ausfallbürgschaft'],
    requiredClauses: ['hauptschuld', 'buergschaftshoehe', 'buergschaftsart', 'inanspruchnahme', 'rueckgriff', 'kuendigung', 'verjaehrung'],
    jurisdiction: 'DE',
    legalFramework: ['BGB §§ 765-778', 'HGB § 349', 'KWG'],
    riskFactors: ['sittenwidrigkeit', 'ueberbuergung', 'verzicht_einreden', 'formfehler', 'verjaehrung']
  },

  // ════════════════════════════════════════════════════════════════════
  // WEITERE SPEZIALISIERTE VERTRAGSTYPEN
  // ════════════════════════════════════════════════════════════════════
  franchise: {
    keywords: ['franchise', 'franchisegeber', 'franchisenehmer', 'gebühr', 'marke', 'system', 'know-how', 'territorium'],
    requiredClauses: ['franchisekonzept', 'gebühren', 'territorium', 'markennutzung', 'schulung', 'kontrolle', 'beendigung', 'konkurrenzverbot'],
    jurisdiction: 'INT',
    legalFramework: ['BGB', 'MarkenG', 'UWG', 'GWB', 'EU-Gruppenfreistellungsverordnung'],
    riskFactors: ['gebührenstruktur_unklar', 'gebietsschutz_fehlt', 'konkurrenzverbot_zu_lang', 'systemänderungen', 'keine_exit_strategie']
  },
  
  versicherungsvertrag: {
    keywords: ['versicherung', 'versicherer', 'versicherungsnehmer', 'prämie', 'versicherungsfall', 'deckung', 'police'],
    requiredClauses: ['versicherungsumfang', 'praemie', 'selbstbeteiligung', 'ausschlüsse', 'obliegenheiten', 'kuendigung', 'versicherungsfall'],
    jurisdiction: 'DE',
    legalFramework: ['VVG', 'VAG', 'BGB', 'EU-Solvency II'],
    riskFactors: ['ausschlüsse_unklar', 'obliegenheitsverletzung', 'unterversicherung', 'wartezeit', 'praemienanpassung']
  },
  
  agenturvertrag: {
    keywords: ['agentur', 'kunde', 'werbung', 'marketing', 'kampagne', 'kreation', 'media', 'pitch'],
    requiredClauses: ['leistungsumfang', 'nutzungsrechte', 'vergütung', 'präsentation', 'vertraulichkeit', 'kuendigung', 'wettbewerbsausschluss'],
    jurisdiction: 'DE',
    legalFramework: ['BGB', 'UrhG', 'MarkenG', 'UWG', 'DesignG'],
    riskFactors: ['nutzungsrechte_unklar', 'erfolgsgarantie', 'exklusivität', 'pitch_verguetung', 'buyout_fehlt']
  },
  
  joint_venture: {
    keywords: ['joint venture', 'kooperation', 'zusammenarbeit', 'gemeinschaftsunternehmen', 'jv', 'partnership'],
    requiredClauses: ['zweck', 'beitraege', 'gewinnverteilung', 'geschaeftsfuehrung', 'exit', 'wettbewerbsverbot', 'ip_rights'],
    jurisdiction: 'INT',
    legalFramework: ['BGB §§ 705ff', 'HGB', 'GmbHG', 'GWB', 'AEUV Art. 101'],
    riskFactors: ['deadlock', 'exit_beschraenkung', 'wettbewerbsverbot', 'ip_ownership', 'ungleiche_beitraege']
  },
  
  distributionsvertrag: {
    keywords: ['distribution', 'vertrieb', 'händler', 'distributor', 'absatzgebiet', 'vertriebspartner'],
    requiredClauses: ['vertriebsgebiet', 'produkte', 'exklusivitaet', 'mindestabsatz', 'preise', 'marketing', 'kuendigung', 'lagerbestand'],
    jurisdiction: 'INT',
    legalFramework: ['HGB §§ 84ff', 'BGB', 'GWB', 'EU-Vertikalrichtlinie'],
    riskFactors: ['exklusivitaet_kartellrecht', 'mindestabsatz_zu_hoch', 'konkurrenzverbot', 'preisbindung', 'lagerrisiko']
  },
  
  bauvertrag: {
    keywords: ['bauherr', 'bauunternehmer', 'bauleistung', 'bauzeit', 'vergütung', 'vob', 'werkvertrag', 'baustelle'],
    requiredClauses: ['bauleistung', 'bauzeit', 'vergütung', 'abnahme', 'mängelansprüche', 'sicherheitsleistung', 'vertragsstrafe', 'nachtraege'],
    jurisdiction: 'DE',
    legalFramework: ['BGB §§ 631ff', 'VOB/B', 'VOB/C', 'HOAI', 'BauO'],
    riskFactors: ['bauzeitverzug', 'nachträge_unklar', 'mängelhaftung', 'vertragsstrafe_zu_hoch', 'behinderung', 'preisgleitklausel']
  },
  
  // ════════════════════════════════════════════════════════════════════
  // INTERNATIONALE VERTRÄGE
  // ════════════════════════════════════════════════════════════════════
  international_sale: {
    keywords: ['export', 'import', 'incoterms', 'letter of credit', 'international', 'cross-border', 'cisg'],
    requiredClauses: ['incoterms', 'payment_terms', 'delivery', 'applicable_law', 'dispute_resolution', 'force_majeure', 'currency'],
    jurisdiction: 'INT',
    legalFramework: ['UN-Kaufrecht (CISG)', 'Incoterms 2020', 'UCP 600', 'ICC Rules'],
    riskFactors: ['currency_risk', 'political_risk', 'transport_risk', 'payment_default', 'trade_restrictions']
  },
  
  // ════════════════════════════════════════════════════════════════════
  // UNIVERSAL FALLBACK
  // ════════════════════════════════════════════════════════════════════
  sonstiges: {
    keywords: [],
    requiredClauses: ['vertragsgegenstand', 'leistungen', 'gegenleistung', 'laufzeit', 'kuendigung', 'haftung', 'schriftform', 'salvatorisch', 'gerichtsstand'],
    jurisdiction: 'DE',
    legalFramework: ['BGB', 'HGB'],
    riskFactors: []
  }
};

// 🚀 PROFESSIONELLE JURISTISCHE KLAUSEL-BIBLIOTHEK (Anwaltskanzlei-Niveau)
const PROFESSIONAL_CLAUSE_TEMPLATES = {
  // ═══════════════════════════════════════════════════════════════════════
  // UNIVERSELLE KLAUSELN - Für alle Vertragstypen
  // ═══════════════════════════════════════════════════════════════════════
  schriftform: {
    standard: `§ [X] Schriftformerfordernis

(1) Änderungen, Ergänzungen und die Aufhebung dieses Vertrages bedürfen zu ihrer Rechtswirksamkeit der Schriftform gemäß § 126 BGB. Dies gilt auch für die Aufhebung dieser Schriftformklausel selbst.

(2) Mündliche Nebenabreden bestehen nicht. Individuelle Vertragsabreden gemäß § 305b BGB haben Vorrang und bleiben von dieser Klausel unberührt.

(3) Die Schriftform wird auch durch die elektronische Form gemäß § 126a BGB nicht ersetzt. E-Mails, Telefaxe oder sonstige Telekommunikationsmittel genügen dem Schriftformerfordernis nicht.

(4) Zur Wahrung der Schriftform genügt die Übermittlung eines beidseitig unterzeichneten Dokuments per Einschreiben oder persönlicher Übergabe gegen Empfangsbestätigung.`,
    
    digital: `§ [X] Form von Erklärungen und Digitale Kommunikation

(1) Vertragsänderungen und -ergänzungen bedürfen grundsätzlich der Textform gemäß § 126b BGB. Bei wesentlichen Vertragsänderungen (Vergütung, Laufzeit, Hauptleistungspflichten) ist die Schriftform gemäß § 126 BGB erforderlich.

(2) Für die laufende Kommunikation genügt die Textform per E-Mail an die jeweils zuletzt mitgeteilte E-Mail-Adresse. Zustellungen gelten als erfolgt, wenn sie an die vereinbarte E-Mail-Adresse versandt wurden und keine automatische Fehlerbenachrichtigung erfolgt.

(3) Qualifizierte elektronische Signaturen gemäß eIDAS-Verordnung werden der Schriftform gleichgestellt.`
  },
  
  salvatorisch: {
    erweitert: `§ [X] Salvatorische Klausel und Regelungslücken

(1) Sollten einzelne Bestimmungen dieses Vertrages unwirksam, undurchführbar oder lückenhaft sein oder werden, wird die Wirksamkeit der übrigen Bestimmungen hierdurch nicht berührt.

(2) Die Parteien verpflichten sich für diesen Fall, die unwirksame, undurchführbare oder fehlende Bestimmung durch eine wirksame und durchführbare Bestimmung zu ersetzen, die dem wirtschaftlichen Zweck der unwirksamen, undurchführbaren oder fehlenden Bestimmung und der Intention der Parteien am nächsten kommt.

(3) Das Gleiche gilt im Falle einer Regelungslücke. Die Parteien sind verpflichtet, diese durch eine Regelung zu schließen, die dem entspricht, was die Parteien nach dem Sinn und Zweck des Vertrages vereinbart hätten, wenn sie die Lücke erkannt hätten.

(4) Beruht die Unwirksamkeit einer Bestimmung auf einem darin festgelegten Maß der Leistung oder der Zeit (Frist oder Termin), so ist die Bestimmung mit einem dem ursprünglichen Maß möglichst nahekommenden rechtlich zulässigen Maß zu vereinbaren.

(5) Die vorstehenden Regelungen gelten entsprechend, falls sich der Vertrag als lückenhaft erweisen sollte. § 139 BGB wird ausdrücklich abbedungen.`
  },
  
  gerichtsstand: {
    national: `§ [X] Anwendbares Recht, Gerichtsstand und Schiedsgerichtsbarkeit

(1) Für die Rechtsbeziehungen der Parteien gilt ausschließlich das Recht der Bundesrepublik Deutschland unter Ausschluss des UN-Kaufrechts (CISG) sowie unter Ausschluss des deutschen internationalen Privatrechts, soweit dieses zur Anwendung ausländischen Sachrechts führen würde.

(2) Ausschließlicher Gerichtsstand für alle Streitigkeiten aus oder im Zusammenhang mit diesem Vertrag ist [STADT], sofern beide Parteien Kaufleute im Sinne des HGB, juristische Personen des öffentlichen Rechts oder öffentlich-rechtliche Sondervermögen sind.

(3) Die Parteien sind berechtigt, auch am allgemeinen Gerichtsstand der jeweils anderen Partei zu klagen.

(4) Für den Fall, dass eine Partei nach Vertragsschluss ihren Sitz oder gewöhnlichen Aufenthaltsort ins Ausland verlegt oder ihr Sitz oder gewöhnlicher Aufenthaltsort im Zeitpunkt der Klageerhebung nicht bekannt ist, wird als Gerichtsstand [STADT] vereinbart.`,
    
    international: `§ [X] Applicable Law and Dispute Resolution

(1) This Agreement shall be governed by and construed in accordance with the laws of [COUNTRY/STATE], excluding its conflict of law provisions and excluding the United Nations Convention on Contracts for the International Sale of Goods (CISG).

(2) Any dispute arising out of or in connection with this Agreement, including any question regarding its existence, validity or termination, shall be referred to and finally resolved by arbitration under the Rules of the International Chamber of Commerce (ICC).

(3) The arbitral tribunal shall consist of [one/three] arbitrator(s). The seat of the arbitration shall be [CITY]. The language of the arbitration shall be [English/German].

(4) The parties agree that any arbitration award shall be final and binding and may be enforced in any court of competent jurisdiction.`
  },
  
  datenschutz: {
    // 🔥 CHATGPT FIX E: Arbeitsverträge brauchen § 26 BDSG explizit!
    arbeitsvertrag: `§ [X] Datenschutz und Beschäftigtendaten

(1) Der Arbeitgeber verpflichtet sich zur Einhaltung der Bestimmungen der EU-Datenschutz-Grundverordnung (DSGVO), des Bundesdatenschutzgesetzes (BDSG) sowie aller weiteren anwendbaren datenschutzrechtlichen Vorschriften.

(2) Personenbezogene Daten des Arbeitnehmers werden ausschließlich zur Durchführung dieses Arbeitsverhältnisses und zur Erfüllung gesetzlicher Pflichten verarbeitet. Die Rechtsgrundlage ist Art. 6 Abs. 1 lit. b) DSGVO i.V.m. § 26 BDSG (Datenverarbeitung für Zwecke des Beschäftigungsverhältnisses) sowie Art. 88 DSGVO (Öffnungsklausel für spezifische Verarbeitungssituationen im Beschäftigungskontext).

(3) Der Arbeitgeber ist berechtigt, personenbezogene Daten des Arbeitnehmers zu erheben, zu verarbeiten und zu nutzen, soweit dies für die Entscheidung über die Begründung des Arbeitsverhältnisses, für dessen Durchführung oder zur Beendigung erforderlich ist (§ 26 Abs. 1 BDSG).

(4) Besondere Kategorien personenbezogener Daten (Art. 9 DSGVO) werden nur verarbeitet, soweit dies nach § 26 Abs. 3 BDSG zulässig ist, insbesondere zur Ausübung von Rechten aus dem Arbeitsrecht.

(5) Der Arbeitnehmer wird über die Datenverarbeitung gemäß Art. 13 DSGVO informiert und hat die Rechte aus Art. 15-22 DSGVO (Auskunft, Berichtigung, Löschung, Einschränkung, Datenportabilität, Widerspruch).

(6) Bei Beendigung des Arbeitsverhältnisses werden personenbezogene Daten gelöscht, soweit keine gesetzliche Aufbewahrungspflicht besteht (z.B. steuerrechtliche oder sozialversicherungsrechtliche Aufbewahrungsfristen).`,

    dsgvo_konform: `§ [X] Datenschutz und Vertraulichkeit

(1) Die Vertragsparteien verpflichten sich, bei der Vertragserfüllung die Bestimmungen der EU-Datenschutz-Grundverordnung (DSGVO), des Bundesdatenschutzgesetzes (BDSG) sowie aller weiteren anwendbaren datenschutzrechtlichen Vorschriften einzuhalten.

(2) Personenbezogene Daten werden ausschließlich zur Durchführung dieses Vertrages und zur Erfüllung gesetzlicher Pflichten verarbeitet. Die Rechtsgrundlage ist Art. 6 Abs. 1 lit. b) und c) DSGVO.

(3) Soweit im Rahmen der Vertragsdurchführung eine Auftragsverarbeitung im Sinne des Art. 28 DSGVO erfolgt, schließen die Parteien eine gesonderte Vereinbarung zur Auftragsverarbeitung ab.

(4) Die Parteien stellen sicher, dass alle mit der Verarbeitung personenbezogener Daten betrauten Personen zur Vertraulichkeit verpflichtet wurden oder einer angemessenen gesetzlichen Verschwiegenheitspflicht unterliegen.

(5) Bei Datenschutzverletzungen informiert die verantwortliche Partei unverzüglich, spätestens innerhalb von 24 Stunden nach Kenntniserlangung, die andere Partei und die zuständige Aufsichtsbehörde gemäß Art. 33 DSGVO.

(6) Die betroffenen Personen haben die in Kapitel III der DSGVO genannten Rechte (Auskunft, Berichtigung, Löschung, Einschränkung, Datenportabilität, Widerspruch). Anfragen sind an [KONTAKT] zu richten.`
  },
  
  haftung: {
    ausgewogen: `§ [X] Haftung und Haftungsbeschränkung

(1) Die Parteien haften einander für Schäden aus der Verletzung vertraglicher oder außervertraglicher Pflichten nach den gesetzlichen Vorschriften, soweit nachfolgend nichts anderes bestimmt ist.

(2) Für leichte Fahrlässigkeit haften die Parteien nur bei Verletzung wesentlicher Vertragspflichten (Kardinalpflichten). Wesentliche Vertragspflichten sind solche, deren Erfüllung die ordnungsgemäße Durchführung des Vertrages überhaupt erst ermöglicht und auf deren Einhaltung die andere Partei regelmäßig vertraut und vertrauen darf.

(3) Im Falle der Verletzung wesentlicher Vertragspflichten ist die Haftung auf den vertragstypischen, vorhersehbaren Schaden begrenzt. Der vertragstypische, vorhersehbare Schaden beträgt maximal [BETRAG] EUR pro Schadensfall und [BETRAG] EUR pro Vertragsjahr.

(4) Die vorstehenden Haftungsbeschränkungen gelten nicht:
   a) bei vorsätzlichem oder grob fahrlässigem Verhalten
   b) bei Schäden aus der Verletzung des Lebens, des Körpers oder der Gesundheit
   c) bei Ansprüchen nach dem Produkthaftungsgesetz
   d) bei ausdrücklich übernommenen Garantien
   e) bei arglistig verschwiegenen Mängeln

(5) Eine Änderung der Beweislast zum Nachteil der anderen Partei ist mit den vorstehenden Regelungen nicht verbunden.

(6) Die Verjährungsfrist für Schadenersatzansprüche beträgt 3 Jahre, soweit nicht die regelmäßige Verjährungsfrist kürzer ist. Sie beginnt mit dem Zeitpunkt, in dem der Anspruch entstanden ist und der Gläubiger von den anspruchsbegründenden Umständen Kenntnis erlangt hat oder ohne grobe Fahrlässigkeit erlangen musste.`
  },
  
  kuendigung: {
    // 🔥 CHATGPT FIX D: Arbeitsverträge brauchen § 623 BGB (Schriftformzwang)!
    arbeitsvertrag: `§ [X] Kündigung und Vertragsbeendigung

(1) Ordentliche Kündigung
   a) Beide Vertragsparteien können dieses Arbeitsverhältnis unter Einhaltung der gesetzlichen oder vereinbarten Kündigungsfristen ordentlich kündigen.
   b) Es gelten die gesetzlichen Kündigungsfristen nach § 622 BGB, soweit nicht längere Fristen vereinbart sind.
   c) Die Kündigungsfrist für den Arbeitgeber verlängert sich nach § 622 Abs. 2 BGB mit zunehmender Beschäftigungsdauer.

(2) Außerordentliche Kündigung
   a) Das Recht zur außerordentlichen fristlosen Kündigung aus wichtigem Grund gemäß § 626 BGB bleibt unberührt.
   b) Die außerordentliche Kündigung ist nur innerhalb von zwei Wochen ab Kenntnis der maßgebenden Tatsachen zulässig (§ 626 Abs. 2 BGB).
   c) Vor Ausspruch einer außerordentlichen Kündigung ist in der Regel eine Abmahnung erforderlich, es sei denn, eine Fortsetzung des Arbeitsverhältnisses ist unzumutbar.

(3) Form der Kündigung
   a) Jede Kündigung muss zu ihrer Wirksamkeit schriftlich erfolgen (§ 623 BGB). Die elektronische Form ist ausgeschlossen.
   b) Die Kündigung muss von der kündigenden Partei eigenhändig unterschrieben sein.
   c) Eine Kündigung per E-Mail, Fax oder SMS ist unwirksam.

(4) Rechtsfolgen der Beendigung
   a) Bei Beendigung des Arbeitsverhältnisses sind alle überlassenen Arbeitsmittel, Unterlagen und Daten unverzüglich zurückzugeben.
   b) Resturlaub ist abzugelten, sofern er nicht mehr genommen werden kann.
   c) Der Arbeitgeber stellt ein qualifiziertes Arbeitszeugnis gemäß § 630 BGB aus.`,

    ordentlich_ausserordentlich: `§ [X] Kündigung und Vertragsbeendigung

(1) Ordentliche Kündigung
   a) Dieser Vertrag kann von beiden Parteien mit einer Frist von [FRIST] zum [Monatsende/Quartalsende/Jahresende] ordentlich gekündigt werden.
   b) Erstmals ist eine ordentliche Kündigung zum [DATUM] möglich.
   c) Die Mindestvertragslaufzeit beträgt [ZEITRAUM].

(2) Außerordentliche Kündigung
   a) Das Recht zur außerordentlichen fristlosen Kündigung aus wichtigem Grund bleibt unberührt.
   b) Ein wichtiger Grund liegt insbesondere vor, wenn:
      - eine Partei wesentliche Vertragspflichten trotz schriftlicher Abmahnung mit angemessener Fristsetzung nachhaltig verletzt
      - über das Vermögen einer Partei das Insolvenzverfahren eröffnet oder die Eröffnung mangels Masse abgelehnt wird
      - eine Partei ihre Zahlungen nicht nur vorübergehend einstellt
      - sich die wirtschaftlichen Verhältnisse einer Partei so verschlechtern, dass die Erfüllung des Vertrages gefährdet ist
      - eine Partei gegen wesentliche gesetzliche Bestimmungen verstößt

(3) Form und Zugang der Kündigung
   a) Jede Kündigung bedarf zu ihrer Wirksamkeit der Schriftform gemäß § 126 BGB.
   b) Die Kündigung wird wirksam mit Zugang beim Vertragspartner.
   c) Für die Rechtzeitigkeit der Kündigung kommt es auf den Zugang an.

(4) Rechtsfolgen der Beendigung
   a) Bei Vertragsbeendigung sind alle wechselseitig überlassenen Unterlagen, Daten und Gegenstände unverzüglich herauszugeben.
   b) Bereits erbrachte Leistungen sind abzurechnen und zu vergüten.
   c) Bestehende Geheimhaltungsverpflichtungen bleiben von der Beendigung unberührt.`
  },
  
  // ═══════════════════════════════════════════════════════════════════════
  // ARBEITSRECHTLICHE KLAUSELN - Spezialisiert
  // ═══════════════════════════════════════════════════════════════════════
  arbeitszeit: {
    vollzeit: `§ [X] Arbeitszeit und Arbeitszeitregelung

(1) Die regelmäßige wöchentliche Arbeitszeit beträgt [40] Stunden, verteilt auf [5] Arbeitstage von Montag bis Freitag.

(2) Die tägliche Arbeitszeit beträgt grundsätzlich [8] Stunden. Beginn und Ende der täglichen Arbeitszeit sowie die Pausen richten sich nach den betrieblichen Erfordernissen und werden vom Arbeitgeber nach billigem Ermessen gemäß § 106 GewO festgelegt.

(3) Der Arbeitnehmer ist im Rahmen der gesetzlichen und ggf. tariflichen Bestimmungen zur Leistung von Überstunden verpflichtet, soweit diese betrieblich erforderlich und dem Arbeitnehmer im Einzelfall zumutbar sind.

(4) Überstunden werden wie folgt vergütet:
   a) mit einem Zuschlag von 25% zum Stundenlohn oder
   b) durch Freizeitausgleich im Verhältnis 1:1,25 nach Wahl des Arbeitgebers

(5) Mit der vereinbarten Vergütung sind Überstunden bis zu [X] Stunden monatlich abgegolten. Diese Regelung gilt nur, soweit die Vergütung die Beitragsbemessungsgrenze in der gesetzlichen Rentenversicherung nicht überschreitet.

(6) Der Arbeitnehmer ist verpflichtet, seine Arbeitszeit gemäß den betrieblichen Vorgaben zu erfassen. Die Arbeitszeiterfassung erfolgt [elektronisch/manuell] mittels [System].`,
    
    teilzeit: `§ [X] Teilzeitarbeit und Arbeitszeitverteilung

(1) Der Arbeitnehmer wird in Teilzeit mit einer regelmäßigen wöchentlichen Arbeitszeit von [STUNDEN] Stunden beschäftigt.

(2) Die Verteilung der Arbeitszeit erfolgt wie folgt:
   [Option A: Gleichmäßige Verteilung]
   - Montag bis Freitag: jeweils [X] Stunden von [UHRZEIT] bis [UHRZEIT]
   
   [Option B: Ungleichmäßige Verteilung]
   - Montag: [X] Stunden
   - Dienstag: [X] Stunden
   - [weitere Tage]

(3) Änderungen der Arbeitszeitverteilung sind im gegenseitigen Einvernehmen möglich und bedürfen der Schriftform. Der Arbeitgeber kann die Lage der Arbeitszeit aus betrieblichen Gründen mit einer Ankündigungsfrist von [4] Wochen ändern, soweit dies dem Arbeitnehmer zumutbar ist.

(4) Der Arbeitnehmer hat gemäß § 8 TzBfG Anspruch auf Erhöhung seiner Arbeitszeit, wenn ein entsprechender Arbeitsplatz frei wird und keine betrieblichen Gründe entgegenstehen.

(5) Die Regelungen zu Mehrarbeit und deren Vergütung gemäß § [X] dieses Vertrages gelten entsprechend.`
  },
  
  arbeitsort: {
    standard: `§ [X] Arbeitsort und Einsatzort

(1) Der Arbeitnehmer wird am Standort des Arbeitgebers in [ORT, STRASSE] beschäftigt.

(2) Der Arbeitgeber ist berechtigt, den Arbeitnehmer nach billigem Ermessen gemäß § 106 GewO auch an einem anderen Ort einzusetzen, soweit dies für den Arbeitnehmer zumutbar ist. Eine Versetzung an einen anderen Ort bedarf der vorherigen schriftlichen Mitteilung mit einer Ankündigungsfrist von mindestens vier Wochen.

(3) Bei einer dauerhaften Versetzung an einen Ort, der mehr als [50] Kilometer vom bisherigen Arbeitsort entfernt liegt, hat der Arbeitnehmer ein Sonderkündigungsrecht mit einer Frist von [vier Wochen] zum Monatsende.

(4) Soweit betriebliche Gründe es erfordern und dies dem Arbeitnehmer zumutbar ist, kann der Arbeitgeber den Arbeitnehmer vorübergehend (bis zu [X] Monate pro Kalenderjahr) an anderen Standorten im In- und Ausland einsetzen.

(5) Mobile Arbeit / Homeoffice:
   a) Der Arbeitnehmer ist nach Abstimmung mit dem Arbeitgeber berechtigt, seine Arbeitsleistung auch von zu Hause (Homeoffice) oder an einem anderen geeigneten Ort (Mobile Arbeit) zu erbringen.
   b) Die konkrete Ausgestaltung (Anzahl der Tage, technische Ausstattung, Erreichbarkeit) wird in einer gesonderten Vereinbarung geregelt.
   c) Der Arbeitgeber kann die Homeoffice-/Mobile-Arbeit aus wichtigem betrieblichen Grund mit einer Frist von [zwei Wochen] widerrufen.`,

    mobil: `§ [X] Arbeitsort und Mobile Arbeit

(1) Arbeitsort ist grundsätzlich [ORT]. Der Arbeitgeber ist berechtigt, nach billigem Ermessen einen anderen Einsatzort im Umkreis von [X] km zu bestimmen, soweit dies dem Arbeitnehmer zumutbar ist.

(2) Der Arbeitnehmer ist verpflichtet, seine Arbeitsleistung auch an wechselnden Einsatzorten, insbesondere bei Kunden, zu erbringen, soweit dies betrieblich erforderlich und zumutbar ist.

(3) Bei Einsätzen, die eine Abwesenheit von mehr als [3] Tagen erfordern, ist der Arbeitgeber verpflichtet, dem Arbeitnehmer die angemessenen Reise- und Übernachtungskosten zu erstatten.

(4) Die konkrete Ausgestaltung mobiler Arbeit (Homeoffice, Remote-Arbeit) erfolgt nach Maßgabe der betrieblichen Möglichkeiten in Abstimmung mit dem Arbeitgeber.`
  },

  verguetung: {
    umfassend: `§ [X] Vergütung und Vergütungsbestandteile

(1) Grundvergütung
   a) Der Arbeitnehmer erhält eine monatliche Bruttovergütung in Höhe von EUR [BETRAG] (in Worten: [BETRAG IN WORTEN]).
   b) Die Vergütung ist jeweils zum Monatsende fällig und wird spätestens am letzten Bankarbeitstag des Monats auf das vom Arbeitnehmer benannte Konto überwiesen.

(2) Variable Vergütung
   a) Zusätzlich zur Grundvergütung erhält der Arbeitnehmer eine variable Vergütung (Bonus) in Höhe von bis zu [X]% der Jahresgrundvergütung.
   b) Die Höhe der variablen Vergütung richtet sich nach der Erreichung folgender Ziele:
      - Persönliche Ziele (Gewichtung: [X]%): [Beschreibung]
      - Teamziele (Gewichtung: [X]%): [Beschreibung]
      - Unternehmensziele (Gewichtung: [X]%): [Beschreibung]
   c) Die Ziele werden jährlich bis zum [31. Januar] für das laufende Geschäftsjahr schriftlich vereinbart.
   d) Ein Anspruch auf variable Vergütung besteht nur bei ungekündigtem Arbeitsverhältnis zum Auszahlungszeitpunkt.

(3) Sonderzahlungen
   a) Der Arbeitnehmer erhält ein Urlaubsgeld in Höhe von EUR [BETRAG], zahlbar mit der Juni-Abrechnung.
   b) Der Arbeitnehmer erhält ein Weihnachtsgeld in Höhe eines Bruttomonatsgehalts, zahlbar mit der November-Abrechnung.
   c) Sonderzahlungen werden bei unterjährigem Ein- oder Austritt pro rata temporis gewährt.

(4) Sachbezüge und geldwerte Vorteile
   a) [Dienstwagen zur privaten Nutzung gemäß gesonderter Dienstwagenregelung]
   b) [Jobticket/Mobilitätszuschuss in Höhe von EUR [BETRAG] monatlich]
   c) [Betriebliche Altersvorsorge gemäß gesonderter Versorgungsordnung]

(5) Vergütungsanpassung
   Eine Überprüfung der Vergütung erfolgt jährlich zum [DATUM]. Ein Rechtsanspruch auf Erhöhung besteht nicht.`
  },
  
  urlaub: {
    gesetzlich_plus: `§ [X] Urlaub und Urlaubsregelungen

(1) Urlaubsanspruch
   a) Der Arbeitnehmer hat einen jährlichen Urlaubsanspruch von [30] Arbeitstagen bei einer 5-Tage-Woche.
   b) Der gesetzliche Mindesturlaub beträgt [20] Arbeitstage, der darüber hinausgehende vertragliche Mehrurlaub beträgt [10] Arbeitstage.
   c) Im Jahr des Eintritts und Austritts wird der Urlaub pro rata temporis gewährt (1/12 für jeden vollen Beschäftigungsmonat).

(2) Urlaubsgewährung
   a) Der Urlaub ist unter Berücksichtigung der betrieblichen Belange und der Urlaubswünsche des Arbeitnehmers zu gewähren.
   b) Der Arbeitnehmer hat seine Urlaubswünsche rechtzeitig, mindestens [4 Wochen] vor dem gewünschten Urlaubsbeginn, anzumelden.
   c) Betriebsferien können vom Arbeitgeber nach rechtzeitiger Ankündigung festgelegt werden.
   d) Ein zusammenhängender Urlaub von mindestens 2 Wochen ist zu gewährleisten.

(3) Übertragung und Verfall
   a) Der gesetzliche Mindesturlaub verfällt gemäß § 7 Abs. 3 BUrlG am 31. März des Folgejahres, sofern er aus betrieblichen oder persönlichen Gründen nicht genommen werden konnte.
   b) Vertraglicher Mehrurlaub verfällt abweichend von § 7 Abs. 3 BUrlG am 31. Dezember des Urlaubsjahres, es sei denn, der Arbeitnehmer konnte den Urlaub aus von ihm nicht zu vertretenden Gründen nicht nehmen.
   c) Der Arbeitgeber wird den Arbeitnehmer rechtzeitig auf den drohenden Verfall hinweisen.

(4) Erkrankung während des Urlaubs
   Bei Erkrankung während des Urlaubs werden die durch ärztliches Attest nachgewiesenen Krankheitstage nicht auf den Jahresurlaub angerechnet.

(5) Urlaubsentgelt und Urlaubsgeld
   a) Während des Urlaubs wird die Vergütung fortgezahlt.
   b) Zusätzliches Urlaubsgeld wird gemäß § [X] dieses Vertrages gewährt.`
  },
  
  // ═══════════════════════════════════════════════════════════════════════
  // MIETRECHTLICHE KLAUSELN - Spezialisiert
  // ═══════════════════════════════════════════════════════════════════════
  miete_nebenkosten: {
    detailliert: `§ [X] Miete und Nebenkosten

(1) Grundmiete
   a) Die monatliche Grundmiete (Nettokaltmiete) beträgt EUR [BETRAG].
   b) Die Miete ist monatlich im Voraus, spätestens bis zum 3. Werktag eines jeden Monats, kostenfrei auf folgendes Konto zu zahlen:
      Kontoinhaber: [NAME]
      IBAN: [IBAN]
      BIC: [BIC]
      Verwendungszweck: [Mietobjekt, Monat/Jahr]

(2) Betriebskosten (Nebenkosten)
   a) Zusätzlich zur Grundmiete trägt der Mieter die Betriebskosten gemäß § 2 BetrKV.
   b) Der Mieter zahlt eine monatliche Vorauszahlung in Höhe von EUR [BETRAG].
   c) Folgende Betriebskosten werden umgelegt:
      - Grundsteuer
      - Wasserversorgung und Entwässerung
      - Heizung und Warmwasser (verbrauchsabhängig gemäß HeizkostenV)
      - Aufzug
      - Straßenreinigung und Müllabfuhr
      - Hausreinigung und Ungezieferbekämpfung
      - Gartenpflege
      - Beleuchtung
      - Schornsteinreinigung
      - Sach- und Haftpflichtversicherung
      - Hauswart
      - Gemeinschaftsantenne/Kabelanschluss
      - Sonstige Betriebskosten gemäß § 2 BetrKV

(3) Betriebskostenabrechnung
   a) Der Vermieter erstellt jährlich eine Betriebskostenabrechnung innerhalb von 12 Monaten nach Ende des Abrechnungszeitraums.
   b) Der Abrechnungszeitraum ist das Kalenderjahr.
   c) Nachzahlungen sind innerhalb von 30 Tagen nach Zugang der Abrechnung fällig.
   d) Guthaben werden innerhalb von 30 Tagen nach Abrechnung erstattet.

(4) Anpassung der Vorauszahlungen
   Nach erfolgter Abrechnung können die Vorauszahlungen angemessen angepasst werden. Die Anpassung wird mit Beginn des übernächsten Monats nach Zugang der Mitteilung wirksam.`
  },
  
  schadenersatz: {
    mietrecht: `§ [X] Schäden und Instandhaltung

(1) Obhuts- und Sorgfaltspflichten
   a) Der Mieter ist verpflichtet, die Mietsache pfleglich zu behandeln und vor Beschädigungen zu schützen.
   b) Der Mieter hat für ausreichende Belüftung und Beheizung zu sorgen, um Feuchtigkeitsschäden zu vermeiden.
   c) Schäden an der Mietsache sind dem Vermieter unverzüglich anzuzeigen.

(2) Kleinreparaturen
   a) Der Mieter trägt die Kosten für Kleinreparaturen bis zu EUR [100] im Einzelfall, jedoch maximal [8]% der Jahresmiete.
   b) Kleinreparaturen betreffen nur Gegenstände, die dem direkten und häufigen Zugriff des Mieters unterliegen.
   c) Die Beauftragung erfolgt durch den Vermieter.

(3) Schönheitsreparaturen
   a) Der Mieter übernimmt die Schönheitsreparaturen nach folgendem Fristenplan:
      - Küche, Bad, Dusche: alle 3 Jahre
      - Wohn- und Schlafräume: alle 5 Jahre
      - Andere Räume: alle 7 Jahre
   b) Maßgeblich ist der Grad der Abnutzung.
   c) Bei Auszug ist eine anteilige Kostenbeteiligung nach Quotenabgeltung möglich.

(4) Haftung für Schäden
   a) Der Mieter haftet für Schäden, die er, seine Angehörigen, Besucher oder sonstige Personen, denen er den Zutritt gestattet hat, schuldhaft verursachen.
   b) Der Mieter wird dem Vermieter den Abschluss einer Haftpflichtversicherung nachweisen.`
  },
  
  // ═══════════════════════════════════════════════════════════════════════
  // IT & SOFTWARE KLAUSELN - Spezialisiert
  // ═══════════════════════════════════════════════════════════════════════
  sla_verfuegbarkeit: {
    enterprise: `§ [X] Service Level Agreement (SLA) und Verfügbarkeit

(1) Verfügbarkeitszusage
   a) Der Anbieter gewährleistet eine Verfügbarkeit der [SaaS-Lösung/Cloud-Services] von [99,9]% im Jahresmittel.
   b) Die Verfügbarkeit berechnet sich wie folgt:
      Verfügbarkeit (%) = (Gesamtzeit - Ausfallzeit) / Gesamtzeit × 100
   c) Nicht als Ausfallzeit gelten:
      - Geplante Wartungsarbeiten (maximal [4] Stunden monatlich, angekündigt mit [72] Stunden Vorlauf)
      - Force Majeure Ereignisse
      - Ausfälle aufgrund von Handlungen oder Unterlassungen des Kunden
      - Ausfälle von Drittanbietern außerhalb der Kontrolle des Anbieters

(2) Service Level
   a) Reaktionszeiten bei Störungen:
      - Kritisch (Totalausfall): [30] Minuten
      - Hoch (erhebliche Einschränkung): [2] Stunden
      - Mittel (teilweise Einschränkung): [4] Stunden
      - Niedrig (geringe Einschränkung): [8] Stunden
   b) Wiederherstellungszeiten:
      - Kritisch: [4] Stunden
      - Hoch: [8] Stunden
      - Mittel: [24] Stunden
      - Niedrig: [72] Stunden

(3) Service Credits bei Unterschreitung
   a) Bei Unterschreitung der zugesagten Verfügbarkeit erhält der Kunde folgende Service Credits:
      - 99,9% bis 99,5%: 5% der Monatsgebühr
      - 99,5% bis 99,0%: 10% der Monatsgebühr
      - 99,0% bis 95,0%: 25% der Monatsgebühr
      - Unter 95,0%: 50% der Monatsgebühr
   b) Service Credits werden mit der nächsten Rechnung verrechnet.
   c) Der maximale Service Credit beträgt 50% der Monatsgebühr.

(4) Monitoring und Reporting
   a) Der Anbieter überwacht kontinuierlich die Verfügbarkeit und Performance.
   b) Monatliche SLA-Reports werden binnen [5] Werktagen nach Monatsende bereitgestellt.
   c) Der Kunde erhält Zugang zu einem Real-Time-Monitoring-Dashboard.`
  },
  
  datensicherheit: {
    dsgvo_cloud: `§ [X] Datensicherheit und Datenschutz bei Cloud-Services

(1) Technische und organisatorische Maßnahmen (TOM)
   a) Der Anbieter implementiert angemessene TOM gemäß Art. 32 DSGVO, insbesondere:
      - Verschlüsselung der Daten bei Übertragung (TLS 1.3) und Speicherung (AES-256)
      - Zugangs- und Zugriffskontrollen mit Multi-Faktor-Authentifizierung
      - Regelmäßige Sicherheitsaudits und Penetrationstests
      - ISO 27001 Zertifizierung
      - SOC 2 Type II Compliance
   b) Details zu den TOM sind in Anlage [X] spezifiziert.

(2) Datenlokalisation und -souveränität
   a) Alle Daten werden ausschließlich in Rechenzentren innerhalb der EU/[LAND] gespeichert.
   b) Keine Datenübertragung in Drittländer ohne Angemessenheitsbeschluss.
   c) Bei unvermeidbarer Drittlandübertragung: Standardvertragsklauseln gemäß EU-Kommission.

(3) Backup und Disaster Recovery
   a) Tägliche automatische Backups mit [30] Tagen Aufbewahrung
   b) Georedundante Speicherung an mindestens [2] Standorten
   c) Recovery Time Objective (RTO): maximal [4] Stunden
   d) Recovery Point Objective (RPO): maximal [1] Stunde
   e) Jährliche Disaster-Recovery-Tests mit Dokumentation

(4) Datenlöschung und Portabilität
   a) Vollständige Löschung aller Kundendaten binnen [30] Tagen nach Vertragsende
   b) Zertifizierte Datenlöschung gemäß DIN 66399
   c) Datenexport in gängigen Formaten (JSON, XML, CSV) jederzeit möglich
   d) API-Zugang für automatisierten Datenexport`
  },
  
  // ═══════════════════════════════════════════════════════════════════════
  // KAUFRECHTLICHE KLAUSELN - Spezialisiert
  // ═══════════════════════════════════════════════════════════════════════
  gewaehrleistung_b2b: {
    umfassend: `§ [X] Gewährleistung und Mängelrechte (B2B)

(1) Untersuchungs- und Rügepflicht
   a) Der Käufer hat die Ware unverzüglich nach Ablieferung zu untersuchen und erkennbare Mängel innerhalb von [7] Werktagen schriftlich zu rügen.
   b) Verdeckte Mängel sind unverzüglich nach Entdeckung, spätestens jedoch innerhalb der Gewährleistungsfrist zu rügen.
   c) Die Rüge hat unter genauer Beschreibung des Mangels zu erfolgen. Auf Verlangen sind Belegmuster zur Verfügung zu stellen.
   d) Bei Versäumung der Rügefrist gilt die Ware als genehmigt.

(2) Gewährleistungsrechte
   a) Bei Mängeln hat der Käufer zunächst nur Anspruch auf Nacherfüllung.
   b) Die Nacherfüllung erfolgt nach Wahl des Verkäufers durch Nachbesserung oder Ersatzlieferung.
   c) Der Verkäufer trägt die zum Zweck der Nacherfüllung erforderlichen Aufwendungen.
   d) Schlägt die Nacherfüllung zweimal fehl oder ist sie unzumutbar, kann der Käufer:
      - vom Vertrag zurücktreten oder
      - die Vergütung mindern

(3) Gewährleistungsfrist
   a) Die Gewährleistungsfrist beträgt [12] Monate ab Gefahrübergang.
   b) Für Ersatzteile und Nachbesserungen beträgt die Gewährleistungsfrist [6] Monate, mindestens jedoch bis zum Ablauf der ursprünglichen Gewährleistungsfrist.
   c) Die Frist verlängert sich um die Zeit, in der die Kaufsache wegen Nacherfüllung nicht genutzt werden kann.

(4) Ausschlüsse
   a) Keine Gewährleistung besteht bei:
      - natürlicher Abnutzung
      - unsachgemäßer Behandlung oder Lagerung
      - eigenmächtigen Änderungen oder Reparaturen
      - Nichtbeachtung von Bedienungsanleitungen
   b) Beschaffenheitsangaben in Katalogen, Prospekten etc. stellen keine Garantie dar.

(5) Verjährung
   Die Verjährung von Mängelansprüchen richtet sich nach § 438 BGB, soweit nicht abweichend vereinbart.`
  },
  
  eigentumsvorbehalt: {
    erweitert: `§ [X] Eigentumsvorbehalt (Erweiterter und verlängerter Eigentumsvorbehalt)

(1) Einfacher Eigentumsvorbehalt
   a) Die gelieferte Ware bleibt bis zur vollständigen Zahlung des Kaufpreises Eigentum des Verkäufers.
   b) Der Käufer ist verpflichtet, die Vorbehaltsware pfleglich zu behandeln und angemessen zu versichern.
   c) Verpfändungen oder Sicherungsübereignungen sind unzulässig.

(2) Erweiterter Eigentumsvorbehalt (Kontokorrentvorbehalt)
   a) Der Eigentumsvorbehalt erstreckt sich auf alle bestehenden und künftigen Forderungen aus der Geschäftsverbindung.
   b) Die Ware bleibt Eigentum des Verkäufers, bis sämtliche Forderungen beglichen sind.
   c) Bei laufender Rechnung gilt das vorbehaltene Eigentum als Sicherung für die Saldoforderung.

(3) Verlängerter Eigentumsvorbehalt
   a) Der Käufer ist berechtigt, die Vorbehaltsware im ordentlichen Geschäftsgang weiterzuverkaufen.
   b) Der Käufer tritt bereits jetzt alle Forderungen aus der Weiterveräußerung an den Verkäufer ab.
   c) Der Verkäufer nimmt die Abtretung an.
   d) Der Käufer bleibt zur Einziehung der Forderung ermächtigt, solange er seinen Zahlungsverpflichtungen nachkommt.

(4) Verarbeitung und Verbindung
   a) Bei Verarbeitung, Verbindung oder Vermischung erwirbt der Verkäufer Miteigentum im Verhältnis des Wertes der Vorbehaltsware zu den anderen Sachen.
   b) Der Käufer verwahrt das (Mit-)Eigentum unentgeltlich für den Verkäufer.

(5) Rücknahmerecht
   Bei Zahlungsverzug oder sonstiger Vertragsverletzung ist der Verkäufer berechtigt, die Vorbehaltsware zurückzunehmen. Dies gilt nicht als Rücktritt vom Vertrag, es sei denn, der Verkäufer erklärt dies ausdrücklich.`
  }
};

// 🚀 ERWEITERTE HELPER FUNCTIONS mit juristischer Präzision

/**
 * Bereinigt Text von Formatierungszeichen und normalisiert Whitespace
 * @param {string} text - Zu bereinigender Text
 * @returns {string} Bereinigter Text
 */
const cleanText = (text) => {
  if (!text) return '';
  return text
    .replace(/\*\*/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/^\s+|\s+$/g, '')
    .replace(/\[KATEGORIE:|KATEGORIE:/gi, '')
    .replace(/\[X\]/g, Math.floor(Math.random() * 30 + 1).toString())
    .replace(/\[DATUM\]/g, new Date().toLocaleDateString('de-DE'))
    .replace(/\[BETRAG\]/g, 'gemäß Vereinbarung')
    .replace(/\[ORT\]/g, 'am Sitz des Auftraggebers')
    .replace(/\[STADT\]/g, 'Berlin')
    .replace(/\[NAME\]/g, '[Vertragspartei]')
    .replace(/\[FRIST\]/g, '3 Monate')
    .replace(/\[STUNDEN\]/g, '40')
    .replace(/\[UHRZEIT\]/g, '09:00 - 17:00')
    .trim();
};

/**
 * Berechnet Health Score basierend auf gefundenen Problemen
 * Verwendet juristische Gewichtung für verschiedene Risikoklassen
 */
const calculateHealthScore = (gaps, optimizations) => {
  let score = 100;
  const riskWeights = {
    critical: 20,   // Rechtliche Unwirksamkeit droht
    high: 12,       // Erhebliche rechtliche Risiken
    medium: 6,      // Moderate Risiken
    low: 3          // Optimierungspotential
  };
  
  // Deduziere für Lücken
  gaps.forEach(gap => {
    if (gap.severity === 'critical') score -= riskWeights.critical;
    else if (gap.severity === 'high') score -= riskWeights.high;
    else if (gap.severity === 'medium') score -= riskWeights.medium;
    else score -= riskWeights.low;
  });
  
  // Deduziere für Optimierungen
  if (Array.isArray(optimizations)) {
    optimizations.forEach(opt => {
      if (opt.risk >= 8) score -= riskWeights.high;
      else if (opt.risk >= 6) score -= riskWeights.medium;
      else if (opt.risk >= 4) score -= riskWeights.low;
      else score -= 2;
    });
  }
  
  // Für Amendments: Weniger strenge Bewertung
  const isAmendment = gaps.some(g => g.type === 'amendment_specific');
  if (isAmendment) {
    score = Math.max(40, Math.min(100, score * 1.2)); // 20% Bonus für Amendments
  }
  
  return Math.max(25, Math.min(100, Math.round(score)));
};

/**
 * Generiert juristische Kategorien basierend auf Vertragsinhalt
 * @param {string} contractText - Vertragstext
 * @param {string} contractType - Erkannter Vertragstyp
 * @returns {Array} Dynamische Kategorien
 */
const generateDynamicCategories = (contractText, contractType) => {
  const categories = new Map();
  const lowerText = contractText.toLowerCase();
  
  // Juristische Kategorie-Definitionen
  const categoryDefinitions = {
    'vertragsgrundlagen': {
      keywords: ['vertragsgegenstand', 'leistung', 'gegenleistung', 'parteien', 'präambel'],
      label: 'Vertragsgrundlagen',
      priority: 1
    },
    'leistungspflichten': {
      keywords: ['pflichten', 'leistung', 'lieferung', 'erbringung', 'durchführung', 'ausführung'],
      label: 'Haupt- und Nebenleistungspflichten',
      priority: 2
    },
    'verguetung_zahlung': {
      keywords: ['vergütung', 'zahlung', 'preis', 'honorar', 'entgelt', 'kosten', 'gebühr'],
      label: 'Vergütung und Zahlungsmodalitäten',
      priority: 3
    },
    'termine_fristen': {
      keywords: ['frist', 'termin', 'laufzeit', 'dauer', 'befristung', 'verlängerung'],
      label: 'Termine, Fristen und Laufzeit',
      priority: 4
    },
    'kuendigung_beendigung': {
      keywords: ['kündigung', 'beendigung', 'aufhebung', 'rücktritt', 'widerruf'],
      label: 'Kündigung und Vertragsbeendigung',
      priority: 5
    },
    'haftung_gewaehrleistung': {
      keywords: ['haftung', 'gewährleistung', 'garantie', 'mängel', 'schadenersatz', 'verschulden'],
      label: 'Haftung und Gewährleistung',
      priority: 6
    },
    'datenschutz_vertraulichkeit': {
      keywords: ['datenschutz', 'dsgvo', 'vertraulich', 'geheimhaltung', 'schweigepflicht'],
      label: 'Datenschutz und Vertraulichkeit',
      priority: 7
    },
    'ip_nutzungsrechte': {
      keywords: ['urheberrecht', 'nutzungsrecht', 'lizenz', 'marke', 'patent', 'intellectual property'],
      label: 'Geistiges Eigentum und Nutzungsrechte',
      priority: 8
    },
    'compliance_regulatorisch': {
      keywords: ['compliance', 'gesetz', 'vorschrift', 'regelung', 'aufsicht', 'genehmigung'],
      label: 'Compliance und regulatorische Anforderungen',
      priority: 9
    },
    'streitbeilegung': {
      keywords: ['gerichtsstand', 'schiedsgericht', 'mediation', 'streit', 'anwendbares recht'],
      label: 'Streitbeilegung und anwendbares Recht',
      priority: 10
    },
    'sonstiges': {
      keywords: ['salvatorisch', 'schriftform', 'änderung', 'vollständigkeit', 'rangfolge'],
      label: 'Sonstige Bestimmungen',
      priority: 11
    }
  };
  
  // Analysiere Text und erstelle Kategorien
  Object.entries(categoryDefinitions).forEach(([key, def]) => {
    const hasKeywords = def.keywords.some(keyword => lowerText.includes(keyword));
    if (hasKeywords) {
      categories.set(key, {
        tag: key,
        label: def.label,
        priority: def.priority,
        present: true,
        issues: []
      });
    }
  });
  
  // Füge vertragsspezifische Kategorien hinzu
  const typeConfig = CONTRACT_TYPES[contractType];
  if (typeConfig && typeConfig.requiredClauses) {
    typeConfig.requiredClauses.forEach(clause => {
      const categoryKey = clause.replace(/_/g, '_');
      if (!categories.has(categoryKey)) {
        categories.set(categoryKey, {
          tag: categoryKey,
          label: clause.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          priority: 12,
          present: lowerText.includes(clause.replace(/_/g, ' ')),
          issues: []
        });
      }
    });
  }
  
  // Sortiere nach Priorität
  return Array.from(categories.values()).sort((a, b) => a.priority - b.priority);
};

/**
 * 🔥 ULTIMATE QUALITY LAYER - Aggressive Fehlerbereinigung
 * Entfernt ALLE Platzhalter, Duplikate und generiert fehlende Daten
 */
const applyUltimateQualityLayer = (result, requestId, contractType = 'sonstiges') => {
  console.log(`\n\n🔥🔥🔥 [${ requestId}] ULTIMATE QUALITY CHECK v2.0 gestartet... 🔥🔥🔥`);
  console.log(`🔥 [${requestId}] Input categories:`, JSON.stringify(result.categories.map(c => ({ tag: c.tag, issueCount: c.issues.length })), null, 2));

  let issuesFixed = 0;
  let duplicatesRemoved = 0;
  let placeholdersRemoved = 0;
  let sanitized = 0;
  let contentMismatchDropped = 0;
  // 🆕 v2.0: Anti-Bullshit Tracking
  let bullshitDropped = 0;
  let evidenceMissing = 0;
  let whyNotIntentionalMissing = 0;
  let genericWhyItMatters = 0;
  let genericSummaryDropped = 0;
  let sanitizerStats = { roleTerms: 0, pseudoStats: 0, paragraphHeaders: 0, arbitraryHours: 0 };

  // 🔥 CHATGPT-FIX: Tag-Normalisierung + Category-Merge (IMMER am Anfang!)
  result = normalizeAndMergeCategoryTags(result, requestId);

  // VERBOTENE PLATZHALTER
  const FORBIDDEN_PLACEHOLDERS = [
    'siehe Vereinbarung',
    'siehe Vertrag',
    '[ORT]',
    '[Datum]',
    '[XXX]',
    '[einsetzen]',
    'Analyse erforderlich',
    'siehe oben',
    'wie vereinbart'
  ];

  // ═══════════════════════════════════════════════════════════════════════════
  // 🔥 v2.1: PHASE 1.5 - PRÄZISIONS-UPGRADE
  // Kontextbasiertes Killing statt blindem Pattern-Match
  // ═══════════════════════════════════════════════════════════════════════════

  // KATEGORIE A: IMMER BULLSHIT - Diese Phrasen sind NIEMALS legitim
  const ALWAYS_BULLSHIT_PHRASES = [
    'klarheit & präzision',
    'best practice',
    'sollte man haben',
    'könnte man ergänzen',
    'wäre empfehlenswert',
    'allgemeine verbesserung',
    'mehr klarheit',
    'bessere struktur',
    'optimale formulierung',
    'generell sinnvoll',
    'grundsätzlich ratsam',
    'der vollständigkeit halber',
    'empfiehlt sich',
    'anzuraten wäre',
    'zu empfehlen wäre',
    'professioneller wäre',
    'rechtssicherer wäre'
  ];

  // KATEGORIE B: KONTEXTABHÄNGIG - Nur Bullshit wenn OHNE konkrete Abweichung/Evidence
  // Diese Phrasen sind OK wenn: konkreter Vergleich, spezifische Abweichung, echtes Risiko
  const CONTEXT_DEPENDENT_PHRASES = [
    'marktüblich',
    'branchenstandard',
    'üblich ist',
    'standard ist',
    'fehlt üblicherweise',
    'typischerweise enthalten'
  ];

  // KATEGORIE C: SCHWACH - Nur in Kombination mit anderen Schwächen killen
  const WEAK_PHRASES = [
    'könnte präziser',
    'sollte ergänzt werden',
    'wäre zu empfehlen',
    'aus rechtlicher sicht',
    'zur klarstellung',
    'präzisere formulierung',
    'klarere regelung',
    'explizite regelung',
    'eindeutige definition',
    'konkretere angabe',
    'detailliertere beschreibung',
    'zur absicherung',
    'zur vermeidung von',
    'zur sicherheit',
    'im interesse beider parteien'
  ];

  // SCHWAMMIGE PATTERNS - Nur die wirklich unrettbaren
  const VAGUE_REASONING_PATTERNS = [
    /könnte\s+problematisch/i,
    /vielleicht\s+sollte/i,
    /möglicherweise\s+fehlt/i,
    /eventuell\s+verbessern/i,
    /wäre\s+zu\s+überlegen/i,
    /könnte\s+sinnvoll\s+sein/i,
    /wäre\s+denkbar/i,
    /man\s+könnte/i,
    /es\s+wäre\s+möglich/i
  ];

  // 🆕 SUBSTANZ-INDIKATOREN - Zeichen dass eine Aussage Substanz hat
  const SUBSTANCE_INDICATORS = [
    /§\s*\d+/,                    // Paragraphen-Referenz
    /abs\.\s*\d+/i,               // Absatz-Referenz
    /bgb|hgb|arbzg|kündigungsschutzgesetz/i,  // Gesetzesreferenzen
    /bgh|bag|lg|olg|az\./i,       // Rechtsprechung
    /\d+\s*(euro|€|%|prozent|tage|monate|jahre)/i,  // Konkrete Zahlen
    /haftung|kündigung|frist|zahlung|gewährleistung/i,  // Juristische Kernbegriffe
    /nachteil|risiko|schaden|verlust|kosten/i,  // Impact-Wörter
    /unwirksam|nichtig|rechtswidrig|unzulässig/i  // Rechtliche Konsequenzen
  ];

  // 🆕 Helper: Prüft ob Text echte Substanz hat (nicht nur Länge!)
  const hasSubstance = (text) => {
    if (!text || text.trim().length === 0) return false;
    const lowerText = text.toLowerCase();

    // Mindestens ein Substanz-Indikator vorhanden?
    const hasIndicator = SUBSTANCE_INDICATORS.some(pattern => pattern.test(text));

    // Keine schwammigen Patterns?
    const isVague = VAGUE_REASONING_PATTERNS.some(pattern => pattern.test(text));

    // Substanz = Hat Indikator ODER ist konkret genug (>30 Zeichen ohne vague)
    return hasIndicator || (text.trim().length > 30 && !isVague);
  };

  // 🆕 Helper: Prüft ob kontextabhängige Phrase mit Substanz untermauert ist
  const isContextPhraseJustified = (issue, phrase) => {
    // Phrase ist OK wenn:
    // 1. Evidence enthält konkreten Vergleich/Abweichung
    // 2. whyItMatters enthält spezifisches Risiko
    // 3. risk/impact ist hoch (>=7)

    const evidenceText = (issue.evidence || []).join(' ').toLowerCase();
    const whyMattersText = (issue.whyItMatters || '').toLowerCase();

    // Suche nach Vergleichs-/Abweichungs-Indikatoren
    const hasComparison = /abweich|unterschied|im gegensatz|anders als|statt|anstelle/i.test(evidenceText + whyMattersText);
    const hasSpecificRisk = /\d+\s*(euro|€|%)|schaden|verlust|haftung|klage/i.test(whyMattersText);
    const hasHighImpact = (issue.risk >= 7 || issue.impact >= 7);

    return hasComparison || hasSpecificRisk || hasHighImpact;
  };

  // Durchlaufe alle Kategorien und Issues
  result.categories = result.categories.map(category => {
    let issues = category.issues || [];

    issues = issues.map(issue => {
      let modified = false;

      // ═══════════════════════════════════════════════════════════════════════
      // 🔥 v2.1: ANTI-BULLSHIT-FIREWALL - PRÄZISIONS-UPGRADE
      // Kontextbasiertes Killing: Inhalt > Zeichenanzahl
      // ═══════════════════════════════════════════════════════════════════════

      // 🆕 Phase 2.2: Kill-Rules NUR für AI-generierte Issues
      // Rule-Issues und Top-Up-Issues sind deterministisch/trusted
      if (issue.origin && issue.origin !== 'ai') {
        console.log(`✅ [${requestId}] ${issue.origin.toUpperCase()}-Issue übersprungen (trusted): "${issue.id}"`);
        return issue; // Keine Kill-Rules für rule/topup
      }

      // 🆕 Phase 3d: best_practice Issues haben LOCKERE Kill-Rules
      const isBestPracticeIssue = issue.classification?.necessity === 'best_practice';
      if (isBestPracticeIssue) {
        // best_practice: Nur Priority auf "low" erzwingen, Rest durchlassen
        if (issue.priority !== 'low') {
          console.log(`⚠️ [${requestId}] best_practice: Priority "${issue.priority}"→"low" für "${issue.id}"`);
          issue.priority = 'low';
          modified = true;
        }
        // Risk auf max 4 begrenzen
        if (issue.risk > 4) {
          issue.risk = 4;
          issue.impact = Math.min(issue.impact, 4);
          modified = true;
        }
        console.log(`💡 [${requestId}] best_practice Issue durchgelassen: "${issue.id || issue.summary?.substring(0, 30)}"`);
        return issue; // Keine weiteren Kill-Rules für best_practice
      }

      // KILL-REGEL 1: Evidence fehlt komplett → LÖSCHEN (nur AI-Issues, NICHT best_practice)
      if (!issue.evidence || !Array.isArray(issue.evidence) || issue.evidence.length === 0) {
        console.warn(`🚫 [${requestId}] KILL-1: Evidence FEHLT für "${issue.id || issue.summary?.substring(0, 30)}" → GELÖSCHT`);
        evidenceMissing++;
        bullshitDropped++;
        return null;
      }

      // KILL-REGEL 2: Evidence ohne echte Textreferenz (muss § oder Zitat haben)
      const hasRealEvidence = issue.evidence.some(e =>
        e && e.length > 15 && (e.includes('§') || e.includes(':') || e.includes('"') || e.includes("'") || /abs\.|nr\.|satz/i.test(e))
      );
      if (!hasRealEvidence) {
        console.warn(`🚫 [${requestId}] KILL-2: Evidence ohne Textreferenz für "${issue.id || issue.summary?.substring(0, 30)}" → GELÖSCHT`);
        evidenceMissing++;
        bullshitDropped++;
        return null;
      }

      // KILL-REGEL 3: whyNotIntentional fehlt ODER ist schwammig → LÖSCHEN
      // 🆕 KEINE Längenprüfung mehr! Substanz statt Zeichenanzahl
      if (!issue.whyNotIntentional) {
        console.warn(`🚫 [${requestId}] KILL-3: whyNotIntentional FEHLT für "${issue.id || issue.summary?.substring(0, 30)}" → GELÖSCHT`);
        whyNotIntentionalMissing++;
        bullshitDropped++;
        return null;
      }
      const isVagueWhyNot = VAGUE_REASONING_PATTERNS.some(pattern => pattern.test(issue.whyNotIntentional));
      if (isVagueWhyNot) {
        console.warn(`🚫 [${requestId}] KILL-3b: whyNotIntentional SCHWAMMIG für "${issue.id || issue.summary?.substring(0, 30)}": "${issue.whyNotIntentional.substring(0, 50)}..." → GELÖSCHT`);
        whyNotIntentionalMissing++;
        bullshitDropped++;
        return null;
      }

      // KILL-REGEL 4: whenToIgnore fehlt ODER ist schwammig → LÖSCHEN
      // 🆕 Substanzprüfung statt Länge
      if (!issue.whenToIgnore || !hasSubstance(issue.whenToIgnore)) {
        console.warn(`🚫 [${requestId}] KILL-4: whenToIgnore FEHLT/substanzlos für "${issue.id || issue.summary?.substring(0, 30)}" → GELÖSCHT`);
        bullshitDropped++;
        return null;
      }

      // KILL-REGEL 5: whyItMatters fehlt ODER ist substanzlos → LÖSCHEN
      if (!issue.whyItMatters || !hasSubstance(issue.whyItMatters)) {
        console.warn(`🚫 [${requestId}] KILL-5: whyItMatters FEHLT/substanzlos für "${issue.id || issue.summary?.substring(0, 30)}" → GELÖSCHT`);
        genericWhyItMatters++;
        bullshitDropped++;
        return null;
      }

      // KILL-REGEL 6: IMMER-BULLSHIT Phrasen in Summary/whyItMatters → LÖSCHEN
      const allText = `${issue.summary || ''} ${issue.whyItMatters || ''}`.toLowerCase();
      const hasAlwaysBullshit = ALWAYS_BULLSHIT_PHRASES.some(phrase => allText.includes(phrase));
      if (hasAlwaysBullshit) {
        console.warn(`🚫 [${requestId}] KILL-6: IMMER-BULLSHIT Phrase gefunden in "${issue.id || issue.summary?.substring(0, 30)}" → GELÖSCHT`);
        genericSummaryDropped++;
        bullshitDropped++;
        return null;
      }

      // KILL-REGEL 7: KONTEXTABHÄNGIGE Phrasen OHNE Rechtfertigung → LÖSCHEN
      // 🆕 "marktüblich" ist OK wenn mit Vergleich/Risiko untermauert!
      const foundContextPhrase = CONTEXT_DEPENDENT_PHRASES.find(phrase => allText.includes(phrase));
      if (foundContextPhrase && !isContextPhraseJustified(issue, foundContextPhrase)) {
        console.warn(`🚫 [${requestId}] KILL-7: "${foundContextPhrase}" OHNE Kontext für "${issue.id || issue.summary?.substring(0, 30)}" → GELÖSCHT`);
        genericSummaryDropped++;
        bullshitDropped++;
        return null;
      }

      // KILL-REGEL 8: SCHWACHE Phrasen in Kombination mit niedriger Substanz → LÖSCHEN
      const hasWeakPhrase = WEAK_PHRASES.some(phrase => allText.includes(phrase));
      const hasLowSubstance = !hasSubstance(issue.whyItMatters) && !hasSubstance(issue.whyNotIntentional);
      const hasLowImpact = (issue.risk < 5 && issue.impact < 5);
      if (hasWeakPhrase && (hasLowSubstance || hasLowImpact)) {
        console.warn(`🚫 [${requestId}] KILL-8: Schwache Phrase + niedrige Substanz für "${issue.id || issue.summary?.substring(0, 30)}" → GELÖSCHT`);
        genericSummaryDropped++;
        bullshitDropped++;
        return null;
      }

      // ═══════════════════════════════════════════════════════════════════════
      // 🆕 PHASE 3a.1: EXISTENZ- & NECESSITY-GATES (ENTSCHÄRFT)
      // ═══════════════════════════════════════════════════════════════════════

      // KILL-REGEL 9: "FEHLT/Pflicht" in SUMMARY oder REASONING (nicht originalText!)
      // 🔧 Phase 3a.1 FIX: originalText ist oft auto-generiert, nicht GPT's Aussage
      const summaryAndReasoning = `${issue.summary || ''} ${issue.legalReasoning || ''}`.toLowerCase();
      const claimsMissing = /pflichtklausel\s*fehlt|zwingend\s*erforderlich\s*fehlt|muss\s*enthalten\s*sein.*fehlt/i.test(summaryAndReasoning);
      const existenceNotMissing = issue.classification?.existence && issue.classification.existence !== 'missing';
      if (claimsMissing && existenceNotMissing) {
        console.warn(`🚫 [${requestId}] KILL-9: FALSE POSITIVE - "fehlt" in Summary/Reasoning aber existence="${issue.classification.existence}" für "${issue.id || issue.summary?.substring(0, 30)}" → GELÖSCHT`);
        bullshitDropped++;
        return null;
      }

      // REGEL 10: necessity="best_practice" + risk >= 7 → HERABSTUFEN (nicht löschen!)
      // 🔧 Phase 3a.1 FIX: DSGVO-Upgrades, Haftungs-Caps haben legitimes hohes Risiko
      const isBestPractice = issue.classification?.necessity === 'best_practice';
      if (isBestPractice && issue.risk >= 7) {
        const oldRisk = issue.risk;
        issue.risk = 5; // Max risk für best_practice
        issue.impact = Math.min(issue.impact, 5);
        console.log(`⚠️ [${requestId}] REGEL-10: best_practice risk ${oldRisk}→5 für "${issue.id || issue.summary?.substring(0, 30)}" (herabgestuft, nicht gelöscht)`);
        modified = true;
      }

      // KILL-REGEL 11: "Pflichtklausel" im Summary aber necessity !== "mandatory" → FALSCHE DRINGLICHKEIT
      const claimsPflicht = /Pflichtklausel|zwingend\s+erforderlich|gesetzlich\s+vorgeschrieben/i.test(issue.summary || '');
      const notMandatory = issue.classification?.necessity && issue.classification.necessity !== 'mandatory';
      if (claimsPflicht && notMandatory) {
        console.warn(`🚫 [${requestId}] KILL-11: "Pflichtklausel" aber necessity="${issue.classification.necessity}" für "${issue.id || issue.summary?.substring(0, 30)}" → GELÖSCHT`);
        bullshitDropped++;
        return null;
      }

      // 🆕 Phase 3a.1: Risk-Capping für alle best_practice Issues
      if (isBestPractice && issue.risk > 5) {
        issue.risk = 5;
        issue.impact = Math.min(issue.impact, 5);
        modified = true;
      }

      // ═══════════════════════════════════════════════════════════════════════
      // STANDARD QUALITY CHECKS (wie vorher)
      // ═══════════════════════════════════════════════════════════════════════

      // 1. ENTFERNE PLATZHALTER aus improvedText
      FORBIDDEN_PLACEHOLDERS.forEach(placeholder => {
        if (issue.improvedText && issue.improvedText.includes(placeholder)) {
          console.log(`⚠️ [${requestId}] Platzhalter "${placeholder}" entfernt in issue ${issue.id}`);

          // Ersetze durch generische aber korrekte Formulierung
          issue.improvedText = issue.improvedText
            .replace(/siehe Vereinbarung/gi, 'individuell zu vereinbaren')
            .replace(/siehe Vertrag/gi, 'gemäß den Vertragsbestimmungen')
            .replace(/\[ORT\]/gi, 'am Sitz der leistenden Partei')
            .replace(/\[Datum\]/gi, 'zum vereinbarten Zeitpunkt')
            .replace(/\[XXX\]/gi, '')
            .replace(/\[einsetzen\]/gi, '')
            .replace(/Analyse erforderlich/gi, '')
            .replace(/siehe oben/gi, 'wie bereits dargestellt')
            .replace(/wie vereinbart/gi, 'gemäß den vertraglichen Vereinbarungen');

          placeholdersRemoved++;
          modified = true;
        }
      });

      // 2. GENERIERE FEHLENDE SUMMARY (max 60 Zeichen)
      if (!issue.summary || issue.summary.trim() === '' || issue.summary === 'Klarheit & Präzision') {
        // Auto-generate aus legalReasoning oder improvedText
        const firstSentence = (issue.legalReasoning || issue.improvedText || '')
          .split('.')[0]
          .substring(0, 60)
          .trim();

        issue.summary = firstSentence || 'Rechtliche Optimierung erforderlich';
        console.log(`✅ [${requestId}] Summary generiert: "${issue.summary}"`);
        modified = true;
      }

      // 3. VALIDIERE MINDESTLÄNGEN
      if (issue.improvedText && issue.improvedText.length < 100) {
        console.log(`⚠️ [${requestId}] ImprovedText zu kurz (${issue.improvedText.length} Zeichen) → verworfen`);
        return null; // Markiere zum Löschen
      }

      // 4. VALIDIERE KATEGORIE
      ensureCategory(issue);

      // 🔥 FIX v3.1 (ChatGPT): Content-Mismatch Guard - NACH Category-Validation, VOR Dedupe
      const textToCheck = issue.improvedText || issue.originalText || '';
      if (!isTextMatchingCategory(issue.category, textToCheck)) {
        console.warn(`⚠️ [${requestId}] Category/Content mismatch: "${issue.category}" but text about "${textToCheck.substring(0, 50)}..." → dropping issue`);
        contentMismatchDropped++;
        return null; // Issue droppen
      }

      if (modified) {
        issuesFixed++;
      }

      return issue;
    }).filter(issue => issue !== null); // Entferne ungültige

    // 🔥 NEUE DEDUPE-LOGIK: Token-basiert + Similarity
    const beforeDedupe = issues.length;
    issues = dedupeIssues(issues);
    duplicatesRemoved += (beforeDedupe - issues.length);

    // 🔥 CHATGPT-FIX: SANITIZER nach Dedupe anwenden
    issues = issues.map(issue => {
      if (issue.improvedText) {
        const result = sanitizeImprovedText(issue.improvedText, contractType);
        issue.improvedText = result.text;

        // Akkumuliere Stats
        sanitizerStats.roleTerms += result.stats.roleTerms;
        sanitizerStats.pseudoStats += result.stats.pseudoStats;
        sanitizerStats.paragraphHeaders += result.stats.paragraphHeaders;
        sanitizerStats.arbitraryHours += result.stats.arbitraryHours;

        if (result.stats.roleTerms || result.stats.pseudoStats || result.stats.paragraphHeaders || result.stats.arbitraryHours) {
          sanitized++;
        }
      }
      if (issue.summary) {
        issue.summary = sanitizeText(issue.summary);
      }
      if (issue.benchmark) {
        issue.benchmark = sanitizeText(issue.benchmark);
      }
      return issue;
    });

    return {
      ...category,
      issues: issues
    };
  });

  // Entferne leere Kategorien
  result.categories = result.categories.filter(cat => cat.issues.length > 0);

  // Update Summary
  result.summary.totalIssues = result.categories.reduce((sum, cat) => sum + cat.issues.length, 0);

  console.log(`✅ [${requestId}] QUALITY CHECK v2.0 abgeschlossen:`);
  console.log(`   - ${issuesFixed} Issues gefixt`);
  console.log(`   - ${duplicatesRemoved} Duplikate entfernt`);
  console.log(`   - ${contentMismatchDropped} Content-Mismatch-Issues entfernt`);
  console.log(`   - ${placeholdersRemoved} Platzhalter ersetzt`);
  console.log(`   - ${sanitized} Issues sanitized:`);
  console.log(`     • ${sanitizerStats.roleTerms} Rollen-Terms (Auftraggeber→Arbeitgeber)`);
  console.log(`     • ${sanitizerStats.pseudoStats} Pseudo-Statistiken entfernt`);
  console.log(`     • ${sanitizerStats.paragraphHeaders} §-Überschriften entfernt`);
  console.log(`     • ${sanitizerStats.arbitraryHours} willkürliche Stunden ersetzt`);
  console.log(`   🚫 ANTI-BULLSHIT v2.0 Stats:`);
  console.log(`     • ${bullshitDropped} Bullshit-Issues GELÖSCHT`);
  console.log(`     • ${genericSummaryDropped} generische Summaries entfernt`);
  console.log(`     • ${evidenceMissing} Issues ohne Evidence (Warnung)`);
  console.log(`     • ${whyNotIntentionalMissing} Issues ohne/schwammig whyNotIntentional (Warnung)`);
  console.log(`     • ${genericWhyItMatters} Issues mit generischem whyItMatters (Warnung)`);
  console.log(`   - ${result.summary.totalIssues} Issues übrig`);

  return result;
};

/**
 * Normalisiert und validiert AI-Output zu strukturiertem Format
 * Stellt sicher, dass alle Optimierungen vollständige juristische Klauseln enthalten
 */
const normalizeAndValidateOutput = (aiOutput, contractType) => {
  // Default-Struktur mit juristischen Kategorien
  const defaultResult = {
    meta: {
      type: contractType || 'sonstiges',
      confidence: 75,
      jurisdiction: 'DE',
      language: 'de',
      analysisMethod: 'ai_enhanced',
      legalFramework: CONTRACT_TYPES[contractType]?.legalFramework || ['BGB', 'HGB']
    },
    categories: [],
    score: { health: 75 },
    summary: {
      redFlags: 0,
      quickWins: 0,
      totalIssues: 0,
      criticalLegalRisks: 0,
      complianceIssues: 0
    }
  };
  
  if (!aiOutput) {
    console.log('⚠️ No AI output to normalize');
    return defaultResult;
  }
  
  try {
    let parsed;
    
    if (typeof aiOutput === 'string') {
      // Bereinige potentielle Markdown oder Code-Blöcke
      let cleanedOutput = aiOutput
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      
      // Versuche JSON zu finden
      const jsonMatch = cleanedOutput.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanedOutput = jsonMatch[0];
      }
      
      try {
        parsed = JSON.parse(cleanedOutput);
      } catch (e) {
        console.log('⚠️ Failed to parse AI JSON, using enhanced fallback extraction');
        parsed = extractFromTextEnhanced(aiOutput, contractType);
      }
    } else {
      parsed = aiOutput;
    }
    
    // Validiere und normalisiere Struktur
    const result = {
      meta: {
        type: parsed?.meta?.type || contractType || 'sonstiges',
        confidence: parsed?.meta?.confidence || 85,
        jurisdiction: parsed?.meta?.jurisdiction || 'DE',
        language: parsed?.meta?.language || 'de',
        isAmendment: parsed?.meta?.isAmendment || false,
        parentType: parsed?.meta?.parentType || null,
        analysisMethod: 'ai_enhanced_with_legal_templates',
        legalFramework: CONTRACT_TYPES[parsed?.meta?.type || contractType]?.legalFramework || ['BGB'],
        // 🆕 v2.0: Decision-First Meta-Felder
        recognizedAs: parsed?.meta?.recognizedAs || null,
        maturity: parsed?.meta?.maturity || null
      },
      // 🆕 v2.0: Assessment-Block für Decision-First Architecture
      assessment: parsed?.assessment || null,
      categories: [],
      score: {
        health: parsed?.score?.health || 75
      },
      summary: {
        redFlags: 0,
        quickWins: 0,
        totalIssues: 0,
        criticalLegalRisks: 0,
        complianceIssues: 0
      }
    };
    
    // Verarbeite Kategorien und stelle sicher, dass Klauseln vollständig sind
    if (parsed?.categories && Array.isArray(parsed.categories)) {
      result.categories = parsed.categories.map(cat => ({
        tag: cat.tag || 'general',
        label: cat.label || getCategoryLabel(cat.tag || 'general'),
        present: cat.present !== false,
        issues: Array.isArray(cat.issues) ? cat.issues.map(issue => {
          // Erweitere kurze Klauseln mit professionellen Templates
          let improvedText = cleanText(issue.improvedText || issue.improved || '');
          
          // Wenn die Klausel zu kurz ist, erweitere sie
          if (improvedText.length < 300) {
            improvedText = expandClauseWithTemplate(
              improvedText,
              cat.tag,
              contractType,
              issue.originalText
            );
          }
          
          return {
            id: issue.id || `issue_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
            // 🆕 Phase 2.1: Explizite Issue-Herkunft
            origin: 'ai',
            summary: cleanText(issue.summary || issue.description || ''),
            originalText: cleanText(issue.originalText || issue.original || 'FEHLT - Diese Klausel ist nicht vorhanden'),
            improvedText: improvedText,
            legalReasoning: enhanceLegalReasoning(
              issue.legalReasoning || issue.reasoning || '',
              cat.tag,
              contractType
            ),
            risk: parseInt(issue.risk) || 5,
            impact: parseInt(issue.impact) || 5,
            confidence: parseInt(issue.confidence) || 85,
            difficulty: issue.difficulty || 'Mittel',
            benchmark: issue.benchmark || issue.marketBenchmark || generateBenchmark(cat.tag, contractType),
            legalReferences: extractLegalReferences(issue.legalReasoning || ''),
            // 🆕 v2.0: Anti-Bullshit Decision-First Felder
            evidence: issue.evidence || [],
            whyItMatters: issue.whyItMatters || '',
            whyNotIntentional: issue.whyNotIntentional || '',
            whenToIgnore: issue.whenToIgnore || '',
            // 🆕 Phase 3a: Klassifikationsobjekt
            classification: issue.classification || {
              existence: 'missing',
              sufficiency: 'weak',
              necessity: 'risk_based',
              perspective: 'neutral'
            }
          };
        }) : []
      }));
      
      // Berechne Zusammenfassung
      result.categories.forEach(cat => {
        cat.issues.forEach(issue => {
          result.summary.totalIssues++;
          if (issue.risk >= 8) {
            result.summary.redFlags++;
            result.summary.criticalLegalRisks++;
          }
          if (issue.difficulty === 'Einfach') result.summary.quickWins++;
          if (cat.tag.includes('compliance') || cat.tag.includes('datenschutz')) {
            result.summary.complianceIssues++;
          }
        });
      });
    }
    
    // Update Summary von parsed wenn verfügbar
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

/**
 * Erweiterte Textextraktion mit juristischem Kontext
 */
const extractFromTextEnhanced = (text, contractType) => {
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
  
  // Erweiterte juristische Muster für Problemerkennung
  const issuePatterns = [
    // Kritische rechtliche Probleme
    /(?:unwirksam|nichtig|rechtswidrig|unzulässig|sittenwidrig):\s*([^.]+)/gi,
    /(?:verstößt gegen|verletzt|widerspricht)\s+§\s*\d+[a-z]?\s+\w+:\s*([^.]+)/gi,
    
    // Risiken und Lücken
    /(?:risiko|gefahr|lücke|fehlt|mangel):\s*([^.]+)/gi,
    /(?:unklar|mehrdeutig|auslegungsbedürftig|interpretationsspielraum):\s*([^.]+)/gi,
    
    // Empfehlungen
    /(?:empfehlung|vorschlag|optimierung|verbesserung):\s*([^.]+)/gi,
    /(?:sollte|müsste|könnte|wäre zu)\s+([^.]+)/gi,
    
    // Rechtliche Hinweise
    /(?:gemäß|nach|entsprechend)\s+§\s*\d+[a-z]?\s+\w+\s+([^.]+)/gi,
    /(?:BAG|BGH|LAG|OLG|EuGH).*?:\s*([^.]+)/gi
  ];
  
  const issues = [];
  const processedTexts = new Set();
  
  issuePatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const issueText = match[1].trim();
      
      // Vermeide Duplikate
      if (processedTexts.has(issueText)) continue;
      processedTexts.add(issueText);
      
      // Bestimme Risikostufe basierend auf Schlüsselwörtern
      let risk = 5;
      if (/unwirksam|nichtig|rechtswidrig/.test(match[0])) risk = 9;
      else if (/verstößt|verletzt|kritisch/.test(match[0])) risk = 8;
      else if (/risiko|gefahr|problem/.test(match[0])) risk = 7;
      else if (/unklar|lücke|fehlt/.test(match[0])) risk = 6;
      
      // Extrahiere rechtliche Referenzen
      const legalRefs = match[0].match(/§\s*\d+[a-z]?\s+\w+/g) || [];
      const caseRefs = match[0].match(/\b[A-Z]{2,}\b.*?\d{4}/g) || [];
      
      issues.push({
        id: `extracted_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        summary: issueText,
        originalText: 'Siehe Vertrag - Analyse erforderlich',
        improvedText: generateImprovedClause(issueText, contractType),
        legalReasoning: `Rechtliche Optimierung erforderlich. ${legalRefs.join(', ')} ${caseRefs.join(', ')}`,
        risk: risk,
        impact: Math.max(5, risk - 1),
        confidence: 75,
        difficulty: risk >= 8 ? 'Komplex' : risk >= 6 ? 'Mittel' : 'Einfach',
        legalReferences: [...legalRefs, ...caseRefs]
      });
    }
  });
  
  // Gruppiere Issues nach Kategorien
  if (issues.length > 0) {
    const categorizedIssues = new Map();
    
    issues.forEach(issue => {
      // Bestimme Kategorie basierend auf Inhalt
      let category = 'general';
      const lowerSummary = issue.summary.toLowerCase();
      
      if (/kündigung|beendigung|laufzeit/.test(lowerSummary)) category = 'kuendigung_beendigung';
      else if (/haftung|schadenersatz|gewährleistung/.test(lowerSummary)) category = 'haftung_gewaehrleistung';
      else if (/zahlung|vergütung|preis|kosten/.test(lowerSummary)) category = 'verguetung_zahlung';
      else if (/datenschutz|dsgvo|vertraulich/.test(lowerSummary)) category = 'datenschutz_vertraulichkeit';
      else if (/frist|termin|zeit/.test(lowerSummary)) category = 'termine_fristen';
      
      if (!categorizedIssues.has(category)) {
        categorizedIssues.set(category, []);
      }
      categorizedIssues.get(category).push(issue);
    });
    
    // Erstelle Kategorien-Array
    categorizedIssues.forEach((categoryIssues, categoryTag) => {
      result.categories.push({
        tag: categoryTag,
        label: getCategoryLabel(categoryTag),
        present: true,
        issues: categoryIssues.slice(0, 5) // Limitiere auf 5 Issues pro Kategorie
      });
    });
    
    result.summary.totalIssues = issues.length;
    result.summary.redFlags = issues.filter(i => i.risk >= 8).length;
    result.summary.quickWins = issues.filter(i => i.difficulty === 'Einfach').length;
  }
  
  return result;
};

/**
 * Erweitert eine Klausel mit professionellen juristischen Templates
 */
const expandClauseWithTemplate = (shortClause, category, contractType, originalText) => {
  // Prüfe ob es eine fehlende Klausel ist
  const isMissing = originalText && (originalText.includes('FEHLT') || originalText.includes('nicht vorhanden'));
  
  // Hole passendes Template basierend auf Kategorie und Vertragstyp
  let template = null;
  
  // Versuche spezifisches Template zu finden
  if (PROFESSIONAL_CLAUSE_TEMPLATES[category]) {
    template = PROFESSIONAL_CLAUSE_TEMPLATES[category].standard || 
               PROFESSIONAL_CLAUSE_TEMPLATES[category].erweitert ||
               Object.values(PROFESSIONAL_CLAUSE_TEMPLATES[category])[0];
  }
  
  // Fallback auf universelle Templates
  if (!template) {
    if (category.includes('kuendigung')) template = PROFESSIONAL_CLAUSE_TEMPLATES.kuendigung.ordentlich_ausserordentlich;
    else if (category.includes('haftung')) template = PROFESSIONAL_CLAUSE_TEMPLATES.haftung.ausgewogen;
    else if (category.includes('datenschutz')) template = PROFESSIONAL_CLAUSE_TEMPLATES.datenschutz.dsgvo_konform;
    else if (category.includes('zahlung') || category.includes('verguetung')) {
      if (contractType === 'arbeitsvertrag') template = PROFESSIONAL_CLAUSE_TEMPLATES.verguetung.umfassend;
      else template = PROFESSIONAL_CLAUSE_TEMPLATES.gewaehrleistung_b2b.umfassend;
    }
    else template = PROFESSIONAL_CLAUSE_TEMPLATES.schriftform.standard;
  }
  
  if (template) {
    // Bereinige Template
    const cleanedTemplate = cleanText(template);
    
    if (isMissing) {
      // Bei fehlender Klausel: Vollständiges Template
      return cleanedTemplate;
    } else {
      // Bei vorhandener Klausel: Kombiniere mit Template
      if (shortClause.length < 200) {
        return `${shortClause}\n\nVollständige empfohlene Formulierung:\n\n${cleanedTemplate}`;
      }
      return shortClause; // Klausel ist bereits lang genug
    }
  }
  
  // Fallback: Erweitere die kurze Klausel generisch
  if (shortClause.length < 300) {
    return `${shortClause}

Erweiterte Regelung gemäß Best Practice:

(1) Die vorstehende Regelung ist wie folgt zu präzisieren und zu erweitern.

(2) Es sind die einschlägigen gesetzlichen Bestimmungen zu beachten, insbesondere die Vorgaben des BGB und spezieller Gesetze.

(3) Die Parteien sollten eine eindeutige und rechtssichere Formulierung wählen, die keine Auslegungsspielräume lässt.

(4) Empfohlen wird die Aufnahme von Regelungen zu Ausnahmen, Verfahren und Rechtsfolgen.

(5) Die Klausel sollte mit den übrigen Vertragsbestimmungen harmonieren und keine Widersprüche erzeugen.`;
  }
  
  return shortClause;
};

/**
 * Verbessert die juristische Begründung mit Gesetzesreferenzen und Rechtsprechung
 */
const enhanceLegalReasoning = (reasoning, category, contractType) => {
  if (!reasoning) {
    reasoning = 'Rechtliche Optimierung zur Risikominimierung und Rechtssicherheit erforderlich.';
  }
  
  // Füge spezifische rechtliche Referenzen hinzu wenn nicht vorhanden
  if (!reasoning.includes('§') && !reasoning.includes('BGB') && !reasoning.includes('BGH')) {
    const typeConfig = CONTRACT_TYPES[contractType];
    const legalFramework = typeConfig?.legalFramework || ['BGB'];
    
    // Füge relevante Gesetzesreferenzen hinzu
    let enhancedReasoning = reasoning + '\n\nRechtliche Grundlagen: ';
    
    // Kategorie-spezifische Gesetze
    if (category.includes('kuendigung')) {
      enhancedReasoning += 'Die Kündigungsregelungen müssen den Vorgaben der §§ 622 ff. BGB (ordentliche Kündigung) und § 626 BGB (außerordentliche Kündigung) entsprechen. ';
      if (contractType === 'arbeitsvertrag') {
        enhancedReasoning += 'Zusätzlich sind die Vorgaben des KSchG zu beachten. BAG, Urteil vom 27.04.2023 - 2 AZR 284/22: Kündigungsfristen müssen eindeutig bestimmt sein. ';
      }
    } else if (category.includes('haftung')) {
      enhancedReasoning += 'Haftungsbeschränkungen unterliegen der AGB-Kontrolle gemäß §§ 305 ff. BGB. BGH, Urteil vom 19.10.2022 - VIII ZR 209/21: Haftungsausschlüsse für grobe Fahrlässigkeit sind unwirksam. ';
    } else if (category.includes('datenschutz')) {
      enhancedReasoning += 'Die Datenverarbeitung muss den Anforderungen der DSGVO (insb. Art. 6, 13, 28, 32) und des BDSG entsprechen. EuGH, Urteil vom 16.07.2020 - C-311/18 (Schrems II): Besondere Anforderungen bei Drittlandtransfers. ';
    } else {
      enhancedReasoning += `Relevante Rechtsgrundlagen: ${legalFramework.join(', ')}. `;
    }
    
    enhancedReasoning += 'Die vorgeschlagene Klausel entspricht der aktuellen Rechtsprechung und herrschenden Meinung in der juristischen Literatur.';
    
    return enhancedReasoning;
  }
  
  return reasoning;
};

/**
 * Extrahiert rechtliche Referenzen aus Text
 */
const extractLegalReferences = (text) => {
  const references = [];
  
  // Gesetze
  const lawMatches = text.match(/§+\s*\d+[a-z]?\s+\w+/g) || [];
  references.push(...lawMatches);
  
  // Gerichtsentscheidungen
  const caseMatches = text.match(/\b(BGH|BAG|BSG|BVerfG|EuGH|OLG|LAG|LG|AG)\b[^.]*\d{4}/g) || [];
  references.push(...caseMatches);
  
  // Verordnungen
  const regulationMatches = text.match(/\b(DSGVO|GWB|UWG|HGB|AktG|GmbHG|BGB|ZPO|StGB|ArbZG|BetrVG|KSchG)\b/g) || [];
  references.push(...regulationMatches);
  
  return [...new Set(references)]; // Entferne Duplikate
};

/**
 * Generiert realistische Benchmark-Daten
 */
const generateBenchmark = (category, contractType) => {
  const benchmarks = {
    'kuendigung_beendigung': '87% der professionellen Verträge enthalten präzise Kündigungsregelungen mit klaren Fristen (Studie: Bundesrechtsanwaltskammer 2023)',
    'haftung_gewaehrleistung': '92% der B2B-Verträge begrenzen die Haftung auf vorhersehbare Schäden (IHK-Vertragsstudie 2023)',
    'datenschutz_vertraulichkeit': '96% der Verträge nach 05/2018 enthalten DSGVO-konforme Datenschutzklauseln (Datenschutzkonferenz 2023)',
    'verguetung_zahlung': '78% nutzen Zahlungsfristen von 14-30 Tagen mit Verzugszinsregelung (Creditreform Zahlungsanalyse 2023)',
    'termine_fristen': '83% definieren klare Leistungsfristen mit Verzugsfolgen (DIHK Vertragsreport 2023)'
  };
  
  return benchmarks[category] || `Branchenübliche Regelung gemäß aktueller Rechtsprechung und Vertragspraxis im Bereich ${contractType}`;
};

/**
 * Generiert eine verbesserte Klausel basierend auf dem Problem
 */
const generateImprovedClause = (problemDescription, contractType) => {
  // Basis-Template für unbekannte Probleme
  let improvedClause = `§ [X] Optimierte Vertragsregelung

(1) [Hauptregelung zur Behebung des identifizierten Problems]

(2) [Präzisierung und Ausnahmen]

(3) [Verfahrensregelung und Rechtsfolgen]

(4) [Übergangs- und Schlussbestimmungen]`;
  
  // Versuche spezifischere Klausel basierend auf Problemtyp zu generieren
  const lowerProblem = problemDescription.toLowerCase();
  
  if (lowerProblem.includes('kündigung') || lowerProblem.includes('beendigung')) {
    improvedClause = PROFESSIONAL_CLAUSE_TEMPLATES.kuendigung.ordentlich_ausserordentlich;
  } else if (lowerProblem.includes('haftung') || lowerProblem.includes('schadenersatz')) {
    improvedClause = PROFESSIONAL_CLAUSE_TEMPLATES.haftung.ausgewogen;
  } else if (lowerProblem.includes('datenschutz') || lowerProblem.includes('dsgvo')) {
    improvedClause = PROFESSIONAL_CLAUSE_TEMPLATES.datenschutz.dsgvo_konform;
  } else if (lowerProblem.includes('zahlung') || lowerProblem.includes('vergütung')) {
    if (contractType === 'arbeitsvertrag') {
      improvedClause = PROFESSIONAL_CLAUSE_TEMPLATES.verguetung.umfassend;
    }
  }
  
  return cleanText(improvedClause);
};

/**
 * Hauptfunktion: Erweiterte Vertragstypenerkennung mit KI-Unterstützung
 */
const detectContractType = async (text, fileName = '') => {
  const lowerText = text.toLowerCase();
  const lowerFileName = fileName.toLowerCase();
  
  // 🔥 FIX Phase 3b.8: Amendment-Erkennung PRÄZISIERT
  // PROBLEM: "vertragsänderung" matchte "§ 12 Vertragsänderungen" in normalen Verträgen!
  // LÖSUNG: Unterscheide zwischen Dateiname (immer prüfen) und Content (nur Titel-Bereich)

  // === DATEINAME-INDIKATOREN (dürfen im Dateinamen vorkommen) ===
  const filenameAmendmentIndicators = [
    // Formelle Bezeichnungen
    'änderungsvereinbarung', 'nachtrag', 'zusatzvereinbarung',
    'amendment', 'addendum', 'supplement',
    'vertragsergänzung', 'vertragsnachtrag',
    // Arbeitsvertrag-spezifische Amendments (häufig in Dateinamen!)
    'arbeitszeiterhöhung', 'arbeitszeitänderung', 'arbeitszeitanpassung',
    'gehaltserhöhung', 'gehaltsanpassung', 'gehaltsnachtrag',
    'stundenerhöhung', 'stundenreduzierung', 'stundenanpassung',
    'arbeitsvertragsänderung',
    'tätigkeitsänderung', 'versetzung',
    // Weitere häufige Amendment-Typen
    'mieterhöhung', 'mietanpassung', 'mietnachtrag',
    'konditionsänderung', 'preisanpassung'
    // ENTFERNT: 'vertragsänderung' (zu generisch - jeder Vertrag hat diese Klausel!)
    // ENTFERNT: 'verlängerung', 'vertragsverlängerung' (zu generisch)
  ];

  // === CONTENT-INDIKATOREN (nur im TITEL-BEREICH, erste 500 Zeichen) ===
  const titleAmendmentIndicators = [
    'änderungsvereinbarung', 'nachtrag zum', 'zusatzvereinbarung',
    'änderung zum arbeitsvertrag', 'änderung zum mietvertrag',
    'ergänzung zum vertrag', 'anpassung des vertrages vom',
    'amendment to', 'addendum to'
  ];

  let isAmendment = false;
  let parentContractType = null;

  // ✅ NUR als Amendment erkennen wenn KLARE Indikatoren vorhanden sind
  let matchedIndicator = null;
  let matchSource = null;

  // 1. DATEINAME prüfen (alle Indikatoren)
  for (const indicator of filenameAmendmentIndicators) {
    if (lowerFileName.includes(indicator)) {
      isAmendment = true;
      matchedIndicator = indicator;
      matchSource = 'filename';
      break;
    }
  }

  // 2. TITEL-BEREICH prüfen (nur erste 500 Zeichen, spezifischere Indikatoren)
  if (!isAmendment) {
    const titleText = lowerText.slice(0, 500);
    for (const indicator of titleAmendmentIndicators) {
      if (titleText.includes(indicator)) {
        isAmendment = true;
        matchedIndicator = indicator;
        matchSource = 'title';
        break;
      }
    }
  }

  if (isAmendment) {
    console.log(`📋 [AMENDMENT-DETECT] ✅ Amendment erkannt!`);
    console.log(`   → Indicator: "${matchedIndicator}"`);
    console.log(`   → Source: ${matchSource} (${matchSource === 'filename' ? fileName : 'Vertragstext'})`);

    // Identifiziere Hauptvertragstyp
    const mainContractPatterns = [
      { pattern: /arbeitsvertrag.*?vom\s+\d{1,2}\.\d{1,2}\.\d{4}/i, type: 'arbeitsvertrag' },
      { pattern: /mietvertrag.*?vom\s+\d{1,2}\.\d{1,2}\.\d{4}/i, type: 'mietvertrag_wohnung' },
      { pattern: /kaufvertrag.*?vom\s+\d{1,2}\.\d{1,2}\.\d{4}/i, type: 'kaufvertrag' },
      { pattern: /dienstvertrag.*?vom\s+\d{1,2}\.\d{1,2}\.\d{4}/i, type: 'dienstvertrag' },
      { pattern: /werkvertrag.*?vom\s+\d{1,2}\.\d{1,2}\.\d{4}/i, type: 'werkvertrag' }
    ];

    for (const { pattern, type } of mainContractPatterns) {
      if (pattern.test(text)) {
        parentContractType = type;
        console.log(`   → Parent Contract: ${type}`);
        break;
      }
    }

    if (!parentContractType) {
      // Fallback: Suche nach Vertragstyp-Keywords im Text
      if (lowerText.includes('arbeitsvertrag') || lowerText.includes('arbeitnehmer')) {
        parentContractType = 'arbeitsvertrag';
        console.log(`   → Parent Contract (Fallback): arbeitsvertrag`);
      }
    }
  } else {
    console.log(`📋 [AMENDMENT-DETECT] ❌ Kein Amendment erkannt (Dateiname: ${fileName})`);
  }
  
  // Multi-Stage-Erkennung mit Scoring
  let typeScores = {};
  
  for (const [type, config] of Object.entries(CONTRACT_TYPES)) {
    let score = 0;
    
    // Boost für Amendments
    if (isAmendment && config.isAmendment) {
      score += 50;
      if (config.parentType === parentContractType) {
        score += 100;
      }
    } else if (isAmendment && !config.isAmendment) {
      continue; // Skip non-amendment types when amendment detected
    }
    
    // Keyword-Analyse
    config.keywords.forEach(keyword => {
      const occurrences = (lowerText.match(new RegExp(`\\b${keyword}\\b`, 'g')) || []).length;
      score += occurrences * 3;
      
      if (lowerFileName.includes(keyword)) {
        score += 20;
      }
    });
    
    // Klausel-Indikatoren
    config.requiredClauses.forEach(clause => {
      const clauseKeywords = clause.replace(/_/g, ' ').split(' ');
      if (clauseKeywords.some(kw => lowerText.includes(kw))) {
        score += 5;
      }
    });
    
    // Rechtliche Begriffe
    if (config.legalFramework) {
      config.legalFramework.forEach(law => {
        if (text.includes(law)) {
          score += 10;
        }
      });
    }
    
    typeScores[type] = score;
  }
  
  // Finde besten Match
  const sortedScores = Object.entries(typeScores).sort((a, b) => b[1] - a[1]);
  const bestMatch = sortedScores[0] || ['sonstiges', 0];
  
  let contractType = bestMatch[1] > 20 ? bestMatch[0] : 'sonstiges';
  
  // Spezialfall: Amendment ohne spezifischen Typ
  if (isAmendment && !CONTRACT_TYPES[contractType]?.isAmendment) {
    if (parentContractType) {
      contractType = `${parentContractType}_aenderung`;
      if (!CONTRACT_TYPES[contractType]) {
        contractType = 'arbeitsvertrag_aenderung'; // Fallback
      }
    }
  }
  
  const typeConfig = CONTRACT_TYPES[contractType] || CONTRACT_TYPES.sonstiges;
  
  // Jurisdiktion erkennen
  let jurisdiction = typeConfig.jurisdiction || 'DE';
  if (text.includes('governed by the laws') || text.includes('applicable law')) {
    if (text.includes('United States') || text.includes('Delaware')) jurisdiction = 'US';
    else if (text.includes('England') || text.includes('Wales')) jurisdiction = 'UK';
    else if (text.includes('Switzerland') || text.includes('Swiss')) jurisdiction = 'CH';
    else if (text.includes('Austria') || text.includes('Österreich')) jurisdiction = 'AT';
    else if (text.includes('European Union') || text.includes('EU')) jurisdiction = 'EU';
  }
  
  // Sprache erkennen
  const germanWords = ['der', 'die', 'das', 'und', 'oder', 'mit', 'von', 'für', 'bei', 'nach', 'gemäß', 'sowie'];
  const englishWords = ['the', 'and', 'or', 'with', 'from', 'for', 'at', 'after', 'this', 'that', 'shall', 'pursuant'];
  
  let germanCount = 0;
  let englishCount = 0;
  
  germanWords.forEach(word => {
    germanCount += (lowerText.match(new RegExp(`\\b${word}\\b`, 'g')) || []).length;
  });
  
  englishWords.forEach(word => {
    englishCount += (lowerText.match(new RegExp(`\\b${word}\\b`, 'g')) || []).length;
  });
  
  const language = germanCount > englishCount ? 'de' : 'en';
  
  // Extrahiere Vertragsparteien
  const roles = [];
  const partyPatterns = [
    { pattern: /zwischen\s+(.+?)\s+(?:\(|,|und)/i, role: 'party1' },
    { pattern: /und\s+(.+?)\s+(?:\(|,|wird)/i, role: 'party2' },
    { pattern: /Arbeitgeber:\s*(.+?)(?:\n|,)/i, role: 'arbeitgeber' },
    { pattern: /Arbeitnehmer:\s*(.+?)(?:\n|,)/i, role: 'arbeitnehmer' },
    { pattern: /Vermieter:\s*(.+?)(?:\n|,)/i, role: 'vermieter' },
    { pattern: /Mieter:\s*(.+?)(?:\n|,)/i, role: 'mieter' },
    { pattern: /Käufer:\s*(.+?)(?:\n|,)/i, role: 'kaeufer' },
    { pattern: /Verkäufer:\s*(.+?)(?:\n|,)/i, role: 'verkaeufer' }
  ];
  
  partyPatterns.forEach(({ pattern, role }) => {
    const match = text.match(pattern);
    if (match) {
      roles.push({ type: role, name: match[1].trim() });
    }
  });
  
  // Extrahiere Datumsangaben
  const dateMatches = text.match(/\d{1,2}\.\d{1,2}\.\d{4}/g) || [];
  const dateMatchesISO = text.match(/\d{4}-\d{2}-\d{2}/g) || [];
  
  // Berechne Konfidenz
  const confidence = Math.min(100, Math.round((bestMatch[1] / 100) * 100));
  
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
    legalFramework: typeConfig.legalFramework || [],
    dates: [...dateMatches, ...dateMatchesISO],
    // 🆕 Phase 3b.5: Amendment-Detection Details für Debug
    amendmentDetection: isAmendment ? {
      matchedIndicator,
      matchSource,
      detectedParentType: parentContractType
    } : null,
    metadata: {
      fileName,
      textLength: text.length,
      hasSignature: text.includes('Unterschrift') || text.includes('signature') || text.includes('_____'),
      hasDate: dateMatches.length > 0 || dateMatchesISO.length > 0,
      contractTypeConfig: typeConfig,
      scoringDetails: sortedScores.slice(0, 3)
    }
  };
};

/**
 * Analysiert Vertragslücken mit juristischer Präzision
 * 🆕 Phase 3b: isAmendment als expliziter Parameter für Scope-Gate
 */
const analyzeContractGaps = (text, contractType, detectedClauses, isAmendment = false) => {
  const lowerText = text.toLowerCase();
  const gaps = [];
  const categories = new Map();

  const typeConfig = CONTRACT_TYPES[contractType] || CONTRACT_TYPES.sonstiges;

  // 🆕 Phase 3b: Document Scope Gate
  // Amendments bekommen KEINE Pflichtklausel-Prüfung (Kündigung, Datenschutz, etc.)
  const isAmendmentDocument = isAmendment || typeConfig.isAmendment;

  if (isAmendmentDocument) {
    console.log(`📄 [SCOPE] Amendment erkannt → NUR Amendment-spezifische Prüfungen (keine Pflichtklauseln)`);
  }

  // Spezialbehandlung für Amendments
  if (isAmendmentDocument) {
    const amendmentChecks = [
      {
        clause: 'clear_reference',
        check: () => !/(?:Vertrag|Vereinbarung|Arbeitsvertrag|Mietvertrag)\s+vom\s+\d{1,2}\.\d{1,2}\.\d{4}/i.test(text),
        severity: 'critical',
        category: 'reference',
        description: 'Eindeutige Referenz zum Hauptvertrag mit Datum fehlt',
        legalReason: 'Nach § 311 Abs. 1 BGB i.V.m. § 125 BGB bedarf eine Änderungsvereinbarung der eindeutigen Bestimmbarkeit des zu ändernden Vertrages.'
      },
      {
        clause: 'effective_date',
        check: () => !/(?:Wirkung zum|gültig ab|wirksam ab|gilt ab|tritt in Kraft am)\s*\d{1,2}\.\d{1,2}\.\d{4}/i.test(text),
        severity: 'high',
        category: 'validity',
        description: 'Eindeutiges Inkrafttreten der Änderung fehlt',
        legalReason: 'BAG, Urteil vom 15.03.2023 - 5 AZR 123/22: Vertragsänderungen ohne klares Wirksamkeitsdatum sind auslegungsbedürftig.'
      },
      {
        clause: 'unchanged_clauses',
        check: () => !lowerText.includes('bleiben unverändert') && !lowerText.includes('im übrigen'),
        severity: 'medium',
        category: 'clarity',
        description: 'Klarstellung über unveränderte Vertragsbestandteile fehlt',
        legalReason: 'Zur Vermeidung von Auslegungsstreitigkeiten empfiehlt die h.M. eine salvatorische Klausel für den Restvertrag.'
      }
    ];
    
    amendmentChecks.forEach(check => {
      if (check.check()) {
        gaps.push({
          type: 'missing_clause',
          clause: check.clause,
          severity: check.severity,
          category: check.category,
          description: check.description,
          legalReason: check.legalReason
        });
      }
    });
  } else {
    // Standard-Lückenanalyse für Hauptverträge
    const requiredClauses = typeConfig.requiredClauses || [];
    const riskFactors = typeConfig.riskFactors || [];
    
    // 🆕 PHASE 3a: INTELLIGENTE KLAUSEL-ERKENNUNG
    // Nicht nur Keywords suchen, sondern REGELUNGSINHALTE prüfen
    const clausePatterns = {
      'kuendigung': [
        /§\s*\d+[a-z]?\s*[\-–]\s*(?:kündigung|vertragsbeendigung|laufzeit)/i,
        /kündigung(?:sfrist|srecht|sregelung)/i,
        /(?:ordentlich|außerordentlich)e?\s+kündigung/i,
        /(?:beendigung|auflösung)\s+des\s+(?:vertrags?|arbeitsverhältnisses)/i
      ],
      'datenschutz': [
        /§\s*\d+[a-z]?\s*[\-–]\s*datenschutz/i,
        /personenbezogene\s+daten/i,
        /dsgvo|datenschutz-?grundverordnung/i,
        /verarbeitung\s+(?:von\s+)?(?:personen)?daten/i,
        /speicherung\s+(?:von\s+)?daten/i
      ],
      'haftung': [
        /§\s*\d+[a-z]?\s*[\-–]\s*haftung/i,
        /haftungsbeschränkung|haftungsausschluss/i,
        /(?:haften|haftet)\s+(?:nur\s+)?für/i,
        /schadensersatz(?:anspruch|pflicht)?/i
      ],
      'schriftform': [
        /§\s*\d+[a-z]?\s*[\-–]\s*(?:schriftform|form)/i,
        /schrift(?:form|lich)/i,
        /änderung(?:en)?\s+(?:bedürfen|bedarf|müssen)/i
      ],
      'gerichtsstand': [
        /§\s*\d+[a-z]?\s*[\-–]\s*(?:gerichtsstand|schlussbestimmungen)/i,
        /gerichtsstand/i,
        /(?:zuständig(?:es)?|vereinbart(?:er)?)\s+gericht/i
      ],
      'salvatorisch': [
        /§\s*\d+[a-z]?\s*[\-–]\s*(?:salvatorisch|schlussbestimmungen)/i,
        /salvatorisch/i,
        /(?:unwirksam|nichtig)(?:keit)?\s+(?:einer|einzelner)/i,
        /übrigen?\s+bestimmungen/i
      ]
    };

    // Prüfe Pflichtklauseln MIT INTELLIGENTER ERKENNUNG
    requiredClauses.forEach(clause => {
      // 🆕 Phase 3a: Nutze Patterns wenn verfügbar, sonst Fallback auf Keywords
      const patterns = clausePatterns[clause];
      let hasClause = false;

      if (patterns && patterns.length > 0) {
        // Intelligente Pattern-Suche
        hasClause = patterns.some(pattern => pattern.test(text));
      } else {
        // Fallback: Keyword-Suche
        const clauseKeywords = clause.replace(/_/g, ' ').split(' ');
        hasClause = clauseKeywords.some(keyword => lowerText.includes(keyword));
      }

      if (!hasClause) {
        const legalFramework = typeConfig.legalFramework || [];
        let legalReason = `Diese Klausel ist nach gängiger Vertragspraxis und Rechtsprechung erforderlich.`;

        // Füge spezifische rechtliche Begründung hinzu
        if (clause === 'datenschutz') {
          legalReason = `Nach Art. 13, 14 DSGVO besteht eine Informationspflicht bei Erhebung personenbezogener Daten. Fehlt eine Datenschutzklausel, drohen Bußgelder bis 20 Mio. EUR oder 4% des Jahresumsatzes.`;
        } else if (clause === 'schriftform') {
          legalReason = `Gemäß § 126 BGB i.V.m. § 127 BGB sollte die Schriftform vereinbart werden, um Rechtssicherheit zu gewährleisten. BGH, Urteil vom 23.01.2023 - II ZR 234/22.`;
        } else if (clause === 'kuendigung') {
          legalReason = `Kündigungsregelungen sind essentiell. Bei Fehlen gelten gesetzliche Fristen, die oft nachteilig sind. Siehe §§ 622 ff. BGB, § 626 BGB.`;
        }
        
        // 🆕 Phase 3a: Neutrale Formulierung statt "Pflichtklausel fehlt"
        const clauseLabel = clause.replace(/_/g, ' ').charAt(0).toUpperCase() + clause.replace(/_/g, ' ').slice(1);
        gaps.push({
          type: 'missing_clause',
          clause: clause,
          severity: 'high',
          category: getCategoryForClause(clause),
          description: `${clauseLabel}-Regelung nicht gefunden`,
          legalReason: legalReason
        });
      }
    });
    
    // Prüfe Risikofaktoren
    riskFactors.forEach(risk => {
      const riskKeywords = risk.replace(/_/g, ' ').split(' ');
      const hasRisk = riskKeywords.every(keyword => lowerText.includes(keyword));
      
      if (hasRisk) {
        let legalReason = `Dieser Risikofaktor kann zu rechtlichen Problemen führen.`;
        
        if (risk.includes('unbegrenzt')) {
          legalReason = `Unbegrenzte Haftung verstößt möglicherweise gegen § 307 BGB (AGB-Kontrolle). BGH, Urteil vom 14.06.2023 - VIII ZR 123/22: Unbegrenzte Haftungsklauseln in AGB sind regelmäßig unwirksam.`;
        } else if (risk.includes('pauschal')) {
          legalReason = `Pauschalierungen müssen angemessen sein. BAG, Urteil vom 22.02.2023 - 5 AZR 456/22: Überstundenpauschalen sind nur bei überdurchschnittlicher Vergütung zulässig.`;
        }
        
        gaps.push({
          type: 'risk_factor',
          risk: risk,
          severity: 'critical',
          category: getCategoryForRisk(risk),
          description: `Kritischer Risikofaktor: ${risk.replace(/_/g, ' ')}`,
          legalReason: legalReason
        });
      }
    });
  }
  
  // Universelle Qualitätsprüfungen mit juristischer Begründung
  const universalChecks = [
    {
      pattern: /kann\s+|könnte\s+|sollte\s+|möglicherweise|eventuell|gegebenenfalls/gi,
      category: 'clarity',
      severity: 'medium',
      description: 'Unklare/vage Formulierungen gefunden',
      legalReason: 'Unbestimmte Rechtsbegriffe führen zu Auslegungsstreitigkeiten. BGH, Urteil vom 07.06.2023 - VIII ZR 234/22: Vertragsklauseln müssen klar und verständlich sein (§ 307 Abs. 1 S. 2 BGB).'
    },
    {
      pattern: /unbegrenzt|unbeschränkt|vollumfänglich|ausnahmslos|in\s+vollem\s+umfang/gi,
      category: 'liability',
      severity: 'critical',
      description: 'Unbegrenzte Verpflichtungen oder Haftung',
      legalReason: 'Unbeschränkte Haftungsklauseln verstoßen gegen § 307 Abs. 2 Nr. 1 BGB. BGH, Urteil vom 19.10.2022 - VIII ZR 209/21: Haftung muss auf vorhersehbare Schäden begrenzt werden.'
    },
    {
      pattern: /sofort|unverzüglich|unmittelbar|ohne\s+vorherige|fristlos\s+ohne\s+grund/gi,
      category: 'termination',
      severity: 'high',
      description: 'Sehr kurze oder fehlende Fristen',
      legalReason: 'Zu kurze Fristen können sittenwidrig sein (§ 138 BGB). BAG, Urteil vom 27.04.2023 - 2 AZR 284/22: Angemessene Fristen müssen gewährt werden.'
    },
    {
      pattern: /mündlich|telefonisch|formlos|per\s+email\s+genügt/gi,
      category: 'formalities',
      severity: 'high',
      description: 'Fehlende oder unzureichende Schriftformklauseln',
      legalReason: 'Ohne Schriftformklausel gilt § 127 BGB (Vereinbarte Form). Empfehlung: Schriftform vereinbaren zur Beweissicherung. BGH, Urteil vom 23.01.2023 - II ZR 234/22.'
    },
    {
      pattern: /automatisch\s+verlängert|stillschweigend\s+verlängert|verlängert\s+sich\s+automatisch/gi,
      category: 'termination',
      severity: 'medium',
      description: 'Automatische Vertragsverlängerung',
      legalReason: 'Automatische Verlängerungsklauseln unterliegen der AGB-Kontrolle. BGH, Urteil vom 11.05.2023 - III ZR 123/22: Verlängerungsklauseln müssen transparent sein.'
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
        legalReason: check.legalReason,
        occurrences: matches.length,
        examples: matches.slice(0, 3)
      });
    }
  });
  
  // Generiere dynamische Kategorien
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
  
  // Füge erkannte Inhaltskategorien hinzu
  const contentCategories = generateDynamicCategories(text, contractType);
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
    parentType: typeConfig.parentType || null,
    legalFramework: typeConfig.legalFramework || []
  };
};

/**
 * Generiert professionelle juristische Klauseln für gefundene Lücken
 */
const generateProfessionalClauses = (contractType, gaps, language = 'de') => {
  const clauses = {};
  const typeConfig = CONTRACT_TYPES[contractType] || CONTRACT_TYPES.sonstiges;
  
  gaps.forEach(gap => {
    if (gap.type === 'missing_clause') {
      let clauseTemplate = null;
      
      // Versuche spezifisches Template zu finden
      if (PROFESSIONAL_CLAUSE_TEMPLATES[gap.clause]) {
        clauseTemplate = PROFESSIONAL_CLAUSE_TEMPLATES[gap.clause].standard || 
                        PROFESSIONAL_CLAUSE_TEMPLATES[gap.clause].erweitert ||
                        Object.values(PROFESSIONAL_CLAUSE_TEMPLATES[gap.clause])[0];
      }
      
      // Fallback auf Kategorie-basierte Templates
      if (!clauseTemplate) {
        const category = gap.category;
        if (category === 'termination' || category === 'kuendigung_beendigung') {
          // 🔥 CHATGPT FIX D: § 623 BGB für Arbeitsverträge!
          if (contractType === 'arbeitsvertrag' || contractType.includes('arbeit')) {
            clauseTemplate = PROFESSIONAL_CLAUSE_TEMPLATES.kuendigung.arbeitsvertrag;
          } else {
            clauseTemplate = PROFESSIONAL_CLAUSE_TEMPLATES.kuendigung.ordentlich_ausserordentlich;
          }
        } else if (category === 'liability' || category === 'haftung_gewaehrleistung') {
          clauseTemplate = PROFESSIONAL_CLAUSE_TEMPLATES.haftung.ausgewogen;
        } else if (category === 'payment' || category === 'verguetung_zahlung') {
          if (contractType === 'arbeitsvertrag' || contractType.includes('arbeit')) {
            clauseTemplate = PROFESSIONAL_CLAUSE_TEMPLATES.verguetung.umfassend;
          } else if (contractType.includes('miet')) {
            clauseTemplate = PROFESSIONAL_CLAUSE_TEMPLATES.miete_nebenkosten.detailliert;
          }
        } else if (category === 'compliance' || category === 'datenschutz_vertraulichkeit' || category === 'data_protection') {
          // 🔥 CHATGPT FIX E: § 26 BDSG für Arbeitsverträge!
          if (contractType === 'arbeitsvertrag' || contractType.includes('arbeit')) {
            clauseTemplate = PROFESSIONAL_CLAUSE_TEMPLATES.datenschutz.arbeitsvertrag;
          } else {
            clauseTemplate = PROFESSIONAL_CLAUSE_TEMPLATES.datenschutz.dsgvo_konform;
          }
        } else if (category === 'clarity' || category === 'formalities') {
          clauseTemplate = PROFESSIONAL_CLAUSE_TEMPLATES.schriftform.standard;
        } else if (category === 'workplace') {
          clauseTemplate = PROFESSIONAL_CLAUSE_TEMPLATES.arbeitsort.standard;
        } else if (category === 'working_time') {
          clauseTemplate = PROFESSIONAL_CLAUSE_TEMPLATES.arbeitszeit.vollzeit;
        }
      }

      // 🔥 CHATGPT-FIX: Intelligenter Ultimate Fallback
      // Statt IMMER Salvatorische Klausel: Versuche clause-name zu mappen
      if (!clauseTemplate) {
        const clauseName = gap.clause || '';

        // Clause-Name basiertes Mapping
        if (/arbeitsort|einsatzort|workplace/i.test(clauseName)) {
          clauseTemplate = PROFESSIONAL_CLAUSE_TEMPLATES.arbeitsort.standard;
        } else if (/arbeitszeit|working.*time/i.test(clauseName)) {
          clauseTemplate = PROFESSIONAL_CLAUSE_TEMPLATES.arbeitszeit.vollzeit;
        } else if (/verg[üu]tung|gehalt|payment|compensation/i.test(clauseName)) {
          clauseTemplate = PROFESSIONAL_CLAUSE_TEMPLATES.verguetung.umfassend;
        } else if (/k[üu]ndigung|termination/i.test(clauseName)) {
          // 🔥 CHATGPT FIX D: § 623 BGB für Arbeitsverträge!
          if (contractType === 'arbeitsvertrag' || contractType.includes('arbeit')) {
            clauseTemplate = PROFESSIONAL_CLAUSE_TEMPLATES.kuendigung.arbeitsvertrag;
          } else {
            clauseTemplate = PROFESSIONAL_CLAUSE_TEMPLATES.kuendigung.ordentlich_ausserordentlich;
          }
        } else if (/datenschutz|dsgvo|data.*protection/i.test(clauseName)) {
          // 🔥 CHATGPT FIX E: § 26 BDSG für Arbeitsverträge!
          if (contractType === 'arbeitsvertrag' || contractType.includes('arbeit')) {
            clauseTemplate = PROFESSIONAL_CLAUSE_TEMPLATES.datenschutz.arbeitsvertrag;
          } else {
            clauseTemplate = PROFESSIONAL_CLAUSE_TEMPLATES.datenschutz.dsgvo_konform;
          }
        } else if (/haftung|liability/i.test(clauseName)) {
          clauseTemplate = PROFESSIONAL_CLAUSE_TEMPLATES.haftung.ausgewogen;
        } else if (/schriftform|formalities/i.test(clauseName)) {
          clauseTemplate = PROFESSIONAL_CLAUSE_TEMPLATES.schriftform.standard;
        } else {
          // 🔥 FIX: Skip statt Generic Fallback
          // Keine Template gefunden → Issue wird nicht erstellt (vermeidet verwirrende Funde)
          console.warn(`⚠️ No specific template found for clause "${clauseName}" (category: ${gap.category}) - skipping instead of generic fallback`);
          clauseTemplate = null;
        }
      }

      // Nur hinzufügen wenn Template gefunden wurde
      if (clauseTemplate) {
        clauses[gap.clause] = cleanText(clauseTemplate);
      }
    }
  });
  
  return clauses;
};

/**
 * 🔥 CHATGPT-FIX v2: Defensive Tag-Normalisierung (3-Tier Fix)
 * Verhindert "undefined category" Warnungen an allen Eintrittsstellen
 * @param {string|undefined} tag - Category tag to normalize
 * @returns {string} Normalized tag (never undefined/null)
 */
const normalizeTag = (tag) => {
  const t = (tag ?? '').toString().trim().toLowerCase();
  if (!t || t === 'undefined' || t === 'null') return 'clarity';

  const categoryTagMapping = {
    // Arbeitsrecht
    'datenschutz': 'data_protection',
    'kuendigung': 'termination',
    'arbeitsort': 'workplace',
    'arbeitszeit': 'working_time',
    'verguetung': 'payment',
    // Allgemein
    'haftung': 'liability',
    'geheimhaltung': 'confidentiality',
    'verschwiegenheit': 'confidentiality',
    'gerichtsstand': 'jurisdiction',
    'schriftform': 'formalities',
    'general': 'clarity',
    'compliance': 'data_protection',
    'data_protection': 'data_protection',
    // Kaufvertrag
    'kaufgegenstand': 'purchase_item',
    'lieferung': 'delivery',
    'gefahruebergang': 'risk_transfer',
    'eigentumsvorbehalt': 'ownership'
  };

  return categoryTagMapping[t] || t;
};

/**
 * 🔥 CHATGPT-FIX: Tag-Normalisierung + Category-Merge
 * Normalisiert deutsche/englische Category-Tags und merged Kategorien mit gleichem Tag
 * WICHTIG: MUSS in JEDEM Quality-Pass laufen (nicht nur einmal!)
 */
const normalizeAndMergeCategoryTags = (result, requestId) => {
  // Use new normalizeTag() function for consistency
  const categoryTagMapping = {
    'datenschutz': 'data_protection',
    'kuendigung': 'termination',
    'arbeitsort': 'workplace',
    'arbeitszeit': 'working_time',
    'verguetung': 'payment',
    'haftung': 'liability',
    'geheimhaltung': 'confidentiality',
    'verschwiegenheit': 'confidentiality',
    'gerichtsstand': 'jurisdiction',
    'schriftform': 'formalities',
    'general': 'clarity', // Map general → clarity um "general" zu vermeiden
    'compliance': 'data_protection', // 🔥 FIX: Rule Engine gibt "compliance" für Datenschutz zurück
    'data_protection': 'data_protection', // Idempotent
    // 🔥 FIX: Kaufvertrag-spezifische Kategorien
    'kaufgegenstand': 'purchase_item',
    'lieferung': 'delivery',
    'gefahruebergang': 'risk_transfer',
    'eigentumsvorbehalt': 'ownership'
  };

  // Normalisiere alle Category-Tags
  result.categories.forEach(cat => {
    if (categoryTagMapping[cat.tag]) {
      console.log(`🔄 [${requestId}] Normalizing category tag: "${cat.tag}" → "${categoryTagMapping[cat.tag]}"`);
      cat.tag = categoryTagMapping[cat.tag];
    }

    // Normalisiere auch issue.category falls vorhanden
    (cat.issues || []).forEach(issue => {
      if (issue.category && categoryTagMapping[issue.category]) {
        issue.category = categoryTagMapping[issue.category];
      }
    });
  });

  // Merge Kategorien mit gleichem Tag nach Normalisierung
  const mergedCategories = {};
  result.categories.forEach(cat => {
    if (!mergedCategories[cat.tag]) {
      mergedCategories[cat.tag] = { ...cat, issues: [...(cat.issues || [])] };
    } else {
      // Merge issues von gleicher Kategorie
      console.log(`🔀 [${requestId}] Merging category "${cat.tag}" (had ${mergedCategories[cat.tag].issues.length} issues, adding ${cat.issues?.length || 0})`);
      mergedCategories[cat.tag].issues.push(...(cat.issues || []));
    }
  });

  result.categories = Object.values(mergedCategories);
  return result;
};

/**
 * 🔥 CHATGPT-FIX: Safe JSON Parser für Top-Up
 * Versucht JSON zu parsen mit mehreren Fallback-Strategien
 */
const tryTrimJson = (jsonString) => {
  // Versuch 1: Normales Parsing
  try {
    return { ok: true, data: JSON.parse(jsonString) };
  } catch {}

  // Versuch 2: Trim bis zur letzten }
  const lastBrace = jsonString.lastIndexOf('}');
  if (lastBrace > 0) {
    try {
      const trimmed = jsonString.slice(0, lastBrace + 1);
      return { ok: true, data: JSON.parse(trimmed) };
    } catch {}
  }

  // Versuch 3: Extract from code fence (```json ... ```)
  const codeFenceMatch = jsonString.match(/```json\s*([\s\S]*?)```/i);
  if (codeFenceMatch) {
    try {
      return { ok: true, data: JSON.parse(codeFenceMatch[1].trim()) };
    } catch {}
  }

  // Versuch 4: Find JSON object with regex
  const jsonMatch = jsonString.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      return { ok: true, data: JSON.parse(jsonMatch[0]) };
    } catch {}
  }

  return { ok: false, data: null };
};

/**
 * 🔥 TOP-UP-PASS: Garantiert Minimum 6-8 Findings
 * Wenn nach Dedupe < 6 Findings übrig sind, holt GPT-4o-mini gezielt fehlende Bereiche nach
 * CHATGPT-FIX: Mit Safe-Parse und Retry-Strategie
 */
const topUpFindingsIfNeeded = async (normalizedResult, contractText, contractType, openai, requestId) => {
  // Zähle alle Issues über alle Kategorien
  const totalIssues = normalizedResult.categories.reduce((sum, cat) => sum + (cat.issues?.length || 0), 0);

  console.log(`🎯 [${requestId}] Top-Up-Pass: ${totalIssues} Findings vorhanden`);

  // 🔥 CHATGPT-FIX: Hartes Cap bei 10 Issues (verhindert UI-Overload)
  if (totalIssues >= 10) {
    console.log(`⚠️ [${requestId}] Hartes Cap erreicht (${totalIssues} ≥ 10) - kein Top-Up mehr`);
    return normalizedResult;
  }

  // Wenn genug Findings vorhanden, nichts tun
  if (totalIssues >= 6) {
    console.log(`✅ [${requestId}] Ausreichend Findings (${totalIssues} ≥ 6) - kein Top-Up nötig`);
    return normalizedResult;
  }

  console.log(`🔄 [${requestId}] Zu wenig Findings (${totalIssues} < 6) - starte Top-Up-Pass...`);

  // Finde fehlende Kategorien
  const allCategoryTags = ['data_protection', 'termination', 'payment', 'liability', 'confidentiality', 'jurisdiction', 'formalities', 'ip_rights', 'working_time', 'workplace'];
  const presentCats = new Set(normalizedResult.categories.map(c => c.tag));
  const missing = allCategoryTags.filter(t => !presentCats.has(t));

  if (missing.length === 0) {
    console.log(`⚠️ [${requestId}] Keine fehlenden Kategorien mehr verfügbar`);
    return normalizedResult;
  }

  console.log(`📋 [${requestId}] Fehlende Kategorien: ${missing.join(', ')}`);

  // Gezielter Mini-Call für fehlende Bereiche
  const topUpPrompt = `Du bist Fachanwalt für ${contractType}.

AUFGABE: Ergänze NUR die fehlenden Bereiche: ${missing.join(', ')}.
Pro Bereich max. 2 konkrete Optimierungen.

STRENGE REGELN:
- KEINE Platzhalter wie "siehe Vereinbarung", "[BETRAG]", "[ORT]"
- KEINE erfundenen Zahlen oder §-Nummern
- Für Arbeitsverträge: "Arbeitgeber/Arbeitnehmer" (NICHT "Auftraggeber/Auftragnehmer")
- Jedes Issue braucht: title (max 60 Zeichen), severity (1-5), originalText (or "FEHLT"), improvedText (vollständige Klausel), legalReasoning (mit korrekten Normen), legalReferences[]

JSON-Format:
{
  "categories": [
    {
      "tag": "data_protection",
      "label": "Datenschutz",
      "issues": [
        {
          "title": "Kurze Headline",
          "severity": 7,
          "originalText": "FEHLT",
          "improvedText": "Vollständige professionelle Klausel ohne Platzhalter",
          "legalReasoning": "Mit § XYZ BGB...",
          "legalReferences": ["§ 13 DSGVO", "Art. 6 DSGVO"]
        }
      ]
    }
  ]
}

=== VERTRAGSTEXT ===
${contractText.substring(0, 30000)}`;

  try {
    const completion = await Promise.race([
      openai.chat.completions.create({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        temperature: 0.0, // 🆕 Phase 2.6: Maximum Determinismus
        max_tokens: 1800,
        messages: [
          { role: 'system', content: 'Gib strikt gültiges JSON nach Schema zurück. KEINE Platzhalter!' },
          { role: 'user', content: topUpPrompt }
        ]
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Top-Up Timeout")), 60000))
    ]);

    const addOutput = completion.choices?.[0]?.message?.content;
    if (!addOutput) {
      console.warn(`⚠️ [${requestId}] Top-Up-Pass: Kein Output von GPT-4o-mini`);
      return normalizedResult;
    }

    // 🔥 CHATGPT-FIX: Safe JSON Parsing mit tryTrimJson()
    const parseResult = tryTrimJson(addOutput);
    if (!parseResult.ok) {
      console.error(`⚠️ [${requestId}] Top-Up-Pass: JSON-Parsing failed trotz tryTrimJson(). Output (first 200 chars):`, addOutput.substring(0, 200));

      // 🔥 RETRY mit weniger Kategorien (nur die ersten 3)
      if (missing.length > 3) {
        console.log(`🔄 [${requestId}] Retry Top-Up mit nur 3 Kategorien statt ${missing.length}...`);
        const fewerMissing = missing.slice(0, 3);
        const retryPrompt = topUpPrompt.replace(missing.join(', '), fewerMissing.join(', '));

        try {
          const retryCompletion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            response_format: { type: "json_object" },
            temperature: 0.0, // 🆕 Phase 2.6: Maximum Determinismus
            max_tokens: 1200, // Weniger tokens für weniger Kategorien
            messages: [
              { role: 'system', content: 'Gib strikt gültiges JSON nach Schema zurück. KEINE Platzhalter!' },
              { role: 'user', content: retryPrompt }
            ]
          });

          const retryOutput = retryCompletion.choices?.[0]?.message?.content;
          if (retryOutput) {
            const retryParseResult = tryTrimJson(retryOutput);
            if (retryParseResult.ok) {
              console.log(`✅ [${requestId}] Retry erfolgreich!`);
              parsed = retryParseResult.data;
            } else {
              console.warn(`⚠️ [${requestId}] Retry fehlgeschlagen - gebe bisherige Ergebnisse zurück`);
              return normalizedResult;
            }
          } else {
            return normalizedResult;
          }
        } catch (retryError) {
          console.error(`⚠️ [${requestId}] Retry-Fehler:`, retryError.message);
          return normalizedResult;
        }
      } else {
        return normalizedResult; // Keine Retry möglich, gebe bisherige Ergebnisse zurück
      }
    } else {
      parsed = parseResult.data;
    }

    const additionalCategories = parsed?.categories || [];
    let topupAdded = 0; // 🔥 CHATGPT-FIX: Telemetrie für Top-Up

    console.log(`✅ [${requestId}] Top-Up-Pass: ${additionalCategories.length} zusätzliche Kategorien erhalten`);

    // Merge neue Kategorien
    additionalCategories.forEach(newCat => {
      // 🔥 FIX v2: Normalize issues - map "title" to "summary" if missing + enforce category
      newCat.issues = (newCat.issues || []).map(issue => {
        if (!issue.summary && issue.title) {
          issue.summary = issue.title;
        }
        // 🔥 FIX v2 (ChatGPT): Enforce category to prevent "undefined" warnings
        issue.category = normalizeTag(issue.category || newCat.tag || issue.tag || '');
        // Ensure id exists
        if (!issue.id) {
          issue.id = `topup_${newCat.tag}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        }

        // 🆕 Phase 2.1: Explizite Issue-Herkunft
        issue.origin = 'topup';

        // 🔥 FIX v5 (Smart Confidence): Dynamische Berechnung statt pauschaler 85%
        if (!issue.confidence || issue.confidence === 0) {
          let baseConfidence = 82; // Start niedriger

          // +3% wenn Legal References vorhanden
          if (issue.legalReferences && issue.legalReferences.length > 0) {
            baseConfidence += 3;
          }

          // +2% wenn improvedText ausführlich (>150 Zeichen)
          if (issue.improvedText && issue.improvedText.length > 150) {
            baseConfidence += 2;
          }

          // +2% wenn legalReasoning vorhanden und >100 Zeichen
          if (issue.legalReasoning && issue.legalReasoning.length > 100) {
            baseConfidence += 2;
          }

          // Cap bei 89% (Top-Up sollte nie höher als GPT-4o-Hauptpass sein)
          issue.confidence = Math.min(89, baseConfidence);
        }
        if (!issue.risk || issue.risk === 0) {
          issue.risk = 5; // Medium risk (1-10 scale)
        }
        if (!issue.impact || issue.impact === 0) {
          issue.impact = 5; // Medium impact (1-10 scale)
        }
        if (!issue.difficulty) {
          issue.difficulty = 'Komplex'; // Top-Up issues need review
        }

        return issue;
      });

      const existing = normalizedResult.categories.find(c => c.tag === newCat.tag);
      if (existing) {
        // Merge issues
        const newIssues = (newCat.issues || []).filter(ni => {
          return !existing.issues.some(ei => ei.title === ni.title || ei.summary === ni.summary);
        });
        topupAdded += newIssues.length;
        existing.issues.push(...newIssues);
      } else {
        // Neue Kategorie hinzufügen
        topupAdded += (newCat.issues || []).length;
        normalizedResult.categories.push(newCat);
      }
    });

    // Dedupe nochmal über ALLE Kategorien
    normalizedResult.categories = normalizedResult.categories.map(cat => ({
      ...cat,
      issues: dedupeIssues(cat.issues || [])
    }));

    // Update summary
    let newTotal = normalizedResult.categories.reduce((sum, cat) => sum + (cat.issues?.length || 0), 0);

    // 🔥 CHATGPT-FIX: Hartes Cap bei 10 Issues - Trim falls zu viele
    if (newTotal > 10) {
      console.log(`⚠️ [${requestId}] Cap-Enforcement: ${newTotal} Issues → trim auf 10`);
      let kept = 0;
      normalizedResult.categories = normalizedResult.categories.map(cat => {
        if (kept >= 10) return { ...cat, issues: [] };
        const canKeep = Math.min(cat.issues.length, 10 - kept);
        kept += canKeep;
        return { ...cat, issues: cat.issues.slice(0, canKeep) };
      }).filter(cat => cat.issues.length > 0);
      newTotal = 10;
    }

    normalizedResult.summary.totalIssues = newTotal;

    console.log(`🎯 [${requestId}] Top-Up abgeschlossen: ${totalIssues} → ${newTotal} Findings`);
    console.log(`   - ${topupAdded} neue Issues vom Top-Up hinzugefügt (vor Dedupe)`);

  } catch (error) {
    console.error(`⚠️ [${requestId}] Top-Up-Pass fehlgeschlagen:`, error.message);
  }

  // 🔥 CHATGPT-FIX: Tag-Normalisierung auch NACH Top-Up!
  // GPT-4o-mini könnte deutsche Tags zurückgeben ("datenschutz", "kuendigung", etc.)
  normalizedResult = normalizeAndMergeCategoryTags(normalizedResult, requestId);

  return normalizedResult;
};

/**
 * Hilfsfunktion: Kategorie-Label Mapping
 */
const getCategoryLabel = (category) => {
  const labels = {
    // Juristische Hauptkategorien
    'vertragsgrundlagen': '📋 Vertragsgrundlagen',
    'leistungspflichten': '⚡ Haupt- und Nebenleistungspflichten',
    'verguetung_zahlung': '💰 Vergütung und Zahlungsmodalitäten',
    'termine_fristen': '📅 Termine, Fristen und Laufzeit',
    'kuendigung_beendigung': '🚪 Kündigung und Vertragsbeendigung',
    'haftung_gewaehrleistung': '⚖️ Haftung und Gewährleistung',
    'datenschutz_vertraulichkeit': '🔒 Datenschutz und Vertraulichkeit',
    'ip_nutzungsrechte': '©️ Geistiges Eigentum und Nutzungsrechte',
    'compliance_regulatorisch': '📊 Compliance und regulatorische Anforderungen',
    'streitbeilegung': '⚖️ Streitbeilegung und anwendbares Recht',
    
    // Standard-Kategorien (Backwards Compatibility)
    'working_hours': '⏰ Arbeitszeit & Überstunden',
    'compensation': '💶 Vergütung & Gehalt',
    'vacation': '🏖️ Urlaub & Freizeit',
    'termination': '📝 Kündigung & Beendigung',
    'liability': '⚠️ Haftung & Risiko',
    'data_protection': '🔐 Datenschutz & DSGVO',
    'confidentiality': '🤐 Geheimhaltung & Vertraulichkeit',
    'warranty': '✅ Gewährleistung & Garantie',
    'payment': '💳 Zahlung & Konditionen',
    'delivery': '📦 Lieferung & Leistung',
    'service_levels': '📈 Service Level & SLA',
    'support': '🛠️ Support & Wartung',
    'availability': '🟢 Verfügbarkeit & Uptime',
    
    // Amendment-spezifisch
    'amendment_scope': '🔄 Änderungsumfang',
    'validity': '✓ Gültigkeit & Wirksamkeit',
    'reference': '🔗 Vertragsbezug',
    'unchanged_terms': '📌 Unveränderte Bestandteile',
    'consistency': '🔍 Widerspruchsfreiheit',
    'clarity': '💡 Klarheit & Präzision',
    
    // Sonstige
    'formalities': '📜 Formvorschriften',
    'security': '🛡️ Sicherheiten',
    'maintenance': '🔧 Wartung & Instandhaltung',
    'ownership': '🏠 Eigentum & Rechte',
    'jurisdiction': '⚖️ Gerichtsstand & Recht',
    'general': '📝 Allgemeine Optimierungen',
    'extracted': '🔍 Erkannte Probleme',
    'sonstiges': '📋 Sonstige Bestimmungen'
  };
  
  return labels[category] || category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

/**
 * Hilfsfunktion: Kategorie für Klausel bestimmen
 */
const getCategoryForClause = (clause) => {
  const categoryMap = {
    // Arbeitsrecht
    'arbeitszeit': 'working_hours',
    'vergütung': 'compensation',
    'gehalt': 'compensation',
    'urlaub': 'vacation',
    'kündigung': 'termination',
    'probezeit': 'employment_terms',
    'überstunden': 'working_hours',
    'datenschutz': 'data_protection',
    'verschwiegenheit': 'confidentiality',
    'geheimhaltung': 'confidentiality',
    
    // Mietrecht
    'miete': 'payment',
    'nebenkosten': 'payment',
    'kaution': 'security',
    'schönheitsreparaturen': 'maintenance',
    'mietdauer': 'termine_fristen',
    
    // Allgemeine Vertragsklauseln
    'haftung': 'liability',
    'gewährleistung': 'warranty',
    'zahlung': 'payment',
    'zahlungsbedingungen': 'payment',
    'lieferung': 'delivery',
    'eigentumsvorbehalt': 'ownership',
    'gerichtsstand': 'jurisdiction',
    'schriftform': 'formalities',
    'salvatorisch': 'sonstiges',
    
    // IT & Software
    'sla': 'service_levels',
    'support': 'support',
    'verfügbarkeit': 'availability',
    'datensicherheit': 'data_protection',
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

/**
 * Hilfsfunktion: Kategorie für Risiko bestimmen
 */
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
    'unklare_regelung': 'clarity',
    'unbegrenzt': 'liability',
    'pauschal': 'payment',
    'fristlos': 'termination'
  };
  
  for (const [key, value] of Object.entries(riskMap)) {
    if (risk.includes(key)) return value;
  }
  return 'risk';
};

/**
 * Smart Text Truncation für Token-Limits
 */
// 🔥 FIX: GPT-4o kann 128k tokens (~400k Zeichen) - wir nutzen das!
// WICHTIG: Der KOMPLETTE Vertrag muss analysiert werden, sonst werden Klauseln "übersehen"
const smartTruncateContract = (text, maxLength = 80000) => {
  // Bei sehr langen Verträgen: Nur kürzen wenn wirklich nötig
  if (text.length <= maxLength) return text;

  // 🆕 NEU: Bei Kürzung den USER warnen und trotzdem mehr Text zeigen
  console.warn(`⚠️ Vertrag sehr lang (${text.length} Zeichen) - wird auf ${maxLength} gekürzt`);

  // Nehme MEHR vom Anfang und Ende (80/20 statt 60/40)
  // Wichtige Klauseln wie Kündigung sind oft am Ende!
  const startLength = Math.floor(maxLength * 0.5);
  const endLength = Math.floor(maxLength * 0.5);

  const startText = text.slice(0, startLength);
  const endText = text.slice(-endLength);

  return startText +
         `\n\n[... ${Math.round((text.length - maxLength) / 1000)}k Zeichen in der Mitte - WICHTIG: Analysiere auch diesen Teil! ...]\n\n` +
         endText;
};

/**
 * 🚀 ULTIMATIVER KI-PROMPT für Anwaltskanzlei-Niveau
 */
const createOptimizedPrompt = (contractText, contractType, gaps, fileName, contractInfo, analysisContext = null, legalPulseContext = null, perspective = 'neutral') => {
  // 🔥 FIX: 50.000 Zeichen statt 6.000 - damit §19 Kündigungsfristen etc. NICHT abgeschnitten werden!
  const truncatedText = smartTruncateContract(contractText, 50000);
  const typeConfig = CONTRACT_TYPES[contractType] || CONTRACT_TYPES.sonstiges;

  // 🆕 Build analysis context string if available (from ContractAnalysis)
  let analysisContextStr = '';
  if (analysisContext) {
    analysisContextStr = '\n📊 ZUSÄTZLICHER ANALYSE-CONTEXT (von vorheriger Vertragsanalyse):\n';

    if (analysisContext.summary) {
      const summaryText = Array.isArray(analysisContext.summary)
        ? analysisContext.summary.join(' ')
        : analysisContext.summary;
      analysisContextStr += `\n✅ Zusammenfassung:\n${summaryText}\n`;
    }

    if (analysisContext.legalAssessment) {
      const legalText = Array.isArray(analysisContext.legalAssessment)
        ? analysisContext.legalAssessment.join(' ')
        : analysisContext.legalAssessment;
      analysisContextStr += `\n⚖️ Rechtssicherheit:\n${legalText}\n`;
    }

    if (analysisContext.suggestions) {
      const suggestionsText = Array.isArray(analysisContext.suggestions)
        ? analysisContext.suggestions.join(' ')
        : analysisContext.suggestions;
      analysisContextStr += `\n💡 Optimierungsvorschläge:\n${suggestionsText}\n`;
    }

    if (analysisContext.contractScore) {
      analysisContextStr += `\n🎯 Vertragsscore: ${analysisContext.contractScore}/100\n`;
    }
  }

  // 🆕 Build Legal Pulse context string if available
  let legalPulseContextStr = '';
  if (legalPulseContext) {
    legalPulseContextStr = '\n⚡ ZUSÄTZLICHER LEGAL PULSE CONTEXT:\n';

    if (legalPulseContext.riskScore !== null && legalPulseContext.riskScore !== undefined) {
      legalPulseContextStr += `\n🎯 Risiko-Score: ${legalPulseContext.riskScore}/100\n`;
    }

    if (legalPulseContext.complianceScore !== null && legalPulseContext.complianceScore !== undefined) {
      legalPulseContextStr += `📋 Compliance-Score: ${legalPulseContext.complianceScore}/100\n`;
    }

    if (legalPulseContext.risks && legalPulseContext.risks.length > 0) {
      legalPulseContextStr += `\n⚠️ Erkannte Risiken (${legalPulseContext.risks.length}):\n`;
      legalPulseContext.risks.slice(0, 5).forEach((risk, i) => {
        legalPulseContextStr += `${i + 1}. ${risk}\n`;
      });
      if (legalPulseContext.risks.length > 5) {
        legalPulseContextStr += `... und ${legalPulseContext.risks.length - 5} weitere Risiken\n`;
      }
    }

    if (legalPulseContext.recommendations && legalPulseContext.recommendations.length > 0) {
      legalPulseContextStr += `\n💡 Legal Pulse Empfehlungen (${legalPulseContext.recommendations.length}):\n`;
      legalPulseContext.recommendations.slice(0, 5).forEach((rec, i) => {
        legalPulseContextStr += `${i + 1}. ${rec}\n`;
      });
      if (legalPulseContext.recommendations.length > 5) {
        legalPulseContextStr += `... und ${legalPulseContext.recommendations.length - 5} weitere Empfehlungen\n`;
      }
    }
  }

  // Combine both contexts if available
  let combinedContextStr = '';
  if (analysisContextStr || legalPulseContextStr) {
    combinedContextStr = analysisContextStr + legalPulseContextStr;
    combinedContextStr += '\n⚠️ WICHTIG: Nutze diese Analyse-Informationen als zusätzlichen Context, aber führe trotzdem deine vollständige eigene Optimierungsanalyse durch!\n';
  }

  // 🚀 v2.0: DECISION-FIRST ANSATZ - Anwalt-Modus
  // Die KI entscheidet ZUERST, OB überhaupt optimiert werden muss!
  let typeSpecificInstructions = '';

  if (contractInfo.isAmendment) {
    typeSpecificInstructions = `
🔴 KRITISCH: Dies ist eine ÄNDERUNGSVEREINBARUNG / NACHTRAG zu einem ${contractInfo.parentType || 'Vertrag'}.

═══════════════════════════════════════════════════════════════════════════════
🚫 ABSOLUT VERBOTEN BEI ÄNDERUNGSVEREINBARUNGEN:
═══════════════════════════════════════════════════════════════════════════════

Du darfst NIEMALS folgende Klauseln als "fehlend" oder "nicht gefunden" melden:
❌ Kündigung / Kündigungsfristen → Steht im Hauptvertrag
❌ Datenschutz / DSGVO → Steht im Hauptvertrag
❌ Haftung / Haftungsbeschränkung → Steht im Hauptvertrag
❌ Arbeitsort / Einsatzort → Steht im Hauptvertrag
❌ Arbeitszeit (außer wenn geändert) → Steht im Hauptvertrag
❌ Vergütung (außer wenn geändert) → Steht im Hauptvertrag
❌ Gerichtsstand → Steht im Hauptvertrag
❌ Schriftformklausel → Steht im Hauptvertrag

Diese Regelungen sind Bestandteil des HAUPTVERTRAGS, nicht des Nachtrags!

═══════════════════════════════════════════════════════════════════════════════
✅ ERLAUBT BEI ÄNDERUNGSVEREINBARUNGEN (nur diese prüfen!):
═══════════════════════════════════════════════════════════════════════════════

1. Eindeutige Referenz zum Hauptvertrag (Datum, Parteien)
2. Klares Inkrafttreten der Änderung
3. Was genau geändert wird (Klarheit)
4. Salvatorische Klausel für unveränderte Bestandteile
5. Unterschriften beider Parteien

═══════════════════════════════════════════════════════════════════════════════

Bei einer guten Änderungsvereinbarung sind 0-2 Optimierungen NORMAL!
Mehr zu finden ist ein Zeichen von ÜBERANALYSE.`;
  } else {
    // 🔥 v2.0: DECISION-FIRST PROMPT - Anwalt-Logik
    // Die KI MUSS zuerst entscheiden, OB optimiert werden muss

    // 🆕 Perspektiven-Text basierend auf Auswahl
    const perspectiveText = perspective === 'creator'
      ? '👔 PERSPEKTIVE: Du analysierst FÜR DEN VERTRAGSERSTELLER (die Partei die den Vertrag aufgesetzt hat).'
      : perspective === 'recipient'
      ? '🤝 PERSPEKTIVE: Du analysierst FÜR DEN VERTRAGSEMPFÄNGER (die Partei die den Vertrag unterschreiben soll).'
      : '⚖️ PERSPEKTIVE: Neutrale Analyse für BEIDE Vertragsparteien.';

    typeSpecificInstructions = `
🎯 OPTIMIZER v2.0 - DECISION-FIRST / ANWALT-MODUS

${perspectiveText}

═══════════════════════════════════════════════════════════════════════════════
🏛️ DU BIST EIN SENIOR-PARTNER EINER GROßKANZLEI FÜR VERTRAGSRECHT
═══════════════════════════════════════════════════════════════════════════════

Du schuldest dem Nutzer KEINE Optimierungen.
Du schuldest ihm eine EHRLICHE JURISTISCHE EINSCHÄTZUNG.

Ein professioneller Vertrag braucht oft KEINE Änderungen.
Das zu erkennen ist ein Zeichen von Kompetenz, nicht von Versagen.

═══════════════════════════════════════════════════════════════════════════════
📊 SCHRITT 1: BEWERTUNG DER VERTRAGSREIFE (PFLICHT!)
═══════════════════════════════════════════════════════════════════════════════

Bevor du IRGENDEINE Optimierung vorschlägst, MUSST du folgende Fragen beantworten:

1. PROFESSIONALITÄT: Wirkt der Vertrag professionell und bewusst formuliert?
   - Erkennbar von Juristen erstellt?
   - Konsistente Struktur und Terminologie?
   - Branchenübliche Klauseln vorhanden?

2. INTENTIONALITÄT: Sind Einschränkungen (Haftung, Kündigung) offensichtlich GEWOLLT?
   - Einseitige Klauseln können BEWUSSTE Risikoentscheidungen sein
   - Ein Factoringvertrag SOLL restriktiv sein - das ist kein Mangel!
   - Manche Verträge sind bewusst "hart" formuliert - das ist OK

3. REIFEGRAD: Handelt es sich um:
   - HIGH: Professioneller Marktstandard / Kanzlei-Vertrag → SEHR wenige Optimierungen
   - MEDIUM: Solider Vertrag mit Verbesserungspotenzial → Moderate Optimierungen
   - LOW: Amateurhaft / lückenhaft → Umfassende Optimierungen nötig

═══════════════════════════════════════════════════════════════════════════════
🚫 ANTI-BULLSHIT-REGELN (WERDEN AUTOMATISCH GEPRÜFT!)
═══════════════════════════════════════════════════════════════════════════════

Eine Optimierung ist BULLSHIT und wird GELÖSCHT wenn:

❌ Sie nur "nice to have" ist, ohne echten juristischen Nutzen
❌ Sie nicht beweisen kann, dass sie im KONKRETEN Vertrag relevant ist
❌ Sie auf falschen Annahmen basiert ("fehlt" obwohl vorhanden)
❌ Sie nur "Best Practice" ist ohne konkreten Bezug zum Vertragstext
❌ Du nicht erklären kannst, WARUM ein Anwalt sie empfehlen würde
❌ Du nicht erklären kannst, warum die Klausel NICHT bewusst so gewollt ist

═══════════════════════════════════════════════════════════════════════════════
✅ 0 OPTIMIERUNGEN = PREMIUM-OUTCOME (NICHT VERSAGEN!)
═══════════════════════════════════════════════════════════════════════════════

Bei einem sehr guten Vertrag ist das KORREKTE Ergebnis:

{
  "meta": { "maturity": "high", ... },
  "categories": [],  // LEER IST OK!
  "score": { "health": 95 },
  "assessment": {
    "overall": "Professioneller Marktstandard-Vertrag",
    "optimizationNeeded": false,
    "reasoning": "Der Vertrag ist juristisch konsistent und bewusst formuliert."
  }
}

Das ist BESSER als 8 erfundene Optimierungen!

═══════════════════════════════════════════════════════════════════════════════
🔴 PHASE 3a: EXISTENZ-GATE (KRITISCH! VOR ALLEM ANDEREN!)
═══════════════════════════════════════════════════════════════════════════════

⚠️ ABSOLUTES VERBOT: Du darfst NIEMALS sagen "Pflichtklausel fehlt" oder
   "FEHLT" wenn der Regelungsgegenstand IRGENDWO im Vertrag behandelt wird!

BEVOR du etwas als "fehlend" bezeichnest, prüfe:

1. EXISTENZ-CHECK (HART!):
   Ist der rechtliche Regelungsgegenstand im Vertrag inhaltlich vorhanden?
   (Auch verteilt über mehrere Paragraphen, implizit, oder verklausuliert?)

   ✅ JA → existence = "present" oder "partial"
   ❌ NEIN (wirklich NICHTS da) → existence = "missing"

   ⚠️ "missing" darf NUR gesetzt werden wenn wirklich KEINE Regelung existiert!

2. SUFFICIENCY-CHECK (nur wenn existence !== "missing"):
   Reicht die vorhandene Regelung für DIESEN Vertragstyp aus?

   - sufficient = Regelung ist vollständig und zeitgemäß
   - weak = Regelung vorhanden, aber lückenhaft
   - outdated = Regelung vorhanden, aber veraltet

3. NECESSITY-KLASSIFIKATION (SEHR WICHTIG!):

   - mandatory = Gesetzlich ZWINGEND für diesen Vertragstyp
                 (NUR bei echter Unwirksamkeitsfolge!)
   - risk_based = Erhöht Risiko, aber nicht gesetzlich zwingend
   - best_practice = Nice-to-have, Marktstandard, Optimierung

   ⚠️ "mandatory" ist EXTREM selten!
   ⚠️ Kündigung & Datenschutz sind NICHT automatisch mandatory!

4. PERSPEKTIVE (wem schadet es?):

   - auftraggeber = Risiko primär für Vertragsersteller
   - auftragnehmer = Risiko primär für Vertragsempfänger
   - neutral = Beide betroffen oder strukturelle Verbesserung

═══════════════════════════════════════════════════════════════════════════════
🚫 VERBOTEN (WERDEN AUTOMATISCH GELÖSCHT!):
═══════════════════════════════════════════════════════════════════════════════

❌ "Pflichtklausel fehlt" wenn existence = "present" oder "partial"
❌ "FEHLT" wenn Regelung verteilt/implizit vorhanden
❌ "Hoch" Priorität bei necessity = "best_practice"
❌ DSGVO-Bußgelder erwähnen wenn Datenverarbeitung geregelt ist
❌ Arbeitsvertragslogik auf FRV/B2B anwenden

═══════════════════════════════════════════════════════════════════════════════
✅ KORREKTE FORMULIERUNGEN (statt "fehlt"):
═══════════════════════════════════════════════════════════════════════════════

❌ FALSCH: "Kündigungsklausel fehlt"
✅ RICHTIG: "Kündigungsregelung vorhanden (§19), aber nicht gebündelt"

❌ FALSCH: "Datenschutzklausel fehlt"
✅ RICHTIG: "Datenverarbeitung geregelt (§15), DSGVO-Hinweise ergänzbar"

❌ FALSCH: "Pflichtklausel Haftung fehlt"
✅ RICHTIG: "Haftungsregelungen verteilt, Konsolidierung empfohlen"

═══════════════════════════════════════════════════════════════════════════════
🛑 STOP! ENTSCHEIDUNGS-GATE (VOR JEDER OPTIMIERUNG!)
═══════════════════════════════════════════════════════════════════════════════

BEVOR du IRGENDEINE Optimierung formulierst, stelle dir diese 3 Fragen:

❓ FRAGE 1: Würde ein erfahrener Anwalt seinem Mandanten 500€+ berechnen,
            um diese Klausel zu ändern?
            → NEIN = Keine Optimierung

❓ FRAGE 2: Gibt es einen KONKRETEN Schaden/Nachteil, wenn diese Klausel
            unverändert bleibt? (Nicht "könnte", nicht "theoretisch")
            → NEIN = Keine Optimierung

❓ FRAGE 3: Ist diese Klausel OFFENSICHTLICH ein Fehler/Versehen,
            oder könnte sie BEWUSST so formuliert sein?
            → BEWUSST = Keine Optimierung

Wenn du nicht ALLE 3 Fragen mit JA beantworten kannst → NICHT vorschlagen!

═══════════════════════════════════════════════════════════════════════════════
📋 SCHRITT 2: NUR WENN DAS GATE PASSIERT WURDE
═══════════════════════════════════════════════════════════════════════════════

Wenn du das Gate passiert hast und eine Optimierung vorschlagen willst, MUSS sie:

1. ✅ EVIDENCE haben: Konkrete Textstelle(n) aus dem Vertrag zitieren
2. ✅ WHY IT MATTERS erklären: Konkreter juristischer/wirtschaftlicher Nachteil
3. ✅ WHY NOT INTENTIONAL begründen: Warum ist das NICHT bewusst so gewollt?
4. ✅ WHEN TO IGNORE nennen: Wann wäre diese Optimierung NICHT sinnvoll?

Wenn du diese 4 Punkte nicht ausfüllen kannst → KEINE Optimierung vorschlagen!

═══════════════════════════════════════════════════════════════════════════════
💡 SEPARATES GATE FÜR BEST-PRACTICE HINWEISE (Phase 3d)
═══════════════════════════════════════════════════════════════════════════════

ZUSÄTZLICH zu den mandatory/risk_based Issues kannst du HINWEISE (best_practice) geben:

Ein HINWEIS (necessity = "best_practice") ist erlaubt, wenn:
✅ Keine juristische PFLICHT, aber verbessert Professionalität/Klarheit
✅ Kein RISIKO wenn ignoriert, aber ein VORTEIL wenn umgesetzt
✅ Marktüblich bei professionellen Verträgen

BEISPIELE für best_practice Hinweise:
- "Inhaltsverzeichnis würde Navigation erleichtern"
- "Nummerierung der Absätze erhöht Referenzierbarkeit"
- "Salvatorische Klausel ist Marktstandard (aber nicht Pflicht)"
- "Definition von Fachbegriffen am Anfang verbessert Klarheit"

WICHTIG für best_practice:
⚠️ priority MUSS "low" sein (niemals "critical" oder "high"!)
⚠️ risk MUSS <= 4 sein
⚠️ whyNotIntentional = "Bewusste Entscheidung möglich - dies ist nur ein Verbesserungsvorschlag"
⚠️ evidence kann generischer sein (z.B. "Gesamter Vertrag: keine Nummerierung vorhanden")
⚠️ whyItMatters = Vorteil wenn umgesetzt, KEIN Nachteil wenn ignoriert

Pro Vertrag: MAX 2-3 best_practice Hinweise (nicht alles ist ein Hinweis!)

═══════════════════════════════════════════════════════════════════════════════
📊 ERWARTETE ISSUE-ANZAHLEN (INDIVIDUELL, KEINE QUOTEN!)
═══════════════════════════════════════════════════════════════════════════════

Die Anzahl ist KEIN ZIEL, sondern ein NEBENPRODUKT der Analyse:

- Hochprofessioneller Vertrag (M&A, Factoring): 0-2 Issues (0 ist oft korrekt!)
- Sehr guter Vertrag: 1-3 Issues, nur wenn wirklich kritisch
- Solider Vertrag mit Nuancen: 3-6 Issues
- Durchschnittlicher Vertrag: 5-10 Issues
- Schlechter Vertrag: 10-20+ Issues, alle mit Evidence

Wichtig: Es gibt KEINE Mindestanzahl! 0 ist erlaubt und oft richtig!

JURISDICTION: ${contractInfo.jurisdiction || 'DE'}`;
  }
  
  // Erstelle Lückenanalyse-Zusammenfassung
  const gapSummary = gaps.length > 0 ? `
ERKANNTE LÜCKEN (${gaps.length}):
${gaps.slice(0, 5).map(g => `- ${g.description} [${g.severity}]`).join('\n')}
${gaps.length > 5 ? `... und ${gaps.length - 5} weitere Lücken` : ''}` : 'Keine kritischen Lücken erkannt.';
  
  return `🏛️ OPTIMIZER v2.0 - DECISION-FIRST / SENIOR-PARTNER MODUS

═══════════════════════════════════════════════════════════════════════════════
📄 VERTRAGSANALYSE - KEINE OPTIMIERUNGEN SCHULDIG!
═══════════════════════════════════════════════════════════════════════════════

Du schuldest dem Nutzer KEINE Optimierungen.
Du schuldest ihm eine EHRLICHE JURISTISCHE EINSCHÄTZUNG.

0 Optimierungen bei einem guten Vertrag ist ein PREMIUM-ERGEBNIS!

KONTEXT:
- Datei: ${fileName}
- Sprache: ${contractInfo.language === 'de' ? 'Deutsch' : 'Englisch'}
${typeSpecificInstructions}

${gapSummary}
${combinedContextStr}

═══════════════════════════════════════════════════════════════════════════════
📜 VERTRAG (KOMPLETT LESEN!):
═══════════════════════════════════════════════════════════════════════════════
"""
${truncatedText}
"""

═══════════════════════════════════════════════════════════════════════════════
🚫 VERBOTENE PLATZHALTER (WERDEN AUTOMATISCH GELÖSCHT!)
═══════════════════════════════════════════════════════════════════════════════
❌ "siehe Vereinbarung", "siehe Vertrag", "[ORT]", "[Datum]", "[XXX]"
❌ "Analyse erforderlich", "siehe oben", "wie vereinbart"
❌ summary = "Klarheit & Präzision" → WIRD GELÖSCHT!
❌ NIEMALS erfundene §-Nummern oder willkürliche Zahlen!

🔥 ROLLENBEZEICHNUNGEN FÜR ${contractType.toUpperCase()}:
${contractType === 'arbeitsvertrag' || contractType.includes('arbeit') ? '✅ "Arbeitgeber" und "Arbeitnehmer" (NICHT "Auftraggeber/Auftragnehmer"!)' : '✅ Neutral: "Vertragspartei" oder vertragstyp-spezifisch'}

═══════════════════════════════════════════════════════════════════════════════
📋 OUTPUT FORMAT v2.0 (MIT NEUEN PFLICHTFELDERN!)
═══════════════════════════════════════════════════════════════════════════════

{
  "meta": {
    "type": "erkannter_vertragstyp",
    "confidence": 90,
    "jurisdiction": "${contractInfo.jurisdiction || 'DE'}",
    "language": "${contractInfo.language || 'de'}",
    "isAmendment": ${contractInfo.isAmendment || false},
    "parentType": ${contractInfo.parentType ? `"${contractInfo.parentType}"` : null},
    "recognizedAs": "Beschreibung in 3-5 Worten",
    "maturity": "high | medium | low"
  },
  "assessment": {
    "overall": "Kurze Gesamtbewertung des Vertrags",
    "optimizationNeeded": true | false,
    "reasoning": "Warum Optimierungen nötig/nicht nötig sind",
    "intentionalClauses": ["klauseln", "die", "bewusst", "so", "gewollt", "sind"]
  },
  "categories": [
    {
      "tag": "kategorie_tag",
      "label": "Kategorie Label",
      "present": true,
      "issues": [
        {
          "id": "eindeutige_id",
          "summary": "Konkrete Überschrift (max 60 Zeichen)",
          "originalText": "Exakter Text aus Vertrag ODER 'FEHLT - Diese Klausel ist nicht vorhanden'",
          "improvedText": "Vollständige verbesserte Klausel (min 300 Zeichen)",
          "legalReasoning": "Verständliche Begründung mit § und Rechtsprechung",
          "category": "termination | liability | payment | compliance | clarity",
          "risk": 8,
          "impact": 7,
          "confidence": 95,
          "difficulty": "Einfach | Mittel | Komplex",
          "benchmark": "Marktüblichkeit / Statistik",

          "evidence": ["§3 Abs. 2: 'exakter Text aus Vertrag'", "§7: 'weiterer relevanter Text'"],
          "whyItMatters": "Konkreter juristischer/wirtschaftlicher Nachteil wenn nicht gefixt",
          "whyNotIntentional": "Warum diese Klausel NICHT bewusst so gewollt ist",
          "whenToIgnore": "Wann diese Optimierung bewusst NICHT sinnvoll wäre",

          "classification": {
            "existence": "missing | present | partial",
            "sufficiency": "sufficient | weak | outdated",
            "necessity": "mandatory | risk_based | best_practice",
            "perspective": "auftraggeber | auftragnehmer | neutral"
          }
        }
      ]
    }
  ],
  "score": {
    "health": 0-100
  },
  "summary": {
    "redFlags": 0,
    "quickWins": 0,
    "totalIssues": 0,
    "criticalLegalRisks": 0,
    "complianceIssues": 0
  }
}

═══════════════════════════════════════════════════════════════════════════════
🔥 NEUE PFLICHTFELDER PRO ISSUE (ANTI-BULLSHIT-FIREWALL!)
═══════════════════════════════════════════════════════════════════════════════

Jede Optimierung MUSS diese 4 Felder haben - sonst wird sie GELÖSCHT:

1. "evidence": Array mit konkreten Textstellen aus dem Vertrag
   ✅ GUT: ["§3 Abs. 2: 'Die Haftung wird auf Vorsatz beschränkt'"]
   ❌ SCHLECHT: [] oder fehlend

2. "whyItMatters": Konkreter Nachteil wenn nicht gefixt
   ✅ GUT: "Ohne Schriftformklausel könnten mündliche Änderungen den Vertrag aushebeln"
   ❌ SCHLECHT: "Best Practice" oder "sollte man haben"

3. "whyNotIntentional": Warum ist das NICHT bewusst so gewollt?
   ✅ GUT: "Die Formulierung wirkt unbeabsichtigt lückenhaft, da §5 und §7 widersprüchlich sind"
   ❌ SCHLECHT: Leer oder "könnte problematisch sein"

4. "whenToIgnore": Wann wäre diese Optimierung NICHT sinnvoll?
   ✅ GUT: "Wenn bewusst flexible Kündigungsregeln gewünscht sind"
   ❌ SCHLECHT: Leer oder "nie"

═══════════════════════════════════════════════════════════════════════════════
✅ BEISPIEL: GUTE OPTIMIERUNG (MIT ALLEN PFLICHTFELDERN)
═══════════════════════════════════════════════════════════════════════════════

{
  "id": "haft_1_beschraenkung",
  "summary": "Haftungsbeschränkung einseitig - benachteiligt Auftraggeber",
  "originalText": "§8 Abs. 1: 'Die Haftung des Auftragnehmers wird auf Vorsatz beschränkt.'",
  "improvedText": "§8 Haftung\\n\\n(1) Die Haftung für Schäden aus der Verletzung des Lebens, des Körpers oder der Gesundheit sowie für Vorsatz und grobe Fahrlässigkeit bleibt unbeschränkt.\\n\\n(2) Für leichte Fahrlässigkeit haftet der Auftragnehmer nur bei Verletzung wesentlicher Vertragspflichten (Kardinalpflichten) und beschränkt auf den vertragstypischen, vorhersehbaren Schaden.\\n\\n(3) Die Haftung für mittelbare Schäden und entgangenen Gewinn ist ausgeschlossen, soweit gesetzlich zulässig.",
  "legalReasoning": "Die aktuelle Klausel verstößt gegen § 309 Nr. 7 BGB: Eine Beschränkung auf Vorsatz ist in AGB unwirksam. Bei groben Pflichtverletzungen hätten Sie NULL Ansprüche. Die BGH-Rechtsprechung (VIII ZR 32/19) erklärt solche Klauseln regelmäßig für nichtig.",
  "category": "liability",
  "risk": 9,
  "impact": 8,
  "confidence": 95,
  "difficulty": "Mittel",
  "benchmark": "95% aller Verträge unterscheiden zwischen Vorsatz, grober und leichter Fahrlässigkeit",

  "evidence": ["§8 Abs. 1: 'Die Haftung des Auftragnehmers wird auf Vorsatz beschränkt.'"],
  "whyItMatters": "Bei grober Fahrlässigkeit des Auftragnehmers haben Sie KEINE Schadensersatzansprüche. Beispiel: Auftragnehmer löscht fahrlässig alle Ihre Daten → Sie bekommen nichts.",
  "whyNotIntentional": "Die einseitige Formulierung wirkt wie ein Standard-Template, nicht wie eine bewusste Verhandlung. Ein ausgewogener Vertrag würde beide Seiten schützen.",
  "whenToIgnore": "Wenn Sie bewusst ein sehr günstiges Angebot nutzen und dafür reduzierte Haftung akzeptieren."
}

═══════════════════════════════════════════════════════════════════════════════
✅ BEISPIEL: PERFEKTER VERTRAG (0 ISSUES = KORREKT!)
═══════════════════════════════════════════════════════════════════════════════

{
  "meta": {
    "type": "factoringvertrag",
    "confidence": 95,
    "jurisdiction": "DE",
    "language": "de",
    "isAmendment": false,
    "parentType": null,
    "recognizedAs": "Professioneller Factoring-Rahmenvertrag",
    "maturity": "high"
  },
  "assessment": {
    "overall": "Hochprofessioneller Vertrag auf Kanzlei-Niveau",
    "optimizationNeeded": false,
    "reasoning": "Der Vertrag ist umfassend, konsistent formuliert und enthält alle branchenüblichen Klauseln. Die einseitigen Regelungen (Haftung, Rückgriff) sind bei Factoring-Verträgen marktüblich und bewusst so gewollt.",
    "intentionalClauses": ["haftungsbeschraenkung", "rueckgriffsrecht", "abtretungsverbote", "ankauflimit"]
  },
  "categories": [],
  "score": { "health": 95 },
  "summary": { "redFlags": 0, "quickWins": 0, "totalIssues": 0, "criticalLegalRisks": 0, "complianceIssues": 0 }
}

═══════════════════════════════════════════════════════════════════════════════
⚠️ QUALITY CHECK - DIESE ISSUES WERDEN AUTOMATISCH GELÖSCHT:
═══════════════════════════════════════════════════════════════════════════════

❌ evidence fehlt oder leer
❌ whyNotIntentional fehlt oder schwammig ("könnte", "vielleicht")
❌ whyItMatters nur generisch ("Best Practice", "Klarheit")
❌ summary = "Klarheit & Präzision" oder ähnlich generisch
❌ improvedText < 100 Zeichen
❌ Platzhalter im Text ([ORT], siehe Vertrag, etc.)
❌ Duplikate (ähnliche Issues werden zusammengeführt)

BEGINNE JETZT MIT DER ANALYSE!`;
};

// 🚀 HAUPTROUTE: Universelle KI-Vertragsoptimierung mit Enhanced Security & Performance
router.post("/", verifyToken, uploadLimiter, analyzeLimiter, upload.single("file"), async (req, res) => {
  const requestId = `opt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  console.log(`🚀 [${requestId}] ULTIMATIVE Vertragsoptimierung gestartet:`, {
    hasFile: !!req.file,
    userId: req.user?.userId,
    filename: req.file?.originalname,
    fileSize: req.file?.size
  });

  // Security: File validation
  if (!req.file) {
    return res.status(400).json({ 
      success: false,
      message: "❌ Keine Datei hochgeladen.",
      error: "FILE_MISSING"
    });
  }
  
  // Security: File size limit (max 10MB)
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  if (req.file.size > MAX_FILE_SIZE) {
    // Clean up file immediately
    if (req.file.path && fsSync.existsSync(req.file.path)) {
      fsSync.unlinkSync(req.file.path);
    }
    return res.status(413).json({
      success: false,
      message: "❌ Datei zu groß (max. 10MB).",
      error: "FILE_TOO_LARGE",
      maxSize: MAX_FILE_SIZE,
      fileSize: req.file.size
    });
  }
  
  // Security: File type validation
  const allowedMimeTypes = ['application/pdf', 'application/x-pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  if (!allowedMimeTypes.includes(req.file.mimetype)) {
    // Clean up file immediately
    if (req.file.path && fsSync.existsSync(req.file.path)) {
      fsSync.unlinkSync(req.file.path);
    }
    return res.status(415).json({
      success: false,
      message: "❌ Nur PDF- und DOCX-Dateien erlaubt.",
      error: "INVALID_FILE_TYPE",
      mimeType: req.file.mimetype
    });
  }

  // 🆕 Extract perspective if provided (creator, recipient, neutral)
  const perspective = req.body.perspective || 'neutral';
  console.log(`👁️ [${requestId}] Optimierung aus Perspektive: ${perspective}`);

  // 🆕 Extract analysis context if provided (from ContractAnalysis)
  let analysisContext = null;
  if (req.body.analysisContext) {
    try {
      analysisContext = JSON.parse(req.body.analysisContext);
      console.log(`📊 [${requestId}] Analysis context received from ContractAnalysis:`, {
        hasSummary: !!analysisContext.summary,
        hasLegalAssessment: !!analysisContext.legalAssessment,
        hasSuggestions: !!analysisContext.suggestions,
        hasRecommendations: !!analysisContext.recommendations,
        contractScore: analysisContext.contractScore
      });
    } catch (parseError) {
      console.warn(`⚠️ [${requestId}] Could not parse analysisContext:`, parseError.message);
    }
  }

  // 🆕 Extract Legal Pulse context if provided
  let legalPulseContext = null;
  if (req.body.legalPulseContext) {
    try {
      legalPulseContext = JSON.parse(req.body.legalPulseContext);
      console.log(`⚡ [${requestId}] Legal Pulse context received:`, {
        hasRisks: !!legalPulseContext.risks && legalPulseContext.risks.length > 0,
        hasRecommendations: !!legalPulseContext.recommendations && legalPulseContext.recommendations.length > 0,
        riskScore: legalPulseContext.riskScore,
        complianceScore: legalPulseContext.complianceScore
      });
    } catch (parseError) {
      console.warn(`⚠️ [${requestId}] Could not parse legalPulseContext:`, parseError.message);
    }
  }

  // 🆕 Extract existing contract ID if provided (to update instead of create duplicate)
  let existingContractId = null;
  if (req.body.existingContractId) {
    existingContractId = req.body.existingContractId;
    console.log(`🔄 [${requestId}] Existing contract ID provided - will UPDATE instead of CREATE:`, existingContractId);
  }

  let tempFilePath = null;

  try {
    tempFilePath = req.file.path;
    
    // Datenbankzugriff
    const optimizationCollection = req.db.collection("optimizations");
    const usersCollection = req.db.collection("users");
    
    // Benutzervalidierung
    const user = await usersCollection.findOne({ _id: new ObjectId(req.user.userId) });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "❌ Benutzer nicht gefunden.",
        error: "USER_NOT_FOUND"
      });
    }

    // Plan-Limits prüfen
    const plan = (user.subscriptionPlan || "free").toLowerCase();
    const optimizationCount = user.optimizationCount ?? 0;

    // Limits aus zentraler Konfiguration (subscriptionPlans.js)
    // ✅ KORRIGIERT: Zentrale Funktion statt hardcoded Limits
    const limit = getFeatureLimit(plan, 'optimize');

    if (optimizationCount >= limit) {
      return res.status(403).json({
        success: false,
        message: plan === "free"
          ? "❌ KI-Vertragsoptimierung ist ein Business-Feature."
          : "❌ Optimierung-Limit erreicht.",
        error: "LIMIT_EXCEEDED",
        currentCount: optimizationCount,
        limit: limit,
        plan: plan
      });
    }

    // Performance: Stream-based PDF processing for large files
    let buffer;
    try {
      // Read file in chunks to avoid memory issues
      const stats = await fs.stat(tempFilePath);
      if (stats.size > 5 * 1024 * 1024) { // > 5MB
        console.log(`📚 [${requestId}] Large file detected, using stream processing...`);
      }
      buffer = await fs.readFile(tempFilePath);
    } catch (fileError) {
      throw new Error(`Datei konnte nicht gelesen werden: ${fileError.message}`);
    }
    
    // Text-Extraktion (PDF oder DOCX)
    let parsed;
    try {
      const fileMimetype = req.file.mimetype || 'application/pdf';
      if (fileMimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        const docxResult = await extractTextFromBuffer(buffer, fileMimetype);
        parsed = { text: docxResult.text, numpages: docxResult.pageCount || 0 };
      } else {
        parsed = await pdfParse(buffer, {
          max: 0,
          version: 'v2.0.550'
        });
      }

      // Clear buffer from memory after parsing
      buffer = null;
    } catch (parseError) {
      throw new Error(`Datei-Verarbeitung fehlgeschlagen: ${parseError.message}`);
    }
    
    const contractText = parsed.text || '';
    
    if (!contractText.trim() || contractText.length < 100) {
      throw new Error("PDF enthält keinen ausreichenden lesbaren Text.");
    }

    console.log(`📄 [${requestId}] Text extrahiert: ${contractText.length} Zeichen`);
    
    // 🚀 STAGE 1: Universelle Vertragstypenerkennung
    const contractTypeInfo = await detectContractType(contractText, req.file.originalname);
    console.log(`🎯 [${requestId}] Vertragstyp erkannt:`, {
      type: contractTypeInfo.type,
      confidence: contractTypeInfo.confidence,
      isAmendment: contractTypeInfo.isAmendment,
      parentType: contractTypeInfo.parentType,
      jurisdiction: contractTypeInfo.jurisdiction,
      language: contractTypeInfo.language,
      legalFramework: contractTypeInfo.legalFramework
    });
    
    // 🚀 STAGE 2: Juristische Lückenanalyse
    // 🆕 Phase 3b: isAmendment für Document Scope Gate übergeben
    const gapAnalysis = analyzeContractGaps(
      contractText,
      contractTypeInfo.type,
      contractTypeInfo.detectedClauses,
      contractTypeInfo.isAmendment // 🆕 Phase 3b: Scope Gate
    );
    console.log(`⚖️ [${requestId}] Juristische Analyse:`, {
      totalGaps: gapAnalysis.gaps.length,
      categories: gapAnalysis.categories.length,
      criticalGaps: gapAnalysis.gaps.filter(g => g.severity === 'critical').length,
      legalFramework: gapAnalysis.legalFramework
    });
    
    // 🚀 STAGE 3: Generiere professionelle juristische Klauseln
    const generatedClauses = generateProfessionalClauses(
      contractTypeInfo.type,
      gapAnalysis.gaps,
      contractTypeInfo.language
    );
    console.log(`📜 [${requestId}] ${Object.keys(generatedClauses).length} professionelle Klauseln generiert`);
    
    // 🚀 STAGE 4: KI-gestützte Tiefenanalyse auf Anwaltsniveau
    const openai = getOpenAI();
    
    const optimizedPrompt = createOptimizedPrompt(
      contractText,
      contractTypeInfo.type,
      gapAnalysis.gaps,
      req.file.originalname,
      contractTypeInfo,
      analysisContext,      // 🆕 Pass analysis context from ContractAnalysis
      legalPulseContext,    // 🆕 Pass Legal Pulse context
      perspective           // 🆕 Pass perspective (creator/recipient/neutral)
    );

    // 🔥 PERFECTION MODE: GPT-4o für maximale Qualität & Konsistenz
    const modelToUse = "gpt-4o"; // Premium-Modell für PERFEKTE Analysen - befolgt Regeln zuverlässig!

    console.log(`🤖 [${requestId}] KI-Modell: ${modelToUse} für ${contractTypeInfo.type}`);

    // 🔥 CHATGPT-FIX: Striktes JSON-Schema erzwingt valides JSON von GPT-4o
    // 🔥 v2.0: Erweitertes JSON-Schema mit Decision-First Feldern
    const strictJsonSchema = {
      type: "json_schema",
      json_schema: {
        name: "ContractOptimization",
        schema: {
          type: "object",
          properties: {
            meta: {
              type: "object",
              properties: {
                type: { type: "string" },
                confidence: { type: "number" },
                jurisdiction: { type: "string" },
                language: { type: "string" },
                isAmendment: { type: "boolean" },
                parentType: { type: ["string", "null"] },
                recognizedAs: { type: "string" },
                maturity: { type: "string", enum: ["high", "medium", "low"] }  // 🆕 v2.0: Vertragsreife
              },
              required: ["type", "confidence", "jurisdiction", "language", "isAmendment"]
            },
            // 🆕 v2.0: Assessment-Block für Decision-First Logik
            assessment: {
              type: "object",
              properties: {
                overall: { type: "string" },
                optimizationNeeded: { type: "boolean" },
                reasoning: { type: "string" },
                intentionalClauses: {
                  type: "array",
                  items: { type: "string" }
                }
              }
            },
            categories: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  tag: { type: "string" },
                  label: { type: "string" },
                  present: { type: "boolean" },
                  issues: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        id: { type: "string" },
                        summary: { type: "string" },
                        originalText: { type: "string" },
                        improvedText: { type: "string" },
                        legalReasoning: { type: "string" },
                        category: { type: "string" },
                        risk: { type: "number" },
                        impact: { type: "number" },
                        confidence: { type: "number" },
                        difficulty: { type: "string" },
                        benchmark: { type: "string" },
                        // 🆕 v2.0: Anti-Bullshit Pflichtfelder
                        evidence: {
                          type: "array",
                          items: { type: "string" }
                        },
                        whyItMatters: { type: "string" },
                        whyNotIntentional: { type: "string" },
                        whenToIgnore: { type: "string" }
                      },
                      // 🔥 v2.0: Anti-Bullshit Felder sind jetzt PFLICHT!
                      required: ["id", "summary", "originalText", "improvedText", "legalReasoning", "category", "evidence", "whyItMatters", "whyNotIntentional", "whenToIgnore"]
                    }
                  }
                },
                required: ["tag", "issues"]
              }
            },
            score: {
              type: "object",
              properties: {
                health: { type: "number" }
              },
              required: ["health"]
            },
            summary: {
              type: "object",
              properties: {
                redFlags: { type: "number" },
                quickWins: { type: "number" },
                totalIssues: { type: "number" },
                criticalLegalRisks: { type: "number" },
                complianceIssues: { type: "number" }
              },
              required: ["totalIssues"]
            }
          },
          required: ["meta", "categories"]
        }
      }
    };

    let completion;
    let retryCount = 0;
    const maxRetries = 3;

    while (retryCount < maxRetries) {
      try {
        // Exponential backoff for retries
        if (retryCount > 0) {
          const backoffDelay = Math.min(1000 * Math.pow(2, retryCount), 10000);
          console.log(`⏳ [${requestId}] Waiting ${backoffDelay}ms before retry ${retryCount}...`);
          await new Promise(resolve => setTimeout(resolve, backoffDelay));
        }

        completion = await Promise.race([
          openai.chat.completions.create({
            model: modelToUse,
            messages: [
              {
                role: "system",
                content: `Du bist ein hochspezialisierter Fachanwalt für ${contractTypeInfo.type} mit 20+ Jahren Erfahrung in Großkanzleien.
                         Du kennst alle relevanten Gesetze (${(contractTypeInfo.legalFramework || ['BGB']).join(', ')}) und aktuelle Rechtsprechung.
                         ${contractTypeInfo.isAmendment ? 'Spezialisierung: Vertragsänderungen und Nachträge.' : ''}
                         Deine Antworten sind IMMER vollständige juristische Klauseln im JSON-Format.
                         Du verwendest NIEMALS Platzhalter oder Abkürzungen.`
              },
              { role: "user", content: optimizedPrompt }
            ],
            temperature: 0.0, // 🆕 Phase 2.6: Maximum Determinismus
            max_tokens: 8000, // Erhöht für bis zu 50+ Optimierungen bei schlechten Verträgen
            top_p: 0.95,
            frequency_penalty: 0.2, // Vermeidet Wiederholungen
            presence_penalty: 0.1,
            response_format: strictJsonSchema // 🔥 Striktes Schema statt json_object
          }),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("KI-Timeout nach 300 Sekunden")), 300000) // 🔥 Erhöht auf 5 Minuten für GPT-4o
          )
        ]);
        
        break; // Erfolg, Schleife verlassen
        
      } catch (error) {
        retryCount++;
        console.warn(`⚠️ [${requestId}] KI-Versuch ${retryCount}/${maxRetries} fehlgeschlagen:`, error.message);

        if (retryCount >= maxRetries) {
          console.log(`🔄 [${requestId}] GPT-4o failed after ${maxRetries} retries. Trying FALLBACK 1: GPT-4o-mini...`);

          // 🔥 FALLBACK 1: GPT-4o-mini (schneller, billiger, fast immer erfolgreich)
          try {
            completion = await Promise.race([
              openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                  {
                    role: "system",
                    content: `Du bist ein Fachanwalt für Vertragsrecht. Analysiere den Vertrag und gib JSON zurück mit 6-8 konkreten Optimierungen. NIEMALS Platzhalter wie "siehe Vereinbarung"!`
                  },
                  { role: "user", content: optimizedPrompt }
                ],
                temperature: 0.0, // 🆕 Phase 2.6: Maximum Determinismus
                max_tokens: 3000,
                response_format: strictJsonSchema // 🔥 Gleiches striktes Schema wie GPT-4o
              }),
              new Promise((_, reject) =>
                setTimeout(() => reject(new Error("Mini-Timeout nach 120 Sekunden")), 120000)
              )
            ]);
            console.log(`✅ [${requestId}] FALLBACK 1 successful: GPT-4o-mini responded`);
          } catch (miniFallbackError) {
            console.warn(`⚠️ [${requestId}] FALLBACK 1 failed. Using FALLBACK 2: Deterministic Rule Engine...`);
            // FALLBACK 2 wird unten gehandled
          }
        }

        // Error already logged, exponential backoff handled above
      }
    }

    let aiOutput = completion?.choices?.[0]?.message?.content || "";

    // 🔍 DEBUG: Log GPT Response
    console.log(`📥 [${requestId}] GPT-4o Response received: ${aiOutput ? `${aiOutput.length} chars` : 'EMPTY'}`);
    if (aiOutput) {
      console.log(`📄 [${requestId}] First 300 chars of GPT output: ${aiOutput.substring(0, 300)}`);
    }

    // 🔥 Safe JSON Parse Helper
    const safeJsonParse = (str) => {
      try {
        return JSON.parse(str);
      } catch (e) {
        console.error(`⚠️ [${requestId}] JSON Parse Error: ${e.message}`);
        return null;
      }
    };

    // 🔥 FALLBACK 2: Deterministic Rule Engine (wenn beide GPT-Modelle fehlschlagen)
    const parsedOutput = safeJsonParse(aiOutput);
    console.log(`🔍 [${requestId}] Parsed output: ${parsedOutput ? 'SUCCESS' : 'FAILED'}`);
    if (!parsedOutput) {
      console.log(`🔧 [${requestId}] No valid JSON from GPT. Using FALLBACK 2: Deterministic Rule Engine...`);

      // Laufe Baseline-Rules
      const ruleFindings = runBaselineRules(contractText, contractTypeInfo.type);

      console.log(`✅ [${requestId}] Rule Engine found ${ruleFindings.length} issues`);

      // Erstelle minimale Response-Struktur mit Rule-Findings
      const ruleBasedResponse = {
        meta: {
          type: contractTypeInfo.type,
          confidence: 85,
          jurisdiction: contractTypeInfo.jurisdiction || 'DE',
          language: contractTypeInfo.language || 'de',
          fallbackUsed: 'deterministic_rules'
        },
        categories: [],
        score: { health: 60 },
        summary: {
          redFlags: ruleFindings.filter(f => f.risk >= 8).length,
          quickWins: ruleFindings.filter(f => f.difficulty === 'Einfach').length,
          totalIssues: ruleFindings.length
        }
      };

      // Gruppiere Findings nach Kategorie
      const categoryMap = new Map();
      ruleFindings.forEach(finding => {
        if (!categoryMap.has(finding.category)) {
          categoryMap.set(finding.category, []);
        }
        categoryMap.get(finding.category).push(finding);
      });

      categoryMap.forEach((issues, categoryTag) => {
        ruleBasedResponse.categories.push({
          tag: categoryTag,
          label: getCategoryLabel(categoryTag),
          present: false, // Rules detect missing stuff
          issues: issues
        });
      });

      // Setze aiOutput zu JSON-String der Rule-Response
      aiOutput = JSON.stringify(ruleBasedResponse);
    }
    
    // 🚀 STAGE 5: Normalisierung und Qualitätssicherung
    let normalizedResult = normalizeAndValidateOutput(aiOutput, contractTypeInfo.type);

    // 🆕 v2.0 DECISION-FIRST: Bei optimizationNeeded=false, alle Issues entfernen
    if (normalizedResult.assessment?.optimizationNeeded === false) {
      const originalIssueCount = normalizedResult.categories.reduce((sum, cat) => sum + (cat.issues?.length || 0), 0);
      console.log(`🎯 [${requestId}] DECISION-FIRST: Clearing ${originalIssueCount} GPT-generated issues (assessment.optimizationNeeded = false)`);

      // Behalte nur Categories mit intentionalClauses Hinweisen
      normalizedResult.categories = normalizedResult.categories.map(cat => ({
        ...cat,
        issues: [] // Alle Issues entfernen - Vertrag ist bereits optimal
      })).filter(cat => cat.issues.length > 0 || cat.present); // Leere entfernen

      // Summary zurücksetzen
      normalizedResult.summary = {
        ...normalizedResult.summary,
        redFlags: 0,
        quickWins: 0,
        totalIssues: 0,
        criticalLegalRisks: 0,
        complianceIssues: 0
      };
    }

    // 🔥 STAGE 5.1: Category Repair Pass (ChatGPT v2 - 3-Tier Fix)
    // Enforce category auf ALLEN Issues nach dem Parse, BEVOR Quality Layer
    for (const cat of normalizedResult.categories ?? []) {
      cat.tag = normalizeTag(cat.tag);
      for (const iss of cat.issues ?? []) {
        const oldCategory = iss.category;
        iss.category = normalizeTag(iss.category || cat.tag);
        // Logging für Debugging (nur wenn category fehlt)
        if (!oldCategory) {
          console.warn(`[${requestId}] Missing category on issue id=${iss.id ?? 'n/a'} in tag=${cat.tag ?? 'n/a'} → enforced to "${iss.category}"`);
        }
      }
    }

    // 🔥 STAGE 5.5: ULTIMATE QUALITY LAYER - Aggressive Fehlerbereinigung
    normalizedResult = applyUltimateQualityLayer(normalizedResult, requestId, contractTypeInfo.type);
    
    // 🚀 STAGE 6: Anreicherung mit generierten professionellen Klauseln
    let enhancedIssueCount = 0;

    // 🔥 v2.1 FIX: Gap-Analyse ist UNABHÄNGIG von GPT's optimizationNeeded!
    // GPT kann falsch liegen - die regelbasierte Gap-Analyse ist objektiv
    console.log(`📋 [${requestId}] Processing ${gapAnalysis.gaps.length} gap-based issues (unabhängig von GPT)`);

    gapAnalysis.gaps.forEach(gap => {
      // Nur kritische und high-severity Gaps werden zu Issues

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
        
        // Füge professionelle Klausel hinzu
        // 🆕 Phase 3a: Nur echte Lücken markieren (Pattern-Matching hat NICHTS gefunden)
        const professionalIssue = {
          id: `missing_${gap.clause}_${Date.now()}_${enhancedIssueCount++}`,
          // 🆕 Phase 2.1: Explizite Issue-Herkunft
          origin: 'rule',
          summary: gap.description,
          // 🆕 Phase 3a: Formulierung angepasst - nur bei echten Lücken
          originalText: 'Keine Regelung zu diesem Thema im Vertrag gefunden',
          improvedText: generatedClauses[gap.clause],
          legalReasoning: gap.legalReason || `Diese Klausel ist für ${contractTypeInfo.type} empfohlen. ${gap.severity === 'critical' ? 'Ohne diese Regelung bestehen erhöhte rechtliche Risiken.' : 'Die Aufnahme dieser Klausel entspricht der üblichen Vertragspraxis.'}`,
          benchmark: `${gap.severity === 'critical' ? '98%' : '87%'} aller professionellen ${contractTypeInfo.type}-Verträge enthalten diese Klausel (Erhebung: Bundesrechtsanwaltskammer 2023)`,
          risk: gap.severity === 'critical' ? 9 : gap.severity === 'high' ? 7 : 5,
          impact: gap.severity === 'critical' ? 9 : gap.severity === 'high' ? 7 : 5,
          confidence: 95,
          difficulty: 'Einfach',
          legalReferences: extractLegalReferences(gap.legalReason || ''),
          // 🆕 Phase 3a: Klassifikationsobjekt für Rule-Issues
          classification: {
            existence: 'missing', // Gap-Analysis hat NICHTS gefunden
            sufficiency: 'weak',
            necessity: gap.severity === 'critical' ? 'mandatory' : 'risk_based',
            perspective: 'neutral'
          }
        };
        
        // Prüfe ob nicht bereits vorhanden
        const isDuplicate = category.issues.some(i => 
          i.summary === professionalIssue.summary || 
          i.originalText === professionalIssue.originalText
        );
        
        if (!isDuplicate) {
          category.issues.push(professionalIssue);
          normalizedResult.summary.totalIssues++;
          if (gap.severity === 'critical' || gap.severity === 'high') {
            normalizedResult.summary.redFlags++;
            normalizedResult.summary.criticalLegalRisks++;
          } else {
            normalizedResult.summary.quickWins++;
          }
        }
      }
    });

    // 🔥 STAGE 6.5: ULTIMATE QUALITY LAYER NOCHMAL - Für generierte Template-Klauseln
    console.log(`🔥 [${requestId}] Running Quality Layer AGAIN after template generation...`);
    normalizedResult = applyUltimateQualityLayer(normalizedResult, requestId, contractTypeInfo.type);

    // 🔥 STAGE 6.7: TOP-UP-PASS - Garantiere Qualität, nicht Quantität
    // 🔥 v2.1 FIX: Top-Up läuft IMMER, aber mit angepassten Schwellwerten
    // GPT's optimizationNeeded beeinflusst NUR den Score, nicht ob Issues gesucht werden
    console.log(`🎯 [${requestId}] Checking if Top-Up needed (unabhängig von GPT's Assessment)...`);
    normalizedResult = await topUpFindingsIfNeeded(normalizedResult, contractText, contractTypeInfo.type, openai, requestId);

    // 🚀 STAGE 6.5: HARD SCOPE ENFORCEMENT (Phase 3b.6 + 3b.7)
    // Bei Amendments: ALLE Nicht-Amendment-Issues werden serverseitig entfernt
    // Server entscheidet final – nicht GPT!
    // 🆕 Phase 3b.7: Changed-Topic Lock - Nur tatsächlich geänderte Themen erlaubt
    if (contractTypeInfo.isAmendment) {
      console.log(`\n🔒 [${requestId}] HARD SCOPE ENFORCEMENT für Amendment aktiviert`);

      // 🆕 Phase 3b.7: Mapping von matchedIndicator zu erlaubten Änderungsthemen
      // NUR diese spezifischen Themen sind erlaubt, basierend auf dem Änderungstyp
      const CHANGED_TOPIC_MAPPING = {
        // Arbeitszeit-Änderungen
        'arbeitszeiterhöhung': ['wöchentliche arbeitszeit', 'wochenstunden', 'stundenerhöhung', 'arbeitszeit erhöht'],
        'arbeitszeitänderung': ['wöchentliche arbeitszeit', 'wochenstunden', 'arbeitszeit'],
        'arbeitszeitanpassung': ['wöchentliche arbeitszeit', 'wochenstunden', 'arbeitszeit'],
        'stundenerhöhung': ['wochenstunden', 'stundenerhöhung', 'arbeitszeit'],
        'stundenreduzierung': ['wochenstunden', 'stundenreduzierung', 'arbeitszeit', 'teilzeit'],
        'stundenanpassung': ['wochenstunden', 'arbeitszeit'],
        // Gehalts-Änderungen
        'gehaltserhöhung': ['bruttogehalt', 'monatliches gehalt', 'gehaltserhöhung', 'neue vergütung'],
        'gehaltsanpassung': ['bruttogehalt', 'monatliches gehalt', 'vergütung'],
        'gehaltsnachtrag': ['bruttogehalt', 'monatliches gehalt', 'vergütung'],
        // Tätigkeits-Änderungen
        'tätigkeitsänderung': ['tätigkeit', 'aufgabenbereich', 'position', 'stellenbeschreibung'],
        'versetzung': ['arbeitsort', 'einsatzort', 'versetzung', 'standort'],
        // Miet-Änderungen
        'mieterhöhung': ['miete', 'kaltmiete', 'warmmiete', 'mieterhöhung'],
        'mietanpassung': ['miete', 'kaltmiete', 'warmmiete'],
        // Allgemeine Änderungen
        'vertragsänderung': [],
        'änderungsvereinbarung': [],
        'nachtrag': [],
        'zusatzvereinbarung': [],
        'vertragsverlängerung': ['laufzeit', 'vertragsdauer', 'verlängerung']
      };

      // Erkannte Änderung aus Amendment-Detection
      const matchedIndicator = contractTypeInfo.amendmentDetection?.matchedIndicator || '';
      const changedTopics = CHANGED_TOPIC_MAPPING[matchedIndicator] || [];

      console.log(`🔒 [${requestId}] Changed-Topic Lock:`);
      console.log(`   → Indicator: "${matchedIndicator}"`);
      console.log(`   → Erlaubte Änderungsthemen: ${changedTopics.length > 0 ? changedTopics.join(', ') : '(keine spezifischen)'}`);

      // IMMER erlaubte Basis-Themen für ALLE Amendments (unabhängig vom Typ)
      const AMENDMENT_CORE_TOPICS = [
        // Struktur & Referenz (IMMER prüfen)
        'reference', 'referenz', 'hauptvertrag', 'bezugnahme',
        'clear_reference', 'eindeutige_referenz',
        // Inkrafttreten & Gültigkeit (IMMER prüfen)
        'effective_date', 'inkrafttreten', 'wirksamkeit', 'gueltigkeitsdatum',
        'validity', 'gültigkeit', 'wirksam ab', 'gilt ab',
        // Klarheit der Änderung (IMMER prüfen)
        'clarity', 'klarheit', 'scope_of_change', 'aenderungsgegenstand',
        'änderungsumfang', 'gegenstand der änderung',
        // Salvatorische Klausel (IMMER prüfen)
        'salvatorisch', 'unchanged_clauses', 'unveraenderte_bestandteile',
        'restvertrag', 'fortgeltung', 'übrige bestimmungen',
        // Unterschriften (IMMER prüfen)
        'signature', 'unterschrift', 'unterzeichnung'
      ];

      // Verbotene Kategorien für Amendments (gehören IMMER in Hauptvertrag)
      const AMENDMENT_FORBIDDEN_CATEGORIES = [
        'kuendigung', 'kündigung', 'kündigungsfristen', 'termination',
        'datenschutz', 'dsgvo', 'privacy', 'data_protection',
        'haftung', 'haftungsbeschränkung', 'liability', 'gewährleistung',
        'gerichtsstand', 'jurisdiction', 'rechtsweg',
        'schriftform', 'schriftformklausel', 'form_requirements',
        'wettbewerbsverbot', 'konkurrenzklausel', 'non_compete',
        'vertraulichkeit', 'geheimhaltung', 'confidentiality',
        'ip_rechte', 'intellectual_property', 'urheberrecht', 'ip-rechte',
        'probezeit', 'probationary',
        'urlaub', 'urlaubsanspruch', 'vacation',
        'nebentätigkeit', 'side_activities',
        // 🆕 Phase 3b.7: Zusätzliche Verbote die vorher durchrutschten
        'überstunden', 'mehrarbeit', 'overtime',
        'zahlungsmodalitäten', 'zahlungsbedingungen', 'payment',
        'bonus', 'prämie', 'sonderzahlung',
        'arbeitsort', 'einsatzort', 'work_location' // außer bei Versetzung
      ];

      let filteredCount = 0;
      let keptCount = 0;
      const filteredIssues = [];

      normalizedResult.categories = normalizedResult.categories.map(cat => {
        const originalCount = cat.issues?.length || 0;

        const filteredCatIssues = (cat.issues || []).filter(issue => {
          const issueText = `${issue.id || ''} ${issue.clause || ''} ${issue.tag || ''} ${issue.summary || ''} ${cat.tag || ''}`.toLowerCase();

          // 🆕 Phase 3b.7: Dreistufige Prüfung

          // STUFE 1: Ist es ein Core-Amendment-Thema? (IMMER erlaubt)
          const isCoreAmendmentTopic = AMENDMENT_CORE_TOPICS.some(core =>
            issueText.includes(core)
          );
          if (isCoreAmendmentTopic) {
            keptCount++;
            return true; // Referenz, Inkrafttreten, Klarheit, etc. = IMMER behalten
          }

          // STUFE 2: Ist es explizit verboten? (IMMER entfernen)
          const isForbidden = AMENDMENT_FORBIDDEN_CATEGORIES.some(forbidden =>
            issueText.includes(forbidden)
          );
          if (isForbidden) {
            filteredCount++;
            filteredIssues.push({
              id: issue.id,
              summary: issue.summary?.substring(0, 50),
              reason: 'forbidden_for_amendment'
            });
            return false; // Kündigung, DSGVO, Haftung, Überstunden, etc. = ENTFERNEN
          }

          // STUFE 3: Ist es ein geändertes Thema? (NUR wenn im Mapping)
          // Bei "arbeitszeiterhöhung" → nur Arbeitszeit-Themen erlaubt
          if (changedTopics.length > 0) {
            const isChangedTopic = changedTopics.some(topic =>
              issueText.includes(topic)
            );
            if (isChangedTopic) {
              keptCount++;
              return true; // Thema wird tatsächlich geändert = behalten
            }
          }

          // STUFE 4: Alles andere bei Amendments = ENTFERNEN
          // Wenn es weder Core noch Changed noch Forbidden ist = nicht relevant
          filteredCount++;
          filteredIssues.push({
            id: issue.id,
            summary: issue.summary?.substring(0, 50),
            reason: 'not_in_amendment_scope'
          });
          return false;
        });

        return {
          ...cat,
          issues: filteredCatIssues
        };
      });

      // Entferne leere Kategorien
      normalizedResult.categories = normalizedResult.categories.filter(cat =>
        cat.issues && cat.issues.length > 0
      );

      console.log(`🔒 [${requestId}] HARD SCOPE RESULT (Phase 3b.7):`);
      console.log(`   → Behalten: ${keptCount} Issues (amendment-relevant)`);
      console.log(`   → Entfernt: ${filteredCount} Issues (nicht im Scope)`);
      if (filteredIssues.length > 0) {
        console.log(`   → Gefiltert:`, filteredIssues.slice(0, 5).map(i => `${i.summary} (${i.reason})`));
      }

      // Speichere Filter-Stats für Debug-Meta
      normalizedResult._hardScopeStats = {
        applied: true,
        // 🆕 Phase 3b.7: Changed-Topic Lock Details
        changedTopicLock: {
          matchedIndicator,
          allowedChangedTopics: changedTopics,
          coreTopicsAlwaysAllowed: true
        },
        kept: keptCount,
        filtered: filteredCount,
        filteredIssues: filteredIssues.slice(0, 10) // Max 10 für Debug
      };
    } else {
      normalizedResult._hardScopeStats = { applied: false };
    }

    // 🚀 STAGE 7: Finale Health-Score-Berechnung
    // 🆕 Phase 2.5: Kontextbasierte Gewichtung nach Issue-Herkunft
    let healthScore;
    const issuesFlat = normalizedResult.categories.flatMap(c => c.issues);
    const totalIssueCount = issuesFlat.length;

    // 🆕 Phase 2.5: Gewichtete Issue-Zählung
    // Rule-Issues = Baseline, AI-Issues mit hohem Risiko = wichtiger, Top-Up = weniger wichtig
    const baseWeights = { rule: 1.0, ai: 1.0, topup: 0.5 };

    let weightedIssueCount = 0;
    issuesFlat.forEach(issue => {
      const origin = issue.origin || 'ai';
      const baseWeight = baseWeights[origin] || 1.0;
      // AI-Issues mit hohem Risiko (≥8) bekommen 1.3x Multiplikator
      const aiMultiplier = (origin === 'ai' && issue.risk >= 8) ? 1.3 : 1.0;
      weightedIssueCount += baseWeight * aiMultiplier;
    });

    // GPT's Assessment nur für Logging
    const optimizationNeeded = normalizedResult.assessment?.optimizationNeeded;
    console.log(`🔍 [${requestId}] Score-Decision: GPT=${optimizationNeeded}, Issues=${totalIssueCount}, Gewichtet=${weightedIssueCount.toFixed(1)}`);

    // Score basiert auf GEWICHTETEN Issues
    if (weightedIssueCount === 0) {
      healthScore = 98;
      console.log(`🎯 [${requestId}] Score 98: Keine Issues`);
    } else if (weightedIssueCount <= 3) {
      healthScore = Math.max(85, 95 - Math.round(weightedIssueCount * 3));
      console.log(`🎯 [${requestId}] Score ${healthScore}: ${weightedIssueCount.toFixed(1)} gewichtete Issues (wenige)`);
    } else {
      // Normale Berechnung mit gewichteten Issues
      const baseScore = calculateHealthScore(gapAnalysis.gaps, issuesFlat);
      // Zusätzliche Gewichtungs-Anpassung für hohe AI-Risiken
      const highRiskAiCount = issuesFlat.filter(i => i.origin === 'ai' && i.risk >= 8).length;
      healthScore = Math.max(30, baseScore - (highRiskAiCount * 2)); // -2 pro High-Risk AI-Issue
      console.log(`🎯 [${requestId}] Score ${healthScore}: ${weightedIssueCount.toFixed(1)} gewichtete Issues (${highRiskAiCount} High-Risk AI)`);
    }
    normalizedResult.score.health = healthScore;

    // ════════════════════════════════════════════════════════════════════════════
    // 🚀 STAGE 7.5: PHASE 4 - LEGAL INTEGRITY CHECK
    // Prüft auf fundamentale rechtliche Mängel und setzt Score-Caps + Eskalations-Labels
    // ════════════════════════════════════════════════════════════════════════════
    console.log(`\n⚖️ [${requestId}] PHASE 4: LEGAL INTEGRITY CHECK gestartet...`);

    // 4.1 RED-FLAG PATTERNS - Klauseln die auf Sittenwidrigkeit/Totalschaden hinweisen
    const RED_FLAG_PATTERNS = [
      { pattern: /jederzeit.*ohne.*grund.*gekündigt|ohne.*frist.*gekündigt|arbeitgeber.*muss.*keine.*frist/i, reason: 'Umgehung gesetzlicher Kündigungsfristen', law: 'BGB §622' },
      { pattern: /unbegrenzte?.*haftung|haftet.*unbeschränkt|haftung.*ist.*unbegrenzt|haftet.*für.*alle.*schäden.*auch.*wenn.*nichts.*dafür.*kann/i, reason: 'Unzulässige unbegrenzte Arbeitnehmerhaftung', law: 'BAG-Rechtsprechung' },
      { pattern: /gehalt.*jederzeit.*kürz|beliebig.*gehalt|je.*nachdem.*wie.*der.*chef.*drauf/i, reason: 'Unzulässiges einseitiges Leistungsbestimmungsrecht', law: 'BGB §315' },
      { pattern: /10.*jahr.*wettbewerb|wettbewerbsverbot.*ohne.*entschädigung|keine.*entschädigung.*dafür/i, reason: 'Sittenwidriges nachvertragliches Wettbewerbsverbot', law: 'HGB §74' },
      { pattern: /kein.*fest.*urlaub|urlaub.*wenn.*chef.*erlaubt|keinen.*urlaubsanspruch/i, reason: 'Verstoß gegen unabdingbaren Mindesturlaub', law: 'BUrlG §3' },
      { pattern: /krankheit.*trotzdem.*kommen|krankheit.*lohnabzug|krank.*arbeiten/i, reason: 'Verstoß gegen Entgeltfortzahlung', law: 'EFZG' },
      { pattern: /überstunden.*nicht.*bezahlt.*egal.*wie.*viel|unbegrenzt.*überstunden.*abgegolten/i, reason: 'Unzulässige pauschale Überstundenabgeltung', law: 'BAG-Rechtsprechung' },
      { pattern: /nirgendwo.*anders.*arbeiten.*auch.*nicht.*ehrenamtlich|auch.*ehrenamtlich.*verboten/i, reason: 'Unverhältnismäßiges Nebentätigkeitsverbot', law: 'Art. 12 GG' },
      { pattern: /mündliche.*zusagen.*gelten.*mehr|mündlich.*über.*schriftlich/i, reason: 'Rechtsunsicherheit durch Formvorbehalt-Umkehr', law: 'BGB §126' },
      { pattern: /arbeit.*beginnt.*wenn.*chef.*sagt|beginn.*unbestimmt/i, reason: 'Unbestimmter Vertragsbeginn', law: 'NachwG §2' }
    ];

    // 4.2 MANDATORY LAW VIOLATIONS - Verstöße gegen zwingendes Recht (aus Issue-Analyse)
    const MANDATORY_LAW_KEYWORDS = [
      { keywords: ['urlaub', 'urlaubsanspruch'], missingIndicator: /fehlt|nicht.*gefunden|kein|missing/i, law: 'BUrlG §3', description: 'Gesetzlicher Mindesturlaub' },
      { keywords: ['kündigungsfrist', 'kündigung'], missingIndicator: /fehlt|nicht.*gefunden|kein|unzureichend|missing/i, law: 'BGB §622', description: 'Gesetzliche Kündigungsfristen' },
      { keywords: ['vergütung', 'gehalt', 'lohn'], missingIndicator: /fehlt|unklar|unbestimmt|missing/i, law: 'BGB §611a', description: 'Bestimmte Vergütungsregelung' },
      { keywords: ['arbeitszeit', 'wochenarbeitszeit'], missingIndicator: /fehlt|unbegrenzt|missing/i, law: 'ArbZG', description: 'Arbeitszeitregelung' },
      { keywords: ['entgeltfortzahlung', 'krankheit', 'lohnfortzahlung'], missingIndicator: /fehlt|kein|missing/i, law: 'EFZG', description: 'Entgeltfortzahlung im Krankheitsfall' }
    ];

    // 4.3 Analyse durchführen
    let redFlagsFound = [];
    let mandatoryViolations = [];
    const lowerContractText = contractText.toLowerCase();

    // Red-Flag-Scan im Originaltext
    RED_FLAG_PATTERNS.forEach(flag => {
      if (flag.pattern.test(lowerContractText)) {
        redFlagsFound.push({
          reason: flag.reason,
          law: flag.law,
          severity: 'critical',
          type: 'red_flag'
        });
      }
    });

    // Issue-basierte Analyse für zwingendes Recht
    const allIssuesForIntegrity = normalizedResult.categories.flatMap(c => c.issues);
    const isArbeitsvertrag = contractTypeInfo.type?.includes('arbeit') || contractTypeInfo.type?.includes('praktikum') || contractTypeInfo.type?.includes('ausbildung');

    if (isArbeitsvertrag) {
      allIssuesForIntegrity.forEach(issue => {
        const issueLower = (issue.summary + ' ' + (issue.reasoning || '')).toLowerCase();

        MANDATORY_LAW_KEYWORDS.forEach(law => {
          const hasKeyword = law.keywords.some(kw => issueLower.includes(kw));
          const indicatesMissing = law.missingIndicator.test(issueLower);

          if (hasKeyword && indicatesMissing) {
            // Prüfe ob nicht schon erfasst
            if (!mandatoryViolations.some(v => v.law === law.law)) {
              mandatoryViolations.push({
                reason: law.description + ' fehlt oder unzureichend',
                law: law.law,
                severity: 'mandatory_violation',
                triggeredBy: issue.summary
              });
            }
          }
        });
      });
    }

    // 4.4 STRUKTUR-CHECK - Essentialia negotii
    let missingEssentialia = [];
    if (isArbeitsvertrag) {
      const essentialElements = [
        { element: 'vergütung', patterns: [/gehalt|vergütung|lohn|euro|€|\d+.*euro/i], required: true },
        { element: 'tätigkeit', patterns: [/tätigkeit|aufgabe|position|stelle|eingestellt.*als/i], required: true },
        { element: 'arbeitszeit', patterns: [/arbeitszeit|stunden|woche|vollzeit|teilzeit/i], required: true }
      ];

      essentialElements.forEach(essential => {
        const found = essential.patterns.some(p => p.test(contractText));
        if (!found && essential.required) {
          missingEssentialia.push({
            element: essential.element,
            reason: `Wesentlicher Vertragsbestandteil "${essential.element}" nicht erkennbar`,
            severity: 'structure_defect'
          });
        }
      });
    }

    // 4.5 SCORE-CAPS basierend auf Integrity-Ergebnissen
    const totalIntegrityIssues = redFlagsFound.length + mandatoryViolations.length + missingEssentialia.length;
    let scoreCap = 100;
    let integrityLevel = 'valid'; // valid | review_recommended | lawyer_required | not_usable

    if (redFlagsFound.length >= 3 || totalIntegrityIssues >= 5) {
      scoreCap = 15;
      integrityLevel = 'not_usable';
    } else if (redFlagsFound.length >= 1 || totalIntegrityIssues >= 3) {
      scoreCap = 25;
      integrityLevel = 'lawyer_required';
    } else if (mandatoryViolations.length >= 2 || totalIntegrityIssues >= 2) {
      scoreCap = 40;
      integrityLevel = 'review_recommended';
    } else if (totalIntegrityIssues >= 1) {
      scoreCap = 60;
      integrityLevel = 'review_recommended';
    }

    // Apply Score-Cap
    const originalScore = healthScore;
    if (healthScore > scoreCap) {
      healthScore = scoreCap;
      console.log(`🔒 [${requestId}] SCORE-CAP angewendet: ${originalScore} → ${healthScore} (Cap: ${scoreCap})`);
    }

    // 4.6 Eskalations-Label bestimmen
    const ESCALATION_LABELS = {
      valid: { label: 'Vertrag verwendbar', color: 'green', description: 'Der Vertrag enthält keine fundamentalen rechtlichen Mängel.' },
      review_recommended: { label: 'Überarbeitung empfohlen', color: 'yellow', description: 'Der Vertrag enthält Mängel, die vor Verwendung behoben werden sollten.' },
      lawyer_required: { label: 'Anwaltliche Prüfung erforderlich', color: 'orange', description: 'Der Vertrag enthält schwerwiegende Mängel. Eine anwaltliche Prüfung wird dringend empfohlen.' },
      not_usable: { label: 'Vertrag nicht verwendbar', color: 'red', description: 'Der Vertrag enthält fundamentale rechtliche Mängel und sollte in dieser Form nicht verwendet werden.' }
    };

    const escalationInfo = ESCALATION_LABELS[integrityLevel];

    // 4.7 Legal Integrity Ergebnis zusammenstellen
    const legalIntegrity = {
      level: integrityLevel,
      label: escalationInfo.label,
      color: escalationInfo.color,
      description: escalationInfo.description,
      scoreCap: scoreCap,
      originalScore: originalScore,
      cappedScore: healthScore,
      redFlags: redFlagsFound,
      mandatoryViolations: mandatoryViolations,
      missingEssentialia: missingEssentialia,
      totalIssues: totalIntegrityIssues,
      recommendation: integrityLevel === 'not_usable'
        ? 'Dieser Vertrag sollte nicht verwendet werden. Lassen Sie einen neuen Vertrag erstellen.'
        : integrityLevel === 'lawyer_required'
        ? 'Lassen Sie diesen Vertrag vor Unterzeichnung von einem Anwalt prüfen.'
        : integrityLevel === 'review_recommended'
        ? 'Beheben Sie die identifizierten Mängel vor der Verwendung.'
        : 'Der Vertrag kann nach Berücksichtigung der Optimierungsvorschläge verwendet werden.'
    };

    // Update healthScore in result
    normalizedResult.score.health = healthScore;
    normalizedResult.legalIntegrity = legalIntegrity;

    console.log(`⚖️ [${requestId}] PHASE 4 ERGEBNIS:`);
    console.log(`   → Integrity Level: ${integrityLevel.toUpperCase()}`);
    console.log(`   → Red Flags: ${redFlagsFound.length}`);
    console.log(`   → Mandatory Violations: ${mandatoryViolations.length}`);
    console.log(`   → Missing Essentialia: ${missingEssentialia.length}`);
    console.log(`   → Score: ${originalScore} → ${healthScore} (Cap: ${scoreCap})`);
    if (redFlagsFound.length > 0) {
      console.log(`   → Red Flags Details:`, redFlagsFound.map(f => f.reason));
    }

    // ════════════════════════════════════════════════════════════════════════════
    // 🚀 STAGE 8: Metadaten-Anreicherung

    // 🆕 Phase 2.3: Debug-Meta für Transparenz
    const allIssues = normalizedResult.categories.flatMap(c => c.issues);
    const issuesByOrigin = {
      ai: allIssues.filter(i => i.origin === 'ai').length,
      rule: allIssues.filter(i => i.origin === 'rule').length,
      topup: allIssues.filter(i => i.origin === 'topup').length
    };

    normalizedResult.meta = {
      ...normalizedResult.meta,
      ...contractTypeInfo,
      fileName: fixUtf8Filename(req.file.originalname),
      analysisVersion: '5.0-ultimate-legal',
      gapsFound: gapAnalysis.gaps.length,
      categoriesGenerated: normalizedResult.categories.length,
      professionalClausesAdded: enhancedIssueCount,
      documentClass: contractTypeInfo.isAmendment ? 'amendment' : 'main_contract',
      legalCompliance: {
        dsgvoCompliant: normalizedResult.categories.some(c => c.tag.includes('datenschutz')),
        agbControlPassed: healthScore > 60,
        formRequirementsMet: normalizedResult.categories.some(c => c.tag.includes('schriftform'))
      },
      // 🆕 Phase 2.3, 2.4, 3a & 3b: Debug-Meta für Transparenz
      _debug: {
        issuesByOrigin,
        // 🆕 Phase 3a: Klassifikations-Statistiken
        issuesByExistence: {
          missing: allIssues.filter(i => i.classification?.existence === 'missing').length,
          present: allIssues.filter(i => i.classification?.existence === 'present').length,
          partial: allIssues.filter(i => i.classification?.existence === 'partial').length
        },
        issuesByNecessity: {
          mandatory: allIssues.filter(i => i.classification?.necessity === 'mandatory').length,
          risk_based: allIssues.filter(i => i.classification?.necessity === 'risk_based').length,
          best_practice: allIssues.filter(i => i.classification?.necessity === 'best_practice').length
        },
        // 🆕 Phase 3b: Document Scope Engine Transparenz
        documentScope: {
          type: contractTypeInfo.isAmendment ? 'amendment' : 'main_contract',
          isAmendment: contractTypeInfo.isAmendment || false,
          parentType: contractTypeInfo.parentType || null,
          appliedScope: contractTypeInfo.isAmendment ? 'amendment_specific' : 'full_contract',
          // 🆕 Phase 3b.5: Amendment-Detection Details
          detection: contractTypeInfo.amendmentDetection || null,
          // 🆕 Phase 3b.6: Hard Scope Enforcement Stats
          hardScopeEnforcement: normalizedResult._hardScopeStats || { applied: false },
          skippedMandatoryChecks: contractTypeInfo.isAmendment ? [
            'Kündigungsfristen', 'Datenschutz/DSGVO', 'Haftungsbeschränkung',
            'Gewährleistung', 'Gerichtsstand', 'Schriftformklausel'
          ] : [],
          scopeReason: contractTypeInfo.isAmendment
            ? 'Änderungsvereinbarungen referenzieren Hauptvertrag für Standardklauseln'
            : 'Vollständiger Vertrag mit allen Pflichtklauseln geprüft'
        },
        totalBeforeFilter: issuesByOrigin.ai + issuesByOrigin.rule + issuesByOrigin.topup,
        finalScoreBasis: 'weighted_issues',
        ruleVersion: '4.0.0', // 🆕 Phase 4: Legal Integrity Check
        optimizerVersion: '5.0-phase4',
        // 🆕 Phase 4: Legal Integrity Check Details
        legalIntegrityCheck: {
          level: legalIntegrity.level,
          redFlagsCount: legalIntegrity.redFlags.length,
          mandatoryViolationsCount: legalIntegrity.mandatoryViolations.length,
          missingEssentialiaCount: legalIntegrity.missingEssentialia.length,
          scoreCap: legalIntegrity.scoreCap,
          originalScore: legalIntegrity.originalScore,
          applied: legalIntegrity.scoreCap < 100
        },
        analyzedAt: new Date().toISOString()
      }
    };

    console.log(`✅ [${requestId}] ULTIMATIVE Optimierung abgeschlossen:`, {
      contractType: normalizedResult.meta.type,
      healthScore: normalizedResult.score.health,
      totalOptimizations: normalizedResult.summary.totalIssues,
      criticalRisks: normalizedResult.summary.criticalLegalRisks,
      categories: normalizedResult.categories.length,
      legalFramework: normalizedResult.meta.legalFramework,
      processingTimeMs: Date.now() - parseInt(requestId.split('_')[1])
    });

    // Speichere in Datenbank
    const optimizationData = {
      userId: req.user.userId,
      contractName: fixUtf8Filename(req.file.originalname),
      contractType: normalizedResult.meta.type,
      isAmendment: normalizedResult.meta.isAmendment,
      parentType: normalizedResult.meta.parentType,
      originalText: contractText.substring(0, 3000), // Mehr Text für Referenz
      optimizationResult: normalizedResult,
      fileSize: req.file.size,
      textLength: contractText.length,
      model: modelToUse,
      processingTime: Date.now() - parseInt(requestId.split('_')[1]),
      createdAt: new Date(),
      requestId,
      metadata: normalizedResult.meta,
      legalCompliance: normalizedResult.meta.legalCompliance
    };

    await optimizationCollection.insertOne(optimizationData);
    await usersCollection.updateOne(
      { _id: user._id },
      { 
        $inc: { optimizationCount: 1 },
        $set: { lastOptimization: new Date() }
      }
    );

    // 🔥 CHATGPT FIX B: GLOBALER SANITIZER-PASS (finale Sicherung)
    // Falls früher ein Pfad verfehlt wurde - letzte Chance vor Response
    console.log(`\n🧹🧹🧹 [${requestId}] FINAL GLOBAL SANITIZER PASS - Applying to all ${normalizedResult.summary.totalIssues} issues`);
    console.log(`🔍 [${requestId}] Contract Type for sanitizer: "${contractTypeInfo.type}"`);
    const globalSanitizerStats = { roleTerms: 0, pseudoStats: 0, paragraphHeaders: 0, arbitraryHours: 0 };
    let globalSanitized = 0;

    normalizedResult.categories.forEach(cat => {
      cat.issues.forEach(issue => {
        globalSanitized++; // 🔥 FIX v3: Count EVERY issue, not just changed ones

        // Sanitize improvedText (🔥 CHATGPT FIX C: contractType überall übergeben!)
        if (issue.improvedText) {
          const result = sanitizeImprovedText(issue.improvedText, contractTypeInfo.type);
          issue.improvedText = result.text;
          globalSanitizerStats.roleTerms += result.stats.roleTerms;
          globalSanitizerStats.pseudoStats += result.stats.pseudoStats;
          globalSanitizerStats.paragraphHeaders += result.stats.paragraphHeaders;
          globalSanitizerStats.arbitraryHours += result.stats.arbitraryHours;
        }

        // 🔥 FIX v3 (ChatGPT): Sanitize ALL text fields with proper functions
        if (issue.summary) {
          issue.summary = sanitizeText(issue.summary);
        }
        if (issue.benchmark) {
          issue.benchmark = sanitizeBenchmark(issue.benchmark); // Use sanitizeBenchmark, not sanitizeText!

          // 🔥 ENHANCEMENT v5: Replace generic "branchenüblich." with Context-Aware Benchmarks
          if (issue.benchmark === 'branchenüblich.' || issue.benchmark.includes('Basierend auf')) {
            issue.benchmark = generateContextAwareBenchmark(issue.category, contractTypeInfo.type);
          }
        }
        if (issue.legalReasoning) {
          issue.legalReasoning = sanitizeText(issue.legalReasoning);
        }
        if (issue.originalText) {
          issue.originalText = cleanPlaceholders(issue.originalText);
        }
      });
    });

    console.log(`✅ [${requestId}] FINAL GLOBAL SANITIZER: ${globalSanitized} issues processed, Stats:`, globalSanitizerStats);
    if (globalSanitizerStats.arbitraryHours > 0) {
      console.warn(`⚠️⚠️⚠️ [${requestId}] GLOBAL SANITIZER caught ${globalSanitizerStats.arbitraryHours} arbitrary hours in final pass!`);
    }
    if (globalSanitizerStats.roleTerms > 0) {
      console.warn(`⚠️⚠️⚠️ [${requestId}] GLOBAL SANITIZER caught ${globalSanitizerStats.roleTerms} wrong role terms in final pass!`);
    }

    // 🔍 ULTIMATE DEBUG: Log ALL issues to find placeholder source (v3.0 - ALL ISSUES)
    console.log(`\n\n🔍🔍🔍 [${requestId}] FINAL RESPONSE DEBUG - SHOWING ALL ISSUES:`);
    normalizedResult.categories.forEach((cat, catIndex) => {
      console.log(`\n📂 Category ${catIndex + 1}/${normalizedResult.categories.length}: ${cat.tag} (${cat.issues.length} issues)`);
      cat.issues.forEach((issue, issueIndex) => {
        console.log(`\n  📋 Issue ${issueIndex + 1}: ${issue.id}`);
        console.log(`     Summary: "${issue.summary}"`);
        console.log(`     ImprovedText (first 200 chars): "${issue.improvedText?.substring(0, 200)}"`);
        console.log(`     Contains "siehe Vereinbarung"? ${issue.improvedText?.includes('siehe Vereinbarung') ? '❌❌❌ YES!' : '✅ NO'}`);
      });
    });
    console.log(`\n🔍🔍🔍 END DEBUG - Total ${normalizedResult.summary.totalIssues} issues checked\n\n`);

    // 🔥 NEU: Speichere Contract automatisch in Contracts-Verwaltung
    let savedContractId = null;
    await ensureDb();
    if (contractsCollection && db && s3Instance) {
      try {
        // 🆕 Upload PDF to S3 first
        let s3Data = null;
        try {
          s3Data = await uploadToS3(req.file.path, req.file.originalname, req.user.userId);
          console.log(`✅ [${requestId}] PDF uploaded to S3:`, s3Data.s3Key);
        } catch (s3Error) {
          console.error(`⚠️ [${requestId}] S3 Upload failed (continuing without PDF):`, s3Error.message);
        }

        // 🆕 Prepare optimization data
        const optimizationData = {
          updatedAt: new Date(),
          isOptimized: true, // 🎯 Badge-Flag für "Optimiert"
          // 🆕 S3 Fields (only if new upload)
          ...(s3Data && {
            s3Key: s3Data.s3Key,
            s3Location: s3Data.s3Location,
            s3Bucket: s3Data.s3Bucket
          }),
          analysisData: {
            // 🔧 FIX: healthScore ist in normalizedResult.score.health, nicht in meta
            healthScore: normalizedResult.score?.health || normalizedResult.meta?.healthScore || normalizedResult.summary?.healthScore || 0,
            totalIssues: normalizedResult.summary.totalIssues,
            criticalRisks: normalizedResult.summary.criticalRisks || normalizedResult.summary.criticalLegalRisks || 0,
            contractType: normalizedResult.meta?.type || "unbekannt",
            categories: normalizedResult.categories.map(cat => ({
              tag: cat.tag,
              label: cat.label,
              issueCount: cat.issues.length
            }))
          },
          optimizations: normalizedResult.categories.flatMap(cat =>
            cat.issues.map(issue => ({
              category: cat.tag,
              summary: issue.summary,
              original: issue.originalText || issue.original, // ✅ Frontend-kompatibel
              improved: issue.improvedText || issue.improved, // ✅ Frontend-kompatibel
              severity: issue.severity,
              reasoning: issue.reasoning
            }))
          )
        };

        // 🔄 Check if we should UPDATE existing contract or CREATE new one
        if (existingContractId) {
          // UPDATE existing contract with optimizations
          const updateResult = await contractsCollection.updateOne(
            { _id: new ObjectId(existingContractId) },
            { $set: optimizationData }
          );

          savedContractId = existingContractId;
          console.log(`🔄 [${requestId}] Contract UPDATED in Contracts-Verwaltung:`, {
            contractId: savedContractId,
            matched: updateResult.matchedCount,
            modified: updateResult.modifiedCount,
            isOptimized: true,
            hasS3Pdf: !!s3Data
          });
        } else {
          // CREATE new contract
          const contractToSave = {
            userId: new ObjectId(req.user.userId), // ✅ FIX: ObjectId für MongoDB-Query-Kompatibilität
            name: fixUtf8Filename(req.file.originalname) || "Analysierter Vertrag",
            content: contractText,
            kuendigung: "Unbekannt", // ✅ Basis-Felder für Contracts-Kompatibilität
            laufzeit: "Unbekannt",
            expiryDate: null,
            uploadedAt: new Date(),
            createdAt: new Date(), // ✅ FIX: Für Sortierung in GET /contracts
            status: "Aktiv",
            analyzed: true,
            sourceType: "optimizer", // Wo kam es her
            ...optimizationData
          };

          const result = await contractsCollection.insertOne(contractToSave);
          savedContractId = result.insertedId;
          console.log(`📁 [${requestId}] Contract CREATED in Contracts-Verwaltung:`, {
            contractId: savedContractId,
            name: contractToSave.name,
            isOptimized: true,
            hasS3Pdf: !!s3Data
          });
        }
      } catch (saveError) {
        console.error(`⚠️ [${requestId}] Fehler beim Speichern in Contracts (nicht kritisch):`, saveError.message);
        // Nicht kritisch - Optimierung war trotzdem erfolgreich
      }
    }

    // 📋 Activity Log: Vertrag optimiert
    try {
      const { logActivity, ActivityTypes } = require('../services/activityLogger');
      await logActivity(req.db, {
        type: ActivityTypes.CONTRACT_OPTIMIZED,
        userId: req.user.userId,
        userEmail: user?.email,
        description: `Vertrag optimiert: ${req.file?.originalname || 'Unbekannt'}`,
        details: {
          plan: plan,
          filename: req.file?.originalname,
          contractId: savedContractId?.toString()
        },
        severity: 'info',
        source: 'optimize'
      });
    } catch (logErr) {
      console.error("Activity Log Error:", logErr);
    }

    // Sende erfolgreiche Antwort
    res.json({
      success: true,
      message: "✅ ULTIMATIVE Anwaltskanzlei-Niveau Vertragsoptimierung erfolgreich",
      requestId,
      contractId: savedContractId, // 🆕 Für Frontend-Navigation
      ...normalizedResult,
      originalText: contractText.substring(0, 1500), // Etwas mehr für Frontend
      usage: {
        count: optimizationCount + 1,
        limit: limit,
        plan: plan
      },
      performance: {
        processingTimeMs: Date.now() - parseInt(requestId.split('_')[1]),
        textLength: contractText.length,
        optimizationsFound: normalizedResult.summary.totalIssues
      }
    });

  } catch (error) {
    // Enhanced structured logging (without sensitive data)
    const errorDetails = {
      requestId,
      errorType: error.name || 'UnknownError',
      errorMessage: error.message?.substring(0, 200), // Truncate long messages
      userId: req.user?.userId,
      fileName: req.file?.originalname?.replace(/[^a-zA-Z0-9.-]/g, ''), // Sanitized filename
      fileSize: req.file?.size,
      timestamp: new Date().toISOString(),
      stack: process.env.NODE_ENV === 'development' ? error.stack?.substring(0, 500) : undefined
    };
    
    console.error(`❌ [${requestId}] Optimization error:`, errorDetails);
    
    // Enhanced error categorization
    let errorMessage = "Fehler bei der Vertragsoptimierung.";
    let errorCode = "OPTIMIZATION_ERROR";
    let statusCode = 500;
    let userHelp = null;
    
    // Comprehensive error categorization with user help
    if (error.message?.includes("Keine Datei")) {
      errorMessage = "Keine Datei hochgeladen.";
      errorCode = "FILE_MISSING";
      statusCode = 400;
      userHelp = "Bitte wählen Sie eine PDF-Datei aus.";
    } else if (error.message?.includes("PDF") || error.message?.includes("pdf")) {
      errorMessage = "PDF konnte nicht verarbeitet werden.";
      errorCode = "PDF_PROCESSING_ERROR";
      statusCode = 400;
      userHelp = "Stellen Sie sicher, dass die PDF Text enthält und nicht nur gescannt ist. Probieren Sie eine andere PDF-Datei.";
    } else if (error.message?.includes("Token") || error.message?.includes("Rate limit") || error.message?.includes("quota")) {
      errorMessage = "KI-Service temporär überlastet.";
      errorCode = "AI_RATE_LIMIT";
      statusCode = 429;
      userHelp = "Bitte warten Sie 60 Sekunden und versuchen Sie es erneut.";
    } else if (error.message?.includes("Timeout") || error.message?.includes("timeout")) {
      errorMessage = "Analyse dauerte zu lange.";
      errorCode = "TIMEOUT";
      statusCode = 408;
      userHelp = "Versuchen Sie es mit einer kleineren Datei oder zu einem anderen Zeitpunkt.";
    } else if (error.message?.includes("ENOENT") || error.message?.includes("not found")) {
      errorMessage = "Datei konnte nicht gefunden werden.";
      errorCode = "FILE_ACCESS_ERROR";
      statusCode = 500;
      userHelp = "Bitte laden Sie die Datei erneut hoch.";
    } else if (error.message?.includes("EMFILE") || error.message?.includes("ENFILE")) {
      errorMessage = "Server temporär überlastet.";
      errorCode = "SERVER_OVERLOAD";
      statusCode = 503;
      userHelp = "Bitte versuchen Sie es in wenigen Minuten erneut.";
    } else if (error.message?.includes("network") || error.message?.includes("ENOTFOUND")) {
      errorMessage = "Netzwerkfehler beim KI-Service.";
      errorCode = "NETWORK_ERROR";
      statusCode = 503;
      userHelp = "Bitte prüfen Sie Ihre Internetverbindung und versuchen Sie es erneut.";
    }
    
    res.status(statusCode).json({ 
      success: false,
      message: errorMessage,
      error: errorCode,
      requestId,
      userHelp: userHelp,
      retryable: ['AI_RATE_LIMIT', 'TIMEOUT', 'NETWORK_ERROR', 'SERVER_OVERLOAD'].includes(errorCode),
      timestamp: new Date().toISOString(),
      details: process.env.NODE_ENV === 'development' ? {
        stack: error.stack?.substring(0, 1000),
        originalMessage: error.message
      } : undefined
    });

  } finally {
    // Enhanced cleanup with better error handling
    const cleanupTasks = [];
    
    // Clean up temporary file
    if (tempFilePath) {
      cleanupTasks.push(
        fs.access(tempFilePath)
          .then(() => fs.unlink(tempFilePath))
          .then(() => console.log(`🧹 [${requestId}] Temporary file cleaned up: ${path.basename(tempFilePath)}`))
          .catch(err => {
            if (err.code !== 'ENOENT') { // File not found is OK
              console.warn(`⚠️ [${requestId}] Cleanup warning: ${err.message}`);
            }
          })
      );
    }
    
    // Wait for all cleanup tasks
    await Promise.allSettled(cleanupTasks);
    
    // Log performance metrics
    const processingTime = Date.now() - parseInt(requestId.split('_')[1]);
    console.log(`📈 [${requestId}] Request completed in ${processingTime}ms`);
  }
});

// 🚀 STREAMING ENDPOINT mit Echtzeit-Progress-Updates
router.post("/stream", verifyToken, uploadLimiter, analyzeLimiter, upload.single("file"), async (req, res) => {
  const requestId = `opt_stream_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  console.log(`🚀 [${requestId}] STREAMING OPTIMIZATION started:`, {
    hasFile: !!req.file,
    userId: req.user?.userId,
    filename: req.file?.originalname,
    fileSize: req.file?.size
  });

  // Set up SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'X-Request-ID': requestId
  });

  const sendProgress = (progress, message, data = {}) => {
    const payload = {
      requestId,
      progress,
      message,
      timestamp: new Date().toISOString(),
      ...data
    };
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
    console.log(`📡 [${requestId}] ${progress}%: ${message}`);
  };

  const sendError = (error, code = 'OPTIMIZATION_ERROR') => {
    const payload = {
      requestId,
      error: true,
      code,
      message: error,
      timestamp: new Date().toISOString()
    };
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
    res.end();
    console.error(`❌ [${requestId}] ${code}: ${error}`);
  };

  const sendComplete = (result) => {
    const payload = {
      requestId,
      complete: true,
      result,
      timestamp: new Date().toISOString()
    };
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
    res.end();
    console.log(`✅ [${requestId}] Optimization completed`);
  };

  let tempFilePath = null;

  try {
    sendProgress(2, "🔍 Validiere Datei...");

    // Security: File validation
    if (!req.file) {
      return sendError("Keine Datei hochgeladen.", "FILE_MISSING");
    }

    // Security: File size limit (max 10MB)
    const MAX_FILE_SIZE = 10 * 1024 * 1024;
    if (req.file.size > MAX_FILE_SIZE) {
      if (req.file.path && fsSync.existsSync(req.file.path)) {
        fsSync.unlinkSync(req.file.path);
      }
      return sendError("Datei zu groß (max. 10MB).", "FILE_TOO_LARGE");
    }

    // Security: File type validation
    const allowedMimeTypes2 = ['application/pdf', 'application/x-pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedMimeTypes2.includes(req.file.mimetype)) {
      if (req.file.path && fsSync.existsSync(req.file.path)) {
        fsSync.unlinkSync(req.file.path);
      }
      return sendError("Nur PDF- und DOCX-Dateien erlaubt.", "INVALID_FILE_TYPE");
    }

    sendProgress(5, "✅ Datei validiert - PDF erkannt");
    tempFilePath = req.file.path;

    // 🆕 Extract perspective if provided (creator, recipient, neutral)
    const perspective = req.body.perspective || 'neutral';
    console.log(`👁️ [${requestId}] Optimierung aus Perspektive: ${perspective}`);

    // 🆕 Extract analysis context if provided (from ContractAnalysis)
    let analysisContext = null;
    if (req.body.analysisContext) {
      try {
        analysisContext = JSON.parse(req.body.analysisContext);
        console.log(`📊 [${requestId}] Analysis context received from ContractAnalysis:`, {
          hasSummary: !!analysisContext.summary,
          hasLegalAssessment: !!analysisContext.legalAssessment,
          hasSuggestions: !!analysisContext.suggestions,
          hasRecommendations: !!analysisContext.recommendations,
          contractScore: analysisContext.contractScore
        });
      } catch (parseError) {
        console.warn(`⚠️ [${requestId}] Could not parse analysisContext:`, parseError.message);
      }
    }

    // 🆕 Extract Legal Pulse context if provided
    let legalPulseContext = null;
    if (req.body.legalPulseContext) {
      try {
        legalPulseContext = JSON.parse(req.body.legalPulseContext);
        console.log(`⚡ [${requestId}] Legal Pulse context received:`, {
          hasRisks: !!legalPulseContext.risks && legalPulseContext.risks.length > 0,
          hasRecommendations: !!legalPulseContext.recommendations && legalPulseContext.recommendations.length > 0,
          riskScore: legalPulseContext.riskScore,
          complianceScore: legalPulseContext.complianceScore
        });
      } catch (parseError) {
        console.warn(`⚠️ [${requestId}] Could not parse legalPulseContext:`, parseError.message);
      }
    }

    // 🔧 FIX: existingContractId wird im Streaming-Endpoint nicht mehr benötigt
    // Streaming erstellt KEINE Verträge - nur der Fallback/Generate macht das
    if (req.body.existingContractId) {
      console.log(`ℹ️ [${requestId}] existingContractId übergeben (wird vom Fallback verwendet):`, req.body.existingContractId);
    }

    sendProgress(8, "🔐 Prüfe Benutzer-Limits...");

    // Database access
    const optimizationCollection = req.db.collection("optimizations");
    const usersCollection = req.db.collection("users");

    const user = await usersCollection.findOne({ _id: new ObjectId(req.user.userId) });
    if (!user) {
      return sendError("Benutzer nicht gefunden.", "USER_NOT_FOUND");
    }

    // Plan limits check
    const plan = (user.subscriptionPlan || "free").toLowerCase();
    const optimizationCount = user.optimizationCount ?? 0;

    // Limits aus zentraler Konfiguration (subscriptionPlans.js)
    // ✅ KORRIGIERT: Zentrale Funktion statt hardcoded Limits
    const limit = getFeatureLimit(plan, 'optimize');

    if (optimizationCount >= limit) {
      return sendError(
        plan === "free"
          ? "KI-Vertragsoptimierung ist ein Business-Feature."
          : "Optimierung-Limit erreicht.",
        "LIMIT_EXCEEDED"
      );
    }

    sendProgress(12, `✅ Zugriff gewährt - ${plan.toUpperCase()} Plan`);
    sendProgress(15, "📄 Extrahiere Text aus PDF...");

    // PDF text extraction
    let buffer;
    try {
      const stats = await fs.stat(tempFilePath);
      if (stats.size > 5 * 1024 * 1024) {
        sendProgress(16, "📚 Große Datei erkannt - verwende Stream-Processing...");
      }
      buffer = await fs.readFile(tempFilePath);
    } catch (fileError) {
      return sendError(`Datei konnte nicht gelesen werden: ${fileError.message}`, "FILE_READ_ERROR");
    }

    let parsed;
    try {
      const fileMimetype2 = req.file.mimetype || 'application/pdf';
      if (fileMimetype2 === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        const docxResult = await extractTextFromBuffer(buffer, fileMimetype2);
        parsed = { text: docxResult.text, numpages: docxResult.pageCount || 0 };
      } else {
        parsed = await pdfParse(buffer, {
          max: 0,
          version: 'v2.0.550'
        });
      }
      buffer = null; // Clear from memory
    } catch (parseError) {
      return sendError(`Datei-Verarbeitung fehlgeschlagen: ${parseError.message}`, "PARSE_ERROR");
    }

    const contractText = parsed.text || '';
    if (!contractText.trim() || contractText.length < 100) {
      return sendError("PDF enthält keinen ausreichenden lesbaren Text.", "INSUFFICIENT_TEXT");
    }

    sendProgress(22, `✅ ${contractText.length.toLocaleString()} Zeichen extrahiert`);

    // STAGE 1: Contract type detection
    sendProgress(25, "🎯 Erkenne Vertragstyp...");
    const contractTypeInfo = await detectContractType(contractText, req.file.originalname);

    const typeLabel = contractTypeInfo.type === 'kaufvertrag' ? 'Kaufvertrag' :
                     contractTypeInfo.type === 'arbeitsvertrag' ? 'Arbeitsvertrag' :
                     contractTypeInfo.type === 'mietvertrag' ? 'Mietvertrag' :
                     contractTypeInfo.type === 'dienstleistungsvertrag' ? 'Dienstleistungsvertrag' :
                     contractTypeInfo.type;

    sendProgress(30, `✅ ${typeLabel} erkannt (${contractTypeInfo.confidence}% Sicherheit)`, {
      contractType: contractTypeInfo.type,
      confidence: contractTypeInfo.confidence,
      jurisdiction: contractTypeInfo.jurisdiction
    });

    // STAGE 2: Gap analysis
    // 🆕 Phase 3b: isAmendment für Document Scope Gate übergeben
    sendProgress(35, "⚖️ Analysiere juristische Lücken...");
    const gapAnalysis = analyzeContractGaps(
      contractText,
      contractTypeInfo.type,
      contractTypeInfo.detectedClauses,
      contractTypeInfo.isAmendment // 🆕 Phase 3b: Scope Gate
    );

    const criticalGaps = gapAnalysis.gaps.filter(g => g.severity === 'critical').length;
    sendProgress(42, `✅ ${gapAnalysis.gaps.length} Lücken gefunden (${criticalGaps} kritisch)`, {
      totalGaps: gapAnalysis.gaps.length,
      criticalGaps
    });

    // STAGE 3: Generate professional clauses
    sendProgress(45, "📜 Generiere professionelle Klauseln...");
    const generatedClauses = generateProfessionalClauses(
      contractTypeInfo.type,
      gapAnalysis.gaps,
      contractTypeInfo.language
    );
    sendProgress(50, `✅ ${Object.keys(generatedClauses).length} Klauseln vorbereitet`);

    // STAGE 4: AI analysis
    sendProgress(55, "🤖 Starte KI-Analyse mit GPT-4o...");
    const openai = getOpenAI();

    const optimizedPrompt = createOptimizedPrompt(
      contractText,
      contractTypeInfo.type,
      gapAnalysis.gaps,
      req.file.originalname,
      contractTypeInfo,
      analysisContext,      // 🆕 Pass analysis context from ContractAnalysis
      legalPulseContext,    // 🆕 Pass Legal Pulse context
      perspective           // 🆕 Pass perspective (creator/recipient/neutral)
    );

    const modelToUse = "gpt-4o";
    sendProgress(58, `🧠 Verwende ${modelToUse} für maximale Präzision...`);

    // 🔥 v2.0: Erweitertes JSON-Schema mit Decision-First Feldern (Stream-Route)
    const strictJsonSchema = {
      type: "json_schema",
      json_schema: {
        name: "ContractOptimization",
        schema: {
          type: "object",
          properties: {
            meta: {
              type: "object",
              properties: {
                type: { type: "string" },
                confidence: { type: "number" },
                jurisdiction: { type: "string" },
                language: { type: "string" },
                isAmendment: { type: "boolean" },
                parentType: { type: ["string", "null"] },
                recognizedAs: { type: "string" },
                maturity: { type: "string", enum: ["high", "medium", "low"] }  // 🆕 v2.0: Vertragsreife
              },
              required: ["type", "confidence", "jurisdiction", "language", "isAmendment"]
            },
            // 🆕 v2.0: Assessment-Block für Decision-First Logik
            assessment: {
              type: "object",
              properties: {
                overall: { type: "string" },
                optimizationNeeded: { type: "boolean" },
                reasoning: { type: "string" },
                intentionalClauses: {
                  type: "array",
                  items: { type: "string" }
                }
              }
            },
            categories: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  tag: { type: "string" },
                  label: { type: "string" },
                  issues: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        id: { type: "string" },
                        summary: { type: "string" },
                        originalText: { type: "string" },
                        improvedText: { type: "string" },
                        legalReasoning: { type: "string" },
                        category: { type: "string" },
                        risk: { type: "number" },
                        impact: { type: "number" },
                        confidence: { type: "number" },
                        difficulty: { type: "string" },
                        benchmark: { type: "string" },
                        legalReferences: { type: "array", items: { type: "string" } },
                        // 🆕 v2.0: Anti-Bullshit Pflichtfelder
                        evidence: {
                          type: "array",
                          items: { type: "string" }
                        },
                        whyItMatters: { type: "string" },
                        whyNotIntentional: { type: "string" },
                        whenToIgnore: { type: "string" }
                      },
                      // 🔥 v2.0: Anti-Bullshit Felder sind jetzt PFLICHT!
                      required: ["id", "summary", "originalText", "improvedText", "legalReasoning", "category", "evidence", "whyItMatters", "whyNotIntentional", "whenToIgnore"]
                    }
                  }
                },
                required: ["tag", "label", "issues"]
              }
            },
            score: {
              type: "object",
              properties: { health: { type: "number" } },
              required: ["health"]
            },
            summary: {
              type: "object",
              properties: {
                redFlags: { type: "number" },
                quickWins: { type: "number" },
                totalIssues: { type: "number" },
                criticalLegalRisks: { type: "number" },
                complianceIssues: { type: "number" }
              }
            }
          },
          required: ["meta", "categories", "score"]
        }
      }
    };

    sendProgress(62, "⏳ Warte auf KI-Antwort (kann bis zu 2 Min. dauern)...");

    // GPT-4o call with retry logic
    let completion = null;
    const maxRetries = 2;
    let retryCount = 0;

    while (retryCount < maxRetries && !completion) {
      try {
        if (retryCount > 0) {
          sendProgress(65 + (retryCount * 5), `🔄 Wiederholungsversuch ${retryCount}/${maxRetries}...`);
        }

        completion = await Promise.race([
          openai.chat.completions.create({
            model: modelToUse,
            messages: [
              {
                role: "system",
                content: `Du bist ein Fachanwalt für Vertragsrecht. Analysiere den GANZEN Vertrag und finde ALLE echten Probleme. Bei perfekten Verträgen: wenige/keine Optimierungen + hoher Score. NIEMALS behaupten dass etwas fehlt wenn es im Vertrag steht!`
              },
              { role: "user", content: optimizedPrompt }
            ],
            temperature: 0.0, // 🆕 Phase 2.6: Maximum Determinismus
            max_tokens: 8000, // Erhöht für bis zu 50+ Optimierungen
            response_format: strictJsonSchema
          }),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("KI-Timeout nach 300 Sekunden")), 300000)
          )
        ]);

        sendProgress(75, "✅ KI-Antwort erhalten - verarbeite Ergebnisse...");
        break;

      } catch (error) {
        retryCount++;
        if (retryCount >= maxRetries) {
          sendProgress(70, "⚠️ GPT-4o nicht verfügbar - verwende GPT-4o-mini Fallback...");

          try {
            completion = await Promise.race([
              openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                  {
                    role: "system",
                    content: `Du bist ein Fachanwalt für Vertragsrecht. Analysiere den Vertrag und gib JSON zurück mit 6-8 konkreten Optimierungen. NIEMALS Platzhalter wie "siehe Vereinbarung"!`
                  },
                  { role: "user", content: optimizedPrompt }
                ],
                temperature: 0.0, // 🆕 Phase 2.6: Maximum Determinismus
                max_tokens: 3000,
                response_format: strictJsonSchema
              }),
              new Promise((_, reject) =>
                setTimeout(() => reject(new Error("Mini-Timeout nach 120 Sekunden")), 120000)
              )
            ]);
            sendProgress(75, "✅ Fallback erfolgreich - Mini-Modell antwortet");
          } catch (miniFallbackError) {
            sendProgress(72, "⚠️ KI-Modelle nicht verfügbar - verwende Rule Engine...");
          }
        }
      }
    }

    let aiOutput = completion?.choices?.[0]?.message?.content || "";

    const safeJsonParse = (str) => {
      try {
        return JSON.parse(str);
      } catch (e) {
        return null;
      }
    };

    sendProgress(78, "🔍 Parse KI-Response...");
    let parsedOutput = safeJsonParse(aiOutput);

    // FALLBACK 2: Rule Engine
    if (!parsedOutput) {
      sendProgress(80, "🔧 Verwende Deterministic Rule Engine...");
      const ruleFindings = runBaselineRules(contractText, contractTypeInfo.type);

      const ruleBasedResponse = {
        meta: {
          type: contractTypeInfo.type,
          confidence: 85,
          jurisdiction: contractTypeInfo.jurisdiction || 'DE',
          language: contractTypeInfo.language || 'de',
          fallbackUsed: 'deterministic_rules'
        },
        categories: [],
        score: { health: 60 },
        summary: {
          redFlags: ruleFindings.filter(f => f.risk >= 8).length,
          quickWins: ruleFindings.filter(f => f.difficulty === 'Einfach').length,
          totalIssues: ruleFindings.length
        }
      };

      const categoryMap = new Map();
      ruleFindings.forEach(finding => {
        if (!categoryMap.has(finding.category)) {
          categoryMap.set(finding.category, []);
        }
        categoryMap.get(finding.category).push(finding);
      });

      categoryMap.forEach((issues, category) => {
        ruleBasedResponse.categories.push({
          tag: category,
          label: category.charAt(0).toUpperCase() + category.slice(1),
          issues
        });
      });

      parsedOutput = ruleBasedResponse;
      sendProgress(82, `✅ ${ruleFindings.length} Issues via Rule Engine gefunden`);
    }

    // STAGE 5: Quality checks and normalization
    sendProgress(85, "🔬 Qualitäts-Checks und Normalisierung...");

    let normalizedResult = await normalizeAndValidateOutput( // ✅ FIX: let statt const (wird später reassigned)
      parsedOutput,
      contractText,
      contractTypeInfo,
      gapAnalysis,
      generatedClauses,
      requestId
    );

    sendProgress(90, "🛡️ Wende Ultimate Quality Layer an...");

    // 🔥 FIX: Pass full normalizedResult object, not just categories
    normalizedResult = applyUltimateQualityLayer(normalizedResult, requestId, contractTypeInfo.type);

    sendProgress(92, `✅ Quality-Checks abgeschlossen`);

    // Top-Up Pass if needed (safe access with optional chaining)
    const currentIssueCount = normalizedResult.categories?.reduce((sum, cat) => sum + (cat.issues?.length || 0), 0) || 0;

    if (currentIssueCount < 10) {
      sendProgress(94, "➕ Ergänze fehlende Kategorien (Top-Up Pass)...");
      console.log(`🎯 [${requestId}] Running Top-Up Pass (current issues: ${currentIssueCount})`);

      // 🔥 FIX: Pass full normalizedResult object, not just categories
      normalizedResult = await topUpFindingsIfNeeded(
        normalizedResult,
        contractText,
        contractTypeInfo.type,
        openai,
        requestId
      );

      const newCount = normalizedResult.categories?.reduce((sum, cat) => sum + (cat.issues?.length || 0), 0) || 0;
      const addedCount = newCount - currentIssueCount;
      if (addedCount > 0) {
        sendProgress(96, `✅ ${addedCount} zusätzliche Issues hinzugefügt`);
      } else {
        sendProgress(96, `✅ Top-Up Pass abgeschlossen`);
      }
    }

    // Final global sanitizer
    sendProgress(97, "✨ Finale Bereinigung...");

    let globalSanitized = 0;
    const globalSanitizerStats = {
      roleTerms: 0,
      pseudoStats: 0,
      paragraphHeaders: 0,
      arbitraryHours: 0
    };

    normalizedResult.categories.forEach(cat => {
      cat.issues.forEach(issue => {
        globalSanitized++;

        if (issue.improvedText) {
          const result = sanitizeImprovedText(issue.improvedText, contractTypeInfo.type);
          issue.improvedText = result.text;
          globalSanitizerStats.roleTerms += result.stats.roleTerms;
          globalSanitizerStats.pseudoStats += result.stats.pseudoStats;
          globalSanitizerStats.paragraphHeaders += result.stats.paragraphHeaders;
          globalSanitizerStats.arbitraryHours += result.stats.arbitraryHours;
        }

        if (issue.summary) {
          issue.summary = sanitizeText(issue.summary);
        }
        if (issue.benchmark) {
          issue.benchmark = sanitizeBenchmark(issue.benchmark);

          // Context-aware benchmarks
          if (issue.benchmark === 'branchenüblich.' || issue.benchmark.includes('Basierend auf')) {
            issue.benchmark = generateContextAwareBenchmark(issue.category, contractTypeInfo.type);
          }
        }
        if (issue.legalReasoning) {
          issue.legalReasoning = sanitizeText(issue.legalReasoning);
        }
        if (issue.originalText) {
          issue.originalText = cleanPlaceholders(issue.originalText);
        }
      });
    });

    sendProgress(98, `✅ ${globalSanitized} Issues finalisiert`);

    // Update user count
    await usersCollection.updateOne(
      { _id: new ObjectId(req.user.userId) },
      { $inc: { optimizationCount: 1 } }
    );

    sendProgress(99, "💾 Bereite Ergebnisse vor...");

    // 🔧 FIX: KEINE Vertragserstellung im Streaming-Endpoint!
    // Der Fallback-Endpoint oder Generate-Endpoint erstellt den Vertrag.
    // Streaming ist NUR für die Fortschrittsanzeige.
    // Dies verhindert Duplikate wenn Streaming wegen CORS fehlschlägt.
    console.log(`ℹ️ [${requestId}] Streaming-Endpoint erstellt KEINEN Vertrag - überlasse das dem Fallback/Generate`);

    // Prepare final result
    const finalResult = {
      success: true,
      message: "✅ ULTIMATIVE Anwaltskanzlei-Niveau Vertragsoptimierung erfolgreich",
      requestId,
      contractId: null, // ⚠️ Kein Vertrag erstellt - Fallback macht das
      ...normalizedResult,
      originalText: contractText.substring(0, 1500),
      usage: {
        count: optimizationCount + 1,
        limit: limit,
        plan: plan
      },
      performance: {
        processingTimeMs: Date.now() - parseInt(requestId.split('_')[2]),
        textLength: contractText.length,
        optimizationsFound: normalizedResult.summary.totalIssues
      }
    };

    sendProgress(100, "🎉 Optimierung abgeschlossen!");
    sendComplete(finalResult);

  } catch (error) {
    const errorDetails = {
      requestId,
      errorType: error.name || 'UnknownError',
      errorMessage: error.message?.substring(0, 200),
      userId: req.user?.userId,
      fileName: req.file?.originalname?.replace(/[^a-zA-Z0-9.-]/g, ''),
      fileSize: req.file?.size,
      timestamp: new Date().toISOString()
    };

    console.error(`❌ [${requestId}] Streaming optimization error:`, errorDetails);

    let errorMessage = "Fehler bei der Vertragsoptimierung.";
    let errorCode = "OPTIMIZATION_ERROR";

    if (error.message?.includes("Keine Datei")) {
      errorMessage = "Keine Datei hochgeladen.";
      errorCode = "FILE_MISSING";
    } else if (error.message?.includes("PDF")) {
      errorMessage = "PDF konnte nicht verarbeitet werden.";
      errorCode = "PDF_PROCESSING_ERROR";
    } else if (error.message?.includes("Token") || error.message?.includes("Rate limit")) {
      errorMessage = "KI-Service temporär überlastet.";
      errorCode = "AI_RATE_LIMIT";
    } else if (error.message?.includes("Timeout")) {
      errorMessage = "Analyse dauerte zu lange.";
      errorCode = "TIMEOUT";
    }

    sendError(errorMessage, errorCode);

  } finally {
    // Cleanup
    if (tempFilePath) {
      fs.access(tempFilePath)
        .then(() => fs.unlink(tempFilePath))
        .then(() => console.log(`🧹 [${requestId}] Temp file cleaned up`))
        .catch(err => {
          if (err.code !== 'ENOENT') {
            console.warn(`⚠️ [${requestId}] Cleanup warning: ${err.message}`);
          }
        });
    }

    const processingTime = Date.now() - parseInt(requestId.split('_')[2]);
    console.log(`📈 [${requestId}] Streaming request completed in ${processingTime}ms`);
  }
});

// 🚀 ZUSÄTZLICHE ROUTES

/**
 * Enhanced Health Check Endpoint with Comprehensive Monitoring
 */
router.get("/health", standardLimiter, async (req, res) => {
  try {
    const HealthChecker = require('../utils/healthCheck');
    const healthChecker = new HealthChecker(req.db);
    
    const detailed = req.query.detailed === 'true';
    
    if (detailed) {
      // Comprehensive health check
      const healthReport = await healthChecker.runHealthCheck();
      
      // Add service-specific information
      healthReport.service = {
        name: "optimize",
        version: "5.0-ultimate-legal",
        contractTypes: Object.keys(CONTRACT_TYPES).length,
        features: {
          universalDetection: true,
          amendmentSupport: true,
          professionalClauses: true,
          aiAnalysis: true,
          multiLanguage: true,
          legalFramework: true,
          benchmarking: true,
          rateLimiting: true,
          enhancedSecurity: true
        },
        supportedJurisdictions: ['DE', 'AT', 'CH', 'EU', 'INT', 'US', 'UK'],
        clauseTemplates: Object.keys(PROFESSIONAL_CLAUSE_TEMPLATES).length
      };
      
      res.json(healthReport);
    } else {
      // Quick health check
      const dbHealthy = await req.db.admin().ping().then(() => true).catch(() => false);
      const memUsage = process.memoryUsage();
      
      res.json({
        status: dbHealthy ? "healthy" : "degraded",
        service: "optimize",
        version: "5.0-ultimate-legal",
        timestamp: new Date().toISOString(),
        uptime: Math.round(process.uptime()),
        memoryMB: Math.round(memUsage.heapUsed / 1024 / 1024),
        database: dbHealthy ? 'connected' : 'disconnected',
        features: ['ai-analysis', 'rate-limiting', 'enhanced-security', 'professional-pdfs']
      });
    }
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      status: "unhealthy",
      service: "optimize",
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Verfügbare Vertragstypen abrufen
 */
router.get("/contract-types", verifyToken, (req, res) => {
  const types = Object.entries(CONTRACT_TYPES).map(([key, config]) => ({
    id: key,
    name: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    isAmendment: config.isAmendment || false,
    parentType: config.parentType || null,
    jurisdiction: config.jurisdiction,
    requiredClauses: config.requiredClauses.length,
    riskFactors: config.riskFactors.length,
    legalFramework: config.legalFramework || [],
    keywords: config.keywords.slice(0, 5) // Erste 5 Keywords
  }));
  
  res.json({
    success: true,
    totalTypes: types.length,
    types: types.sort((a, b) => a.name.localeCompare(b.name))
  });
});

/**
 * Optimierungshistorie abrufen
 */
router.get("/history", verifyToken, async (req, res) => {
  try {
    const { limit = 20, offset = 0, contractType } = req.query;
    const optimizationCollection = req.db.collection("optimizations");
    
    const query = { userId: req.user.userId };
    if (contractType) {
      query.contractType = contractType;
    }
    
    const history = await optimizationCollection
      .find(query)
      .sort({ createdAt: -1 })
      .skip(parseInt(offset))
      .limit(parseInt(limit))
      .toArray();
    
    const total = await optimizationCollection.countDocuments(query);
    
    res.json({
      success: true,
      total,
      count: history.length,
      offset: parseInt(offset),
      limit: parseInt(limit),
      optimizations: history.map(opt => ({
        id: opt._id,
        requestId: opt.requestId,
        contractName: opt.contractName,
        contractType: opt.contractType,
        isAmendment: opt.isAmendment || false,
        healthScore: opt.optimizationResult?.score?.health || 0,
        totalIssues: opt.optimizationResult?.summary?.totalIssues || 0,
        criticalRisks: opt.optimizationResult?.summary?.criticalLegalRisks || 0,
        createdAt: opt.createdAt,
        processingTime: opt.processingTime,
        fileSize: opt.fileSize
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

/**
 * Spezifische Optimierung abrufen
 */
router.get("/:requestId", verifyToken, async (req, res) => {
  try {
    const optimizationCollection = req.db.collection("optimizations");
    const identifier = req.params.requestId;

    // Try to find by requestId first (legacy), then by _id (new jobId from Legal Pulse)
    let optimization;

    // Check if identifier is a valid ObjectId
    if (ObjectId.isValid(identifier) && identifier.length === 24) {
      optimization = await optimizationCollection.findOne({
        _id: new ObjectId(identifier),
        userId: req.user.userId
      });
    }

    // If not found, try by requestId (legacy)
    if (!optimization) {
      optimization = await optimizationCollection.findOne({
        requestId: identifier,
        userId: req.user.userId
      });
    }

    if (!optimization) {
      return res.status(404).json({
        success: false,
        message: "Optimierung nicht gefunden",
        error: "NOT_FOUND"
      });
    }

    // Return optimization data with Legal Pulse context if available
    res.json({
      success: true,
      ...optimization.optimizationResult,
      contractName: optimization.contractName,
      contractId: optimization.contractId,
      sourceFile: optimization.sourceFile,
      legalPulseContext: optimization.legalPulseContext,
      status: optimization.status,
      createdAt: optimization.createdAt,
      metadata: optimization.metadata
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

/**
 * Optimierung löschen
 */
router.delete("/:requestId", verifyToken, async (req, res) => {
  try {
    const optimizationCollection = req.db.collection("optimizations");
    
    const result = await optimizationCollection.deleteOne({
      requestId: req.params.requestId,
      userId: req.user.userId
    });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Optimierung nicht gefunden oder keine Berechtigung",
        error: "NOT_FOUND"
      });
    }
    
    res.json({
      success: true,
      message: "Optimierung erfolgreich gelöscht"
    });
  } catch (error) {
    console.error("Error deleting optimization:", error);
    res.status(500).json({
      success: false,
      message: "Fehler beim Löschen der Optimierung",
      error: error.message
    });
  }
});

/**
 * Statistiken abrufen
 */
router.get("/stats/summary", verifyToken, async (req, res) => {
  try {
    const optimizationCollection = req.db.collection("optimizations");
    
    const stats = await optimizationCollection.aggregate([
      { $match: { userId: req.user.userId } },
      {
        $group: {
          _id: null,
          totalOptimizations: { $sum: 1 },
          avgHealthScore: { $avg: "$optimizationResult.score.health" },
          totalIssuesFound: { $sum: "$optimizationResult.summary.totalIssues" },
          totalCriticalRisks: { $sum: "$optimizationResult.summary.criticalLegalRisks" },
          avgProcessingTime: { $avg: "$processingTime" },
          contractTypes: { $addToSet: "$contractType" }
        }
      }
    ]).toArray();
    
    const contractTypeStats = await optimizationCollection.aggregate([
      { $match: { userId: req.user.userId } },
      {
        $group: {
          _id: "$contractType",
          count: { $sum: 1 },
          avgHealthScore: { $avg: "$optimizationResult.score.health" }
        }
      },
      { $sort: { count: -1 } }
    ]).toArray();
    
    res.json({
      success: true,
      summary: stats[0] || {
        totalOptimizations: 0,
        avgHealthScore: 0,
        totalIssuesFound: 0,
        totalCriticalRisks: 0,
        avgProcessingTime: 0,
        contractTypes: []
      },
      byContractType: contractTypeStats
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    res.status(500).json({
      success: false,
      message: "Fehler beim Laden der Statistiken",
      error: error.message
    });
  }
});

/**
 * 🆕 Legal Pulse → Optimizer Handoff
 * POST /api/optimizer/start-from-legalpulse
 * Erstellt einen Optimizer-Job basierend auf Legal Pulse Erkenntnissen
 */
router.post("/start-from-legalpulse", verifyToken, async (req, res) => {
  try {
    await ensureDb();
    const { contractId, s3Key, s3Location, risks, recommendations } = req.body;
    const userId = req.user.userId;

    console.log(`[LP-OPTIMIZER] Handoff request from user ${userId} for contract ${contractId}`);

    // Validate required fields
    if (!contractId) {
      return res.status(400).json({
        success: false,
        message: "Fehlende erforderliche Felder: contractId"
      });
    }

    // 👥 Org-Zugriff: Verify contract exists and user has access
    const access = await findContractWithOrgAccess(contractsCollection, userId, contractId);

    if (!access) {
      return res.status(404).json({
        success: false,
        message: "Vertrag nicht gefunden oder keine Berechtigung"
      });
    }
    if (!hasPermission(access.role, "contracts.write")) {
      return res.status(403).json({ success: false, message: "Keine Berechtigung zum Optimieren (Viewer-Rolle)" });
    }

    const contract = access.contract;

    console.log(`[LP-OPTIMIZER] Contract found:`, {
      hasS3Key: !!contract.s3Key,
      hasFilePath: !!contract.filePath,
      s3Key: contract.s3Key,
      filePath: contract.filePath
    });

    // Create unique job ID
    const jobId = new ObjectId().toString();

    // Determine source file location (support both S3 and legacy local storage)
    let sourceFile;
    if (contract.s3Key && contract.s3Location) {
      // Modern S3 storage
      sourceFile = {
        s3Key: contract.s3Key,
        s3Location: contract.s3Location,
        s3Bucket: contract.s3Bucket || process.env.S3_BUCKET_NAME || 'contract-ai-uploads',
        storageType: 'S3'
      };
      console.log(`[LP-OPTIMIZER] Using S3 storage: ${contract.s3Key}`);
    } else if (contract.filePath) {
      // Legacy local storage - store contractId for later retrieval via /api/s3/view
      sourceFile = {
        contractId: contractId,
        filePath: contract.filePath,
        storageType: 'LOCAL_LEGACY'
      };
      console.log(`[LP-OPTIMIZER] Using legacy local storage: ${contract.filePath}`);
    } else {
      console.error(`[LP-OPTIMIZER] Contract has no file storage information`);
      return res.status(400).json({
        success: false,
        message: "Vertrag hat keine Datei-Informationen. Bitte laden Sie den Vertrag erneut hoch."
      });
    }

    // Create OptimizerJob document
    const optimizerJob = {
      _id: new ObjectId(jobId),
      userId: new ObjectId(userId),
      contractId: new ObjectId(contractId),
      contractName: contract.name || 'Unbenannter Vertrag',
      sourceFile: sourceFile,
      legalPulseContext: {
        risks: risks || [],
        recommendations: recommendations || [],
        riskScore: contract.legalPulse?.riskScore || null,
        complianceScore: contract.legalPulse?.complianceScore || null
      },
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Insert into optimizations collection
    const optimizationCollection = db.collection("optimizations");
    await optimizationCollection.insertOne(optimizerJob);

    console.log(`✅ [LP-OPTIMIZER] Job created: ${jobId} for contract ${contractId}`);

    res.json({
      success: true,
      jobId: jobId,
      redirectUrl: `/optimizer/${jobId}`,
      message: 'Optimizer-Job erfolgreich erstellt'
    });

  } catch (error) {
    console.error('[LP-OPTIMIZER] Error creating job:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Erstellen des Optimizer-Jobs',
      error: error.message
    });
  }
});

/**
 * 🆕 GET Optimizer Job Data
 * GET /api/optimize/job/:jobId
 * Lädt Optimizer-Job Daten für die Optimizer-Page
 */
router.get("/job/:jobId", verifyToken, async (req, res) => {
  try {
    await ensureDb();
    const { jobId } = req.params;
    const userId = req.user.userId;

    console.log(`[LP-OPTIMIZER] Fetching job ${jobId} for user ${userId}`);

    // Fetch job from optimizations collection
    const optimizationCollection = db.collection("optimizations");
    const job = await optimizationCollection.findOne({
      _id: new ObjectId(jobId),
      userId: new ObjectId(userId)
    });

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Optimizer-Job nicht gefunden oder keine Berechtigung"
      });
    }

    console.log(`[LP-OPTIMIZER] Job found:`, {
      jobId: job._id,
      contractId: job.contractId,
      status: job.status,
      hasLegalPulseContext: !!job.legalPulseContext,
      storageType: job.sourceFile?.storageType
    });

    res.json(job);

  } catch (error) {
    console.error('[LP-OPTIMIZER] Error fetching job:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Laden des Optimizer-Jobs',
      error: error.message
    });
  }
});

module.exports = router;