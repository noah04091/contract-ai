// 📁 src/components/FolderBar.tsx - Horizontal Folder Navigation Bar with Drag & Drop
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, FolderOpen, Sparkles, MoreVertical, Edit2, Trash2, GripVertical } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
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
  onReorderFolders: (folders: FolderType[]) => Promise<void>; // NEW: Reorder callback
  onSmartFolders?: () => void;
  isLoading?: boolean;
}

// Sortable Folder Chip Component
function SortableFolderChip({
  folder,
  isActive,
  onClick,
  onContextMenu,
  onEdit,
  onDelete,
  contextMenuOpen
}: {
  folder: FolderType;
  isActive: boolean;
  onClick: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
  onEdit: (e: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent) => void;
  contextMenuOpen: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: folder._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const isUnassigned = folder._id === 'unassigned';

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={styles.folderChipWrapper}
    >
      <button
        className={`${styles.folderChip} ${isActive ? styles.active : ''} ${isDragging ? styles.dragging : ''} ${isUnassigned ? styles.unassignedChip : ''}`}
        style={{
          '--folder-color': folder.color,
        } as React.CSSProperties}
        onClick={onClick}
        onContextMenu={isUnassigned ? undefined : onContextMenu}
      >
        {/* Drag Handle */}
        <div
          {...attributes}
          {...listeners}
          className={styles.dragHandle}
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical size={14} />
        </div>

        <span className={styles.chipIcon}>{folder.icon}</span>
        <span className={styles.chipLabel}>{folder.name}</span>
        <span className={styles.chipCount}>{folder.contractCount || 0}</span>

        {/* More Button - nur für echte Ordner */}
        {!isUnassigned && (
          <button
            className={styles.moreButton}
            onClick={(e) => {
              e.stopPropagation();
              onContextMenu(e);
            }}
          >
            <MoreVertical size={14} />
          </button>
        )}
      </button>

      {/* Context Menu - nur für echte Ordner */}
      {!isUnassigned && (
        <AnimatePresence>
          {contextMenuOpen && (
            <motion.div
              className={styles.contextMenu}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button className={styles.contextMenuItem} onClick={onEdit}>
                <Edit2 size={14} />
                <span>Bearbeiten</span>
              </button>
              <button className={`${styles.contextMenuItem} ${styles.danger}`} onClick={onDelete}>
                <Trash2 size={14} />
                <span>Löschen</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}

export default function FolderBar({
  folders,
  activeFolder,
  totalContracts,
  onFolderClick,
  onCreateFolder,
  onEditFolder,
  onDeleteFolder,
  onReorderFolders,
  onSmartFolders
}: FolderBarProps) {
  const [contextMenu, setContextMenu] = useState<{ folderId: string; x: number; y: number } | null>(null);
  const [localFolders, setLocalFolders] = useState<FolderType[]>(folders);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Update local folders when prop changes
  useEffect(() => {
    setLocalFolders(folders);
  }, [folders]);

  // Close context menu on outside click
  useEffect(() => {
    const handleClickOutside = () => setContextMenu(null);
    if (contextMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [contextMenu]);

  // Drag & Drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement required before drag starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle drag end
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = localFolders.findIndex((f) => f._id === active.id);
      const newIndex = localFolders.findIndex((f) => f._id === over.id);

      const reordered = arrayMove(localFolders, oldIndex, newIndex).map((folder, index) => ({
        ...folder,
        order: index
      }));

      setLocalFolders(reordered); // Optimistic update
      await onReorderFolders(reordered); // Save to backend
    }
  };

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
        {/* Alle Verträge - FIXED (nicht sortierbar) */}
        <button
          className={`${styles.folderChip} ${activeFolder === null ? styles.active : ''}`}
          onClick={() => onFolderClick(null)}
        >
          <FolderOpen size={16} className={styles.chipIcon} />
          <span className={styles.chipLabel}>Alle Verträge</span>
          <span className={styles.chipCount}>{totalContracts}</span>
        </button>

        {/* SORTABLE User Folders (inkl. "Ohne Ordner" als virtuelles Folder) */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={localFolders.map(f => f._id)}
            strategy={horizontalListSortingStrategy}
          >
            {localFolders.map((folder) => (
              <SortableFolderChip
                key={folder._id}
                folder={folder}
                isActive={activeFolder === folder._id}
                onClick={() => onFolderClick(folder._id === 'unassigned' ? 'unassigned' : folder._id)}
                onContextMenu={(e) => handleContextMenu(e, folder)}
                onEdit={(e) => handleEdit(e, folder._id)}
                onDelete={(e) => handleDelete(e, folder._id)}
                contextMenuOpen={contextMenu?.folderId === folder._id}
              />
            ))}
          </SortableContext>
        </DndContext>

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
