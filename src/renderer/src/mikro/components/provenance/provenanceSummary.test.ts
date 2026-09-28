import { describe, expect, it } from "vitest";
import { changeShape, summarizeFields } from "./provenanceSummary";

describe("summarizeFields", () => {
  it("is empty when nothing changed", () => {
    expect(summarizeFields([])).toBe("");
  });

  it("names one field plainly", () => {
    expect(summarizeFields(["name"])).toBe("name");
  });

  it("joins two with 'and' rather than a comma", () => {
    expect(summarizeFields(["name", "description"])).toBe("name and description");
  });

  it("truncates past two, since the rows below say the rest", () => {
    expect(summarizeFields(["name", "description", "a", "b"])).toBe(
      "name, description and 2 more",
    );
  });

  it("passes an unmapped field through under its own name", () => {
    expect(summarizeFields(["someNewField"])).toBe("someNewField");
  });
});

describe("changeShape", () => {
  it("calls filling an empty field 'set'", () => {
    expect(changeShape(null, "hello")).toBe("set");
    expect(changeShape("", "hello")).toBe("set");
    expect(changeShape("   ", "hello")).toBe("set");
  });

  it("calls emptying a filled field 'cleared'", () => {
    expect(changeShape("hello", null)).toBe("cleared");
    expect(changeShape("hello", "")).toBe("cleared");
  });

  it("calls a rewrite 'changed'", () => {
    expect(changeShape("before", "after")).toBe("changed");
  });

  it("treats empty-to-empty as a change rather than inventing a fourth case", () => {
    // Nothing meaningful happened, and no phrasing would improve on showing
    // the raw pair — "set" and "cleared" would both be lies.
    expect(changeShape(null, null)).toBe("changed");
  });
});
