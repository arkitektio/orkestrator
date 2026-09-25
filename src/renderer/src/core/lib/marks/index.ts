/**
 * Generated app marks — a deterministic 3D icon for an app that has no logo.
 *
 * Vendored from `@arkitekt/marks`. Two entry points, and which one you want
 * depends entirely on how many marks are on screen:
 *
 *   useMarkImage()  — lists. One shared offscreen context renders each mark
 *                     once to a PNG; the cache survives route changes.
 *   <MarkCanvas>    — the ONE mark on a detail page. Never per row: browsers
 *                     cap live WebGL contexts at roughly 8-16.
 *
 * `markParams()` is pure and cheap if you only need the derivation — which
 * symbol matched, what colour a row should be — without drawing anything.
 *
 * Note that this barrel pulls `three` and the 83 kB of data in statically. A
 * list icon should import `./useMarkImage` directly, which keeps the renderer
 * behind a dynamic import and out of the route's chunk.
 */
export { AppMark, MarkCanvas, MarkStudio } from "./AppMark";
export type { AppMarkProps, MarkCanvasProps } from "./AppMark";
export { MARK_SCALE, MARK_SCALE_SIMPLE, MARK_SPEC_VERSION } from "./constants";
export { cyrb53, decodeEmbedding, markParams, markSpec, markText, mulberry32 } from "./markParams";
export type { MarkInput, MarkParams } from "./markParams";
export { colorFor, markNodes } from "./markNodes";
export type { MarkNode, MarkScene } from "./markNodes";
export type { ElementKind, MarkSpec } from "./spec";
export { useMarkImage } from "./useMarkImage";
export type { UseMarkImageInput, UseMarkImageResult } from "./useMarkImage";
