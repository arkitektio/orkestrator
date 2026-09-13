/**
 * Client-side composition of the coordinate-transformation graph.
 *
 * The server ships transformations as EDGES (`input CS -> output CS`) and,
 * per scene layer, a resolved PATH of edges (`Layer.pathToWorld`:
 * `[{transformation, inverted}]`) from the layer's source system to the
 * scene's world system — a layer belongs to exactly one scene, so that path
 * has a single right answer and resolving it is a server fact, not a client
 * search. What stays client-side is turning edges into MATRICES: evaluating
 * each step (inverting the flagged ones) and folding the chain into the
 * single spatial 4×4 `affineMatrix` (x, y, z row order) that
 * `worldTransform.affineToMatrix4` and everything downstream of it already
 * consume. The octree planner, culling and slab math are untouched: they see
 * one voxel→world matrix per layer, exactly as before the schema change.
 *
 * Transformation arrays (`scale`, `translation`, affine rows/columns) are in
 * the axis order of their edge's input coordinate system; the spatial subset
 * is extracted by axis NAME via the lens' server-derived `renderAxes`.
 * Anything the evaluator cannot interpret (displacement fields, bijections,
 * axis permutations, singular inverses) degrades to identity with a console
 * warning rather than rendering the layer somewhere wrong silently.
 */

/** Structural subset of a generated `Transformation` fragment (any variant). */
export type TransformLike = {
  __typename?: string;
  kind?: string;
  input?: { id: string; name?: string | null } | null;
  output?: { id: string; name?: string | null } | null;
  scale?: readonly number[] | null;
  translation?: readonly number[] | null;
  affine?: readonly (readonly number[])[] | null;
  inputAxes?: readonly string[] | null;
  outputAxes?: readonly string[] | null;
  transformations?: readonly TransformLike[] | null;
} | null;

export type CoordinateSystemLike = {
  id: string;
  name?: string | null;
  axes?: readonly { name: string; type?: string | null; order?: number | null }[] | null;
} | null;

/** Structural subset of the `Scene` fragment this module needs. */
export type SceneTransformContext = {
  worldCoordinateSystem?: CoordinateSystemLike;
  coordinateSystems?: readonly NonNullable<CoordinateSystemLike>[] | null;
};

/** One step of a server-resolved placement path. */
export type PlacementStepLike = {
  transformation: TransformLike;
  /** Walk the edge output→input: invert its matrix before composing. */
  inverted: boolean;
};

/** Structural subset of an `ImageLayer` fragment this module needs. */
export type LayerTransformSource = {
  /** Server-resolved path to the scene's world system (null = unregistered). */
  pathToWorld?: readonly PlacementStepLike[] | null;
  /**
   * The SAME path, composed by the server ("`asAffine` is the same path
   * composed, for when you only need the map"). Preferred over walking
   * `pathToWorld` edge by edge: identical span, one authority, and it cannot
   * be mis-indexed by a contract-violating edge the way a client-side walk
   * can. `pathToWorld` stays selected for cache reconciliation and for the
   * per-step provenance the placement inspector shows.
   */
  asAffine?: {
    matrix: readonly (readonly number[])[];
    inputAxes: readonly string[];
    outputAxes: readonly string[];
    total?: boolean;
  } | null;
  lens: {
    axisNames: readonly string[];
    renderAxes: { x: string; y: string; z?: string | null };
    coordinateSystem?: { id: string } | null;
    toParent?: TransformLike;
    dataset: {
      intrinsicSystem?: CoordinateSystemLike;
      dataArrays: readonly {
        level: number;
        coordinateSystem?: { id: string } | null;
        toParent?: TransformLike;
      }[];
    };
  };
};

/**
 * The [x, y, z] axis NAMES of a coordinate system — the `spatial` triple every
 * reduction in this module addresses rows and columns by.
 *
 * mikro writes spatial axes in array order with **x LAST** (`(c,y,x)`,
 * `(z,y,x)`) — the rule `Lens.renderAxes` states as "spatial axes are in array
 * order, so the last is x". So this takes the SPACE-typed axes in order and
 * reads them back to front. A 2D system yields `z = null`, which the evaluator
 * already treats as "leave that row/column identity".
 *
 * Reversing this is not a cosmetic slip: it transposes the placement, which is
 * exactly the class of bug this helper exists to stop being re-derived per
 * call site.
 *
 * `Axis.type` is required by the schema and always selected (the `Axis`
 * fragment), so a payload without it is structurally broken rather than merely
 * sparse. Guessing "the last three axes are spatial" there would put a CHANNEL
 * or TIME axis in the z slot and place the layer somewhere wrong; this module
 * degrades to identity instead, so an empty triple is the answer.
 */
