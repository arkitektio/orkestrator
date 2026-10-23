import { describe, expect, it, vi } from "vitest";

import { hasUnnamedSlots, isPlaceable, unplaceableReason } from "./placeable";
import {
  resolveCollectionMatrix,
  type MeshCollectionRef,
  type MeshLayerVariant,
} from "./collectionPlacement";

/**
 * Placement is the server's `asAffine` reduced by axis name and NOTHING else —
 * no path walk, no anchor layer, no centering, no flips (COORDINATE_SYSTEMS.md
 * §1 R1). These tests pin the axis-slot mapping, the separately-named output
 * side, and the unplaceable degradation.
 */

const WORLD_ZYX = {
  id: "cs:world",
  axes: [
    { name: "z", type: "SPACE", order: 0 },
    { name: "y", type: "SPACE", order: 1 },
    { name: "x", type: "SPACE", order: 2 },
  ],
};
const CONTEXT = { worldCoordinateSystem: WORLD_ZYX };

/** A per-axis scale so each axis's matrix slot is distinguishable. */
const SCALE_AS_AFFINE = {
  matrix: [
    [2, 0, 0, 0], // z
    [0, 3, 0, 0], // y
    [0, 0, 4, 0], // x
  ],
  inputAxes: ["z", "y", "x"],
  outputAxes: ["z", "y", "x"],
  total: true,
};

const collection = (over: {
  id?: string;
  axes?: string[];
  storeAxes?: string[] | null;
}): MeshCollectionRef =>
  ({
    id: over.id ?? "col:1",
    coordinateSystem: {
      id: "cs:mesh",
      axes: (over.axes ?? ["z", "y", "x"]).map((name) => ({ name })),
    },
    store: { id: "store:1", axes: over.storeAxes ?? null },
  }) as unknown as MeshCollectionRef;

const layerWith = (asAffine: unknown): MeshLayerVariant =>
  ({ __typename: "MeshLayer", id: "layer:1", asAffine }) as unknown as MeshLayerVariant;

describe("resolveCollectionMatrix", () => {
  it("maps vertex component slots by the store's declared axis order, onto the world by name", () => {
    // Slot 0 declared as z: the vertex's first component IS the z coordinate,
    // so it lands on the world's z (render z, scaled 2), not on render x. A
    // (z, y, x) store therefore renders un-transposed against a (z, y, x)
    // world — the declaration is what makes that possible.
    const m = resolveCollectionMatrix(
      layerWith(SCALE_AS_AFFINE),
      collection({ id: "col:declared", storeAxes: ["z", "y", "x"] }),
      CONTEXT,
    );
    // Column-major: elements[row + 4·col].
    expect(m.elements[8]).toBeCloseTo(4); // world x ← slot 2 (x), scaled 4
    expect(m.elements[5]).toBeCloseTo(3); // world y ← slot 1 (y), scaled 3
    expect(m.elements[2]).toBeCloseTo(2); // world z ← slot 0 (z), scaled 2
    expect(m.elements[0]).toBe(0);
    expect(m.elements[10]).toBe(0);
  });

  it("never guesses a slot order: a store naming none is identity, warning once", () => {
    // The old fallback read the CS's last three axes reversed, which turned an
    // (x, y, z)-declared collection into (z, y, x) and drew it transposed.
    // Such a layer is not dispatched at all (`hasUnnamedSlots`); a panel that
    // still asks for a matrix gets the collection's own space.
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const col = collection({ id: "col:unnamed", axes: ["x", "y", "z"], storeAxes: null });
      const m = resolveCollectionMatrix(layerWith(SCALE_AS_AFFINE), col, CONTEXT);
      expect(m.elements).toEqual([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn).toHaveBeenCalledWith(expect.stringContaining("names no vertex slots"));

      // Recomputes (identity churn upstream) never warn again.
      resolveCollectionMatrix(layerWith(SCALE_AS_AFFINE), col, CONTEXT);
      expect(warn).toHaveBeenCalledTimes(1);
    } finally {
      warn.mockRestore();
    }
  });

  it("names the output side by the WORLD's axes, not the collection's", () => {
    // A collection cut in (row, col) placed into a (y, x) world: the store's
    // slot 0 is `col`. Reducing with the collection's names on both sides
    // would indexOf to -1 and drop the placement.
    const m = resolveCollectionMatrix(
      layerWith({
        matrix: [
          [-2, 0, 100], // y ← row (reflected)
          [0, 2, 5], // x ← col
        ],
        inputAxes: ["row", "col"],
        outputAxes: ["y", "x"],
        total: false,
      }),
      collection({ id: "col:rowcol", axes: ["row", "col"], storeAxes: ["col", "row"] }),
      {
        worldCoordinateSystem: {
          id: "cs:world2d",
          axes: [
            { name: "c", type: "CHANNEL", order: 0 },
            { name: "y", type: "SPACE", order: 1 },
            { name: "x", type: "SPACE", order: 2 },
          ],
        },
      },
    );
    // Column-major THREE elements: [0]=m00, [5]=m11, [12]=tx, [13]=ty.
    expect(m.elements[0]).toBeCloseTo(2);
    expect(m.elements[12]).toBeCloseTo(5);
    expect(m.elements[5]).toBeCloseTo(-2);
    expect(m.elements[13]).toBeCloseTo(100);
  });

  it("degrades a null asAffine to identity — the collection's own space — warning once", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const m = resolveCollectionMatrix(
        layerWith(null),
        collection({ id: "col:unregistered", storeAxes: ["z", "y", "x"] }),
        CONTEXT,
      );
      expect(m.elements).toEqual([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn).toHaveBeenCalledWith(expect.stringContaining("asAffine is null"));
    } finally {
      warn.mockRestore();
    }
  });
});

describe("a collection whose store names no slots", () => {
  const placed = { asAffine: SCALE_AS_AFFINE };

  it("is not placeable, and says why", () => {
    const layer = { ...placed, collection: { store: { axes: null } } };
    expect(hasUnnamedSlots(layer)).toBe(true);
    expect(isPlaceable(layer)).toBe(false);
    expect(unplaceableReason(layer)).toBe("unnamed-slots");
  });

  it("is placeable once the store names them", () => {
    expect(isPlaceable({ ...placed, collection: { store: { axes: ["x", "y", "z"] } } })).toBe(true);
  });

  it("leaves a layer without a store alone (annotations, images)", () => {
    expect(hasUnnamedSlots({ ...placed, collection: {} })).toBe(false);
    expect(hasUnnamedSlots(placed)).toBe(false);
  });
});
