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
        next[idx] = pos;
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
        next[index] = pos;
        return next;
      });

      document.addEventListener("pointermove", onPointerMove);
      document.addEventListener("pointerup", onPointerUp);
    },
    [getRelativePosition, onPointerMove, onPointerUp]
  );

  return { corners, activeCorner, onPointerDown, setCorners };
}
