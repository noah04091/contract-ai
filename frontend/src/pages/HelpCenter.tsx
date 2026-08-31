import React, { useState, useMemo, useEffect } from 'react';
import {
  Search, FileText, BarChart3, Download,
  ChevronDown, Upload, Wand2, GitCompare, MessageSquare, Zap,
  Calendar, FileSignature, User, CreditCard, FolderOpen, Bell,
  Building2, FileCheck, Shield, ArrowRight,
  AlertCircle, Info, Sparkles, Mail,
  Filter, Layout, X, Lightbulb
} from 'lucide-react';
import { Helmet } from "react-helmet-async";
import { Link } from 'react-router-dom';
import styles from '../styles/HelpCenter.module.css';
import LandingFooter from '../components/LandingFooter';

interface GuideSection {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  category: 'basics' | 'features' | 'premium' | 'settings';
  steps: {
    title: string;
    description: string;
    tips?: string[];
  }[];
}

interface FAQItem {
  question: string;
  answer: string;
  category: 'general' | 'technical' | 'billing' | 'security';
}

const HelpCenter: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'guides' | 'faq'>('guides');
  const [openFAQ, setOpenFAQ] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedGuide, setExpandedGuide] = useState<string | null>(null);

  // SEO: Structured Data Schemas
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://www.contract-ai.de" },
      { "@type": "ListItem", "position": 2, "name": "Hilfe-Center", "item": "https://www.contract-ai.de/hilfe" }
    ]
  };

  // 📚 KOMPLETTE FEATURE-ANLEITUNGEN (Super einfach erklärt!)
  const guides: GuideSection[] = [
    {
      id: 'upload-contract',
      icon: <Upload size={24} />,
      title: 'Vertrag hochladen & analysieren',
      description: 'So lädst du deinen ersten Vertrag hoch und lässt ihn analysieren',
      category: 'basics',
      steps: [
        {
          title: '1. Zur Verträge-Seite navigieren',
          description: 'Klicke in der Navigation oben auf "Verträge" oder geh zu Dashboard und klicke dort auf "Neuer Vertrag".',
        },
        {
          title: '2. Datei auswählen',
          description: 'Klicke auf "Vertrag hochladen" oder zieh die PDF-Datei einfach per Drag & Drop in den markierten Bereich.',
          tips: ['Unterstützte Formate: PDF, DOCX', 'Maximale Dateigröße: 10 MB', 'Mehrere Dateien gleichzeitig möglich']
        },
        {
          title: '3. Analyse warten',
          description: 'Die KI analysiert deinen Vertrag automatisch. Das dauert etwa 30-60 Sekunden. Du siehst einen Fortschrittsbalken.',
        },
        {
          title: '4. Ergebnisse ansehen',
          description: 'Nach der Analyse siehst du: Contract Score (0-100), erkannte Risiken, Verbesserungsvorschläge, Laufzeit & Kündigungsfrist.',
          tips: ['Grüner Score = guter Vertrag', 'Gelber Score = Vorsicht', 'Roter Score = hohe Risiken']
        }
      ]
    },
    {
      id: 'dashboard',
      icon: <Layout size={24} />,
      title: 'Dashboard verstehen',
      description: 'Übersicht über alle wichtigen Vertrags-Statistiken',
      category: 'basics',
      steps: [
        {
          title: '1. Übersicht öffnen',
          description: 'Das Dashboard ist deine Startseite nach dem Login. Hier siehst du alles auf einen Blick.',
        },
        {
          title: '2. Prioritäts-Verträge',
          description: 'Oben werden die wichtigsten Verträge angezeigt: Bald ablaufende (< 30 Tage), Verträge mit Erinnerung, neueste Uploads.',
        },
        {
          title: '3. Statistiken',
          description: 'Sieh Diagramme: Anzahl Verträge, durchschnittlicher Contract Score, Verteilung nach Status.',
        },
        {
          title: '4. Anstehende Fristen',
          description: 'Widget zeigt kommende Kündigungsfristen und wichtige Termine aus deinem Vertrags-Kalender.',
        }
      ]
    },
    {
      id: 'optimizer',
      icon: <Wand2 size={24} />,
      title: 'Verträge optimieren',
      description: 'So verbesserst du deine Verträge mit KI-Unterstützung',
      category: 'premium',
      steps: [
        {
          title: '1. Optimizer öffnen',
          description: 'Klicke in der Navigation auf "Optimizer" oder öffne einen Vertrag und klicke auf "Optimieren".',
        },
        {
          title: '2. Vertrag auswählen',
          description: 'Wähle einen bestehenden Vertrag aus deiner Liste ODER lade einen neuen Vertrag hoch.',
        },
        {
          title: '3. Optimierungen prüfen',
          description: 'Die KI zeigt dir konkrete Verbesserungsvorschläge: Klauseln umformulieren, fehlende Regelungen ergänzen, Risiken entschärfen.',
          tips: ['Jeder Vorschlag zeigt: Original vs. Verbesserung', 'Begründung für die Änderung', 'Schweregrad der Optimierung']
        },
        {
          title: '4. Änderungen übernehmen',
          description: 'Wähle die gewünschten Optimierungen aus und generiere eine verbesserte Version als DOCX oder PDF.',
        },
        {
          title: '5. Speichern & Exportieren',
          description: 'Lade die optimierte Version herunter oder speichere sie direkt in deiner Vertragsverwaltung.',
        }
      ]
    },
    {
      id: 'compare',
      icon: <GitCompare size={24} />,
      title: 'Verträge vergleichen',
      description: 'Zwei Verträge direkt gegenüberstellen und Unterschiede finden',
      category: 'premium',
      steps: [
        {
          title: '1. Compare-Tool öffnen',
          description: 'Navigiere zu "Vergleichen" in der Hauptnavigation.',
        },
        {
          title: '2. Profil auswählen',
          description: 'Wähle dein Profil: Privatperson, Freelancer oder Unternehmen. Die Analyse passt sich automatisch an.',
        },
        {
          title: '3. Zwei Verträge hochladen',
          description: 'Lade Vertrag 1 und Vertrag 2 hoch. Du kannst auch aus deinen bestehenden Verträgen auswählen.',
        },
        {
          title: '4. Unterschiede analysieren',
          description: 'Die KI zeigt alle relevanten Unterschiede: Kosten, Laufzeit, Kündigungsfristen, Leistungsumfang, Haftungsregelungen.',
          tips: ['Farbcodierung: Grün = besser in Vertrag 1, Rot = besser in Vertrag 2', 'Schweregrad: Kritisch, Hoch, Mittel, Niedrig']
        },
        {
          title: '5. Empfehlung erhalten',
          description: 'Am Ende gibt die KI eine klare Empfehlung: Welcher Vertrag ist für dich besser und warum?',
        }
      ]
    },
    {
      id: 'generate',
      icon: <FileCheck size={24} />,
      title: 'Verträge generieren',
      description: 'Professionelle Verträge mit KI erstellen',
      category: 'premium',
      steps: [
        {
          title: '1. Generator öffnen',
          description: 'Klicke auf "Generieren" in der Hauptnavigation.',
        },
        {
          title: '2. Vertragstyp wählen',
          description: 'Wähle aus 15+ Vorlagen: Freelancer-Vertrag, Mietvertrag, NDA, Arbeitsvertrag, Kaufvertrag, uvm.',
        },
        {
          title: '3. Formular ausfüllen',
          description: 'Fülle die Felder aus: Vertragspartner, Leistungsbeschreibung, Vergütung, Laufzeit, etc. Alle Felder haben Hilfe-Texte.',
          tips: ['Pflichtfelder sind markiert', 'Validierung verhindert Fehler', 'Company Profile optional nutzbar']
        },
        {
          title: '4. Company Profile nutzen (optional)',
          description: 'Speichere deine Firmendaten einmal und nutze sie für alle Verträge: Firmenname, Adresse, USt-ID, Bankdaten, Logo.',
        },
        {
          title: '5. Vertrag generieren',
          description: 'Die KI erstellt einen rechtssicheren Vertrag basierend auf deinen Eingaben. Du kannst ihn als PDF/DOCX herunterladen oder direkt zur Signatur senden.',
        }
      ]
    },
    {
      id: 'chat',
      icon: <MessageSquare size={24} />,
      title: 'Legal Chat nutzen',
      description: 'Mit der KI über deine Verträge chatten und Fragen stellen',
      category: 'premium',
      steps: [
        {
          title: '1. Chat öffnen',
          description: 'Navigiere zu "Chat" in der Hauptnavigation. Ein neuer Chat wird automatisch erstellt.',
        },
        {
          title: '2. Vertrag hochladen (optional)',
          description: 'Lade einen Vertrag hoch, um spezifische Fragen dazu zu stellen. Die KI analysiert den Kontext automatisch.',
          tips: ['Smart Questions: Die KI schlägt passende Fragen vor', 'Mehrere Verträge gleichzeitig möglich']
        },
        {
          title: '3. Fragen stellen',
          description: 'Stelle Fragen in natürlicher Sprache: "Was bedeutet Klausel 5?", "Ist dieser Vertrag fair?", "Welche Risiken gibt es?"',
        },
        {
          title: '4. Chat-Historie nutzen',
          description: 'Alle Chats werden gespeichert. Klicke links auf einen alten Chat, um die Unterhaltung fortzusetzen.',
        },
        {
          title: '5. Chats verwalten',
          description: 'Benenne Chats um, archiviere alte Gespräche oder lösche sie.',
        }
      ]
    },
    {
      id: 'legal-pulse',
      icon: <Zap size={24} />,
      title: 'Legal Pulse - Rechtsnews',
      description: 'Automatische Überwachung von Gesetzesänderungen und Urteilen',
      category: 'premium',
      steps: [
        {
          title: '1. Legal Pulse öffnen',
          description: 'Klicke auf "Legal Pulse" in der Navigation. Du siehst deinen Risiko-Score und aktuelle News.',
        },
        {
          title: '2. Verträge überwachen',
          description: 'Wähle Verträge aus, die überwacht werden sollen. Legal Pulse prüft automatisch, ob neue Gesetze oder Urteile relevant sind.',
        },
        {
          title: '3. Risiko-Score verstehen',
          description: 'Jeder überwachte Vertrag erhält einen Risiko-Score (0-100): Je höher, desto mehr rechtliche Änderungen betreffen ihn.',
          tips: ['Grün (0-30): Keine kritischen Änderungen', 'Gelb (31-70): Moderate Anpassungen empfohlen', 'Rot (71-100): Dringender Handlungsbedarf']
        },
        {
          title: '4. Empfehlungen erhalten',
          description: 'Legal Pulse zeigt konkrete Handlungsempfehlungen: "Vertrag anpassen", "Rechtliche Prüfung empfohlen", "Keine Aktion nötig".',
        },
        {
          title: '5. News-Feed lesen',
          description: 'Sieh aktuelle Gesetzesänderungen, wichtige Urteile und Rechts-Updates, die deine Verträge betreffen können.',
        }
      ]
    },
    {
      id: 'calendar',
      icon: <Calendar size={24} />,
      title: 'Kalender & Fristen',
      description: 'Kündigungsfristen und wichtige Vertragstermine im Blick behalten',
      category: 'features',
      steps: [
        {
          title: '1. Kalender öffnen',
          description: 'Navigiere zu "Kalender" in der Hauptnavigation. Alle Vertragstermine werden automatisch eingetragen.',
        },
        {
          title: '2. Events verstehen',
          description: 'Es gibt 3 Arten von Events: Kündigungsfristen (rot), Vertragslaufzeit-Ende (gelb), Erinnerungen (blau).',
        },
        {
          title: '3. Event-Details ansehen',
          description: 'Klicke auf einen Termin, um Details zu sehen: Vertragsname, Kündigungsfrist, empfohlene Aktion.',
          tips: ['Tage bis Fristende werden angezeigt', 'Quick Actions: Vertrag öffnen, Erinnerung setzen, Kündigung vorbereiten']
        },
        {
          title: '4. Erinnerungen aktivieren',
          description: 'Aktiviere Erinnerungen für wichtige Fristen. Du erhältst E-Mails 30, 14 und 7 Tage vor Ablauf.',
        },
        {
          title: '5. Kalender exportieren',
          description: 'Exportiere Events als ICS-Datei für Google Calendar, Outlook oder Apple Calendar.',
        }
      ]
    },
    {
      id: 'envelopes',
      icon: <FileSignature size={24} />,
      title: 'Digitale Signaturen',
      description: 'Verträge digital unterschreiben lassen',
      category: 'premium',
      steps: [
        {
          title: '1. Signatur-Feature öffnen',
          description: 'Navigiere zu "Signaturen" oder öffne einen Vertrag und klicken auf "Zur Signatur senden".',
        },
        {
          title: '2. Envelope erstellen',
          description: 'Ein "Envelope" ist ein Signatur-Paket. Gib Titel und Nachricht ein (z.B. "Bitte bis Freitag unterschreiben").',
        },
        {
          title: '3. Unterzeichner hinzufügen',
          description: 'Füge 1-10 Unterzeichner hinzu: Name, E-Mail, Rolle (z.B. "Kunde", "Auftragnehmer"). Lege die Reihenfolge fest.',
          tips: ['Sequentielle Signatur: Erst Person 1, dann Person 2, usw.', 'Parallele Signatur: Alle gleichzeitig']
        },
        {
          title: '4. Signaturfelder platzieren',
          description: 'Zieh Signaturfelder an die gewünschten Stellen im PDF. Jedes Feld wird automatisch dem richtigen Unterzeichner zugeordnet.',
        },
        {
          title: '5. Versenden & Tracking',
          description: 'Sende das Envelope. Unterzeichner erhalten einen Link. Du siehst in Echtzeit, wer bereits unterschrieben hat.',
        },
        {
          title: '6. Fertiges Dokument',
          description: 'Nach allen Signaturen wird das fertige PDF automatisch in deiner Vertragsverwaltung gespeichert.',
        }
      ]
    },
    {
      id: 'folders',
      icon: <FolderOpen size={24} />,
      title: 'Ordner & Organisation',
      description: 'Verträge in Ordnern organisieren',
      category: 'features',
      steps: [
        {
          title: '1. Ordner erstellen',
          description: 'Geh zu "Verträge" und klicke auf "Neuer Ordner". Gib einen Namen ein (z.B. "Mietverträge", "Kunden 2025").',
        },
        {
          title: '2. Verträge in Ordner verschieben',
          description: 'Zieh Verträge per Drag & Drop in Ordner ODER wähle mehrere Verträge aus und klicke auf "In Ordner verschieben".',
        },
        {
          title: '3. Ordner filtern',
          description: 'Klicke oben auf einen Ordner, um nur Verträge aus diesem Ordner anzuzeigen.',
        },
        {
          title: '4. Smart Folders nutzen',
          description: 'Automatische Ordner: "Bald ablaufend", "Hohe Risiken", "Neue Uploads". Diese aktualisieren sich automatisch.',
        }
      ]
    },
    {
      id: 'batch-upload',
      icon: <Upload size={24} />,
      title: 'Mehrere Verträge gleichzeitig hochladen',
      description: 'Batch-Upload für effizientes Arbeiten (Enterprise-Feature)',
      category: 'premium',
      steps: [
        {
          title: '1. Mehrfach-Auswahl',
          description: 'Bei "Vertrag hochladen" kannst du mehrere PDFs gleichzeitig auswählen (Strg/Cmd + Klick) oder alle per Drag & Drop ziehen.',
        },
        {
          title: '2. Analyse-Warteschlange',
          description: 'Alle Verträge werden nacheinander analysiert. Du siehst eine Fortschrittsanzeige für jeden Vertrag.',
          tips: ['Max. 10 Verträge gleichzeitig', 'Duplikatserkennung verhindert doppelte Uploads']
        },
        {
          title: '3. Ergebnisse prüfen',
          description: 'Nach Abschluss siehst du eine Übersicht: Erfolgreich analysiert, Fehler, Duplikate.',
        }
      ]
    },
    {
      id: 'email-upload',
      icon: <Mail size={24} />,
      title: 'Verträge per E-Mail hochladen',
      description: 'Verträge direkt aus E-Mails importieren',
      category: 'premium',
      steps: [
        {
          title: '1. E-Mail-Adresse finden',
          description: 'Geh zu "Verträge" → "E-Mail Upload". Dort findest du deine persönliche Upload-E-Mail-Adresse.',
        },
        {
          title: '2. Vertrag per E-Mail senden',
          description: 'Sende eine E-Mail mit PDF-Anhang an diese Adresse. Betreff und Text sind optional.',
          tips: ['Mehrere PDFs pro E-Mail möglich', 'Max. 10 MB pro Anhang']
        },
        {
          title: '3. Automatische Analyse',
          description: 'Der Vertrag wird automatisch hochgeladen und analysiert. Du erhältst eine Bestätigungs-E-Mail.',
        }
      ]
    },
    {
      id: 'reminders',
      icon: <Bell size={24} />,
      title: 'Erinnerungen einstellen',
      description: 'Niemals wichtige Fristen verpassen',
      category: 'features',
      steps: [
        {
          title: '1. Erinnerung aktivieren',
          description: 'Öffne einen Vertrag und klicke auf "Erinnerung aktivieren" (Glockensymbol).',
        },
        {
          title: '2. Tage auswählen',
          description: 'Wähle, wann du erinnert werden möchtest: 30, 14, 7, 3 oder 1 Tag vor Kündigungsfrist.',
        },
        {
          title: '3. E-Mail-Benachrichtigungen',
          description: 'Du erhältst automatisch E-Mails mit allen Details: Vertrag, Frist, empfohlene Aktion.',
        },
        {
          title: '4. Erinnerungen verwalten',
          description: 'In den Vertrags-Details siehst du alle aktiven Erinnerungen und kannst sie bearbeiten oder löschen.',
        }
      ]
    },
    {
      id: 'company-profile',
      icon: <Building2 size={24} />,
      title: 'Company Profile einrichten',
      description: 'Firmendaten für automatisches Ausfüllen von Verträgen',
      category: 'features',
      steps: [
        {
          title: '1. Profil erstellen',
          description: 'Geh zu "Generieren" → "Company Profile verwalten" → "Neues Profil".',
        },
        {
          title: '2. Daten eingeben',
          description: 'Fülle alle Firmeninfos aus: Name, Rechtsform, Adresse, USt-ID, Handelsregister, Bankverbindung.',
          tips: ['Logo hochladen (optional)', 'Mehrere Profile möglich (z.B. für mehrere Firmen)', 'Daten sind verschlüsselt gespeichert']
        },
        {
          title: '3. Bei Vertrags-Generierung nutzen',
          description: 'Wenn du einen Vertrag generierst, wähle einfach dein Profil aus. Alle Felder werden automatisch ausgefüllt.',
        }
      ]
    },
    {
      id: 'export-pdf',
      icon: <Download size={24} />,
      title: 'Analysen & Reports exportieren',
      description: 'Vertragsergebnisse als PDF speichern oder teilen',
      category: 'features',
      steps: [
        {
          title: '1. Vertrag öffnen',
          description: 'Geh zu deinen Verträgen und öffne die Detailansicht eines analysierten Vertrags.',
        },
        {
          title: '2. Export-Optionen',
          description: 'Klicke auf "Exportieren". Wähle: Analyse-Report (PDF), Original-Vertrag, Beide kombiniert.',
        },
        {
          title: '3. PDF anpassen',
          description: 'Wähle, was im Report enthalten sein soll: Contract Score, Risiken, Optimierungen, Empfehlungen.',
        },
        {
          title: '4. Download oder Teilen',
          description: 'Lade die PDF herunter ODER generiere einen Share-Link zum Teilen mit Kollegen/Anwälten.',
          tips: ['Share-Links sind 7 Tage gültig', 'Passwort-Schutz optional', 'Tracking: Sieh, wer die PDF geöffnet hat']
        }
      ]
    },
    {
      id: 'profile-settings',
      icon: <User size={24} />,
      title: 'Profil & Einstellungen',
      description: 'Konto verwalten, Passwort ändern, Daten exportieren',
      category: 'settings',
      steps: [
        {
          title: '1. Profil öffnen',
          description: 'Klicke oben rechts auf dein Avatar-Symbol → "Profil".',
        },
        {
          title: '2. Passwort ändern',
          description: 'Unter "Sicherheit" kannst du dein Passwort ändern. Gib altes + neues Passwort ein.',
        },
        {
          title: '3. Daten exportieren (DSGVO)',
          description: 'Unter "Datenschutz" kannst du alle deine Daten als ZIP-Archiv herunterladen.',
        },
        {
          title: '4. Konto löschen',
          description: 'Wenn du dein Konto löschen möchtest: "Konto löschen" → Bestätigung. Alle Daten werden sofort gelöscht.',
        }
      ]
    },
    {
      id: 'subscription',
      icon: <CreditCard size={24} />,
      title: 'Abonnement verwalten',
      description: 'Plan upgraden, kündigen oder Rechnungen abrufen',
      category: 'settings',
      steps: [
        {
          title: '1. Abo-Status sehen',
          description: 'In deinem Profil siehst du: Aktueller Plan, Nutzungs-Limits, nächstes Abrechnungsdatum.',
        },
        {
          title: '2. Plan upgraden',
          description: 'Klicke auf "Plan upgraden". Wähle einen höheren Plan (Business, Premium, Enterprise). Zahlung per Stripe.',
        },
        {
          title: '3. Zahlungsmethode ändern',
          description: 'Unter "Zahlungsmethoden" kannst du Kreditkarten hinzufügen, ändern oder löschen.',
        },
        {
          title: '4. Abonnement kündigen',
          description: 'Klicke auf "Abo kündigen". Dein Zugang bleibt bis zum Ende der bezahlten Periode aktiv.',
        },
        {
          title: '5. Rechnungen herunterladen',
          description: 'Alle Rechnungen findest du unter "Rechnungen". Klicke auf eine Rechnung, um sie als PDF herunterzuladen.',
        }
      ]
    },
    {
      id: 'contract-score',
      icon: <BarChart3 size={24} />,
      title: 'Contract Score verstehen',
      description: 'So wird dein Vertrag bewertet',
      category: 'basics',
      steps: [
        {
          title: '1. Was ist der Contract Score?',
          description: 'Eine Zahl von 0-100, die die Qualität deines Vertrags bewertet. Je höher, desto besser.',
        },
        {
          title: '2. Farbcodierung',
          description: 'Grün (70-100): Guter, fairer Vertrag. Gelb (40-69): Vorsicht, Verbesserungen möglich. Rot (0-39): Hohe Risiken, dringend prüfen!',
        },
        {
          title: '3. Bewertungskriterien',
          description: 'Der Score basiert auf: Fairness der Klauseln, Rechtskonformität, Vollständigkeit, Risikobewertung, Verständlichkeit.',
        },
        {
          title: '4. Score verbessern',
          description: 'Nutze den Optimizer, um den Score zu erhöhen. Jeder Optimierungsvorschlag zeigt die potenzielle Score-Verbesserung.',
        }
      ]
    },
    {
      id: 'search-filter',
      icon: <Filter size={24} />,
      title: 'Verträge suchen & filtern',
      description: 'Schnell den richtigen Vertrag finden',
      category: 'features',
      steps: [
        {
          title: '1. Suchleiste nutzen',
          description: 'Oben auf der Verträge-Seite: Gib Vertragsnamen, Schlagworte oder Vertragspartner ein.',
        },
        {
          title: '2. Nach Status filtern',
          description: 'Filter-Buttons: Aktiv, Abgelaufen, Bald ablaufend, Hohe Risiken, Neu hochgeladen.',
        },
        {
          title: '3. Sortierung ändern',
          description: 'Sortieren nach: Datum (neueste zuerst), Name (A-Z), Contract Score (beste zuerst), Ablaufdatum.',
        },
        {
          title: '4. Mehrfachauswahl',
          description: 'Aktiviere Checkboxen, um mehrere Verträge auszuwählen. Dann: In Ordner verschieben, Löschen, Exportieren.',
        }
      ]
    },
    // ========== NEUE ANLEITUNGEN ==========
    {
      id: 'legal-lens',
      icon: <FileText size={24} />,
      title: 'Legal Lens - Tiefenanalyse',
      description: 'Umfassende juristische Analyse mit detaillierten Einblicken',
      category: 'premium',
      steps: [
        {
          title: '1. Legal Lens öffnen',
          description: 'Navigiere zu "Legal Lens" in der Hauptnavigation oder klicke bei einem Vertrag auf "Tiefenanalyse starten".',
        },
        {
          title: '2. Vertrag auswählen oder hochladen',
          description: 'Wähle einen bestehenden Vertrag aus der Liste oder lade einen neuen Vertrag direkt hoch.',
        },
        {
          title: '3. Analyse-Ergebnisse verstehen',
          description: 'Legal Lens zeigt dir: Vertragsübersicht mit allen wichtigen Daten, Parteien-Identifikation, Klausel-für-Klausel-Analyse, Risikobewertung pro Abschnitt.',
          tips: ['Grüne Klauseln = unbedenklich', 'Gelbe Klauseln = Überprüfung empfohlen', 'Rote Klauseln = kritisch, Handlungsbedarf']
        },
        {
          title: '4. Einzelne Klauseln analysieren',
          description: 'Klicke auf eine Klausel, um die detaillierte Bewertung zu sehen: Was bedeutet sie? Ist sie fair? Welche Risiken gibt es?',
        },
        {
          title: '5. Handlungsempfehlungen',
          description: 'Zu jeder problematischen Klausel erhältst du konkrete Handlungsempfehlungen und alternative Formulierungen.',
        },
        {
          title: '6. Report exportieren',
          description: 'Exportiere die komplette Analyse als PDF-Report für deine Unterlagen oder zur Weitergabe an einen Anwalt.',
        }
      ]
    },
    {
      id: 'clause-library',
      icon: <FolderOpen size={24} />,
      title: 'Klauselbibliothek nutzen',
      description: 'Häufig verwendete Klauseln speichern und wiederverwenden',
      category: 'premium',
      steps: [
        {
          title: '1. Klauselbibliothek öffnen',
          description: 'Navigiere zu "Klauselbibliothek" in der Navigation oder im Dashboard unter "Werkzeuge".',
        },
        {
          title: '2. Klausel hinzufügen',
          description: 'Klicke auf "Neue Klausel" und gib ein: Titel, Kategorie (z.B. Haftung, Kündigung), den Klauseltext.',
          tips: ['Kategorien helfen beim späteren Finden', 'Du kannst Klauseln auch aus analysierten Verträgen direkt speichern']
        },
        {
          title: '3. Klauseln organisieren',
          description: 'Sortiere Klauseln nach Kategorien: Haftungsklauseln, Kündigungsklauseln, Geheimhaltung, Zahlungsbedingungen, etc.',
        },
        {
          title: '4. Klauseln suchen',
          description: 'Nutze die Suchfunktion, um schnell die richtige Klausel zu finden. Suche nach Titel oder Inhalt.',
        },
        {
          title: '5. Klauseln in Verträge einfügen',
          description: 'Beim Erstellen eines neuen Vertrags (Generator/Contract Builder) kannst du gespeicherte Klauseln mit einem Klick einfügen.',
        }
      ]
    },
    {
      id: 'contract-builder',
      icon: <FileCheck size={24} />,
      title: 'Contract Builder - Visueller Editor',
      description: 'Verträge visuell per Drag & Drop erstellen und bearbeiten',
      category: 'premium',
      steps: [
        {
          title: '1. Contract Builder öffnen',
          description: 'Navigiere zu "Contract Builder" in der Navigation. Du siehst einen visuellen Editor mit Blöcken.',
        },
        {
          title: '2. Blöcke hinzufügen',
          description: 'Zieh Bausteine aus der linken Seitenleiste in den Editor: Überschriften, Textblöcke, Klauseln, Tabellen, Unterschriftenfelder.',
          tips: ['Doppelklick zum Bearbeiten', 'Drag & Drop zum Verschieben', 'Rechtsklick für weitere Optionen']
        },
        {
          title: '3. Variablen verwenden',
          description: 'Füge Platzhalter ein wie {{Firmenname}}, {{Datum}}, {{Betrag}}. Diese werden später automatisch ausgefüllt.',
        },
        {
          title: '4. Design anpassen',
          description: 'Passe Schriftart, Farben und Layout an. Füge dein Firmenlogo hinzu.',
        },
        {
          title: '5. KI-Unterstützung nutzen',
          description: 'Klicke auf "KI-Assistent" um: Klauseln rechtlich prüfen zu lassen, Formulierungen zu optimieren, fehlende Abschnitte vorschlagen zu lassen.',
        },
        {
          title: '6. Vorlage speichern',
          description: 'Speichere deinen Vertrag als Vorlage für zukünftige Verwendung. Ideal für wiederkehrende Vertragstypen.',
        },
        {
          title: '7. Exportieren',
          description: 'Exportiere den fertigen Vertrag als PDF oder DOCX. Optional: Direkt zur digitalen Signatur senden.',
        }
      ]
    },
    {
      id: 'team-management',
      icon: <Building2 size={24} />,
      title: 'Team-Verwaltung',
      description: 'Mehrere Benutzer einladen und Berechtigungen verwalten',
      category: 'premium',
      steps: [
        {
          title: '1. Team-Bereich öffnen',
          description: 'Navigiere zu "Team" in der Navigation (nur für Business/Enterprise-Pläne verfügbar).',
        },
        {
          title: '2. Teammitglied einladen',
          description: 'Klicke auf "Mitglied einladen" und gib die E-Mail-Adresse ein. Der Eingeladene erhält einen Link per E-Mail.',
          tips: ['Einladungen sind 7 Tage gültig', 'Du kannst die Rolle direkt bei der Einladung festlegen']
        },
        {
          title: '3. Rollen verstehen',
          description: 'Es gibt verschiedene Rollen: Admin (voller Zugriff), Editor (kann Verträge bearbeiten), Viewer (nur Lesezugriff).',
        },
        {
          title: '4. Berechtigungen anpassen',
          description: 'Klicke auf ein Teammitglied, um dessen Rolle zu ändern oder spezifische Berechtigungen festzulegen.',
        },
        {
          title: '5. Verträge teilen',
          description: 'Ordner und Verträge können mit dem Team geteilt werden. Lege fest, wer welche Verträge sehen darf.',
        },
        {
          title: '6. Aktivitäten nachverfolgen',
          description: 'Im Team-Dashboard siehst du, wer wann welche Aktionen durchgeführt hat (Audit-Log).',
        }
      ]
    },
    {
      id: 'api-keys',
      icon: <Zap size={24} />,
      title: 'API-Schlüssel verwalten',
      description: 'Programmatischer Zugriff auf Contract AI für Entwickler',
      category: 'premium',
      steps: [
        {
          title: '1. API-Keys öffnen',
          description: 'Navigiere zu "API-Keys" in deinem Profil oder unter Einstellungen (nur Enterprise-Plan).',
        },
        {
          title: '2. Neuen Key erstellen',
          description: 'Klicke auf "Neuen API-Key erstellen". Gib einen Namen ein (z.B. "Produktions-Server", "Entwicklung").',
          tips: ['Der Key wird nur einmal angezeigt - kopiere ihn sofort!', 'Speichere Keys niemals im Code']
        },
        {
          title: '3. Berechtigungen festlegen',
          description: 'Wähle, welche API-Endpoints der Key nutzen darf: Analyse, Generierung, Vergleich, etc.',
        },
        {
          title: '4. Rate-Limits beachten',
          description: 'Jeder Key hat Limits: Anfragen pro Minute, pro Tag. Diese werden im Dashboard angezeigt.',
        },
        {
          title: '5. Key widerrufen',
          description: 'Bei Sicherheitsbedenken kannst du einen Key jederzeit widerrufen. Er funktioniert dann sofort nicht mehr.',
        },
        {
          title: '6. API-Dokumentation',
          description: 'Die vollständige API-Dokumentation findest du unter api.contract-ai.de/docs mit Beispielen für alle Endpoints.',
        }
      ]
    },
    {
      id: 'integrations',
      icon: <Zap size={24} />,
      title: 'Integrationen einrichten',
      description: 'Contract AI mit anderen Tools verbinden',
      category: 'premium',
      steps: [
        {
          title: '1. Integrationen öffnen',
          description: 'Navigiere zu "Integrationen" in der Navigation oder unter Einstellungen.',
        },
        {
          title: '2. Verfügbare Integrationen',
          description: 'Aktuell verfügbar: Google Drive, Dropbox, OneDrive, Slack, Microsoft Teams, Zapier, Make (Integromat).',
        },
        {
          title: '3. Integration aktivieren',
          description: 'Klicke auf die gewünschte Integration und folge dem Authentifizierungs-Prozess (OAuth).',
          tips: ['Du wirst zur Anmeldung beim Drittanbieter weitergeleitet', 'Contract AI erhält nur die notwendigen Berechtigungen']
        },
        {
          title: '4. Automatisierungen einrichten',
          description: 'Nach der Verbindung kannst du Automatisierungen erstellen: z.B. "Neuer Vertrag in Drive → automatisch analysieren".',
        },
        {
          title: '5. Webhooks nutzen',
          description: 'Für Entwickler: Richte Webhooks ein, um bei bestimmten Events benachrichtigt zu werden (neue Analyse, Frist erreicht, etc.).',
        }
      ]
    },
    {
      id: 'cancel-contract',
      icon: <AlertCircle size={24} />,
      title: 'Kündigungshilfe nutzen',
      description: 'Verträge rechtzeitig und korrekt kündigen',
      category: 'features',
      steps: [
        {
          title: '1. Kündigungshilfe öffnen',
          description: 'Bei einem Vertrag mit erkannter Kündigungsfrist erscheint der Button "Kündigung vorbereiten".',
        },
        {
          title: '2. Kündigungsdaten prüfen',
          description: 'Contract AI zeigt dir: Kündigungsfrist, spätestes Kündigungsdatum, empfohlenes Absendedatum, Empfängeradresse.',
        },
        {
          title: '3. Kündigungsschreiben generieren',
          description: 'Klicke auf "Kündigungsschreiben erstellen". Die KI erstellt ein rechtssicheres Kündigungsschreiben mit allen wichtigen Angaben.',
          tips: ['Einschreiben mit Rückschein empfohlen', 'PDF zum Ausdrucken oder direkt versenden']
        },
        {
          title: '4. Erinnerung aktivieren',
          description: 'Aktiviere eine Erinnerung, damit du die Kündigungsfrist nicht verpasst. Du erhältst E-Mails 30, 14 und 7 Tage vorher.',
        },
        {
          title: '5. Status nachverfolgen',
          description: 'Nach der Kündigung kannst du den Status aktualisieren: "Kündigung versendet", "Bestätigung erhalten", etc.',
        }
      ]
    },
    {
      id: 'contract-details',
      icon: <FileText size={24} />,
      title: 'Vertragsdetails verstehen',
      description: 'Alle Informationen zu einem analysierten Vertrag',
      category: 'basics',
      steps: [
        {
          title: '1. Vertrag öffnen',
          description: 'Klicke in der Vertragsliste auf einen Vertrag, um die Detailansicht zu öffnen.',
        },
        {
          title: '2. Übersicht',
          description: 'Oben siehst du: Vertragsname, Contract Score, Status (aktiv/abgelaufen), Hochladedatum, Laufzeit.',
        },
        {
          title: '3. Analyse-Ergebnisse',
          description: 'Der Tab "Analyse" zeigt: Erkannte Risiken (rot markiert), Warnungen (gelb), positive Aspekte (grün), Verbesserungsvorschläge.',
        },
        {
          title: '4. Extrahierte Daten',
          description: 'Contract AI extrahiert automatisch: Vertragsparteien, Laufzeit, Kündigungsfrist, Zahlungsbedingungen, wichtige Termine.',
          tips: ['Falsch erkannte Daten können manuell korrigiert werden', 'Klicke auf "Bearbeiten" neben jedem Feld']
        },
        {
          title: '5. Original-Dokument',
          description: 'Im Tab "Dokument" kannst du das Original-PDF ansehen, herunterladen oder eine neue Version hochladen.',
        },
        {
          title: '6. Aktionen',
          description: 'Verfügbare Aktionen: Optimieren, Vergleichen, Zur Signatur senden, Kalender-Event erstellen, Löschen.',
        }
      ]
    },
    {
      id: 'qr-verification',
      icon: <Shield size={24} />,
      title: 'QR-Code Verifizierung',
      description: 'Verträge mit QR-Code auf Echtheit prüfen',
      category: 'premium',
      steps: [
        {
          title: '1. QR-Code verstehen',
          description: 'Jeder von Contract AI generierte oder signierte Vertrag enthält einen eindeutigen QR-Code zur Verifizierung.',
        },
        {
          title: '2. QR-Code scannen',
          description: 'Scanne den QR-Code mit deiner Smartphone-Kamera oder einer QR-Code-App.',
        },
        {
          title: '3. Verifizierung prüfen',
          description: 'Du wirst zu contract-ai.de/verify/[ID] weitergeleitet. Dort siehst du: Ist der Vertrag echt? Wann wurde er erstellt? Wer hat unterschrieben?',
          tips: ['Grünes Häkchen = Vertrag ist verifiziert und unverändert', 'Rotes X = Vertrag wurde manipuliert oder ist ungültig']
        },
        {
          title: '4. Details einsehen',
          description: 'Die Verifizierungsseite zeigt: Erstellungsdatum, Signatur-Zeitstempel, Hash-Wert zur Integritätsprüfung.',
        }
      ]
    },
    {
      id: 'better-contracts',
      icon: <Wand2 size={24} />,
      title: 'Better Contracts - KI-Verbesserungen',
      description: 'Verträge automatisch verbessern und modernisieren',
      category: 'premium',
      steps: [
        {
          title: '1. Better Contracts öffnen',
          description: 'Navigiere zu "Better Contracts" oder klicke bei einem Vertrag auf "Verbessern".',
        },
        {
          title: '2. Vertrag hochladen',
          description: 'Lade den Vertrag hoch, den du verbessern möchtest. Unterstützt werden PDF und DOCX.',
        },
        {
          title: '3. Verbesserungsoptionen wählen',
          description: 'Wähle, was verbessert werden soll: Rechtliche Sicherheit, Verständlichkeit, Fairness, Vollständigkeit.',
        },
        {
          title: '4. KI-Analyse abwarten',
          description: 'Die KI analysiert den Vertrag und erstellt Verbesserungsvorschläge. Dies dauert 2-3 Minuten.',
        },
        {
          title: '5. Vorschläge prüfen',
          description: 'Du siehst eine Liste aller Vorschläge: Original-Formulierung vs. Verbesserung, mit Begründung warum.',
          tips: ['Jeder Vorschlag kann einzeln angenommen oder abgelehnt werden', 'Du behältst die volle Kontrolle']
        },
        {
          title: '6. Verbesserten Vertrag exportieren',
          description: 'Lade den verbesserten Vertrag als PDF oder DOCX herunter. Original bleibt erhalten.',
        }
      ]
    }
  ];

  // 📋 UMFASSENDE FAQ
  // ⚠️ Static content only – answers may contain HTML links.
  // Never populate from DB or user input without sanitization (XSS risk).
  const faqItems: FAQItem[] = [
    // General
    {
      question: 'Wie sicher sind meine Vertragsdaten?',
      answer: 'Höchste Sicherheit ist garantiert: Alle Daten werden verschlüsselt übertragen (TLS 1.3) und gespeichert (AES-256). Server stehen in Deutschland (DSGVO-konform). Zugriff nur du + verschlüsselte Backups. Automatische Löschung nach 30 Tagen (außer du verlängerst). Keine Weitergabe an Dritte. Details zu Datenschutz und Sicherheit findest du in unserem <a href="/ki-vertragsanalyse">KI-Vertragsanalyse Guide</a>.',
      category: 'security'
    },
    {
      question: 'Welche Vertragsarten werden unterstützt?',
      answer: 'Contract AI analysiert ALLE deutschen Vertragsarten: Mietverträge, Arbeitsverträge, Kaufverträge, Dienstleistungsverträge, Freelancer-Verträge, NDAs, AGBs, Lizenzverträge, Darlehensverträge, Kooperationsverträge, Partnerschaftsverträge und viele mehr. Bei speziellen Branchen-Verträgen (z.B. Medizinrecht, Baurecht) arbeiten wir kontinuierlich an Verbesserungen.',
      category: 'general'
    },
    {
      question: 'Ersetzt Contract AI einen Anwalt?',
      answer: 'NEIN! Contract AI ist ein hochmodernes Analyse-Tool, das dich bei der ersten Einschätzung unterstützt und Zeit spart. Bei komplexen rechtlichen Fragen, hohen Vertragssummen oder kritischen Verträgen empfehlen wir IMMER die Beratung durch einen Fachanwalt. Nutze unsere <a href="/ki-vertragsanalyse">KI-Vertragsanalyse</a> als Grundlage für das Anwaltsgespräch.',
      category: 'general'
    },
    {
      question: 'Wie funktioniert die KI-Analyse?',
      answer: 'Unsere KI basiert auf GPT-4 und wurde mit tausenden deutschen Verträgen, Gesetzen und Urteilen trainiert. Sie erkennt: problematische Klauseln, unausgewogene Bedingungen, rechtliche Risiken, fehlende Regelungen, unklare Formulierungen. Die Analyse erfolgt anhand bewährter juristischer Standards und aktueller Rechtsprechung (BGB, HGB, ArbG, etc.). Mehr Details: <a href="/ki-vertragsanalyse">So funktioniert KI-Vertragsanalyse</a>.',
      category: 'technical'
    },
    {
      question: 'Was kostet Contract AI?',
      answer: 'Starter (0€): 3 Analysen zum Testen, Basis-Features. Business (19€/Monat): 25 Analysen, Optimizer, Compare, Chat, Generator. Enterprise (29€/Monat): Unbegrenzte Analysen, alle Premium-Features, Bulk-Upload, API-Zugang, Priority-Support. Keine versteckten Kosten. Monatlich kündbar.',
      category: 'billing'
    },
    {
      question: 'Kann ich Contract AI auch mobil nutzen?',
      answer: 'JA! Contract AI funktioniert perfekt auf Smartphone und Tablet. Die Web-App ist vollständig responsive und für alle Bildschirmgrößen optimiert. Eine native App für iOS und Android ist in Planung (Q3 2025).',
      category: 'technical'
    },
    {
      question: 'Wie lange dauert eine Analyse?',
      answer: 'Standard-Analyse: 30-60 Sekunden pro Vertrag (je nach Länge). Optimizer: 2-3 Minuten. Vergleich: 2-4 Minuten. Generator: 1-2 Minuten. Du kannst während der Analyse weitersurfen - du wirst benachrichtigt, wenn die Analyse fertig ist.',
      category: 'technical'
    },
    {
      question: 'Welche Dateiformate werden unterstützt?',
      answer: 'Aktuell: PDF, DOCX. Maximale Dateigröße: 10 MB pro Vertrag. Scanns/Bilder (OCR) sind in Entwicklung.',
      category: 'technical'
    },
    {
      question: 'Kann ich Verträge mit mehreren Personen teilen?',
      answer: 'JA! Du kannst: 1) Analyse-Reports als PDF exportieren und per E-Mail teilen. 2) Share-Links generieren (7 Tage gültig, optional passwortgeschützt). 3) Team-Features (ab Business-Plan): Mehrere Nutzer pro Konto, gemeinsame Ordner. 4) Verträge zur Signatur an mehrere Personen senden.',
      category: 'general'
    },
    {
      question: 'Werden meine Verträge zum KI-Training verwendet?',
      answer: 'NEIN! Deine Vertragsdaten werden NIEMALS für KI-Training verwendet. Wir nutzen OpenAI im "Zero Data Retention"-Modus: deine Daten werden nicht gespeichert, nicht analysiert, nicht für Model-Training verwendet. 100% Vertraulichkeit garantiert.',
      category: 'security'
    },
    {
      question: 'Kann ich mein Abonnement jederzeit kündigen?',
      answer: 'JA! Keine Vertragsbindung. Kündigung jederzeit möglich mit einem Klick im Profil. Zugang bleibt bis zum Ende der bezahlten Periode aktiv. Keine Kündigungsfristen. Keine Nachfragen. Keine versteckten Gebühren.',
      category: 'billing'
    },
    {
      question: 'Was passiert mit meinen Daten nach der Kündigung?',
      answer: 'Nach Abo-Ende: Du hast 30 Tage Zeit, alle Daten zu exportieren. Danach werden alle Verträge, Analysen und persönliche Daten automatisch und unwiderruflich gelöscht. Du erhältst 7 Tage vorher eine Erinnerungs-E-Mail.',
      category: 'security'
    },
    {
      question: 'Gibt es eine Geld-zurück-Garantie?',
      answer: 'JA! 14 Tage Geld-zurück-Garantie ohne Wenn und Aber. Wenn du nicht zufrieden bist, schreib uns einfach eine E-Mail - du bekommst dein Geld zurück. Keine Fragen.',
      category: 'billing'
    },
    {
      question: 'Kann ich mehrere Company Profiles erstellen?',
      answer: 'JA! Du kannst unbegrenzt viele Company Profiles erstellen (z.B. für verschiedene Firmen oder Abteilungen). Bei der Vertrags-Generierung wähle einfach das passende Profil aus.',
      category: 'general'
    },
    {
      question: 'Wie funktioniert die digitale Signatur?',
      answer: 'Einfach & rechtssicher: 1) Vertrag hochladen. 2) Signaturfelder platzieren. 3) Unterzeichner hinzufügen (E-Mail). 4) Versenden. Unterzeichner erhalten einen Link und können direkt im Browser unterschreiben (Maus, Touch oder Stift). Fertige PDF wird automatisch gespeichert. Rechtlich bindend in Deutschland.',
      category: 'technical'
    },
    {
      question: 'Was ist der Unterschied zwischen Optimizer und Generator?',
      answer: 'Optimizer: Verbessert BESTEHENDE Verträge. Analysiert Schwachstellen, schlägt Optimierungen vor. Generator: Erstellt NEUE Verträge von Grund auf. Basierend auf Vorlagen + deine Eingaben. Beide nutzen KI, aber für verschiedene Zwecke.',
      category: 'general'
    },
    {
      question: 'Kann ich Verträge in anderen Sprachen analysieren?',
      answer: 'Aktuell: Nur deutsche Verträge werden optimal analysiert. Englische Verträge funktionieren grundsätzlich, aber ohne deutsches Rechtswissen. Französisch, Spanisch, Italienisch: In Entwicklung (Q4 2025).',
      category: 'technical'
    },
    {
      question: 'Wie oft wird Legal Pulse aktualisiert?',
      answer: 'Legal Pulse wird täglich aktualisiert! Neue Gesetze, Urteile und Rechts-Updates werden automatisch eingepflegt. Deine überwachten Verträge werden wöchentlich neu geprüft. Bei kritischen Änderungen erhältst du sofort eine E-Mail.',
      category: 'general'
    },
    {
      question: 'Gibt es eine API für Entwickler?',
      answer: 'JA! Ab Enterprise-Plan hast du Zugriff auf unsere REST-API. Damit kannst du: Verträge hochladen, Analysen abrufen, Verträge generieren - alles programmatisch. Dokumentation: api.contract-ai.de/docs',
      category: 'technical'
    },
    {
      question: 'Bekomme ich Support, wenn ich Hilfe brauche?',
      answer: 'JA! Starter: E-Mail-Support (48h Antwortzeit). Business: E-Mail + Chat-Support (24h). Enterprise: Priority-Support (4h) + Telefon-Support. Alle Pläne: Umfangreiches Hilfe-Center, Video-Tutorials, Webinare.',
      category: 'general'
    },
    // ========== NEUE FAQs ==========
    {
      question: 'Was ist der Unterschied zwischen Legal Lens und normaler Analyse?',
      answer: 'Die normale Analyse gibt dir einen schnellen Überblick: Contract Score, wichtigste Risiken, Zusammenfassung. Legal Lens geht viel tiefer: Klausel-für-Klausel-Analyse, detaillierte Risikobewertung pro Abschnitt, konkrete Handlungsempfehlungen, Parteien-Identifikation, und ein exportierbarer Vollreport. Legal Lens ist ideal für wichtige oder komplexe Verträge.',
      category: 'general'
    },
    {
      question: 'Was ist der Unterschied zwischen Contract Builder und Generator?',
      answer: 'Generator: Geführter Prozess mit Formularfeldern. Ideal für Einsteiger und Standardverträge. Contract Builder: Visueller Drag & Drop Editor für maximale Flexibilität. Ideal für individuelle Verträge und Power-User. Beide können mit KI-Unterstützung und gespeicherten Klauseln arbeiten.',
      category: 'general'
    },
    {
      question: 'Wozu brauche ich die Klauselbibliothek?',
      answer: 'Die Klauselbibliothek ist deine persönliche Sammlung von bewährten Vertragsklauseln. Speichere Klauseln, die du häufig verwendest, und füge sie bei neuen Verträgen mit einem Klick ein. Zeit sparen + Konsistenz sicherstellen!',
      category: 'general'
    },
    {
      question: 'Kann ich mit mehreren Personen an Verträgen arbeiten?',
      answer: 'JA! Mit dem Team-Feature (Business/Enterprise) kannst du Teammitglieder einladen, Rollen vergeben (Admin, Editor, Viewer), Verträge teilen und gemeinsam bearbeiten. Alle Aktivitäten werden im Audit-Log protokolliert.',
      category: 'general'
    },
    {
      question: 'Wie funktioniert die Kündigungshilfe?',
      answer: 'Contract AI erkennt automatisch Kündigungsfristen in deinen Verträgen. Du kannst: 1) Erinnerungen aktivieren (E-Mail 30/14/7 Tage vorher), 2) Ein rechtssicheres Kündigungsschreiben per KI generieren lassen, 3) Den Kündigungsstatus tracken. Nie wieder eine Frist verpassen!',
      category: 'general'
    },
    {
      question: 'Was bedeutet der QR-Code auf generierten Verträgen?',
      answer: 'Jeder von Contract AI erstellte oder signierte Vertrag enthält einen QR-Code zur Echtheitsprüfung. Scanne ihn mit dem Smartphone → Du siehst sofort, ob der Vertrag echt ist, wann er erstellt wurde und wer unterschrieben hat. Perfekt gegen Fälschungen!',
      category: 'security'
    },
    {
      question: 'Welche Integrationen gibt es?',
      answer: 'Aktuell verfügbar: Google Drive, Dropbox, OneDrive (Dokumente automatisch synchronisieren), Slack & Microsoft Teams (Benachrichtigungen), Zapier & Make (Automatisierungen). Weitere Integrationen werden regelmäßig hinzugefügt. Enterprise-Kunden können auch individuelle Integrationen anfragen.',
      category: 'technical'
    },
    {
      question: 'Wie sicher ist die digitale Signatur?',
      answer: 'Sehr sicher! Unsere digitale Signatur ist rechtlich bindend in Deutschland und der EU (eIDAS-konform). Technisch: Kryptografische Hash-Verifizierung, Zeitstempel, eindeutige Signatur-ID, Audit-Trail. Jede Signatur wird mit IP-Adresse und Geräteinformationen protokolliert.',
      category: 'security'
    },
    {
      question: 'Kann ich meine Daten exportieren?',
      answer: 'JA! DSGVO-konform kannst du jederzeit alle deine Daten exportieren: Verträge (Original-PDFs), Analysen (als PDF), Kalender-Events (ICS), Kontodaten (JSON). Geh zu Profil → Datenschutz → "Alle Daten exportieren".',
      category: 'security'
    },
    {
      question: 'Wie lange werden meine Verträge gespeichert?',
      answer: 'Solange dein Konto aktiv ist, bleiben alle Verträge gespeichert. Nach Kündigung: 30 Tage zum Exportieren, dann dauerhafte Löschung. Du kannst einzelne Verträge jederzeit selbst löschen. Gelöschte Verträge sind unwiderruflich weg (kein Papierkorb).',
      category: 'security'
    },
    {
      question: 'Funktioniert Contract AI offline?',
      answer: 'NEIN. Contract AI ist eine Web-App und benötigt Internetverbindung. Die KI-Analyse läuft auf unseren Servern. Aber: Du kannst Analysen und Verträge als PDF herunterladen für Offline-Nutzung.',
      category: 'technical'
    },
    {
      question: 'Was passiert bei sehr langen Verträgen?',
      answer: 'Kein Problem! Contract AI analysiert Verträge bis zu 400 Seiten (Enterprise), 150 Seiten (Business) oder 50 Seiten (Free). Bei sehr langen Dokumenten kann die Analyse 2-3 Minuten dauern. Die Qualität bleibt gleich hoch. Bei Verträgen über dem Plan-Limit empfehlen wir, sie in Teildokumente aufzuteilen oder ein höheres Abo zu wählen.',
      category: 'technical'
    },
    {
      question: 'Werden handschriftliche Verträge unterstützt?',
      answer: 'Teilweise. Wenn der Vertrag als Scan (PDF/Bild) vorliegt, funktioniert OCR (Texterkennung). Die Qualität hängt von der Scan-Qualität ab. Für beste Ergebnisse: Hochauflösend scannen, guter Kontrast, keine Knicke. Rein handschriftliche Dokumente sind noch nicht optimal.',
      category: 'technical'
    },
    {
      question: 'Kann ich mein Abo upgraden oder downgraden?',
      answer: 'JA! Jederzeit. Upgrade: Sofort wirksam, nur der Differenzbetrag wird berechnet. Downgrade: Zum nächsten Abrechnungszeitpunkt wirksam. Geh zu Profil → Abonnement → "Plan ändern".',
      category: 'billing'
    },
    {
      question: 'Welche Zahlungsmethoden werden akzeptiert?',
      answer: 'Kredit-/Debitkarte (Visa, Mastercard, Amex), SEPA-Lastschrift, PayPal, Apple Pay, Google Pay. Unternehmenskunden können auch auf Rechnung zahlen (Enterprise-Plan). Alle Zahlungen werden sicher über Stripe abgewickelt.',
      category: 'billing'
    },
    {
      question: 'Bekomme ich eine Rechnung?',
      answer: 'JA! Nach jeder Zahlung erhältst du automatisch eine Rechnung per E-Mail. Alle Rechnungen findest du auch unter Profil → Rechnungen. Format: PDF mit allen steuerlich relevanten Angaben (inkl. MwSt.).',
      category: 'billing'
    },
    {
      question: 'Was ist, wenn mein Analyse-Kontingent aufgebraucht ist?',
      answer: 'Du wirst benachrichtigt, wenn du 80 % erreicht hast. Wenn alle Analysen verbraucht sind, kannst du: 1) Auf den nächsten Monat warten (Reset am 1.), 2) Einzelne Analysen nachkaufen (0,99€/Stück), 3) deinen Plan upgraden. Bestehende Verträge bleiben verfügbar.',
      category: 'billing'
    },
    {
      question: 'Gibt es Rabatte für Startups oder NGOs?',
      answer: 'JA! Startups (< 2 Jahre, < 10 Mitarbeiter) erhalten 50% Rabatt im ersten Jahr. NGOs und gemeinnützige Organisationen erhalten 30% dauerhaft. Schreib uns an support@contract-ai.de mit einem Nachweis.',
      category: 'billing'
    },
    {
      question: 'Was passiert bei technischen Problemen?',
      answer: 'Sollte etwas nicht funktionieren: 1) Seite neu laden (Strg+F5), 2) Cache löschen, 3) Anderen Browser testen. Immer noch Probleme? Schreib an support@contract-ai.de mit Screenshot und Fehlerbeschreibung. Wir antworten innerhalb von 24h.',
      category: 'technical'
    },
    {
      question: 'Wie genau ist die KI-Analyse?',
      answer: 'Sehr genau! Unsere KI wurde mit tausenden deutschen Verträgen trainiert und erreicht eine Erkennungsrate von über 95% bei Standardklauseln. WICHTIG: Die Analyse ist eine Unterstützung, kein Ersatz für Rechtsberatung. Bei kritischen Verträgen empfehlen wir immer zusätzlich einen Fachanwalt. Mehr zur Genauigkeit erfährst du in unserem <a href="/ki-vertragsanalyse">Guide zur KI-Vertragsanalyse</a>.',
      category: 'general'
    },
    {
      question: 'Kann ich Contract AI auf dem Handy nutzen?',
      answer: 'JA! Die Web-App ist vollständig responsive und funktioniert perfekt auf Smartphone und Tablet. Du kannst Verträge fotografieren und direkt hochladen. Eine native App für iOS/Android ist in Planung.',
      category: 'technical'
    },
    {
      question: 'Was ist Better Contracts?',
      answer: 'Better Contracts ist unser KI-Feature zur automatischen Vertragsverbesserung. Lade einen bestehenden Vertrag hoch → die KI findet Schwachstellen und schlägt bessere Formulierungen vor → du entscheidest, was übernommen wird → Download des verbesserten Vertrags.',
      category: 'general'
    },
    {
      question: 'Wie kann ich Feedback geben oder Features vorschlagen?',
      answer: 'Wir freuen uns über Feedback! 1) E-Mail an feedback@contract-ai.de, 2) Im Dashboard unter "Feedback geben", 3) Beta-Programm beitreten für frühen Zugang zu neuen Features. Die besten Vorschläge werden umgesetzt!',
      category: 'general'
    }
  ];

  // 🔍 FILTER & SEARCH LOGIC (nur Suche, Kategorien werden gruppiert angezeigt)
  const filteredGuides = useMemo(() => {
    if (!searchTerm.trim()) return guides;

    const term = searchTerm.toLowerCase();
    return guides.filter(g =>
      g.title.toLowerCase().includes(term) ||
      g.description.toLowerCase().includes(term) ||
      g.steps.some(step =>
        step.title.toLowerCase().includes(term) ||
        step.description.toLowerCase().includes(term)
      )
    );
  }, [searchTerm, guides]);

  const filteredFAQs = useMemo(() => {
    if (!searchTerm.trim()) return faqItems;

    const term = searchTerm.toLowerCase();
    return faqItems.filter(faq =>
      faq.question.toLowerCase().includes(term) ||
      faq.answer.toLowerCase().includes(term)
    );
  }, [searchTerm, faqItems]);

  const handleFAQToggle = (index: number) => {
    setOpenFAQ(openFAQ === index ? null : index);
  };

  const handleGuideToggle = (id: string) => {
    setExpandedGuide(expandedGuide === id ? null : id);
  };

  // Scroll-reveal animation
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add(styles.visible);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );

    const elements = document.querySelectorAll(`.${styles.animateOnScroll}`);
    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [activeTab, filteredGuides, filteredFAQs]);

  return (
    <>
      <Helmet>
        <title>Hilfe-Center | Contract AI - Vollständige Anleitungen</title>
        <meta name="description" content="Komplettes Hilfe-Center mit Schritt-für-Schritt-Anleitungen für alle Contract AI Features: Upload, Analyse, Optimizer, Generator, Chat, Legal Pulse, Kalender und mehr." />
        <meta name="keywords" content="Hilfe, Support, Anleitung, Tutorial, Contract AI Hilfe, Vertragsanalyse Anleitung, KI Vertrag" />
        <link rel="canonical" href="https://www.contract-ai.de/hilfe" />
        <meta property="og:title" content="Hilfe-Center | Contract AI" />
        <meta property="og:description" content="Alle Funktionen von Contract AI verständlich erklärt - von Upload bis zur digitalen Signatur." />
        <meta property="og:url" content="https://www.contract-ai.de/hilfe" />
        <meta property="og:type" content="website" />

        <script type="application/ld+json">
          {JSON.stringify(breadcrumbSchema)}
        </script>
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": faqItems.map(faq => ({
              "@type": "Question",
              "name": faq.question,
              "acceptedAnswer": {
                "@type": "Answer",
                "text": faq.answer
              }
            }))
          })}
        </script>
      </Helmet>

      <div className={styles.helpCenter}>
        {/* Hero Section */}
        <section className={styles.hero}>
          <div className={styles.container}>
            {/* 31.08.2026: von 48 auf 32 verkleinert. Der Kopf nahm auf dem Handy
                rund 380 von 844 Pixeln ein, also fast die halbe Fläche, bevor
                überhaupt das Suchfeld kam. Bei einem Hilfe-Center ist die Suche
                das Wichtigste, nicht die Dekoration. */}
            <Sparkles className={styles.heroIcon} size={32} />
            <h1 className={styles.heroTitle}>Hilfe-Center</h1>
            <p className={styles.heroSubtitle}>
              Alles über Contract AI, verständlich erklärt, Schritt für Schritt
            </p>

            {/* 31.08.2026: Die Suche stand vorher in einem EIGENEN Abschnitt
                unter dem Kopf. Dadurch füllte der blaue Block die halbe
                Bildschirmfläche mit Titel, Untertitel und einem Knopf, bevor
                das kam, weswegen man ein Hilfe-Center überhaupt öffnet.
                Jetzt steht die Suche im Kopf: gleiche Fläche, aber der
                wichtigste Bedienteil ist sofort da. */}
            {/* Platzhalter bewusst kurz: die lange Fassung mit Beispielen
                ("z.B. Vertrag hochladen, Signatur, Optimizer") wurde auf einem
                390 Pixel breiten Handy mitten im Wort abgeschnitten. */}
            <div className={styles.searchBar}>
              <Search className={styles.searchIcon} size={20} />
              <input
                type="text"
                className={styles.searchInput}
                placeholder="Wonach suchst du?"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button className={styles.clearSearch} onClick={() => setSearchTerm('')}>
                  <X size={18} />
                </button>
              )}
            </div>

            <button
              className={styles.startTourButton}
              onClick={() => {
                localStorage.removeItem('contractai_onboarding_completed');
                window.location.href = '/dashboard';
              }}
            >
              <Lightbulb size={18} />
              Interaktive Tour starten
            </button>
          </div>
        </section>

        {/* Tab Navigation */}
        <nav className={styles.tabNav}>
          <div className={styles.tabButtons}>
            <button
              className={`${styles.tabButton} ${activeTab === 'guides' ? styles.active : ''}`}
              onClick={() => setActiveTab('guides')}
            >
              <FileText size={18} />
              Anleitungen
            </button>
            <button
              className={`${styles.tabButton} ${activeTab === 'faq' ? styles.active : ''}`}
              onClick={() => setActiveTab('faq')}
            >
              <AlertCircle size={18} />
              FAQ
            </button>
          </div>
        </nav>

        {/* Content Sections */}
        <main className={styles.contentSection}>
          <div className={styles.container}>
            {/* GUIDES TAB */}
            {activeTab === 'guides' && (
              <div className={styles.tabContent}>
                <div className={styles.sectionHeader}>
                  <span className={styles.sectionEyebrow}>TUTORIALS</span>
                  <h2 className={styles.sectionTitle}>Schritt für <span className={styles.sectionTitleAccent}>Schritt</span></h2>
                </div>
                <p className={styles.sectionSubtitle}>
                  {filteredGuides.length} {filteredGuides.length === 1 ? 'Anleitung' : 'Anleitungen'} verfügbar
                </p>

                {/* Grundlagen */}
                {filteredGuides.filter(g => g.category === 'basics').length > 0 && (
                  <div className={styles.categorySection}>
                    <h3 className={styles.categoryHeading}>
                      <span className={styles.categoryIcon}>
                        <Layout size={20} />
                      </span>
                      Grundlagen
                    </h3>
                    <p className={styles.categoryDescription}>Erste Schritte und Basis-Funktionen</p>
                    <div className={styles.guidesContainer}>
                      {filteredGuides.filter(g => g.category === 'basics').map((guide) => (
                        <div key={guide.id} className={`${styles.guideCard} ${styles.animateOnScroll}`}>
                          <div className={styles.guideHeader} onClick={() => handleGuideToggle(guide.id)}>
                            <div className={styles.guideIcon}>
                              {guide.icon}
                            </div>
                            <div className={styles.guideInfo}>
                              <h3 className={styles.guideTitle}>{guide.title}</h3>
                              <p className={styles.guideDescription}>{guide.description}</p>
                            </div>
                            <ChevronDown
                              className={`${styles.expandIcon} ${expandedGuide === guide.id ? styles.rotated : ''}`}
                              size={24}
                            />
                          </div>
                          {expandedGuide === guide.id && (
                            <div className={styles.guideSteps}>
                              {guide.steps.map((step, index) => (
                                <div key={index} className={styles.step}>
                                  <div className={styles.stepHeader}>
                                    <div className={styles.stepNumber}>{index + 1}</div>
                                    <h4 className={styles.stepTitle}>{step.title}</h4>
                                  </div>
                                  <p className={styles.stepDescription}>{step.description}</p>
                                  {step.tips && step.tips.length > 0 && (
                                    <div className={styles.stepTips}>
                                      <div className={styles.tipsHeader}>
                                        <Lightbulb size={16} />
                                        <span>Tipps:</span>
                                      </div>
                                      <ul className={styles.tipsList}>
                                        {step.tips.map((tip, tipIndex) => (
                                          <li key={tipIndex}>{tip}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Features */}
                {filteredGuides.filter(g => g.category === 'features').length > 0 && (
                  <div className={styles.categorySection}>
                    <h3 className={styles.categoryHeading}>
                      <span className={styles.categoryIcon}>
                        <Zap size={20} />
                      </span>
                      Features
                    </h3>
                    <p className={styles.categoryDescription}>Kernfunktionen und Werkzeuge</p>
                    <div className={styles.guidesContainer}>
                      {filteredGuides.filter(g => g.category === 'features').map((guide) => (
                        <div key={guide.id} className={`${styles.guideCard} ${styles.animateOnScroll}`}>
                          <div className={styles.guideHeader} onClick={() => handleGuideToggle(guide.id)}>
                            <div className={styles.guideIcon}>
                              {guide.icon}
                            </div>
                            <div className={styles.guideInfo}>
                              <h3 className={styles.guideTitle}>{guide.title}</h3>
                              <p className={styles.guideDescription}>{guide.description}</p>
                            </div>
                            <ChevronDown
                              className={`${styles.expandIcon} ${expandedGuide === guide.id ? styles.rotated : ''}`}
                              size={24}
                            />
                          </div>
                          {expandedGuide === guide.id && (
                            <div className={styles.guideSteps}>
                              {guide.steps.map((step, index) => (
                                <div key={index} className={styles.step}>
                                  <div className={styles.stepHeader}>
                                    <div className={styles.stepNumber}>{index + 1}</div>
                                    <h4 className={styles.stepTitle}>{step.title}</h4>
                                  </div>
                                  <p className={styles.stepDescription}>{step.description}</p>
                                  {step.tips && step.tips.length > 0 && (
                                    <div className={styles.stepTips}>
                                      <div className={styles.tipsHeader}>
                                        <Lightbulb size={16} />
                                        <span>Tipps:</span>
                                      </div>
                                      <ul className={styles.tipsList}>
                                        {step.tips.map((tip, tipIndex) => (
                                          <li key={tipIndex}>{tip}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Premium */}
                {filteredGuides.filter(g => g.category === 'premium').length > 0 && (
                  <div className={styles.categorySection}>
                    <h3 className={styles.categoryHeading}>
                      <span className={`${styles.categoryIcon} ${styles.premiumIcon}`}>
                        <Shield size={20} />
                      </span>
                      Premium-Features
                    </h3>
                    <p className={styles.categoryDescription}>Erweiterte KI-Funktionen für Power-User</p>
                    <div className={styles.guidesContainer}>
                      {filteredGuides.filter(g => g.category === 'premium').map((guide) => (
                        <div key={guide.id} className={`${styles.guideCard} ${styles.animateOnScroll}`}>
                          <div className={styles.guideHeader} onClick={() => handleGuideToggle(guide.id)}>
                            <div className={styles.guideIcon}>
                              {guide.icon}
                            </div>
                            <div className={styles.guideInfo}>
                              <h3 className={styles.guideTitle}>{guide.title}</h3>
                              <p className={styles.guideDescription}>{guide.description}</p>
                              <span className={styles.premiumBadge}>
                                <Shield size={14} />
                                Premium
                              </span>
                            </div>
                            <ChevronDown
                              className={`${styles.expandIcon} ${expandedGuide === guide.id ? styles.rotated : ''}`}
                              size={24}
                            />
                          </div>
                          {expandedGuide === guide.id && (
                            <div className={styles.guideSteps}>
                              {guide.steps.map((step, index) => (
                                <div key={index} className={styles.step}>
                                  <div className={styles.stepHeader}>
                                    <div className={styles.stepNumber}>{index + 1}</div>
                                    <h4 className={styles.stepTitle}>{step.title}</h4>
                                  </div>
                                  <p className={styles.stepDescription}>{step.description}</p>
                                  {step.tips && step.tips.length > 0 && (
                                    <div className={styles.stepTips}>
                                      <div className={styles.tipsHeader}>
                                        <Lightbulb size={16} />
                                        <span>Tipps:</span>
                                      </div>
                                      <ul className={styles.tipsList}>
                                        {step.tips.map((tip, tipIndex) => (
                                          <li key={tipIndex}>{tip}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Einstellungen */}
                {filteredGuides.filter(g => g.category === 'settings').length > 0 && (
                  <div className={styles.categorySection}>
                    <h3 className={styles.categoryHeading}>
                      <span className={styles.categoryIcon}>
                        <User size={20} />
                      </span>
                      Einstellungen
                    </h3>
                    <p className={styles.categoryDescription}>Konto und Abonnement verwalten</p>
                    <div className={styles.guidesContainer}>
                      {filteredGuides.filter(g => g.category === 'settings').map((guide) => (
                        <div key={guide.id} className={`${styles.guideCard} ${styles.animateOnScroll}`}>
                          <div className={styles.guideHeader} onClick={() => handleGuideToggle(guide.id)}>
                            <div className={styles.guideIcon}>
                              {guide.icon}
                            </div>
                            <div className={styles.guideInfo}>
                              <h3 className={styles.guideTitle}>{guide.title}</h3>
                              <p className={styles.guideDescription}>{guide.description}</p>
                            </div>
                            <ChevronDown
                              className={`${styles.expandIcon} ${expandedGuide === guide.id ? styles.rotated : ''}`}
                              size={24}
                            />
                          </div>
                          {expandedGuide === guide.id && (
                            <div className={styles.guideSteps}>
                              {guide.steps.map((step, index) => (
                                <div key={index} className={styles.step}>
                                  <div className={styles.stepHeader}>
                                    <div className={styles.stepNumber}>{index + 1}</div>
                                    <h4 className={styles.stepTitle}>{step.title}</h4>
                                  </div>
                                  <p className={styles.stepDescription}>{step.description}</p>
                                  {step.tips && step.tips.length > 0 && (
                                    <div className={styles.stepTips}>
                                      <div className={styles.tipsHeader}>
                                        <Lightbulb size={16} />
                                        <span>Tipps:</span>
                                      </div>
                                      <ul className={styles.tipsList}>
                                        {step.tips.map((tip, tipIndex) => (
                                          <li key={tipIndex}>{tip}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {filteredGuides.length === 0 && (
                  <div className={styles.noResults}>
                    <Info size={48} />
                    <h3>Keine Anleitungen gefunden</h3>
                    <p>Versuche einen anderen Suchbegriff.</p>
                  </div>
                )}
              </div>
            )}

            {/* FAQ TAB */}
            {activeTab === 'faq' && (
              <div className={styles.tabContent}>
                <div className={styles.sectionHeader}>
                  <span className={styles.sectionEyebrow}>FAQ</span>
                  <h2 className={styles.sectionTitle}>Häufig gestellte <span className={styles.sectionTitleAccent}>Fragen</span></h2>
                </div>
                <p className={styles.sectionSubtitle}>
                  {filteredFAQs.length} {filteredFAQs.length === 1 ? 'Frage' : 'Fragen'} verfügbar
                </p>

                {/* Allgemeine Fragen */}
                {filteredFAQs.filter(f => f.category === 'general').length > 0 && (
                  <div className={styles.faqCategorySection}>
                    <h3 className={styles.categoryHeading}>
                      <span className={styles.categoryIcon}>
                        <Info size={20} />
                      </span>
                      Allgemeine Fragen
                    </h3>
                    <p className={styles.categoryDescription}>Grundlegende Informationen zu Contract AI</p>
                    <div className={styles.faqList}>
                      {filteredFAQs.filter(f => f.category === 'general').map((faq, index) => {
                        const globalIndex = filteredFAQs.indexOf(faq);
                        return (
                          <div key={index} className={`${styles.faqItem} ${styles.animateOnScroll} ${openFAQ === globalIndex ? styles.open : ''}`}>
                            <button
                              className={styles.faqQuestion}
                              onClick={() => handleFAQToggle(globalIndex)}
                            >
                              <span className={styles.faqQuestionText}>{faq.question}</span>
                              <ChevronDown
                                className={`${styles.faqToggle} ${openFAQ === globalIndex ? styles.rotated : ''}`}
                                size={20}
                              />
                            </button>
                            {openFAQ === globalIndex && (
                              <div className={styles.faqAnswer}>
                                <p dangerouslySetInnerHTML={{ __html: faq.answer }} />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Technische Fragen */}
                {filteredFAQs.filter(f => f.category === 'technical').length > 0 && (
                  <div className={styles.faqCategorySection}>
                    <h3 className={styles.categoryHeading}>
                      <span className={styles.categoryIcon}>
                        <Zap size={20} />
                      </span>
                      Technische Fragen
                    </h3>
                    <p className={styles.categoryDescription}>Funktionsweise, Formate und technische Details</p>
                    <div className={styles.faqList}>
                      {filteredFAQs.filter(f => f.category === 'technical').map((faq, index) => {
                        const globalIndex = filteredFAQs.indexOf(faq);
                        return (
                          <div key={index} className={`${styles.faqItem} ${styles.animateOnScroll} ${openFAQ === globalIndex ? styles.open : ''}`}>
                            <button
                              className={styles.faqQuestion}
                              onClick={() => handleFAQToggle(globalIndex)}
                            >
                              <span className={styles.faqQuestionText}>{faq.question}</span>
                              <ChevronDown
                                className={`${styles.faqToggle} ${openFAQ === globalIndex ? styles.rotated : ''}`}
                                size={20}
                              />
                            </button>
                            {openFAQ === globalIndex && (
                              <div className={styles.faqAnswer}>
                                <p dangerouslySetInnerHTML={{ __html: faq.answer }} />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Sicherheit & Datenschutz */}
                {filteredFAQs.filter(f => f.category === 'security').length > 0 && (
                  <div className={styles.faqCategorySection}>
                    <h3 className={styles.categoryHeading}>
                      <span className={`${styles.categoryIcon} ${styles.securityIcon}`}>
                        <Shield size={20} />
                      </span>
                      Sicherheit & Datenschutz
                    </h3>
                    <p className={styles.categoryDescription}>Datensicherheit, DSGVO und Verschlüsselung</p>
                    <div className={styles.faqList}>
                      {filteredFAQs.filter(f => f.category === 'security').map((faq, index) => {
                        const globalIndex = filteredFAQs.indexOf(faq);
                        return (
                          <div key={index} className={`${styles.faqItem} ${styles.animateOnScroll} ${openFAQ === globalIndex ? styles.open : ''}`}>
                            <button
                              className={styles.faqQuestion}
                              onClick={() => handleFAQToggle(globalIndex)}
                            >
                              <span className={styles.faqQuestionText}>{faq.question}</span>
                              <ChevronDown
                                className={`${styles.faqToggle} ${openFAQ === globalIndex ? styles.rotated : ''}`}
                                size={20}
                              />
                            </button>
                            {openFAQ === globalIndex && (
                              <div className={styles.faqAnswer}>
                                <p dangerouslySetInnerHTML={{ __html: faq.answer }} />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Abrechnung & Preise */}
                {filteredFAQs.filter(f => f.category === 'billing').length > 0 && (
                  <div className={styles.faqCategorySection}>
                    <h3 className={styles.categoryHeading}>
                      <span className={styles.categoryIcon}>
                        <CreditCard size={20} />
                      </span>
                      Abrechnung & Preise
                    </h3>
                    <p className={styles.categoryDescription}>Kosten, Abonnements und Zahlungsmethoden</p>
                    <div className={styles.faqList}>
                      {filteredFAQs.filter(f => f.category === 'billing').map((faq, index) => {
                        const globalIndex = filteredFAQs.indexOf(faq);
                        return (
                          <div key={index} className={`${styles.faqItem} ${styles.animateOnScroll} ${openFAQ === globalIndex ? styles.open : ''}`}>
                            <button
                              className={styles.faqQuestion}
                              onClick={() => handleFAQToggle(globalIndex)}
                            >
                              <span className={styles.faqQuestionText}>{faq.question}</span>
                              <ChevronDown
                                className={`${styles.faqToggle} ${openFAQ === globalIndex ? styles.rotated : ''}`}
                                size={20}
                              />
                            </button>
                            {openFAQ === globalIndex && (
                              <div className={styles.faqAnswer}>
                                <p dangerouslySetInnerHTML={{ __html: faq.answer }} />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {filteredFAQs.length === 0 && (
                  <div className={styles.noResults}>
                    <Info size={48} />
                    <h3>Keine FAQs gefunden</h3>
                    <p>Versuche einen anderen Suchbegriff.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>

        {/* Still Need Help Section */}
        <section className={styles.helpSection}>
          <div className={styles.container}>
            <div className={styles.helpBox}>
              <h2>Brauchst du weitere Hilfe?</h2>
              <p>Unser Support-Team steht dir gerne zur Verfügung!</p>
              <div className={styles.helpActions}>
                <a href="mailto:support@contract-ai.de" className={styles.helpBtn}>
                  <Mail size={20} />
                  E-Mail Support
                </a>
                <Link to="/dashboard" className={styles.helpBtn}>
                  <ArrowRight size={20} />
                  Zum Dashboard
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <LandingFooter />
      </div>
    </>
  );
};

export default HelpCenter;
