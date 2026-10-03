import type { BufferGeometry } from "three";

/**
 * Hand a drawn object a NEW geometry and release the one it had.
 *
 * This is how a fat line's buffers are replaced once it has been rendered.
 * `LineSegmentsGeometry.setPositions` / `setColors` on the SAME geometry swap
 * in fresh `InterleavedBufferAttribute`s, and the WebGPU renderer cannot see
 * that: it detects replaced attributes by `attribute.id`
 * (`RenderObject.needsGeometryUpdate`), and interleaved attributes have none.
 * The render object keeps the vertex buffer it first bound, so an upload with
 * MORE segments draws past it —
 *
 *     Instance range (first: 0, count: 1581) requires a larger buffer (37944)
 *     than the bound buffer size (37800) of the vertex buffer at slot 1
 *
 * — one invalid draw that invalidates the whole frame's command buffer: the
 * canvas stops updating for as long as that line is in the scene. (An upload
 * with the same or fewer segments is silently ignored instead.)
 *
 * A new geometry OBJECT is the change the renderer does track (`geometry.id`).
 * The old one is disposed here, synchronously: its dispose listener frees the
 * GPU buffers of whatever the render object still has bound, which is the old
 * set only until the next frame rebinds.
 */
export function swapGeometry<G extends BufferGeometry>(
  object: { geometry: G },
  next: G,
): void {
  const previous = object.geometry;
  if (previous === next) return;
  object.geometry = next;
  previous.dispose();
}
