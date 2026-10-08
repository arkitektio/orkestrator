import type { ExtractionContext, TubeSurface, BrushSample, Vec3 } from "../brush";
import type { StampSpec } from "../field/stamps";
import type { ReconstructGesture, ReconstructorId, ReconstructParams } from "../store/meshDesignStore";
import type { ReconstructSettings } from "./settings";
import { tubeFit } from "./tubeFit";
import { tubeSurface } from "./tubeSurface";
import { ballFit } from "./ballFit";
import { ballSurface } from "./ballSurface";

/**
 * The RECONSTRUCTORS: interchangeable strategies for turning the intensity
 * under a gesture into a mesh. The design tool only says which gesture was
 * made (`trace` = a stroke, `seed` = a click); the reconstructor picked for
 * that gesture decides what the data becomes:
 *
 *  - a FITTED reconstructor measures a simple model (a tube of varying
 *    width, an ellipsoid) and returns it as an analytic stamp spec — smooth,
 *    regular, cheap, and only as detailed as the model;
 *  - a SURFACE reconstructor returns the intensity isosurface itself —
 *    faithful to every bump in the data.
 *
 * A reconstructor never touches the design session: it returns a result,
 * `candidate.ts` turns that into a previewable candidate, and the user's
 * verdict applies it. Adding one = one module + one entry here + its panel
 * in `ui/reconstructPanels.tsx` (the `Record` there fails the build without).
 */
export type ReconstructContext = {
  /** The captured gesture: world/voxel samples, seed first. */
  gesture: readonly BrushSample[];
  layerId: string;
  extraction: ExtractionContext;
  settings: ReconstructSettings;
  params: ReconstructParams;
  /** True when a newer run took over — return null, apply nothing. */
  stale: () => boolean;
  /** Intermediate surfaces of a long run (the grow animation). */
  publishLive: (tube: TubeSurface) => void;
};

export type ReconstructResult = (
  | {
      kind: "surface";
      /** Triangle soup, WORLD coordinates. */
      tube: TubeSurface;
      /** World size of one voxel of the level it was marched at. */
      spacing: Vec3;
    }
  | {
      kind: "stamp";
      /** The fitted shape, as data (it is built into a field in a worker). */
      spec: StampSpec;
      /** Field resolution the stamp deserves (world units). */
      spacing: number;
      /** A fitted centerline to draw over the preview. */
      guide?: Vec3[];
    }
) & { level: number; note?: string };

export type Reconstructor = {
  id: ReconstructorId;
  gesture: ReconstructGesture;
  /** Short label for the picker. */
  title: string;
  description: string;
  /** What the resulting mesh is recorded as (`DesignMeshSource.kind`). */
  sourceKind: "tube" | "blob";
  /**
   * Null = stale (a newer run took over). Throws an `Error` whose message is
   * shown to the user verbatim when the gesture yields nothing.
   */
  run: (ctx: ReconstructContext) => Promise<ReconstructResult | null>;
};

export const RECONSTRUCTORS: readonly Reconstructor[] = [tubeFit, tubeSurface, ballFit, ballSurface];

export const reconstructorById = (id: ReconstructorId): Reconstructor | undefined =>
  RECONSTRUCTORS.find((reconstructor) => reconstructor.id === id);

export const reconstructorsFor = (gesture: ReconstructGesture): Reconstructor[] =>
  RECONSTRUCTORS.filter((reconstructor) => reconstructor.gesture === gesture);
