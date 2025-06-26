// frontend/src/utils/s3Utils.ts
// Wiederverwendbare S3-Utility-Funktionen für Contract AI

export interface S3UrlResponse {
  fileUrl: string;
  s3Key: string;
  expiresIn: number;
  contract?: {
    id: string;
    title: string;
    uploadDate: string;
  };
  message: string;
}

export interface S3ErrorResponse {
  error: string;
  suggestion?: string;
  contractTitle?: string;
  uploadDate?: string;
}

export interface ContractInfo {
  url: string | null;
  hasS3Key: boolean;
  isLegacy: boolean;
  error?: string;
  suggestion?: string;
}

/**
 * Holt eine frische Signed URL für einen Vertrag
 * @param contractId MongoDB ObjectId des Vertrags
 * @returns Promise<string | null> - URL oder null bei Fehler
 */
export async function fetchSignedUrl(contractId: string): Promise<string | null> {
  try {
    const token = localStorage.getItem('token');
    
    if (!token) {
      console.error('❌ Kein Auth-Token gefunden');
      return null;
    }

    console.log(`🔗 Hole S3 URL für Contract: ${contractId}`);
    
    const response = await fetch(`/api/s3/view?contractId=${contractId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    });

    const data = await response.json();

    if (!response.ok) {
      const errorData = data as S3ErrorResponse;
      console.error('❌ S3 URL Fehler:', errorData.error);
      
      // Spezielle Behandlung für alte Verträge
      if (errorData.error.includes('before S3 integration')) {
        console.warn('⚠️ Alter Vertrag ohne S3-Integration erkannt');
        return null;
      }
      
      return null;
    }

    const successData = data as S3UrlResponse;
    console.log(`✅ S3 URL erfolgreich geholt für: ${successData.s3Key}`);
    
    return successData.fileUrl;

  } catch (error) {
    console.error('❌ fetchSignedUrl Network Error:', error);
    return null;
  }
}

/**
 * Holt Informationen über einen Contract und dessen S3-Status
 * @param contractId MongoDB ObjectId des Vertrags
 * @returns Promise mit Contract-Info und S3-Status
 */
export async function getContractInfo(contractId: string): Promise<ContractInfo> {
  try {
    const token = localStorage.getItem('token');
    
    const response = await fetch(`/api/s3/view?contractId=${contractId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    });

    const data = await response.json();

    if (!response.ok) {
      const errorData = data as S3ErrorResponse;
      
      if (errorData.error.includes('before S3 integration')) {
        return {
          url: null,
          hasS3Key: false,
          isLegacy: true,
          error: errorData.error,
          suggestion: errorData.suggestion
        };
      }
      
      return {
        url: null,
        hasS3Key: false,
        isLegacy: false,
        error: errorData.error
      };
    }

    const successData = data as S3UrlResponse;
    
    return {
      url: successData.fileUrl,
      hasS3Key: true,
      isLegacy: false
    };

  } catch (error) {
    return {
      url: null,
      hasS3Key: false,
      isLegacy: false,
      error: `Network Error: ${error}`
    };
  }
}

/**
 * Aktualisiert eine abgelaufene S3-URL
 * @param contractId MongoDB ObjectId des Vertrags
 * @returns Promise<string | null> - Neue URL oder null
 */
export async function refreshSignedUrl(contractId: string): Promise<string | null> {
  try {
    const token = localStorage.getItem('token');
    
    const response = await fetch('/api/s3/refresh', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({ contractId })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ S3 URL Refresh Error:', data.error);
      return null;
    }

    console.log(`✅ S3 URL erfolgreich aktualisiert für Contract: ${contractId}`);
    return data.fileUrl;

  } catch (error) {
    console.error('❌ refreshSignedUrl Error:', error);
    return null;
  }
}

/**
 * Holt S3-URL mit automatischem Refresh bei Ablauf
 * @param contractId MongoDB ObjectId des Vertrags
 * @param maxRetries Maximale Anzahl Wiederholungen bei 403-Fehlern
 * @returns Promise<string | null>
 */
export async function getValidS3Url(contractId: string, maxRetries: number = 1): Promise<string | null> {
  let attempt = 0;
  
  while (attempt <= maxRetries) {
    const url = await fetchSignedUrl(contractId);
    
    if (url) {
      // Teste ob URL noch gültig ist
      try {
        const testResponse = await fetch(url, { method: 'HEAD' });
        if (testResponse.ok) {
          return url;
        }
      } catch (error) {
        console.warn(`⚠️ S3 URL test failed (attempt ${attempt + 1}):`, error);
      }
    }
    
    // Bei Fehler oder ungültiger URL: Refresh versuchen
    if (attempt < maxRetries) {
      console.log(`🔄 Refreshing S3 URL (attempt ${attempt + 1}/${maxRetries + 1})`);
      const refreshedUrl = await refreshSignedUrl(contractId);
      if (refreshedUrl) {
        return refreshedUrl;
      }
    }
    
    attempt++;
  }
  
  return null;
}

