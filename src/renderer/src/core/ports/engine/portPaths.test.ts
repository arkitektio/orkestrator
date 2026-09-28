import { describe, expect, it } from "vitest";
import { dependencyFieldName, resolveDependencyValue, splitDependencyPath } from "./portPaths";

describe("splitDependencyPath", () => {
  it("splits on '..' and '/', flagging absolute paths", () => {
    expect(splitDependencyPath("a")).toEqual({ absolute: false, segments: ["a"] });
    expect(splitDependencyPath("a..b")).toEqual({ absolute: false, segments: ["a", "b"] });
    expect(splitDependencyPath("/a/b")).toEqual({ absolute: true, segments: ["a", "b"] });
  });
});

describe("resolveDependencyValue", () => {
  const root = { top: 1, model: { inner: 2, list: [{ __value: 3 }] } };
  it("reads siblings from the local scope", () => {
    expect(resolveDependencyValue("inner", root.model, root)).toEqual({ found: true, value: 2 });
  });
  it("walks nested paths and arrays", () => {
    expect(resolveDependencyValue("list..0..__value", root.model, root)).toEqual({ found: true, value: 3 });
  });
  it("reads absolute paths from the root", () => {
    expect(resolveDependencyValue("/top", root.model, root)).toEqual({ found: true, value: 1 });
    expect(resolveDependencyValue("top", root.model, root).found).toBe(false);
  });
});

describe("dependencyFieldName", () => {
  it("resolves relative names against the port's parent and absolute against the ports root", () => {
    expect(dependencyFieldName("min", ["args", "max"], ["args"])).toBe("args.min");
    expect(dependencyFieldName("min", ["max"], [])).toBe("min");
    expect(dependencyFieldName("a..b", ["args", "m", "x"], ["args"])).toBe("args.m.a.b");
    expect(dependencyFieldName("/top", ["args", "m", "x"], ["args"])).toBe("args.top");
  });
});
