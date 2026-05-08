// Feature-Flags für Beta-Features.
//
// Aktuell: nur Email-basierte Whitelist im Frontend.
// Backend bleibt unangetastet — wenn ein User in der Whitelist ist und der
// Schalter im Profil aktiv ist, sieht er die neue Ansicht. Sonst alte Ansicht.
//
// Ablauf:
//   1. ANALYSIS_V2_WHITELIST: User-Email muss hier drin sein, sonst gar keine Option.
//   2. localStorage: 'analysisV2Enabled' = '1' | '0' — User kann selbst toggeln.
//   3. Helper isAnalysisV2Enabled(user) prüft beides und gibt true/false zurück.
//
// Falls etwas bricht: localStorage-Eintrag löschen → User sieht sofort wieder alte Ansicht.

import type { UserData } from "./authUtils";

export const ANALYSIS_V2_WHITELIST: string[] = [
  "2302test@flirt.ms",
  "liebold.noah@web.de",
];

const STORAGE_KEY = "analysisV2Enabled";

export function canSeeAnalysisV2(user: UserData | null | undefined): boolean {
  if (!user || !user.email) return false;
  return ANALYSIS_V2_WHITELIST.includes(user.email.toLowerCase());
}

export function isAnalysisV2Enabled(user: UserData | null | undefined): boolean {
  if (!canSeeAnalysisV2(user)) return false;
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function setAnalysisV2Enabled(value: boolean): void {
  try {
    if (value) localStorage.setItem(STORAGE_KEY, "1");
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* localStorage not available — silent */
  }
}
