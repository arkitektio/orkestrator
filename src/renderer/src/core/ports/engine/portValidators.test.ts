import { describe, expect, it, vi } from "vitest";

vi.mock("sonner", () => ({
  toast: { info: vi.fn(), warning: vi.fn(), error: vi.fn(), success: vi.fn() },
}));

import { runPortValidators } from "./portValidators";

const gtMin = {
  call: {
    operation: "compare.gt",
    arguments: [
      { key: "a", value_path: "value" },
      { key: "b", value_path: "min" },
    ],
  },
  dependencies: ["min"],
  errorMessage: "must exceed min",
};

describe("runPortValidators", () => {
  it("returns nothing for a valid value", () => {
    expect(runPortValidators([gtMin], 5, { min: 1 })).toEqual([]);
  });

  it("returns the validator's message for an invalid value", () => {
    expect(runPortValidators([gtMin], 0, { min: 1 })).toEqual(["must exceed min"]);
  });

  it("falls back to the label, then a generic message", () => {
    const withLabel = { ...gtMin, errorMessage: null, label: "Greater than min" };
    expect(runPortValidators([withLabel], 0, { min: 1 })).toEqual(["Greater than min"]);
    const bare = { ...gtMin, errorMessage: null, label: null };
    expect(runPortValidators([bare], 0, { min: 1 })).toEqual(["Validation failed"]);
  });

  it("skips a validator whose dependencies are not all set", () => {
    expect(runPortValidators([gtMin], 0, {})).toEqual([]);
  });

  it("surfaces an evaluation error instead of passing silently", () => {
    const broken = { ...gtMin, call: { operation: "nope.missing", arguments: [] } };
    const messages = runPortValidators([broken], 0, { min: 1 });
    expect(messages).toHaveLength(1);
    expect(messages[0]).toMatch(/not found/);
  });

  it("handles missing or empty validator lists", () => {
    expect(runPortValidators(null, 1, {})).toEqual([]);
    expect(runPortValidators([], 1, {})).toEqual([]);
  });
});
