// 📁 src/utils/analysisAdapter.ts
// Adapter to convert legacy progress format to new format

import type { AnalysisProgress, LegacyProgress, StepId } from '../types/analysisProgress';

/**
 * Maps legacy backend format to new AnalysisProgress format
 * This allows us to use the new UI component while the backend still uses the old format
 */
export function mapLegacyToProgress(legacy: LegacyProgress): AnalysisProgress {
  const stepOrder: StepId[] = ['upload', 'type', 'gaps', 'ai', 'qc', 'done'];

  const stepLabels: Record<StepId, string> = {
    upload: 'PDF-Upload',
    type: 'Vertragstyp',
    gaps: 'Lücken-Analyse',
    ai: 'KI-Optimierung',
    qc: 'Qualitäts-Check',
    done: 'Fertig'
  };

  // Determine current step from legacy stage or progress percentage
  let currentStepIndex = 0;
  if (legacy.stage) {
    const stageIndex = stepOrder.indexOf(legacy.stage as StepId);
    currentStepIndex = stageIndex >= 0 ? stageIndex : 0;
  } else {
    // Fallback: estimate step from progress percentage
    const progress = legacy.progress ?? 0;
    if (progress < 15) currentStepIndex = 0;        // upload
    else if (progress < 35) currentStepIndex = 1;   // type
    else if (progress < 55) currentStepIndex = 2;   // gaps
    else if (progress < 85) currentStepIndex = 3;   // ai
    else if (progress < 99) currentStepIndex = 4;   // qc
    else currentStepIndex = 5;                       // done
  }

  return {
    percent: legacy.progress ?? 0,
    startedAt: new Date().toISOString(),
    steps: stepOrder.map((id, index) => ({
      id,
      label: stepLabels[id],
      status: index < currentStepIndex
        ? 'done'
        : index === currentStepIndex
        ? 'active'
        : 'queued',
      // Add helpful subtext for active step
      subtext: index === currentStepIndex && id === 'ai'
        ? 'Model: gpt-4o'
        : undefined
    }))
  };
}

/**
 * Helper to get current step info from progress data
 */
export function getCurrentStep(progress: AnalysisProgress) {
  return progress.steps.find(step => step.status === 'active');
}

/**
 * Helper to check if analysis is complete
 */
export function isAnalysisComplete(progress: AnalysisProgress): boolean {
  return progress.percent >= 100 ||
         progress.steps.every(step => step.status === 'done');
}

/**
 * Helper to format ETA
 */
export function formatEta(seconds: number | undefined): string {
  if (!seconds) return '';
  if (seconds < 60) return `~${Math.round(seconds)} s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  return `~${minutes}:${remainingSeconds.toString().padStart(2, '0')} min`;
}
