// 📁 src/components/FolderBar.tsx - Horizontal Folder Navigation Bar
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Folder, Plus, FolderOpen, Sparkles, MoreVertical, Edit2, Trash2 } from 'lucide-react';
import styles from '../styles/FolderBar.module.css';

export interface FolderType {
  _id: string;
  name: string;
  icon: string;
  color: string;
  contractCount?: number;
  order?: number;
}

interface FolderBarProps {
  folders: FolderType[];
  activeFolder: string | null;
  totalContracts: number;
  unassignedCount: number;
  onFolderClick: (folderId: string | null) => void;
  onCreateFolder: () => void;
  onEditFolder: (folderId: string) => void;
  onDeleteFolder: (folderId: string) => void;
  onSmartFolders?: () => void;
  isLoading?: boolean;
}

export default function FolderBar({
  folders,
  activeFolder,
  totalContracts,
  unassignedCount,
  onFolderClick,
  onCreateFolder,
  onEditFolder,
  onDeleteFolder,
  onSmartFolders
}: FolderBarProps) {
  const [contextMenu, setContextMenu] = useState<{ folderId: string; x: number; y: number } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Close context menu on outside click
  useEffect(() => {
    const handleClickOutside = () => setContextMenu(null);
    if (contextMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [contextMenu]);

  const handleContextMenu = (e: React.MouseEvent, folder: FolderType) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      folderId: folder._id,
      x: e.clientX,
      y: e.clientY
    });
  };

  const handleEdit = (e: React.MouseEvent, folderId: string) => {
    e.stopPropagation();
    setContextMenu(null);
    onEditFolder(folderId);
  };

  const handleDelete = (e: React.MouseEvent, folderId: string) => {
    e.stopPropagation();
    setContextMenu(null);
    if (window.confirm('Ordner wirklich löschen? Verträge werden nicht gelöscht.')) {
      onDeleteFolder(folderId);
    }
  };

  return (
    <div className={styles.folderBar}>
      <div className={styles.scrollContainer} ref={scrollRef}>
        {/* Alle Verträge */}
        <motion.button
          className={`${styles.folderChip} ${activeFolder === null ? styles.active : ''}`}
          onClick={() => onFolderClick(null)}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <FolderOpen size={16} className={styles.chipIcon} />
          <span className={styles.chipLabel}>Alle Verträge</span>
          <span className={styles.chipCount}>{totalContracts}</span>
        </motion.button>

        {/* Ohne Ordner */}
        {unassignedCount > 0 && (
          <motion.button
            className={`${styles.folderChip} ${styles.unassignedChip} ${activeFolder === 'unassigned' ? styles.active : ''}`}
            onClick={() => onFolderClick('unassigned')}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Folder size={16} className={styles.chipIcon} />
            <span className={styles.chipLabel}>Ohne Ordner</span>
            <span className={styles.chipCount}>{unassignedCount}</span>
          </motion.button>
        )}

        {/* User Folders */}
        {folders.map((folder) => (
          <div
            key={folder._id}
            className={styles.folderChipWrapper}
          >
            <button
              className={`${styles.folderChip} ${activeFolder === folder._id ? styles.active : ''}`}
              style={{
                '--folder-color': folder.color,
              } as React.CSSProperties}
              onClick={() => onFolderClick(folder._id)}
              onContextMenu={(e) => handleContextMenu(e, folder)}
            >
              <span className={styles.chipIcon}>{folder.icon}</span>
              <span className={styles.chipLabel}>{folder.name}</span>
              <span className={styles.chipCount}>{folder.contractCount || 0}</span>

              {/* More Button */}
              <button
                className={styles.moreButton}
                onClick={(e) => {
                  e.stopPropagation();
                  handleContextMenu(e, folder);
                }}
              >
                <MoreVertical size={14} />
              </button>
            </button>

            {/* Context Menu */}
            <AnimatePresence>
              {contextMenu?.folderId === folder._id && (
                <motion.div
                  className={styles.contextMenu}
                  style={{ left: contextMenu.x, top: contextMenu.y }}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    className={styles.contextMenuItem}
                    onClick={(e) => handleEdit(e, folder._id)}
                  >
                    <Edit2 size={14} />
                    <span>Bearbeiten</span>
                  </button>
                  <button
                    className={`${styles.contextMenuItem} ${styles.danger}`}
                    onClick={(e) => handleDelete(e, folder._id)}
                  >
                    <Trash2 size={14} />
                    <span>Löschen</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}

        {/* Divider */}
        <div className={styles.divider} />

        {/* New Folder Button */}
        <motion.button
          className={`${styles.folderChip} ${styles.newFolderBtn}`}
          onClick={onCreateFolder}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Plus size={16} className={styles.chipIcon} />
          <span className={styles.chipLabel}>Neuer Ordner</span>
        </motion.button>

        {/* Smart Folders Button */}
        {onSmartFolders && totalContracts > 0 && (
          <motion.button
            className={`${styles.folderChip} ${styles.smartFoldersBtn}`}
            onClick={onSmartFolders}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Sparkles size={16} className={styles.chipIcon} />
            <span className={styles.chipLabel}>Smart Folders</span>
          </motion.button>
        )}
      </div>
    </div>
  );
}
