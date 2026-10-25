// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { analyzeBsx } from "@/core/blok/bsx/analyze";
import { defaultBlokCatalog } from "../../catalog";

const analyze = (source: string) =>
  analyzeBsx(source, { catalog: defaultBlokCatalog, context: "SCENE", references: { dependencies: [], args: [], localRoots: ["pose"] } });

describe("Transform", () => {
  it("places what it holds in a scene, bound to a local the gizmo writes", () => {
    const { tree, markers } = analyze('<Scene><Transform bind="pose" mode="rotate"><Transform /></Transform></Scene>');
    expect(markers).toEqual([]);
    expect(tree?.children?.[0]?.component).toBe("Transform");
  });

  it("stands only in a scene", () => {
    expect(analyze('<Transform bind="pose" />').markers.length).toBeGreaterThan(0);
  });
});
