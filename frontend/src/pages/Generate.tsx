/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  CheckCircle, Clipboard, Save, FileText, Check, Download,
  ArrowRight, ArrowLeft, Sparkles, Edit3, Building,
  TrendingUp, Send, RefreshCw, Paperclip, Upload, Archive,
  Image, File, X, Info, Palette, Wrench, Scissors, ChevronDown
} from "lucide-react";
import styles from "../styles/Generate.module.css";
import { toast } from 'react-toastify';
import { useAuth } from "../context/AuthContext";
import UnifiedPremiumNotice from "../components/UnifiedPremiumNotice";
import CreateTemplateModal, { TemplateFormData } from "../components/CreateTemplateModal";
import EnhancedTemplateLibrary from "../components/EnhancedTemplateLibrary";
import GuidedContractWizard from "../components/GuidedContractWizard";
import EnhancedSignatureModal from "../components/EnhancedSignatureModal";
import { UserTemplate, createUserTemplate } from "../services/userTemplatesAPI";
import { WelcomePopup } from "../components/Tour";

// Types
export interface FormDataType {
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

export interface ContractTemplate {
  id: string;
  name: string;
  description: string;
  contractType: string;
  icon: string;
  prefilled: FormDataType;
  tags: string[];
  isPremium?: boolean;
}

// 📎 Attachment Interface für Anlagen
interface Attachment {
  id: string;
  file: File;
  displayName: string;
  originalName: string;
  size: number;
  type: string;
}

// CONTRACT TYPES - Vollständige Definition
const CONTRACT_TYPES: ContractType[] = [
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
    jurisdiction: 'DE',
    category: 'Immobilien',
    estimatedDuration: '8-12 Minuten',
    popularity: 85,
    fields: [
      // Vertragsparteien
      {
        name: 'landlord',
        label: 'Vermieter (Name)',
        type: 'text',
        placeholder: 'Vollständiger Name des Vermieters',
        required: true,
        group: 'Vertragsparteien'
      },
      {
        name: 'landlordAddress',
        label: 'Adresse Vermieter',
        type: 'textarea',
        placeholder: 'Straße, Hausnummer, PLZ, Ort',
        required: true,
        group: 'Vertragsparteien',
        helpText: 'Vollständige Anschrift für Korrespondenz'
      },
      {
        name: 'tenant',
        label: 'Mieter (Name)',
        type: 'text',
        placeholder: 'Vollständiger Name des Mieters',
        required: true,
        group: 'Vertragsparteien'
      },
      {
        name: 'tenantAddress',
        label: 'Aktuelle Adresse Mieter',
        type: 'textarea',
        placeholder: 'Bisherige Anschrift des Mieters',
        required: false,
        group: 'Vertragsparteien'
      },
      // Mietobjekt
      {
        name: 'propertyType',
        label: 'Art des Mietobjekts',
        type: 'select',
        placeholder: 'Wählen Sie die Art',
        required: true,
        group: 'Mietobjekt',
        options: ['Wohnung', 'Einfamilienhaus', 'Doppelhaushälfte', 'Reihenhaus', 'Bürofläche', 'Gewerbefläche', 'Ladenfläche', 'Lager/Halle']
      },
      {
        name: 'address',
        label: 'Adresse des Mietobjekts',
        type: 'textarea',
        placeholder: 'Vollständige Adresse der Mietimmobilie inkl. Etage/Wohnungsnummer',
        required: true,
        group: 'Mietobjekt'
      },
      {
        name: 'size',
        label: 'Wohnfläche (m²)',
        type: 'text',
        placeholder: 'z.B. 85 m²',
        required: true,
        group: 'Mietobjekt'
      },
      {
        name: 'rooms',
        label: 'Anzahl Zimmer',
        type: 'text',
        placeholder: 'z.B. 3 Zimmer, Küche, Bad',
        required: true,
        group: 'Mietobjekt'
      },
      {
        name: 'furnishing',
        label: 'Ausstattung',
        type: 'select',
        placeholder: 'Ausstattungsstandard',
        required: true,
        group: 'Mietobjekt',
        options: ['Unmöbliert', 'Teilmöbliert', 'Vollmöbliert', 'Mit Einbauküche']
      },
      // Mietkonditionen
      {
        name: 'startDate',
        label: 'Mietbeginn',
        type: 'date',
        placeholder: '',
        required: true,
        group: 'Mietkonditionen'
      },
      {
        name: 'duration',
        label: 'Mietdauer',
        type: 'select',
        placeholder: 'Vertragslaufzeit',
        required: true,
        group: 'Mietkonditionen',
        options: ['Unbefristet', '1 Jahr befristet', '2 Jahre befristet', '3 Jahre befristet', '5 Jahre befristet', 'Sonstige Befristung'],
        helpText: 'Unbefristet ist bei Wohnraum der Standard'
      },
      {
        name: 'baseRent',
        label: 'Kaltmiete (monatlich)',
        type: 'text',
        placeholder: 'z.B. 1.200€',
        required: true,
        group: 'Mietkonditionen'
      },
      {
        name: 'extraCosts',
        label: 'Nebenkosten-Vorauszahlung',
        type: 'text',
        placeholder: 'z.B. 250€',
        required: true,
        group: 'Mietkonditionen',
        helpText: 'Monatliche Vorauszahlung auf Betriebskosten'
      },
      {
        name: 'heatingCosts',
        label: 'Heizkosten',
        type: 'select',
        placeholder: 'Wie werden Heizkosten abgerechnet?',
        required: true,
        group: 'Mietkonditionen',
        options: ['In Nebenkosten enthalten', 'Separate Vorauszahlung', 'Direkt mit Versorger', 'Pauschale']
      },
      // Kaution & Zahlung
      {
        name: 'deposit',
        label: 'Kaution',
        type: 'text',
        placeholder: 'z.B. 3.600€ (3 Kaltmieten)',
        required: true,
        group: 'Kaution & Zahlung',
        helpText: 'Maximal 3 Nettokaltmieten bei Wohnraum'
      },
      {
        name: 'depositPayment',
        label: 'Kautionszahlung',
        type: 'select',
        placeholder: 'Zahlungsweise der Kaution',
        required: true,
        group: 'Kaution & Zahlung',
        options: ['Einmalzahlung vor Einzug', 'In 3 Raten', 'Kautionsbürgschaft', 'Mietkautionskonto']
      },
      {
        name: 'paymentDue',
        label: 'Mietzahlung fällig am',
        type: 'select',
        placeholder: 'Fälligkeitsdatum',
        required: true,
        group: 'Kaution & Zahlung',
        options: ['1. des Monats (im Voraus)', '3. Werktag des Monats', '15. des Monats', 'Letzter Werktag des Vormonats']
      },
      // Kündigung
      {
        name: 'termination',
        label: 'Kündigungsfrist',
        type: 'select',
        placeholder: 'Gesetzliche oder vereinbarte Frist',
        required: true,
        group: 'Kündigung & Laufzeit',
        options: ['Gesetzlich (3 Monate)', '3 Monate zum Monatsende', '6 Monate zum Quartalsende', 'Nach Vereinbarung'],
        helpText: 'Bei Wohnraum mindestens 3 Monate für Mieter'
      },
      {
        name: 'minDuration',
        label: 'Mindestmietdauer',
        type: 'select',
        placeholder: 'Kündigungsverzicht',
        required: false,
        group: 'Kündigung & Laufzeit',
        options: ['Keine', '1 Jahr', '2 Jahre', '4 Jahre'],
        helpText: 'Optional: Beidseitiger Kündigungsverzicht'
      },
      // Sonstiges
      {
        name: 'pets',
        label: 'Tierhaltung',
        type: 'select',
        placeholder: 'Regelung zur Tierhaltung',
        required: true,
        group: 'Weitere Vereinbarungen',
        options: ['Erlaubt', 'Kleintiere erlaubt', 'Nach Absprache', 'Nicht gestattet']
      },
      {
        name: 'subletting',
        label: 'Untervermietung',
        type: 'select',
        placeholder: 'Regelung zur Untervermietung',
        required: true,
        group: 'Weitere Vereinbarungen',
        options: ['Mit Zustimmung erlaubt', 'Generell nicht gestattet', 'Teilweise erlaubt']
      },
      {
        name: 'renovation',
        label: 'Schönheitsreparaturen',
        type: 'select',
        placeholder: 'Wer trägt die Kosten?',
        required: true,
        group: 'Weitere Vereinbarungen',
        options: ['Mieter nach Fristenplan', 'Vermieter', 'Nach Abnutzung', 'Endrenovierung durch Mieter'],
        helpText: 'Starre Fristen sind oft unwirksam'
      }
    ]
  },
  {
    id: 'arbeitsvertrag',
    name: 'Arbeitsvertrag',
    description: 'Für Festanstellungen',
    icon: '💻',
    jurisdiction: 'DE',
    category: 'Arbeitsrecht',
    estimatedDuration: '10-15 Minuten',
    popularity: 90,
    fields: [
      // Vertragsparteien
      {
        name: 'employer',
        label: 'Arbeitgeber (Firma)',
        type: 'text',
        placeholder: 'Vollständiger Firmenname',
        required: true,
        group: 'Vertragsparteien'
      },
      {
        name: 'employerAddress',
        label: 'Adresse Arbeitgeber',
        type: 'textarea',
        placeholder: 'Straße, PLZ, Ort',
        required: true,
        group: 'Vertragsparteien'
      },
      {
        name: 'employee',
        label: 'Arbeitnehmer (Name)',
        type: 'text',
        placeholder: 'Vollständiger Name des Mitarbeiters',
        required: true,
        group: 'Vertragsparteien'
      },
      {
        name: 'employeeAddress',
        label: 'Adresse Arbeitnehmer',
        type: 'textarea',
        placeholder: 'Aktuelle Wohnadresse',
        required: true,
        group: 'Vertragsparteien'
      },
      {
        name: 'employeeBirthdate',
        label: 'Geburtsdatum',
        type: 'date',
        placeholder: '',
        required: false,
        group: 'Vertragsparteien'
      },
      // Tätigkeit
      {
        name: 'position',
        label: 'Position / Stellenbezeichnung',
        type: 'text',
        placeholder: 'z.B. Senior Software Developer',
        required: true,
        group: 'Tätigkeit'
      },
      {
        name: 'department',
        label: 'Abteilung',
        type: 'text',
        placeholder: 'z.B. IT, Marketing, Vertrieb',
        required: false,
        group: 'Tätigkeit'
      },
      {
        name: 'duties',
        label: 'Tätigkeitsbeschreibung',
        type: 'textarea',
        placeholder: 'Hauptaufgaben und Verantwortlichkeiten',
        required: true,
        group: 'Tätigkeit',
        helpText: 'Je genauer, desto besser für beide Seiten'
      },
      {
        name: 'workplace',
        label: 'Arbeitsort',
        type: 'select',
        placeholder: 'Wo wird gearbeitet?',
        required: true,
        group: 'Tätigkeit',
        options: ['Firmensitz', 'Remote/Homeoffice', 'Hybrid (Büro + Homeoffice)', 'Verschiedene Standorte', 'Außendienst']
      },
      // Vertragsbeginn & -dauer
      {
        name: 'startDate',
        label: 'Arbeitsbeginn',
        type: 'date',
        placeholder: '',
        required: true,
        group: 'Vertragsbeginn & -dauer'
      },
      {
        name: 'contractType',
        label: 'Vertragsart',
        type: 'select',
        placeholder: 'Befristet oder unbefristet?',
        required: true,
        group: 'Vertragsbeginn & -dauer',
        options: ['Unbefristet', 'Befristet mit Sachgrund', 'Befristet ohne Sachgrund'],
        helpText: 'Unbefristet ist der Standard'
      },
      {
        name: 'endDate',
        label: 'Befristung bis',
        type: 'date',
        placeholder: '',
        required: false,
        group: 'Vertragsbeginn & -dauer',
        helpText: 'Nur bei befristeten Verträgen ausfüllen'
      },
      {
        name: 'probation',
        label: 'Probezeit',
        type: 'select',
        placeholder: 'Dauer der Probezeit',
        required: true,
        group: 'Vertragsbeginn & -dauer',
        options: ['Keine Probezeit', '3 Monate', '6 Monate'],
        helpText: 'Maximal 6 Monate gesetzlich erlaubt'
      },
      // Vergütung
      {
        name: 'salary',
        label: 'Bruttogehalt',
        type: 'text',
        placeholder: 'z.B. 65.000€ brutto/Jahr oder 5.000€/Monat',
        required: true,
        group: 'Vergütung'
      },
      {
        name: 'paymentSchedule',
        label: 'Gehaltszahlung',
        type: 'select',
        placeholder: 'Wann wird gezahlt?',
        required: true,
        group: 'Vergütung',
        options: ['Monatlich zum Monatsende', 'Monatlich zum 15.', 'Monatlich zum 1. des Folgemonats']
      },
      {
        name: 'bonus',
        label: 'Variable Vergütung / Bonus',
        type: 'text',
        placeholder: 'z.B. Bis zu 10% Jahresbonus',
        required: false,
        group: 'Vergütung',
        helpText: 'Optional: Provisionen, Boni, Prämien'
      },
      {
        name: 'benefits',
        label: 'Zusatzleistungen',
        type: 'textarea',
        placeholder: 'z.B. Firmenwagen, JobRad, Altersvorsorge, etc.',
        required: false,
        group: 'Vergütung'
      },
      // Arbeitszeit
      {
        name: 'workingHours',
        label: 'Wöchentliche Arbeitszeit',
        type: 'select',
        placeholder: 'Stunden pro Woche',
        required: true,
        group: 'Arbeitszeit',
        options: ['40 Stunden', '38,5 Stunden', '35 Stunden', '30 Stunden', '25 Stunden', '20 Stunden', '15 Stunden', '10 Stunden', 'Minijob (geringfügig)']
      },
      {
        name: 'workingDays',
        label: 'Arbeitstage',
        type: 'select',
        placeholder: 'Wochentage',
        required: true,
        group: 'Arbeitszeit',
        options: ['Montag bis Freitag', 'Montag bis Samstag', 'Flexible Einteilung', 'Schichtdienst']
      },
      {
        name: 'overtime',
        label: 'Überstundenregelung',
        type: 'select',
        placeholder: 'Wie werden Überstunden vergütet?',
        required: true,
        group: 'Arbeitszeit',
        options: ['Mit Gehalt abgegolten', 'Freizeitausgleich', 'Ausbezahlung', 'Kombination aus beidem']
      },
      // Urlaub
      {
        name: 'vacation',
        label: 'Urlaubsanspruch',
        type: 'select',
        placeholder: 'Tage pro Jahr',
        required: true,
        group: 'Urlaub & Freistellung',
        options: ['20 Tage (gesetzliches Minimum)', '24 Tage', '25 Tage', '26 Tage', '28 Tage', '30 Tage'],
        helpText: 'Bei 5-Tage-Woche: mindestens 20 Tage'
      },
      {
        name: 'specialLeave',
        label: 'Sonderurlaub',
        type: 'text',
        placeholder: 'z.B. Hochzeit, Geburt, Umzug',
        required: false,
        group: 'Urlaub & Freistellung'
      },
      // Kündigung
      {
        name: 'noticePeriod',
        label: 'Kündigungsfrist',
        type: 'select',
        placeholder: 'Nach der Probezeit',
        required: true,
        group: 'Kündigung',
        options: ['Gesetzlich (§622 BGB)', '4 Wochen zum Monatsende', '1 Monat zum Monatsende', '3 Monate zum Quartalsende', '6 Monate zum Quartalsende'],
        helpText: 'Verlängert sich mit Betriebszugehörigkeit'
      },
      {
        name: 'probationNotice',
        label: 'Kündigungsfrist in Probezeit',
        type: 'select',
        placeholder: 'Während der Probezeit',
        required: true,
        group: 'Kündigung',
        options: ['2 Wochen', '4 Wochen', '1 Monat']
      },
      // Weitere Klauseln
      {
        name: 'confidentiality',
        label: 'Geheimhaltung',
        type: 'select',
        placeholder: 'Vertraulichkeitsvereinbarung',
        required: true,
        group: 'Weitere Vereinbarungen',
        options: ['Standard-Klausel', 'Erweiterte Geheimhaltung', 'Keine besondere Regelung']
      },
      {
        name: 'nonCompete',
        label: 'Wettbewerbsverbot',
        type: 'select',
        placeholder: 'Nachvertragliches Wettbewerbsverbot',
        required: false,
        group: 'Weitere Vereinbarungen',
        options: ['Keines', '6 Monate', '12 Monate', '24 Monate (Maximum)'],
        helpText: 'Erfordert Karenzentschädigung (mind. 50% Gehalt)'
      },
      {
        name: 'intellectualProperty',
        label: 'Geistiges Eigentum',
        type: 'select',
        placeholder: 'Rechte an Arbeitsergebnissen',
        required: true,
        group: 'Weitere Vereinbarungen',
        options: ['Alle Rechte beim Arbeitgeber', 'Nach gesetzlicher Regelung', 'Individuelle Vereinbarung']
      }
    ]
  },
  {
    id: 'kaufvertrag',
    name: 'Kaufvertrag',
    description: 'Für Waren und Güter',
    icon: '🛒',
    jurisdiction: 'DE',
    category: 'Handel',
    estimatedDuration: '6-10 Minuten',
    popularity: 80,
    fields: [
      // Vertragsparteien
      {
        name: 'seller',
        label: 'Verkäufer (Name)',
        type: 'text',
        placeholder: 'Vollständiger Name / Firma',
        required: true,
        group: 'Vertragsparteien'
      },
      {
        name: 'sellerAddress',
        label: 'Adresse Verkäufer',
        type: 'textarea',
        placeholder: 'Straße, PLZ, Ort',
        required: true,
        group: 'Vertragsparteien'
      },
      {
        name: 'sellerType',
        label: 'Verkäufer ist',
        type: 'select',
        placeholder: 'Privat oder gewerblich?',
        required: true,
        group: 'Vertragsparteien',
        options: ['Privatperson', 'Gewerblicher Verkäufer', 'Unternehmen'],
        helpText: 'Beeinflusst Gewährleistungsrechte'
      },
      {
        name: 'buyer',
        label: 'Käufer (Name)',
        type: 'text',
        placeholder: 'Vollständiger Name / Firma',
        required: true,
        group: 'Vertragsparteien'
      },
      {
        name: 'buyerAddress',
        label: 'Adresse Käufer',
        type: 'textarea',
        placeholder: 'Straße, PLZ, Ort',
        required: true,
        group: 'Vertragsparteien'
      },
      // Kaufgegenstand
      {
        name: 'itemCategory',
        label: 'Art des Kaufgegenstands',
        type: 'select',
        placeholder: 'Was wird verkauft?',
        required: true,
        group: 'Kaufgegenstand',
        options: ['Fahrzeug (PKW, Motorrad)', 'Elektronik/Technik', 'Möbel/Einrichtung', 'Maschinen/Geräte', 'Immobilie', 'Sonstige Waren']
      },
      {
        name: 'item',
        label: 'Genaue Beschreibung',
        type: 'textarea',
        placeholder: 'Detaillierte Beschreibung: Marke, Modell, Seriennummer, Baujahr, Zustand, etc.',
        required: true,
        group: 'Kaufgegenstand',
        helpText: 'Je genauer, desto rechtssicherer'
      },
      {
        name: 'condition',
        label: 'Zustand',
        type: 'select',
        placeholder: 'Zustand des Gegenstands',
        required: true,
        group: 'Kaufgegenstand',
        options: ['Neu/Unbenutzt', 'Neuwertig', 'Sehr gut', 'Gut', 'Gebraucht mit Mängeln', 'Defekt/Bastlerfahrzeug']
      },
      {
        name: 'defects',
        label: 'Bekannte Mängel',
        type: 'textarea',
        placeholder: 'Alle bekannten Mängel und Schäden auflisten',
        required: false,
        group: 'Kaufgegenstand',
        helpText: 'Ehrliche Angabe schützt vor späteren Ansprüchen'
      },
      {
        name: 'accessories',
        label: 'Zubehör/Lieferumfang',
        type: 'textarea',
        placeholder: 'Was ist im Kauf enthalten? (Zubehör, Dokumente, etc.)',
        required: false,
        group: 'Kaufgegenstand'
      },
      // Kaufpreis & Zahlung
      {
        name: 'price',
        label: 'Kaufpreis',
        type: 'text',
        placeholder: 'z.B. 15.000€',
        required: true,
        group: 'Kaufpreis & Zahlung'
      },
      {
        name: 'priceType',
        label: 'Preisart',
        type: 'select',
        placeholder: 'Brutto oder Netto?',
        required: true,
        group: 'Kaufpreis & Zahlung',
        options: ['Festpreis (Brutto)', 'Netto zzgl. MwSt.', 'VB (Verhandlungsbasis)']
      },
      {
        name: 'paymentMethod',
        label: 'Zahlungsart',
        type: 'select',
        placeholder: 'Wie wird bezahlt?',
        required: true,
        group: 'Kaufpreis & Zahlung',
        options: ['Barzahlung bei Übergabe', 'Überweisung vor Übergabe', 'Überweisung nach Übergabe', 'PayPal', 'Ratenzahlung', 'Teilzahlung (Anzahlung + Rest)']
      },
      {
        name: 'paymentDeadline',
        label: 'Zahlungsfrist',
        type: 'select',
        placeholder: 'Wann muss gezahlt werden?',
        required: true,
        group: 'Kaufpreis & Zahlung',
        options: ['Bei Übergabe', 'Vor Übergabe', '7 Tage nach Übergabe', '14 Tage nach Übergabe', '30 Tage nach Übergabe']
      },
      // Übergabe & Lieferung
      {
        name: 'deliveryType',
        label: 'Übergabe/Lieferung',
        type: 'select',
        placeholder: 'Wie erfolgt die Übergabe?',
        required: true,
        group: 'Übergabe & Lieferung',
        options: ['Abholung durch Käufer', 'Lieferung durch Verkäufer', 'Versand (Spedition)', 'Versand (Paketdienst)', 'Übergabe an neutralem Ort']
      },
      {
        name: 'deliveryDate',
        label: 'Übergabe-/Lieferdatum',
        type: 'date',
        placeholder: '',
        required: true,
        group: 'Übergabe & Lieferung'
      },
      {
        name: 'deliveryLocation',
        label: 'Übergabeort',
        type: 'text',
        placeholder: 'Adresse oder Beschreibung des Übergabeorts',
        required: true,
        group: 'Übergabe & Lieferung'
      },
      {
        name: 'shippingCosts',
        label: 'Versandkosten',
        type: 'select',
        placeholder: 'Wer trägt die Kosten?',
        required: true,
        group: 'Übergabe & Lieferung',
        options: ['Entfällt (Abholung)', 'Käufer trägt Versandkosten', 'Verkäufer trägt Versandkosten', 'Geteilte Kosten', 'Im Kaufpreis enthalten']
      },
      // Gewährleistung
      {
        name: 'warranty',
        label: 'Gewährleistung',
        type: 'select',
        placeholder: 'Gewährleistungsregelung',
        required: true,
        group: 'Gewährleistung & Haftung',
        options: ['Gewährleistung ausgeschlossen (Privatverkauf)', 'Gesetzliche Gewährleistung (2 Jahre)', 'Gewährleistung auf 1 Jahr verkürzt', 'Herstellergarantie vorhanden'],
        helpText: 'Bei Privatverkauf kann Gewährleistung ausgeschlossen werden'
      },
      {
        name: 'ownershipTransfer',
        label: 'Eigentumsübergang',
        type: 'select',
        placeholder: 'Wann geht das Eigentum über?',
        required: true,
        group: 'Gewährleistung & Haftung',
        options: ['Bei Übergabe', 'Bei vollständiger Zahlung', 'Eigentumsvorbehalt bis Zahlung']
      },
      {
        name: 'riskTransfer',
        label: 'Gefahrübergang',
        type: 'select',
        placeholder: 'Ab wann trägt Käufer das Risiko?',
        required: true,
        group: 'Gewährleistung & Haftung',
        options: ['Bei Übergabe', 'Bei Versand an Spediteur', 'Nach Anlieferung'],
        helpText: 'Risiko für Beschädigung/Verlust'
      }
    ]
  },
  {
    id: 'nda',
    name: 'Geheimhaltungsvertrag (NDA)',
    description: 'Vertraulichkeitsvereinbarung',
    icon: '🔒',
    jurisdiction: 'DE',
    category: 'Unternehmensrecht',
    estimatedDuration: '5-8 Minuten',
    popularity: 75,
    fields: [
      // Vertragsparteien
      {
        name: 'ndaType',
        label: 'Art der Vereinbarung',
        type: 'select',
        placeholder: 'Wer gibt Informationen preis?',
        required: true,
        group: 'Grundlagen',
        options: ['Einseitig (eine Partei offenlegt)', 'Gegenseitig (beide Parteien offenlegen)'],
        helpText: 'Bei Geschäftsverhandlungen meist gegenseitig'
      },
      {
        name: 'partyA',
        label: 'Offenlegende Partei / Partei A',
        type: 'text',
        placeholder: 'Name der ersten Vertragspartei',
        required: true,
        group: 'Vertragsparteien'
      },
      {
        name: 'partyAAddress',
        label: 'Adresse Partei A',
        type: 'textarea',
        placeholder: 'Vollständige Anschrift',
        required: true,
        group: 'Vertragsparteien'
      },
      {
        name: 'partyARepresentative',
        label: 'Vertreten durch (Partei A)',
        type: 'text',
        placeholder: 'z.B. Geschäftsführer Max Mustermann',
        required: false,
        group: 'Vertragsparteien'
      },
      {
        name: 'partyB',
        label: 'Empfangende Partei / Partei B',
        type: 'text',
        placeholder: 'Name der zweiten Vertragspartei',
        required: true,
        group: 'Vertragsparteien'
      },
      {
        name: 'partyBAddress',
        label: 'Adresse Partei B',
        type: 'textarea',
        placeholder: 'Vollständige Anschrift',
        required: true,
        group: 'Vertragsparteien'
      },
      {
        name: 'partyBRepresentative',
        label: 'Vertreten durch (Partei B)',
        type: 'text',
        placeholder: 'z.B. Geschäftsführer Max Mustermann',
        required: false,
        group: 'Vertragsparteien'
      },
      // Gegenstand
      {
        name: 'purpose',
        label: 'Zweck der Offenlegung',
        type: 'textarea',
        placeholder: 'Warum werden vertrauliche Informationen ausgetauscht? (z.B. Prüfung einer Geschäftsbeziehung, Due Diligence, Projektkooperation)',
        required: true,
        group: 'Gegenstand',
        helpText: 'Möglichst konkret beschreiben'
      },
      {
        name: 'confidentialInfo',
        label: 'Vertrauliche Informationen',
        type: 'textarea',
        placeholder: 'Welche Informationen sind vertraulich? (z.B. Geschäftspläne, Kundendaten, technische Dokumentation, Finanzdaten)',
        required: true,
        group: 'Gegenstand',
        helpText: 'Kategorien oder konkrete Dokumente benennen'
      },
      {
        name: 'exclusions',
        label: 'Ausnahmen',
        type: 'select',
        placeholder: 'Welche Informationen sind NICHT vertraulich?',
        required: true,
        group: 'Gegenstand',
        options: ['Standard-Ausnahmen (öffentlich, vorher bekannt, unabhängig entwickelt)', 'Erweiterte Ausnahmen', 'Keine Ausnahmen']
      },
      // Pflichten & Beschränkungen
      {
        name: 'usageRestriction',
        label: 'Nutzungsbeschränkung',
        type: 'select',
        placeholder: 'Wie dürfen die Informationen verwendet werden?',
        required: true,
        group: 'Pflichten',
        options: ['Nur für vereinbarten Zweck', 'Streng begrenzt auf Projekt', 'Mit schriftlicher Genehmigung erweiterbar']
      },
      {
        name: 'disclosureAllowed',
        label: 'Weitergabe an Dritte',
        type: 'select',
        placeholder: 'An wen darf weitergegeben werden?',
        required: true,
        group: 'Pflichten',
        options: ['Keine Weitergabe', 'An Mitarbeiter mit Need-to-Know', 'An Berater mit eigener NDA', 'Nach Zustimmung']
      },
      {
        name: 'returnObligation',
        label: 'Rückgabe-/Vernichtungspflicht',
        type: 'select',
        placeholder: 'Was passiert bei Vertragsende?',
        required: true,
        group: 'Pflichten',
        options: ['Rückgabe aller Unterlagen', 'Vernichtung mit Bestätigung', 'Rückgabe oder Vernichtung nach Wahl', 'Archivierung erlaubt']
      },
      // Dauer & Laufzeit
      {
        name: 'duration',
        label: 'Geheimhaltungsfrist',
        type: 'select',
        placeholder: 'Wie lange gilt die Geheimhaltung?',
        required: true,
        group: 'Dauer & Laufzeit',
        options: ['2 Jahre', '3 Jahre', '5 Jahre', '10 Jahre', 'Unbefristet'],
        helpText: 'Beginnt ab Erhalt der Information'
      },
      {
        name: 'contractDuration',
        label: 'Vertragslaufzeit',
        type: 'select',
        placeholder: 'Wie lange läuft der Vertrag?',
        required: true,
        group: 'Dauer & Laufzeit',
        options: ['Unbefristet bis Kündigung', '1 Jahr', '2 Jahre', 'Projektbezogen']
      },
      {
        name: 'termination',
        label: 'Kündigungsfrist',
        type: 'select',
        placeholder: 'Mit welcher Frist kündbar?',
        required: true,
        group: 'Dauer & Laufzeit',
        options: ['1 Monat', '3 Monate', '6 Monate', 'Nicht ordentlich kündbar']
      },
      // Rechtsfolgen
      {
        name: 'penalty',
        label: 'Vertragsstrafe',
        type: 'select',
        placeholder: 'Soll eine Vertragsstrafe vereinbart werden?',
        required: true,
        group: 'Rechtsfolgen',
        options: ['Keine Vertragsstrafe', 'Pauschale pro Verstoß (z.B. 10.000€)', 'Nach Vereinbarung'],
        helpText: 'Vertragsstrafe erleichtert Durchsetzung'
      },
      {
        name: 'governingLaw',
        label: 'Anwendbares Recht',
        type: 'select',
        placeholder: 'Welches Recht gilt?',
        required: true,
        group: 'Rechtsfolgen',
        options: ['Deutsches Recht', 'Österreichisches Recht', 'Schweizer Recht']
      },
      {
        name: 'jurisdiction',
        label: 'Gerichtsstand',
        type: 'text',
        placeholder: 'z.B. Berlin, München, Hamburg',
        required: true,
        group: 'Rechtsfolgen',
        helpText: 'Zuständiges Gericht bei Streitigkeiten'
      }
    ]
  },
  {
    id: 'gesellschaftsvertrag',
    name: 'Gesellschaftsvertrag',
    description: 'Für GbR, GmbH, UG Gründungen',
    icon: '🏢',
    jurisdiction: 'DE',
    category: 'Gesellschaftsrecht',
    estimatedDuration: '12-18 Minuten',
    isNew: true,
    popularity: 70,
    fields: [
      // Grundlagen
      {
        name: 'companyType',
        label: 'Gesellschaftsform',
        type: 'select',
        placeholder: 'Wählen Sie die Rechtsform',
        required: true,
        group: 'Grundlagen',
        options: ['GbR (Gesellschaft bürgerlichen Rechts)', 'GmbH (Gesellschaft mit beschränkter Haftung)', 'UG (haftungsbeschränkt)', 'OHG (Offene Handelsgesellschaft)', 'KG (Kommanditgesellschaft)'],
        helpText: 'Bestimmt Haftung und rechtliche Anforderungen'
      },
      {
        name: 'companyName',
        label: 'Firma / Gesellschaftsname',
        type: 'text',
        placeholder: 'z.B. Musterfirma GmbH',
        required: true,
        group: 'Grundlagen',
        helpText: 'Muss Rechtsformzusatz enthalten'
      },
      {
        name: 'seat',
        label: 'Sitz der Gesellschaft',
        type: 'text',
        placeholder: 'z.B. Berlin',
        required: true,
        group: 'Grundlagen'
      },
      {
        name: 'address',
        label: 'Geschäftsadresse',
        type: 'textarea',
        placeholder: 'Vollständige Adresse des Firmensitzes',
        required: true,
        group: 'Grundlagen'
      },
      {
        name: 'purpose',
        label: 'Unternehmensgegenstand',
        type: 'textarea',
        placeholder: 'Beschreibung der Geschäftstätigkeit (möglichst weit gefasst)',
        required: true,
        group: 'Grundlagen',
        helpText: 'Was darf die Gesellschaft tun? Breit formulieren für Flexibilität'
      },
      // Gesellschafter
      {
        name: 'numberOfPartners',
        label: 'Anzahl Gesellschafter',
        type: 'select',
        placeholder: 'Wie viele Gründer?',
        required: true,
        group: 'Gesellschafter',
        options: ['1 Gesellschafter', '2 Gesellschafter', '3 Gesellschafter', '4+ Gesellschafter']
      },
      {
        name: 'partners',
        label: 'Gesellschafter (Namen & Adressen)',
        type: 'textarea',
        placeholder: 'Name, Adresse und Geburtsdatum jedes Gesellschafters (zeilenweise)',
        required: true,
        group: 'Gesellschafter'
      },
      // Kapital & Anteile
      {
        name: 'capital',
        label: 'Stammkapital',
        type: 'text',
        placeholder: 'z.B. 25.000€ (GmbH) oder 1€ (UG)',
        required: true,
        group: 'Kapital & Anteile',
        helpText: 'GmbH min. 25.000€, UG min. 1€'
      },
      {
        name: 'shares',
        label: 'Geschäftsanteile',
        type: 'textarea',
        placeholder: 'Verteilung: z.B. Gesellschafter A: 60% (15.000€), Gesellschafter B: 40% (10.000€)',
        required: true,
        group: 'Kapital & Anteile'
      },
      {
        name: 'capitalContribution',
        label: 'Einzahlung Stammkapital',
        type: 'select',
        placeholder: 'Wann wird eingezahlt?',
        required: true,
        group: 'Kapital & Anteile',
        options: ['100% sofort bei Gründung', '50% sofort, Rest auf Anforderung', '25% sofort (GmbH Minimum)', 'Nach Vereinbarung']
      },
      // Geschäftsführung
      {
        name: 'management',
        label: 'Geschäftsführer',
        type: 'textarea',
        placeholder: 'Name(n) der Geschäftsführer',
        required: true,
        group: 'Geschäftsführung'
      },
      {
        name: 'managementType',
        label: 'Vertretungsregelung',
        type: 'select',
        placeholder: 'Wie wird die Gesellschaft vertreten?',
        required: true,
        group: 'Geschäftsführung',
        options: ['Einzelvertretung (jeder GF allein)', 'Gesamtvertretung (alle gemeinsam)', 'Zwei gemeinsam', 'Einzeln bis Betrag X, darüber gemeinsam']
      },
      {
        name: 'managementCompensation',
        label: 'Vergütung Geschäftsführer',
        type: 'select',
        placeholder: 'Wie werden GF vergütet?',
        required: false,
        group: 'Geschäftsführung',
        options: ['Unentgeltlich', 'Festes Gehalt', 'Gewinnbeteiligung', 'Gehalt + Tantieme']
      },
      // Gewinnverteilung & Beschlüsse
      {
        name: 'profitDistribution',
        label: 'Gewinnverteilung',
        type: 'select',
        placeholder: 'Wie wird der Gewinn verteilt?',
        required: true,
        group: 'Gewinn & Beschlüsse',
        options: ['Nach Geschäftsanteilen', 'Zu gleichen Teilen', 'Nach individueller Vereinbarung']
      },
      {
        name: 'reserveRequirement',
        label: 'Rücklagenbildung (UG)',
        type: 'select',
        placeholder: 'Thesaurierungspflicht',
        required: false,
        group: 'Gewinn & Beschlüsse',
        options: ['Gesetzlich (25% des Jahresüberschusses)', 'Erweitert (50%)', 'Entfällt (nur GmbH)'],
        helpText: 'Nur für UG relevant'
      },
      {
        name: 'votingRights',
        label: 'Stimmrechte',
        type: 'select',
        placeholder: 'Wie werden Stimmen gezählt?',
        required: true,
        group: 'Gewinn & Beschlüsse',
        options: ['Nach Geschäftsanteilen', 'Pro Kopf', 'Nach Kapitaleinlage']
      },
      {
        name: 'majorityRequirement',
        label: 'Beschlussmehrheit',
        type: 'select',
        placeholder: 'Welche Mehrheit für Beschlüsse?',
        required: true,
        group: 'Gewinn & Beschlüsse',
        options: ['Einfache Mehrheit (>50%)', 'Qualifizierte Mehrheit (75%)', 'Einstimmigkeit bei wichtigen Entscheidungen']
      },
      // Übertragung & Austritt
      {
        name: 'shareTransfer',
        label: 'Übertragung von Anteilen',
        type: 'select',
        placeholder: 'Können Anteile verkauft werden?',
        required: true,
        group: 'Übertragung & Austritt',
        options: ['Frei übertragbar', 'Mit Zustimmung der Gesellschafterversammlung', 'Vorkaufsrecht der anderen Gesellschafter', 'Nur an Mitgesellschafter']
      },
      {
        name: 'inheritance',
        label: 'Vererbung von Anteilen',
        type: 'select',
        placeholder: 'Was passiert im Todesfall?',
        required: true,
        group: 'Übertragung & Austritt',
        options: ['Anteile vererbbar', 'Einziehung gegen Abfindung', 'Fortsetzung mit Erben', 'Nach Vereinbarung']
      },
      {
        name: 'exitClause',
        label: 'Austritt/Kündigung',
        type: 'select',
        placeholder: 'Kann ein Gesellschafter austreten?',
        required: true,
        group: 'Übertragung & Austritt',
        options: ['Mit 6 Monaten Kündigungsfrist', 'Mit 12 Monaten Kündigungsfrist', 'Nur aus wichtigem Grund', 'Nur mit Zustimmung']
      },
      // Dauer
      {
        name: 'duration',
        label: 'Dauer der Gesellschaft',
        type: 'select',
        placeholder: 'Wie lange besteht die Gesellschaft?',
        required: true,
        group: 'Laufzeit',
        options: ['Unbefristet', 'Befristet auf 5 Jahre', 'Befristet auf 10 Jahre', 'Projektbezogen']
      },
      {
        name: 'fiscalYear',
        label: 'Geschäftsjahr',
        type: 'select',
        placeholder: 'Wann endet das Geschäftsjahr?',
        required: true,
        group: 'Laufzeit',
        options: ['Kalenderjahr (31.12.)', 'Abweichendes Wirtschaftsjahr']
      }
    ]
  },
  {
    id: 'darlehensvertrag',
    name: 'Darlehensvertrag',
    description: 'Für private oder geschäftliche Kredite',
    icon: '💰',
    category: 'Finanzierung',
    jurisdiction: 'Deutschland (BGB §§ 488-505)',
    estimatedDuration: '15-20 Minuten',
    isNew: true,
    popularity: 65,
    fields: [
      // === GRUPPE: Darlehensart ===
      {
        name: 'loanType',
        label: 'Art des Darlehens',
        type: 'select',
        placeholder: 'Welche Art von Darlehen?',
        required: true,
        group: 'Darlehensart',
        options: ['Privatdarlehen', 'Geschäftsdarlehen', 'Gesellschafterdarlehen', 'Familiendarlehen', 'Arbeitgeberdarlehen'],
        helpText: 'Die Darlehensart bestimmt steuerliche und rechtliche Besonderheiten'
      },
      {
        name: 'purpose',
        label: 'Verwendungszweck',
        type: 'select',
        placeholder: 'Wofür wird das Darlehen verwendet?',
        required: false,
        group: 'Darlehensart',
        options: ['Nicht zweckgebunden', 'Immobilienkauf/-finanzierung', 'Fahrzeugkauf', 'Geschäftsinvestition', 'Umschuldung', 'Sonstiges']
      },

      // === GRUPPE: Darlehensgeber ===
      {
        name: 'lenderType',
        label: 'Darlehensgeber ist',
        type: 'select',
        placeholder: 'Art des Darlehensgebers',
        required: true,
        group: 'Darlehensgeber',
        options: ['Privatperson', 'Unternehmen/GmbH', 'Gesellschaft (GbR/OHG/KG)', 'Verein/Stiftung']
      },
      {
        name: 'lender',
        label: 'Name des Darlehensgebers',
        type: 'text',
        placeholder: 'Vollständiger Name oder Firma',
        required: true,
        group: 'Darlehensgeber'
      },
      {
        name: 'lenderAddress',
        label: 'Anschrift Darlehensgeber',
        type: 'text',
        placeholder: 'Straße, PLZ, Ort',
        required: true,
        group: 'Darlehensgeber'
      },

      // === GRUPPE: Darlehensnehmer ===
      {
        name: 'borrowerType',
        label: 'Darlehensnehmer ist',
        type: 'select',
        placeholder: 'Art des Darlehensnehmers',
        required: true,
        group: 'Darlehensnehmer',
        options: ['Privatperson', 'Unternehmen/GmbH', 'Gesellschaft (GbR/OHG/KG)', 'Verein/Stiftung']
      },
      {
        name: 'borrower',
        label: 'Name des Darlehensnehmers',
        type: 'text',
        placeholder: 'Vollständiger Name oder Firma',
        required: true,
        group: 'Darlehensnehmer'
      },
      {
        name: 'borrowerAddress',
        label: 'Anschrift Darlehensnehmer',
        type: 'text',
        placeholder: 'Straße, PLZ, Ort',
        required: true,
        group: 'Darlehensnehmer'
      },

      // === GRUPPE: Darlehenssumme & Auszahlung ===
      {
        name: 'amount',
        label: 'Darlehenssumme (€)',
        type: 'number',
        placeholder: 'z.B. 50000',
        required: true,
        group: 'Darlehenssumme & Auszahlung',
        helpText: 'Nettokreditbetrag ohne Zinsen'
      },
      {
        name: 'disbursementDate',
        label: 'Auszahlungsdatum',
        type: 'date',
        placeholder: '',
        required: true,
        group: 'Darlehenssumme & Auszahlung'
      },
      {
        name: 'disbursementMethod',
        label: 'Auszahlungsart',
        type: 'select',
        placeholder: 'Wie wird ausgezahlt?',
        required: true,
        group: 'Darlehenssumme & Auszahlung',
        options: ['Vollständige Auszahlung', 'Auszahlung in Tranchen', 'Nach Abruf durch Darlehensnehmer']
      },
      {
        name: 'bankDetails',
        label: 'Bankverbindung Darlehensnehmer',
        type: 'text',
        placeholder: 'IBAN für die Auszahlung',
        required: false,
        group: 'Darlehenssumme & Auszahlung'
      },

      // === GRUPPE: Zinsen & Konditionen ===
      {
        name: 'interestType',
        label: 'Zinsvereinbarung',
        type: 'select',
        placeholder: 'Art der Verzinsung',
        required: true,
        group: 'Zinsen & Konditionen',
        options: ['Zinsloses Darlehen', 'Fester Zinssatz', 'Variabler Zinssatz (marktüblich)', 'Variabler Zinssatz (EURIBOR + Aufschlag)'],
        helpText: 'Bei zinslosen Darlehen unter nahestehenden Personen ggf. Schenkungssteuer beachten'
      },
      {
        name: 'interestRate',
        label: 'Zinssatz (% p.a.)',
        type: 'text',
        placeholder: 'z.B. 3,5',
        required: false,
        group: 'Zinsen & Konditionen',
        helpText: 'Nur bei verzinslichem Darlehen erforderlich',
        dependsOn: 'interestType:!Zinsloses Darlehen'
      },
      {
        name: 'interestPayment',
        label: 'Zinszahlung',
        type: 'select',
        placeholder: 'Wann werden Zinsen gezahlt?',
        required: false,
        group: 'Zinsen & Konditionen',
        options: ['Monatlich', 'Vierteljährlich', 'Halbjährlich', 'Jährlich', 'Am Laufzeitende (thesaurierend)'],
        dependsOn: 'interestType:!Zinsloses Darlehen'
      },
      {
        name: 'defaultInterest',
        label: 'Verzugszinsen',
        type: 'select',
        placeholder: 'Zinsen bei Zahlungsverzug',
        required: false,
        group: 'Zinsen & Konditionen',
        options: ['Gesetzlicher Verzugszins (5% über Basiszins)', '8% über Basiszins (Geschäfte)', 'Individueller Satz', 'Keine Verzugszinsen'],
        helpText: 'Gilt bei verspäteten Ratenzahlungen'
      },

      // === GRUPPE: Tilgung & Rückzahlung ===
      {
        name: 'repayment',
        label: 'Tilgungsart',
        type: 'select',
        placeholder: 'Art der Rückzahlung',
        required: true,
        group: 'Tilgung & Rückzahlung',
        options: ['Annuitätendarlehen (konstante Raten)', 'Tilgungsdarlehen (sinkende Raten)', 'Endfälliges Darlehen', 'Ratenzahlung nach Vereinbarung', 'Flexible Tilgung']
      },
      {
        name: 'installmentAmount',
        label: 'Ratenhöhe (€)',
        type: 'number',
        placeholder: 'Monatliche/vierteljährliche Rate',
        required: false,
        group: 'Tilgung & Rückzahlung',
        helpText: 'Bei endfälligem Darlehen nicht erforderlich'
      },
      {
        name: 'installmentInterval',
        label: 'Ratenintervall',
        type: 'select',
        placeholder: 'Wie oft wird gezahlt?',
        required: true,
        group: 'Tilgung & Rückzahlung',
        options: ['Monatlich', 'Vierteljährlich', 'Halbjährlich', 'Jährlich', 'Einmalig am Laufzeitende']
      },
      {
        name: 'firstInstallmentDate',
        label: 'Erste Rate fällig am',
        type: 'date',
        placeholder: '',
        required: false,
        group: 'Tilgung & Rückzahlung'
      },

      // === GRUPPE: Laufzeit & Kündigung ===
      {
        name: 'duration',
        label: 'Laufzeit',
        type: 'select',
        placeholder: 'Darlehenslaufzeit',
        required: true,
        group: 'Laufzeit & Kündigung',
        options: ['6 Monate', '1 Jahr', '2 Jahre', '3 Jahre', '5 Jahre', '10 Jahre', '15 Jahre', '20 Jahre', 'Unbefristet (mit Kündigungsrecht)']
      },
      {
        name: 'endDate',
        label: 'Laufzeitende / Fälligkeit',
        type: 'date',
        placeholder: '',
        required: false,
        group: 'Laufzeit & Kündigung',
        helpText: 'Datum der vollständigen Rückzahlung'
      },
      {
        name: 'terminationRight',
        label: 'Ordentliche Kündigung',
        type: 'select',
        placeholder: 'Kündigungsmöglichkeit',
        required: true,
        group: 'Laufzeit & Kündigung',
        options: ['Beide Seiten mit 3 Monaten Frist', 'Nur Darlehensnehmer jederzeit', 'Keine ordentliche Kündigung möglich', 'Nach 10 Jahren (gesetzlich)'],
        helpText: 'Bei unbefristeten Darlehen: gesetzliche 3-Monats-Frist'
      },
      {
        name: 'earlyRepayment',
        label: 'Vorzeitige Rückzahlung',
        type: 'select',
        placeholder: 'Sondertilgung möglich?',
        required: true,
        group: 'Laufzeit & Kündigung',
        options: ['Jederzeit ohne Vorfälligkeitsentschädigung', 'Mit Vorfälligkeitsentschädigung', 'Nur in festgelegten Zeiträumen', 'Nicht möglich']
      },

      // === GRUPPE: Sicherheiten ===
      {
        name: 'securityType',
        label: 'Art der Sicherheiten',
        type: 'select',
        placeholder: 'Welche Sicherheiten werden gestellt?',
        required: true,
        group: 'Sicherheiten',
        options: ['Keine Sicherheiten (Blankokredit)', 'Bürgschaft', 'Grundschuld/Hypothek', 'Sicherungsübereignung', 'Verpfändung', 'Gehaltsabtretung', 'Mehrere Sicherheiten'],
        helpText: 'Sicherheiten schützen den Darlehensgeber bei Zahlungsausfall'
      },
      {
        name: 'securityDetails',
        label: 'Beschreibung der Sicherheiten',
        type: 'textarea',
        placeholder: 'Details zu den gestellten Sicherheiten (z.B. Grundbuch, Wert des Sicherungsguts, Bürge)',
        required: false,
        group: 'Sicherheiten'
      },

      // === GRUPPE: Besondere Vereinbarungen ===
      {
        name: 'extraordinaryTermination',
        label: 'Außerordentliche Kündigung bei',
        type: 'select',
        placeholder: 'Kündigungsgründe',
        required: false,
        group: 'Besondere Vereinbarungen',
        options: ['Zahlungsverzug (2+ Raten)', 'Wesentliche Vermögensverschlechterung', 'Insolvenzantrag', 'Falsche Angaben', 'Alle genannten Gründe'],
        helpText: 'Löst sofortige Fälligkeit des gesamten Restbetrags aus'
      },
      {
        name: 'usageRestriction',
        label: 'Verwendungsnachweis',
        type: 'select',
        placeholder: 'Muss Verwendung nachgewiesen werden?',
        required: false,
        group: 'Besondere Vereinbarungen',
        options: ['Nicht erforderlich', 'Auf Anforderung', 'Automatisch mit Belegen']
      },
      {
        name: 'specialConditions',
        label: 'Besondere Vereinbarungen',
        type: 'textarea',
        placeholder: 'Weitere Vereinbarungen (z.B. Tilgungsaussetzung, Sonderregelungen)',
        required: false,
        group: 'Besondere Vereinbarungen'
      }
    ]
  },
  {
    id: 'lizenzvertrag',
    name: 'Lizenzvertrag',
    description: 'Für Software, Marken, Patente',
    icon: '©️',
    category: 'Geistiges Eigentum',
    jurisdiction: 'Deutschland (UrhG, MarkenG, PatG)',
    estimatedDuration: '15-20 Minuten',
    popularity: 60,
    fields: [
      // === GRUPPE: Lizenzgegenstand ===
      {
        name: 'ipType',
        label: 'Art des geistigen Eigentums',
        type: 'select',
        placeholder: 'Was wird lizenziert?',
        required: true,
        group: 'Lizenzgegenstand',
        options: ['Software/App', 'Marke/Logo', 'Patent/Gebrauchsmuster', 'Urheberrechtlich geschütztes Werk', 'Know-how/Technologie', 'Designrecht', 'Datenbank'],
        helpText: 'Bestimmt die anwendbaren Schutzrechte'
      },
      {
        name: 'subject',
        label: 'Bezeichnung des Lizenzgegenstands',
        type: 'text',
        placeholder: 'z.B. "ContractAI Software v2.0" oder "Marke XYZ"',
        required: true,
        group: 'Lizenzgegenstand'
      },
      {
        name: 'subjectDescription',
        label: 'Detaillierte Beschreibung',
        type: 'textarea',
        placeholder: 'Genaue Beschreibung des Lizenzgegenstands, Funktionen, Spezifikationen',
        required: true,
        group: 'Lizenzgegenstand'
      },
      {
        name: 'registrationNumber',
        label: 'Registernummer (falls vorhanden)',
        type: 'text',
        placeholder: 'z.B. DE302021001234 (Marke) oder EP1234567 (Patent)',
        required: false,
        group: 'Lizenzgegenstand',
        helpText: 'Amtliche Registernummer für Marken, Patente etc.'
      },

      // === GRUPPE: Lizenzgeber ===
      {
        name: 'licensorType',
        label: 'Lizenzgeber ist',
        type: 'select',
        placeholder: 'Art des Lizenzgebers',
        required: true,
        group: 'Lizenzgeber',
        options: ['Privatperson/Erfinder', 'Unternehmen', 'Hochschule/Forschungseinrichtung', 'Verwertungsgesellschaft']
      },
      {
        name: 'licensor',
        label: 'Name des Lizenzgebers',
        type: 'text',
        placeholder: 'Vollständiger Name oder Firma',
        required: true,
        group: 'Lizenzgeber'
      },
      {
        name: 'licensorAddress',
        label: 'Anschrift Lizenzgeber',
        type: 'text',
        placeholder: 'Straße, PLZ, Ort',
        required: true,
        group: 'Lizenzgeber'
      },
      {
        name: 'licensorRights',
        label: 'Rechtestellung',
        type: 'select',
        placeholder: 'Ist der Lizenzgeber Inhaber?',
        required: true,
        group: 'Lizenzgeber',
        options: ['Alleiniger Rechteinhaber', 'Mitinhaber', 'Exklusiver Lizenznehmer mit Unterlizenzrecht', 'Verwertungsberechtigter'],
        helpText: 'Stellt sicher, dass der Lizenzgeber zur Vergabe berechtigt ist'
      },

      // === GRUPPE: Lizenznehmer ===
      {
        name: 'licenseeType',
        label: 'Lizenznehmer ist',
        type: 'select',
        placeholder: 'Art des Lizenznehmers',
        required: true,
        group: 'Lizenznehmer',
        options: ['Privatperson', 'Startup/KMU', 'Großunternehmen', 'Konzern', 'Öffentliche Einrichtung']
      },
      {
        name: 'licensee',
        label: 'Name des Lizenznehmers',
        type: 'text',
        placeholder: 'Vollständiger Name oder Firma',
        required: true,
        group: 'Lizenznehmer'
      },
      {
        name: 'licenseeAddress',
        label: 'Anschrift Lizenznehmer',
        type: 'text',
        placeholder: 'Straße, PLZ, Ort',
        required: true,
        group: 'Lizenznehmer'
      },

      // === GRUPPE: Lizenzumfang ===
      {
        name: 'licenseType',
        label: 'Lizenzart',
        type: 'select',
        placeholder: 'Art der Lizenz',
        required: true,
        group: 'Lizenzumfang',
        options: ['Ausschließliche Lizenz (exklusiv)', 'Einfache Lizenz (nicht-exklusiv)', 'Alleinlizenz (exklusiv, aber Lizenzgeber behält Nutzung)', 'Open Source Lizenz'],
        helpText: 'Exklusiv = nur der Lizenznehmer darf nutzen'
      },
      {
        name: 'territory',
        label: 'Territorium',
        type: 'select',
        placeholder: 'Geltungsbereich',
        required: true,
        group: 'Lizenzumfang',
        options: ['Deutschland', 'DACH (DE/AT/CH)', 'Europäische Union', 'Europa', 'Weltweit', 'Bestimmte Länder'],
        helpText: 'Räumlicher Geltungsbereich der Lizenz'
      },
      {
        name: 'territoryDetails',
        label: 'Territorium (Details)',
        type: 'text',
        placeholder: 'Falls "Bestimmte Länder": Welche?',
        required: false,
        group: 'Lizenzumfang'
      },
      {
        name: 'usageRights',
        label: 'Nutzungsarten',
        type: 'select',
        placeholder: 'Wie darf genutzt werden?',
        required: true,
        group: 'Lizenzumfang',
        options: ['Alle Nutzungsarten', 'Nur interne Nutzung', 'Kommerzieller Vertrieb', 'Online/Digital', 'Print/Offline', 'Eingeschränkt (siehe Beschreibung)']
      },
      {
        name: 'sublicenseRight',
        label: 'Unterlizenzierung',
        type: 'select',
        placeholder: 'Darf Lizenznehmer Unterlizenzen vergeben?',
        required: true,
        group: 'Lizenzumfang',
        options: ['Nicht gestattet', 'Mit Zustimmung des Lizenzgebers', 'Uneingeschränkt gestattet', 'Nur an verbundene Unternehmen']
      },
      {
        name: 'transferRight',
        label: 'Übertragbarkeit',
        type: 'select',
        placeholder: 'Ist die Lizenz übertragbar?',
        required: true,
        group: 'Lizenzumfang',
        options: ['Nicht übertragbar', 'Mit Zustimmung übertragbar', 'Frei übertragbar']
      },

      // === GRUPPE: Lizenzgebühren ===
      {
        name: 'feeModel',
        label: 'Vergütungsmodell',
        type: 'select',
        placeholder: 'Art der Lizenzgebühr',
        required: true,
        group: 'Lizenzgebühren',
        options: ['Einmalzahlung (Flat Fee)', 'Laufende Lizenzgebühr (Royalty)', 'Kombination (Upfront + Royalty)', 'Umsatzbeteiligung', 'Stückzahlabhängig', 'Kostenlos/Lizenzfrei'],
        helpText: 'Royalties sind bei Software und Patenten üblich'
      },
      {
        name: 'upfrontFee',
        label: 'Einmalzahlung (€)',
        type: 'number',
        placeholder: 'Einmalige Lizenzgebühr',
        required: false,
        group: 'Lizenzgebühren'
      },
      {
        name: 'royaltyRate',
        label: 'Lizenzgebühr / Royalty',
        type: 'text',
        placeholder: 'z.B. "5% vom Nettoumsatz" oder "2€ pro Einheit"',
        required: false,
        group: 'Lizenzgebühren'
      },
      {
        name: 'minimumRoyalty',
        label: 'Mindestlizenzgebühr (€/Jahr)',
        type: 'number',
        placeholder: 'Jährliche Mindestgebühr',
        required: false,
        group: 'Lizenzgebühren',
        helpText: 'Sichert Mindesteinnahmen unabhängig vom Umsatz'
      },
      {
        name: 'paymentInterval',
        label: 'Abrechnungszeitraum',
        type: 'select',
        placeholder: 'Wie oft wird abgerechnet?',
        required: false,
        group: 'Lizenzgebühren',
        options: ['Monatlich', 'Vierteljährlich', 'Halbjährlich', 'Jährlich', 'Einmalig']
      },

      // === GRUPPE: Laufzeit & Kündigung ===
      {
        name: 'duration',
        label: 'Laufzeit',
        type: 'select',
        placeholder: 'Lizenzlaufzeit',
        required: true,
        group: 'Laufzeit & Kündigung',
        options: ['1 Jahr', '2 Jahre', '3 Jahre', '5 Jahre', '10 Jahre', 'Schutzdauer des Rechts', 'Unbefristet'],
        helpText: 'Bei Patenten max. 20 Jahre, bei Urheberrecht 70 Jahre nach Tod'
      },
      {
        name: 'startDate',
        label: 'Lizenzbeginn',
        type: 'date',
        placeholder: '',
        required: true,
        group: 'Laufzeit & Kündigung'
      },
      {
        name: 'terminationNotice',
        label: 'Kündigungsfrist',
        type: 'select',
        placeholder: 'Frist für ordentliche Kündigung',
        required: true,
        group: 'Laufzeit & Kündigung',
        options: ['1 Monat', '3 Monate', '6 Monate', '12 Monate', 'Keine ordentliche Kündigung']
      },
      {
        name: 'autoRenewal',
        label: 'Automatische Verlängerung',
        type: 'select',
        placeholder: 'Verlängert sich der Vertrag?',
        required: true,
        group: 'Laufzeit & Kündigung',
        options: ['Keine Verlängerung (endet automatisch)', 'Verlängert sich um 1 Jahr', 'Verlängert sich um gleichen Zeitraum', 'Unbefristet nach Ablauf']
      },

      // === GRUPPE: Gewährleistung & Haftung ===
      {
        name: 'warranty',
        label: 'Gewährleistung',
        type: 'select',
        placeholder: 'Gewährleistungsumfang',
        required: true,
        group: 'Gewährleistung & Haftung',
        options: ['Keine Gewährleistung (wie besehen)', 'Standardgewährleistung (12 Monate)', 'Erweiterte Gewährleistung (24 Monate)', 'Mangelfreiheit zugesichert'],
        helpText: 'Bei "wie besehen" keine Garantie für Fehlerfreiheit'
      },
      {
        name: 'liabilityLimit',
        label: 'Haftungsbegrenzung',
        type: 'select',
        placeholder: 'Wie ist die Haftung begrenzt?',
        required: true,
        group: 'Gewährleistung & Haftung',
        options: ['Unbegrenzte Haftung', 'Auf Vorsatz/grobe Fahrlässigkeit begrenzt', 'Auf Lizenzgebühren begrenzt', 'Auf Versicherungssumme begrenzt', 'Individuell festgelegt']
      },
      {
        name: 'indemnification',
        label: 'Freistellung bei Rechtsmängeln',
        type: 'select',
        placeholder: 'Wer haftet bei Rechtsverletzungen?',
        required: false,
        group: 'Gewährleistung & Haftung',
        options: ['Lizenzgeber stellt Lizenznehmer frei', 'Keine Freistellung', 'Anteilige Haftung'],
        helpText: 'Bei Ansprüchen Dritter wegen Schutzrechtsverletzung'
      },

      // === GRUPPE: Sonderbestimmungen ===
      {
        name: 'improvements',
        label: 'Verbesserungen/Weiterentwicklungen',
        type: 'select',
        placeholder: 'Wem gehören Verbesserungen?',
        required: false,
        group: 'Sonderbestimmungen',
        options: ['Verbleiben beim Lizenznehmer', 'Gehen an Lizenzgeber', 'Gemeinsam (Rücklizenz)', 'Nach Vereinbarung'],
        helpText: 'Wichtig bei Software und Technologielizenzen'
      },
      {
        name: 'auditRight',
        label: 'Prüfungsrecht',
        type: 'select',
        placeholder: 'Darf Lizenzgeber Nutzung prüfen?',
        required: false,
        group: 'Sonderbestimmungen',
        options: ['Kein Prüfungsrecht', 'Jährliches Audit-Recht', 'Bei begründetem Verdacht', 'Umfassendes Prüfungsrecht']
      },
      {
        name: 'confidentiality',
        label: 'Vertraulichkeit',
        type: 'select',
        placeholder: 'Geheimhaltungspflicht?',
        required: false,
        group: 'Sonderbestimmungen',
        options: ['Keine besondere Vertraulichkeit', 'Standard-Vertraulichkeit', 'Strenge Geheimhaltung', 'Separate NDA erforderlich']
      },
      {
        name: 'specialTerms',
        label: 'Besondere Vereinbarungen',
        type: 'textarea',
        placeholder: 'Weitere Regelungen (z.B. Support, Updates, Schulungen)',
        required: false,
        group: 'Sonderbestimmungen'
      }
    ]
  },
  {
    id: 'aufhebungsvertrag',
    name: 'Aufhebungsvertrag',
    description: 'Einvernehmliche Vertragsbeendigung',
    icon: '🤝',
    category: 'Arbeitsrecht',
    jurisdiction: 'Deutschland (BGB, Arbeitsrecht)',
    estimatedDuration: '10-15 Minuten',
    popularity: 55,
    fields: [
      // === GRUPPE: Vertragsparteien ===
      {
        name: 'employer',
        label: 'Arbeitgeber (Firma)',
        type: 'text',
        placeholder: 'Vollständiger Firmenname',
        required: true,
        group: 'Vertragsparteien'
      },
      {
        name: 'employerAddress',
        label: 'Anschrift Arbeitgeber',
        type: 'text',
        placeholder: 'Straße, PLZ, Ort',
        required: true,
        group: 'Vertragsparteien'
      },
      {
        name: 'employerRepresentative',
        label: 'Vertreten durch',
        type: 'text',
        placeholder: 'Name des Geschäftsführers/Personalverantwortlichen',
        required: false,
        group: 'Vertragsparteien'
      },
      {
        name: 'employee',
        label: 'Arbeitnehmer/in',
        type: 'text',
        placeholder: 'Vollständiger Name',
        required: true,
        group: 'Vertragsparteien'
      },
      {
        name: 'employeeAddress',
        label: 'Anschrift Arbeitnehmer/in',
        type: 'text',
        placeholder: 'Straße, PLZ, Ort',
        required: true,
        group: 'Vertragsparteien'
      },
      {
        name: 'employeeBirthdate',
        label: 'Geburtsdatum',
        type: 'date',
        placeholder: '',
        required: false,
        group: 'Vertragsparteien'
      },

      // === GRUPPE: Bisheriges Arbeitsverhältnis ===
      {
        name: 'position',
        label: 'Bisherige Position/Tätigkeit',
        type: 'text',
        placeholder: 'z.B. Senior Software Engineer',
        required: true,
        group: 'Bisheriges Arbeitsverhältnis'
      },
      {
        name: 'department',
        label: 'Abteilung',
        type: 'text',
        placeholder: 'z.B. IT-Entwicklung',
        required: false,
        group: 'Bisheriges Arbeitsverhältnis'
      },
      {
        name: 'employmentStart',
        label: 'Beschäftigt seit',
        type: 'date',
        placeholder: '',
        required: true,
        group: 'Bisheriges Arbeitsverhältnis',
        helpText: 'Eintrittsdatum in das Unternehmen'
      },
      {
        name: 'currentSalary',
        label: 'Aktuelles Bruttogehalt (€/Monat)',
        type: 'number',
        placeholder: 'Monatliches Bruttogehalt',
        required: true,
        group: 'Bisheriges Arbeitsverhältnis',
        helpText: 'Relevant für Abfindungsberechnung'
      },

      // === GRUPPE: Beendigung ===
      {
        name: 'reason',
        label: 'Beendigungsgrund',
        type: 'select',
        placeholder: 'Grund der Beendigung',
        required: true,
        group: 'Beendigung',
        options: ['Einvernehmlich ohne nähere Angabe', 'Betriebsbedingte Gründe', 'Betriebsänderung/Umstrukturierung', 'Verlagerung des Arbeitsplatzes', 'Persönliche/familiäre Gründe des Arbeitnehmers', 'Berufliche Neuorientierung', 'Vermeidung einer betriebsbedingten Kündigung'],
        helpText: 'Wichtig für Sperrzeit beim Arbeitslosengeld'
      },
      {
        name: 'endDate',
        label: 'Beendigungsdatum',
        type: 'date',
        placeholder: '',
        required: true,
        group: 'Beendigung',
        helpText: 'Letzter Arbeitstag / Ende des Arbeitsverhältnisses'
      },
      {
        name: 'noticePeriodWaived',
        label: 'Kündigungsfrist',
        type: 'select',
        placeholder: 'Einhaltung der Kündigungsfrist',
        required: true,
        group: 'Beendigung',
        options: ['Kündigungsfrist eingehalten', 'Verkürzte Frist vereinbart', 'Sofortige Beendigung'],
        helpText: 'Bei verkürzter Frist ggf. Sperrzeit beim Arbeitslosengeld'
      },
      {
        name: 'initiator',
        label: 'Initiative ging aus von',
        type: 'select',
        placeholder: 'Wer hat Beendigung initiiert?',
        required: false,
        group: 'Beendigung',
        options: ['Arbeitgeber', 'Arbeitnehmer', 'Einvernehmlich/Beide', 'Nicht angegeben']
      },

      // === GRUPPE: Abfindung ===
      {
        name: 'severanceType',
        label: 'Abfindungsregelung',
        type: 'select',
        placeholder: 'Art der Abfindung',
        required: true,
        group: 'Abfindung',
        options: ['Keine Abfindung', 'Einmalzahlung', 'Ratenzahlung', 'Kombination mit Sachleistungen'],
        helpText: 'Abfindungen sind steuerpflichtig (Fünftelregelung möglich)'
      },
      {
        name: 'severanceAmount',
        label: 'Abfindungshöhe (€ brutto)',
        type: 'number',
        placeholder: 'Brutto-Abfindungssumme',
        required: false,
        group: 'Abfindung',
        helpText: 'Faustregel: 0,5 Monatsgehälter pro Beschäftigungsjahr'
      },
      {
        name: 'severancePaymentDate',
        label: 'Fälligkeit der Abfindung',
        type: 'select',
        placeholder: 'Wann wird gezahlt?',
        required: false,
        group: 'Abfindung',
        options: ['Mit letzter Gehaltsabrechnung', 'Zum Beendigungsdatum', 'Im Folgemonat nach Beendigung', 'Nach Ablauf der Klagefrist (3 Wochen)', 'Ratenzahlung vereinbart']
      },

      // === GRUPPE: Freistellung & Resturlaub ===
      {
        name: 'releaseFromWork',
        label: 'Freistellung',
        type: 'select',
        placeholder: 'Wird der Arbeitnehmer freigestellt?',
        required: true,
        group: 'Freistellung & Resturlaub',
        options: ['Keine Freistellung', 'Bezahlte Freistellung (unwiderruflich)', 'Bezahlte Freistellung (widerruflich)', 'Teilweise Freistellung']
      },
      {
        name: 'releaseFromDate',
        label: 'Freistellung ab',
        type: 'date',
        placeholder: '',
        required: false,
        group: 'Freistellung & Resturlaub'
      },
      {
        name: 'vacationDaysRemaining',
        label: 'Resturlaub (Tage)',
        type: 'number',
        placeholder: 'Anzahl offener Urlaubstage',
        required: true,
        group: 'Freistellung & Resturlaub'
      },
      {
        name: 'vacationHandling',
        label: 'Urlaubsabgeltung',
        type: 'select',
        placeholder: 'Wie wird Resturlaub behandelt?',
        required: true,
        group: 'Freistellung & Resturlaub',
        options: ['Urlaubsgewährung während Freistellung', 'Auszahlung des Resturlaubs', 'Kombination aus beidem', 'Urlaub bereits genommen']
      },
      {
        name: 'overtimeHandling',
        label: 'Überstundenabgeltung',
        type: 'select',
        placeholder: 'Wie werden Überstunden behandelt?',
        required: false,
        group: 'Freistellung & Resturlaub',
        options: ['Keine Überstunden vorhanden', 'Auszahlung der Überstunden', 'Abgeltung durch Freistellung', 'Mit Abfindung abgegolten', 'Gegenseitiger Verzicht']
      },

      // === GRUPPE: Arbeitszeugnis ===
      {
        name: 'referenceType',
        label: 'Art des Zeugnisses',
        type: 'select',
        placeholder: 'Welches Zeugnis wird erteilt?',
        required: true,
        group: 'Arbeitszeugnis',
        options: ['Qualifiziertes Zeugnis', 'Einfaches Zeugnis', 'Zwischenzeugnis zusätzlich'],
        helpText: 'Qualifiziertes Zeugnis enthält Leistungs- und Verhaltensbeurteilung'
      },
      {
        name: 'referenceGrade',
        label: 'Zeugnisqualität',
        type: 'select',
        placeholder: 'Vereinbarte Bewertung',
        required: true,
        group: 'Arbeitszeugnis',
        options: ['Sehr gut (Note 1)', 'Gut (Note 2)', 'Befriedigend (Note 3)', 'Nach individueller Formulierung', 'Dankes- und Bedauernsformel enthalten'],
        helpText: 'Arbeitnehmer hat Anspruch auf wohlwollende Formulierung'
      },
      {
        name: 'referenceDeadline',
        label: 'Zeugnis bis',
        type: 'date',
        placeholder: '',
        required: false,
        group: 'Arbeitszeugnis',
        helpText: 'Datum, bis wann das Zeugnis erteilt werden muss'
      },

      // === GRUPPE: Rückgabepflichten ===
      {
        name: 'returnItems',
        label: 'Rückzugebende Gegenstände',
        type: 'select',
        placeholder: 'Was muss zurückgegeben werden?',
        required: false,
        group: 'Rückgabepflichten',
        options: ['Keine Gegenstände', 'Dienstwagen', 'Laptop/IT-Equipment', 'Schlüssel/Zugangskarten', 'Mehrere Gegenstände (Details unten)']
      },
      {
        name: 'returnItemsDetails',
        label: 'Details zu Rückgaben',
        type: 'textarea',
        placeholder: 'Auflistung der zurückzugebenden Gegenstände und Fristen',
        required: false,
        group: 'Rückgabepflichten'
      },
      {
        name: 'companyCarHandling',
        label: 'Dienstwagenregelung',
        type: 'select',
        placeholder: 'Falls Dienstwagen vorhanden',
        required: false,
        group: 'Rückgabepflichten',
        options: ['Kein Dienstwagen', 'Rückgabe zum Beendigungsdatum', 'Rückgabe bei Freistellungsbeginn', 'Privatnutzung bis Beendigung', 'Übernahme durch Arbeitnehmer']
      },

      // === GRUPPE: Abschließende Regelungen ===
      {
        name: 'confidentialityClause',
        label: 'Verschwiegenheitspflicht',
        type: 'select',
        placeholder: 'Geheimhaltung nach Beendigung',
        required: false,
        group: 'Abschließende Regelungen',
        options: ['Gesetzliche Verschwiegenheit', 'Erweiterte Geheimhaltung', 'Mit Vertragsstrafe', 'Keine besondere Regelung']
      },
      {
        name: 'nonCompete',
        label: 'Wettbewerbsverbot',
        type: 'select',
        placeholder: 'Nachvertragliches Wettbewerbsverbot',
        required: false,
        group: 'Abschließende Regelungen',
        options: ['Kein Wettbewerbsverbot', 'Bestehendes Verbot bleibt wirksam', 'Verzicht auf bestehendes Verbot', 'Neues Verbot vereinbart (mit Karenzentschädigung)'],
        helpText: 'Wettbewerbsverbote erfordern Karenzentschädigung (mind. 50% des Gehalts)'
      },
      {
        name: 'settlementClause',
        label: 'Erledigungsklausel',
        type: 'select',
        placeholder: 'Abschließende Regelung aller Ansprüche',
        required: true,
        group: 'Abschließende Regelungen',
        options: ['Vollständige Erledigung (Generalquittung)', 'Erledigung mit Ausnahmen', 'Keine Erledigungsklausel'],
        helpText: 'Mit Generalquittung sind alle Ansprüche abgegolten'
      },
      {
        name: 'specialAgreements',
        label: 'Besondere Vereinbarungen',
        type: 'textarea',
        placeholder: 'Weitere Regelungen (z.B. Outplacement, Weiterzahlung von Boni, Aktienoptionen)',
        required: false,
        group: 'Abschließende Regelungen'
      }
    ]
  },
  {
    id: 'pachtvertrag',
    name: 'Pachtvertrag',
    description: 'Für landwirtschaftliche Flächen oder Gastronomie',
    icon: '🌾',
    category: 'Immobilien',
    jurisdiction: 'Deutschland (BGB §§ 581-597, LPachtVG)',
    estimatedDuration: '15-20 Minuten',
    isNew: true,
    popularity: 50,
    fields: [
      // === GRUPPE: Pachtgegenstand ===
      {
        name: 'pachtType',
        label: 'Art der Pacht',
        type: 'select',
        placeholder: 'Was wird verpachtet?',
        required: true,
        group: 'Pachtgegenstand',
        options: ['Landwirtschaftliche Fläche', 'Gaststätte/Restaurant', 'Hotel/Pension', 'Gewerbebetrieb mit Inventar', 'Tankstelle', 'Jagdrevier', 'Fischereirecht', 'Sonstige Pacht'],
        helpText: 'Bestimmt die anwendbaren Sondervorschriften'
      },
      {
        name: 'object',
        label: 'Bezeichnung des Pachtobjekts',
        type: 'text',
        placeholder: 'z.B. "Landgasthof Zum Hirschen" oder "Ackerfläche Flur 12"',
        required: true,
        group: 'Pachtgegenstand'
      },
      {
        name: 'objectAddress',
        label: 'Adresse/Lage des Pachtobjekts',
        type: 'text',
        placeholder: 'Straße, PLZ, Ort oder Flurstück-Bezeichnung',
        required: true,
        group: 'Pachtgegenstand'
      },
      {
        name: 'objectSize',
        label: 'Größe/Fläche',
        type: 'text',
        placeholder: 'z.B. "150 m² Gastraum + 50 m² Küche" oder "5,3 ha"',
        required: true,
        group: 'Pachtgegenstand'
      },
      {
        name: 'objectDescription',
        label: 'Detailbeschreibung',
        type: 'textarea',
        placeholder: 'Ausführliche Beschreibung (Räume, Ausstattung, Zustand, Inventar)',
        required: true,
        group: 'Pachtgegenstand'
      },
      {
        name: 'cadastralInfo',
        label: 'Grundbuch/Kataster (bei Grundstücken)',
        type: 'text',
        placeholder: 'Grundbuch von..., Blatt..., Flurstück...',
        required: false,
        group: 'Pachtgegenstand',
        helpText: 'Bei landwirtschaftlichen Flächen wichtig'
      },

      // === GRUPPE: Verpächter ===
      {
        name: 'lessorType',
        label: 'Verpächter ist',
        type: 'select',
        placeholder: 'Art des Verpächters',
        required: true,
        group: 'Verpächter',
        options: ['Privatperson', 'Unternehmen/GmbH', 'Erbengemeinschaft', 'Kommune/Öffentliche Hand', 'Kirche/Stiftung']
      },
      {
        name: 'lessor',
        label: 'Name des Verpächters',
        type: 'text',
        placeholder: 'Vollständiger Name oder Firma',
        required: true,
        group: 'Verpächter'
      },
      {
        name: 'lessorAddress',
        label: 'Anschrift Verpächter',
        type: 'text',
        placeholder: 'Straße, PLZ, Ort',
        required: true,
        group: 'Verpächter'
      },

      // === GRUPPE: Pächter ===
      {
        name: 'lesseeType',
        label: 'Pächter ist',
        type: 'select',
        placeholder: 'Art des Pächters',
        required: true,
        group: 'Pächter',
        options: ['Privatperson', 'Einzelunternehmer', 'GmbH/UG', 'GbR/OHG/KG', 'Landwirtschaftlicher Betrieb']
      },
      {
        name: 'lessee',
        label: 'Name des Pächters',
        type: 'text',
        placeholder: 'Vollständiger Name oder Firma',
        required: true,
        group: 'Pächter'
      },
      {
        name: 'lesseeAddress',
        label: 'Anschrift Pächter',
        type: 'text',
        placeholder: 'Straße, PLZ, Ort',
        required: true,
        group: 'Pächter'
      },
      {
        name: 'lesseeQualification',
        label: 'Befähigung/Qualifikation',
        type: 'text',
        placeholder: 'z.B. Meisterbrief, Konzession, landwirtschaftliche Ausbildung',
        required: false,
        group: 'Pächter',
        helpText: 'Bei Gaststätten: Gaststättenerlaubnis erforderlich'
      },

      // === GRUPPE: Nutzung ===
      {
        name: 'usage',
        label: 'Nutzungszweck',
        type: 'select',
        placeholder: 'Wofür darf das Objekt genutzt werden?',
        required: true,
        group: 'Nutzung',
        options: ['Gastronomie (Speisen und Getränke)', 'Beherbergung', 'Landwirtschaft (Ackerbau)', 'Landwirtschaft (Viehzucht)', 'Gemischte Landwirtschaft', 'Gewerbliche Nutzung', 'Jagd', 'Fischerei', 'Sonstige (Details unten)']
      },
      {
        name: 'usageDetails',
        label: 'Nutzungsdetails/-beschränkungen',
        type: 'textarea',
        placeholder: 'Genauere Beschreibung der erlaubten/verbotenen Nutzung',
        required: false,
        group: 'Nutzung'
      },
      {
        name: 'operatingLicense',
        label: 'Erforderliche Genehmigungen',
        type: 'select',
        placeholder: 'Welche Genehmigungen liegen vor?',
        required: false,
        group: 'Nutzung',
        options: ['Keine besonderen Genehmigungen nötig', 'Gaststättenerlaubnis vorhanden', 'Gaststättenerlaubnis vom Pächter zu beantragen', 'Baugenehmigung vorhanden', 'Umweltgenehmigung erforderlich']
      },
      {
        name: 'inventoryIncluded',
        label: 'Mitgepachtetes Inventar',
        type: 'select',
        placeholder: 'Ist Inventar enthalten?',
        required: true,
        group: 'Nutzung',
        options: ['Kein Inventar enthalten', 'Vollständiges Inventar enthalten', 'Teilweises Inventar (siehe Liste)', 'Inventar separat gemietet'],
        helpText: 'Bei Gaststätten oft Küche, Mobiliar, etc.'
      },

      // === GRUPPE: Pachtzins ===
      {
        name: 'rentAmount',
        label: 'Pachtzins (€)',
        type: 'number',
        placeholder: 'Monatlicher Betrag',
        required: true,
        group: 'Pachtzins'
      },
      {
        name: 'rentInterval',
        label: 'Zahlungsintervall',
        type: 'select',
        placeholder: 'Wie oft wird gezahlt?',
        required: true,
        group: 'Pachtzins',
        options: ['Monatlich im Voraus', 'Monatlich nachträglich', 'Vierteljährlich', 'Halbjährlich', 'Jährlich']
      },
      {
        name: 'rentDueDay',
        label: 'Fällig zum',
        type: 'select',
        placeholder: 'Fälligkeitstag',
        required: true,
        group: 'Pachtzins',
        options: ['1. des Monats', '3. Werktag', '15. des Monats', 'Letzter Werktag', 'Individuell']
      },
      {
        name: 'rentAdjustment',
        label: 'Pachtzinsanpassung',
        type: 'select',
        placeholder: 'Wie wird der Pachtzins angepasst?',
        required: true,
        group: 'Pachtzins',
        options: ['Keine Anpassung (Festpacht)', 'Indexanpassung (Verbraucherpreisindex)', 'Staffelpacht (jährliche Erhöhung)', 'Umsatzpacht (% vom Umsatz)', 'Kombination Grundpacht + Umsatzanteil', 'Nach Vereinbarung alle X Jahre']
      },
      {
        name: 'rentAdditionalCosts',
        label: 'Nebenkosten',
        type: 'select',
        placeholder: 'Wie werden Nebenkosten behandelt?',
        required: true,
        group: 'Pachtzins',
        options: ['Im Pachtzins enthalten (Warmpauscale)', 'Zusätzlich nach Verbrauch', 'Monatliche Vorauszahlung + Abrechnung', 'Direkt an Versorger'],
        helpText: 'Strom, Wasser, Heizung, Müllentsorgung etc.'
      },

      // === GRUPPE: Laufzeit & Kündigung ===
      {
        name: 'startDate',
        label: 'Pachtbeginn',
        type: 'date',
        placeholder: '',
        required: true,
        group: 'Laufzeit & Kündigung'
      },
      {
        name: 'duration',
        label: 'Pachtdauer',
        type: 'select',
        placeholder: 'Wie lange läuft der Vertrag?',
        required: true,
        group: 'Laufzeit & Kündigung',
        options: ['1 Jahr', '2 Jahre', '3 Jahre', '5 Jahre', '10 Jahre', '12 Jahre', '15 Jahre', '20 Jahre', 'Unbefristet'],
        helpText: 'Bei Landpacht oft lange Laufzeiten (9+ Jahre)'
      },
      {
        name: 'endDate',
        label: 'Pachtende (falls befristet)',
        type: 'date',
        placeholder: '',
        required: false,
        group: 'Laufzeit & Kündigung'
      },
      {
        name: 'terminationNotice',
        label: 'Kündigungsfrist',
        type: 'select',
        placeholder: 'Frist für ordentliche Kündigung',
        required: true,
        group: 'Laufzeit & Kündigung',
        options: ['3 Monate zum Quartalsende', '6 Monate zum Jahresende', '12 Monate zum Jahresende', '2 Jahre zum Pachtjahresende (Landpacht)', 'Keine ordentliche Kündigung (befristet)'],
        helpText: 'Bei Landpacht gesetzlich mind. 2 Jahre vor Pachtjahresende'
      },
      {
        name: 'renewalOption',
        label: 'Verlängerungsoption',
        type: 'select',
        placeholder: 'Verlängerungsmöglichkeit',
        required: false,
        group: 'Laufzeit & Kündigung',
        options: ['Keine Option', 'Einmalige Verlängerungsoption', 'Mehrfache Verlängerungsoption', 'Automatische Verlängerung']
      },

      // === GRUPPE: Pflichten & Instandhaltung ===
      {
        name: 'maintenance',
        label: 'Instandhaltung',
        type: 'select',
        placeholder: 'Wer trägt die Instandhaltung?',
        required: true,
        group: 'Pflichten & Instandhaltung',
        options: ['Verpächter vollständig', 'Kleine Reparaturen Pächter, große Verpächter', 'Pächter übernimmt Instandhaltung', 'Nach detaillierter Vereinbarung'],
        helpText: 'Bei Betriebspacht oft mehr Pflichten beim Pächter'
      },
      {
        name: 'insurances',
        label: 'Versicherungen',
        type: 'select',
        placeholder: 'Wer trägt welche Versicherungen?',
        required: false,
        group: 'Pflichten & Instandhaltung',
        options: ['Gebäudeversicherung Verpächter, Inventar Pächter', 'Alle Versicherungen Pächter', 'Nach detaillierter Aufstellung', 'Betriebshaftpflicht vom Pächter']
      },
      {
        name: 'investmentObligation',
        label: 'Investitionspflichten',
        type: 'select',
        placeholder: 'Investitionsvereinbarung',
        required: false,
        group: 'Pflichten & Instandhaltung',
        options: ['Keine besonderen Investitionspflichten', 'Mindestinvestition pro Jahr vereinbart', 'Modernisierungsplan vereinbart', 'Rückbaupflicht bei Vertragsende']
      },
      {
        name: 'conditionProtocol',
        label: 'Zustandsprotokoll',
        type: 'select',
        placeholder: 'Dokumentation des Zustands',
        required: false,
        group: 'Pflichten & Instandhaltung',
        options: ['Übergabeprotokoll wird erstellt', 'Fotodokumentation', 'Sachverständigengutachten', 'Keine besondere Dokumentation']
      },

      // === GRUPPE: Kaution & Sicherheiten ===
      {
        name: 'deposit',
        label: 'Kaution/Pacht-Sicherheit',
        type: 'select',
        placeholder: 'Art der Sicherheitsleistung',
        required: true,
        group: 'Kaution & Sicherheiten',
        options: ['Keine Kaution', 'Barkaution (3 Monatspachten)', 'Barkaution (6 Monatspachten)', 'Bankbürgschaft', 'Mietaval', 'Persönliche Bürgschaft'],
        helpText: 'Bei Gewerbepacht oft höhere Sicherheiten als bei Miete'
      },
      {
        name: 'depositAmount',
        label: 'Kautionshöhe (€)',
        type: 'number',
        placeholder: 'Betrag der Sicherheitsleistung',
        required: false,
        group: 'Kaution & Sicherheiten'
      },

      // === GRUPPE: Besondere Vereinbarungen ===
      {
        name: 'subletting',
        label: 'Unterverpachtung',
        type: 'select',
        placeholder: 'Ist Unterverpachtung erlaubt?',
        required: false,
        group: 'Besondere Vereinbarungen',
        options: ['Nicht gestattet', 'Mit Zustimmung des Verpächters', 'Für Teilbereiche erlaubt', 'Uneingeschränkt erlaubt']
      },
      {
        name: 'preemptiveRight',
        label: 'Vorkaufsrecht',
        type: 'select',
        placeholder: 'Hat der Pächter ein Vorkaufsrecht?',
        required: false,
        group: 'Besondere Vereinbarungen',
        options: ['Kein Vorkaufsrecht', 'Gesetzliches Vorkaufsrecht (Landpacht)', 'Vertragliches Vorkaufsrecht vereinbart'],
        helpText: 'Landpächter haben oft gesetzliches Vorkaufsrecht'
      },
      {
        name: 'goodwillCompensation',
        label: 'Entschädigung für Goodwill',
        type: 'select',
        placeholder: 'Abfindung bei Vertragsende?',
        required: false,
        group: 'Besondere Vereinbarungen',
        options: ['Keine Entschädigung', 'Abfindung für Kundenstamm', 'Entschädigung für Investitionen', 'Nach Gutachten'],
        helpText: 'Bei Gaststätten relevant für aufgebauten Kundenstamm'
      },
      {
        name: 'competitionClause',
        label: 'Konkurrenzschutz',
        type: 'select',
        placeholder: 'Schutz vor Konkurrenz?',
        required: false,
        group: 'Besondere Vereinbarungen',
        options: ['Kein Konkurrenzschutz', 'Verpächter darf nicht im Umkreis verpachten', 'Branchenschutzklausel vereinbart']
      },
      {
        name: 'specialTerms',
        label: 'Sonstige Vereinbarungen',
        type: 'textarea',
        placeholder: 'Weitere Regelungen (z.B. Öffnungszeiten, Sortiment, Mindestqualität)',
        required: false,
        group: 'Besondere Vereinbarungen'
      }
    ]
  },
  {
    id: 'werkvertrag',
    name: 'Werkvertrag',
    description: 'Für Bau-, Handwerks- und Projektleistungen',
    icon: '🔨',
    jurisdiction: 'DE',
    category: 'Dienstleistung',
    estimatedDuration: '8-12 Minuten',
    popularity: 65,
    isNew: true,
    fields: [
      { name: 'client', label: 'Besteller (Name)', type: 'text', placeholder: 'Vollständiger Name / Firma', required: true, group: 'Vertragsparteien' },
      { name: 'clientAddress', label: 'Adresse Besteller', type: 'textarea', placeholder: 'Straße, PLZ, Ort', required: true, group: 'Vertragsparteien' },
      { name: 'contractor', label: 'Unternehmer (Name)', type: 'text', placeholder: 'Vollständiger Name / Firma des Auftragnehmers', required: true, group: 'Vertragsparteien' },
      { name: 'contractorAddress', label: 'Adresse Unternehmer', type: 'textarea', placeholder: 'Straße, PLZ, Ort', required: true, group: 'Vertragsparteien' },
      { name: 'contractorTaxId', label: 'USt-IdNr. / Steuer-ID Unternehmer', type: 'text', placeholder: 'z.B. DE123456789', required: false, group: 'Vertragsparteien', helpText: 'Für die Rechnungsstellung empfohlen' },
      { name: 'workDescription', label: 'Werkbeschreibung', type: 'textarea', placeholder: 'Detaillierte Beschreibung des herzustellenden Werks...', required: true, group: 'Werkleistung' },
      { name: 'workType', label: 'Art der Leistung', type: 'select', placeholder: 'Welche Art von Werk?', required: true, group: 'Werkleistung',
        options: ['Bauleistung / Renovierung', 'Handwerksleistung', 'Softwareentwicklung', 'Design / Grafik', 'Gutachten / Expertise', 'Sonstige Werkleistung'] },
      { name: 'workLocation', label: 'Leistungsort', type: 'text', placeholder: 'z.B. Musterstraße 1, 10115 Berlin', required: false, group: 'Werkleistung', helpText: 'Bei Bauleistungen besonders wichtig' },
      { name: 'specifications', label: 'Leistungsverzeichnis / Spezifikationen', type: 'textarea', placeholder: 'Technische Anforderungen, Materialvorgaben, Qualitätsstandards...', required: false, group: 'Werkleistung', helpText: 'Je detaillierter, desto rechtssicherer' },
      { name: 'materialProvider', label: 'Materialgestellung', type: 'select', placeholder: 'Wer stellt das Material?', required: false, group: 'Werkleistung',
        options: ['Unternehmer beschafft Material', 'Besteller stellt Material', 'Nach Vereinbarung'] },
      { name: 'price', label: 'Vergütung', type: 'text', placeholder: 'z.B. 25.000€ oder nach Aufwand', required: true, group: 'Vergütung' },
      { name: 'priceType', label: 'Vergütungsart', type: 'select', placeholder: 'Fest- oder Stundensatz?', required: true, group: 'Vergütung',
        options: ['Festpreis (pauschal)', 'Stundensatz', 'Nach Aufmaß', 'Kostenanschlag mit Obergrenze'] },
      { name: 'paymentTerms', label: 'Zahlungsbedingungen', type: 'select', placeholder: 'Wann wird gezahlt?', required: true, group: 'Vergütung',
        options: ['Nach Abnahme', 'Abschlagszahlungen nach Baufortschritt', '50% Anzahlung, 50% nach Abnahme', '30 Tage nach Rechnungsstellung'] },
      { name: 'startDate', label: 'Leistungsbeginn', type: 'date', placeholder: '', required: true, group: 'Termine & Fristen' },
      { name: 'completionDate', label: 'Fertigstellungstermin', type: 'date', placeholder: '', required: true, group: 'Termine & Fristen' },
      { name: 'milestones', label: 'Meilensteine / Zwischentermine', type: 'textarea', placeholder: 'z.B. Rohbau bis 01.06., Innenausbau bis 01.08.', required: false, group: 'Termine & Fristen' },
      { name: 'acceptance', label: 'Abnahmeverfahren', type: 'select', placeholder: 'Wie wird abgenommen?', required: true, group: 'Abnahme & Gewährleistung',
        options: ['Förmliche Abnahme mit Protokoll', 'Fiktive Abnahme nach 12 Werktagen', 'Abnahme durch Sachverständigen', 'Stillschweigende Abnahme bei Nutzung'] },
      { name: 'warranty', label: 'Gewährleistungsfrist', type: 'select', placeholder: 'Wie lange wird gehaftet?', required: true, group: 'Abnahme & Gewährleistung',
        options: ['Gesetzlich (2 Jahre für bewegliche Werke)', 'Gesetzlich (5 Jahre für Bauwerke)', '1 Jahr (vereinbart)', '3 Jahre (vereinbart)'],
        helpText: 'BGB §634a: 2 Jahre Standard, 5 Jahre bei Bauwerken' },
      { name: 'liability', label: 'Haftungsbegrenzung', type: 'select', placeholder: 'Wie wird die Haftung begrenzt?', required: true, group: 'Haftung & Kündigung',
        options: ['Auf Auftragswert begrenzt', 'Nur Vorsatz und grobe Fahrlässigkeit', 'Gesetzliche Haftung (unbegrenzt)', 'Auf doppelten Auftragswert begrenzt'] },
      { name: 'terminationClause', label: 'Kündigungsregelung', type: 'select', placeholder: 'Kündigungsmöglichkeiten', required: true, group: 'Haftung & Kündigung',
        options: ['Jederzeit nach §648 BGB (Besteller)', 'Nur aus wichtigem Grund', 'Mit 4 Wochen Frist zum Monatsende', 'Nach Abmahnung und Nachfrist'],
        helpText: 'Besteller kann jederzeit kündigen (§648 BGB), muss aber vereinbarte Vergütung zahlen' },
      { name: 'insuranceRequired', label: 'Versicherungsanforderung', type: 'select', placeholder: 'Versicherungsnachweis nötig?', required: false, group: 'Haftung & Kündigung',
        options: ['Keine Anforderung', 'Betriebshaftpflicht erforderlich', 'Bauwesenversicherung erforderlich', 'Betriebshaftpflicht + Bauwesenversicherung'],
        helpText: 'Bei Bauleistungen wird Haftpflichtversicherung dringend empfohlen' },
      { name: 'governingLaw', label: 'Anwendbares Recht', type: 'select', placeholder: 'Welches Recht gilt?', required: true, group: 'Rechtliches',
        options: ['Deutsches Recht', 'Österreichisches Recht', 'Schweizer Recht'] },
      { name: 'jurisdiction', label: 'Gerichtsstand', type: 'text', placeholder: 'z.B. Berlin, München, Hamburg', required: true, group: 'Rechtliches' }
    ]
  },
  {
    id: 'kooperation',
    name: 'Kooperationsvertrag',
    description: 'Für Geschäftspartnerschaften und Joint Ventures',
    icon: '🤝',
    jurisdiction: 'DE',
    category: 'Geschäftsbeziehung',
    estimatedDuration: '10-15 Minuten',
    popularity: 55,
    isNew: true,
    fields: [
      { name: 'partnerA', label: 'Kooperationspartner A (Name)', type: 'text', placeholder: 'Firma oder Einzelunternehmer', required: true, group: 'Kooperationspartner' },
      { name: 'partnerAAddress', label: 'Adresse Partner A', type: 'textarea', placeholder: 'Straße, PLZ, Ort', required: true, group: 'Kooperationspartner' },
      { name: 'partnerARole', label: 'Rolle / Beitrag Partner A', type: 'textarea', placeholder: 'z.B. Technologie-Know-how, Vertriebsnetz, Finanzierung...', required: true, group: 'Kooperationspartner' },
      { name: 'partnerB', label: 'Kooperationspartner B (Name)', type: 'text', placeholder: 'Firma oder Einzelunternehmer', required: true, group: 'Kooperationspartner' },
      { name: 'partnerBAddress', label: 'Adresse Partner B', type: 'textarea', placeholder: 'Straße, PLZ, Ort', required: true, group: 'Kooperationspartner' },
      { name: 'partnerBRole', label: 'Rolle / Beitrag Partner B', type: 'textarea', placeholder: 'z.B. Produktion, Marketing, Fachexpertise...', required: true, group: 'Kooperationspartner' },
      { name: 'purpose', label: 'Kooperationszweck', type: 'textarea', placeholder: 'Was ist das gemeinsame Ziel der Kooperation?', required: true, group: 'Kooperationsgegenstand' },
      { name: 'scope', label: 'Umfang der Zusammenarbeit', type: 'textarea', placeholder: 'Welche konkreten Projekte, Produkte oder Dienstleistungen?', required: true, group: 'Kooperationsgegenstand' },
      { name: 'cooperationType', label: 'Art der Kooperation', type: 'select', placeholder: 'Welche Form?', required: true, group: 'Kooperationsgegenstand',
        options: ['Projektbasierte Kooperation', 'Dauerhafte strategische Partnerschaft', 'Joint Venture (ohne Gesellschaft)', 'Vertriebskooperation', 'Forschungs- und Entwicklungskooperation'] },
      { name: 'financialModel', label: 'Finanzierungsmodell', type: 'select', placeholder: 'Wer finanziert was?', required: true, group: 'Finanzielles',
        options: ['Jeder Partner trägt eigene Kosten', 'Gemeinsamer Kostenpool (50/50)', 'Kostenverteilung nach Vereinbarung', 'Ein Partner finanziert, anderer leistet'] },
      { name: 'profitSharing', label: 'Gewinnverteilung', type: 'select', placeholder: 'Wie werden Gewinne geteilt?', required: true, group: 'Finanzielles',
        options: ['50/50 Gleichverteilung', 'Nach Beitragsanteil', 'Nach individueller Vereinbarung', 'Kein gemeinsamer Gewinn (eigene Vermarktung)'] },
      { name: 'liability', label: 'Haftung zwischen Partnern', type: 'select', placeholder: 'Wie haften die Partner?', required: true, group: 'Finanzielles',
        options: ['Gesamtschuldnerisch (beide haften für alles)', 'Anteilig nach Beitragsquote', 'Jeder haftet nur für eigene Fehler', 'Auf jeweiligen Beitragsanteil begrenzt'],
        helpText: 'Bei GbR gilt gesetzlich gesamtschuldnerische Haftung — hier abweichende Regelung möglich' },
      { name: 'duration', label: 'Laufzeit', type: 'select', placeholder: 'Wie lange läuft die Kooperation?', required: true, group: 'Laufzeit & Kündigung',
        options: ['Projektbezogen (endet mit Projekt)', '1 Jahr mit Verlängerungsoption', '2 Jahre mit Verlängerungsoption', '3 Jahre fest', 'Unbefristet'] },
      { name: 'termination', label: 'Kündigungsfrist', type: 'select', placeholder: 'Wie kann gekündigt werden?', required: true, group: 'Laufzeit & Kündigung',
        options: ['1 Monat zum Monatsende', '3 Monate zum Quartalsende', '6 Monate zum Jahresende', 'Nur aus wichtigem Grund'] },
      { name: 'ipRights', label: 'Geistiges Eigentum', type: 'select', placeholder: 'Wem gehören die Ergebnisse?', required: true, group: 'Rechte & Pflichten',
        options: ['Gemeinsames Eigentum (50/50)', 'Je nach Beitrag (anteilig)', 'Ersteller behält Rechte mit Nutzungslizenz', 'Vollständig an die Kooperation'] },
      { name: 'ipOnTermination', label: 'IP-Rechte bei Beendigung', type: 'select', placeholder: 'Was passiert mit Ergebnissen bei Ende?', required: false, group: 'Rechte & Pflichten',
        options: ['Gemeinsame Nutzung bleibt bestehen', 'Aufteilung nach Beitragsanteil', 'Rückfall an jeweiligen Ersteller', 'Verbleib beim federführenden Partner'],
        helpText: 'Wichtig: Ohne Regelung kann Streit um Ergebnisse entstehen' },
      { name: 'decisionMaking', label: 'Entscheidungsfindung', type: 'select', placeholder: 'Wie werden Entscheidungen getroffen?', required: false, group: 'Rechte & Pflichten',
        options: ['Einstimmig (beide müssen zustimmen)', 'Mehrheitsentscheidung', 'Federführung bei Partner A, Vetorecht Partner B', 'Aufteilung nach Zuständigkeitsbereichen'] },
      { name: 'confidentiality', label: 'Vertraulichkeit', type: 'select', placeholder: 'Geheimhaltungsgrad', required: true, group: 'Rechte & Pflichten',
        options: ['Standard-Vertraulichkeit', 'Erhöhte Vertraulichkeit (NDA-Level)', 'Streng vertraulich', 'Keine besonderen Anforderungen'] },
      { name: 'nonCompete', label: 'Wettbewerbsverbot', type: 'select', placeholder: 'Konkurrenzschutz?', required: true, group: 'Rechte & Pflichten',
        options: ['Kein Wettbewerbsverbot', 'Während der Laufzeit', 'Während + 6 Monate nach Ende', 'Während + 12 Monate nach Ende'] },
      { name: 'governingLaw', label: 'Anwendbares Recht', type: 'select', placeholder: 'Welches Recht gilt?', required: true, group: 'Rechtliches',
        options: ['Deutsches Recht', 'Österreichisches Recht', 'Schweizer Recht'] },
      { name: 'disputeResolution', label: 'Streitbeilegung', type: 'select', placeholder: 'Bei Konflikten?', required: true, group: 'Rechtliches',
        options: ['Ordentliches Gericht', 'Mediation vor Klage', 'Schiedsverfahren (ICC)', 'Schlichtungsstelle der IHK'] },
      { name: 'jurisdiction', label: 'Gerichtsstand', type: 'text', placeholder: 'z.B. Berlin, München, Hamburg', required: true, group: 'Rechtliches' }
    ]
  },
  {
    id: 'softwareVertrieb',
    name: 'SaaS & Software Reseller Vertrag',
    description: 'B2B Software-Vertrieb, Reselling & Partnerschaften',
    icon: '💻',
    jurisdiction: 'DE',
    category: 'Geschäftsbeziehung',
    estimatedDuration: '12-18 Minuten',
    popularity: 65,
    isNew: true,
    fields: [
      // === GRUPPE: Geschäftsmodell (Kern-Logiksteuerung) ===
      {
        name: 'distributionModel',
        label: 'Vertriebsmodell',
        type: 'select',
        placeholder: 'Wie vertreibt der Reseller die Software?',
        required: true,
        group: 'Geschäftsmodell',
        options: ['Reseller (Weiterverkauf im eigenen Namen)', 'Vermittler (Referral/Provision)', 'White-Label (eigene Marke des Resellers)', 'Sub-Distributor (Weitervertrieb an Partner)'],
        helpText: 'Bestimmt die gesamte Vertragslogik und Haftungsstruktur'
      },
      {
        name: 'softwareType',
        label: 'Art der Software',
        type: 'select',
        placeholder: 'Was wird vertrieben?',
        required: true,
        group: 'Geschäftsmodell',
        options: ['SaaS / Cloud-Lösung', 'On-Premise Software', 'Mobile App', 'API-Service / Platform', 'Hybrid (Cloud + On-Premise)']
      },
      {
        name: 'endCustomerRelation',
        label: 'Vertragsbeziehung zum Endkunden',
        type: 'select',
        placeholder: 'Wer ist Vertragspartner des Endkunden?',
        required: true,
        group: 'Geschäftsmodell',
        options: ['Reseller ist Vertragspartner (verkauft im eigenen Namen)', 'Hersteller ist Vertragspartner (Reseller vermittelt nur)', 'White-Label (Reseller tritt als Anbieter auf, Hersteller unsichtbar)', 'Dreiseitig (Hersteller + Reseller + Endkunde)'],
        helpText: 'ENTSCHEIDEND: Steuert Haftung, Support-Pflicht und Lizenzlogik'
      },
      {
        name: 'contractStructure',
        label: 'Vertragsstruktur',
        type: 'select',
        placeholder: 'Einzelvertrag oder modular mit Anlagen?',
        required: true,
        group: 'Geschäftsmodell',
        options: ['Einzelvertrag (kompakt, alles in einem Dokument)', 'Modular (Hauptvertrag + Anlage Leistungsbeschreibung + SLA + AVV)'],
        helpText: 'Modular = professioneller Standard bei Enterprise-Deals'
      },
      {
        name: 'exclusivity',
        label: 'Exklusivität',
        type: 'select',
        placeholder: 'Exklusiver oder nicht-exklusiver Vertrieb?',
        required: false,
        group: 'Geschäftsmodell',
        options: ['Nicht-exklusiv (Hersteller kann weitere Reseller ernennen)', 'Exklusiv im definierten Gebiet', 'Exklusiv für bestimmte Kundensegmente', 'Co-exklusiv (max. 2-3 Reseller im Gebiet)']
      },
      {
        name: 'territory',
        label: 'Vertriebsgebiet',
        type: 'text',
        placeholder: 'z.B. DACH-Region, Deutschland, EU, weltweit',
        required: false,
        group: 'Geschäftsmodell'
      },

      // === GRUPPE: Vertragsparteien ===
      {
        name: 'vendorName',
        label: 'Hersteller / Software-Anbieter (Name)',
        type: 'text',
        placeholder: 'Firma des Software-Herstellers',
        required: true,
        group: 'Vertragsparteien'
      },
      {
        name: 'vendorAddress',
        label: 'Adresse Hersteller',
        type: 'textarea',
        placeholder: 'Straße, PLZ, Ort',
        required: false,
        group: 'Vertragsparteien'
      },
      {
        name: 'resellerName',
        label: 'Reseller / Vertriebspartner (Name)',
        type: 'text',
        placeholder: 'Firma des Resellers / Vertriebspartners',
        required: true,
        group: 'Vertragsparteien'
      },
      {
        name: 'resellerAddress',
        label: 'Adresse Reseller',
        type: 'textarea',
        placeholder: 'Straße, PLZ, Ort',
        required: false,
        group: 'Vertragsparteien'
      },

      // === GRUPPE: Software & Lizenzen ===
      {
        name: 'softwareName',
        label: 'Software-Bezeichnung',
        type: 'text',
        placeholder: 'z.B. "CloudSuite Pro", "DataManager Enterprise"',
        required: true,
        group: 'Software & Lizenzen'
      },
      {
        name: 'softwareDescription',
        label: 'Leistungsbeschreibung der Software',
        type: 'textarea',
        placeholder: 'Kernfunktionen, Zielgruppe, technische Basis der Software...',
        required: false,
        group: 'Software & Lizenzen',
        helpText: 'Je detaillierter, desto präziser der Vertrag'
      },
      {
        name: 'licenseModel',
        label: 'Lizenzmodell',
        type: 'select',
        placeholder: 'Wie wird die Software lizenziert?',
        required: false,
        group: 'Software & Lizenzen',
        options: ['Subscription (monatlich/jährlich)', 'Einmallizenz (perpetual)', 'Pay-per-Use / nutzungsbasiert', 'Seat-basiert (pro Nutzer)', 'Volumen-Lizenz (Staffel)', 'Kombination (Basis + Usage)']
      },
      {
        name: 'sublicensing',
        label: 'Unterlizenzierung an Endkunden',
        type: 'select',
        placeholder: 'Darf der Reseller Unterlizenzen vergeben?',
        required: false,
        group: 'Software & Lizenzen',
        options: ['Ja, eigenständig an Endkunden', 'Ja, aber nur mit Genehmigung des Herstellers', 'Nein (Hersteller lizenziert direkt an Endkunden)', 'Automatisch via Reseller-Portal'],
        helpText: 'Kernfrage bei Reselling: Wer vergibt die Nutzungsrechte?'
      },
      {
        name: 'minimumCommitment',
        label: 'Mindestabnahme / Minimum Commitment',
        type: 'text',
        placeholder: 'z.B. "10 Lizenzen/Monat", "50.000€/Jahr", "Keine"',
        required: false,
        group: 'Software & Lizenzen'
      },

      // === GRUPPE: Vergütung & Konditionen ===
      {
        name: 'revenueModel',
        label: 'Vergütungsmodell',
        type: 'select',
        placeholder: 'Wie verdient der Reseller?',
        required: false,
        group: 'Vergütung & Konditionen',
        options: ['Marge auf Listenpreis (Einkauf günstiger, Verkauf zu UVP)', 'Provision auf vermittelte Umsätze (%)', 'Einkaufsrabatt (fester Discount)', 'Staffelrabatt (volumenabhängig)', 'Revenue Share (Umsatzbeteiligung)']
      },
      {
        name: 'revenueAmount',
        label: 'Vergütungshöhe',
        type: 'text',
        placeholder: 'z.B. "30% Marge", "20% Provision", "40% Rabatt auf Listenpreis"',
        required: false,
        group: 'Vergütung & Konditionen'
      },
      {
        name: 'billingCycle',
        label: 'Abrechnungszyklus',
        type: 'select',
        placeholder: 'Wie oft wird abgerechnet?',
        required: false,
        group: 'Vergütung & Konditionen',
        options: ['Monatlich', 'Quartalsweise', 'Jährlich', 'Bei jeder Lizenzaktivierung', 'Nach Zahlungseingang vom Endkunden']
      },
      {
        name: 'paymentTerms',
        label: 'Zahlungsbedingungen',
        type: 'select',
        placeholder: 'Zahlungsfrist',
        required: false,
        group: 'Vergütung & Konditionen',
        options: ['14 Tage netto', '30 Tage netto', '60 Tage netto', 'Vorkasse', 'Bei Lizenzaktivierung']
      },

      // === GRUPPE: Support & SLA ===
      {
        name: 'supportResponsibility',
        label: 'Support-Verantwortung',
        type: 'select',
        placeholder: 'Wer macht den Support für Endkunden?',
        required: false,
        group: 'Support & SLA',
        options: ['Komplett beim Hersteller', '1st-Level beim Reseller, 2nd/3rd beim Hersteller', 'Komplett beim Reseller', 'Aufgeteilt nach Vereinbarung'],
        helpText: 'Bei White-Label meist komplett beim Reseller'
      },
      {
        name: 'slaUptime',
        label: 'Verfügbarkeit (SLA)',
        type: 'select',
        placeholder: 'Garantierte Verfügbarkeit der Software',
        required: false,
        group: 'Support & SLA',
        options: ['99,9% (Enterprise-Standard)', '99,5% (Business-Standard)', '99,0% (Basic)', 'Keine Verfügbarkeitsgarantie', 'Best Effort']
      },
      {
        name: 'responseTime',
        label: 'Reaktionszeiten bei Störungen',
        type: 'select',
        placeholder: 'Wie schnell reagiert der Hersteller?',
        required: false,
        group: 'Support & SLA',
        options: ['Kritisch: 1h / Hoch: 4h / Normal: 8h', 'Kritisch: 4h / Hoch: 8h / Normal: 24h', 'Kritisch: 8h / Hoch: 24h / Normal: 48h', 'Nur während Geschäftszeiten (Mo-Fr 9-17)']
      },
      {
        name: 'downtimeLiability',
        label: 'Haftung bei Systemausfall',
        type: 'select',
        placeholder: 'Was passiert bei SLA-Verletzung?',
        required: false,
        group: 'Support & SLA',
        options: ['Service Credits (Gutschriften bei SLA-Verletzung)', 'Sonderkündigungsrecht bei wiederholtem Ausfall', 'Schadensersatz begrenzt auf Monatsvergütung', 'Keine Haftung für Ausfälle (nur Best Effort)', 'Kombination: Credits + Sonderkündigung bei >3 Ausfällen/Quartal'],
        helpText: 'Service Credits sind Enterprise-Standard und marktüblich'
      },
      {
        name: 'updatesUpgrades',
        label: 'Updates & Upgrades',
        type: 'select',
        placeholder: 'Sind Updates für Reseller/Endkunden inklusive?',
        required: false,
        group: 'Support & SLA',
        options: ['Alle Updates und Upgrades inklusive', 'Patches/Bugfixes inklusive, Major-Upgrades kostenpflichtig', 'Nur Sicherheitsupdates inklusive', 'Updates kostenpflichtig', 'Nach separater Wartungsvereinbarung']
      },

      // === GRUPPE: Datenschutz & Compliance ===
      {
        name: 'dataProcessing',
        label: 'Personenbezogene Daten',
        type: 'select',
        placeholder: 'Werden personenbezogene Daten verarbeitet?',
        required: false,
        group: 'Datenschutz & Compliance',
        options: ['Ja, AVV/DPA ist zwingend erforderlich', 'Nein, keine personenbezogenen Daten', 'Sicherheitshalber regeln (empfohlen)'],
        helpText: 'Bei SaaS mit Endkunden-Accounts fast immer "Ja"'
      },
      {
        name: 'dataLocation',
        label: 'Datenverarbeitungsort',
        type: 'select',
        placeholder: 'Wo werden Daten gespeichert/verarbeitet?',
        required: false,
        group: 'Datenschutz & Compliance',
        options: ['Nur Deutschland', 'EU/EWR', 'EU + USA (mit Angemessenheitsbeschluss)', 'Weltweit (mit Standardvertragsklauseln)', 'Nach Wahl des Kunden']
      },
      {
        name: 'auditRights',
        label: 'Audit-Rechte',
        type: 'select',
        placeholder: 'Darf der Reseller den Hersteller prüfen?',
        required: false,
        group: 'Datenschutz & Compliance',
        options: ['Jährliches Audit-Recht', 'Auf Anfrage mit 30 Tagen Vorlauf', 'Zertifikatsbasiert (ISO 27001 / SOC 2)', 'Kein Audit-Recht']
      },

      // === GRUPPE: Laufzeit & Kündigung ===
      {
        name: 'contractDuration',
        label: 'Vertragslaufzeit',
        type: 'select',
        placeholder: 'Wie lange läuft der Vertrag?',
        required: false,
        group: 'Laufzeit & Kündigung',
        options: ['1 Jahr mit automatischer Verlängerung', '2 Jahre mit automatischer Verlängerung', '3 Jahre fest', 'Unbefristet', 'Projektbezogen / befristet']
      },
      {
        name: 'terminationPeriod',
        label: 'Kündigungsfrist',
        type: 'select',
        placeholder: 'Wie kann gekündigt werden?',
        required: false,
        group: 'Laufzeit & Kündigung',
        options: ['3 Monate zum Vertragsende', '6 Monate zum Vertragsende', '1 Monat zum Monatsende', '90 Tage jederzeit', 'Nur aus wichtigem Grund']
      },
      {
        name: 'terminationEffects',
        label: 'Folgen bei Vertragsende',
        type: 'select',
        placeholder: 'Was passiert mit bestehenden Endkunden?',
        required: false,
        group: 'Laufzeit & Kündigung',
        options: ['Übergangsfrist 90 Tage (Endkunden-Migration)', 'Bestehende Endkunden-Lizenzen laufen bis Ablauf weiter', 'Sofortige Lizenzsperre für alle Endkunden', 'Hersteller übernimmt Endkunden direkt', 'Individuelle Regelung pro Endkunde'],
        helpText: 'Kritisch für Vertrauenswürdigkeit gegenüber Endkunden'
      },

      // === GRUPPE: Haftung & Rechte ===
      {
        name: 'generalLiability',
        label: 'Allgemeine Haftungsbegrenzung',
        type: 'select',
        placeholder: 'Wie wird die Haftung begrenzt?',
        required: false,
        group: 'Haftung & Rechte',
        options: ['Auf Jahresvergütung begrenzt', 'Auf doppelte Jahresvergütung begrenzt', 'Unbegrenzt bei Vorsatz/grober Fahrlässigkeit, sonst auf Jahresvergütung', 'Gesetzliche Haftung (keine Begrenzung)']
      },
      {
        name: 'brandUsage',
        label: 'Markennutzung',
        type: 'select',
        placeholder: 'Darf der Reseller die Marke des Herstellers nutzen?',
        required: false,
        group: 'Haftung & Rechte',
        options: ['Hersteller-Marke darf für Vertrieb genutzt werden', 'White-Label (Reseller nutzt eigene Marke)', 'Co-Branding (beide Marken sichtbar)', 'Keine Markennutzung (nur Produktname)']
      },
      {
        name: 'nonCompete',
        label: 'Wettbewerbsverbot',
        type: 'select',
        placeholder: 'Darf der Reseller Konkurrenzprodukte vertreiben?',
        required: false,
        group: 'Haftung & Rechte',
        options: ['Kein Wettbewerbsverbot', 'Keine direkten Konkurrenzprodukte während Laufzeit', 'Keine Konkurrenzprodukte + 6 Monate nach Ende', 'Nur Information an Hersteller (kein Verbot)']
      },
      {
        name: 'governingLaw',
        label: 'Anwendbares Recht',
        type: 'select',
        placeholder: 'Welches Recht gilt?',
        required: false,
        group: 'Haftung & Rechte',
        options: ['Deutsches Recht', 'Österreichisches Recht', 'Schweizer Recht']
      },
      {
        name: 'jurisdiction',
        label: 'Gerichtsstand',
        type: 'text',
        placeholder: 'z.B. Berlin, München, Hamburg',
        required: false,
        group: 'Haftung & Rechte'
      }
    ]
  },
  {
    id: 'softwareEndkunde',
    name: 'Software-Endkundenvertrag (Reseller-Schutz)',
    description: 'Drittsoftware weiterverkaufen & eigene Haftung begrenzen',
    icon: '🛡️',
    jurisdiction: 'DE',
    category: 'Geschäftsbeziehung',
    estimatedDuration: '8-12 Minuten',
    popularity: 70,
    isNew: true,
    fields: [
      // === GRUPPE: Vertragsparteien ===
      {
        name: 'providerName',
        label: 'Anbieter / Reseller (Ihr Firmenname)',
        type: 'text',
        placeholder: 'Ihre Firma (die die Software weiterverkauft)',
        required: true,
        group: 'Vertragsparteien',
        helpText: 'Sie als Wiederverkäufer der Software'
      },
      {
        name: 'providerAddress',
        label: 'Adresse Anbieter',
        type: 'textarea',
        placeholder: 'Straße, PLZ, Ort',
        required: false,
        group: 'Vertragsparteien'
      },
      {
        name: 'customerName',
        label: 'Kunde / Endkunde (Name)',
        type: 'text',
        placeholder: 'Firma des Kunden, an den Sie verkaufen',
        required: true,
        group: 'Vertragsparteien'
      },
      {
        name: 'customerAddress',
        label: 'Adresse Kunde',
        type: 'textarea',
        placeholder: 'Straße, PLZ, Ort',
        required: false,
        group: 'Vertragsparteien'
      },

      // === GRUPPE: Software & Hersteller ===
      {
        name: 'softwareName',
        label: 'Software-Bezeichnung',
        type: 'text',
        placeholder: 'z.B. "Salesforce", "HubSpot", "Jira"',
        required: true,
        group: 'Software & Hersteller'
      },
      {
        name: 'manufacturerName',
        label: 'Hersteller / Drittsoftware-Anbieter',
        type: 'text',
        placeholder: 'z.B. "Salesforce Inc., USA" oder "Atlassian Pty Ltd, Australien"',
        required: true,
        group: 'Software & Hersteller',
        helpText: 'Name und Land des eigentlichen Software-Herstellers'
      },
      {
        name: 'softwareType',
        label: 'Art der Bereitstellung',
        type: 'select',
        placeholder: 'Wie wird die Software bereitgestellt?',
        required: true,
        group: 'Software & Hersteller',
        options: ['SaaS / Cloud-Lösung', 'On-Premise Software (Installation beim Kunden)', 'Hybrid (Cloud + lokale Komponenten)', 'API-Service / Platform', 'Mobile App']
      },
      {
        name: 'softwareDescription',
        label: 'Kurzbeschreibung der Software',
        type: 'textarea',
        placeholder: 'Was macht die Software? Kernfunktionen...',
        required: false,
        group: 'Software & Hersteller'
      },

      // === GRUPPE: Eigene Leistungen vs. Fremdleistung (Optimierung 2) ===
      {
        name: 'ownServices',
        label: 'Erbringen Sie eigene Leistungen zusätzlich?',
        type: 'select',
        placeholder: 'Bieten Sie neben der Software eigene Services an?',
        required: true,
        group: 'Eigene Leistungen',
        options: ['Ja (z.B. Einrichtung, Beratung, Support, Integration)', 'Nein (reiner Weiterverkauf der Software)', 'Teilweise (nur initialer Setup/Onboarding)'],
        helpText: 'WICHTIG: Für eigene Leistungen haften Sie anders als für die Drittsoftware'
      },
      {
        name: 'ownServicesDescription',
        label: 'Welche eigenen Leistungen bieten Sie an?',
        type: 'textarea',
        placeholder: 'z.B. Einrichtung, Konfiguration, Schulung, laufender Support, Integration mit anderen Systemen...',
        required: false,
        group: 'Eigene Leistungen',
        helpText: 'Nur ausfüllen wenn Sie eigene Leistungen erbringen'
      },

      // === GRUPPE: Herstellerbedingungen (Optimierung 3) ===
      {
        name: 'manufacturerTerms',
        label: 'Geltung der Hersteller-AGB/Nutzungsbedingungen',
        type: 'select',
        placeholder: 'Wie werden die Bedingungen des Herstellers eingebunden?',
        required: false,
        group: 'Herstellerbedingungen',
        options: ['Hersteller-AGB gelten ergänzend zu diesem Vertrag', 'Hersteller-AGB haben Vorrang bei Widersprüchen', 'Kunde muss Hersteller-AGB separat akzeptieren', 'Hersteller-AGB werden als Anlage beigefügt', 'Keine direkte Einbindung (nur Verweis)'],
        helpText: 'Bei US-Software oft wichtig: Hersteller hat eigene Terms of Service'
      },
      {
        name: 'manufacturerTermsUrl',
        label: 'Link zu Hersteller-AGB (optional)',
        type: 'text',
        placeholder: 'z.B. https://www.hersteller.com/terms',
        required: false,
        group: 'Herstellerbedingungen'
      },

      // === GRUPPE: Haftung & Risiko (Herzstück!) ===
      {
        name: 'liabilityMode',
        label: 'Haftung für Softwarefehler/Ausfälle',
        type: 'select',
        placeholder: 'Wie weit haften Sie für Probleme der Drittsoftware?',
        required: false,
        group: 'Haftung & Risiko',
        options: ['Keine Haftung für Drittanbieter-Software (nur für eigene Leistungen)', 'Begrenzt auf typische, vorhersehbare Schäden', 'Nur bei Vorsatz und grober Fahrlässigkeit', 'Durchreichung der Herstellergewährleistung (sofern vorhanden)'],
        helpText: 'Empfehlung: "Keine Haftung für Drittsoftware" ist marktüblich bei Resellern'
      },
      {
        name: 'liabilityCap',
        label: 'Haftungsdeckel (Obergrenze)',
        type: 'select',
        placeholder: 'Maximale Haftungssumme',
        required: false,
        group: 'Haftung & Risiko',
        options: ['Auf monatliche Vergütung begrenzt', 'Auf Vergütung der letzten 12 Monate begrenzt', 'Auf jährliche Vergütung begrenzt', 'Individueller Betrag', 'Gesetzliche Haftung (keine Begrenzung)'],
        helpText: 'Standard: Vergütung der letzten 12 Monate'
      },
      {
        name: 'warrantyScope',
        label: 'Gewährleistung',
        type: 'select',
        placeholder: 'Wofür leisten Sie Gewähr?',
        required: false,
        group: 'Haftung & Risiko',
        options: ['Nur für eigene Leistungen (nicht für Drittsoftware)', 'Durchreichung der Herstellergewährleistung', 'Gesetzlich, aber auf 12 Monate verkürzt', 'Keine Gewährleistung (nur bei reinem Weiterverkauf)'],
        helpText: 'Für Drittsoftware ist Gewährleistungsausschluss marktüblich'
      },
      {
        name: 'slaLevel',
        label: 'Verfügbarkeit / SLA',
        type: 'select',
        placeholder: 'Garantieren Sie eine Verfügbarkeit?',
        required: false,
        group: 'Haftung & Risiko',
        options: ['Best Effort (keine eigene Garantie)', 'Im Rahmen der Hersteller-SLA (Durchreichung)', '99,5% mit Einschränkung auf Herstellerverantwortung', 'Eigene SLA für eigene Leistungen, Hersteller-SLA für Software'],
        helpText: 'Vorsicht: Keine Uptime garantieren die Sie nicht kontrollieren!'
      },

      // === GRUPPE: Vergütung ===
      {
        name: 'pricingModel',
        label: 'Preismodell',
        type: 'select',
        placeholder: 'Wie berechnen Sie dem Kunden?',
        required: false,
        group: 'Vergütung',
        options: ['Monatliche Lizenzgebühr', 'Jährliche Lizenzgebühr', 'Einmalzahlung', 'Pro Nutzer/Seat', 'Nutzungsbasiert (Pay-per-Use)', 'Paketpreis (Software + eigene Leistungen)']
      },
      {
        name: 'price',
        label: 'Preis / Vergütung',
        type: 'text',
        placeholder: 'z.B. "499€/Monat", "89€/Nutzer/Monat", "5.000€ einmalig"',
        required: false,
        group: 'Vergütung'
      },
      {
        name: 'paymentTerms',
        label: 'Zahlungsbedingungen',
        type: 'select',
        placeholder: 'Zahlungsfrist',
        required: false,
        group: 'Vergütung',
        options: ['14 Tage netto', '30 Tage netto', 'Vorkasse', 'Jährliche Vorauszahlung', 'Bei Bereitstellung']
      },

      // === GRUPPE: Laufzeit & Kündigung ===
      {
        name: 'contractDuration',
        label: 'Vertragslaufzeit',
        type: 'select',
        placeholder: 'Wie lange läuft der Vertrag?',
        required: false,
        group: 'Laufzeit & Kündigung',
        options: ['1 Jahr mit automatischer Verlängerung', '2 Jahre mit automatischer Verlängerung', 'Monatlich kündbar', 'Unbefristet', 'Projektbezogen / einmalig']
      },
      {
        name: 'terminationPeriod',
        label: 'Kündigungsfrist',
        type: 'select',
        placeholder: 'Wie kann gekündigt werden?',
        required: false,
        group: 'Laufzeit & Kündigung',
        options: ['1 Monat zum Monatsende', '3 Monate zum Vertragsende', '30 Tage jederzeit', 'Nur zum Laufzeitende', 'Sonderkündigung bei Herstellerausfall']
      },
      {
        name: 'terminationEffects',
        label: 'Was passiert bei Vertragsende?',
        type: 'select',
        placeholder: 'Zugang und Daten bei Beendigung',
        required: false,
        group: 'Laufzeit & Kündigung',
        options: ['Zugang wird gesperrt, Datenexport 30 Tage möglich', 'Sofortige Sperrung', 'Übergangsfrist 90 Tage', 'Daten werden nach 30 Tagen gelöscht', 'Kunde muss Daten selbst exportieren']
      },

      // === GRUPPE: Rechtliches ===
      {
        name: 'governingLaw',
        label: 'Anwendbares Recht',
        type: 'select',
        placeholder: 'Welches Recht gilt?',
        required: false,
        group: 'Rechtliches',
        options: ['Deutsches Recht', 'Österreichisches Recht', 'Schweizer Recht'],
        helpText: 'Empfehlung: Deutsches Recht (auch bei US-Software)'
      },
      {
        name: 'jurisdiction',
        label: 'Gerichtsstand',
        type: 'text',
        placeholder: 'z.B. München, Berlin, Hamburg',
        required: false,
        group: 'Rechtliches'
      }
    ]
  },
  {
    id: 'berater',
    name: 'Beratervertrag',
    description: 'Für Consulting und Beratungsleistungen',
    icon: '🎯',
    jurisdiction: 'DE',
    category: 'Dienstleistung',
    estimatedDuration: '8-12 Minuten',
    popularity: 60,
    isNew: true,
    fields: [
      { name: 'clientName', label: 'Auftraggeber (Name)', type: 'text', placeholder: 'Firma oder Privatperson', required: true, group: 'Vertragsparteien' },
      { name: 'clientAddress', label: 'Adresse Auftraggeber', type: 'textarea', placeholder: 'Straße, PLZ, Ort', required: true, group: 'Vertragsparteien' },
      { name: 'consultantName', label: 'Berater (Name)', type: 'text', placeholder: 'Name des Beraters / Beratungsunternehmen', required: true, group: 'Vertragsparteien' },
      { name: 'consultantAddress', label: 'Adresse Berater', type: 'textarea', placeholder: 'Straße, PLZ, Ort', required: true, group: 'Vertragsparteien' },
      { name: 'consultantQualification', label: 'Qualifikation / Fachgebiet', type: 'text', placeholder: 'z.B. Unternehmensberater, IT-Consultant, Steuerberater', required: false, group: 'Vertragsparteien', helpText: 'Stärkt die rechtliche Verbindlichkeit' },
      { name: 'consultantTaxId', label: 'USt-IdNr. / Steuer-ID Berater', type: 'text', placeholder: 'z.B. DE123456789', required: false, group: 'Vertragsparteien', helpText: 'Für korrekte Rechnungsstellung empfohlen' },
      { name: 'consultingScope', label: 'Beratungsgegenstand', type: 'textarea', placeholder: 'Detaillierte Beschreibung der Beratungsleistung...', required: true, group: 'Beratungsleistung' },
      { name: 'consultingType', label: 'Art der Beratung', type: 'select', placeholder: 'Welche Beratungsart?', required: true, group: 'Beratungsleistung',
        options: ['Strategieberatung', 'IT-Beratung / Digitalisierung', 'Finanz- und Steuerberatung', 'Personalberatung / HR', 'Marketing- und Vertriebsberatung', 'Rechtsberatung (nicht-anwaltlich)', 'Technische Beratung', 'Sonstige Fachberatung'] },
      { name: 'deliverables', label: 'Erwartete Ergebnisse / Deliverables', type: 'textarea', placeholder: 'z.B. Strategiepapier, Analysebericht, Handlungsempfehlungen...', required: true, group: 'Beratungsleistung' },
      { name: 'workMethod', label: 'Arbeitsweise', type: 'select', placeholder: 'Wie wird beraten?', required: true, group: 'Beratungsleistung',
        options: ['Vor-Ort beim Auftraggeber', 'Remote / Online', 'Hybrid (Vor-Ort + Remote)', 'Workshop-basiert', 'Projektbegleitend'] },
      { name: 'fee', label: 'Honorar', type: 'text', placeholder: 'z.B. 1.500€/Tag oder 150€/Stunde oder 25.000€ pauschal', required: true, group: 'Vergütung' },
      { name: 'feeModel', label: 'Honorarmodell', type: 'select', placeholder: 'Wie wird abgerechnet?', required: true, group: 'Vergütung',
        options: ['Tagessatz', 'Stundensatz', 'Pauschalhonorar', 'Erfolgshonorar', 'Retainer (monatlich)'] },
      { name: 'paymentTerms', label: 'Zahlungsbedingungen', type: 'select', placeholder: 'Zahlungsfrist?', required: true, group: 'Vergütung',
        options: ['14 Tage nach Rechnungsstellung', '30 Tage nach Rechnungsstellung', 'Monatliche Abrechnung', '50% Anzahlung, 50% nach Abschluss', 'Bei Projektabschluss'] },
      { name: 'expenses', label: 'Reise- und Nebenkosten', type: 'select', placeholder: 'Werden Reisekosten erstattet?', required: true, group: 'Vergütung',
        options: ['Im Honorar enthalten', 'Zusätzlich nach Nachweis', 'Pauschale pro Reisetag', 'Keine Nebenkosten'] },
      { name: 'startDate', label: 'Vertragsbeginn', type: 'date', placeholder: '', required: true, group: 'Laufzeit & Kündigung' },
      { name: 'duration', label: 'Vertragsdauer', type: 'select', placeholder: 'Wie lange?', required: true, group: 'Laufzeit & Kündigung',
        options: ['Projektbezogen (endet mit Abschluss)', '3 Monate', '6 Monate', '12 Monate', 'Unbefristet'] },
      { name: 'termination', label: 'Kündigungsfrist', type: 'select', placeholder: 'Wie kann gekündigt werden?', required: true, group: 'Laufzeit & Kündigung',
        options: ['2 Wochen zum Monatsende', '4 Wochen zum Monatsende', '3 Monate zum Quartalsende', 'Nur aus wichtigem Grund'] },
      { name: 'ipOwnership', label: 'Nutzungsrechte an Arbeitsergebnissen', type: 'select', placeholder: 'Wem gehören Berichte, Konzepte, Analysen?', required: true, group: 'Vertraulichkeit & Haftung',
        options: ['Vollständig an Auftraggeber', 'Berater behält Rechte, Auftraggeber erhält Nutzungslizenz', 'Gemeinsame Nutzungsrechte', 'Berater behält Rechte (nur Ergebnisse gehen über)'],
        helpText: 'Regelt wem Strategiepapiere, Analysen und Konzepte gehören' },
      { name: 'confidentiality', label: 'Vertraulichkeit', type: 'select', placeholder: 'Geheimhaltungsgrad?', required: true, group: 'Vertraulichkeit & Haftung',
        options: ['Standard-Vertraulichkeit', 'Erhöhte Vertraulichkeit (NDA-Level)', 'Streng vertraulich', 'Keine besonderen Anforderungen'] },
      { name: 'liability', label: 'Haftungsbegrenzung', type: 'select', placeholder: 'Haftungsobergrenze?', required: true, group: 'Vertraulichkeit & Haftung',
        options: ['Auf Honorarsumme begrenzt', 'Auf doppelte Honorarsumme begrenzt', 'Nur Vorsatz und grobe Fahrlässigkeit', 'Gesetzliche Haftung (unbegrenzt)'],
        helpText: 'Empfehlung: Haftung auf Honorarsumme begrenzen' },
      { name: 'insuranceRequired', label: 'Berufshaftpflicht', type: 'select', placeholder: 'Versicherungsnachweis nötig?', required: false, group: 'Vertraulichkeit & Haftung',
        options: ['Keine Anforderung', 'Berufshaftpflicht erforderlich', 'Vermögensschadenhaftpflicht erforderlich'],
        helpText: 'Schützt beide Seiten bei Beratungsfehlern' },
      { name: 'nonCompete', label: 'Wettbewerbsklausel', type: 'select', placeholder: 'Soll Berater für Konkurrenz arbeiten dürfen?', required: false, group: 'Vertraulichkeit & Haftung',
        options: ['Kein Wettbewerbsverbot', 'Während der Vertragslaufzeit', 'Während + 6 Monate nach Ende', 'Während + 12 Monate nach Ende'] },
      { name: 'governingLaw', label: 'Anwendbares Recht', type: 'select', placeholder: 'Welches Recht gilt?', required: true, group: 'Rechtliches',
        options: ['Deutsches Recht', 'Österreichisches Recht', 'Schweizer Recht'] },
      { name: 'jurisdiction', label: 'Gerichtsstand', type: 'text', placeholder: 'z.B. Berlin, München, Hamburg', required: true, group: 'Rechtliches' }
    ]
  },
  {
    id: 'individuell',
    name: 'Individueller Vertrag',
    description: 'Maßgeschneidert für Ihre Bedürfnisse',
    icon: '⚙️',
    jurisdiction: 'DE',
    category: 'Allgemein',
    estimatedDuration: '10-15 Minuten',
    popularity: 40,
    fields: [
      { name: 'partyAName', label: 'Partei A (Name)', type: 'text', placeholder: 'Name / Firma der ersten Vertragspartei', required: false, group: 'Vertragsparteien' },
      { name: 'partyAAddress', label: 'Adresse Partei A', type: 'textarea', placeholder: 'Straße, PLZ, Ort', required: false, group: 'Vertragsparteien' },
      { name: 'partyARole', label: 'Rolle Partei A', type: 'text', placeholder: 'z.B. Auftraggeber, Verkäufer, Vermieter...', required: false, group: 'Vertragsparteien', helpText: 'Wird im Vertrag als Bezeichnung verwendet' },
      { name: 'partyBName', label: 'Partei B (Name)', type: 'text', placeholder: 'Name / Firma der zweiten Vertragspartei', required: false, group: 'Vertragsparteien' },
      { name: 'partyBAddress', label: 'Adresse Partei B', type: 'textarea', placeholder: 'Straße, PLZ, Ort', required: false, group: 'Vertragsparteien' },
      { name: 'partyBRole', label: 'Rolle Partei B', type: 'text', placeholder: 'z.B. Auftragnehmer, Käufer, Mieter...', required: false, group: 'Vertragsparteien' },
      { name: 'subject', label: 'Vertragsgegenstand', type: 'textarea', placeholder: 'Was regelt dieser Vertrag? Beschreiben Sie den Kern der Vereinbarung...', required: false, group: 'Vertragsgegenstand' },
      { name: 'obligations', label: 'Leistungen und Pflichten', type: 'textarea', placeholder: 'Welche Leistungen werden erbracht? Welche Pflichten haben die Parteien?', required: false, group: 'Vertragsgegenstand' },
      { name: 'compensation', label: 'Vergütung / Gegenleistung', type: 'text', placeholder: 'z.B. 10.000€, monatlich 500€, oder tauschbasiert', required: false, group: 'Konditionen', helpText: 'Leer lassen falls keine Vergütung vorgesehen ist' },
      { name: 'duration', label: 'Laufzeit', type: 'select', placeholder: 'Wie lange gilt der Vertrag?', required: false, group: 'Konditionen',
        options: ['Einmalige Leistung', '3 Monate', '6 Monate', '1 Jahr', '2 Jahre', 'Unbefristet', 'Projektbezogen'] },
      { name: 'termination', label: 'Kündigungsfrist', type: 'select', placeholder: 'Wie kann gekündigt werden?', required: false, group: 'Konditionen',
        options: ['Nicht kündbar (einmalig)', '2 Wochen', '1 Monat zum Monatsende', '3 Monate zum Quartalsende', 'Nur aus wichtigem Grund'] },
      { name: 'confidentiality', label: 'Vertraulichkeit', type: 'select', placeholder: 'Geheimhaltung nötig?', required: false, group: 'Schutzklauseln',
        options: ['Keine besonderen Anforderungen', 'Standard-Vertraulichkeit', 'Erhöhte Vertraulichkeit (NDA-Level)', 'Streng vertraulich'] },
      { name: 'liability', label: 'Haftungsregelung', type: 'select', placeholder: 'Wie wird Haftung geregelt?', required: false, group: 'Schutzklauseln',
        options: ['Gesetzliche Haftung (Standard)', 'Auf Vertragswert begrenzt', 'Nur Vorsatz und grobe Fahrlässigkeit', 'Individuelle Regelung im Freitext unten'],
        helpText: 'Ohne Angabe gilt die gesetzliche Haftung' },
      { name: 'disputeResolution', label: 'Streitbeilegung', type: 'select', placeholder: 'Bei Konflikten?', required: false, group: 'Schutzklauseln',
        options: ['Ordentliches Gericht (Standard)', 'Mediation vor Klage', 'Schiedsverfahren', 'Schlichtungsstelle'] },
      { name: 'details', label: 'Weitere Details und Sonderwünsche', type: 'textarea', placeholder: 'Alle zusätzlichen Regelungen, Besonderheiten, Klauseln die der Vertrag enthalten soll...', required: false, group: 'Besonderes', helpText: 'Je detaillierter Ihre Angaben, desto besser das Ergebnis. Hier können Sie alles angeben, was in den obigen Feldern nicht abgedeckt wurde.' },
      { name: 'governingLaw', label: 'Anwendbares Recht', type: 'select', placeholder: 'Welches Recht gilt?', required: false, group: 'Rechtliches',
        options: ['Deutsches Recht', 'Österreichisches Recht', 'Schweizer Recht'] },
      { name: 'jurisdiction', label: 'Gerichtsstand', type: 'text', placeholder: 'z.B. Berlin, München, Hamburg', required: false, group: 'Rechtliches' }
    ]
  }
];

