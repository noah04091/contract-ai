// 📁 src/utils/api.ts - FIXED: PDF-Fehlermeldungen + Duplikat-Handling (NO extractExistingContract)
const API_BASE_URL = "/api"; // Proxy-Pfad für Vercel & devServer (für API-Calls)

// ✅ NEU: Separate Backend-URL für File-Downloads (absolute URLs)
const BACKEND_API_URL = process.env.NODE_ENV === 'production' 
  ? 'https://api.contract-ai.de'  // ✅ ANPASSEN: Deine Backend-Domain
  : 'http://localhost:5000';      // ✅ ANPASSEN: Dein Backend-Port

/**
 * Type Guard um zu prüfen ob etwas ein Error ist
 */
function isError(error: unknown): error is Error {
  return error instanceof Error;
}

/**
 * Helper um einen Error-String aus unknown zu extrahieren
 */
function getErrorMessage(error: unknown): string {
  if (isError(error)) {
    return error.message;
  }
  return String(error);
}

// ✅ ENHANCED: Interface für Contract mit S3-Informationen + Upload-Type
interface ContractFile {
  filename?: string;
  originalname?: string;
  fileUrl?: string;
  filePath?: string;
  s3Key?: string;      // ✅ S3-Key
  s3Bucket?: string;   // ✅ S3-Bucket
  s3Location?: string; // ✅ S3-Location
  uploadType?: string; // ✅ CRITICAL: Upload-Type (LOCAL_UPLOAD, S3_UPLOAD)
  extraRefs?: {        // ✅ Extra-Referenzen
    uploadType?: string;
    analysisId?: string;
    serverPath?: string;
    [key: string]: unknown;
  };
}

// ✅ FIXED: Interface für Analyse-Ergebnisse mit vollständiger Duplikat-Unterstützung
interface AnalysisResult {
  success: boolean;
  contractId?: string;
  message?: string;
  duplicate?: boolean;
  error?: string;
  existingContract?: ContractFile; // ✅ WICHTIG: Für Duplikat-Modal
  analysisData?: {
    kuendigung?: string;
    laufzeit?: string;
    expiryDate?: string;
    status?: string;
    risiken?: string[];
    optimierungen?: string[];
  };
}

/**
 * ✅ ENHANCED: Generiert absolute File-URLs für Contract-Dateien mit LOCAL vs S3 Support
 * Vermeidet React-Router-Interferenz durch absolute Backend-URLs
 * 🔧 INTELLIGENT: Unterscheidet zwischen lokalen und S3 Uploads basierend auf uploadType
 */
