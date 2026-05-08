// ContractAnalysisV2 — neue Analyse-Ansicht hinter Feature-Flag.
//
// HÄPPCHEN A (jetzt): rendert erstmal genau die alte Komponente. Kein visueller Unterschied.
// Zweck: das Schalter-Sicherheitsnetz steht, aber nichts ist sichtbar verändert.
//
// HÄPPCHEN B (später): eigene Hero/Quick-Facts-Implementierung mit v6-Mockup-Layout.
// HÄPPCHEN C (später): Tabs, Pilot-Tab, Timeline, Conv-Banner etc. nach REFACTOR-CHECKLIST.md
//
// Backend, GPT-Pipeline, MongoDB, Stripe — alles unangetastet.
// Wenn etwas bricht: localStorage-Eintrag 'analysisV2Enabled' löschen.

import ContractAnalysis from "./ContractAnalysis";
import type { ComponentProps } from "react";

type Props = ComponentProps<typeof ContractAnalysis>;

export default function ContractAnalysisV2(props: Props) {
  // HÄPPCHEN A: Wrapper delegiert an alte Komponente — null Verhaltens-Änderung
  return <ContractAnalysis {...props} />;
}
