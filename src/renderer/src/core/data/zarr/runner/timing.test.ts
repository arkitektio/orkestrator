import { afterEach, describe, expect, it } from "vitest";
import { zarrTimingEnabled } from "./timing";

const g = globalThis as { __ZARR_TIMING__?: unknown };

afterEach(() => {
  delete g.__ZARR_TIMING__;
});

describe("zarrTimingEnabled", () => {
  it("is off by default and only on for an explicit `true`", () => {
    expect(zarrTimingEnabled()).toBe(false);
    g.__ZARR_TIMING__ = 1;
    expect(zarrTimingEnabled()).toBe(false);
    g.__ZARR_TIMING__ = "true";
    expect(zarrTimingEnabled()).toBe(false);
    g.__ZARR_TIMING__ = true;
    expect(zarrTimingEnabled()).toBe(true);
  });
});
