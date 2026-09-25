import {
  isMeshSample,
  type AttributePlanLike,
} from "@/mikro/lib/attributes/attributeTypes";
import type { HeldValue } from "@/mikro/lib/attributes/planExec";
import type { LayerState } from "../../../platform/model/layerModel";
import type { BrickResidencyManager } from "./brickResidency";

/**
 * The scene-only RESIDENT fast path for attribute sampling: an optimistic
 * sync pre-read from the brick atlas's CPU mirror, bound only when it is
 * provably reading the same slice — the plan must be locally rooted (empty
 * path: its non-spatial coordinates then come from the SAME scene-wide
 * `dimSelections` the layer's pool collapsed on) and the plan's array must be
 * some rendered layer's level-0 store. Coarser-LOD reads can misattribute a
 * label at object boundaries, which is why the shared executor upgrades every
 * miss through the service's exact chunk read.
 *
 * The exact path itself lives in the scene-free service
 * (`@/mikro/lib/attributes/exactSampleSource`).
 */

export type ResidentSampleContext = {
  getBrickSystem: () => BrickResidencyManager | null;
  getLayers: () => readonly LayerState[];
};

type ResidentBinding = {
  layerId: string;
  /** Positions of the render axes in the sample system's axis order. */
  xPos: number;
  yPos: number;
  zPos: number;
};

const level0Of = (layer: LayerState) =>
  layer.lens.dataset.dataArrays.reduce<
    LayerState["lens"]["dataset"]["dataArrays"][number] | null
  >((best, da) => (best === null || da.level < best.level ? da : best), null);

/**
 * Axis names in declared order, memoized on the SYSTEM object — a pure
 * function of it, so no invalidation contract. Without this the copy+sort+map
 * ran once per plan per probe.
 */
const axisNamesCache = new WeakMap<AttributePlanLike["sample"]["system"], string[]>();
const axisNamesOf = (system: AttributePlanLike["sample"]["system"]): string[] => {
  const cached = axisNamesCache.get(system);
  if (cached) return cached;
  const names = [...system.axes]
    .sort((a, b) => a.order - b.order)
    .map((axis) => axis.name);
  axisNamesCache.set(system, names);
  return names;
};

const findResidentBinding = (
  layers: readonly LayerState[],
  plan: AttributePlanLike,
): ResidentBinding | null => {
  // A mesh sample has no array to read residently (its store is a fabriks
  // prefix, and store ids are not comparable across kinds).
  if (isMeshSample(plan.sample)) return null;
  for (const layer of layers) {
    const level0 = level0Of(layer);
    if (!level0 || level0.store.id !== plan.sample.store.id) continue;
    const axisNames = axisNamesOf(plan.sample.system);
    const ra = layer.lens.renderAxes;
    const xPos = axisNames.indexOf(ra.x);
    const yPos = axisNames.indexOf(ra.y);
    if (xPos === -1 || yPos === -1) return null;
    return {
      layerId: layer.id,
      xPos,
      yPos,
      zPos: ra.z ? axisNames.indexOf(ra.z) : -1,
    };
  }
  return null;
};

/**
 * Per-plan resident sampler: null when the plan cannot be resident-sampled
 * (path-mapped, or its array is not on screen) — the executor then goes
 * straight to the exact read.
 */
export function createResidentSampler(ctx: ResidentSampleContext) {
  /**
   * Resolved bindings, keyed on the plan and guarded by the LAYERS array's
   * identity: the scene store hands out a new array only on a real layer edit,
   * so a stale binding is impossible while it holds. Identity-keyed on both
   * sides, so again there is no invalidation contract to get wrong.
   */
  const bindings = new WeakMap<
    AttributePlanLike,
    { layers: readonly LayerState[]; binding: ResidentBinding | null }
  >();

  return (
    plan: AttributePlanLike,
  ): ((index: readonly number[]) => HeldValue | null) | null => {
    const layers = ctx.getLayers();
    let resident: ResidentBinding | null;
    const cached = bindings.get(plan);
    if (cached && cached.layers === layers) {
      resident = cached.binding;
    } else {
      resident = plan.path.length === 0 ? findResidentBinding(layers, plan) : null;
      bindings.set(plan, { layers, binding: resident });
    }
    if (!resident) return null;
    return (index) => {
      const brickSystem = ctx.getBrickSystem();
      if (!brickSystem) return null;
      return brickSystem.sampleResident(
        resident.layerId,
        [
          index[resident.xPos] ?? 0,
          index[resident.yPos] ?? 0,
          resident.zPos !== -1 ? index[resident.zPos] ?? 0 : 0,
        ],
        0,
        0,
      );
    };
  };
}

export type ResidentSampler = ReturnType<typeof createResidentSampler>;
