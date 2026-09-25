import { useCallback } from "react";

import { AnnotationKind } from "@/mikro/api/graphql";
import { buildAffineMatrix } from "../../../../../platform/coords/worldTransform";
import { useModeStoreApi } from "../../../../../platform/stores/modeStore";
import { useSceneStoreApi } from "../../../../../platform/stores/sceneStore";
import { useBrickStoreApi } from "../../../../bricks/store/brickSlice";
import { useMeshDesignStoreApi } from "../../../../meshDesign/store/meshDesignStore";
import { designToolById } from "../../../../meshDesign/tools/registry";
import type { DesignToolRunContext } from "../../../../meshDesign/tools/context";
import { weldSoup } from "../../../../meshDesign/ops/weld";
import { useCreateSceneAnnotation } from "../../../useCreateSceneAnnotation";
import { useBrushSkeletonStoreApi } from "../../brushSkeletonStore";
import { voxelCost } from "../../shared/corridorCost";
import { createCpuSkeletonEngine } from "../../shared/cpuEngine";
import { createGpuSkeletonEngine } from "../../shared/gpuEngine";
import { gpuSkeletonizerFor } from "../../shared/gpu/skeletonizerAccess";
import type { SkeletonEngine, SkeletonEngineContext } from "../../shared/engine";
import { tubeClampValue } from "../../meshes/tubeMarch";
import {
  climWindow,
  pickCorridor,
  soupToWorld,
  voxelWorldSize,
} from "../../shared/planning";
import { resampleStroke } from "../../shared/strokeModel";
import { traceChannelSlab, traceLayerShape, traceLevelSteps } from "../../shared/traceLayer";
import {
  MAX_STROKE_POINTS,
  runGrowLoop,
  runStrokeExtraction,
  type ExtractionContext,
} from "./extraction";

/**
 * The GESTURE orchestration of the skeleton brush and the smooth blob: the
 * store transitions around a captured stroke/click. The engine-level work
 * lives in `extraction.ts` (shared with the mesh-design tools), and DESIGN
 * mode dispatches the whole verdict to `features/meshDesign/tools/registry`
 * — this hook only decides WHICH of the two worlds a release belongs to.
 *
 * Nothing here subscribes (the `useTraceHop` rule): every input is read from
 * a store API when the gesture calls it, so the hook is usable on BOTH sides
 * of the Canvas boundary.
 */

/** Default brush radius, in level voxels at the extraction level. */
const DEFAULT_RADIUS_VOXELS = 4;

/** How long a saved centerline stays as a local preview (poll is ~5s). */
const SAVED_PREVIEW_CLEAR_MS = 6_000;

/** Live-drag budgets: smaller than the release-time ones so every re-mesh
 * stays a few milliseconds of GPU. GPU-only — a per-drag CPU march would
 * jank the very pointer stream that is painting. */
const LIVE_MAX_CORRIDOR_VOXELS = 1_000_000;
const LIVE_MAX_TUBE_VERTICES = 300_000;

