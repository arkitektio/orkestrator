import * as THREE from "three";
import { describe, expect, it } from "vitest";
import type { LayerState } from "../../../platform/model/layerModel";
import type { LayerViewRange } from "../../../platform/visibility/visibility";
import { resolveBrickSpec } from "./brickSpec";
import { buildLayerLevelGeometry, type LevelSource } from "../../../platform/coords/levelGeometry";
import { chunksTouchingBrick, nodeBaseBox } from "./nodeAddress";
import {
  adjacentSelectionChunk,
  adjacentSlabBrickZ,
  anisoEffectiveFactor,
  compareFetchOrder,
  foveatedScore,
  nonSpatialDecodeFactor,
  planLayerNodes,
  sameNodePlan,
  slabLevelZ,
  LOD_HYSTERESIS,
  type LayerNodePlan,
  type NodeCamera,
  type PlannedNode,
} from "./nodePlanning";
import { FRUSTUM_CULL_MARGIN } from "./viewportPlanning";

const makeLayer = (
  overrides: Partial<{ fixedLOD: number | null; zAxis: string | null }> = {},
): LayerState =>
  ({
    id: "layer-1",
    affineMatrix: null,
    xAxis: "x",
    yAxis: "y",
    zAxis: overrides.zAxis ?? null,
    intensityAxis: "c",
    fixedLOD: overrides.fixedLOD ?? null,
    lens: {
      slices: [],
      axisNames: overrides.zAxis ? ["z", "y", "x", "c"] : ["y", "x", "c"],
      shape: overrides.zAxis ? [3, 512, 512, 1] : [512, 512, 1],
      dataset: { axisNames: overrides.zAxis ? ["z", "y", "x", "c"] : ["y", "x", "c"], dataArrays: [] },
    },
  }) as unknown as LayerState;

/** 512² image, 2 levels → 2×2 L0 brick grid, single L1 brick (2D spec 256²). */
const FLAT_LEVELS: LevelSource[] = [
  { shape: [512, 512, 1], chunks: [256, 256, 1], dtype: "uint8", storeId: "s0" },
  { shape: [256, 256, 1], chunks: [256, 256, 1], dtype: "uint8", storeId: "s1", scaleFactors: [2, 2, 1] },
];
const flatGeo = buildLayerLevelGeometry(["y", "x", "c"], makeLayer(), FLAT_LEVELS)!;
const flatSpec = resolveBrickSpec(flatGeo, "2D");

const FULL_VIEW: LayerViewRange = { xRange: [0, 512], yRange: [0, 512], zRange: null, scale: 2 };

const plan2d = (
  overrides: Partial<{
    viewRange: LayerViewRange | undefined;
    layer: LayerState;
    lodBias: number;
    maxPlanBytes: number;
    currentZ: number | undefined;
  }> = {},
) =>
  planLayerNodes({
    layer: overrides.layer ?? makeLayer(),
    geometry: flatGeo,
    spec: flatSpec,
    mode: "2D",
    viewRange: "viewRange" in overrides ? overrides.viewRange : FULL_VIEW,
    camera: null,
    lodBias: overrides.lodBias ?? 1,
    currentZ: overrides.currentZ ?? 0,
    maxPlanBytes: overrides.maxPlanBytes,
  });

const keysByRole = (nodes: { key: string; role: string }[], role: string) =>
  nodes.filter((n) => n.role === role).map((n) => n.key);

describe("planLayerNodes (2D quadtree)", () => {
  it("plans only the coarsest bricks before a view range exists", () => {
    const p = plan2d({ viewRange: undefined });
    expect(p.targetLevel).toBe(1);
    expect(p.nodes.map((n) => `${n.key}:${n.role}`)).toEqual(["1:0:0:0:target"]);
  });

  it("refines to the finest level with the ancestor kept as fallback", () => {
    const p = plan2d();
    expect(p.targetLevel).toBe(0);
    expect(keysByRole(p.nodes, "keep")).toEqual(["1:0:0:0"]);
    expect(keysByRole(p.nodes, "target").sort()).toEqual([
      "0:0:0:0",
      "0:0:1:0",
      "0:1:0:0",
      "0:1:1:0",
    ]);
  });

  it("stays coarse when zoomed out below one pixel per fine voxel", () => {
    const p = plan2d({ viewRange: { ...FULL_VIEW, scale: 0.4 } });
    expect(p.nodes.map((n) => `${n.key}:${n.role}`)).toEqual(["1:0:0:0:target"]);
  });

  it("refines only bricks overlapping the (margin-expanded) view range", () => {
    const p = plan2d({ viewRange: { ...FULL_VIEW, xRange: [0, 100], yRange: [0, 100] } });
    expect(keysByRole(p.nodes, "keep")).toEqual(["1:0:0:0"]);
    expect(keysByRole(p.nodes, "target")).toEqual(["0:0:0:0"]);
  });

  it("suppresses refinement past the byte budget", () => {
    const p = plan2d({ maxPlanBytes: 300_000 }); // < keep(64KB) + 4×256²
    expect(p.nodes.map((n) => `${n.key}:${n.role}`)).toEqual(["1:0:0:0:target"]);
  });

  it("honors fixedLOD regardless of scale", () => {
    const p = plan2d({
      layer: makeLayer({ fixedLOD: 0 }),
      viewRange: { ...FULL_VIEW, scale: 0.4 },
    });
    expect(p.targetLevel).toBe(0);
    expect(keysByRole(p.nodes, "target")).toHaveLength(4);
  });

  it("orders targets center-out", () => {
    const p = plan2d({ viewRange: { ...FULL_VIEW, xRange: [0, 260], yRange: [0, 260] } });
    const targets = keysByRole(p.nodes, "target");
    // View center ≈ (130,130): brick (0,0) is closest.
    expect(targets[0]).toBe("0:0:0:0");
  });
});

describe("slabLevelZ (planner ↔ shader slab convention)", () => {
  it("floors the base z, NOT the slab center, at non-integer z scales", () => {
    // Real pyramid (38 z slices → 9): scale 38/9 ≈ 4.222. The shader used to
    // sample floor((baseZ + 0.5) / scale), which lands one level texel past
    // the planned brick for slabs like baseZ 8 — the page-table lookup then
    // hits UNMAPPED and silently falls back to a coarser level, flipping as
    // zoom changes the level chain. Planner and shader must both floor the
    // raw base z (makeSampleBrickEx slab mode adds 0.5 only AFTER flooring,
    // to recenter inside the chosen texel).
    const scale = 38 / 9;
    expect(slabLevelZ(8, 1, scale)).toBe(1);
    expect(Math.floor((8 + 0.5) / scale)).toBe(2); // the old shader behavior
    // Half-integer scales hit the same boundary (19 → 9, scale 9.5, baseZ 9).
    expect(slabLevelZ(9, 1, 9.5)).toBe(0);
    expect(Math.floor((9 + 0.5) / 9.5)).toBe(1);
    // Integer scales are unaffected by the convention choice.
    expect(slabLevelZ(150, 1, 32)).toBe(4);
  });
});

describe("adjacentSlabBrickZ (z±1 prefetch targeting)", () => {
  // 38-slice stack, level scale 38/9 ≈ 4.222, 2D payload z = 1: the
  // prefetched brick must be exactly the brick the planner would fetch on a
  // scrub to slabZ ± 1 (same floor chain).
  const scale = 38 / 9;

  it("targets the planner's brick for the neighbor slab", () => {
    // slabZ 8 sits in level brick z 1 (floor(8/4.22)); slab 9 → 2; slab 7 → 1.
    expect(adjacentSlabBrickZ(8, 1, 1, scale, 9, 1, 38)).toBe(2);
    expect(adjacentSlabBrickZ(8, -1, 1, scale, 9, 1, 38)).toBe(1);
    // Multi-slab bricks (payload z 4) coarsen the brick index the same way.
    expect(adjacentSlabBrickZ(8, 1, 1, 1, 38, 4, 38)).toBe(2); // level 0, slab 9 → brick 2
  });

  it("returns null outside the base stack or a truncated level", () => {
    expect(adjacentSlabBrickZ(0, -1, 1, scale, 9, 1, 38)).toBeNull();
    expect(adjacentSlabBrickZ(37, 1, 1, scale, 9, 1, 38)).toBeNull();
    // Truncated pyramid: level covers only z < 2·32 base slices.
    expect(adjacentSlabBrickZ(64, 1, 1, 32, 2, 1, 81)).toBeNull();
    expect(adjacentSlabBrickZ(64, -1, 1, 32, 2, 1, 81)).toBe(1);
  });
});

describe("adjacentSelectionChunk (collapsed-dim ±1 prefetch targeting)", () => {
  // Key parity: the returned chunk coord must be exactly what
  // computeFixedIndices would derive for the neighbor index —
  // floor(index / level-0 chunk extent).
  it("targets the post-step fetch's chunk for the neighbor selection", () => {
    // t chunked 5-per-chunk, 23 timepoints. Selection t=9 (chunk 1, offset 4):
    // t=10 crosses into chunk 2; t=8 stays in chunk 1 → nothing to warm.
    expect(adjacentSelectionChunk(1, 4, 5, 23, 1)).toBe(2);
    expect(adjacentSelectionChunk(1, 4, 5, 23, -1)).toBeNull();
    // t chunked 1-per-chunk (the common case): every step is a new chunk.
    expect(adjacentSelectionChunk(9, 0, 1, 23, 1)).toBe(10);
    expect(adjacentSelectionChunk(9, 0, 1, 23, -1)).toBe(8);
  });

  it("returns null outside the dim extent", () => {
    expect(adjacentSelectionChunk(0, 0, 1, 23, -1)).toBeNull();
    expect(adjacentSelectionChunk(22, 0, 1, 23, 1)).toBeNull();
    // Last index inside the last (partial) chunk: t=22 in chunk 4 of 5-wide
    // chunks; t=23 is out of range, t=21 is the same chunk.
    expect(adjacentSelectionChunk(4, 2, 5, 23, 1)).toBeNull();
    expect(adjacentSelectionChunk(4, 2, 5, 23, -1)).toBeNull();
  });
});

