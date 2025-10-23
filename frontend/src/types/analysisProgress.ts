// 📁 src/types/analysisProgress.ts
// TypeScript types for the new Analysis Progress API

export type StepStatus = 'done' | 'active' | 'queued' | 'warn' | 'error';

export type StepId = 'upload' | 'type' | 'gaps' | 'ai' | 'qc' | 'done';

export interface AnalysisStep {
  id: StepId;
  label: string;
  status: StepStatus;
  subtext?: string;         // e.g. "Model: gpt-4o", "~12 s"
  durationMs?: number;       // how long this step took (for completed steps)
  warnings?: number;         // number of warnings (for warn status)
  error?: {
    message: string;
    logUrl?: string;         // optional link to detailed logs
  };
}

export interface AnalysisProgress {
  percent: number;           // 0-100
  etaSeconds?: number;       // estimated time remaining (optional)
  startedAt: string;         // ISO timestamp
  steps: AnalysisStep[];
}

// Legacy format (current backend)
export interface LegacyProgress {
  progress: number;          // 0-100
  stage?: string;            // e.g. "upload", "ai", etc.
}
