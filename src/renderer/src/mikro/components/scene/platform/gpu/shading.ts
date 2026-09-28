/**
 * Cinematic shading math — the CPU source of truth for the lit-volume mode,
 * mirrored by the TSL port in `features/bricks/gpu/brickNodeMaterials.ts`
 * (`emitFieldGradient` / `emitShade`).
 *
 * The design and its rationale live in `../../CINEMATIC_MODE.md` (scene/CINEMATIC_MODE.md); the
 * invariants it names are load-bearing and are restated here beside the code
 * that has to honour them. Same caveat as `platform/model/phasor.ts`: these
 * tests prove the TS is right, NOT that the TSL matches it. TSL compiles to
 * WGSL only on a real device, and vitest runs node/jsdom.
 *
 * INVARIANT C1 — lighting modulates COLOUR only. Nothing here may be fed back
 * into `sampleNorm`, `weight`, `volAlpha` or the iso hit test. That is what
 * keeps the transfer mirrors (`shaderspec/raymarchStep.ts`,
 * `shaderspec/opacityCorrection.ts`, `octree/brickSampling.ts`,
 * `model/phasor.ts`) valid with zero changes: they pin *transfer* math because
 * the probe readout must agree with the picture, and shading is not transfer.
 */

export type Vec3 = readonly [number, number, number];

/**
 * The central-difference half-step, in LEVEL VOXELS, used for the six gradient
 * taps.
 *
 * INVARIANT C2 — this is an invariant, not a tuning knob. A brick's
 * filter-safe range is `[slot + 0.5, slot + slotSize - 0.5]` while the payload
 * occupies `[slot + 1, slot + 1 + payload)`, leaving exactly 0.5 texel of
 * margin on each side. `h > 0.5` reaches past the replicated border into the
 * neighbouring slot in x/y — and in z into the neighbouring CHANNEL SLAB,
 * because `slotSize.z = stored.z * channelCount`
 * (`platform/coords/levelGeometry.ts`). That would silently mix another
 * channel's data into the normal, with no visible error.
 *
 * If a wider baseline is ever genuinely needed, the correct move is a full
 * `emitResolveBrickResidency` per tap (~7× the march), not a bigger `h`.
 * `shading.test.ts` asserts this against every spec `resolveBrickSpec` can
 * produce.
 */
export const GRADIENT_H = 0.5;

/** The tunable half of the light rig. Directions are fixed by design. */
export type LightRig = {
  /** Floor brightness where nothing faces a light. */
  ambient: number;
  /** Blinn-Phong specular weight. */
  specular: number;
  /** Blinn-Phong exponent — higher is a tighter highlight. */
  shininess: number;
  /**
   * How steep the field must be to read as a surface. Gated on the LEVEL-voxel
   * gradient (C5), which makes it roughly dataset-independent — hence a
   * constant rather than a per-dataset knob.
   */
  surfaceGain: number;
  /**
   * How much of the diffuse term a MAX-PROJECTION is allowed to take:
   * `diffuse_mip = mix(1, diffuse, mipShading)`.
   *
   * The tradeoff this dial exists for. In a MIP, screen brightness IS max
   * intensity along the ray — a value you can read off the picture by eye.
   * Full diffuse shading destroys that (a bright voxel on a grazing surface
   * renders dimmer than the same voxel face-on), so:
   *
   *  - `0` — specular and rim only, brightness EXACTLY preserved. The honest
   *    end: a MIP still reads quantitatively, and only gains highlights.
   *  - `1` — identical treatment to VOLUME and ISOSURFACE. The consistent end:
   *    a MIP layer sits naturally beside lit layers in the same scene.
   *
   * Only reaches the MIP and ATTENUATED_MIP branches; VOLUME and ISOSURFACE
   * always use the full diffuse. Specular is never scaled by it — a highlight
   * ADDS light, so it can never darken a MIP below its true value.
   */
  mipShading: number;
};

