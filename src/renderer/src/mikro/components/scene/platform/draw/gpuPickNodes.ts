import { MeshBasicNodeMaterial } from "three/webgpu";
import * as THREE from "three";
import * as TSLTyped from "three/tsl";

// three's TSL TypeScript surface lags the runtime API (node method chaining is
// typed dynamically) — the escape hatch every node material here uses.
/* eslint-disable @typescript-eslint/no-explicit-any */
const TSL = TSLTyped as any;
const { float, positionView, uniform, vec4 } = TSL;

/**
 * The GPU half of `gpuPick.ts`'s texel contract: `(ordinal + 1, slot + 1,
 * viewDepth, 1)` into the RGBA32F pick target. `encodePickTexel` is its CPU
 * mirror and the one the tests pin.
 *
 * `positionView` is whatever the material's position path made it — the
 * batched instance transform for a BatchedMesh, `positionNode` for a
 * vertex-pulled material — so the depth lands on the drawn surface (a
 * network segment's centre line).
 */
export const pickOutputNode = (ordinal: any, slot: any): any =>
  vec4(float(ordinal).add(1), float(slot).add(1), positionView.z.negate(), 1);

/** The per-source slot uniform the picker writes before each source's pass. */
export const createPickSlotUniform = (): { value: number } => uniform(0, "float");

/**
 * A blank id-writing material: unlit, opaque, no blending — the output is raw
 * data, and blending or a colour transform would corrupt it. The caller sets
 * `outputNode` (discards first, then `pickOutputNode`) and whatever position
 * path its display material uses. `outputNode` bypasses the lighting and
 * colour-space output entirely (`NodeMaterial.setup`), and the target is
 * never the output target, so no tone mapping applies either.
 */
export const createPickMaterial = (side: THREE.Side = THREE.FrontSide): MeshBasicNodeMaterial => {
  const material = new MeshBasicNodeMaterial();
  material.name = "gpu-pick";
  material.transparent = false;
  material.blending = THREE.NoBlending;
  material.depthTest = true;
  material.depthWrite = true;
  material.fog = false;
  material.side = side;
  return material;
};