export const getContractFileUrl = (contract: ContractFile): string | null => {
  // ✅ SAFETY: Null/undefined Check für contract
  if (!contract) {
    console.warn('⚠️ getContractFileUrl: contract ist null oder undefined');
    return null;
  }

  console.log('🔍 Contract File URL Debug (Enhanced Local vs S3):', {
    contractData: contract,
    hasFileUrl: !!contract.fileUrl,
    hasS3Key: !!contract.s3Key,
    hasFilename: !!contract.filename,
    hasOriginalname: !!contract.originalname,
    hasFilePath: !!contract.filePath,
    filePath: contract.filePath,
    uploadType: contract.uploadType || contract.extraRefs?.uploadType || 'unknown',
    backendUrl: BACKEND_API_URL
  });

  // ✅ PRIORITÄT 1: UPLOAD-TYPE basierte Entscheidung (MOST RELIABLE)
  const uploadType = contract.uploadType || contract.extraRefs?.uploadType;
  
  if (uploadType === 'LOCAL_UPLOAD') {
    console.log('🔧 LOCAL_UPLOAD detected - using backend URL');
    
    // Für lokale Uploads: Verwende filename aus verschiedenen Quellen
    let filename = contract.filename;
    if (!filename && contract.filePath) {
      // Extrahiere filename aus filePath wenn nötig
      filename = contract.filePath.replace('/uploads/', '');
    }
    if (!filename) {
      filename = contract.originalname;
    }
    
    if (filename) {
      const localUrl = `${BACKEND_API_URL}/uploads/${filename}`;
      console.log('✅ LOCAL_UPLOAD: Generated backend URL:', localUrl);
      return localUrl;
    }
  }
  
  if (uploadType === 'S3_UPLOAD' || contract.s3Key) {
    console.log('🔧 S3_UPLOAD detected - using S3 signed URL');
    
    const s3Key = contract.s3Key || (contract.filePath ? contract.filePath.replace('/s3/', '') : null);
    // ✅ SAFETY: S3-Key Validierung
    if (s3Key && s3Key.trim().length > 0) {
      const s3ViewUrl = `${API_BASE_URL}/s3/view?file=${encodeURIComponent(s3Key)}`;
      console.log('✅ S3_UPLOAD: Generated S3 URL:', s3ViewUrl);
      return s3ViewUrl;
    } else {
      console.warn('⚠️ S3_UPLOAD detected but s3Key is empty or invalid:', s3Key);
    }
  }

  // ✅ PRIORITÄT 2: Expliziter S3-Key → S3 Signed URL
  if (contract.s3Key && contract.s3Key.trim().length > 0) {
    const s3ViewUrl = `${API_BASE_URL}/s3/view?file=${encodeURIComponent(contract.s3Key)}`;
    console.log('✅ Using S3 signed URL endpoint (explicit s3Key):', s3ViewUrl);
    return s3ViewUrl;
  }

  // ✅ PRIORITÄT 3: Bestehende fileUrl (falls absolute URL)
  if (contract.fileUrl && contract.fileUrl.startsWith('http')) {
    // ✅ SAFETY: URL Validierung
    try {
      new URL(contract.fileUrl); // Wirft Error wenn URL ungültig ist
      console.log('✅ Using existing absolute fileUrl:', contract.fileUrl);
      return contract.fileUrl;
    } catch (error) {
      console.warn('⚠️ Invalid fileUrl detected:', contract.fileUrl, error);
    }
  }
  
  // ✅ PRIORITÄT 4: filePath Analysis für Legacy-Support
  if (contract.filePath) {
    if (contract.filePath.startsWith('/uploads/')) {
      // Lokaler Upload-Pfad erkannt
      const fileKey = contract.filePath.replace('/uploads/', '');
      
      // ENHANCED LOGIC: Bessere Heuristik für Local vs S3
      const isLikelyLocalFile = (
        fileKey.includes('.') ||                    // Hat Dateiendung
        fileKey.length < 30 ||                      // Kurzer Name
        /^\d+/.test(fileKey)                        // Beginnt mit Timestamp
      );
      
      if (isLikelyLocalFile) {
        const localUrl = `${BACKEND_API_URL}/uploads/${fileKey}`;
        console.log('🔧 LOCAL FILE detected from filePath:', localUrl);
        return localUrl;
      } else {
        // Wahrscheinlich S3-Key
        const s3ViewUrl = `${API_BASE_URL}/s3/view?file=${fileKey}`;
        console.log('🔧 S3 KEY detected from filePath:', s3ViewUrl);
        return s3ViewUrl;
      }
    }
    
    if (contract.filePath.startsWith('/s3/')) {
      // S3-Pfad erkannt
      const s3Key = contract.filePath.replace('/s3/', '');
      const s3ViewUrl = `${API_BASE_URL}/s3/view?file=${s3Key}`;
      console.log('✅ S3 path detected:', s3ViewUrl);
      return s3ViewUrl;
    }

    if (contract.filePath.startsWith('http')) {
      console.log('✅ Using absolute filePath:', contract.filePath);
      return contract.filePath;
    }
    
    // Relative filePath in absolute URL umwandeln
    const fileUrl = `${BACKEND_API_URL}${contract.filePath}`;
    console.log('✅ Generated file URL from relative filePath:', fileUrl);
    return fileUrl;
  }
  
  // ✅ PRIORITÄT 5: filename aus verschiedenen Quellen (Legacy Support)
  const filename = contract.filename || contract.originalname;
  if (filename) {
    // ENHANCED LOGIC: Bessere Heuristik für filename
    const isLikelyLocalFile = (
      filename.includes('.') ||                     // Hat Dateiendung
      filename.length < 30 ||                       // Kurzer Name
      /^\d+/.test(filename)                         // Beginnt mit Timestamp
    );
    
    if (isLikelyLocalFile) {
      const localUrl = `${BACKEND_API_URL}/uploads/${filename}`;
      console.log('✅ LOCAL filename detected:', localUrl);
      return localUrl;
    } else {
      // Wahrscheinlich S3-Key
      const s3ViewUrl = `${API_BASE_URL}/s3/view?file=${filename}`;
      console.log('✅ S3 filename detected:', s3ViewUrl);
      return s3ViewUrl;
    }
  }
  
  // ✅ SAFETY: Detaillierte Fallback-Informationen
  console.warn('⚠️ No valid file URL found for contract:', {
    availableFields: {
      hasFileUrl: !!contract.fileUrl,
      hasS3Key: !!contract.s3Key,
      hasFilename: !!contract.filename,
      hasOriginalname: !!contract.originalname,
      hasFilePath: !!contract.filePath,
      uploadType: contract.uploadType || contract.extraRefs?.uploadType || 'not set'
    }
  });
  return null;
};

/**
 * ✅ NEU: Direkte S3 Signed URL abrufen (für Contract mit S3Key)
 */
export const getS3SignedUrl = async (s3Key: string): Promise<string | null> => {
  try {
    const response = await apiCall(`/s3/view?file=${s3Key}`);
    const data = response as { fileUrl: string; expiresIn: number; s3Key: string };
    
    console.log(`✅ S3 signed URL retrieved: expires in ${data.expiresIn}s`);
    return data.fileUrl;
  } catch (error) {
    console.error('❌ Failed to get S3 signed URL:', error);
    return null;
  }
};

/**
 * ✅ NEU: Test-Funktion für File-URL-Verfügbarkeit
 */
export const checkFileAvailability = async (fileUrl: string): Promise<boolean> => {
  try {
    const response = await fetch(fileUrl, { method: 'HEAD' });
    const available = response.ok;
    console.log(`📁 File availability check: ${fileUrl} - ${available ? 'Available' : 'Not available'}`);
    return available;
  } catch (error) {
    console.error('❌ File availability check failed:', error);
    return false;
  }
};

// ✅ FIXED: Interface für Duplikat-Error-Response (erweitert für existingContract)
interface DuplicateError {
  status: 409;
  duplicate: true;
  data: Record<string, unknown> | null;
}

// ✅ FIXED: Interface für Error-Objects mit Status
interface ErrorWithStatus {
  status: number;
  duplicate?: boolean;
  data?: unknown;
  [key: string]: unknown;
}