describe("planLayerNodes (2D z slabs)", () => {
  const zLevels: LevelSource[] = [
    { shape: [3, 512, 512, 1], chunks: [1, 256, 256, 1], dtype: "uint8", storeId: "s0" },
    { shape: [3, 256, 256, 1], chunks: [1, 256, 256, 1], dtype: "uint8", storeId: "s1", scaleFactors: [1, 2, 2, 1] },
  ];
  const layer = makeLayer({ zAxis: "z" });
  const geo = buildLayerLevelGeometry(["z", "y", "x", "c"], layer, zLevels)!;
  const spec = resolveBrickSpec(geo, "2D");

  it("plans bricks of the selected slab only", () => {
    const p = planLayerNodes({
      layer,
      geometry: geo,
      spec,
      mode: "2D",
      viewRange: FULL_VIEW,
      camera: null,
      lodBias: 1,
      currentZ: 2,
    });
    expect(p.slabZ).toBe(2);
    expect(p.nodes.length).toBeGreaterThan(0);
    expect(p.nodes.every((n) => n.coords[2] === 2)).toBe(true);
  });

  it("renders nothing when the slider is outside the stack", () => {
    const p = planLayerNodes({
      layer,
      geometry: geo,
      spec,
      mode: "2D",
      viewRange: FULL_VIEW,
      camera: null,
      lodBias: 1,
      currentZ: 10,
    });
    expect(p.nodes).toEqual([]);
    expect(p.slabZ).toBeNull();
  });

  it("keeps the slab chain consistent across a deep z-downsampled pyramid", () => {
    // Regression: rounding localZ per level (round(150/32)=5 vs
    // round(150/16)=9, a child of brick 4) picked a coarse root whose
    // children never contained the finer slab, stalling refinement at the
    // coarsest level. Slabs must floor-divide from ONE base z.
    const deepLevels: LevelSource[] = [1, 2, 4, 8, 16, 32].map((s, i) => ({
      shape: [256 / s, 256 / s, 256 / s],
      chunks: [256 / s, 256 / s, i === 0 ? 76 : 256 / s],
      dtype: "float32",
      storeId: `d${i}`,
      scaleFactors: i === 0 ? undefined : [s, s, s],
    }));
    const deepLayer = {
      id: "layer-deep",
      affineMatrix: null,
      xAxis: "x",
      yAxis: "y",
      zAxis: "z",
      intensityAxis: null,
      fixedLOD: null,
      lens: {
        slices: [],
        axisNames: ["z", "y", "x"],
        shape: [256, 256, 256],
        dataset: { axisNames: ["z", "y", "x"], dataArrays: [] },
      },
    } as unknown as LayerState;
    const deepGeo = buildLayerLevelGeometry(["z", "y", "x"], deepLayer, deepLevels)!;
    const deepSpec = resolveBrickSpec(deepGeo, "2D");

    const p = planLayerNodes({
      layer: deepLayer,
      geometry: deepGeo,
      spec: deepSpec,
      mode: "2D",
      viewRange: { xRange: [0, 256], yRange: [0, 256], zRange: null, scale: 2.84 },
      camera: null,
      lodBias: 1,
      currentZ: 150,
      maxPlanBytes: 128 * 1024 * 1024,
    });

    expect(p.slabZ).toBe(150);
    expect(p.targetLevel).toBe(0);
    expect(keysByRole(p.nodes, "target")).toEqual(["0:0:0:150"]);
    // Ancestor slabs floor-divide from base z 150: 75, 37, 18, 9, 4.
    expect(keysByRole(p.nodes, "keep")).toEqual([
      "5:0:0:4",
      "4:0:0:9",
      "3:0:0:18",
      "2:0:0:37",
      "1:0:0:75",
    ]);
  });

  it("roots below coarse levels that don't cover the slab (truncated pyramid)", () => {
    // Regression, seen live: 81 base slices truncate to z shape 2 at scale
    // 32, so the coarsest level covers only base z < 64. For z=76 the old
    // code clamped to the coarsest level's last slice (wrong z) and its
    // children never contained the finer slab → stuck at lowest resolution.
    // The DFS must instead root at the coarsest level that HAS the slab.
    const spimLevels: LevelSource[] = (
      [
        [2048, 81, 1],
        [1024, 40, 2],
        [512, 20, 4],
        [256, 10, 8],
        [128, 5, 16],
        [64, 2, 32],
      ] as const
    ).map(([xy, z, s], i) => ({
      shape: [z, xy, xy],
      chunks: [Math.min(z, 2), xy, xy],
      dtype: "uint16",
      storeId: `p${i}`,
      scaleFactors: i === 0 ? undefined : [s, s, s],
    }));
    const spimLayer = {
      id: "layer-spim",
      affineMatrix: null,
      xAxis: "x",
      yAxis: "y",
      zAxis: "z",
      intensityAxis: null,
      fixedLOD: null,
      lens: {
        slices: [],
        axisNames: ["z", "y", "x"],
        shape: [81, 2048, 2048],
        dataset: { axisNames: ["z", "y", "x"], dataArrays: [] },
      },
    } as unknown as LayerState;
    const spimGeo = buildLayerLevelGeometry(["z", "y", "x"], spimLayer, spimLevels)!;
    const spimSpec = resolveBrickSpec(spimGeo, "2D");

    const p = planLayerNodes({
      layer: spimLayer,
      geometry: spimGeo,
      spec: spimSpec,
      mode: "2D",
      viewRange: { xRange: [583, 1465], yRange: [660, 1388], zRange: null, scale: 1.7 },
      camera: null,
      lodBias: 1,
      currentZ: 76,
      maxPlanBytes: 128 * 1024 * 1024,
    });

    expect(p.slabZ).toBe(76);
    expect(p.targetLevel).toBe(0);
    // No node may reference level 5 — it has no data for base z 76.
    expect(p.nodes.some((n) => n.level === 5)).toBe(false);
    // The chain roots at L4 (slab 4 = floor(76/16)) and every level's slab
    // floor-divides from base z 76.
    expect(keysByRole(p.nodes, "keep")).toContain("4:0:0:4");
    const slabForLevel: Record<number, number> = { 0: 76, 1: 38, 2: 19, 3: 9, 4: 4 };
    for (const node of p.nodes) {
      expect(node.coords[2]).toBe(slabForLevel[node.level]);
    }
    expect(p.nodes.filter((n) => n.role === "target").every((n) => n.level === 0)).toBe(true);
  });
});

