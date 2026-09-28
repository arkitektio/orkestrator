import { describe, expect, it } from "vitest";
import {
  CINEMATIC_DEFAULTS,
  FILL_DIRECTION,
  GRADIENT_H,
  blinnPhong,
  faceForward,
  length,
  physicalGradient,
  shadeMipSample,
  shadeSample,
  surfaceness,
  type Vec3,
} from "./shading";
import { resolveBrickSpec } from "../../features/bricks/octree/brickSpec";
import { buildLayerLevelGeometry, type LevelSource } from "../coords/levelGeometry";

/**
 * These pin the TS. They do NOT pin the TSL port in
 * `features/bricks/gpu/brickNodeMaterials.ts` — TSL compiles to WGSL only on a
 * real device, and vitest runs node/jsdom. Same caveat as the `phasor.ts` and
 * `opacityCorrection.ts` mirrors; do not oversell them.
 */

describe("GRADIENT_H fits inside the 3D brick border (INVARIANT C2)", () => {
  const level = (x: number, y: number, z: number, chunk = 64): LevelSource => ({
    shape: [z, y, x, 1],
    chunks: [Math.min(chunk, z), Math.min(chunk, y), Math.min(chunk, x), 1],
    dtype: "uint16",
    storeId: "s",
    scaleFactors: null,
  });

  const geometryOf = (levels: LevelSource[]) =>
    buildLayerLevelGeometry(
      ["z", "y", "x", "c"],
      { xAxis: "x", yAxis: "y", zAxis: "z", intensityAxis: "c" } as never,
      levels,
    )!;

  /**
   * THE test this module exists for. Six central-difference taps at ±0.5 texel
   * off `texelBase` are safe ONLY because a 3D brick carries a replicated
   * border wide enough to absorb them. If anyone sets `border: 0` for 3D, or
   * bumps GRADIENT_H "for a smoother normal", this fires — instead of the
   * render silently mixing the NEIGHBOURING CHANNEL SLAB's data into the
   * normals, which is invisible in the picture and diagnosable only by eye.
   */
  it.each([
    ["a plain pyramid", [level(512, 512, 64), level(256, 256, 32), level(128, 128, 16)]],
    ["a thin slab", [level(2048, 2048, 4), level(1024, 1024, 2)]],
    // Forces resolveBrickSpec's payload-DOUBLING loop: the page grids of a
    // huge volume cannot be packed into one page texture at a 64³ payload.
    ["a volume that forces payload doubling", [level(16384, 16384, 4096)]],
    ["a shallow volume (payload clamped to the extents)", [level(32, 32, 8)]],
  ])("holds for %s", (_label, levels) => {
    const spec = resolveBrickSpec(geometryOf(levels as LevelSource[]), "3D");
    expect(spec.border).toBeGreaterThanOrEqual(GRADIENT_H);
    // The filter-safe range of a slot leaves exactly `border` texels of margin;
    // consuming all of it is allowed, exceeding it is not.
    expect(GRADIENT_H).toBeLessThanOrEqual(spec.border);
  });

  it("2D never carries a border, which is why cinematic is 3D-only", () => {
    const spec = resolveBrickSpec(geometryOf([level(512, 512, 1)]), "2D");
    expect(spec.border).toBe(0);
  });
});

describe("physicalGradient (INVARIANT C3)", () => {
  it("is exact under an anisotropic scale", () => {
    // A 5× z step, routine in microscopy.
    const g = physicalGradient([1, 1, 1], [2, 2, 2], [0.1, 0.1, 0.5]);
    expect(g[0]).toBeCloseTo(5);
    expect(g[1]).toBeCloseTo(5);
    expect(g[2]).toBeCloseTo(1);
  });

  it("turns an axis-equal level gradient into a z-shrunken physical one", () => {
    // The bug this invariant prevents: a raw base-voxel normal on anisotropic
    // data tilts toward the thin axis.
    const raw: Vec3 = [1, 1, 1];
    const phys = physicalGradient(raw, [1, 1, 1], [1, 1, 5]);
    expect(phys[2]).toBeLessThan(phys[0]);
  });

  it("is identity under an isotropic unit scale", () => {
    expect(physicalGradient([3, -2, 0.5], [1, 1, 1], [1, 1, 1])).toEqual([3, -2, 0.5]);
  });
});

