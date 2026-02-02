/**
 * useCornerAdjustment Hook
 *
 * Verwaltet Drag-Interaktion für 4 Eckpunkte auf einem Bild.
 * Touch + Mouse Support mit Pointer Events API.
 */

import { useState, useRef, useCallback } from "react";
import type { Point } from "../types";

const DEFAULT_CORNERS: Point[] = [
  { x: 0.1, y: 0.1 },  // TL
  { x: 0.9, y: 0.1 },  // TR
  { x: 0.9, y: 0.9 },  // BR
  { x: 0.1, y: 0.9 },  // BL
];

/** Minimum distance between adjacent corners (5% of frame) */
const MIN_CORNER_DISTANCE = 0.05;

/**
 * Constrain a corner so it doesn't cross adjacent corners.
 * Order: [TL=0, TR=1, BR=2, BL=3]
 */
function constrainCorner(idx: number, pos: Point, corners: Point[]): Point {
  let { x, y } = pos;
  const d = MIN_CORNER_DISTANCE;

  switch (idx) {
    case 0: // TL: must be left-of TR, above BL
      x = Math.min(x, corners[1].x - d);
      y = Math.min(y, corners[3].y - d);
      break;
    case 1: // TR: must be right-of TL, above BR
      x = Math.max(x, corners[0].x + d);
      y = Math.min(y, corners[2].y - d);
      break;
    case 2: // BR: must be right-of BL, below TR
      x = Math.max(x, corners[3].x + d);
      y = Math.max(y, corners[1].y + d);
      break;
    case 3: // BL: must be left-of BR, below TL
      x = Math.min(x, corners[2].x - d);
      y = Math.max(y, corners[0].y + d);
      break;
  }

  // Clamp to [0, 1]
  x = Math.max(0, Math.min(1, x));
  y = Math.max(0, Math.min(1, y));

  return { x, y };
}

interface UseCornerAdjustmentReturn {
  corners: Point[];
  activeCorner: number | null;
  onPointerDown: (index: number, e: React.PointerEvent) => void;
  setCorners: (corners: Point[]) => void;
}

export function useCornerAdjustment(
  initialCorners?: Point[] | null,
  containerRef?: React.RefObject<HTMLElement | null>
): UseCornerAdjustmentReturn {
  const [corners, setCorners] = useState<Point[]>(
    initialCorners && initialCorners.length === 4
      ? initialCorners
      : DEFAULT_CORNERS
  );
  const [activeCorner, setActiveCorner] = useState<number | null>(null);
  const dragIndexRef = useRef<number | null>(null);

  const getRelativePosition = useCallback(
    (clientX: number, clientY: number): Point => {
      const el = containerRef?.current;
      if (!el) return { x: 0.5, y: 0.5 };

      const rect = el.getBoundingClientRect();
      return {
        x: Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)),
        y: Math.max(0, Math.min(1, (clientY - rect.top) / rect.height)),
      };
    },
    [containerRef]
  );

  const onPointerMove = useCallback(
    (e: PointerEvent) => {
      if (dragIndexRef.current === null) return;
      e.preventDefault();

      const pos = getRelativePosition(e.clientX, e.clientY);
      const idx = dragIndexRef.current;

      setCorners((prev) => {
        const next = [...prev];
        next[idx] = constrainCorner(idx, pos, prev);
        return next;
      });
    },
    [getRelativePosition]
  );

  const onPointerUp = useCallback(() => {
    dragIndexRef.current = null;
    setActiveCorner(null);
    document.removeEventListener("pointermove", onPointerMove);
    document.removeEventListener("pointerup", onPointerUp);
  }, [onPointerMove]);

  const onPointerDown = useCallback(
    (index: number, e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragIndexRef.current = index;
      setActiveCorner(index);

      // Sofort Position aktualisieren
      const pos = getRelativePosition(e.clientX, e.clientY);
      setCorners((prev) => {
        const next = [...prev];
        next[index] = constrainCorner(index, pos, prev);
        return next;
      });

      document.addEventListener("pointermove", onPointerMove);
      document.addEventListener("pointerup", onPointerUp);
    },
    [getRelativePosition, onPointerMove, onPointerUp]
  );

  return { corners, activeCorner, onPointerDown, setCorners };
}
