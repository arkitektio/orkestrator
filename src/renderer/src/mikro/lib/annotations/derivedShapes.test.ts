import { describe, expect, it } from "vitest";
import { descendantsOf, partitionDerived } from "./derivedShapes";

const shape = (id: string, ...sourceIds: string[]) => ({ id, sourceIds });

describe("partitionDerived", () => {
  it("hides a shape whose source is in the same list, and only that", () => {
    const rough = shape("a");
    const smooth = shape("b", "a");
    const fromElsewhere = shape("c", "other-collection-shape");
    const { roots, derived, childrenOf } = partitionDerived([rough, smooth, fromElsewhere]);

    expect(roots.map((s) => s.id)).toEqual(["a", "c"]);
    expect(derived.map((s) => s.id)).toEqual(["b"]);
    expect(childrenOf.get("a")?.map((s) => s.id)).toEqual(["b"]);
  });

  it("files a merge under every source it was joined from", () => {
    const { childrenOf } = partitionDerived([shape("l"), shape("r"), shape("m", "l", "r")]);
    expect(childrenOf.get("l")?.map((s) => s.id)).toEqual(["m"]);
    expect(childrenOf.get("r")?.map((s) => s.id)).toEqual(["m"]);
  });
});

describe("descendantsOf", () => {
  it("walks the whole chain, nearest first, each once", () => {
    const { childrenOf } = partitionDerived([shape("a"), shape("b", "a"), shape("c", "b"), shape("d", "a", "b")]);
    expect(descendantsOf("a", childrenOf).map((s) => s.id)).toEqual(["b", "d", "c"]);
  });

  it("survives a cycle", () => {
    const { childrenOf } = partitionDerived([shape("a", "b"), shape("b", "a")]);
    expect(descendantsOf("a", childrenOf).map((s) => s.id)).toEqual(["b"]);
  });
});
