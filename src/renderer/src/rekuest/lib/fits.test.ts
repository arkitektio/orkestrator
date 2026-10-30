import { describe, expect, it } from "vitest";
import corpus from "./fits_corpus.json";
import { evaluateEstimate } from "./estimatedRuntime";
import { fitHolds, fitReads, fitsImplementation } from "./fits";

/** The corpus states hardware as an agent reports it. */
const hardware = (raw: Record<string, unknown>) => ({
  cpuCount: raw.cpu_count as number | undefined,
  memoryMib: raw.memory_mib as number | undefined,
  gpus: (raw.gpus as { memory_mib?: number }[] | undefined)?.map((gpu) => ({ memoryMib: gpu.memory_mib })),
});

describe("the shared corpus", () => {
  it.each(corpus.fits)("$formula", (row) => {
    expect(fitHolds(row.call, row.object, hardware(row.hardware))).toBe(row.expected);
  });

  it.each(corpus.estimated_runtime)("$formula", (row) => {
    const seconds = evaluateEstimate(row.call, {
      args: {},
      descriptors: { [row.port]: row.object },
      hardware: hardware(row.hardware),
    });
    if (row.expected === null) expect(seconds).toBeNull();
    else expect(seconds).toBeCloseTo(row.expected);
  });
});

it("names what a formula reads, and the hardware this agent did not report", () => {
  expect(fitReads(corpus.fits[0].call, { memoryMib: 1024 })).toEqual({
    descriptors: ["@mikro/size", "@mikro/dsize"],
    hardware: [{ name: "memory_mib", value: 1024 }],
  });
  expect(fitReads(corpus.fits[0].call, null).hardware).toEqual([{ name: "memory_mib", value: null }]);
});

it("is unknown until the object is described", () => {
  const implementation = { fits: [{ port: "image", callJson: corpus.fits[0].call }], agent: { hardware: { memoryMib: 1024 } } };

  expect(fitsImplementation(implementation, {}).verdict).toBe("unknown");
  expect(fitsImplementation(implementation, { image: { "@mikro/size": 1000, "@mikro/dsize": 2 } }).verdict).toBe("yes");
});