/**
 * ✅ FIXED: Type Guard für Duplikat-Error (robust)
 */
function isDuplicateError(error: unknown): error is DuplicateError {
  if (!error || typeof error !== 'object') {
    return false;
  }
  
  const errorObj = error as ErrorWithStatus;
  
  return (
    'status' in errorObj &&
    errorObj.status === 409 &&
    ('duplicate' in errorObj ? errorObj.duplicate === true : true)
  );
}

/**
 * ✅ Helper um zu prüfen ob eine Fehlermeldung bereits benutzerfreundlich ist
 */
function isUserFriendlyError(message: string): boolean {
  const userFriendlyMarkers = [
    '📸', '📄', '🔄', '📊', '⏱️', '🔧', // Emojis aus Backend
    'Diese PDF scheint gescannt zu sein',
    'PDF enthält nur Bilddaten',
    'Konvertiere die PDF zu einem durchsuchbaren Format',
    'Öffne das Dokument in Word',
    'automatische Scan-Erkennung',
    'Probiere eine textbasierte PDF',
    'Verwende einen PDF-zu-Text-Konverter'
  ];
  
  return userFriendlyMarkers.some(marker => message.includes(marker));
}

/**
 * Sleep-Funktion für Retry-Logic
 */
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Universelle API-Fetch-Funktion mit verbesserter Fehlerbehandlung & Retry
 * ✅ WICHTIG: Verwendet relativen API_BASE_URL für API-Calls (nicht für Files!)
 */
export const apiCall = async (
  endpoint: string,
  options: RequestInit = {},
  retryCount: number = 0
): Promise<unknown> => {
  const authToken = localStorage.getItem("authToken");
  const isFormData = options.body instanceof FormData;
  const maxRetries = 2;

  const defaultHeaders: Record<string, string> = {
    Accept: "application/json",
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...(authToken && !(options.headers && "Authorization" in options.headers)
      ? { Authorization: `Bearer ${authToken}` }
      : {}),
  };

  const mergedOptions: RequestInit = {
    credentials: "include",
    ...options,
    headers: {
      ...defaultHeaders,
      ...(options.headers as Record<string, string> || {}),
    },
  };

  try {
    const retryInfo = retryCount > 0 ? ` (Retry ${retryCount}/${maxRetries})` : '';
    console.log(`🔄 API-Request: ${options.method || 'GET'} ${API_BASE_URL}${endpoint}${retryInfo}`);
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, mergedOptions);

    // 🔍 Enhanced Debugging
    console.log(`📡 API-Response: ${response.status} ${response.statusText}${retryInfo}`, {
      url: `${API_BASE_URL}${endpoint}`,
      headers: Object.fromEntries(response.headers.entries()),
      ok: response.ok
    });

    // ✅ Prüfe Content-Type für bessere Fehlermeldungen
    const contentType = response.headers.get("content-type");
    const isJsonResponse = contentType?.includes("application/json");
    
    if (!response.ok) {
      let errorMessage = `❌ HTTP ${response.status} ${response.statusText}`;
      let shouldRetry = false;
      
      if (isJsonResponse) {
        try {
          const errorData: Record<string, unknown> = await response.json();
          if (errorData?.message && typeof errorData.message === 'string') {
            errorMessage = errorData.message;
          }
          
          // ✅ FIXED: Für 409 (Conflict/Duplikat) spezielle Behandlung mit vollständigen Daten
          if (response.status === 409) {
            console.log("🔄 409 Conflict erkannt - Duplikat-Daten:", errorData);
            
            // ✅ CRITICAL: Korrekte Duplikat-Error-Struktur mit vollständigen Daten
            const duplicateError: DuplicateError = { 
              status: 409, 
              duplicate: true, 
              data: errorData  // ✅ Vollständige Backend-Response-Daten
            };
            throw duplicateError;
          }
          
          // Prüfe ob Retry sinnvoll ist
          if (response.status >= 500 && response.status < 600) {
            shouldRetry = true;
          }
        } catch (parseError) {
          // ✅ FIXED: Auch bei Parse-Fehlern 409 korrekt behandeln
          if (response.status === 409) {
            console.log("🔄 409 Conflict ohne JSON - Fallback Duplikat-Error");
            const duplicateError: DuplicateError = { 
              status: 409, 
              duplicate: true, 
              data: { message: "Duplikat erkannt", duplicate: true }
            };
            throw duplicateError;
          }
          
          console.warn("⚠️ Konnte JSON-Error nicht parsen:", parseError);
          shouldRetry = response.status >= 500;
        }
      } else {
        // HTML oder andere Responses
        const textResponse = await response.text();
        console.error("❌ Nicht-JSON Response erhalten:", textResponse.substring(0, 200));
        
        // ✅ FIXED: Auch Text-Responses auf 409 prüfen
        if (response.status === 409) {
          console.log("🔄 409 Conflict (Text-Response) - Fallback Duplikat-Error");
          const duplicateError: DuplicateError = { 
            status: 409, 
            duplicate: true, 
            data: { message: "Duplikat erkannt", duplicate: true }
          };
          throw duplicateError;
        }
        
        if (response.status === 404) {
          errorMessage = `❌ API-Endpoint nicht gefunden: ${endpoint}`;
        } else if (response.status >= 500) {
          errorMessage = `❌ Server-Fehler bei ${endpoint}`;
          shouldRetry = true;
        } else {
          errorMessage = `❌ Unerwarteter Fehler (${response.status}) bei ${endpoint}`;
        }
      }
      
      // ✅ RETRY-LOGIC für 500er-Fehler
      if (shouldRetry && retryCount < maxRetries) {
        const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff: 1s, 2s, 4s
        console.log(`🔄 Retrying in ${delay}ms due to server error...`);
        await sleep(delay);
        return apiCall(endpoint, options, retryCount + 1);
      }
      
      throw new Error(errorMessage);
    }

    // ✅ Response verarbeiten
    if (isJsonResponse) {
      try {
        return await response.json();
      } catch (jsonError) {
        console.error("❌ JSON-Parse-Fehler:", jsonError);
        throw new Error("❌ Server-Response konnte nicht als JSON geparst werden");
      }
    } else {
      // Nicht-JSON Response (z.B. Datei-Download)
      return await response.text();
    }

  } catch (err) {
    console.error(`❌ API-Fehler bei [${endpoint}] (Attempt ${retryCount + 1}):`, err);
    
    // ✅ FIXED: TypeScript-sicheres Spezial-Handling für Duplikat-Response
    if (isDuplicateError(err)) {
      console.log("🔄 Duplikat-Error erkannt in apiCall");
      throw err; // Duplikat-Error direkt weiterleiten
    }
    
    // ✅ FIXED: TypeScript-sichere Fehlerbehandlung
    const errorMessage = getErrorMessage(err);
    
    // ✅ Network-Fehler Retry-Logic
    if (isError(err) && err instanceof TypeError && errorMessage.includes('Failed to fetch')) {
      if (retryCount < maxRetries) {
        const delay = Math.pow(2, retryCount) * 1000;
        console.log(`🔄 Network error - retrying in ${delay}ms...`);
        await sleep(delay);
        return apiCall(endpoint, options, retryCount + 1);
      } else {
        throw new Error("❌ Netzwerk-Fehler: Server nicht erreichbar (nach mehreren Versuchen)");
      }
    }
    
    // ✅ Spezifische Fehlermeldungen für verschiedene Szenarien
    if (errorMessage.includes('Unexpected token')) {
      throw new Error("❌ Server-Fehler: Unerwartete Antwort (möglicherweise ist die API offline)");
    }
    
    throw err;
  }
};

