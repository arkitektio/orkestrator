/**
 * Which axis of a layer's lens the renderer draws as screen x, y and z — read
 * off the layer's placement, not stated by the server.
 *
 * A layer's `asAffine` already says, row by row, which lens axis lands on
 * which world axis. So the only free choice is which WORLD axis goes to which
 * screen slot: the view. The identity view puts the world's x, y, z on screen
 * x, y, z; an XZ view puts world z on screen y and looks down world y.
 * Given the view, each screen slot takes the lens axis that dominates that
 * world axis' row, so the lattice→screen map stays near-diagonal whatever the
 * view — which is what the 2D slab path (it slices along lattice z) and the
 * brick addressing (by axis position) need.
 *
 * The non-spatial axes (time, channel, phasor, displacement) are a type scan
 * over the lens' axes, as the server's `resolve_render_axes` does it: where
 * they sit changes nothing, and no transform decides them.
 */

import {
  spatialAxisTriple,
  type CoordinateSystemLike,
  type SceneTransformContext,
} from "./transformGraph";

/** A world spatial slot (0 = x, 1 = y, 2 = z, as `spatialAxisTriple` orders them). */
export type WorldSlot = 0 | 1 | 2;

/** Screen slot i shows world slot `view[i]`: a permutation of [0, 1, 2]. */
export type ViewAxes = readonly [WorldSlot, WorldSlot, WorldSlot];

export const IDENTITY_VIEW: ViewAxes = [0, 1, 2];

/** The three axis-aligned planes a scene can be looked at in. */
export const VIEW_PLANES = {
  XY: [0, 1, 2],
  XZ: [0, 2, 1],
  YZ: [1, 2, 0],
} as const satisfies Record<string, ViewAxes>;

export type ViewPlane = keyof typeof VIEW_PLANES;

export const isIdentityView = (view: ViewAxes | null | undefined): boolean =>
  !view || (view[0] === 0 && view[1] === 1 && view[2] === 2);

export const viewPlaneOf = (view: ViewAxes | null | undefined): ViewPlane | null =>
  (Object.keys(VIEW_PLANES) as ViewPlane[]).find((plane) =>
    VIEW_PLANES[plane].every((slot, index) => slot === (view ?? IDENTITY_VIEW)[index]),
  ) ?? null;

/** The world's spatial axis names in SCREEN order: what three-space's x, y, z are. */
export const viewTriple = (
  world: CoordinateSystemLike | undefined,
  view: ViewAxes | null | undefined,
): [string | null, string | null, string | null] => {
  const base = spatialAxisTriple(world);
  const order = view ?? IDENTITY_VIEW;
  return [base[order[0]], base[order[1]], base[order[2]]];
};

/** `viewTriple` of a scene's transform context: the output side of every placement. */
export const worldViewTriple = (scene: SceneTransformContext | null | undefined) =>
  viewTriple(scene?.worldCoordinateSystem, scene?.viewAxes as ViewAxes | null | undefined);

/**
 * A three-space point back in world spatial order ([x, y, z] of the world's
 * own triple): what anything written to the server is expressed in.
 */
export const viewToWorldPoint = <T>(point: readonly [T, T, T], view: ViewAxes | null | undefined): [T, T, T] => {
  const order = view ?? IDENTITY_VIEW;
  const out = [...point] as [T, T, T];
  for (let screen = 0; screen < 3; screen++) out[order[screen]] = point[screen];
  return out;
};

/** The inverse of `viewToWorldPoint`. */
export const worldToViewPoint = <T>(point: readonly [T, T, T], view: ViewAxes | null | undefined): [T, T, T] => {
  const order = view ?? IDENTITY_VIEW;
  return [point[order[0]], point[order[1]], point[order[2]]];
};

export type RenderAxesLike = {
  x: string;
  y: string;
  z: string | null;
  t: string | null;
  intensity: string | null;
  phasor: string | null;
  vector: string | null;
};

export type LensAxisLike = { name: string; type?: string | null };

export type PlacementLike = {
  matrix: readonly (readonly number[])[];
  inputAxes: readonly string[];
  outputAxes: readonly string[];
  /** World axes given by an array's values instead of a matrix row (`asAffine.fields`). */
  fields?: readonly { outputAxis: string; inputAxis?: string | null }[] | null;
} | null;

const PHASOR_TYPES = new Set(["MICROTIME", "SPECTRUM"]);
const GUESSED_TYPES: Record<string, string> = { t: "TIME", time: "TIME", c: "CHANNEL", channel: "CHANNEL" };
const SCREEN_NAMES = [new Set(["x", "y"]), new Set(["x", "y", "z"])];

const firstOfType = (axes: readonly LensAxisLike[], accept: (type: string) => boolean) =>
  axes.find((axis) => axis.type != null && accept(axis.type))?.name ?? null;

