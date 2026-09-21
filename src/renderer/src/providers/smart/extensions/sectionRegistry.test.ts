import { describe, expect, it } from "vitest";
import type { SmartContextSection } from "./section";
import { createSmartSectionRegistry, matchesSelector, resolveSections } from "./sectionRegistry";
import type { SmartContextProps } from "./types";

const section = (
  id: SmartContextSection["id"],
  priority: number,
  applies: SmartContextSection["applies"] = () => true,
): SmartContextSection<any> => ({
  id,
  module: id.split(".")[0] as SmartContextSection["module"],
  title: id,
  priority,
  tier: "remote",
  applies,
  useItems: () => ({ items: [], status: "ready" }),
  itemKey: () => "",
  Row: () => null,
});

const one = (): SmartContextProps => ({ objects: [{ identifier: "@mikro/image", object: { id: "1" } }] });
const two = (): SmartContextProps => ({
  objects: [
    { identifier: "@mikro/image", object: { id: "1" } },
    { identifier: "@mikro/image", object: { id: "2" } },
  ],
});

describe("createSmartSectionRegistry", () => {
  it("sorts by priority, then id", () => {
    const registry = createSmartSectionRegistry([
      section("rekuest.b", 10),
      section("kraph.a", 5),
      section("rekuest.a", 10),
    ]);
    expect(registry.sections.map((s) => s.id)).toEqual(["kraph.a", "rekuest.a", "rekuest.b"]);
  });

  it("refuses duplicate ids", () => {
    expect(() =>
      createSmartSectionRegistry([section("rekuest.a", 1), section("rekuest.a", 2)]),
    ).toThrow(/Duplicate/);
  });
});

describe("matchesSelector", () => {
  it("matches a module prefix and an exact id only", () => {
    expect(matchesSelector("kraph.measurements", "kraph")).toBe(true);
    expect(matchesSelector("kraph.measurements", "kraph.measurements")).toBe(true);
    expect(matchesSelector("kraph.measurements", "kraph.relations")).toBe(false);
    expect(matchesSelector("kraphx.a" as never, "kraph")).toBe(false);
  });
});

describe("resolveSections", () => {
  const registry = createSmartSectionRegistry([
    section("local.actions", 0),
    section("rekuest.shortcuts", 20),
    section("kraph.measurements", 30, (props) => !props.partners?.length),
    section("rekuest.actions", 40),
    section("rekuest.batchActions", 42, (props) => props.objects.length >= 2),
  ]);

  it("drops sections whose applies() is false", () => {
    expect(resolveSections(registry, one()).map((s) => s.id)).not.toContain("rekuest.batchActions");
    expect(resolveSections(registry, two()).map((s) => s.id)).toContain("rekuest.batchActions");
  });

  it("exclude by module removes every section of it", () => {
    const ids = resolveSections(registry, { ...one(), sections: { exclude: ["kraph"] } }).map((s) => s.id);
    expect(ids).toEqual(["local.actions", "rekuest.shortcuts", "rekuest.actions"]);
  });

  it("exclude by id removes just that one", () => {
    const ids = resolveSections(registry, { ...one(), sections: { exclude: ["rekuest.shortcuts"] } }).map((s) => s.id);
    expect(ids).toEqual(["local.actions", "kraph.measurements", "rekuest.actions"]);
  });

  it("only keeps registry order and ignores unknown selectors", () => {
    const ids = resolveSections(registry, {
      ...two(),
      sections: { only: ["rekuest.batchActions", "local", "nothing.here" as never] },
    }).map((s) => s.id);
    expect(ids).toEqual(["local.actions", "rekuest.batchActions"]);
  });
});
