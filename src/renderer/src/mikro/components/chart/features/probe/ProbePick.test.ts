import { describe, expect, it } from "vitest";
import type { TableHopLike } from "@/mikro/lib/attributes/attributeTypes";
import { hopMetaOf, type RowPlanLike } from "@/mikro/lib/attributes/attributeTypes";
import { isPicked, meshToShow } from "./ProbePick";
import type { RowProbeHop } from "./useRowProbe";

const column = (name: string, extra: Record<string, unknown> = {}) => ({ name, dtype: "INTEGER", ...extra });
const INDEX = { role: "COORDINATE", axisType: "INDEX" };
const meshKey = [
  { produces: ["object"], structure: "@mikro/meshobject", source: { __typename: "MeshCollection", id: "mc1", label: "Cells" } },
];

const table = (index: number, parent: number | null, keyedBy: unknown[] = []): TableHopLike => ({
  index,
  parent,
  cardinality: index === 0 ? "ONE" : "MANY",
  via: parent === null ? undefined : { column: { name: "cluster_id" }, direction: "REVERSE" },
  table: { id: `t${index}`, name: `T${index}`, columns: [column("object", INDEX)], keyedBy: keyedBy as never },
  lookup: { kind: "TABLE", store: { id: "s" } as never, keyColumns: [], attributes: [] },
});

const plan = (...hops: TableHopLike[]): RowPlanLike => ({
  kind: "row",
  table: { id: "t0", name: "T0" },
  key: { axis: "object", column: column("object", INDEX) },
  hops,
});

const probed = (p: RowPlanLike, ids: Record<number, (number | string)[]>): RowProbeHop[] =>
  p.hops.map((hop) => ({ hop, meta: hopMetaOf(p, hop), state: { status: "rows", rows: [], ids: ids[hop.index] ?? [] } }));

describe("the mesh a pinned point shows", () => {
  it("is the row's own, when the table is keyed by a mesh collection", () => {
    const p = plan(table(0, null, meshKey));
    expect(meshToShow(null, probed(p, { 0: [7] }))?.id).toBe("mc1:7");
  });

  it("is none for a cluster until a member is picked, then that member's", () => {
    const p = plan(table(0, null), table(1, 0, meshKey));
    const hops = probed(p, { 0: [4], 1: [7, 8] });
    expect(meshToShow(null, hops)).toBeNull();
    expect(meshToShow({ hop: 1, id: 8 }, hops)?.id).toBe("mc1:8");
  });

  it("is none when the picked rows are not meshes", () => {
    const p = plan(table(0, null), table(1, 0));
    expect(meshToShow({ hop: 1, id: 8 }, probed(p, { 1: [8] }))).toBeNull();
  });

  it("matches a pick by value, whatever the id's type", () => {
    expect(isPicked({ hop: 1, id: 8 }, 1, BigInt(8))).toBe(true);
    expect(isPicked({ hop: 1, id: 8 }, 2, 8)).toBe(false);
    expect(isPicked(null, 1, 8)).toBe(false);
  });
});