export const spatialAxisTriple = (
  cs: CoordinateSystemLike | undefined,
): [string | null, string | null, string | null] => {
  const axes = cs?.axes;
  if (!axes?.length) return [null, null, null];
  const ordered = axes.some((axis) => axis.order != null)
    ? [...axes].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    : [...axes];
  const names = ordered.filter((axis) => axis.type === "SPACE").map((axis) => axis.name);
  if (!names.length) {
    warnOnce(
      `spatialAxes:${cs?.id ?? "?"}`,
      `coordinate system ${cs?.name ?? cs?.id ?? "?"} declares no SPACE axes; placements against it degrade to identity`,
    );
    return [null, null, null];
  }
  // Back to front: last spatial axis is x.
  return [names.at(-1) ?? null, names.at(-2) ?? null, names.at(-3) ?? null];
};

/** Row-major 4×4, rows = [x', y', z', w] — the shape `affineToMatrix4` takes. */
type Mat4 = number[][];

const identity4 = (): Mat4 => [
  [1, 0, 0, 0],
  [0, 1, 0, 0],
  [0, 0, 1, 0],
  [0, 0, 0, 1],
];

/** a · b (apply b first, then a) for column-vector convention. */
const mul4 = (a: Mat4, b: Mat4): Mat4 => {
  const out = identity4();
  for (let r = 0; r < 4; r++)
    for (let c = 0; c < 4; c++)
      out[r][c] = a[r][0] * b[0][c] + a[r][1] * b[1][c] + a[r][2] * b[2][c] + a[r][3] * b[3][c];
  return out;
};

const isIdentity4 = (m: Mat4): boolean =>
  m.every((row, r) => row.every((v, c) => v === (r === c ? 1 : 0)));

/**
 * Inverse of an AFFINE 4×4 (last row 0,0,0,1 — every matrix this module
 * produces is one): invert the 3×3 block by adjugate, transform the
 * translation. Null when singular (degenerate edge; caller degrades).
 */
export const invert4 = (m: Mat4): Mat4 | null => {
  const a = m[0][0], b = m[0][1], c = m[0][2];
  const d = m[1][0], e = m[1][1], f = m[1][2];
  const g = m[2][0], h = m[2][1], i = m[2][2];
  const det = a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);
  if (!Number.isFinite(det) || Math.abs(det) < 1e-12) return null;
  const r = [
    [(e * i - f * h) / det, (c * h - b * i) / det, (b * f - c * e) / det],
    [(f * g - d * i) / det, (a * i - c * g) / det, (c * d - a * f) / det],
    [(d * h - e * g) / det, (b * g - a * h) / det, (a * e - b * d) / det],
  ];
  const t = [m[0][3], m[1][3], m[2][3]];
  const out = identity4();
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) out[row][col] = r[row][col];
    out[row][3] = -(r[row][0] * t[0] + r[row][1] * t[1] + r[row][2] * t[2]);
  }
  return out;
};

/**
 * Which index array a per-axis parameter list (`scale` / `translation`) is to
 * be read with.
 *
 * The CONTRACT is `inputAxes`: "`scale`, `translation` and the columns of
 * `affine` follow this order — which is the input system's axis order". A
 * conformant edge has `params.length === axesIn.length` and takes `inPos`,
 * unchanged from before this guard existed.
 *
 * The two other arms exist because reading a mis-sized array against
 * `inputAxes` does not fail — it silently yields a WRONG matrix. A 4-element
 * `inputAxes: [c,z,y,x]` with a 3-element `scale` aligned to
 * `outputAxes: [z,y,x]` reads x at index 3 (`undefined` → 1) and slides z's
 * value onto y and y's onto z: the layer renders at the wrong aspect, the
 * wrong z spacing AND the wrong world position, with nothing logged.
 *
 *  - `params.length === axesOut.length` → read with `outPos`, warn once. This
 *    is a TOLERANCE for a contract-violating payload, NOT the contract: it
 *    exists so a bad server build is loud and approximately right instead of
 *    quiet and wrong. The real fix is server-side (emit `inputAxes` matching
 *    the parameter arity, and refuse to call such a layer placed).
 *  - neither length matches → null, so the caller degrades the whole step to
 *    identity, which is the behaviour this module's header promises.
 */
