import * as THREE from "three";
import * as TSLTyped from "three/tsl";

import {
  DEPTH_RAMP_FAR,
  DEPTH_RAMP_NEAR,
  RELIEF_AMBIENT,
  RELIEF_LIGHT,
} from "../shaderspec/depthCode";

/**
 * Depth view (hold Q / Shift+Q) — the TSL half. CPU mirror:
 * `shaderspec/depthCode.ts` (keep in lockstep; the legend draws from it).
 *
 * Two stages:
 *  1. VOLUME shader (`emitDepthFraction`, `emitDepthPacked`): with
 *     `uDepthCode` on, a pass writes `(frac·s, s, 0, 1)` instead of colour —
 *     the winner's normalised view depth weighted by its strength. Additive
 *     blending sums both across passes, so the composite decodes a
 *     strength-weighted mean depth however many layers drew the pixel.
 *  2. COMPOSITE (`emitDepthComposite`): decodes, takes a SURFACE NORMAL
 *     from the depth of neighbouring rays — the thing a single ray cannot
 *     see — and lights the image with it (relief shading), over depth hues
 *     (Q) or the normal colours (Shift+Q).
 *
 * INVARIANT C6 like the cinematic rig: scalar / vec3 `uniform()`s only in the
 * volume material, never a `uniformArray` or a LUT texture — it sits near the
 * per-stage binding limit. The ramp is a polynomial in plain ALU.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
const TSL = TSLTyped as any;
const {
  cameraViewMatrix,
  clamp,
  dot,
  float,
  max,
  min,
  modelWorldMatrix,
  select,
  texture,
  uniform,
  vec2,
  vec3,
  vec4,
} = TSL;

/** Public surface of the volume material's depth uniforms (a `.value` box each). */
export type DepthCodeUniforms = {
  /** 0 = normal colours, 1 = write packed depth. Set PER PASS by the
   * compositor (`material.userData.depthCodeUniform`), not by React. */
  uDepthCode: { value: number };
  /** The scene's union box in WORLD space — the range every layer shares. */
  uDepthBoxMin: { value: THREE.Vector3 };
  uDepthBoxMax: { value: THREE.Vector3 };
};

export const makeDepthCodeUniforms = (): any => ({
  uDepthCode: uniform(0, "float"),
  uDepthBoxMin: uniform(new THREE.Vector3(0, 0, 0), "vec3"),
  uDepthBoxMax: uniform(new THREE.Vector3(0, 0, 0), "vec3"),
});

/** View depth (`-z_view`, positive in front) of a WORLD point. */
const viewDepthOf = (world: any): any => cameraViewMatrix.mul(vec4(world, 1.0)).z.negate();

/** Turbo (polynomial fit) — mirror: `turbo`. */
const emitTurbo = (x: any): any => {
  const t = clamp(float(x), 0.0, 1.0);
  const v4 = vec4(1.0, t, t.mul(t), t.mul(t).mul(t));
  const v2 = vec2(v4.z.mul(v4.z), v4.w.mul(v4.z));
  const ch = (k4: number[], k2: number[]) =>
    clamp(dot(v4, vec4(k4[0], k4[1], k4[2], k4[3])).add(dot(v2, vec2(k2[0], k2[1]))), 0.0, 1.0);
  return vec3(
    ch([0.13572138, 4.6153926, -42.66032258, 132.13108234], [-152.94239396, 59.28637943]),
    ch([0.09140261, 2.19418839, 4.84296658, -14.18503333], [4.27729857, 2.82956604]),
    ch([0.1066733, 12.64194608, -60.58204836, 110.36276771], [-89.90310912, 27.34824973]),
  );
};

/** Depth fraction → colour, warm near — mirror: `depthRamp`. */
export const emitDepthRamp = (frac: any): any =>
  emitTurbo(
    float(DEPTH_RAMP_NEAR).add(
      float(DEPTH_RAMP_FAR - DEPTH_RAMP_NEAR).mul(clamp(float(frac), 0.0, 1.0)),
    ),
  );

/**
 * The normalised view depth (0 near … 1 far) of LOCAL (unit-box,
 * `[-0.5, 0.5]`) position `pLocal`.
 *
 * `modelWorldMatrix` is the proxy box mesh's — the same matrix `vOrigin` is
 * inverted from — so `pLocal` lands where the volume is drawn. The range is
 * the 8 corners of the scene box in view space (mirror: `boxViewDepthRange`,
 * `depthFraction`): computed here rather than pushed from the CPU so it
 * follows the camera with no per-frame JS at all.
 */
export const emitDepthFraction = (u: any, pLocal: any): any => {
  const depth = viewDepthOf(modelWorldMatrix.mul(vec4(pLocal, 1.0)).xyz);
  const lo = vec3(u.uDepthBoxMin);
  const hi = vec3(u.uDepthBoxMax);
  let near: any = null;
  let far: any = null;
  for (const x of [lo.x, hi.x]) {
    for (const y of [lo.y, hi.y]) {
      for (const z of [lo.z, hi.z]) {
        const d = viewDepthOf(vec3(x, y, z));
        near = near ? min(near, d) : d;
        far = far ? max(far, d) : d;
      }
    }
  }
  near = max(near, 0.0);
  far = max(far, 0.0);
  const span = far.sub(near);
  // Degenerate range (no box yet) → mid-ramp, like the mirror.
  return select(
    span.greaterThan(1e-6),
    clamp(depth.sub(near).div(max(span, 1e-6)), 0.0, 1.0),
    float(0.5),
  );
};

