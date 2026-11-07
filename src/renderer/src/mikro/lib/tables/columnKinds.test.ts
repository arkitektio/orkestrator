import { describe, expect, it } from "vitest";
import { isGroupColumn, isNumericColumn, isValueColumn } from "./columnKinds";

describe("column kinds", () => {
  it("reads numbers as the server does, coordinates included", () => {
    expect(isNumericColumn({ dtype: "DOUBLE", role: "COORDINATE" })).toBe(true);
    expect(isNumericColumn({ dtype: "DECIMAL(10,2)" })).toBe(true);
    expect(isNumericColumn({ dtype: "POINT" })).toBe(false);
    expect(isNumericColumn({ dtype: "INTERVAL" })).toBe(false);
  });
  it("groups by what names a group, not what measures one", () => {
    expect(isGroupColumn({ dtype: "VARCHAR", role: "ATTRIBUTE" })).toBe(true);
    expect(isGroupColumn({ dtype: "BIGINT", role: "GROUP_ID" })).toBe(true);
    expect(isGroupColumn({ dtype: "BIGINT", role: "COORDINATE", axisType: "CHANNEL" })).toBe(true);
    expect(isGroupColumn({ dtype: "DOUBLE", role: "ATTRIBUTE" })).toBe(false);
  });
  it("takes a series value from a measurement", () => {
    expect(isValueColumn({ dtype: "DOUBLE", role: "ATTRIBUTE" })).toBe(true);
    expect(isValueColumn({ dtype: "DOUBLE", role: "COORDINATE" })).toBe(false);
  });
});
