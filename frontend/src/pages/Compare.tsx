import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Helmet } from "react-helmet-async";
import {
  FileText, Download, ArrowRight, CheckCircle, AlertCircle,
  RefreshCw, Info,
  Users, Briefcase, Building, Scale,
  Star,
  GitCompare, FileCheck, Trophy,
  ChevronDown, History, Trash2, X,
  Camera
} from "lucide-react";
import UnifiedPremiumNotice from "../components/UnifiedPremiumNotice";
import { WelcomePopup } from "../components/Tour";
import { useDocumentScanner } from "../hooks/useDocumentScanner";
import CompareResults from "../components/compare/CompareResults";
import {
  ComparisonResult, ComparisonResultV2, isV2Result,
  Perspective,
} from "../types/compare";
import "../styles/ContractPages.css";
import "../styles/CompareWerkbank.css";

// PremiumNotice Wrapper entfernt - verwende UnifiedPremiumNotice direkt mit variant="fullWidth"

// 🎯 Premium Comparison Mode Selector Component
const ComparisonModeSelector: React.FC<{
  selectedMode: string;
  onModeChange: (mode: string) => void;
}> = ({ selectedMode, onModeChange }) => {
  const modes = [
    {
      id: 'standard',
      name: 'Standard',
      icon: Scale,
      description: 'Allgemeiner Vergleich',
      color: '#0071e3',
      gradient: 'linear-gradient(135deg, #0071e3 0%, #00c7be 100%)'
    },
    {
      id: 'version',
      name: 'Versionen',
      icon: GitCompare,
      description: 'Alt vs. Neu',
      color: '#5856d6',
      gradient: 'linear-gradient(135deg, #5856d6 0%, #af52de 100%)'
    },
    {
      id: 'bestPractice',
      name: 'Best Practice',
      icon: FileCheck,
      description: 'Standards prüfen',
      color: '#10B981',
      gradient: 'linear-gradient(135deg, #10B981 0%, #10B981 100%)'
    },
    {
      id: 'competition',
      name: 'Anbieter',
      icon: Trophy,
      description: 'Angebote vergleichen',
      color: '#F59E0B',
      gradient: 'linear-gradient(135deg, #F59E0B 0%, #ff6b00 100%)'
    }
  ];

  return (
    <motion.div
      className="premium-mode-selector"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15, duration: 0.5 }}
    >
      <div className="selector-header">
        <span className="selector-label">Vergleichs-Modus</span>
      </div>
      <div className="mode-chips">
        {modes.map((mode, index) => {
          const IconComponent = mode.icon;
          const isActive = selectedMode === mode.id;
          return (
            <motion.button
              key={mode.id}
              className={`mode-chip ${isActive ? 'active' : ''}`}
              onClick={() => onModeChange(mode.id)}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + index * 0.05 }}
              whileHover={{ y: -2, boxShadow: '0 8px 25px rgba(0, 0, 0, 0.15)' }}
              whileTap={{ scale: 0.98 }}
              style={{
                background: isActive ? mode.gradient : 'rgba(255, 255, 255, 0.9)',
                boxShadow: isActive
                  ? `0 4px 20px ${mode.color}40, 0 0 0 1px ${mode.color}30`
                  : '0 2px 8px rgba(0, 0, 0, 0.06), 0 0 0 1px rgba(0, 0, 0, 0.04)'
              }}
            >
              <div
                className="chip-icon-wrapper"
                style={{
                  background: isActive ? 'rgba(255, 255, 255, 0.25)' : `${mode.color}15`,
                }}
              >
                <IconComponent
                  size={18}
                  style={{ color: isActive ? 'white' : mode.color }}
                />
              </div>
              <div className="chip-content">
                <span className="chip-name" style={{ color: isActive ? 'white' : '#1d1d1f' }}>
                  {mode.name}
                </span>
                <span className="chip-description" style={{ color: isActive ? 'rgba(255,255,255,0.8)' : '#86868b' }}>
                  {mode.description}
                </span>
              </div>
              {isActive && (
                <motion.div
                  className="chip-check"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                >
                  <CheckCircle size={16} style={{ color: 'white' }} />
                </motion.div>
              )}
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
};

// Premium User Profile Selector Component
const UserProfileSelector: React.FC<{
  selectedProfile: string;
  onProfileChange: (profile: string) => void;
}> = ({ selectedProfile, onProfileChange }) => {
  const profiles = [
    {
      id: 'individual',
      name: 'Privatperson',
      icon: Users,
      description: 'Verbraucherrechte',
      color: '#00c7be'
    },
    {
      id: 'freelancer',
      name: 'Freelancer',
      icon: Briefcase,
      description: 'Haftung & IP',
      color: '#5856d6'
    },
    {
      id: 'business',
      name: 'Unternehmen',
      icon: Building,
      description: 'Vollständige Analyse',
      color: '#0071e3'
    }
  ];

  return (
    <motion.div
      className="premium-profile-selector"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1, duration: 0.5 }}
    >
      <div className="selector-header">
        <span className="selector-label">Optimiert für</span>
      </div>
      <div className="profile-pills">
        {profiles.map((profile, index) => {
          const IconComponent = profile.icon;
          const isActive = selectedProfile === profile.id;
          return (
            <motion.button
              key={profile.id}
              className={`profile-pill ${isActive ? 'active' : ''}`}
              onClick={() => onProfileChange(profile.id)}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.05 + index * 0.05 }}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              style={{
                background: isActive
                  ? `linear-gradient(135deg, ${profile.color} 0%, ${profile.color}dd 100%)`
                  : 'rgba(255, 255, 255, 0.8)',
                boxShadow: isActive
                  ? `0 4px 15px ${profile.color}35`
                  : '0 2px 8px rgba(0, 0, 0, 0.04)'
              }}
            >
              <div
                className="pill-icon"
                style={{
                  background: isActive ? 'rgba(255,255,255,0.2)' : `${profile.color}12`,
                }}
              >
                <IconComponent size={16} style={{ color: isActive ? 'white' : profile.color }} />
              </div>
              <span className="pill-name" style={{ color: isActive ? 'white' : '#1d1d1f' }}>
                {profile.name}
              </span>
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
};



// Progress Step Interface for SSE
interface ProgressStep {
  step: string;
  progress: number;
  message: string;
}

// History Item Interface for storing comparisons
interface ComparisonHistoryItem {
  id: string;
  timestamp: number;
  file1Name: string;
  file2Name: string;
  file1S3Key?: string | null;
  file2S3Key?: string | null;
  mode: string;
  result: ComparisonResult;
  recommended: 1 | 2;
  version?: number;
}

// History is now stored in backend database (user-specific, device-independent)

// Main Enhanced Compare Component
export default function EnhancedCompare() {
  const [searchParams] = useSearchParams();
  // V2 is now the default on all compare routes (V1 fallback in backend if V2 fails)
  const useV2 = true;
  const [file1, setFile1] = useState<File | null>(null);
  const [file2, setFile2] = useState<File | null>(null);
  const [file1Name, setFile1Name] = useState<string | null>(null);
  const [file2Name, setFile2Name] = useState<string | null>(null);
  const [file1S3Key, setFile1S3Key] = useState<string | null>(null);
  const [file2S3Key, setFile2S3Key] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ComparisonResult | null>(null);
  const [isPremium, setIsPremium] = useState<boolean | null>(null);
  const [userProfile, setUserProfile] = useState('individual');
  const [comparisonMode, setComparisonMode] = useState('standard');
  const [preloadedContractName, setPreloadedContractName] = useState<string | null>(null);
  // 📊 SSE Progress State
  const [progress, setProgress] = useState<ProgressStep | null>(null);
  // 🆕 V2: Perspective state + Cache
  const [perspective, setPerspective] = useState<Perspective>('neutral');
  const [reAnalyzing, setReAnalyzing] = useState(false);
  const [perspectiveCache, setPerspectiveCache] = useState<Record<string, ComparisonResult>>({});

  // 📜 History State (loaded from backend API)
  const [showHistory, setShowHistory] = useState(false);
  const [historyItems, setHistoryItems] = useState<ComparisonHistoryItem[]>([]);

  const resultRef = useRef<HTMLDivElement>(null);
  const file1InputRef = useRef<HTMLInputElement>(null);
  const file2InputRef = useRef<HTMLInputElement>(null);
  /* 05.09.2026: Die Seite konnte bisher keine Dateien per Ziehen annehmen.
     Null Drag-Handler, während Optimierer und Better Contracts je vier
     haben, und das auf einer Seite mit ZWEI Uploads. */
  const [ziehtAuf, setZiehtAuf] = useState<1 | 2 | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // 📏 File size validation (10MB limit, matching backend multer config)
  const MAX_FILE_SIZE = 10 * 1024 * 1024;
  const validateAndSetFile = (file: File, setter: (f: File | null) => void) => {
    if (file.size > MAX_FILE_SIZE) {
      setNotification({
        message: `Datei "${file.name}" ist zu groß (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum: 10 MB.`,
        type: "error"
      });
      setTimeout(() => setNotification(null), 5000);
      return;
    }
    setter(file);
  };

  // 📸 Document Scanners for both file inputs
  /* Ziehen und Ablegen. validateAndSetFile prüft Typ und Größe wie beim
     Klickweg auch, hier gibt es also keine zweite Regel. */
  const behandleZiehen = (e: React.DragEvent, schacht: 1 | 2) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isPremium) return;
    setZiehtAuf(schacht);
  };

  const behandleVerlassen = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setZiehtAuf(null);
  };

  const behandleAblegen = (e: React.DragEvent, schacht: 1 | 2) => {
    e.preventDefault();
    e.stopPropagation();
    setZiehtAuf(null);
    if (!isPremium) return;
    const datei = e.dataTransfer?.files?.[0];
    if (datei) validateAndSetFile(datei, schacht === 1 ? setFile1 : setFile2);
  };

  const { openScanner: openScanner1, ScannerModal: ScannerModal1 } = useDocumentScanner((file) => {
    validateAndSetFile(file, setFile1);
  });
  const { openScanner: openScanner2, ScannerModal: ScannerModal2 } = useDocumentScanner((file) => {
    validateAndSetFile(file, setFile2);
  });

  // 🚨 DEBUG: Component Render Log
  console.log("🚨 COMPONENT RENDER - Current isPremium state:", isPremium);

  useEffect(() => {
    const controller = new AbortController();

    const fetchStatus = async () => {
      try {
        console.log("🚀 Starting auth check...");

        const res = await fetch("/api/auth/me", {
          credentials: "include",
          signal: controller.signal,
        });

        console.log("📡 Response status:", res.status, res.statusText);

        if (!res.ok) throw new Error("Nicht authentifiziert");

        const data = await res.json();

        // 🎯 ULTRA-DETAILED DEBUG:
        console.log("🔍 RAW API DATA:", JSON.stringify(data, null, 2));

        const userData = data.user || data;
        console.log("👤 USER DATA:", JSON.stringify(userData, null, 2));

        const tests = {
          "userData.isPremium": userData.isPremium,
          "userData.subscriptionPlan": userData.subscriptionPlan,
          "userData.subscriptionActive": userData.subscriptionActive,
          "data.user?.isPremium": data.user?.isPremium,
          "data.user?.subscriptionPlan": data.user?.subscriptionPlan,
          "data.isPremium": data.isPremium
        };

        console.log("🧪 ALL TESTS:", tests);

        // Simple logic:
        const hasPremium =
          userData.isPremium === true ||
          userData.subscriptionPlan === "business" ||
          userData.subscriptionPlan === "enterprise" ||
          userData.subscriptionActive === true;

        console.log("🎯 FINAL PREMIUM STATUS:", hasPremium);
        console.log("🎯 SETTING isPremium to:", hasPremium);

        setIsPremium(hasPremium);

      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        console.error("❌ Auth check error:", err);
        setIsPremium(false);
      }
    };

    fetchStatus();
    return () => controller.abort();
  }, []);

  // ✅ NEW: Load contract from URL parameter
  useEffect(() => {
    const contractId = searchParams.get('contractId');
    if (contractId && isPremium && !file1) {
      const loadContractFromUrl = async () => {
        try {
          // Step 1: Get contract metadata
          const res = await fetch(`/api/contracts/${contractId}`, {
            credentials: "include"
          });

          if (!res.ok) throw new Error("Vertrag konnte nicht geladen werden");

          const data = await res.json();
          const contract = data.contract || data;

          setPreloadedContractName(contract.name || contract.fileName || "Unbekannter Vertrag");

          // Step 2: Get presigned URL to download PDF
          const viewRes = await fetch(`/api/s3/view?contractId=${contractId}`, {
            credentials: "include"
          });

          if (!viewRes.ok) throw new Error("PDF konnte nicht abgerufen werden");

          const viewData = await viewRes.json();
          const pdfUrl = viewData.url;

          // Step 3: Download PDF as blob
          const pdfRes = await fetch(pdfUrl);
          if (!pdfRes.ok) throw new Error("PDF-Download fehlgeschlagen");

          const blob = await pdfRes.blob();

          // Step 4: Convert blob to File object
          const fileName = contract.fileName || contract.name || "vertrag.pdf";
          const file = new File([blob], fileName, { type: "application/pdf" });

          // Step 5: Validate size + set as file1
          validateAndSetFile(file, setFile1);

          setNotification({
            message: `Vertrag "${contract.name || contract.fileName}" wurde geladen`,
            type: "success"
          });

          // Auto-dismiss notification after 3 seconds
          setTimeout(() => setNotification(null), 3000);
        } catch (error) {
          console.error("❌ Error loading contract from URL:", error);
          setNotification({
            message: "Vertrag konnte nicht geladen werden",
            type: "error"
          });
        }
      };

      loadContractFromUrl();
    }
  }, [searchParams, isPremium, file1]);

  useEffect(() => {
    if (result && resultRef.current) {
      resultRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [result]);

  // 📜 Load history from backend API
  const loadHistoryFromBackend = async () => {
    if (!isPremium) return;

    try {
      const res = await fetch('/api/compare/history', {
        credentials: 'include'
      });

      if (!res.ok) {
        if (res.status === 403) {
          // Not premium - no history access
          setHistoryItems([]);
          return;
        }
        throw new Error('Failed to load history');
      }

      const data = await res.json();

      // Transform backend data to frontend format
      interface BackendHistoryItem {
        id: string;
        timestamp: string;
        file1Name: string;
        file2Name: string;
        file1S3Key?: string | null;
        file2S3Key?: string | null;
        comparisonMode?: string;
        result: ComparisonResult | null;
        recommendedContract: 1 | 2;
      }

      const items: ComparisonHistoryItem[] = (data.history || [])
        .filter((h: BackendHistoryItem) => h.result !== null)
        .map((h: BackendHistoryItem) => ({
          id: h.id,
          timestamp: new Date(h.timestamp).getTime(),
          file1Name: h.file1Name,
          file2Name: h.file2Name,
          file1S3Key: h.file1S3Key || null,
          file2S3Key: h.file2S3Key || null,
          mode: h.comparisonMode || 'standard',
          result: h.result as ComparisonResult,
          recommended: h.recommendedContract
        }));

      setHistoryItems(items);
      console.log(`📜 Loaded ${items.length} history items from backend`);
    } catch (err) {
      console.warn('Could not load comparison history from backend:', err);
      setHistoryItems([]);
    }
  };

  // 🛟 Pollt die Historie nach einem kürzlich gespeicherten Ergebnis (Stream-Disconnect-Fallback).
  // Wartet max. `maxAttempts × 3s` und sucht nach dem neuesten Eintrag, der zu den übergebenen Dateinamen passt.
  const pollHistoryForResult = async (
    file1Name: string | null,
    file2Name: string | null,
    maxAttempts = 8,
  ): Promise<{
    result: ComparisonResult;
    file1Name: string;
    file2Name: string;
    file1S3Key: string | null;
    file2S3Key: string | null;
  } | null> => {
    const startedAt = Date.now() - 5 * 60 * 1000; // 5 Min Toleranz
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      try {
        const res = await fetch('/api/compare/history', { credentials: 'include' });
        if (!res.ok) continue;
        const data = await res.json();
        interface BackendHistoryItem {
          id: string;
          timestamp: string;
          file1Name: string;
          file2Name: string;
          file1S3Key?: string | null;
          file2S3Key?: string | null;
          result: ComparisonResult | null;
        }
        const items: BackendHistoryItem[] = data.history || [];
        const match = items
          .filter((h) => h.result !== null)
          .filter((h) => new Date(h.timestamp).getTime() >= startedAt)
          .filter((h) => !file1Name || !file2Name || (h.file1Name === file1Name && h.file2Name === file2Name))
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
        if (match && match.result) {
          return {
            result: match.result,
            file1Name: match.file1Name,
            file2Name: match.file2Name,
            file1S3Key: match.file1S3Key ?? null,
            file2S3Key: match.file2S3Key ?? null,
          };
        }
      } catch (pollErr) {
        console.warn('History-Poll-Versuch fehlgeschlagen:', pollErr);
      }
    }
    return null;
  };

  // Load history when premium status is confirmed
  useEffect(() => {
    if (isPremium === true) {
      loadHistoryFromBackend();
    } else if (isPremium === false) {
      setHistoryItems([]);
    }
  }, [isPremium]);

  // 📜 Load comparison from history (display result)
  const loadFromHistory = (item: ComparisonHistoryItem) => {
    setResult(item.result);
    setFile1Name(item.file1Name || null);
    setFile2Name(item.file2Name || null);
    setFile1S3Key(item.file1S3Key || null);
    setFile2S3Key(item.file2S3Key || null);
    setFile1(null);
    setFile2(null);
    setComparisonMode(item.mode);
    setShowHistory(false);
    setNotification({
      message: `Vergleich vom ${new Date(item.timestamp).toLocaleDateString('de-DE')} geladen`,
      type: 'success'
    });
    setTimeout(() => setNotification(null), 5000);
  };

  // 📜 Delete from history via backend API
  const deleteFromHistory = async (id: string) => {
    try {
      const res = await fetch(`/api/compare/history/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!res.ok) {
        throw new Error('Failed to delete history item');
      }

      // Update local state
      setHistoryItems(prev => prev.filter(item => item.id !== id));
      console.log('📜 Deleted history item from backend');
    } catch (err) {
      console.warn('Could not delete history item:', err);
      setNotification({
        message: 'Fehler beim Löschen des Eintrags',
        type: 'error'
      });
    }
  };

  // 📜 Clear all history via backend API
  const clearHistory = async () => {
    if (!window.confirm('Wirklich den gesamten Vergleichsverlauf löschen? Das lässt sich nicht rückgängig machen.')) {
      return;
    }

    try {
      const res = await fetch('/api/compare/history', {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!res.ok) {
        throw new Error('Failed to clear history');
      }

      setHistoryItems([]);
      setNotification({
        message: 'Historie wurde gelöscht',
        type: 'success'
      });
      setTimeout(() => setNotification(null), 5000);
      console.log('📜 Cleared all history from backend');
    } catch (err) {
      console.warn('Could not clear history:', err);
      setNotification({
        message: 'Fehler beim Löschen der Historie',
        type: 'error'
      });
    }
  };

  const handleSubmit = async () => {
    if (!file1 || !file2) {
      setNotification({
        message: "Bitte wähle zwei Verträge aus.",
        type: "error"
      });
      return;
    }

    setLoading(true);
    setResult(null);
    setPerspectiveCache({});
    setProgress({ step: 'init', progress: 0, message: 'Starte Vergleich...' });

    const formData = new FormData();
    formData.append("file1", file1);
    formData.append("file2", file2);
    formData.append("userProfile", userProfile);
    formData.append("comparisonMode", comparisonMode);
    if (useV2) {
      formData.append("perspective", perspective);
      formData.append("version", "2");
    }

    // 📡 SSE Request with streaming progress + 3-minute timeout
    const controller = new AbortController();
    let streamTimeout: ReturnType<typeof setTimeout> | null = null;

    try {
      streamTimeout = setTimeout(() => {
        controller.abort();
      }, 300000); // 5 Minuten (OCR-Vergleiche brauchen länger)

      const res = await fetch(`/api/compare?stream=true${useV2 ? '&version=2' : ''}`, {
        method: "POST",
        credentials: "include",
        headers: {
          'Accept': 'text/event-stream'
        },
        body: formData,
        signal: controller.signal,
      });

      if (!res.ok && !res.body) {
        throw new Error("Vergleich fehlgeschlagen");
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error("Stream nicht verfügbar");
      }

      let buffer = '';
      let resultReceived = false;
      const requestFile1Name = file1?.name || null;
      const requestFile2Name = file2?.name || null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const eventData = JSON.parse(line.slice(6));

              if (eventData.type === 'progress') {
                setProgress({
                  step: eventData.step,
                  progress: eventData.progress,
                  message: eventData.message
                });
              } else if (eventData.type === 'result') {
                resultReceived = true;
                if (streamTimeout !== null) clearTimeout(streamTimeout);
                setResult(eventData.data);
                // Cache initiales Ergebnis unter aktueller Perspektive
                setPerspectiveCache({ [perspective]: eventData.data });
                setFile1Name(requestFile1Name);
                setFile2Name(requestFile2Name);
                setProgress(null);
                // Backend automatically saves to history - reload to get latest
                loadHistoryFromBackend();
                setNotification({
                  message: "Vertragsvergleich erfolgreich durchgeführt!",
                  type: "success"
                });
                setTimeout(() => setNotification(null), 5000);
              } else if (eventData.type === 'error') {
                setNotification({
                  message: eventData.message || "Beim Vergleich ist etwas schiefgelaufen. Deine Dateien sind noch geladen, du kannst ihn direkt noch einmal starten.",
                  type: "error"
                });
                setProgress(null);
                setLoading(false);
                return;
              }
            } catch (parseErr) {
              console.warn("SSE parse error:", parseErr, line);
            }
          }
        }
      }

      // 🛟 Stream endete ohne 'result' Event — Proxy-Disconnect während langer OCR/GPT-Phasen.
      // Backend läuft idR zu Ende und speichert das Ergebnis in der Historie.
      // Wir pollen kurz die Historie und übernehmen den neuesten passenden Eintrag automatisch.
      if (!resultReceived) {
        if (streamTimeout !== null) clearTimeout(streamTimeout);
        console.warn('🛟 SSE-Stream endete ohne result — starte History-Fallback');
        setProgress({ step: 'reconnecting', progress: 95, message: 'Verbindung unterbrochen — hole Ergebnis aus der Historie...' });

        const recovered = await pollHistoryForResult(requestFile1Name, requestFile2Name, 8);
        if (recovered) {
          setResult(recovered.result);
          setPerspectiveCache({ [perspective]: recovered.result });
          setFile1Name(recovered.file1Name || requestFile1Name);
          setFile2Name(recovered.file2Name || requestFile2Name);
          setFile1S3Key(recovered.file1S3Key || null);
          setFile2S3Key(recovered.file2S3Key || null);
          setProgress(null);
          loadHistoryFromBackend();
          setNotification({
            message: 'Verbindung war kurz unterbrochen — Ergebnis aus Historie geladen.',
            type: 'success',
          });
          setTimeout(() => setNotification(null), 5000);
        } else {
          setProgress(null);
          setNotification({
            message: 'Verbindung unterbrochen. Ergebnis ist evtl. in der Historie — bitte dort prüfen.',
            type: 'error',
          });
          loadHistoryFromBackend();
        }
      }
    } catch (err) {
      if (streamTimeout !== null) clearTimeout(streamTimeout);
      const isAbort = err instanceof DOMException && err.name === 'AbortError';
      const message = isAbort
        ? "Der Vergleich hat länger als fünf Minuten gedauert und wurde abgebrochen. Mit kürzeren Verträgen klappt es meist auf Anhieb."
        : err instanceof Error ? err.message : "Unbekannter Fehler beim Vergleich.";
      setNotification({
        message: isAbort ? message : "Fehler: " + message,
        type: "error"
      });
      setProgress(null);
    } finally {
      setLoading(false);
    }
  };

  // 🆕 V2: Perspective change — mit Cache (bereits geladene Perspektiven sofort verfügbar)
  const handlePerspectiveChange = async (newPerspective: Perspective) => {
    if (!result || !isV2Result(result)) return;
    const v2 = result as ComparisonResultV2;
    if (!v2.contractMap?.contract1 || !v2.contractMap?.contract2) return;

    setPerspective(newPerspective);

    // Texte fehlen (z.B. aus History geladen) → Re-Analyse nicht möglich
    if (!v2._contractTexts?.text1 && !v2._contractTexts?.text2) {
      setNotification({
        message: 'Perspektivwechsel nicht möglich — bitte Vergleich erneut durchführen.',
        type: 'error'
      });
      setTimeout(() => setNotification(null), 4000);
      return;
    }

    // Cache-Hit → sofort anzeigen, kein API-Call
    if (perspectiveCache[newPerspective]) {
      setResult(perspectiveCache[newPerspective]);
      return;
    }

    setReAnalyzing(true);

    try {
      const res = await fetch("/api/compare/re-analyze?stream=true", {
        method: "POST",
        credentials: "include",
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream'
        },
        body: JSON.stringify({
          contractMap: v2.contractMap,
          perspective: newPerspective,
          comparisonMode,
          userProfile,
          contractTexts: {
            text1: v2._contractTexts?.text1 || '',
            text2: v2._contractTexts?.text2 || '',
          },
        }),
      });

      if (!res.ok && !res.body) throw new Error("Re-Analyse fehlgeschlagen");

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error("Stream nicht verfügbar");

      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const eventData = JSON.parse(line.slice(6));
              if (eventData.type === 'result') {
                setResult(eventData.data);
                // Ergebnis im Cache speichern
                setPerspectiveCache(prev => ({ ...prev, [newPerspective]: eventData.data }));
              } else if (eventData.type === 'error') {
                setNotification({ message: eventData.message || "Re-Analyse fehlgeschlagen", type: "error" });
              }
            } catch { /* parse error */ }
          }
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Fehler bei der Re-Analyse";
      setNotification({ message, type: "error" });
    } finally {
      setReAnalyzing(false);
    }
  };

  const handleReset = () => {
    setFile1(null);
    setFile2(null);
    setResult(null);
    setPerspectiveCache({});
    setPerspective('neutral');
  };

  const [pdfExporting, setPdfExporting] = useState(false);

  const exportToPDF = async () => {
    if (!result) return;

    // ✅ Enterprise-Check: PDF Export nur für Business/Enterprise
    if (!isPremium) {
      setNotification({
        message: 'PDF-Export ist ein Enterprise-Feature. Upgrade für diese Funktion!',
        type: 'error'
      });
      return;
    }

    setPdfExporting(true);

    try {
      const response = await fetch('/api/compare/export-pdf', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          result,
          file1Name: file1?.name || 'Vertrag 1',
          file2Name: file2?.name || 'Vertrag 2'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'PDF-Export fehlgeschlagen');
      }

      // Download the PDF
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Vertragsvergleich_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setNotification({
        message: 'PDF wurde erfolgreich erstellt!',
        type: 'success'
      });
      setTimeout(() => setNotification(null), 5000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unbekannter Fehler beim PDF-Export';
      setNotification({
        message: 'Fehler: ' + message,
        type: 'error'
      });
    } finally {
      setPdfExporting(false);
    }
  };

  if (isPremium === null) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', gap: '1rem', color: '#86868b' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid rgba(0, 113, 227, 0.1)', borderTopColor: '#0071e3', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
        <p>Lade...</p>
      </div>
    );
  }

  return (
    <>
      <WelcomePopup
        featureId="compare"
        icon={<Scale size={32} />}
        title="Verträge vergleichen"
        description="Lade zwei Verträge hoch und sieh sie nebeneinander. Die KI zeigt die Unterschiede und sagt dir, welcher für dich günstiger ist."
        tip="Ideal für: Alter vs. neuer Vertrag, oder zwei Angebote von verschiedenen Anbietern."
      />
      <Helmet>
        <title>Verträge vergleichen & bessere Wahl treffen mit KI | Contract AI</title>
        <meta name="description" content="Vergleiche Verträge in Sekunden mit KI: Unterschiede sehen, Fairness prüfen & bessere Konditionen sichern. Jetzt schnell & einfach vergleichen!" />
        <meta name="keywords" content="Vertragsvergleich, Verträge vergleichen, Vertragsunterschiede, KI Vertragsanalyse, bessere Konditionen, Contract AI" />
        <link rel="canonical" href="https://www.contract-ai.de/compare" />
        {/* Open Graph / Facebook */}
        <meta property="og:title" content="Verträge vergleichen & bessere Wahl treffen mit KI | Contract AI" />
        <meta property="og:description" content="Vergleiche Verträge schnell & transparent mit KI. Unterschiede erkennen, Fairness prüfen & bessere Konditionen wählen. Jetzt ausprobieren!" />
        <meta property="og:url" content="https://www.contract-ai.de/compare" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://www.contract-ai.de/og-image.jpg" />
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Verträge vergleichen & bessere Wahl treffen mit KI | Contract AI" />
        <meta name="twitter:description" content="Vergleiche Verträge in Sekunden mit KI: Fairness prüfen, Unterschiede sehen & die beste Wahl treffen. Jetzt testen!" />
        <meta name="twitter:image" content="https://www.contract-ai.de/og-image.jpg" />
      </Helmet>

      <div className={`cw-seite ${!isPremium ? 'with-premium-banner' : ''}`}>
        {/* Full-Width Premium Banner - außerhalb des Containers */}
        {!isPremium && (
          <UnifiedPremiumNotice
            featureName="Der Vertragsvergleich"
            variant="fullWidth"
          />
        )}

        <motion.div
          className="cw-rahmen"
          style={result ? { paddingTop: '8px' } : {}}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* 05.09.2026: War Hero-Symbol, Abzeichen, Verlaufsüberschrift und
              Beschreibungssatz, also eine Landingpage-Wand vor der ersten
              Handlung, auf einer Seite für eingeloggte zahlende Nutzer.
              Jetzt eine Seitenüberschrift wie im übrigen Produkt. */}
          {!result && (
          <div className="cw-kopf">
            <div>
              <div className="cw-kopf-titel">Vertragsvergleich</div>
              <div className="cw-kopf-sub">Zwei Verträge nebeneinander, mit Einordnung durch die KI</div>
            </div>
            {historyItems.length > 0 && (
              <div className="cw-kopf-rechts">
                <button
                  className="cw-knopf still"
                  onClick={() => setShowHistory(!showHistory)}
                  style={{ padding: '7px 13px', fontSize: '13px' }}
                >
                  <History size={15} />
                  Frühere Vergleiche ({historyItems.length})
                  <ChevronDown
                    size={13}
                    style={{
                      transform: showHistory ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.25s ease'
                    }}
                  />
                </button>
              </div>
            )}
          </div>
          )}

          {/* History Button moved to upload section header */}

          {/* History Panel */}
          <AnimatePresence>
            {!result && showHistory && (
              <motion.div
                className="history-panel"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                style={{
                  marginBottom: '2rem',
                  background: 'white',
                  borderRadius: '16px',
                  border: '1px solid #e8e8ed',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
                  overflow: 'hidden'
                }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '1rem 1.5rem',
                  borderBottom: '1px solid #e8e8ed',
                  background: '#f5f5f7'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                    <History size={18} style={{ color: '#0071e3' }} />
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: '#1d1d1f' }}>
                      Vergleichs-Historie
                    </h3>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <motion.button
                      onClick={clearHistory}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        padding: '0.4rem 0.8rem',
                        background: 'rgba(239, 68, 68, 0.1)',
                        color: '#EF4444',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        fontWeight: 500,
                        fontFamily: 'inherit'
                      }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Trash2 size={14} />
                      Alle löschen
                    </motion.button>
                    <motion.button
                      onClick={() => setShowHistory(false)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '28px',
                        height: '28px',
                        background: '#e8e8ed',
                        color: '#6e6e73',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer'
                      }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <X size={16} />
                    </motion.button>
                  </div>
                </div>

                <div style={{ padding: '1rem', maxHeight: '400px', overflowY: 'auto' }}>
                  {historyItems.map((item, index) => {
                    const modeLabels: Record<string, string> = {
                      standard: 'Standard',
                      version: 'Versionen',
                      bestPractice: 'Best Practice',
                      competition: 'Anbieter'
                    };

                    return (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '1rem',
                          borderRadius: '10px',
                          border: '1px solid #e8e8ed',
                          marginBottom: index < historyItems.length - 1 ? '0.75rem' : 0,
                          background: '#fafafa',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                        whileHover={{
                          background: 'rgba(0, 113, 227, 0.05)',
                          borderColor: '#0071e3'
                        }}
                        onClick={() => loadFromHistory(item)}
                      >
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                            <span style={{
                              fontSize: '0.75rem',
                              fontWeight: 500,
                              padding: '0.2rem 0.5rem',
                              borderRadius: '4px',
                              background: 'rgba(0, 113, 227, 0.1)',
                              color: '#0071e3'
                            }}>
                              {modeLabels[item.mode] || item.mode}
                            </span>
                            <span style={{ fontSize: '0.8rem', color: '#6e6e73' }}>
                              {new Date(item.timestamp).toLocaleDateString('de-DE', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <FileText size={14} style={{ color: '#6e6e73' }} />
                            <span style={{ fontSize: '0.9rem', color: '#1d1d1f', fontWeight: 500 }}>
                              {item.file1Name}
                            </span>
                            <ArrowRight size={14} style={{ color: '#6e6e73' }} />
                            <span style={{ fontSize: '0.9rem', color: '#1d1d1f', fontWeight: 500 }}>
                              {item.file2Name}
                            </span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            padding: '0.3rem 0.6rem',
                            borderRadius: '6px',
                            background: item.recommended === 1 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(88, 86, 214, 0.1)',
                            color: item.recommended === 1 ? '#10B981' : '#5856d6',
                            fontSize: '0.8rem',
                            fontWeight: 500
                          }}>
                            <Star size={12} />
                            Vertrag {item.recommended}
                          </div>

                          <motion.button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteFromHistory(item.id);
                            }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: '28px',
                              height: '28px',
                              background: 'transparent',
                              color: '#EF4444',
                              border: 'none',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              opacity: 0.6
                            }}
                            whileHover={{ opacity: 1, scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                          >
                            <Trash2 size={14} />
                          </motion.button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {!result && (
            <UserProfileSelector
              selectedProfile={userProfile}
              onProfileChange={setUserProfile}
            />
          )}

          {!result && (
            <ComparisonModeSelector
              selectedMode={comparisonMode}
              onModeChange={setComparisonMode}
            />
          )}

          {!result && preloadedContractName && (
            <motion.div
              style={{
                background: 'rgba(0, 113, 227, 0.1)',
                border: '1px solid rgba(0, 113, 227, 0.3)',
                borderRadius: '12px',
                padding: '1rem 1.5rem',
                marginBottom: '2rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.8rem'
              }}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Info size={20} style={{ color: '#0071e3', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <strong style={{ color: '#0071e3' }}>Vertrag vorgeladen:</strong>
                <span style={{ color: '#1d1d1f', marginLeft: '0.5rem' }}>{preloadedContractName}</span>
              </div>
            </motion.div>
          )}

          {/* ══════════════════════════════════════════════════════════
              05.09.2026: Vorher zwei Karten mit Hintergrunddekoration,
              Symbolringen, einem grossen VS-Abzeichen und Federanimationen.
              Jetzt zwei gleichrangige Ablageflächen mit ruhigem Trenner.

              NEU: Beide nehmen Dateien per Ziehen an. Die Seite hatte
              vorher null Drag-Handler, und das bei ZWEI Uploads.
              ══════════════════════════════════════════════════════════ */}
          {!result && (
          <div className="cw-karte">
            <div className="cw-karte-kopf">
              <div className="cw-karte-symbol">
                <Scale size={16} />
              </div>
              <div>
                <h3>Verträge hochladen</h3>
                <p>Zwei Dokumente als PDF oder Word, wir stellen sie gegenüber</p>
              </div>
            </div>

            <div className="cw-paar">
              {/* ── Erster Vertrag ── */}
              <div className={`cw-schacht ${file1 ? 'gefuellt' : ''}`}>
                <div className="cw-schacht-marke">
                  <span className="cw-schacht-nr">1</span>
                  Erster Vertrag
                </div>

                <input
                  ref={file1InputRef}
                  type="file"
                  accept=".pdf,.docx"
                  disabled={!isPremium}
                  style={{ display: 'none' }}
                  onChange={(e) => e.target.files?.[0] && validateAndSetFile(e.target.files[0], setFile1)}
                />

                <div
                  className={`cw-ablage ${file1 ? 'gefuellt' : ''} ${ziehtAuf === 1 ? 'zieht' : ''} ${!isPremium ? 'gesperrt' : ''}`}
                  onClick={() => isPremium && !file1 && file1InputRef.current?.click()}
                  onDragOver={(e) => behandleZiehen(e, 1)}
                  onDragEnter={(e) => behandleZiehen(e, 1)}
                  onDragLeave={behandleVerlassen}
                  onDrop={(e) => behandleAblegen(e, 1)}
                  onKeyDown={(e) => {
                    if (!isPremium || file1) return;
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      file1InputRef.current?.click();
                    }
                  }}
                  role="button"
                  tabIndex={isPremium && !file1 ? 0 : -1}
                  aria-label="Ersten Vertrag auswählen"
                >
                  <div className="cw-ablage-symbol">
                    {file1 ? <CheckCircle size={18} /> : <FileText size={18} strokeWidth={1.8} />}
                  </div>

                  {file1 ? (
                    <>
                      <div className="cw-ablage-titel">{file1.name}</div>
                      <div className="cw-ablage-text">{(file1.size / 1024 / 1024).toFixed(2)} MB</div>
                      <button
                        className="cw-datei-weg"
                        onClick={(e) => { e.stopPropagation(); setFile1(null); }}
                      >
                        <X size={12} />
                        Entfernen
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="cw-ablage-titel">
                        {isPremium ? 'Hierher ziehen' : 'Business-Abo erforderlich'}
                      </div>
                      <div className="cw-ablage-text">
                        {isPremium
                          ? <>oder <span className="cw-ablage-link">Datei auswählen</span></>
                          : 'Vergleichen ist Teil des Business-Abos'}
                      </div>
                      {isPremium && (
                        <button
                          className="cw-datei-weg"
                          onClick={(e) => { e.stopPropagation(); openScanner1(); }}
                        >
                          <Camera size={12} />
                          Abfotografieren
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* ── Trenner ── */}
              <div className="cw-trenner">gegen</div>

              {/* ── Zweiter Vertrag ── */}
              <div className={`cw-schacht ${file2 ? 'gefuellt' : ''}`}>
                <div className="cw-schacht-marke">
                  <span className="cw-schacht-nr">2</span>
                  Zweiter Vertrag
                </div>

                <input
                  ref={file2InputRef}
                  type="file"
                  accept=".pdf,.docx"
                  disabled={!isPremium}
                  style={{ display: 'none' }}
                  onChange={(e) => e.target.files?.[0] && validateAndSetFile(e.target.files[0], setFile2)}
                />

                <div
                  className={`cw-ablage ${file2 ? 'gefuellt' : ''} ${ziehtAuf === 2 ? 'zieht' : ''} ${!isPremium ? 'gesperrt' : ''}`}
                  onClick={() => isPremium && !file2 && file2InputRef.current?.click()}
                  onDragOver={(e) => behandleZiehen(e, 2)}
                  onDragEnter={(e) => behandleZiehen(e, 2)}
                  onDragLeave={behandleVerlassen}
                  onDrop={(e) => behandleAblegen(e, 2)}
                  onKeyDown={(e) => {
                    if (!isPremium || file2) return;
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      file2InputRef.current?.click();
                    }
                  }}
                  role="button"
                  tabIndex={isPremium && !file2 ? 0 : -1}
                  aria-label="Zweiten Vertrag auswählen"
                >
                  <div className="cw-ablage-symbol">
                    {file2 ? <CheckCircle size={18} /> : <FileText size={18} strokeWidth={1.8} />}
                  </div>

                  {file2 ? (
                    <>
                      <div className="cw-ablage-titel">{file2.name}</div>
                      <div className="cw-ablage-text">{(file2.size / 1024 / 1024).toFixed(2)} MB</div>
                      <button
                        className="cw-datei-weg"
                        onClick={(e) => { e.stopPropagation(); setFile2(null); }}
                      >
                        <X size={12} />
                        Entfernen
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="cw-ablage-titel">
                        {isPremium ? 'Hierher ziehen' : 'Business-Abo erforderlich'}
                      </div>
                      <div className="cw-ablage-text">
                        {isPremium
                          ? <>oder <span className="cw-ablage-link">Datei auswählen</span></>
                          : 'Vergleichen ist Teil des Business-Abos'}
                      </div>
                      {isPremium && (
                        <button
                          className="cw-datei-weg"
                          onClick={(e) => { e.stopPropagation(); openScanner2(); }}
                        >
                          <Camera size={12} />
                          Abfotografieren
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="cw-leiste">
              <span className="cw-typ">PDF</span>
              <span className="cw-typ">DOCX</span>
              <span>je bis 10 MB</span>
              <span style={{ marginLeft: 'auto' }}>Deine Dateien verlassen den Browser nur zur Analyse</span>
            </div>
          </div>
          )}

          {!result && (
          <div className="cw-knopfreihe">
            {(file1 || file2) && (
              <button className="cw-knopf still" onClick={handleReset}>
                <RefreshCw size={15} />
                Zurücksetzen
              </button>
            )}

            <button
              className="cw-knopf cw-schieb"
              onClick={handleSubmit}
              disabled={!file1 || !file2 || loading || !isPremium}
            >
              {loading ? (
                <>
                  <span className="cw-kreisel" />
                  {progress?.message || 'Vergleich läuft'}
                </>
              ) : (
                <>
                  Vergleich starten
                  <ArrowRight size={15} />
                </>
              )}
            </button>
          </div>
          )}

          {/* 🆕 V2 Results Container */}
          <AnimatePresence>
            {result && (
              <motion.div
                ref={resultRef}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <motion.button
                    onClick={() => { setResult(null); }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.6rem 1rem',
                      borderRadius: '10px',
                      backgroundColor: '#f5f5f7',
                      color: '#1d1d1f',
                      border: 'none',
                      fontFamily: 'inherit',
                      fontSize: '0.88rem',
                      fontWeight: 500,
                      cursor: 'pointer'
                    }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <ArrowRight size={14} style={{ transform: 'rotate(180deg)' }} />
                    <span>Neuer Vergleich</span>
                  </motion.button>
                  <motion.button
                    onClick={exportToPDF}
                    disabled={pdfExporting}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.6rem 1rem',
                      borderRadius: '10px',
                      backgroundColor: pdfExporting ? '#e8e8ed' : '#f5f5f7',
                      color: '#1d1d1f',
                      border: 'none',
                      fontFamily: 'inherit',
                      fontSize: '0.88rem',
                      fontWeight: 500,
                      cursor: pdfExporting ? 'wait' : 'pointer',
                      opacity: pdfExporting ? 0.7 : 1
                    }}
                    whileHover={!pdfExporting ? { scale: 1.02 } : {}}
                    whileTap={!pdfExporting ? { scale: 0.98 } : {}}
                  >
                    {pdfExporting ? (
                      <>
                        <div style={{ width: '14px', height: '14px', border: '2px solid rgba(0, 0, 0, 0.2)', borderTopColor: '#0071e3', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                        <span>PDF wird erstellt...</span>
                      </>
                    ) : (
                      <>
                        <Download size={14} />
                        <span>Als PDF speichern</span>
                      </>
                    )}
                  </motion.button>
                </div>

                <CompareResults
                  result={result}
                  file1={file1}
                  file2={file2}
                  file1Name={file1Name}
                  file2Name={file2Name}
                  file1S3Key={file1S3Key}
                  file2S3Key={file2S3Key}
                  onPerspectiveChange={handlePerspectiveChange}
                  reAnalyzing={reAnalyzing}
                />
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {notification && (
              <motion.div 
                style={{
                  position: 'fixed',
                  bottom: '2rem',
                  right: '2rem',
                  padding: '1rem 1.5rem',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.8rem',
                  backdropFilter: 'blur(10px)',
                  zIndex: 100,
                  minWidth: '300px',
                  maxWidth: '90%',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
                  backgroundColor: notification.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                  border: `1px solid ${notification.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                  color: notification.type === 'success' ? '#10B981' : '#EF4444'
                }}
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              >
                {notification.type === "success" ? (
                  <CheckCircle size={18} style={{ flexShrink: 0 }} />
                ) : (
                  <AlertCircle size={18} style={{ flexShrink: 0 }} />
                )}
                <span style={{ fontWeight: 500, flexGrow: 1 }}>{notification.message}</span>
                <button 
                  onClick={() => setNotification(null)} 
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'inherit',
                    fontSize: '1rem',
                    cursor: 'pointer',
                    padding: '0.2rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: 0.8
                  }}
                >
                  ✕
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }

          @keyframes pulse-ring {
            0% { transform: scale(0.8); opacity: 1; }
            100% { transform: scale(1.4); opacity: 0; }
          }

          @keyframes shimmer {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
          }

          /* ============================================
             🎨 PREMIUM PROFILE SELECTOR
             ============================================ */
          .premium-profile-selector {
            margin-bottom: 2rem;
            margin-top: 1.5rem;
          }

          .selector-header {
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 1.25rem;
          }

          .selector-label {
            font-size: 0.85rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            color: #1d1d1f;
            background: linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(139, 92, 246, 0.08) 100%);
            padding: 8px 20px;
            border-radius: 100px;
            border: 1px solid rgba(59, 130, 246, 0.15);
          }

          /* Scan Button inside Upload Card */
          .scan-button-inline {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 6px 14px;
            margin-top: 12px;
            border-radius: 8px;
            border: 1px solid rgba(99, 102, 241, 0.25);
            background: rgba(99, 102, 241, 0.08);
            color: #6366f1;
            font-size: 12px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s ease;
            font-family: inherit;
          }

          .scan-button-inline:hover {
            background: rgba(99, 102, 241, 0.15);
            border-color: rgba(99, 102, 241, 0.4);
          }

          .profile-pills {
            display: flex;
            gap: 0.75rem;
            justify-content: center;
            flex-wrap: wrap;
          }

          .profile-pill {
            display: flex;
            align-items: center;
            gap: 0.6rem;
            padding: 0.65rem 1.1rem;
            border: none;
            border-radius: 50px;
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            font-family: inherit;
            font-size: 0.9rem;
            font-weight: 500;
            backdrop-filter: blur(10px);
          }

          .pill-icon {
            width: 28px;
            height: 28px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.3s ease;
          }

          .pill-name {
            font-weight: 500;
          }

          /* ============================================
             🎯 PREMIUM MODE SELECTOR
             ============================================ */
          .premium-mode-selector {
            margin-bottom: 2rem;
          }

          .mode-chips {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 1rem;
          }

          @media (max-width: 900px) {
            .mode-chips {
              grid-template-columns: repeat(2, 1fr);
            }
          }

          @media (max-width: 500px) {
            .mode-chips {
              grid-template-columns: 1fr;
            }
          }

          .mode-chip {
            display: flex;
            align-items: center;
            gap: 0.8rem;
            padding: 1rem 1.2rem;
            border: none;
            border-radius: 16px;
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            font-family: inherit;
            text-align: left;
            position: relative;
            overflow: hidden;
          }

          .chip-icon-wrapper {
            width: 36px;
            height: 36px;
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            transition: all 0.3s ease;
          }

          .chip-content {
            flex: 1;
            min-width: 0;
          }

          .chip-name {
            display: block;
            font-weight: 600;
            font-size: 0.95rem;
            margin-bottom: 0.15rem;
          }

          .chip-description {
            display: block;
            font-size: 0.75rem;
            line-height: 1.3;
          }

          .chip-check {
            width: 24px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          /* ============================================
             📤 PREMIUM UPLOAD SECTION
             ============================================ */
          .premium-upload-section {
            background: linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(248,250,252,0.95) 100%);
            backdrop-filter: blur(20px);
            border-radius: 24px;
            border: 1px solid rgba(0, 0, 0, 0.06);
            box-shadow:
              0 1px 1px rgba(0, 0, 0, 0.02),
              0 4px 8px rgba(0, 0, 0, 0.04),
              0 16px 32px rgba(0, 0, 0, 0.04);
            padding: 2rem;
            margin-bottom: 2rem;
          }

          .upload-section-header {
            display: flex;
            align-items: center;
            gap: 1rem;
            margin-bottom: 2rem;
            padding-bottom: 1.5rem;
            border-bottom: 1px solid rgba(0, 0, 0, 0.06);
          }

          .upload-header-icon {
            width: 44px;
            height: 44px;
            border-radius: 12px;
            background: linear-gradient(135deg, #0071e3 0%, #00c7be 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            box-shadow: 0 4px 12px rgba(0, 113, 227, 0.3);
          }

          .upload-header-text h3 {
            margin: 0 0 0.25rem 0;
            font-size: 1.1rem;
            font-weight: 600;
            color: #1d1d1f;
          }

          .upload-header-text p {
            margin: 0;
            font-size: 0.9rem;
            color: #86868b;
          }

          .upload-cards-container {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 1.5rem;
            margin-bottom: 2rem;
          }

          @media (max-width: 768px) {
            .upload-cards-container {
              flex-direction: column;
            }
            .vs-connector {
              transform: rotate(90deg);
              margin: 0.5rem 0;
            }
          }

          .premium-upload-card {
            position: relative;
            width: 280px;
            height: 200px;
            border-radius: 20px;
            background: white;
            border: 2px dashed rgba(0, 113, 227, 0.2);
            cursor: pointer;
            transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            overflow: hidden;
          }

          .premium-upload-card:hover {
            border-style: solid;
            border-color: rgba(0, 113, 227, 0.4);
          }

          .premium-upload-card.has-file {
            border-style: solid;
            border-color: #10B981;
            background: linear-gradient(180deg, rgba(16, 185, 129, 0.03) 0%, rgba(16, 185, 129, 0.08) 100%);
          }

          .premium-upload-card.disabled {
            cursor: not-allowed;
            opacity: 0.6;
          }

          .card-bg-decoration {
            position: absolute;
            top: -50%;
            right: -50%;
            width: 150%;
            height: 150%;
            background: radial-gradient(circle at center, rgba(0, 113, 227, 0.03) 0%, transparent 70%);
            pointer-events: none;
          }

          .card-bg-decoration.alt {
            background: radial-gradient(circle at center, rgba(88, 86, 214, 0.03) 0%, transparent 70%);
          }

          .card-wrapper {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 10px;
          }

          .card-label {
            display: flex;
            align-items: center;
            gap: 8px;
            background: white;
            padding: 8px 16px 8px 10px;
            border-radius: 100px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
            border: 1px solid rgba(0, 0, 0, 0.06);
            white-space: nowrap;
          }

          .label-number {
            width: 24px;
            height: 24px;
            border-radius: 50%;
            background: linear-gradient(135deg, #0071e3 0%, #00c7be 100%);
            color: white;
            font-size: 0.8rem;
            font-weight: 700;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
          }

          .card-label.alt .label-number {
            background: linear-gradient(135deg, #5856d6 0%, #af52de 100%);
          }

          .label-text {
            font-size: 0.85rem;
            font-weight: 600;
            color: #1d1d1f;
            white-space: nowrap;
          }

          .upload-placeholder {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 0.75rem;
          }

          .upload-icon-wrapper {
            position: relative;
            width: 56px;
            height: 56px;
            border-radius: 16px;
            background: linear-gradient(135deg, rgba(0, 113, 227, 0.1) 0%, rgba(0, 199, 190, 0.1) 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            color: #0071e3;
          }

          .upload-icon-wrapper.alt {
            background: linear-gradient(135deg, rgba(88, 86, 214, 0.1) 0%, rgba(175, 82, 222, 0.1) 100%);
            color: #5856d6;
          }

          .upload-icon-ring {
            position: absolute;
            inset: -4px;
            border-radius: 20px;
            border: 2px dashed currentColor;
            opacity: 0.3;
            animation: pulse-ring 2s ease-out infinite;
          }

          .upload-text {
            font-size: 0.95rem;
            font-weight: 600;
            color: #1d1d1f;
          }

          .upload-hint {
            font-size: 0.8rem;
            color: #86868b;
          }

          .file-preview {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 0.75rem;
            width: 100%;
            padding: 0 1.5rem;
          }

          .file-icon-wrapper {
            position: relative;
            width: 56px;
            height: 56px;
            border-radius: 16px;
            background: linear-gradient(135deg, rgba(0, 113, 227, 0.1) 0%, rgba(0, 199, 190, 0.1) 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            color: #0071e3;
          }

          .file-icon-wrapper.success {
            background: linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(16, 185, 129, 0.15) 100%);
            color: #10B981;
          }

          .file-icon-wrapper.alt {
            background: linear-gradient(135deg, rgba(88, 86, 214, 0.1) 0%, rgba(175, 82, 222, 0.15) 100%);
            color: #5856d6;
          }

          .success-check {
            position: absolute;
            bottom: -4px;
            right: -4px;
            width: 22px;
            height: 22px;
            border-radius: 50%;
            background: #10B981;
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 2px 8px rgba(16, 185, 129, 0.4);
          }

          .file-info {
            text-align: center;
            width: 100%;
          }

          .file-name {
            display: block;
            font-size: 0.9rem;
            font-weight: 600;
            color: #1d1d1f;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 200px;
            margin: 0 auto;
          }

          .file-size {
            display: block;
            font-size: 0.8rem;
            color: #86868b;
            margin-top: 0.2rem;
          }

          .remove-file {
            position: absolute;
            top: 0.75rem;
            right: 0.75rem;
            width: 28px;
            height: 28px;
            border-radius: 8px;
            background: rgba(239, 68, 68, 0.1);
            border: none;
            color: #EF4444;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;
          }

          .remove-file:hover {
            background: #EF4444;
            color: white;
          }

          .premium-overlay {
            position: absolute;
            inset: 0;
            background: rgba(255, 255, 255, 0.7);
            backdrop-filter: blur(2px);
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .premium-badge-card {
            display: flex;
            align-items: center;
            gap: 0.4rem;
            padding: 0.5rem 1rem;
            background: linear-gradient(135deg, #f7b500 0%, #F59E0B 100%);
            color: white;
            font-size: 0.85rem;
            font-weight: 600;
            border-radius: 50px;
            box-shadow: 0 4px 12px rgba(247, 181, 0, 0.4);
          }

          /* VS Connector */
          .vs-connector {
            display: flex;
            align-items: center;
            gap: 0;
          }

          .connector-line {
            width: 20px;
            height: 2px;
            background: linear-gradient(90deg, transparent 0%, #e8e8ed 50%, transparent 100%);
          }

          .vs-badge {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: linear-gradient(135deg, #f5f5f7 0%, #e8e8ed 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 0.75rem;
            font-weight: 700;
            color: #86868b;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
          }

          /* ============================================
             🚀 PREMIUM ACTION BUTTONS
             ============================================ */
          .action-buttons {
            display: flex;
            justify-content: center;
            gap: 1rem;
          }

          .premium-submit-btn {
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.6rem;
            min-width: 220px;
            padding: 1rem 2rem;
            border: none;
            border-radius: 14px;
            background: linear-gradient(135deg, #0071e3 0%, #0077ed 50%, #00c7be 100%);
            background-size: 200% 100%;
            color: white;
            font-family: inherit;
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            overflow: hidden;
            transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            box-shadow: 0 4px 20px rgba(0, 113, 227, 0.3);
          }

          .premium-submit-btn:hover:not(.disabled) {
            background-position: 100% 0;
          }

          .premium-submit-btn.disabled {
            background: linear-gradient(135deg, #86868b 0%, #6e6e73 100%);
            cursor: not-allowed;
            box-shadow: none;
          }

          .premium-submit-btn .btn-bg {
            position: absolute;
            inset: 0;
            background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.1) 50%, transparent 100%);
            background-size: 200% 100%;
            animation: shimmer 2s ease-in-out infinite;
          }

          .premium-submit-btn .btn-icon {
            position: relative;
          }

          .premium-submit-btn .btn-text {
            position: relative;
          }

          .premium-submit-btn .btn-arrow {
            position: relative;
            transition: transform 0.3s ease;
          }

          .premium-submit-btn:hover:not(.disabled) .btn-arrow {
            transform: translateX(4px);
          }

          .premium-submit-btn .loading-spinner {
            width: 18px;
            height: 18px;
            border: 2px solid rgba(255, 255, 255, 0.3);
            border-top-color: white;
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }

          .reset-btn {
            display: flex;
            align-items: center;
            gap: 0.6rem;
            padding: 1rem 1.5rem;
            background: rgba(0, 0, 0, 0.04);
            border: 1px solid rgba(0, 0, 0, 0.06);
            border-radius: 14px;
            color: #1d1d1f;
            font-family: inherit;
            font-size: 0.95rem;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.3s ease;
          }

          .reset-btn:hover {
            background: rgba(0, 0, 0, 0.08);
          }

          /* History Toggle Button */
          .history-toggle-btn {
            display: flex;
            align-items: center;
            gap: 0.4rem;
            padding: 0.5rem 1rem;
            background: white;
            color: #6e6e73;
            border: 1px solid rgba(0, 0, 0, 0.08);
            border-radius: 10px;
            cursor: pointer;
            font-family: inherit;
            font-size: 0.85rem;
            font-weight: 500;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
          }

          .history-toggle-btn:hover {
            background: #f5f5f7;
            color: #1d1d1f;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
          }

          .history-toggle-btn.active {
            background: #0071e3;
            color: white;
            border-color: transparent;
            box-shadow: 0 2px 10px rgba(0, 113, 227, 0.25);
          }

          .contract-score {
            flex: 1;
            background: white;
            border: 2px solid #e8e8ed;
            border-radius: 16px;
            padding: 1.5rem;
            text-align: center;
            transition: all 0.3s ease;
          }

          .contract-score.recommended {
            border-color: #10B981;
            background: rgba(16, 185, 129, 0.02);
          }

          .score-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 1rem;
          }

          .score-header h4 {
            margin: 0;
            color: #1d1d1f;
            font-size: 1.1rem;
            font-weight: 600;
          }

          .recommended-badge {
            display: flex;
            align-items: center;
            gap: 0.3rem;
            background: #10B981;
            color: white;
            padding: 0.3rem 0.8rem;
            border-radius: 20px;
            font-size: 0.8rem;
            font-weight: 500;
          }

          .score-circle {
            position: relative;
            width: 80px;
            height: 80px;
            margin: 0 auto 1rem;
          }

          .score-svg {
            transform: rotate(-90deg);
          }

          .score-text {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            text-align: center;
          }

          .score-number {
            display: block;
            font-size: 1.4rem;
            font-weight: 600;
            color: #1d1d1f;
          }

          .score-label {
            font-size: 0.8rem;
            color: #6e6e73;
          }

          .risk-indicator {
            margin-bottom: 1rem;
          }

          .risk-badge {
            display: inline-flex;
            align-items: center;
            gap: 0.3rem;
            padding: 0.4rem 0.8rem;
            border-radius: 20px;
            font-size: 0.85rem;
            font-weight: 500;
          }

          .risk-low {
            background: rgba(16, 185, 129, 0.1);
            color: #10B981;
          }

          .risk-medium {
            background: rgba(245, 158, 11, 0.1);
            color: #F59E0B;
          }

          .risk-high {
            background: rgba(239, 68, 68, 0.1);
            color: #EF4444;
          }

          .analysis-details {
            text-align: left;
            display: flex;
            gap: 1rem;
          }

          .strengths, .weaknesses {
            flex: 1;
          }

          .analysis-details h5 {
            display: flex;
            align-items: center;
            gap: 0.3rem;
            margin: 0 0 0.5rem;
            font-size: 0.9rem;
            font-weight: 600;
            color: #1d1d1f;
          }

          .analysis-details ul {
            margin: 0;
            padding-left: 1rem;
            list-style: none;
          }

          .analysis-details li {
            font-size: 0.8rem;
            color: #6e6e73;
            margin-bottom: 0.3rem;
            position: relative;
          }

          .analysis-details li:before {
            content: '•';
            color: #0071e3;
            position: absolute;
            left: -0.8rem;
          }

          .difference-view {
            width: 100%;
          }

          /* Severity Overview Bar */
          .severity-overview {
            margin-bottom: 1rem;
            padding: 0.75rem 1rem;
            background: #f5f5f7;
            border-radius: 10px;
          }

          .severity-stats {
            display: flex;
            gap: 0.75rem;
            flex-wrap: wrap;
          }

          .stat-badge {
            display: inline-flex;
            align-items: center;
            gap: 0.3rem;
            padding: 0.3rem 0.6rem;
            border-radius: 6px;
            font-size: 0.8rem;
            font-weight: 500;
          }

          .stat-critical {
            background: rgba(215, 0, 21, 0.1);
            color: #d70015;
          }

          .stat-high {
            background: rgba(239, 68, 68, 0.1);
            color: #EF4444;
          }

          .stat-medium {
            background: rgba(245, 158, 11, 0.1);
            color: #F59E0B;
          }

          .stat-low {
            background: rgba(16, 185, 129, 0.1);
            color: #10B981;
          }

          .difference-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 1.5rem;
            gap: 1rem;
          }

          .category-select {
            padding: 0.5rem 1rem;
            border: 1px solid #e8e8ed;
            border-radius: 8px;
            background: white;
            color: #1d1d1f;
            font-family: inherit;
            font-size: 0.9rem;
            cursor: pointer;
          }

          .view-toggles {
            display: flex;
            gap: 0.5rem;
          }

          .view-toggle {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.5rem 1rem;
            border: 1px solid #e8e8ed;
            border-radius: 8px;
            background: white;
            color: #1d1d1f;
            font-family: inherit;
            font-size: 0.9rem;
            cursor: pointer;
            transition: all 0.2s ease;
          }

          .view-toggle:hover {
            background: #f5f5f7;
          }

          .view-toggle.active {
            background: rgba(0, 113, 227, 0.1);
            border-color: #0071e3;
            color: #0071e3;
          }

          /* Diff Navigation Styles */
          .diff-navigation {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            background: #f5f5f7;
            padding: 0.4rem 0.8rem;
            border-radius: 10px;
          }

          .nav-button {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 32px;
            height: 32px;
            border: none;
            border-radius: 8px;
            background: white;
            color: #0071e3;
            cursor: pointer;
            transition: all 0.2s ease;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          }

          .nav-button:hover {
            background: #0071e3;
            color: white;
          }

          .nav-counter {
            font-size: 0.85rem;
            font-weight: 600;
            color: #1d1d1f;
            min-width: 60px;
            text-align: center;
          }

          /* Active Difference Styling */
          .difference-item.diff-active {
            transform: translateY(-2px);
            border-left-width: 5px;
          }

          .difference-item.diff-active::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 3px;
            background: linear-gradient(90deg, var(--severity-color, #0071e3), transparent);
            border-radius: 12px 12px 0 0;
          }

          /* Diff Highlighting Styles */
          .diff-text {
            display: inline;
          }

          .diff-segment {
            transition: background-color 0.2s ease;
          }

          .diff-same {
            color: inherit;
          }

          .diff-removed {
            background-color: rgba(239, 68, 68, 0.2);
            color: #d70015;
            text-decoration: line-through;
            border-radius: 2px;
            padding: 0 2px;
          }

          .diff-added {
            background-color: rgba(16, 185, 129, 0.2);
            color: #248a3d;
            font-weight: 500;
            border-radius: 2px;
            padding: 0 2px;
          }

          .differences-container {
            display: flex;
            flex-direction: column;
            gap: 1rem;
          }

          .difference-item {
            position: relative;
            border: 1px solid #e8e8ed;
            border-radius: 12px;
            padding: 1.5rem;
            background: white;
            border-left: 4px solid #e8e8ed;
            transition: all 0.2s ease;
            cursor: pointer;
          }

          .difference-item:hover {
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
            transform: translateY(-1px);
          }

          .difference-item.severity-critical {
            background: rgba(215, 0, 21, 0.02);
          }

          .difference-item.severity-high {
            background: rgba(239, 68, 68, 0.02);
          }

          .difference-header-item {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            margin-bottom: 1rem;
            gap: 1rem;
          }

          .section-info {
            flex: 1;
          }

          .category-badge {
            display: inline-block;
            background: rgba(0, 113, 227, 0.1);
            color: #0071e3;
            padding: 0.2rem 0.6rem;
            border-radius: 12px;
            font-size: 0.8rem;
            font-weight: 500;
            margin-bottom: 0.5rem;
          }

          .section-info h4 {
            margin: 0;
            color: #1d1d1f;
            font-size: 1rem;
            font-weight: 600;
          }

          .severity-badge {
            display: flex;
            align-items: center;
            gap: 0.3rem;
            padding: 0.4rem 0.8rem;
            border-radius: 20px;
            color: white;
            font-size: 0.8rem;
            font-weight: 500;
            text-transform: capitalize;
          }

          .side-by-side-content {
            display: grid;
            grid-template-columns: 1fr auto 1fr;
            gap: 1rem;
            align-items: center;
            margin-bottom: 1rem;
          }

          .contract-column {
            padding: 1rem;
            border: 2px solid #e8e8ed;
            border-radius: 8px;
            background: #f9f9f9;
            transition: all 0.2s ease;
          }

          .contract-column.recommended {
            border-color: #10B981;
            background: rgba(16, 185, 129, 0.05);
          }

          .contract-column.not-recommended {
            border-color: #e8e8ed;
            background: #f9f9f9;
          }

          .contract-column h5 {
            margin: 0 0 0.5rem;
            color: #1d1d1f;
            font-size: 0.9rem;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 0.5rem;
          }

          .rec-badge {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 18px;
            height: 18px;
            background: #10B981;
            color: white;
            border-radius: 50%;
            font-size: 0.7rem;
            font-weight: 700;
          }

          .contract-text {
            font-size: 0.85rem;
            color: #6e6e73;
            line-height: 1.5;
          }

          .contract-column.recommended .contract-text {
            color: #1d1d1f;
          }

          .vs-divider {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 40px;
            height: 40px;
            color: white;
            border-radius: 50%;
            font-size: 0.75rem;
            font-weight: 700;
            flex-shrink: 0;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
          }

          .vs-divider span {
            line-height: 1;
          }

          .list-content {
            margin-bottom: 1rem;
          }

          .impact {
            font-size: 0.9rem;
            color: #6e6e73;
            line-height: 1.4;
          }

          .recommendation {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.8rem;
            background: rgba(0, 113, 227, 0.05);
            border-radius: 8px;
            font-size: 0.9rem;
            color: #0071e3;
            font-weight: 500;
          }

          /* Explanation — Anwaltliche Einordnung */
          .difference-explanation {
            font-size: 0.95rem;
            line-height: 1.65;
            color: #1d1d1f;
            margin-bottom: 0.75rem;
            padding: 0;
          }

          .difference-explanation.fallback {
            color: #6e6e73;
          }

          .difference-impact {
            display: flex;
            align-items: flex-start;
            gap: 0.4rem;
            font-size: 0.82rem;
            color: #6e6e73;
            margin-bottom: 0.75rem;
            font-style: italic;
          }

          .difference-impact svg {
            flex-shrink: 0;
            margin-top: 2px;
          }

          .show-quotes-btn {
            display: inline-flex;
            align-items: center;
            gap: 0.35rem;
            padding: 0.4rem 0.75rem;
            border: 1px solid #e8e8ed;
            border-radius: 8px;
            background: #f5f5f7;
            color: #6e6e73;
            font-family: inherit;
            font-size: 0.8rem;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s ease;
            margin-bottom: 0.75rem;
          }

          .show-quotes-btn:hover {
            background: #e8e8ed;
            color: #1d1d1f;
          }

          .quotes-panel {
            margin-bottom: 0.75rem;
            overflow: hidden;
          }

          .stacked-quotes {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
          }

          .quote-block {
            padding: 0.75rem;
            border-radius: 8px;
            background: #f9f9f9;
            border: 1px solid #e8e8ed;
            font-size: 0.85rem;
            color: #6e6e73;
            line-height: 1.5;
          }

          /* PDF Preview Button */
          .pdf-preview-btn {
            display: inline-flex;
            align-items: center;
            gap: 0.35rem;
            padding: 0.35rem 0.7rem;
            border: 1px solid #e8e8ed;
            border-radius: 8px;
            background: white;
            color: #6e6e73;
            font-family: inherit;
            font-size: 0.78rem;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s ease;
            white-space: nowrap;
          }

          .pdf-preview-btn:hover:not(:disabled) {
            background: rgba(0, 113, 227, 0.08);
            border-color: #0071e3;
            color: #0071e3;
          }

          .pdf-preview-btn.active {
            background: rgba(0, 113, 227, 0.1);
            border-color: #0071e3;
            color: #0071e3;
          }

          .pdf-preview-btn:disabled {
            opacity: 0.4;
            cursor: not-allowed;
          }

          /* PDF Preview Panel */
          .pdf-preview-panel {
            margin-top: 12px;
            border-radius: 12px;
            overflow: hidden;
            border: 1px solid #e8e8ed;
            background: #f5f5f7;
          }

          .pdf-preview-tabs {
            display: flex;
            gap: 0;
            border-bottom: 1px solid #e8e8ed;
            background: #fff;
          }

          .pdf-tab {
            flex: 1;
            padding: 10px;
            border: none;
            background: transparent;
            font-family: inherit;
            font-size: 13px;
            font-weight: 500;
            color: #6e6e73;
            cursor: pointer;
            transition: all 0.2s ease;
            position: relative;
          }

          .pdf-tab:hover:not(:disabled) {
            color: #1d1d1f;
            background: #f5f5f7;
          }

          .pdf-tab.active {
            color: #0071e3;
          }

          .pdf-tab.active::after {
            content: '';
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            height: 2px;
            background: #0071e3;
          }

          .pdf-tab:disabled {
            opacity: 0.4;
            cursor: not-allowed;
          }

          .pdf-tab-close {
            flex: 0;
            padding: 10px 16px;
            color: #a1a1a6;
          }

          .pdf-tab-close:hover {
            color: #EF4444;
            background: rgba(239, 68, 68, 0.05);
          }

          .pdf-preview-viewer {
            max-height: 500px;
            overflow-y: auto;
          }

          @media (max-width: 768px) {
            .profile-options {
              flex-direction: column;
              align-items: center;
            }

            .profile-option {
              min-width: auto;
              width: 100%;
              max-width: 300px;
            }

            .side-by-side-content {
              grid-template-columns: 1fr;
              gap: 0.5rem;
            }

            .vs-divider {
              display: none;
            }

            .difference-header {
              flex-direction: column;
              align-items: stretch;
            }

            .analysis-details {
              flex-direction: column;
              gap: 0.5rem;
            }

            .pdf-preview-viewer {
              max-height: 400px;
            }

            .pdf-preview-btn span {
              display: none;
            }
          }
        `}</style>
      </div>
      {ScannerModal1}
      {ScannerModal2}
    </>
  );
}