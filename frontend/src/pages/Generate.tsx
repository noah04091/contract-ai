/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useRef, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet";
import { 
  CheckCircle, Clipboard, Save, FileText, Check, Download,
  ArrowRight, ArrowLeft, Sparkles, Edit3, Building,
  Eye, PenTool, RefreshCw, Zap, BookOpen, Star, TrendingUp
} from "lucide-react";
import styles from "../styles/Generate.module.css";
import { toast } from 'react-toastify';
import { useAuth } from "../context/AuthContext";

// Types
interface FormDataType {
  title?: string;
  details?: string;
  [key: string]: string | undefined;
}

interface CompanyProfile {
  _id?: string;
  companyName: string;
  legalForm: string;
  street: string;
  postalCode: string;
  city: string;
  country: string;
  vatId: string;
  tradeRegister: string;
  contactEmail: string;
  contactPhone: string;
  bankName: string;
  iban: string;
  bic: string;
  logoUrl?: string;
  logoKey?: string;
}

interface ContractType {
  id: string;
  name: string;
  description: string;
  icon: string;
  jurisdiction?: string;
  category?: string;
  estimatedDuration?: string;
  popularity?: number;
  isNew?: boolean;
  fields: Array<{
    name: string;
    label: string;
    type: 'text' | 'textarea' | 'date' | 'number' | 'email' | 'phone' | 'iban' | 'vat' | 'select';
    placeholder: string;
    required: boolean;
    validation?: {
      pattern?: string;
      min?: number;
      max?: number;
      message?: string;
    };
    options?: string[];
    group?: string;
    helpText?: string;
    dependsOn?: string;
  }>;
}

// Contract Templates Interface
interface ContractTemplate {
  id: string;
  name: string;
  description: string;
  contractType: string;
  icon: string;
  prefilled: FormDataType;
  tags: string[];
  isPremium?: boolean;
}

