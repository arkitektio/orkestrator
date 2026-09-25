import { useEffect, useState } from "react";

import { centerBaseVoxel, centerWorldRay, levelDownsampleFactor } from "./octree/centerLod";
import { effectiveProbeLayerId } from "../../platform/probe/probeTargeting";
import { buildAffineMatrix } from "../../platform/coords/worldTransform";
import { layerDisplayLabel } from "../../platform/layerui/layerIdentity";
import { useSceneStoreApi } from "../../platform/stores/sceneStore";
import { useViewStoreApi } from "../../platform/stores/viewStore";
import { useViewerStore } from "../../platform/stores/viewerStore";
import { useBrickStoreApi } from "./store/brickSlice";

/**
 * Which pyramid level the middle of the screen is actually showing.
 *
 * The renderer degrades silently by design — an unstreamed brick renders from
 * a coarser resident one, per pixel, with no CPU involvement (OCTREE_RENDERER
 * §1) — which is exactly why a picture can look finished while it is still a
 * quarter-resolution stand-in. This badge is the one place that says so.
 *
 * It reports the level the residency manager can SERVE at the center voxel
 * (`residentLevelAt`, whose coarse walk is the CPU mirror of the shader's page
 * table walk), not the level the plan asked for; when the two differ the
 * plan's target is shown alongside, which is what "still refining" looks
 * like.
 *
 * TARGET LAYER: the probe's (`effectiveProbeLayerId`) — the same "exactly one
 * layer answers" rule the readouts already use, so the badge and the probe
 * panel can never describe different layers.
 *
 * CADENCE: a poll, not a subscription. The inputs are camera (viewStore, up to
 * ~17 writes/s) and residency (`residencyVersion`, a streaming-cadence counter
 * React may not subscribe to — P17); polling reads both through `getState`,
 * costs one identity comparison when nothing moved, and re-renders only when
 * the displayed level actually changes.
 */

const POLL_MS = 150;

type CenterLod = {
  layerLabel: string;
  voxel: readonly [number, number, number];
  /** Level actually resident at that voxel; null while nothing is yet. */
  level: number | null;
  /** The plan's finest requested level — what it is refining towards. */
  target: number;
  levelCount: number;
  /** Base voxels per level voxel at `level` (1 = full resolution). */
  factor: number | null;
};

const sameLod = (a: CenterLod | null, b: CenterLod | null): boolean =>
  a === b ||
  (!!a &&
    !!b &&
    a.layerLabel === b.layerLabel &&
    a.level === b.level &&
    a.target === b.target &&
    a.levelCount === b.levelCount &&
    a.factor === b.factor &&
    a.voxel[0] === b.voxel[0] &&
    a.voxel[1] === b.voxel[1] &&
    a.voxel[2] === b.voxel[2]);

export const CenterLodReadout = () => {
  const show = useViewerStore((s) => s.showLodReadout);
  const viewerApi = useBrickStoreApi();
  const sceneApi = useSceneStoreApi();
  const viewApi = useViewStoreApi();
  const [lod, setLod] = useState<CenterLod | null>(null);

  useEffect(() => {
    // Nothing to clear when hidden: the render below is null either way, and
    // the first tick after re-enabling recomputes from scratch.
    if (!show) return;

    // Inputs whose IDENTITY (or count) fully determines the answer — the
    // idle-poll early-out. The residency counter is in here because bricks
    // streaming in are exactly what makes the served level improve without
    // the camera moving.
    let lastSignature: readonly unknown[] = [];

    const resolve = (): CenterLod | null => {
      const viewer = viewerApi.getState();
      const scene = sceneApi.getState();
      const view = viewApi.getState();

      const brickSystem = viewer.brickSystem;
      const viewProjection = view.viewProjectionMatrix;
      if (!brickSystem || !viewProjection) return null;

      const layerId = effectiveProbeLayerId(viewer.probeLayerId, scene.layers);
      if (!layerId) return null;
      const layer = scene.layers.find((candidate) => candidate.id === layerId);
      const plan = viewer.nodePlans[layerId];
      const pool = brickSystem.getLayerPool(layerId);
      if (!layer || !plan || !pool) return null;

      const ray = centerWorldRay(viewProjection, view.cameraPose?.coordinateSystem);
      if (!ray) return null;

      const base = pool.geometry.levels[0];
      const voxel = centerBaseVoxel({
        mode: plan.mode,
        ray,
        affine: buildAffineMatrix(layer),
        baseShape: base.spatialShape,
        slabZ: plan.slabZ,
      });
      if (!voxel) return null;

      const level = brickSystem.residentLevelAt(layerId, voxel, plan.targetLevel);
      return {
        layerLabel: layerDisplayLabel(layer),
        voxel,
        level,
        target: plan.targetLevel,
        levelCount: pool.geometry.levels.length,
        factor:
          level === null ? null : levelDownsampleFactor(pool.geometry.levels[level].scale),
      };
    };

    const tick = () => {
      const viewer = viewerApi.getState();
      const view = viewApi.getState();
      const signature = [
        view.viewProjectionMatrix,
        viewer.residencyVersion,
        viewer.nodePlans,
        viewer.probeLayerId,
        viewer.brickSystem,
        sceneApi.getState().layers,
      ] as const;
      if (
        signature.length === lastSignature.length &&
        signature.every((value, index) => value === lastSignature[index])
      ) {
        return;
      }
      lastSignature = signature;
      const next = resolve();
      setLod((previous) => (sameLod(previous, next) ? previous : next));
    };

    tick();
    const timer = setInterval(tick, POLL_MS);
    return () => clearInterval(timer);
  }, [show, viewerApi, sceneApi, viewApi]);

  if (!show || !lod) return null;

  const refining = lod.level !== null && lod.level > lod.target;
  const resolutionLabel =
    lod.factor === null ? "streaming" : lod.factor <= 1 ? "full res" : `1/${lod.factor}`;
  const title =
    `${lod.layerLabel} — center voxel [${lod.voxel.join(", ")}]\n` +
    (lod.level === null
      ? `nothing resident yet; the plan asks for level ${lod.target}`
      : `showing level ${lod.level} of ${lod.levelCount - 1} (${resolutionLabel})` +
        (refining ? `, refining towards level ${lod.target}` : "")) +
    "\nUnstreamed bricks render from a coarser resident level, per pixel.";

  return (
    <div
      className="pointer-events-none absolute bottom-2 left-8 z-10 flex items-center gap-1 rounded bg-black/40 px-1 py-0.5 font-mono text-[10px] tabular-nums text-white"
      title={title}
    >
      <span>LOD {lod.level ?? "—"}</span>
      <span className="text-white/50">{resolutionLabel}</span>
      {refining && <span className="text-amber-300">→ {lod.target}</span>}
    </div>
  );
};