/**
 * Öffnet einen Vertrag in einem neuen Tab (mit Fallback-Logik)
 * @param contractId MongoDB ObjectId des Vertrags
 * @param onError Callback für Fehlerbehandlung
 */
export async function openContract(
  contractId: string, 
  onError?: (message: string, isLegacy: boolean) => void
): Promise<void> {
  const contractInfo = await getContractInfo(contractId);
  
  if (contractInfo.url) {
    // Erfolgreich - öffne PDF
    window.open(contractInfo.url, '_blank');
    return;
  }
  
  if (contractInfo.isLegacy) {
    // Alter Vertrag - Reupload-Meldung
    const message = 'Dieser Vertrag wurde vor der Cloud-Integration hochgeladen und ist nicht mehr verfügbar. Bitte laden Sie ihn erneut hoch.';
    if (onError) onError(message, true);
    else alert(`⚠️ ${message}`);
    return;
  }
  
  // Allgemeiner Fehler
  const message = contractInfo.error || 'Die PDF-Datei konnte nicht geladen werden.';
  if (onError) onError(message, false);
  else alert(`❌ ${message}`);
}

/**
 * Lädt eine PDF herunter (mit automatischem Fallback)
 * @param contractId MongoDB ObjectId des Vertrags
 * @param fileName Gewünschter Dateiname (optional)
 * @returns Promise<boolean> - Erfolg oder Fehler
 */
export async function downloadContract(
  contractId: string, 
  fileName?: string
): Promise<boolean> {
  try {
    const url = await getValidS3Url(contractId);
    
    if (!url) {
      console.error('❌ Could not get valid S3 URL for download');
      return false;
    }
    
    // Download über temporären Link
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName || `contract-${contractId}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    console.log(`✅ Download initiated for contract: ${contractId}`);
    return true;
    
  } catch (error) {
    console.error('❌ Download error:', error);
    return false;
  }
}

/**
 * Prüft ob ein Vertrag S3-Integration hat
 * @param contract Contract-Objekt
 * @returns boolean
 */
export function hasS3Integration(contract: any): boolean {
  return !!(contract.s3Key && contract.s3Bucket);
}

/**
 * Generiert eine lokale Fallback-URL für Legacy-Verträge
 * @param contract Contract-Objekt
 * @returns string | null
 */
export function getLegacyFileUrl(contract: any): string | null {
  if (contract.filePath) {
    // Entferne führenden Slash falls vorhanden
    const cleanPath = contract.filePath.startsWith('/') 
      ? contract.filePath.substring(1) 
      : contract.filePath;
    return `/${cleanPath}`;
  }
  
  if (contract.filename) {
    return `/uploads/${contract.filename}`;
  }
  
  return null;
}

/**
 * Bestimmt den besten Anzeigemodus für einen Vertrag
 * @param contract Contract-Objekt
 * @returns ContractDisplayMode
 */
export interface ContractDisplayMode {
  canView: boolean;
  isS3: boolean;
  isLegacy: boolean;
  needsReupload: boolean;
  displayText: string;
  iconType: 'cloud' | 'warning' | 'error' | 'normal';
}

export function getContractDisplayMode(contract: any): ContractDisplayMode {
  if (hasS3Integration(contract)) {
    return {
      canView: true,
      isS3: true,
      isLegacy: false,
      needsReupload: false,
      displayText: 'PDF anzeigen',
      iconType: 'cloud'
    };
  }
  
  if (contract.needsReupload || contract.uploadType === 'LOCAL_LEGACY') {
    return {
      canView: false,
      isS3: false,
      isLegacy: true,
      needsReupload: true,
      displayText: 'Reupload erforderlich',
      iconType: 'warning'
    };
  }
  
  // Versuche Legacy-URL
  const legacyUrl = getLegacyFileUrl(contract);
  if (legacyUrl) {
    return {
      canView: true,
      isS3: false,
      isLegacy: true,
      needsReupload: false,
      displayText: 'PDF anzeigen (lokal)',
      iconType: 'normal'
    };
  }
  
  return {
    canView: false,
    isS3: false,
    isLegacy: true,
    needsReupload: true,
    displayText: 'Datei nicht verfügbar',
    iconType: 'error'
  };
}

/**
 * Hook für React-Komponenten: Contract URL Management
 */
export function useContractUrl(contractId: string) {
  const [url, setUrl] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  
  const loadUrl = React.useCallback(async () => {
    if (!contractId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const contractUrl = await getValidS3Url(contractId);
      setUrl(contractUrl);
      
      if (!contractUrl) {
        setError('URL konnte nicht geladen werden');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler');
    } finally {
      setLoading(false);
    }
  }, [contractId]);
  
  React.useEffect(() => {
    loadUrl();
  }, [loadUrl]);
  
  return {
    url,
    loading,
    error,
    refresh: loadUrl
  };
}

// React import für Hook (falls React verwendet wird)
import * as React from 'react';