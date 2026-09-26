// @vitest-environment jsdom
import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { createFabriksMaterial, createFabriksPickMaterial } from "./fabriksMaterial";
import { createPickSlotUniform } from "../../../platform/draw/gpuPickNodes";
import { buildWgsl } from "../../../platform/draw/__testing__/nodeWgsl";

/** A BatchedMesh shaped like the fabriks batch: position + objectOrdinal. */
const batchOf = (material: THREE.Material) => {
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  geometry.deleteAttribute("normal");
  geometry.deleteAttribute("uv");
  geometry.setAttribute(
    "objectOrdinal",
    new THREE.BufferAttribute(new Float32Array(geometry.attributes.position.count).fill(3), 1),
  );
  const batch = new THREE.BatchedMesh(4, 100, 100, material);
  batch.addInstance(batch.addGeometry(geometry));
  return batch;
};

const pickTarget = () => new THREE.RenderTarget(5, 5, { type: THREE.FloatType });

describe("the fabriks pick material", () => {
  it("builds on a BatchedMesh through the batched position path", () => {
    const handle = createFabriksMaterial();
    const pick = createFabriksPickMaterial(handle, createPickSlotUniform());
    const { vertex, fragment } = buildWgsl(batchOf(pick), { renderTarget: pickTarget() });
    // The batch node: per-instance matrices from the batch's texture, the
    // same way the display material is placed.
    expect(vertex).toMatch(/textureLoad|batch/i);
    expect(vertex).toContain("objectOrdinal");
    // Filter + isolate discards, then the id texel.
    expect(fragment.match(/discard/g)?.length).toBeGreaterThanOrEqual(2);
    expect(fragment).toMatch(/output\.color = vec4<f32>\( \( \w+ \+ 1\.0 \), \( \w+\.\w+ \+ 1\.0 \)/);
  });

  it("shares the display material's selection and LUT state", () => {
    const handle = createFabriksMaterial();
    const pick = createFabriksPickMaterial(handle, createPickSlotUniform());
    expect(pick.side).toBe(handle.material.side);
    expect(pick.transparent).toBe(false);
    expect(pick.blending).toBe(THREE.NoBlending);
    // The display material still builds on the same batch (no graph was
    // stolen by the sibling).
    const { fragment } = buildWgsl(batchOf(handle.material));
    expect(fragment).toContain("fn main");
  });
});
