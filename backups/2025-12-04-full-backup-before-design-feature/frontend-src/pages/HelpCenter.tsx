import React, { useState, useMemo } from 'react';
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
import Footer from '../components/Footer';

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
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedGuide, setExpandedGuide] = useState<string | null>(null);

  // 📚 KOMPLETTE FEATURE-ANLEITUNGEN (Super einfach erklärt!)
  const guides: GuideSection[] = [
    {
      id: 'upload-contract',
      icon: <Upload size={24} />,
      title: 'Vertrag hochladen & analysieren',
      description: 'So laden Sie Ihren ersten Vertrag hoch und lassen ihn analysieren',
      category: 'basics',
      steps: [
        {
          title: '1. Zur Verträge-Seite navigieren',
          description: 'Klicken Sie in der Navigation oben auf "Verträge" oder gehen Sie zu Dashboard und klicken dort auf "Neuer Vertrag".',
        },
        {
          title: '2. Datei auswählen',
          description: 'Klicken Sie auf "Vertrag hochladen" oder ziehen Sie die PDF-Datei einfach per Drag & Drop in den markierten Bereich.',
          tips: ['Unterstützte Formate: PDF, DOC, DOCX', 'Maximale Dateigröße: 10 MB', 'Mehrere Dateien gleichzeitig möglich']
        },
        {
          title: '3. Analyse warten',
          description: 'Die KI analysiert Ihren Vertrag automatisch. Das dauert etwa 30-60 Sekunden. Sie sehen einen Fortschrittsbalken.',
        },
        {
          title: '4. Ergebnisse ansehen',
          description: 'Nach der Analyse sehen Sie: Contract Score (0-100), erkannte Risiken, Verbesserungsvorschläge, Laufzeit & Kündigungsfrist.',
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
          description: 'Das Dashboard ist Ihre Startseite nach dem Login. Hier sehen Sie alles auf einen Blick.',
        },
        {
          title: '2. Prioritäts-Verträge',
          description: 'Oben werden die wichtigsten Verträge angezeigt: Bald ablaufende (< 30 Tage), Verträge mit Erinnerung, neueste Uploads.',
        },
        {
          title: '3. Statistiken',
          description: 'Sehen Sie Diagramme: Anzahl Verträge, durchschnittlicher Contract Score, Verteilung nach Status.',
        },
        {
          title: '4. Anstehende Fristen',
          description: 'Widget zeigt kommende Kündigungsfristen und wichtige Termine aus Ihrem Vertrags-Kalender.',
        }
      ]
    },
    {
      id: 'optimizer',
      icon: <Wand2 size={24} />,
      title: 'Verträge optimieren',
      description: 'So verbessern Sie Ihre Verträge mit KI-Unterstützung',
      category: 'premium',
      steps: [
        {
          title: '1. Optimizer öffnen',
          description: 'Klicken Sie in der Navigation auf "Optimizer" oder öffnen Sie einen Vertrag und klicken auf "Optimieren".',
        },
        {
          title: '2. Vertrag auswählen',
          description: 'Wählen Sie einen bestehenden Vertrag aus Ihrer Liste ODER laden Sie einen neuen Vertrag hoch.',
        },
        {
          title: '3. Optimierungen prüfen',
          description: 'Die KI zeigt Ihnen konkrete Verbesserungsvorschläge: Klauseln umformulieren, fehlende Regelungen ergänzen, Risiken entschärfen.',
          tips: ['Jeder Vorschlag zeigt: Original vs. Verbesserung', 'Begründung für die Änderung', 'Schweregrad der Optimierung']
        },
        {
          title: '4. Änderungen übernehmen',
          description: 'Wählen Sie die gewünschten Optimierungen aus und generieren Sie eine verbesserte Version als DOCX oder PDF.',
        },
        {
          title: '5. Speichern & Exportieren',
          description: 'Laden Sie die optimierte Version herunter oder speichern Sie sie direkt in Ihrer Vertragsverwaltung.',
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
          description: 'Navigieren Sie zu "Vergleichen" in der Hauptnavigation.',
        },
        {
          title: '2. Profil auswählen',
          description: 'Wählen Sie Ihr Profil: Privatperson, Freelancer oder Unternehmen. Die Analyse passt sich automatisch an.',
        },
        {
          title: '3. Zwei Verträge hochladen',
          description: 'Laden Sie Vertrag 1 und Vertrag 2 hoch. Sie können auch aus Ihren bestehenden Verträgen auswählen.',
        },
        {
          title: '4. Unterschiede analysieren',
          description: 'Die KI zeigt alle relevanten Unterschiede: Kosten, Laufzeit, Kündigungsfristen, Leistungsumfang, Haftungsregelungen.',
          tips: ['Farbcodierung: Grün = besser in Vertrag 1, Rot = besser in Vertrag 2', 'Schweregrad: Kritisch, Hoch, Mittel, Niedrig']
        },
        {
          title: '5. Empfehlung erhalten',
          description: 'Am Ende gibt die KI eine klare Empfehlung: Welcher Vertrag ist für Sie besser und warum?',
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
          description: 'Klicken Sie auf "Generieren" in der Hauptnavigation.',
        },
        {
          title: '2. Vertragstyp wählen',
          description: 'Wählen Sie aus 15+ Vorlagen: Freelancer-Vertrag, Mietvertrag, NDA, Arbeitsvertrag, Kaufvertrag, uvm.',
        },
        {
          title: '3. Formular ausfüllen',
          description: 'Füllen Sie die Felder aus: Vertragspartner, Leistungsbeschreibung, Vergütung, Laufzeit, etc. Alle Felder haben Hilfe-Texte.',
          tips: ['Pflichtfelder sind markiert', 'Validierung verhindert Fehler', 'Company Profile optional nutzbar']
        },
        {
          title: '4. Company Profile nutzen (optional)',
          description: 'Speichern Sie Ihre Firmendaten einmal und nutzen Sie sie für alle Verträge: Firmenname, Adresse, USt-ID, Bankdaten, Logo.',
        },
        {
          title: '5. Vertrag generieren',
          description: 'Die KI erstellt einen rechtssicheren Vertrag basierend auf Ihren Eingaben. Sie können ihn als PDF/DOCX herunterladen oder direkt zur Signatur senden.',
        }
      ]
    },
    {
      id: 'chat',
      icon: <MessageSquare size={24} />,
      title: 'Legal Chat nutzen',
      description: 'Mit der KI über Ihre Verträge chatten und Fragen stellen',
      category: 'premium',
      steps: [
        {
          title: '1. Chat öffnen',
          description: 'Navigieren Sie zu "Chat" in der Hauptnavigation. Ein neuer Chat wird automatisch erstellt.',
        },
        {
          title: '2. Vertrag hochladen (optional)',
          description: 'Laden Sie einen Vertrag hoch, um spezifische Fragen dazu zu stellen. Die KI analysiert den Kontext automatisch.',
          tips: ['Smart Questions: Die KI schlägt passende Fragen vor', 'Mehrere Verträge gleichzeitig möglich']
        },
        {
          title: '3. Fragen stellen',
          description: 'Stellen Sie Fragen in natürlicher Sprache: "Was bedeutet Klausel 5?", "Ist dieser Vertrag fair?", "Welche Risiken gibt es?"',
        },
        {
          title: '4. Chat-Historie nutzen',
          description: 'Alle Chats werden gespeichert. Klicken Sie links auf einen alten Chat, um die Unterhaltung fortzusetzen.',
        },
        {
          title: '5. Chats verwalten',
          description: 'Benennen Sie Chats um, archivieren Sie alte Gespräche oder löschen Sie sie.',
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
          description: 'Klicken Sie auf "Legal Pulse" in der Navigation. Sie sehen Ihren Risiko-Score und aktuelle News.',
        },
        {
          title: '2. Verträge überwachen',
          description: 'Wählen Sie Verträge aus, die überwacht werden sollen. Legal Pulse prüft automatisch, ob neue Gesetze oder Urteile relevant sind.',
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
          description: 'Sehen Sie aktuelle Gesetzesänderungen, wichtige Urteile und Rechts-Updates, die Ihre Verträge betreffen können.',
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
          description: 'Navigieren Sie zu "Kalender" in der Hauptnavigation. Alle Vertragstermine werden automatisch eingetragen.',
        },
        {
          title: '2. Events verstehen',
          description: 'Es gibt 3 Arten von Events: Kündigungsfristen (rot), Vertragslaufzeit-Ende (gelb), Erinnerungen (blau).',
        },
        {
          title: '3. Event-Details ansehen',
          description: 'Klicken Sie auf einen Termin, um Details zu sehen: Vertragsname, Kündigungsfrist, empfohlene Aktion.',
          tips: ['Tage bis Fristende werden angezeigt', 'Quick Actions: Vertrag öffnen, Erinnerung setzen, Kündigung vorbereiten']
        },
        {
          title: '4. Erinnerungen aktivieren',
          description: 'Aktivieren Sie Erinnerungen für wichtige Fristen. Sie erhalten E-Mails 30, 14 und 7 Tage vor Ablauf.',
        },
        {
          title: '5. Kalender exportieren',
          description: 'Exportieren Sie Events als ICS-Datei für Google Calendar, Outlook oder Apple Calendar.',
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
          description: 'Navigieren Sie zu "Signaturen" oder öffnen Sie einen Vertrag und klicken auf "Zur Signatur senden".',
        },
        {
          title: '2. Envelope erstellen',
          description: 'Ein "Envelope" ist ein Signatur-Paket. Geben Sie Titel und Nachricht ein (z.B. "Bitte bis Freitag unterschreiben").',
        },
        {
          title: '3. Unterzeichner hinzufügen',
          description: 'Fügen Sie 1-10 Unterzeichner hinzu: Name, E-Mail, Rolle (z.B. "Kunde", "Auftragnehmer"). Legen Sie die Reihenfolge fest.',
          tips: ['Sequentielle Signatur: Erst Person 1, dann Person 2, usw.', 'Parallele Signatur: Alle gleichzeitig']
        },
        {
          title: '4. Signaturfelder platzieren',
          description: 'Ziehen Sie Signaturfelder an die gewünschten Stellen im PDF. Jedes Feld wird automatisch dem richtigen Unterzeichner zugeordnet.',
        },
        {
          title: '5. Versenden & Tracking',
          description: 'Senden Sie das Envelope. Unterzeichner erhalten einen Link. Sie sehen in Echtzeit, wer bereits unterschrieben hat.',
        },
        {
          title: '6. Fertiges Dokument',
          description: 'Nach allen Signaturen wird das fertige PDF automatisch in Ihrer Vertragsverwaltung gespeichert.',
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
          description: 'Gehen Sie zu "Verträge" und klicken Sie auf "Neuer Ordner". Geben Sie einen Namen ein (z.B. "Mietverträge", "Kunden 2025").',
        },
        {
          title: '2. Verträge in Ordner verschieben',
          description: 'Ziehen Sie Verträge per Drag & Drop in Ordner ODER wählen Sie mehrere Verträge aus und klicken auf "In Ordner verschieben".',
        },
        {
          title: '3. Ordner filtern',
          description: 'Klicken Sie oben auf einen Ordner, um nur Verträge aus diesem Ordner anzuzeigen.',
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
      description: 'Batch-Upload für effizientes Arbeiten',
      category: 'features',
      steps: [
        {
          title: '1. Mehrfach-Auswahl',
          description: 'Bei "Vertrag hochladen" können Sie mehrere PDFs gleichzeitig auswählen (Strg/Cmd + Klick) oder alle per Drag & Drop ziehen.',
        },
        {
          title: '2. Analyse-Warteschlange',
          description: 'Alle Verträge werden nacheinander analysiert. Sie sehen eine Fortschrittsanzeige für jeden Vertrag.',
          tips: ['Max. 10 Verträge gleichzeitig', 'Duplikatserkennung verhindert doppelte Uploads']
        },
        {
          title: '3. Ergebnisse prüfen',
          description: 'Nach Abschluss sehen Sie eine Übersicht: Erfolgreich analysiert, Fehler, Duplikate.',
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
          description: 'Gehen Sie zu "Verträge" → "E-Mail Upload". Dort finden Sie Ihre persönliche Upload-E-Mail-Adresse.',
        },
        {
          title: '2. Vertrag per E-Mail senden',
          description: 'Senden Sie eine E-Mail mit PDF-Anhang an diese Adresse. Betreff und Text sind optional.',
          tips: ['Mehrere PDFs pro E-Mail möglich', 'Max. 10 MB pro Anhang']
        },
        {
          title: '3. Automatische Analyse',
          description: 'Der Vertrag wird automatisch hochgeladen und analysiert. Sie erhalten eine Bestätigungs-E-Mail.',
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
          description: 'Öffnen Sie einen Vertrag und klicken Sie auf "Erinnerung aktivieren" (Glockensymbol).',
        },
        {
          title: '2. Tage auswählen',
          description: 'Wählen Sie, wann Sie erinnert werden möchten: 30, 14, 7, 3 oder 1 Tag vor Kündigungsfrist.',
        },
        {
          title: '3. E-Mail-Benachrichtigungen',
          description: 'Sie erhalten automatisch E-Mails mit allen Details: Vertrag, Frist, empfohlene Aktion.',
        },
        {
          title: '4. Erinnerungen verwalten',
          description: 'In den Vertrags-Details sehen Sie alle aktiven Erinnerungen und können sie bearbeiten oder löschen.',
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
          description: 'Gehen Sie zu "Generieren" → "Company Profile verwalten" → "Neues Profil".',
        },
        {
          title: '2. Daten eingeben',
          description: 'Füllen Sie alle Firmeninfos aus: Name, Rechtsform, Adresse, USt-ID, Handelsregister, Bankverbindung.',
          tips: ['Logo hochladen (optional)', 'Mehrere Profile möglich (z.B. für mehrere Firmen)', 'Daten sind verschlüsselt gespeichert']
        },
        {
          title: '3. Bei Vertrags-Generierung nutzen',
          description: 'Wenn Sie einen Vertrag generieren, wählen Sie einfach Ihr Profil aus. Alle Felder werden automatisch ausgefüllt.',
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
          description: 'Gehen Sie zu Ihren Verträgen und öffnen Sie die Detailansicht eines analysierten Vertrags.',
        },
        {
          title: '2. Export-Optionen',
          description: 'Klicken Sie auf "Exportieren". Wählen Sie: Analyse-Report (PDF), Original-Vertrag, Beide kombiniert.',
        },
        {
          title: '3. PDF anpassen',
          description: 'Wählen Sie, was im Report enthalten sein soll: Contract Score, Risiken, Optimierungen, Empfehlungen.',
        },
        {
          title: '4. Download oder Teilen',
          description: 'Laden Sie die PDF herunter ODER generieren Sie einen Share-Link zum Teilen mit Kollegen/Anwälten.',
          tips: ['Share-Links sind 7 Tage gültig', 'Passwort-Schutz optional', 'Tracking: Sehen Sie, wer die PDF geöffnet hat']
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
          description: 'Klicken Sie oben rechts auf Ihr Avatar-Symbol → "Profil".',
        },
        {
          title: '2. Passwort ändern',
          description: 'Unter "Sicherheit" können Sie Ihr Passwort ändern. Geben Sie altes + neues Passwort ein.',
        },
        {
          title: '3. Daten exportieren (DSGVO)',
          description: 'Unter "Datenschutz" können Sie alle Ihre Daten als ZIP-Archiv herunterladen.',
        },
        {
          title: '4. Konto löschen',
          description: 'Wenn Sie Ihr Konto löschen möchten: "Konto löschen" → Bestätigung. Alle Daten werden sofort gelöscht.',
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
          description: 'In Ihrem Profil sehen Sie: Aktueller Plan, Nutzungs-Limits, nächstes Abrechnungsdatum.',
        },
        {
          title: '2. Plan upgraden',
          description: 'Klicken Sie auf "Plan upgraden". Wählen Sie einen höheren Plan (Business, Premium, Enterprise). Zahlung per Stripe.',
        },
        {
          title: '3. Zahlungsmethode ändern',
          description: 'Unter "Zahlungsmethoden" können Sie Kreditkarten hinzufügen, ändern oder löschen.',
        },
        {
          title: '4. Abonnement kündigen',
          description: 'Klicken Sie auf "Abo kündigen". Ihr Zugang bleibt bis zum Ende der bezahlten Periode aktiv.',
        },
        {
          title: '5. Rechnungen herunterladen',
          description: 'Alle Rechnungen finden Sie unter "Rechnungen". Klicken Sie auf eine Rechnung, um sie als PDF herunterzuladen.',
        }
      ]
    },
    {
      id: 'contract-score',
      icon: <BarChart3 size={24} />,
      title: 'Contract Score verstehen',
      description: 'So wird Ihr Vertrag bewertet',
      category: 'basics',
      steps: [
        {
          title: '1. Was ist der Contract Score?',
          description: 'Eine Zahl von 0-100, die die Qualität Ihres Vertrags bewertet. Je höher, desto besser.',
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
          description: 'Nutzen Sie den Optimizer, um den Score zu erhöhen. Jeder Optimierungsvorschlag zeigt die potenzielle Score-Verbesserung.',
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
          description: 'Oben auf der Verträge-Seite: Geben Sie Vertragsnamen, Schlagworte oder Vertragspartner ein.',
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
          description: 'Aktivieren Sie Checkboxen, um mehrere Verträge auszuwählen. Dann: In Ordner verschieben, Löschen, Exportieren.',
        }
      ]
    }
  ];

  // 📋 UMFASSENDE FAQ
  const faqItems: FAQItem[] = [
    // General
    {
      question: 'Wie sicher sind meine Vertragsdaten?',
      answer: 'Höchste Sicherheit ist garantiert: Alle Daten werden verschlüsselt übertragen (TLS 1.3) und gespeichert (AES-256). Server stehen in Deutschland (DSGVO-konform). Zugriff nur Sie + verschlüsselte Backups. Automatische Löschung nach 30 Tagen (außer Sie verlängern). Keine Weitergabe an Dritte.',
      category: 'security'
    },
    {
      question: 'Welche Vertragsarten werden unterstützt?',
      answer: 'Contract AI analysiert ALLE deutschen Vertragsarten: Mietverträge, Arbeitsverträge, Kaufverträge, Dienstleistungsverträge, Freelancer-Verträge, NDAs, AGBs, Lizenzverträge, Darlehensverträge, Kooperationsverträge, Partnerschaftsverträge und viele mehr. Bei speziellen Branchen-Verträgen (z.B. Medizinrecht, Baurecht) arbeiten wir kontinuierlich an Verbesserungen.',
      category: 'general'
    },
    {
      question: 'Ersetzt Contract AI einen Anwalt?',
      answer: 'NEIN! Contract AI ist ein hochmodernes Analyse-Tool, das Sie bei der ersten Einschätzung unterstützt und Zeit spart. Bei komplexen rechtlichen Fragen, hohen Vertragssummen oder kritischen Verträgen empfehlen wir IMMER die Beratung durch einen Fachanwalt. Nutzen Sie unsere Analyse als Grundlage für das Anwaltsgespräch.',
      category: 'general'
    },
    {
      question: 'Wie funktioniert die KI-Analyse?',
      answer: 'Unsere KI basiert auf GPT-4 und wurde mit tausenden deutschen Verträgen, Gesetzen und Urteilen trainiert. Sie erkennt: problematische Klauseln, unausgewogene Bedingungen, rechtliche Risiken, fehlende Regelungen, unklare Formulierungen. Die Analyse erfolgt anhand bewährter juristischer Standards und aktueller Rechtsprechung (BGB, HGB, ArbG, etc.).',
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
      answer: 'Standard-Analyse: 30-60 Sekunden pro Vertrag (je nach Länge). Optimizer: 2-3 Minuten. Vergleich: 2-4 Minuten. Generator: 1-2 Minuten. Sie können während der Analyse weitersurfen - Sie werden benachrichtigt, wenn die Analyse fertig ist.',
      category: 'technical'
    },
    {
      question: 'Welche Dateiformate werden unterstützt?',
      answer: 'Aktuell: PDF, DOC, DOCX. Maximale Dateigröße: 10 MB pro Vertrag. Bald auch: ODT, RTF, TXT. Scanns/Bilder (OCR) sind in Entwicklung.',
      category: 'technical'
    },
    {
      question: 'Kann ich Verträge mit mehreren Personen teilen?',
      answer: 'JA! Sie können: 1) Analyse-Reports als PDF exportieren und per E-Mail teilen. 2) Share-Links generieren (7 Tage gültig, optional passwortgeschützt). 3) Team-Features (ab Business-Plan): Mehrere Nutzer pro Konto, gemeinsame Ordner. 4) Verträge zur Signatur an mehrere Personen senden.',
      category: 'general'
    },
    {
      question: 'Werden meine Verträge zum KI-Training verwendet?',
      answer: 'NEIN! Ihre Vertragsdaten werden NIEMALS für KI-Training verwendet. Wir nutzen OpenAI im "Zero Data Retention"-Modus: Ihre Daten werden nicht gespeichert, nicht analysiert, nicht für Model-Training verwendet. 100% Vertraulichkeit garantiert.',
      category: 'security'
    },
    {
      question: 'Kann ich mein Abonnement jederzeit kündigen?',
      answer: 'JA! Keine Vertragsbindung. Kündigung jederzeit möglich mit einem Klick im Profil. Zugang bleibt bis zum Ende der bezahlten Periode aktiv. Keine Kündigungsfristen. Keine Nachfragen. Keine versteckten Gebühren.',
      category: 'billing'
    },
    {
      question: 'Was passiert mit meinen Daten nach der Kündigung?',
      answer: 'Nach Abo-Ende: Sie haben 30 Tage Zeit, alle Daten zu exportieren. Danach werden alle Verträge, Analysen und persönliche Daten automatisch und unwiderruflich gelöscht. Sie erhalten 7 Tage vorher eine Erinnerungs-E-Mail.',
      category: 'security'
    },
    {
      question: 'Gibt es eine Geld-zurück-Garantie?',
      answer: 'JA! 14 Tage Geld-zurück-Garantie ohne Wenn und Aber. Wenn Sie nicht zufrieden sind, schreiben Sie uns einfach eine E-Mail - Sie bekommen Ihr Geld zurück. Keine Fragen.',
      category: 'billing'
    },
    {
      question: 'Kann ich mehrere Company Profiles erstellen?',
      answer: 'JA! Sie können unbegrenzt viele Company Profiles erstellen (z.B. für verschiedene Firmen oder Abteilungen). Bei der Vertrags-Generierung wählen Sie einfach das passende Profil aus.',
      category: 'general'
    },
    {
      question: 'Wie funktioniert die digitale Signatur?',
      answer: 'Einfach & rechtssicher: 1) Vertrag hochladen. 2) Signaturfelder platzieren. 3) Unterzeichner hinzufügen (E-Mail). 4) Versenden. Unterzeichner erhalten einen Link und können direkt im Browser unterschreiben (Maus, Touch oder Stift). Fertige PDF wird automatisch gespeichert. Rechtlich bindend in Deutschland.',
      category: 'technical'
    },
    {
      question: 'Was ist der Unterschied zwischen Optimizer und Generator?',
      answer: 'Optimizer: Verbessert BESTEHENDE Verträge. Analysiert Schwachstellen, schlägt Optimierungen vor. Generator: Erstellt NEUE Verträge von Grund auf. Basierend auf Vorlagen + Ihre Eingaben. Beide nutzen KI, aber für verschiedene Zwecke.',
      category: 'general'
    },
    {
      question: 'Kann ich Verträge in anderen Sprachen analysieren?',
      answer: 'Aktuell: Nur deutsche Verträge werden optimal analysiert. Englische Verträge funktionieren grundsätzlich, aber ohne deutsches Rechtswissen. Französisch, Spanisch, Italienisch: In Entwicklung (Q4 2025).',
      category: 'technical'
    },
    {
      question: 'Wie oft wird Legal Pulse aktualisiert?',
      answer: 'Legal Pulse wird täglich aktualisiert! Neue Gesetze, Urteile und Rechts-Updates werden automatisch eingepflegt. Ihre überwachten Verträge werden wöchentlich neu geprüft. Bei kritischen Änderungen erhalten Sie sofort eine E-Mail.',
      category: 'general'
    },
    {
      question: 'Gibt es eine API für Entwickler?',
      answer: 'JA! Ab Enterprise-Plan haben Sie Zugriff auf unsere REST-API. Damit können Sie: Verträge hochladen, Analysen abrufen, Verträge generieren - alles programmatisch. Dokumentation: api.contract-ai.de/docs',
      category: 'technical'
    },
    {
      question: 'Bekomme ich Support, wenn ich Hilfe brauche?',
      answer: 'JA! Starter: E-Mail-Support (48h Antwortzeit). Business: E-Mail + Chat-Support (24h). Enterprise: Priority-Support (4h) + Telefon-Support. Alle Pläne: Umfangreiches Hilfe-Center, Video-Tutorials, Webinare.',
      category: 'general'
    }
  ];

  // 🔍 FILTER & SEARCH LOGIC
  const filteredGuides = useMemo(() => {
    let filtered = guides;

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(g => g.category === selectedCategory);
    }

    // Search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(g =>
        g.title.toLowerCase().includes(term) ||
        g.description.toLowerCase().includes(term) ||
        g.steps.some(step =>
          step.title.toLowerCase().includes(term) ||
          step.description.toLowerCase().includes(term)
        )
      );
    }

    return filtered;
  }, [selectedCategory, searchTerm, guides]);

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
      </Helmet>

      <div className={styles.helpCenter}>
        {/* Hero Section */}
        <section className={styles.hero}>
          <div className={styles.container}>
            <Sparkles className={styles.heroIcon} size={48} />
            <h1 className={styles.heroTitle}>Hilfe-Center</h1>
            <p className={styles.heroSubtitle}>
              Alles über Contract AI - verständlich erklärt, Schritt für Schritt
            </p>
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

        {/* Search Section */}
        <section className={styles.searchSection}>
          <div className={styles.container}>
            <div className={styles.searchBar}>
              <Search className={styles.searchIcon} size={20} />
              <input
                type="text"
                className={styles.searchInput}
                placeholder="Wonach suchen Sie? z.B. 'Vertrag hochladen', 'Signatur', 'Optimizer'..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button className={styles.clearSearch} onClick={() => setSearchTerm('')}>
                  <X size={18} />
                </button>
              )}
            </div>
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
                {/* Category Filter */}
                <div className={styles.categoryFilter}>
                  <button
                    className={`${styles.categoryBtn} ${selectedCategory === 'all' ? styles.active : ''}`}
                    onClick={() => setSelectedCategory('all')}
                  >
                    Alle
                  </button>
                  <button
                    className={`${styles.categoryBtn} ${selectedCategory === 'basics' ? styles.active : ''}`}
                    onClick={() => setSelectedCategory('basics')}
                  >
                    Grundlagen
                  </button>
                  <button
                    className={`${styles.categoryBtn} ${selectedCategory === 'features' ? styles.active : ''}`}
                    onClick={() => setSelectedCategory('features')}
                  >
                    Features
                  </button>
                  <button
                    className={`${styles.categoryBtn} ${selectedCategory === 'premium' ? styles.active : ''}`}
                    onClick={() => setSelectedCategory('premium')}
                  >
                    Premium
                  </button>
                  <button
                    className={`${styles.categoryBtn} ${selectedCategory === 'settings' ? styles.active : ''}`}
                    onClick={() => setSelectedCategory('settings')}
                  >
                    Einstellungen
                  </button>
                </div>

                <h2 className={styles.sectionTitle}>
                  {selectedCategory === 'all' ? 'Alle Anleitungen' :
                   selectedCategory === 'basics' ? 'Grundlagen' :
                   selectedCategory === 'features' ? 'Features' :
                   selectedCategory === 'premium' ? 'Premium-Features' :
                   'Einstellungen'}
                </h2>
                <p className={styles.sectionSubtitle}>
                  {filteredGuides.length} {filteredGuides.length === 1 ? 'Anleitung' : 'Anleitungen'} gefunden
                </p>

                <div className={styles.guidesContainer}>
                  {filteredGuides.map((guide) => (
                    <div key={guide.id} className={styles.guideCard}>
                      <div className={styles.guideHeader} onClick={() => handleGuideToggle(guide.id)}>
                        <div className={styles.guideIcon}>
                          {guide.icon}
                        </div>
                        <div className={styles.guideInfo}>
                          <h3 className={styles.guideTitle}>{guide.title}</h3>
                          <p className={styles.guideDescription}>{guide.description}</p>
                          {guide.category === 'premium' && (
                            <span className={styles.premiumBadge}>
                              <Shield size={14} />
                              Premium
                            </span>
                          )}
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

                {filteredGuides.length === 0 && (
                  <div className={styles.noResults}>
                    <Info size={48} />
                    <h3>Keine Anleitungen gefunden</h3>
                    <p>Versuchen Sie einen anderen Suchbegriff oder wählen Sie eine andere Kategorie.</p>
                  </div>
                )}
              </div>
            )}

            {/* FAQ TAB */}
            {activeTab === 'faq' && (
              <div className={styles.tabContent}>
                <h2 className={styles.sectionTitle}>Häufig gestellte Fragen</h2>
                <p className={styles.sectionSubtitle}>
                  {filteredFAQs.length} {filteredFAQs.length === 1 ? 'Frage' : 'Fragen'} gefunden
                </p>

                <div className={styles.faqList}>
                  {filteredFAQs.map((faq, index) => (
                    <div key={index} className={`${styles.faqItem} ${openFAQ === index ? styles.open : ''}`}>
                      <button
                        className={styles.faqQuestion}
                        onClick={() => handleFAQToggle(index)}
                      >
                        <span className={styles.faqQuestionText}>{faq.question}</span>
                        <ChevronDown
                          className={`${styles.faqToggle} ${openFAQ === index ? styles.rotated : ''}`}
                          size={20}
                        />
                      </button>
                      {openFAQ === index && (
                        <div className={styles.faqAnswer}>
                          <p>{faq.answer}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {filteredFAQs.length === 0 && (
                  <div className={styles.noResults}>
                    <Info size={48} />
                    <h3>Keine FAQs gefunden</h3>
                    <p>Versuchen Sie einen anderen Suchbegriff.</p>
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
              <h2>Brauchen Sie weitere Hilfe?</h2>
              <p>Unser Support-Team steht Ihnen gerne zur Verfügung!</p>
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
        <Footer />
      </div>
    </>
  );
};

export default HelpCenter;
