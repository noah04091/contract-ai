import { useState, useEffect } from 'react';
import { Check, Loader2, Circle, AlertCircle, Lightbulb } from 'lucide-react';
import type { StageInfo } from '../../types/optimizerV2';
import styles from '../../styles/OptimizerV2.module.css';

interface Props {
  stages: StageInfo[];
  progress: number;
  message: string;
  error?: string | null;
  onCancel: () => void;
  onRetry?: () => void;
}

const CONTRACT_FACTS = [
  'Der älteste bekannte schriftliche Vertrag ist über 4.000 Jahre alt — ein sumerischer Kaufvertrag auf einer Tontafel.',
  'In Deutschland werden jährlich über 40 Millionen Verträge geschlossen — vom Handyvertrag bis zum Immobilienkauf.',
  'Das BGB (Bürgerliches Gesetzbuch) trat am 1. Januar 1900 in Kraft und gilt in weiten Teilen bis heute.',
  'Ein Vertrag kommt durch zwei übereinstimmende Willenserklärungen zustande: Angebot und Annahme (§§ 145–147 BGB).',
  'Mündliche Verträge sind in Deutschland grundsätzlich genauso gültig wie schriftliche — mit wenigen Ausnahmen.',
  'Grundstückskaufverträge müssen in Deutschland notariell beurkundet werden (§ 311b BGB), sonst sind sie nichtig.',
  'Die durchschnittliche Länge von AGBs hat sich seit 2000 verdreifacht — oft über 30 Seiten.',
  'Laut Studien lesen weniger als 5% der Menschen die AGB, bevor sie zustimmen.',
  'Das Widerrufsrecht bei Online-Käufen beträgt in der EU 14 Tage — eine Errungenschaft der Verbraucherschutzrichtlinie.',
  'Der längste jemals geschlossene Vertrag war ein Pachtvertrag über 10.000 Jahre für eine Fläche in Irland.',
  'Die „Treu und Glauben"-Klausel (§ 242 BGB) ist die meistzitierte Norm im deutschen Zivilrecht.',
  'Salvatorische Klauseln sorgen dafür, dass der Rest eines Vertrags gültig bleibt, wenn eine Klausel unwirksam ist.',
  'Das Vertragsrecht unterscheidet sich weltweit stark: Common Law (UK/USA) vs. Civil Law (Deutschland/Frankreich).',
  'Die EU-DSGVO hat seit 2018 jeden Vertrag mit Personenbezug verändert — Datenschutzklauseln sind jetzt Pflicht.',
  'Force-Majeure-Klauseln gewannen durch die Corona-Pandemie 2020 enorm an Bedeutung in der Vertragspraxis.',
  'Ein „Letter of Intent" (LOI) ist rechtlich meist unverbindlich, kann aber Schadensersatzpflichten auslösen.',
  'In Japan werden Verträge traditionell mit einem persönlichen Stempel (Hanko) statt einer Unterschrift besiegelt.',
  'Die Vertragsfreiheit ist ein Grundprinzip des deutschen Rechts, verankert in Art. 2 Abs. 1 GG.',
  'Wettbewerbsverbote in Arbeitsverträgen dürfen maximal 2 Jahre dauern und erfordern eine Karenzentschädigung.',
  'Die „Schriftform" nach § 126 BGB erfordert eine eigenhändige Unterschrift — ein Fax reicht nicht.',
  'Smart Contracts auf der Blockchain sind trotz des Namens meist keine Verträge im juristischen Sinne.',
  'Das UN-Kaufrecht (CISG) gilt automatisch bei internationalen Warenverträgen — es sei denn, es wird ausgeschlossen.',
  'Arbeitsverträge in Deutschland brauchen seit 2022 (Nachweisgesetz) zwingend eine schriftliche Niederschrift der Bedingungen.',
  'Die kürzeste Kündigungsfrist im deutschen Recht beträgt 1 Tag — bei Mietverträgen über möblierte Zimmer.',
  'Der Grundsatz „pacta sunt servanda" (Verträge sind einzuhalten) stammt aus dem römischen Recht.',
  'Überraschende Klauseln in AGB sind nach § 305c BGB unwirksam — der Kunde muss nicht mit ihnen rechnen.',
  'In den USA können Verträge auf einer Serviette geschrieben und trotzdem rechtlich bindend sein.',
  'Das deutsche Mietrecht gehört zu den mieterfreundlichsten der Welt — mit Kündigungsschutz und Mietpreisbremse.',
  'Non-Disclosure Agreements (NDAs) sind die häufigsten Verträge in der Startup-Welt.',
  'Die elektronische Signatur ist seit der eIDAS-Verordnung (2016) in der gesamten EU rechtsgültig.',
  'Vertragsstrafen müssen angemessen sein — überhöhte Strafen können von Gerichten herabgesetzt werden (§ 343 BGB).',
  'Im Schnitt enthält ein Unternehmensvertrag 15–25 Klauseln — komplexe Verträge können über 100 haben.',
  'Die Gewährleistungsfrist für Neuwaren beträgt in Deutschland 2 Jahre (§ 438 BGB).',
  'Circa 60% aller Rechtsstreitigkeiten in Deutschland haben mit Vertragsrecht zu tun.',
  'Das Wort „Vertrag" kommt vom mittelhochdeutschen „vertrac" — es bedeutet „Übereinkunft" oder „Vereinbarung".',
];

