/**
 * Shared types for DocumentScanner components.
 */

export interface Point {
  x: number;
  y: number;
}

export interface DetectedEdges {
  corners: Point[];
  confidence: number;
}