export const useBrushSkeleton = () => {
  const sceneStoreApi = useSceneStoreApi();
  const viewerStoreApi = useBrickStoreApi();
  const brushApi = useBrushSkeletonStoreApi();
  const modeApi = useModeStoreApi();
  const designApi = useMeshDesignStoreApi();
  const { createSceneAnnotation } = useCreateSceneAnnotation();

  const resolveContext = useCallback(
    (layerId: string): ExtractionContext | null => {
      const layer = sceneStoreApi
        .getState()
        .layers.find((candidate) => candidate.id === layerId);
      const brickSystem = viewerStoreApi.getState().brickSystem;
      const shape = layer ? traceLayerShape(layer) : null;
      if (!layer || !brickSystem || !shape) return null;
      const pool = brickSystem.getLayerPool(layerId);
      if (!pool) return null;

      const affine = buildAffineMatrix(layer);
      const inverse = affine.clone().invert();
      const voxelSize = voxelWorldSize(affine);
      const levelSteps = traceLevelSteps(layer);
      const startLevel = Math.min(
        Math.max(viewerStoreApi.getState().nodePlans[layerId]?.targetLevel ?? 0, 0),
        Math.max(0, levelSteps.length - 1),
      );

      const engineContext: SkeletonEngineContext = {
        channel: traceChannelSlab(layer),
        window: climWindow(layer, pool),
        pool,
        sampleResident: (baseVoxel, level, channel) =>
          brickSystem.sampleResident(layerId, baseVoxel, level, channel),
      };
      const engines: SkeletonEngine[] = [];
      const skeletonizer = gpuSkeletonizerFor(brickSystem);
      if (skeletonizer) engines.push(createGpuSkeletonEngine(engineContext, skeletonizer));
      engines.push(createCpuSkeletonEngine(engineContext));

      return {
        layerId,
        affine,
        inverse,
        voxelSize,
        levelSteps,
        shape,
        startLevel,
        engineContext,
        engines,
        plan: ({ strokeWorld, radiusWorld, maxVoxels, minSpacingWorld }) =>
          pickCorridor({
            strokeWorld,
            radiusWorld,
            inverse,
            voxelSize,
            levelSteps,
            shape,
            startLevel,
            maxVoxels,
            minSpacingWorld,
          }),
      };
    },
    [sceneStoreApi, viewerStoreApi],
  );

  /**
   * Fill the store's blank radius from the layer's own scale — world units
   * vary by orders of magnitude between datasets, so the default has to be
   * derived, not chosen. Called on arming; a user-set radius is never moved.
   */
  const initRadiusForLayer = useCallback(
    (layerId: string) => {
      const layer = sceneStoreApi
        .getState()
        .layers.find((candidate) => candidate.id === layerId);
      if (!layer) return;
      const voxelSize = voxelWorldSize(buildAffineMatrix(layer));
      const finest = Math.min(...voxelSize);
      brushApi
        .getState()
        .initRadius(DEFAULT_RADIUS_VOXELS * finest, [finest, finest * 40]);
    },
    [sceneStoreApi, brushApi],
  );

  const extract = useCallback(async () => {
    const brush = brushApi.getState();
    const { stroke, strokeLayerId } = brush;
    if (!strokeLayerId || stroke.length < 1) return;
    const stale = () => brushApi.getState().status !== "extracting";

    // DESIGN: the whole verdict belongs to the armed tool.
    if (modeApi.getState().interactionMode === "DESIGN") {
      const tool = designToolById(brush.strokeTool);
      if (!tool?.run) {
        brushApi.getState().clear();
        return;
      }
      brush.setExtracting();
      const ctx: DesignToolRunContext = {
        stroke,
        layerId: strokeLayerId,
        extraction: resolveContext(strokeLayerId),
        brush,
        design: designApi.getState(),
        stale,
        fail: (message) => brushApi.getState().fail(message),
        clear: () => brushApi.getState().clear(),
        publishLive: (tube) => brushApi.getState().setLiveTube(tube),
      };
      await tool.run(ctx);
      return;
    }

    // ANNOTATE: extraction → candidate → the panel's save/discard verdict.
    brush.setExtracting();
    const ctx = resolveContext(strokeLayerId);
    if (!ctx) {
      brush.fail("The stroke's layer is no longer in the scene");
      return;
    }
    const radiusWorld =
      brush.radiusWorld ?? DEFAULT_RADIUS_VOXELS * Math.min(...ctx.voxelSize);
    // From 2 voxels of detail up, march a correspondingly coarser level: the
    // field itself is then at the requested resolution rather than a fine
    // one that is simplified away afterwards.
    const minSpacingWorld =
      brush.detailVoxels >= 2 ? brush.detailVoxels * Math.max(...ctx.voxelSize) : undefined;

    if (brush.strokeMode === "blob") {
      const outcome = await runGrowLoop(ctx, {
        seed: stroke[0],
        startRadius: radiusWorld,
        weights: brush.weights,
        tau: brush.tubeThreshold,
        smoothVoxels: Math.max(0, Math.floor(brush.blobSmoothness)),
        gapVoxels: Math.max(0, Math.floor(brush.blobGap)),
        minSpacingWorld,
        marcher: brush.marcher,
        stale,
        publishLive: (tube) => brushApi.getState().setLiveTube(tube),
      });
      if (stale()) return;
      const after = brushApi.getState();
      if (!outcome || outcome.tube.triangles === 0) {
        after.fail(
          "Nothing brighter than the Wrap threshold near the probe point — lower Wrap and try again",
        );
        return;
      }
      after.setCandidate(
        {
          points: [],
          layerId: strokeLayerId,
          level: outcome.level,
          holes: 0,
          tube: outcome.tube,
        },
        outcome.closed
          ? null
          : "Surface still touches the search boundary — the structure may extend further",
      );
      return;
    }

    let extraction;
    try {
      extraction = await runStrokeExtraction(ctx, stroke, {
        radiusWorld,
        weights: brush.weights,
        tau: brush.tubeThreshold,
        wantTube: brush.tubeEnabled,
        marcher: brush.marcher,
        minSpacingWorld,
        stale,
      });
    } catch (error) {
      brushApi.getState().fail(error instanceof Error ? error.message : String(error));
      return;
    }
    if (!extraction) return; // a newer gesture took over
    const after = brushApi.getState();
    if (after.status !== "extracting") return;
    after.setCandidate(
      {
        points: extraction.points,
        layerId: strokeLayerId,
        level: extraction.picked.level,
        holes: extraction.holes,
        tube: extraction.tube,
      },
      extraction.notes.length > 0 ? extraction.notes.join("; ") : null,
    );
  }, [brushApi, resolveContext, modeApi, designApi]);

  /**
   * The live drag preview: re-mesh the tube around the stroke AS PAINTED —
   * the GPU engine's tube-only path, no geodesic, so one round answers in
   * milliseconds. GPU-only by design; without a device the tube still
   * arrives on release via the CPU engine. Results landing after the stroke
   * ended are dropped by the store (`setLiveTube` guards the status).
   */
  const previewLiveTube = useCallback(async () => {
    const brush = brushApi.getState();
    const designing = modeApi.getState().interactionMode === "DESIGN";
    if (brush.status !== "painting" || !(brush.tubeEnabled || designing)) return;
    if (designing && brush.strokeTool === "carve") return; // a carve previews nothing
    const { stroke, strokeLayerId } = brush;
    if (!strokeLayerId || stroke.length < 2) return;

    const ctx = resolveContext(strokeLayerId);
    const gpu = ctx?.engines.find((engine) => engine.kind === "gpu");
    if (!ctx || !gpu) return;

    const radiusWorld =
      brush.radiusWorld ?? DEFAULT_RADIUS_VOXELS * Math.min(...ctx.voxelSize);
    const tubeIso = voxelCost(brush.tubeThreshold, brush.weights);
    // ONE snapshot of the stroke for both the plan and the kernel — samples
    // landing mid-call belong to the next preview round.
    const strokeWorld = resampleStroke(stroke, MAX_STROKE_POINTS);
    const picked = ctx.plan({
      strokeWorld,
      radiusWorld,
      maxVoxels: LIVE_MAX_CORRIDOR_VOXELS,
    });
    if (!picked) return;

    const result = await gpu.tube({
      picked,
      strokeLevelPts: strokeWorld.map(picked.worldToLevelVoxel),
      radiusWorld,
      weights: brush.weights,
      tube: {
        iso: tubeIso,
        clampValue: tubeClampValue(tubeIso),
        marcher: brush.marcher,
        smoothVoxels: 0,
        connectivity: null,
        maxVertices: LIVE_MAX_TUBE_VERTICES,
      },
    });
    if (!result) return;
    const after = brushApi.getState();
    if (after.status !== "painting" || after.strokeLayerId !== strokeLayerId) return;
    after.setLiveTube({
      positions: soupToWorld(result.positions, picked.step, ctx.affine),
      triangles: result.triangles,
      truncated: result.truncated,
    });
  }, [brushApi, resolveContext, modeApi]);

  /**
   * ANNOTATE's escape hatch into the designer: the candidate's surface
   * becomes a mesh in the design session (welded, indexed, world
   * coordinates) and the gesture is cleared.
   */
  const addToDesign = useCallback((): boolean => {
    const brush = brushApi.getState();
    const candidate = brush.candidate;
    const tube = candidate?.tube;
    if (!candidate || !tube || tube.triangles === 0) {
      brush.fail("Nothing to add — turn on Tube so the extraction produces a surface");
      return false;
    }
    const geometry = weldSoup(tube.positions);
    if (geometry.indices.length === 0) {
      brush.fail("The surface collapsed to nothing after welding");
      return false;
    }
    designApi.getState().addMesh({
      geometry,
      source: {
        kind: brush.strokeMode === "blob" ? "blob" : "tube",
        layerId: candidate.layerId,
        level: candidate.level,
      },
    });
    brush.clear();
    return true;
  }, [brushApi, designApi]);

  const save = useCallback(async () => {
    const brush = brushApi.getState();
    const candidate = brush.candidate;
    if (!candidate || brush.status !== "preview") return;
    if (modeApi.getState().interactionMode === "DESIGN") {
      addToDesign();
      return;
    }
    // A GROW candidate has no centerline — its whole payload is the tube.
    const hasPath = candidate.points.length >= 2;
    const tube = candidate.tube;
    if (!hasPath && !tube) return;
    if (!hasPath) {
      brush.fail("Surfaces are kept in Design mode — switch there to add this one");
      return;
    }
    brush.setSaving();
    let persistedAny = false;

    let after = brushApi.getState();
    if (hasPath) {
      const created = await createSceneAnnotation(
        AnnotationKind.Path,
        candidate.points.map((p) => [p[0], p[1], p[2]]),
      );
      after = brushApi.getState();
      if (after.candidate !== candidate) return; // a new stroke took over
      if (!created) {
        after.fail("Saving failed — the annotation was not created");
        return;
      }
      persistedAny = true;
    }

    // The tube is NOT persisted as an annotation any more: a painted surface
    // is a mesh, committed through the DESIGN mode as a fabriks collection.
    // In ANNOTATE the tube stays a local preview of what the stroke found.
    const savedNote = tube
      ? "Centerline saved — switch to Design mode to keep the tube as a mesh"
      : "Saved";
    after.setCandidate(candidate, savedNote);
    // The persisted copy arrives with the annotation layer's next poll; keep
    // the local preview meanwhile so the shape never blinks off screen. When
    // NOTHING persisted, the preview is all there is — keep it indefinitely.
    if (persistedAny) {
      setTimeout(() => {
        const state = brushApi.getState();
        if (state.candidate === candidate && state.status === "preview") {
          state.clear();
        }
      }, SAVED_PREVIEW_CLEAR_MS);
    }
  }, [brushApi, createSceneAnnotation, modeApi, addToDesign]);

  return { initRadiusForLayer, extract, previewLiveTube, save, addToDesign };
};
