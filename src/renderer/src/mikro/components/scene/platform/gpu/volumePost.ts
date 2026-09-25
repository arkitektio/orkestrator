import * as THREE from "three";
import {
  clamp,
  float,
  luminance,
  mix,
  nodeObject,
  oneMinus,
  saturation,
  screenUV,
  smoothstep,
  texture,
  uniform,
  uv,
  vec2,
  vec4,
  vibrance,
} from "three/tsl";
// The TSL display nodes are NOT in the `three/tsl` barrel — that ships only the
// core `src/nodes/display/*` set (pass, renderOutput, luminance, the
// ColorAdjustment family). Everything else lives in the addons, which the repo
// already imports from elsewhere (`platform/draw/Line.tsx`,
// `features/tracks/TracksLayer.tsx`).
import { bloom } from "three/examples/jsm/tsl/display/BloomNode.js";

/* eslint-disable @typescript-eslint/no-explicit-any --
 * Same contract as `features/bricks/gpu/brickNodeMaterials.ts`: three ships no
 * type declarations, so the node GRAPH is typed dynamically while this module's
 * public surface (the settings record and the uniform boxes) is hand-typed. */

/**
 * Post-processing for the CINEMATIC preset.
 *
 * **It runs on the VOLUME TARGET, not on the scene.** `VolumeCompositor`
 * already renders volumes — and only volumes — into a private offscreen
 * `HalfFloatType` target, then adds that texture back over the canvas. So the
 * whole effect chain belongs in that composite quad's `colorNode`, which buys
 * three things the conventional `pass(scene, camera)` route does not:
 *
 *  - **Furniture is excluded for free.** No glow on the scale grid, the origin
 *    axis, ROI outlines, `Line2` track lines, vertex handles or point sprites —
 *    every one of which looks wrong bloomed, and for which no post-eligibility
 *    mechanism exists (`passVisibility.ts` gates visibility per PASS, not per
 *    effect). The scene route would need a second pass for chrome.
 *  - **No frame-loop takeover.** `VolumeCompositor` already owns the frame via
 *    `useFrame(cb, 1)`, and a second priority>0 subscriber would double-render
 *    (see the note in `platform/perf/PerfFrameProbe.tsx`). This adds no
 *    subscriber and changes no render call.
 *  - **No `RenderPipeline`.** `BloomNode.updateBefore` sizes itself from the
 *    renderer and saves/restores renderer state through `RendererUtils`, so it
 *    is self-contained in any material's node graph.
 *
 * KNOWN LIMITATION: screenshots do not get this. `SceneScreenshot` renders the
 * scene graph with the composite quad hidden (it is `EXCLUDE_FROM_CAPTURE`) and
 * re-raymarches the volumes live at capture resolution, so a capture takes the
 * DIRECT path and never touches this chain.
 *
 * Deliberately NOT here: depth of field. The volume is `depthWrite = false` and
 * additive, the target has no sampleable `depthTexture`, MIP and attenuated MIP
 * have no meaningful per-pixel depth at all (an argmax position is not a
 * surface), and three 0.184's `PassNode.getViewZNode()` calls
 * `perspectiveDepthToViewZ` unconditionally — wrong under the orthographic
 * cameras this scene supports. Only ISOSURFACE has a defensible depth.
 */

export type VolumePostSettings = {
  /** Bloom intensity. 0 disables the effect (and the material is rebuilt
   * without it, so the blur passes are not merely zeroed — they are gone). */
  bloomStrength: number;
  /** Bloom spread, `[0, 1]`. */
  bloomRadius: number;
  /** Luminance below which nothing blooms. */
  bloomThreshold: number;
  /** `1` is unchanged; `0` is greyscale; `>1` oversaturates. */
  saturation: number;
  /** Saturation weighted toward the LESS saturated pixels. `0` is unchanged. */
  vibrance: number;
  /** Edge darkening, `0` (off) to `1`. */
  vignette: number;
};

