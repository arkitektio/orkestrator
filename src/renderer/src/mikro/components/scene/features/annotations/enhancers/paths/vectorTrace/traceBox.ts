/**
 * The window one hop searches in, and how to read it.
 *
 * A 3D box grows cubically, which is the whole cost story: 512³ is 134M nodes,
 * far past anything a click can wait for. So a hop does NOT search the layer —
 * it searches the box its two waypoints span (dilated, so the path may bow
 * around an obstacle), sampled at the coarsest pyramid level that fits a node
 * budget.
 *
 * Coarsening is not only a budget trick. `sampleResident` answers from whatever
 * is currently resident, and the octree keeps coarse levels resident by design —
 * so the level the budget picks is also the level most likely to be *complete*.
 * Where it is not, the value is `NaN` and `traceCost` turns that into an
 * impassable node: a trace refuses to route through data nobody has loaded
 * rather than inventing a way past it.
 */

/** Level-0 voxel coordinates, `[x, y, z]`. */
export type Voxel = readonly [number, number, number];

export type TraceBox = {
  /** Level-0 voxel that node (0, 0, 0) samples. */
  origin: readonly [number, number, number];
  /** Node counts along x, y, z. */
  size: readonly [number, number, number];
  /** Pyramid level the nodes sample at. */
  level: number;
  /**
   * Level-0 voxels per node step, PER AXIS. Not `2 ** level`: a microscopy
   * pyramid routinely downsamples xy and leaves z alone, and stepping z by the
   * xy factor would skip slices that were never coarsened.
   */
  step: readonly [number, number, number];
  /** World length of one node step per axis. */
  spacing: readonly [number, number, number];
};

/**
 * Level-0 voxels per voxel at each pyramid level, per axis — `levelSteps[2]`
 * might be `[4, 4, 1]` for an xy-only pyramid. Derived from the levels' shapes
 * (`traceLayer.traceLevelSteps`) rather than assumed.
 */
export type LevelSteps = readonly (readonly [number, number, number])[];

export type TraceBoxPlan = {
  start: Voxel;
  goal: Voxel;
  /** Level-0 spatial extent of the layer, `[x, y, z]`. */
  shape: readonly [number, number, number];
  /** World length of ONE level-0 voxel per axis. */
  voxelSize: readonly [number, number, number];
  /** Level-0 voxels per voxel at each available level, per axis. */
  levelSteps: LevelSteps;
  /** Fraction of the hop's extent to dilate the box by. */
  margin?: number;
  /**
   * Minimum dilation, in multiples of the FINEST voxel dimension. Physical
   * rather than in voxels: with 0.3 µm xy and 4 µm z, "4 voxels of room" means
   * 1.2 µm sideways and 16 µm through depth — the box would balloon in z and
   * spend its budget on slices the hop has no reason to visit.
   */
  minPad?: number;
  /**
   * Don't dilate in z: the flat view draws ONE slice, and a box that reached
   * into neighbouring slices would spend its budget on data that is not on
   * screen (and mostly not resident either). The z span is then exactly what
   * the two waypoints straddle — normally one slice, more only if the user
   * scrubbed z mid-chain, which is a real hop through depth rather than
   * something to flatten away.
   */
  flatten?: boolean;
  /**
   * A floor on the z dilation, in level-0 SLICES, when not flattened. The
   * physical pad alone is no room at all through depth on anisotropic data:
   * 4 finest voxels of 0.3 µm is 1.2 µm, which rounds to zero 4 µm slices — so
   * two clicks on one slice would search that slice only, however "3D" the
   * trace was asked to be. This is what lets an enhanced edge dip through the
   * neighbouring slices to follow a structure that leaves the drawn one.
   */
  depthSlices?: number;
  /**
   * The physical pad and the margin dilate x and y only; z gets `depthSlices`
   * (or nothing, flattened) and no more. For boxes that are sized by what is
   * on SCREEN — a live-wire window, a stroke's corridor — where a pad of a
   * hundred microns sideways says nothing about how deep to look.
   */
  planarPad?: boolean;
  /**
   * Further level-0 voxels the box must contain besides the two ends — a
   * freehand stroke's samples, which may bow far outside the box its ends
   * span.
   */
  through?: readonly Voxel[];
  /** Node ceiling for one hop. */
  maxNodes?: number;
};