const paramPositions = (
  transform: NonNullable<TransformLike>,
  params: readonly number[] | null | undefined,
  field: "scale" | "translation",
  axesIn: readonly string[],
  axesOut: readonly string[],
  inPos: readonly number[],
  outPos: readonly number[],
): readonly number[] | null => {
  // Nothing to index: every slot falls back to its identity value below.
  if (!params?.length) return inPos;
  if (params.length === axesIn.length) return inPos;

  const edge = `${transform.__typename}:${transform.input?.id ?? "?"}→${transform.output?.id ?? "?"}`;
  if (params.length === axesOut.length) {
    warnOnce(
      `arity:${edge}:${field}`,
      `${edge} declares inputAxes [${axesIn.join(",")}] but its ${field} has ${params.length} entries, ` +
        `matching outputAxes [${axesOut.join(",")}]; reading it against outputAxes. ` +
        `This edge violates the schema contract — fix the server so the parameter arity matches inputAxes.`,
    );
    return outPos;
  }

  warnOnce(
    `arity:${edge}:${field}`,
    `${edge} has a ${field} of ${params.length} entries matching neither inputAxes ` +
      `[${axesIn.join(",")}] nor outputAxes [${axesOut.join(",")}]; treating the step as identity.`,
  );
  return null;
};

const edgeLabel = (transform: NonNullable<TransformLike>): string =>
  `${transform.__typename}:${transform.input?.id ?? "?"}→${transform.output?.id ?? "?"}`;

/**
 * Which axis names an affine's ROWS are to be read with.
 *
 * The contract is `outputAxes`: "rows in output axis order", one row per
 * output axis, each row `inputAxes.length + 1` wide. A conformant edge takes
 * `axesOut` unchanged.
 *
 * Mirrors `paramPositions`: reading a mis-sized affine against `outputAxes`
 * does not fail — it yields a WRONG matrix with nothing logged (a 2-row affine
 * under `[c,y,x]` reads y from the x row and finds no x row at all). Any
 * mismatch that reaches here is null: the step degrades to identity, loudly.
 * The one tolerated shape is resolved BEFORE this, by `compositeChildAxesOut`.
 */
const affineRowAxes = (
  transform: NonNullable<TransformLike>,
  rows: readonly (readonly number[])[],
  axesIn: readonly string[],
  axesOut: readonly string[],
): readonly string[] | null => {
  const edge = edgeLabel(transform);
  const width = axesIn.length + 1;
  if (rows.some((row) => row.length < width)) {
    warnOnce(
      `affine-arity:${edge}:cols`,
      `${edge} declares inputAxes [${axesIn.join(",")}] but an affine row has fewer than ` +
        `${width} entries; treating the step as identity.`,
    );
    return null;
  }
  if (rows.length === axesOut.length) return axesOut;
  warnOnce(
    `affine-arity:${edge}:rows`,
    `${edge} declares outputAxes [${axesOut.join(",")}] but its affine has ${rows.length} rows; ` +
      `treating the step as identity. This edge violates the schema contract — fix the server ` +
      `so outputAxes lists exactly the axes the affine has rows for.`,
  );
  return null;
};

/**
 * Evaluate one transformation edge into the spatial 4×4.
 *
 * `axesIn` / `axesOut` are the FULL axis-name orders of the edge's input and
 * output systems. `spatial` names the [x, y, z] axes on the INPUT side (z null
 * for 2D data); `spatialOut` the same three slots on the OUTPUT side, which
 * defaults to `spatial` because an image's lens and its world share axis names.
 *
 * They are NOT always the same list. A point layer's input system is its
 * table's coordinate COLUMNS (`TableDataset.coordinateSystem` — "its axes are
 * the table's coordinate columns"), so its x/y/z are `PointLayer.xColumn` &c.
 * while the output side is the world's own axis names. Collapsing the two is
 * how a placement silently degrades to identity.
 *
 * Both lists are [x, y, z] slots, in that order — slot i means the same
 * spatial direction on either side, only the NAME that finds it differs.
 * Returns null when the edge (or a composite child) cannot be interpreted.
 */