describe("planLayerNodes (3D octree)", () => {
  const volLayer = {
    ...makeLayer({ zAxis: "z" }),
    lens: {
      slices: [],
      axisNames: ["z", "y", "x"],
      shape: [256, 256, 256],
      dataset: { axisNames: ["z", "y", "x"], dataArrays: [] },
    },
  } as unknown as LayerState;
  const volLevels: LevelSource[] = [
    { shape: [256, 256, 256], chunks: [64, 64, 64], dtype: "uint8", storeId: "s0" },
    { shape: [128, 128, 128], chunks: [64, 64, 64], dtype: "uint8", storeId: "s1", scaleFactors: [2, 2, 2] },
  ];
  const geo = buildLayerLevelGeometry(["z", "y", "x"], volLayer, volLevels)!;
  const spec = resolveBrickSpec(geo, "3D"); // 64³ payload → L0 4³, L1 2³

  const VOL_VIEW: LayerViewRange = {
    xRange: [0, 256],
    yRange: [0, 256],
    zRange: [0, 256],
    scale: 1,
  };

  const perspectiveCamera = (position: [number, number, number], viewportHeight: number): NodeCamera => {
    const cam = new THREE.PerspectiveCamera(60, 1, 1, 10000);
    cam.position.set(...position);
    cam.lookAt(128, 128, 128);
    cam.updateMatrixWorld(true);
    cam.updateProjectionMatrix();
    const projScreen = new THREE.Matrix4().multiplyMatrices(
      cam.projectionMatrix,
      cam.matrixWorldInverse,
    );
    return {
      voxelFrustum: new THREE.Frustum().setFromProjectionMatrix(projScreen),
      voxelPosition: position,
      pxPerVoxelAtUnitDistance:
        viewportHeight / (2 * Math.tan(THREE.MathUtils.degToRad(60) / 2)),
    };
  };

  it("ortho: refines uniformly with all ancestors kept", () => {
    const p = planLayerNodes({
      layer: volLayer,
      geometry: geo,
      spec,
      mode: "3D",
      viewRange: VOL_VIEW,
      camera: null,
      lodBias: 1,
      currentZ: undefined,
    });
    expect(keysByRole(p.nodes, "keep")).toHaveLength(8);
    expect(keysByRole(p.nodes, "target")).toHaveLength(64);
    expect(p.targetLevel).toBe(0);
    expect(p.slabZ).toBeNull();
  });

  it("perspective: refines near the camera, keeps distant bricks coarse", () => {
    const p = planLayerNodes({
      layer: volLayer,
      geometry: geo,
      spec,
      mode: "3D",
      viewRange: VOL_VIEW,
      camera: perspectiveCamera([-50, 128, 128], 100),
      lodBias: 1,
      currentZ: undefined,
    });
    const fineTargets = p.nodes.filter((n) => n.role === "target" && n.level === 0);
    const coarseTargets = p.nodes.filter((n) => n.role === "target" && n.level === 1);
    expect(fineTargets.length).toBeGreaterThan(0);
    expect(coarseTargets.length).toBeGreaterThan(0);
    // Only the near half (x bricks 0..1 at L0, from refining L1 x-brick 0) is fine.
    expect(fineTargets.every((n) => n.coords[0] <= 1)).toBe(true);
  });

  /**
   * The frustum test is dilated by FRUSTUM_CULL_MARGIN so a node straddling a
   * side plane does not flip visible↔culled on sub-pixel camera motion —
   * each flip evicted its brick and refetched it, which read as flicker along
   * the viewport edges. The margin buys hysteresis; the band-2 tag is what
   * keeps it from costing latency on genuinely visible bricks.
   */
  describe("frustum cull margin", () => {
    // A camera close enough that the volume overflows the frustum sideways,
    // so there are nodes on both sides of the side planes to discriminate.
    const camera = perspectiveCamera([-20, 128, 128], 100);
    const strict = camera.voxelFrustum;
    const plan = planLayerNodes({
      layer: volLayer,
      geometry: geo,
      spec,
      mode: "3D",
      viewRange: VOL_VIEW,
      camera,
      lodBias: 1,
      currentZ: undefined,
    });
    const inStrictFrustum = (n: PlannedNode) => {
      const b = nodeBaseBox(geo, spec, n.level, n.coords);
      return strict.intersectsBox(
        new THREE.Box3(
          new THREE.Vector3(b.min[0], b.min[1], b.min[2]),
          new THREE.Vector3(b.max[0], b.max[1], b.max[2]),
        ),
      );
    };

    it("keeps nodes just outside the frustum instead of culling them", () => {
      const refinable = plan.nodes.filter((n) => n.level < 1);
      expect(refinable.some((n) => !inStrictFrustum(n))).toBe(true);
    });

    it("tags margin-only nodes band 2 so they never delay a visible brick", () => {
      for (const n of plan.nodes) {
        if (n.fetchBand === 0) continue; // rootLevel backdrop, always first
        if (!inStrictFrustum(n)) expect(n.fetchBand).toBe(2);
      }
      // …and the strictly-visible ones are still fetched ahead of them.
      expect(plan.nodes.some((n) => n.fetchBand === 1)).toBe(true);
    });

    /**
     * THE invariant. The margin buys hysteresis at the edges; it must never
     * buy it with bricks the user is actually looking at. Refinement is
     * closest-first and margin nodes score farthest, so they only ever consume
     * budget that nothing visible wanted — but that is an emergent property of
     * the ordering, not something the code states, so pin it.
     */
    it("never displaces a strictly-visible node, at any budget", () => {
      const MB = 1024 * 1024;
      for (const maxPlanBytes of [Infinity, 64 * MB, 16 * MB, 4 * MB]) {
        for (const pos of [
          [-20, 128, 128],
          [80, 170, 170],
        ] as [number, number, number][]) {
          const base = {
            layer: volLayer,
            geometry: geo,
            spec,
            mode: "3D" as const,
            viewRange: VOL_VIEW,
            camera: perspectiveCamera(pos, 100),
            lodBias: 1,
            currentZ: undefined,
            maxPlanBytes,
          };
          const visibleKeys = (margin: number) =>
            planLayerNodes({ ...base, frustumCullMargin: margin })
              .nodes.filter((n) => n.fetchBand !== 2)
              .map((n) => n.key)
              .sort();
          expect(visibleKeys(FRUSTUM_CULL_MARGIN)).toEqual(visibleKeys(0));
        }
      }
    });

    it("still culls what the margin cannot reach", () => {
      // Looking away from the volume entirely: a 25%-of-node margin must not
      // rescue anything, or the margin has become an "everything" pass.
      const away = new THREE.PerspectiveCamera(60, 1, 1, 10000);
      away.position.set(-2000, 128, 128);
      away.lookAt(-4000, 128, 128);
      away.updateMatrixWorld(true);
      away.updateProjectionMatrix();
      const p = planLayerNodes({
        layer: volLayer,
        geometry: geo,
        spec,
        mode: "3D",
        viewRange: VOL_VIEW,
        camera: {
          ...camera,
          voxelFrustum: new THREE.Frustum().setFromProjectionMatrix(
            new THREE.Matrix4().multiplyMatrices(
              away.projectionMatrix,
              away.matrixWorldInverse,
            ),
          ),
          voxelPosition: [-2000, 128, 128],
        },
        lodBias: 1,
        currentZ: undefined,
      });
      expect(p.nodes.filter((n) => n.level < 1)).toHaveLength(0);
    });
  });

  it("3D: fetchScore is the foveated box distance from the camera", () => {
    const p = planLayerNodes({
      layer: volLayer,
      geometry: geo,
      spec,
      mode: "3D",
      viewRange: VOL_VIEW,
      camera: perspectiveCamera([-50, 128, 128], 100),
      lodBias: 1,
      currentZ: undefined,
    });
    expect(p.nodes.every((n) => Number.isFinite(n.fetchScore) && n.fetchScore >= 0)).toBe(true);
    // The camera sits at x = −50: the cheapest fine brick must be in the
    // x = 0 brick row (nearest box face), not a farther row.
    const fine = p.nodes.filter((n) => n.role === "target" && n.level === 0);
    const cheapest = fine.reduce((a, b) => (b.fetchScore < a.fetchScore ? b : a));
    expect(cheapest.coords[0]).toBe(0);
  });

  it("3D ortho: the brick containing the view center scores 0", () => {
    const p = planLayerNodes({
      layer: volLayer,
      geometry: geo,
      spec,
      mode: "3D",
      viewRange: VOL_VIEW,
      camera: null,
      lodBias: 1,
      currentZ: undefined,
    });
    expect(Math.min(...p.nodes.map((n) => n.fetchScore))).toBe(0);
  });

  it("caps the finest level by visible data volume, not just slot bytes", () => {
    // L0 in full view = 256³ = 16.7 MB of data; a 3 MB share must stay at L1
    // (2.1 MB) even though the screen footprint asks for full resolution —
    // this is what stops plane-chunked datasets from streaming their whole
    // fine level on first view.
    const p = planLayerNodes({
      layer: volLayer,
      geometry: geo,
      spec,
      mode: "3D",
      viewRange: VOL_VIEW,
      camera: null,
      lodBias: 1,
      currentZ: undefined,
      maxPlanBytes: 3_000_000,
    });
    expect(p.targetLevel).toBe(1);
    expect(p.nodes.every((n) => n.level === 1 && n.role === "target")).toBe(true);
  });

  it("refines on the MAX spatial factor for anisotropic pyramids", () => {
    // True-factor pyramid: L1 downsamples xy by 2 but z by 9 (36-slice-style
    // z stack). Refining L2→L1 tests L1's scale: at a footprint where L1's
    // xy voxels are sub-pixel (0.2·2 < 1) but its z voxels still span >1 px
    // (0.2·9 ≥ 1), the planner must refine into L1 — testing x alone would
    // park the plan at L2 with unresolved z detail. L1→L0 then stops
    // (max(L0.scale) = 1, 0.2 < 1). Mirrors the shader's `desiredLevelAt`
    // max-component test.
    const anisoLevels: LevelSource[] = [
      { shape: [252, 256, 256], chunks: [64, 64, 64], dtype: "uint8", storeId: "a0" },
      {
        shape: [28, 128, 128],
        chunks: [28, 64, 64],
        dtype: "uint8",
        storeId: "a1",
        scaleFactors: [9, 2, 2], // dim order [z, y, x]
      },
      {
        shape: [14, 64, 64],
        chunks: [14, 64, 64],
        dtype: "uint8",
        storeId: "a2",
        scaleFactors: [18, 4, 4],
      },
    ];
    const anisoGeo = buildLayerLevelGeometry(["z", "y", "x"], volLayer, anisoLevels)!;
    const anisoSpec = resolveBrickSpec(anisoGeo, "3D");
    const p = planLayerNodes({
      layer: volLayer,
      geometry: anisoGeo,
      spec: anisoSpec,
      mode: "3D",
      viewRange: { ...VOL_VIEW, scale: 0.2 },
      camera: null,
      lodBias: 1,
      currentZ: undefined,
    });
    expect(p.targetLevel).toBe(1);
  });

  it("3D budget degrades refinement instead of overflowing", () => {
    const coarseOnly = planLayerNodes({
      layer: volLayer,
      geometry: geo,
      spec,
      mode: "3D",
      viewRange: VOL_VIEW,
      camera: null,
      lodBias: 1,
      currentZ: undefined,
      maxPlanBytes: 8 * 66 * 66 * 66 + 100_000, // the L1 set, but no child fan-out
    });
    expect(coarseOnly.nodes.every((n) => n.level === 1 && n.role === "target")).toBe(true);
  });
});

describe("sameNodePlan", () => {
  it("is true for identical plans and false when a role flips", () => {
    const a = plan2d();
    const b = plan2d();
    expect(sameNodePlan(a, b)).toBe(true);
    const mutated = { ...b, nodes: b.nodes.map((n, i) => (i === 0 ? { ...n, role: "target" as const } : n)) };
    expect(sameNodePlan(a, mutated)).toBe(false);
  });
});

