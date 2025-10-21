import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Lightbulb, BookOpen, Scale } from 'lucide-react';
import { useState } from 'react';
import styles from '../styles/SimpleExplanationPopup.module.css';

interface SimpleExplanationPopupProps {
  category: 'termination' | 'liability' | 'payment' | 'clarity' | 'compliance';
  originalText: string;
  improvedText: string;
  reasoning: string;
  onClose: () => void;
}

// 🧠 EINFACHE ERKLÄRUNGEN - Wie für einen 5-Jährigen
const SIMPLE_EXPLANATIONS: Record<string, {
  title: string;
  whatIs: string;
  whyImportant: string;
  example: string;
  icon: React.ReactElement;
}> = {
  termination: {
    title: "Kündigungsregelungen",
    whatIs: "Das sind die Regeln, wie du oder dein Arbeitgeber den Vertrag beenden können. Wie ein 'Notausgang' aus dem Vertrag.",
    whyImportant: "Ohne klare Kündigungsregeln könntest du plötzlich ohne Job dastehen oder monatelang feststecken, obwohl du wechseln willst. Das ist wie ein Handy-Vertrag: Du willst wissen, wann du raus kannst!",
    example: "Stell dir vor: Du bekommst ein besseres Jobangebot, aber dein Vertrag sagt '6 Monate Kündigungsfrist' - dann musst du ein halbes Jahr warten. Mit klaren Regeln weißt du vorher Bescheid!",
    icon: <Scale className="w-6 h-6" />
  },
  liability: {
    title: "Haftungsklauseln",
    whatIs: "Das regelt, wer zahlen muss, wenn etwas schiefgeht. Wie eine Versicherung: Wer haftet für Schäden?",
    whyImportant: "Ohne Haftungsbegrenzung könntest du für RIESIGE Summen haften - selbst für kleine Fehler. Das ist wie beim Autofahren: Du willst eine Versicherung, die dich schützt!",
    example: "Du machst als Programmierer einen kleinen Bug - die Firma verliert 50.000€. Ohne Haftungsklausel musst DU das zahlen! Mit richtiger Klausel: Firma trägt das Risiko.",
    icon: <Scale className="w-6 h-6" />
  },
  payment: {
    title: "Zahlungskonditionen",
    whatIs: "Wie viel Geld du bekommst, wann und unter welchen Bedingungen. Dein 'Gehaltsscheck-Plan'.",
    whyImportant: "Unklare Zahlungsregeln bedeuten: Du weißt nicht sicher, ob du dein Geld bekommst. Das ist wie ein Restaurant ohne Preise auf der Speisekarte - unangenehme Überraschungen!",
    example: "Steht im Vertrag nur 'angemessene Vergütung'? Dann entscheidet dein Chef, was 'angemessen' ist. Besser: '3.500€ brutto, zahlbar am Monatsende'.",
    icon: <Scale className="w-6 h-6" />
  },
  clarity: {
    title: "Vertragsklarheit",
    whatIs: "Wie verständlich und eindeutig der Vertrag geschrieben ist. Keine juristischen Wortungetüme!",
    whyImportant: "Unklare Verträge führen zu Streit. Jeder versteht etwas anderes. Das ist wie eine undeutliche Wegbeschreibung - jeder landet woanders!",
    example: "Schwammig: 'Der Arbeitnehmer soll seine Aufgaben erfüllen.' - Welche Aufgaben?! Besser: 'Softwareentwicklung in Python, 40h/Woche, Backend-Team'.",
    icon: <BookOpen className="w-6 h-6" />
  },
  compliance: {
    title: "Compliance & Datenschutz",
    whatIs: "Das sind gesetzliche Pflichten, die JEDER Vertrag einhalten muss. Wie Verkehrsregeln: Man muss sich dran halten!",
    whyImportant: "Verstößt dein Vertrag gegen DSGVO oder andere Gesetze? Dann ist er ungültig - und du hast Ärger mit Behörden. Das kann teuer werden (bis zu 20 Mio.€ Strafe)!",
    example: "Dein Vertrag sagt nichts über Datenschutz? Wenn du mit Kundendaten arbeitest, ist das illegal. Mit DSGVO-Klausel: Rechtlich abgesichert!",
    icon: <Scale className="w-6 h-6" />
  }
};

