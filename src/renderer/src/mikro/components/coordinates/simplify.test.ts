import { describe, expect, it } from "vitest";
import { partitionSystems, transformationKey } from "./simplify";

const axes = [
  { name: "x", unit: "µm", order: 0 },
  { name: "y", unit: "µm", order: 1 },
];
const system = (id: string, residents: string[] = []) => ({
  id,
  axes,
  residents: residents.map((__typename) => ({ __typename })),
});
const scale = (id: string, input: string, output: string, value = 0.1) => ({
  __typename: "ScaleTransformation",
  id,
  name: id,
  scale: [value, value],
  validity: "VALID",
  input: { id: input },
  output: { id: output },
});

describe("transformationKey", () => {
  it("ignores id, name and endpoints but not the numbers", () => {
    expect(transformationKey(scale("a", "1", "2"))).toBe(
      transformationKey(scale("b", "3", "4")),
    );
    expect(transformationKey(scale("a", "1", "2"))).not.toBe(
      transformationKey(scale("a", "1", "2", 0.2)),
    );
  });
});

describe("partitionSystems", () => {
  it("folds tiles registered the same way into one stage", () => {
    const graph = {
      root: { id: "stage" },
      systems: [
        system("stage"),
        system("a", ["ArrayDataset"]),
        system("b", ["ArrayDataset"]),
        system("c", ["ArrayDataset"]),
      ],
      transformations: [
        scale("ta", "a", "stage"),
        scale("tb", "b", "stage"),
        scale("tc", "c", "stage", 0.2),
      ],
    };
    const classes = partitionSystems(graph);
    expect(classes.get("a")).toBe(classes.get("b"));
    expect(classes.get("a")).not.toBe(classes.get("c"));
    expect(classes.get("stage")).not.toBe(classes.get("a"));
  });

  it("splits systems whose neighbours differ further out", () => {
    // a → m1 → s and b → m2 → t: a and b look alike until m1 and m2 split.
    const graph = {
      root: { id: "r" },
      systems: [
        system("r"),
        system("s"),
        system("t", ["ArrayDataset"]),
        system("m1"),
        system("m2"),
        system("a"),
        system("b"),
      ],
      transformations: [
        scale("1", "a", "m1"),
        scale("2", "b", "m2"),
        scale("3", "m1", "s"),
        scale("4", "m2", "t"),
      ],
    };
    const classes = partitionSystems(graph);
    expect(classes.get("m1")).not.toBe(classes.get("m2"));
    expect(classes.get("a")).not.toBe(classes.get("b"));
  });

  it("never folds the root into its look-alikes", () => {
    const graph = {
      root: { id: "a" },
      systems: [system("a"), system("b")],
      transformations: [],
    };
    const classes = partitionSystems(graph);
    expect(classes.get("a")).not.toBe(classes.get("b"));
  });
});
