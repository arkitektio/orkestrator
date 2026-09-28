import type { DesignGeometry } from "../store/meshDesignStore";

/**
 * Mesh simplification for the designer — a DESIGN tool, not an LOD builder.
 *
 * The user picks how much detail to commit; the server-side consolidation job
 * builds the LOD pyramid later from whatever was committed. Runs on
 * meshoptimizer's WASM simplifier (`meshoptimizer/simplifier`), behind a
 * small interface so the pure remap half is unit-testable without WASM and
 * the whole module is swappable.
 */

export type SimplifierLike = {
  ready: Promise<void>;
  simplify: (
    indices: Uint32Array,
    positions: Float32Array,
    stride: number,
    targetIndexCount: number,
    targetError: number,
    flags?: ("LockBorder" | "Sparse" | "ErrorAbsolute" | "Prune")[],
  ) => [Uint32Array, number];
};

let loaded: Promise<SimplifierLike> | null = null;

/** The WASM simplifier, loaded once on first use. */
export const loadSimplifier = (): Promise<SimplifierLike> => {
  if (!loaded) {
    loaded = import("meshoptimizer/simplifier").then(async ({ MeshoptSimplifier }) => {
      await MeshoptSimplifier.ready;
      return MeshoptSimplifier as unknown as SimplifierLike;
    });
  }
  return loaded;
};

/**
 * Drop the vertices no triangle references any more and renumber the rest —
 * the simplifier only rewrites the index buffer.
 */
export function compactGeometry(positions: Float32Array, indices: Uint32Array): DesignGeometry {
  const remap = new Int32Array(positions.length / 3).fill(-1);
  let next = 0;
  for (let i = 0; i < indices.length; i++) {
    const v = indices[i];
    if (remap[v] === -1) remap[v] = next++;
  }
  const out = new Float32Array(next * 3);
  for (let v = 0; v < remap.length; v++) {
    const target = remap[v];
    if (target === -1) continue;
    out[target * 3] = positions[v * 3];
    out[target * 3 + 1] = positions[v * 3 + 1];
    out[target * 3 + 2] = positions[v * 3 + 2];
  }
  const remapped = new Uint32Array(indices.length);
  for (let i = 0; i < indices.length; i++) remapped[i] = remap[indices[i]];
  return { positions: out, indices: remapped };
}

/**
 * Simplify to an ABSOLUTE world-space error bound — "as coarse as it can be
 * while staying within `absoluteError` of the input". This is what ties a
 * designed mesh to the data's physical resolution: with the error set to one
 * voxel of the extraction level, the marched surface's grain collapses to a
 * surface at voxel fidelity and nothing finer survives. No triangle target
 * (`0`): the error bound alone governs.
 */
export async function simplifyToError(
  original: DesignGeometry,
  absoluteError: number,
  options: { simplifier?: SimplifierLike } = {},
): Promise<DesignGeometry> {
  if (!(absoluteError > 0) || original.indices.length < 12) return original;
  const simplifier = options.simplifier ?? (await loadSimplifier());
  const [indices] = simplifier.simplify(original.indices, original.positions, 3, 0, absoluteError, [
    "LockBorder",
    "ErrorAbsolute",
  ]);
  if (indices.length === original.indices.length) return original;
  return compactGeometry(original.positions, indices);
}

/**
 * Simplify to roughly `ratio` of the original triangle count. `ratio ≥ 1`
 * returns the original untouched. Error is relative to the mesh's extent
 * (meshoptimizer's default); 0.05 is a visibly faithful ceiling.
 */
export async function simplifyGeometry(
  original: DesignGeometry,
  ratio: number,
  options: { targetError?: number; simplifier?: SimplifierLike } = {},
): Promise<DesignGeometry> {
  if (ratio >= 1 || original.indices.length < 12) return original;
  const simplifier = options.simplifier ?? (await loadSimplifier());
  const targetIndexCount = Math.max(3, Math.floor((original.indices.length * ratio) / 3) * 3);
  const [indices] = simplifier.simplify(
    original.indices,
    original.positions,
    3,
    targetIndexCount,
    options.targetError ?? 0.05,
    ["LockBorder"],
  );
  return compactGeometry(original.positions, indices);
}
