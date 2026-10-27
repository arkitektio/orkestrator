// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { analyzeBsx } from "@/core/blok/bsx/analyze";
import { emptyBlokScope } from "@/core/blok/bsx/references";

const analyze = (source: string) =>
  analyzeBsx(source, {
    scope: { ...emptyBlokScope("agent", "SCENE"), locals: [{ key: "pose", default: null, persist: true }] },
  });

describe("Transform", () => {
  it("places what it holds in a scene, bound to a local the gizmo writes", () => {
    const { tree, markers } = analyze('<Scene><Transform bind={pose} mode="rotate"><Transform /></Transform></Scene>');
    expect(markers).toEqual([]);
    expect(tree?.children?.[0]?.component).toBe("Transform");
  });

  it("keeps its own pose by id when it persists", () => {
    const { markers } = analyze('<Scene><Transform id="arm-pose" persist /></Scene>');
    expect(markers.filter((marker) => marker.severity === "error")).toEqual([]);
  });

  it("stands only in a scene", () => {
    expect(analyzeBsx('<Html><Transform bind={pose} /></Html>', { scope: { ...emptyBlokScope("agent", "HTML"), locals: [{ key: "pose" }] } }).markers.length).toBeGreaterThan(0);
  });
});