describe("compareFetchOrder", () => {
  const node = (
    role: PlannedNode["role"],
    priority: number,
    level = 0,
    fetchScore = 0,
    fetchBand: PlannedNode["fetchBand"] = 1,
  ): PlannedNode => ({
    key: `${level}:${priority}`,
    level,
    coords: [0, 0, 0],
    role,
    priority,
    fetchScore,
    fetchBand,
  });

  it("dispatches the rootLevel backdrop first regardless of distance", () => {
    const backdrop = node("target", 9, 3, 1e9, 0);
    const nearTarget = node("target", 0, 0, 0, 1);
    expect([nearTarget, backdrop].sort(compareFetchOrder)[0]).toBe(backdrop);
  });

  it("dispatches a near target before a far keep", () => {
    // The old global keep-before-target rule stalled the bricks under the
    // cursor behind the whole viewport's intermediate fallback chain on
    // zoom-in — a far fallback must not preempt near targets.
    const nearTarget = node("target", 5, 0, 100, 1);
    const farKeep = node("keep", 1, 2, 1e6, 1);
    expect([farKeep, nearTarget].sort(compareFetchOrder)[0]).toBe(nearTarget);
  });

  it("resolves score ties coarse-first (the ancestor chain over the focus)", () => {
    // Box distance is monotone under ancestry, so the focus chain all ties
    // at 0 — the coarse-first tiebreak lands it root→leaf, fallback first.
    const chain = [
      node("target", 2, 0, 0, 1),
      node("keep", 1, 1, 0, 1),
      node("keep", 0, 2, 0, 1),
    ];
    expect(chain.sort(compareFetchOrder).map((n) => n.level)).toEqual([2, 1, 0]);
  });

  it("dispatches margin-only prefetch last even when it is closer", () => {
    const margin = node("target", 0, 0, 10, 2);
    const onScreen = node("target", 1, 0, 1e6, 1);
    expect([margin, onScreen].sort(compareFetchOrder)[0]).toBe(onScreen);
  });

  it("orders targets near-first (fetchScore), NOT coarse-first", () => {
    // A far coarse target must not preempt a near fine target — a global
    // coarse-first sort would starve newly visible fine bricks on zoom-in.
    const nearFine = node("target", 2, 0, 100, 1);
    const farCoarse = node("target", 40, 2, 1e6, 1);
    expect([farCoarse, nearFine].sort(compareFetchOrder)[0]).toBe(nearFine);
  });
});

describe("planLayerNodes fetch ordering (band + score)", () => {
  // 2048² image, 3 levels (256² payload): L2 roots 2×2, L1 4×4, L0 8×8.
  const bigLayer = {
    ...makeLayer(),
    lens: {
      slices: [],
      axisNames: ["y", "x", "c"],
      shape: [2048, 2048, 1],
      dataset: { axisNames: ["y", "x", "c"], dataArrays: [] },
    },
  } as unknown as LayerState;
  const bigLevels: LevelSource[] = [
    { shape: [2048, 2048, 1], chunks: [256, 256, 1], dtype: "uint8", storeId: "b0" },
    { shape: [1024, 1024, 1], chunks: [256, 256, 1], dtype: "uint8", storeId: "b1", scaleFactors: [2, 2, 1] },
    { shape: [512, 512, 1], chunks: [256, 256, 1], dtype: "uint8", storeId: "b2", scaleFactors: [4, 4, 1] },
  ];
  const bigGeo = buildLayerLevelGeometry(["y", "x", "c"], bigLayer, bigLevels)!;
  const bigSpec = resolveBrickSpec(bigGeo, "2D");

  // Viewport [800,1000]² → focus (900,900); prefetch-expanded to [750,1050]².
  const p = planLayerNodes({
    layer: bigLayer,
    geometry: bigGeo,
    spec: bigSpec,
    mode: "2D",
    viewRange: { xRange: [800, 1000], yRange: [800, 1000], zRange: null, scale: 2 },
    camera: null,
    lodBias: 1,
    currentZ: 0,
  });
  const sorted = [...p.nodes].sort(compareFetchOrder);
  const byKey = new Map(p.nodes.map((n) => [n.key, n]));

  it("scores 0 for the node containing the focus at every level", () => {
    expect(byKey.get("2:0:0:0")?.fetchScore).toBe(0);
    expect(byKey.get("1:1:1:0")?.fetchScore).toBe(0);
    expect(byKey.get("0:3:3:0")?.fetchScore).toBe(0);
  });

  it("tags roots band 0, on-screen band 1, margin-only band 2", () => {
    expect(p.nodes.filter((n) => n.level === 2).every((n) => n.fetchBand === 0)).toBe(true);
    expect(byKey.get("0:3:3:0")?.fetchBand).toBe(1);
    // [512,768)² overlaps only the expanded margin, not the strict viewport.
    expect(byKey.get("0:2:2:0")?.fetchBand).toBe(2);
  });

  /**
   * The regression a LAYER THAT NEVER REGISTERS ITS GROUP REF produces.
   *
   * No registration → no `trackables` entry → `computeSceneVisibility` writes no
   * `layerViewRanges[id]` → `nodePlanTracker` passes `viewRange: undefined` →
   * `strictBox` is never built → the band-2 arm of `fetchBand` is unreachable and
   * every non-root node lands in band 1. Off-screen prefetch then competes on
   * equal footing with what is actually on screen, and the layer visibly fills in
   * brick by brick instead of showing its coarse backdrop and refining.
   *
   * Nothing throws when this happens, which is why it is asserted here: the only
   * symptom is streaming that feels wrong.
   */
  it("loses the margin band entirely without a view range", () => {
    const unregistered = planLayerNodes({
      layer: bigLayer,
      geometry: bigGeo,
      spec: bigSpec,
      mode: "2D",
      viewRange: undefined,
      camera: null,
      lodBias: 1,
      currentZ: 0,
    });
    // Roots are still band 0 — the backdrop survives.
    expect(unregistered.nodes.some((n) => n.fetchBand === 0)).toBe(true);
    // …but nothing is ever deprioritized as margin-only.
    expect(unregistered.nodes.some((n) => n.fetchBand === 2)).toBe(false);
    // Which is the whole difference: WITH a view range, some node is.
    expect(p.nodes.some((n) => n.fetchBand === 2)).toBe(true);
  });

  it("dispatches roots, then the focus chain coarse→fine, then by distance, margin last", () => {
    const rootCount = p.nodes.filter((n) => n.fetchBand === 0).length;
    expect(rootCount).toBe(4);
    expect(sorted.slice(0, rootCount).every((n) => n.fetchBand === 0)).toBe(true);
    expect(sorted[0].key).toBe("2:0:0:0"); // nearest root first
    // First non-root dispatches: the score-0 chain over the focus,
    // coarse-first — the near fallback lands just before the near target.
    expect(sorted[rootCount].key).toBe("1:1:1:0");
    expect(sorted[rootCount + 1].key).toBe("0:3:3:0");
    // Within one band a near target beats a farther keep — the inversion
    // this sort exists for.
    const nearTarget = sorted.findIndex((n) => n.key === "0:2:3:0"); // score 132²
    const farKeep = sorted.findIndex((n) => n.key === "1:2:2:0"); // score 2·124²
    expect(nearTarget).toBeGreaterThan(-1);
    expect(farKeep).toBeGreaterThan(nearTarget);
    // Margin-only prefetch dispatches after every on-screen brick.
    const lastOnScreen = sorted.map((n) => n.fetchBand).lastIndexOf(1);
    const firstMargin = sorted.findIndex((n) => n.fetchBand === 2);
    expect(firstMargin).toBeGreaterThan(lastOnScreen);
  });

  it("2D projects z out of the score (slab ≠ mid-stack focus)", () => {
    // 3-slab stack viewed at slab 0: the focus z is mid-stack (1.5) while
    // every node sits at slab 0 — the xy-only score must still be exactly 0
    // for bricks touching the viewport center.
    const zLevels: LevelSource[] = [
      { shape: [3, 512, 512, 1], chunks: [1, 256, 256, 1], dtype: "uint8", storeId: "z0" },
      { shape: [3, 256, 256, 1], chunks: [1, 256, 256, 1], dtype: "uint8", storeId: "z1", scaleFactors: [1, 2, 2, 1] },
    ];
    const layer = makeLayer({ zAxis: "z" });
    const geo = buildLayerLevelGeometry(["z", "y", "x", "c"], layer, zLevels)!;
    const spec = resolveBrickSpec(geo, "2D");
    const slabPlan = planLayerNodes({
      layer,
      geometry: geo,
      spec,
      mode: "2D",
      viewRange: FULL_VIEW,
      camera: null,
      lodBias: 1,
      currentZ: 0,
    });
    // All four L0 bricks touch the focus (256,256) → xy distance 0; any z
    // leakage would make this 0.25 (dz = 0.5 to the slab's z box).
    const fine = slabPlan.nodes.filter((n) => n.level === 0);
    expect(fine.length).toBeGreaterThan(0);
    expect(fine.every((n) => n.fetchScore === 0)).toBe(true);
  });
});

describe("planLayerNodes coarsest-slot reservation", () => {
  // 3-slab z stack: the coarsest GRID spans all 3 slabs (1×1×3 bricks) even
  // though a 2D plan only ever contains ONE slab — the residency manager pins
  // every resident coarsest brick across scrub history, so the planner must
  // budget refinement against (maxPlanBytes − full coarsest grid).
  const zLevels: LevelSource[] = [
    { shape: [3, 512, 512, 1], chunks: [1, 256, 256, 1], dtype: "uint8", storeId: "s0" },
    { shape: [3, 256, 256, 1], chunks: [1, 256, 256, 1], dtype: "uint8", storeId: "s1", scaleFactors: [1, 2, 2, 1] },
  ];
  const layer = makeLayer({ zAxis: "z" });
  const geo = buildLayerLevelGeometry(["z", "y", "x", "c"], layer, zLevels)!;
  const spec = resolveBrickSpec(geo, "2D");
  // 256²-slab slots at 1 B/voxel: 64 KiB each. Coarsest grid = 3 slabs →
  // 196 608 B reserved; refining one slab needs 4 L0 bricks = 262 144 B.
  const planWith = (maxPlanBytes: number) =>
    planLayerNodes({
      layer,
      geometry: geo,
      spec,
      mode: "2D",
      viewRange: FULL_VIEW,
      camera: null,
      lodBias: 1,
      currentZ: 0,
      maxPlanBytes,
    });

  it("refines when the budget covers reservation + refinement", () => {
    const p = planWith(500_000); // 500 000 − 196 608 = 303 392 ≥ 262 144
    expect(p.targetLevel).toBe(0);
  });

  it("stays coarse when the reservation leaves too little for refinement", () => {
    // Pre-reservation accounting would refine here (65 536 + 262 144 ≤
    // 400 000) and the resulting bricks would then lose the acquire race
    // against pinned coarsest slots every 200 ms (the refetch treadmill).
    const p = planWith(400_000); // 400 000 − 196 608 = 203 392 < 262 144
    expect(p.targetLevel).toBe(1);
    expect(p.nodes.every((n) => n.level === 1)).toBe(true);
  });

  it("skips the reservation when the whole pyramid fits the budget", () => {
    // Total = (12 + 3) × 65 536 = 983 040 — no slot scarcity at 1 MiB.
    const p = planWith(1_000_000);
    expect(p.targetLevel).toBe(0);
  });
});

