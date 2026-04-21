// PlaybookLibrary.tsx — Smart Playbook System: Übersicht aller Playbooks

import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import {
  Shield,
  FileText,
  Clock,
  Layers,
  Scale,
  ArrowRight,
  Sparkles,
  Target,
  Brain,
  BarChart3,
  BookOpen
} from 'lucide-react';
import { apiCall } from '../utils/api';
import styles from '../styles/PlaybookLibrary.module.css';

interface PlaybookSummary {
  type: string;
  title: string;
  description: string;
  icon: string;
  difficulty: string;
  estimatedTime: string;
  sectionCount: number;
  legalBasis: string;
}

// Coming-Soon Playbooks (noch nicht im Backend)
const COMING_SOON: PlaybookSummary[] = [
  {
    type: "freelancer",
    title: "Freelancervertrag",
    description: "Professioneller Vertrag zwischen Auftraggeber und Freelancer mit Schutz vor Scheinselbstständigkeit.",
    icon: "briefcase",
    difficulty: "mittel",
    estimatedTime: "10-15 Minuten",
    sectionCount: 12,
    legalBasis: "BGB §§ 611 ff."
  },
  {
    type: "dienstleistung",
    title: "Dienstleistungsvertrag",
    description: "Vertrag für Dienstleistungen aller Art — klar strukturiert mit Leistungsbeschreibung und Vergütung.",
    icon: "handshake",
    difficulty: "mittel",
    estimatedTime: "10-15 Minuten",
    sectionCount: 11,
    legalBasis: "BGB §§ 611 ff."
  },
  {
    type: "saas",
    title: "SaaS / Software-Nutzungsvertrag",
    description: "Lizenzvertrag für Software-as-a-Service mit SLA, Datenschutz und Haftungsregelungen.",
    icon: "cloud",
    difficulty: "fortgeschritten",
    estimatedTime: "15-20 Minuten",
    sectionCount: 14,
    legalBasis: "BGB, UrhG, DSGVO"
  },
  {
    type: "arbeitsvertrag",
    title: "Arbeitsvertrag (Basic)",
    description: "Standardarbeitsvertrag nach deutschem Arbeitsrecht mit allen Pflichtangaben.",
    icon: "users",
    difficulty: "komplex",
    estimatedTime: "15-20 Minuten",
    sectionCount: 15,
    legalBasis: "BGB §§ 611a ff., NachwG"
  }
];

const ICON_MAP: Record<string, React.ReactNode> = {
  shield: <Shield size={24} />,
  briefcase: <FileText size={24} />,
  handshake: <Scale size={24} />,
  cloud: <Layers size={24} />,
  users: <BookOpen size={24} />
};

const PlaybookLibrary: React.FC = () => {
  const navigate = useNavigate();
  const [playbooks, setPlaybooks] = useState<PlaybookSummary[]>([]);
  const [, setLoading] = useState(true);

  useEffect(() => {
    loadPlaybooks();
  }, []);

  const loadPlaybooks = async () => {
    try {
      const response = await apiCall('/playbooks') as { success: boolean; playbooks: PlaybookSummary[] };
      if (response.success) {
        setPlaybooks(response.playbooks);
      }
    } catch (err) {
      console.error('Fehler beim Laden der Playbooks:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStart = (type: string) => {
    navigate(`/playbooks/${type}`);
  };

  const allPlaybooks = [
    ...playbooks.map(p => ({ ...p, active: true })),
    ...COMING_SOON.filter(cs => !playbooks.find(p => p.type === cs.type)).map(p => ({ ...p, active: false }))
  ];

  return (
    <>
      <Helmet>
        <title>Smart Playbooks | Contract AI</title>
      </Helmet>

      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.badge}>
            <Sparkles size={14} />
            Smart Playbook System
          </div>
          <h1 className={styles.title}>Vertrag erstellen mit Playbooks</h1>
          <p className={styles.subtitle}>
            Keine Templates, sondern intelligente Entscheidungslogik.
            Jedes Playbook führt dich Schritt für Schritt durch strategische Entscheidungen
            und erklärt dir, was jede Klausel bedeutet.
          </p>
        </div>

        {/* Playbook Grid */}
        <div className={styles.grid}>
          {allPlaybooks.map((playbook) => (
            <div
              key={playbook.type}
              className={`${styles.card} ${!playbook.active ? styles.cardDisabled : ''}`}
              onClick={() => playbook.active && handleStart(playbook.type)}
            >
              <div className={styles.cardHeader}>
                <div className={`${styles.cardIcon} ${playbook.active ? styles.cardIconActive : styles.cardIconDisabled}`}>
                  {ICON_MAP[playbook.icon] || <FileText size={24} />}
                </div>
                <span className={`${styles.cardBadge} ${playbook.active ? styles.badgeActive : styles.badgeComingSoon}`}>
                  {playbook.active ? 'Verfügbar' : 'Bald verfügbar'}
                </span>
              </div>

              <h3 className={styles.cardTitle}>{playbook.title}</h3>
              <p className={styles.cardDescription}>{playbook.description}</p>

              <div className={styles.cardMeta}>
                <span className={styles.metaItem}>
                  <Clock size={14} />
                  {playbook.estimatedTime}
                </span>
                <span className={styles.metaItem}>
                  <Layers size={14} />
                  {playbook.sectionCount} Entscheidungen
                </span>
                <span className={styles.metaItem}>
                  <BarChart3 size={14} />
                  {playbook.difficulty}
                </span>
              </div>

              <div className={styles.cardFooter}>
                <span className={styles.legalBasis}>{playbook.legalBasis}</span>
                {playbook.active ? (
                  <button className={styles.startButton} onClick={(e) => { e.stopPropagation(); handleStart(playbook.type); }}>
                    Starten
                    <ArrowRight size={14} />
                  </button>
                ) : (
                  <span className={styles.comingSoonLabel}>In Entwicklung</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Info Section */}
        <div className={styles.infoSection}>
          <h2 className={styles.infoTitle}>
            <Brain size={20} />
            Was macht Playbooks anders?
          </h2>
          <div className={styles.infoGrid}>
            <div className={styles.infoItem}>
              <div className={styles.infoIcon}>
                <Target size={18} />
              </div>
              <div className={styles.infoText}>
                <h4>Strategie-Modi</h4>
                <p>Wähle zwischen Sicher, Ausgewogen und Durchsetzungsstark — der gleiche Vertrag, komplett anderer Fokus.</p>
              </div>
            </div>
            <div className={styles.infoItem}>
              <div className={styles.infoIcon}>
                <Shield size={18} />
              </div>
              <div className={styles.infoText}>
                <h4>Risiko-Bewertung</h4>
                <p>Jede Entscheidung zeigt dir das Risiko, wann es zum Problem wird und wann du verhandeln solltest.</p>
              </div>
            </div>
            <div className={styles.infoItem}>
              <div className={styles.infoIcon}>
                <Sparkles size={18} />
              </div>
              <div className={styles.infoText}>
                <h4>Smart Defaults</h4>
                <p>Wenn du unsicher bist, entscheidet das System intelligent basierend auf deinem Modus und Vertragstyp.</p>
              </div>
            </div>
            <div className={styles.infoItem}>
              <div className={styles.infoIcon}>
                <BarChart3 size={18} />
              </div>
              <div className={styles.infoText}>
                <h4>Automatische Analyse</h4>
                <p>Nach der Erstellung wird dein Vertrag sofort analysiert — Score, Risiken und Verbesserungsvorschläge inklusive.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default PlaybookLibrary;
