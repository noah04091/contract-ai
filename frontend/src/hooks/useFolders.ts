// 📁 useFolders.ts - Custom Hook for Folder Management
import { useState, useCallback, useRef } from 'react';
import type { FolderType } from '../components/FolderBar';

interface UseFoldersReturn {
  folders: FolderType[];
  activeFolder: string | null;
  isLoading: boolean;
  error: string | null;
  unassignedOrder: number;
  fetchFolders: (force?: boolean) => Promise<void>;
  createFolder: (data: { name: string; color: string; icon: string }) => Promise<void>;
  updateFolder: (id: string, data: { name: string; color: string; icon: string }) => Promise<void>;
  deleteFolder: (id: string) => Promise<void>;
  setActiveFolder: (folderId: string | null) => void;
  moveContractToFolder: (contractId: string, folderId: string | null) => Promise<void>;
  bulkMoveToFolder: (contractIds: string[], folderId: string | null) => Promise<void>;
}

export function useFolders(): UseFoldersReturn {
  const [folders, setFolders] = useState<FolderType[]>([]);
  const [activeFolder, setActiveFolder] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unassignedOrder, setUnassignedOrder] = useState<number>(9999);

  // ✅ Cache für Folder-Daten (30 Sekunden)
  const folderCacheRef = useRef<{
    folders: FolderType[];
    unassignedOrder: number;
    timestamp: number
  }>({
    folders: [],
    unassignedOrder: 9999,
    timestamp: 0
  });

  const getToken = () => {
    return localStorage.getItem('authToken') || localStorage.getItem('token');
  };

  const fetchFolders = useCallback(async (force: boolean = false) => {
    // ✅ Cache-Check: Nur alle 30 Sekunden neu laden (außer force=true)
    const now = Date.now();
    const cacheAge = now - folderCacheRef.current.timestamp;
    const CACHE_DURATION = 30000; // 30 Sekunden

    if (!force && folderCacheRef.current.folders.length > 0 && cacheAge < CACHE_DURATION) {
      console.log('📁 Folders aus Cache geladen (Alter:', Math.round(cacheAge / 1000), 'Sekunden)');
      setFolders(folderCacheRef.current.folders);
      setUnassignedOrder(folderCacheRef.current.unassignedOrder);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const token = getToken();
      if (!token) throw new Error('Nicht angemeldet');

      const response = await fetch('/api/folders', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error('Fehler beim Laden der Ordner');
      }

      const data = await response.json();

      // Handle new response format with folders + unassignedOrder
      if (data.folders && Array.isArray(data.folders)) {
        // ✅ Cache aktualisieren
        folderCacheRef.current = {
          folders: data.folders,
          unassignedOrder: data.unassignedOrder !== undefined ? data.unassignedOrder : 9999,
          timestamp: now
        };

        setFolders(data.folders);
        setUnassignedOrder(data.unassignedOrder !== undefined ? data.unassignedOrder : 9999);
        console.log('✅ Folders vom Server geladen (', data.folders.length, 'Ordner)');
      } else {
        // Fallback for old format (just array of folders)
        folderCacheRef.current = {
          folders: data,
          unassignedOrder: 9999,
          timestamp: now
        };

        setFolders(data);
        console.log('✅ Folders vom Server geladen (Legacy Format)');
      }
    } catch (err) {
      const error = err as Error;
      setError(error.message);
      console.error('❌ Error fetching folders:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createFolder = useCallback(async (data: { name: string; color: string; icon: string }) => {
    setIsLoading(true);
    setError(null);

    try {
      const token = getToken();
      if (!token) throw new Error('Nicht angemeldet');

      const response = await fetch('/api/folders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Fehler beim Erstellen');
      }

      await fetchFolders(true); // ✅ Force refresh nach Erstellung
    } catch (err) {
      const error = err as Error;
      setError(error.message);
      console.error('❌ Error creating folder:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [fetchFolders]);

  const updateFolder = useCallback(async (id: string, data: { name: string; color: string; icon: string }) => {
    setIsLoading(true);
    setError(null);

    try {
      const token = getToken();
      if (!token) throw new Error('Nicht angemeldet');

      const response = await fetch(`/api/folders/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Fehler beim Aktualisieren');
      }

      await fetchFolders(true); // ✅ Force refresh nach Update
    } catch (err) {
      const error = err as Error;
      setError(error.message);
      console.error('❌ Error updating folder:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [fetchFolders]);

  const deleteFolder = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const token = getToken();
      if (!token) throw new Error('Nicht angemeldet');

      const response = await fetch(`/api/folders/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Fehler beim Löschen');
      }

      await fetchFolders(true); // ✅ Force refresh nach Löschung
    } catch (err) {
      const error = err as Error;
      setError(error.message);
      console.error('❌ Error deleting folder:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [fetchFolders]);

  const moveContractToFolder = useCallback(async (contractId: string, folderId: string | null) => {
    try {
      const token = getToken();
      if (!token) throw new Error('Nicht angemeldet');

      const response = await fetch(`/api/contracts/${contractId}/folder`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ folderId })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Fehler beim Verschieben');
      }

      await fetchFolders(true); // ✅ Force refresh nach Verschieben (Counts aktualisieren)
    } catch (err) {
      const error = err as Error;
      setError(error.message);
      console.error('❌ Error moving contract:', err);
      throw err;
    }
  }, [fetchFolders]);

  const bulkMoveToFolder = useCallback(async (contractIds: string[], folderId: string | null) => {
    try {
      const token = getToken();
      if (!token) throw new Error('Nicht angemeldet');

      // ✅ NEU: Bulk-Move Endpoint (Enterprise-Feature)
      const response = await fetch('/api/contracts/bulk-move', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          contractIds,
          targetFolderId: folderId
        })
      });

      if (!response.ok) {
        const errorData = await response.json();

        // Enterprise-Feature Check
        if (errorData.requiresUpgrade) {
          throw new Error(errorData.message || '⛔ Bulk-Operationen nur für Enterprise');
        }

        throw new Error(errorData.message || 'Fehler beim Verschieben');
      }

      const result = await response.json();
      console.log(`✅ ${result.moved} Verträge verschoben`);

      await fetchFolders(true); // ✅ Force refresh nach Bulk-Verschieben
    } catch (err) {
      const error = err as Error;
      setError(error.message);
      console.error('❌ Error bulk moving contracts:', err);
      throw err;
    }
  }, [fetchFolders]);

  return {
    folders,
    activeFolder,
    isLoading,
    error,
    unassignedOrder,
    fetchFolders,
    createFolder,
    updateFolder,
    deleteFolder,
    setActiveFolder,
    moveContractToFolder,
    bulkMoveToFolder
  };
}
