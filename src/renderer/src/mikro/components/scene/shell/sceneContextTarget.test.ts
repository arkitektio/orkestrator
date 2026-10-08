import { describe, expect, it } from "vitest";

import { annotationStructure, meshCollectionStructure, sceneContextTarget } from "./sceneContextTarget";

const layers = [
  { id: "layer:mesh", __typename: "MeshLayer", collection: { id: "42" } },
  { id: "layer:empty-mesh", __typename: "MeshLayer", collection: null },
  { id: "layer:network", __typename: "NetworkLayer", collection: { id: "7" } },
  { id: "layer:annotations", __typename: "AnnotationLayer" },
];

describe("sceneContextTarget", () => {
  it("opens the hovered annotation, named when it has a name", () => {
    expect(annotationStructure({ id: "ann:1", name: "axon" })).toEqual({
      identifier: "@mikro/annotation",
      id: "ann:1",
      label: "axon",
    });
    expect(annotationStructure({ id: "ann:2", name: null })).toEqual({
      identifier: "@mikro/annotation",
      id: "ann:2",
    });
  });

  it("the annotation under the pointer wins over a mesh behind it", () => {
    expect(
      sceneContextTarget({ hoveredRoi: { id: "ann:1", name: undefined }, pickedLayerId: "layer:mesh", layers }),
    ).toEqual({ identifier: "@mikro/annotation", id: "ann:1" });
  });

  it("a picked mesh layer opens its collection", () => {
    expect(sceneContextTarget({ hoveredRoi: null, pickedLayerId: "layer:mesh", layers })).toEqual({
      identifier: "@mikro/meshcollection",
      id: "42",
    });
  });

  it("nothing opens for empty space, a mesh layer without a collection, or another kind of layer", () => {
    expect(sceneContextTarget({ hoveredRoi: null, pickedLayerId: null, layers })).toBeNull();
    expect(meshCollectionStructure("layer:empty-mesh", layers)).toBeNull();
    expect(meshCollectionStructure("layer:network", layers)).toBeNull();
    expect(meshCollectionStructure("layer:annotations", layers)).toBeNull();
    expect(meshCollectionStructure("layer:gone", layers)).toBeNull();
  });
});
