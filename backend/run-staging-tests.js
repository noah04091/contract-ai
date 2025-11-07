// 🧪 Automatisierte Staging-Tests für V2 System
// Führt 36 Testfälle aus (12 Vertragstypen × 3 Varianten)

// WICHTIG: dotenv MUSS als erstes geladen werden, bevor andere Module geladen werden
// da generateV2.js beim Import bereits den OpenAI Client instantiiert
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const { MongoClient } = require('mongodb');
const { generateContractV2 } = require('./routes/generateV2');
const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;

const execAsync = promisify(exec);

// Konfiguration
const DEFAULT_RUN_LABEL = 'staging-2025-11-05';
const DEFAULT_CONCURRENCY = 3;
const DEFAULT_TIMEOUT_MS = 90000; // 90s (erhöht für komplexe Typen wie darlehen)
const BATCH_PAUSE_MS = 1000; // 1s zwischen Batches

// Test User ID (mock)
const TEST_USER_ID = '507f1f77bcf86cd799439011';

// ===== TESTDATEN-DEFINITIONEN =====

const TEST_CASES = {
  // 1. Mietvertrag
  mietvertrag: [
    {
      variant: 'standard',
      input: {
        parteiA: { name: 'Max Mustermann', address: 'Hauptstraße 1, 10115 Berlin' },
        parteiB: { name: 'Maria Schmidt', address: 'Nebenstraße 2, 10115 Berlin' },
        mietgegenstand: 'Wohnung im 2. OG, 85 qm, 3 Zimmer',
        miete: '950,00 EUR',
        nebenkosten: '200,00 EUR',
        kaution: '2.850,00 EUR',
        mietbeginn: '01.01.2025',
        mietdauer: 'unbefristet',
        customRequirements: ''
      }
    },
    {
      variant: 'sonderklausel',
      input: {
        parteiA: { name: 'Peter Müller', address: 'Gartenstraße 5, 80331 München' },
        parteiB: { name: 'Anna Weber', address: 'Parkweg 12, 80331 München' },
        mietgegenstand: 'Wohnung im EG, 70 qm, 2 Zimmer mit Gartennutzung',
        miete: '1.200,00 EUR',
        nebenkosten: '180,00 EUR',
        kaution: '3.600,00 EUR',
        mietbeginn: '15.02.2025',
        mietdauer: 'unbefristet',
        customRequirements: 'Haustiere (Katzen) sind nach Rücksprache erlaubt. Gartennutzung ist im Vertrag zu regeln.'
      }
    },
    {
      variant: 'edge_case',
      input: {
        parteiA: { name: 'Klaus Fischer', address: 'Waldweg 3, 60311 Frankfurt' },
        parteiB: { name: 'Lisa Bauer', address: 'Seestraße 8, 60311 Frankfurt' },
        mietgegenstand: 'Wohnung, 65 qm',
        miete: '800 EUR', // Edge: Ohne Nachkommastellen
        nebenkosten: '150,00 EUR',
        kaution: '2.400,00 EUR',
        mietbeginn: '32.13.2025', // Edge: Ungültiges Datum
        mietdauer: 'befristet bis 31.12.2027'
      }
    }
  ],

  // 2. Freelancer
  freelancer: [
    {
      variant: 'standard',
      input: {
        parteiA: { name: 'Tech GmbH', address: 'Innovationsstraße 10, 10117 Berlin' },
        parteiB: { name: 'Jan Entwickler', address: 'Codestraße 5, 10117 Berlin' },
        leistungsbeschreibung: 'Entwicklung einer React-Webanwendung mit Backend-API',
        vergütung: '95,00 EUR pro Stunde',
        zahlungsbedingungen: 'Monatliche Abrechnung, Zahlung innerhalb 14 Tage',
        projektdauer: '01.01.2025 bis 30.06.2025',
        customRequirements: ''
      }
    },
    {
      variant: 'sonderklausel',
      input: {
        parteiA: { name: 'Design Studio XY', address: 'Kreativplatz 7, 20095 Hamburg' },
        parteiB: { name: 'Sarah Designerin', address: 'Kunstweg 2, 20095 Hamburg' },
        leistungsbeschreibung: 'UI/UX Design und Branding für Mobile App',
        vergütung: '80,00 EUR pro Stunde',
        zahlungsbedingungen: 'Wöchentliche Abrechnung',
        projektdauer: '15.01.2025 bis 15.04.2025',
        customRequirements: 'Urheberrechte verbleiben teilweise beim Auftragnehmer für Portfolio-Nutzung. Homeoffice ist Standard.'
      }
    },
    {
      variant: 'edge_case',
      input: {
        parteiA: { name: 'Startup ABC', address: 'Gründerstraße 1, 50667 Köln' },
        parteiB: { name: 'Tom Freelancer' }, // Edge: Fehlende Adresse
        leistungsbeschreibung: 'Beratung und Projektmanagement',
        vergütung: '120 EUR pro Stunde', // Edge: Ohne Nachkommastellen
        zahlungsbedingungen: 'Nach Projektabschluss',
        projektdauer: 'offen' // Edge: Unklare Dauer
      }
    }
  ],

  // 3. Kaufvertrag
  kaufvertrag: [
    {
      variant: 'standard',
      input: {
        parteiA: { name: 'Auto Meyer GmbH', address: 'Autostraße 20, 70173 Stuttgart' },
        parteiB: { name: 'Michael Käufer', address: 'Fahrerweg 5, 70173 Stuttgart' },
        kaufgegenstand: 'PKW BMW 320d, Baujahr 2020, 50.000 km',
        kaufpreis: '25.000,00 EUR',
        übergabetermin: '01.02.2025',
        zahlungsmodalitäten: 'Barzahlung bei Übergabe',
        customRequirements: ''
      }
    },
    {
      variant: 'sonderklausel',
      input: {
        parteiA: { name: 'Technik Handel', address: 'Elektronikweg 15, 40213 Düsseldorf' },
        parteiB: { name: 'Julia Meier', address: 'Digitalstraße 8, 40213 Düsseldorf' },
        kaufgegenstand: 'MacBook Pro 16", M3 Max, 1TB SSD, inkl. Software-Lizenzen',
        kaufpreis: '3.500,00 EUR',
        übergabetermin: '10.01.2025',
        zahlungsmodalitäten: 'Überweisung nach Rechnung',
        customRequirements: 'Gewährleistung wird auf 24 Monate verlängert. Versicherung gegen Diebstahl ist im Preis enthalten.'
      }
    },
    {
      variant: 'edge_case',
      input: {
        parteiA: { name: 'Privat: Hans Verkäufer' }, // Edge: Privatperson, fehlende Adresse
        parteiB: { name: 'Lisa Käuferin', address: 'Kaufstraße 3, 30159 Hannover' },
        kaufgegenstand: 'Gebrauchtes Fahrrad',
        kaufpreis: '150', // Edge: Ohne EUR, ohne Nachkommastellen
        übergabetermin: 'sofort',
        zahlungsmodalitäten: 'Bar'
      }
    }
  ],

  // 4. Arbeitsvertrag
  arbeitsvertrag: [
    {
      variant: 'standard',
      input: {
        parteiA: { name: 'Produktions GmbH', address: 'Industriestraße 50, 45127 Essen' },
        parteiB: { name: 'Stefan Arbeitnehmer', address: 'Wohnweg 12, 45127 Essen' },
        tätigkeit: 'Produktionsmitarbeiter in der Montage',
        vergütung: '3.200,00 EUR brutto monatlich',
        arbeitszeit: '40 Stunden pro Woche',
        arbeitsbeginn: '01.03.2025',
        befristung: 'unbefristet',
        customRequirements: ''
      }
    },
    {
      variant: 'sonderklausel',
      input: {
        parteiA: { name: 'IT Solutions AG', address: 'Softwarepark 7, 81829 München' },
        parteiB: { name: 'Emma Entwicklerin', address: 'Codingstraße 4, 81829 München' },
        tätigkeit: 'Senior Software Engineer',
        vergütung: '75.000,00 EUR brutto jährlich',
        arbeitszeit: '38 Stunden pro Woche mit flexiblen Arbeitszeiten',
        arbeitsbeginn: '01.02.2025',
        befristung: 'unbefristet',
        customRequirements: 'Homeoffice ist zu 60% möglich. Firmenwagen nach Probezeit. Fortbildungsbudget 2.000 EUR/Jahr.'
      }
    },
    {
      variant: 'edge_case',
      input: {
        parteiA: { name: 'Kleinbetrieb Schmidt', address: 'Handwerksweg 2, 99084 Erfurt' },
        parteiB: { name: 'Paul Auszubildender' }, // Edge: Fehlende Adresse
        tätigkeit: 'Azubi Elektroniker',
        vergütung: '950 EUR', // Edge: Ohne Nachkommastellen, ohne "brutto"
        arbeitszeit: '40 Std/Woche', // Edge: Abkürzung
        arbeitsbeginn: '01.09.2025'
        // Edge: Fehlende befristung
      }
    }
  ],

  // 5. NDA
  nda: [
    {
      variant: 'standard',
      input: {
        parteiA: { name: 'Startup Innovations GmbH', address: 'Geheimweg 1, 10178 Berlin' },
        parteiB: { name: 'Beratung Pro', address: 'Consultingstraße 5, 10178 Berlin' },
        zweck: 'Zusammenarbeit für Entwicklung einer neuen Software-Plattform',
        vertraulicheInfos: 'Technische Dokumentation, Geschäftspläne, Kundeninformationen',
        dauer: '3 Jahre nach Vertragsende',
        customRequirements: ''
      }
    },
    {
      variant: 'sonderklausel',
      input: {
        parteiA: { name: 'Pharma Research AG', address: 'Forschungspark 20, 69115 Heidelberg' },
        parteiB: { name: 'Dr. Anna Wissenschaftlerin', address: 'Laborstraße 8, 69115 Heidelberg' },
        zweck: 'Forschungsprojekt im Bereich Biotechnologie',
        vertraulicheInfos: 'Forschungsdaten, Patentanmeldungen, klinische Studien',
        dauer: '5 Jahre nach Vertragsende',
        customRequirements: 'Patentrechte verbleiben bei Partei A. Wettbewerbsverbot für 12 Monate nach Vertragsende.'
      }
    },
    {
      variant: 'edge_case',
      input: {
        parteiA: { name: 'Privat: Max Erfinder' }, // Edge: Privatperson
        parteiB: { name: 'Investor XY', address: 'Kapitalweg 10, 60311 Frankfurt' },
        zweck: 'Investitionsprüfung für Produktidee',
        vertraulicheInfos: 'Produktkonzept', // Edge: Sehr kurz
        dauer: '2 Jahre' // Edge: Ohne "nach Vertragsende"
      }
    }
  ],

  // 6. Werkvertrag
  werkvertrag: [
    {
      variant: 'standard',
      input: {
        parteiA: { name: 'Hausbau Meyer GmbH', address: 'Baustraße 30, 22305 Hamburg' },
        parteiB: { name: 'Elektro Fischer', address: 'Strom weg 12, 22305 Hamburg' },
        leistung: 'Elektroinstallation für Neubau Einfamilienhaus',
        vergütung: '15.000,00 EUR',
        fertigstellung: '30.06.2025',
        zahlungsbedingungen: '50% Anzahlung, 50% nach Abnahme',
        customRequirements: ''
      }
    },
    {
      variant: 'sonderklausel',
      input: {
        parteiA: { name: 'Büroausbau Pro', address: 'Gewerbestraße 5, 50667 Köln' },
        parteiB: { name: 'Schreiner Holz GmbH', address: 'Werkstattweg 7, 50667 Köln' },
        leistung: 'Anfertigung und Einbau von Büromöbeln nach Maß',
        vergütung: '25.000,00 EUR',
        fertigstellung: '15.04.2025',
        zahlungsbedingungen: '30% Anzahlung, 40% bei Lieferung, 30% nach Endabnahme',
        customRequirements: 'Nachunternehmer für Lackierung ist erlaubt. Sicherheitsleistung 5% der Auftragssumme.'
      }
    },
    {
      variant: 'edge_case',
      input: {
        parteiA: { name: 'Privatperson: Julia Bauherrin' }, // Edge: Privatperson
        parteiB: { name: 'Maler Schmidt', address: 'Farbweg 3, 01067 Dresden' },
        leistung: 'Malerarbeiten Wohnzimmer',
        vergütung: '800', // Edge: Ohne EUR
        fertigstellung: 'Ende Februar 2025', // Edge: Unklares Datum
        zahlungsbedingungen: 'Nach Fertigstellung'
      }
    }
  ],

  // 7. Lizenzvertrag
  lizenzvertrag: [
    {
      variant: 'standard',
      input: {
        parteiA: { name: 'Software Entwicklung AG', address: 'Codepark 15, 80331 München' },
        parteiB: { name: 'Handel & Vertrieb GmbH', address: 'Verkaufsstraße 20, 80331 München' },
        lizenzgegenstand: 'ERP-Software "BusinessPro" Version 3.0',
        nutzungsart: 'Einfaches Nutzungsrecht, nicht-exklusiv',
        lizenzgebiet: 'Deutschland',
        lizenzgebühr: '5.000,00 EUR jährlich',
        laufzeit: '3 Jahre, automatische Verlängerung um 1 Jahr',
        customRequirements: ''
      }
    },
    {
      variant: 'sonderklausel',
      input: {
        parteiA: { name: 'Creative Studios', address: 'Designplatz 8, 10115 Berlin' },
        parteiB: { name: 'Marketing Agentur XY', address: 'Werbeallee 12, 10115 Berlin' },
        lizenzgegenstand: 'Grafikvorlagen und Templates für Social Media',
        nutzungsart: 'Ausschließliches Nutzungsrecht für Kundenarbeiten',
        lizenzgebiet: 'Weltweit',
        lizenzgebühr: '2.500,00 EUR einmalig',
        laufzeit: 'Unbefristet',
        customRequirements: 'Quellcode-Zugang ist inkludiert. Modifikation für Kundenprojekte erlaubt. Sublizenzierung an Endkunden gestattet.'
      }
    },
    {
      variant: 'edge_case',
      input: {
        parteiA: { name: 'Indie Entwickler Max' }, // Edge: Privatperson, fehlende Adresse
        parteiB: { name: 'Spieleverlag GmbH', address: 'Gamingstraße 5, 50667 Köln' },
        lizenzgegenstand: 'Mobile Game "Space Adventure"',
        nutzungsart: 'Exklusiv',
        lizenzgebiet: 'Europa',
        lizenzgebühr: '10000', // Edge: Ohne Nachkommastellen, ohne EUR
        laufzeit: '5 Jahre' // Edge: Ohne "ab..."
      }
    }
  ],

  // 8. Individuell
  individuell: [
    {
      variant: 'standard',
      input: {
        parteiA: { name: 'Tech Solutions AG', address: 'Innovationsweg 5, 10115 Berlin' },
        parteiB: { name: 'Max Consultant', address: 'Beratungsstraße 10, 10115 Berlin' },
        vertragsgegenstand: 'IT-Beratung und Projektmanagement',
        vergütung: '120,00 EUR pro Stunde',
        laufzeit: '01.01.2025 bis 31.12.2025',
        customRequirements: ''
      }
    },
    {
      variant: 'sonderklausel',
      input: {
        parteiA: { name: 'Forschungsinstitut XY', address: 'Wissenschaftsplatz 3, 69115 Heidelberg', role: 'Auftraggeber' },
        parteiB: { name: 'Dr. Sarah Expertin', address: 'Forscherweg 8, 69115 Heidelberg', role: 'Auftragnehmer' },
        projektbeschreibung: 'Entwicklung eines KI-basierten Analysesystems',
        vergütung: '150.000,00 EUR Gesamtprojektvergütung',
        laufzeit: '6 Monate ab Vertragsschluss',
        mustClauses: [
          '§ 1 Projektgegenstand',
          '§ 2 Leistungsumfang',
          '§ 3 Vergütung und Abrechnung',
          '§ 4 Projektdauer und Meilensteine',
          '§ 5 Urheberrechte und IP',
          '§ 6 Vertraulichkeit',
          '§ 7 Haftung',
          '§ 8 Kündigung',
          '§ 9 Schlussbestimmungen'
        ],
        forbiddenTopics: [
          'Automatische Verlängerung',
          'Wettbewerbsverbot nach Vertragsende'
        ],
        customRequirements: 'Alle Rechte am entwickelten Code verbleiben beim Auftraggeber. Keine automatische Verlängerung. Kein Wettbewerbsverbot nach Projektende.'
      }
    },
    {
      variant: 'edge_case',
      input: {
        parteiA: { name: 'Startup ABC' }, // Edge: Fehlende Adresse
        parteiB: { name: 'Freelancer Tom', address: 'Homeoffice Berlin' },
        leistung: 'Marketing-Beratung',
        vergütung: '5000', // Edge: Ohne Nachkommastellen, ohne EUR
        laufzeit: 'flexibel' // Edge: Unklar
      }
    }
  ],

  // 9. Darlehen
  darlehen: [
    {
      variant: 'standard',
      input: {
        parteiA: { name: 'Privatperson: Klaus Darlehensgeber', address: 'Sparkassenweg 5, 30159 Hannover' },
        parteiB: { name: 'Maria Darlehensnehmerin', address: 'Schuldnerstraße 12, 30159 Hannover' },
        darlehenssumme: '50.000,00 EUR',
        zinssatz: '4,5% p.a.',
        laufzeit: '5 Jahre',
        rückzahlung: 'Monatliche Raten von 932,00 EUR',
        fälligkeit: '01.12.2030',
        customRequirements: ''
      }
    },
    {
      variant: 'sonderklausel',
      input: {
        parteiA: { name: 'Finanz GmbH', address: 'Kapitalplatz 20, 60311 Frankfurt' },
        parteiB: { name: 'Immobilien Schmidt GmbH', address: 'Baustraße 15, 60311 Frankfurt' },
        darlehenssumme: '250.000,00 EUR',
        zinssatz: '3,8% p.a.',
        laufzeit: '10 Jahre',
        rückzahlung: 'Quartalsweise Tilgung',
        fälligkeit: '01.01.2035',
        customRequirements: 'Als Sicherheit wird eine Grundschuld über 300.000 EUR auf das Grundstück Baustraße 15 bestellt. Sondertilgungen bis 10% der Restschuld pro Jahr ohne Vorfälligkeitsentschädigung möglich.'
      }
    },
    {
      variant: 'edge_case',
      input: {
        parteiA: { name: 'Anna Darlehensgeber' }, // Edge: Fehlende Adresse
        parteiB: { name: 'Tim Darlehensnehmer', address: 'Mieterweg 3, 01067 Dresden' },
        darlehenssumme: '5000', // Edge: Ohne Nachkommastellen
        zinssatz: '0%', // Edge: Zinsfrei
        laufzeit: '6 Monate',
        rückzahlung: 'Einmalzahlung bei Fälligkeit',
        fälligkeit: 'Juli 2025' // Edge: Unklares Datum
      }
    }
  ],

  // 10. Gesellschaft
  gesellschaft: [
    {
      variant: 'standard',
      input: {
        parteiA: { name: 'Max Mustermann', address: 'Gesellschafterstraße 1, 10115 Berlin' },
        parteiB: { name: 'Maria Schmidt', address: 'Partnerweg 5, 10115 Berlin' },
        firmenname: 'Mustermann & Schmidt GbR',
        sitz: 'Berlin',
        gegenstand: 'Unternehmensberatung und Coaching',
        gründungsdatum: '01.01.2025',
        dauer: 'unbefristet',
        einlagen: 'Jeder Gesellschafter leistet 10.000 EUR Bareinlage',
        gewinnverteilung: '50:50',
        customRequirements: ''
      }
    },
    {
      variant: 'sonderklausel',
      input: {
        parteiA: { name: 'Peter Investor', address: 'Kapitalweg 20, 80331 München' },
        parteiB: { name: 'Julia Gründerin', address: 'Startup-Allee 8, 80331 München' },
        firmenname: 'TechStart GmbH',
        sitz: 'München',
        gegenstand: 'Softwareentwicklung und IT-Dienstleistungen',
        stammkapital: '25.000,00 EUR',
        gründungsdatum: '15.02.2025',
        dauer: 'unbefristet',
        einlagen: 'Investor: 15.000 EUR (60%), Gründerin: 10.000 EUR (40%)',
        gewinnverteilung: '60:40 entsprechend Beteiligung',
        customRequirements: 'Vinkulierungsklausel: Übertragung von Geschäftsanteilen bedarf der Zustimmung aller Gesellschafter. Vorkaufsrecht der verbleibenden Gesellschafter bei Anteilsverkauf.'
      }
    },
    {
      variant: 'edge_case',
      input: {
        parteiA: { name: 'Tom Freelancer' }, // Edge: Fehlende Adresse
        parteiB: { name: 'Lisa Designer', address: 'Kreativweg 5, 50667 Köln' },
        firmenname: 'Kreativ-Duo GbR',
        sitz: 'Köln',
        gegenstand: 'Design und Webentwicklung',
        einlagen: 'Keine Bareinlagen', // Edge: Keine Einlagen
        gewinnverteilung: '50:50' // Edge: Einfache Aufteilung
      }
    }
  ],

  // 11. Aufhebungsvertrag
  aufhebungsvertrag: [
    {
      variant: 'standard',
      input: {
        parteiA: { name: 'Produktions GmbH', address: 'Industriestraße 30, 45127 Essen' },
        parteiB: { name: 'Stefan Arbeitnehmer', address: 'Wohnweg 12, 45127 Essen' },
        beendigungstermin: '31.03.2025',
        freistellung: 'Unwiderrufliche Freistellung ab 01.02.2025',
        urlaubsabgeltung: '10 Tage Resturlaub',
        zeugnis: 'Qualifiziertes Arbeitszeugnis',
        rückgabe: 'Laptop, Handy, Zugangskarte bis 31.01.2025',
        customRequirements: ''
      }
    },
    {
      variant: 'sonderklausel',
      input: {
        parteiA: { name: 'IT Solutions AG', address: 'Softwarepark 7, 81829 München' },
        parteiB: { name: 'Emma Entwicklerin', address: 'Codingstraße 4, 81829 München' },
        beendigungstermin: '30.06.2025',
        freistellung: 'Widerrufliche Freistellung ab 01.05.2025',
        urlaubsabgeltung: '15 Tage Resturlaub + 5 Überstunden',
        zeugnis: 'Qualifiziertes Arbeitszeugnis mit Note "sehr gut"',
        rückgabe: 'Laptop, Handy, Firmenwagen, alle Zugangsdaten bis 30.04.2025',
        customRequirements: 'Abfindungszahlung: 25.000 EUR brutto, zahlbar bis 15.07.2025. Wettbewerbsverbot für 6 Monate nach Austritt gegen monatliche Karenzentschädigung von 2.000 EUR.'
      }
    },
    {
      variant: 'edge_case',
      input: {
        parteiA: { name: 'Kleinbetrieb Schmidt', address: 'Handwerksweg 2, 99084 Erfurt' },
        parteiB: { name: 'Paul Mitarbeiter' }, // Edge: Fehlende Adresse
        beendigungstermin: '28.02.2025',
        freistellung: 'Keine Freistellung',
        zeugnis: 'Einfaches Arbeitszeugnis'
        // Edge: Keine Abfindung, minimale Angaben
      }
    }
  ],

  // 12. Pacht
  pacht: [
    {
      variant: 'standard',
      input: {
        parteiA: { name: 'Grundstücksbesitzer Klaus', address: 'Landweg 50, 82031 Grünwald' },
        parteiB: { name: 'Landwirt Müller', address: 'Bauernhof 3, 82031 Grünwald' },
        pachtgegenstand: 'Landwirtschaftliche Nutzfläche, 5 Hektar Ackerland',
        pachtzweck: 'Anbau von Getreide und Kartoffeln',
        pachtzins: '3.000,00 EUR jährlich',
        nebenkosten: 'Keine',
        pachtbeginn: '01.04.2025',
        pachtdauer: '10 Jahre, befristet',
        customRequirements: ''
      }
    },
    {
      variant: 'sonderklausel',
      input: {
        parteiA: { name: 'Immobilien AG', address: 'Geschäftsstraße 15, 22305 Hamburg' },
        parteiB: { name: 'Gastro Betriebe GmbH', address: 'Restaurantweg 8, 22305 Hamburg' },
        pachtgegenstand: 'Gastronomieräume, 200 qm Erdgeschoss + 50 qm Außenterrasse',
        pachtzweck: 'Betrieb eines Restaurants mit Außengastronomie',
        pachtzins: '4.500,00 EUR monatlich',
        nebenkosten: '800,00 EUR monatlich (Heizung, Wasser, Müll)',
        inventar: 'Komplette Gastronomieeinrichtung inkl. Küche',
        pachtbeginn: '01.03.2025',
        pachtdauer: '5 Jahre mit Option auf Verlängerung um 5 Jahre',
        customRequirements: 'Öffnungszeiten: täglich 11:00-23:00 Uhr. Lärmschutzauflagen sind einzuhalten. Unterverpachtung ist nur mit schriftlicher Zustimmung erlaubt. Pächter trägt Instandhaltung von Inventar.'
      }
    },
    {
      variant: 'edge_case',
      input: {
        parteiA: { name: 'Anna Verpächterin' }, // Edge: Fehlende Adresse
        parteiB: { name: 'Tim Pächter', address: 'Stadtweg 5, 01067 Dresden' },
        pachtgegenstand: 'Gartenparzelle, 200 qm',
        pachtzweck: 'Gemüseanbau',
        pachtzins: '300', // Edge: Ohne Nachkommastellen, ohne Zeiteinheit
        pachtbeginn: 'Frühling 2025', // Edge: Unklares Datum
        pachtdauer: '1 Jahr' // Edge: Kurze Laufzeit
      }
    }
  ]
};