// 🎯 ERWEITERTE VERTRAGSTYPEN - JETZT MIT ALLEN WICHTIGEN TYPEN
const CONTRACT_TYPES: ContractType[] = [
  // BESTEHENDE VERTRÄGE
  {
    id: 'freelancer',
    name: 'Freelancer-Vertrag',
    description: 'Für freiberufliche Projekttätigkeiten',
    icon: '💼',
    jurisdiction: 'DE',
    category: 'Dienstleistung',
    estimatedDuration: '5-8 Minuten',
    popularity: 95,
    fields: [
      { name: 'nameClient', label: 'Auftraggeber', type: 'text', placeholder: 'Firmenname oder Privatperson', required: true },
      { name: 'nameFreelancer', label: 'Freelancer', type: 'text', placeholder: 'Ihr Name', required: true },
      { name: 'description', label: 'Leistungsbeschreibung', type: 'textarea', placeholder: 'Detaillierte Beschreibung der zu erbringenden Leistung...', required: true },
      { name: 'timeframe', label: 'Projektdauer', type: 'text', placeholder: 'z.B. 3 Monate oder bis 31.12.2024', required: true },
      { name: 'payment', label: 'Vergütung', type: 'text', placeholder: 'z.B. 5.000€ oder 80€/Stunde', required: true },
      { name: 'rights', label: 'Nutzungsrechte', type: 'text', placeholder: 'Wer erhält welche Rechte an den Ergebnissen?', required: true },
      { name: 'terminationClause', label: 'Kündigungsfrist', type: 'text', placeholder: 'z.B. 14 Tage zum Monatsende', required: true },
      { 
        name: 'clientAddress', 
        label: 'Adresse Auftraggeber', 
        type: 'textarea', 
        placeholder: 'Vollständige Geschäftsadresse des Auftraggebers', 
        required: true,
        group: 'Vertragsparteien',
        helpText: 'Für rechtsgültige Verträge erforderlich'
      },
      { 
        name: 'freelancerAddress', 
        label: 'Adresse Freelancer', 
        type: 'textarea', 
        placeholder: 'Ihre vollständige Geschäftsadresse', 
        required: true,
        group: 'Vertragsparteien'
      },
      { 
        name: 'freelancerTaxId', 
        label: 'Steuer-ID Freelancer', 
        type: 'vat', 
        placeholder: 'z.B. DE123456789 oder Steuer-ID', 
        required: false,
        group: 'Steuerliche Angaben',
        validation: {
          pattern: '^(DE[0-9]{9}|[0-9]{11})$',
          message: 'Bitte gültige USt-IdNr. (DE123456789) oder Steuer-ID eingeben'
        }
      },
      { 
        name: 'paymentTerms', 
        label: 'Zahlungsbedingungen', 
        type: 'select', 
        placeholder: 'Wann wird die Rechnung fällig?', 
        required: true,
        group: 'Vergütung',
        options: ['Sofort nach Erhalt', '7 Tage netto', '14 Tage netto', '30 Tage netto', 'Bei Projektabschluss']
      },
      { 
        name: 'invoiceInterval', 
        label: 'Rechnungsstellung', 
        type: 'select', 
        placeholder: 'Wie oft wird abgerechnet?', 
        required: true,
        group: 'Vergütung',
        options: ['Einmalig bei Fertigstellung', 'Monatlich', 'Nach Meilensteine', 'Stunden-basiert']
      },
      { 
        name: 'workLocation', 
        label: 'Arbeitsort', 
        type: 'select', 
        placeholder: 'Wo wird die Leistung erbracht?', 
        required: true,
        group: 'Arbeitsmodalitäten',
        options: ['Remote/Homeoffice', 'Beim Auftraggeber vor Ort', 'Eigene Räumlichkeiten', 'Flexibel nach Absprache']
      },
      { 
        name: 'ipOwnership', 
        label: 'Eigentum an Arbeitsergebnissen', 
        type: 'select', 
        placeholder: 'Wem gehören die Ergebnisse?', 
        required: true,
        group: 'Rechte & Pflichten',
        options: ['Vollständig an Auftraggeber', 'Gemeinsame Nutzung', 'Bei Freelancer mit Nutzungsrecht', 'Nach Vereinbarung']
      },
      { 
        name: 'confidentiality', 
        label: 'Vertraulichkeitsgrad', 
        type: 'select', 
        placeholder: 'Wie vertraulich sind die Informationen?', 
        required: true,
        group: 'Rechte & Pflichten',
        options: ['Standard-Vertraulichkeit', 'Erhöhte Vertraulichkeit', 'Streng vertraulich', 'Keine besonderen Anforderungen']
      },
      { 
        name: 'liability', 
        label: 'Haftungsbegrenzung', 
        type: 'select', 
        placeholder: 'Wie soll die Haftung begrenzt werden?', 
        required: true,
        group: 'Haftung & Risiko',
        options: ['Auf Auftragswert begrenzt', 'Auf doppelten Auftragswert begrenzt', 'Nur Vorsatz und grobe Fahrlässigkeit', 'Gesetzliche Haftung']
      },
      { 
        name: 'governingLaw', 
        label: 'Anwendbares Recht', 
        type: 'select', 
        placeholder: 'Welches Recht soll gelten?', 
        required: true,
        group: 'Rechtliches',
        options: ['Deutsches Recht', 'Österreichisches Recht', 'Schweizer Recht'],
        helpText: 'Bestimmt die Rechtsprechung bei Streitigkeiten'
      },
      { 
        name: 'jurisdiction', 
        label: 'Gerichtsstand', 
        type: 'text', 
        placeholder: 'z.B. Berlin, München, Hamburg', 
        required: true,
        group: 'Rechtliches',
        helpText: 'Zuständiges Gericht bei Rechtsstreitigkeiten'
      }
    ]
  },
  {
    id: 'mietvertrag',
    name: 'Mietvertrag',
    description: 'Für Wohnraum oder Gewerbeflächen',
    icon: '🏠',
    popularity: 85,
    fields: [
      { name: 'landlord', label: 'Vermieter', type: 'text', placeholder: 'Name des Vermieters', required: true },
      { name: 'tenant', label: 'Mieter', type: 'text', placeholder: 'Name des Mieters', required: true },
      { name: 'address', label: 'Immobilienadresse', type: 'textarea', placeholder: 'Vollständige Adresse der Mietimmobilie', required: true },
      { name: 'startDate', label: 'Mietbeginn', type: 'date', placeholder: '', required: true },
      { name: 'baseRent', label: 'Kaltmiete', type: 'text', placeholder: 'z.B. 1.200€ monatlich', required: true },
      { name: 'extraCosts', label: 'Nebenkosten', type: 'text', placeholder: 'z.B. 200€ Vorauszahlung', required: true },
      { name: 'termination', label: 'Kündigungsfrist', type: 'text', placeholder: 'z.B. 3 Monate zum Quartalsende', required: true }
    ]
  },
  {
    id: 'arbeitsvertrag',  
    name: 'Arbeitsvertrag',
    description: 'Für Festanstellungen',
    icon: '💻',
    popularity: 90,
    fields: [
      { name: 'employer', label: 'Arbeitgeber', type: 'text', placeholder: 'Firmenname', required: true },
      { name: 'employee', label: 'Arbeitnehmer', type: 'text', placeholder: 'Name des Mitarbeiters', required: true },
      { name: 'position', label: 'Position', type: 'text', placeholder: 'z.B. Senior Developer', required: true },
      { name: 'startDate', label: 'Beginn der Tätigkeit', type: 'date', placeholder: '', required: true },
      { name: 'salary', label: 'Gehalt', type: 'text', placeholder: 'z.B. 65.000€ brutto/Jahr', required: true },
      { name: 'workingHours', label: 'Arbeitszeit', type: 'text', placeholder: 'z.B. 40 Stunden/Woche', required: true }
    ]
  },
  {
    id: 'kaufvertrag',
    name: 'Kaufvertrag',
    description: 'Für Waren und Dienstleistungen',
    icon: '🛒',
    popularity: 80,
    fields: [
      { name: 'seller', label: 'Verkäufer', type: 'text', placeholder: 'Name des Verkäufers', required: true },
      { name: 'buyer', label: 'Käufer', type: 'text', placeholder: 'Name des Käufers', required: true },
      { name: 'item', label: 'Verkaufsgegenstand', type: 'textarea', placeholder: 'Detaillierte Beschreibung der Ware/Dienstleistung', required: true },
      { name: 'price', label: 'Kaufpreis', type: 'text', placeholder: 'z.B. 15.000€', required: true },
      { name: 'deliveryDate', label: 'Liefertermin', type: 'date', placeholder: '', required: true }
    ]
  },
  {
    id: 'nda',
    name: 'Geheimhaltungsvertrag',
    description: 'Vertraulichkeitsvereinbarung',
    icon: '🔒',
    popularity: 75,
    fields: [
      { name: 'partyA', label: 'Partei A', type: 'text', placeholder: 'Name der ersten Vertragspartei', required: true },
      { name: 'partyB', label: 'Partei B', type: 'text', placeholder: 'Name der zweiten Vertragspartei', required: true },
      { name: 'purpose', label: 'Zweck/Anlass', type: 'textarea', placeholder: 'Worum geht es? Warum wird Vertraulichkeit benötigt?', required: true },
      { name: 'duration', label: 'Gültigkeitsdauer', type: 'text', placeholder: 'z.B. 5 Jahre oder unbefristet', required: true }
    ]
  },
  
  // 🆕 NEUE ERWEITERTE VERTRAGSTYPEN
  {
    id: 'gesellschaftsvertrag',
    name: 'Gesellschaftsvertrag',
    description: 'Für GbR, GmbH, UG Gründungen',
    icon: '🏢',
    category: 'Gesellschaftsrecht',
    isNew: true,
    popularity: 70,
    fields: [
      { name: 'companyName', label: 'Gesellschaftsname', type: 'text', placeholder: 'Name der zu gründenden Gesellschaft', required: true },
      { name: 'companyType', label: 'Gesellschaftsform', type: 'select', placeholder: 'Wählen Sie die Rechtsform', required: true,
        options: ['GbR (Gesellschaft bürgerlichen Rechts)', 'GmbH (Gesellschaft mit beschränkter Haftung)', 'UG (haftungsbeschränkt)', 'OHG (Offene Handelsgesellschaft)', 'KG (Kommanditgesellschaft)']
      },
      { name: 'partners', label: 'Gesellschafter', type: 'textarea', placeholder: 'Namen und Adressen aller Gesellschafter', required: true },
      { name: 'capital', label: 'Stammkapital', type: 'text', placeholder: 'z.B. 25.000€ (GmbH) oder 1€ (UG)', required: true },
      { name: 'shares', label: 'Geschäftsanteile', type: 'textarea', placeholder: 'Verteilung der Anteile in Prozent', required: true },
      { name: 'purpose', label: 'Unternehmensgegenstand', type: 'textarea', placeholder: 'Beschreibung der Geschäftstätigkeit', required: true },
      { name: 'management', label: 'Geschäftsführung', type: 'text', placeholder: 'Wer wird Geschäftsführer?', required: true }
    ]
  },
  {
    id: 'darlehensvertrag',
    name: 'Darlehensvertrag',
    description: 'Für private oder geschäftliche Kredite',
    icon: '💰',
    category: 'Finanzierung',
    isNew: true,
    popularity: 65,
    fields: [
      { name: 'lender', label: 'Darlehensgeber', type: 'text', placeholder: 'Name des Kreditgebers', required: true },
      { name: 'borrower', label: 'Darlehensnehmer', type: 'text', placeholder: 'Name des Kreditnehmers', required: true },
      { name: 'amount', label: 'Darlehenssumme', type: 'number', placeholder: 'z.B. 50000', required: true },
      { name: 'interestRate', label: 'Zinssatz', type: 'text', placeholder: 'z.B. 3,5% p.a.', required: true },
      { name: 'duration', label: 'Laufzeit', type: 'text', placeholder: 'z.B. 5 Jahre', required: true },
      { name: 'repayment', label: 'Rückzahlung', type: 'select', placeholder: 'Art der Rückzahlung', required: true,
        options: ['Monatliche Raten', 'Vierteljährliche Raten', 'Jährliche Raten', 'Endfällig', 'Nach Vereinbarung']
      },
      { name: 'security', label: 'Sicherheiten', type: 'textarea', placeholder: 'z.B. Grundschuld, Bürgschaft, etc.', required: false }
    ]
  },
  {
    id: 'lizenzvertrag',
    name: 'Lizenzvertrag',
    description: 'Für Software, Marken, Patente',
    icon: '©️',
    category: 'Geistiges Eigentum',
    popularity: 60,
    fields: [
      { name: 'licensor', label: 'Lizenzgeber', type: 'text', placeholder: 'Inhaber der Rechte', required: true },
      { name: 'licensee', label: 'Lizenznehmer', type: 'text', placeholder: 'Nutzer der Lizenz', required: true },
      { name: 'subject', label: 'Lizenzgegenstand', type: 'textarea', placeholder: 'Was wird lizenziert? (Software, Marke, Patent, etc.)', required: true },
      { name: 'licenseType', label: 'Lizenzart', type: 'select', placeholder: 'Art der Lizenz', required: true,
        options: ['Exklusivlizenz', 'Einfache Lizenz', 'Unterlizenzierbar', 'Nicht übertragbar']
      },
      { name: 'territory', label: 'Territorium', type: 'text', placeholder: 'z.B. Deutschland, EU, Weltweit', required: true },
      { name: 'fee', label: 'Lizenzgebühren', type: 'text', placeholder: 'z.B. Einmalzahlung oder % vom Umsatz', required: true },
      { name: 'duration', label: 'Laufzeit', type: 'text', placeholder: 'z.B. 5 Jahre oder unbefristet', required: true }
    ]
  },
  {
    id: 'aufhebungsvertrag',
    name: 'Aufhebungsvertrag',
    description: 'Einvernehmliche Vertragsbeendigung',
    icon: '🤝',
    category: 'Arbeitsrecht',
    popularity: 55,
    fields: [
      { name: 'employer', label: 'Arbeitgeber', type: 'text', placeholder: 'Firmenname', required: true },
      { name: 'employee', label: 'Arbeitnehmer', type: 'text', placeholder: 'Name des Mitarbeiters', required: true },
      { name: 'endDate', label: 'Beendigungsdatum', type: 'date', placeholder: '', required: true },
      { name: 'severance', label: 'Abfindung', type: 'text', placeholder: 'z.B. 3 Monatsgehälter', required: false },
      { name: 'reason', label: 'Beendigungsgrund', type: 'select', placeholder: 'Grund der Beendigung', required: true,
        options: ['Betriebsbedingt', 'Einvernehmlich', 'Umstrukturierung', 'Persönliche Gründe']
      },
      { name: 'vacation', label: 'Resturlaub', type: 'text', placeholder: 'Anzahl der Tage', required: true },
      { name: 'reference', label: 'Zeugnis', type: 'select', placeholder: 'Art des Arbeitszeugnisses', required: true,
        options: ['Sehr gutes Zeugnis', 'Gutes Zeugnis', 'Einfaches Zeugnis', 'Nach Vereinbarung']
      }
    ]
  },
  {
    id: 'pachtvertrag',
    name: 'Pachtvertrag',
    description: 'Für landwirtschaftliche Flächen oder Gastronomie',
    icon: '🌾',
    category: 'Immobilien',
    isNew: true,
    popularity: 50,
    fields: [
      { name: 'lessor', label: 'Verpächter', type: 'text', placeholder: 'Name des Verpächters', required: true },
      { name: 'lessee', label: 'Pächter', type: 'text', placeholder: 'Name des Pächters', required: true },
      { name: 'object', label: 'Pachtobjekt', type: 'textarea', placeholder: 'Beschreibung (z.B. Gaststätte, Acker, etc.)', required: true },
      { name: 'startDate', label: 'Pachtbeginn', type: 'date', placeholder: '', required: true },
      { name: 'rent', label: 'Pachtzins', type: 'text', placeholder: 'z.B. 2.000€ monatlich', required: true },
      { name: 'duration', label: 'Pachtdauer', type: 'text', placeholder: 'z.B. 10 Jahre', required: true },
      { name: 'usage', label: 'Nutzungszweck', type: 'text', placeholder: 'z.B. Gastronomie, Landwirtschaft', required: true }
    ]
  },
  {
    id: 'custom',
    name: 'Individueller Vertrag',
    description: 'Maßgeschneidert für Ihre Bedürfnisse',
    icon: '⚙️',
    fields: [
      { name: 'details', label: 'Vertragsinhalte', type: 'textarea', placeholder: 'Beschreiben Sie detailliert, was der Vertrag regeln soll: Parteien, Leistungen, Konditionen, Laufzeit, etc.', required: true }
    ]
  }
];

