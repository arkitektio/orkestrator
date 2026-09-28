import { describe, expect, it } from "vitest";
import { formatProbeValue } from "./valueFormat";

describe("formatProbeValue", () => {
  it("renders null and NaN as an em dash", () => {
    expect(formatProbeValue(null, "uint16")).toBe("—");
    expect(formatProbeValue(Number.NaN, "float32")).toBe("—");
  });

  it("renders integer dtypes as plain integers", () => {
    expect(formatProbeValue(4095, "uint16")).toBe("4095");
    expect(formatProbeValue(255, "uint8")).toBe("255");
    expect(formatProbeValue(-7, "int32")).toBe("-7");
    // Repacked atlas values can be float-typed; the dtype wins.
    expect(formatProbeValue(41.9999, "uint16")).toBe("42");
  });

  it("renders floats at 5 significant digits", () => {
    expect(formatProbeValue(0.123456789, "float32")).toBe("0.12346");
    expect(formatProbeValue(1234.5678, "float64")).toBe("1234.6");
    expect(formatProbeValue(0, "float32")).toBe("0");
  });

  it("switches to exponential outside [1e-3, 1e6)", () => {
    expect(formatProbeValue(0.0001234, "float32")).toBe("1.234e-4");
    expect(formatProbeValue(2.5e7, "float32")).toBe("2.500e+7");
    expect(formatProbeValue(-4.2e-6, "float64")).toBe("-4.200e-6");
  });
});
