import * as THREE from "three";

import { buildAffineMatrix } from "../coords/worldTransform";
import { hasValidSpatialAxes, resolveAxisIndices } from "../model/dims";
import { relativeLevelScaleFactors } from "../coords/levelGeometry";
import { resolveSpatialSelection } from "../coords/selection";
import type { LayerState } from "../stores/sceneStore";
import type { ProbedCoordinate } from "../stores/viewerStore";

/**
 * Geometry for the marker drawn at a probed point: the layer's affine matrix and
 * the marker offset (`markerPosition`) expressed in the layer's local, physical
 * (scaled) units. The marker's world position is `affineMatrix · markerPosition`.
 *
 * Extracted from `SceneProbedPoint` so both the rendered marker and the
 * probe-orbit camera pivot derive the exact same point (no drift between what you
 * see and what you pivot around).
 *
 * Deliberately CAMERA-INDEPENDENT: everything here changes only on probe/layer
 * events, so components can memo it without subscribing to per-frame camera
 * facts. The camera-dependent marker size (constant screen-size compensation) is
 * computed separately via `probeMarkerRadius` — in a `useFrame`, not through the
 * store (see OCTREE_RENDERER.md P17).
 */
export interface ProbeMarkerGeometry {
  affineMatrix: THREE.Matrix4;
  markerPosition: [number, number, number];
  /** Smallest non-zero physical extent of the probed volume — the clamp basis
   * for the marker radius. */
  minAxis: number;
}

/**
 * Screen-size-compensated marker radius. `worldUnitsPerPixel` comes straight
 * from the camera (per frame, in `useFrame`); the clamps keep the marker from
 * vanishing or swallowing tiny volumes.
 */
export function probeMarkerRadius(
  minAxis: number,
  worldUnitsPerPixel: number,
  pxRadius: number,
  minFraction: number,
  maxFraction: number,
): number {
  return THREE.MathUtils.clamp(
    worldUnitsPerPixel * pxRadius,
    minAxis * minFraction,
    minAxis * maxFraction,
  );
}

/** World units spanned by one screen pixel for this camera + viewport height. */
export function computeWorldUnitsPerPixel(
  camera: THREE.Camera,
  viewportHeight: number,
): number {
  if ((camera as THREE.OrthographicCamera).isOrthographicCamera) {
    return 1 / (camera as THREE.OrthographicCamera).zoom;
  }
  const persp = camera as THREE.PerspectiveCamera;
  const distance = camera.position.length();
  const vFov = THREE.MathUtils.degToRad(persp.fov);
  return (2 * Math.tan(vFov / 2) * distance) / Math.max(viewportHeight, 1);
}

/** Resolve the volume LOD used for probe geometry (fixed → default → highest). */
export function getResolvedVolumeLod(layer: LayerState): number {
  const highestAvailableLod = Math.max(0, layer.lens.dataset.dataArrays.length - 1);
  if (typeof layer.fixedLOD === "number" && layer.fixedLOD >= 0 && layer.fixedLOD <= highestAvailableLod) {
    return layer.fixedLOD;
  }
  if (
    typeof layer.defaultVolumeLOD === "number" &&
    layer.defaultVolumeLOD >= 0 &&
    layer.defaultVolumeLOD <= highestAvailableLod
  ) {
    return layer.defaultVolumeLOD;
  }
  return highestAvailableLod;
}

/**
 * Compute the camera-independent marker geometry (affine matrix + local marker
 * offset + radius clamp basis) for a probe on a layer, or `null` when the layer
 * has no resolvable spatial axes / LOD.
 */
