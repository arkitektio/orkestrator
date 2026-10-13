import { describe, expect, it } from "vitest";

import { dependencyVariable } from "./useWidgetDependencies";

describe("a dependency's value as a query variable", () => {
  it("is the id of a structure, which is how its service knows it", () => {
    expect(dependencyVariable({ __identifier: "@mikro/annotation", object: "a1" })).toBe("a1");
  });

  it("is the ids of a list of structures", () => {
    expect(
      dependencyVariable([
        { __identifier: "@mikro/annotation", object: "a1" },
        { __identifier: "@mikro/annotation", object: "a2" },
      ]),
    ).toEqual(["a1", "a2"]);
  });

  it("is anything else as it is", () => {
    expect(dependencyVariable(3)).toBe(3);
    expect(dependencyVariable("z")).toBe("z");
    expect(dependencyVariable({ min: 1 })).toEqual({ min: 1 });
    expect(dependencyVariable(undefined)).toBeUndefined();
  });
});
