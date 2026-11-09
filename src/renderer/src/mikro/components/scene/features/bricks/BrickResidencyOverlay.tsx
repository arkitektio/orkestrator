import { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { nodeBaseBox } from "./octree/nodeAddress";
import { buildAffineMatrix } from "../../platform/coords/worldTransform";
import { layersPlanKey } from "../../platform/model/layerPlanKey";
import { useSceneStore, useSceneStoreApi } from "../../platform/stores/sceneStore";
import { useViewerStore } from "../../platform/stores/viewerStore";
import { bindField } from "@/core/data/scene/stores/bindStore";
import { useBrickStore, useBrickStoreApi } from "./store/brickSlice";
import type { LayerBrickPool, ResidentBrickInfo } from "./residency/residencyTypes";

/**
 * Debug wireframes of the resident bricks, colored by pyramid level (finest
 * = green → coarser = red; uniform "empty" bricks dimmed). One merged
 * LineSegments per (layer, level) rebuilt on residency changes — debug-only,
 * gated on the viewer's debug flag + the octree renderer flag.
 */

const LEVEL_COLORS = ["#22c55e", "#eab308", "#f97316", "#ef4444", "#a855f7", "#64748b"];

const BOX_EDGES: [number, number][] = [
  [0, 1], [1, 3], [3, 2], [2, 0], // bottom
  [4, 5], [5, 7], [7, 6], [6, 4], // top
  [0, 4], [1, 5], [2, 6], [3, 7], // pillars
];

/** The wireframes follow residency at most this often. They are a debug
 * picture of WHICH bricks are in, not a frame-accurate one. */
const REBUILD_INTERVAL_MS = 1000;

/**
 * `residencyVersion`, at most once per `REBUILD_INTERVAL_MS` (leading +
 * trailing), and not at all while `enabled` is false.
 *
 * The version moves every 150–300 ms while bricks stream, and each move used
 * to rebuild every box of every layer inside a React commit of the canvas —
 * 40–100 ms each, three times a second, in exactly the recordings debug mode
 * exists to take.
 */
function useThrottledResidencyVersion(enabled: boolean): number {
  const brickStoreApi = useBrickStoreApi();
  const [version, setVersion] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    let last = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const publish = () => {
      timer = null;
      last = performance.now();
      setVersion(brickStoreApi.getState().residencyVersion);
    };
    publish();
    const unbind = bindField(
      brickStoreApi,
      (state) => state.residencyVersion,
      (_value, previous) => {
        if (previous === undefined || timer !== null) return;
        timer = setTimeout(publish, Math.max(0, REBUILD_INTERVAL_MS - (performance.now() - last)));
      },
    );
    return () => {
      unbind();
      if (timer !== null) clearTimeout(timer);
    };
  }, [enabled, brickStoreApi]);
  return version;
}

type Segment = { level: number; empty: boolean; geometry: THREE.BufferGeometry };

/** One merged LineSegments geometry per (level, empty) for a pool's bricks. */
function buildSegments(
  pool: LayerBrickPool,
  bricks: readonly ResidentBrickInfo[],
): Segment[] {
  const counts = new Map<string, number>();
  for (const brick of bricks) {
    const key = `${brick.level}:${brick.empty ? 1 : 0}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const buffers = new Map<string, { array: Float32Array; cursor: number; level: number; empty: boolean }>();
  for (const [key, count] of counts) {
    const [level, empty] = key.split(":").map(Number);
    buffers.set(key, {
      array: new Float32Array(count * BOX_EDGES.length * 2 * 3),
      cursor: 0,
      level,
      empty: empty === 1,
    });
  }
  // Written straight into the typed arrays: the previous build went through
  // a nested number[] per box and two spreads, for hundreds of boxes.
  const corner = (
    box: { min: readonly number[]; max: readonly number[] },
    index: number,
    axis: 0 | 1 | 2,
  ) =>
    (index >> axis) & 1 ? box.max[axis] : box.min[axis];
  for (const brick of bricks) {
    const box = nodeBaseBox(pool.geometry, pool.spec, brick.level, brick.coords);
    const buffer = buffers.get(`${brick.level}:${brick.empty ? 1 : 0}`)!;
    for (const [a, b] of BOX_EDGES) {
      for (const index of [a, b]) {
        buffer.array[buffer.cursor++] = corner(box, index, 0);
        buffer.array[buffer.cursor++] = corner(box, index, 1);
        buffer.array[buffer.cursor++] = corner(box, index, 2);
      }
    }
  }
  return [...buffers.values()].map(({ array, level, empty }) => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(array, 3));
    return { level, empty, geometry };
  });
}

export function BrickResidencyOverlay() {
  const debug = useViewerStore((s) => s.debug);
  const brickSystem = useBrickStore((s) => s.brickSystem);
  const residencyVersion = useThrottledResidencyVersion(debug && brickSystem !== null);
  const sceneStoreApi = useSceneStoreApi();
  // A SCALAR key, not the array (P9c/P17): the wireframes read only id +
  // placement — fields `layerPlanSignature` captures — so a contrast drag's
  // per-tick layer replacement must not rebuild every box. Debug-only, but the
  // subscription is live regardless of the debug flag.
  const layersKey = useSceneStore((s) => layersPlanKey(s.layers));

  const groups = useMemo(() => {
    if (!debug || !brickSystem) return [];
    const residency = brickSystem.snapshotResidency();

    // ONE wireframe per (pool, placement), not per layer: the layers of a
    // merged pass share a pool and report the same residency array, and with
    // the same placement they would draw the same boxes on top of each other
    // — four channels of one image built and drew everything four times.
    const drawn = new Set<string>();
    const poolIds = new Map<object, number>();
    return sceneStoreApi.getState().layers.flatMap((layer) => {
      const pool = brickSystem.getLayerPool(layer.id);
      const bricks = residency[layer.id];
      if (!pool || !bricks || bricks.length === 0) return [];
      const matrix = buildAffineMatrix(layer);
      if (!poolIds.has(bricks)) poolIds.set(bricks, poolIds.size);
      const key = `${poolIds.get(bricks)}|${matrix.elements.join(",")}`;
      if (drawn.has(key)) return [];
      drawn.add(key);
      return [{ layerId: layer.id, matrix, segments: buildSegments(pool, bricks) }];
    });
    // residencyVersion is the rebuild trigger even though it's not read here;
    // layersKey stands for the layers array read via getState().
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debug, brickSystem, layersKey, residencyVersion, sceneStoreApi]);

  // Wireframe geometries are rebuilt per residency change — dispose the
  // superseded generation or every streaming batch leaks GPU buffers.
  useEffect(() => {
    return () => {
      for (const group of groups) {
        for (const segment of group.segments) segment.geometry.dispose();
      }
    };
  }, [groups]);

  if (groups.length === 0) return null;

  return (
    <>
      {groups.map(({ layerId, matrix, segments }) => (
        <group key={layerId} matrix={matrix} matrixAutoUpdate={false}>
          {segments.map(({ level, empty, geometry }) => (
            <lineSegments key={`${level}-${empty}`} geometry={geometry}>
              <lineBasicMaterial
                color={LEVEL_COLORS[Math.min(level, LEVEL_COLORS.length - 1)]}
                transparent
                opacity={empty ? 0.15 : 0.6}
                depthWrite={false}
              />
            </lineSegments>
          ))}
        </group>
      ))}
    </>
  );
}