export const evalTransform = (
  transform: TransformLike,
  axesIn: readonly string[],
  axesOut: readonly string[],
  spatial: readonly (string | null | undefined)[],
  spatialOut: readonly (string | null | undefined)[] = spatial,
): Mat4 | null => {
  if (!transform) return identity4();
  const typename = transform.__typename ?? "";

  const inPos = spatial.map((name) => (name ? axesIn.indexOf(name) : -1));
  const outPos = spatialOut.map((name) => (name ? axesOut.indexOf(name) : -1));

  switch (typename) {
    case "IdentityTransformation":
      return identity4();
    case "ScaleTransformation": {
      const pos = paramPositions(transform, transform.scale, "scale", axesIn, axesOut, inPos, outPos);
      if (!pos) return null;
      const m = identity4();
      spatial.forEach((_, i) => {
        const p = pos[i];
        if (p !== -1) m[i][i] = transform.scale?.[p] ?? 1;
      });
      return m;
    }
    case "TranslationTransformation": {
      const pos = paramPositions(
        transform,
        transform.translation,
        "translation",
        axesIn,
        axesOut,
        inPos,
        outPos,
      );
      if (!pos) return null;
      const m = identity4();
      spatial.forEach((_, i) => {
        const p = pos[i];
        if (p !== -1) m[i][3] = transform.translation?.[p] ?? 0;
      });
      return m;
    }
    case "AffineTransformation":
    case "RotationTransformation": {
      // M × (N+1), rows in output axis order, columns in input axis order,
      // last column the translation.
      const rows = transform.affine;
      if (!rows?.length) return null;
      const rowAxes = affineRowAxes(transform, rows, axesIn, axesOut);
      if (!rowAxes) return null;
      const rowPos =
        rowAxes === axesOut ? outPos : spatialOut.map((name) => (name ? rowAxes.indexOf(name) : -1));
      const m = identity4();
      let readAnyRow = false;
      for (let i = 0; i < spatial.length; i++) {
        const r = rowPos[i];
        if (r === -1 || !rows[r]) continue;
        readAnyRow = true;
        for (let j = 0; j < spatial.length; j++) {
          const c = inPos[j];
          m[i][j] = c !== -1 ? rows[r][c] ?? (i === j ? 1 : 0) : i === j ? 1 : 0;
        }
        m[i][3] = rows[r][axesIn.length] ?? 0;
      }
      // The edge CONSUMES spatial input axes, yet no output slot named one of
      // its rows: the caller's output triple does not describe this edge's
      // output side (lens names `col,row` handed to an edge that writes
      // `y,x`). Identity here is the silent misplacement this module promises
      // never to produce — a layer left in raw pixels with nothing logged.
      // Null instead, so the caller degrades loudly.
      if (!readAnyRow && inPos.some((p) => p !== -1)) {
        warnOnce(
          `affine-out:${edgeLabel(transform)}:${spatialOut.join(",")}`,
          `${edgeLabel(transform)} writes [${rowAxes.join(",")}] but none of the output slots ` +
            `[${spatialOut.join(",")}] names one of them; cannot place. ` +
            `The caller's output axis names must be the edge's OUTPUT system's, not its input's.`,
        );
        return null;
      }
      return m;
    }
    case "SequenceTransformation":
    case "ByDimensionTransformation": {
      // Children are applied first to last. They self-describe their
      // parameter order (`inputAxes`/`outputAxes` — for ByDimension children
      // that is the SUBSET of axes they act on; unnamed axes pass through
      // untouched, which the name-based extraction handles by leaving
      // identity rows). Fall back to the composite's own axes for payloads
      // predating self-description.
      //
      // Every child gets the SAME `spatial`/`spatialOut` pair, which assumes
      // the intermediate systems of a chain name their spatial axes alike —
      // unknowable otherwise, since a step's intermediate CS is not carried
      // here. True for what reaches this arm: the lens/level-0 prefix edges
      // (`toParent` sequences within one dataset). World placements never do —
      // they arrive pre-composed as a flat `asAffine`.
      let m = identity4();
      for (const child of transform.transformations ?? []) {
        const cm = evalTransform(
          child,
          child?.inputAxes ?? axesIn,
          child?.outputAxes ?? axesOut,
          spatial,
          spatialOut,
        );
        if (!cm) return null;
        m = mul4(cm, m);
      }
      return m;
    }
    default:
      // MapAxis / Bijection / Displacements (and future kinds): not
      // representable as a spatial affine here.
      return null;
  }
};

