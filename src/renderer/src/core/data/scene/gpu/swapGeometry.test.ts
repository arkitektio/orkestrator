import { describe, expect, it, vi } from "vitest";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry.js";
import { swapGeometry } from "./swapGeometry";

const lineOf = (points: number) => {
  const geometry = new LineGeometry();
  geometry.setPositions(new Float32Array(points * 3));
  return geometry;
};

describe("swapGeometry", () => {
  /**
   * Why the helper exists, pinned against three itself: the WebGPU renderer
   * tells a replaced attribute from the bound one by `id`, and a fat line's
   * interleaved attributes have none — so `setPositions` on a drawn geometry
   * is invisible to it. If three ever gives them an id this fails, and the
   * swap can be reconsidered.
   */
  it("is needed: a re-upload on the same geometry is not detectable by id", () => {
    const geometry = lineOf(3);
    const before = geometry.attributes.instanceStart;
    geometry.setPositions(new Float32Array(30));
    const after = geometry.attributes.instanceStart;

    expect(after).not.toBe(before);
    expect((before as { id?: number }).id).toBeUndefined();
    expect((after as { id?: number }).id).toBeUndefined();
  });

  it("puts the object on the new geometry, which the renderer tracks by id", () => {
    const previous = lineOf(3);
    const next = lineOf(10);
    const line = { geometry: previous };

    swapGeometry(line, next);

    expect(line.geometry).toBe(next);
    expect(next.id).not.toBe(previous.id);
  });

  it("disposes the geometry it replaced, and only that one", () => {
    const previous = lineOf(3);
    const next = lineOf(10);
    const disposedPrevious = vi.fn();
    const disposedNext = vi.fn();
    previous.addEventListener("dispose", disposedPrevious);
    next.addEventListener("dispose", disposedNext);

    swapGeometry({ geometry: previous }, next);

    expect(disposedPrevious).toHaveBeenCalledTimes(1);
    expect(disposedNext).not.toHaveBeenCalled();
  });

  it("leaves a geometry swapped for itself alone", () => {
    const geometry = lineOf(3);
    const disposed = vi.fn();
    geometry.addEventListener("dispose", disposed);

    swapGeometry({ geometry }, geometry);

    expect(disposed).not.toHaveBeenCalled();
  });
});
