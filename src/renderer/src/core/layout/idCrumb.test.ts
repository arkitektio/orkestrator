import { describe, expect, it } from "vitest";
import { detailPatterns, matchIdCrumb, pathWithId } from "./idCrumb";

const manifests = [
  {
    namespace: "mikro",
    models: [
      { identifier: "@mikro/folder", name: "Folder", datum: true, path: "folders/:id" },
      { identifier: "@mikro/arraylens", name: "Array Lens", datum: false, path: "lenses/:id" },
      { identifier: "@mikro/tablelens", name: "Table Lens", datum: false, path: "lenses/:id" },
    ],
  },
  {
    namespace: "kraph",
    models: [
      { identifier: "@kraph/node", name: "Node", datum: false, path: "nodes/:id", scopedPath: "graphs/:scope/nodes/:id" },
    ],
  },
];

describe("idCrumb", () => {
  const patterns = detailPatterns(manifests);

  it("lists every detail route once, scoped ones included", () => {
    expect(patterns).toEqual(["/mikro/folders/:id", "/mikro/lenses/:id", "/kraph/nodes/:id", "/kraph/graphs/:scope/nodes/:id"]);
  });

  it("finds the id of a detail page", () => {
    expect(matchIdCrumb("/mikro/folders/42", patterns)?.id).toBe("42");
  });

  it("is no id crumb on a list page or an unknown route", () => {
    expect(matchIdCrumb("/mikro/folders", patterns)).toBeNull();
    expect(matchIdCrumb("/mikro/folders/42/files", patterns)).toBeNull();
    expect(matchIdCrumb("/elektro/x/1", patterns)).toBeNull();
  });

  it("swaps only the id, keeping the scope", () => {
    const match = matchIdCrumb("/kraph/graphs/5/nodes/7", patterns)!;
    expect(pathWithId(match, "9")).toBe("/kraph/graphs/5/nodes/9");
    expect(pathWithId(matchIdCrumb("/mikro/folders/42", patterns)!, "43")).toBe("/mikro/folders/43");
  });
});
