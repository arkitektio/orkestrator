import { describe, expect, it } from "vitest";

import { zarrWorkerPoolSize } from "./poolSize";

describe("zarrWorkerPoolSize", () => {
  it("leaves two cores for the main thread and the GPU process", () => {
    expect(zarrWorkerPoolSize(8)).toBe(6);
    expect(zarrWorkerPoolSize(10)).toBe(8);
  });

  it("never drops below four, never exceeds twelve", () => {
    expect(zarrWorkerPoolSize(2)).toBe(4);
    expect(zarrWorkerPoolSize(4)).toBe(4);
    expect(zarrWorkerPoolSize(16)).toBe(12);
    expect(zarrWorkerPoolSize(64)).toBe(12);
  });

  it("falls back when the platform does not say", () => {
    expect(zarrWorkerPoolSize(undefined)).toBe(6);
  });
});
