import { describe, expect, it } from "vitest";

import {
  annotationObject,
  clickPointOf,
  cropLensObject,
  layerLensPartner,
  pairLayerId,
} from "./annotationActionTarget";

const image = { "@mikro/n_space_axes": 2, "@mikro/n_channels": 1 };
const volume = { "@mikro/n_space_axes": 3, "@mikro/n_channels": 2 };
const layers = [
  { id: "layer:hidden", visible: false, lens: { id: "1", descriptors: volume } },
  { id: "layer:image", lens: { id: "2", name: "DAPI", descriptors: image } },
  { id: "layer:volume", lens: { id: "3", descriptors: volume } },
];

const dataLensPartner = (dataLayerId: string | null, shown: typeof layers) =>
  layerLensPartner(pairLayerId(null, dataLayerId, shown), shown);

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
    expect(dataLensPartner(null, layers)).toEqual({
      identifier: "@mikro/arraylens",
      id: "2",
      label: "DAPI",
      descriptors: image,
    });
  });

  it("the data layer wins while it is in the scene, hidden or not", () => {
    expect(dataLensPartner("layer:volume", layers)?.id).toBe("3");
    expect(dataLensPartner("layer:hidden", layers)?.id).toBe("1");
    expect(dataLensPartner("layer:gone", layers)?.id).toBe("2");
  });

  it("nothing to pair with when there is no data layer", () => {
    expect(dataLensPartner(null, [])).toBeNull();
    expect(dataLensPartner(null, [layers[0]])).toBeNull();
  });

  it("a picked layer wins over the data layer, hidden or not, while it is in the scene", () => {
    expect(pairLayerId(null, "layer:volume", layers)).toBe("layer:volume");
    expect(pairLayerId("layer:hidden", "layer:volume", layers)).toBe("layer:hidden");
    expect(pairLayerId("layer:gone", null, layers)).toBe("layer:image");
  });

  it("a drag that ends on a shape is not a click", () => {
    const point = { x: 1, y: 2, z: 3 };
    expect(clickPointOf({ delta: 0, point })).toEqual([1, 2, 3]);
    expect(clickPointOf({ delta: 40, point })).toBeUndefined();
  });

  it("names a crop not made yet by its lens and shape, never by a lens id, with what it would provide", () => {
    const crop = cropLensObject({ id: "ann:1", name: "soma" }, { id: "2", label: "DAPI" }, { "@mikro/spec": ["IMAGE"] });
    expect(crop).toEqual({
      identifier: "@mikro/arraylens",
      id: "cut:2:ann:1",
      label: "soma on DAPI",
      descriptors: { "@mikro/spec": ["IMAGE"] },
    });
    expect(cropLensObject({ id: "ann:1", name: null }, { id: "2" }, {}).label).toBe("Shape on this image");
    expect(cropLensObject({ id: "ann:1", name: null }, { id: "2" }, {}).descriptors).toBeUndefined();
  });
});
