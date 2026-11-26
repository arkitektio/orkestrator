// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { SmartDefinitionsDocument } from "@/kabinet/api/graphql";
import { buildDemands } from "@/rekuest/smart/demands";
import { definitionsVariables } from "./queries";
import { newestRelease } from "./definitions";
import { KABINET_DEFINITIONS_SECTION } from "./sections";

const image = (id: string, descriptors?: Record<string, string>) => ({
  identifier: "@mikro/image",
  id,
  ...(descriptors ? { descriptors } : {}),
});

const definitionQueries = (target: Parameters<NonNullable<typeof KABINET_DEFINITIONS_SECTION.prefetch>>[0]) =>
  (KABINET_DEFINITIONS_SECTION.prefetch?.(target) ?? []).filter((query) => query.service === "kabinet");

describe("kabinet's install prefetch", () => {
  it("warms the definitions the section opens with, descriptors included", () => {
    const target = { objects: [image("1", { axes: "c" })] };
    const variables = definitionsVariables(buildDemands(target).single);
    expect(definitionQueries(target)).toEqual([
      { service: "kabinet", name: "definitions", query: SmartDefinitionsDocument, variables },
    ]);
    expect(JSON.stringify(variables)).toContain('"descriptors":[{"key":"axes","value":"c"}]');
    expect(variables.filters?.alreadyDeployed).toBe(false);
  });

  it("also asks for definitions taking one item when several are selected", () => {
    const target = { objects: [image("1"), image("2")] };
    const demands = buildDemands(target);
    expect(definitionQueries(target).map((query) => query.variables)).toEqual([
      definitionsVariables(demands.single),
      definitionsVariables(demands.batch),
    ]);
  });
});

describe("the definitions asked for, as Run asks for actions", () => {
  it("ORs the page's related contexts in, one limit per set", () => {
    const selection = buildDemands({ objects: [image("1")] }).single;
    const related = buildDemands({ objects: [{ identifier: "@mikro/arraydataset", id: "2" }] }).single;
    const variables = definitionsVariables(selection, { alsoDemands: [related] });
    expect(variables.filters?.demands).toBeUndefined();
    expect(variables.filters?.anyDemands).toEqual([selection, related]);
    expect(variables.pagination?.limit).toBe(24);
  });

  it("asks the selection alone without related contexts", () => {
    const selection = buildDemands({ objects: [image("1")] }).single;
    const variables = definitionsVariables(selection, { alsoDemands: [] });
    expect(variables.filters?.demands).toEqual(selection);
    expect(variables.filters?.anyDemands).toBeUndefined();
  });

  it("narrows to the menu's collection by name", () => {
    const variables = definitionsVariables([], { collection: "Analysis" });
    expect(variables.filters?.inCollection).toBe("Analysis");
  });
});

describe("the release a definition installs from", () => {
  const release = (id: string, version: string) => ({ __typename: "Release" as const, id, version });

  it("is the newest version, compared as numbers", () => {
    expect(newestRelease([release("a", "0.9.0"), release("b", "0.10.0"), release("c", "0.2.1")])?.id).toBe("b");
  });

  it("is none without a release", () => {
    expect(newestRelease([])).toBeUndefined();
  });
});
