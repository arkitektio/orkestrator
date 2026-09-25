import * as THREE from "three";
import { NodeMaterial } from "three/webgpu";
import * as TSLTyped from "three/tsl";

// three's TSL TypeScript surface lags the runtime API this module needs
// (swizzle method chaining, node-valued math). The node GRAPH is typed
// dynamically; the PUBLIC surface (the uniform handles the React layer writes
// to) is hand-typed below. Same convention as `features/bricks/gpu/brickNodeMaterials.ts`.
/* eslint-disable @typescript-eslint/no-explicit-any */
const TSL = TSLTyped as any;
const {
  Fn,
  abs,
  distance,
  float,
  fract,
  fwidth,
  min,
  mix,
  modelWorldMatrix,
  oneMinus,
  positionGeometry,
  pow,
  uniform,
  varying,
  vec2,
  vec4,
} = TSL;

/** A TSL uniform node as the React layer sees it: a `.value` box. */
type UniformNodeLike<T> = { value: T };

export interface GridUniforms {
  cellSize: UniformNodeLike<number>;
  sectionSize: UniformNodeLike<number>;
  cellColor: UniformNodeLike<THREE.Color>;
  sectionColor: UniformNodeLike<THREE.Color>;
  cellThickness: UniformNodeLike<number>;
  sectionThickness: UniformNodeLike<number>;
  fadeDistance: UniformNodeLike<number>;
  fadeStrength: UniformNodeLike<number>;
  fadeFrom: UniformNodeLike<number>;
  /** Camera position projected onto the grid plane (updated per frame). */
  camProjPosition: UniformNodeLike<THREE.Vector3>;
}

export interface GridMaterialHandle {
  material: NodeMaterial;
  uniforms: GridUniforms;
}

/**
 * WebGPU-native TSL port of drei's `GridMaterial` (`@react-three/drei/core/Grid.js`),
 * a raw WebGL `ShaderMaterial` the WebGPU `NodeBuilder` cannot compile. The grid
 * math — anti-aliased two-tier cell/section lines via screen-space derivatives,
 * plus a camera-distance fade — is a 1:1 port of drei's shader. `followCamera`
 * (unused by `ScaleGrid`) is omitted.
 */
export function createGridMaterial(infiniteGrid: boolean): GridMaterialHandle {
  const uniforms: GridUniforms = {
    cellSize: uniform(0.5),
    sectionSize: uniform(1),
    cellColor: uniform(new THREE.Color()),
    sectionColor: uniform(new THREE.Color()),
    cellThickness: uniform(0.5),
    sectionThickness: uniform(1),
    fadeDistance: uniform(100),
    fadeStrength: uniform(1),
    fadeFrom: uniform(1),
    camProjPosition: uniform(new THREE.Vector3()),
  };

  // Uniform handles carry both a `.value` box (for the React layer) and TSL
  // node methods (`.mul`, …) used to build the graph. The typed view exposes
  // `.value`; `u` is the untyped node view for graph construction.
  const u = uniforms as unknown as Record<keyof GridUniforms, any>;

  const material = new NodeMaterial();
  material.transparent = true;
  material.depthWrite = false;
  material.side = THREE.BackSide;

  // Vertex: drei swizzles the XY plane onto XZ (`position.xzy`) and, for an
  // infinite grid, blows the unit plane up to cover the fade radius.
  const scale = infiniteGrid ? float(1).add(u.fadeDistance) : float(1);
  const localNode = positionGeometry.xzy.mul(scale);
  material.positionNode = localNode;

  // Carry the swizzled local position and its world position to the fragment.
  const vLocal = varying(localNode);
  const vWorld = varying(modelWorldMatrix.mul(vec4(localNode, 1.0)).xyz);

  material.outputNode = Fn(() => {
    const localXZ = vec2(vLocal.x, vLocal.z);

    const getGrid = (size: unknown, thickness: unknown) => {
      const r = localXZ.div(size);
      const grid = abs(fract(r.sub(0.5)).sub(0.5)).div(fwidth(r));
      const line = min(grid.x, grid.y).add(1.0).sub(thickness);
      return oneMinus(min(line, 1.0));
    };

    const g1 = getGrid(u.cellSize, u.cellThickness);
    const g2 = getGrid(u.sectionSize, u.sectionThickness);

    const from = u.camProjPosition.mul(u.fadeFrom);
    const dist = distance(from, vWorld);
    const d = oneMinus(min(dist.div(u.fadeDistance), 1.0));

    const color = mix(
      u.cellColor,
      u.sectionColor,
      min(1.0, u.sectionThickness.mul(g2)),
    );

    const base = g1.add(g2).mul(pow(d, u.fadeStrength));
    const alpha = mix(base.mul(0.75), base, g2);

    return vec4(color, alpha);
  })();

  return { material, uniforms };
}