// 🔍 SPEZIELLE KLAUSEL-ERKLÄRUNGEN
const CLAUSE_EXPLANATIONS: Record<string, {
  term: string;
  simple: string;
  analogy: string;
}> = {
  salvatorisch: {
    term: "Salvatorische Klausel",
    simple: "Wenn ein Teil des Vertrags ungültig ist, bleibt der Rest trotzdem gültig.",
    analogy: "Stell dir vor, dein Vertrag ist wie ein Lego-Haus. Wenn ein Stein (= eine Klausel) kaputt ist, fällt normalerweise das ganze Haus zusammen. Die salvatorische Klausel ist wie ein Sicherheitsnetz: Selbst wenn ein Stein kaputt ist, steht der Rest."
  },
  schriftform: {
    term: "Schriftformerfordernis",
    simple: "Änderungen am Vertrag müssen schriftlich sein - mündliche Absprachen zählen nicht.",
    analogy: "Das ist wie 'ohne Rechnung, keine Rückgabe'. Wenn du etwas ändern willst, brauchst du ein Papier mit Unterschrift. WhatsApp-Nachrichten reichen nicht!"
  },
  probezeit: {
    term: "Probezeit",
    simple: "Die ersten Monate, in denen beide Seiten schneller kündigen können.",
    analogy: "Wie Netflix: Du kannst im ersten Monat jederzeit kündigen. Danach gibt's längere Kündigungsfristen. Das gibt beiden Seiten Flexibilität zum Testen."
  },
  wettbewerbsverbot: {
    term: "Wettbewerbsverbot",
    simple: "Nach dem Job darfst du nicht zur Konkurrenz gehen - jedenfalls nicht sofort.",
    analogy: "Stell dir vor, du arbeitest bei McDonald's und lernst alle Rezepte. Dann gehst du zu Burger King und verrätst alles. Das Wettbewerbsverbot verhindert das - ABER: Nur wenn du dafür bezahlt wirst (Karenzentschädigung)!"
  },
  kuendigung: {
    term: "Kündigungsfrist",
    simple: "Wie lange vorher du Bescheid sagen musst, wenn du kündigen willst.",
    analogy: "Wie bei einer WG: Du kannst nicht heute sagen 'Ich ziehe morgen aus'. Du musst rechtzeitig Bescheid sagen, damit der andere einen Ersatz findet. Üblich: 4 Wochen bis 3 Monate."
  }
};

