// @vitest-environment jsdom
import * as THREE from "three";
import { describe, expect, it } from "vitest";

import { MIN_GLASS_ALPHA, asBlendedGlass, cloneForView, isTransmissive } from "./glass";

/** Glass as `GLTFLoader` hands it over from KHR_materials_transmission: opaque, depth-writing, transmissive. */
const loadedGlass = (transmission: number, attenuation = new THREE.Color(1, 1, 1)) =>
  new THREE.MeshPhysicalMaterial({ transmission, ior: 1.52, attenuationColor: attenuation });

describe("asBlendedGlass", () => {
  it("draws fully transmissive glass as faint blended glass, never as an opaque depth writer", () => {
    const glass = loadedGlass(1);
    expect(glass.transparent).toBe(false);
    asBlendedGlass(glass);
    expect(glass.transmission).toBe(0);
    expect(glass.transparent).toBe(true);
    expect(glass.depthWrite).toBe(false);
    expect(glass.opacity).toBeCloseTo(MIN_GLASS_ALPHA);
  });

  it("keeps less transmissive glass denser, tinted by its attenuation colour", () => {
    const edge = loadedGlass(0.6, new THREE.Color(0.55, 0.85, 0.78));
    asBlendedGlass(edge);
    expect(edge.opacity).toBeCloseTo(1 - 0.6 * (1 - MIN_GLASS_ALPHA));
    expect(edge.color.g).toBeGreaterThan(edge.color.r);
  });

  it("leaves a material that does not transmit alone", () => {
    const steel = new THREE.MeshStandardMaterial({ metalness: 1 });
    asBlendedGlass(steel);
    expect(steel.transparent).toBe(false);
    expect(steel.depthWrite).toBe(true);
  });
});

describe("cloneForView", () => {
  it("converts its own copies and leaves the file's materials as loaded", () => {
    const glass = loadedGlass(1);
    const root = new THREE.Group().add(new THREE.Mesh(new THREE.BoxGeometry(), glass));
    const view = cloneForView(root);
    const drawn = (view.root.children[0] as THREE.Mesh).material as THREE.MeshPhysicalMaterial;
    expect(drawn).not.toBe(glass);
    expect(isTransmissive(drawn)).toBe(false);
    expect(isTransmissive(glass)).toBe(true);
    view.dispose();
  });
});
