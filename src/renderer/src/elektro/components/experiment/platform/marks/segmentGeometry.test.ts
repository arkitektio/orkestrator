import { describe, expect, it } from "vitest";
import { createSegmentGeometry, segmentCapacityFor, writeSegments } from "./segmentGeometry";

describe("segment geometry", () => {
  it("steps capacity by 4× so a zoom sweep reallocates rarely", () => {
    expect(segmentCapacityFor(0)).toBe(256);
    expect(segmentCapacityFor(256)).toBe(256);
    expect(segmentCapacityFor(257)).toBe(1024);
    expect(segmentCapacityFor(1581)).toBe(4096);
  });

  it("writes in place into the buffer allocated at capacity, never a new one", () => {
    const geometry = createSegmentGeometry(256, true);
    const start = geometry.getAttribute("instanceStart") as unknown as { data: { array: Float32Array } };
    const buffer = start.data;
    const before = buffer.array;
    writeSegments(geometry, Float32Array.from({ length: 12 }, (_, i) => i), 2, new Float32Array(12).fill(1));
    expect(buffer.array).toBe(before);
    expect(Array.from(buffer.array.subarray(0, 12))).toEqual(Array.from({ length: 12 }, (_, i) => i));
    expect(geometry.instanceCount).toBe(2);
    expect(buffer.array.length).toBe(256 * 6);
  });

  it("has its instance attributes from construction (no shader compiled without them)", () => {
    const geometry = createSegmentGeometry(256, false);
    expect(geometry.getAttribute("instanceStart")).toBeDefined();
    expect(geometry.getAttribute("instanceEnd")).toBeDefined();
    expect(geometry.instanceCount).toBe(0);
  });
});
