/**
 * One Euro Filter
 *
 * Adaptiver Low-Pass-Filter für stabile Eckpunkt-Positionen.
 * Bei Stillstand: Starke Glättung (kein Jitter)
 * Bei Bewegung: Weniger Lag (schnelle Reaktion)
 *
 * Basiert auf: http://cristal.univ-lille.fr/~casiez/1euro/
 */

import type { Point } from "./imageProcessing";

class LowPassFilter {
  private y: number | null = null;
  private s: number | null = null;

  filter(value: number, alpha: number): number {
    if (this.y === null || this.s === null) {
      this.y = value;
      this.s = value;
    } else {
      this.s = alpha * value + (1 - alpha) * this.s;
      this.y = this.s;
    }
    return this.y;
  }

  reset(): void {
    this.y = null;
    this.s = null;
  }
}

class OneEuroFilter {
  private freq: number;
  private minCutoff: number;
  private beta: number;
  private dCutoff: number;
  private xFilter: LowPassFilter;
  private dxFilter: LowPassFilter;
  private lastTime: number | null = null;
  private lastValue: number | null = null;

  constructor(
    freq: number = 30,
    minCutoff: number = 1.0,
    beta: number = 0.007,
    dCutoff: number = 1.0
  ) {
    this.freq = freq;
    this.minCutoff = minCutoff;
    this.beta = beta;
    this.dCutoff = dCutoff;
    this.xFilter = new LowPassFilter();
    this.dxFilter = new LowPassFilter();
  }

  private alpha(cutoff: number): number {
    const tau = 1.0 / (2 * Math.PI * cutoff);
    const te = 1.0 / this.freq;
    return 1.0 / (1.0 + tau / te);
  }

  filter(value: number, timestamp: number): number {
    if (this.lastTime !== null && timestamp !== this.lastTime) {
      this.freq = 1.0 / ((timestamp - this.lastTime) / 1000);
    }
    this.lastTime = timestamp;

    const dx =
      this.lastValue !== null
        ? (value - this.lastValue) * this.freq
        : 0;
    this.lastValue = value;

    const edx = this.dxFilter.filter(dx, this.alpha(this.dCutoff));
    const cutoff = this.minCutoff + this.beta * Math.abs(edx);

    return this.xFilter.filter(value, this.alpha(cutoff));
  }

  reset(): void {
    this.xFilter.reset();
    this.dxFilter.reset();
    this.lastTime = null;
    this.lastValue = null;
  }
}

/**
 * Filtert 4 Eckpunkte (8 Koordinaten) mit je einem One Euro Filter.
 */
export class CornersFilter {
  private filters: OneEuroFilter[];

  constructor(
    freq: number = 24,
    minCutoff: number = 0.8,
    beta: number = 0.005
  ) {
    this.filters = Array.from(
      { length: 8 },
      () => new OneEuroFilter(freq, minCutoff, beta)
    );
  }

  filter(corners: Point[], timestamp: number): Point[] {
    return corners.map((corner, i) => ({
      x: this.filters[i * 2].filter(corner.x, timestamp),
      y: this.filters[i * 2 + 1].filter(corner.y, timestamp),
    }));
  }

  reset(): void {
    this.filters.forEach((f) => f.reset());
  }
}
