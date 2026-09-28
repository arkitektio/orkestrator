import { describe, expect, it, vi } from "vitest";
import {
  basicMaterialKey,
  basicMaterialRefs,
  peekBasicMaterial,
  releaseBasicMaterial,
  retainBasicMaterial,
} from "./sharedBasicMaterial";

describe("shared basic materials", () => {
  it("shares by value and disposes on the last release", () => {
    const spec = { color: "#123456", opacity: 0.5, wireframe: true };
    const key = basicMaterialKey(spec);
    const a = peekBasicMaterial(spec);
    expect(peekBasicMaterial({ ...spec })).toBe(a);
    expect(peekBasicMaterial({ ...spec, wireframe: false })).not.toBe(a);
    expect(a.wireframe).toBe(true);
    expect(a.transparent).toBe(true);

    const dispose = vi.spyOn(a, "dispose");
    retainBasicMaterial(key, a);
    retainBasicMaterial(key, a);
    releaseBasicMaterial(key, a);
    expect(dispose).not.toHaveBeenCalled();
    expect(basicMaterialRefs(a)).toBe(1);
    releaseBasicMaterial(key, a);
    expect(dispose).toHaveBeenCalledTimes(1);
    // Evicted: the next peek builds a fresh one.
    expect(peekBasicMaterial(spec)).not.toBe(a);
  });

  it("re-registers a material retained again after its last release", () => {
    const spec = { color: "#abcdef", opacity: 1, wireframe: false };
    const key = basicMaterialKey(spec);
    const a = peekBasicMaterial(spec);
    retainBasicMaterial(key, a);
    releaseBasicMaterial(key, a); // unmount…
    retainBasicMaterial(key, a); // …and remount in the same commit
    expect(peekBasicMaterial(spec)).toBe(a);
    releaseBasicMaterial(key, a);
  });
});
