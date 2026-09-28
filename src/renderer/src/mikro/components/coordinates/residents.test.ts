import { describe, expect, it } from "vitest";
import { isReferenceFrame, residentLabel, residentName } from "./residents";

/**
 * `residents` is the whole vocabulary a coordinate system has left — these
 * tests pin the two things every surface reads off it: is this a pure reference
 * frame, and what do I call what lives here.
 */

describe("isReferenceFrame", () => {
  it("is true only when nothing lives in the space", () => {
    expect(isReferenceFrame({ residents: [] })).toBe(true);
    expect(isReferenceFrame({ residents: [{ __typename: "ArrayDataset" }] })).toBe(
      false,
    );
  });
});

describe("residentName", () => {
  it("names a dataset, table or annotation collection by its own name", () => {
    expect(residentName({ __typename: "ArrayDataset", name: "stack" })).toBe(
      "stack",
    );
    expect(
      residentName({ __typename: "AnnotationCollection", name: "cells" }),
    ).toBe("cells");
  });

  it("borrows a lens' dataset name, since a lens has none of its own", () => {
    expect(
      residentName({ __typename: "Lens", dataset: { name: "stack" } }),
    ).toBe("a lens of stack");
  });

  it("names a pyramid level by its level — it has nothing else", () => {
    expect(residentName({ __typename: "DataArray", level: 2 })).toBe(
      "pyramid level 2",
    );
    // Level 0 is falsy and must not fall through to "?".
    expect(residentName({ __typename: "DataArray", level: 0 })).toBe(
      "pyramid level 0",
    );
  });

  it("names a mesh collection by its version", () => {
    expect(residentName({ __typename: "MeshCollection", version: "v3" })).toBe(
      "mesh collection v3",
    );
  });

  it("falls back to the typename when the member carries no label", () => {
    expect(residentName({ __typename: "TableDataset" })).toBe("TableDataset");
  });
});

describe("residentLabel", () => {
  it("calls an uninhabited space a reference frame", () => {
    expect(residentLabel({ residents: [] })).toBe("reference frame");
  });

  it("names the single resident — that is the space's whole story", () => {
    expect(
      residentLabel({ residents: [{ __typename: "ArrayDataset", name: "stack" }] }),
    ).toBe("stack");
  });

  it("counts instead of listing once several share the space", () => {
    expect(
      residentLabel({
        residents: [
          { __typename: "ArrayDataset", name: "tile-1" },
          { __typename: "ArrayDataset", name: "tile-2" },
          { __typename: "ArrayDataset", name: "tile-3" },
        ],
      }),
    ).toBe("3 residents");
  });
});