/**
 * How far an enhanced trace may leave the slices its waypoints sit on.
 *
 * - `"2D"` — not at all: the box is exactly the z span the waypoints straddle
 *   (one slice, unless the user scrubbed z between clicks — then the path
 *   runs through the slices in between, and only those).
 * - `"3D"` — `DEFAULT_TRACE_DEPTH_SLICES` beyond them as well, so a path may
 *   dip through depth to follow a structure the drawn slice only grazes.
 */
export type TraceDepth = "2D" | "3D";

/** The z room a `"3D"` trace gets either side of its waypoints, in slices. */
export const DEFAULT_TRACE_DEPTH_SLICES = 4;

/**
 * The box options a `TraceDepth` stands for, in the view the waypoints came
 * from. The slice floor is the FLAT view's: there, two clicks share a slice
 * and the box has no depth unless it is given some. Probed waypoints in the
 * volume already sit at the depths the data put them, and the volume keeps
 * the box it always traced in — the physical pad, no floor.
 */
export const traceDepthPlan = (
  depth: TraceDepth,
  view: "2D" | "3D" = "2D",
): Pick<TraceBoxPlan, "flatten" | "depthSlices"> =>
  depth === "2D"
    ? { flatten: true }
    : view === "2D"
      ? { flatten: false, depthSlices: DEFAULT_TRACE_DEPTH_SLICES }
      : { flatten: false };

/**
 * Node ceiling per hop. Deliberately well under what the search could survive:
 * this runs on the click, on the main thread, and the waypoint gesture means
 * hops are short — a budget that is never reached costs nothing, and one that
 * is reached costs a visible stall.
 */
export const DEFAULT_TRACE_MAX_NODES = 512_000;
export const DEFAULT_TRACE_MARGIN = 0.3;
export const DEFAULT_TRACE_MIN_PAD = 4;

/** Node counts a level's per-axis steps produce over a level-0 extent. */
export const nodeCountAt = (
  extent: readonly [number, number, number],
  step: readonly [number, number, number],
): [number, number, number] => [
  Math.max(1, Math.ceil(extent[0] / Math.max(1, step[0]))),
  Math.max(1, Math.ceil(extent[1] / Math.max(1, step[1]))),
  Math.max(1, Math.ceil(extent[2] / Math.max(1, step[2]))),
];

/**
 * The finest level whose node count fits the budget.
 *
 * Walks the pyramid rather than assuming 8× a level: an xy-only pyramid gives
 * 4× a level, and a level that does not coarsen at all gives 1×. The last level
 * is the fallback when even the coarsest overflows — the search then runs on a
 * box it cannot afford to refine, which is still better than refusing to trace.
 */
export function chooseTraceLevel(
  extent: readonly [number, number, number],
  levelSteps: LevelSteps,
  maxNodes: number,
): number {
  const last = Math.max(0, levelSteps.length - 1);
  for (let level = 0; level < levelSteps.length; level += 1) {
    const [x, y, z] = nodeCountAt(extent, levelSteps[level]);
    if (x * y * z <= maxNodes) return level;
  }
  return last;
}

/** The box a hop searches, plus the level it samples at. */
export function planTraceBox(plan: TraceBoxPlan): TraceBox {
  const {
    start,
    goal,
    shape,
    voxelSize,
    levelSteps,
    margin = DEFAULT_TRACE_MARGIN,
    minPad = DEFAULT_TRACE_MIN_PAD,
    maxNodes = DEFAULT_TRACE_MAX_NODES,
    flatten = false,
    depthSlices = 0,
    planarPad = false,
    through = [],
  } = plan;

  const min: [number, number, number] = [0, 0, 0];
  const extent: [number, number, number] = [1, 1, 1];

  // One physical distance, converted into each axis' own voxels — so the box
  // has comparable room to bow in every direction, whatever the spacing is.
  const padWorld = minPad * Math.min(voxelSize[0], voxelSize[1], voxelSize[2]);

  for (let axis = 0; axis < 3; axis += 1) {
    let low = Math.min(start[axis], goal[axis]);
    let high = Math.max(start[axis], goal[axis]);
    for (const voxel of through) {
      low = Math.min(low, voxel[axis]);
      high = Math.max(high, voxel[axis]);
    }
    const physical =
      planarPad && axis === 2
        ? 0
        : Math.max(
            Math.round(padWorld / (voxelSize[axis] || 1)),
            Math.round((high - low) * margin),
          );
    const pad =
      axis !== 2 ? physical : flatten ? 0 : Math.max(physical, depthSlices);
    const from = Math.max(0, Math.floor(low - pad));
    const to = Math.min(Math.max(0, shape[axis] - 1), Math.ceil(high + pad));
    min[axis] = from;
    extent[axis] = Math.max(1, to - from + 1);
  }

  const steps: LevelSteps = levelSteps.length > 0 ? levelSteps : [[1, 1, 1]];
  const level = chooseTraceLevel(extent, steps, maxNodes);
  const step = steps[level];

  return {
    origin: min,
    size: nodeCountAt(extent, step),
    level,
    step,
    spacing: [
      voxelSize[0] * step[0],
      voxelSize[1] * step[1],
      voxelSize[2] * step[2],
    ],
  };
}