// ===== TEST-RUNNER =====

async function runStagingTests(options = {}) {
  const runLabel = options.label || DEFAULT_RUN_LABEL;
  const concurrency = options.concurrency || DEFAULT_CONCURRENCY;
  const timeoutMs = options.timeout || DEFAULT_TIMEOUT_MS;

  console.log('\n' + '='.repeat(80));
  console.log('🧪 V2 STAGING TESTS - AUTOMATED RUN');
  console.log('='.repeat(80));
  console.log(`📅 Run Label: ${runLabel}`);
  console.log(`⚡ Concurrency: ${concurrency}`);
  console.log(`⏱️  Timeout: ${timeoutMs}ms`);
  console.log('='.repeat(80) + '\n');

  const client = new MongoClient(process.env.MONGO_URI);

  try {
    await client.connect();
    console.log('✅ MongoDB verbunden\n');

    const db = client.db();

    // Alle Testfälle sammeln
    const allTests = [];
    Object.keys(TEST_CASES).forEach(contractType => {
      TEST_CASES[contractType].forEach(testCase => {
        allTests.push({
          contractType,
          variant: testCase.variant,
          input: testCase.input
        });
      });
    });

    console.log(`📋 Total Test Cases: ${allTests.length}\n`);

    // Ergebnisse sammeln
    const results = [];
    let completed = 0;
    let timeouts = 0;
    let errors = 0;

    // Teste in Batches (Concurrency-Control)
    for (let i = 0; i < allTests.length; i += concurrency) {
      const batch = allTests.slice(i, i + concurrency);
      const batchNum = Math.floor(i / concurrency) + 1;
      const totalBatches = Math.ceil(allTests.length / concurrency);

      console.log(`\n📦 Batch ${batchNum}/${totalBatches} (${batch.length} tests):`);

      const batchPromises = batch.map(async (test) => {
        const startTime = Date.now();

        // Dynamisches Timeout für komplexe Fälle
        const hasLongCustomReq =
          typeof test.input.customRequirements === 'string' &&
          test.input.customRequirements.length > 80;

        let effectiveTimeoutMs = timeoutMs;

        // Sonderklausel-Varianten oder lange Anforderungen → 90s minimum
        if (test.variant === 'sonderklausel' || hasLongCustomReq) {
          effectiveTimeoutMs = Math.max(effectiveTimeoutMs, 90000);
        }

        try {
          // Timeout-Wrapper mit dynamischem Timeout
          const result = await Promise.race([
            generateContractV2(test.input, test.contractType, TEST_USER_ID, db, runLabel),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('TIMEOUT')), effectiveTimeoutMs)
            )
          ]);

          const durationMs = Date.now() - startTime;

          const testResult = {
            contractType: test.contractType,
            variant: test.variant,
            status: 'success',
            finalScore: result.artifacts.selfCheck.finalScore,
            validatorScore: result.artifacts.selfCheck.validatorScore,
            llmScore: result.artifacts.selfCheck.llmScore,
            retriesUsed: result.artifacts.selfCheck.retriesUsed,
            reviewRequired: result.reviewRequired,
            durationMs: durationMs,
            validatorPassed: result.artifacts.validator.passed,
            errorsCount: result.artifacts.validator.errors?.length || 0,
            warningsCount: result.artifacts.validator.warnings?.length || 0
          };

          completed++;
          console.log(`   ✅ ${test.contractType} (${test.variant}): Score ${testResult.finalScore.toFixed(3)} (${durationMs}ms)`);

          return testResult;

        } catch (error) {
          const durationMs = Date.now() - startTime;

          if (error.message === 'TIMEOUT') {
            timeouts++;
            console.log(`   ⏱️  ${test.contractType} (${test.variant}): TIMEOUT after ${effectiveTimeoutMs}ms`);

            return {
              contractType: test.contractType,
              variant: test.variant,
              status: 'timeout',
              durationMs: effectiveTimeoutMs,
              error: 'Timeout exceeded'
            };
          } else {
            errors++;
            console.log(`   ❌ ${test.contractType} (${test.variant}): ERROR - ${error.message}`);

            return {
              contractType: test.contractType,
              variant: test.variant,
              status: 'error',
              durationMs: durationMs,
              error: error.message
            };
          }
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Pause zwischen Batches (außer beim letzten)
      if (i + concurrency < allTests.length) {
        console.log(`   ⏸️  Pause ${BATCH_PAUSE_MS}ms...`);
        await new Promise(resolve => setTimeout(resolve, BATCH_PAUSE_MS));
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('📊 TEST RESULTS SUMMARY');
    console.log('='.repeat(80) + '\n');

    console.log(`Total Tests: ${allTests.length}`);
    console.log(`✅ Completed: ${completed}`);
    console.log(`⏱️  Timeouts: ${timeouts}`);
    console.log(`❌ Errors: ${errors}\n`);

    // Statistiken berechnen (nur erfolgreiche Tests)
    const successResults = results.filter(r => r.status === 'success');

    if (successResults.length > 0) {
      const scores = successResults.map(r => r.finalScore);
      const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
      const minScore = Math.min(...scores);
      const maxScore = Math.max(...scores);
      const reviewRequiredCount = successResults.filter(r => r.reviewRequired).length;
      const reviewRequiredRate = (reviewRequiredCount / successResults.length * 100);
      const avgRetries = successResults.reduce((a, b) => a + b.retriesUsed, 0) / successResults.length;

      console.log('📈 QUALITY METRICS (Successful Tests):');
      console.log(`   Avg Final Score: ${avgScore.toFixed(3)} (Min: ${minScore.toFixed(3)}, Max: ${maxScore.toFixed(3)})`);
      console.log(`   Avg Retries: ${avgRetries.toFixed(2)}`);
      console.log(`   Review Required: ${reviewRequiredCount}/${successResults.length} (${reviewRequiredRate.toFixed(1)}%)\n`);

      // GO/NO-GO Checks
      console.log('='.repeat(80));
      console.log('🎯 GO/NO-GO CRITERIA');
      console.log('='.repeat(80) + '\n');

      const goNoGo = {
        avgAbove094: avgScore >= 0.94,
        noBelow090: minScore >= 0.90,
        reviewBelow5: reviewRequiredRate <= 5.0,
        avgRetriesBelow1: avgRetries <= 1.0
      };

      console.log(`✓ Avg Score ≥ 0.94: ${goNoGo.avgAbove094 ? '✅ PASS' : '❌ FAIL'} (${avgScore.toFixed(3)})`);
      console.log(`✓ No Score < 0.90: ${goNoGo.noBelow090 ? '✅ PASS' : '❌ FAIL'} (Min: ${minScore.toFixed(3)})`);
      console.log(`✓ Review Required ≤ 5%: ${goNoGo.reviewBelow5 ? '✅ PASS' : '❌ FAIL'} (${reviewRequiredRate.toFixed(1)}%)`);
      console.log(`✓ Avg Retries ≤ 1.0: ${goNoGo.avgRetriesBelow1 ? '✅ PASS' : '❌ FAIL'} (${avgRetries.toFixed(2)})\n`);

      const overallGo = goNoGo.avgAbove094 && goNoGo.noBelow090 && goNoGo.reviewBelow5 && goNoGo.avgRetriesBelow1;

      if (overallGo) {
        console.log('🚀 OVERALL RESULT: ✅ GO FOR PRODUCTION\n');
      } else {
        console.log('⚠️ OVERALL RESULT: ❌ NO-GO (Improvements needed)\n');

        // Ausreißer auflisten
        const outliers = successResults.filter(r =>
          r.finalScore < 0.90 || r.reviewRequired || r.retriesUsed >= 2
        );

        if (outliers.length > 0) {
          console.log(`📋 OUTLIERS (${outliers.length} cases):`);
          outliers.forEach((r, idx) => {
            const reasons = [];
            if (r.finalScore < 0.90) reasons.push(`Low Score (${r.finalScore.toFixed(3)})`);
            if (r.reviewRequired) reasons.push('Review Required');
            if (r.retriesUsed >= 2) reasons.push(`High Retries (${r.retriesUsed})`);
            if (r.errorsCount > 0) reasons.push(`${r.errorsCount} Validator Errors`);

            console.log(`   ${idx + 1}. ${r.contractType} (${r.variant}): ${reasons.join(', ')}`);
          });
          console.log('');
        }
      }
    }

    // Speichere Ergebnisse
    const outputFile = './backend/staging-results.json';
    await fs.writeFile(outputFile, JSON.stringify({
      runLabel,
      timestamp: new Date().toISOString(),
      config: { concurrency, timeoutMs },
      summary: {
        total: allTests.length,
        completed,
        timeouts,
        errors
      },
      results
    }, null, 2));

    console.log(`💾 Results saved to: ${outputFile}\n`);

    // Rufe Report-Skript auf
    console.log('='.repeat(80));
    console.log('📊 GENERATING DETAILED REPORT...');
    console.log('='.repeat(80) + '\n');

    try {
      const { stdout } = await execAsync(`node backend/report-staging.js "${runLabel}"`);
      console.log(stdout);
    } catch (err) {
      console.error('⚠️ Report generation failed:', err.message);
    }

  } catch (error) {
    console.error('\n❌ Test run failed:', error.message);
    console.error(error.stack);
    throw error;

  } finally {
    await client.close();
    console.log('\n✅ MongoDB Verbindung geschlossen');
  }
}

// CLI Usage
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {};

  // Parse CLI arguments
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--label' && args[i + 1]) {
      options.label = args[i + 1];
      i++;
    } else if (args[i] === '--concurrency' && args[i + 1]) {
      options.concurrency = parseInt(args[i + 1]);
      i++;
    } else if (args[i] === '--timeout' && args[i + 1]) {
      options.timeout = parseInt(args[i + 1]);
      i++;
    }
  }

  console.log('\n🎯 Starting automated staging tests...\n');

  runStagingTests(options)
    .then(() => {
      console.log('\n✅ All tests completed successfully!');
      process.exit(0);
    })
    .catch(err => {
      console.error('\n❌ Test run failed:', err);
      process.exit(1);
    });
}

module.exports = { runStagingTests };