export function resolveProbeMarkerGeometry(
  layer: LayerState,
  probe: ProbedCoordinate,
  getArrayForStoreId: (storeId: string) => { shape: readonly number[] },
): ProbeMarkerGeometry | null {
  const resolvedVolumeLod = getResolvedVolumeLod(layer);
  const dataArray = layer.lens.dataset.dataArrays[resolvedVolumeLod];
  if (!dataArray) {
    return null;
  }

  try {
    const arr = getArrayForStoreId(dataArray.store.id);
    const dims = layer.lens.dataset.axisNames;
    const sliceMap = layer.lens.slices.reduce<Record<string, LayerState["lens"]["slices"][number]>>((acc, slice) => {
      acc[slice.axis] = slice;
      return acc;
    }, {});

    const { xPos, yPos, zPos } = resolveAxisIndices(dims, layer);

    if (!hasValidSpatialAxes({ xPos, yPos, zPos })) {
      return null;
    }

    // GROUND TRUTH FIRST: the caster already computed the hit's world
    // position ON the event ray (`probeFromRay` / the plane's `points.world`).
    // Re-deriving the marker position from layer geometry can only agree or
    // be wrong — so when `worldPos` exists, map it back through the layer
    // affine and use it verbatim; the geometry below then only supplies the
    // radius clamp basis. A marker placed this way CANNOT sit off the ray:
    // any remaining cursor offset is upstream, in the event ray itself.
    const worldTruth = (affine: THREE.Matrix4): [number, number, number] | null => {
      if (!probe.worldPos) return null;
      const inverse = affine.clone().invert();
      const local = new THREE.Vector3(...probe.worldPos).applyMatrix4(inverse);
      return [local.x, local.y, local.z];
    };

    // VOLUME probes: `localPos` is unit-box-normalized ([-0.5, 0.5]) in the
    // box BrickVolumeLayer actually renders — the FULL corner-anchored
    // base-level extent, no slice cropping (`volumeSize = base.spatialShape`).
    // Mapping it through the slice-cropped box below would displace the
    // marker off the ray by the crop offset (and by coarse-LOD rounding), so
    // mirror the mesh's own frame instead. The "plane" branch keeps the
    // slice-aware math: the 2D probe's localPos is stated in the sliced
    // plane's box, and the plane mesh is positioned to match.
    if (probe.strategy !== "plane") {
      const level0 = layer.lens.dataset.dataArrays.reduce<
        LayerState["lens"]["dataset"]["dataArrays"][number] | null
      >((best, da) => (best === null || da.level < best.level ? da : best), null);
      const arr0 = level0 ? getArrayForStoreId(level0.store.id) : arr;
      const totals: [number, number, number] = [
        arr0.shape[xPos] ?? 1,
        arr0.shape[yPos] ?? 1,
        zPos !== -1 ? arr0.shape[zPos] ?? 1 : 1,
      ];
      const nonZero = totals.filter((axis) => axis > 0);
      const affineMatrix = buildAffineMatrix(layer);
      return {
        affineMatrix,
        markerPosition: worldTruth(affineMatrix) ?? [
          (probe.localPos[0] + 0.5) * totals[0],
          (probe.localPos[1] + 0.5) * totals[1],
          (probe.localPos[2] + 0.5) * totals[2],
        ],
        minAxis: nonZero.length > 0 ? Math.min(...nonZero) : 1,
      };
    }

    const xSelection = resolveSpatialSelection(sliceMap[layer.xAxis ?? ""], arr.shape[xPos]);
    const ySelection = resolveSpatialSelection(sliceMap[layer.yAxis ?? ""], arr.shape[yPos]);
    const zSelection = resolveSpatialSelection(sliceMap[layer.zAxis as string], arr.shape[zPos]);
    const scaleFactors = relativeLevelScaleFactors(
      layer.lens.dataset.dataArrays,
      dims.length,
    )[resolvedVolumeLod];
    const scaleX = scaleFactors?.[xPos] ?? 1;
    const scaleY = scaleFactors?.[yPos] ?? 1;
    const scaleZ = scaleFactors?.[zPos] ?? 1;

    const width = xSelection.length * xSelection.step * scaleX;
    const height = ySelection.length * ySelection.step * scaleY;
    const depth = zSelection.length * zSelection.step * scaleZ;

    // Corner-anchored group-local: the sliced box's CENTER in [0..total],
    // mirroring BrickPlaneLayer's resolveProbeGeometryContext.
    const volumePosition: [number, number, number] = [
      xSelection.start * scaleX + width / 2,
      ySelection.start * scaleY + height / 2,
      zSelection.start * scaleZ + depth / 2,
    ];
    const volumeSize: [number, number, number] = [width, height, depth];
    const affineMatrix = buildAffineMatrix(layer);
    const markerPosition: [number, number, number] = worldTruth(affineMatrix) ?? [
      volumePosition[0] + probe.localPos[0] * volumeSize[0],
      volumePosition[1] + probe.localPos[1] * volumeSize[1],
      volumePosition[2] + probe.localPos[2] * volumeSize[2],
    ];
    const nonZeroAxes = volumeSize.map((axis) => Math.abs(axis)).filter((axis) => axis > 0);
    const minAxis = nonZeroAxes.length > 0 ? Math.min(...nonZeroAxes) : 1;

    return {
      affineMatrix,
      markerPosition,
      minAxis,
    };
  } catch {
    return null;
  }
}

/**
 * World-space position of a probed point, or `null` when its geometry can't be
 * resolved. This is the same point the marker is drawn at, so it is the correct
 * pivot for the probe-orbit camera.
 */
export function computeProbeWorldPosition(
  layer: LayerState,
  probe: ProbedCoordinate,
  getArrayForStoreId: (storeId: string) => { shape: readonly number[] },
): THREE.Vector3 | null {
  // The caster's own world hit is the truth (it lies on the event ray).
  if (probe.worldPos) return new THREE.Vector3(...probe.worldPos);
  const geometry = resolveProbeMarkerGeometry(layer, probe, getArrayForStoreId);
  if (!geometry) {
    return null;
  }
  return new THREE.Vector3(...geometry.markerPosition).applyMatrix4(geometry.affineMatrix);
}
