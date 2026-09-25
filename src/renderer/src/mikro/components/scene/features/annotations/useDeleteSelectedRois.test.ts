// @vitest-environment jsdom
// (the hook module pulls the generated Apollo layer, which touches `window`)
import { describe, expect, it } from "vitest";

import { selectionLayerIds } from "./useDeleteSelectedRois";

describe("selectionLayerIds", () => {
  it("names each layer once — the multi-collection delete guard's input", () => {
    expect(selectionLayerIds([])).toEqual([]);
    expect(selectionLayerIds([{ layerId: "a" }, { layerId: "a" }])).toEqual(["a"]);
    expect(selectionLayerIds([{ layerId: "a" }, { layerId: "b" }, { layerId: "a" }])).toEqual(["a", "b"]);
  });
});