/**
 * ✅ FIXED: Spezielle Funktion für File-Upload mit Analyse - ROBUSTE DUPLIKAT-BEHANDLUNG + KORREKTE PDF-FEHLER
 */
export const uploadAndAnalyze = async (
  file: File, 
  onProgress?: (progress: number) => void,
  forceReanalyze: boolean = false // ✅ NEU: Parameter für Re-Analyse
): Promise<unknown> => {
  const formData = new FormData();
  formData.append('file', file);
  
  // ✅ NEU: forceReanalyze Parameter hinzufügen
  if (forceReanalyze) {
    formData.append('forceReanalyze', 'true');
    console.log(`🔄 Upload & Analyze mit Force-Reanalyze: ${file.name}`);
  } else {
    console.log(`📤 Upload & Analyze: ${file.name} (${file.size} bytes)`);
  }

  // ✅ Progress-Simulation (da FormData keinen echten Progress hat)
  if (onProgress) {
    onProgress(10); // Start
  }

  try {
    if (onProgress) onProgress(30); // PDF wird gelesen
    
    const result = await apiCall('/analyze', {
      method: 'POST',
      body: formData,
    });
    
    if (onProgress) onProgress(100); // Fertig
    
    console.log("✅ Analyse erfolgreich:", result);
    return result;
    
  } catch (error) {
    if (onProgress) onProgress(0); // Reset bei Fehler
    
    // ✅ FIXED: Robustes Spezial-Handling für Duplikat-Response mit vollständigen Daten
    if (isDuplicateError(error)) {
      console.log("🔄 Duplikat erkannt in uploadAndAnalyze - gebe vollständige Daten weiter");
      
      // ✅ CRITICAL: Korrekte Daten-Weiterleitung mit existingContract
      if (error.data && typeof error.data === 'object') {
        console.log("✅ Duplikat-Daten gefunden:", error.data);
        
        // ✅ CRITICAL: Stelle sicher, dass duplicate Flag gesetzt ist
        const duplicateResult = {
          ...error.data,
          success: false,
          duplicate: true
          // ✅ existingContract kommt direkt vom Backend (spread operator übernimmt alle Felder)
        };
        
        console.log("🔄 Verarbeitete Duplikat-Daten:", duplicateResult);
        return duplicateResult;
      } else {
        console.warn("⚠️ Duplikat-Error ohne Daten - erstelle Fallback");
        // Fallback für Duplikat ohne vollständige Daten
        return {
          success: false,
          duplicate: true,
          message: "📄 Dieser Vertrag wurde bereits hochgeladen.",
          error: "DUPLICATE_CONTRACT",
          contractId: "unknown",
          contractName: file.name,
          uploadedAt: new Date().toISOString(),
          existingContract: null, // ✅ Explizit null setzen
          actions: {
            reanalyze: "Erneut analysieren",
            viewExisting: "Bestehenden Vertrag öffnen"
          }
        };
      }
    }
    
    console.error("❌ Upload & Analyze Fehler:", error);
    
    // ✅ FIXED: TypeScript-sichere Fehlerbehandlung
    const errorMessage = getErrorMessage(error);
    
    // ✅ CRITICAL FIX: Benutzerfreundliche Backend-Fehlermeldungen NICHT überschreiben
    if (isUserFriendlyError(errorMessage)) {
      console.log("✅ Benutzerfreundliche Backend-Fehlermeldung erkannt - direkt weiterleiten:", errorMessage);
      throw new Error(errorMessage); // ✅ Backend-Meldung direkt verwenden
    }
    
    // ✅ Fallback-Fehlermeldungen nur für technische/unspezifische Fehler
    if (errorMessage.includes('nicht gefunden') || errorMessage.includes('404')) {
      throw new Error("❌ Analyse-Service ist derzeit nicht verfügbar. Bitte kontaktiere den Support.");
    }
    
    if (errorMessage.includes('Server-Fehler') || errorMessage.includes('500')) {
      throw new Error("❌ Fehler bei der Vertragsanalyse. Bitte versuche es später erneut.");
    }
    
    if (errorMessage.includes('Limit erreicht')) {
      throw new Error("📊 Analyse-Limit erreicht. Bitte upgrade dein Paket für weitere Analysen.");
    }
    
    if (errorMessage.includes('Timeout')) {
      throw new Error("⏱️ Analyse-Timeout. Bitte versuche es mit einer kleineren PDF-Datei.");
    }
    
    // ✅ FIXED: Generic PDF-Fehler nur wenn KEINE benutzerfreundliche Meldung vom Backend kommt
    if ((errorMessage.includes('PDF') || errorMessage.includes('Datei')) && !isUserFriendlyError(errorMessage)) {
      throw new Error("📄 PDF-Datei konnte nicht verarbeitet werden. Bitte prüfe das Dateiformat.");
    }
    
    throw error;
  }
};

