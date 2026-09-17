// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import {
  ActionKind,
  DemandKind,
  Granularity,
  Ordering,
  PortKind,
} from "../api/graphql";
import {
  actionsBrowseLink,
  buildActionFilter,
  buildActionOrdering,
  deriveAvailability,
  fillBuckets,
  isRunnable,
  pivotTestMatrix,
  structureDemand,
} from "./actionBrowse";

const impl = (
  id: string,
  agentId: string,
  agent: { connected?: boolean; active?: boolean } = {},
) => ({ id, agent: { id: agentId, ...agent } });

describe("deriveAvailability", () => {
  it("reports 'none' for an action nobody implements", () => {
    expect(deriveAvailability([])).toEqual({
      total: 0,
      agents: 0,
      online: 0,
      recent: 0,
      status: "none",
    });
    expect(deriveAvailability(undefined).status).toBe("none");
  });

  it("counts agents, not implementations", () => {
    const availability = deriveAvailability([
      impl("1", "a", { connected: true, active: true }),
      impl("2", "a", { connected: true, active: true }),
      impl("3", "b"),
    ]);
    expect(availability).toMatchObject({ total: 3, agents: 2, online: 1 });
  });

  it("only a CONNECTED agent makes an action runnable", () => {
    const recent = [impl("1", "a", { active: true, connected: false })];
    expect(deriveAvailability(recent)).toMatchObject({
      online: 0,
      recent: 1,
      status: "recent",
    });
    expect(isRunnable({ implementations: recent })).toBe(false);
    expect(
      isRunnable({ implementations: [impl("1", "a", { connected: true })] }),
    ).toBe(true);
  });

  it("is offline when every agent is gone", () => {
    expect(deriveAvailability([impl("1", "a")]).status).toBe("offline");
  });
});

describe("buildActionFilter", () => {
  it("is empty when nothing is set, so 'has filter' checks stay honest", () => {
    expect(
      buildActionFilter({
        search: "  ",
        kind: null,
        stateful: null,
        app: null,
        protocol: null,
        collection: null,
        structure: null,
      }),
    ).toEqual({});
  });

  it("maps every facet onto its ActionFilter field", () => {
    expect(
      buildActionFilter({
        search: " segment ",
        kind: ActionKind.Generator,
        stateful: false,
        app: "napari",
        protocol: "7",
        collection: "segmentation",
      }),
    ).toEqual({
      search: "segment",
      kind: ActionKind.Generator,
      stateful: false,
      appIdentifier: "napari",
      protocols: ["7"],
      inCollection: "segmentation",
    });
  });

  it("keeps stateful=false apart from 'any'", () => {
    expect(buildActionFilter({ stateful: false })).toEqual({ stateful: false });
    expect(buildActionFilter({ stateful: null })).toEqual({});
  });

  it("turns a structure into an ARGS demand by default, RETURNS when producing", () => {
    expect(buildActionFilter({ structure: "@mikro/image" }).demands).toEqual([
      structureDemand("@mikro/image", "consumes"),
    ]);
    expect(structureDemand("@mikro/image", "consumes")).toEqual({
      kind: DemandKind.Args,
      matches: [{ kind: PortKind.Structure, identifier: "@mikro/image" }],
    });
    expect(structureDemand("@mikro/image", "produces").kind).toBe(
      DemandKind.Returns,
    );
  });

  it("does not pin the demand to a port position", () => {
    const [match] = structureDemand("@mikro/image", "consumes").matches ?? [];
    expect(match).not.toHaveProperty("at");
  });
});

describe("buildActionOrdering", () => {
  it("leaves the backend's order alone by default", () => {
    expect(buildActionOrdering(null)).toBeUndefined();
  });
  it("orders by last use or definition, newest first", () => {
    expect(buildActionOrdering("used")).toEqual([{ usedAt: Ordering.Desc }]);
    expect(buildActionOrdering("newest")).toEqual([
      { definedAt: Ordering.Desc },
    ]);
  });
});