// 🎯 VERTRAGSBIBLIOTHEK MIT VORLAGEN
const CONTRACT_TEMPLATES: ContractTemplate[] = [
  // Freelancer Templates
  {
    id: 'freelancer_webdev',
    name: 'Webentwicklung Freelancer',
    description: 'Optimiert für Webentwicklungs-Projekte',
    contractType: 'freelancer',
    icon: '🌐',
    tags: ['IT', 'Web', 'Development'],
    prefilled: {
      description: 'Entwicklung einer responsiven Webseite mit modernem Frontend (React/Vue) und Backend (Node.js). Inklusive Setup, Testing und Deployment.',
      payment: '80€ pro Stunde',
      timeframe: '3 Monate',
      rights: 'Alle Rechte gehen nach vollständiger Bezahlung an den Auftraggeber über',
      workLocation: 'Remote/Homeoffice',
      ipOwnership: 'Vollständig an Auftraggeber',
      invoiceInterval: 'Monatlich'
    }
  },
  {
    id: 'freelancer_design',
    name: 'Grafikdesign Freelancer',
    description: 'Für Design- und Kreativprojekte',
    contractType: 'freelancer',
    icon: '🎨',
    tags: ['Design', 'Kreativ', 'Marketing'],
    prefilled: {
      description: 'Erstellung von Corporate Design, Logo, Geschäftsausstattung und Marketing-Materialien.',
      payment: '65€ pro Stunde',
      timeframe: '6 Wochen',
      rights: 'Exklusive Nutzungsrechte für den Auftraggeber',
      workLocation: 'Flexibel nach Absprache',
      ipOwnership: 'Vollständig an Auftraggeber',
      invoiceInterval: 'Nach Meilensteine'
    }
  },
  {
    id: 'freelancer_consulting',
    name: 'Unternehmensberatung',
    description: 'Für Beratungs- und Consulting-Projekte',
    contractType: 'freelancer',
    icon: '📊',
    tags: ['Beratung', 'Business', 'Strategie'],
    isPremium: true,
    prefilled: {
      description: 'Strategische Unternehmensberatung, Prozessoptimierung und Change Management.',
      payment: '1.200€ Tagessatz',
      timeframe: '6 Monate',
      rights: 'Auftraggeber erhält uneingeschränkte Nutzungsrechte',
      confidentiality: 'Streng vertraulich',
      liability: 'Auf doppelten Auftragswert begrenzt'
    }
  },
  
  // Mietvertrag Templates
  {
    id: 'miet_wohnung',
    name: 'Standard Wohnungsmietvertrag',
    description: '3-Zimmer Wohnung in der Stadt',
    contractType: 'mietvertrag',
    icon: '🏙️',
    tags: ['Wohnung', 'Stadt', 'Standard'],
    prefilled: {
      baseRent: '1.200€',
      extraCosts: '250€ Vorauszahlung',
      termination: '3 Monate zum Monatsende'
    }
  },
  {
    id: 'miet_gewerbe',
    name: 'Gewerbemietvertrag',
    description: 'Für Büro- oder Ladenflächen',
    contractType: 'mietvertrag',
    icon: '🏪',
    tags: ['Gewerbe', 'Büro', 'Laden'],
    isPremium: true,
    prefilled: {
      baseRent: '2.500€',
      extraCosts: '500€ Vorauszahlung',
      termination: '6 Monate zum Quartalsende'
    }
  },
  
  // Arbeitsvertrag Templates
  {
    id: 'arbeit_vollzeit',
    name: 'Vollzeit Arbeitsvertrag',
    description: 'Standard Vollzeitanstellung',
    contractType: 'arbeitsvertrag',
    icon: '💼',
    tags: ['Vollzeit', 'Festanstellung'],
    prefilled: {
      workingHours: '40 Stunden/Woche',
      salary: '60.000€ brutto/Jahr'
    }
  },
  {
    id: 'arbeit_teilzeit',
    name: 'Teilzeit Arbeitsvertrag',
    description: '20-30 Stunden pro Woche',
    contractType: 'arbeitsvertrag',
    icon: '⏰',
    tags: ['Teilzeit', 'Flexibel'],
    prefilled: {
      workingHours: '25 Stunden/Woche',
      salary: '35.000€ brutto/Jahr'
    }
  },
  {
    id: 'arbeit_minijob',
    name: 'Minijob Vertrag',
    description: '520€ Basis',
    contractType: 'arbeitsvertrag',
    icon: '👤',
    tags: ['Minijob', '520€'],
    prefilled: {
      workingHours: '10 Stunden/Woche',
      salary: '520€/Monat'
    }
  },
  
  // Kaufvertrag Templates
  {
    id: 'kauf_auto',
    name: 'KFZ-Kaufvertrag',
    description: 'Für Gebrauchtwagen',
    contractType: 'kaufvertrag',
    icon: '🚗',
    tags: ['Auto', 'KFZ', 'Fahrzeug'],
    prefilled: {
      item: 'Gebrauchtes Kraftfahrzeug, Marke: [MARKE], Modell: [MODELL], Baujahr: [JAHR], Kilometerstand: [KM]',
      price: '15.000€'
    }
  },
  {
    id: 'kauf_immobilie',
    name: 'Immobilienkaufvertrag',
    description: 'Für Häuser und Wohnungen',
    contractType: 'kaufvertrag',
    icon: '🏡',
    tags: ['Immobilie', 'Haus', 'Wohnung'],
    isPremium: true,
    prefilled: {
      item: 'Eigentumswohnung/Haus, [QM]m², Baujahr: [JAHR], Lage: [ORT]',
      price: '450.000€'
    }
  }
];

