import { describe, expect, it } from "vitest";
import { formatUnit, withUnit } from "./units";

describe("formatUnit", () => {
  it.each([
    // pint's long form
    ["micrometer", "µm"],
    ["micrometer ** 2", "µm²"],
    ["micrometer ** 3", "µm³"],
    ["meter / second ** 2", "m/s²"],
    ["kilogram * meter / second ** 2", "kg·m/s²"],
    ["second ** -1", "s⁻¹"],
    ["1 / second", "1/s"],
    ["millivolt", "mV"],
    ["Volt", "V"],
    ["nanosiemens", "nS"],
    ["micrometers", "µm"],
    ["seconds", "s"],
    ["degree_Celsius", "°C"],
    ["percent", "%"],
    ["angstrom", "Å"],
    // symbols, kept, and compact or caret powers
    ["mV", "mV"],
    ["S/cm2", "S/cm²"],
    ["um^2", "µm²"],
    ["um", "µm"],
    ["uM", "µM"],
    ["µm2", "µm²"],
    ["kHz", "kHz"],
    ["s-1", "s⁻¹"],
    ["m^1", "m"],
  ])("%s → %s", (raw, shown) => {
    expect(formatUnit(raw)).toBe(shown);
  });

  it("shows no unit as nothing", () => {
    for (const none of [null, undefined, "", " ", "dimensionless", "1"]) expect(formatUnit(none)).toBeNull();
  });

  it("passes what it does not know through as it is", () => {
    expect(formatUnit("count")).toBe("count");
    expect(formatUnit("a.u.")).toBe("a.u.");
    expect(formatUnit("cells / well")).toBe("cells/well");
  });
});

describe("withUnit", () => {
  it("writes a label with its unit one way", () => {
    expect(withUnit("area", "micrometer ** 2")).toBe("area (µm²)");
    expect(withUnit("cluster_id", null)).toBe("cluster_id");
    expect(withUnit("ratio", "dimensionless")).toBe("ratio");
    expect(withUnit(null, "second")).toBe("s");
  });
});
