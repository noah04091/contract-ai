/**
 * useBatchPages Hook
 *
 * State-Management für gescannte Seiten:
 * Add, Remove, Reorder, Update
 */

import { useState, useCallback } from "react";
import type { Point } from "../utils/imageProcessing";

export interface ScannedPage {
  id: string;
  imageBlob: Blob;
  thumbnailUrl: string;
  corners: Point[] | null;
  rotation: number;
  timestamp: number;
}

interface UseBatchPagesReturn {
  pages: ScannedPage[];
  activePage: number;
  addPage: (blob: Blob, corners: Point[] | null) => void;
  removePage: (index: number) => void;
  reorderPages: (fromIndex: number, toIndex: number) => void;
  updatePageCorners: (index: number, corners: Point[]) => void;
  updatePageRotation: (index: number, rotation: number) => void;
  setActivePage: (index: number) => void;
  clearPages: () => void;
  pageCount: number;
}

let pageIdCounter = 0;

export function useBatchPages(maxPages: number = 50): UseBatchPagesReturn {
  const [pages, setPages] = useState<ScannedPage[]>([]);
  const [activePage, setActivePage] = useState(0);

  const addPage = useCallback(
    (blob: Blob, corners: Point[] | null) => {
      setPages((prev) => {
        if (prev.length >= maxPages) return prev;
        const url = URL.createObjectURL(blob);
        const newPage: ScannedPage = {
          id: `page-${++pageIdCounter}`,
          imageBlob: blob,
          thumbnailUrl: url,
          corners,
          rotation: 0,
          timestamp: Date.now(),
        };
        return [...prev, newPage];
      });
      setActivePage((prev) =>
        pages.length < maxPages ? pages.length : prev
      );
    },
    [maxPages, pages.length]
  );

  const removePage = useCallback(
    (index: number) => {
      setPages((prev) => {
        if (index < 0 || index >= prev.length) return prev;
        URL.revokeObjectURL(prev[index].thumbnailUrl);
        return prev.filter((_, i) => i !== index);
      });
      setActivePage((prev) => Math.max(0, Math.min(prev, pages.length - 2)));
    },
    [pages.length]
  );

  const reorderPages = useCallback((fromIndex: number, toIndex: number) => {
    setPages((prev) => {
      const updated = [...prev];
      const [moved] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, moved);
      return updated;
    });
  }, []);

  const updatePageCorners = useCallback(
    (index: number, corners: Point[]) => {
      setPages((prev) =>
        prev.map((p, i) => (i === index ? { ...p, corners } : p))
      );
    },
    []
  );

  const updatePageRotation = useCallback(
    (index: number, rotation: number) => {
      setPages((prev) =>
        prev.map((p, i) => (i === index ? { ...p, rotation } : p))
      );
    },
    []
  );

  const clearPages = useCallback(() => {
    setPages((prev) => {
      prev.forEach((p) => URL.revokeObjectURL(p.thumbnailUrl));
      return [];
    });
    setActivePage(0);
  }, []);

  return {
    pages,
    activePage,
    addPage,
    removePage,
    reorderPages,
    updatePageCorners,
    updatePageRotation,
    setActivePage,
    clearPages,
    pageCount: pages.length,
  };
}
