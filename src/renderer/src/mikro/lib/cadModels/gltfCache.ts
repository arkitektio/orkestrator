import * as THREE from "three";
import { GLTFLoader, type GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";

/**
 * One download per CAD model file, shared by every layer drawing it.
 *
 * Reference counted rather than kept forever: a model is fetched whole (a CAD
 * export can be tens of megabytes). The last release is DEFERRED by
 * `RELEASE_GRACE_MS`: switching 2D↔3D runs the old layer's cleanup before the
 * new one mounts, so the count touches zero in between, and disposing there
 * would re-fetch and re-parse the file on every mode switch. Only a count still
 * at zero after the grace disposes the file's geometry and textures. Materials
 * are not the cache's to hand out for writing: a reader that changes them
 * (the scene's layers, `adoptMeshes`) clones them first.
 *
 * Meshopt-compressed files decode with the decoder fabriks already bundles.
 * Draco and KTX2 need decoders this app does not ship; such a file fails to
 * load, and the card says why.
 */
type Entry = { promise: Promise<GLTF>; refs: number };

const entries = new Map<string, Entry>();

/** How long a file outlives its last user: long enough for a remount in the same commit. */
const RELEASE_GRACE_MS = 1000;

const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);

const disposeGltf = (gltf: GLTF): void => {
  gltf.scene.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (mesh.isMesh !== true) return;
    mesh.geometry?.dispose();
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const material of materials) {
      if (!material) continue;
      for (const value of Object.values(material)) {
        const texture = value as THREE.Texture | null;
        if (texture?.isTexture) texture.dispose();
      }
      material.dispose();
    }
  });
};

/**
 * The file under `key`, loaded from the URL `resolveUrl` gives on first use.
 * Pair every call with one `releaseGltf(key)`.
 */
export const acquireGltf = (key: string, resolveUrl: () => Promise<string>): Promise<GLTF> => {
  const existing = entries.get(key);
  if (existing) {
    existing.refs += 1;
    return existing.promise;
  }
  const promise = resolveUrl().then((url) => loader.loadAsync(url));
  const entry: Entry = { promise, refs: 1 };
  entries.set(key, entry);
  // A failed load is not cached: the next mount (a retry, a fixed grant) tries again.
  promise.catch(() => {
    if (entries.get(key) === entry) entries.delete(key);
  });
  return promise;
};

/** Drop one reference; the last one disposes the file, unless it is taken again first. */
export const releaseGltf = (key: string): void => {
  const entry = entries.get(key);
  if (!entry) return;
  entry.refs -= 1;
  if (entry.refs > 0) return;
  setTimeout(() => {
    if (entry.refs > 0 || entries.get(key) !== entry) return;
    entries.delete(key);
    entry.promise.then(disposeGltf, () => {});
  }, RELEASE_GRACE_MS);
};
