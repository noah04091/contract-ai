/**
 * 🎯 OptimizerFinalize - Post-Generation Seite für optimierte Verträge
 *
 * Diese Seite wird nach der Vertragsoptimierung angezeigt und ermöglicht:
 * - Text bearbeiten
 * - Design wählen (Carousel)
 * - KI-Nachbesserung
 * - PDF-Vorschau
 * - Download (Seite bleibt offen)
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Helmet } from "react-helmet-async";
import {
  CheckCircle, Download, FileText, Edit3, Sparkles,
  ArrowLeft, ArrowRight, Check, RefreshCw, X, ArrowLeftCircle,
  Loader2, Wand2, FileCheck, Paperclip, Trash2, Plus, File
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import styles from "../styles/Generate.module.css";

// API URL
const API_URL = import.meta.env.VITE_API_URL || 'https://api.contract-ai.de';

// Token aus localStorage holen (Login speichert als "authToken", andere als "token")
const getToken = () => localStorage.getItem("authToken") || localStorage.getItem("token");

// Design-Varianten (wie in Generate.tsx)
const DESIGN_VARIANTS = [
  { id: 'executive', name: 'Executive', color: 'linear-gradient(135deg, #0B1324 0%, #1A2540 100%)' },
  { id: 'modern', name: 'Modern', color: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)' },
  { id: 'minimal', name: 'Minimal', color: '#F9FAFB' },
  { id: 'elegant', name: 'Elegant', color: 'linear-gradient(135deg, #D4AF37 0%, #B8860B 100%)' },
  { id: 'corporate', name: 'Corporate', color: 'linear-gradient(135deg, #003366 0%, #00264d 100%)' },
];

const VISIBLE_DESIGNS = 5;

// Lade-Nachrichten für Animation
const LOADING_MESSAGES = [
  "Vertrag wird geladen...",
  "Analysiere Vertragsstruktur...",
  "Bereite Editor vor...",
  "Generiere PDF-Vorschau...",
  "Fast fertig..."
];

export default function OptimizerFinalize() {
  const { contractId } = useParams<{ contractId: string }>();
  const navigate = useNavigate();
  const hasFetched = useRef(false);
  const { isLoading: authLoading } = useAuth();

  // Contract State
  const [contractText, setContractText] = useState<string>("");
  const [contractTitle, setContractTitle] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState<string>(LOADING_MESSAGES[0]);
  const [loadingProgress, setLoadingProgress] = useState<number>(0);

  // 🆕 FormData für Deckblatt-Felder (Titel, Parteien, etc.)
  interface FormData {
    title?: string;
    partyA?: string;
    partyB?: string;
    partyAAddress?: string;
    partyBAddress?: string;
    contractDate?: string;
    contractType?: string;
  }
  const [formData, setFormData] = useState<FormData>({});

  // Design State
  const [selectedDesign, setSelectedDesign] = useState<string>("executive");
  const [designCarouselIndex, setDesignCarouselIndex] = useState<number>(0);
  const [isChangingDesign, setIsChangingDesign] = useState<boolean>(false);

  // PDF Preview State
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState<boolean>(false);

  // KI Improvement State
  const [showImprovementSection, setShowImprovementSection] = useState<boolean>(false);
  const [improvements, setImprovements] = useState<string>("");
  const [isImproving, setIsImproving] = useState<boolean>(false);

  // Download State
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [downloadSuccess, setDownloadSuccess] = useState<boolean>(false);

  // 📎 Anlagen State
  interface Attachment {
    id: string;
    name: string;
    size: number;
    type: string;
    base64: string;
    previewUrl?: string;
  }
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState<boolean>(false);
  const attachmentInputRef = useRef<HTMLInputElement>(null);

  // 🎬 Lade-Animation mit Fortschritt
  useEffect(() => {
    if (!isLoading) return;

    let messageIndex = 0;
    let progress = 0;

    const messageInterval = setInterval(() => {
      messageIndex = (messageIndex + 1) % LOADING_MESSAGES.length;
      setLoadingMessage(LOADING_MESSAGES[messageIndex]);
    }, 2000);

    const progressInterval = setInterval(() => {
      progress += Math.random() * 15;
      if (progress > 90) progress = 90; // Max 90% bis wirklich fertig
      setLoadingProgress(progress);
    }, 500);

    return () => {
      clearInterval(messageInterval);
      clearInterval(progressInterval);
    };
  }, [isLoading]);

  // 📄 Vertrag laden - nur einmal! Warten bis AuthContext fertig ist
  useEffect(() => {
    // ⏳ Warten bis AuthContext geladen hat
    if (authLoading) {
      console.log('⏳ Warte auf AuthContext...');
      return;
    }

    if (hasFetched.current) return;

    const token = getToken();
    console.log('🔑 Token Check:', token ? 'vorhanden' : 'FEHLT', 'contractId:', contractId);

    if (!contractId) {
      setError("Keine Contract-ID gefunden");
      setIsLoading(false);
      return;
    }

    if (!token) {
      console.log('⚠️ Kein Token - Redirect zu Login');
      navigate('/login', { state: { from: `/optimizer/finalize/${contractId}` } });
      return;
    }

    hasFetched.current = true;

    const fetchContract = async () => {
      console.log('📄 Lade Vertrag:', contractId);
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`${API_URL}/api/contracts/${contractId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        console.log('📄 Response Status:', response.status);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || `HTTP ${response.status}: Vertrag konnte nicht geladen werden`);
        }

        const data = await response.json();
        console.log('📄 Vertrag geladen:', data.title || 'Ohne Titel');
        console.log('📄 FormData vorhanden:', !!data.formData, data.formData);

        setContractText(data.content || "");
        setContractTitle(data.title || "Optimierter Vertrag");
        setSelectedDesign(data.designVariant || "executive");
        setLoadingProgress(100);

        // 🆕 FormData für Deckblatt speichern (falls vorhanden)
        if (data.formData) {
          setFormData(data.formData);
        } else {
          // Fallback: Aus anderen Feldern zusammenbauen
          setFormData({
            title: data.name || data.title,
            contractType: data.contractType,
            partyA: data.parties?.partyA,
            partyB: data.parties?.partyB,
          });
        }

        // PDF-Vorschau nach kurzer Verzögerung generieren
        setTimeout(() => {
          loadPdfPreview(contractId, data.designVariant || "executive", token);
        }, 300);

      } catch (err) {
        console.error("❌ Fehler beim Laden:", err);
        setError(err instanceof Error ? err.message : "Vertrag konnte nicht geladen werden");
      } finally {
        setIsLoading(false);
      }
    };

    fetchContract();
  }, [contractId, authLoading, navigate]);

  // 📄 PDF-Vorschau laden (separate Funktion, kein useCallback)
  const loadPdfPreview = async (id: string, design: string, token: string) => {
    if (isGeneratingPreview) return;

    console.log('🖼️ Generiere PDF-Vorschau für:', id, 'Design:', design);
    setIsGeneratingPreview(true);

    try {
      const pdfResponse = await fetch(
        `${API_URL}/api/contracts/${id}/pdf-v2?design=${design}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ design }),
        }
      );

      if (!pdfResponse.ok) {
        console.error('❌ PDF-Generierung fehlgeschlagen:', pdfResponse.status);
        return;
      }

      const pdfBlob = await pdfResponse.blob();
      const url = window.URL.createObjectURL(pdfBlob);

      console.log('✅ PDF-Vorschau erstellt');
      setPdfPreviewUrl(url);
    } catch (err) {
      console.error("❌ Fehler bei PDF-Generierung:", err);
    } finally {
      setIsGeneratingPreview(false);
    }
  };

  // 📄 PDF-Vorschau aktualisieren (für Button-Klick)
  const refreshPdfPreview = useCallback(async () => {
    const token = getToken();
    if (!contractId || !token || isGeneratingPreview) return;

    // Alte URL freigeben
    if (pdfPreviewUrl) {
      window.URL.revokeObjectURL(pdfPreviewUrl);
      setPdfPreviewUrl(null);
    }

    setIsGeneratingPreview(true);

    try {
      // Zuerst den Text speichern
      await fetch(`${API_URL}/api/contracts/${contractId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          content: contractText,
          designVariant: selectedDesign,
        }),
      });

      // PDF generieren
      const pdfResponse = await fetch(
        `${API_URL}/api/contracts/${contractId}/pdf-v2?design=${selectedDesign}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ design: selectedDesign }),
        }
      );

      if (pdfResponse.ok) {
        const pdfBlob = await pdfResponse.blob();
        const url = window.URL.createObjectURL(pdfBlob);
        setPdfPreviewUrl(url);
      }
    } catch (err) {
      console.error("Fehler bei PDF-Aktualisierung:", err);
    } finally {
      setIsGeneratingPreview(false);
    }
  }, [contractId, contractText, selectedDesign, pdfPreviewUrl, isGeneratingPreview]);

  // 🎨 Design wechseln
  const handleDesignChange = useCallback(async (designId: string) => {
    const token = getToken();
    if (isChangingDesign || designId === selectedDesign || !token || !contractId) return;

    setIsChangingDesign(true);
    setSelectedDesign(designId);

    // Alte Preview-URL löschen
    if (pdfPreviewUrl) {
      window.URL.revokeObjectURL(pdfPreviewUrl);
      setPdfPreviewUrl(null);
    }

    setIsGeneratingPreview(true);

    try {
      // Design speichern
      await fetch(`${API_URL}/api/contracts/${contractId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ designVariant: designId }),
      });

      // PDF mit neuem Design
      const pdfResponse = await fetch(
        `${API_URL}/api/contracts/${contractId}/pdf-v2?design=${designId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ design: designId }),
        }
      );

      if (pdfResponse.ok) {
        const pdfBlob = await pdfResponse.blob();
        const url = window.URL.createObjectURL(pdfBlob);
        setPdfPreviewUrl(url);
      }
    } catch (err) {
      console.error("Fehler beim Design-Wechsel:", err);
    } finally {
      setIsChangingDesign(false);
      setIsGeneratingPreview(false);
    }
  }, [contractId, selectedDesign, pdfPreviewUrl, isChangingDesign]);

  // ✨ KI-Nachbesserung (mit Deckblatt-Unterstützung!)
  const handleImproveContract = useCallback(async () => {
    const token = getToken();
    if (!improvements.trim() || isImproving || !token || !contractId) return;

    setIsImproving(true);
    console.log('🔄 KI-Verbesserung gestartet:', improvements.trim());
    console.log('📋 Aktuelle FormData:', formData);

    try {
      const response = await fetch(`${API_URL}/api/contracts/improve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          originalContract: contractText,
          improvements: improvements.trim(),
          currentFormData: formData, // 🆕 Deckblatt-Daten mitsenden
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Verbesserung fehlgeschlagen");
      }

      const data = await response.json();
      console.log('✅ KI-Verbesserung Response:', {
        success: data.success,
        hasImprovedContract: !!data.improvedContract,
        improvedLength: data.improvedContract?.length,
        hasFormDataChanges: !!data.formDataChanges, // 🆕
        formDataChanges: data.formDataChanges // 🆕
      });

      if (data.improvedContract) {
        const newContractText = data.improvedContract;

        // 1. State aktualisieren
        setContractText(newContractText);
        setImprovements("");
        setShowImprovementSection(false);

        // 🆕 2. Deckblatt-Änderungen verarbeiten (falls vorhanden)
        let updatedFormData = { ...formData };
        if (data.formDataChanges) {
          updatedFormData = { ...formData, ...data.formDataChanges };
          setFormData(updatedFormData);
          console.log('🎯 Deckblatt-Änderungen angewendet:', data.formDataChanges);

          // Auch Titel aktualisieren wenn geändert
          if (data.formDataChanges.title) {
            setContractTitle(data.formDataChanges.title);
          }
        }

        // 3. Alte Preview-URL freigeben
        if (pdfPreviewUrl) {
          window.URL.revokeObjectURL(pdfPreviewUrl);
          setPdfPreviewUrl(null);
        }

        // 4. WICHTIG: Vertrag in DB speichern UND PDF direkt mit dem neuen Text generieren
        //    (Nicht refreshPdfPreview() aufrufen, da der State noch nicht aktualisiert ist!)
        setIsGeneratingPreview(true);

        try {
          // Erst den neuen Text + FormData in der Datenbank speichern
          await fetch(`${API_URL}/api/contracts/${contractId}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              content: newContractText, // NEUER Text direkt verwenden!
              designVariant: selectedDesign,
              formData: updatedFormData, // 🆕 Deckblatt-Daten mit speichern!
              // Auch Name/Titel aktualisieren wenn geändert
              ...(data.formDataChanges?.title && { name: data.formDataChanges.title }),
            }),
          });
          console.log('💾 Neuer Vertragstext + FormData gespeichert');

          // Dann PDF mit dem neuen Text generieren
          const pdfResponse = await fetch(
            `${API_URL}/api/contracts/${contractId}/pdf-v2?design=${selectedDesign}`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({ design: selectedDesign }),
            }
          );

          if (pdfResponse.ok) {
            const pdfBlob = await pdfResponse.blob();
            const url = window.URL.createObjectURL(pdfBlob);
            setPdfPreviewUrl(url);
            console.log('✅ PDF-Vorschau mit verbessertem Text + Deckblatt erstellt');
          }
        } catch (pdfErr) {
          console.error("Fehler bei PDF nach Verbesserung:", pdfErr);
        } finally {
          setIsGeneratingPreview(false);
        }
      }
    } catch (err) {
      console.error("❌ Fehler bei KI-Verbesserung:", err);
      setError("KI-Verbesserung fehlgeschlagen");
    } finally {
      setIsImproving(false);
    }
  }, [contractId, contractText, improvements, pdfPreviewUrl, isImproving, selectedDesign, formData]);

  // 📎 Anlage hinzufügen
  const handleAttachmentUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploadingAttachment(true);

    try {
      const newAttachments: Attachment[] = [];

      for (const file of Array.from(files)) {
        // Nur PDFs und Bilder erlauben
        if (!file.type.startsWith('application/pdf') && !file.type.startsWith('image/')) {
          console.warn(`Nicht unterstütztes Format: ${file.type}`);
          continue;
        }

        // Max 10MB pro Datei
        if (file.size > 10 * 1024 * 1024) {
          setError(`${file.name} ist zu groß (max. 10MB)`);
          continue;
        }

        // Zu Base64 konvertieren
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        newAttachments.push({
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: file.name,
          size: file.size,
          type: file.type,
          base64,
          previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
        });
      }

      setAttachments(prev => [...prev, ...newAttachments]);
      console.log(`📎 ${newAttachments.length} Anlage(n) hinzugefügt`);

      // PDF-Vorschau aktualisieren mit Anlagen-Info
      if (newAttachments.length > 0) {
        await refreshPdfPreview();
      }
    } catch (err) {
      console.error('Fehler beim Hochladen:', err);
      setError('Anlage konnte nicht hochgeladen werden');
    } finally {
      setIsUploadingAttachment(false);
      // Input zurücksetzen
      if (attachmentInputRef.current) {
        attachmentInputRef.current.value = '';
      }
    }
  }, [refreshPdfPreview]);

  // 📎 Anlage entfernen
  const handleRemoveAttachment = useCallback((attachmentId: string) => {
    setAttachments(prev => {
      const attachment = prev.find(a => a.id === attachmentId);
      if (attachment?.previewUrl) {
        URL.revokeObjectURL(attachment.previewUrl);
      }
      return prev.filter(a => a.id !== attachmentId);
    });
  }, []);

  // 📎 Dateigröße formatieren
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // 📥 PDF Download (mit Anlagen!)
  const handleDownload = useCallback(async () => {
    const token = getToken();
    if (!contractId || !token || isDownloading) return;

    setIsDownloading(true);
    setDownloadSuccess(false);

    try {
      // Text speichern
      await fetch(`${API_URL}/api/contracts/${contractId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          content: contractText,
          designVariant: selectedDesign,
        }),
      });

      // PDF generieren - MIT ANLAGEN wenn vorhanden!
      const endpoint = attachments.length > 0
        ? `${API_URL}/api/contracts/${contractId}/pdf-combined?design=${selectedDesign}`
        : `${API_URL}/api/contracts/${contractId}/pdf-v2?design=${selectedDesign}`;

      const body = attachments.length > 0
        ? {
            design: selectedDesign,
            attachments: attachments.map(a => ({ name: a.name, type: a.type })),
            // Backend erwartet Objekte mit data (ohne data: prefix), type, name
            attachmentFiles: attachments.map(a => ({
              name: a.name,
              type: a.type,
              // Base64 ohne data:...;base64, Prefix extrahieren
              data: a.base64.includes(',') ? a.base64.split(',')[1] : a.base64
            })),
          }
        : { design: selectedDesign };

      console.log(`📥 PDF Download mit ${attachments.length} Anlage(n)...`);

      const pdfResponse = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (!pdfResponse.ok) {
        throw new Error("PDF konnte nicht erstellt werden");
      }

      const pdfBlob = await pdfResponse.blob();
      const url = window.URL.createObjectURL(pdfBlob);

      // Download triggern
      const link = document.createElement("a");
      link.href = url;
      const suffix = attachments.length > 0 ? '_mit_anlagen' : '';
      link.download = `${contractTitle.replace(/[^a-zA-Z0-9äöüÄÖÜß\s-]/g, "")}_${selectedDesign}${suffix}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    } catch (err) {
      console.error("Fehler beim Download:", err);
      setError("Download fehlgeschlagen");
    } finally {
      setIsDownloading(false);
    }
  }, [contractId, contractText, selectedDesign, contractTitle, isDownloading, attachments]);

  // 🔙 Zurück zum Optimizer (mit gespeicherten Optimierungen)
  const handleBack = () => navigate(`/optimize/${contractId}`);

  // Cleanup
  useEffect(() => {
    return () => {
      if (pdfPreviewUrl) {
        window.URL.revokeObjectURL(pdfPreviewUrl);
      }
    };
  }, [pdfPreviewUrl]);

  // 🎬 SCHÖNE LADE-ANIMATION
  if (isLoading) {
    return (
      <>
        <Helmet>
          <title>Vertrag wird geladen... | Contract AI</title>
        </Helmet>
        <div className={styles.contractGenerator}>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '70vh',
            gap: '2rem',
            padding: '2rem'
          }}>
            {/* Animiertes Icon */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
              style={{
                width: '120px',
                height: '120px',
                borderRadius: '24px',
                background: 'linear-gradient(135deg, #2E6CF6 0%, #1E53D8 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 20px 60px rgba(46, 108, 246, 0.3)'
              }}
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              >
                <Wand2 size={48} color="white" />
              </motion.div>
            </motion.div>

            {/* Text */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              style={{ textAlign: 'center' }}
            >
              <h2 style={{
                fontSize: '1.75rem',
                fontWeight: 600,
                color: '#0B1324',
                marginBottom: '0.5rem'
              }}>
                Dein Vertrag wird vorbereitet
              </h2>
              <motion.p
                key={loadingMessage}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                style={{
                  fontSize: '1rem',
                  color: '#667085',
                  marginTop: '0.5rem'
                }}
              >
                {loadingMessage}
              </motion.p>
            </motion.div>

            {/* Progress Bar */}
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: '300px', opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              style={{
                height: '6px',
                background: '#E5E7EB',
                borderRadius: '3px',
                overflow: 'hidden'
              }}
            >
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${loadingProgress}%` }}
                transition={{ duration: 0.3 }}
                style={{
                  height: '100%',
                  background: 'linear-gradient(90deg, #2E6CF6 0%, #1E53D8 100%)',
                  borderRadius: '3px'
                }}
              />
            </motion.div>

            {/* Floating Icons Animation */}
            <div style={{ position: 'relative', width: '200px', height: '60px' }}>
              {[FileText, FileCheck, Sparkles].map((Icon, i) => (
                <motion.div
                  key={i}
                  initial={{ y: 0, opacity: 0.3 }}
                  animate={{
                    y: [-5, 5, -5],
                    opacity: [0.3, 0.7, 0.3]
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    delay: i * 0.3
                  }}
                  style={{
                    position: 'absolute',
                    left: `${i * 80 + 20}px`,
                    top: '20px'
                  }}
                >
                  <Icon size={24} color="#2E6CF6" />
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </>
    );
  }

  // Error State
  if (error && !contractText) {
    return (
      <div className={styles.contractGenerator}>
        <div className={styles.step3ContainerNew}>
          <motion.div
            className={styles.step3Error}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              flexDirection: 'column',
              alignItems: 'center',
              padding: '3rem',
              textAlign: 'center'
            }}
          >
            <X size={48} style={{ marginBottom: '1rem', color: '#DC2626' }} />
            <h3 style={{ marginBottom: '0.5rem', fontSize: '1.25rem' }}>Fehler beim Laden</h3>
            <p style={{ marginBottom: '1.5rem', color: '#667085' }}>{error}</p>
            <button
              onClick={handleBack}
              style={{
                padding: '0.75rem 1.5rem',
                background: '#0B1324',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                cursor: 'pointer',
                fontWeight: 500
              }}
            >
              Zurück zur Übersicht
            </button>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Vertrag finalisieren | Contract AI</title>
        <meta name="description" content="Finalisieren Sie Ihren optimierten Vertrag." />
      </Helmet>

      <div className={styles.contractGenerator}>
        <div className={styles.step3ContainerNew}>
          {/* Success Header */}
          <div className={styles.step3SuccessHeader}>
            <div className={styles.step3SuccessLeft}>
              <div className={styles.step3SuccessIcon}>
                <CheckCircle size={24} />
              </div>
              <div className={styles.step3SuccessText}>
                <h2>{contractTitle}</h2>
                <p>Bearbeiten, Design wählen und herunterladen</p>
              </div>
            </div>
            <div className={styles.step3SuccessActions}>
              <motion.button
                onClick={handleBack}
                className={styles.step3HeaderBtn}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <ArrowLeftCircle size={16} />
                <span>Zurück</span>
              </motion.button>
              <motion.button
                onClick={handleDownload}
                disabled={isDownloading || !contractText}
                className={`${styles.step3HeaderBtn} ${downloadSuccess ? styles.success : styles.primary}`}
                whileHover={!isDownloading ? { scale: 1.02 } : {}}
                whileTap={!isDownloading ? { scale: 0.98 } : {}}
              >
                {isDownloading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : downloadSuccess ? (
                  <Check size={16} />
                ) : (
                  <Download size={16} />
                )}
                <span>{downloadSuccess ? "Heruntergeladen!" : "PDF herunterladen"}</span>
              </motion.button>
            </div>
          </div>

          {/* Error Display */}
          <AnimatePresence>
            {error && (
              <motion.div
                className={styles.step3Error}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <span>{error}</span>
                <button onClick={() => setError(null)}>
                  <X size={14} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Two Column Layout */}
          <div className={styles.step3TwoColumn}>
            {/* Left Column */}
            <div className={styles.step3LeftColumn}>
              {/* Design Carousel */}
              <div className={styles.step3DesignCompact}>
                <div className={styles.step3DesignHeader}>
                  <span><Sparkles size={16} /> Design</span>
                  <div className={styles.designHeaderRight}>
                    <span className={styles.designCount}>{DESIGN_VARIANTS.length} Varianten</span>
                  </div>
                </div>
                <div className={styles.step3DesignCarousel}>
                  <button
                    className={styles.carouselArrow}
                    onClick={() => setDesignCarouselIndex(Math.max(0, designCarouselIndex - 1))}
                    disabled={designCarouselIndex === 0 || isChangingDesign}
                  >
                    <ArrowLeft size={16} />
                  </button>
                  <div className={styles.step3DesignOptions}>
                    {DESIGN_VARIANTS
                      .slice(designCarouselIndex, designCarouselIndex + VISIBLE_DESIGNS)
                      .map((design) => (
                        <motion.button
                          key={design.id}
                          className={`${styles.step3DesignOption} ${selectedDesign === design.id ? styles.active : ''}`}
                          onClick={() => handleDesignChange(design.id)}
                          disabled={isChangingDesign}
                          whileHover={!isChangingDesign ? { scale: 1.03 } : {}}
                          whileTap={!isChangingDesign ? { scale: 0.97 } : {}}
                          data-design={design.id}
                        >
                          <div className={styles.step3DesignPreview} style={{ background: design.color }}>
                            <div className={styles.previewLines}>
                              <div className={styles.pLine}></div>
                              <div className={styles.pLine}></div>
                              <div className={styles.pLine}></div>
                            </div>
                          </div>
                          <span>{design.name}</span>
                          {selectedDesign === design.id && (
                            <div className={styles.step3DesignCheck}>
                              <Check size={10} />
                            </div>
                          )}
                        </motion.button>
                      ))}
                  </div>
                  <button
                    className={styles.carouselArrow}
                    onClick={() => setDesignCarouselIndex(Math.min(DESIGN_VARIANTS.length - VISIBLE_DESIGNS, designCarouselIndex + 1))}
                    disabled={designCarouselIndex >= DESIGN_VARIANTS.length - VISIBLE_DESIGNS || isChangingDesign}
                  >
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>

              {/* Text Editor */}
              <div className={styles.step3EditorPanel}>
                <div className={styles.step3EditorHeader}>
                  <div className={styles.step3EditorTitle}>
                    <Edit3 size={16} />
                    <span>Vertragstext bearbeiten</span>
                  </div>
                  <div className={styles.step3EditorActions}>
                    {!showImprovementSection && (
                      <button
                        className={styles.step3EditorBtn}
                        onClick={() => setShowImprovementSection(true)}
                        disabled={isImproving}
                      >
                        <Sparkles size={14} />
                        KI verbessern
                      </button>
                    )}
                    <motion.button
                      className={`${styles.step3EditorBtn} ${styles.primary}`}
                      onClick={refreshPdfPreview}
                      disabled={isGeneratingPreview || !contractText}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {isGeneratingPreview ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <RefreshCw size={14} />
                      )}
                      PDF aktualisieren
                    </motion.button>
                  </div>
                </div>

                {/* KI Improvement */}
                <AnimatePresence>
                  {showImprovementSection && (
                    <motion.div
                      className={styles.step3ImprovementBar}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                    >
                      <textarea
                        value={improvements}
                        onChange={(e) => setImprovements(e.target.value)}
                        placeholder="Änderungswünsche eingeben, z.B.: Zahlungsfrist auf 30 Tage ändern..."
                        disabled={isImproving}
                        rows={2}
                      />
                      <div className={styles.step3ImprovementActions}>
                        <button onClick={() => { setShowImprovementSection(false); setImprovements(""); }} disabled={isImproving}>
                          Abbrechen
                        </button>
                        <button
                          className={styles.primary}
                          onClick={handleImproveContract}
                          disabled={isImproving || !improvements.trim()}
                        >
                          {isImproving ? (
                            <>
                              <Loader2 size={14} className="animate-spin" />
                              Verbessere...
                            </>
                          ) : (
                            <>
                              <Sparkles size={14} />
                              Anwenden
                            </>
                          )}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className={styles.step3EditorContent}>
                  <textarea
                    value={contractText}
                    onChange={(e) => {
                      setContractText(e.target.value);
                      if (pdfPreviewUrl) {
                        window.URL.revokeObjectURL(pdfPreviewUrl);
                        setPdfPreviewUrl(null);
                      }
                    }}
                    placeholder="Vertragstext..."
                  />
                </div>
              </div>

              {/* 📎 Anlagen-Bereich */}
              <div className={styles.step3EditorPanel} style={{ marginTop: '1rem' }}>
                <div className={styles.step3EditorHeader}>
                  <div className={styles.step3EditorTitle}>
                    <Paperclip size={16} />
                    <span>Anlagen ({attachments.length})</span>
                  </div>
                  <div className={styles.step3EditorActions}>
                    <input
                      type="file"
                      ref={attachmentInputRef}
                      onChange={handleAttachmentUpload}
                      accept=".pdf,image/*"
                      multiple
                      style={{ display: 'none' }}
                    />
                    <motion.button
                      className={`${styles.step3EditorBtn} ${styles.primary}`}
                      onClick={() => attachmentInputRef.current?.click()}
                      disabled={isUploadingAttachment}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {isUploadingAttachment ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Plus size={14} />
                      )}
                      Anlage hinzufügen
                    </motion.button>
                  </div>
                </div>

                {/* Anlagen-Liste */}
                <div style={{
                  padding: '1rem',
                  background: '#F9FAFB',
                  borderRadius: '0 0 12px 12px',
                  minHeight: '80px'
                }}>
                  {attachments.length === 0 ? (
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '1.5rem',
                      color: '#9CA3AF',
                      textAlign: 'center'
                    }}>
                      <Paperclip size={24} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
                      <span style={{ fontSize: '0.875rem' }}>
                        Keine Anlagen hinzugefügt
                      </span>
                      <span style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>
                        PDF & Bilder werden nahtlos an den Vertrag angehängt
                      </span>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {attachments.map((attachment) => (
                        <motion.div
                          key={attachment.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 10 }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '0.75rem',
                            background: 'white',
                            borderRadius: '8px',
                            border: '1px solid #E5E7EB',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            {/* Icon oder Vorschau */}
                            {attachment.previewUrl ? (
                              <img
                                src={attachment.previewUrl}
                                alt={attachment.name}
                                style={{
                                  width: '36px',
                                  height: '36px',
                                  objectFit: 'cover',
                                  borderRadius: '4px',
                                  border: '1px solid #E5E7EB'
                                }}
                              />
                            ) : (
                              <div style={{
                                width: '36px',
                                height: '36px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: '#EEF2FF',
                                borderRadius: '4px',
                                color: '#6366F1'
                              }}>
                                <File size={18} />
                              </div>
                            )}
                            <div>
                              <div style={{
                                fontSize: '0.875rem',
                                fontWeight: 500,
                                color: '#1F2937',
                                maxWidth: '200px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}>
                                {attachment.name}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>
                                {formatFileSize(attachment.size)}
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => handleRemoveAttachment(attachment.id)}
                            style={{
                              padding: '0.5rem',
                              background: 'transparent',
                              border: 'none',
                              borderRadius: '6px',
                              color: '#9CA3AF',
                              cursor: 'pointer',
                              transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = '#FEE2E2';
                              e.currentTarget.style.color = '#DC2626';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'transparent';
                              e.currentTarget.style.color = '#9CA3AF';
                            }}
                          >
                            <Trash2 size={16} />
                          </button>
                        </motion.div>
                      ))}

                      {/* Info-Box wenn Anlagen vorhanden */}
                      <div style={{
                        marginTop: '0.5rem',
                        padding: '0.75rem',
                        background: '#EEF2FF',
                        borderRadius: '8px',
                        fontSize: '0.75rem',
                        color: '#4F46E5',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}>
                        <FileCheck size={14} />
                        <span>
                          {attachments.length} Anlage{attachments.length !== 1 ? 'n' : ''} werden beim Download an das PDF angehängt
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: PDF Preview */}
            <div className={styles.step3RightColumn}>
              <div className={styles.step3PdfPanel}>
                <div className={styles.step3PdfHeader}>
                  <span>
                    <FileText size={16} />
                    PDF-Vorschau
                  </span>
                </div>
                <div className={styles.step3PdfContent}>
                  {isGeneratingPreview ? (
                    <div className={styles.step3PdfLoading}>
                      <Loader2 size={32} className="animate-spin" style={{ color: '#2E6CF6' }} />
                      <p>PDF wird generiert...</p>
                    </div>
                  ) : pdfPreviewUrl ? (
                    <iframe
                      src={pdfPreviewUrl}
                      title="PDF Vorschau"
                    />
                  ) : (
                    <div className={styles.step3PdfEmpty}>
                      <FileText size={32} />
                      <p>Keine Vorschau verfügbar</p>
                      <button onClick={refreshPdfPreview}>
                        <RefreshCw size={14} />
                        Vorschau laden
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