/**
 * ⭐ NEU: Spezielle Funktion für File-Upload mit Optimierung - MIT RETRY & PROGRESS
 */
export const uploadAndOptimize = async (
  file: File, 
  contractType?: string,
  onProgress?: (progress: number) => void
): Promise<unknown> => {
  const formData = new FormData();
  formData.append('file', file);
  if (contractType) {
    formData.append('contractType', contractType);
  }

  console.log(`🔧 Upload & Optimize: ${file.name} (${file.size} bytes)`);

  // ✅ Progress-Simulation für Optimierung (dauert länger)
  if (onProgress) {
    onProgress(5); // Start
  }

  try {
    if (onProgress) onProgress(20); // PDF wird gelesen
    
    // ✅ Optimierung dauert länger als Analyse
    const progressInterval = setInterval(() => {
      if (onProgress) {
        const currentProgress = Math.min(85, Math.random() * 20 + 40);
        onProgress(currentProgress);
      }
    }, 2000);

    const result = await apiCall('/optimize', {
      method: 'POST',
      body: formData,
    });
    
    clearInterval(progressInterval);
    if (onProgress) onProgress(100); // Fertig
    
    console.log("✅ Optimierung erfolgreich:", result);
    return result;
    
  } catch (error) {
    if (onProgress) onProgress(0); // Reset bei Fehler
    
    console.error("❌ Upload & Optimize Fehler:", error);
    
    // ✅ FIXED: TypeScript-sichere Fehlerbehandlung
    const errorMessage = getErrorMessage(error);
    
    // ✅ Benutzerfreundliche Fehlermeldungen für Optimierung
    if (errorMessage.includes('nicht gefunden') || errorMessage.includes('404')) {
      throw new Error("❌ Optimierung-Service ist derzeit nicht verfügbar. Bitte kontaktiere den Support.");
    }
    
    if (errorMessage.includes('Server-Fehler') || errorMessage.includes('500')) {
      throw new Error("❌ Fehler bei der Vertragsoptimierung. Bitte versuche es später erneut.");
    }
    
    if (errorMessage.includes('Limit erreicht')) {
      throw new Error("🔧 Optimierung-Limit erreicht. Bitte upgrade dein Paket für weitere Optimierungen.");
    }
    
    if (errorMessage.includes('Timeout')) {
      throw new Error("⏱️ Optimierung-Timeout. Bitte versuche es mit einer kleineren PDF-Datei.");
    }
    
    if (errorMessage.includes('PDF') || errorMessage.includes('Datei')) {
      throw new Error("📄 PDF-Datei konnte nicht verarbeitet werden. Bitte prüfe das Dateiformat.");
    }
    
    throw error;
  }
};

/**
 * Health Check für Analyse-Service
 */
interface HealthCheckResponse {
  success: boolean;
  status?: string;
  timestamp?: string;
}

export const checkAnalyzeHealth = async (): Promise<boolean> => {
  try {
    const result = await apiCall('/analyze/health') as HealthCheckResponse;
    return !!result?.success;
  } catch {
    return false;
  }
};

/**
 * ⭐ NEU: Health Check für Optimierung-Service
 */
export const checkOptimizeHealth = async (): Promise<boolean> => {
  try {
    const result = await apiCall('/optimize/health') as HealthCheckResponse;
    return !!result?.success;
  } catch {
    return false;
  }
};

/**
 * ⭐ NEU: Optimierung-Historie abrufen
 */
