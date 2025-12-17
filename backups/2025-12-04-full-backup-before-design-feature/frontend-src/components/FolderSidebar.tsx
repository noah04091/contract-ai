// 📁 FolderSidebar.tsx - Folder Navigation Sidebar
import { useState, useEffect } from 'react';
import { Folder, Plus, Edit2, Trash2, MoreVertical, Sparkles } from 'lucide-react';
import styles from '../styles/FolderSidebar.module.css';

export interface FolderType {
  _id: string;
  name: string;
  color: string;
  icon: string;
  contractCount: number;
  order: number;
}

interface FolderSidebarProps {
  folders: FolderType[];
  activeFolder: string | null; // null = "Alle", "unassigned" = "Ohne Ordner"
  totalContracts: number;
  unassignedCount: number;
  onFolderClick: (folderId: string | null) => void;
  onCreateFolder: () => void;
  onEditFolder: (folder: FolderType) => void;
  onDeleteFolder: (folder: FolderType) => void;
  onSmartFolders?: () => void; // 🤖 Smart Folders Trigger
  isLoading?: boolean;
}

export default function FolderSidebar({
  folders,
  activeFolder,
  totalContracts,
  unassignedCount,
  onFolderClick,
  onCreateFolder,
  onEditFolder,
  onDeleteFolder,
  onSmartFolders,
  isLoading = false
}: FolderSidebarProps) {
  const [contextMenuFolder, setContextMenuFolder] = useState<string | null>(null);

  // Close context menu on outside click
  useEffect(() => {
    const handleClick = () => setContextMenuFolder(null);
    if (contextMenuFolder) {
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
  }, [contextMenuFolder]);

  const handleContextMenu = (e: React.MouseEvent, folderId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenuFolder(contextMenuFolder === folderId ? null : folderId);
  };

  return (
    <div className={styles.sidebar}>
      <div className={styles.header}>
        <h3 className={styles.title}>Ordner</h3>
        <button
          className={styles.createBtn}
          onClick={onCreateFolder}
          disabled={isLoading}
          title="Neuer Ordner"
        >
          <Plus size={16} />
        </button>
      </div>

      <div className={styles.folderList}>
        {/* Alle Verträge */}
        <button
          className={`${styles.folderItem} ${activeFolder === null ? styles.active : ''}`}
          onClick={() => onFolderClick(null)}
          disabled={isLoading}
        >
          <span className={styles.folderIcon}>📊</span>
          <span className={styles.folderName}>Alle Verträge</span>
          <span className={styles.folderCount}>{totalContracts}</span>
        </button>

        {/* User Folders */}
        {folders.map((folder) => (
          <div key={folder._id} className={styles.folderItemWrapper}>
            <button
              className={`${styles.folderItem} ${activeFolder === folder._id ? styles.active : ''}`}
              onClick={() => onFolderClick(folder._id)}
              disabled={isLoading}
            >
              <span className={styles.folderIcon}>{folder.icon}</span>
              <span className={styles.folderName}>{folder.name}</span>
              <span
                className={styles.folderCount}
                style={{ backgroundColor: folder.color + '20', color: folder.color }}
              >
                {folder.contractCount}
              </span>
              <button
                className={styles.moreBtn}
                onClick={(e) => handleContextMenu(e, folder._id)}
                title="Mehr Optionen"
              >
                <MoreVertical size={14} />
              </button>
            </button>

            {/* Context Menu */}
            {contextMenuFolder === folder._id && (
              <div className={styles.contextMenu}>
                <button
                  className={styles.contextMenuItem}
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditFolder(folder);
                    setContextMenuFolder(null);
                  }}
                >
                  <Edit2 size={14} />
                  Bearbeiten
                </button>
                <button
                  className={`${styles.contextMenuItem} ${styles.danger}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteFolder(folder);
                    setContextMenuFolder(null);
                  }}
                >
                  <Trash2 size={14} />
                  Löschen
                </button>
              </div>
            )}
          </div>
        ))}

        {/* Ohne Ordner */}
        {unassignedCount > 0 && (
          <>
            <div className={styles.divider} />
            <button
              className={`${styles.folderItem} ${activeFolder === 'unassigned' ? styles.active : ''}`}
              onClick={() => onFolderClick('unassigned')}
              disabled={isLoading}
            >
              <span className={styles.folderIcon}>📄</span>
              <span className={styles.folderName}>Ohne Ordner</span>
              <span className={styles.folderCount}>{unassignedCount}</span>
            </button>
          </>
        )}
      </div>

      {folders.length === 0 && !isLoading && (
        <div className={styles.emptyState}>
          <Folder size={32} strokeWidth={1.5} />
          <p>Noch keine Ordner</p>
          <button className={styles.emptyStateBtn} onClick={onCreateFolder}>
            Ersten Ordner erstellen
          </button>
        </div>
      )}

      {/* 🤖 Smart Folders Button */}
      {onSmartFolders && totalContracts > 0 && (
        <button
          className={styles.smartFoldersBtn}
          onClick={onSmartFolders}
          disabled={isLoading}
        >
          <Sparkles size={16} />
          <span>Smart Folders</span>
        </button>
      )}
    </div>
  );
}
