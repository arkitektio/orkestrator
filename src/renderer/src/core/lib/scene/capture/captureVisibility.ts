import type * as THREE from "three";

/**
 * Keeping viewport furniture out of captures.
 *
 * Some in-scene objects are interaction aids, not part of the picture — the
 * origin crosshair above all. HTML overlays and the drei gizmo are excluded for
 * free (a capture renders `scene` directly, and neither is in it), but anything
 * mounted into the scene graph is rendered like data unless told otherwise.
 *
 * Opt out by tagging the object's `userData`:
 *
 *   <group userData={{ [EXCLUDE_FROM_CAPTURE]: true }}>
 *
 * Tagging beats a hardcoded list of components here: the knowledge that a thing
 * is furniture belongs with the thing, and a capture is not the only consumer —
 * the offline animation export renders through the same path.
 */

/** `userData` key marking an object (and its subtree) as capture-excluded. */
export const EXCLUDE_FROM_CAPTURE = "excludeFromCapture";

/**
 * Hide every capture-excluded subtree under `root` and return a function that
 * puts visibility back exactly as it was.
 *
 * Only objects this call actually hid are restored — an object already
 * invisible for its own reasons (a toggled-off layer) stays that way, rather
 * than being switched on by a screenshot. `visible: false` prunes the whole
 * subtree at render, so tagging the parent is enough.
 *
 * The caller must invoke the restore fn in a `finally`: a capture that throws
 * mid-render must not leave the live scene missing its crosshair.
 */
export const hideExcludedFromCapture = (root: THREE.Object3D): (() => void) => {
  const hidden: THREE.Object3D[] = [];
  root.traverse((object) => {
    if (object.userData?.[EXCLUDE_FROM_CAPTURE] === true && object.visible) {
      object.visible = false;
      hidden.push(object);
    }
  });
  return () => {
    for (const object of hidden) object.visible = true;
  };
};
