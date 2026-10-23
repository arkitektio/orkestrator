// @vitest-environment jsdom
import * as THREE from "three";
import { describe, expect, it } from "vitest";

import {
  MAX_METALNESS,
  SLAB_RENDER_ORDER,
  adoptMeshes,
  applyAppearance,
  createOverrideMaterial,
  lensClipPlanes,
} from "./fixtureScene";

/** One glass pane and one steel bracket, as an exporter would write them. */
const fixture = () => {
  const root = new THREE.Group();
  const glass = new THREE.MeshStandardMaterial({ color: 0xffffff, opacity: 0.4, transparent: true });
  const steel = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 1 });
  const pane = new THREE.Mesh(new THREE.BoxGeometry(24, 24, 0.17), glass);
  const bracket = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), steel);
  root.add(pane, bracket);
  return { root, glass, steel, pane, bracket };
};

const OPAQUE = { opacity: 1, materialColor: null, wireframe: false, slab: false };

describe("adoptMeshes", () => {
  it("draws per-layer clones, leaving the shared file's materials alone", () => {
    const { root, steel, bracket } = fixture();
    adoptMeshes(root);
    expect(bracket.material).not.toBe(steel);
    expect(steel.metalness).toBe(1);
  });

  it("caps metalness, since nothing in the scene is there to reflect", () => {
    const { root, bracket } = fixture();
    adoptMeshes(root);
    expect((bracket.material as THREE.MeshStandardMaterial).metalness).toBe(MAX_METALNESS);
  });
});

describe("applyAppearance", () => {
  it("multiplies the layer's opacity into each material's own", () => {
    const { root, pane, bracket } = fixture();
    const records = adoptMeshes(root);
    applyAppearance(records, createOverrideMaterial(), { ...OPAQUE, opacity: 0.5 });
    expect((pane.material as THREE.Material).opacity).toBeCloseTo(0.2);
    expect((bracket.material as THREE.Material).opacity).toBeCloseTo(0.5);
  });

  it("keeps a see-through part out of the depth buffer, so it never occludes the volume", () => {
    const { root, pane, bracket } = fixture();
    const records = adoptMeshes(root);
    applyAppearance(records, createOverrideMaterial(), OPAQUE);
    expect((pane.material as THREE.Material).depthWrite).toBe(false);
    expect((bracket.material as THREE.Material).depthWrite).toBe(true);
    expect((bracket.material as THREE.Material).transparent).toBe(false);
  });

  it("returns to exactly the file's materials when the override is cleared", () => {
    const { root, pane } = fixture();
    const records = adoptMeshes(root);
    const authored = pane.material;
    const override = createOverrideMaterial();

    applyAppearance(records, override, { ...OPAQUE, materialColor: [255, 0, 0, 255] });
    expect(pane.material).toBe(override);
    expect((override as THREE.MeshStandardMaterial).color.r).toBeCloseTo(1);

    applyAppearance(records, override, { ...OPAQUE, opacity: 0.5 });
    applyAppearance(records, override, OPAQUE);
    expect(pane.material).toBe(authored);
    expect((pane.material as THREE.Material).opacity).toBeCloseTo(0.4);
  });

  it("draws as an overlay in 2D: no depth test, above the image", () => {
    const { root, bracket } = fixture();
    const records = adoptMeshes(root);
    applyAppearance(records, createOverrideMaterial(), { ...OPAQUE, slab: true, wireframe: true });
    expect((bracket.material as THREE.Material).depthTest).toBe(false);
    expect((bracket.material as THREE.MeshStandardMaterial).wireframe).toBe(true);
    expect(bracket.renderOrder).toBe(SLAB_RENDER_ORDER);
  });
});

describe("lensClipPlanes", () => {
  const keeps = (planes: readonly THREE.Plane[], point: THREE.Vector3) =>
    planes.every((plane) => plane.distanceToPoint(point) >= 0);

  it("states the window in the model's axes and carries it into world", () => {
    // mm → µm, and the world's x is the model's x.
    const matrix = new THREE.Matrix4().makeScale(1000, 1000, 1000);
    const planes = lensClipPlanes([{ axis: "x", min: 0, max: 5 }], ["x", "y", "z"], matrix);
    expect(keeps(planes, new THREE.Vector3(2500, 0, 0))).toBe(true);
    expect(keeps(planes, new THREE.Vector3(6000, 0, 0))).toBe(false);
    expect(keeps(planes, new THREE.Vector3(-1, 0, 0))).toBe(false);
  });

  it("clips nothing along an axis no window names, however far it is scaled", () => {
    const matrix = new THREE.Matrix4().makeScale(1e6, 1e6, 1e6);
    const planes = lensClipPlanes([{ axis: "x", min: 0 }], ["x", "y", "z"], matrix);
    expect(keeps(planes, new THREE.Vector3(1e9, -1e12, 1e12))).toBe(true);
  });

  it("finds the slot by axis name, not by position", () => {
    const planes = lensClipPlanes([{ axis: "z", max: 1 }], ["z", "y", "x"], new THREE.Matrix4());
    // `z` is slot 0, so the window bounds the first component.
    expect(keeps(planes, new THREE.Vector3(2, 0, 0))).toBe(false);
    expect(keeps(planes, new THREE.Vector3(0, 0, 2))).toBe(true);
  });
});
