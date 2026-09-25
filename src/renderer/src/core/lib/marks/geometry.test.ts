import { describe, expect, it } from "vitest";
import * as THREE from "three";
import {
  CAP,
  geometryFor,
  letterGeometry,
  OUTLINES,
  orbGeometry,
  plateGeometry,
} from "./geometry";
import type { MarkNode } from "./markNodes";

/**
 * No GPU needed: extrusion and glyph tessellation are pure CPU work, so the
 * geometry layer is fully testable here even though the renderers above it are
 * not.
 */
const node = (over: Partial<MarkNode>): MarkNode => ({
  key: "n",
  geom: "plate",
  plateGeom: "hex",
  material: "base",
  position: [0, 0, 0],
  rotation: [0, 0, 0],
  scale: 1,
  ...over,
});

describe("plateGeometry", () => {
  it("normalises every outline to a unit sphere, centred on the origin", () => {
    // This is the invariant the whole design rests on: it is what lets a star
    // and a hexagon carry the same visual weight, and what lets the extras sit
    // at fixed radii without being tuned per symbol. Nothing else checks it.
    //
    // The normalisation is by the bounding BOX's sphere, so that is what comes
    // out at exactly 1; a symbol's own tight sphere is smaller, and must be,
    // or it would reach the extras orbiting at 1.07.
    const box = new THREE.Box3();
    const sphere = new THREE.Sphere();
    for (const geom of Object.keys(OUTLINES)) {
      const g = plateGeometry(geom);
      g.computeBoundingBox();
      box.copy(g.boundingBox!).getBoundingSphere(sphere);
      expect(sphere.radius, geom).toBeCloseTo(1, 5);
      expect(sphere.center.length(), geom).toBeCloseTo(0, 5);

      g.computeBoundingSphere();
      expect(g.boundingSphere!.radius, geom).toBeLessThan(1);
    }
  });

  it("caches by outline, so a grid of marks extrudes each shape once", () => {
    expect(plateGeometry("hex")).toBe(plateGeometry("hex"));
    expect(plateGeometry("hex")).not.toBe(plateGeometry("star"));
  });

  it("falls back to the squircle for an unknown outline", () => {
    expect(plateGeometry("not-a-shape")).toBeInstanceOf(THREE.BufferGeometry);
  });

  it("has a cap height for every outline", () => {
    // A missing entry silently uses the default and crowds that symbol's letter.
    for (const geom of Object.keys(OUTLINES)) expect(CAP[geom], geom).toBeGreaterThan(0);
  });
});

describe("letterGeometry", () => {
  it("builds A-Z and 0-9", () => {
    for (const ch of "ABZ0159") {
      expect(letterGeometry(ch, "hex"), ch).toBeInstanceOf(THREE.BufferGeometry);
    }
  });

  it("returns null for a character the glyph table has no outline for", () => {
    // markParams already maps these to "?", but the renderers must survive one
    // slipping through rather than throwing mid-frame.
    expect(letterGeometry("?", "hex")).toBeNull();
    expect(letterGeometry("🎉", "hex")).toBeNull();
  });

  it("sizes the letter per outline, so a thin symbol is not crowded", () => {
    const onRing = letterGeometry("A", "ring")!;
    const onHex = letterGeometry("A", "hex")!;
    onRing.computeBoundingBox();
    onHex.computeBoundingBox();
    const height = (g: THREE.BufferGeometry) =>
      g.boundingBox!.max.y - g.boundingBox!.min.y;
    expect(CAP.ring).toBeLessThan(CAP.hex);
    expect(height(onRing)).toBeLessThan(height(onHex));
  });

  it("centres the letter on the plate", () => {
    const g = letterGeometry("A", "hex")!;
    g.computeBoundingBox();
    expect((g.boundingBox!.min.x + g.boundingBox!.max.x) / 2).toBeCloseTo(0, 6);
    expect((g.boundingBox!.min.y + g.boundingBox!.max.y) / 2).toBeCloseTo(0, 6);
  });
});

describe("geometryFor", () => {
  it("resolves every node kind a mark can contain", () => {
    expect(geometryFor(node({ geom: "plate" }))).toBe(plateGeometry("hex"));
    expect(geometryFor(node({ geom: "letter", letter: "A" }))).toBe(
      letterGeometry("A", "hex"),
    );
    expect(geometryFor(node({ geom: "orb" }))).toBe(orbGeometry());
    for (const geom of ["cubelet", "stud", "spike", "orbit"] as const) {
      expect(geometryFor(node({ geom })), geom).toBeInstanceOf(THREE.BufferGeometry);
    }
  });

  it("returns null for a letter node with no letter", () => {
    expect(geometryFor(node({ geom: "letter" }))).toBeNull();
  });
});