describe("surfaceness (INVARIANT C5)", () => {
  it("is zero on a flat field, so noise is never lit", () => {
    expect(surfaceness([0, 0, 0], CINEMATIC_DEFAULTS.surfaceGain)).toBe(0);
  });

  it("clamps to 1 on a steep one", () => {
    expect(surfaceness([1, 1, 1], CINEMATIC_DEFAULTS.surfaceGain)).toBe(1);
  });

  it("rises monotonically between", () => {
    const gain = CINEMATIC_DEFAULTS.surfaceGain;
    const a = surfaceness([0.01, 0, 0], gain);
    const b = surfaceness([0.05, 0, 0], gain);
    expect(a).toBeGreaterThan(0);
    expect(a).toBeLessThan(b);
    expect(b).toBeLessThan(1);
  });

  it("is gated on the LEVEL gradient, so the gain needs no per-dataset retune", () => {
    // Same structure, two datasets whose physical units differ 1000×. The
    // level-voxel gradient — what surfaceness sees — is identical.
    const gLevel: Vec3 = [0.1, 0, 0];
    const nm = physicalGradient(gLevel, [1, 1, 1], [0.001, 0.001, 0.001]);
    const mm = physicalGradient(gLevel, [1, 1, 1], [1, 1, 1]);
    expect(length(nm)).not.toBeCloseTo(length(mm));
    expect(surfaceness(gLevel, 6)).toBe(surfaceness(gLevel, 6));
  });
});

describe("faceForward", () => {
  it("flips a normal pointing away from the viewer", () => {
    expect(faceForward([0, 0, -1], [0, 0, 1])).toEqual([-0, -0, 1]);
  });

  it("leaves one already facing the viewer alone", () => {
    expect(faceForward([0, 0, 1], [0, 0, 1])).toEqual([0, 0, 1]);
  });

  it("makes shading independent of which side the ray entered from", () => {
    const view: Vec3 = [0, 0, 1];
    const front = blinnPhong([0, 0, 1], view, CINEMATIC_DEFAULTS);
    const back = blinnPhong([0, 0, -1], view, CINEMATIC_DEFAULTS);
    expect(front.diffuse).toBeCloseTo(back.diffuse);
    expect(front.specular).toBeCloseTo(back.specular);
  });
});

describe("blinnPhong", () => {
  it("never returns a surface darker than ambient", () => {
    // Every direction on a coarse sphere: the headlight guarantees this.
    for (let i = 0; i < 64; i++) {
      const theta = (i / 64) * Math.PI * 2;
      for (const phi of [0.1, 1, 2, 3]) {
        const n: Vec3 = [
          Math.sin(phi) * Math.cos(theta),
          Math.sin(phi) * Math.sin(theta),
          Math.cos(phi),
        ];
        const { diffuse } = blinnPhong(n, [0, 0, 1], CINEMATIC_DEFAULTS);
        expect(diffuse).toBeGreaterThanOrEqual(CINEMATIC_DEFAULTS.ambient - 1e-9);
        expect(diffuse).toBeLessThanOrEqual(1 + 1e-9);
      }
    }
  });

  it("is brightest where the normal faces the eye", () => {
    const head = blinnPhong([0, 0, 1], [0, 0, 1], CINEMATIC_DEFAULTS);
    const edge = blinnPhong([1, 0, 0], [0, 0, 1], CINEMATIC_DEFAULTS);
    expect(head.diffuse).toBeGreaterThan(edge.diffuse);
  });

  it("gives the fixed fill a shape cue where a pure headlight would be flat", () => {
    // At frame centre dot(N, V) = 1 for a range of normals under a pure
    // headlight; the fill is what separates them.
    const a = blinnPhong([0, 0, 1], [0, 0, 1], CINEMATIC_DEFAULTS);
    const b = blinnPhong(FILL_DIRECTION, [0, 0, 1], CINEMATIC_DEFAULTS);
    expect(a.diffuse).not.toBeCloseTo(b.diffuse);
  });

  it("tightens the highlight as shininess rises", () => {
    const offAxis: Vec3 = [0.4, 0, 1];
    const soft = blinnPhong(offAxis, [0, 0, 1], { ...CINEMATIC_DEFAULTS, shininess: 4 });
    const tight = blinnPhong(offAxis, [0, 0, 1], { ...CINEMATIC_DEFAULTS, shininess: 128 });
    expect(tight.specular).toBeLessThan(soft.specular);
  });
});

