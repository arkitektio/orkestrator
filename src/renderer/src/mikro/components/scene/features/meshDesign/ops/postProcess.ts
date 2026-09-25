import type { DesignGeometry } from "../store/meshDesignStore";
import { simplifyToError } from "./simplify";
import { taubinSmooth } from "./smoothMesh";

/**
 * The shared finishing pipeline every design tool ends in: polish (Taubin,
 * shrink-free — takes the marching grain out so the simplifier fits the
 * shape, not the noise) then simplify to the absolute Detail error. Returns
 * both halves: `original` is what re-simplification restarts from, `current`
 * is what renders and commits.
 */
export async function finishDesignGeometry(
  geometry: DesignGeometry,
  opts: { polishIterations: number; detailWorld: number },
): Promise<{ original: DesignGeometry; current: DesignGeometry }> {
  const original = taubinSmooth(geometry, { iterations: opts.polishIterations });
  try {
    return { original, current: await simplifyToError(original, opts.detailWorld) };
  } catch (error) {
    console.warn("[design] simplification failed; keeping the polished surface", error);
    return { original, current: original };
  }
}
