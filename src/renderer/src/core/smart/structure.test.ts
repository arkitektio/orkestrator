import { describe, expect, it } from "vitest";

import { descriptorsOf, fromLegacy, sameStructure, stableJson, structure, structureKey, toWire, uniqueStructures } from "./structure";

describe("sameStructure", () => {
  it("compares by identifier and id, never by reference or hints", () => {
    const a = { identifier: "@mikro/image", id: "1", label: "cells" };
    const b = { identifier: "@mikro/image", id: "1", descriptors: { axes: ["z"] } };
    expect(sameStructure(a, b)).toBe(true);
    expect(sameStructure(a, { identifier: "@mikro/image", id: "2" })).toBe(false);
    expect(sameStructure(a, { identifier: "@mikro/file", id: "1" })).toBe(false);
    expect(sameStructure(a, undefined)).toBe(false);
  });
});

describe("structure", () => {
  it("stringifies numeric ids and drops empty hints", () => {
    expect(structure("@lok/user", 5, { label: null })).toEqual({ identifier: "@lok/user", id: "5" });
    expect(structure("@lok/user", "5", { label: "ada" })).toEqual({
      identifier: "@lok/user",
      id: "5",
      label: "ada",
    });
  });
});

describe("toWire", () => {
  it("is the rekuest argument form, id only", () => {
    expect(toWire({ identifier: "@mikro/image", id: "7", label: "x" } as never)).toEqual({
      __identifier: "@mikro/image",
      object: "7",
    });
  });
});

describe("fromLegacy", () => {
  it("reads the current shape", () => {
    expect(fromLegacy({ identifier: "@x/y", id: "1", label: "l" })).toEqual({ identifier: "@x/y", id: "1", label: "l" });
  });

  it("reads the pre-v1 object bag, keeping the name as the label", () => {
    expect(fromLegacy({ identifier: "@x/y", object: { id: 3, name: "n", other: 1 } })).toEqual({
      identifier: "@x/y",
      id: "3",
      label: "n",
    });
  });

  it("reads a wire-ish string object", () => {
    expect(fromLegacy({ identifier: "@x/y", object: "4" })).toEqual({ identifier: "@x/y", id: "4" });
  });

  it("rejects what is not a structure", () => {
    expect(fromLegacy(null)).toBeNull();
    expect(fromLegacy({ id: "1" })).toBeNull();
    expect(fromLegacy({ identifier: "@x/y" })).toBeNull();
    expect(fromLegacy({ identifier: "@x/y", object: {} })).toBeNull();
  });
});

describe("keys and dedupe", () => {
  it("dedupes by value, keeping the first", () => {
    const items = [
      { identifier: "@x/y", id: "1", label: "first" },
      { identifier: "@x/y", id: "1", label: "second" },
      { identifier: "@x/y", id: "2" },
    ];
    expect(uniqueStructures(items).map((item) => item.label ?? item.id)).toEqual(["first", "2"]);
    expect(structureKey(items[2])).toBe("@x/y:2");
  });
});

describe("descriptors a service states about an object", () => {
  it("are carried by the structure when the fragment selected them", () => {
    const descriptors = descriptorsOf({ "@mikro/n_channels": 3, "@mikro/n_space_axes": 2 });
    expect(structure("@mikro/arraydataset", 7, { descriptors }).descriptors).toEqual({
      "@mikro/n_channels": 3,
      "@mikro/n_space_axes": 2,
    });
  });

  it("are absent when nothing was selected, or the structure declares none", () => {
    expect(descriptorsOf(undefined)).toBeUndefined();
    expect(descriptorsOf({})).toBeUndefined();
    expect(descriptorsOf(["@mikro/n_channels"])).toBeUndefined();
    expect(structure("@mikro/folder", 1, { descriptors: descriptorsOf({}) })).not.toHaveProperty("descriptors");
  });

  it("serialise equally whatever order the service sent the keys in", () => {
    expect(stableJson({ a: 1, b: 2 })).toBe(stableJson({ b: 2, a: 1 }));
  });
});
