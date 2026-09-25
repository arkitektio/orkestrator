import { describe, expect, it } from "vitest";

import type { CorridorBox } from "../shared/corridorPlan";
import { corridorIndex } from "../shared/corridorPlan";
import { TET_CORNERS, TET_TRIANGLE_TABLE, tetTableWGSL } from "./marchingTets";
import { tubeClampValue } from "./tubeMarch";
import { MARCHERS } from "./marcher";
import { MC_TRIANGLE_TABLE, mcTableWGSL } from "./marchingCubes";
import { INF_COST } from "../shared/corridorCost";

/**
 * The load-bearing invariants of the GENERATED tet table are proved here on
 * real extractions, not asserted entry-by-entry: a closed inside region must
 * produce a WATERTIGHT surface (every undirected edge shared by exactly two
 * triangles — any orientation or double-emit bug in the table breaks this),
 * and consistently OUTWARD-wound triangles (the divergence-theorem signed
 * volume comes out positive and close to the analytic volume).
 */

const signedVolume = (positions: Float32Array): number => {
  let volume = 0;
  for (let i = 0; i < positions.length; i += 9) {
    const [ax, ay, az] = [positions[i], positions[i + 1], positions[i + 2]];
    const [bx, by, bz] = [positions[i + 3], positions[i + 4], positions[i + 5]];
    const [cx, cy, cz] = [positions[i + 6], positions[i + 7], positions[i + 8]];
    volume +=
      (ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx)) / 6;
  }
  return volume;
};

const edgeCounts = (positions: Float32Array): Map<string, number> => {
  const key = (i: number) =>
    `${positions[i].toFixed(4)},${positions[i + 1].toFixed(4)},${positions[i + 2].toFixed(4)}`;
  const counts = new Map<string, number>();
  for (let i = 0; i < positions.length; i += 9) {
    const vertices = [key(i), key(i + 3), key(i + 6)];
    for (let e = 0; e < 3; e += 1) {
      const a = vertices[e];
      const b = vertices[(e + 1) % 3];
      const edge = a < b ? `${a}|${b}` : `${b}|${a}`;
      counts.set(edge, (counts.get(edge) ?? 0) + 1);
    }
  }
  return counts;
};

describe("tet table", () => {
  it("covers the trivial and complement cases", () => {
    for (let t = 0; t < TET_CORNERS.length; t += 1) {
      expect(TET_TRIANGLE_TABLE[t][0]).toHaveLength(0);
      expect(TET_TRIANGLE_TABLE[t][15]).toHaveLength(0);
      for (let mask = 1; mask < 15; mask += 1) {
        const bits = [mask & 1, mask & 2, mask & 4, mask & 8].filter(Boolean).length;
        const triangles = TET_TRIANGLE_TABLE[t][mask].length / 3;
        expect(triangles).toBe(bits === 2 ? 2 : 1);
      }
    }
  });

  it("serializes offsets and edges consistently", () => {
    const wgsl = tetTableWGSL();
    expect(wgsl).toContain("TET_TRI_OFFSETS = array<u32, 97>"); // 6*16 + 1
    expect(wgsl).toContain("TET_MASK_CORNERS = array<u32, 24>");
  });
});

describe("cube table", () => {
  it("has no triangles for the trivial masks and whole triangles everywhere else", () => {
    expect(MC_TRIANGLE_TABLE[0]).toHaveLength(0);
    expect(MC_TRIANGLE_TABLE[255]).toHaveLength(0);
    for (let mask = 1; mask < 255; mask += 1) {
      expect(MC_TRIANGLE_TABLE[mask].length % 3).toBe(0);
      expect(MC_TRIANGLE_TABLE[mask].length).toBeGreaterThan(0);
      // Never more than the tet decomposition would need (12 triangles).
      expect(MC_TRIANGLE_TABLE[mask].length / 3).toBeLessThanOrEqual(12);
    }
    // (Complementary masks are deliberately NOT mirror images: the ambiguous
    // face resolves by separating the INSIDE corners, which is what keeps two
    // neighbouring cells consistent — see the random-field test.)
  });

  it("serializes offsets and edges consistently", () => {
    const wgsl = mcTableWGSL();
    expect(wgsl).toContain("MC_TRI_OFFSETS = array<u32, 257>");
    const edges = MC_TRIANGLE_TABLE.reduce((n, t) => n + t.length, 0);
    expect(wgsl).toContain(`MC_TRI_EDGES = array<u32, ${edges}>`);
  });
});

