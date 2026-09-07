import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Helmet } from "react-helmet-async";
import { Check,
  FileText, Download, ArrowRight, CheckCircle, AlertCircle, RefreshCw, Upload, Info, Scale, Star, ChevronDown, History, Trash2, X, Camera
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
import "../styles/CompareGegen.css";

// PremiumNotice Wrapper entfernt - verwende UnifiedPremiumNotice direkt mit variant="fullWidth"

// 🎯 Premium Comparison Mode Selector Component
/* 06.09.2026: ComparisonModeSelector und UserProfileSelector entfernt.
 Sie waren zwei eigenstaendige Bloecke in eigenen Designsprachen (tuerkise
 Pillen, Karten mit Blau-Verlauf) und standen zusammen mit der Rollenwahl
 als Wand aus drei Waehlern vor der eigentlichen Aufgabe. Ihre Funktion
 steckt jetzt in der einen Einstellungszeile weiter unten, die erst
 erscheint, wenn beide Vertraege liegen. Dieselben Zustaende, dieselben
 Werte an das Backend (userProfile, comparisonMode). */
// Premium User Profile Selector Component


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
  // 05.09.2026: welche der beiden Karten gerade eine gezogene Datei erwartet
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
  /* 05.09.2026: Ziehen und Ablegen. Geprueft wird ueber dasselbe
     validateAndSetFile wie beim Klickweg, es gibt also keine zweite Regel
     fuer Dateityp und Groesse. */
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

      <div className={`cg-seite ${!isPremium ? 'with-premium-banner' : ''}`}>
        {/* Full-Width Premium Banner - außerhalb des Containers */}
        {!isPremium && (
          <UnifiedPremiumNotice
            featureName="Der Vertragsvergleich"
            variant="fullWidth"
          />
        )}

        <motion.div
          className="cg-rahmen"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* ══════════════════════════════════════════════════════════
              05.09.2026: Der Kopf war eine Landingpage-Wand (Hero-Symbol,
              Abzeichen "Premium Feature", Verlaufsueberschrift,
              Beschreibungssatz) und verschwand ausserdem, sobald
              Ergebnisse da waren. Er bleibt jetzt stehen und wechselt
              nur seinen Inhalt.
              ══════════════════════════════════════════════════════════ */}
          <div className="cg-kopf">
            <div>
              <div className="cg-kopf-titel">
                {result ? 'Vergleichsergebnis' : 'Vertragsvergleich'}
              </div>
              <div className="cg-kopf-sub">
                {result ? (
                  <>
                    Aus Sicht {perspective === 'auftraggeber' ? <strong>des Auftraggebers</strong>
                      : perspective === 'auftragnehmer' ? <strong>des Auftragnehmers</strong>
                      : <strong>beider Seiten</strong>}
                    {file1 && file2 ? ` · ${file1.name} gegen ${file2.name}` : ''}
                  </>
                ) : (
                  'Wir zeigen die Unterschiede und sagen dir, welcher für dich der bessere ist'
                )}
              </div>
            </div>

            <div className="cg-kopf-rechts">
              {result ? (
                <button className="cg-knopf still klein" onClick={handleReset}>
                  <RefreshCw size={14} />
                  Neuer Vergleich
                </button>
              ) : historyItems.length > 0 ? (
                <button className="cg-knopf still klein" onClick={() => setShowHistory(!showHistory)}>
                  <History size={14} />
                  Frühere Vergleiche ({historyItems.length})
                  <ChevronDown
                    size={13}
                    style={{
                      transform: showHistory ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.25s ease'
                    }}
                  />
                </button>
              ) : null}
            </div>
          </div>

          {/* 05.09.2026 zurueckgeholt: Historie-Anzeige, Profilwahl, Moduswahl
              und der Hinweis auf einen vorgeladenen Vertrag. Sie lagen im
              ersetzten Bereich und waren beim Umbau mit verschwunden. */}
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

          {/* 06.09.2026: UserProfileSelector und ComparisonModeSelector
              standen hier als zwei eigene Blöcke in eigenen Designsprachen
              (türkise Pillen, Verlaufskarten). Sie sind unten in die eine
              Einstellungszeile gewandert, die erst erscheint, wenn beide
              Verträge liegen. Dieselben Zustände, dieselben Werte. */}



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

          {/* ══════════ LADEZUSTAND ══════════
              Nutzt progress.progress und progress.message aus dem Streaming,
              statt nur zu drehen. */}
          {loading && !result && (
            <div className="cg-laden">
              <div className="cg-laden-kreis"></div>
              <h3>{progress?.message || 'Verträge werden verglichen'}</h3>
              <p>Das dauert einen Moment. Du kannst die Seite offen lassen.</p>
              <div className="cg-balken">
                <i style={{ width: `${Math.max(5, Math.min(100, progress?.progress ?? 5))}%` }} />
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════
              07.09.2026: Zwei nummerierte Abschnitte statt einer losen
              Folge von Blöcken. Sie geben der Seite eine Ordnung, die man
              abarbeitet, und zeigen zugleich den Stand.
              ══════════════════════════════════════════════════════════ */}
          {!result && !loading && (
          <>
          {/* ── Schritt 1: worum es geht ── */}
          <div className="cg-schritt">
            <div className="cg-schritt-kopf">
              <span className="cg-schritt-n fertig">
                <Check size={11} strokeWidth={3.5} />
              </span>
              <span className="cg-schritt-t">Worum es geht</span>
              <span className="cg-schritt-s">bestimmt, worauf wir achten</span>
              <span className="cg-schritt-linie"></span>
            </div>

            <div className="cg-dreier">
              <div className="cg-karte">
                <div className="cg-karte-n">Ich bin</div>
                <div className="cg-opt">
                  {([
                    ['individual', 'Privatperson', 'Verbraucherrechte im Blick'],
                    ['freelancer', 'Freelancer', 'Haftung und Nutzungsrechte'],
                    ['business', 'Unternehmen', 'Vollständige Prüfung']
                  ] as [string, string, string][]).map(([wert, titel, text]) => (
                    <button
                      key={wert}
                      className={`cg-o ${userProfile === wert ? 'an' : ''}`}
                      onClick={() => setUserProfile(wert)}
                      disabled={!isPremium}
                      aria-pressed={userProfile === wert}
                    >
                      <span className="cg-o-p"></span>
                      <span>
                        <span className="cg-o-t">{titel}</span>
                        <span className="cg-o-s">{text}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="cg-karte">
                <div className="cg-karte-n">Vergleichsart</div>
                <div className="cg-opt">
                  {([
                    ['standard', 'Allgemein', 'Zwei Verträge gegenüberstellen'],
                    ['version', 'Alt gegen Neu', 'Was hat sich geändert?'],
                    ['bestPractice', 'Gegen Standards', 'Marktüblichkeit prüfen'],
                    ['competition', 'Zwei Angebote', 'Welches ist besser?']
                  ] as [string, string, string][]).map(([wert, titel, text]) => (
                    <button
                      key={wert}
                      className={`cg-o ${comparisonMode === wert ? 'an' : ''}`}
                      onClick={() => setComparisonMode(wert)}
                      disabled={!isPremium}
                      aria-pressed={comparisonMode === wert}
                    >
                      <span className="cg-o-p"></span>
                      <span>
                        <span className="cg-o-t">{titel}</span>
                        <span className="cg-o-s">{text}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="cg-karte">
                <div className="cg-karte-n">Meine Rolle</div>
                <div className="cg-opt">
                  {([
                    ['auftraggeber', 'Auftraggeber', 'Du beauftragst und bezahlst'],
                    ['auftragnehmer', 'Auftragnehmer', 'Du erbringst die Leistung'],
                    ['neutral', 'Neutral', 'Beide Seiten gleich gewichtet']
                  ] as [Perspective, string, string][]).map(([wert, titel, text]) => (
                    <button
                      key={wert}
                      className={`cg-o ${perspective === wert ? 'an' : ''}`}
                      onClick={() => setPerspective(wert)}
                      disabled={!isPremium}
                      aria-pressed={perspective === wert}
                    >
                      <span className="cg-o-p"></span>
                      <span>
                        <span className="cg-o-t">{titel}</span>
                        <span className="cg-o-s">{text}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── Schritt 2: die beiden Verträge ── */}
          <div className="cg-schritt">
            <div className="cg-schritt-kopf">
              <span className={`cg-schritt-n ${file1 && file2 ? 'fertig' : 'offen'}`}>
                {file1 && file2 ? <Check size={11} strokeWidth={3.5} /> : '2'}
              </span>
              <span className="cg-schritt-t">Die beiden Verträge</span>
              <span className="cg-schritt-s">PDF oder Word, je bis 10 MB</span>
              <span className="cg-schritt-linie"></span>
            </div>

            <div className="cg-gegen">
              {/* ── Vertrag A ── */}
              <div className="cg-saeule cg-a">
                <div className="cg-saeule-kopf">
                  <span className="cg-kennung">A</span>
                  <span className="cg-saeule-name">{file1 ? file1.name : 'Erster Vertrag'}</span>
                  <span className="cg-saeule-meta">
                    {file1 ? `${(file1.size / 1024 / 1024).toFixed(1)} MB` : 'noch leer'}
                  </span>
                </div>

                <input
                  ref={file1InputRef}
                  type="file"
                  accept=".pdf,.docx"
                  disabled={!isPremium}
                  style={{ display: 'none' }}
                  onChange={(e) => e.target.files?.[0] && validateAndSetFile(e.target.files[0], setFile1)}
                />

                {file1 ? (
                  <div className="cg-geladen">
                    <div className="cg-geladen-symbol"><CheckCircle size={17} /></div>
                    <div className="cg-geladen-t">
                      <div className="cg-geladen-n">{file1.name}</div>
                      <div className="cg-geladen-m">
                        {(file1.size / 1024 / 1024).toFixed(2)} MB · {file1.name.split('.').pop()?.toUpperCase()}
                      </div>
                    </div>
                    <button className="cg-weg" onClick={() => setFile1(null)}>Entfernen</button>
                  </div>
                ) : (
                  <div
                    className={`cg-ablage ${ziehtAuf === 1 ? 'zieht' : ''} ${!isPremium ? 'gesperrt' : ''}`}
                    onClick={() => isPremium && file1InputRef.current?.click()}
                    onDragOver={(e) => behandleZiehen(e, 1)}
                    onDragEnter={(e) => behandleZiehen(e, 1)}
                    onDragLeave={behandleVerlassen}
                    onDrop={(e) => behandleAblegen(e, 1)}
                    onKeyDown={(e) => {
                      if (!isPremium) return;
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        file1InputRef.current?.click();
                      }
                    }}
                    role="button"
                    tabIndex={isPremium ? 0 : -1}
                    aria-label="Ersten Vertrag auswählen"
                  >
                    <div className="cg-ablage-symbol"><Upload size={25} strokeWidth={1.5} /></div>
                    <div className="cg-ablage-t">
                      {isPremium ? 'Hierher ziehen' : 'Business-Abo erforderlich'}
                    </div>
                    <div className="cg-ablage-s">
                      {isPremium ? <>oder <span>Datei auswählen</span></> : 'Vergleichen ist Teil des Business-Abos'}
                    </div>
                  </div>
                )}

                <div className="cg-leiste" style={{ margin: 0, borderRadius: 0, border: 0, borderTop: '1px solid var(--cg-linie)', background: 'var(--cg-senke)' }}>
                  <span className="cg-typ">PDF</span>
                  <span className="cg-typ">DOCX</span>
                  <span>bis 10 MB</span>
                  {isPremium && (
                    <button className="cg-foto" style={{ margin: 0, marginLeft: 'auto', padding: 0, border: 0, background: 'none' }} onClick={() => openScanner1()}>
                      <Camera size={13} />
                      Abfotografieren
                    </button>
                  )}
                </div>
              </div>

              {/* ── Vertrag B ── */}
              <div className="cg-saeule cg-b">
                <div className="cg-saeule-kopf">
                  <span className="cg-kennung">B</span>
                  <span className="cg-saeule-name">{file2 ? file2.name : 'Zweiter Vertrag'}</span>
                  <span className="cg-saeule-meta">
                    {file2 ? `${(file2.size / 1024 / 1024).toFixed(1)} MB` : 'noch leer'}
                  </span>
                </div>

                <input
                  ref={file2InputRef}
                  type="file"
                  accept=".pdf,.docx"
                  disabled={!isPremium}
                  style={{ display: 'none' }}
                  onChange={(e) => e.target.files?.[0] && validateAndSetFile(e.target.files[0], setFile2)}
                />

                {file2 ? (
                  <div className="cg-geladen">
                    <div className="cg-geladen-symbol"><CheckCircle size={17} /></div>
                    <div className="cg-geladen-t">
                      <div className="cg-geladen-n">{file2.name}</div>
                      <div className="cg-geladen-m">
                        {(file2.size / 1024 / 1024).toFixed(2)} MB · {file2.name.split('.').pop()?.toUpperCase()}
                      </div>
                    </div>
                    <button className="cg-weg" onClick={() => setFile2(null)}>Entfernen</button>
                  </div>
                ) : (
                  <div
                    className={`cg-ablage ${ziehtAuf === 2 ? 'zieht' : ''} ${!isPremium ? 'gesperrt' : ''}`}
                    onClick={() => isPremium && file2InputRef.current?.click()}
                    onDragOver={(e) => behandleZiehen(e, 2)}
                    onDragEnter={(e) => behandleZiehen(e, 2)}
                    onDragLeave={behandleVerlassen}
                    onDrop={(e) => behandleAblegen(e, 2)}
                    onKeyDown={(e) => {
                      if (!isPremium) return;
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        file2InputRef.current?.click();
                      }
                    }}
                    role="button"
                    tabIndex={isPremium ? 0 : -1}
                    aria-label="Zweiten Vertrag auswählen"
                  >
                    <div className="cg-ablage-symbol"><Upload size={25} strokeWidth={1.5} /></div>
                    <div className="cg-ablage-t">
                      {isPremium ? 'Hierher ziehen' : 'Business-Abo erforderlich'}
                    </div>
                    <div className="cg-ablage-s">
                      {isPremium ? <>oder <span>Datei auswählen</span></> : 'Vergleichen ist Teil des Business-Abos'}
                    </div>
                  </div>
                )}

                <div className="cg-leiste" style={{ margin: 0, borderRadius: 0, border: 0, borderTop: '1px solid var(--cg-linie)', background: 'var(--cg-senke)' }}>
                  <span className="cg-typ">PDF</span>
                  <span className="cg-typ">DOCX</span>
                  <span>bis 10 MB</span>
                  {isPremium && (
                    <button className="cg-foto" style={{ margin: 0, marginLeft: 'auto', padding: 0, border: 0, background: 'none' }} onClick={() => openScanner2()}>
                      <Camera size={13} />
                      Abfotografieren
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Der Knopf sitzt am Ende einer Zeile, die sagt was noch fehlt,
                statt mittig zwischen den beiden Verträgen zu stehen. */}
            <div className="cg-startzeile">
              <div className="cg-startzeile-t">
                {!file1 && !file2
                  ? <>Lege <b>zwei Verträge</b> ab, dann kann es losgehen</>
                  : !file1 || !file2
                    ? <>Es fehlt noch <b>ein Vertrag</b></>
                    : <>Beide Verträge liegen bereit</>}
              </div>
              {(file1 || file2) && (
                <button className="cg-knopf still" onClick={handleReset}>
                  <RefreshCw size={15} />
                  Zurücksetzen
                </button>
              )}
              <button
                className="cg-knopf"
                style={{ marginLeft: file1 || file2 ? undefined : 'auto' }}
                onClick={handleSubmit}
                disabled={!file1 || !file2 || loading || !isPremium}
              >
                Vergleich starten
                <ArrowRight size={16} />
              </button>
            </div>
          </div>

          {/* ── Frühere Vergleiche ── */}
          {historyItems.length > 0 && (
            <div className="cg-weiter">
              <div className="cg-weiter-kopf">
                <h3>Oder einen früheren Vergleich öffnen</h3>
                <span className="zahl">{historyItems.length} gespeichert</span>
                <button className="cg-weiter-alle" onClick={() => setShowHistory(!showHistory)}>
                  {showHistory ? 'Liste schließen' : 'Alle ansehen'}
                </button>
              </div>
              <div className="cg-hist-gitter">
                {historyItems.slice(0, 4).map((h) => (
                  <button key={h.id} className="cg-hist" onClick={() => loadFromHistory(h)}>
                    <div className="cg-hist-o">
                      <span className={`cg-hist-s ${h.recommended === 1 ? 'a' : 'b'}`}>
                        {h.recommended === 1 ? 'A' : 'B'} empfohlen
                      </span>
                      <span className="cg-hist-d">
                        {new Date(h.timestamp).toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })}
                      </span>
                    </div>
                    <div className="cg-hist-n">
                      <b>{h.file1Name}</b> gegen <b>{h.file2Name}</b>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
          </>
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
              /* 07.09.2026: role und aria-live ergaenzt. Ohne sie kuendigen
                 Vorlesehilfen Erfolgs- und Fehlermeldungen gar nicht an;
                 alert fuer Fehler unterbricht, status fuer Erfolg nicht. */
              <motion.div
                role={notification.type === "error" ? "alert" : "status"}
                aria-live={notification.type === "error" ? "assertive" : "polite"}
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

        {/* 07.09.2026: Hier stand ein <style>-Block mit 1372 Zeilen und 117
            global gueltigen Klassen, aus der Zeit vor dem Redesign.

            Geprueft vor dem Entfernen: KEINE dieser Klassen wird von
            Compare, CompareResults oder den fuenf Reitern noch verwendet —
            die nutzen ausschliesslich CSS-Module und die cg-Klassen aus
            styles/CompareGegen.css. Der Block war fuer diese Seite also
            wirkungslos.

            Er stoerte aber drei ANDERE Seiten, solange Compare gerendert
            war, weil er im Body steht und damit spaeter als deren CSS im
            Head greift:
              .btn-text          pages/Calendar.tsx
              .loading-spinner   pages/Calendar.tsx, pages/CalendarView.tsx
              .upload-icon-wrapper  pages/Optimizer.tsx
            Sicherung des Blocks: scratchpad/entfernter-style-block.css */}
      </div>
      {ScannerModal1}
      {ScannerModal2}
    </>
  );
}