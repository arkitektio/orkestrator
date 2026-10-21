// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";

// The export runs in plain node, where the scene (three.js, WebGPU) cannot load:
// the definitions may read nothing of it, only their lazy renders may.
vi.mock("@/mikro/bloks/MikroSceneParts", () => {
  throw new Error("the catalog export loaded the scene");
});

import { buildCatalogExport } from "./catalogExport";

describe("the app's catalog export", () => {
  it("publishes mikro's scene parts, each placed inside a MikroScene", () => {
    const { catalog } = buildCatalogExport();
    const byName = new Map(catalog.components.map((component) => [component.name, component]));
    expect(byName.get("MikroScene")?.acceptsChildren).toBe(true);
    for (const name of ["MikroSceneViewport", "MikroSceneLayers", "MikroSceneAnnotations", "MikroSceneProbe"]) {
      expect(byName.get(name)?.downstreamOf).toEqual(["MikroScene"]);
    }
    expect(byName.get("MikroScene")?.props.map((prop) => prop.key)).toEqual(
      expect.arrayContaining(["value", "bind", "onAnnotation", "onSelect", "onPick", "onLayersChange"]),
    );
  });
});