// Intentional module-level dedupe set for one-time diagnostics, capped so an
// app-lifetime consumer can't grow it without bound (past the cap, warn-once
// degrades to warn-never — acceptable for a diagnostics channel).
const WARNED_EDGES_CAP = 256;
const warnedEdges = new Set<string>();
const warnOnce = (key: string, message: string) => {
  if (warnedEdges.has(key) || warnedEdges.size >= WARNED_EDGES_CAP) return;
  warnedEdges.add(key);
  console.warn(`[transformGraph] ${message}`);
};

/** CS id → axis-name order, from every system the scene fragment resolves. */
const buildAxesIndex = (scene: SceneTransformContext): Map<string, string[]> => {
  const axesById = new Map<string, string[]>();
  for (const cs of scene.coordinateSystems ?? []) {
    if (cs?.axes?.length) axesById.set(cs.id, cs.axes.map((axis) => axis.name));
  }
  const world = scene.worldCoordinateSystem;
  if (world?.axes?.length) axesById.set(world.id, world.axes.map((axis) => axis.name));
  return axesById;
};

/**
 * Reduce a server-composed `AffinePlacement` to the spatial 4×4.
 *
 * `Layer.asAffine` hands back the whole `pathToWorld` already composed, as an
 * `M × (N+1)` matrix with rows in `outputAxes` order, columns in `inputAxes`
 * order and the translation in the last column — the SAME layout an
 * `AffineTransformation` edge uses, so this is `evalTransform`'s affine case
 * and no second implementation of the reduction exists.
 *
 * Two things this must not be short-cut into:
 *  - Rows/columns are addressed BY NAME. `outputAxes` is the world's own axis
 *    order, and mikro writes spatial axes with x LAST (`(c,y,x)`, `(z,y,x)`),
 *    so reading row 0 as x is a transposition, not a simplification.
 *  - The translation is at column `inputAxes.length`, NOT at index 3. A 2D
 *    placement is `2 × 3`; taking column 3 (or clamping to `min(4, …)`) writes
 *    the translation into the z basis, where a z=0 layer multiplies it away.
 *
 * `outputAxes` names only the axes the path CONSTRAINS, so a partial
 * registration (`total: false`) leaves the unnamed axes as identity rows —
 * an honest pass-through rather than pinning the data at their origin.
 *
 * Null in (unregistered layer) or an identity result → null out, matching
 * `composeLayerAffine`'s contract that callers read null as identity.
 */
export function placementToSpatialAffine(
  placement:
    | {
        matrix: readonly (readonly number[])[];
        inputAxes: readonly string[];
        outputAxes: readonly string[];
      }
    | null
    | undefined,
  spatialIn: readonly (string | null | undefined)[],
  spatialOut: readonly (string | null | undefined)[] = spatialIn,
): number[][] | null {
  if (!placement?.matrix?.length) return null;
  const m = evalTransform(
    { __typename: "AffineTransformation", affine: placement.matrix },
    placement.inputAxes,
    placement.outputAxes,
    spatialIn,
    spatialOut,
  );
  if (!m) {
    warnOnce(
      `placement:${placement.inputAxes.join(",")}→${placement.outputAxes.join(",")}`,
      `cannot reduce an AffinePlacement (${placement.inputAxes.join(",")} → ${placement.outputAxes.join(",")}) to a spatial affine; treating as identity`,
    );
    return null;
  }
  return isIdentity4(m) ? null : m;
}

/** Source CS id of a path's first step (where the walk starts). */
const pathStartId = (steps: readonly PlacementStepLike[]): string | undefined => {
  const first = steps[0];
  if (!first?.transformation) return undefined;
  return (first.inverted ? first.transformation.output : first.transformation.input)?.id;
};

/**
 * Compose a layer's lens-voxel→world spatial affine.
 *
 * `pathToWorld` starts at the layer's SOURCE system — but the renderer's
 * voxel frame is the LENS grid, so any prefix the path does not cover
 * (lens → level-0 crop, level-0 → intrinsic) is prepended from the lens' and
 * level-0's own `toParent` edges, keyed off the path's actual start CS.
 *
 * The placement is the server's `asAffine`, the ONLY authority: this module
 * never composes `pathToWorld` into a matrix. A layer without `asAffine` is
 * not placeable and is not drawn (`isPlaceable` in layerModel gates the
 * dispatch); what this returns for it is only the local prefix.
 */
