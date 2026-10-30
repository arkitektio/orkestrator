import { describe, expect, it } from "vitest";
import { estimateDescriptorPorts, evaluateEstimate, formatEstimate } from "./estimatedRuntime";

const path = (key: string, value_path: string) => ({ key, value_path });

// args.image["@mikro/size"] / agent.cpu_count
const formula = {
  operation: "math.div",
  arguments: [path("a", "args/image/@mikro~1size"), path("b", "agent/cpu_count")],
};

const scope = {
  args: { image: { __identifier: "@mikro/arraylens", object: "1" } },
  descriptors: { image: { "@mikro/size": 800 } },
  hardware: { cpuCount: 8 },
};

describe("a runtime formula", () => {
  it("reads descriptors through an escaped key, and the agent's hardware", () => {
    expect(evaluateEstimate(formula, scope)).toBe(100);
  });

  it("is unknown, not wrong, while any of it is", () => {
    expect(evaluateEstimate(formula, { ...scope, descriptors: {} })).toBeNull();
    expect(evaluateEstimate(formula, { ...scope, hardware: null })).toBeNull();
  });

  it("asks only for what it reads", () => {
    expect(estimateDescriptorPorts(formula)).toEqual(["image"]);
  });

  it("shows one value, or a range", () => {
    expect(formatEstimate([])).toBeNull();
    expect(formatEstimate([120])).toBe("~2 min");
    expect(formatEstimate([30, 7200])).toBe("~30 s – 2.0 h");
  });
});
