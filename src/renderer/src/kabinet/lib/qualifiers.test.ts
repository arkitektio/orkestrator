import { describe, expect, it } from "vitest";
import { qualifierRows } from "./qualifiers";

describe("qualifierRows", () => {
  it("reads a list of key/value pairs", () => {
    expect(qualifierRows([{ key: "gpu", value: "A100" }])).toEqual([["gpu", "A100"]]);
  });

  it("reads a plain object", () => {
    expect(qualifierRows({ gpu: "A100", cores: 8 })).toEqual([
      ["gpu", "A100"],
      ["cores", "8"],
    ]);
  });

  it("reads nothing from nothing", () => {
    expect(qualifierRows(null)).toEqual([]);
    expect(qualifierRows("gpu")).toEqual([]);
  });
});
