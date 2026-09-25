import * as THREE from "three";
import { describe, expect, it } from "vitest";
import {
  intersectsPlane,
  isAnnotationInView,
  pinsSatisfied,
  sceneCoverages,
  zSpanOf,
  type CoverageLayer,
} from "./annotationVisibility";
import { finestLayerZStep, physicalToVoxelZStrict, sceneZExtent } from "../../platform/coords/worldTransform";
import type { LayerState } from "../../platform/model/layerModel";

/**
 * A c/t/z/y/x layer with 8 z slices at 1 µm spacing (identity affine): x/y/z
 * rendered, c the intensity axis with channels 0 and 1 visible, t collapsible.
 */
const layerWith = (overrides: Partial<CoverageLayer> = {}): CoverageLayer => ({
  visible: true,
  zAxis: "z",
  affineMatrix: null,
  intensityAxis: "c",
  phasorAxis: null,
  channels: [
    { intensityIndex: 0, visible: true },
    { intensityIndex: 1, visible: true },
    { intensityIndex: 2, visible: false },
  ],
  phasors: [],
  lens: {
    slices: [],
    renderAxes: { x: "x", y: "y", z: "z" },
    axisNames: ["c", "t", "z", "y", "x"],
    shape: [3, 10, 8, 512, 512],
    dataset: {
      axisNames: ["c", "t", "z", "y", "x"],
      dataArrays: [{ level: 0, shape: [3, 10, 8, 512, 512] }],
    },
  },
  ...overrides,
});

/** Coverages for one layer at t=5, either flat at `planeZ` or in the volume. */
const coveragesAt = (planeZ: number | null, layers: CoverageLayer[] = [layerWith()]) =>
  sceneCoverages(layers, { t: 5 }, planeZ);

describe("pinsSatisfied", () => {
  it("shows a shape that pins nothing — it spans every coordinate", () => {
    expect(pinsSatisfied([], coveragesAt(null))).toBe(true);
    expect(pinsSatisfied(null, coveragesAt(null))).toBe(true);
  });

  it("hides a shape pinned to a t the sliders are not on", () => {
    expect(pinsSatisfied([{ name: "t", value: 5 }], coveragesAt(null))).toBe(true);
    expect(pinsSatisfied([{ name: "t", value: 3 }], coveragesAt(null))).toBe(false);
  });

  it("needs EVERY pin met", () => {
    const coverages = coveragesAt(null);
    expect(
      pinsSatisfied(
        [
          { name: "t", value: 5 },
          { name: "c", value: 1 },
        ],
        coverages,
      ),
    ).toBe(true);
    expect(
      pinsSatisfied(
        [
          { name: "t", value: 5 },
          { name: "c", value: 2 },
        ],
        coverages,
      ),
    ).toBe(false);
  });

  it("follows the channel toggles — c=2 is switched off", () => {
    expect(pinsSatisfied([{ name: "c", value: 2 }], coveragesAt(null))).toBe(false);
  });

  it("keeps a pin nothing on screen can evaluate", () => {
    // No layer has a 'q' axis — an unevaluable claim is not a failed one.
    expect(pinsSatisfied([{ name: "q", value: 1 }], coveragesAt(null))).toBe(true);
    // Same for a scene with no image layers at all.
    expect(pinsSatisfied([{ name: "t", value: 3 }], [])).toBe(true);
  });

  it("takes any one layer showing the index", () => {
    const other = layerWith();
    const coverages = sceneCoverages([layerWith(), other], { t: 5 }, null);
    // The second layer is scrubbed to t=5 as well, so raise its own default by
    // giving it a slice the scene selection overrides — both still show t=5.
    expect(pinsSatisfied([{ name: "t", value: 5 }], coverages)).toBe(true);
    expect(pinsSatisfied([{ name: "t", value: 4 }], coverages)).toBe(false);
  });

  it("ignores hidden layers — their slice is not on screen", () => {
    const coverages = sceneCoverages([layerWith({ visible: false })], { t: 5 }, null);
    expect(coverages).toHaveLength(0);
    expect(pinsSatisfied([{ name: "t", value: 5 }], coverages)).toBe(true);
  });
});

