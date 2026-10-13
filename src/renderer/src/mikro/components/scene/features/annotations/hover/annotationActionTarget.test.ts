import { describe, expect, it } from "vitest";

import { annotationObject, clickPointOf, probeLensPartner } from "./annotationActionTarget";

const image = { "@mikro/n_space_axes": 2, "@mikro/n_channels": 1 };
const volume = { "@mikro/n_space_axes": 3, "@mikro/n_channels": 2 };
const layers = [
  { id: "layer:hidden", visible: false, lens: { id: "1", descriptors: volume } },
  { id: "layer:image", lens: { id: "2", name: "DAPI", descriptors: image } },
  { id: "layer:volume", lens: { id: "3", descriptors: volume } },
];

describe("annotationActionTarget", () => {
  it("the annotation carries what the server said it provides", () => {
    expect(
      annotationObject({ id: "ann:1", name: "soma" }, { "@mikro/annotation_kind": "RECTANGLE" }),
    ).toEqual({
      identifier: "@mikro/annotation",
      id: "ann:1",
      label: "soma",
      descriptors: { "@mikro/annotation_kind": "RECTANGLE" },
    });
    // Not answered yet, or a structure that declares none: a structural match.
    expect(annotationObject({ id: "ann:2", name: null }, {})).toEqual({
      identifier: "@mikro/annotation",
      id: "ann:2",
    });
  });

  it("pairs with the first visible layer's lens, as an array lens", () => {
    expect(probeLensPartner(null, layers)).toEqual({
      identifier: "@mikro/arraylens",
      id: "2",
      label: "DAPI",
      descriptors: image,
    });
  });

  it("the probe pin wins while its layer is visible", () => {
    expect(probeLensPartner("layer:volume", layers)?.id).toBe("3");
    expect(probeLensPartner("layer:hidden", layers)?.id).toBe("2");
  });

  it("nothing to pair with when no layer answers a probe", () => {
    expect(probeLensPartner(null, [])).toBeNull();
    expect(probeLensPartner(null, [layers[0]])).toBeNull();
  });

  it("a drag that ends on a shape is not a click", () => {
    const point = { x: 1, y: 2, z: 3 };
    expect(clickPointOf({ delta: 0, point })).toEqual([1, 2, 3]);
    expect(clickPointOf({ delta: 40, point })).toBeUndefined();
  });
});
