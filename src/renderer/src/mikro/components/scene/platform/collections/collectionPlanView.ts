import * as THREE from "three";

/**
 * The camera-derived half of a collection plan: what the planner needs of the
 * view, and nothing about the collection.
 *
 * Both LOD-Parquet formats take exactly this. Budgets (`pixelBudget`,
 * `maxCells`, `maxLevel`) are deliberately NOT here — they live in each
 * manager's plan config, where the debug panel can steer them between settles.
 */
export type CollectionPlanView = {
  /** WORLD-space frustum. The cell index is transformed to world once at load
   *  (`platform/lod/lodCatalog.ts`), so the test is a straight containment. */
  frustum: THREE.Frustum;
  /** WORLD-space camera position; null plans without a camera. */
  cameraPosition: [number, number, number] | null;
  /** `0.5 · viewportHeight / tan(0.5 · fovY)`: an object of world size `s` at
   *  distance `d` covers `s · focalPixels / d` pixels. */
  focalPixels: number;
  /** The ORTHO alternative. An orthographic camera has no focal length, so the
   *  planner's camera-free branch takes over; without this an ortho plan
   *  refines everything to level 0. */
  errorBudget?: number;
};

/** What the view store supplies. Structural, so a test can pass a literal. */
export type PlanViewState = {
  viewProjectionMatrix: THREE.Matrix4 | null;
  viewportSize: { height: number };
  cameraPose: {
    isPerspective: boolean;
    fovY: number;
    position: readonly number[];
  } | null;
};

/**
 * View state → plan view, or null when there is nothing to plan against yet.
 *
 * Pure, and the reason this is a function rather than four lines inside an
 * effect: it is the one piece of the collection driver with arithmetic worth
 * asserting, and it was written out twice — identically — in the mesh and
 * network layers.
 *
 * `worldUnitsPerPixel` and `pixelBudget` are passed rather than read so the
 * caller keeps the imperative store reads (P17) and this stays testable.
 */
export const deriveCollectionPlanView = (
  view: PlanViewState,
  pixelBudget: number,
  worldUnitsPerPixel: number,
): CollectionPlanView | null => {
  if (!view.viewProjectionMatrix) return null;

  const frustum = new THREE.Frustum().setFromProjectionMatrix(view.viewProjectionMatrix);
  const pose = view.cameraPose;

  if (pose?.isPerspective && pose.fovY > 0) {
    return {
      frustum,
      cameraPosition: [pose.position[0], pose.position[1], pose.position[2]],
      focalPixels: (0.5 * view.viewportSize.height) / Math.tan(0.5 * pose.fovY),
    };
  }

  return {
    frustum,
    cameraPosition: null,
    focalPixels: 0,
    // Allow a world-space error worth `pixelBudget` on-screen pixels at the
    // current zoom.
    errorBudget: pixelBudget * worldUnitsPerPixel,
  };
};
