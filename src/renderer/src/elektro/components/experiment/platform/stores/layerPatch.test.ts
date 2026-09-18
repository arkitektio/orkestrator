import { describe, expect, it } from "vitest";
import { normalizeAnnotationLayer } from "../model/layerModel";
import { addPatch, foldPatches, overlay, rollbackPatch } from "./layerPatch";

const layer = (id: string, order: number, visible = true) =>
  normalizeAnnotationLayer({
    __typename: "AnnotationLayer",
    id,
    order,
    visible,
    placement: "PLACED",
    asAffine: {},
    annotationCollection: { name: id },
  });

describe("layer patches", () => {
  it("overlays a pending edit and re-sorts by the patched order", () => {
    const server = [layer("a", 0), layer("b", 1)];
    const { patches } = addPatch({}, "a", { order: 5, visible: false });
    const drawn = overlay(server, patches);
    expect(drawn.map((l) => l.id)).toEqual(["b", "a"]);
    expect(drawn[1].visible).toBe(false);
    // The server list is not mutated.
    expect(server[0].visible).toBe(true);
  });

  it("folds away what the refetch agrees with, keeps what it does not yet", () => {
    const { patches } = addPatch({}, "a", { visible: false, order: 3 });
    const refetched = [layer("a", 0, false)];
    expect(foldPatches(patches, refetched)).toEqual({ a: { order: 3 } });
  });

  it("drops patches for layers that are gone", () => {
    const { patches } = addPatch({}, "gone", { visible: false });
    expect(foldPatches(patches, [layer("a", 0)])).toEqual({});
  });

  it("rolls back exactly one failed write, leaving a later edit alone", () => {
    const first = addPatch({}, "a", { visible: false });
    const second = addPatch(first.patches, "a", { order: 4 });
    // The FIRST write failed: visibility returns to unpatched, order stays pending.
    expect(rollbackPatch(second.patches, "a", first.previous)).toEqual({ a: { order: 4 } });
    // A write that replaced a pending value restores that value.
    const third = addPatch(second.patches, "a", { order: 9 });
    expect(rollbackPatch(third.patches, "a", third.previous)).toEqual({ a: { visible: false, order: 4 } });
  });

  it("compares colours by value", () => {
    const base = layer("a", 0);
    const server = [{ ...base, persisted: { ...base.persisted, color: [1, 2, 3, 255] } }];
    expect(foldPatches({ a: { color: [1, 2, 3, 255] } }, server)).toEqual({});
  });
});