/** What a depth pass writes for one pixel — mirror: `packDepth`. */
export const emitDepthPacked = (u: any, pLocal: any, strength: any): any =>
  vec3(float(emitDepthFraction(u, pLocal)).mul(strength), strength, 0.0);

// ---------------------------------------------------------------------------
// Composite stage
// ---------------------------------------------------------------------------

/** 0 = off, 1 = depth hues, relief-shaded (Q), 2 = normal colours, relief-shaded (Shift+Q). */
export const DEPTH_VIEW_CODE = { off: 0, hues: 1, relief: 2 } as const;
/** Below this packed strength a pixel has no trustworthy depth. */
export const DEFAULT_MIN_STRENGTH = 0.1;

/** The composite's depth-view uniforms (a `.value` box each). Latched by the
 * compositor when the depth pass renders — they describe what the target
 * HOLDS, not the live camera. */
export type DepthCompositeUniforms = {
  uDepthView: { value: number };
  /** 1 / depth-target size in texels. */
  uDepthTexel: { value: THREE.Vector2 };
  uMinStrength: { value: number };
  /** Mirror: `ReliefFrame`. */
  uDepthRange: { value: number };
  uDepthNear: { value: number };
  uPxScale: { value: number };
  /** 1 perspective, 0 orthographic. */
  uPerspective: { value: number };
};

export const makeDepthCompositeUniforms = (): any => ({
  uDepthView: uniform(0, "float"),
  uDepthTexel: uniform(new THREE.Vector2(0.5, 0.5), "vec2"),
  uMinStrength: uniform(DEFAULT_MIN_STRENGTH, "float"),
  uDepthRange: uniform(1, "float"),
  uDepthNear: uniform(0, "float"),
  uPxScale: uniform(1, "float"),
  uPerspective: uniform(1, "float"),
});

/** Row-major 3×3, rows top → bottom on screen (mirror: `reliefNormal`). */
const BLOCK: readonly [number, number][] = [
  [-1, -1],
  [0, -1],
  [1, -1],
  [-1, 0],
  [0, 0],
  [1, 0],
  [-1, 1],
  [0, 1],
  [1, 1],
];

/**
 * The composited colour for the depth view, given the normal volume sample
 * `base` (vec4) and the packed depth texture `depthMap`, both addressed at
 * `uvNode`. Mirrors: `decodeDepth`, `reliefNormal`, `reliefShade`.
 *
 * Normal: Sobel derivatives over the 3×3 block of decoded depth (a neighbour
 * without depth stands in with the centre's, so a rim against empty space
 * reads flat), scaled from depth-fraction-per-texel to a WORLD slope. Where
 * depth jumps between structures the normal tips over and the rim darkens on
 * its own — no separate edge pass. A pixel without depth is left unshaded.
 */
export const emitDepthComposite = (u: any, base: any, depthMap: any, uvNode: any): any => {
  const minS = float(u.uMinStrength);
  // `.level(0)` (textureSampleLevel), NOT an implicit-derivative sample:
  // TSL lowers the `select`s below to `if` blocks, and WGSL's uniformity
  // analysis rejects `textureSample` inside data-dependent control flow —
  // the composite pipeline would fail and the volumes vanish. Explicit-LOD
  // taps have no uniformity requirement (the raymarcher's atlas taps use the
  // same rule); the depth target has no mips, so the texels are identical.
  const taps = BLOCK.map(([dx, dy]) =>
    texture(depthMap, vec2(uvNode).add(vec2(u.uDepthTexel).mul(vec2(dx, dy)))).level(0),
  );
  const decode = (t: any) => t.r.div(max(t.g, 1e-5));
  const centre = taps[4];
  const strength = centre.g;
  const dC = decode(centre).toVar("reliefCentre");
  const d = taps.map((t, i) => (i === 4 ? dC : select(t.g.greaterThanEqual(minS), decode(t), dC)));

  const gx = d[2].add(d[5].mul(2)).add(d[8]).sub(d[0]).sub(d[3].mul(2)).sub(d[6]).div(8);
  const gy = d[6].add(d[7].mul(2)).add(d[8]).sub(d[0]).sub(d[1].mul(2)).sub(d[2]).div(8);
  const range = float(u.uDepthRange);
  const wpt = select(
    float(u.uPerspective).greaterThan(0.5),
    float(u.uDepthNear).add(dC.mul(range)).mul(u.uPxScale),
    float(u.uPxScale),
  );
  const k = range.div(max(wpt, 1e-9));
  const n = TSL.normalize(vec3(gx.mul(k), gy.mul(k).negate(), 1.0));
  const light = vec3(RELIEF_LIGHT[0], RELIEF_LIGHT[1], RELIEF_LIGHT[2]);
  const lit = float(RELIEF_AMBIENT).add(float(1 - RELIEF_AMBIENT).mul(max(dot(n, light), 0.0)));
  const shade = select(strength.greaterThanEqual(minS), lit, float(1.0));

  const hues = vec4(emitDepthRamp(dC).mul(min(strength, 1.0)), min(strength, 1.0));
  const underlying = select(float(u.uDepthView).greaterThan(1.5), vec4(base), hues);
  // Colour only: shading never touches coverage (alpha), so a dark slope
  // darkens toward black, not toward the page background.
  return vec4(underlying.rgb.mul(shade), underlying.a);
};
