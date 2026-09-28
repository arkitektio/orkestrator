import { describe, expect, it } from "vitest";
import { remainingUploadQueue } from "./uploadDrain";

describe("remainingUploadQueue (the drain's write-back order)", () => {
  // The next drain's partition reads the queue in this order, so it must be
  // exactly what the old `[...planned.slice(n), ...stale.slice(m)]` rebuild
  // produced: planned remainder first, then stale remainder, each in order.
  it("keeps the planned remainder ahead of the stale remainder", () => {
    const planned = ["p0", "p1", "p2", "p3"];
    const stale = ["s0", "s1", "s2"];
    expect(remainingUploadQueue(planned, 2, stale, 1)).toEqual(["p2", "p3", "s1", "s2"]);
  });

  it("returns everything when nothing drained", () => {
    expect(remainingUploadQueue(["p0", "p1"], 0, ["s0"], 0)).toEqual(["p0", "p1", "s0"]);
  });

  it("returns an empty queue when both passes drained fully", () => {
    expect(remainingUploadQueue(["p0"], 1, ["s0", "s1"], 2)).toEqual([]);
  });

  it("keeps a deferred planned head (defer = not consumed) at the front", () => {
    // A planned brick that found no free slot breaks the planned pass without
    // being counted, so it must still lead the queue next drain — ahead of
    // stale entries the stale pass did not reach.
    expect(remainingUploadQueue(["deferred", "p1"], 0, ["s0", "s1"], 1)).toEqual([
      "deferred",
      "p1",
      "s1",
    ]);
  });

  it("reuses the planned partition array (no second allocation)", () => {
    const planned = ["p0", "p1"];
    const result = remainingUploadQueue(planned, 1, ["s0"], 0);
    expect(result).toBe(planned);
    expect(result).toEqual(["p1", "s0"]);
  });

  it("stays linear on a long backlog", () => {
    const planned = Array.from({ length: 20000 }, (_, i) => i);
    const stale = Array.from({ length: 24 }, (_, i) => -i);
    const result = remainingUploadQueue(planned, 12, stale, 3);
    expect(result.length).toBe(20000 - 12 + 24 - 3);
    expect(result[0]).toBe(12);
    expect(result[result.length - 1]).toBe(-23);
  });
});