describe.each(Object.values(MARCHERS))("$label", (marcher) => {
  const marchTube = marcher.march;
  // Cost = distance from the sphere's center; iso = radius → the isosurface
  // is a sphere of radius 6 centered in a 16³ box.
  const box: CorridorBox = { origin: [0, 0, 0], size: [16, 16, 16] };
  const center = 8; // voxel-center coordinates run 0.5 .. 15.5
  const radius = 6;
  const sphereCost = (): Float32Array => {
    const cost = new Float32Array(16 * 16 * 16);
    for (let z = 0; z < 16; z += 1) {
      for (let y = 0; y < 16; y += 1) {
        for (let x = 0; x < 16; x += 1) {
          cost[corridorIndex(box, x, y, z)] = Math.hypot(
            x + 0.5 - center,
            y + 0.5 - center,
            z + 0.5 - center,
          );
        }
      }
    }
    return cost;
  };

  it("produces a watertight, outward-wound sphere of the right volume", () => {
    const { positions, triangles, truncated } = marchTube({
      cost: sphereCost(),
      box,
      iso: radius,
    });
    expect(truncated).toBe(false);
    expect(triangles).toBeGreaterThan(100);

    // Watertight: every undirected edge is shared by exactly two triangles.
    for (const [, count] of edgeCounts(positions)) {
      expect(count).toBe(2);
    }

    // Every vertex sits on the iso sphere (linear interpolation of the true
    // distance field along an axis-or-diagonal edge is near-exact).
    for (let i = 0; i < positions.length; i += 3) {
      const r = Math.hypot(
        positions[i] - center,
        positions[i + 1] - center,
        positions[i + 2] - center,
      );
      expect(Math.abs(r - radius)).toBeLessThan(0.15);
    }

    // Outward winding: signed volume (about an interior origin) is positive
    // and close to (4/3)πr³. Shift to center-relative for the volume sum.
    const centered = positions.map((v) => v - center) as unknown as Float32Array;
    const volume = signedVolume(Float32Array.from(centered));
    const analytic = (4 / 3) * Math.PI * radius ** 3;
    expect(volume).toBeGreaterThan(0);
    expect(Math.abs(volume - analytic) / analytic).toBeLessThan(0.05);
  });

  it("closes against INF walls instead of leaking through them", () => {
    // A bright half-space cut by an INF wall: the surface must still be
    // watertight because the wall reads as outside.
    const wallBox: CorridorBox = { origin: [0, 0, 0], size: [8, 8, 8] };
    const cost = new Float32Array(8 * 8 * 8).fill(INF_COST);
    for (let z = 2; z < 6; z += 1) {
      for (let y = 2; y < 6; y += 1) {
        for (let x = 2; x < 6; x += 1) {
          cost[corridorIndex(wallBox, x, y, z)] = 0.1;
        }
      }
    }
    const { positions, truncated } = marchTube({ cost, box: wallBox, iso: 0.5 });
    expect(truncated).toBe(false);
    expect(positions.length).toBeGreaterThan(0);
    for (const [, count] of edgeCounts(positions)) {
      expect(count).toBe(2);
    }
    // Wall crossings land mid-edge (clamped interpolation), never fly off
    // toward the raw INF value.
    for (let i = 0; i < positions.length; i += 3) {
      expect(positions[i]).toBeGreaterThanOrEqual(0);
      expect(positions[i]).toBeLessThanOrEqual(8);
    }
    expect(tubeClampValue(0.5)).toBeLessThan(INF_COST);
  });

  it("respects the vertex cap and reports truncation", () => {
    const { triangles, truncated, positions } = marchTube({
      cost: sphereCost(),
      box,
      iso: radius,
      maxVertices: 30,
    });
    expect(truncated).toBe(true);
    expect(triangles).toBeLessThanOrEqual(10);
    expect(positions.length % 9).toBe(0);
  });

  it("stays watertight on a random field — the ambiguity rule is consistent across cells", () => {
    const fieldBox: CorridorBox = { origin: [0, 0, 0], size: [10, 10, 10] };
    let seed = 7;
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const cost = new Float32Array(10 * 10 * 10).fill(INF_COST);
    for (let z = 1; z < 9; z += 1) {
      for (let y = 1; y < 9; y += 1) {
        for (let x = 1; x < 9; x += 1) cost[corridorIndex(fieldBox, x, y, z)] = rand();
      }
    }
    const { positions, truncated } = marchTube({ cost, box: fieldBox, iso: 0.5 });
    expect(truncated).toBe(false);
    for (const [, count] of edgeCounts(positions)) expect(count).toBe(2);
  });
});

describe("marcher parity", () => {
  it("cubes emit fewer triangles than tets for the same sphere", () => {
    const box: CorridorBox = { origin: [0, 0, 0], size: [16, 16, 16] };
    const cost = new Float32Array(16 * 16 * 16);
    for (let z = 0; z < 16; z += 1) {
      for (let y = 0; y < 16; y += 1) {
        for (let x = 0; x < 16; x += 1) {
          cost[corridorIndex(box, x, y, z)] = Math.hypot(x + 0.5 - 8, y + 0.5 - 8, z + 0.5 - 8);
        }
      }
    }
    const tets = MARCHERS.tets.march({ cost, box, iso: 6 });
    const cubes = MARCHERS.cubes.march({ cost, box, iso: 6 });
    expect(cubes.triangles).toBeLessThan(tets.triangles * 0.6);
  });
});