/**
 * The server's own spatial rule (`resolve_render_axes`): bound by name when
 * the SPACE axes are exactly {x, y} or {x, y, z}, otherwise last is x, the one
 * before y, the one before z. What a layer falls back to when its placement
 * cannot answer.
 */
const conventionalSlots = (spatial: readonly string[]): [string | null, string | null, string | null] => {
  const byName = new Map(spatial.map((name) => [name.toLowerCase(), name]));
  if (byName.size === spatial.length && SCREEN_NAMES.some((set) => set.size === byName.size && [...set].every((n) => byName.has(n)))) {
    return [byName.get("x") ?? null, byName.get("y") ?? null, byName.get("z") ?? null];
  }
  return [spatial.at(-1) ?? null, spatial.at(-2) ?? null, spatial.at(-3) ?? null];
};

/** Below this a coefficient is a rounding residue, not an axis landing on a row. */
const EPSILON = 1e-9;

/**
 * Screen x / y / z of one layer's lens under the view, from its placement.
 *
 * Each screen slot reads the `asAffine` row of the world axis it shows and
 * takes the not-yet-taken lens SPACE axis with the largest |coefficient| in
 * it. A world axis given by a field read along one lens axis (uneven z
 * planes) takes that axis: the field has no matrix row, but the axis is still
 * the one drawn there. A world axis the placement does not constrain at all (a
 * partial registration passes it through as identity) takes the lens axis of
 * the same name.
 * A slot nothing lands on stays null: a 2D lens' depth slot in the XY view,
 * or its screen y in an XZ view — the layer is then seen edge-on.
 *
 * In the identity view an unanswered x or y falls back to the server's
 * convention, so a layer that drew before still draws.
 */
export const deriveRenderAxes = ({
  lensAxes,
  axisNames,
  placement,
  screen,
  view,
}: {
  /** The lens' axes with their types (its coordinate system's). */
  lensAxes: readonly LensAxisLike[] | null | undefined;
  /** The lens' axis names, the fallback when its axes carry no types. */
  axisNames: readonly string[];
  placement: PlacementLike | undefined;
  /** The world's spatial axis names in screen order (`worldViewTriple`). */
  screen: readonly (string | null | undefined)[];
  view?: ViewAxes | null;
}): { axes: RenderAxesLike; edgeOn: boolean } => {
  // A lens whose system did not come with its axes (it has none yet) is read
  // by the conventional names, so a channel axis is never taken for depth.
  const typed: LensAxisLike[] = lensAxes?.some((axis) => axis.type != null)
    ? [...lensAxes]
    : axisNames.map((name) => ({ name, type: GUESSED_TYPES[name.toLowerCase()] ?? "SPACE" }));
  const spatial = typed.filter((axis) => axis.type === "SPACE").map((axis) => axis.name);

  const taken = new Set<string>();
  const slots: (string | null)[] = [null, null, null];
  if (placement?.matrix?.length || placement?.fields?.length) {
    for (let slot = 0; slot < 3; slot++) {
      const world = screen[slot];
      if (!world) continue;
      const row = placement.outputAxes.indexOf(world);
      if (row === -1) {
        const along = placement.fields?.find((field) => field.outputAxis === world)?.inputAxis;
        if (along && spatial.includes(along) && !taken.has(along)) slots[slot] = along;
        else if (spatial.includes(world) && !taken.has(world)) slots[slot] = world;
      } else {
        let best: string | null = null;
        let bestWeight = EPSILON;
        for (const name of spatial) {
          if (taken.has(name)) continue;
          const column = placement.inputAxes.indexOf(name);
          const weight = column === -1 ? 0 : Math.abs(placement.matrix[row]?.[column] ?? 0);
          if (weight > bestWeight) {
            best = name;
            bestWeight = weight;
          }
        }
        slots[slot] = best;
      }
      if (slots[slot]) taken.add(slots[slot]!);
    }
  }

  let edgeOn = false;
  if (!slots[0] || !slots[1]) {
    if (isIdentityView(view)) {
      const fallback = conventionalSlots(spatial);
      slots[0] = fallback[0];
      slots[1] = fallback[1];
      slots[2] = fallback[2];
    } else {
      edgeOn = true;
    }
  }

  return {
    axes: {
      x: slots[0] ?? "",
      y: slots[1] ?? "",
      z: slots[2],
      t: firstOfType(typed, (type) => type === "TIME"),
      intensity: firstOfType(typed, (type) => type === "CHANNEL"),
      phasor: firstOfType(typed, (type) => PHASOR_TYPES.has(type)),
      vector: firstOfType(typed, (type) => type === "DISPLACEMENT"),
    },
    edgeOn,
  };
};