export const getOptimizationHistory = async (): Promise<unknown> => {
  try {
    return await apiCall('/optimize/history');
  } catch (error) {
    console.error("❌ Fehler beim Abrufen der Optimierung-Historie:", error);
    throw error;
  }
};

/**
 * ⭐ NEU: Analyse-Historie abrufen
 */
export const getAnalysisHistory = async (): Promise<unknown> => {
  try {
    return await apiCall('/analyze/history');
  } catch (error) {
    console.error("❌ Fehler beim Abrufen der Analyse-Historie:", error);
    throw error;
  }
};

/**
 * ⭐ NEU: User-Limits abrufen
 */
export const getUserLimits = async (): Promise<unknown> => {
  try {
    return await apiCall('/auth/me');
  } catch (error) {
    console.error("❌ Fehler beim Abrufen der User-Limits:", error);
    throw error;
  }
};

/**
 * ⭐ NEU: Vertrag speichern (nach Generierung oder Optimierung)
 */
export const saveContract = async (contractData: {
  name: string;
  content: string;
  laufzeit?: string;
  kuendigung?: string;
  expiryDate?: string;
  status?: string;
  isGenerated?: boolean;
  signature?: string;
}): Promise<unknown> => {
  try {
    return await apiCall('/contracts', {
      method: 'POST',
      body: JSON.stringify(contractData),
    });
  } catch (error) {
    console.error("❌ Fehler beim Speichern des Vertrags:", error);
    throw error;
  }
};

/**
 * ⭐ VERBESSERT: Contracts abrufen mit Fehlerbehandlung
 */
export const getContracts = async (): Promise<unknown> => {
  try {
    return await apiCall('/contracts');
  } catch (error) {
    console.error("❌ Fehler beim Abrufen der Verträge:", error);
    throw error;
  }
};

/**
 * ⭐ NEU: Einzelnen Vertrag abrufen
 */
export const getContract = async (contractId: string): Promise<unknown> => {
  try {
    return await apiCall(`/contracts/${contractId}`);
  } catch (error) {
    console.error("❌ Fehler beim Abrufen des Vertrags:", error);
    throw error;
  }
};

/**
 * ⭐ NEU: Einzelnen Vertrag nach Details abrufen (für Duplikat-Navigation)
 */
export const getContractDetails = async (contractId: string): Promise<unknown> => {
  try {
    return await apiCall(`/contracts/${contractId}`);
  } catch (error) {
    console.error("❌ Fehler beim Abrufen der Vertrag-Details:", error);
    throw error;
  }
};

/**
 * ⭐ NEU: Alle Verträge eines Users abrufen (für Duplikat-Check im Frontend)
 */
export const getUserContracts = async (): Promise<unknown> => {
  try {
    return await apiCall('/contracts');
  } catch (error) {
    console.error("❌ Fehler beim Abrufen der User-Verträge:", error);
    throw error;
  }
};

/**
 * ⭐ NEU: Vertrag löschen
 */
export const deleteContract = async (contractId: string): Promise<unknown> => {
  try {
    return await apiCall(`/contracts/${contractId}`, {
      method: 'DELETE',
    });
  } catch (error) {
    console.error("❌ Fehler beim Löschen des Vertrags:", error);
    throw error;
  }
};

/**
 * ⭐ NEU: Reminder für Vertrag togglen
 */
export const toggleContractReminder = async (contractId: string, enabled: boolean): Promise<unknown> => {
  try {
    return await apiCall(`/contracts/${contractId}/reminder`, {
      method: 'PATCH',
      body: JSON.stringify({ reminder: enabled }),
    });
  } catch (error) {
    console.error("❌ Fehler beim Togglen des Vertrags-Reminders:", error);
    throw error;
  }
};

/**
 * ⭐ NEU: Vertrag-Status aktualisieren
 */
