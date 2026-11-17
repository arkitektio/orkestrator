import { describe, expect, it } from "vitest";

import { PhasorColorMode, PhasorCursorKind } from "@/mikro/api/graphql";
import { cursorPaletteColor, type PhasorScale } from "../../platform/model/phasor";
import type { PhasorCursorDef } from "../../platform/model/renderGraph";
import {
  cursorCentre,
  cursorDetail,
  cursorLabel,
  cursorRgb,
  formatPhasorValue,
  patchCursor,
  removeCursor,
} from "./phasorCursors";

const circle = (patch: Partial<PhasorCursorDef> = {}): PhasorCursorDef => ({
  kind: PhasorCursorKind.Circle,
  label: null,
  visible: true,
  color: null,
  g: 0.5,
  s: 0.5,
  radius: 0.1,
  points: null,
  ...patch,
});

const polygon = (points: number[][]): PhasorCursorDef => ({
  kind: PhasorCursorKind.Polygon,
  label: null,
  visible: true,
  color: null,
  g: null,
  s: null,
  radius: null,
  points,
});

const UNSCALED: PhasorScale = { omega: null, dimension: null, harmonic: 1 };
/** 80 MHz, first harmonic, per ms (the time base). */
const FLIM: PhasorScale = { omega: (2 * Math.PI * 80e6) / 1000, dimension: "time", harmonic: 1 };

describe("cursor rows", () => {
  it("names an unnamed cursor by its position", () => {
    expect(cursorLabel(circle(), 0)).toBe("Cursor 1");
    expect(cursorLabel(circle({ label: "  " }), 2)).toBe("Cursor 3");
    expect(cursorLabel(circle({ label: "NADH bound" }), 2)).toBe("NADH bound");
  });

  it("takes the palette colour of its position until it has its own", () => {
    expect(cursorRgb(circle(), 1)).toEqual(cursorPaletteColor(1));
    expect(cursorRgb(circle({ color: [1, 2, 3] }), 1)).toEqual([1, 2, 3]);
  });

  it("centres a polygon on its corners' mean", () => {
    expect(cursorCentre(polygon([[0, 0], [1, 0], [1, 1], [0, 1]]))).toEqual([0.5, 0.5]);
    expect(cursorCentre(polygon([]))).toBeNull();
    expect(cursorCentre(circle({ g: null }))).toBeNull();
  });

  it("says only the shape when the axis has no scale", () => {
    expect(cursorDetail(circle(), PhasorColorMode.Phase, UNSCALED)).toBe("circle");
    expect(cursorDetail(polygon([[0, 0], [1, 0], [1, 1]]), PhasorColorMode.Phase, UNSCALED)).toBe(
      "polygon · 3 corners",
    );
  });

  it("adds the lifetime at the centre over a calibrated microtime axis", () => {
    // (0.5, 0.5) is the semicircle's apex: tan(φ) = 1, so τ = 1/ω ≈ 1.99 ns at 80 MHz.
    expect(cursorDetail(circle(), PhasorColorMode.Phase, FLIM)).toBe("circle · 1.99 ns");
  });

  it("formats a base-unit value for reading", () => {
    expect(formatPhasorValue(2.5e-6, FLIM)).toBe("2.50 ns");
    expect(formatPhasorValue(0.52, { omega: 1, dimension: "length", harmonic: 1 })).toBe("520 nm");
    expect(formatPhasorValue(0.3, UNSCALED)).toBeNull();
    expect(formatPhasorValue(Number.NaN, FLIM)).toBeNull();
  });
});

describe("cursor edits", () => {
  it("patches one cursor and leaves the others' identity alone", () => {
    const cursors = [circle(), circle()];
    const next = patchCursor(cursors, 1, { visible: false });
    expect(next[0]).toBe(cursors[0]);
    expect(next[1].visible).toBe(false);
  });

  it("keeps the later cursors' colours when one before them is removed", () => {
    const cursors = [circle(), circle(), circle(), circle({ color: [9, 9, 9] })];
    const next = removeCursor(cursors, 1);
    expect(next).toHaveLength(3);
    // Untouched: still before the gap, still on its position's colour.
    expect(next[0]).toBe(cursors[0]);
    // Moved from position 2 to 1: pinned to the colour it had at 2.
    expect(cursorRgb(next[1], 1)).toEqual(cursorPaletteColor(2));
    expect(next[2].color).toEqual([9, 9, 9]);
  });

  it("pins nothing when the last cursor is removed", () => {
    const cursors = [circle(), circle()];
    expect(removeCursor(cursors, 1)).toEqual([cursors[0]]);
  });
});
