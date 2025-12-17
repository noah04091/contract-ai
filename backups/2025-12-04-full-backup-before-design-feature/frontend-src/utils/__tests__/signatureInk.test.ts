// 🧪 signatureInk.test.ts - Unit tests for signature ink detection

import { signatureHasInk } from "../signatureInk";

function blankPng(): string {
  // 1×1 px transparent PNG (minimal size)
  return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAoMBgSMdKIsAAAAASUVORK5CYII=";
}

describe("signatureHasInk", () => {
  test("returns false for blank/empty image", () => {
    expect(signatureHasInk(blankPng())).toBe(false);
  });

  test("returns true for larger/drawn image", () => {
    // Simulate drawn signature: longer Base64 string (10KB+)
    const fakeDrawnSignature = "data:image/png;base64," + "A".repeat(120000);
    expect(signatureHasInk(fakeDrawnSignature)).toBe(true);
  });

  test("handles invalid data URLs gracefully", () => {
    expect(signatureHasInk("invalid")).toBe(false);
    expect(signatureHasInk("")).toBe(false);
    expect(signatureHasInk("data:image/png;base64,")).toBe(false);
  });

  test("respects custom threshold", () => {
    const mediumSize = "data:image/png;base64," + "A".repeat(300);

    // With low threshold: should pass
    expect(signatureHasInk(mediumSize, 0.000001)).toBe(true);

    // With high threshold: should fail
    expect(signatureHasInk(mediumSize, 0.1)).toBe(false);
  });
});
