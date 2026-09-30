import { describe, expect, it } from "vitest";
import { DescriptorOperator } from "@/rekuest/api/graphql";
import {
  describeCondition,
  fromWireConditions,
  toWireCondition,
  toWireConditions,
} from "./triggerConditions";

describe("toWireCondition", () => {
  it("types scalar values", () => {
    expect(toWireCondition({ key: "c", operator: DescriptorOperator.Equals, value: "3" })).toEqual({
      ok: true,
      condition: { key: "c", operator: "EQUALS", value: 3 },
    });
    expect(
      toWireCondition({ key: "name", operator: DescriptorOperator.Equals, value: "raw" }),
    ).toEqual({ ok: true, condition: { key: "name", operator: "EQUALS", value: "raw" } });
    expect(
      toWireCondition({ key: "live", operator: DescriptorOperator.Equals, value: "true" }),
    ).toEqual({ ok: true, condition: { key: "live", operator: "EQUALS", value: true } });
  });

  it("splits IN lists and drops the value for EXISTS", () => {
    expect(
      toWireCondition({ key: "axes", operator: DescriptorOperator.In, value: "x, y , 3" }),
    ).toEqual({ ok: true, condition: { key: "axes", operator: "IN", value: ["x", "y", 3] } });
    expect(
      toWireCondition({ key: "t", operator: DescriptorOperator.Exists, value: "ignored" }),
    ).toEqual({ ok: true, condition: { key: "t", operator: "EXISTS" } });
  });

  it("refuses bad rows", () => {
    expect(toWireCondition({ key: " ", operator: DescriptorOperator.Equals, value: "1" }).ok).toBe(false);
    expect(toWireCondition({ key: "n", operator: DescriptorOperator.Gte, value: "many" }).ok).toBe(false);
    expect(toWireCondition({ key: "n", operator: DescriptorOperator.In, value: " , " }).ok).toBe(false);
    expect(
      toWireConditions([
        { key: "a", operator: DescriptorOperator.Exists, value: "" },
        { key: "", operator: DescriptorOperator.Exists, value: "" },
      ]).ok,
    ).toBe(false);
  });
});

describe("fromWireConditions", () => {
  it("round-trips what the editor sends", () => {
    const drafts = [
      { key: "axes", operator: DescriptorOperator.In, value: "x, y" },
      { key: "channels", operator: DescriptorOperator.Gte, value: "3" },
      { key: "done", operator: DescriptorOperator.Exists, value: "" },
    ];
    const wire = toWireConditions(drafts);
    if (!wire.ok) throw new Error(wire.error);
    expect(fromWireConditions(wire.conditions)).toEqual(drafts);
  });

  it("drops what it cannot read", () => {
    expect(fromWireConditions(null)).toEqual([]);
    expect(fromWireConditions([{ key: "a", operator: "NOPE" }, 3, { operator: "EQUALS" }])).toEqual([]);
  });
});

describe("describeCondition", () => {
  it("says it in words", () => {
    expect(describeCondition({ key: "channels", operator: DescriptorOperator.Gte, value: 3 })).toBe(
      "channels ≥ 3",
    );
    expect(describeCondition({ key: "axes", operator: DescriptorOperator.In, value: ["x", "y"] })).toBe(
      "axes is one of x, y",
    );
  });
});
