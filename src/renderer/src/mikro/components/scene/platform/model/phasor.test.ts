// @vitest-environment jsdom
// (the generated `graphql.ts` enums are runtime values, and importing that
// module pulls in the Apollo hooks barrel, which touches `window` on load)
import { describe, expect, it } from "vitest";

import { AxisType, PhasorColorMode } from "@/mikro/api/graphql";
import {
  calibratePhasor,
  cursorHit,
  phasorModulation,
  phasorPhase,
  phasorValue,
  reduceProfile,
  resolvePhasorScale,
  singleExponentialPhasor,
  UNIVERSAL_SEMICIRCLE,
} from "./phasor";

/** An exponential decay I(t) = exp(-t/tau), sampled into `bins` over `window`. */
const decay = (tau: number, bins: number, window: number): number[] =>
  Array.from({ length: bins }, (_, k) => Math.exp(-((k * window) / bins) / tau));

describe("reduceProfile", () => {
  it("puts a flat profile at the origin (all harmonics cancel)", () => {
    const { g, s, intensity } = reduceProfile(new Array(16).fill(3));
    expect(g).toBeCloseTo(0, 10);
    expect(s).toBeCloseTo(0, 10);
    expect(intensity).toBe(48);
  });

  it("puts all photons in bin 0 at (1, 0) — a zero-lifetime decay", () => {
    const profile = new Array(16).fill(0);
    profile[0] = 10;
    const { g, s, intensity } = reduceProfile(profile);
    expect(g).toBeCloseTo(1, 10);
    expect(s).toBeCloseTo(0, 10);
    expect(intensity).toBe(10);
  });

  it("has no phasor for a pixel with no photons", () => {
    expect(reduceProfile(new Array(8).fill(0))).toEqual({ g: 0, s: 0, intensity: 0 });
  });

  it("agrees with a hand-computed DFT at harmonic 2", () => {
    // 4 bins, one photon in bin 1: at harmonic 2 the angle is 2·(2π/4) = π.
    const { g, s } = reduceProfile([0, 1, 0, 0], 2);
    expect(g).toBeCloseTo(-1, 10);
    expect(s).toBeCloseTo(0, 10);
  });
});

describe("the universal semicircle", () => {
  // A 12.5 ns window (an 80 MHz laser's period) sampled into 256 microtime bins.
  const scale = resolvePhasorScale({
    axisType: AxisType.Microtime,
    harmonic: 1,
    laserFrequency: "80 MHz",
    window: "12.5 ns",
  });

  it("scales an 80 MHz laser into rad/ms (the time base unit)", () => {
    expect(scale.dimension).toBe("time");
    expect(scale.omega).toBeCloseTo(2 * Math.PI * 80e6 * 1e-3, 3);
  });

  it.each([0.5, 2, 4])(
    "lands a single-exponential decay of tau=%s ns on the semicircle",
    (tauNs) => {
      const { g, s } = reduceProfile(decay(tauNs, 4096, 12.5));
      const dg = g - UNIVERSAL_SEMICIRCLE.centerG;
      const ds = s - UNIVERSAL_SEMICIRCLE.centerS;
      // Sampling a decay over a FINITE window (no wrap-around of the tail) is
      // not exactly the analytic phasor, so this is a tolerance, not an
      // identity — but a 12.5 ns window holds ~3 lifetimes even at tau=4.
      expect(Math.sqrt(dg * dg + ds * ds)).toBeCloseTo(UNIVERSAL_SEMICIRCLE.radius, 1);
    },
  );

  it("reads phase and modulation as the SAME lifetime for a single exponential", () => {
    // The analytic phasor, so this is an identity, not an approximation:
    // tau_phi == tau_m exactly on the semicircle.
    const tauMs = 2e-6; // 2 ns, in the ms base unit
    const { g, s } = singleExponentialPhasor(tauMs, scale);
    const phi = phasorValue(g, s, PhasorColorMode.Phase, scale);
    const m = phasorValue(g, s, PhasorColorMode.Modulation, scale);
    expect(phi).toBeCloseTo(tauMs, 12);
    expect(m).toBeCloseTo(tauMs, 12);
    expect(phasorValue(g, s, PhasorColorMode.Average, scale)).toBeCloseTo(tauMs, 12);
  });

  it("reads tau_m > tau_phi for a two-component mixture (it falls INSIDE)", () => {
    const mixed = decay(0.5, 4096, 12.5).map((v, k) => v + decay(4, 4096, 12.5)[k]);
    const { g, s } = reduceProfile(mixed);
    const dg = g - UNIVERSAL_SEMICIRCLE.centerG;
    const ds = s - UNIVERSAL_SEMICIRCLE.centerS;
    expect(Math.sqrt(dg * dg + ds * ds)).toBeLessThan(UNIVERSAL_SEMICIRCLE.radius);
    expect(phasorValue(g, s, PhasorColorMode.Modulation, scale)).toBeGreaterThan(
      phasorValue(g, s, PhasorColorMode.Phase, scale),
    );
  });
});