export const CINEMATIC_DEFAULTS: LightRig = {
  ambient: 0.25,
  specular: 0.35,
  shininess: 32,
  surfaceGain: 6,
  mipShading: 0.5,
};

/** Per-field bounds for the light-rig sliders. */
export const LIGHT_RIG_RANGES: Record<
  keyof LightRig,
  { min: number; max: number; step: number }
> = {
  ambient: { min: 0, max: 1, step: 0.01 },
  specular: { min: 0, max: 1, step: 0.01 },
  shininess: { min: 1, max: 128, step: 1 },
  surfaceGain: { min: 0, max: 40, step: 0.5 },
  mipShading: { min: 0, max: 1, step: 0.01 },
};

/**
 * The fill light, fixed in the SPECIMEN frame rather than the camera's.
 *
 * A pure headlight is flat exactly at frame centre (`dot(N, V) = 1`, no shape
 * cue where you are looking); a pure fixed key can leave the specimen black.
 * Key = view vector, fill = this. Because the specimen is static, the fill
 * reads as "lit in a room" while you orbit, and it costs no per-frame CPU and
 * no camera-basis derivation.
 */
export const FILL_DIRECTION: Vec3 = normalize([-0.4, 0.7, 0.6]);

/** Relative weight of the fixed fill against the headlight key. */
export const FILL_WEIGHT = 0.35;

export function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

export function length(v: Vec3): number {
  return Math.sqrt(dot(v, v));
}

export function normalize(v: Vec3): Vec3 {
  const len = length(v);
  // A zero vector has no direction; returning it unchanged lets `surfaceness`
  // (which is 0 there anyway) decide, instead of producing NaNs.
  if (len < 1e-12) return [0, 0, 0];
  return [v[0] / len, v[1] / len, v[2] / len];
}

export function scale(v: Vec3, k: number): Vec3 {
  return [v[0] * k, v[1] * k, v[2] * k];
}

