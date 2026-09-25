import { useEffect, useMemo } from "react";
import * as THREE from "three";

import {
  createLabelPlaneNodeMaterial,
  updateLabelNodes,
} from "./labelNodeMaterials";
import { useLabelColorLut } from "./useLabelColorLut";
import {
  buildLabelUniformData,
  labelDataSignature,
} from "./labelUniforms";
import { buildAffineMatrix } from "../../platform/coords/worldTransform";

import { perfMonitor } from "../../platform/perf/perfMonitor";
import { slabBaseZOf, useBrickLayer, useBrickPlaneProbe } from "../bricks/layers/useBrickPlaneProbe";
import {
  useBrickMaterialBundle,
  usePlaneTraversalUniforms,
} from "../bricks/layers/useBrickMaterialBundle";
import { useBrickStore } from "../bricks/store/brickSlice";

/**
 * A label mask drawn as ONE full-layer quad, the same shape as `BrickPlaneLayer`
 * and over the same brick pool — the mask shares the image path's data entirely
 * (a Lens over an array, so the same planner, pool and residency) and differs
 * only in how a sampled value becomes colour.
 *
 * The two halves it does NOT own:
 *  - the level walk and the atlas tap live in `labelNodeMaterials.ts`, which
 *    imports the traversal from `brickNodeMaterials.ts` so there is one copy in
 *    lockstep with the CPU mirror;
 *  - the probe lives in `useBrickPlaneProbe`, shared with the image plane.
 *    Probing a mask is its PRIMARY interaction: it is what drives
 *    `AttributeProbeTracker` to resolve the object's attribute row, the same
 *    relation a `colorBys` entry colours by.
 *
 * `renderOrder` 2 puts a mask above the image plane's 1, which is what makes a
 * mask-over-image read correctly with `NormalBlending` and no depth write.
 */
export const BrickLabelPlaneLayer = ({ layerId }: { layerId: string }) => {
  perfMonitor.countRender("BrickLabelPlaneLayer"); // no-op unless a recording is armed

  // SCALAR plan subscriptions only (P9c/P17): the plan object churns identity
  // per replan; this component consumes only these.
  const planTargetLevel = useBrickStore((s) => s.nodePlans[layerId]?.targetLevel);
  const planSlabZ = useBrickStore((s) => s.nodePlans[layerId]?.slabZ);
  const planHasNodes = useBrickStore(
    (s) => (s.nodePlans[layerId]?.nodes.length ?? 0) > 0,
  );
  // Re-render on pool lifecycle only, never the streaming residency counter.
  useBrickStore((s) => s.poolsVersion);
  const brickSystem = useBrickStore((s) => s.brickSystem);

  const layer = useBrickLayer(layerId);

  const affineMatrix = useMemo(
    () => (layer ? buildAffineMatrix(layer) : new THREE.Matrix4().identity()),
    [layer],
  );

  const pool = brickSystem?.getLayerPool(layerId) ?? null;

  const { groupRef, handlers } = useBrickPlaneProbe({ layerId, layer, pool });

  const labelData = useMemo(() => buildLabelUniformData(layer), [layer]);
  // A string, so the update effect does not re-run on the record's identity
  // churning every render (same reason `channelDataSignature` exists).
  const labelSignature = labelDataSignature(labelData);

  const slabBaseZ = slabBaseZOf(planSlabZ, pool);

  // Recreated only when the pool is rebuilt (the mesh remounts on that key);
  // everything dynamic flows through the uniform NODES below.
  const bundle = useBrickMaterialBundle(
    pool,
    (p) => createLabelPlaneNodeMaterial(p, p, labelData),
  );

  useEffect(() => {
    if (!bundle || planTargetLevel === undefined) return;
    updateLabelNodes(bundle.nodes, labelData);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bundle, labelSignature, planTargetLevel, slabBaseZ]);

  // The traversal contract, shared with the other plane material.
  usePlaneTraversalUniforms(bundle?.nodes, {
    desiredLevel: planTargetLevel,
    slabBaseZ,
  });

  // The picked colouring and the active filter rules, resolved into the
  // material's colour LUT. Shared with the other label mode — same table, same
  // indexing; only what a texel is USED for differs.
  useLabelColorLut(bundle?.nodes, layer);

  if (layer?.visible === false) return null;
  if (!planHasNodes || !pool || !bundle) return null;

  const base = pool.geometry.levels[0];
  const totalX = base.spatialShape[0] * base.scale[0];
  const totalY = base.spatialShape[1] * base.scale[1];

  return (
    <group
      matrix={affineMatrix}
      matrixAutoUpdate={false}
      ref={groupRef}
      // From `useBrickPlaneProbe` — spread rather than written out, because
      // `undefined` vs a function is the raycast gate (P20).
      {...handlers}
    >
      {/* Corner-anchored, exactly as the image plane: the unit quad is offset by
          half its size so group-local spans [0..shape] and voxel v renders at
          affine(v) — COORDINATE_SYSTEMS.md "Coordinate conventions". */}
      <mesh
        key={pool.structureSignature}
        scale={[totalX, totalY, 1]}
        position={[totalX / 2, totalY / 2, 0]}
        renderOrder={2}
      >
        <planeGeometry args={[1, 1]} />
        <primitive object={bundle.material} attach="material" />
      </mesh>
    </group>
  );
};
