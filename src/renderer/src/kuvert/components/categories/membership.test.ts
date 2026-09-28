import { describe, expect, it } from "vitest";
import { categorizeDelta, membership } from "./membership";

const mail = (...ids: string[]) => ({ categories: ids.map((id) => ({ id })) });

describe("membership", () => {
  it("tells all, some and none apart", () => {
    const shown = [mail("a", "b"), mail("a")];
    expect(membership(shown, "a")).toBe("all");
    expect(membership(shown, "b")).toBe("some");
    expect(membership(shown, "c")).toBe("none");
  });
});

describe("categorizeDelta", () => {
  it("sends only what changed", () => {
    const shown = [mail("a", "b"), mail("a")];
    expect(categorizeDelta(shown, { a: "all", b: "all", c: "none" })).toEqual({ add: ["b"], remove: [] });
    expect(categorizeDelta(shown, { a: "none", b: "some", c: "all" })).toEqual({ add: ["c"], remove: ["a"] });
  });
});