describe("calibratePhasor", () => {
  it("is the identity with no correction", () => {
    expect(calibratePhasor(0.3, 0.4)).toEqual({ g: 0.3, s: 0.4 });
  });

  it("rotates by the phase offset and scales by the modulation factor", () => {
    const { g, s } = calibratePhasor(1, 0, {
      phaseOffset: Math.PI / 2,
      modulationFactor: 0.5,
    });
    expect(g).toBeCloseTo(0, 10);
    expect(s).toBeCloseTo(0.5, 10);
  });
});

describe("phasorValue without a scale", () => {
  const raw = resolvePhasorScale({ axisType: AxisType.Microtime, harmonic: 1 });

  it("degrades to the phase as a fraction of a turn, and to the modulus", () => {
    expect(raw.omega).toBeNull();
    const { g, s } = { g: 0, s: 1 }; // phase = pi/2, modulation = 1
    expect(phasorPhase(g, s)).toBeCloseTo(Math.PI / 2, 10);
    expect(phasorModulation(g, s)).toBeCloseTo(1, 10);
    expect(phasorValue(g, s, PhasorColorMode.Phase, raw)).toBeCloseTo(0.25, 10);
    expect(phasorValue(g, s, PhasorColorMode.Modulation, raw)).toBeCloseTo(1, 10);
  });

  it("clamps a phase past the semicircle's apex to zero rather than emitting -Inf", () => {
    const scale = resolvePhasorScale({
      axisType: AxisType.Microtime,
      harmonic: 1,
      laserFrequency: "80 MHz",
    });
    // Phase > pi/2 (second quadrant): tan is negative — no positive lifetime.
    expect(phasorValue(-0.3, 0.2, PhasorColorMode.Phase, scale)).toBe(0);
  });
});

describe("a spectrum axis", () => {
  it("reads the phase as a centre of mass along the window, not a lifetime", () => {
    const scale = resolvePhasorScale({
      axisType: AxisType.Spectrum,
      harmonic: 1,
      window: "320 nm",
    });
    expect(scale.dimension).toBe("length");
    // Half a turn = half the window. Length base is µm: 320 nm = 0.32 µm.
    const phase = Math.PI;
    const { g, s } = { g: Math.cos(phase), s: Math.sin(phase) };
    expect(phasorValue(g, s, PhasorColorMode.Phase, scale)).toBeCloseTo(0.16, 6);
  });
});

describe("cursorHit", () => {
  const circle = { kind: "CIRCLE", g: 0.5, s: 0.3, radius: 0.1, visible: true };

  it("paints the pixels inside a circle", () => {
    expect(cursorHit(0.5, 0.3, circle)).toBe(true);
    expect(cursorHit(0.55, 0.3, circle)).toBe(true);
    expect(cursorHit(0.7, 0.3, circle)).toBe(false);
  });

  it("ignores a hidden cursor and a degenerate one", () => {
    expect(cursorHit(0.5, 0.3, { ...circle, visible: false })).toBe(false);
    expect(cursorHit(0.5, 0.3, { ...circle, radius: 0 })).toBe(false);
  });

  it("paints the pixels inside a polygon (even-odd crossing)", () => {
    const triangle = {
      kind: "POLYGON",
      points: [
        [0, 0],
        [1, 0],
        [0, 1],
      ],
    };
    expect(cursorHit(0.2, 0.2, triangle)).toBe(true);
    expect(cursorHit(0.9, 0.9, triangle)).toBe(false);
    expect(cursorHit(0.2, 0.2, { kind: "POLYGON", points: [[0, 0]] })).toBe(false);
  });
});