describe("z pins", () => {
  it("resolves a z pin against the plane the flat view draws", () => {
    const flat = coveragesAt(2);
    expect(pinsSatisfied([{ name: "z", value: 2 }], flat)).toBe(true);
    expect(pinsSatisfied([{ name: "z", value: 3 }], flat)).toBe(false);
  });

  it("spans z in the volume — every slice is drawn", () => {
    const volume = coveragesAt(null);
    expect(pinsSatisfied([{ name: "z", value: 3 }], volume)).toBe(true);
    expect(pinsSatisfied([{ name: "z", value: 7 }], volume)).toBe(true);
  });

  it("leaves z whole for a single-slice layer — every z is its z", () => {
    const flat = coveragesAt(
      2,
      [
        layerWith({
          lens: {
            slices: [],
            renderAxes: { x: "x", y: "y", z: "z" },
            axisNames: ["c", "t", "z", "y", "x"],
            shape: [3, 10, 1, 512, 512],
            dataset: {
              axisNames: ["c", "t", "z", "y", "x"],
              dataArrays: [{ level: 0, shape: [3, 10, 1, 512, 512] }],
            },
          },
        }),
      ],
    );
    expect(pinsSatisfied([{ name: "z", value: 4 }], flat)).toBe(true);
  });
});

describe("zSpanOf", () => {
  it("takes the z extent of the points", () => {
    expect(
      zSpanOf([
        [0, 0, 4],
        [10, 10, 9],
      ]),
    ).toEqual({ min: 4, max: 9 });
  });

  it("is a plane's worth for a single point", () => {
    expect(zSpanOf([[1, 2, 3]])).toEqual({ min: 3, max: 3 });
  });

  it("skips points with no readable z", () => {
    expect(zSpanOf([[1, 2], [3, 4, 5]])).toEqual({ min: 5, max: 5 });
    expect(zSpanOf([])).toBeNull();
    expect(zSpanOf([[1, 2]])).toBeNull();
  });
});

describe("intersectsPlane", () => {
  it("keeps a shape drawn on the slice, half a slab either side", () => {
    const span = { min: 4, max: 4 };
    expect(intersectsPlane(span, 4, 1)).toBe(true);
    expect(intersectsPlane(span, 4.4, 1)).toBe(true);
    expect(intersectsPlane(span, 4.6, 1)).toBe(false);
    expect(intersectsPlane(span, 3.5, 1)).toBe(true);
  });

  it("hides a shape a slice away", () => {
    expect(intersectsPlane({ min: 4, max: 4 }, 5, 1)).toBe(false);
    expect(intersectsPlane({ min: 4, max: 4 }, 0, 1)).toBe(false);
  });

  it("shows a shape on every slice it crosses", () => {
    const cube = { min: 2, max: 6 };
    expect(intersectsPlane(cube, 2, 1)).toBe(true);
    expect(intersectsPlane(cube, 4, 1)).toBe(true);
    expect(intersectsPlane(cube, 6, 1)).toBe(true);
    expect(intersectsPlane(cube, 7, 1)).toBe(false);
  });

  it("keeps a shape with no readable geometry", () => {
    expect(intersectsPlane(null, 99, 1)).toBe(true);
  });
});

describe("isAnnotationInView", () => {
  const plane = { z: 4, slabThickness: 1 };

  it("needs both the pins and the plane", () => {
    const coverages = coveragesAt(4);
    const onPlane = { min: 4, max: 4 };
    expect(
      isAnnotationInView(
        { coordinates: [{ name: "t", value: 5 }], zSpan: onPlane },
        { coverages, plane },
      ),
    ).toBe(true);
    // Right slice, wrong t.
    expect(
      isAnnotationInView(
        { coordinates: [{ name: "t", value: 3 }], zSpan: onPlane },
        { coverages, plane },
      ),
    ).toBe(false);
    // Right t, wrong slice.
    expect(
      isAnnotationInView(
        { coordinates: [{ name: "t", value: 5 }], zSpan: { min: 6, max: 6 } },
        { coverages, plane },
      ),
    ).toBe(false);
  });

  it("ignores the shape's z where there is no plane (3D, or a scene with no z)", () => {
    expect(
      isAnnotationInView(
        { coordinates: [], zSpan: { min: 99, max: 99 } },
        { coverages: coveragesAt(null), plane: null },
      ),
    ).toBe(true);
  });
});

