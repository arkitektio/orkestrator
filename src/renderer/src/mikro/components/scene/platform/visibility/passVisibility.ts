import type * as THREE from "three";

/**
 * Partitioning the scene for the volume compositor's two-pass frame.
 *
 * The compositor renders tagged volume raymarch meshes into an offscreen
 * target, then the rest of the scene (plus a composite quad) to the canvas.
 * There is no `THREE.Layers` usage in this codebase and introducing camera
 * layers would entangle the raycast/probe contract, so partitioning follows
 * the `captureVisibility` precedent instead: transient `visible` toggling
 * with exact restore, applied inside the frame callback where neither React
 * nor R3F's event raycasts can observe it.
 *
 * Toggling happens on LEAF renderables only (meshes/lines/points/sprites) —
 * never on groups — so ancestors keep rendering the leaves that stay in the
 * pass. An object already invisible for its own reasons is left alone and
 * restored to nothing.
 */

/** `userData` key tagging a mesh as volume-pass content (the raymarch box
 * proxies). Set where the meshes are declared, read by `collectPassSets`. */
export const VOLUME_PASS_OBJECT = "volumePassObject";

/** `userData` key for objects the compositor itself owns (the composite
 * quad): excluded from every pass set — the compositor drives their
 * visibility directly. */
export const COMPOSITOR_INTERNAL = "volumeCompositorInternal";

export type PassSets = {
  /** Visible tagged raymarch meshes — the offscreen pass's content. */
  volumeMeshes: THREE.Mesh[];
  /** Visible opaque depth-writing leaves (fabriks meshes, depth-tested
   * lines) — the depth-only prepass set that preserves mesh-over-volume
   * occlusion inside the offscreen target. */
  occluders: THREE.Object3D[];
  /** Every other visible leaf renderable — hidden during the offscreen
   * pass, rendered normally in the canvas pass. */
  otherRenderables: THREE.Object3D[];
};

type LeafRenderable = THREE.Object3D & {
  isMesh?: boolean;
  isLine?: boolean;
  isPoints?: boolean;
  isSprite?: boolean;
  material?: THREE.Material | THREE.Material[];
};

const isLeafRenderable = (object: LeafRenderable): boolean =>
  object.isMesh === true ||
  object.isLine === true ||
  object.isPoints === true ||
  object.isSprite === true;

const isOpaqueDepthWriter = (object: LeafRenderable): boolean => {
  // MESHES only: lines/points/sprites also write depth, but running the
  // prepass override material over non-triangle topology is exactly the kind
  // of node-path edge that fails silently on WebGPU — and thin line
  // furniture occluding a volume is visually negligible.
  if (object.isMesh !== true) return false;
  const material = object.material;
  if (!material) return false;
  // Runs per leaf per frame: no per-call array or closure for the common
  // single-material case.
  if (!Array.isArray(material)) return isOpaqueMaterial(material);
  if (material.length === 0) return false;
  for (let i = 0; i < material.length; i++) {
    if (!isOpaqueMaterial(material[i])) return false;
  }
  return true;
};

const isOpaqueMaterial = (m: THREE.Material): boolean =>
  m.depthWrite === true && m.transparent === false && m.visible !== false;

/**
 * One walk classifying every EFFECTIVELY visible leaf renderable under `root`
 * — an invisible object PRUNES its whole subtree, exactly as the renderer
 * does. Compositor-internal objects classify nowhere.
 *
 * The prune is load-bearing, not a micro-optimisation. `Object3D.traverse`
 * descends unconditionally, so a leaf under a hidden GROUP used to classify as
 * though it were visible — which is how the collection layers hide (their
 * managers flip `group.visible`, never the leaves). An occluder that the
 * renderer skips but this set still lists is one the compositor's structure
 * key cannot notice changing, and a hidden mesh's stale depth then survives in
 * the cached volume target until the camera moves.
 */
export const collectPassSets = (
  root: THREE.Object3D,
  /** Reuse these arrays (cleared first) instead of allocating three per call —
   * the compositor runs this every frame. The result IS `into` when given. */
  into?: PassSets,
): PassSets => {
  const sets: PassSets = into ?? {
    volumeMeshes: [],
    occluders: [],
    otherRenderables: [],
  };
  sets.volumeMeshes.length = 0;
  sets.occluders.length = 0;
  sets.otherRenderables.length = 0;
  classifySubtree(root, sets);
  return sets;
};

