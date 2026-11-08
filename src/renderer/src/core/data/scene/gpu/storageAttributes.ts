import type { BufferAttribute } from "three";

/**
 * Frees one attribute's GPU buffer. Injected rather than imported so GPU
 * bundles stay renderer-free (and testable); a layer builds it with
 * `storageAttributeReleaser` from the canvas's renderer.
 */
export type ReleaseAttribute = (attribute: BufferAttribute) => void;

/**
 * The only path three has to free a STORAGE attribute's GPU buffer.
 *
 * Three frees a geometry's vertex and index attributes when the geometry is
 * disposed, and nothing else: a buffer bound as `storage(...)` (a compute
 * pass's, a material's) or used as `geometry.indirect` is created by
 * `Bindings`/`Geometries` through the renderer's `Attributes` map and never
 * deleted, so every rebuild leaks it — JS array and `GPUBuffer` both — for the
 * renderer's lifetime. `Attributes.delete` is what `Geometries` calls on
 * dispose: it destroys the `GPUBuffer` and drops the entry, and is a no-op for
 * an attribute that never reached the GPU. It is renderer-internal
 * (`_attributes`), hence the guard: without it this degrades to the old leak,
 * never to a throw.
 */
export const storageAttributeReleaser = (renderer: unknown): ReleaseAttribute => {
  const attributes = (
    renderer as { _attributes?: { delete?: (attribute: BufferAttribute) => unknown } | null }
  )?._attributes;
  return (attribute) => {
    if (!attributes || typeof attributes.delete !== "function") return;
    try {
      attributes.delete(attribute);
    } catch (error) {
      console.warn("[scene] could not free a storage buffer:", error);
    }
  };
};
