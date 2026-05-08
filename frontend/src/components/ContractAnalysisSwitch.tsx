// ContractAnalysisSwitch — Feature-Flag-Routing für die Analyse-Ansicht.
//
// Verhalten:
//   - User in Whitelist + Toggle aktiv  → ContractAnalysisV2 (neue Ansicht, im Aufbau)
//   - sonst                             → ContractAnalysis (alte Ansicht, Production)
//
// Vorteil: alle bestehenden Verwendungen von <ContractAnalysis> werden mit einer
// einzigen Import-Änderung auf das Switch umgestellt. Wenn V2 später stable ist,
// kann der Switch entfernt und V2 als Default gesetzt werden.

import { useEffect, useState } from "react";
import type { ComponentProps } from "react";
import ContractAnalysis from "./ContractAnalysis";
import ContractAnalysisV2 from "./ContractAnalysisV2";
import { useAuth } from "../context/AuthContext";
import { isAnalysisV2Enabled } from "../utils/featureFlags";

type Props = ComponentProps<typeof ContractAnalysis>;

export default function ContractAnalysisSwitch(props: Props) {
  const { user } = useAuth();
  const [v2Active, setV2Active] = useState<boolean>(() => isAnalysisV2Enabled(user));

  // Re-evaluiere bei User-Änderung (Login/Logout) und bei localStorage-Updates
  useEffect(() => {
    setV2Active(isAnalysisV2Enabled(user));
    const onStorage = (e: StorageEvent) => {
      if (e.key === "analysisV2Enabled") setV2Active(isAnalysisV2Enabled(user));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [user]);

  return v2Active ? <ContractAnalysisV2 {...props} /> : <ContractAnalysis {...props} />;
}