/** Recursive half of `collectPassSets`. Explicit, because the prune is the
 *  point and `traverse` cannot express it. */
const classifySubtree = (object: THREE.Object3D, sets: PassSets): void => {
  if (!object.visible) return;
  if (object.userData?.[COMPOSITOR_INTERNAL] === true) return;
  if (isLeafRenderable(object as LeafRenderable)) {
    if (object.userData?.[VOLUME_PASS_OBJECT] === true) {
      sets.volumeMeshes.push(object as THREE.Mesh);
    } else if (isOpaqueDepthWriter(object as LeafRenderable)) {
      sets.occluders.push(object);
    } else {
      sets.otherRenderables.push(object);
    }
  }
  const children = object.children;
  for (let i = 0; i < children.length; i++) classifySubtree(children[i], sets);
};

/**
 * Hide the given objects and return a function restoring visibility exactly:
 * only objects this call actually hid are re-shown. The caller must invoke
 * the restore fn in a `finally` — a pass that throws mid-render must not
 * leave the live scene missing content (`hideExcludedFromCapture` contract).
 */
export const hideObjects = (objects: readonly THREE.Object3D[]): (() => void) => {
  const hidden: THREE.Object3D[] = [];
  hideObjectsInto(objects, hidden);
  return () => restoreHidden(hidden);
};

/**
 * Allocation-free variant of `hideObjects` for per-frame callers: records
 * the objects it actually hid into `hidden` (cleared first). Restore with
 * `restoreHidden(hidden)` under the same `finally` contract.
 */
export const hideObjectsInto = (
  objects: readonly THREE.Object3D[],
  hidden: THREE.Object3D[],
): void => {
  hidden.length = 0;
  for (let i = 0; i < objects.length; i++) {
    const object = objects[i];
    if (object.visible) {
      object.visible = false;
      hidden.push(object);
    }
  }
};

/** Re-show everything `hideObjectsInto` hid, and clear the scratch list. */
export const restoreHidden = (hidden: THREE.Object3D[]): void => {
  for (let i = 0; i < hidden.length; i++) hidden[i].visible = true;
  hidden.length = 0;
};

/**
 * Turn off color writes on every material of the given objects and return a
 * function restoring the previous flags exactly (shared materials are
 * touched once). This is how the volume compositor's depth prepass renders
 * occluders: with their OWN materials — depth from the real shader, so
 * BatchedMesh multi-draw ranges, displacement etc. stay correct —
 * `scene.overrideMaterial` with a plain material corrupted BatchedMesh
 * draws (out-of-range DrawIndexed). Same `finally`-restore contract as
 * `hideObjects`.
 */
export const disableColorWrite = (
  objects: readonly THREE.Object3D[],
): (() => void) => {
  const touched = new Map<THREE.Material, boolean>();
  disableColorWriteInto(objects, touched);
  return () => restoreColorWrite(touched);
};

const disableOne = (m: THREE.Material, touched: Map<THREE.Material, boolean>) => {
  if (!touched.has(m)) {
    touched.set(m, m.colorWrite);
    m.colorWrite = false;
  }
};

/**
 * Allocation-free variant of `disableColorWrite` for per-frame callers:
 * `touched` (cleared first) records the previous flags. Restore with
 * `restoreColorWrite(touched)`.
 */
export const disableColorWriteInto = (
  objects: readonly THREE.Object3D[],
  touched: Map<THREE.Material, boolean>,
): void => {
  touched.clear();
  for (let i = 0; i < objects.length; i++) {
    const material = (objects[i] as LeafRenderable).material;
    if (!material) continue;
    if (Array.isArray(material)) {
      for (let j = 0; j < material.length; j++) disableOne(material[j], touched);
    } else {
      disableOne(material, touched);
    }
  }
};

/** Restore the flags recorded by `disableColorWriteInto` and clear the map. */
export const restoreColorWrite = (touched: Map<THREE.Material, boolean>): void => {
  for (const [m, colorWrite] of touched) m.colorWrite = colorWrite;
  touched.clear();
};