export const VOLUME_POST_DEFAULTS: VolumePostSettings = {
  bloomStrength: 0.35,
  bloomRadius: 0.4,
  // Fluorescence lives in the low end; bloom only what is genuinely bright, or
  // the whole image hazes over.
  bloomThreshold: 0.55,
  saturation: 1,
  vibrance: 0,
  vignette: 0,
};

export const VOLUME_POST_RANGES: Record<
  keyof VolumePostSettings,
  { min: number; max: number; step: number }
> = {
  bloomStrength: { min: 0, max: 2, step: 0.01 },
  bloomRadius: { min: 0, max: 1, step: 0.01 },
  bloomThreshold: { min: 0, max: 1, step: 0.01 },
  saturation: { min: 0, max: 2, step: 0.01 },
  vibrance: { min: -1, max: 1, step: 0.01 },
  vignette: { min: 0, max: 1, step: 0.01 },
};

/** True when the settings would change nothing — so the plain passthrough
 * node can be emitted and the frame pays literally nothing. */
export const isPostInert = (s: VolumePostSettings): boolean =>
  s.bloomStrength <= 0 && s.saturation === 1 && s.vibrance === 0 && s.vignette <= 0;

/** The live uniform boxes, so slider drags need no material rebuild. */
export type VolumePostHandle = {
  colorNode: any;
  /** Null when the chain is a plain passthrough. */
  uniforms: {
    bloomStrength: { value: number };
    bloomRadius: { value: number };
    bloomThreshold: { value: number };
    saturation: { value: number };
    vibrance: { value: number };
    vignette: { value: number };
  } | null;
  /** Releases the bloom node's mip render targets. */
  dispose: () => void;
};

/**
 * Build the composite quad's `colorNode`.
 *
 * When `settings` is null (SCIENTIFIC mode) or inert, this returns EXACTLY the
 * pre-existing `texture(map, screenUV)` — bit-for-bit the old behaviour, and no
 * blur passes are emitted at all. That is why the caller rebuilds the material
 * on the cinematic edge rather than gating a uniform to zero: a strength-0
 * uniform still executes every downsample and upsample.
 */