describe("planLayerNodes budget-floor hysteresis", () => {
  // Whole-image L0 chunk (512²) so the decoded-bytes floor (262 144 B for any
  // L0 touch) decouples from the slot need of a small view (one 64 KiB brick).
  const levels: LevelSource[] = [
    { shape: [512, 512, 1], chunks: [512, 512, 1], dtype: "uint8", storeId: "s0" },
    { shape: [256, 256, 1], chunks: [256, 256, 1], dtype: "uint8", storeId: "s1", scaleFactors: [2, 2, 1] },
  ];
  const layer = makeLayer();
  const geo = buildLayerLevelGeometry(["y", "x", "c"], layer, levels)!;
  const spec = resolveBrickSpec(geo, "2D");
  const smallView: LayerViewRange = { xRange: [0, 100], yRange: [0, 100], zRange: null, scale: 2 };
  const planWith = (previousBudgetMinLevel: number | undefined) =>
    planLayerNodes({
      layer,
      geometry: geo,
      spec,
      mode: "2D",
      viewRange: smallView,
      camera: null,
      lodBias: 1,
      currentZ: 0,
      // Below the 262 144 B decoded floor for L0, but within its 15% slack.
      maxPlanBytes: 240_000,
      previousBudgetMinLevel,
    });

  it("keeps a previously-unlocked finer level within the slack", () => {
    expect(planWith(undefined).targetLevel).toBe(1); // floor binds afresh
    expect(planWith(undefined).budgetMinLevel).toBe(1);
    expect(planWith(0).targetLevel).toBe(0); // hysteresis holds the unlock
    expect(planWith(0).budgetMinLevel).toBe(0);
  });

  it("2D: an allowance unlocks the whole-image-chunked fine level", () => {
    const p = planLayerNodes({
      layer,
      geometry: geo,
      spec,
      mode: "2D",
      viewRange: smallView,
      camera: null,
      lodBias: 1,
      currentZ: 0,
      maxPlanBytes: 240_000,
      decodeAllowanceBytes: 262_144, // one whole-image L0 chunk
    });
    expect(p.budgetMinLevel).toBe(1);
    expect(p.targetLevel).toBe(0);
    expect(p.decodeBytesCharged).toBe(262_144);
  });
});

describe("planLayerNodes sub-floor decode allowance (plane-chunked pyramid)", () => {
  // Modeled on a real SPIM stack whose chunks span the FULL x/y extent at
  // every fine level: view culling in x/y cannot reduce the chunk-aligned
  // decode cost, and in 3D the frustum sees ~the whole depth, so the
  // all-or-nothing floor pinned targetLevel at L3 at every zoom. dtype
  // uint16 decodes at 4 B/voxel. Dim order [z, y, x].
  const LEVELS: LevelSource[] = [
    { shape: [960, 2048, 1920], chunks: [40, 2048, 1920], dtype: "uint16", storeId: "p0" },
    { shape: [480, 1024, 960], chunks: [40, 1024, 960], dtype: "uint16", storeId: "p1", scaleFactors: [2, 2, 2] },
    { shape: [240, 512, 480], chunks: [40, 512, 480], dtype: "uint16", storeId: "p2", scaleFactors: [4, 4, 4] },
    { shape: [120, 256, 240], chunks: [40, 256, 240], dtype: "uint16", storeId: "p3", scaleFactors: [8, 8, 8] },
    { shape: [60, 128, 120], chunks: [60, 128, 120], dtype: "uint16", storeId: "p4", scaleFactors: [16, 16, 16] },
  ];
  const volLayer = {
    ...makeLayer({ zAxis: "z" }),
    lens: {
      slices: [],
      axisNames: ["z", "y", "x"],
      shape: [960, 2048, 1920],
      dataset: { axisNames: ["z", "y", "x"], dataArrays: [] },
    },
  } as unknown as LayerState;
  const geo = buildLayerLevelGeometry(["z", "y", "x"], volLayer, LEVELS)!;
  const spec = resolveBrickSpec(geo, "3D");

  // A zoomed-in 3D view (real session ranges): x/y cropped, z ~the full
  // stack. visibleBytesAtLevel: L3 ≈ 14.7 MB ≤ 64 MiB, L2 = 6 z-chunk-rows
  // × 19 660 800 B ≈ 118 MB > 64 MiB → legacy floor = L3.
  //
  // Every byte figure here is HALF what it was before `raw16` was settled
  // on: uint16 chunks now stay `Uint16Array` end-to-end and charge
  // 2 B/voxel instead of the widened 4. The scenario is deliberately
  // unchanged — the same six z-chunk-rows, the same relation to the budget
  // — because these cases are about the ALLOWANCE mechanism, not about the
  // currency it is denominated in.
  const VIEW: LayerViewRange = {
    xRange: [150, 1000],
    yRange: [1586, 2048],
    zRange: [0, 894],
    scale: 3.38,
  };
  const L2_CHUNK_BYTES = 480 * 512 * 40 * 2; // 19 660 800
  const MiB = 1024 * 1024;

  const plan = (
    overrides: Partial<{
      decodeAllowanceBytes: number;
      previousBudgetMinLevel: number;
      maxPlanBytes: number;
      viewRange: LayerViewRange;
    }> = {},
  ) =>
    planLayerNodes({
      layer: volLayer,
      geometry: geo,
      spec,
      mode: "3D",
      viewRange: overrides.viewRange ?? VIEW,
      camera: null,
      lodBias: 1,
      currentZ: undefined,
      maxPlanBytes: overrides.maxPlanBytes ?? 64 * MiB,
      decodeAllowanceBytes: overrides.decodeAllowanceBytes,
      previousBudgetMinLevel: overrides.previousBudgetMinLevel,
    });

  /** Deduped chunk keys the plan's sub-floor nodes imply — the independent
   * recomputation of what `tryChargeChildren` should have charged. */
  const subFloorChunkKeys = (p: ReturnType<typeof plan>): Set<string> => {
    const keys = new Set<string>();
    for (const node of p.nodes.filter((n) => n.level < p.budgetMinLevel))
      for (const chunk of chunksTouchingBrick(geo, spec, node.level, node.coords))
        keys.add(`${node.level}:${chunk[0]}:${chunk[1]}:${chunk[2]}`);
    return keys;
  };

  it("legacy parity: no allowance reproduces the all-or-nothing floor", () => {
    const p = plan();
    expect(p.budgetMinLevel).toBe(3);
    expect(p.targetLevel).toBe(3);
    expect(p.nodes.every((n) => n.level >= 3)).toBe(true);
    expect(p.decodeBytesCharged).toBe(0);
  });

  it("unlocks the visible L2 set within the allowance, floor unchanged", () => {
    const p = plan({ decodeAllowanceBytes: 128 * MiB }); // ≥ all 6 z rows
    expect(p.budgetMinLevel).toBe(3);
    expect(p.targetLevel).toBe(2);
    const fine = p.nodes.filter((n) => n.role === "target" && n.level === 2);
    expect(fine.length).toBeGreaterThan(0);
    // The brick under the plan focus is fine (foveated: score 0 = contains it).
    expect(Math.min(...fine.map((n) => n.fetchScore))).toBe(0);
    // L1 would cost another whole 157 MB chunk row — allowance rejects it.
    expect(p.nodes.every((n) => n.level >= 2)).toBe(true);
  });

  it("bounds the charged chunk set by the allowance", () => {
    // 160 MiB covers the first refinement's 4 z-chunk-rows (78 643 200 B)
    // but not the far rows: the fine region stops there.
    const p = plan({ decodeAllowanceBytes: 80 * MiB });
    expect(p.decodeBytesCharged).toBeLessThanOrEqual(80 * MiB);
    const keys = subFloorChunkKeys(p);
    expect(keys.size * L2_CHUNK_BYTES).toBe(p.decodeBytesCharged);
    expect(keys.size).toBeLessThanOrEqual(4);
  });

  it("keeps the far region coarse when the allowance runs out", () => {
    const p = plan({ decodeAllowanceBytes: 80 * MiB });
    const fine = p.nodes.filter((n) => n.role === "target" && n.level === 2);
    const coarse = p.nodes.filter((n) => n.role === "target" && n.level === 3);
    expect(fine.length).toBeGreaterThan(0);
    expect(coarse.length).toBeGreaterThan(0);
    // Foveated: the fine set sits over the focus, the coarse remainder farther.
    expect(Math.min(...fine.map((n) => n.fetchScore))).toBe(0);
  });

  it("emits the full ancestor keep chain for sub-floor targets", () => {
    const p = plan({ decodeAllowanceBytes: 128 * MiB });
    const byKey = new Map(p.nodes.map((n) => [n.key, n]));
    for (const n of p.nodes.filter((x) => x.role === "target" && x.level === 2)) {
      const parent = byKey.get(
        `3:${Math.floor(n.coords[0] / 2)}:${Math.floor(n.coords[1] / 2)}:${Math.floor(n.coords[2] / 2)}`,
      );
      const grandparent = byKey.get(
        `4:${Math.floor(n.coords[0] / 4)}:${Math.floor(n.coords[1] / 4)}:${Math.floor(n.coords[2] / 4)}`,
      );
      expect(parent?.role).toBe("keep");
      expect(grandparent?.role).toBe("keep");
    }
  });

  it("is deterministic and chunk-granular-stable under small focus motion", () => {
    const a = plan({ decodeAllowanceBytes: 80 * MiB });
    const b = plan({ decodeAllowanceBytes: 80 * MiB });
    expect(sameNodePlan(a, b)).toBe(true);
    // A few voxels of x/y pan re-charges the SAME chunk rows (x/y chunks span
    // the full extent), so the fine set does not thrash.
    const nudged = plan({
      decodeAllowanceBytes: 80 * MiB,
      viewRange: { ...VIEW, xRange: [154, 1004], yRange: [1590, 2048] },
    });
    expect(subFloorChunkKeys(nudged)).toEqual(subFloorChunkKeys(a));
  });

  it("does not ratchet the floor through hysteresis under mixed plans", () => {
    // Sub-floor L2 targets must not drag budgetMinLevel to 2 on the next
    // replan: hysteresis keys on the previous FLOOR, and even a claimed
    // previous floor of 2 fails the slack test (118 MB > 64 MiB × 1.15).
    expect(
      plan({ decodeAllowanceBytes: 128 * MiB, previousBudgetMinLevel: 3 }).budgetMinLevel,
    ).toBe(3);
    expect(
      plan({ decodeAllowanceBytes: 128 * MiB, previousBudgetMinLevel: 2 }).budgetMinLevel,
    ).toBe(3);
  });

  it("stays slot-capped: a huge allowance cannot bypass the GPU budget", () => {
    // 3 MB of slots affords no refinement (one L4→L3 fan-out is ~4.6 MB), so
    // the slot check rejects BEFORE any allowance is consumed.
    const p = plan({ maxPlanBytes: 3_000_000, decodeAllowanceBytes: 1024 * MiB });
    expect(p.nodes.every((n) => n.level === 4)).toBe(true);
    expect(p.decodeBytesCharged).toBe(0);
  });
});