export function add(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

export function negate(v: Vec3): Vec3 {
  return [-v[0], -v[1], -v[2]];
}

export const clamp01 = (x: number): number => (x < 0 ? 0 : x > 1 ? 1 : x);

export function mix(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function mixVec(a: Vec3, b: Vec3, t: number): Vec3 {
  return [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)];
}

/**
 * INVARIANT C3 — shade in PHYSICAL space.
 *
 * Base-voxel space is anisotropic; 5× z-steps are routine in microscopy, and a
 * raw base-voxel gradient gives visibly wrong normals (surfaces tilt toward
 * the thin axis). One componentwise divide by the total voxel extent takes
 * `d(norm)/d(level voxel)` to `d(norm)/d(physical unit)`.
 *
 * `levelScale` is the level's voxels-per-base-voxel; `baseScale` is the base
 * voxel's physical size.
 */
export function physicalGradient(
  gradientLevel: Vec3,
  levelScale: Vec3,
  baseScale: Vec3,
): Vec3 {
  return [
    gradientLevel[0] / (levelScale[0] * baseScale[0]),
    gradientLevel[1] / (levelScale[1] * baseScale[1]),
    gradientLevel[2] / (levelScale[2] * baseScale[2]),
  ];
}

/**
 * Levoy's surface gate: how much this sample should be lit at all.
 *
 * Where the field is flat — a homogeneous interior, the noise floor — there is
 * no surface, and lighting a noise gradient turns dim tissue into glitter.
 *
 * INVARIANT C5 — gated on the LEVEL-voxel gradient, never the physical one.
 * `norm ∈ [0, 1]` over a 1-voxel baseline makes `|gLvl|` roughly
 * dataset-independent; `|gPhys|` scales with the dataset's physical units and
 * would force `surfaceGain` to be retuned per dataset.
 */
export function surfaceness(gradientLevel: Vec3, surfaceGain: number): number {
  return clamp01(length(gradientLevel) * surfaceGain);
}

/**
 * Face the normal at the viewer.
 *
 * The gradient points UP the intensity ramp — into the object when the ray
 * approaches from outside, out of it when it approaches from inside. Without
 * this a perfectly good surface goes black purely because the ray entered from
 * the dense side.
 *
 * Only dot products are used downstream, so this survives a consistent
 * reflection of the local→voxel map (C4).
 */
export function faceForward(normal: Vec3, view: Vec3): Vec3 {
  return dot(normal, view) < 0 ? negate(normal) : normal;
}

/**
 * Headlight key + fixed object-space fill, Blinn-Phong.
 *
 * `view` must be the unit vector from the sample TOWARD the eye. Returns a
 * scalar multiplier for the sample's colour and a separate additive specular,
 * because the specular must not be tinted by the colormap.
 */
export function blinnPhong(
  normal: Vec3,
  view: Vec3,
  rig: LightRig,
): { diffuse: number; specular: number } {
  const n = faceForward(normalize(normal), view);

  let diffuse = 0;
  let spec = 0;
  const lights: { dir: Vec3; weight: number }[] = [
    { dir: view, weight: 1 },
    { dir: FILL_DIRECTION, weight: FILL_WEIGHT },
  ];

  for (const { dir, weight } of lights) {
    const ndl = Math.max(dot(n, dir), 0);
    diffuse += weight * ndl;
    if (ndl > 0) {
      // Blinn's half vector. `view` doubles as the key direction, so for the
      // key this reduces to H = V and the highlight sits where N faces the eye.
      const half = normalize(add(dir, view));
      spec += weight * rig.specular * Math.pow(Math.max(dot(n, half), 0), rig.shininess);
    }
  }

  const total = 1 + FILL_WEIGHT;
  return {
    // Never darker than `ambient`, so a lit surface can dim but not vanish.
    diffuse: mix(rig.ambient, 1, clamp01(diffuse / total)),
    specular: spec / total,
  };
}

/**
 * The whole shading step, as one pure function: base colour in, lit colour out.
 *
 * `gradientLevel` is in level voxels (drives `surfaceness`, C5) and
 * `gradientPhysical` is the same gradient in physical units (drives the
 * normal, C3). Where there is no surface, this returns `baseColor` EXACTLY —
 * which is what makes the whole feature a no-op on flat regions rather than a
 * uniform wash.
 */
export function shadeSample(
  baseColor: Vec3,
  gradientLevel: Vec3,
  gradientPhysical: Vec3,
  view: Vec3,
  rig: LightRig,
  /**
   * How much of the diffuse term to apply — 1 for VOLUME and ISOSURFACE,
   * `rig.mipShading` for the max projections. See `LightRig.mipShading`.
   */
  diffuseWeight = 1,
): Vec3 {
  const s = surfaceness(gradientLevel, rig.surfaceGain);
  if (s <= 0) return baseColor;

  const { diffuse, specular } = blinnPhong(gradientPhysical, view, rig);
  // `mix(1, diffuse, w)` and NOT `diffuse * w`: at w = 0 the colour must pass
  // through untouched, not go black.
  const applied = mix(1, diffuse, clamp01(diffuseWeight));
  const shaded = add(scale(baseColor, applied), [specular, specular, specular]);
  return mixVec(baseColor, shaded, s);
}

/**
 * The MIP/ATTENUATED_MIP form of `shadeSample`: the same shading, with the
 * diffuse term compressed toward 1 by `rig.mipShading` so a max projection can
 * keep reading as intensity. See `LightRig.mipShading` for the tradeoff.
 */
export function shadeMipSample(
  baseColor: Vec3,
  gradientLevel: Vec3,
  gradientPhysical: Vec3,
  view: Vec3,
  rig: LightRig,
): Vec3 {
  return shadeSample(baseColor, gradientLevel, gradientPhysical, view, rig, rig.mipShading);
}