describe("sceneZExtent", () => {
  const zLayer = (zSize: number, spacing: number): LayerState =>
    ({
      zAxis: "z",
      affineMatrix: [
        [1, 0, 0, 0],
        [0, 1, 0, 0],
        [0, 0, spacing, 0],
        [0, 0, 0, 1],
      ],
      lens: { axisNames: ["z", "y", "x"], shape: [zSize, 512, 512] },
    }) as unknown as LayerState;

  it("pools the physical range and reports one slice's thickness", () => {
    expect(sceneZExtent([zLayer(8, 2)])).toEqual({ min: 0, max: 14, step: 2 });
  });

  it("takes the finest layer's step across the pooled range", () => {
    const extent = sceneZExtent([zLayer(8, 2), zLayer(15, 1)]);
    expect(extent?.min).toBe(0);
    expect(extent?.max).toBe(14);
    expect(extent?.step).toBe(1);
  });

  it("is null when nothing has a z axis to scrub", () => {
    expect(sceneZExtent([])).toBeNull();
    expect(sceneZExtent([zLayer(1, 2)])).toBeNull();
  });
});

describe("finestLayerZStep (the visibility slab's thickness)", () => {
  const zLayer = (zSize: number, spacing: number): LayerState =>
    ({
      zAxis: "z",
      affineMatrix: [
        [1, 0, 0, 0],
        [0, 1, 0, 0],
        [0, 0, spacing, 0],
        [0, 0, 0, 1],
      ],
      lens: { axisNames: ["z", "y", "x"], shape: [zSize, 512, 512] },
    }) as unknown as LayerState;

  it("is the finest layer's OWN step, immune to a sparse stack's range", () => {
    // 101 slices at 0.1 next to 2 slices 1000 apart: the pooled average
    // (sceneZExtent.step) is 10 — a hundred times too thick a slab.
    expect(finestLayerZStep([zLayer(101, 0.1), zLayer(2, 1000)])).toBeCloseTo(0.1);
    expect(finestLayerZStep([zLayer(8, 2)])).toBe(2);
    expect(finestLayerZStep([zLayer(1, 2)])).toBeNull();
  });
});

describe("physicalToVoxelZStrict", () => {
  const identity = new THREE.Matrix4();
  it("rounds in range, refuses out of range instead of clamping", () => {
    expect(physicalToVoxelZStrict(identity, 3.4, 7)).toBe(3);
    expect(physicalToVoxelZStrict(identity, 7.4, 7)).toBe(7);
    expect(physicalToVoxelZStrict(identity, 9, 7)).toBeNull();
    expect(physicalToVoxelZStrict(identity, -1, 7)).toBeNull();
  });
});

describe("z pins against a plane OUTSIDE the layer's stack", () => {
  it("reads UNMET instead of 'met at the clamped end slice'", () => {
    // Stack shifted to world z 100..107; a plane at 500 is far past it.
    const shifted = layerWith({
      affineMatrix: [
        [1, 0, 0, 0],
        [0, 1, 0, 0],
        [0, 0, 1, 100],
        [0, 0, 0, 1],
      ],
    });
    const far = sceneCoverages([shifted], { t: 5 }, 500);
    expect(pinsSatisfied([{ name: "z", value: 7 }], far)).toBe(false);
    const on = sceneCoverages([shifted], { t: 5 }, 107);
    expect(pinsSatisfied([{ name: "z", value: 7 }], on)).toBe(true);
  });
});