// Premium Notice Component
const PremiumNotice: React.FC<{ onUpgradeClick: () => void }> = ({ onUpgradeClick }) => (
  <motion.div 
    className={styles.premiumNotice}
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.5 }}
  >
    <div className={styles.premiumContent}>
      <div className={styles.premiumIcon}>
        <Sparkles size={24} />
      </div>
      <div className={styles.premiumText}>
        <h3>Premium-Feature</h3>
        <p>KI-Vertragsgenerierung erfordert ein Premium-Abo</p>
      </div>
      <motion.button 
        className={styles.upgradeButton}
        onClick={onUpgradeClick}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <Zap size={16} />
        Jetzt upgraden
      </motion.button>
    </div>
  </motion.div>
);

// 🆕 Template Library Component
const TemplateLibrary: React.FC<{
  contractType: string;
  onSelectTemplate: (template: ContractTemplate) => void;
  isPremium: boolean;
}> = ({ contractType, onSelectTemplate, isPremium }) => {
  const relevantTemplates = CONTRACT_TEMPLATES.filter(t => t.contractType === contractType);
  
  if (relevantTemplates.length === 0) return null;
  
  return (
    <motion.div 
      className={styles.templateLibrary}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className={styles.templateHeader}>
        <BookOpen size={20} />
        <h3>Vorlagen-Bibliothek</h3>
        <span className={styles.templateCount}>{relevantTemplates.length} Vorlagen</span>
      </div>
      
      <div className={styles.templateGrid}>
        {relevantTemplates.map((template) => (
          <motion.div
            key={template.id}
            className={`${styles.templateCard} ${template.isPremium && !isPremium ? styles.locked : ''}`}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              if (!template.isPremium || isPremium) {
                onSelectTemplate(template);
                toast.success(`✅ Vorlage "${template.name}" geladen!`);
              } else {
                toast.warning('🔒 Diese Vorlage erfordert Premium');
              }
            }}
          >
            <div className={styles.templateIcon}>{template.icon}</div>
            <div className={styles.templateInfo}>
              <h4>{template.name}</h4>
              <p>{template.description}</p>
              <div className={styles.templateTags}>
                {template.tags.map(tag => (
                  <span key={tag} className={styles.tag}>{tag}</span>
                ))}
              </div>
            </div>
            {template.isPremium && (
              <div className={styles.premiumBadge}>
                <Star size={12} />
                Premium
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

export default function Generate() {
  // Navigation
  const navigate = useNavigate();

  // Auth Context
  const { user, isLoading } = useAuth();
  const isPremium = true; // Temporär für Testing

  // State Management
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedType, setSelectedType] = useState<ContractType | null>(null);
  const [formData, setFormData] = useState<FormDataType>({});
  const [contractText, setContractText] = useState<string>(""); // 📴 RENAMED von generated
  const [generatedHTML, setGeneratedHTML] = useState<string>(""); // 📴 NEU: HTML-Version für professionelle PDFs
  const [loading, setLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [saved, setSaved] = useState<boolean>(false);
  const [savedContractId, setSavedContractId] = useState<string | null>(null); // 🆕 NEU: Contract ID speichern
  const [signatureURL, setSignatureURL] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [showPreview, setShowPreview] = useState<boolean>(false);
  const [showTemplates, setShowTemplates] = useState<boolean>(false); // 🆕
  
  // Company Profile State
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(null);
  const [useCompanyProfile, setUseCompanyProfile] = useState<boolean>(false);
  
  // Design Variant State 
  const [selectedDesignVariant, setSelectedDesignVariant] = useState<string>('executive');

  // Contract Data State
  const [contractData, setContractData] = useState<any>({
    contractType: '',
    parties: {},
    contractDetails: {}
  });

  // Refs
  const contractRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Load Company Profile on mount
  useEffect(() => {
    if (isPremium && !isLoading && user) {
      loadCompanyProfile();
    }
  }, [isPremium, isLoading, user]);

  // Auto-activate company profile when loaded
  useEffect(() => {
    if (companyProfile && !useCompanyProfile) {
      setUseCompanyProfile(true);
      console.log('✅ Company Profile automatisch aktiviert');
    }
  }, [companyProfile, useCompanyProfile]);

  const loadCompanyProfile = async () => {
    try {
      const response = await fetch('/api/company-profile/me', {
        credentials: 'include'
      });

      const data = await response.json();
      
      if (data.success && data.profile) {
        setCompanyProfile(data.profile);
        console.log('✅ Firmenprofil geladen:', data.profile.companyName);
      }
    } catch (error) {
      console.error('❌ Fehler beim Laden des Firmenprofils:', error);
    }
  };

  // 🆕 Template Selection Handler - FIX für TypeScript Fehler #1
  const handleTemplateSelect = (template: ContractTemplate) => {
    setFormData((prev: FormDataType) => ({
      ...prev,
      ...template.prefilled,
      title: `${template.name} - ${new Date().toLocaleDateString()}`
    }));
    setShowTemplates(false);
  };

  // Auto-fill company data when profile is used
  const toggleCompanyProfile = (enabled: boolean) => {
    setUseCompanyProfile(enabled);
    
    if (enabled && companyProfile && selectedType) {
      const updatedFormData = { ...formData };
      const companyFullName = `${companyProfile.companyName}${companyProfile.legalForm ? ` (${companyProfile.legalForm})` : ''}`;
      const companyFullAddress = `${companyProfile.street}, ${companyProfile.postalCode} ${companyProfile.city}`;
      
      switch (selectedType.id) {
        case 'freelancer':
          updatedFormData.nameClient = companyFullName;
          updatedFormData.clientAddress = companyFullAddress;
          break;
        case 'arbeitsvertrag':
          updatedFormData.employer = companyFullName;
          break;
        case 'mietvertrag':
          updatedFormData.landlord = companyFullName;
          break;
        case 'kaufvertrag':
          updatedFormData.seller = companyFullName;
          break;
        case 'nda':
          updatedFormData.partyA = companyFullName;
          break;
        case 'gesellschaftsvertrag':
          updatedFormData.partners = `${companyFullName}\n${companyFullAddress}`;
          break;
        case 'darlehensvertrag':
          updatedFormData.lender = companyFullName;
          break;
        case 'lizenzvertrag':
          updatedFormData.licensor = companyFullName;
          break;
        case 'pachtvertrag':
          updatedFormData.lessor = companyFullName;
          break;
        case 'aufhebungsvertrag':
          updatedFormData.employer = companyFullName;
          break;
      }
      
      setFormData(updatedFormData);
      toast.success('✅ Firmendaten wurden automatisch eingefügt!');
    }
  };

  // Field Validation
  const validateField = (field: ContractType['fields'][0], value: string): boolean => {
    if (!field.validation) return true;
    
    if (field.validation.pattern) {
      const regex = new RegExp(field.validation.pattern);
      if (!regex.test(value)) return false;
    }
    
    if (field.validation.min && value.length < field.validation.min) return false;
    if (field.validation.max && value.length > field.validation.max) return false;
    
    return true;
  };

  // Canvas Functions (existing)
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (canvas.width !== 800) {
      canvas.width = 800;
      canvas.height = 200;
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = "#1d4ed8";
    }

    setIsDrawing(true);
    
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);
    
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);
    
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const handleCanvasMouseUp = () => {
    setIsDrawing(false);
  };

  const handleCanvasClick = () => {
    console.log("🖊️ Canvas wurde geklickt!");
  };

  // Touch Events für Mobile
  const handleCanvasTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (canvas.width !== 800) {
      canvas.width = 800;
      canvas.height = 200;
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = "#1d4ed8";
    }

    setIsDrawing(true);
    
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const x = (touch.clientX - rect.left) * (canvas.width / rect.width);
    const y = (touch.clientY - rect.top) * (canvas.height / rect.height);
    
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const handleCanvasTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();
    
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const x = (touch.clientX - rect.left) * (canvas.width / rect.width);
    const y = (touch.clientY - rect.top) * (canvas.height / rect.height);
    
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const handleCanvasTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    setIsDrawing(false);
  };

  // Form Handling
  const handleInputChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // FIX für TypeScript Fehler #2
  const handleTypeSelect = (type: ContractType) => {
    setSelectedType(type);
    setContractData((prev: any) => ({
      ...prev,
      contractType: type.name,
      parties: formData,
      contractDetails: formData
    }));
    const initialData: FormDataType = { title: `${type.name} - ${new Date().toLocaleDateString()}` };
    
    // Auto-fill company data if profile is active
    if (useCompanyProfile && companyProfile) {
      const companyFullName = `${companyProfile.companyName}${companyProfile.legalForm ? ` (${companyProfile.legalForm})` : ''}`;
      const companyFullAddress = `${companyProfile.street}, ${companyProfile.postalCode} ${companyProfile.city}`;
      
      switch (type.id) {
        case 'freelancer':
          initialData.nameClient = companyFullName;
          initialData.clientAddress = companyFullAddress;
          break;
        case 'arbeitsvertrag':
          initialData.employer = companyFullName;
          break;
        case 'mietvertrag':
          initialData.landlord = companyFullName;
          break;
        case 'kaufvertrag':
          initialData.seller = companyFullName;
          break;
        case 'nda':
          initialData.partyA = companyFullName;
          break;
        case 'gesellschaftsvertrag':
          initialData.partners = `${companyFullName}\n${companyFullAddress}`;
          break;
        case 'darlehensvertrag':
          initialData.lender = companyFullName;
          break;
        case 'lizenzvertrag':
          initialData.licensor = companyFullName;
          break;
        case 'pachtvertrag':
          initialData.lessor = companyFullName;
          break;
        case 'aufhebungsvertrag':
          initialData.employer = companyFullName;
          break;
      }
    }
    
    setFormData(initialData);
    setCurrentStep(2);
    setShowTemplates(true); // Show templates when type is selected
  };

  const isStepComplete = (step: number): boolean => {
    switch (step) {
      case 1: return selectedType !== null;
      case 2: 
        if (!selectedType) return false;
        return selectedType.fields.filter(f => f.required).every(field => 
          formData[field.name] && formData[field.name]!.trim() !== ''
        );
      case 3: return contractText !== "";
      default: return false;
    }
  };

  // 📴 AKTUALISIERT: handleGenerate empfängt jetzt auch HTML
  const handleGenerate = async () => {
    if (!selectedType || !isPremium) return;

    setLoading(true);
    setContractText("");
    setGeneratedHTML(""); // 📴 NEU: HTML zurücksetzen
    setCopied(false);
    setSaved(false);
    setSavedContractId(null); // Reset saved contract ID

    try {
      const res = await fetch("/api/contracts/generate", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          type: selectedType.id, 
          formData: { ...formData, title: formData.title || selectedType.name },
          useCompanyProfile: useCompanyProfile && !!companyProfile,
          designVariant: selectedDesignVariant
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Fehler bei der Generierung.");
      
      setContractText(data.contractText);
      setGeneratedHTML(data.contractHTML || ""); // 📴 NEU: HTML speichern wenn vorhanden
      
      // Update contractData with generated info
      setContractData((prev: any) => ({
        ...prev,
        contractType: selectedType.name,
        parties: formData,
        contractDetails: formData
      }));
      
      setCurrentStep(3);
      setShowPreview(true);
      
      console.log("✅ Vertrag generiert mit HTML-Support:", {
        hasHTML: !!data.contractHTML,
        htmlLength: data.contractHTML?.length || 0,
        hasCompanyProfile: data.metadata?.hasCompanyProfile,
        hasLogo: data.metadata?.hasLogo
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unbekannter Fehler";
      toast.error("❌ Fehler: " + msg);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(contractText);
      setCopied(true);
      toast.success("📋 Vertrag erfolgreich kopiert!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("❌ Kopieren fehlgeschlagen.");
    }
  };

  // ✅ FIX 1: VERBESSERTE handleSave FUNKTION OHNE AUTOMATISCHEN REDIRECT
  const handleSave = async () => {
    try {
      console.log("📤 Speichere Vertrag...");
      
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'https://api.contract-ai.de'}/api/contracts`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: `${contractData.contractType || 'Vertrag'} - ${new Date().toLocaleDateString('de-DE')}`,
          content: contractText || '',
          htmlContent: generatedHTML || undefined,
          isGenerated: true,
          metadata: {
            contractType: contractData.contractType,
            parties: contractData.parties,
            contractDetails: contractData.contractDetails,
            hasLogo: !!(useCompanyProfile && companyProfile?.logoUrl),
            generatedAt: new Date().toISOString()
          }
        })
      });

      const data = await res.json();
      
      if (res.ok && data.contractId) {
        console.log("✅ Vertrag gespeichert:", data);
        
        // WICHTIG: Setze savedContractId UND localStorage
        setSavedContractId(data.contractId);
        localStorage.setItem('lastGeneratedContractId', data.contractId);
        setSaved(true);
        
        // 📴 FIX: Einfachere Toast-Lösung ohne id-Property
        toast.success("✅ Vertrag erfolgreich gespeichert!", {
          autoClose: 3000,
          position: 'top-center',
        });
        
        // Optional: Zeige Buttons als separate Info-Toast
        setTimeout(() => {
          toast.info(
            <div className="flex gap-2">
              <button
                onClick={() => navigate('/dashboard')}
                className="px-2 py-1 bg-blue-600 text-white rounded text-xs"
              >
                Dashboard
              </button>
              <button
                onClick={() => navigate(`/contracts/${data.contractId}`)}
                className="px-2 py-1 bg-green-600 text-white rounded text-xs"
              >
                Ansehen
              </button>
            </div>,
            {
              autoClose: 5000,
              position: 'top-center',
              closeButton: true
            }
          );
        }, 100);
        
        // KEIN automatischer Redirect!
        
      } else {
        throw new Error(data.error || 'Speichern fehlgeschlagen');
      }
    } catch (error) {
      console.error("❌ Fehler beim Speichern:", error);
      toast.error(`❌ Fehler beim Speichern: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
    }
  };

  // 🚀 NEUE VERBESSERTE handleDownloadPDF MIT AUTOMATISCHEM SPEICHERN
  const handleDownloadPDF = async () => {
    try {
      console.log("🚀 Starte PDF Export...");
      
      // Dynamisch html2pdf laden
      const html2pdfModule = await import('html2pdf.js');
      const html2pdf = html2pdfModule.default || html2pdfModule;
      
      // Prüfe ob Contract ID vorhanden ist
      let contractId = savedContractId || localStorage.getItem('lastGeneratedContractId');
      console.log("📊 Contract ID Status:", { 
        savedContractId, 
        fromLocalStorage: localStorage.getItem('lastGeneratedContractId'), 
        final: contractId 
      });
      
      // 🆕 AUTOMATISCH SPEICHERN wenn noch nicht gespeichert
      if (!contractId && contractText) {
        console.log("📝 Speichere Vertrag automatisch vor PDF-Export...");
        toast.info("📝 Speichere Vertrag für optimale PDF-Qualität...", {
          autoClose: 2000
        });
        
        try {
          const res = await fetch(`${import.meta.env.VITE_API_URL || 'https://api.contract-ai.de'}/api/contracts`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: `${contractData.contractType || 'Vertrag'} - ${new Date().toLocaleDateString('de-DE')}`,
              content: contractText,
              htmlContent: generatedHTML,
              isGenerated: true,
              metadata: {
                contractType: contractData.contractType,
                parties: contractData.parties,
                contractDetails: contractData.contractDetails,
                hasLogo: !!(useCompanyProfile && companyProfile?.logoUrl),
                generatedAt: new Date().toISOString()
              }
            })
          });

          const data = await res.json();
          if (res.ok && data.contractId) {
            contractId = data.contractId;
            setSavedContractId(data.contractId);
            localStorage.setItem('lastGeneratedContractId', data.contractId);
            setSaved(true);
            console.log("✅ Vertrag automatisch gespeichert:", data.contractId);
          } else {
            console.warn("⚠️ Automatisches Speichern fehlgeschlagen:", data.error);
          }
        } catch (saveError) {
          console.error("❌ Fehler beim automatischen Speichern:", saveError);
          // Fahre trotzdem mit html2pdf fort
        }
      }
      
      // ✅ PRIORITÄT 1: Nutze Puppeteer wenn Contract gespeichert wurde
      if (contractId) {
        console.log("🚀 Versuche Puppeteer PDF-Generierung mit Contract ID:", contractId);
        
        try {
          const puppeteerUrl = `${import.meta.env.VITE_API_URL || 'https://api.contract-ai.de'}/api/contracts/generate/pdf`;
          console.log("📊 Puppeteer URL:", puppeteerUrl);
          
          const response = await fetch(puppeteerUrl, {
            method: 'POST',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
              contractId: contractId 
            })
          });

          console.log("📊 Puppeteer Response:", {
            status: response.status,
            statusText: response.statusText,
            contentType: response.headers.get('content-type')
          });

          if (response.ok) {
            const contentType = response.headers.get('content-type');
            
            if (contentType && contentType.includes('application/pdf')) {
              // PDF erfolgreich erhalten
              const blob = await response.blob();
              console.log("✅ PDF Blob erhalten:", blob.size, "bytes");
              
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `${contractData.contractType || 'vertrag'}_${new Date().toLocaleDateString('de-DE').replace(/\./g, '-')}_professional.pdf`;
              document.body.appendChild(a);
              a.click();
              window.URL.revokeObjectURL(url);
              document.body.removeChild(a);
              
              toast.success("✅ Professionelles PDF mit Logo generiert!");
              console.log("✅ Puppeteer PDF erfolgreich heruntergeladen");
              return; // WICHTIG: Beende hier, kein Fallback!
            } else {
              console.error("❌ Unerwarteter Content-Type von Puppeteer:", contentType);
              const errorText = await response.text();
              console.error("Response Body:", errorText);
            }
          } else {
            const errorText = await response.text();
            console.error("❌ Puppeteer Fehler:", response.status, errorText);
            
            try {
              const errorJson = JSON.parse(errorText);
              if (errorJson.error) {
                toast.error(`Puppeteer-Fehler: ${errorJson.error}`);
              }
            } catch {
              // Nicht JSON
            }
          }
        } catch (puppeteerError) {
          console.error("❌ Netzwerkfehler bei Puppeteer:", puppeteerError);
        }
      }

      // ✅ PRIORITÄT 2: Fallback zu html2pdf.js nur wenn Puppeteer nicht funktioniert
      console.log("⚠️ Fallback zu html2pdf.js");
      
      if (generatedHTML) {
        console.log("🎨 Verwende HTML-Version für html2pdf.js Export");
        
        // Erstelle temporären Container
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = generatedHTML;
        tempDiv.style.position = 'absolute';
        tempDiv.style.left = '-9999px';
        tempDiv.style.top = '0';
        tempDiv.style.width = '210mm';
        document.body.appendChild(tempDiv);

        const opt = {
          margin: [15, 10, 15, 10],
          filename: `${contractData.contractType || 'vertrag'}_${new Date().toLocaleDateString('de-DE').replace(/\./g, '-')}.pdf`,
          image: { 
            type: 'jpeg', 
            quality: 0.98 
          },
          html2canvas: { 
            scale: 2,
            useCORS: true,
            letterRendering: true,
            logging: false,
            width: tempDiv.scrollWidth,
            height: tempDiv.scrollHeight
          },
          jsPDF: { 
            unit: 'mm', 
            format: 'a4', 
            orientation: 'portrait',
            compress: true
          },
          pagebreak: { 
            mode: ['avoid-all', 'css'],
            before: '.page-break-before',
            after: '.page-break-after'
          }
        };

        // @ts-expect-error - html2pdf type definitions are incomplete
        await html2pdf.set(opt).from(tempDiv).save();
        
        document.body.removeChild(tempDiv);
        
        console.log("✅ PDF mit html2pdf.js generiert");
        
      } else if (contractText) {
        // ✅ PRIORITÄT 3: Text-Fallback
        console.log("📄 Text-Fallback für PDF Export");
        
        const element = document.createElement('div');
        element.innerHTML = `
          <div style="font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto;">
            <h1 style="color: #1e3a8a; border-bottom: 2px solid #1e3a8a; padding-bottom: 10px;">
              ${contractData.contractType || 'Vertrag'}
            </h1>
            <div style="margin-top: 30px; line-height: 1.6; white-space: pre-wrap;">
              ${contractText}
            </div>
          </div>
        `;
        
        const opt = {
          margin: 1,
          filename: `${contractData.contractType || 'vertrag'}_${new Date().toLocaleDateString('de-DE').replace(/\./g, '-')}_basic.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2 },
          jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
        };
        
        // @ts-expect-error - html2pdf type definitions are incomplete
        await html2pdf.set(opt).from(element).save();
        
        toast.info("💡 PDF wurde erstellt!", {
          autoClose: 3000
        });
      } else {
        toast.error("❌ Kein Vertrag zum Exportieren vorhanden");
      }
      
    } catch (error) {
      console.error("❌ Fehler beim PDF-Export:", error);
      toast.error(`❌ PDF-Export fehlgeschlagen: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
    }
  };

  const saveSignature = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        const blankCanvas = document.createElement('canvas');
        blankCanvas.width = canvas.width;
        blankCanvas.height = canvas.height;
        
        const canvasData = canvas.toDataURL();
        const blankData = blankCanvas.toDataURL();
        
        if (canvasData === blankData) {
          toast.warning("🖊️ Bitte zeichnen Sie zuerst eine Unterschrift!");
          return;
        }
      }
      
      const dataURL = canvas.toDataURL("image/png");
      setSignatureURL(dataURL);
      toast.success("✅ Unterschrift wurde erfolgreich gespeichert!");
    }
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (ctx && canvas) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setSignatureURL(null);
    }
  };

  const handleUpgradeClick = () => {
    navigate('/upgrade');
  };

  // Loading State
  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingContent}>
          <div className={styles.loadingSpinner}></div>
          <p>Initialisiere Vertragsgenerator...</p>
        </div>
      </div>
    );
  }

  // FORTSETZUNG DER KOMPONENTE... (Rest des JSX bleibt gleich)
  return (
    <>
      <Helmet>
        <title>Verträge erstellen & sofort nutzen – KI-Generator | Contract AI</title>
        <meta name="description" content="Erstelle rechtssichere, individuelle Verträge in Minuten mit KI. Einfach, schnell & sofort einsatzbereit. Jetzt starten & direkt nutzen!" />
        <meta name="keywords" content="Verträge erstellen, Vertragsgenerator, KI Vertragserstellung, individuelle Vertragsvorlagen, Contract AI" />
        <link rel="canonical" href="https://contract-ai.de/generate" />
      </Helmet>

      <div className={styles.contractGenerator}>
        {/* Header */}
        <motion.header 
          className={styles.generatorHeader}
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className={styles.headerContent}>
            <div className={styles.headerText}>
              <h1>
                <FileText size={28} />
                Intelligente Vertragserstellung
              </h1>
              <p>Erstellen Sie rechtssichere Verträge in wenigen Minuten – powered by KI</p>
            </div>
            
            {/* Progress Steps */}
            <div className={styles.progressSteps}>
              {[
                { num: 1, label: "Typ auswählen", icon: Clipboard },
                { num: 2, label: "Details eingeben", icon: Edit3 },
                { num: 3, label: "Vertrag erstellen", icon: Sparkles },
                { num: 4, label: "Finalisieren", icon: CheckCircle }
              ].map(({ num, label, icon: Icon }) => (
                <div 
                  key={num}
                  className={`${styles.step} ${currentStep >= num ? styles.active : ''} ${isStepComplete(num) ? styles.completed : ''}`}
                >
                  <div className={styles.stepIndicator}>
                    {isStepComplete(num) ? <Check size={16} /> : <Icon size={16} />}
                  </div>
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.header>

        <div className={styles.generatorContent}>
          {/* Premium Notice */}
          {!isPremium && <PremiumNotice onUpgradeClick={handleUpgradeClick} />}

          {/* Main Content */}
          <div className={`${styles.contentGrid} ${showPreview ? styles.withPreview : ''}`}>
            {/* Left Panel - Forms */}
            <motion.div 
              className={styles.formPanel}
              layout
              transition={{ duration: 0.3 }}
            >
              <AnimatePresence mode="wait" initial={false}>
                {/* Step 1: Contract Type Selection */}
                {currentStep === 1 && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className={styles.stepContent}
                  >
                    <div className={styles.stepHeader}>
                      <h2>Welchen Vertrag möchten Sie erstellen?</h2>
                      <p>Wählen Sie den passenden Vertragstyp aus unserer erweiterten Bibliothek</p>
                    </div>

                    <div className={styles.contractTypesGrid}>
                      {CONTRACT_TYPES.map((type) => (
                        <motion.button
                          key={type.id}
                          className={`${styles.contractTypeCard} ${selectedType?.id === type.id ? styles.selected : ''}`}
                          onClick={() => handleTypeSelect(type)}
                          disabled={!isPremium}
                          whileHover={isPremium ? { scale: 1.02, y: -4 } : {}}
                          whileTap={isPremium ? { scale: 0.98 } : {}}
                          transition={{ duration: 0.2 }}
                        >
                          {type.isNew && (
                            <div className={styles.newBadge}>NEU</div>
                          )}
                          {type.popularity && type.popularity > 80 && (
                            <div className={styles.popularBadge}>
                              <TrendingUp size={12} />
                              Beliebt
                            </div>
                          )}
                          <div className={styles.cardIcon}>{type.icon}</div>
                          <h3>{type.name}</h3>
                          <p>{type.description}</p>
                          <div className={styles.cardArrow}>
                            <ArrowRight size={16} />
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Step 2: Form Fields */}
                {currentStep === 2 && selectedType && (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className={styles.stepContent}
                  >
                    <div className={styles.stepHeader}>
                      <button 
                        className={styles.backButton}
                        onClick={() => setCurrentStep(1)}
                      >
                        <ArrowLeft size={16} />
                        Zurück
                      </button>
                      <h2>{selectedType.name} erstellen</h2>
                      <p>Füllen Sie die benötigten Informationen aus oder wählen Sie eine Vorlage</p>
                    </div>

                    {/* 🆕 Template Library */}
                    {showTemplates && (
                      <TemplateLibrary 
                        contractType={selectedType.id}
                        onSelectTemplate={handleTemplateSelect}
                        isPremium={isPremium}
                      />
                    )}

                    <div className={styles.contractForm}>
                      {/* Company Profile Toggle */}
                      {isPremium && companyProfile && (
                        <motion.div 
                          className={styles.companyProfileToggle}
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3 }}
                        >
                          <div className={styles.toggleHeader}>
                            <div className={styles.toggleInfo}>
                              <Building size={20} />
                              <div>
                                <h4>Firmenprofil verwenden</h4>
                                <p>Automatisch {companyProfile.companyName} als Vertragspartei einfügen</p>
                              </div>
                            </div>
                            <label className={styles.switch}>
                              <input
                                type="checkbox"
                                checked={useCompanyProfile}
                                onChange={(e) => toggleCompanyProfile(e.target.checked)}
                              />
                              <span className={styles.slider}></span>
                            </label>
                          </div>
                          {companyProfile.logoUrl && useCompanyProfile && (
                            <div className={styles.profilePreview}>
                              <img src={companyProfile.logoUrl} alt="Logo" />
                              <div className={styles.profileInfo}>
                                <strong>{companyProfile.companyName}</strong>
                                <span>{companyProfile.street}, {companyProfile.postalCode} {companyProfile.city}</span>
                              </div>
                            </div>
                          )}
                        </motion.div>
                      )}

                      {/* Design Variant Selector */}
                      {isPremium && (
                        <motion.div 
                          className={styles.designVariantSelector}
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: 0.1 }}
                        >
                          <div className={styles.selectorHeader}>
                            <div className={styles.selectorInfo}>
                              <Sparkles size={20} />
                              <div>
                                <h4>Design-Variante wählen</h4>
                                <p>Wählen Sie das perfekte Design für Ihre Verträge</p>
                              </div>
                            </div>
                          </div>
                          <div className={styles.designOptions}>
                            <div 
                              className={`${styles.designOption} ${selectedDesignVariant === 'executive' ? styles.active : ''}`}
                              onClick={() => setSelectedDesignVariant('executive')}
                            >
                              <div className={styles.designPreview}>
                                <div className={styles.executivePreview}></div>
                              </div>
                              <div className={styles.designDetails}>
                                <strong>Executive</strong>
                                <span>Elegant & Kraftvoll - Perfekt für wichtige Geschäftsverträge</span>
                              </div>
                            </div>
                            <div 
                              className={`${styles.designOption} ${selectedDesignVariant === 'modern' ? styles.active : ''}`}
                              onClick={() => setSelectedDesignVariant('modern')}
                            >
                              <div className={styles.designPreview}>
                                <div className={styles.modernPreview}></div>
                              </div>
                              <div className={styles.designDetails}>
                                <strong>Modern</strong>
                                <span>Frisch & Dynamisch - Ideal für innovative Unternehmen</span>
                              </div>
                            </div>
                            <div 
                              className={`${styles.designOption} ${selectedDesignVariant === 'minimal' ? styles.active : ''}`}
                              onClick={() => setSelectedDesignVariant('minimal')}
                            >
                              <div className={styles.designPreview}>
                                <div className={styles.minimalPreview}></div>
                              </div>
                              <div className={styles.designDetails}>
                                <strong>Minimal</strong>
                                <span>Klar & Fokussiert - Für maximale Lesbarkeit und Klarheit</span>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}

                      <div className={styles.formGrid}>
                        {/* Title Field */}
                        <div className={`${styles.formGroup} ${styles.spanning}`}>
                          <label htmlFor="title">Vertragstitel *</label>
                          <input
                            id="title"
                            type="text"
                            value={formData.title || ''}
                            onChange={(e) => handleInputChange('title', e.target.value)}
                            placeholder="z.B. Freelancer-Vertrag für Webentwicklung"
                            disabled={!isPremium}
                          />
                        </div>

                        {/* Dynamic Fields with Grouping */}
                        {(() => {
                          const groupedFields = selectedType.fields.reduce((groups, field) => {
                            const group = field.group || 'Allgemeine Angaben';
                            if (!groups[group]) groups[group] = [];
                            groups[group].push(field);
                            return groups;
                          }, {} as Record<string, typeof selectedType.fields>);

                          return Object.entries(groupedFields).map(([groupName, fields]) => (
                            <div key={groupName} className={styles.fieldGroup}>
                              {groupName !== 'Allgemeine Angaben' && (
                                <h4 className={styles.groupHeader}>{groupName}</h4>
                              )}
                              <div className={styles.groupFields}>
                                {fields.map((field) => (
                                  <div key={field.name} className={styles.formGroup}>
                                    <label htmlFor={field.name}>
                                      {field.label} {field.required && '*'}
                                      {field.helpText && (
                                        <span className={styles.helpText}>{field.helpText}</span>
                                      )}
                                    </label>
                                    
                                    {field.type === 'textarea' ? (
                                      <textarea
                                        id={field.name}
                                        rows={4}
                                        value={formData[field.name] || ''}
                                        onChange={(e) => handleInputChange(field.name, e.target.value)}
                                        placeholder={field.placeholder}
                                        disabled={!isPremium}
                                      />
                                    ) : field.type === 'select' ? (
                                      <select
                                        id={field.name}
                                        value={formData[field.name] || ''}
                                        onChange={(e) => handleInputChange(field.name, e.target.value)}
                                        disabled={!isPremium}
                                        className={!formData[field.name] ? styles.placeholder : ''}
                                      >
                                        <option value="">{field.placeholder}</option>
                                        {field.options?.map((option) => (
                                          <option key={option} value={option}>
                                            {option}
                                          </option>
                                        ))}
                                      </select>
                                    ) : (
                                      <input
                                        id={field.name}
                                        type={field.type === 'vat' || field.type === 'phone' ? 'text' : field.type}
                                        value={formData[field.name] || ''}
                                        onChange={(e) => handleInputChange(field.name, e.target.value)}
                                        placeholder={field.placeholder}
                                        disabled={!isPremium}
                                      />
                                    )}
                                    
                                    {field.validation && formData[field.name] && !validateField(field, formData[field.name] || '') && (
                                      <span className={styles.fieldError}>
                                        {field.validation.message || 'Ungültige Eingabe'}
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ));
                        })()}
                      </div>

                      <motion.button
                        type="button"
                        className={styles.generateButton}
                        onClick={handleGenerate}
                        disabled={loading || !isPremium || !isStepComplete(2)}
                        whileHover={isPremium && isStepComplete(2) ? { scale: 1.02 } : {}}
                        whileTap={isPremium && isStepComplete(2) ? { scale: 0.98 } : {}}
                      >
                        {loading ? (
                          <>
                            <div className={`${styles.loadingSpinner} ${styles.small}`}></div>
                            <span>KI erstellt Ihren Vertrag...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles size={18} />
                            <span>Vertrag mit KI erstellen</span>
                          </>
                        )}
                      </motion.button>
                    </div>
                  </motion.div>
                )}

                {/* Step 3: Generated Contract */}
                {currentStep === 3 && (
                  <motion.div
                    key="step3"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className={styles.stepContent}
                  >
                    <div className={styles.stepHeader}>
                      <h2>Ihr Vertrag ist fertig!</h2>
                      <p>Überprüfen Sie den Inhalt und fügen Sie optional eine Unterschrift hinzu</p>
                    </div>

                    {/* Action Buttons */}
                    <div className={styles.actionButtons}>
                      <motion.button
                        onClick={handleCopy}
                        className={`${styles.actionButton} ${copied ? styles.success : ''}`}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        {copied ? <CheckCircle size={16} /> : <Clipboard size={16} />}
                        <span>{copied ? "Kopiert!" : "Text kopieren"}</span>
                      </motion.button>

                      <motion.button
                        onClick={handleSave}
                        className={`${styles.actionButton} ${saved ? styles.success : ''}`}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        {saved ? <CheckCircle size={16} /> : <Save size={16} />}
                        <span>{saved ? "Gespeichert!" : "Vertrag speichern"}</span>
                      </motion.button>

                      <motion.button
                        onClick={handleDownloadPDF}
                        className={`${styles.actionButton} ${styles.primary}`}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Download size={16} />
                        <span>Als PDF herunterladen</span>
                      </motion.button>
                    </div>

                    {/* Digital Signature */}
                    <div className={styles.signatureSection}>
                      <h3>
                        <PenTool size={18} />
                        Digitale Unterschrift (optional)
                      </h3>
                      
                      <div className={styles.signatureCanvasContainer}>
                        <canvas 
                          ref={canvasRef}
                          className={`${styles.signatureCanvas} ${isDrawing ? styles.drawing : ''}`}
                          width={800}
                          height={200}
                          onClick={handleCanvasClick}
                          onMouseDown={handleCanvasMouseDown}
                          onMouseMove={handleCanvasMouseMove}
                          onMouseUp={handleCanvasMouseUp}
                          onMouseLeave={handleCanvasMouseUp}
                          onTouchStart={handleCanvasTouchStart}
                          onTouchMove={handleCanvasTouchMove}
                          onTouchEnd={handleCanvasTouchEnd}
                          style={{
                            cursor: 'crosshair',
                            touchAction: 'none',
                            userSelect: 'none',
                            display: 'block',
                            width: '100%',
                            height: '200px'
                          }}
                        />
                        <div className={styles.canvasOverlay}>
                          {!signatureURL && (
                            <p className={styles.canvasPlaceholder}>
                              Hier unterschreiben
                            </p>
                          )}
                          {signatureURL && (
                            <div className={styles.signaturePreview}>
                              <img src={signatureURL} alt="Unterschrift" />
                            </div>
                          )}
                        </div>
                      </div>

                      <div className={styles.signatureControls}>
                        <motion.button
                          onClick={clearSignature}
                          className={`${styles.signatureButton} ${styles.secondary}`}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <RefreshCw size={16} />
                          <span>Neu zeichnen</span>
                        </motion.button>

                        <motion.button
                          onClick={saveSignature}
                          className={`${styles.signatureButton} ${styles.primary}`}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <Check size={16} />
                          <span>Unterschrift verwenden</span>
                        </motion.button>
                      </div>
                    </div>

                    <motion.button
                      className={styles.backToStartButton}
                      onClick={() => {
                        setCurrentStep(1);
                        setSelectedType(null);
                        setFormData({});
                        setContractText("");
                        setGeneratedHTML(""); // 📴 NEU: HTML zurücksetzen
                        setShowPreview(false);
                        setSignatureURL(null);
                        setSavedContractId(null); // Reset saved contract ID
                      }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <ArrowLeft size={16} />
                      <span>Neuen Vertrag erstellen</span>
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Right Panel - Preview */}
            <AnimatePresence>
              {showPreview && contractText && (
                <motion.div 
                  className={styles.previewPanel}
                  initial={{ opacity: 0, x: 20, width: 0 }}
                  animate={{ opacity: 1, x: 0, width: "auto" }}
                  exit={{ opacity: 0, x: 20, width: 0 }}
                  transition={{ duration: 0.4 }}
                >
                  <div className={styles.previewHeader}>
                    <h3>
                      <Eye size={18} />
                      Vertragsvorschau
                    </h3>
                    <button 
                      className={styles.closePreview}
                      onClick={() => setShowPreview(false)}
                    >
                      ×
                    </button>
                  </div>
                  
                  <div className={styles.previewContainer}>
                    <div 
                      ref={contractRef}
                      className={styles.contractContent}
                      dangerouslySetInnerHTML={{ 
                        __html: contractText.replace(/\n/g, '<br/>') 
                      }}
                    />
                    
                    {signatureURL && (
                      <div className={styles.signatureInPreview}>
                        <div className={styles.signatureLabel}>Digitale Unterschrift:</div>
                        <img src={signatureURL} alt="Unterschrift" />
                        <div className={styles.signatureDate}>
                          Unterschrieben am {new Date().toLocaleString('de-DE')}
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Loading Overlay */}
        <AnimatePresence>
          {loading && (
            <motion.div 
              className={styles.loadingOverlay}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className={styles.loadingContent}>
                <div className={`${styles.loadingSpinner} ${styles.large}`}></div>
                <h3>KI erstellt Ihren Vertrag</h3>
                <p>Bitte warten Sie einen Moment...</p>
                <div className={styles.loadingProgress}>
                  <div className={styles.loadingBar}></div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}