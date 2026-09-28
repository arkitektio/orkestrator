// @vitest-environment jsdom
import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { createPickMaterial, createPickSlotUniform, pickOutputNode } from "./gpuPickNodes";
import { buildWgsl } from "./__testing__/nodeWgsl";

describe("the pick output node", () => {
  it("builds to WGSL with the id, the slot and a view depth, and no colour transform", () => {
    const slot = createPickSlotUniform();
    const material = createPickMaterial();
    material.outputNode = pickOutputNode(7, slot);
    const target = new THREE.RenderTarget(5, 5, { type: THREE.FloatType });
    const { fragment } = buildWgsl(new THREE.Mesh(new THREE.BoxGeometry(), material), {
      renderTarget: target,
    });
    // The texel contract, verbatim: (ordinal + 1, slot + 1, -viewZ, 1).
    expect(fragment).toMatch(
      /output\.color = vec4<f32>\( \( 7\.0 \+ 1\.0 \), \( object\.\w+ \+ 1\.0 \), \( - v_positionView\.z \), 1\.0 \)/,
    );
    // Raw data: no sRGB encode on the output.
    expect(fragment).not.toMatch(/sRGBTransferOETF|LinearTosRGB/);
  });

  it("is opaque, unblended and depth-tested", () => {
    const material = createPickMaterial(THREE.DoubleSide);
    expect(material.transparent).toBe(false);
    expect(material.blending).toBe(THREE.NoBlending);
    expect(material.depthTest && material.depthWrite).toBe(true);
    expect(material.side).toBe(THREE.DoubleSide);
  });
});