export function composeLayerAffine(
  scene: SceneTransformContext,
  layer: LayerTransformSource,
): number[][] | null {
  const dims = layer.lens.axisNames;
  const ra = layer.lens.renderAxes;
  const spatial = [ra.x, ra.y, ra.z] as const;
  // The path ENDS in the world system, whose axes need not be named like the
  // lens' (`row,col` bin lattices land in a `y,x` world). Reducing the
  // placement with lens names on its output side indexOf's every slot to -1
  // and drops the whole registration — the layer sits in raw pixels with no
  // warning. Typed world axes give the real output triple; a world without
  // axis types (older payloads, structural fixtures) keeps the lens names,
  // which is exactly what those composed with before.
  const world = scene.worldCoordinateSystem;
  const worldSpatial: readonly (string | null | undefined)[] = world?.axes?.some(
    (axis) => axis.type != null,
  )
    ? spatialAxisTriple(world)
    : spatial;

  const axesById = buildAxesIndex(scene);
  const axesOf = (cs: { id: string } | null | undefined): readonly string[] =>
    (cs && axesById.get(cs.id)) ?? dims;

  const evalEdgeOrIdentity = (transform: TransformLike, label: string): Mat4 => {
    if (!transform) return identity4();
    // Self-described axis order first (`inputAxes`/`outputAxes` on the edge);
    // the CS-index fallback remains for edges predating self-description.
    const m = evalTransform(
      transform,
      transform.inputAxes ?? axesOf(transform.input),
      transform.outputAxes ?? axesOf(transform.output),
      spatial,
    );
    if (m) return m;
    warnOnce(label, `cannot evaluate ${transform.__typename} for ${label}; treating as identity`);
    return identity4();
  };

  const level0 = layer.lens.dataset.dataArrays.reduce<
    LayerTransformSource["lens"]["dataset"]["dataArrays"][number] | null
  >((best, da) => (best === null || da.level < best.level ? da : best), null);

  const path = layer.pathToWorld;
  const startId = path?.length ? pathStartId(path) : undefined;
  const lensCsId = layer.lens.coordinateSystem?.id;
  const level0CsId = level0?.coordinateSystem?.id;

  // Local prefix: everything between the lens grid and the path's start.
  let m = identity4();
  const pathStartsAtLens = startId !== undefined && startId === lensCsId;
  const pathStartsAtLevel0 = startId !== undefined && startId === level0CsId;
  if (!pathStartsAtLens) {
    // lens voxel → level-0 voxel (crop translation; identity when unsliced)
    m = evalEdgeOrIdentity(layer.lens.toParent ?? null, "lens.toParent");
    if (!pathStartsAtLevel0) {
      // level-0 voxel → intrinsic pixels (relative pyramid factor; ≈identity)
      m = mul4(evalEdgeOrIdentity(level0?.toParent ?? null, "dataArray.toParent"), m);
    }
  }

  // The placement itself is the server's `asAffine` and NOTHING else — the
  // client never composes `pathToWorld` into a matrix. A null `asAffine`
  // (unregistered layer, or a path the server could not condense: a FIELD
  // step without a closed form, a singular inverse) means the layer is not
  // placeable; `LayerRenderer` keeps it off screen (`isPlaceable`) and the
  // layer panel says why. The matrix returned here is then only the local
  // prefix and must not be read as a world placement.
  if (layer.asAffine) {
    const pathMatrix = placementToSpatialAffine(layer.asAffine, spatial, worldSpatial);
    if (pathMatrix) m = mul4(pathMatrix, m);
    if (layer.asAffine.total === false) {
      warnOnce(
        `partial:${lensCsId ?? "?"}`,
        `layer's placement is partial (asAffine.total = false): it constrains only ` +
          `[${layer.asAffine.outputAxes.join(",")}] of the world's axes; the rest pass through as identity`,
      );
    }
  } else {
    warnOnce(
      `unplaceable:${path === null ? "unregistered" : "uncomposable"}:${lensCsId ?? "?"}`,
      path === null
        ? `layer has no path to the scene's world system (unregistered); not drawn`
        : `layer's placement could not be composed server-side (asAffine is null); not drawn`,
    );
  }

  return isIdentity4(m) ? null : m;
}