export const updateContractStatus = async (contractId: string, status: string): Promise<unknown> => {
  try {
    return await apiCall(`/contracts/${contractId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  } catch (error) {
    console.error("❌ Fehler beim Aktualisieren des Vertrag-Status:", error);
    throw error;
  }
};

/**
 * ⭐ NEU: Batch-Operationen für mehrere Verträge
 */
export const batchUpdateContracts = async (contractIds: string[], updates: Record<string, unknown>): Promise<unknown> => {
  try {
    return await apiCall('/contracts/batch', {
      method: 'PATCH',
      body: JSON.stringify({ contractIds, updates }),
    });
  } catch (error) {
    console.error("❌ Fehler beim Batch-Update der Verträge:", error);
    throw error;
  }
};

/**
 * ⭐ NEU: Suche in Verträgen
 */
export const searchContracts = async (query: string, filters?: Record<string, unknown>): Promise<unknown> => {
  try {
    const searchParams = new URLSearchParams({
      q: query,
      ...(filters && { filters: JSON.stringify(filters) })
    });
    
    return await apiCall(`/contracts/search?${searchParams.toString()}`);
  } catch (error) {
    console.error("❌ Fehler bei der Vertrags-Suche:", error);
    throw error;
  }
};

/**
 * ⭐ NEU: Statistiken für Dashboard abrufen
 */
export const getDashboardStats = async (): Promise<unknown> => {
  try {
    return await apiCall('/dashboard/stats');
  } catch (error) {
    console.error("❌ Fehler beim Abrufen der Dashboard-Statistiken:", error);
    throw error;
  }
};

/**
 * Löscht alle gespeicherten Authentifizierungsdaten
 */
export const clearAuthData = (): void => {
  localStorage.removeItem("authToken");
  localStorage.removeItem("authEmail");
  localStorage.removeItem("authTimestamp");
};

/**
 * ⭐ KORRIGIERT: Batch-Upload-Funktion für mehrere Dateien (Premium-Feature) - TypeScript-Lint-Fix
 * Führt mehrere Upload-Analysen parallel oder sequenziell durch
 */
export const batchUploadAndAnalyze = async (
  files: File[],
  onFileProgress?: (fileIndex: number, progress: number) => void,
  onFileComplete?: (fileIndex: number, result: AnalysisResult) => void,
  onFileError?: (fileIndex: number, error: string) => void,
  sequential: boolean = true // Sequential für bessere Server-Performance
): Promise<AnalysisResult[]> => {
  console.log(`🚀 Batch-Upload gestartet: ${files.length} Dateien (${sequential ? 'sequenziell' : 'parallel'})`);
  
  const results: AnalysisResult[] = [];
  
  if (sequential) {
    // ✅ Sequenzielle Verarbeitung (empfohlen für Server-Stabilität)
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      console.log(`📊 Verarbeite Datei ${i + 1}/${files.length}: ${file.name}`);
      
      try {
        const result = await uploadAndAnalyze(
          file,
          (progress) => {
            if (onFileProgress) onFileProgress(i, progress);
          }
        ) as AnalysisResult;
        
        results[i] = result;
        if (onFileComplete) onFileComplete(i, result);
        
        console.log(`✅ Datei ${i + 1} erfolgreich: ${file.name}`);
        
        // Kurze Pause zwischen Anfragen für Server-Entlastung
        if (i < files.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
        const errorResult: AnalysisResult = { success: false, error: errorMessage };
        results[i] = errorResult;
        if (onFileError) onFileError(i, errorMessage);
        
        console.error(`❌ Fehler bei Datei ${i + 1}: ${file.name}`, error);
      }
    }
  } else {
    // ✅ Parallele Verarbeitung (nur für kleine Dateimengen empfohlen)
    const promises = files.map(async (file, index) => {
      try {
        const result = await uploadAndAnalyze(
          file,
          (progress) => {
            if (onFileProgress) onFileProgress(index, progress);
          }
        ) as AnalysisResult;
        
        if (onFileComplete) onFileComplete(index, result);
        return result;
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
        const errorResult: AnalysisResult = { success: false, error: errorMessage };
        if (onFileError) onFileError(index, errorMessage);
        return errorResult;
      }
    });
    
    const parallelResults = await Promise.allSettled(promises);
    parallelResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        results[index] = result.value;
      } else {
        const errorResult: AnalysisResult = { 
          success: false, 
          error: result.reason?.message || 'Promise rejected' 
        };
        results[index] = errorResult;
      }
    });
  }
  
  console.log(`🎉 Batch-Upload abgeschlossen: ${results.filter(r => r.success).length}/${files.length} erfolgreich`);
  return results;
};

/**
 * ⭐ KORRIGIERT: Premium-Status für 3-Stufen-Modell prüfen
 */
export const checkPremiumStatus = async (): Promise<{ 
  subscriptionPlan: 'free' | 'business' | 'premium'; 
  isPremium: boolean; 
  analysisCount: number;
  analysisLimit: number;
}> => {
  try {
    const userInfo = await apiCall("/auth/me") as { 
      user: { 
        subscriptionPlan: string; 
        isPremium: boolean;
        analysisCount: number;
      } 
    };
    
    const plan = userInfo.user?.subscriptionPlan as 'free' | 'business' | 'premium' || 'free';
    const isPremium = userInfo.user?.isPremium || plan === 'premium';
    const analysisCount = userInfo.user?.analysisCount || 0;
    
    // ✅ KORRIGIERT: Limits nach 3-Stufen-Modell
    let analysisLimit = 0;
    if (plan === 'free') analysisLimit = 0;           // ❌ Keine Analysen
    else if (plan === 'business') analysisLimit = 50; // 📊 50 pro Monat
    else if (plan === 'premium') analysisLimit = Infinity; // ♾️ Unbegrenzt
    
    return { subscriptionPlan: plan, isPremium, analysisCount, analysisLimit };
  } catch (error) {
    console.warn("⚠️ Premium-Status konnte nicht geprüft werden:", error);
    return { 
      subscriptionPlan: 'free', 
      isPremium: false, 
      analysisCount: 0,
      analysisLimit: 0
    };
  }
};

/**
 * ⭐ KORRIGIERT: Upload-Limits für 3-Stufen-Modell abrufen
 */
export const getUploadLimits = async (): Promise<{
  maxConcurrentUploads: number;
  maxFileSize: number;
  allowedFormats: string[];
  canUpload: boolean;
  canMultiUpload: boolean;
  subscriptionPlan: string;
}> => {
  try {
    const { subscriptionPlan, isPremium } = await checkPremiumStatus();
    
    return {
      maxConcurrentUploads: subscriptionPlan === 'premium' ? 10 : 1,
      maxFileSize: isPremium ? 100 * 1024 * 1024 : 50 * 1024 * 1024, // 100MB vs 50MB
      allowedFormats: ['.pdf', '.doc', '.docx'],
      canUpload: subscriptionPlan !== 'free', // ✅ KORRIGIERT: Free kann nicht uploaden
      canMultiUpload: subscriptionPlan === 'premium', // ✅ KORRIGIERT: Nur Premium kann multi-upload
      subscriptionPlan
    };
  } catch (error) {
    console.warn("⚠️ Upload-Limits konnten nicht geladen werden:", error);
    return {
      maxConcurrentUploads: 1,
      maxFileSize: 50 * 1024 * 1024,
      allowedFormats: ['.pdf'],
      canUpload: false,
      canMultiUpload: false,
      subscriptionPlan: 'free'
    };
  }
};

/**
 * ⭐ NEU: Datei-Validierung für Upload
 */
export const validateUploadFile = (
  file: File, 
  limits: { maxFileSize: number; allowedFormats: string[] }
): { valid: boolean; error?: string } => {
  // Dateigröße prüfen
  if (file.size > limits.maxFileSize) {
    const maxSizeMB = (limits.maxFileSize / 1024 / 1024).toFixed(0);
    return {
      valid: false,
      error: `Datei zu groß. Maximum: ${maxSizeMB}MB (aktuell: ${(file.size / 1024 / 1024).toFixed(1)}MB)`
    };
  }
  
  // Dateiformat prüfen
  const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
  if (!limits.allowedFormats.includes(fileExtension)) {
    return {
      valid: false,
      error: `Dateiformat nicht unterstützt. Erlaubt: ${limits.allowedFormats.join(', ')}`
    };
  }
  
  // Dateiname prüfen
  if (file.name.length > 255) {
    return {
      valid: false,
      error: 'Dateiname zu lang (max. 255 Zeichen)'
    };
  }
  
  return { valid: true };
};

/**
 * ⭐ KORRIGIERT: Batch-Datei-Validierung für 3-Stufen-Modell
 */
export const validateBatchUpload = (
  files: File[],
  subscriptionPlan: 'free' | 'business' | 'premium'
): { valid: boolean; errors: string[]; warnings: string[] } => {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // ✅ KORRIGIERT: Free-User Check
  if (subscriptionPlan === 'free') {
    errors.push('Vertragsanalyse ist nur für Business- und Premium-Nutzer verfügbar.');
    return { valid: false, errors, warnings };
  }
  
  // ✅ KORRIGIERT: Business vs Premium Check für Mehrfach-Upload
  if (subscriptionPlan === 'business' && files.length > 1) {
    errors.push('Mehrere Dateien gleichzeitig analysieren ist nur für Premium-Nutzer verfügbar.');
    return { valid: false, errors, warnings };
  }
  
  // Anzahl-Limits
  const maxFiles = subscriptionPlan === 'premium' ? 10 : 1;
  if (files.length > maxFiles) {
    errors.push(`Zu viele Dateien. Maximum: ${maxFiles} (aktuell: ${files.length})`);
  }
  
  // Gesamtgröße prüfen
  const totalSize = files.reduce((sum, file) => sum + file.size, 0);
  const maxTotalSize = subscriptionPlan === 'premium' ? 500 * 1024 * 1024 : 100 * 1024 * 1024; // 500MB vs 100MB
  if (totalSize > maxTotalSize) {
    errors.push(`Gesamtgröße zu groß. Maximum: ${(maxTotalSize / 1024 / 1024).toFixed(0)}MB`);
  }
  
  // Duplikat-Namen prüfen
  const fileNames = files.map(f => f.name.toLowerCase());
  const duplicateNames = fileNames.filter((name, index) => fileNames.indexOf(name) !== index);
  if (duplicateNames.length > 0) {
    warnings.push(`Doppelte Dateinamen gefunden: ${duplicateNames.join(', ')}`);
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
};

/**
 * ⭐ KORRIGIERT: Erweiterte uploadAndAnalyze mit besserer Fehlerbehandlung für Batch - TypeScript-Lint-Fix
 */
export const uploadAndAnalyzeBatch = async (
  file: File, 
  onProgress?: (progress: number) => void,
  forceReanalyze: boolean = false,
  retryCount: number = 0,
  maxRetries: number = 2
): Promise<AnalysisResult> => {
  console.log(`📤 Upload & Analyze (Batch): ${file.name} (Versuch ${retryCount + 1}/${maxRetries + 1})`);

  try {
    return await uploadAndAnalyze(file, onProgress, forceReanalyze) as AnalysisResult;
  } catch (error) {
    console.error(`❌ Batch-Upload-Fehler (Versuch ${retryCount + 1}):`, error);
    
    // ✅ Retry-Logic für temporäre Fehler
    if (retryCount < maxRetries) {
      const errorMessage = error instanceof Error ? error.message : '';
      
      // Prüfe ob Retry sinnvoll ist
      const retryableErrors = [
        'nicht erreichbar',
        'Failed to fetch',
        'Timeout',
        'Server-Fehler',
        'HTTP 5',
        'überlastet'
      ];
      
      const shouldRetry = retryableErrors.some(retryError => 
        errorMessage.includes(retryError)
      );
      
      if (shouldRetry) {
        const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff
        console.log(`🔄 Retry in ${delay}ms für: ${file.name}`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        return uploadAndAnalyzeBatch(file, onProgress, forceReanalyze, retryCount + 1, maxRetries);
      }
    }
    
    // ✅ Fehler nicht retry-bar oder max retries erreicht
    throw error;
  }
};

export default API_BASE_URL;