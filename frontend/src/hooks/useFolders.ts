// 📁 useFolders.ts - Custom Hook for Folder Management
import { useState, useCallback } from 'react';
import type { FolderType } from '../components/FolderSidebar';

interface UseFoldersReturn {
  folders: FolderType[];
  activeFolder: string | null;
  isLoading: boolean;
  error: string | null;
  fetchFolders: () => Promise<void>;
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

  const getToken = () => {
    return localStorage.getItem('authToken') || localStorage.getItem('token');
  };

  const fetchFolders = useCallback(async () => {
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
      setFolders(data);
    } catch (err: any) {
      setError(err.message);
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

      await fetchFolders(); // Refresh list
    } catch (err: any) {
      setError(err.message);
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

      await fetchFolders(); // Refresh list
    } catch (err: any) {
      setError(err.message);
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

      await fetchFolders(); // Refresh list
    } catch (err: any) {
      setError(err.message);
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

      await fetchFolders(); // Refresh counts
    } catch (err: any) {
      setError(err.message);
      console.error('❌ Error moving contract:', err);
      throw err;
    }
  }, [fetchFolders]);

  const bulkMoveToFolder = useCallback(async (contractIds: string[], folderId: string | null) => {
    try {
      const token = getToken();
      if (!token) throw new Error('Nicht angemeldet');

      const response = await fetch('/api/contracts/bulk/folder', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ contractIds, folderId })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Fehler beim Verschieben');
      }

      await fetchFolders(); // Refresh counts
    } catch (err: any) {
      setError(err.message);
      console.error('❌ Error bulk moving contracts:', err);
      throw err;
    }
  }, [fetchFolders]);

  return {
    folders,
    activeFolder,
    isLoading,
    error,
    fetchFolders,
    createFolder,
    updateFolder,
    deleteFolder,
    setActiveFolder,
    moveContractToFolder,
    bulkMoveToFolder
  };
}
