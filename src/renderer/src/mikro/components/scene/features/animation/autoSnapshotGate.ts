/**
 * The auto-snapshot gate: when is it allowed to photograph the scene?
 *
 * Deliberately import-free so it can be tested without standing up Apollo,
 * the settings context and the scene/viewer stores — the hook that uses it
 * (`useAutoSnapshot.ts`) needs all four, and none of them bear on the decision.
 */

/**
 * How long to wait, on a scene with nothing volumetric to stream, before
 * accepting that the picture on screen is as finished as it will get.
 *
 * Only ever consulted for a scene with NO volumetric layers (mesh-only,
 * sparse-only): the brick pipeline will never run, so no drained edge is
 * coming and waiting for one would mean waiting forever. Long enough for
 * meshes to have been fetched and drawn, short enough that the user is
 * plausibly still on the page.
 */
export const AUTO_SNAPSHOT_QUIET_MS = 6000;

/**
 * What the auto-snapshot should do with the state it can see.
 *
 * - `skip`       — nothing to do, now or later, for this render.
 * - `shoot`      — the picture is final; take it.
 * - `wait-quiet` — nothing volumetric is coming; take it once the quiet window
 *   elapses.
 *
 * Pure, and tested as such (`useAutoSnapshot.test.ts`), because the gate is
 * the whole of the feature's logic and mounting the hook for real would mean
 * standing up Apollo plus four providers to assert a boolean. Same split as
 * `decideStreamingFlag`.
 */
export type AutoSnapshotAction = "skip" | "shoot" | "wait-quiet";

export const decideAutoSnapshot = (o: {
  /** The user's setting. */
  enabled: boolean;
  /** Does the scene already have a picture? Then this never fires. */
  hasSnapshot: boolean;
  /** Has this mount already tried? One attempt, ever. */
  attempted: boolean;
  /** See `ViewSlice.sharp`. */
  sharp: boolean | null;
  /**
   * Does the scene have brick layers at all?
   *
   * Decides what `sharp === null` MEANS. With volumetric layers it means the
   * stream has not started yet — more is coming, so wait for the drained edge.
   * Without them it means nothing is ever coming, so the quiet window is the
   * only signal there will be. Reading this from the scene rather than timing
   * it is what keeps a slow-to-start volumetric scene from having a blank
   * canvas frozen as its permanent tile.
   */
  hasVolumetricLayers: boolean;
  /** Has the camera been driven since mount? Then the default rig is gone. */
  cameraTouched: boolean;
}): AutoSnapshotAction => {
  if (!o.enabled || o.hasSnapshot || o.attempted || o.cameraTouched) return "skip";
  // Mid-stream: the image will still change, so there is nothing worth
  // photographing yet. A later drain re-runs this and returns "shoot".
  if (o.sharp === false) return "skip";
  if (o.sharp === true) return "shoot";
  // `sharp === null`: nothing has streamed yet.
  return o.hasVolumetricLayers ? "skip" : "wait-quiet";
};