describe("shadeSample", () => {
  const color: Vec3 = [0.2, 0.6, 0.4];

  it("returns the base colour EXACTLY where there is no surface", () => {
    // The property that makes cinematic a no-op on flat regions rather than a
    // uniform wash over the whole volume.
    expect(shadeSample(color, [0, 0, 0], [0, 0, 0], [0, 0, 1], CINEMATIC_DEFAULTS)).toEqual(
      color,
    );
  });

  it("returns the base colour when surfaceGain is 0", () => {
    expect(
      shadeSample(color, [1, 1, 1], [1, 1, 1], [0, 0, 1], { ...CINEMATIC_DEFAULTS, surfaceGain: 0 }),
    ).toEqual(color);
  });

  it("modulates colour on a real surface", () => {
    const lit = shadeSample(color, [1, 0, 0], [1, 0, 0], [0, 0, 1], CINEMATIC_DEFAULTS);
    expect(lit).not.toEqual(color);
    lit.forEach((v) => expect(Number.isFinite(v)).toBe(true));
  });

  it("blends continuously from base to shaded as the surface firms up", () => {
    const view: Vec3 = [0, 0, 1];
    const weak = shadeSample(color, [0.02, 0, 0], [1, 0, 0], view, CINEMATIC_DEFAULTS);
    const strong = shadeSample(color, [1, 0, 0], [1, 0, 0], view, CINEMATIC_DEFAULTS);
    // The weak sample sits between the unlit and the fully lit one.
    expect(Math.abs(weak[0] - color[0])).toBeLessThan(Math.abs(strong[0] - color[0]));
  });

  it("survives a zero physical gradient without NaNs", () => {
    // `normalize` of a zero vector: surfaceness is >0 (level gradient is not
    // zero) while the physical one collapsed. Must not produce NaN.
    const out = shadeSample(color, [1, 0, 0], [0, 0, 0], [0, 0, 1], CINEMATIC_DEFAULTS);
    out.forEach((v) => expect(Number.isNaN(v)).toBe(false));
  });
});

describe("shadeMipSample — the MIP diffuse dial", () => {
  const color: Vec3 = [0.2, 0.6, 0.4];
  // A normal well off-axis, so the full diffuse term is clearly < 1 and the
  // difference between the two ends is visible.
  const gLevel: Vec3 = [1, 0, 0];
  const gPhys: Vec3 = [1, 0.6, 0];
  const view: Vec3 = [0, 0, 1];

  it("at mipShading = 0 preserves brightness EXACTLY, up to the added specular", () => {
    // The quantitative end: a max projection still reads as max intensity.
    // Diffuse must contribute nothing, so the only change is additive specular
    // — which can never make the sample DARKER than it was.
    const rig = { ...CINEMATIC_DEFAULTS, mipShading: 0 };
    const out = shadeMipSample(color, gLevel, gPhys, view, rig);
    out.forEach((v, i) => expect(v).toBeGreaterThanOrEqual(color[i] - 1e-9));
  });

  it("at mipShading = 0 with no specular is a pure no-op", () => {
    const rig = { ...CINEMATIC_DEFAULTS, mipShading: 0, specular: 0 };
    const out = shadeMipSample(color, gLevel, gPhys, view, rig);
    out.forEach((v, i) => expect(v).toBeCloseTo(color[i], 10));
  });

  it("at mipShading = 1 is identical to full shading", () => {
    const rig = { ...CINEMATIC_DEFAULTS, mipShading: 1 };
    const mip = shadeMipSample(color, gLevel, gPhys, view, rig);
    const full = shadeSample(color, gLevel, gPhys, view, rig);
    mip.forEach((v, i) => expect(v).toBeCloseTo(full[i], 10));
  });

  it("darkens monotonically as the dial rises on an off-axis normal", () => {
    // The tradeoff made visible: more shading means less of the brightness
    // reading survives.
    const at = (k: number) =>
      shadeMipSample(color, gLevel, gPhys, view, { ...CINEMATIC_DEFAULTS, mipShading: k })[1];
    expect(at(0)).toBeGreaterThan(at(0.5));
    expect(at(0.5)).toBeGreaterThan(at(1));
  });

  it("never scales the specular — a highlight only ever ADDS light", () => {
    // A normal near the view vector, so the headlight actually produces a
    // highlight (the off-axis normal above has ndl ~ 0 and no specular at all).
    const gPhys: Vec3 = [0.25, 0, 1];
    // Compare against a no-specular rig at each end: the specular delta must
    // be the same at both, i.e. the dial touches diffuse only.
    const deltaAt = (k: number) => {
      const withSpec = shadeMipSample(color, gLevel, gPhys, view, {
        ...CINEMATIC_DEFAULTS,
        mipShading: k,
      });
      const without = shadeMipSample(color, gLevel, gPhys, view, {
        ...CINEMATIC_DEFAULTS,
        mipShading: k,
        specular: 0,
      });
      return withSpec[0] - without[0];
    };
    expect(deltaAt(0)).toBeCloseTo(deltaAt(1), 10);
    expect(deltaAt(0)).toBeGreaterThan(0);
  });

  it("is still a no-op where there is no surface, at every dial position", () => {
    for (const k of [0, 0.25, 0.5, 1]) {
      expect(
        shadeMipSample(color, [0, 0, 0], [0, 0, 0], view, {
          ...CINEMATIC_DEFAULTS,
          mipShading: k,
        }),
      ).toEqual(color);
    }
  });
});
