import type { ExtractionContext, BrushSkeletonState, TubeSurface, BrushSample } from "../brush";
import type { LastReconstruction, MeshDesignState, ReconstructGesture } from "../store/meshDesignStore";
import { timed } from "../perf";
import { applyReconstruction } from "./apply";
import { reconstructorById } from "./registry";
import { reconstructKey, settingsOf } from "./settings";

/** `ok: false` carries the sentence to show; null = a newer run took over. */
export type ReconstructOutcome = { ok: true } | { ok: false; message: string } | null;

/**
 * One reconstruction, gesture → mesh: run the reconstructor picked for this
 * gesture and put its result into the session. Shared by the first run (a
 * tool's `run`, on release) and every re-run (a slider moved —
 * `useReconstructRerun`, which passes the reconstruction it is re-tuning),
 * so the two cannot produce different meshes.
 */
export async function reconstruct(input: {
  gestureKind: ReconstructGesture;
  gesture: readonly BrushSample[];
  layerId: string;
  /** Null when the layer left the scene. */
  extraction: ExtractionContext | null;
  brush: BrushSkeletonState;
  design: MeshDesignState;
  stale: () => boolean;
  publishLive: (tube: TubeSurface) => void;
  /** Set on a re-run: the reconstruction whose result this one replaces. */
  retune?: LastReconstruction;
}): Promise<ReconstructOutcome> {
  const { design, extraction, stale } = input;
  if (!extraction) return { ok: false, message: "The gesture's layer is no longer in the scene" };
  const reconstructor = reconstructorById(design.reconstructors[input.gestureKind]);
  if (!reconstructor) return { ok: false, message: "No reconstructor is selected" };
  const settings = settingsOf(input.brush);
  const params = design.reconstructParams;
  // The gesture array is the brush store's own (mutated in place by the next
  // stroke): this run works on its copy.
  const gesture = input.gesture.map((sample) => ({ world: sample.world, voxel: sample.voxel }));
  try {
    const result = await timed(`reconstruct:${reconstructor.id}`, () =>
      reconstructor.run({
        gesture,
        layerId: input.layerId,
        extraction,
        settings,
        params,
        stale,
        publishLive: input.publishLive,
      }),
    );
    if (!result || stale()) return null;
    const applied = await timed("reconstruct:apply", () =>
      applyReconstruction(design, result, {
        reconstructor,
        gestureKind: input.gestureKind,
        gesture,
        layerId: input.layerId,
        paramsKey: reconstructKey(reconstructor.id, settings, params),
        settings,
        retune: input.retune,
        superseded: stale,
      }),
    );
    if (stale()) return null;
    if (!applied) return { ok: false, message: "The reconstruction collapsed to nothing" };
    return { ok: true };
  } catch (error) {
    if (stale()) return null;
    return { ok: false, message: error instanceof Error ? error.message : String(error) };
  }
}