export function buildVolumeCompositeNode(
  map: THREE.Texture,
  settings: VolumePostSettings | null,
): VolumePostHandle {
  if (!settings || isPostInert(settings)) {
    // SCIENTIFIC / inert: the pre-existing node, untouched. `screenUV` is
    // correct and battle-tested here precisely because no bloom node runs — see
    // the long note below for why the post chain must NOT use it.
    return { colorNode: texture(map, screenUV), uniforms: null, dispose: () => {} };
  }

  /**
   * `uv()`, NOT `screenUV` — this is load-bearing, and getting it wrong renders
   * the glow offset from the volume instead of on top of it. Two independent
   * reasons, either of which is enough:
   *
   *  1. `screenSize` is a MODULE-LEVEL SHARED uniform (`ScreenNode`'s
   *     `_screenSizeVec`), and `screenUV` is `screenCoordinate / screenSize`.
   *     `BloomNode.updateBefore` renders a high-pass plus two blurs per mip
   *     into progressively smaller targets BEFORE this quad draws, and each of
   *     those repoints that shared uniform. `RendererUtils.restoreRendererState`
   *     restores renderer state but does not re-run `ScreenNode.update`, so the
   *     composite can end up dividing by the last mip's size instead of the
   *     canvas — sampling the volume target at the wrong scale and offset.
   *  2. `screenCoordinate` applies a Y flip only when `builder.isFlipY()`, which
   *     is true for the canvas pass and false for the bloom's offscreen passes.
   *     One node evaluated in both contexts therefore means two different
   *     things, and the bloom reads the volume mirrored.
   *
   * `uv()` is a geometry attribute: no shared state, no flip branch.
   *
   * THE V FLIP IS REQUIRED, and was found the hard way — without it the whole
   * composite renders upside down the moment cinematic is switched on. The
   * composite quad is a `PlaneGeometry` whose v runs opposite to `screenUV` on
   * this quad, so `1 - v` is what reproduces the known-good `screenUV`
   * addressing of the volume target.
   *
   * Why base and glow cannot drift apart: this ONE node is both the bloom's
   * input and the composite's own term. In the bloom's offscreen QuadMesh
   * passes it is evaluated at the quad's uv `q`, so the bloom's output texel at
   * `q` holds the glow of `volume(flip(q))`; on the composite plane both the
   * glow (sampled at the plane's uv `p`, the `passTexture` default) and base
   * resolve to the same `flip(p)`. They align for ANY coordinate expression —
   * the flip is purely about which texel a given SCREEN position shows.
   */
  const quadUV = vec2(uv().x, oneMinus(uv().y));
  const base = texture(map, quadUV);

  const uSaturation = uniform(settings.saturation, "float");
  const uVibrance = uniform(settings.vibrance, "float");
  const uVignette = uniform(settings.vignette, "float");

  // `bloom()` returns the raw BloomNode, not a proxied node object, so the
  // swizzles below need the wrap. Keep the raw one for `dispose` and for its
  // three parameter uniforms.
  const glowRaw: any = bloom(
    base,
    settings.bloomStrength,
    settings.bloomRadius,
    settings.bloomThreshold,
  );
  const glow = nodeObject(glowRaw);

  let rgb = base.rgb.add(glow.rgb);
  rgb = saturation(vibrance(rgb, uVibrance), uSaturation);

  // Radial falloff from the frame centre. The quad uv is [0,1]²; the corner is
  // ~0.707 away from the middle.
  const radius = quadUV.sub(vec2(0.5, 0.5)).length();
  const falloff = mix(float(1.0), smoothstep(float(0.8), float(0.3), radius), uVignette);

  // ALPHA — the load-bearing part on this canvas.
  //
  // The canvas is TRANSPARENT over the scene's DOM background div, so the
  // accumulated alpha is what makes a volume visible at all (see the note on
  // `commonMaterialSettings` in brickNodeMaterials). A bloom halo extends past
  // the volume's footprint, where `base.a` is 0 — leave alpha alone and the
  // browser composites the background over the glow and the halo never
  // appears. Summing the bloom's own alpha instead would wash the whole frame
  // milky, because the high-pass output carries alpha wherever it carries
  // colour. So the halo earns exactly as much coverage as it has BRIGHTNESS.
  const alpha = clamp(base.a.add(luminance(glow.rgb)), 0.0, 1.0);

  // The vignette scales colour AND coverage: on a transparent canvas fading
  // only the colour would darken the edge to black, whereas fading both fades
  // it toward the page background, which is what a vignette should look like.
  const colorNode = vec4(rgb.mul(falloff), alpha.mul(falloff));

  return {
    colorNode,
    uniforms: {
      // BloomNode exposes its three parameters as uniform nodes, so these are
      // live — a slider drag never rebuilds the material.
      bloomStrength: glowRaw.strength,
      bloomRadius: glowRaw.radius,
      bloomThreshold: glowRaw.threshold,
      saturation: uSaturation,
      vibrance: uVibrance,
      vignette: uVignette,
    },
    dispose: () => glowRaw.dispose?.(),
  };
}

/** Push settings into a built chain. No-op for a passthrough chain. */
export function updateVolumePostUniforms(
  handle: VolumePostHandle,
  settings: VolumePostSettings,
): void {
  const u = handle.uniforms;
  if (!u) return;
  u.bloomStrength.value = settings.bloomStrength;
  u.bloomRadius.value = settings.bloomRadius;
  u.bloomThreshold.value = settings.bloomThreshold;
  u.saturation.value = settings.saturation;
  u.vibrance.value = settings.vibrance;
  u.vignette.value = settings.vignette;
}
