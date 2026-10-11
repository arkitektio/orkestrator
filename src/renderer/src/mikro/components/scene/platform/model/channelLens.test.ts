import { describe, expect, it } from "vitest";
import type { SceneLayerFragment } from "@/mikro/api/graphql";
import {
  canonicalSlices,
  collectSceneLensFacts,
  lensFamilyKey,
  poolLensOf,
} from "./channelLens";

const DATASET = { id: "dataset-1", axisNames: ["c", "z", "y", "x"], shape: [4, 36, 1024, 1024] };
const slice = (axis: string, start: number, stop: number, step = 1) => ({ axis, start, stop, step });
const lens = (id: string, slices: object[]) => ({ id, slices, dataset: DATASET }) as never as {
  id: string;
  slices: ReturnType<typeof slice>[];
  dataset: typeof DATASET;
};

describe("canonicalSlices", () => {
  it("takes the channel slice out and leaves a real crop in", () => {
    const cropped = lens("l", [slice("c", 2, 3), slice("z", 4, 9)]);
    expect(canonicalSlices(cropped, "c")).toEqual([slice("z", 4, 9)]);
  });

  it("drops a slice that selects a whole axis", () => {
    const padded = lens("l", [slice("z", 0, 36), slice("y", 0, 1024), slice("x", 0, 2000)]);
    expect(canonicalSlices(padded, null)).toEqual([]);
  });

  it("keeps a whole-axis slice that steps", () => {
    const stepped = lens("l", [slice("z", 0, 36, 2)]);
    expect(canonicalSlices(stepped, null)).toEqual([slice("z", 0, 36, 2)]);
  });

  it("orders by the dataset's axes, whichever way the server listed them", () => {
    const shuffled = lens("l", [slice("x", 0, 10), slice("z", 4, 9)]);
    expect(canonicalSlices(shuffled, null).map((s) => s.axis)).toEqual(["z", "x"]);
  });

  it("returns the input array when there is nothing to change", () => {
    const plain = lens("l", [slice("z", 4, 9)]);
    expect(canonicalSlices(plain, "c")).toBe(plain.slices);
    const whole = lens("l", []);
    expect(canonicalSlices(whole, "c")).toBe(whole.slices);
  });
});

describe("poolLensOf", () => {
  it("returns the same lens when it needs no rewriting", () => {
    const whole = lens("l", []);
    expect(poolLensOf(whole, "c")).toBe(whole);
  });

  it("returns the SAME pool lens for the same lens every time", () => {
    // `layerPlanSignature` keys on the lens' identity: a new object per
    // normalization would replan for nothing.
    const channel = lens("l", [slice("c", 1, 2)]);
    const first = poolLensOf(channel, "c");
    expect(first).not.toBe(channel);
    expect(poolLensOf(channel, "c")).toBe(first);
    expect(first.id).toBe("l");
    expect(first.slices).toEqual([]);
  });
});

describe("lensFamilyKey", () => {
  it("is one key for the pool lenses of one dataset's channels", () => {
    const keys = [0, 1, 2].map((index) =>
      lensFamilyKey(poolLensOf(lens(`l${index}`, [slice("c", index, index + 1)]), "c")),
    );
    expect(new Set(keys).size).toBe(1);
  });

  it("tells a crop from the whole, and one dataset from another", () => {
    const whole = lensFamilyKey(lens("a", []));
    expect(lensFamilyKey(lens("b", [slice("z", 4, 9)]))).not.toBe(whole);
    expect(
      lensFamilyKey({ id: "c", slices: [], dataset: { id: "dataset-2" } }),
    ).not.toBe(whole);
  });

  it("is the lens itself for a lens that is not an array lens", () => {
    expect(lensFamilyKey({ id: "table-lens" })).toBe("table-lens");
  });
});

describe("collectSceneLensFacts", () => {
  const sceneLens = (id: string, slices: object[]) => ({
    id,
    slices,
    dataset: { id: "dataset-1", fullLens: { id: "lens-whole" } },
  });
  const layers = [
    { __typename: "IntensityLayer", id: "a", lens: sceneLens("lens-c0", [slice("c", 0, 1)]) },
    {
      __typename: "RgbLayer",
      id: "b",
      lens: sceneLens("lens-whole", []),
      redLens: { id: "lens-c0", slices: [slice("c", 0, 1)] },
      greenLens: { id: "lens-c1", slices: [slice("c", 1, 2)] },
      blueLens: { id: "lens-c2", slices: [slice("c", 2, 3)] },
    },
    {
      __typename: "ImageLayer",
      id: "c",
      lens: sceneLens("lens-whole", []),
      renderGraph: {
        root: {
          children: [
            { lens: "lens-c1" },
            { lens: "lens-c3" },
            { children: [{ lens: "lens-c3" }, { lens: null }] },
          ],
        },
      },
    },
    {
      __typename: "MeshLayer",
      id: "d",
      lens: { id: "mesh-lens" },
      colorBys: [{ lens: "sparse-1" }, { lens: null }],
      filterBys: [{ lens: "sparse-2" }],
    },
    {
      __typename: "LabelLayer",
      id: "e",
      lens: sceneLens("lens-mask", [slice("c", 0, 1)]),
      labelRender: { colorBys: [{ lens: "sparse-1" }], filterBys: [] },
    },
  ] as unknown as SceneLayerFragment[];

  it("knows every lens the payload carries as an object", () => {
    const { known } = collectSceneLensFacts(layers);
    expect(new Set(known.map((selection) => selection.id))).toEqual(
      new Set(["lens-c0", "lens-whole", "lens-c1", "lens-c2", "lens-mask"]),
    );
    expect(known.find((selection) => selection.id === "lens-c2")).toMatchObject({
      kind: "array",
      dataset: "dataset-1",
    });
  });

  it("asks only for the ids it was NOT handed, each once", () => {
    // lens-c1 is named by a graph node but arrived as an rgb plane.
    expect(collectSceneLensFacts(layers).bareIds.sort()).toEqual([
      "lens-c3",
      "sparse-1",
      "sparse-2",
    ]);
  });

  it("asks for nothing in a scene of fixed-shape layers", () => {
    // The common case: intensity, rgb, phasor and label layers carry their
    // lenses as objects, so opening such a scene costs no lookup at all.
    expect(collectSceneLensFacts(layers.slice(0, 2)).bareIds).toEqual([]);
  });
});
