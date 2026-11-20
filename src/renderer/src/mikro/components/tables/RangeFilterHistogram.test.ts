import { describe, expect, it } from "vitest";
import { binsToRange } from "./RangeFilterHistogram";

describe("binsToRange", () => {
  const domain = { min: 0, max: 100 };

  it("spans the bins dragged across, in either direction", () => {
    expect(binsToRange(2, 4, domain, 10)).toEqual({ min: 20, max: 50 });
    expect(binsToRange(4, 2, domain, 10)).toEqual({ min: 20, max: 50 });
  });

  it("ends at the domain's max exactly on the last bin, and clamps", () => {
    expect(binsToRange(9, 12, domain, 10)).toEqual({ min: 90, max: 100 });
    expect(binsToRange(-3, 0, domain, 10)).toEqual({ min: 0, max: 10 });
  });
});