/** Level-0 voxel → node coordinates, clamped into the box. */
export function traceNodeOf(box: TraceBox, voxel: Voxel): [number, number, number] {
  const node: [number, number, number] = [0, 0, 0];
  for (let axis = 0; axis < 3; axis += 1) {
    const raw = Math.round(
      (voxel[axis] - box.origin[axis]) / Math.max(1, box.step[axis]),
    );
    node[axis] = Math.max(0, Math.min(box.size[axis] - 1, raw));
  }
  return node;
}

/**
 * Level-0 voxel → node coordinates, or null when the voxel lies outside the
 * box. The non-clamping twin of `traceNodeOf`, for a live-wire cursor: a
 * cursor past the window's edge has no path in the tree, and snapping it onto
 * the edge would draw one that ends somewhere the pointer is not.
 */
export function traceNodeInBox(
  box: TraceBox,
  voxel: Voxel,
): [number, number, number] | null {
  const node: [number, number, number] = [0, 0, 0];
  for (let axis = 0; axis < 3; axis += 1) {
    const raw = Math.round(
      (voxel[axis] - box.origin[axis]) / Math.max(1, box.step[axis]),
    );
    if (raw < 0 || raw > box.size[axis] - 1) return null;
    node[axis] = raw;
  }
  return node;
}

/** Node coordinates → the level-0 voxel that node samples. */
export function traceVoxelOf(
  box: TraceBox,
  node: readonly [number, number, number],
): [number, number, number] {
  return [
    box.origin[0] + node[0] * box.step[0],
    box.origin[1] + node[1] * box.step[1],
    box.origin[2] + node[2] * box.step[2],
  ];
}

/**
 * Read the box into one array before searching. Sampling through the residency
 * manager inside the search's inner loop is the difference between a click that
 * feels instant and one that stalls — the search touches each node many times.
 *
 * `NaN` marks "nothing resident here", which `traceCost` promotes to impassable.
 */
export function extractTraceValues(
  box: TraceBox,
  sample: (voxel: [number, number, number]) => number | null,
): Float32Array {
  const values = new Float32Array(box.size[0] * box.size[1] * box.size[2]);
  let index = 0;
  for (let z = 0; z < box.size[2]; z += 1) {
    for (let y = 0; y < box.size[1]; y += 1) {
      for (let x = 0; x < box.size[0]; x += 1) {
        const value = sample(traceVoxelOf(box, [x, y, z]));
        values[index] = value === null ? Number.NaN : value;
        index += 1;
      }
    }
  }
  return values;
}

/**
 * Level-0 voxel → the layer's LOCAL frame, the one its affine maps to world.
 *
 * The local frame IS corner-anchored voxel space (COORDINATE_SYSTEMS.md
 * "Coordinate conventions"), so this is the voxel index at its CENTRE —
 * voxel k spans [k, k+1), centre k+0.5 — and a traced path runs through the
 * middle of its voxels rather than along their corners.
 */
export function voxelToLayerLocal(
  voxel: Voxel,
  _shape: readonly [number, number, number],
): [number, number, number] {
  return [voxel[0] + 0.5, voxel[1] + 0.5, voxel[2] + 0.5];
}

/**
 * The layer's local frame → the level-0 voxel containing that point, or null
 * when it falls outside the layer. The inverse of `voxelToLayerLocal`, and the
 * way a FLAT click becomes a waypoint: a 2D click has no probe behind it, only
 * a world point on the drawn slice.
 */
export function layerLocalToVoxel(
  local: readonly [number, number, number],
  shape: readonly [number, number, number],
): [number, number, number] | null {
  const voxel: [number, number, number] = [
    Math.round(local[0] - 0.5),
    Math.round(local[1] - 0.5),
    Math.round(local[2] - 0.5),
  ];
  for (let axis = 0; axis < 3; axis += 1) {
    if (voxel[axis] < 0 || voxel[axis] > shape[axis] - 1) return null;
  }
  return voxel;
}