describe("foveatedScore", () => {
  const origin: [number, number, number] = [0, 0, 0];

  it("with no view direction it is the plain squared center distance", () => {
    expect(foveatedScore([3, 4, 0], origin, null)).toBe(25);
    expect(foveatedScore([0, 0, 2], origin, undefined)).toBe(4);
  });

  it("equidistant on-axis nodes score below off-axis ones", () => {
    const viewDirection: [number, number, number] = [0, 0, 1];
    const onAxis = foveatedScore([0, 0, 10], origin, viewDirection);
    const offAxis = foveatedScore([10, 0, 0], origin, viewDirection); // 90° off
    const behind = foveatedScore([0, 0, -10], origin, viewDirection); // 180° off
    expect(onAxis).toBe(100); // cos = 1 → no penalty, plain dist²
    expect(offAxis).toBeGreaterThan(onAxis);
    expect(behind).toBeGreaterThan(offAxis);
  });

  it("ordering-only invariant: score is monotone in distance along one ray", () => {
    const viewDirection: [number, number, number] = [1, 0, 0];
    const near = foveatedScore([5, 5, 0], origin, viewDirection);
    const far = foveatedScore([10, 10, 0], origin, viewDirection); // same angle
    expect(far).toBeGreaterThan(near);
  });

  it("a zero-distance node scores zero regardless of direction", () => {
    expect(foveatedScore([0, 0, 0], origin, [0, 0, 1])).toBe(0);
  });
});

describe("anisoEffectiveFactor (Phase C dominant-axis discount)", () => {
  const randomUnit = (): [number, number, number] => {
    const v: [number, number, number] = [
      Math.random() * 2 - 1,
      Math.random() * 2 - 1,
      Math.random() * 2 - 1,
    ];
    const n = Math.hypot(...v) || 1;
    return [v[0] / n, v[1] / n, v[2] / n];
  };

  it("equals the max rule whenever no axis dominates the view (any diagonal)", () => {
    const d = Math.SQRT1_2 - 1e-6; // every |d_i| ≤ √½ ⇒ every weight = 1
    const dirs: Array<[number, number, number]> = [
      [d, d, 0],
      [0.577, 0.577, 0.577],
      [0.5, 0.5, Math.sqrt(0.5)],
    ];
    for (const dir of dirs) {
      const scale: [number, number, number] = [
        1 + Math.random() * 20,
        1 + Math.random() * 20,
        1 + Math.random() * 20,
      ];
      expect(anisoEffectiveFactor(scale, dir)).toBeCloseTo(Math.max(...scale), 4);
    }
  });

  it("is a no-op on isotropic and [2ⁿ,2ⁿ,1] pyramids for EVERY view", () => {
    for (let i = 0; i < 300; i++) {
      const dir = randomUnit();
      const s = 1 + Math.random() * 20;
      expect(anisoEffectiveFactor([s, s, s], dir)).toBeCloseTo(s, 6);
      // z never downsampled: the discounted axis never carries the max alone.
      expect(anisoEffectiveFactor([8, 8, 1], dir)).toBeCloseTo(8, 6);
    }
  });

  it("discounts only the view-aligned axis on true-factor pyramids", () => {
    // Face-on (along the divergent z): refinement keys to the screen axes.
    expect(anisoEffectiveFactor([2, 2, 9], [0, 0, 1])).toBeCloseTo(4.5, 6);
    // Across-view: the z-dominant-view protection is fully preserved.
    expect(anisoEffectiveFactor([2, 2, 9], [1, 0, 0])).toBeCloseTo(9, 6);
    // A huge divergence still forces refinement at half weight even face-on.
    expect(anisoEffectiveFactor([2, 2, 32], [0, 0, 1])).toBeCloseTo(16, 6);
  });

  it("ramps continuously through the 45° boundary", () => {
    const effAt = (dz: number) => {
      const dx = Math.sqrt(1 - dz * dz);
      return anisoEffectiveFactor([2, 2, 9], [dx, 0, dz]);
    };
    expect(effAt(Math.SQRT1_2 - 1e-4)).toBeCloseTo(effAt(Math.SQRT1_2 + 1e-4), 2);
    for (let dz = 0.71; dz < 1; dz += 0.02) {
      expect(effAt(dz + 0.02 > 1 ? 1 : dz + 0.02)).toBeLessThanOrEqual(effAt(dz) + 1e-6);
    }
  });
});

describe("planLayerNodes anisotropy-aware LOD (Phase C, orkestrator.anisoLod)", () => {
  // True-factor pyramid: z downsamples 9× while xy downsample 2× (dim order
  // [z, y, x] ⇒ spatial scale (x, y, z) = (2, 2, 9) at L1, (4, 4, 18) at L2).
  const LEVELS: LevelSource[] = [
    { shape: [252, 256, 256], chunks: [64, 64, 64], dtype: "uint8", storeId: "c0" },
    { shape: [28, 128, 128], chunks: [28, 64, 64], dtype: "uint8", storeId: "c1", scaleFactors: [9, 2, 2] },
    { shape: [14, 64, 64], chunks: [14, 64, 64], dtype: "uint8", storeId: "c2", scaleFactors: [18, 4, 4] },
  ];
  const volLayer = {
    ...makeLayer({ zAxis: "z" }),
    lens: {
      slices: [],
      axisNames: ["z", "y", "x"],
      shape: [252, 256, 256],
      dataset: { axisNames: ["z", "y", "x"], dataArrays: [] },
    },
  } as unknown as LayerState;
  const geo = buildLayerLevelGeometry(["z", "y", "x"], volLayer, LEVELS)!;
  const spec = resolveBrickSpec(geo, "3D");
  const VIEW: LayerViewRange = { xRange: [0, 256], yRange: [0, 256], zRange: [0, 252], scale: 0.15 };

  /** A camera at `position` looking at the volume center, tuned so every
   * visible node's footprint sits at ~0.11–0.15 px/voxel — inside the band
   * where eff=9 refines (≥1px) and eff=4.5 does not. */
  const cameraAt = (position: [number, number, number]): NodeCamera => {
    const cam = new THREE.PerspectiveCamera(60, 1, 1, 100000);
    cam.position.set(...position);
    cam.lookAt(128, 128, 126);
    cam.updateMatrixWorld(true);
    cam.updateProjectionMatrix();
    const projScreen = new THREE.Matrix4().multiplyMatrices(
      cam.projectionMatrix,
      cam.matrixWorldInverse,
    );
    return {
      voxelFrustum: new THREE.Frustum().setFromProjectionMatrix(projScreen),
      voxelPosition: position,
      pxPerVoxelAtUnitDistance: 113,
    };
  };

  const plan = (camera: NodeCamera | null, anisoLod: boolean) =>
    planLayerNodes({
      layer: volLayer,
      geometry: geo,
      spec,
      mode: "3D",
      viewRange: VIEW,
      camera,
      lodBias: 1,
      currentZ: undefined,
      anisoLod,
    });

  it("face-on (along the divergent z): stops fetching a whole level early", () => {
    const camera = cameraAt([128, 128, 1000]);
    expect(plan(camera, false).targetLevel).toBe(1); // max rule: eff 9 ⇒ refine
    expect(plan(camera, true).targetLevel).toBe(2); // discount: eff 4.5 ⇒ hold
  });

  it("across-view (along x): the z-dominant protection is preserved", () => {
    const camera = cameraAt([1000, 128, 126]);
    expect(plan(camera, false).targetLevel).toBe(1);
    expect(plan(camera, true).targetLevel).toBe(1); // eff = 9 either way
  });

  it("no camera (orthographic/2D path): falls back to the max rule", () => {
    const withFlag = plan(null, true);
    const withoutFlag = plan(null, false);
    expect(sameNodePlan(withFlag, withoutFlag)).toBe(true);
  });
});

