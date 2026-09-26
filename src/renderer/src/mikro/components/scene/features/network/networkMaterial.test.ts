// @vitest-environment jsdom
import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { createNetworkGpuBundle, createNetworkUniforms } from "./networkMaterial";
import { buildWgsl } from "../../platform/draw/__testing__/nodeWgsl";

const bundle = () => createNetworkGpuBundle({ nodes: 16, edges: 16 }, createNetworkUniforms());

const withMaterial = (mesh: THREE.Mesh, material: THREE.Material) =>
  new THREE.Mesh(mesh.geometry, material);

const pickTarget = () => new THREE.RenderTarget(5, 5, { type: THREE.FloatType });

describe("the network materials build to WGSL", () => {
  const b = bundle();
  const draws = [
    ["segments", b.segments],
    ["node glyphs", b.nodeGlyphs],
    ["arrow glyphs", b.arrowGlyphs],
  ] as const;

  for (const [name, mesh] of draws) {
    it(`the ${name} display material pulls from the storage buffers`, () => {
      const { vertex, fragment } = buildWgsl(mesh);
      expect(vertex).toMatch(/var<storage, read>/);
      expect(vertex).toContain("instanceIndex");
      expect(fragment).toContain("fn main");
      // The visibility bit always discards.
      expect(fragment).toContain("discard");
    });

    it(`the ${name} pick sibling shares the vertex path and writes the id texel`, () => {
      const pick = b.pickMaterialFor(mesh)!;
      expect(pick).toBeTruthy();
      const display = mesh.material as THREE.Material & { vertexNode: unknown; positionNode: unknown };
      const sibling = pick as THREE.Material & { vertexNode: unknown; positionNode: unknown };
      expect(sibling.vertexNode).toBe(display.vertexNode);
      expect(sibling.positionNode).toBe(display.positionNode);
      expect(pick.side).toBe(display.side);

      const { vertex, fragment } = buildWgsl(withMaterial(mesh, pick), { renderTarget: pickTarget() });
      expect(vertex).toMatch(/var<storage, read>/);
      expect(fragment).toContain("discard");
      expect(fragment).toMatch(/output\.color = vec4<f32>\( \( \w+ \+ 1\.0 \), \( \w+\.\w+ \+ 1\.0 \)/);
    });
  }

  it("maps only its own three draws to pick materials", () => {
    expect(b.pickMaterialFor(new THREE.Mesh())).toBeNull();
    const materials = new Set(draws.map(([, mesh]) => b.pickMaterialFor(mesh)));
    expect(materials.size).toBe(3);
  });

  it("isolates segments in the pick exactly as on screen, glyphs never", () => {
    const count = (mesh: THREE.Mesh, material: THREE.Material) =>
      buildWgsl(withMaterial(mesh, material), { renderTarget: pickTarget() }).fragment.match(/discard/g)
        ?.length ?? 0;
    expect(count(b.segments, b.pickMaterialFor(b.segments)!)).toBe(2);
    expect(count(b.nodeGlyphs, b.pickMaterialFor(b.nodeGlyphs)!)).toBe(1);
    expect(count(b.arrowGlyphs, b.pickMaterialFor(b.arrowGlyphs)!)).toBe(1);
  });
});
