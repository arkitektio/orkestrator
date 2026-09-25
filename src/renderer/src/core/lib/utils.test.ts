import { describe, expect, it } from "vitest";

import { cn, enumToOptions, notEmpty } from "./utils";

describe("cn", () => {
  it("joins truthy class values", () => {
    expect(cn("a", "b")).toBe("a b");
  });

  it("drops falsy values", () => {
    expect(cn("a", false, null, undefined, "b")).toBe("a b");
  });

  it("merges conflicting tailwind classes, last wins", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
  });
});

describe("notEmpty", () => {
  it("is false for null and undefined", () => {
    expect(notEmpty(null)).toBe(false);
    expect(notEmpty(undefined)).toBe(false);
  });

  it("is true for falsy-but-present values", () => {
    expect(notEmpty(0)).toBe(true);
    expect(notEmpty("")).toBe(true);
    expect(notEmpty(false)).toBe(true);
  });

  it("narrows the type so the array contains no nullish values", () => {
    const mixed: (string | null | undefined)[] = ["a", null, "b", undefined];
    const filtered = mixed.filter(notEmpty);
    expect(filtered).toEqual(["a", "b"]);
  });
});

describe("enumToOptions", () => {
  it("maps each enum entry to a { label, value } option", () => {
    enum Color {
      Red = "RED",
      Blue = "BLUE",
    }
    expect(enumToOptions(Color)).toEqual([
      { label: "Red", value: "RED" },
      { label: "Blue", value: "BLUE" },
    ]);
  });
});
