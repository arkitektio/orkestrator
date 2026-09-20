// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { selectorLabel } from "./FlavourCard";

describe("selectorLabel", () => {
  it("names the accelerator a selector asks for", () => {
    expect(selectorLabel({ __typename: "CudaSelector" })).toBe("CUDA");
    // Was rendered as "Cpu" before: a ROCm host is not a CPU host.
    expect(selectorLabel({ __typename: "RocmSelector" })).toBe("ROCm");
    expect(selectorLabel({ __typename: "CPUSelector" })).toBe("CPU");
  });
  it("falls back to the selector's own name", () => {
    expect(selectorLabel({ __typename: "RAMSelector" })).toBe("RAM");
    expect(selectorLabel({})).toBe("Unknown");
  });
});