// CONTRACT TEMPLATES
const CONTRACT_TEMPLATES: ContractTemplate[] = [
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

// NOTE: Old TemplateLibrary Component removed - now using EnhancedTemplateLibrary

export default function Generate() {
  // Navigation
  const navigate = useNavigate();

  // Auth Context
  const { user, isLoading } = useAuth();

  // Real subscription check
  const isPremium = user?.subscriptionActive === true && (
    user?.subscriptionPlan === 'business' ||
    user?.subscriptionPlan === 'enterprise'
  );
  const userPlan = user?.subscriptionPlan || 'free';

  // State Management
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedType, setSelectedType] = useState<ContractType | null>(null);
  const [inputMode, setInputMode] = useState<'detailed' | 'guided'>('detailed');

  // Usage tracking for Business plan
  const [usageData, setUsageData] = useState<{
    contractsGenerated: number;
    monthlyLimit: number;
    resetDate: string;
  } | null>(null);
  const [formData, setFormData] = useState<FormDataType>({});
  const [contractText, setContractText] = useState<string>("");
  const [generatedHTML, setGeneratedHTML] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [saved, setSaved] = useState<boolean>(false);
  const [savedContractId, setSavedContractId] = useState<string | null>(null);
  const [contractS3Key, setContractS3Key] = useState<string | null>(null);
  const [showSignatureModal, setShowSignatureModal] = useState<boolean>(false);
  const [showPreview, setShowPreview] = useState<boolean>(false);

  // 📄 NEW: PDF Preview States
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState<boolean>(false);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false); // Sidebar für Vorlagen/Firmenprofil - startet geschlossen

  // Template Modal State
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState<boolean>(false);
  const [templateRefreshKey, setTemplateRefreshKey] = useState<number>(0);

  // 🔄 Contract Improvement States
  const [improvements, setImprovements] = useState<string>("");
  const [isImproving, setIsImproving] = useState<boolean>(false);
  const [showImprovementSection, setShowImprovementSection] = useState<boolean>(false);

  // 🔴 FIX 2: Loading State für PDF-Button
  const [isGeneratingPDF, setIsGeneratingPDF] = useState<boolean>(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  
  // Company Profile State
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(null);
  const [useCompanyProfile, setUseCompanyProfile] = useState<boolean>(false);
  
  // Design Variant State
  const [selectedDesignVariant, setSelectedDesignVariant] = useState<string>('executive');
  const [isChangingDesign, setIsChangingDesign] = useState<boolean>(false);
  const [designCarouselIndex, setDesignCarouselIndex] = useState<number>(0);
  const [showCustomDesignModal, setShowCustomDesignModal] = useState<boolean>(false);

  // Custom Design State
  const [customDesign, setCustomDesign] = useState({
    primaryColor: '#0B1324',
    secondaryColor: '#1A2540',
    accentColor: '#3B82F6',
    fontFamily: 'Helvetica',
    layout: 'classic-centered'
  });

  // All available designs
  const allDesigns = [
    { id: 'executive', name: 'Executive', color: '#0B1324', desc: 'Klassisch' },
    { id: 'modern', name: 'Modern', color: '#3B82F6', desc: 'Dynamisch' },
    { id: 'minimal', name: 'Minimal', color: '#6B7280', desc: 'Schlicht' },
    { id: 'elegant', name: 'Elegant', color: '#D4AF37', desc: 'Luxuriös' },
    { id: 'corporate', name: 'Corporate', color: '#003366', desc: 'Formell' },
    { id: 'professional', name: 'Professional', color: '#1B4332', desc: 'Seriös' },
    { id: 'startup', name: 'Startup', color: '#E63946', desc: 'Jung' },
    { id: 'legal', name: 'Legal', color: '#800020', desc: 'Juristisch' },
    { id: 'tech', name: 'Tech', color: '#0891B2', desc: 'Digital' },
    { id: 'finance', name: 'Finance', color: '#0F172A', desc: 'Premium' },
    { id: 'creative', name: 'Creative', color: '#7C3AED', desc: 'Kreativ' }
  ];
  const VISIBLE_DESIGNS = 5;

  // Font options for custom design
  const fontOptions = [
    { id: 'Helvetica', name: 'Helvetica', desc: 'Modern & Klar' },
    { id: 'Times-Roman', name: 'Times Roman', desc: 'Klassisch' },
    { id: 'Courier', name: 'Courier', desc: 'Mono / Tech' }
  ];

  // Layout options for custom design
  const layoutOptions = [
    { id: 'classic-centered', name: 'Klassisch', desc: 'Zentriert' },
    { id: 'sidebar-accent', name: 'Modern', desc: 'Sidebar-Akzent' },
    { id: 'whitespace-focus', name: 'Minimal', desc: 'Viel Weißraum' },
    { id: 'structured-boxes', name: 'Corporate', desc: 'Strukturiert' },
    { id: 'ornamental', name: 'Elegant', desc: 'Dekorativ' }
  ];

  // 📂 Accordion State für Step 2 Feldgruppen
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // 💾 Autosave State
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isRestored, setIsRestored] = useState<boolean>(false);

  // 📂 Draft Dialog State
  const [showDraftDialog, setShowDraftDialog] = useState<boolean>(false);
  const [pendingDraft, setPendingDraft] = useState<{
    selectedTypeId: string;
    formData: FormDataType;
    currentStep: number;
    savedAt: string;
    // 📄 NEU: Zusätzliche Felder für Step 3 Wiederherstellung
    contractText?: string;
    savedContractId?: string | null;
    contractData?: any;
    generatedHTML?: string;
  } | null>(null);

  // 📋 Vorschau State
  const [showInputPreview, setShowInputPreview] = useState<boolean>(false);

  // Contract Data State
  const [contractData, setContractData] = useState<any>({
    contractType: '',
    parties: {},
    contractDetails: {}
  });

  // 👥 NEW: Editable Party Data States
  const [buyerName, setBuyerName] = useState<string>('');
  const [buyerAddress, setBuyerAddress] = useState<string>('');
  const [buyerCity, setBuyerCity] = useState<string>('');

  // 📎 Attachment States für Anlagen
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isDraggingAttachment, setIsDraggingAttachment] = useState<boolean>(false);
  const [isDownloadingAttachments, setIsDownloadingAttachments] = useState<boolean>(false);

  // 📄 Manuelle Seitenumbrüche
  const [pageBreaks, setPageBreaks] = useState<number[]>([]);
  const [showPageBreaks, setShowPageBreaks] = useState(false);

  // Refs
  // const contractRef = useRef<HTMLDivElement>(null); // ❌ Not used anymore (replaced with textarea)

  // Load Company Profile and Usage Data on mount
  useEffect(() => {
    if (isPremium && !isLoading && user) {
      loadCompanyProfile();
    }
    if (userPlan === 'business' && !isLoading && user) {
      loadUsageData();
    }
  }, [isPremium, userPlan, isLoading, user]);

  // Check if user has dismissed the company profile tip
  const [tipDismissed, setTipDismissed] = useState(() => {
    return localStorage.getItem('companyProfileTipDismissed') === 'true';
  });

  // Should show company profile tip?
  const shouldShowProfileTip = userPlan !== 'free' && !companyProfile && !tipDismissed;

  // Sektionen aus contractText parsen (für Seitenumbruch-UI)
  const parsedSections = useMemo(() => {
    if (!contractText) return [];
    const result: { index: number; title: string }[] = [];
    let sectionIndex = 0;
    let skipParties = false;
    for (const line of contractText.split('\n')) {
      const trimmed = line.trim().replace(/\*\*/g, '');
      if (!trimmed) continue;
      if (trimmed.toLowerCase() === 'zwischen') { skipParties = true; continue; }
      if (skipParties && (trimmed.toUpperCase() === 'PRÄAMBEL' || trimmed.startsWith('§'))) { skipParties = false; }
      if (skipParties) continue;
      if (trimmed === trimmed.toUpperCase() && trimmed.length > 5 &&
          !trimmed.startsWith('§') && !['PRÄAMBEL', 'ZWISCHEN', 'UND', 'ANLAGEN'].includes(trimmed)) continue;
      if (/^PRÄAMBEL$/i.test(trimmed)) {
        result.push({ index: sectionIndex++, title: 'Präambel' });
      } else if (trimmed.startsWith('§')) {
        result.push({ index: sectionIndex++, title: trimmed });
      }
    }
    return result;
  }, [contractText]);

  // Prüft ob der Firmenname ein Platzhalter ist (z.B. "TEST")
  const isValidCompanyProfile = (profile: any): boolean => {
    if (!profile?.companyName) return false;
    const name = profile.companyName.trim().toLowerCase();
    if (name.length < 3) return false;
    const placeholders = ['test', 'testing', 'testfirma', 'firma', 'meine firma', 'my company', 'company', 'example', 'beispiel', 'name', 'firmenname', 'xxx', 'abc', 'asdf', 'platzhalter'];
    return !placeholders.includes(name);
  };

  // Auto-activate company profile when initially loaded (only once)
  // Nur aktivieren wenn ein echter Firmenname vorhanden ist (nicht "TEST" etc.)
  useEffect(() => {
    if (companyProfile && isValidCompanyProfile(companyProfile)) {
      setUseCompanyProfile(true);
      console.log('✅ Company Profile initial aktiviert');
    } else if (companyProfile) {
      setUseCompanyProfile(false);
      console.log('⚠️ Company Profile hat Platzhalter-Namen, nicht aktiviert:', companyProfile.companyName);
    }
  }, [companyProfile]); // Only depend on companyProfile, not useCompanyProfile!

  // Clean up localStorage on component mount
  useEffect(() => {
    // Clean old contract IDs from localStorage to prevent conflicts
    localStorage.removeItem('lastGeneratedContractId');
  }, []);

  // 💾 AUTOSAVE: Check for saved draft on mount and show dialog
  useEffect(() => {
    const savedData = localStorage.getItem('contract_generator_draft');
    if (savedData && !isRestored) {
      try {
        const parsed = JSON.parse(savedData);
        const savedTime = new Date(parsed.savedAt);
        const now = new Date();
        const hoursDiff = (now.getTime() - savedTime.getTime()) / (1000 * 60 * 60);

        // Nur Dialog zeigen wenn weniger als 24 Stunden alt
        if (hoursDiff < 24 && parsed.formData && Object.keys(parsed.formData).length > 0) {
          // Finde den passenden ContractType
          if (parsed.selectedTypeId) {
            const type = CONTRACT_TYPES.find(t => t.id === parsed.selectedTypeId);
            if (type) {
              // Statt automatisch zu laden, Dialog anzeigen
              setPendingDraft(parsed);
              setShowDraftDialog(true);
            }
          }
        } else {
          // Alte Daten löschen
          localStorage.removeItem('contract_generator_draft');
        }
      } catch (e) {
        console.error('Fehler beim Laden des Entwurfs:', e);
        localStorage.removeItem('contract_generator_draft');
      }
    }
  }, []);

  // 📂 Entwurf weiter bearbeiten
  const handleContinueDraft = () => {
    if (pendingDraft) {
      const type = CONTRACT_TYPES.find(t => t.id === pendingDraft.selectedTypeId);
      if (type) {
        setSelectedType(type);
        setFormData(pendingDraft.formData);
        setCurrentStep(pendingDraft.currentStep || 2);
        setIsRestored(true);
        setLastSaved(new Date(pendingDraft.savedAt));

        // 📄 NEU: Vertragstext und ID für Step 3 Wiederherstellung
        if (pendingDraft.contractText) {
          setContractText(pendingDraft.contractText);
        }
        if (pendingDraft.savedContractId) {
          setSavedContractId(pendingDraft.savedContractId);
          setSaved(true);
        }
        if (pendingDraft.contractData) {
          setContractData(pendingDraft.contractData);
        }
        if (pendingDraft.generatedHTML) {
          setGeneratedHTML(pendingDraft.generatedHTML);
        }

        toast.success('Entwurf wiederhergestellt');
      }
    }
    setShowDraftDialog(false);
    setPendingDraft(null);
  };

  // 📂 Neu beginnen (Entwurf löschen)
  const handleDiscardDraft = () => {
    localStorage.removeItem('contract_generator_draft');
    setPendingDraft(null);
    setShowDraftDialog(false);
    toast.info('Neuer Vertrag gestartet');
  };

  // 💾 AUTOSAVE: Save data on changes (debounced)
  useEffect(() => {
    if (!selectedType || Object.keys(formData).length === 0) return;

    const saveTimer = setTimeout(() => {
      const dataToSave = {
        selectedTypeId: selectedType.id,
        formData,
        currentStep,
        savedAt: new Date().toISOString(),
        // 📄 NEU: Vertragstext und ID für Step 3 Wiederherstellung
        contractText: contractText || '',
        savedContractId: savedContractId || null,
        contractData: contractData || null,
        generatedHTML: generatedHTML || ''
      };
      localStorage.setItem('contract_generator_draft', JSON.stringify(dataToSave));
      setLastSaved(new Date());
    }, 1000); // Speichere nach 1 Sekunde Inaktivität

    return () => clearTimeout(saveTimer);
  }, [formData, selectedType, currentStep, contractText, savedContractId, contractData, generatedHTML]);

  // 💾 Clear draft when contract is generated
  const clearDraft = () => {
    localStorage.removeItem('contract_generator_draft');
    setLastSaved(null);
  };

  // 👥 Load buyer data from contractData.parties
  useEffect(() => {
    if (contractData.parties) {
      setBuyerName(contractData.parties.buyer || contractData.parties.buyerName || '');
      setBuyerAddress(contractData.parties.buyerAddress || '');
      setBuyerCity(contractData.parties.buyerCity || '');
    }
  }, [contractData.parties]);

  // 📄 Auto-load PDF preview when Step 3 is reached
  useEffect(() => {
    if (currentStep === 3 && contractText && !pdfPreviewUrl && !isGeneratingPreview) {
      console.log('✅ Step 3 reached - auto-loading PDF preview');
      // ⏳ Bei wiederhergestelltem Draft mit savedContractId: PDF existiert bereits → sofort laden
      // ⏳ Bei neuem Vertrag: Warte 8 Sekunden damit Auto-PDF im Backend sicher fertig wird
      const waitTime = savedContractId ? 500 : 8000;
      console.log(`⏳ Warte ${waitTime}ms auf PDF (${savedContractId ? 'Draft wiederhergestellt' : 'neuer Vertrag'})...`);
      const timer = setTimeout(() => {
        generatePDFPreview();
      }, waitTime);
      return () => clearTimeout(timer);
    }
  }, [currentStep, contractText, savedContractId]);

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

  const loadUsageData = async () => {
    try {
      // For now, use localStorage simulation
      // TODO: Replace with actual API call when backend supports it
      const now = new Date();
      const currentMonth = `${now.getFullYear()}-${now.getMonth() + 1}`;
      const storageKey = `contract_generation_${user?.email}_${currentMonth}`;

      const stored = localStorage.getItem(storageKey);
      const contractsGenerated = stored ? parseInt(stored) : 0;

      // Calculate next month reset date
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

      setUsageData({
        contractsGenerated,
        monthlyLimit: 10,
        resetDate: nextMonth.toLocaleDateString('de-DE')
      });

      console.log('✅ Usage Data geladen:', { contractsGenerated, limit: 10 });
    } catch (error) {
      console.error('❌ Fehler beim Laden der Usage-Daten:', error);
    }
  };

  const handleTemplateSelect = (template: ContractTemplate | UserTemplate, isUserTemplate: boolean = false) => {
    if (isUserTemplate) {
      // User Template
      const userTemplate = template as UserTemplate;
      setFormData((prev: FormDataType) => ({
        ...prev,
        ...userTemplate.defaultValues,
        title: `${userTemplate.name} - ${new Date().toLocaleDateString()}`
      }));
    } else {
      // System Template
      const systemTemplate = template as ContractTemplate;
      setFormData((prev: FormDataType) => ({
        ...prev,
        ...systemTemplate.prefilled,
        title: `${systemTemplate.name} - ${new Date().toLocaleDateString()}`
      }));
    }
    // Template wurde geladen - Sidebar bleibt offen, User kann weitere wählen
  };

  const handleCreateTemplate = async (templateData: TemplateFormData) => {
    try {
      await createUserTemplate(templateData);
      toast.success(`✅ Vorlage "${templateData.name}" erstellt`);
      // Refresh template library to show new template
      setTemplateRefreshKey(prev => prev + 1);
    } catch (error: any) {
      toast.error(error.message || 'Fehler beim Erstellen der Vorlage');
      throw error; // Re-throw so modal knows about the error
    }
  };

  const toggleCompanyProfile = (enabled: boolean) => {
    if (enabled && companyProfile && !isValidCompanyProfile(companyProfile)) {
      toast.error('Bitte füllen Sie zuerst Ihr Firmenprofil mit einem echten Firmennamen aus.');
      return;
    }
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

  // 🔍 VALIDIERUNG: Spezifische Validierungsfunktionen
  const validateIBAN = (iban: string): boolean => {
    // Entferne Leerzeichen
    const cleaned = iban.replace(/\s/g, '').toUpperCase();
    // Deutsche IBAN: DE + 2 Prüfziffern + 18 Ziffern = 22 Zeichen
    if (!/^DE\d{20}$/.test(cleaned)) return false;
    // IBAN Prüfsummen-Validierung (vereinfacht)
    return cleaned.length === 22;
  };

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone: string): boolean => {
    // Deutsche Telefonnummer (flexibel)
    const cleaned = phone.replace(/[\s\-/()]/g, '');
    return /^(\+49|0049|0)?[1-9]\d{6,14}$/.test(cleaned);
  };

  const validateVAT = (vat: string): boolean => {
    // Deutsche USt-IdNr.: DE + 9 Ziffern
    const cleaned = vat.replace(/\s/g, '').toUpperCase();
    return /^DE\d{9}$/.test(cleaned);
  };

  const validateDate = (date: string): boolean => {
    if (!date) return false;
    const parsed = new Date(date);
    return !isNaN(parsed.getTime());
  };

  const validateField = (field: ContractType['fields'][0], value: string): boolean => {
    if (!value || value.trim() === '') return true; // Leere Felder nicht validieren (required wird separat geprüft)

    // Typ-spezifische Validierung
    switch (field.type) {
      case 'email':
        return validateEmail(value);
      case 'phone':
        return validatePhone(value);
      case 'iban':
        return validateIBAN(value);
      case 'vat':
        return validateVAT(value);
      case 'date':
        return validateDate(value);
      default:
        break;
    }

    // Custom Pattern Validierung
    if (field.validation?.pattern) {
      const regex = new RegExp(field.validation.pattern);
      if (!regex.test(value)) return false;
    }

    if (field.validation?.min && value.length < field.validation.min) return false;
    if (field.validation?.max && value.length > field.validation.max) return false;

    return true;
  };

  // 🔍 Validierungsnachricht für Feld
  const getValidationMessage = (field: ContractType['fields'][0]): string => {
    switch (field.type) {
      case 'email':
        return 'Bitte gültige E-Mail eingeben';
      case 'phone':
        return 'Bitte gültige Telefonnummer eingeben';
      case 'iban':
        return 'Bitte gültige IBAN eingeben (DE + 20 Ziffern)';
      case 'vat':
        return 'Bitte gültige USt-IdNr. eingeben (DE + 9 Ziffern)';
      case 'date':
        return 'Bitte gültiges Datum eingeben';
      default:
        return field.validation?.message || 'Ungültige Eingabe';
    }
  };

  const handleInputChange = (name: string, value: string) => {
    setFormData(prev => {
      const newFormData = { ...prev, [name]: value };

      // 🔄 Auto-Expand: Prüfe ob aktuelle Gruppe vollständig ist und öffne die nächste
      if (selectedType && value.trim() !== '') {
        // Finde die Gruppe des geänderten Feldes
        const changedField = selectedType.fields.find(f => f.name === name);
        if (changedField) {
          const currentGroup = changedField.group || 'Allgemeine Angaben';

          // Gruppiere alle Felder
          const groupedFields = selectedType.fields.reduce((groups, field) => {
            const group = field.group || 'Allgemeine Angaben';
            if (!groups[group]) groups[group] = [];
            groups[group].push(field);
            return groups;
          }, {} as Record<string, typeof selectedType.fields>);

          const groupNames = Object.keys(groupedFields);
          const currentGroupIndex = groupNames.indexOf(currentGroup);

          // Prüfe ob alle Pflichtfelder der aktuellen Gruppe ausgefüllt sind
          const currentGroupFields = groupedFields[currentGroup];
          const visibleRequiredFields = currentGroupFields.filter(f =>
            f.required && shouldShowField(f)
          );

          const allRequiredFilled = visibleRequiredFields.every(f => {
            const fieldValue = f.name === name ? value : newFormData[f.name];
            return fieldValue && fieldValue.toString().trim() !== '';
          });

          // Wenn alle Pflichtfelder ausgefüllt, öffne die nächste Gruppe
          if (allRequiredFilled && currentGroupIndex < groupNames.length - 1) {
            const nextGroup = groupNames[currentGroupIndex + 1];
            setTimeout(() => {
              setExpandedGroups(prev => {
                const newSet = new Set(prev);
                newSet.add(nextGroup);
                return newSet;
              });
            }, 300); // Kurze Verzögerung für smoothe Animation
          }
        }
      }

      return newFormData;
    });
  };

  // 📂 Accordion Toggle für Feldgruppen
  const toggleGroup = (groupName: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupName)) {
        newSet.delete(groupName);
      } else {
        newSet.add(groupName);
      }
      return newSet;
    });
  };

  // ⌨️ TASTATUR-NAVIGATION: Enter springt zum nächsten Feld, Tab + Enter am letzten Feld öffnet nächste Gruppe
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>, fieldName: string) => {
    if (e.key === 'Enter' && !e.shiftKey && e.currentTarget.tagName !== 'TEXTAREA') {
      e.preventDefault();

      if (!selectedType) return;

      // Alle sichtbaren Felder in Reihenfolge
      const visibleFields = selectedType.fields.filter(f => shouldShowField(f));
      const currentIndex = visibleFields.findIndex(f => f.name === fieldName);

      if (currentIndex < visibleFields.length - 1) {
        // Springe zum nächsten Feld
        const nextField = visibleFields[currentIndex + 1];
        const nextElement = document.getElementById(nextField.name);
        if (nextElement) {
          nextElement.focus();
        }
      } else {
        // Letztes Feld - versuche Generieren wenn möglich
        if (isStepComplete(2) && !loading) {
          handleGenerate();
        }
      }
    }
  };

  // 🔗 Prüfe ob ein Feld basierend auf dependsOn angezeigt werden soll
  const shouldShowField = (field: ContractType['fields'][number]): boolean => {
    if (!field.dependsOn) return true;

    // Format: "fieldName:value" oder "fieldName:!value" (negiert)
    const [depFieldName, depCondition] = field.dependsOn.split(':');
    const isNegated = depCondition.startsWith('!');
    const expectedValue = isNegated ? depCondition.slice(1) : depCondition;
    const actualValue = formData[depFieldName] || '';

    if (isNegated) {
      return actualValue !== expectedValue;
    }
    return actualValue === expectedValue;
  };

  // 📊 Berechne Fortschritt pro Gruppe (nur sichtbare Felder)
  const getGroupProgress = (fields: ContractType['fields']) => {
    // Nur sichtbare Felder berücksichtigen
    const visibleFields = fields.filter(f => shouldShowField(f));
    const requiredFields = visibleFields.filter(f => f.required);
    const filledRequired = requiredFields.filter(f => formData[f.name] && formData[f.name]!.toString().trim() !== '');
    const optionalFields = visibleFields.filter(f => !f.required);
    const filledOptional = optionalFields.filter(f => formData[f.name] && formData[f.name]!.toString().trim() !== '');

    return {
      required: requiredFields.length,
      filledRequired: filledRequired.length,
      optional: optionalFields.length,
      filledOptional: filledOptional.length,
      total: fields.length,
      filled: filledRequired.length + filledOptional.length,
      isComplete: requiredFields.length > 0
        ? filledRequired.length === requiredFields.length
        : filledOptional.length > 0
    };
  };

  // 📂 Initialisiere erste Gruppe als offen wenn Vertragstyp gewählt wird
  const initializeAccordion = (type: ContractType) => {
    const groupedFields = type.fields.reduce((groups, field) => {
      const group = field.group || 'Allgemeine Angaben';
      if (!groups[group]) groups[group] = [];
      groups[group].push(field);
      return groups;
    }, {} as Record<string, ContractType['fields']>);

    const firstGroup = Object.keys(groupedFields)[0];
    if (firstGroup) {
      setExpandedGroups(new Set([firstGroup]));
    }
  };

  const handleTypeSelect = (type: ContractType) => {
    setSelectedType(type);
    setContractData((prev: any) => ({
      ...prev,
      contractType: type.name,
      parties: formData,
      contractDetails: formData
    }));
    const initialData: FormDataType = { title: `${type.name} - ${new Date().toLocaleDateString()}` };
    
    if (useCompanyProfile && companyProfile && isValidCompanyProfile(companyProfile)) {
      // 🏢 Vollständige Firmendaten aus Profil
      const companyFullName = `${companyProfile.companyName}${companyProfile.legalForm ? ` (${companyProfile.legalForm})` : ''}`;
      const companyFullAddress = `${companyProfile.street}\n${companyProfile.postalCode} ${companyProfile.city}${companyProfile.country && companyProfile.country !== 'Deutschland' ? `\n${companyProfile.country}` : ''}`;

      // 📧 Kontaktdaten
      const companyEmail = companyProfile.contactEmail || '';
      const companyPhone = companyProfile.contactPhone || '';

      // 🏦 Bankdaten
      const companyIBAN = companyProfile.iban || '';
      const companyBIC = companyProfile.bic || '';
      const companyBank = companyProfile.bankName || '';

      // 📋 Steuer & Handelsregister
      const companyVatId = companyProfile.vatId || '';
      const companyTradeRegister = companyProfile.tradeRegister || '';

      switch (type.id) {
        case 'freelancer':
          // Als Auftraggeber: Firma = Auftraggeber
          initialData.nameClient = companyFullName;
          initialData.clientAddress = companyFullAddress;
          break;

        case 'arbeitsvertrag':
          // Als Arbeitgeber: Firma = Arbeitgeber
          initialData.employer = companyFullName;
          initialData.employerAddress = companyFullAddress;
          break;

        case 'mietvertrag':
          // Als Vermieter: Firma = Vermieter
          initialData.landlord = companyFullName;
          initialData.landlordAddress = companyFullAddress;
          break;

        case 'kaufvertrag':
          // Als Verkäufer: Firma = Verkäufer
          initialData.seller = companyFullName;
          initialData.sellerAddress = companyFullAddress;
          initialData.sellerType = 'Unternehmen'; // Automatisch setzen
          break;

        case 'nda':
          // Als Partei A: Firma = erste Vertragspartei
          initialData.partyA = companyFullName;
          initialData.partyAAddress = companyFullAddress;
          break;

        case 'gesellschaftsvertrag':
          // Gesellschafter mit vollständigen Daten
          initialData.partners = `${companyFullName}\n${companyFullAddress}`;
          break;

        case 'darlehensvertrag':
          // Als Darlehensgeber: Firma = Kreditgeber
          initialData.lender = companyFullName;
          initialData.lenderAddress = companyFullAddress;
          if (companyIBAN) initialData.lenderIBAN = companyIBAN;
          if (companyBank) initialData.lenderBank = companyBank;
          break;

        case 'lizenzvertrag':
          // Als Lizenzgeber: Firma = Lizenzgeber
          initialData.licensor = companyFullName;
          initialData.licensorAddress = companyFullAddress;
          break;

        case 'pachtvertrag':
          // Als Verpächter: Firma = Verpächter
          initialData.lessor = companyFullName;
          initialData.lessorAddress = companyFullAddress;
          break;

        case 'aufhebungsvertrag':
          // Als Arbeitgeber bei Aufhebung
          initialData.employer = companyFullName;
          initialData.employerAddress = companyFullAddress;
          break;

        case 'dienstleistungsvertrag':
          // Als Auftragnehmer/Dienstleister
          initialData.provider = companyFullName;
          initialData.providerAddress = companyFullAddress;
          if (companyVatId) initialData.providerVatId = companyVatId;
          if (companyIBAN) initialData.providerIBAN = companyIBAN;
          break;

        case 'werkvertrag':
          // Als Auftragnehmer/Werkunternehmer
          initialData.contractor = companyFullName;
          initialData.contractorAddress = companyFullAddress;
          break;

        case 'kooperationsvertrag':
          // Als erste Kooperationspartei
          initialData.partyA = companyFullName;
          initialData.partyAAddress = companyFullAddress;
          break;

        case 'beratervertrag':
          // Als Berater/Beratungsunternehmen
          initialData.consultant = companyFullName;
          initialData.consultantAddress = companyFullAddress;
          if (companyVatId) initialData.consultantVatId = companyVatId;
          break;

        case 'handelsvertretervertrag':
          // Als Unternehmen, das Handelsvertreter beauftragt
          initialData.principal = companyFullName;
          initialData.principalAddress = companyFullAddress;
          break;

        case 'agenturvertrag':
          // Als Agentur
          initialData.agency = companyFullName;
          initialData.agencyAddress = companyFullAddress;
          break;

        case 'rahmenvertrag':
          // Als Auftraggeber im Rahmenvertrag
          initialData.client = companyFullName;
          initialData.clientAddress = companyFullAddress;
          break;
      }

      // 🔄 Generische Felder die bei vielen Vertragstypen vorkommen könnten
      // Diese werden nur gesetzt, wenn das Feld existiert und noch nicht befüllt ist
      const genericMappings: Record<string, string> = {
        // Kontaktdaten (wenn Firma = Auftraggeber/Ersteller)
        'companyName': companyFullName,
        'company': companyFullName,
        'firmName': companyFullName,
        'businessName': companyFullName,
        // Adressen
        'companyAddress': companyFullAddress,
        'businessAddress': companyFullAddress,
        // Kontakt
        'companyEmail': companyEmail,
        'businessEmail': companyEmail,
        'companyPhone': companyPhone,
        'businessPhone': companyPhone,
        // Bankdaten
        'companyIBAN': companyIBAN,
        'companyBIC': companyBIC,
        'companyBankName': companyBank,
        // Steuer
        'companyVatId': companyVatId,
        'vatNumber': companyVatId,
        'taxId': companyVatId,
        'tradeRegister': companyTradeRegister,
        'handelsregister': companyTradeRegister,
      };

      // Prüfe ob das aktuelle Vertragsformular generische Felder hat
      type.fields.forEach(field => {
        if (genericMappings[field.name] && !initialData[field.name]) {
          initialData[field.name] = genericMappings[field.name];
        }
      });
    }
    
    setFormData(initialData);
    setCurrentStep(2);
    // Modal bleibt geschlossen - User öffnet es selbst über "Vorlagen" Button
    initializeAccordion(type); // 📂 Öffne erste Gruppe automatisch
  };

  const isStepComplete = (step: number): boolean => {
    switch (step) {
      case 1: return selectedType !== null;
      case 2: {
        if (!selectedType) return false;
        const requiredFields = selectedType.fields.filter(f => f.required);
        if (requiredFields.length === 0) {
          return selectedType.fields.some(field =>
            formData[field.name] && formData[field.name]!.trim() !== ''
          );
        }
        return requiredFields.every(field =>
          formData[field.name] && formData[field.name]!.trim() !== ''
        );
      }
      case 3: return contractText !== "";
      default: return false;
    }
  };

  const handleGenerate = async () => {
    if (!selectedType || userPlan === 'free') return;

    // Check Business plan limits
    if (userPlan === 'business' && usageData) {
      if (usageData.contractsGenerated >= usageData.monthlyLimit) {
        toast.error(`🚫 Monatslimit erreicht! Sie haben bereits ${usageData.monthlyLimit} Verträge erstellt. Limit erneuert sich am ${usageData.resetDate}.`);
        return;
      }
    }

    setLoading(true);
    setContractText("");
    setGeneratedHTML("");
    setCopied(false);
    setSaved(false);
    setSavedContractId(null);

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
      setGeneratedHTML(data.contractHTML || "");

      // Erfasse contractId aus Backend-Response (verhindert Duplikate bei handleSave)
      if (data.contractId) {
        setSavedContractId(data.contractId);
      }

      setContractData((prev: any) => ({
        ...prev,
        contractType: selectedType.name,
        parties: formData,
        contractDetails: formData
      }));
      
      setCurrentStep(3);
      setShowPreview(true);

      // 💾 Clear draft after successful generation
      clearDraft();

      // Update usage tracking for Business plan
      if (userPlan === 'business' && usageData && user?.email) {
        const now = new Date();
        const currentMonth = `${now.getFullYear()}-${now.getMonth() + 1}`;
        const storageKey = `contract_generation_${user.email}_${currentMonth}`;
        const newCount = usageData.contractsGenerated + 1;

        localStorage.setItem(storageKey, newCount.toString());
        setUsageData({
          ...usageData,
          contractsGenerated: newCount
        });

        console.log(`✅ Business Usage aktualisiert: ${newCount}/${usageData.monthlyLimit}`);
      }

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

  const handleSave = async (): Promise<string | null> => {
    try {
      // ✅ UPDATE wenn bereits gespeichert, CREATE wenn neu
      const isUpdate = !!savedContractId;

      console.log(isUpdate ? "📤 Aktualisiere Vertrag..." : "📤 Speichere Vertrag...");

      const url = isUpdate
        ? `${import.meta.env.VITE_API_URL || 'https://api.contract-ai.de'}/api/contracts/${savedContractId}`
        : `${import.meta.env.VITE_API_URL || 'https://api.contract-ai.de'}/api/contracts`;

      // ✅ Lösche gecachtes HTML bei Updates, damit PDF neu generiert wird
      const bodyData: any = {
        name: formData.title
          || `${selectedType?.name || contractData.contractType || 'Vertrag'} - ${new Date().toLocaleDateString('de-DE')}`,
        content: contractText || '',
        isGenerated: true,
        contractType: selectedType?.id || contractData.contractType,
        formData: contractData.parties,
        designVariant: selectedDesignVariant,
        metadata: {
          contractType: selectedType?.id || contractData.contractType,
          parties: {
            ...contractData.parties,
            // ✅ Include updated buyer data from form
            buyer: buyerName || contractData.parties?.buyer,
            buyerName: buyerName || contractData.parties?.buyerName,
            buyerAddress: buyerAddress || contractData.parties?.buyerAddress,
            buyerCity: buyerCity || contractData.parties?.buyerCity
          },
          contractDetails: contractData.contractDetails,
          hasLogo: !!(useCompanyProfile && companyProfile?.logoUrl),
          generatedAt: new Date().toISOString()
        }
      };

      // Bei Updates: Name nicht überschreiben (wurde bei /generate korrekt gesetzt)
      if (isUpdate) {
        delete bodyData.name;
        bodyData.htmlContent = null;
        bodyData.contractHTML = null;
      } else {
        // Bei CREATE: Sende Original HTML (contractHTML ist der richtige Feldname)
        bodyData.contractHTML = generatedHTML || undefined;
      }

      const res = await fetch(url, {
        method: isUpdate ? 'PUT' : 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(bodyData)
      });

      const data = await res.json();

      if (res.ok) {
        const contractId = data.contractId || savedContractId;
        if (data.contract?.s3Key) {
          setContractS3Key(data.contract.s3Key);
        }
        console.log(isUpdate ? "✅ Vertrag aktualisiert:" : "✅ Vertrag gespeichert:", contractId);

        if (!savedContractId) {
          setSavedContractId(contractId);
        }
        setSaved(true);

        toast.success(isUpdate ? "✅ Änderungen gespeichert!" : "✅ Vertrag erfolgreich gespeichert!", {
          autoClose: 3000,
          position: 'top-center',
        });

        // Nur bei erstem Speichern die Navigation-Buttons zeigen
        if (!isUpdate && contractId) {
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
                  onClick={() => navigate(`/contracts/${contractId}`)}
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
        }

        return contractId || null;

      } else {
        throw new Error(data.error || 'Speichern fehlgeschlagen');
      }
    } catch (error) {
      console.error("❌ Fehler beim Speichern:", error);
      toast.error(`❌ Fehler beim Speichern: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
      return null;
    }
  };

  // 🎨 NEUE FUNKTION: Design-Variante ändern (nach Vertragserstellung)
  const handleDesignChange = async (newDesign: string, customConfig?: typeof customDesign) => {
    // Verhindere Mehrfachklicks oder gleiche Design-Auswahl (außer bei custom)
    if (isChangingDesign || (newDesign === selectedDesignVariant && newDesign !== 'custom')) return;

    // Prüfe ob Vertrag gespeichert ist
    if (!savedContractId) {
      toast.warning("Bitte speichern Sie den Vertrag zuerst, um das Design zu ändern.", {
        position: 'top-center',
        autoClose: 3000
      });
      return;
    }

    setIsChangingDesign(true);

    const designName = newDesign === 'custom' ? 'Eigenes Design' : newDesign;
    const loadingToast = toast.loading(`Design wird auf "${designName}" geändert...`, {
      position: 'top-center'
    });

    try {
      console.log("🎨 Design-Änderung gestartet:", { contractId: savedContractId, newDesign, customConfig });

      // Backend API aufrufen - mit optionaler Custom Config
      const requestBody: Record<string, unknown> = {
        contractId: savedContractId,
        newDesignVariant: newDesign
      };

      // Wenn custom, füge die Custom-Konfiguration hinzu
      if (newDesign === 'custom' && customConfig) {
        requestBody.customDesign = customConfig;
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://api.contract-ai.de'}/api/contracts/generate/change-design`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Design-Änderung fehlgeschlagen');
      }

      console.log("✅ Design erfolgreich geändert:", data);

      // State aktualisieren
      setSelectedDesignVariant(newDesign);

      // PDF-Vorschau neu laden - WICHTIG: Zuerst Ladeindikator zeigen!
      setIsGeneratingPreview(true);
      if (pdfPreviewUrl) {
        window.URL.revokeObjectURL(pdfPreviewUrl);
        setPdfPreviewUrl(null);
      }

      toast.update(loadingToast, {
        render: `✅ Design "${designName}" erfolgreich angewendet! PDF wird neu generiert...`,
        type: "success",
        isLoading: false,
        autoClose: 2000
      });

      // Warte kurz und lade PDF-Vorschau neu mit V2 und neuem Design
      setTimeout(async () => {
        try {
          console.log("🎨 Lade V2 PDF-Vorschau mit neuem Design:", newDesign, customConfig);

          const pdfRequestBody: Record<string, unknown> = { design: newDesign };
          if (newDesign === 'custom' && customConfig) {
            pdfRequestBody.customDesign = customConfig;
          }

          const pdfResponse = await fetch(`${import.meta.env.VITE_API_URL || 'https://api.contract-ai.de'}/api/contracts/${savedContractId}/pdf-v2?design=${newDesign}`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(pdfRequestBody)
          });

          if (pdfResponse.ok) {
            const blob = await pdfResponse.blob();
            const url = window.URL.createObjectURL(blob);
            setPdfPreviewUrl(url);
            console.log("✅ V2 PDF-Vorschau mit Design", designName, "geladen");
          }
        } catch (pdfError) {
          console.error("⚠️ PDF-Vorschau konnte nicht geladen werden:", pdfError);
        } finally {
          setIsGeneratingPreview(false);
        }
      }, 500);

    } catch (error) {
      console.error("❌ Design-Änderung fehlgeschlagen:", error);
      toast.update(loadingToast, {
        render: `❌ Fehler: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`,
        type: "error",
        isLoading: false,
        autoClose: 4000
      });
    } finally {
      setIsChangingDesign(false);
    }
  };

  // 🔴 FIX 2: KOMPLETT ÜBERARBEITETE handleDownloadPDF MIT LOADING-STATE
  const handleDownloadPDF = async () => {
    // Verhindere Mehrfachklicks
    if (isGeneratingPDF) return;
    
    setIsGeneratingPDF(true);
    setDownloadError(null);
    
    // Zeige Ladeindikator
    const loadingToast = toast.loading("PDF wird generiert... (kann 5-10 Sekunden dauern)", {
      position: 'top-center'
    });
    
    try {
      console.log("🚀 Starte PDF Export...");
      
      // NUR die aktuelle Contract ID verwenden
      let contractId = savedContractId;
      
      console.log("📊 Contract ID Status:", { 
        savedContractId, 
        final: contractId 
      });
      
      // Wenn noch nicht gespeichert, automatisch speichern
      if (!contractId && contractText) {
        console.log("📝 Speichere Vertrag automatisch vor PDF-Export...");
        
        toast.update(loadingToast, {
          render: "Speichere Vertrag für optimale PDF-Qualität...",
          type: "info",
          isLoading: true
        });
        
        try {
          const saveRes = await fetch(`${import.meta.env.VITE_API_URL || 'https://api.contract-ai.de'}/api/contracts`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: formData.title
                || `${selectedType?.name || contractData.contractType || 'Vertrag'} - ${new Date().toLocaleDateString('de-DE')}`,
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

          const saveData = await saveRes.json();
          if (saveRes.ok && saveData.contractId) {
            contractId = saveData.contractId;
            setSavedContractId(saveData.contractId);
            setSaved(true);
            console.log("✅ Vertrag automatisch gespeichert:", saveData.contractId);

            // ⏳ Warte auf Auto-PDF Generierung im Backend (contracts.js)
            // Auto-PDF braucht ca. 3-5 Sekunden für Puppeteer + S3 Upload
            console.log("⏳ Warte auf Auto-PDF Generierung...");
            await new Promise(resolve => setTimeout(resolve, 5000));
          } else {
            console.warn("⚠️ Automatisches Speichern fehlgeschlagen:", saveData.error);
          }
        } catch (saveError) {
          console.error("❌ Fehler beim automatischen Speichern:", saveError);
        }
      }
      
      // Update Toast
      toast.update(loadingToast, {
        render: "PDF wird generiert...",
        type: "info",
        isLoading: true
      });
      
      // Versuche V2 (React-PDF) wenn Contract ID vorhanden
      if (contractId) {
        console.log("🚀 Versuche V2 (React-PDF) PDF-Generierung mit Contract ID:", contractId, "| Design:", selectedDesignVariant);

        try {
          // Anlagen-Infos für die letzte PDF-Seite vorbereiten
          const attachmentInfos = attachments.map(att => ({
            displayName: att.displayName || att.originalName,
            originalName: att.originalName,
            type: att.type
          }));
          console.log("📎 Anlagen-Infos:", attachmentInfos.length);

          // Wenn Anlagen vorhanden, kombinierte Route verwenden
          const hasPdfOrImageAttachments = attachments.some(att =>
            att.type === 'application/pdf' ||
            att.type?.startsWith('image/')
          );

          let pdfUrl: string;
          let requestBody: { design: string; attachments: typeof attachmentInfos; attachmentFiles?: { data: string; type: string; name: string }[]; pageBreaks?: number[] };

          if (hasPdfOrImageAttachments) {
            // Kombinierte Route mit Anlagen-Dateien
            pdfUrl = `${import.meta.env.VITE_API_URL || 'https://api.contract-ai.de'}/api/contracts/${contractId}/pdf-combined?design=${selectedDesignVariant}`;
            console.log("📊 Combined PDF URL:", pdfUrl);

            toast.update(loadingToast, {
              render: "Lade Anlagen und erstelle kombiniertes PDF...",
              type: "info",
              isLoading: true
            });

            // Anlagen-Dateien als Base64 vorbereiten
            const attachmentFiles: { data: string; type: string; name: string }[] = [];
            for (const att of attachments) {
              if (att.type === 'application/pdf' || att.type?.startsWith('image/')) {
                try {
                  // Datei als Base64 lesen
                  const reader = new FileReader();
                  const base64Data = await new Promise<string>((resolve, reject) => {
                    reader.onload = () => {
                      const result = reader.result as string;
                      // Base64-Teil extrahieren (nach "data:...;base64,")
                      const base64 = result.split(',')[1];
                      resolve(base64);
                    };
                    reader.onerror = reject;
                    reader.readAsDataURL(att.file);
                  });
                  attachmentFiles.push({
                    data: base64Data,
                    type: att.type,
                    name: att.displayName || att.originalName
                  });
                  console.log(`📄 Anlage geladen: ${att.originalName}`);
                } catch (readError) {
                  console.error(`❌ Fehler beim Lesen der Anlage: ${att.originalName}`, readError);
                }
              }
            }

            requestBody = {
              design: selectedDesignVariant,
              attachments: attachmentInfos,
              attachmentFiles: attachmentFiles,
              pageBreaks
            };
          } else {
            // Standard V2-Route (ohne Datei-Anhänge)
            pdfUrl = `${import.meta.env.VITE_API_URL || 'https://api.contract-ai.de'}/api/contracts/${contractId}/pdf-v2?design=${selectedDesignVariant}`;
            console.log("📊 V2 PDF URL:", pdfUrl);
            requestBody = {
              design: selectedDesignVariant,
              attachments: attachmentInfos,
              pageBreaks
            };
          }

          const response = await fetch(pdfUrl, {
            method: 'POST',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
          });

          console.log("📊 Response:", {
            status: response.status,
            statusText: response.statusText,
            contentType: response.headers.get('content-type')
          });

          if (response.ok) {
            const contentType = response.headers.get('content-type');

            if (contentType && contentType.includes('application/pdf')) {
              const blob = await response.blob();
              console.log("✅ PDF Blob erhalten:", blob.size, "bytes");

              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              const suffix = hasPdfOrImageAttachments ? '_mit_Anlagen' : '_professional';
              a.download = `${contractData.contractType || 'vertrag'}_${new Date().toLocaleDateString('de-DE').replace(/\./g, '-')}${suffix}.pdf`;
              document.body.appendChild(a);
              a.click();
              window.URL.revokeObjectURL(url);
              document.body.removeChild(a);

              // Erfolg!
              toast.update(loadingToast, {
                render: hasPdfOrImageAttachments
                  ? `✅ PDF mit ${attachments.length} Anlage(n) generiert!`
                  : "✅ Professionelles PDF mit Logo generiert!",
                type: "success",
                isLoading: false,
                autoClose: 3000
              });

              console.log("✅ PDF erfolgreich heruntergeladen");
              return; // Erfolgreich - beende hier
            }
          }

          // V2 fehlgeschlagen
          const errorText = await response.text();
          console.error("❌ PDF-Generierung Fehler:", response.status, errorText);

        } catch (v2Error) {
          console.error("❌ Netzwerkfehler bei PDF-Generierung:", v2Error);
        }
      }

      // Fallback zu html2pdf.js
      console.log("⚠️ Fallback zu html2pdf.js");
      
      toast.update(loadingToast, {
        render: "Verwende alternativen PDF-Generator...",
        type: "info",
        isLoading: true
      });
      
      try {
        // Dynamisch html2pdf laden
        const html2pdfModule = await import('html2pdf.js');
        const html2pdf = html2pdfModule.default;
        
        if (!html2pdf) {
          throw new Error("html2pdf konnte nicht geladen werden");
        }
        
        if (generatedHTML && generatedHTML.length > 100) {
          console.log("🎨 Verwende HTML-Version für html2pdf.js Export");

          // HTML sanitizen um XSS zu verhindern (generatedHTML kommt vom Backend/OpenAI)
          const DOMPurify = (await import('dompurify')).default;
          const sanitizedHTML = DOMPurify.sanitize(generatedHTML, {
            ALLOWED_TAGS: ['h1','h2','h3','h4','h5','h6','p','div','span','br','hr','ul','ol','li','table','thead','tbody','tr','th','td','strong','b','em','i','u','a','img','blockquote','pre','code','section','article','header','footer','sup','sub'],
            ALLOWED_ATTR: ['style','class','id','href','src','alt','width','height','colspan','rowspan'],
            ALLOW_DATA_ATTR: false
          });

          // Erstelle einen sichtbaren Container für besseres Rendering
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = sanitizedHTML;
          tempDiv.style.cssText = `
            position: fixed;
            left: 0;
            top: 0;
            width: 794px;
            background: white;
            z-index: 99999;
            padding: 20px;
            overflow: visible;
          `;
          document.body.appendChild(tempDiv);
          
          // Warte auf vollständiges Rendering
          await new Promise(resolve => setTimeout(resolve, 500));

          const opt = {
            margin: [10, 10, 10, 10] as [number, number, number, number],
            filename: `${contractData.contractType || 'vertrag'}_${new Date().toLocaleDateString('de-DE').replace(/\./g, '-')}.pdf`,
            image: {
              type: 'jpeg' as const,
              quality: 0.98
            },
            html2canvas: {
              scale: 2,
              useCORS: true,
              logging: false,
              backgroundColor: '#ffffff',
              windowWidth: 794,
              windowHeight: 1123
            },
            jsPDF: {
              unit: 'mm',
              format: 'a4',
              orientation: 'portrait' as const,
              compress: false
            },
            pagebreak: { 
              mode: ['avoid-all', 'css', 'legacy'] 
            }
          };

          // Generiere PDF
          await html2pdf().set(opt).from(tempDiv).save();
          
          // Aufräumen
          document.body.removeChild(tempDiv);
          
          console.log("✅ PDF mit html2pdf.js generiert");
          
          toast.update(loadingToast, {
            render: "✅ PDF wurde erstellt!",
            type: "success",
            isLoading: false,
            autoClose: 3000
          });
          
        } else if (contractText) {
          // Text-Fallback wenn kein HTML vorhanden
          console.log("📄 Text-Fallback für PDF Export");
          
          const element = document.createElement('div');
          element.style.cssText = `
            background: white;
            padding: 40px;
            font-family: Arial, sans-serif;
            width: 794px;
            color: #000;
          `;
          // HTML-Escape um XSS zu verhindern
          const escapeHtml = (text: string) => text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
          const safeType = escapeHtml(contractData.contractType || 'Vertrag');
          const safeText = escapeHtml(contractText).replace(/\n/g, '<br/>');
          element.innerHTML = `
            <h1 style="color: #1e3a8a; border-bottom: 2px solid #1e3a8a; padding-bottom: 10px; margin-bottom: 30px;">
              ${safeType}
            </h1>
            <div style="line-height: 1.8; color: #333; white-space: pre-wrap; font-size: 12pt;">
              ${safeText}
            </div>
          `;
          
          document.body.appendChild(element);
          
          // Warte auf Rendering
          await new Promise(resolve => setTimeout(resolve, 300));
          
          const opt = {
            margin: 15,
            filename: `${contractData.contractType || 'vertrag'}_${new Date().toLocaleDateString('de-DE').replace(/\./g, '-')}_text.pdf`,
            image: { type: 'jpeg' as const, quality: 0.98 },
            html2canvas: {
              scale: 2,
              backgroundColor: '#ffffff',
              logging: false
            },
            jsPDF: {
              unit: 'mm',
              format: 'a4',
              orientation: 'portrait' as const
            }
          };
          
          await html2pdf().set(opt).from(element).save();
          
          document.body.removeChild(element);
          
          toast.update(loadingToast, {
            render: "💡 PDF wurde erstellt (Text-Version)",
            type: "info",
            isLoading: false,
            autoClose: 3000
          });
        } else {
          throw new Error("Kein Vertrag zum Exportieren vorhanden");
        }
      } catch (html2pdfError) {
        console.error("❌ html2pdf Fehler:", html2pdfError);
        throw html2pdfError;
      }
      
    } catch (error) {
      console.error("❌ Kritischer Fehler beim PDF-Export:", error);
      
      // Error Toast
      toast.update(loadingToast, {
        render: `❌ PDF-Export fehlgeschlagen: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`,
        type: "error",
        isLoading: false,
        autoClose: 5000
      });
      
      setDownloadError(error instanceof Error ? error.message : 'PDF-Export fehlgeschlagen');
      
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // 📎 ATTACHMENT HANDLERS
  // Handler für Drag & Drop
  const handleAttachmentDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingAttachment(false);

    const files = Array.from(e.dataTransfer.files);
    addAttachments(files);
  };

  // Handler für File Input
  const handleAttachmentSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      addAttachments(files);
      // Input zurücksetzen, damit dieselbe Datei erneut ausgewählt werden kann
      e.target.value = '';
    }
  };

  // Attachments hinzufügen (mit Validierung)
  const addAttachments = (files: File[]) => {
    const validTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/png', 'image/jpeg', 'image/jpg'];
    const maxSize = 10 * 1024 * 1024; // 10 MB

    const validFiles: Attachment[] = [];
    const errors: string[] = [];

    files.forEach(file => {
      if (!validTypes.includes(file.type)) {
        errors.push(`"${file.name}" hat ein ungültiges Format`);
        return;
      }
      if (file.size > maxSize) {
        errors.push(`"${file.name}" ist zu groß (max. 10 MB)`);
        return;
      }

      // Dateiname ohne Extension für displayName
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');

      validFiles.push({
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        file,
        displayName: nameWithoutExt,
        originalName: file.name,
        size: file.size,
        type: file.type
      });
    });

    if (errors.length > 0) {
      toast.error(errors.join(', '), { position: "top-right", autoClose: 5000 });
    }

    if (validFiles.length > 0) {
      setAttachments(prev => [...prev, ...validFiles]);
      toast.success(
        <div>
          <strong>{validFiles.length} Anlage(n) hinzugefügt</strong>
          <div style={{ fontSize: '12px', marginTop: '4px', opacity: 0.9 }}>
            📎 Wird beim PDF-Download automatisch angehängt
          </div>
        </div>,
        { position: "top-right", autoClose: 3500 }
      );
    }
  };

  // Attachment Namen aktualisieren
  const updateAttachmentName = (id: string, newName: string) => {
    setAttachments(prev => prev.map(att =>
      att.id === id ? { ...att, displayName: newName } : att
    ));
  };

  // Attachment entfernen
  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(att => att.id !== id));
  };

  // Anlagen werden jetzt automatisch auf der letzten PDF-Seite angezeigt
  // und beim Download als kombiniertes PDF erstellt (Vertrag + Anlagen-Dateien)

  // Download mit Anlagen (ZIP oder kombinierte PDF)
  const handleDownloadWithAttachments = async (format: 'zip' | 'combined') => {
    if (attachments.length === 0) {
      toast.error("Keine Anlagen vorhanden", { position: "top-right" });
      return;
    }

    setIsDownloadingAttachments(true);

    try {
      if (format === 'zip') {
        // ZIP-Archiv erstellen mit JSZip
        const JSZip = (await import('jszip')).default;
        const zip = new JSZip();

        // Haupt-PDF hinzufügen (wenn gespeichert)
        if (savedContractId && contractS3Key) {
          try {
            const token = localStorage.getItem("token");
            const pdfResponse = await fetch(
              `${import.meta.env.VITE_API_URL || 'https://api.contract-ai.de'}/api/contracts/${savedContractId}/download-pdf?design=${selectedDesignVariant}`,
              { headers: { Authorization: `Bearer ${token}` } }
            );
            if (pdfResponse.ok) {
              const pdfBlob = await pdfResponse.blob();
              zip.file(`${contractData.contractType || 'vertrag'}.pdf`, pdfBlob);
            }
          } catch (err) {
            console.error("Fehler beim Laden des Haupt-PDFs:", err);
          }
        }

        // Anlagen-Ordner erstellen
        const anlagenFolder = zip.folder("Anlagen");

        // Anlagen hinzufügen
        for (const attachment of attachments) {
          const extension = attachment.originalName.split('.').pop();
          const fileName = `${attachment.displayName}.${extension}`;
          anlagenFolder?.file(fileName, attachment.file);
        }

        // ZIP generieren und herunterladen
        const content = await zip.generateAsync({ type: "blob" });
        const url = window.URL.createObjectURL(content);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${contractData.contractType || 'vertrag'}_mit_anlagen.zip`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        toast.success("ZIP-Archiv heruntergeladen!", { position: "top-right" });

      } else {
        // Kombinierte PDF - TODO: Backend-Endpoint erstellen
        toast.info("Kombinierte PDF wird noch implementiert. Nutzen Sie vorerst das ZIP-Archiv.", {
          position: "top-right",
          autoClose: 4000
        });
      }
    } catch (error) {
      console.error("Download-Fehler:", error);
      toast.error("Fehler beim Erstellen des Downloads", { position: "top-right" });
    } finally {
      setIsDownloadingAttachments(false);
    }
  };

  // 🔐 NEW: Generate and Upload PDF to S3 for Signatures
  const generateAndUploadPDF = async (): Promise<string | null> => {
    try {
      console.log("🚀 Starting PDF generation and upload to S3...");

      // Check if contract is saved
      if (!savedContractId) {
        toast.error("Bitte speichern Sie den Vertrag zuerst", {
          position: "top-right",
          autoClose: 3000
        });
        return null;
      }

      // Try Puppeteer first (backend PDF generation)
      if (savedContractId) {
        console.log("🚀 Trying Puppeteer PDF generation...");

        try {
          const puppeteerUrl = `${import.meta.env.VITE_API_URL || 'https://api.contract-ai.de'}/api/contracts/generate/pdf`;

          const response = await fetch(puppeteerUrl, {
            method: 'POST',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              contractId: savedContractId
            })
          });

          if (response.ok && response.headers.get('content-type')?.includes('application/pdf')) {
            const blob = await response.blob();
            console.log("✅ PDF Blob received:", blob.size, "bytes");

            // Convert Blob to Base64
            const base64 = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onloadend = () => {
                const result = reader.result as string;
                // Remove data:application/pdf;base64, prefix
                const base64Data = result.split(',')[1];
                resolve(base64Data);
              };
              reader.onerror = reject;
              reader.readAsDataURL(blob);
            });

            console.log("✅ PDF converted to Base64:", base64.length, "chars");

            // Upload to S3
            const uploadResponse = await fetch(
              `${import.meta.env.VITE_API_URL || 'https://api.contract-ai.de'}/api/contracts/${savedContractId}/upload-pdf`,
              {
                method: 'POST',
                credentials: 'include',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ pdfBase64: base64 })
              }
            );

            const uploadData = await uploadResponse.json();

            if (uploadResponse.ok && uploadData.s3Key) {
              console.log("✅ PDF uploaded to S3:", uploadData.s3Key);
              setContractS3Key(uploadData.s3Key);
              return uploadData.s3Key;
            } else {
              console.error("❌ S3 upload failed:", uploadData.error);
              throw new Error(uploadData.error || "S3 upload failed");
            }
          }
        } catch (puppeteerError) {
          console.warn("⚠️ Puppeteer failed, trying fallback:", puppeteerError);
        }
      }

      // Fallback: html2pdf.js (client-side generation)
      console.log("⚠️ Using html2pdf.js fallback...");

      const html2pdfModule = await import('html2pdf.js');
      const html2pdf = html2pdfModule.default;

      if (!html2pdf || !generatedHTML) {
        throw new Error("PDF generation not possible");
      }

      // Generate PDF as Blob — HTML sanitizen um XSS zu verhindern
      const DOMPurifyFallback = (await import('dompurify')).default;
      const sanitizedFallbackHTML = DOMPurifyFallback.sanitize(generatedHTML, {
        ALLOWED_TAGS: ['h1','h2','h3','h4','h5','h6','p','div','span','br','hr','ul','ol','li','table','thead','tbody','tr','th','td','strong','b','em','i','u','a','img','blockquote','pre','code','section','article','header','footer','sup','sub'],
        ALLOWED_ATTR: ['style','class','id','href','src','alt','width','height','colspan','rowspan'],
        ALLOW_DATA_ATTR: false
      });
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = sanitizedFallbackHTML;
      tempDiv.style.cssText = `
        position: fixed;
        left: -9999px;
        top: 0;
        width: 794px;
        background: white;
      `;
      document.body.appendChild(tempDiv);

      const opt = {
        margin: [10, 10, 10, 10] as [number, number, number, number],
        filename: 'temp.pdf',
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff'
        },
        jsPDF: {
          unit: 'mm',
          format: 'a4',
          orientation: 'portrait' as const
        }
      };

      // Generate PDF as Blob (not save)
      const pdfBlob = await html2pdf().set(opt).from(tempDiv).outputPdf('blob');
      document.body.removeChild(tempDiv);

      console.log("✅ PDF generated via html2pdf:", pdfBlob.size, "bytes");

      // Convert to Base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          const base64Data = result.split(',')[1];
          resolve(base64Data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(pdfBlob);
      });

      // Upload to S3
      const uploadResponse = await fetch(
        `${import.meta.env.VITE_API_URL || 'https://api.contract-ai.de'}/api/contracts/${savedContractId}/upload-pdf`,
        {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ pdfBase64: base64 })
        }
      );

      const uploadData = await uploadResponse.json();

      if (uploadResponse.ok && uploadData.s3Key) {
        console.log("✅ PDF uploaded to S3:", uploadData.s3Key);
        setContractS3Key(uploadData.s3Key);
        return uploadData.s3Key;
      } else {
        throw new Error(uploadData.error || "S3 upload failed");
      }

    } catch (error) {
      console.error("❌ Error generating/uploading PDF:", error);
      toast.error("Fehler beim PDF-Upload. Bitte versuchen Sie es erneut.", {
        position: "top-right",
        autoClose: 5000
      });
      return null;
    }
  };

  // 🔐 Handler for "Zur Signatur versenden" Button
  const handleSendForSignature = async () => {
    // Check if saved
    if (!saved || !savedContractId) {
      toast.error("Bitte speichern Sie den Vertrag zuerst", {
        position: "top-right",
        autoClose: 3000
      });
      return;
    }

    // Show loading toast
    const loadingToast = toast.loading("PDF wird vorbereitet...", {
      position: 'top-center'
    });

    try {
      // Generate and upload PDF
      const s3Key = await generateAndUploadPDF();

      toast.dismiss(loadingToast);

      if (s3Key) {
        // Success! Open signature modal
        setShowSignatureModal(true);
        toast.success("Bereit zur Signatur!", {
          position: "top-right",
          autoClose: 2000
        });
      } else {
        toast.error("PDF-Upload fehlgeschlagen. Bitte versuchen Sie es erneut.", {
          position: "top-right",
          autoClose: 5000
        });
      }
    } catch (error) {
      toast.dismiss(loadingToast);
      console.error("Error in handleSendForSignature:", error);
      toast.error("Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.", {
        position: "top-right",
        autoClose: 5000
      });
    }
  };

  // 🔧 Handler: Im Contract Builder bearbeiten
  const [isImportingToBuilder, setIsImportingToBuilder] = useState(false);

  const handleOpenInBuilder = async () => {
    if (!contractText || isImportingToBuilder) return;

    setIsImportingToBuilder(true);
    try {
      // Zuerst speichern, falls noch nicht gespeichert — returnedId verhindert stale closure
      let resolvedContractId = savedContractId;
      if (!resolvedContractId) {
        resolvedContractId = await handleSave();
      }
      // Null-Check: Falls Speichern fehlgeschlagen ist
      if (!resolvedContractId) {
        toast.error('Vertrag konnte nicht gespeichert werden. Bitte versuchen Sie es erneut.', {
          autoClose: 5000, position: 'top-center'
        });
        setIsImportingToBuilder(false);
        return;
      }

      // Auth-Token validieren
      const authToken = localStorage.getItem('token');
      if (!authToken) {
        toast.error('Authentifizierung erforderlich. Bitte melden Sie sich erneut an.', {
          autoClose: 5000, position: 'top-center'
        });
        setIsImportingToBuilder(false);
        return;
      }

      const res = await fetch(`${import.meta.env.VITE_API_URL || 'https://api.contract-ai.de'}/api/contract-builder/import-from-generator`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          contractText,
          contractType: selectedType?.id || contractData.contractType,
          parties: contractData.parties || formData,
          designVariant: selectedDesignVariant,
          contractId: resolvedContractId,
          name: formData.title
            || `${selectedType?.name || contractData.contractType || 'Vertrag'} - ${new Date().toLocaleDateString('de-DE')}`
        })
      });

      let data;
      try {
        data = await res.json();
      } catch {
        throw new Error('Ungültige Antwort vom Server');
      }

      if (res.ok && data.success) {
        const blockCount = data.blockCount || 0;
        toast.success(`Vertrag mit ${blockCount} Blöcken in den Builder importiert!`, {
          autoClose: 3000,
          position: 'top-center'
        });
        // documentId validieren bevor navigiert wird
        if (data.documentId) {
          setIsImportingToBuilder(false);
          navigate(`/contract-builder/${data.documentId}`);
        }
      } else {
        toast.error(data.error || 'Fehler beim Import in den Builder', {
          autoClose: 5000,
          position: 'top-center'
        });
      }
    } catch (error) {
      console.error('Error importing to builder:', error);
      toast.error('Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.', {
        autoClose: 5000,
        position: 'top-center'
      });
    } finally {
      setIsImportingToBuilder(false);
    }
  };

  // 🔄 Handler for "Vertrag verbessern" (Contract Improvement)
  const handleImproveContract = async () => {
    if (!improvements.trim()) {
      toast.error("Bitte geben Sie Verbesserungswünsche ein", {
        position: "top-right",
        autoClose: 3000
      });
      return;
    }

    setIsImproving(true);
    const loadingToast = toast.loading("Vertrag wird verbessert...", {
      position: 'top-center'
    });

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://api.contract-ai.de'}/api/contracts/improve`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          originalContract: contractText,
          improvements: improvements,
          contractType: contractData.contractType || selectedType
        })
      });

      const data = await response.json();

      if (data.success && data.improvedContract) {
        // Update contract text with improved version
        setContractText(data.improvedContract);

        // Reset improvement section
        setImprovements("");
        setShowImprovementSection(false);

        // Reset PDF preview to regenerate with new text
        setPdfPreviewUrl(null);

        // Mark as unsaved
        setSaved(false);

        toast.update(loadingToast, {
          render: "✅ Vertrag erfolgreich verbessert!",
          type: "success",
          isLoading: false,
          autoClose: 3000
        });

        console.log('✅ Contract improved:', {
          originalLength: contractText.length,
          improvedLength: data.improvedContract.length,
          tokensUsed: data.metadata?.tokensUsed
        });

      } else {
        throw new Error(data.error || 'Verbesserung fehlgeschlagen');
      }
    } catch (error) {
      console.error("Error improving contract:", error);
      toast.update(loadingToast, {
        render: "❌ Fehler bei der Verbesserung",
        type: "error",
        isLoading: false,
        autoClose: 5000
      });
    } finally {
      setIsImproving(false);
    }
  };

  // 📄 NEW: Generate PDF Preview (ohne Download)
  const generatePDFPreview = async () => {
    if (isGeneratingPreview) return; // Verhindere Mehrfachklicks

    setIsGeneratingPreview(true);

    try {
      console.log("🔍 Generiere PDF-Vorschau...");

      // Contract ID sicherstellen
      let contractId = savedContractId;

      // ✅ Immer speichern/aktualisieren vor PDF-Generierung (um Text-Änderungen zu übernehmen)
      if (contractText) {
        const isUpdate = !!contractId;
        console.log(isUpdate ? "📝 Aktualisiere Vertrag vor PDF-Vorschau..." : "📝 Speichere Vertrag vor PDF-Vorschau...");

        try {
          const url = isUpdate
            ? `${import.meta.env.VITE_API_URL || 'https://api.contract-ai.de'}/api/contracts/${contractId}`
            : `${import.meta.env.VITE_API_URL || 'https://api.contract-ai.de'}/api/contracts`;

          // ✅ Lösche gecachtes HTML bei Updates, damit PDF neu generiert wird
          const bodyData: any = {
            name: formData.title
              || `${selectedType?.name || contractData.contractType || 'Vertrag'} - ${new Date().toLocaleDateString('de-DE')}`,
            content: contractText,
            isGenerated: true,
            metadata: {
              contractType: contractData.contractType,
              parties: {
                ...contractData.parties,
                // ✅ Include updated buyer data from form
                buyer: buyerName || contractData.parties?.buyer,
                buyerName: buyerName || contractData.parties?.buyerName,
                buyerAddress: buyerAddress || contractData.parties?.buyerAddress,
                buyerCity: buyerCity || contractData.parties?.buyerCity
              },
              contractDetails: contractData.contractDetails,
              hasLogo: !!(useCompanyProfile && companyProfile?.logoUrl),
              generatedAt: new Date().toISOString()
            }
          };

          // Bei Updates: Name nicht überschreiben (wurde bei /generate korrekt gesetzt)
          if (isUpdate) {
            delete bodyData.name;
            bodyData.htmlContent = null;
            bodyData.contractHTML = null;
          } else {
            bodyData.htmlContent = generatedHTML;
          }

          const saveRes = await fetch(url, {
            method: isUpdate ? 'PUT' : 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bodyData)
          });

          const saveData = await saveRes.json();
          if (saveRes.ok) {
            if (!contractId && saveData.contractId) {
              contractId = saveData.contractId;
              setSavedContractId(saveData.contractId);
            }
            setSaved(true);
            console.log(isUpdate ? "✅ Vertrag aktualisiert" : "✅ Vertrag gespeichert:", contractId);

            // ⏳ Bei neuem Vertrag: Warte auf Auto-PDF Generierung im Backend
            // Auto-PDF braucht ca. 6-10 Sekunden für Puppeteer + S3 Upload
            if (!isUpdate) {
              console.log("⏳ Warte auf Auto-PDF Generierung (8 Sekunden)...");
              await new Promise(resolve => setTimeout(resolve, 8000));
            } else {
              await new Promise(resolve => setTimeout(resolve, 500));
            }
          }
        } catch (saveError) {
          console.error("❌ Fehler beim Speichern/Aktualisieren:", saveError);
        }
      }

      // PDF generieren mit V2 (React-PDF) für konsistente Vorschau
      if (contractId) {
        console.log("🎨 Generiere V2 PDF-Vorschau mit Design:", selectedDesignVariant);
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://api.contract-ai.de'}/api/contracts/${contractId}/pdf-v2?design=${selectedDesignVariant}`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ design: selectedDesignVariant, pageBreaks })
        });

        if (response.ok) {
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          // Alte Blob-URL freigeben um Memory-Leak zu verhindern
          setPdfPreviewUrl(prev => {
            if (prev) window.URL.revokeObjectURL(prev);
            return url;
          });
          console.log("✅ V2 PDF-Vorschau erstellt mit Design:", selectedDesignVariant);
        } else {
          throw new Error('PDF-Vorschau konnte nicht erstellt werden');
        }
      }
    } catch (error) {
      console.error("❌ Fehler bei PDF-Vorschau:", error);
      toast.error("❌ PDF-Vorschau konnte nicht erstellt werden");
    } finally {
      setIsGeneratingPreview(false);
    }
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

  // Main Render
  return (
    <>
      <WelcomePopup
        featureId="generator"
        icon={<FileText size={32} />}
        title="Verträge mit KI erstellen"
        description="Wählen Sie aus über 50 Vorlagen und erstellen Sie rechtssichere Verträge in wenigen Minuten. Die KI hilft bei Formulierungen und prüft auf Vollständigkeit."
        tip="Ihre Firmendaten werden automatisch übernommen, wenn Sie ein Firmenprofil hinterlegt haben."
      />
      <Helmet>
        <title>Verträge erstellen & sofort nutzen – KI-Generator | Contract AI</title>
        <meta name="description" content="Erstelle rechtssichere, individuelle Verträge in Minuten mit KI. Einfach, schnell & sofort einsatzbereit. Jetzt starten & direkt nutzen!" />
        <meta name="keywords" content="Verträge erstellen, Vertragsgenerator, KI Vertragserstellung, individuelle Vertragsvorlagen, Contract AI" />
        <link rel="canonical" href="https://www.contract-ai.de/generate" />
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
                { num: 1, label: "Typ auswählen" },
                { num: 2, label: "Details eingeben" },
                { num: 3, label: "Vertrag erstellen" },
                { num: 4, label: "Finalisieren" }
              ].map(({ num, label }, index, array) => (
                <React.Fragment key={num}>
                  <motion.div
                    className={styles.stepWrapper}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1, duration: 0.3 }}
                  >
                    <div
                      className={`${styles.stepCircle} ${
                        currentStep === num ? styles.stepActive : ''
                      } ${
                        isStepComplete(num) ? styles.stepCompleted : ''
                      } ${
                        currentStep < num ? styles.stepUpcoming : ''
                      }`}
                    >
                      {isStepComplete(num) ? (
                        <Check size={18} strokeWidth={3} />
                      ) : (
                        <span className={styles.stepNumber}>{num}</span>
                      )}
                    </div>
                    <span className={`${styles.stepLabel} ${
                      currentStep === num ? styles.stepLabelActive : ''
                    }`}>
                      {label}
                    </span>
                  </motion.div>
                  {index < array.length - 1 && (
                    <div className={styles.stepLine}>
                      <motion.div
                        className={styles.stepLineFill}
                        initial={{ scaleX: 0 }}
                        animate={{
                          scaleX: isStepComplete(num) ? 1 : 0
                        }}
                        transition={{ duration: 0.4, ease: "easeInOut" }}
                      />
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        </motion.header>

        <div className={`${styles.generatorContent} ${currentStep === 3 ? styles.step3Wide : ''}`}>
          {/* Premium Notice for Free Users */}
          {userPlan === 'free' && (
            <UnifiedPremiumNotice
              featureName="Die KI-Vertragserstellung"
            />
          )}

          {/* Company Profile Tip Banner - only show if no profile exists and not dismissed */}
          {shouldShowProfileTip && (
            <motion.div
              className={styles.companyProfileTip}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className={styles.tipContent}>
                <span className={styles.tipIcon}>💡</span>
                <div className={styles.tipText}>
                  <strong>Tipp:</strong> Firmenprofil anlegen für automatische Daten
                </div>
                <div className={styles.tipActions}>
                  <button
                    className={styles.tipButton}
                    onClick={() => window.location.href = '/company-profile'}
                  >
                    Firmenprofil einrichten
                  </button>
                  <button
                    className={styles.tipDismiss}
                    onClick={() => {
                      // Permanently dismiss the tip
                      localStorage.setItem('companyProfileTipDismissed', 'true');
                      setTipDismissed(true);
                    }}
                  >
                    Später
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Usage Display for Business Users - Simple like Contracts page */}
          {userPlan === 'business' && usageData && (
            <div className={styles.usageSection}>
              <h2 className={styles.usageTitle}>Verträge erstellen & verwalten</h2>
              <p className={styles.usageSubtitle}>
                Verträge mit KI erstellen ({usageData.contractsGenerated}/{usageData.monthlyLimit} Verträge)
              </p>
              <div className={styles.limitProgress}>
                <div className={styles.limitText}>
                  {usageData.contractsGenerated} von {usageData.monthlyLimit} Verträgen verwendet
                </div>
                <div className={styles.limitBar}>
                  <div
                    className={styles.limitBarFill}
                    style={{ width: `${Math.min((usageData.contractsGenerated / usageData.monthlyLimit) * 100, 100)}%` }}
                  />
                </div>

                {/* Upgrade Notice when approaching limit */}
                {usageData.contractsGenerated >= 8 && usageData.contractsGenerated < usageData.monthlyLimit && (
                  <motion.div
                    className={styles.upgradeNotice}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <span>Mehr Verträge erstellen?</span>
                    <button
                      className={styles.upgradeLink}
                      onClick={() => window.location.href = '/pricing'}
                    >
                      Upgrade auf Enterprise
                    </button>
                  </motion.div>
                )}

                {/* Limit reached notice */}
                {usageData.contractsGenerated >= usageData.monthlyLimit && (
                  <motion.div
                    className={styles.limitReachedNotice}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <span>Monatslimit erreicht!</span>
                    <button
                      className={styles.upgradeLink}
                      onClick={() => window.location.href = '/pricing'}
                    >
                      Upgrade auf Enterprise
                    </button>
                  </motion.div>
                )}
              </div>
            </div>
          )}

          {/* Main Content */}
          <div className={`${styles.contentGrid} ${showPreview ? styles.withPreview : ''}`}>
            {/* Left Panel - Forms */}
            <motion.div
              className={`${styles.formPanel} ${currentStep === 3 ? styles.formPanelCentered : ''}`}
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
                      <div className={styles.stepHeaderContent}>
                        <div>
                          <h2>Welchen Vertrag möchten Sie erstellen?</h2>
                          <p>Wählen Sie den passenden Vertragstyp aus unserer erweiterten Bibliothek</p>
                        </div>
                        <motion.button
                          className={`${styles.headerButton} ${styles.primaryButton} ${!selectedType ? styles.disabled : ''}`}
                          onClick={() => {
                            if (selectedType) {
                              setCurrentStep(2);
                            }
                          }}
                          disabled={!selectedType || userPlan === 'free'}
                          whileHover={selectedType && userPlan !== 'free' ? { scale: 1.02 } : {}}
                          whileTap={selectedType && userPlan !== 'free' ? { scale: 0.98 } : {}}
                        >
                          <span>Weiter</span>
                          <ArrowRight size={18} />
                        </motion.button>
                      </div>
                    </div>

                    <div className={styles.contractTypesGrid}>
                      {CONTRACT_TYPES.map((type) => (
                        <motion.button
                          key={type.id}
                          className={`${styles.contractTypeCard} ${selectedType?.id === type.id ? styles.selected : ''} ${userPlan === 'free' ? styles.locked : ''}`}
                          onClick={() => {
                            if (userPlan === 'free') {
                              // Free users: show upgrade notice
                              toast.info('🔒 Vertragserstellung nur mit Business/Enterprise verfügbar');
                              return;
                            }
                            handleTypeSelect(type);
                          }}
                          disabled={false} // Allow clicks for toast messages
                          whileHover={userPlan !== 'free' ? { scale: 1.02, y: -4 } : { scale: 1.01 }}
                          whileTap={userPlan !== 'free' ? { scale: 0.98 } : {}}
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

                {/* Step 2: Mode Toggle (shared between Detailliert & Geführt) */}
                {currentStep === 2 && selectedType && (
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    gap: '4px', margin: '-8px auto 16px', padding: '4px',
                    background: '#f3f4f6', borderRadius: '12px', width: 'fit-content'
                  }}>
                    <button
                      onClick={() => setInputMode('detailed')}
                      style={{
                        padding: '9px 18px', border: 'none', borderRadius: '10px',
                        fontSize: '13px', fontWeight: inputMode === 'detailed' ? 600 : 400,
                        cursor: 'pointer', transition: 'all 0.2s',
                        background: inputMode === 'detailed' ? 'white' : 'transparent',
                        color: inputMode === 'detailed' ? '#111827' : '#6b7280',
                        boxShadow: inputMode === 'detailed' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'
                      }}
                    >
                      Detailliert
                    </button>
                    <button
                      onClick={() => setInputMode('guided')}
                      style={{
                        padding: '9px 18px', border: 'none', borderRadius: '10px',
                        fontSize: '13px', fontWeight: inputMode === 'guided' ? 600 : 400,
                        cursor: 'pointer', transition: 'all 0.2s',
                        background: inputMode === 'guided' ? 'white' : 'transparent',
                        color: inputMode === 'guided' ? '#111827' : '#6b7280',
                        boxShadow: inputMode === 'guided' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'
                      }}
                    >
                      Geführt
                    </button>
                  </div>
                )}

                {/* Step 2a: Form Fields (Detailliert) */}
                {currentStep === 2 && selectedType && inputMode === 'detailed' && (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className={styles.stepContent}
                  >
                    {/* Zentrierter Header - unabhängig von Sidebar */}
                    <div className={styles.step2Header}>
                      <motion.button
                        className={`${styles.headerButton} ${styles.secondaryButton} ${styles.backButtonAbsolute}`}
                        onClick={() => setCurrentStep(1)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <ArrowLeft size={18} />
                        <span>Zurück</span>
                      </motion.button>
                      <div className={styles.step2HeaderCenter}>
                        <h2>{selectedType.name} erstellen</h2>
                        <p>Füllen Sie die benötigten Informationen aus</p>
                      </div>
                      {/* Sidebar Toggle Button (Desktop + Mobile) - dezent & klein */}
                      <motion.button
                        className={`${styles.sidebarToggleBtn} ${sidebarOpen ? styles.sidebarToggleActive : ''}`}
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        title={sidebarOpen ? 'Werkzeuge ausblenden' : 'Werkzeuge einblenden'}
                      >
                        <FileText size={14} />
                        <span>Vorlagen</span>
                      </motion.button>
                    </div>

                    {/* Step 2 Layout: Main + Floating Sidebar */}
                    <div className={styles.step2LayoutWrapper}>
                      {/* Main Content Area - Always Centered */}
                      <div className={styles.contractForm}>
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
                            disabled={userPlan === 'free'}
                          />
                        </div>

                        {/* Dynamic Fields with Accordion Grouping */}
                        {(() => {
                          const groupedFields = selectedType.fields.reduce((groups, field) => {
                            const group = field.group || 'Allgemeine Angaben';
                            if (!groups[group]) groups[group] = [];
                            groups[group].push(field);
                            return groups;
                          }, {} as Record<string, typeof selectedType.fields>);

                          return Object.entries(groupedFields).map(([groupName, fields], index) => {
                            const progress = getGroupProgress(fields);
                            const isExpanded = expandedGroups.has(groupName);

                            return (
                              <div
                                key={groupName}
                                className={`${styles.accordionGroup} ${isExpanded ? styles.accordionExpanded : ''} ${progress.isComplete ? styles.accordionComplete : ''}`}
                              >
                                {/* Accordion Header */}
                                <button
                                  type="button"
                                  className={styles.accordionHeader}
                                  onClick={() => toggleGroup(groupName)}
                                  aria-expanded={isExpanded}
                                >
                                  <div className={styles.accordionHeaderLeft}>
                                    <span className={styles.accordionNumber}>{index + 1}</span>
                                    <span className={styles.accordionTitle}>{groupName}</span>
                                    {progress.isComplete && (
                                      <span className={styles.accordionCheckmark}>✓</span>
                                    )}
                                  </div>
                                  <div className={styles.accordionHeaderRight}>
                                    <span className={styles.accordionProgress}>
                                      {progress.filledRequired}/{progress.required} Pflichtfelder
                                      {progress.optional > 0 && ` · ${progress.filledOptional}/${progress.optional} optional`}
                                    </span>
                                    <span className={`${styles.accordionChevron} ${isExpanded ? styles.accordionChevronOpen : ''}`}>
                                      ▼
                                    </span>
                                  </div>
                                </button>

                                {/* Accordion Content */}
                                <div className={`${styles.accordionContent} ${isExpanded ? styles.accordionContentOpen : ''}`}>
                                  <div className={styles.groupFields}>
                                    {fields.filter(field => shouldShowField(field)).map((field) => (
                                      <div
                                        key={field.name}
                                        className={styles.formGroup}
                                        data-fullwidth={field.type === 'textarea' ? 'true' : undefined}
                                      >
                                        <label htmlFor={field.name}>
                                          {field.label} {field.required && '*'}
                                        </label>
                                        {field.helpText && (
                                          <span className={styles.helpText}>{field.helpText}</span>
                                        )}

                                        {field.type === 'textarea' ? (
                                          <textarea
                                            id={field.name}
                                            rows={4}
                                            value={formData[field.name] || ''}
                                            onChange={(e) => handleInputChange(field.name, e.target.value)}
                                            placeholder={field.placeholder}
                                            disabled={userPlan === 'free'}
                                            className={
                                              field.validation && formData[field.name] && !validateField(field, formData[field.name] || '')
                                                ? styles.inputError
                                                : field.validation && formData[field.name] && validateField(field, formData[field.name] || '')
                                                ? styles.inputSuccess
                                                : ''
                                            }
                                          />
                                        ) : field.type === 'select' ? (
                                          <select
                                            id={field.name}
                                            value={formData[field.name] || ''}
                                            onChange={(e) => handleInputChange(field.name, e.target.value)}
                                            onKeyDown={(e) => handleKeyDown(e, field.name)}
                                            disabled={userPlan === 'free'}
                                            className={`${!formData[field.name] ? styles.placeholder : ''} ${
                                              field.validation && formData[field.name] && !validateField(field, formData[field.name] || '')
                                                ? styles.inputError
                                                : field.validation && formData[field.name] && validateField(field, formData[field.name] || '')
                                                ? styles.inputSuccess
                                                : ''
                                            }`}
                                          >
                                            <option value="">{field.placeholder}</option>
                                            {field.options?.map((option) => (
                                              <option key={option} value={option}>
                                                {option}
                                              </option>
                                            ))}
                                          </select>
                                        ) : field.name === 'price' ? (
                                          <div className={styles.inputWithSuffix}>
                                            <input
                                              id={field.name}
                                              type="text"
                                              value={formData[field.name] || ''}
                                              onChange={(e) => handleInputChange(field.name, e.target.value)}
                                              onKeyDown={(e) => handleKeyDown(e, field.name)}
                                              placeholder={field.placeholder}
                                              disabled={userPlan === 'free'}
                                              className={`${styles.inputWithSuffixField} ${
                                                field.validation && formData[field.name] && !validateField(field, formData[field.name] || '')
                                                  ? styles.inputError
                                                  : field.validation && formData[field.name] && validateField(field, formData[field.name] || '')
                                                  ? styles.inputSuccess
                                                  : ''
                                              }`}
                                            />
                                            <span className={styles.inputSuffix}>€</span>
                                          </div>
                                        ) : (
                                          <input
                                            id={field.name}
                                            type={field.type === 'vat' || field.type === 'phone' || field.type === 'iban' ? 'text' : field.type}
                                            value={formData[field.name] || ''}
                                            onChange={(e) => handleInputChange(field.name, e.target.value)}
                                            onKeyDown={(e) => handleKeyDown(e, field.name)}
                                            placeholder={field.placeholder}
                                            disabled={userPlan === 'free'}
                                            className={
                                              formData[field.name] && !validateField(field, formData[field.name] || '')
                                                ? styles.inputError
                                                : formData[field.name] && validateField(field, formData[field.name] || '') && ['email', 'phone', 'iban', 'vat'].includes(field.type)
                                                ? styles.inputSuccess
                                                : ''
                                            }
                                          />
                                        )}

                                        {/* Validierungsfehler anzeigen */}
                                        {formData[field.name] && !validateField(field, formData[field.name] || '') && (
                                          <span className={styles.fieldError}>
                                            {getValidationMessage(field)}
                                          </span>
                                        )}
                                        {/* Validierungserfolg anzeigen */}
                                        {formData[field.name] && validateField(field, formData[field.name] || '') && ['email', 'phone', 'iban', 'vat'].includes(field.type) && (
                                          <span className={styles.fieldSuccess}>✓ Gültig</span>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            );
                          });
                        })()}
                      </div>

                      {/* Individuelles Freitextfeld für Vertragsanpassungen */}
                      <div className={styles.customRequirementsSection}>
                        <div className={styles.formGroup}>
                          <label htmlFor="customRequirements">
                            Individuelle Anpassungen & Wünsche
                            <span className={styles.optionalBadge}>optional</span>
                          </label>
                          <textarea
                            id="customRequirements"
                            rows={6}
                            value={formData.customRequirements || ''}
                            onChange={(e) => handleInputChange('customRequirements', e.target.value)}
                            placeholder="Geben Sie hier zusätzliche Anforderungen, besondere Vereinbarungen oder individuelle Klauseln für Ihren Vertrag ein..."
                            disabled={userPlan === 'free'}
                            className={styles.customRequirementsTextarea}
                          />
                          <span className={styles.fieldHint}>
                            💡 Diese Informationen werden von der KI berücksichtigt, um Ihren Vertrag individuell anzupassen.
                          </span>
                        </div>
                      </div>

                      {/* 📋 Vorschau der Eingaben */}
                      {showInputPreview && selectedType && (
                        <motion.div
                          className={styles.inputPreviewSection}
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                        >
                          <div className={styles.inputPreviewHeader}>
                            <h4>📋 Zusammenfassung Ihrer Eingaben</h4>
                            <button
                              type="button"
                              onClick={() => setShowInputPreview(false)}
                              className={styles.inputPreviewClose}
                            >
                              ✕
                            </button>
                          </div>
                          <div className={styles.inputPreviewContent}>
                            {(() => {
                              const groupedFields = selectedType.fields.reduce((groups, field) => {
                                const group = field.group || 'Allgemeine Angaben';
                                if (!groups[group]) groups[group] = [];
                                groups[group].push(field);
                                return groups;
                              }, {} as Record<string, typeof selectedType.fields>);

                              return Object.entries(groupedFields).map(([groupName, fields]) => {
                                const filledFields = fields.filter(f => formData[f.name] && formData[f.name]!.toString().trim() !== '');
                                if (filledFields.length === 0) return null;

                                return (
                                  <div key={groupName} className={styles.inputPreviewGroup}>
                                    <h5>{groupName}</h5>
                                    <div className={styles.inputPreviewItems}>
                                      {filledFields.map(field => (
                                        <div key={field.name} className={styles.inputPreviewItem}>
                                          <span className={styles.inputPreviewLabel}>{field.label}:</span>
                                          <span className={styles.inputPreviewValue}>
                                            {formData[field.name]!.length > 100
                                              ? formData[field.name]!.substring(0, 100) + '...'
                                              : formData[field.name]}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                );
                              });
                            })()}
                          </div>
                        </motion.div>
                      )}

                      {/* Buttons Row */}
                      <div className={styles.step2ButtonRow}>
                        {/* Vorschau Button */}
                        <motion.button
                          type="button"
                          className={styles.previewButton}
                          onClick={() => setShowInputPreview(!showInputPreview)}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          {showInputPreview ? '✕ Vorschau schließen' : '👁 Eingaben prüfen'}
                        </motion.button>

                        {/* Erstellen Button */}
                        <motion.button
                          type="button"
                          className={`${styles.generateButton} ${(!isStepComplete(2) || loading) ? styles.disabled : ''}`}
                          onClick={handleGenerate}
                          disabled={loading || userPlan === 'free' || !isStepComplete(2)}
                          whileHover={userPlan !== 'free' && isStepComplete(2) && !loading ? { scale: 1.02 } : {}}
                          whileTap={userPlan !== 'free' && isStepComplete(2) && !loading ? { scale: 0.98 } : {}}
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

                      {/* 💾 Autosave Indikator */}
                      {lastSaved && (
                        <div className={styles.autosaveIndicator}>
                          💾 Automatisch gespeichert um {lastSaved.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      )}
                      </div> {/* Ende contractForm */}
                    </div> {/* Ende step2LayoutWrapper */}

                    {/* Floating Sidebar: Vorlagen + Firmenprofil */}
                    <aside className={`${styles.step2Sidebar} ${sidebarOpen ? styles.sidebarOpen : ''}`}>
                        {/* Sidebar Header mit Toggle */}
                        <div className={styles.sidebarHeader}>
                          <h3>Werkzeuge</h3>
                          <button
                            className={styles.sidebarCloseBtn}
                            onClick={() => setSidebarOpen(false)}
                            aria-label="Sidebar schließen"
                          >
                            ✕
                          </button>
                        </div>

                        {/* Vorlagenbibliothek in Sidebar */}
                        <div className={styles.sidebarSection}>
                          <div className={styles.sidebarSectionHeader}>
                            <FileText size={18} />
                            <span>Vorlagen</span>
                          </div>
                          <EnhancedTemplateLibrary
                            key={templateRefreshKey}
                            contractType={selectedType.id}
                            systemTemplates={CONTRACT_TEMPLATES.filter(t => t.contractType === selectedType.id)}
                            onSelectTemplate={handleTemplateSelect}
                            onCreateTemplate={() => setIsTemplateModalOpen(true)}
                            isPremium={isPremium}
                            compact={true}
                          />
                        </div>

                        {/* Firmenprofil in Sidebar */}
                        {isPremium && (
                          <div className={styles.sidebarSection}>
                            <div className={styles.sidebarSectionHeader}>
                              <Building size={18} />
                              <span>Firmenprofil</span>
                            </div>

                            {!companyProfile ? (
                              <div className={styles.sidebarProfileCreate}>
                                <p>Firmendaten speichern & in Verträgen nutzen</p>
                                <button
                                  className={styles.sidebarCreateBtn}
                                  onClick={() => navigate('/company-profile')}
                                >
                                  Profil erstellen
                                </button>
                              </div>
                            ) : (
                              <div className={styles.sidebarProfileToggle}>
                                <label className={styles.sidebarToggle}>
                                  <input
                                    type="checkbox"
                                    checked={useCompanyProfile}
                                    onChange={(e) => toggleCompanyProfile(e.target.checked)}
                                  />
                                  <span className={styles.toggleSlider}></span>
                                  <span className={styles.toggleLabel}>
                                    {useCompanyProfile ? 'Aktiviert' : 'Deaktiviert'}
                                  </span>
                                </label>
                                {useCompanyProfile && (
                                  <div className={styles.sidebarProfilePreview}>
                                    {companyProfile.logoUrl && (
                                      <img src={companyProfile.logoUrl} alt="Logo" className={styles.sidebarLogo} />
                                    )}
                                    <div className={styles.sidebarProfileInfo}>
                                      <strong>{companyProfile.companyName}</strong>
                                      <small>{companyProfile.city}</small>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Sidebar Footer mit Ausblenden-Button */}
                        <div className={styles.sidebarFooter}>
                          <button
                            className={styles.sidebarHideBtn}
                            onClick={() => setSidebarOpen(false)}
                          >
                            <FileText size={16} />
                            <span>Ausblenden</span>
                          </button>
                        </div>

                      </aside>

                    {/* Sidebar Overlay for Mobile */}
                    {sidebarOpen && (
                      <div
                        className={styles.sidebarOverlay}
                        onClick={() => setSidebarOpen(false)}
                      />
                    )}
                  </motion.div>
                )}

                {/* Step 2b: Geführter Modus (Playbook-Wizard) */}
                {currentStep === 2 && selectedType && inputMode === 'guided' && (
                  <motion.div
                    key="step2guided"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className={styles.stepContent}
                  >
                    {/* Header mit Zurück-Button */}
                    <div className={styles.step2Header}>
                      <motion.button
                        className={`${styles.headerButton} ${styles.secondaryButton} ${styles.backButtonAbsolute}`}
                        onClick={() => setCurrentStep(1)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <ArrowLeft size={18} />
                        <span>Zurück</span>
                      </motion.button>
                      <div className={styles.step2HeaderCenter}>
                        <h2>{selectedType.name} erstellen</h2>
                        <p>Geführte Erstellung mit strategischen Entscheidungen</p>
                      </div>
                    </div>

                    {/* Eingebetteter Playbook-Wizard */}
                    <GuidedContractWizard
                      contractType={selectedType.id}
                      contractTypeName={selectedType.name}
                      onComplete={(generatedResult) => {
                        // Ergebnis in Generate-State übernehmen
                        setContractText(generatedResult.contractText);
                        setSavedContractId(generatedResult.contractId);
                        setCurrentStep(3);
                      }}
                    />
                  </motion.div>
                )}

                {/* Step 3: Generated Contract - PROFESSIONAL REDESIGN */}
                {currentStep === 3 && (
                  <motion.div
                    key="step3"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className={styles.step3ContainerNew}
                  >
                    {/* Compact Success Header with Actions */}
                    <div className={styles.step3SuccessHeader}>
                      <div className={styles.step3SuccessLeft}>
                        <div className={styles.step3SuccessIcon}>
                          <CheckCircle size={24} />
                        </div>
                        <div className={styles.step3SuccessText}>
                          <h2>Ihr Vertrag ist fertig!</h2>
                          <p>Überprüfen, speichern oder zur Signatur versenden</p>
                        </div>
                      </div>
                      <div className={styles.step3SuccessActions}>
                        <motion.button
                          onClick={handleCopy}
                          className={`${styles.step3HeaderBtn} ${styles.secondary} ${copied ? styles.success : ''}`}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          {copied ? <Check size={16} /> : <Clipboard size={16} />}
                          <span>{copied ? "Kopiert!" : "Kopieren"}</span>
                        </motion.button>
                        <motion.button
                          onClick={handleDownloadPDF}
                          disabled={isGeneratingPDF || !contractText}
                          className={`${styles.step3HeaderBtn} ${styles.secondary}`}
                          whileHover={!isGeneratingPDF ? { scale: 1.02 } : {}}
                          whileTap={!isGeneratingPDF ? { scale: 0.98 } : {}}
                        >
                          {isGeneratingPDF ? (
                            <div className={styles.tinySpinner}></div>
                          ) : (
                            <Download size={16} />
                          )}
                          <span>PDF</span>
                        </motion.button>
                        <motion.button
                          onClick={handleSave}
                          className={`${styles.step3HeaderBtn} ${saved ? styles.success : styles.primary}`}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          {saved ? <Check size={16} /> : <Save size={16} />}
                          <span>{saved ? "Gespeichert" : "Speichern"}</span>
                        </motion.button>
                        <motion.button
                          onClick={handleSendForSignature}
                          disabled={!saved || !savedContractId}
                          className={`${styles.step3HeaderBtn} ${styles.accent}`}
                          whileHover={saved ? { scale: 1.02 } : {}}
                          whileTap={saved ? { scale: 0.98 } : {}}
                          title={!saved ? "Bitte speichern Sie den Vertrag zuerst" : "Zur Signatur versenden"}
                        >
                          <Send size={16} />
                          <span>Zur Signatur</span>
                        </motion.button>
                        <motion.button
                          onClick={handleOpenInBuilder}
                          disabled={isImportingToBuilder || !contractText}
                          className={`${styles.step3HeaderBtn} ${styles.builder}`}
                          whileHover={!isImportingToBuilder ? { scale: 1.02 } : {}}
                          whileTap={!isImportingToBuilder ? { scale: 0.98 } : {}}
                          title="Im Contract Builder visuell bearbeiten"
                        >
                          {isImportingToBuilder ? (
                            <div className={styles.tinySpinner}></div>
                          ) : (
                            <Wrench size={16} />
                          )}
                          <span>Im Builder</span>
                        </motion.button>
                      </div>
                    </div>

                    {/* Error Display */}
                    {downloadError && (
                      <motion.div
                        className={styles.step3Error}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                      >
                        <span>❌ {downloadError}</span>
                      </motion.div>
                    )}

                    {/* Two Column Layout */}
                    <div className={styles.step3TwoColumn}>
                      {/* Left Column: Editor + Design + Attachments */}
                      <div className={styles.step3LeftColumn}>
                        {/* Design Selector Carousel */}
                        {isPremium && (
                          <div className={styles.step3DesignCompact}>
                            <div className={styles.step3DesignHeader}>
                              <span><Sparkles size={16} /> Design</span>
                              <div className={styles.designHeaderRight}>
                                <span className={styles.designCount}>{allDesigns.length} Varianten</span>
                                <button
                                  className={styles.customDesignBtn}
                                  onClick={() => setShowCustomDesignModal(true)}
                                  disabled={isChangingDesign || !saved}
                                >
                                  <Palette size={14} />
                                  Eigenes Design
                                </button>
                              </div>
                            </div>
                            <div className={styles.step3DesignCarousel}>
                              <button
                                className={styles.carouselArrow}
                                onClick={() => setDesignCarouselIndex(Math.max(0, designCarouselIndex - 1))}
                                disabled={designCarouselIndex === 0 || isChangingDesign || !saved}
                              >
                                <ArrowLeft size={16} />
                              </button>
                              <div className={styles.step3DesignOptions}>
                                {allDesigns
                                  .slice(designCarouselIndex, designCarouselIndex + VISIBLE_DESIGNS)
                                  .map((design) => (
                                  <motion.button
                                    key={design.id}
                                    className={`${styles.step3DesignOption} ${selectedDesignVariant === design.id ? styles.active : ''}`}
                                    onClick={() => handleDesignChange(design.id)}
                                    disabled={isChangingDesign || !saved}
                                    whileHover={saved ? { scale: 1.03 } : {}}
                                    whileTap={saved ? { scale: 0.97 } : {}}
                                  >
                                    <div className={styles.step3DesignPreview} style={{ background: design.color }}>
                                      <div className={styles.previewLines}>
                                        <div className={styles.pLine}></div>
                                        <div className={styles.pLine}></div>
                                        <div className={styles.pLine}></div>
                                      </div>
                                    </div>
                                    <span>{design.name}</span>
                                    {selectedDesignVariant === design.id && (
                                      <div className={styles.step3DesignCheck}>
                                        <Check size={10} />
                                      </div>
                                    )}
                                    {isChangingDesign && selectedDesignVariant !== design.id && (
                                      <div className={styles.step3DesignLoading}>
                                        <div className={styles.tinySpinner}></div>
                                      </div>
                                    )}
                                  </motion.button>
                                ))}
                              </div>
                              <button
                                className={styles.carouselArrow}
                                onClick={() => setDesignCarouselIndex(Math.min(allDesigns.length - VISIBLE_DESIGNS, designCarouselIndex + 1))}
                                disabled={designCarouselIndex >= allDesigns.length - VISIBLE_DESIGNS || isChangingDesign || !saved}
                              >
                                <ArrowRight size={16} />
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Text Editor Panel */}
                        <div className={styles.step3EditorPanel}>
                          <div className={styles.step3EditorHeader}>
                            <div className={styles.step3EditorTitle}>
                              <Edit3 size={16} />
                              <span>Vertragstext bearbeiten</span>
                            </div>
                            <div className={styles.step3EditorActions}>
                              {!showImprovementSection && (
                                <button
                                  className={styles.step3EditorBtn}
                                  onClick={() => setShowImprovementSection(true)}
                                  disabled={isImproving}
                                >
                                  <Sparkles size={14} />
                                  KI verbessern
                                </button>
                              )}
                              <motion.button
                                className={`${styles.step3EditorBtn} ${styles.primary}`}
                                onClick={generatePDFPreview}
                                disabled={isGeneratingPreview || !contractText}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                              >
                                {isGeneratingPreview ? (
                                  <div className={styles.tinySpinner}></div>
                                ) : (
                                  <RefreshCw size={14} />
                                )}
                                PDF aktualisieren
                              </motion.button>
                            </div>
                          </div>

                          {/* Improvement Section (collapsible) */}
                          <AnimatePresence>
                            {showImprovementSection && (
                              <motion.div
                                className={styles.step3ImprovementBar}
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                              >
                                <textarea
                                  value={improvements}
                                  onChange={(e) => setImprovements(e.target.value)}
                                  placeholder="Änderungswünsche eingeben, z.B.: Käufer heißt Schmidt, Zahlungsfrist auf 30 Tage ändern..."
                                  disabled={isImproving}
                                  rows={2}
                                />
                                <div className={styles.step3ImprovementActions}>
                                  <button onClick={() => { setShowImprovementSection(false); setImprovements(""); }} disabled={isImproving}>
                                    Abbrechen
                                  </button>
                                  <button
                                    className={styles.primary}
                                    onClick={handleImproveContract}
                                    disabled={isImproving || !improvements.trim()}
                                  >
                                    {isImproving ? (
                                      <>
                                        <div className={styles.tinySpinner}></div>
                                        Verbessere...
                                      </>
                                    ) : (
                                      <>
                                        <Sparkles size={14} />
                                        Anwenden
                                      </>
                                    )}
                                  </button>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>

                          <div className={styles.step3EditorContent}>
                            <textarea
                              value={contractText}
                              onChange={(e) => {
                                setContractText(e.target.value);
                                if (pdfPreviewUrl) setPdfPreviewUrl(null);
                                setSaved(false);
                              }}
                              placeholder="Vertragstext..."
                            />
                          </div>
                        </div>

                        {/* Attachments Panel */}
                        <div className={styles.step3AttachmentsPanel}>
                          <div className={styles.step3AttachmentsHeader}>
                            <div className={styles.step3AttachmentsTitle}>
                              <Paperclip size={16} />
                              <span>Anlagen</span>
                              {attachments.length > 0 && (
                                <span className={styles.step3AttachmentsBadge}>
                                  {attachments.length}
                                </span>
                              )}
                              <span
                                className={styles.step3AttachmentsInfo}
                                title="Anlagen werden beim PDF-Download automatisch an das Dokument angehängt"
                              >
                                <Info size={14} />
                              </span>
                            </div>
                          </div>
                          <div className={styles.step3AttachmentsContent}>
                            <div
                              className={`${styles.step3Dropzone} ${isDraggingAttachment ? styles.dragging : ''}`}
                              onDragOver={(e) => { e.preventDefault(); setIsDraggingAttachment(true); }}
                              onDragLeave={() => setIsDraggingAttachment(false)}
                              onDrop={handleAttachmentDrop}
                            >
                              <input
                                type="file"
                                multiple
                                accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                                onChange={handleAttachmentSelect}
                                id="attachment-upload-new"
                              />
                              <label htmlFor="attachment-upload-new">
                                <Upload size={20} />
                                <span>Dateien hierher ziehen oder <strong>klicken</strong></span>
                              </label>
                            </div>

                            {attachments.length > 0 && (
                              <div className={styles.step3AttachmentsList}>
                                {attachments.map((attachment, index) => (
                                  <motion.div
                                    key={attachment.id}
                                    className={styles.step3AttachmentItem}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                  >
                                    <div className={styles.step3AttachmentIcon}>
                                      {attachment.type.includes('pdf') ? <FileText size={16} /> :
                                       attachment.type.includes('image') ? <Image size={16} /> :
                                       <File size={16} />}
                                    </div>
                                    <input
                                      type="text"
                                      value={attachment.displayName}
                                      onChange={(e) => updateAttachmentName(attachment.id, e.target.value)}
                                      placeholder="Benennen..."
                                    />
                                    <span className={styles.step3AttachmentSize}>
                                      {(attachment.size / 1024 / 1024).toFixed(1)} MB
                                    </span>
                                    <button onClick={() => removeAttachment(attachment.id)}>
                                      <X size={14} />
                                    </button>
                                  </motion.div>
                                ))}

                                {saved && (
                                  <div className={styles.step3DownloadRow}>
                                    <span>Download:</span>
                                    <button onClick={() => handleDownloadWithAttachments('zip')} disabled={isDownloadingAttachments}>
                                      <Archive size={14} /> ZIP
                                    </button>
                                    <button onClick={() => handleDownloadWithAttachments('combined')} disabled={isDownloadingAttachments}>
                                      <FileText size={14} /> PDF
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right Column: PDF Preview (Sticky) */}
                      <div className={styles.step3RightColumn}>
                        <div className={styles.step3PdfPanel}>
                          <div className={styles.step3PdfHeader}>
                            <FileText size={16} />
                            <span>PDF-Vorschau</span>
                            {isGeneratingPreview && <div className={styles.tinySpinner}></div>}
                          </div>
                          <div className={styles.step3PdfContent}>
                            {isGeneratingPreview ? (
                              <div className={styles.step3PdfLoading}>
                                <div className={styles.loadingSpinner}></div>
                                <p>PDF wird generiert...</p>
                              </div>
                            ) : pdfPreviewUrl ? (
                              <iframe
                                src={pdfPreviewUrl}
                                title="PDF Vorschau"
                              />
                            ) : (
                              <div className={styles.step3PdfEmpty}>
                                <FileText size={32} />
                                <p>Klicken Sie auf "PDF aktualisieren"</p>
                                <button onClick={generatePDFPreview}>
                                  <RefreshCw size={14} />
                                  Vorschau laden
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Seitenumbrüche Panel — unter PDF-Vorschau */}
                        {isPremium && pdfPreviewUrl && parsedSections.length > 0 && (
                          <div className={styles.step3PageBreaks}>
                            <div
                              className={styles.step3PageBreaksHeader}
                              onClick={() => setShowPageBreaks(!showPageBreaks)}
                            >
                              <div className={styles.step3PageBreaksTitle}>
                                <Scissors size={16} />
                                <span>Seitenumbrüche</span>
                                {pageBreaks.length > 0 && (
                                  <span className={styles.step3PageBreaksBadge}>{pageBreaks.length}</span>
                                )}
                              </div>
                              <ChevronDown
                                size={16}
                                style={{
                                  transform: showPageBreaks ? 'rotate(180deg)' : 'rotate(0deg)',
                                  transition: 'transform 0.2s ease'
                                }}
                              />
                            </div>
                            <AnimatePresence>
                              {showPageBreaks && (
                                <motion.div
                                  className={styles.step3PageBreaksList}
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.2 }}
                                >
                                  <p className={styles.step3PageBreaksHint}>
                                    Klicke auf einen Abschnitt, um davor einen Seitenumbruch einzufügen
                                  </p>
                                  <div className={styles.step3PageBreaksChips}>
                                    {parsedSections.filter(sec => sec.title !== 'Präambel').map((sec) => (
                                      <button
                                        key={sec.index}
                                        className={`${styles.pageBreakChip} ${pageBreaks.includes(sec.index) ? styles.active : ''}`}
                                        onClick={() => {
                                          setPageBreaks(prev =>
                                            prev.includes(sec.index)
                                              ? prev.filter(i => i !== sec.index)
                                              : [...prev, sec.index]
                                          );
                                        }}
                                      >
                                        {sec.title.length > 40 ? sec.title.substring(0, 40) + '…' : sec.title}
                                      </button>
                                    ))}
                                  </div>
                                  <button
                                    className={styles.pageBreaksApply}
                                    onClick={generatePDFPreview}
                                    disabled={isGeneratingPreview}
                                  >
                                    {isGeneratingPreview ? (
                                      <div className={styles.tinySpinner}></div>
                                    ) : (
                                      <RefreshCw size={13} />
                                    )}
                                    PDF mit Umbrüchen aktualisieren
                                  </button>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Footer */}
                    <div className={styles.step3Footer}>
                      <motion.button
                        className={styles.step3BackBtn}
                        onClick={() => {
                          setCurrentStep(1);
                          setSelectedType(null);
                          setFormData({});
                          setContractText("");
                          setGeneratedHTML("");
                          setShowPreview(false);
                          setSavedContractId(null);
                          setSaved(false);
                          setIsGeneratingPDF(false);
                          setDownloadError(null);
                          setPdfPreviewUrl(null);
                          setIsGeneratingPreview(false);
                          setAttachments([]);
                        }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <ArrowLeft size={16} />
                        <span>Neuen Vertrag erstellen</span>
                      </motion.button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
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

        {/* Draft Dialog - Entwurf weiter bearbeiten oder neu beginnen */}
        <AnimatePresence>
          {showDraftDialog && pendingDraft && (
            <motion.div
              className={styles.draftDialogOverlay}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className={styles.draftDialog}
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
              >
                <div className={styles.draftDialogIcon}>
                  <FileText size={32} />
                </div>
                <h3>Entwurf gefunden</h3>
                <p>
                  Sie haben einen unvollständigen <strong>{CONTRACT_TYPES.find(t => t.id === pendingDraft.selectedTypeId)?.name || 'Vertrag'}</strong> vom{' '}
                  {new Date(pendingDraft.savedAt).toLocaleDateString('de-DE', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })} Uhr.
                </p>
                <div className={styles.draftDialogButtons}>
                  <button
                    className={styles.draftDialogBtnPrimary}
                    onClick={handleContinueDraft}
                  >
                    <Edit3 size={18} />
                    Weiter bearbeiten
                  </button>
                  <button
                    className={styles.draftDialogBtnSecondary}
                    onClick={handleDiscardDraft}
                  >
                    <Sparkles size={18} />
                    Neu beginnen
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Create Template Modal */}
        <CreateTemplateModal
          isOpen={isTemplateModalOpen}
          onClose={() => setIsTemplateModalOpen(false)}
          onSave={handleCreateTemplate}
          contractType={selectedType?.id || ''}
          contractTypeName={selectedType?.name || ''}
          currentFormData={formData}
        />

        {/* NEW: Enhanced Signature Modal */}
        {showSignatureModal && saved && contractS3Key && (
          <EnhancedSignatureModal
            show={showSignatureModal}
            onClose={() => setShowSignatureModal(false)}
            contractId={savedContractId || ''}
            contractName={formData.title || selectedType?.name || 'Vertrag'}
            contractS3Key={contractS3Key}
          />
        )}

        {/* Custom Design Modal */}
        <AnimatePresence>
          {showCustomDesignModal && (
            <motion.div
              className={styles.customDesignOverlay}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCustomDesignModal(false)}
            >
              <motion.div
                className={styles.customDesignModal}
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className={styles.customDesignHeader}>
                  <h3><Palette size={20} /> Eigenes Design erstellen</h3>
                  <button
                    className={styles.customDesignClose}
                    onClick={() => setShowCustomDesignModal(false)}
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className={styles.customDesignContent}>
                  {/* Color Picker Section */}
                  <div className={styles.customDesignSection}>
                    <h4>Farben</h4>
                    <div className={styles.colorPickerGrid}>
                      <div className={styles.colorPickerItem}>
                        <label>Primärfarbe</label>
                        <div className={styles.colorInputWrapper}>
                          <input
                            type="color"
                            value={customDesign.primaryColor}
                            onChange={(e) => setCustomDesign({ ...customDesign, primaryColor: e.target.value })}
                            className={styles.colorInput}
                          />
                          <span>{customDesign.primaryColor}</span>
                        </div>
                      </div>
                      <div className={styles.colorPickerItem}>
                        <label>Sekundärfarbe</label>
                        <div className={styles.colorInputWrapper}>
                          <input
                            type="color"
                            value={customDesign.secondaryColor}
                            onChange={(e) => setCustomDesign({ ...customDesign, secondaryColor: e.target.value })}
                            className={styles.colorInput}
                          />
                          <span>{customDesign.secondaryColor}</span>
                        </div>
                      </div>
                      <div className={styles.colorPickerItem}>
                        <label>Akzentfarbe</label>
                        <div className={styles.colorInputWrapper}>
                          <input
                            type="color"
                            value={customDesign.accentColor}
                            onChange={(e) => setCustomDesign({ ...customDesign, accentColor: e.target.value })}
                            className={styles.colorInput}
                          />
                          <span>{customDesign.accentColor}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Font Selection */}
                  <div className={styles.customDesignSection}>
                    <h4>Schriftart</h4>
                    <div className={styles.fontGrid}>
                      {fontOptions.map((font) => (
                        <button
                          key={font.id}
                          className={`${styles.fontOption} ${customDesign.fontFamily === font.id ? styles.active : ''}`}
                          onClick={() => setCustomDesign({ ...customDesign, fontFamily: font.id })}
                        >
                          <span className={styles.fontName} style={{ fontFamily: font.id === 'Courier' ? 'monospace' : font.id === 'Times-Roman' ? 'Times New Roman, serif' : 'Helvetica, sans-serif' }}>
                            {font.name}
                          </span>
                          <span className={styles.fontDesc}>{font.desc}</span>
                          {customDesign.fontFamily === font.id && <Check size={14} className={styles.fontCheck} />}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Layout Selection */}
                  <div className={styles.customDesignSection}>
                    <h4>Layout</h4>
                    <div className={styles.layoutGrid}>
                      {layoutOptions.map((layout) => (
                        <button
                          key={layout.id}
                          className={`${styles.layoutOption} ${customDesign.layout === layout.id ? styles.active : ''}`}
                          onClick={() => setCustomDesign({ ...customDesign, layout: layout.id })}
                        >
                          <div className={styles.layoutPreview} data-layout={layout.id}>
                            <div className={styles.layoutLines}>
                              <div></div>
                              <div></div>
                              <div></div>
                            </div>
                          </div>
                          <span>{layout.name}</span>
                          {customDesign.layout === layout.id && <Check size={14} className={styles.layoutCheck} />}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Preview */}
                  <div className={styles.customDesignPreviewSection}>
                    <h4>Vorschau</h4>
                    <div
                      className={styles.customDesignPreviewBox}
                      style={{
                        background: `linear-gradient(135deg, ${customDesign.primaryColor} 0%, ${customDesign.secondaryColor} 100%)`,
                        borderColor: customDesign.accentColor
                      }}
                    >
                      <div className={styles.previewHeader} style={{ borderColor: customDesign.accentColor }}>
                        <div style={{ background: customDesign.accentColor }}></div>
                      </div>
                      <div className={styles.previewBody}>
                        <div style={{ background: 'rgba(255,255,255,0.3)' }}></div>
                        <div style={{ background: 'rgba(255,255,255,0.2)' }}></div>
                        <div style={{ background: 'rgba(255,255,255,0.15)' }}></div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className={styles.customDesignFooter}>
                  <button
                    className={styles.customDesignCancelBtn}
                    onClick={() => setShowCustomDesignModal(false)}
                  >
                    Abbrechen
                  </button>
                  <button
                    className={styles.customDesignApplyBtn}
                    onClick={() => {
                      handleDesignChange('custom', customDesign);
                      setShowCustomDesignModal(false);
                      toast.success('Eigenes Design angewendet!');
                    }}
                  >
                    <Check size={16} />
                    Design anwenden
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}