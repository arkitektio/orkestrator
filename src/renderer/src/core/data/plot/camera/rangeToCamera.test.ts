import { describe, expect, it } from "vitest";
import {
  frustumFor,
  pixelAtTime,
  rowAtPixel,
  timeAtPixel,
  timeDeltaForDrag,
  yAtPixel,
  zoomFactorForWheel,
} from "./rangeToCamera";

const window = { start: 1000, end: 2000 };

describe("frustumFor", () => {
  it("spans exactly the window, shifted by the origin the buffers use", () => {
    expect(frustumFor(window, 1000, 3)).toEqual({ left: 0, right: 1000, top: 0, bottom: -3 });
  });

  it("never collapses to zero height with no rows", () => {
    expect(frustumFor(window, 0, 0).bottom).toBe(-1);
  });
});

describe("pixel ↔ time", () => {
  it("round-trips", () => {
    for (const px of [0, 1, 250, 799, 800]) {
      expect(pixelAtTime(timeAtPixel(px, 800, window), 800, window)).toBeCloseTo(px, 9);
    }
  });

  it("puts the edges on the window's ends", () => {
    expect(timeAtPixel(0, 800, window)).toBe(1000);
    expect(timeAtPixel(800, 800, window)).toBe(2000);
  });

  it("does not divide by a zero-width canvas", () => {
    expect(timeAtPixel(10, 0, window)).toBe(1000);
    expect(pixelAtTime(1500, 800, { start: 5, end: 5 })).toBe(0);
  });
});

describe("pixel → row", () => {
  it("finds the row under the pointer", () => {
    expect(rowAtPixel(0, 300, 3)).toBe(0);
    expect(rowAtPixel(150, 300, 3)).toBe(1);
    expect(rowAtPixel(299, 300, 3)).toBe(2);
  });

  it("is null outside the stack or with no rows", () => {
    expect(rowAtPixel(300, 300, 3)).toBeNull();
    expect(rowAtPixel(-1, 300, 3)).toBeNull();
    expect(rowAtPixel(10, 300, 0)).toBeNull();
  });

  it("maps pixels onto world y consistently with the frustum", () => {
    expect(yAtPixel(0, 300, 3)).toBeCloseTo(0, 12);
    expect(yAtPixel(300, 300, 3)).toBe(-3);
  });
});

describe("gestures", () => {
  it("drags the window opposite to the pointer, in proportion", () => {
    // Dragging right by a quarter of the canvas reveals EARLIER time.
    expect(timeDeltaForDrag(200, 800, window)).toBe(-250);
  });

  it("zooms by the same relative amount per notch at any scale", () => {
    const f = zoomFactorForWheel(100);
    expect(f).toBeGreaterThan(1);
    expect(zoomFactorForWheel(-100) * f).toBeCloseTo(1, 12);
  });
});