export default function SimpleExplanationPopup({
  category,
  originalText,
  improvedText,
  reasoning,
  onClose
}: SimpleExplanationPopupProps) {
  const [activeTab, setActiveTab] = useState<'simple' | 'detail'>('simple');

  const explanation = SIMPLE_EXPLANATIONS[category];

  // Erkenne spezielle Klauseln im Text
  const detectedClause = Object.keys(CLAUSE_EXPLANATIONS).find(key =>
    originalText.toLowerCase().includes(key) ||
    improvedText.toLowerCase().includes(key) ||
    reasoning.toLowerCase().includes(key)
  );

  const clauseExplanation = detectedClause ? CLAUSE_EXPLANATIONS[detectedClause] : null;

  return (
    <AnimatePresence>
      <div className={styles.overlay} onClick={onClose}>
        <motion.div
          className={styles.popup}
          onClick={(e) => e.stopPropagation()}
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: "spring", duration: 0.3 }}
        >
          {/* Header */}
          <div className={styles.header}>
            <div className={styles.headerIcon}>
              <Lightbulb className="w-6 h-6" style={{ color: '#FF9500' }} />
            </div>
            <h2 className={styles.title}>🧠 Einfach erklärt</h2>
            <button onClick={onClose} className={styles.closeButton}>
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tabs */}
          <div className={styles.tabs}>
            <button
              className={`${styles.tab} ${activeTab === 'simple' ? styles.tabActive : ''}`}
              onClick={() => setActiveTab('simple')}
            >
              <Lightbulb className="w-4 h-4" />
              Einfach erklärt
            </button>
            <button
              className={`${styles.tab} ${activeTab === 'detail' ? styles.tabActive : ''}`}
              onClick={() => setActiveTab('detail')}
            >
              <BookOpen className="w-4 h-4" />
              Details
            </button>
          </div>

          {/* Content */}
          <div className={styles.content}>
            {activeTab === 'simple' ? (
              <>
                {/* Kategorie-Erklärung */}
                <div className={styles.section}>
                  <div className={styles.sectionHeader}>
                    {explanation.icon}
                    <h3>{explanation.title}</h3>
                  </div>

                  <div className={styles.explanationBox}>
                    <h4>📚 Was ist das?</h4>
                    <p>{explanation.whatIs}</p>
                  </div>

                  <div className={styles.explanationBox}>
                    <h4>❗ Warum ist das wichtig?</h4>
                    <p>{explanation.whyImportant}</p>
                  </div>

                  <div className={styles.explanationBox} style={{ background: 'rgba(0, 122, 255, 0.05)', borderColor: '#007AFF' }}>
                    <h4>💡 Beispiel aus dem echten Leben:</h4>
                    <p>{explanation.example}</p>
                  </div>
                </div>

                {/* Spezielle Klausel-Erklärung (falls erkannt) */}
                {clauseExplanation && (
                  <div className={styles.section} style={{ marginTop: '1.5rem' }}>
                    <div className={styles.sectionHeader}>
                      <Scale className="w-5 h-5" style={{ color: '#AF52DE' }} />
                      <h3>Spezielle Klausel erkannt</h3>
                    </div>

                    <div className={styles.clauseBox}>
                      <div className={styles.clauseTerm}>
                        📋 {clauseExplanation.term}
                      </div>
                      <p className={styles.clauseSimple}>
                        <strong>Einfach gesagt:</strong> {clauseExplanation.simple}
                      </p>
                      <div className={styles.clauseAnalogy}>
                        <Lightbulb className="w-4 h-4" style={{ color: '#FF9500' }} />
                        <p><strong>Vergleich:</strong> {clauseExplanation.analogy}</p>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                {/* Detail-Ansicht */}
                <div className={styles.section}>
                  <h3 style={{ marginBottom: '1rem' }}>📄 Juristische Details</h3>

                  <div className={styles.detailBox}>
                    <h4>🔍 Begründung der KI:</h4>
                    <p>{reasoning}</p>
                  </div>

                  {originalText !== "FEHLT" && !originalText.includes("FEHLT") && (
                    <div className={styles.detailBox}>
                      <h4>📝 Original-Text:</h4>
                      <p className={styles.originalText}>{originalText.substring(0, 300)}{originalText.length > 300 ? '...' : ''}</p>
                    </div>
                  )}

                  <div className={styles.detailBox} style={{ background: 'rgba(52, 199, 89, 0.05)', borderColor: '#34C759' }}>
                    <h4>✅ Optimierte Version:</h4>
                    <p className={styles.improvedText}>{improvedText.substring(0, 300)}{improvedText.length > 300 ? '...' : ''}</p>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className={styles.footer}>
            <p className={styles.footerNote}>
              💡 <strong>Hinweis:</strong> Diese Erklärungen dienen deinem Verständnis.
              Für rechtlich bindende Beratung konsultiere bitte einen Anwalt.
            </p>
            <button onClick={onClose} className={styles.primaryButton}>
              Verstanden!
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
