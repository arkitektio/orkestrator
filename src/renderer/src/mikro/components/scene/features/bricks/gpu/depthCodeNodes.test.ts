// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { NodeMaterial } from "three/webgpu";
import * as TSLTyped from "three/tsl";

import { emitDepthComposite, makeDepthCompositeUniforms } from "./depthCodeNodes";
import { fragmentWgsl } from "./__testing__/wgslHarness";

/* eslint-disable @typescript-eslint/no-explicit-any */
const TSL = TSLTyped as any;

/**
 * The compositor's depth branch, built the way `VolumeCompositor` builds it —
 * a runtime `If` over the scientific passthrough. Text only (no device): the
 * smoke alarm for an invalid module, which on WebGPU just drops the quad.
 */
describe("depth composite WGSL", () => {
  it("builds the runtime depth branch over the passthrough", () => {
    const volume = new THREE.Texture();
    const depth = new THREE.Texture();
    const u = makeDepthCompositeUniforms();
    const base = TSL.texture(volume, TSL.screenUV);
    const material = new NodeMaterial();
    material.colorNode = TSL.Fn(() => {
      const out = TSL.vec4(base).toVar("compositeOut");
      TSL.If(TSL.float(u.uDepthView).greaterThan(0.5), () => {
        out.assign(emitDepthComposite(u, base, depth, TSL.screenUV));
      });
      return out;
    })();
    const wgsl = fragmentWgsl(material);
    expect(wgsl).toContain("fn main");
    expect(wgsl).toContain("compositeOut");
    // Centre + 8 neighbours of the packed-depth texture, all explicit-LOD:
    // an implicit-derivative `textureSample` inside the lowered `select`
    // branches fails WGSL uniformity analysis and drops the pipeline.
    expect((wgsl.match(/textureSampleLevel\(/g) ?? []).length).toBeGreaterThanOrEqual(9);
    // The only implicit sample left is the passthrough tap, at top level.
    expect((wgsl.match(/textureSample\(/g) ?? []).length).toBe(1);
  });
});