describe("foveatedScore axisScale (world-metric ordering)", () => {
  const origin: [number, number, number] = [0, 0, 0];

  it("scales displacements per axis before scoring (identity default)", () => {
    expect(foveatedScore([2, 0, 0], origin, null, 1.5, [0.5, 1, 1])).toBe(1);
    expect(foveatedScore([3, 4, 0], origin, null, 1.5, [1, 1, 1])).toBe(
      foveatedScore([3, 4, 0], origin, null),
    );
  });

  it("restores world angles under an anisotropic metric", () => {
    // Voxel displacement [2, 0, 0.2] under diag(0.5, 0.5, 5) IS the world
    // displacement [1, 0, 1] — a 45° world angle the raw voxel score read
    // as ~5.7° (κ=10 collapse). Scored in the world metric it must equal
    // the plain world-space score exactly.
    const viewDirection: [number, number, number] = [0, 0, 1];
    expect(
      foveatedScore([2, 0, 0.2], origin, viewDirection, 1.5, [0.5, 0.5, 5]),
    ).toBeCloseTo(foveatedScore([1, 0, 1], origin, viewDirection), 10);
  });
});

describe("anisoEffectiveFactor with the world-metric view direction", () => {
  it("a 20° WORLD tilt from face-on keeps the discount; the voxel-space direction lost it", () => {
    // κ=10 metric diag(0.5, 0.5, 5), true-factor finer scale [2, 2, 9].
    const t = THREE.MathUtils.degToRad(20);
    const worldDir: [number, number, number] = [Math.sin(t), 0, Math.cos(t)];
    // World direction (what the planner now passes): z still dominates the
    // view (d_z² ≈ 0.88 > 0.5) ⇒ eff = max(2, 9·0.5) = 4.5.
    expect(anisoEffectiveFactor([2, 2, 9], worldDir)).toBeCloseTo(4.5, 6);
    // The SAME world tilt expressed as a voxel-space direction (world dir
    // scaled by 1/s, renormalized): the κ=10 affine drags the direction off
    // z (d_z² ≈ 0.07 < 0.5) ⇒ every weight is 1 ⇒ eff = 9 — the discount
    // this fix exists to preserve had collapsed.
    const vx = Math.sin(t) / 0.5;
    const vz = Math.cos(t) / 5;
    const len = Math.hypot(vx, vz);
    expect(anisoEffectiveFactor([2, 2, 9], [vx / len, 0, vz / len])).toBeCloseTo(9, 6);
  });
});

describe("planLayerNodes world-metric LOD (orkestrator.worldLod)", () => {
  // Isotropic 256³ two-level pyramid; the ANISOTROPY lives in the calibrated
  // metric — voxelWorldSize diag(0.5, 0.5, 5), the audit's κ=10 SPIM affine.
  const volLayer = {
    ...makeLayer({ zAxis: "z" }),
    lens: {
      slices: [],
      axisNames: ["z", "y", "x"],
      shape: [256, 256, 256],
      dataset: { axisNames: ["z", "y", "x"], dataArrays: [] },
    },
  } as unknown as LayerState;
  const LEVELS: LevelSource[] = [
    { shape: [256, 256, 256], chunks: [64, 64, 64], dtype: "uint8", storeId: "w0" },
    { shape: [128, 128, 128], chunks: [64, 64, 64], dtype: "uint8", storeId: "w1", scaleFactors: [2, 2, 2] },
  ];
  const geo = buildLayerLevelGeometry(["z", "y", "x"], volLayer, LEVELS)!;
  const spec = resolveBrickSpec(geo, "3D"); // 64³ payload → L0 4³, L1 2³
  const VIEW: LayerViewRange = { xRange: [0, 256], yRange: [0, 256], zRange: [0, 256], scale: 1 };
  const SPIM: [number, number, number] = [0.5, 0.5, 5];

  const cameraAt = (
    position: [number, number, number],
    voxelWorldSize?: [number, number, number],
  ): NodeCamera => {
    const cam = new THREE.PerspectiveCamera(60, 1, 1, 100000);
    cam.position.set(...position);
    cam.lookAt(128, 128, 128);
    cam.updateMatrixWorld(true);
    cam.updateProjectionMatrix();
    const projScreen = new THREE.Matrix4().multiplyMatrices(
      cam.projectionMatrix,
      cam.matrixWorldInverse,
    );
    return {
      voxelFrustum: new THREE.Frustum().setFromProjectionMatrix(projScreen),
      voxelPosition: position,
      // viewport height 100 px → 100 / (2·tan 30°) ≈ 86.6
      pxPerVoxelAtUnitDistance: 100 / (2 * Math.tan(THREE.MathUtils.degToRad(60) / 2)),
      voxelWorldSize,
    };
  };

  const plan = (camera: NodeCamera) =>
    planLayerNodes({
      layer: volLayer,
      geometry: geo,
      spec,
      mode: "3D",
      viewRange: VIEW,
      camera,
      lodBias: 1,
      currentZ: undefined,
    });

  const targetKeys = (p: ReturnType<typeof planLayerNodes>) =>
    new Set(p.nodes.filter((n) => n.role === "target").map((n) => n.key));

  it("identity voxelWorldSize ≡ omitted (the legacy reduction, bit for bit)", () => {
    const position: [number, number, number] = [-50, 128, 128];
    const withIdentity = plan(cameraAt(position, [1, 1, 1]));
    const without = plan(cameraAt(position));
    expect(sameNodePlan(withIdentity, without)).toBe(true);
    expect(withIdentity.nodes.map((n) => n.fetchScore)).toEqual(
      without.nodes.map((n) => n.fetchScore),
    );
  });

  it("side-on (across the thick z): the world metric refines what voxel distance under-refined", () => {
    // Camera 50 base voxels off the x face. Voxel metric: far x-half sits at
    // 178 voxels → 0.49 px/voxel < 1 → held coarse. World metric: 178·0.5 =
    // 89 µm and the finer level's WORLD factor is max(0.5, 0.5, 5) = 5 →
    // 0.97 px/µm · 5 ≈ 4.9 ≥ 1 → the whole volume earns refinement (the
    // audit's worked example: side-on was ~κ under-refined).
    const position: [number, number, number] = [-50, 128, 128];
    const legacy = plan(cameraAt(position));
    const world = plan(cameraAt(position, SPIM));
    const legacyFine = legacy.nodes.filter((n) => n.role === "target" && n.level === 0);
    const worldFine = world.nodes.filter((n) => n.role === "target" && n.level === 0);
    expect(legacyFine.length).toBeGreaterThan(0);
    expect(legacyFine.every((n) => n.coords[0] <= 1)).toBe(true); // near half only
    expect(worldFine).toHaveLength(64); // every L0 brick
  });

  it("along the thick z itself: refinement is unchanged (the ratio is scale-invariant on-axis)", () => {
    // Camera 50 voxels off the z face at the volume's x/y center: every
    // nearest-point displacement is pure z, and for pure-z displacement the
    // world footprint (px / (d·s_z)) · (finerScale_z · s_z) equals the voxel
    // expression exactly — the metric cancels. Same admitted set, so the
    // world fix cannot over-refine the view that was already correct.
    const position: [number, number, number] = [128, 128, -50];
    const legacy = plan(cameraAt(position));
    const world = plan(cameraAt(position, SPIM));
    expect(targetKeys(world)).toEqual(targetKeys(legacy));
  });
});

/**
 * The decode budget is spent on CHUNKS, and the fetcher pulls one chunk per
 * (spatial, channel, phasor) combination — but the accounting counted spatial
 * voxels only. A 4-channel layer therefore under-charged by 4x, which is how a
 * level whose real chunk set was ~1.1 GiB passed a 276 MiB budget check.
 *
 * Mirrors `BrickResidencyManager.enumerateBrickChunkCoords`.
 */
describe("nonSpatialDecodeFactor", () => {
  const geoWith = (dims: string[], levels: LevelSource[], layer: LayerState) =>
    buildLayerLevelGeometry(dims, layer, levels)!;

  const channelLayer = (channels: number) =>
    ({
      id: "layer-c",
      affineMatrix: null,
      xAxis: "x",
      yAxis: "y",
      zAxis: "z",
      intensityAxis: "c",
      fixedLOD: null,
      lens: {
        slices: [],
        axisNames: ["c", "z", "y", "x"],
        shape: [channels, 8, 64, 64],
        dataset: { axisNames: ["c", "z", "y", "x"], dataArrays: [] },
      },
    }) as unknown as LayerState;

  it("is 1 for a single-channel layer — the existing fixtures are a no-op", () => {
    // This is why every pre-existing test in this file passes unchanged.
    expect(nonSpatialDecodeFactor(flatGeo, flatGeo.levels[0])).toBe(1);
  });

  it("counts every channel a 4-channel layer decodes", () => {
    const geo = geoWith(
      ["c", "z", "y", "x"],
      [{ shape: [4, 8, 64, 64], chunks: [1, 8, 64, 64], dtype: "uint8", storeId: "s0" }],
      channelLayer(4),
    );
    expect(nonSpatialDecodeFactor(geo, geo.levels[0])).toBe(4);
  });

  it("is invariant to HOW the channel axis is chunked", () => {
    // 4 chunks of 1 channel and 1 chunk of 4 channels decode the same bytes.
    const perChannel = geoWith(
      ["c", "z", "y", "x"],
      [{ shape: [4, 8, 64, 64], chunks: [1, 8, 64, 64], dtype: "uint8", storeId: "s0" }],
      channelLayer(4),
    );
    const allChannels = geoWith(
      ["c", "z", "y", "x"],
      [{ shape: [4, 8, 64, 64], chunks: [4, 8, 64, 64], dtype: "uint8", storeId: "s0" }],
      channelLayer(4),
    );
    expect(nonSpatialDecodeFactor(perChannel, perChannel.levels[0])).toBe(4);
    expect(nonSpatialDecodeFactor(allChannels, allChannels.levels[0])).toBe(4);
  });

  it("multiplies collapsed dims by their chunk extent — the whole chunk decodes", () => {
    // One t coordinate is fixed, but the chunk spanning 5 timepoints still
    // decodes in full. Same bug class as the channel undercount.
    const layer = {
      ...(channelLayer(1) as unknown as Record<string, unknown>),
      lens: {
        slices: [],
        axisNames: ["t", "c", "z", "y", "x"],
        shape: [10, 1, 8, 64, 64],
        dataset: { axisNames: ["t", "c", "z", "y", "x"], dataArrays: [] },
      },
    } as unknown as LayerState;
    const geo = geoWith(
      ["t", "c", "z", "y", "x"],
      [{ shape: [10, 1, 8, 64, 64], chunks: [5, 1, 8, 64, 64], dtype: "uint8", storeId: "s0" }],
      layer,
    );
    expect(nonSpatialDecodeFactor(geo, geo.levels[0])).toBe(5);
  });
});

