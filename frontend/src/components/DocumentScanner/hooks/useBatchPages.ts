/**
 * useBatchPages Hook
 *
 * State-Management für gescannte Seiten via useReducer.
 * pages + activePage werden atomar verwaltet — keine stale closures.
 *
 * Jede Seite hat:
 * - imageBlob: Full-Resolution JPEG für Backend-Upload
 * - previewDataUrl: Data-URL für sofortige Preview-Anzeige (kein Blob-URL)
 * - correctedBlob: Optional, nach Perspektiv-Korrektur
 * - thumbnailUrl: Blob-URL für korrigiertes Bild (nach Korrektur)
 */

import { useReducer, useCallback } from "react";
import type { Point } from "../types";

export interface ScannedPage {
  id: string;
  imageBlob: Blob;
  correctedBlob: Blob | null;
  previewDataUrl: string;
  thumbnailUrl: string;
  corners: Point[] | null;
  rotation: number;
  timestamp: number;
}

interface BatchState {
  pages: ScannedPage[];
  activePage: number;
}

type BatchAction =
  | { type: "ADD_PAGE"; blob: Blob; dataUrl: string; corners: Point[] | null; maxPages: number }
  | { type: "REMOVE_PAGE"; index: number }
  | { type: "REORDER"; fromIndex: number; toIndex: number }
  | { type: "UPDATE_CORNERS"; index: number; corners: Point[] }
  | { type: "UPDATE_ROTATION"; index: number; rotation: number }
  | { type: "UPDATE_CORRECTED_IMAGE"; index: number; blob: Blob }
  | { type: "SET_ACTIVE"; index: number }
  | { type: "CLEAR" };

let pageIdCounter = 0;

function batchReducer(state: BatchState, action: BatchAction): BatchState {
  switch (action.type) {
    case "ADD_PAGE": {
      if (state.pages.length >= action.maxPages) return state;
      if (!action.blob || action.blob.size === 0) return state;
      const newPage: ScannedPage = {
        id: `page-${++pageIdCounter}`,
        imageBlob: action.blob,
        correctedBlob: null,
        previewDataUrl: action.dataUrl,
        thumbnailUrl: action.dataUrl, // Initial: Data-URL (wird nach Korrektur zu Blob-URL)
        corners: action.corners,
        rotation: 0,
        timestamp: Date.now(),
      };
      const newPages = [...state.pages, newPage];
      return { pages: newPages, activePage: newPages.length - 1 };
    }

    case "REMOVE_PAGE": {
      const { index } = action;
      if (index < 0 || index >= state.pages.length) return state;
      // Nur Blob-URLs revoken (nicht Data-URLs)
      const page = state.pages[index];
      if (page.thumbnailUrl.startsWith("blob:")) {
        URL.revokeObjectURL(page.thumbnailUrl);
      }
      const newPages = state.pages.filter((_, i) => i !== index);
      const newActive = newPages.length === 0
        ? 0
        : Math.min(state.activePage, newPages.length - 1);
      return { pages: newPages, activePage: newActive };
    }

    case "REORDER": {
      const { fromIndex, toIndex } = action;
      const updated = [...state.pages];
      const [moved] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, moved);
      return { pages: updated, activePage: toIndex };
    }

    case "UPDATE_CORNERS": {
      const { index, corners } = action;
      return {
        ...state,
        pages: state.pages.map((p, i) => (i === index ? { ...p, corners } : p)),
      };
    }

    case "UPDATE_ROTATION": {
      const { index, rotation } = action;
      return {
        ...state,
        pages: state.pages.map((p, i) => (i === index ? { ...p, rotation } : p)),
      };
    }

    case "UPDATE_CORRECTED_IMAGE": {
      const { index, blob } = action;
      if (index < 0 || index >= state.pages.length) return state;
      // Alten Blob-URL freigeben (nur wenn es ein Blob-URL war)
      const oldUrl = state.pages[index].thumbnailUrl;
      if (oldUrl.startsWith("blob:")) {
        URL.revokeObjectURL(oldUrl);
      }
      const newUrl = URL.createObjectURL(blob);
      return {
        ...state,
        pages: state.pages.map((p, i) =>
          i === index ? { ...p, correctedBlob: blob, thumbnailUrl: newUrl } : p
        ),
      };
    }

    case "SET_ACTIVE": {
      return { ...state, activePage: action.index };
    }

    case "CLEAR": {
      state.pages.forEach((p) => {
        if (p.thumbnailUrl.startsWith("blob:")) {
          URL.revokeObjectURL(p.thumbnailUrl);
        }
      });
      return { pages: [], activePage: 0 };
    }

    default:
      return state;
  }
}

interface UseBatchPagesReturn {
  pages: ScannedPage[];
  activePage: number;
  addPage: (blob: Blob, dataUrl: string, corners: Point[] | null) => void;
  removePage: (index: number) => void;
  reorderPages: (fromIndex: number, toIndex: number) => void;
  updatePageCorners: (index: number, corners: Point[]) => void;
  updatePageRotation: (index: number, rotation: number) => void;
  updateCorrectedImage: (index: number, blob: Blob) => void;
  setActivePage: (index: number) => void;
  clearPages: () => void;
  pageCount: number;
}

export function useBatchPages(maxPages: number = 50): UseBatchPagesReturn {
  const [state, dispatch] = useReducer(batchReducer, {
    pages: [],
    activePage: 0,
  });

  const addPage = useCallback(
    (blob: Blob, dataUrl: string, corners: Point[] | null) => {
      dispatch({ type: "ADD_PAGE", blob, dataUrl, corners, maxPages });
    },
    [maxPages]
  );

  const removePage = useCallback((index: number) => {
    dispatch({ type: "REMOVE_PAGE", index });
  }, []);

  const reorderPages = useCallback((fromIndex: number, toIndex: number) => {
    dispatch({ type: "REORDER", fromIndex, toIndex });
  }, []);

  const updatePageCorners = useCallback((index: number, corners: Point[]) => {
    dispatch({ type: "UPDATE_CORNERS", index, corners });
  }, []);

  const updatePageRotation = useCallback((index: number, rotation: number) => {
    dispatch({ type: "UPDATE_ROTATION", index, rotation });
  }, []);

  const updateCorrectedImage = useCallback((index: number, blob: Blob) => {
    dispatch({ type: "UPDATE_CORRECTED_IMAGE", index, blob });
  }, []);

  const setActivePage = useCallback((index: number) => {
    dispatch({ type: "SET_ACTIVE", index });
  }, []);

  const clearPages = useCallback(() => {
    dispatch({ type: "CLEAR" });
  }, []);

  return {
    pages: state.pages,
    activePage: state.activePage,
    addPage,
    removePage,
    reorderPages,
    updatePageCorners,
    updatePageRotation,
    updateCorrectedImage,
    setActivePage,
    clearPages,
    pageCount: state.pages.length,
  };
}
