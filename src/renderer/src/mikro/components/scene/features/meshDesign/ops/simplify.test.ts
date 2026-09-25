import { describe, expect, it } from "vitest";

import { compactGeometry, simplifyGeometry, simplifyToError, type SimplifierLike } from "./simplify";

describe("compactGeometry", () => {
  it("drops unreferenced vertices and renumbers the rest", () => {
    const positions = new Float32Array([0, 0, 0, 9, 9, 9, 1, 0, 0, 0, 1, 0]);
    const indices = new Uint32Array([0, 2, 3]);
    const out = compactGeometry(positions, indices);
    expect([...out.positions]).toEqual([0, 0, 0, 1, 0, 0, 0, 1, 0]);
    expect([...out.indices]).toEqual([0, 1, 2]);
  });
});

describe("simplifyToError", () => {
  const quad = {
    positions: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 1, 0, 2, 0, 0, 2, 1, 0]),
    indices: new Uint32Array([0, 1, 2, 1, 3, 2, 1, 4, 3, 4, 5, 3]),
  };

  it("asks for an ABSOLUTE error bound with no triangle target", async () => {
    let seen: { target: number; error: number; flags?: string[] } | null = null;
    const simplifier: SimplifierLike = {
      ready: Promise.resolve(),
      simplify: (_i, _p, _s, target, error, flags) => {
        seen = { target, error, flags };
        return [new Uint32Array([0, 1, 2]), 0.5];
      },
    };
    const out = await simplifyToError(quad, 0.75, { simplifier });
    expect(seen).toEqual({ target: 0, error: 0.75, flags: ["LockBorder", "ErrorAbsolute"] });
    expect([...out.indices]).toEqual([0, 1, 2]);
    expect(out.positions).toHaveLength(9);
  });

  it("leaves a mesh alone for a non-positive error", async () => {
    const simplifier: SimplifierLike = {
      ready: Promise.resolve(),
      simplify: () => {
        throw new Error("must not be called");
      },
    };
    expect(await simplifyToError(quad, 0, { simplifier })).toBe(quad);
  });
});

describe("simplifyGeometry", () => {
  const quad = {
    positions: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 1, 0, 2, 0, 0, 2, 1, 0]),
    indices: new Uint32Array([0, 1, 2, 1, 3, 2, 1, 4, 3, 4, 5, 3]),
  };

  it("returns the original for ratio 1 without touching the simplifier", async () => {
    const simplifier: SimplifierLike = {
      ready: Promise.resolve(),
      simplify: () => {
        throw new Error("must not be called");
      },
    };
    expect(await simplifyGeometry(quad, 1, { simplifier })).toBe(quad);
  });

  it("asks for a triangle-aligned target and compacts the answer", async () => {
    let asked = -1;
    const simplifier: SimplifierLike = {
      ready: Promise.resolve(),
      simplify: (_indices, _positions, _stride, target) => {
        asked = target;
        return [new Uint32Array([0, 1, 2, 1, 4, 2]), 0.01];
      },
    };
    const out = await simplifyGeometry(quad, 0.5, { simplifier });
    expect(asked).toBe(6);
    expect(out.positions).toHaveLength(12); // vertices 0,1,2,4
    expect([...out.indices]).toEqual([0, 1, 2, 1, 3, 2]);
  });
});