/**
 * The reported case, encoded from a real debug report: a 4-channel 2456²x47
 * uint8 pyramid whose L0 chunks are FULL PLANES ([1, 3, 2456, 2456]).
 *
 * Level 0 was unreachable no matter how far the user zoomed. These pin why, and
 * pin that the budget change does not demote them in the process of fixing it.
 */
describe("plane-chunked 4-channel pyramid (the reported case)", () => {
  const MiB = 1024 * 1024;
  const DIMS = ["c", "z", "y", "x"];
  const layer = {
    id: "layer-plane",
    affineMatrix: null,
    xAxis: "x",
    yAxis: "y",
    zAxis: "z",
    intensityAxis: "c",
    fixedLOD: null,
    lens: {
      slices: [],
      axisNames: DIMS,
      shape: [4, 47, 2456, 2456],
      dataset: { axisNames: DIMS, dataArrays: [] },
    },
  } as unknown as LayerState;

  const LEVELS: LevelSource[] = [
    { shape: [4, 47, 2456, 2456], chunks: [1, 3, 2456, 2456], dtype: "uint8", storeId: "s0" },
    {
      shape: [4, 23, 1228, 1228],
      chunks: [1, 13, 1228, 1228],
      dtype: "uint8",
      storeId: "s1",
      scaleFactors: [2, 2, 2],
    },
    {
      shape: [4, 11, 614, 614],
      chunks: [4, 11, 614, 614],
      dtype: "uint8",
      storeId: "s2",
      scaleFactors: [4, 4, 4],
    },
  ];
  const geo = buildLayerLevelGeometry(DIMS, layer, LEVELS)!;
  const spec = resolveBrickSpec(geo, "3D");
  const view: LayerViewRange = {
    xRange: [1223, 2456],
    yRange: [612, 1918],
    zRange: [0, 47],
    scale: 1.0599,
  };

  const planWith = (decodeFloorBytes: number) =>
    planLayerNodes({
      layer,
      geometry: geo,
      spec,
      mode: "3D",
      viewRange: view,
      camera: null,
      lodBias: 1,
      currentZ: 0,
      maxPlanBytes: 512 * MiB,
      decodeFloorBytes,
    });

  it("charges level 0 the WHOLE level, regardless of the view", () => {
    // Full-plane chunks make min(gridExtent, chunkCount) identically 1 on x and
    // y, so no amount of zooming shrinks this. That is the entire reason level 0
    // was unreachable — not the zoom, not wantFiner, not the quality tier.
    const p = planWith(256 * MiB);
    expect(p.levelDecodeBytes[0]).toBe(2456 * 2456 * 48 * 4);

    const zoomedIn = planLayerNodes({
      layer,
      geometry: geo,
      spec,
      mode: "3D",
      viewRange: { xRange: [1900, 2000], yRange: [900, 1000], zRange: [0, 47], scale: 8 },
      camera: null,
      lodBias: 1,
      currentZ: 0,
      maxPlanBytes: 512 * MiB,
      decodeFloorBytes: 256 * MiB,
    });
    expect(zoomedIn.levelDecodeBytes[0]).toBe(p.levelDecodeBytes[0]);
  });

  it("counts all four channels — the undercount that made the budget optimistic", () => {
    const p = planWith(256 * MiB);
    // Spatial-only accounting said 276.1 MiB; the fetcher really pulls 4x that.
    expect(p.levelDecodeBytes[0]).toBe(4 * (2456 * 2456 * 48));
    expect(p.levelDecodeBytes[1]).toBe(4 * (1228 * 1228 * 26));
  });

  it("holds level 1 at the new floor — the regression the budget change prevents", () => {
    // Corrected L1 is 149.6 MiB. Against today's flat 128 MiB it would NOT fit
    // and the user would drop to L2; against the cache-derived 256 MiB it does.
    expect(planWith(128 * MiB).budgetMinLevel).toBe(2);
    expect(planWith(256 * MiB).budgetMinLevel).toBe(1);
  });

  it("reaches level 0 through the SUB-FLOOR ALLOWANCE on a large decode cache", () => {
    // What the user's override actually buys. The floor stays at L1; the
    // closest-first DFS then charges L0's whole chunk set (1104.5 MiB) against
    // the allowance, which at a 4 GiB cache share is 2048 MiB.
    const p = planLayerNodes({
      layer,
      geometry: geo,
      spec,
      mode: "3D",
      viewRange: view,
      camera: null,
      lodBias: 1,
      currentZ: 0,
      maxPlanBytes: 512 * MiB,
      decodeCacheShareBytes: 4096 * MiB,
    });
    expect(p.budgetMinLevel).toBe(1);
    expect(p.decodeAllowanceBytes).toBe(2048 * MiB);
    expect(p.decodeBytesCharged).toBe(2456 * 2456 * 48 * 4);
    expect(p.targetLevel).toBe(0);
  });

  it("does NOT reach level 0 at the default cache share — the override is required", () => {
    // 1 GiB share → allowance 512 MiB, well under L0's 1104.5 MiB. This is why
    // the fix is a user override rather than a silent default bump.
    const p = planLayerNodes({
      layer,
      geometry: geo,
      spec,
      mode: "3D",
      viewRange: view,
      camera: null,
      lodBias: 1,
      currentZ: 0,
      maxPlanBytes: 512 * MiB,
      decodeCacheShareBytes: 1024 * MiB,
    });
    expect(p.targetLevel).toBe(1);
    expect(p.decodeBytesCharged).toBe(0);
  });

  it("still cannot reach level 0 on the FLOOR alone, at any allowed cache size", () => {
    // The floor is a quarter of the cache share, and the cache is clamped at
    // 4 GiB — so the floor tops out at 1024 MiB while L0 needs 1104.5 MiB.
    // Reaching L0 is the sub-floor allowance's job, not the floor's.
    expect(planWith(1024 * MiB).budgetMinLevel).toBe(1);
    expect(planWith(1104 * MiB).budgetMinLevel).toBe(1);
    expect(planWith(1105 * MiB).budgetMinLevel).toBe(0);
  });
});

describe("planLayerNodes LOD hysteresis (previousKeepKeys)", () => {
  // FLAT_LEVELS: the L1 root refines into the 2×2 L0 grid once
  // scale × L0 factor (1) × lodBias >= 1. Sweep the scale across the band.
  const planAt = (scale: number, previousKeepKeys?: ReadonlySet<string>) =>
    planLayerNodes({
      layer: makeLayer(),
      geometry: flatGeo,
      spec: flatSpec,
      mode: "2D",
      viewRange: { ...FULL_VIEW, scale },
      camera: null,
      lodBias: 1,
      currentZ: 0,
      previousKeepKeys,
    });
  const keepKeysOf = (plan: LayerNodePlan) =>
    new Set(plan.nodes.filter((n) => n.role === "keep").map((n) => n.key));

  it("unlocks the finer level only at the full threshold without history", () => {
    expect(planAt(1.0).targetLevel).toBe(0);
    expect(planAt(0.95).targetLevel).toBe(1);
  });

  it("holds a previously refined node within the slack band", () => {
    const fine = planAt(2);
    expect(fine.targetLevel).toBe(0);
    const keep = keepKeysOf(fine);
    expect(keep.size).toBeGreaterThan(0);
    // 0.95 >= 1/1.15 — held; the same view without history coarsened above.
    expect(planAt(0.95, keep).targetLevel).toBe(0);
  });

  it("is a band, not a ratchet: below the slack it coarsens even with history", () => {
    const keep = keepKeysOf(planAt(2));
    expect(planAt(1 / LOD_HYSTERESIS - 0.01, keep).targetLevel).toBe(1);
  });

  it("does not help a node that was never refined", () => {
    const keep = keepKeysOf(planAt(0.5)); // coarse view: nothing was refined
    expect(keep.size).toBe(0);
    expect(planAt(0.95, keep).targetLevel).toBe(1);
  });
});

describe("planLayerNodes motion ceiling (refineCeilingLevel)", () => {
  const planWith = (overrides: { refineCeilingLevel?: number; layer?: LayerState }) =>
    planLayerNodes({
      layer: overrides.layer ?? makeLayer(),
      geometry: flatGeo,
      spec: flatSpec,
      mode: "2D",
      viewRange: FULL_VIEW, // scale 2 → wants L0 everywhere
      camera: null,
      lodBias: 1,
      currentZ: 0,
      refineCeilingLevel: overrides.refineCeilingLevel,
    });

  it("caps refinement at the ceiling while the camera moves", () => {
    expect(planWith({}).targetLevel).toBe(0);
    const capped = planWith({ refineCeilingLevel: 1 });
    expect(capped.targetLevel).toBe(1);
    expect(capped.nodes.every((n) => n.level >= 1)).toBe(true);
  });

  it("a ceiling at or below the desired level changes nothing", () => {
    expect(planWith({ refineCeilingLevel: 0 }).targetLevel).toBe(0);
  });

  it("a pinned fixedLOD ignores the ceiling", () => {
    expect(planWith({ refineCeilingLevel: 1, layer: makeLayer({ fixedLOD: 0 }) }).targetLevel).toBe(0);
  });
});
