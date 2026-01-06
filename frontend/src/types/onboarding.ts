// 📁 frontend/src/types/onboarding.ts
// Enterprise Onboarding System v3.0 - TypeScript Definitionen

export type OnboardingStatus = 'not_started' | 'in_progress' | 'completed' | 'skipped';

export interface OnboardingStep {
  stepId: string;
  completedAt: string;
  data?: Record<string, unknown>;
}

export interface OnboardingProfile {
  role?: 'freelancer' | 'startup' | 'enterprise' | 'agency';
  primaryUseCase?: 'analyze' | 'generate' | 'manage' | 'sign';
  useCases?: Array<'analyze' | 'generate' | 'manage' | 'sign'>; // Multi-Select
  teamSize?: 'solo' | '2-10' | '11-50' | '50+';
}

export interface OnboardingChecklist {
  accountCreated: boolean;
  emailVerified: boolean;
  firstContractUploaded: boolean;
  companyProfileComplete: boolean;
  firstAnalysisComplete: boolean;
}

export interface OnboardingState {
  status: OnboardingStatus;
  startedAt: string | null;
  completedAt: string | null;
  skippedAt: string | null;
  completedSteps: OnboardingStep[];
  profile: OnboardingProfile;
  seenFeatures: string[];
  showTooltips: boolean;
  checklist: OnboardingChecklist;
}

// API Response Types
export interface OnboardingStatusResponse {
  status: OnboardingStatus;
  completedAt: string | null;
  skippedAt: string | null;
  startedAt: string | null;
  completedSteps: OnboardingStep[];
  profile: OnboardingProfile;
  seenFeatures: string[];
  showTooltips: boolean;
  checklist: OnboardingChecklist;
  checklistProgress: number;
  checklistTotal: number;
  shouldShowModal: boolean;
  shouldShowChecklist: boolean;
}

export interface OnboardingActionResponse {
  success: boolean;
  message: string;
  status?: OnboardingStatus;
  completedSteps?: OnboardingStep[];
  seenFeatures?: string[];
}

// Modal Step Configuration
export interface OnboardingModalStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  component: React.ComponentType<OnboardingStepProps>;
}

export interface OnboardingStepProps {
  onNext: () => void;
  onSkip: () => void;
  onComplete: (data?: Record<string, unknown>) => void;
  profile: OnboardingProfile;
  setProfile: (profile: OnboardingProfile) => void;
}

// Checklist Item Configuration
export interface ChecklistItem {
  id: keyof OnboardingChecklist;
  label: string;
  description: string;
  icon: React.ReactNode;
  action?: {
    label: string;
    path: string;
  };
}