function useRotatingFact() {
  const [index, setIndex] = useState(() => Math.floor(Math.random() * CONTRACT_FACTS.length));
  const [fade, setFade] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setIndex(prev => (prev + 1) % CONTRACT_FACTS.length);
        setFade(true);
      }, 400);
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  return { fact: CONTRACT_FACTS[index], fade };
}

export default function AnalysisPipeline({ stages, progress, message, error, onCancel, onRetry }: Props) {
  const { fact, fade } = useRotatingFact();

  // Error state
  if (error) {
    return (
      <div className={styles.pipelineContainer}>
        <div className={styles.pipelineHeader}>
          <h2 className={styles.pipelineTitle} style={{ color: '#FF3B30' }}>Analyse fehlgeschlagen</h2>
        </div>

        {/* Show stages with error state */}
        <div className={styles.stageList}>
          {stages.map((stage) => (
            <div key={stage.number} className={`${styles.stageItem} ${styles[`stage_${stage.status}`]}`}>
              <div className={styles.stageIcon}>
                {stage.status === 'completed' && <Check size={14} />}
                {stage.status === 'error' && <AlertCircle size={14} />}
                {(stage.status === 'pending' || stage.status === 'running') && <Circle size={14} />}
              </div>
              <div className={styles.stageContent}>
                <span className={styles.stageName}>{stage.name}</span>
                <span className={styles.stageDescription}>{stage.description}</span>
              </div>
            </div>
          ))}
        </div>

        <div style={{ margin: '16px 0', padding: '12px 16px', background: '#FFF2F2', borderRadius: 8, border: '1px solid #FFD6D6', color: '#CC1100', fontSize: 13, lineHeight: 1.5 }}>
          {error}
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          {onRetry && (
            <button className={styles.cancelButton} style={{ background: '#007AFF', color: '#fff', border: 'none' }} onClick={onRetry}>
              Erneut versuchen
            </button>
          )}
          <button className={styles.cancelButton} onClick={onCancel}>
            Zurück
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.pipelineContainer}>
      <div className={styles.pipelineHeader}>
        <h2 className={styles.pipelineTitle}>KI-Analyse läuft</h2>
        <button className={styles.cancelButton} onClick={() => { if (window.confirm('Analyse abbrechen? Der Fortschritt wird verworfen.')) { onCancel(); } }}>Abbrechen</button>
      </div>

      {/* Progress bar */}
      <div className={styles.progressBarContainer}>
        <div className={styles.progressBar}>
          <div className={styles.progressBarFill} style={{ width: `${progress}%` }} />
        </div>
        <span className={styles.progressPercent}>{Math.round(progress)}%</span>
      </div>

      {/* Current message */}
      <p className={styles.progressMessage}>{message}</p>

      {/* Stage indicators */}
      <div className={styles.stageList}>
        {stages.map((stage) => (
          <div key={stage.number} className={`${styles.stageItem} ${styles[`stage_${stage.status}`]}`}>
            <div className={styles.stageIcon}>
              {stage.status === 'completed' && <Check size={14} />}
              {stage.status === 'running' && <Loader2 size={14} className={styles.spinIcon} />}
              {stage.status === 'pending' && <Circle size={14} />}
              {stage.status === 'error' && <AlertCircle size={14} />}
            </div>
            <div className={styles.stageContent}>
              <span className={styles.stageName}>{stage.name}</span>
              <span className={styles.stageDescription}>{stage.description}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Fun facts + hint */}
      <div className={styles.pipelineFunFact}>
        <div className={styles.funFactHeader}>
          <Lightbulb size={13} />
          <span>Wusstest du?</span>
        </div>
        <p className={`${styles.funFactText} ${fade ? styles.funFactVisible : styles.funFactHidden}`}>
          {fact}
        </p>
        <p className={styles.pipelineHint}>
          Umfangreiche oder gescannte Verträge können bis zu 2 Minuten dauern.
        </p>
      </div>
    </div>
  );
}