describe("actionsBrowseLink", () => {
  it("links into the catalog with the facets preset", () => {
    expect(actionsBrowseLink({ collection: "my stuff" })).toEqual({
      pathname: "/rekuest/actions",
      search: "?collection=my+stuff",
    });
    expect(actionsBrowseLink({}).search).toBe("");
  });
});

describe("pivotTestMatrix", () => {
  const implementation = (id: string) => ({
    id,
    interface: `iface_${id}`,
    agent: { id: `agent_${id}`, name: `Agent ${id}` },
  });
  const result = (id: string, implId: string, passed: boolean, createdAt: string) => ({
    id,
    passed,
    createdAt,
    implementation: implementation(implId),
  });

  it("puts the LATEST result in a cell, whatever order results arrive in", () => {
    const matrix = pivotTestMatrix(
      [
        {
          id: "case",
          name: "runs",
          results: [
            result("new", "i1", false, "2026-09-10T00:00:00Z"),
            result("old", "i1", true, "2026-09-01T00:00:00Z"),
          ],
        },
      ],
      [implementation("i1")],
    );
    expect(matrix.cell("case", "i1")?.id).toBe("new");
  });

  it("leaves a cell empty where a case never ran", () => {
    const matrix = pivotTestMatrix(
      [{ id: "case", name: "runs", results: [] }],
      [implementation("i1")],
    );
    expect(matrix.cols.map((c) => c.id)).toEqual(["i1"]);
    expect(matrix.cell("case", "i1")).toBeUndefined();
  });

  it("keeps a column for an implementation that only survives in results", () => {
    const matrix = pivotTestMatrix(
      [
        {
          id: "case",
          name: "runs",
          results: [result("r", "gone", true, "2026-09-01T00:00:00Z")],
        },
      ],
      [implementation("i1")],
    );
    expect(matrix.cols.map((c) => c.id)).toEqual(["i1", "gone"]);
  });

  it("tolerates missing input", () => {
    const matrix = pivotTestMatrix(undefined, undefined);
    expect(matrix.rows).toEqual([]);
    expect(matrix.cols).toEqual([]);
  });
});

describe("fillBuckets", () => {
  it("returns nothing for an empty series rather than inventing a range", () => {
    expect(fillBuckets([], Granularity.Day)).toEqual([]);
    expect(fillBuckets(undefined, Granularity.Day)).toEqual([]);
  });

  it("fills the quiet days between two buckets with zeros", () => {
    const filled = fillBuckets(
      [
        { ts: "2026-09-04T00:00:00.000Z", count: 2 },
        { ts: "2026-09-01T00:00:00.000Z", count: 5 },
      ],
      Granularity.Day,
    );
    expect(filled.map((b) => [b.ts.slice(0, 10), b.count])).toEqual([
      ["2026-09-01", 5],
      ["2026-09-02", 0],
      ["2026-09-03", 0],
      ["2026-09-04", 2],
    ]);
  });

  it("never duplicates a bucket the server sent, even when it is an hour off (DST)", () => {
    const filled = fillBuckets(
      [
        { ts: "2026-10-24T22:00:00.000Z", count: 1 },
        // 25h later: the local day was 25h long.
        { ts: "2026-10-25T23:00:00.000Z", count: 1 },
      ],
      Granularity.Day,
    );
    expect(filled).toHaveLength(2);
  });

  it("steps months by the calendar", () => {
    const filled = fillBuckets(
      [
        { ts: "2026-01-01T00:00:00.000Z", count: 1 },
        { ts: "2026-04-01T00:00:00.000Z", count: 1 },
      ],
      Granularity.Month,
    );
    expect(filled.map((b) => b.ts.slice(0, 7))).toEqual([
      "2026-01",
      "2026-02",
      "2026-03",
      "2026-04",
    ]);
  });

  it("extends the tail with zeros up to the bucket containing `to`", () => {
    const filled = fillBuckets(
      [{ ts: "2026-09-01T00:00:00.000Z", count: 3 }],
      Granularity.Day,
      new Date("2026-09-03T15:00:00.000Z"),
    );
    expect(filled.map((b) => [b.ts.slice(0, 10), b.count])).toEqual([
      ["2026-09-01", 3],
      ["2026-09-02", 0],
      ["2026-09-03", 0],
    ]);
  });
});
